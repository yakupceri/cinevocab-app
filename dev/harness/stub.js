/* Gelistirme ortami: sahte chrome API'si. Gercek eklenti kodu (popup.js, welcome.js, content.js) bununla calisir.
   Sahne: ?scene=new (taze kurulum) | on (acik, hesapsiz) | bank (acik + 6 tutulan kelime)
   ?ui=tr|es|en tarayici dilini, ?tab=yt acik sekmeyi YouTube gibi gosterir. Veri yalnizca bellekte tutulur. */
(function () {
  const q = new URLSearchParams(location.search);
  const scene = q.get("scene") || "new";
  const ui = q.get("ui");
  if (ui) { try { Object.defineProperty(navigator, "language", { value: ui, configurable: true }); } catch (e) {} }

  const BANK = { "es>en": [
    { w: "propio", t: "own", ts: 6, ep: "Easy Spanish 344", vt: 42 },
    { w: "amor", t: "love", ts: 5, ep: "Easy Spanish 344", vt: 42 },
    { w: "importante", t: "important", ts: 4, ep: "Easy Spanish 344", vt: 38 },
    { w: "pregunta", t: "question", ts: 3, ep: "Easy Spanish 344", vt: 31 },
    { w: "mundo", t: "world", ts: 2, ep: "Easy Spanish 344", vt: 24 },
    { w: "feliz", t: "happy", ts: 1, ep: "Easy Spanish 344", vt: 17 },
  ] };
  const BOX = { h: "c", hx: 0.5, v: "b", vy: 0.88, s: 1, op: 0.88, locked: false, w: 0, c: 5 };
  const PRESET = {
    new: { src: "es", dst: "en" },   // taze kurulum: background.js onInstalled dil çiftini yazar, çeviri KAPALI (enabled yok)
    on: { enabled: true, src: "es", dst: "en", boxTip: 0, box: BOX },
    bank: { enabled: true, src: "es", dst: "en", boxTip: 1, keptFirst: 1, bank: BANK, stars: { "es>en": Object.values(BANK)[0].map((x) => x.w) }, box: BOX },
  };
  const store = JSON.parse(JSON.stringify(PRESET[scene] || {}));
  if (q.get("kf")) store.keptFirst = 1;   // ?kf=1: "ilk kelime tutuldu" notu çıkmasın (reklam karesi)
  if (q.get("bs") && store.box) store.box.s = +q.get("bs");   // ?bs=1.7: dikey video için kutu ölçeği
  if (q.get("bankN") && store.bank) store.bank["es>en"] = store.bank["es>en"].slice(0, +q.get("bankN"));
  if (q.get("src")) store.src = q.get("src");   // ?src=ar&dst=en: sağdan sola dil denemesi
  if (q.get("dst")) store.dst = q.get("dst");
  const listeners = [];
  const fire = (ch) => listeners.forEach((f) => { try { f(ch, "local"); } catch (e) { console.error(e); } });
  const pick = (keys) => {
    if (keys == null) return JSON.parse(JSON.stringify(store));
    if (typeof keys === "string") keys = [keys];
    const o = Array.isArray(keys) ? {} : { ...keys };
    for (const k of Array.isArray(keys) ? keys : Object.keys(keys)) if (k in store) o[k] = JSON.parse(JSON.stringify(store[k]));
    return o;
  };
  const local = {
    get(keys, cb) { const r = pick(keys); if (cb) { setTimeout(() => cb(r), 0); return; } return Promise.resolve(r); },
    set(obj, cb) {
      const ch = {};
      for (const k in obj) { ch[k] = { oldValue: store[k], newValue: JSON.parse(JSON.stringify(obj[k])) }; store[k] = JSON.parse(JSON.stringify(obj[k])); }
      setTimeout(() => { fire(ch); if (cb) cb(); }, 0); return Promise.resolve();
    },
    remove(keys, cb) { const ch = {}; for (const k of [].concat(keys)) { ch[k] = { oldValue: store[k] }; delete store[k]; } setTimeout(() => { fire(ch); if (cb) cb(); }, 0); return Promise.resolve(); },
  };

  const SENT = {
    "Lo más importante en la vida es tener amor propio": "The most important thing in life is to have self-love.",
    "No sé qué decir cuando me preguntan por el futuro": "I don't know what to say when they ask me about the future.",
    "أهم شيء في الحياة هو حب النفس": "The most important thing in life is self-love.",
  };
  const DICT = { "أهم": "most important", "شيء": "thing", "الحياة": "life", "حب": "love", "النفس": "self", más: "more", importante: "important", vida: "life", tener: "to have", amor: "love", propio: "own", sé: "I know", decir: "to say", cuando: "when", preguntan: "they ask", futuro: "future", qué: "what", por: "for", feliz: "happy", mundo: "world", pregunta: "question" };
  const TAB = q.get("tab") === "yt" ? "https://www.youtube.com/watch?v=mECAxJYzj0Y" : "https://example.com/";

  const noop = () => {};
  const evt = { addListener: noop, removeListener: noop };
  window.chrome = {
    storage: { local, onChanged: { addListener: (f) => listeners.push(f) } },
    runtime: {
      id: "harness", lastError: undefined, onMessage: evt, onInstalled: evt,
      getURL: (p) => "/" + p, getManifest: () => ({ version: "2.1.0" }),
      sendMessage(msg, cb) {
        let r = {};
        if (msg && msg.action === "translateWords") {
          const results = {}, failed = []; (msg.words || []).forEach((w) => { if (DICT[w]) results[w] = DICT[w]; else failed.push(w); });
          r = { status: "success", results, known: [], failed, pending: [], sentence_en: SENT[msg.sentence] || "" };
        }
        if (cb) setTimeout(() => cb(r), 80);
      },
    },
    tabs: {
      query(_o, cb) { cb([{ id: 1, url: TAB }]); },
      // Gerçekte YouTube sekmesinde içerik betiği manifest'ten yüklü olduğu için ping her zaman cevap verir (çeviri kapalı olsa da)
      sendMessage(_id, _m, cb) { if (cb) cb(TAB.includes("youtube.com") ? { ok: true, seenAt: scene === "new" ? 0 : Date.now() - 2000 } : undefined); },
      create(o) { console.log("tabs.create", o); },
    },
    scripting: { executeScript(_o, cb) { if (cb) cb([]); } },
    permissions: { contains(_o, cb) { cb(false); }, request(_o, cb) { cb(true); }, onAdded: evt },
    i18n: { getUILanguage: () => navigator.language },
    action: { setBadgeText: noop, setBadgeBackgroundColor: noop },
  };
  const realFetch = window.fetch.bind(window);
  window.fetch = (url, opt) => {
    if (/\/api\/ext\/config/.test(String(url))) return Promise.resolve(new Response(JSON.stringify({ google: "", mail: false }), { status: 200, headers: { "Content-Type": "application/json" } }));
    if (/cinevocab\.up\.railway\.app/.test(String(url))) return Promise.reject(new TypeError("stub: ağ kapalı"));
    return realFetch(url, opt);
  };
  window.__store = store; // denetim: sayfadan okunabilsin
})();
