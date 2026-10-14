// G.world.generateTown: the hub "Emberfall". The layout is fixed; the seed only moves trees and bushes.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C, T = C.TILE;
  const W = G.world;
  const gen = W._gen;

  const SIZE = 40;
  const LAMP = 4;

  W.generateTown = function (seed) {
    seed = (seed >>> 0) || 1;
    const rng = G.rng.create(seed ^ 0x7E3B5EED);
    const w = SIZE, h = SIZE, n = w * h;
    const tiles = new Uint8Array(n).fill(T.GRASS);
    const occ = new Uint8Array(n);            // bit 0: solid prop, bit 1: anything placed / reserved
    const props = [], spawns = [];

    const rect = function (x, y, rw, rh, t) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) tiles[j * w + i] = t;
    };
    const prop = function (type, x, y, solid, extra) {
      const p = { type, x, y, solid };
      if (extra) Object.assign(p, extra);
      props.push(p);
      occ[y * w + x] |= solid ? 3 : 2;
    };
    const npc = function (role, x, y) {
      spawns.push({ x, y, kind: 'npc', role });
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) occ[(y + oy) * w + x + ox] |= 2;   // elbow room
    };

    // Plaza and the four roads.
    rect(14, 14, 13, 13, T.PATH);
    for (const c of [[14, 14], [26, 14], [14, 26], [26, 26]]) tiles[c[1] * w + c[0]] = T.GRASS;
    rect(19, 4, 3, 10, T.PATH);       // north, to the dungeon
    rect(19, 27, 3, 10, T.PATH);      // south gate
    rect(3, 19, 11, 3, T.PATH);       // west
    rect(27, 19, 10, 3, T.PATH);      // east

    // Dungeon entrance: a crypt front at the north edge.
    rect(17, 1, 7, 2, T.WALL);
    rect(17, 3, 3, 1, T.WALL);
    rect(21, 3, 3, 1, T.WALL);
    tiles[3 * w + 20] = T.PATH;
    prop('dungeon_entrance', 20, 3, true, { interact: 'dungeon_entrance', light: LAMP });
    prop('torch', 18, 4, false, { light: LAMP });
    prop('torch', 22, 4, false, { light: LAMP });
    prop('sign', 22, 6, true);

    // Plaza: fountain in the middle, waypoint beside it, lamps in the corners, a campfire to sit by.
    // The old well, where the town's heat came from: now a glowing rift fissure in the middle of the plaza, ringed by shards.
    const fissure = [[19, 19], [20, 19], [19, 20], [20, 20], [21, 20]];
    for (const c of fissure) tiles[c[1] * w + c[0]] = T.CHASM;
    for (const c of [[18, 18], [20, 18], [21, 19], [22, 19], [18, 20], [22, 18]]) if (tiles[c[1] * w + c[0]] === T.PATH) tiles[c[1] * w + c[0]] = T.RUBBLE;
    for (const c of fissure) occ[c[1] * w + c[0]] |= 3;
    for (const c of [[18, 19], [22, 20], [21, 18], [19, 18]]) prop('crystal', c[0], c[1], true, { light: 4, look: 'rift_shard', corrupt: 0.4, tint: W.riftInfo(0.08).glow });
    prop('waypoint', 23, 17, false, { interact: 'waypoint', light: 3 });
    for (const c of [[15, 15], [25, 15], [15, 25], [25, 25]]) prop('torch', c[0], c[1], false, { light: LAMP });
    prop('campfire', 16, 23, true, { light: LAMP });

    // Elder (north-west): house, notice board.
    rect(8, 5, 6, 4, T.WALL);
    rect(8, 9, 12, 2, T.PATH);
    npc('elder', 11, 9);
    prop('sign', 13, 9, true);

    // Mystic (north-east): house flanked by crystals.
    rect(27, 5, 5, 4, T.WALL);
    rect(21, 9, 11, 2, T.PATH);
    npc('mystic', 29, 9);
    prop('crystal', 27, 9, true, { light: 3 });
    prop('crystal', 31, 9, true, { light: 3 });

    // Blacksmith (west): forge fire and stock outside the smithy.
    rect(6, 12, 6, 5, T.WALL);
    rect(6, 17, 7, 2, T.PATH);
    npc('blacksmith', 9, 17);
    prop('campfire', 11, 17, true, { light: LAMP });
    prop('barrel', 7, 17, true);
    prop('crate', 6, 17, true);

    // Merchant (east): market stalls in front of the storehouse.
    rect(28, 12, 7, 4, T.WALL);
    rect(28, 17, 7, 2, T.PATH);
    for (const x of [29, 31, 33]) prop('stall', x, 16, true);
    npc('merchant', 31, 17);
    prop('crate', 34, 17, true);
    prop('barrel', 28, 17, true);

    // Healer (south-west): the well.
    rect(7, 25, 6, 4, T.WALL);
    rect(9, 22, 5, 3, T.PATH);
    npc('healer', 10, 23);
    prop('well', 12, 23, true, { look: 'capped', corrupt: 0.3 });     // the healer's well, sealed with stone since the rift opened

    // Stashkeeper (south-east): the stash chest right beside them.
    rect(28, 25, 6, 4, T.WALL);
    rect(27, 22, 6, 3, T.PATH);
    npc('stashkeeper', 30, 23);
    prop('stash', 31, 23, true, { interact: 'stash' });

    // Two more homes along the south road.
    rect(13, 30, 4, 4, T.WALL);
    rect(24, 30, 4, 4, T.WALL);
    prop('sign', 22, 35, true);
    prop('barrel', 17, 31, true);
    prop('crate', 23, 31, true);

    // Player arrives south of the fountain. Keep the tiles around the spawn clear — core drops the
    // return portal at (spawn.x + 1, spawn.y - 1).
    const spawn = { x: 20, y: 23 };
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) occ[(spawn.y + oy) * w + spawn.x + ox] |= 2;

    // Forest wall around the town, then loose trees and bushes on open grass.
    const grassy = function (x, y, pad) {
      for (let oy = -pad; oy <= pad; oy++) {
        for (let ox = -pad; ox <= pad; ox++) {
          const X = x + ox, Y = y + oy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          if (tiles[Y * w + X] !== T.GRASS) return false;
        }
      }
      return true;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x !== 0 && y !== 0 && x !== w - 1 && y !== h - 1) continue;
        if (tiles[y * w + x] === T.GRASS && !occ[y * w + x]) prop('tree', x, y, true);
      }
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (x !== 1 && y !== 1 && x !== w - 2 && y !== h - 2) continue;
        if (occ[y * w + x] || !grassy(x, y, 0)) continue;
        const roll = rng.next();
        if (roll < 0.55) { if (gen.ringOK(tiles, w, h, occ, x, y)) prop('tree', x, y, true); }
        else if (roll < 0.8) prop('bush', x, y, false);
      }
    }
    for (let k = 70, guard = 1500; k > 0 && guard > 0; guard--) {
      const x = rng.int(2, w - 3), y = rng.int(2, h - 3);
      if (occ[y * w + x] || !grassy(x, y, 1)) continue;
      if (rng.chance(0.55)) { if (!gen.ringOK(tiles, w, h, occ, x, y)) continue; prop('tree', x, y, true); }
      else prop('bush', x, y, false);
      k--;
    }

    const corruption = W.corruptionForDepth(0), rift = W.riftInfo(corruption);
    const sources = fissure.map(function (c) { return { x: c[0], y: c[1], r: 5, s: 0.7 }; });
    const taint = W._paintTaint(tiles, w, h, seed, 0, sources);
    return {
      w, h, kind: 'town', depth: 0, theme: 'town', seed,
      corruption, rift, taint,
      fissures: [{ x: 19, y: 19, w: 3, h: 2, kind: 'rift', cells: [19, 19, 20, 19, 19, 20, 20, 20, 21, 20] }],
      core: null,
      act: 'town', cleansed: false, camps: [],
      tiles,
      explored: new Uint8Array(n).fill(1),
      visible: new Uint8Array(n).fill(1),
      spawn,
      rooms: [{ x: 14, y: 14, w: 13, h: 13, type: 'start' }],
      spawns,
      props,
    };
  };
})();
