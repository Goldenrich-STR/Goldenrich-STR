import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Union
import asyncpg
import decimal
from datetime import date, datetime
from enum import Enum


logger = logging.getLogger(__name__)

class PGUpdateResult(int):
    def __new__(cls, count, matched_count=None, modified_count=None):
        obj = super(PGUpdateResult, cls).__new__(cls, count)
        obj.matched_count = matched_count if matched_count is not None else count
        obj.modified_count = modified_count if modified_count is not None else count
        return obj

class PGCursor:
    def __init__(self, table_name, query, projection, pool, sort=None, skip=0, limit=None):
        self.table_name = table_name
        self.query = query
        self.projection = projection
        self.pool = pool
        self.sort_spec = sort
        self.skip_val = skip
        self.limit_val = limit
        self._data = None
        self._index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._data is None:
            self._data = await self.to_list(length=None)
            self._index = 0
        
        if self._index < len(self._data):
            val = self._data[self._index]
            self._index += 1
            return val
        else:
            raise StopAsyncIteration

    def sort(self, *args):
        if len(args) == 1:
            self.sort_spec = args[0]
        elif len(args) == 2:
            self.sort_spec = [(args[0], args[1])]
        return self

    def skip(self, skip_val):
        self.skip_val = skip_val
        return self

    def limit(self, limit_val):
        self.limit_val = limit_val
        return self

    async def to_list(self, length=None):
        where_clause, params = self._build_where(self.query)
        order_clause = self._build_order(self.sort_spec)
        
        limit_clause = ""
        if length is not None:
            limit_clause = f" LIMIT {length}"
        elif self.limit_val is not None:
            limit_clause = f" LIMIT {self.limit_val}"
            
        offset_clause = f" OFFSET {self.skip_val}" if self.skip_val > 0 else ""
        
        sql = f"SELECT data FROM {self.table_name} {where_clause} {order_clause} {limit_clause} {offset_clause}"
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
            results = [json.loads(row['data']) for row in rows]
            
            # Simple projection (if fields are specified as 1 or 0)
            if self.projection:
                filtered_results = []
                for res in results:
                    new_res = {}
                    # If projection is {"field": 1}, only include those
                    # If projection is {"field": 0}, exclude those
                    mode = 1 if any(v == 1 for v in self.projection.values()) else 0
                    if mode == 1:
                        for k, v in self.projection.items():
                            if v == 1 and k in res:
                                new_res[k] = res[k]
                    else:
                        new_res = res.copy()
                        for k, v in self.projection.items():
                            if v == 0 and k in new_res:
                                del new_res[k]
                    filtered_results.append(new_res)
                return filtered_results
            
            return results

    def _build_where(self, query, start_param_idx=1):
        if not query:
            return "", []
        
        clauses = []
        params = []
        param_idx = start_param_idx
        
        def process_field(key, value, p_idx):
            # Handle nested fields: "a.b.c" -> data#>>'{a,b,c}'
            if "." in key:
                parts = key.split(".")
                path = "{" + ",".join(parts) + "}"
                field_expr = f"data#>>'{path}'"
            else:
                field_expr = f"data->>'{key}'"

            c = []
            p = []
            
            if isinstance(value, dict):
                for op, val in value.items():
                    if op == "$regex":
                        options = value.get("$options", "")
                        regex_op = "~*" if "i" in options else "~"
                        c.append(f"{field_expr} {regex_op} ${p_idx}")
                        p.append(val)
                        p_idx += 1
                    elif op == "$options":
                        continue
                    elif op == "$gte":
                        c.append(f"({field_expr})::text >= ${p_idx}::text")
                        p.append(val.isoformat() if hasattr(val, 'isoformat') else str(val))
                        p_idx += 1
                    elif op == "$lte":
                        c.append(f"({field_expr})::text <= ${p_idx}::text")
                        p.append(val.isoformat() if hasattr(val, 'isoformat') else str(val))
                        p_idx += 1
                    elif op == "$gt":
                        c.append(f"({field_expr})::text > ${p_idx}::text")
                        p.append(val.isoformat() if hasattr(val, 'isoformat') else str(val))
                        p_idx += 1
                    elif op == "$lt":
                        c.append(f"({field_expr})::text < ${p_idx}::text")
                        p.append(val.isoformat() if hasattr(val, 'isoformat') else str(val))
                        p_idx += 1
                    elif op == "$in":
                        c.append(f"{field_expr} = ANY(${p_idx})")
                        p.append([str(v).lower() if isinstance(v, bool) else str(v) for v in val])
                        p_idx += 1
                    elif op == "$nin":
                        c.append(f"NOT ({field_expr} = ANY(${p_idx}))")
                        p.append([str(v).lower() if isinstance(v, bool) else str(v) for v in val])
                        p_idx += 1
                    elif op == "$all":
                        # For arrays, we use JSONB containment operator
                        # This requires referencing the field as jsonb
                        jsonb_expr = f"data->'{key}'" if "." not in key else f"data#>'{path}'"
                        c.append(f"{jsonb_expr} @> ${p_idx}::jsonb")
                        p.append(json.dumps(val))
                        p_idx += 1
                    elif op == "$ne":
                        if val is None:
                            c.append(f"{field_expr} IS NOT NULL")
                        else:
                            c.append(f"({field_expr} IS NULL OR {field_expr} != ${p_idx})")
                            p.append(str(val).lower() if isinstance(val, bool) else str(val))
                            p_idx += 1
                    elif op == "$exists":
                        if val:
                            c.append(f"{field_expr} IS NOT NULL")
                        else:
                            c.append(f"{field_expr} IS NULL")
            elif value is None:
                c.append(f"{field_expr} IS NULL")
            else:
                c.append(f"{field_expr} = ${p_idx}")
                # For JSONB ->> operator, booleans are returned as 'true'/'false' (lowercase)
                if isinstance(value, bool):
                    p.append(str(value).lower())
                elif hasattr(value, 'isoformat'):
                    p.append(value.isoformat())
                else:
                    p.append(str(value))
                p_idx += 1
            
            return " AND ".join(c), p, p_idx

        for key, value in query.items():
            if key == "$or":
                or_clauses = []
                for or_query in value:
                    sub_where, sub_params = self._build_where(or_query, param_idx)
                    if sub_where:
                        # strip WHERE
                        or_clauses.append(f"({sub_where[6:]})")
                        params.extend(sub_params)
                        param_idx += len(sub_params)
                if or_clauses:
                    clauses.append(f"({' OR '.join(or_clauses)})")
            elif key == "$and":
                and_clauses = []
                for and_query in value:
                    sub_where, sub_params = self._build_where(and_query, param_idx)
                    if sub_where:
                        and_clauses.append(f"({sub_where[6:]})")
                        params.extend(sub_params)
                        param_idx += len(sub_params)
                if and_clauses:
                    clauses.append(f"({' AND '.join(and_clauses)})")
            else:
                c, p, param_idx = process_field(key, value, param_idx)
                if c:
                    clauses.append(c)
                    params.extend(p)
                    
        if not clauses:
            return "", []
            
        return "WHERE " + " AND ".join(clauses), params

    def _build_order(self, sort_spec):
        if not sort_spec:
            return ""
        
        parts = []
        # Sort spec can be [("field", 1), ...] or {"field": 1}
        items = sort_spec.items() if isinstance(sort_spec, dict) else sort_spec
        for field, direction in items:
            dir_str = "ASC" if direction == 1 else "DESC"
            parts.append(f"data->>'{field}' {dir_str} NULLS LAST")
            
        return "ORDER BY " + ", ".join(parts)

class PGAggregateCursor:
    def __init__(self, table_name, pipeline, pool):
        self.table_name = table_name
        self.pipeline = pipeline
        self.pool = pool
        self._data = None
        self._index = 0

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

    async def to_list(self, length=None):
        sql, params = self._translate_pipeline()
        
        if length is not None and "LIMIT" not in sql.upper():
            sql += f" LIMIT {length}"

        async with self.pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
            results = []
            for row in rows:
                d = dict(row)
                for k, v in d.items():
                    if isinstance(v, decimal.Decimal):
                        # Convert Decimal to float or int for JSON serialization
                        if v % 1 == 0:
                            d[k] = int(v)
                        else:
                            d[k] = float(v)
                results.append(d)
            return results

    def _translate_pipeline(self):
        where_clause = ""
        group_clause = ""
        select_clause = "*"
        order_clause = ""
        limit_clause = ""
        params = []
        param_idx = 1

        for stage in self.pipeline:
            if "$match" in stage:
                w, p = PGCursor(self.table_name, stage["$match"], None, self.pool)._build_where(stage["$match"], param_idx)
                if w:
                    if where_clause:
                        where_clause += " AND " + w[6:]
                    else:
                        where_clause = w
                    params.extend(p)
                    param_idx += len(p)
            elif "$group" in stage:
                group_data = stage["$group"]
                group_id = group_data.get("_id")
                
                select_parts = []
                if group_id is None:
                    group_clause = ""
                elif isinstance(group_id, str) and group_id.startswith("$"):
                    field = group_id[1:]
                    select_parts.append(f"data->>'{field}' as _id")
                    group_clause = f"GROUP BY data->>'{field}'"
                else:
                    select_parts.append(f"'{group_id}' as _id")
                
                for key, val in group_data.items():
                    if key == "_id": continue
                    if isinstance(val, dict):
                        for op, op_val in val.items():
                            if op == "$sum":
                                if isinstance(op_val, (int, float)):
                                    select_parts.append(f"COALESCE(SUM({op_val}), 0) as {key}")
                                elif isinstance(op_val, str) and op_val.startswith("$"):
                                    f = op_val[1:]
                                    select_parts.append(f"COALESCE(SUM((data->>'{f}')::numeric), 0) as {key}")
                            elif op == "$avg":
                                if isinstance(op_val, str) and op_val.startswith("$"):
                                    f = op_val[1:]
                                    select_parts.append(f"COALESCE(AVG((data->>'{f}')::numeric), 0) as {key}")
                            elif op == "$count":
                                select_parts.append(f"COUNT(*) as {key}")
                            elif op == "$min":
                                if isinstance(op_val, str) and op_val.startswith("$"):
                                    f = op_val[1:]
                                    select_parts.append(f"COALESCE(MIN((data->>'{f}')::numeric), 0) as {key}")
                            elif op == "$max":
                                if isinstance(op_val, str) and op_val.startswith("$"):
                                    f = op_val[1:]
                                    select_parts.append(f"COALESCE(MAX((data->>'{f}')::numeric), 0) as {key}")
                
                if not select_parts:
                    select_parts = ["*"]
                select_clause = ", ".join(select_parts)
            elif "$sort" in stage:
                parts = []
                for field, direction in stage["$sort"].items():
                    dir_str = "ASC" if direction == 1 else "DESC"
                    parts.append(f"{field} {dir_str}")
                order_clause = "ORDER BY " + ", ".join(parts)
            elif "$limit" in stage:
                limit_clause = f"LIMIT {stage['$limit']}"

        sql = f"SELECT {select_clause} FROM {self.table_name} {where_clause} {group_clause} {order_clause} {limit_clause}"
        return sql, params

class PGCollection:
    def __init__(self, table_name, pool):
        self.table_name = table_name
        self.pool = pool

    async def insert_one(self, document, **kwargs):
        doc_copy = self._prepare_doc(document)
        async with self.pool.acquire() as conn:
            await conn.execute(f"INSERT INTO {self.table_name} (data) VALUES ($1)", json.dumps(doc_copy))
        return True

    async def insert_many(self, documents, **kwargs):
        prepared = [(json.dumps(self._prepare_doc(doc)),) for doc in documents]
        async with self.pool.acquire() as conn:
            await conn.executemany(f"INSERT INTO {self.table_name} (data) VALUES ($1)", prepared)
        return True

    async def find_one(self, query, projection=None, **kwargs):
        cursor = PGCursor(self.table_name, query, projection, self.pool, limit=1)
        results = await cursor.to_list(1)
        return results[0] if results else None

    def find(self, query=None, projection=None, **kwargs):
        return PGCursor(self.table_name, query or {}, projection, self.pool)

    def aggregate(self, pipeline, **kwargs):
        return PGAggregateCursor(self.table_name, pipeline, self.pool)

    async def update_one(self, query, update, upsert=False, **kwargs):
        where_clause, params = PGCursor(self.table_name, query, None, self.pool)._build_where(query)
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(f"SELECT id, data FROM {self.table_name} {where_clause} LIMIT 1", *params)
            if row:
                data = json.loads(row['data'])
                if "$set" in update:
                    data.update(self._prepare_doc(update["$set"]))
                if "$unset" in update:
                    for k in update["$unset"]:
                        if k in data:
                            del data[k]
                
                await conn.execute(f"UPDATE {self.table_name} SET data = $1 WHERE id = $2", json.dumps(data), row['id'])
                return PGUpdateResult(1, matched_count=1, modified_count=1)
            elif upsert:
                new_doc = {}
                for k, v in query.items():
                    if not k.startswith("$") and not isinstance(v, dict):
                        new_doc[k] = v
                if "$set" in update:
                    new_doc.update(self._prepare_doc(update["$set"]))
                if "$setOnInsert" in update:
                    new_doc.update(self._prepare_doc(update["$setOnInsert"]))
                await self.insert_one(new_doc)
                return PGUpdateResult(1, matched_count=0, modified_count=1)
        return PGUpdateResult(0, matched_count=0, modified_count=0)

    async def update_many(self, query, update, upsert=False, **kwargs):
        where_clause, params = PGCursor(self.table_name, query, None, self.pool)._build_where(query)
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(f"SELECT id, data FROM {self.table_name} {where_clause}", *params)
            if rows:
                for row in rows:
                    data = json.loads(row['data'])
                    if "$set" in update:
                        data.update(self._prepare_doc(update["$set"]))
                    if "$unset" in update:
                        for k in update["$unset"]:
                            if k in data:
                                del data[k]
                    await conn.execute(f"UPDATE {self.table_name} SET data = $1 WHERE id = $2", json.dumps(data), row['id'])
                return PGUpdateResult(len(rows), matched_count=len(rows), modified_count=len(rows))
            elif upsert:
                new_doc = {}
                for k, v in query.items():
                    if not k.startswith("$") and not isinstance(v, dict):
                        new_doc[k] = v
                if "$set" in update:
                    new_doc.update(self._prepare_doc(update["$set"]))
                if "$setOnInsert" in update:
                    new_doc.update(self._prepare_doc(update["$setOnInsert"]))
                await self.insert_one(new_doc)
                return PGUpdateResult(1, matched_count=0, modified_count=1)
            return PGUpdateResult(0, matched_count=0, modified_count=0)

    async def find_one_and_update(self, query, update, projection=None, upsert=False, **kwargs):
        where_clause, params = PGCursor(self.table_name, query, projection, self.pool)._build_where(query)
        async with self.pool.acquire() as conn:
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
                    data.update(self._prepare_doc(update["$set"]))
                if "$unset" in update:
                    for k in update["$unset"]:
                        if k in data:
                            del data[k]
                await conn.execute(f"UPDATE {self.table_name} SET data = $1 WHERE id = $2", json.dumps(data), row['id'])
                return return_doc
            elif upsert:
                new_doc = {}
                for k, v in query.items():
                    if not k.startswith("$") and not isinstance(v, dict):
                        new_doc[k] = v
                if "$set" in update:
                    new_doc.update(self._prepare_doc(update["$set"]))
                if "$setOnInsert" in update:
                    new_doc.update(self._prepare_doc(update["$setOnInsert"]))
                await self.insert_one(new_doc)
                return new_doc
        return None

    async def delete_one(self, query, **kwargs):
        where_clause, params = PGCursor(self.table_name, query, None, self.pool)._build_where(query)
        # Use a subquery to delete only one
        sql = f"DELETE FROM {self.table_name} WHERE id = (SELECT id FROM {self.table_name} {where_clause} LIMIT 1)"
        async with self.pool.acquire() as conn:
            res = await conn.execute(sql, *params)
            return True

    async def delete_many(self, query, **kwargs):
        where_clause, params = PGCursor(self.table_name, query, None, self.pool)._build_where(query)
        async with self.pool.acquire() as conn:
            res = await conn.execute(f"DELETE FROM {self.table_name} {where_clause}", *params)
            return True

    async def count_documents(self, query, **kwargs):
        where_clause, params = PGCursor(self.table_name, query, None, self.pool)._build_where(query)
        async with self.pool.acquire() as conn:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {self.table_name} {where_clause}", *params)
            return count

    async def distinct(self, field, query=None, **kwargs):
        where_clause, params = PGCursor(self.table_name, query or {}, None, self.pool)._build_where(query or {})
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(f"SELECT DISTINCT data->>'{field}' as val FROM {self.table_name} {where_clause}", *params)
            return [row['val'] for row in rows if row['val'] is not None]

    async def create_index(self, keys, **kwargs):
        logger.info(f"PGAdapter: Mocked index creation for {self.table_name}: {keys}")
        return True

    def _prepare_doc(self, doc):
        if isinstance(doc, (datetime, date)):
            return doc.isoformat()
        if isinstance(doc, Enum):
            return doc.value
        if isinstance(doc, decimal.Decimal):
            return float(doc)
        if isinstance(doc, dict):
            return {key: self._prepare_doc(value) for key, value in doc.items()}
        if isinstance(doc, (list, tuple)):
            return [self._prepare_doc(value) for value in doc]
        return doc

class PGAdapter:
    def __init__(self, dsn):
        self.dsn = dsn
        self.pool = None
        self._collections = {}

    async def connect(self):
        self.pool = await asyncpg.create_pool(self.dsn)

    def __getattr__(self, name):
        if name not in self._collections:
            self._collections[name] = PGCollection(name, self.pool)
        return self._collections[name]

    def __getitem__(self, name):
        return self.__getattr__(name)

    async def ensure_table(self, table_name):
        async with self.pool.acquire() as conn:
            try:
                await conn.execute(f"CREATE TABLE IF NOT EXISTS {table_name} (id SERIAL PRIMARY KEY, data JSONB)")
            except (asyncpg.DuplicateTableError, asyncpg.DuplicateObjectError, asyncpg.UniqueViolationError):
                logger.info("PGAdapter: table %s was created concurrently", table_name)

            try:
                await conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_data ON {table_name} USING GIN (data)")
            except (asyncpg.DuplicateTableError, asyncpg.DuplicateObjectError, asyncpg.UniqueViolationError):
                logger.info("PGAdapter: index for %s was created concurrently", table_name)

    async def close(self):
        if self.pool:
            await self.pool.close()
