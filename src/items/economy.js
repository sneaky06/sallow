// Loot & Economy — gold sinks and sources: selling, salvage, blacksmith upgrades, vendors, gambling, potions.
// item.value is the gold SELL price; vendors charge BUY_MULT times that; buyback costs 2.5x what was paid.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  const BUY_MULT = 6;
  function P() { return D.ensure(G.state.player); }
  function rord(r) { return (C.RARITY[r === 'set' ? 'legendary' : r] || C.RARITY.common).order; }
  function invChanged() { G.emit('inventory:changed', {}); }
  function plevel() { const p = G.state.player; return Math.max(1, (p && p.level) || 1); }

  // ---- selling ----
  // R8.1: sell, salvage and Curator registration only work in town (bag or surface crate).
  function inTown(what) {
    if (G.state.scene === 'town') return true;
    D.fail((what || 'That') + ' is only possible in town');
    return false;
  }
  D.inTown = inTown;

  function sellValue(item) { return Math.max(0, Math.round((item.value || 0) * (item.qty || 1))); }

  // ---- gem dust (R3.2): gems socketed in gear that is sold, salvaged or junked are ground to dust ----
  function gemDustOf(gem) {
    const g = gem && D.GEMS[gem.baseId];
    if (!g) return 0;
    return g.family === 'blood' ? D.BLOOD_DUST[g.tier] : D.GEM_DUST[g.tier];
  }
  // Empties the item's sockets into player.materials.gemdust -> { gems, gemdust }
  function grindGems(p, item) {
    const out = { gems: 0, gemdust: 0 };
    if (!item || !item.sockets) return out;
    for (let i = 0; i < item.sockets.length; i++) {
      const g = item.sockets[i];
      if (!g) continue;
      out.gems++;
      out.gemdust += gemDustOf(g);
      item.sockets[i] = null;
    }
    if (out.gemdust) p.materials.gemdust = (p.materials.gemdust || 0) + out.gemdust;
    return out;
  }
  function socketedCount(item) {
    let n = 0;
    for (const g of (item && item.sockets) || []) if (g) n++;
    return n;
  }

  // Sets and both Legendary sub-tiers are never junk and never touched by a bulk action (R3.1 / R3.9).
  // R5.8: locked items are protected the same way.
  function protectedItem(item) {
    const r = C.RARITY[item.rarity] || {};
    return !!item.setId || r.tier === 'legendary' || !!item.locked || !!(D.COLLECTION && D.COLLECTION.protect && D.isWanted && D.isWanted(item));
  }
  D.protectedItem = protectedItem;

  // Sell one bag cell (no toast). -> { gold, gems, gemdust }
  function sellAt(p, i) {
    const item = p.inventory[i];
    const gold = sellValue(item);
    const ground = D.isEquip(item) ? grindGems(p, item) : { gems: 0, gemdust: 0 };
    p.inventory[i] = null;
    remember(item, gold);
    return { gold: gold, gems: ground.gems, gemdust: ground.gemdust };
  }

  I.sell = function (invIndex) {
    const p = P();
    const item = p && p.inventory[invIndex];
    if (item && !inTown('Selling')) return 0;
    if (!item) return 0;
    if (item.locked) { D.fail('Unlock it first'); return 0; }
    const r = sellAt(p, invIndex);
    D.addGold(p, r.gold, 'sell');
    invChanged();
    return r.gold;
  };

  // Sells every piece of equipment in the bag whose rarity is strictly below `rarity` (gems/consumables are kept).
  // Sets and Legendary Elite/Mythic are never sold, whatever the threshold.
  I.sellAllBelow = function (rarity) {
    const p = P();
    if (!p || !inTown('Selling')) return 0;
    const limit = rord(rarity);
    let gold = 0, n = 0;
    for (let i = 0; i < C.INV_SIZE; i++) {
      const it = p.inventory[i];
      if (it && D.isEquip(it) && !protectedItem(it) && rord(it.rarity) < limit) {
        gold += sellAt(p, i).gold;
        n++;
      }
    }
    if (n) {
      D.addGold(p, gold, 'sell');
      D.toast('Sold ' + n + ' item' + (n > 1 ? 's' : '') + ' for ' + gold + ' gold', '#ffd94a');
      invChanged();
    }
    return gold;
  };

  // ---- mass selling (R5.8): every piece of equipment at or below a rarity; never sets, Legendary (either sub-tier),
  // locked items, unrevealed bleached items, gems, lore or consumables. Sold items go to buyback as usual.
  function sellableAtOrBelow(item, limit) {
    return !!item && D.isEquip(item) && !protectedItem(item) && !(item.bleached && item.hidden) && rord(item.rarity) <= limit;
  }
  // -> { count, gold, gems } (gems = socketed gems that would be ground to dust: warn when > 0)
  I.previewSellAtOrBelow = function (rarityKey) {
    const p = G.state.player;
    const out = { count: 0, gold: 0, gems: 0 };
    if (!p || !p.inventory || !C.RARITY[rarityKey]) return out;
    const limit = rord(rarityKey);
    for (const it of p.inventory) {
      if (!sellableAtOrBelow(it, limit)) continue;
      out.count++;
      out.gold += sellValue(it);
      out.gems += socketedCount(it);
    }
    return out;
  };
  // -> { count, gold }
  I.sellAtOrBelow = function (rarityKey) {
    const p = P();
    const out = { count: 0, gold: 0 };
    if (!p || !C.RARITY[rarityKey] || !inTown('Selling')) return out;
    const limit = rord(rarityKey);
    for (let i = 0; i < C.INV_SIZE; i++) {
      if (!sellableAtOrBelow(p.inventory[i], limit)) continue;
      out.gold += sellAt(p, i).gold;
      out.count++;
    }
    if (out.count) {
      D.addGold(p, out.gold, 'sell');
      D.toast('Sold ' + out.count + ' item' + (out.count > 1 ? 's' : '') + ' for ' + out.gold + ' gold', '#ffd94a');
      invChanged();
    }
    return out;
  };

  // ---- junk rules (R3.1) ----
  const JUNK_DEFAULT = { maxRarity: 'common', action: 'sell', auto: false, keepUpgrades: true, keepSocketed: true };
  function junkRules() {
    const s = G.state.settings || (G.state.settings = {});
    if (!s.junk) s.junk = Object.assign({}, JUNK_DEFAULT);
    return s.junk;
  }

  I.isJunk = function (item) {
    if (!D.isEquip(item) || protectedItem(item)) return false;
    if (item.bleached && item.hidden) return false;      // R5.2: an unrevealed secret is never junk
    const rules = junkRules();
    if (!rules.maxRarity || rules.maxRarity === 'none' || !C.RARITY[rules.maxRarity]) return false;
    if (rord(item.rarity) > rord(rules.maxRarity)) return false;
    if (Array.isArray(G.state.stash) && G.state.stash.indexOf(item) >= 0) return false;
    if (rules.keepSocketed && socketedCount(item) > 0) return false;
    if (rules.keepUpgrades && I.verdict && I.verdict(item) === 'up') return false;
    return true;
  };

  function emptyMats() { return { dust: 0, shard: 0, essence: 0, gemdust: 0 }; }

  // Salvage an item quietly (wherever it is). -> { materials, gems }
  function salvageItem(p, item) {
    const y = I.salvageYield(item);
    for (const k in y) if (y[k]) p.materials[k] = (p.materials[k] || 0) + y[k];
    const ground = grindGems(p, item);
    return { materials: { dust: y.dust, shard: y.shard, essence: y.essence, gemdust: ground.gemdust }, gems: ground.gems };
  }
  D.salvageItem = salvageItem;
  function salvageAt(p, i) {
    const r = salvageItem(p, p.inventory[i]);
    p.inventory[i] = null;
    return r;
  }

  // Sells (in town only) or salvages (anywhere) every junk item in the backpack. -> { count, gold, materials }
  I.processJunk = function (quiet) {
    const p = P();
    const res = { count: 0, gold: 0, materials: emptyMats() };
    if (!p) return res;
    const rules = junkRules();
    const sell = rules.action !== 'salvage';
    if (G.state.scene !== 'town') return res;      // R8.1: selling and salvaging are town-only; in the field junk waits for the chute (I.sendJunk)
    for (let i = 0; i < C.INV_SIZE; i++) {
      const it = p.inventory[i];
      if (!it || !I.isJunk(it)) continue;
      res.count++;
      if (sell) {
        const r = sellAt(p, i);
        res.gold += r.gold;
        res.materials.gemdust += r.gemdust;
      } else {
        const r = salvageAt(p, i);
        for (const k in r.materials) res.materials[k] += r.materials[k];
      }
    }
    if (res.count) {
      if (res.gold) D.addGold(p, res.gold, 'sell');
      if (!quiet) {
        D.toast((sell ? 'Sold ' : 'Salvaged ') + res.count + ' junk item' + (res.count > 1 ? 's' : '') +
          (sell ? ' for ' + res.gold + ' gold' : ''), '#ffd94a');
      }
      invChanged();
    }
    return res;
  };

  // auto + sell: junk is sold on arriving in town, one summary toast.
  G.on('scene:changed', function (e) {
    if (!e || e.scene !== 'town' || !G.state.player) return;
    const rules = junkRules();
    if (rules.auto && rules.action !== 'salvage') I.processJunk();
  });

  // ---- buyback (R2.7): the last 12 things sold, newest first, at 2.5x what the vendor paid; forgotten on entering a dungeon ----
  const BUYBACK_MAX = 12, BUYBACK_MULT = 2.5;
  let buybackList = [];
  function remember(item, paid) {
    buybackList.unshift({ item: item, price: Math.max(1, Math.ceil(paid * BUYBACK_MULT)) });
    if (buybackList.length > BUYBACK_MAX) buybackList.length = BUYBACK_MAX;
  }
  G.on('scene:changed', function (e) { if (e && e.scene === 'dungeon') buybackList = []; });

  I.getBuyback = function () { return buybackList; };

  I.buyback = function (index) {
    const p = P();
    const e = buybackList[index];
    if (!p || !e) return false;
    if (p.gold < e.price) return D.fail('Not enough gold');
    if (!I.addToInventory(e.item)) return D.fail('Inventory full');
    buybackList.splice(index, 1);
    D.addGold(p, -e.price, 'buy');
    return true;
  };

  // ---- unsocketing (R2.6): cut gems come back out for gold; bloodstones never do ----
  function socketHost(p, target) { return typeof target === 'number' ? p.inventory[target] : p.equipment[target]; }

  // -> gold, or null when there is nothing removable in that socket (empty, or a permanent bloodstone)
  I.unsocketCost = function (item, socketIndex) {
    const gem = item && item.sockets && item.sockets[socketIndex];
    if (!gem || D.isPermanentGem(gem)) return null;
    return Math.round(20 + (gem.value || 0) * 1.5 + (item.ilvl || 1) * 4);
  };

  I.unsocketGem = function (target, socketIndex) {
    const p = P();
    const item = p && socketHost(p, target);
    const gem = item && item.sockets && item.sockets[socketIndex];
    if (!gem) return false;
    const cost = I.unsocketCost(item, socketIndex);
    if (cost === null) return D.fail('Bloodstones are fused permanently');
    if (p.gold < cost) return D.fail('Not enough gold');
    if (!I.addToInventory(gem)) return D.fail('Inventory full');
    item.sockets[socketIndex] = null;
    D.addGold(p, -cost, 'buy');
    D.toast(gem.name + ' removed', (C.RARITY[gem.rarity] || C.RARITY.common).color);
    if (typeof target !== 'number') D.equipChanged(p);
    return true;
  };

  // ---- salvage ----
  // Extension: what salvaging would give -> { dust, shard, essence }
  I.salvageYield = function (item) {
    const y = { dust: 0, shard: 0, essence: 0 };
    if (!D.isEquip(item)) return y;
    const t = 1 + Math.floor(item.ilvl / 20);
    switch (item.rarity) {
      case 'common': y.dust = t; break;
      case 'uncommon': y.dust = 2 * t; break;
      case 'rare': y.dust = 2 * t; y.shard = 1 + Math.floor(item.ilvl / 30); break;
      case 'magic': y.dust = 3 * t; y.shard = 3 + Math.floor(item.ilvl / 20); break;
      case 'mythic': y.shard = 15; y.essence = 5; break;
      default: y.shard = 5; y.essence = 1;      // elite, set
    }
    return y;
  };

  I.salvage = function (invIndex) {
    const p = P();
    const item = p && p.inventory[invIndex];
    if (!item) return false;
    if (!inTown('Salvaging')) return false;
    if (!D.isEquip(item)) return D.fail('Cannot salvage that');
    if (item.locked) return D.fail('Unlock it first');
    const m = salvageAt(p, invIndex).materials;
    const parts = [];
    for (const k in m) if (m[k]) parts.push('+' + m[k] + ' ' + (k === 'gemdust' ? 'gem dust' : k));
    D.toast('Salvaged: ' + parts.join(', '), '#8fb4ff');
    G.emit('sfx', { name: 'click' });
    invChanged();
    return true;
  };

  // R3.2: what salvaging (or, for gems/gemdust, selling) this bag item would do. -> { materials, gems, gemdust }
  // `gems` > 0 means the UI should warn that socketed gems will be ground to dust.
  I.salvagePreview = function (invIndex) {
    const p = G.state.player;
    const item = p && p.inventory && p.inventory[invIndex];
    const out = { materials: { dust: 0, shard: 0, essence: 0 }, gems: 0, gemdust: 0 };
    if (!D.isEquip(item)) return out;
    const y = I.salvageYield(item);
    out.materials = { dust: y.dust, shard: y.shard, essence: y.essence };
    for (const g of item.sockets || []) if (g) { out.gems++; out.gemdust += gemDustOf(g); }
    return out;
  };

  // ---- gem dust sinks ----
  // Blacksmith: cut a gem one tier higher. Target is a bag index holding a cut gem (one gem of a stack is cut).
  // -> { gemdust, gold } or null (not a cut gem / already perfect).
  I.gemUpgradeCost = function (target) {
    const p = G.state.player;
    const gem = typeof target === 'object' ? target : p && p.inventory && p.inventory[target];
    const g = gem && D.GEMS[gem.baseId];
    if (!g || g.family !== 'cut' || g.tier >= D.GEM_TIERS.length - 1) return null;
    return { gemdust: D.GEM_UP_DUST[g.tier], gold: D.GEM_VALUE[g.tier + 1] };
  };

  I.upgradeGem = function (invIndex) {
    const p = P();
    const gem = p && p.inventory[invIndex];
    const cost = I.gemUpgradeCost(gem || -1);
    if (!gem || !cost) return D.fail(gem && D.isPermanentGem(gem) ? 'Bloodstones cannot be cut further' : 'Cannot cut that');
    if ((p.materials.gemdust || 0) < cost.gemdust) return D.fail('Not enough gem dust');
    if (p.gold < cost.gold) return D.fail('Not enough gold');
    const g = D.GEMS[gem.baseId];
    const next = D.makeMisc('gem_' + g.kind + '_' + (g.tier + 2), 1, 1);
    const stackLeft = (gem.qty || 1) - 1;
    if (stackLeft > 0) gem.qty = stackLeft; else p.inventory[invIndex] = null;
    if (!I.addToInventory(next)) {
      if (stackLeft > 0) gem.qty = stackLeft + 1; else p.inventory[invIndex] = gem;
      return D.fail('Inventory full');
    }
    p.materials.gemdust -= cost.gemdust;
    D.addGold(p, -cost.gold, 'buy');
    G.emit('sfx', { name: 'equip' });
    D.toast('Cut ' + next.name, (C.RARITY[next.rarity] || C.RARITY.common).color);
    return true;
  };

  // Mystic: reroll one affix on a rare-or-better item. Target = bag index or equipment slot; modIndex indexes item.mods.
  // Implicits and the hand-authored mods of uniques/sets are fixed; their random extras can be rerolled. The flat-damage
  // affix (dmgMin + dmgMax) counts as one. Each reroll of the same item costs more.
  function rerollable(item, modIndex) {
    if (!D.isEquip(item) || rord(item.rarity) < rord('rare')) return false;
    const m = item.mods[modIndex];
    if (!m || m.implicit || m.corrupt === 'up' || m.corrupt === 'down') return false;      // R6.5: corruption is undone only by cleansing
    if (item.uniqueId && D.UNIQUES[item.uniqueId]) {
      let fixed = D.UNIQUES[item.uniqueId].mods.length, seen = 0;
      for (let i = 0; i <= modIndex; i++) {
        if (item.mods[i].implicit) continue;
        if (++seen <= fixed && i === modIndex) return false;
      }
    }
    return true;
  }

  // -> { gemdust, gold } or null if that mod cannot be rerolled
  I.rerollCost = function (target, modIndex) {
    const p = G.state.player;
    const item = typeof target === 'object' ? target : p && socketHost(p, target);
    if (!item || !rerollable(item, modIndex)) return null;
    const n = item.rerolls || 0;
    const tierK = { rare: 1, magic: 2, legendary: 3, unique: 3, mythic: 5, rift: 8 }[item.rarity] || 1;
    return { gemdust: (4 + Math.floor(item.ilvl / 10)) * tierK * (n + 1), gold: Math.round((item.value || 1) * 0.5 * (n + 1)) };
  };

  I.rerollAffix = function (target, modIndex) {
    const p = P();
    const item = p && socketHost(p, target);
    const cost = item ? I.rerollCost(item, modIndex) : null;
    if (!cost) return D.fail('That property cannot be rerolled');
    if ((p.materials.gemdust || 0) < cost.gemdust) return D.fail('Not enough gem dust');
    if (p.gold < cost.gold) return D.fail('Not enough gold');
    const old = item.mods[modIndex];
    const pair = old.stat === 'dmgMin' || old.stat === 'dmgMax';
    item.mods = item.mods.filter(function (m, i) {
      return i !== modIndex && !(pair && !m.implicit && (m.stat === 'dmgMin' || m.stat === 'dmgMax'));
    });
    const used = {};
    for (const m of item.mods) used[m.stat] = true;
    used[old.stat] = true;                                    // always a different property
    if (pair) { used.dmgMin = true; used.dmgMax = true; }
    D.setRollClass(D.classProfile(p));
    const before = item.mods.length;
    D.rollAffixes(item, 1, 9, G.rng.global, D.QUALITY[item.rarity] || D.QUALITY.rare, used);
    if (item.mods.length === before) item.mods.push(old);     // nothing else fits this base: keep the old roll
    item.rerolls = (item.rerolls || 0) + 1;
    item.value = D.itemValue(item);
    p.materials.gemdust -= cost.gemdust;
    D.addGold(p, -cost.gold, 'buy');
    G.emit('sfx', { name: 'loot_rare' });
    invChanged();
    if (typeof target !== 'number') D.equipChanged(p);
    return true;
  };

  // ---- blacksmith upgrade: +1 … +5. Each step: +10% base damage/armor and one random affix grows ~8%. ----
  // Extension: cost of the next upgrade -> { gold, dust, shard, essence } or null if it cannot be upgraded.
  I.upgradeCost = function (item) {
    if (!D.isEquip(item) || (item.plus || 0) >= D.MAX_PLUS) return null;
    const n = item.plus || 0;
    const t = 1 + Math.floor(item.ilvl / 20);
    const cost = {
      gold: Math.round((item.value || 1) * (3 + 2 * n)) + 25 * (n + 1),
      dust: 4 * (n + 1) * t,
      shard: n >= 2 ? (n - 1) * 2 : 0,
      essence: n >= 4 ? 1 : 0,
    };
    // R7.4: weapons, and armour of the class's weight, also eat the class material (Warbrand Ore, Hawkfeather ...)
    const p = G.state.player, prof = p && D.classProfile(p), mid = prof && D.CLASS_MATERIAL[prof.id];
    if (mid && (item.slot === 'weapon' || (item.armorClass && item.armorClass === prof.armor))) {
      cost.classMat = D.MATERIALS[mid].key;
      cost[cost.classMat] = n + 1;
    }
    return cost;
  };

  I.upgrade = function (target) {
    const p = P();
    if (!p) return false;
    const equipped = typeof target !== 'number';
    const item = equipped ? p.equipment[target] : p.inventory[target];
    if (!item) return false;
    const cost = I.upgradeCost(item);
    if (!cost) return D.fail(D.isEquip(item) ? 'Already fully upgraded' : 'Cannot upgrade that');
    if (p.gold < cost.gold) return D.fail('Not enough gold');
    const mk = ['dust', 'shard', 'essence'].concat(cost.classMat ? [cost.classMat] : []);
    for (const k of mk) {
      if ((p.materials[k] || 0) < cost[k]) return D.fail('Not enough ' + k);
    }
    for (const k of mk) p.materials[k] -= cost[k];

    const plus = (item.plus || 0) + 1;
    if (!item.base0) item.base0 = Object.assign({}, item.base);
    for (const k of ['dmgMin', 'dmgMax', 'armor']) {
      if (item.base0[k]) item.base[k] = Math.max(item.base[k] + 1, Math.round(item.base0[k] * (1 + 0.1 * plus)));
    }
    const growable = item.mods.filter(function (m) { return !m.implicit && m.stat !== 'allSkills' && m.stat !== 'pickupRadius'; });
    if (growable.length) {
      const m = G.rng.global.pick(growable);
      m.value = Math.max(m.value + 1, Math.round(m.value * 1.08));
    }
    item.plus = plus;
    item.name = item.name.replace(/ \+\d+$/, '') + ' +' + plus;
    item.value = D.itemValue(item);

    D.addGold(p, -cost.gold);
    G.emit('sfx', { name: 'equip' });
    G.emit('fx:spawn', { type: 'spark', x: p.x || 0, y: p.y || 0, color: '#ffd94a' });
    D.toast(item.name + ' forged', (C.RARITY[item.rarity] || C.RARITY.common).color);
    invChanged();
    if (equipped) D.equipChanged(p);
    return true;
  };

  // ---- vendors ----
  const stock = {};
  let stockLevel = 0;
  C.NPC_ROLES.forEach(function (r) { stock[r] = []; });

  // Extension: what a vendor charges for an item.
  I.buyPrice = function (item) { return Math.max(1, Math.ceil((item.value || 1) * BUY_MULT)); };

  function entry(item, infinite) {
    const e = { item: item, price: I.buyPrice(item) };
    if (infinite) e.infinite = true;
    return e;
  }

  // Vendors never sell better than rare.
  function vendorItem(level, slot, weights, family) {
    const rng = G.rng.global;
    const u = rng.next() * (weights[0] + weights[1] + weights[2]);
    const rarity = u < weights[0] ? 'common' : u < weights[0] + weights[1] ? 'uncommon' : 'rare';
    return I.rollItem({ level: level + rng.int(0, 1), rarity: rarity, slot: slot, _family: family });
  }

  I.refreshVendors = function (level) {
    const rng = G.rng.global;
    level = Math.max(1, Math.round(level || plevel()));
    stockLevel = level;
    C.NPC_ROLES.forEach(function (r) { stock[r] = []; });

    // merchant: general goods
    const anySlots = ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'belt', 'ring'];
    for (let i = 0; i < 8; i++) stock.merchant.push(entry(vendorItem(level, rng.pick(anySlots), [55, 40, 5])));
    stock.merchant.push(entry(D.makeMisc('flask_rejuv', level, 1), true));
    stock.merchant.push(entry(D.makeMisc('tome_xp', level, 1)));
    if (rng.chance(0.35)) stock.merchant.push(entry(D.makeMisc('chisel', level, 1)));

    // blacksmith: weapons + armour
    for (let i = 0; i < 6; i++) stock.blacksmith.push(entry(vendorItem(level, 'weapon', [40, 46, 14])));
    ['helm', 'chest', 'gloves', 'boots', 'belt', 'offhand'].forEach(function (s) {
      stock.blacksmith.push(entry(vendorItem(level, s, [40, 46, 14], s === 'offhand' ? 'shield' : undefined)));
    });

    // mystic: jewellery, caster off-hands, gems
    for (let i = 0; i < 3; i++) stock.mystic.push(entry(vendorItem(level, 'ring', [0, 72, 28])));
    for (let i = 0; i < 2; i++) stock.mystic.push(entry(vendorItem(level, 'amulet', [0, 72, 28])));
    stock.mystic.push(entry(vendorItem(level, 'offhand', [0, 72, 28], 'orb')));
    stock.mystic.push(entry(vendorItem(level, 'offhand', [0, 72, 28], 'tome')));
    for (let i = 0; i < 4; i++) stock.mystic.push(entry(D.rollGem(Math.max(1, Math.min(49, level - 10)), rng, true)));

    // healer: restoratives (belt potions go through buyPotion)
    stock.healer.push(entry(D.makeMisc('flask_rejuv', level, 1), true));
  };

  I.getVendorStock = function (role) {
    if (!stockLevel) I.refreshVendors(plevel());
    return stock[role] || [];
  };

  I.buy = function (role, index) {
    const p = P();
    const list = I.getVendorStock(role);
    const e = list[index];
    if (!p || !e) return false;
    if (p.gold < e.price) return D.fail('Not enough gold');
    const item = e.infinite ? Object.assign({}, e.item, { id: G.newId(), icon: Object.assign({}, e.item.icon), base: {}, mods: [] }) : e.item;
    if (!I.addToInventory(item)) return D.fail('Inventory full');
    if (!e.infinite) list.splice(index, 1);
    D.addGold(p, -e.price, 'buy');
    return true;
  };

  // ---- mystic gambling: pay for a magic-or-better item of the chosen slot; rarity is a surprise ----
  // Extension: current price of one gamble.
  I.gambleCost = function () { const l = plevel(); return 60 + l * l * 6; };

  I.gamble = function (slot) {
    const p = P();
    if (!p) return null;
    if (slot === 'ring1' || slot === 'ring2') slot = 'ring';
    if (['weapon', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring'].indexOf(slot) < 0) return null;
    const cost = I.gambleCost();
    if (p.gold < cost) { D.fail('Not enough gold'); return null; }
    if (p.inventory.indexOf(null) < 0) { D.fail('Inventory full'); return null; }
    const item = I.rollItem({ level: plevel(), slot: slot, _boost: 3, _floor: 'uncommon' });
    I.addToInventory(item);
    D.addGold(p, -cost, 'buy');
    const o = rord(item.rarity);
    if (o >= rord('legendary')) G.emit('sfx', { name: 'loot_legendary' });
    else if (o >= rord('rare')) G.emit('sfx', { name: 'loot_rare' });
    D.toast('Gambled: ' + item.name, C.RARITY[item.rarity].color);
    return item;
  };

  // ---- potions ----
  I.potionPrice = function (kind) { return (kind === 'mp' ? 10 : 8) + plevel() * 3; };

  I.buyPotion = function (kind) {
    const p = P();
    if (!p || (kind !== 'hp' && kind !== 'mp')) return false;
    if ((p.potions[kind] || 0) >= D.POTION_CAP) return D.fail('Belt is full');
    const price = I.potionPrice(kind);
    if (p.gold < price) return D.fail('Not enough gold');
    p.potions[kind] = (p.potions[kind] || 0) + 1;
    D.addGold(p, -price, 'buy');
    invChanged();
    return true;
  };

  // ---- gems: extension — three of a kind combine into the next tier ----
  I.combineGems = function (invIndex) {
    const p = P();
    const gem = p && p.inventory[invIndex];
    const g = gem && D.GEMS[gem.baseId];
    if (!g) return false;
    if (g.family === 'blood') return D.fail('Bloodstones cannot be combined');
    if (g.tier >= D.GEM_TIERS.length - 1) return D.fail('Already perfect');
    if ((gem.qty || 1) < 3) return D.fail('Need three of the same gem');
    gem.qty -= 3;
    if (gem.qty <= 0) p.inventory[invIndex] = null;
    const next = D.makeMisc('gem_' + g.kind + '_' + (g.tier + 2), 1, 1);
    if (!I.addToInventory(next)) {
      gem.qty += 3;
      p.inventory[invIndex] = gem;
      return D.fail('Inventory full');
    }
    G.emit('sfx', { name: 'equip' });
    D.toast('Created ' + next.name, C.RARITY[next.rarity].color);
    return true;
  };

  // ---- the chute and the surface crate (R8.1) ----
  // state.surface = [item] — everything sent up the chute, in arrival order, no size cap. Plain JSON: the UI/meta must save and
  // load `state.surface` with the rest of the state (and bump the id counter past its items). In town, each surface item can be
  // sold, salvaged, registered with the Curator, stashed or taken into the bag.
  function surface() {
    const S = G.state;
    if (!Array.isArray(S.surface)) S.surface = [];
    return S.surface;
  }
  D.surface = surface;
  I.getSurface = function () { return surface(); };

  // Send bag items up. index | [indices]. Gold, potions and materials never occupy cells, so only real items can be sent. -> count sent
  I.chuteSend = function (indices) {
    const p = P();
    if (!p) return 0;
    const list = Array.isArray(indices) ? indices : [indices];
    const sf = surface();
    let n = 0;
    for (const i of list) {
      const it = p.inventory[i];
      if (!it) continue;
      p.inventory[i] = null;
      sf.push(it);
      n++;
    }
    if (n) {
      G.emit('sfx', { name: 'click' });
      G.emit('surface:changed', { count: sf.length });
      invChanged();
    }
    return n;
  };

  // "Send junk": every bag item that I.isJunk (junk rules, never locked / wanted / protected items) goes up. -> { count }
  I.sendJunk = function () {
    const p = P();
    const idx = [];
    if (p) for (let i = 0; i < p.inventory.length; i++) if (p.inventory[i] && I.isJunk(p.inventory[i])) idx.push(i);
    const count = I.chuteSend(idx);
    if (count) D.toast('Sent ' + count + ' junk item' + (count > 1 ? 's' : '') + ' up the chute', '#8fb4ff');
    return { count: count };
  };
  I.previewSendJunk = function () {
    const p = G.state.player;
    let n = 0;
    if (p && p.inventory) for (const it of p.inventory) if (it && I.isJunk(it)) n++;
    return { count: n };
  };

  // Take a surface item into the bag (works anywhere). -> bool
  I.surfaceTake = function (index) {
    const p = P();
    const sf = surface();
    const item = sf[index];
    if (!p || !item) return false;
    sf.splice(index, 1);
    if (!I.addToInventory(item)) { sf.splice(index, 0, item); return D.fail('Inventory full'); }
    G.emit('surface:changed', { count: sf.length });
    return true;
  };

  function surfacePull(index, what) {
    const p = P();
    const item = surface()[index];
    if (!p || !item) return null;
    if (!inTown(what)) return null;
    return { p: p, item: item };
  }
  function surfaceDone() { G.emit('surface:changed', { count: surface().length }); invChanged(); }

  // town actions on surface items ----
  I.surfaceSell = function (index) {
    const r = surfacePull(index, 'Selling');
    if (!r) return 0;
    if (r.item.locked) { D.fail('Unlock it first'); return 0; }
    const gold = sellValue(r.item);
    if (D.isEquip(r.item)) grindGems(r.p, r.item);
    surface().splice(index, 1);
    remember(r.item, gold);
    D.addGold(r.p, gold, 'sell');
    surfaceDone();
    return gold;
  };
  I.surfaceSalvage = function (index) {
    const r = surfacePull(index, 'Salvaging');
    if (!r) return false;
    if (!D.isEquip(r.item)) return D.fail('Cannot salvage that');
    if (r.item.locked) return D.fail('Unlock it first');
    const m = salvageItem(r.p, r.item).materials;
    surface().splice(index, 1);
    const parts = [];
    for (const k in m) if (m[k]) parts.push('+' + m[k] + ' ' + (k === 'gemdust' ? 'gem dust' : k));
    D.toast('Salvaged: ' + parts.join(', '), '#8fb4ff');
    surfaceDone();
    return true;
  };
  I.surfaceRegister = function (index) {
    const r = surfacePull(index, 'Registering with the Curator');
    if (!r) return { ok: false };
    const res = I.collection.register(r.item, 'item');
    if (res.ok) { surface().splice(index, 1); surfaceDone(); }
    return res;
  };
  I.surfaceStash = function (index) {
    const r = surfacePull(index, 'Stashing');
    if (!r) return false;
    const item = r.item;
    surface().splice(index, 1);
    if (!D.putIntoStash(item)) { surface().splice(index, 0, item); return D.fail('Stash full'); }
    surfaceDone();
    return true;
  };
})();
