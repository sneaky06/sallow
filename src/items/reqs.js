// Loot & Economy — R16.9 requirements. Every piece of equipment has a level requirement (item.reqLevel) and, from item level 8, an
// attribute requirement item.req = { str | dex | int: n } by weight class: heavy armour, swords/axes/maces and shields want Strength;
// light armour, bows and daggers Dexterity; cloth, staves, wands, orbs and tomes Intelligence; jewellery and belts none.
// About one armour piece in five is a CLASS armour (item.classArmor = classId): its requirement is that class's primary stat and
// higher, so other classes rarely meet it. Old saves derive requirements on load (D.migrateItem). Names live in D.REQ.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;

  D.REQ = {
    startIlvl: 8,                                       // below this item level nothing asks for attributes
    armorStat: { heavy: 'str', light: 'dex', cloth: 'int' },
    weaponStat: { sword: 'str', greatsword: 'str', axe: 'str', greataxe: 'str', mace: 'str', maul: 'str', dagger: 'dex', bow: 'dex', staff: 'int', wand: 'int' },
    offhandStat: { shield: 'str', orb: 'int', tome: 'int' },
    perLevel: { heavy: 1.2, light: 1.0, cloth: 0.9, weapon: 1.1, offhand: 1.0 },   // requirement = item level x this
    classArmorP: 0.2,                                   // chance an armour piece is a class armour
    classArmorMult: 1.6,                                // class armour asks this much more of the class's primary stat
    classArmorSlots: ['helm', 'chest', 'gloves', 'boots'],
    classTag: { warrior: 'Warrior armour', ranger: 'Ranger armour', sorcerer: 'Sorcerer armour', necromancer: 'Necromancer armour' },
    statNames: { str: 'Strength', dex: 'Dexterity', int: 'Intelligence' },
    levelText: 'Level',
  };

  function weightOf(item) {
    const def = D.BASES[item.baseId] || {};
    if (item.slot === 'weapon') return { stat: D.REQ.weaponStat[item.weaponType], k: D.REQ.perLevel.weapon };
    if (item.slot === 'offhand') return { stat: D.REQ.offhandStat[def.offhandType], k: D.REQ.perLevel.offhand };
    const ac = item.armorClass || def.armorClass;
    if (ac && D.REQ.classArmorSlots.indexOf(item.slot) >= 0) return { stat: D.REQ.armorStat[ac], k: D.REQ.perLevel[ac], armor: ac };
    return { stat: null, k: 0 };
  }

  // Derive (or re-derive) the requirements of an equipment item in place. rng only for the class-armour roll (old saves: none).
  D.setReq = function (item, rng) {
    if (!D.isEquip(item)) return item;
    const w = weightOf(item);
    const req = {};
    let cls = item.classArmor || null;
    if (!cls && rng && w.armor && rng.chance(D.REQ.classArmorP)) {
      cls = w.armor === 'heavy' ? 'warrior' : w.armor === 'light' ? 'ranger' : rng.pick(['sorcerer', 'necromancer']);
      item.classArmor = cls;
    }
    if (item.ilvl >= D.REQ.startIlvl) {
      if (cls && D.CLASS[cls]) req[D.CLASS[cls].primary] = Math.round(item.ilvl * D.REQ.classArmorMult * w.k);
      else if (w.stat) req[w.stat] = Math.round(item.ilvl * w.k);
    }
    item.req = req;
    return item;
  };

  // -> { ok, missing: [{ kind: 'level' | 'str' | 'dex' | 'int', need, have }], text } — text names the first unmet requirement.
  // A player without attribute data (tests, menus) is only held to the level requirement.
  I.meetsRequirements = function (item, player) {
    const p = player || G.state.player;
    const out = { ok: true, missing: [], text: '' };
    if (!item || !D.isEquip(item) || !p) return out;
    const lvl = p.level || 1;
    if ((item.reqLevel || 1) > lvl) out.missing.push({ kind: 'level', need: item.reqLevel, have: lvl });
    if (p.attrs && item.req) {
      for (const k in item.req) {
        const have = p.attrs[k] || 0;
        if (have < item.req[k]) out.missing.push({ kind: k, need: item.req[k], have: have });
      }
    }
    out.ok = !out.missing.length;
    if (!out.ok) {
      const m = out.missing[0];
      out.text = 'Requires ' + (m.kind === 'level' ? D.REQ.levelText + ' ' + m.need : m.need + ' ' + D.REQ.statNames[m.kind]);
    }
    return out;
  };

  // 'soon': an item you cannot equip yet that would be an upgrade once you can (UI marks it; verdict itself stays null).
  I.verdictSoon = function (item) {
    const p = G.state.player;
    if (!p || !D.isEquip(item) || I.meetsRequirements(item, p).ok) return false;
    return I.verdict(item, true) === 'up';
  };
})();
