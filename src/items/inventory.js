// Loot & Economy — inventory, equipment, pickup, consumables, sockets, stash.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  function P() { return D.ensure(G.state.player); }
  function toast(text, color) { G.emit('ui:toast', { text: text, color: color }); }
  function fail(text) { toast(text, '#ff5b5b'); G.emit('sfx', { name: 'error' }); return false; }
  function invChanged() { G.emit('inventory:changed', {}); }
  function rcolor(item) { return (C.RARITY[item.rarity] || C.RARITY.common).color; }
  function stackable(item) { return item.type === 'consumable' || item.type === 'gem' || item.type === 'material'; }
  D.fail = fail;
  D.toast = toast;

  D.equipChanged = function (p) {
    if (G.game && G.game.recomputeStats) {
      try { G.game.recomputeStats(p); } catch (err) { console.error('[items] recomputeStats', err); }
    }
    G.emit('equipment:changed', {});
  };

  D.addGold = function (p, delta, sfx) {
    if (!delta) return;
    p.gold = Math.max(0, Math.round((p.gold || 0) + delta));
    G.emit('gold:changed', { gold: p.gold, delta: delta });
    if (sfx) G.emit('sfx', { name: sfx });
  };

  // Pay a trader: takes the gold and emits gold:spent { amount, role, what } (loyalty quests and milestones listen).
  D.spend = function (p, amount, role, what) {
    D.addGold(p, -amount, 'buy');
    G.emit('gold:spent', { amount: amount, role: role, what: what });
  };

  // Belt potions are counters. Anything over the belt cap is cashed in on the spot so nothing litters the floor.
  function addPotion(p, kind, qty, level) {
    const room = Math.max(0, D.POTION_CAP - (p.potions[kind] || 0));
    const take = Math.min(room, qty);
    p.potions[kind] = (p.potions[kind] || 0) + take;
    if (qty > take) {
      const g = (qty - take) * D.CONSUMABLES['potion_' + kind].value(level || p.level || 1);
      D.addGold(p, g);
      toast('Belt full: +' + g + ' gold', '#ffd94a');
    }
  }

  // Place into a container array (inventory or stash): stack first, then first free cell. -> bool
  function putInto(arr, size, item) {
    if (stackable(item)) {
      let left = item.qty || 1;
      for (let i = 0; i < size && left > 0; i++) {
        const o = arr[i];
        if (o && o.baseId === item.baseId && stackable(o) && (o.qty || 1) < D.MAX_STACK) {
          const take = Math.min(left, D.MAX_STACK - (o.qty || 1));
          o.qty = (o.qty || 1) + take;
          left -= take;
        }
      }
      if (left <= 0) return true;
      item.qty = left;
    }
    for (let i = 0; i < size; i++) {
      if (!arr[i]) { arr[i] = item; return true; }
    }
    return false;
  }

  function freeCells(arr, size) {
    let n = 0;
    for (let i = 0; i < size; i++) if (!arr[i]) n++;
    return n;
  }

  // Gold, belt potions and crafting materials never take a bag slot — they go to their counters.
  I.addToInventory = function (item) {
    const p = P();
    if (!p || !item) return false;
    if (item.type === 'gold') { D.addGold(p, item.qty || 0); return true; }
    // R4.1: lore pages never take a bag slot; the UI shows the page. R5.5: we also record state.flags.loreFound as a safety net.
    if (item.type === 'lore') {
      const f = G.state.flags || (G.state.flags = {});
      if (!Array.isArray(f.loreFound)) f.loreFound = [];
      if (f.loreFound.indexOf(item.loreIndex) < 0) f.loreFound.push(item.loreIndex);
      G.emit('lore:found', { loreIndex: item.loreIndex });
      return true;
    }
    if (item.foundAt === undefined) item.foundAt = G.state.time || 0;     // R5.7 'newest' sort
    if (item.baseId === 'potion_hp' || item.baseId === 'potion_mp') {
      addPotion(p, item.baseId === 'potion_hp' ? 'hp' : 'mp', item.qty || 1, item.ilvl);
      invChanged();
      return true;
    }
    const mat = item.type === 'material' && D.MATERIALS[item.baseId];
    if (mat) {
      p.materials[mat.key] = (p.materials[mat.key] || 0) + (item.qty || 1);
      invChanged();
      return true;
    }
    if (!putInto(p.inventory, C.INV_SIZE, item)) return false;
    I.autoSort();
    invChanged();
    return true;
  };

  I.pickup = function (groundId, quiet) {
    const p = P();
    const list = G.state.groundItems;
    let idx = -1;
    for (let i = 0; i < list.length; i++) if (list[i].id === groundId) { idx = i; break; }
    if (!p || idx < 0) return false;
    const item = list[idx].item;
    if (item.type !== 'gold' && item.type !== 'lore') item.foundAt = G.state.time || 0;
    const rules = G.state.settings && G.state.settings.junk;
    let salvaged = null;
    if (item.type === 'gold') {
      D.addGold(p, item.qty || 0, quiet ? null : 'gold');
    } else {
      if (!I.addToInventory(item)) return quiet ? false : fail('Inventory full');
      if (!quiet) G.emit('sfx', { name: item.type === 'consumable' ? 'potion' : 'click' });
    }
    list.splice(idx, 1);
    G.emit('item:picked', salvaged ? { item: item, salvaged: true, materials: salvaged } : { item: item });
    return true;
  };

  // R5.6: take a whole pile (or everything at/above minRarity; gold, potions, materials and lore are always taken).
  // -> { taken: n, left: n, full: bool, items: [item taken] }. Quiet: no sound, no toast — the caller (the UI pile popup)
  // presents the result. item:picked / gold:changed / lore:found still fire per item.
  I.pickupPile = function (pileId, opts) {
    const min = opts && opts.minRarity && C.RARITY[opts.minRarity] ? C.RARITY[opts.minRarity].order : -1;
    const out = { taken: 0, left: 0, full: false, items: [] };
    if (!P()) return out;
    for (const g of I.getPile(pileId)) {
      const it = g.item;
      const always = it.type === 'gold' || it.type === 'lore' || it.type === 'material' || it.baseId === 'potion_hp' || it.baseId === 'potion_mp';
      if (!always && (out.full || (C.RARITY[it.rarity] || C.RARITY.common).order < min)) { out.left++; continue; }
      if (I.pickup(g.id, true)) { out.taken++; out.items.push(it); } else { out.full = true; out.left++; }
    }
    return out;
  };

  // equip(invIndex[, 'ring1'|'ring2']) — the optional second argument picks the ring slot explicitly.
  I.equip = function (invIndex, targetSlot) {
    const p = P();
    const item = p && p.inventory[invIndex];
    if (!item) return false;
    if (!D.isEquip(item)) return fail('Cannot equip that');
    const rq = I.meetsRequirements(item, p);
    if (!rq.ok) return fail(rq.text);
    const plan = D.planEquip(p.equipment, item, D.classProfile(p), targetSlot);
    // the equipped item's own cell is freed, every further displaced item needs a free one
    if (plan.out.length - 1 > freeCells(p.inventory, C.INV_SIZE)) return fail('Inventory full');
    p.inventory[invIndex] = null;
    for (const s of C.EQUIP_SLOTS) p.equipment[s] = plan.eq[s] || null;
    for (let i = 0; i < plan.out.length; i++) {
      if (i === 0) p.inventory[invIndex] = plan.out[i];
      else putInto(p.inventory, C.INV_SIZE, plan.out[i]);
    }
    G.emit('sfx', { name: 'equip' });
    invChanged();
    D.equipChanged(p);
    return true;
  };

  I.unequip = function (slot) {
    const p = P();
    const item = p && p.equipment[slot];
    if (!item) return false;
    if (!putInto(p.inventory, C.INV_SIZE, item)) return fail('Inventory full');
    p.equipment[slot] = null;
    G.emit('sfx', { name: 'equip' });
    invChanged();
    D.equipChanged(p);
    return true;
  };

  function consume(p, invIndex) {
    const item = p.inventory[invIndex];
    if ((item.qty || 1) > 1) item.qty--;
    else p.inventory[invIndex] = null;
  }

  const SOCKET_ORDER = ['weapon', 'chest', 'helm', 'offhand', 'amulet', 'ring1', 'ring2', 'gloves', 'boots', 'belt'];
  function targetItem(p, target) {
    return typeof target === 'number' ? p.inventory[target] : p.equipment[target];
  }

  // Socket the gem at gemIndex into target (inventory index or equipment slot). Cut gems can be removed again with
  // unsocketGem; bloodstones (gem.permanent) fuse for good — the UI confirms before calling this or useItem for one.
  // Argument order: (gemIndex, target, opts) as blessed in R2.8. R3.3 writes (target, gemIndex, opts); both work — a slot
  // name or a bag cell that is not a gem identifies the target. Bloodstones need opts.confirmPermanent === true.
  I.socketGem = function (gemIndex, target, opts) {
    const p = P();
    if (!p) return false;
    const isGemAt = function (i) { return typeof i === 'number' && p.inventory[i] && p.inventory[i].type === 'gem'; };
    if (typeof gemIndex === 'string' || (!isGemAt(gemIndex) && isGemAt(target))) { const t = gemIndex; gemIndex = target; target = t; }
    const gem = p.inventory[gemIndex];
    const host = targetItem(p, target);
    if (!gem || gem.type !== 'gem' || !D.isEquip(host) || !host.sockets) return false;
    if (D.isPermanentGem(gem) && !(opts && opts.confirmPermanent === true)) return false;
    const s = host.sockets.indexOf(null);
    if (s < 0) return fail('No empty socket');
    const one = Object.assign({}, gem, { id: G.newId(), qty: 1 });
    host.sockets[s] = one;
    consume(p, gemIndex);
    G.emit('sfx', { name: 'equip' });
    toast(one.name + (one.permanent ? ' fused into ' : ' socketed into ') + host.name, rcolor(one));
    invChanged();
    if (typeof target !== 'number') D.equipChanged(p);
    return true;
  };

  I.useItem = function (invIndex) {
    const p = P();
    const item = p && p.inventory[invIndex];
    if (!item) return false;
    if (D.isEquip(item)) return I.equip(invIndex);
    if (item.type === 'gem') {
      // R3.3: a bloodstone fuses for good, so a one-tap Use never sockets one (the UI confirms, then calls socketGem)
      if (D.isPermanentGem(item)) return fail('Bloodstones must be fused from the item menu');
      for (const s of SOCKET_ORDER) {
        const h = p.equipment[s];
        if (h && h.sockets && h.sockets.indexOf(null) >= 0) return I.socketGem(invIndex, s);
      }
      return fail('No empty socket on equipped gear');
    }
    if (item.type !== 'consumable') return false;
    switch (item.baseId) {
      case 'potion_hp':
      case 'potion_mp':
        p.inventory[invIndex] = null;
        I.addToInventory(item);
        return true;
      case 'flask_rejuv':
        if (p.stats) {
          if (p.stats.hpMax) p.hp = p.stats.hpMax;
          if (p.stats.mpMax) p.mp = p.stats.mpMax;
        }
        G.emit('fx:spawn', { type: 'heal', x: p.x, y: p.y });
        G.emit('sfx', { name: 'potion' });
        break;
      case 'tome_xp': {
        const xp = 40 + item.ilvl * item.ilvl * 4;
        if (G.game && G.game.gainXp) G.game.gainXp(xp);
        else p.xp = (p.xp || 0) + xp;
        toast('+' + xp + ' experience', '#7fd4ff');
        G.emit('sfx', { name: 'quest' });
        break;
      }
      case 'tome_skill':
        if (!I.grantTome(1)) return false;
        break;
      case 'trophy':
        return fail('Sell it to a merchant');
      case 'socket_tool':
        return fail('Use it from the item menu');
      case 'chisel': {
        let host = null;
        for (const s of SOCKET_ORDER) {
          const h = p.equipment[s];
          if (h && (h.sockets ? h.sockets.length : 0) < D.SOCKET_MAX(h)) { host = h; break; }
        }
        if (!host) return fail('No equipped item can take another socket');
        (host.sockets || (host.sockets = [])).push(null);
        host.value = D.itemValue(host);
        toast('Socket added to ' + host.name, rcolor(host));
        G.emit('sfx', { name: 'equip' });
        G.emit('equipment:changed', {});
        break;
      }
      default:
        return false;
    }
    consume(p, invIndex);
    invChanged();
    return true;
  };

  // R7.4 Tome of Insight: n skill points. Used by the Tome item and by boss / fallen-adventurer rewards (game calls this directly).
  I.grantTome = function (n) {
    const p = G.state.player;
    n = Math.max(1, n | 0 || 1);
    if (!p) return false;
    p.skillPoints = (p.skillPoints | 0) + n;
    G.emit('ui:toast', { text: 'Insight: +' + n + ' skill point' + (n > 1 ? 's' : ''), color: '#e8d8a0' });
    G.emit('sfx', { name: 'quest' });
    G.emit('player:stats', {});
    G.emit('skills:changed', {});
    return true;
  };

  I.dropFromInventory = function (invIndex) {
    const p = P();
    const item = p && p.inventory[invIndex];
    if (!item) return;
    p.inventory[invIndex] = null;
    I.dropItemAt(p.x || 0, p.y || 0, item);
    invChanged();
  };

  // ---- sorting (R5.7) ----
  // Modes: 'rarity' | 'level' | 'slot' | 'value' | 'upgrades' | 'newest'. Stable; equal keys fall back to rarity, then level,
  // then the current order. No mode = state.settings.sort, else 'slot' (the old fixed order).
  const TYPE_ORDER = { weapon: 0, armor: 1, jewelry: 2, gem: 3, consumable: 4, material: 5 };
  const SLOT_ORDER = { weapon: 0, offhand: 1, helm: 2, chest: 3, gloves: 4, boots: 5, belt: 6, amulet: 7, ring: 8 };
  const VERDICT_ORDER = { up: 0, same: 1, down: 2 };
  D.SORT_MODES = ['rarity', 'level', 'slot', 'value', 'upgrades', 'newest'];
  function rk(it) { return (C.RARITY[it.rarity] || C.RARITY.common).order; }
  function typeKey(it) { return TYPE_ORDER[it.type] !== undefined ? TYPE_ORDER[it.type] : 9; }
  // primary key per mode, smaller first
  const SORT_KEY = {
    rarity: function (it) { return -rk(it); },
    level: function (it) { return -(it.ilvl || 0); },
    slot: function (it) { return typeKey(it) * 100 + (SLOT_ORDER[it.slot] || 0); },
    value: function (it) { return -((it.value || 0) * (it.qty || 1)); },
    upgrades: function (it) { const v = I.verdict ? I.verdict(it) : null; return v in VERDICT_ORDER ? VERDICT_ORDER[v] : 3; },
    newest: function (it) { return -(typeof it.foundAt === 'number' ? it.foundAt : -1); },
  };
  D.sortItems = function (arr, size, mode) { return sortItems(arr, size, mode); };
  D.sortMode = function (mode) { return sortMode(mode); };
  function sortItems(arr, size, mode) {
    const key = SORT_KEY[mode] || SORT_KEY.slot;
    const rows = [];
    for (let i = 0; i < size; i++) { if (arr[i]) rows.push({ it: arr[i], k: key(arr[i]), i: i }); arr[i] = null; }
    rows.sort(function (a, b) {
      return (a.k - b.k) || (rk(b.it) - rk(a.it)) || ((b.it.ilvl || 0) - (a.it.ilvl || 0)) || (a.i - b.i);
    });
    for (const r of rows) putInto(arr, size, r.it);   // re-inserting merges partial stacks
  }
  function sortMode(mode) {
    if (SORT_KEY[mode]) return mode;
    const s = G.state.settings && G.state.settings.sort;
    return SORT_KEY[s] ? s : null;
  }


  // R8.5 sticky sorting: applied to the bag and the stash whenever items enter them, using the chosen mode (state.settings.sort).
  // Off when state.settings.autoSort === false or when no mode has been chosen yet. -> bool (true if it sorted)
  I.autoSort = function () {
    const s = G.state.settings;
    if (!s || s.autoSort === false || !SORT_KEY[s.sort]) return false;
    const p = G.state.player;
    if (p && p.inventory) sortItems(p.inventory, C.INV_SIZE, s.sort);
    if (Array.isArray(G.state.stash)) sortItems(G.state.stash, C.STASH_SIZE, s.sort);
    return true;
  };
  I.sortInventory = function (mode) {
    const p = P();
    if (!p) return;
    sortItems(p.inventory, C.INV_SIZE, sortMode(mode));
    invChanged();
  };

  // ---- locking (R5.8): a locked item is never sold, salvaged or junked ----
  // target: an item, a bag index, an equipment slot name, or { stash: index }. -> the new locked state (false if no item).
  function lockTarget(target) {
    const p = G.state.player;
    if (target && typeof target === 'object' && typeof target.stash === 'number') return stash()[target.stash] || null;
    if (target && typeof target === 'object') return target;
    if (!p) return null;
    return typeof target === 'number' ? (p.inventory || [])[target] || null : (p.equipment || {})[target] || null;
  }
  I.setLocked = function (target, locked) {
    const item = lockTarget(target);
    if (!item || item.type === 'gold') return false;
    if (locked) item.locked = true; else delete item.locked;
    G.emit('sfx', { name: 'click' });
    invChanged();
    return !!item.locked;
  };
  I.toggleLock = function (target) {
    const item = lockTarget(target);
    return item ? I.setLocked(item, !item.locked) : false;
  };

  // ---- stash ----
  function stash() {
    const S = G.state;
    if (!Array.isArray(S.stash)) S.stash = [];
    while (S.stash.length < C.STASH_SIZE) S.stash.push(null);
    return S.stash;
  }
  D.stash = stash;
  D.putIntoStash = function (item) { const ok = putInto(stash(), C.STASH_SIZE, item); if (ok) I.autoSort(); return ok; };

  I.stashDeposit = function (invIndex) {
    const p = P();
    const item = p && p.inventory[invIndex];
    if (!item) return false;
    const st = stash();
    p.inventory[invIndex] = null;
    if (!putInto(st, C.STASH_SIZE, item)) {
      p.inventory[invIndex] = item;    // (a partly merged stack keeps its remainder here)
      invChanged();
      return fail('Stash full');
    }
    I.autoSort();
    G.emit('sfx', { name: 'click' });
    invChanged();
    return true;
  };

  I.stashWithdraw = function (stashIndex) {
    const p = P();
    const st = stash();
    const item = st[stashIndex];
    if (!p || !item) return false;
    st[stashIndex] = null;
    if (!putInto(p.inventory, C.INV_SIZE, item)) {
      st[stashIndex] = item;
      invChanged();
      return fail('Inventory full');
    }
    I.autoSort();
    G.emit('sfx', { name: 'click' });
    invChanged();
    return true;
  };

  // Extension: sort the stash the same way as the bag.
  I.sortStash = function (mode) {
    sortItems(stash(), C.STASH_SIZE, sortMode(mode));
    invChanged();
  };
})();
