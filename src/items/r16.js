// Loot & Economy — R16 Wave A: left-behind piles, story-grown crate size, the ground loot filter, blacksmith sockets and the Socket Tool.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  function P() { return D.ensure(G.state.player); }

  // ---- crate size (R16.4): starts at 25, grows with state.flags.crateBonus (challenge quests), at most 300 ----
  D.SURFACE_START = 25;
  D.SURFACE_MAX = 300;
  // IT-8: saves from before the crate shrank to 25 may hold more than 25 + crateBonus items; grant the capacity they already use.
  function migrateCrate() {
    const S = G.state, f = S.flags, n = Array.isArray(S.surface) ? S.surface.length : 0;
    if (!f || n <= D.SURFACE_START) return;
    const b = Math.max(0, Math.floor(+f.crateBonus || 0));
    if (D.SURFACE_START + b < n) f.crateBonus = Math.min(D.SURFACE_MAX, n) - D.SURFACE_START;
  }
  G.on('scene:changed', migrateCrate);
  I.surfaceSize = function () {
    const b = G.state.flags && +G.state.flags.crateBonus;
    return Math.max(D.SURFACE_START, Math.min(D.SURFACE_MAX, D.SURFACE_START + (b > 0 ? Math.floor(b) : 0)));
  };
  Object.defineProperty(I, 'SURFACE_SIZE', { get: function () { return I.surfaceSize(); }, enumerable: true, configurable: true });

  // ---- ground loot filter (R16.7) ----
  // state.settings.lootFilterRules = { on, cur: <a matchFilter filter>, presets: [{ name, filter }] }. An item that MATCHES `cur` while
  // `on` is true is filtered out: hidden from the pile list and refused by pickup / pickupPile. Gold, lore, quest items, gems,
  // consumables, Legendary tiers, sets and locked items never match (matchFilter's own protections), so they always pass.
  // Older shapes are converted on first use (I.migrateFilterSettings).
  function rules() {
    const s = G.state.settings, r = s && s.lootFilterRules;
    if (!r || typeof r !== 'object') return null;
    if (typeof r.on !== 'boolean' || !r.cur || !Array.isArray(r.presets) || 'enabled' in r.cur || 'rarity' in r.cur) { I.migrateFilterSettings(s); return s.lootFilterRules; }
    return r;
  }
  I.lootFilterAllows = function (item) {
    const r = rules();
    if (!r || !r.on || !item) return true;
    return !I.matchFilter(item, r.cur);
  };
  I.getLootFilter = function () {
    const s = G.state.settings || (G.state.settings = {});
    if (!s.lootFilterRules) s.lootFilterRules = { on: false, cur: { maxRarity: 'common', excludeUpgrades: true, excludeSocketed: true, excludeWanted: true }, presets: [] };
    return rules();
  };
  // f: { on, cur, presets } or a flat filter (optionally with on / enabled)
  I.setLootFilter = function (f) {
    const s = G.state.settings || (G.state.settings = {});
    const cur0 = I.getLootFilter();
    f = f || {};
    const flat = f.cur && typeof f.cur === 'object' ? f.cur : f;
    s.lootFilterRules = { on: typeof f.on === 'boolean' ? f.on : (flat.enabled !== undefined || flat.on !== undefined ? !!(flat.on || flat.enabled) : cur0.on),
      cur: I.normalizeFilter(flat), presets: Array.isArray(f.presets) ? f.presets : cur0.presets };
    I.migrateFilterSettings(s);
    G.emit('inventory:changed', {});
    return s.lootFilterRules;
  };
  I.getLootFilterPresets = function () { return I.getLootFilter().presets; };
  I.saveLootFilterPreset = function (name, f) { const st = I.getLootFilter(); return I._savePreset(st, name, f); };
  I.deleteLootFilterPreset = function (name) { return I._dropPreset(I.getLootFilter(), name); };
  // Is this ground entry visible (not filtered out)?
  I.isGroundVisible = function (g) { return !!g && (!g.item || g.item.type === 'gold' || I.lootFilterAllows(g.item)); };

  const getPile = I.getPile;
  I.getPile = function (pileId) { return getPile(pileId).filter(I.isGroundVisible); };

  // ---- left-behind piles (R16.1) ----
  function mark(pileId, ground) {
    let n = 0;
    for (const g of G.state.groundItems) if ((pileId && g.pileId === pileId) || g === ground) { g.leftBehind = true; n++; }
    return n;
  }
  const pickup = I.pickup;
  I.pickup = function (groundId, quiet) {
    let g = null;
    for (const x of G.state.groundItems) if (x.id === groundId) { g = x; break; }
    if (g && g.item && g.item.type !== 'gold' && !I.lootFilterAllows(g.item)) return false;
    const ok = pickup(groundId, quiet);
    if (!ok && g && G.state.groundItems.indexOf(g) >= 0) mark(g.pileId, g);       // refused (bag full): the pile is marked
    return ok;
  };
  const pickupPile = I.pickupPile;
  I.pickupPile = function (pileId, opts) {
    const out = pickupPile(pileId, opts);
    if (out.full) mark(pileId, null);
    return out;
  };
  // Piles with something left behind -> [{ pileId, x, y, count }]
  I.getLeftBehind = function () {
    const by = {}, out = [];
    for (const g of G.state.groundItems) {
      if (!g.leftBehind) continue;
      const k = g.pileId || g.id;
      if (!by[k]) { by[k] = { pileId: g.pileId || null, x: g.x, y: g.y, count: 0 }; out.push(by[k]); }
      by[k].count++;
    }
    return out;
  };

  // ---- sockets at the blacksmith, and the Socket Tool (R16.8) ----
  D.SOCKET_HARD_MAX = 6;
  D.SOCKET_COST = { base: 120, perLevel: 18, growth: 2.2 };       // gold = (base + perLevel x ilvl) x growth ^ current sockets
  D.SOCKET_FAIL = { common: 0.05, uncommon: 0.1, rare: 0.2, magic: 0.3, legendary: 0.45, mythic: 0.55, unique: 0.6, rift: 0.7, perSocket: 0.05, max: 0.9 };

  function hostOf(p, target) {
    if (target && typeof target === 'object') return target;
    return typeof target === 'number' ? p.inventory[target] : p.equipment[target];
  }
  // -> { gold } or null when the item cannot take another socket (not equipment, or already at the maximum of 6)
  I.socketCost = function (target) {
    const p = G.state.player;
    const item = p && hostOf(p, target);
    if (!item || !D.isEquip(item)) return null;
    const n = item.sockets ? item.sockets.length : 0;
    if (n >= D.SOCKET_HARD_MAX) return null;
    const c = D.SOCKET_COST;
    return { gold: Math.round((c.base + c.perLevel * item.ilvl) * Math.pow(c.growth, n)) };
  };
  // Chance the Socket Tool fails on this item (rises with rarity and with sockets already there)
  I.socketFailChance = function (target) {
    const p = G.state.player;
    const item = p && hostOf(p, target);
    if (!item) return 0;
    const f = D.SOCKET_FAIL, n = item.sockets ? item.sockets.length : 0;
    return Math.min(f.max, (f[item.rarity] || f.common) + f.perSocket * n);
  };

  // addSocket(target)               — the blacksmith adds one socket for gold (town only)
  // addSocket(target, { tool: i })  — use the Socket Tool in bag cell i, anywhere; on failure the TOOL is destroyed, never the item
  // target = item, bag index or equipment slot. -> true on success, false otherwise
  I.addSocket = function (target, opts) {
    const p = P();
    const item = p && hostOf(p, target);
    if (!item || !D.isEquip(item)) return D.fail('Cannot add a socket to that');
    const cost = I.socketCost(item);
    if (!cost) return D.fail('Already has the maximum of ' + D.SOCKET_HARD_MAX + ' sockets');
    const tool = opts && opts.tool !== undefined ? p.inventory[opts.tool] : null;
    if (opts && opts.tool !== undefined) {
      if (!tool || tool.baseId !== 'socket_tool') return D.fail('That is not a Socket Tool');
      const fail = G.rng.global.chance(I.socketFailChance(item));
      if (tool.qty > 1) tool.qty--; else p.inventory[opts.tool] = null;
      if (fail) {
        D.toast('The Socket Tool shatters; ' + item.name + ' is unharmed', '#ff5b5b');
        G.emit('sfx', { name: 'error' });
        G.emit('inventory:changed', {});
        G.emit('socket:failed', { item: item });
        return false;
      }
    } else {
      if (!D.inTown('Adding sockets')) return false;
      if (p.gold < cost.gold) return D.fail('Not enough gold');
      D.spend(p, cost.gold, 'blacksmith', 'socket');
    }
    (item.sockets || (item.sockets = [])).push(null);
    item.value = D.itemValue(item);
    G.emit('sfx', { name: 'equip' });
    D.toast('Socket added to ' + item.name, (C.RARITY[item.rarity] || C.RARITY.common).color);
    G.emit('inventory:changed', {});
    for (const s of C.EQUIP_SLOTS) if (p.equipment[s] === item) D.equipChanged(p);
    return true;
  };
})();
