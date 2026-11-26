"""Kelime notları (word_notes): giriş yapmış kullanıcının notu hesabına kaydedilir, okunur, güncellenir, silinir.
Geçici Postgres kurar (initdb yoksa atlanır); gerçek sunucuya bağlanmaz. Hesapsız kullanıcı bu uçlara hiç ulaşmaz (eklenti anahtar yokken istek atmaz)."""
import os
import re

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request

import accounts
import admin
import extauth
import vocab

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


@pytest.fixture(scope="module")
def env(pg):
    vocab.init()
    extauth.init()
    app = FastAPI()
    app.include_router(vocab.router)
    return TestClient(app)


@pytest.fixture(autouse=True)
def fresh_limits():
    accounts._HITS.clear()
    yield
    accounts._HITS.clear()


_n = [0]


def user():
    """Yeni kullanıcı + oturum anahtarı: (kimlik, Authorization başlığı)."""
    _n[0] += 1
    uid = accounts.create_user(f"notes_u{_n[0]}", "secret1")
    return uid, {"Authorization": "Bearer " + accounts._new_session(uid)}


def put(c, h, word="amor", note="mi nota", src="es", dst="en"):
    return c.post("/api/note", json={"src": src, "dst": dst, "word": word, "note": note}, headers=h)


def notes(c, h, src="es", dst="en"):
    r = c.get(f"/api/notes?src={src}&dst={dst}", headers=h)
    assert r.status_code == 200
    return r.json()["notes"]


def rows(uid):
    return accounts.q("SELECT src, dst, word, note FROM word_notes WHERE user_id = %s ORDER BY src, dst, word;", (uid,), True)


def test_clean_note_rule_matches_the_extension_rule():
    """Aynı kural iki yerde: eklentideki bank.js cleanNote ve burada vocab.clean_note (kırpma, boşluk tekilleştirme, 140)."""
    assert vocab.clean_note("  a   b \n c ") == "a b c"
    assert vocab.clean_note(None) == "" and vocab.clean_note("   ") == ""
    assert len(vocab.clean_note("x" * 300)) == 140 == vocab.NOTE_MAX
    assert vocab.clean_note("\u00a0\u3000boşluk\u00a0") == "boşluk"
    js = open(os.path.join(ROOT, "extension", "bank.js"), encoding="utf-8").read()
    assert f"NOTE_MAX = {vocab.NOTE_MAX}" in js                     # iki sınır birlikte değişsin


# ---------------------------------------------------------------- giriş şart
def test_all_note_endpoints_need_a_signed_in_user(env):
    c = env
    assert c.post("/api/note", json={"src": "es", "dst": "en", "word": "amor", "note": "x"}).status_code == 401
    assert c.get("/api/notes?src=es&dst=en").status_code == 401
    assert c.post("/api/notes/import", json={"src": "es", "dst": "en", "notes": {"amor": "x"}}).status_code == 401
    assert c.post("/api/note", json={"src": "es", "dst": "en", "word": "amor", "note": "x"}, headers={"Authorization": "Bearer yanlis"}).status_code == 401
    assert accounts.q("SELECT count(*) FROM word_notes WHERE note = 'x';", (), True)[0][0] == 0


# ---------------------------------------------------------------- yaz, oku, güncelle, sil
def test_write_read_update_and_delete_a_note(env):
    c = env
    uid, h = user()
    assert notes(c, h) == {}
    r = put(c, h, "amor", "dizide çok geçiyor")
    assert r.status_code == 200 and r.json() == {"ok": True, "note": "dizide çok geçiyor"}
    assert notes(c, h) == {"amor": "dizide çok geçiyor"}
    put(c, h, "amor", "yeni not")                                   # güncelleme: aynı satır, yeni metin
    assert notes(c, h) == {"amor": "yeni not"} and len(rows(uid)) == 1
    put(c, h, "vida", "ikinci")
    assert notes(c, h) == {"amor": "yeni not", "vida": "ikinci"}
    r = put(c, h, "amor", "")                                       # boş not satırı siler
    assert r.status_code == 200 and r.json() == {"ok": True, "note": ""}
    assert notes(c, h) == {"vida": "ikinci"}
    put(c, h, "vida", "   \n\t  ")                                  # yalnızca boşluk da siler
    assert notes(c, h) == {} and rows(uid) == []


def test_deleting_a_note_that_does_not_exist_is_harmless(env):
    c = env
    _, h = user()
    assert put(c, h, "yok", "").status_code == 200


def test_note_is_trimmed_collapsed_and_cut_at_140_characters(env):
    c = env
    uid, h = user()
    assert put(c, h, "amor", "  dizide    çok \n geçiyor  ").json()["note"] == "dizide çok geçiyor"
    r = put(c, h, "vida", "x" * 300)
    assert len(r.json()["note"]) == 140 and notes(c, h)["vida"] == "x" * 140
    r = put(c, h, "mundo", ("ab " * 100))                           # boşluklar tekilleşince de 140'ı geçemez
    assert len(r.json()["note"]) <= 140
    assert max(len(n) for _, _, _, n in rows(uid)) <= 140


def test_the_word_is_lowercased_like_the_word_lists(env):
    c = env
    _, h = user()
    put(c, h, "  AMOR ", "büyük harfle geldi")
    assert notes(c, h) == {"amor": "büyük harfle geldi"}
    put(c, h, "İNCİ", "türkçe", src="tr", dst="en")                 # Türkçe: İ -> i, I -> ı
    assert "inci" in notes(c, h, "tr", "en")


# ---------------------------------------------------------------- geçersiz girdi
@pytest.mark.parametrize("src,dst", [("es", "es"), ("xx", "en"), ("es", "yy"), ("", "en"), ("ES", "en")])
def test_invalid_language_pair_is_rejected(env, src, dst):
    c = env
    uid, h = user()
    assert put(c, h, "amor", "x", src, dst).status_code == 400
    assert c.get(f"/api/notes?src={src}&dst={dst}", headers=h).status_code == 400
    assert rows(uid) == []


@pytest.mark.parametrize("word", ["", "   ", "a" * 61, "x" * 500])
def test_invalid_word_is_rejected(env, word):
    c = env
    uid, h = user()
    assert put(c, h, word, "x").status_code == 400
    assert rows(uid) == []


def test_a_word_of_exactly_60_characters_is_accepted(env):
    c = env
    _, h = user()
    assert put(c, h, "a" * 60, "x").status_code == 200


def test_missing_fields_are_a_validation_error_not_a_crash(env):
    c = env
    _, h = user()
    assert c.post("/api/note", json={"src": "es"}, headers=h).status_code == 422


# ---------------------------------------------------------------- kullanıcılar ve dil çiftleri ayrı
def test_users_cannot_see_or_change_each_others_notes(env):
    c = env
    ua, ha = user()
    ub, hb = user()
    put(c, ha, "amor", "alice'in notu")
    assert notes(c, hb) == {}
    put(c, hb, "amor", "bob'un notu")
    assert notes(c, ha) == {"amor": "alice'in notu"} and notes(c, hb) == {"amor": "bob'un notu"}
    put(c, hb, "amor", "")                                          # bob siler: alice'inki durur
    assert notes(c, ha) == {"amor": "alice'in notu"} and rows(ub) == []


def test_same_word_in_another_language_pair_is_a_separate_note(env):
    c = env
    _, h = user()
    put(c, h, "pan", "ispanyolca", "es", "en")
    put(c, h, "pan", "lehçe", "pl", "en")
    put(c, h, "pan", "tr", "es", "tr")
    assert notes(c, h, "es", "en") == {"pan": "ispanyolca"}
    assert notes(c, h, "pl", "en") == {"pan": "lehçe"}
    assert notes(c, h, "es", "tr") == {"pan": "tr"}
    assert notes(c, h, "tr", "en") == {}


def test_legacy_tr_en_pair_works_without_any_row_in_the_word_tables(env):
    """Not, kelime tablolarına bağlı değildir: eski tr>en listesinde olmayan (ya da hiç listesi olmayan) kullanıcı da not tutar."""
    c = env
    uid, h = user()
    assert accounts.q("SELECT count(*) FROM user_words WHERE user_id = %s;", (uid,), True)[0][0] == 0
    assert put(c, h, "merhaba", "selam", "tr", "en").status_code == 200
    assert notes(c, h, "tr", "en") == {"merhaba": "selam"}
    assert accounts.q("SELECT count(*) FROM user_words WHERE user_id = %s;", (uid,), True)[0][0] == 0


# ---------------------------------------------------------------- içerik düz metin olarak saklanır
def test_markup_in_a_note_is_stored_and_returned_as_plain_json_text(env):
    c = env
    _, h = user()
    evil = '<img src=x onerror=alert(1)> & "q"'
    put(c, h, "amor", evil)
    r = c.get("/api/notes?src=es&dst=en", headers=h)
    assert r.headers["content-type"].startswith("application/json")
    assert r.json()["notes"]["amor"] == evil                         # kaçış sunucuda değil, ekranda (textContent) yapılır


def test_site_and_popup_never_write_notes_with_innerhtml():
    """Not metni ekrana textContent ile yazılır. Not koduna innerHTML sızmasın (YouTube Trusted Types + XSS)."""
    for f in ("extension/popup.js", "extension/content.js", "extension/background.js"):
        src = open(os.path.join(ROOT, f), encoding="utf-8").read()
        assert not re.search(r"\.(?:innerHTML|outerHTML)\b|insertAdjacentHTML\s*\(", src), f
    acc = open(os.path.join(ROOT, "templates/account.html"), encoding="utf-8").read()
    start = acc.index("function noteModal")
    end = acc.index("/* ---------- Videolar ---------- */")
    assert not re.search(r"\.(?:innerHTML|outerHTML)\b|insertAdjacentHTML\s*\(", acc[start:end])


# ---------------------------------------------------------------- üst sınır ve hız sınırı
def test_a_user_can_keep_at_most_3000_notes_but_can_still_edit_existing_ones(env):
    c = env
    uid, h = user()
    accounts.q("INSERT INTO word_notes (user_id, src, dst, word, note) SELECT %s, 'es', 'en', 'w' || g, 'n' FROM generate_series(1, 3000) g;", (uid,))
    assert put(c, h, "yeni", "bir fazla").status_code == 400
    assert put(c, h, "w5", "güncel").status_code == 200              # var olan not düzenlenebilir
    assert put(c, h, "w6", "").status_code == 200                    # silmek de serbest
    assert put(c, h, "yeni", "şimdi sığar").status_code == 200       # yer açılınca yenisi yazılır
    assert len(notes(c, h)) == 3000


def test_note_writes_are_rate_limited_per_ip_with_their_own_bucket(env):
    c = env
    _, h = user()
    codes = [put(c, h, "amor", f"n{i}").status_code for i in range(95)]
    assert codes[:90] == [200] * 90 and set(codes[90:]) == {429}
    assert c.get("/api/notes?src=es&dst=en", headers=h).status_code == 200   # okuma ayrı kova: yazma sınırı onu kilitlemez


# ---------------------------------------------------------------- cihazdaki notları toplu taşıma
def test_import_adds_only_missing_notes_and_never_overwrites_a_server_note(env):
    c = env
    uid, h = user()
    put(c, h, "amor", "sunucudaki not")
    r = c.post("/api/notes/import", json={"src": "es", "dst": "en", "notes": {"amor": "cihazdaki farklı not", "vida": "cihazdaki", "mundo": "  bir   not "}}, headers=h)
    assert r.status_code == 200 and r.json() == {"ok": True, "added": 2}
    assert notes(c, h) == {"amor": "sunucudaki not", "vida": "cihazdaki", "mundo": "bir not"}
    r = c.post("/api/notes/import", json={"src": "es", "dst": "en", "notes": {"amor": "x", "vida": "y"}}, headers=h)   # ikinci kez: bir şey eklenmez
    assert r.json()["added"] == 0 and len(rows(uid)) == 3


def test_import_skips_blank_notes_and_invalid_words_and_cuts_long_ones(env):
    c = env
    uid, h = user()
    r = c.post("/api/notes/import", json={"src": "es", "dst": "en", "notes": {"ok": "x" * 400, "bos": "   ", "": "x", "u" * 61: "x"}}, headers=h)
    assert r.json()["added"] == 1
    assert [(w, len(n)) for _, _, w, n in rows(uid)] == [("ok", 140)]


def test_import_takes_at_most_500_notes_and_rejects_a_bad_pair(env):
    c = env
    uid, h = user()
    big = {f"k{i}": "n" for i in range(800)}
    assert c.post("/api/notes/import", json={"src": "es", "dst": "en", "notes": big}, headers=h).json()["added"] == 500
    assert c.post("/api/notes/import", json={"src": "es", "dst": "es", "notes": {"a": "b"}}, headers=h).status_code == 400
    assert len(rows(uid)) == 500


def test_import_respects_the_3000_note_limit(env):
    c = env
    uid, h = user()
    accounts.q("INSERT INTO word_notes (user_id, src, dst, word, note) SELECT %s, 'es', 'en', 'w' || g, 'n' FROM generate_series(1, 2998) g;", (uid,))
    r = c.post("/api/notes/import", json={"src": "fr", "dst": "en", "notes": {"a": "1", "b": "2", "c": "3"}}, headers=h)
    assert r.json()["added"] == 2 and len(rows(uid)) == 3000


# ---------------------------------------------------------------- hesap silme, yönetim, şema göçü
def test_deleting_the_account_removes_the_notes(env):
    c = env
    uid, h = user()
    other, ho = user()
    put(c, h, "amor", "silinecek")
    put(c, h, "vida", "silinecek", "fr", "en")
    put(c, ho, "amor", "kalacak")
    accounts.delete_user_data(uid)
    assert rows(uid) == []
    assert c.get("/api/notes?src=es&dst=en", headers=h).status_code == 401          # oturum da gitti
    assert rows(other) == [("es", "en", "amor", "kalacak")]                         # başkasının notuna dokunulmaz


def test_admin_lists_the_notes_table_in_footprint_export_and_orphan_checks(env, monkeypatch):
    c = env
    uid, h = user()
    put(c, h, "amor", "yönetici dışa aktarımında görünür")
    monkeypatch.setattr(admin, "need_admin", lambda r: None)
    monkeypatch.setattr(admin, "log", lambda *a, **k: None)
    req = Request({"type": "http", "method": "GET", "path": "/x", "query_string": b"", "headers": []})
    assert "word_notes" in admin._USER_TABLES
    fp = admin.footprint(uid, req)
    assert {"table": "word_notes", "n": 1} in fp["tables"]
    exp = admin.export_user(uid, req)
    assert exp["word_notes"] == [{"from": "es", "to": "en", "word": "amor", "note": "yönetici dışa aktarımında görünür", "updated": exp["word_notes"][0]["updated"]}]
    accounts.delete_user_data(uid)
    assert {"table": "word_notes", "n": 0} in admin.footprint(uid, req)["tables"]


def test_running_the_schema_migration_twice_keeps_the_notes(env):
    c = env
    uid, h = user()
    put(c, h, "amor", "göçten sonra da durur")
    accounts.init_accounts(dict(accounts.DB))
    accounts.init_accounts(dict(accounts.DB))
    assert notes(c, h) == {"amor": "göçten sonra da durur"}


def test_table_shape_matches_the_agreed_schema(env):
    cols = accounts.q("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'word_notes' "
                      "ORDER BY ordinal_position;", (), True)
    assert [c[0] for c in cols] == ["user_id", "src", "dst", "word", "note", "updated_at"]
    assert [c[1] for c in cols[:5]] == ["integer", "text", "text", "text", "text"]
    assert all(c[2] == "NO" for c in cols[:5])
    pk = accounts.q("SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) "
                    "WHERE i.indrelid = 'word_notes'::regclass AND i.indisprimary ORDER BY array_position(i.indkey::int[], a.attnum::int);", (), True)
    assert [r[0] for r in pk] == ["user_id", "src", "dst", "word"]
