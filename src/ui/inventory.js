// Item cells, item tooltip (with compare + context actions), inventory / paper-doll / character sheet panel.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h, fmt = ui._fmt;

  // stat -> [label, suffix]
  const STAT = {
    str: ['Strength'], dex: ['Dexterity'], int: ['Intelligence'], vit: ['Vitality'],
    hpMax: ['Life'], mpMax: ['Mana'], hpRegen: ['Life Regen', '/s'], mpRegen: ['Mana Regen', '/s'],
    dmgMin: ['Min Damage'], dmgMax: ['Max Damage'], dmgPct: ['Damage', '%'], attackSpeed: ['Attack Speed', '%'], castSpeed: ['Cast Speed', '%'],
    critChance: ['Crit Chance', '%'], critDmg: ['Crit Damage', '%'],
    fireDmg: ['Fire Damage'], coldDmg: ['Cold Damage'], lightningDmg: ['Lightning Damage'], poisonDmg: ['Poison Damage'],
    skillDmgPct: ['Skill Damage', '%'], cdr: ['Cooldown Reduction', '%'], allSkills: ['All Skills'],
    armor: ['Armor'], dodge: ['Dodge', '%'], block: ['Block', '%'],
    resFire: ['Fire Resist', '%'], resCold: ['Cold Resist', '%'], resLightning: ['Lightning Resist', '%'], resPoison: ['Poison Resist', '%'], resAll: ['All Resist', '%'],
    thorns: ['Thorns'], moveSpeed: ['Move Speed', '%'], lifeSteal: ['Life Steal', '%'], manaSteal: ['Mana Steal', '%'],
    lifeOnKill: ['Life on Kill'], manaOnKill: ['Mana on Kill'],
    magicFind: ['Magic Find', '%'], goldFind: ['Gold Find', '%'], xpGain: ['Bonus XP', '%'], pickupRadius: ['Pickup Radius'],
  };
  const GROUPS = [
    ['Offense', ['dmgMin', 'dmgMax', 'dmgPct', 'attackSpeed', 'castSpeed', 'critChance', 'critDmg', 'fireDmg', 'coldDmg', 'lightningDmg', 'poisonDmg', 'skillDmgPct', 'cdr', 'allSkills']],
    ['Defense', ['hpMax', 'mpMax', 'hpRegen', 'mpRegen', 'armor', 'dodge', 'block', 'resFire', 'resCold', 'resLightning', 'resPoison', 'resAll', 'thorns']],
    ['Utility', ['moveSpeed', 'lifeSteal', 'manaSteal', 'lifeOnKill', 'manaOnKill', 'magicFind', 'goldFind', 'xpGain', 'pickupRadius']],
  ];
  const SLOT_LABEL = { weapon: 'Wpn', offhand: 'Off', helm: 'Helm', chest: 'Body', gloves: 'Hand', boots: 'Feet', belt: 'Belt', amulet: 'Neck', ring1: 'Ring', ring2: 'Ring' };
  const ATTRS = [['str', TX.inventory.strength], ['dex', TX.inventory.dexterity], ['int', TX.inventory.intelligence], ['vit', TX.inventory.vitality]];

  function statLabel(k) { return (STAT[k] && STAT[k][0]) || k; }
  function statVal(k, v) { return fmt(v) + ((STAT[k] && STAT[k][1]) || ''); }
  ui._statLabel = statLabel;

  function call(fnName, a, b, c) {
    const it = G.items;
    if (!it || typeof it[fnName] !== 'function') { ui.toast(TX.inventory.notAvailableYet, '#8f8470'); return undefined; }
    try { return it[fnName](a, b, c); } catch (err) { console.error('[ui items.' + fnName + ']', err); return undefined; }
  }
  ui._itemsCall = call;

  // 'up' | 'down' | 'same' | null — is this better than what is worn? (R3.4; falls back to the older isUpgrade)
  function verdict(item) {
    if (!item || !item.slot || !G.items) return null;
    try {
      if (G.items.verdict) return G.items.verdict(item) || null;
      if (G.items.isUpgrade) return G.items.isUpgrade(item) ? 'up' : null;
    } catch (err) { /* treat as unknown */ }
    return null;
  }
  ui._verdict = verdict;
  function isJunk(item) {
    if (!item || !G.items || !G.items.isJunk) return false;
    if (wanted(item)) return false;                // R7.11 a piece the Collection Book wants is never shown as junk
    try { return !!G.items.isJunk(item); } catch (err) { return false; }
  }
  ui._isJunk = isJunk;

  // R7.1 glow strength per rarity (C.RARITY[k].glow: 0 none, 1 magic, 2 Elite, 2.5 Mythic, 3 Unique, 4 Rift + pulse)
  function glowOf(rarity) { const r = C.RARITY[rarity]; return (r && +r.glow) || 0; }
  function glowKey(g) { return g >= 4 ? '4' : g >= 3 ? '3' : g >= 2.5 ? '25' : g >= 2 ? '2' : g >= 1 ? '1' : ''; }
  ui._glowClass = function (rarity) { const k = glowKey(glowOf(rarity)); return k ? 'rg' + k : ''; };
  ui._glowText = function (rarity) { const k = glowKey(glowOf(rarity)); return k ? 'ed-glow' + (k === '25' ? '2' : k) : ''; };

  // R7.11 would this item fill a missing slot of the Collection Book? (equipment only; never throws)
  function wanted(item) {
    const co = G.items && G.items.collection;
    if (!item || !item.slot || !co || typeof co.isWanted !== 'function') return false;
    try { return !!co.isWanted(item); } catch (err) { return false; }
  }
  ui._wanted = wanted;
  // { page: pageId, key } | null, plus the page's display name and progress when the book can say
  function wantedInfo(item) {
    const co = G.items && G.items.collection;
    if (!co || typeof co.entryOf !== 'function') return null;
    try {
      const e = co.entryOf(item);
      if (!e) return null;
      const pg = (co.getPages() || []).filter(function (x) { return x.id === e.page; })[0];
      return pg ? { name: pg.name, count: pg.count, total: pg.total, entry: e.key } : { name: e.page, count: 0, total: 0 };
    } catch (err) { return null; }
  }
  // socket pips (R7.3): one square per socket, filled when a gem sits in it
  function pips(item, cls) {
    const s = item && item.sockets;
    if (!Array.isArray(s) || !s.length) return null;
    return h('span', { class: cls }, s.map(function (g) { return h('b', { class: g ? 'f' : null }); }));
  }

  // ---------- cell ----------
  // opts: { onTap, slot (empty-slot label), arrow (verdict marker), junk (junk marker), area }
  function cell(item, opts) {
    opts = opts || {};
    const c = h('button', { type: 'button', class: 'ed-cell', style: opts.area ? 'grid-area:' + opts.area : null });
    if (item) {
      const gc = ui._glowClass(item.rarity);
      c.style.borderColor = ui._rarityColor(item.rarity);
      if (gc) { c.className += ' ' + gc; c.style.setProperty('--rc', ui._rarityColor(item.rarity)); }
      c.appendChild(ui._icon(item.icon, 32));
      if (item.qty > 1) c.appendChild(h('span', { class: 'q', text: item.qty }));
      const sk = pips(item, 'sk');
      if (sk) c.appendChild(sk);
      if (opts.arrow) {
        const v = verdict(item);
        if (v === 'up') c.appendChild(h('span', { class: 'up', text: '▲' }));
        else if (v === 'down') c.appendChild(h('span', { class: 'dn', text: '▼' }));
      }
      const want = wanted(item) && !wornIn(item);
      if (want) c.appendChild(h('i', { class: 'bk', 'aria-hidden': 'true' }));
      if (item.locked) c.appendChild(h('i', { class: 'lk', 'aria-hidden': 'true' }));
      else if (opts.junk && !want && isJunk(item)) { c.className += ' junk'; c.appendChild(h('span', { class: 'jk', text: TX.inventory.junk })); }
      c.setAttribute('aria-label', item.name || 'item');
      if (opts.onTap) c.addEventListener('click', function () { ui._sfx('click'); opts.onTap(item); });
    } else {
      if (opts.slot) c.appendChild(h('span', { class: 'sl', text: opts.slot }));
      c.disabled = true;
    }
    return c;
  }
  ui._cell = cell;

  // ---------- R16.9 requirements and R16.11 auto-compare ----------
  const REQ = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence', vit: 'Vitality' };
  // stat requirements the items team puts on gear (item.req / item.requires = { str, dex, int }), red while you fall short; plus the reason
  // G.items.meetsRequirements(item, player) gives when it will refuse you
  function reqLines(item) {
    const out = [], p = S.player, need = item.req || item.requires || item.reqStats;
    if (need && typeof need === 'object' && p) {
      for (const k in REQ) {
        if (!(need[k] > 0)) continue;
        const have = (p.attrs && p.attrs[k]) || 0;     // same rule as G.items.meetsRequirements: base attributes
        out.push(h('div', { class: 'ed-tipline ' + (have < need[k] ? 'ed-bad' : 'ed-note'), text: TX.req.requires + REQ[k] + ' ' + need[k] + (have < need[k] ? TX.req.youHave + Math.floor(have) + ')' : '') }));
      }
    }
    if (item.slot && G.items && typeof G.items.meetsRequirements === 'function' && !wornIn(item)) {
      let r = null;
      try { r = G.items.meetsRequirements(item, p); } catch (err) { r = null; }
      const why = r && r.ok === false ? (r.text || TX.req.cannotEquipYet) : null;
      if (why) out.push(h('div', { class: 'ed-tipline ed-bad', text: TX.req.cannotEquip + why }));
    }
    return out;
  }
  function equippedFor(item) {
    const eq = (S.player && S.player.equipment) || {};
    const slots = item.slot === 'ring' ? ['ring1', 'ring2'] : [item.slot];
    return slots.map(function (s) { return eq[s]; }).filter(function (w) { return w && w !== item; });
  }
  // "This | Worn": the item beside what it would replace (both rings for a ring), with Power for each
  function vsBlock(item) {
    if (!item.slot || wornIn(item)) return null;
    const worn = equippedFor(item);
    const pw = function (x) { try { return G.items && G.items.power ? G.items.power(x) : null; } catch (err) { return null; } };
    const cellOf = function (x, title) {
      return h('div', { class: 'ed-vscell' }, h('small', { text: title }),
        h('b', { style: 'color:' + (ui._ink(ui._rarityColor(x.rarity)) || '#222'), text: x.name }),
        h('small', { text: (pw(x) != null ? TX.compare.power + pw(x) + ' · ' : '') + (x.mods || []).slice(0, 2).map(modText).join(', ') }));
    };
    const box = h('div', { class: 'ed-vs' });
    if (!worn.length) { box.appendChild(h('div', { class: 'ed-note', text: TX.compare.nothingWornThere })); return box; }
    worn.forEach(function (w, i) { box.appendChild(h('div', { class: 'ed-vsrow' }, cellOf(item, i ? '' : TX.compare.thisOne), cellOf(w, i ? '' : TX.compare.wornNow))); });
    return box;
  }

  // ---------- tooltip ----------
  // Simple by default (R3.4): name + tier, ONE headline number with its change vs what is worn, the affixes in plain
  // words, then the actions. Everything else (base stats, requirements, the full comparison) sits behind "Details".
  let showDetails = false;

  // { label, value, delta } — from getTooltip().headline when the items team provides it, else worked out here.
  function headline(item, tip, cmp) {
    const hl = tip && tip.headline;
    if (hl && typeof hl === 'object') {
      const pc = hl.pct ? '%' : '';
      const out = { label: hl.label || '', value: hl.value != null ? fmt(hl.value) + pc : '', delta: +hl.delta || 0, unit: pc, text: hl.text };
      if (/^power$/i.test(out.label) && !out.text) { out.text = 'Power ' + out.value; out.power = true; }     // R7.2 "Power 412 ▲ +37"
      return out;
    }
    if (typeof hl === 'string') return { label: '', value: hl, delta: 0 };
    const b = item.base || {};
    if (b.dmgMax) return { label: TX.inventory.dps, value: fmt(((b.dmgMin || 0) + b.dmgMax) / 2 * (b.attackSpeed || 1)), delta: (cmp && cmp.dps) || 0 };
    if (b.armor) return { label: TX.common.armor, value: fmt(b.armor), delta: (cmp && cmp.armor) || 0 };
    const top = (item.mods || []).slice().sort(function (x, y) { return Math.abs(y.value) - Math.abs(x.value); })[0];
    if (top) return { label: '', value: modText(top), delta: 0 };
    return null;
  }
  function modText(m) {
    if (G.items && G.items.formatStat) { try { return G.items.formatStat(m.stat, m.value); } catch (err) { /* fall through */ } }
    return (m.value > 0 ? '+' : '') + statVal(m.stat, m.value) + ' ' + statLabel(m.stat);
  }

  // actions: [{ label, fn, cls, keep, disabled }] — the tooltip closes before fn runs unless keep is set.
  // opts: { price, compare: false, info: [{ text, bad }] } — info lines (costs, yields) are shown before the player commits.
  function showItem(item, actions, opts) {
    opts = opts || {};
    let tip = null;
    if (G.items && G.items.getTooltip) { try { tip = G.items.getTooltip(item); } catch (err) { tip = null; } }
    if (!tip) tip = { name: item.name || '?', color: ui._rarityColor(item.rarity), lines: [] };
    let cmp = null;
    if (opts.compare !== false && item.slot && G.items && G.items.compare) { try { cmp = G.items.compare(item); } catch (err) { cmp = null; } }
    const gear = !!item.slot;
    let close = null;

    const build = function () {
      // name plate: name in its rarity colour, tier underneath (the two Legendary sub-tiers get their tag, R2.2)
      const rar = C.RARITY[item.rarity];
      const glow = ui._glowText(item.rarity);
      const plate = h('div', { class: 'ed-tipname' + (glow ? ' ' + glow : ''), text: tip.name, style: '--rc:' + ui._rarityColor(item.rarity) + ';color:' + (tip.color || ui._rarityColor(item.rarity)) });
      if (rar) {
        const myth = item.rarity === 'mythic';
        let tag = (myth ? '✦ ' : '') + rar.name + (myth ? ' ✦' : '');
        if (item.setId) tag += ' · Set';
        if (item.corrupted) tag += ' · Corrupted';
        const sub = h('div', { class: 'ed-sub' + (myth ? ' myth' : ''), style: '--rc:' + rar.color }, tag);
        plate.appendChild(sub);
        const sp = pips(item, 'ed-pips');
        if (sp) sp.setAttribute('aria-label', item.sockets.filter(Boolean).length + ' of ' + item.sockets.length + ' sockets filled');
        if (sp) sub.appendChild(sp);
      }
      const body = [plate];
      if (opts.price != null) body.push(h('div', { class: 'ed-tipline' }, TX.inventory.price, ui._goldEl(opts.price)));

      const fx = effectsOf(item);
      if (gear && !showDetails) {
        const hl = headline(item, tip, cmp);
        if (hl) {
          const v = opts.compare === false ? null : verdict(item);
          const d = hl.delta;
          const dt = tip && tip.detail && typeof tip.detail === 'object' && tip.detail.value != null && hl.power
            ? fmt(tip.detail.value) + (tip.detail.pct ? '%' : '') + ' ' + (tip.detail.label || '') : null;
          body.push(h('div', { class: 'ed-hl' },
            h('b', { class: hl.power ? 'pw' : null, text: hl.text || (hl.value + (hl.label ? ' ' + hl.label : '')) }),
            d ? h('span', { class: d > 0 ? 'ed-good' : 'ed-bad', text: (d > 0 ? '▲ +' : '▼ ') + fmt(d) + (hl.unit || '') }) : null,
            !d && v === 'up' ? h('span', { class: 'ed-good', text: TX.inventory.better }) : null,
            !d && v === 'down' ? h('span', { class: 'ed-bad', text: TX.inventory.worse }) : null,
            dt ? h('small', { text: dt }) : null));
        }
        const wi = opts.price == null && wanted(item) && !wornIn(item) ? wantedInfo(item) : null;
        if (wi) body.push(h('div', { class: 'ed-tipline', style: 'color:#0e5c52' }, h('i', { class: 'bk' }), TX.inventory.collectionBook + wi.name + (wi.total ? ' (' + wi.count + '/' + wi.total + ')' : '')));
        for (const e of fx) body.push(h('div', { class: 'ed-fx' }, e.name || 'Mythic effect', e.desc ? h('small', { text: e.desc }) : null));
        for (const m of (item.mods || [])) body.push(h('div', { class: 'ed-tipline', text: modText(m) }));
        for (const g of (item.sockets || [])) body.push(h('div', { class: 'ed-tipline', style: 'color:' + (g ? '#5a1c6e' : '#4a3d2a'), text: g ? '◆ ' + g.name : '◇ Empty socket' }));
        extraLines(item, null).forEach(function (n) { body.push(n); });
        const lvl = (S.player && S.player.level) || 1;
        if (item.reqLevel > lvl) body.push(h('div', { class: 'ed-tipline ed-bad', text: TX.inventory.requiresLevel + item.reqLevel }));
        reqLines(item).forEach(function (n) { body.push(n); });
        if (opts.compare !== false && opts.price == null) { const vs = vsBlock(item); if (vs) body.push(vs); }
        else if (opts.compare !== false && opts.price != null) { const vs2 = vsBlock(item); if (vs2) body.push(vs2); }
      } else {
        // full view: every line the items team wrote; effect lines keep their plate
        let fxShown = 0;
        for (const ln of (tip.lines || [])) {
          const text = String(ln.text == null ? '' : ln.text);
          if (fx.length && fx.some(function (e) { return (e.name && text.indexOf(e.name) >= 0) || (e.desc && text.indexOf(e.desc) >= 0); })) {
            body.push(h('div', { class: 'ed-fx', text: text }));
            fxShown++;
            continue;
          }
          const col = ln.color ? ui._ink(ln.color) : null;      // parchment page: bright-on-dark colours become ink
          body.push(h('div', { class: 'ed-tipline', text: text === '' ? ' ' : text, style: col ? 'color:' + col : null }));
        }
        if (fx.length && !fxShown) for (const e of fx) body.push(h('div', { class: 'ed-fx' }, e.name || 'Mythic effect', e.desc ? h('small', { text: e.desc }) : null));
        extraLines(item, tip.lines).forEach(function (n) { body.push(n); });
        const keys = cmp ? Object.keys(cmp).filter(function (k) { return cmp[k]; }) : [];
        if (gear && keys.length) {
          const box = h('div', { class: 'ed-cmp' }, h('div', { class: 'ed-note', text: TX.inventory.ifEquipped }));
          for (const k of keys) box.appendChild(h('div', { class: 'ed-tipline ' + (cmp[k] > 0 ? 'ed-good' : 'ed-bad'), text: deltaText(k, cmp[k]) }));
          body.push(box);
        }
      }
      if (opts.info && opts.info.length) {
        const box = h('div', { class: 'ed-cmp' });
        for (const ln of opts.info) box.appendChild(h('div', { class: 'ed-tipline' + (ln.bad ? ' ed-bad' : ''), text: ln.text }));
        body.push(box);
      }
      const btns = (actions || []).map(function (a) {
        const b = ui._btn(a.label, function () { if (!a.keep) close(); a.fn(); ui._refresh(); }, a.cls);
        if (a.disabled) b.disabled = true;
        return b;
      });
      // R5.8 lock: on anything the player owns (not vendor stock); a locked item is never sold or junked in bulk
      if (opts.price == null && opts.lock !== false && lockable(item)) {
        btns.push(ui._btn(item.locked ? 'Unlock' : 'Lock', function () { toggleLock(item); rebuild(); ui._refresh(); }, item.locked ? 'on' : ''));
      }
      if (gear) btns.push(ui._btn(showDetails ? 'Less' : 'Details', function () { showDetails = !showDetails; rebuild(); }));
      btns.push(ui._btn(TX.common.close, function () { close(); }));
      return ui._dialog(body, btns, 'tip');
    };
    let dialogEl = build();
    const rebuild = function () { const next = build(); dialogEl.replaceWith(next); dialogEl = next; };
    close = ui._modal(dialogEl);
    return close;
  }
  ui._showItem = showItem;

  // ---------- R5.8 locking ----------
  function lockable(item) { return !!item && item.type !== 'gold' && item.type !== 'lore' && !!(item.slot || item.type === 'gem'); }
  function toggleLock(item) {
    const want = !item.locked;
    let done = false;
    if (G.items && typeof G.items.setLocked === 'function') { try { G.items.setLocked(item, want); done = true; } catch (err) { done = false; } }
    else if (G.items && typeof G.items.toggleLock === 'function') { try { G.items.toggleLock(item); done = true; } catch (err) { done = false; } }
    if (!done || !!item.locked !== want) {                           // plain data flag (contract: item.locked)
      item.locked = want;
      if (!want) delete item.locked;
      ui._sfx('click');
    }
  }
  ui._toggleLock = toggleLock; ui._lockable = lockable;

  // ---------- R5.9 looks, R5.3 awakening, R5.2 bleached ----------
  const MATCH_SLOTS = ['helm', 'chest', 'gloves', 'boots'];
  const AWAKEN_AT = [250, 1000, 5000];
  function titleCase(id) { return String(id).replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function lookName(fam) {
    const L = G.items && (G.items.LOOKS || G.items.LOOK_FAMILIES);
    const d = L && L[fam];
    return (d && (d.name || d.label)) || titleCase(fam);
  }
  function wornIn(item) {
    const eq = (S.player && S.player.equipment) || {};
    for (const k in eq) if (eq[k] === item) return k;
    return null;
  }
  // Lines the items tooltip may not carry yet. In the full view, a line already written by the items team wins.
  function extraLines(item, tipLines) {
    const out = [];
    const has = function (re) { return (tipLines || []).some(function (l) { return re.test(String(l && l.text)); }); };
    const pen = item.slot && !wornIn(item) ? penaltyOf(item) : null;          // R8.7 in red, unless the items tooltip already says it
    if (pen && !has(/not made for|penalty|not a weapon/i)) out.push(h('div', { class: 'ed-tipline ed-bad', text: pen.text }));
    const lookOf = function (it) {
      if (!it) return null;
      if (G.items && G.items.getLook) { try { return G.items.getLook(it); } catch (err) { return null; } }
      return it.look || null;
    };
    const famOf = function (it) { const l = lookOf(it); return (l && l.family) || null; };
    const fam = famOf(item);
    if (fam && !has(/ look\b|^look:/i)) {
      const L = G.items && (G.items.LOOKS || G.items.LOOK_FAMILIES);
      const def = L && L[fam];
      let line = 'Look: ' + lookName(fam);
      if (MATCH_SLOTS.indexOf(item.slot) >= 0 && !(def && def.noMatch)) {
        const eq = (S.player && S.player.equipment) || {};
        const n = MATCH_SLOTS.filter(function (s) { return famOf(eq[s]) === fam; }).length;
        const worn = !!wornIn(item);
        const withThis = worn || famOf(eq[item.slot]) === fam ? n : n + 1;
        line += ' · Matched ' + n + '/4' + (withThis !== n ? ' (' + withThis + ' with this)' : '');
        const steps = def && (def.matched || def.bonus);
        out.push(h('div', { class: 'ed-tipline ed-look' + (withThis >= 2 ? ' on' : ''), text: line }));
        if (steps && typeof steps === 'object' && withThis >= 2) {      // bonuses only once a match is in reach (R3.4)
          [2, 4].forEach(function (k) {
            const d = steps[k];
            // [[stat, value], ...] from the items table, or plain text
            const txt = typeof d === 'string' ? d : Array.isArray(d)
              ? d.map(function (b) { return Array.isArray(b) ? modText({ stat: b[0], value: b[1] }) : String(b); }).join(', ') : (d.desc || '');
            if (txt) out.push(h('div', { class: 'ed-tipline ed-note', style: 'padding-left:18px' + (withThis >= k ? ';color:#17571b' : ''), text: k + TX.inventory.worn + txt }));
          });
        }
      } else out.push(h('div', { class: 'ed-tipline ed-look', text: line }));
    }
    // awakened affixes, then progress to the next one
    let aw = item.awakened;
    if (aw && !Array.isArray(aw)) aw = [aw];
    if (aw && aw.length && !has(/awaken/i)) {
      aw.forEach(function (m) {
        const t = typeof m === 'string' ? m : (m && m.stat ? modText(m) : (m && (m.text || m.name)) || '');
        if (t) out.push(h('div', { class: 'ed-tipline ed-awake', text: '✧ ' + t }));
      });
    }
    if (item.kills != null && item.slot && !has(/awaken/i)) {
      const k = item.kills | 0;
      const steps = (G.items && Array.isArray(G.items.AWAKEN_AT)) ? G.items.AWAKEN_AT : AWAKEN_AT;
      const next = steps.filter(function (x) { return x > k; })[0];
      out.push(h('div', { class: 'ed-tipline ed-note', text: next ? TX.inventory.awakening + k + ' / ' + next + TX.inventory.kills : k + TX.inventory.killsFullyAwakened }));
    }
    if (item.bleached && item.hidden != null && !has(/\?\?\?/)) {
      out.push(h('div', { class: 'ed-bleach' }, '???', h('small', { text: TX.inventory.bleachedBringItHome })));
    }
    return out;
  }
  ui._extraLines = extraLines;

  function effectsOf(item) {
    const table = (G.items && G.items.EFFECTS) || {};
    return (Array.isArray(item.effects) ? item.effects : []).map(function (id) { return table[id] || { name: String(id), desc: '' }; });
  }

  // Bloodstones fuse for good (R2.6). The contract only exposes that through unsocketCost() === null after the fact,
  // so before socketing we go by what the gem itself says.
  function isPermanentGem(gem) {
    const d = G.items && G.items.data;
    if (gem && d && typeof d.isPermanentGem === 'function') { try { if (d.isPermanentGem(gem)) return true; } catch (err) { /* fall through */ } }
    return !!gem && (gem.permanent === true || gem.bloodstone === true || gem.family === 'bloodstone' || gem.gemType === 'bloodstone' ||
      /blood/i.test(String(gem.baseId || '')));
  }

  function deltaText(k, v) {
    if (k === 'dps') return (v > 0 ? '+' : '') + fmt(v) + ' DPS';
    if (G.items && G.items.formatStat && STAT[k]) { try { return G.items.formatStat(k, v); } catch (err) { /* fall through */ } }
    return (v > 0 ? '+' : '') + statVal(k, v) + ' ' + statLabel(k);
  }

  // A list to pick from (ring slot, gem host). rows: [{ item, sub, fn }]
  function choose(title, rows) {
    let close = null;
    const list = rows.map(function (r) {
      return h('button', { type: 'button', class: 'ed-row', onclick: function () { ui._sfx('click'); close(); r.fn(); ui._refresh(); } },
        ui._icon(r.item.icon, 32),
        h('span', { class: 'n', style: 'color:' + ui._rarityColor(r.item.rarity) }, r.item.name, r.sub ? h('small', { text: r.sub }) : null));
    });
    close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: title }), list], [ui._btn(TX.common.cancel, function () { close(); })]));
  }

  function ok(result) { if (result === false) ui._sfx('error'); return result; }

  // Every numeric key of a cost / yield object except gold is a material: dust, shard, essence, gemdust, riftshard (R7.4) and
  // the class materials (forge_<class>, R7.4) — named from the items table so the rename pass needs no UI change.
  function matKeys(o) {
    const out = [];
    for (const k in (o || {})) if (k !== 'gold' && typeof o[k] === 'number' && o[k] > 0) out.push(k);
    return out;
  }
  function matsText(o) {
    const parts = [];
    if (o && o.gold) parts.push(fmt(o.gold) + TX.filter.gold2);
    for (const k of matKeys(o)) parts.push(o[k] + ' ' + matName(k));
    return parts.join(', ');
  }
  function probe(fnName, item) {
    if (!G.items || typeof G.items[fnName] !== 'function') return undefined;
    try { return G.items[fnName](item); } catch (err) { return undefined; }
  }
  // Upgrade price for the tooltip: { line, blocked } — blocked when the item cannot be upgraded further.
  function upgradeInfo(item) {
    const cost = probe('upgradeCost', item);
    if (cost === undefined) return { line: null, blocked: false };
    if (!cost) return { line: { text: TX.inventory.cannotBeUpgradedFurther }, blocked: true };
    const p = S.player, m = p.materials || {};
    const short = (p.gold || 0) < (cost.gold || 0) || matKeys(cost).some(function (k) { return (m[k] || 0) < (cost[k] || 0); });
    return { line: { text: TX.inventory.upgradeCosts + matsText(cost), bad: short }, blocked: false };
  }
  ui._upgradeInfo = upgradeInfo; ui._matsText = matsText;
  function salvageLine(item) {
    const y = probe('salvageYield', item);
    const t = y ? matsText(y) : '';
    return t ? { text: TX.inventory.salvageYields + t } : null;
  }

  // Both ring fingers taken: ask which ring to swap out (items.equip takes the slot as an optional 2nd argument).
  // R8.7 G.items.classPenalty(item) -> falsy | number | { text, pct }: gear the class cannot use well. Asked once per item.
  function penaltyOf(item) {
    if (!item || !G.items || typeof G.items.classPenalty !== 'function') return null;
    let p = null;
    try { p = G.items.classPenalty(item); } catch (err) { return null; }
    if (!p) return null;
    if (typeof p === 'number') return { text: TX.inventory.thisIsNotMade + Math.round(p <= 1 ? p * 100 : p) + TX.inventory.damageWithIt };
    const pct = p.pct != null ? p.pct : (p.damage != null ? p.damage : null);
    return { text: typeof p.text === 'string' && p.text ? p.text : (typeof p.label === 'string' && p.label ? p.label
      : 'This is not made for your class' + (pct != null ? ': -' + Math.round(Math.abs(pct) <= 1 ? Math.abs(pct) * 100 : Math.abs(pct)) + '% damage with it.' : ': it weakens you.')) };
  }
  ui._penaltyOf = penaltyOf;
  function equip(item, index) {
    const pen = penaltyOf(item);
    if (pen && !item.penaltyOk) {
      ui._confirm(TX.inventory.equip + item.name + '?', 'Equip anyway', function () { item.penaltyOk = true; equipNow(item, index); }, { danger: true, note: pen.text });
      return;
    }
    equipNow(item, index);
  }
  function equipNow(item, index) {
    const eq = S.player.equipment || {};
    if (item.slot === 'ring' && eq.ring1 && eq.ring2) {
      choose('Replace which ring?', ['ring1', 'ring2'].map(function (slot, i) {
        return { item: eq[slot], sub: i ? 'Second ring' : 'First ring', fn: function () { ok(call('equip', index, slot)); } };
      }));
    } else equipTry(index, item);
  }
  // a refused equip says why: the items module toasts it; when it does not, canEquip() supplies the reason
  function equipTry(index, item, slot) {
    const r = call('equip', index, slot);
    if (r === false) {
      ui._sfx('error');
      if (G.items && typeof G.items.canEquip === 'function') { try { const c = G.items.canEquip(item); if (c && c.ok === false && c.reason && !document.querySelector('.ed-toast')) ui.toast(c.reason, '#ff8a7a'); } catch (err) { /* ignore */ } }
    }
    return r;
  }

  // R16.8 the Socket Tool: pick any item, see its chance to fail first (the tool can shatter, never the item)
  function gearList(skipFull) {
    const p = S.player, rows = [];
    C.EQUIP_SLOTS.forEach(function (slot) { const it = p.equipment && p.equipment[slot]; if (it) rows.push({ item: it, where: TX.sockets.equipped }); });
    (p.inventory || []).forEach(function (it) { if (it && it.slot) rows.push({ item: it, where: TX.sockets.inYourPack }); });
    return rows.filter(function (r) { return !skipFull || (r.item.sockets ? r.item.sockets.length : 0) < 6; });
  }
  ui._gearList = gearList;
  function socketToolPick(tool, toolIndex) {
    const rows = gearList(true).map(function (r) {
      let fail = null;
      try { if (G.items && G.items.socketFailChance) fail = Math.round(G.items.socketFailChance(r.item) * 100); } catch (err) { fail = null; }
      return { item: r.item, sub: r.where + ' · ' + TX.sockets.sockets + (r.item.sockets ? r.item.sockets.length : 0) + '/6' + (fail != null ? TX.sockets.failChance + fail + '%' : ''),
        fn: function () { const ok2 = call('addSocket', r.item, { tool: toolIndex }); ui._sfx(ok2 ? 'equip' : 'error'); ui._refreshNow(); } };
    });
    if (!rows.length) { ui._sfx('error'); ui.toast(TX.sockets.nothingToAddA, '#a89f8f'); return; }
    choose(TX.sockets.addASocketTo, rows);
  }

  // Gem → pick a piece of gear with an empty socket (worn gear first, then the pack).
  function socket(gem, gemIndex) {
    const p = S.player, rows = [];
    const free = function (it) { return it && it.sockets && it.sockets.indexOf(null) >= 0; };
    const fuse = function (host, target) {
      const perm = isPermanentGem(gem);
      // R3.3: a bloodstone only fuses when the call carries the confirmation flag, and we only send it after asking
      const go = function () { ok(call('socketGem', gemIndex, target, perm ? { confirmPermanent: true } : undefined)); ui._refresh(); };
      if (perm) {
        ui._confirm(TX.inventory.fuse + gem.name + TX.inventory.into + host.name + '?', 'Fuse forever', go,
          { danger: true, note: TX.inventory.aBloodstoneCanNever });
      } else go();
    };
    for (const slot of C.EQUIP_SLOTS) {
      const it = p.equipment && p.equipment[slot];
      if (free(it)) rows.push({ item: it, sub: 'Equipped', fn: function () { fuse(it, slot); } });
    }
    (p.inventory || []).forEach(function (it, i) {
      if (free(it)) rows.push({ item: it, sub: 'In your pack', fn: function () { fuse(it, i); } });
    });
    if (!rows.length) { ui._sfx('error'); ui.toast(TX.inventory.nothingYouCarryHas, '#a89f8f'); return; }
    choose('Socket ' + gem.name + ' into', rows);
  }

  // Blacksmith: one "Remove" action per filled socket whose gem can come out (unsocketCost !== null), price on the button.
  // target = inventory index or equipment slot.
  function unsocketActions(item, target) {
    const out = [];
    if (!item || !Array.isArray(item.sockets) || !G.items || !G.items.unsocketGem || !G.items.unsocketCost) return out;
    item.sockets.forEach(function (gem, si) {
      if (!gem) return;
      let cost = null;
      try { cost = G.items.unsocketCost(item, si); } catch (err) { cost = null; }
      if (cost == null) return;                 // permanent (bloodstone): nothing to offer
      out.push({ label: TX.inventory.remove + (gem.name || 'gem') + ' ' + fmt(cost) + 'g', disabled: (S.player.gold || 0) < cost,
        fn: function () { ok(call('unsocketGem', target, si)); } });
    });
    return out;
  }
  ui._unsocketActions = unsocketActions;

  // R7.11 "Send to Curator": registers a bag (or stash) item in the Collection Book — the item is consumed.
  function sendToCurator(index, source) {
    const co = G.items && G.items.collection;
    if (!co || typeof co.register !== 'function') { ui.toast(TX.inventory.theCuratorIsNot, '#8f8470'); return null; }
    let res = null;
    try { res = source === 'stash' ? co.register(index, 'stash') : co.register(index); } catch (err) { console.error('[ui collection.register]', err); }
    if (!res || !res.ok) { ui._sfx('error'); return res; }
    ui._sfx('quest');
    let pg = null;
    try { pg = (co.getPages() || []).filter(function (x) { return x.id === res.page; })[0]; } catch (err) { pg = null; }
    if (!res.completed) ui.toast(TX.inventory.registered + (pg ? pg.name + ' ' + pg.count + '/' + pg.total : 'Collection Book'), '#7fd4c8');
    ui._refresh();
    return res;
  }
  ui._sendToCurator = sendToCurator;
  function curatorAction(item, index, source) {
    if (S.scene !== 'town' || !wanted(item) || wornIn(item)) return null;       // R8.1: handing in is a town errand
    return { label: TX.inventory.sendToCurator, cls: 'gold', fn: function () { sendToCurator(index, source); } };
  }
  ui._curatorAction = curatorAction;

  // Blacksmith (R6.5): remove a corrupted item's drawback. target = bag index or equipment slot.
  function cleanseAction(item, target) {
    if (!item || !item.corrupted || !G.items || typeof G.items.cleanse !== 'function' || typeof G.items.cleanseCost !== 'function') return null;
    let cost = null;
    try { cost = G.items.cleanseCost(target); } catch (err) { cost = null; }
    if (!cost) return null;
    const p = S.player, m = p.materials || {};
    const short = (p.gold || 0) < (cost.gold || 0) || matKeys(cost).some(function (k) { return (m[k] || 0) < cost[k]; });
    return { label: TX.inventory.cleanse, cls: 'gold', disabled: short, fn: function () { if (ok(call('cleanse', target))) G.emit('item:cleansed', { item: item }); }, info: TX.inventory.cleanseCosts + matsText(cost), bad: short };
  }
  ui._cleanseAction = cleanseAction;

  // Context actions for an inventory item. ctx: 'inv' | 'sell' | 'forge' | 'stash'; role = vendor role when at a vendor.
  // Info lines (costs, yields) for the same context come from invInfo().
  function invActions(item, index, ctx, role) {
    const a = [];
    const cur = curatorAction(item, index);
    if (ctx === 'stash') {
      if (cur) a.push(cur);
      a.push({ label: TX.common.stash, cls: cur ? '' : 'gold', fn: function () { ok(call('stashDeposit', index)); } });
      return a;
    }
    if (cur) a.push(cur);
    if (ctx === 'sell') {
      a.push({ label: 'Sell' + (item.value ? ' ' + fmt(item.value * (item.qty || 1)) + 'g' : ''), cls: 'gold', fn: function () {
        gemGuard(index, 'Sell', function () {
          const g = call('sell', index);
          if (g > 0) ui._sfx('sell');
          ui._refresh();
        });
      } });
    }
    if (ctx === 'forge' || (ctx === 'sell' && role === 'blacksmith')) {
      if (ctx === 'forge' && item.slot) a.push({ label: TX.common.upgrade, cls: 'gold', disabled: upgradeInfo(item).blocked, fn: function () { ok(call('upgrade', index)); } });
      if (ctx === 'forge') { const cl = cleanseAction(item, index); if (cl) a.push(cl); }
      if (item.slot) a.push({ label: TX.common.salvage, fn: function () { salvage(item, index); } });
      if (ctx === 'forge') unsocketActions(item, index).forEach(function (x) { a.push(x); });
    }
    if (item.slot) a.push({ label: TX.common.equip, cls: ctx === 'inv' ? 'gold' : '', fn: function () { equip(item, index); } });
    if (item.type === 'gem') {
      if (ctx === 'forge' && G.items && G.items.upgradeGem && G.items.gemUpgradeCost) {
        let cost = null;
        try { cost = G.items.gemUpgradeCost(index); } catch (err) { cost = null; }
        if (cost) a.push({ label: TX.inventory.improve + matsText(cost), cls: 'gold', fn: function () { ok(call('upgradeGem', index)); } });
      }
      if (ctx === 'forge') return a;            // the forge only works the gem; socketing happens from the bag
      if (G.items && G.items.socketGem) a.push({ label: TX.inventory.socket, cls: 'gold', fn: function () { socket(item, index); } });
      if (G.items && G.items.combineGems && (ctx === 'inv' || role === 'mystic')) {
        a.push({ label: TX.inventory.combine3, disabled: (item.qty || 1) < 3, fn: function () { ok(call('combineGems', index)); } });
      }
    }
    if (item.baseId === 'socket_tool' && ctx === 'inv') a.push({ label: TX.sockets.addASocket, cls: 'gold', fn: function () { socketToolPick(item, index); } });
    else if (item.type === 'consumable' && ctx === 'inv') {
      const tome = item.baseId === 'tome_skill';        // R7.4 Tome of Insight: one skill point
      a.push({ label: tome ? 'Read (+1 skill point)' : 'Use', cls: 'gold', fn: function () { ok(call('useItem', index)); } });
    }
    if (ctx === 'inv') {
      a.push({ label: TX.inventory.drop, cls: 'danger', fn: function () {
        if (ui._rarityAtLeast(item.rarity, 'rare')) ui._confirm(TX.inventory.drop2 + item.name + '?', 'Drop', function () { call('dropFromInventory', index); ui._refresh(); }, { danger: true });
        else call('dropFromInventory', index);
      } });
    }
    return a;
  }
  ui._invActions = invActions;

  function invInfo(item, ctx, role) {
    const info = [];
    if (!item.slot) return info;
    if (ctx === 'forge') { const u = upgradeInfo(item); if (u.line) info.push(u.line); }
    if (ctx === 'forge') { const cl = cleanseAction(item, S.player.inventory.indexOf(item)); if (cl) info.push({ text: cl.info, bad: cl.bad }); }
    if (ctx === 'forge' || (ctx === 'sell' && role === 'blacksmith')) { const s = salvageLine(item); if (s) info.push(s); }
    return info;
  }
  ui._invInfo = invInfo;

  // R3.2: selling or salvaging gear with gems in it grinds the gems to dust — always ask first, and say what comes back.
  function gemGuard(index, verb, go) {
    let pv = null;
    if (G.items && G.items.salvagePreview) { try { pv = G.items.salvagePreview(index); } catch (err) { pv = null; } }
    if (!pv) {                                   // older items module: count the gems ourselves
      const it = S.player.inventory[index];
      const n = it && it.sockets ? it.sockets.filter(Boolean).length : 0;
      pv = { gems: n, gemdust: 0 };
    }
    if (!(pv.gems > 0)) { go(); return false; }
    ui._confirm(pv.gems + TX.chute.socketedGem + (pv.gems === 1 ? '' : 's') + TX.inventory.willBeGroundTo, verb + TX.inventory.anyway, go,
      { danger: true, note: pv.gemdust ? TX.inventory.returns + pv.gemdust + TX.inventory.gemDust : null });
    return true;
  }
  ui._gemGuard = gemGuard;

  function salvage(item, index) {
    const go = function () { ok(call('salvage', index)); ui._refresh(); };
    const y = salvageLine(item);
    if (gemGuard(index, 'Salvage', go)) return;
    if (ui._rarityAtLeast(item.rarity, 'rare')) ui._confirm(TX.inventory.salvage + item.name + TX.inventory.itWillBeDestroyed, 'Salvage', go, { danger: true, note: y ? y.text + '.' : null });
    else go();
  }

  // ---------- shared pieces ----------
  function invGrid(p, ctx, role, filter) {
    const grid = h('div', { class: 'ed-grid' });
    const inv = p.inventory || [];
    for (let i = 0; i < C.INV_SIZE; i++) {
      const it = inv[i] || null;
      const shown = it && (!filter || filter(it)) ? it : null;
      grid.appendChild(cell(shown, { arrow: true, junk: true, onTap: function (item) { showItem(item, invActions(item, i, ctx, role), { info: invInfo(item, ctx, role) }); } }));
    }
    return grid;
  }
  ui._invGrid = invGrid;

  // extra(slot, item) -> { acts, info } shown before Unequip (used by the blacksmith's forge)
  function doll(p, extra) {
    const d = h('div', { class: 'ed-doll' });
    for (const slot of C.EQUIP_SLOTS) {
      const it = (p.equipment && p.equipment[slot]) || null;
      d.appendChild(cell(it, { area: slot, slot: SLOT_LABEL[slot] || slot, onTap: function (item) {
        const x = extra ? extra(slot, item) : { acts: [], info: [] };
        x.acts.push({ label: TX.inventory.unequip, fn: function () { ok(call('unequip', slot)); } });
        showItem(item, x.acts, { compare: false, info: x.info });
      } }));
    }
    return d;
  }
  ui._doll = doll;

  // R5.9: the hero as they look right now (engine overlays worn gear); the class portrait when the engine has no preview
  function preview(p, size) {
    const fn = G.engine && G.engine.getPlayerPreview;
    let src = null;
    if (fn) { try { src = fn(p, size * 2); } catch (err) { src = null; } }
    if (!src || !src.width) return ui._portrait(p.sprite, size);
    const cv = h('canvas', { width: size, height: size, class: 'ed-pt' });
    const ctx = cv.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      const k = Math.min(size / src.width, size / src.height);
      const w = Math.round(src.width * k), hh = Math.round(src.height * k);
      ctx.drawImage(src, Math.round((size - w) / 2), Math.round((size - hh) / 2), w, hh);
    }
    return cv;
  }
  ui._preview = preview;

  function kv(k, v, cls) { return h('div', { class: 'ed-kv' }, h('span', { text: k }), h('b', { class: cls || null, text: v })); }

  function matName(k) {
    if (k === 'gemdust') return 'gem dust';
    const M = G.items && G.items.data && G.items.data.MATERIALS;
    if (M) for (const id in M) if (M[id] && M[id].key === k && M[id].name) return M[id].name;
    return k;
  }
  ui._matName = matName;

  function summary(p) {
    const st = p.stats || {};
    const box = h('div', { class: 'ed-sum' });
    let w = null;
    if (G.items && G.items.getWeapon) { try { w = G.items.getWeapon(p); } catch (err) { w = null; } }
    box.appendChild(h('div', { class: 'ed-preview' }, preview(p, 64), h('div', { class: 'ed-pvname' },
      h('div', { class: 'ed-ember', text: p.name || 'Hero' }), ui._heroTitle && ui._heroTitle() ? h('div', { class: 'ed-note', text: ui._heroTitle() }) : null)));
    box.appendChild(kv('Gold', fmt(p.gold || 0) + ' g', 'ed-gold'));
    if (w) box.appendChild(kv('Weapon', fmt(w.dmgMin + (st.dmgMin || 0)) + '-' + fmt(w.dmgMax + (st.dmgMax || 0))));
    box.appendChild(kv('Armor', fmt(st.armor || 0)));
    box.appendChild(kv('Life', fmt(Math.ceil(p.hp || 0)) + '/' + fmt(st.hpMax || 0)));
    box.appendChild(kv('Mana', fmt(Math.floor(p.mp || 0)) + '/' + fmt(st.mpMax || 0)));
    const pot = p.potions || {};
    box.appendChild(kv('Potions', (pot.hp | 0) + ' hp / ' + (pot.mp | 0) + ' mp'));
    const mats = p.materials;
    if (mats && typeof mats === 'object') {
      const parts = Object.keys(mats).filter(function (k) { return typeof mats[k] === 'number'; }).map(function (k) { return mats[k] + ' ' + matName(k); });
      if (parts.length) box.appendChild(h('div', { class: 'ed-note', style: 'margin-top:4px', text: parts.join(', ') }));
    }
    return box;
  }
  ui._summary = summary;

  // ---------- panels ----------
  function renderItems(p) {
    return h('div', { class: 'ed-body' }, h('div', { class: 'ed-inv' },
      h('div', { class: 'ed-dollwrap' }, doll(p), summary(p)),
      invGrid(p, 'inv')));
  }

  function renderChar(p, view) {
    const st = p.stats || {};
    const cls = (G.game && G.game.CLASSES && G.game.CLASSES[p.classId]) || null;
    const pts = p.attrPoints | 0;
    const left = h('div', { class: 'ed-box' },
      h('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px' }, preview(p, 48),
        h('div', null, h('div', { class: 'ed-ember', text: (p.name || 'Hero') + (ui._heroTitle && ui._heroTitle() ? ', ' + ui._heroTitle() : '') }),
          h('div', { class: 'ed-note', text: TX.hud.level + (p.level || 1) + ' ' + ((cls && cls.name) || '') }),
          h('div', { class: 'ed-note', text: TX.inventory.xp + fmt(p.xp || 0) + ' / ' + fmt(p.xpNext || 0) }))),
      h('div', { class: pts > 0 ? 'ed-gold' : 'ed-note', text: pts > 0 ? pts + TX.inventory.attributePoint + (pts > 1 ? 's' : '') + TX.inventory.toSpend : 'No attribute points to spend' }),
      ATTRS.map(function (a) {
        const base = (p.attrs && p.attrs[a[0]]) || 0;
        const total = st[a[0]] != null ? st[a[0]] : base;
        const plus = ui._btn('+', function () {
          const done = G.game && G.game.spendAttr ? G.game.spendAttr(a[0]) : false;
          if (!done) ui._sfx('error');
          ui._refresh();
        }, 'gold');
        plus.setAttribute('aria-label', 'Raise ' + a[1]);
        if (pts <= 0) plus.disabled = true;
        return h('div', { class: 'ed-attr' }, h('span', { text: a[1] }), h('b', { text: fmt(total) + (total !== base ? ' (' + fmt(base) + ')' : '') }), plus);
      }),
      p.autoBuild ? h('div', { class: 'ed-note', style: 'margin-top:6px', text: TX.inventory.autoBuildIsOn }) : null);
    // Short summary first (R3.4): what you hit for, how much you can take. The long list is one tap away.
    let w = null;
    if (G.items && G.items.getWeapon) { try { w = G.items.getWeapon(p); } catch (err) { w = null; } }
    const res = function (k) { return fmt(Math.min(75, (st[k] || 0) + (st.resAll || 0))) + '%'; };
    const right = h('div', { class: 'ed-box' },
      h('div', { class: 'ed-h', text: TX.inventory.atAGlance }),
      w ? kv('Damage per hit', fmt((w.dmgMin + (st.dmgMin || 0)) * (1 + (st.dmgPct || 0) / 100)) + ' - ' + fmt((w.dmgMax + (st.dmgMax || 0)) * (1 + (st.dmgPct || 0) / 100))) : null,
      kv('Life', fmt(st.hpMax || 0)),
      kv('Armor', fmt(st.armor || 0)),
      kv('Resist  fire / cold', res('resFire') + ' / ' + res('resCold')),
      kv('Resist  lightning / poison', res('resLightning') + ' / ' + res('resPoison')),
      ui._btn(view.all ? 'Hide all stats' : 'All stats', function () { view.all = !view.all; ui._refreshNow(); }),
      view.all ? GROUPS.map(function (g) {
        return [h('div', { class: 'ed-h', text: g[0] }), g[1].map(function (k) { return kv(statLabel(k), statVal(k, st[k] || 0)); })];
      }) : null);
    return h('div', { class: 'ed-body' }, h('div', { class: 'ed-cols' }, left, right));
  }

  // ---------- sorting (R5.7) ----------
  const SORTS = [['rarity', TX.inventory.rarity, 'Best colour first'], ['upgrades', TX.inventory.upgrades, 'Green arrows first'], ['newest', TX.inventory.newest, 'Latest finds first'],
    ['slot', TX.inventory.slot, 'Weapons, armour, jewellery'], ['level', TX.inventory.level, 'Highest item level first'], ['value', TX.inventory.value, 'Most gold first']];
  function sortMode() { const m = S.settings.sort; return SORTS.some(function (s) { return s[0] === m; }) ? m : 'rarity'; }
  function doSort(which, mode) {
    if (which === 'surface') { if (ui._sortSurface) ui._sortSurface(mode); return; }
    if (which !== 'stash') call('sortInventory', mode);
    if (which !== 'inv' && G.items && G.items.sortStash) call('sortStash', mode);
  }
  // which: 'inv' | 'stash' | 'both'. Two taps: Sort, then the order. The choice is remembered for next time.
  function sortPicker(which) {
    let close = null;
    const cur = sortMode();
    const rows = SORTS.map(function (s) {
      return h('button', { type: 'button', class: 'ed-row' + (s[0] === cur ? ' on' : ''), onclick: function () {
        ui._sfx('click'); close();
        S.settings.sort = s[0];
        doSort(which, s[0]);
        if (G.meta && G.meta.save) G.meta.save();
        ui._refreshNow();
      } }, h('span', { class: 'n' }, s[1], h('small', { text: s[2] })), s[0] === cur ? h('b', { class: 'ed-gold', text: '✓' }) : null);
    });
    close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: which === 'surface' ? 'Sort the crate by' : which === 'stash' ? 'Sort stash by' : which === 'both' ? 'Sort stash and pack by' : 'Sort pack by' }), rows],
      [ui._btn(TX.common.cancel, function () { close(); })]));
  }
  // R8.5: one tap re-sorts by the chosen mode; double-tap or press-and-hold opens the picker.
  function sortButton(which) {
    let lastTap = 0, hold = null, held = false;
    const b = ui._btn(TX.inventory.sort, function () {
      if (held) { held = false; return; }
      const now = Date.now();
      if (now - lastTap < 350) { lastTap = 0; sortPicker(which); return; }
      lastTap = now;
      doSort(which, sortMode());
      ui.toast(TX.inventory.sortedBy + sortMode() + '. Double-tap to change.', '#a89f8f');
      ui._refreshNow();
    });
    b.addEventListener('pointerdown', function () { held = false; clearTimeout(hold); hold = setTimeout(function () { held = true; sortPicker(which); }, 550); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { b.addEventListener(t, function () { clearTimeout(hold); }); });
    b.setAttribute('aria-label', 'Sort by ' + sortMode() + ' (double-tap to change)');
    return b;
  }
  // auto-sort (settings.autoSort, default on): whenever something ENTERS the bag or stash, put it in order again
  (function () {
    let bag = -1, stash = -1, busy = false;
    const count = function (a) { let n = 0; for (let i = 0; i < (a || []).length; i++) if (a[i]) n++; return n; };
    G.on('inventory:changed', function () {
      if (busy || !S.player) return;
      const nb = count(S.player.inventory), ns = count(S.stash);
      const grew = (bag >= 0 && nb > bag) || (stash >= 0 && ns > stash);
      const mode = sortMode();
      bag = nb; stash = ns;
      if (!grew || S.settings.autoSort === false) return;
      busy = true;
      try { call('sortInventory', mode); if (G.items && G.items.sortStash) call('sortStash', mode); } finally { busy = false; }
      bag = count(S.player.inventory); stash = count(S.stash);
    });
    G.on('scene:changed', function () { bag = stash = -1; });
  })();
  ui._sortButton = sortButton; ui._sortMode = sortMode;

  // ---------- junk rules (R3.1) ----------
  const JUNK_LEVELS = ['none', 'common', 'uncommon', 'rare'];      // R7.1 keys: old magic is now uncommon
  function junkRules() {
    const st = S.settings;
    if (!st.junk || typeof st.junk !== 'object') st.junk = { maxRarity: 'common', action: 'sell', auto: false, keepUpgrades: true, keepSocketed: true };
    return st.junk;
  }
  function junkCount() {
    const p = S.player;
    if (!p || !G.items || !G.items.isJunk) return 0;
    let n = 0;
    for (const it of (p.inventory || [])) if (it && ui._isJunk(it)) n++;
    return n;
  }
  ui._junkCount = junkCount;

  // The one "Clear junk" action. Selling only works in town; salvaging works anywhere.
  function clearJunk() {
    const p = S.player, rules = junkRules();
    if (!G.items || !G.items.processJunk) { ui.toast(TX.inventory.junkRulesAreNot, '#a89f8f'); return; }
    if (S.scene !== 'town') { ui._sfx('error'); ui.toast(TX.inventory.sendJunkDownA, '#a89f8f'); return; }
    const go = function () {
      let r = null;
      try { r = G.items.processJunk(); } catch (err) { console.error('[ui processJunk]', err); }
      if (r && r.count > 0) ui._sfx(rules.action === 'sell' ? 'sell' : 'click');
      else ui.toast(TX.inventory.noJunkToClear, '#a89f8f');
      ui._refresh();
    };
    // gems inside junk are destroyed too: only possible when "keep socketed" is off, and then we still ask once
    let gems = 0, dust = 0;
    if (!rules.keepSocketed && G.items.salvagePreview) {
      (p.inventory || []).forEach(function (it, i) {
        if (!it || !ui._isJunk(it)) return;
        try { const pv = G.items.salvagePreview(i); if (pv) { gems += pv.gems | 0; dust += pv.gemdust | 0; } } catch (err) { /* skip */ }
      });
    }
    if (gems > 0) {
      ui._confirm(gems + TX.chute.socketedGem + (gems === 1 ? '' : 's') + TX.inventory.willBeGroundTo2, 'Clear anyway', go,
        { danger: true, note: dust ? TX.inventory.returns + dust + TX.inventory.gemDust : null });
    } else go();
  }
  ui._clearJunk = clearJunk;

  // R16: nothing is sold or salvaged for you any more: no junk button in the bag. Junk is only marked; the chute panel sends it up.
  function junkButton() { return null; }
  ui._junkButton = junkButton;

  // The rules themselves: five one-tap rows. Used in the pause menu and (as a popup) on vendors and in the bag.
  function junkBlock(after) {
    const r = junkRules();
    const done = function () { if (G.meta && G.meta.save) G.meta.save(); if (after) after(); else ui._refreshNow(); };
    const row = function (label, value, cls, fn) {
      return h('button', { type: 'button', class: 'ed-btn', onclick: function () { ui._sfx('click'); fn(); done(); } },
        h('span', { text: label }), h('span', { class: cls, text: value }));
    };
    const lvl = JUNK_LEVELS.indexOf(r.maxRarity) >= 0 ? r.maxRarity : 'common';
    const what = lvl === 'none' ? 'Nothing' : ui._tierName(lvl) + (lvl === 'common' ? '' : ' and below');
    const onOff = function (v) { return v ? 'On' : 'Off'; };
    return [
      row('Junk is', what, lvl === 'none' ? 'ed-dim' : 'ed-gold', function () { r.maxRarity = JUNK_LEVELS[(JUNK_LEVELS.indexOf(lvl) + 1) % JUNK_LEVELS.length]; }),
      row('Queue for the chute', onOff(r.auto), r.auto ? 'ed-good' : 'ed-bad', function () { r.auto = !r.auto; }),
      row('Keep upgrades', onOff(r.keepUpgrades), r.keepUpgrades ? 'ed-good' : 'ed-bad', function () { r.keepUpgrades = !r.keepUpgrades; }),
      row('Keep gear with gems', onOff(r.keepSocketed), r.keepSocketed ? 'ed-good' : 'ed-bad', function () { r.keepSocketed = !r.keepSocketed; }),
      h('div', { class: 'ed-note', text: TX.inventory.setPiecesLegendaryItems + (r.auto
        ? 'Junk waits in your bag until you use a chute: one tap there sends it all up to the surface crate.' : 'Junk is only marked. Use "Send junk" at a chute.') }),
    ];
  }
  ui._junkBlock = junkBlock;

  // Popup version for the bag and vendors: change a rule, see the count update, clear — without leaving the screen.
  function junkPopup() {
    let close = null, box = null;
    const fill = function () {
      box.replaceChildren.apply(box, [h('div', { class: 'ed-h', text: TX.common.junkRules })].concat(junkBlock(function () { fill(); ui._refresh(); })));
    };
    box = h('div', { class: 'ed-list' });
    fill();
    close = ui._modal(ui._dialog([box], [ui._btn(TX.common.done, function () { close(); ui._refreshNow(); }, 'gold')]));
  }
  ui._junkPopup = junkPopup;

  // R7.11: "Book n" in the bag foot — how many carried pieces the Collection Book wants, one tap to the hand-in list
  function bookButton() {
    if (!G.items || !G.items.collection || !ui._wantedCount) return null;
    const n = ui._wantedCount();
    const b = ui._btn('Book' + (n ? ' ' + n : ''), function () { ui.open('collection'); }, n ? 'gold' : '');
    b.setAttribute('aria-label', 'Collection Book, ' + n + ' wanted pieces in your bag');
    return b;
  }

  ui._register('inventory', {
    render: function (view, arg) {
      const p = S.player;
      if (!p) return ui._frame(TX.inventory.inventory, null, h('div', { class: 'ed-body' }));
      if (!view.tab) view.tab = arg === 'character' ? 'char' : 'items';
      const pts = p.attrPoints | 0;
      return ui._frame(TX.inventory.hero, {
        tabs: [{ id: 'items', label: TX.inventory.items }, { id: 'char', label: TX.inventory.stats, badge: pts > 0 ? '+' + pts : null }],
        tab: view.tab, onTab: function (id) { view.tab = id; ui._refreshNow(); },
        right: view.tab === 'items' ? [sortButton('inv')] : null,
        foot: view.tab === 'items' ? [ui._reviewButton ? ui._reviewButton() : null, bookButton(),
          G.items && G.items.processJunk ? junkButton() : null, G.items && G.items.processJunk ? ui._btn(TX.inventory.rules, junkPopup) : null] : null,
      }, view.tab === 'char' ? renderChar(p, view) : renderItems(p));
    },
  });
  ui._register('character', { alias: 'inventory', arg: 'character' });
})();
