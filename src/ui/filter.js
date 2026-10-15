// R12 custom sell / salvage filter: the player builds a filter (rarity at or below, item level / Power below, slots, and which special
// kinds of gear to include), sees the exact count and gold before confirming, and the game remembers it (state.settings.sellFilter =
// { cur, presets: [{ name, f }] }). Used by the vendors' Sell tab (bag) and by the surface crate. Matching is done here against plain item
// fields so it works with whatever the items team ships; the sale itself goes through the ordinary per-item sell / salvage calls.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const h = ui._h, fmt = ui._fmt;

  const RARITIES = ['common', 'uncommon', 'rare', 'magic'];            // Legendary and above are never part of a bulk action
  const SLOTS = [['weapon', 'Weapon'], ['offhand', 'Off-hand'], ['helm', 'Helm'], ['chest', 'Chest'], ['gloves', 'Gloves'], ['boots', 'Boots'], ['belt', 'Belt'], ['amulet', 'Amulet'], ['ring', 'Ring']];
  const TOGGLES = [['upgrades', 'Upgrades ▲'], ['locked', 'Locked'], ['socketed', 'With gems'], ['sets', 'Set pieces'], ['wanted', 'Book pieces'], ['corrupted', 'Corrupted']];
  const DEFAULT = { rarity: 'uncommon', ilvl: 0, power: 0, slots: [], upgrades: false, locked: false, socketed: true, sets: false, wanted: false, corrupted: true };
  const PRESETS = [
    { name: 'Trash', f: { rarity: 'common' } },
    { name: 'Greens', f: { rarity: 'uncommon' } },
    { name: 'Blues', f: { rarity: 'rare' } },
  ];

  function store() {
    const st = S.settings;
    if (!st.sellFilter || typeof st.sellFilter !== 'object') st.sellFilter = {};
    const sf = st.sellFilter;
    if (!sf.cur) sf.cur = Object.assign({}, DEFAULT);
    if (!Array.isArray(sf.presets)) sf.presets = PRESETS.map(function (p) { return { name: p.name, f: Object.assign({}, DEFAULT, p.f) }; });
    return sf;
  }
  const cur = function () { return store().cur; };
  const save = function () { if (G.meta && G.meta.save) G.meta.save(); };

  const bulkRate = function () { const r = G.items && +G.items.BULK_RATE; return r > 0 && r <= 1 ? r : 0.6; };

  // does this item belong to filter f? (equipment only)
  function matches(it, f) {
    if (!it || !it.slot || it.type === 'gem') return false;
    if (ui._rarityOrder(it.rarity) > ui._rarityOrder(f.rarity)) return false;
    if (ui._rarityOrder(it.rarity) >= ui._rarityOrder('legendary') || it.setId && !f.sets) return false;
    if (it.bleached && !it.revealed) return false;
    if (f.ilvl > 0 && (it.ilvl || it.level || 0) >= f.ilvl) return false;
    if (f.power > 0 && G.items && typeof G.items.power === 'function') { try { if (G.items.power(it) >= f.power) return false; } catch (err) { /* ignore */ } }
    if (f.slots && f.slots.length && f.slots.indexOf(it.slot === 'ring1' || it.slot === 'ring2' ? 'ring' : it.slot) < 0) return false;
    if (!f.upgrades && ui._verdict(it) === 'up') return false;
    if (!f.locked && it.locked) return false;
    if (!f.socketed && Array.isArray(it.sockets) && it.sockets.some(Boolean)) return false;
    if (!f.wanted && ui._wanted(it)) return false;
    if (!f.corrupted && it.corrupted) return false;
    return true;
  }
  ui._filterMatches = matches;

  // source: 'bag' | 'surface'. -> [{ it, i }] newest index last
  function pool(source) {
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
    if (done) ui.toast((verb === 'sell' ? 'Sold ' : 'Salvaged ') + done + ' item' + (done === 1 ? '' : 's') + (verb === 'sell' ? ' for ' + fmt(gold) + ' gold.' : '.'), '#dfc06a');
    ui._refreshNow();
    return done;
  }

  function describe(f) {
    const parts = ['≤ ' + (C.RARITY[f.rarity] ? C.RARITY[f.rarity].name : f.rarity)];
    if (f.ilvl > 0) parts.push('level < ' + f.ilvl);
    if (f.power > 0) parts.push('Power < ' + f.power);
    if (f.slots && f.slots.length) parts.push(f.slots.map(function (s) { return (SLOTS.filter(function (x) { return x[0] === s; })[0] || [0, s])[1]; }).join('/'));
    return parts.join(' · ');
  }

  // sell / salvage with a confirm that names the count and the gold
  function confirmRun(source, f, verb, after) {
    const pv = preview(source, f);
    if (!pv.count) { ui._sfx('error'); ui.toast('Nothing matches this filter.', '#a89f8f'); return; }
    const rate = source === 'surface' ? Math.round(bulkRate() * 100) : 0;
    ui._confirm((verb === 'sell' ? 'Sell ' : 'Salvage ') + pv.count + ' item' + (pv.count === 1 ? '' : 's') + (verb === 'sell' ? ' for about ' + fmt(pv.gold) + ' gold' : '') + '?', verb === 'sell' ? 'Sell' : 'Salvage', function () { run(source, f, verb); if (after) after(); }, {
      danger: verb !== 'sell',
      note: (pv.gems > 0 ? pv.gems + ' socketed gem' + (pv.gems === 1 ? '' : 's') + ' will be ground to dust. ' : '') +
        (rate ? 'Bulk rate: ' + rate + '% of the trader\'s price. ' : '') + 'Locked items, Legendary and better, and anything your filter leaves out are kept.' });
  }

  // ---------- the builder ----------
  function builder(source, after) {
    let close = null, box = null;
    const f = cur();
    const chip = function (label, on, fn) { return h('button', { type: 'button', class: 'ed-btn ed-chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: function () { ui._sfx('click'); fn(); save(); fill(); } }, label); };
    const stepper = function (label, key, step, max) {
      return h('div', { class: 'ed-step' }, h('span', { text: label }),
        ui._btn('−', function () { f[key] = Math.max(0, (f[key] | 0) - step); save(); fill(); }),
        h('b', { text: f[key] > 0 ? String(f[key]) : 'Off' }),
        ui._btn('+', function () { f[key] = Math.min(max, (f[key] | 0) + step); save(); fill(); }));
    };
    const fill = function () {
      const sf = store(), pv = preview(source, f);
      box.replaceChildren.apply(box, [
        h('div', { class: 'ed-h', text: 'Sell / salvage filter' }),
        h('div', { class: 'ed-seg', style: 'flex-wrap:wrap' }, sf.presets.map(function (p, i) {
          return ui._btn(p.name, function () { Object.keys(f).forEach(function (k) { delete f[k]; }); Object.assign(f, DEFAULT, JSON.parse(JSON.stringify(p.f))); save(); fill(); }, '');
        })),
        h('div', { class: 'ed-note', text: 'Rarity at or below' }),
        h('div', { class: 'ed-seg' }, RARITIES.map(function (r) { const rr = C.RARITY[r]; const b = chip(rr ? rr.name : r, f.rarity === r, function () { f.rarity = r; }); b.style.color = rr ? rr.color : ''; return b; })),
        stepper('Item level below', 'ilvl', 5, 100),
        stepper('Power below', 'power', 50, 5000),
        h('div', { class: 'ed-note', text: 'Slots (none chosen = all)' }),
        h('div', { class: 'ed-seg', style: 'flex-wrap:wrap' }, SLOTS.map(function (s) {
          return chip(s[1], f.slots.indexOf(s[0]) >= 0, function () { const i = f.slots.indexOf(s[0]); if (i >= 0) f.slots.splice(i, 1); else f.slots.push(s[0]); });
        })),
        h('div', { class: 'ed-note', text: 'Also include (tap to switch)' }),
        h('div', { class: 'ed-seg', style: 'flex-wrap:wrap' }, TOGGLES.map(function (t) { return chip(t[1] + ': ' + (f[t[0]] ? 'yes' : 'no'), !!f[t[0]], function () { f[t[0]] = !f[t[0]]; }); })),
        h('div', { class: 'ed-box', style: 'margin-top:6px' }, h('div', { class: 'ed-kv' }, h('span', { text: 'Matches now' }), h('b', { class: pv.count ? 'ed-gold' : 'ed-dim', text: pv.count + ' item' + (pv.count === 1 ? '' : 's') + (source === 'surface' ? ' · ' : ' · ') + fmt(pv.gold) + ' g' })),
          source === 'surface' ? h('div', { class: 'ed-note', text: 'Bulk rate ' + Math.round(bulkRate() * 100) + '% of the trader\'s price.' }) : null),
        h('div', { class: 'ed-seg', style: 'margin-top:6px' },
          ui._btn('Save as preset', function () {
            sf.presets.push({ name: 'Mine ' + (sf.presets.length + 1), f: JSON.parse(JSON.stringify(f)) }); if (sf.presets.length > 6) sf.presets.splice(3, 1);
            save(); ui.toast('Preset saved.', '#a89f8f'); fill();
          }),
          ui._btn('Delete preset', function () {
            const i = sf.presets.findIndex(function (p) { return JSON.stringify(Object.assign({}, DEFAULT, p.f)) === JSON.stringify(f); });
            if (i >= 0) { sf.presets.splice(i, 1); save(); fill(); } else ui._sfx('error');
          }))]);
    };
    box = h('div', { class: 'ed-list ed-fbuilder' });
    fill();
    close = ui._modal(ui._dialog([box], [
      ui._btn('Sell', function () { confirmRun(source, f, 'sell', function () { close(); if (after) after(); }); }, 'gold'),
      ui._btn('Salvage', function () { confirmRun(source, f, 'salvage', function () { close(); if (after) after(); }); }),
      ui._btn('Done', function () { close(); if (after) after(); })]));
  }

  // ---------- the box shown in the Sell tab / the crate ----------
  ui._filterBox = function (source) {
    const f = cur(), pv = preview(source, f);
    const canSell = source === 'surface' ? !!(G.items && G.items.surfaceSell) : !!(G.items && G.items.sell);
    const canSalv = source === 'surface' ? !!(G.items && G.items.surfaceSalvage) : !!(G.items && G.items.salvage);
    const sell = ui._btn('Sell ' + pv.count + ' · ' + fmt(pv.gold) + 'g', function () { confirmRun(source, f, 'sell'); }, pv.count ? 'gold' : '');
    const salv = ui._btn('Salvage', function () { confirmRun(source, f, 'salvage'); });
    if (!pv.count || !canSell) sell.disabled = true;
    if (!pv.count || !canSalv) salv.disabled = true;
    return h('div', { class: 'ed-box ed-fbox' },
      h('div', { class: 'ed-kv' }, h('span', { text: 'Sell filter' }), h('b', { text: describe(f) })),
      h('div', { class: 'ed-fbtns' }, sell, salv, ui._btn('Edit', function () { builder(source, ui._refreshNow); })),
      source === 'surface' ? h('div', { class: 'ed-note', text: 'Bulk rate: ' + Math.round(bulkRate() * 100) + '% of a trader\'s price. Carry items to a trader for full price.' }) : null);
  };
  ui._openFilter = builder;
})();
