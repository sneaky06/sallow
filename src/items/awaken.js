// Loot & Economy — R5.3 Awakening. Every equipped item counts the kills made while it is worn (item.kills) and keeps a small
// tally of its victims (item.tally = { theme, dtype, body } counters). At 250 / 1000 / 5000 kills it awakens one dormant affix
// themed on what it killed — mostly fire demons gives fire resistance on armour, fire damage on a weapon — into item.awakened.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  const MILESTONES = D.AWAKEN_MILESTONES = I.AWAKEN_AT = [250, 1000, 5000];

  // victim key -> name of the awakening and candidate stats per host (w = weapon, a = armour / off-hand, j = jewellery)
  const VICTIM = D.AWAKEN_VICTIMS = {
    fire:      { name: 'Emberbane',    w: ['fireDmg', 'dmgPct'],        a: ['resFire', 'hpMax'],      j: ['resFire', 'fireDmg'] },
    cold:      { name: 'Frostbane',    w: ['coldDmg', 'dmgPct'],        a: ['resCold', 'hpMax'],      j: ['resCold', 'coldDmg'] },
    lightning: { name: 'Stormbane',    w: ['lightningDmg', 'dmgPct'],   a: ['resLightning', 'hpMax'], j: ['resLightning', 'lightningDmg'] },
    poison:    { name: 'Venombane',    w: ['poisonDmg', 'dmgPct'],      a: ['resPoison', 'hpMax'],    j: ['resPoison', 'poisonDmg'] },
    skeleton:  { name: 'Bonebreaker',  w: ['critDmg', 'dmgPct'],        a: ['armor', 'resPoison'],    j: ['critDmg', 'armor'] },
    beast:     { name: 'Huntsman',     w: ['attackSpeed', 'critDmg'],   a: ['moveSpeed', 'dodge'],    j: ['attackSpeed', 'moveSpeed'] },
    demon:     { name: 'Hellbane',     w: ['dmgPct', 'fireDmg'],        a: ['resAll', 'resFire'],     j: ['resAll', 'dmgPct'] },
    wraith:    { name: 'Ghostward',    w: ['lifeSteal', 'coldDmg'],     a: ['dodge', 'resCold'],      j: ['manaOnKill', 'resCold'] },
    brute:     { name: 'Giantsbane',   w: ['critDmg', 'dmgPct'],        a: ['hpMax', 'armor'],        j: ['hpMax', 'critDmg'] },
    spider:    { name: 'Exterminator', w: ['lifeOnKill', 'poisonDmg'],  a: ['resPoison', 'dodge'],    j: ['lifeOnKill', 'resPoison'] },
    flyer:     { name: 'Skywatch',     w: ['critChance', 'attackSpeed'], a: ['dodge', 'moveSpeed'],   j: ['critChance', 'dodge'] },
    blob:      { name: 'Rotward',      w: ['poisonDmg', 'lifeOnKill'],  a: ['hpRegen', 'resPoison'],  j: ['hpRegen', 'resPoison'] },
    caster:    { name: 'Spellbreaker', w: ['manaOnKill', 'critChance'], a: ['resAll', 'mpMax'],       j: ['cdr', 'resAll'] },
    humanoid:  { name: 'Manslayer',    w: ['dmgPct', 'critChance'],     a: ['armor', 'hpMax'],        j: ['dmgPct', 'lifeOnKill'] },
    crypt:     { name: 'Gravebane',    w: ['lifeOnKill', 'critDmg'],    a: ['resPoison', 'armor'],    j: ['lifeOnKill', 'resPoison'] },
    caves:     { name: 'Deepdelver',   w: ['attackSpeed', 'dmgPct'],    a: ['hpMax', 'resPoison'],    j: ['magicFind', 'hpMax'] },
    inferno:   { name: 'Emberbane',    w: ['fireDmg', 'dmgPct'],        a: ['resFire', 'hpMax'],      j: ['resFire', 'fireDmg'] },
    abyss:     { name: 'Voidbane',     w: ['dmgPct', 'critDmg'],        a: ['resAll', 'hpMax'],       j: ['resAll', 'cdr'] },
  };

  // Value per awakening (1st / 2nd / 3rd). Flat stats are authored for item level 60 and scale like uniques do.
  const VALUE = {
    fireDmg: [24, 40, 64], coldDmg: [24, 40, 64], lightningDmg: [24, 40, 64], poisonDmg: [24, 40, 64],
    armor: [60, 110, 180], hpMax: [60, 110, 180], mpMax: [50, 90, 140], lifeOnKill: [16, 28, 45], manaOnKill: [8, 14, 22], hpRegen: [6, 12, 20],
    resFire: [12, 20, 30], resCold: [12, 20, 30], resLightning: [12, 20, 30], resPoison: [12, 20, 30], resAll: [6, 10, 15],
    dmgPct: [8, 14, 22], critDmg: [15, 25, 40], attackSpeed: [4, 6, 10], moveSpeed: [4, 6, 9], dodge: [3, 5, 7],
    critChance: [2, 4, 6], lifeSteal: [1, 2, 3], cdr: [3, 5, 8], magicFind: [8, 14, 22],
  };

  // What kind of thing died: { theme, dtype, body } from the bestiary (falls back to the entity and the current map).
  function victimOf(m) {
    const def = (G.game && G.game.MONSTERS && m.monsterId && G.game.MONSTERS[m.monsterId]) || {};
    const map = G.state.map;
    return {
      theme: def.theme || (map && map.theme) || 'crypt',
      dtype: def.dtype || m.dtype || 'phys',
      body: (def.sprite && def.sprite.body) || (m.sprite && m.sprite.body) || 'humanoid',
    };
  }
  D.victimOf = victimOf;

  function top(obj) {
    let k = null, n = 0, all = 0;
    for (const key in obj) { all += obj[key]; if (obj[key] > n) { n = obj[key]; k = key; } }
    return { key: k, n: n, all: all };
  }

  // Ordered victim keys for an item's tally: a dominant element first, then bodies, then the home theme.
  function themeKeys(t) {
    const keys = [];
    const el = {};
    for (const k in t.dtype) if (k !== 'phys' && VICTIM[k]) el[k] = t.dtype[k];
    const e = top(el), kills = top(t.dtype).all || 1;
    if (e.key && e.n / kills >= 0.35) keys.push(e.key);
    const bodies = Object.keys(t.body).filter(function (k) { return VICTIM[k]; }).sort(function (a, b) { return t.body[b] - t.body[a]; });
    for (const b of bodies) keys.push(b);
    const themes = Object.keys(t.theme).filter(function (k) { return VICTIM[k]; }).sort(function (a, b) { return t.theme[b] - t.theme[a]; });
    for (const th of themes) keys.push(th);
    if (e.key && keys.indexOf(e.key) < 0) keys.push(e.key);
    keys.push('abyss');
    return keys;
  }

  // -> { stat, value, at, name, key } for the next awakening of `item`, or null.
  D.nextAwakening = function (item) {
    const k = (item.awakened || []).length;
    if (k >= MILESTONES.length) return null;
    const t = item.tally || { theme: {}, dtype: {}, body: {} };
    const host = D.gemHost(item);
    const have = {};
    for (const a of item.awakened || []) have[a.stat] = true;
    for (const key of themeKeys(t)) {
      for (const stat of VICTIM[key][host]) {
        if (have[stat] || !VALUE[stat]) continue;
        let v = VALUE[stat][k];
        if (D.FLAT[stat]) v = Math.max(1, Math.round(v * D.flatScale(Math.max(item.ilvl || 1, 10))));
        return { stat: stat, value: v, at: MILESTONES[k], name: VICTIM[key].name, key: key };
      }
    }
    return null;
  };

  function awaken(p, item) {
    const a = D.nextAwakening(item);
    if (!a) return false;
    (item.awakened || (item.awakened = [])).push(a);
    item.value = D.itemValue(item);
    D.toast(item.name + ' awakens — ' + a.name + ': ' + I.formatStat(a.stat, a.value), '#e8d8a0');
    G.emit('sfx', { name: 'loot_legendary' });
    G.emit('fx:spawn', { type: 'levelup', x: p.x || 0, y: p.y || 0, color: '#e8d8a0' });
    return true;
  }

  function bump(obj, key) { obj[key] = (obj[key] || 0) + 1; }

  // Count one kill on every worn item. Exposed for tests and for anything that kills without the event.
  I.recordKill = function (monster) {
    const p = G.state.player;
    if (!p || !p.equipment || !monster) return 0;
    const v = victimOf(monster);
    let woke = 0;
    const seen = [];
    for (const s of C.EQUIP_SLOTS) {
      const it = p.equipment[s];
      if (!D.isEquip(it) || seen.indexOf(it) >= 0) continue;
      seen.push(it);
      it.kills = (it.kills || 0) + 1;
      const t = it.tally || (it.tally = { theme: {}, dtype: {}, body: {} });
      bump(t.theme, v.theme); bump(t.dtype, v.dtype); bump(t.body, v.body);
      const k = (it.awakened || []).length;
      if (k < MILESTONES.length && it.kills >= MILESTONES[k] && awaken(p, it)) woke++;
    }
    if (woke) D.equipChanged(p);
    return woke;
  };

  G.on('monster:killed', function (e) {
    if (e && e.monster) I.recordKill(e.monster);
  });

  // One short tooltip line: progress to the next awakening. -> string | null
  D.awakenProgress = function (item) {
    if (!D.isEquip(item)) return null;
    const k = (item.awakened || []).length, kills = item.kills || 0;
    if (k >= MILESTONES.length) return 'Fully awakened · ' + kills + ' kills';
    return 'Awakening ' + (k + 1) + '/' + MILESTONES.length + ': ' + kills + ' / ' + MILESTONES[k] + ' kills';
  };
})();
