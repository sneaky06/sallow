// Depth picker, death screen, pause/settings menu, big map.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const h = ui._h;

  const THEME_COLOR = { crypt: '#b8b8c8', caves: '#7fd4ff', inferno: '#ff8a2b', abyss: '#b65bff' };

  // ---------- depth picker ----------
  ui._register('depth', {
    render: function (view, arg) {
      const way = (S.flags.waypoints || [1]).slice().sort(function (a, b) { return a - b; });
      if (way.indexOf(1) < 0) way.unshift(1);
      const list = h('div', { class: 'ed-list' },
        h('div', { class: 'ed-note', text: 'Deepest reached: depth ' + (S.flags.maxDepth | 0) + '. Slaying a boss opens a waypoint to the floor below it.' }));
      const corpse = S.flags.corpse;
      if (corpse) {
        const near = way.filter(function (d) { return d <= corpse.depth; }).pop() || 1;
        list.appendChild(h('div', { class: 'ed-box', style: 'color:#ff6a5a' }, '☠ Your corpse lies on depth ' + corpse.depth + '.',
          h('div', { class: 'ed-note', text: (corpse.gold | 0) + ' gold and ' + corpse.items.length + ' item' + (corpse.items.length === 1 ? '' : 's') + ' wait there. ' +
            (near === corpse.depth ? '' : 'Nearest waypoint: depth ' + near + '. ') + (ui._echoText ? ui._echoText('corpseNote') : 'Die again first and they are lost.') })));
      }
      way.forEach(function (d) {
        const theme = C.themeForDepth(d);
        const here = S.scene === 'dungeon' && S.depth === d;
        const mine = corpse && corpse.depth === d;
        const b = h('button', { type: 'button', class: 'ed-btn', onclick: function () { ui._sfx('stairs'); G.scenes.enterDungeon(d); } },
          h('span', null, 'Depth ' + d + (d % C.BOSS_EVERY === 0 ? '  (boss)' : ''), mine ? h('span', { style: 'color:#ff6a5a', text: '  ☠ corpse' }) : null),
          h('span', { style: 'color:' + (THEME_COLOR[theme] || '#d8c9a3'), text: here ? 'You are here' : ui._themeName(d) }));
        if (here) b.disabled = true;
        list.appendChild(b);
      });
      if (S.scene === 'dungeon') {
        list.appendChild(h('button', { type: 'button', class: 'ed-btn', onclick: function () { ui._sfx('stairs'); G.scenes.enterTown(); } },
          h('span', null, ui._townName()), h('span', { class: 'ed-gold', text: 'Town' })));
      }
      return ui._frame(arg && arg.type === 'waypoint' ? 'Waypoint' : 'Descend', null, h('div', { class: 'ed-body' }, list));
    },
  });

  G.on('object:interact', function (e) {
    if (!e || !S.player || S.scene === 'menu') return;
    if (e.type === 'dungeon_entrance' || e.type === 'waypoint') ui.open('depth', { type: e.type });
    else if (e.type === 'stash') ui.open('stash');
  });

  // ---------- death ----------
  ui._register('death', {
    locked: true, cls: 'ed-death',
    render: function (view, arg) {
      // R2.4: core decides the penalty; without it fall back to the old flat 10%.
      let pen = null;
      if (G.scenes.getDeathPenalty) { try { pen = G.scenes.getDeathPenalty(); } catch (err) { pen = null; } }
      if (!pen) pen = { retrievable: false, gold: (arg && arg.lost) | 0, items: 0 };
      const old = S.flags.corpse;
      const msg = pen.retrievable
        ? 'Your gold (' + (pen.gold | 0) + ') and backpack (' + (pen.items | 0) + ' item' + (pen.items === 1 ? '' : 's') + ') lie where you fell on depth ' + S.depth + '. ' + (ui._echoText ? ui._echoText('corpseNote') : 'Die again and they are lost.')
        : 'You lose ' + (pen.gold | 0) + ' gold.';
      return [
        h('h1', { text: 'You have died' }),
        h('div', { class: 'ed-dim', text: S.depth > 0 ? 'Slain on depth ' + S.depth + ' of ' + ui._themeName(S.depth) + '.' : 'Slain.' }),
        h('div', { style: 'max-width:300px;line-height:18px', class: pen.retrievable ? null : 'ed-gold', text: msg }),
        // R6.2: any death while a corpse exists abandons it, and the abandoned remains rise as the Echo
        old && old.depth ? h('div', { style: 'max-width:300px;color:#bfe6ff', text: ui._echoText && !S.flags.echo ? ui._echoText('deathScreen', old.depth) : 'What you left on depth ' + old.depth + ' is gone for good.' }) : null,
        ui._btn('Rise in ' + ui._townName(), function () {
          try { G.scenes.respawn(); } catch (err) { console.error('[ui respawn]', err); ui.close(); }
        }, 'big gold'),
      ];
    },
  });

  let deathTimer = 0;
  G.on('player:died', function () {
    if (!S.player) return;
    G.input.attackHeld = false;
    const lost = Math.floor((S.player.gold || 0) * 0.1);
    clearTimeout(deathTimer);
    deathTimer = setTimeout(function () {
      if (S.player && S.scene !== 'menu') ui.open('death', { lost: lost });
    }, 900);
  });
  G.on('scene:changed', function () { clearTimeout(deathTimer); });

  // ---------- pause / settings ----------
  // Loot-filter choices: one entry per tier (legendary + mythic are a single "Legendary"), in table order. Set pieces are Legendary Elite drops,
  // so there is no tier of their own to offer.
  function filterKeys() { return ui._tierKeys(); }

  function toggleRow(label, note, value, fn) {
    return h('button', { type: 'button', class: 'ed-btn', 'aria-pressed': value === true ? 'true' : (value === false ? 'false' : null), onclick: function () { ui._sfx('click'); fn(); if (G.meta && G.meta.save) G.meta.save(); ui._refreshNow(); } },
      h('span', null, label, note ? h('div', { class: 'ed-note', style: 'text-transform:none', text: note }) : null),
      typeof value === 'boolean' ? h('span', { class: value ? 'ed-good' : 'ed-bad', text: value ? 'On' : 'Off' }) : value);
  }

  // R6.4 volume sliders: state.settings.sfxVolume / musicVolume / ambienceVolume, 0..1 (missing = 1, the old loudness).
  // The engine reads them live; 'settings:changed' { key } is a courtesy for anything that caches. Sound off mutes all.
  const VOLUMES = [['sfxVolume', 'Effects', 'loot'], ['musicVolume', 'Music', null], ['ambienceVolume', 'Ambience', null]];
  function volRows() {
    const st = S.settings;
    return VOLUMES.map(function (row) {
      const key = row[0];
      const cur = typeof st[key] === 'number' && isFinite(st[key]) ? Math.max(0, Math.min(1, st[key])) : 1;
      const pct = Math.round(cur * 100);
      const out = h('b', { text: pct + '%' });
      const input = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(pct), 'aria-label': row[1] + ' volume', style: '--v:' + pct + '%' });
      input.addEventListener('input', function () {
        const v = Math.max(0, Math.min(100, +input.value || 0));
        st[key] = v / 100;
        out.textContent = v + '%';
        input.style.setProperty('--v', v + '%');
        G.emit('settings:changed', { key: key });
      });
      input.addEventListener('change', function () {
        if (row[2]) ui._sfx(row[2]);         // a sample at the new level
        if (G.meta && G.meta.save) G.meta.save();
      });
      return h('label', { class: 'ed-vol' + (st.sfx === false ? ' off' : '') }, h('span', { text: row[1] }), input, out);
    });
  }

  function quitToTitle(save) {
    if (save && G.meta && G.meta.save) G.meta.save();
    ui._closeModals();
    if (G.scenes.quitToMenu) { G.scenes.quitToMenu(); return; }
    // No scene API for this yet (see contract change requests): put the shared state back to its boot values.
    S.scene = 'menu'; S.depth = 0; S.map = null; S.player = null;
    S.entities = []; S.projectiles = []; S.groundItems = [];
    S.paused = false;
    G.input.attackHeld = false; G.input.move.x = 0; G.input.move.y = 0;
    G.emit('scene:changed', { scene: 'menu', depth: 0, map: null });
  }

  // Offline indicator + version label. The state comes from the service worker (see pwa.js / sw.js).
  function offlineRows() {
    const off = ui._offline || { state: 'unsupported' };
    if (ui._offlineCheck) ui._offlineCheck();
    const st = off.status;
    let text, cls, extra = null;
    if (off.state === 'ready') { text = 'Offline ready'; cls = 'ed-good'; }
    else if (off.state === 'partial') {
      text = 'Offline: ' + st.missing.length + ' file' + (st.missing.length === 1 ? '' : 's') + ' missing'; cls = 'ed-bad';
      extra = ui._btn('Download again', function () { ui._offlineRepair(); ui.toast('Fetching the missing files...', '#a89f8f'); });
    } else if (off.state === 'unsupported') { text = 'Not available here'; cls = 'ed-dim'; }
    else { text = 'Preparing...'; cls = 'ed-dim'; }
    const note = off.state === 'ready' ? 'The whole game is stored on this device (' + st.cached + ' files). Your save never leaves it.'
      : off.state === 'unsupported' ? 'Offline play needs the game opened from a web address (https), ideally added to the Home Screen.'
        : off.state === 'partial' ? 'Go online once and tap Download again.' : 'Stay online for a moment while the game is stored on this device.';
    return [
      h('div', { class: 'ed-box' }, h('div', { class: 'ed-kv' }, h('span', { text: 'Status' }), h('b', { class: cls, text: text })),
        h('div', { class: 'ed-note', text: note }),
        // R7: can the browser throw the save away? (iOS may clear storage of a site that is not kept persistent)
        h('div', { class: 'ed-kv', style: 'margin-top:6px' }, h('span', { text: 'Storage' }),
          h('b', { class: off.persisted === true ? 'ed-good' : (off.persisted === false ? 'ed-bad' : 'ed-dim'),
            text: off.persisted === true ? 'persistent' : (off.persisted === false ? 'may be cleared by iOS' : 'unknown') })),
        off.persisted === false ? h('div', { class: 'ed-note', text: 'Use Copy save code now and then to keep a copy outside the game. Adding the game to the Home Screen helps.' }) : null),
      extra,
      off.waiting ? ui._btn('Update now (saves and restarts)', function () { ui._applyUpdate(); }, 'gold') : null,
      h('div', { class: 'ed-note', style: 'text-align:center', text: ui.GAME_NAME + ' ' + (ui._VERSION || '') + (st && st.version ? '  ·  data ' + String(st.version).replace(/^[a-z]+-/, '') : '') }),
    ];
  }

  ui._register('menu', {
    render: function () {
      const st = S.settings;
      const FILTERS = filterKeys();
      const tierOf = function (k) { return C.RARITY[k] ? (C.RARITY[k].tier || k) : null; };
      // a stored 'mythic' (or any key of an already-listed tier) maps onto that tier's entry
      const cur = FILTERS.filter(function (k) { return tierOf(k) === tierOf(st.lootFilter); })[0] || FILTERS[0];
      const rar = C.RARITY[cur];
      const filterLabel = ui._tierName(cur) + (cur === FILTERS[0] ? ' (all)' : (cur === FILTERS[FILTERS.length - 1] ? '' : '+'));
      const mins = Math.floor((S.time || 0) / 60);
      const list = h('div', { class: 'ed-list' },
        ui._btn('Resume', function () { ui.close(); }, 'big gold'),
        h('div', { class: 'ed-h', text: 'Settings' }),
        toggleRow('Sound', null, !!st.sfx, function () { st.sfx = !st.sfx; G.emit('settings:changed', { key: 'sfx' }); }),
        volRows(),
        toggleRow('Loot labels', 'Hide ground loot below this quality', h('span', { style: 'color:' + rar.color, text: filterLabel }),
          function () { st.lootFilter = FILTERS[(FILTERS.indexOf(cur) + 1) % FILTERS.length]; }),
        toggleRow('Auto-pickup gold', null, !!st.autoPickupGold, function () { st.autoPickupGold = !st.autoPickupGold; }),
        toggleRow('Damage numbers', null, !!st.showDamage, function () { st.showDamage = !st.showDamage; }),
        h('div', { class: 'ed-h', text: 'Controls' }),
        ui._hudSettings ? (function () {
          const hs = ui._hudSettings();
          return [
            toggleRow('Joystick', hs.joystick.mode === 'fixed' ? 'Always in the same spot' : 'Appears where your thumb lands',
              h('span', { class: 'ed-gold', text: hs.joystick.mode === 'fixed' ? 'Fixed' : 'Floating' }),
              function () { hs.joystick.mode = hs.joystick.mode === 'fixed' ? 'floating' : 'fixed'; if (ui._applyHud) ui._applyHud(); }),
            toggleRow('Edit HUD layout', 'Move buttons, size, fade', h('span', { class: 'ed-gold', text: '>' }), function () { ui._editHud(); }),
          ];
        })() : null,
        h('div', { class: 'ed-h', text: 'Junk rules' }),
        ui._junkBlock ? ui._junkBlock() : null,
        ui._junkButton ? ui._junkButton() : null,
        h('div', { class: 'ed-h', text: 'Game' }),
        ui._btn('Quest log', function () { ui.open('quests'); }),
        ui._btn('Journal', function () { ui.open('journal'); }),
        ui._btn('Save & quit to title', function () { quitToTitle(true); }),
        ui._exportDialog ? ui._btn('Copy save code', ui._exportDialog) : null,
        ui._importDialog ? ui._btn('Import save code', ui._importDialog) : null,
        ui._btn('Delete save', function () {
          ui._confirm('Delete this hero forever? This cannot be undone.', 'Delete', function () {
            quitToTitle(false);        // core.quitToMenu saves on the way out, so delete afterwards
            if (G.meta && G.meta.deleteSave) G.meta.deleteSave();
            if (ui._showTitle) ui._showTitle();
            ui.toast('Save deleted.', '#ff5b5b');
          }, { danger: true });
        }, 'danger'),
        h('div', { class: 'ed-h', text: 'Offline play' }),
        offlineRows(),
        h('div', { class: 'ed-note', style: 'text-align:center', text: 'Played ' + mins + ' min  ·  ' + (S.flags.kills | 0) + ' kills  ·  ' + (S.flags.deaths | 0) + ' deaths' }));
      return ui._frame('Paused', null, h('div', { class: 'ed-body' }, list));
    },
  });
  ui._register('settings', { alias: 'menu' });

  // ---------- big map ----------
  ui._register('map', {
    render: function () {
      const cv = h('canvas', { class: 'ed-mapbig', width: 240, height: 240 });
      const ctx = cv.getContext('2d');
      if (ctx && G.engine && G.engine.drawMinimap && S.map) {
        try { G.engine.drawMinimap(ctx, 240, 240); } catch (err) { console.error('[ui map]', err); }
      }
      return ui._frame('Map', null, h('div', { class: 'ed-body' },
        h('div', { class: 'ed-center', style: 'margin-bottom:6px', text: ui._themeName(S.depth) + (S.depth > 0 ? ' - depth ' + S.depth : '') }), cv));
    },
  });
})();
