// İlerleme paylaşım kartı (1080x1350 PNG, canvas): sahte veriyle üretir, dev/out/site/paylasim-karti.png olarak kaydeder.
// Kullanım: cd dev && node site-harness/share-card.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, "..", "out", "site");
mkdirSync(OUT, { recursive: true });
const PORT = 8824, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
let code = 0;
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch (e) {} await wait(150); }
  await fetch(`${BASE}/__scene?name=full`);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: "tr-TR", serviceWorkers: "block" });
  await ctx.addInitScript(() => { try { localStorage.setItem("cv-lang", "tr"); localStorage.setItem("cv-theme", "dark"); } catch (e) {}
    navigator.canShare = () => true; navigator.share = async (d) => { window.__shared = d; }; });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(BASE + "/account#words"); await p.waitForSelector(".layout"); await wait(500);
  await p.evaluate(() => shareProgress()); await wait(500);
  const b64 = await p.evaluate(async () => { const f = window.__shared && window.__shared.files && window.__shared.files[0]; if (!f) return ""; const buf = new Uint8Array(await f.arrayBuffer()); let s = ""; for (const c of buf) s += String.fromCharCode(c); return btoa(s); });
  if (!b64) { console.log("✘ kart üretilmedi (paylaşım çağrılmadı)"); code = 1; }
  else { writeFileSync(join(OUT, "paylasim-karti.png"), Buffer.from(b64, "base64")); console.log("✔ kart üretildi → dev/out/site/paylasim-karti.png"); }
  console.log(errs.length ? "SORUN: " + errs.join(" | ") : "konsol hatası yok");
  if (errs.length) code = 1;
} finally { await b.close(); srv.kill(); }
process.exit(code);
