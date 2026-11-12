/* CineVocab: YouTube videosunun altyazısından kelime listesi çıkarır.
   Yalnızca kullanıcı açılır pencerede "Kelimeleri çıkar"a basınca çalışır; kendiliğinden hiçbir istek atmaz.
   Altyazı, kullanıcının kendi tarayıcısından (youtube.com sayfasının içinden) çekilir; sunucuya altyazı metni değil,
   yalnızca [kelime, adet] listesi gider. lang.js (CVL) ilk içerik betiğiyle aynı dünyada yüklenir. */
(function () {
  if (window.__cvYt) return;
  window.__cvYt = true;

  const MAX_OUT = 6000;
  const TIMEOUT = 15000;

  function videoId() {
    const m = /[?&]v=([\w-]{6,15})/.exec(location.search) || /^\/shorts\/([\w-]{6,15})/.exec(location.pathname);
    return m ? m[1] : "";
  }

  // Sayfa kaynağındaki "captionTracks":[...] dizisini bul. Dizge içindeki köşeli parantezler sayılmaz.
  function grabArray(html, key) {
    const i = html.indexOf(key);
    if (i < 0) return null;
    const s = html.indexOf("[", i);
    if (s < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for (let j = s; j < html.length; j++) {
      const c = html[j];
      if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === "[") depth++;
      else if (c === "]" && --depth === 0) return html.slice(s, j + 1);
    }
    return null;
  }

  async function get(url, asJson) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return asJson ? await r.json() : await r.text();
    } finally { clearTimeout(timer); }
  }

  const langOf = (t) => String(t.languageCode || "").toLowerCase().split("-")[0];

  // İstenen dildeki altyazıyı seç: elle yazılmış varsa o, yoksa otomatik.
  function pickTrack(tracks, src) {
    const mine = tracks.filter((t) => langOf(t) === src);
    return mine.find((t) => t.kind !== "asr") || mine[0] || null;
  }

  async function captionLines(track) {
    const u = new URL(track.baseUrl, location.origin);
    if (!/(^|\.)youtube\.com$/.test(u.hostname)) throw new Error("host");
    u.searchParams.set("fmt", "json3");
    const j = await get(u.href, true);
    const out = [];
    for (const ev of j.events || []) {
      if (!ev.segs) continue;
      const line = ev.segs.map((s) => s.utf8 || "").join("").replace(/\s+/g, " ").trim();
      if (line) out.push(line);
    }
    return out;
  }

  const lower = (s, src) => (src === "tr" ? s.replace(/İ/g, "i").replace(/I/g, "ı") : s).toLowerCase();

  // Satırlardan {kelime: adet} çıkar. Özel isimler (hep büyük harfle, cümle ortasında) ve yaygın kelimeler atılır.
  function tokenize(lines, src) {
    let seg;
    try { seg = new Intl.Segmenter(src, { granularity: "word" }); } catch (e) { seg = new Intl.Segmenter("en", { granularity: "word" }); }
    const minLen = { ja: 1, ko: 1, hi: 2, ar: 2, ru: 3 }[src] || 3;
    const count = new Map(), lowSeen = new Set(), midCap = new Set();
    for (const raw of lines) {
      const line = raw.replace(/[’‘`]/g, "'");
      let first = true;
      for (const { segment, isWordLike } of seg.segment(line)) {
        if (!isWordLike) continue;
        const w = lower(segment, src);
        const wasFirst = first; first = false;
        if (w.length < minLen || /[\d０-９]/.test(w)) continue;
        if (segment !== w) { if (!wasFirst && src !== "de" && segment[0] === segment[0].toUpperCase()) midCap.add(w); }
        else lowSeen.add(w);
        count.set(w, (count.get(w) || 0) + 1);
      }
    }
    for (const w of [...count.keys()]) {
      if (CVL.isStop(w, src) || (midCap.has(w) && !lowSeen.has(w))) count.delete(w);
    }
    let list = [...count.entries()].sort((a, b) => b[1] - a[1]);
    // Yaygın kelime listesi olmayan dillerde en sık geçen 25 kelime çoğunlukla ek/edat: at
    if (!CVL.hasStop(src)) list = list.slice(25);
    return list.slice(0, MAX_OUT);
  }

  function titleOf(id) {
    let t = "";
    try { if (typeof readYouTubeTitle === "function") t = readYouTubeTitle(); } catch (e) {}
    if (!t) t = "YouTube · " + (document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube\s*$/i, "").trim().slice(0, 60) || id);
    return t;
  }

  async function readTranscript(src) {
    const id = videoId();
    if (!id) return { ok: false, err: "novideo" };
    let tracks;
    try {
      const html = await get("https://www.youtube.com/watch?v=" + id, false);
      const arr = grabArray(html, '"captionTracks":');
      if (!arr) return { ok: false, err: "notracks" };
      tracks = JSON.parse(arr);
    } catch (e) { return { ok: false, err: "fail" }; }
    if (!tracks.length) return { ok: false, err: "notracks" };
    const track = pickTrack(tracks, src);
    if (!track) return { ok: false, err: "lang", have: [...new Set(tracks.map(langOf))].slice(0, 6) };
    let lines;
    try { lines = await captionLines(track); } catch (e) { return { ok: false, err: "empty" }; }
    if (!lines.length) return { ok: false, err: "empty" };
    const words = tokenize(lines, src);
    let thumb = "";
    try { if (typeof readThumb === "function") thumb = readThumb(); } catch (e) {}
    return { ok: true, title: titleOf(id), thumb, auto: track.kind === "asr", lines: lines.length, words };
  }

  try {
    chrome.runtime.onMessage.addListener((m, _s, send) => {
      if (!m || m.cv !== "getTranscript") return;
      readTranscript(String(m.src || "en")).then(send, () => send({ ok: false, err: "fail" }));
      return true; // asenkron cevap için şart
    });
  } catch (e) {}
})();
