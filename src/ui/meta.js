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
    let raw = null;
    try { raw = ls.getItem(KEY); } catch (err) { return null; }
    return parse(raw);
  }

  // A save string -> the validated save object, or null (unreadable / wrong version / damaged).
  function parse(raw) {
    let data;
    try { data = JSON.parse(raw); } catch (err) { return null; }
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

  // ---------- backup ring ----------
  // emberdeep.save.bak.0..4, newest first, ONE entry per hero (keyed by the save's seed, which is new for every New Game), so
  // an old hero is never pushed out by snapshots of the new one. Each entry: { savedAt, name, classId, level, depth, seed, raw }.
  const BAK = KEY + '.bak.', RING = 5;
  function summarize(data, raw) {
    const p = data.player || {};
    return { savedAt: data.savedAt || 0, name: String(p.name || 'Hero').slice(0, 20), classId: p.classId, level: p.level | 0, depth: (data.flags && data.flags.maxDepth) | 0, seed: data.seed, raw: raw };
  }
  function readRing() {
    const ls = store(), out = [];
    if (!ls) return out;
    for (let i = 0; i < RING; i++) {
      let e = null;
      try { e = JSON.parse(ls.getItem(BAK + i)); } catch (err) { e = null; }
      if (e && typeof e === 'object' && typeof e.raw === 'string') out.push(e);
    }
    return out;
  }
  function writeRing(list) {
    const ls = store();
    if (!ls) return false;
    list = list.slice(0, RING);
    for (;;) {                                   // quota full: shed the oldest entry and retry
      try {
        for (let i = 0; i < RING; i++) {
          if (list[i]) ls.setItem(BAK + i, JSON.stringify(list[i])); else ls.removeItem(BAK + i);
        }
        return true;
      } catch (err) {
        if (list.length <= 1) return false;
        list.pop();
      }
    }
  }
  // Put a save string into the ring (replacing the same hero's older entry). Unreadable strings are not worth a slot.
  function pushRing(raw) {
    const data = parse(raw);
    if (!data) return false;
    const e = summarize(data, raw);
    const list = readRing().filter(function (x) { return x.seed !== e.seed; });
    list.unshift(e);
    return writeRing(list);
  }
  function ringSeed(raw) { try { return JSON.parse(raw).seed; } catch (err) { return undefined; } }
  meta.pushCurrent = function () {              // "New Game over an existing save": call before the old hero can be overwritten
    const ls = store();
    let raw = null;
    try { raw = ls && ls.getItem(KEY); } catch (err) { raw = null; }
    return raw ? pushRing(raw) : false;
  };
  // Readable backups, newest first: [{ index, savedAt, name, classId, level, depth, seed }] (index = ring slot order)
  meta.listBackups = function () {
    const out = [];
    readRing().forEach(function (e, i) {
      if (parse(e.raw)) out.push({ index: i, savedAt: e.savedAt, name: e.name, classId: e.classId, level: e.level, depth: e.depth, seed: e.seed });
    });
    return out;
  };
  // Make backup i the main save (the current main goes into the ring first when it is readable and a different hero).
  meta.restoreBackup = function (i) {
    const ls = store(), e = readRing()[i];
    if (!ls || !e || !parse(e.raw)) return false;
    try {
      const cur = ls.getItem(KEY);
      if (cur && !parse(cur)) ls.setItem(KEY + '.unreadable', cur);
      else if (cur) pushRing(cur);
      ls.setItem(KEY, e.raw);
      guarded = true;
      return true;
    } catch (err) { console.warn('[meta.restore]', err); return false; }
  };

  let ringDue = false, savedOnce = false;
  G.on('scene:changed', function () { ringDue = true; });

  meta.save = function () {
    const ls = store();
    if (!ls || !S.player || meta._noSave) return false;
    try {
      // Never overwrite the only copy of something we could not read (a save from a newer or older build, or a
      // damaged one): park it under its own key first. A later build with a migration can still pick it up.
      const before = ls.getItem(KEY);
      if (!guarded) {
        guarded = true;
        if (before && !parse(before)) ls.setItem(KEY + '.unreadable', before);
        else if (before) ls.setItem(KEY + '.prev', before);      // last good save of the previous session
      }
      // a different hero is about to replace the one on disk (New Game): keep the old one in the ring first
      if (before && ringSeed(before) !== S.seed) pushRing(before);
      const raw = JSON.stringify({
        v: VERSION, savedAt: Date.now(), seed: S.seed, time: S.time,
        player: S.player, flags: S.flags, quests: S.quests, stash: S.stash, settings: S.settings,
      });
      ls.setItem(KEY, raw);
      if (ringDue) { ringDue = false; pushRing(raw); }        // at most one ring write per scene change
      if (!savedOnce) { savedOnce = true; if (G.ui && G.ui._askPersist) G.ui._askPersist(); }
      return true;
    } catch (err) {
      console.warn('[meta.save]', err);
      return false;
    }
  };

  // ---------- export / import (save codes) ----------
  // 'SLW1:' + base64(gzip(json)) where CompressionStream exists, else 'SLW0:' + base64(json). Both are plain text.
  function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(t) { const s = atob(t); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function pipe(bytes, stream) {
    const rs = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return rs.arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  // -> Promise<string|null>
  meta.exportCode = function () {
    if (S.player) meta.save();
    const ls = store();
    let raw = null;
    try { raw = ls && ls.getItem(KEY); } catch (err) { raw = null; }
    if (!raw || !parse(raw)) return Promise.resolve(null);
    const bytes = new TextEncoder().encode(raw);
    if (typeof CompressionStream === 'function' && typeof Response === 'function') {
      return pipe(bytes, new CompressionStream('gzip')).then(function (z) { return 'SLW1:' + b64(z); }, function () { return 'SLW0:' + b64(bytes); });
    }
    return Promise.resolve('SLW0:' + b64(bytes));
  };
  // text -> Promise<{ raw, info }|null>. Tolerates whitespace and surrounding quotes from copy / paste.
  meta.parseCode = function (text) {
    const t = String(text || '').replace(/[\s"'`]+/g, '');
    const m = /^SLW([01]):([A-Za-z0-9+/=]+)$/.exec(t);
    if (!m) return Promise.resolve(null);
    let bytes;
    try { bytes = unb64(m[2]); } catch (err) { return Promise.resolve(null); }
    const done = function (b) {
      let raw = null;
      try { raw = new TextDecoder().decode(b); } catch (err) { raw = null; }
      const data = raw && parse(raw);
      return data ? { raw: raw, info: summarize(data, null) } : null;
    };
    if (m[1] === '1') {
      if (typeof DecompressionStream !== 'function') return Promise.resolve(null);
      return pipe(bytes, new DecompressionStream('gzip')).then(done, function () { return null; });
    }
    return Promise.resolve(done(bytes));
  };
  // Make a parsed code the main save (the current hero is kept in the ring). In a running game the page must reload afterwards,
  // so saving is switched off first: the old hero in memory must not overwrite what was just imported.
  meta.applyImport = function (raw) {
    const ls = store();
    if (!ls || !parse(raw)) return false;
    try {
      const cur = ls.getItem(KEY);
      if (cur && !parse(cur)) ls.setItem(KEY + '.unreadable', cur);
      else if (cur) pushRing(cur);
      ls.setItem(KEY, raw);
      guarded = true; meta._noSave = !!S.player;
      return true;
    } catch (err) { console.warn('[meta.import]', err); return false; }
  };

  // ---------- more frequent saves ----------
  G.on('player:levelup', function () { meta.save(); });
  G.on('item:picked', function (e) {
    const it = e && e.item, R = C.RARITY;
    if (it && R[it.rarity] && R.legendary && R[it.rarity].order >= R.legendary.order) meta.save();
  });
  let dungeonT = 0;
  G.ui._updaters.push(function (dt) {
    if (S.scene !== 'dungeon' || !S.player || S.player.dead || !(S.player.hp > 0)) { dungeonT = 0; return; }
    dungeonT += dt;
    if (dungeonT >= 60) { dungeonT = 0; meta.save(); }
  });

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
    try {
      const seed = ringSeed(ls.getItem(KEY));       // a deliberate delete also forgets that hero's backup (the others stay)
      ls.removeItem(KEY); ls.removeItem(KEY + '.prev');
      if (seed !== undefined) writeRing(readRing().filter(function (x) { return x.seed !== seed; }));
    } catch (err) { /* private mode */ }
  };

  meta._KEY = KEY;
  meta._VERSION = VERSION;
})();
