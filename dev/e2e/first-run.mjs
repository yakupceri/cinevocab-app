// Gerçek eklenti, gerçek Chromium, yeni profil: "bilgisayardan anlamayan kullanıcı" ilk kez kuruyor ve kullanıyor.
// Ağ SAHTE: cinevocab.up.railway.app ve youtube.com istekleri yerelde yanıtlanır, gerçek siteye hiçbir istek gitmez.
// Çıktı: adım adım tık sayısı ve süre + ekran görüntüleri (dev/out/e2e/). Kullanım: cd dev && node e2e/first-run.mjs
import { chromium } from "playwright";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1"; // servis çalışanının istekleri de yakalanabilsin
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..", "..", "extension");
const OUT = resolve(HERE, "..", "out", "e2e");
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [], api = [];
let clicks = 0, t0 = Date.now();
const step = (name, extra = "") => { const s = ((Date.now() - t0) / 1000).toFixed(1); log.push({ name, clicks, s }); console.log(`[${s.padStart(5)} sn | ${clicks} tık] ${name} ${extra}`); };

// ---- sahte dünya ----
const DICT = { más: "more", importante: "important", vida: "life", tener: "to have", amor: "love", propio: "own" };
const SENT = { "Lo más importante en la vida es tener amor propio": "The most important thing in life is to have self-love." };
const RESULTS = `<!doctype html><title>easy Spanish street interviews - YouTube</title><body style="font:16px system-ui;background:#0f0f0f;color:#fff;padding:24px"><h2>Results (captions filter)</h2><p><a id="v1" style="color:#8cf" href="/watch?v=FAKE0001">What's the Most Important Thing in Life? | Easy Spanish 344</a></p><p><a style="color:#8cf" href="/watch?v=FAKE0002">Another street interview</a></p>`;
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

const ctxDir = mkdtempSync(join(tmpdir(), "cv-e2e-"));
const ctx = await chromium.launchPersistentContext(ctxDir, {
  channel: "chromium", headless: true, viewport: { width: 1280, height: 800 }, locale: "en-US",
  args: ["--lang=en-US", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--host-resolver-rules=MAP cinevocab.up.railway.app 127.0.0.1", "--autoplay-policy=no-user-gesture-required"],
});
await ctx.route("https://www.youtube.com/**", (r) => {
  const u = new URL(r.request().url());
  r.fulfill({ contentType: "text/html; charset=utf-8", body: u.pathname.startsWith("/watch") ? WATCH : RESULTS });
});
await ctx.route("https://cinevocab.up.railway.app/**", (r) => {
  const req = r.request(), u = new URL(req.url());
  let body = {}, status = 200;
  const post = req.postData() ? JSON.parse(req.postData()) : null;
  api.push({ m: req.method(), p: u.pathname, post, auth: req.headers()["authorization"] || "" });
  if (u.pathname === "/translate-words") {
    const results = {}, failed = [];
    (post.words || []).forEach((w) => (DICT[w] ? (results[w] = DICT[w]) : failed.push(w)));
    body = { status: "success", results, known: [], failed, pending: [], sentence_en: SENT[post.sentence] || "" };
  } else if (u.pathname === "/api/ext/config") body = { google: "", mail: false };
  else if (u.pathname === "/api/ext/home") body = { username: "deneme", avatar: "", level: 1, xp: 0, xp_into: 0, xp_level: 200, xp_today: 0, streak: 0, wins: 0, words: 0, pair_words: 0, due: 0, new: 0, mastered: 0, recent: [], starred: [] };
  else if (u.pathname === "/api/star") body = { ok: true };
  else { status = 401; body = { detail: "yok" }; }
  r.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
});
const translateCalls = () => api.filter((a) => a.p === "/translate-words");

// 1) KURULUM: servis çalışanı ve karşılama sayfası kendiliğinden açılmalı
t0 = Date.now();
let sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
const extId = new URL(sw.url()).host;
let welcome = ctx.pages().find((p) => p.url().includes("welcome.html")) || (await ctx.waitForEvent("page", { predicate: (p) => p.url().includes("welcome.html"), timeout: 15000 }));
await welcome.waitForLoadState("domcontentloaded");
await sleep(600);
step("Kurulum bitti, karşılama sayfası KENDİLİĞİNDEN açıldı", `(eklenti kimliği ${extId.slice(0, 6)}…)`);
await welcome.screenshot({ path: join(OUT, "1-welcome.png") });
const stored0 = await sw.evaluate(() => chrome.storage.local.get(["enabled", "src", "dst"]));
step("Kurulumdan sonra ayarlar", JSON.stringify(stored0) + (stored0.enabled ? "  << HATA: çeviri kendiliğinden AÇIK" : "  (çeviri kapalı: doğru)"));
step("Düğmeye basılmadan sunucuya çeviri isteği gitti mi?", `${translateCalls().length} istek ${translateCalls().length ? "<< HATA" : "(hiç yok: doğru)"}`);

// Test ortamı notu: macOS'ta Chromium'un arayüz dili sistem dilidir (bu makinede Türkçe), bu yüzden varsayılan çift en>tr gelir.
// ABD'li (İngilizce tarayıcı) kullanıcıda varsayılan es>en'dir (birim testi: defaultPair). Burada o durumu elle kuruyoruz.
if (stored0.src !== "es" || stored0.dst !== "en") {
  await welcome.selectOption("#src", "es"); await welcome.selectOption("#dst", "en");
  step("(test ortamı) çift elle İspanyolca → İngilizce yapıldı", "ABD'li kullanıcıda bu zaten varsayılan");
}
// 2) kullanıcı tek büyük düğmeye basar
const btnText = (await welcome.locator("#go").textContent()).trim();
clicks++; await welcome.locator("#go").click();
await welcome.waitForURL(/youtube\.com\/results/, { timeout: 10000 });
step(`Büyük düğmeye basıldı: "${btnText}"`, `→ ${new URL(welcome.url()).pathname} (arama sonuçları)`);
const stored1 = await sw.evaluate(() => chrome.storage.local.get(["enabled"]));
step("Düğmeden sonra çeviri", stored1.enabled ? "AÇIK (doğru, kullanıcı onay verdi)" : "<< HATA: hâlâ kapalı");
await welcome.screenshot({ path: join(OUT, "2-results.png") });

// 3) kullanıcı bir video seçer
clicks++; await welcome.locator("#v1").click();
await welcome.waitForURL(/watch\?v=/, { timeout: 10000 });
step("Bir video seçildi", "(oynatıcıda altyazı KAPALI, çoğu kullanıcıda böyle)");

// 4) altyazı kapalı: eklenti kendisi mi yol gösteriyor? (en çok 20 sn bekle, kullanıcı hiçbir şey yapmıyor)
const box = () => welcome.locator("#cinevocab-overlay");
let guided = false, waited = 0;
while (waited < 20000 && !guided) {
  await sleep(500); waited += 500;
  guided = await welcome.evaluate(() => { const o = document.getElementById("cinevocab-overlay"); return !!(o && o.style.display !== "none" && o.shadowRoot && o.shadowRoot.querySelector(".fix")); });
}
await welcome.screenshot({ path: join(OUT, "3-guide.png") });
if (guided) {
  const guideText = await welcome.evaluate(() => document.getElementById("cinevocab-overlay").shadowRoot.querySelector(".msg").textContent);
  step(`Eklenti kendi yol gösterdi (${(waited / 1000).toFixed(1)} sn sonra)`, `"${guideText}"`);
  clicks++; await welcome.locator("#cinevocab-overlay >> .fix").first().click();
  step('Kutudaki "altyazıyı aç" düğmesine basıldı');
} else {
  step("Eklenti 20 sn içinde HİÇ yol göstermedi", "<< SORUN: kullanıcı CC'yi kendi bulmak zorunda");
  clicks++; await welcome.locator(".ytp-subtitles-button").click();
  step("Kullanıcı CC'ye kendisi bastı");
}

// 5) ilk kelime görünür mü?
const chip = welcome.locator("#cinevocab-overlay >> .chip").first();
try { await chip.waitFor({ timeout: 15000 }); } catch (e) {
  const dbg = await welcome.evaluate(() => { const o = document.getElementById("cinevocab-overlay"); return o ? (o.style.display + " | " + (o.shadowRoot ? o.shadowRoot.textContent.slice(-300) : "")) : "kutu yok"; });
  console.log("KUTU DURUMU:", dbg); await welcome.screenshot({ path: join(OUT, "x-fail.png") }); throw e;
}
step("İLK ÇEVRİLEN KELİME ekranda", `(${(await welcome.locator("#cinevocab-overlay >> .chip").count())} kelime kutucuğu)`);
await sleep(700);
await welcome.screenshot({ path: join(OUT, "4-first-words.png") });
step("Sunucuya giden çeviri istekleri", `${translateCalls().length} adet; Authorization başlığı: ${translateCalls().some((c) => c.auth) ? "VAR << HATA" : "yok (hesapsız, doğru)"}; cümle gitti: ${translateCalls().some((c) => c.post.sentence) ? "evet (çeviri için)" : "hayır"}`);

// 6) kelimeye tıklar (tutar)
clicks++; await welcome.locator('#cinevocab-overlay >> .chip[data-w="amor"]').click();
await sleep(500);
const hdr = await welcome.evaluate(() => document.getElementById("cinevocab-overlay").shadowRoot.querySelector(".lg").textContent);
const note = await welcome.evaluate(() => { const n = document.getElementById("cinevocab-overlay").shadowRoot.querySelector(".hint.first"); return n ? n.textContent : ""; });
step("KELİME TUTULDU (ilk kaydedilen kelime)", `başlık: "${hdr.trim()}" | not: "${note}"`);
await welcome.mouse.move(1100, 100); await sleep(1500);
await welcome.screenshot({ path: join(OUT, "5-kept.png") });
const bank = await sw.evaluate(() => chrome.storage.local.get("bank"));
const kept = (bank.bank && bank.bank["es>en"]) || [];
step("Cihaz defteri", JSON.stringify(kept.map((x) => ({ w: x.w, t: x.t, ep: x.ep, vt: x.vt }))));
const firstWordSec = (Date.now() - t0) / 1000;

// 7) popup: kelimeler orada mı
const popup = await ctx.newPage();
await popup.goto(`chrome-extension://${extId}/popup.html`);
await popup.setViewportSize({ width: 380, height: 584 });
await sleep(800);
clicks++; await popup.locator('#tabs button[data-tab="words"]').click();
await sleep(500);
const rows = await popup.locator("#v-words .wl li").count();
step("Popup > Kelimeler", `${rows} kelime listede`);
await popup.screenshot({ path: join(OUT, "6-popup-words.png") });

// 8) hesap açınca cihazdaki kelimeler hesaba taşınıyor mu (sahte giriş: anahtarı yaz)
const before = translateCalls().length;
await sw.evaluate(() => chrome.storage.local.set({ key: "SAHTE-ANAHTAR" }));
await sleep(2500);
const mig = translateCalls().slice(before);
step("Giriş yapıldı: kelimeler hesaba taşındı mı", `${mig.length} istek; kelimeler: ${JSON.stringify(mig.flatMap((c) => c.post.words))}; cümle gitti mi: ${mig.some((c) => c.post.sentence) ? "EVET << HATA" : "hayır"}`);

console.log("\n=== ÖZET ===");
console.log(`İlk çevrilen kelimeye kadar tık: ${log.find((l) => l.name.startsWith("İLK ÇEVRİLEN")).clicks}`);
console.log(`İlk kaydedilen kelimeye kadar tık: ${log.find((l) => l.name.startsWith("KELİME TUTULDU")).clicks}, süre (robot hızıyla, insan değil): ${firstWordSec.toFixed(1)} sn`);
writeFileSync(join(OUT, "rapor.json"), JSON.stringify({ log, api: api.map((a) => ({ m: a.m, p: a.p })) }, null, 2));
await ctx.close();
