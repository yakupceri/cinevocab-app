"""Eşleştirme oyunu (/api/match/*): kelime seçimi saf fonksiyonları ve hesapsız uçlar. Veritabanı gerekmez (sahte havuz)."""
import random

import pytest
from starlette.requests import Request

import match


def P(w, t):
    return {"tr": w, "eng": t}


def req():
    return Request({"type": "http", "method": "GET", "path": "/api/match/words", "query_string": b"", "headers": [], "client": ("9.9.9.9", 1)})


def test_usable_drops_what_cannot_be_a_fair_tile():
    pool = [P("casa", "house"), P("Casa", "home"),            # aynı kelime ikinci kez: tahtada iki doğru eş olurdu
            P("hogar", "house"),                              # aynı çeviri ikinci kez
            P("taxi", "Taxi"),                                # kelime = çeviri
            P("a", "to"), P("x" * 17, "long"), P("uno", "y" * 17),
            P("por favor ahora mismo", "please"),             # üç sözcükten uzun
            P("año2", "year"), P("perro", "dog"), P("gato", "")]
    got = match.usable(pool)
    # kalanlar: "casa"nın bir yazımı, hogar=house (house ilk kez), perro=dog
    assert sorted(g["w"].lower() for g in got) == ["casa", "hogar", "perro"]
    assert len({g["t"].lower() for g in got}) == 3 and all(g["t"] for g in got)
    assert match.usable([P("hogar", "house"), P("vivienda", "house")]) == [{"w": "hogar", "t": "house"}]   # aynı çeviri bir kez


def test_usable_never_lets_a_word_equal_another_pairs_translation():
    got = match.usable([P("gift", "poison"), P("poison", "zehir"), P("zehir", "gift")])
    words, trans = {g["w"] for g in got}, {g["t"] for g in got}
    assert not (words & trans)                                # bir taş iki farklı çifte ait görünmesin


def test_pick_returns_at_most_n_unique_pairs():
    pairs = [{"w": f"w{i}", "t": f"t{i}"} for i in range(100)]
    got = match.pick(pairs, 48, random.Random(1))
    assert len(got) == 48 and len({g["w"] for g in got}) == 48
    assert len(match.pick(pairs[:5], 48)) == 5


@pytest.fixture
def pool(monkeypatch):
    match._cache.clear()
    monkeypatch.setattr(match, "_throttle_ip", lambda *a, **k: None)
    data = {("es", "en"): [P(f"palabra{chr(97 + i)}", f"word{chr(97 + i)}") for i in range(20)], ("fr", "en"): [P("chat", "cat")]}
    match.init(lambda s, d: data.get((s, d), []))
    return data


def test_words_endpoint_needs_no_account(pool):
    d = match.match_words(req(), "es", "en")
    assert d["ready"] is True and len(d["words"]) == 20 and set(d["words"][0]) == {"w", "t"}


def test_small_pool_is_not_ready_instead_of_a_broken_board(pool):
    assert match.match_words(req(), "fr", "en") == {"ready": False, "src": "fr", "dst": "en", "words": []}


def test_invalid_pair_is_rejected(pool):
    from fastapi import HTTPException
    for s, d in (("es", "es"), ("xx", "en")):
        with pytest.raises(HTTPException):
            match.match_words(req(), s, d)
