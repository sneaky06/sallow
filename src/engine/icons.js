// Item / skill icons for every G.C.ICON_SHAPES, authored on a 16x16 grid and scaled with nearest-neighbour.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const WOOD = '#8a5c34', WOODD = '#553820', DARK = '#15111c', WHITE = '#ffffff', PAPER = '#e8d8a8', PAPERD = '#b8a474',
    STEEL = '#c8ced8', STEELD = '#7a8292';

  function tools(x) {
    const g = {
      r: function (px, py, w, h, c) { x.fillStyle = c; x.fillRect(px, py, w, h); },
      d: function (px, py, c) { x.fillStyle = c; x.fillRect(px, py, 1, 1); },
      l: function (x0, y0, x1, y1, c) {
        x.fillStyle = c;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (let n = 0; n < 40; n++) {
          x.fillRect(x0, y0, 1, 1);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      },
      // circle: ring unless fill
      o: function (cx, cy, r, c, fill) {
        x.fillStyle = c;
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
          const d2 = xx * xx + yy * yy;
          if (d2 <= r * r + r * 0.5 && (fill || d2 >= (r - 1) * (r - 1) + (r - 1) * 0.5)) x.fillRect(cx + xx, cy + yy, 1, 1);
        }
      },
    };
    return g;
  }

  // Each: (g, C, D, L, A) → C main, D dark, L light, A accent
  const DRAW = {
    sword: function (g, C, D, L, A) { g.l(12, 2, 5, 9, L); g.l(13, 3, 6, 10, C); g.d(13, 2, WHITE); g.l(3, 7, 8, 12, A); g.l(4, 11, 2, 13, WOOD); g.d(1, 14, A); },
    axe: function (g, C, D, L, A) { g.l(3, 14, 11, 4, WOOD); g.r(8, 2, 5, 6, C); g.r(11, 1, 2, 8, L); g.r(13, 2, 1, 6, WHITE); g.d(8, 2, D); g.d(8, 7, D); g.d(2, 14, A); },
    mace: function (g, C, D, L, A) { g.l(2, 14, 8, 8, WOOD); g.r(8, 2, 6, 6, C); g.r(9, 3, 2, 2, L); g.r(12, 4, 2, 4, D); g.d(7, 1, L); g.d(14, 1, L); g.d(14, 8, D); g.d(7, 8, D); g.d(10, 1, L); g.d(14, 4, L); g.d(1, 14, A); },
    dagger: function (g, C, D, L, A) { g.l(11, 3, 7, 7, L); g.l(12, 4, 8, 8, C); g.d(12, 3, WHITE); g.l(5, 6, 9, 10, A); g.l(5, 10, 4, 11, WOOD); g.d(3, 12, A); },
    bow: function (g, C, D, L, A) {
      for (let t = -6; t <= 6; t++) { g.d(11 - Math.round(t * t / 6), 8 + t, Math.abs(t) > 4 ? D : C); g.d(12 - Math.round(t * t / 6), 8 + t, L); }
      g.l(5, 2, 5, 14, STEEL); g.r(11, 7, 2, 3, A);
    },
    staff: function (g, C, D, L, A) { g.l(2, 14, 10, 5, WOOD); g.l(3, 14, 10, 6, WOODD); g.o(11, 4, 2, C, 1); g.d(10, 3, L); g.d(11, 3, WHITE); g.d(8, 3, A); g.d(13, 7, A); g.d(14, 2, A); },
    wand: function (g, C, D, L, A) { g.l(3, 13, 9, 7, WOOD); g.d(2, 14, A); g.r(10, 4, 3, 3, C); g.d(11, 5, WHITE); g.d(11, 2, L); g.d(11, 8, L); g.d(8, 5, L); g.d(14, 5, L); g.d(13, 3, A); g.d(9, 3, A); },
    shield: function (g, C, D, L, A) {
      g.r(3, 2, 10, 7, C); g.r(4, 9, 8, 2, C); g.r(5, 11, 6, 2, C); g.r(7, 13, 2, 1, C);
      g.r(3, 2, 10, 1, L); g.r(3, 2, 1, 7, L); g.r(12, 3, 1, 6, D); g.r(11, 9, 1, 2, D); g.r(10, 11, 1, 2, D);
      g.r(7, 4, 2, 7, A); g.r(5, 6, 6, 2, A);
    },
    helm: function (g, C, D, L, A) {
      g.r(5, 2, 6, 1, L); g.r(4, 3, 8, 3, C); g.r(3, 5, 10, 5, C); g.r(3, 10, 3, 3, C); g.r(10, 10, 3, 3, C);
      g.r(4, 3, 1, 9, L); g.r(12, 6, 1, 6, D); g.r(5, 7, 6, 1, DARK); g.r(7, 7, 2, 5, D); g.r(7, 1, 2, 1, A); g.r(8, 0, 2, 1, A);
    },
    armor: function (g, C, D, L, A) {
      g.r(4, 3, 8, 10, C); g.r(2, 3, 3, 4, L); g.r(11, 3, 3, 4, C); g.r(6, 2, 4, 2, DARK); g.r(5, 2, 1, 1, C); g.r(10, 2, 1, 1, C);
      g.r(7, 5, 2, 6, A); g.r(4, 11, 8, 1, D); g.r(10, 5, 2, 6, D); g.r(4, 4, 1, 7, L); g.r(5, 13, 6, 1, D);
    },
    gloves: function (g, C, D, L, A) {
      g.r(5, 6, 7, 6, C); g.r(5, 3, 1, 3, C); g.r(7, 2, 1, 4, C); g.r(9, 2, 1, 4, C); g.r(11, 3, 1, 3, C); g.r(3, 7, 2, 3, C);
      g.r(5, 12, 7, 2, A); g.r(5, 6, 1, 6, L); g.r(11, 7, 1, 5, D); g.d(7, 2, L); g.d(9, 2, L);
    },
    boots: function (g, C, D, L, A) { g.r(5, 2, 5, 9, C); g.r(5, 10, 9, 3, C); g.r(4, 13, 11, 1, D); g.r(5, 2, 5, 2, A); g.r(5, 4, 1, 8, L); g.r(9, 5, 1, 5, D); g.r(11, 10, 3, 1, L); },
    belt: function (g, C, D, L, A) { g.r(1, 6, 14, 4, C); g.r(1, 6, 14, 1, L); g.r(1, 9, 14, 1, D); g.r(6, 5, 4, 6, A); g.r(7, 7, 2, 2, DARK); g.d(3, 8, D); g.d(12, 8, D); },
    ring: function (g, C, D, L, A) { g.o(8, 10, 4, C); g.d(5, 8, L); g.d(6, 7, L); g.d(11, 12, D); g.d(10, 13, D); g.r(6, 3, 4, 4, A); g.d(7, 4, WHITE); g.r(6, 6, 4, 1, D); },
    amulet: function (g, C, D, L, A) { g.l(3, 1, 7, 8, STEEL); g.l(13, 1, 9, 8, STEEL); g.r(6, 8, 5, 5, C); g.r(7, 13, 3, 1, C); g.r(6, 8, 5, 1, L); g.r(7, 9, 3, 3, A); g.d(7, 9, WHITE); },
    potion: function (g, C, D, L, A) {
      g.r(6, 1, 4, 1, WOOD); g.r(7, 2, 2, 3, '#c8d8e0'); g.r(5, 5, 6, 2, '#9ab0bc'); g.r(4, 7, 8, 5, C); g.r(5, 12, 6, 2, C); g.r(5, 6, 6, 1, C);
      g.r(4, 7, 1, 5, L); g.d(5, 8, WHITE); g.d(5, 9, WHITE); g.r(11, 8, 1, 4, D); g.r(6, 13, 4, 1, D); g.d(9, 9, L); g.d(8, 11, L);
    },
    scroll: function (g, C, D, L, A) { g.r(3, 4, 10, 8, PAPER); g.r(2, 3, 12, 2, PAPERD); g.r(2, 11, 12, 2, PAPERD); g.d(2, 3, WOODD); g.d(13, 3, WOODD); g.d(2, 12, WOODD); g.d(13, 12, WOODD); g.r(5, 6, 6, 1, C); g.r(5, 8, 4, 1, C); g.r(10, 8, 2, 2, A); },
    gem: function (g, C, D, L, A) {
      g.r(6, 2, 4, 1, L); g.r(4, 3, 8, 1, L); g.r(3, 4, 10, 2, C); g.r(4, 6, 8, 2, C); g.r(5, 8, 6, 2, C); g.r(6, 10, 4, 2, C); g.r(7, 12, 2, 2, D);
      g.r(3, 4, 4, 2, L); g.r(9, 6, 3, 2, D); g.r(8, 8, 3, 2, D); g.r(8, 10, 2, 2, D); g.d(5, 4, WHITE); g.d(6, 3, WHITE);
    },
    gold: function (g, C, D, L, A) {
      g.r(2, 11, 12, 3, D); g.r(3, 9, 10, 3, C); g.r(5, 7, 6, 3, C); g.r(6, 6, 4, 1, L); g.r(3, 9, 3, 1, L); g.r(9, 10, 3, 1, L);
      g.d(4, 12, C); g.d(8, 12, C); g.d(11, 12, C); g.d(6, 8, WHITE); g.d(10, 9, WHITE); g.d(4, 10, WHITE); g.d(13, 6, L); g.d(2, 7, L);
    },
    key: function (g, C, D, L, A) { g.o(4, 7, 3, C, 1); g.r(3, 6, 2, 2, DARK); g.r(7, 7, 7, 2, C); g.r(11, 9, 1, 2, C); g.r(13, 9, 1, 3, C); g.r(7, 7, 7, 1, L); g.d(3, 5, L); },
    rune: function (g, C, D, L, A) {
      g.r(4, 2, 8, 12, '#6a6e7c'); g.r(5, 1, 6, 1, '#6a6e7c'); g.r(5, 14, 6, 1, '#4a4e5a'); g.r(4, 2, 1, 12, '#8a8e9c'); g.r(11, 3, 1, 11, '#4a4e5a');
      g.l(6, 4, 6, 11, C); g.l(6, 4, 9, 6, C); g.l(9, 6, 6, 8, C); g.l(6, 8, 9, 11, L);
    },
    orb: function (g, C, D, L, A) { g.o(8, 7, 5, C, 1); g.o(8, 7, 5, D); g.r(5, 4, 3, 2, L); g.d(5, 4, WHITE); g.d(10, 9, A); g.d(9, 10, A); g.r(5, 13, 6, 2, A); g.r(6, 12, 4, 1, A); },
    tome: function (g, C, D, L, A) { g.r(3, 2, 10, 12, C); g.r(3, 2, 2, 12, D); g.r(12, 3, 1, 10, PAPER); g.r(5, 13, 8, 1, PAPERD); g.r(5, 2, 8, 1, L); g.r(7, 5, 3, 3, A); g.d(8, 6, WHITE); g.r(6, 10, 5, 1, A); },
    slash: function (g, C, D, L, A) { g.l(2, 12, 5, 6, C); g.l(5, 6, 12, 2, L); g.l(3, 12, 6, 7, L); g.l(6, 7, 12, 3, WHITE); g.l(5, 12, 8, 9, D); g.l(8, 9, 12, 6, C); g.d(13, 2, WHITE); g.d(14, 1, L); },
    whirl: function (g, C, D, L, A) { g.o(8, 8, 6, C); g.r(7, 1, 4, 2, 'rgba(0,0,0,0)'); g.o(8, 8, 3, L); g.d(8, 8, WHITE); g.l(12, 3, 14, 5, WHITE); g.l(4, 13, 2, 11, WHITE); g.d(14, 8, L); g.d(2, 8, L); g.d(11, 5, A); g.d(5, 11, A); },
    fire: function (g, C, D, L, A) {
      g.r(7, 2, 2, 2, C); g.r(6, 4, 4, 2, C); g.r(5, 6, 6, 3, C); g.r(4, 8, 8, 4, C); g.r(5, 12, 6, 2, C); g.d(10, 4, C); g.d(5, 5, C); g.d(11, 6, D); g.d(3, 9, D);
      g.r(7, 7, 2, 2, L); g.r(6, 9, 4, 3, L); g.r(7, 11, 2, 2, WHITE); g.d(8, 5, L);
    },
    ice: function (g, C, D, L, A) {
      g.l(8, 1, 8, 14, L); g.l(2, 8, 14, 8, L); g.l(4, 4, 12, 12, C); g.l(12, 4, 4, 12, C);
      g.d(7, 2, L); g.d(9, 2, L); g.d(7, 13, L); g.d(9, 13, L); g.d(3, 7, L); g.d(3, 9, L); g.d(13, 7, L); g.d(13, 9, L); g.d(8, 8, WHITE);
    },
    bolt: function (g, C, D, L, A) { g.l(10, 1, 5, 7, L); g.l(11, 1, 6, 7, C); g.l(5, 7, 10, 7, L); g.l(10, 7, 5, 14, L); g.l(11, 7, 6, 14, C); g.d(10, 1, WHITE); g.d(5, 14, WHITE); g.d(8, 7, WHITE); },
    poison: function (g, C, D, L, A) {
      g.r(7, 2, 2, 2, C); g.r(6, 4, 4, 2, C); g.r(5, 6, 6, 2, C); g.r(4, 8, 8, 4, C); g.r(5, 12, 6, 2, C);
      g.r(5, 8, 1, 3, L); g.d(6, 6, L); g.r(10, 9, 1, 3, D); g.r(6, 9, 2, 2, DARK); g.r(9, 9, 1, 2, DARK); g.d(13, 4, L); g.d(2, 5, L); g.d(12, 12, L);
    },
    heal: function (g, C, D, L, A) { g.r(6, 2, 4, 12, C); g.r(2, 6, 12, 4, C); g.r(6, 2, 1, 12, L); g.r(2, 6, 12, 1, L); g.r(9, 10, 1, 4, D); g.r(10, 9, 4, 1, D); g.r(7, 7, 2, 2, WHITE); },
    buff: function (g, C, D, L, A) {
      g.r(7, 7, 2, 7, C); g.r(7, 2, 2, 1, L); g.r(6, 3, 4, 1, L); g.r(5, 4, 6, 1, C); g.r(4, 5, 8, 1, C); g.r(3, 6, 10, 1, C); g.r(7, 2, 1, 12, L);
      g.d(2, 11, A); g.d(3, 10, A); g.d(4, 11, A); g.d(11, 11, A); g.d(12, 10, A); g.d(13, 11, A); g.d(3, 13, A); g.d(12, 13, A);
    },
    arrow: function (g, C, D, L, A) { g.l(3, 12, 11, 4, WOOD); g.r(10, 2, 4, 1, STEEL); g.r(13, 2, 1, 4, STEEL); g.d(12, 3, WHITE); g.d(11, 3, STEEL); g.d(12, 4, STEEL); g.l(2, 11, 4, 13, C); g.d(2, 13, C); g.d(1, 12, L); g.d(3, 14, L); },
    multishot: function (g, C, D, L, A) {
      g.l(3, 14, 3, 4, WOOD); g.l(8, 14, 8, 3, WOOD); g.l(13, 14, 13, 4, WOOD);
      for (let i = 0; i < 3; i++) { const x = 3 + i * 5, y = i === 1 ? 1 : 2; g.d(x, y, WHITE); g.r(x - 1, y + 1, 3, 1, STEEL); g.d(x - 1, 13, C); g.d(x + 1, 13, C); g.d(x - 1, 14, L); g.d(x + 1, 14, L); }
    },
    trap: function (g, C, D, L, A) {
      g.r(2, 11, 12, 2, STEELD); g.r(2, 11, 12, 1, STEEL); g.r(6, 10, 4, 2, A);
      for (let i = 0; i < 4; i++) { g.r(2 + i * 3, 8, 2, 3, C); g.d(2 + i * 3 + (i < 2 ? 1 : 0), 6, L); g.d(2 + i * 3 + (i < 2 ? 1 : 0), 7, L); }
      g.r(3, 13, 2, 1, STEELD); g.r(11, 13, 2, 1, STEELD);
    },
    skull: function (g, C, D, L, A) {
      g.r(4, 2, 8, 7, C); g.r(5, 1, 6, 1, C); g.r(5, 9, 6, 3, C); g.r(4, 2, 1, 6, L); g.r(5, 1, 5, 1, L); g.r(11, 3, 1, 6, D);
      g.r(5, 5, 2, 2, DARK); g.r(9, 5, 2, 2, DARK); g.d(7, 8, DARK); g.d(8, 8, DARK); g.d(6, 11, DARK); g.d(8, 11, DARK); g.d(10, 11, DARK); g.d(5, 5, A); g.d(9, 5, A);
    },
    summon: function (g, C, D, L, A) { g.o(8, 8, 6, C); g.l(8, 3, 4, 11, A); g.l(4, 11, 12, 11, A); g.l(12, 11, 8, 3, A); g.r(7, 7, 2, 3, L); g.d(8, 6, WHITE); g.d(2, 8, L); g.d(14, 8, L); g.d(8, 14, L); },
    leap: function (g, C, D, L, A) { g.l(2, 12, 5, 5, C); g.l(5, 5, 10, 4, L); g.l(10, 4, 13, 9, C); g.r(12, 9, 3, 1, WHITE); g.d(13, 10, WHITE); g.d(13, 8, L); g.d(11, 8, L); g.r(1, 14, 14, 1, D); g.d(3, 13, A); g.d(12, 13, A); g.d(13, 12, A); },
    aura: function (g, C, D, L, A) { g.o(8, 8, 6, C); g.o(8, 8, 3, L); g.d(8, 8, WHITE); g.d(8, 0, A); g.d(8, 15, A); g.d(0, 8, A); g.d(15, 8, A); },
    star: function (g, C, D, L, A) { g.r(7, 1, 2, 14, C); g.r(1, 7, 14, 2, C); g.r(5, 5, 6, 6, C); g.r(6, 6, 4, 4, L); g.r(7, 7, 2, 2, WHITE); g.d(4, 4, L); g.d(11, 4, L); g.d(4, 11, L); g.d(11, 11, L); g.d(7, 1, L); g.d(1, 7, L); },
    fallback: function (g, C, D, L, A) { g.r(3, 3, 10, 10, C); g.r(3, 3, 10, 1, L); g.r(3, 3, 1, 10, L); g.r(12, 4, 1, 9, D); g.r(6, 5, 4, 1, WHITE); g.r(9, 6, 1, 2, WHITE); g.r(7, 8, 2, 1, WHITE); g.d(7, 10, WHITE); },
  };

  const base = new Map(), sized = new Map(), urls = new Map();
  function keyOf(d) { return d.shape + '|' + d.color + '|' + d.accent; }
  function base16(d) {
    const key = keyOf(d);
    let c = base.get(key);
    if (c) return c;
    const C = U.safeColor(d.color, '#a8a8b4');
    const A = U.safeColor(d.accent, d.shape === 'sword' || d.shape === 'dagger' || d.shape === 'ring' ? '#e8c040' : U.tone(C, 1.5));
    c = U.makeCanvas(16, 16);
    const x = U.ctx2d(c, true), fn = DRAW[d.shape] || DRAW.fallback;
    try { fn(tools(x), C, U.tone(C, 0.6), U.tone(C, 1.4), A); } catch (err) { /* partial icon is fine */ }
    if (d.shape === 'whirl') { x.clearRect(9, 1, 3, 2); x.clearRect(4, 13, 3, 2); }
    U.outlineCanvas(c, 0x0b0910, 255);
    c = U.copyCanvas(c);
    if (base.size > 400) base.clear();
    base.set(key, c);
    return c;
  }

  E.getIcon = function (iconDesc, size) {
    const d = iconDesc && typeof iconDesc === 'object' ? iconDesc : { shape: 'fallback' };
    size = Math.max(4, Math.min(256, (size | 0) || 32));
    if (size === 16) return base16(d);
    const key = keyOf(d) + '|' + size;
    let c = sized.get(key);
    if (c) return c;
    c = U.makeCanvas(size, size);
    U.ctx2d(c).drawImage(base16(d), 0, 0, 16, 16, 0, 0, size, size);
    if (sized.size > 400) sized.clear();
    sized.set(key, c);
    return c;
  };

  E.getIconURL = function (iconDesc, size) {
    const d = iconDesc && typeof iconDesc === 'object' ? iconDesc : { shape: 'fallback' };
    size = Math.max(4, Math.min(256, (size | 0) || 32));
    const key = keyOf(d) + '|' + size;
    let u = urls.get(key);
    if (u) return u;
    try { u = E.getIcon(d, size).toDataURL('image/png'); } catch (err) { u = ''; }
    if (urls.size > 400) urls.clear();
    urls.set(key, u);
    return u;
  };
})();
