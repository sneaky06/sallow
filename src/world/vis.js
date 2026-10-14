// Field of view: recursive shadowcasting over 8 octants. ~250 tiles touched at radius 9.
(function () {
  'use strict';
  const G = window.G;
  const W = G.world = G.world || {};

  const XX = [1, 0, 0, -1, -1, 0, 0, 1], XY = [0, 1, -1, 0, 0, -1, 1, 0];
  const YX = [0, 1, 1, 0, 0, -1, -1, 0], YY = [1, 0, 0, 1, -1, 0, 0, -1];

  // Current call's context (module-level so the recursion allocates nothing).
  let tiles, vis, exp, opq, mw = 0, mh = 0, ox = 0, oy = 0, rad = 0, rad2 = 0;

  function cast(row, start, end, xx, xy, yx, yy) {
    if (start < end) return;
    let newStart = 0;
    for (let j = row; j <= rad; j++) {
      let blocked = false;
      const dy = -j;
      for (let dx = -j; dx <= 0; dx++) {
        const lSlope = (dx - 0.5) / (dy + 0.5), rSlope = (dx + 0.5) / (dy - 0.5);
        if (start < rSlope) continue;
        if (end > lSlope) break;
        const X = ox + dx * xx + dy * xy, Y = oy + dx * yx + dy * yy;
        const inside = X >= 0 && Y >= 0 && X < mw && Y < mh;
        const i = Y * mw + X;
        if (inside && dx * dx + dy * dy <= rad2) { vis[i] = 1; exp[i] = 1; }
        const solid = !inside || opq[tiles[i]] === 1;
        if (blocked) {
          if (solid) { newStart = rSlope; continue; }
          blocked = false;
          start = newStart;
        } else if (solid && j < rad) {
          blocked = true;
          cast(j + 1, start, lSlope, xx, xy, yx, yy);
          newStart = rSlope;
        }
      }
      if (blocked) break;
    }
  }

  W.updateVisibility = function (map, px, py, radius) {
    if (radius === undefined) radius = 9;
    if (map.kind === 'town') {             // the hub is always fully lit
      map.visible.fill(1);
      map.explored.fill(1);
      return;
    }
    tiles = map.tiles; vis = map.visible; exp = map.explored; opq = W._opaque(map);
    mw = map.w; mh = map.h;
    ox = Math.floor(px); oy = Math.floor(py);
    rad = Math.ceil(radius);
    rad2 = (radius + 0.5) * (radius + 0.5);
    vis.fill(0);
    if (ox < 0 || oy < 0 || ox >= mw || oy >= mh) return;
    const i = oy * mw + ox;
    vis[i] = 1; exp[i] = 1;
    for (let o = 0; o < 8; o++) cast(1, 1, 0, XX[o], XY[o], YX[o], YY[o]);
  };
})();
