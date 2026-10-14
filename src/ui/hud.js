// In-game HUD. Every per-frame write is gated on a cached value so an idle frame touches no DOM.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const h = ui._h;

  const THEME_NAMES = { town: 'Emberfall', crypt: 'The Crypt', caves: 'Drowned Caves', inferno: 'The Inferno', abyss: 'The Abyss' };
  ui._themeName = function (depth) { return depth > 0 ? (THEME_NAMES[C.themeForDepth(depth)] || 'Dungeon') : THEME_NAMES.town; };

  // Monster tiers the target bar shows (R3.6). Colours come from the rarity table so Legendary matches the loot colour.
  const rc = function (k, fb) { return function () { return (C.RARITY[k] && C.RARITY[k].color) || fb; }; };
  const TIER = {
    champion: { label: 'Champion', color: rc('magic', '#5b8cff'), mods: true },
    rare: { label: 'Rare', color: rc('rare', '#ffe45b'), mods: true },
    legendary: { label: 'Legendary', color: rc('legendary', '#ff8a2b'), mods: true },
    boss: { label: 'Boss', color: function () { return '#ff6a5a'; }, mods: true },
  };

  let hud = null, visible = false;
  const el = { skills: [], cds: [], cdTxt: [], skIco: [] };
  // last values written to the DOM
  const last = { hp: -1, hpT: -1, mp: -1, mpT: -1, xp: -1, area: '', gold: -1, potHp: -1, potMp: -1, attr: -1, sp: -1, portal: null, boss: -2, bossName: '', corpse: -2, sealed: null, lock: '' };
  const slots = [];           // per skill slot: { id, mpCost, cooldown, cdStep, cdSec, nomana }
  let skDirty = true, questDirty = true, tick = 0, slow = 0, mmCtx = null, mmFailed = false;
  let goldFeed = null, goldFeedSum = 0, goldFeedT = 0;

  function topBtn(label, iconDesc, fn) {
    const badge = h('i', { class: 'ed-badge' });
    const b = h('button', { type: 'button', class: 'ed-top', onclick: function () { ui._sfx('click'); fn(); } },
      ui._icon(iconDesc, 24), h('span', { text: label }), badge);
    b._badge = badge;
    return b;
  }

  function press(node, fn) {
    node.addEventListener('pointerdown', function (e) { e.preventDefault(); fn(); });
  }

  function build(layers) {
    el.xp = h('i');
    el.area = h('div', { class: 'ed-area' });
    el.areaTxt = document.createTextNode('');
    el.goldTxt = h('small');
    el.area.append(el.areaTxt, el.goldTxt);
    el.tracker = h('div', { class: 'ed-tracker' });
    el.mm = h('canvas', { width: 80, height: 80 });
    mmCtx = el.mm.getContext('2d');

    el.bInv = topBtn('Bag', { shape: 'armor', color: '#b08a5a', accent: '#6b4a2a' }, function () {
      // unspent attribute points (and no auto-build to spend them): land on the sheet, one tap from the + buttons
      const p = S.player;
      ui.open('inventory', p && p.attrPoints > 0 && !p.autoBuild ? 'character' : undefined);
    });
    el.bSkl = topBtn('Skill', { shape: 'star', color: '#ffd94a', accent: '#ff8a2b' }, function () { ui.open('skills'); });
    el.bQst = topBtn('Quest', { shape: 'scroll', color: '#d8c9a3', accent: '#8f8470' }, function () { ui.open('quests'); });
    el.bTp = topBtn('Town', { shape: 'rune', color: '#7fd4ff', accent: '#2a56c6' }, function () {
      if (S.scene !== 'dungeon') return;
      if (S.flags.sealed) { ui._sfx('error'); ui.toast('The seal holds. No portal will open here.', '#ff5a50'); return; }
      ui._confirm('Open a portal to Emberfall?', 'Open Portal', function () { G.scenes.townPortal(); },
        { pause: true, note: 'The portal in town leads back to depth ' + S.depth + ' once.' });
    });
    el.bMenu = topBtn('Menu', { shape: 'key', color: '#c8c8c8', accent: '#6b6278' }, function () { ui.open('menu'); });

    el.bossName = h('b');
    el.bossFill = h('i');
    el.bossTier = h('small');
    el.boss = h('div', { class: 'ed-boss' }, el.bossName, h('div', { class: 'ed-bossbar' }, el.bossFill), el.bossTier);
    el.lockTitle = h('b');
    el.lockTxt = h('span');
    el.lock = h('div', { class: 'ed-lock', style: 'display:none' }, el.lockTitle, el.lockTxt);
    el.feed = h('div', { class: 'ed-feed' });

    el.hpFill = h('i'); el.hpTxt = h('span');
    el.mpFill = h('i'); el.mpTxt = h('span');
    el.potHpN = h('b'); el.potMpN = h('b');
    el.potCd = { hp: h('div', { class: 'ed-cd' }), mp: h('div', { class: 'ed-cd' }) };
    el.potHp = h('button', { type: 'button', class: 'ed-pot', 'aria-label': 'Health potion' }, ui._icon({ shape: 'potion', color: '#d0202c', accent: '#ff8a8a' }), el.potCd.hp, el.potHpN);
    el.potMp = h('button', { type: 'button', class: 'ed-pot', 'aria-label': 'Mana potion' }, ui._icon({ shape: 'potion', color: '#2a56c6', accent: '#8ab0ff' }), el.potCd.mp, el.potMpN);
    press(el.potHp, function () { G.emit('input:potion', { kind: 'hp' }); });
    press(el.potMp, function () { G.emit('input:potion', { kind: 'mp' }); });

    const cluster = h('div', { class: 'ed-cluster' },
      h('div', { class: 'ed-vitals' },
        h('div', { class: 'ed-orb hp' }, el.hpFill, el.hpTxt), el.potHp, el.potMp, h('div', { class: 'ed-orb mp' }, el.mpFill, el.mpTxt)));

    for (let i = 0; i < C.SKILL_SLOTS; i++) {
      const ico = h('i', { class: 'ed-ico' });
      const cd = h('div', { class: 'ed-cd' });
      const txt = h('u');
      const b = h('button', { type: 'button', class: 'ed-skill empty', style: 'grid-column:' + (i % 2 + 1) + ';grid-row:' + ((i >> 1) + 2), 'aria-label': 'Skill ' + (i + 1) },
        ico, cd, txt, h('em', { text: String(i + 1) }));
      press(b, function () {
        const p = S.player;
        if (p && p.skillBar && p.skillBar[i]) G.emit('input:skill', { slot: i });
        else ui.open('skills');
      });
      el.skills.push(b); el.cds.push(cd); el.cdTxt.push(txt); el.skIco.push(ico);
      slots.push({ id: undefined, mpCost: 0, cooldown: 0, cdStep: -1, cdSec: -1, nomana: null });
      cluster.appendChild(b);
    }

    el.atk = h('button', { type: 'button', class: 'ed-atk', 'aria-label': 'Attack' }, ui._icon({ shape: 'slash', color: '#ffb0a0', accent: '#b3202a' }, 48), 'Attack');
    el.atk.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { el.atk.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      G.input.attackHeld = true;
      el.atk.classList.add('on');
      G.emit('input:attack', {});
    });
    const release = function () { G.input.attackHeld = false; el.atk.classList.remove('on'); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { el.atk.addEventListener(t, release); });
    window.addEventListener('blur', release);
    cluster.appendChild(el.atk);

    // R4.4 class action (Ranger dash): shown only when the class has one; sits above the attack button (portrait) or
    // just left of the action cluster (landscape) — never in the joystick zone.
    el.dashIco = h('i', { class: 'ed-ico' });
    el.dashCd = h('div', { class: 'ed-cd' });
    el.dashName = h('span', { text: 'Dash' });
    el.dash = h('button', { type: 'button', class: 'ed-dash', 'aria-label': 'Dash' }, el.dashCd, el.dashIco, el.dashName);
    press(el.dash, function () { G.emit('input:classaction', {}); dash.poll = 0; });

    hud = h('div', { class: 'ed-hud', style: 'display:none' },
      h('div', { class: 'ed-xp' }, el.xp), el.area, el.tracker,
      h('button', { type: 'button', class: 'ed-mm', 'aria-label': 'Map', onclick: function () { ui._sfx('click'); ui.open('map'); } }, el.mm),
      h('div', { class: 'ed-topbtns' }, el.bTp, el.bInv, el.bSkl, el.bQst, el.bMenu),
      el.boss, el.lock, el.feed, cluster, el.dash);
    layers.hud.appendChild(hud);
  }

  // ---------- slow refreshers ----------
  function refreshSkills(p) {
    skDirty = false;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const id = (p.skillBar && p.skillBar[i]) || null;
      let info = null;
      if (id && G.game) {
        if (G.game.getSkillInfo) { try { info = G.game.getSkillInfo(id); } catch (err) { info = null; } }
        if (!info && G.game.SKILLS) info = G.game.SKILLS[id];
      }
      s.mpCost = (info && +info.mpCost) || 0;
      s.cooldown = (info && +info.cooldown) || 0;
      if (s.id !== id) {
        s.id = id;
        el.skills[i].classList.toggle('empty', !id);
        let url = null;
        if (info && info.icon && G.engine && G.engine.getIconURL) { try { url = G.engine.getIconURL(info.icon, 40); } catch (err) { url = null; } }
        el.skIco[i].style.backgroundImage = url ? 'url("' + url + '")' : '';
        el.skIco[i].style.backgroundColor = url ? '' : ((info && info.icon && info.icon.color) || '#6b6278');
        el.skIco[i].classList.toggle('ed-ico-fb', !url);
      }
    }
  }

  function refreshTracker() {
    questDirty = false;
    const list = (G.meta && G.meta.getQuests) ? G.meta.getQuests() : [];
    const rows = [];
    let mainOffer = false;
    const corpse = S.flags.corpse;
    if (corpse) {
      rows.push(h('div', { style: 'color:#ff6a5a', text: S.depth === corpse.depth && S.scene === 'dungeon'
        ? '☠ Your corpse is on this floor' : '☠ Your corpse: depth ' + corpse.depth }));
    }
    for (const q of list) {
      if (q.status === 'ready') rows.push(h('div', { style: 'color:#ffd94a', text: '* ' + q.name + ' - see the Elder' }));
      else if (q.status === 'active') rows.push(h('div', { text: '- ' + q.name + ' ' + q.progress + '/' + q.goal }));
      else if (q.status === 'available' && q.main) mainOffer = true;
    }
    if (mainOffer && !rows.length) rows.push(h('div', { style: 'color:#ff8a2b', text: '! The Elder has work for you' }));
    el.tracker.replaceChildren.apply(el.tracker, rows.slice(0, 4));
  }

  function refreshSlow(p) {
    // area + gold
    const area = 'Lv ' + (p.level || 1) + '  ' + ui._themeName(S.depth) + (S.depth > 0 ? ' ' + S.depth : '');
    if (area !== last.area) { last.area = area; el.areaTxt.nodeValue = area; }
    const gold = p.gold | 0;
    // floor modifiers (R3.7) ride on the gold line under the depth label; the game toasts them on arrival
    const fm = S.map && Array.isArray(S.map.mods) ? S.map.mods : null;
    const fmKey = fm && fm.length ? fm.join(',') : '';
    if (gold !== last.gold || fmKey !== last.mods) {
      last.gold = gold; last.mods = fmKey;
      const FM = (G.game && G.game.FLOOR_MODS) || {};
      const names = fm ? fm.map(function (id) { return (FM[id] && FM[id].name) || id; }) : [];
      el.goldTxt.replaceChildren(gold + ' g', names.length ? h('span', { class: 'ed-mods', text: '  ' + names.join(' · ') }) : '');
    }
    const portal = S.scene === 'dungeon';
    if (portal !== last.portal) { last.portal = portal; el.bTp.style.display = portal ? '' : 'none'; }
    const attr = p.attrPoints | 0, sp = p.skillPoints | 0;
    if (attr !== last.attr) { last.attr = attr; el.bInv._badge.style.display = attr > 0 ? 'block' : 'none'; el.bInv._badge.textContent = attr > 0 ? '+' + attr : ''; }
    if (sp !== last.sp) { last.sp = sp; el.bSkl._badge.style.display = sp > 0 ? 'block' : 'none'; el.bSkl._badge.textContent = sp > 0 ? '+' + sp : ''; }

    // minimap
    if (mmCtx && !mmFailed && G.engine && G.engine.drawMinimap && S.map) {
      try { G.engine.drawMinimap(mmCtx, 80, 80); } catch (err) { mmFailed = true; console.error('[ui minimap]', err); }
    }

    // target bar (R3.6): the current auto-target (G.state.targetId) when it is more than a common monster, else a
    // living boss that is hurt or close. Tier + modifier names for rare / legendary (and any boss that has them).
    let tgt = null;
    const ents = S.entities;
    if (S.targetId != null) {
      for (let i = 0; i < ents.length; i++) { const e = ents[i]; if (e.id === S.targetId) { tgt = e; break; } }
      if (tgt && (tgt.dead || !TIER[tgt.rarity] || (tgt.faction && tgt.faction !== 'enemy'))) tgt = null;
    }
    if (!tgt) {
      for (let i = 0; i < ents.length; i++) {
        const e = ents[i];
        if (e.type === 'monster' && e.rarity === 'boss' && !e.dead && (!e.faction || e.faction === 'enemy')) {
          const max = (e.stats && e.stats.hpMax) || e.hp || 1, dx = e.x - p.x, dy = e.y - p.y;
          if (e.hp < max || dx * dx + dy * dy < 196) tgt = e;
          break;
        }
      }
    }
    let pct = -1;
    if (tgt) {
      const max = (tgt.stats && tgt.stats.hpMax) || tgt.hpMax || tgt.hp || 1;
      pct = Math.max(0, Math.min(100, Math.ceil(tgt.hp / max * 100)));
    }
    if (pct !== last.boss) {
      if ((pct < 0) !== (last.boss < 0)) el.boss.style.display = pct < 0 ? 'none' : 'block';
      last.boss = pct;
      if (pct >= 0) el.bossFill.style.width = pct + '%';
    }
    if (tgt) {
      const key = tgt.id + '|' + tgt.name + '|' + (tgt.affixes || []).join(',');
      if (key !== last.bossName) {
        last.bossName = key;
        const tier = TIER[tgt.rarity];
        el.bossName.textContent = tgt.name || tier.label;
        el.bossName.style.color = tier.color();
        const mods = tier.mods && Array.isArray(tgt.affixes) ? tgt.affixes : [];
        const shown = mods.slice(0, 3).join(' · ') + (mods.length > 3 ? ' +' + (mods.length - 3) : '');
        el.bossTier.textContent = tier.label + (shown ? ':  ' + shown : '');
        el.bossTier.style.color = tier.color();
      }
    }

    // corpse marker + sealed portal
    const cd = S.flags.corpse ? S.flags.corpse.depth * 1000 + S.depth : -1;
    if (cd !== last.corpse) { last.corpse = cd; questDirty = true; }
    const sealed = !!S.flags.sealed;
    if (sealed !== last.sealed) { last.sealed = sealed; el.bTp.style.opacity = sealed ? '.35' : ''; el.bTp.setAttribute('aria-disabled', sealed ? 'true' : 'false'); }

    // lockdown banner: wave text follows room.wave when the game keeps it up to date
    if (lock.room) {
      const txt = lockText();
      if (txt !== last.lock) { last.lock = txt; el.lockTxt.textContent = txt; }
    } else if (lock.t > 0) {
      lock.t -= 0.2;
      if (lock.t <= 0) el.lock.style.display = 'none';
    }

    if (questDirty) refreshTracker();
  }

  // Class action button: visibility/icon checked 4x/s, the cooldown sweep every frame only while cooling.
  const dash = { shown: false, id: null, step: 0, poll: 0 };
  function classAction() {
    const fn = G.game && G.game.getClassAction;
    dash.poll -= 1;
    if (!fn || (dash.poll > 0 && dash.step === 0)) return;
    dash.poll = 15;
    let a = null;
    try { a = fn(); } catch (err) { a = null; }
    const show = !!a;
    if (show !== dash.shown) {
      dash.shown = show;
      el.dash.style.display = show ? 'block' : 'none';
      hud.classList.toggle('has-dash', show);
    }
    if (!a) return;
    if (a.id !== dash.id) {
      dash.id = a.id;
      el.dashName.textContent = a.name || 'Dash';
      el.dash.setAttribute('aria-label', a.name || 'Dash');
      let url = null;
      if (a.icon && G.engine && G.engine.getIconURL) { try { url = G.engine.getIconURL(a.icon, 28); } catch (err) { url = null; } }
      el.dashIco.style.backgroundImage = url ? 'url("' + url + '")' : '';
    }
    const rem = +a.cdRemaining || 0, total = Math.max(+a.cooldown || 0, rem);
    const step = rem > 0 && total > 0 ? Math.max(1, Math.ceil(rem / total * 36)) : 0;
    if (step !== dash.step) {
      if ((step > 0) !== (dash.step > 0)) el.dash.classList.toggle('cooling', step > 0);
      dash.step = step;
      if (step > 0) el.dashCd.style.setProperty('--cd', (step * 10) + 'deg');
    }
  }

  // ---------- per frame ----------
  // Potion cooldown sweep. The game only reports seconds remaining, so the full length is the largest value seen this cooldown.
  const potCd = { hp: { total: 0, step: 0 }, mp: { total: 0, step: 0 } };
  function potionCd(kind, btn) {
    if (!G.game || !G.game.getPotionCooldown) return;
    const s = potCd[kind];
    const rem = +G.game.getPotionCooldown(kind) || 0;
    let step = 0;
    if (rem > 0) { if (rem > s.total) s.total = rem; step = Math.max(1, Math.ceil(rem / s.total * 36)); } else s.total = 0;
    if (step === s.step) return;
    if ((step > 0) !== (s.step > 0)) btn.classList.toggle('cooling', step > 0);
    s.step = step;
    if (step > 0) el.potCd[kind].style.setProperty('--cd', (step * 10) + 'deg');
  }

  function update(dt) {
    const p = S.player;
    const show = !!p && S.scene !== 'menu';
    if (show !== visible) { visible = show; hud.style.display = show ? '' : 'none'; if (!show) G.input.attackHeld = false; }
    if (!show) return;

    const st = p.stats || {};
    const hpMax = st.hpMax || 1, mpMax = st.mpMax || 1;
    let v = Math.max(0, Math.min(100, Math.round(p.hp / hpMax * 100)));
    if (v !== last.hp) { last.hp = v; el.hpFill.style.height = v + '%'; }
    v = Math.max(0, Math.ceil(p.hp));
    if (v !== last.hpT) { last.hpT = v; el.hpTxt.textContent = v; }
    v = Math.max(0, Math.min(100, Math.round(p.mp / mpMax * 100)));
    if (v !== last.mp) { last.mp = v; el.mpFill.style.height = v + '%'; }
    v = Math.max(0, Math.floor(p.mp));
    if (v !== last.mpT) { last.mpT = v; el.mpTxt.textContent = v; }
    v = p.xpNext > 0 ? Math.max(0, Math.min(200, Math.floor(p.xp / p.xpNext * 200))) : 0;
    if (v !== last.xp) { last.xp = v; el.xp.style.width = (v / 2) + '%'; }

    const pot = p.potions;
    v = pot ? pot.hp | 0 : 0;
    if (v !== last.potHp) { last.potHp = v; el.potHpN.textContent = v; el.potHp.classList.toggle('empty', v <= 0); }
    v = pot ? pot.mp | 0 : 0;
    if (v !== last.potMp) { last.potMp = v; el.potMpN.textContent = v; el.potMp.classList.toggle('empty', v <= 0); }

    potionCd('hp', el.potHp); potionCd('mp', el.potMp);
    classAction();

    // skill bar: ids are compared every frame, costs/cooldown lengths only when something changed
    const bar = p.skillBar;
    if (!skDirty && bar) {
      for (let i = 0; i < slots.length; i++) if ((bar[i] || null) !== slots[i].id) { skDirty = true; break; }
    }
    if (skDirty) refreshSkills(p);
    const cds = p.cooldowns;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s.id) continue;
      const rem = (cds && cds[s.id]) || 0;
      let step = 0, sec = 0;
      if (rem > 0) {
        const total = Math.max(s.cooldown, rem);
        step = Math.max(1, Math.ceil(rem / total * 36));
        sec = Math.ceil(rem);
      }
      if (step !== s.cdStep) {
        if ((step > 0) !== (s.cdStep > 0)) el.skills[i].classList.toggle('cooling', step > 0);
        s.cdStep = step;
        if (step > 0) el.cds[i].style.setProperty('--cd', (step * 10) + 'deg');
      }
      if (sec !== s.cdSec) { s.cdSec = sec; el.cdTxt[i].textContent = sec > 0 ? sec : ''; }
      const nomana = p.mp < s.mpCost;
      if (nomana !== s.nomana) { s.nomana = nomana; el.skills[i].classList.toggle('nomana', nomana); }
    }

    tick -= dt;
    if (tick <= 0) { tick = 0.2; refreshSlow(p); }
    slow -= dt;
    if (slow <= 0) { slow = 1; skDirty = true; }
    if (goldFeed) { goldFeedT -= dt; if (goldFeedT <= 0) { goldFeed.remove(); goldFeed = null; goldFeedSum = 0; } }
  }

  // ---------- loot feed ----------
  function feed(text, color) {
    if (!el.feed) return null;
    while (el.feed.childNodes.length >= 4) {
      if (el.feed.firstChild === goldFeed) { goldFeed = null; goldFeedSum = 0; }
      el.feed.firstChild.remove();
    }
    const row = h('div', { text: text, style: 'color:' + (color || '#c8c8c8') });
    el.feed.appendChild(row);
    return row;
  }

  ui._inits.push(build);
  ui._updaters.push(update);

  G.on('item:picked', function (e) {
    const it = e && e.item;
    if (!it || !visible) return;
    if (it.type === 'gold') return;       // announced through gold:changed
    // auto-salvaged junk (R3.1): one quiet grey line, no arrow
    if (e.salvaged) {
      const mats = e.materials ? ui._matsText(e.materials) : '';
      const q = feed('Salvaged ' + it.name + (mats ? ': ' + mats : ''), '#8a8074');
      if (q) setTimeout(function () { q.remove(); }, 3000);
      return;
    }
    // Legendary sub-tiers are named in the feed; a Mythic gets its own banner line and stays twice as long.
    const rar = C.RARITY[it.rarity];
    const sub = rar && rar.sub ? rar.name.toUpperCase() : '';
    const myth = it.rarity === 'mythic';
    const v = ui._verdict ? ui._verdict(it) : null;
    const row = feed('', ui._rarityColor(it.rarity));
    if (!row) return;
    if (myth) { row.className = 'myth'; row.textContent = sub + ': ' + it.name; }
    else row.textContent = '+ ' + (it.qty > 1 ? it.qty + ' ' : '') + it.name + (sub ? '  [' + sub + ']' : '');
    // R3.4 arrows; an upgrade line is a button that opens the item straight away (pick up -> compare -> equip in 2 taps)
    if (v === 'up' || v === 'down') row.insertBefore(h('b', { class: v === 'up' ? 'ed-good' : 'ed-bad', text: v === 'up' ? '▲ ' : '▼ ' }), row.firstChild);
    if (v === 'up') {
      row.className += ' tap';
      row.addEventListener('click', function () {
        const p = S.player, i = p ? p.inventory.indexOf(it) : -1;
        if (i < 0) return;
        ui._sfx('click');
        ui.open('inventory');
        ui._showItem(it, ui._invActions(it, i, 'inv'));
      });
    }
    setTimeout(function () { row.remove(); }, myth ? 10000 : (v === 'up' ? 8000 : 5000));
  });
  G.on('gold:changed', function (e) {
    if (!e || !(e.delta > 0) || !visible || ui.isOpen()) return;
    goldFeedSum += e.delta;
    if (!goldFeed || !goldFeed.parentNode) goldFeed = feed('', '#ffd94a');
    if (goldFeed) { goldFeed.textContent = '+ ' + goldFeedSum + ' gold'; goldFeedT = 3; }
  });
  G.on('player:levelup', function (e) {
    skDirty = true;
    ui.toast('Level ' + ((e && e.level) || (S.player && S.player.level) || '') + '!', '#ffd94a');
  });
  ['skills:changed', 'player:stats', 'equipment:changed'].forEach(function (n) { G.on(n, function () { skDirty = true; }); });
  ['quest:updated', 'quest:completed'].forEach(function (n) { G.on(n, function () { questDirty = true; }); });
  // ---------- lockdown rooms (R2.5) ----------
  // The contract has no per-wave event, so the counter reads room.wave (1-based) if the game maintains it and also
  // listens for an optional 'room:wave' { room, wave }; with neither it just names the number of waves.
  const lock = { room: null, wave: 0, t: 0 };
  function lockText() {
    // R4.5: the game reports the live wave through getLockdown(); the room object and room:wave are fallbacks
    let L = null;
    if (G.game && G.game.getLockdown) { try { L = G.game.getLockdown(); } catch (err) { L = null; } }
    const r = lock.room;
    const total = (L && L.waves) | 0 || (r && r.waves) | 0;
    const cur = Math.max(lock.wave, (L && L.wave) | 0, (r && r.wave) | 0);
    if (cur > 0 && total > 0) return 'Wave ' + Math.min(cur, total) + ' / ' + total;
    return total > 0 ? total + ' waves' : 'Survive';
  }
  G.on('room:locked', function (e) {
    if (!el.lock) return;
    lock.room = (e && e.room) || {}; lock.wave = 0; lock.t = 0;
    el.lock.className = 'ed-lock';
    el.lockTitle.textContent = 'The doors slam shut';
    last.lock = lockText(); el.lockTxt.textContent = last.lock;
    el.lock.style.display = 'block';
    ui._sfx('door');
  });
  G.on('room:wave', function (e) { if (e && e.wave > 0) lock.wave = e.wave | 0; });
  G.on('room:cleared', function () {
    if (!el.lock) return;
    lock.room = null; lock.wave = 0; lock.t = 3.5;
    el.lock.className = 'ed-lock clear';
    el.lockTitle.textContent = 'The seal is broken';
    last.lock = 'The chest is yours'; el.lockTxt.textContent = last.lock;
    el.lock.style.display = 'block';
  });

  G.on('scene:changed', function () {
    lock.room = null; lock.wave = 0; lock.t = 0;
    if (el.lock) el.lock.style.display = 'none';
    questDirty = true; skDirty = true; tick = 0; last.boss = -2; last.bossName = '';
    if (el.boss) el.boss.style.display = 'none';
    if (el.feed) el.feed.replaceChildren();
    goldFeed = null; goldFeedSum = 0;
    if (mmCtx) mmCtx.clearRect(0, 0, 80, 80);
    mmFailed = false;
  });
})();
