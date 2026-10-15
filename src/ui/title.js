// Title screen: Continue / New Game -> class select + name entry.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const h = ui._h;

  let box = null, pick = null, heroName = '';

  function logo() {
    return h('div', { class: 'ed-logo' }, ui._emblem(64, true), h('h1', { text: ui.GAME_NAME.toUpperCase() }));
  }

  function showMain() {
    if (!box) return;
    box.style.display = '';
    const has = !!(G.meta && G.meta.hasSave && G.meta.hasSave());
    const backups = (G.meta && G.meta.listBackups) ? G.meta.listBackups() : [];
    const menu = h('div', { class: 'ed-menu' });
    if (has) {
      menu.appendChild(ui._btn('Continue', function () {
        let ok = false;
        try { ok = G.scenes.continueGame(); } catch (err) { console.error('[ui continue]', err); }
        // a failed Continue never falls back to New Game: say so and offer the backups
        if (!ok) { ui.toast('The save could not be read.', '#ff5b5b'); if (backups.length) showRestore(true); else showMain(); }
      }, 'big gold'));
    } else if (backups.length) {
      menu.appendChild(ui._btn('Restore save', function () { showRestore(false); }, 'big gold'));
    }
    menu.appendChild(ui._btn('New Game', function () {
      if (has) ui._confirm('Start anew? Your current hero is kept as a backup, and replaced once the new one reaches town.', 'New Hero', function () {
        if (G.meta && G.meta.pushCurrent) G.meta.pushCurrent();
        showClasses();
      }, { danger: true });
      else showClasses();
    }, 'big'));
    if (ui._importDialog) menu.appendChild(ui._btn('Import save code', ui._importDialog));
    box.replaceChildren(logo(), h('div', { class: 'ed-tag', text: ui._tagline ? ui._tagline() : 'Something under Emberdeep is rotting.' }), menu, h('div', { class: 'ed-ver', text: 'v' + (ui._VERSION || '') }));
  }

  // R7 save safety: the backup ring, newest first. hasMain: a readable save exists (restoring asks first).
  function showRestore(hasMain) {
    const list = G.meta.listBackups();
    box.replaceChildren(logo(),
      h('div', { class: 'ed-ttl', text: 'Restore save' }),
      h('div', { class: 'ed-note', style: 'margin:6px 0', text: hasMain ? 'Your save could not be read. These older copies are on this device:' : 'No current save was found, but these copies are on this device:' }),
      h('div', { class: 'ed-list ed-restore' }, ui._backupRows(list, function (e) { ui._restoreBackup(e, hasMain); })),
      h('div', { class: 'ed-menu', style: 'margin-top:8px' }, ui._btn('Back', showMain)));
  }

  function showClasses() {
    const classes = (G.game && G.game.CLASSES) || null;
    const ids = classes ? Object.keys(classes) : [];
    if (!ids.length) {
      box.replaceChildren(logo(), h('div', { class: 'ed-tag', text: 'No classes are available yet.' }), h('div', { class: 'ed-menu' }, ui._btn('Back', showMain)));
      return;
    }
    if (!pick || !classes[pick]) pick = ids[0];
    const cls = classes[pick];
    const input = h('input', { type: 'text', maxlength: '14', placeholder: 'Name your hero', value: heroName, autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', 'aria-label': 'Hero name' });
    input.addEventListener('input', function () { heroName = input.value; });
    const begin = function () {
      const name = (input.value || '').trim().slice(0, 14) || cls.name;
      input.blur();
      try { G.scenes.startNewGame(pick, name); } catch (err) {
        console.error('[ui new game]', err);
        ui.toast('Could not start the game.', '#ff5b5b');
      }
    };
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') begin(); });
    const trees = (cls.trees || []).map(function (t) { return t.name; }).join(' / ');
    box.replaceChildren(
      h('div', { class: 'ed-ttl', text: 'Choose your hero' }),
      h('div', { class: 'ed-classes' }, ids.map(function (id) {
        const c = classes[id];
        return h('button', { type: 'button', class: 'ed-class' + (id === pick ? ' on' : ''), onclick: function () { ui._sfx('click'); pick = id; showClasses(); } },
          ui._portrait(c.sprite, 48), c.name);
      })),
      h('div', { class: 'ed-cdesc ed-box' },
        h('b', { text: cls.name }), h('div', { text: cls.desc || '', style: 'margin:4px 0' }),
        trees ? h('div', { class: 'ed-note', text: 'Paths: ' + trees }) : null,
        cls.primaryStat ? h('div', { class: 'ed-note', text: 'Primary attribute: ' + String(cls.primaryStat).toUpperCase() }) : null),
      h('div', { class: 'ed-name' }, input, ui._btn('Begin', begin, 'gold')),
      h('div', { class: 'ed-menu', style: 'margin-top:8px' }, ui._btn('Back', showMain)));
  }

  ui._showTitle = showMain;

  ui._inits.push(function (layers) {
    box = h('div', { class: 'ed-title', style: 'display:none' });
    layers.title.appendChild(box);
    if (S.scene === 'menu') showMain();
  });

  G.on('scene:changed', function (e) {
    if (!box) return;
    if (e && e.scene === 'menu') showMain();
    else { box.style.display = 'none'; box.replaceChildren(); }
  });
})();
