// Loot & Economy — R7.11 the Curator's Collection Book. Every look family (R5.9) and every named set is a page with one entry per
// slot (armour: helm / chest / gloves / boots; weapon lines: one entry per weapon type; a set: its five pieces; a unique's own
// family: that unique). Turning an item in registers it (the item is consumed). Completed pages give a permanent reward; 5 / 15 /
// all pages give larger ones. State lives in state.flags.collection (plain JSON, saved with the flags):
//   { pages: { pageId: { entryKey: { name, rarity, ilvl } } }, done: { pageId: true }, tiers: { '5': true }, titles: [..], stash: n }
// All wording, rewards and hints are data in D.COLLECTION below. Permanent buffs are added by I.getEquipmentMods (see info.js).
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  D.COLLECTION = {
    protect: true,                        // items that fill a missing page entry are never junk and never bulk-sold
    bookName: 'Collection Book',
    curatorName: 'the Curator',
    entryLabels: { helm: 'Helm', chest: 'Chest', gloves: 'Gloves', boots: 'Boots', sword: 'Sword', axe: 'Axe', mace: 'Mace', dagger: 'Dagger', bow: 'Bow',
      staff: 'Staff', wand: 'Wand', shield: 'Shield', orb: 'Orb', tome: 'Tome', greatsword: 'Greatsword', greataxe: 'Greataxe', maul: 'Maul' },
    // weapon-line pages: one entry per weapon type and off-hand type found on weapon looks
    weaponEntries: ['sword', 'greatsword', 'axe', 'greataxe', 'mace', 'maul', 'dagger', 'bow', 'staff', 'wand', 'shield', 'orb', 'tome'],
    // where a look band drops (band 0 = item level 1-19, 1 = 20-47, 2 = 48+): text for the book
    bandHint: ['Act I (depth 1-19)', 'Acts II-III (depth 20-47)', 'The endgame (depth 48+)'],
    setHint: 'Legendary Elite set drops, depth 12+',
    // one small permanent buff per completed page, picked from this list by the page's position; values suit any level
    buffs: [['hpMax', 15], ['dmgPct', 1], ['armor', 12], ['critChance', 0.5], ['magicFind', 2], ['goldFind', 3], ['xpGain', 1], ['resAll', 1],
      ['moveSpeed', 0.5], ['hpRegen', 1], ['critDmg', 3], ['mpMax', 12]],
    setBuffMult: 3,                       // set pages and unique-family pages pay this many times a normal page
    // IT-6: a page's buff is chosen by its id, never by its position in the build order (adding a look family would shift every page).
    // These 47 pages shipped with these slots; they are frozen. New pages hash their id into the list (append to `buffs`, never reorder).
    legacyBuff: { rusted_mail: 0, gravewarden: 1, tallow_iron: 2, ash_plate: 3, bellfounder: 4, chainpriest: 5, pallbearer: 6, cinder_king: 7, abyss_carapace: 8,
      grave_wrap: 9, ratcatcher: 10, mosshide: 11, hollowmoth: 0, cinderfox: 1, nightjar: 2, sallowskin: 3, wyrmscale: 4, veilrunner: 5, candlewick: 6, penitent: 7,
      ossuary: 8, ashen_choir: 9, starless: 10, rookmask: 11, pale_court: 0, voidweave: 1, emberhymn: 2, pitted_iron: 3, bonecarved: 4, hearthwood: 5, blackiron: 6,
      gravesilver: 7, emberforged: 8, pallid: 9, abyssal: 10, starfallen: 11, juggernaut: 0, shadowstep: 1, pale_king: 2, archmagi: 3, lich_emperor: 4, cinderlord: 5,
      rimewalkers: 6, ironbound: 7, nightstalker: 8, cinderweave: 9, gravecaller: 10 },
    pageTitle: function (page) { return 'Keeper of ' + page.name; },     // only set pages grant a title
    // 5 / 15 / all pages: materials, a bigger buff, a stash tab (stashRows extra rows the UI/meta adds), a title
    tiers: [
      { at: 5,   name: 'Apprentice Collector', mats: { shard: 10, dust: 40 }, buff: null, stash: 0 },
      { at: 15,  name: 'Collector', mats: { shard: 30, essence: 5 }, buff: [['resAll', 4], ['magicFind', 8]], stash: 1 },
      { at: 'all', name: 'Curator\'s Equal', mats: { essence: 20, gemdust: 500 }, buff: [['dmgPct', 8], ['hpMax', 150], ['xpGain', 5]], stash: 2 },
    ],
  };

  // ---- pages ----
  const pages = [];                // built once: { id, name, kind, band, entries: [{ key, label }], hint }
  const byId = {};
  const TIERS = ['heavy', 'light', 'cloth'];

  function build() {
    const CO = D.COLLECTION;
    const ids = Object.keys(I.LOOKS);
    ids.forEach(function (id) {
      const f = I.LOOKS[id];
      let entries, hint, by = 'slot';
      if (f.kind === 'set') {
        const set = D.SETS[id];
        if (!set) return;
        entries = set.pieces.map(function (u) { return { key: u, label: D.UNIQUES[u].name }; });
        hint = CO.setHint; by = 'unique';
      } else if (D.UNIQUE_LOOK && Object.keys(D.UNIQUE_LOOK).some(function (u) { return D.UNIQUE_LOOK[u] === id; })) {
        entries = Object.keys(D.UNIQUE_LOOK).filter(function (u) { return D.UNIQUE_LOOK[u] === id; }).map(function (u) { return { key: u, label: D.UNIQUES[u].name }; });
        hint = 'Unique drop, item level ' + D.UNIQUES[entries[0].key].min + '+'; by = 'unique';
      } else if (f.kind === 'weapon') {
        by = 'type';
        entries = CO.weaponEntries.map(function (k) { return { key: k, label: CO.entryLabels[k] || k }; });
        hint = CO.bandHint[Math.max(0, f.band)];
      } else if (TIERS.indexOf(f.kind) >= 0) {
        entries = D.LOOK_SLOTS.map(function (k) { return { key: k, label: CO.entryLabels[k] || k }; });
        hint = CO.bandHint[Math.max(0, f.band)];
      } else return;
      const pg = { id: id, name: f.name, kind: f.kind, band: f.band, entries: entries, hint: hint, index: pages.length, by: by };
      pages.push(pg);
      byId[id] = pg;
    });
  }
  build();
  D.COLLECTION_PAGES = pages;

  function st() {
    const f = G.state.flags || (G.state.flags = {});
    const c = f.collection || (f.collection = {});
    if (!c.pages) c.pages = {};
    if (!c.done) c.done = {};
    if (!c.tiers) c.tiers = {};
    if (!c.titles) c.titles = [];
    if (typeof c.stash !== 'number') c.stash = 0;
    return c;
  }

  // Which page / entry would this item fill? -> { page, key } or null
  function entryOf(item) {
    if (!item || !D.isEquip(item)) return null;
    const fam = item.look && item.look.family;
    if (!fam || !byId[fam]) return null;
    const pg = byId[fam];
    let key;
    if (pg.by === 'unique') key = item.uniqueId;
    else if (pg.by === 'type') key = item.weaponType || (item.slot === 'offhand' ? (D.BASES[item.baseId] || {}).offhandType : null);
    else key = item.slot;
    if (!key || !pg.entries.some(function (e) { return e.key === key; })) return null;
    return { page: pg, key: key };
  }

  const coll = I.collection = {};

  coll.entryOf = function (item) { const e = entryOf(item); return e ? { page: e.page.id, key: e.key } : null; };

  // True while the item would fill a missing slot of the book (UI: book mark; never junk).
  coll.isWanted = function (item) {
    const e = entryOf(item);
    return !!e && !(st().pages[e.page.id] && st().pages[e.page.id][e.key]);
  };
  D.isWanted = coll.isWanted;

  function pageDone(pg) {
    const have = st().pages[pg.id] || {};
    return pg.entries.every(function (e) { return have[e.key]; });
  }

  coll.getPages = function () {
    const c = st();
    return pages.map(function (pg) {
      const have = c.pages[pg.id] || {};
      const n = pg.entries.filter(function (e) { return have[e.key]; }).length;
      return { id: pg.id, name: pg.name, kind: pg.kind, hint: pg.hint, count: n, total: pg.entries.length, done: !!c.done[pg.id],
        reward: coll.pageReward(pg.id), entries: pg.entries.map(function (e) {
          const h = have[e.key];
          return { key: e.key, label: e.label, have: !!h, item: h ? { name: h.name, rarity: h.rarity, ilvl: h.ilvl } : null };
        }) };
    });
  };

  coll.getProgress = function () {
    const c = st();
    const done = pages.filter(function (pg) { return c.done[pg.id]; }).length;
    return { pages: done, total: pages.length, tiers: D.COLLECTION.tiers.map(function (t) {
      const need = t.at === 'all' ? pages.length : t.at;
      return { at: t.at, need: need, name: t.name, claimed: !!c.tiers[String(t.at)], mats: t.mats, buff: t.buff, stash: t.stash };
    }), titles: c.titles.slice(), stash: c.stash };
  };

  // The reward a page pays: { buff: [[stat, value]], title }
  coll.pageReward = function (id) {
    const pg = byId[id];
    if (!pg) return null;
    const CO = D.COLLECTION;
    let bi = CO.legacyBuff[id];
    if (bi === undefined) { bi = 2166136261; for (let i = 0; i < id.length; i++) bi = Math.imul(bi ^ id.charCodeAt(i), 16777619); bi = (bi >>> 0) % CO.buffs.length; }
    const b = CO.buffs[bi];
    const big = pg.by === 'unique';
    const out = { buff: [[b[0], Math.round(b[1] * (big ? CO.setBuffMult : 1) * 100) / 100]] };
    if (pg.kind === 'set') out.title = CO.pageTitle(pg);
    return out;
  };

  // Permanent stat bonuses from every completed page and claimed tier -> { stat: value }
  coll.getMods = function () {
    const c = st(), out = {};
    function add(list) { for (const s of list || []) out[s[0]] = (out[s[0]] || 0) + s[1]; }
    for (const id in c.done) if (c.done[id]) add((coll.pageReward(id) || {}).buff);
    D.COLLECTION.tiers.forEach(function (t) { if (c.tiers[String(t.at)]) add(t.buff); });
    return out;
  };

  function toast(text, color) { G.emit('ui:toast', { text: text, color: color || '#7fd4c8' }); }

  function checkTiers(p, res) {
    const c = st();
    const done = pages.filter(function (pg) { return c.done[pg.id]; }).length;
    D.COLLECTION.tiers.forEach(function (t) {
      const need = t.at === 'all' ? pages.length : t.at;
      if (c.tiers[String(t.at)] || done < need) return;
      c.tiers[String(t.at)] = true;
      if (t.name) c.titles.push(t.name);
      for (const k in t.mats || {}) p.materials[k] = (p.materials[k] || 0) + t.mats[k];
      if (t.stash) c.stash += t.stash;
      res.tiers.push(t.at);
      toast('Collection milestone: ' + t.name, '#ffe45b');
      G.emit('collection:tier', { at: t.at, name: t.name, mats: t.mats, stash: t.stash, buff: t.buff });
    });
  }

  function registerItem(p, item) {
    const res = { ok: false, page: null, entry: null, completed: false, tiers: [] };
    const e = entryOf(item);
    if (!e) return res;
    const c = st();
    const have = c.pages[e.page.id] || (c.pages[e.page.id] = {});
    if (have[e.key]) return res;
    have[e.key] = { name: item.name, rarity: item.rarity, ilvl: item.ilvl };
    res.ok = true; res.page = e.page.id; res.entry = e.key;
    G.emit('collection:registered', { page: e.page.id, entry: e.key, item: item });
    if (pageDone(e.page) && !c.done[e.page.id]) {
      c.done[e.page.id] = true;
      res.completed = true;
      const r = coll.pageReward(e.page.id);
      if (r.title) c.titles.push(r.title);
      toast(e.page.name + ' complete: ' + r.buff.map(function (b) { return I.formatStat(b[0], b[1]); }).join(', ') + (r.title ? ' — ' + r.title : ''), '#ffe45b');
      G.emit('sfx', { name: 'quest' });
      G.emit('collection:page', { page: e.page.id, reward: r });
      checkTiers(p, res);
      if (G.game && G.game.recomputeStats) { try { G.game.recomputeStats(p); } catch (err) { console.error('[items] recomputeStats', err); } }
    }
    return res;
  }

  // Turn a bag item in (the item is consumed). source 'stash' reads the stash instead of the bag. -> { ok, page, entry, completed, tiers }
  // Turn a bag item in (the item is consumed). source 'stash' reads the stash instead of the bag; source 'item' means `index` is the
  // item itself (the caller removes it, as the surface crate does). Town only (R8.1). -> { ok, page, entry, completed, tiers }
  coll.register = function (index, source) {
    const p = D.ensure(G.state.player);
    if (!D.inTown('Registering with the Curator')) return { ok: false };
    const list = source === 'stash' ? G.state.stash : p && p.inventory;
    const item = source === 'item' ? index : list && list[index];
    if (!item) return { ok: false };
    const res = registerItem(p, item);
    if (!res.ok) { D.fail(entryOf(item) ? 'Already in the Collection Book' : 'The Curator does not want that'); return res; }
    if (source !== 'item') list[index] = null;
    G.emit('inventory:changed', {});
    return res;
  };

  // Registers every wanted bag item that is not locked. -> number of items turned in
  coll.registerAll = function (quiet) {
    if (G.state.scene !== 'town') return 0;
    const p = D.ensure(G.state.player);
    let n = 0;
    for (let i = 0; i < p.inventory.length; i++) {
      const it = p.inventory[i];
      if (!it || it.locked || !coll.isWanted(it)) continue;
      if (registerItem(p, it).ok) { p.inventory[i] = null; n++; }
    }
    if (n) { if (!quiet) toast('The Curator took ' + n + ' piece' + (n > 1 ? 's' : ''), '#7fd4c8'); G.emit('inventory:changed', {}); }
    return n;
  };

  coll.isAuto = function () { return !!(G.state.settings && G.state.settings.autoCollect); };
  coll.setAuto = function (on) { (G.state.settings || (G.state.settings = {})).autoCollect = !!on; };

  D.PERM_MODS.push(function () { return coll.getMods(); });
  G.on('scene:changed', function (e) { if (e && e.scene === 'town' && coll.isAuto()) coll.registerAll(); });
})();
