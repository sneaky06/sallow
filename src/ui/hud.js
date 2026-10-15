// In-game HUD. Every per-frame write is gated on a cached value so an idle frame touches no DOM.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const h = ui._h;

  const THEME_NAMES = { town: 'Emberdeep', crypt: 'The Crypt', caves: 'Drowned Caves', inferno: 'The Inferno', abyss: 'The Abyss' };
  ui._themeName = function (depth) { return depth > 0 ? (THEME_NAMES[C.themeForDepth(depth)] || 'Dungeon') : (ui._townName ? ui._townName() : THEME_NAMES.town); };

  // Monster tiers the target bar shows (R3.6). Fixed colours: the R7.1 loot ladder reused blue / yellow / orange for items.
  const rc = function (k, fb) { return function () { return (C.RARITY[k] && C.RARITY[k].color) || fb; }; };
  const TIER = {
    champion: { label: 'Champion', color: function () { return '#5b8cff'; }, mods: true },
    rare: { label: 'Rare', color: function () { return '#ffe45b'; }, mods: true },
    legendary: { label: 'Legendary', color: function () { return '#ff8a2b'; }, mods: true },
    boss: { label: 'Boss', color: function () { return '#ff6a5a'; }, mods: true },
  };
  // R6.2 the Echo: a boss-style bar whatever rarity the game gives it
  const ECHO_TIER = { label: 'Your Echo', color: function () { return '#bfe6ff'; }, mods: false };
  const isEcho = function (e) { return !!(ui._isEcho && ui._isEcho(e)); };
  const tierOf = function (e) { return isEcho(e) ? ECHO_TIER : TIER[e.rarity]; };

  let hud = null, visible = false;
  const el = { skills: [], cds: [], cdTxt: [], skIco: [] };
  // last values written to the DOM
  const last = { hp: -1, hpT: -1, mp: -1, mpT: -1, xp: -1, area: '', gold: -1, potHp: -1, potMp: -1, attr: -1, sp: -1, portal: null, boss: -2, bossName: '', corpse: -2, sealed: null, lock: '', floor: '', pal: '', expl: -2 };
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
    // R5.10 floor name and R5.2 Pallor meter sit under the depth label
    el.floor = h('small', { class: 'ed-floor', style: 'display:none' });
    el.palFill = h('i');
    el.palTxt = h('span');
    el.pallor = h('div', { class: 'ed-pallor', style: 'display:none' }, h('div', { class: 'ed-palbar' }, el.palFill), el.palTxt);
    // R7.5 explored % of the floor, under the depth label
    el.explTxt = document.createTextNode('');
    el.explBar = h('u');
    el.expl = h('div', { class: 'ed-expl', style: 'display:none' }, el.explTxt, h('i', null, el.explBar));
    el.area.append(el.areaTxt, el.goldTxt, el.floor, el.expl, el.pallor);
    // R7.5 timed event: name, hint, timer (+ goal) and a draining bar; sits under the quest tracker
    el.evName = h('b'); el.evTxt = h('span'); el.evTime = h('span'); el.evBar = h('i');
    el.event = h('div', { class: 'ed-event' }, el.evName, el.evTxt, el.evTime, h('div', { class: 'bar' }, el.evBar));
    el.tracker = h('div', { class: 'ed-tracker ed-mv' });
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
      ui._confirm('Open a portal to ' + ui._townName() + '?', 'Open Portal', function () { G.scenes.townPortal(); },
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

    // R5.1: the action cluster is split into pieces the player can move one by one (hudedit.js); the CSS defaults
    // reproduce the old cluster: potions + orbs on top, 2x2 skills, attack at the bottom right.
    el.vitals = h('div', { class: 'ed-vitals ed-mv' },
      h('div', { class: 'ed-orb hp' }, el.hpFill, el.hpTxt), el.potHp, el.potMp, h('div', { class: 'ed-orb mp' }, el.mpFill, el.mpTxt));
    el.skillBox = h('div', { class: 'ed-skills ed-mv' });

    for (let i = 0; i < C.SKILL_SLOTS; i++) {
      const ico = h('i', { class: 'ed-ico' });
      const cd = h('div', { class: 'ed-cd' });
      const txt = h('u');
      const b = h('button', { type: 'button', class: 'ed-skill empty', 'aria-label': 'Skill ' + (i + 1) },
        ico, cd, txt, h('em', { text: String(i + 1) }));
      press(b, function () {
        const p = S.player;
        if (p && p.skillBar && p.skillBar[i]) G.emit('input:skill', { slot: i });
        else ui.open('skills');
      });
      el.skills.push(b); el.cds.push(cd); el.cdTxt.push(txt); el.skIco.push(ico);
      slots.push({ id: undefined, mpCost: 0, cooldown: 0, cdStep: -1, cdSec: -1, nomana: null });
      el.skillBox.appendChild(b);
    }

    el.atk = h('button', { type: 'button', class: 'ed-atk ed-mv', 'aria-label': 'Attack' }, ui._icon({ shape: 'slash', color: '#ffb0a0', accent: '#b3202a' }, 48), 'Attack');
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

    // R4.4 class action (Ranger dash): shown only when the class has one; sits above the attack button (portrait) or
    // just left of the action cluster (landscape) — never in the joystick zone.
    el.dashIco = h('i', { class: 'ed-ico' });
    el.dashCd = h('div', { class: 'ed-cd' });
    el.dashName = h('span', { text: 'Dash' });
    el.dashPips = h('div', { class: 'ed-pips' });
    el.dash = h('button', { type: 'button', class: 'ed-dash ed-mv', 'aria-label': 'Dash' }, el.dashCd, el.dashPips, el.dashIco, el.dashName);
    press(el.dash, function () { G.emit('input:classaction', {}); dash.poll = 0; });

    // the portal button left the top row so it can be placed on its own; by default it sits where it always did
    el.bTp.className += ' ed-portal ed-mv';
    el.mmBtn = h('button', { type: 'button', class: 'ed-mm ed-mv', 'aria-label': 'Map', onclick: function () { ui._sfx('click'); ui.open('map'); } }, el.mm);
    hud = h('div', { class: 'ed-hud', style: 'display:none' },
      h('div', { class: 'ed-xp' }, el.xp), el.area, el.tracker, el.mmBtn,
      h('div', { class: 'ed-topbtns' }, el.bInv, el.bSkl, el.bQst, el.bMenu), el.bTp,
      el.event, el.boss, el.lock, el.feed, el.vitals, el.skillBox, el.atk, el.dash);
    layers.hud.appendChild(hud);
    ui._hudEl = hud;
    // movable pieces for the HUD editor, in the order they are listed there
    ui._hudMovables = {
      atk: { el: el.atk, label: 'Attack' }, skills: { el: el.skillBox, label: 'Skills' }, vitals: { el: el.vitals, label: 'Potions' },
      dash: { el: el.dash, label: 'Dash' }, portal: { el: el.bTp, label: 'Portal' }, mm: { el: el.mmBtn, label: 'Map' },
      tracker: { el: el.tracker, label: 'Quests' },
    };
  }

  // ---------- floor name + Pallor ----------
  const ROMAN = ['', 'I', 'II', 'III', 'IV'];
  // R5.10: the world team names each floor; the field is read defensively (floorName first, the variant name last)
  ui._floorName = function () {
    const m = S.map;
    if (!m || S.scene !== 'dungeon') return '';
    const v = m.variant && typeof m.variant === 'object' ? m.variant : null;
    const n = m.floorName || (v && v.floorName) || (typeof m.name === 'string' ? m.name : '') || (v && v.name) || '';
    return typeof n === 'string' ? n : '';
  };
  // { value 0..100, tier 0..4, effects } once the ending has unlocked Pallor, else null
  function pallorInfo() {
    if (!S.flags.pallorUnlocked) return null;
    let p = null;
    if (G.game && G.game.getPallor) { try { p = G.game.getPallor(); } catch (err) { p = null; } }
    const value = Math.max(0, Math.min(100, Math.round(p && p.value != null ? +p.value : +S.flags.pallor || 0)));
    const tier = p && p.tier != null ? p.tier | 0 : Math.min(4, Math.floor(value / 25));
    return { value: value, tier: tier, effects: (p && Array.isArray(p.effects)) ? p.effects : [] };
  }
  ui._pallorInfo = pallorInfo;

  // ---------- explored % (R7.5) ----------
  // Share of walkable tiles in map.explored. The game may publish its own figure through G.game.getExplored() (0..1, 0..100 or { pct });
  // otherwise the walkable mask is built once per map and counted against map.explored.
  let explTick = 0;
  const walk = { map: null, mask: null, n: 0 };
  ui._exploredPct = exploredPct;
  function exploredPct() {
    const m = S.map;
    if (!m || S.scene !== 'dungeon') return -1;
    if (G.game && typeof G.game.getExplored === 'function') {
      try {
        const g = G.game.getExplored();
        const v = g && typeof g === 'object' ? (g.pct != null ? g.pct : g.value) : g;
        if (typeof v === 'number' && isFinite(v)) return Math.max(0, Math.min(100, Math.round(v)));      // game.getExplored() is 0..100
      } catch (err) { /* count it ourselves */ }
    }
    if (!m.explored || !m.w || !m.h) return -1;
    if (walk.map !== m) {
      const n = m.w * m.h, mask = new Uint8Array(n);
      let cnt = 0;
      const W = G.world;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        let ok = true;
        try { ok = W && W.isWalkable ? !!W.isWalkable(m, x, y) : true; } catch (err) { ok = true; }
        if (ok) { mask[y * m.w + x] = 1; cnt++; }
      }
      walk.map = m; walk.mask = mask; walk.n = cnt;
    }
    if (!walk.n) return -1;
    const ex = m.explored, mk = walk.mask;
    let seen = 0;
    for (let i = 0; i < mk.length; i++) if (mk[i] && ex[i]) seen++;
    return Math.min(100, Math.floor(seen / walk.n * 100));
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
    // R6.2: an abandoned corpse waits as an Echo (game state; the field name is guarded)
    const echo = S.flags.echo, ed = echo && typeof echo === 'object' ? echo.depth | 0 : 0;
    if (ed > 0 && ui._echoText) rows.push(h('div', { style: 'color:#bfe6ff', text: S.scene === 'dungeon' && S.depth === ed ? ui._echoText('trackerHere') : ui._echoText('tracker', ed) }));
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
    // floor name (R5.10) and Pallor (R5.2); the quest tracker's default top follows the label's height
    const fname = ui._floorName();
    const pal = pallorInfo();
    const palKey = pal ? pal.value + '|' + pal.tier : '';
    // explored % (R7.5): counted once a second, redrawn only when the whole number changes
    let ex = last.expl;
    if (++explTick >= 5 || last.expl === -2) { explTick = 0; ex = exploredPct(); }
    let explChanged = false;
    if (ex !== last.expl) {
      explChanged = (ex < 0) !== (last.expl < 0);
      last.expl = ex;
      if (explChanged) el.expl.style.display = ex < 0 ? 'none' : 'block';
      if (ex >= 0) { el.explTxt.nodeValue = 'Explored ' + ex + '%'; el.explBar.style.width = ex + '%'; }
    }
    if (fname !== last.floor || palKey !== last.pal || explChanged) {
      if ((fname !== '') !== (last.floor !== '')) el.floor.style.display = fname ? 'block' : 'none';
      if (fname !== last.floor) el.floor.textContent = fname;
      if ((palKey !== '') !== (last.pal !== '')) el.pallor.style.display = pal ? 'flex' : 'none';
      if (pal) {
        el.palFill.style.width = pal.value + '%';
        el.palTxt.textContent = 'Pallor ' + pal.value + (pal.tier > 0 ? ' ' + ROMAN[Math.min(pal.tier, 4)] : '');
        el.pallor.className = 'ed-pallor t' + Math.min(pal.tier, 4);
      }
      last.floor = fname; last.pal = palKey;
      hud.style.setProperty('--trk-top', (el.area.offsetTop + el.area.offsetHeight + 4) + 'px');
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
      if (tgt && (tgt.dead || !tierOf(tgt) || (tgt.faction && tgt.faction !== 'enemy'))) tgt = null;
    }
    if (!tgt) {
      for (let i = 0; i < ents.length; i++) {
        const e = ents[i];
        if ((e.rarity === 'boss' || isEcho(e)) && e.type !== 'npc' && !e.dead && (!e.faction || e.faction === 'enemy')) {
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
        const tier = tierOf(tgt), echo = tier === ECHO_TIER;
        el.boss.classList.toggle('echo', echo);
        el.bossName.textContent = echo && ui._echoName ? ui._echoName(tgt) : (tgt.name || tier.label);
        el.bossName.style.color = tier.color();
        const mods = tier.mods && Array.isArray(tgt.affixes) ? tgt.affixes : [];
        const shown = mods.slice(0, 3).join(' · ') + (mods.length > 3 ? ' +' + (mods.length - 3) : '');
        el.bossTier.textContent = tier.label + (shown ? ':  ' + shown : '');
        el.bossTier.style.color = tier.color();
      }
    }

    // corpse marker + sealed portal
    const ec = S.flags.echo && typeof S.flags.echo === 'object' ? S.flags.echo.depth | 0 : 0;
    const cd = (S.flags.corpse ? S.flags.corpse.depth * 1000 + S.depth : -1) + ec * 1e6;
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

  // Class action (R4.4, every class since R6.3): visibility/icon checked 4x/s, the recharge sweep every frame only while
  // cooling. Charges (R6.3) show as pips; while some charges are left the sweep is faint because the dash still works.
  const dash = { shown: false, id: null, step: 0, poll: 0, pips: '', partial: null };
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
    const max = Math.max(0, +(a.maxCharges != null ? a.maxCharges : a.chargesMax != null ? a.chargesMax : 0) | 0);
    const ch = a.charges != null ? Math.max(0, a.charges | 0) : (rem > 0 ? 0 : 1);
    const pips = max > 1 ? ch + '/' + max : '';
    if (pips !== dash.pips) {
      dash.pips = pips;
      const row = [];
      for (let i = 0; i < max && max > 1; i++) row.push(h('b', { class: i < ch ? null : 'off' }));
      el.dashPips.replaceChildren.apply(el.dashPips, row);
      el.dash.classList.toggle('empty', max > 1 && ch === 0);
    }
    const partial = ch > 0 && rem > 0;
    if (partial !== dash.partial) { dash.partial = partial; el.dash.classList.toggle('partial', partial); }
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
    if (ev.on || ev.hold > 0) eventTick(dt);

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
    // R7.1: Legendary Elite / Mythic / Unique / Rift are named in the feed with their glow; the top four tiers get their own banner
    // line and stay twice as long. Colour, glow strength and the rift pulse come from C.RARITY.
    const rar = C.RARITY[it.rarity];
    const glow = rar && +rar.glow || 0;
    const sub = rar && (rar.sub || glow >= 2) ? rar.name.toUpperCase() : '';
    const myth = glow >= 2.5;
    const v = ui._verdict ? ui._verdict(it) : null;
    const want = ui._wanted ? ui._wanted(it) : false;                      // R7.11 fills a gap in the Collection Book
    const row = feed('', ui._rarityColor(it.rarity));
    if (!row) return;
    row.style.setProperty('--rc', ui._rarityColor(it.rarity));
    if (ui._glowText(it.rarity)) row.className = ui._glowText(it.rarity);
    const sockets = Array.isArray(it.sockets) && it.sockets.length ? '  ' + it.sockets.map(function (g) { return g ? '◆' : '◇'; }).join('') : '';
    if (myth) { row.className += ' myth'; row.textContent = sub + ': ' + it.name + sockets; }
    else row.textContent = '+ ' + (it.qty > 1 ? it.qty + ' ' : '') + it.name + sockets + (sub ? '  [' + sub + ']' : '');
    // R3.4 arrows; an upgrade line is a button that opens the item straight away (pick up -> compare -> equip in 2 taps)
    if (v === 'up' || v === 'down') row.insertBefore(h('b', { class: v === 'up' ? 'ed-good' : 'ed-bad', text: v === 'up' ? '▲ ' : '▼ ' }), row.firstChild);
    if (want) row.insertBefore(h('i', { class: 'bk', 'aria-label': 'Collection Book piece' }), row.firstChild);
    if (v === 'up' || want) {
      row.className += ' tap' + (want && v !== 'up' ? ' bkrow' : '');
      row.addEventListener('click', function () {
        const p = S.player, i = p ? p.inventory.indexOf(it) : -1;
        if (i < 0) return;
        ui._sfx('click');
        ui.open('inventory');
        ui._showItem(it, ui._invActions(it, i, 'inv'));            // Send to Curator is the first action of a wanted piece
      });
    }
    setTimeout(function () { row.remove(); }, myth ? 10000 : (v === 'up' || want ? 8000 : 5000));
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

  // R5.10: name the floor once on arrival (after the scene settles, so it is not lost under the arrival toasts)
  let floorTimer = 0;
  G.on('scene:changed', function (e) {
    clearTimeout(floorTimer);
    if (!e || e.scene !== 'dungeon') return;
    floorTimer = setTimeout(function () {
      const n = ui._floorName();
      if (!n || S.scene !== 'dungeon' || !S.player) return;
      const pal = S.map && S.map.variant && S.map.variant.palette;
      const col = pal && typeof pal === 'object' && /^#[0-9a-f]{3,6}$/i.test(pal.accent || pal.light || '') ? (pal.accent || pal.light) : '#d8c9a3';
      ui._banner(n, 'Depth ' + S.depth + ' · ' + ui._themeName(S.depth), col, 3.5);
    }, 700);
  });

  // ---------- clear grade + timed events (R7.5) ----------
  // Payloads are read defensively (field names are the combat team's): grade/rank, time/seconds, explored/pct, bonus/reward/text.
  const GRADE_COL = { S: '#ffe45b', A: '#6fd36a', B: '#7fb4d4', C: '#c8c8c8', D: '#8f8470', F: '#8f8470' };
  const clock = function (s) { s = Math.max(0, Math.ceil(+s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  const pctOf = function (v) { v = +v; return isFinite(v) ? Math.round(v > 0 && v < 1 ? v * 100 : v) : null; };      // the game sends 0..100
  G.on('floor:graded', function (e) {
    if (!e || !visible) return;
    const g = String(e.grade != null ? e.grade : (e.rank != null ? e.rank : '')).toUpperCase();
    if (!g) return;
    const parts = [];
    const t = e.time != null ? e.time : e.seconds;
    if (t != null) parts.push(clock(t) + (e.par != null ? ' (par ' + clock(e.par) + ')' : ''));
    const ex = pctOf(e.explored != null ? e.explored : e.pct);
    if (ex != null) parts.push(ex + '% explored');
    const b = e.text || e.bonus || e.reward;
    if (b && typeof b === 'string') parts.push(b);
    else if (b && typeof b === 'object') {
      const bp = [];
      if (b.xp) bp.push('+' + b.xp + ' XP');
      if (b.gold) bp.push('+' + b.gold + ' gold');
      if (b.materials || b.mats) bp.push('materials');
      if (b.chest) bp.push('a chest by the stairs');
      if (bp.length) parts.push(bp.join(', '));
    }
    ui._banner('Floor cleared: grade ' + g, parts.join('  ·  '), GRADE_COL[g.charAt(0)] || '#d8c9a3', 5);
    ui._sfx(g.charAt(0) === 'S' || g.charAt(0) === 'A' ? 'quest' : 'click');
  });

  const ev = { on: false, total: 0, left: 0, goal: 0, have: 0, hold: 0, text: '', prog: '', name: '', key: '' };
  function evPaint() {
    const goal = ev.goal > 0 ? '  ' + Math.min(ev.have, ev.goal) + '/' + ev.goal : (ev.prog ? '  ' + ev.prog : '');
    const key = Math.ceil(ev.left) + '|' + goal + '|' + ev.text;
    if (key === ev.key) return;
    ev.key = key;
    el.evName.textContent = ev.name;
    el.evTxt.textContent = ev.text;
    el.evTxt.style.display = ev.text ? 'block' : 'none';
    el.evTime.textContent = ev.total > 0 ? clock(ev.left) + goal : goal.trim();
    el.evBar.style.width = (ev.total > 0 ? Math.max(0, Math.min(100, ev.left / ev.total * 100)) : (ev.goal > 0 ? Math.min(100, ev.have / ev.goal * 100) : 100)) + '%';
    el.event.classList.toggle('warn', ev.total > 0 && ev.left <= 10 && ev.left > 0);
  }
  function evRead(e) {
    if (!e) return;
    const left = e.remaining != null ? e.remaining : e.timeLeft != null ? e.timeLeft : e.timer != null ? e.timer : e.time;
    if (left != null && isFinite(+left)) { ev.left = Math.max(0, +left); if (!(ev.total > 0) || ev.left > ev.total) ev.total = Math.max(ev.total, ev.left); }
    const total = e.duration != null ? e.duration : e.total != null ? e.total : e.limit;
    if (total != null && +total > 0) ev.total = +total;
    // game/events.js sends goal as a sentence and progress as a short string ('' or e.g. '2/5'); numbers are accepted too
    const have = e.progress != null ? e.progress : e.count != null ? e.count : e.have;
    if (typeof have === 'string') ev.prog = have;
    else if (have != null && isFinite(+have)) ev.have = +have;
    const goal = e.goal != null ? e.goal : e.target != null ? e.target : e.need;
    if (typeof goal === 'string' && !isFinite(+goal)) ev.text = goal;
    else if (goal != null && isFinite(+goal)) ev.goal = +goal;
    const txt = e.text != null ? e.text : e.desc != null ? e.desc : e.hint;
    if (typeof txt === 'string') ev.text = txt;
    const nm = e.name != null ? e.name : e.title;
    if (typeof nm === 'string' && nm) ev.name = nm;
  }
  G.on('event:start', function (e) {
    if (!el.event) return;
    ev.on = true; ev.total = 0; ev.left = 0; ev.goal = 0; ev.have = 0; ev.hold = 0; ev.text = ''; ev.prog = ''; ev.key = '';
    ev.name = (e && (e.name || e.title)) || 'Timed event';
    evRead(e);
    el.event.className = 'ed-event';
    el.event.style.display = 'block';
    evPaint();
    ui._sfx('door');
  });
  G.on('event:update', function (e) { if (ev.on) { evRead(e); evPaint(); } });
  G.on('event:end', function (e) {
    if (!el.event || !ev.on) return;
    evRead(e);
    const won = e && (e.success === true || e.won === true || e.ok === true || e.result === 'success' || e.result === 'won' || e.result === 'win');
    const lost = e && (e.success === false || e.won === false || e.ok === false || e.result === 'fail' || e.result === 'failed' || e.result === 'lost');
    ev.on = false;
    ev.hold = 3;
    el.evName.textContent = ev.name;
    el.evTxt.style.display = 'block';
    el.evTxt.textContent = (e && (e.message || (typeof e.text === 'string' && e.text))) || (won ? 'Done!' : lost ? 'Failed' : 'Over');
    el.evTime.textContent = '';
    el.event.className = 'ed-event' + (won ? ' ok' : lost ? ' warn' : '');
    el.evBar.style.width = won ? '100%' : '0%';
    ev.key = '';
  });
  // local countdown between updates; the game's own event:update values win whenever they arrive
  function eventTick(dt) {
    if (ev.on) {
      if (!S.paused && ev.total > 0 && ev.left > 0) ev.left = Math.max(0, ev.left - dt);
      evPaint();
    } else if (ev.hold > 0) {
      ev.hold -= dt;
      if (ev.hold <= 0) el.event.style.display = 'none';
    }
  }

  G.on('scene:changed', function () {
    ev.on = false; ev.hold = 0; if (el.event) el.event.style.display = 'none';
    last.expl = -2; explTick = 0; walk.map = null;
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
