// Arayüzde kullanılan çeviri anahtarları 6 dilde (tr en fr it de es) var mı? Statik tarama: t("anahtar") çağrıları + data-i.
//   node dev/site-harness/i18n-check.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(join(ROOT, "static/i18n.js"), "utf8").replace("var D = {};", "var D = window.__D = {};");
globalThis.window = {}; globalThis.document = { documentElement: { setAttribute() {}, getAttribute() { return "dark"; } }, addEventListener() {} };
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
(0, eval)(src);
const D = window.__D, LANGS = ["en", "tr", "fr", "it", "de", "es"];
const files = ["templates/account.html", "templates/game.html", "templates/daily.html", "templates/join.html", "templates/landing.html", "templates/explore.html", "templates/profile.html", "static/common.js"];
const keys = new Map();
for (const f of files) {
  const s = readFileSync(join(ROOT, f), "utf8");
  for (const m of s.matchAll(/\bt\(\s*"([A-Za-z0-9_]+)"/g)) { if (!keys.has(m[1])) keys.set(m[1], new Set()); keys.get(m[1]).add(f.split("/").pop()); }
  for (const m of s.matchAll(/data-i(?:-ph)?="([A-Za-z0-9_]+)"/g)) { if (!keys.has(m[1])) keys.set(m[1], new Set()); keys.get(m[1]).add(f.split("/").pop()); }
}
["nav_", "gs", "bdg_", "tp_"].forEach((k) => keys.delete(k)); // t("nav_" + k) gibi birleştirilen anahtarların yalnızca öneki
// dinamik anahtarlar
const dyn = [];
for (const k of ["words", "videos", "known", "practice", "duel", "leagues", "settings"]) dyn.push("nav_" + k);
for (const n of [1, 2, 3, 4]) { dyn.push("gs" + n); dyn.push("gs" + n + "T"); }
for (const b of ["connector", "ambassador", "legend", "invited"]) dyn.push("bdg_" + b);
dyn.forEach((k) => { if (!keys.has(k)) keys.set(k, new Set(["dinamik"])); });
let missing = 0;
for (const lang of LANGS) {
  const miss = [...keys.keys()].filter((k) => !(D[lang] && D[lang][k]));
  if (miss.length) { missing += miss.length; console.log(`${lang}: EKSİK ${miss.length} -> ${miss.join(", ")}`); } else console.log(`${lang}: tamam (${keys.size} anahtar)`);
}
// yeni (v18) anahtarlar: kaç tanesi 6 dilde
process.exitCode = missing ? 1 : 0;
