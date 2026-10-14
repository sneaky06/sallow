// PWA glue: home-screen icon fallback, offline status for the settings menu, clean updates, storage persistence.
(function () {
  'use strict';
  const G = window.G;
  const ui = G.ui;

  ui._VERSION = '0.5.0';

  // state: 'unsupported' | 'pending' | 'ready' | 'partial'; status = what the worker cached; waiting = an update is downloaded
  const off = ui._offline = { state: 'pending', status: null, waiting: false, persisted: null };
  let reg = null, lastAsk = 0, reloading = false;

  function link(rel, href, extra) {
    const l = document.createElement('link');
    l.rel = rel; l.href = href;
    if (extra) for (const k in extra) l.setAttribute(k, extra[k]);
    document.head.appendChild(l);
    return l;
  }

  function setState(status) {
    const before = off.state + '|' + (off.status && off.status.cached) + '|' + off.waiting;
    off.status = status || null;
    if (!status || !status.cached) off.state = 'pending';
    else off.state = status.missing && status.missing.length ? 'partial' : 'ready';
    if (before !== off.state + '|' + (off.status && off.status.cached) + '|' + off.waiting) ui._refresh();
  }

  // Ask the active worker what it holds. Throttled: the menu calls this on every render.
  ui._offlineCheck = function (force) {
    if (off.state === 'unsupported' || !reg || !reg.active) return;
    const now = Date.now();
    if (!force && now - lastAsk < 4000) return;
    lastAsk = now;
    try {
      const ch = new MessageChannel();
      ch.port1.onmessage = function (e) { setState(e.data); };
      reg.active.postMessage({ type: 'status' }, [ch.port2]);
    } catch (err) { /* worker gone: keep the last known state */ }
  };

  ui._offlineRepair = function () {
    if (!reg || !reg.active) return;
    reg.active.postMessage({ type: 'recache' });
    setTimeout(function () { ui._offlineCheck(true); }, 4000);
  };

  // Switch to the downloaded update: save first, then let the new worker take over and reload onto its files.
  ui._applyUpdate = function () {
    if (!reg || !reg.waiting) return;
    if (G.state.player && G.meta && G.meta.save) G.meta.save();
    reloading = true;
    reg.waiting.postMessage({ type: 'skip-waiting' });
  };

  function watch(r) {
    reg = r;
    const flagWaiting = function () {
      if (reg.waiting && navigator.serviceWorker.controller && !off.waiting) {
        off.waiting = true;
        ui.toast('Update downloaded - apply it from the Menu', '#dfc06a');
        ui._refresh();
      }
    };
    flagWaiting();
    reg.addEventListener('updatefound', function () {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', function () {
        if (w.state === 'installed') flagWaiting();
        if (w.state === 'activated') ui._offlineCheck(true);
      });
    });
    ui._offlineCheck(true);
  }

  ui._inits.push(function () {
    // iOS ignores manifest icons; index.html now carries the apple-touch-icon, this only covers pages without one.
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const man = document.querySelector('link[rel="manifest"]');
      const base = man ? new URL('.', man.href).href : new URL('.', location.href).href;
      const touch = link('apple-touch-icon', base + 'icons/icon-180.png', { sizes: '180x180' });
      const probe = new Image();
      probe.onerror = function () {
        try { touch.href = ui._emblem(180, false).toDataURL('image/png'); } catch (err) { /* keep the file link */ }
      };
      probe.src = touch.href;
    }

    // Ask the browser not to evict our storage (saves) under pressure. Installed PWAs usually get this granted.
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(function (ok) { off.persisted = !!ok; }, function () {});
      }
    } catch (err) { /* not available */ }

    if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) { off.state = 'unsupported'; return; }
    try {
      navigator.serviceWorker.ready.then(watch, function () {});
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloading) location.reload();
        else ui._offlineCheck(true);
      });
    } catch (err) { off.state = 'unsupported'; }
  });
})();
