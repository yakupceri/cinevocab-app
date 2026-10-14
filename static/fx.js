/* CineVocab oyun efektleri: ses (WebAudio), konfeti, uçan puan yazısı, sarsıntı, titreşim.
   Hareketsiz mod (prefers-reduced-motion) açıksa konfeti ve sarsıntı kapanır. */
(function () {
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var ctx = null, muted = false;
  try { muted = localStorage.getItem("cv-sound") === "0"; } catch (e) {}

  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, at, dur, type, vol) {
    if (muted) return;
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  function arp(notes, step, type, vol) { notes.forEach(function (f, i) { tone(f, i * step, step * 1.8, type, vol); }); }

  var SND = {
    correct: function (n) { var f = 523.25 * Math.pow(2, Math.min(Math.max((n || 1) - 1, 0), 10) / 12); tone(f, 0, 0.14, "triangle", 0.14); tone(f * 1.5, 0.08, 0.2, "triangle", 0.12); },
    wrong: function () { tone(190, 0, 0.22, "sawtooth", 0.09); tone(140, 0.12, 0.3, "sawtooth", 0.09); },
    tick: function () { tone(880, 0, 0.05, "square", 0.04); },
    beep: function () { tone(440, 0, 0.16, "sine", 0.14); },
    go: function () { arp([660, 880, 1175], 0.07, "triangle", 0.15); },
    level: function () { arp([523, 659, 784, 1047], 0.09, "triangle", 0.15); },
    win: function () { arp([523, 659, 784, 1047, 1319], 0.1, "triangle", 0.16); },
    lose: function () { arp([392, 330, 262], 0.16, "sine", 0.12); },
    combo: function () { arp([784, 988, 1175], 0.05, "square", 0.05); },
  };

  function confetti(power) {
    if (reduce) return;
    var cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:300";
    var W = (cv.width = innerWidth), H = (cv.height = innerHeight), g = cv.getContext("2d");
    document.body.appendChild(cv);
    var cs = getComputedStyle(document.documentElement), acc = (cs.getPropertyValue("--accent") || "#ff8a3d").trim();
    var cols = [acc, "#ffd447", "#6fe0b8", "#7fd0ff", "#ff7a6b", "#ffffff"], n = Math.round(90 * (power || 1)), ps = [];
    for (var i = 0; i < n; i++) ps.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.45, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 5, r: 4 + Math.random() * 5, c: cols[i % cols.length], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4 });
    var t0 = performance.now();
    (function frame(t) {
      var k = (t - t0) / 2300;
      g.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.a += p.va;
        g.save(); g.globalAlpha = Math.max(0, 1 - k); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore();
      });
      if (k < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  function float(anchor, text, cls) {
    if (!anchor) return;
    var r = anchor.getBoundingClientRect(), f = document.createElement("div");
    f.className = "float " + (cls || ""); f.textContent = text;
    f.style.left = r.left + r.width / 2 + "px"; f.style.top = r.top + "px";
    document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1000);
  }
  function shake(el) { if (reduce || !el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
  function bump(el) { if (reduce || !el) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  function count(el, to, ms, fmt) {
    var from = 0, t0 = performance.now(); ms = ms || 900; fmt = fmt || function (v) { return String(v); };
    if (reduce) { el.textContent = fmt(to); return; }
    (function f(t) { var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function vibrate(p) { try { if (!muted && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  window.FX = {
    play: function (name, arg) { try { if (SND[name]) SND[name](arg); } catch (e) {} },
    confetti: confetti, float: float, shake: shake, bump: bump, count: count, vibrate: vibrate,
    isMuted: function () { return muted; },
    setMuted: function (m) { muted = !!m; try { localStorage.setItem("cv-sound", m ? "0" : "1"); } catch (e) {} },
    reduce: reduce,
  };
})();
