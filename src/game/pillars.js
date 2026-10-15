// Revision 9 pillars: Flow chain (Close Calls → slow motion + a guaranteed crit), shrine bargains (a clear cost for a clear
// reward on this floor), the Scavenger (a rival looter racing you to the best drop) and Ember Heat (our pitch: the slain shed
// embers; sweep through them to stack heat — more damage and better loot — but a hard hit knocks half of it out of you).
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, M = game.MONSTERS, SP = game.SPECIAL;

  // ============================== Flow chain ==============================
  // Close Calls within 8 s of each other build a chain. 3 → Flow: 0.45 s of game time at 35% speed and the next hit is a
  // guaranteed crit. 4 → also every dash charge back. 5+ → also every skill cooldown reset ("FLOW ×n"). The chain resets after
  // 8 s without a Close Call. Slow motion always ends: by its own timer, by a real-time fallback (also while paused), and on
  // death or any scene change.
  const flow = { n: 0, last: -99, t: 0, timer: 0 };
  const SLOW = 0.35, SLOW_T = 0.45;
  function endSlow() {
    flow.t = 0;
    if (flow.timer) { clearTimeout(flow.timer); flow.timer = 0; }
    G.state.timeScale = 1;
  }
  game.endFlow = endSlow;
  game.getFlow = function () { return { chain: flow.n, slow: flow.t > 0 }; };
  game.onCloseCall = function (p) {
    const now = G.state.time;
    flow.n = now - flow.last <= ((p.bonus && p.bonus.flowWindow) || 8) ? flow.n + 1 : 1;          // (+ perk Unbroken Flow)
    flow.last = now;
    G.emit('flow:chain', { count: flow.n });
    if (flow.n < 3) return;
    G.state.timeScale = SLOW;
    flow.t = SLOW_T * ((G.state.player && G.state.player.bonus || {}).flowSlowMult || 1);          // perk Bullet Time
    if (flow.timer) clearTimeout(flow.timer);
    flow.timer = setTimeout(function () { flow.timer = 0; if (G.state.timeScale === SLOW) G.state.timeScale = 1; }, Math.round(flow.t / SLOW * 1000) + 200);
    game.addEffect(p, { id: 'flow_crit', t: 6 });
    if (flow.n >= 4 && game.ctl) { game.ctl.dashN = -1; game.ctl.dashCd = 0; }
    if (flow.n >= 5) for (const id in p.cooldowns) p.cooldowns[id] = 0;
    U.text(p.x, p.y - 1.7, flow.n > 3 ? 'FLOW ×' + flow.n : 'FLOW', '#7fffd4', true);
    U.fx('nova', p.x, p.y, { radius: 2.5, color: '#7fffd4' }); U.sfx('shrine');
    G.emit('flow:start', { chain: flow.n });          // deprecated alias of flow:trigger (kept for one release)
    G.emit('flow:trigger', { chain: flow.n });
    if (game.perkFlow) game.perkFlow(p, flow.n);          // R11 Flow perks
  };
  function tickFlow(dt) {
    if (flow.t > 0 && (flow.t -= dt) <= 0) endSlow();
    if (flow.n && G.state.time - flow.last > ((G.state.player && G.state.player.bonus || {}).flowWindow || 8)) flow.n = 0;
  }
  G.on('scene:changed', function () { endSlow(); flow.n = 0; });
  G.on('player:died', function () { endSlow(); flow.n = 0; });

  // ============================== shrine bargains ==============================
  // Shrines World marks as bargains (prop.bargain: true or a bargain id, shrineKind 'bargain') offer a deal instead of a buff
  // (the deal itself is picked per shrine from the seed unless prop.bargain names one). The game emits
  // shrine:offer { id, name, cost, reward } and waits; G.game.acceptBargain(id) applies it for the rest of the floor,
  // G.game.declineBargain(id) leaves the shrine dark. One bargain per floor. state: G.game.bargain (null or the active deal).
  const BARGAINS = game.BARGAINS = {
    blood_tithe: { name: 'Blood Tithe', cost: 'Lose 25% of your maximum life on this floor.', reward: 'Every kill on this floor drops loot twice.' },
    dry_vow: { name: 'Dry Vow', cost: 'No health potions on this floor.', reward: 'Far better loot on this floor (+200% magic find).' },
    the_hunt: { name: 'The Hunt', cost: 'Something pale is sent after you, now.', reward: 'It carries an Elite: its best drop is at least Legendary Elite.' },
    glass_heart: { name: 'Glass Heart', cost: 'You take double damage on this floor.', reward: '+60% damage and +50% experience on this floor.' },
  };
  game.bargain = null;
  let offer = null;
  function hash(x, y, seed) { let h = (seed | 0) ^ (x * 73856093) ^ (y * 19349663); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
  game.shrineBargain = function (p, prop) {
    const S = G.state, map = S.map;
    if (!map || map.kind !== 'dungeon' || game.bargain || offer || prop.bargainSeen) return false;
    const h = hash(prop.x, prop.y, map.seed);
    if (!prop.bargain && prop.shrineKind !== 'bargain' && prop.shrineKind !== 'corrupt') return false;          // World decides: bargain shrines and rift (corrupt) shrines deal
    if (!G.ui) return false;          // no UI to ask: an ordinary shrine
    const ids = Object.keys(BARGAINS), id = prop.bargain && BARGAINS[prop.bargain] ? prop.bargain : ids[(h >>> 8) % ids.length];
    prop.bargainSeen = true;
    offer = { id: id, prop: prop };
    const B = BARGAINS[id];
    U.sfx('shrine'); U.fx('ring', prop.x + 0.5, prop.y + 0.5, { radius: 1.6, color: '#d03a3a', duration: 0.8 });

    G.emit('shrine:offer', { id: id, name: B.name, cost: B.cost, reward: B.reward });
    return true;
  };
  game.getBargain = function () { return game.bargain; };     // UI reads the active bargain for the depth label
  game.getBargainOffer = function () { return offer ? Object.assign({ id: offer.id }, BARGAINS[offer.id]) : null; };
  game.declineBargain = function (id) {
    if (!offer || (id && id !== offer.id)) return false;
    offer.prop.used = true;
    offer = null;
    return true;
  };
  game.acceptBargain = function (id) {
    const S = G.state, p = S.player;
    if (!offer || (id && id !== offer.id) || !p || p.dead) return false;
    const B = BARGAINS[offer.id], prop = offer.prop;
    prop.used = true;
    game.bargain = { id: offer.id, name: B.name, depth: S.depth };
    offer = null;
    switch (game.bargain.id) {
      case 'blood_tithe': game.bargain.rolls = 2; game.addEffect(p, { id: 'bargain', t: 1e6, mods: { hpMax: -Math.round(p.stats.hpMax * 0.25) } }); break;
      case 'dry_vow': game.bargain.noPotions = true; game.bargain.magicFind = 200; game.addEffect(p, { id: 'bargain', t: 1e6 }); break;
      case 'glass_heart': game.addEffect(p, { id: 'bargain', t: 1e6, taken: 100, dealt: 60, mods: { xpGain: 50 } }); break;
      case 'the_hunt': {
        game.addEffect(p, { id: 'bargain', t: 1e6 });
        const pool = game.THEME_POOLS[S.map.theme] || game.THEME_POOLS.crypt;
        const a = U.rand(0, 6.28), spot = W.free(p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 9, 4) || W.free(p.x + 6, p.y, 6);
        if (spot) {
          const e = game.createMonster(pool[U.rng.int(0, pool.length - 1)], spot.x, spot.y, game.monsterLevel(S.depth) + 3, 'legendary');
          e.ai.st = 'chase'; e.ai.atk = 1; e.huntPrize = true; e.name = 'Sent: ' + e.name;
          S.entities.push(e);
          U.fx('teleport', spot.x, spot.y, { color: '#e8e8e8' });
        }
        break;
      }
    }
    U.toast(B.name + ' — ' + B.cost + ' ' + B.reward, '#d03a3a'); U.sfx('shrine');
    U.fx('nova', p.x, p.y, { radius: 2, color: '#d03a3a' });
    G.emit('shrine:accepted', { id: game.bargain.id, name: B.name });
    return true;
  };
  G.on('scene:changed', function () {
    const p = G.state.player;
    if (game.bargain && p) game.removeEffect(p, 'bargain');
    game.bargain = null; offer = null;
  });

  // Extra loot for a kill (combat.js): bargains + Ember Heat. { rolls, magicFind, floor? }
  game.lootBonus = function (t) {
    const b = game.bargain, heat = game.heatStacks ? game.heatStacks() : 0;
    const out = { rolls: b && b.rolls ? b.rolls : 1, magicFind: (b && b.magicFind ? b.magicFind : 0) + heat * 5 };
    if (t && t.huntPrize) out.floor = 'legendary';
    return out;
  };

  // ============================== the Scavenger ==============================
  // From depth 4, one floor in five (not boss floors, deterministic per seed) carries the Scavenger. He waits out of sight;
  // when a rare-or-better item lies on the ground he announces himself ("The Scavenger has seen it", a gold ring pulses on the
  // item) and runs for it at 80% of your speed. Reach it first and it is yours. If he gets there he grabs it and flees; after
  // 14 s he slips away with everything. Kill him for what he took plus his own stash (a rare-floor drop).
  M.scavenger = { id: 'scavenger', n: 'The Scavenger', arch: 'melee', theme: 'event', hp: 34, dmg: [2, 4], spd: 3, cd: 1.3, wind: 0.35, aggro: 0, xp: 60, armor: 8, r: 0.32,
    atk: 'melee', special: 'scavenger', sprite: { body: 'humanoid', color: '#5a4a2a', accent: '#ffd94a', scale: 1, weapon: 'dagger' }, desc: 'He was here first. He is always here first.' };
  const RANK = function (it) { const r = it && G.C.RARITY[it.rarity]; return r ? r.order : -1; };
  function bestGround(minOrder) {
    let best = null, bo = minOrder - 1;
    for (const g of G.state.groundItems) {
      if (!g.item || g.item.type === 'gold' || g.item.type === 'lore') continue;
      const o = RANK(g.item);
      if (o > bo) { bo = o; best = g; }
    }
    return best;
  }
  SP.scavenger = function (e, def, t, d, dt, p) {
    const ai = e.ai, S = G.state;
    if (!e.stash) e.stash = [];
    if (ai.flee) {          // running with the loot
      ai.flee.t -= dt;
      if (ai.flee.t <= 0) {
        U.fx('smoke', e.x, e.y, {}); U.toast('The Scavenger got away with it.', '#c96a6a');
        const i = S.entities.indexOf(e); if (i >= 0) S.entities.splice(i, 1);
        return true;
      }
      if ((ai.fleeT = (ai.fleeT || 0) - dt) <= 0) {
        ai.fleeT = 0.5;
        const away = Math.atan2(e.y - p.y, e.x - p.x);
        let a = away;
        for (let k = 0; k < 8; k++) { const c = away + U.rand(-1.3, 1.3); if (W.walkable(e.x + Math.cos(c) * 1.5, e.y + Math.sin(c) * 1.5)) { a = c; break; } }
        ai.fleeA = a;
      }
      W.move(e, Math.cos(ai.fleeA) * e.speed * 1.1 * dt, Math.sin(ai.fleeA) * e.speed * 1.1 * dt);
      e.facing = ai.fleeA; if (e.anim !== 'walk') { e.anim = 'walk'; e.animT = 0; }
      return true;
    }
    const minRare = RANK({ rarity: 'rare' });
    let g = ai.goal ? S.groundItems.find(function (q) { return q.id === ai.goal; }) : null;
    if (!g) { g = bestGround(minRare); ai.goal = g ? g.id : 0; if (g) { ai.seen = false; } }
    if (!g) {
      if (e.hp < e.stats.hpMax) return false;          // cornered: he fights
      e.anim = 'idle';
      return true;
    }
    if (!ai.seen) {
      ai.seen = true;
      U.toast('The Scavenger has seen it — ' + (g.item.name || 'something good') + '.', '#ffd94a'); U.sfx('cast');
      G.emit('scavenger:race', { entity: e, ground: g });
    }
    if ((ai.markT = (ai.markT || 0) - dt) <= 0) { ai.markT = 0.6; U.fx('ring', g.x, g.y, { radius: 0.9, color: '#ffd94a', duration: 0.55 }); }
    const gd = Math.hypot(g.x - e.x, g.y - e.y);
    if (gd < 0.6) {
      S.groundItems.splice(S.groundItems.indexOf(g), 1);
      e.stash.push(g.item);
      ai.goal = 0;
      ai.flee = { t: 14 };
      U.text(e.x, e.y - 1.3, 'Mine!', '#ffd94a', true); U.sfx('loot');
      U.toast('The Scavenger grabbed ' + (g.item.name || 'it') + ' — catch him!', '#ff9a3a');
      G.emit('scavenger:grab', { item: g.item, entity: e });
      return true;
    }
    if (!ai.path || (ai.rp = (ai.rp || 0) - dt) <= 0) { ai.path = W.path(e.x, e.y, g.x, g.y, 1500); ai.pi = 0; ai.rp = 0.8; }
    let tx = g.x, ty = g.y;
    if (ai.path && ai.pi < ai.path.length) { const n = ai.path[ai.pi]; if (Math.hypot(n.x - e.x, n.y - e.y) < 0.3) ai.pi++; else { tx = n.x; ty = n.y; } }
    const dx = tx - e.x, dy = ty - e.y, dl = Math.hypot(dx, dy) || 1;
    W.move(e, dx / dl * e.speed * dt, dy / dl * e.speed * dt);
    e.facing = Math.atan2(dy, dx); if (e.anim !== 'walk') { e.anim = 'walk'; e.animT = 0; }
    return true;
  };
  G.on('monster:killed', function (ev) {
    const m = ev && ev.monster, p = G.state.player;
    if (!m || m.monsterId !== 'scavenger' || !p) return;
    for (const it of m.stash || []) if (G.items && G.items.dropItemAt) G.items.dropItemAt(m.x, m.y, it);
    if (G.items && G.items.dropLoot) {
      try { G.items.dropLoot(m.x, m.y, { source: 'rare', level: m.level, magicFind: p.stats.magicFind || 0, goldFind: (p.stats.goldFind || 0) + 100, floor: 'rare', pallor: game.pallorValue ? game.pallorValue() : 0 }); } catch (err) { console.error('[game] dropLoot failed', err); }
    }
    U.toast('The Scavenger\'s stash spills out.', '#ffd94a');
  });
  game.spawnScavenger = function (map) {
    const S = G.state, depth = map.depth | 0;
    let best = null, bd = -1;
    for (let k = 0; k < 120; k++) {
      const x = U.rng.int(1, map.w - 2) + 0.5, y = U.rng.int(1, map.h - 2) + 0.5, dd = Math.hypot(x - map.spawn.x, y - map.spawn.y);
      if (dd > 12 && dd < 40 && dd > bd && W.walkable(x, y)) { bd = dd; best = { x: x, y: y }; }
    }
    if (!best) return null;
    const e = game.createMonster('scavenger', best.x, best.y, game.monsterLevel(depth) + 1, 'normal', null, true);
    e.stats.hpMax = e.hp = Math.round(e.stats.hpMax * 2.5); e.speed = (game.BASE_SPEED || 5) * 0.8; e.ai.st = 'chase'; e.rarity = 'champion'; e.noLoot = true; e.stash = []; e.noLeash = true;
    S.entities.push(e);
    G.emit('scavenger:appear', { entity: e });
    return e;
  };
  G.on('scene:changed', function (ev) {
    const map = ev && ev.map;
    if (!map || ev.scene !== 'dungeon' || (map.depth | 0) < 4 || (map.depth | 0) % G.C.BOSS_EVERY === 0) return;
    const r = G.rng.create(((map.seed | 0) ^ 0x3c6ef372) >>> 0);
    if (r.chance(0.2)) game.spawnScavenger(map);
  });

  // ============================== Ember Heat (our pitch) ==============================
  // 35% of kills shed an ember that hangs where the monster died for 4 s. Sweep through one (within 0.8 tiles) for +1 Heat
  // (max 10): +4% damage and +5% magic find per stack. Heat cools by one every 6 s without a pickup, and any single hit for
  // more than 8% of your life knocks half of it out of you. Embers in G.game.embers (plain data, like wisps).
  const embers = game.embers = [];
  const heat = { n: 0, cool: 0 };
  game.heatStacks = function () { return heat.n; };
  function setHeat(p, n) {
    heat.n = U.clamp(n, 0, (G.state.player && G.state.player.bonus || {}).heatMax || 10);          // perks Last Stand, Pyre Heart
    if (!p) return;
    if (heat.n > 0) game.addEffect(p, { id: 'heat', t: 1e6, stacks: heat.n, dealt: 4 * heat.n });
    else game.removeEffect(p, 'heat');
  }
  G.on('monster:killed', function (ev) {
    const m = ev && ev.monster, S = G.state;
    if (!m || m.faction !== 'enemy' || S.scene !== 'dungeon' || m.isSplit || m.risen || U.rng.next() >= 0.35) return;
    embers.push({ x: m.x, y: m.y, t: 4, pulse: 0 });
  });
  G.on('player:damaged', function (e) {
    const p = G.state.player;
    if (!p || !heat.n || !e || !(e.amount > p.stats.hpMax * 0.08)) return;
    const lost = Math.ceil(heat.n / ((G.state.player && G.state.player.bonus || {}).heatLossDiv || 2));          // perk Forge Heat
    setHeat(p, heat.n - lost);
    U.text(p.x, p.y - 1.4, '-' + lost + ' heat', '#ff9a3a');
  });
  function tickEmbers(p, dt) {
    for (let i = embers.length - 1; i >= 0; i--) {
      const em = embers[i];
      em.t -= dt;
      if ((em.pulse -= dt) <= 0) { em.pulse = 0.4; U.fx('spark', em.x, em.y, { color: '#ff9a3a', radius: 0.4 }); }
      const er = (G.state.player && G.state.player.bonus || {}).emberR || 0.8;          // perk Ember Hunger
      let byMinion = false;
      if ((G.state.player && G.state.player.bonus || {}).minionEmbers) for (const m of game.live.allies) if (!m.dead && Math.hypot(m.x - em.x, m.y - em.y) < 0.8) { byMinion = true; break; }          // perk Pyre
      if (byMinion || (Math.abs(p.x - em.x) < er + 0.1 && Math.abs(p.y - em.y) < er + 0.1 && Math.hypot(p.x - em.x, p.y - em.y) < er)) {
        embers.splice(i, 1);
        setHeat(p, heat.n + 1); heat.cool = (G.state.player && G.state.player.bonus || {}).heatCool || 6;
        U.text(p.x, p.y - 1.2, 'HEAT ' + heat.n, '#ff9a3a');
        continue;
      }
      if (em.t <= 0) embers.splice(i, 1);
    }
    const cool = (G.state.player && G.state.player.bonus || {}).heatCool || 6;          // perks Conflagration, Pyre Heart
    if (heat.n && (heat.cool -= dt) <= 0) { heat.cool = cool; setHeat(p, heat.n - 1); }
  }
  G.on('scene:changed', function () { embers.length = 0; const p = G.state.player; heat.cool = 0; if (p) setHeat(p, 0); else heat.n = 0; });

  // ------------------------------ per frame ------------------------------
  game.updatePillars = function (dt) {
    const S = G.state, p = S.player;
    tickFlow(dt);
    if (game.emberHeirTick) game.emberHeirTick(p);          // the combined relic
    if (!p || p.dead || S.scene !== 'dungeon') return;
    tickEmbers(p, dt);
  };
})();
