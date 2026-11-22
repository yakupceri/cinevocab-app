// Reklam v3'ü kare kare üretir (deterministik): seek(t) -> PNG -> mp4 (H.264, macOS'un kendi kodlayıcısı).
// Kullanım (dev/ klasöründen):
//   node harness/ad3.mjs wide still live:2.5,keep:1.8,cloze:3.4     -> önizleme kareleri (sahne:saniye ya da düz saniye)
//   node harness/ad3.mjs wide video                                  -> 1920x1080 tam video  (dev/out/ad3/cinevocab-store-wide.mp4)
//   node harness/ad3.mjs tall video short                            -> 1080x1920 kısa kesit (dev/out/ad3/cinevocab-short-tall.mp4)
// ek bayraklar: logo=ticket  (üst logo: bilet "Cv")
import { chromium } from "playwright";
import { mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "out", "ad3");
const [, , FMT = "wide", MODE = "still", ...rest] = process.argv;
const CUT = rest.includes("short") ? "short" : "full", LOGO = rest.includes("logo=ticket") ? "ticket" : "sun";
const LIST = rest.find((x) => !["short", "logo=ticket"].includes(x) && !/^\d+$/.test(x)) || "";
const FPS = Number(rest.find((x) => /^\d+$/.test(x)) || 30);
const [W, H] = FMT === "tall" ? [1080, 1920] : [1920, 1080];
mkdirSync(OUT, { recursive: true });
const coords = readFileSync(join(HERE, "..", "out", "ad2", "assets", "coords.json"), "utf8");

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark" });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("SAYFA HATASI:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("konsol:", m.text()); });
await page.addInitScript(`window.COORD_DATA = ${coords};`);
await page.goto(pathToFileURL(join(HERE, "store", "ad3.html")).href + `?fmt=${FMT}&cut=${CUT}&logo=${LOGO}`);
await page.waitForFunction("window.READY === true", null, { timeout: 20000 });
const total = await page.evaluate("getTotal()"), scenes = await page.evaluate("SCENES()");
console.log(`süre ${total.toFixed(1)} sn · sahneler:`, scenes.map(([i, t0, d]) => `${i}@${t0.toFixed(1)}`).join(" "));

if (MODE === "still") {
  for (const tok of LIST.split(",").filter(Boolean)) {
    let t = Number(tok); if (isNaN(t)) { const [id, u] = tok.split(":"), sc = scenes.find((s) => s[0] === id); t = sc[1] + Number(u); }
    await page.evaluate((x) => seek(x), t);
    await page.screenshot({ path: join(OUT, `still-${FMT}-${tok.replace(":", "_")}.png`) });
  }
  console.log("önizleme:", OUT);
} else {
  const dir = join(OUT, `frames-${FMT}-${CUT}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const n = Math.round(total * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((x) => seek(x), i / FPS);
    await page.screenshot({ path: join(dir, `f${String(i).padStart(4, "0")}.png`) });
    if (i % 120 === 0) console.log(`kare ${i}/${n}`);
  }
  const mp4 = join(OUT, `cinevocab-${CUT === "short" ? "short" : "store"}-${FMT}.mp4`), sw = resolve(HERE, "..", "tools", "frames2mp4.swift");
  const m = spawnSync("swift", [sw, dir, String(FPS), mp4], { encoding: "utf8" });
  console.log(m.status === 0 ? "mp4: " + mp4 : "mp4 HATA: " + (m.stderr || m.stdout));
  if (m.status === 0) rmSync(dir, { recursive: true, force: true });
}
await b.close();
