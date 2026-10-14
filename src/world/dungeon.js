// G.world.generateDungeon: layout → boss complex → connectivity repair → stairs → room roles → props & spawns.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE, WALK = C.WALKABLE;
  const W = G.world;
  const gen = W._gen, DRY = gen.DRY;

  const MAX_ATTEMPTS = 8;

  // Plain floor: room anchors (and therefore stairs, shrines, bosses) never sit on a bridge or in a doorway.
  function solidGround(ctx, x, y) {
    const t = gen.at(ctx, x, y);
    return t === T.FLOOR || t === T.RUBBLE;
  }

  function nearestWalkable(ctx, r) {
    let best = null, bd = Infinity;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (!solidGround(ctx, x, y)) continue;
        const d = (x - r.cx) * (x - r.cx) + (y - r.cy) * (y - r.cy);
        if (d < bd) { bd = d; best = { x, y }; }
      }
    }
    return best;
  }

  function count(dist) {
    let c = 0;
    for (let i = 0; i < dist.length; i++) if (dist[i] >= 0) c++;
    return c;
  }

  // Lockdown rooms (CONTRACT R2.5): a room that can be sealed completely by gating at most three door tiles.
  // Every opening in the room's wall ring is narrowed to a single DOOR (the rest walled up); the change is kept
  // only if the room really is sealed by those doors and nothing else on the floor got cut off.
  function tryLockdown(ctx, r) {
    const w = ctx.w, h = ctx.h, tiles = ctx.tiles;
    if (r.w < 5 || r.h < 5 || r.x < 2 || r.y < 2 || r.x + r.w > w - 2 || r.y + r.h > h - 2) return false;
    const inside = function (x, y, pad) { return x >= r.x - pad && y >= r.y - pad && x < r.x + r.w + pad && y < r.y + r.h + pad; };
    if (inside(ctx.spawn.x, ctx.spawn.y, 2) || inside(ctx.exit.x, ctx.exit.y, 2)) return false;
    for (const o of ctx.rooms) if (o !== r && inside(o.cx, o.cy, 1)) return false;
    if (!DRY[tiles[r.cy * w + r.cx]]) return false;

    // The four sides of the ring just outside the rect (corners cannot be entered without cutting a corner).
    const sides = [[], [], [], []];
    for (let x = r.x; x < r.x + r.w; x++) {
      sides[0].push({ i: (r.y - 1) * w + x, inner: r.y * w + x });
      sides[1].push({ i: (r.y + r.h) * w + x, inner: (r.y + r.h - 1) * w + x });
    }
    for (let y = r.y; y < r.y + r.h; y++) {
      sides[2].push({ i: y * w + r.x - 1, inner: y * w + r.x });
      sides[3].push({ i: y * w + r.x + r.w, inner: y * w + r.x + r.w - 1 });
    }
    const runs = [];
    for (const side of sides) {
      let run = null;
      for (const c of side) {
        const t = tiles[c.i];
        if (gen.LIQUID[t] || t === T.STAIRS_UP || t === T.STAIRS_DOWN) return false;
        if (t === T.BRIDGE && ctx.theme !== 'abyss') return false;      // a bridge over water/lava cannot become a door
        if (DRY[t]) { if (!run) runs.push(run = []); run.push(c); } else run = null;
      }
    }
    if (!runs.length || runs.length > 3) return false;

    const before = tiles.slice();
    const dryBefore = count(gen.flood(ctx, ctx.spawn.x, ctx.spawn.y));
    const walkBefore = count(gen.flood(ctx, ctx.spawn.x, ctx.spawn.y, null, WALK));
    const doors = [], gate = new Uint8Array(ctx.n);
    let walled = 0;
    for (const run of runs) {
      // the door goes on the opening tile nearest the middle that actually leads into the room
      let pick = -1;
      for (let k = 0; k < run.length; k++) {
        if (DRY[tiles[run[k].inner]] && (pick < 0 || Math.abs(k - (run.length >> 1)) < Math.abs(pick - (run.length >> 1)))) pick = k;
      }
      for (let k = 0; k < run.length; k++) {
        if (k === pick) { tiles[run[k].i] = T.DOOR; gate[run[k].i] = 1; doors.push({ x: run[k].i % w, y: (run[k].i / w) | 0 }); }
        else { tiles[run[k].i] = ctx.fill; walled++; }
      }
    }
    let ok = doors.length > 0;
    if (ok) {
      const sealed = gen.flood(ctx, r.cx, r.cy, gate, WALK);
      let n = 0;
      for (let i = 0; i < ctx.n && ok; i++) {
        if (sealed[i] < 0) continue;
        n++;
        if (!inside(i % w, (i / w) | 0, 0)) ok = false;         // leaks past the doors
      }
      if (n < 14) ok = false;
    }
    if (ok) {
      const dry = gen.flood(ctx, ctx.spawn.x, ctx.spawn.y);
      ok = count(dry) === dryBefore - walled && dry[r.cy * w + r.cx] >= 0 && dry[ctx.exit.y * w + ctx.exit.x] >= 0 &&
        count(gen.flood(ctx, ctx.spawn.x, ctx.spawn.y, null, WALK)) === walkBefore - walled;
    }
    if (!ok) { tiles.set(before); return false; }
    for (const d of doors) {
      for (let k = 0; k < 5; k++) ctx.prot[(d.y + (k === 1 ? -1 : k === 2 ? 1 : 0)) * w + d.x + (k === 3 ? -1 : k === 4 ? 1 : 0)] = 1;
    }
    r.type = 'lockdown';
    r.doors = doors;
    r.waves = 2 + Math.min(2, Math.floor(ctx.depth / 8));
    return true;
  }

  function addLockdowns(ctx) {
    if (ctx.isBoss || ctx.depth < 2) return;
    let want = ctx.rng.weighted([{ w: 25, n: 0 }, { w: 50, n: 1 }, { w: 25, n: 2 }]).n;
    const cands = ctx.rng.shuffle(ctx.rooms.filter(function (r) { return r.type === 'normal'; }));
    for (const r of cands) {
      if (want <= 0) break;
      if (tryLockdown(ctx, r)) want--;
    }
  }

  // One generation attempt. Returns a finished ctx, or null if the result fails validation.
  function build(depth, seed, layoutName) {
    const rng = G.rng.create(seed);
    const theme = C.themeForDepth(depth);
    const isBoss = depth % C.BOSS_EVERY === 0;
    const grow = Math.min(14, depth);
    const fallback = layoutName === 'fallback';
    let w, h;
    if (isBoss) {
      w = Math.min(80, rng.int(42, 46) + (grow >> 1) + gen.BOSS_STRIP);
      h = rng.int(48, 54) + (grow >> 1);
    } else {
      w = rng.int(50, 62) + grow;
      h = rng.int(48, 58) + grow;
    }
    const ctx = gen.makeCtx(w, h, rng, depth, theme);
    ctx.isBoss = isBoss;
    if (isBoss) ctx.mx1 = w - gen.BOSS_STRIP - 1;

    gen.layouts[layoutName](ctx);
    if (isBoss) gen.stampBoss(ctx);
    gen.connectAll(ctx, 24);
    if (ctx.afterConnect) ctx.afterConnect();

    // Rooms must have a walkable anchor; drop the ones lava or erosion swallowed.
    ctx.rooms = ctx.rooms.filter(function (r) {
      if (solidGround(ctx, r.cx, r.cy)) return true;
      const p = nearestWalkable(ctx, r);
      if (!p) return false;
      r.cx = p.x; r.cy = p.y;
      return true;
    });
    const plain = ctx.rooms.filter(function (r) { return !r.type; });
    if (plain.length < (fallback ? 2 : 4)) return null;

    // Start: on boss floors the room furthest from the arena (west), otherwise any room.
    let start = plain[0];
    if (isBoss) { for (const r of plain) if (r.cx < start.cx) start = r; } else start = rng.pick(plain);
    start.type = 'start';
    ctx.spawn = { x: start.cx, y: start.cy };
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const x = ctx.spawn.x + ox, y = ctx.spawn.y + oy;
        if (gen.interior(ctx, x, y) && !gen.walk(ctx, x, y) && !ctx.lock[y * ctx.w + x]) ctx.tiles[y * ctx.w + x] = T.FLOOR;
      }
    }
    gen.connectAll(ctx, 24);        // the clearing above may have opened a sealed pocket

    let dist = gen.flood(ctx, ctx.spawn.x, ctx.spawn.y);
    for (let i = 0; i < ctx.n; i++) if (dist[i] < 0 && DRY[ctx.tiles[i]]) ctx.tiles[i] = ctx.fill;
    ctx.rooms = ctx.rooms.filter(function (r) { return dist[r.cy * ctx.w + r.cx] >= 0; });

    // Exit: behind the arena on boss floors, otherwise the room with the longest walk from the start.
    let exitRoom = null;
    if (isBoss) {
      exitRoom = ctx.rooms.find(function (r) { return r.type === 'exit'; });
      if (!exitRoom || !ctx.rooms.some(function (r) { return r.type === 'boss'; })) return null;
    } else {
      for (const r of ctx.rooms) {
        if (r.type) continue;
        if (!exitRoom || dist[r.cy * ctx.w + r.cx] > dist[exitRoom.cy * ctx.w + exitRoom.cx]) exitRoom = r;
      }
      if (!exitRoom) return null;
      exitRoom.type = 'exit';
    }
    ctx.exit = { x: exitRoom.cx, y: exitRoom.cy };
    if (dist[ctx.exit.y * ctx.w + ctx.exit.x] < (fallback ? 1 : 16)) return null;

    // Special rooms among the rest.
    const rest = rng.shuffle(ctx.rooms.filter(function (r) { return !r.type; }));
    let k = 0;
    const take = function (type, count) { for (; count > 0 && k < rest.length; count--) rest[k++].type = type; };
    take('treasure', 1 + (rest.length > 7 ? 1 : 0));
    take('elite', 1 + (depth >= 6 && rest.length > 5 ? 1 : 0));
    take('shrine', rng.chance(0.75) ? 1 : 0);
    for (const r of rest) if (!r.type) r.type = 'normal';

    // Liquids: deep middles, then drop anything that cannot be waded to.
    gen.deepen(ctx);
    gen.pruneLiquid(ctx, gen.flood(ctx, ctx.spawn.x, ctx.spawn.y, null, WALK));

    gen.shell(ctx);
    gen.transform(ctx, rng.int(0, 7));

    const tiles = ctx.tiles, tw = ctx.w, th = ctx.h;
    ctx.n = tw * th;
    const si = ctx.spawn.y * tw + ctx.spawn.x, ei = ctx.exit.y * tw + ctx.exit.x;
    tiles[si] = T.STAIRS_UP;
    tiles[ei] = T.STAIRS_DOWN;
    for (const p of [ctx.spawn, ctx.exit]) {
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) ctx.prot[(p.y + oy) * tw + p.x + ox] = 1;
    }
    addLockdowns(ctx);
    dist = ctx.dist = gen.flood(ctx, ctx.spawn.x, ctx.spawn.y);      // dry ground only: props, spawns and the stairs live here

    // ---- validation ----
    let reach = 0;
    for (let i = 0; i < ctx.n; i++) if (dist[i] >= 0) reach++;
    if (dist[ei] < 0 || reach < (fallback ? 60 : 280)) return null;
    if (isBoss) {
      const arena = ctx.rooms.find(function (r) { return r.type === 'boss'; });
      const mask = new Uint8Array(ctx.n);
      for (let y = arena.y; y < arena.y + arena.h; y++) for (let x = arena.x; x < arena.x + arena.w; x++) mask[y * tw + x] = 1;
      if (gen.flood(ctx, ctx.spawn.x, ctx.spawn.y, mask, WALK)[ei] >= 0) return null;      // exit must lie behind the arena
    }
    return ctx;
  }

  function derive(seed, attempt) {
    return (Math.imul(seed ^ (attempt * 0x9E3779B1), 0x85EBCA6B) + attempt * 0x27D4EB2F) >>> 0;
  }

  W.generateDungeon = function (depth, seed) {
    depth = Math.max(1, depth | 0);
    seed = (seed >>> 0) || 1;
    const theme = C.themeForDepth(depth);
    let ctx = null;
    for (let a = 0; a < MAX_ATTEMPTS && !ctx; a++) {
      try { ctx = build(depth, a ? derive(seed, a) : seed, theme); } catch (err) { console.warn('[world] generation attempt failed', err); }
    }
    if (!ctx) ctx = build(depth, seed, 'fallback');
    if (!ctx) throw new Error('world: could not generate depth ' + depth + ' seed ' + seed);

    const filled = gen.populate(ctx);
    const n = ctx.w * ctx.h;
    const map = {
      w: ctx.w, h: ctx.h, kind: 'dungeon', depth, theme, seed,
      tiles: ctx.tiles,
      explored: new Uint8Array(n),
      visible: new Uint8Array(n),
      spawn: { x: ctx.spawn.x, y: ctx.spawn.y },
      rooms: ctx.rooms.map(function (r) {
        const o = { x: r.x, y: r.y, w: r.w, h: r.h, type: r.type };
        if (r.type === 'lockdown') { o.doors = r.doors; o.waves = r.waves; }
        return o;
      }),
      spawns: filled.spawns,
      props: filled.props,
    };
    W.updateVisibility(map, map.spawn.x + 0.5, map.spawn.y + 0.5);
    return map;
  };
})();
