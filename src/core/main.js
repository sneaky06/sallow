// Boot + main loop. Loaded last. Every team module is optional here so a partial build still runs.
(function () {
  'use strict';
  const G = window.G;
  const S = G.state;
  const canvas = document.getElementById('game');
  const uiRoot = document.getElementById('ui');

  function safe(label, fn) {
    try { return fn(); } catch (err) { console.error('[' + label + ']', err); }
  }

  if (G.engine && G.engine.init) safe('engine.init', function () { G.engine.init(canvas); });
  if (G.ui && G.ui.init) safe('ui.init', function () { G.ui.init(uiRoot); });

  const MAX_DT = 0.05;      // clamp: a backgrounded tab must not produce a giant step
  let last = performance.now();

  function frame(now) {
    // timeScale (R9.1): set by gameplay for brief slow-motion moments; 1 = normal speed.
    const ts = S.timeScale > 0 && S.timeScale <= 1 ? S.timeScale : 1;
    const dt = Math.min(MAX_DT, (now - last) / 1000) * ts;
    last = now;
    if (S.scene !== 'menu' && !S.paused) {
      S.time += dt;
      if (G.game && G.game.update) safe('game.update', function () { G.game.update(dt); });
    }
    if (G.engine) {
      if (G.engine.update) safe('engine.update', function () { G.engine.update(dt); });
      if (G.engine.render) safe('engine.render', function () { G.engine.render(); });
    }
    if (G.ui && G.ui.update) safe('ui.update', function () { G.ui.update(dt); });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Autosave when the app is backgrounded (iOS kills PWAs without warning).
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && S.player && G.meta && G.meta.save) G.meta.save();
    last = performance.now();
  });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
