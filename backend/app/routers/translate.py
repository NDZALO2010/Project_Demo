import hashlib
import html
import logging
import os
import re
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.orm import Session

from ..config import settings
from ..db import IS_SQLITE, get_db
from ..models import Translation
from ..schemas import TranslateIn, TranslateOut

router = APIRouter(prefix='/translate', tags=['translate'])
log = logging.getLogger(__name__)

# Cloud Translation Basic (v2). The key goes in a header so it stays out of URLs and access logs.
GOOGLE_TRANSLATE = 'https://translation.googleapis.com/language/translate/v2'
# Google's per-request limits are 128 segments and about 30k characters
BATCH_SEGMENTS = 128
BATCH_CHARS = 25_000

# {name} placeholders the frontend fills in after translating. Sent as HTML inside
# translate="no" spans so Google leaves them alone.
PLACEHOLDER = re.compile(r'\{\w+\}')
NO_TRANSLATE = re.compile(r'<span translate="no">\s*(\{\w+\})\s*</span>')


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def batches(texts: list[str]):
    batch, size = [], 0
    for text in texts:
        if batch and (len(batch) == BATCH_SEGMENTS or size + len(text) > BATCH_CHARS):
            yield batch
            batch, size = [], 0
        batch.append(text)
        size += len(text)
    if batch:
        yield batch


def google_translate(texts: list[str], source: str, target: str) -> list[str]:
    out = []
    with httpx.Client(timeout=15, headers={'X-Goog-Api-Key': settings.google_translate_api_key}) as client:
        for batch in batches(texts):
            res = client.post(GOOGLE_TRANSLATE, json={
                'q': [PLACEHOLDER.sub(r'<span translate="no">\g<0></span>', html.escape(t)) for t in batch],
                'source': source,
                'target': target,
                'format': 'html',
            })
            res.raise_for_status()
            out += [
                html.unescape(NO_TRANSLATE.sub(r'\1', t['translatedText']))
                for t in res.json()['data']['translations']
            ]
    return out


# Best effort only: each server instance (and each Vercel function instance) counts on its own
_usage: dict[str, tuple[float, int]] = {}


def within_hourly_allowance(ip: str, chars: int) -> bool:
    now = time.monotonic()
    started, used = _usage.get(ip, (now, 0))
    if now - started > 3600:
        started, used = now, 0
    if used + chars > settings.translate_chars_per_hour:
        return False
    _usage[ip] = (started, used + chars)
    return True


def client_ip(request: Request) -> str:
    # Vercel's edge sets x-real-ip; anywhere else a caller could forge it
    if os.environ.get('VERCEL') and request.headers.get('x-real-ip'):
        return request.headers['x-real-ip']
    return request.client.host if request.client else 'unknown'


def save(db: Session, rows: list[dict]):
    # another request may have cached the same text a moment ago; keep whichever landed first
    insert = sqlite.insert if IS_SQLITE else postgresql.insert
    db.execute(insert(Translation).values(rows).on_conflict_do_nothing())
    db.commit()


@router.post('', response_model=TranslateOut)
def translate(body: TranslateIn, request: Request, db: Session = Depends(get_db)):
    """Cached translations first; only the misses go to Google, and their results are cached.
    Anything that can't be translated right now comes back as None, never as an error."""
    if len(body.texts) > settings.translate_max_texts:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f'Send at most {settings.translate_max_texts} texts at a time.')
    if any(len(t) > settings.translate_max_text_chars for t in body.texts):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f'Each text must be at most {settings.translate_max_text_chars} characters.')

    if body.source == body.target:
        return {'target': body.target, 'translations': body.texts}

    # blank strings and repeats never need a lookup of their own
    hashes = {t: text_hash(t) for t in body.texts if t.strip()}
    found = dict(db.execute(
        select(Translation.source_hash, Translation.translated_text).where(
            Translation.source_language == body.source,
            Translation.target_language == body.target,
            Translation.source_hash.in_(set(hashes.values())),
        )
    ).all())

    missing = [t for t, h in hashes.items() if h not in found]
    if (
        missing
        and settings.google_translate_api_key
        and within_hourly_allowance(client_ip(request), sum(map(len, missing)))
    ):
        try:
            translated = google_translate(missing, body.source, body.target)
        except (httpx.HTTPError, KeyError, ValueError) as err:
            # a quota, network or key problem: the frontend falls back to English until it retries
            log.warning('Google Translate failed for %s: %s', body.target, err)
        else:
            save(db, [
                {
                    'source_language': body.source,
                    'target_language': body.target,
                    'source_hash': hashes[text],
                    'original_text': text,
                    'translated_text': result,
                }
                for text, result in zip(missing, translated)
            ])
            found.update((hashes[text], result) for text, result in zip(missing, translated))

    return {
        'target': body.target,
        'translations': [found.get(hashes[t]) if t.strip() else t for t in body.texts],
    }
