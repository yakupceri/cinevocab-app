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
