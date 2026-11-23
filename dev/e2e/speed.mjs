// Altyazı hızı ölçümü: gerçek eklenti, sahte YouTube sayfası, sahte sunucu (yapay 300 ms gecikmeli).
// Ölçülen: altyazı DOM'a düştüğü andan kutuda çeviriler görünene kadar geçen süre (ms).
//   S1 soğuk: ilk kez görülen cümle (ağ beklenir) · S2 aynı sayfada yeni cümle, kelimeler önceden görülmüş (bellek önbelleği)
//   S3 sayfa yenilendikten sonra aynı cümle (kalıcı önbellek) · S4 sunucu gecikmesiz: yalnızca algılama gecikmesi (kayan/kaymayan altyazı)
// Kullanım: cd dev && node e2e/speed.mjs
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..", "..", "extension");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DICT = { lo: "it", en: "in", la: "the", el: "the", es: "is", más: "more", importante: "important", vida: "life", tener: "to have", amor: "love", propio: "own", casa: "house", grande: "big", pregunta: "question", mundo: "world", feliz: "happy", futuro: "future" };
let LAT = 300;
const calls = [];

const WATCH = `<!doctype html><html><head><title>Easy Spanish 344 - YouTube</title></head><body style="margin:0;background:#000;color:#fff">
<div id="movie_player" style="position:relative;width:960px;height:540px"><video id="v" muted playsinline style="width:960px;height:540px;background:#123"></video>
<div id="cw" class="ytp-caption-window-container" style="position:absolute;bottom:40px;left:0;right:0;text-align:center;font:24px system-ui"><div id="win" class="caption-window"></div></div></div>
<h1 class="ytd-watch-metadata"><yt-formatted-string>Easy Spanish 344</yt-formatted-string></h1>
<script>
const c = document.createElement("canvas"); c.width = 64; c.height = 36; const v = document.getElementById("v"); v.srcObject = c.captureStream(5); v.play().catch(() => {});
window.setCaption = (text, rollup) => { const w = document.getElementById("win"); w.className = "caption-window" + (rollup ? " ytp-caption-window-rollup" : ""); w.textContent = ""; const s = document.createElement("span"); s.className = "ytp-caption-segment"; s.textContent = text; w.appendChild(s); window.__t0 = performance.now(); };
window.waitChips = (words) => new Promise((res) => { const t0 = window.__t0; const tick = () => { const h = document.getElementById("cinevocab-overlay"); const cs = h && h.shadowRoot ? [...h.shadowRoot.querySelectorAll(".chip")] : []; if (cs.length === words.length && cs.every((c, i) => c.dataset.w === words[i] && c.querySelector(".t").textContent !== "…")) return res(Math.round(performance.now() - t0)); if (performance.now() - t0 > 4000) return res(-1); requestAnimationFrame(tick); }; tick(); });
</script></body></html>`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cv-e2e-")), {
  channel: "chromium", headless: true, viewport: { width: 1280, height: 800 }, locale: "en-US",
  args: ["--lang=en-US", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--host-resolver-rules=MAP cinevocab.up.railway.app 127.0.0.1", "--autoplay-policy=no-user-gesture-required"],
});
await ctx.route("https://www.youtube.com/**", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: WATCH }));
await ctx.route("https://cinevocab.up.railway.app/**", async (r) => {
  const req = r.request(), u = new URL(req.url()), post = req.postData() ? JSON.parse(req.postData()) : null;
  calls.push({ p: u.pathname, m: req.method(), t: Date.now(), words: post && post.words });
  if (u.pathname === "/translate-words") {
    await sleep(LAT);
    const results = {}, failed = [];
    (post.words || []).forEach((w) => (DICT[w] ? (results[w] = DICT[w]) : failed.push(w)));
    return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ status: "success", results, known: [], failed, pending: [], sentence_en: "" }) });
  }
  r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "{}" });
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
for (const p of ctx.pages()) if (p.url().includes("welcome")) await p.close();
await sw.evaluate(() => chrome.storage.local.set({ src: "es", dst: "en", enabled: true, startAsk: "no", boxTip: 0, keptFirst: 1 }));
const open = async () => { const p = await ctx.newPage(); p.on("pageerror", (e) => console.log("pageerror:", e.message)); p.on("console", (m) => { if (m.type() === "error") console.log("konsol hata:", m.text().slice(0, 200)); }); await p.goto("https://www.youtube.com/watch?v=speedtest", { waitUntil: "domcontentloaded" }); await sleep(900); return p; };
const run = async (p, text, rollup) => { const words = text.toLowerCase().split(" "); await p.evaluate(([t, r]) => window.setCaption(t, r), [text, rollup]); return p.evaluate((k) => window.waitChips(k), words); };
const res = {};

let page = await open();
res["S1 soğuk (ilk cümle, 300 ms ağ)"] = await run(page, "Lo más importante en la vida", false);
await sleep(600);
res["S2 aynı sayfa, görülmüş kelimeler"] = await run(page, "En la vida lo más importante", false);
await sleep(2800);                      // kalıcı önbelleğin diske yazılması için
await page.close();
page = await open();                    // sayfa yenilendi: bellek önbelleği sıfır
res["S3 sayfa yenilendi, aynı kelimeler (kalıcı önbellek)"] = await run(page, "Lo más importante en la vida", false);
await sleep(600);
LAT = 0;
res["S4a gecikmesiz sunucu, KAYMAYAN altyazı"] = await run(page, "La casa es grande", false);
await sleep(500);
res["S4b gecikmesiz sunucu, KAYAN (otomatik) altyazı"] = await run(page, "El mundo es feliz", true);
await sleep(500);
console.log("\nÖlçüm (ms; küçük = hızlı; -1 = 4 sn'de gelmedi):");
for (const [k, v] of Object.entries(res)) console.log("  " + k.padEnd(58) + String(v).padStart(6));
await ctx.close();
