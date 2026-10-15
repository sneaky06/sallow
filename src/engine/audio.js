// WebAudio-synthesised sound effects. The context is only created on the first user gesture (U.audio.unlock),
// so nothing here warns or throws before that; G.engine.sfx() before unlock is a silent no-op.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  let ac = null, master = null, noiseBuf = null, sfxBus = null, ambBus = null, musicBus = null, toBus = null;
  const last = Object.create(null);
  let recent = 0, recentT = 0;

  function unlock() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.42;
        master.connect(ac.destination);
        // R6.4 volume buses: state.settings.sfxVolume / ambienceVolume / musicVolume (0..1), applied in tick()
        sfxBus = ac.createGain(); ambBus = ac.createGain(); musicBus = ac.createGain();
        sfxBus.connect(master); ambBus.connect(master); musicBus.connect(master);
        const len = (ac.sampleRate * 0.6) | 0;
        noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        // iOS: a buffer must be started inside the gesture
        const s = ac.createBufferSource();
        s.buffer = ac.createBuffer(1, 1, ac.sampleRate);
        s.connect(ac.destination);
        s.start(0);
      }
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      decodeAll();
      blessMusic();
    } catch (err) { ac = null; }
  }

  function env(g, t0, dur, vol, attack) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  // oscillator sweep f0 → f1
  function tone(type, f0, f1, dur, vol, delay, attack) {
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    env(g, t0, dur, vol, attack);
    o.connect(g); g.connect(toBus || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  // filtered noise burst, filter sweep f0 → f1
  function noise(dur, vol, delay, ftype, f0, f1, attack) {
    const t0 = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = ftype || 'lowpass';
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    f.Q.value = ftype === 'bandpass' ? 1.4 : 0.7;
    env(g, t0, dur, vol, attack);
    s.connect(f); f.connect(g); g.connect(toBus || sfxBus);
    s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.03);
  }
  function arp(type, notes, step, dur, vol) {
    for (let i = 0; i < notes.length; i++) tone(type, notes[i], notes[i], dur, vol, i * step);
  }

  const R = {
    hit: function () { noise(0.07, 0.5, 0, 'bandpass', 1900, 600); tone('square', 190, 70, 0.08, 0.22); },
    swing: function () { noise(0.13, 0.28, 0, 'bandpass', 500, 2600, 0.03); },
    cast: function () { tone('sine', 380, 920, 0.22, 0.24); tone('triangle', 760, 1700, 0.18, 0.1, 0.04); },
    fire: function () { noise(0.38, 0.42, 0, 'lowpass', 2000, 180, 0.02); tone('sawtooth', 170, 55, 0.3, 0.14); },
    ice: function () { tone('triangle', 1900, 900, 0.18, 0.2); tone('sine', 2700, 2100, 0.12, 0.12, 0.03); noise(0.1, 0.14, 0, 'highpass', 4200, 6000); },
    bolt: function () { noise(0.16, 0.36, 0, 'highpass', 2600, 700); tone('sawtooth', 1300, 90, 0.14, 0.2); tone('square', 60, 40, 0.18, 0.2, 0.02); },
    arrow: function () { noise(0.09, 0.3, 0, 'bandpass', 3200, 1100); tone('triangle', 900, 480, 0.06, 0.12); },
    hurt: function () { tone('sawtooth', 230, 105, 0.18, 0.28); noise(0.08, 0.24, 0, 'lowpass', 900, 300); },
    die: function () { tone('sawtooth', 210, 48, 0.42, 0.26); noise(0.3, 0.22, 0.03, 'lowpass', 700, 140); },
    loot: function () { tone('square', 660, 660, 0.05, 0.12); tone('square', 990, 990, 0.08, 0.1, 0.05); },
    loot_rare: function () { arp('triangle', [784, 988, 1175, 1568], 0.06, 0.16, 0.2); arp('square', [1568], 0.06, 0.3, 0.05); },
    loot_legendary: function () {
      arp('triangle', [523, 659, 784, 1047, 1319, 1568], 0.07, 0.3, 0.22); arp('square', [262, 392, 523], 0.14, 0.5, 0.07);
      tone('sine', 2093, 2093, 0.9, 0.12, 0.42, 0.02); tone('sine', 3136, 3136, 0.7, 0.06, 0.5, 0.02);
    },
    gold: function () { tone('sine', 1568, 1568, 0.07, 0.16); tone('sine', 2093, 2093, 0.12, 0.16, 0.05); },
    levelup: function () { arp('square', [392, 523, 659, 784, 1047], 0.09, 0.22, 0.12); arp('triangle', [196, 262, 392], 0.15, 0.6, 0.16); tone('sine', 1568, 1568, 0.8, 0.1, 0.45, 0.02); },
    equip: function () { noise(0.05, 0.3, 0, 'highpass', 2500, 4000); tone('triangle', 320, 210, 0.1, 0.2); tone('sine', 1250, 1250, 0.14, 0.08, 0.04); },
    potion: function () { tone('sine', 300, 620, 0.09, 0.2); tone('sine', 380, 760, 0.09, 0.2, 0.09); tone('sine', 460, 900, 0.12, 0.2, 0.18); },
    click: function () { tone('square', 820, 640, 0.035, 0.12); },
    error: function () { tone('square', 165, 150, 0.1, 0.16); tone('square', 125, 110, 0.16, 0.16, 0.11); },
    door: function () { noise(0.3, 0.2, 0, 'bandpass', 300, 700, 0.05); tone('sawtooth', 110, 140, 0.26, 0.06, 0, 0.05); tone('sine', 85, 50, 0.14, 0.3, 0.28); },
    stairs: function () { for (let i = 0; i < 4; i++) { tone('sine', 150 - i * 18, 60, 0.1, 0.3, i * 0.13); noise(0.05, 0.14, i * 0.13, 'lowpass', 500, 200); } },
    quest: function () { arp('triangle', [659, 880, 1319], 0.11, 0.35, 0.2); tone('sine', 1760, 1760, 0.6, 0.08, 0.3, 0.02); },
    buy: function () { tone('sine', 1760, 1760, 0.06, 0.15); tone('sine', 2349, 2349, 0.14, 0.15, 0.06); tone('square', 700, 500, 0.03, 0.08, 0.02); },
    sell: function () { tone('sine', 2093, 2093, 0.06, 0.15); tone('sine', 1568, 1568, 0.07, 0.15, 0.06); tone('sine', 1175, 1175, 0.14, 0.15, 0.12); },
    chest: function () { tone('sine', 95, 55, 0.14, 0.34); noise(0.25, 0.16, 0.05, 'bandpass', 400, 900, 0.05); arp('triangle', [1047, 1319, 1568], 0.06, 0.2, 0.12); },
    shrine: function () { tone('sine', 392, 392, 1.1, 0.16, 0, 0.15); tone('sine', 587, 587, 1.1, 0.12, 0.08, 0.15); tone('sine', 784, 790, 1.2, 0.1, 0.16, 0.15); tone('triangle', 1568, 1580, 0.9, 0.05, 0.3, 0.1); },
  };

  E.sfx = function (name) {
    const S = G.state;
    if (S && S.settings && S.settings.sfx === false) return;
    const fn = R[name];
    if ((!fn && !variants[name]) || !ac || ac.state === "closed") return;     // file-only names (no synth) play too
    const now = ac.currentTime;
    if (last[name] !== undefined && now - last[name] < 0.05) return;     // don't stack identical sounds
    if (now - recentT > 0.12) { recentT = now; recent = 0; }
    if (++recent > 7) return;                                             // global burst cap
    last[name] = now;
    try { if (!playFile(name) && fn) fn(); } catch (err) { /* audio must never break the game */ }
  };

  // ---- sound files (R6.4): assets/sound/<name>.mp3|.m4a listed in assets/assets.js override the synth.
  //   <sfx>.mp3 (and <sfx>_2, _3 … picked at random), amb_<bed>.mp3 (looping bed), music_<track>.mp3 (streamed loop).
  // SFX and beds are fetched at load and decoded once audio unlocks; anything missing or undecodable stays synthesized.
  const files = Object.create(null);         // name → { url, data, buf, music }
  const variants = Object.create(null);      // sfx name → [file names]
  function addFile(path, url) {
    const m = /^sound\/([a-z0-9_]+)\.[a-z0-9]+$/.exec(path);
    if (!m) return;
    const name = m[1], music = /^music_/.test(name);
    const f = files[name] = { url: url, data: null, buf: null, music: music };
    const v = /^(.+)_(\d+)$/.exec(name), base = v && !/^(amb|music)_/.test(name) ? v[1] : name;
    (variants[base] || (variants[base] = [])).push(name);
    if (music) return;
    try {
      fetch(url).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (d) { if (d) { f.data = d; decodeAll(); } }).catch(function () {});
    } catch (err) { /* no fetch */ }
  }
  function decodeAll() {
    if (!ac) return;
    for (const n in files) {
      const f = files[n];
      if (!f.data || f.buf) continue;
      const d = f.data; f.data = null;
      try {
        const p = ac.decodeAudioData(d, function (b) { f.buf = b; }, function () {});
        if (p && p.catch) p.catch(function () {});
      } catch (err) { /* stays synthesized */ }
    }
  }
  function playFile(name) {
    const list = variants[name];
    if (!list) return false;
    let pick = null, n = 0;
    for (let i = 0; i < list.length; i++) if (files[list[i]].buf && Math.random() * ++n < 1) pick = files[list[i]];
    if (!pick) return false;
    const s = ac.createBufferSource();
    s.buffer = pick.buf; s.connect(sfxBus); s.start();
    return true;
  }

  // ---- music: two streamed <audio> elements routed through musicBus, crossfaded over ~2 s.
  // Tracks: title, town, crypt, caves, inferno, abyss, rift (deep floors), boss, echo. A missing track falls back
  // (echo → boss, rift → abyss); with no file at all there is simply no music and the ambience bed carries the mood.
  const MUSIC_FALLBACK = { echo: 'boss', rift: 'abyss' };
  const mus = { els: [], gains: [], active: 0, cur: null, want: null };
  function trackFile(t) { while (t && !files['music_' + t]) t = MUSIC_FALLBACK[t]; return t ? files['music_' + t] : null; }
  function blessMusic() {
    if (mus.els.length || !ac) return;
    let any = false;
    for (const n in files) if (files[n].music) { any = true; break; }
    if (!any) return;
    for (let i = 0; i < 2; i++) {
      const el = new Audio(); el.loop = true; el.preload = 'auto';
      let g = null;
      try { const src = ac.createMediaElementSource(el); g = ac.createGain(); g.gain.value = 0; src.connect(g); g.connect(musicBus); }
      catch (err) { g = null; el.volume = 0; }
      mus.els.push(el); mus.gains.push(g);
    }
    // iOS: an element must first play inside the gesture to be allowed to play later
    const f = trackFile(mus.want) || (function () { for (const n in files) if (files[n].music) return files[n]; return null; })();
    if (f) { const el = mus.els[0]; el.src = f.url; const p = el.play(); if (p && p.catch) p.catch(function () {}); mus.cur = f; }
  }
  function fade(i, to, sec) {
    const g = mus.gains[i], el = mus.els[i];
    if (g) { const t = ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(to, t + sec); }
    else el.volume = to;
  }
  function tickMusic() {
    if (!mus.els.length) return;
    const f = trackFile(mus.want);
    if (f === mus.cur && (!f || !mus.els[mus.active].paused)) return;
    const old = mus.active, nxt = mus.cur ? 1 - old : old;
    mus.cur = f;
    if (mus.cur !== null && nxt !== old) { fade(old, 0, 2); const oe = mus.els[old]; setTimeout(function () { if (mus.els[mus.active] !== oe) oe.pause(); }, 2200); }
    if (!f) return;
    const el = mus.els[nxt];
    if (el.src.indexOf(f.url) < 0) { el.src = f.url; el.currentTime = 0; }
    const p = el.play(); if (p && p.catch) p.catch(function () {});
    fade(nxt, 1, nxt === old ? 0.5 : 2);
    mus.active = nxt;
  }
  function vol(v, d) { return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : d; }
  function tickVolumes() {
    const st = (G.state && G.state.settings) || {}, t = ac.currentTime, off = st.sfx === false;
    sfxBus.gain.setTargetAtTime(off ? 0 : vol(st.sfxVolume, 1), t, 0.05);
    ambBus.gain.setTargetAtTime(off ? 0 : vol(st.ambienceVolume, 1), t, 0.1);
    musicBus.gain.setTargetAtTime(off || st.music === false ? 0 : vol(st.musicVolume, 0.6) * 0.8, t, 0.1);
  }
  G.on('sfx', function (e) { if (e && e.name) E.sfx(e.name); });

  // ---- ambient sound bed (R5.10): one quiet looping layer per floor, crossfaded on change.
  // Kinds: wind, drone, drip, water, fire, heart, choir, none. Pallor tier >= 3 adds a thin, wrong high tone.
  // A few nodes per bed, built once per change; the per-frame tick only schedules the odd drip / heartbeat.
  const BED_VOL = 0.11;
  let bed = null, wantBed = 'none', wantPallor = 0, nextEv = 0;
  function loopNoise(ftype, f, q) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter();
    s.buffer = noiseBuf; s.loop = true; fl.type = ftype; fl.frequency.value = f; fl.Q.value = q || 0.7;
    s.connect(fl); s.start(0, Math.random() * 0.5);
    return { src: s, out: fl, filter: fl };
  }
  function lfo(rate, depth, param) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start();
    return o;
  }
  function buildBed(kind) {
    const out = ac.createGain(), stops = [];
    out.gain.value = 0.0001;
    out.connect(ambBus);
    const add = function (node, vol) { const g = ac.createGain(); g.gain.value = vol; node.connect(g); g.connect(out); return g; };
    const osc = function (type, f, vol) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.start(); stops.push(o); return add(o, vol); };
    let n;
    const file = files['amb_' + kind];
    if (file && file.buf) {
      const s = ac.createBufferSource(); s.buffer = file.buf; s.loop = true; s.start(0, Math.random() * file.buf.duration);
      stops.push(s); add(s, 1 / BED_VOL * 0.5);
      kind = 'file:' + kind;
    } else
    switch (kind) {
      case 'wind': n = loopNoise('bandpass', 420, 0.6); stops.push(n.src, lfo(0.11, 260, n.filter.frequency)); add(n.out, 0.5); break;
      case 'water': n = loopNoise('lowpass', 700); stops.push(n.src, lfo(0.17, 240, n.filter.frequency)); add(n.out, 0.35); break;
      case 'fire': {
        n = loopNoise('lowpass', 140); stops.push(n.src); add(n.out, 0.7);
        const c = loopNoise('bandpass', 1600, 1.2), g = add(c.out, 0.0); stops.push(c.src, lfo(6.3, 0.12, g.gain), lfo(0.7, 0.06, g.gain));
        break;
      }
      case 'choir': osc('sine', 110, 0.16); osc('sine', 164.8, 0.12); osc('sine', 261.6, 0.07); break;
      case 'flesh': {
        // Hellscape: a sour, never-settling drone (detune wanders), wet breathing noise; heartbeats and whispers in tickBed
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.Q.value = 4;
        const a = ac.createOscillator(), b = ac.createOscillator(); a.type = b.type = 'sawtooth';
        a.frequency.value = 36.7; b.frequency.value = 38.9;                  // a semitone apart: it never resolves
        a.connect(lp); b.connect(lp); a.start(); b.start();
        stops.push(a, b, lfo(0.05, 900, a.detune), lfo(0.031, 700, b.detune), lfo(0.13, 90, lp.frequency));
        add(lp, 0.34);
        n = loopNoise('lowpass', 420, 1.5); stops.push(n.src);
        const g = add(n.out, 0.0); stops.push(lfo(0.21, 0.22, g.gain));      // breathing in and out
        break;
      }
      case 'hearth': {
        // warm town: a low soft fire bed and a whisper of wind, crackles in tickBed
        n = loopNoise('lowpass', 160); stops.push(n.src); add(n.out, 0.35);
        const w = loopNoise('bandpass', 380, 0.5); stops.push(w.src, lfo(0.09, 120, w.filter.frequency)); add(w.out, 0.12);
        break;
      }
      case 'heart': case 'drip': case 'drone': default: {
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'heart' ? 160 : 240;
        const a = ac.createOscillator(), b = ac.createOscillator(); a.type = b.type = 'sawtooth';
        a.frequency.value = kind === 'heart' ? 41 : 55; b.frequency.value = a.frequency.value * 1.012;
        a.connect(lp); b.connect(lp); a.start(); b.start(); stops.push(a, b, lfo(0.07, 60, lp.frequency));
        add(lp, kind === 'drone' ? 0.3 : 0.16);
      }
    }
    // pallor: a faint detuned high pair that beats slowly; gain follows the tier
    const pa = ac.createOscillator(), pb = ac.createOscillator(), pg = ac.createGain();
    pa.type = pb.type = 'sine'; pa.frequency.value = 1661; pb.frequency.value = 1667.5; pg.gain.value = 0;
    pa.connect(pg); pb.connect(pg); pg.connect(out); pa.start(); pb.start(); stops.push(pa, pb);
    return { kind: kind.replace(/^file:/, ''), file: kind.indexOf('file:') === 0, out: out, stops: stops, pallor: pg };
  }
  function bedOn() { const S = G.state; return !!(S && S.settings && S.settings.sfx !== false && S.settings.ambience !== false); }
  function swapBed() {
    if (!ac || !noiseBuf) return;
    const kind = bedOn() ? wantBed : 'none';
    if (bed && bed.kind === kind) return;
    const t = ac.currentTime;
    if (bed) {
      const old = bed;
      old.out.gain.cancelScheduledValues(t); old.out.gain.setValueAtTime(Math.max(0.0001, old.out.gain.value), t);
      old.out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(function () { try { old.stops.forEach(function (s) { s.stop(); }); old.out.disconnect(); } catch (err) { /* already gone */ } }, 1400);
      bed = null;
    }
    if (kind === 'none') return;
    try {
      bed = buildBed(kind);
      bed.out.gain.setValueAtTime(0.0001, t);
      bed.out.gain.exponentialRampToValueAtTime(BED_VOL, t + 2.5);
    } catch (err) { bed = null; }
  }
  function tickBed() {
    if (!ac || ac.state !== 'running') return;
    tickVolumes();
    tickMusic();
    if ((bed ? bed.kind : 'none') !== (bedOn() ? wantBed : 'none')) swapBed();
    else if (bed && !bed.file && files['amb_' + bed.kind] && files['amb_' + bed.kind].buf) { const k = bed.kind; bed.kind = '?'; wantBed = k; swapBed(); }
    if (!bed) return;
    const now = ac.currentTime;
    bed.pallor.gain.setTargetAtTime(wantPallor >= 3 ? (wantPallor - 2) * 0.012 : 0, now, 1.5);
    if (now < nextEv || bed.file) return;
    toBus = ambBus;
    if (bed.kind === 'drip' || bed.kind === 'water') {
      const f = 1400 + Math.random() * 1400;
      tone('sine', f, f * 0.55, 0.09, 0.05 + Math.random() * 0.04);
      if (Math.random() < 0.3) tone('sine', f * 1.3, f * 0.7, 0.07, 0.03, 0.12);
      nextEv = now + 0.8 + Math.random() * (bed.kind === 'drip' ? 3.5 : 5);
    } else if (bed.kind === 'heart') {
      tone('sine', 62, 38, 0.16, 0.22); tone('sine', 58, 36, 0.18, 0.16, 0.24);
      nextEv = now + 1.25 + (wantPallor * 0.08);
    } else if (bed.kind === 'flesh') {
      const r = Math.random();
      if (r < 0.55) { tone('sine', 52, 30, 0.2, 0.26); if (Math.random() < 0.7) tone('sine', 48, 28, 0.22, 0.18, 0.26 + Math.random() * 0.1); }   // a heart with a bad rhythm
      else if (r < 0.85) noise(0.9 + Math.random() * 0.8, 0.07, 0, 'bandpass', 900 + Math.random() * 1500, 300 + Math.random() * 600, 0.3);  // a whisper
      else { const f = 300 + Math.random() * 200; tone('triangle', f, f * 0.42, 2.6, 0.05, 0, 0.6); tone('sine', f * 1.01, f * 0.4, 2.6, 0.04, 0.05, 0.6); }   // far off, something wails
      nextEv = now + 0.7 + Math.random() * (r < 0.55 ? 0.9 : 2.5);
    } else if (bed.kind === 'hearth' && Math.random() < 0.5) {
      noise(0.025, 0.06, 0, 'highpass', 2600, 1800);
      nextEv = now + 0.25 + Math.random() * 1.4;
    } else if (bed.kind === 'fire' && Math.random() < 0.6) {
      noise(0.03, 0.12, 0, 'highpass', 3000, 2000);
      nextEv = now + 0.15 + Math.random() * 0.9;
    } else nextEv = now + 2;
    toBus = null;
  }

  U.audio = {
    unlock: unlock, names: Object.keys(R), isRunning: function () { return !!ac && ac.state === 'running'; },
    setBed: function (kind, pallorTier) { wantBed = typeof kind === 'string' ? kind : 'none'; wantPallor = pallorTier | 0; },
    tick: function () { try { tickBed(); } catch (err) { toBus = null; /* audio must never break the game */ } },
    addFile: addFile,
    setMusic: function (track) { mus.want = typeof track === 'string' ? track : null; },
    musicTrack: function () { return mus.cur ? mus.cur.url.replace(/^.*music_|\.[a-z0-9]+$/g, '') : 'none'; },
    files: function () { const o = {}; for (const n in files) o[n] = files[n].music ? 'stream' : files[n].buf ? 'decoded' : 'pending'; return o; },
    BEDS: ['wind', 'drone', 'drip', 'water', 'fire', 'heart', 'choir', 'flesh', 'hearth'],
    MUSIC: ['title', 'town', 'crypt', 'caves', 'inferno', 'abyss', 'rift', 'boss', 'echo'],
    bedKind: function () { return bed ? bed.kind : 'none'; },
  };
})();
