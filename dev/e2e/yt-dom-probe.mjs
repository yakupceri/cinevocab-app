// YouTube'un gerçek sayfa yapısını yoklar (yalnızca okur; hesap yok, tıklama yalnızca altyazı düğmesi ve önizleme için fare üstüne gelme).
// Amaç: eklentinin altyazı okuyucusunu doğru öğeye bağlamak ve YouTube yapıyı değiştirirse bunu fark etmek.
// Kullanım: cd dev && node e2e/yt-dom-probe.mjs [videoId]
import { chromium } from "playwright";

const VIDEO = process.argv[2] || "dQw4w9WgXcQ";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: "chromium", headless: true, args: ["--lang=en-US", "--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const ctx = await b.newContext({ locale: "en-US", viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();

async function consent() {
  for (const t of ["Reject all", "Reject the use of cookies", "Accept all"]) {
    const btn = p.getByRole("button", { name: t }).first();
    if (await btn.count().catch(() => 0)) { await btn.click({ timeout: 3000 }).catch(() => {}); await sleep(1500); return t; }
  }
  return "";
}
const snap = () => p.evaluate(() => {
  const chain = (el) => { const o = []; for (let n = el; n && n !== document.body && o.length < 12; n = n.parentElement) o.push(n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (n.className && typeof n.className === "string" ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".") : "")); return o.join(" < "); };
  const segs = [...document.querySelectorAll("span.ytp-caption-segment")];
  const vids = [...document.querySelectorAll("video")].map((v) => ({ w: v.offsetWidth, paused: v.paused, inMovie: !!v.closest("#movie_player"), inPreview: !!v.closest("ytd-video-preview"), rs: v.readyState }));
  return {
    path: location.pathname,
    movie_player: !!document.querySelector("#movie_player"),
    shorts_player: !!document.querySelector("#shorts-player"),
    players: [...document.querySelectorAll(".html5-video-player")].map((e) => ({ id: e.id, inPreview: !!e.closest("ytd-video-preview"), cls: [...e.classList].filter((c) => /preview|mini|ytp-(?:small|large|embed)/.test(c)).join(" ") })),
    previewEl: !!document.querySelector("ytd-video-preview"),
    segments: segs.map((s) => ({ text: (s.textContent || "").slice(0, 40), inMovie: !!s.closest("#movie_player"), inPreview: !!s.closest("ytd-video-preview"), chain: chain(s) })),
    videos: vids,
  };
});

console.log("== ANA SAYFA");
await p.goto("https://www.youtube.com/", { waitUntil: "domcontentloaded" });
await sleep(2500);
console.log("consent:", (await consent()) || "yok");
await p.waitForSelector("ytd-rich-item-renderer", { timeout: 20000 }).catch(() => console.log("ana sayfada video kartı yok (giriş/bölge)"));
console.log(JSON.stringify(await snap(), null, 1));
const thumb = p.locator("ytd-rich-item-renderer #thumbnail").first();
if (await thumb.count()) {
  await thumb.scrollIntoViewIfNeeded().catch(() => {});
  const box = await thumb.boundingBox();
  if (box) { await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 }); }
  await sleep(4500);                       // YouTube önizlemeyi kısa bir bekleyişten sonra başlatır
  console.log("-- ana sayfa, küçük resmin üstüne gelindi (önizleme)");
  console.log(JSON.stringify(await snap(), null, 1));
}

console.log("== İZLEME SAYFASI", VIDEO);
await p.goto("https://www.youtube.com/watch?v=" + VIDEO, { waitUntil: "domcontentloaded" });
await p.waitForSelector("#movie_player", { timeout: 20000 }).catch(() => console.log("#movie_player yok"));
await sleep(3000);
const cc = p.locator(".ytp-subtitles-button").first();
if (await cc.count()) {
  const pressed = await cc.getAttribute("aria-pressed");
  console.log("CC düğmesi aria-pressed:", pressed);
  if (pressed === "false") { await cc.click({ timeout: 3000 }).catch(() => {}); }
}
await sleep(6000);
console.log(JSON.stringify(await snap(), null, 1));
await b.close();
