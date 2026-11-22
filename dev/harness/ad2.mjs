// Reklam v2'yi kare kare üretir (deterministik): her kare için seek(t) -> PNG; sonra mp4 (H.264, macOS'un kendi kodlayıcısı; ffmpeg gerekmez).
// Kullanım (dev/ klasöründen):
//   node harness/ad2.mjs a still 1.4,2.4,4,5.8      -> yalnızca bu saniyelerin önizleme karelerini yazar
//   node harness/ad2.mjs a video [fps=30]           -> tam video (dev/out/ad2/cinevocab-ad-a-en.mp4)
//   değişkenler: a (merak) | b (ücretli olmamalı); ek argüman: l=tr  -> Türkçe metin
import { chromium } from "playwright";
import { mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "out", "ad2");
const [, , VAR = "a", MODE = "still", ARG = "", ...rest] = process.argv;
const LANG = [ARG, ...rest].find((x) => /^l=/.test(x))?.slice(2) || "en";
const coords = readFileSync(join(OUT, "assets", "coords.json"), "utf8");
const FPS = Number(/^\d+$/.test(ARG) ? ARG : 30);
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, colorScheme: "dark" });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("SAYFA HATASI:", e.message));
await page.addInitScript(`window.COORD_DATA = ${coords};`);
await page.goto(pathToFileURL(join(HERE, "store", "ad2.html")).href + `?v=${VAR}&l=${LANG}`);
await page.waitForFunction("window.READY === true", null, { timeout: 15000 });
const total = await page.evaluate("TL[VARIANT].total");

if (MODE === "still") {
  for (const t of ARG.split(",").map(Number).filter((x) => !isNaN(x))) {
    await page.evaluate((x) => seek(x), t);
    await page.screenshot({ path: join(OUT, `still-${VAR}-${LANG}-${String(t).replace(".", "_")}.png`) });
  }
  console.log("önizleme kareleri:", OUT);
} else {
  const dir = join(OUT, `frames-${VAR}-${LANG}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const n = Math.round(total * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((x) => seek(x), i / FPS);
    await page.screenshot({ path: join(dir, `f${String(i).padStart(4, "0")}.png`) });
    if (i % 60 === 0) console.log(`kare ${i}/${n}`);
  }
  const mp4 = join(OUT, `cinevocab-ad-${VAR}-${LANG}.mp4`), sw = resolve(HERE, "..", "tools", "frames2mp4.swift");
  if (existsSync(sw)) {
    const m = spawnSync("swift", [sw, dir, String(FPS), mp4], { encoding: "utf8" });
    console.log(m.status === 0 ? "mp4: " + mp4 : "mp4 HATA: " + (m.stderr || m.stdout));
  }
}
await b.close();
