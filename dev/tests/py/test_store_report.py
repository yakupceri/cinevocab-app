"""Admin paneline gömülen mağaza raporu: yalnız Google'ın gömme adresi kabul edilir. Veritabanı gerekmez."""
import pytest

import admin

ID = "00000000-0000-0000-0000-000000000000"
GOOD = f"https://datastudio.google.com/embed/reporting/{ID}/page/AbC12"


def test_accepts_google_embed_addresses():
    assert admin.store_report_url(GOOD) == GOOD
    assert admin.store_report_url("  " + GOOD + "\n") == GOOD
    other = f"https://lookerstudio.google.com/embed/reporting/{ID}"
    assert admin.store_report_url(other) == other


def test_drops_the_empty_port_google_writes_into_the_copy_box():
    assert admin.store_report_url(GOOD.replace(".com/", ".com:/")) == GOOD


def test_rebuilds_the_address_without_extras():
    assert admin.store_report_url(GOOD + "?x=1#y") == GOOD
    assert admin.store_report_url(GOOD.replace("https://", "https://someone@")) == GOOD


@pytest.mark.parametrize("bad", [
    "", None, "javascript:alert(1)", GOOD.replace("https:", "http:"),
    GOOD.replace("datastudio.google.com", "evil.example"),
    GOOD.replace("datastudio.google.com", "datastudio.google.com.evil.example"),
    GOOD.replace("datastudio.google.com", "datastudio.google.com@evil.example"),
    GOOD.replace("/embed/", "/"), "https://datastudio.google.com/embed/reporting/",
    "https://[bozuk", f'<iframe src="{GOOD}"></iframe>',
])
def test_rejects_everything_else(bad):
    assert admin.store_report_url(bad) == ""


@pytest.mark.parametrize("raw,url,flag", [("", "", False), (GOOD, GOOD, False), ("https://evil.example/x", "", True)])
def test_traffic_reports_the_address_to_the_panel(monkeypatch, raw, url, flag):
    def no_db(*a, **k):
        raise RuntimeError("veritabani yok")
    monkeypatch.setattr(admin, "need_admin", lambda r: None)
    monkeypatch.setattr(admin, "q", no_db)  # sayılar okunamasa da adres gelir
    monkeypatch.setenv("STORE_REPORT_URL", raw)
    out = admin.traffic(None, 7)
    assert (out["store_report"], out["store_report_bad"]) == (url, flag)
