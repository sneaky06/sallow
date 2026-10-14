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
    const aw = core ? 17 : 15, ah = core ? 17 : rng.int(13, 15);
    const ax = bx0 + (core ? 1 : 3), ay = rng.int(3, h - 3 - ah);
    const acx = ax + (aw >> 1), acy = ay + (ah >> 1);
    const ex = ax + aw + (core ? 3 : 2), ey = acy - 2;
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
          if (nx * nx + ny * ny < 1 - (th === 'caves' ? rng.range(0, 0.16) : 0)) tiles[y * w + x] = T.FLOOR;
        }
      }
      for (let y = ey; y < ey + 5; y++) {
        for (let x = ex; x < ex + 5; x++) {
          if ((x - ex - 2) * (x - ex - 2) + (y - acy) * (y - acy) <= 5.5) tiles[y * w + x] = T.FLOOR;
        }
      }
      if (core) {         // six 2x2 rift pits on a ring, offset so the entrance and exit rows stay open
        for (let k = 0; k < 6; k++) {
          const a = (30 + k * 60) * Math.PI / 180, px = Math.round(acx + Math.cos(a) * 4.8 - 0.5), py = Math.round(acy + Math.sin(a) * 4.8 - 0.5);
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
          for (let x = ax; x < ax + aw; x++) if (tiles[y * w + x] === T.FLOOR && rng.chance(0.05)) tiles[y * w + x] = T.RUBBLE;
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
