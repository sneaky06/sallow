// Tile art per theme, pre-rendered once into small canvases. U.tiles.get(theme) → tileset.
// Ground tiles are 32x16 diamonds; walls/doors/stairs-up are blocks drawn above their tile.
// Art rules: floors live in a dark, narrow value band; wall faces sit a clear step above it with a crisp lit top
// edge and near-black tops. Grime (cracks, stains, blood, mould, bones) is authored per variant and placed by
// position hash — never per-pixel speckle across the whole tile.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const WALL_H = 24, HEIGHTS = [24, 16, 8];     // full / mid / low walls

  const DEFS = {
    town:    { fl: '#4a4743', fd: '#292725', style: 'cobble',  wall: '#8c8474', wallD: '#2c231c', top: '#33252a', wstyle: 'timber', glow: null,
      water: '#34402c', grass: '#353d2c', dirt: '#463b30', moss: '#4a5630', amb: [136, 138, 156], bg: '#08090c', mist: ['#b8b8c4', 'ash'] },
    crypt:   { fl: '#3d414d', fd: '#22242c', style: 'slab',    wall: '#6c7180', wallD: '#282a34', top: '#191b22', wstyle: 'brick',  glow: null,
      water: '#1e464c', grass: '#2e3a2c', dirt: '#3a322a', moss: '#3e5236', amb: [70, 72, 102], bg: '#050508', mist: ['#9aa4c0', 'mist'] },
    caves:   { fl: '#33302e', fd: '#1b1919', style: 'rough',   wall: '#5c5751', wallD: '#221f1e', top: '#141212', wstyle: 'rock',   glow: null,
      water: '#35502a', grass: '#2c3a26', dirt: '#3a3028', moss: '#b4bc94', amb: [66, 70, 64], bg: '#040404', mist: ['#a8c890', 'spore'] },
    inferno: { fl: '#392523', fd: '#190d0d', style: 'cracked', wall: '#60392f', wallD: '#210f0d', top: '#140909', wstyle: 'rock',   glow: '#ff7a1e',
      water: '#4a1420', grass: '#33281e', dirt: '#3a2a22', moss: '#1c1414', amb: [104, 54, 44], bg: '#060202', mist: ['#ff9a3a', 'ember'] },
    abyss:   { fl: '#38283e', fd: '#160e1d', style: 'flesh',   wall: '#6a4560', wallD: '#20112a', top: '#110916', wstyle: 'flesh',  glow: '#58e0c0',
      water: '#1e1438', grass: '#2e2638', dirt: '#33263a', moss: '#b8a0b0', amb: [68, 50, 98], bg: '#030206', mist: ['#b890d0', 'mist'] },
  };
  const BLOOD = U.rgbOf('#5c1214'), BLOODL = U.rgbOf('#8a1a1a'), BONE = 0xa8a08a, WOOD = U.rgbOf('#4c3826');
  // floor variant by (position hash & 31): 0-2 clean, 3 crack, 4 damp stain, 5 blood, 6 mould/moss, 7 bones
  const FLOOR_PICK = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 6, 6, 6, 5, 5, 7];
  const sets = Object.create(null);

  function diamond(fn) {
    const b = new U.Buf(32, 16);
    for (let py = 0; py < 16; py++) {
      const hw = py < 8 ? 2 * (py + 1) : 2 * (16 - py);
      for (let px = 16 - hw; px < 16 + hw; px++) {
        const cx = (px + 0.5 - 16) / 16, cy = (py + 0.5) / 8;
        b.set(px, py, fn((cx + cy) / 2, (cy - cx) / 2, px, py));
      }
    }
    return b.done();
  }

  // Structure of the clean floor: returns a brightness factor, or -1 for a grout/gap pixel.
  function floorBase(t, vr, u, v) {
    const s = vr % 3;
    switch (t.style) {
      case 'slab': {
        const gu = (u * 2) % 1, gv = (v * 2) % 1;
        if (gu < 0.07 || gv < 0.07) return -1;
        let f = 0.92 + U.hash((u * 2) | 0, ((v * 2) | 0) + s * 3, 5) * 0.14;
        if (gu < 0.16 || gv < 0.16) f *= 1.1;
        return f;
      }
      case 'cobble': {
        const cu = u * 4, cv = v * 4 + ((cu | 0) & 1) * 0.5;
        const du = (cu % 1) - 0.5, dv = (cv % 1) - 0.5;
        if (du * du + dv * dv > 0.21) return -1;
        return (0.88 + U.hash(cu | 0, (cv | 0) + s * 5, 3) * 0.2) * (du + dv < -0.28 ? 1.12 : 1);
      }
      case 'rough': {
        const n = U.vnoiseP(u * 4, v * 4, 3 + s * 17, 4);
        return n < 0.3 ? 0.86 : n > 0.72 ? 1.07 : 0.96;         // three flat tones = wet rock facets, not speckle
      }
      case 'cracked': {
        const n = U.vnoiseP(u * 4, v * 4, 4 + s * 13, 4);
        return n < 0.34 ? 0.84 : n > 0.7 ? 1.08 : 0.96;
      }
      case 'flesh': {
        const n = U.vnoiseP(u * 3, v * 3, 6 + s * 7, 3);
        if (Math.abs(n - 0.5) < 0.03) return -1;                 // sinew seams
        return n < 0.5 ? 0.9 : 1.06;
      }
    }
    return 1;
  }

  function floorCol(t, vr, u, v, px, py) {
    const base = floorBase(t, vr, u, v);
    const edge = Math.min(u, v, 1 - u, 1 - v);
    let c = t.flC, f = base < 0 ? 1 : base;
    if (base < 0) c = t.fdC;
    if (t.style === 'cracked' && t.glowC && base >= 0) {       // glowing fissures are part of the inferno floor itself
      const cr = U.vnoiseP(u * 3, v * 3, 8 + (vr % 3) * 11, 3);
      if (Math.abs(cr - 0.5) < 0.022) return (vr % 3 === 1) ? U.mixP(t.glowC, t.fdC, 0.25) : U.toneP(t.fdC, 0.6);
    }
    if (edge > 0.07) {
      if (vr === 3) {                                          // crack
        const cx = 0.3 + 0.3 * U.vnoiseP(v * 4, 1, 40, 4);
        if (Math.abs(u - cx) < 0.028) return t.style === 'flesh' ? U.toneP(t.mossC, 0.8) : U.toneP(t.fdC, 0.55);
        if (v > 0.5 && Math.abs(u - cx - (v - 0.5) * 0.7) < 0.022) return U.toneP(t.fdC, 0.6);
      } else if (vr === 4) {                                   // damp stain with a darker tide line
        const n = U.vnoiseP(u * 2, v * 2, 44, 2);
        if (n > 0.6) f *= 0.74; else if (n > 0.56) f *= 0.6;
      } else if (vr === 5) {                                   // blood pool + drag mark + spatter
        const d = Math.hypot(u - 0.42, v - 0.55) + (U.vnoiseP(u * 5, v * 5, 46, 5) - 0.5) * 0.22;
        if (d < 0.17) return U.mixP(c, d < 0.09 ? BLOODL : BLOOD, 0.8);
        if (u > 0.5 && u < 0.9 && Math.abs(v - 0.55 - (u - 0.5) * 0.25) < 0.035) return U.mixP(c, BLOOD, 0.55);
        if (U.hash(px, py, 47) > 0.975 && d < 0.4) return U.mixP(c, BLOODL, 0.7);
      } else if (vr === 6) {                                   // mould / moss / fungus / tendrils
        const n = U.vnoiseP(u * 3, v * 3, 48, 3);
        if (n > 0.64) return U.mixP(c, t.mossC, U.hash(px >> 1, py, 49) > 0.7 ? 0.75 : 0.42);
      } else if (vr === 7) {                                   // scattered bones and teeth
        if ((py === 6 && px >= 11 && px <= 14) || (px === 15 && py === 7) || (py === 10 && px >= 19 && px <= 21) ||
          (px === 18 && py === 11) || (px === 16 && py === 4) || (px === 24 && py === 8)) return BONE;
        if ((py === 7 && px >= 11 && px <= 14) || (py === 11 && px >= 19 && px <= 21)) return U.toneP(t.fdC, 0.6);
      }
    }
    return U.toneP(c, f);
  }

  function wallCol(t, vr, H) {
    const wallC = t.wallC, darkC = t.wallDC, topC = t.topC;
    return function (face, a, b) {
      if (face === 0) {
        // near-black mass; the crisp lit edge comes from the top row of whichever faces are exposed
        if (t.wstyle === 'timber') {
          const row = (a * 5) | 0;
          if ((a * 5) % 1 < 0.2 || ((b * 4 + (row & 1) * 0.5) % 1) < 0.14) return U.toneP(topC, 0.6);
          return U.toneP(topC, 0.9 + 0.25 * U.hash(row, (b * 4 + (row & 1) * 0.5) | 0, 2));
        }
        return U.toneP(topC, 0.85 + 0.3 * U.vnoiseP(a * 3, b * 3, 12 + vr, 3));
      }
      const side = face === 1 ? 1 : 0.62;
      const col = (a * 16) | 0;
      if (b >= H - 1) return U.toneP(wallC, face === 1 ? 1.45 : 1.05);                 // lit top edge
      let f = side * (b < 2 ? 0.66 : 1);
      // drips / rust streaks running down from the top, grime gathering at the base
      const drip = U.hash(col, vr * 7 + face, 21);
      if (drip > (t.wstyle === 'rock' ? 0.88 : 0.76) && b > H - 3 - drip * 14) f *= 0.78;
      const foot = U.hash(col, vr + face * 3, 22) > 0.55 && b < 2 + U.hash(col, face, 23) * 4;

      if (t.wstyle === 'brick') {
        const row = (b / 4) | 0, q = a * 2 + (row & 1) * 0.5;
        if (b % 4 === 3 || (q % 1) < 0.07) return U.toneP(darkC, side * 1.05);
        f *= 0.9 + U.hash(q | 0, row + vr * 9, face) * 0.18;
        if (vr === 1 && face === 1 && Math.abs(a - 0.3 - b / H * 0.3) < 0.03 && b > 4) return U.toneP(darkC, 0.7);     // crack
        if (foot) return U.mixP(U.rgbOf(U.hex(U.toneP(wallC, f))), t.mossC, 0.5);
        return U.toneP(wallC, f);
      }
      if (t.wstyle === 'rock') {
        const n = U.vnoise(a * 4 + vr * 3 + face * 7, b / 5, 2);
        f *= n < 0.33 ? 0.72 : n > 0.68 ? 1.12 : 0.92;
        if (t.glowC && Math.abs(U.vnoise(a * 3 + vr + face * 5, b / 7, 11) - 0.5) < 0.026) return U.mixP(t.glowC, wallC, 0.2);
        if (t.glowC && vr === 1 && face === 1 && col === 8 && b > 5 && b < H - 2) return b % 3 === 0 ? 0x1a1414 : 0x7a726c;   // hanging chain
        if (!t.glowC && foot) return U.hash(col, b | 0, 24) > 0.5 ? U.toneP(t.mossC, 0.95) : U.toneP(wallC, f * 0.8);      // pale fungus
        return U.toneP(wallC, f);
      }
      if (t.wstyle === 'flesh') {
        const n = U.vnoise(a * 3 + vr * 2 + face * 5, b / 6, 13);
        if (Math.abs(n - 0.5) < 0.03) return U.toneP(darkC, side * 1.2);                                        // sinew
        f *= n < 0.5 ? 0.82 : 1.05;
        if (vr === 1 && face === 1) {                                                                            // an eye
          const da = (a - 0.5) / 0.2, dz = (b - 14) / 3.2, d = da * da + dz * dz;
          if (d < 1) return d < 0.12 ? 0x08060a : d < 0.42 ? U.toneP(t.glowC, 1) : 0xd0c0b0;
          if (d < 1.5) return U.toneP(darkC, 0.9);
        }
        if (U.hash(col, vr + face, 25) > 0.8 && b < 9 + U.hash(col, 3, 26) * 8) return U.toneP(t.mossC, side * 0.9);   // pale tendrils
        return U.toneP(wallC, f);
      }
      // town: grimy plaster in a rotting timber frame, dark windows
      if (a < 0.11 || a > 0.89 || b >= H - 3 || b < 2 || Math.abs(b - 12) < 1) return U.toneP(darkC, side * 1.1);
      if (vr === 1 && a > 0.36 && a < 0.64 && b > 13 && b < 20) return (a > 0.48 && a < 0.52) || b === 17 ? U.toneP(darkC, side * 1.1) : 0x0a0a10;
      if (vr === 0 && Math.abs(a - 0.11 - (b - 2) / 10 * 0.78) < 0.06 && b < 12) return U.toneP(darkC, side * 1.1);
      if (foot || (b < 5 && U.hash(col, 5, 27) > 0.6)) f *= 0.7;                                                 // mud splash
      return U.toneP(wallC, f * (0.94 + 0.1 * U.vnoiseP(a * 3, b / 6, 28 + vr, 3)));
    };
  }

  function block(t, vr, H) {
    const b = new U.Buf(32, 16 + H);
    b.box(16, H, 0, 0, 1, 1, 0, H, wallCol(t, vr, H));
    return b.done();
  }

  // Door frame: two posts and a lintel across the opening. axis 0: posts at low/high u; axis 1: at low/high v.
  function doorFrame(t, axis) {
    const H = WALL_H, b = new U.Buf(32, 16 + H);
    const post = function (face, a, z) { return U.toneP(WOOD, (face === 0 ? 1.3 : face === 1 ? 1 : 0.62) * (z % 6 === 5 ? 0.7 : 1)); };
    const wood = function (face, a, z) { return z >= H - 1 && face ? U.toneP(WOOD, 1.7) : U.toneP(WOOD, (face === 0 ? 1.4 : face === 1 ? 1.15 : 0.7)); };
    if (axis === 0) {
      b.box(16, H, 0, 0.3, 0.2, 0.7, 0, H - 5, post);
      b.box(16, H, 0.8, 0.3, 1, 0.7, 0, H - 5, post);
      b.box(16, H, 0, 0.24, 1, 0.76, H - 5, H, wood);
    } else {
      b.box(16, H, 0.3, 0, 0.7, 0.2, 0, H - 5, post);
      b.box(16, H, 0.3, 0.8, 0.7, 1, 0, H - 5, post);
      b.box(16, H, 0.24, 0, 0.76, 1, H - 5, H, wood);
    }
    return b.done();
  }

  function build(name) {
    const d = DEFS[name] || DEFS.crypt;
    const t = Object.assign({}, d, {
      name: name, flC: U.rgbOf(d.fl), fdC: U.rgbOf(d.fd), wallC: U.rgbOf(d.wall), wallDC: U.rgbOf(d.wallD),
      topC: U.rgbOf(d.top), glowC: d.glow ? U.rgbOf(d.glow) : null, waterC: U.rgbOf(d.water),
      grassC: U.rgbOf(d.grass), dirtC: U.rgbOf(d.dirt), mossC: U.rgbOf(d.moss),
    });
    const s = { def: t, floor: [], grass: [], path: [], rubble: [], water: [], lava: [], wall: [], deepWater: [], deepLava: [], chasm: [] };
    for (let vr = 0; vr < 8; vr++) s.floor.push(diamond(function (u, v, px, py) { return floorCol(t, vr, u, v, px, py); }));
    for (let vr = 0; vr < 3; vr++) {
      // dying grass: flat tonal patches, sparse pale dead tufts, bare mud showing through on variant 2
      s.grass.push(diamond(function (u, v, px, py) {
        const n = U.vnoiseP(u * 3, v * 3, 21 + vr * 5, 3);
        if (vr === 2 && n < 0.3) return U.toneP(t.dirtC, 0.9);
        if (U.hash(px, py >> 1, 20 + vr) > 0.955) return U.toneP(t.grassC, 1.45);
        return U.toneP(t.grassC, n < 0.38 ? 0.8 : n > 0.68 ? 1.12 : 0.96);
      }));
    }
    for (let vr = 0; vr < 2; vr++) {
      // mud and ash: ruts, puddle on variant 1
      s.path.push(diamond(function (u, v, px, py) {
        const n = U.vnoiseP(u * 4, v * 4, 31 + vr * 5, 4);
        if (vr === 1) { const p = U.vnoiseP(u * 2, v * 2, 33, 2); if (p > 0.68) return U.toneP(t.waterC, p > 0.74 ? 0.9 : 0.6); }
        if (Math.abs(((u + v * 0.3) * 3) % 1 - 0.5) < 0.06 && n > 0.4) return U.toneP(t.dirtC, 0.72);
        return U.toneP(t.dirtC, n < 0.35 ? 0.86 : n > 0.7 ? 1.1 : 0.98);
      }));
    }
    s.bridge = diamond(function (u, v, px, py) {
      if (v < 0.09 || v > 0.91) return U.toneP(WOOD, 0.55);
      if ((u * 5) % 1 < 0.14) return U.toneP(WOOD, 0.5);
      const k = (u * 5) | 0;
      if (k === 3 && v > 0.55 && v < 0.75) return U.toneP(WOOD, 0.4);            // a rotted hole
      return U.toneP(WOOD, 1.25 + U.hash(k, 0, 41) * 0.3);
    });
    for (let vr = 0; vr < 2; vr++) {
      const rocks = [];
      for (let i = 0; i < 6; i++) rocks.push(0.15 + U.hash(i, vr, 50) * 0.7, 0.15 + U.hash(i, vr, 51) * 0.7, 0.06 + U.hash(i, vr, 52) * 0.08);
      s.rubble.push(diamond(function (u, v, px, py) {
        for (let i = 0; i < rocks.length; i += 3) {
          const du = u - rocks[i], dv = v - rocks[i + 1], r = rocks[i + 2];
          if (du * du + dv * dv < r * r) return U.toneP(t.wallC, du + dv < -r * 0.3 ? 1.2 : du + dv > r * 0.5 ? 0.5 : 0.85);
        }
        return floorCol(t, vr, u, v, px, py);
      }));
    }
    for (let k = 0; k < 8; k++) {
      const fr = k & 3, vs = k >> 2;
      if (!fr) { s.water.push([]); s.lava.push([]); }
      // shallow (wadeable): the floor shows through a thin film, with a few slow glints
      s.water[vs].push(diamond(function (u, v, px, py) {
        const w = Math.sin((u * 2 + v) * 6.2832 + fr * 1.571 + U.vnoiseP(u * 3, v * 3, 60, 3, 60 + vs * 9) * 3);
        if (w > 0.9 && U.hash(px >> 1, py, 62) > 0.5) return U.toneP(t.waterC, 1.7);
        return U.mixP(U.rgbOf(U.hex(floorCol(t, vs, u, v, px, py))), t.waterC, w < -0.6 ? 0.62 : 0.5);
      }));
      // deep: dark, opaque, slow swell
      if (!vs) s.deepWater.push(diamond(function (u, v, px, py) {
        const n = U.vnoiseP(u * 3, v * 3, 61, 3);
        const w = Math.sin((u + v * 2) * 6.2832 + fr * 1.571 + n * 4);
        if (w > 0.93 && U.hash(px >> 1, py, 63) > 0.6) return U.toneP(t.waterC, 1.1);
        return U.toneP(t.waterC, n < 0.4 ? 0.3 : 0.42);
      }));
      // shallow lava (wadeable, burns): dark crust over the floor with glowing veins
      s.lava[vs].push(diamond(function (u, v, px, py) {
        const n = 0.6 * U.vnoiseP(u * 6, v * 6, 70, 6, 70 + vs * 9) + 0.4 * U.vnoiseP(u * 2, v * 2, 72, 2, 72 + vs * 9) + 0.05 * Math.sin((u - v) * 12.566 + fr * 1.571) + 0.06 * Math.sin((u + v) * 6.2832 - fr * 1.571);
        if (n > 0.6) return n > 0.68 ? 0xffb030 : 0xd8481a;
        return U.mixP(U.rgbOf(U.hex(floorCol(t, vs, u, v, px, py))), [70, 16, 10], n > 0.52 ? 0.75 : 0.45);
      }));
      // deep lava: bright and churning
      if (!vs) s.deepLava.push(diamond(function (u, v, px, py) {
        const n = 0.6 * U.vnoiseP(u * 6, v * 6, 70, 6, 70 + vs * 9) + 0.4 * U.vnoiseP(u * 2, v * 2, 72, 2, 72 + vs * 9) + 0.05 * Math.sin((u - v) * 12.566 + fr * 1.571) + 0.06 * Math.sin((u + v) * 6.2832 - fr * 1.571);
        return n > 0.68 ? 0xffd84a : n > 0.56 ? 0xff8a1e : n > 0.46 ? 0xc8361a : n > 0.38 ? 0x6a160e : 0x1e0a08;
      }));
    }
    s.stairsDown = diamond(function (u, v, px, py) {
      if (u < 0.1 || v < 0.1 || v > 0.9) return U.toneP(t.wallC, 1.35);
      const q = (u - 0.1) / 0.9 * 5, i = q | 0;
      const f = Math.max(0.08, 1.7 - i * 0.36);
      return U.toneP(t.flC, (q % 1) < 0.32 ? f * 1.3 : f * 0.55);
    });
    // Stairs up: four steps rising toward the back-left.
    (function () {
      const b = new U.Buf(32, 16 + 16);
      for (let i = 0; i < 4; i++) {
        b.box(16, 16, i / 4, 0.06, (i + 1) / 4, 0.94, 0, (4 - i) * 4, function (face, a, c) {
          return U.toneP(t.wallC, face === 0 ? 1.3 : face === 1 ? 0.8 : 0.5);
        });
      }
      s.stairsUp = b.done();
    })();
    for (let lvl = 0; lvl < 3; lvl++) { const b0 = block(t, 0, HEIGHTS[lvl]), b1 = block(t, 1, HEIGHTS[lvl]); s.wall.push([b0, b1, b0, b1]); }
    s.door = [doorFrame(t, 0), doorFrame(t, 1)];
    // bottomless pit: near-black, a few faint motes so it never reads as unexplored
    s.chasm.push(diamond(function (u, v, px, py) {
      return U.hash(px, py, 90) > 0.985 ? U.toneP(t.wallC, 0.5) : U.toneP(t.fdC, 0.22 + 0.12 * U.vnoiseP(u * 2, v * 2, 91, 2));
    }));
    s.bridge = [s.bridge];
    if (U.assets) U.assets.applyTiles(name, s);
    return s;
  }

  U.tiles = {
    WALL_H: WALL_H, WALL_HEIGHTS: HEIGHTS, FLOOR_PICK: FLOOR_PICK,
    get: function (theme) {
      const key = DEFS[theme] ? theme : 'crypt';
      return sets[key] || (sets[key] = build(key));
    },
    peek: function (theme) { return sets[theme] || null; },
  };
})();
