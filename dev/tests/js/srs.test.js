// Cihazdaki aralıklı tekrar (extension/srs.js). Sunucudaki srs.py ile AYNI sonucu vermeli: karşılaştırma testi dahil.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const S = require("../../../extension/srs.js");
const B = require("../../../extension/bank.js");

const ROOT = path.resolve(__dirname, "../../..");
const PY = path.join(ROOT, "dev", ".venv", "bin", "python");
const D = 20000; // keyfi gün numarası

// ---------------------------------------------------------------- Python ile eşdeğerlik
test("nextState: tüm kutular ve ikisi de doğru/yanlış için srs.py next_state ile birebir aynı", { skip: !fs.existsSync(PY) }, () => {
  const out = execFileSync(PY, ["-I", "-c", `
import sys, json, datetime as dt
sys.path.insert(0, ${JSON.stringify(ROOT)}); sys.dont_write_bytecode = True
import srs
D = dt.date(2026, 11, 22); res = []
for box in range(7):
    for ok in (True, False):
        b, d = srs.next_state(box, ok, D); res.append([box, ok, b, (d - D).days])
print(json.dumps({"rows": res, "intervals": srs.INTERVALS, "xp": srs.XP_PER_CORRECT}))`], { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  const py = JSON.parse(out);
  assert.deepEqual(S.INTERVALS, py.intervals);
  for (const [box, ok, nb, days] of py.rows) {
    const js = S.nextState(box, ok, D);
    assert.equal(js.box, nb, `kutu ${box} ok=${ok}`);
    assert.equal(js.due - D, days, `vade ${box} ok=${ok}`);
  }
});

test("pickSession: sıra srs.py pick_session ile aynı (vadesi gelenler, yeniler, vadesi uzak olanlar)", { skip: !fs.existsSync(PY) }, () => {
  const out = execFileSync(PY, ["-I", "-c", `
import sys, json, datetime as dt, random
sys.path.insert(0, ${JSON.stringify(ROOT)}); sys.dont_write_bytecode = True
import srs
D = dt.date(2026, 11, 22); d = lambda n: D + dt.timedelta(days=n)
words = {w: w.upper() for w in "abcdefg"}
stats = {"a": {"box": 2, "due": d(-3), "right": 0, "wrong": 0}, "b": {"box": 1, "due": D, "right": 0, "wrong": 0}, "c": {"box": 0, "due": d(5), "right": 0, "wrong": 0}, "d": {"box": 3, "due": d(2), "right": 0, "wrong": 0}, "e": {"box": 0, "due": d(-3), "right": 0, "wrong": 0}}
pick, due = srs.pick_session(words, stats, D, 10, rng=random.Random(1))
print(json.dumps({"pick": pick, "due": due}))`], { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  const py = JSON.parse(out);
  const items = [
    { w: "a", t: "A", box: 2, due: D - 3 }, { w: "b", t: "B", box: 1, due: D }, { w: "c", t: "C", box: 0, due: D + 5 },
    { w: "d", t: "D", box: 3, due: D + 2 }, { w: "e", t: "E", box: 0, due: D - 3 }, { w: "f", t: "F" }, { w: "g", t: "G" },
  ];
  const js = S.pickSession(items, D, 10, () => 0.5);
  const names = js.picks.map((p) => p.it.w);
  assert.equal(js.due, py.due);
  assert.deepEqual(names.slice(0, py.due), py.pick.slice(0, py.due));            // vadesi gelenler: aynı sıra (a, e, b)
  assert.deepEqual(new Set(names.slice(py.due, py.due + 2)), new Set(py.pick.slice(py.due, py.due + 2)));  // yeniler (f, g): sıra rastgele, küme aynı
  assert.deepEqual(names.slice(-2), py.pick.slice(-2));                           // vadesi en yakın olanlar: aynı sıra (d, c)
});

// ---------------------------------------------------------------- kutu ve öğrenildi
test("answer: doğru -> bir üst kutu ve aralık, yanlış -> 0. kutu ve bugün", () => {
  const it = { w: "a", t: "A", box: 1, due: D, right: 2, wrong: 0 };
  assert.deepEqual({ ...S.answer(it, true, D), last: undefined }, { w: "a", t: "A", box: 2, due: D + 3, right: 3, wrong: 0, last: undefined });
  const w = S.answer(it, false, D);
  assert.equal(w.box, 0); assert.equal(w.due, D); assert.equal(w.wrong, 1);
});

test("answer: hiç sorulmamış kelime doğruysa 1. kutuya (yarın) çıkar", () => {
  const r = S.answer({ w: "a", t: "A" }, true, D);
  assert.equal(r.box, 1); assert.equal(r.due, D + 1);
});

test("answer: vadesi gelmemiş ısınma sorusu doğruysa kutu İLERLEMEZ, yanlışsa yine 0'a düşer", () => {
  const it = { w: "a", t: "A", box: 3, due: D + 7 };
  const ok = S.answer(it, true, D, false);
  assert.equal(ok.box, 3); assert.equal(ok.due, D + 7); assert.equal(ok.right, 1);
  const bad = S.answer(it, false, D, false);
  assert.equal(bad.box, 0); assert.equal(bad.due, D);
});

test("öğrenildi = 3. kutu: yeni kelime ancak 3 doğru cevapla (biri 1 gün, biri 3 gün sonra) öğrenilmiş olur", () => {
  let it = { w: "a", t: "A" };
  assert.equal(S.isLearned(it), false);
  it = S.answer(it, true, D);            // gün 0: kutu 1, vade +1
  assert.equal(S.isLearned(it), false);
  it = S.answer(it, true, D + 1);        // gün 1: kutu 2, vade +3
  assert.equal(S.isLearned(it), false);
  it = S.answer(it, true, D + 4);        // gün 4: kutu 3, vade +7
  assert.equal(S.isLearned(it), true);
  assert.equal(it.due, D + 11);
  it = S.answer(it, false, D + 11);      // unutuldu: öğrenildi değil artık
  assert.equal(S.isLearned(it), false);
});

// ---------------------------------------------------------------- oturum
test("pickSession: çevirisi olmayan kelime sorulmaz, vadesi gelmeyenler yalnızca ısınma (counts=false)", () => {
  const items = [{ w: "a", t: "" }, { w: "b", t: "B", box: 1, due: D }, { w: "c", t: "C", box: 4, due: D + 9 }, { w: "d", t: "D" }];
  const r = S.pickSession(items, D, 8, () => 0.5);
  assert.deepEqual(r.picks.map((p) => [p.it.w, p.counts]), [["b", true], ["d", true], ["c", false]]);
  assert.equal(r.due, 1); assert.equal(r.fresh, 1);
});

test("pickSession: en çok n soru", () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ w: "w" + i, t: "t" + i }));
  assert.equal(S.pickSession(items, D, 8).picks.length, 8);
});

test("stats: kaç kelime tutuldu, kaçı öğrenildi, kaçı şimdi hazır", () => {
  const items = [{ w: "a", t: "A", box: 3, due: D + 7 }, { w: "b", t: "B", box: 1, due: D }, { w: "c", t: "C" }, { w: "d", t: "" }, { w: "e", t: "E", box: 2, due: D + 1 }];
  assert.deepEqual(S.stats(items, D), { kept: 5, usable: 4, learned: 1, ready: 2, due: 1, fresh: 1 });
});

test("seri: art arda gün; bugün henüz çalışılmadıysa dünden sayılır, boşluk seriyi bitirir (extauth._streak ile aynı)", () => {
  assert.equal(S.streak([D, D - 1, D - 2], D), 3);
  assert.equal(S.streak([D - 1, D - 2, D - 3], D), 3);
  assert.equal(S.streak([D - 2, D - 3], D), 0);
  assert.equal(S.streak([D, D - 1, D - 3], D), 2);
  assert.equal(S.streak([], D), 0);
});

test("dayOf: aynı yerel gün aynı numara, ertesi gün +1", () => {
  const a = new Date(2026, 10, 22, 0, 30).getTime(), b = new Date(2026, 10, 22, 23, 30).getTime(), c = new Date(2026, 10, 23, 0, 5).getTime();
  assert.equal(S.dayOf(a), S.dayOf(b));
  assert.equal(S.dayOf(c), S.dayOf(a) + 1);
});

// ---------------------------------------------------------------- yazarak cevap
test("check: büyük/küçük harf, aksan, 'to' ve noktalama yok sayılır", () => {
  assert.equal(S.check("TO HAVE", "to have").ok, true);
  assert.equal(S.check("have", "to have").ok, true);
  assert.equal(S.check("Café!", "cafe").ok, true);
  assert.equal(S.check("love", "love").close, false);
});

test("check: alternatiflerden biri yeter ('a / b', 'a, b', 'a or b')", () => {
  assert.equal(S.check("own", "own / proper").ok, true);
  assert.equal(S.check("proper", "own / proper").ok, true);
  assert.equal(S.check("own", "own, proper").ok, true);
  assert.equal(S.check("proper", "own or proper").ok, true);
});

test("check: 5+ harfli cevapta 1 harflik yazım hatası kabul (close), kısa kelimede kabul edilmez", () => {
  assert.deepEqual(S.check("importnt", "important"), { ok: true, close: true });
  assert.deepEqual(S.check("importamt", "important"), { ok: true, close: true });
  assert.equal(S.check("lov", "love").ok, false);       // 4 harf: tolerans yok
  assert.equal(S.check("table", "chair").ok, false);
  assert.equal(S.check("", "love").ok, false);
});

// ---------------------------------------------------------------- defter ile birlikte
test("bank.update ve bank.add tekrar durumunu korur (geri al ile kutu/vade kaybolmaz)", () => {
  let b = B.add({}, "es>en", { w: "a", t: "A" }, 1);
  b = B.update(b, "es>en", "a", S.answer(B.list(b, "es>en")[0], true, D));
  const it = B.list(b, "es>en")[0];
  assert.equal(it.box, 1); assert.equal(it.due, D + 1);
  const again = B.add(B.remove(b, "es>en", "a"), "es>en", it, it.ts);   // sil + geri al
  assert.equal(B.list(again, "es>en")[0].box, 1);
  assert.equal(B.list(again, "es>en")[0].due, D + 1);
  assert.deepEqual(B.list(B.update({}, "es>en", "yok", { box: 9 }), "es>en"), []);
});
