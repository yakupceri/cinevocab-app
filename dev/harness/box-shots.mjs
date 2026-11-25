// Video üstü çeviri kutusu: okunaklılık görüntüleri. Sahte video sahnesi (dev/harness/video.html) üzerinde, kutu opaklığı varsayılan (.85)
// ve en düşük (.6) değerde; sahne arka planı koyu, orta ve çok parlak. Çıktı: dev/out/box/*.png
// Kullanım: cd dev && node harness/box-shots.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "out", "box");
mkdirSync(OUT, { recursive: true });
const PORT = 8820, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [];
const BG = { koyu: "#0b0f12", orta: "#6d7f86", parlak: "#f4f1e6" };
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/popup.html")).ok) break; } catch (e) {} await wait(150); }
  for (const [name, bg] of Object.entries(BG)) for (const op of [0.85, 0.6]) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 520 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => problems.push(`${name}/${op}: ${e}`));
    await p.addInitScript((o) => { try { sessionStorage.setItem("__op", String(o)); } catch (e) {} }, op);
    await p.goto(`${BASE}/__video.html?scene=on&line=0`);
    await p.addStyleTag({ content: `.stage{background:${bg} !important}.lamp,.win,.fig,.head{opacity:0 !important}` });
    await wait(1800);
    await p.evaluate((o) => { try { chrome.storage.local.set({ box: { h: "c", hx: 0.5, v: "t", vy: 0.3, s: 1.4, op: o, locked: false, w: 0, c: 5 } }); } catch (e) {} }, op);
    await wait(1200);
    const host = p.locator("div").filter({ has: p.locator("xpath=.") }).first();
    await p.screenshot({ path: join(OUT, `kutu-${name}-op${String(op).replace(".", "")}.png`), clip: { x: 0, y: 0, width: 1100, height: 330 } });
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + problems.join("\n") : "konsol hatası yok", "→", OUT);
