import pytest

from app.config import settings
from app.routers import translate as translate_router


@pytest.fixture
def google(monkeypatch):
    """Stand in for Google: records each call and 'translates' by tagging the text."""
    calls = []

    def fake(texts, source, target):
        calls.append(list(texts))
        return [f'[{target}] {t}' for t in texts]

    monkeypatch.setattr(settings, 'google_translate_api_key', 'test-key')
    monkeypatch.setattr(translate_router, 'google_translate', fake)
    translate_router._usage.clear()
    return calls


def test_misses_are_fetched_once_then_served_from_the_database(client, google):
    body = {'target': 'zu', 'texts': ['Log in', 'Fields', 'Log in', '']}
    res = client.post('/api/translate', json=body)
    assert res.status_code == 200, res.text
    assert res.json() == {'target': 'zu', 'translations': ['[zu] Log in', '[zu] Fields', '[zu] Log in', '']}
    assert google == [['Log in', 'Fields']]  # repeats and blanks never reach Google

    client.post('/api/translate', json={'target': 'zu', 'texts': ['Fields', 'Sign out']})
    assert google[1:] == [['Sign out']]

    # each language has its own cache
    client.post('/api/translate', json={'target': 'nso', 'texts': ['Fields']})
    assert google[2:] == [['Fields']]


def test_english_needs_no_translation(client, google):
    res = client.post('/api/translate', json={'target': 'en', 'texts': ['Log in']})
    assert res.json()['translations'] == ['Log in']
    assert google == []


def test_without_a_key_misses_come_back_empty(client, monkeypatch):
    monkeypatch.setattr(settings, 'google_translate_api_key', None)
    res = client.post('/api/translate', json={'target': 'xh', 'texts': ['Log in']})
    assert res.status_code == 200
    assert res.json()['translations'] == [None]


def test_a_failing_provider_falls_back_instead_of_erroring(client, monkeypatch):
    import httpx

    def broken(*_):
        raise httpx.ConnectError('down')

    monkeypatch.setattr(settings, 'google_translate_api_key', 'test-key')
    monkeypatch.setattr(translate_router, 'google_translate', broken)
    res = client.post('/api/translate', json={'target': 'af', 'texts': ['Log in']})
    assert res.status_code == 200
    assert res.json()['translations'] == [None]


def test_limits(client, google, monkeypatch):
    assert client.post('/api/translate', json={'target': 'fr', 'texts': ['Hi']}).status_code == 422
    assert client.post('/api/translate', json={'target': 'zu', 'texts': []}).status_code == 422
    too_long = 'x' * (settings.translate_max_text_chars + 1)
    assert client.post('/api/translate', json={'target': 'zu', 'texts': [too_long]}).status_code == 422

    monkeypatch.setattr(settings, 'translate_chars_per_hour', 10)
    res = client.post('/api/translate', json={'target': 'tn', 'texts': ['Twelve chars']})
    assert res.json()['translations'] == [None]
    assert google == []


def test_placeholders_survive_the_round_trip(monkeypatch):
    sent = {}

    class Response:
        def raise_for_status(self):
            pass

        def json(self):
            # what Google sends back: translated words, the span untouched, entities escaped
            return {'data': {'translations': [
                {'translatedText': 'Sawubona <span translate="no">{name}</span> &amp; nawe'}
            ]}}

    class Client:
        def __init__(self, **_):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def post(self, url, json):
            sent.update(json)
            return Response()

    monkeypatch.setattr(settings, 'google_translate_api_key', 'test-key')
    monkeypatch.setattr(translate_router.httpx, 'Client', Client)
    out = translate_router.google_translate(['Hello {name} & you'], 'en', 'zu')
    assert sent['q'] == ['Hello <span translate="no">{name}</span> &amp; you']
    assert out == ['Sawubona {name} & nawe']
