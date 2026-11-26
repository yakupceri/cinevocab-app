// Videoda yazılan not, GERÇEK eklenti (içerik betiği + servis çalışanı) ile: hesapsızken sunucuya not isteği gitmez, giriş olunca hesaba yazılır.
// Ağ SAHTE: cinevocab.up.railway.app ve youtube.com yerelde yanıtlanır. Çıktı: rapor + dev/out/e2e/nv*.png
import { chromium } from "playwright";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..", "..", "extension"), OUT = resolve(HERE, "..", "out", "e2e");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => console.log((c ? "  ✔ " : "  ✖ HATA: ") + m) || (c ? 0 : (process.exitCode = 1));
const api = [];
const DICT = { más: "more", importante: "important", vida: "life", tener: "to have", amor: "love", propio: "own" };
const SENT = { "Lo más importante en la vida es tener amor propio": "The most important thing in life is to have self-love." };
const WATCH = `<!doctype html><html><head><title>What's the Most Important Thing in Life? | Easy Spanish 344 - YouTube</title></head><body style="margin:0;background:#000;color:#fff">
<div id="movie_player" style="position:relative;width:960px;height:540px"><video id="v" muted playsinline style="width:960px;height:540px;background:#123"></video>
<div class="ytp-caption-window-container" style="position:absolute;bottom:40px;left:0;right:0;text-align:center;font:24px system-ui"></div>
<button class="ytp-subtitles-button" aria-pressed="false" style="position:absolute;right:10px;bottom:6px;font:14px system-ui">CC</button></div>
<h1 class="ytd-watch-metadata" style="font:18px system-ui"><yt-formatted-string>What's the Most Important Thing in Life? | Easy Spanish 344</yt-formatted-string></h1>
<script>
const c = document.createElement("canvas"); c.width = 640; c.height = 360; const x = c.getContext("2d");
setInterval(() => { x.fillStyle = "#123"; x.fillRect(0, 0, 640, 360); x.fillStyle = "#fff"; x.fillText(String(Date.now()), 20, 20); }, 100);
const v = document.getElementById("v"); v.srcObject = c.captureStream(15); v.play().catch(() => {});
const b = document.querySelector(".ytp-subtitles-button"), w = document.querySelector(".ytp-caption-window-container");
b.onclick = () => { const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on));
  w.textContent = ""; if (on) { const s = document.createElement("span"); s.className = "ytp-caption-segment"; s.textContent = "Lo más importante en la vida es tener amor propio"; w.appendChild(s); } };
</script></body></html>`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cv-e2e-")), {
  channel: "chromium", headless: true, viewport: { width: 1280, height: 800 }, locale: "en-US",
  args: ["--lang=en-US", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--host-resolver-rules=MAP cinevocab.up.railway.app 127.0.0.1", "--autoplay-policy=no-user-gesture-required"],
});
await ctx.route("https://www.youtube.com/**", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: WATCH }));
await ctx.route("https://cinevocab.up.railway.app/**", (r) => {
  const req = r.request(), u = new URL(req.url());
  let body = {}, status = 200;
  const post = req.postData() ? JSON.parse(req.postData()) : null;
  api.push({ m: req.method(), p: u.pathname, post, auth: req.headers()["authorization"] || "" });
  if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (u.pathname === "/translate-words") {
    const results = {}, failed = [];
    (post.words || []).forEach((w) => (DICT[w] ? (results[w] = DICT[w]) : failed.push(w)));
    body = { status: "success", results, known: [], failed, pending: [], sentence_en: SENT[post.sentence] || "" };
  } else if (u.pathname === "/api/note") body = { ok: true, note: post.note };
  else if (u.pathname === "/api/notes/import") body = { ok: true, added: Object.keys(post.notes).length };
  else if (u.pathname === "/api/star") body = { ok: true };
  else if (u.pathname === "/api/ext/config") body = { google: "", mail: false };
  else { status = 404; body = { detail: "yok" }; }
  r.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
});
const noteCalls = () => api.filter((a) => a.p === "/api/note" || a.p === "/api/notes/import" || a.p === "/api/notes");
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
for (const p of ctx.pages()) if (p.url().includes("welcome")) await p.close();
await sw.evaluate(() => chrome.storage.local.set({ enabled: true, src: "es", dst: "en", keptFirst: Date.now(), boxTip: 1 }));   // anahtar YOK

const page = await ctx.newPage();
await page.goto("https://www.youtube.com/watch?v=abc"); await sleep(800);
await page.locator(".ytp-subtitles-button").click();
const chip = page.locator('#cinevocab-overlay >> .chip[data-w="amor"]');
await chip.waitFor({ timeout: 15000 });
const bankItem = () => sw.evaluate(() => chrome.storage.local.get("bank").then((x) => ((x.bank || {})["es>en"] || []).find((i) => i.w === "amor")));
const writeNote = async (text) => {
  await page.locator("#cinevocab-overlay >> button.nb").click(); await sleep(250);
  const inp = page.locator("#cinevocab-overlay >> .note input"); await inp.fill(text); await inp.press("Enter"); await sleep(600);
};

console.log("1) Hesapsız: videoda not yaz");
await chip.click(); await sleep(500);
await writeNote("dizide çok geçiyor");
ok(((await bankItem()) || {}).n === "dizide çok geçiyor", "not cihazdaki kelimeye yazıldı");
ok(noteCalls().length === 0, "hesapsızken sunucuya hiçbir not isteği gitmedi (içerik betiği + arka plan)");
await page.screenshot({ path: join(OUT, "nv1-hesapsiz.png") });

console.log("2) Giriş yapılınca");
await sw.evaluate(() => chrome.storage.local.set({ key: "SAHTE-ANAHTAR" }));   // migrateBank çalışır
await sleep(2000);
const imp = api.filter((a) => a.p === "/api/notes/import");
ok(imp.length === 1 && imp[0].auth === "Bearer SAHTE-ANAHTAR" && JSON.stringify(imp[0].post) === JSON.stringify({ src: "es", dst: "en", notes: { amor: "dizide çok geçiyor" } }), "cihazdaki not tek istekle taşındı: " + JSON.stringify(imp[0] && imp[0].post));
ok(!api.some((a) => a.p === "/api/note"), "taşıma, ezen /api/note ucunu kullanmadı");
await writeNote("  yeni    not ");
const posts = api.filter((a) => a.p === "/api/note");
ok(posts.length === 1 && posts[0].auth === "Bearer SAHTE-ANAHTAR" && JSON.stringify(posts[0].post) === JSON.stringify({ src: "es", dst: "en", word: "amor", note: "yeni not" }), "girişliyken videodaki not hesaba yazıldı: " + JSON.stringify(posts[0] && posts[0].post));
ok(((await bankItem()) || {}).n === "yeni not", "aynı not cihazdaki kelimede de duruyor");
await writeNote("");
const del = api.filter((a) => a.p === "/api/note");
ok(del.length === 2 && del[1].post.note === "" && !("n" in ((await bankItem()) || { n: 1 })), "notu boşaltınca silme isteği gitti, cihazdaki not da gitti");
await page.screenshot({ path: join(OUT, "nv2-hesapli.png") });
await ctx.close();
