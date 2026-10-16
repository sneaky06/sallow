// Scene flow: menu -> town <-> dungeon depths. Owned by the lead. Teams call G.scenes.*, never swap maps themselves.
(function () {
  'use strict';
  const G = window.G;
  const S = G.state;

  // Put the player on a free tile beside the way down (dungeon: STAIRS_DOWN tile; town: the dungeon entrance prop).
  // Never on the stairs tile itself, so arriving doesn't immediately trigger a descent.
  function placeBelow(map) {
    let tx = -1, ty = -1;
    if (map.kind === 'town') {
      const ent = (map.props || []).find(function (p) { return p.type === 'dungeon_entrance'; });
      if (ent) { tx = ent.x; ty = ent.y; }
    } else {
      const T = G.C.TILE.STAIRS_DOWN;
      for (let i = 0; i < map.tiles.length; i++) if (map.tiles[i] === T) { tx = i % map.w; ty = (i / map.w) | 0; break; }
    }
    if (tx < 0) return;
    let best = null, bd = 1e9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = tx + dx, y = ty + dy;
      if ((dx || dy) && map.tiles[y * map.w + x] !== G.C.TILE.STAIRS_DOWN && G.world.isWalkable(map, x, y)) {
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = { x: x, y: y }; }
      }
    }
    if (!best && G.world.findFreeTileNear) best = G.world.findFreeTileNear(map, tx, ty, 6);
    if (best) { S.player.x = best.x + 0.5; S.player.y = best.y + 0.5; }
  }

  // arrive: where the player appears — default map.spawn (top of the stairs down from above);
  // 'below' = next to the stairs down (climbing up from the floor below), or the dungeon entrance in town.
  function loadMap(map, scene, depth, arrive) {
    S.map = map;
    S.scene = scene;
    S.depth = depth;
    S.entities = [];
    S.projectiles = [];
    S.groundItems = [];
    if (S.player && map) {
      S.player.x = map.spawn.x + 0.5;
      S.player.y = map.spawn.y + 0.5;
      if (arrive === 'below') placeBelow(map);
    }
    if (map && G.game && G.game.spawnMapEntities) G.game.spawnMapEntities(map);
    S.paused = false;
    G.emit('scene:changed', { scene, depth, map });
    if (G.meta && G.meta.save) G.meta.save();
  }

  const scenes = {
    startNewGame(classId, name) {
      S.seed = (Date.now() & 0x7fffffff) || 1;
      S.flags = { maxDepth: 1, waypoints: [1], portalDepth: 0, visits: 0, kills: 0, deaths: 0, corpse: null, sealed: false };
      S.quests = {};
      S.stash = [];
      S.time = 0;
      S.player = G.game.createPlayer(classId, name);
      if (G.items && G.items.grantStarterGear) G.items.grantStarterGear(S.player);
      G.game.recomputeStats(S.player);
      S.player.hp = S.player.stats.hpMax;
      S.player.mp = S.player.stats.mpMax;
      if (G.meta && G.meta.initQuests) G.meta.initQuests();
      scenes.enterTown();
    },

    // Returns false if there is no usable save.
    continueGame() {
      if (!(G.meta && G.meta.load && G.meta.load())) return false;
      G.game.recomputeStats(S.player);
      scenes.enterTown();
      return true;
    },

    enterTown(arrive) {
      const map = G.world.generateTown(S.seed);
      if (S.flags.portalDepth > 0) {
        map.props.push({ type: 'portal', x: map.spawn.x + 1, y: map.spawn.y - 1, solid: false, interact: 'portal' });
      }
      if (G.items && G.items.refreshVendors) G.items.refreshVendors(S.player ? S.player.level : 1);
      loadMap(map, 'town', 0, arrive);
    },

    enterDungeon(depth, arrive) {
      depth = Math.max(1, depth | 0);
      S.flags.visits++;
      if (depth > S.flags.maxDepth) S.flags.maxDepth = depth;
      // The floor you died on is rebuilt from its original seed so the corpse is where you left it.
      const corpse = S.flags.corpse;
      const here = corpse && corpse.depth === depth;
      const seed = here ? corpse.seed : (S.seed + depth * 7919 + S.flags.visits * 104729) >>> 0;
      // A corpse floor is rebuilt with the inputs it was generated with (cleansed acts, generator version), so it comes back identical.
      const map = here && corpse.inputs ? G.world.generateDungeon(depth, seed, { inputs: corpse.inputs }) : G.world.generateDungeon(depth, seed);
      if (here) {
        // Older corpses (no stored inputs) may land in rock if the floor changed: move them to the nearest reachable dry tile.
        const spot = G.world.safeSpot ? G.world.safeSpot(map, corpse.x, corpse.y) : null;
        if (spot) { corpse.x = spot.x; corpse.y = spot.y; }
        map.props.push({ type: 'corpse', x: Math.floor(corpse.x), y: Math.floor(corpse.y), solid: false, interact: 'corpse', light: 2 });
        if (G.world.invalidate) G.world.invalidate(map);
      }
      loadMap(map, 'dungeon', depth, arrive);
    },

    // Take back everything left on the corpse. Items that don't fit are dropped at the player's feet.
    reclaimCorpse() {
      const corpse = S.flags.corpse, p = S.player;
      if (!corpse || !p) return;
      S.flags.corpse = null;
      p.gold += corpse.gold;
      for (const item of corpse.items) {
        if (!(G.items && G.items.addToInventory && G.items.addToInventory(item))) {
          if (G.items && G.items.dropItemAt) G.items.dropItemAt(p.x, p.y, item);
        }
      }
      if (S.map) {
        S.map.props = S.map.props.filter(function (pr) { return pr.type !== 'corpse'; });
        if (G.world.invalidate) G.world.invalidate(S.map);
      }
      G.emit('gold:changed', { gold: p.gold, delta: corpse.gold });
      G.emit('inventory:changed', {});
      G.emit('sfx', { name: 'loot_rare' });
      G.emit('ui:toast', { text: 'Belongings recovered', color: '#ffe45b' });
    },

    descend() { scenes.enterDungeon(S.depth + 1); },

    ascend() {
      if (S.depth <= 1) scenes.enterTown('below');
      else scenes.enterDungeon(S.depth - 1, 'below');
    },

    // Town Portal: leave the dungeon, remember the depth; a portal prop in town leads back once.
    townPortal() {
      if (S.scene !== 'dungeon') return;
      S.flags.portalDepth = S.depth;
      scenes.enterTown();
    },

    usePortal() {
      const d = S.flags.portalDepth;
      if (!d) return;
      S.flags.portalDepth = 0;
      scenes.enterDungeon(d);
    },

    unlockWaypoint(depth) {
      if (S.flags.waypoints.indexOf(depth) < 0) {
        S.flags.waypoints.push(depth);
        S.flags.waypoints.sort(function (a, b) { return a - b; });
        G.emit('ui:toast', { text: 'Waypoint unlocked: Depth ' + depth, color: '#7fd4ff' });
      }
    },

    // Save and return to the title screen. scene:changed listeners must tolerate map === null.
    quitToMenu() {
      if (S.player && G.meta && G.meta.save) G.meta.save();
      S.scene = 'menu';
      S.depth = 0;
      S.map = null;
      S.player = null;
      S.entities = [];
      S.projectiles = [];
      S.groundItems = [];
      S.paused = false;
      G.emit('scene:changed', { scene: 'menu', depth: 0, map: null });
    },

    // What the next respawn will cost — the death screen shows this (R8.2).
    // Any death in a dungeon leaves a corpse holding the whole backpack; returning raises your Echo to guard it.
    // Gold: an ordinary death leaves all carried gold on the corpse too; a boss / sealed-room death (noRetrieve)
    // costs a flat 10% instead and the rest stays in your pocket. Equipped gear, belt potions and materials are kept.
    // { retrievable, gold /* on the corpse */, goldLost, items }
    getDeathPenalty() {
      const p = S.player;
      if (!p) return { retrievable: false, gold: 0, goldLost: 0, items: 0 };
      const d = lastDeath;
      const items = p.inventory.filter(Boolean).length;
      if (!d || S.scene !== 'dungeon') return { retrievable: false, gold: 0, goldLost: Math.floor((p.gold || 0) * 0.1), items: 0 };
      if (d.noRetrieve) return { retrievable: items > 0, gold: 0, goldLost: Math.floor((p.gold || 0) * 0.1), items: items };
      return { retrievable: true, gold: p.gold || 0, goldLost: 0, items: items };
    },

    // Called by the death screen. Applies getDeathPenalty(), returns the player to town at full health.
    respawn() {
      const p = S.player;
      if (!p) return;
      const pen = scenes.getDeathPenalty();
      // Any death abandons an unclaimed corpse, including a boss or sealed-room death.
      if (S.flags.corpse) G.emit('ui:toast', { text: 'Your old remains are lost to the dark', color: '#c96a6a' });
      S.flags.corpse = null;
      if (pen.retrievable) {
        S.flags.corpse = { depth: lastDeath.depth, seed: lastDeath.seed, inputs: lastDeath.inputs, x: lastDeath.x, y: lastDeath.y, gold: pen.gold, items: p.inventory.filter(Boolean) };
        p.inventory = p.inventory.map(function () { return null; });
        G.emit('inventory:changed', {});
      }
      const delta = pen.gold + pen.goldLost;
      lastDeath = null;
      p.gold -= delta;
      S.flags.deaths++;
      S.flags.portalDepth = 0;
      G.game.revivePlayer();
      G.emit('gold:changed', { gold: p.gold, delta: -delta });
      scenes.enterTown();
    },
  };

  // Where and how the player last died; the game team sets noRetrieve for boss fights and locked rooms.
  let lastDeath = null;
  G.on('player:died', function (e) {
    const p = S.player;
    if (!p) return;
    const inputs = S.map && G.world.captureInputs ? G.world.captureInputs(S.depth, S.map) : null;
    lastDeath = { noRetrieve: !!(e && e.noRetrieve), depth: S.depth, seed: S.map ? S.map.seed : 0, inputs: inputs, x: p.x, y: p.y };
  });

  // World objects the player controller reports via 'object:interact'.
  G.on('object:interact', function (e) {
    if (!e) return;
    if (e.type === 'stairs_down') scenes.descend();
    else if (e.type === 'stairs_up') scenes.ascend();
    else if (e.type === 'portal') scenes.usePortal();
    else if (e.type === 'corpse') scenes.reclaimCorpse();
    // 'dungeon_entrance' / 'waypoint' open the UI depth picker, which calls enterDungeon(depth).
  });

  // Killing a boss opens the waypoint to the floor below it.
  G.on('monster:killed', function (e) {
    S.flags.kills++;
    if (e && e.monster && e.monster.rarity === 'boss') scenes.unlockWaypoint(S.depth + 1);
  });

  G.scenes = scenes;
})();
