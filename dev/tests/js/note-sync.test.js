// Kelime notunun hesaba yazılması (extension/background.js: "note" mesajı + migrateBank içindeki not taşıması).
// Kural: anahtar yoksa (hesapsız kullanıcı) HİÇBİR ağ isteği atılmaz; altyazı cümleleri hiçbir zaman gitmez.
// Servis çalışanı sahte chrome ve sahte ağla çalıştırılır.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SRC = fs.readFileSync(path.resolve(__dirname, "../../../extension/background.js"), "utf8");
const BANK_JS = fs.readFileSync(path.resolve(__dirname, "../../../extension/bank.js"), "utf8");

function load(store, { ok = true, failUrl = null } = {}) {
  const calls = [], listeners = [];
  const noop = () => {};
  const ev = { addListener: noop };
  const local = {
    get(keys, cb) {
      const o = {}; for (const k of [].concat(keys)) if (k in store) o[k] = store[k];
      if (cb) { cb(o); return; } return Promise.resolve(o);
    },
    set(obj, cb) { Object.assign(store, obj); if (cb) cb(); return Promise.resolve(); },
  };
  const ctx = {
    chrome: {
      storage: { local, onChanged: ev }, runtime: { onMessage: { addListener: (f) => listeners.push(f) }, onInstalled: ev, onStartup: ev, id: "me", getURL: (p) => p },
      action: { setBadgeText: noop, setBadgeBackgroundColor: noop }, permissions: { onAdded: ev }, scripting: {}, tabs: {}, identity: {},
    },
    fetch: async (url, opt) => {
      calls.push({ url, opt, body: JSON.parse(opt.body) });
      return { ok: failUrl && String(url).includes(failUrl) ? false : ok, status: ok ? 200 : 500, json: async () => ({}) };
    },
    setTimeout, clearTimeout, AbortController, console: { log() {}, warn() {}, error() {} },
    self: { navigator: { language: "en" } }, navigator: { language: "en" },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  // mesajı dinleyicilere ver; cevap veren (true döndüren) dinleyiciyi bekle
  const send = (request, sender = { id: "me" }) => new Promise((res) => {
    let answered = false;
    const reply = (r) => { answered = true; res(r === undefined ? r : JSON.parse(JSON.stringify(r))); };   // vm bağlamının nesneleri düz nesneye çevrilir
    let async = false;
    for (const f of listeners) if (f(request, sender, reply) === true) async = true;
    if (!async && !answered) res(undefined);
  });
  return { ctx, calls, store, send };
}

const noteMsg = (o = {}) => ({ action: "note", src: "es", dst: "en", word: "amor", note: "dizide çok geçiyor", ...o });
const noteCalls = (calls) => calls.filter((c) => c.url.endsWith("/api/note"));

// ---------------------------------------------------------------- "note" mesajı
test("anahtar yoksa (hesapsız) not mesajı HİÇBİR ağ isteği atmaz", async () => {
  for (const store of [{}, { key: "" }, { bank: { "es>en": [{ w: "amor", t: "love", ts: 1, n: "x" }] } }]) {
    const { calls, send } = load(store);
    const r = await send(noteMsg());
    assert.equal(calls.length, 0);
    assert.deepEqual(r, { ok: false, guest: true });
  }
});

test("anahtar varsa not hesaba yazılır: doğru adres, Bearer anahtarı, kırpılmış not", async () => {
  const { calls, send } = load({ key: "K" });
  const r = await send(noteMsg({ note: "  dizide    çok \n geçiyor  " }));
  assert.deepEqual(r, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://cinevocab.up.railway.app/api/note");
  assert.equal(calls[0].opt.method, "POST");
  assert.equal(calls[0].opt.headers.Authorization, "Bearer K");
  assert.deepEqual(calls[0].body, { src: "es", dst: "en", word: "amor", note: "dizide çok geçiyor" });
});

test("not 140 karakterde kesilir, boş not (silme) olduğu gibi gider", async () => {
  const { calls, send } = load({ key: "K" });
  await send(noteMsg({ note: "x".repeat(300) }));
  await send(noteMsg({ note: "   " }));
  await send(noteMsg({ note: undefined }));
  assert.equal(calls[0].body.note.length, 140);
  assert.equal(calls[1].body.note, "");
  assert.equal(calls[2].body.note, "");
});

test("bozuk dil çifti, boş ya da sayı olan kelime atlanır; ağa gitmez", async () => {
  const { calls, send } = load({ key: "K" });
  for (const bad of [{ src: "../x" }, { dst: "ENG" }, { src: "es", dst: "es" }, { word: "" }, { word: "   " }, { word: 5 }, { src: undefined }]) {
    const r = await send(noteMsg(bad));
    assert.deepEqual(r, { ok: false });
  }
  assert.equal(calls.length, 0);
});

test("başka bir eklentiden ya da kimliksiz göndericiden gelen mesaj yok sayılır", async () => {
  const { calls, send } = load({ key: "K" });
  assert.equal(await send(noteMsg(), { id: "baska-eklenti" }), undefined);
  assert.equal(await send(noteMsg(), {}), undefined);
  assert.equal(calls.length, 0);
});

test("sunucu hata verirse ok:false döner ve iş patlamaz", async () => {
  const { calls, send } = load({ key: "K" }, { ok: false });
  assert.deepEqual(await send(noteMsg()), { ok: false });
  assert.equal(calls.length, 1);
});

test("kelime 60 karaktere kesilir", async () => {
  const { calls, send } = load({ key: "K" });
  await send(noteMsg({ word: "a".repeat(100) }));
  assert.equal(calls[0].body.word.length, 60);
});

// ---------------------------------------------------------------- giriş sonrası taşıma: notlar
const item = (w, extra = {}) => ({ w, t: "x", ts: 100, ...extra });

test("giriş sonrası cihazdaki notlar dil çifti başına TEK istekle toplu gönderilir", async () => {
  const store = { key: "K", bank: {
    "es>en": [item("amor", { n: "dizide çok geçiyor" }), item("vida"), item("mundo", { n: "bir not" })],
    "fr>en": [item("bonjour", { n: "selam" })],
    "de>en": [item("haus")],                                       // notu yok: istek yok
  } };
  const { ctx, calls } = load(store);
  await ctx.migrateBank();
  const imp = calls.filter((c) => c.url.endsWith("/api/notes/import"));
  assert.equal(imp.length, 2);
  assert.deepEqual(imp[0].body, { src: "es", dst: "en", notes: { amor: "dizide çok geçiyor", mundo: "bir not" } });
  assert.deepEqual(imp[1].body, { src: "fr", dst: "en", notes: { bonjour: "selam" } });
  for (const c of imp) assert.equal(c.opt.headers.Authorization, "Bearer K");
});

test("KURAL: cihazdaki not sunucuya yalnızca 'import' ile gider (sunucu mevcut notu ezmez); cihazdaki not silinmez, değişmez", async () => {
  const store = { key: "K", bank: { "es>en": [item("amor", { n: "cihaz notu" })] } };
  const before = JSON.stringify(store.bank);
  const { ctx, calls } = load(store);
  await ctx.migrateBank();
  assert.equal(noteCalls(calls).length, 0);                         // ezen uç (/api/note) kullanılmaz
  assert.equal(calls.filter((c) => c.url.endsWith("/api/notes/import")).length, 1);
  assert.equal(JSON.stringify(store.bank), before);                 // cihazdaki defter aynen kalır
});

test("anahtar yoksa ya da not yoksa taşıma hiçbir not isteği atmaz", async () => {
  const withNote = { bank: { "es>en": [item("amor", { n: "x" })] } };           // anahtar yok
  const a = load(withNote); await a.ctx.migrateBank();
  assert.equal(a.calls.length, 0);
  const noNote = { key: "K", bank: { "es>en": [item("amor"), item("vida", { n: "" }), item("x", { n: "   " })] } };
  const b = load(noNote); await b.ctx.migrateBank();
  assert.equal(b.calls.filter((c) => c.url.includes("/api/notes")).length, 0);
});

test("altyazı cümlesi ve çevirisi (s, st) hiçbir istekte yoktur; yalnızca kelime, video adı ve not gider", async () => {
  const L = "Lo más importante en la vida es tener amor propio", T = "The most important thing in life is to have self-love.";
  const store = { key: "K", bank: { "es>en": [item("amor", { s: L, st: T, n: "benim notum", ep: "YouTube · Easy Spanish" })] } };
  const { ctx, calls } = load(store);
  await ctx.migrateBank();
  assert.ok(calls.length >= 2);
  for (const c of calls) {
    const raw = c.opt.body;
    assert.ok(!raw.includes("importante") && !raw.includes("self-love"), c.url + " cümle sızdırıyor");
    if (c.url.endsWith("/translate-words")) assert.equal(c.body.sentence, "");
  }
});

test("not taşıması hata verirse kelime taşıma ve işaret yine tamamlanır", async () => {
  const store = { key: "K", bank: { "es>en": [item("amor", { n: "x" })] } };
  const { ctx, calls } = load(store, { failUrl: "/api/notes/import" });
  await ctx.migrateBank();
  assert.ok(calls.some((c) => c.url.endsWith("/translate-words")));
  assert.ok(store.bankSyncTs > 0);
});

test("kelime taşıma hata verse bile notlar önce denenmiş olur; işaret konmaz", async () => {
  const store = { key: "K", bank: { "es>en": [item("amor", { n: "x" })] } };
  const { ctx, calls } = load(store, { failUrl: "/translate-words" });
  await ctx.migrateBank();
  assert.equal(calls.filter((c) => c.url.endsWith("/api/notes/import")).length, 1);
  assert.equal(store.bankSyncTs, undefined);
});

// ---------------------------------------------------------------- bank.cleanNote sunucudaki kuralla aynı
test("bank.cleanNote: boşlukları tekilleştirir, kırpar, 140'ta keser (sunucudaki vocab.clean_note ile aynı kural)", () => {
  const ctx = { self: {} }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(BANK_JS, ctx);
  const B = ctx.self.CVBank;
  assert.equal(B.cleanNote("  a   b \n c "), "a b c");
  assert.equal(B.cleanNote(null), "");
  assert.equal(B.cleanNote("x".repeat(300)).length, 140);
  assert.equal(B.cleanNote(" 　boşluk "), "boşluk");     // JS \s Unicode boşlukları da toplar; Python split() de
});
