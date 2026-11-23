"""Kısa bağlantılar: /get (mağaza) ve /video (tanıtım videosu) sayacı ve admin "kaynaklar" tablosu.

Gerçek HTTP istekleri (TestClient) geçici bir Postgres'e yazar; video adresi VIDEO_URL ortam değişkeninden gelir.
Postgres araçları (initdb, pg_ctl) yoksa atlanır. Gerçek sunucuya hiç bağlanmaz."""
import os

import pytest
from fastapi.testclient import TestClient

import accounts
from test_visits import req

# main.py göreli klasör yolları kullanır (static, templates): içe aktarırken çalışma klasörü proje kökü olmalı.
# İçe aktarma dosya yüklenirken yapılır: main kendi varsayılan veritabanı ayarını yazar; geçici veritabanı fixture'ı bundan SONRA kurulur.
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
_cwd = os.getcwd()
os.chdir(_ROOT)
try:
    import main
finally:
    os.chdir(_cwd)

STORE = main.STORE_URL
YT = "https://www.youtube.com/watch?v=ornek123"
PHONE = {"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1", "accept-language": "es-ES,es;q=0.9"}
PC = {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36", "accept-language": "tr-TR,tr;q=0.9"}
TODAY = "(now() AT TIME ZONE 'Europe/Istanbul')::date"


@pytest.fixture
def client(pg, monkeypatch):
    accounts.q("DELETE FROM link_clicks; DELETE FROM link_hits;")
    monkeypatch.delenv("VIDEO_URL", raising=False)
    return TestClient(main.app, follow_redirects=False)


def clicks():
    return {s: n for s, n in accounts.q("SELECT src, sum(n)::int FROM link_clicks GROUP BY src;", (), True)}


def hits():
    return accounts.q("SELECT src, device, os, country FROM link_hits ORDER BY at, src;", (), True)


# ================================================================ /get (eskisi gibi çalışmalı)
def test_get_counts_the_click_and_redirects_to_the_store(client):
    r = client.get("/get", params={"src": "quora-es"}, headers=PC)
    assert r.status_code == 302 and r.headers["location"] == STORE
    assert r.headers["cache-control"] == "no-store"
    assert clicks() == {"quora-es": 1}
    assert hits() == [("quora-es", "bilgisayar", "Windows", "TR")]


def test_get_keeps_the_store_language_and_install_is_an_alias(client):
    r = client.get("/install", params={"src": "yt-tr", "hl": "tr"}, headers=PC)
    assert r.headers["location"] == STORE + "?hl=tr"
    assert clicks() == {"yt-tr": 1}


@pytest.mark.parametrize("raw,want", [("Quora_ES!!", "quora_es"), ("", "direct"), ("a" * 40, "a" * 24), ("  Reddit  ", "reddit"), ("türkçe", "trke")])
def test_get_cleans_the_tag(client, raw, want):
    client.get("/get", params={"src": raw}, headers=PC)
    assert list(clicks()) == [want]


def test_get_cannot_fake_the_video_prefix(client):
    client.get("/get", params={"src": "v:quora-es"}, headers=PC)   # ":" atılır, "v:" öneki taklit edilemez
    assert list(clicks()) == ["vquora-es"]


# ================================================================ /video
def test_video_counts_with_the_v_prefix_and_redirects_to_VIDEO_URL(client, monkeypatch):
    monkeypatch.setenv("VIDEO_URL", YT)
    r = client.get("/video", params={"src": "quora-es"}, headers=PHONE)
    assert r.status_code == 302 and r.headers["location"] == YT
    assert r.headers["cache-control"] == "no-store"
    assert clicks() == {"v:quora-es": 1}
    assert hits() == [("v:quora-es", "telefon", "iOS", "ES")]       # cihaz ve ülke /get ile aynı mantık


def test_video_goes_to_the_home_page_when_VIDEO_URL_is_missing_but_still_counts(client):
    r = client.get("/video", params={"src": "yt-en"}, headers=PC)
    assert r.status_code == 302 and r.headers["location"] == "/"
    assert clicks() == {"v:yt-en": 1}


@pytest.mark.parametrize("bad", ["http://example.com/v", "javascript:alert(1)", "//evil.example/x", "youtube.com/watch?v=1", "https://a b", "ftp://x/y", "   ", "https://"])
def test_video_ignores_an_unsafe_or_malformed_VIDEO_URL(client, monkeypatch, bad):
    monkeypatch.setenv("VIDEO_URL", bad)
    assert client.get("/video", params={"src": "x"}, headers=PC).headers["location"] == "/"


def test_video_url_is_not_hardcoded_in_the_code():
    import inspect
    src = inspect.getsource(main.video_redirect)
    assert "youtube" not in src.lower() and "youtu.be" not in src.lower()
    assert "VIDEO_URL" in src


def test_video_without_a_tag_and_with_a_long_tag(client, monkeypatch):
    monkeypatch.setenv("VIDEO_URL", YT)
    client.get("/video", headers=PC)
    client.get("/video", params={"src": "B" * 40 + "!"}, headers=PC)
    assert set(clicks()) == {"v:direct", "v:" + "b" * 24}


@pytest.mark.parametrize("ua", ["Googlebot/2.1 (+http://www.google.com/bot.html)", "curl/8.4.0", "python-requests/2.31", "facebookexternalhit/1.1", "WhatsApp/2.23", "Slackbot-LinkExpanding 1.0", "Mozilla/5.0 (compatible; Discordbot/2.0)"])
def test_bots_are_not_counted_but_are_still_redirected(client, monkeypatch, ua):
    monkeypatch.setenv("VIDEO_URL", YT)
    assert client.get("/video", params={"src": "x"}, headers={"user-agent": ua}).headers["location"] == YT
    assert client.get("/get", params={"src": "x"}, headers={"user-agent": ua}).headers["location"] == STORE
    assert clicks() == {} and hits() == []


def test_get_and_video_with_the_same_tag_are_counted_separately(client, monkeypatch):
    monkeypatch.setenv("VIDEO_URL", YT)
    client.get("/get", params={"src": "quora-es"}, headers=PC)
    client.get("/video", params={"src": "quora-es"}, headers=PC)
    client.get("/video", params={"src": "quora-es"}, headers=PHONE)
    assert clicks() == {"quora-es": 1, "v:quora-es": 2}


def test_every_click_counts_and_the_day_is_the_istanbul_day(client, monkeypatch):
    monkeypatch.setenv("VIDEO_URL", YT)
    for _ in range(3):
        client.get("/video", params={"src": "k"}, headers=PC)
    assert clicks() == {"v:k": 3} and len(hits()) == 3
    assert accounts.q(f"SELECT count(*) FROM link_clicks WHERE day = {TODAY};", (), True)[0][0] == 1   # tek satır, bugünün (İstanbul) tarihi


def test_a_database_error_never_breaks_the_redirect(client, monkeypatch):
    monkeypatch.setenv("VIDEO_URL", YT)
    def boom(*a, **k):
        raise RuntimeError("veritabanı yok")
    monkeypatch.setattr(main, "q", boom)
    assert client.get("/video", params={"src": "x"}, headers=PC).headers["location"] == YT
    assert client.get("/get", params={"src": "x"}, headers=PC).headers["location"] == STORE


# ================================================================ Admin: eklenti ve video tıklamaları ayrı
def traffic(days=7):
    import admin
    admin.need_admin = lambda r: None
    return admin.traffic(req(), days)


@pytest.fixture
def seeded(client, monkeypatch):
    monkeypatch.setenv("VIDEO_URL", YT)
    for _ in range(2): client.get("/get", params={"src": "yt-en"}, headers=PHONE)
    client.get("/get", params={"src": "yt-en"}, headers=PC)
    client.get("/get", params={"src": "reddit"}, headers=PC)
    for _ in range(2): client.get("/video", params={"src": "quora-es"}, headers=PHONE)
    client.get("/video", params={"src": "yt-tr"}, headers=PC)
    return client


def test_admin_totals_and_daily_keep_store_clicks_and_video_clicks_apart(seeded):
    t = traffic(7)
    assert (t["totals"]["clicks"], t["totals"]["video"]) == (4, 3)
    assert (t["daily"][-1]["clicks"], t["daily"][-1]["video"]) == (4, 3)
    assert all(d["clicks"] == 0 and d["video"] == 0 for d in t["daily"][:-1])
    assert "errors" not in t
    assert (traffic(1)["totals"]["clicks"], traffic(1)["totals"]["video"]) == (4, 3)


def test_admin_sources_list_extension_and_video_separately(seeded):
    rows = traffic(7)["sources"]
    ext = {r["src"]: r for r in rows if r["kind"] == "ext"}
    vid = {r["src"]: r for r in rows if r["kind"] == "video"}
    assert {k: v["n"] for k, v in ext.items()} == {"yt-en": 3, "reddit": 1}
    assert {k: v["n"] for k, v in vid.items()} == {"quora-es": 2, "yt-tr": 1}       # "v:" öneki gösterilen etikette yok
    assert (ext["yt-en"]["telefon"], ext["yt-en"]["bilgisayar"]) == (2, 1)
    assert (vid["quora-es"]["telefon"], vid["quora-es"]["bilgisayar"]) == (2, 0)     # cihaz kırılımı video satırında da çalışır
    assert not any(r["src"].startswith("v:") for r in rows)


def test_admin_device_country_and_hour_numbers_stay_about_store_clicks(seeded):
    t = traffic(7)
    assert sum(t["devices"]["clicks"].values()) == 4
    assert sum(t["hours"]["clicks"]) == 4
    cty = {c["country"]: c["clicks"] for c in t["countries"]}
    assert cty == {"ES": 2, "TR": 2}       # yt-en iki telefon (ES) + bir bilgisayar (TR) + reddit (TR) = 4; video tıklamaları ülke sayısına girmez


def test_admin_recent_table_labels_video_clicks(seeded):
    rec = traffic(7)["recent"]
    kinds = [r["kind"] for r in rec]
    assert kinds.count("tıklama") == 4 and kinds.count("video") == 3
    assert {r["what"] for r in rec if r["kind"] == "video"} == {"quora-es", "yt-tr"}


def test_admin_funnel_click_step_counts_store_clicks_only(seeded):
    import admin
    admin.need_admin = lambda r: None
    f = admin.funnel(req(), 30)
    assert f["clicks"] == 4


def test_admin_with_only_video_clicks_shows_zero_store_clicks(client, monkeypatch):
    monkeypatch.setenv("VIDEO_URL", YT)
    for _ in range(5): client.get("/video", params={"src": "x"}, headers=PC)
    t = traffic(7)
    assert (t["totals"]["clicks"], t["totals"]["video"]) == (0, 5)
    assert [r["kind"] for r in t["sources"]] == ["video"]
