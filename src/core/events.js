// Tiny synchronous event bus. A throwing listener never breaks the emitter.
(function () {
  'use strict';
  const G = window.G;
  const listeners = Object.create(null);

  G.on = function (name, fn) {
    (listeners[name] || (listeners[name] = [])).push(fn);
    return function () { G.off(name, fn); };
  };

  G.off = function (name, fn) {
    const list = listeners[name];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };

  G.emit = function (name, payload) {
    const list = listeners[name];
    if (!list) return;
    for (const fn of list.slice()) {
      try { fn(payload); } catch (err) { console.error('[event ' + name + ']', err); }
    }
  };
})();
