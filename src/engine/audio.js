// WebAudio-synthesised sound effects. The context is only created on the first user gesture (U.audio.unlock),
// so nothing here warns or throws before that; G.engine.sfx() before unlock is a silent no-op.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  let ac = null, master = null, noiseBuf = null;
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
    o.connect(g); g.connect(master);
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
    s.connect(f); f.connect(g); g.connect(master);
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
    if (!fn || !ac || ac.state === "closed") return;
    const now = ac.currentTime;
    if (last[name] !== undefined && now - last[name] < 0.05) return;     // don't stack identical sounds
    if (now - recentT > 0.12) { recentT = now; recent = 0; }
    if (++recent > 7) return;                                             // global burst cap
    last[name] = now;
    try { fn(); } catch (err) { /* audio must never break the game */ }
  };
  G.on('sfx', function (e) { if (e && e.name) E.sfx(e.name); });

  U.audio = { unlock: unlock, names: Object.keys(R), isRunning: function () { return !!ac && ac.state === 'running'; } };
})();
