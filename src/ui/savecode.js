// Save safety screens: copy / import a save code, and the backup list (title screen "Restore save").
// The data work lives in meta.js (backup ring, exportCode, parseCode, applyImport); this file only draws it.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const TX = ui.S;
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
          h('small', { text: TX.deeper.depth + (e.depth || 1) + TX.savecode.saved + when(e.savedAt) })));
    });
  };

  function selectAll(ta) { try { ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); } catch (err) { /* ignore */ } }

  // lite: leave out the stash and the surface crate (much shorter; importing it keeps the ones already on that device)
  ui._exportDialog = function (lite) {
    lite = lite === true;                  // (a click handler passes the event)
    if (!G.meta || !G.meta.exportCode) return;
    G.meta.exportCode({ lite: !!lite }).then(function (code) {
      if (!code) { ui.toast(TX.savecode.nothingToExportYet, '#ff5b5b'); return; }
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
          navigator.clipboard.writeText(code).then(function () { ui.toast(TX.savecode.saveCodeCopied, '#7fd4c8'); }, fallback);
        } else fallback();
      };
      close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: TX.savecode.saveCode }),
        h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.savecode.pasteThisIntoImport }),
        h('div', { class: 'ed-note', style: 'margin-top:4px', text: code.length.toLocaleString() + TX.savecode.characters + (lite ? TX.savecode.liteNote : '') }),
        ta], [ui._btn(TX.savecode.copy, copy, 'gold'), ui._btn(lite ? TX.savecode.fullCode : TX.savecode.shorterCode, function () { close(); ui._exportDialog(!lite); }), ui._btn(TX.common.close, function () { close(); })]));
      setTimeout(function () { selectAll(ta); }, 50);
    });
  };

  // onTitle: the title screen is up (no hero in memory) — continue straight into the imported hero.
  ui._importDialog = function () {
    if (!G.meta || !G.meta.parseCode) return;
    const ta = h('textarea', { class: 'ed-code', rows: '6', placeholder: TX.savecode.pasteASaveCode, 'aria-label': 'Save code to import', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' });
    let close = null;
    const go = function () {
      G.meta.parseCode(ta.value).then(function (res) {
        if (!res) { ui._sfx('error'); ui.toast(TX.savecode.thatIsNotA, '#ff5b5b'); return; }
        const info = res.info;
        const inGame = !!S.player && S.scene !== 'menu';
        ui._confirm(TX.savecode.replaceYourSaveWith + describe(info) + TX.savecode.saved2 + when(info.savedAt) + ')?', 'Import', function () {
          close();
          if (!G.meta.applyImport(res.raw)) { ui.toast(TX.savecode.theSaveCouldNot, '#ff5b5b'); return; }
          if (inGame) { ui.toast(TX.savecode.importedRestarting, '#7fd4c8'); setTimeout(function () { location.reload(); }, 500); return; }
          let ok = false;
          try { ok = G.scenes.continueGame(); } catch (err) { console.error('[ui import continue]', err); }
          if (!ok) ui.toast(TX.savecode.theImportedSaveCould, '#ff5b5b');
        }, { note: TX.savecode.yourCurrentHeroIs });
      });
    };
    close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: TX.common.importSaveCode }),
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.savecode.pasteACodeMade }), ta],
      [ui._btn(TX.savecode.import, go, 'gold'), ui._btn(TX.common.cancel, function () { close(); })]));
  };

  // Restore flow used by the title screen and by a failed Continue: pick a backup, confirm only when a readable save would be replaced.
  ui._restoreBackup = function (e, hasMain) {
    const go = function () {
      if (!G.meta.restoreBackup(e.index)) { ui.toast(TX.savecode.thatBackupCouldNot, '#ff5b5b'); return; }
      let ok = false;
      try { ok = G.scenes.continueGame(); } catch (err) { console.error('[ui restore continue]', err); }
      if (!ok) ui.toast(TX.savecode.theRestoredSaveCould, '#ff5b5b');
    };
    if (hasMain) ui._confirm(TX.savecode.restore + describe(e) + TX.savecode.from + when(e.savedAt) + TX.savecode.yourCurrentSaveIs, 'Restore', go);
    else go();
  };
})();
