// NPC panels by role (npc:interact) + stash + quest list shared with the quest log.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const h = ui._h, fmt = ui._fmt;

  const NPC = {
    // Buyback lives at the top of every Sell tab (R3 navigation pass: one tab fewer, one tap per item back).
    merchant:    { title: 'Merchant',     line: 'Coin first, questions after. What do you need?',          tabs: [['buy', 'Buy'], ['sell', 'Sell']] },
    blacksmith:  { title: 'Blacksmith',   line: 'Steel does not lie. Show me what you carry.',             tabs: [['buy', 'Buy'], ['forge', 'Forge'], ['sell', 'Sell']] },
    mystic:      { title: 'Mystic',       line: 'The veil is thin tonight. Will you wager against it?',    tabs: [['gamble', 'Gamble'], ['enchant', 'Reroll'], ['buy', 'Buy'], ['sell', 'Sell']] },
    healer:      { title: 'Healer',       line: 'Sit. Bleed quietly. This will only take a moment.',       tabs: [['heal', 'Heal']] },
    elder:       { title: 'Elder',        line: 'The deep remembers every name. Make it remember yours.',  tabs: [['quests', 'Quests']] },
    stashkeeper: { title: 'Stash Keeper', line: 'What you leave with me, the dark cannot take.',           tabs: [['stash', 'Stash']] },
  };
  const NPC_SPRITE = {
    merchant: { body: 'humanoid', color: '#8a6a3a', accent: '#d8c9a3', scale: 1 },
    blacksmith: { body: 'brute', color: '#6b4a3a', accent: '#c8c8c8', scale: 1 },
    mystic: { body: 'caster', color: '#6a3a8a', accent: '#b65bff', scale: 1 },
    healer: { body: 'caster', color: '#d8d8e8', accent: '#d0202c', scale: 1 },
    elder: { body: 'humanoid', color: '#5a5a6a', accent: '#d8c9a3', scale: 1 },
    stashkeeper: { body: 'humanoid', color: '#3a5a4a', accent: '#ffd94a', scale: 1 },
  };
  const GAMBLE_SLOTS = [['weapon', 'Weapon', 'sword'], ['offhand', 'Offhand', 'shield'], ['helm', 'Helm', 'helm'], ['chest', 'Armor', 'armor'],
    ['gloves', 'Gloves', 'gloves'], ['boots', 'Boots', 'boots'], ['belt', 'Belt', 'belt'], ['amulet', 'Amulet', 'amulet'], ['ring', 'Ring', 'ring']];
  const STATUS = { available: ['New', '#ff8a2b'], active: ['Active', '#d8c9a3'], ready: ['Complete', '#ffd94a'], done: ['Done', '#8f8470'] };

  const call = ui._itemsCall;

  function stock(role) {
    if (!G.items || !G.items.getVendorStock) return [];
    try { return G.items.getVendorStock(role) || []; } catch (err) { console.error('[ui stock]', err); return []; }
  }

  function potionRows(p) {
    if (!G.items || !G.items.buyPotion) return null;
    return [['hp', 'Health Potion', '#d0202c'], ['mp', 'Mana Potion', '#2a56c6']].map(function (k) {
      let price = null;
      if (G.items.potionPrice) { try { price = G.items.potionPrice(k[0]); } catch (err) { price = null; } }
      return h('button', { type: 'button', class: 'ed-row', onclick: function () {
        const done = call('buyPotion', k[0]);
        ui._sfx(done ? 'buy' : 'error');
        ui._refreshNow();
      } }, ui._icon({ shape: 'potion', color: k[2] }, 32),
        h('span', { class: 'n' }, k[1], h('small', { text: 'You carry ' + ((p.potions && p.potions[k[0]]) | 0) })),
        price != null ? h('span', { class: p.gold >= price ? 'ed-gold' : 'ed-bad', text: fmt(price) + ' g' }) : null);
    });
  }

  function buyTab(role, p, withPotions) {
    const list = stock(role);
    const body = h('div', { class: 'ed-body' });
    if (withPotions) { const rows = potionRows(p); if (rows) rows.forEach(function (r) { body.appendChild(r); }); }
    list.forEach(function (entry, i) {
      if (!entry || !entry.item) return;
      const it = entry.item;
      const afford = (p.gold || 0) >= entry.price;
      const v = ui._verdict(it);
      body.appendChild(h('button', { type: 'button', class: 'ed-row', onclick: function () {
        ui._sfx('click');
        const b = { label: 'Buy ' + fmt(entry.price) + 'g', cls: 'gold', fn: function () {
          const done = call('buy', role, i);
          ui._sfx(done ? 'buy' : 'error');
        } };
        ui._showItem(it, [b], { price: entry.price });
      } }, ui._icon(it.icon, 32),
        h('span', { class: 'n', style: 'color:' + ui._rarityColor(it.rarity) }, it.name,
          v === 'up' ? h('span', { class: 'ed-good', text: ' ▲' }) : (v === 'down' ? h('span', { class: 'ed-bad', text: ' ▼' }) : null)),
        h('span', { class: afford ? 'ed-gold' : 'ed-bad', text: fmt(entry.price) + ' g' })));
    });
    if (!body.childNodes.length) body.appendChild(h('div', { class: 'ed-note', text: 'Nothing for sale right now.' }));
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
  function buybackRows(p) {
    let list = [];
    if (G.items && G.items.getBuyback) { try { list = G.items.getBuyback() || []; } catch (err) { console.error('[ui buyback]', err); list = []; } }
    if (!list.length) return null;
    const box = h('div', { class: 'ed-box', style: 'margin-bottom:8px' }, h('div', { class: 'ed-h', text: 'Sold — tap to buy back' }));
    list.forEach(function (entry, i) {
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

  function sellTab(role, p) {
    return h('div', { class: 'ed-body' }, buybackRows(p),
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: 'Tap an item to sell it.' }),
      ui._invGrid(p, 'sell', role));
  }

  // Blacksmith: gear upgrades / salvage / gem removal, plus cutting a gem one tier up with gem dust (R3.2).
  function forgeTab(p) {
    const mats = matsLine(p);
    return h('div', { class: 'ed-body' },
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: 'Tap gear to upgrade or break it down, a cut gem to improve it.' + (mats ? ' You have ' + mats + '.' : '') }),
      h('div', { class: 'ed-inv' },
        h('div', { class: 'ed-dollwrap' }, ui._doll(p, function (slot, item) {
          const u = ui._upgradeInfo(item);
          return { acts: [{ label: 'Upgrade', cls: 'gold', disabled: u.blocked, fn: function () { if (call('upgrade', slot) === false) ui._sfx('error'); } }]
            .concat(ui._unsocketActions(item, slot)), info: u.line ? [u.line] : [] };
        })),
        ui._invGrid(p, 'forge', 'blacksmith', function (it) { return !!it.slot || it.type === 'gem'; })));
  }

  // Mystic: reroll one affix of a rare-or-better item for gem dust + gold (R3.2). Pick the item, then the line to change.
  function enchantTab(p) {
    if (!G.items || !G.items.rerollAffix || !G.items.rerollCost) {
      return h('div', { class: 'ed-body' }, h('div', { class: 'ed-note', text: 'The Mystic cannot do this yet.' }));
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
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: 'Change one property of a Rare or better item.' + (mats ? ' You have ' + mats + '.' : '') }),
      rows.length ? rows : h('div', { class: 'ed-note', text: 'You carry nothing the Mystic can work on.' }));
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
      } }, h('span', { class: 'n' }, label, h('small', { text: cost ? 'Reroll: ' + ui._matsText(cost) : 'Cannot be changed' })));
      if (!cost || !costOk(p, cost)) b.disabled = true;
      return b;
    });
    close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: 'Reroll which line of ' + item.name + '?' }), list],
      [ui._btn('Cancel', function () { close(); })]));
  }

  function gambleTab(p) {
    return h('div', { class: 'ed-body' },
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: 'Pay gold, pick a slot, pray. The Mystic does not give refunds.' }),
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
            ui.toast('The veil parts: ' + item.name, ui._rarityColor(item.rarity));
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
      ui.toast('Your wounds close.', '#5fd35f');
      ui._refreshNow();
    }, 'big gold');
    b.style.width = '100%';
    if (!hurt) b.disabled = true;
    const body = h('div', { class: 'ed-body' }, h('div', { class: 'ed-list' },
      h('div', { class: 'ed-kv' }, h('span', { text: 'Life' }), h('b', { text: fmt(Math.ceil(p.hp)) + ' / ' + fmt(st.hpMax || 0) })),
      h('div', { class: 'ed-kv' }, h('span', { text: 'Mana' }), h('b', { text: fmt(Math.floor(p.mp)) + ' / ' + fmt(st.mpMax || 0) })),
      b, h('div', { class: 'ed-h', text: 'Potions' }), potionRows(p)));
    return body;
  }

  // ---------- quests (elder + log) ----------
  function rewardText(r) {
    const parts = [];
    if (r && r.gold) parts.push(fmt(r.gold) + ' gold');
    if (r && r.xp) parts.push(fmt(r.xp) + ' XP');
    if (r && r.item) parts.push(((C.RARITY[r.item] && C.RARITY[r.item].name) || r.item) + ' item');
    return parts.join(', ');
  }

  function questList(actions) {
    const list = (G.meta && G.meta.getQuests) ? G.meta.getQuests() : [];
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
          box.appendChild(h('p', { text: q.desc }));
          if (q.status !== 'available') {
            box.appendChild(h('div', { class: 'ed-bar' }, h('i', { style: 'width:' + Math.round(Math.min(1, q.progress / (q.goal || 1)) * 100) + '%' })));
            box.appendChild(h('div', { class: 'ed-note', text: q.progress + ' / ' + q.goal }));
          }
          box.appendChild(h('div', { class: 'ed-note', text: 'Reward: ' + rewardText(q.rewards) }));
          if (actions && q.status === 'available') box.appendChild(ui._btn('Accept', function () { G.meta.acceptQuest(q.id); ui._refreshNow(); }));
          if (actions && q.status === 'ready') box.appendChild(ui._btn('Claim reward', function () { G.meta.turnInQuest(q.id); ui._refreshNow(); }, 'gold'));
          if (!actions && q.status === 'ready') box.appendChild(h('div', { class: 'ed-gold', text: 'Return to the Elder in Emberfall.' }));
        }
        wrap.appendChild(box);
      });
    };
    add('The Descent', list.filter(function (q) { return q.main; }));
    add('Bounties', list.filter(function (q) { return !q.main; }));
    if (!list.length) wrap.appendChild(h('div', { class: 'ed-note', text: 'No quests yet. Speak with the Elder in Emberfall.' }));
    else if (!actions) wrap.appendChild(h('div', { class: 'ed-note', text: 'The Elder in Emberfall offers quests and pays their rewards. Bounties change each time you return to town.' }));
    return wrap;
  }

  ui._register('quests', {
    render: function () {
      return ui._frame('Quests', { right: [ui._btn('Journal', function () { ui.open('journal'); })] }, h('div', { class: 'ed-body' }, questList(false)));
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
        ui._showItem(item, [{ label: 'Withdraw', cls: 'gold', fn: function () { if (call('stashWithdraw', i) === false) ui._sfx('error'); } }]);
      } }));
    }
    return h('div', { class: 'ed-body' },
      h('div', { class: 'ed-h', text: 'Stash  ' + used + '/' + C.STASH_SIZE }), grid,
      h('div', { class: 'ed-h', text: 'Your pack' }), ui._invGrid(p, 'stash'));
  }

  function stashSort() {
    return [ui._btn('Sort', function () {
      if (G.items && G.items.sortStash) call('sortStash');
      call('sortInventory');
      ui._refreshNow();
    })];
  }

  ui._register('stash', {
    render: function () {
      const p = S.player;
      return ui._frame('Stash', { right: p ? stashSort() : null }, p ? stashBody(p) : h('div', { class: 'ed-body' }));
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
      if (!p) return ui._frame(def.title, null, h('div', { class: 'ed-body' }));
      // reopen on the tab used last time at this vendor (session only) — most visits repeat the last errand
      if (!view.tab) view.tab = lastTab[role] && def.tabs.some(function (t) { return t[0] === lastTab[role]; }) ? lastTab[role] : def.tabs[0][0];
      lastTab[role] = view.tab;
      let body;
      if (view.tab === 'buy') body = buyTab(role, p, role === 'merchant');
      else if (view.tab === 'sell') body = sellTab(role, p);
      else if (view.tab === 'forge') body = forgeTab(p);
      else if (view.tab === 'gamble') body = gambleTab(p);
      else if (view.tab === 'heal') body = healTab(p);
      else if (view.tab === 'enchant') body = enchantTab(p);
      else if (view.tab === 'quests') body = h('div', { class: 'ed-body' }, questList(true));
      else body = stashBody(p);
      const right = view.tab === 'stash' ? stashSort() : null;
      const sub = h('div', { class: 'ed-npc' }, ui._portrait((ent && ent.sprite) || NPC_SPRITE[role], 48),
        h('div', { style: 'flex:1;min-width:0' }, h('b', { class: 'ed-ember', text: (ent && ent.name) || def.title }), h('p', { text: '"' + def.line + '"' })),
        ui._goldEl(p.gold || 0));
      const foot = view.tab === 'sell' ? [
        ui._junkButton(),
        ui._btn('Junk rules', ui._junkPopup),
        ui._btn('Sort', function () { call('sortInventory'); ui._refreshNow(); }),
      ] : null;
      return ui._frame(def.title, {
        tabs: def.tabs.length > 1 ? def.tabs.map(function (t) { return { id: t[0], label: t[1] }; }) : null,
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
