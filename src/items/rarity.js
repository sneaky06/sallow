// Loot & Economy — R7.1 rarity migration. The ladder changed from common/magic/rare/epic/set/legendary/mythic to
// common/uncommon/rare/magic/legendary/mythic/unique/rift. Every item created from now on carries `rv: 7`; an item without it is
// from an older save and is migrated once: magic -> uncommon, epic -> magic, set -> legendary (keeps setId), (corrupted items keep their tier).
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;

  D.RARITY_VERSION = 7;
  D.OLD_RARITY = { magic: 'uncommon', epic: 'magic', set: 'legendary' };

  // Migrate one item in place (no-op for current items). -> the item
  D.migrateItem = function (it) {
    if (!it || typeof it !== 'object' || it.rv === D.RARITY_VERSION) return it;
    if (it.type === 'gold') return it;
    if (it.rarity && D.OLD_RARITY[it.rarity]) it.rarity = D.OLD_RARITY[it.rarity];
    it.rv = D.RARITY_VERSION;
    return it;
  };

  // Migrate everything in the game state that can hold items. Safe to call any time, any number of times.
  I.migrateState = function () {
    const S = G.state;
    if (!S) return;
    const p = S.player;
    if (p) {
      (p.inventory || []).forEach(D.migrateItem);
      for (const k in (p.equipment || {})) D.migrateItem(p.equipment[k]);
    }
    (S.stash || []).forEach(D.migrateItem);
    (S.groundItems || []).forEach(function (g) { if (g) D.migrateItem(g.item); });
    const c = S.flags && S.flags.corpse;
    if (c && c.items) c.items.forEach(D.migrateItem);
    const j = S.settings && S.settings.junk;
    if (j && j.rv !== D.RARITY_VERSION) {
      if (D.OLD_RARITY[j.maxRarity]) j.maxRarity = D.OLD_RARITY[j.maxRarity];
      j.rv = D.RARITY_VERSION;
    }
  };

  // D.ensure runs on nearly every items call: migrate the player's gear there too.
  const ensure = D.ensure;
  D.ensure = function (p) {
    if (p && !p._rv7) {
      (p.inventory || []).forEach(D.migrateItem);
      for (const k in (p.equipment || {})) D.migrateItem(p.equipment[k]);
      Object.defineProperty(p, '_rv7', { value: true, enumerable: false, configurable: true });
    }
    return ensure(p);
  };

  G.on('scene:changed', function () { I.migrateState(); });
})();
