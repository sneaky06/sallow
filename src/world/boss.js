// Boss complex for boss floors: [main area] → entrance → ARENA → exit passage → exit room (stairs down).
// Stamped into the reserved strip east of ctx.mx1 and locked, so the only way to the exit room is across the arena.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE;
  const gen = G.world._gen, WALK = gen.DRY;      // dry footing only

  gen.BOSS_STRIP = 27;      // columns reserved east of the main area

  gen.stampBoss = function (ctx) {
    const rng = ctx.rng, w = ctx.w, h = ctx.h, tiles = ctx.tiles, th = ctx.theme;
    const bx0 = ctx.mx1 + 1;
    const core = !!ctx.isCore;                 // the rift core: a big round platform ringed by pits (abyss floors only)
    const aw = core ? 17 : 15, ah = core ? 17 : 15;       // R16: fixed hand-designed arenas, no per-seed variation (only the floor's orientation)
    const ax = bx0 + (core ? 1 : 3), ay = (h - ah) >> 1;
    const acx = ax + (aw >> 1), acy = ay + (ah >> 1);
    const ex = ax + aw + 2, ey = acy - 2;
    const organic = core || th === 'caves' || th === 'abyss';

    for (let y = 0; y < h; y++) for (let x = bx0; x < w; x++) ctx.lock[y * w + x] = 1;

    // Passage tiles: forced open, kept free of props; `open` also lets connectivity repair attach to them.
    const pass = function (x, y, tile, open) {
      const i = y * w + x;
      if (!WALK[tiles[i]]) tiles[i] = tile;
      ctx.prot[i] = 1;
      if (open) ctx.lock[i] = 0;
    };

    if (organic) {
      const rx = core ? 8.4 : 7.4, ry = ah / 2 - 0.1;
      for (let y = ay; y < ay + ah; y++) {
        for (let x = ax; x < ax + aw; x++) {
          const nx = (x - acx) / rx, ny = (y - acy) / ry;
          if (nx * nx + ny * ny < 1 - (th === 'caves' ? 0.07 * (1 + Math.cos(x * 2.1 + y * 1.3)) : 0)) tiles[y * w + x] = T.FLOOR;
        }
      }
      for (let y = ey; y < ey + 5; y++) {
        for (let x = ex; x < ex + 5; x++) {
          if ((x - ex - 2) * (x - ex - 2) + (y - acy) * (y - acy) <= 5.5) tiles[y * w + x] = T.FLOOR;
        }
      }
      if (th === 'caves' && !core) {         // brood pit: four acid pools
        for (let k = 0; k < 4; k++) gen.rect(ctx, acx + (k & 1 ? 3 : -5), acy + (k & 2 ? 2 : -4), 3, 3, T.WATER);
      }
      if (core || th === 'abyss') {         // rift pits on a ring (six at the core, four elsewhere), offset so the entrance and exit rows stay open
        const pn = core ? 6 : 4, pr = core ? 4.8 : 4.4;
        for (let k = 0; k < pn; k++) {
          const a = (core ? 30 + k * 60 : 45 + k * 90) * Math.PI / 180, px = Math.round(acx + Math.cos(a) * pr - 0.5), py = Math.round(acy + Math.sin(a) * pr - 0.5);
          for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) tiles[(py + j) * w + px + i] = T.CHASM;
        }
      }
      const link = th === 'abyss' ? T.BRIDGE : T.FLOOR;
      for (let x = acx; x <= ex + 2; x++) pass(x, acy, link, false);
      for (let x = bx0 - 1; x <= acx; x++) pass(x, acy, link, x < ax);
    } else {
      gen.rect(ctx, ax, ay, aw, ah, T.FLOOR);
      if (th === 'inferno') {
        for (let k = 0; k < 4; k++) {
          gen.rect(ctx, k & 1 ? ax + aw - 4 : ax + 1, k & 2 ? ay + ah - 4 : ay + 1, 3, 3, T.LAVA);
        }
        for (let y = ay; y < ay + ah; y++) {
          for (let x = ax; x < ax + aw; x++) if (tiles[y * w + x] === T.FLOOR && (x + 2 * y) % 7 === 0 && Math.hypot(x - acx, y - acy) > 3) tiles[y * w + x] = T.RUBBLE;
        }
      }
      gen.rect(ctx, ex, ey, 5, 5, T.FLOOR);
      pass(ax + aw, acy, T.DOOR, false);
      pass(ax + aw + 1, acy, T.FLOOR, false);
      pass(ax - 1, acy, T.DOOR, true);
      for (let x = bx0 - 1; x < ax - 1; x++) pass(x, acy, T.FLOOR, true);
      // keep the tiles just inside both arena doors clear
      pass(ax, acy, T.FLOOR, false);
      pass(ax + aw - 1, acy, T.FLOOR, false);
    }

    const arena = gen.room(ax, ay, aw, ah, 'boss');
    arena.cx = acx; arena.cy = acy;
    const exit = gen.room(ex, ey, 5, 5, 'exit');
    exit.cx = ex + 2; exit.cy = acy;
    ctx.rooms.push(arena, exit);
    ctx.exitPos = { x: ex + 2, y: acy };
  };
})();
