// Hesapsız "kelimeyi tut" defteri (extension/bank.js)
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../../../extension/bank.js");

const P = "es>en";

test("add: yeni kelime en başa gelir, alanlar kırpılır, zaman verilir", () => {
  let b = B.add({}, P, { w: "vida", t: "life" }, 1000);
  b = B.add(b, P, { w: "amor", t: "love", ep: "YouTube · Easy Spanish", vt: 42.4 }, 2000);
  assert.deepEqual(B.list(b, P).map((x) => x.w), ["amor", "vida"]);
  assert.deepEqual(B.list(b, P)[0], { w: "amor", t: "love", ts: 2000, ep: "YouTube · Easy Spanish", vt: 42 });
  assert.deepEqual(B.list(b, P)[1], { w: "vida", t: "life", ts: 1000 });
});

test("add: aynı kelime iki kez eklenmez, en başa taşınır ve çevirisi güncellenir", () => {
  let b = B.add({}, P, { w: "vida", t: "" }, 1);
  b = B.add(b, P, { w: "amor", t: "love" }, 2);
  b = B.add(b, P, { w: "vida", t: "life" }, 3);
  assert.deepEqual(B.list(b, P).map((x) => [x.w, x.t]), [["vida", "life"], ["amor", "love"]]);
});

test("add: orijinal nesneyi değiştirmez, başka dil çiftine dokunmaz", () => {
  const a = B.add({}, "fr>en", { w: "bonjour", t: "hello" }, 1);
  const b = B.add(a, P, { w: "vida", t: "life" }, 2);
  assert.equal(B.list(a, P).length, 0);
  assert.equal(B.list(b, "fr>en").length, 1);
});

test("add: boş kelime eklenmez, bozuk video saniyesi saklanmaz", () => {
  assert.deepEqual(B.list(B.add({}, P, { w: "  ".trim(), t: "x" }), P), []);
  const e = B.list(B.add({}, P, { w: "vida", t: "life", vt: NaN }, 1), P)[0];
  assert.equal("vt" in e, false);
  assert.equal("vt" in B.list(B.add({}, P, { w: "vida", t: "life", vt: -3 }, 1), P)[0], false);
});

test("add: dil çifti başına en çok 500 kelime tutulur, en yeniler kalır", () => {
  let b = {};
  for (let i = 0; i < 520; i++) b = B.add(b, P, { w: "w" + i, t: "t" }, i);
  const l = B.list(b, P);
  assert.equal(l.length, B.CAP);
  assert.equal(l[0].w, "w519");
  assert.equal(B.has(b, P, "w0"), false);
});

test("remove ve has", () => {
  let b = B.add(B.add({}, P, { w: "a", t: "1" }, 1), P, { w: "b", t: "2" }, 2);
  assert.equal(B.has(b, P, "a"), true);
  b = B.remove(b, P, "a");
  assert.equal(B.has(b, P, "a"), false);
  assert.deepEqual(B.list(b, P).map((x) => x.w), ["b"]);
  assert.deepEqual(B.list(B.remove({}, P, "yok"), P), []);
});

test("bozuk depo verisi çökertmez", () => {
  for (const junk of [null, undefined, 5, "x", [], { [P]: "bozuk" }, { [P]: [null, { w: "a", t: "1", ts: 1 }] }]) {
    assert.ok(Array.isArray(B.list(junk, P)));
    assert.doesNotThrow(() => B.add(junk, P, { w: "z", t: "q" }, 1));
    assert.doesNotThrow(() => B.remove(junk, P, "z"));
    assert.doesNotThrow(() => B.has(junk, P, "z"));
  }
});

test("clock: saniye -> m:ss / h:mm:ss", () => {
  assert.equal(B.clock(0), "0:00");
  assert.equal(B.clock(75), "1:15");
  assert.equal(B.clock(599.6), "10:00");
  assert.equal(B.clock(3700), "1:01:40");
  assert.equal(B.clock(NaN), "");
  assert.equal(B.clock(-1), "");
});

test("setNote: not yazar, boşlukları toplar, 140 karakterde keser; boş not alanı siler; olmayan kelimeye dokunmaz", () => {
  const BANK = require("../../../extension/bank.js");
  let b = BANK.add({}, "es>en", { w: "amor", t: "love" }, 1);
  b = BANK.setNote(b, "es>en", "amor", "  dizide   çok geçiyor  ");
  assert.equal(BANK.list(b, "es>en")[0].n, "dizide çok geçiyor");
  assert.equal(BANK.list(BANK.setNote(b, "es>en", "amor", "x".repeat(300)), "es>en")[0].n.length, 140);
  assert.equal("n" in BANK.list(BANK.setNote(b, "es>en", "amor", "   "), "es>en")[0], false);
  assert.deepEqual(BANK.setNote(b, "es>en", "yok", "not"), b);
  assert.equal(BANK.list(b, "es>en")[0].t, "love");                       // diğer alanlar durur
});
