import pytest
import os
import sys
import json
import asyncio
import asyncpg
from pathlib import Path
from dotenv import load_dotenv
from types import ModuleType

# Explicitly load environment variables from backend/.env
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

import logging
import io
import builtins

class InMemoryLogHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.stream = io.StringIO()
    def emit(self, record):
        try:
            msg = self.format(record)
            self.stream.write(msg + "\n")
        except Exception:
            pass

try:
    logging.basicConfig(level=logging.INFO)
    _in_memory_log_handler = InMemoryLogHandler()
    _in_memory_log_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logging.getLogger().addHandler(_in_memory_log_handler)
    builtins._get_in_memory_logs = lambda: _in_memory_log_handler.stream.getvalue()
except Exception:
    pass

# Mock pymongo if DATABASE_TYPE is postgres
if os.environ.get("DATABASE_TYPE") == "postgres":
    class MockCollection:
        def __init__(self, table_name, pool):
            self.table_name = table_name
            self.pool = pool

        def _run(self, coro):
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            if loop.is_running():
                import threading
                from queue import Queue
                q = Queue()
                def run_in_thread():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        res = new_loop.run_until_complete(coro)
                        q.put((True, res))
                    except Exception as e:
                        q.put((False, e))
                    finally:
                        new_loop.close()
                t = threading.Thread(target=run_in_thread)
                t.start()
                t.join()
                success, val = q.get()
                if success:
                    return val
                raise val
            else:
                return loop.run_until_complete(coro)

        def insert_one(self, doc):
            async def _insert():
                # Enforce unique indexes for payouts manually in the test mock
                if self.table_name == "payouts":
                    if "payout_id" in doc:
                        existing = await self._find_one({"payout_id": doc["payout_id"]})
                        if existing:
                            raise sys.modules["pymongo.errors"].DuplicateKeyError(f"Duplicate payout_id: {doc['payout_id']}")
                    if "booking_id" in doc:
                        existing = await self._find_one({"booking_id": doc["booking_id"]})
                        if existing:
                            raise sys.modules["pymongo.errors"].DuplicateKeyError(f"Duplicate booking_id: {doc['booking_id']}")

                def json_serializer(obj):
                    if hasattr(obj, 'isoformat'):
                        return obj.isoformat()
                    raise TypeError(f"Type {type(obj)} not serializable")
                
                import copy
                doc_copy = copy.deepcopy(doc)
                for k, v in doc_copy.items():
                    if hasattr(v, 'isoformat'):
                        doc_copy[k] = v.isoformat()
                
                try:
                    async with self.pool.acquire() as conn:
                        await conn.execute(
                            f"INSERT INTO {self.table_name} (data) VALUES ($1)",
                            json.dumps(doc_copy, default=json_serializer)
                        )
                except asyncpg.exceptions.UniqueViolationError as e:
                    # Raise the mocked DuplicateKeyError
                    raise sys.modules["pymongo.errors"].DuplicateKeyError(str(e))
                return True
            return self._run(_insert())

        def find(self, query):
            async def _find():
                from utils.pg_adapter import PGCursor
                cursor = PGCursor(self.table_name, query, None, self.pool)
                where_clause, params = cursor._build_where(query)
                async with self.pool.acquire() as conn:
                    rows = await conn.fetch(f"SELECT data FROM {self.table_name} {where_clause}", *params)
                    return [json.loads(row['data']) for row in rows]
            return self._run(_find())

        def find_one(self, query):
            return self._run(self._find_one(query))

        async def _find_one(self, query):
            from utils.pg_adapter import PGCursor
            cursor = PGCursor(self.table_name, query, None, self.pool)
            where_clause, params = cursor._build_where(query)
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(f"SELECT data FROM {self.table_name} {where_clause} LIMIT 1", *params)
                if row:
                    return json.loads(row['data'])
            return None

        def update_one(self, query, update):
            async def _update():
                from utils.pg_adapter import PGCursor
                cursor = PGCursor(self.table_name, query, None, self.pool)
                where_clause, params = cursor._build_where(query)
                async with self.pool.acquire() as conn:
                    row = await conn.fetchrow(f"SELECT id, data FROM {self.table_name} {where_clause} LIMIT 1", *params)
                    if row:
                        data = json.loads(row['data'])
                        if "$set" in update:
                            data.update(update["$set"])
                        if "$unset" in update:
                            for k in update["$unset"]:
                                data.pop(k, None)
                        await conn.execute(f"UPDATE {self.table_name} SET data = $1 WHERE id = $2", json.dumps(data), row['id'])
                        return True
                return False
            return self._run(_update())

        def update_many(self, query, update):
            async def _update():
                from utils.pg_adapter import PGCursor
                cursor = PGCursor(self.table_name, query, None, self.pool)
                where_clause, params = cursor._build_where(query)
                async with self.pool.acquire() as conn:
                    rows = await conn.fetch(f"SELECT id, data FROM {self.table_name} {where_clause}", *params)
                    for row in rows:
                        data = json.loads(row['data'])
                        if "$set" in update:
                            data.update(update["$set"])
                        if "$unset" in update:
                            for k in update["$unset"]:
                                data.pop(k, None)
                        await conn.execute(f"UPDATE {self.table_name} SET data = $1 WHERE id = $2", json.dumps(data), row['id'])
                    return len(rows)
            return self._run(_update())

        def delete_one(self, query):
            async def _delete():
                from utils.pg_adapter import PGCursor
                cursor = PGCursor(self.table_name, query, None, self.pool)
                where_clause, params = cursor._build_where(query)
                sql = f"DELETE FROM {self.table_name} WHERE id = (SELECT id FROM {self.table_name} {where_clause} LIMIT 1)"
                async with self.pool.acquire() as conn:
                    await conn.execute(sql, *params)
                    return True
            return self._run(_delete())

        def delete_many(self, query):
            async def _delete():
                from utils.pg_adapter import PGCursor
                cursor = PGCursor(self.table_name, query, None, self.pool)
                where_clause, params = cursor._build_where(query)
                async with self.pool.acquire() as conn:
                    await conn.execute(f"DELETE FROM {self.table_name} {where_clause}", *params)
                    return True
            return self._run(_delete())

        def count_documents(self, query):
            async def _count():
                from utils.pg_adapter import PGCursor
                cursor = PGCursor(self.table_name, query, None, self.pool)
                where_clause, params = cursor._build_where(query)
                async with self.pool.acquire() as conn:
                    count = await conn.fetchval(f"SELECT COUNT(*) FROM {self.table_name} {where_clause}", *params)
                    return count
            return self._run(_count())

    class MockDatabase:
        def __init__(self, pool):
            self.pool = pool
            self._collections = {}

        def __getattr__(self, name):
            if name not in self._collections:
                self._collections[name] = MockCollection(name, self.pool)
            return self._collections[name]

        def __getitem__(self, name):
            return self.__getattr__(name)

    class MockMongoClient:
        def __init__(self, uri=None, **kwargs):
            self.postgres_url = os.environ.get('POSTGRES_URL')
            
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            if loop.is_running():
                import threading
                from queue import Queue
                q = Queue()
                def run_in_thread():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        pool = new_loop.run_until_complete(asyncpg.create_pool(self.postgres_url))
                        q.put((True, pool))
                    except Exception as e:
                        q.put((False, e))
                t = threading.Thread(target=run_in_thread)
                t.start()
                t.join()
                success, val = q.get()
                if success:
                    self.pool = val
                else:
                    raise val
            else:
                self.pool = loop.run_until_complete(asyncpg.create_pool(self.postgres_url))

        def __getitem__(self, name):
            return MockDatabase(self.pool)

        def close(self):
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            if loop.is_running():
                import threading
                def run_in_thread():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        new_loop.run_until_complete(self.pool.close())
                    finally:
                        new_loop.close()
                t = threading.Thread(target=run_in_thread)
                t.start()
                t.join()
            else:
                loop.run_until_complete(self.pool.close())

    # Override MongoClient and errors in the real pymongo library
    import pymongo
    import pymongo.errors
    pymongo.MongoClient = MockMongoClient
    
    class MockDuplicateKeyError(Exception):
        pass
    pymongo.errors.DuplicateKeyError = MockDuplicateKeyError

    # Override AsyncIOMotorClient in the motor.motor_asyncio library
    class MockMotorCollection:
        def __init__(self, table_name, client):
            self.table_name = table_name
            self.client = client

        async def insert_one(self, doc):
            await self.client._ensure_pool()
            if self.table_name == "payouts":
                if "payout_id" in doc:
                    existing = await self.find_one({"payout_id": doc["payout_id"]})
                    if existing:
                        raise sys.modules["pymongo.errors"].DuplicateKeyError(f"Duplicate payout_id: {doc['payout_id']}")
                if "booking_id" in doc:
                    existing = await self.find_one({"booking_id": doc["booking_id"]})
                    if existing:
                        raise sys.modules["pymongo.errors"].DuplicateKeyError(f"Duplicate booking_id: {doc['booking_id']}")

            def json_serializer(obj):
                if hasattr(obj, 'isoformat'):
                    return obj.isoformat()
                raise TypeError(f"Type {type(obj)} not serializable")
            
            import copy
            doc_copy = copy.deepcopy(doc)
            for k, v in doc_copy.items():
                if hasattr(v, 'isoformat'):
                    doc_copy[k] = v.isoformat()
            
            try:
                async with self.client.pool.acquire() as conn:
                    await conn.execute(
                        f"INSERT INTO {self.table_name} (data) VALUES ($1)",
                        json.dumps(doc_copy, default=json_serializer)
                    )
            except asyncpg.exceptions.UniqueViolationError as e:
                raise sys.modules["pymongo.errors"].DuplicateKeyError(str(e))
            return True

        def _postprocess_doc(self, doc):
            from datetime import datetime, date
            if not isinstance(doc, dict):
                return doc
            new_doc = {}
            for k, v in doc.items():
                if isinstance(v, str):
                    if k in ("soft_lock_expires_at", "created_at", "updated_at"):
                        try:
                            cleaned = v.replace("Z", "+00:00")
                            new_doc[k] = datetime.fromisoformat(cleaned).replace(tzinfo=None)
                        except ValueError:
                            new_doc[k] = v
                    elif k in ("check_in_date", "check_out_date"):
                        try:
                            new_doc[k] = date.fromisoformat(v)
                        except ValueError:
                            new_doc[k] = v
                    else:
                        new_doc[k] = v
                elif isinstance(v, dict):
                    new_doc[k] = self._postprocess_doc(v)
                elif isinstance(v, list):
                    new_doc[k] = [self._postprocess_doc(i) if isinstance(i, dict) else i for i in v]
                else:
                    new_doc[k] = v
            return new_doc

        def find(self, query=None, projection=None):
            from utils.pg_adapter import PGCursor
            class MotorCursor(PGCursor):
                def __init__(self, coll, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    self.coll = coll
                async def to_list(self, length=None):
                    res = await super().to_list(length)
                    return [self.coll._postprocess_doc(d) for d in res]
                def __aiter__(self):
                    return self
                async def __anext__(self):
                    if self._data is None:
                        self._data = await self.to_list()
                        self._index = 0
                    if self._index < len(self._data):
                        val = self._data[self._index]
                        self._index += 1
                        return val
                    else:
                        raise StopAsyncIteration
            proxy = PoolProxy(self.client)
            return MotorCursor(self, self.table_name, query or {}, projection, proxy)

        async def find_one(self, query, projection=None):
            await self.client._ensure_pool()
            from utils.pg_adapter import PGCursor
            cursor = PGCursor(self.table_name, query, projection, self.client.pool, limit=1)
            results = await cursor.to_list(1)
            if results:
                return self._postprocess_doc(results[0])
            return None

        async def find_one_and_update(self, query, update, projection=None):
            await self.client._ensure_pool()
            from utils.pg_adapter import PGCursor
            cursor = PGCursor(self.table_name, query, projection, self.client.pool)
            where_clause, params = cursor._build_where(query)
            async with self.client.pool.acquire() as conn:
                row = await conn.fetchrow(f"SELECT id, data FROM {self.table_name} {where_clause} LIMIT 1", *params)
                if row:
                    data = json.loads(row['data'])
                    return_doc = data.copy()
                    if projection:
                        mode = 1 if any(v == 1 for v in projection.values()) else 0
                        if mode == 1:
                            filtered = {}
                            for k, v in projection.items():
                                if v == 1 and k in return_doc:
                                    filtered[k] = return_doc[k]
                            return_doc = filtered
                        else:
                            for k, v in projection.items():
                                if v == 0 and k in return_doc:
                                    del return_doc[k]
                    
                    if "$set" in update:
                        def serialize_val(val):
                            from datetime import datetime, date
                            if isinstance(val, (datetime, date)):
                                return val.isoformat()
                            if isinstance(val, dict):
                                return {k: serialize_val(v) for k, v in val.items()}
                            if isinstance(val, list):
                                return [serialize_val(x) for x in val]
                            return val
                        
                        set_data = {k: serialize_val(v) for k, v in update["$set"].items()}
                        data.update(set_data)
                    if "$unset" in update:
                        for k in update["$unset"]:
                            if k in data:
                                del data[k]
                    await conn.execute(f"UPDATE {self.table_name} SET data = $1 WHERE id = $2", json.dumps(data), row['id'])
                    return self._postprocess_doc(return_doc)
            return None

        async def update_one(self, query, update):
            await self.client._ensure_pool()
            from utils.pg_adapter import PGCursor
            cursor = PGCursor(self.table_name, query, None, self.client.pool)
            where_clause, params = cursor._build_where(query)
            async with self.client.pool.acquire() as conn:
                row = await conn.fetchrow(f"SELECT id, data FROM {self.table_name} {where_clause} LIMIT 1", *params)
                if row:
                    data = json.loads(row['data'])
                    if "$set" in update:
                        def serialize_val(val):
                            from datetime import datetime, date
                            if isinstance(val, (datetime, date)):
                                return val.isoformat()
                            if isinstance(val, dict):
                                return {k: serialize_val(v) for k, v in val.items()}
                            if isinstance(val, list):
                                return [serialize_val(x) for x in val]
                            return val
                        set_data = {k: serialize_val(v) for k, v in update["$set"].items()}
                        data.update(set_data)
                    if "$unset" in update:
                        for k in update["$unset"]:
                            data.pop(k, None)
                    await conn.execute(f"UPDATE {self.table_name} SET data = $1 WHERE id = $2", json.dumps(data), row['id'])
                    return True
            return False

        async def count_documents(self, query):
            await self.client._ensure_pool()
            from utils.pg_adapter import PGCursor
            cursor = PGCursor(self.table_name, query, None, self.client.pool)
            where_clause, params = cursor._build_where(query)
            async with self.client.pool.acquire() as conn:
                count = await conn.fetchval(f"SELECT COUNT(*) FROM {self.table_name} {where_clause}", *params)
                return count

        async def delete_many(self, query):
            await self.client._ensure_pool()
            from utils.pg_adapter import PGCursor
            cursor = PGCursor(self.table_name, query, None, self.client.pool)
            where_clause, params = cursor._build_where(query)
            async with self.client.pool.acquire() as conn:
                await conn.execute(f"DELETE FROM {self.table_name} {where_clause}", *params)
                return True

    class PoolProxy:
        def __init__(self, client):
            self.client = client
        def acquire(self):
            return self.client.pool.acquire()

    class MockMotorDatabase:
        def __init__(self, client):
            self.client = client
            self._collections = {}

        def __getattr__(self, name):
            if name not in self._collections:
                self._collections[name] = MockMotorCollection(name, self.client)
            return self._collections[name]

        def __getitem__(self, name):
            return self.__getattr__(name)

    class MockMotorClient:
        def __init__(self, uri=None, **kwargs):
            self.pool = None
            self.postgres_url = os.environ.get('POSTGRES_URL')

        async def _ensure_pool(self):
            if self.pool is None:
                self.pool = await asyncpg.create_pool(self.postgres_url)

        def __getitem__(self, name):
            return MockMotorDatabase(self)

        def close(self):
            if self.pool:
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(self.pool.close())
                except RuntimeError:
                    pass

    try:
        import motor
        import motor.motor_asyncio
        motor.motor_asyncio.AsyncIOMotorClient = MockMotorClient
    except ImportError:
        pass

# Enable asyncio mode for tests in this directory only.
def pytest_collection_modifyitems(config, items):
    for item in items:
        if "asyncio" in item.keywords:
            continue
        # don't auto-mark; tests opt-in via @pytest.mark.asyncio
        pass
