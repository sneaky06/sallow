// The single shared game state. Everything in here must stay plain JSON-able data (no functions, no cycles):
// the save system serialises player / flags / quests / stash directly.
(function () {
  'use strict';
  const G = window.G;

  G.state = {
    scene: 'menu',        // 'menu' | 'town' | 'dungeon'
    paused: false,        // true freezes G.game.update (UI sets this while a full-screen panel is open)
    time: 0,              // seconds of unpaused play
    seed: 1,
    depth: 0,             // 0 = town
    map: null,            // GameMap (world team)
    player: null,         // Player entity (game team)
    entities: [],         // monsters + npcs (NOT the player)
    projectiles: [],
    groundItems: [],      // [{ id, x, y, item }]
    stash: [],            // items team, length C.STASH_SIZE
    quests: {},           // ui/meta team
    flags: { maxDepth: 1, waypoints: [1], portalDepth: 0, visits: 0, kills: 0, deaths: 0, corpse: null, sealed: false },
    settings: { sfx: true, autoPickupGold: true, lootFilter: 'common', showDamage: true,
      // What the player counts as junk (R3.1). maxRarity 'none' = nothing is junk.
      junk: { maxRarity: 'common', action: 'sell', auto: false, keepUpgrades: true, keepSocketed: true } },
  };

  // Live input, polled by the player controller. Engine writes move; UI writes attackHeld.
  G.input = {
    move: { x: 0, y: 0 },   // desired WORLD-space direction, magnitude 0..1 (joystick / WASD)
    attackHeld: false,
  };

  let nextId = 1;
  G.newId = function () { return nextId++; };
  G.bumpId = function (min) { if (min >= nextId) nextId = min + 1; };   // after loading a save
})();
