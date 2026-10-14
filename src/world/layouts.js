// One layout generator per theme. Each carves ctx.tiles inside the main area and fills ctx.rooms
// (untyped — dungeon.js picks start/exit/treasure/... afterwards).
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE;
  const gen = G.world._gen, L = gen.layouts;

  // ---- crypt: rectangular rooms, 1-wide corridors with loops, doors -------------------------------------
  L.crypt = function (ctx) {
    const rng = ctx.rng, rooms = ctx.rooms, x1 = ctx.mx1, y1 = ctx.h - 2;
    const target = 9 + Math.min(6, ctx.depth >> 1) + rng.int(0, 3);
    for (let tries = 0; tries < 600 && rooms.length < target; tries++) {
      const big = rng.chance(0.15);
      const rw = big ? rng.int(10, 13) : rng.int(5, 9), rh = big ? rng.int(8, 11) : rng.int(5, 8);
      if (x1 - rw < 2 || y1 - rh < 2) continue;
      const rx = rng.int(2, x1 - rw), ry = rng.int(2, y1 - rh);
      let clash = false;
      for (const r of rooms) {
        if (rx < r.x + r.w + 3 && rx + rw + 3 > r.x && ry < r.y + r.h + 3 && ry + rh + 3 > r.y) { clash = true; break; }
      }
      if (!clash) rooms.push(gen.room(rx, ry, rw, rh));
    }
    for (const r of rooms) gen.rect(ctx, r.x, r.y, r.w, r.h, T.FLOOR);
    for (const e of gen.graph(rng, rooms, 0.22, 20)) {
      const a = rooms[e[0]], b = rooms[e[1]];
      gen.corridor(ctx, a.cx, a.cy, b.cx, b.cy, 1, T.FLOOR, rng.chance(0.5));
    }
    // A corridor that crosses a room's wall ring through a 1-wide gap becomes a door.
    const door = function (x, y, ax, ay) {
      if (gen.at(ctx, x, y) !== T.FLOOR) return;
      if (gen.at(ctx, x - ax, y - ay) !== T.WALL || gen.at(ctx, x + ax, y + ay) !== T.WALL) return;
      if (!gen.walk(ctx, x + ay, y + ax) || !gen.walk(ctx, x - ay, y - ax)) return;
      if (rng.chance(0.8)) gen.set(ctx, x, y, T.DOOR);
      ctx.prot[y * ctx.w + x] = 1;
    };
    for (const r of rooms) {
      for (let x = r.x; x < r.x + r.w; x++) { door(x, r.y - 1, 1, 0); door(x, r.y + r.h, 1, 0); }
      for (let y = r.y; y < r.y + r.h; y++) { door(r.x - 1, y, 0, 1); door(r.x + r.w, y, 0, 1); }
    }
  };

  // ---- caves: cellular automata caverns, water pools, bridges --------------------------------------------
  L.caves = function (ctx) {
    const rng = ctx.rng, w = ctx.w, n = ctx.n, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    let a = new Uint8Array(n).fill(1), b = new Uint8Array(n).fill(1);
    for (let y = 2; y < y1; y++) for (let x = 2; x < x1; x++) a[y * w + x] = rng.chance(0.45) ? 1 : 0;
    for (let it = 0; it < 5; it++) {
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

    // Pools, each crossed by a plank bridge where the far bank lines up.
    const pools = rng.int(3, 6);       // small ones stay shallow fords, big ones get a deep middle (gen.deepen)
    for (let p = 0; p < pools; p++) {
      let cells = [];
      for (let t = 0; t < 30 && !cells.length; t++) {
        cells = gen.blob(ctx, rng.int(3, x1 - 2), rng.int(3, y1 - 2), rng.int(16, 54), T.WATER, T.FLOOR);
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

    // Caves have no walls to define rooms: the widest clearings become pseudo-rooms.
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

  // ---- inferno: big broken halls on a loose grid, wide passages, lava rivers -----------------------------
  L.inferno = function (ctx) {
    const rng = ctx.rng, rooms = ctx.rooms, w = ctx.w, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    const cell = rng.int(14, 17);
    const cols = Math.max(2, Math.floor((x1 - 1) / cell)), rows = Math.max(2, Math.floor((y1 - 1) / cell));
    const cw = (x1 - 2) / cols, ch = (y1 - 2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rooms.length >= 3 && rng.chance(0.08)) continue;
        const maxW = Math.floor(cw) - 3, maxH = Math.floor(ch) - 3;
        const rw = rng.int(Math.max(6, maxW - 5), maxW), rh = rng.int(Math.max(6, maxH - 5), maxH);
        const rx = 2 + Math.floor(c * cw) + rng.int(0, maxW - rw), ry = 2 + Math.floor(r * ch) + rng.int(0, maxH - rh);
        rooms.push(gen.room(rx, ry, rw, rh));
      }
    }
    for (const r of rooms) {
      gen.rect(ctx, r.x, r.y, r.w, r.h, T.FLOOR);
      if (rng.chance(0.55)) {                       // collapsed corner
        const kw = rng.int(2, 3), kh = rng.int(2, 3);
        gen.rect(ctx, rng.chance(0.5) ? r.x : r.x + r.w - kw, rng.chance(0.5) ? r.y : r.y + r.h - kh, kw, kh, T.WALL);
      }
      if (r.w >= 9 && rng.chance(0.45)) {           // remains of a dividing wall
        const x = r.x + (rng.chance(0.5) ? 2 : r.w - 3);
        for (let y = r.y + 1; y < r.y + r.h - 1; y++) gen.set(ctx, x, y, rng.chance(0.55) ? T.WALL : T.RUBBLE);
      }
    }
    for (const e of gen.graph(rng, rooms, 0.3, cell * 1.7)) {
      const a = rooms[e[0]], b = rooms[e[1]];
      gen.corridor(ctx, a.cx, a.cy, b.cx, b.cy, rng.int(2, 3), T.FLOOR, rng.chance(0.5));
    }
    // Erosion: walls crumble into rubble, floors crack.
    const src = tiles.slice();
    for (let y = 2; y < y1; y++) {
      for (let x = 2; x < x1; x++) {
        const i = y * w + x;
        if (src[i] === T.WALL) {
          const open = src[i - 1] === T.FLOOR || src[i + 1] === T.FLOOR || src[i - w] === T.FLOOR || src[i + w] === T.FLOOR;
          if (open && rng.chance(0.07)) tiles[i] = T.RUBBLE;
        } else if (src[i] === T.FLOOR && rng.chance(0.03)) tiles[i] = T.RUBBLE;
      }
    }
    // Lava rivers run edge to edge and swallow whatever is in the way; connectAll bridges them afterwards.
    const rivers = 1 + (rng.chance(0.55) ? 1 : 0);
    for (let k = 0; k < rivers; k++) {
      const vert = k === 0 ? rng.chance(0.5) : rng.chance(0.5);
      const lim = vert ? x1 : y1, len = vert ? y1 : x1;
      let p = rng.range(6, lim - 6), drift = 0;
      for (let s = 1; s <= len; s++) {
        drift = Math.max(-1, Math.min(1, drift + rng.range(-0.4, 0.4)));
        p = Math.max(2, Math.min(lim - 5, p + drift));
        const wid = rng.chance(0.3) ? 5 : 4;      // 1-tile shallow banks around a deep channel
        for (let j = 0; j < wid; j++) {
          const x = vert ? Math.round(p) + j : s, y = vert ? s : Math.round(p) + j;
          if (gen.inMain(ctx, x, y)) tiles[y * w + x] = T.LAVA;
        }
      }
    }
    for (let k = rng.int(2, 4); k > 0; k--) {
      const r = rng.pick(rooms);
      gen.blob(ctx, rng.int(r.x + 1, r.x + r.w - 2), rng.int(r.y + 1, r.y + r.h - 2), rng.int(5, 14), T.LAVA, T.FLOOR);
    }
    // Extra short crossings so the rivers do not turn the floor into a tree.
    ctx.afterConnect = function () {
      for (let t = 0, made = 0; t < 400 && made < 3; t++) {
        const x = rng.int(2, x1 - 1), y = rng.int(2, y1 - 1);
        if (tiles[y * w + x] === T.LAVA && bridge(ctx, x, y, T.LAVA, 6, rng.chance(0.5))) made++;
      }
    };
  };

  // ---- abyss: irregular floating chambers joined by narrow walkways over CHASM ----------------------------
  L.abyss = function (ctx) {
    const rng = ctx.rng, rooms = ctx.rooms, w = ctx.w, tiles = ctx.tiles, x1 = ctx.mx1, y1 = ctx.h - 2;
    const target = 7 + rng.int(0, 3);
    const centres = [];
    for (let tries = 0; tries < 400 && centres.length < target; tries++) {
      const cx = rng.int(9, x1 - 9), cy = rng.int(9, y1 - 9);
      let ok = cx >= 9 && cy >= 9;
      for (const c of centres) if ((c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy) < 256) { ok = false; break; }
      if (ok) centres.push({ x: cx, y: cy });
    }
    for (const c of centres) {
      let minX = c.x, maxX = c.x, minY = c.y, maxY = c.y;
      const lobes = rng.int(3, 5);
      for (let k = 0; k < lobes; k++) {
        const ox = k ? rng.int(-5, 5) : 0, oy = k ? rng.int(-4, 4) : 0, rad = k ? rng.range(2.6, 5.2) : rng.range(3.8, 5.4);
        const R = Math.ceil(rad);
        for (let y = c.y + oy - R; y <= c.y + oy + R; y++) {
          for (let x = c.x + ox - R; x <= c.x + ox + R; x++) {
            const dx = x - c.x - ox, dy = y - c.y - oy;
            if (dx * dx + dy * dy > rad * rad || !gen.inMain(ctx, x, y) || x < 2 || y < 2 || x >= x1 || y >= y1) continue;
            tiles[y * w + x] = T.FLOOR;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      const r = gen.room(minX, minY, maxX - minX + 1, maxY - minY + 1);
      r.cx = c.x; r.cy = c.y;
      rooms.push(r);
    }
    // Crumbling edges.
    const src = tiles.slice();
    for (const r of rooms) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const i = y * w + x;
          if (src[i] !== T.FLOOR || (Math.abs(x - r.cx) < 3 && Math.abs(y - r.cy) < 3)) continue;
          const edge = src[i - 1] === T.CHASM || src[i + 1] === T.CHASM || src[i - w] === T.CHASM || src[i + w] === T.CHASM;
          if (edge && rng.chance(0.14)) tiles[i] = T.CHASM;
        }
      }
    }
    // Ruined wall arcs on part of each rim: cover and something for torches to hang on.
    for (const r of rooms) {
      if (!rng.chance(0.8)) continue;
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
    for (const e of gen.graph(rng, rooms, 0.3, 28)) {
      const a = rooms[e[0]], b = rooms[e[1]];
      gen.corridor(ctx, a.cx, a.cy, b.cx, b.cy, rng.chance(0.2) ? 2 : 1, rng.chance(0.4) ? T.BRIDGE : T.FLOOR, rng.chance(0.5));
    }
  };

  // ---- last resort: three rooms in a row. Only used if a themed layout keeps failing validation. ---------
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
