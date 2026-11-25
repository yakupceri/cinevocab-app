// Yönetim panelini sahte verilerle açar, her sekmenin ekran görüntüsünü alır, konsol hatalarını sayar.
// Kullanım (dev/ klasöründen):  node admin-harness/shots.mjs [--anon] [--vp desktop|mobile] [--tab "Ziyaretçiler"] [--days 7] [--empty]
//   --anon  : sunucu "ext_anon/ext_acct" alanlarını da veriyormuş gibi davran (ileride eklenecek sayaç)
//   --empty : hiç veri yokmuş gibi (boş durumlar)
//   --novideo : eski sunucu gibi (video alanları yok) ya da henüz video tıklaması yok
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.resolve(here, "../out/admin");
fs.mkdirSync(out, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const ANON = !!arg("anon", false), EMPTY = !!arg("empty", false), NOVIDEO = !!arg("novideo", false), VP = arg("vp", "desktop"), ONLY = arg("tab", ""), DAYS = Number(arg("days", 7)) || 7;
const html = fs.readFileSync(path.join(root, "templates/admin.html"), "utf8");

// ---------- sahte veri ----------
const TODAY = Date.UTC(2026, 10, 23);
const dayOf = (i, n = 14) => new Date(TODAY - (n - 1 - i) * 864e5);
const dd = (d) => String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0");
const iso = (d) => d.toISOString().slice(0, 10);
const z = (a) => (EMPTY ? a.map(() => 0) : a);
const site = z([62, 71, 58, 90, 84, 66, 73, 120, 108, 95, 141, 132, 118, 127]);
const ext = z([35, 40, 38, 52, 49, 44, 47, 61, 66, 58, 77, 81, 72, 79]);
const clicks = z([9, 14, 11, 18, 16, 12, 13, 24, 21, 19, 31, 28, 26, 30]);
const signups = z([1, 2, 0, 3, 2, 1, 1, 4, 3, 2, 5, 4, 3, 4]);
const video = z([0, 0, 0, 1, 0, 2, 1, 3, 2, 4, 6, 5, 4, 7]);
const extAnon = ext.map((x) => Math.round(x * 0.62));
const sum = (a, n) => a.slice(-n).reduce((s, x) => s + x, 0);

function traffic(days) {
  const daily = Array.from({ length: 14 }, (_, i) => ({ day: dd(dayOf(i)), site: site[i], ext: ext[i], clicks: clicks[i], signups: signups[i], video: video[i], ...(ANON ? { ext_anon: i < 4 ? null : extAnon[i] } : {}) }));
  const totals = { site: sum(site, days), ext: sum(ext, days), clicks: sum(clicks, days), video: sum(video, days), signups: sum(signups, days), ...(ANON ? { ext_anon: sum(extAnon, days), ext_acct: sum(ext, days) - sum(extAnon, days) - sum(ext.map((x) => Math.round(x * 0.2)), days), ext_unknown: sum(ext.map((x) => Math.round(x * 0.2)), days) } : {}) };
  const f = days === 1 ? 0.14 : days === 7 ? 1 : 3.4;
  const e = (n) => (EMPTY ? 0 : Math.round(n * f));
  const countries = EMPTY ? [] : [
    { country: "TR", site: e(410), ext: e(260), clicks: e(96) }, { country: "US", site: e(88), ext: e(61), clicks: e(14) }, { country: "DE", site: e(52), ext: e(37), clicks: e(9) },
    { country: "dil:tr", site: e(46), ext: e(31), clicks: e(6) }, { country: "GB", site: e(34), ext: e(22), clicks: e(5) }, { country: "dil:en", site: e(21), ext: e(12), clicks: e(2) },
    { country: "NL", site: e(18), ext: e(11), clicks: e(3) }, { country: "?", site: e(14), ext: e(9), clicks: e(1) }, { country: "FR", site: e(12), ext: e(7), clicks: e(2) }, { country: "BR", site: e(9), ext: e(6), clicks: e(1) },
    ...["IT", "ES", "PL", "SE", "AT", "CH", "CA", "AU"].map((c, i) => ({ country: c, site: e(8 - i), ext: e(4), clicks: e(1) }))];
  const hours = { site: z(Array.from({ length: 24 }, (_, i) => Math.round(8 + 36 * Math.exp(-(((i - 21) % 24) ** 2) / 22) + 18 * Math.exp(-((i - 13) ** 2) / 18)))), clicks: z(Array.from({ length: 24 }, (_, i) => Math.round(2 + 9 * Math.exp(-((i - 20) ** 2) / 14)))) };
  const kinds = ["tıklama", "site", "video", "site", "tıklama", "eklenti"], devs = ["telefon", "bilgisayar", "telefon", "bilgisayar", "tablet"], oss = ["Android", "Windows", "iOS", "macOS", "Android"], cc = ["TR", "US", "dil:tr", "DE", "?", "GB"];
  const recent = EMPTY ? [] : Array.from({ length: 15 }, (_, i) => ({ at: `23.11 ${String(14 - Math.floor(i / 3)).padStart(2, "0")}:${String(58 - i * 3).padStart(2, "0")}`, kind: kinds[i % 6], what: i % 3 === 0 ? "yt-tr" : i % 3 === 1 ? "google.com" : "", device: devs[i % 5], os: oss[i % 5], country: cc[i % 6] }));
  if (NOVIDEO) { delete totals.video; daily.forEach((x) => delete x.video); }
  return { days, now: "23.11.2026 14:03", totals, daily, errors: [],
    devices: { site: EMPTY ? {} : { telefon: e(310), bilgisayar: e(240), tablet: e(18) }, clicks: EMPTY ? {} : { telefon: e(80), bilgisayar: e(44), tablet: e(4) }, os: EMPTY ? {} : { Android: e(210), Windows: e(160), iOS: e(70), macOS: e(54) } },
    referrers: EMPTY ? [] : [{ ref: "", n: e(300) }, { ref: "google.com", n: e(120) }, { ref: "youtube.com", n: e(64) }, { ref: "reddit.com", n: e(21) }],
    sources: EMPTY ? [] : [{ kind: "ext", src: "yt-tr", n: e(61), telefon: e(40), bilgisayar: e(18), tablet: 0 }, { kind: "ext", src: "yt-en", n: e(38), telefon: e(21), bilgisayar: e(15), tablet: 0 }, { kind: "ext", src: "reddit", n: e(9), telefon: e(2), bilgisayar: e(5), tablet: 0 },
      ...(NOVIDEO ? [] : [{ kind: "video", src: "quora-es", n: e(14), telefon: e(10), bilgisayar: e(3), tablet: 0 }, { kind: "video", src: "yt-tr", n: e(9), telefon: e(5), bilgisayar: e(4), tablet: 0 }])],
    countries, hours, recent };
}
const stats = () => ({ users: EMPTY ? 0 : 412, users_today: 4, users_week: 23, active_24h: 61, online_now: 3, app_total: EMPTY ? 0 : 5, app_online: EMPTY ? 0 : 1, app_24h: EMPTY ? 0 : 3, banned: 0, words: 18452, user_words: 9120, games: 307, rooms: 1,
  signups: Array.from({ length: 14 }, (_, i) => ({ day: iso(dayOf(i)), n: signups[i] })),
  usage: EMPTY ? [] : Array.from({ length: 14 }, (_, i) => ({ day: iso(dayOf(i)), calls: ext[i] * 9, anon: Math.round(ext[i] * 9 * 0.58), words: ext[i] * 30 })),
  pairs: EMPTY ? [] : [{ pair: "es→en", calls: 2210 }, { pair: "en→tr", calls: 1544 }, { pair: "tr→en", calls: 902 }, { pair: "de→en", calls: 311 }],
  top_sources: EMPTY ? [] : [{ episode: "Easy Spanish 344", n: 412 }, { episode: "Dark", n: 233 }, { episode: "Money Heist", n: 190 }] });
const funnel = () => ({ days: 30, clicks: 340, errors: [], steps: { signups: 120, word1: 96, word20: 51, practiced: 40, returned: 33, kept7: 18, old7: 60 },
  dau: Array.from({ length: 14 }, (_, i) => ({ day: iso(dayOf(i)), n: 8 + ((i * 7) % 13) })), methods: [{ name: "parola", n: 70 }, { name: "Google", n: 50 }], via: [{ name: "eklenti", n: 80 }, { name: "web", n: 40 }],
  invited: 6, countries: [{ name: "TR", n: 60 }, { name: "(seçmemiş)", n: 40 }], cohorts: [{ week: "2026-11-16", signups: 30, word1: 24, word20: 12, practiced: 9, returned: 8, kept7: 0, old7: 0 }] });
const health = () => ({ days: 14, errors: [], notes: [{ level: "ok", text: "Her şey normal görünüyor." }], total: { rows: 9120, no_trans_pct: 2, untagged_pct: 11, same_pct: 4 },
  pairs: [{ pair: "es>en", rows: 4100, users: 90, no_trans: 40, same: 120 }], platforms: [{ platform: "YouTube", rows: 6000, users: 100, no_trans: 50 }], daily: [{ day: "2026-11-22", rows: 600, users: 40, no_trans: 3, untagged: 50, same: 20 }] });
let appCalls = 0;   // canlı yenileme denemesi: her çağrıda "şimdi açık" sayısı ve saat değişir
const appUsers = () => { appCalls++; const on = appCalls > 1 ? 2 : 1;
  return EMPTY ? { totals: { total: 0, online: 0, h24: 0, d7: 0, seen: 0 }, users: [], now: "19:20:0" + appCalls }
    : { totals: { total: 5, online: on, h24: 3, d7: 4, seen: 4 }, now: "19:20:" + String(appCalls * 15).padStart(2, "0"), users: [
      { id: 9, username: "mina", created: "2026-11-02 10:00", last_app: "2026-11-24 19:18", last_seen: "2026-11-24 19:18", via: "mobil", online: true, words: 84, games: 3 },
      ...(appCalls > 1 ? [{ id: 4, username: "deniz", created: "2026-10-11 09:00", last_app: "2026-11-24 19:20", last_seen: "2026-11-24 19:20", via: "eklenti", online: true, words: 40, games: 1 }] : []),
      { id: 4 + 100, username: "kaan", created: "2026-10-11 09:00", last_app: "2026-11-24 08:02", last_seen: "2026-11-24 08:02", via: "web", online: false, words: 40, games: 1 },
      { id: 7, username: "ece", created: "2026-11-20 21:00", last_app: "2026-11-19 20:10", last_seen: "2026-11-19 20:10", via: "mobil", online: false, words: 12, games: 0 },
      { id: 8, username: "yeni", created: "2026-11-23 21:00", last_app: null, last_seen: null, via: "mobil", online: false, words: 0, games: 0 }] }; };
const mocks = {
  "/app-users": appUsers,
  "/session": () => ({ admin: true }), "/stats": stats, "/funnel": funnel, "/health": health, "/bot-check": () => ({ verdict: "Yeterli veri yok.", days: [{ day: "2026-11-22", installs: 0, users: 0, calls: 700, anon: 400, entered: false }] }),
  "/referrals": () => ({ total: 6, top: [{ id: 1, username: "zeri", n: 4, active: 3, last: "2026-11-20" }], recent: [{ id: 2, username: "ali", inviter_id: 1, inviter: "zeri", active: true, at: "2026-11-20" }], errors: [] }),
  "/users": () => [{ id: 1, username: "zeri", method: "parola", invited_by: "", via: "eklenti", created: "2026-10-01", last_seen: "2026-11-23 13:50", words: 210, games: 12, score: 4200, ban: "", game_ban: "" }],
  "/users/1": () => ({ id: 1, username: "zeri", created: "2026-10-01", last_seen: "2026-11-23 13:50", sessions: 2, ban: "", game_ban: "", ban_reason: "", game_ban_reason: "",
    origin: { method: "parola", via: "eklenti", invited_by: "", invited: 0, has_email: false }, games: [{ episode: "Dark", score: 900, place: 1, players: 3, at: "2026-11-20" }],
    episodes: [{ episode: "Easy Spanish 344", n: 40, at: "2026-11-21" }], words: [{ tr: "hola", eng: "hello", pair: "es>en", episode: "Easy Spanish 344", at: "2026-11-21" }] }),
  "/rooms": () => [], "/word-pairs": () => [{ pair: "tr>en", n: 100 }], "/words": () => [{ id: 1, tr: "merhaba", eng: "hello", at: "2026-11-01" }],
  "/providers": () => ({ gcloud_key: true, providers: { google: { blocked_for_s: 0, fails: 0 }, mymemory: { blocked_for_s: 300, fails: 4 } }, lemma_ready: true, negative_cache: 12, deferred: 0 }),
  "/hygiene": () => ({ signups_old: 3, tickets_old: 0, log_old: 2, orphans: [{ table: "user_words", n: 0 }], inactive_12m: 4 }),
  "/log": () => [{ at: "2026-11-23 13:00", action: "admin_login", target: "", detail: "", ip: "1.2.3.4" }],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VP === "mobile" ? { width: 390, height: 844 } : { width: 1360, height: 900 }, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.route("http://admin.test/**", (route) => {
  const u = new URL(route.request().url());
  if (u.pathname === "/admin") return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
  if (u.pathname.startsWith("/static/")) { const fp = path.join(root, u.pathname.slice(1)); return route.fulfill({ status: 200, contentType: fp.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream", body: fs.readFileSync(fp) }); }
  const p = u.pathname.replace("/admin/api", "");
  if (p === "/traffic") return route.fulfill({ json: traffic(Number(u.searchParams.get("days")) || 7) });
  const f = mocks[p];
  return f ? route.fulfill({ json: f() }) : route.fulfill({ status: 404, json: { detail: "mock yok: " + p } });
});
await page.goto("http://admin.test/admin");
await page.waitForSelector("#nav button");
if (DAYS !== 7) { await page.evaluate((n) => { period["Ziyaretçiler"] = n; }, DAYS).catch(() => {}); }
const names = await page.$$eval("#nav button", (bs) => bs.map((b) => b.dataset.name));
const tag = (VP === "mobile" ? "m-" : "") + (ANON ? "anon-" : "") + (EMPTY ? "empty-" : "");
for (const name of names) {
  if (ONLY && name !== ONLY) continue;
  await page.locator("#nav button", { hasText: name }).first().click();
  await page.waitForTimeout(700);
  const file = path.join(out, `${tag}${name.replace(/\s+/g, "-")}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${name}: ${path.relative(root, file)}${overflow > 1 ? "  ⚠ yatay taşma " + overflow + "px" : ""}`);
}
// Grafiğin üstüne gelince ipucu kutusu çıkıyor mu?
if (!ONLY || ONLY === "Ziyaretçiler") {
  await page.locator("#nav button", { hasText: "Ziyaretçiler" }).first().click();
  await page.waitForTimeout(700);
  const chart = page.locator(".chart").first();
  await chart.scrollIntoViewIfNeeded();
  const box = await page.locator(".chart svg").first().boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5);
    await page.waitForTimeout(250);
    console.log("grafik ipucu görünüyor:", (await page.locator(".tip:not(.hide)").count()) > 0);
    await chart.screenshot({ path: path.join(out, `${tag}tooltip.png`) });
  }
}
// Klavye: Kullanıcılar listesinde satıra Tab ile gelip Enter ile detay açılıyor mu?
if (!ONLY) {
  await page.locator("#nav button", { hasText: "Kullanıcılar" }).first().click();
  await page.waitForSelector("tr.click");
  await page.locator("tr.click").first().focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  const opened = await page.locator("#view h2").first().textContent().catch(() => "");
  console.log("klavye Enter ile kullanıcı detayı:", opened && opened.includes("zeri") ? "açıldı" : "AÇILMADI (" + opened + ")");
  const bodyTxt = await page.locator("#view").innerText();
  console.log("ekranda 'null' yazısı:", /\bnull\b/.test(bodyTxt) ? "VAR" : "yok");
  await page.screenshot({ path: path.join(out, tag + "kullanici-detay.png"), fullPage: true });
  // Hızlı sekme değişimi: eski yanıt yeni ekrana karışmasın
  await page.locator("#nav button", { hasText: "Özet" }).first().click();
  await page.locator("#nav button", { hasText: "Huni" }).first().click();
  await page.waitForTimeout(900);
  console.log("hızlı sekme değişiminde başlık:", await page.locator("#title").textContent(), "· Özet kartı karışmış mı:", (await page.locator("#view .kpis").count()) > 0 ? "EVET" : "hayır");
}
if (!ONLY || ONLY === "Mobil uygulama") {
  // Canlı yenileme: sekme açıkken 15 sn sonra liste kendiliğinden güncellenmeli, başka sekmeye geçince durmalı
  await page.locator("#nav button", { hasText: "Mobil uygulama" }).first().click();
  await page.waitForSelector("#view table, #view .empty", { timeout: 5000 });
  const before = await page.locator("#view .sub").first().innerText();
  const c0 = appCalls;
  await page.waitForTimeout(16500);
  const after = await page.locator("#view .sub").first().innerText();
  console.log("mobil uygulama canlı yenileme:", appCalls > c0 && before !== after ? "çalıştı (" + before.split("şimdi ")[1] + " → " + after.split("şimdi ")[1] + ")" : "ÇALIŞMADI", "· çağrı", c0, "→", appCalls);
  await page.screenshot({ path: path.join(out, tag + "Mobil-uygulama-canli.png"), fullPage: true });
  await page.locator("#nav button", { hasText: "Özet" }).first().click();
  const c1 = appCalls; await page.waitForTimeout(16500);
  console.log("başka sekmeye geçince yenileme durdu mu:", appCalls === c1 ? "evet" : "HAYIR (" + c1 + " → " + appCalls + ")");
}
console.log(errors.length ? "HATALAR:\n" + errors.join("\n") : "konsol hatası yok");
await browser.close();
