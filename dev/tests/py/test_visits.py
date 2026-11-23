"""Ziyaretçi sayacı: IP'den ülke, "hesaplı mı" bilgisi ve admin /traffic sayıları.

Birinci bölüm veritabanı istemez (sahte q ve sahte yürütücü). İkinci bölüm, bilgisayarda Postgres araçları (initdb, pg_ctl)
varsa geçici bir veritabanı kurup gerçek SQL'i çalıştırır; yoksa atlanır. Gerçek sunucuya hiç bağlanmaz.
maxminddb paketi yoksa IP testleri atlanır."""
import os

import pytest
from starlette.requests import Request

import accounts

HAS_GEO = os.path.exists(os.path.join(os.path.dirname(accounts.__file__), "data", "dbip-country-lite.mmdb"))
try:
    import maxminddb  # noqa: F401
    HAS_MMDB_PKG = True
except ImportError:
    HAS_MMDB_PKG = False
needs_geo = pytest.mark.skipif(not (HAS_GEO and HAS_MMDB_PKG), reason="maxminddb paketi ya da data/dbip-country-lite.mmdb yok")


def req(headers=None, client="9.9.9.9", cookies=None):
    h = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    if cookies:
        h.append((b"cookie", "; ".join(f"{k}={v}" for k, v in cookies.items()).encode()))
    return Request({"type": "http", "method": "GET", "path": "/", "query_string": b"", "headers": h, "client": (client, 1234)})


# ================================================================ 1. Ülke
@needs_geo
@pytest.mark.parametrize("ip,want", [("8.8.8.8", "US"), ("195.175.39.39", "TR"), ("88.255.0.1", "TR"), ("81.2.69.142", "GB")])
def test_ip_country_known_addresses(ip, want):
    assert accounts._ip_country(ip) == want


@needs_geo
@pytest.mark.parametrize("ip", ["10.0.0.1", "127.0.0.1", "192.168.1.5", "?", "", "bu-ip-degil", "999.1.1.1"])
def test_ip_country_unknown_or_bad_input_is_empty_not_an_error(ip):
    assert accounts._ip_country(ip) == ""


@needs_geo
def test_country_prefers_the_ip_over_the_browser_language():
    # İngilizce tarayıcı kullanan Türk: eskiden "US" görünürdü
    r = req({"x-forwarded-for": "195.175.39.39", "accept-language": "en-US,en;q=0.9"})
    assert accounts._visit_country(r) == "TR"


@needs_geo
def test_country_from_ip_even_when_language_has_no_region():
    # Yalnızca "tr" yazan tarayıcı eskiden "bilinmiyor" (dil:tr) çıkıyordu
    r = req({"x-forwarded-for": "88.255.0.1", "accept-language": "tr"})
    assert accounts._visit_country(r) == "TR"


def test_country_cloudflare_header_still_wins():
    r = req({"cf-ipcountry": "DE", "x-forwarded-for": "195.175.39.39", "accept-language": "tr"})
    assert accounts._visit_country(r) == "DE"


@pytest.mark.parametrize("al,want", [("tr", "dil:tr"), ("en-US,en;q=0.9", "US"), ("zh-Hant-TW", "TW"), ("", "?")])
def test_country_falls_back_to_language_when_ip_cannot_be_resolved(al, want):
    r = req({"x-forwarded-for": "10.0.0.7", "accept-language": al})   # özel adres: veritabanı bilmez
    assert accounts._visit_country(r) == want


def test_country_works_without_the_database_file(monkeypatch):
    monkeypatch.setattr(accounts, "_GEO", False)     # veritabanı yok / paket yok gibi
    r = req({"x-forwarded-for": "195.175.39.39", "accept-language": "tr-TR"})
    assert accounts._visit_country(r) == "TR"        # dilden


# ================================================================ 2. record_visit (sahte q ve yürütücü)
class SyncExec:
    def submit(self, fn):
        fn()


@pytest.fixture
def visits(monkeypatch):
    calls = []
    monkeypatch.setattr(accounts, "_VISIT_EXEC", SyncExec())
    monkeypatch.setattr(accounts, "q", lambda sql, params=(), fetch=False: calls.append((sql, params)))
    monkeypatch.setattr(accounts, "user_from_token", lambda t: {"id": 1} if t == "gecerli" else None)
    accounts._SEEN.clear()
    accounts._SEEN_DAY[0] = ""
    return calls


UA = {"user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120", "x-forwarded-for": "195.175.39.39", "accept-language": "tr"}
acct_of = lambda calls: [c[1][-1] for c in calls]   # params'ın son elemanı = acct


def test_visit_without_token_is_recorded_as_not_signed_in(visits):
    accounts.record_visit(req(UA), "ext")
    assert acct_of(visits) == [False]


def test_visit_with_valid_bearer_key_is_signed_in(visits):
    accounts.record_visit(req({**UA, "authorization": "Bearer gecerli"}), "ext")
    assert acct_of(visits) == [True]


def test_visit_with_valid_cookie_is_signed_in(visits):
    accounts.record_visit(req(UA, cookies={"cv": "gecerli"}), "site")
    assert acct_of(visits) == [True]


def test_visit_with_expired_or_wrong_token_is_not_signed_in(visits):
    accounts.record_visit(req({**UA, "authorization": "Bearer suresi-dolmus"}), "ext")
    assert acct_of(visits) == [False]


def test_same_visitor_is_written_once_per_day(visits):
    for _ in range(5):
        accounts.record_visit(req(UA), "ext")
    assert len(visits) == 1


def test_visitor_who_signs_in_later_the_same_day_is_written_again(visits):
    accounts.record_visit(req(UA), "ext")
    accounts.record_visit(req({**UA, "authorization": "Bearer gecerli"}), "ext")
    accounts.record_visit(req({**UA, "authorization": "Bearer gecerli"}), "ext")   # üçüncüsü yazılmaz
    assert acct_of(visits) == [False, True]


def test_bots_and_missing_user_agent_are_not_counted(visits):
    accounts.record_visit(req({**UA, "user-agent": "Googlebot/2.1"}), "site")
    accounts.record_visit(req({"x-forwarded-for": "1.2.3.4"}), "site")
    assert visits == []


def test_insert_never_downgrades_a_signed_in_row_and_stores_no_ip(visits):
    accounts.record_visit(req(UA), "ext")
    sql, params = visits[0]
    assert "DO UPDATE SET acct = coalesce(visits_daily.acct, false) OR EXCLUDED.acct" in sql
    assert "195.175.39.39" not in repr(params) and "Bearer" not in repr(params) and "gecerli" not in repr(params)


# ================================================================ 3. Gerçek Postgres (geçici), admin /traffic
@pytest.fixture
def db(pg, monkeypatch):
    accounts.q("DELETE FROM visits_daily; DELETE FROM sessions; DELETE FROM users;")
    accounts.q("ALTER TABLE visits_daily ADD COLUMN IF NOT EXISTS acct BOOLEAN;")
    monkeypatch.setattr(accounts, "_VISIT_EXEC", SyncExec())
    accounts._SEEN.clear()
    accounts._SEEN_DAY[0] = ""
    return pg


TODAY = "(now() AT TIME ZONE 'Europe/Istanbul')::date"


def put_row(kind, vid, country="TR", acct=None, ago=0):
    accounts.q(f"INSERT INTO visits_daily (day, kind, vid, country, acct) VALUES ({TODAY} - %s, %s, %s, %s, %s);", (ago, kind, vid, country, acct))


def traffic(days=7):
    import admin
    admin.need_admin = lambda r: None
    return admin.traffic(req(), days)


def test_schema_migration_is_idempotent(db):
    accounts.init_accounts({"dbname": "cv", "user": "cvtest", "password": "", "host": "127.0.0.1", "port": db})   # ikinci kez
    cols = [r[0] for r in accounts.q("SELECT column_name FROM information_schema.columns WHERE table_name = 'visits_daily';", (), True)]
    assert "acct" in cols


def test_real_insert_and_upgrade_never_downgrades(db):
    u = accounts.q("INSERT INTO users (username, pw_hash) VALUES ('t1', 'x') RETURNING id;", (), True)[0][0]
    accounts.q("INSERT INTO sessions (token_hash, user_id) VALUES (%s, %s);", (accounts._sha("gercek-anahtar"), u))
    anon = req(UA)
    signed = req({**UA, "authorization": "Bearer gercek-anahtar"})
    accounts.record_visit(anon, "ext")
    state = lambda: accounts.q("SELECT acct, count(*) OVER () FROM visits_daily WHERE kind = 'ext';", (), True)
    assert state() == [(False, 1)]
    accounts.record_visit(signed, "ext")             # aynı kişi, aynı gün oturum açtı -> hesaplıya yükselir
    assert state() == [(True, 1)]
    accounts._SEEN.clear()
    accounts.record_visit(anon, "ext")               # sonra yine anahtarsız istek: geri düşmez
    assert state() == [(True, 1)]


def test_admin_traffic_splits_accounted_anonymous_and_unknown(db):
    for i in range(3): put_row("ext", f"a{i}", acct=False)
    for i in range(2): put_row("ext", f"b{i}", acct=True)
    for i in range(4): put_row("ext", f"c{i}", acct=None)             # sütunun eklenmesinden önceki kayıtlar
    for i in range(2): put_row("ext", f"y{i}", acct=None, ago=1)      # dün: hiç bilinen kayıt yok
    for i in range(5): put_row("site", f"s{i}", acct=False)           # site girişleri bu ayrıma girmez
    t = traffic(7)
    assert t["totals"]["ext"] == 11 and t["totals"]["site"] == 5
    assert (t["totals"]["ext_anon"], t["totals"]["ext_acct"], t["totals"]["ext_unknown"]) == (3, 2, 6)
    assert t["totals"]["ext_anon"] + t["totals"]["ext_acct"] + t["totals"]["ext_unknown"] == t["totals"]["ext"]
    last, prev = t["daily"][-1], t["daily"][-2]
    assert (last["ext"], last["ext_anon"]) == (9, 3)
    assert (prev["ext"], prev["ext_anon"]) == (2, None)               # eski gün: bilinmiyor, 0 değil
    assert "errors" not in t
    assert traffic(1)["totals"]["ext_anon"] == 3                      # "Bugün" aralığı yalnız bugünü sayar


def test_admin_traffic_old_numbers_survive_when_the_column_is_missing(db):
    put_row("ext", "x1", acct=False)
    put_row("site", "x2")
    accounts.q("ALTER TABLE visits_daily DROP COLUMN acct;")
    t = traffic(7)
    assert t["totals"]["site"] == 1 and t["totals"]["ext"] == 1       # eski sayılar bozulmaz
    assert "ext_anon" not in t["totals"]                              # panel istek sayısına düşer
    assert all("ext_anon" not in d for d in t["daily"])
    assert "errors" not in t


def test_admin_traffic_returns_up_to_40_countries_unknowns_included(db):
    codes = [a + b for a in "ABCDEFGH" for b in "KLMNO"]              # 40 ülke kodu
    for i, c in enumerate(codes):
        for j in range(i + 1):
            put_row("site", f"{c}{j}", country=c)
    for j in range(3): put_row("site", f"u{j}", country="dil:tr")
    for j in range(2): put_row("site", f"q{j}", country="?")
    rows = traffic(7)["countries"]
    assert len(rows) == 40
    assert rows[0]["country"] == codes[-1]                            # en kalabalık ilk sırada
    totals = [r["site"] + r["ext"] + r["clicks"] for r in rows]
    assert totals == sorted(totals, reverse=True)
    assert "dil:tr" in {r["country"] for r in rows}                   # 3 ziyaretle ilk 40 içinde: bilinmeyenler de gelir
