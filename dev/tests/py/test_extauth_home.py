"""Popup ozeti (/api/ext/home): seri, seviye, XP ve kelime sayilari."""
import datetime as dt

import pytest

import extauth
import srs
import vocab

D = dt.date(2026, 11, 22)


def d(n):
    return D - dt.timedelta(days=n)


# ---------------------------------------------------------------- seri
def test_streak_counts_consecutive_days_including_today():
    assert extauth._streak({d(0), d(1), d(2)}, D) == 3


def test_streak_stays_alive_when_today_is_not_played_yet():
    assert extauth._streak({d(1), d(2), d(3)}, D) == 3


def test_streak_is_zero_after_a_missed_day():
    assert extauth._streak({d(2), d(3), d(4)}, D) == 0


def test_streak_stops_at_the_first_gap():
    assert extauth._streak({d(0), d(1), d(3), d(4)}, D) == 2


def test_streak_with_no_days_is_zero():
    assert extauth._streak(set(), D) == 0


# ---------------------------------------------------------------- home()
def make_q(xp_rows, words_tr=0, words_ml=0, wins=0):
    def fake_q(sql, params=None, fetch=False):
        s = " ".join(sql.split())
        if "FROM xp_log" in s:
            return xp_rows
        if "count(DISTINCT tr)" in s:
            return [[words_tr]]
        if "user_words_ml" in s:
            return [[words_ml]]
        if "game_results" in s:
            return [[wins]]
        if "avatar" in s:
            return [[""]]
        raise AssertionError("beklenmeyen sorgu: " + s)
    return fake_q


@pytest.fixture
def patch_home(monkeypatch):
    def apply(xp_rows, rows=(), quality=None, stats=None, words_tr=0, words_ml=0, wins=0):
        monkeypatch.setattr(extauth, "need_user", lambda r: {"id": 1, "username": "tester"})
        monkeypatch.setattr(vocab, "check_pair", lambda *a: None)
        monkeypatch.setattr(srs, "today", lambda: D)
        monkeypatch.setattr(extauth, "q", make_q(xp_rows, words_tr, words_ml, wins))
        monkeypatch.setattr(vocab, "rows_for", lambda *a: list(rows))
        monkeypatch.setattr(srs, "_quality", lambda pairs, src, dst: dict(quality or {}))
        monkeypatch.setattr(srs, "_stats", lambda *a: dict(stats or {}))
        monkeypatch.setattr(extauth, "starred", lambda *a: [])
        return extauth.home(None, "es", "en")
    return apply


@pytest.mark.parametrize("xp,level,into", [(0, 1, 0), (199, 1, 199), (200, 2, 0), (450, 3, 50), (1000, 6, 0)])
def test_level_and_progress_bar_follow_200_xp_per_level(patch_home, xp, level, into):
    out = patch_home([(D, xp)] if xp else [])
    assert (out["level"], out["xp_into"], out["xp_level"], out["xp"]) == (level, into, 200, xp)


def test_xp_today_total_streak_and_word_count(patch_home):
    out = patch_home([(D, 120), (d(1), 330)], words_tr=7, words_ml=3, wins=2)
    assert out["xp"] == 450 and out["level"] == 3 and out["xp_today"] == 120
    assert out["streak"] == 2
    assert out["words"] == 10 and out["wins"] == 2


def test_due_new_and_mastered_counts(patch_home):
    rows = [("a", "A", "ep1", None), ("b", "B", "ep1", None), ("c", "C", "", None), ("a", "A", "ep2", None)]
    quality = {"a": "A", "b": "B", "c": "C"}
    stats = {
        "a": {"box": 5, "due": D, "right": 3, "wrong": 0},                      # usta, vadesi bugun
        "b": {"box": 1, "due": D + dt.timedelta(days=1), "right": 1, "wrong": 0},  # yarin
    }
    out = patch_home([(D, 10)], rows=rows, quality=quality, stats=stats)
    assert out["due"] == 1        # yalnizca a
    assert out["new"] == 1        # c hic sorulmamis
    assert out["mastered"] == 1   # kutu 5 ve ustu
    assert [r["w"] for r in out["recent"]] == ["a", "b", "c"]   # tekrar eden kelime bir kez
    assert out["pair_words"] == 3


def test_stats_of_words_that_are_not_quiz_ready_are_ignored(patch_home):
    rows = [("a", "A", "", None)]
    stats = {"a": {"box": 6, "due": D, "right": 9, "wrong": 0}}
    out = patch_home([], rows=rows, quality={}, stats=stats)   # kalite suzgecinden gecmeyen kelime
    assert out["due"] == 0 and out["mastered"] == 0 and out["new"] == 0
