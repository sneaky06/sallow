// Input: floating virtual joystick (touches starting in the left 40% of the canvas), taps elsewhere → input:tap,
// plus keyboard/mouse for desktop. Writes G.input.move as a WORLD-space direction with magnitude 0..1.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const JOY_R = 46, DEADZONE = 0.16;                 // CSS px / fraction
  const joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, mx: 0, my: 0, mag: 0, r: JOY_R, fixed: false };
  const keys = Object.create(null);
  let canvas = null;

  // R5.1: state.settings.hud.joystick = { mode: 'floating'|'fixed', x, y, size } — x, y = stick centre as fractions of
  // the viewport (window.innerWidth / innerHeight), size = stick diameter as a fraction of min(innerWidth, innerHeight). Optional orientation overrides
  // hud.portrait.joystick / hud.landscape.joystick, and hud.opacity (0..1). Read on touch-down and when drawing.
  const cfg = { fixed: false, right: false, cx: 0, cy: 0, r: JOY_R, opacity: 1 };
  function frac(v, d) { return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : d; }
  function readCfg(rect) {
    const S = G.state, hud = S && S.settings && S.settings.hud;
    const land = rect.width > rect.height;
    const o = hud && typeof hud === 'object' ? hud : {};
    const ori = land ? o.landscape : o.portrait;
    const j = (ori && typeof ori === 'object' && ori.joystick && typeof ori.joystick === 'object') ? ori.joystick : (o.joystick && typeof o.joystick === 'object' ? o.joystick : {});
    // UI writes fractions of the full viewport (window.innerWidth / innerHeight); size = DIAMETER / min(innerW, innerH)
    const vw = window.innerWidth || rect.width, vh = window.innerHeight || rect.height, short = Math.min(vw, vh) || 1;
    cfg.fixed = j.mode === 'fixed';
    const x = frac(j.x, land ? 0.14 : 0.2), y = frac(j.y, land ? 0.72 : 0.8);
    cfg.right = x >= 0.5;
    cfg.r = typeof j.size === 'number' && j.size > 0 ? Math.max(24, Math.min(80, j.size * short / 2)) : JOY_R;
    // keep a fixed stick fully on screen
    cfg.cx = Math.max(cfg.r + 4, Math.min(vw - cfg.r - 4, x * vw));
    cfg.cy = Math.max(cfg.r + 4, Math.min(vh - cfg.r - 4, y * vh));
    cfg.opacity = frac(o.opacity, 1);
    return cfg;
  }

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
    const c = readCfg(rect);
    const inZone = c.fixed ? Math.hypot(e.clientX - c.cx, e.clientY - c.cy) <= c.r * 1.6
      : c.right ? e.clientX - rect.left > rect.width * 0.6 : e.clientX - rect.left < rect.width * 0.4;
    if (!joy.active && inZone) {
      joy.active = true; joy.id = e.pointerId; joy.fixed = c.fixed; joy.r = c.r;
      if (c.fixed) { joy.ox = c.cx; joy.oy = c.cy; } else { joy.ox = e.clientX; joy.oy = e.clientY; }
      joy.x = e.clientX; joy.y = e.clientY; joy.mx = joy.my = 0; joy.mag = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      if (c.fixed) onMove(e); else refresh();
    } else {
      tap(e.clientX, e.clientY);
    }
  }
  function onMove(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy), R = joy.r;
    if (d > R) {
      if (joy.fixed) { dx *= R / d; dy *= R / d; }    // fixed: the knob stops at the rim
      else {                                           // floating: drag the base along so the stick never "runs out"
        joy.ox += dx * (1 - R / d); joy.oy += dy * (1 - R / d);
        dx = e.clientX - joy.ox; dy = e.clientY - joy.oy;
      }
    }
    joy.x = e.clientX; joy.y = e.clientY;
    const n = Math.min(1, d / R);
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
    config: function (rect) { return rect || canvas ? readCfg(rect || canvas.getBoundingClientRect()) : null; },
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
