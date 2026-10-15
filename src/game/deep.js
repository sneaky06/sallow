// Revision 5: Pallor (R5.2), deep-only floor + monster modifier pools and caster pressure (R5.5), wisps that rise again,
// and Close Call — stepping out of a telegraph at the last moment is rewarded.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS, A = game.AFFIXES;

  function depthNow() { const m = G.state.map; return m ? Math.max(1, m.depth | 0) : 1; }
  function setAnim(e, a) { if (e.anim !== a) { e.anim = a; e.animT = 0; } }
  // Typical monster swing at a depth (melee archetype average) — the yardstick for floor hazards.
  function refDmg(depth) { return 3 * game.dmgScale(depth); }

  // ------------------------------ R5.2 Pallor ------------------------------
  // Each floor taken by the stairs without visiting town adds Pallor; town resets it. Monsters grow, elites gain modifiers,
  // Pallid monsters appear, and the items module (opts.pallor in dropLoot) raises loot quantity/quality and bleaches drops.
  const ROMAN = ['', 'I', 'II', 'III', 'IV'];
  const TIERS = game.PALLOR_TIERS = [
    { min: 0,  hp: 0,  dmg: 0,  mods: 0, pallid: 0 },
    { min: 10, hp: 10, dmg: 5,  mods: 0, pallid: 0 },
    { min: 30, hp: 20, dmg: 10, mods: 1, pallid: 0 },
    { min: 60, hp: 35, dmg: 16, mods: 1, pallid: 0.12 },
    { min: 90, hp: 50, dmg: 24, mods: 2, pallid: 0.25, hunted: true },
  ];
  function tierOf(v) { let t = 0; for (let i = 1; i < TIERS.length; i++) if (v >= TIERS[i].min) t = i; return t; }
  game.pallorGain = function (depth) { return depth > 40 ? 20 : depth > 30 ? 15 : 10; };
  game.pallorValue = function () {
    const f = G.state.flags;
    return f && f.pallorUnlocked ? U.clamp(f.pallor | 0, 0, 100) : 0;
  };
  game.pallorTier = function () { return tierOf(game.pallorValue()); };
  game.pallorExtraMods = function () { return TIERS[game.pallorTier()].mods; };
  game.pallorHunts = function () { return !!TIERS[game.pallorTier()].hunted; };

  function tierEffects(tier) {
    const T = TIERS[tier], fx = [];
    if (!tier) return fx;
    fx.push('Monsters +' + T.hp + '% life, +' + T.dmg + '% damage');
    fx.push('More and better loot');
    if (tier >= 2) fx.push('Bleached drops carry a hidden affix, revealed in town');
    if (T.mods) fx.push('Rares and legendaries gain ' + (T.mods > 1 ? T.mods + ' modifiers' : 'a modifier'));
    if (T.pallid) fx.push('Some monsters are Pallid (hits halve your healing)');
    if (T.hunted) fx.push('A legendary hunts every floor');
    return fx;
  }
  game.getPallor = function () {
    const v = game.pallorValue(), tier = tierOf(v);
    return { value: v, tier: tier, effects: tierEffects(tier) };
  };

  // R6.1: what Pallor would look like at `nextValue` (the Go-deeper prompt). loot = the items module's per-tier boost
  // (rare+ odds ×(1 + 0.2·tier), one extra-drop chance per tier) as numbers the UI can print.
  game.previewPallor = function (nextValue) {
    const v = U.clamp(Math.round(+nextValue || 0), 0, 100), tier = tierOf(v);
    return { value: v, tier: tier, effects: tierEffects(tier), tierUp: tier > game.pallorTier(), loot: tier ? { rarity: 20 * tier, quantity: 8 * tier } : null };
  };
  game.nextPallorValue = function (depth) { return Math.min(100, game.pallorValue() + game.pallorGain(depth | 0)); };

  // Called by spawnMapEntities for every new map, before its monsters exist. player.js sets game.pallorStairs while the
  // stairs interaction is being resolved.
  game.notePallorFloor = function (map) {
    const f = G.state.flags, how = game.pallorStairs;
    game.pallorStairs = null;
    if (!f || !map) return;
    if (map.kind === 'town') { f.pallor = 0; return; }
    if (!f.pallorUnlocked || how !== 'stairs_down' || map.kind !== 'dungeon') return;
    const before = U.clamp(f.pallor | 0, 0, 100);
    f.pallor = Math.min(100, before + game.pallorGain(map.depth | 0));
    map.pallorUp = { from: tierOf(before), to: tierOf(f.pallor), value: f.pallor };
  };

  game.applyPallor = function (e) {
    const tier = game.pallorTier();
    if (!tier) return;
    const T = TIERS[tier];
    e.stats.hpMax = Math.round(e.stats.hpMax * (1 + T.hp / 100)); e.hp = e.stats.hpMax;
    e.dmgMin *= 1 + T.dmg / 100; e.dmgMax *= 1 + T.dmg / 100;
    e.pallor = tier;
    if (T.pallid && e.rarity === 'normal' && U.rng.next() < T.pallid) {
      e.affixes.push('Pallid');
      e.name = 'Pallid ' + e.name;
      e.sprite.accent = '#e8e8e8';
    }
  };

  // ------------------------------ R5.5 deep-only monster modifiers ------------------------------
  const timer = function (key, first) { return function (e) { e.ai.mt = e.ai.mt || {}; e.ai.mt[key] = first; }; };
  const deep = function (name, min, color, tell, apply) { A[name] = { color: color, tell: tell, apply: apply || function () {}, deep: true, min: min }; };
  deep('Gravewalker', 21, '#c8c8a0', 'rises again unless you walk over its remains');
  deep('Siphoning', 21, '#ff9ad0', 'hits strip one of your blessings');
  deep('Devouring', 21, '#a04040', 'eats nearby corpses to heal and grow', timer('devour', 1.5));
  deep('Arcing', 31, '#fff06a', 'lightning arcs to nearby monsters — do not cross the beams', timer('arc', 0.5));
  deep('Hexing', 31, '#9a5aff', 'hits curse you: +25% damage taken');
  deep('Duplicating', 41, '#7fd4ff', 'splits off a copy at half life', timer('dup', 0.3));
  deep('Undying Pact', 41, '#ffd94a', 'nearby monsters cannot die while it lives (gold ring)', timer('pact', 0.2));
  deep('Time Warp', 41, '#9ad8ff', 'slows you while you are near it', timer('warp', 0.5));
  // Pallor-only (never rolled, applied by Pallor III+ to normal monsters)
  A.Pallid = { color: '#e8e8e8', tell: 'hits bleach you: no life regeneration, half healing', apply: function () {}, pallor: true };

  game.DEEP_AFFIX_IDS = Object.keys(A).filter(function (k) { return A[k].deep; });
  game.deepAffixes = function (depth) { return game.DEEP_AFFIX_IDS.filter(function (k) { return depth >= A[k].min; }); };
  game.affixPool = function (depth) { return game.AFFIX_IDS.concat(game.deepAffixes(depth)); };

  function heals(e, pct) { game.heal(e, e.stats.hpMax * pct / (game.TIER_HP[e.rarity] || 1)); }

  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy || 1;
    const k = U.clamp(((px - ax) * vx + (py - ay) * vy) / L, 0, 1);
    return Math.hypot(px - ax - vx * k, py - ay - vy * k);
  }

  game.DEEP_TIMERS = {
    devour(e, t, d, mt, key) {
      mt[key] = 2.5;
      const ents = G.state.entities;
      let best = null, bd = 4;
      for (let i = 0; i < ents.length; i++) {
        const c = ents[i];
        if (!c.dead || c.type !== 'monster' || c.faction !== 'enemy' || c.noCorpse || c.exploded || !(c.ai && c.ai.corpse > 0.5)) continue;
        const cd = Math.hypot(c.x - e.x, c.y - e.y);
        if (cd < bd) { bd = cd; best = c; }
      }
      if (!best) return;
      best.exploded = true; best.ai.corpse = 0.01;
      heals(e, 20);
      e.devoured = (e.devoured || 0) + 1;
      if (e.devoured <= 5) { e.dmgMin *= 1.08; e.dmgMax *= 1.08; e.sprite.scale = (e.sprite.scale || 1) * 1.04; }
      U.fx('blood', best.x, best.y, {}); U.fx('heal', e.x, e.y, { color: '#a04040' });
      U.text(e.x, e.y - 1.3, 'Devours', '#d05050', true);
    },
    arc(e, t, d, mt, key) {
      mt[key] = 0.5;
      const foes = game.live.foes, links = [];
      for (let i = 0; i < foes.length && links.length < 2; i++) {
        const o = foes[i];
        if (o === e || o.dead || Math.abs(o.x - e.x) > 5 || Math.abs(o.y - e.y) > 5 || Math.hypot(o.x - e.x, o.y - e.y) > 5) continue;
        links.push(o);
      }
      if (!links.length) return;
      const victims = [G.state.player].concat(game.live.allies), dmg = (e.dmgMin + e.dmgMax) * 0.5 * 0.45;
      for (const o of links) {
        U.fx('spark', e.x + (o.x - e.x) / 3, e.y + (o.y - e.y) / 3, { color: COL.lightning });
        U.fx('spark', e.x + (o.x - e.x) * 2 / 3, e.y + (o.y - e.y) * 2 / 3, { color: COL.lightning });
        for (const v of victims) {
          if (!v || v.dead || segDist(v.x, v.y, e.x, e.y, o.x, o.y) > 0.35 + v.radius) continue;
          game.applyHit(v, { lightning: dmg }, { src: e, lvl: e.level });
          U.fx('spark', v.x, v.y, { color: COL.lightning });
        }
      }
    },
    dup(e, t, d, mt, key) {
      mt[key] = 0.3;
      if (e.duped || e.hp > e.stats.hpMax * 0.5) return;
      e.duped = true; mt[key] = 1e6;
      const a = U.rand(0, 6.28), spot = W.free(e.x + Math.cos(a) * 1.3, e.y + Math.sin(a) * 1.3, 2);
      if (!spot) return;
      const c = game.createMonster(e.monsterId, spot.x, spot.y, e.level, 'normal');
      c.stats.hpMax = Math.max(1, Math.round(e.hp * 0.5)); c.hp = c.stats.hpMax;
      c.dmgMin = e.dmgMin * 0.7; c.dmgMax = e.dmgMax * 0.7;
      c.name = 'Echo of ' + e.name.split(',')[0]; c.noLoot = true; c.xp = Math.round(e.xp * 0.1); c.lockdown = e.lockdown;
      c.sprite.accent = '#7fd4ff'; c.ai.st = 'chase'; c.ai.atk = 0.6;
      G.state.entities.push(c);
      U.fx('teleport', spot.x, spot.y, { color: '#7fd4ff' });
      U.text(e.x, e.y - 1.4, 'Duplicates!', '#7fd4ff', true);
    },
    pact(e, t, d, mt, key) {
      mt[key] = 1.5;
      U.fx('ring', e.x, e.y, { radius: PACT_R, color: '#ffd94a', duration: 0.8 });
    },
    warp(e, t, d, mt, key) {
      mt[key] = 1;
      U.fx('ring', e.x, e.y, { radius: 4.5, color: '#9ad8ff', duration: 0.6 });
      const p = G.state.player;
      if (p && !p.dead && Math.hypot(p.x - e.x, p.y - e.y) < 4.5) game.addEffect(p, { id: 'time_warp', t: 1.4, slow: 0.3 });
    },
  };

  // Undying Pact: a lethal hit leaves the monster at 1 life while a pact holder (not itself one) stands within PACT_R.
  const PACT_R = 6;
  game.pactHolds = function (t) {
    if (t.affixes && t.affixes.indexOf('Undying Pact') >= 0) return false;
    const foes = game.live.foes;
    for (let i = 0; i < foes.length; i++) {
      const o = foes[i];
      if (o === t || o.dead || !o.affixes.length || o.affixes.indexOf('Undying Pact') < 0) continue;
      if (Math.hypot(o.x - t.x, o.y - t.y) > PACT_R) continue;
      if (!(t.pactT > G.state.time)) { t.pactT = G.state.time + 0.8; U.text(t.x, t.y - 1.1, 'PACT', '#ffd94a', true); U.fx('spark', t.x, t.y, { color: '#ffd94a' }); }
      return true;
    }
    return false;
  };

  const HARMFUL = { potion_hp: 1, invuln: 1, cc_immune: 1, second_wind_cd: 1, bleach: 1, hex: 1, time_warp: 1 };
  game.DEEP_ONHIT = {
    Pallid(e, t) {
      if (t.type !== 'player') return;
      if (!game.getEffect(t, 'bleach')) U.text(t.x, t.y - 1.2, 'Bleached', '#e8e8e8');
      game.addEffect(t, { id: 'bleach', t: 4 });
    },
    Hexing(e, t) {
      if (!game.getEffect(t, 'hex')) { U.text(t.x, t.y - 1.2, 'Hexed', '#9a5aff'); U.fx('spark', t.x, t.y, { color: '#9a5aff' }); }
      game.addEffect(t, { id: 'hex', t: 4, taken: 25 });
    },
    Siphoning(e, t) {
      if (t.type !== 'player') return;
      const fx = t.effects;
      for (let i = 0; i < fx.length; i++) {
        const f = fx[i];
        if (HARMFUL[f.id] || f.dps || f.stun || f.slow > 0 || f.taken > 0 || f.dealt < 0) continue;
        let good = f.dealt > 0 || f.absorb > 0;
        if (f.mods) for (const k in f.mods) if (f.mods[k] > 0) good = true;
        if (!good) continue;
        game.removeEffect(t, f.id);
        U.text(t.x, t.y - 1.2, 'Siphoned', '#ff9ad0', true); U.fx('spark', t.x, t.y, { color: '#ff9ad0' });
        if (e && !e.dead) heals(e, 5);
        return;
      }
    },
  };

  // ------------------------------ R5.5 deep-only floor modifiers ------------------------------
  Object.assign(game.FLOOR_MODS, {
    restless:   { name: 'Restless Ground', desc: 'Stand still for two seconds and the ground erupts beneath you.', reward: { xpGain: 30, magicFind: 30 }, min: 21, deep: true },
    hexed:      { name: 'Hexed Glyphs', desc: 'Glyphs on the floor flare and burst when you walk near.', reward: { magicFind: 40, goldFind: 20 }, min: 21, deep: true },
    warded:     { name: 'Warded', desc: 'Every monster carries a ward worth 30% of its life.', reward: { xpGain: 35, goldFind: 25 }, min: 21, deep: true },
    echoes:     { name: 'Restless Dead', desc: 'The slain may rise again; walk over their remains to lay them to rest.', reward: { xpGain: 30, magicFind: 40 }, min: 31, deep: true },
    rifts:      { name: 'Riven', desc: 'Rifts tear open near you and spill shadows.', reward: { xpGain: 40, magicFind: 30 }, min: 31, deep: true },
    blood_moon: { name: 'Blood Moon', desc: 'Every monster frenzies below half life.', reward: { xpGain: 45, magicFind: 40 }, min: 41, deep: true },
    thin_veil:  { name: 'Thin Veil', desc: 'Potions heal half as much.', reward: { magicFind: 70, goldFind: 30 }, min: 41, deep: true },
  });
  game.FLOOR_MOD_IDS = Object.keys(game.FLOOR_MODS);

  game.applyDeepFloorMods = function (e, mods) {
    if (mods.indexOf('warded') >= 0) e.effects.push({ id: 'ward', t: 1e6, absorb: Math.round(e.stats.hpMax * 0.3) });
    if (mods.indexOf('blood_moon') >= 0 && e.rarity !== 'boss') e.frenzyAt = 0.5;          // runModifiers handles the frenzy
  };

  // ------------------------------ wisps: the slain rising again ------------------------------
  // Plain data, transient like zones. Walking over one lays it to rest (a little life and mana back); otherwise it rises.
  const wisps = game.wisps = [];
  const WISP_T = 3;

  game.onDeepKill = function (t) {
    if (t.risen || t.rarity === 'boss' || t.faction !== 'enemy' || game.fxOf(G.state.player).extra_minion) return;      // Crane's relic: your kills stay down
    const grave = t.affixes.indexOf('Gravewalker') >= 0;
    if (!grave && !(game.floorHas('echoes') && !t.bossAdd && !t.riftSpawn && U.rng.next() < 0.4)) return;
    wisps.push({ x: t.x, y: t.y, t: grave ? WISP_T : WISP_T + 0.5, pulse: 0, monsterId: t.monsterId, level: t.level, elite: t.rarity !== 'normal', name: t.name.split(',')[0], lockdown: !!t.lockdown });
    U.text(t.x, t.y - 1.2, 'It stirs…', '#e8e8ff');
  };

  function updateWisps(p, dt) {
    for (let i = wisps.length - 1; i >= 0; i--) {
      const w = wisps[i];
      w.t -= dt; w.pulse -= dt;
      if (w.pulse <= 0) { w.pulse = 0.5; U.fx('ring', w.x, w.y, { radius: 0.6, color: '#e8e8ff', duration: 0.45 }); }
      if (Math.abs(p.x - w.x) < 1 && Math.abs(p.y - w.y) < 1 && Math.hypot(p.x - w.x, p.y - w.y) < 0.95) {
        wisps.splice(i, 1);
        game.heal(p, p.stats.hpMax * 0.03);
        p.mp = Math.min(p.stats.mpMax, p.mp + p.stats.mpMax * 0.03);
        U.fx('smoke', w.x, w.y, { color: '#e8e8ff' }); U.text(w.x, w.y - 1, 'Laid to rest', '#e8e8ff');
        continue;
      }
      if (w.t > 0) continue;
      wisps.splice(i, 1);
      const spot = W.free(w.x, w.y, 2);
      if (!spot) continue;
      const r = game.createMonster(w.monsterId, spot.x, spot.y, w.level, w.elite ? 'champion' : 'normal');
      r.stats.hpMax = Math.max(1, Math.round(r.stats.hpMax * 0.6)); r.hp = r.stats.hpMax;
      r.risen = true; r.noLoot = true; r.xp = Math.round(r.xp * 0.3); r.lockdown = w.lockdown;
      r.name = 'Risen ' + game.MONSTERS[w.monsterId].n; r.ai.st = 'chase'; r.ai.atk = 0.8;
      G.state.entities.push(r);
      U.fx('teleport', spot.x, spot.y, { color: '#e8e8ff' }); U.sfx('cast');
    }
  }

  // ------------------------------ per-frame: stillness, floor hazards, wisps ------------------------------
  const anchor = { x: -99, y: -99 };
  game.stillT = 0;           // seconds the player has stayed within ~0.8 tiles (Siege, aimed shots, Restless Ground)
  let restT = 0, riftT = 8, ccCd = 0;
  const rifts = [];

  function rift(p, depth) {
    let alive = 0;
    for (const e of G.state.entities) if (e.riftSpawn && !e.dead) alive++;
    if (alive >= 6) return;
    for (let k = 0; k < 6; k++) {
      const a = U.rand(0, 6.28), r = U.rand(4, 6), spot = W.free(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2);
      if (!spot || !W.los(p.x, p.y, spot.x, spot.y)) continue;
      rifts.push({ x: spot.x, y: spot.y, t: 1.3, lvl: depth });
      U.fx('ring', spot.x, spot.y, { radius: 1.2, color: '#7a5aff', duration: 1.3 });
      U.text(spot.x, spot.y - 1, 'Rift', '#b98cff', true);
      return;
    }
  }

  game.updateDeep = function (dt) {
    const S = G.state, p = S.player;
    if (!p || !S.map) return;
    if (Math.hypot(p.x - anchor.x, p.y - anchor.y) > 0.8) { anchor.x = p.x; anchor.y = p.y; game.stillT = 0; }
    else game.stillT += dt;
    if (ccCd > 0) ccCd -= dt;
    if (S.scene !== 'dungeon' || p.dead) return;
    if (wisps.length) updateWisps(p, dt);
    const mods = S.map.mods;
    if (!mods || !mods.length) return;
    const depth = depthNow();
    if (restT > 0) restT -= dt;
    if (mods.indexOf('restless') >= 0 && game.stillT > 2 && restT <= 0 && game.live.foes.length) {
      restT = 3;
      game.addZone({ x: p.x, y: p.y, r: 1.4, delay: 1.0, faction: 'enemy', dmg: refDmg(depth) * 1.8, dtype: 'cold', lvl: depth, fx: 'frost', color: '#b98cff', shake: 2 });
      U.text(p.x, p.y - 1.3, 'The ground stirs', '#b98cff');
    }
    if (mods.indexOf('rifts') >= 0) {
      riftT -= dt;
      if (riftT <= 0) { riftT = 14; rift(p, depth); }
      for (let i = rifts.length - 1; i >= 0; i--) {
        const r = rifts[i];
        if ((r.t -= dt) > 0) continue;
        rifts.splice(i, 1);
        for (let k = 0; k < 3; k++) {
          const spot = W.free(r.x + U.rand(-0.8, 0.8), r.y + U.rand(-0.8, 0.8), 2);
          if (!spot) continue;
          const s = game.createMonster('shadowling', spot.x, spot.y, r.lvl, 'normal');
          s.riftSpawn = true; s.noLoot = true; s.xp = Math.round(s.xp * 0.5); s.ai.st = 'chase'; s.ai.atk = 0.8;
          S.entities.push(s);
        }
        U.fx('nova', r.x, r.y, { radius: 1.5, color: '#7a5aff' }); U.sfx('cast');
      }
    }
  };

  // Hexed Glyphs: enemy traps scattered over the floor, deterministic from the seed. A glyph that is stepped near flares
  // (telegraph) and bursts a moment later — step through quickly or go around.
  function placeGlyphs(map) {
    const rng = G.rng.create(((map.seed | 0) ^ 0x68e31da4) >>> 0), depth = Math.max(1, map.depth | 0);
    let n = 0;
    for (let k = 0; k < 400 && n < 9; k++) {
      const x = rng.int(1, map.w - 2) + 0.5, y = rng.int(1, map.h - 2) + 0.5;
      if (!W.walkable(x, y) || Math.hypot(x - map.spawn.x, y - map.spawn.y) < 8) continue;
      game.zones.push({ x: x, y: y, r: 1.8, delay: 0, t: 1e6, trap: true, glyph: true, faction: 'enemy', dmg: refDmg(depth) * 2.4, dtype: 'fire', lvl: depth,
        fx: 'explosion', color: '#c94aff', acc: 0, pulse: rng.next() });
      n++;
    }
  }

  G.on('scene:changed', function (ev) {
    wisps.length = 0; rifts.length = 0;
    restT = 0; riftT = 8; ccCd = 0;
    anchor.x = anchor.y = -99; game.stillT = 0;
    const f = G.state.flags, m = ev && ev.map;
    if (ev && ev.scene === 'town' && f) f.pallor = 0;
    if (!m) return;
    if (m.kind === 'dungeon' && m.mods && m.mods.indexOf('hexed') >= 0) placeGlyphs(m);
    const up = m.pallorUp;
    m.pallorUp = null;
    if (up && up.to > up.from) {
      const fx = tierEffects(up.to);
      U.toast('Pallor ' + ROMAN[up.to] + ' — the colour drains. ' + fx[0] + '.', '#d8d8d8');
      U.sfx('shrine');
    }
  });

  // ------------------------------ Close Call ------------------------------
  // Standing in a telegraphed blast during its last 0.6 s and stepping out before it lands: +15% damage per stack
  // (max 3, 5 s) and every skill cooldown 1 s shorter. Turns "dodge the circle" into a rhythm a thumb can feel.
  game.closeCall = function (z) {
    const p = G.state.player;
    if (!p || p.dead || ccCd > 0 || !(z.r >= 1.2)) return;
    ccCd = 0.75;
    const old = game.getEffect(p, 'close_call'), n = Math.min(3, (old ? old.stacks : 0) + 1);
    game.addEffect(p, { id: 'close_call', t: (p.bonus && p.bonus.ccTime) || 5, stacks: n, dealt: ((p.bonus && p.bonus.ccPer) || 15) * n });          // (+ perks Steel Nerves, Glory Hound)
    if (game.perkCC) game.perkCC(p);          // R11 Close Call perks
    if (game.goalAdd) { game.goalAdd('r_close_calls'); if (G.state.time - (game.lastDashT === undefined ? -9 : game.lastDashT) <= 1) game.goalAdd('s_blink_cc'); }          // R16 class goals
    for (const id in p.cooldowns) if (p.cooldowns[id] > 0) p.cooldowns[id] = Math.max(0, p.cooldowns[id] - 1);
    U.text(p.x, p.y - 1.3, n > 1 ? 'CLOSE CALL ×' + n : 'CLOSE CALL', '#7fffd4', true);
    if (game.onCloseCall) game.onCloseCall(p);          // R9.1 Flow chain
    U.fx('ring', p.x, p.y, { radius: 1.2, color: '#7fffd4', duration: 0.35 });
    U.sfx('swing');
  };

  // ------------------------------ R5.5 aimed shots (caster pressure) ------------------------------
  // From depth 3, a shooter whose target has stood still for 1.2 s at 5+ tiles marks the spot (red ring) and fires a fast,
  // heavy shot at it 0.85 s later. Moving dodges it; melee range never triggers it.
  game.aimedShot = function (e, def, t, d, dt) {
    const ai = e.ai;
    if (ai.aim) {
      e.facing = Math.atan2(ai.aim.y - e.y, ai.aim.x - e.x);
      ai.aim.t -= dt;
      if (ai.aim.t > 0) return true;
      const a = ai.aim, pj = def.proj || { shape: 'orb', color: '#ffffff', speed: 8 }, speed = pj.speed * 1.8;
      ai.aim = null;
      let dmg = (e.dmgMin + e.dmgMax) * 0.5 * 1.7;
      for (const f of e.effects) if (f.dealt) dmg *= Math.max(0.1, 1 + f.dealt / 100);
      const ang = Math.atan2(a.y - e.y, a.x - e.x), dist = Math.hypot(a.x - e.x, a.y - e.y);
      game.spawnProjectile({ x: e.x + Math.cos(ang) * 0.3, y: e.y + Math.sin(ang) * 0.3, ang: ang, speed: speed, shape: pj.shape, color: '#ff5050', radius: 0.26,
        faction: 'enemy', dmg: dmg, dtype: def.dtype || 'phys', st: def.onHit || null, srcId: e.id, lvl: e.level, affixes: e.affixes, life: (dist + 1.5) / speed });
      U.sfx(def.dtype === 'fire' ? 'fire' : 'arrow');
      ai.atk = Math.max(ai.atk, e.atkCd * 0.5);
      return true;
    }
    if (ai.aimCd === undefined) ai.aimCd = U.rand(1.5, 4);
    ai.aimCd -= dt;
    if (ai.aimCd > 0 || ai.wind > 0 || d < 5 || d > def.range + 1.5 || !ai.los || game.stillT < 1.2 || depthNow() < 3) return false;
    ai.aimCd = U.rand(7, 9);
    ai.aim = { t: 0.85, x: t.x, y: t.y };
    ai.al = 1.1;
    setAnim(e, 'cast');
    U.fx('ring', t.x, t.y, { radius: 0.7, color: '#ff5050', duration: 0.85 });
    return true;
  };
})();
