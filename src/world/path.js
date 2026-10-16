// A* pathfinding: 8-way, no corner cutting, binary heap, node cap, string-pulled result.
(function () {
  'use strict';
  const G = window.G;
  const W = G.world = G.world || {};

  const SQRT2 = Math.SQRT2;
  const H_WEIGHT = 1.15;        // slightly greedy: far fewer expansions, smoothing hides the difference
  const BODY = 0.3;             // half-width kept clear when straightening a path
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];

  // Scratch buffers shared by every call, sized to the largest map seen. `seen`/`closed` hold a
  // per-call stamp so nothing has to be cleared between searches.
  let cap = 0, gCost, parent, seen, closed, hI, hF, hCap = 0, hn = 0, chain, stamp = 0;

  function ensure(n) {
    if (n <= cap) return;
    cap = n;
    gCost = new Float32Array(n);
    parent = new Int32Array(n);
    seen = new Uint32Array(n);
    closed = new Uint32Array(n);
    chain = new Int32Array(n);
    hCap = n * 4;
    hI = new Int32Array(hCap);
    hF = new Float32Array(hCap);
    stamp = 0;
  }

  function push(i, f) {
    let k = hn++;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (hF[p] <= f) break;
      hI[k] = hI[p]; hF[k] = hF[p];
      k = p;
    }
    hI[k] = i; hF[k] = f;
  }

  function pop() {
    const top = hI[0];
    hn--;
    if (hn > 0) {
      const i = hI[hn], f = hF[hn];
      let k = 0;
      for (;;) {
        let c = 2 * k + 1;
        if (c >= hn) break;
        if (c + 1 < hn && hF[c + 1] < hF[c]) c++;
        if (hF[c] >= f) break;
        hI[k] = hI[c]; hF[k] = hF[c];
        k = c;
      }
      hI[k] = i; hF[k] = f;
    }
    return top;
  }

  // True if every tile the segment touches is free and no costlier than `maxCost` (so straightening never
  // drags a dry path through water or lava); a segment through a tile corner needs both side tiles free.
  let cost = null, maxCost = 255;
  function rayFree(b, w, h, x0, y0, x1, y1) {
    let tx = Math.floor(x0), ty = Math.floor(y0);
    const ex = Math.floor(x1), ey = Math.floor(y1);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h || ex < 0 || ey < 0 || ex >= w || ey >= h) return false;
    if (b[ty * w + tx] || cost[ty * w + tx] > maxCost) return false;
    const dx = x1 - x0, dy = y1 - y0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const ddx = dx !== 0 ? Math.abs(1 / dx) : Infinity, ddy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let mx = dx > 0 ? (tx + 1 - x0) * ddx : (dx < 0 ? (x0 - tx) * ddx : Infinity);
    let my = dy > 0 ? (ty + 1 - y0) * ddy : (dy < 0 ? (y0 - ty) * ddy : Infinity);
    while (tx !== ex || ty !== ey) {
      if (tx !== ex && ty !== ey && Math.abs(mx - my) < 1e-9) {
        if (b[ty * w + tx + sx] || b[(ty + sy) * w + tx] || cost[ty * w + tx + sx] > maxCost || cost[(ty + sy) * w + tx] > maxCost) return false;
        tx += sx; ty += sy; mx += ddx; my += ddy;
      } else if (ty === ey || (tx !== ex && mx < my)) { tx += sx; mx += ddx; } else { ty += sy; my += ddy; }
      if (b[ty * w + tx] || cost[ty * w + tx] > maxCost) return false;
    }
    return true;
  }

  // Can a body walk straight between two tile centres? Centre line plus one line each side.
  function walkLine(b, w, h, a, c) {
    maxCost = Math.max(cost[a], cost[c]);
    const ax = (a % w) + 0.5, ay = ((a / w) | 0) + 0.5, cx = (c % w) + 0.5, cy = ((c / w) | 0) + 0.5;
    if (!rayFree(b, w, h, ax, ay, cx, cy)) return false;
    const dx = cx - ax, dy = cy - ay, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1.01) return true;
    const ox = -dy / len * BODY, oy = dx / len * BODY;
    return rayFree(b, w, h, ax + ox, ay + oy, cx + ox, cy + oy) && rayFree(b, w, h, ax - ox, ay - oy, cx - ox, cy - oy);
  }

  // A blocked goal (chest, wall, NPC stall) resolves to the nearest free tile around it.
  function nearestFree(b, w, h, tx, ty, sx, sy) {
    let best = -1, bestS = Infinity;
    for (let r = 1; r <= 3 && best < 0; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
          const x = tx + ox, y = ty + oy;
          if (x < 0 || y < 0 || x >= w || y >= h || b[y * w + x]) continue;
          const s = (ox * ox + oy * oy) * 16 + Math.abs(x - sx) + Math.abs(y - sy) + (cost[y * w + x] - 1) * 8;
          if (s < bestS) { bestS = s; best = y * w + x; }
        }
      }
    }
    return best;
  }

  // Returns waypoints (tile centres) from just after the start tile to the goal tile, or null if the goal
  // cannot be reached. If the node cap runs out first, returns the path to the explored tile closest to the goal.
  W.findPath = function (map, sx, sy, tx, ty, maxNodes) {
    if (maxNodes === undefined) maxNodes = 2000;
    const w = map.w, h = map.h, n = w * h;
    sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
    if (tx < 0) tx = 0; else if (tx >= w) tx = w - 1;
    if (ty < 0) ty = 0; else if (ty >= h) ty = h - 1;
    const grid = W._grid(map), b = grid.blocked;
    cost = grid.cost;
    const start = sy * w + sx;
    let goal = ty * w + tx;
    if (b[goal]) {
      goal = nearestFree(b, w, h, tx, ty, sx, sy);
      if (goal < 0) return null;
      tx = goal % w; ty = (goal / w) | 0;
    }
    if (goal === start) return [{ x: tx + 0.5, y: ty + 0.5 }];

    ensure(n);
    if (++stamp > 0xfffffff0) { seen.fill(0); closed.fill(0); stamp = 1; }
    hn = 0;
    const hx0 = Math.abs(sx - tx), hy0 = Math.abs(sy - ty);
    let best = start, bestH = hx0 + hy0 + (SQRT2 - 2) * Math.min(hx0, hy0);
    gCost[start] = 0; parent[start] = -1; seen[start] = stamp;
    push(start, bestH);
    let found = false, expanded = 0, capped = false;

    while (hn > 0) {
      const cur = pop();
      if (closed[cur] === stamp) continue;
      closed[cur] = stamp;
      if (cur === goal) { found = true; break; }
      if (++expanded > maxNodes) { capped = true; break; }
      const cx = cur % w, cy = (cur / w) | 0, g = gCost[cur];
      for (let d = 0; d < 8; d++) {
        const nx = cx + DX[d], ny = cy + DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (b[ni] || closed[ni] === stamp) continue;
        if (d >= 4 && (b[cy * w + nx] || b[ny * w + cx])) continue;      // no cutting corners
        const ng = g + (d >= 4 ? SQRT2 : 1) * cost[ni];
        if (seen[ni] === stamp && ng >= gCost[ni]) continue;
        seen[ni] = stamp; gCost[ni] = ng; parent[ni] = cur;
        const hx = Math.abs(nx - tx), hy = Math.abs(ny - ty);
        const hh = hx + hy + (SQRT2 - 2) * Math.min(hx, hy);
        if (hh < bestH) { bestH = hh; best = ni; }
        if (hn >= hCap) { capped = true; break; }
        push(ni, ng + hh * H_WEIGHT);
      }
      if (capped) break;
    }

    let end = goal;
    if (!found) {
      if (!capped || best === start) return null;
      // No real progress (target across a gap/pool): report unreachable so AI leashes instead of staring at the lip.
      const bdx = (best % w) - sx, bdy = ((best / w) | 0) - sy;
      if (bdx * bdx + bdy * bdy < 2.25) return null;
      end = best;
    }

    // chain[0..len-1] = start ... end
    let len = 0;
    for (let i = end; i >= 0; i = parent[i]) chain[len++] = i;
    for (let i = 0, j = len - 1; i < j; i++, j--) { const t = chain[i]; chain[i] = chain[j]; chain[j] = t; }

    const out = [];
    let a = 0;
    while (a < len - 1) {
      let nxt = a + 1;
      for (let j = Math.min(len - 1, a + 14); j > a + 1; j--) {
        if (walkLine(b, w, h, chain[a], chain[j])) { nxt = j; break; }
      }
      const c = chain[nxt];
      out.push({ x: (c % w) + 0.5, y: ((c / w) | 0) + 0.5 });
      a = nxt;
    }
    return out;
  };
})();
