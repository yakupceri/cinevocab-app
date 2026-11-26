// Kelime notu hesaba yazılması: GERÇEK eklenti (servis çalışanı dahil), sahte sunucu (ağ yok).
// 1) Anahtar yokken (hesapsız) "note" mesajı ve popup'ta not düzenleme HİÇBİR not isteği atmaz.
// 2) Giriş olunca (anahtar yazılınca) cihazdaki notlar /api/notes/import ile tek istekte gider; altyazı cümlesi hiçbir istekte yok.
// 3) Girişliyken "note" mesajı /api/note'a Bearer anahtarıyla gider; popup'ta sunucudaki not görünür ve düzenlenince sunucuya gider.
// Çıktı: rapor + dev/out/e2e/n*.png
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
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cv-e2e-")), {
  channel: "chromium", headless: true, viewport: { width: 380, height: 584 }, locale: "en-US",
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--host-resolver-rules=MAP cinevocab.up.railway.app 127.0.0.1"],
});
const seen = [];                                    // sunucuya giden istekler
const serverNotes = { "es>en": { amor: "sunucudaki not" } };
const json = (r, o, status = 200) => r.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(o) });
await ctx.route("https://cinevocab.up.railway.app/**", async (r) => {
  const req = r.request(), u = new URL(req.url()), path = u.pathname;
  if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  seen.push({ path, method: req.method(), body, auth: req.headers().authorization || "", raw: req.postData() || "" });
  const pair = (u.searchParams.get("src") || "") + ">" + (u.searchParams.get("dst") || "");
  if (path === "/api/ext/home") return json(r, { username: "demo", avatar: "D", level: 3, streak: 4, words: 5, wins: 2, mastered: 1, new: 2, due: 1, pair: "es>en", pair_words: 5, xp_into: 40, xp_level: 100, xp_today: 20, starred: [],
    recent: [{ w: "amor", t: "love" }, { w: "vida", t: "life" }, { w: "mundo", t: "world" }] });
  if (path === "/api/notes" && req.method() === "GET") return json(r, { notes: serverNotes[pair] || {} });
  if (path === "/api/note") { const k = body.src + ">" + body.dst; serverNotes[k] = serverNotes[k] || {}; if (body.note) serverNotes[k][body.word] = body.note; else delete serverNotes[k][body.word]; return json(r, { ok: true, note: body.note }); }
  if (path === "/api/notes/import") return json(r, { ok: true, added: Object.keys(body.notes).length });
  if (path === "/translate-words") return json(r, { status: "success", results: {}, known: [], failed: [], pending: [] });
  return json(r, {}, 404);
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
const extId = new URL(sw.url()).host;
for (const p of ctx.pages()) if (p.url().includes("welcome")) await p.close();
const notesReq = () => seen.filter((x) => /^\/api\/notes?(\/|$)/.test(x.path) && x.method === "POST");

const L = "Lo más importante en la vida es tener amor propio", T = "The most important thing in life is to have self-love.";
const bank = { "es>en": [
  { w: "amor", t: "love", ts: 9, s: L, st: T, n: "cihazdaki farklı not" },          // sunucuda zaten notu var: sunucudaki kalır
  { w: "vida", t: "life", ts: 8, n: "cihazdaki not", ep: "YouTube · Easy Spanish" },
  { w: "mundo", t: "world", ts: 7 },
] };
await sw.evaluate((b) => chrome.storage.local.set({ src: "es", dst: "en", enabled: true, bank: b }), bank);   // anahtar YOK
await sleep(400);

const popup = await ctx.newPage();
await popup.goto(`chrome-extension://${extId}/popup.html`); await sleep(800);
const send = (msg) => popup.evaluate((m) => new Promise((res) => chrome.runtime.sendMessage(m, (r) => res(r || null))), msg);

console.log("1) Hesapsız (anahtar yok)");
let r = await send({ action: "note", src: "es", dst: "en", word: "vida", note: "yeni cihaz notu" });
await sleep(300);
ok(r && r.ok === false && r.guest === true, "arka plan 'hesapsız' diye cevap verdi: " + JSON.stringify(r));
ok(notesReq().length === 0, "anahtar yokken /api/note ve /api/notes/import isteği YOK");
await popup.locator('#tabs button[data-tab="words"]').click(); await sleep(500);
await popup.locator(".wl li", { hasText: "mundo" }).locator("button.nt").click();
await popup.locator(".nt-in").fill("popup notu"); await popup.locator(".nt-in").press("Enter"); await sleep(500);
const dev = async (w) => popup.evaluate((w) => new Promise((res) => chrome.storage.local.get("bank", (x) => res(x.bank["es>en"].find((i) => i.w === w)))), w);
ok((await dev("mundo")).n === "popup notu", "hesapsız popup: not cihazdaki deftere yazıldı");
ok(notesReq().length === 0 && !seen.some((x) => /\/api\/notes?\b/.test(x.path)), "hesapsız popup: not düzenleyince sunucuya hiçbir not isteği gitmedi");
await popup.screenshot({ path: join(OUT, "n1-hesapsiz-not.png") });

console.log("2) Giriş yapılınca cihazdaki notlar toplu taşınır");
const before = seen.length;
await sw.evaluate(() => chrome.storage.local.set({ key: "test-key-not-real" }));   // anahtar yazıldı: migrateBank çalışır
await sleep(1500);
const mig = seen.slice(before);
const imp = mig.filter((x) => x.path === "/api/notes/import");
ok(imp.length === 1 && imp[0].auth === "Bearer test-key-not-real", "tek /api/notes/import isteği, Bearer anahtarıyla");
ok(imp.length === 1 && JSON.stringify(imp[0].body) === JSON.stringify({ src: "es", dst: "en", notes: { amor: "cihazdaki farklı not", vida: "cihazdaki not", mundo: "popup notu" } }),
   "gövde: yalnızca kelime ve not: " + JSON.stringify(imp[0] && imp[0].body));
ok(!mig.some((x) => x.path === "/api/note"), "taşıma sırasında ezen /api/note ucu kullanılmadı (sunucudaki not korunur)");
ok(mig.every((x) => !x.raw.includes("importante") && !x.raw.includes("self-love")), "hiçbir istekte altyazı cümlesi ya da çevirisi yok");
ok(mig.filter((x) => x.path === "/translate-words").every((x) => x.body.sentence === ""), "kelime taşıma istekleri 'sentence: \"\"' ile gitti");
ok((await dev("amor")).n === "cihazdaki farklı not", "cihazdaki not silinmedi / değişmedi");

console.log("3) Girişliyken not hesaba yazılır; popup'ta sunucudaki not görünür ve düzenlenir");
const b3 = seen.length;
r = await send({ action: "note", src: "es", dst: "en", word: "mundo", note: "  hesaba   gitsin " });
await sleep(400);
const post = seen.slice(b3).filter((x) => x.path === "/api/note");
ok(r && r.ok === true && post.length === 1 && post[0].auth === "Bearer test-key-not-real" && JSON.stringify(post[0].body) === JSON.stringify({ src: "es", dst: "en", word: "mundo", note: "hesaba gitsin" }), "arka plan /api/note'a yazdı (Bearer, kırpılmış): " + JSON.stringify(post[0] && post[0].body));
await popup.reload(); await sleep(1200);
await popup.locator('#tabs button[data-tab="words"]').click(); await sleep(600);
const txt = async (w) => (await popup.locator(".wl li", { hasText: w }).locator(".nt").innerText()).trim();
ok((await txt("amor")) === "sunucudaki not", "popup: sunucudaki not, cihazdaki farklı notun önünde gösterilir (hesapla birleşik)");
ok((await txt("mundo")) === "hesaba gitsin", "popup: arka planın yazdığı not sunucudan gelip görünür");
await popup.locator(".wl li", { hasText: "vida" }).locator("button.nt").click();
await popup.locator(".nt-in").fill("popup'tan düzenlendi"); await popup.locator(".nt-in").press("Enter"); await sleep(600);
ok(serverNotes["es>en"].vida === "popup'tan düzenlendi" && (await dev("vida")).n === "popup'tan düzenlendi", "popup'tan düzenleme hem sunucuya hem cihazdaki deftere yazıldı");
await popup.screenshot({ path: join(OUT, "n3-hesapli-not.png") });
await popup.locator(".wl li", { hasText: "vida" }).locator("button.nt").click();
await popup.locator(".nt-in").fill(""); await popup.locator(".nt-in").press("Enter"); await sleep(600);
ok(!("vida" in serverNotes["es>en"]) && !("n" in (await dev("vida"))), "boş kaydetmek notu sunucudan ve cihazdan siler");
await ctx.close();
