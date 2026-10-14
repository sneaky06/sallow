// Input: floating virtual joystick (touches starting in the left 40% of the canvas), taps elsewhere → input:tap,
// plus keyboard/mouse for desktop. Writes G.input.move as a WORLD-space direction with magnitude 0..1.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const JOY_R = 46, DEADZONE = 0.16;                 // CSS px / fraction
  const joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, mx: 0, my: 0, mag: 0 };
  const keys = Object.create(null);
  let canvas = null;

  // screen-space direction → normalised world direction scaled by mag
  function setMove(sx, sy, mag) {
    const m = G.input.move;
    if (mag <= 0) { m.x = 0; m.y = 0; return; }
    const wx = sx / 2 + sy, wy = sy - sx / 2, l = Math.hypot(wx, wy) || 1;
    m.x = wx / l * mag; m.y = wy / l * mag;
  }
  function refresh() {
    if (joy.active) { setMove(joy.mx, joy.my, Math.hypot(joy.mx, joy.my) > 0 ? joy.mag : 0); return; }
    const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    setMove(kx, ky, kx || ky ? 1 : 0);
  }
  function tap(cx, cy) {
    const w = E.screenToWorld(cx, cy);
    G.emit('input:tap', { x: w.x, y: w.y });
  }

  function onDown(e) {
    U.audio.unlock();
    const rect = canvas.getBoundingClientRect();
    if (e.pointerType === 'mouse') {
      if (e.button === 0) tap(e.clientX, e.clientY);
      else if (e.button === 2) G.emit("input:classaction", {});
      return;
    }
    if (!joy.active && e.clientX - rect.left < rect.width * 0.4) {
      joy.active = true; joy.id = e.pointerId;
      joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY; joy.mx = joy.my = 0; joy.mag = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      refresh();
    } else {
      tap(e.clientX, e.clientY);
    }
  }
  function onMove(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) {                                   // drag the base along so the stick never "runs out"
      joy.ox += dx * (1 - JOY_R / d); joy.oy += dy * (1 - JOY_R / d);
      dx = e.clientX - joy.ox; dy = e.clientY - joy.oy;
    }
    joy.x = e.clientX; joy.y = e.clientY;
    const n = Math.min(1, d / JOY_R);
    joy.mag = n < DEADZONE ? 0 : (n - DEADZONE) / (1 - DEADZONE);
    joy.mx = dx; joy.my = dy;
    refresh();
  }
  function onUp(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    joy.active = false; joy.id = -1; joy.mag = 0;
    refresh();
  }

  const MOVE_KEYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  const PANEL_KEYS = { KeyI: 'inventory', KeyK: 'skills', KeyJ: 'quests', KeyM: 'map', Escape: 'menu' };
  function typing(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }
  function onKeyDown(e) {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    U.audio.unlock();
    const code = e.code;
    if (MOVE_KEYS[code]) { keys[MOVE_KEYS[code]] = true; refresh(); e.preventDefault(); return; }
    if (code === 'Space') { G.emit('input:attack', {}); e.preventDefault(); return; }
    if (e.repeat) return;
    if (code === "ShiftLeft" || code === "ShiftRight") { G.emit("input:classaction", {}); return; }
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3' || code === 'Digit4') G.emit('input:skill', { slot: +code.slice(5) - 1 });
    else if (code === 'KeyQ') G.emit('input:potion', { kind: 'hp' });
    else if (code === 'KeyE') G.emit('input:potion', { kind: 'mp' });
    else if (PANEL_KEYS[code]) G.emit('input:ui', { panel: PANEL_KEYS[code] });
  }
  function onKeyUp(e) {
    const k = MOVE_KEYS[e.code];
    if (k) { keys[k] = false; refresh(); }
  }
  function reset() {
    keys.up = keys.down = keys.left = keys.right = false;
    joy.active = false; joy.id = -1; joy.mag = 0;
    refresh();
  }

  U.input = {
    joy: joy, JOY_R: JOY_R,
    init: function (c) {
      canvas = c;
      c.style.touchAction = 'none';
      c.addEventListener('pointerdown', onDown);
      c.addEventListener('pointermove', onMove);
      c.addEventListener('pointerup', onUp);
      c.addEventListener('pointercancel', onUp);
      c.addEventListener('lostpointercapture', onUp);
      // stop scroll / pinch / double-tap zoom / long-press menus on the playfield
      const stop = function (e) { if (e.cancelable) e.preventDefault(); };
      c.addEventListener('touchstart', stop, { passive: false });
      c.addEventListener('touchmove', stop, { passive: false });
      c.addEventListener('touchend', stop, { passive: false });
      c.addEventListener('contextmenu', stop);
      c.addEventListener('dblclick', stop);
      document.addEventListener('gesturestart', stop, { passive: false });
      document.addEventListener('gesturechange', stop, { passive: false });
      // audio may only start inside a user gesture; the first one is often on a DOM button, not the canvas
      ["touchend", "pointerup", "click", "keydown"].forEach(function (n) { window.addEventListener(n, U.audio.unlock, true); });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', reset);
      document.addEventListener('visibilitychange', function () { if (document.hidden) reset(); });
    },
  };
})();
