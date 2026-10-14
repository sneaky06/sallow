// Engine internals shared by the other engine files: canvas/colour/noise helpers, an ImageData pixel buffer
// with isometric primitives (all art is plotted pixel by pixel, never anti-aliased), and the 5x7 bitmap font.
(function () {
  'use strict';
  const G = window.G;
  const E = G.engine = G.engine || {};
  const U = E._ = {};

  U.makeCanvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w | 0);
    c.height = Math.max(1, h | 0);
    return c;
  };
  // read = true for work canvases that get getImageData (keeps them on the CPU; copy the result to a normal canvas)
  U.ctx2d = function (c, read) {
    const x = read ? c.getContext("2d", { willReadFrequently: true }) : c.getContext("2d");
    x.imageSmoothingEnabled = false;
    return x;
  };

  // ---- colour ----
  const clamp8 = function (v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; };
  const rgbCache = Object.create(null);
  const FALLBACK_RGB = [190, 190, 190];

  // '#rrggbb' | '#rgb' → [r, g, b]. Anything else falls back to grey; never throws.
  U.rgbOf = function (hex) {
    if (typeof hex !== 'string') return FALLBACK_RGB;
    let c = rgbCache[hex];
    if (c) return c;
    let m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (m) {
      const n = parseInt(m[1], 16);
      c = [n >> 16, (n >> 8) & 255, n & 255];
    } else if ((m = /^#?([0-9a-f]{3})$/i.exec(hex))) {
      const n = parseInt(m[1], 16);
      c = [(n >> 8) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17];
    } else {
      c = FALLBACK_RGB;
    }
    rgbCache[hex] = c;
    return c;
  };
  U.pack = function (r, g, b) { return (clamp8(r) << 16) | (clamp8(g) << 8) | clamp8(b); };
  U.hex = function (n) { return '#' + (0x1000000 + (n & 0xffffff)).toString(16).slice(1); };
  // f <= 1 multiplies toward black, f > 1 mixes toward white by (f - 1).
  U.toneP = function (rgb, f) {
    if (f <= 1) return U.pack(rgb[0] * f, rgb[1] * f, rgb[2] * f);
    const t = Math.min(1, f - 1);
    return U.pack(rgb[0] + (255 - rgb[0]) * t, rgb[1] + (255 - rgb[1]) * t, rgb[2] + (255 - rgb[2]) * t);
  };
  U.tone = function (hex, f) { return U.hex(U.toneP(U.rgbOf(hex), f)); };
  U.mixP = function (a, b, t) {
    return U.pack(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  };
  U.safeColor = function (hex, fallback) {
    return (typeof hex === 'string' && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) ? U.hex(U.pack.apply(null, U.rgbOf(hex))) : fallback;
  };

  // ---- noise ----
  U.hash = function (x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  U.vnoise = function (x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = U.hash(xi, yi, s), b = U.hash(xi + 1, yi, s), c = U.hash(xi, yi + 1, s), d = U.hash(xi + 1, yi + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };

  // value noise that tiles with period p (seamless across map tiles)
  U.vnoiseP = function (x, y, s, p, si) {
    const xf = Math.floor(x), yf = Math.floor(y);
    let fx = x - xf, fy = y - yf;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((xf % p) + p) % p, y0 = ((yf % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
    // si: alternate seed for interior lattice points only, so variants differ inside but still match at tile edges
    if (si === undefined) si = s;
    const a = U.hash(x0, y0, x0 && y0 ? si : s), b = U.hash(x1, y0, x1 && y0 ? si : s), c = U.hash(x0, y1, x0 && y1 ? si : s), d = U.hash(x1, y1, x1 && y1 ? si : s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };

  // ---- pixel buffer ----
  function Buf(w, h) {
    this.w = w; this.h = h;
    this.c = U.makeCanvas(w, h);
    this.x = U.ctx2d(this.c);
    this.img = this.x.createImageData(w, h);
    this.d = this.img.data;
  }
  Buf.prototype.set = function (x, y, p, a) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || p < 0) return;
    const i = (y * this.w + x) * 4, d = this.d;
    d[i] = (p >> 16) & 255; d[i + 1] = (p >> 8) & 255; d[i + 2] = p & 255; d[i + 3] = a === undefined ? 255 : a;
  };
  Buf.prototype.rect = function (x, y, w, h, p, a) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, p, a);
  };
  Buf.prototype.line = function (x0, y0, x1, y1, p, a) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 200; n++) {
      this.set(x0, y0, p, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  // Iso box over tile-local u,v in [0,1] and height z (px). (ox, oy) = buffer position of the tile's top corner.
  // col(face, a, b) → packed colour; face 0 = top (a=u, b=v), 1 = left face (a=u, b=z), 2 = right face (a=v, b=z).
  Buf.prototype.box = function (ox, oy, u0, v0, u1, v1, z0, z1, col) {
    const N = 44, eps = 1e-4;
    const nu = Math.ceil((u1 - u0) * N), nv = Math.ceil((v1 - v0) * N);
    for (let i = 0; i < nu; i++) {
      const u = u0 + (i + 0.5) * (u1 - u0) / nu;
      const sx = Math.floor(ox + (u - v1 + eps) * 16), sy = Math.floor(oy + (u + v1 - eps) * 8);
      for (let z = z0; z < z1; z++) this.set(sx, sy - z, col(1, u, z));
    }
    for (let j = 0; j < nv; j++) {
      const v = v0 + (j + 0.5) * (v1 - v0) / nv;
      const sx = Math.floor(ox + (u1 - eps - v) * 16), sy = Math.floor(oy + (u1 - eps + v) * 8);
      for (let z = z0; z < z1; z++) this.set(sx, sy - z, col(2, v, z));
    }
    for (let i = 0; i < nu; i++) {
      const u = u0 + (i + 0.5) * (u1 - u0) / nu;
      for (let j = 0; j < nv; j++) {
        const v = v0 + (j + 0.5) * (v1 - v0) / nv;
        this.set(Math.floor(ox + (u - v) * 16), Math.floor(oy + (u + v) * 8) - z1, col(0, u, v));
      }
    }
  };
  // Filled screen-space ellipse. col(nx, ny) with nx, ny in [-1, 1].
  Buf.prototype.ell = function (cx, cy, a, b, col) {
    for (let y = -Math.ceil(b); y <= Math.ceil(b); y++) {
      for (let x = -Math.ceil(a); x <= Math.ceil(a); x++) {
        const nx = x / (a + 0.3), ny = y / (b + 0.3);
        if (nx * nx + ny * ny <= 1) this.set(cx + x, cy + y, col(nx, ny));
      }
    }
  };
  // Upright cylinder standing on the ground ellipse centred (cx, cy), half-width a. col(face, t, z): face 0 = top, 1 = side.
  Buf.prototype.cyl = function (cx, cy, a, z0, z1, col) {
    const b = a / 2;
    for (let x = -Math.floor(a); x <= Math.floor(a); x++) {
      const t = x / (a + 0.3);
      const yb = Math.round(cy + b * Math.sqrt(Math.max(0, 1 - t * t)));
      for (let z = z0; z < z1; z++) this.set(cx + x, yb - z, col(1, t, z));
    }
    this.ell(cx, cy - z1, a, b, function (nx, ny) { return col(0, nx, ny); });
  };
  // Shaded ball, light from the upper left, three tones.
  Buf.prototype.ball = function (cx, cy, r, rgb, a) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r + r * 0.6) continue;
        const l = (-x - y * 1.3) / (r * 1.6);
        this.set(cx + x, cy + y, U.toneP(rgb, l > 0.45 ? 1.35 : l > -0.25 ? 1 : 0.68), a);
      }
    }
  };
  // Triangle pointing up with its base centred on (cx, baseY): left half colL, right half colR.
  Buf.prototype.spike = function (cx, baseY, hw, h, colL, colR, seed) {
    for (let r = 0; r < h; r++) {
      let half = Math.floor((r + 1) / h * hw);
      if (seed && r < h - 1 && U.hash(r, cx, seed) > 0.6) half -= 1;
      for (let x = -half; x <= half; x++) this.set(cx + x, baseY - h + 1 + r, x < 0 ? colL : colR);
    }
  };
  // 1px outline around everything opaque.
  Buf.prototype.outline = function (p, a, rim) {
    if (rim) U.rimData(this.d, this.w, this.h, rim, rim * 0.5);
    U.outlineData(this.d, this.w, this.h, p === undefined ? 0x0b0910 : p, a === undefined ? 255 : a);
    return this;
  };
  Buf.prototype.done = function () {
    this.x.putImageData(this.img, 0, 0);
    return this.c;
  };
  U.Buf = Buf;

  // Thin rim light: opaque pixels with nothing above (or to the left) are lifted toward a cold white, so silhouettes
  // separate from dark floors by value. Run before outlineData.
  U.rimData = function (d, w, h, top, left) {
    const src = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] >= 90 ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!src[i]) continue;
        const k = (y === 0 || !src[i - w]) ? top : (x === 0 || !src[i - 1]) ? left : 0;
        if (!k) continue;
        const o = i * 4;
        d[o] += (236 - d[o]) * k; d[o + 1] += (240 - d[o + 1]) * k; d[o + 2] += (255 - d[o + 2]) * k;
      }
    }
  };
  U.outlineData = function (d, w, h, p, a) {
    const src = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] >= 90 ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i]) continue;
        if ((x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) || (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])) {
          const k = i * 4;
          d[k] = (p >> 16) & 255; d[k + 1] = (p >> 8) & 255; d[k + 2] = p & 255; d[k + 3] = a;
        }
      }
    }
  };
  U.outlineCanvas = function (c, p, a, rim) {
    const x = U.ctx2d(c, true);
    const img = x.getImageData(0, 0, c.width, c.height);
    if (rim) U.rimData(img.data, c.width, c.height, rim, rim * 0.5);
    U.outlineData(img.data, c.width, c.height, p === undefined ? 0x0b0910 : p, a === undefined ? 255 : a);
    x.putImageData(img, 0, 0);
    return img;
  };
  U.copyCanvas = function (c) {
    const o = U.makeCanvas(c.width, c.height);
    U.ctx2d(o).drawImage(c, 0, 0);
    return o;
  };

  // Flat-colour silhouette of a canvas.
  U.tint = function (c, color) {
    const o = U.makeCanvas(c.width, c.height), x = U.ctx2d(o);
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, o.width, o.height);
    return o;
  };
  // Darkened copy used for explored-but-not-visible tiles and props (cached on the source canvas).
  // U.fogA = how dark (0..1); map variants change it in coarse steps, so each canvas rebuilds at most once per change.
  U.fogA = 0.56;
  U.dim = function (c) {
    if (c._dim && c._dimA === U.fogA) return c._dim;
    const o = c._dim || U.makeCanvas(c.width, c.height), x = U.ctx2d(o);
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, o.width, o.height);
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(4,5,14,' + U.fogA + ')';
    x.fillRect(0, 0, o.width, o.height);
    c._dim = o; c._dimA = U.fogA;
    return o;
  };

  // ---- 5x7 bitmap font (caps only; lower case maps to caps). Proportional. ----
  const GL = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
    D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
    J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
    P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
    V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
    3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
    6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
    9: [14, 17, 17, 15, 1, 2, 12],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '.': [0, 0, 0, 0, 0, 0, 4], ',': [0, 0, 0, 0, 0, 4, 8],
    "'": [4, 4, 0, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0], '-': [0, 0, 0, 14, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    ':': [0, 0, 4, 0, 0, 4, 0], '/': [0, 1, 2, 4, 8, 16, 0], '%': [24, 25, 2, 4, 8, 19, 3], '(': [2, 4, 8, 8, 8, 4, 2],
    ')': [8, 4, 2, 2, 2, 4, 8], '*': [0, 4, 21, 14, 21, 4, 0], '#': [10, 10, 31, 10, 31, 10, 10], '=': [0, 0, 31, 0, 31, 0, 0],
    '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14],
    '&': [12, 18, 20, 8, 21, 18, 13], '_': [0, 0, 0, 0, 0, 0, 31],
  };
  const glyphs = Object.create(null);
  for (const ch in GL) {
    const rows = GL[ch];
    let lo = 5, hi = -1;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y] & (16 >> x)) { if (x < lo) lo = x; if (x > hi) hi = x; }
    const pts = [];
    for (let y = 0; y < 7; y++) for (let x = lo; x <= hi; x++) if (rows[y] & (16 >> x)) pts.push(x - lo, y);
    glyphs[ch] = { w: hi - lo + 1, pts: pts };
  }
  glyphs[' '] = { w: 2, pts: [] };

  const textCache = new Map();
  // Cached canvas of `str` in `color` with a 1px dark outline. Height 9, text baseline box 7.
  U.text = function (str, color) {
    str = String(str == null ? '' : str).toUpperCase();
    const key = color + '|' + str;
    let c = textCache.get(key);
    if (c) return c;
    let w = 0;
    for (let i = 0; i < str.length; i++) w += (glyphs[str[i]] || glyphs['?']).w + 1;
    c = U.makeCanvas(Math.max(1, w + 1), 9);
    const x = U.ctx2d(c);
    for (let pass = 0; pass < 2; pass++) {
      x.fillStyle = pass ? color : '#0b0910';
      let cx = 1;
      for (let i = 0; i < str.length; i++) {
        const g = glyphs[str[i]] || glyphs['?'];
        for (let k = 0; k < g.pts.length; k += 2) {
          if (pass) x.fillRect(cx + g.pts[k], 1 + g.pts[k + 1], 1, 1);
          else x.fillRect(cx + g.pts[k] - 1, g.pts[k + 1], 3, 3);
        }
        cx += g.w + 1;
      }
    }
    if (textCache.size > 500) textCache.clear();
    textCache.set(key, c);
    return c;
  };

  // Soft drop-shadow ellipses by width.
  const shadows = Object.create(null);
  U.shadow = function (w) {
    w = Math.max(4, Math.min(48, (w | 0) & ~1));
    if (shadows[w]) return shadows[w];
    const b = new Buf(w, Math.max(2, w >> 1));
    b.ell((w >> 1) - 0.5, (b.h >> 1) - 0.5, w / 2 - 0.5, b.h / 2 - 0.5, function (nx, ny) { return 0x000000; });
    for (let i = 3; i < b.d.length; i += 4) if (b.d[i]) b.d[i] = 105;
    return (shadows[w] = b.done());
  };
})();
