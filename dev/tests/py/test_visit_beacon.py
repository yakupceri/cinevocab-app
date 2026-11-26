"""Site ziyareti yalnızca sayfadaki betik haber verince sayılır (/api/visit). Düz sayfa isteği, başka siteden gelen ya da
tarayıcı başlıkları olmayan istek sayılmaz. Veritabanı gerekmez (sahte q); son bölüm geçici Postgres ister."""
import pytest
from starlette.requests import Request

import accounts

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
HOST = "cinevocab.up.railway.app"


def req(headers=None, path="/api/visit"):
    base = {"user-agent": UA, "host": HOST, "x-forwarded-for": "195.175.39.39", "sec-fetch-site": "same-origin"}
    base.update(headers or {})
    h = [(k.lower().encode(), v.encode()) for k, v in base.items() if v is not None]
    return Request({"type": "http", "method": "POST", "path": path, "query_string": b"", "headers": h, "client": ("100.64.1.1", 1)})


class SyncExec:
    def submit(self, fn):
        fn()


@pytest.fixture
def writes(monkeypatch):
    calls = []
    monkeypatch.setattr(accounts, "_VISIT_EXEC", SyncExec())
    monkeypatch.setattr(accounts, "q", lambda sql, params=(), fetch=False: calls.append(params) if "visits_daily" in sql else None)
    monkeypatch.setattr(accounts, "user_from_token", lambda t: None)
    monkeypatch.setattr(accounts, "_throttle_ip", lambda *a, **k: None)
    accounts._SEEN.clear(); accounts._SEEN_DAY[0] = ""
    return calls


def send(headers=None, **body):
    r = accounts.visit(accounts.VisitReq(**{"p": "/", **body}), req(headers))
    assert r.status_code == 204                       # sayılsın sayılmasın aynı yanıt
    return r


# params: (kind, vid, country, device, os, ref, act, acct)
def test_real_browser_beacon_is_counted_once_with_source_and_no_interaction(writes):
    send(r="https://www.producthunt.com/posts/cinevocab?x=1")
    assert len(writes) == 1
    kind, _vid, _country, device, os_, ref, act, acct = writes[0]
    assert (kind, device, os_, ref, act, acct) == ("site", "bilgisayar", "macOS", "producthunt.com", False, False)
    send(r="https://www.producthunt.com/")            # aynı kişi, aynı gün: tekrar yazılmaz
    assert len(writes) == 1


def test_link_tag_wins_over_referrer_and_own_site_is_not_a_source(writes):
    send(s="YT-Short_TR!!", r="https://google.com/")
    assert writes[-1][5] == "yt-short_tr"
    accounts._SEEN.clear()
    send(r=f"https://{HOST}/match")
    assert writes[-1][5] == ""


def test_interaction_upgrades_the_same_visit(writes):
    send()
    send(a=True)
    assert [w[6] for w in writes] == [False, True] and writes[0][1] == writes[1][1]      # aynı günlük iz, ikinci yazma "dokundu"
    send(a=True)
    assert len(writes) == 2


@pytest.mark.parametrize("headers", [
    {"sec-fetch-site": "cross-site"},                                   # başka siteden
    {"sec-fetch-site": "none"},                                         # adres çubuğundan / betikle doğrudan
    {"sec-fetch-site": None},                                           # tarayıcı başlığı yok, Origin de yok (curl, basit bot)
    {"sec-fetch-site": None, "origin": "https://evil.example"},
    {"user-agent": "python-requests/2.32"},
    {"user-agent": "Mozilla/5.0 HeadlessChrome/131.0"},
])
def test_requests_that_are_not_our_page_script_are_not_counted(writes, headers):
    send(headers)
    assert writes == []


def test_old_browser_without_fetch_metadata_is_accepted_by_origin(writes):
    send({"sec-fetch-site": None, "origin": f"https://{HOST}"})
    assert len(writes) == 1


@pytest.mark.parametrize("path", ["/admin", "/api/me", "/privacy", "evil", ""])
def test_excluded_or_malformed_paths_are_not_counted(writes, path):
    send(p=path)
    assert writes == []


def test_plain_page_request_no_longer_counts_a_visit():
    src = open(accounts.__file__.replace("accounts.py", "main.py"), encoding="utf-8").read()
    assert 'record_visit(request, "site")' not in src
    assert 'record_visit(request, "ext")' in src                         # eklenti kullanımı sayacı yerinde


def test_extension_visits_keep_working_and_leave_interaction_unknown(writes):
    accounts.record_visit(req(path="/translate-words"), "ext")
    assert writes[0][0] == "ext" and writes[0][6] is None


# ---------------------------------------------------------------- gerçek Postgres
@pytest.fixture
def db(pg, monkeypatch):
    accounts.q("DELETE FROM visits_daily;")
    monkeypatch.setattr(accounts, "_VISIT_EXEC", SyncExec())
    monkeypatch.setattr(accounts, "_throttle_ip", lambda *a, **k: None)
    accounts._SEEN.clear(); accounts._SEEN_DAY[0] = ""
    return pg


def test_real_rows_upgrade_never_downgrade_and_admin_counts_them(db):
    cfg = {"dbname": "cv", "user": "cvtest", "password": "", "host": "127.0.0.1", "port": db}
    accounts.init_accounts(cfg)                                          # act sütunu göçle gelir, ikinci çalıştırma zararsız
    send(a=True)
    accounts._SEEN.clear()
    send()                                                               # sonradan "dokunmadı" isteği: geri düşmez
    assert accounts.q("SELECT act, count(*) OVER () FROM visits_daily WHERE kind = 'site';", (), True) == [(True, 1)]
    send({"x-forwarded-for": "8.8.8.8"})                                 # başka kişi, dokunmadı
    accounts.q("INSERT INTO visits_daily (day, kind, vid, country) VALUES ((now() AT TIME ZONE 'Europe/Istanbul')::date, 'site', 'eski', 'TR');")  # eski yöntem kaydı
    import admin
    admin.need_admin = lambda r: None
    t = admin.traffic(req(), 7)["totals"]
    assert (t["site"], t["site_act"], t["site_act_known"]) == (3, 1, 2)
