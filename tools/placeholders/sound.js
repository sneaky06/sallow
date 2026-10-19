// Sound placeholders (tools/placeholders/gen.html): tiny mono 8 kHz 8-bit WAVs.
//   * the game's current synthesized sound where one exists (the 25 effect names and the 9 ambience beds), rendered offline;
//   * otherwise a short neutral stand-in of the right length class: a click, a soft pitched thump and a noise tail (one-shots),
//     a quiet slowly moving pad (loops), pitch derived from the file name so takes and neighbours are told apart by ear.
// Lengths are capped to keep the repo small: one-shots 2 s (stingers 2.5 s), ambience loops 10 s, music loops 12 s.
(function () {
  'use strict';
  const PH = window.PH = window.PH || {};
  const RATE = 8000, HI = 16000;

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  PH.capSeconds = function (f) {
    if (!f.loop) return Math.min(f.len, f.folder === "stingers" ? 2.5 : 2);
    if (f.folder === "music") return 12;
    if (f.folder === 'ambience') return 10;
    return Math.min(Math.max(f.len, 1), 6);          // short sfx loops (Whirlwind, portal hum ...) keep their length class
  };

  // one-shot: click + pitched thump + noise tail
  function oneShot(f, dur) {
    const n = Math.max(80, Math.round(dur * RATE)), out = new Float32Array(n), h = hash(f.base), r = rng(hash(f.name));
    const f0 = 140 + (h % 900) * (1 + 0.07 * (f.variant - 1)), tone = Math.min(dur, 0.35), decay = 5 / Math.max(0.12, dur);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / RATE, e = Math.exp(-t * decay);
      let v = 0;
      if (i < 6) v += 0.8 * (1 - i / 6);                                           // click
      if (t < tone) v += 0.35 * Math.sin(2 * Math.PI * f0 * t * (1 - 0.3 * t / tone)) * Math.exp(-t * 14);
      lp += (r() * 2 - 1 - lp) * 0.35; v += lp * 0.28 * e;                         // soft noise tail
      out[i] = v;
    }
    return out;
  }
  // loop: pad of 3 partials with whole numbers of cycles over the loop (seamless), a slow tremolo and filtered noise bed
  function loopPad(f, dur, music) {
    const n = Math.round(dur * RATE), out = new Float32Array(n), h = hash(f.base), r = rng(hash(f.name));
    const root = music ? 55 * Math.pow(2, (h % 12) / 12) : 70 + (h % 160);
    const parts = [1, music ? 1.5 : 1.26, music ? 2 : 2.01].map(function (m) { return Math.max(1, Math.round(root * m * dur)) / dur; });
    const trem = Math.max(1, Math.round(0.25 * dur)) / dur;
    const raw = new Float32Array(n + 4000);
    let lp = 0;
    for (let i = 0; i < raw.length; i++) { lp += (r() * 2 - 1 - lp) * 0.06; raw[i] = lp; }
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      let v = 0;
      for (let k = 0; k < parts.length; k++) v += Math.sin(2 * Math.PI * parts[k] * t) * (0.16 / (k + 1));
      v *= 0.75 + 0.25 * Math.sin(2 * Math.PI * trem * t);
      // seamless noise: the tail fades into the head
      const x = i < 4000 ? raw[i] * (i / 4000) + raw[n + i] * (1 - i / 4000) : raw[i];
      out[i] = v + x * 0.6;
    }
    return out;
  }
  PH.standin = function (f) {
    const dur = PH.capSeconds(f);
    if (f.loop) return loopPad(f, dur, f.folder === 'music');
    return oneShot(f, dur);
  };

  // 16 kHz AudioBuffer -> 8 kHz mono floats (2-tap average), peak-normalised
  PH.decimate = function (buf, peak) {
    const d = buf.getChannelData(0), n = Math.floor(d.length / 2), out = new Float32Array(n);
    let m = 0;
    for (let i = 0; i < n; i++) { out[i] = (d[2 * i] + d[2 * i + 1]) * 0.5; m = Math.max(m, Math.abs(out[i])); }
    const g = m > 0 ? (peak || 0.6) / m : 1;
    for (let i = 0; i < n; i++) out[i] *= g;
    return out;
  };
  // crossfade the last `sec` seconds of a loop into its start so a rendered bed repeats without a click
  PH.seamless = function (a, sec) {
    const k = Math.min(Math.round(sec * RATE), a.length >> 1), n = a.length - k, out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = a[i];
    for (let i = 0; i < k; i++) { const w = i / k; out[i] = a[i] * w + a[n + i] * (1 - w); }
    return out;
  };
  // mono floats -> RIFF/WAVE bytes: PCM, 1 channel, 8000 Hz, unsigned 8-bit
  PH.wav = function (a) {
    const n = a.length, b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
    const s = function (o, t) { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    s(0, 'RIFF'); dv.setUint32(4, 36 + n, true); s(8, 'WAVE'); s(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, RATE, true); dv.setUint32(28, RATE, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); s(36, 'data'); dv.setUint32(40, n, true);
    for (let i = 0; i < n; i++) b[44 + i] = Math.max(0, Math.min(255, Math.round(128 + Math.max(-1, Math.min(1, a[i])) * 127)));
    return b;
  };
  // the sound for one catalog file: synthesized when the game has one for its base name (variant 1 only), else a stand-in
  PH.sound = async function (f, audioApi) {
    let kind = 'standin';
    if (audioApi && audioApi.renderOffline && f.today) {
      const secs = f.loop ? 10.5 : 2.5;
      const p = audioApi.renderOffline(f.base, secs, HI);
      if (p) {
        const buf = await p;
        let a = PH.decimate(buf, f.loop ? 0.5 : 0.7);
        if (!f.loop) {                      // trim the silent tail
          let end = a.length; while (end > 400 && Math.abs(a[end - 1]) < 0.01) end--;
          a = a.subarray(0, Math.min(a.length, end + 200));
        } else a = PH.seamless(a, 0.5);
        return { bytes: PH.wav(a), kind: 'synth', seconds: a.length / RATE };
      }
    }
    const a = PH.standin(f);
    return { bytes: PH.wav(a), kind: kind, seconds: a.length / RATE };
  };
})();
