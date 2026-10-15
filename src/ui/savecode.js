// Save safety screens: copy / import a save code, and the backup list (title screen "Restore save").
// The data work lives in meta.js (backup ring, exportCode, parseCode, applyImport); this file only draws it.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const h = ui._h;

  function className(id) { const c = G.game && G.game.CLASSES && G.game.CLASSES[id]; return (c && c.name) || id || 'Hero'; }
  function when(t) {
    if (!t) return 'unknown date';
    try { return new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (err) { return new Date(t).toISOString().slice(0, 16); }
  }
  function describe(e) { return e.name + ', level ' + e.level + ' ' + className(e.classId); }
  ui._saveDescribe = describe; ui._saveWhen = when;

  // One tappable row per backup: name, class, level, depth, date.
  ui._backupRows = function (list, onPick) {
    return list.map(function (e) {
      return h('button', { type: 'button', class: 'ed-row', 'aria-label': 'Restore ' + describe(e), onclick: function () { ui._sfx('click'); onPick(e); } },
        h('span', { class: 'n' }, e.name + '  ·  level ' + e.level + ' ' + className(e.classId),
          h('small', { text: 'Depth ' + (e.depth || 1) + '  ·  saved ' + when(e.savedAt) })));
    });
  };

  function selectAll(ta) { try { ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); } catch (err) { /* ignore */ } }

  ui._exportDialog = function () {
    if (!G.meta || !G.meta.exportCode) return;
    G.meta.exportCode().then(function (code) {
      if (!code) { ui.toast('Nothing to export yet.', '#ff5b5b'); return; }
      const ta = h('textarea', { class: 'ed-code', readonly: true, rows: '6', 'aria-label': 'Save code', spellcheck: 'false' });
      ta.value = code;
      let close = null;
      const copy = function () {
        let done = false;
        const fallback = function () {
          selectAll(ta);
          try { done = document.execCommand('copy'); } catch (err) { done = false; }
          ui.toast(done ? 'Save code copied.' : 'Press and hold the text, then Copy.', done ? '#7fd4c8' : '#dfc06a');
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () { ui.toast('Save code copied.', '#7fd4c8'); }, fallback);
        } else fallback();
      };
      close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: 'Save code' }),
        h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: 'Paste this into "Import save code" on another device, or in the Home Screen app, to carry your hero over. It holds your whole save: keep it private.' }),
        ta], [ui._btn('Copy', copy, 'gold'), ui._btn('Close', function () { close(); })]));
      setTimeout(function () { selectAll(ta); }, 50);
    });
  };

  // onTitle: the title screen is up (no hero in memory) — continue straight into the imported hero.
  ui._importDialog = function () {
    if (!G.meta || !G.meta.parseCode) return;
    const ta = h('textarea', { class: 'ed-code', rows: '6', placeholder: 'Paste a save code here', 'aria-label': 'Save code to import', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' });
    let close = null;
    const go = function () {
      G.meta.parseCode(ta.value).then(function (res) {
        if (!res) { ui._sfx('error'); ui.toast('That is not a valid save code.', '#ff5b5b'); return; }
        const info = res.info;
        const inGame = !!S.player && S.scene !== 'menu';
        ui._confirm('Replace your save with ' + describe(info) + ' (saved ' + when(info.savedAt) + ')?', 'Import', function () {
          close();
          if (!G.meta.applyImport(res.raw)) { ui.toast('The save could not be written.', '#ff5b5b'); return; }
          if (inGame) { ui.toast('Imported. Restarting...', '#7fd4c8'); setTimeout(function () { location.reload(); }, 500); return; }
          let ok = false;
          try { ok = G.scenes.continueGame(); } catch (err) { console.error('[ui import continue]', err); }
          if (!ok) ui.toast('The imported save could not be loaded.', '#ff5b5b');
        }, { note: 'Your current hero is kept as a backup.' });
      });
    };
    close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: 'Import save code' }),
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: 'Paste a code made by "Copy save code".' }), ta],
      [ui._btn('Import', go, 'gold'), ui._btn('Cancel', function () { close(); })]));
  };

  // Restore flow used by the title screen and by a failed Continue: pick a backup, confirm only when a readable save would be replaced.
  ui._restoreBackup = function (e, hasMain) {
    const go = function () {
      if (!G.meta.restoreBackup(e.index)) { ui.toast('That backup could not be restored.', '#ff5b5b'); return; }
      let ok = false;
      try { ok = G.scenes.continueGame(); } catch (err) { console.error('[ui restore continue]', err); }
      if (!ok) ui.toast('The restored save could not be loaded.', '#ff5b5b');
    };
    if (hasMain) ui._confirm('Restore ' + describe(e) + ' from ' + when(e.savedAt) + '? Your current save is kept as a backup.', 'Restore', go);
    else go();
  };
})();
