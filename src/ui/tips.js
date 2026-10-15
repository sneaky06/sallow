// R8.6 first-time tips: a small card the first time the player meets something new. Data table first, triggers below.
// state.flags.tipsSeen = [ids]; state.settings.tips (false = off); ui._resetTips() clears the list. A card never pauses the
// game; tapping it opens the full text (and then the game waits). It fades by itself after a few seconds.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const h = ui._h;

  // id -> [title, text, icon]. Wording is data: the story/rename pass edits this table only.
  const ico = function (shape, color, accent) { return { shape: shape, color: color, accent: accent || '#ffffff' }; };
  const TIPS = {
    rar_uncommon: ['Uncommon', 'Green gear carries a stat or two beyond the plain kind. Common grey is mostly vendor fodder.', ico('armor', '#4ddc6a')],
    rar_rare: ['Rare', 'Blue gear has more and better stats. Worth comparing with what you wear: the arrow shows if it is better.', ico('armor', '#5b8cff')],
    rar_magic: ['Magic', 'Purple gear glows faintly. Higher power, more affixes, and often sockets.', ico('armor', '#b65bff')],
    rar_legendary: ['Legendary Elite', 'Yellow, and glowing: a named or set piece. Sets give bonuses when you wear several. Never sold by accident.', ico('armor', '#ffe45b')],
    rar_mythic: ['Legendary Mythic', 'Orange: a mythic carries a special effect that can change how you fight. Read its plate.', ico('armor', '#ff8a2b')],
    rar_unique: ['Unique', 'Red and burning: very rare, very strong, usually with a price attached. Read all of it.', ico('armor', '#ff3b3b')],
    rar_rift: ['Rift', 'Pink and pulsing: the rarest drop in the game, born deep in the rift. Keep it.', ico('armor', '#ff6aa8')],
    sockets: ['Sockets', 'Small squares on an item are sockets. Fill one with a gem from your bag: select the gem, then Socket.', ico('gem', '#b65bff')],
    gems: ['Gems', 'Gems add a bonus when socketed. Three of a kind combine into a better one at the mystic. The blacksmith improves them with gem dust.', ico('gem', '#7fd4ff')],
    bloodstone: ['Bloodstones', 'Bloodstones are powerful but fuse to the item for good. You are asked before one is set.', ico('gem', '#d0202c')],
    corrupted: ['Corrupted gear', 'Corrupted items hide a strong bonus and a drawback. The blacksmith can cleanse one: the drawback goes, a hidden bonus appears.', ico('armor', '#b98cff')],
    materials: ['Materials', 'Dust, shards and class ore pay for upgrades, rerolls and cleansing at the blacksmith and mystic. They never take bag space.', ico('rune', '#8fb4ff')],
    tome: ['Tome of Insight', 'Reading a Tome of Insight gives one skill point. Use it from your bag.', ico('tome', '#e8d8a0', '#b65bff')],
    chute: ['The chute', 'Mark items and send them up the chute: they arrive at the surface crate in town. Selling and salvaging happen up there.', ico('bag', '#d8c9a3')],
    surface: ['The surface crate', 'Everything you sent up the chute waits here. Sell it, salvage it, hand it to the Curator or stash it.', ico('chest', '#d8c9a3')],
    curator: ['The Curator', 'The Curator keeps a book of every armour look and set. Pieces with a teal book mark fill a gap: hand them in for permanent rewards.', ico('scroll', '#9ae6d8')],
    relic: ['Relics', 'A fallen adventurer leaves a relic: a permanent power. Collect all ten and they combine at the Elder.', ico('star', '#ffe45b')],
    fallen: ['A fallen adventurer', 'Corrupted former adventurers wait on deeper floors. They are hard and optional. Beating one earns a relic.', ico('skull', '#ff6a5a')],
    event: ['Timed event', 'Something is happening on this floor, and the clock is running. The goal and timer are on screen.', ico('rune', '#ff8a2b')],
    pallor: ['Pallor', 'Pallor builds as you push deeper in the endgame. More of it means better loot and a harder rift.', ico('rune', '#f4f1ea')],
    echo: ['Your Echo', 'What you left behind has risen as an Echo. Beat it and its reward is yours.', ico('skull', '#bfe6ff')],
    shrine: ['Shrines', 'Shrines give a short boost when you touch them. Each works once.', ico('rune', '#7fd4ff')],
    lockdown: ['Sealed rooms', 'The doors have shut. Survive the waves and the seal breaks, with a chest as the prize.', ico('rune', '#d12b30')],
    dash: ['Dash', 'The dash button moves you out of danger in a flash. It recharges over time.', ico('slash', '#ffb0a0')],
    closecall: ['Close Call', 'Stepping out of a danger circle at the last moment gives a damage boost and shortens your cooldowns.', ico('ring', '#7fffd4')],
  };
  ui._TIPS = TIPS;

  function seen() { return Array.isArray(S.flags.tipsSeen) ? S.flags.tipsSeen : (S.flags.tipsSeen = []); }
  ui._tipState = function () { return { card: !!curEl, queued: queue.length }; };
  ui._resetTips = function () { S.flags.tipsSeen = []; };

  // ---------- the card ----------
  // A centred card that PAUSES the game until it is dismissed (players skip tips in fights otherwise): tap anywhere or press OK.
  // Taps in the first 0.4 s are ignored so a combat tap does not skip it. Several tips at once are queued, one after another.
  let layer = null, curEl = null, curClose = null, shownAt = 0;
  const queue = [];
  ui._inits.push(function (layers) { layer = layers.modal; });

  function hide() { if (curClose) { const c = curClose; curClose = null; curEl = null; c(); } }
  function show(title, text, icon) {
    if (!layer) return;
    const done = function () { if (Date.now() - shownAt < 400) return; ui._sfx('click'); hide(); };
    const body = h('div', { class: 'ed-tipbody' }, ui._icon(icon, 32), h('div', null, h('div', { class: 'ed-h', text: title }), h('p', { text: text })));
    const off = ui._btn('Turn tips off', function () { if (Date.now() - shownAt < 400) return; S.settings.tips = false; queue.length = 0; hide(); ui.toast('Tips off. You can turn them on in the menu.', '#a89f8f'); });
    const close = ui._modal(ui._dialog([body, h('div', { class: 'ed-note', style: 'margin-top:6px', text: 'Tap anywhere to continue' + (queue.length ? '  ·  ' + queue.length + ' more' : '') })],
      [ui._btn('OK', done, 'gold'), off], 'ed-tipdlg'), { pause: true, dismiss: false });
    curClose = close;
    curEl = layer.lastChild;
    shownAt = Date.now();
    if (curEl) curEl.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.ed-btn')) done(); });
  }

  // Public: show a card soon (not remembered). Used by R8.10 for auto-learned skills.
  ui._tipCard = function (title, text, icon) { queue.unshift([title, text, icon]); };      // explanations of something that just happened go first
  // Public: the first-time tip `id` (remembered in flags.tipsSeen).
  ui._tip = function (id) {
    if (!S.player || S.settings.tips === false || !TIPS[id]) return;
    const s = seen();
    if (s.indexOf(id) >= 0) return;
    s.push(id);
    queue.push(TIPS[id]);
    if (queue.length > 6) queue.shift();
  };

  ui._updaters.push((function () {
    let poll = 0;
    return function (dt) {
      if (curEl && !curEl.isConnected) { curEl = null; curClose = null; }       // closed from outside (scene change)
      if (!S.player || S.scene === 'menu') return;
      poll -= dt;
      if (poll <= 0) { poll = 0.5; scan(); }
      // wait while any panel or dialog is open; the next card follows the dismissal of the last one
      if (!curEl && queue.length && !ui.isOpen() && !document.querySelector('#ui .ed-modal')) { const t = queue.shift(); show(t[0], t[1], t[2]); }
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
  G.on('scene:changed', function (e) { curEl = null; curClose = null; queue.length = 0; if (e && e.scene === 'town' && S.flags && S.flags.pallorUnlocked) ui._tip('pallor'); });
})();
