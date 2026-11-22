// Eklenti: altyazi dili korumasi ve arayuz metinleri (extension/lang.js, degistirilmeden yuklenir).
const test = require("node:test");
const assert = require("node:assert/strict");
const CVL = require("../../../extension/lang.js");

test("verdict: Ispanyolca satir, beklenen dil Ispanyolca -> match", () => {
  assert.equal(CVL.verdict("Lo más importante en la vida es tener amor propio", "es").v, "match");
});

test("verdict: Ingilizce satir, beklenen dil Ispanyolca -> mismatch ve dil 'en'", () => {
  const r = CVL.verdict("I don't know what you are talking about", "es");
  assert.equal(r.v, "mismatch");
  assert.equal(r.lang, "en");
});

test("verdict: BUYUK HARFLI Ingilizce satir Turkce sayilmaz", () => {
  assert.equal(CVL.verdict("THIS IS WITH THE AND YOU", "tr").v, "mismatch");
});

test("verdict: yazi turu farkliysa (Latin metin, beklenen Rusca) mismatch", () => {
  assert.equal(CVL.verdict("I don't know what you are saying", "ru").v, "mismatch");
  assert.equal(CVL.verdict("Я не знаю что ты говоришь", "ru").v, "match");
});

test("verdict: cok kisa metin karar vermez (unknown)", () => {
  assert.equal(CVL.verdict("Hi", "en").v, "unknown");
});

test("Guard: yanlis dilden sonra belirsiz kisa satirlar da durdurulur, dogru dilde satir gelince acilir", () => {
  const g = new CVL.Guard();
  assert.equal(g.check("Lo más importante en la vida es tener amor propio", "en").ok, false);
  assert.equal(g.check("Hmm ok", "en").ok, false);
  assert.equal(g.check("I know what you want to do", "en").ok, true);
});

test("foreign: Turkce satira karisan Ingilizce parca yabanci sayilir", () => {
  const words = "bu çok güzel let get on with the dialogue ama".split(" ");
  const f = CVL.foreign(words, "tr");
  assert.deepEqual(f.slice(0, 3), [false, false, false]);
  assert.deepEqual(f.slice(3, 9), [true, true, true, true, true, true]);   // let get on with the + 'dialogue' (yabanci obegin hemen ardindaki, Turkce izi olmayan kelime)
  assert.equal(f[9], false);   // 'ama' Turkce
});

test("detect: yazi turuyle ru / ar / ja / hi / ko bulunur", () => {
  assert.equal(CVL.detect("Привет как дела").best, "ru");
  assert.equal(CVL.detect("مرحبا كيف حالك اليوم").best, "ar");
  assert.equal(CVL.detect("こんにちは、元気ですか").best, "ja");
  assert.equal(CVL.detect("नमस्ते आप कैसे हैं").best, "hi");
  assert.equal(CVL.detect("안녕하세요 잘 지내세요").best, "ko");
});

test("isStop / hasStop", () => {
  assert.equal(CVL.isStop("the", "en"), true);
  assert.equal(CVL.isStop("importante", "es"), false);
  assert.equal(CVL.hasStop("ja"), false);
  assert.equal(CVL.hasStop("es"), true);
});

test("t: {0} {1} yer tutucular doldurulur, bilinmeyen anahtar anahtarin kendisi olur", () => {
  const s = CVL.t("mismatch", "Spanish", "English");
  assert.match(s, /Spanish/);
  assert.match(s, /English/);
  assert.equal(CVL.t("bu-anahtar-yok"), "bu-anahtar-yok");
});
