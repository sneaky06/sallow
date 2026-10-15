// R7.10 / R7.11 screens: the Curator's Collection Book (checklist of every page, hand-in from the bag, auto-register) and the
// Relics of the Fallen page (ten slots, combine at the Elder). Everything reads G.items.collection / G.items.RELICS and is
// guarded: when an API is missing the screen says so instead of throwing.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const h = ui._h, fmt = ui._fmt;

  function co() { return G.items && G.items.collection && typeof G.items.collection.getPages === 'function' ? G.items.collection : null; }
  function stat(s, v) {
    if (G.items && G.items.formatStat) { try { return G.items.formatStat(s, v); } catch (err) { /* fall through */ } }
    return (v > 0 ? '+' : '') + fmt(v) + ' ' + (ui._statLabel ? ui._statLabel(s) : s);
  }
  function buffText(list) { return (list || []).map(function (b) { return stat(b[0], b[1]); }).join(', '); }
  function rewardText(r) {
    if (!r) return '';
    const parts = [];
    if (r.buff && r.buff.length) parts.push(buffText(r.buff));
    if (r.title) parts.push('Title: ' + r.title);
    return parts.join(' · ');
  }
  function tierText(t) {
    const parts = [];
    if (t.mats) parts.push(ui._matsText(t.mats));
    if (t.buff && t.buff.length) parts.push(buffText(t.buff));
    if (t.stash) parts.push('+' + t.stash + ' stash row' + (t.stash > 1 ? 's' : ''));
    parts.push('title ' + t.name);
    return parts.join(' · ');
  }
  const KINDS = [['all', 'All'], ['armour', 'Armour'], ['weapon', 'Weapons'], ['set', 'Sets']];
  function kindOf(pg) {
    if (pg.kind === 'weapon') return 'weapon';
    if (pg.kind === 'heavy' || pg.kind === 'light' || pg.kind === 'cloth') return 'armour';
    return 'set';
  }
  const KIND_NAME = { heavy: 'Heavy armour', light: 'Light armour', cloth: 'Cloth', weapon: 'Weapons', set: 'Set', unique: 'Unique' };

  // Bag / stash items the book wants right now: [{ item, index, source, page: pageId, entry }]
  function wantedList() {
    const c = co(), out = [], p = S.player;
    if (!c || !p) return out;
    const scan = function (list, source) {
      (list || []).forEach(function (it, i) {
        if (!it || !it.slot) return;
        let w = false, e = null;
        try { w = c.isWanted(it); e = w ? c.entryOf(it) : null; } catch (err) { w = false; }
        if (w && e) out.push({ item: it, index: i, source: source, page: e.page, entry: e.key });
      });
    };
    scan(p.inventory, 'bag');
    scan(S.stash, 'stash');
    return out;
  }
  ui._wantedCount = function () { return wantedList().filter(function (w) { return w.source === 'bag'; }).length; };

  function pageMap() {
    const m = {};
    const c = co();
    if (c) { try { c.getPages().forEach(function (pg) { m[pg.id] = pg; }); } catch (err) { /* empty */ } }
    return m;
  }

  function register(w) {
    if (S.scene !== 'town') { ui._sfx('error'); ui.toast('The Curator takes pieces in town. Send them up the chute.', '#a89f8f'); return; }      // R8.1
    ui._sendToCurator(w.index, w.source === 'stash' ? 'stash' : undefined);
    ui._refreshNow();
  }

  // ---------- hand-in (the Curator's first tab) ----------
  function handIn() {
    const c = co();
    const body = h('div', { class: 'ed-body' });
    if (!c) { body.appendChild(h('div', { class: 'ed-note', text: 'The Curator has nothing to say yet.' })); return body; }
    const list = wantedList(), pages = pageMap();
    const bag = list.filter(function (w) { return w.source === 'bag'; });
    const loose = S.scene === 'town' ? bag.filter(function (w) { return !w.item.locked; }).length : 0;
    const auto = c.isAuto && c.isAuto();
    const all = ui._btn(loose ? 'Hand in all (' + loose + ')' : 'Nothing to hand in', function () {
      let n = 0;
      try { n = c.registerAll() | 0; } catch (err) { console.error('[ui registerAll]', err); }
      ui._sfx(n ? 'quest' : 'error');
      ui._refreshNow();
    }, 'gold');
    if (!loose) all.disabled = true;
    const auto2 = ui._btn('Auto: ' + (auto ? 'On' : 'Off'), function () {
      try { c.setAuto(!auto); } catch (err) { /* ignore */ }
      if (G.meta && G.meta.save) G.meta.save();
      ui._refreshNow();
    }, auto ? 'on' : '');
    body.appendChild(h('div', { class: 'ed-cur-act' }, all, auto2));
    body.appendChild(h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: auto
      ? 'On arriving in town the Curator takes every piece the book wants (locked items stay with you).'
      : 'Pieces the book wants carry a teal book mark. One tap hands one in; it is consumed.' }));
    const row = function (w) {
      const pg = pages[w.page];
      const b = h('button', { type: 'button', class: 'ed-row', 'aria-label': 'Hand in ' + (w.item.name || 'item'), onclick: function () { register(w); } },
        ui._icon(w.item.icon, 32),
        h('span', { class: 'n', style: 'color:' + ui._rarityColor(w.item.rarity) }, w.item.name,
          h('small', { text: (pg ? pg.name + ' ' + pg.count + '/' + pg.total : '') + (w.source === 'stash' ? ' · in stash' : '') + (w.item.locked ? ' · locked' : '') })),
        h('i', { class: 'bk' }));
      const look = h('button', { type: 'button', class: 'ed-btn ed-pinfo', 'aria-label': 'Look at ' + w.item.name, onclick: function (e) {
        e.stopPropagation(); ui._sfx('click');
        ui._showItem(w.item, [{ label: 'Hand in', cls: 'gold', fn: function () { register(w); } }], { lock: false });
      } }, '?');
      return h('div', { style: 'display:flex;align-items:center' }, b, look);
    };
    if (!list.length) body.appendChild(h('div', { class: 'ed-box ed-note', text: 'Nothing you carry fills a gap in the book. Look for the teal book mark on drops.' }));
    else {
      body.appendChild(h('div', { class: 'ed-h', text: 'Wanted pieces' }));
      list.forEach(function (w) { body.appendChild(row(w)); });
    }
    return body;
  }

  // ---------- the book ----------
  function pageRow(pg, view, inBag) {
    const full = pg.total > 0 && pg.count >= pg.total;
    return h('button', { type: 'button', class: 'ed-pg' + (pg.done ? ' done' : ''), 'aria-label': pg.name + ' ' + pg.count + ' of ' + pg.total, onclick: function () { ui._sfx('click'); view.page = pg.id; ui._refreshNow(); } },
      h('div', { class: 't' }, h('b', { class: pg.done ? 'ed-gold' : null, text: pg.name }),
        h('span', { class: pg.done ? 'ed-gold' : 'ed-dim', text: (pg.done ? '✓ ' : '') + pg.count + '/' + pg.total })),
      h('div', { class: 'ed-prog' + (full ? ' done' : '') }, h('i', { style: 'width:' + (pg.total ? Math.round(pg.count / pg.total * 100) : 0) + '%' })),
      h('small', { text: (KIND_NAME[pg.kind] || pg.kind) + ' · ' + (pg.hint || '') + (inBag ? '  ·  ' + inBag + ' in your bag' : '') }));
  }

  function pageDetail(view, pg, wl) {
    const body = h('div', { class: 'ed-body' });
    body.appendChild(h('div', { class: 'ed-box' },
      h('div', { class: 'ed-h', text: pg.name }),
      h('div', { class: 'ed-kv' }, h('span', { text: 'Collected' }), h('b', { text: pg.count + ' / ' + pg.total })),
      h('div', { class: 'ed-prog' + (pg.done ? ' done' : '') }, h('i', { style: 'width:' + (pg.total ? Math.round(pg.count / pg.total * 100) : 0) + '%' })),
      h('div', { class: 'ed-note', text: 'Drops: ' + (pg.hint || 'unknown') }),
      h('div', { class: pg.done ? 'ed-gold' : 'ed-note', style: 'margin-top:4px', text: (pg.done ? 'Claimed: ' : 'Reward: ') + rewardText(pg.reward) })));
    const mine = wl.filter(function (w) { return w.page === pg.id; });
    body.appendChild(h('div', { class: 'ed-slots' }, pg.entries.map(function (e) {
      const heldHere = mine.filter(function (w) { return w.entry === e.key; })[0];
      if (e.have) {
        return h('div', { class: 'ed-slot have' }, h('span', { class: 'ck', text: '✓' }),
          h('div', null, e.label, h('small', { style: e.item ? 'color:' + ui._rarityColor(e.item.rarity) : null, text: (e.item && e.item.name) || 'Registered' })));
      }
      if (heldHere) {
        return h('button', { type: 'button', class: 'ed-slot', style: 'border-style:solid;border-color:#2fb7a6;text-align:left;pointer-events:auto', onclick: function () { register(heldHere); } },
          h('i', { class: 'bk' }), h('div', null, e.label, h('small', { style: 'color:' + ui._rarityColor(heldHere.item.rarity), text: 'Tap to hand in: ' + heldHere.item.name })));
      }
      return h('div', { class: 'ed-slot' }, h('span', { class: 'ck', style: 'color:#4a433c', text: '?' }), h('div', null, e.label, h('small', { text: 'Missing' })));
    })));
    return body;
  }

  function bookBody(view) {
    const c = co();
    if (!c) return h('div', { class: 'ed-body' }, h('div', { class: 'ed-note', text: 'The Collection Book is not available yet.' }));
    let pages = [], prog = null;
    try { pages = c.getPages() || []; prog = c.getProgress ? c.getProgress() : null; } catch (err) { console.error('[ui collection]', err); }
    const wl = wantedList();
    if (view.page) {
      const pg = pages.filter(function (x) { return x.id === view.page; })[0];
      if (pg) return pageDetail(view, pg, wl);
      view.page = null;
    }
    const body = h('div', { class: 'ed-body' });
    if (prog) {
      body.appendChild(h('div', { class: 'ed-box', style: 'margin-bottom:8px' },
        h('div', { class: 'ed-kv' }, h('b', { class: 'ed-gold', text: 'Pages complete' }), h('b', { text: prog.pages + ' / ' + prog.total })),
        h('div', { class: 'ed-prog' + (prog.pages >= prog.total ? ' done' : '') }, h('i', { style: 'width:' + (prog.total ? Math.round(prog.pages / prog.total * 100) : 0) + '%' })),
        (prog.tiers || []).map(function (t) {
          return h('div', { class: 'ed-tier' + (t.claimed ? ' on' : '') }, h('b', { text: t.claimed ? '✓' : t.need }),
            h('span', null, t.name, h('div', { class: 'ed-note', text: (t.claimed ? 'Claimed: ' : 'At ' + t.need + ' pages: ') + tierText(t) })));
        }),
        prog.stash ? h('div', { class: 'ed-note', style: 'margin-top:4px', text: 'Extra stash rows from the book: ' + prog.stash }) : null));
      if (prog.titles && prog.titles.length) {
        body.appendChild(h('div', { class: 'ed-h', text: 'Titles' }));
        body.appendChild(h('div', { class: 'ed-seg', style: 'flex-wrap:wrap' }, prog.titles.map(function (t) {
          return ui._btn(t, function () { S.flags.title = S.flags.title === t ? null : t; if (G.meta && G.meta.save) G.meta.save(); ui._refreshNow(); }, S.flags.title === t ? 'gold on' : '');
        })));
      }
    }
    const f = view.kind || 'all';
    body.appendChild(h('div', { class: 'ed-seg' }, KINDS.map(function (k) { return ui._btn(k[1], function () { view.kind = k[0]; ui._refreshNow(); }, f === k[0] ? 'gold on' : ''); })));
    const bagBy = {};
    wl.forEach(function (w) { if (w.source === 'bag') bagBy[w.page] = (bagBy[w.page] || 0) + 1; });
    const shown = pages.filter(function (pg) { return f === 'all' || kindOf(pg) === f; }).sort(function (a, b) {
      return (!!bagBy[b.id] - !!bagBy[a.id]) || (a.done - b.done) || ((b.count / (b.total || 1)) - (a.count / (a.total || 1)));
    });
    shown.forEach(function (pg) { body.appendChild(pageRow(pg, view, bagBy[pg.id])); });
    return body;
  }
  ui._bookBody = bookBody;
  ui._handInBody = handIn;

  ui._register('collection', {
    render: function (view) {
      if (!view.tab) view.tab = ui._wantedCount() > 0 ? 'hand' : 'book';
      const back = view.tab === 'book' && view.page ? [ui._btn('◀ Pages', function () { view.page = null; ui._refreshNow(); })] : null;
      return ui._frame('Collection', {
        tabs: [{ id: 'hand', label: 'Hand in', badge: ui._wantedCount() || null }, { id: 'book', label: 'Book' }],
        tab: view.tab, onTab: function (id) { view.tab = id; ui._refreshNow(); }, right: back,
      }, view.tab === 'hand' ? handIn() : bookBody(view));
    },
  });

  // ---------- relics ----------
  function relicsBody() {
    const I = G.items;
    const body = h('div', { class: 'ed-body' });
    if (!I || !I.RELICS || !I.RELIC_IDS) { body.appendChild(h('div', { class: 'ed-note', text: 'The fallen have left nothing yet.' })); return body; }
    const ids = I.RELIC_IDS;
    const held = ids.filter(function (id) { return I.hasRelic(id); });
    const combined = !!(I.relicsCombined && I.relicsCombined());
    body.appendChild(h('div', { class: 'ed-box', style: 'margin-bottom:8px' },
      h('div', { class: 'ed-kv' }, h('b', { class: 'ed-gold', text: 'Relics claimed' }), h('b', { text: held.length + ' / ' + ids.length })),
      h('div', { class: 'ed-prog' + (held.length >= ids.length ? ' done' : '') }, h('i', { style: 'width:' + Math.round(held.length / ids.length * 100) + '%' })),
      h('div', { class: 'ed-note', text: combined ? 'Combined: the fallen fight beside you.' : 'Each fallen adventurer leaves a permanent power. Claim all ten and they combine into something greater.' })));
    const T = I.RELICS_COMBINED;
    if (I.canCombineRelics && I.canCombineRelics()) {
      const town = S.scene === 'town';
      const b = ui._btn('Combine the relics' + (T && T.name ? ': ' + T.name : ''), function () {
        let done = false;
        try { done = !!I.combineRelics(); } catch (err) { console.error('[ui combineRelics]', err); }
        ui._sfx(done ? 'quest' : 'error');
        ui._refreshNow();
      }, 'big gold');
      b.style.width = '100%'; b.style.marginBottom = '8px';
      if (!town) b.disabled = true;
      body.appendChild(b);
      if (!town) body.appendChild(h('div', { class: 'ed-note', style: 'margin:-4px 0 8px', text: 'The Elder in ' + (ui._townName ? ui._townName() : 'town') + ' can bind them.' }));
    }
    if (combined && T) {
      body.appendChild(h('div', { class: 'ed-box', style: 'margin-bottom:8px;border-color:#a8873a' },
        h('div', { class: 'ed-h', text: T.name + (T.title ? ' — ' + T.title : '') }),
        T.story ? h('div', { class: 'ed-note', text: T.story }) : null,
        h('div', { style: 'color:var(--bone);font-weight:normal;font-size:11px', text: buffText(T.stats) }),
        T.effectText ? h('div', { class: 'ed-good', style: 'font-weight:normal;font-size:11px;margin-top:2px', text: T.effectText }) : null));
    }
    const grid = h('div', { class: 'ed-relics' });
    ids.forEach(function (id) {
      const r = I.RELICS[id];
      if (!r) return;
      const has = I.hasRelic(id);
      const cls = G.game && G.game.CLASSES && G.game.CLASSES[r.classId];
      if (!has) {
        grid.appendChild(h('div', { class: 'ed-relic', 'aria-label': 'Unclaimed relic' }, h('div', { class: 'sil', text: '?' }),
          h('div', null, h('b', { class: 'ed-dim', text: '???' }), h('small', { text: 'Near depth ' + r.depth + ((cls && cls.name) ? ' · ' + cls.name : '') }))));
        return;
      }
      grid.appendChild(h('div', { class: 'ed-relic have' }, h('div', { class: 'sil', text: '✦' }),
        h('div', { style: 'min-width:0' }, h('b', { text: r.name }), h('small', { text: buffText(r.stats) }),
          r.effectText ? h('small', { class: 'fx', text: r.effectText }) : null,
          r.story ? h('small', { style: 'font-style:italic', text: r.story }) : null)));
    });
    body.appendChild(grid);
    return body;
  }
  ui._relicsBody = relicsBody;
  ui._relicsCount = function () { try { return G.items && G.items.relicCount ? G.items.relicCount() : 0; } catch (err) { return 0; } };
  ui._register('relics', { render: function () { return ui._frame('Relics', null, relicsBody()); } });

  // Isra's own words when a page or milestone completes (story_data.js CURATOR); the items team's toast carries the numbers
  function curatorSays(list) {
    const D = G.meta && G.meta.STORY && G.meta.STORY.CURATOR;
    const l = D && D[list];
    if (!l || !l.length) return;
    const nm = G.meta._fillNames || String;
    setTimeout(function () { ui._banner('Isra Vell', nm(l[Math.floor(Math.random() * l.length)]), '#7fd4c8', 5); }, 900);
  }
  G.on('collection:page', function () { curatorSays('pageDone'); });
  G.on('collection:tier', function () { curatorSays('tierDone'); });

  // events: a hand-in / claim while the book or relics are open repaints through the usual dirty flag
  ['collection:registered', 'collection:page', 'collection:tier', 'relic:granted', 'relic:combined'].forEach(function (n) { G.on(n, ui._refresh); });
})();
