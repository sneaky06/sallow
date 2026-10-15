// Damage pipeline, status effects, death/XP/loot hand-off, projectiles and ground zones (telegraphs, traps, storms).
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS;
  const DTYPES = game.DTYPES, RES_KEY = game.RES_KEY;

  // Rebuilt every frame by monsters.js: living hostile monsters near the player, and living player minions.
  game.live = { foes: [], allies: [] };
  game.zones = [];          // plain data; not rendered by the engine directly — every zone announces itself through fx:spawn

  let lastHitSfx = 0;
  function hitSfx(name) {
    const now = G.state.time;
    if (now - lastHitSfx < 0.05 && now >= lastHitSfx) return;
    lastHitSfx = now;
    U.sfx(name);
  }

  game.heal = function (ent, amount, show) {
    if (!ent || ent.dead || !(amount > 0)) return 0;
    if (ent.type === 'player' && ent.effects.length && game.getEffect(ent, 'bleach')) amount *= 0.5;      // Pallid hits halve healing
    const before = ent.hp;
    ent.hp = Math.min(ent.stats.hpMax, ent.hp + amount);
    const got = ent.hp - before;
    if (show && got >= 1) U.text(ent.x, ent.y - 0.9, '+' + Math.round(got), COL.heal);
    return got;
  };

  // Physical mitigation from armour against an attacker of a given level (cap 75%).
  game.armorReduction = function (armor, attackerLevel) {
    if (!(armor > 0)) return 0;
    return Math.min(0.75, armor / (armor + 40 + 12 * attackerLevel));
  };

  // parts: { phys?, fire?, cold?, lightning?, poison? } raw amounts.
  // o: { src, srcId, lvl, crit, dot, melee, canDodge, canBlock, noThorns }
  game.applyHit = function (t, parts, o) {
    o = o || {};
    if (!t || t.dead) return 0;
    const st = t.stats, isPlayer = t.type === 'player';
    if (!o.dot) {
      if (game.getEffect(t, 'invuln')) { U.text(t.x, t.y - 0.8, 'Immune', '#bbbbbb'); return 0; }
      if (o.canDodge && st.dodge > 0 && U.chance(st.dodge)) { U.text(t.x, t.y - 0.8, 'Dodge', '#bbbbbb'); return 0; }
    }
    const src = o.src || null;
    const aLvl = src ? src.level : (o.lvl || t.level);
    let total = 0, top = 0, topType = 'phys';
    for (let i = 0; i < DTYPES.length; i++) {
      const k = DTYPES[i];
      let a = parts[k];
      if (!a) continue;
      if (k === 'phys') a *= 1 - game.armorReduction(st.armor, aLvl);
      else a *= 1 - Math.min(75, st[RES_KEY[k]] || 0) / 100;
      if (a > top) { top = a; topType = k; }
      total += a;
    }
    const fx = t.effects;
    for (let i = 0; i < fx.length; i++) if (fx[i].taken) total *= Math.max(0.1, 1 + fx[i].taken / 100);
    if (isPlayer && t.bonus && t.bonus.dr) total *= 1 - t.bonus.dr / 100;
    if (t.guard !== undefined && src && game.guardMult) total *= game.guardMult(t, src);          // R7: Brannoc's shield wall
    if (t.rarity === 'boss' && src && src.summon) total *= 0.5;          // minions alone cannot carry a boss fight (R4.3)
    else if (t.summon && src && src.rarity === 'boss') total *= 2.5;     // ...nor wall one off: bosses tear through summons
    let blocked = false;
    if (o.canBlock && st.block > 0 && U.chance(st.block)) { blocked = true; total *= 0.3; }
    if (isPlayer) {
      const ms = game.getEffect(t, 'mana_shield');
      if (ms && t.mp > 0) {
        const use = Math.min(t.mp, total * ms.pct / 100);
        t.mp -= use; total -= use;
      }
    }
    let absorbed = false;
    for (let i = 0; i < fx.length; i++) {
      if (fx[i].absorb > 0 && total > 0) {
        const use = Math.min(fx[i].absorb, total);
        fx[i].absorb -= use; total -= use; absorbed = true;
      }
    }
    if (absorbed && total < 0.5) {          // fully soaked by a ward / bone armour: no minimum-damage chip
      if (!o.dot) U.text(t.x, t.y - 0.7 - (t.radius || 0.3), 'Absorbed', '#d8f4ff');
      if (!isPlayer && game.onMonsterHurt) game.onMonsterHurt(t, src);
      return 0;
    }
    if (o.dot) {
      const whole = Math.floor(total);
      total = whole + (U.rng.next() < total - whole ? 1 : 0);
      if (total <= 0) return 0;
    } else {
      total = Math.max(1, Math.round(total));
    }
    t.hp -= total;
    t.hitFlash = 0.12;

    const y = t.y - 0.7 - (t.radius || 0.3);
    if (isPlayer) {
      U.text(t.x, y, blocked ? 'Block ' + total : total, '#ff5b5b', false);
      G.emit('player:damaged', { amount: total, source: src });
      if (!o.dot) {
        hitSfx('hurt');
        if (total > st.hpMax * 0.12) U.shake(Math.min(8, 2 + total / st.hpMax * 20), 0.2);
      }
    } else {
      U.text(t.x, y, total, o.crit ? '#ffe45b' : COL[topType], !!o.crit);
      if (!o.dot) {
        U.fx('hit', t.x, t.y, { color: COL[topType] });
        hitSfx('hit');
        if (o.crit) U.shake(2, 0.08);
      }
      if (game.onMonsterHurt) game.onMonsterHurt(t, src);
    }

    if (o.melee && !o.noThorns && src && !src.dead) {
      if (st.thorns > 0) game.applyHit(src, { phys: st.thorns }, { src: t, noThorns: true });
      if (isPlayer && t.bonus && t.bonus.chillAttackers) game.applyStatus(src, 'chill', 2);
    }
    if (t.hp <= 0) {
      if (isPlayer && game.fxOf(t).second_wind && !game.getEffect(t, 'second_wind_cd')) {      // mythic: cheat death
        t.hp = Math.round(st.hpMax * 0.5);
        game.addEffect(t, { id: 'second_wind_cd', t: 120 });
        game.addEffect(t, { id: 'invuln', t: 1 });
        const foes = game.live.foes;
        for (let i = 0; i < foes.length; i++) if (!foes[i].dead && Math.hypot(foes[i].x - t.x, foes[i].y - t.y) < 5) game.applyStatus(foes[i], 'stun', 2.5);
        U.fx('nova', t.x, t.y, { radius: 5, color: '#ffffff' }); U.fx('heal', t.x, t.y, {}); U.sfx('shrine'); U.shake(5, 0.3);
        U.text(t.x, t.y - 1.2, 'SECOND WIND', '#ffffff', true);
        return total;
      }
      if (!isPlayer && t.faction === 'enemy' && game.pactHolds && game.pactHolds(t)) {      // deep modifier Undying Pact
        t.hp = 1;
        return total;
      }
      t.hp = 0;
      game.kill(t, src || game.byId(o.srcId));
    }
    return total;
  };

  // id: burn | poison | bleed (power = damage per second) · chill · freeze · stun · shock · slow (power = fraction)
  game.applyStatus = function (t, id, dur, power, src) {
    if (!t || t.dead || !(dur > 0)) return;
    const boss = t.rarity === 'boss', elite = t.rarity === 'rare' || t.rarity === 'champion' || t.rarity === 'legendary';
    const srcId = src ? src.id : 0;
    switch (id) {
      case 'burn': game.addEffect(t, { id: 'burn', t: dur, dps: power, dtype: 'fire', src: srcId }); break;
      case 'poison': game.addEffect(t, { id: 'poison', t: dur, dps: power, dtype: 'poison', src: srcId }); break;
      case 'bleed': game.addEffect(t, { id: 'bleed', t: dur, dps: power, dtype: 'phys', src: srcId }); break;
      case 'chill': game.addEffect(t, { id: 'chill', t: dur, slow: boss ? 0.15 : 0.3 }); break;
      case 'slow': game.addEffect(t, { id: 'slow', t: dur, slow: boss ? (power || 0.4) * 0.5 : (power || 0.4) }); break;
      case 'shock': game.addEffect(t, { id: 'shock', t: dur, taken: 20 }); break;
      case 'freeze':
      case 'stun': {
        if (boss && id === 'freeze') { game.applyStatus(t, 'chill', dur * 2); return; }
        if (game.getEffect(t, 'cc_immune')) return;
        if (boss) dur *= 0.3; else if (elite) dur *= 0.6;
        if (t.type === 'player') dur = Math.min(dur, 1.5);
        game.addEffect(t, { id: id, t: dur, stun: true });
        if (t.type === 'player' || boss || elite) game.addEffect(t, { id: 'cc_immune', t: dur + (boss ? 5 : 2.5) });
        if (t.ai) t.ai.wind = 0;      // interrupts a wind-up
        U.fx(id === 'freeze' ? 'frost' : 'spark', t.x, t.y, {});
        break;
      }
    }
  };

  // st list entries: [id, chancePct, duration, power]. For DoTs power is a fraction of the hit dealt per second.
  function applyStatusList(t, list, dealt, src) {
    if (!list || t.dead) return;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s[1] < 100 && !U.chance(s[1])) continue;
      const dot = s[0] === 'burn' || s[0] === 'poison' || s[0] === 'bleed';
      game.applyStatus(t, s[0], s[2], dot ? dealt * (s[3] || 0.1) : s[3], src);
    }
  }

  // The player's damage roll against one target. spec: { pct, type, crit (bonus %), st, skill (default true), melee, heal (fraction) }
  game.playerHit = function (t, spec) {
    const p = G.state.player;
    if (!p || !t || t.dead) return 0;
    const st = p.stats, b = p.bonus, w = b.w;
    const type = spec.type || 'phys';
    let base = U.rand(w.min + st.dmgMin, w.max + st.dmgMax);
    // spells are cast at a fixed rate, so casters scale with weapon damage per second — a fast wand is not a worse spell focus than a slow staff
    if (spec.skill !== false && !game.MARTIAL[p.classId]) base *= w.aps * 0.75;
    let mult = spec.pct / 100;
    let scale = 1 + st.dmgPct / 100;
    const myth = game.fxOf(p);
    if (spec.skill !== false) scale *= (1 + st.skillDmgPct / 100) * (myth.blood_price ? 1.4 : 1);
    const pfx = p.effects;
    for (let i = 0; i < pfx.length; i++) if (pfx[i].dealt) scale *= Math.max(0.1, 1 + pfx[i].dealt / 100);
    if (b.vsChilled && (game.getEffect(t, 'chill') || game.getEffect(t, 'freeze'))) scale *= 1 + b.vsChilled / 100;
    const shatter = type === 'fire' && b.shatterFire && game.getEffect(t, 'freeze');
    if (shatter) scale *= 1.5;
    if (myth.ramping_fire && (type === 'fire' || st.fireDmg) && game.fireRamp) scale *= 1 + game.fireRamp(p);      // relic: Varr's ramping fire
    const crit = U.chance(st.critChance + (spec.crit || 0));
    if (crit) scale *= 1 + st.critDmg / 100;
    mult *= scale;
    const parts = {};
    parts[type] = base * mult * (1 + (b['elem_' + type] || 0) / 100);
    if (st.fireDmg) parts.fire = (parts.fire || 0) + st.fireDmg * mult * (1 + (b.elem_fire || 0) / 100);
    if (st.coldDmg) parts.cold = (parts.cold || 0) + st.coldDmg * mult;
    if (st.lightningDmg) parts.lightning = (parts.lightning || 0) + st.lightningDmg * mult;
    if (st.poisonDmg) parts.poison = (parts.poison || 0) + st.poisonDmg * mult * (1 + (b.elem_poison || 0) / 100);

    const dealt = game.applyHit(t, parts, { src: p, crit: crit, melee: spec.melee, canDodge: t.stats.dodge > 0 });
    if (dealt <= 0) return 0;
    if (shatter) {          // combo (Frost Nova + fire): the frozen enemy shatters, spraying frost around it
      game.removeEffect(t, 'freeze');
      U.text(t.x, t.y - 1.2, 'SHATTER', COL.cold, true); U.fx('frost', t.x, t.y, { radius: 1.5 }); U.sfx('ice');
      game.addZone({ x: t.x, y: t.y, r: 1.6, delay: 0.01, faction: 'player', pct: 60, dtype: 'cold', st: [['chill', 100, 2]], fx: 'frost', color: COL.cold });
    }
    if (!t.dead) {
      applyStatusList(t, spec.st, dealt, p);
      if (type === 'cold' || st.coldDmg) game.applyStatus(t, 'chill', 2);
      else if (type === 'fire' && !game.getEffect(t, 'burn') && U.chance(25)) game.applyStatus(t, 'burn', 3, dealt * 0.1, p);
      else if (type === 'lightning' && U.chance(20)) game.applyStatus(t, 'shock', 3);
    }
    if (!t.dead && myth.executioner && t.hp < t.stats.hpMax * (t.rarity === 'boss' ? 0.05 : 0.15)) {
      U.text(t.x, t.y - 1.1, 'EXECUTED', '#ff3b4e', true); U.fx('blood', t.x, t.y, {}); U.fx('slash', t.x, t.y, { radius: 1, color: '#ff3b4e' });
      t.hp = 0;
      game.kill(t, p);
    }
    if (myth.chain_spark && !spec.noProc && U.chance(25)) chainSpark(p, t, dealt);
    let heal = dealt * (st.lifeSteal / 100) + (spec.heal ? dealt * spec.heal * (t.rarity === 'boss' ? 0.2 : 1) : 0);      // drain skills are much weaker on bosses
    if (heal > 0) game.heal(p, Math.min(heal, st.hpMax * 0.15), !!spec.heal);
    if (st.manaSteal > 0) p.mp = Math.min(st.mpMax, p.mp + dealt * st.manaSteal / 100);
    return dealt;
  };

  // Mythic chain_spark: arc to up to 3 other enemies near the one just hit for 40% of that hit.
  function chainSpark(p, t, dealt) {
    const foes = game.live.foes;
    let n = 0;
    for (let i = 0; i < foes.length && n < 3; i++) {
      const e = foes[i];
      if (e === t || e.dead || Math.hypot(e.x - t.x, e.y - t.y) > 4.5) continue;
      n++;
      U.fx('spark', e.x, e.y, { color: COL.lightning, radius: 0.8 });
      game.applyHit(e, { lightning: dealt * 0.4 }, { src: p });
    }
    if (n) { U.fx('spark', t.x, t.y, { color: COL.lightning }); hitSfx('bolt'); }
  }

  // A monster (or minion) e strikes t. o: { mult, dtype, st, melee, undodgeable }
  game.monsterHit = function (e, t, o) {
    o = o || {};
    if (!t || t.dead) return 0;
    const def = game.MONSTERS[e.monsterId] || {};
    let amt = U.rand(e.dmgMin, e.dmgMax) * (o.mult || 1);
    const fx = e.effects;
    for (let i = 0; i < fx.length; i++) if (fx[i].dealt) amt *= Math.max(0.1, 1 + fx[i].dealt / 100);
    const p = G.state.player;
    if (e.faction === 'player' && p) {
      const shout = game.getEffect(p, 'battle_shout');
      if (shout) amt *= 1 + shout.mods.dmgPct / 100;
    }
    const parts = {};
    parts[o.dtype || def.dtype || 'phys'] = amt;
    const dodge = !o.undodgeable;
    const dealt = game.applyHit(t, parts, { src: e, melee: o.melee, canDodge: dodge, canBlock: dodge });
    if (dealt <= 0) return 0;
    if (!t.dead) game.monsterOnHit(e, t, dealt, o.st || def.onHit);
    if (e.faction === 'player' && p && p.bonus.minionLeech) game.heal(e, e.stats.hpMax * p.bonus.minionLeech / 100);
    return dealt;
  };

  // On-hit riders for monster damage (melee, projectile or zone). st = [id, chance, dur, power]
  game.monsterOnHit = function (e, t, dealt, st, affixes) {
    if (st && (st[1] >= 100 || U.chance(st[1]))) {
      const dot = st[0] === 'burn' || st[0] === 'poison' || st[0] === 'bleed';
      game.applyStatus(t, st[0], st[2], dot ? Math.max(1, dealt * (st[3] || 0.2)) : st[3], e);
    }
    // floor modifiers (R3.7) apply to every hostile hit
    if (e && e.faction === 'enemy' && !t.dead) {
      if (game.floorHas('burning') && !game.getEffect(t, 'burn')) game.applyStatus(t, 'burn', 3, Math.max(1, dealt * 0.2), e);
      if (game.floorHas('frostbite')) game.applyStatus(t, 'chill', 2);
      if (game.floorHas('leeching') && !e.dead) game.heal(e, e.stats.hpMax * 0.03 / (game.TIER_HP[e.rarity] || 1));
    }
    const af = affixes || (e && e.affixes);
    if (!af || !af.length) return;
    for (let i = 0; i < af.length; i++) {
      switch (af[i]) {
        case 'Fire Enchanted': game.applyStatus(t, 'burn', 3, Math.max(1, dealt * 0.25), e); break;
        case 'Frozen': game.applyStatus(t, 'chill', 2.5); break;
        case 'Shocking': game.applyStatus(t, 'shock', 3); break;
        case 'Venomous': game.applyStatus(t, 'poison', 4, Math.max(1, dealt * 0.25), e); break;
        case 'Vampiric': if (e && !e.dead) { game.heal(e, e.stats.hpMax * 0.05 / (game.TIER_HP[e.rarity] || 1)); U.fx('heal', e.x, e.y, { color: '#d03a3a' }); } break;
        case 'Mana Burn':
          if (t.mp > 0) { const burn = Math.min(t.mp, dealt * 0.6); t.mp -= burn; U.fx('spark', t.x, t.y, { color: COL.mana }); if (burn >= 1) U.text(t.x, t.y - 1.1, '-' + Math.round(burn) + ' mp', COL.mana); }
          break;
        case 'Knockback':
          if (e && !e.dead && Math.hypot(t.x - e.x, t.y - e.y) < 2.5 && !game.getEffect(t, 'invuln')) {
            const d = Math.hypot(t.x - e.x, t.y - e.y) || 1, sx = (t.x - e.x) / d * 0.2, sy = (t.y - e.y) / d * 0.2;
            for (let k = 0; k < 7; k++) if (!W.move(t, sx, sy)) break;
            U.fx('smoke', t.x, t.y, {}); U.shake(2, 0.1);
            if (t.type === 'player' && game.onPlayerMoved) game.onPlayerMoved(true);
          }
          break;
        default:
          if (game.DEEP_ONHIT && game.DEEP_ONHIT[af[i]]) game.DEEP_ONHIT[af[i]](e, t, dealt);
      }
    }
  };

  game.kill = function (t, killer) {
    if (t.dead) return;
    const S = G.state, p = S.player;
    t.dead = true;
    t.hp = 0;
    t.anim = 'die';
    t.animT = 0;
    t.effects = [];
    if (t.type === 'player') {
      U.sfx('die');
      U.fx('blood', t.x, t.y, {});
      U.shake(8, 0.4);
      G.emit('player:died', { noRetrieve: game.isNoRetrieve() });
      return;
    }
    U.fx('blood', t.x, t.y, {});
    hitSfx('die');
    if (t.faction === 'player') {            // a minion fell
      t.ai.corpse = 1.2;
      t.noCorpse = true;
      if (p && p.minions && p.minions[t.summonOf] > 0) p.minions[t.summonOf]--;
      return;
    }
    const def = game.MONSTERS[t.monsterId] || {};
    t.ai.corpse = t.rarity === 'boss' ? 5 : 8;
    t.ai.st = 'dead';
    if (t.rarity === 'boss') { U.shake(8, 0.6); U.fx('explosion', t.x, t.y, { radius: 3, color: '#ffffff' }); }

    // death throes
    const blast = t.affixes.indexOf('Fire Enchanted') >= 0 ? 'fire' : t.affixes.indexOf('Frozen') >= 0 ? 'cold' : def.deathBlast;
    if (blast) {
      game.addZone({ x: t.x, y: t.y, r: 2.1, delay: 0.9, faction: 'enemy', dmg: (t.dmgMin + t.dmgMax) * 0.6, dtype: blast, lvl: t.level,
        st: blast === 'cold' ? ['chill', 100, 3] : ['burn', 100, 3, 0.2], fx: blast === 'cold' ? 'frost' : 'explosion', color: COL[blast] });
    }
    if (game.floorHas('volatile')) {          // floor modifier: the dead explode after a moment
      game.addZone({ x: t.x, y: t.y, r: 1.8, delay: 1.1, faction: 'enemy', dmg: (t.dmgMin + t.dmgMax) * 0.7, dtype: 'fire', lvl: t.level, fx: 'explosion', color: '#ff5b2e' });
    }
    if (t.affixes.indexOf('Splitting') >= 0 && !t.isSplit) {      // legendary: two lesser halves crawl out
      for (let i = 0; i < 2; i++) {
        const a = U.rand(0, 6.28), spot = W.free(t.x + Math.cos(a) * 1.2, t.y + Math.sin(a) * 1.2, 2);
        if (!spot) continue;
        const h = game.createMonster(t.monsterId, spot.x, spot.y, t.level, 'champion', null, 'Extra Strong');
        h.name = 'Half of ' + t.name.split(',')[0]; h.isSplit = true; h.noLoot = true; h.xp = Math.round(h.xp * 0.4);
        h.lockdown = t.lockdown; h.ai.st = 'chase'; h.ai.atk = 0.8;
        S.entities.push(h);
        U.fx('smoke', spot.x, spot.y, { color: '#ffb347' });
      }
      U.text(t.x, t.y - 1.2, 'SPLITS!', '#ffb347', true);
    }
    if (t.echo && game.onEchoKilled) game.onEchoKilled(t);          // R6.2: your belongings back + a rare-or-better drop
    else if (game.onDeepKill) game.onDeepKill(t);          // Gravewalker / Restless Dead leave a wisp that rises again
    if (!p) return;
    const fr = game.floorReward();
    if (game.fxOf(p).corpse_blast) {          // mythic: the dead detonate (and can chain)
      game.addZone({ x: t.x, y: t.y, r: 2.5, delay: 0.15, faction: 'player', raw: t.stats.hpMax * 0.25, dtype: 'fire', fx: 'explosion', color: '#ff5b2e' });
    }
    if (!p.dead) {
      if (p.stats.lifeOnKill) game.heal(p, p.stats.lifeOnKill);
      if (p.stats.manaOnKill) p.mp = Math.min(p.stats.mpMax, p.mp + p.stats.manaOnKill);
    }
    if (t.xp > 0) {
      const over = p.level - t.level - 5;
      game.gainXp(t.xp * (over > 0 ? Math.max(0.1, 1 - over * 0.15) : 1) * (1 + fr.xpGain / 100));
    }
    if (!t.noLoot && G.items && G.items.dropLoot) {
      try {
        G.items.dropLoot(t.x, t.y, { source: t.rarity === 'normal' ? 'monster' : t.rarity, level: t.level,
          magicFind: (p.stats.magicFind || 0) + fr.magicFind, goldFind: (p.stats.goldFind || 0) + fr.goldFind, pallor: game.pallorValue ? game.pallorValue() : 0 });
      } catch (err) { console.error('[game] dropLoot failed', err); }
    }
    G.emit('monster:killed', { monster: t, x: t.x, y: t.y });
  };

  // ------------------------------ projectiles ------------------------------
  // o: { x, y, ang, speed, shape, color, radius, faction, life, pierce, explode, homing,
  //      spec (player damage spec)  |  dmg, dtype, st, srcId, lvl, affixes (monster) }
  game.spawnProjectile = function (o) {
    const sp = (o.faction || 'enemy') === 'enemy' ? 1.1 : 1;          // R6.3: hostile shots keep pace with the faster player (same reach)
    const pr = {
      id: G.newId(), x: o.x, y: o.y, vx: Math.cos(o.ang) * o.speed * sp, vy: Math.sin(o.ang) * o.speed * sp,
      shape: o.shape || 'orb', color: o.color || '#ffffff', radius: o.radius || 0.22, angle: o.ang,
      faction: o.faction || 'enemy', life: (o.life || 1.6) / sp, pierce: o.pierce || 0, hit: [], explode: o.explode || 0, homing: o.homing || 0,
      spec: o.spec || null, dmg: o.dmg || 0, dtype: o.dtype || 'phys', st: o.st || null, srcId: o.srcId || 0, lvl: o.lvl || 1, affixes: o.affixes || null,
    };
    G.state.projectiles.push(pr);
    return pr;
  };

  function projDamage(pr, t) {
    if (pr.spec) {
      game.playerHit(t, pr.spec);
    } else {
      const src = game.byId(pr.srcId);
      const parts = {};
      parts[pr.dtype] = pr.dmg;
      const dealt = game.applyHit(t, parts, { src: src && !src.dead ? src : null, lvl: pr.lvl, canDodge: !pr.explode, canBlock: !pr.explode });
      if (dealt > 0 && !t.dead) game.monsterOnHit(src, t, dealt, pr.st, pr.affixes);
    }
  }

  function projImpact(pr, t) {
    if (pr.explode) {
      U.fx('explosion', pr.x, pr.y, { radius: pr.explode, color: pr.color });
      hitSfx('fire');
      const list = targetsFor(pr.faction);
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        if (!e.dead && Math.hypot(e.x - pr.x, e.y - pr.y) <= pr.explode + e.radius) projDamage(pr, e);
      }
    } else if (t) {
      projDamage(pr, t);
    } else {
      U.fx('spark', pr.x, pr.y, { color: pr.color });
    }
  }

  const tmpTargets = [];
  function targetsFor(faction) {
    if (faction === 'player') return game.live.foes;
    tmpTargets.length = 0;
    const p = G.state.player;
    if (p && !p.dead) tmpTargets.push(p);
    const al = game.live.allies;
    for (let i = 0; i < al.length; i++) tmpTargets.push(al[i]);
    return tmpTargets;
  }

  game.updateProjectiles = function (dt) {
    const list = G.state.projectiles;
    for (let i = list.length - 1; i >= 0; i--) {
      const pr = list[i];
      if (!pr || pr.vx === undefined) continue;
      pr.life -= dt;
      let gone = pr.life <= 0;
      if (pr.homing && !gone) {
        const t = game.byId(pr.homing);
        if (t && !t.dead) {
          const sp = Math.hypot(pr.vx, pr.vy), want = Math.atan2(t.y - pr.y, t.x - pr.x);
          let d = want - pr.angle;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          pr.angle += U.clamp(d, -6 * dt, 6 * dt);
          pr.vx = Math.cos(pr.angle) * sp; pr.vy = Math.sin(pr.angle) * sp;
        }
      }
      const steps = Math.max(1, Math.ceil(Math.hypot(pr.vx, pr.vy) * dt / 0.2));
      const sx = pr.vx * dt / steps, sy = pr.vy * dt / steps;
      const targets = targetsFor(pr.faction);
      for (let s = 0; s < steps && !gone; s++) {
        const clear = W.shotClear(pr.x, pr.y, pr.x + sx, pr.y + sy);
        pr.x += sx; pr.y += sy;
        if (!clear) { projImpact(pr, null); gone = true; break; }
        for (let k = targets.length - 1; k >= 0; k--) {
          const t = targets[k];
          if (!t || t.dead) continue;
          const rr = t.radius + pr.radius;
          const dx = t.x - pr.x, dy = t.y - pr.y;
          if (dx * dx + dy * dy > rr * rr || pr.hit.indexOf(t.id) >= 0) continue;
          if (pr.spec && game.getEffect(t, 'reflect')) {        // legendary Reflecting: the shot turns on its owner
            const p = G.state.player, w = p.bonus.w;
            pr.dmg = (w.min + w.max) * 0.5 * pr.spec.pct / 100 * (1 + p.stats.dmgPct / 100) * 0.6;
            pr.dtype = pr.spec.type || 'phys'; pr.spec = null; pr.faction = 'enemy'; pr.srcId = t.id; pr.lvl = t.level;
            pr.vx = -pr.vx; pr.vy = -pr.vy; pr.angle += Math.PI; pr.hit = [t.id]; pr.life = Math.max(pr.life, 0.8); pr.explode = 0;
            U.fx('spark', pr.x, pr.y, { color: '#7fd4ff' });
            break;
          }
          projImpact(pr, t);
          if (pr.vol) for (let q = 0; q < list.length; q++) if (list[q].vol === pr.vol && list[q] !== pr) list[q].hit.push(t.id);      // rest of the volley passes this target by
          if (pr.spec && !pr.child && !pr.didSplit && game.fxOf(G.state.player).split_shot) {      // mythic: split on first hit
            pr.didSplit = true;
            U.fx('spark', pr.x, pr.y, { color: pr.color });
            for (let q = -1; q <= 1; q += 2) {
              const c = game.spawnProjectile({ x: pr.x, y: pr.y, ang: pr.angle + q * 0.5, speed: Math.hypot(pr.vx, pr.vy), shape: pr.shape, color: pr.color, radius: pr.radius * 0.8,
                faction: 'player', life: 0.6, spec: Object.assign({}, pr.spec, { pct: pr.spec.pct * 0.5 }) });
              c.child = true; c.hit.push(t.id);
            }
          }
          if (pr.pierce > 0 && !pr.explode) { pr.pierce--; pr.hit.push(t.id); }
          else { gone = true; }
          break;
        }
      }
      if (gone) {
        if (pr.life <= 0 && pr.explode) projImpact(pr, null);
        const at = list.indexOf(pr);
        if (at >= 0) list.splice(at, 1);
      }
    }
  };

  // ------------------------------ zones ------------------------------
  // { x, y, r, faction, delay (telegraph), t (lifetime after delay; omit for a single blast), every,
  //   pct/dtype/st (player)  |  dmg/dtype/st/lvl/srcId (enemy), fx, color, shake, trap }
  game.addZone = function (z) {
    z.faction = z.faction || 'player';
    z.delay = z.delay || 0;
    z.acc = z.every || 0;            // periodic zones tick immediately once live
    z.pulse = 0;
    game.zones.push(z);
    if (z.delay > 0) U.fx('ring', z.x, z.y, { radius: z.r, color: z.color, duration: z.delay });
    else if (z.every && !z.trap) U.fx('ring', z.x, z.y, { radius: z.r, color: z.color, duration: z.t });
    return z;
  };

  function zoneBlast(z) {
    U.fx(z.fx || 'explosion', z.x, z.y, { radius: z.r, color: z.color });
    if (z.shake) U.shake(z.shake, 0.25);
    if (z.faction === 'player') {
      const foes = game.live.foes, spec = { pct: z.pct, type: z.dtype, st: z.st };
      for (let i = foes.length - 1; i >= 0; i--) {
        const e = foes[i];
        if (!e || e.dead || Math.hypot(e.x - z.x, e.y - z.y) > z.r + e.radius) continue;
        if (z.raw) { const parts = {}; parts[z.dtype || 'phys'] = z.raw; game.applyHit(e, parts, { src: G.state.player }); }    // fixed damage (corpse_blast)
        else game.playerHit(e, spec);
      }
    } else {
      const list = targetsFor('enemy'), src = game.byId(z.srcId);
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        if (e.dead || Math.hypot(e.x - z.x, e.y - z.y) > z.r + e.radius * 0.5) continue;
        const parts = {};
        parts[z.dtype || 'phys'] = z.dmg;
        const dealt = game.applyHit(e, parts, { src: src && !src.dead ? src : null, lvl: z.lvl });
        if (dealt > 0 && !e.dead) game.monsterOnHit(src, e, dealt, z.st, z.affixes);
      }
    }
  }

  // Is the player standing in an enemy zone's blast radius (same test as zoneBlast)?
  function playerIn(z) {
    const p = G.state.player;
    return !!p && !p.dead && Math.hypot(p.x - z.x, p.y - z.y) <= z.r + p.radius * 0.5;
  }

  game.updateZones = function (dt) {
    const zs = game.zones;
    for (let i = zs.length - 1; i >= 0; i--) {
      const z = zs[i];
      if (z.delay > 0) {
        z.delay -= dt;
        if (z.faction === 'enemy' && !z.every && z.delay < 0.6 && playerIn(z)) z.near = 1;      // was in the circle near the end
        if (z.delay > 0) continue;
        if (!z.every && !z.trap) {
          const close = z.near && z.faction === 'enemy' && !playerIn(z);
          zoneBlast(z);
          if (close && game.closeCall) game.closeCall(z);          // stepped out at the last moment
          if (z.linger) {          // leaves a damaging pool behind
            z.every = z.linger.every; z.t = z.linger.t; z.acc = 0; z.dmg = z.lingerDmg; z.fx = z.lingerFx || 'poison'; z.linger = null;
            U.fx('ring', z.x, z.y, { radius: z.r, color: z.color, duration: z.t });
          } else { zs.splice(i, 1); }
          continue;
        }
      }
      z.t -= dt;
      if (z.trap) {
        z.pulse -= dt;
        if (z.pulse <= 0) { z.pulse = 1; U.fx('ring', z.x, z.y, { radius: 0.5, color: z.color, duration: 0.9 }); }
        const foes = targetsFor(z.faction);          // player traps catch monsters; enemy glyphs (deep floors) catch the player and minions
        let sprung = false;
        for (let k = 0; k < foes.length; k++) {
          const e = foes[k];
          if (!e.dead && Math.hypot(e.x - z.x, e.y - z.y) < 1.1 + e.radius) { sprung = true; break; }
        }
        if (sprung && z.glyph) {          // deep-floor glyph: flares, then bursts a moment later
          z.trap = false; z.delay = 0.75; z.t = 0;
          U.fx('ring', z.x, z.y, { radius: z.r, color: z.color, duration: 0.75 }); U.sfx('cast');
          continue;
        }
        if (sprung) { U.sfx('hit'); zoneBlast(z); zs.splice(i, 1); continue; }
      } else if (z.every) {
        z.acc += dt;
        if (z.acc >= z.every) { z.acc -= z.every; zoneBlast(z); }
      }
      if (z.t <= 0) zs.splice(i, 1);
    }
  };

  G.on('scene:changed', function () { game.zones.length = 0; game.live.foes.length = 0; game.live.allies.length = 0; });
})();

// R2.4: dying to an aggroed boss or inside a sealed lockdown room leaves no retrievable corpse.
(function () {
  'use strict';
  const G = window.G, game = G.game;
  game.isNoRetrieve = function () {
    const S = G.state;
    if (S.flags && S.flags.sealed) return true;
    const ents = S.entities;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.rarity === 'boss' && !e.dead && e.ai && e.ai.st !== 'sleep') return true;
    }
    return false;
  };
})();
