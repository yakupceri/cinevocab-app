/* CineVocab mobil: kullanicinin KENDI getirdigi metinden ya da altyazi dosyasindan [kelime, adet] listesi cikarir.
   Uygulama hicbir siteden icerik cekmez. Metin telefondan cikmaz; sunucuya yalnizca kelime listesi gider.
   lang.js (CVL) bu dosyadan once yuklenir. */
(function (root) {
  "use strict";
  const MAX_OUT = 6000, MAX_CHARS = 400000;

  // Metni satirlara ayirir. .srt/.vtt dosyalarindaki sira numarasi, zaman satiri ve bicim etiketleri atilir.
  function linesFrom(text) {
    const out = [];
    const raw = String(text || "").slice(0, MAX_CHARS).replace(/\r/g, "").split("\n");
    for (let line of raw) {
      line = line.trim();
      if (!line) continue;
      if (/^\d+$/.test(line)) continue;                               // srt sira numarasi
      if (/-->/.test(line)) continue;                                  // zaman satiri
      if (/^(WEBVTT|NOTE|STYLE|REGION|Kind:|Language:)/.test(line)) continue;
      line = line.replace(/<[^>]{0,80}>/g, " ").replace(/\{\\[^}]{0,40}\}/g, " ").replace(/\[[^\]]{0,60}\]/g, " ");
      line = line.replace(/^[-–♪#\s]+/, "").replace(/\s+/g, " ").trim();
      if (line) out.push(line);
    }
    return out;
  }

  const lower = (s, src) => (src === "tr" ? s.replace(/İ/g, "i").replace(/I/g, "ı") : s).toLowerCase();

  // Satirlardan [kelime, adet] cikarir. Ozel isimler (cumle ortasinda hep buyuk harfle) ve yaygin kelimeler atilir.
  function tokenize(lines, src) {
    let seg;
    try { seg = new Intl.Segmenter(src, { granularity: "word" }); } catch (e) { seg = new Intl.Segmenter("en", { granularity: "word" }); }
    const minLen = { ja: 1, ko: 1, hi: 2, ar: 2, ru: 3 }[src] || 3;
    const count = new Map(), lowSeen = new Set(), midCap = new Set();
    for (const raw of lines) {
      const line = raw.replace(/[’‘`]/g, "'");
      let first = true;
      for (const part of seg.segment(line)) {
        if (!part.isWordLike) continue;
        const segment = part.segment, w = lower(segment, src);
        const wasFirst = first; first = false;
        if (w.length < minLen || w.length > 40 || /[\d０-９]/.test(w)) continue;
        if (segment !== w) { if (!wasFirst && src !== "de" && segment[0] === segment[0].toUpperCase()) midCap.add(w); }
        else lowSeen.add(w);
        count.set(w, (count.get(w) || 0) + 1);
      }
    }
    const CVL = root.CVL;
    for (const w of Array.from(count.keys())) {
      if ((CVL && CVL.isStop(w, src)) || (midCap.has(w) && !lowSeen.has(w))) count.delete(w);
    }
    let list = Array.from(count.entries()).sort((a, b) => b[1] - a[1]);
    // Yaygin kelime listesi olmayan dillerde, uzun metinlerde en sik gecen 25 kelime cogunlukla ek/edat: at
    if ((!CVL || !CVL.hasStop(src)) && list.length > 80) list = list.slice(25);
    return list.slice(0, MAX_OUT);
  }

  root.CVTEXT = { linesFrom: linesFrom, tokenize: tokenize, MAX_CHARS: MAX_CHARS };
})(typeof window !== "undefined" ? window : globalThis);
