"""Giriş yapmadan çevrilen kelimelerin toplam sayacı: kimlik tutulmaz, yalnız tek sözcük, 30 gün.

SQL testleri geçici Postgres ister (initdb yoksa atlanır). Gerçek sunucuya bağlanmaz."""
import os

import pytest
from starlette.requests import Request

import accounts
import admin

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
_cwd = os.getcwd()
os.chdir(_ROOT)
try:
    import main
finally:
    os.chdir(_cwd)


def test_only_single_words_are_kept():
    got = accounts.clean_anon_words(["hola", "hola", "don't", "ice-cream", "iki kelime", "a@b.com", "site.com",
                                     "http://x", "tel5551234", "user_name", "...", "", "x" * 41, "ночь"])
    assert got == ["hola", "don't", "ice-cream", "ночь"]


def call(monkeypatch, *, signed_in, lookup_only=False, words=("Hola", "AMIGO"), src="es", dst="en"):
    seen = []
    monkeypatch.setattr(main, "_throttle_ip", lambda *a, **k: None)
    monkeypatch.setattr(main, "record_visit", lambda *a, **k: None)
    monkeypatch.setattr(main, "user_from_request", lambda r: {"id": 1} if signed_in else None)
    monkeypatch.setattr(main, "count_usage", lambda *a: None)
    monkeypatch.setattr(main, "count_anon_words", lambda w, s, d: seen.append((w, s, d)))
    monkeypatch.setattr(main.multilang, "handle", lambda batch, user: {"status": "success"})
    r = Request({"type": "http", "method": "POST", "path": "/translate-words", "query_string": b"", "headers": [], "client": ("1.2.3.4", 1)})
    main.translate_words(main.WordsBatch(words=list(words), src=src, dst=dst, lookup_only=lookup_only), r)
    return seen


def test_endpoint_counts_only_signed_out_real_translations(monkeypatch):
    assert call(monkeypatch, signed_in=False) == [(["hola", "amigo"], "es", "en")]
    assert call(monkeypatch, signed_in=True) == []
    assert call(monkeypatch, signed_in=False, lookup_only=True) == []
    assert call(monkeypatch, signed_in=False, src="zz") == []


def test_counts_add_up_old_rows_disappear_and_admin_sees_translations(pg):
    accounts.q("CREATE TABLE IF NOT EXISTS words_ml (src TEXT NOT NULL, dst TEXT NOT NULL, word TEXT NOT NULL, trans TEXT NOT NULL, PRIMARY KEY (src, dst, word));")
    accounts.q("CREATE TABLE IF NOT EXISTS words (id SERIAL PRIMARY KEY, eng TEXT, tr TEXT, created_at TIMESTAMP DEFAULT now());")
    accounts.q("DELETE FROM anon_words; DELETE FROM words_ml; DELETE FROM words;")
    accounts.q("INSERT INTO words_ml (src, dst, word, trans) VALUES ('es', 'en', 'hola', 'hello');")
    accounts.q("INSERT INTO words (eng, tr) VALUES ('night', 'gece'), ('night', 'gece');")
    accounts.count_anon_words(["hola", "bozukparça"], "es", "en")
    accounts.count_anon_words(["hola"], "es", "en")
    accounts.count_anon_words(["gece"], "tr", "en")
    assert admin.anon_words(1) == [{"src": "es", "dst": "en", "word": "hola", "n": 2, "trans": "hello"},
                                   {"src": "tr", "dst": "en", "word": "gece", "n": 1, "trans": "night"}]
    accounts.q("UPDATE anon_words SET day = day - 31;")
    assert admin.anon_words(90) != []
    accounts._anon_pruned_day[0] = None
    accounts._prune_anon_words()
    assert admin.anon_words(90) == []


@pytest.mark.parametrize("lang,must", [("tr", "Hesapsız çevrilen kelimeler"), ("en", "Words translated without an account")])
def test_privacy_page_says_it(lang, must):
    r = Request({"type": "http", "method": "GET", "path": "/privacy", "query_string": f"lang={lang}".encode(), "headers": []})
    resp = accounts.privacy(r)
    txt = resp.body.decode() if hasattr(resp, "body") else str(resp)
    assert must in txt and "\\n<li>" not in txt
