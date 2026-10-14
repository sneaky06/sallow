// Hand-drawn art and sound overrides (CONTRACT R2.9, R6.4, ART_SPEC.md). At init the engine loads assets/assets.js
// (G.assetList) and then every listed file. A file that loads and has a documented size replaces the matching procedural
// art (or synthesized sound); anything missing, mis-sized or broken is ignored silently. Nothing here ever throws.
// Two art formats are accepted side by side: the R6 high-res format (2x: tile 64x32, character cell 96, one file per
// animation, 5 or 8 directions) and the original 1x format (tile 32x16, 640x80 character sheets).
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._, HD = U.HD;
  // assets/ sits next to src/: derive it from this script's own URL so the harness in tests/ works too
  const self = document.currentScript && document.currentScript.src;
  const BASE = self ? self.replace(/src\/engine\/[^/]*$/, 'assets/') : 'assets/';

  const tiles = Object.create(null), sprites = Object.create(null), hdSprites = Object.create(null), props = Object.create(null),
    icons = Object.create(null), projectiles = Object.create(null), portraits = Object.create(null), fx = Object.create(null),
    ui = Object.create(null), loaded = [];
  let nSprites = 0, nIcons = 0, started = false;

  // image → readable work canvas + its pixels
  function pixels(img) {
    const c = U.makeCanvas(img.width, img.height), x = U.ctx2d(c, true);
    x.drawImage(img, 0, 0);
    return { c: c, d: x.getImageData(0, 0, c.width, c.height).data, w: c.width, k: 1 };
  }
  function empty(px, x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (px.d[(y * px.w + x) * 4 + 3] > 8) return false;
    return true;
  }
  function crop(src, x, y, w, h, k) {
    const c = U.makeCanvas(w, h);
    U.ctx2d(c).drawImage(src, x, y, w, h, 0, 0, w, h);
    if (k > 1) c.hd = k;
    return c;
  }
  function mirror(src) {
    const c = U.makeCanvas(src.width, src.height), x = U.ctx2d(c);
    x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    c.hd = src.hd;
    return c;
  }

  // ---------------------------------------------------------------- tiles: 4 x 14 cells of 32x48 (1x) or 64x96 (2x)
  // Lower wall cut from a full block: keep the top face, drop it onto the bottom `h` rows of the side faces (k = art scale).
  function cutWall(full, h, k) {
    const W = 32 * k, D = 16 * k, c = U.makeCanvas(W, D + h * k), x = U.ctx2d(c);
    x.drawImage(full, 0, -(24 - h) * k);
    for (let py = 0; py < D; py++) {
      const q = py / k, hw = Math.round((q < 8 ? 2 * (q + 1) : 2 * (16 - q)) * k);
      x.clearRect(0, py, W, 1);
      x.drawImage(full, 16 * k - hw, py, hw * 2, 1, 16 * k - hw, py, hw * 2, 1);
    }
    if (k > 1) c.hd = k;
    return c;
  }
  function applyTiles(name, set) {
    const px = tiles[name];
    if (!px || !set) return;
    const k = px.k, CW = 32 * k, CH = 48 * k;
    try {
      // the four cells of a row as canvases (y0/h in 1x px pick the part of the cell); empty cells fall back to column 0
      const row = function (r, y0, h) {
        const out = [];
        for (let v = 0; v < 4; v++) out.push(empty(px, v * CW, r * CH, CW, CH) ? null : crop(px.c, v * CW, r * CH + y0 * k, CW, h * k, k));
        if (!out[0]) return null;
        for (let v = 1; v < 4; v++) if (!out[v]) out[v] = out[0];
        return out;
      };
      const flat = function (r) { return row(r, 32, 16); };
      let a = flat(0);
      if (a) set.floor = [a[0], a[0], a[0], a[1], a[2], a[2], a[3], a[3]];       // matches U.tiles.FLOOR_PICK's variant meanings
      a = row(1, 8, 40);
      if (a) set.wall = [a, a.map(function (c) { return cutWall(c, 16, k); }), a.map(function (c) { return cutWall(c, 8, k); })];
      if (!empty(px, 0, 2 * CH, CW, CH)) {
        const d0 = crop(px.c, 0, 2 * CH + 8 * k, CW, 40 * k, k);
        set.door = [d0, empty(px, CW, 2 * CH, CW, CH) ? mirror(d0) : crop(px.c, CW, 2 * CH + 8 * k, CW, 40 * k, k)];
      }
      if ((a = flat(3))) set.stairsDown = a[0];
      if (!empty(px, 0, 4 * CH, CW, CH)) set.stairsUp = crop(px.c, 0, 4 * CH, CW, CH, k);
      if ((a = flat(5))) set.water = [a, a];
      if ((a = flat(6))) set.grass = a;
      if ((a = flat(7))) set.path = a;
      if ((a = flat(8))) set.lava = [a, a];
      if ((a = flat(9))) set.bridge = a;
      if ((a = flat(10))) set.rubble = a;
      if ((a = flat(11))) set.deepWater = a;
      if ((a = flat(12))) set.deepLava = a;
      if ((a = flat(13))) set.chasm = a;
    } catch (err) { /* keep whatever is already there */ }
  }
  const variantSets = Object.create(null);
  function variantSet(theme, id) {
    const key = theme + '_' + id;
    if (!tiles[key]) return null;
    let s = variantSets[key];
    if (s && s.ver === tiles[key].ver) return s;
    const base = U.tiles.get(theme);
    s = { ver: tiles[key].ver };
    for (const k in base) s[k] = Array.isArray(base[k]) ? base[k].slice() : base[k];
    applyTiles(key, s);
    return (variantSets[key] = s);
  }

  // ---------------------------------------------------------------- 1x character sheets: 16 x 2 cells, cell = width / 16
  function legacyObj(c, cell, ox, oy, top) {
    return {
      c: c, base: c, cell: cell, ox: ox, oy: oy, top: top, hover: false, wide: false, _flash: null, _outl: null,
      flash: function () { return this._flash || (this._flash = U.tint(this.c, '#ffffff')); },
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
  function buildSprite(img) {
    const cell = img.width / 16;
    if (cell !== (cell | 0) || cell < 8 || img.height !== cell * 2) return null;
    const px = pixels(img);
    const c = U.makeCanvas(cell * 16, cell * 4), x = U.ctx2d(c);
    const backEmpty = empty(px, 0, cell, cell * 16, cell);
    for (let r = 0; r < 2; r++) {
      const sr = r === 1 && backEmpty ? 0 : r;
      for (let i = 0; i < 16; i++) {
        const si = empty(px, i * cell, sr * cell, cell, cell) ? 0 : i;       // undrawn frame → idle frame 0
        x.drawImage(px.c, si * cell, sr * cell, cell, cell, i * cell, r * 2 * cell, cell, cell);
        x.save(); x.translate((i + 1) * cell, (r * 2 + 1) * cell); x.scale(-1, 1);
        x.drawImage(px.c, si * cell, sr * cell, cell, cell, 0, 0, cell, cell);
        x.restore();
      }
    }
    const oy = Math.round(cell * 0.85);
    let top = Math.round(cell * 0.5);
    scan: for (let y = 0; y < cell; y++) for (let xx = 0; xx < cell; xx++) if (px.d[(y * px.w + xx) * 4 + 3] > 60) { top = oy - y; break scan; }
    return legacyObj(c, cell, cell >> 1, oy, top);
  }

  // ---------------------------------------------------------------- 2x character animations: <id>/<anim>[_8].png
  // rows = directions (5: s, sw, w, nw, n — or 8 with the _8 suffix), columns = frames, square cells (cell = height / rows).
  // Trailing empty frames are ignored, so a half-painted template still plays what is drawn.
  function hdAnim(img, rows) {
    const cell = img.height / rows;
    if (cell !== (cell | 0) || cell < 16 || img.width % cell || !img.width) return null;
    const px = pixels(img);
    let n = img.width / cell;
    while (n > 1 && empty(px, (n - 1) * cell, 0, cell, cell)) n--;
    let top = Math.round(cell * 0.6);
    const oy = Math.round(cell * 7 / 8);
    scan: for (let y = 0; y < cell; y++) for (let xx = 0; xx < cell; xx++) if (px.d[(y * px.w + xx) * 4 + 3] > 60) { top = oy - y; break scan; }
    return { c: px.c, n: n, rows: rows, cell: cell, top: top };
  }
  // HD sheet object read by render.js / gear.js
  function hdObj() {
    return { hd: true, cell: HD.CELL, ox: HD.OX, oy: HD.OY, top: 60, scale: HD.SCALE, anims: Object.create(null), hover: false, wide: false, ver: 0 };
  }
  function addHdAnim(target, anim, rec) {
    target.anims[anim] = rec;
    if (anim === 'idle' || !target.anims.idle) {
      target.cell = rec.cell; target.ox = rec.cell >> 1; target.oy = Math.round(rec.cell * 7 / 8); target.top = rec.top;
    }
    target.ver++;
  }

  // ---------------------------------------------------------------- per-kind handlers
  const SQ = function (img, min) { return img.width === img.height && img.width >= min; };
  const HANDLERS = {
    tiles: function (name, img) {
      const k = img.width === 256 && img.height === 1344 ? 2 : img.width === 128 && img.height === 672 ? 1 : 0;
      if (!k) return false;
      const px = pixels(img);
      px.k = k; px.ver = (tiles[name] ? tiles[name].ver : 0) + 1;
      tiles[name] = px;
      applyTiles(name, U.tiles.peek(name));
      U.assets.ver++;                        // variant-tinted copies rebuild
      return true;
    },
    sprites: function (name, img, anim) {
      if (anim) {
        const eight = /_8$/.test(anim), a = anim.replace(/_8$/, '');
        if (HD.ANIMS.indexOf(a) < 0) return false;
        const rec = hdAnim(img, eight ? 8 : 5);
        if (!rec) return false;
        if (!hdSprites[name]) { hdSprites[name] = hdObj(); nSprites++; }
        addHdAnim(hdSprites[name], a, rec);
        portraitCache.clear();
        return true;
      }
      const s = buildSprite(img);
      if (!s) return false;
      if (!sprites[name]) nSprites++;
      sprites[name] = s; portraitCache.clear();
      return true;
    },
    props: function (name, img) {
      const k = img.height === 128 ? 2 : img.height === 64 ? 1 : 0, fw = 48 * k;
      if (!k || img.width % fw || !img.width) return false;
      const frames = [];
      for (let i = 0; i < img.width / fw; i++) frames.push(crop(img, i * fw, 0, fw, 64 * k, k));
      if (name === 'gate' && frames.length === 1) frames.push(mirror(frames[0]));   // second frame = the other door axis
      props[name] = frames;
      return true;
    },
    icons: function (name, img) {
      if (!SQ(img, 16)) return false;
      if (!icons[name]) nIcons++;
      icons[name] = crop(img, 0, 0, img.width, img.height, 1);
      iconCache.clear(); urlCache.clear();
      return true;
    },
    projectiles: function (name, img) {
      if (!SQ(img, 16)) return false;
      const s = img.width, d = Math.round(s * 1.25), out = [];
      for (let i = 0; i < 16; i++) {
        const c = U.makeCanvas(d, d), x = U.ctx2d(c);
        x.imageSmoothingEnabled = s > 16;
        x.translate(d / 2, d / 2); x.rotate(i / 16 * 6.2832); x.drawImage(img, -s / 2, -s / 2);
        out.push(c);
      }
      projectiles[name] = out;
      return true;
    },
    // gear overlays (R5.9/R6.4): 1x <key>.png on the character grid, or 2x <key>/<anim>.png like a character animation
    gear: function (name, img, anim) {
      if (!U.gear) return false;
      if (!anim) return U.gear.addOverlay(name, img) !== false;
      const eight = /_8$/.test(anim), a = anim.replace(/_8$/, '');
      const rec = HD.ANIMS.indexOf(a) >= 0 && hdAnim(img, eight ? 8 : 5);
      return !!(rec && U.gear.addOverlayHD(name, a, rec));
    },
    portraits: function (name, img) {
      if (!SQ(img, 48)) return false;
      portraits[name] = crop(img, 0, 0, img.width, img.height, 1);
      portraitCache.clear();
      return true;
    },
    // effect strips: square frames side by side, played once over the effect's duration
    fx: function (name, img) {
      const h = img.height;
      if (h < 16 || img.width % h) return false;
      const frames = [];
      for (let i = 0; i < img.width / h; i++) frames.push(crop(img, i * h, 0, h, h, 1));
      fx[name] = frames;
      return true;
    },
    ui: function (name, img) { ui[name] = crop(img, 0, 0, img.width, img.height, 1); return true; },
  };

  function loadImage(path) {
    const m = /^(tiles|sprites|props|icons|projectiles|portraits|gear|fx|ui)\/([a-z0-9_]+)(?:\/([a-z0-9_]+))?\.png$/.exec(path);
    if (!m) return;
    const img = new Image();
    img.onload = function () { try { if (HANDLERS[m[1]](m[2], img, m[3])) loaded.push(path); } catch (err) { /* procedural art stays */ } };
    img.onerror = function () {};
    img.src = BASE + path;
  }
  function loadPath(path) {
    if (/^sound\/[a-z0-9_]+\.(mp3|m4a|aac|ogg|wav)$/.test(path)) { if (U.audio && U.audio.addFile) U.audio.addFile(path, BASE + path); return; }
    loadImage(path);
  }

  // ---------------------------------------------------------------- lookups used by the renderer
  // icon descriptor → loaded icon name, or null
  function iconName(d) {
    if (!nIcons || !d || typeof d.shape !== 'string') return null;
    const s = d.shape;
    if (s === 'potion' && (icons.potion_hp || icons.potion_mp)) {
      const c = U.rgbOf(d.color);
      if (c[0] > c[2] + 40 && icons.potion_hp) return 'potion_hp';
      if (c[2] > c[0] + 40 && icons.potion_mp) return 'potion_mp';
    }
    return icons[s] ? s : null;
  }
  function sheetNamed(n) { return n ? (hdSprites[n] && hdSprites[n].anims.idle ? hdSprites[n] : sprites[n]) || null : null; }
  // sprite descriptor → class / npc name for portraits (the descriptor itself carries no name)
  function portraitName(d) {
    if (!d || typeof d !== 'object') return null;
    if (typeof d.id === 'string' && (portraits[d.id] || sheetNamed(d.id))) return d.id;     // classId, monsterId or npc_<role>
    const same = function (s) { return s && s.body === d.body && s.color === d.color && s.accent === d.accent && s.weapon === d.weapon; };
    const cls = G.game && G.game.CLASSES;
    if (cls) for (const id in cls) if (same(cls[id].sprite)) return id;
    const ents = (G.state && G.state.entities) || [];
    for (let i = 0; i < ents.length; i++) if (ents[i] && ents[i].type === 'npc' && same(ents[i].sprite)) return 'npc_' + ents[i].role;
    return null;
  }

  const iconCache = new Map(), urlCache = new Map(), portraitCache = new Map();
  const scaled = function (src, size) {
    const c = U.makeCanvas(size, size), x = U.ctx2d(c);
    x.imageSmoothingEnabled = size < src.width || size % src.width !== 0;      // painted art scales smoothly, 1x pixels stay crisp
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, src.width, src.height, 0, 0, size, size);
    return c;
  };

  U.assets = {
    ver: 0,
    applyTiles: applyTiles,
    variantSet: variantSet,
    load: function () {
      if (started) return;
      started = true;
      try {
        const s = document.createElement('script');
        const go = function () {
          const list = Array.isArray(G.assetList) ? G.assetList : [];
          for (let i = 0; i < list.length && i < 3000; i++) if (typeof list[i] === 'string') loadPath(list[i]);
        };
        s.onload = go; s.onerror = function () {};
        s.src = BASE + 'assets.js';
        document.head.appendChild(s);
      } catch (err) { /* no overrides */ }
    },
    // harness hook: feed an image/canvas as if `path` had been loaded → true if accepted
    inject: function (path, img) {
      const m = /^(tiles|sprites|props|icons|projectiles|portraits|gear|fx|ui)\/([a-z0-9_]+)(?:\/([a-z0-9_]+))?\.png$/.exec(path);
      try { const ok = !!(m && HANDLERS[m[1]](m[2], img, m[3])); if (ok) loaded.push(path); return ok; } catch (err) { return false; }
    },
    loaded: function () { return loaded.slice(); },
    // entity → override sheet (classId, then monsterId, then npc_<role>) or null. HD sheets win over 1x sheets.
    spriteFor: function (e) {
      if (!nSprites) return null;
      return sheetNamed(e.classId) || sheetNamed(e.monsterId) || (e.type === 'npc' ? sheetNamed('npc_' + e.role) : null);
    },
    hasIcon: function (d) { return !!iconName(d); },
    sprite: sheetNamed,
    fx: function (type) { return fx[type] || null; },
    ui: function (name) { return ui[name] || null; },
  };

  // ---------------------------------------------------------------- wrap the procedural getters
  const procIcon = E.getIcon, procURL = E.getIconURL, procPortrait = E.getPortrait, procProj = U.projectile, procProp = U.props.get;

  E.getIcon = function (iconDesc, size) {
    const name = iconName(iconDesc);
    if (!name) return procIcon(iconDesc, size);
    size = Math.max(4, Math.min(256, (size | 0) || 32));
    const key = name + '|' + size;
    let c = iconCache.get(key);
    if (!c) iconCache.set(key, (c = size === icons[name].width ? icons[name] : scaled(icons[name], size)));
    return c;
  };
  E.getIconURL = function (iconDesc, size) {
    const name = iconName(iconDesc);
    if (!name) return procURL(iconDesc, size);
    size = Math.max(4, Math.min(256, (size | 0) || 32));
    const key = name + '|' + size;
    let u = urlCache.get(key);
    if (u === undefined) {
      try { u = E.getIcon(iconDesc, size).toDataURL('image/png'); } catch (err) { u = procURL(iconDesc, size); }
      urlCache.set(key, u);
    }
    return u;
  };
  E.getPortrait = function (spriteDesc, size) {
    let name = null;
    try { name = portraitName(spriteDesc); } catch (err) { name = null; }
    const img = name && portraits[name], sheet = name && sheetNamed(name);
    if (!img && !sheet) return procPortrait(spriteDesc, size);
    size = Math.max(8, (size | 0) || 48);
    const key = name + '|' + size;
    let c = portraitCache.get(key);
    if (c) return c;
    if (img) c = scaled(img, size);
    else {                                            // no portrait drawn: frame the head of the hand-drawn sprite
      c = U.makeCanvas(size, size);
      const x = U.ctx2d(c), src = sheet.hd ? sheet.anims.idle.c : sheet.c, cell = sheet.hd ? sheet.anims.idle.cell : sheet.cell;
      const cw = Math.round(cell * 0.6);
      x.imageSmoothingEnabled = !!sheet.hd;
      x.fillStyle = '#120f18'; x.fillRect(0, 0, size, size);
      x.drawImage(src, sheet.ox - (cw >> 1), Math.max(0, sheet.oy - sheet.top - Math.round(cell / 20)), cw, cw, 0, 0, size, size);
    }
    portraitCache.set(key, c);
    return c;
  };
  U.projectile = function (shape, color) { return projectiles[shape] || procProj(shape, color); };
  const propWrap = Object.create(null);
  U.props.get = function (type) {
    const f = props[type];
    if (!f) return procProp(type);
    let w = propWrap[type];
    if (!w || w.frames !== f) w = propWrap[type] = { frames: f, light: procProp(type).light };
    return w;
  };
})();
