"""Signed blog delivery, using the existing PostgreSQL CMS row atomically.

No database connection or schema change occurs on import. Runtime writes are
limited to the landing/blog CMS document and its audit entries, in one transaction.
"""
import copy
import hashlib
import hmac
import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit

import nh3
from fastapi import HTTPException
from services.deylaxy_content import date_label, reading_time, split_faqs, split_table

LOCK_ID = 7300360
MAX_BODY = 1024 * 1024
TAGS = {'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i',
        'a', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
        'figure', 'figcaption', 'br', 'hr', 'code', 'pre'}


def enabled():
    return os.getenv('DEYLAXY_BLOG_ENABLED', 'false').lower() == 'true'


def site_url():
    value = (os.getenv('DEYLAXY_SITE_URL') or os.getenv('SITE_URL', '')).rstrip('/')
    try:
        parsed = urlsplit(value)
    except ValueError:
        raise HTTPException(503, 'Deylaxy site URL is not configured correctly')
    if parsed.scheme not in {'http', 'https'} or not parsed.hostname or parsed.path not in {'', '/'} or parsed.query or parsed.fragment or parsed.username:
        raise HTTPException(503, 'Deylaxy site URL is not configured correctly')
    return value


def authenticate(headers, body, now=None):
    secret = os.getenv('DEYLAXY_BLOG_SECRET', '')
    if not enabled() or not secret:
        raise HTTPException(503, 'Deylaxy blog integration is disabled or unconfigured')
    ts = headers.get('x-deylaxy-timestamp', '')
    if len(ts) > 16 or not ts.isascii() or not ts.isdigit() or abs((time.time() if now is None else now) - int(ts)) > 300:
        raise HTTPException(401, 'Invalid webhook signature')
    expected = 'sha256=' + hmac.new(secret.encode(), ts.encode() + b'.' + body, hashlib.sha256).hexdigest()
    signature = headers.get('x-deylaxy-signature', '')
    if not re.fullmatch(r'sha256=[a-f0-9]{64}', signature) or not hmac.compare_digest(signature, expected):
        raise HTTPException(401, 'Invalid webhook signature')


def decode_message(body):
    try:
        msg = json.loads(body)
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, 'Invalid JSON')
    if not isinstance(msg, dict) or not isinstance(msg.get('event'), str) or msg['event'] not in {'ping', 'post.create', 'post.update', 'post.revert'}:
        raise HTTPException(400, 'Unsupported webhook event')
    if msg['event'] != 'ping' and not isinstance(msg.get('post'), dict):
        raise HTTPException(422, 'post must be an object')
    return msg


def post_fields(post):
    title = post.get('title')
    if not isinstance(title, str) or not title.strip() or len(title) > 300:
        raise HTTPException(422, 'A title of 1 to 300 characters is required')
    markdown = post.get('markdown', '')
    html = post.get('html', '')
    if not isinstance(markdown, str) or not isinstance(html, str) or not (markdown.strip() or html.strip()):
        raise HTTPException(422, 'Article markdown or HTML is required')
    cover = post.get('coverImage')
    cover_url = cover.get('url', '') if isinstance(cover, dict) else ''
    try:
        valid_cover = isinstance(cover_url, str) and urlsplit(cover_url).scheme in {'http', 'https'} and bool(urlsplit(cover_url).hostname)
    except ValueError:
        valid_cover = False
    if not valid_cover:
        cover_url = ''
    default_author = os.getenv('DEYLAXY_BLOG_AUTHOR', 'X-Space360 Editorial')
    author = post.get('author') or default_author
    if isinstance(author, dict):
        author = author.get('name') or default_author
    if not isinstance(author, str):
        raise HTTPException(422, 'Invalid author')
    cleaned = sanitize_html(html)
    if not markdown.strip() and not cleaned.strip():
        raise HTTPException(422, 'Article contains no supported content')
    content, faqs = split_faqs(markdown)
    content, table = split_table(content)
    duration = reading_time(markdown or re.sub(r'<[^>]+>', ' ', cleaned))
    fields = {
        'title': title.strip(), 'excerpt': str(post.get('excerpt') or post.get('seoDescription') or '')[:600],
        'content': content, 'content_html': cleaned if not markdown.strip() else '',
        'seoTitle': str(post.get('seoTitle') or title)[:300],
        'seoDescription': str(post.get('seoDescription') or post.get('excerpt') or '')[:600],
        'author': author[:200], 'faqs': faqs, 'tableData': table,
        'readTime': duration, 'read_time': duration,
    }
    if valid_cover:
        fields.update(image_url=cover_url, imageUrl=cover_url)
    return fields


def sanitize_html(html):
    return nh3.clean(str(html or ''), tags=TAGS,
        attributes={'a': {'href', 'title', 'target'}, 'img': {'src', 'alt', 'width', 'height', 'loading'}},
        url_schemes={'https', 'http', 'mailto'})


def identity(post, posts):
    if post.get('ref'):
        return next((p for p in posts if str(p.get('id')) == str(post['ref'])), None)
    slug = post.get('slug')
    if post.get('url'):
        try:
            url = urlsplit(post['url'])
            base = urlsplit(site_url())
        except (ValueError, TypeError):
            raise HTTPException(422, 'Invalid post URL')
        if url.scheme != base.scheme or url.netloc.lower() != base.netloc.lower() or not url.path.startswith('/blog/'):
            raise HTTPException(422, 'Post URL must belong to this website')
        slug = unquote(url.path[6:].rstrip('/'))
    if not isinstance(slug, str) or not slug or '/' in slug:
        raise HTTPException(422, 'A post ref or valid blog URL/slug is required')
    return next((p for p in posts if p.get('slug') == slug), None)


def apply_message(document, msg, headers, body):
    """Pure state transition; caller persists the returned document atomically."""
    doc = copy.deepcopy(document)
    data = doc.setdefault('content_data', {})
    posts = data.setdefault('posts', [])
    if not isinstance(posts, list) or any(not isinstance(p, dict) for p in posts):
        raise HTTPException(409, 'Existing blog data requires review')
    state = doc.setdefault('deylaxy_state', {'receipts': {}, 'revisions': {}})
    if not isinstance(state, dict):
        raise HTTPException(409, 'Existing Deylaxy state requires review')
    state.setdefault('receipts', {})
    state.setdefault('revisions', {})
    notes = state.setdefault('posts', {})
    digest = hashlib.sha256(body).hexdigest()
    event_id = headers.get('x-deylaxy-event-id') or msg.get('eventId') or msg.get('event_id')
    if event_id is not None and (not isinstance(event_id, str) or not event_id or len(event_id) > 256):
        raise HTTPException(422, 'Invalid event ID')
    key = hashlib.sha256(('id:' + event_id if event_id else 'body:' + digest).encode()).hexdigest()
    receipt = state['receipts'].get(key)
    if receipt:
        if receipt['digest'] != digest:
            raise HTTPException(409, 'Event ID reused with different content')
        return doc, receipt['status'], receipt['reply']
    post = msg['post']
    event = msg['event']
    now = datetime.now(timezone.utc).isoformat()
    if event == 'post.create':
        fields = post_fields(post)
        base = re.sub('[^a-z0-9-]+', '-', str(post.get('slug') or title_slug(fields['title'])).lower()).strip('-')[:150] or 'post'
        slug, index = base, 2
        used = {p.get('slug') or title_slug(p.get('title', '')) for p in posts}
        while slug in used:
            slug, index = f'{base}-{index}', index + 1
        found = dict(fields, id='deylaxy_' + uuid.uuid4().hex, slug=slug,
                     source='deylaxy', editedByTeam=False, is_active=True,
                     publishedAt=now, date=date_label(), updatedAt=now)
        found.setdefault('image_url', '')
        found.setdefault('imageUrl', '')
        notes[found['id']] = {'source': 'deylaxy', 'fingerprint': fingerprint(found), 'createdAt': now}
        posts.append(found)
        code, reply = 201, {'ref': found['id'], 'url': f'{site_url()}/blog/{slug}'}
    else:
        found = identity(post, posts)
        note = notes.get(found['id'], {}) if found else {}
        protected = found is not None and (found.get('source') != 'deylaxy' or found.get('editedByTeam') or
            (note.get('fingerprint') is not None and fingerprint(found) != note['fingerprint']))
        if not found or protected:
            if event == 'post.update':
                raise HTTPException(409 if found else 404, 'Post is owned or edited by the team' if found else 'No such post')
            code, reply = 200, {'ok': True}
            state['receipts'][key] = {'digest': digest, 'status': code, 'reply': reply}
            return doc, code, reply
        revisions = state['revisions'].setdefault(found['id'], [])
        if event == 'post.update':
            fields = post_fields(post)
            revisions.append(copy.deepcopy(found))
            del revisions[:-50]
            found.update(fields, updatedAt=now)
            code, reply = 200, {'ref': found['id'], 'url': f"{site_url()}/blog/{found['slug']}"}
        elif post.get('mode') == 'CREATE':
            found.update(is_active=False, updatedAt=now)
            code, reply = 200, {'ok': True}
        elif post.get('mode', 'UPDATE') == 'UPDATE':
            if revisions:
                previous = revisions.pop()
                found.clear()
                found.update(previous, updatedAt=now)
            code, reply = 200, {'ok': True}
        else:
            raise HTTPException(422, 'Revert mode must be CREATE or UPDATE')
        notes.setdefault(found['id'], {})['fingerprint'] = fingerprint(found)
    doc['updated_at'] = now
    state['receipts'][key] = {'digest': digest, 'status': code, 'reply': reply}
    return doc, code, reply


def title_slug(title):
    return re.sub('[^a-z0-9-]+', '-', str(title).lower()).strip('-')


def fingerprint(post):
    fields = ('slug', 'title', 'author', 'excerpt', 'seoTitle', 'seoDescription',
              'content', 'content_html', 'faqs', 'tableData', 'imageUrl', 'image_url', 'is_active')
    return hashlib.sha256(json.dumps({key: post.get(key) for key in fields}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def _json(value):
    return json.loads(value) if isinstance(value, str) else value


async def locked_blog(conn):
    await conn.execute('SELECT pg_advisory_xact_lock($1)', LOCK_ID)
    rows = await conn.fetch("SELECT id, data FROM cms_content WHERE data->>'page'='landing' AND data->>'section'='blog' ORDER BY id FOR UPDATE")
    if len(rows) > 1:
        raise HTTPException(409, 'Multiple landing blog sections require review')
    return (rows[0]['id'], _json(rows[0]['data'])) if rows else (None, None)


async def deliver(db, msg, headers, body):
    if msg['event'] == 'ping':
        return 200, {'ok': True}
    site_url()  # Fail before opening a transaction if the public URL is invalid.
    if not getattr(db, 'pool', None):
        raise HTTPException(503, 'PostgreSQL CMS is unavailable')
    async with db.pool.acquire() as conn:
        async with conn.transaction():
            row_id, doc = await locked_blog(conn)
            if doc is None:
                if msg['event'] != 'post.create':
                    raise HTTPException(404, 'No such post')
                doc = {'content_id': 'cms_blog_deylaxy_' + uuid.uuid4().hex,
                       'page': 'landing', 'section': 'blog', 'content_type': 'object',
                       'is_active': True, 'created_at': datetime.now(timezone.utc).isoformat(),
                       'content_data': {'posts': []}}
            if doc.get('is_active') is False:
                raise HTTPException(409, 'Blog section is disabled by the team')
            updated, code, reply = apply_message(doc, msg, headers, body)
            if updated != doc:
                if row_id is None:
                    await conn.execute('INSERT INTO cms_content (data) VALUES ($1)', json.dumps(updated))
                else:
                    await conn.execute('UPDATE cms_content SET data=$1 WHERE id=$2', json.dumps(updated), row_id)
                before = doc.get('content_data', {}).get('posts', [])
                after = updated.get('content_data', {}).get('posts', [])
                if before != after:
                    ref = reply.get('ref')
                    changed = next((p for p in after if p.get('id') == ref), None) if ref else identity(msg['post'], before)
                    if changed:
                        action = {'post.create': 'deylaxy_post_created', 'post.update': 'deylaxy_post_updated',
                                  'post.revert': 'deylaxy_post_removed' if msg['post'].get('mode') == 'CREATE' else 'deylaxy_post_restored'}[msg['event']]
                        log = {'audit_id': 'audit_' + uuid.uuid4().hex[:14], 'user_id': 'deylaxy', 'role': 'system',
                               'module': 'marketing_cms', 'action': action, 'record_id': changed['id'],
                               'new_value': {'slug': changed.get('slug')}, 'reason': 'Deylaxy blog article',
                               'status': 'success', 'immutable': True, 'created_at': datetime.now(timezone.utc).isoformat()}
                        await conn.execute('INSERT INTO audit_logs (data) VALUES ($1)', json.dumps(log))
            return code, reply


def protect_team_edits(old_posts, new_posts):
    old = {str(p.get('id')): p for p in old_posts}
    result = copy.deepcopy(new_posts)
    for post in result:
        if 'content_html' in post:
            post['content_html'] = sanitize_html(post['content_html'])
        previous = old.get(str(post.get('id')))
        if previous and previous.get('source') == 'deylaxy':
            post['source'] = 'deylaxy'
            post['editedByTeam'] = bool(previous.get('editedByTeam') or post != previous)
        elif post.get('source') == 'deylaxy':
            post['source'], post['editedByTeam'] = 'team', True
    return result


async def update_team_blog(db, existing, fields, expected_updated_at):
    """Serialize admin saves with deliveries; reject stale CMS snapshots."""
    async with db.pool.acquire() as conn:
        async with conn.transaction():
            row_id, current = await locked_blog(conn)
            if current is None or current['content_id'] != existing['content_id']:
                raise HTTPException(409, 'Blog section changed; reload before saving')
            # Required when webhook is enabled; existing CMS remains compatible otherwise.
            expected = expected_updated_at or (existing.get('updated_at') if not enabled() and not existing.get('deylaxy_state') else None)
            actual = current.get('updated_at')
            def normalized(value):
                if isinstance(value, datetime):
                    return value.isoformat()
                return str(value or '').replace('Z', '+00:00')
            if not expected or normalized(expected) != normalized(actual):
                raise HTTPException(409, 'Blog changed; reload the Blog Management page before saving')
            incoming = copy.deepcopy(fields)
            if 'content_data' in incoming:
                posts = incoming['content_data'].get('posts', [])
                if not isinstance(posts, list) or any(not isinstance(p, dict) for p in posts):
                    raise HTTPException(422, 'posts must be an array of objects')
                ids = [str(p.get('id', '')) for p in posts]
                if len(ids) != len(set(ids)) or '' in ids:
                    raise HTTPException(422, 'Each blog post needs a unique ID')
                incoming['content_data'] = {**current.get('content_data', {}), **incoming['content_data']}
                incoming['content_data']['posts'] = protect_team_edits(current.get('content_data', {}).get('posts', []), posts)
            current.update(incoming)
            await conn.execute('UPDATE cms_content SET data=$1 WHERE id=$2', json.dumps(current, default=lambda v: v.isoformat()), row_id)


async def create_team_blog_section(db, document):
    async with db.pool.acquire() as conn:
        async with conn.transaction():
            _, current = await locked_blog(conn)
            if current is not None:
                raise HTTPException(409, 'Blog section exists; reload and edit it instead')
            doc = copy.deepcopy(document)
            posts = doc.get('content_data', {}).get('posts', [])
            if not isinstance(posts, list) or any(not isinstance(p, dict) for p in posts):
                raise HTTPException(422, 'posts must be an array of objects')
            doc.setdefault('content_data', {})['posts'] = protect_team_edits([], posts)
            await conn.execute('INSERT INTO cms_content (data) VALUES ($1)', json.dumps(doc, default=lambda v: v.isoformat()))
