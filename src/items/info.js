// Loot & Economy — derived info: equipment totals (incl. gems + set bonuses), weapon profile, scoring,
// compare / isUpgrade, tooltips, starter gear.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  const UNARMED = { dmgMin: 1, dmgMax: 3, attackSpeed: 1.2, weaponType: 'none', twoHanded: false };
  const COL = { grey: '#8a8a92', white: '#e8e8e8', mod: '#8fb4ff', imp: '#c0c8d8', set: '#3ddc6a', red: '#ff5b5b', gold: '#ffd94a', flavor: '#b89b6a', gem: '#e0b0ff',
    pale: '#e8e2cc', awake: '#e8d8a0', match: '#7fd4c8', rift: '#c58cff' };

  function isEquip(item) { return !!item && (item.type === 'weapon' || item.type === 'armor' || item.type === 'jewelry') && !!item.slot; }
  D.isEquip = isEquip;

  // Every mod that counts: rolled + implicit mods (revealed bleached affixes live there too) plus awakened ones (R5.3).
  // item.hidden (an unrevealed bleached affix) never counts.
  const NONE = [];
  function allMods(item) {
    const m = (item && item.mods) || NONE;
    return item && item.awakened && item.awakened.length ? m.concat(item.awakened) : m;
  }
  D.allMods = allMods;

  // Make sure the player carries every container this module relies on (safe to call any time).
  D.ensure = function (p) {
    if (!p) return p;
    if (!Array.isArray(p.inventory)) p.inventory = [];
    while (p.inventory.length < C.INV_SIZE) p.inventory.push(null);
    for (let i = 0; i < p.inventory.length; i++) if (p.inventory[i] === undefined) p.inventory[i] = null;
    if (!p.equipment) p.equipment = {};
    for (const s of C.EQUIP_SLOTS) if (!p.equipment[s]) p.equipment[s] = null;
    if (!p.potions) p.potions = { hp: 0, mp: 0 };
    if (!p.materials) p.materials = { dust: 0, shard: 0, essence: 0, gemdust: 0 };
    if (typeof p.materials.gemdust !== 'number') p.materials.gemdust = 0;
    if (typeof p.gold !== 'number') p.gold = 0;
    return p;
  };

  // Number of distinct pieces of each set in an equipment map.
  function setCounts(eq) {
    const seen = {}, counts = {};
    for (const s of C.EQUIP_SLOTS) {
      const it = eq[s];
      if (!it || !it.setId || seen[it.uniqueId || it.baseId]) continue;
      seen[it.uniqueId || it.baseId] = true;
      counts[it.setId] = (counts[it.setId] || 0) + 1;
    }
    return counts;
  }

  function modsOf(eq) {
    const out = {};
    for (const s of C.STATS) out[s] = 0;
    for (const slot of C.EQUIP_SLOTS) {
      const it = eq[slot];
      if (!it) continue;
      if (it.base && it.type !== 'weapon') {
        if (it.base.armor) out.armor += it.base.armor;
        if (it.base.block) out.block += it.base.block;
      }
      for (const m of allMods(it)) if (out[m.stat] !== undefined) out[m.stat] += m.value;
      if (it.sockets) {
        for (const g of it.sockets) {
          if (g) for (const e of D.gemEffects(g, it)) out[e.stat] += e.value;
        }
      }
    }
    const counts = setCounts(eq);
    for (const id in counts) {
      const set = D.SETS[id];
      if (!set) continue;
      for (const n in set.bonuses) {
        if (counts[id] >= +n) for (const b of set.bonuses[n]) out[b[0]] += b[1];
      }
    }
    const matched = D.matchedOf(eq);          // R5.9 Matched look bonus (separate from sets)
    if (matched) for (const b of matched.bonuses) out[b[0]] += b[1];
    return out;
  }

  // Equipment totals plus permanent bonuses (collection pages, fallen-adventurer relics): D.PERM_MODS = [fn() -> { stat: value }].
  D.PERM_MODS = [];
  I.getEquipmentMods = function (pl) {
    const m = modsOf((pl && pl.equipment) || {});
    if (pl && pl === G.state.player) {
      for (const fn of D.PERM_MODS) {
        const add = fn();
        for (const k in add) m[k] = (m[k] || 0) + add[k];
      }
    }
    return m;
  };

  function weaponOf(eq) {
    const w = eq.weapon;
    if (!w || !w.base || !w.base.dmgMax) return Object.assign({}, UNARMED);
    return { dmgMin: w.base.dmgMin, dmgMax: w.base.dmgMax, attackSpeed: w.base.attackSpeed || 1, weaponType: w.weaponType || 'none', twoHanded: !!w.twoHanded };
  }
  I.getWeapon = function (pl) {
    return weaponOf((pl && pl.equipment) || {});
  };

  function dpsOf(eq) {
    const w = weaponOf(eq);
    return (w.dmgMin + w.dmgMax) / 2 * w.attackSpeed;
  }

  // ---- scoring ----
  function scoreEq(eq, prof) {
    const m = modsOf(eq), w = prof.weights;
    let s = dpsOf(eq) * w.dps;
    for (const k in m) if (m[k]) s += m[k] * (w[k] || 0);
    if (w[prof.primary] === undefined) s += (m[prof.primary] || 0) * 3;
    return s;
  }
  const NO_EQ = {};
  function scoreItem(item, prof) {
    const eq = {};
    eq[item.slot === 'ring' ? 'ring1' : item.slot] = item;
    return scoreEq(eq, prof) - scoreEq(NO_EQ, prof);
  }
  D.scoreItem = function (item, pl) { return isEquip(item) ? scoreItem(item, D.classProfile(pl || G.state.player)) : 0; };

  // What equipping `item` would do: -> { eq: new equipment map, out: [displaced items], slot }.
  D.planEquip = function (eq, item, prof, target) {
    const ne = Object.assign({}, eq);
    const out = [];
    let slot = item.slot;
    if (slot === 'ring') {
      if (target === 'ring1' || target === 'ring2') slot = target;
      else if (!ne.ring1) slot = 'ring1';
      else if (!ne.ring2) slot = 'ring2';
      else slot = scoreItem(ne.ring1, prof) <= scoreItem(ne.ring2, prof) ? 'ring1' : 'ring2';
    }
    if (ne[slot]) out.push(ne[slot]);
    ne[slot] = item;
    if (slot === 'weapon' && item.twoHanded && ne.offhand) { out.push(ne.offhand); ne.offhand = null; }
    if (slot === 'offhand' && ne.weapon && ne.weapon.twoHanded) { out.push(ne.weapon); ne.weapon = null; }
    return { eq: ne, out: out, slot: slot };
  };

  // Names of the classes that favour a weapon type, e.g. ['Warrior'].
  function favouredBy(weaponType) {
    const out = [];
    const gc = G.game && G.game.CLASSES;
    if (gc) {
      for (const id in gc) {
        if ((gc[id].weaponTypes || []).indexOf(weaponType) >= 0) out.push(gc[id].name || id);
      }
    } else {
      for (const id in D.CLASS) {
        if (D.CLASS[id].weapons.indexOf(weaponType) >= 0) out.push(id.charAt(0).toUpperCase() + id.slice(1));
      }
    }
    return out;
  }

  // R2.2: effect ids granted by equipped mythics -> { [effectId]: true }
  I.getActiveEffects = function (pl) {
    const out = {};
    const eq = (pl && pl.equipment) || {};
    for (const s of C.EQUIP_SLOTS) {
      const it = eq[s];
      if (it && it.effects) for (const id of it.effects) out[id] = true;
    }
    return out;
  };

  // Stat deltas if `item` replaced what is worn (two-handers, off-hands and set bonuses included). Adds `dps` for weapon swaps.
  I.compare = function (item) {
    const p = G.state.player;
    const out = {};
    if (!p || !isEquip(item)) return out;
    const eq = p.equipment || {};
    for (const s of C.EQUIP_SLOTS) if (eq[s] === item) return out;
    const plan = D.planEquip(eq, item, D.classProfile(p));
    const a = modsOf(eq), b = modsOf(plan.eq);
    for (const k of C.STATS) {
      const d = Math.round((b[k] - a[k]) * 100) / 100;
      if (d) out[k] = d;
    }
    const dd = Math.round((dpsOf(plan.eq) - dpsOf(eq)) * 10) / 10;
    if (dd && (plan.eq.weapon !== eq.weapon)) out.dps = dd;
    return out;
  };

  // ---- Power (R7.2) ----
  // One number per equippable item for a class: K x the class-weighted stat score (weapon DPS, base armour, every counted
  // affix incl. implicit, awakened and revealed ones; unrevealed hidden affixes and corrupted drawbacks count as they are) plus
  // item level x slot weight, sockets (filled more than empty) and effect / set value.
  D.POWER = { K: 0.35, ilvl: 3, slot: { weapon: 1.4, chest: 1.2, offhand: 1, helm: 1, gloves: 0.9, boots: 0.9, belt: 0.8, amulet: 1.3, ring: 1.2 },
    socketEmpty: 4, socketFilled: 14, effect: 60, setPiece: 20, plus: 0.04 };
  function extrasPower(item) {
    const P = D.POWER;
    let v = (item.ilvl || 1) * P.ilvl * (P.slot[item.slot] || 1);
    for (const g of item.sockets || []) v += g ? P.socketFilled : P.socketEmpty;
    v += (item.effects ? item.effects.length : 0) * P.effect + (item.setId ? P.setPiece : 0);
    return v;
  }
  I.power = function (item, classId) {
    if (!isEquip(item)) return 0;
    const p = G.state.player;
    const prof = classId ? D.classProfile({ classId: classId }) : D.classProfile(p);
    const raw = scoreItem(item, prof) * D.POWER.K * (1 + D.POWER.plus * (item.plus || 0)) + extrasPower(item);
    return Math.max(0, Math.round(raw));
  };
  function powerEq(eq, prof) {
    let extras = 0;
    for (const s of C.EQUIP_SLOTS) {
      const it = eq[s];
      if (!it) continue;
      extras += extrasPower(it) + (it.plus ? scoreItem(it, prof) * D.POWER.plus * it.plus : 0);
    }
    // scoreEq already includes set bonuses (modsOf)
    return scoreEq(eq, prof) * D.POWER.K + extras;
  }

  // ---- verdict (R3.4) ----
  // Offence of a whole equipment map for this player, mirroring src/game's damage roll: weapon + flat damage, x %damage
  // (gear + the class's primary stat), x crit, x speed; casters also x skill damage. Non-gear contributions (attributes,
  // passives, level growth) are read from player.stats when present so a +30% roll is weighed against what is already there.
  function isMartial(p) {
    if (G.game && G.game.MARTIAL) return !!G.game.MARTIAL[p.classId];
    return p.classId === 'warrior' || p.classId === 'ranger';
  }
  function offence(p, prof, eq, cur) {
    const g = modsOf(eq), st = p.stats || {}, prim = prof.primary;
    const base = function (k, dflt) { return st[k] !== undefined ? st[k] - cur[k] : dflt; };
    const dmgMin = base('dmgMin', 0) + g.dmgMin, dmgMax = base('dmgMax', 0) + g.dmgMax;
    const dmgPct = (st.dmgPct !== undefined ? st.dmgPct - cur.dmgPct - cur[prim] : ((p.attrs && p.attrs[prim]) || 0)) + g.dmgPct + g[prim];
    const crit = Math.min(75, base('critChance', 5) + g.critChance), critDmg = base('critDmg', 50) + g.critDmg;
    const elem = g.fireDmg + g.coldDmg + g.lightningDmg + g.poisonDmg + base('fireDmg', 0) + base('coldDmg', 0) + base('lightningDmg', 0) + base('poisonDmg', 0);
    const w = weaponOf(eq), avg = (w.dmgMin + w.dmgMax + dmgMin + dmgMax) / 2;
    const scale = (1 + dmgPct / 100) * (1 + crit / 100 * critDmg / 100);
    if (isMartial(p)) return (avg + elem) * w.attackSpeed * (1 + (base('attackSpeed', 0) + g.attackSpeed) / 100) * scale;
    return (avg * w.attackSpeed * 0.75 + elem) * scale * (1 + (base('skillDmgPct', 0) + g.skillDmgPct) / 100) *
      (1 + (base('castSpeed', 0) + g.castSpeed) / 100);
  }

  // 'up' | 'down' | 'same' | null. Weapons are judged on offence first (a clearly harder-hitting weapon is an upgrade even
  // if it costs a shield), whatever class favours them; everything else on the class-weighted score.
  I.verdict = function (item) {
    const p = G.state.player;
    if (!p || !isEquip(item)) return null;
    if ((item.reqLevel || 1) > (p.level || 1)) return null;
    const eq = p.equipment || {};
    for (const s of C.EQUIP_SLOTS) if (eq[s] === item) return null;
    const prof = D.classProfile(p);
    const plan = D.planEquip(eq, item, prof);
    if (item.slot === 'weapon') {
      const cur = modsOf(eq);
      const a = offence(p, prof, eq, cur), b = offence(p, prof, plan.eq, cur);
      if (b > a * 1.05) return 'up';
      if (b < a * 0.95) return 'down';
    }
    const before = powerEq(eq, prof), after = powerEq(plan.eq, prof);      // R7.2: the verdict compares Power
    // filling an empty slot needs no margin; replacing something needs a 1% swing so near-identical items read 'same'
    const tol = plan.out.length ? Math.max(0.5, Math.abs(before) * 0.01) : 0.01;
    return after > before + tol ? 'up' : after < before - tol ? 'down' : 'same';
  };

  I.isUpgrade = function (item) { return I.verdict(item) === 'up'; };

  // Weapon DPS as shown to the player: base damage plus the item's own flat damage, x speed, x the item's %damage.
  D.itemDps = function (item) {
    const b = item && item.base;
    if (!b || !b.dmgMax) return 0;
    let mn = b.dmgMin, mx = b.dmgMax, pct = 0;
    for (const m of allMods(item)) {
      if (m.stat === 'dmgMin') mn += m.value;
      else if (m.stat === 'dmgMax') mx += m.value;
      else if (m.stat === 'dmgPct') pct += m.value;
    }
    return Math.round((mn + mx) / 2 * (b.attackSpeed || 1) * (1 + pct / 100) * 10) / 10;
  };
  function itemArmor(item) {
    let a = (item && item.base && item.base.armor) || 0;
    if (item) for (const m of allMods(item)) if (m.stat === 'armor') a += m.value;
    return a;
  }
  function statOf(item, stat) {
    let v = 0;
    if (item) for (const m of allMods(item)) if (m.stat === stat) v += m.value;
    return v;
  }

  // One number to lead a tooltip with: weapon DPS, armour, or the item's best stat for this class; delta vs what it replaces.
  function detailLine(item) {
    if (!isEquip(item)) return null;
    const p = G.state.player;
    const prof = D.classProfile(p);
    let worn = false, replaced = null;
    if (p && p.equipment) {
      for (const s of C.EQUIP_SLOTS) if (p.equipment[s] === item) worn = true;
      if (!worn) replaced = D.planEquip(p.equipment, item, prof).out[0] || null;
    }
    const cmp = p && !worn;
    let h;
    if (item.type === 'weapon') {
      const v = D.itemDps(item);
      const held = p && p.equipment && p.equipment.weapon;
      const old = held ? D.itemDps(held) : (UNARMED.dmgMin + UNARMED.dmgMax) / 2 * UNARMED.attackSpeed;
      h = { label: 'DPS', value: v, delta: cmp ? Math.round((v - old) * 10) / 10 : null, pct: false };
    } else if (itemArmor(item) > 0) {
      const v = itemArmor(item);
      h = { label: 'Armor', value: v, delta: cmp ? v - itemArmor(replaced) : null, pct: false };
    } else {
      let best = null, bw = -1;
      for (const m of allMods(item)) {
        const w = Math.abs(m.value) * ((prof.weights[m.stat] || 0.1));
        if (w > bw) { bw = w; best = m.stat; }
      }
      if (!best) return null;
      const v = statOf(item, best);
      h = { label: I.statLabel(best), value: v, delta: cmp ? v - statOf(replaced, best) : null, pct: !!(D.STAT_INFO[best] || [])[1], stat: best };
    }
    return h;
  }

  // R7.2 headline: "Power 412 ▲ +37". delta = this item's Power minus the Power of everything it would displace (null when worn).
  function headline(item) {
    if (!isEquip(item)) return null;
    const p = G.state.player;
    const v = I.power(item);
    let delta = null;
    if (p && p.equipment) {
      let worn = false;
      for (const s of C.EQUIP_SLOTS) if (p.equipment[s] === item) worn = true;
      if (!worn) {
        const plan = D.planEquip(p.equipment, item, D.classProfile(p));
        let old = 0;
        for (const o of plan.out) old += I.power(o);
        delta = v - old;
      }
    }
    return { label: 'Power', value: v, delta: delta, pct: false };
  }

  // ---- text ----
  I.statLabel = function (stat) { return (D.STAT_INFO[stat] || [stat])[0]; };
  I.formatStat = function (stat, value) {
    const info = D.STAT_INFO[stat] || [stat];
    return (value >= 0 ? '+' : '') + value + (info[1] ? '% ' : ' ') + info[0];
  };

  function typeLine(item) {
    const def = D.BASES[item.baseId];
    const r = C.RARITY[item.rarity] || C.RARITY.common;
    if (item.type === 'lore') return 'Lore Page';
    if (!def) return r.name + ' ' + (item.type === 'gem' ? 'Gem' : item.type === 'material' ? 'Material' : 'Consumable');
    const named = item.name.replace(/ \+\d+$/, '') !== def.name;
    return r.name + (item.setId ? ' · ' + D.MISC_NAMES.setTag : '') + ' ' + (D.TYPE_NAME[def.family] || def.family) + (named && (item.uniqueId || item.rarity === 'rare' || item.rarity === 'magic' || item.rarity === 'unique') ? ' — ' + def.name : '');
  }

  I.getTooltip = function (item) {
    if (!item) return { name: '', color: COL.white, lines: [] };
    const r = C.RARITY[item.rarity] || C.RARITY.common;
    const lines = [];
    const tip = { name: item.name + (item.qty > 1 ? ' ×' + item.qty : ''), color: r.color, lines: lines, headline: null };
    if (item.type === 'gold') { tip.name = item.qty + ' ' + D.MISC_NAMES.gold; tip.color = COL.gold; return tip; }
    const p = G.state.player;
    let worn = false;
    if (p && p.equipment) for (const s of C.EQUIP_SLOTS) if (p.equipment[s] === item) worn = true;
    tip.headline = headline(item);       // R7.2: { label: 'Power', value, delta, pct: false } — delta vs what it would replace, null if nothing to compare
    tip.detail = detailLine(item);       // the old R3.4 headline (DPS / armour / best stat), kept for a second line
    tip.locked = !!item.locked;          // R5.8: the UI draws the lock toggle from this
    tip.wanted = !!(D.isWanted && D.isWanted(item));      // R7.11: fills a missing Collection Book entry (UI draws a book mark)
    tip.bleached = !!(item.bleached && item.hidden);

    lines.push({ text: typeLine(item), color: COL.grey });
    // the mythic effect sits directly beneath the "Legendary Mythic …" label
    for (const id of item.effects || []) {
      const fx = I.EFFECTS[id];
      if (fx) lines.push({ text: '✦ ' + fx.name + ': ' + fx.desc, color: C.RARITY.mythic.color });
    }

    if (item.type === 'gem') {
      const g = D.GEMS[item.baseId];
      if (g) {
        const k = D.gemKind(g), blood = g.family === 'blood';
        lines.push({ text: blood ? 'Bloodstone — fuses permanently' : 'Cut gem — removable', color: blood ? COL.red : COL.set });
        lines.push({ text: 'Weapon: ' + I.formatStat(k.w[0], k.w[1][g.tier]), color: COL.mod });
        lines.push({ text: 'Armor: ' + I.formatStat(k.a[0], k.a[1][g.tier]), color: COL.mod });
        lines.push({ text: 'Jewelry: ' + I.formatStat(k.j[0], k.j[1][g.tier]), color: COL.mod });
        if (k.x) lines.push({ text: 'Always: ' + I.formatStat(k.x[0], k.x[1][g.tier]), color: k.x[1][g.tier] < 0 ? COL.red : COL.mod });
        lines.push({ text: blood
          ? 'Once socketed it can NEVER be removed, and it cannot be combined.'
          : 'Socket into gear. The blacksmith can remove it for gold; three combine into the next cut.', color: COL.grey });
      }
    } else if (item.type === 'consumable') {
      const c = D.CONSUMABLES[item.baseId];
      if (c) lines.push({ text: c.desc, color: COL.white });
    } else if (item.type === 'lore') {
      lines.push({ text: 'A page from an old account. Pick it up to read it in your journal.', color: COL.white });
      return tip;
    } else if (item.type === 'material') {
      lines.push({ text: 'Crafting material for the blacksmith.', color: COL.white });
    } else {
      const b = item.base || {};
      if (item.type === 'weapon' && b.dmgMax) {
        lines.push({ text: b.dmgMin + '–' + b.dmgMax + ' Damage', color: COL.white });
        lines.push({ text: b.attackSpeed.toFixed(2) + ' attacks/sec  (' + D.itemDps(item).toFixed(1) + ' DPS)', color: COL.white });
        if (item.twoHanded) lines.push({ text: 'Two-Handed', color: COL.grey });
      }
      if (b.armor) lines.push({ text: b.armor + ' Armor', color: COL.white });
      if (b.block) lines.push({ text: b.block + '% Block', color: COL.white });
      for (const m of item.mods || []) if (m.implicit) lines.push({ text: I.formatStat(m.stat, m.value), color: COL.imp });
      for (const m of item.mods || []) {
        if (m.implicit) continue;
        const CT = D.CORRUPT || {};
        const tag = m.bleached ? '  (bleached)' : m.corrupt === 'up' ? CT.upsideTag : m.corrupt === 'down' ? CT.drawbackTag : m.cleansed ? CT.latentTag : '';
        lines.push({ text: I.formatStat(m.stat, m.value) + (tag || ''), color: m.bleached ? COL.pale : m.corrupt === 'down' ? COL.red : (m.corrupt === 'up' || m.cleansed) ? COL.rift : COL.mod });
      }
      if (item.latent && item.latent.length) lines.push({ text: D.CORRUPT.latentLine, color: COL.rift });
      tip.corrupted = D.isCorrupt && D.isCorrupt(item);      // R6.5: the UI offers Cleanse at the blacksmith
      // R5.2 bleached: one hidden affix until the item reaches town
      if (item.bleached && item.hidden) lines.push({ text: '??? — bleached; revealed when you bring it to town alive', color: COL.pale });
      else if (item.faded) lines.push({ text: 'Bleached — its secret faded when you fell', color: COL.grey });
      // R5.3 awakened affixes + progress
      for (const a of item.awakened || []) lines.push({ text: '✧ ' + a.name + ': ' + I.formatStat(a.stat, a.value), color: COL.awake });
      const prog = D.awakenProgress && D.awakenProgress(item);
      if (prog && (worn || item.kills)) lines.push({ text: prog, color: COL.grey });
      for (const g of item.sockets || []) {
        if (g) {
          const perm = D.isPermanentGem(g);
          const txt = D.gemEffects(g, item).map(function (e) { return I.formatStat(e.stat, e.value); }).join(', ');
          lines.push({ text: '◆ ' + g.name + ': ' + txt + (perm ? ' (permanent)' : ''), color: perm ? COL.red : COL.gem });
        } else lines.push({ text: '◇ Empty Socket', color: COL.grey });
      }
      if (item.plus) lines.push({ text: 'Upgraded +' + item.plus + ' / ' + D.MAX_PLUS, color: COL.gold });

      const set = item.setId && D.SETS[item.setId];
      if (set) {
        const eq = (p && p.equipment) || {};
        const worn = {};
        for (const s of C.EQUIP_SLOTS) if (eq[s] && eq[s].setId === set.id) worn[eq[s].uniqueId] = true;
        const n = Object.keys(worn).length;
        lines.push({ text: set.name + ' (' + n + '/' + set.pieces.length + ')', color: COL.set });
        for (const k in set.bonuses) {
          const txt = set.bonuses[k].map(function (bn) { return I.formatStat(bn[0], bn[1]); }).join(', ');
          lines.push({ text: '(' + k + ') ' + txt, color: n >= +k ? COL.set : COL.grey });
        }
      }
      // R5.9 look family; armour pieces that can match show the Matched bonus and how many worn pieces share it
      const look = I.getLook(item), fam = look && I.LOOKS[look.family];
      if (fam) {
        if (fam.matched && D.LOOK_SLOTS.indexOf(item.slot) >= 0) {
          const eq = Object.assign({}, (p && p.equipment) || {});
          if (!worn) eq[item.slot] = item;
          let n = 0;
          for (const s of D.LOOK_SLOTS) { const l = I.getLook(eq[s]); if (l && l.family === fam.id) n++; }
          lines.push({ text: fam.name + ' look · Matched ' + n + '/4', color: n >= 2 ? COL.match : COL.grey });
          // the bonuses only once a match is in reach (keeps everyday tooltips short, R3.4)
          if (n >= 2) {
            const txt = [2, 4].map(function (k) {
              return '(' + k + ') ' + fam.matched[k].map(function (bn) { return I.formatStat(bn[0], bn[1]); }).join(', ');
            }).join(' · ');
            lines.push({ text: txt, color: COL.match });
          }
        } else lines.push({ text: fam.name + ' look', color: COL.grey });
      }
      const lvl = (p && p.level) || 1;
      lines.push({ text: 'Requires Level ' + item.reqLevel + '  ·  Item Level ' + item.ilvl, color: item.reqLevel > lvl ? COL.red : COL.grey });
      if (item.type === 'weapon') {
        const fav = favouredBy(item.weaponType);
        if (fav.length) lines.push({ text: 'Favoured by ' + fav.join(', '), color: COL.grey });
      }
    }
    if (item.locked) lines.push({ text: 'Locked — never sold, salvaged or junked', color: COL.grey });
    lines.push({ text: 'Sell: ' + (item.value || 0) * (item.qty || 1) + ' gold', color: COL.gold });
    if (item.flavor) lines.push({ text: '“' + item.flavor + '”', color: COL.flavor });
    return tip;
  };

  // ---- starter gear ----
  I.grantStarterGear = function (pl) {
    if (!pl) return;
    D.ensure(pl);
    const prof = D.classProfile(pl);
    let ids = prof.starter.slice();
    // if the game team's class uses other weapons than our fallback profile, start with its first weapon type
    const wt = D.BASES[ids[0]].weaponType;
    if (prof.weapons.indexOf(wt) < 0) {
      const fam = D.FAMILY_LIST.filter(function (f) { return D.FAMILIES[f][0].weaponType === prof.weapons[0]; })[0];
      if (fam) ids = [fam + '_1'].concat(ids.slice(1).filter(function (id) { return D.BASES[id].slot !== 'offhand'; }));
    }
    for (const id of ids) {
      const item = I.rollItem({ level: 1, rarity: 'common', baseId: id });
      delete item.sockets;
      if (item.slot === 'offhand' && pl.equipment.weapon && pl.equipment.weapon.twoHanded) continue;
      pl.equipment[item.slot] = item;
    }
    pl.potions.hp = Math.max(pl.potions.hp || 0, 3);
    pl.potions.mp = Math.max(pl.potions.mp || 0, 2);
  };
})();
