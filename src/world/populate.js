// Props and monster spawns for a finished dungeon layout.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE;
  const gen = G.world._gen, WALK = gen.DRY;      // dry footing only

  // Per-theme dressing. `solid` decor blocks movement, `soft` decor is walked over.
  const DECOR = {
    crypt:   { solid: ['tombstone', 'tombstone', 'pillar'], soft: ['bones'], torch: 1,    glow: null },
    caves:   { solid: ['crystal', 'crystal', 'pillar'],     soft: ['bones'], torch: 0.5,  glow: 'crystal' },
    inferno: { solid: ['pillar', 'pillar', 'tombstone'],    soft: ['bones'], torch: 1,    glow: 'campfire' },
    abyss:   { solid: ['crystal', 'pillar'],                soft: ['bones'], torch: 0.6,  glow: 'crystal' },
  };
  const TORCH_LIGHT = 4, GLOW_LIGHT = 3;      // `light` = radius in tiles

  gen.populate = function (ctx) {
    const w = ctx.w, h = ctx.h, n = ctx.n, tiles = ctx.tiles, prot = ctx.prot, rng = ctx.rng, rooms = ctx.rooms;
    const depth = ctx.depth, dist = ctx.dist, deco = Object.assign({}, DECOR[ctx.theme] || DECOR.crypt, ctx.variantDef && ctx.variantDef.decor);
    const occ = new Uint8Array(n);            // bit 0: solid prop, bit 1: any prop or spawn
    const props = [], spawns = [], torches = [];
    const startRoom = rooms.find(function (r) { return r.type === 'start'; });
    const arena = rooms.find(function (r) { return r.type === 'boss'; });
    const bossExit = ctx.isBoss ? rooms.find(function (r) { return r.type === 'exit'; }) : null;
    const inLockdown = function (x, y, pad) {
      for (const r of rooms) if (r.type === 'lockdown' && x >= r.x - pad && y >= r.y - pad && x < r.x + r.w + pad && y < r.y + r.h + pad) return true;
      return false;
    };
    // First free tile for a centrepiece, spiralling out from the room's anchor.
    const centrepiece = function (r, type, extra) {
      for (let rad = 0; rad <= 2; rad++) {
        for (let oy = -rad; oy <= rad; oy++) {
          for (let ox = -rad; ox <= rad; ox++) {
            if (Math.max(Math.abs(ox), Math.abs(oy)) === rad && inRect(r, r.cx + ox, r.cy + oy, 0) && canSolid(r.cx + ox, r.cy + oy)) return add(type, r.cx + ox, r.cy + oy, true, extra);
          }
        }
      }
      return null;
    };

    const inRect = function (r, x, y, pad) {
      return !!r && x >= r.x - pad && y >= r.y - pad && x < r.x + r.w + pad && y < r.y + r.h + pad;
    };
    const nearWall = function (x, y, wallOnly) {
      for (let k = 0; k < 4; k++) {
        const t = gen.at(ctx, x + (k === 0 ? 1 : k === 1 ? -1 : 0), y + (k === 2 ? 1 : k === 3 ? -1 : 0));
        if (wallOnly ? t === T.WALL : !WALK[t]) return true;
      }
      return false;
    };
    const canSolid = function (x, y) {
      if (!gen.interior(ctx, x, y)) return false;
      const i = y * w + x;
      return tiles[i] === T.FLOOR && dist[i] >= 0 && !prot[i] && !occ[i] &&
        gen.ringOK(tiles, w, h, occ, x, y) && gen.ringOK(tiles, w, h, occ, x, y, C.WALKABLE);     // neither the dry nor the wading route may be cut
    };
    const canSoft = function (x, y) {
      if (!gen.interior(ctx, x, y)) return false;
      const i = y * w + x;
      return (tiles[i] === T.FLOOR || tiles[i] === T.RUBBLE) && dist[i] >= 0 && !occ[i];
    };
    const add = function (type, x, y, solid, extra) {
      const p = { type, x, y, solid };
      if (extra) Object.assign(p, extra);
      props.push(p);
      occ[y * w + x] |= solid ? 3 : 2;
      if (solid && p.interact) {            // keep the tiles you stand on to use it free
        if (x > 0) prot[y * w + x - 1] = 1;
        if (x < w - 1) prot[y * w + x + 1] = 1;
        if (y > 0) prot[(y - 1) * w + x] = 1;
        if (y < h - 1) prot[(y + 1) * w + x] = 1;
      }
      return p;
    };
    // Random tile in a room passing `test`, optionally hugging a wall.
    const findIn = function (r, test, hugWall, tries) {
      for (let t = 0; t < tries; t++) {
        const x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1);
        if (hugWall && !nearWall(x, y, false)) continue;
        if (test(x, y)) return { x, y };
      }
      return null;
    };
    const solidIn = function (r, type, extra, hugWall) {
      const p = findIn(r, canSolid, hugWall, 30);
      return p ? add(type, p.x, p.y, true, extra) : null;
    };
    const softIn = function (r, type, extra) {
      const p = findIn(r, canSoft, false, 12);
      return p ? add(type, p.x, p.y, false, extra) : null;
    };
    const breakable = function () { return { interact: 'barrel', used: false }; };
    const cluster = function (r) {
      const first = findIn(r, canSolid, true, 30);
      if (!first) return;
      const cells = [first];
      add(rng.chance(0.65) ? 'barrel' : 'crate', first.x, first.y, true, breakable());
      for (let k = rng.int(1, 4), guard = 20; k > 0 && guard > 0; guard--) {
        const c = rng.pick(cells), d = rng.int(0, 3);
        const x = c.x + (d === 0 ? 1 : d === 1 ? -1 : 0), y = c.y + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (!inRect(r, x, y, 0) || !canSolid(x, y)) continue;
        add(rng.chance(0.65) ? 'barrel' : 'crate', x, y, true, breakable());
        cells.push({ x, y });
        k--;
      }
    };
    const torchOK = function (x, y, gap) {
      for (const t of torches) if (Math.abs(t.x - x) + Math.abs(t.y - y) < gap) return false;
      return true;
    };
    const torch = function (x, y) {
      add('torch', x, y, false, { light: TORCH_LIGHT });
      torches.push({ x, y });
    };
    const roomTorches = function (r, count) {
      for (let t = 0; t < count * 14 && count > 0; t++) {
        const x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1);
        if (!canSoft(x, y) || tiles[y * w + x] !== T.FLOOR || !nearWall(x, y, true) || !torchOK(x, y, 4)) continue;
        torch(x, y);
        count--;
      }
    };
    const glow = function (r, count) {       // light sources for themes with few walls
      if (!deco.glow) return;
      for (; count > 0; count--) solidIn(r, deco.glow, { light: GLOW_LIGHT }, true);
    };

    // ---- landmarks first, so their set pieces get the room to themselves ------------------------------------------
    const H = { rng, add, canSolid, canSoft, solidIn, softIn, centrepiece };
    for (const lm of ctx.landmarks) gen.dressLandmark(H, lm);

    // ---- the chute (R8.1): one per floor, solid, on the open tile nearest the centre of the walkable area ------------
    const exitRoom = rooms.find(function (r) { return r.type === 'exit'; });
    {
      let sx = 0, sy = 0, cnt = 0;
      for (let i = 0; i < n; i++) if (dist[i] >= 0) { sx += i % w; sy += (i / w) | 0; cnt++; }
      const mx = sx / cnt, my = sy / cnt;
      let best = null, bd = Infinity;
      for (let y = 2; y < h - 2; y++) {
        for (let x = 2; x < w - 2; x++) {
          const d = (x - mx) * (x - mx) + (y - my) * (y - my);
          if (d >= bd || !canSolid(x, y)) continue;
          if (inRect(startRoom, x, y, 1) || inRect(arena, x, y, 1) || inRect(exitRoom, x, y, 1) || inLockdown(x, y, 1)) continue;
          if (ctx.landmarks.some(function (lm) { return inRect(lm, x, y, 1); })) continue;
          best = { x, y }; bd = d;
        }
      }
      if (best) add('chute', best.x, best.y, true, { interact: 'chute', used: false });
    }

    // ---- props, room by room -----------------------------------------------------------------------------
    for (const r of rooms) {
      const area = r.w * r.h;
      const nTorch = Math.max(1, Math.round(Math.min(6, (r.w + r.h) / 5) * deco.torch));
      if (r.lm) { roomTorches(r, nTorch); continue; }
      switch (r.type) {
        case 'boss': {
          for (let k = 0; k < 4; k++) {
            const x = r.cx + (k & 1 ? 4 : -4), y = r.cy + (k & 2 ? 3 : -3);
            if (canSolid(x, y)) add(ctx.theme === 'crypt' || ctx.theme === 'inferno' ? 'pillar' : 'crystal', x, y, true,
              ctx.theme === 'crypt' || ctx.theme === 'inferno' ? null : { light: GLOW_LIGHT });
          }
          for (let k = rng.int(3, 6); k > 0; k--) softIn(r, 'bones');
          roomTorches(r, 6);
          break;
        }
        case 'lockdown': {       // sealed-room event: nothing but the locked prize and some atmosphere
          if (!centrepiece(r, 'chest', { interact: 'chest', used: false, locked: true })) {
            r.type = 'normal'; delete r.doors; delete r.waves;      // could not place the prize: plain room after all
            break;
          }
          for (let k = rng.int(2, 5); k > 0; k--) softIn(r, 'bones');
          roomTorches(r, nTorch + 1);
          break;
        }
        case 'shrine': {
          if (!centrepiece(r, 'shrine', { interact: 'shrine', used: false, light: GLOW_LIGHT })) solidIn(r, 'shrine', { interact: 'shrine', used: false, light: GLOW_LIGHT }, false);
          softIn(r, 'bones');
          roomTorches(r, nTorch);
          break;
        }
        case 'treasure': {
          for (let k = 2 + (depth >= 8 ? 1 : 0) + (rng.chance(0.4) ? 1 : 0); k > 0; k--) {
            solidIn(r, 'chest', { interact: 'chest', used: false }, true);
          }
          cluster(r);
          if (rng.chance(0.6)) cluster(r);
          glow(r, 1);
          roomTorches(r, nTorch + 1);
          break;
        }
        case 'elite': {
          for (let k = rng.int(2, 4); k > 0; k--) softIn(r, 'bones');
          for (let k = rng.int(1, 3); k > 0; k--) solidIn(r, rng.pick(deco.solid), null, rng.chance(0.5));
          if (rng.chance(0.35)) solidIn(r, 'chest', { interact: 'chest', used: false }, true);
          roomTorches(r, nTorch);
          break;
        }
        case 'start':
        case 'exit':
          roomTorches(r, Math.max(2, nTorch));
          glow(r, 1);
          if (rng.chance(0.5)) softIn(r, 'bones');
          break;
        default: {
          if (rng.chance(0.14)) solidIn(r, 'chest', { interact: 'chest', used: false }, true);
          if (rng.chance(0.45)) cluster(r);
          for (let k = rng.int(0, 1 + Math.floor(area / 45)); k > 0; k--) solidIn(r, rng.pick(deco.solid), null, rng.chance(0.6));
          for (let k = rng.int(0, 3); k > 0; k--) softIn(r, rng.pick(deco.soft));
          if (rng.chance(0.3)) glow(r, 1);
          roomTorches(r, nTorch);
        }
      }
    }

    // ---- passages and open ground between rooms ----------------------------------------------------------
    let reach = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (dist[i] < 0) continue;
        reach++;
        if (prot[i] && tiles[i] === T.FLOOR && !occ[i] && rng.chance(0.08 * deco.torch) && nearWall(x, y, true) && torchOK(x, y, 7)) torch(x, y);
      }
    }
    for (let k = Math.floor(reach / 110), guard = 400; k > 0 && guard > 0; guard--) {
      const x = rng.int(1, w - 2), y = rng.int(1, h - 2);
      if (inRect(arena, x, y, 0) || inRect(startRoom, x, y, 1) || inLockdown(x, y, 1)) continue;
      const roll = rng.next();
      if (roll < 0.5) { if (!canSoft(x, y)) continue; add(rng.pick(deco.soft), x, y, false); }
      else if (roll < 0.85) { if (!canSolid(x, y)) continue; add(rng.pick(deco.solid), x, y, true, null); }
      else { if (!canSolid(x, y) || !nearWall(x, y, false)) continue; add(rng.chance(0.6) ? 'barrel' : 'crate', x, y, true, breakable()); }
      k--;
    }

    // ---- the rift core (final floor): a ring of rift crystals round the arena, the heart behind it ----------------
    if (ctx.isCore && arena && bossExit) {
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + Math.PI / 8;
        const x = Math.round(arena.cx + Math.cos(a) * 6.6), y = Math.round(arena.cy + Math.sin(a) * 6.6);
        if (canSolid(x, y)) add('crystal', x, y, true, { light: 4, look: 'rift_crystal', corrupt: 1, tint: '#ff70f0' });
      }
      let best = null, bd = -1;
      for (const o of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const x = bossExit.cx + o[0], y = bossExit.cy + o[1], d = Math.hypot(x - arena.cx, y - arena.cy);
        if (canSolid(x, y) && d > bd) { bd = d; best = { x, y }; }
      }
      if (best) add('crystal', best.x, best.y, true, { interact: 'rift_core', used: false, light: 6, look: 'rift_core', corrupt: 1, tint: '#ff70f0' });
    }
    gen.corruptDress(ctx, { rng, add, canSolid, canSoft, solidIn, softIn, centrepiece }, props);

    // ---- cleansed act (R7.7): a friendly camp — fire, refugees, sometimes a merchant ----------------------------
    const camps = [];
    if (ctx.cleansed) {
      const cands = rng.shuffle(rooms.filter(function (r) { return r.type === 'normal' && !r.lm && r.w >= 5 && r.h >= 5 && !inRect(startRoom, r.cx, r.cy, 3); }));
      for (const r of cands) {
        if (camps.length >= (rng.chance(0.3) ? 2 : 1)) break;
        const fire = solidIn(r, 'campfire', { light: 4 }, false);
        if (!fire) continue;
        const roles = ['refugee', 'refugee'];
        if (rng.chance(0.4)) roles.push('camp_merchant');
        let placed = 0;
        for (const role of roles) {
          for (let t = 0; t < 40; t++) {
            const x = fire.x + rng.int(-2, 2), y = fire.y + rng.int(-2, 2);
            if (!inRect(r, x, y, 0) || !canSoft(x, y) || tiles[y * w + x] !== T.FLOOR || dist[y * w + x] < 10) continue;
            spawns.push({ x, y, kind: 'npc', role, camp: true });
            occ[y * w + x] |= 2;
            placed++;
            break;
          }
        }
        camps.push({ x: r.x, y: r.y, w: r.w, h: r.h, fire: { x: fire.x, y: fire.y }, npcs: placed });
      }
    }

    // ---- monsters ----------------------------------------------------------------------------------------
    // Budget counts every pack member; an elite is costed at 3 (leader + whatever retinue the game adds).
    let left = Math.round(Math.min(68, 26 + depth * 2) * (ctx.isBoss ? 0.85 : 1) * (ctx.cleansed ? 0.5 : 1));
    const pMin = 2 + Math.min(2, Math.floor(depth / 8)), pMax = Math.min(7, 4 + Math.floor(depth / 5));
    const spawnable = function (x, y) {
      if (!gen.interior(ctx, x, y)) return false;
      const i = y * w + x, t = tiles[i];
      if (t !== T.FLOOR && t !== T.RUBBLE) return false;
      if (occ[i] || dist[i] < 10) return false;
      for (const lm of ctx.landmarks) if (lm.id === 'hidden_cache' && inRect(lm, x, y, 1)) return false;
      return !inRect(startRoom, x, y, 2) && !inRect(arena, x, y, 1) && !inRect(bossExit, x, y, 1) && !inLockdown(x, y, 1);
    };
    const clearOf = function (x, y, gap) {
      for (const s of spawns) if ((s.x - x) * (s.x - x) + (s.y - y) * (s.y - y) < gap * gap) return false;
      return true;
    };
    const put = function (x, y, kind, count) {
      const s = { x, y, kind };
      if (count) s.count = count;
      spawns.push(s);
      occ[y * w + x] |= 2;
    };
    const pack = function (x, y) {
      const c = Math.min(left, rng.int(pMin, pMax));
      if (c <= 0) return;
      if (c === 1) put(x, y, 'monster'); else put(x, y, 'pack', c);
      left -= c;
    };
    const spotIn = function (r, gap) {
      return findIn(r, function (x, y) { return spawnable(x, y) && clearOf(x, y, gap); }, false, 40);
    };

    if (arena) {
      let bx = arena.cx, by = arena.cy;
      if (occ[by * w + bx] || !WALK[tiles[by * w + bx]]) {
        const p = findIn(arena, function (x, y) { return canSoft(x, y); }, false, 60);
        if (p) { bx = p.x; by = p.y; }
      }
      put(bx, by, 'boss');
      left -= 1;
    }

    let elites = Math.min(5, 1 + Math.floor(depth / 4)) - (ctx.cleansed ? 1 : 0);
    for (const lm of ctx.landmarks) {         // chained arena: a guaranteed elite on the central tile
      if (!lm.eliteAt) continue;
      const i = lm.eliteAt.y * w + lm.eliteAt.x;
      if (occ[i] || (tiles[i] !== T.FLOOR && tiles[i] !== T.RUBBLE) || dist[i] < 10) { lm.eliteAt = null; continue; }
      put(lm.eliteAt.x, lm.eliteAt.y, 'elite');
      elites--; left -= 3;
    }
    const order = rng.shuffle(rooms.slice());
    for (const r of order) {
      if (r.type !== 'elite' || r.lm || elites <= 0 || left < 3) continue;
      const p = spotIn(r, 3);
      if (!p) continue;
      put(p.x, p.y, 'elite');
      elites--; left -= 3;
    }
    for (const r of order) {
      if (left <= 0) break;
      if (r.type === 'start' || r.type === 'boss' || r.type === 'lockdown' || r === bossExit) continue;
      const packsHere = r.w * r.h > 80 && rng.chance(0.5) ? 2 : 1;
      for (let k = 0; k < packsHere && left > 0; k++) {
        const p = spotIn(r, 4);
        if (p) pack(p.x, p.y);
      }
    }
    // Remaining elites and packs roam the passages and open ground, kept apart from everything else.
    const free = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (spawnable(x, y)) free.push(y * w + x);
    rng.shuffle(free);
    for (const i of free) {
      if (left <= 0) break;
      const x = i % w, y = (i / w) | 0;
      if (!clearOf(x, y, 7)) continue;
      if (elites > 0 && left >= 3 && dist[i] > 25) { put(x, y, 'elite'); elites--; left -= 3; continue; }
      if (rng.chance(0.15)) { put(x, y, 'monster'); left -= 1; } else pack(x, y);
    }

    return { props, spawns, camps };
  };
})();
