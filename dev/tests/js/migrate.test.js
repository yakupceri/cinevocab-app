// Cihazdaki defter -> hesap taşıması (extension/background.js migrateBank). Servis çalışanı sahte chrome ve sahte ağla çalıştırılır.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SRC = fs.readFileSync(path.resolve(__dirname, "../../../extension/background.js"), "utf8");

function load(store, { ok = true } = {}) {
  const calls = [];
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
      storage: { local, onChanged: ev }, runtime: { onMessage: ev, onInstalled: ev, onStartup: ev, id: "x", getURL: (p) => p },
      action: { setBadgeText: noop, setBadgeBackgroundColor: noop }, permissions: { onAdded: ev }, scripting: {}, tabs: {}, identity: {},
    },
    fetch: async (url, opt) => { calls.push({ url, opt, body: JSON.parse(opt.body) }); return { ok }; },
    setTimeout, clearTimeout, AbortController, console: { log() {}, warn() {}, error() {} },
    self: { navigator: { language: "en" } }, navigator: { language: "en" },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, calls, store };
}

const word = (w, ts, ep) => ({ w, t: "x", ts, ...(ep ? { ep } : {}) });

test("giriş sonrası defterdeki kelimeler video adına göre gruplanıp 30'arlı paketlerle hesaba gönderilir", async () => {
  const many = Array.from({ length: 65 }, (_, i) => word("k" + i, 100 + i, "YouTube · Easy Spanish"));
  const store = { key: "K", bank: { "es>en": [...many, word("otro1", 200, "Udemy · Kurs"), word("otro2", 201, "Udemy · Kurs")] } };
  const { ctx, calls } = load(store);
  await ctx.migrateBank();
  assert.equal(calls.length, 3 + 1);
  assert.deepEqual(calls.map((c) => c.body.words.length), [30, 30, 5, 2]);
  for (const c of calls) {
    assert.equal(c.url, "https://cinevocab.up.railway.app/translate-words");
    assert.equal(c.opt.headers.Authorization, "Bearer K");
    assert.equal(c.body.lookup_only, false);
    assert.equal(c.body.sentence, "");        // altyazı metni asla gitmez
    assert.equal(c.body.src, "es"); assert.equal(c.body.dst, "en");
  }
  assert.equal(calls[0].body.episode, "YouTube · Easy Spanish");
  assert.equal(calls[3].body.episode, "Udemy · Kurs");
  assert.ok(store.bankSyncTs > 0);
});

test("ikinci çağrıda zaten taşınmış kelimeler tekrar gönderilmez, yeni tutulan gönderilir", async () => {
  const store = { key: "K", bank: { "es>en": [word("a", 100), word("b", 101)] } };
  const { ctx, calls } = load(store);
  await ctx.migrateBank();
  assert.equal(calls.length, 1);
  await ctx.migrateBank();
  assert.equal(calls.length, 1);
  store.bank["es>en"].unshift(word("yeni", Date.now() + 5));
  await ctx.migrateBank();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].body.words, ["yeni"]);
});

test("giriş yoksa ya da defter boşsa hiçbir istek atılmaz", async () => {
  for (const store of [{ bank: { "es>en": [word("a", 1)] } }, { key: "K" }, { key: "K", bank: {} }, { key: "K", bank: "bozuk" }]) {
    const { ctx, calls } = load(store);
    await ctx.migrateBank();
    assert.equal(calls.length, 0);
  }
});

test("sunucu hata verirse işaret konmaz (sonraki girişte yeniden denenir)", async () => {
  const store = { key: "K", bank: { "es>en": [word("a", 1)] } };
  const { ctx } = load(store, { ok: false });
  await ctx.migrateBank();
  assert.equal(store.bankSyncTs, undefined);
});

test("bozuk dil çifti adı ve bozuk kayıtlar atlanır", async () => {
  const store = { key: "K", bank: { "../evil": [word("a", 1)], "es>en": [null, { w: 5, ts: 1 }, word("ok", 1)] } };
  const { ctx, calls } = load(store);
  await ctx.migrateBank();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body.words, ["ok"]);
});
