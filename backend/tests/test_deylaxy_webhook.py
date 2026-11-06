"""Offline contract and transaction tests. No real DB, Redis, or provider calls."""
import asyncio
import copy
import hashlib
import hmac
import json
import time
from contextlib import asynccontextmanager

import httpx
import pytest
from fastapi import FastAPI, HTTPException

from routes.deylaxy_routes import get_db, router
from services import deylaxy_service as service


@pytest.fixture(autouse=True)
def configuration(monkeypatch):
    monkeypatch.setenv('DEYLAXY_BLOG_ENABLED', 'true')
    monkeypatch.setenv('DEYLAXY_BLOG_SECRET', 'test-secret-for-offline-tests-only')
    monkeypatch.setenv('DEYLAXY_SITE_URL', 'https://www.x-space360.in')


def body(event='post.create', **fields):
    return json.dumps({'event': event, 'post': {'title': 'A guide', 'slug': 'a-guide',
        'markdown': '## Hello\nA useful article.', **fields}}).encode()


def headers(raw, timestamp=None):
    ts = str(int(time.time()) if timestamp is None else timestamp)
    return {'x-deylaxy-timestamp': ts, 'x-deylaxy-signature': 'sha256=' +
            hmac.new(b'test-secret-for-offline-tests-only', ts.encode() + b'.' + raw, hashlib.sha256).hexdigest()}


def document():
    return {'content_id': 'existing-blog', 'page': 'landing', 'section': 'blog',
        'is_active': True, 'updated_at': '2026-01-01T00:00:00+00:00',
        'content_data': {'page_title': 'Existing Journal', 'posts': [
            {'id': 'team-1', 'title': 'Original article', 'slug': 'a-guide', 'content': 'Keep me', 'is_active': True}]}}


def apply(doc, raw, extra_headers=None):
    return service.apply_message(doc, service.decode_message(raw), extra_headers or {}, raw)


def test_create_preserves_existing_posts_and_settings_and_handles_slug_collision():
    original = document()
    updated, status, reply = apply(original, body())
    assert status == 201 and reply['url'].endswith('/blog/a-guide-2')
    assert updated['content_data']['posts'][0] == original['content_data']['posts'][0]
    assert updated['content_data']['page_title'] == 'Existing Journal'
    assert len(original['content_data']['posts']) == 1


def test_retry_survives_reload_and_reuses_response_without_new_post():
    updated, code, reply = apply(document(), body())
    loaded = json.loads(json.dumps(updated))
    retry, retry_code, retry_reply = apply(loaded, body())
    assert retry == loaded and retry_code == code and retry_reply == reply
    assert len(retry['content_data']['posts']) == 2


def test_event_id_cannot_be_reused_for_different_content():
    updated, _, _ = apply(document(), body(), {'x-deylaxy-event-id': 'delivery-1'})
    with pytest.raises(HTTPException) as exc:
        apply(updated, body(title='Other'), {'x-deylaxy-event-id': 'delivery-1'})
    assert exc.value.status_code == 409


def test_update_revision_and_revert_keep_ref_slug_and_original_team_post():
    created, _, reply = apply(document(), body())
    updated, _, _ = apply(created, body('post.update', ref=reply['ref'], title='Improved', slug='ignored-change'))
    post = updated['content_data']['posts'][-1]
    assert post['title'] == 'Improved' and post['slug'] == 'a-guide-2'
    reverted, _, _ = apply(updated, body('post.revert', ref=reply['ref'], mode='UPDATE'))
    assert reverted['content_data']['posts'][-1]['title'] == 'A guide'
    assert reverted['content_data']['posts'][0] == document()['content_data']['posts'][0]
    hidden, _, _ = apply(reverted, body('post.revert', ref=reply['ref'], mode='CREATE'))
    assert hidden['content_data']['posts'][-1]['is_active'] is False


@pytest.mark.parametrize('event', ['post.update', 'post.revert'])
def test_team_posts_are_protected_from_update_and_revert(event):
    if event == 'post.revert':
        updated, code, reply = apply(document(), body(event, ref='team-1', mode='CREATE'))
        assert code == 200 and reply == {'ok': True}
        assert updated['content_data'] == document()['content_data']
        return
    with pytest.raises(HTTPException) as exc:
        apply(document(), body(event, ref='team-1', mode='CREATE'))
    assert exc.value.status_code == 409


@pytest.mark.parametrize('event', ['post.update', 'post.revert'])
def test_team_edited_provider_posts_are_protected(event):
    doc, _, reply = apply(document(), body())
    posts = doc['content_data']['posts']
    edited = copy.deepcopy(posts)
    edited[-1]['title'] = 'Edited by admin'
    doc['content_data']['posts'] = service.protect_team_edits(posts, edited)
    if event == 'post.revert':
        updated, code, _ = apply(doc, body(event, ref=reply['ref'], mode='CREATE'))
        assert code == 200 and updated['content_data'] == doc['content_data']
        return
    with pytest.raises(HTTPException) as exc:
        apply(doc, body(event, ref=reply['ref'], mode='CREATE'))
    assert exc.value.status_code == 409


def test_html_only_article_is_sanitized_and_metadata_mapped():
    doc, _, _ = apply(document(), body(markdown='', html='<h2>Welcome</h2><script>alert(1)</script><img src="x" onerror="bad()"><a href="javascript:evil()">Link</a>',
        seoTitle='Search title', seoDescription='Search summary', author={'name': 'Author'}, coverImage={'url': 'https://example.test/cover.jpg'}))
    post = doc['content_data']['posts'][-1]
    assert '<h2>Welcome</h2>' in post['content_html']
    assert all(value not in post['content_html'] for value in ('script', 'onerror', 'javascript:'))
    assert post['seoTitle'] == 'Search title' and post['author'] == 'Author'
    assert post['image_url'] == 'https://example.test/cover.jpg'


def test_team_html_edits_remain_sanitized():
    old, _, _ = apply(document(), body())
    posts = copy.deepcopy(old['content_data']['posts'])
    posts[-1]['content_html'] = '<p onclick="bad()">Safe</p>'
    protected = service.protect_team_edits(old['content_data']['posts'], posts)
    assert protected[-1]['editedByTeam'] is True
    assert 'onclick' not in protected[-1]['content_html']


def test_external_url_cannot_target_existing_slug():
    with pytest.raises(HTTPException) as exc:
        apply(document(), body('post.update', url='https://evil.example/blog/a-guide'))
    assert exc.value.status_code == 422


@pytest.mark.parametrize('raw', [b'[]', b'null', b'not json', b'{"event":"unknown"}', b'{"event":[]}', b'{"event":"post.create","post":[]}'])
def test_bad_payload_is_rejected(raw):
    with pytest.raises(HTTPException):
        service.decode_message(raw)


@pytest.mark.parametrize('fields', [{'title': ''}, {'markdown': '', 'html': ''}, {'author': []}])
def test_bad_post_fields_are_rejected(fields):
    # Empty author falls back to Editorial as in the vendor example.
    if fields.get('author') == []:
        fields = {'author': [1]}
    with pytest.raises(HTTPException) as exc:
        apply(document(), body(**fields))
    assert exc.value.status_code == 422


@pytest.mark.parametrize('offset', [-301, 301])
def test_expired_or_future_signature_rejected(offset):
    raw = body()
    with pytest.raises(HTTPException) as exc:
        service.authenticate(headers(raw, int(time.time()) + offset), raw)
    assert exc.value.status_code == 401


def test_signature_covers_raw_body_and_rejects_non_ascii_signature():
    raw = body()
    service.authenticate(headers(raw), raw)
    with pytest.raises(HTTPException):
        service.authenticate(headers(raw), raw + b' ')
    bad = headers(raw)
    bad['x-deylaxy-signature'] = '\u2603'
    with pytest.raises(HTTPException):
        service.authenticate(bad, raw)


class MemoryDB:
    """Transaction-shaped fake; no socket or real DB access."""
    def __init__(self, doc=None):
        self.doc = copy.deepcopy(doc)
        self.pool = self
        self.lock = asyncio.Lock()
        self.writes = 0
        self.audits = []

    @asynccontextmanager
    async def acquire(self):
        yield self

    @asynccontextmanager
    async def transaction(self):
        async with self.lock:
            snapshot = copy.deepcopy(self.doc)
            audit_snapshot = copy.deepcopy(self.audits)
            old_writes = self.writes
            try:
                yield self
            except BaseException:
                self.doc = snapshot
                self.audits = audit_snapshot
                self.writes = old_writes
                raise

    async def fetch(self, sql):
        assert 'FOR UPDATE' in sql
        return [{'id': 1, 'data': json.dumps(self.doc)}] if self.doc else []

    async def execute(self, sql, *args):
        if 'pg_advisory_xact_lock' in sql:
            assert args == (service.LOCK_ID,)
        elif sql.startswith('INSERT INTO audit_logs'):
            self.audits.append(json.loads(args[0]))
        else:
            assert sql.startswith(('INSERT INTO cms_content', 'UPDATE cms_content'))
            self.doc = json.loads(args[0])
            self.writes += 1


@pytest.mark.asyncio
async def test_concurrent_delivery_has_one_insert_and_stable_receipt():
    db = MemoryDB(document())
    raw = body()
    results = await asyncio.gather(*(service.deliver(db, service.decode_message(raw), {}, raw) for _ in range(5)))
    assert all(result == results[0] for result in results)
    assert db.writes == 1 and len(db.doc['content_data']['posts']) == 2


@pytest.mark.asyncio
async def test_admin_save_rejects_stale_version_and_preserves_webhook_state():
    db = MemoryDB(document())
    raw = body()
    await service.deliver(db, service.decode_message(raw), {}, raw)
    with pytest.raises(HTTPException) as exc:
        await service.update_team_blog(db, document(), {'content_data': {'posts': []}}, document()['updated_at'])
    assert exc.value.status_code == 409 and len(db.doc['content_data']['posts']) == 2
    current = copy.deepcopy(db.doc)
    posts = copy.deepcopy(current['content_data']['posts'])
    posts[-1]['title'] = 'Admin edit'
    await service.update_team_blog(db, current, {'content_data': {'posts': posts}}, current['updated_at'])
    assert db.doc['deylaxy_state'] == current['deylaxy_state']
    assert db.doc['content_data']['posts'][-1]['editedByTeam'] is True


@pytest.mark.asyncio
async def test_failed_delivery_rolls_back_and_does_not_record_receipt():
    db = MemoryDB(document())
    with pytest.raises(HTTPException):
        raw = body(title='')
        await service.deliver(db, service.decode_message(raw), {}, raw)
    assert db.doc == document() and db.writes == 0


@pytest.mark.asyncio
async def test_missing_section_created_without_schema_operations():
    db = MemoryDB()
    raw = body()
    await service.deliver(db, service.decode_message(raw), {}, raw)
    assert db.doc['page'] == 'landing' and db.doc['section'] == 'blog'


@pytest.mark.asyncio
async def test_disabled_section_stays_disabled():
    doc = document()
    doc['is_active'] = False
    db = MemoryDB(doc)
    with pytest.raises(HTTPException) as exc:
        raw = body()
        await service.deliver(db, service.decode_message(raw), {}, raw)
    assert exc.value.status_code == 409 and db.writes == 0


@pytest.mark.asyncio
async def test_http_ping_does_not_need_db_and_unsigned_request_cannot_write(monkeypatch):
    app = FastAPI()
    app.include_router(router, prefix='/api')
    app.dependency_overrides[get_db] = lambda: None
    raw = b'{"event":"ping"}'
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
        assert (await client.post('/api/deylaxy/posts', content=raw, headers=headers(raw))).json() == {'ok': True}
        assert (await client.post('/api/deylaxy/posts', content=raw)).status_code == 401
        assert (await client.post('/api/deylaxy/posts', content=b'x' * (service.MAX_BODY + 1))).status_code == 413
        monkeypatch.setenv('DEYLAXY_BLOG_ENABLED', 'false')
        assert (await client.post('/api/deylaxy/posts', content=raw, headers=headers(raw))).status_code == 503


@pytest.mark.asyncio
async def test_http_create_retry_update_and_revert_roundtrip():
    db = MemoryDB(document())
    app = FastAPI()
    app.include_router(router, prefix='/api')
    app.dependency_overrides[get_db] = lambda: db
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
        async def send(raw):
            return await client.post('/api/deylaxy/posts', content=raw, headers=headers(raw))
        created = await send(body())
        assert created.status_code == 201
        assert (await send(body())).json() == created.json()
        ref = created.json()['ref']
        assert (await send(body('post.update', ref=ref, title='Updated'))).status_code == 200
        assert (await send(body('post.revert', ref=ref, mode='UPDATE'))).status_code == 200
        assert db.doc['content_data']['posts'][-1]['title'] == 'A guide'
        assert (await send(body('post.revert', ref=ref, mode='CREATE'))).status_code == 200
        assert db.doc['content_data']['posts'][-1]['is_active'] is False


@pytest.mark.asyncio
async def test_admin_cannot_create_duplicate_section():
    db = MemoryDB(document())
    with pytest.raises(HTTPException) as exc:
        await service.create_team_blog_section(db, document())
    assert exc.value.status_code == 409 and db.writes == 0


def test_script_only_html_is_rejected():
    with pytest.raises(HTTPException) as exc:
        apply(document(), body(markdown='', html='<script>alert(1)</script>'))
    assert exc.value.status_code == 422
