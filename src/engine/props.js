// Props (every G.C.PROP_TYPES), projectiles (every PROJECTILE_SHAPES) and the small glow/beam sprites.
// Prop canvases are 48x72 with the tile's top corner at (24, 48): draw at (sx - 24, sy - 48).
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const OX = 24, OY = 48, CX = 24, CY = 56;          // tile corner / tile centre inside a prop canvas
  const rgb = U.rgbOf, tp = U.toneP;
  const WOOD = rgb('#6a4c30'), WOODD = rgb('#3a2a20'), STONE = rgb('#7e818c'), STONED = rgb('#52545e'),
    GOLD = rgb('#e8c040'), IRON = rgb('#5a5a62'), LEAF = rgb('#2e3626'), BONE = rgb('#d8d2bc');

  function mat(c, o) {
    o = o || {};
    return function (face, a, b) {
      let k = face === 0 ? 1.18 : face === 1 ? 0.95 : 0.66;
      if (o.band && face && (b | 0) % o.band === o.band - 1) k *= 0.7;
      if (o.plank && face === 0 && ((a * o.plank) % 1) < 0.16) k *= 0.75;
      if (o.noise) k *= 1 - o.noise / 2 + o.noise * U.hash((a * 50) | 0, (b * 7) | 0, face + 3);
      return tp(c, k);
    };
  }
  function cylMat(c, o) {
    o = o || {};
    return function (face, t, z) {
      if (face === 0) return o.top !== undefined ? o.top : tp(c, 1.2);
      let k = t < -0.45 ? 1.15 : t < 0.3 ? 0.92 : 0.64;
      if (o.hoops && (z === o.hoops[0] || z === o.hoops[1])) return tp(IRON, k);
      if (o.stave && ((t * 3.2 + 9) % 1) < 0.18) k *= 0.8;
      if (o.brick && (z % 3 === 2 || ((t * 3 + (((z / 3) | 0) & 1) * 0.5 + 9) % 1) < 0.15)) k *= 0.7;
      return tp(c, k);
    };
  }
  function flame(b, cx, baseY, size, fr) {
    const w = fr === 1 ? 1 : fr === 2 ? -1 : 0;
    b.spike(cx + w, baseY, size, size * 2 + 2 + (fr & 1), 0xe8501a, 0xc8380e, 7 + fr);
    b.spike(cx, baseY, Math.max(1, size - 1), size + 2 + ((fr + 1) & 1), 0xffb030, 0xff8a1e, 0);
    b.spike(cx, baseY, Math.max(0, size - 2), Math.max(2, size - 1), 0xfff0a0, 0xffe070, 0);
  }

  const BUILD = {
    chest: function (b) {
      const m = function (face, a, z) {
        if (a > 0.44 && a < 0.56 && face !== 2) return tp(GOLD, face === 0 ? 1.1 : 0.9);
        return mat(WOOD, { band: 4 })(face, a, z);
      };
      b.box(OX, OY, 0.2, 0.3, 0.8, 0.7, 0, 7, m);
      b.box(OX, OY, 0.2, 0.3, 0.8, 0.7, 7, 10, function (face, a, z) { return a > 0.44 && a < 0.56 && face !== 2 ? tp(GOLD, 1.1) : tp(WOODD, face === 0 ? 1.5 : face === 1 ? 1.2 : 0.85); });
      b.rect(20, 51, 2, 2, 0xfff0a0);
    },
    chest_open: function (b) {
      b.box(OX, OY, 0.2, 0.22, 0.8, 0.3, 0, 15, mat(WOODD, { band: 5 }));           // raised lid at the back
      b.box(OX, OY, 0.2, 0.3, 0.8, 0.7, 0, 7, function (face, a, c) {
        if (face === 0) return (a < 0.27 || a > 0.73 || c < 0.36 || c > 0.64) ? tp(WOOD, 1.1) : 0x140e0a;
        return mat(WOOD, { band: 4 })(face, a, c);
      });
      b.set(23, 49, 0xffe070); b.set(26, 50, 0xffd040); b.set(21, 50, 0xfff0a0);
    },
    barrel: function (b) { b.cyl(CX, CY, 6, 0, 13, cylMat(WOOD, { hoops: [3, 10], stave: 1, top: tp(WOODD, 1.3) })); b.ell(CX, CY - 13, 4, 2, function () { return tp(WOOD, 0.9); }); },
    crate: function (b) {
      b.box(OX, OY, 0.22, 0.22, 0.78, 0.78, 0, 11, function (face, a, c) {
        const lo = face === 0 ? 0.22 : 0.22, e = (a - lo) / 0.56;
        if (face === 0) return (e < 0.14 || e > 0.86 || (c - 0.22) / 0.56 < 0.14 || (c - 0.22) / 0.56 > 0.86) ? tp(WOODD, 1.4) : tp(WOOD, 1.15);
        if (e < 0.14 || e > 0.86 || c < 2 || c > 8 || Math.abs(e - c / 11) < 0.1) return tp(WOODD, face === 1 ? 1.2 : 0.85);
        return tp(WOOD, face === 1 ? 0.95 : 0.66);
      });
    },
    torch: function (b, fr) {
      b.box(OX, OY, 0.44, 0.44, 0.56, 0.56, 0, 17, mat(WOODD));
      b.rect(CX - 2, CY - 19, 5, 2, tp(IRON, 1.1)); b.rect(CX - 1, CY - 17, 3, 1, tp(IRON, 0.7));
      flame(b, CX, CY - 20, 3, fr);
    },
    shrine: function (b, fr) {
      b.box(OX, OY, 0.18, 0.18, 0.82, 0.82, 0, 4, mat(STONE, { noise: 0.2 }));
      b.box(OX, OY, 0.32, 0.38, 0.68, 0.62, 4, 22, mat(STONED, { noise: 0.2 }));
      const g = fr === 1 ? 0xfff6c0 : 0xffd84a;
      b.rect(CX - 3, CY - 17, 1, 7, g); b.rect(CX - 5, CY - 15, 5, 1, g); b.rect(CX - 4, CY - 12, 3, 1, g);
      b.ball(CX, CY - 27, 3, fr === 1 ? rgb('#fff0a0') : GOLD);
    },
    shrine_used: function (b) {
      b.box(OX, OY, 0.18, 0.18, 0.82, 0.82, 0, 4, mat(STONE, { noise: 0.2 }));
      b.box(OX, OY, 0.32, 0.38, 0.68, 0.62, 4, 22, mat(STONED, { noise: 0.2 }));
      b.rect(CX - 3, CY - 17, 1, 7, 0x2c2e38); b.rect(CX - 5, CY - 15, 5, 1, 0x2c2e38);
    },
    pillar: function (b) {
      b.cyl(CX, CY, 8, 0, 3, cylMat(STONE));
      b.cyl(CX, CY, 5, 3, 30, cylMat(STONE, { stave: 1 }));
      b.cyl(CX, CY, 8, 30, 34, cylMat(STONE));
    },
    bones: function (b) {
      const c = tp(BONE, 1), d = tp(BONE, 0.7);
      b.line(15, 57, 22, 54, c); b.line(26, 59, 32, 60, c); b.line(20, 60, 24, 61, d); b.line(29, 54, 31, 56, d);
      b.rect(22, 55, 4, 3, c); b.rect(23, 58, 2, 1, d); b.set(22, 56, 0x18141c); b.set(24, 56, 0x18141c);
      b.set(14, 56, c); b.set(33, 61, c); b.set(18, 62, d);
    },
    stash: function (b) {
      const P = rgb('#4a2a5c');
      b.box(OX, OY, 0.12, 0.26, 0.88, 0.74, 0, 10, function (face, a, z) {
        if (face !== 2 && (Math.abs(a - 0.28) < 0.05 || Math.abs(a - 0.72) < 0.05)) return tp(IRON, face === 0 ? 1.3 : 1);
        return mat(P, { band: 5 })(face, a, z);
      });
      b.box(OX, OY, 0.12, 0.26, 0.88, 0.74, 10, 13, function (face, a, z) { return (Math.abs(a - 0.28) < 0.05 || Math.abs(a - 0.72) < 0.05) && face !== 2 ? tp(IRON, 1.3) : tp(P, face === 0 ? 1.45 : face === 1 ? 1.2 : 0.8); });
      b.rect(19, 50, 3, 3, tp(GOLD, 1)); b.set(20, 51, 0x18141c);
    },
    portal: function (b, fr) {
      const A = rgb('#6a4cff');
      b.ell(CX, CY, 9, 4, function (nx, ny) { return tp(STONED, 0.8 + 0.3 * U.hash((nx * 9) | 0, (ny * 5) | 0, 2)); });
      b.ell(CX, CY - 15, 8, 14, function (nx, ny) {
        const r = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
        if (r > 0.82) return tp(A, 1.5);
        const s = Math.sin(a * 2 + r * 7 - fr * 1.571);
        return s > 0.55 ? 0xd8c8ff : s > -0.2 ? tp(A, 1) : tp(A, 0.45);
      });
    },
    dungeon_entrance: function (b) {
      const m = mat(STONED, { band: 4, noise: 0.25 });
      b.box(OX, OY, 0.04, 0.04, 0.96, 0.3, 0, 30, m);
      b.box(OX, OY, 0.04, 0.3, 0.22, 0.96, 0, 26, m);
      b.box(OX, OY, 0.78, 0.3, 0.96, 0.96, 0, 26, m);
      b.box(OX, OY, 0.04, 0.3, 0.96, 0.96, 26, 31, mat(STONE, { noise: 0.2 }));
      // black maw + ember glow + steps
      b.box(OX, OY, 0.22, 0.3, 0.78, 0.94, 0, 24, function (face, a, z) {
        if (face === 0) return -1;
        if (face === 2) return -1;
        return z < 3 ? 0xc8481a : z < 7 ? 0x70200e : z < 12 ? 0x2c0c0a : 0x08040a;
      });
      b.rect(CX - 1, CY - 34, 3, 3, 0xd03a1a); b.set(CX, CY - 33, 0xffb040);
    },
    waypoint: function (b, fr) {
      const A = rgb('#3aa8ff');
      b.cyl(CX, CY, 12, 0, 2, cylMat(STONED, { top: tp(STONE, 0.85) }));
      b.ell(CX, CY - 2, 12, 6, function (nx, ny) {
        const r = Math.hypot(nx, ny);
        if (Math.abs(r - 0.72) < 0.1) return tp(A, fr === 1 ? 1.6 : 1.1);
        if (r < 0.3 || (Math.abs(nx) < 0.1 && r < 0.6) || (Math.abs(ny) < 0.16 && r < 0.6)) return tp(A, fr === 1 ? 1.4 : 0.8);
        return tp(STONE, 0.8 + 0.2 * U.hash((nx * 12) | 0, (ny * 6) | 0, 4));
      });
    },
    tree: function (b) {
      // dead, leaning, with a crow
      const T = tp(WOODD, 1.5), TD = tp(WOODD, 0.8), TL = tp(WOODD, 2);
      b.cyl(CX, CY, 3, 0, 4, cylMat(WOODD));
      for (let z = 4; z < 30; z++) {
        const w = z < 14 ? 2 : 1, lean = Math.round(z / 11);
        b.rect(CX - 1 + lean, CY - z, w + 1, 1, T); b.set(CX - 1 + lean, CY - z, TL); b.set(CX + w - 1 + lean, CY - z, TD);
      }
      [[1, 14, -9, 24], [2, 17, 11, 27], [2, 22, -6, 33], [3, 25, 9, 36], [3, 29, 2, 40], [-9, 24, -12, 30], [11, 27, 13, 22], [-6, 33, -9, 36], [9, 36, 6, 41]]
        .forEach(function (q) { b.line(CX + q[0], CY - q[1], CX + q[2], CY - q[3], T); });
      b.rect(CX + 9, CY - 30, 4, 3, 0x1c1a24); b.rect(CX + 9, CY - 32, 2, 2, 0x1c1a24); b.set(CX + 13, CY - 29, 0x1c1a24);
      b.set(CX + 8, CY - 31, 0xb89040); b.set(CX + 9, CY - 32, 0xe8e8f0); b.set(CX + 10, CY - 30, 0x3a3848);
    },
    bush: function (b) {
      // thorn bramble
      const D = rgb('#2e3626'), T = tp(WOODD, 1.5);
      b.line(CX - 8, CY - 1, CX - 10, CY - 9, T); b.line(CX + 2, CY - 9, CX + 5, CY - 14, T); b.line(CX + 7, CY - 4, CX + 11, CY - 10, T); b.line(CX - 3, CY - 8, CX - 5, CY - 13, T);
      b.ball(CX - 4, CY - 3, 4, D); b.ball(CX + 4, CY - 3, 4, D); b.ball(CX, CY - 6, 4, rgb('#3a4230'));
      b.set(CX - 2, CY - 7, 0xb0202a); b.set(CX + 4, CY - 4, 0xb0202a); b.set(CX - 6, CY - 3, 0x8a1820);
    },
    fountain: function (b, fr) {
      const W = rgb('#4a5a34');                                  // stagnant, stained
      b.cyl(CX, CY, 14, 0, 6, cylMat(STONE, { brick: 1, top: tp(STONE, 1.15) }));
      b.ell(CX, CY - 6, 11, 5, function (nx, ny) { return tp(W, U.hash((nx * 11) | 0, (ny * 5) | 0, 5 + fr) > 0.8 ? 1.5 : 0.9); });
      b.cyl(CX, CY - 5, 2, 0, 12, cylMat(STONE));
      b.cyl(CX, CY - 5, 5, 12, 14, cylMat(STONE, { top: tp(W, 1.2) }));
      for (let i = 0; i < 4; i++) {
        const s = i < 2 ? -1 : 1, k = (i & 1) ? 2 : 0;
        b.set(CX + s * (6 + k), CY - 14 + ((fr + i) % 3) * 3 + k, 0x9aa878);
        b.set(CX + s * (5 + k), CY - 17 + ((fr + i + 1) % 3) * 3 + k, tp(W, 1.4));
      }
    },
    sign: function (b) {
      b.box(OX, OY, 0.46, 0.46, 0.54, 0.54, 0, 16, mat(WOODD));
      b.box(OX, OY, 0.2, 0.46, 0.8, 0.54, 10, 18, mat(WOOD, { band: 4 }));
      b.rect(18, 42, 5, 1, tp(WOODD, 0.8)); b.rect(19, 45, 4, 1, tp(WOODD, 0.8));
    },
    stall: function (b) {
      b.box(OX, OY, 0.08, 0.3, 0.92, 0.8, 0, 9, mat(WOOD, { band: 3 }));
      const post = mat(WOODD);
      b.box(OX, OY, 0.06, 0.1, 0.14, 0.18, 0, 26, post); b.box(OX, OY, 0.86, 0.1, 0.94, 0.18, 0, 26, post);
      b.box(OX, OY, 0.06, 0.84, 0.14, 0.92, 9, 26, post); b.box(OX, OY, 0.86, 0.84, 0.94, 0.92, 9, 26, post);
      b.box(OX, OY, 0.0, 0.04, 1.0, 0.98, 26, 29, function (face, a) {
        const s = ((a * 5) | 0) & 1;
        return tp(s ? rgb('#7a2824') : rgb('#a89c84'), face === 0 ? 1 : face === 1 ? 0.8 : 0.6);
      });
      b.rect(15, 50, 3, 2, 0xd8a030); b.rect(21, 53, 3, 2, 0x9a3a8a); b.rect(27, 50, 2, 2, 0x4a9a5a);
    },
    well: function (b) {
      b.cyl(CX, CY, 9, 0, 8, cylMat(STONE, { brick: 1, top: tp(STONE, 1.15) }));
      b.ell(CX, CY - 8, 6, 3, function () { return 0x0c1420; });
      b.rect(CX - 9, CY - 24, 2, 17, tp(WOODD, 1.2)); b.rect(CX + 8, CY - 24, 2, 17, tp(WOODD, 0.8));
      b.rect(CX - 11, CY - 27, 23, 3, tp(WOOD, 1)); b.rect(CX - 11, CY - 28, 23, 1, tp(WOOD, 1.3));
      b.rect(CX, CY - 24, 1, 9, 0xa09070);
    },
    tombstone: function (b) {
      b.box(OX, OY, 0.26, 0.42, 0.74, 0.58, 0, 13, mat(STONE, { noise: 0.25 }));
      b.box(OX, OY, 0.34, 0.42, 0.66, 0.58, 13, 15, mat(STONE, { noise: 0.25 }));
      b.rect(20, 46, 1, 6, tp(STONED, 0.7)); b.rect(18, 48, 5, 1, tp(STONED, 0.7));
      b.set(15, 58, tp(LEAF, 1.2)); b.set(16, 59, tp(LEAF, 0.9)); b.set(30, 60, tp(LEAF, 1.1));
    },
    crystal: function (b, fr) {
      const c = rgb('#48d8e8'), L = tp(c, 1.45), D = tp(c, 0.6);
      b.spike(CX - 6, CY + 1, 3, 11, L, D); b.spike(CX + 6, CY + 2, 3, 9, L, D); b.spike(CX, CY + 3, 4, 20, L, D);
      b.set(CX - 1, CY - 12 + fr * 4, 0xffffff); b.set(CX - 7, CY - 5 + fr * 2, 0xffffff);
    },
    campfire: function (b, fr) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.283;
        b.rect(Math.round(CX + Math.cos(a) * 8) - 1, Math.round(CY + Math.sin(a) * 4) - 1, 2, 2, tp(STONE, 0.7 + 0.5 * U.hash(i, 0, 6)));
      }
      b.line(CX - 5, CY + 1, CX + 5, CY - 2, tp(WOODD, 1.2)); b.line(CX - 5, CY - 2, CX + 5, CY + 1, tp(WOODD, 0.9));
      flame(b, CX, CY - 1, 4, fr);
    },
    // iron portcullis filling a doorway; frame 0 / 1 = the two door axes
    gate: function (b, fr) {
      const m = function (face, a, z) { return z >= 23 && face ? tp(IRON, 1.5) : tp(IRON, face === 0 ? 1.3 : face === 1 ? 1 : 0.6); };
      const bar = function (lo, hi, z0, z1) { if (fr === 0) b.box(OX, OY, lo, 0.46, hi, 0.54, z0, z1, m); else b.box(OX, OY, 0.46, lo, 0.54, hi, z0, z1, m); };
      for (let i = 0; i < 5; i++) bar(0.04 + i * 0.21, 0.12 + i * 0.21, 0, 22);
      bar(0, 1, 7, 9); bar(0, 1, 15, 17); bar(0, 1, 21, 24);
    },
    // the player's fallen body, face down, with its dropped blade
    corpse: function (b) {
      b.ell(CX, CY + 1, 11, 5, function (nx, ny) { return nx * nx + ny * ny > 0.6 ? 0x3a0a0c : 0x5a1012; });
      b.rect(CX - 7, CY - 3, 11, 4, 0x4a5466); b.rect(CX - 7, CY - 3, 11, 1, 0x6a7890); b.rect(CX - 9, CY - 1, 3, 2, 0x39404e);
      b.rect(CX + 4, CY - 4, 4, 4, 0xb8a890); b.rect(CX + 4, CY - 4, 4, 1, 0x8a7a5a); b.rect(CX - 11, CY, 3, 2, 0x2a2024);
      b.line(CX - 2, CY + 1, CX + 3, CY + 3, 0x4a5466); b.line(CX + 9, CY + 2, CX + 14, CY - 2, 0xc8ced8); b.set(CX + 8, CY + 3, 0x8a6a30);
    },
    fallback: function (b) {
      b.box(OX, OY, 0.3, 0.3, 0.7, 0.7, 0, 8, mat(STONED, { noise: 0.3 }));
    },
  };
  const FRAMES = { torch: 3, campfire: 3, portal: 4, fountain: 3, waypoint: 2, shrine: 2, crystal: 2, gate: 2 };
  const LIGHT = {   // [radius in tiles, colour key]
    torch: [4.2, 'warm'], campfire: [5, 'warm'], portal: [3, 'violet'], crystal: [2.4, 'cyan'], waypoint: [2.6, 'blue'],
    shrine: [2.6, 'gold'], dungeon_entrance: [2.2, "red"], fountain: [0, "blue"], corpse: [2, "cyan"],
  };
  const NO_OUTLINE = { bones: 1 };
  const cache = Object.create(null);

  U.props = {
    // → { frames: [canvas], light: [radius, key] | null }
    get: function (type) {
      let p = cache[type];
      if (p) return p;
      const fn = BUILD[type] || BUILD.fallback;
      const n = FRAMES[type] || 1, frames = [];
      for (let f = 0; f < n; f++) {
        const b = new U.Buf(48, 72);
        try { fn(b, f); } catch (err) { /* keep whatever was drawn */ }
        if (!NO_OUTLINE[type]) b.outline(0x07060a, 240, 0.22);
        frames.push(b.done());
      }
      p = cache[type] = { frames: frames, light: LIGHT[type] || null };
      return p;
    },
  };

  // ---- light / glow sprites ----
  const LCOL = {
    warm: [255, 176, 96], player: [255, 232, 196], violet: [170, 120, 255], cyan: [110, 230, 240], blue: [110, 170, 255],
    gold: [255, 220, 120], red: [255, 96, 60], green: [120, 255, 140], white: [255, 255, 255],
  };
  const lights = Object.create(null);
  // Stepped radial light for the additive light map.
  U.lightSprite = function (key) {
    if (lights[key]) return lights[key];
    const c = LCOL[key] || (typeof key === 'string' && key[0] === '#' ? U.rgbOf(key) : LCOL.warm), b = new U.Buf(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5) / 32;
        if (d >= 1) continue;
        const q = Math.ceil((1 - d) * 7) / 7, k = Math.min(1, q * q * 1.5);
        b.set(x, y, U.pack(c[0] * k, c[1] * k, c[2] * k));
      }
    }
    return (lights[key] = b.done());
  };
  U.lightKeyFor = function (hex) {
    const c = U.rgbOf(hex);
    if (c[0] > c[1] + 40 && c[0] > c[2] + 40) return c[1] > 150 ? 'warm' : 'red';
    if (c[2] > c[0] + 30 && c[2] >= c[1]) return c[0] > 130 ? 'violet' : 'blue';
    if (c[1] > c[0] + 30) return c[2] > 180 ? 'cyan' : 'green';
    return 'white';
  };

  const beams = Object.create(null);
  // Vertical loot beam, drawn additively. 9 px wide, `h` tall, fading upward.
  U.beam = function (hex, h) {
    const key = hex + h;
    if (beams[key]) return beams[key];
    const c = U.rgbOf(hex), b = new U.Buf(9, h);
    for (let y = 0; y < h; y++) {
      const fy = Math.pow(y / (h - 1), 1.4);
      for (let x = 0; x < 9; x++) {
        const dx = Math.abs(x - 4);
        const k = (dx === 0 ? 1 : dx === 1 ? 0.7 : dx === 2 ? 0.34 : dx === 3 ? 0.14 : 0.05) * fy;
        const w = dx === 0 ? 0.6 * fy : 0;
        b.set(x, y, U.pack((c[0] + (255 - c[0]) * w) * k, (c[1] + (255 - c[1]) * w) * k, (c[2] + (255 - c[2]) * w) * k));
      }
    }
    return (beams[key] = b.done());
  };
  const auras = Object.create(null);
  // Flat ground glow (rarity aura / loot pool), additive.
  U.aura = function (hex, w) {
    const key = hex + w;
    if (auras[key]) return auras[key];
    const c = U.rgbOf(hex), h = w >> 1, b = new U.Buf(w, h);
    b.ell(w / 2 - 0.5, h / 2 - 0.5, w / 2 - 0.5, h / 2 - 0.5, function (nx, ny) {
      const r = Math.hypot(nx, ny), k = r > 0.82 ? 0.75 : r > 0.55 ? 0.3 : 0.14;
      return U.pack(c[0] * k, c[1] * k, c[2] * k);
    });
    return (auras[key] = b.done());
  };

  // ---- projectiles: 16 pre-rotated 20x20 sprites per shape+colour ----
  const PDEF = { arrow: '#d8c8a0', bolt: '#ffe45b', orb: '#b65bff', fireball: '#ff7a1e', shard: '#8fd8ff', spit: '#7ad84a' };
  const projCache = new Map();
  function buildProj(shape, hex) {
    const c = U.rgbOf(hex), L = tp(c, 1.5), M = tp(c, 1), D = tp(c, 0.6), out = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * 6.283, dx = Math.cos(a), dy = Math.sin(a), b = new U.Buf(20, 20);
      const P = function (t, s) { return [Math.round(10 + dx * t - dy * (s || 0)), Math.round(10 + dy * t + dx * (s || 0))]; };
      const ln = function (t0, t1, col, s) { const p = P(t0, s), q = P(t1, s); b.line(p[0], p[1], q[0], q[1], col); };
      const dot = function (t, s, col) { const p = P(t, s); b.set(p[0], p[1], col); };
      switch (shape) {
        case 'arrow':
          ln(-6, 5, 0xc9a36a); dot(6, 0, 0xf0f0f8); dot(5, 1, 0xb0b4c0); dot(5, -1, 0xb0b4c0);
          dot(-6, 1, M); dot(-6, -1, M); dot(-5, 1, M); dot(-5, -1, M);
          break;
        case 'bolt':
          ln(-7, -3, L, 2); ln(-3, 1, L, -2); ln(1, 6, L, 1); ln(-3, -3, L, 0); dot(-3, 2, L); dot(1, -2, L); dot(1, 0, L);
          ln(3, 7, 0xffffff, 1); dot(-5, 2, 0xffffff);
          break;
        case 'fireball':
          dot(-7, 0, 0xa02810); dot(-6, 1, 0xd43c16); dot(-5, -1, 0xd43c16); ln(-5, -2, 0xff7a1e, 1); ln(-5, -2, 0xff7a1e, -1); ln(-4, 0, 0xff8a1e, 0);
          b.ball(P(2)[0], P(2)[1], 3, U.rgbOf('#ff9a2a')); b.rect(P(2)[0] - 1, P(2)[1] - 1, 2, 2, 0xfff0a0);
          break;
        case 'shard':
          ln(-5, 5, M); ln(-2, 3, L, 1); ln(-2, 3, D, -1); dot(6, 0, 0xffffff); dot(5, 0, 0xffffff);
          break;
        case 'spit':
          b.ball(P(1)[0], P(1)[1], 2, c); dot(-3, 0, M); dot(-5, 1, D); dot(2, -1, 0xffffff);
          break;
        default:  // orb
          b.ball(10, 10, 3, c); b.rect(9, 9, 2, 2, 0xffffff); dot(-5, 0, D); dot(-4, 1, M);
      }
      out.push(b.outline(shape === 'bolt' ? D : 0x0b0910, shape === 'bolt' ? 200 : 255).done());
    }
    return out;
  }
  U.projectile = function (shape, color) {
    if (!PDEF[shape]) shape = 'orb';
    const hex = U.safeColor(color, PDEF[shape]);
    const key = shape + hex;
    let s = projCache.get(key);
    if (!s) {
      if (projCache.size > 60) projCache.clear();
      projCache.set(key, (s = buildProj(shape, hex)));
    }
    return s;
  };
  U.projectileColor = function (shape, color) { return U.safeColor(color, PDEF[shape] || PDEF.orb); };
})();
