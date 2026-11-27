// 2.4.0 tanıtım videosu ("Gece Seansı", 1920x1080, 30 fps). Kare kare üretir (deterministik): seek(t) -> PNG -> mp4 (H.264) + özgün müzik.
// Sahne: dev/harness/store/storeart.html (başlıklar, renkler, popup/kutu çizimleri) üstüne store/ad4.js (video akışı) ve store/ad4-site.js (düello, lig, ilerleme).
// Kullanım (dev/ klasöründen), Türkçe için komuta  tr  ekle:
//   node harness/ad4.mjs still 1,7.5,20      -> önizleme kareleri (dev/out/ad4/)
//   node harness/ad4.mjs video               -> dev/out/release-2.4.0/cinevocab-promo-video-16x9.mp4  (tr: .../tr/cinevocab-tanitim-16x9.mp4)
//   node harness/ad4.mjs audio               -> yalnızca müziği yeniden üretip mevcut sessiz videoya ekler
// Müzik: dev/tools/music.py (kodla üretilen özgün enstrümantal + olaylara bağlı ses efektleri).
// Her karede 15'te bir taşma denetimi çalışır; sorun varsa "UYARI" yazar ve betik 1 ile çıkar.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), TR = args.includes("tr");
const [MODE = "still", LIST = "1"] = args.filter((a) => a !== "tr");
const LANG = TR ? "tr" : "en", FPS = 30;
const WORK = resolve(HERE, "..", "out", "ad4"), TOOLS = resolve(HERE, "..", "tools");
const REL = resolve(HERE, "..", "out", "release-2.4.0", TR ? "tr" : ".");
const FINAL = join(REL, TR ? "cinevocab-tanitim-16x9.mp4" : "cinevocab-promo-video-16x9.mp4");
const SILENT = join(WORK, `silent-${LANG}.mp4`), CUES = join(WORK, `cues-${LANG}.json`), WAV = join(WORK, `music-${LANG}.wav`);
mkdirSync(WORK, { recursive: true }); mkdirSync(REL, { recursive: true });

const run = (cmd, a, label) => { const r = spawnSync(cmd, a, { encoding: "utf8" }); console.log(r.status === 0 ? r.stdout.trim() : `${label} HATA: ${r.stderr || r.stdout}`); if (r.status !== 0) process.exit(1); };
const addAudio = () => { run("python3", ["-I", join(TOOLS, "music.py"), CUES, WAV, "0.72"], "müzik"); run("swift", [join(TOOLS, "mux-audio.swift"), SILENT, WAV, FINAL], "ses ekleme"); };

if (MODE === "audio") { addAudio(); process.exit(0); }

const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark" })).newPage();
let bad = 0;
const warn = (m) => { bad++; console.log("UYARI:", m); };
page.on("pageerror", (e) => warn("sayfa hatası: " + e.message));
page.on("console", (m) => { if (m.type() === "error") warn("konsol: " + m.text()); });
page.on("requestfailed", (r) => warn("yüklenemedi: " + r.url()));
page.on("request", (r) => { if (!r.url().startsWith("file:")) warn("harici istek: " + r.url()); });
await page.goto(pathToFileURL(join(HERE, "store", "storeart.html")).href + "?k=video" + (TR ? "&l=tr" : ""));
await page.waitForFunction("document.title === 'ready'");
await page.addScriptTag({ path: join(HERE, "store", "ad4-site.js") });
await page.addScriptTag({ path: join(HERE, "store", "ad4.js") });
await page.waitForFunction("window.READY === true", null, { timeout: 20000 });
const total = await page.evaluate("getTotal()"), scenes = await page.evaluate("SCENES()");
console.log(`süre ${total.toFixed(1)} sn · sahneler:`, scenes.map(([i, t0]) => `${i}@${t0}`).join(" "));
writeFileSync(CUES, JSON.stringify({ total, cues: await page.evaluate("CUES()") }));

const seen = new Set();
const frame = async (t, path, check) => {
  await page.evaluate((x) => seek(x), t);
  if (check) for (const w of await page.evaluate("CHECK()")) if (!seen.has(w)) { seen.add(w); warn(`${w} (t=${t.toFixed(2)})`); }
  await page.screenshot({ path });
};
if (MODE === "still") {
  for (const t of LIST.split(",").map(Number)) await frame(t, join(WORK, `still-${LANG}-${String(t).replace(".", "_")}.png`), true);
  console.log("önizleme:", WORK);
} else {
  const dir = join(WORK, `frames-${LANG}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const n = Math.round(total * FPS);
  for (let i = 0; i < n; i++) {
    await frame(i / FPS, join(dir, `f${String(i).padStart(4, "0")}.png`), i % 15 === 0);
    if (i % 150 === 0) console.log(`kare ${i}/${n}`);
  }
  run("swift", [join(TOOLS, "frames2mp4.swift"), dir, String(FPS), SILENT], "mp4");
  rmSync(dir, { recursive: true, force: true });
  addAudio();
}
await b.close();
if (bad) { console.log(bad + " sorun var."); process.exit(1); }
