// Landmark rooms (CONTRACT R5.10): rare set pieces that make a floor memorable, plus the hidden cache (world pitch).
// Terrain is stamped before liquids are deepened / the shell is built (stampLandmarks, stampCache); props and the
// optional guaranteed elite are placed by populate.js through dressLandmark. Every stamp is validated: if the floor's
// dry ground stops being one piece, the stamp is rolled back and another room is tried.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE;
  const gen = G.world._gen, DRY = gen.DRY;

  const liquidFor = function (ctx) { return ctx.theme === 'inferno' ? T.LAVA : ctx.theme === 'abyss' ? T.CHASM : T.WATER; };
  const soft = function (t) { return t === T.FLOOR || t === T.RUBBLE; };
  const mid = function (r) { return { x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) }; };

  // Island chest in a pool, reached by a short plank walkway (flooded crypt, the forge).
  function moat(ctx, r, lm, liquid, glow) {
    if (r.w < 9 || r.h < 9) return false;
    const rng = ctx.rng, c = mid(r), w = ctx.w;
    const mx = r.x + (r.w - 1) / 2, my = r.y + (r.h - 1) / 2, ax = (r.w - 4) / 2, ay = (r.h - 4) / 2;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const nx = (x - mx) / ax, ny = (y - my) / ay;
        if (nx * nx + ny * ny <= 1.05 && soft(ctx.tiles[y * w + x])) ctx.tiles[y * w + x] = liquid;
      }
    }
    for (let y = c.y - 1; y <= c.y + 1; y++) for (let x = c.x - 1; x <= c.x + 1; x++) ctx.tiles[y * w + x] = T.FLOOR;
    const d = rng.int(0, 3), dx = d === 0 ? 1 : d === 1 ? -1 : 0, dy = d === 2 ? 1 : d === 3 ? -1 : 0;
    let x = c.x + dx * 2, y = c.y + dy * 2, reached = false;
    for (let k = 0; k < 8; k++, x += dx, y += dy) {
      const i = y * w + x;
      if (!gen.LIQUID[ctx.tiles[i]]) { reached = soft(ctx.tiles[i]); break; }
      ctx.tiles[i] = T.BRIDGE; ctx.prot[i] = 1;
    }
    if (!reached) return false;
    lm.pts.push({ x: c.x - dx, y: c.y - dy, k: 'chest' });
    if (ctx.depth >= 8) lm.pts.push({ x: c.x - dx + dy, y: c.y - dy + dx, k: 'chest' });
    if (glow) lm.pts.push({ x: c.x, y: c.y, k: 'glow' });
    return true;
  }

  // A ravine across the room; the bridge that spanned it hangs in two broken stubs. A ledge along one wall remains.
  function brokenSpan(ctx, r, lm) {
    const rng = ctx.rng, w = ctx.w, liquid = liquidFor(ctx);
    const horiz = r.w >= r.h;                           // ravine runs along the short axis
    const len = horiz ? r.h : r.w, across = horiz ? r.w : r.h;
    if (across < 7 || len < 7) return false;
    const flip = rng.chance(0.5), b0 = (horiz ? r.x : r.y) + (across >> 1) - 1;
    const set = function (u, v, t) {                    // u across the ravine, v along it
      const x = horiz ? u : v, y = horiz ? v : u;
      ctx.tiles[y * w + x] = t;
      if (t === T.BRIDGE) ctx.prot[y * w + x] = 1;
    };
    const base = horiz ? r.y : r.x;
    const v0 = flip ? base + 2 : base, v1 = flip ? base + len - 1 : base + len - 3;       // 2-tile ledge on one side
    for (let v = v0; v <= v1; v++) {
      for (let u = b0; u <= b0 + 2; u++) {
        const t = ctx.tiles[(horiz ? v : u) * w + (horiz ? u : v)];
        if (soft(t) || t === T.DOOR || t === T.BRIDGE) set(u, v, liquid);
      }
    }
    const vm = (v0 + v1) >> 1;
    set(b0, vm, T.BRIDGE); set(b0 + 2, vm, T.BRIDGE);
    const px = function (u, v) { return horiz ? { x: u, y: v } : { x: v, y: u }; };
    const chest = px(b0 + 3, vm), bones = px(b0 - 1, vm);
    lm.pts.push({ x: chest.x, y: chest.y, k: 'chest' }, { x: bones.x, y: bones.y, k: 'bones' });
    return true;
  }

  // id → { name, themes, minDepth, w (weight), rooms (room type used), minW/minH, stamp?(ctx, room, lm), dress(H, lm, ctx) }
  const LM = {
    flooded_crypt: { name: 'Flooded Crypt', liquid: 'water', themes: ['crypt'], minDepth: 1, w: 3, rooms: 'normal', minW: 9, minH: 9,
      stamp: function (ctx, r, lm) { return moat(ctx, r, lm, T.WATER, false); } },
    forge_island: { name: 'The Forge', liquid: 'lava', themes: ['inferno', 'abyss'], minDepth: 11, w: 3, rooms: 'normal', minW: 9, minH: 9,
      stamp: function (ctx, r, lm) { return moat(ctx, r, lm, T.LAVA, true); } },
    collapsed_bridge: { name: 'Collapsed Bridge', themes: ['crypt', 'caves', 'inferno', 'abyss'], minDepth: 2, w: 3, rooms: 'normal', minW: 7, minH: 7,
      stamp: brokenSpan },
    bone_garden: { name: 'Bone Garden', themes: ['crypt', 'caves', 'abyss'], minDepth: 1, w: 3, rooms: 'normal', minW: 7, minH: 7,
      dress: function (H, lm) {
        const r = lm.room, rng = H.rng;
        for (let y = r.y + 1; y < r.y + r.h - 1; y += 2) {
          for (let x = r.x + 1 + ((y - r.y) & 2 ? 1 : 0); x < r.x + r.w - 1; x += 2) {
            const roll = rng.next();
            if (roll < 0.4) { if (H.canSolid(x, y)) H.add('tree', x, y, true); }
            else if (roll < 0.72) { if (H.canSolid(x, y)) H.add('tombstone', x, y, true); }
            else if (roll < 0.95) { if (H.canSoft(x, y)) H.add('bones', x, y, false); }
          }
        }
        H.centrepiece(r, 'chest', { interact: 'chest', used: false });
      } },
    chained_arena: { name: 'Chained Arena', themes: ['crypt', 'caves', 'inferno', 'abyss'], minDepth: 3, w: 2, rooms: 'elite', minW: 8, minH: 8,
      dress: function (H, lm) {
        const r = lm.room, rng = H.rng;
        const ring = [[-3, -3], [3, -3], [-3, 3], [3, 3], [0, -3], [0, 3], [-3, 0], [3, 0]];
        rng.shuffle(ring);
        for (let k = 0; k < 6; k++) if (H.canSolid(r.cx + ring[k][0], r.cy + ring[k][1])) H.add('pillar', r.cx + ring[k][0], r.cy + ring[k][1], true);
        for (let k = rng.int(3, 5); k > 0; k--) H.softIn(r, 'bones');
        H.solidIn(r, 'chest', { interact: 'chest', used: false }, true);
        lm.eliteAt = { x: r.cx, y: r.cy };
      } },
    crystal_grotto: { name: 'Crystal Grotto', themes: ['caves', 'abyss'], minDepth: 6, w: 3, rooms: 'normal', minW: 7, minH: 7,
      dress: function (H, lm) {
        const r = lm.room, rng = H.rng, n = rng.int(5, 8), a0 = rng.range(0, 6.28);
        for (let k = 0; k < n; k++) {
          const a = a0 + k * 6.2832 / n, rad = rng.range(2.4, 3.4);
          const x = Math.round(r.cx + Math.cos(a) * rad), y = Math.round(r.cy + Math.sin(a) * rad);
          if (H.canSolid(x, y)) H.add('crystal', x, y, true, { light: 3 });
        }
        H.centrepiece(r, 'shrine', { interact: 'shrine', used: false, light: 3 });
        for (let k = rng.int(1, 2); k > 0; k--) H.solidIn(r, 'chest', { interact: 'chest', used: false }, true);
      } },
    pyre_court: { name: 'Pyre Court', themes: ['inferno', 'abyss'], minDepth: 11, w: 3, rooms: 'normal', minW: 8, minH: 8,
      dress: function (H, lm) {
        const r = lm.room, rng = H.rng, n = rng.int(4, 6), a0 = rng.range(0, 6.28);
        for (let k = 0; k < n; k++) {
          const a = a0 + k * 6.2832 / n;
          const x = Math.round(r.cx + Math.cos(a) * 3), y = Math.round(r.cy + Math.sin(a) * 3);
          if (H.canSolid(x, y)) H.add('campfire', x, y, true, { light: 3 });
        }
        H.centrepiece(r, 'shrine', { interact: 'shrine', used: false, light: 3 });
        H.solidIn(r, 'chest', { interact: 'chest', used: false }, true);
      } },
    // Pitch: a sealed three-by-three closet behind a lone crate. Not a room: carved by stampCache.
    hidden_cache: { name: 'Hidden Cache', themes: [], minDepth: 2, w: 0, rooms: 'normal' },
  };
  gen.LANDMARKS = LM;

  const dryIntact = function (ctx) {
    const dist = gen.flood(ctx, ctx.spawn.x, ctx.spawn.y);
    let reach = 0, dry = 0;
    for (let i = 0; i < ctx.n; i++) { if (DRY[ctx.tiles[i]]) dry++; if (dist[i] >= 0) reach++; }
    return reach === dry && dist[ctx.exit.y * ctx.w + ctx.exit.x] >= 0;
  };

  gen.stampLandmarks = function (ctx) {
    const rng = ctx.rng, depth = ctx.depth, weights = (ctx.variantDef && ctx.variantDef.lm) || {};
    const roll = rng.next();
    const want = depth >= 3 ? (roll < 0.5 ? 0 : roll < 0.88 ? 1 : 2) : (roll < 0.65 ? 0 : 1);
    if (!want) return;
    const dist0 = gen.flood(ctx, ctx.spawn.x, ctx.spawn.y);
    for (let n = 0; n < want; n++) {
      let water = false, lava = false;       // a floor never holds both water and lava
      for (let i = 0; i < ctx.n; i++) { const t = ctx.tiles[i]; if (t === T.WATER) water = true; else if (t === T.LAVA) lava = true; }
      const pool = [];
      for (const id in LM) {
        const d = LM[id];
        if (d.themes.indexOf(ctx.theme) < 0 || depth < d.minDepth) continue;
        if ((d.liquid === 'water' && lava) || (d.liquid === 'lava' && water)) continue;
        if (id === 'collapsed_bridge' && ((ctx.theme === 'inferno') ? water : lava)) continue;
        const w = d.w * (weights[id] === undefined ? 1 : weights[id]);
        if (w > 0) pool.push({ w, id });
      }
      if (!pool.length) return;
      const id = rng.weighted(pool).id, def = LM[id];
      const cands = rng.shuffle(ctx.rooms.filter(function (r) {
        return r.type === def.rooms && !r.lm && r.w >= def.minW && r.h >= def.minH &&
          Math.abs(r.cx - ctx.spawn.x) + Math.abs(r.cy - ctx.spawn.y) > 4 && Math.abs(r.cx - ctx.exit.x) + Math.abs(r.cy - ctx.exit.y) > 4 &&
          (id !== 'chained_arena' || dist0[r.cy * ctx.w + r.cx] >= 14) && ctx.lock[r.cy * ctx.w + r.cx] === 0;
      }));
      for (let t = 0; t < Math.min(4, cands.length); t++) {
        const r = cands[t], before = ctx.tiles.slice(), protBefore = ctx.prot.slice();
        const lm = { id, name: def.name, x: r.x, y: r.y, w: r.w, h: r.h, pts: [], room: r };
        let ok = true;
        if (def.stamp) { ok = def.stamp(ctx, r, lm); if (ok) ok = dryIntact(ctx); }
        if (!ok) { ctx.tiles.set(before); ctx.prot.set(protBefore); continue; }
        r.lm = id;
        ctx.landmarks.push(lm);
        break;
      }
    }
  };

  // Pitch: a hidden cache. A crate sits in a one-tile gap in a room wall; behind it a short passage and a 3x3 closet with
  // a chest. The closet is only reachable once the crate is broken (prop.secret = true marks that crate).
  gen.stampCache = function (ctx) {
    const rng = ctx.rng, w = ctx.w;
    if (ctx.theme === 'abyss' || ctx.depth < 2 || !rng.chance(0.4)) return;
    const cands = rng.shuffle(ctx.rooms.filter(function (r) { return (r.type === 'normal' || r.type === 'elite' || r.type === 'shrine') && !r.lm && r.w >= 5 && r.h >= 5; }));
    for (let t = 0; t < Math.min(14, cands.length); t++) {
      const r = cands[t], d = rng.int(0, 3), dx = d === 0 ? 1 : d === 1 ? -1 : 0, dy = d === 2 ? 1 : d === 3 ? -1 : 0;
      const px = -dy, py = dx;                                           // lateral axis
      let ex, ey;
      if (dx) { ex = dx > 0 ? r.x + r.w - 1 : r.x; ey = rng.int(r.y + 1, r.y + r.h - 2); } else { ey = dy > 0 ? r.y + r.h - 1 : r.y; ex = rng.int(r.x + 1, r.x + r.w - 2); }
      if (ctx.tiles[ey * w + ex] !== T.FLOOR) continue;
      let clear = true;
      for (let k = 1; k <= 6 && clear; k++) {
        for (let l = -2; l <= 2; l++) {
          const x = ex + dx * k + px * l, y = ey + dy * k + py * l;
          if (!gen.inMain(ctx, x, y) || x < 2 || y < 2 || x > ctx.mx1 - 1 || y > ctx.h - 3 || ctx.tiles[y * w + x] !== T.WALL || ctx.lock[y * w + x]) { clear = false; break; }
        }
      }
      if (!clear) continue;
      const at = function (k, l) { return { x: ex + dx * k + px * l, y: ey + dy * k + py * l }; };
      const carve = function (k, l) { const p = at(k, l); ctx.tiles[p.y * w + p.x] = T.FLOOR; ctx.prot[p.y * w + p.x] = 1; };
      carve(1, 0); carve(2, 0);
      for (let k = 3; k <= 5; k++) for (let l = -1; l <= 1; l++) carve(k, l);
      const a = at(1, 0), b = at(5, 1), c = at(3, -1);
      const lm = { id: 'hidden_cache', name: 'Hidden Cache', x: Math.min(a.x, b.x, c.x), y: Math.min(a.y, b.y, c.y), pts: [] };
      lm.w = Math.max(a.x, b.x, c.x) - lm.x + 1; lm.h = Math.max(a.y, b.y, c.y) - lm.y + 1;
      const q = at(1, 0); lm.pts.push({ x: q.x, y: q.y, k: 'mouth' });
      const ch = at(4, 0); lm.pts.push({ x: ch.x, y: ch.y, k: 'chest' });
      for (const l of [-1, 1]) { const p = at(5, l); lm.pts.push({ x: p.x, y: p.y, k: 'barrel' }); }
      const bn = at(3, rng.chance(0.5) ? -1 : 1); lm.pts.push({ x: bn.x, y: bn.y, k: 'bones' });
      r.noLock = true;
      ctx.landmarks.push(lm);
      return;
    }
  };

  // Props for a landmark. H = populate's toolbox: { rng, add, canSolid, canSoft, solidIn, softIn, centrepiece }.
  gen.dressLandmark = function (H, lm) {
    const def = LM[lm.id];
    if (def && def.dress) def.dress(H, lm);
    for (const p of lm.pts) {
      switch (p.k) {
        case 'chest':
          if (lm.id === 'hidden_cache') H.add('chest', p.x, p.y, true, { interact: 'chest', used: false });
          else {
            for (const o of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
              if (H.canSolid(p.x + o[0], p.y + o[1])) { H.add('chest', p.x + o[0], p.y + o[1], true, { interact: 'chest', used: false }); break; }
            }
          }
          break;
        case 'mouth': H.add('crate', p.x, p.y, true, { interact: 'barrel', used: false, secret: true }); break;
        case 'barrel': H.add('barrel', p.x, p.y, true, { interact: 'barrel', used: false }); break;
        case 'glow': if (H.canSolid(p.x, p.y)) H.add('campfire', p.x, p.y, true, { light: 3 }); break;
        case 'bones': if (H.canSoft(p.x, p.y) || lm.id === 'hidden_cache') H.add('bones', p.x, p.y, false); break;
      }
    }
  };
})();
