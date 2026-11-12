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

// Simge üzerinde açık/kapalı rozeti
function badge(on) {
  try {
    chrome.action.setBadgeText({ text: on ? "ON" : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#2f9e6d" });
  } catch (e) {}
}
chrome.storage.local.get("enabled", (r) => badge(!!(r && r.enabled)));
chrome.runtime.onInstalled.addListener(() => chrome.storage.local.get("enabled", (r) => badge(!!(r && r.enabled))));
chrome.runtime.onStartup && chrome.runtime.onStartup.addListener(() => chrome.storage.local.get("enabled", (r) => badge(!!(r && r.enabled))));
chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.enabled) badge(!!ch.enabled.newValue); });

// İlk kurulumda karşılama sayfasını aç (güncellemede açılmaz)
chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});


// ---------- Diğer sitelerde çalıştırma ("Bu sitede aç") ----------
// Açılır pencere izni (kullanıcı hareketiyle) alır; burada içerik betiği kalıcı kaydedilir ve açık sekmeye hemen yüklenir.
const CS_FILES = ["lang.js", "content.js"];
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
    const r = await fetch(API + "/api/ext/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: tok, nonce }) });
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
