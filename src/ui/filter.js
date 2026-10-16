// R12 custom sell / salvage filter: the player builds a filter (rarity at or below, item level / Power below, slots, and which special
// kinds of gear to include), sees the exact count and gold before confirming, and the game remembers it (state.settings.sellFilter =
// { cur, presets: [{ name, f }] }). Used by the vendors' Sell tab (bag) and by the surface crate. Matching is done here against plain item
// fields so it works with whatever the items team ships; the sale itself goes through the ordinary per-item sell / salvage calls.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h, fmt = ui._fmt;

  // Both filters use the items module's matchFilter shape: { maxRarity, maxItemLevel, maxPower, slots[], excludeUpgrades, excludeSocketed,
  // excludeWanted, excludeCorrupted } (locked items, sets, Legendary and better are always kept by G.items.matchFilter itself).
  // Sell / salvage: settings.sellFilter = { current, presets: { name: filter } } through G.items.get/setSellFilter (items owns the key).
  // Ground loot: settings.lootFilterRules = { on, cur, presets: [{ name, filter }] }; G.items.lootFilterAllows does the hiding.
  const RARITIES = ['common', 'uncommon', 'rare', 'magic'];            // Legendary and above are never part of a bulk action
  const SLOTS = [['weapon', TX.common.weapon], ['offhand', TX.filter.offHand], ['helm', TX.common.helm], ['chest', TX.filter.chest], ['gloves', TX.common.gloves], ['boots', TX.common.boots], ['belt', TX.common.belt], ['amulet', TX.common.amulet], ['ring', TX.common.ring]];
  // [matchFilter key, label]: the chip reads "<label>: yes" when the filter INCLUDES that kind (the key is the exclude flag, so inverted)
  const TOGGLES = [['excludeUpgrades', TX.filter.upgrades], ['excludeSocketed', TX.filter.withGems], ['excludeWanted', TX.filter.bookPieces], ['excludeCorrupted', TX.filter.corrupted]];
  const SELL_DEFAULT = { maxRarity: 'uncommon', slots: [], excludeUpgrades: true, excludeSocketed: false, excludeWanted: true, excludeCorrupted: false };
  const SELL_PRESETS = [{ name: TX.filter.presetTrash, f: { maxRarity: 'common' } }, { name: TX.filter.presetGreens, f: { maxRarity: 'uncommon' } }, { name: TX.filter.presetBlues, f: { maxRarity: 'rare' } }];
  const LOOT_DEFAULT = { maxRarity: 'common', slots: [], excludeUpgrades: true, excludeSocketed: true, excludeWanted: true, excludeCorrupted: true };
  const LOOT_PRESETS = [{ name: TX.filter.presetHideGrey, f: { maxRarity: 'common' } }, { name: TX.filter.presetHideGreen, f: { maxRarity: 'uncommon' } }, { name: TX.filter.presetHideBlue, f: { maxRarity: 'rare' } }];
  const clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  const I = function () { return G.items || {}; };

  // The old UI shape ({ rarity, ilvl, power, upgrades, socketed, ... } = what to INCLUDE) -> matchFilter shape. "below N" becomes "at or below N-1".
  function convOld(o) {
    o = o && typeof o === 'object' ? o : {};
    const f = { maxRarity: o.rarity || o.maxRarity || 'common', slots: Array.isArray(o.slots) ? o.slots.slice() : [] };
    if (o.ilvl > 0) f.maxItemLevel = o.ilvl - 1;
    if (o.power > 0) f.maxPower = o.power - 1;
    f.excludeUpgrades = !o.upgrades; f.excludeSocketed = !o.socketed; f.excludeWanted = !o.wanted; f.excludeCorrupted = !o.corrupted;
    return f;
  }
  // Called by meta.load for every save: rewrite saved filters from the two older shapes into the settled ones. Safe to run twice.
  ui._migrateFilters = function (st) {
    if (!st || typeof st !== 'object') return;
    const sf = st.sellFilter;
    if (sf && typeof sf === 'object' && sf.cur && !sf.current) {                // R12 UI shape { cur, presets: [{ name, f }] }
      const presets = {};
      (Array.isArray(sf.presets) ? sf.presets : []).slice(0, 5).forEach(function (p) { if (p && p.name) presets[p.name] = convOld(p.f); });
      st.sellFilter = { current: convOld(sf.cur), presets: presets };
    }
    const lf = st.lootFilterRules;
    const oldUi = lf && typeof lf === 'object' && lf.cur && typeof lf.cur === 'object' && !('on' in lf);
    const flat = lf && typeof lf === 'object' && !lf.cur && ('enabled' in lf || 'maxRarity' in lf);
    if (oldUi || flat) {
      let out;
      if (lf.cur && typeof lf.cur === 'object') {                               // R16.7 UI shape { cur: { enabled, rarity, ... }, presets: [{ name, f }] }
        out = { on: !!lf.cur.enabled, cur: convOld(lf.cur), presets: (Array.isArray(lf.presets) ? lf.presets : []).filter(function (p) { return p && p.name; }).slice(0, 6).map(function (p) { return { name: p.name, filter: convOld(p.f) }; }) };
      } else {                                                                  // the items-side flat shape { enabled, maxRarity, ... }
        const cur = clone(lf); delete cur.enabled;
        out = { on: !!lf.enabled, cur: cur, presets: [] };
      }
      st.lootFilterRules = out;
    }
  };

  function lootStore() {
    const st = S.settings;
    if (!st.lootFilterRules || typeof st.lootFilterRules !== 'object' || Array.isArray(st.lootFilterRules)) st.lootFilterRules = {};
    ui._migrateFilters(st);
    const lf = st.lootFilterRules;
    if (typeof lf.on !== 'boolean') lf.on = false;
    if (!lf.cur || typeof lf.cur !== 'object') lf.cur = clone(LOOT_DEFAULT);
    if (!Array.isArray(lf.cur.slots)) lf.cur.slots = [];
    if (!Array.isArray(lf.presets)) lf.presets = LOOT_PRESETS.map(function (p) { return { name: p.name, filter: Object.assign(clone(LOOT_DEFAULT), p.f) }; });
    return lf;
  }
  // the live filter object being edited, and the presets as [{ name, filter }] with save / delete callbacks
  function sellStore() {
    const it = I();
    ui._migrateFilters(S.settings);
    const f = it.getSellFilter ? it.getSellFilter() : (S.settings.sellFilter = S.settings.sellFilter || { current: clone(SELL_DEFAULT), presets: {} }).current;
    if (!Array.isArray(f.slots)) f.slots = [];
    return f;
  }
  function sellPresets() {
    const it = I();
    const map = (it.getFilterPresets ? it.getFilterPresets() : (S.settings.sellFilter && S.settings.sellFilter.presets)) || {};
    if (!Object.keys(map).length && !S.settings._sellPresetsSeeded) {
      S.settings._sellPresetsSeeded = true;
      SELL_PRESETS.forEach(function (p) { if (it.saveFilterPreset) it.saveFilterPreset(p.name, Object.assign(clone(SELL_DEFAULT), p.f)); });
    }
    return Object.keys(map).map(function (k) { return { name: k, filter: map[k] }; });
  }
  const cur = function (source) { return source === 'loot' ? lootStore().cur : sellStore(); };
  ui._lootFilterOn = function () { return !!(S.settings.lootFilterRules && S.settings.lootFilterRules.on); };
  const save = function () { if (G.meta && G.meta.save) G.meta.save(); G.emit('inventory:changed', {}); };

  // R13: the crate's bulk rate starts at 50% and rises with loyalty (G.items.bulkRate(kind), kind = 'sell' | 'salvage')
  const rateOf = function (kind) {
    let r = 0;
    if (G.items && typeof G.items.bulkRate === 'function') { try { r = +G.items.bulkRate(kind); } catch (err) { r = 0; } }
    if (!(r > 0)) r = G.items && +G.items.BULK_RATE;
    return r > 0 && r <= 1 ? r : 0.5;
  };
  const bulkRate = function () { return rateOf('sell'); };
  ui._bulkRate = rateOf;
  const traderName = function (role) { const N = (G.meta && G.meta.STORY && G.meta.STORY.NAMES) || {}; return N[role] || (role === 'merchant' ? 'the Merchant' : 'the Blacksmith'); };
  // "Bulk rate: sell 60% · salvage 50%. Raise it by helping Orlen and Brakka."
  ui._bulkLine = function () {
    const s = Math.round(rateOf('sell') * 100), v = Math.round(rateOf('salvage') * 100);
    return 'Bulk rate: sell ' + s + '% · salvage ' + v + '%' + (s < 80 || v < 80 ? '. Raise it by helping ' + traderName('merchant') + ' (sell) and ' + traderName('blacksmith') + ' (salvage).' : ' (the most the crate pays).');
  };
  // the trader's loyalty level (0-3 stars; each +10% of bulk rate) for the merchant / blacksmith panels
  ui._loyaltyEl = function (role) {
    if (role !== 'merchant' && role !== 'blacksmith') return null;
    const kind = role === 'merchant' ? 'sell' : 'salvage', L = (S.flags.loyalty && S.flags.loyalty[kind]) || 0;
    const n = Math.max(0, Math.min(3, Math.round(L * 10)));
    return h('div', { class: 'ed-loyal', title: TX.filter.loyaltyRaisesWhatThe + kind }, TX.filter.loyalty + '★'.repeat(n) + '☆'.repeat(3 - n), h('small', { text: TX.filter.crate + kind + ' ' + Math.round(rateOf(kind) * 100) + '%' }));
  };

  // does this item belong to filter f? The items module owns the rules (equipment only; locked, sets, Legendary+ never match).
  function matches(it, f) {
    const fn = G.items && G.items.matchFilter;
    if (!fn || !it) return false;
    try { return !!fn.call(G.items, it, f); } catch (err) { return false; }
  }

  // source: 'bag' | 'surface' | 'loot'. -> [{ it, i }] newest index last
  function pool(source) {
    if (source === 'loot') return (S.groundItems || []).filter(function (g) { return g && g.item; }).map(function (g, i) { return { it: g.item, i: i }; });
    const list = source === 'surface' ? (Array.isArray(S.surface) ? S.surface : []) : ((S.player && S.player.inventory) || []);
    const out = [];
    list.forEach(function (it, i) { if (it) out.push({ it: it, i: i }); });
    return out;
  }
  function preview(source, f) {
    let n = 0, gold = 0, gems = 0;
    const rate = source === 'surface' ? bulkRate() : 1;
    pool(source).forEach(function (x) {
      if (!matches(x.it, f)) return;
      n++; gold += Math.round((x.it.value || 0) * (x.it.qty || 1) * rate);
      gems += (x.it.sockets || []).filter(Boolean).length;
    });
    return { count: n, gold: gold, gems: gems };
  }
  ui._filterPreview = preview;

  function run(source, f, verb) {
    const list = pool(source).filter(function (x) { return matches(x.it, f); }).reverse();     // high index first: splices do not shift the rest
    let done = 0, gold = 0;
    list.forEach(function (x) {
      let r = false;
      if (source === 'surface') {
        if (verb === 'sell') { const fn = G.items && G.items.surfaceSell; r = fn ? fn.call(G.items, x.i, { bulk: true }) : 0; if (r > 0) gold += r; r = r > 0; }
        else { const fn = G.items && G.items.surfaceSalvage; r = fn ? !!fn.call(G.items, x.i, { bulk: true }) : false; }
      } else if (verb === 'sell') { const g = ui._itemsCall('sell', x.i); r = g > 0; if (r) gold += g; }
      else r = !!ui._itemsCall('salvage', x.i);
      if (r) done++;
    });
    ui._sfx(done ? (verb === 'sell' ? 'sell' : 'click') : 'error');
    if (done) ui.toast((verb === 'sell' ? 'Sold ' : 'Salvaged ') + done + TX.chute.item + (done === 1 ? '' : 's') + (verb === 'sell' ? TX.filter.for + fmt(gold) + TX.filter.gold : '.'), '#dfc06a');
    ui._refreshNow();
    return done;
  }

  function describe(f) {
    const parts = ['≤ ' + (C.RARITY[f.maxRarity] ? C.RARITY[f.maxRarity].name : f.maxRarity)];
    if (f.maxItemLevel > 0) parts.push(TX.filter.level + f.maxItemLevel);
    if (f.maxPower > 0) parts.push(TX.filter.power + f.maxPower);
    if (f.slots && f.slots.length) parts.push(f.slots.map(function (s) { return (SLOTS.filter(function (x) { return x[0] === s; })[0] || [0, s])[1]; }).join('/'));
    return parts.join(' · ');
  }

  // sell / salvage with a confirm that names the count and the gold
  function confirmRun(source, f, verb, after) {
    const pv = preview(source, f);
    if (!pv.count) { ui._sfx('error'); ui.toast(TX.filter.nothingMatchesThisFilter, '#a89f8f'); return; }
    const rate = source === 'surface' ? Math.round(bulkRate() * 100) : 0;
    ui._confirm((verb === 'sell' ? 'Sell ' : 'Salvage ') + pv.count + TX.chute.item + (pv.count === 1 ? '' : 's') + (verb === 'sell' ? TX.filter.forAbout + fmt(pv.gold) + TX.filter.gold2 : '') + '?', verb === 'sell' ? 'Sell' : 'Salvage', function () { run(source, f, verb); if (after) after(); }, {
      danger: verb !== 'sell',
      note: (pv.gems > 0 ? pv.gems + TX.chute.socketedGem + (pv.gems === 1 ? '' : 's') + TX.filter.willBeGroundTo : '') +
        (rate ? 'Bulk rate: ' + rate + '% of the trader\'s price. ' : '') + 'Locked items, Legendary and better, and anything your filter leaves out are kept.' });
  }

  // ---------- the builder ----------
  function builder(source, after) {
    let close = null, box = null;
    const loot = source === 'loot';
    const f = cur(source);
    const chip = function (label, on, fn) { return h('button', { type: 'button', class: 'ed-btn ed-chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: function () { ui._sfx('click'); fn(); save(); fill(); } }, label); };
    const stepper = function (label, key, step, max) {
      return h('div', { class: 'ed-step' }, h('span', { text: label }),
        ui._btn('−', function () { const v = Math.max(0, (f[key] | 0) - step); if (v) f[key] = v; else delete f[key]; save(); fill(); }),
        h('b', { text: f[key] > 0 ? String(f[key]) : TX.filter.off }),
        ui._btn('+', function () { f[key] = Math.min(max, (f[key] | 0) + step); save(); fill(); }));
    };
    const presetList = function () { return loot ? lootStore().presets : sellPresets(); };
    const fill = function () {
      const pv = preview(source, f), lf = loot ? lootStore() : null;
      box.replaceChildren.apply(box, [
        h('div', { class: 'ed-h', text: loot ? TX.filter.groundLootFilter : TX.filter.sellSalvageFilter }),
        loot ? h('div', { class: 'ed-note', text: TX.filter.lootFilterExplain }) : null,
        loot ? chip(lf.on ? TX.filter.filterIsOn : TX.filter.filterIsOff, !!lf.on, function () { lf.on = !lf.on; }) : null,
        h('div', { class: 'ed-seg', style: 'flex-wrap:wrap' }, presetList().map(function (p) {
          return ui._btn(p.name, function () {
            const keep = clone(p.filter || {});
            Object.keys(f).forEach(function (k) { delete f[k]; });
            Object.assign(f, loot ? LOOT_DEFAULT : SELL_DEFAULT, keep);
            if (loot) lf.on = true;
            save(); fill();
          }, '');
        })),
        h('div', { class: 'ed-note', text: TX.filter.rarityAtOrBelow }),
        h('div', { class: 'ed-seg' }, RARITIES.map(function (r) { const rr = C.RARITY[r]; const b = chip(rr ? rr.name : r, f.maxRarity === r, function () { f.maxRarity = r; }); b.style.color = rr ? rr.color : ''; return b; })),
        stepper(TX.filter.itemLevelUpTo, 'maxItemLevel', 5, 100),
        stepper(TX.filter.powerUpTo, 'maxPower', 50, 5000),
        h('div', { class: 'ed-note', text: TX.filter.slotsNoneChosenAll }),
        h('div', { class: 'ed-seg', style: 'flex-wrap:wrap' }, SLOTS.map(function (s) {
          return chip(s[1], f.slots.indexOf(s[0]) >= 0, function () { const i = f.slots.indexOf(s[0]); if (i >= 0) f.slots.splice(i, 1); else f.slots.push(s[0]); });
        })),
        h('div', { class: 'ed-note', text: TX.filter.alsoIncludeTapTo }),
        h('div', { class: 'ed-seg', style: 'flex-wrap:wrap' }, TOGGLES.map(function (t) { const inc = !f[t[0]]; return chip(t[1] + ': ' + (inc ? TX.filter.yes : TX.filter.no), inc, function () { f[t[0]] = !f[t[0]]; }); })),
        h('div', { class: 'ed-box', style: 'margin-top:6px' }, h('div', { class: 'ed-kv' }, h('span', { text: TX.filter.matchesNow }), h('b', { class: pv.count ? 'ed-gold' : 'ed-dim', text: pv.count + TX.chute.item + (pv.count === 1 ? '' : 's') + ' · ' + fmt(pv.gold) + ' g' })),
          source === 'surface' ? h('div', { class: 'ed-note', text: ui._bulkLine() }) : null),
        h('div', { class: 'ed-seg', style: 'margin-top:6px' },
          ui._btn(TX.filter.saveAsPreset, function () {
            const name = TX.filter.mine + (presetList().length + 1);
            if (loot) { lf.presets.push({ name: name, filter: clone(f) }); if (lf.presets.length > 6) lf.presets.splice(3, 1); }
            else if (!(G.items && G.items.saveFilterPreset && G.items.saveFilterPreset(name, f))) { ui._sfx('error'); return; }
            save(); ui.toast(TX.filter.presetSaved, '#a89f8f'); fill();
          }),
          ui._btn(TX.filter.deletePreset, function () {
            const same = function (p) { return JSON.stringify(Object.assign({}, loot ? LOOT_DEFAULT : SELL_DEFAULT, p.filter)) === JSON.stringify(Object.assign({}, loot ? LOOT_DEFAULT : SELL_DEFAULT, f)); };
            const hit = presetList().filter(same)[0];
            if (!hit) { ui._sfx('error'); return; }
            if (loot) lf.presets.splice(lf.presets.indexOf(hit), 1); else if (G.items && G.items.deleteFilterPreset) G.items.deleteFilterPreset(hit.name);
            save(); fill();
          }))]);
    };
    box = h('div', { class: 'ed-list ed-fbuilder' });
    fill();
    close = ui._modal(ui._dialog([box], loot ? [ui._btn(TX.common.done, function () { close(); if (after) after(); }, 'gold')] : [
      ui._btn(TX.common.sell, function () { confirmRun(source, f, 'sell', function () { close(); if (after) after(); }); }, 'gold'),
      ui._btn(TX.common.salvage, function () { confirmRun(source, f, 'salvage', function () { close(); if (after) after(); }); }),
      ui._btn(TX.common.done, function () { close(); if (after) after(); })]));
  }

  // ---------- the box shown in the Sell tab / the crate ----------
  ui._filterBox = function (source) {
    const f = cur(source), pv = preview(source, f);
    const canSell = source === 'surface' ? !!(G.items && G.items.surfaceSell) : !!(G.items && G.items.sell);
    const canSalv = source === 'surface' ? !!(G.items && G.items.surfaceSalvage) : !!(G.items && G.items.salvage);
    const sell = ui._btn(TX.filter.sell + pv.count + ' · ' + fmt(pv.gold) + 'g', function () { confirmRun(source, f, 'sell'); }, pv.count ? 'gold' : '');
    const salv = ui._btn(TX.common.salvage, function () { confirmRun(source, f, 'salvage'); });
    if (!pv.count || !canSell) sell.disabled = true;
    if (!pv.count || !canSalv) salv.disabled = true;
    return h('div', { class: 'ed-box ed-fbox' },
      h('div', { class: 'ed-kv' }, h('span', { text: TX.filter.sellFilter }), h('b', { text: describe(f) })),
      h('div', { class: 'ed-fbtns' }, sell, salv, ui._btn(TX.filter.edit, function () { builder(source, ui._refreshNow); })),
      source === 'surface' ? h('div', { class: 'ed-note', text: ui._bulkLine() + TX.filter.carryItemsToA }) : null);
  };
  ui._openFilter = builder;
})();
