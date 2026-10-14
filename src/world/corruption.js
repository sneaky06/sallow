// The corrupted rift (CONTRACT R6.5): corruption level by depth, terrain warping (fissures, bites, breaches, rubble),
// prop dressing (growths, veins, rift shrines), the per-tile taint mask and the rift colours the engine renders.
// Terrain is stamped after the layout has been transformed to its final orientation and validated like a landmark:
// if the floor's dry ground stops being one piece the change is rolled back. Everything here uses its own rng
// (ctx.crng), so floors above the first corruption threshold keep their R5 layouts.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE;
  const W = G.world = G.world || {};
  const gen = W._gen, DRY = gen.DRY;

  // The floor where the rift's core sits (a boss floor: multiple of C.BOSS_EVERY). corruption reaches 1 here.
  W.CORE_DEPTH = 50;

  // 0..1. Depth 1 is a faint 0.03, the core is 1; linear in between, 1 beyond.
  W.corruptionForDepth = function (depth) {
    if (depth <= 0) return 0.08;
    const t = Math.min(1, (depth - 1) / (W.CORE_DEPTH - 1));
    return Math.round((0.03 + 0.97 * t) * 1000) / 1000;
  };

  // Tier by level: how the rift looks. glow = rift light/crack colour, vein = dark veins and growth tint.
  const TIERS = [
    { name: 'Seep',   max: 0.12, glow: '#ff9a4a', vein: '#6a2a5a', pulse: 0.1 },
    { name: 'Taint',  max: 0.3,  glow: '#e85a9a', vein: '#6a1f6a', pulse: 0.25 },
    { name: 'Blight', max: 0.55, glow: '#c040e0', vein: '#55157a', pulse: 0.4 },
    { name: 'Ruin',   max: 0.8,  glow: '#a030ff', vein: '#3a0f8a', pulse: 0.6 },
    { name: 'Core',   max: 9,    glow: '#ff70f0', vein: '#8a10b0', pulse: 0.85 },
  ];
  W.riftInfo = function (c) {
    let tier = 0;
    while (c >= TIERS[tier].max) tier++;
    const t = TIERS[tier];
    return { tier, name: t.name, glow: t.glow, vein: t.vein, pulse: t.pulse };
  };

  const hex = function (s) { return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]; };
  const mix = function (a, b, t) {
    const x = hex(a), y = hex(b);
    let out = '#';
    for (let k = 0; k < 3; k++) out += ('0' + Math.round(x[k] + (y[k] - x[k]) * t).toString(16)).slice(-2);
    return out;
  };
  const clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  const r3 = function (v) { return Math.round(v * 1000) / 1000; };

  // Push a freshly picked variant toward the rift: colours drift to the glow, light flickers, the dark thickens, deep floors hum.
  W.corruptVariant = function (v, c, rift) {
    v.corruption = c;
    const p = v.palette, l = v.light, a = v.ambient;
    p.tint = mix(p.tint, rift.vein, 0.5 * c);
    p.amount = r3(clamp(p.amount + 0.18 * c, 0, 1));
    p.saturation = r3(clamp(p.saturation + 0.12 * c, 0.1, 1.6));
    p.accent = mix(p.accent, rift.glow, 0.75 * c);
    l.color = mix(l.color, rift.glow, 0.3 * c);
    l.torch = mix(l.torch, rift.glow, 0.65 * c);
    l.flicker = r3(clamp(l.flicker + 0.4 * c, 0, 1));
    a.darkness = r3(clamp(a.darkness + 0.14 * c, 0, 0.8));
    a.fog = r3(clamp(a.fog + 0.12 * c, 0, 1));
    a.color = mix(a.color, rift.glow, 0.25 * c);
    if (c > 0.7 && a.particles !== 'none' && a.particles !== 'snow') a.particles = 'void';
    if (c > 0.6 && a.sound !== 'none') a.sound = 'heart';
    return v;
  };

  // ---- taint mask ---------------------------------------------------------------------------------------------
  const hash = function (x, y, s) {
    let h = Math.imul((x * 374761393) ^ (y * 668265263) ^ s, 1274126177);
    h ^= h >>> 13;
    h = Math.imul(h, 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const noise = function (x, y, s, sc) {
    const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), cc = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return (a + (b - a) * sx) * (1 - sy) + (cc + (d - cc) * sx) * sy;
  };

  // taint[i] 0..3 = how far the rift has eaten that tile (0 clean, 3 veined black). sources = [{x, y, r, s}] — fissures, growths,
  // shrines, the core: taint pools around them. Spreads with c; zero on VOID.
  W._paintTaint = function (tiles, w, h, seed, c, sources) {
    const taint = new Uint8Array(w * h);
    if (c < 0.03 && !sources.length) return taint;
    const infl = new Float32Array(w * h);
    for (const s of sources) {
      const R = Math.ceil(s.r);
      for (let y = Math.max(0, s.y - R); y <= Math.min(h - 1, s.y + R); y++) {
        for (let x = Math.max(0, s.x - R); x <= Math.min(w - 1, s.x + R); x++) {
          const d = Math.hypot(x - s.x, y - s.y);
          if (d < s.r) infl[y * w + x] += s.s * (1 - d / s.r);
        }
      }
    }
    const sd = (seed ^ 0x7A1D) | 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, t = tiles[i];
        if (t === T.VOID || t === T.CHASM || t === T.DEEP_LAVA || t === T.DEEP_WATER) continue;
        const v = (0.62 * noise(x, y, sd, 7) + 0.38 * noise(x, y, sd + 91, 3)) * 0.85 + Math.min(0.7, infl[i]) + (c - 0.5) * 0.9;
        taint[i] = v > 0.84 ? 3 : v > 0.68 ? 2 : v > 0.5 ? 1 : 0;
      }
    }
    return taint;
  };

  // ---- terrain ------------------------------------------------------------------------------------------------
  const countDry = function (ctx) {
    const dist = gen.flood(ctx, ctx.spawn.x, ctx.spawn.y);
    let reach = 0, dry = 0;
    for (let i = 0; i < ctx.n; i++) { if (DRY[ctx.tiles[i]]) dry++; if (dist[i] >= 0) reach++; }
    return reach === dry && dist[ctx.exit.y * ctx.w + ctx.exit.x] >= 0;
  };

  // Called after the final orientation, before stairs are written and lockdowns made. Fills ctx.fissures.
  gen.corruptTerrain = function (ctx) {
    ctx.fissures = [];
    const c = ctx.corruption;
    if (c < 0.1) return;
    const rng = ctx.crng, w = ctx.w, h = ctx.h, n = ctx.n, tiles = ctx.tiles;

    const nogo = new Uint8Array(n);
    const mark = function (x0, y0, x1, y1) {
      for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) nogo[y * w + x] = 1;
    };
    for (const r of ctx.rooms) if (r.type === 'boss' || r.type === 'exit' || r.type === 'start' || r.lm) mark(r.x - 1, r.y - 1, r.x + r.w, r.y + r.h);
    for (const lm of ctx.landmarks) mark(lm.x - 1, lm.y - 1, lm.x + lm.w, lm.y + lm.h);
    mark(ctx.spawn.x - 3, ctx.spawn.y - 3, ctx.spawn.x + 3, ctx.spawn.y + 3);
    mark(ctx.exit.x - 3, ctx.exit.y - 3, ctx.exit.x + 3, ctx.exit.y + 3);
    for (let i = 0; i < n; i++) if (ctx.lock[i]) nogo[i] = 1;

    const free = function (x, y) {
      if (x < 2 || y < 2 || x > w - 3 || y > h - 3) return false;
      const i = y * w + x, t = tiles[i];
      return (t === T.FLOOR || t === T.RUBBLE) && !nogo[i] && !ctx.prot[i];
    };
    const floorCells = [];
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (free(x, y)) floorCells.push(y * w + x);
    if (floorCells.length < 40) return;

    // 1. rubble: the floor cracks and heaves.
    for (let k = Math.round(floorCells.length * c * 0.09); k > 0; k--) {
      const i = floorCells[(rng.next() * floorCells.length) | 0];
      if (tiles[i] === T.FLOOR) tiles[i] = T.RUBBLE;
    }

    // 2. breaches: single wall tiles with floor on both sides knocked through (more loops, a broken look). Never makes anything worse.
    if (c >= 0.22) {
      const dry = function (x, y) { return DRY[gen.at(ctx, x, y)] === 1; };
      for (let k = Math.round(c * 9), guard = 400; k > 0 && guard > 0; guard--) {
        const x = rng.int(3, w - 4), y = rng.int(3, h - 4), i = y * w + x;
        if (tiles[i] !== T.WALL || nogo[i] || ctx.lock[i]) continue;
        if (!((dry(x - 1, y) && dry(x + 1, y)) || (dry(x, y - 1) && dry(x, y + 1)))) continue;
        tiles[i] = T.RUBBLE; ctx.prot[i] = 1;
        k--;
      }
    }

    // helper: stamp cells with rollback on a broken floor
    const attempt = function (cells, tile) {
      const prev = cells.map(function (i) { return tiles[i]; });
      for (const i of cells) tiles[i] = tile;
      if (countDry(ctx)) return true;
      cells.forEach(function (i, j) { tiles[i] = prev[j]; });
      return false;
    };

    // 3. bites: ragged pits chewed out of rooms — the layout stops being rectangular.
    if (c >= 0.2) {
      for (let k = Math.round(c * c * 26) + 1, guard = 60; k > 0 && guard > 0; guard--) {
        const s = floorCells[(rng.next() * floorCells.length) | 0];
        if (!free(s % w, (s / w) | 0)) continue;
        const cells = [s], seen = new Set(cells), size = rng.int(1, 2 + Math.floor(c * 6));
        for (let g = size * 8; g > 0 && cells.length < size; g--) {
          const b = cells[(rng.next() * cells.length) | 0], d = rng.int(0, 3);
          const nx = (b % w) + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = ((b / w) | 0) + (d === 2 ? 1 : d === 3 ? -1 : 0), j = ny * w + nx;
          if (seen.has(j) || !free(nx, ny)) continue;
          seen.add(j); cells.push(j);
        }
        if (attempt(cells, T.CHASM)) k--;
      }
    }

    // 4. fissures: cracks of the rift that run across rooms. Chasm cracks; molten (lava) cracks where the floor has no water.
    if (c >= 0.2) {
      let water = false;
      for (let i = 0; i < n && !water; i++) if (tiles[i] === T.WATER || tiles[i] === T.DEEP_WATER) water = true;
      const wantN = Math.min(6, 1 + Math.floor(c * 5.2));
      for (let f = 0, guard = 40; f < wantN && guard > 0; guard--) {
        const s = floorCells[(rng.next() * floorCells.length) | 0];
        let x = s % w, y = (s / w) | 0;
        if (!free(x, y)) continue;
        const lava = !water && (ctx.theme === 'inferno' || ctx.theme === 'abyss') && rng.chance(0.35 + c * 0.4);
        const horiz = rng.chance(0.5), sg = rng.chance(0.5) ? 1 : -1, len = rng.int(7, 10 + Math.floor(c * 10));
        const line = [], cells = [];
        for (let step = 0; step < len; step++) {
          if (!free(x, y)) break;
          line.push(y * w + x);
          if (lava) {         // three wide so the middle can go deep
            for (let o = -1; o <= 1; o++) { const px = x + (horiz ? 0 : o), py = y + (horiz ? o : 0); if (free(px, py)) cells.push(py * w + px); }
          } else if (c > 0.5) {
            const px = x + (horiz ? 0 : 1), py = y + (horiz ? 1 : 0);
            cells.push(y * w + x); if (free(px, py) && rng.chance(0.55)) cells.push(py * w + px);
          } else cells.push(y * w + x);
          const r = rng.next();
          if (horiz) { x += sg; if (r < 0.25) y++; else if (r < 0.5) y--; } else { y += sg; if (r < 0.25) x++; else if (r < 0.5) x--; }
        }
        if (line.length < 5) continue;
        const uniq = Array.from(new Set(cells));
        if (!attempt(uniq, lava ? T.LAVA : T.CHASM)) continue;
        let x0 = w, y0 = h, x1 = 0, y1 = 0;
        const flat = [];
        for (const i of line) { const px = i % w, py = (i / w) | 0; x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); flat.push(px, py); }
        ctx.fissures.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, kind: lava ? 'lava' : 'chasm', cells: flat });
        f++;
      }
      gen.deepen(ctx);
    }
  };

  // ---- props --------------------------------------------------------------------------------------------------
  const DECOR_TYPES = { tombstone: 1, pillar: 1, crystal: 1, tree: 1, bones: 1 };

  // H = populate's toolbox. Runs after the ordinary dressing and before monsters are placed.
  gen.corruptDress = function (ctx, H, props) {
    const c = ctx.corruption;
    if (c < 0.04) return;
    const rng = ctx.crng, rift = W.riftInfo(c), rooms = ctx.rooms;
    const lvl = function () { return r3(clamp(c + rng.range(-0.15, 0.15), 0.02, 1)); };
    let reach = 0;
    for (let i = 0; i < ctx.n; i++) if (ctx.dist[i] >= 0) reach++;

    // existing decor takes the rift's colour; torches burn its light
    for (const p of props) {
      if (DECOR_TYPES[p.type] && rng.chance(c * 0.9)) p.corrupt = lvl();
      else if (p.type === 'torch' && c >= 0.3 && rng.chance(c)) { p.corrupt = lvl(); p.tint = rift.glow; }
    }

    // shrines go wrong: a hint to the game that these are bargains, not blessings
    for (const p of props) {
      if (p.type === 'shrine' && p.interact && rng.chance(Math.min(0.9, c * 1.5))) { p.look = 'rift_shrine'; p.corrupt = lvl(); p.shrineKind = 'corrupt'; p.tint = rift.glow; }
    }
    if (c >= 0.3 && ctx.depth >= 4) {
      const cands = rng.shuffle(rooms.filter(function (r) { return r.type === 'normal' && !r.lm && r.w >= 5 && r.h >= 5; }));
      for (let k = 0, made = 0; k < cands.length && made < (c > 0.7 ? 2 : 1); k++) {
        if (!rng.chance(0.5 + c * 0.4)) continue;
        if (H.solidIn(cands[k], 'shrine', { interact: 'shrine', used: false, light: 3, look: 'rift_shrine', corrupt: lvl(), shrineKind: 'corrupt', tint: rift.glow }, false)) made++;
      }
    }

    // growths (solid, glowing) and veins (flat, walked over)
    const spots = rooms.filter(function (r) { return r.type !== 'start' && r.type !== 'lockdown' && r.type !== 'exit' && (r.type !== 'boss' || ctx.isCore); });
    if (!spots.length) return;
    for (let k = Math.min(45, Math.floor(c * reach / 80)), guard = k * 6; k > 0 && guard > 0; guard--) {
      if (H.solidIn(spots[(rng.next() * spots.length) | 0], 'crystal', { light: 2, look: 'growth', corrupt: lvl(), tint: rift.glow }, rng.chance(0.5))) k--;
    }
    for (let k = Math.min(90, Math.floor(c * reach / 28)), guard = k * 5; k > 0 && guard > 0; guard--) {
      if (H.softIn(spots[(rng.next() * spots.length) | 0], 'bones', { look: 'vein', corrupt: lvl(), tint: rift.vein })) k--;
    }
  };

  // Sources the taint pools around.
  gen.taintSources = function (ctx, props) {
    const out = [];
    for (const f of ctx.fissures) for (let k = 0; k < f.cells.length; k += 4) out.push({ x: f.cells[k], y: f.cells[k + 1], r: 4, s: 0.5 });
    for (const p of props) {
      if (p.look === 'growth') out.push({ x: p.x, y: p.y, r: 3, s: 0.45 });
      else if (p.look === 'rift_shrine') out.push({ x: p.x, y: p.y, r: 5, s: 0.6 });
      else if (p.look === 'rift_core') out.push({ x: p.x, y: p.y, r: 9, s: 1 });
    }
    return out;
  };
})();
