// Sitenin PNG simgelerini docs/marka/cinevocab-simge.svg dosyasından üretir (çizime dokunmaz, yalnızca boyut ve zemin).
// Kullanım: cd dev && node tools/logo-png.mjs
// - icon-192.png: simgenin kendisi (yuvarlak köşeli).
// - apple-touch-icon.png (180): köşesiz tam zemin; iOS köşeyi kendi yuvarlar, saydam köşe siyah çıkar.
// - icon-maskable-512.png: tam zemin + çizim %80 ölçekte (Android maskesi kenarı kırpar, bilet güvenli alanda kalsın).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const svg = readFileSync(path.join(root, "docs/marka/cinevocab-simge.svg"), "utf8");
const full = svg.replace('rx="112" ', "");                       // köşesiz zemin
if (full === svg) throw new Error("simge SVG'sinde rx=\"112\" bulunamadı; dosya değişmiş");
const masked = full.replace('<g transform="rotate(-6 256 256)', '<g transform="translate(256 256) scale(.8) translate(-256 -256)"><g transform="rotate(-6 256 256)').replace(/<\/g>\s*<\/svg>/, "</g></g></svg>");
if (masked === full) throw new Error("bilet grubu bulunamadı; dosya değişmiş");
const out = (f) => path.join(root, "static/icons", f);
const jobs = [
  { file: "icon-192.png", size: 192, html: svg, clear: true },
  { file: "apple-touch-icon.png", size: 180, html: full },
  { file: "icon-maskable-512.png", size: 512, html: masked },
];
const b = await chromium.launch({ channel: "chromium", headless: true });
for (const j of jobs) {
  const p = await b.newPage({ viewport: { width: j.size, height: j.size }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100%;height:100%}</style>${j.html}`);
  await p.screenshot({ path: out(j.file), omitBackground: !!j.clear });
  await p.close();
  console.log("yazıldı", j.file, j.size);
}
await b.close();
