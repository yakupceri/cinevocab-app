// API isteği content script'ten değil buradan yapılır.
// (Prime sayfası https olduğu için content script'ten http://127.0.0.1'e fetch engellenir.)

const API = "http://127.0.0.1:8000";
const TIMEOUT_MS = 45000; // sunucudaki servis zinciri (5+10+20 sn + kuyruk) sığsın

function post(path, body, sendResponse) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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