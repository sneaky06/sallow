// Player creation, stat computation, XP/levelling, skill learning, respec and the auto-build allocator.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C;
  const game = G.game;
  const U = game.U;

  game.LEVEL_CAP = 60;
  game.MARTIAL = { warrior: 1, ranger: 1 };     // skills swing with the weapon; other classes cast at a fixed rate
  game.ATTR_PER_LEVEL = 3;
  game.SKILL_PER_LEVEL = 1;
  const RANGED = { bow: 1, staff: 1, wand: 1 };

  // XP needed to advance from `level` to level + 1. Strictly increasing.
  game.getXpForLevel = function (level) {
    level = Math.max(1, level | 0);
    return Math.round(40 * Math.pow(level, 1.8) + 60 * level);
  };

  game.getRespecCost = function () {
    const p = G.state.player;
    return p ? 25 * p.level : 0;
  };

  game.createPlayer = function (classId, name) {
    const cls = game.CLASSES[classId] || game.CLASSES.warrior;
    const equipment = {};
    for (const s of C.EQUIP_SLOTS) equipment[s] = null;
    const bar = [];
    for (let i = 0; i < C.SKILL_SLOTS; i++) bar.push(null);
    const inv = [];
    for (let i = 0; i < C.INV_SIZE; i++) inv.push(null);
    const p = {
      id: G.newId(), type: 'player', name: name || cls.name, x: 0, y: 0, radius: 0.3, facing: 0.8,
      sprite: Object.assign({}, cls.sprite), anim: 'idle', animT: 0, hitFlash: 0, dead: false,
      level: 1, hp: 1, mp: 1, stats: U.zeroStats(), effects: [], faction: 'player',
      classId: cls.id, xp: 0, xpNext: game.getXpForLevel(1),
      attrs: Object.assign({}, cls.baseAttrs), attrPoints: 0, skillPoints: 1,
      skills: {}, skillBar: bar, cooldowns: {}, autoBuild: null,
      gold: 0, inventory: inv, equipment: equipment, potions: { hp: 3, mp: 1 },
      bonus: {}, minions: {},
      perks: {}, feats: {}, wager: null, wagerCredits: 0,          // R11 perk trees (perks.js)
    };
    game.recomputeStats(p, true);
    p.hp = p.stats.hpMax;
    p.mp = p.stats.mpMax;
    return p;
  };

  function readWeapon(p, cls) {
    let w = null;
    if (p.equipment && p.equipment.weapon && G.items && G.items.getWeapon) {
      try { w = G.items.getWeapon(p); } catch (err) { w = null; }
    }
    if (!w || !(w.dmgMax > 0)) {
      // nothing equipped (or no items module): an improvised class weapon so every class keeps its attack style
      const s = cls.starter, k = 1;
      w = { dmgMin: s.dmgMin * k, dmgMax: s.dmgMax * k, attackSpeed: s.attackSpeed, weaponType: s.weaponType };
    }
    return { min: w.dmgMin || 1, max: Math.max(w.dmgMax || 1, w.dmgMin || 1), aps: w.attackSpeed || 1.2, type: w.weaponType || 'none', ranged: RANGED[w.weaponType] ? 1 : 0 };
  }

  // silent = true skips the player:stats event (used during creation / batch allocation).
  game.recomputeStats = function (ent, silent) {
    if (!ent || ent.type !== 'player') return;      // monsters carry fixed stats computed at spawn
    const p = ent;
    const cls = game.CLASSES[p.classId] || game.CLASSES.warrior;
    const st = U.zeroStats();
    const bonus = { hpPct: 0, mpPct: 0, armorPct: 0 };

    let gear = null;
    if (G.items && G.items.getEquipmentMods) {
      try { gear = G.items.getEquipmentMods(p); } catch (err) { gear = null; }
    }
    if (gear) for (const k in gear) if (st[k] !== undefined && typeof gear[k] === 'number') st[k] += gear[k];
    let ms = null;          // R12: permanent milestone bonuses (UI/meta)
    if (G.meta && G.meta.getMilestoneMods) { try { ms = G.meta.getMilestoneMods(); } catch (err) { ms = null; } }
    if (ms) for (const k in ms) if (st[k] !== undefined && typeof ms[k] === 'number') st[k] += ms[k];

    const allSkills = st.allSkills | 0;
    for (const id in p.skills) {
      const sk = game.SKILLS[id], rank = p.skills[id];
      if (!sk || sk.kind !== 'passive' || !(rank > 0)) continue;
      const V = game.skillValues(sk, rank + allSkills);
      if (sk.mods) { const m = sk.mods(V, p); for (const k in m) st[k] += m[k]; }
      if (sk.bonus) { const b = sk.bonus(V, p); for (const k in b) bonus[k] = (bonus[k] || 0) + b[k]; }
    }
    if (game.perkStats) game.perkStats(p, st, bonus, false);          // R11 perks
    for (const e of p.effects) if (e.mods) for (const k in e.mods) if (st[k] !== undefined) st[k] += e.mods[k];

    // mythic effects (R2.2): ids only, behaviour lives in this module
    let fx = null;
    if (G.items && G.items.getActiveEffects) {
      try { fx = G.items.getActiveEffects(p); } catch (err) { fx = null; }
    }
    bonus.fx = {};
    if (fx) for (const k in fx) if (fx[k]) bonus.fx[k] = true;
    if (G.items && G.items.getRelicEffects) {          // R7.10: relic powers of the Fallen use the same switchboard as mythic effects
      try { const rf = G.items.getRelicEffects(); for (const k in rf) if (rf[k]) bonus.fx[k] = true; } catch (err) { /* items not loaded */ }
    }
    if (bonus.fx.hoarder) { bonus.hoard = Math.min(60, Math.floor((p.gold || 0) / 100)); st.dmgPct += bonus.hoard; }

    st.str += p.attrs.str; st.dex += p.attrs.dex; st.int += p.attrs.int; st.vit += p.attrs.vit;
    const lv = p.level - 1;
    st.hpMax = Math.round((cls.hp + st.vit * (cls.hpVit || 8) + lv * cls.hpLvl + st.hpMax) * (1 + bonus.hpPct / 100));
    st.mpMax = Math.round((cls.mp + st.int * 4 + lv * cls.mpLvl + st.mpMax) * (1 + bonus.mpPct / 100));
    st.hpRegen = Math.round((0.6 + st.vit * 0.05 + st.hpRegen) * 100) / 100;
    st.mpRegen = Math.round((cls.mpRegen + st.int * 0.05 + st.mpRegen) * 100) / 100;
    st.armor = Math.round((st.str + st.armor) * (1 + bonus.armorPct / 100));
    st.dmgPct = Math.round(st.dmgPct + st[cls.primaryStat]);          // 1% damage per point of the class's primary stat
    st.dmgMin = Math.round((st.dmgMin + p.level * 0.3) * 10) / 10;       // small innate growth so levels matter without gear
    st.dmgMax = Math.round((st.dmgMax + p.level * 0.5) * 10) / 10;
    st.critChance = Math.min(75, Math.round((5 + st.dex * 0.1 + st.critChance) * 10) / 10);
    st.critDmg = 50 + st.critDmg;
    st.dodge = Math.min(60, Math.round((st.dex * 0.1 + st.dodge) * 10) / 10);
    st.block = Math.min(60, st.block);
    st.cdr = Math.min(60, st.cdr);
    st.resFire = Math.min(75, st.resFire + st.resAll);
    st.resCold = Math.min(75, st.resCold + st.resAll);
    st.resLightning = Math.min(75, st.resLightning + st.resAll);
    st.resPoison = Math.min(75, st.resPoison + st.resAll);
    st.pickupRadius = 2 + st.pickupRadius;

    bonus.w = readWeapon(p, cls);
    if (game.perkStats) game.perkStats(p, st, bonus, true);          // R11 perks that depend on the weapon
    // R8.7: a weapon outside the class's weaponTypes costs damage (G.items.classPenalty when the items team provides it,
    // else the lead default −35%) and locks the skills that need a class weapon (game.weaponLock).
    bonus.offClass = 0;
    const licensed = bonus.licenceAll || (bonus.licence && bonus.licence.indexOf(bonus.w.type) >= 0);          // R11 Crossroads licences
    if (p.equipment && p.equipment.weapon && cls.weaponTypes.indexOf(bonus.w.type) < 0 && !licensed) {
      let pen = -35;
      if (G.items && G.items.classPenalty) {
        try {
          const r = G.items.classPenalty(p.equipment.weapon, p.classId);
          if (typeof r === 'number') pen = r; else if (r && typeof r.dmgPct === 'number') pen = r.dmgPct; else if (r === null || r === false) pen = 0;
        } catch (err) { /* keep the default */ }
      }
      bonus.offClass = pen;
    }
    bonus.shatterFire = p.skills.frost_nova > 0 ? 1 : 0;
    bonus.dr = cls.dr || 0;                                     // innate class damage reduction (Warrior)        // sorcerer combo: fire shatters frozen enemies
    p.stats = st;
    p.bonus = bonus;
    if (p.hp > st.hpMax) p.hp = st.hpMax;
    if (p.mp > st.mpMax) p.mp = st.mpMax;
    if (!silent) G.emit('player:stats', {});
  };

  // ---- XP / levels ----
  function levelUp(p) {
    p.level++;
    p.attrPoints += game.ATTR_PER_LEVEL;
    p.skillPoints += game.SKILL_PER_LEVEL;
    p.xpNext = game.getXpForLevel(p.level);
    if (p.autoBuild) autoSpend(p, true);
    game.recomputeStats(p);
    p.hp = p.stats.hpMax;
    p.mp = p.stats.mpMax;
    U.fx('levelup', p.x, p.y, {});
    U.sfx('levelup');
    U.text(p.x, p.y - 0.6, 'LEVEL ' + p.level, '#ffe45b', true);
    G.emit('player:levelup', { level: p.level });
    if (p.autoBuild) G.emit('skills:changed', {});
  }

  game.gainXp = function (n) {
    const p = G.state.player;
    if (!p || !(n > 0)) return;
    const gained = Math.max(1, Math.round(n * (1 + (p.stats.xpGain || 0) / 100)));
    if (p.level >= game.LEVEL_CAP) { p.xp = 0; G.emit('player:xp', { xp: 0, xpNext: p.xpNext, gained: 0 }); return; }
    p.xp += gained;
    while (p.level < game.LEVEL_CAP && p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      levelUp(p);
    }
    if (p.level >= game.LEVEL_CAP) p.xp = 0;
    G.emit('player:xp', { xp: p.xp, xpNext: p.xpNext, gained: gained });
  };

  game.spendAttr = function (attr) {
    const p = G.state.player;
    if (!p || p.attrPoints <= 0 || p.attrs[attr] === undefined) return false;
    p.attrs[attr]++;
    p.attrPoints--;
    game.recomputeStats(p);
    return true;
  };

  // ---- skills ----
  game.skillRank = function (p, id) {
    const r = p.skills[id] || 0;
    return r > 0 ? r + (p.stats.allSkills | 0) : 0;
  };
  game.skillMpCost = function (sk, rank) { return Math.max(0, Math.round(sk.mp[0] + sk.mp[1] * (Math.max(1, rank) - 1))); };
  game.skillCooldown = function (p, sk, rank) {
    const cd = sk.cd[0] + sk.cd[1] * (Math.max(1, rank) - 1);
    return Math.max(0, cd * (1 - (p.stats.cdr || 0) / 100));
  };

  function canLearnFor(p, skillId, ignorePoints) {
    const sk = game.SKILLS[skillId];
    if (!p || !sk) return { ok: false, reason: 'Unknown skill' };
    if (sk.classId !== p.classId) return { ok: false, reason: 'Wrong class' };
    if ((p.skills[skillId] || 0) >= sk.maxRank) return { ok: false, reason: 'Max rank' };
    if (p.level < sk.reqLevel) return { ok: false, reason: 'Requires level ' + sk.reqLevel };
    if (sk.requires && !(p.skills[sk.requires] > 0)) return { ok: false, reason: 'Requires ' + game.SKILLS[sk.requires].name };
    if (!ignorePoints && p.skillPoints <= 0) return { ok: false, reason: 'No skill points' };
    return { ok: true };
  }
  game.canLearn = function (skillId) { return canLearnFor(G.state.player, skillId, false); };

  function slotIfFree(p, id) {
    if (game.SKILLS[id].kind !== 'active' || p.skillBar.indexOf(id) >= 0) return;
    const i = p.skillBar.indexOf(null);
    if (i >= 0) p.skillBar[i] = id;
  }

  function learn(p, id, auto) {
    p.skills[id] = (p.skills[id] || 0) + 1;
    p.skillPoints--;
    if (p.skills[id] === 1) slotIfFree(p, id);
    G.emit('skill:learned', { skillId: id, rank: p.skills[id], auto: !!auto });          // R8.10
  }

  game.learnSkill = function (skillId) {
    const p = G.state.player;
    if (!canLearnFor(p, skillId, false).ok) return false;
    learn(p, skillId);
    game.recomputeStats(p);
    G.emit('skills:changed', {});
    return true;
  };

  game.setSkillSlot = function (slot, skillId) {
    const p = G.state.player;
    if (!p || slot < 0 || slot >= C.SKILL_SLOTS) return;
    if (skillId) {
      const sk = game.SKILLS[skillId];
      if (!sk || sk.kind !== 'active' || !(p.skills[skillId] > 0)) return;
      const other = p.skillBar.indexOf(skillId);
      if (other >= 0 && other !== slot) p.skillBar[other] = p.skillBar[slot];
    }
    p.skillBar[slot] = skillId || null;
    G.emit('skills:changed', {});
  };

  function refundSkills(p) {
    let n = 0;
    for (const id in p.skills) n += p.skills[id];
    p.skillPoints += n;
    p.skills = {};
    for (let i = 0; i < p.skillBar.length; i++) p.skillBar[i] = null;
    p.cooldowns = {};
    // drop anything the old skills left behind (buffs, channels, minions)
    p.effects = p.effects.filter(function (e) { return !game.SKILLS[e.id] && e.id !== 'invuln'; });
    if (game.dismissMinions) game.dismissMinions();
  }

  game.respec = function () {
    const p = G.state.player;
    if (!p) return false;
    const cost = game.getRespecCost();
    if ((p.gold || 0) < cost) { U.toast('Respec costs ' + cost + ' gold', '#ff6a6a'); U.sfx('error'); return false; }
    p.gold -= cost;
    G.emit('gold:changed', { gold: p.gold, delta: -cost });
    refundSkills(p);
    const base = game.CLASSES[p.classId].baseAttrs;
    for (const a in base) { p.attrPoints += p.attrs[a] - base[a]; p.attrs[a] = base[a]; }
    if (p.autoBuild) autoSpend(p, true);
    game.recomputeStats(p);
    G.emit('skills:changed', {});
    return true;
  };

  // ---- auto-build ----
  const TAG_W = {
    single:   { single: 10, aoe: 3, defense: 5, buff: 5, mobility: 2, summon: 6 },
    aoe:      { single: 3, aoe: 10, defense: 5, buff: 5, mobility: 2, summon: 6 },
    balanced: { single: 7, aoe: 7, defense: 5, buff: 5, mobility: 2, summon: 6 },
  };

  // Deterministic: first legal step of the class plan, then a tag-weighted fallback once the plan is exhausted.
  function nextAutoSkill(p, mode) {
    const plan = game.BUILDS[p.classId] && game.BUILDS[p.classId][mode];
    if (plan) {
      for (const step of plan.order) {
        const id = step[0];
        if ((p.skills[id] || 0) >= step[1]) continue;
        if (canLearnFor(p, id, true).ok) return id;
        const req = game.SKILLS[id].requires;
        if (req && !(p.skills[req] > 0) && p.level >= game.SKILLS[id].reqLevel && canLearnFor(p, req, true).ok) return req;
      }
    }
    let best = null, bestScore = -1;
    const w = TAG_W[mode] || TAG_W.balanced;
    for (const tree of game.CLASSES[p.classId].trees) {
      for (const id of tree.skills) {
        if (!canLearnFor(p, id, true).ok) continue;
        const sk = game.SKILLS[id];
        let s = 0;
        for (const t of sk.tags) s = Math.max(s, w[t] || 0);
        if (sk.kind === 'passive') s += 4;                    // passives never need a bar slot
        else if (!(p.skills[id] > 0)) s -= 3;                 // avoid opening yet another active
        s += (p.skills[id] || 0) * 0.1;                       // finish what is started
        if (s > bestScore) { bestScore = s; best = id; }
      }
    }
    return best;
  }

  function layoutBar(p, mode) {
    const plan = game.BUILDS[p.classId] && game.BUILDS[p.classId][mode];
    const bar = [];
    if (plan) for (const id of plan.bar) if (p.skills[id] > 0) bar.push(id);
    for (const tree of game.CLASSES[p.classId].trees) {
      for (const id of tree.skills) {
        if (bar.length >= C.SKILL_SLOTS) break;
        if (p.skills[id] > 0 && game.SKILLS[id].kind === 'active' && bar.indexOf(id) < 0) bar.push(id);
      }
    }
    for (let i = 0; i < C.SKILL_SLOTS; i++) p.skillBar[i] = bar[i] || null;
  }

  function autoSpend(p, silent) {
    const mode = p.autoBuild;
    if (!mode) return;
    const cls = game.CLASSES[p.classId], prim = cls.primaryStat;
    while (p.attrPoints > 0) {
      const primSpent = p.attrs[prim] - cls.baseAttrs[prim], vitSpent = p.attrs.vit - cls.baseAttrs.vit;
      p.attrs[vitSpent * 2 < primSpent ? 'vit' : prim]++;       // 2 primary : 1 vitality
      p.attrPoints--;
    }
    while (p.skillPoints > 0) {
      const id = nextAutoSkill(p, mode);
      if (!id) break;
      learn(p, id, true);
    }
    if (game.autoPerks) game.autoPerks(p);          // R11: perk points follow the plan too
    layoutBar(p, mode);
    if (!silent) { game.recomputeStats(p); G.emit('skills:changed', {}); }
  }

  // null → manual. Setting a mode spends every unspent point now and on each level-up. Switching between two auto modes
  // re-plans the skill points for free (they were never hand-placed); going manual → auto keeps hand-placed points —
  // call respec() first (it re-allocates automatically while a mode is set) for a clean rebuild.
  game.setAutoBuild = function (mode) {
    const p = G.state.player;
    if (!p) return;
    if (mode !== 'single' && mode !== 'aoe' && mode !== 'balanced') mode = null;
    const prev = p.autoBuild;
    p.autoBuild = mode;
    if (mode) {
      if (prev && prev !== mode) { refundSkills(p); if (game.resetAutoPerks) game.resetAutoPerks(p); }
      autoSpend(p, true);
      game.recomputeStats(p);
    }
    G.emit('skills:changed', {});
  };

  game.getSkillInfo = function (skillId) {
    const p = G.state.player, sk = game.SKILLS[skillId];
    if (!sk) return null;
    const rank = p ? (p.skills[skillId] || 0) : 0;
    const eff = p ? game.skillRank(p, skillId) : 0;
    const can = p ? canLearnFor(p, skillId, false) : { ok: false, reason: 'No character' };
    const info = Object.assign({}, sk);
    info.rank = rank;
    info.desc = game.skillDesc(sk, eff || 1);
    info.nextRankDesc = rank < sk.maxRank ? game.skillDesc(sk, rank === 0 ? 1 : eff + 1) : null;
    info.mpCost = sk.kind === 'active' ? game.skillMpCost(sk, eff || 1) : 0;
    info.cooldown = sk.kind === 'active' && p ? Math.round(game.skillCooldown(p, sk, eff || 1) * 10) / 10 : 0;
    info.cdRemaining = p ? Math.max(0, p.cooldowns[skillId] || 0) : 0;
    info.learnable = can.ok;
    info.lockedReason = can.ok ? null : can.reason;
    const wl = p && game.weaponLock ? game.weaponLock(p, sk) : null;          // R8.7: needs a class weapon
    info.disabled = !!wl; if (wl) info.lockedReason = wl;
    info.synergies = (sk.synergies || []).map(function (s) {
      return { from: s.from, name: game.SKILLS[s.from].name, desc: s.desc, active: !!(p && p.skills[s.from] > 0), combo: !!s.combo };
    });
    return info;
  };
})();

// Hoarder (mythic): damage follows the gold carried — refresh when the +1% bracket changes.
(function () {
  'use strict';
  const G = window.G, game = G.game;
  G.on('gold:changed', function () {
    const p = G.state.player;
    if (!p || !p.bonus || !p.bonus.fx || !p.bonus.fx.hoarder) return;
    if (Math.min(60, Math.floor((p.gold || 0) / 100)) !== p.bonus.hoard) game.recomputeStats(p);
  });
})();

// R8.7: skills that need a class weapon. Warrior swings and Ranger shots need one of the class's weapon types; spells
// (Sorcerer, Necromancer) and non-attack skills work with anything. weaponLock(p, sk) → lockedReason | null.
(function () {
  'use strict';
  const G = window.G, game = G.game;
  const NEEDS = { bash: 1, charge: 1, rend: 1, execute: 1, cleave: 1, whirlwind: 1, leap: 1, earthquake: 1,
    aimed_shot: 1, piercing_shot: 1, poison_arrow: 1, snipe: 1, multishot: 1, rain_of_arrows: 1, explosive_arrow: 1, arrow_storm: 1 };
  game.SKILL_NEEDS_CLASS_WEAPON = NEEDS;
  game.weaponLock = function (p, sk) {
    if (!p || !sk || !NEEDS[sk.id] || !p.bonus || !p.bonus.offClass) return null;
    const cls = game.CLASSES[p.classId];
    return 'Needs a ' + cls.weaponTypes.join(' or ') + ' (you hold a ' + (p.bonus.w.type || 'weapon') + ')';
  };
})();
