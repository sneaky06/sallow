// Generation toolkit shared by the theme layouts: carving, flood fill, connectivity repair, transforms.
// Internal to the world team (G.world._gen) — nobody else should call this.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE, WALK = C.WALKABLE;
  const W = G.world = G.world || {};
  const gen = W._gen = { layouts: {} };

  // Generation works on DRY ground: shallow water/lava is walkable in play (CONTRACT R2.1) but never counts as a
  // route here, so every region ends up joined by floor or bridges and nobody is forced to wade through lava.
  const DRY = Uint8Array.from(WALK);
  DRY[T.WATER] = 0;
  DRY[T.LAVA] = 0;
  gen.DRY = DRY;
  const LIQUID = new Uint8Array(WALK.length);
  LIQUID[T.WATER] = LIQUID[T.LAVA] = LIQUID[T.DEEP_WATER] = LIQUID[T.DEEP_LAVA] = 1;
  gen.LIQUID = LIQUID;

  // A build context. Layouts carve into `tiles` inside the main area x ∈ [1, mx1], y ∈ [1, h-2];
  // on boss floors the columns east of mx1 are reserved for the boss complex.
  gen.makeCtx = function (w, h, rng, depth, theme) {
    const n = w * h, fill = theme === 'abyss' ? T.CHASM : T.WALL;
    return {
      w, h, n, rng, depth, theme, fill,
      tiles: new Uint8Array(n).fill(fill),
      prot: new Uint8Array(n),      // 1 = never put a solid prop here (corridors, doors, bridges, stairs)
      lock: new Uint8Array(n),      // 1 = connectivity repair may not carve here (boss complex)
      rooms: [], landmarks: [], variant: null, mx1: w - 2, isBoss: false, exitPos: null, afterConnect: null,
      spawn: null, exit: null, dist: null,
    };
  };

  gen.room = function (x, y, w, h, type) {
    return { x, y, w, h, type: type || '', cx: x + (w >> 1), cy: y + (h >> 1) };
  };

  gen.at = function (ctx, x, y) {
    return (x < 0 || y < 0 || x >= ctx.w || y >= ctx.h) ? T.VOID : ctx.tiles[y * ctx.w + x];
  };
  gen.walk = function (ctx, x, y) { return DRY[gen.at(ctx, x, y)] === 1; };     // dry footing
  gen.interior = function (ctx, x, y) { return x >= 1 && y >= 1 && x < ctx.w - 1 && y < ctx.h - 1; };
  gen.inMain = function (ctx, x, y) { return x >= 1 && y >= 1 && x <= ctx.mx1 && y < ctx.h - 1; };
  gen.set = function (ctx, x, y, t) { if (gen.interior(ctx, x, y)) ctx.tiles[y * ctx.w + x] = t; };

  gen.rect = function (ctx, x, y, w, h, t) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) gen.set(ctx, i, j, t);
  };

  // Open one tile as passage. Liquids become bridges; everything already walkable is left alone.
  gen.dig = function (ctx, x, y, tile) {
    if (!gen.interior(ctx, x, y)) return;
    const i = y * ctx.w + x, t = ctx.tiles[i];
    if (DRY[t]) return;
    ctx.tiles[i] = LIQUID[t] ? T.BRIDGE : (tile || T.FLOOR);
    ctx.prot[i] = 1;
  };

  // L-shaped passage between two points.
  gen.corridor = function (ctx, x0, y0, x1, y1, width, tile, horizFirst) {
    const seg = function (ax, ay, bx, by) {
      const sx = Math.sign(bx - ax), sy = Math.sign(by - ay);
      let x = ax, y = ay;
      for (;;) {
        for (let k = 0; k < width; k++) gen.dig(ctx, x + (sy ? k : 0), y + (sx ? k : 0), tile);
        if (x === bx && y === by) break;
        x += sx; y += sy;
      }
    };
    if (horizFirst) { seg(x0, y0, x1, y0); seg(x1, y0, x1, y1); } else { seg(x0, y0, x0, y1); seg(x0, y1, x1, y1); }
  };

  // Minimum spanning tree over room centres plus a share of the short leftover edges (loops).
  gen.graph = function (rng, rooms, extraP, extraMax) {
    const n = rooms.length, edges = [];
    if (n < 2) return edges;
    const d = function (a, b) { return Math.hypot(rooms[a].cx - rooms[b].cx, rooms[a].cy - rooms[b].cy); };
    const inT = new Uint8Array(n), best = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1);
    const used = new Set();
    let cur = 0;
    inT[0] = 1;
    for (let k = 1; k < n; k++) {
      let nx = -1;
      for (let j = 0; j < n; j++) {
        if (inT[j]) continue;
        const dd = d(cur, j);
        if (dd < best[j]) { best[j] = dd; from[j] = cur; }
        if (nx < 0 || best[j] < best[nx]) nx = j;
      }
      inT[nx] = 1;
      edges.push([from[nx], nx]);
      used.add(Math.min(from[nx], nx) * n + Math.max(from[nx], nx));
      cur = nx;
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (!used.has(i * n + j) && d(i, j) < extraMax && rng.chance(extraP)) edges.push([i, j]);
      }
    }
    return edges;
  };

  // Grow a random blob of `tile` over tiles of type `over`, starting at (x, y). Returns the tiles changed.
  gen.blob = function (ctx, x, y, size, tile, over) {
    const w = ctx.w, cells = [];
    if (!gen.inMain(ctx, x, y) || ctx.tiles[y * w + x] !== over) return cells;
    ctx.tiles[y * w + x] = tile;
    cells.push(y * w + x);
    for (let guard = size * 12; guard > 0 && cells.length < size; guard--) {
      const c = cells[(ctx.rng.next() * cells.length) | 0], d = (ctx.rng.next() * 4) | 0;
      const nx = (c % w) + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = ((c / w) | 0) + (d === 2 ? 1 : d === 3 ? -1 : 0);
      if (!gen.inMain(ctx, nx, ny) || ctx.tiles[ny * w + nx] !== over) continue;
      ctx.tiles[ny * w + nx] = tile;
      cells.push(ny * w + nx);
    }
    return cells;
  };

  // 4-connected BFS distance over dry tiles (8-way movement without corner cutting reaches exactly the
  // same tiles). -1 = unreachable. `blockMask[i]` truthy tiles are treated as walls. Pass `table` = G.C.WALKABLE
  // to flood the way an entity can actually walk (wading included).
  gen.flood = function (ctx, sx, sy, blockMask, table) {
    const w = ctx.w, n = ctx.n, tiles = ctx.tiles, ok = table || DRY;
    const dist = new Int32Array(n).fill(-1), q = new Int32Array(n);
    let qh = 0, qt = 0;
    const s = sy * w + sx;
    dist[s] = 0; q[qt++] = s;
    while (qh < qt) {
      const i = q[qh++], d = dist[i] + 1, x = i % w;
      for (let k = 0; k < 4; k++) {
        if ((k === 0 && x === 0) || (k === 1 && x === w - 1)) continue;
        const j = k === 0 ? i - 1 : k === 1 ? i + 1 : k === 2 ? i - w : i + w;
        if (j < 0 || j >= n || dist[j] >= 0 || !ok[tiles[j]] || (blockMask && blockMask[j])) continue;
        dist[j] = d; q[qt++] = j;
      }
    }
    return dist;
  };

  gen.components = function (ctx) {
    const w = ctx.w, n = ctx.n, tiles = ctx.tiles;
    const label = new Int32Array(n).fill(-1), q = new Int32Array(n), sizes = [];
    for (let s = 0; s < n; s++) {
      if (label[s] >= 0 || !DRY[tiles[s]]) continue;
      const id = sizes.length;
      let qh = 0, qt = 0;
      label[s] = id; q[qt++] = s;
      while (qh < qt) {
        const i = q[qh++], x = i % w;
        for (let k = 0; k < 4; k++) {
          if ((k === 0 && x === 0) || (k === 1 && x === w - 1)) continue;
          const j = k === 0 ? i - 1 : k === 1 ? i + 1 : k === 2 ? i - w : i + w;
          if (j < 0 || j >= n || label[j] >= 0 || !DRY[tiles[j]]) continue;
          label[j] = id; q[qt++] = j;
        }
      }
      sizes.push(qt);
    }
    return { label, sizes };
  };

  // Join every walkable region of at least `minKeep` tiles into one by digging the shortest tunnel/bridge
  // from it to any other region; smaller pockets are filled in. Never carves through locked tiles.
  gen.connectAll = function (ctx, minKeep) {
    const w = ctx.w, h = ctx.h, n = ctx.n, tiles = ctx.tiles, lock = ctx.lock;
    const passage = ctx.theme === 'abyss' ? T.BRIDGE : T.FLOOR;
    const m = ctx.theme === 'abyss' ? 2 : 1;       // abyss walkways keep a tile of chasm between them and the rim
    const par = new Int32Array(n), q = new Int32Array(n);
    for (let guard = 0; guard < 120; guard++) {
      const comp = gen.components(ctx), label = comp.label, sizes = comp.sizes;
      if (sizes.length <= 1) return;
      let main = 0;
      for (let c = 1; c < sizes.length; c++) if (sizes[c] > sizes[main]) main = c;
      let pick = -1;
      for (let c = 0; c < sizes.length; c++) if (c !== main && (pick < 0 || sizes[c] > sizes[pick])) pick = c;
      if (sizes[pick] < minKeep) {
        for (let i = 0; i < n; i++) if (label[i] >= 0 && label[i] !== main) tiles[i] = ctx.fill;
        return;
      }
      par.fill(-2);
      let qh = 0, qt = 0, hit = -1;
      for (let i = 0; i < n; i++) if (label[i] === pick) { par[i] = -1; q[qt++] = i; }
      search:
      while (qh < qt) {
        const i = q[qh++], x = i % w, y = (i / w) | 0;
        for (let k = 0; k < 4; k++) {
          const nx = x + (k === 0 ? -1 : k === 1 ? 1 : 0), ny = y + (k === 2 ? -1 : k === 3 ? 1 : 0);
          if (nx < m || ny < m || nx >= w - m || ny >= h - m) continue;
          const j = ny * w + nx;
          if (par[j] !== -2 || lock[j]) continue;
          if (label[j] >= 0) { hit = i; break search; }
          par[j] = i; q[qt++] = j;
        }
      }
      if (hit < 0) {
        for (let i = 0; i < n; i++) if (label[i] === pick) tiles[i] = ctx.fill;
        continue;
      }
      for (let k = hit; k >= 0 && label[k] !== pick; k = par[k]) gen.dig(ctx, k % w, (k / w) | 0, passage);
    }
  };

  // Turn the middle of every water/lava body deep (impassable): a liquid tile whose 8 neighbours are all liquid
  // or bridge. That leaves a wadeable shallow rim around every deep core.
  gen.deepen = function (ctx) {
    const w = ctx.w, h = ctx.h, tiles = ctx.tiles, src = tiles.slice();
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x, t = src[i];
        if (t !== T.WATER && t !== T.LAVA) continue;
        let inner = true;
        for (let oy = -1; oy <= 1 && inner; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const u = src[i + oy * w + ox];
            if (!LIQUID[u] && u !== T.BRIDGE) { inner = false; break; }
          }
        }
        if (inner) tiles[i] = t === T.WATER ? T.DEEP_WATER : T.DEEP_LAVA;
      }
    }
  };

  // Remove liquid nobody can wade to (sealed pockets), then any deep tile left without its shallow rim.
  gen.pruneLiquid = function (ctx, reach) {
    const w = ctx.w, n = ctx.n, tiles = ctx.tiles;
    let changed = false;
    for (let i = 0; i < n; i++) if ((tiles[i] === T.WATER || tiles[i] === T.LAVA) && reach[i] < 0) { tiles[i] = ctx.fill; changed = true; }
    while (changed) {
      changed = false;
      for (let i = w + 1; i < n - w - 1; i++) {
        if (tiles[i] !== T.DEEP_WATER && tiles[i] !== T.DEEP_LAVA) continue;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const u = tiles[i + oy * w + ox];
            if (!LIQUID[u] && u !== T.BRIDGE) { tiles[i] = ctx.fill; changed = true; oy = 2; break; }
          }
        }
      }
    }
  };

  // Keep only the walls that face something; solid rock behind them becomes VOID. Seal the map border.
  gen.shell = function (ctx) {
    const w = ctx.w, h = ctx.h, tiles = ctx.tiles;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tiles[y * w + x] = ctx.theme === 'abyss' ? T.VOID : T.WALL;
      }
    }
    if (ctx.theme === 'abyss') return;
    const src = tiles.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (src[y * w + x] !== T.WALL) continue;
        let faces = false;
        for (let oy = -1; oy <= 1 && !faces; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const X = x + ox, Y = y + oy;
            if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
            const t = src[Y * w + X];
            if (t !== T.WALL && t !== T.VOID) { faces = true; break; }
          }
        }
        if (!faces) tiles[y * w + x] = T.VOID;
      }
    }
  };

  // Mirror / transpose the whole build so the canonical "boss in the east" layout faces any direction.
  gen.transform = function (ctx, mode) {
    const fx = mode & 1, fy = mode & 2, tr = mode & 4;
    if (!mode) return;
    const ow = ctx.w, oh = ctx.h, nw = tr ? oh : ow, nh = tr ? ow : oh;
    const pt = function (x, y) {
      if (fx) x = ow - 1 - x;
      if (fy) y = oh - 1 - y;
      return tr ? { x: y, y: x } : { x, y };
    };
    const tiles = new Uint8Array(ctx.n), prot = new Uint8Array(ctx.n), lock = new Uint8Array(ctx.n);
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        const X0 = fx ? ow - 1 - x : x, Y0 = fy ? oh - 1 - y : y;
        const j = tr ? X0 * nw + Y0 : Y0 * nw + X0, i = y * ow + x;
        tiles[j] = ctx.tiles[i]; prot[j] = ctx.prot[i]; lock[j] = ctx.lock[i];
      }
    }
    ctx.tiles = tiles; ctx.prot = prot; ctx.lock = lock; ctx.w = nw; ctx.h = nh;
    for (const r of ctx.rooms) {
      const a = pt(r.x, r.y), b = pt(r.x + r.w - 1, r.y + r.h - 1), c = pt(r.cx, r.cy);
      r.x = Math.min(a.x, b.x); r.y = Math.min(a.y, b.y);
      r.w = Math.abs(a.x - b.x) + 1; r.h = Math.abs(a.y - b.y) + 1;
      r.cx = c.x; r.cy = c.y;
    }
    for (const lm of ctx.landmarks) {
      const a = pt(lm.x, lm.y), b = pt(lm.x + lm.w - 1, lm.y + lm.h - 1);
      lm.x = Math.min(a.x, b.x); lm.y = Math.min(a.y, b.y);
      lm.w = Math.abs(a.x - b.x) + 1; lm.h = Math.abs(a.y - b.y) + 1;
      for (const p of lm.pts) { const q = pt(p.x, p.y); p.x = q.x; p.y = q.y; }
    }
    if (ctx.spawn) ctx.spawn = pt(ctx.spawn.x, ctx.spawn.y);
    if (ctx.exit) ctx.exit = pt(ctx.exit.x, ctx.exit.y);
  };

  // Would blocking (x, y) cut the walkable area in two? Safe iff the walkable tiles around it that touch it
  // orthogonally all sit in one unbroken arc of its 8-neighbour ring. `occ[i] & 1` marks tiles already blocked.
  const RX = [0, 1, 1, 1, 0, -1, -1, -1], RY = [-1, -1, 0, 1, 1, 1, 0, -1];
  gen.ringOK = function (tiles, w, h, occ, x, y, table) {
    const ok = table || DRY;
    let mask = 0;
    for (let k = 0; k < 8; k++) {
      const X = x + RX[k], Y = y + RY[k];
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const i = Y * w + X;
      if (ok[tiles[i]] && !(occ[i] & 1)) mask |= 1 << k;
    }
    if (mask === 255) return true;
    let s = 0;
    while (mask & (1 << s)) s++;
    let arcs = 0, run = false, orth = false;
    for (let k = 1; k <= 8; k++) {
      const idx = (s + k) & 7;
      if (mask & (1 << idx)) {
        run = true;
        if (!(idx & 1)) orth = true;
      } else {
        if (run && orth) arcs++;
        run = false; orth = false;
      }
    }
    return arcs <= 1;
  };
})();
