"""Gizlilik sayfası: mobil uygulamanın gerçek davranışıyla çelişen iddia kalmasın (fotoğraftan okuma, ML Kit, son kullanım).
Veritabanı gerekmez; /privacy yalnızca metin döndürür."""
import re

import pytest
from starlette.requests import Request

import accounts


def page(lang):
    r = Request({"type": "http", "method": "GET", "path": "/privacy", "query_string": f"lang={lang}".encode(), "headers": []})
    resp = accounts.privacy(r)
    return resp.body.decode() if hasattr(resp, "body") else str(resp)


@pytest.fixture(params=["tr", "en"])
def txt(request):
    return page(request.param)


def android_section(t):
    m = re.search(r"<h2>(?:Android uygulaması|Android app)</h2><p>(.*?)</p>", t, re.S)
    assert m, "Android bölümü bulunamadı"
    return m.group(1)


def test_android_section_no_longer_claims_it_never_uses_photos(txt):
    a = android_section(txt)
    assert not re.search(r"fotoğraflarını ya da mikrofonunu kullanmaz|your location, contacts, photos or microphone", a)
    assert "ML Kit" in a                                   # görselden okuma ve Google'a giden tanılama ölçümleri açıkça yazılı
    assert re.search(r"gönderilmez ve saklanmaz|not sent to or stored on our server", a)   # görselin kendisi sunucuya gitmez


def test_android_section_does_not_claim_there_is_no_tracking_at_all(txt):
    assert not re.search(r"izleme \(analitik\) aracı içermez|contains no advertising or tracking \(analytics\) tools", android_section(txt))


def test_last_app_use_is_listed_among_stored_account_data(txt):
    assert re.search(r"en son ne zaman kullandığın|when you last used the mobile app", txt)


def test_contact_placeholder_is_filled(txt):
    assert "__CONTACT__" not in txt
