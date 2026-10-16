// R8.6 first-time tips: a small card the first time the player meets something new. Data table first, triggers below.
// state.flags.tipsSeen = [ids] (an id is remembered when its card is SHOWN, so a tip lost to a scene change comes back); state.settings.tips
// (false = off); ui._resetTips() clears the list. A card pauses the game until dismissed, so it is held back while a fight is on.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h;

  // id -> [title, text, icon]. Wording is data: the story/rename pass edits this table only.
  const ico = function (shape, color, accent) { return { shape: shape, color: color, accent: accent || '#ffffff' }; };
  const TIPS = {
    rar_uncommon: [TX.tipcards.rar_uncommonTitle, TX.tipcards.rar_uncommonText, ico('armor', '#4ddc6a')],
    rar_rare: [TX.tipcards.rar_rareTitle, TX.tipcards.rar_rareText, ico('armor', '#5b8cff')],
    rar_magic: [TX.tipcards.rar_magicTitle, TX.tipcards.rar_magicText, ico('armor', '#b65bff')],
    rar_legendary: [TX.tipcards.rar_legendaryTitle, TX.tipcards.rar_legendaryText, ico('armor', '#ffe45b')],
    rar_mythic: [TX.tipcards.rar_mythicTitle, TX.tipcards.rar_mythicText, ico('armor', '#ff8a2b')],
    rar_unique: [TX.tipcards.rar_uniqueTitle, TX.tipcards.rar_uniqueText, ico('armor', '#ff3b3b')],
    rar_rift: [TX.tipcards.rar_riftTitle, TX.tipcards.rar_riftText, ico('armor', '#ff6aa8')],
    sockets: [TX.tipcards.socketsTitle, TX.tipcards.socketsText, ico('gem', '#b65bff')],
    gems: [TX.tipcards.gemsTitle, TX.tipcards.gemsText, ico('gem', '#7fd4ff')],
    bloodstone: [TX.tipcards.bloodstoneTitle, TX.tipcards.bloodstoneText, ico('gem', '#d0202c')],
    corrupted: [TX.tipcards.corruptedTitle, TX.tipcards.corruptedText, ico('armor', '#b98cff')],
    materials: [TX.tipcards.materialsTitle, TX.tipcards.materialsText, ico('rune', '#8fb4ff')],
    tome: [TX.tipcards.tomeTitle, TX.tipcards.tomeText, ico('tome', '#e8d8a0', '#b65bff')],
    chute: [TX.tipcards.chuteTitle, TX.tipcards.chuteText, ico('bag', '#d8c9a3')],
    surface: [TX.tipcards.surfaceTitle, TX.tipcards.surfaceText, ico('chest', '#d8c9a3')],
    crateRate: [TX.tipcards.crateRateTitle, TX.tipcards.crateRateText, ico('chest', '#d8c9a3')],
    curator: [TX.tipcards.curatorTitle, TX.tipcards.curatorText, ico('scroll', '#9ae6d8')],
    relic: [TX.tipcards.relicTitle, TX.tipcards.relicText, ico('star', '#ffe45b')],
    fallen: [TX.tipcards.fallenTitle, TX.tipcards.fallenText, ico('skull', '#ff6a5a')],
    event: [TX.tipcards.eventTitle, TX.tipcards.eventText, ico('rune', '#ff8a2b')],
    pallor: [TX.tipcards.pallorTitle, TX.tipcards.pallorText, ico('rune', '#f4f1ea')],
    echo: [TX.tipcards.echoTitle, TX.tipcards.echoText, ico('skull', '#bfe6ff')],
    shrine: [TX.tipcards.shrineTitle, TX.tipcards.shrineText, ico('rune', '#7fd4ff')],
    lockdown: [TX.tipcards.lockdownTitle, TX.tipcards.lockdownText, ico('rune', '#d12b30')],
    dash: [TX.tipcards.dashTitle, TX.tipcards.dashText, ico('slash', '#ffb0a0')],
    closecall: [TX.tipcards.closecallTitle, TX.tipcards.closecallText, ico('ring', '#7fffd4')],
  };
  ui._TIPS = TIPS;

  function seen() { return Array.isArray(S.flags.tipsSeen) ? S.flags.tipsSeen : (S.flags.tipsSeen = []); }
  ui._tipState = function () { return { card: !!curEl, queued: queue.length }; };
  ui._resetTips = function () { S.flags.tipsSeen = []; };

  // ---------- the card ----------
  // A centred card that PAUSES the game until it is dismissed (players skip tips in fights otherwise): tap anywhere or press OK.
  // Taps in the first 0.4 s are ignored so a combat tap does not skip it. Several tips at once are queued, one after another.
  let layer = null, curEl = null, curClose = null, curId = null, shownAt = 0;
  const queue = [];
  ui._inits.push(function (layers) { layer = layers.modal; });

  // no card while the death screen or a panel is the death screen, a lockdown is sealed, a boss is awake nearby, or the hero was hit in the last 3 seconds
  let lastHit = -99;
  G.on('player:damaged', function () { lastHit = S.time || 0; });
  function fightOn() {
    const p = S.player;
    const cur = ui._current();
    if (!p || p.dead || (cur && cur.def.locked)) return true;      // the death screen is never talked over
    if (S.flags && S.flags.sealed) return true;
    if (S.scene !== 'dungeon') return false;
    if ((S.time || 0) - lastHit < 3) return true;
    const ents = S.entities || [];
    for (let i = 0; i < ents.length; i++) { const e = ents[i]; if (e && !e.dead && e.rarity === 'boss' && Math.hypot(e.x - p.x, e.y - p.y) < 16) return true; }
    return false;
  }

  function hide() { curId = null; if (curClose) { const c = curClose; curClose = null; curEl = null; c(); } }
  function show(title, text, icon, id) {
    if (!layer) return;
    if (id) { const s = seen(); if (s.indexOf(id) < 0) s.push(id); }
    const done = function () { if (Date.now() - shownAt < 400) return; ui._sfx('click'); hide(); };
    const body = h('div', { class: 'ed-tipbody' }, ui._icon(icon, 32), h('div', null, h('div', { class: 'ed-h', text: title }), h('p', { text: text })));
    const off = ui._btn(TX.tips.turnTipsOff, function () { if (Date.now() - shownAt < 400) return; S.settings.tips = false; queue.length = 0; hide(); ui.toast(TX.tips.tipsOffYouCan, '#a89f8f'); });
    const close = ui._modal(ui._dialog([body, h('div', { class: 'ed-note', style: 'margin-top:6px', text: TX.tips.tapAnywhereToContinue + (queue.length ? '  ·  ' + queue.length + TX.tips.more : '') })],
      [ui._btn(TX.tips.ok, done, 'gold'), off], 'ed-tipdlg'), { pause: true, dismiss: false });
    curClose = close;
    curId = id || null;
    curEl = layer.lastChild;
    shownAt = Date.now();
    if (curEl) curEl.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.ed-btn')) done(); });
  }

  // Public: show a card soon (not remembered). Used by R8.10 for auto-learned skills.
  ui._tipCard = function (title, text, icon) { queue.unshift([title, text, icon]); };      // explanations of something that just happened go first
  // Public: the first-time tip `id` (remembered in flags.tipsSeen).
  ui._tip = function (id) {
    if (!S.player || S.settings.tips === false || !TIPS[id]) return;
    if (seen().indexOf(id) >= 0 || queue.some(function (q) { return q[3] === id; }) || (curId === id)) return;
    queue.push(TIPS[id].concat([id]));
    if (queue.length > 6) queue.shift();
  };

  ui._updaters.push((function () {
    let poll = 0;
    return function (dt) {
      if (curEl && !curEl.isConnected) { curEl = null; curClose = null; curId = null; }       // closed from outside (scene change)
      if (!S.player || S.scene === 'menu') return;
      poll -= dt;
      if (poll <= 0) { poll = 0.5; scan(); }
      // wait while any panel or dialog is open; the next card follows the dismissal of the last one
      if (!curEl && queue.length && !document.querySelector('#ui .ed-modal') && !fightOn()) { const t = queue.shift(); show(t[0], t[1], t[2], t[3]); }
    };
  })());

  // slow polls for things that have no event
  function scan() {
    if (S.settings.tips === false || S.scene !== 'dungeon') return;
    const s = seen(), ents = S.entities || [];
    if (s.indexOf('echo') < 0 || s.indexOf('fallen') < 0) {
      for (let i = 0; i < ents.length; i++) {
        const e = ents[i];
        if (!e || e.dead) continue;
        if (e.echo) ui._tip('echo');
        else if (e.adventurerId || /^adv_|^fallen_/.test(String(e.monsterId || ''))) ui._tip('fallen');
      }
    }
    const p = S.player;
    if (s.indexOf('closecall') < 0 && G.game && G.game.getEffect) { try { if (G.game.getEffect(p, 'close_call')) ui._tip('closecall'); } catch (err) { /* ignore */ } }
    if (s.indexOf('dash') < 0 && G.game && G.game.getClassAction) { try { if (G.game.getClassAction()) ui._tip('dash'); } catch (err) { /* ignore */ } }
  }

  // ---------- triggers ----------
  G.on('item:picked', function (e) {
    const it = e && e.item;
    if (!it || it.type === 'gold' || e.salvaged) return;
    if (it.rarity && TIPS['rar_' + it.rarity]) ui._tip('rar_' + it.rarity);
    if (Array.isArray(it.sockets) && it.sockets.length) ui._tip('sockets');
    if (it.type === 'gem') ui._tip(/blood/i.test(String(it.baseId || '')) || it.permanent ? 'bloodstone' : 'gems');
    if (it.corrupted) ui._tip('corrupted');
    if (/^mat_/.test(String(it.baseId || ''))) ui._tip('materials');
    if (it.baseId === 'tome_skill') ui._tip('tome');
  });
  G.on('object:interact', function (e) {
    if (!e) return;
    if (e.type === 'chute') ui._tip('chute'); else if (e.type === 'surface_crate') ui._tip('surface'); else if (e.type === 'shrine') ui._tip('shrine');
  });
  G.on('npc:interact', function (e) { if (e && e.role === 'curator') ui._tip('curator'); });
  G.on('relic:granted', function () { ui._tip('relic'); });
  G.on('event:start', function () { ui._tip('event'); });
  G.on('room:locked', function () { ui._tip('lockdown'); });
  G.on('scene:changed', function (e) { curEl = null; curClose = null; curId = null; queue.length = 0; if (e && e.scene === 'town' && S.flags && S.flags.pallorUnlocked) ui._tip('pallor'); });
})();
