"""Aralikli tekrar (Leitner) ve quiz raporu: kutular, tarihler, oturum secimi, XP."""
import datetime as dt
import random

import pytest

import srs

D = dt.date(2026, 11, 22)


def day(n):
    return D + dt.timedelta(days=n)


def stat(due, box=0):
    return {"box": box, "due": due, "right": 0, "wrong": 0}


# ---------------------------------------------------------------- next_state
def test_wrong_answer_drops_to_box_zero_and_is_due_today():
    assert srs.next_state(4, False, D) == (0, D)


@pytest.mark.parametrize("box,exp_box,days", [(0, 1, 1), (1, 2, 3), (2, 3, 7), (3, 4, 14), (4, 5, 30), (5, 6, 60), (6, 6, 60)])
def test_correct_answer_walks_the_intervals_and_caps_at_the_top_box(box, exp_box, days):
    assert srs.next_state(box, True, D) == (exp_box, day(days))


# ---------------------------------------------------------------- pick_session
def test_pick_session_order_is_due_then_new_then_later():
    words = {w: w.upper() for w in "abcdef"}
    stats = {"a": stat(day(-3), 2), "b": stat(D, 1), "c": stat(day(5)), "d": stat(day(2))}  # e, f hic gorulmemis
    pick, due_n = srs.pick_session(words, stats, D, 10, rng=random.Random(1))
    assert due_n == 2
    assert pick[:2] == ["a", "b"]            # vadesi gelenler, eskiden yeniye
    assert set(pick[2:4]) == {"e", "f"}      # sonra yeni kelimeler
    assert pick[4:] == ["d", "c"]            # en sonda vadesi en yakin olanlar


def test_pick_session_truncates_but_still_reports_how_many_were_due():
    words = {w: w for w in "abcde"}
    stats = {"a": stat(day(-1)), "b": stat(D), "c": stat(day(-2))}
    pick, due_n = srs.pick_session(words, stats, D, 2, rng=random.Random(1))
    assert len(pick) == 2
    assert due_n == 3
    assert pick == ["c", "a"]


def test_pick_session_ignores_stats_of_words_that_are_not_in_the_users_list():
    words = {"a": "A"}
    stats = {"a": stat(D), "silinmis": stat(day(-9))}
    pick, due_n = srs.pick_session(words, stats, D, 10, rng=random.Random(1))
    assert pick == ["a"]
    assert due_n == 1


def test_a_word_due_exactly_today_counts_as_due():
    pick, due_n = srs.pick_session({"a": "A"}, {"a": stat(D)}, D, 5, rng=random.Random(1))
    assert due_n == 1


# ---------------------------------------------------------------- bugun: UTC gunu
def test_today_is_the_utc_day_not_the_users_local_day(monkeypatch):
    """Karakterizasyon: seri ve XP gunu UTC'ye gore sayilir. Istanbul'da (UTC+3) 01:30'da yapilan quiz bir onceki gune yazilir.
    Bu bir hata mi, karar mi: proje sahibi karar verecek (srs.py site dosyasi, degistirilmedi)."""
    class FakeDT(dt.datetime):
        @classmethod
        def now(cls, tz=None):
            return dt.datetime(2026, 11, 21, 22, 30, tzinfo=dt.timezone.utc)  # Istanbul'da 22 Kasim 01:30

    class FakeModule:
        datetime = FakeDT
        timezone = dt.timezone
        timedelta = dt.timedelta
        date = dt.date

    monkeypatch.setattr(srs, "dt", FakeModule)
    assert srs.today() == dt.date(2026, 11, 21)


# ---------------------------------------------------------------- report: XP ve kutu yazimi
class FakeCursor:
    def __init__(self, log):
        self.log = log

    def execute(self, sql, params=None):
        self.log.append((" ".join(sql.split()), params))


class FakeConn:
    def __init__(self, log):
        self.log = log

    def cursor(self):
        return FakeCursor(self.log)

    def commit(self):
        pass

    def close(self):
        pass


@pytest.fixture
def log(monkeypatch):
    calls = []
    monkeypatch.setattr(srs, "need_user", lambda r: {"id": 7, "username": "t"})
    monkeypatch.setattr(srs, "_throttle_ip", lambda *a, **k: None)
    monkeypatch.setattr(srs.vocab, "check_pair", lambda *a: None)
    monkeypatch.setattr(srs, "q", lambda *a, **k: [])
    monkeypatch.setattr(srs, "today", lambda: D)
    monkeypatch.setattr(srs.psycopg2, "connect", lambda **kw: FakeConn(calls))
    return calls


def run(items):
    req = srs.ReportReq(src="es", dst="en", items=[srs.Item(w=w, ok=ok) for w, ok in items])
    return srs.report(req, object())


def rows(log, prefix):
    return [p for s, p in log if s.startswith(prefix)]


def test_report_gives_10_xp_per_correct_answer_and_moves_boxes(log):
    out = run([("hola", True), ("adios", False)])
    assert out == {"ok": True, "xp": 10}
    by_word = {p[3]: p for p in rows(log, "INSERT INTO word_stats")}   # (uid, src, dst, w, box, due, right, wrong)
    assert by_word["hola"][4:] == (1, day(1), 1, 0)
    assert by_word["adios"][4:] == (0, D, 0, 1)
    assert rows(log, "INSERT INTO xp_log") == [(7, D, 10, 600)]


def test_report_with_only_wrong_answers_writes_no_xp(log):
    out = run([("hola", False)])
    assert out == {"ok": True, "xp": 0}
    assert rows(log, "INSERT INTO xp_log") == []


def test_report_same_word_twice_moves_up_two_boxes_in_one_session(log):
    run([("hola", True), ("hola", True)])
    (p,) = rows(log, "INSERT INTO word_stats")
    assert p[4] == 2 and p[6] == 2


def test_report_with_no_words_does_nothing(log):
    assert run([]) == {"ok": True, "xp": 0}
    assert log == []


def test_xp_log_upsert_caps_the_day_at_600(log):
    run([("hola", True)])
    sql = [s for s, _ in log if s.startswith("INSERT INTO xp_log")][0]
    assert "LEAST(xp_log.xp + EXCLUDED.xp, %s)" in sql


@pytest.mark.xfail(strict=True, reason="BULGU (srs.py report): gunluk 600 XP siniri dolunca bile sonuc ekranina tam XP doner, veritabanina daha azi yazilir.")
def test_reported_xp_equals_credited_xp_when_the_daily_cap_is_near(log):
    existing = 590                                   # bugun zaten 590 XP kazanilmis
    out = run([(f"w{i}", True) for i in range(5)])   # 50 XP kazandirmali
    params = rows(log, "INSERT INTO xp_log")[0]      # (uid, gun, eklenecek, sinir)
    credited = min(existing + params[2], params[3]) - existing   # SQL: LEAST(xp + eklenecek, sinir)
    assert out["xp"] == credited
