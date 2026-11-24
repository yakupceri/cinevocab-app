"""Yönetim paneli: (1) ziyaret adresi seçimi (Railway'in zincire kattığı altyapı adresleri ülkeyi "bilinmiyor" yapıyordu),
(2) mobil uygulamanın tanınması ve admin /app-users listesi.

İlk iki bölüm veritabanı istemez (sahte q). Üçüncü bölüm geçici Postgres kurar (initdb yoksa atlanır). Gerçek sunucuya bağlanmaz."""
import os

import pytest
from starlette.requests import Request

import accounts

HAS_GEO = os.path.exists(os.path.join(os.path.dirname(accounts.__file__), "data", "dbip-country-lite.mmdb"))
try:
    import maxminddb  # noqa: F401
    HAS_PKG = True
except ImportError:
    HAS_PKG = False
needs_geo = pytest.mark.skipif(not (HAS_GEO and HAS_PKG), reason="maxminddb paketi ya da data/dbip-country-lite.mmdb yok")

WV = "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0 Mobile Safari/537.36"
DESK = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"


def req(headers=None, client="100.64.9.9", path="/api/me"):
    h = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "method": "GET", "path": path, "query_string": b"", "headers": h, "client": (client, 1234)})


# ================================================================ 1. Ziyaret adresi
def test_visit_ip_skips_infrastructure_addresses_on_the_right():
    assert accounts.visit_ip(req({"x-forwarded-for": "195.175.39.39, 100.64.3.7"})) == "195.175.39.39"


def test_visit_ip_skips_infrastructure_addresses_on_the_left():
    assert accounts.visit_ip(req({"x-forwarded-for": "10.1.2.3, 195.175.39.39"})) == "195.175.39.39"


def test_visit_ip_uses_x_real_ip_when_forwarded_for_has_no_public_address():
    assert accounts.visit_ip(req({"x-forwarded-for": "100.64.0.1", "x-real-ip": "195.175.39.39"})) == "195.175.39.39"


def test_visit_ip_understands_ipv6_and_mapped_ipv4():
    assert accounts.visit_ip(req({"x-forwarded-for": "::ffff:195.175.39.39"})) == "195.175.39.39"
    assert accounts.visit_ip(req({"x-forwarded-for": "2a02:ff0:1:2::3"})) == "2a02:ff0:1:2::3"


def test_visit_ip_falls_back_to_the_old_rule_when_nothing_is_public():
    assert accounts.visit_ip(req({"x-forwarded-for": "10.0.0.5, 100.64.0.9"})) == "100.64.0.9"
    assert accounts.visit_ip(req({}, client="127.0.0.1")) == "127.0.0.1"


def test_visit_ip_ignores_garbage_headers():
    assert accounts.visit_ip(req({"x-forwarded-for": "unknown, not-an-ip, 195.175.39.39"})) == "195.175.39.39"


def test_rate_limit_address_is_unchanged():
    """Hız sınırı hâlâ en sağdaki adrese bakar; ziyaret adresi seçimi güvenlik kararına karışmaz."""
    assert accounts.client_ip(req({"x-forwarded-for": "195.175.39.39, 100.64.3.7"})) == "100.64.3.7"


@needs_geo
def test_country_is_found_even_when_the_proxy_chain_ends_with_an_infrastructure_address():
    assert accounts._visit_country(req({"x-forwarded-for": "195.175.39.39, 100.64.3.7", "accept-language": "en-US"})) == "TR"


def test_same_visitor_gets_the_same_daily_id_whatever_the_proxy_appends(monkeypatch):
    seen = []
    monkeypatch.setattr(accounts, "_VISIT_EXEC", type("E", (), {"submit": staticmethod(lambda fn: fn())})())
    monkeypatch.setattr(accounts, "q", lambda sql, params=(), fetch=False: seen.append(params))
    accounts._SEEN.clear(); accounts._SEEN_DAY[0] = ""
    base = {"user-agent": DESK}
    accounts.record_visit(req({**base, "x-forwarded-for": "195.175.39.39, 100.64.1.1"}), "site")
    accounts._SEEN.clear()
    accounts.record_visit(req({**base, "x-forwarded-for": "195.175.39.39, 100.64.2.2"}), "site")
    assert len(seen) == 2 and seen[0][1] == seen[1][1]      # params[1] = vid


# ================================================================ 2. Mobil uygulamayı tanıma
@pytest.mark.parametrize("headers,path,want", [
    ({"origin": "chrome-extension://abc", "user-agent": DESK, "authorization": "Bearer k"}, "/api/me", "ext"),
    ({"origin": "https://localhost", "user-agent": WV}, "/api/me", "app"),
    ({"origin": "capacitor://localhost"}, "/api/me", "app"),
    ({"user-agent": WV, "authorization": "Bearer k"}, "/api/me", "app"),                   # yerel HTTP: Origin yok
    ({"user-agent": WV}, "/api/ext/register", "app"),                                      # kayıt isteğinde anahtar henüz yok
    ({"user-agent": WV}, "/api/ext/login", "app"),
    ({"user-agent": WV}, "/api/me", "web"),                                                # başka uygulamanın içindeki tarayıcı + çerez
    ({"user-agent": WV, "origin": "https://cinevocab.up.railway.app"}, "/api/ext/login", "web"),
    ({"user-agent": DESK, "authorization": "Bearer k"}, "/api/me", "web"),
    ({}, "/api/me", "web"),
])
def test_client_kind(headers, path, want):
    assert accounts.client_kind(req(headers, path=path)) == want


@pytest.fixture
def writes(monkeypatch):
    calls = []
    monkeypatch.setattr(accounts, "q", lambda sql, params=(), fetch=False: calls.append((sql, params)))
    monkeypatch.setattr(accounts, "user_from_token", lambda t: {"id": 7, "username": "u"} if t == "ok" else None)
    return calls


def test_app_request_marks_the_account(writes):
    u = accounts.user_from_request(req({"user-agent": WV, "authorization": "Bearer ok"}))
    assert u["id"] == 7
    assert any("last_app" in c[0] and c[1] == (7,) for c in writes)


@pytest.mark.parametrize("headers", [
    {"user-agent": DESK, "authorization": "Bearer ok"},                                    # bilgisayar
    {"user-agent": DESK, "authorization": "Bearer ok", "origin": "chrome-extension://abc"},  # eklenti
    {"user-agent": WV, "authorization": "Bearer yanlis"},                                  # geçersiz anahtar
])
def test_other_clients_never_mark_the_account(writes, headers):
    accounts.user_from_request(req(headers))
    assert not any("last_app" in c[0] for c in writes)


@pytest.mark.parametrize("headers,path,ext,want", [
    ({"user-agent": WV}, "/api/ext/register", True, "mobil"),        # eskiden "eklenti" yazılıyordu
    ({"origin": "https://localhost"}, "/api/ext/register", True, "mobil"),
    ({"origin": "chrome-extension://abc"}, "/api/ext/register", True, "eklenti"),
    ({"user-agent": DESK}, "/api/ext/register", True, "eklenti"),
    ({"user-agent": DESK}, "/api/register", False, "web"),
])
def test_signup_origin(writes, headers, path, ext, want):
    accounts.note_origin(5, req(headers, path=path), ext)
    assert writes and writes[-1][1] == (want, 5)


# ================================================================ 3. Gerçek Postgres: admin /app-users ve özet
@pytest.fixture
def db(pg):
    accounts.q("DELETE FROM sessions; DELETE FROM users;")
    accounts.q("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_app TIMESTAMP;")
    # çok dilli kelime tablosunu multilang.py kurar; bu testte yalnızca sayım için gereken sütunlar yeter
    accounts.q("CREATE TABLE IF NOT EXISTS user_words_ml (user_id INT NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, word TEXT NOT NULL);")
    return pg


def mk(name, **cols):
    u = accounts.q("INSERT INTO users (username, pw_hash) VALUES (%s, 'x') RETURNING id;", (name,), True)[0][0]
    for k, v in cols.items():
        accounts.q(f"UPDATE users SET {k} = {v} WHERE id = %s;", (u,))
    return u


def call(fn, *a):
    import admin
    admin.need_admin = lambda r: None
    return getattr(admin, fn)(req(), *a)


def test_app_users_lists_only_app_accounts_newest_first_and_counts_online(db):
    mk("web_biri")                                                         # uygulamayı hiç kullanmadı
    mk("simdi", last_app="now()")
    mk("dun", last_app="now() - interval '30 hours'")
    mk("hafta", last_app="now() - interval '3 days'")
    mk("sadece_kayit", signup_via="'mobil'")                               # uygulamadan açtı, sayaç henüz görmedi
    d = call("app_users")
    names = [u["username"] for u in d["users"]]
    assert names[:3] == ["simdi", "dun", "hafta"] and names[-1] == "sadece_kayit" and "web_biri" not in names
    assert d["users"][0]["online"] is True and d["users"][1]["online"] is False
    assert d["totals"] == {"total": 4, "online": 1, "h24": 1, "d7": 3, "seen": 3}
    assert "errors" not in d and d["now"]


def test_app_users_empty_is_not_an_error(db):
    d = call("app_users")
    assert d["users"] == [] and d["totals"]["total"] == 0 and "errors" not in d


def test_stats_shows_app_numbers_and_survives_a_missing_column(db):
    for ddl in ("CREATE TABLE IF NOT EXISTS words (w TEXT)",       # özetin sorduğu, başka modüllerin kurduğu tablolar
                "CREATE TABLE IF NOT EXISTS usage_daily (day DATE, calls INT, anon_calls INT, words INT)",
                "CREATE TABLE IF NOT EXISTS usage_pairs (day DATE, src TEXT, dst TEXT, calls INT)"):
        accounts.q(ddl)
    mk("a", last_app="now()")
    mk("b", last_app="now() - interval '2 days'")
    mk("c")
    s = call("stats")
    assert (s["app_total"], s["app_online"], s["app_24h"]) == (2, 1, 1)
    accounts.q("ALTER TABLE users DROP COLUMN last_app;")
    s = call("stats")
    assert s["app_total"] is None and s["users"] == 3                      # özetin geri kalanı düşmez
    accounts.q("ALTER TABLE users ADD COLUMN last_app TIMESTAMP;")


def test_schema_adds_last_app_idempotently(db):
    accounts.q("ALTER TABLE users DROP COLUMN last_app;")
    cfg = {"dbname": "cv", "user": "cvtest", "password": "", "host": "127.0.0.1", "port": db}
    accounts.init_accounts(cfg)
    accounts.init_accounts(cfg)
    cols = [r[0] for r in accounts.q("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';", (), True)]
    assert "last_app" in cols
