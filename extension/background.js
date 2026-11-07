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
