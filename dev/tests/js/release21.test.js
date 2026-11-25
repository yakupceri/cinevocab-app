// 2.1 kararlarını koruyan testler: kurulumda kapalı, dil çifti, welcome metinleri, yeni metin anahtarları, güvenlik kuralları.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const EXT = path.resolve(__dirname, "../../../extension");
const read = (f) => fs.readFileSync(path.join(EXT, f), "utf8");
// Yorum satırlarını at (yalnızca "// ..." ve boşluktan sonra gelenler; "https://" gibi dizgilere dokunmaz)
const code = (f) => read(f).replace(/(^|\s)\/\/.*$/gm, "$1");
const CVL = require(path.join(EXT, "lang.js"));

test("kurulumda çeviri AÇILMAZ: background.js hiçbir yerde enabled:true yazmaz", () => {
  assert.equal(/enabled\s*:\s*true/.test(code("background.js")), false);
});

test("welcome düğmesi çeviriyi açar (onay), popup ve içerik betiği de açma yolunu korur", () => {
  assert.match(read("welcome.js"), /enabled:\s*true/);
  assert.match(read("content.js"), /startNow/);   // videonun üstündeki "Çeviriyi başlat" düğmesi
});

test("defaultPair: çeviri tarayıcı dilinde, altyazı İngilizce (İngilizceyse İspanyolca)", () => {
  assert.deepEqual(CVL.defaultPair("en-US"), { src: "es", dst: "en" });
  assert.deepEqual(CVL.defaultPair("tr-TR"), { src: "en", dst: "tr" });
  assert.deepEqual(CVL.defaultPair("es-MX"), { src: "en", dst: "es" });
  assert.deepEqual(CVL.defaultPair("pt-BR"), { src: "en", dst: "pt" });
  assert.deepEqual(CVL.defaultPair("zh-CN"), { src: "es", dst: "en" });   // desteklenmeyen dil -> İngilizce
  assert.deepEqual(CVL.defaultPair(undefined), { src: "es", dst: "en" });
});

test("defaultPair background.js'teki satır içi kuralla aynı sonucu verir", () => {
  const bg = read("background.js");
  assert.match(bg, /dst === "en" \? "es" : "en"/);                     // aynı kural
  const list = bg.match(/const LANGS = \[([^\]]+)\]/)[1].replace(/["\s]/g, "").split(",");
  assert.deepEqual(list.sort(), [...CVL.LANG_CODES].sort());            // aynı 16 dil
});

test("startUrl: altyazı filtreli YouTube araması, dil adı doğru", () => {
  const u = CVL.startUrl("es");
  assert.match(u, /^https:\/\/www\.youtube\.com\/results\?search_query=easy%20Spanish%20street%20interviews/);
  assert.match(u, /&sp=EgIoAQ%253D%253D$/);
  assert.match(CVL.startUrl("fr"), /easy%20French%20/);
  assert.match(CVL.startUrl("xx"), /easy%20English%20/);   // bilinmeyen dil -> İngilizce
});

function loadWelcome(language) {
  const els = {};
  const mk = () => ({ textContent: "", value: "", setAttribute() {}, replaceChildren() {}, onclick: null, onchange: null });
  const ctx = {
    navigator: { language }, location: {}, CVL,
    chrome: { storage: { local: { get(_k, cb) { cb({}); }, set(o, cb) { ctx.__set = o; cb(); } } } },
    document: { documentElement: { lang: "" }, getElementById: (id) => (els[id] = els[id] || mk()), createElement: () => ({ value: "", textContent: "" }) },
  };
  vm.createContext(ctx);
  // lang.js dili genel navigator'dan okur (gerçek tarayıcıda welcome.js ile aynı kaynak): testte ikisini birlikte ayarla
  const saved = Object.getOwnPropertyDescriptor(globalThis.navigator, "language");
  Object.defineProperty(globalThis.navigator, "language", { value: language, configurable: true });
  try { vm.runInContext(read("welcome.js") + "\n;globalThis.__T = T;", ctx); }
  finally { if (saved) Object.defineProperty(globalThis.navigator, "language", saved); else delete globalThis.navigator.language; }
  return { T: ctx.__T, els, doc: ctx.document, ctx };
}

test("welcome: 9 dilin hepsinde tüm metinler dolu, düğme metninde {0} var", () => {
  const { T } = loadWelcome("en-US");
  assert.deepEqual(Object.keys(T).sort(), ["de", "en", "es", "fr", "hi", "id", "it", "pt", "tr"]);
  for (const [lang, o] of Object.entries(T)) {
    for (const k of ["title", "sub", "s1", "s2", "btn", "lSrc", "lDst", "fine", "priv"]) assert.ok(o[k] && o[k].length > 2, `${lang}.${k} boş`);
    assert.ok(o.btn.includes("{0}"), `${lang}.btn içinde {0} yok`);
  }
});

test("welcome: tarayıcı diline göre metin seçer, bilinmeyen dil İngilizce", () => {
  assert.match(loadWelcome("tr-TR").els.title.textContent, /öğren/);
  assert.match(loadWelcome("es-MX").els.title.textContent, /Aprende/);
  assert.match(loadWelcome("ja-JP").els.title.textContent, /Learn the words from what you watch/);   // bilinmeyen dil: İngilizce söz
  assert.equal(loadWelcome("tr-TR").els.title.textContent, "İzlediğin dizinin kelimelerini öğren.");     // marka sözü (mobil uygulamayla aynı)
});

test("welcome: düğme dil çiftine göre yazılır (İngilizce tarayıcı -> İspanyolca video)", () => {
  assert.equal(loadWelcome("en-US").els.go.textContent, "Find Spanish videos with captions");
  assert.match(loadWelcome("tr-TR").els.go.textContent, /Altyazılı İngilizce videolar bul/);
});

test("yeni metin anahtarları 9 arayüz dilinin hepsinde var ve İngilizceden farklı", () => {
  vm.runInThisContext(read("popup-i18n.js"));
  const keys = ["st1off", "offHint", "bankHead", "bankSub", "bankEmpty", "bankBack", "bankDel", "bankRemoved", "firstKept", "keptN", "ovHint"];
  const langs = ["en", "tr", "es", "fr", "it", "de", "pt", "hi", "id"];
  const saved = Object.getOwnPropertyDescriptor(globalThis.navigator, "language");
  const text = {};
  try {
    for (const l of langs) {
      Object.defineProperty(globalThis.navigator, "language", { value: l, configurable: true });
      text[l] = {}; for (const k of keys) { const v = CVL.t(k, 3); assert.notEqual(v, k, `${l}.${k} yok`); text[l][k] = v; }
    }
  } finally { if (saved) Object.defineProperty(globalThis.navigator, "language", saved); else delete globalThis.navigator.language; }
  for (const l of langs.slice(1)) for (const k of keys) assert.notEqual(text[l][k], text.en[k], `${l}.${k} İngilizceyle aynı (çevrilmemiş)`);
  assert.match(text.en.keptN, /3 kept/);
});

test("hesaba taşıma sözü kodla uyumlu: popup metni 'taşınır' der, background.js migrateBank var, giriş değişince tetiklenir", () => {
  assert.match(read("background.js"), /async function migrateBank/);
  assert.match(read("background.js"), /ch\.key && ch\.key\.newValue && !ch\.key\.oldValue\) migrateBank/);
  vm.runInThisContext(read("popup-i18n.js"));
  assert.match(CVL.t("bankSub"), /move|account|hesap|cuenta/i);
});

test("içerik betikleri güvenli: innerHTML, outerHTML, insertAdjacentHTML, document.write, eval yok", () => {
  const bad = /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function)\b/;
  for (const f of ["content.js", "yt-import.js", "bank.js", "welcome.js"]) assert.equal(bad.test(code(f)), false, f);
});

test("popup ve welcome dışarıdan yazı tipi, görsel ya da betik yüklemez", () => {
  for (const f of ["popup.html", "welcome.html"]) {
    const html = read(f);
    assert.equal(/<script[^>]+src=["']https?:/i.test(html), false, f + " dış betik");
    assert.equal(/<link[^>]+href=["']https?:/i.test(html), false, f + " dış stil");
    assert.equal(/@import|url\(["']?https?:/i.test(html), false, f + " dış kaynak");
  }
});

test("welcome: ana düğme çeviriyi açar (onay), dil çiftini yazar ve altyazılı video aramasına gider", () => {
  const w = loadWelcome("en-US");
  w.els.go.onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(w.ctx.__set)), { enabled: true, src: "es", dst: "en", startAsk: null });
  assert.equal(w.ctx.location.href, CVL.startUrl("es"));
});

test("welcome: düğmeye basılmadan çeviri açılmaz (sayfa yüklenince storage'a enabled yazılmaz)", () => {
  const w = loadWelcome("en-US");
  assert.equal(w.ctx.__set, undefined);
});

test("welcome: Türkçe tarayıcı -> altyazı İngilizce, çeviri Türkçe, video İngilizce aranır", () => {
  const w = loadWelcome("tr-TR");
  w.els.go.onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(w.ctx.__set)), { enabled: true, src: "en", dst: "tr", startAsk: null });
  assert.match(w.ctx.location.href, /easy%20English%20street%20interviews/);
});
