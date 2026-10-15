// G.meta save/load: one versioned JSON blob in localStorage. Corrupt or unknown-version saves load as "no save".
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const meta = G.meta = G.meta || {};

  const KEY = 'emberdeep.save';
  const VERSION = 1;
  let guarded = false;        // the pre-overwrite backup runs once per page load

  function store() {
    try { return window.localStorage; } catch (err) { return null; }
  }

  function read() {
    const ls = store();
    if (!ls) return null;
    let data;
    try { data = JSON.parse(ls.getItem(KEY)); } catch (err) { return null; }
    if (!data || typeof data !== 'object') return null;
    data = migrate(data);
    if (!data) return null;
    const p = data.player;
    if (!p || typeof p !== 'object' || typeof p.classId !== 'string') return null;
    if (!Array.isArray(p.inventory) || !p.equipment || typeof p.equipment !== 'object') return null;
    if (!p.attrs || !p.skills || !(p.level >= 1)) return null;
    return data;
  }

  // Step old saves forward one version at a time; return null for anything we cannot read.
  function migrate(data) {
    if (data.v === VERSION) return data;
    return null;
  }

  function maxId(node, depth) {
    let m = 0;
    if (!node || typeof node !== 'object' || depth > 8) return m;
    if (Array.isArray(node)) {
      for (const x of node) m = Math.max(m, maxId(x, depth + 1));
      return m;
    }
    if (typeof node.id === 'number' && isFinite(node.id)) m = node.id;
    for (const k in node) {
      const v = node[k];
      if (v && typeof v === 'object') m = Math.max(m, maxId(v, depth + 1));
    }
    return m;
  }

  function fit(arr, n) {
    const out = Array.isArray(arr) ? arr.slice(0, n) : [];
    while (out.length < n) out.push(null);
    for (let i = 0; i < n; i++) if (!out[i] || typeof out[i] !== 'object') out[i] = null;
    return out;
  }

  meta.save = function () {
    const ls = store();
    if (!ls || !S.player) return false;
    try {
      // Never overwrite the only copy of something we could not read (a save from a newer or older build, or a
      // damaged one): park it under its own key first. A later build with a migration can still pick it up.
      if (!guarded) {
        guarded = true;
        const raw = ls.getItem(KEY);
        if (raw && !read()) ls.setItem(KEY + '.unreadable', raw);
        else if (raw) ls.setItem(KEY + '.prev', raw);      // last good save of the previous session
      }
      ls.setItem(KEY, JSON.stringify({
        v: VERSION, savedAt: Date.now(), seed: S.seed, time: S.time,
        player: S.player, flags: S.flags, quests: S.quests, stash: S.stash, settings: S.settings,
      }));
      return true;
    } catch (err) {
      console.warn('[meta.save]', err);
      return false;
    }
  };

  meta.load = function () {
    const data = read();
    if (!data) return false;
    const p = data.player;
    p.inventory = fit(p.inventory, C.INV_SIZE);
    for (const slot of C.EQUIP_SLOTS) if (!p.equipment[slot] || typeof p.equipment[slot] !== 'object') p.equipment[slot] = null;
    if (!Array.isArray(p.skillBar)) p.skillBar = [];
    while (p.skillBar.length < C.SKILL_SLOTS) p.skillBar.push(null);
    if (!p.potions || typeof p.potions !== 'object') p.potions = { hp: 0, mp: 0 };
    if (!p.stats || typeof p.stats !== 'object') p.stats = {};
    // transient combat state never survives a reload
    p.cooldowns = {};
    p.effects = [];
    p.dead = false;
    p.anim = 'idle'; p.animT = 0; p.hitFlash = 0;
    if (!(p.hp > 0)) p.hp = 1;
    if (!(p.gold >= 0)) p.gold = 0;

    const f = (data.flags && typeof data.flags === 'object') ? data.flags : {};
    const flags = { maxDepth: 1, waypoints: [1], portalDepth: 0, visits: 0, kills: 0, deaths: 0, corpse: null, sealed: false };
    for (const k in f) flags[k] = f[k];
    if (!Array.isArray(flags.waypoints) || !flags.waypoints.length) flags.waypoints = [1];
    flags.portalDepth = Math.max(0, flags.portalDepth | 0);
    flags.sealed = false;       // a lockdown never survives a reload: the player always resumes in town
    for (const k of ['loreFound', 'storySeen']) flags[k] = Array.isArray(flags[k]) ? flags[k].filter(function (v) { return typeof v === 'number' || typeof v === 'string'; }) : [];
    const c = flags.corpse;
    if (!c || typeof c !== 'object' || !(c.depth >= 1) || !Array.isArray(c.items)) flags.corpse = null;
    else { c.items = c.items.filter(function (it) { return it && typeof it === 'object'; }); c.gold = Math.max(0, +c.gold || 0); }

    S.player = p;
    S.flags = flags;
    meta._applyStashBonus(flags);
    S.stash = fit(data.stash, C.STASH_SIZE);
    if (G.items && G.items.migrateState) { try { G.items.migrateState(); } catch (err) { console.error('[meta migrateState]', err); } }     // R7.1: old rarity keys
    S.seed = (data.seed >>> 0) || 1;
    S.time = +data.time || 0;
    if (data.settings && typeof data.settings === 'object') {
      for (const k in data.settings) S.settings[k] = data.settings[k];
      delete S.settings.junkRarity;      // replaced by settings.junk (R3.1)
    }
    S.quests = (data.quests && typeof data.quests === 'object') ? data.quests : {};
    if (meta._repairQuests) meta._repairQuests();

    if (G.bumpId) G.bumpId(Math.max(maxId(p, 0), maxId(S.stash, 0), maxId(flags.corpse, 0)));
    return true;
  };

  // R7.11 Collection Book milestones add stash rows (10 cells each): the stash size is C.STASH_SIZE everywhere (items + ui),
  // so raising it is the whole job. Never lowers it; the base is whatever the constants said when this file loaded.
  const STASH_BASE = C.STASH_SIZE;
  meta._applyStashBonus = function (flags) {
    const f = flags || S.flags;
    const rows = f && f.collection && typeof f.collection === 'object' ? Math.max(0, f.collection.stash | 0) : 0;
    C.STASH_SIZE = STASH_BASE + Math.min(rows, 20) * 10;
    if (Array.isArray(S.stash)) while (S.stash.length < C.STASH_SIZE) S.stash.push(null);
  };
  G.on('collection:tier', function () { meta._applyStashBonus(); });
  G.on('scene:changed', function () { meta._applyStashBonus(); });

  meta.hasSave = function () { return !!read(); };

  meta.deleteSave = function () {
    const ls = store();
    if (!ls) return;
    try { ls.removeItem(KEY); ls.removeItem(KEY + '.prev'); } catch (err) { /* private mode */ }
  };

  meta._KEY = KEY;
  meta._VERSION = VERSION;
})();
