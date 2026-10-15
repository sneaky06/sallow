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
        player: S.player, flags: S.flags, quests: S.quests, stash: S.stash, surface: S.surface || [], settings: S.settings,
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
  // Codes (all plain text, base64url after the tag):
  //   SLW2  deflate-raw of the packed save          (CompressionStream; the usual one)
  //   SLW3  our own LZ of the packed save           (phones without CompressionStream)
  //   SLW0 / SLW1  the older codes (base64 of the raw JSON / of its gzip): still imported
  // "Packed" = the save without what the game rebuilds on load (derived stats, cooldowns, effects, animation state) and with every
  // repeated sub-object (icons, looks, palettes ...) stored once in a table. A "lite" code also leaves out the stash and the surface
  // crate (importing it keeps the ones already on this device).
  function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function b64u(bytes) { return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(t) { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const s = atob(t); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function pipe(bytes, stream) {
    const rs = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return rs.arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  const hasStreams = function () { return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Response === 'function' && !meta._noStreams; };

  // --- our own LZSS (window 64K, matches 3..258): flag byte then 8 tokens; literal = 1 byte, match = offset (2 bytes) + length-3 (1 byte)
  function lzPack(src) {
    const out = [], n = src.length, head = new Int32Array(1 << 16).fill(-1), prev = new Int32Array(n);
    const hash = function (i) { return ((src[i] << 8) ^ (src[i + 1] << 4) ^ src[i + 2]) & 0xffff; };
    let i = 0, flagPos = -1, flag = 0, bit = 0;
    const startGroup = function () { flagPos = out.length; out.push(0); flag = 0; bit = 0; };
    const endBit = function () { bit++; if (bit === 8) { out[flagPos] = flag; startGroup(); } };
    startGroup();
    while (i < n) {
      let bestLen = 0, bestOff = 0;
      if (i + 2 < n) {
        let c = head[hash(i)], tries = 24;
        while (c >= 0 && i - c <= 65535 && tries-- > 0) {
          let l = 0; const max = Math.min(258, n - i);
          while (l < max && src[c + l] === src[i + l]) l++;
          if (l > bestLen) { bestLen = l; bestOff = i - c; if (l === max) break; }
          c = prev[c];
        }
      }
      const adv = bestLen >= 3 ? bestLen : 1;
      if (bestLen >= 3) { out.push(bestOff & 255, bestOff >> 8, bestLen - 3); } else { flag |= (1 << bit); out.push(src[i]); }
      for (let k = 0; k < adv; k++) { if (i + k + 2 < n) { const hh = hash(i + k); prev[i + k] = head[hh]; head[hh] = i + k; } }
      i += adv; endBit();
    }
    out[flagPos] = flag;
    return Uint8Array.from(out);
  }
  function lzUnpack(b) {
    const out = [];
    let i = 0;
    while (i < b.length) {
      const flag = b[i++];
      for (let bit = 0; bit < 8 && i < b.length; bit++) {
        if (flag & (1 << bit)) out.push(b[i++]);
        else { const off = b[i] | (b[i + 1] << 8), len = b[i + 2] + 3; i += 3; const s = out.length - off; if (s < 0) throw new Error('bad lz'); for (let k = 0; k < len; k++) out.push(out[s + k]); }
      }
    }
    return Uint8Array.from(out);
  }

  // --- packing: drop rebuilt state, share repeated sub-objects through a table of "\u0001<n>" references
  const DROP_PLAYER = ['stats', 'cooldowns', 'effects', 'anim', 'animT', 'hitFlash'];
  function packTree(data, lite) {
    const d = JSON.parse(JSON.stringify(data));
    if (d.player) DROP_PLAYER.forEach(function (k) { delete d.player[k]; });
    if (lite) { delete d.stash; delete d.surface; d.lite = true; }
    const seen = new Map(), table = [], idx = new Map();
    const count = function (n) {
      if (!n || typeof n !== 'object') return;
      if (!Array.isArray(n)) { const s = JSON.stringify(n); if (s.length >= 24) seen.set(s, (seen.get(s) || 0) + 1); }
      for (const k in n) count(n[k]);
    };
    count(d);
    const walk = function (n) {
      if (!n || typeof n !== 'object') return n;
      if (!Array.isArray(n)) {
        const s = JSON.stringify(n);
        if (s.length >= 24 && seen.get(s) >= 3) { if (!idx.has(s)) { idx.set(s, table.length); table.push(null); table[idx.get(s)] = JSON.parse(s); } return '\u0001' + idx.get(s); }
      }
      for (const k in n) n[k] = walk(n[k]);
      return n;
    };
    // walk children first so a shared parent still refers to shared children
    d.$d = table;
    for (const k in d) if (k !== '$d') d[k] = walk(d[k]);
    for (let i = 0; i < table.length; i++) for (const k in table[i]) table[i][k] = walk(table[i][k]);
    return d;
  }
  function unpackTree(d) {
    const table = Array.isArray(d.$d) ? d.$d : [];
    delete d.$d;
    const seenRef = new Set();
    const walk = function (n) {
      if (typeof n === 'string') {
        if (n.charCodeAt(0) === 1 && /^\u0001\d+$/.test(n)) { const t = table[+n.slice(1)]; return t == null ? n : walk(JSON.parse(JSON.stringify(t))); }
        return n;
      }
      if (!n || typeof n !== 'object') return n;
      for (const k in n) n[k] = walk(n[k]);
      return n;
    };
    void seenRef;
    return walk(d);
  }

  // -> Promise<string|null>. opts.lite: leave out the stash and the surface crate.
  meta.exportCode = function (opts) {
    if (S.player) meta.save();
    const ls = store();
    let raw = null;
    try { raw = ls && ls.getItem(KEY); } catch (err) { raw = null; }
    const data = raw && parse(raw);
    if (!data) return Promise.resolve(null);
    let json;
    try { json = JSON.stringify(packTree(data, !!(opts && opts.lite))); } catch (err) { console.error('[meta.exportCode]', err); return Promise.resolve(null); }
    const bytes = new TextEncoder().encode(json);
    if (hasStreams()) {
      return pipe(bytes, new CompressionStream('deflate-raw')).then(function (z) { return 'SLW2:' + b64u(z); }, function () { return 'SLW3:' + b64u(lzPack(bytes)); });
    }
    return Promise.resolve('SLW3:' + b64u(lzPack(bytes)));
  };
  // text -> Promise<{ raw, info, lite }|null>. Tolerates whitespace and surrounding quotes from copy / paste.
  meta.parseCode = function (text) {
    const t = String(text || '').replace(/[\s"'`]+/g, '');
    const m = /^SLW([0-3]):([A-Za-z0-9+/_=-]+)$/.exec(t);
    if (!m) return Promise.resolve(null);
    let bytes;
    try { bytes = unb64(m[2]); } catch (err) { return Promise.resolve(null); }
    const done = function (b) {
      let json = null, data = null;
      try { json = new TextDecoder().decode(b); data = JSON.parse(json); if (data && data.$d) data = unpackTree(data); } catch (err) { return null; }
      const raw = JSON.stringify(data);
      const ok = data && parse(raw);
      return ok ? { raw: raw, info: summarize(ok, null), lite: !!data.lite } : null;
    };
    const kind = m[1];
    if (kind === '0') return Promise.resolve(done(bytes));
    if (kind === '3') { try { return Promise.resolve(done(lzUnpack(bytes))); } catch (err) { return Promise.resolve(null); } }
    if (!hasStreams()) return Promise.resolve(null);
    return pipe(bytes, new DecompressionStream(kind === '2' ? 'deflate-raw' : 'gzip')).then(done, function () { return null; });
  };
  meta._lz = { pack: lzPack, unpack: lzUnpack };
  // Make a parsed code the main save (the current hero is kept in the ring). In a running game the page must reload afterwards,
  // so saving is switched off first: the old hero in memory must not overwrite what was just imported.
  meta.applyImport = function (raw) {
    const ls = store();
    if (!ls || !parse(raw)) return false;
    try {
      const cur = ls.getItem(KEY);
      if (cur && !parse(cur)) ls.setItem(KEY + '.unreadable', cur);
      else if (cur) pushRing(cur);
      // a "lite" code carries no stash and no crate: keep the ones already here when it is the same hero, else start empty
      let dd = null;
      try { dd = JSON.parse(raw); } catch (err) { dd = null; }
      if (dd && dd.lite) {
        const was = cur ? parse(cur) : null;
        const same = was && was.seed === dd.seed;
        dd.stash = same ? was.stash : []; dd.surface = same ? (was.surface || []) : [];
        delete dd.lite;
        raw = JSON.stringify(dd);
      }
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
    S.surface = Array.isArray(data.surface) ? data.surface.filter(function (it) { return it && typeof it === 'object'; }) : [];      // R8.1 items sent up the chute
    if (G.items && G.items.migrateState) { try { G.items.migrateState(); } catch (err) { console.error('[meta migrateState]', err); } }     // R7.1: old rarity keys
    S.seed = (data.seed >>> 0) || 1;
    S.time = +data.time || 0;
    if (data.settings && typeof data.settings === 'object') {
      for (const k in data.settings) S.settings[k] = data.settings[k];
      delete S.settings.junkRarity;      // replaced by settings.junk (R3.1)
    }
    S.quests = (data.quests && typeof data.quests === 'object') ? data.quests : {};
    if (meta._repairQuests) meta._repairQuests();

    if (G.bumpId) G.bumpId(Math.max(maxId(p, 0), maxId(S.stash, 0), maxId(S.surface, 0), maxId(flags.corpse, 0)));
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

  // R8.1: a new hero starts with an empty surface crate (core's startNewGame knows nothing about it)
  if (G.scenes && typeof G.scenes.startNewGame === 'function') {
    const newGame = G.scenes.startNewGame;
    G.scenes.startNewGame = function () { S.surface = []; return newGame.apply(this, arguments); };
  }

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
