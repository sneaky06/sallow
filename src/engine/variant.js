// Floor variants (CONTRACT R5.10): map.variant = { id, name, palette, light, ambient, layout } from the world team.
// Resolved once per map into a small render recipe (tinted tileset, light colour/radius, ambient colour, fog, motes,
// sound bed). Everything is optional and guarded; a map without a variant renders exactly as before, plus the
// theme's own sound bed. Field shapes the engine accepts are listed in the R5 engine report.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const BED = { town: 'wind', crypt: 'drip', caves: 'water', inferno: 'fire', abyss: 'heart' };
  const KINDS = { mist: 1, ash: 1, ember: 1, spore: 1, drip: 1, snow: 1, motes: 1, void: 1, none: 1 };
  const SOUNDS = { wind: 1, drone: 1, drip: 1, fire: 1, heart: 1, choir: 1, water: 1, none: 1 };
  const MOTE_COL = { drip: '#8fb8d0', snow: '#d8e4f0', motes: '#c8ff8a', void: '#1a0e24' };
  const NO_TINT = { lava: 1, deepLava: 1 };     // glowing hazards keep their own colour

  const num = function (v, d, lo, hi) { return typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };

  // Recolour one art canvas, keeping its alpha: hue shift ('color' blend keeps each pixel's brightness), then
  // saturation (< 1 drains toward grey) and brightness (< 1 darkens, > 1 lifts). All canvas ops, once per floor.
  let colorOK = null;
  function tintCanvas(src, o) {
    const c = U.makeCanvas(src.width, src.height), x = U.ctx2d(c);
    x.drawImage(src, 0, 0);
    if (colorOK === null) { x.globalCompositeOperation = 'saturation'; colorOK = x.globalCompositeOperation === 'saturation'; x.globalCompositeOperation = 'source-over'; }
    if (o.tint && o.amount > 0) {
      x.globalCompositeOperation = colorOK ? 'color' : 'source-atop';
      x.globalAlpha = colorOK ? o.amount : o.amount * 0.35;
      x.fillStyle = o.tint;
      x.fillRect(0, 0, c.width, c.height);
    }
    if (o.sat < 0.97 && colorOK) {
      x.globalCompositeOperation = 'saturation'; x.globalAlpha = 1 - o.sat; x.fillStyle = '#808080';
      x.fillRect(0, 0, c.width, c.height);
    }
    if (o.bri < 0.98 || o.bri > 1.02) {
      x.globalCompositeOperation = o.bri < 1 ? 'multiply' : 'screen'; x.globalAlpha = 1;
      const g = o.bri < 1 ? Math.round(255 * o.bri) : Math.round(255 * Math.min(0.5, (o.bri - 1) * 1.5));
      x.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
      x.fillRect(0, 0, c.width, c.height);
    }
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(src, 0, 0);
    return c;
  }
  function tintDeep(v, o) {
    if (Array.isArray(v)) return v.map(function (c) { return tintDeep(c, o); });
    if (v && v.getContext) return tintCanvas(v, o);
    return v;
  }
  const LIQUID = { water: 1, deepWater: 1, lava: 1, deepLava: 1 };
  const tinted = new Map();
  // o = { tint, amount, sat, bri, liquid }
  function tintedSet(base, theme, o) {
    const key = theme + '|' + o.tint + '|' + o.amount + '|' + o.sat + '|' + o.bri + '|' + o.liquid + '|' + ((U.assets && U.assets.ver) || 0);
    let s = tinted.get(key);
    if (s) return s;
    const lq = o.liquid ? { tint: o.liquid, amount: 0.55, sat: 1, bri: 1 } : null;
    s = { def: base.def };
    for (const k in base) {
      if (k === 'def') continue;
      s[k] = LIQUID[k] && lq ? tintDeep(base[k], lq) : NO_TINT[k] ? base[k] : tintDeep(base[k], o);
    }
    if (tinted.size > 8) tinted.clear();
    tinted.set(key, s);
    return s;
  }

  function resolve(map) {
    const theme = map.theme || (map.kind === 'town' ? 'town' : 'crypt');
    const base = U.tiles.get(theme), d = base.def;
    const v = map.variant && typeof map.variant === 'object' ? map.variant : null;
    const r = {
      theme: theme, set: base, bg: d.bg, lightKey: 'player', lightR: 7, amb: d.amb, ambCss: null,
      fogA: 0.56, mist: d.mist ? d.mist[0] : null, kind: d.mist ? d.mist[1] : 'none', density: 1, sound: BED[theme] || 'drone',
      torchKey: null, torchR: 1, flicker: 1, blendSet: null, blendMask: null,
      name: v && typeof v.name === 'string' ? v.name : null, ver: (U.assets && U.assets.ver) || 0,
    };
    if (v) {
      // palette: { tint, amount, saturation, brightness, liquid, bg } | '#hex' | palette name
      const pal = v.palette, o = { tint: null, amount: 0.35, sat: 1, bri: 1, liquid: null };
      if (typeof pal === 'string') o.tint = U.safeColor(pal, null) || U.paletteOf(pal)[0];
      else if (Array.isArray(pal)) o.tint = U.safeColor(pal[0], null);
      else if (pal && typeof pal === 'object') {
        o.tint = U.safeColor(pal.tint || pal.main || pal.color, null);
        o.amount = Math.round(num(pal.amount, 0.35, 0, 1) * 20) / 20;
        o.sat = Math.round(num(pal.saturation, 1, 0, 1.5) * 10) / 10;
        o.bri = Math.round(num(pal.brightness, 1, 0.5, 1.5) * 20) / 20;
        o.liquid = U.safeColor(pal.liquid, null);
        if (U.safeColor(pal.bg, null)) r.bg = U.safeColor(pal.bg, r.bg);
      }
      if ((o.tint && o.amount > 0.01) || o.sat < 0.97 || o.bri !== 1 || o.liquid) r.set = tintedSet(base, theme, o);
      // blend (deep floors): another theme's tiles bleed in as noise patches, tinted the same way
      const B = v.blend;
      if (B && typeof B === 'object' && typeof B.theme === 'string' && B.theme !== theme && map.w > 0 && map.h > 0) {
        const amt = num(B.amount, 0.5, 0, 1);
        if (amt > 0.02) {
          const bt = U.tiles.get(B.theme);
          r.blendSet = (o.tint || o.sat < 0.97 || o.bri !== 1) ? tintedSet(bt, B.theme, o) : bt;
          const mask = new Uint8Array(map.w * map.h), sd = (map.seed | 0) & 1023;
          for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
            const n = U.vnoise(x / 4.5, y / 4.5, 300 + sd) * 0.75 + U.hash(x, y, 301 + sd) * 0.25;
            if (n < amt * 0.9) mask[y * map.w + x] = 1;
          }
          r.blendMask = mask;
        }
      }
      // light: { color, radius, ambient, torch, torchRadius, flicker } | radius
      const L = v.light;
      if (typeof L === 'number') r.lightR = num(L, 7, 3, 12);
      else if (typeof L === 'string' && U.safeColor(L, null)) r.lightKey = U.safeColor(L, null);
      else if (L && typeof L === 'object') {
        if (U.safeColor(L.color, null)) r.lightKey = U.safeColor(L.color, null);
        r.lightR = num(L.radius, 7, 3, 12);
        // ambient colour gives the darkness its hue; the theme keeps its overall level
        const ac = U.safeColor(L.ambient, null);
        if (ac) {
          const c = U.rgbOf(ac), mx = Math.max(c[0], c[1], c[2], 1), lv = Math.max(r.amb[0], r.amb[1], r.amb[2]);
          r.amb = [r.amb[0] * 0.6 + c[0] / mx * lv * 0.4, r.amb[1] * 0.6 + c[1] / mx * lv * 0.4, r.amb[2] * 0.6 + c[2] / mx * lv * 0.4];
        }
        if (U.safeColor(L.torch, null)) r.torchKey = U.safeColor(L.torch, null);
        r.torchR = num(L.torchRadius, 1, 0.4, 2);
        r.flicker = num(L.flicker, 0.5, 0, 1.5) * 2;
      }
      // ambient: { particles, density, color, fog, darkness, sound } | particles kind
      const A = v.ambient;
      let dark = 0;
      if (typeof A === 'string' && KINDS[A]) r.kind = A;
      else if (A && typeof A === 'object') {
        if (KINDS[A.particles]) r.kind = A.particles;
        r.density = num(A.density, 1, 0, 2);
        r.fogA = Math.round((0.4 + num(A.fog, 0.4, 0, 1) * 0.4) * 12) / 12;
        dark = num(A.darkness, 0, 0, 1);
        if (SOUNDS[A.sound]) r.sound = A.sound;
        if (U.safeColor(A.color, null)) r.mist = U.safeColor(A.color, null);
      }
      if (r.kind !== (d.mist && d.mist[1]) && !(A && A.color)) r.mist = MOTE_COL[r.kind] || r.mist || '#b8b8c4';
      r.amb = [r.amb[0] * (1.05 - dark * 0.6), r.amb[1] * (1.05 - dark * 0.6), r.amb[2] * (1.05 - dark * 0.6)];
    }
    r.ambCss = 'rgb(' + Math.min(255, r.amb[0] | 0) + ',' + Math.min(255, r.amb[1] | 0) + ',' + Math.min(255, r.amb[2] | 0) + ')';
    return r;
  }

  const memo = new WeakMap();
  U.variant = {
    // render recipe for a map (cached; rebuilt if hand-drawn tiles arrive later)
    get: function (map) {
      let r = memo.get(map);
      if (r && r.ver === ((U.assets && U.assets.ver) || 0)) return r;
      try { r = resolve(map); }
      catch (err) { console.warn('[engine] bad map.variant', err); r = resolve({ theme: map.theme, kind: map.kind }); }
      memo.set(map, r);
      return r;
    },
  };
})();
