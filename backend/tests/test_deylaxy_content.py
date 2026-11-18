"""ZIP compatibility regressions, isolated from real services and databases."""
import copy
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from services.deylaxy_content import date_label, reading_time, split_faqs, split_table
from services import deylaxy_service as service
from test_deylaxy_webhook import MemoryDB, apply, body, document


@pytest.fixture(autouse=True)
def configuration(monkeypatch):
    monkeypatch.setenv('DEYLAXY_BLOG_ENABLED', 'true')
    monkeypatch.setenv('DEYLAXY_SITE_URL', 'https://www.x-space360.in')


def test_faqs_extracted_without_losing_following_article_section():
    original = '## Intro\nSome text\n\n## Frequently Asked Questions\n### What is STR?\nA **short** stay.\n\n**Who can book?**\nGuests can [book](https://example.test).\n\n## Next steps\nContact us.'
    content, faqs = split_faqs(original)
    assert faqs == [{'question': 'What is STR?', 'answer': 'A short stay.'}, {'question': 'Who can book?', 'answer': 'Guests can book.'}]
    assert '## Intro' in content and '## Next steps' in content and '### What is STR?' not in content


def test_invalid_faq_section_is_not_removed():
    original = '## FAQ\nNo question-and-answer headings.'
    assert split_faqs(original) == (original, [])


def test_first_table_mapped_to_site_fields_with_escaped_pipes_and_padding():
    content, table = split_table('## Prices\n\n| Type | Cost |\n| :--- | ---: |\n| Room \\| Villa | 100 |\n| Office |\n\n## Another table\n| X | Y |\n| --- | --- |\n| A | B |')
    assert table == {'title': 'Prices', 'headers': ['Type', 'Cost'], 'rows': [['Room | Villa', '100'], ['Office', '']]}
    assert '| Room' not in content and '| A | B |' in content


def test_code_examples_are_not_misread_as_table_or_faq():
    original = '```markdown\n## FAQ\n### Test?\nAnswer.\n| A | B |\n| --- | --- |\n| X | Y |\n```'
    assert split_faqs(original) == (original, [])
    content, table = split_table(original)
    assert content == original and table['headers'] == []


def test_reading_time_and_date_use_expected_fields_and_india_timezone():
    assert reading_time('word ' * 600) == '3 min read'
    assert reading_time('') == '1 min read'
    assert date_label(datetime(2026, 11, 6, 20, tzinfo=timezone.utc)) == '7 November 2026'
    fields = service.post_fields({'title': 'Long article', 'markdown': 'word ' * 600})
    assert fields['readTime'] == fields['read_time'] == '3 min read'


def test_configurable_author_and_site_url_alias(monkeypatch):
    monkeypatch.setenv('DEYLAXY_BLOG_AUTHOR', 'X-Space360 Desk')
    assert service.post_fields({'title': 'Article', 'markdown': 'Body'})['author'] == 'X-Space360 Desk'
    monkeypatch.delenv('DEYLAXY_SITE_URL')
    monkeypatch.setenv('SITE_URL', 'https://www.x-space360.in/')
    assert service.site_url() == 'https://www.x-space360.in'
    monkeypatch.setenv('DEYLAXY_SITE_URL', 'http://localhost:3000')
    assert service.site_url() == 'http://localhost:3000'


def test_update_keeps_existing_cover_when_vendor_sends_none():
    created, _, reply = apply(document(), body(coverImage={'url': 'https://example.test/cover.jpg'}))
    updated, _, _ = apply(created, body('post.update', ref=reply['ref'], title='New title'))
    post = updated['content_data']['posts'][-1]
    assert post['imageUrl'] == post['image_url'] == 'https://example.test/cover.jpg'


def test_fingerprint_protects_provider_post_edited_outside_admin_route():
    doc, _, reply = apply(document(), body())
    doc['content_data']['posts'][-1]['content'] = 'An external team edit'
    with pytest.raises(HTTPException) as exc:
        apply(doc, body('post.update', ref=reply['ref']))
    assert exc.value.status_code == 409
    reverted, code, _ = apply(doc, body('post.revert', ref=reply['ref'], mode='CREATE'))
    assert code == 200 and reverted['content_data'] == doc['content_data']


def test_missing_or_already_removed_article_revert_is_safe_noop():
    _, code, reply = apply(document(), body('post.revert', ref='not-present', mode='CREATE'))
    assert code == 200 and reply == {'ok': True}


def test_revert_without_mode_uses_vendor_update_semantics():
    doc, _, reply = apply(document(), body())
    doc, _, _ = apply(doc, body('post.update', ref=reply['ref'], title='Updated'))
    reverted, code, _ = apply(doc, body('post.revert', ref=reply['ref']))
    assert code == 200 and reverted['content_data']['posts'][-1]['title'] == 'A guide'


@pytest.mark.asyncio
async def test_audit_is_written_once_for_retries_and_does_not_contain_payload_or_secret():
    db = MemoryDB(document())
    raw = body()
    msg = service.decode_message(raw)
    await service.deliver(db, msg, {}, raw)
    await service.deliver(db, msg, {}, raw)
    assert len(db.audits) == 1
    log = db.audits[0]
    assert log['action'] == 'deylaxy_post_created' and log['user_id'] == 'deylaxy'
    assert log['new_value'] == {'slug': 'a-guide-2'}
    assert 'body' not in log and 'signature' not in log


@pytest.mark.asyncio
async def test_audit_failure_rolls_back_post_and_receipt(monkeypatch):
    db = MemoryDB(document())
    real_execute = db.execute
    async def fail_audit(sql, *args):
        if sql.startswith('INSERT INTO audit_logs'):
            raise RuntimeError('Simulated audit failure')
        return await real_execute(sql, *args)
    monkeypatch.setattr(db, 'execute', fail_audit)
    raw = body()
    with pytest.raises(RuntimeError):
        await service.deliver(db, service.decode_message(raw), {}, raw)
    assert db.doc == document() and db.writes == 0 and db.audits == []


@pytest.mark.asyncio
async def test_failed_http_delivery_has_vendor_error_shape_without_internal_details(monkeypatch):
    import httpx
    from fastapi import FastAPI
    from routes.deylaxy_routes import router, get_db
    from test_deylaxy_webhook import headers
    monkeypatch.setenv('DEYLAXY_BLOG_SECRET', 'test-secret-for-offline-tests-only')
    db = MemoryDB(document())
    async def fail_write(*args):
        raise RuntimeError('private internal detail')
    monkeypatch.setattr(db, 'execute', fail_write)
    app = FastAPI()
    app.include_router(router, prefix='/api')
    app.dependency_overrides[get_db] = lambda: db
    raw = body()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
        response = await client.post('/api/deylaxy/posts', content=raw, headers=headers(raw))
    assert response.status_code == 500
    assert response.json() == {'error': 'could not save the post'}
    assert db.doc == document()
