// Procedural pixel-art entity sprites. U.sprites.get(desc) → cached sheet for a sprite descriptor
// { body, color, accent, scale, weapon }. Sheet = 16 frame columns x 4 facing rows of CELL px cells:
//   columns: idle 0-1, walk 2-5, attack 6-8, cast 9-11, hit 12, die 13-15
//   rows:    0 front-right, 1 front-left, 2 back-right, 3 back-left (left rows are mirrors)
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const CELL = 40, OX = 20, OY = 34;
  const FRAMES = [['idle', 0], ['idle', 1], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['attack', 0], ['attack', 1],
    ['attack', 2], ['cast', 0], ['cast', 1], ['cast', 2], ['hit', 0]];
  const BODIES = ['humanoid', 'skeleton', 'beast', 'blob', 'flyer', 'spider', 'caster', 'brute', 'wraith', 'demon'];
  const WEAPONS = ['none', 'sword', 'axe', 'mace', 'dagger', 'bow', 'staff', 'wand', 'shield'];

  function makeG(x, cx) {
    const ox = cx * CELL + OX;
    const g = {
      r: function (px, py, w, h, c) { x.fillStyle = c; x.fillRect(ox + px, OY + py, w, h); },
      d: function (px, py, c) { x.fillStyle = c; x.fillRect(ox + px, OY + py, 1, 1); },
      c: function (px, py, w, h) { x.clearRect(ox + px, OY + py, w || 1, h || 1); },
      l: function (x0, y0, x1, y1, c, t) {
        x.fillStyle = c; t = t || 1;
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (let n = 0; n < 80; n++) {
          x.fillRect(ox + x0, OY + y0, t, t);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      },
    };
    return g;
  }

  // Bodies must read at least a value step above the dark floors: lift colours that are too dark.
  function lift(hex, min) {
    const c = U.rgbOf(hex), l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    if (l >= min) return hex;
    const k = (min - l) / (255 - l);
    return U.hex(U.pack(c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k));
  }
  // The one saturated accent on a creature: its eyes.
  function eyeOf(hex) {
    const c = U.rgbOf(hex), m = Math.max(c[0], c[1], c[2], 1), k = 255 / m;
    return U.hex(U.pack(c[0] * k * 0.8 + 51, c[1] * k * 0.8 + 51, c[2] * k * 0.8 + 51));
  }
  function palette(desc) {
    const c = lift(U.safeColor(desc.color, '#8a8a96'), 86), a = lift(U.safeColor(desc.accent, U.tone(c, 1.4)), 70);
    return {
      eye: eyeOf(a),
      c: c, cd: U.tone(c, 0.66), cl: U.tone(c, 1.28), cdd: U.tone(c, 0.42),
      a: a, ad: U.tone(a, 0.64), al: U.tone(a, 1.4),
      skin: '#cfa888', skinD: '#9a7458', metal: '#c2c7d0', metalD: '#727a8a', wood: '#7a5434', woodD: '#463020',
      dark: '#15111c', white: '#ffffff', boot: '#2a2024',
    };
  }

  function pose(anim, f) {
    const p = { bob: 0, la: 0, lb: 0, ua: 0, ub: 0, lean: 0, wa: -68, arm: 0, glow: 0, pull: 0, f: f, anim: anim };
    if (anim === 'idle') p.bob = f;
    else if (anim === 'walk') {
      if (f === 0) { p.la = 2; p.lb = -2; } else if (f === 1) { p.bob = -1; p.ub = 2; }
      else if (f === 2) { p.la = -2; p.lb = 2; } else { p.bob = -1; p.ua = 2; }
    } else if (anim === 'attack') {
      if (f === 0) { p.wa = -150; p.lean = -1; p.arm = 1; p.pull = 1; }
      else if (f === 1) { p.wa = -22; p.lean = 1; p.arm = 2; p.la = 1; p.pull = 3; }
      else { p.wa = 38; p.lean = 2; p.arm = 3; p.la = 2; p.lb = -1; p.pull = 0; }
    } else if (anim === 'cast') {
      p.arm = 4; p.wa = -90; p.glow = f + 1; if (f === 1) p.bob = -1;
    } else if (anim === 'hit') { p.lean = -2; p.arm = 5; p.wa = -110; }
    return p;
  }

  function glow(g, P, x, y, n) {
    if (!n) return;
    g.r(x - 1, y - 1, 3, 3, P.al);
    if (n > 1) { g.d(x - 2, y, P.a); g.d(x + 2, y, P.a); g.d(x, y - 2, P.a); g.d(x, y + 2, P.a); }
    if (n > 2) { g.d(x - 3, y - 2, P.al); g.d(x + 3, y - 3, P.al); g.d(x + 2, y + 3, P.a); g.d(x - 2, y + 2, P.al); }
    g.d(x, y, P.white);
  }

  function weapon(g, P, kind, hx, hy, p) {
    const a = p.wa * Math.PI / 180, cx = Math.cos(a), cy = Math.sin(a);
    const X = function (d, s) { return hx + cx * d - cy * (s || 0); }, Y = function (d, s) { return hy + cy * d + cx * (s || 0); };
    let tipX = hx, tipY = hy;
    switch (kind) {
      case 'sword': case 'shield':
        g.l(X(-1), Y(-1), X(1), Y(1), P.woodD);
        g.l(X(2, -2), Y(2, -2), X(2, 2), Y(2, 2), P.ad);
        g.l(X(3), Y(3), X(kind === 'shield' ? 9 : 11), Y(kind === 'shield' ? 9 : 11), P.metal);
        g.l(X(3, 1), Y(3, 1), X(8, 1), Y(8, 1), P.metalD);
        tipX = X(11); tipY = Y(11);
        break;
      case 'dagger':
        g.l(X(-1), Y(-1), X(1), Y(1), P.woodD); g.d(Math.round(X(2, 1)), Math.round(Y(2, 1)), P.ad);
        g.l(X(2), Y(2), X(6), Y(6), P.metal);
        tipX = X(6); tipY = Y(6);
        break;
      case 'axe':
        g.l(X(-3), Y(-3), X(10), Y(10), P.wood);
        g.l(X(7, 1), Y(7, 1), X(10, 1), Y(10, 1), P.metal, 2); g.l(X(7, 3), Y(7, 3), X(10, 3), Y(10, 3), P.metalD, 2);
        g.l(X(6, 4), Y(6, 4), X(11, 4), Y(11, 4), P.metal);
        tipX = X(10); tipY = Y(10);
        break;
      case 'mace':
        g.l(X(-2), Y(-2), X(8), Y(8), P.wood);
        g.r(Math.round(X(10)) - 2, Math.round(Y(10)) - 2, 4, 4, P.metalD);
        g.r(Math.round(X(10)) - 1, Math.round(Y(10)) - 2, 2, 2, P.metal);
        g.d(Math.round(X(10)) - 3, Math.round(Y(10)), P.metal); g.d(Math.round(X(10)) + 2, Math.round(Y(10)) - 1, P.metal);
        g.d(Math.round(X(10)), Math.round(Y(10)) - 3, P.metal); g.d(Math.round(X(10)) - 1, Math.round(Y(10)) + 2, P.metalD);
        tipX = X(10); tipY = Y(10);
        break;
      case 'staff':
        g.l(X(-6), Y(-6), X(10), Y(10), P.wood);
        tipX = X(12); tipY = Y(12);
        g.r(Math.round(tipX) - 1, Math.round(tipY) - 1, 3, 3, P.a); g.d(Math.round(tipX), Math.round(tipY) - 1, P.al);
        g.d(Math.round(X(10, 2)), Math.round(Y(10, 2)), P.woodD); g.d(Math.round(X(10, -2)), Math.round(Y(10, -2)), P.woodD);
        break;
      case 'wand':
        g.l(X(0), Y(0), X(5), Y(5), P.wood);
        tipX = X(6); tipY = Y(6);
        g.d(Math.round(tipX), Math.round(tipY), P.al);
        break;
      case 'bow': {
        const pull = p.anim === 'attack' ? p.pull : 0;
        for (let t = -6; t <= 6; t++) g.d(hx + 2 - Math.round(t * t / 9), hy + t, Math.abs(t) > 4 ? P.woodD : P.wood);
        g.l(hx - 2, hy - 6, hx - 2 - pull, hy, P.metal); g.l(hx - 2 - pull, hy, hx - 2, hy + 6, P.metal);
        if (pull) { g.l(hx - 2 - pull, hy, hx + 5 - pull, hy, P.wood); g.d(hx + 6 - pull, hy, P.metal); }
        tipX = hx + 3; tipY = hy;
        break;
      }
    }
    return [Math.round(tipX), Math.round(tipY)];
  }

  // Two-legged rig shared by humanoid / skeleton / caster / brute / demon.
  const RIG = {
    humanoid: { leg: 6, lw: 2, tw: 8, th: 7, hw: 6, hh: 6, aw: 2 },
    skeleton: { leg: 6, lw: 1, tw: 7, th: 7, hw: 6, hh: 6, aw: 1, bones: 1, twitch: 1, long: 1, hunch: 1 },
    caster:   { leg: 6, lw: 2, tw: 8, th: 7, hw: 6, hh: 6, aw: 2, robe: 1, hood: 1 },
    brute:    { leg: 5, lw: 3, tw: 13, th: 10, hw: 6, hh: 5, aw: 3, neck: 2, bare: 1, hunch: 1, long: 1 },
    demon:    { leg: 6, lw: 2, tw: 9, th: 8, hw: 6, hh: 6, aw: 2, horns: 1, wings: 1, tail: 1, bare: 1, hunch: 1, twitch: 1 },
  };
  function biped(g, P, p, back, o, wpn) {
    let lean = p.lean, bob = p.bob;
    if (o.twitch && p.anim === 'idle' && p.f === 1) { lean += 1; bob = 0; }     // twitchy, not breathing
    const hip = -o.leg, tl = -(o.tw >> 1) + lean, tt = hip - o.th + bob;
    const hx = -(o.hw >> 1) + lean + (back ? 0 : 1) + (o.hunch && !back ? 2 : 0), ht = tt - o.hh + (o.neck || 0) + (o.hunch ? 2 : 0);
    const sh = tt + 2, aw = o.aw;
    const flesh = o.bones ? P.c : o.bare ? P.cl : P.skin;
    const sleeve = o.bones ? P.cd : o.bare ? P.c : P.cd;
    let fx, fy;                               // weapon hand
    switch (p.arm) {
      case 1: fx = tl + o.tw - 1; fy = sh - 3; break;
      case 2: fx = tl + o.tw + 3; fy = sh + 1; break;
      case 3: fx = tl + o.tw + 2; fy = sh + 4; break;
      case 4: fx = tl + o.tw + 1; fy = sh - 4; break;
      case 5: fx = tl + o.tw + 2; fy = sh - 2; break;
      default: fx = tl + o.tw; fy = sh + 4 + (o.long ? 3 : 0) + (p.anim === 'walk' ? (p.f === 0 ? -1 : p.f === 2 ? 1 : 0) : 0);
    }
    if (wpn === 'bow' && p.anim === 'attack') { fx = tl + o.tw + 3; fy = sh + 1; }
    let tip = [fx, fy];
    const frontArm = function () {
      g.l(tl + o.tw - 1, sh, fx, fy, sleeve, aw);
      g.r(fx, fy, aw, aw, flesh);
      if (o.bare && aw > 2) g.r(fx - 1, fy, aw + 1, aw, flesh);
      if (wpn && wpn !== 'none') tip = weapon(g, P, wpn, fx + (aw > 1 ? 1 : 0), fy, p);
      if (p.glow) glow(g, P, tip[0], tip[1] - (wpn && wpn !== 'none' ? 0 : 2), p.glow);
    };

    if (o.wings) {
      const fl = (p.f & 1) ? 1 : 0;
      g.r(tl - 3, tt - 2 + fl, 3, 7, P.ad); g.r(tl - 6, tt - 5 + fl, 3, 6, P.ad); g.d(tl - 7, tt - 6 + fl, P.a); g.d(tl - 4, tt + 5 + fl, P.ad);
      g.r(tl + o.tw, tt - 2 + fl, 3, 7, P.ad); g.r(tl + o.tw + 3, tt - 5 + fl, 3, 6, P.ad); g.d(tl + o.tw + 6, tt - 6 + fl, P.a);
      g.r(tl - 6, tt - 5 + fl, 3, 1, P.a); g.r(tl + o.tw + 3, tt - 5 + fl, 3, 1, P.a);
    }
    if (o.tail) { g.l(tl + 1, hip - 1, tl - 4, hip + 3, P.cd); g.d(tl - 5, hip + 2, P.a); }
    if (back) frontArm();

    // legs / robe
    const hl = lean >> 1;
    if (o.robe) {
      const sw = p.anim === 'walk' ? (p.f === 0 ? 1 : p.f === 2 ? -1 : 0) : 0;
      g.r(tl, hip - 1 + bob, o.tw, 3, P.c);
      g.r(tl - 1 + hl, hip + 2, o.tw + 2, o.leg - 3, P.c);
      g.r(tl - 1 + hl + sw, -1, o.tw + 2, 1, P.ad);
      g.r(tl - 1 + hl, hip + 2, 2, o.leg - 3, P.cd);
      g.r(tl + (o.tw >> 1) + hl, hip + 1, 1, o.leg - 2, P.cd);
    } else {
      const legC = o.bones ? P.cd : o.bare ? P.cd : P.cdd, legC2 = o.bones ? P.c : o.bare ? P.c : P.cd;
      const ax = -1 - o.lw + p.la + hl, bx = 1 + p.lb + hl;
      g.r(ax, hip, o.lw, o.leg - p.ua, legC); g.r(ax, -1 - p.ua, o.lw + 1, 1, o.bones ? P.c : P.boot);
      g.r(bx, hip, o.lw, o.leg - p.ub, legC2); g.r(bx, -1 - p.ub, o.lw + 1, 1, o.bones ? P.cl : P.boot);
    }

    // back arm (and shield)
    if (p.arm === 4 || p.arm === 5) g.l(tl, sh, tl - 2, sh - 4, sleeve, aw);
    else g.r(tl - aw + 1, sh, aw, o.long ? 8 : 5, sleeve), g.r(tl - aw + 1, sh + (o.long ? 8 : 5), aw, Math.max(1, aw - 1), o.bones ? P.cd : flesh === P.skin ? P.skinD : P.c);

    // torso
    if (o.bones) {
      g.r(tl + 3, tt, 1, o.th, P.cd);
      for (let y = 0; y < o.th - 2; y += 2) g.r(tl + 1, tt + y, o.tw - 2, 1, y === 0 ? P.cl : P.c);
      g.r(tl + 1, tt + o.th - 1, o.tw - 2, 1, P.c);
      g.r(tl + 2, tt + 2, 1, 1, P.a);
    } else {
      g.r(tl, tt, o.tw, o.th, P.c);
      g.r(tl, tt, 1, o.th, P.cd); g.r(tl + o.tw - 1, tt + 1, 1, o.th - 1, P.cd);
      g.r(tl + 1, tt, o.tw - 2, 1, P.cl);
      if (o.bare) { g.r(tl + 2, tt + 3, o.tw - 4, 1, P.cd); g.r(tl, tt + o.th - 2, o.tw, 2, P.ad); g.d(tl + (o.tw >> 1), tt + o.th - 2, P.al); }
      else {
        g.r(tl, tt + o.th - 2, o.tw, 1, P.ad);
        if (!back) { g.r(tl + (o.tw >> 1) + 1, tt + 1, 1, o.th - 3, P.a); if (!o.robe) g.d(tl + (o.tw >> 1) + 1, tt + o.th - 2, P.al); g.r(tl + 1, tt + 3, 2, 2, P.cd); g.d(tl + 1, tt + 3, P.ad); }   // a patch
        else g.r(tl + 2, tt + 1, o.tw - 4, 1, P.cd);
      }
    }
    if (wpn === 'shield' && !back) {
      g.r(tl - 3, sh, 5, 7, P.a); g.r(tl - 2, sh + 7, 3, 1, P.a); g.r(tl - 3, sh, 5, 1, P.al); g.r(tl - 3, sh, 1, 6, P.al);
      g.r(tl - 1, sh + 2, 1, 3, P.ad); g.r(tl - 2, sh + 3, 3, 1, P.ad);
    } else if (wpn === 'shield') {
      g.r(tl - 3, sh, 2, 7, P.ad);
    }

    // head
    if (o.hood) {
      g.r(hx - 1, ht - 1, o.hw + 2, o.hh + 1, P.cd); g.r(hx, ht - 2, o.hw, 1, P.cd); g.r(hx - 1, ht - 1, o.hw + 2, 1, P.c);
      if (!back) { g.r(hx + 2, ht + 1, o.hw - 2, o.hh - 2, P.dark); g.d(hx + o.hw - 2, ht + 2, P.eye); g.d(hx + o.hw - 4, ht + 2, P.eye); }
    } else if (o.bones) {
      g.r(hx, ht, o.hw, o.hh - 1, P.cl); g.r(hx + 1, ht + o.hh - 1, o.hw - 2, 1, P.c); g.r(hx, ht, 1, o.hh - 1, P.c);
      if (!back) { g.r(hx + o.hw - 2, ht + 2, 1, 2, P.dark); g.r(hx + o.hw - 4, ht + 2, 1, 2, P.dark); g.d(hx + o.hw - 2, ht + 2, P.eye); g.d(hx + o.hw - 3, ht + 4, P.cd); g.d(hx + 1, ht + 1, P.cd); }
      else g.r(hx + 1, ht + 1, o.hw - 2, 2, P.c);
    } else {
      g.r(hx, ht, o.hw, o.hh, flesh);
      if (o.bare) {
        g.r(hx, ht, 1, o.hh, P.c);
        if (!back) { g.d(hx + o.hw - 2, ht + 2, P.eye); g.d(hx + o.hw - 4, ht + 2, P.eye); g.r(hx + o.hw - 4, ht + 4, 3, 1, P.cdd); if (!o.horns) { g.d(hx + o.hw - 4, ht + 3, P.white); g.d(hx + o.hw - 2, ht + 3, P.white); } }
      } else {
        g.r(hx, ht, o.hw, 2, P.a); g.r(hx, ht, back ? o.hw : 2, o.hh - 1, P.a); g.r(hx, ht, o.hw, 1, P.al);
        if (!back) { g.d(hx + o.hw - 2, ht + 3, P.dark); g.d(hx + o.hw - 4, ht + 3, P.dark); g.r(hx + 2, ht + o.hh - 1, o.hw - 2, 1, P.skinD); }
        else g.r(hx, ht + o.hh - 1, o.hw, 1, P.ad);
      }
    }
    if (o.horns) {
      g.d(hx - 1, ht, P.al);                                   // left horn snapped off
      g.d(hx + o.hw, ht, P.al); g.d(hx + o.hw + 1, ht - 1, P.al); g.d(hx + o.hw + 1, ht - 2, P.a);
    }
    if (!back) frontArm();
  }

  function wraith(g, P, p, back, wpn) {
    const bob = p.anim === 'idle' ? p.f : (p.f & 1), lean = p.lean, sw = (p.f & 1) ? 1 : -1;
    const y0 = -4 - bob;
    g.r(-1 + sw + lean, y0 + 1, 2, 2, P.cdd); g.r(-2 - sw + lean, y0 - 1, 3, 2, P.cd); g.d(2 + lean, y0, P.cd); g.d(-4 + lean, y0 - 1, P.cd);
    g.r(-4 + lean, y0 - 11, 8, 10, P.c); g.r(-4 + lean, y0 - 11, 2, 10, P.cd); g.r(-3 + lean, y0 - 2, 1, 2, P.cdd); g.r(1 + lean, y0 - 2, 1, 2, P.cdd);
    g.r(-5 + lean, y0 - 9, 1, 5, P.cd); g.r(4 + lean, y0 - 9, 1, 5, P.cd);
    g.r(-4 + lean, y0 - 17, 8, 7, P.cd); g.r(-3 + lean, y0 - 18, 6, 1, P.cd); g.r(-4 + lean, y0 - 17, 8, 1, P.c);
    if (!back) { g.r(-1 + lean, y0 - 15, 4, 4, P.dark); g.d(lean, y0 - 14, P.eye); g.d(2 + lean, y0 - 14, P.eye); }
    // ragged, moth-eaten edges
    g.c(-4 + lean, y0 - 2); g.c(-1 + lean, y0 - 1); g.c(3 + lean, y0 - 3, 1, 2); g.c(4 + lean, y0 - 6); g.c(-5 + lean, y0 - 5); g.c(1 + lean, y0 - 2);
    let fx = 5 + lean, fy = y0 - 6;
    if (p.arm === 1) { fx = 3 + lean; fy = y0 - 12; } else if (p.arm === 2) { fx = 8 + lean; fy = y0 - 8; } else if (p.arm === 3) { fx = 7 + lean; fy = y0 - 4; }
    else if (p.arm === 4) { fx = 6 + lean; fy = y0 - 13; } else if (p.arm === 5) { fx = 6 + lean; fy = y0 - 11; }
    g.l(3 + lean, y0 - 9, fx, fy, P.cd); g.d(fx + 1, fy, P.a); g.d(fx, fy + 1, P.a); g.d(fx + 1, fy - 1, P.a);
    if (p.arm === 4 || p.arm === 5) { g.l(-4 + lean, y0 - 9, -6 + lean, y0 - 13, P.cd); g.d(-7 + lean, y0 - 14, P.a); }
    let tip = [fx + 1, fy];
    if (wpn && wpn !== 'none' && wpn !== 'shield') tip = weapon(g, P, wpn, fx, fy, p);
    if (p.glow) glow(g, P, tip[0], tip[1] - 1, p.glow);
  }

  function beast(g, P, p, back) {
    let ox = p.lean, oy = 0;
    if (p.anim === 'attack') { ox = p.f === 0 ? -2 : p.f === 1 ? 3 : 1; oy = p.f === 1 ? -1 : 0; }
    else if (p.anim === 'cast') { oy = -1; }
    const w = p.anim === 'walk' ? p.f : -1;
    const lg = function (x, up, c) { g.r(x + ox, -4 + oy, 2, 4 - up - (oy ? 0 : 0), c); g.d(x + ox + 1, -1 - up, c); };
    g.l(-6 + ox, -8 + oy, -9 + ox, -11 + oy + (p.f & 1), P.cd); g.d(-10 + ox, -11 + oy + (p.f & 1), P.a);
    lg(-5, w === 1 ? 2 : 0, P.cd); lg(4, w === 3 ? 2 : 0, P.cd);
    g.r(-6 + ox, -9 + oy, 12, 5, P.c); g.r(-6 + ox, -5 + oy, 11, 1, P.cd); g.r(-5 + ox, -10 + oy, 8, 1, P.a); g.r(-6 + ox, -9 + oy, 12, 1, P.cl);
    lg(-3, w === 3 ? 2 : 0, P.c); lg(2, w === 1 ? 2 : 0, P.c);
    const hy = (back ? -15 : -13) + oy + (p.anim === 'idle' ? p.f : 0), hx = 4 + ox;
    g.r(hx, hy, 5, 5, P.c); g.r(hx, hy, 5, 1, P.cl); g.d(hx, hy - 1, P.a); g.d(hx + 3, hy - 1, P.a);
    if (!back) {
      g.r(hx + 4, hy + 2, 3, 3, P.cd); g.d(hx + 6, hy + 2, P.dark); g.d(hx + 3, hy + 1, P.eye);
      if (p.anim === 'attack' && p.f > 0) { g.r(hx + 4, hy + 5, 3, 1, '#c82828'); g.d(hx + 6, hy + 4, P.white); g.d(hx + 4, hy + 4, P.white); }
    } else { g.r(hx + 1, hy + 1, 3, 3, P.cd); }
    if (p.glow) glow(g, P, hx + 8, hy + 3, p.glow);
  }

  function blob(g, P, p, back) {
    let w = 14, h = 9, xo = p.lean, yo = 0;
    if (p.anim === 'idle') { w = 14 + p.f; h = 9 - p.f; }
    else if (p.anim === 'walk') { const t = [[12, 11, 0], [13, 10, -3], [16, 7, 0], [14, 9, 0]][p.f]; w = t[0]; h = t[1]; yo = t[2]; }
    else if (p.anim === 'attack') { const t = [[16, 7, -1], [11, 12, 3], [16, 7, 2]][p.f]; w = t[0]; h = t[1]; xo = t[2]; }
    else if (p.anim === 'cast') { w = 13 - p.f; h = 10 + p.f; }
    else if (p.anim === 'hit') { w = 17; h = 6; }
    for (let i = 0; i < h; i++) {
      const half = Math.max(1, Math.round((w / 2) * Math.sqrt(1 - (i / h) * (i / h))));
      g.r(-half + xo, -1 - i + yo, half * 2, 1, i < 2 ? P.cd : i > h - 3 ? P.cl : P.c);
      g.d(-half + xo, -1 - i + yo, P.cd);
    }
    g.d(xo - (w >> 1) - 1, yo - 1, P.cd); g.d(xo + (w >> 1), yo - 1, P.cd); g.d(xo - (w >> 1) + 1, yo - h + 4, P.cl); g.d(xo - 1, yo - h + 3, P.white);   // wet: drips and a second glint
    const m = yo - (h >> 1) - 1;
    g.r(xo - 3, m - 1, 3, 2, P.a); g.d(xo - 4, m + 1, P.ad); g.d(xo + 1, m - 2, P.ad);
    g.r(xo - 3, yo - h + 2, 2, 1, P.white);
    if (!back) { g.r(xo + 1, m - 1, 2, 2, P.dark); g.r(xo + 4, m - 1, 1, 2, P.dark); g.d(xo + 1, m - 1, P.white); if (p.anim === 'attack') g.r(xo + 1, m + 2, 4, 1, P.dark); }
    if (p.glow) glow(g, P, xo, yo - h - 3, p.glow);
  }

  function flyer(g, P, p, back) {
    const flap = p.anim === 'idle' ? p.f * 2 : [0, 1, 2, 1][p.f & 3];
    let by = -16 + (flap === 2 ? -1 : 0), bx = p.lean;
    if (p.anim === 'attack') { by += [-2, 5, 2][p.f]; bx += [-1, 3, 2][p.f]; }
    const wy = by + [-5, -1, 2][flap];
    for (let s = -1; s <= 1; s += 2) {
      const x0 = bx + (s < 0 ? -4 : 3);
      g.r(x0 + (s < 0 ? -1 : 0), Math.min(by + 1, wy + 2), 3, Math.abs(by - wy) + 2, P.ad);
      g.r(x0 + s * 4 + (s < 0 ? -1 : 0), wy, 4, 4, P.ad); g.r(x0 + s * 4 + (s < 0 ? -1 : 0), wy, 4, 1, P.a);
      g.d(x0 + s * 7, wy + 4, P.ad); g.d(x0 + s * 5, wy + 4, P.ad); g.d(x0 + s * 8 + (s < 0 ? 1 : 0), wy - 1 + (flap === 2 ? 2 : 0), P.a);
    }
    g.r(bx - 2, by, 5, 6, P.c); g.r(bx - 2, by, 1, 6, P.cd); g.r(bx - 1, by + 6, 3, 1, P.cd); g.d(bx - 1, by + 7, P.cd); g.d(bx + 1, by + 7, P.cd);
    g.r(bx - 1, by - 4, 5, 4, P.c); g.r(bx - 1, by - 4, 5, 1, P.cl); g.d(bx - 1, by - 5, P.a); g.d(bx + 3, by - 5, P.a);
    if (!back) { g.d(bx + 1, by - 2, P.eye); g.d(bx + 3, by - 2, P.eye); g.d(bx + 2, by - 1, P.dark); if (p.anim === 'attack') { g.d(bx + 1, by, P.white); g.d(bx + 3, by, P.white); } }
    if (p.glow) glow(g, P, bx + 6, by - 1, p.glow);
  }

  function spider(g, P, p, back) {
    let ox = p.lean, oy = p.anim === 'idle' ? -p.f : 0;
    if (p.anim === 'attack') { ox = [-1, 3, 1][p.f]; oy = [-2, 0, 0][p.f]; }
    for (let i = 0; i < 4; i++) {
      const alt = p.anim === 'walk' ? ((i + p.f) & 1) : 0;
      for (let s = -1; s <= 1; s += 2) {
        const kx = s * (4 + i * 2) + ox + 1, fxx = s * (6 + i * 2 + (i === 3 ? 1 : 0)) + ox + 1;
        g.l(ox + 1 + s, -5 + oy, kx, -10 + oy + alt + (i >> 1), i & 1 ? P.cd : P.cdd);
        g.l(kx, -10 + oy + alt + (i >> 1), fxx, -alt, i & 1 ? P.cd : P.cdd);
      }
    }
    for (let i = 0; i < 6; i++) { const half = [3, 4, 5, 5, 4, 2][i]; g.r(-3 - half + ox, -4 - i + oy, half * 2, 1, i < 2 ? P.cd : i > 3 ? P.cl : P.c); }
    g.r(-5 + ox, -8 + oy, 2, 2, P.a); g.d(-2 + ox, -6 + oy, P.a); g.d(-5 + ox, -5 + oy, P.ad);
    g.r(1 + ox, -8 + oy, 5, 5, P.cd); g.r(1 + ox, -8 + oy, 5, 1, P.c);
    if (!back) { g.d(4 + ox, -6 + oy, P.eye); g.d(5 + ox, -4 + oy, P.eye); g.d(2 + ox, -6 + oy, P.eye); g.d(6 + ox, -3 + oy, P.white); g.d(4 + ox, -3 + oy, P.white); }
    if (p.glow) glow(g, P, 8 + ox, -6 + oy, p.glow);
  }

  function drawBody(g, P, body, p, back, wpn) {
    switch (body) {
      case 'beast': beast(g, P, p, back); break;
      case 'blob': blob(g, P, p, back); break;
      case 'flyer': flyer(g, P, p, back); break;
      case 'spider': spider(g, P, p, back); break;
      case 'wraith': wraith(g, P, p, back, wpn); break;
      default: biped(g, P, p, back, RIG[body] || RIG.humanoid, wpn);
    }
  }

  const tmp = U.makeCanvas(CELL, CELL), tmpX = U.ctx2d(tmp);
  function buildSheet(desc, body, wpn, scale) {
    const P = palette(desc);
    const work = U.makeCanvas(CELL * 16, CELL * 4), x = U.ctx2d(work, true);
    let c = work;
    if (body === 'wraith') x.globalAlpha = 0.86;
    for (let row = 0; row < 4; row += 2) {
      x.save(); x.translate(0, row * CELL);
      for (let i = 0; i < FRAMES.length; i++) drawBody(makeG(x, i), P, body, pose(FRAMES[i][0], FRAMES[i][1]), row === 2, wpn);
      x.restore();
    }
    x.globalAlpha = 1;
    const outlined = U.outlineCanvas(c, 0x07060a, body === "wraith" ? 200 : 255, 0.3).data;
    // die frames: the idle frame toppling over (or deflating)
    for (let row = 0; row < 4; row += 2) {
      tmpX.clearRect(0, 0, CELL, CELL);
      tmpX.drawImage(c, 0, row * CELL, CELL, CELL, 0, 0, CELL, CELL);
      for (let k = 0; k < 3; k++) {
        const dx = (13 + k) * CELL, dy = row * CELL;
        x.save();
        x.beginPath(); x.rect(dx, dy, CELL, CELL); x.clip();
        if (k > 0) {                                   // the mark it leaves: blood, ichor or ash
          const mc = body === 'skeleton' || body === 'wraith' ? ['#2a2826', '#44413c'] : body === 'spider' || body === 'blob' ? ['#2c4a16', '#4a7a22'] : ['#4a0c0e', '#7c1416'];
          const rw = k === 1 ? 7 : 11;
          x.fillStyle = mc[0];
          for (let yy = -3; yy <= 3; yy++) { const hw2 = Math.round(rw * Math.sqrt(1 - yy * yy / 12.25)); x.fillRect(dx + OX - hw2 + 2, dy + OY - 1 + yy, hw2 * 2, 1); }
          x.fillStyle = mc[1];
          x.fillRect(dx + OX - 3, dy + OY - 2, 5, 1); x.fillRect(dx + OX + rw - 2, dy + OY + 3, 2, 1); x.fillRect(dx + OX - rw, dy + OY - 4, 1, 1);
        }
        if (body === 'blob' || body === 'wraith') {
          const sy = [0.7, 0.45, 0.25][k], sx = [1.1, 1.25, 1.4][k];
          if (body === 'wraith') x.globalAlpha = [0.7, 0.45, 0.22][k];
          x.translate(dx + OX, dy + OY); x.scale(sx, sy); x.drawImage(tmp, -OX, -OY);
        } else {
          const ang = [0.5, 1.1, 1.5708][k], drop = (body === 'flyer') ? [3, 8, 11][k] : 0;
          const py = body === 'beast' || body === 'spider' ? 4 : 2;
          x.translate(dx + OX + [1, 4, 8][k], dy + OY - py + drop + (k === 2 ? 1 : 0)); x.rotate(-ang); x.drawImage(tmp, -OX, -(OY - py));
          if (k === 2) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(10,6,14,0.28)'; x.fillRect(-CELL, -CELL, CELL * 2, CELL * 2); }
        }
        x.restore();
      }
    }
    // mirrored rows
    for (let row = 1; row < 4; row += 2) {
      for (let i = 0; i < 16; i++) {
        x.save(); x.translate((i + 1) * CELL, row * CELL); x.scale(-1, 1);
        x.drawImage(c, i * CELL, (row - 1) * CELL, CELL, CELL, 0, 0, CELL, CELL);
        x.restore();
      }
    }
    // measure how tall the idle frame is (for health bars / name plates)
    let top = 20;
    scan: for (let y = 0; y < CELL; y++) for (let xx = 0; xx < CELL; xx++) if (outlined[(y * CELL * 16 + xx) * 4 + 3] > 60) { top = OY - y; break scan; }

    c = U.copyCanvas(work);
    let out = c, cell = CELL;
    if (scale !== 1) {
      cell = Math.max(8, Math.round(CELL * scale));
      out = U.makeCanvas(cell * 16, cell * 4);
      const ox = U.ctx2d(out);
      ox.drawImage(c, 0, 0, CELL * 16, CELL * 4, 0, 0, cell * 16, cell * 4);
    }
    const k = cell / CELL;
    return {
      c: out, base: c, cell: cell, ox: Math.round(OX * k), oy: Math.round(OY * k), top: Math.round(top * k),
      hover: body === 'flyer' || body === 'wraith', wide: body === 'beast' || body === 'spider' || body === 'brute' || body === 'blob',
      _flash: null, _outl: null,
      flash: function () { return this._flash || (this._flash = U.tint(this.c, '#ffffff')); },
      // sheet with a 1px coloured rim (champion / rare / boss)
      outlined: function (color) {
        if (!this._outl) this._outl = Object.create(null);
        let o = this._outl[color];
        if (o) return o;
        const t = U.tint(this.c, color);
        o = U.makeCanvas(this.c.width, this.c.height);
        const ox = U.ctx2d(o);
        ox.drawImage(t, -1, 0); ox.drawImage(t, 1, 0); ox.drawImage(t, 0, -1); ox.drawImage(t, 0, 1);
        ox.drawImage(this.c, 0, 0);
        return (this._outl[color] = o);
      },
    };
  }

  const cache = new Map();
  const DEFAULT = { body: 'humanoid', color: '#8a8a96', accent: '#c8c8d0', scale: 1, weapon: 'none' };
  U.sprites = {
    CELL: CELL, OX: OX, OY: OY,
    get: function (desc) {
      if (!desc || typeof desc !== 'object') desc = DEFAULT;
      let s = desc.scale;
      s = (typeof s === 'number' && s > 0 && isFinite(s)) ? Math.max(0.5, Math.min(4, Math.round(s * 20) / 20)) : 1;
      const key = desc.body + '|' + desc.color + '|' + desc.accent + '|' + s + '|' + desc.weapon;
      let sheet = cache.get(key);
      if (sheet) return sheet;
      const body = BODIES.indexOf(desc.body) >= 0 ? desc.body : 'humanoid';
      const wpn = WEAPONS.indexOf(desc.weapon) >= 0 ? desc.weapon : (body === 'caster' && desc.weapon === undefined ? 'staff' : 'none');
      try { sheet = buildSheet(desc, body, wpn, s); }
      catch (err) { console.warn('[engine] sprite build failed', err); sheet = buildSheet(DEFAULT, 'humanoid', 'none', 1); }
      if (cache.size > 160) cache.clear();
      cache.set(key, sheet);
      return sheet;
    },
    // frame column for an animation at time t (seconds in that animation)
    column: function (anim, t) {
      switch (anim) {
        case 'walk': return 2 + (Math.floor(t * 8) & 3);
        case 'attack': return 6 + Math.min(2, Math.floor(t / 0.09));
        case 'cast': return 9 + Math.min(2, Math.floor(t / 0.11));
        case 'hit': return 12;
        case 'die': return 13 + Math.min(2, Math.floor(t / 0.13));
        default: return Math.floor(t * 2) & 1;
      }
    },
    // facing (world radians) → sheet row
    row: function (facing) {
      const f = typeof facing === 'number' && isFinite(facing) ? facing : 0.7854;
      const c = Math.cos(f), s = Math.sin(f);
      return (c + s >= -0.001 ? 0 : 2) + (c - s >= -0.001 ? 0 : 1);
    },
  };

  const portraits = new Map();
  E.getPortrait = function (spriteDesc, size) {
    size = Math.max(8, (size | 0) || 48);
    const d = spriteDesc && typeof spriteDesc === 'object' ? spriteDesc : DEFAULT;
    const key = d.body + '|' + d.color + '|' + d.accent + '|' + d.weapon + '|' + size;
    let c = portraits.get(key);
    if (c) return c;
    const sheet = U.sprites.get({ body: d.body, color: d.color, accent: d.accent, weapon: d.weapon, scale: 1 });
    c = U.makeCanvas(size, size);
    const x = U.ctx2d(c);
    const z = Math.max(1, Math.floor(size / 22)), cw = Math.ceil(size / z);
    const g = x.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#231c2c'); g.addColorStop(1, '#0c0a12');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    const top = Math.round(sheet.top / (sheet.cell / CELL));
    let sy = OY - top - 2;
    if (top < cw - 4) sy = OY - cw + 2;                      // short bodies: sit them on the bottom edge
    x.drawImage(sheet.base, OX - (cw >> 1), sy, cw, cw, 0, 0, cw * z, cw * z);
    x.strokeStyle = '#000'; x.lineWidth = z * 2; x.strokeRect(0, 0, size, size);
    x.strokeStyle = '#6a5a3c'; x.lineWidth = z; x.strokeRect(z / 2, z / 2, size - z, size - z);
    if (portraits.size > 80) portraits.clear();
    portraits.set(key, c);
    return c;
  };
})();
