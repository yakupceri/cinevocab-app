// "Çeviriyi başlat" sorusu ve ana sayfa altyazısı: gerçek eklenti, gerçek Chromium, sahte YouTube ve sahte sunucu.
// Doğrulanan davranışlar:
//  1) Soru yalnızca HİÇ seçim yapmamış kullanıcıya, izleme sayfasında, video oynarken ve altyazı varken çıkar; en çok BİR kez.
//  2) Eklentiyi kapatmış (enabled: false) ya da "şimdi değil" demiş kullanıcıya hiç çıkmaz.
//  3) Ana sayfada (gizli oynatıcı + küçük resim önizlemesi altyazılı oynarken) ne soru ne altyazı kutusu ne "altyazıyı aç" ipucu çıkar.
//  4) İzleme sayfasındaki yan önizleme altyazısı okunmaz; asıl oynatıcının altyazısı okunur ve çeviri çalışır.
// Sahte sayfa yapısı gerçek YouTube'dan alındı (dev/e2e/yt-dom-probe.mjs): ana sayfada da gizli bir #movie_player vardır (genişlik 0).
// Kullanım: cd dev && node e2e/ask-start.mjs   (hata varsa çıkış kodu 1)
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..", "..", "extension");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DICT = { lo: "it", más: "more", importante: "important", en: "in", la: "the", vida: "life" };
const CAP = "Lo más importante en la vida";
let serverCalls = 0;

// Sahte video: tuval her 100 ms'de yeniden çizilir, böylece video gerçekten "oynar" (readyState > 2); durağan tuval kare üretmez
const VIDEO_JS = (id) => `{ const c = document.createElement("canvas"); c.width = 640; c.height = 360; const x = c.getContext("2d"); setInterval(() => { x.fillStyle = "#123"; x.fillRect(0, 0, 640, 360); x.fillStyle = "#fff"; x.fillText(String(Date.now()), 20, 20); }, 100); const v = document.getElementById("${id}"); v.srcObject = c.captureStream(15); v.play().catch(() => {}); }`;
const caption = (inner) => `<div class="ytp-caption-window-container" style="position:absolute;bottom:30px;left:0;right:0;text-align:center;font:22px system-ui">${inner}</div>`;
const seg = (t) => `<span class="ytp-caption-segment">${t}</span>`;
const PREVIEW = (text) => `<ytd-video-preview style="position:absolute;left:300px;top:120px;width:480px;height:270px;display:block"><div id="inline-preview-player" class="html5-video-player" style="position:relative;width:480px;height:270px"><video id="pv" muted playsinline style="width:480px;height:270px;background:#321"></video>${caption(seg(text))}<button class="ytp-subtitles-button" aria-pressed="false">CC</button></div></ytd-video-preview>`;
const head = (title) => `<!doctype html><html><head><title>${title}</title></head><body style="margin:0;background:#000;color:#fff;font:16px system-ui">`;

// Ana sayfa: gizli asıl oynatıcı (genişlik 0, duraklatılmış) + altyazılı oynayan önizleme
const HOME = head("YouTube") + `<div id="movie_player" class="html5-video-player" style="width:0;height:0"><video id="v" style="width:0;height:0"></video></div>${PREVIEW(CAP)}<script>${VIDEO_JS("pv")}</script></body></html>`;
// İzleme sayfası: asıl oynatıcı (altyazıyı sayfa komutuyla yazarız) + yan önizleme (kendi altyazısı var, okunmamalı)
const watch = (withPreview) => head("Easy Spanish 344 - YouTube") + `<div id="movie_player" class="html5-video-player" style="position:relative;width:960px;height:540px"><video id="v" muted playsinline style="width:960px;height:540px;background:#123"></video><div id="cw" class="ytp-caption-window-container" style="position:absolute;bottom:40px;left:0;right:0;text-align:center;font:24px system-ui"></div></div>
<h1 class="ytd-watch-metadata"><yt-formatted-string>Easy Spanish 344</yt-formatted-string></h1>${withPreview ? PREVIEW("Texto del avance lateral que no debe leerse") : ""}
<script>${VIDEO_JS("v")}${withPreview ? VIDEO_JS("pv") : ""}
window.setCaption = (t) => { const w = document.getElementById("cw"); w.textContent = ""; if (t) { const s = document.createElement("span"); s.className = "ytp-caption-segment"; s.textContent = t; w.appendChild(s); } };</script></body></html>`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cv-e2e-")), {
  channel: "chromium", headless: true, viewport: { width: 1280, height: 800 }, locale: "en-US",
  args: ["--lang=en-US", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--autoplay-policy=no-user-gesture-required"],
});
await ctx.route("https://www.youtube.com/**", (r) => {
  const u = new URL(r.request().url());
  r.fulfill({ contentType: "text/html; charset=utf-8", body: u.pathname === "/" ? HOME : watch(u.searchParams.get("preview") === "1") });
});
await ctx.route("https://cinevocab.up.railway.app/**", (r) => {
  const req = r.request(), u = new URL(req.url()), post = req.postData() ? JSON.parse(req.postData()) : null;
  serverCalls++;
  if (u.pathname === "/translate-words") {
    const results = {}, failed = [];
    (post.words || []).forEach((w) => (DICT[w] ? (results[w] = DICT[w]) : failed.push(w)));
    return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ status: "success", results, known: [], failed, pending: [], sentence_en: "" }) });
  }
  r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "{}" });
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
for (const p of ctx.pages()) if (p.url().includes("welcome")) await p.close();

const store = (o) => sw.evaluate(async (o) => { await chrome.storage.local.clear(); await chrome.storage.local.set(o); }, o);
const read = (keys) => sw.evaluate((k) => chrome.storage.local.get(k), keys);
const boxState = (p) => p.evaluate(() => {
  const o = document.getElementById("cinevocab-overlay");
  if (!o) return { shown: false, guide: false, chips: 0, text: "" };
  const sr = o.shadowRoot, shown = o.style.display !== "none";
  return { shown, guide: !!(sr && sr.querySelector(".fix")), chips: sr ? sr.querySelectorAll(".chip").length : 0, text: sr ? (sr.textContent || "").trim().slice(0, 80) : "" };
});
const open = async (path) => { const p = await ctx.newPage(); p.on("pageerror", (e) => console.log("  pageerror:", e.message)); await p.goto("https://www.youtube.com" + path, { waitUntil: "domcontentloaded" }); await sleep(900); return p; };
// Belirli bir süre boyunca koşul bir kez bile doğru olursa true
const everWithin = async (p, ms, pred) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (pred(await boxState(p))) return true; await sleep(250); } return false; };

let failed = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "  GEÇTİ " : "  KALDI ") + name + (extra ? "  · " + extra : "")); if (!ok) failed++; };

console.log("1) Kurulumdan sonra, hiç seçim yok (enabled yok): izleme sayfasında altyazı çıkınca soru gelir, bir kez");
await store({ src: "es", dst: "en" });
let p = await open("/watch?v=a");
await p.evaluate((t) => window.setCaption(t), CAP);
check("soru göründü", await everWithin(p, 7000, (b) => b.guide));
const afterAsk = await read(["startAsk", "enabled"]);
check("gösterildiği anda 'bir daha sorma' yazıldı, eklenti hâlâ kapalı", afterAsk.startAsk === "no" && afterAsk.enabled === undefined, JSON.stringify(afterAsk));
check("soru sırasında sunucuya hiçbir istek gitmedi", serverCalls === 0, serverCalls + " istek");
await p.close();
p = await open("/watch?v=b");                       // yeni sekme/sayfa: aynı kullanıcı
await p.evaluate((t) => window.setCaption(t), CAP);
check("ikinci sayfada soru ÇIKMADI (en çok bir kez)", !(await everWithin(p, 5000, (b) => b.guide)));
await p.close();

console.log("2) Eklentiyi kapatmış kullanıcı (enabled: false): soru hiç çıkmaz");
await store({ src: "es", dst: "en", enabled: false });
p = await open("/watch?v=c"); await p.evaluate((t) => window.setCaption(t), CAP);
check("soru ÇIKMADI", !(await everWithin(p, 6000, (b) => b.guide || b.shown)));
check("kapalıyken sunucuya istek gitmedi", serverCalls === 0, serverCalls + " istek");
await p.close();

console.log("3) 'Şimdi değil' demiş kullanıcı (startAsk: no): soru çıkmaz");
await store({ src: "es", dst: "en", startAsk: "no" });
p = await open("/watch?v=d"); await p.evaluate((t) => window.setCaption(t), CAP);
check("soru ÇIKMADI", !(await everWithin(p, 5000, (b) => b.guide)));
await p.close();

console.log("4) Ana sayfa, hiç seçim yok: gizli oynatıcı + altyazılı oynayan önizleme var, soru ÇIKMAZ");
await store({ src: "es", dst: "en" });
p = await open("/");
check("ana sayfada soru ÇIKMADI", !(await everWithin(p, 7000, (b) => b.guide || b.shown)), JSON.stringify(await boxState(p)));
const homeStore = await read(["startAsk"]);
check("soru 'harcanmadı' (startAsk yazılmadı); izleme sayfasında hâlâ sorulabilir", homeStore.startAsk === undefined, JSON.stringify(homeStore));
await p.close();

console.log("5) Ana sayfa, eklenti AÇIK: önizleme altyazısı çevrilmez, kutu ve 'altyazıyı aç' ipucu çıkmaz");
await store({ src: "es", dst: "en", enabled: true, startAsk: "no" });
p = await open("/");
check("ana sayfada kutu hiç görünmedi", !(await everWithin(p, 7000, (b) => b.shown || b.chips > 0)), JSON.stringify(await boxState(p)));
check("ana sayfada sunucuya çeviri isteği gitmedi", serverCalls === 0, serverCalls + " istek");
await p.close();

console.log("6) İzleme sayfası: yan önizlemenin altyazısı okunmaz, asıl oynatıcınınki okunur");
await store({ src: "es", dst: "en" });
p = await open("/watch?v=e&preview=1");              // yan önizleme altyazılı, asıl oynatıcıda altyazı yok
check("yalnızca önizleme altyazısı varken soru ÇIKMADI", !(await everWithin(p, 6000, (b) => b.guide)));
await p.evaluate((t) => window.setCaption(t), CAP);  // asıl oynatıcıya altyazı gelir
check("asıl oynatıcıda altyazı gelince soru çıktı", await everWithin(p, 7000, (b) => b.guide));
console.log("7) Soruya 'Çeviriyi başlat' denir: eklenti açılır ve çeviri çalışır (asıl oynatıcıdan okunur)");
await p.locator("#cinevocab-overlay >> .fix").first().click();
await sleep(700);
const afterBtn = await read(["enabled", "startAsk"]);
check("eklenti açıldı", afterBtn.enabled === true, JSON.stringify(afterBtn));
await p.evaluate(() => window.setCaption(""));
await p.evaluate((t) => window.setCaption(t), CAP);
check("kelime çevirileri göründü", await everWithin(p, 9000, (b) => b.chips >= 3), JSON.stringify(await boxState(p)));
check("çeviri isteği sunucuya yalnızca düğmeden sonra gitti", serverCalls > 0);
await p.close();

await ctx.close();
console.log(failed ? `\n${failed} KONTROL KALDI` : "\nHEPSİ GEÇTİ");
process.exit(failed ? 1 : 0);
