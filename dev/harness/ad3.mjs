// Reklam v3'ü kare kare üretir (deterministik): seek(t) -> PNG -> mp4 (H.264, macOS'un kendi kodlayıcısı).
// Kullanım (dev/ klasöründen):
//   node harness/ad3.mjs wide still live:2.5,keep:1.8,cloze:3.4     -> önizleme kareleri (sahne:saniye ya da düz saniye)
//   node harness/ad3.mjs wide video                                  -> 1920x1080 tam video  (dev/out/ad3/cinevocab-store-wide.mp4)
//   node harness/ad3.mjs tall video short                            -> 1080x1920 kısa kesit (dev/out/ad3/cinevocab-short-tall.mp4)
//   Türkçe sürüm: komuta  l=tr  ekle (örn. node harness/ad3.mjs wide video l=tr); önce  node harness/ad2-assets.mjs tr  çalışmış olmalı.
//   node harness/ad3.mjs wide audio                                   -> yalnızca müziği yeniden üretip mevcut sessiz videoya ekler (kare üretmez)
//   Müzik: dev/tools/music.py (kodla üretilen özgün enstrümantal + olaylara bağlı ses efektleri). Kendi şarkını eklemek için: audio=/yol/sarki.mp3
// ek bayraklar: logo=ticket  (üst logo: bilet "Cv")
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "out", "ad3");
const [, , FMT = "wide", MODE = "still", ...rest] = process.argv;
const CUT = rest.includes("short") ? "short" : "full", LOGO = rest.includes("logo=ticket") ? "ticket" : "sun", LANG = rest.includes("l=tr") ? "tr" : "en", SFX = LANG === "tr" ? "-tr" : "";
const LIST = rest.find((x) => !["short", "logo=ticket", "l=tr"].includes(x) && !/^\d+$/.test(x)) || "";
const FPS = Number(rest.find((x) => /^\d+$/.test(x)) || 30);
const [W, H] = FMT === "tall" ? [1080, 1920] : [1920, 1080];
mkdirSync(OUT, { recursive: true });
const coords = readFileSync(join(HERE, "..", "out", "ad2", LANG === "tr" ? "assets-tr" : "assets", "coords.json"), "utf8");

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark" });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("SAYFA HATASI:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("konsol:", m.text()); });
await page.addInitScript(`window.COORD_DATA = ${coords};`);
await page.goto(pathToFileURL(join(HERE, "store", "ad3.html")).href + `?fmt=${FMT}&cut=${CUT}&logo=${LOGO}&l=${LANG}`);
await page.waitForFunction("window.READY === true", null, { timeout: 20000 });
const total = await page.evaluate("getTotal()"), scenes = await page.evaluate("SCENES()");
console.log(`süre ${total.toFixed(1)} sn · sahneler:`, scenes.map(([i, t0, d]) => `${i}@${t0.toFixed(1)}`).join(" "));

const cues = await page.evaluate("CUES()");
const cuesFile = join(OUT, `cues-${FMT}-${CUT}${SFX}.json`);
writeFileSync(cuesFile, JSON.stringify({ total, cues }));
const BASE = `cinevocab-${CUT === "short" ? "short" : "store"}-${FMT}${SFX}`, SILENT = join(OUT, BASE + "-silent.mp4"), FINAL = join(OUT, BASE + ".mp4");
const OWN_AUDIO = rest.find((x) => x.startsWith("audio="))?.slice(6);
function addAudio() {
  const wav = join(OUT, BASE + ".wav"), tools = resolve(HERE, "..", "tools");
  let audio = OWN_AUDIO;
  if (!audio) {
    const m = spawnSync("python3", ["-I", join(tools, "music.py"), cuesFile, wav], { encoding: "utf8" });
    console.log(m.status === 0 ? m.stdout.trim() : "müzik HATA: " + m.stderr); if (m.status !== 0) return;
    audio = wav;
  }
  const x = spawnSync("swift", [join(tools, "mux-audio.swift"), SILENT, audio, FINAL], { encoding: "utf8" });
  console.log(x.status === 0 ? x.stdout.trim() : "ses ekleme HATA: " + (x.stderr || x.stdout));
}

if (MODE === "audio") { addAudio(); } else if (MODE === "still") {
  for (const tok of LIST.split(",").filter(Boolean)) {
    let t = Number(tok); if (isNaN(t)) { const [id, u] = tok.split(":"), sc = scenes.find((s) => s[0] === id); t = sc[1] + Number(u); }
    await page.evaluate((x) => seek(x), t);
    await page.screenshot({ path: join(OUT, `still-${FMT}-${tok.replace(":", "_")}.png`) });
  }
  console.log("önizleme:", OUT);
} else {
  const dir = join(OUT, `frames-${FMT}-${CUT}${SFX}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const n = Math.round(total * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((x) => seek(x), i / FPS);
    await page.screenshot({ path: join(dir, `f${String(i).padStart(4, "0")}.png`) });
    if (i % 120 === 0) console.log(`kare ${i}/${n}`);
  }
  const sw = resolve(HERE, "..", "tools", "frames2mp4.swift");
  const m = spawnSync("swift", [sw, dir, String(FPS), SILENT], { encoding: "utf8" });
  console.log(m.status === 0 ? "sessiz mp4: " + SILENT : "mp4 HATA: " + (m.stderr || m.stdout));
  if (m.status === 0) { rmSync(dir, { recursive: true, force: true }); addAudio(); }
}
await b.close();
