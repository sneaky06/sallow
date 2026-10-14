// R3.6 monster modifiers (24 common + 6 legendary-only) and R3.7 floor modifiers.
// Modifier names are what lands in entity.affixes; every one has a readable tell (colour + fx) described in `tell`.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS;
  const A = game.AFFIXES;

  const tells = {
    'Fast': 'moves and attacks quickly', 'Extra Strong': 'hits much harder', 'Stalwart': 'far more life and armour',
    'Fire Enchanted': 'burns on hit, explodes on death', 'Frozen': 'chills on hit, frost burst on death', 'Shocking': 'hits shock you',
    'Venomous': 'hits poison', 'Vampiric': 'heals when it hits', 'Teleporter': 'blinks next to its target',
    'Shielding': 'periodically immune (white ring)', 'Thorned': 'melee attackers take damage', 'Regenerating': 'recovers life over time',
  };
  for (const k in tells) A[k].tell = tells[k];

  const add = function (name, color, tell, apply, legendary) { A[name] = { color: color, tell: tell, apply: apply || function () {}, legendary: !!legendary }; };
  const timer = function (key, first) { return function (e) { e.ai.mt = e.ai.mt || {}; e.ai.mt[key] = first; }; };
  add('Mortar', '#ff9a3c', 'lobs marked blasts at you', timer('mortar', 3));
  add('Jailer', '#c9a8ff', 'marks the ground, then roots you', timer('jail', 5));
  add('Molten', '#ff5b2e', 'leaves burning ground behind it', timer('molten', 0.5));
  add('Plagued', '#7be04a', 'surrounded by a poison cloud', timer('plague', 1));
  add('Frenzied', '#ff3b4e', 'attacks faster below half life');
  add('Aura of Might', '#e04a3a', 'nearby monsters hit harder (red pulse)', timer('might', 0.5));
  add('Aura of Haste', '#fff06a', 'nearby monsters move faster (yellow pulse)', timer('haste', 0.5));
  add('Mana Burn', '#6aa8ff', 'hits drain your mana');
  add('Knockback', '#c9c2b0', 'melee hits throw you back');
  add('Volley', '#e8dcb0', 'fires a fan of shots', timer('volley', 4));
  add('Evasive', '#bbbbbb', 'dodges a quarter of all hits', function (e) { e.stats.dodge = 25; });
  add('Armoured', '#9aa0aa', 'shrugs off physical damage', function (e) { e.stats.armor = e.stats.armor * 3 + 30 + e.level * 12; });
  add('Siege', '#d9a05b', 'shells anyone standing still at range', timer('siege', 2));      // R5.5: casters must keep moving
  // legendary-only: one visible mechanic each
  add('Splitting', '#ffb347', 'splits in two when slain', null, true);
  add('Nova', '#ff7a2b', 'charges a huge nova (step out of the ring)', timer('nova', 4), true);
  add('Reflecting', '#d8f4ff', 'mirror shield returns projectiles (blue ring)', timer('reflect', 5), true);
  add('Vortex', '#b98cff', 'drags you to it', timer('vortex', 5), true);
  add('Enraging', '#ff3b4e', 'enrages below 30% life', null, true);
  add('Shadecaller', '#7a5aff', 'summons shades to its side', timer('shades', 6), true);

  game.AFFIX_IDS = Object.keys(A).filter(function (k) { return !A[k].legendary; });
  game.LEGEND_AFFIXES = Object.keys(A).filter(function (k) { return A[k].legendary; });
  game.LEGEND_TITLES = ['Warden of Ash', 'the Last Oath', 'Hunger of the Deep', 'Breaker of Kings', 'the Pale Tide', 'Herald of Embers', 'the Unburied', 'Voice of the Pit',
    'Eater of Names', 'the Long Night', 'Scourge of Emberfall', 'the Thousandth Grave'];

  // Roll and apply modifiers for an elite. `shared` (champion packs) forces the modifier so the pack matches.
  // R5.5: from depth 21 the pool grows with deep-only modifiers (more past 30 and 40), and rares/legendaries usually lead
  // with one of them. R5.2: Pallor tiers add modifiers to rares and legendaries. Neither changes anything above depth 21 at 0 Pallor.
  game.rollAffixes = function (e, rarity, rng, shared) {
    const depth = G.state.map ? Math.max(1, G.state.map.depth | 0) : e.level;
    const pool = game.affixPool ? game.affixPool(depth) : game.AFFIX_IDS.slice();
    rng.shuffle(pool);
    const deep = game.deepAffixes ? game.deepAffixes(depth) : [];
    if (deep.length && rarity !== 'champion' && rng.next() < 0.6) {
      const d = rng.pick(deep);
      pool.splice(pool.indexOf(d), 1); pool.unshift(d);
    }
    const extra = rarity === 'champion' || !game.pallorExtraMods ? 0 : game.pallorExtraMods();
    let list;
    if (rarity === 'champion') list = [shared || pool[0]];
    else if (rarity === 'rare') list = pool.slice(0, rng.int(2, 3) + extra);
    else list = [rng.pick(game.LEGEND_AFFIXES)].concat(pool.slice(0, (e.level >= 14 ? 4 : 3) + extra));
    for (const name of list) { if (e.affixes.indexOf(name) >= 0) continue; e.affixes.push(name); A[name].apply(e); }
    e.hp = e.stats.hpMax;
  };

  function enemyZone(e, x, y, r, delay, mult, dtype, extra) {
    const z = { x: x, y: y, r: r, delay: delay, faction: 'enemy', dmg: (e.dmgMin + e.dmgMax) * 0.5 * mult, dtype: dtype, lvl: e.level, srcId: e.id,
      fx: dtype === 'cold' ? 'frost' : dtype === 'poison' ? 'poison' : 'explosion', color: COL[dtype] };
    if (extra) for (const k in extra) z[k] = extra[k];
    return game.addZone(z);
  }

  // Per-frame behaviour of timed modifiers. t = current target (may be null), d = distance to it.
  game.runModifiers = function (e, t, d, dt) {
    const ai = e.ai, af = e.affixes, mt = ai.mt;
    if (e.frenzyAt === undefined) {
      e.frenzyAt = af.indexOf('Frenzied') >= 0 ? 0.5 : af.indexOf('Enraging') >= 0 ? 0.3 : 0;
    }
    if (e.frenzyAt > 0 && e.hp < e.stats.hpMax * e.frenzyAt) {
      const big = e.frenzyAt < 0.4;
      e.frenzyAt = -1;
      e.atkCd *= big ? 0.6 : 0.65;
      if (big) { e.speed *= 1.35; e.dmgMin *= 1.4; e.dmgMax *= 1.4; U.toast(e.name + ' enrages!', '#ff3b4e'); U.shake(4, 0.3); }
      U.fx('nova', e.x, e.y, { radius: big ? 3 : 1.5, color: '#ff3b4e' });
      U.text(e.x, e.y - 1.4, big ? 'ENRAGED' : 'Frenzy', '#ff3b4e', true);
    }
    if (ai.pull) {              // Vortex in flight
      ai.pull.t -= dt;
      if (ai.pull.t <= 0) {
        const v = game.byId(ai.pull.id);
        ai.pull = null;
        if (v && !v.dead && !game.getEffect(v, 'invuln')) {
          const dist = Math.hypot(v.x - e.x, v.y - e.y);
          if (dist > 1.6 && dist < 11) {
            const n = Math.ceil((dist - 1.3) / 0.2), sx = (e.x - v.x) / dist * 0.2, sy = (e.y - v.y) / dist * 0.2;
            for (let i = 0; i < n; i++) if (!W.move(v, sx, sy)) break;
            U.fx('teleport', v.x, v.y, { color: COL.shadow }); U.shake(3, 0.15);
            if (v.type === 'player' && game.onPlayerMoved) game.onPlayerMoved(true);
          }
        }
      }
    }
    if (!mt || !t) return;
    for (const key in mt) {
      mt[key] -= dt;
      if (mt[key] > 0) continue;
      switch (key) {
        case 'mortar':
          mt[key] = 5;
          if (d < 10) { enemyZone(e, t.x, t.y, 1.7, 1.0, 1.4, 'fire'); U.fx('spark', e.x, e.y, { color: '#ff9a3c' }); }
          break;
        case 'jail':
          mt[key] = 8;
          if (d < 9) enemyZone(e, t.x, t.y, 1.3, 0.8, 0.5, 'phys', { st: ['slow', 100, 1.8, 0.85], color: '#c9a8ff', fx: 'ring' });
          break;
        case 'molten':
          mt[key] = 0.6;
          if (ai.st === 'chase') enemyZone(e, e.x, e.y, 0.8, 0.4, 0.35, 'fire', { linger: { t: 2.5, every: 0.5, mult: 1 }, lingerDmg: (e.dmgMin + e.dmgMax) * 0.5 * 0.3, lingerFx: 'spark' });
          break;
        case 'plague':
          mt[key] = 2.5;
          enemyZone(e, e.x, e.y, 2.1, 0, 0.3, 'poison', { t: 2.5, every: 0.5 });
          break;
        case 'might':
        case 'haste': {
          mt[key] = 1;
          const foes = game.live.foes, might = key === 'might';
          U.fx('ring', e.x, e.y, { radius: 4, color: might ? '#e04a3a' : '#fff06a', duration: 0.5 });
          for (let i = 0; i < foes.length; i++) {
            const o = foes[i];
            if (o === e || o.dead || Math.abs(o.x - e.x) > 4 || Math.abs(o.y - e.y) > 4) continue;
            if (might) game.addEffect(o, { id: 'aura_might', t: 1.6, dealt: 30 }); else game.addEffect(o, { id: 'aura_haste', t: 1.6, slow: -0.3 });
          }
          break;
        }
        case 'volley': {
          mt[key] = 6;
          if (d > 9 || !W.shotClear(e.x, e.y, t.x, t.y)) break;
          const ang = Math.atan2(t.y - e.y, t.x - e.x), vol = G.newId();
          for (let i = -1; i <= 1; i++) {
            game.spawnProjectile({ x: e.x, y: e.y, ang: ang + i * 0.22, speed: 9, shape: 'shard', color: '#e8dcb0', faction: 'enemy', dmg: (e.dmgMin + e.dmgMax) * 0.4,
              dtype: 'phys', srcId: e.id, lvl: e.level, life: 1.3 }).vol = vol;
          }
          U.sfx('arrow');
          break;
        }
        case 'nova':
          mt[key] = 7;
          if (d < 9) { enemyZone(e, e.x, e.y, 3.6, 1.1, 1.8, 'fire', { shake: 4 }); U.text(e.x, e.y - 1.5, 'Nova', '#ff9a6a', true); }
          break;
        case 'reflect':
          mt[key] = 9;
          game.addEffect(e, { id: 'reflect', t: 3 });
          U.fx('ring', e.x, e.y, { radius: e.radius + 0.7, color: '#7fd4ff', duration: 3 });
          U.text(e.x, e.y - 1.5, 'Mirror', '#7fd4ff', true);
          break;
        case 'vortex':
          mt[key] = 7;
          if (d > 3 && d < 10) {
            ai.pull = { t: 0.7, id: t.id };
            U.fx('ring', t.x, t.y, { radius: 1, color: COL.shadow, duration: 0.7 }); U.fx('nova', e.x, e.y, { radius: 2, color: COL.shadow });
            U.text(e.x, e.y - 1.5, 'Vortex', COL.shadow, true);
          }
          break;
        case 'shades': {
          mt[key] = 10;
          const ents = G.state.entities;
          let alive = 0;
          for (let i = 0; i < ents.length; i++) if (ents[i].bossAdd === e.id && !ents[i].dead) alive++;
          for (let i = 0; i < 2 && alive < 4; i++, alive++) {
            const a = U.rand(0, 6.28), spot = W.free(e.x + Math.cos(a) * 1.8, e.y + Math.sin(a) * 1.8, 3);
            if (!spot) continue;
            const s = game.createMonster('shadowling', spot.x, spot.y, Math.max(1, e.level - 3), 'normal');
            s.name = 'Shade'; s.bossAdd = e.id; s.noLoot = true; s.xp = Math.round(s.xp * 0.3); s.lockdown = e.lockdown; s.ai.st = 'chase'; s.ai.atk = 1;
            ents.push(s);
            U.fx('smoke', spot.x, spot.y, { color: COL.shadow });
          }
          U.sfx('cast');
          break;
        }
        case 'siege':
          mt[key] = 3;
          if (t.type === 'player' && d > 4 && d < 11 && (game.stillT || 0) > 1) {
            enemyZone(e, t.x, t.y, 1.5, 0.9, 1.5, 'phys', { color: '#d9a05b', shake: 2 });
            U.fx('spark', e.x, e.y, { color: '#d9a05b' });
          }
          break;
        default:
          if (game.DEEP_TIMERS && game.DEEP_TIMERS[key]) game.DEEP_TIMERS[key](e, t, d, mt, key);
          else mt[key] = 99;
      }
    }
  };
  game.enemyZone = enemyZone;

  // ------------------------------ floor modifiers (R3.7) ------------------------------
  // reward: bonus applied to every kill on the floor (percent magic find / gold find / XP).
  game.FLOOR_MODS = {
    hasted:     { name: 'Quickened', desc: 'Monsters move and attack 25% faster.', reward: { xpGain: 25 }, min: 4 },
    bloodlust:  { name: 'Bloodlust', desc: 'Monsters deal 25% more damage.', reward: { xpGain: 30 }, min: 4 },
    armoured:   { name: 'Ironhide', desc: 'Monsters have 40% more life.', reward: { xpGain: 25, goldFind: 15 }, min: 4 },
    burning:    { name: 'Emberstorm', desc: 'Every monster hit also burns.', reward: { magicFind: 30 }, min: 4 },
    frostbite:  { name: 'Frostbite', desc: 'Every monster hit chills you.', reward: { magicFind: 25 }, min: 4 },
    horde:      { name: 'Horde', desc: 'Packs are much larger.', reward: { xpGain: 20, goldFind: 30 }, min: 4 },
    darkness:   { name: 'Lightless', desc: 'You can barely see past your torch.', reward: { magicFind: 35 }, min: 5 },
    elite_host: { name: 'Elite Host', desc: 'Far more champions and rares roam here.', reward: { magicFind: 45 }, min: 5 },
    volatile:   { name: 'Volatile Dead', desc: 'Slain monsters explode after a moment.', reward: { goldFind: 45 }, min: 5 },
    leeching:   { name: 'Blood Mist', desc: 'Monsters heal whenever they hit.', reward: { goldFind: 35 }, min: 6 },
    cursed:     { name: 'Cursed Shrines', desc: 'Shrines still bless — and summon guardians.', reward: { goldFind: 25, magicFind: 15 }, min: 6 },
    hunted:     { name: 'Hunted', desc: 'A legendary monster stalks this floor.', reward: { magicFind: 60 }, min: 7 },
    no_regen:   { name: 'Withering Air', desc: 'You do not regenerate life or mana.', reward: { xpGain: 35, magicFind: 20 }, min: 8 },
  };
  game.FLOOR_MOD_IDS = Object.keys(game.FLOOR_MODS);

  // 0–2 mods from depth 4, more (and nastier ones unlocked) deeper. Deterministic for a given rng (seeded from map.seed).
  // R5.5: past depth 20 a deep-only modifier usually leads; past 30 every floor has at least one, past 40 up to three.
  game.rollFloorMods = function (depth, rng, bossFloor) {
    const roll = rng.next();              // always consume the same number of draws
    const order = rng.shuffle(game.FLOOR_MOD_IDS.slice());
    const lead = rng.next();
    if (depth < 4 || bossFloor) return [];
    const FM = game.FLOOR_MODS;
    const p0 = depth < 10 ? 0.4 : depth < 20 ? 0.2 : 0.1, p2 = depth < 10 ? 0.1 : depth < 20 ? 0.3 : 0.45;
    let n = roll < p0 ? 0 : roll > 1 - p2 ? 2 : 1;
    if (depth > 30 && n < 1) n = 1;
    if (depth > 40 && roll > 0.8) n = 3;
    const out = [];
    if (n > 0 && depth > 20 && lead < 0.65) for (const id of order) if (FM[id].deep && depth >= FM[id].min) { out.push(id); break; }
    for (const id of order) { if (out.length >= n) break; if (depth >= FM[id].min && out.indexOf(id) < 0) out.push(id); }
    return out;
  };

  game.floorHas = function (id) {
    const m = G.state.map;
    return !!(m && m.mods && m.mods.indexOf(id) >= 0);
  };

  // Summed kill rewards of the current floor: { magicFind, goldFind, xpGain }.
  const ZERO = { magicFind: 0, goldFind: 0, xpGain: 0 };
  game.floorReward = function () {
    const m = G.state.map;
    if (!m || !m.mods || !m.mods.length) return ZERO;
    if (m._reward) return m._reward;
    const r = { magicFind: 0, goldFind: 0, xpGain: 0 };
    for (const id of m.mods) { const w = game.FLOOR_MODS[id] && game.FLOOR_MODS[id].reward; if (w) for (const k in w) r[k] += w[k]; }
    m._reward = r;
    return r;
  };

  // Stat-level floor effects, applied to every hostile monster created on the floor (waves and adds included).
  game.applyFloorMods = function (e) {
    if (game.applyPallor) game.applyPallor(e);          // R5.2: Pallor pressure (no-op while locked or at 0)
    const m = G.state.map;
    if (!m || !m.mods || !m.mods.length) return;
    if (m.mods.indexOf('hasted') >= 0) { e.speed *= 1.25; e.atkCd *= 0.8; }
    if (m.mods.indexOf('bloodlust') >= 0) { e.dmgMin *= 1.25; e.dmgMax *= 1.25; }
    if (m.mods.indexOf('armoured') >= 0) { e.stats.hpMax = Math.round(e.stats.hpMax * 1.4); e.hp = e.stats.hpMax; }
    if (game.applyDeepFloorMods) game.applyDeepFloorMods(e, m.mods);
  };

  G.on('scene:changed', function (ev) {
    const m = ev && ev.map;
    if (!m || !m.mods || !m.mods.length) return;
    for (const id of m.mods) {
      const f = game.FLOOR_MODS[id], w = f.reward, parts = [];
      if (w.magicFind) parts.push('+' + w.magicFind + '% magic find');
      if (w.goldFind) parts.push('+' + w.goldFind + '% gold');
      if (w.xpGain) parts.push('+' + w.xpGain + '% XP');
      U.toast(f.name + ': ' + f.desc + ' (' + parts.join(', ') + ')', '#ff9a6a');
    }
    U.sfx('quest');
  });
})();

// Floor modifier "Cursed Shrines": a blessing still lands, but a champion pack rises to guard it.
(function () {
  'use strict';
  const G = window.G, game = G.game, U = game.U, W = game.W;
  game.cursedShrine = function (x, y) {
    const S = G.state, map = S.map, depth = Math.max(1, map.depth | 0);
    const id = game.pickMonsterType(depth, map.theme), mod = U.rng.pick(game.affixPool ? game.affixPool(depth) : game.AFFIX_IDS);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1, spot = W.free(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 3);
      if (!spot) continue;
      const e = game.createMonster(id, spot.x, spot.y, depth + 1, 'champion', null, mod);
      e.ai.st = 'chase'; e.ai.atk = 1;
      S.entities.push(e);
      U.fx('smoke', spot.x, spot.y, { color: '#b98cff' });
    }
    U.toast('The shrine was cursed!', '#b98cff');
    U.sfx('cast');
  };
})();
