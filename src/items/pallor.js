// Loot & Economy — R5.2 Pallor: bleached drops. From Pallor tier 2 some equipment drops "bleached" with one extra affix kept
// hidden in item.hidden (not counted, shown as ??? in the tooltip). Bringing it back to town alive reveals it.
// rollLoot decides which drops bleach (D.PALLOR_BLEACH_P in generate.js); this file holds the bleach, reveal and death rules.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  const HIDDEN_Q = function (u) { return 0.5 + 0.5 * u; };   // the hidden affix always rolls in the top half of its range

  // Give an equipment item one hidden extra affix on a stat it does not have yet. -> bool
  D.bleach = function (item, rng) {
    if (!D.isEquip(item) || item.bleached) return false;
    const used = {};
    for (const m of item.mods) used[m.stat] = true;
    const tmp = { baseId: item.baseId, slot: item.slot, weaponType: item.weaponType, twoHanded: item.twoHanded, ilvl: item.ilvl, mods: [] };
    D.rollAffixes(tmp, 1, 9, rng || G.rng.global, HIDDEN_Q, used);
    if (!tmp.mods.length) return false;
    item.bleached = true;
    item.hidden = tmp.mods;
    return true;
  };

  function carried(p, withStash) {
    const out = [];
    for (const it of p.inventory || []) if (it) out.push({ item: it, worn: false });
    for (const s of C.EQUIP_SLOTS) if (p.equipment && p.equipment[s]) out.push({ item: p.equipment[s], worn: true });
    if (withStash) for (const it of G.state.stash || []) if (it) out.push({ item: it, worn: false });
    return out;
  }

  // Reveal every bleached item the player brought home. -> [item]
  I.revealBleached = function () {
    const p = G.state.player;
    if (!p) return [];
    const done = [];
    let worn = false;
    for (const e of carried(p, true)) {
      const it = e.item;
      if (!it.bleached || !it.hidden) continue;
      for (const m of it.hidden) it.mods.push({ stat: m.stat, value: m.value, bleached: true });
      delete it.hidden;
      it.revealed = true;
      it.value = D.itemValue(it);
      done.push(it);
      if (e.worn) worn = true;
    }
    if (done.length) {
      const one = done.length === 1;
      const m = done[0].mods[done[0].mods.length - 1];
      D.toast(one ? 'The Pallor lifts: ' + done[0].name + ' reveals ' + I.formatStat(m.stat, m.value)
        : 'The Pallor lifts: ' + done.length + ' bleached items revealed', '#e8e2cc');
      G.emit('sfx', { name: 'loot_rare' });
      G.emit('inventory:changed', {});
      if (worn) D.equipChanged(p);
    }
    return done;
  };

  // A bleached secret only survives a trip home alive. Worn items stay with you through death, so their secret fades;
  // the backpack follows the corpse rules (R2.4): a retrievable death leaves it with the corpse untouched (reclaim it and bring
  // it home to reveal), a death that keeps the backpack on you (noRetrieve) fades those too.
  function fade(it) {
    if (!it || !it.bleached || !it.hidden) return 0;
    delete it.hidden;
    it.faded = true;
    return 1;
  }
  G.on('player:died', function (e) {
    const p = G.state.player;
    if (!p) return;
    let n = 0;
    for (const s of C.EQUIP_SLOTS) n += fade(p.equipment && p.equipment[s]);
    if (e && e.noRetrieve) for (const it of p.inventory || []) n += fade(it);
    if (n) G.emit('inventory:changed', {});
  });

  G.on('scene:changed', function (e) {
    if (e && e.scene === 'town') I.revealBleached();
  });
})();
