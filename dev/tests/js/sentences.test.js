// Cümle çalışması (extension/srs.js): boşluk doldurma ve cümle kurma yardımcıları
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../../extension/srs.js");
const B = require("../../../extension/bank.js");

test("blankSentence: kelimeyi cümlede bulur, öncesini/sonrasını ve yazılışını verir", () => {
  const r = S.blankSentence("Todo en la vida es bonito.", "vida");
  assert.deepEqual({ ...r }, { before: "Todo en la ", after: " es bonito.", shown: "vida" });
});
test("blankSentence: büyük/küçük harf fark etmez, cümledeki yazılış korunur", () => {
  const r = S.blankSentence("Amor es todo.", "amor");
  assert.equal(r.shown, "Amor"); assert.equal(r.before, ""); assert.equal(r.after, " es todo.");
});
test("blankSentence: kelimenin içinde geçen parçayı değil, tam kelimeyi bulur", () => {
  assert.equal(S.blankSentence("Un propio lugar", "pro"), null);
  assert.equal(S.blankSentence("Es mi vida.", "vid"), null);
  assert.equal(S.blankSentence("Es mi vida.", "vida").shown, "vida");
});
test("blankSentence: aksanlı ve noktalamalı kelimeler", () => {
  assert.equal(S.blankSentence("¿Qué pasó ayer? Está claro.", "pasó").shown, "pasó");
  assert.equal(S.blankSentence("Él dijo: ¡hola!", "hola").after, "!");
});
test("blankSentence: boş ya da bulunamayan girdi null döner, düzensiz ifade (regex özel karakterleri) çökertmez", () => {
  for (const [s, w] of [["", "a"], [null, "a"], ["abc", ""], ["abc", null], ["abc", "x"], ["a (b) c", "("], ["a.b", ".*"]]) assert.equal(S.blankSentence(s, w), null, JSON.stringify([s, w]));
});
test("blankSentence: boşluksuz yazılan dillerde (bulunamayınca) null; sistem soruyu cümlesiz sorar", () => {
  assert.equal(S.blankSentence("私は水を飲みます", "水"), null); // harfle çevrili ("私は水を…" hepsi \p{L}): bulunamaz, soru cümlesiz sorulur
});

test("orderTokens/checkOrder: noktalama ve büyük/küçük harf farkı yok sayılır, sıra farkı doğru sayılmaz", () => {
  const s = "Todo en la vida es bonito.";
  assert.deepEqual(S.orderTokens(s), ["Todo", "en", "la", "vida", "es", "bonito."]);
  assert.equal(S.checkOrder(["todo", "en", "la", "vida", "es", "bonito"], s), true);
  assert.equal(S.checkOrder(["Todo", "en", "vida", "la", "es", "bonito."], s), false);
  assert.equal(S.checkOrder(["Todo", "en", "la", "vida", "es"], s), false);
  assert.equal(S.checkOrder([], ""), true);
});
test("orderTokens: fazla boşluk ve satır sonu temizlenir", () => {
  assert.deepEqual(S.orderTokens("  a   b\n c  "), ["a", "b", "c"]);
  assert.deepEqual(S.orderTokens(null), []);
});

test("bank: cümle (s) ve çevirisi (st) kayıt, güncelleme ve tekrar eklemede korunur", () => {
  let bank = B.add({}, "es>en", { w: "vida", t: "life", s: "Es mi vida.", st: "It is my life." });
  let it = B.list(bank, "es>en")[0];
  assert.equal(it.s, "Es mi vida."); assert.equal(it.st, "It is my life.");
  bank = B.update(bank, "es>en", "vida", { box: 2, due: 5 });
  it = B.list(bank, "es>en")[0];
  assert.equal(it.s, "Es mi vida."); assert.equal(it.box, 2);
  bank = B.remove(bank, "es>en", "vida");
  bank = B.add(bank, "es>en", it); // listeden "geri al": tüm kayıt (cümle ve kutu dahil) aynen geri gelir
  it = B.list(bank, "es>en")[0];
  assert.equal(it.s, "Es mi vida."); assert.equal(it.st, "It is my life."); assert.equal(it.box, 2);
});
