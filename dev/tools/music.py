#!/usr/bin/env python3
"""Reklam müziği ve ses efektleri: TAMAMEN KODLA ÜRETİLEN özgün enstrümantal (hazır şarkı/örnek kullanılmaz, telif sorunu yok).
120 BPM, la minör (Am - F - C - G). Sahne kesmeleri 0,5 sn katlarında olduğundan vuruşa oturur.
Ses efektleri (dokunma, ding, öğrenildi çanı, konfeti, geçiş) videodaki gerçek anlara bağlıdır: ad3.mjs'in yazdığı cues.json okunur.

Kullanım:  python3 dev/tools/music.py cues.json çıktı.wav [tepe=0.89]
           (AAC kodlaması tepeyi yaklaşık %30 aşırtabiliyor; mp4 için 0.72 kırpılmayı önler)
           (cues.json: {"total": saniye, "cues": [[saniye, "tür"], ...]})
"""
import json
import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60.0 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)


def tn(d):
    return np.arange(int(d * SR)) / SR


def mid(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= len(buf) or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(len(sig), len(buf) - i)
    if sig.ndim == 2:  # zaten stereo
        buf[i:i + n] += sig[:n] * gain
        return
    buf[i:i + n, 0] += sig[:n] * gain * (1 - max(0.0, pan))
    buf[i:i + n, 1] += sig[:n] * gain * (1 + min(0.0, pan))


def hp(x):  # basit yüksek geçiren: fark alma
    y = np.empty_like(x)
    y[0] = x[0]
    y[1:] = x[1:] - x[:-1]
    return y


# ---------- enstrümanlar ----------
def kick():
    t = tn(0.3)
    f = 42 + 120 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9.5) * 1.0 + hp(rng.standard_normal(len(t))) * np.exp(-t * 220) * 0.12


def clap():
    t = tn(0.22)
    s = np.zeros_like(t)
    for d in (0.0, 0.011, 0.023):
        k = int(d * SR)
        n = hp(hp(rng.standard_normal(len(t) - k)))
        s[k:] += n * np.exp(-(t[:len(t) - k]) * 34)
    return s * 0.45


def hat(open_=False):
    t = tn(0.28 if open_ else 0.06)
    return hp(hp(rng.standard_normal(len(t)))) * np.exp(-t * (16 if open_ else 95)) * 0.22


def bass(freq, dur=0.34):
    t = tn(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sin(6 * np.pi * freq * t)
    e = np.minimum(1, t / 0.006) * np.exp(-t / 0.2)
    return np.tanh(1.6 * s * e) * 0.6


def stab(freqs, dur=0.30):
    t = tn(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for h, a in ((1, 1.0), (2, 0.5), (3, 0.33), (4, 0.2)):
            s += a * np.sin(2 * np.pi * f * h * t + h) / len(freqs)
    return s * np.minimum(1, t / 0.004) * np.exp(-t / 0.11) * 0.5


def pad(freqs, dur):
    t = tn(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for d in (-0.004, 0.0, 0.004):
            s += np.sin(2 * np.pi * f * (1 + d) * t)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return s / (len(freqs) * 3) * e * 0.5


def pluck(freq, dur=0.38):
    t = tn(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sin(6 * np.pi * freq * t)
    return s * np.minimum(1, t / 0.003) * np.exp(-t / 0.085) * 0.55


def bell(freq, dur=1.2, gain=1.0):
    t = tn(dur)
    s = np.zeros_like(t)
    for r, a, tau in ((1.0, 1.0, 0.55), (2.0, 0.5, 0.35), (2.76, 0.35, 0.25), (5.4, 0.2, 0.12)):
        s += a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / tau)
    return s * np.minimum(1, t / 0.002) * 0.45 * gain


def noise_sweep(dur, f0, f1, gain=1.0, shape="up"):
    """Zamanla yükselen/alçalan süzgeçten geçen gürültü (whoosh)."""
    n = int(dur * SR)
    blk = 1024
    out = np.zeros(n + blk)
    win = np.hanning(blk)
    freqs = np.fft.rfftfreq(blk, 1 / SR)
    for start in range(0, n, blk // 2):
        p = min(1.0, start / max(1, n))
        fc = f0 * (f1 / f0) ** p
        mask = np.exp(-0.5 * (np.log2(np.maximum(freqs, 20) / fc) / 0.8) ** 2)
        seg = np.fft.irfft(np.fft.rfft(rng.standard_normal(blk) * win) * mask, blk)
        out[start:start + blk] += seg * win
    out = out[:n]
    p = np.linspace(0, 1, n)
    e = np.sin(np.pi * p) ** 2 if shape == "up" else (1 - p) ** 2
    out = out * e
    return out / (np.max(np.abs(out)) + 1e-9) * 0.55 * gain


def boom():
    t = tn(1.3)
    f = 34 + 70 * np.exp(-t * 6)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(1.5 * np.sin(ph) * np.exp(-t * 2.6)) * 0.9 + hp(rng.standard_normal(len(t))) * np.exp(-t * 14) * 0.18


def tick(freq=1800, dur=0.05):
    t = tn(dur)
    return (np.sin(2 * np.pi * freq * t) * 0.5 + hp(rng.standard_normal(len(t))) * 0.35) * np.exp(-t * 90) * 0.6


def popsound(freq=620):
    t = tn(0.11)
    f = freq * (1 - 0.45 * t / 0.11)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * 0.7


def thump():
    t = tn(0.16)
    f = 70 + 60 * np.exp(-t * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 24) * 0.6


def confetti_burst(dur=0.55):
    t = tn(dur)
    n = hp(hp(rng.standard_normal(len(t)))) * np.exp(-t * 7) * 0.5
    for _ in range(14):  # küçük "tık"lar
        k = int(rng.uniform(0.02, dur * 0.9) * SR)
        c = hp(rng.standard_normal(int(0.012 * SR)))
        n[k:k + len(c)] += c * rng.uniform(0.15, 0.4)
    return n


def fanfare():
    out = np.zeros((int(2.6 * SR), 2))
    for i, m in enumerate((84, 88, 91, 96, 100)):  # do-mi-sol-do-mi (yüksek)
        add(out, bell(mid(m), 1.8, 0.9), 0.07 * i, 0.9, pan=(-0.3 + 0.15 * i))
    add(out, boom() * 0.7, 0.0, 0.8)
    add(out, noise_sweep(0.5, 800, 9000, 0.8), 0.0, 0.6)
    return out


# ---------- müzik ----------
CHORDS = [  # (bas kökü, akor sesleri (orta), arp sesleri (yüksek))
    (33, [57, 60, 64], [69, 72, 76, 81]),   # Am
    (29, [53, 57, 60], [65, 69, 72, 77]),   # F
    (36, [55, 60, 64], [67, 72, 76, 79]),   # C
    (31, [55, 59, 62], [67, 71, 74, 79]),   # G
]


def build(total, cues, peak=0.89):
    n = int(total * SR)
    music = np.zeros((n, 2))
    sfx = np.zeros((n, 2))
    # sahne başlangıçlarını bul (whoosh olayları sahne başından 0,12 sn önce)
    whooshes = sorted(t for t, k in cues if k == "whoosh")
    gs = whooshes[0] + 0.12 if whooshes else 4.0          # grooove başlangıcı: 2. sahnenin başı
    end_start = whooshes[-1] + 0.12 if whooshes else total - 5.0
    # --- giriş (0 .. gs): düşük pad + kalp atışı + yükselen gürültü ---
    add(music, pad([mid(33), mid(40), mid(45)], gs + 0.4), 0.0, 0.7)
    for k in range(int(gs / 1.0)):
        add(music, kick() * (0.25 + 0.15 * k), k * 1.0, 0.8)
    for k in range(int((gs - 1.6) / 0.25)):
        add(music, hat() * 0.5, 1.6 + k * 0.25 + 0.125, 0.6)
    add(sfx, noise_sweep(gs - 1.4, 300, 9000, 1.0), 1.4, 0.8)
    # --- ana ritim ---
    t_final = total - 2.2
    b = 0
    t = gs
    while t < t_final - 1e-6:
        ch = CHORDS[b % 4]
        bass_f = mid(ch[0] + 12)
        bar_i = b
        if b == 0:  # giriş darbesi
            add(music, boom() * 0.8, t, 0.8)
            add(sfx, noise_sweep(1.2, 1500, 9000, 0.9, "down"), t, 0.5)
        add(music, pad([mid(m) for m in ch[1]], BAR + 0.3), t, 0.55)
        for beat in range(4):
            tb = t + beat * BEAT
            add(music, kick(), tb, 0.95)
            add(music, hat(), tb + BEAT / 2, 0.55)
            if beat == 3 and bar_i % 2 == 1:
                add(music, hat(True), tb + BEAT / 2, 0.5)
            if bar_i >= 2 and beat in (1, 3):
                add(music, clap(), tb, 0.8)
        # bas: senkoplu
        for off, dur_f, oct_ in ((0.0, 1.0, 0), (0.75, 1.0, 0), (1.25, 1.0, 12), (2.0, 1.0, 0), (2.75, 1.0, 0), (3.25, 1.0, 12)):
            add(music, bass(bass_f * (2 if oct_ else 1)), t + off, 0.8)
        if bar_i >= 1:  # akor vuruşları
            for off in (0.5, 1.25, 2.5, 3.25):
                add(music, stab([mid(m) for m in ch[1]]), t + off, 0.55, pan=0.15)
        if bar_i >= 2:  # arp: 8'likler
            seq = (0, 1, 2, 3, 2, 1, 2, 3)
            for k in range(8):
                f = mid(ch[2][seq[k]])
                add(music, pluck(f), t + k * BEAT / 2, 0.55, pan=-0.2 if k % 2 else 0.2)
        t += BAR
        b += 1
    # final: Am akoru + zil, ardından sönüm
    add(music, pad([mid(m) for m in (45, 57, 60, 64, 69)], 2.6), t_final, 0.9)
    add(music, bell(mid(81), 2.2, 0.9), t_final, 0.7)
    add(music, bell(mid(88), 2.2, 0.7), t_final + 0.06, 0.6)
    # --- ses efektleri (video olaylarına bağlı) ---
    cnt = 0
    last_count = -9
    for tc, kind in cues:
        if kind == "whoosh":
            add(sfx, noise_sweep(0.55, 500, 7000, 1.0), tc, 0.9)
        elif kind == "whoosh_s":
            add(sfx, noise_sweep(0.35, 1500, 8000, 0.7), tc, 0.55)
        elif kind == "sweep":
            add(sfx, noise_sweep(0.9, 700, 9000, 0.8), tc, 0.55)
        elif kind == "count":
            cnt = cnt + 1 if tc - last_count < 0.6 else 0
            last_count = tc
            add(sfx, tick(1400 + 90 * cnt), tc, 0.55)
        elif kind == "slam":
            add(sfx, thump(), tc, 0.5)
            add(sfx, tick(900, 0.04), tc, 0.3)
        elif kind == "boom":
            add(sfx, boom(), tc, 1.0)
        elif kind == "pop":
            add(sfx, popsound(560 + 40 * (hash(round(tc, 2)) % 5)), tc, 0.8)
        elif kind == "tap":
            add(sfx, tick(2300, 0.04), tc, 0.8)
        elif kind == "ding":
            add(sfx, bell(mid(81), 1.1), tc, 0.9)
            add(sfx, bell(mid(93), 0.8, 0.5), tc + 0.05, 0.5)
        elif kind == "right":
            add(sfx, bell(mid(76), 0.7), tc, 0.8)
            add(sfx, bell(mid(83), 0.9), tc + 0.11, 0.9)
        elif kind == "learned":
            add(sfx, fanfare(), tc, 1.0)
        elif kind == "confetti":
            add(sfx, confetti_burst(), tc, 0.8)
    # --- miks ---
    mix = music * 0.50 + sfx * 0.85
    mix = np.tanh(1.25 * mix) / np.tanh(1.25)
    fo = int(2.0 * SR)
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    fi = int(0.03 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix *= peak / (np.max(np.abs(mix)) + 1e-9)
    return mix


def main():
    cj = json.load(open(sys.argv[1], encoding="utf-8"))
    mix = build(float(cj["total"]), [(float(t), k) for t, k in cj["cues"]], float(sys.argv[3]) if len(sys.argv) > 3 else 0.89)
    pcm = (mix * 32767).astype("<i2")
    with wave.open(sys.argv[2], "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    peak = float(np.max(np.abs(mix)))
    rms = [float(np.sqrt(np.mean(mix[int(i * SR):int((i + 5) * SR)] ** 2))) for i in range(0, int(cj["total"]) - 4, 5)]
    print(f"tamam: {sys.argv[2]}  süre {len(mix) / SR:.1f} sn  tepe {peak:.2f}  5 sn'lik RMS: " + " ".join(f"{r:.2f}" for r in rms))


if __name__ == "__main__":
    main()
