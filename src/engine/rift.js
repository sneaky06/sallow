// The rift's look (R6.5 / R7.7): taint decals (sinew veins pooling where the world team's map.taint says), fissure glow,
// the Hellscape's horror pass (wrong colours, breathing sinew vignette, eyes in the dark, warped light, a flesh sound bed)
// and the town coming back to life with state.flags.warmth 0..3 (frost and dead hearths → chimney smoke, lit windows,
// lanterns, birds, a warmer rift fissure). Everything is cached per map or built once; per frame it is a handful of draws.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const C = G.C, T = C.TILE, HW = C.TILE_W / 2, HH = C.TILE_H / 2;

  const num = function (v, d) { return typeof v === 'number' && isFinite(v) ? v : d; };
  // lub-dub, ~55 bpm: 0..1
  function beat(t) {
    const ph = (t / 1.1) % 1;
    return Math.exp(-(ph * ph) / 0.002) + 0.6 * Math.exp(-((ph - 0.2) * (ph - 0.2)) / 0.002) + 0.0001;
  }

  // ---------------------------------------------------------------- per-frame recipe
  const F = { hell: 0, c: 0, town: false, warmth: 0, glow: '#ff9a4a', vein: '#6a2a5a', beat: 0, map: null, fis: '#ff9a4a' };
  const TOWN_FIS = ['#6a48c8', '#b8608a', '#ff8a48', '#ffc060'];
  function frame(map, t) {
    const S = G.state, rift = map.rift && typeof map.rift === 'object' ? map.rift : null;
    F.map = map;
    F.c = Math.max(0, Math.min(1, num(map.corruption, 0)));
    F.town = map.kind === 'town';
    F.warmth = F.town ? Math.max(0, Math.min(3, num(S.flags && S.flags.warmth, 0) | 0)) : 0;
    F.hell = (map.act === 'hellscape' || map.act === 'endless') ? Math.max(0.5, F.c) : 0;
    F.glow = U.safeColor(rift && rift.glow, '#ff9a4a');
    F.vein = U.safeColor(rift && rift.vein, '#6a2a5a');
    F.fis = F.town ? TOWN_FIS[F.warmth] : F.glow;
    F.beat = beat(t);
    return F;
  }

  // ---------------------------------------------------------------- taint decals: sinew on a 64x32 (2x) diamond
  const decals = new Map();
  function decal(level, vr, hex, hell) {
    const key = hex + level + vr + (hell ? 'h' : '');
    let c = decals.get(key);
    if (c) return c;
    const W2 = 64, H2 = 32, b = new U.Buf(W2, H2), base = U.rgbOf(hex);
    const dark = hell ? [70, 6, 16] : base, hi = hell ? [190, 60, 70] : U.rgbOf(U.tone(hex, 1.6));
    const inside = function (x, y) { return Math.abs(x - 31.5) / 32 + Math.abs(y - 15.5) / 16 <= 0.94; };
    // a dark stain pooling at level 3
    if (level >= 3) for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      if (!inside(x, y)) continue;
      const n = U.vnoise(x / 9 + vr * 7, y / 5, 401);
      if (n > 0.52) b.set(x, y, U.pack(dark[0] * 0.55, dark[1] * 0.55, dark[2] * 0.55), Math.min(230, (n - 0.52) * 900 | 0));
    }
    // veins: random walks from a knot, thicker with level
    const n = 2 + level * 2;
    for (let k = 0; k < n; k++) {
      let x = 32 + (U.hash(k, vr, 410) - 0.5) * 30, y = 16 + (U.hash(k, vr, 411) - 0.5) * 12, a = U.hash(k, vr, 412) * 6.28;
      const len = 10 + level * 8;
      for (let s = 0; s < len; s++) {
        a += (U.hash(k * 97 + s, vr, 413) - 0.5) * 0.9;
        x += Math.cos(a) * 1.4; y += Math.sin(a) * 0.7;
        if (!inside(x, y)) break;
        const w = level >= 2 && s < len * 0.5 ? 2 : 1;
        for (let j = 0; j < w; j++) b.set(x, y + j, U.pack(dark[0], dark[1], dark[2]), 235);
        if ((s & 3) === 0) b.set(x, y - 1, U.pack(hi[0], hi[1], hi[2]), 150);
      }
    }
    c = b.done();
    c.hd = 2;
    if (decals.size > 60) decals.clear();
    decals.set(key, c);
    return c;
  }
  // alpha by taint level; Hellscape veins breathe with the heartbeat
  const TA = [0, 0.3, 0.55, 0.85];
  function taintAlpha(level) { return TA[level] * (F.hell ? 0.75 + 0.35 * F.beat : 1); }

  // ---------------------------------------------------------------- per-map points (town roofs, windows, lanterns)
  const pts = new WeakMap();
  function townPoints(map) {
    let o = pts.get(map);
    if (o) return o;
    const w = map.w, h = map.h, t = map.tiles, roofs = [], wins = [], lamps = [];
    const at = function (x, y) { return x < 0 || y < 0 || x >= w || y >= h ? T.VOID : t[y * w + x]; };
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const v = at(x, y), r = U.hash(x, y, 520);
      if (v === T.WALL) {
        if (at(x - 1, y) === T.WALL && at(x + 1, y) === T.WALL && at(x, y - 1) === T.WALL && at(x, y + 1) === T.WALL) roofs.push({ x: x, y: y, r: r });
        else if (C.WALKABLE[at(x + 1, y)] && at(x, y - 1) === T.WALL && at(x, y + 1) === T.WALL) wins.push({ x: x + 1, y: y + 0.5, r: r });
        else if (C.WALKABLE[at(x, y + 1)] && at(x - 1, y) === T.WALL && at(x + 1, y) === T.WALL) wins.push({ x: x + 0.5, y: y + 1, r: r });
      } else if (v === T.PATH && r < 0.04) lamps.push({ x: x + 0.5, y: y + 0.5, r: r });
    }
    const by = function (a, b) { return a.r - b.r; };
    roofs.sort(by); wins.sort(by); lamps.sort(by);
    o = { roofs: roofs.slice(0, 8), wins: wins.slice(0, 14), lamps: lamps.slice(0, 8) };
    pts.set(map, o);
    return o;
  }
  const SMOKE = [0, 1, 3, 6], WIN = [0, 3, 8, 14], LAMP = [0, 0, 3, 8];

  // ---------------------------------------------------------------- lights (called while the renderer collects lights)
  function lights(map, addLight, ox, oy, W, H, t) {
    // fissure glow: one light every few cells of each crack centre line
    const fis = Array.isArray(map.fissures) ? map.fissures : null;
    if (fis) {
      let n = 0;
      const k = F.town ? 0.6 + F.warmth * 0.35 : 0.5 + F.c * 0.6;
      for (let f = 0; f < fis.length && n < 16; f++) {
        const cells = fis[f] && fis[f].cells;
        if (!Array.isArray(cells)) continue;
        for (let i = 0; i + 1 < cells.length && n < 16; i += 6) {
          const x = cells[i] + 0.5, y = cells[i + 1] + 0.5, sx = (x - y) * HW - ox, sy = (x + y) * HH - oy;
          if (sx < -40 || sy < -40 || sx > W + 40 || sy > H + 40) continue;
          addLight(sx, sy, (1.6 + 0.5 * Math.sin(t * 1.7 + i)) * k, F.fis);
          n++;
        }
      }
    }
    if (!F.town || !F.warmth) return;
    const P = townPoints(map);
    for (let i = 0; i < WIN[F.warmth] && i < P.wins.length; i++) {
      const p = P.wins[i], sx = (p.x - p.y) * HW - ox, sy = (p.x + p.y) * HH - oy - 12;
      if (sx > -30 && sy > -30 && sx < W + 30 && sy < H + 30) addLight(sx, sy, 1.5 + 0.1 * Math.sin(t * 3 + i), 'warm');
    }
    for (let i = 0; i < LAMP[F.warmth] && i < P.lamps.length; i++) {
      const p = P.lamps[i], sx = (p.x - p.y) * HW - ox, sy = (p.x + p.y) * HH - oy - 14;
      if (sx > -30 && sy > -30 && sx < W + 30 && sy < H + 30) addLight(sx, sy, 2.2, 'gold');
    }
  }

  // ---------------------------------------------------------------- ambient colour (town warms; hellscape pulses red)
  let ambKey = '', ambCss = '';
  function amb(VR) {
    let r = VR.amb[0], g = VR.amb[1], b = VR.amb[2];
    if (F.town) {
      const w = F.warmth;
      if (w === 0) { r *= 0.8; g *= 0.9; b *= 1.15; } else { r *= 1 + w * 0.12; g *= 1 + w * 0.07; b *= 1 - w * 0.04; }
    } else if (F.hell) {
      const k = F.hell * (0.6 + 0.4 * F.beat);
      r = r + 22 * k; g = g * (1 - 0.25 * k); b = b * (1 - 0.1 * k);
    } else return VR.ambCss;
    const key = (r | 0) + ',' + (g | 0) + ',' + (b | 0);
    if (key !== ambKey) { ambKey = key; ambCss = 'rgb(' + Math.min(255, r | 0) + ',' + Math.min(255, g | 0) + ',' + Math.min(255, b | 0) + ')'; }
    return ambCss;
  }
  // warped light: the player's light breathes and leans
  function warp(out, t) {
    if (!F.hell) { out.a = 1; out.b = 1; out.dx = 0; return out; }
    const k = F.hell;
    out.a = 1 + k * (0.12 * Math.sin(t * 0.9) + 0.05 * F.beat);
    out.b = 1 + k * 0.18 * Math.sin(t * 0.63 + 1.3);
    out.dx = k * 6 * Math.sin(t * 0.41);
    return out;
  }

  // ---------------------------------------------------------------- after lighting: washes, glints, eyes, vignette
  let vig = null, vigW = 0, vigH = 0, hueOK = null;
  function vignette(w, h) {
    if (vig && vigW === w && vigH === h) return vig;
    vigW = w; vigH = h;
    const b = new U.Buf(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), d = Math.sqrt(dx * dx + dy * dy);
      const n = U.vnoise(x / 6, y / 6, 430), vein = Math.abs(U.vnoise(x / 9, y / 9, 431) - 0.5) < 0.035 && d > 0.55;
      const k = Math.max(0, d - 0.62 + n * 0.25) * 1.6;
      if (vein) b.set(x, y, 0x3a0408, Math.min(220, 120 + k * 120 | 0));
      else if (k > 0) b.set(x, y, 0x120206, Math.min(235, k * 255 | 0));
    }
    return (vig = b.done());
  }
  function blend(ctx, mode) {
    ctx.globalCompositeOperation = mode;
    return ctx.globalCompositeOperation === mode;
  }
  function post(ctx, W, H, ox, oy, map, t, LW, LH) {
    if (F.town) {
      // frost at 0 drains the town toward cold blue; from 2 a faint warm wash
      const w = F.warmth;
      if (w <= 1 && blend(ctx, 'color')) { ctx.globalAlpha = w === 0 ? 0.32 : 0.14; ctx.fillStyle = '#8aa8d0'; ctx.fillRect(0, 0, W, H); }
      else if (w >= 2 && blend(ctx, 'soft-light')) { ctx.globalAlpha = w === 3 ? 0.22 : 0.12; ctx.fillStyle = '#ffb060'; ctx.fillRect(0, 0, W, H); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (w) {                                  // lit window panes stay bright after the light pass
        const P = townPoints(map);
        for (let i = 0; i < WIN[w] && i < P.wins.length; i++) {
          const p = P.wins[i], sx = Math.round((p.x - p.y) * HW - ox), sy = Math.round((p.x + p.y) * HH - oy - 13);
          if (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4) continue;
          ctx.fillStyle = i % 3 ? '#ffc870' : '#ffe0a0';
          ctx.globalAlpha = 0.75 + 0.2 * Math.sin(t * 2.3 + i * 1.7);
          ctx.fillRect(sx - 1, sy - 2, 3, 3);
        }
        for (let i = 0; i < LAMP[w] && i < P.lamps.length; i++) {
          const p = P.lamps[i], sx = Math.round((p.x - p.y) * HW - ox), sy = Math.round((p.x + p.y) * HH - oy);
          ctx.globalAlpha = 1; ctx.fillStyle = '#2a2024'; ctx.fillRect(sx, sy - 14, 1, 14);
          ctx.fillStyle = '#ffd880'; ctx.fillRect(sx - 1, sy - 17, 3, 3);
        }
        ctx.globalAlpha = 1;
      }
      if (w === 3) birds(ctx, W, H, t);
    }
    // the fissure seams glow additively (the light map alone can't lift a near-black chasm)
    const fis = Array.isArray(map.fissures) ? map.fissures : null;
    if (fis) {
      const a = U.aura(F.fis, 24);
      ctx.globalCompositeOperation = 'lighter';
      let n = 0;
      for (let f = 0; f < fis.length && n < 48; f++) {
        const cells = fis[f] && fis[f].cells;
        if (!Array.isArray(cells)) continue;
        for (let i = 0; i + 1 < cells.length && n < 48; i += 2) {
          const x = cells[i] + 0.5, y = cells[i + 1] + 0.5, sx = (x - y) * HW - ox, sy = (x + y) * HH - oy;
          if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
          if (map.explored && !map.explored[cells[i + 1] * map.w + cells[i]]) continue;
          ctx.globalAlpha = (F.town ? 0.25 + F.warmth * 0.15 : 0.3 + F.c * 0.4) * (0.7 + 0.3 * Math.sin(t * 1.3 + i * 0.7));
          ctx.drawImage(a, sx - 12, sy - 6);
          n++;
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (!F.hell) return;
    const k = F.hell;
    // wrong colours: the hue of everything drifts through sick, impossible tints
    if (hueOK === null) { hueOK = blend(ctx, 'hue'); ctx.globalCompositeOperation = 'source-over'; }
    if (hueOK) {
      ctx.globalCompositeOperation = 'hue';
      ctx.globalAlpha = 0.18 + 0.22 * k;
      ctx.fillStyle = 'hsl(' + (((t * 9) % 360 + 300) % 360 | 0) + ',70%,45%)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    eyes(ctx, map, W, H, ox, oy, t, k);
    // breathing sinew vignette
    const v = vignette(LW, LH), s = 1 + 0.035 * F.beat - 0.02;
    ctx.globalAlpha = Math.min(1, 0.45 + 0.4 * k);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(v, W / 2 - W * s / 2, H / 2 - H * s / 2, W * s, H * s);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
  }

  // Eyes in the dark: on a coarse world grid around the player, only in cells the player can't see. They open, track
  // the player and blink, never on lit ground.
  function eyes(ctx, map, W, H, ox, oy, t, k) {
    const p = G.state.player, vis = map.visible, w = map.w;
    if (!p || !vis) return;
    const cx = Math.floor(p.x / 2) * 2, cy = Math.floor(p.y / 2) * 2;
    for (let gy = cy - 14; gy <= cy + 14; gy += 2) for (let gx = cx - 14; gx <= cx + 14; gx += 2) {
      const r = U.hash(gx, gy, 440 + (map.seed & 255));
      if (r > 0.16 * k) continue;
      const tx = gx + ((r * 97) % 2 | 0), ty = gy + ((r * 53) % 2 | 0);
      if (tx >= 0 && ty >= 0 && tx < w && ty < map.h && vis[ty * w + tx]) continue;
      const open = Math.sin(t * (0.3 + r * 2) + r * 40);
      if (open < 0.2) continue;
      const x = tx + 0.5, y = ty + 0.5, sx = Math.round((x - y) * HW - ox), sy = Math.round((x + y) * HH - oy - 10 - r * 40);
      if (sx < 0 || sy < 0 || sx > W || sy > H) continue;
      const lx = Math.sign(p.x - p.y - (x - y)), ly = Math.sign(p.x + p.y - (x + y));
      const big = r < 0.03 * k ? 2 : 1, gap = 3 + big * 2, hgt = open > 0.35 ? big : 1;
      ctx.globalAlpha = Math.min(1, (open - 0.2) * 3);
      ctx.fillStyle = r < 0.05 ? '#ff4a3a' : '#f0e080';
      ctx.fillRect(sx - gap, sy, 2 + big, hgt); ctx.fillRect(sx + gap - big, sy, 2 + big, hgt);
      if (hgt > 1) { ctx.fillStyle = '#100004'; ctx.fillRect(sx - gap + 1 + (lx > 0 ? 1 : 0), sy + (ly > 0 ? 1 : 0), 1, 1); ctx.fillRect(sx + gap - big + 1 + (lx > 0 ? 1 : 0), sy + (ly > 0 ? 1 : 0), 1, 1); }
    }
    ctx.globalAlpha = 1;
  }

  // a few birds crossing high over the warm town (screen space, deterministic from time)
  function birds(ctx, W, H, t) {
    ctx.fillStyle = '#1a1418';
    for (let i = 0; i < 4; i++) {
      const sp = 9 + i * 3, ph = ((t * sp + i * 137) % (W + 80)) - 40, y = H * (0.12 + 0.05 * i) + Math.sin(t * 0.7 + i) * 6;
      const f = ((t * 6 + i) | 0) & 1;
      ctx.fillRect(ph | 0, y | 0, 1, 1);
      ctx.fillRect((ph - 2) | 0, (y - 1 + f) | 0, 2, 1); ctx.fillRect((ph + 1) | 0, (y - 1 + f) | 0, 2, 1);
    }
  }

  // ---------------------------------------------------------------- update: chimney smoke
  let smokeT = 0;
  function update(dt, map) {
    if (!map || map.kind !== 'town' || !F.warmth || !U.fx) return;
    smokeT += dt;
    if (smokeT < 0.14) return;
    smokeT = 0;
    const P = townPoints(map);
    for (let i = 0; i < SMOKE[F.warmth] && i < P.roofs.length; i++) {
      const r = P.roofs[i];
      U.fx.particle(r.x + 0.5 + (Math.random() - 0.5) * 0.2, r.y + 0.5, 28, 0.15 + Math.random() * 0.1, -0.12, 9 + Math.random() * 5, 2.4, 2, Math.random() < 0.5 ? '#6a6268' : '#857c80', -2);
    }
  }

  // sound bed: the Hellscape gets its own; the warm town loses the bitter wind
  function bed(kind) {
    if (F.hell) return 'flesh';
    if (F.town && F.warmth >= 2) return 'hearth';
    return kind;
  }

  U.rift = { frame: frame, decal: decal, taintAlpha: taintAlpha, lights: lights, amb: amb, warp: warp, post: post, update: update, bed: bed, F: F };
})();
