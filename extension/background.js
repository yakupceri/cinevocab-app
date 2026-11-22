// API isteği content script'ten değil buradan yapılır.
// (Prime sayfası https olduğu için content script'ten http://127.0.0.1'e fetch engellenir.)

const API = "https://cinevocab.up.railway.app";
const TIMEOUT_MS = 45000; // sunucudaki servis zinciri (5+10+20 sn + kuyruk) sığsın

function post(path, body, sendResponse) {
  chrome.storage.local.get(["key", "src", "dst", "enabled"], ({ key, src, dst, enabled }) => {
    if (!enabled) { sendResponse({ status: "disabled" }); return; } // kapalıyken sunucuya hiç istek gitmez
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    fetch(API + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: "Bearer " + key } : {}),
      },
      body: JSON.stringify({ ...body, src: src || "tr", dst: dst || "en" }),
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => sendResponse(data))
      .catch((err) => {
        console.error("API Hatası:", err);
        sendResponse({ status: "error", message: String(err) });
      })
      .finally(() => clearTimeout(timer));
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translateWords") {
    post(
      "/translate-words",
      {
        words: request.words,
        gen: request.gen || 0,
        lookup_only: !!request.lookupOnly,
        sentence: request.sentence || "",
        episode: request.episode || "",
        thumb: request.thumb || "",
      },
      sendResponse
    );
    return true; // asenkron cevap için şart
  }
  if (request.action === "addWord") {
    post("/add-word", { eng: request.eng, gen: request.gen || 0 }, sendResponse);
    return true;
  }
});

// Simge üzerinde rozet: tekrar bekleyen kelime varsa SAYI (sarı), yoksa çeviri açıksa "ON" (yeşil).
// Yalnızca sayı: bildirim, ses, metin yok. Hesapsız kullanıcının cihazdaki defterine bakar (bank.js + srs.js); en az 4 kelime gerekir.
try { importScripts("bank.js", "srs.js"); } catch (e) { /* rozet yalnızca ON/boş çalışır */ }
async function refreshBadge() {
  try {
    const r = await chrome.storage.local.get(["enabled", "src", "dst", "bank", "key"]);
    let n = 0;
    if (!r.key && typeof CVSrs !== "undefined" && typeof CVBank !== "undefined") {
      const s = CVSrs.stats(CVBank.list(r.bank, (r.src || "en") + ">" + (r.dst || "en")), CVSrs.dayOf());
      if (s.usable >= 4) n = s.ready;
    }
    if (n > 0) {
      chrome.action.setBadgeText({ text: n > 99 ? "99+" : String(n) });
      chrome.action.setBadgeBackgroundColor({ color: "#F0CB4A" });
      if (chrome.action.setBadgeTextColor) chrome.action.setBadgeTextColor({ color: "#1A1500" });
    } else {
      chrome.action.setBadgeText({ text: r.enabled ? "ON" : "" });
      chrome.action.setBadgeBackgroundColor({ color: "#2f9e6d" });
      if (chrome.action.setBadgeTextColor) chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
    }
  } catch (e) {}
}
refreshBadge();
chrome.runtime.onInstalled.addListener(() => refreshBadge());
chrome.runtime.onStartup && chrome.runtime.onStartup.addListener(() => refreshBadge());
chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && (ch.enabled || ch.bank || ch.src || ch.dst || ch.key)) refreshBadge(); });

// İlk kurulumda karşılama sayfasını aç (güncellemede açılmaz)
chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason !== "install") return;
  // 2.1: Yeni kurulumda çeviri KAPALI başlar. Altyazı cümlesi sunucuya gidiyor; mağaza metni ve gizlilik sayfası
  // "sen açtığında" diyor, bu yüzden açma işi kullanıcının bilinçli bir tıkıdır: welcome sayfasındaki ana düğme
  // (enabled: true yazar) ya da videonun üstündeki "Çeviriyi başlat" düğmesi. Burada hiçbir şey açılmaz.
  // Başlangıç dilleri tarayıcı diline göre seçilir (eskiden herkes için "Türkçe altyazı -> İngilizce" idi):
  // çeviriler kullanıcının kendi dilinde, altyazı dili İngilizce (kendi dili İngilizce ise İspanyolca).
  // Yanlışsa kutudaki tek tıklık düğme ya da açılır pencere düzeltir. Güncellemede dokunulmaz.
  chrome.storage.local.get(["src", "dst"], (r) => {
    if (r && (r.src || r.dst)) return;
    const LANGS = ["tr", "en", "fr", "it", "de", "es", "pt", "ru", "ar", "ro", "ja", "hi", "id", "pl", "nl", "ko"];
    let ui = "en";
    try { ui = String((chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || self.navigator.language || "en").slice(0, 2).toLowerCase(); } catch (e) {}
    const dst = LANGS.includes(ui) ? ui : "en";
    chrome.storage.local.set({ src: dst === "en" ? "es" : "en", dst });
  });
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  pickUpInvite();
});

// Arkadaş daveti: kişi sitemizdeki davet bağlantısına (/?ref=ad) tıklayıp eklentiyi kurduysa, açık duran site
// sekmesinden davet edenin kullanıcı adı okunur. Yalnızca kendi sitemizin sekmesine bakılır (başka siteye izin yok).
async function pickUpInvite() {
  try {
    const tabs = await chrome.tabs.query({ url: API + "/*" });
    for (const t of tabs) {
      const [r] = await chrome.scripting.executeScript({ target: { tabId: t.id }, func: () => { try { return localStorage.getItem("cv-ref") || ""; } catch (e) { return ""; } } });
      if (r && /^[\p{L}\p{N}_]{3,16}$/u.test(r.result || "")) { await chrome.storage.local.set({ ref: r.result }); return; }
    }
  } catch (e) {}
}
function inviteRef() { return new Promise((res) => chrome.storage.local.get("ref", (r) => res(r && /^[\p{L}\p{N}_]{3,16}$/u.test(r.ref || "") ? r.ref : ""))); }


// ---------- Diğer sitelerde çalıştırma ("Bu sitede aç") ----------
// Açılır pencere izni (kullanıcı hareketiyle) alır; burada içerik betiği kalıcı kaydedilir ve açık sekmeye hemen yüklenir.
const CS_FILES = ["lang.js", "bank.js", "content.js"];
// Güncellemede, kullanıcının "Bu sitede aç" ile önceden kaydettiği betik listeleri yeni dosya listesine çekilir (bank.js eklendi).
chrome.runtime.onInstalled.addListener(async (d) => {
  if (d.reason !== "update") return;
  try {
    const have = await chrome.scripting.getRegisteredContentScripts();
    const mine = have.filter((s) => String(s.id).startsWith("cv-")).map((s) => ({ id: s.id, js: CS_FILES }));
    if (mine.length) await chrome.scripting.updateContentScripts(mine);
  } catch (e) { console.warn("Kayıtlı betik listesi yenilenemedi:", e); }
});
async function enableSite(origins, tabId) {
  const id = "cv-" + origins[0].replace(/[^a-z0-9]/gi, "");
  try {
    const have = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (have.length) await chrome.scripting.unregisterContentScripts({ ids: [id] });
    await chrome.scripting.registerContentScripts([{
      id, matches: origins, js: CS_FILES, allFrames: true, matchAboutBlank: true,
      runAt: "document_idle", persistAcrossSessions: true,
    }]);
  } catch (e) {
    // eşzamanlı iki çağrı aynı kimliği kaydetmeye çalışmış olabilir: kayıt varsa sorun yok
    const have2 = await chrome.scripting.getRegisteredContentScripts({ ids: [id] }).catch(() => []);
    if (!have2.length) { console.error("Kayıt hatası:", e); return { ok: false }; }
  }
  if (tabId == null) return { ok: true };
  try {
    const res = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: () => !!window.__cvLoaded });
    const todo = res.filter((r) => !r.result).map((r) => r.frameId);
    if (todo.length) await chrome.scripting.executeScript({ target: { tabId, frameIds: todo }, files: CS_FILES });
  } catch (e) { console.warn("Anında yükleme olmadı (sayfayı yenile):", e); }
  return { ok: true };
}
// İzin penceresi açılır pencereyi kapatsa bile (Chrome'da olur) izin verilince site yine de etkinleşsin
chrome.permissions.onAdded.addListener(async (p) => {
  const o = (p.origins || []).filter((x) => !/cinevocab\.up\.railway\.app|primevideo|youtube|udemy|netflix/.test(x));
  if (!o.length) return;
  let tabId = null;
  try { const tabs = await chrome.tabs.query({ url: o }); if (tabs[0]) tabId = tabs[0].id; } catch (e) {}
  enableSite(o, tabId);
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "enableSite" && Array.isArray(request.origins) && request.tabId != null) {
    enableSite(request.origins, request.tabId).then(sendResponse);
    return true;
  }
});


// ---------- Google ile giriş ----------
// Açılır pencere Google penceresi açılınca kapanabildiği için akış burada yürür; sonuç chrome.storage'a yazılır.
// Yalnızca "openid profile" istenir: e-posta alınmaz. Rastgele nonce hem burada hem sunucuda denetlenir.
async function googleLogin() {
  let cfg;
  try { cfg = await (await fetch(API + "/api/ext/config")).json(); } catch (e) { return { error: "net", status: 0 }; }
  if (!cfg || !cfg.google) return { error: "off" };
  const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: cfg.google, response_type: "id_token", redirect_uri: chrome.identity.getRedirectURL(),
    scope: "openid profile", nonce, prompt: "select_account",
  });
  let back;
  try { back = await chrome.identity.launchWebAuthFlow({ url, interactive: true }); }
  catch (e) { return { error: /did not approve|cancel|closed/i.test(String(e && e.message)) ? "cancel" : "fail" }; }
  let tok = "";
  try {
    tok = new URLSearchParams(new URL(back).hash.slice(1)).get("id_token") || "";
    const body = JSON.parse(atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (body.nonce !== nonce) return { error: "fail" };
  } catch (e) { return { error: "fail" }; }
  try {
    const r = await fetch(API + "/api/ext/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: tok, nonce, ref: await inviteRef() }) });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || !d.key) return { error: "fail", status: r.status, detail: d && d.detail };
    // Yeni hesapsa açılır pencere kullanıcı adını seçtirir (pencere kapanmış olsa bile bir sonraki açılışta)
    await chrome.storage.local.set({ key: d.key, noAuto: false, authSkip: true, ...(d.new ? { pickName: d.username } : {}) });
    return { key: d.key, new: !!d.new, username: d.username };
  } catch (e) { return { error: "net", status: 0 }; }
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "googleLogin" && sender.id === chrome.runtime.id && !sender.tab) {
    googleLogin().then(sendResponse);
    return true;
  }
});

// ---------- Videodan kelime ekleme ----------
// Açılır pencere kapansa bile sürsün diye burada yürür; ilerleme chrome.storage'daki "imp" kaydına yazılır.
// Kelimeler mevcut /translate-words ile 30'ar 30'ar çevrilir ve (giriş yapılmışsa) kullanıcının listesine, video başlığıyla eklenir.
let importing = false;
async function importWords(job) {
  const words = (job.words || []).filter((w) => typeof w === "string").slice(0, 150);
  const episode = String(job.episode || "").slice(0, 80), thumb = String(job.thumb || "").slice(0, 300);
  const src = String(job.src || "en"), dst = String(job.dst || "tr");
  const { key } = await chrome.storage.local.get("key");
  const state = { state: "run", done: 0, total: words.length, added: 0, episode, familiar: Number(job.familiar) || 0 };
  const save = () => chrome.storage.local.set({ imp: { ...state, ts: Date.now() } });
  await save();
  try {
    for (let i = 0; i < words.length; i += 30) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const r = await fetch(API + "/translate-words", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(key ? { Authorization: "Bearer " + key } : {}) },
          body: JSON.stringify({ words: words.slice(i, i + 30), src, dst, gen: 0, lookup_only: false, sentence: "", episode, thumb }),
          signal: ctrl.signal,
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const d = await r.json();
        state.added += Object.keys((d && d.results) || {}).length;
      } finally { clearTimeout(timer); }
      state.done = Math.min(i + 30, words.length);
      await save();
    }
    state.state = "done";
  } catch (e) {
    console.error("İçe aktarma hatası:", e);
    state.state = "error";
  }
  await save();
  importing = false;
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "importWords" || sender.id !== chrome.runtime.id || sender.tab) return;
  if (importing) { sendResponse({ ok: false, busy: true }); return; }
  importing = true;
  importWords(request);
  sendResponse({ ok: true });
});

// ---------- Cihazdaki defter -> hesap ----------
// Hesapsız kullanıcının videoda "tuttuğu" kelimeler cihazdaki defterdedir (bank.js). Giriş yapılınca ya da hesap açılınca bunlar
// hesabın kelime listesine taşınır: "Yedekle" sözünün gerçek karşılığı. Altyazı metni değil, yalnızca kelimeler ve video adı gider.
// Taşınanlar bankSyncTs ile işaretlenir; sonraki turda yalnızca bu zamandan yeni tutulanlar taşınır. Hata olursa işaret konmaz,
// bir sonraki girişte yeniden denenir (sunucuda aynı kelime iki kez eklenmez).
let migrating = false;
async function migrateBank() {
  if (migrating) return;
  migrating = true;
  try {
    const { key, bank, bankSyncTs } = await chrome.storage.local.get(["key", "bank", "bankSyncTs"]);
    if (!key || !bank || typeof bank !== "object") return;
    const since = Number(bankSyncTs) || 0, started = Date.now();
    for (const pair of Object.keys(bank)) {
      const m = /^([a-z]{2})>([a-z]{2})$/.exec(pair);
      if (!m || !Array.isArray(bank[pair])) continue;
      const byEp = new Map();
      for (const it of bank[pair]) {
        if (!it || typeof it.w !== "string" || !(it.ts > since)) continue;
        const ep = String(it.ep || "").slice(0, 80);
        if (!byEp.has(ep)) byEp.set(ep, []);
        byEp.get(ep).push(it.w);
      }
      for (const [episode, words] of byEp) {
        for (let i = 0; i < words.length; i += 30) {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
          try {
            const r = await fetch(API + "/translate-words", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
              body: JSON.stringify({ words: words.slice(i, i + 30), src: m[1], dst: m[2], gen: 0, lookup_only: false, sentence: "", episode, thumb: "" }),
              signal: ctrl.signal,
            });
            if (!r.ok) throw new Error("HTTP " + r.status);
          } finally { clearTimeout(timer); }
        }
      }
    }
    await chrome.storage.local.set({ bankSyncTs: started });
  } catch (e) {
    console.warn("Defter hesaba taşınamadı (sonraki girişte yeniden denenir):", e);
  } finally { migrating = false; }
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === "local" && ch.key && ch.key.newValue && !ch.key.oldValue) migrateBank(); // giriş yapıldı ya da hesap açıldı
});

// ---------- Yıldızlı kelime: giriş yapılmışsa hesaba da yazılır ----------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "star" || typeof request.word !== "string") return;
  chrome.storage.local.get(["key", "src", "dst"], ({ key, src, dst }) => {
    if (!key) { sendResponse({ ok: false }); return; }
    fetch(API + "/api/star", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ src: src || "tr", dst: dst || "en", word: request.word.slice(0, 60), on: !!request.on }) })
      .then((r) => sendResponse({ ok: r.ok })).catch(() => sendResponse({ ok: false }));
  });
  return true;
});
