// NPC panels by role (npc:interact) + stash + quest list shared with the quest log.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h, fmt = ui._fmt;

  // R12: every townsperson may give quests of their own; the tab shows only while they have some (story_data SIDE / VENDOR_QUESTS with a `role`)
  const hasQuests = function (role) { return !!(G.meta && G.meta.getQuests && G.meta.getQuests().some(function (q) { return q.giverRole === role && q.status !== 'done'; })); };
  const QT = ['quests', TX.common.quests, hasQuests];
  const NPC = {
    // Buyback lives at the top of every Sell tab (R3 navigation pass: one tab fewer, one tap per item back).
    merchant:    { title: TX.npc.merchant,     line: TX.npc.coinFirstQuestionsAfter,          tabs: [['buy', TX.npc.buy], ['sell', TX.common.sell], QT] },
    blacksmith:  { title: TX.npc.blacksmith,   line: TX.npc.steelDoesNotLie,             tabs: [['buy', TX.npc.buy], ['forge', TX.npc.forge], ['sockets', TX.sockets.sockets2], ['sell', TX.common.sell], QT] },
    mystic:      { title: TX.npc.mystic,       line: TX.npc.theVeilIsThin,    tabs: [['gamble', TX.npc.gamble], ['enchant', TX.npc.reroll], ['buy', TX.npc.buy], ['sell', TX.common.sell], QT] },
    healer:      { title: TX.npc.healer,       line: TX.npc.sitBleedQuietlyThis,       tabs: [['heal', TX.npc.heal], QT] },
    // R7.10: the Relics tab appears once the player holds a relic (and stays after the combine)
    elder:       { title: TX.npc.elder,        line: TX.npc.theDeepRemembersEvery,  tabs: [['quests', TX.common.quests], ['relics', TX.common.relics, function () { return ui._relicsCount && ui._relicsCount() > 0; }]] },
    stashkeeper: { title: TX.npc.stashKeeper, line: TX.npc.whatYouLeaveWith,           tabs: [['stash', TX.common.stash], QT] },
    // R7.11: the Curator keeps the Collection Book (curator.js)
    // R7.7 friendly floors: world places refugees and a camp merchant on cleansed floors (story_data.js CAMP supplies the people)
    refugee:     { title: TX.npc.refugee,      line: TX.npc.youCameDownHere,                            tabs: [['talk', TX.npc.talk], QT] },
    camp_merchant: { title: TX.npc.campMerchant, line: TX.npc.foundItOnA,              tabs: [['buy', TX.npc.buy], ['sell', TX.common.sell], QT] },
    curator:     { title: TX.common.curator,      line: TX.npc.everyPieceInIts,       tabs: [['hand', TX.common.handIn], ['book', TX.common.book], QT] },
  };
  const NPC_SPRITE = {
    merchant: { body: 'humanoid', color: '#8a6a3a', accent: '#d8c9a3', scale: 1 },
    blacksmith: { body: 'brute', color: '#6b4a3a', accent: '#c8c8c8', scale: 1 },
    mystic: { body: 'caster', color: '#6a3a8a', accent: '#b65bff', scale: 1 },
    healer: { body: 'caster', color: '#d8d8e8', accent: '#d0202c', scale: 1 },
    elder: { body: 'humanoid', color: '#5a5a6a', accent: '#d8c9a3', scale: 1 },
    stashkeeper: { body: 'humanoid', color: '#3a5a4a', accent: '#ffd94a', scale: 1 },
    curator: { body: 'humanoid', color: '#2a6a62', accent: '#9ae6d8', scale: 1 },
    refugee: { body: 'humanoid', color: '#7a6a52', accent: '#c9b89a', scale: 1 },
    camp_merchant: { body: 'humanoid', color: '#8a6a3a', accent: '#d8c9a3', scale: 1 },
  };

  // The named person behind a camp NPC: pick the camp for this floor's depth, then a stable member of it (vendors for the camp
  // merchant). Lines rotate per visit. Returns { name, look, line } or null when the story data has no camps.
  const campVisits = {};
  function campPerson(role, ent) {
    const camps = (G.meta && G.meta.STORY && G.meta.STORY.CAMP) || [];
    if (!camps.length) return null;
    const act = S.flags.act | 0 || 1;
    const camp = camps.filter(function (c) { return S.depth >= c.band[0] && S.depth <= c.band[1]; })[0]
      || camps.filter(function (c) { return act > c.act; }).pop() || camps[0];
    let pool = camp.npcs;
    if (role === 'camp_merchant') pool = pool.filter(function (n) { return n.role === 'merchant'; }); else pool = pool.filter(function (n) { return n.role !== 'merchant'; });
    if (!pool.length) pool = camp.npcs;
    const key = (ent && ent.id != null ? ent.id : 0) | 0;
    const who = pool[Math.abs(key) % pool.length];
    const n = campVisits[key] = (campVisits[key] || 0) + 1;
    const nm = (G.meta._fillNames || String);
    return { id: who.id || null, name: who.name, look: who.look, line: nm(who.lines[(n - 1) % who.lines.length]), camp: camp.name };
  }
  const GAMBLE_SLOTS = [['weapon', TX.common.weapon, 'sword'], ['offhand', TX.npc.offhand, 'shield'], ['helm', TX.common.helm, 'helm'], ['chest', TX.common.armor, 'armor'],
    ['gloves', TX.common.gloves, 'gloves'], ['boots', TX.common.boots, 'boots'], ['belt', TX.common.belt, 'belt'], ['amulet', TX.common.amulet, 'amulet'], ['ring', TX.common.ring, 'ring']];
  const STATUS = { available: ['New', '#ff8a2b'], active: ['Active', '#d8c9a3'], ready: ['Complete', '#ffd94a'], done: ['Done', '#8f8470'] };

  const call = ui._itemsCall;

  function stock(role) {
    if (!G.items || !G.items.getVendorStock) return [];
    try { return G.items.getVendorStock(role) || []; } catch (err) { console.error('[ui stock]', err); return []; }
  }

  function potionRows(p) {
    if (!G.items || !G.items.buyPotion) return null;
    return [['hp', TX.npc.healthPotion, '#d0202c'], ['mp', TX.npc.manaPotion, '#2a56c6']].map(function (k) {
      let price = null;
      if (G.items.potionPrice) { try { price = G.items.potionPrice(k[0]); } catch (err) { price = null; } }
      return h('button', { type: 'button', class: 'ed-row', onclick: function () {
        const done = call('buyPotion', k[0]);
        ui._sfx(done ? 'buy' : 'error');
        ui._refreshNow();
      } }, ui._icon({ shape: 'potion', color: k[2] }, 32),
        h('span', { class: 'n' }, k[1], h('small', { text: TX.npc.youCarry + ((p.potions && p.potions[k[0]]) | 0) })),
        price != null ? h('span', { class: p.gold >= price ? 'ed-gold' : 'ed-bad', text: fmt(price) + ' g' }) : null);
    });
  }

  function buyTab(role, p, withPotions, max) {
    const list = stock(role);
    const body = h('div', { class: 'ed-body' });
    if (withPotions) { const rows = potionRows(p); if (rows) rows.forEach(function (r) { body.appendChild(r); }); }
    list.forEach(function (entry, i) {
      if (max && i >= max) return;
      if (!entry || !entry.item) return;
      const it = entry.item;
      const afford = (p.gold || 0) >= entry.price;
      const v = ui._verdict(it);
      body.appendChild(h('button', { type: 'button', class: 'ed-row', onclick: function () {
        ui._sfx('click');
        const b = { label: TX.npc.buy2 + fmt(entry.price) + 'g', cls: 'gold', fn: function () {
          const done = call('buy', role, i);
          ui._sfx(done ? 'buy' : 'error');
        } };
        ui._showItem(it, [b], { price: entry.price });
      } }, ui._icon(it.icon, 32),
        h('span', { class: 'n', style: 'color:' + ui._rarityColor(it.rarity) }, it.name,
          v === 'up' ? h('span', { class: 'ed-good', text: ' ▲' }) : (v === 'down' ? h('span', { class: 'ed-bad', text: ' ▼' }) : null)),
        h('span', { class: afford ? 'ed-gold' : 'ed-bad', text: fmt(entry.price) + ' g' })));
    });
    if (!body.childNodes.length) body.appendChild(h('div', { class: 'ed-note', text: TX.npc.nothingForSaleRight }));
    return body;
  }

  // R12: a switch at the top of every shop between the vendor's stock and your own gear (paper doll + bag), so you can compare
  // and equip without leaving the shop.
  function gearToggle(view, stockFn, vrole, p, camp) {
    const body = view.gear ? h('div', { class: 'ed-body' },
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.npc.tapWornGearTo }),
      h('div', { class: 'ed-inv' }, h('div', { class: 'ed-dollwrap' }, ui._doll(p), ui._summary(p)), ui._invGrid(p, 'inv'))) : stockFn(vrole, p, vrole === 'merchant', camp ? 8 : 0);
    const sw = h('div', { class: 'ed-gearsw' },
      ui._btn(TX.npc.forSale, function () { view.gear = false; ui._refreshNow(); }, view.gear ? '' : 'gold on'),
      ui._btn(TX.npc.yourGear, function () { view.gear = true; ui._refreshNow(); }, view.gear ? 'gold on' : ''));
    body.insertBefore(sw, body.firstChild);
    return body;
  }

  function matsLine(p) {
    const m = p.materials && typeof p.materials === 'object' ? p.materials : {};
    return Object.keys(m).filter(function (k) { return typeof m[k] === 'number'; }).map(function (k) { return m[k] + ' ' + ui._matName(k); }).join(', ');
  }
  function costOk(p, c) {
    if (!c) return false;
    const m = p.materials || {};
    if ((p.gold || 0) < (c.gold || 0)) return false;
    for (const k in c) if (k !== 'gold' && typeof c[k] === 'number' && (m[k] || 0) < c[k]) return false;
    return true;
  }

  // R2.7 buyback, shown at the top of the Sell tab: one tap on a row buys it back (no popup — the price is on the row).
  let bbOpen = false;
  function buybackRows(p, max) {
    let list = [];
    if (G.items && G.items.getBuyback) { try { list = G.items.getBuyback() || []; } catch (err) { console.error('[ui buyback]', err); list = []; } }
    if (!list.length) return null;
    // R16: a collapsed dropdown, so the bag itself is visible without scrolling
    const box = h('div', { class: 'ed-box ed-bb', style: 'margin-bottom:8px' },
      h('button', { type: 'button', class: 'ed-btn ed-bbhead', 'aria-expanded': bbOpen ? 'true' : 'false', onclick: function () { ui._sfx('click'); bbOpen = !bbOpen; ui._refreshNow(); } },
        TX.sell.buyBack + ' (' + list.length + ') ' + (bbOpen ? '▴' : '▾')));
    if (!bbOpen) return box;
    list.forEach(function (entry, i) {
      if (max && i >= max) return;
      if (!entry || !entry.item) return;
      const it = entry.item, afford = (p.gold || 0) >= entry.price;
      box.appendChild(h('button', { type: 'button', class: 'ed-row', 'aria-label': 'Buy back ' + it.name, onclick: function () {
        const done = afford && call('buyback', i);
        ui._sfx(done ? 'buy' : 'error');
        ui._refreshNow();
      } }, ui._icon(it.icon, 32),
        h('span', { class: 'n', style: 'color:' + ui._rarityColor(it.rarity) }, (it.qty > 1 ? it.qty + ' ' : '') + it.name),
        h('span', { class: afford ? 'ed-gold' : 'ed-bad', text: fmt(entry.price) + ' g' })));
    });
    return box;
  }

  // R5.8: "Sell all ≤ White / Blue / Yellow" — one tap, then a confirm that names the count and the gold.
  // Never touches sets, Legendary, gems, lore or locked items (the items module enforces it; the preview shows it).
  const MASS = ['common', 'uncommon', 'rare'];
  function massPreview(r) {
    if (G.items && G.items.previewSellAtOrBelow) { try { return G.items.previewSellAtOrBelow(r) || { count: 0, gold: 0 }; } catch (err) { return null; } }
    return null;
  }
  function massSell(r) {
    const name = (C.RARITY[r] && C.RARITY[r].name) || r;
    const pv = massPreview(r);
    if (pv && !(pv.count > 0)) { ui._sfx('error'); ui.toast(TX.npc.nothing + name + TX.npc.orBelowToSell, '#a89f8f'); return; }
    const go = function () {
      let res = null;
      try { res = G.items.sellAtOrBelow(r); } catch (err) { console.error('[ui sellAtOrBelow]', err); }
      if (res && res.count > 0) { ui._sfx('sell'); ui.toast(TX.npc.sold + res.count + TX.chute.item + (res.count === 1 ? '' : 's') + TX.filter.for + fmt(res.gold || 0) + TX.filter.gold, '#dfc06a'); }
      else ui._sfx('error');
      ui._refreshNow();
    };
    const what = pv ? pv.count + ' item' + (pv.count === 1 ? '' : 's') + ' for ' + fmt(pv.gold || 0) + ' gold' : 'everything ' + name + ' or below';
    ui._confirm(TX.filter.sell + what + '?', 'Sell', go,
      { note: (pv && pv.gems > 0 ? pv.gems + TX.npc.socketedGemsWillBe : '') + TX.npc.lockedItemsSetPieces });
  }
  function massRow() {
    if (!G.items || !G.items.sellAtOrBelow) return null;
    return h('div', { class: 'ed-mass' }, h('span', { class: 'ed-note', text: TX.npc.sellAll }), MASS.map(function (r) {
      const rar = C.RARITY[r];
      const pv = massPreview(r);
      const b = ui._btn([h('span', { text: '≤ ' + ((rar && rar.name) || r) }), pv ? h('small', { text: (pv.count | 0) + ' · ' + fmt(pv.gold || 0) + 'g' }) : null], function () { massSell(r); });
      if (pv && !(pv.count > 0)) b.disabled = true;
      else b.style.color = (rar && rar.color) || '';
      return b;
    }));
  }

  function sellTab(role, p) {
    return h('div', { class: 'ed-body' }, buybackRows(p), ui._filterBox ? ui._filterBox('bag') : massRow(),
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.npc.tapAnItemTo }),
      ui._invGrid(p, 'sell', role));
  }

  // Blacksmith: gear upgrades / salvage / gem removal, plus cutting a gem one tier up with gem dust (R3.2).
  function forgeTab(p) {
    const mats = matsLine(p);
    return h('div', { class: 'ed-body' },
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.npc.tapGearToUpgrade + (mats ? TX.npc.youHave + mats + '.' : '') }),
      h('div', { class: 'ed-inv' },
        h('div', { class: 'ed-dollwrap' }, ui._doll(p, function (slot, item) {
          const u = ui._upgradeInfo(item);
          const acts = [{ label: TX.common.upgrade, cls: 'gold', disabled: u.blocked, fn: function () { if (call('upgrade', slot) === false) ui._sfx('error'); } }];
          const cl = ui._cleanseAction(item, slot), info = u.line ? [u.line] : [];
          if (cl) { acts.push(cl); info.push({ text: cl.info, bad: cl.bad }); }
          return { acts: acts.concat(ui._unsocketActions(item, slot)), info: info };
        })),
        ui._invGrid(p, 'forge', 'blacksmith', function (it) { return !!it.slot || it.type === 'gem'; })));
  }

  // R16.8 Blacksmith: add a socket to any chosen item for gold; the price climbs steeply with every socket, up to 6
  function socketsTab(p) {
    const rows = (ui._gearList ? ui._gearList(false) : []).map(function (r) {
      const it = r.item, n = it.sockets ? it.sockets.length : 0;
      let cost = null;
      try { cost = G.items && G.items.socketCost ? G.items.socketCost(it) : null; } catch (err) { cost = null; }
      const b = h('button', { type: 'button', class: 'ed-row', onclick: function () {
        ui._sfx('click');
        if (!cost) return;
        ui._confirm(TX.sockets.addASocketTo2 + it.name + '?', TX.sockets.addSocket + fmt(cost.gold) + 'g', function () { const ok2 = call('addSocket', it); ui._sfx(ok2 ? 'equip' : 'error'); ui._refreshNow(); },
          { note: TX.sockets.thisItemHasN + n + TX.sockets.ofSocketsTheNext + (n + 1) + TX.sockets.costsMoreStill });
      } }, ui._icon(it.icon, 32),
        h('span', { class: 'n', style: 'color:' + ui._rarityColor(it.rarity) }, it.name, h('small', { text: r.where + ' · ' + TX.sockets.sockets + n + '/6' + (cost ? TX.sockets.nextOne + (n + 1) : '') })),
        h('span', { class: cost ? ((p.gold || 0) >= cost.gold ? 'ed-gold' : 'ed-bad') : 'ed-dim', text: cost ? fmt(cost.gold) + ' g' : TX.sockets.full }));
      if (!cost || (p.gold || 0) < cost.gold) b.style.opacity = '.7';
      return b;
    });
    return h('div', { class: 'ed-body' }, h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.sockets.chooseAnItemThe }), rows.length ? rows : h('div', { class: 'ed-note', text: TX.sockets.youCarryNothingTo }));
  }

  // Mystic: reroll one affix of a rare-or-better item for gem dust + gold (R3.2). Pick the item, then the line to change.
  function enchantTab(p) {
    if (!G.items || !G.items.rerollAffix || !G.items.rerollCost) {
      return h('div', { class: 'ed-body' }, h('div', { class: 'ed-note', text: TX.npc.theMysticCannotDo }));
    }
    const rows = [];
    const add = function (item, target, where) {
      if (!item || !item.slot || !ui._rarityAtLeast(item.rarity, 'rare') || !(item.mods || []).length) return;
      rows.push(h('button', { type: 'button', class: 'ed-row', onclick: function () { ui._sfx('click'); rerollPick(p, item, target); } },
        ui._icon(item.icon, 32),
        h('span', { class: 'n', style: 'color:' + ui._rarityColor(item.rarity) }, item.name, h('small', { text: where }))));
    };
    for (const slot of C.EQUIP_SLOTS) add(p.equipment && p.equipment[slot], slot, 'Equipped');
    (p.inventory || []).forEach(function (it, i) { add(it, i, 'In your pack'); });
    const mats = matsLine(p);
    return h('div', { class: 'ed-body' },
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.npc.changeOnePropertyOf + (mats ? TX.npc.youHave + mats + '.' : '') }),
      rows.length ? rows : h('div', { class: 'ed-note', text: TX.npc.youCarryNothingThe }));
  }
  function rerollPick(p, item, target) {
    let close = null;
    const list = (item.mods || []).map(function (m, mi) {
      let cost = null;
      try { cost = G.items.rerollCost(target, mi); } catch (err) { cost = null; }
      const label = (G.items.formatStat ? G.items.formatStat(m.stat, m.value) : m.stat + ' ' + m.value);
      const b = h('button', { type: 'button', class: 'ed-row', onclick: function () {
        close();
        const done = call('rerollAffix', target, mi);
        ui._sfx(done ? 'shrine' : 'error');
        ui._refreshNow();
      } }, h('span', { class: 'n' }, label, h('small', { text: cost ? TX.npc.reroll2 + ui._matsText(cost) : 'Cannot be changed' })));
      if (!cost || !costOk(p, cost)) b.disabled = true;
      return b;
    });
    close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: TX.npc.rerollWhichLineOf + item.name + '?' }), list],
      [ui._btn(TX.common.cancel, function () { close(); })]));
  }

  function gambleTab(p) {
    return h('div', { class: 'ed-body' },
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.npc.payGoldPickA }),
      h('div', { class: 'ed-gamble' }, GAMBLE_SLOTS.map(function (g) {
        let price = null;
        try {
          if (G.items && G.items.gambleCost) price = G.items.gambleCost(g[0]);
          else if (G.items && G.items.gamblePrice) price = G.items.gamblePrice(g[0]);
        } catch (err) { price = null; }
        return h('button', { type: 'button', class: 'ed-btn', style: 'display:flex;align-items:center;gap:6px;text-align:left', onclick: function () {
          const item = call('gamble', g[0]);
          if (item) {
            ui._sfx('buy');
            ui._refreshNow();
            const inv = p.inventory || [];
            const idx = inv.indexOf(item);
            ui._showItem(item, idx >= 0 ? ui._invActions(item, idx, 'sell', 'mystic') : []);
            ui.toast(TX.npc.theVeilParts + item.name, ui._rarityColor(item.rarity));
          } else ui._sfx('error');
        } }, ui._icon({ shape: g[2], color: '#b65bff', accent: '#ffd94a' }, 32),
          h('span', null, g[1], price != null ? h('div', { class: price > (p.gold || 0) ? 'ed-bad' : 'ed-gold', style: 'font-size:10px', text: fmt(price) + ' g' }) : null));
      })));
  }

  function healTab(p) {
    const st = p.stats || {};
    const hurt = p.hp < (st.hpMax || 0) || p.mp < (st.mpMax || 0);
    const b = ui._btn(hurt ? 'Heal me (free)' : 'You are whole', function () {
      if (G.game && G.game.healPlayer) G.game.healPlayer(true);
      G.emit('fx:spawn', { type: 'heal', x: p.x, y: p.y });
      ui._sfx('potion');
      ui.toast(TX.npc.yourWoundsClose, '#5fd35f');
      ui._refreshNow();
    }, 'big gold');
    b.style.width = '100%';
    if (!hurt) b.disabled = true;
    const body = h('div', { class: 'ed-body' }, h('div', { class: 'ed-list' },
      h('div', { class: 'ed-kv' }, h('span', { text: TX.npc.life }), h('b', { text: fmt(Math.ceil(p.hp)) + ' / ' + fmt(st.hpMax || 0) })),
      h('div', { class: 'ed-kv' }, h('span', { text: TX.npc.mana }), h('b', { text: fmt(Math.floor(p.mp)) + ' / ' + fmt(st.mpMax || 0) })),
      b, h('div', { class: 'ed-h', text: TX.common.potions }), potionRows(p)));
    return body;
  }

  // ---------- quests (elder + log) ----------
  function rewardText(r) {
    const parts = [];
    if (r && r.gold) parts.push(fmt(r.gold) + TX.filter.gold2);
    if (r && r.xp) parts.push(fmt(r.xp) + ' XP');
    const it = r && r.item && G.meta._rarityPick ? G.meta._rarityPick(r.item) : r && r.item;
    if (it) parts.push(((C.RARITY[it] && C.RARITY[it].name) || it) + TX.chute.item);
    if (r && r.mats) parts.push(ui._matsText ? ui._matsText(r.mats) : 'materials');
    if (r && r.mark) parts.push(r.mark + TX.npc.mark + (r.mark > 1 ? 's' : ''));
    if (r && r.tome) parts.push(r.tome + TX.npc.skillPoint + (r.tome > 1 ? 's' : ''));
    if (r && r.crate) parts.push('+' + r.crate + ' crate slots');
    if (r && r.loyalty) parts.push('+' + Math.round((r.loyalty.amount || 0.1) * 100) + TX.npc.crate + (r.loyalty.kind === 'salvage' ? 'salvage' : 'sell') + TX.npc.rate);
    return parts.join(', ');
  }

  function questList(actions, role, npcId) {
    let list = (G.meta && G.meta.getQuests) ? G.meta.getQuests() : [];
    if (role) list = list.filter(function (q) { return role === 'elder' ? !q.giverRole : q.giverRole === role; });
    // several camp people share a role (refugee, camp_merchant): each shows only the quests written for them (line.npc = story CAMP id)
    if (npcId) list = list.filter(function (q) { return !q.npc || q.npc === role || q.npc === npcId; });
    const wrap = h('div', { class: 'ed-list' });
    const order = { ready: 0, active: 1, available: 2, done: 3 };
    const add = function (title, items) {
      if (!items.length) return;
      wrap.appendChild(h('div', { class: 'ed-h', text: title }));
      items.sort(function (a, b) { return order[a.status] - order[b.status]; }).forEach(function (q) {
        const st = STATUS[q.status] || STATUS.active;
        const box = h('div', { class: 'ed-box ed-quest', style: q.status === 'done' ? 'opacity:.55' : null },
          h('div', { class: 't' }, h('b', { text: q.name }), h('span', { class: 'ed-st', style: 'color:' + st[1], text: st[0] })));
        if (q.status !== 'done') {
          if (q.giverName) box.appendChild(h('div', { class: 'ed-note', text: TX.npc.for + q.giverName }));
          box.appendChild(h('p', { text: q.desc }));
          if (q.status !== 'available') {
            box.appendChild(h('div', { class: 'ed-bar' }, h('i', { style: 'width:' + Math.round(Math.min(1, q.progress / (q.goal || 1)) * 100) + '%' })));
            box.appendChild(h('div', { class: 'ed-note', text: q.progress + ' / ' + q.goal }));
          }
          box.appendChild(h('div', { class: 'ed-note', text: TX.npc.reward + rewardText(q.rewards) }));
          if (actions && q.status === 'available') box.appendChild(ui._btn(TX.common.accept, function () { G.meta.acceptQuest(q.id); ui._refreshNow(); }));
          if (actions && q.status === 'ready') box.appendChild(ui._btn(TX.npc.claimReward, function () { G.meta.turnInQuest(q.id); ui._refreshNow(); }, 'gold'));
          if (!actions && q.status === 'ready') box.appendChild(h('div', { class: 'ed-gold', text: q.giverRole ? TX.npc.returnTo + q.giverName + '.' : TX.npc.returnToTheElder + ui._townName() + '.' }));
        }
        wrap.appendChild(box);
      });
    };
    add('The Descent', list.filter(function (q) { return q.main; }));
    add(role && role !== 'elder' ? 'Requests' : 'Townsfolk', list.filter(function (q) { return q.side; }));
    add('Bounties', list.filter(function (q) { return !q.main && !q.side; }));
    if (!list.length) wrap.appendChild(h('div', { class: 'ed-note', text: TX.npc.noQuestsYetSpeak + ui._townName() + '.' }));
    else if (!actions) wrap.appendChild(h('div', { class: 'ed-note', text: TX.curator.theElderIn + ui._townName() + TX.npc.offersQuestsAndPays }));
    return wrap;
  }

  ui._register('quests', {
    render: function () {
      return ui._frame(TX.common.quests, { right: [ui._btn(TX.common.journal, function () { ui.open('journal'); })] }, h('div', { class: 'ed-body' }, questList(false)));
    },
  });

  // ---------- stash ----------
  function stashBody(p) {
    const grid = h('div', { class: 'ed-grid' });
    const stash = S.stash || [];
    let used = 0;
    for (let i = 0; i < C.STASH_SIZE; i++) {
      const it = stash[i] || null;
      if (it) used++;
      grid.appendChild(ui._cell(it, { arrow: true, onTap: function (item) {
        const acts = [{ label: TX.npc.withdraw, cls: 'gold', fn: function () { if (call('stashWithdraw', i) === false) ui._sfx('error'); } }];
        const cur = ui._curatorAction(item, i, 'stash');          // R7.11 hand a stashed piece in without withdrawing it
        if (cur) acts.unshift(cur);
        ui._showItem(item, acts);
      } }));
    }
    return h('div', { class: 'ed-body' },
      h('div', { class: 'ed-h', text: TX.npc.stash + used + '/' + C.STASH_SIZE }), grid,
      h('div', { class: 'ed-h', text: TX.npc.yourPack }), ui._invGrid(p, 'stash'));
  }

  function stashSort() { return [ui._sortButton('both')]; }

  ui._register('stash', {
    render: function () {
      const p = S.player;
      return ui._frame(TX.common.stash, { right: p ? stashSort() : null }, p ? stashBody(p) : h('div', { class: 'ed-body' }));
    },
  });

  // ---------- npc panel ----------
  const lastTab = {};
  ui._register('npc', {
    render: function (view, arg) {
      const p = S.player;
      const role = (arg && arg.role) || 'merchant';
      const def = NPC[role] || NPC.merchant;
      const ent = arg && arg.entity;
      const camp = role === 'refugee' || role === 'camp_merchant';
      const vrole = role === 'camp_merchant' ? 'merchant' : role;          // the camp merchant sells the general merchant's stock
      if (camp && view.person === undefined) view.person = campPerson(role, ent);
      if (!p) return ui._frame(def.title, null, h('div', { class: 'ed-body' }));
      // reopen on the tab used last time at this vendor (session only) — most visits repeat the last errand
      // R7.7 town revival: some services open with later acts (story_data.js TOWN)
      const tabs = def.tabs.filter(function (t) { return (!ui._serviceOpen || ui._serviceOpen(role, t[0])) && (!t[2] || t[2](role)); });
      if (view.tab && !tabs.some(function (t) { return t[0] === view.tab; })) view.tab = null;
      if (!view.tab) view.tab = lastTab[role] && tabs.some(function (t) { return t[0] === lastTab[role]; }) ? lastTab[role] : tabs[0][0];
      lastTab[role] = view.tab;
      let body;
      if (view.tab === 'talk') body = h('div', { class: 'ed-body' }, h('div', { class: 'ed-box' }, h('div', { class: 'ed-h', text: (view.person && view.person.camp) || 'The camp' }),
        h('p', { style: 'font-weight:normal;line-height:18px', text: view.person ? view.person.look : 'Someone who made it up from the dark.' }),
        h('div', { class: 'ed-note', text: TX.npc.floorsYouHaveCleansed })));
      else if (view.tab === 'buy') body = gearToggle(view, buyTab, vrole, p, camp);
      else if (view.tab === 'sell') body = sellTab(vrole, p);
      else if (view.tab === 'forge') body = forgeTab(p);
      else if (view.tab === 'gamble') body = gambleTab(p);
      else if (view.tab === 'sockets') body = socketsTab(p);
      else if (view.tab === 'heal') body = healTab(p);
      else if (view.tab === 'enchant') body = enchantTab(p);
      else if (view.tab === 'quests') body = h('div', { class: 'ed-body' }, questList(true, role, view.person && view.person.id));
      else if (view.tab === 'relics') body = ui._relicsBody();
      else if (view.tab === 'hand') body = ui._handInBody(view);
      else if (view.tab === 'book') body = ui._bookBody(view);
      else body = stashBody(p);
      const right = view.tab === 'stash' ? stashSort()
        : view.tab === 'book' && view.page ? [ui._btn(TX.common.pages, function () { view.page = null; ui._refreshNow(); })] : null;
      const sub = h('div', { class: 'ed-npc' }, ui._portrait((ent && ent.sprite) || NPC_SPRITE[role], 48),
        h('div', { style: 'flex:1;min-width:0' }, h('b', { class: 'ed-ember', text: (view.person && view.person.name) || (ent && ent.name) || def.title }),
          h('p', { text: '"' + ((view.person && view.person.line) || (!camp && ui._townLine && ui._townLine(role)) || def.line) + '"' }), ui._loyaltyEl ? ui._loyaltyEl(role) : null),
        ui._goldEl(p.gold || 0));
      const foot = view.tab === 'sell' ? [
        ui._junkButton(),
        ui._btn(TX.common.junkRules, ui._junkPopup),
        ui._sortButton('inv'),
      ] : null;
      return ui._frame(def.title, {
        tabs: tabs.length > 1 ? tabs.map(function (t) { const m = t[0] === 'quests' && role !== 'elder' && G.meta.npcQuestState ? G.meta.npcQuestState(role) : null; return { id: t[0], label: t[1], badge: m === 'ready' ? '?' : (m === 'available' ? '!' : null) }; }) : null,
        tab: view.tab, onTab: function (id) { view.tab = id; ui._refreshNow(); },
        sub: sub, foot: foot, right: right, compact: true,
      }, body);
    },
  });

  G.on('npc:interact', function (e) {
    if (!e || !S.player || S.scene === 'menu') return;
    ui._sfx('click');
    ui.open('npc', { role: e.role, entity: e.entity });
  });
})();
