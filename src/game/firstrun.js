// First ten minutes (onboarding). state.flags.fte exists only for heroes started on this build (old saves never get it, so
// nothing below touches them): { v, floor (depths 1-2 are still the gentle ones), town (no first return to town yet),
// upgrade (the guaranteed first upgrade dropped), kills (on the first floor), flasks (times the belt was topped up) }.
// The rules: a starting skill (auto-build Balanced) and five flasks; until depth 3 is reached, a short depth 1 and a thinner
// depth 2 (world reads flags.fte.floor into map.inputs.first) whose monsters hit ×0.75; a guaranteed early weapon upgrade; a
// faint Echo on shallow corpse runs (echo.js asks game.faintEcho); three flasks after an early death.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U;

  const UPGRADE_KILL = 2;         // the first floor's second kill drops a weapon upgrade for your class
  const FAINT_DEPTH = 3;          // corpse runs this shallow meet a faint Echo
  const FLASK_LEVEL = 6;          // up to this level, rising in town after a death tops the belt up to FLASKS
  const FLASKS = 3;
  const START_FLASKS = 5;         // a new hero's belt (the starter kit gives 3)
  const FIRST_DMG = 0.75;         // monsters on the gentle floors hit this much as hard

  game.fte = function () {
    const f = G.state.flags;
    return f && f.fte && typeof f.fte === 'object' ? f.fte : null;
  };

  // Called once by the UI right after G.scenes.startNewGame (the hero exists, the opening has not played yet).
  game.beginOnboarding = function () {
    const S = G.state, p = S.player;
    if (!p) return;
    S.flags.fte = { v: 1, floor: true, town: true, upgrade: false, kills: 0 };
    p.potions.hp = Math.max(p.potions.hp | 0, START_FLASKS);
    // a first skill on the bar from the start: auto-build Balanced spends the starting point (Skills → Manual undoes it)
    S.flags.fte.quiet = true;
    try { if (!p.autoBuild && p.skillPoints > 0) game.setAutoBuild('balanced'); } finally { delete S.flags.fte.quiet; }
  };

  // A faint Echo: a shallow corpse run is a lesson, not a wall (echo.js scales its Echo by this).
  game.faintEcho = function (depth) { return !!game.fte() && (depth | 0) <= FAINT_DEPTH; };

  function classWeapon(p) {
    const I = G.items, D = I && I.data;
    if (!D || !D.BASES || !I.rollItem || !I.verdict) return null;
    const prof = D.classProfile ? D.classProfile(p) : null, types = prof && prof.weapons ? prof.weapons : null;
    const bases = Object.keys(D.BASES).map(function (k) { return D.BASES[k]; })
      .filter(function (b) { return b.slot === 'weapon' && (!types || types.indexOf(b.weaponType) >= 0) && (b.tier | 0) === 0; });
    for (let i = 0; i < 16 && bases.length; i++) {
      const b = bases[i % bases.length];
      const it = I.rollItem({ level: 1, rarity: 'uncommon', baseId: b.id });
      if (it && I.verdict(it) === 'up') return it;
    }
    return null;
  }

  G.on('monster:killed', function (e) {
    const S = G.state, f = game.fte(), m = e && e.monster;
    if (!f || !f.floor || f.upgrade || S.scene !== 'dungeon' || S.depth !== 1 || !m || (m.faction && m.faction !== 'enemy')) return;
    f.kills = (f.kills | 0) + 1;
    if (f.kills < UPGRADE_KILL) return;
    f.upgrade = true;
    const it = classWeapon(S.player);
    if (!it || !G.items.dropItemAt) return;
    G.items.dropItemAt(m.x, m.y, it);
    U.sfx('loot_rare');
    G.emit('fx:spawn', { type: 'lootbeam', x: m.x, y: m.y, color: (G.C.RARITY[it.rarity] || {}).color });
  });

  let diedAt = -1;
  G.on('player:died', function () { diedAt = G.state.time || 0; });
  G.on('scene:changed', function (e) {
    const S = G.state, f = game.fte(), p = S.player;
    if (!f || !e || !p) return;
    // the gentle floors (map.inputs.first, depths 1-2 until depth 3 is reached) also hit a little softer: R18 tuned every depth
    // so that standing in a pack kills in ~4 s, which is a fair lesson at depth 4, not in the first five minutes
    if (e.scene === 'dungeon' && e.map && e.map.inputs && e.map.inputs.first) {
      for (const m of S.entities) if (m.type === 'monster' && !m.echo && m.rarity !== 'boss' && !m.fteSoft) { m.fteSoft = true; m.dmgMin *= FIRST_DMG; m.dmgMax *= FIRST_DMG; }
    }
    if (e.scene === 'dungeon' && (e.depth | 0) >= 3) f.floor = false;           // depth 1 stays the short, gentle floor until you first reach depth 3
    if (e.scene !== 'town') return;
    if (S.flags.visits > 0) f.town = false;                                    // back from below: the rest of town opens up
    if (diedAt >= 0 && p.level <= FLASK_LEVEL && (p.potions.hp | 0) < FLASKS) {
      p.potions.hp = FLASKS;
      f.flasks = (f.flasks | 0) + 1;
      G.emit('fte:flasks', { count: FLASKS });
    }
    diedAt = -1;
  });
})();
