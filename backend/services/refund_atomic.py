"""Short atomic claims for Mongo or the project's PostgreSQL JSON adapter."""
import json


async def insert_once(collection, document):
    from utils.pg_adapter import PGCollection
    if isinstance(collection, PGCollection):
        table = collection.table_name
        if table not in {'refunds', 'transactions'}:
            raise ValueError('Unsupported refund ledger collection')
        async with collection.pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', table + ':' + document['refund_id'])
                row = await connection.fetchrow(f"SELECT data FROM {table} WHERE data->>'refund_id'=$1 LIMIT 1", document['refund_id'])
                if row:
                    return json.loads(row['data']), False
                await connection.execute(f'INSERT INTO {table} (data) VALUES ($1)', json.dumps(collection._prepare_doc(document)))
                return document, True
    existing = await collection.find_one({'refund_id': document['refund_id']})
    if existing:
        return existing, False
    await collection.insert_one(document)
    return document, True


async def reserve_credit_note(db, prefix):
    from utils.pg_adapter import PGCollection
    collection = db.refunds
    if not isinstance(collection, PGCollection):
        return None  # Existing Mongo sequence path; no PostgreSQL tables required.
    key = 'refund_credit_note_sequence:' + prefix
    async with collection.pool.acquire() as connection:
        async with connection.transaction():
            await connection.execute('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', key)
            counter = await connection.fetchrow("SELECT id, data FROM platform_settings WHERE data->>'key'=$1 LIMIT 1", key)
            current = json.loads(counter['data']).get('sequence', 0) if counter else 0
            rows = await connection.fetch("SELECT data->>'credit_note_no' AS number FROM refunds WHERE data->>'credit_note_no' LIKE $1", prefix + '%')
            for row in rows:
                try: current = max(current, int(row['number'].rsplit('/', 1)[-1]))
                except (ValueError, TypeError): pass
            sequence = current + 1
            data = json.dumps({'key': key, 'sequence': sequence})
            if counter:
                await connection.execute('UPDATE platform_settings SET data=$1 WHERE id=$2', data, counter['id'])
            else:
                await connection.execute('INSERT INTO platform_settings (data) VALUES ($1)', data)
            return prefix + str(sequence).zfill(3)


async def claim(collection, query, fields):
    from utils.pg_adapter import PGCollection, PGCursor
    if isinstance(collection, PGCollection):
        # PGCollection.update_one is read-then-write without a row lock. Use a
        # transaction here so concurrent approvals cannot both claim a refund.
        where, params = PGCursor(collection.table_name, query, None, collection.pool)._build_where(query)
        async with collection.pool.acquire() as connection:
            async with connection.transaction():
                row = await connection.fetchrow(f'SELECT id, data FROM {collection.table_name} {where} LIMIT 1 FOR UPDATE', *params)
                if not row:
                    return None
                before = json.loads(row['data'])
                after = {**before, **collection._prepare_doc(fields)}
                await connection.execute(f'UPDATE {collection.table_name} SET data=$1 WHERE id=$2', json.dumps(after), row['id'])
                return before
    return await collection.find_one_and_update(query, {'$set': fields})
