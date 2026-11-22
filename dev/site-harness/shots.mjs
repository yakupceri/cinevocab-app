// Site ekran görüntüleri: dev/site-harness/serve.py açıkken her sayfayı masaüstü (1280x800) ve telefon (390x844),
// koyu ve açık temada PNG'ye çevirir. Çıktı: dev/out/site/*.png. Konsol/sayfa hatası olursa sonda listeler ve 1 ile çıkar.
//   cd dev && node site-harness/shots.mjs [süzgeç] [--port 8810] [--theme dark|light] [--vp desktop|mobile]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const FILTER = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--"))) || "";
const PORT = opt("port", "8810");
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "site");
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const VPS = { desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844 } };
const THEMES = ["dark", "light"];
const LANG = opt("lang", "tr");

const tabs = (name, hash, scene = "full", extra) => ({ name, scene, url: `/account#${hash}`, ready: ".layout", extra });
const SHOTS = [
  tabs("words", "words"),
  { ...tabs("words-selected", "words"), vpOnly: false, viewport: true, extra: async (p) => { await p.locator("button.w").nth(1).click(); await p.locator("button.w").nth(4).click(); await wait(200); } },
  tabs("videos", "videos"),
  tabs("known", "known"),
  tabs("practice", "practice"),
  tabs("duel", "duel"),
  { ...tabs("duel-open", "duel"), extra: async (p) => { await p.getByRole("button", { name: /Düzenle|Edit/ }).click(); await wait(150); } },
  { ...tabs("duel-open-screen", "duel"), extra: async (p) => { await p.getByRole("button", { name: /Düzenle|Edit/ }).click(); await p.locator(".modepick button").nth(2).click(); await wait(150); } },
  tabs("leagues", "leagues"),
  tabs("settings", "settings"),
  tabs("words-empty", "words", "empty"),
  tabs("videos-empty", "videos", "empty"),
  tabs("duel-nowords", "duel", "empty"),
  { name: "auth-login", scene: "loggedout", url: "/account", ready: ".auth" },
  { name: "game-join", scene: "full", url: "/game", ready: ".codein" },
  { name: "game-lobby", scene: "full", url: "/game", ready: ".roomcode", ws: "lobby", seed: { t: "create", src: "es", dst: "en", episode: "", n: 10, seconds: 12, password: "", mode: "choice", screen: false, learn: "src" } },
  { name: "game-lobby-guest", scene: "full", url: "/game", ready: ".roomcode", ws: "lobby-guest", seed: { t: "join", code: "4821", password: "" } },
  { name: "game-question", scene: "full", url: "/game", ready: ".opts button", ws: "question", seed: { t: "create", src: "es", dst: "en", episode: "", n: 10, seconds: 12, password: "", mode: "choice", screen: false, learn: "src" } },
  { name: "game-reveal", scene: "full", url: "/game", ready: ".opts button.ok", ws: "reveal", seed: { t: "create", src: "es", dst: "en", episode: "", n: 10, seconds: 12, password: "", mode: "choice", screen: false, learn: "src" } },
  { name: "game-end", scene: "full", url: "/game", ready: ".pod", ws: "end", seed: { t: "create", src: "es", dst: "en", episode: "", n: 10, seconds: 12, password: "", mode: "choice", screen: false, learn: "src" } },
  { name: "game-screen-lobby", scene: "full", url: "/game", ready: ".roomcode.xl", ws: "screen", seed: { t: "create", src: "es", dst: "en", episode: "", n: 10, seconds: 12, password: "", mode: "choice", screen: true, learn: "src" } },
  { name: "daily", scene: "full", url: "/daily", ready: ".card" },
  { name: "daily-play", scene: "full", url: "/daily", ready: ".card", extra: async (p) => { await p.getByRole("button", { name: /Bugünün|today|Continue|Devam/i }).first().click(); await p.waitForSelector(".opts button"); await wait(300); } },
  { name: "landing", scene: "full", url: "/", ready: ".hero" },
  { name: "explore", scene: "full", url: "/explore", ready: ".topics a" },
  { name: "join", scene: "full", url: "/join/K7M2QX", ready: ".card h1" },
  { name: "learn", scene: "full", url: "/learn/es", ready: ".lp h1" },
  { name: "profile", scene: "full", url: "/u/yakup_demo", ready: ".pf h1" },
];

// game.html için tarayıcıda sahte WebSocket: sunucu protokolü (me, room, countdown, question, reveal, end) birebir aynı iletilerle taklit edilir
const FAKE_WS = (kind) => `(() => {
  const ME = "p-me";
  const players = [{ id: ME, name: "yakup_demo", score: 0 }, { id: "p2", name: "lucia_m", score: 0 }, { id: "p3", name: "tomas99", score: 0 }];
  const room = (host) => ({ t: "room", code: "4821", episode: "", host, src: "es", dst: "en", n: 10, seconds: 12, locked: false, mode: "choice", learn: "src", screen: ${kind === "screen"}, players: ${kind === "screen" ? "[players[1], players[2]]" : "players"} });
  const q = { t: "question", idx: 2, total: 10, tr: "verdad", options: ["truth", "never", "money", "fear"], seconds: 12, mode: "choice" };
  const reveal = { t: "reveal", correct: "truth", dist: { truth: 2, never: 1 }, results: [{ id: ME, name: "yakup_demo", ok: true, delta: 118, score: 318, streak: 3 }, { id: "p2", name: "lucia_m", ok: false, delta: 0, score: 276, streak: 0 }, { id: "p3", name: "tomas99", ok: true, delta: 96, score: 240, streak: 1 }] };
  const end = { t: "end", scores: [{ id: ME, name: "yakup_demo", score: 940 }, { id: "p2", name: "lucia_m", score: 880 }, { id: "p3", name: "tomas99", score: 610 }] };
  window.WebSocket = class {
    constructor() { this.readyState = 1; setTimeout(() => { this.onopen && this.onopen(); }, 20); }
    send(d) { const m = JSON.parse(d); window.__sent = (window.__sent || []).concat([m]); const out = (o, ms) => setTimeout(() => this.onmessage && this.onmessage({ data: JSON.stringify(o) }), ms);
      if (m.t === "create" || m.t === "join") {
        const host = ${kind === "lobby-guest" ? '"p2"' : "ME"};
        out({ t: "me", id: ME }, 10); out(room(host), 30);
        if ("${kind}" === "question") { out({ t: "countdown", seconds: 0 }, 60); out(q, 120); }
        if ("${kind}" === "reveal") { out(q, 80); out(reveal, 160); }
        if ("${kind}" === "end") out(end, 80);
      }
    }
    close() {}
  };
})();`;

const browser = await chromium.launch();
const problems = [];
let n = 0;
for (const theme of THEMES) {
  if (opt("theme") && opt("theme") !== theme) continue;
  for (const [vpName, vp] of Object.entries(VPS)) {
    if (opt("vp") && opt("vp") !== vpName) continue;
    for (const s of SHOTS) {
      if (FILTER && !s.name.includes(FILTER)) continue;
      await fetch(`${BASE}/__scene?name=${s.scene}`);
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: Number(opt("dpr", "1")), locale: LANG === "tr" ? "tr-TR" : "en-US", serviceWorkers: "block", hasTouch: vpName === "mobile" });
      await ctx.addInitScript(([th, lang]) => { try { localStorage.setItem("cv-theme", th); localStorage.setItem("cv-lang", lang); localStorage.setItem("cv-pair", "es:en"); } catch (e) {} }, [theme, LANG]);
      if (s.ws) await ctx.addInitScript(FAKE_WS(s.ws));
      if (s.seed) await ctx.addInitScript((seed) => { try { sessionStorage.setItem("cv-duel", JSON.stringify(seed)); } catch (e) {} }, s.seed);
      await ctx.route(/fonts\.googleapis|fonts\.gstatic|tvmaze|accounts\.google/, (r) => r.abort());
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/fonts\.|tvmaze|google/.test(m.location().url || "") && !(s.scene === "loggedout" && /401/.test(m.text()))) errs.push("console.error: " + m.text() + " " + (m.location().url || "")); });
      page.on("requestfailed", (r) => { if (!/fonts\.|tvmaze|google/.test(r.url())) errs.push("requestfailed: " + r.url()); });
      await page.goto(BASE + s.url, { waitUntil: "load" });
      await page.waitForSelector(s.ready, { timeout: 8000 }).catch((e) => errs.push("hazır olmadı: " + s.ready));
      await wait(350);
      if (s.extra) await s.extra(page);
      await wait(250);
      const file = join(OUT, `${s.name}.${vpName}.${theme}.png`);
      if (s.viewport) await page.screenshot({ path: file });
      else { const h = await page.evaluate(() => document.documentElement.scrollHeight); await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width: vp.width, height: Math.min(h, vpName === "mobile" ? 1900 : 1500) } }); }
      n++;
      if (errs.length) problems.push(`${s.name}.${vpName}.${theme}: ${errs.join(" | ")}`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`${n} görüntü -> ${OUT}`);
if (problems.length) { console.log("SORUNLAR:\n" + problems.join("\n")); process.exitCode = 1; } else console.log("konsol/sayfa hatası yok");
