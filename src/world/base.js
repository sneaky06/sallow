// World queries: tiles, collision, line of sight, prop lookup. See CONTRACT.md §2.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE, WALK = C.WALKABLE;
  const W = G.world = G.world || {};

  const OPQ = Uint8Array.from(C.OPAQUE);
  W._opaque = function () { return OPQ; };

  // Path cost multiplier per tile: wading is slow, lava hurts (CONTRACT R2.1).
  const COST = new Uint8Array(C.WALKABLE.length).fill(1);
  COST[T.WATER] = 2;
  COST[T.LAVA] = 6;

  // Per-map lookup grids live in a WeakMap, never on the map itself (maps stay plain data).
  // blocked[i] = tile not walkable OR solid prop; cost[i] = path cost multiplier; propIdx[i] = index+1 into map.props.
  // Rebuilt when the prop list changes length and at most every REFRESH_MS otherwise, so a prop
  // whose `solid` flag is flipped in place (broken barrel) is picked up without any notification.
  const caches = new WeakMap();
  const REFRESH_MS = 80;

  function rebuild(map, c, now) {
    const tiles = map.tiles, b = c.blocked, pi = c.propIdx, cost = c.cost, n = c.n, w = map.w, h = map.h;
    for (let i = 0; i < n; i++) { const t = tiles[i]; b[i] = WALK[t] ? 0 : 1; cost[i] = COST[t] || 1; }
    pi.fill(0);
    const props = map.props;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (!p || p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) continue;
      const k = p.y * w + p.x;
      if (p.solid) b[k] = 1;
      const cur = pi[k] ? props[pi[k] - 1] : null;
      if (!cur || (p.solid && !cur.solid) || (p.interact && !cur.interact && !cur.solid)) pi[k] = i + 1;
    }
    c.len = props.length;
    c.tiles = tiles;
    c.stamp = now;
  }

  function grid(map) {
    let c = caches.get(map);
    const n = map.w * map.h;
    if (!c || c.n !== n) {
      c = { n, blocked: new Uint8Array(n), cost: new Uint8Array(n), propIdx: new Int16Array(n), len: -1, tiles: null, stamp: -1e9 };
      caches.set(map, c);
    }
    const now = performance.now();
    if (c.len !== map.props.length || c.tiles !== map.tiles || now - c.stamp > REFRESH_MS) rebuild(map, c, now);
    return c;
  }
  W._grid = grid;

  // Force the lookup to refresh on the next query (after adding/removing props or flipping prop.solid).
  W.invalidate = function (map) {
    const c = map && caches.get(map);
    if (c) c.len = -1;
  };

  W.tileAt = function (map, x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return T.VOID;
    return map.tiles[y * map.w + x];
  };

  W.isWalkable = function (map, x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
    return grid(map).blocked[y * map.w + x] === 0;
  };

  W.propAt = function (map, tx, ty) {
    tx = Math.floor(tx); ty = Math.floor(ty);
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return null;
    const k = ty * map.w + tx;
    let c = grid(map), idx = c.propIdx[k];
    let p = idx ? map.props[idx - 1] : null;
    if (idx && (!p || p.x !== tx || p.y !== ty)) {      // list was edited in place: rebuild once
      rebuild(map, c, performance.now());
      idx = c.propIdx[k];
      p = idx ? map.props[idx - 1] : null;
    }
    return p || null;
  };

  function circleFree(b, w, h, x, y, r) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    const r2 = r * r - 1e-9;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx >= 0 && ty >= 0 && tx < w && ty < h && !b[ty * w + tx]) continue;
        const cx = x < tx ? tx : (x > tx + 1 ? tx + 1 : x);
        const cy = y < ty ? ty : (y > ty + 1 ? ty + 1 : y);
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < r2) return false;
      }
    }
    return true;
  }

  W.canMoveTo = function (map, x, y, radius) {
    return circleFree(grid(map).blocked, map.w, map.h, x, y, radius > 0 ? radius : 0.3);
  };

  // Push a circle out of every blocked tile it overlaps. Result in px/py. False if the centre is inside one.
  let px = 0, py = 0;
  function pushOut(b, w, h, r) {
    for (let pass = 0; pass < 4; pass++) {
      let hit = false;
      const x0 = Math.floor(px - r), x1 = Math.floor(px + r), y0 = Math.floor(py - r), y1 = Math.floor(py + r);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (tx >= 0 && ty >= 0 && tx < w && ty < h && !b[ty * w + tx]) continue;
          const cx = px < tx ? tx : (px > tx + 1 ? tx + 1 : px);
          const cy = py < ty ? ty : (py > ty + 1 ? ty + 1 : py);
          const dx = px - cx, dy = py - cy, d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          if (d2 < 1e-12) return false;
          const d = Math.sqrt(d2), push = (r - d + 1e-4) / d;
          px += dx * push; py += dy * push;
          hit = true;
        }
      }
      if (!hit) return true;
    }
    return circleFree(b, w, h, px, py, r);
  }

  function step(b, w, h, ent, r, sx, sy) {
    const ox = ent.x, oy = ent.y;
    if (circleFree(b, w, h, ox + sx, oy + sy, r)) { ent.x = ox + sx; ent.y = oy + sy; return true; }
    // Blocked: resolve the overlap, which slides the circle along walls and around corners.
    px = ox + sx; py = oy + sy;
    if (pushOut(b, w, h, r)) {
      const mx = px - ox, my = py - oy, m2 = mx * mx + my * my, s2 = sx * sx + sy * sy;
      if (m2 > 1e-8 && m2 <= s2 * 1.21 + 1e-6 && mx * sx + my * sy > 0) { ent.x = px; ent.y = py; return true; }
    }
    const xFirst = Math.abs(sx) >= Math.abs(sy);
    for (let k = 0; k < 2; k++) {
      if ((k === 0) === xFirst) {
        if (sx !== 0 && circleFree(b, w, h, ox + sx, oy, r)) { ent.x = ox + sx; return true; }
      } else if (sy !== 0 && circleFree(b, w, h, ox, oy + sy, r)) { ent.y = oy + sy; return true; }
    }
    return false;
  }

  // Nearest free position for an entity embedded in a blocked tile: the closest point of the nearest free tile
  // (pulled to its centre if the body would still overlap a wall there). Dry ground preferred.
  function unstick(map, ent, b, r) {
    const f = W.findFreeTileNear(map, ent.x, ent.y, 12);
    if (!f) return false;
    const e = Math.min(0.5, r + 0.02);
    let nx = Math.min(f.x + 1 - e, Math.max(f.x + e, ent.x)), ny = Math.min(f.y + 1 - e, Math.max(f.y + e, ent.y));
    if (!circleFree(b, map.w, map.h, nx, ny, r)) { nx = f.x + 0.5; ny = f.y + 0.5; }
    ent.x = nx; ent.y = ny;
    return true;
  }

  // Where a thing standing at (x, y) can safely be put: the point itself if its tile is walkable and connected to the
  // map's spawn, else the centre of the nearest such tile (dry ground), so a corpse never lands in rock or a sealed pocket.
  W.safeSpot = function (map, x, y) {
    const c = grid(map), b = c.blocked, w = map.w, h = map.h;
    const tx = Math.floor(x), ty = Math.floor(y);
    const inside = tx >= 0 && ty >= 0 && tx < w && ty < h;
    const reach = new Uint8Array(w * h), q = [];
    const sp = map.spawn;
    if (sp && sp.x >= 0 && sp.y >= 0 && sp.x < w && sp.y < h && !b[sp.y * w + sp.x]) { reach[sp.y * w + sp.x] = 1; q.push(sp.y * w + sp.x); }
    for (let i = 0; i < q.length; i++) {
      const k = q[i], kx = k % w, ky = (k / w) | 0;
      for (const o of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = kx + o[0], ny = ky + o[1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ny * w + nx;
        if (!reach[nk] && !b[nk]) { reach[nk] = 1; q.push(nk); }
      }
    }
    if (!q.length) {                                  // no usable spawn: accept any walkable tile
      if (inside && !b[ty * w + tx]) return { x, y };
      const f = W.findFreeTileNear(map, x, y, 40);
      return f ? { x: f.x + 0.5, y: f.y + 0.5 } : null;
    }
    if (inside && reach[ty * w + tx] && c.cost[ty * w + tx] <= 1) return { x, y };
    let best = -1, bd = Infinity;
    for (let k = 0; k < reach.length; k++) {
      if (!reach[k] || c.cost[k] > 1) continue;
      const dx = (k % w) + 0.5 - x, dy = ((k / w) | 0) + 0.5 - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = k; }
    }
    if (best < 0) return inside && reach[ty * w + tx] ? { x, y } : null;
    return { x: (best % w) + 0.5, y: ((best / w) | 0) + 0.5 };
  };

  W.moveWithCollision = function (map, ent, dx, dy) {
    if (!dx && !dy) return false;
    const b = grid(map).blocked, w = map.w, h = map.h;
    const r = ent.radius > 0 ? ent.radius : 0.3;
    let moved = false;
    // Unstick: a centre inside a blocked tile can never leave by pushing (gate dropped on a doorway, crate on an
    // occupied tile), so slide it to the nearest free spot first. Only the centre tile counts: a wide body in a narrow gap is not stuck.
    const ctx0 = Math.floor(ent.x), cty0 = Math.floor(ent.y);
    if (ctx0 < 0 || cty0 < 0 || ctx0 >= w || cty0 >= h || b[cty0 * w + ctx0]) { if (unstick(map, ent, b, r)) moved = true; }
    const len = Math.sqrt(dx * dx + dy * dy);
    const n = Math.min(24, Math.max(1, Math.ceil(len / Math.min(0.4, r * 0.8))));
    const sx = dx / n, sy = dy / n;
    for (let i = 0; i < n; i++) {
      if (!step(b, w, h, ent, r, sx, sy)) break;
      moved = true;
    }
    return moved;
  };

  // Grid walk (Amanatides–Woo) over every tile strictly between the two end tiles.
  W.hasLineOfSight = function (map, x0, y0, x1, y1) {
    const w = map.w, h = map.h;
    let tx = Math.floor(x0), ty = Math.floor(y0);
    const ex = Math.floor(x1), ey = Math.floor(y1);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h || ex < 0 || ey < 0 || ex >= w || ey >= h) return false;
    const tiles = map.tiles, opq = W._opaque(map);
    const dx = x1 - x0, dy = y1 - y0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const ddx = dx !== 0 ? Math.abs(1 / dx) : Infinity, ddy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let mx = dx > 0 ? (tx + 1 - x0) * ddx : (dx < 0 ? (x0 - tx) * ddx : Infinity);
    let my = dy > 0 ? (ty + 1 - y0) * ddy : (dy < 0 ? (y0 - ty) * ddy : Infinity);
    for (let n = Math.abs(ex - tx) + Math.abs(ey - ty); n > 1; n--) {
      if (ty === ey || (tx !== ex && mx < my)) { tx += sx; mx += ddx; } else { ty += sy; my += ddy; }
      if (opq[tiles[ty * w + tx]]) return false;
    }
    return true;
  };

  // Nearest free tile to (x, y), searching outward ring by ring. Dry ground first; shallow water/lava only
  // if nothing dry is within range.
  W.findFreeTileNear = function (map, x, y, maxR) {
    if (maxR === undefined) maxR = 6;
    const c = grid(map);
    return freeNear(map, c.blocked, c.cost, x, y, maxR, 1) || freeNear(map, c.blocked, c.cost, x, y, maxR, 255);
  };

  function freeNear(map, b, cost, x, y, maxR, maxCost) {
    const w = map.w, h = map.h;
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx >= 0 && cy >= 0 && cx < w && cy < h && !b[cy * w + cx] && cost[cy * w + cx] <= maxCost) return { x: cx, y: cy };
    for (let r = 1; r <= maxR; r++) {
      let best = -1, bestD = Infinity;
      for (let oy = -r; oy <= r; oy++) {
        const ty = cy + oy;
        if (ty < 0 || ty >= h) continue;
        const edge = oy === -r || oy === r;
        for (let ox = -r; ox <= r; ox += (edge ? 1 : 2 * r)) {
          const tx = cx + ox;
          if (tx < 0 || tx >= w || b[ty * w + tx] || cost[ty * w + tx] > maxCost) continue;
          const ddx = tx + 0.5 - x, ddy = ty + 0.5 - y, d = ddx * ddx + ddy * ddy;
          if (d < bestD) { bestD = d; best = ty * w + tx; }
        }
      }
      if (best >= 0) return { x: best % w, y: (best / w) | 0 };
    }
    return null;
  }
})();
