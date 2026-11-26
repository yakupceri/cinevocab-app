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


def test_extension_device_storage_and_google_limited_use_are_stated(txt):
    assert re.search(r"Eklenti şunları cihazında saklar|extension keeps the following on your device", txt)
    assert re.search(r"kendi yazdığın not|your own note", txt)                      # 2.4: not alanı
    assert "Limited Use" in txt and "api-services-user-data-policy" in txt
    assert '\\"' not in txt                                                        # kaçış artığı sayfaya sızmasın


def test_notes_are_said_to_go_to_the_account_only_when_signed_in(txt):
    """2.4.x: giriş yapmış kullanıcının notu hesabına da kaydedilir. Eski "notlar gönderilmez" cümlesi artık yanlış olurdu."""
    assert not re.search(r"cümleler ve notlar gönderilmez|lines and notes are not sent", txt)
    assert re.search(r"Kelime notların|Your word notes", txt)                       # veri listesinde ayrı madde
    assert re.search(r"notlar hesabına kopyalanır|notes on your device are copied to your account", txt)
    assert re.search(r"yeni notlar da hesabına kaydedilir|new notes you write while signed in are saved to your account", txt)
    assert re.search(r"(?i)giriş yapmadıysan notların yalnızca cihazında kalır|If you are not signed in, your notes stay only on your device", txt)
    assert re.search(r"hesabını silince silinir|deleted when you delete your account", txt)


def test_subtitle_sentences_are_still_not_copied_to_the_account(txt):
    assert re.search(r"altyazı cümleleri ve cümlelerin çevirileri gönderilmez|subtitle lines the words came from and their translations are not sent", txt)


def test_accountless_server_storage_is_stated(txt):
    assert re.search(r"ortak çeviri sözlüğüne kimlik bilgisi olmadan|shared translation dictionary with no identity", txt)
    assert re.search(r"küçük resim adresi|thumbnail address", txt)
