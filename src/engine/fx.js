// Particles + shape effects for every G.C.FX_TYPES (fx:spawn), floating combat text (fx:text) and
// screenshake (fx:shake). Everything lives in fixed-size pools: no allocation after load.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const rnd = Math.random;

  // ---- particles (ring buffer, struct of arrays). x,y in tiles, z in px above ground. ----
  const N = 420;
  const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
  const life = new Float32Array(N), maxLife = new Float32Array(N), grav = new Float32Array(N);
  const size = new Uint8Array(N), col = new Array(N).fill('#fff');
  let head = 0;

  function p(x, y, z, vx_, vy_, vz_, l, sz, c, g) {
    const i = head; head = (head + 1) % N;
    px[i] = x; py[i] = y; pz[i] = z; vx[i] = vx_; vy[i] = vy_; vz[i] = vz_;
    life[i] = maxLife[i] = l; size[i] = sz; col[i] = c; grav[i] = g;
  }
  // o: n, sp[min,max] tiles/s, vz[min,max] px/s, life[min,max], size, cols[], grav, z, spread (spawn radius)
  function burst(x, y, o) {
    for (let i = 0; i < o.n; i++) {
      const a = rnd() * 6.283, s = o.sp[0] + rnd() * (o.sp[1] - o.sp[0]), r = (o.spread || 0) * Math.sqrt(rnd());
      const ra = rnd() * 6.283;
      p(x + Math.cos(ra) * r, y + Math.sin(ra) * r, (o.z || 0) + rnd() * (o.zr || 0), Math.cos(a) * s, Math.sin(a) * s,
        o.vz[0] + rnd() * (o.vz[1] - o.vz[0]), o.life[0] + rnd() * (o.life[1] - o.life[0]),
        o.size || 1, o.cols[(rnd() * o.cols.length) | 0], o.grav || 0);
    }
  }

  // ---- shape effects ----
  const FXN = 48, fxs = [];
  for (let i = 0; i < FXN; i++) fxs.push({ on: false, kind: '', x: 0, y: 0, t: 0, dur: 1, color: '#fff', r: 1, angle: 0, thick: 1, r0: 0 });
  let fxHead = 0;
  function shape(kind, x, y, dur, color, r, angle, thick, r0) {
    const f = fxs[fxHead]; fxHead = (fxHead + 1) % FXN;
    f.on = true; f.kind = kind; f.x = x; f.y = y; f.t = 0; f.dur = Math.max(0.05, dur); f.color = color;
    f.r = r; f.angle = angle || 0; f.thick = thick || 1; f.r0 = r0 || 0;
  }

  const num = function (v, d) { return typeof v === 'number' && isFinite(v) ? v : d; };
  const colr = function (e, d) { return U.safeColor(e.color, d); };
  const SPAWN = {
    hit: function (x, y, e) {
      const c = colr(e, '#ffffff');
      burst(x, y, { n: 7, sp: [1.5, 4.5], vz: [10, 60], life: [0.1, 0.24], size: 1, cols: [c, '#ffffff', '#ffffff'], grav: 180, z: 10 });
      shape('flash', x, y, 0.07, c, 2);
    },
    // R8.11 cleave: a filled crescent sweeping ~140 degrees around the attacker (x, y = attacker; angle = facing,
    // radius = reach in tiles), bright leading edge and a fading wake, sparks along the rim
    cleave: function (x, y, e) {
      const r = num(e.radius, 1.4), a = num(e.angle, 0), c = colr(e, '#f0e8d8');
      shape('cleave', x, y, num(e.duration, 0.22), c, r, a, 1);
      for (let i = 0; i < 6; i++) {
        const t = a - 1.2 + 2.4 * i / 5;
        burst(x + Math.cos(t) * r, y + Math.sin(t) * r, { n: 1, sp: [0.5, 1.5], vz: [10, 40], life: [0.12, 0.25], size: 1, cols: [c, '#ffffff'], grav: 160, z: 9 });
      }
    },
    slash: function (x, y, e) { shape('slash', x, y, num(e.duration, 0.16), colr(e, '#f0f4ff'), num(e.radius, 1), num(e.angle, 0)); },
    explosion: function (x, y, e) {
      const r = num(e.radius, 1.5), c = colr(e, '#ff8a1e');
      burst(x, y, { n: Math.min(40, 16 + r * 8) | 0, sp: [r * 0.8, r * 3], vz: [20, 90], life: [0.25, 0.6], size: 2, cols: [c, '#ffd84a', '#fff0a0', '#d43c16'], grav: 140, z: 4, spread: r * 0.2 });
      burst(x, y, { n: 6, sp: [0.2, 0.8], vz: [14, 30], life: [0.5, 0.9], size: 2, cols: ['#3a3438', '#544c50'], grav: -6, z: 8, spread: r * 0.4 });
      shape('ring', x, y, num(e.duration, 0.3), c, r, 0, 2);
      shape('flash', x, y, 0.12, '#fff0a0', 2);
    },
    nova: function (x, y, e) {
      const r = num(e.radius, 3), c = colr(e, '#7fd4ff'), d = num(e.duration, 0.45);
      shape('ring', x, y, d, c, r, 0, 2); shape('ring', x, y, d * 1.25, '#ffffff', r * 0.8, 0, 1);
      for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, s = r / d; p(x, y, 4, Math.cos(a) * s, Math.sin(a) * s, 10, d, 2, i & 1 ? c : '#ffffff', 30); }
    },
    heal: function (x, y, e) {
      const c = colr(e, '#5bff8a');
      burst(x, y, { n: 12, sp: [0, 0.3], vz: [18, 40], life: [0.5, 0.9], size: 1, cols: [c, '#d8ffe0', c], grav: -10, z: 2, zr: 10, spread: 0.45 });
      shape('ring', x, y, 0.4, c, 0.6, 0, 1);
    },
    levelup: function (x, y, e) {
      const c = colr(e, '#ffe45b');
      burst(x, y, { n: 34, sp: [0, 0.5], vz: [30, 80], life: [0.6, 1.3], size: 2, cols: [c, '#ffffff', '#ffb040'], grav: -8, z: 0, zr: 8, spread: 0.6 });
      shape('ring', x, y, 0.6, c, 2.2, 0, 2); shape('ring', x, y, 0.9, '#ffffff', 1.4, 0, 1);
      shape('beam', x, y, 1.1, c, 64);
    },
    lootbeam: function (x, y, e) {
      const c = colr(e, '#ffe45b');
      shape('beam', x, y, num(e.duration, 0.7), c, 56);
      burst(x, y, { n: 10, sp: [0.3, 1.4], vz: [30, 70], life: [0.3, 0.7], size: 1, cols: [c, '#ffffff'], grav: 120, z: 2 });
      shape('ring', x, y, 0.3, c, 0.7, 0, 1);
    },
    spark: function (x, y, e) { burst(x, y, { n: 5, sp: [0.8, 2.6], vz: [20, 60], life: [0.15, 0.35], size: 1, cols: [colr(e, '#ffe45b'), '#ffffff'], grav: 200, z: 8 }); },
    smoke: function (x, y, e) { burst(x, y, { n: 7, sp: [0.1, 0.5], vz: [10, 24], life: [0.5, 1], size: 3, cols: [colr(e, '#4a444c'), '#3a3438', '#5c555e'], grav: -4, z: 4, spread: 0.2 }); },
    blood: function (x, y, e) {
      // heavy: fat drops that arc and land, plus a fine fresh-red spray
      const c = colr(e, '#d01818');
      burst(x, y, { n: 8, sp: [0.4, 1.8], vz: [30, 80], life: [0.5, 0.9], size: 2, cols: [c, '#7a0c0e', '#9a1214'], grav: 330, z: 9 });
      burst(x, y, { n: 8, sp: [1, 3.2], vz: [10, 60], life: [0.2, 0.45], size: 1, cols: [c, '#ff3a30'], grav: 260, z: 11 });
    },
    frost: function (x, y, e) {
      const c = colr(e, '#9fe0ff');
      burst(x, y, { n: 12, sp: [0.5, 2], vz: [5, 40], life: [0.3, 0.7], size: 1, cols: [c, '#ffffff', '#5bb0e8'], grav: 60, z: 6 });
      shape('ring', x, y, 0.3, c, num(e.radius, 0.8), 0, 1);
    },
    poison: function (x, y, e) { burst(x, y, { n: 9, sp: [0, 0.5], vz: [8, 26], life: [0.5, 1], size: 2, cols: [colr(e, '#6ad83a'), '#3a8a1e', '#b0f060'], grav: -6, z: 2, zr: 8, spread: 0.4 }); },
    teleport: function (x, y, e) {
      const c = colr(e, '#b65bff');
      burst(x, y, { n: 20, sp: [0, 0.4], vz: [40, 110], life: [0.3, 0.7], size: 1, cols: [c, '#ffffff', '#6a4cff'], grav: 0, z: 0, zr: 14, spread: 0.4 });
      shape('ring', x, y, 0.35, c, 0.1, 0, 2, 1.1); shape('beam', x, y, 0.4, c, 48);
    },
    ring: function (x, y, e) { shape('ring', x, y, num(e.duration, 0.4), colr(e, '#ffffff'), num(e.radius, 1), 0, 1); },
  };

  // ---- floating text ----
  const TN = 48, texts = [];
  for (let i = 0; i < TN; i++) texts.push({ on: false, x: 0, y: 0, t: 0, dur: 1, img: null, scale: 1, dx: 0, crit: false });
  let tHead = 0;

  const shake = { t: 0, dur: 0, amt: 0, x: 0, y: 0 };

  G.on('fx:spawn', function (e) {
    if (!e) return;
    const x = +e.x, y = +e.y;
    if (!isFinite(x) || !isFinite(y)) return;
    // a hand-drawn strip fx/<type>.png plays instead (once over the duration, sized to the radius)
    const strip = U.assets && U.assets.fx(e.type);
    if (strip) { shape('sprite', x, y, num(e.duration, Math.min(1, strip.length * 0.06)), e.type, num(e.radius, 1), num(e.angle, 0)); fxs[(fxHead + FXN - 1) % FXN].frames = strip; return; }
    (SPAWN[e.type] || SPAWN.spark)(x, y, e);
  });
  G.on('fx:text', function (e) {
    if (!e || e.text == null) return;
    const x = +e.x, y = +e.y;
    if (!isFinite(x) || !isFinite(y)) return;
    const t = texts[tHead]; tHead = (tHead + 1) % TN;
    const crit = !!e.crit;
    t.on = true; t.x = x; t.y = y; t.t = 0; t.dur = crit ? 1.1 : 0.85; t.crit = crit;
    t.img = U.text(String(e.text).slice(0, 28) + (crit ? '!' : ''), U.safeColor(e.color, crit ? '#ffe45b' : '#ffffff'));
    t.scale = crit ? 2 : 1; t.dx = Math.round((rnd() - 0.5) * 16);
  });
  G.on('fx:shake', function (e) {
    const amt = Math.max(0.5, Math.min(10, num(e && e.amount, 3))), dur = Math.max(0.05, Math.min(1.5, num(e && e.duration, 0.2)));
    if (amt * dur >= shake.amt * (shake.dur - shake.t)) { shake.amt = amt; shake.dur = dur; shake.t = 0; }
  });
  G.on('scene:changed', function () {
    life.fill(0);
    for (let i = 0; i < FXN; i++) fxs[i].on = false;
    for (let i = 0; i < TN; i++) texts[i].on = false;
  });

  function dots(ctx, f, offX, offY, r, a0, a1, z, c, sz, skip) {
    const n = Math.max(10, Math.min(150, Math.ceil(r * 36 * Math.abs(a1 - a0) / 6.283)));
    ctx.fillStyle = c;
    for (let i = 0; i <= n; i += skip) {
      const a = a0 + (a1 - a0) * i / n, wx = f.x + Math.cos(a) * r, wy = f.y + Math.sin(a) * r;
      ctx.fillRect(Math.round((wx - wy) * 16 - offX), Math.round((wx + wy) * 8 - offY - z), sz, sz);
    }
  }

  const GLOWY = { hit: 1, explosion: 1, nova: 1, heal: 1, levelup: 1, lootbeam: 1, spark: 1, frost: 1, teleport: 1, ring: 1, slash: 1 };
  U.fx = {
    shake: shake,
    particle: p,
    burst: burst,
    update: function (dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt;
        vz[i] -= grav[i] * dt; pz[i] += vz[i] * dt;
        if (pz[i] < 0) { pz[i] = 0; vz[i] *= -0.3; vx[i] *= 0.4; vy[i] *= 0.4; }
      }
      for (let i = 0; i < FXN; i++) { const f = fxs[i]; if (f.on && (f.t += dt) >= f.dur) f.on = false; }
      for (let i = 0; i < TN; i++) { const t = texts[i]; if (t.on && (t.t += dt) >= t.dur) t.on = false; }
      if (shake.t < shake.dur) {
        shake.t += dt;
        const k = Math.max(0, 1 - shake.t / shake.dur) * shake.amt;
        shake.x = Math.round((rnd() * 2 - 1) * k); shake.y = Math.round((rnd() * 2 - 1) * k);
      } else { shake.x = shake.y = 0; shake.amt = 0; }
    },
    draw: function (ctx, offX, offY, W, H) {
      for (let i = 0; i < FXN; i++) {
        const f = fxs[i];
        if (!f.on) continue;
        const k = f.t / f.dur, sx = (f.x - f.y) * 16 - offX, sy = (f.x + f.y) * 8 - offY;
        if (sx < -120 || sy < -120 || sx > W + 120 || sy > H + 120) continue;
        if (f.kind === 'ring') {
          const r = f.r0 + (f.r - f.r0) * (1 - (1 - k) * (1 - k));
          const skip = k > 0.75 ? 3 : k > 0.5 ? 2 : 1;
          dots(ctx, f, offX, offY, r, 0, 6.283, 1, f.color, f.thick, skip);
          if (f.thick > 1) dots(ctx, f, offX, offY, r * 0.9, 0.1, 6.383, 1, '#ffffff', 1, skip * 2);
        } else if (f.kind === 'cleave') {
          // crescent between 0.62r and 1.05r; head sweeps across 2.4 rad, the wake fades behind it
          const head = f.angle - 1.2 + 2.4 * Math.min(1, k * 1.7), tail = Math.max(f.angle - 1.2, head - 1.6), fade = 1 - Math.max(0, k - 0.55) / 0.45;
          const P = function (ang, rr) { const wx = f.x + Math.cos(ang) * rr, wy = f.y + Math.sin(ang) * rr; return [(wx - wy) * 16 - offX, (wx + wy) * 8 - offY - 9]; };
          const SEG = 6;
          for (let s = 0; s < SEG; s++) {
            const a0 = tail + (head - tail) * s / SEG, a1 = tail + (head - tail) * (s + 1) / SEG;
            ctx.globalAlpha = fade * (0.12 + 0.5 * (s + 1) / SEG);
            ctx.fillStyle = s === SEG - 1 ? '#ffffff' : f.color;
            ctx.beginPath();
            let q = P(a0, f.r * 1.05); ctx.moveTo(q[0], q[1]);
            q = P((a0 + a1) / 2, f.r * 1.08); ctx.lineTo(q[0], q[1]);
            q = P(a1, f.r * 1.05); ctx.lineTo(q[0], q[1]);
            q = P(a1, f.r * 0.62); ctx.lineTo(q[0], q[1]);
            q = P(a0, f.r * 0.7); ctx.lineTo(q[0], q[1]);
            ctx.fill();
          }
          ctx.globalAlpha = fade;
          dots(ctx, f, offX, offY, f.r * 1.06, tail + (head - tail) * 0.5, head, 9, '#ffffff', 1, 1);
          ctx.globalAlpha = 1;
        } else if (f.kind === 'slash') {
          const a1 = f.angle - 1.1 + 2.2 * Math.min(1, k * 1.6), a0 = Math.max(f.angle - 1.1, a1 - 1.5 * (1 - k * 0.5));
          dots(ctx, f, offX, offY, f.r, a0, a1, 9, f.color, 2, 1);
          dots(ctx, f, offX, offY, f.r * 0.84, a0 + 0.2, a1, 9, '#ffffff', 1, 1);
          dots(ctx, f, offX, offY, f.r * 1.08, a0 + 0.5, a1, 9, f.color, 1, 2);
        } else if (f.kind === 'beam') {
          const b = U.beam(f.color, f.r | 0);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.max(0, 1 - k);
          ctx.drawImage(b, Math.round(sx) - 4, Math.round(sy) - b.height + 2);
          if (k < 0.5) ctx.drawImage(b, Math.round(sx) - 4, Math.round(sy) - b.height + 2);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        } else if (f.kind === 'sprite' && f.frames) {
          // square frames; the frame's width covers the effect's diameter (radius in tiles), anchored at its centre
          const img = f.frames[Math.min(f.frames.length - 1, (k * f.frames.length) | 0)], d = Math.max(16, f.r * 2 * 32 * 0.75);
          ctx.globalCompositeOperation = GLOWY[f.color] ? 'lighter' : 'source-over';
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, sx - d / 2, sy - d / 2 - 6, d, d);
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = 'source-over';
        } else if (f.kind === 'flash') {
          const s = (f.r > 1 ? 5 : 3) - ((k * 2) | 0), x = Math.round(sx), y = Math.round(sy) - 10;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - s, y, s * 2 + 1, 1); ctx.fillRect(x, y - s, 1, s * 2 + 1);
          ctx.fillStyle = f.color;
          ctx.fillRect(x - 1, y - 1, 3, 3);
        }
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        const sx = (px[i] - py[i]) * 16 - offX, sy = (px[i] + py[i]) * 8 - offY - pz[i];
        if (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4) continue;
        let s = size[i];
        if (s > 1 && life[i] < maxLife[i] * 0.35) s -= 1;
        ctx.fillStyle = col[i];
        ctx.fillRect(sx | 0, sy | 0, s, s);
      }
    },
    drawText: function (ctx, offX, offY) {
      for (let i = 0; i < TN; i++) {
        const t = texts[i];
        if (!t.on) continue;
        const k = t.t / t.dur, sc = t.crit && t.t < 0.09 ? 3 : t.scale;
        const w = t.img.width * sc, h = t.img.height * sc;
        const sx = Math.round((t.x - t.y) * 16 - offX + t.dx - w / 2);
        const sy = Math.round((t.x + t.y) * 8 - offY - 24 - 22 * (1 - (1 - k) * (1 - k)) - h / 2);
        if (k > 0.7) ctx.globalAlpha = Math.max(0, (1 - k) / 0.3);
        ctx.drawImage(t.img, sx, sy, w, h);
        ctx.globalAlpha = 1;
      }
    },
  };
})();
