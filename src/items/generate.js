// Loot & Economy — item generation: rarity roll, base + affix rolling, uniques/sets, loot tables, ground drops.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  const ORDER = ['common', 'magic', 'rare', 'epic', 'set', 'legendary', 'mythic'];   // display order; C.RARITY[..].order is the authority
  const HAND_AUTHORED = { legendary: 1, set: 1, mythic: 1 };
  const TOP_DOWN = ['mythic', 'set', 'legendary', 'epic', 'rare'];
  // Per-item odds at 0 magic find (contract targets).
  // R4.2: Legendary Elite halved to 0.125% and purely chance-based — no pity timer, quota or per-floor guarantee anywhere.
  const BASE_P = { common: 0.55093, magic: 0.33, rare: 0.10, epic: 0.017, legendary: 0.00125, set: 0.0008, mythic: 0.00002 };
  // Diminishing returns: effective MF = mf * K / (mf + K). Smaller K = flattens sooner.
  const MF_K = { magic: 400, rare: 250, epic: 300, legendary: 350, set: 350, mythic: 250 };
  D.RARITY_ORDER = ORDER;
  D.BASE_P = BASE_P;

  function rord(r) { return (C.RARITY[r] || C.RARITY.common).order; }
  function effMF(mf, k) { return mf * k / (mf + k); }
  function player() { return G.state.player; }

  // Probability of each rarity for one item. `boost` is the source multiplier on rare+ odds (elites, bosses, chests).
  // `eliteBoost` multiplies the Legendary Elite odds only (legendary-tier monsters, R3.6).
  // `pallorBoost` (R5.2) multiplies rare and epic odds only: Pallor never touches Legendary Elite, Mythic or set odds.
  I.rarityChances = function (magicFind, boost, eliteBoost, pallorBoost) {
    const mf = Math.max(0, magicFind || 0);
    boost = boost || 1;
    const p = {};
    let top = 0;
    for (const r of TOP_DOWN) {
      // mythics ignore the source boost: a boss is ~8 ordinary chances, nothing more (R2.2: <= ~0.03% per boss kill)
      p[r] = BASE_P[r] * (1 + effMF(mf, MF_K[r]) / 100) * (r === 'mythic' ? 1 : boost);
      if (r === 'legendary' && eliteBoost) p[r] *= eliteBoost;
      if ((r === 'rare' || r === 'epic') && pallorBoost) p[r] *= pallorBoost;
      top += p[r];
    }
    if (top > 0.9) { for (const r of TOP_DOWN) p[r] *= 0.9 / top; top = 0.9; }
    const rest = 1 - top;
    const odds = (BASE_P.magic / BASE_P.common) * (1 + effMF(mf, MF_K.magic) / 100) * boost;
    p.magic = rest * odds / (1 + odds);
    p.common = rest - p.magic;
    return p;
  };

  function rollRarity(mf, boost, rng, floor, elite, pallorBoost) {
    const p = I.rarityChances(mf, boost, elite, pallorBoost);
    let u = rng.next();
    let r = 'common';
    for (let i = ORDER.length - 1; i > 0; i--) {
      u -= p[ORDER[i]];
      if (u < 0) { r = ORDER[i]; break; }
    }
    if (floor && rord(r) < rord(floor)) r = floor;
    return r;
  }

  // ---- bases ----
  const SLOT_W = [
    { slot: 'weapon', w: 20 }, { slot: 'offhand', w: 8 }, { slot: 'helm', w: 10 }, { slot: 'chest', w: 10 }, { slot: 'gloves', w: 10 },
    { slot: 'boots', w: 10 }, { slot: 'belt', w: 9 }, { slot: 'amulet', w: 6 }, { slot: 'ring', w: 10 },
  ];
  const SLOT_W_NOJEWEL = SLOT_W.filter(function (s) { return s.slot !== 'ring' && s.slot !== 'amulet'; });
  const FAMILIES_BY_SLOT = {};
  D.FAMILY_LIST.forEach(function (f) {
    const s = D.FAMILIES[f][0].slot;
    (FAMILIES_BY_SLOT[s] || (FAMILIES_BY_SLOT[s] = [])).push(f);
  });

  function normSlot(slot) {
    if (slot === 'ring1' || slot === 'ring2') return 'ring';
    return FAMILIES_BY_SLOT[slot] ? slot : null;
  }

  function classBias(def, prof) {
    if (!prof) return 1;
    if (def.weaponType) return prof.weapons.indexOf(def.weaponType) >= 0 ? 3 : 1;
    if (def.armorClass) return def.armorClass === prof.armor ? 2.5 : 1;
    if (def.offhandType) return prof.offhand.indexOf(def.offhandType) >= 0 ? 3 : 1;
    return 1;
  }

  // -> { def, lvl }: usually the best tier the item level allows, sometimes the one below (a slightly weaker item).
  function pickTier(fam, ilvl, rng, best) {
    const list = D.FAMILIES[fam];
    let top = 0;
    while (top + 1 < list.length && list[top + 1].ilvl <= ilvl) top++;
    if (!best && top > 0 && rng.chance(0.3)) return { def: list[top - 1], lvl: Math.min(ilvl, list[top].ilvl - 1) };
    return { def: list[top], lvl: ilvl };
  }

  function pickBase(slot, ilvl, rng, prof, family) {
    if (family && D.FAMILIES[family]) return pickTier(family, ilvl, rng);
    const fams = FAMILIES_BY_SLOT[slot];
    const entries = [];
    for (const f of fams) {
      const def = D.FAMILIES[f][0];
      entries.push({ f: f, w: def.w * classBias(def, prof) });
    }
    return pickTier(rng.weighted(entries).f, ilvl, rng);
  }

  // Characters level slower than they descend (about level 33 at depth 40 with src/game's XP curve), so gear found at depth N
  // must be wearable around level 0.75 N.
  function reqLevel(ilvl) { return Math.max(1, Math.min(60, Math.round(ilvl * 0.75))); }

  function newItem(def, ilvl, rarity, rng) {
    const it = { id: G.newId(), baseId: def.id, name: def.name, type: def.type, slot: def.slot };
    if (def.weaponType) it.weaponType = def.weaponType;
    if (def.twoHanded) it.twoHanded = true;
    if (def.armorClass) it.armorClass = def.armorClass;     // 'heavy' | 'light' | 'cloth' — the engine's gear rig reads it
    it.rarity = rarity;
    it.ilvl = ilvl;
    it.reqLevel = reqLevel(ilvl);
    it.icon = { shape: def.icon.shape, color: def.icon.color, accent: def.icon.accent };
    const look = D.rollLook(def, rng);       // R5.9 appearance family
    if (look) it.look = look;
    it.base = D.baseStats(def, ilvl);
    it.mods = D.implicitMods(def, ilvl);
    it.value = 1;
    return it;
  }

  // ---- affixes ----
  function affixValue(a, item, q) {
    const l = item.ilvl;
    const lo = D.lerp60(a.range[0], a.range[2], l), hi = D.lerp60(a.range[1], a.range[3], l);
    let v = D.scaleBeyond(a.grp, lo + (hi - lo) * q, l);
    if (item.twoHanded && !a.fixed) v *= 1.4;
    return v;
  }

  function addAffix(item, a, q) {
    const v = affixValue(a, item, q);
    const step = a.step || 1;
    for (const s of a.stats) {
      let x = Math.round(v * s[1] / step) * step;
      if (x < step) x = step;
      item.mods.push({ stat: s[0], value: x });
    }
  }

  // Rolls n affixes (at most `cap` prefixes and `cap` suffixes, never two on the same stat).
  // quality(u) maps a uniform roll to the position inside the affix range. Returns the first prefix/suffix for naming.
  let curDead = null;      // { stat: true } for the class the loot is rolled for
  function rollAffixes(item, n, cap, rng, quality, used) {
    const pool = D.affixesFor(item);
    const count = { prefix: 0, suffix: 0 };
    const first = { prefix: null, suffix: null };
    used = used || {};
    for (let i = 0; i < n; i++) {
      const cands = [];
      for (const a of pool) {
        if (a.min > item.ilvl || count[a.kind] >= cap) continue;
        let clash = false;
        for (const s of a.stats) if (used[s[0]]) { clash = true; break; }
        // stats the current class cannot use still exist, but rarely: no roll should be a trap (R3.9)
        if (!clash) cands.push({ a: a, w: curDead && curDead[a.grp] ? a.w * 0.2 : a.w });
      }
      if (!cands.length) break;
      const a = rng.weighted(cands).a;
      addAffix(item, a, quality(rng.next()));
      for (const s of a.stats) used[s[0]] = true;
      count[a.kind]++;
      if (!first[a.kind]) first[a.kind] = a;
    }
    return first;
  }

  function rollSockets(item, rng) {
    const max = D.SOCKET_MAX(item);
    const s = item.slot;
    const p = (s === 'weapon' || s === 'chest' || s === 'helm' || s === 'offhand') ? 0.2 : 0.05;
    if (!max || !rng.chance(p)) return;
    item.sockets = (max > 1 && rng.chance(0.3)) ? [null, null] : [null];
  }

  const RARITY_VALUE = { common: 1, magic: 2.5, rare: 6, epic: 14, legendary: 40, set: 45, mythic: 150 };
  const SLOT_VALUE = { weapon: 1.4, chest: 1.2, offhand: 1.0, helm: 1.0, gloves: 0.9, boots: 0.9, belt: 0.8, amulet: 1.3, ring: 1.2 };
  // Gold sell price of a piece of equipment.
  D.itemValue = function (item) {
    const l = item.ilvl;
    let v = (1 + l * 0.5 + l * l * 0.012) * (RARITY_VALUE[item.rarity] || 1) * (SLOT_VALUE[item.slot] || 1);
    if (item.twoHanded) v *= 1.2;
    v *= 1 + 0.06 * item.mods.length + 0.15 * (item.sockets ? item.sockets.length : 0);
    v *= Math.pow(1.15, item.plus || 0);
    return Math.max(1, Math.round(v));
  };

  const QUALITY = {
    magic: function (u) { return u; },
    rare: function (u) { return u; },
    epic: function (u) { return 0.5 + 0.5 * u; },
    legendary: function (u) { return 0.4 + 0.6 * u; },
    set: function (u) { return 0.4 + 0.6 * u; },
    mythic: function (u) { return 0.7 + 0.3 * u; },
  };

  D.rollAffixes = rollAffixes;
  D.QUALITY = QUALITY;

  function buildEquip(def, ilvl, rarity, rng) {
    const item = newItem(def, ilvl, rarity, rng);
    const tier = ilvl < 20 ? 0 : ilvl < 45 ? 1 : 2;
    if (rarity === 'magic') {
      const first = rollAffixes(item, rng.chance(0.5) ? 2 : 1, 1, rng, QUALITY.magic);
      item.name = (first.prefix ? first.prefix.names[tier] + ' ' : '') + def.name + (first.suffix ? ' ' + first.suffix.names[tier] : '');
    } else if (rarity === 'rare') {
      rollAffixes(item, rng.int(3, 4), 2, rng, QUALITY.rare);
      item.name = D.rareName(item, rng);
    } else if (rarity === 'epic') {
      rollAffixes(item, rng.int(4, 5), 3, rng, QUALITY.epic);
      item.name = D.rareName(item, rng);
    }
    rollSockets(item, rng);
    item.value = D.itemValue(item);
    return item;
  }

  // ---- uniques / sets ----
  function pickUnique(rarity, ilvl, slot, family, anyLevel, rng, prof) {
    const cands = [];
    for (const u of D.UNIQUE_LIST) {
      if (u.rarity !== rarity) continue;
      if (!anyLevel && u.min > ilvl) continue;
      if (family && u.family !== family) continue;
      if (slot && D.FAMILIES[u.family][0].slot !== slot) continue;
      cands.push({ u: u, w: (prof && u.cls && u.cls === prof.id) ? 2.5 : 1 });
    }
    return cands.length ? rng.weighted(cands).u : null;
  }

  function buildUnique(u, ilvl, rng) {
    const def = pickTier(u.family, ilvl, rng, true).def;
    const item = newItem(def, ilvl, u.rarity, rng);
    const look = D.uniqueLook(u, def);
    if (look) item.look = look;
    item.name = u.name;
    item.uniqueId = u.id;
    if (u.setId) item.setId = u.setId;
    if (u.flavor) item.flavor = u.flavor;
    if (u.effect) item.effects = [u.effect];
    if (u.color) { item.icon.color = u.color; item.icon.accent = u.accent || item.icon.accent; }
    const used = {};
    const q = QUALITY[u.rarity] || QUALITY.legendary;
    for (const m of u.mods) {
      const stat = m[0];
      let v = m[1] + (m[2] - m[1]) * rng.next();
      if (D.FLAT[stat]) v *= D.flatScale(ilvl);
      const step = stat === 'pickupRadius' ? 0.5 : 1;
      v = Math.max(step, Math.round(v / step) * step);
      item.mods.push({ stat: stat, value: v });
      used[stat] = true;
    }
    const extra = u.rand != null ? u.rand : (rng.chance(0.4) ? 2 : 1);
    rollAffixes(item, extra, 2, rng, q, used);
    if (u.sockets) item.sockets = new Array(Math.min(u.sockets, D.SOCKET_MAX(item))).fill(null);
    else rollSockets(item, rng);
    item.value = D.itemValue(item);
    return item;
  }

  // ---- gems, consumables, materials ----
  const GEM_RARITY = ['common', 'magic', 'magic', 'rare', 'epic'];
  function makeMisc(baseId, ilvl, qty) {
    qty = Math.max(1, qty || 1);
    const g = D.GEMS[baseId];
    if (g && g.family === 'blood') {
      const k = D.BLOOD_KINDS[g.kind];
      return { id: G.newId(), baseId: baseId, name: (D.BLOOD_TIERS[g.tier] + ' ' + k.name).trim(), type: 'gem', slot: null,
        rarity: D.BLOOD_RARITY[g.tier], ilvl: D.BLOOD_ILVL[g.tier], reqLevel: 1, icon: { shape: 'gem', color: k.color, accent: '#ff3b4e' },
        base: {}, mods: [], value: D.BLOOD_VALUE[g.tier], qty: qty, permanent: true };
    }
    if (g) {
      const k = D.GEM_KINDS[g.kind];
      return { id: G.newId(), baseId: baseId, name: (D.GEM_TIERS[g.tier] + ' ' + k.name).trim(), type: 'gem', slot: null,
        rarity: GEM_RARITY[g.tier], ilvl: D.GEM_ILVL[g.tier], reqLevel: 1, icon: { shape: 'gem', color: k.color, accent: '#ffffff' },
        base: {}, mods: [], value: D.GEM_VALUE[g.tier], qty: qty };
    }
    const c = D.CONSUMABLES[baseId];
    if (c) {
      return { id: G.newId(), baseId: baseId, name: c.name, type: 'consumable', slot: null, rarity: c.rarity || 'common', ilvl: ilvl, reqLevel: 1,
        icon: { shape: c.icon.shape, color: c.icon.color, accent: c.icon.accent }, base: {}, mods: [], value: c.value(ilvl), qty: qty };
    }
    const m = D.MATERIALS[baseId];
    if (m) {
      return { id: G.newId(), baseId: baseId, name: m.name, type: 'material', slot: null, rarity: m.rarity, ilvl: 1, reqLevel: 1,
        icon: { shape: m.icon.shape, color: m.icon.color, accent: m.icon.accent }, base: {}, mods: [], value: m.value, qty: qty };
    }
    return null;
  }
  D.makeMisc = makeMisc;

  // `cutOnly` (vendors) never yields a bloodstone; otherwise about 1 gem drop in 12 is one, from item level 15.
  function rollGem(level, rng, cutOnly) {
    if (!cutOnly && level >= D.BLOOD_ILVL[0] && rng.chance(0.08)) {
      let b = 0;
      while (b + 1 < D.BLOOD_ILVL.length && D.BLOOD_ILVL[b + 1] <= level) b++;
      if (b > 0 && rng.chance(0.6)) b--;
      return makeMisc('blood_' + rng.pick(Object.keys(D.BLOOD_KINDS)) + '_' + (b + 1), level, 1);
    }
    let t = 0;
    while (t + 1 < D.GEM_ILVL.length && D.GEM_ILVL[t + 1] <= level) t++;
    if (t > 0 && rng.chance(0.55)) t--;
    if (t > 0 && rng.chance(0.3)) t--;
    return makeMisc('gem_' + rng.pick(Object.keys(D.GEM_KINDS)) + '_' + (t + 1), level, 1);
  }
  D.rollGem = rollGem;

  D.setRollClass = function (prof) {
    curDead = null;
    if (prof && prof.dead) { curDead = {}; for (const s of prof.dead) curDead[s] = true; }
  };

  // ---- public: rollItem ----
  // Extra (optional, non-contract) opts: uniqueId — force a specific elite/mythic/set piece; qty — for stackable baseIds.
  I.rollItem = function (opts) {
    opts = opts || {};
    const rng = opts.rng || G.rng.global;
    const ilvl = Math.max(1, Math.round(opts.level || 1));

    if (opts.baseId === 'lore') return D.makeLore(Math.max(0, opts.loreIndex | 0));
    if (opts.baseId && !D.BASES[opts.baseId]) {
      const misc = makeMisc(opts.baseId, ilvl, opts.qty);
      if (misc) return misc;
    }
    if (opts.uniqueId && D.UNIQUES[opts.uniqueId]) return buildUnique(D.UNIQUES[opts.uniqueId], ilvl, rng);

    const prof = player() ? D.classProfile(player()) : null;
    D.setRollClass(prof);
    const explicit = !!(opts.rarity && C.RARITY[opts.rarity]);
    let rarity = explicit ? opts.rarity : rollRarity(opts.magicFind || 0, opts._boost || 1, rng, opts._floor, opts._elite, opts._pallor);
    const fixed = opts.baseId ? D.BASES[opts.baseId] : null;
    let slot = fixed ? fixed.slot : normSlot(opts.slot);
    const family = fixed ? fixed.family : opts._family;

    // Elite (key 'legendary') / set / mythic are hand-authored; fall back a step if nothing fits this slot or level.
    while (HAND_AUTHORED[rarity]) {
      const u = pickUnique(rarity, ilvl, slot, family, explicit, rng, prof);
      if (u) return buildUnique(u, ilvl, rng);
      rarity = rarity === 'mythic' ? 'legendary' : 'epic';
    }

    if (!slot && !family) {
      // plain jewellery has no stats, so white drops are never rings/amulets
      slot = rng.weighted(rarity === 'common' ? SLOT_W_NOJEWEL : SLOT_W).slot;
    }
    const pick = fixed ? { def: fixed, lvl: ilvl } : pickBase(slot, ilvl, rng, prof, family);
    if (rarity === 'common' && pick.def.type === 'jewelry') rarity = 'magic';
    return buildEquip(pick.def, pick.lvl, rarity, rng);
  };

  // ---- loot tables ----
  // n: item count weights; floors: rarity floor for the first items (rest for the remainder); boost: rare+ odds multiplier.
  const SOURCES = {
    monster:  { n: [[0, 66], [1, 30], [2, 4]], goldP: 0.45, goldM: 1, potP: 0.07, gemP: 0.008, miscP: 0.004, matP: 0.01, boost: 1, floors: [] },
    champion: { n: [[1, 25], [2, 50], [3, 25]], goldP: 1, goldM: 3, potP: 0.3, gemP: 0.06, miscP: 0.03, matP: 0.12, boost: 1.6, floors: ['magic'] },
    rare:     { n: [[3, 40], [4, 40], [5, 20]], goldP: 1, goldM: 6, potP: 0.5, gemP: 0.15, miscP: 0.06, matP: 0.3, loreP: 0.04, boost: 2.5, floors: ['rare', 'magic'] },
    boss:     { n: [[7, 25], [8, 35], [9, 25], [10, 15]], goldP: 1, goldM: 20, pots: [2, 3], gems: 1, gemP: 0.4, miscP: 0.5, matP: 1, loreP: 0.3, boost: 4,
      floors: ['rare', 'rare'], rest: 'magic', lvl: 2 },
    // legendary-tier monsters (R3.6): a small boss, with three times the usual Legendary Elite odds on top of the boost
    legendary: { n: [[5, 35], [6, 40], [7, 25]], goldP: 1, goldM: 12, pots: [1, 2], gems: 0, gemP: 0.5, miscP: 0.25, matP: 0.6, loreP: 0.15, boost: 3, elite: 3,
      floors: ['rare', 'rare'], rest: 'magic', lvl: 1 },
    chest:    { n: [[2, 30], [3, 45], [4, 25]], goldP: 1, goldM: 5, potP: 0.5, gemP: 0.15, miscP: 0.08, matP: 0.15, loreP: 0.04, boost: 2, floors: ['magic'] },
    barrel:   { n: [[0, 86], [1, 14]], goldP: 0.35, goldM: 0.6, potP: 0.08, gemP: 0.004, miscP: 0, matP: 0, boost: 0.8, floors: [] },
    // R6.2: the reward for killing your own Echo — a few good drops, the first guaranteed rare-or-better (opts.floor can raise it)
    echo:     { n: [[2, 45], [3, 40], [4, 15]], goldP: 1, goldM: 8, potP: 0.5, gemP: 0.3, miscP: 0.1, matP: 0.5, loreP: 0.1, boost: 2.5, floors: ['rare', 'magic'] },
    quest:    { n: [[1, 70], [2, 30]], goldP: 1, goldM: 8, potP: 0, gemP: 0.1, miscP: 0, matP: 0, boost: 3, floors: ['rare'] },
  };
  D.SOURCES = SOURCES;

  // ---- lore pages (R4.1): the text lives in G.meta.LORE (UI/meta team); we only drop the page ----
  D.LORE_FALLBACK = 16;
  function loreCount() {
    const L = G.meta && G.meta.LORE;
    return Array.isArray(L) && L.length ? L.length : D.LORE_FALLBACK;
  }
  D.makeLore = function (index) {
    const L = G.meta && G.meta.LORE;
    const page = Array.isArray(L) && L[index];
    return { id: G.newId(), baseId: 'lore', type: 'lore', slot: null, loreIndex: index,
      name: (page && page.title) || D.MISC_NAMES.lorePage, rarity: 'rare', ilvl: 1, reqLevel: 1,
      icon: { shape: 'scroll', color: '#d8c8a0', accent: '#8a5a2a' }, base: {}, mods: [], value: 0 };
  };
  // A page the player has not found yet and that is not already lying on the floor; null once all are found.
  function rollLore(rng) {
    const found = {};
    const flags = G.state.flags || {};
    for (const i of flags.loreFound || []) found[i] = true;
    for (const g of G.state.groundItems || []) if (g.item && g.item.type === 'lore') found[g.item.loreIndex] = true;
    const open = [];
    for (let i = 0; i < loreCount(); i++) if (!found[i]) open.push(i);
    return open.length ? D.makeLore(rng.pick(open)) : null;
  }
  D.rollLore = rollLore;

  function higher(a, b) {
    if (!b || !C.RARITY[b]) return a;
    return (!a || rord(b) > rord(a)) ? b : a;
  }

  function pickCount(table, rng) {
    let total = 0;
    for (const e of table) total += e[1];
    let u = rng.next() * total;
    for (const e of table) { u -= e[1]; if (u < 0) return e[0]; }
    return table[table.length - 1][0];
  }

  // ---- Pallor (R5.2): opts.pallor is state.flags.pallor (0-100) or G.game.getPallor()'s { value, tier } ----
  // A number is mapped with the game's own tier thresholds (G.game.PALLOR_TIERS[i].min), else the same defaults.
  const PALLOR_MIN = [0, 10, 30, 60, 90];
  D.pallorTier = function (p) {
    if (p == null) return 0;
    if (typeof p === 'object') {
      if (typeof p.tier === 'number') return Math.max(0, Math.min(4, p.tier | 0));
      p = p.value;
    }
    const v = +p || 0, T = G.game && G.game.PALLOR_TIERS;
    let t = 0;
    for (let i = 1; i < 5; i++) if (v >= ((T && T[i] && typeof T[i].min === 'number') ? T[i].min : PALLOR_MIN[i])) t = i;
    return t;
  };
  // Per tier: rare/epic odds x(1 + 0.2 t) (never Elite/Mythic/set), extra item chances, +10% gold; from tier 2 some
  // equipment comes bleached with a hidden affix (D.bleach in pallor.js).
  D.PALLOR_BLEACH_P = [0, 0, 0.1, 0.16, 0.24];
  D.pallorBoost = function (t) { return 1 + 0.2 * t; };

  I.rollLoot = function (opts) {
    opts = opts || {};
    const rng = opts.rng || G.rng.global;
    const src = SOURCES[opts.source] || SOURCES.monster;
    const level = Math.max(1, Math.round(opts.level || 1));
    const mf = opts.magicFind || 0;
    const pt = D.pallorTier(opts.pallor);
    const items = [];

    let n = pickCount(src.n, rng);
    if (opts.floor && C.RARITY[opts.floor] && n < 1) n = 1;      // a public rarity floor guarantees there is a best item
    // Pallor quantity: one extra-item chance per tier (smaller for trash so floors don't drown in whites)
    const extraP = (opts.source === 'monster' || opts.source === 'barrel' || !SOURCES[opts.source]) ? 0.08 : 0.25;
    for (let t = 0; t < pt; t++) if (rng.chance(extraP)) n++;
    for (let i = 0; i < n; i++) {
      const it = I.rollItem({ level: level + (src.lvl || 0), magicFind: mf, rng: rng, _boost: src.boost, _elite: src.elite,
        _pallor: pt ? D.pallorBoost(pt) : 0,
        _floor: i === 0 ? higher(src.floors[0], opts.floor) : (src.floors[i] || src.rest) });
      // R6.5 corruption deepens with depth (opts.corruption overrides the depth curve with a 0..1 chance)
      let tainted = false;
      if (D.corrupt && D.isEquip(it) && rng.chance(D.corruptChance(level, opts.source, opts.corruption))) tainted = D.corrupt(it, rng);
      if (!tainted && pt >= 2 && D.bleach && rng.chance(D.PALLOR_BLEACH_P[pt])) D.bleach(it, rng);
      items.push(it);
    }

    let pots = src.pots ? rng.int(src.pots[0], src.pots[1]) : (rng.chance(src.potP) ? 1 : 0);
    while (pots-- > 0) items.push(makeMisc(rng.chance(0.6) ? 'potion_hp' : 'potion_mp', level, 1));

    let gems = (src.gems || 0) + (rng.chance(src.gemP) ? 1 : 0);
    while (gems-- > 0) items.push(rollGem(level, rng));

    if (rng.chance(src.miscP)) {
      const u = rng.next();
      items.push(makeMisc(u < 0.6 ? 'flask_rejuv' : u < 0.9 ? 'tome_xp' : 'chisel', level, 1));
    }
    if (rng.chance(src.matP)) {
      if (opts.source === 'boss') {
        items.push(makeMisc('mat_dust', 1, rng.int(3, 6)));
        items.push(makeMisc('mat_shard', 1, rng.int(1, 3)));
        if (rng.chance(0.1)) items.push(makeMisc('mat_essence', 1, 1));
      } else {
        const u = rng.next();
        if (u < 0.7) items.push(makeMisc('mat_dust', 1, rng.int(1, 3)));
        else if (u < 0.98) items.push(makeMisc('mat_shard', 1, 1));
        else items.push(makeMisc('mat_essence', 1, 1));
      }
    }

    if (src.loreP && rng.chance(src.loreP)) {
      const page = rollLore(rng);
      if (page) items.push(page);
    }

    let gold = 0;
    if (rng.chance(src.goldP)) {
      gold = Math.max(1, Math.round((4 + level * 2) * rng.range(0.6, 1.4) * src.goldM * (1 + (opts.goldFind || 0) / 100) * (1 + 0.1 * pt)));
    }
    return { items: items, gold: gold };
  };

  // ---- ground drops: loot piles (R5.6) ----
  // Everything from one kill / chest lands on one pile point: the nearest free tile to the drop (its centre). Every ground
  // entry of a pile sits on the same x, y and shares `pileId`; a drop within PILE_MERGE tiles of an existing pile joins it.
  // A pile holds at most one gold entry.
  function goldItem(qty) {
    return { type: 'gold', qty: qty, name: D.MISC_NAMES.gold, rarity: 'common', icon: { shape: 'gold', color: '#ffd94a' } };
  }
  D.goldItem = goldItem;
  const PILE_MERGE = 0.75;

  function pilePoint(x, y) {
    const map = G.state.map;
    if (map && G.world && G.world.findFreeTileNear) {
      let t = null;
      try { t = G.world.findFreeTileNear(map, x, y, 4); } catch (err) { t = null; }
      if (t) return { x: t.x + 0.5, y: t.y + 0.5 };
    }
    return { x: x, y: y };
  }

  // -> the pile to drop into at (x, y): { pileId, x, y }, joining a nearby pile when there is one.
  function pileAt(x, y) {
    const p = pilePoint(x, y);
    let best = null, bd = PILE_MERGE * PILE_MERGE;
    for (const g of G.state.groundItems) {
      if (!g.pileId) continue;
      const dx = g.x - p.x, dy = g.y - p.y, d = dx * dx + dy * dy;
      if (d <= bd) { bd = d; best = g; }
    }
    return best ? { pileId: best.pileId, x: best.x, y: best.y } : { pileId: G.newId(), x: p.x, y: p.y };
  }

  function place(pile, item) {
    if (item.type === 'gold') {
      for (const g of G.state.groundItems) {
        if (g.pileId === pile.pileId && g.item.type === 'gold') { g.item.qty += item.qty || 0; return g; }
      }
    }
    const ground = { id: G.newId(), x: pile.x, y: pile.y, item: item, pileId: pile.pileId };
    G.state.groundItems.push(ground);
    G.emit('loot:dropped', { ground: ground });
    if (item.type !== 'gold' && rord(item.rarity) >= rord('rare')) {
      G.emit('fx:spawn', { type: 'lootbeam', x: pile.x, y: pile.y, color: C.RARITY[item.rarity].color });
    }
    return ground;
  }

  I.dropItemAt = function (x, y, item) {
    if (!item) return null;
    return place(pileAt(x, y), item);
  };

  // Sort key for a ground entry: equipment by rarity, then gems / consumables / lore, gold last.
  function groundRank(g) {
    const it = g.item;
    if (it.type === 'gold') return -1;
    return rord(it.rarity) * 10 + (D.isEquip && D.isEquip(it) ? 5 : 0) + (it.ilvl || 0) / 1000;
  }
  D.groundRank = groundRank;

  I.getPile = function (pileId) {
    const out = [];
    for (const g of G.state.groundItems) if (g.pileId === pileId) out.push(g);
    out.sort(function (a, b) { return groundRank(b) - groundRank(a); });
    return out;
  };

  I.dropLoot = function (x, y, opts) {
    opts = opts || {};
    const loot = I.rollLoot(opts);
    if (!loot.items.length && !loot.gold) return loot;
    const pile = pileAt(x, y);
    let best = -1, bestItem = null;
    for (const item of loot.items) {
      place(pile, item);
      const equip = item.type === 'weapon' || item.type === 'armor' || item.type === 'jewelry';
      const o = equip ? rord(item.rarity) : 0;
      if (o > best) { best = o; bestItem = item; }
    }
    if (loot.gold) place(pile, goldItem(loot.gold));
    loot.pileId = pile.pileId;
    if (best >= rord('set')) {
      G.emit('sfx', { name: 'loot_legendary' });
      G.emit('ui:toast', { text: C.RARITY[bestItem.rarity].name + ' drop: ' + bestItem.name, color: C.RARITY[bestItem.rarity].color });
    } else if (best >= rord('rare')) G.emit('sfx', { name: 'loot_rare' });
    else if (loot.items.length) G.emit('sfx', { name: 'loot' });
    return loot;
  };
})();
