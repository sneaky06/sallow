// Layout styles (CONTRACT R5.10). Each carves ctx.tiles inside the main area and fills ctx.rooms (untyped — dungeon.js
// picks start/exit/treasure/... afterwards). A variant (variants.js) names which layout a floor uses.
//   crypt:   ossuary_halls · collapsed_catacomb · flooded_crypt
//   caves:   caverns · warrens · underground_lake
//   inferno: broken_halls · magma_flows · ash_fields
//   abyss:   floating_chambers · scattered_isles · shattered_spire
//   abyss, depth 21+ (blends the other themes): fallen_cathedral (crypt) · cinder_isles (inferno) · hollow_grove (caves)
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE;
  const gen = G.world._gen, L = gen.layouts;

  // ---- shared pieces ------------------------------------------------------------------------------------

  // Rectangular rooms joined by corridors. o: { target, bigP, rw:[a,b], rh:[a,b], gap, cw, doorP, decorate, after }
  function rectRooms(ctx, o) {
    const rng = ctx.rng, rooms = ctx.rooms, x1 = ctx.mx1, y1 = ctx.h - 2;
    for (let tries = 0; tries < 700 && rooms.length < o.target; tries++) {
      const big = rng.chance(o.bigP);
      const rw = big ? rng.int(10, 13) : rng.int(o.rw[0], o.rw[1]), rh = big ? rng.int(8, 11) : rng.int(o.rh[0], o.rh[1]);
      if (x1 - rw < 2 || y1 - rh < 2) continue;
      const rx = rng.int(2, x1 - rw), ry = rng.int(2, y1 - rh);
      let clash = false;
      for (const r of rooms) {
        if (rx < r.x + r.w + o.gap && rx + rw + o.gap > r.x && ry < r.y + r.h + o.gap && ry + rh + o.gap > r.y) { clash = true; break; }
      }
      if (!clash) rooms.push(gen.room(rx, ry, rw, rh));
    }
    for (const r of rooms) gen.rect(ctx, r.x, r.y, r.w, r.h, T.FLOOR);
    if (o.decorate) o.decorate(ctx, rooms);
    for (const e of gen.graph(rng, rooms, o.extraP || 0.22, 20)) {
      const a = rooms[e[0]], b = rooms[e[1]];
      gen.corridor(ctx, a.cx, a.cy, b.cx, b.cy, o.cw || 1, T.FLOOR, rng.chance(0.5));
    }
    // A corridor that crosses a room's wall ring through a 1-wide gap becomes a door.
    const door = function (x, y, ax, ay) {
      if (gen.at(ctx, x, y) !== T.FLOOR) return;
      if (gen.at(ctx, x - ax, y - ay) !== T.WALL || gen.at(ctx, x + ax, y + ay) !== T.WALL) return;
      if (!gen.walk(ctx, x + ay, y + ax) || !gen.walk(ctx, x - ay, y - ax)) return;
      if (rng.chance(o.doorP)) gen.set(ctx, x, y, T.DOOR);
      ctx.prot[y * ctx.w + x] = 1;
    };
    for (const r of rooms) {
      for (let x = r.x; x < r.x + r.w; x++) { door(x, r.y - 1, 1, 0); door(x, r.y + r.h, 1, 0); }
      for (let y = r.y; y < r.y + r.h; y++) { door(r.x - 1, y, 0, 1); door(r.x + r.w, y, 0, 1); }
    }
    if (o.after) o.after(ctx, rooms);
  }

  // ---- crypt ----------------------------------------------------------------------------------------------
  L.ossuary_halls = function (ctx) {
    rectRooms(ctx, { target: 9 + Math.min(6, ctx.depth >> 1) + ctx.rng.int(0, 3), bigP: 0.15, rw: [5, 9], rh: [5, 8], gap: 3, doorP: 0.8 });
  };

  // Cave-ins and breached walls: small rooms, wide ragged tunnels, rubble, few doors.
  L.collapsed_catacomb = function (ctx) {
    const rng = ctx.rng, w = ctx.w, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    rectRooms(ctx, {
      target: 12 + Math.min(5, ctx.depth >> 1) + rng.int(0, 3), bigP: 0.1, rw: [5, 8], rh: [5, 7], gap: 2, doorP: 0.25, extraP: 0.3,
      cw: rng.chance(0.5) ? 2 : 1,
      decorate: function (c, rooms) {
        for (const r of rooms) {
          for (let k = rng.int(0, 2); k > 0; k--) {       // a ceiling came down
            gen.blob(c, rng.int(r.x + 1, r.x + r.w - 2), rng.int(r.y + 1, r.y + r.h - 2), rng.int(3, 8), rng.chance(0.4) ? T.WALL : T.RUBBLE, T.FLOOR);
          }
        }
      },
      after: function () {
        const src = tiles.slice();      // erosion: breaches in the walls, rubble on the floor
        for (let y = 2; y < y1; y++) {
          for (let x = 2; x < x1; x++) {
            const i = y * w + x;
            if (src[i] === T.WALL) {
              const open = src[i - 1] === T.FLOOR || src[i + 1] === T.FLOOR || src[i - w] === T.FLOOR || src[i + w] === T.FLOOR;
              if (open && rng.chance(0.12)) tiles[i] = rng.chance(0.5) ? T.RUBBLE : T.FLOOR;
            } else if (src[i] === T.FLOOR && rng.chance(0.05)) tiles[i] = T.RUBBLE;
          }
        }
      },
    });
  };

  // Half the rooms stand in black water; connectivity repair lays plank walkways over it.
  L.flooded_crypt = function (ctx) {
    const rng = ctx.rng;
    rectRooms(ctx, {
      target: 9 + Math.min(5, ctx.depth >> 1) + rng.int(0, 3), bigP: 0.22, rw: [6, 10], rh: [6, 9], gap: 3, doorP: 0.7,
      after: function (c, rooms) {
        for (const r of rooms) {
          if (!rng.chance(0.65)) continue;
          gen.blob(c, r.cx, r.cy, Math.round(r.w * r.h * rng.range(0.35, 0.6)), T.WATER, T.FLOOR);
        }
      },
    });
  };

  // ---- caves ----------------------------------------------------------------------------------------------
  function cellular(ctx, fillP, iters) {
    const rng = ctx.rng, w = ctx.w, n = ctx.n, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    let a = new Uint8Array(n).fill(1), b = new Uint8Array(n).fill(1);
    for (let y = 2; y < y1; y++) for (let x = 2; x < x1; x++) a[y * w + x] = rng.chance(fillP) ? 1 : 0;
    for (let it = 0; it < iters; it++) {
      for (let y = 2; y < y1; y++) {
        for (let x = 2; x < x1; x++) {
          const i = y * w + x;
          const cnt = a[i - w - 1] + a[i - w] + a[i - w + 1] + a[i - 1] + a[i] + a[i + 1] + a[i + w - 1] + a[i + w] + a[i + w + 1];
          b[i] = cnt >= 5 ? 1 : 0;
        }
      }
      const t = a; a = b; b = t;
    }
    for (let y = 2; y < y1; y++) for (let x = 2; x < x1; x++) if (!a[y * w + x]) tiles[y * w + x] = T.FLOOR;
  }

  // Pools, each crossed by a plank bridge where the far bank lines up. Small ones stay shallow fords.
  function pools(ctx, count, sizeLo, sizeHi) {
    const rng = ctx.rng, w = ctx.w, x1 = ctx.mx1, y1 = ctx.h - 2;
    for (let p = 0; p < count; p++) {
      let cells = [];
      for (let t = 0; t < 30 && !cells.length; t++) {
        cells = gen.blob(ctx, rng.int(3, x1 - 2), rng.int(3, y1 - 2), rng.int(sizeLo, sizeHi), T.WATER, T.FLOOR);
      }
      if (cells.length < 6) continue;
      let sx = 0, sy = 0;
      for (const c of cells) { sx += c % w; sy += (c / w) | 0; }
      sx /= cells.length; sy /= cells.length;
      let mid = cells[0], md = Infinity;
      for (const c of cells) {
        const d = Math.abs((c % w) - sx) + Math.abs(((c / w) | 0) - sy);
        if (d < md) { md = d; mid = c; }
      }
      bridge(ctx, mid % w, (mid / w) | 0, T.WATER, 14, rng.chance(0.5));
    }
  }

  // Caves have no walls to define rooms: the widest clearings become pseudo-rooms.
  function clearingRooms(ctx) {
    const rng = ctx.rng, w = ctx.w, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    ctx.afterConnect = function () {
      const cands = [];
      for (let y = 3; y < y1 - 1; y++) {
        for (let x = 3; x < x1 - 1; x++) {
          if (tiles[y * w + x] !== T.FLOOR) continue;
          let open = 0;
          for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if (gen.walk(ctx, x + ox, y + oy)) open++;
          if (open >= 22) cands.push(y * w + x);
        }
      }
      rng.shuffle(cands);
      let found = 0;
      for (const c of cands) {
        if (found >= 12) break;
        const x = c % w, y = (c / w) | 0;
        let ok = true;
        for (const r of ctx.rooms) {
          const dx = r.cx - x, dy = r.cy - y;
          if (dx * dx + dy * dy < 121) { ok = false; break; }
        }
        if (!ok) continue;
        const r = gen.room(x - 3, y - 3, 7, 7);
        r.cx = x; r.cy = y;
        ctx.rooms.push(r);
        found++;
      }
    };
  }

  L.caverns = function (ctx) {
    cellular(ctx, 0.45, 5);
    pools(ctx, ctx.rng.int(3, 6), 16, 54);
    clearingRooms(ctx);
  };

  // Wander a 1-2 wide tunnel from (x0,y0) to (x1,y1): biased random walk, never a straight line.
  function wobble(ctx, x0, y0, x1, y1, width) {
    const rng = ctx.rng;
    let x = x0, y = y0;
    for (let s = 0; s < 600 && (x !== x1 || y !== y1); s++) {
      for (let k = 0; k < width; k++) gen.dig(ctx, x + k, y, T.FLOOR), gen.dig(ctx, x, y + k, T.FLOOR);
      const dx = x1 - x, dy = y1 - y;
      if (rng.chance(0.62)) {
        if (Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && rng.chance(0.5))) x += Math.sign(dx); else y += Math.sign(dy);
      } else if (rng.chance(0.5)) x += rng.chance(0.5) ? 1 : -1; else y += rng.chance(0.5) ? 1 : -1;
      x = Math.max(2, Math.min(ctx.mx1 - 1, x)); y = Math.max(2, Math.min(ctx.h - 3, y));
    }
    gen.dig(ctx, x1, y1, T.FLOOR);
  }

  // Many small chambers, tight twisting tunnels.
  L.warrens = function (ctx) {
    const rng = ctx.rng, rooms = ctx.rooms, x1 = ctx.mx1, y1 = ctx.h - 2;
    const target = rng.int(15, 20);
    for (let tries = 0; tries < 500 && rooms.length < target; tries++) {
      const R = rng.int(3, 5), cx = rng.int(R + 3, x1 - R - 2), cy = rng.int(R + 3, y1 - R - 2);
      let ok = true;
      for (const r of rooms) if ((r.cx - cx) * (r.cx - cx) + (r.cy - cy) * (r.cy - cy) < (R + 4 + (r.w >> 1)) * (R + 4 + (r.w >> 1))) { ok = false; break; }
      if (!ok) continue;
      for (let y = cy - R; y <= cy + R; y++) {
        for (let x = cx - R; x <= cx + R; x++) {
          const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (d <= R * R + (rng.chance(0.5) ? 1 : -2)) gen.set(ctx, x, y, T.FLOOR);
        }
      }
      const r = gen.room(cx - R, cy - R, 2 * R + 1, 2 * R + 1);
      r.cx = cx; r.cy = cy;
      rooms.push(r);
    }
    for (const e of gen.graph(rng, rooms, 0.4, 26)) {
      const a = rooms[e[0]], b = rooms[e[1]];
      wobble(ctx, a.cx, a.cy, b.cx, b.cy, rng.chance(0.2) ? 2 : 1);
    }
    pools(ctx, rng.int(1, 3), 8, 24);
  };

  // Cavern shell around one enormous lake; walkways and shores are the only way round.
  L.underground_lake = function (ctx) {
    const rng = ctx.rng, x1 = ctx.mx1, y1 = ctx.h - 2;
    cellular(ctx, 0.43, 5);
    for (let k = 0; k < 2; k++) {
      let cells = [];
      for (let t = 0; t < 40 && cells.length < 90; t++) {
        const c = gen.blob(ctx, rng.int(10, x1 - 10), rng.int(10, y1 - 10), rng.int(k ? 70 : 220, k ? 130 : 320), T.WATER, T.FLOOR);
        if (c.length > cells.length) cells = c;
      }
      for (let t = 0; t < 3 && cells.length; t++) {
        const c = rng.pick(cells);
        bridge(ctx, c % ctx.w, (c / ctx.w) | 0, T.WATER, 24, rng.chance(0.5));
      }
    }
    pools(ctx, rng.int(1, 3), 10, 30);
    clearingRooms(ctx);
  };

  // Lay a straight bridge through liquid tile (x, y) if both banks are walkable. Tries one axis, then the other.
  function bridge(ctx, x, y, liquid, maxLen, horizFirst) {
    for (let pass = 0; pass < 2; pass++) {
      const hz = (pass === 0) === horizFirst, dx = hz ? 1 : 0, dy = hz ? 0 : 1;
      let a = 0, b = 0;
      while (gen.at(ctx, x - (a + 1) * dx, y - (a + 1) * dy) === liquid) a++;
      while (gen.at(ctx, x + (b + 1) * dx, y + (b + 1) * dy) === liquid) b++;
      if (a + b + 1 > maxLen) continue;
      const e0 = gen.at(ctx, x - (a + 1) * dx, y - (a + 1) * dy), e1 = gen.at(ctx, x + (b + 1) * dx, y + (b + 1) * dy);
      if ((e0 !== T.FLOOR && e0 !== T.RUBBLE) || (e1 !== T.FLOOR && e1 !== T.RUBBLE)) continue;
      for (let k = -a; k <= b; k++) {
        const i = (y + k * dy) * ctx.w + x + k * dx;
        ctx.tiles[i] = T.BRIDGE;
        ctx.prot[i] = 1;
      }
      ctx.prot[(y - (a + 1) * dy) * ctx.w + x - (a + 1) * dx] = 1;
      ctx.prot[(y + (b + 1) * dy) * ctx.w + x + (b + 1) * dx] = 1;
      return true;
    }
    return false;
  }

  // ---- inferno --------------------------------------------------------------------------------------------
  // o: { skip, collapse, dividers, erodeWall, erodeFloor, rivers:[lo,hi], riverWide, lakes:[lo,hi], bridges, cw:[a,b] }
  function infernoBuild(ctx, o) {
    const rng = ctx.rng, rooms = ctx.rooms, w = ctx.w, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    const cell = rng.int(14, 17);
    const cols = Math.max(2, Math.floor((x1 - 1) / cell)), rows = Math.max(2, Math.floor((y1 - 1) / cell));
    const cw = (x1 - 2) / cols, ch = (y1 - 2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rooms.length >= 3 && rng.chance(o.skip)) continue;
        const maxW = Math.floor(cw) - 3, maxH = Math.floor(ch) - 3;
        const rw = rng.int(Math.max(6, maxW - 5), maxW), rh = rng.int(Math.max(6, maxH - 5), maxH);
        const rx = 2 + Math.floor(c * cw) + rng.int(0, maxW - rw), ry = 2 + Math.floor(r * ch) + rng.int(0, maxH - rh);
        rooms.push(gen.room(rx, ry, rw, rh));
      }
    }
    for (const r of rooms) {
      gen.rect(ctx, r.x, r.y, r.w, r.h, T.FLOOR);
      if (rng.chance(o.collapse)) {                 // collapsed corner
        const kw = rng.int(2, 3), kh = rng.int(2, 3);
        gen.rect(ctx, rng.chance(0.5) ? r.x : r.x + r.w - kw, rng.chance(0.5) ? r.y : r.y + r.h - kh, kw, kh, T.WALL);
      }
      if (r.w >= 9 && rng.chance(o.dividers)) {     // remains of a dividing wall
        const x = r.x + (rng.chance(0.5) ? 2 : r.w - 3);
        for (let y = r.y + 1; y < r.y + r.h - 1; y++) gen.set(ctx, x, y, rng.chance(0.55) ? T.WALL : T.RUBBLE);
      }
    }
    for (const e of gen.graph(rng, rooms, 0.3, cell * 1.7)) {
      const a = rooms[e[0]], b = rooms[e[1]];
      gen.corridor(ctx, a.cx, a.cy, b.cx, b.cy, rng.int(o.cw[0], o.cw[1]), T.FLOOR, rng.chance(0.5));
    }
    // Erosion: walls crumble into rubble, floors crack.
    const src = tiles.slice();
    for (let y = 2; y < y1; y++) {
      for (let x = 2; x < x1; x++) {
        const i = y * w + x;
        if (src[i] === T.WALL) {
          const open = src[i - 1] === T.FLOOR || src[i + 1] === T.FLOOR || src[i - w] === T.FLOOR || src[i + w] === T.FLOOR;
          if (open && rng.chance(o.erodeWall)) tiles[i] = T.RUBBLE;
        } else if (src[i] === T.FLOOR && rng.chance(o.erodeFloor)) tiles[i] = T.RUBBLE;
      }
    }
    // Lava rivers run edge to edge and swallow whatever is in the way; connectAll bridges them afterwards.
    const rivers = rng.int(o.rivers[0], o.rivers[1]);
    for (let k = 0; k < rivers; k++) {
      const vert = rng.chance(0.5);
      const lim = vert ? x1 : y1, len = vert ? y1 : x1;
      let p = rng.range(6, lim - 6), drift = 0;
      for (let s = 1; s <= len; s++) {
        drift = Math.max(-1, Math.min(1, drift + rng.range(-0.4, 0.4)));
        p = Math.max(2, Math.min(lim - 6, p + drift));
        const wid = rng.chance(0.3) ? o.riverWide + 1 : o.riverWide;      // 1-tile shallow banks around a deep channel
        for (let j = 0; j < wid; j++) {
          const x = vert ? Math.round(p) + j : s, y = vert ? s : Math.round(p) + j;
          if (gen.inMain(ctx, x, y)) tiles[y * w + x] = T.LAVA;
        }
      }
    }
    for (let k = rng.int(o.lakes[0], o.lakes[1]); k > 0; k--) {
      const r = rng.pick(rooms);
      gen.blob(ctx, rng.int(r.x + 1, r.x + r.w - 2), rng.int(r.y + 1, r.y + r.h - 2), rng.int(5, 14), T.LAVA, T.FLOOR);
    }
    // Extra short crossings so the rivers do not turn the floor into a tree.
    ctx.afterConnect = function () {
      for (let t = 0, made = 0; t < 600 && made < o.bridges; t++) {
        const x = rng.int(2, x1 - 1), y = rng.int(2, y1 - 1);
        if (tiles[y * w + x] === T.LAVA && bridge(ctx, x, y, T.LAVA, 6, rng.chance(0.5))) made++;
      }
    };
  }

  L.broken_halls = function (ctx) {
    infernoBuild(ctx, { skip: 0.08, collapse: 0.55, dividers: 0.45, erodeWall: 0.07, erodeFloor: 0.03, rivers: [1, ctx.rng.chance(0.55) ? 2 : 1], riverWide: 4, lakes: [2, 4], bridges: 3, cw: [2, 3] });
  };
  // Three or four wide molten rivers: islands of ruin, scarce crossings.
  L.magma_flows = function (ctx) {
    infernoBuild(ctx, { skip: 0.05, collapse: 0.4, dividers: 0.3, erodeWall: 0.05, erodeFloor: 0.03, rivers: [3, 4], riverWide: 4, lakes: [3, 5], bridges: 6, cw: [2, 3] });
  };
  // No fire to speak of: wind-scoured ruins, big open ground, rubble everywhere.
  L.ash_fields = function (ctx) {
    infernoBuild(ctx, { skip: 0.04, collapse: 0.85, dividers: 0.1, erodeWall: 0.28, erodeFloor: 0.1, rivers: [0, ctx.rng.chance(0.4) ? 1 : 0], riverWide: 3, lakes: [0, 2], bridges: 2, cw: [3, 4] });
  };

  // ---- abyss ----------------------------------------------------------------------------------------------
  // One irregular floating platform made of overlapping discs; returns its (bounding box) room.
  function platform(ctx, cx, cy, lobes, r0, rk, spread) {
    const rng = ctx.rng, w = ctx.w, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    let minX = cx, maxX = cx, minY = cy, maxY = cy;
    for (let k = 0; k < lobes; k++) {
      const ox = k ? rng.int(-spread, spread) : 0, oy = k ? rng.int(-spread + 1, spread - 1) : 0;
      const rad = k ? rng.range(rk[0], rk[1]) : rng.range(r0[0], r0[1]);
      const R = Math.ceil(rad);
      for (let y = cy + oy - R; y <= cy + oy + R; y++) {
        for (let x = cx + ox - R; x <= cx + ox + R; x++) {
          const dx = x - cx - ox, dy = y - cy - oy;
          if (dx * dx + dy * dy > rad * rad || !gen.inMain(ctx, x, y) || x < 2 || y < 2 || x >= x1 || y >= y1) continue;
          tiles[y * w + x] = T.FLOOR;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const r = gen.room(minX, minY, maxX - minX + 1, maxY - minY + 1);
    r.cx = cx; r.cy = cy;
    ctx.rooms.push(r);
    return r;
  }

  // Crumbling edges on the outer part of each platform.
  function crumble(ctx, p) {
    const rng = ctx.rng, w = ctx.w, tiles = ctx.tiles, src = tiles.slice();
    for (const r of ctx.rooms) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const i = y * w + x;
          if (src[i] !== T.FLOOR || (Math.abs(x - r.cx) < 3 && Math.abs(y - r.cy) < 3)) continue;
          const edge = src[i - 1] === T.CHASM || src[i + 1] === T.CHASM || src[i - w] === T.CHASM || src[i + w] === T.CHASM;
          if (edge && rng.chance(p)) tiles[i] = T.CHASM;
        }
      }
    }
  }

  // Ruined wall arcs on part of each rim: cover and something for torches to hang on.
  function rimWalls(ctx, chance) {
    const rng = ctx.rng, w = ctx.w, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    for (const r of ctx.rooms) {
      if (!rng.chance(chance)) continue;
      const a0 = rng.range(-Math.PI, Math.PI), span = rng.range(1.2, 3.4);
      for (let y = r.y - 1; y <= r.y + r.h; y++) {
        for (let x = r.x - 1; x <= r.x + r.w; x++) {
          if (!gen.inMain(ctx, x, y) || x < 2 || y < 2 || y > y1 - 1 || tiles[y * w + x] !== T.CHASM) continue;
          let da = Math.abs(Math.atan2(y - r.cy, x - r.cx) - a0);
          if (da > Math.PI) da = 2 * Math.PI - da;
          if (da > span / 2) continue;
          let touch = false;
          for (let oy = -1; oy <= 1 && !touch; oy++) for (let ox = -1; ox <= 1; ox++) if (gen.at(ctx, x + ox, y + oy) === T.FLOOR) { touch = true; break; }
          if (touch) tiles[y * w + x] = T.WALL;
        }
      }
    }
  }

  function walkways(ctx, extraP, extraMax, wideP) {
    const rng = ctx.rng, rooms = ctx.rooms;
    for (const e of gen.graph(rng, rooms, extraP, extraMax)) {
      const a = rooms[e[0]], b = rooms[e[1]];
      gen.corridor(ctx, a.cx, a.cy, b.cx, b.cy, rng.chance(wideP) ? 2 : 1, rng.chance(0.4) ? T.BRIDGE : T.FLOOR, rng.chance(0.5));
    }
  }

  // o: { target, spacing2, margin, lobes:[a,b], r0, rk, spread, crumble, rim, graphP, graphMax }
  function isles(ctx, o) {
    const rng = ctx.rng, x1 = ctx.mx1, y1 = ctx.h - 2;
    const centres = [];
    for (let tries = 0; tries < 600 && centres.length < o.target; tries++) {
      const cx = rng.int(o.margin, x1 - o.margin), cy = rng.int(o.margin, y1 - o.margin);
      let ok = true;
      for (const c of centres) if ((c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy) < o.spacing2) { ok = false; break; }
      if (ok) centres.push({ x: cx, y: cy });
    }
    for (const c of centres) platform(ctx, c.x, c.y, rng.int(o.lobes[0], o.lobes[1]), o.r0, o.rk, o.spread);
    crumble(ctx, o.crumble);
    rimWalls(ctx, o.rim);
    walkways(ctx, o.graphP, o.graphMax, 0.2);
  }

  L.floating_chambers = function (ctx) {
    isles(ctx, { target: 7 + ctx.rng.int(0, 3), spacing2: 256, margin: 9, lobes: [3, 5], r0: [3.8, 5.4], rk: [2.6, 5.2], spread: 5, crumble: 0.14, rim: 0.8, graphP: 0.3, graphMax: 28 });
  };
  // A dozen small islands, many thin crossings.
  L.scattered_isles = function (ctx) {
    isles(ctx, { target: 12 + ctx.rng.int(0, 3), spacing2: 90, margin: 6, lobes: [2, 3], r0: [2.8, 3.8], rk: [2, 3.2], spread: 3, crumble: 0.1, rim: 0.5, graphP: 0.5, graphMax: 20 });
  };
  // A great central platform ringed by satellites, spokes and rim roads between them.
  L.shattered_spire = function (ctx) {
    const rng = ctx.rng, x1 = ctx.mx1, y1 = ctx.h - 2;
    const cx0 = (2 + x1) >> 1, cy0 = (2 + y1) >> 1;
    platform(ctx, cx0, cy0, 5, [5.4, 6.6], [3, 5.2], 5);
    const n = rng.int(6, 8), Rx = Math.max(10, (x1 - 2) / 2 - 7), Ry = Math.max(10, (y1 - 2) / 2 - 7), a0 = rng.range(0, 6.28);
    for (let k = 0; k < n; k++) {
      const a = a0 + k * 6.2832 / n;
      platform(ctx, Math.round(cx0 + Math.cos(a) * Rx), Math.round(cy0 + Math.sin(a) * Ry), rng.int(3, 4), [3.4, 4.6], [2.4, 4], 4);
    }
    crumble(ctx, 0.12);
    rimWalls(ctx, 0.6);
    walkways(ctx, 0.45, 30, 0.25);
  };

  // ---- abyss, depth 21+: other themes bleed in ---------------------------------------------------------------
  // Crypt blend: ruined chapels adrift in the void, wall fragments still standing around them.
  L.fallen_cathedral = function (ctx) {
    const rng = ctx.rng, rooms = ctx.rooms, tiles = ctx.tiles, w = ctx.w, x1 = ctx.mx1, y1 = ctx.h - 2;
    const target = 8 + rng.int(0, 3);
    for (let tries = 0; tries < 600 && rooms.length < target; tries++) {
      const rw = rng.int(6, 11), rh = rng.int(6, 9);
      if (x1 - rw < 4 || y1 - rh < 4) continue;
      const rx = rng.int(3, x1 - rw - 1), ry = rng.int(3, y1 - rh - 1);
      let clash = false;
      for (const r of rooms) if (rx < r.x + r.w + 5 && rx + rw + 5 > r.x && ry < r.y + r.h + 5 && ry + rh + 5 > r.y) { clash = true; break; }
      if (!clash) rooms.push(gen.room(rx, ry, rw, rh));
    }
    for (const r of rooms) {
      gen.rect(ctx, r.x, r.y, r.w, r.h, T.FLOOR);
      for (let k = rng.int(0, 3); k > 0; k--) gen.set(ctx, rng.chance(0.5) ? r.x : r.x + r.w - 1, rng.int(r.y, r.y + r.h - 1), T.CHASM);     // bitten corners
    }
    walkways(ctx, 0.3, 26, 0.1);
    // chancel walls: stretches of the outside ring become WALL wherever nothing walks through them
    for (const r of rooms) {
      for (let side = 0; side < 4; side++) {
        if (!rng.chance(0.6)) continue;
        const horiz = side < 2, fix = side === 0 ? r.y - 1 : side === 1 ? r.y + r.h : side === 2 ? r.x - 1 : r.x + r.w;
        const lo = horiz ? r.x : r.y, hi = horiz ? r.x + r.w : r.y + r.h;
        for (let t = lo; t < hi; t++) {
          const x = horiz ? t : fix, y = horiz ? fix : t;
          if (gen.inMain(ctx, x, y) && x >= 2 && y >= 2 && x < x1 && y < y1 && tiles[y * w + x] === T.CHASM && rng.chance(0.8)) tiles[y * w + x] = T.WALL;
        }
      }
    }
  };

  // Inferno blend: floating chambers with lava pits sunk into them.
  L.cinder_isles = function (ctx) {
    const rng = ctx.rng;
    isles(ctx, { target: 8 + rng.int(0, 2), spacing2: 225, margin: 8, lobes: [3, 4], r0: [4.2, 5.6], rk: [3, 5], spread: 5, crumble: 0.16, rim: 0.4, graphP: 0.35, graphMax: 28 });
    for (const r of ctx.rooms) {
      if (!rng.chance(0.75)) continue;
      gen.blob(ctx, r.cx + rng.int(-2, 2), r.cy + rng.int(-2, 2), rng.int(8, 22), T.LAVA, T.FLOOR);
    }
  };

  // Caves blend: natural caverns hanging in the dark, pools in their hollows.
  L.hollow_grove = function (ctx) {
    cellular(ctx, 0.46, 4);
    pools(ctx, ctx.rng.int(2, 4), 10, 40);
    clearingRooms(ctx);
  };

  // ---- last resort: three rooms in a row. Only used if a themed layout keeps failing validation. -----------
  L.fallback = function (ctx) {
    const y = (ctx.h >> 1) - 3;
    for (let k = 0; k < 3; k++) {
      const r = gen.room(4 + k * 12, y, 7, 7);
      ctx.rooms.push(r);
      gen.rect(ctx, r.x, r.y, r.w, r.h, T.FLOOR);
      if (k) gen.corridor(ctx, ctx.rooms[k - 1].cx, r.cy, r.cx, r.cy, 1, T.FLOOR, true);
    }
  };
})();
