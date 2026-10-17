// Hand-drawn art and sound overrides (CONTRACT R2.9, R6.4, R17, ART_SPEC.md, docs/ART_CATALOG.md, docs/SOUND_DESIGN.md).
// At init the engine reads assets/assets.js (G.assetList) and indexes every listed file WITHOUT fetching it; art is then
// fetched, decoded and released on demand (see "memory model" below). A file that loads and has a documented size replaces
// the matching procedural art (or synthesized sound); anything missing, mis-sized or unknown is ignored with ONE console
// warning that names the file. Nothing here ever throws.
//
// assets.js entries: 'sprites/goblin/walk.png'  |  { file: 'sprites/goblin/walk.png', fps: 12, loop: true }   (no cap on the count)
//   fps  = playback rate of that file's frames (characters, props, fx strips); without it the engine's default timing is used
//   loop = false makes a normally looping animation (idle/walk) play once and hold its last frame
//   stride = walk only: art px of ground one loop of the walk covers (R17; default: from fps, else ~89 px per 96 cell)
//
// Accepted paths (all lower-case snake_case; every other path is rejected with a warning):
//   tiles/<theme>[_<variantId>].png            sprites/<id>.png (1x sheet)    sprites/<id>/<anim>[_8|_p2|_p3].png
//   props/<type>[_<theme>].png                 gear/<key>.png (1x)            gear/<key>/<anim>[_8].png
//   icons/<shape>.png                          icons/<group>/<key>.png  (group: items uniques gems blood materials consumables
//                                                                        relics skills perks class status)
//   projectiles/<shape>.png  portraits/<name>.png  fx/<type>[_<element|rarity>].png
//   ui/<name>.png                              ui/<folder>/<name>.png (folder: appicon buttons frames hud inventory map markers
//                                                                       perks rarity skills splash)
//   sound/[folder/...]<name>.mp3|m4a|aac|ogg|wav          (audio.js; the name is the basename, the folder is the load bank)
//
// Memory model (iOS Safari holds ~256 MB of canvas memory in total):
//   * icons, portraits, projectiles and the joystick pair are small: fetched in the background right after the list is read.
//   * everything else (character sheets, gear overlays, props, fx strips, tilesets, the rest of ui/) is a LAZY UNIT: fetched and
//     decoded the first time the game asks for it (or when the floor's entities/props are scanned, twice a second), kept
//     while used, and released when it has not been touched for a while, on leaving a floor, or when the decoded total
//     passes BUDGET. Until a unit is ready the procedural art is drawn, so a first sighting can pop in one frame late.
//   * tile sheets are cut into small cell canvases and the big sheet canvas is dropped right after.
//   * no whole-sheet getImageData copies are kept: alpha probes read one column or a thin strip at a time.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._, HD = U.HD;
  // assets/ sits next to src/: derive it from this script's own URL so the harness in tests/ works too
  const self = document.currentScript && document.currentScript.src;
  const BASE = self ? self.replace(/src\/engine\/[^/]*$/, 'assets/') : 'assets/';
  let DEBUG = false;
  try { DEBUG = /[?&]assetdebug=1\b/.test(window.location.search); } catch (err) { DEBUG = false; }

  const tiles = Object.create(null), sprites = Object.create(null), hdSprites = Object.create(null), props = Object.create(null),
    icons = Object.create(null), projectiles = Object.create(null), portraits = Object.create(null), fx = Object.create(null),
    ui = Object.create(null), loaded = [], rejected = [];
  let nSprites = 0, nIcons = 0, started = false, clock = Date.now() / 1000;

  const ICON_GROUPS = ['items', 'uniques', 'gems', 'blood', 'materials', 'consumables', 'relics', 'skills', 'perks', 'class', 'status'];
  const UI_FOLDERS = ['appicon', 'buttons', 'frames', 'hud', 'inventory', 'map', 'markers', 'perks', 'rarity', 'skills', 'splash'];
  const THEMES = ['town', 'crypt', 'caves', 'inferno', 'abyss'];
  const BUDGET = 160 * 1024 * 1024;           // decoded bytes of lazy units before the least recently used are released
  const IN_USE = 8;                           // seconds a unit counts as in use after its last touch
  const MAX_ACTIVE = 6;                       // concurrent image fetches

  function warn(path, why) {
    if (rejected.some(function (r) { return r.path === path; })) return;
    rejected.push({ path: path, why: why });
    try { console.warn('[assets] ' + path + ': ' + why); } catch (err) { /* no console */ }
  }
  function info(msg) { if (DEBUG) { try { console.info('[assets] ' + msg); } catch (err) { /* no console */ } } }

  // ---------------------------------------------------------------- pixel helpers (no whole-image copies)
  // image → a normal (GPU-backed) canvas; probes read thin slices through its context
  function pixels(img) {
    const c = U.makeCanvas(img.width, img.height), x = U.ctx2d(c);
    x.drawImage(img, 0, 0);
    return { c: c, x: x, w: c.width, k: 1 };
  }
  function empty(px, x0, y0, w, h) {
    const d = px.x.getImageData(x0, y0, w, h).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) return false;
    return true;
  }
  // y of the first row holding a pixel with alpha > a, or -1; reads 8-row strips from the top and stops at the first hit
  function firstRow(px, a) {
    const w = px.c.width, h = px.c.height;
    for (let y0 = 0; y0 < h; y0 += 8) {
      const hh = Math.min(8, h - y0), d = px.x.getImageData(0, y0, w, hh).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > a) return y0 + (((i - 3) >> 2) / w | 0);
    }
    return -1;
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
  function bytesOf(c) { return c ? c.width * c.height * 4 : 0; }
  // hand a canvas's memory back (iOS frees it when the backing store shrinks; the 1x1 stays valid for any stale drawImage)
  function shrink(c) { if (c && c.width > 1) { try { c.width = 1; c.height = 1; } catch (err) { /* ignore */ } } }

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
    if (!px || !set || px.baked) return;
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
      bake(px);
    } catch (err) { /* keep whatever is already there */ }
  }
  // everything the game needs is now in the set's own small canvases: drop the 1.4 MB sheet
  function bake(px) { if (!px.baked) { px.baked = true; shrink(px.c); } }
  const variantSets = Object.create(null);
  function variantSet(theme, id) {
    const key = theme + '_' + id;
    want('tiles', key);
    if (!tiles[key]) return null;
    let s = variantSets[key];
    if (s && s.ver === tiles[key].ver) return s;
    if (tiles[key].baked) return s || null;
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
    const y = firstRow({ c: px.c, x: px.x }, 60);
    if (y >= 0) top = oy - y;
    shrink(px.c);
    return legacyObj(c, cell, cell >> 1, oy, top);
  }

  // ---------------------------------------------------------------- 2x character animations: <id>/<anim>[_8].png
  // rows = directions (5: s, sw, w, nw, n — or 8 with the _8 suffix), columns = frames, square cells (cell = height / rows).
  // Any frame count works. Trailing frames that are empty in EVERY direction are ignored, so a half-painted template still
  // plays what is drawn.
  function hdAnim(img, rows) {
    const cell = img.height / rows;
    if (cell !== (cell | 0) || cell < 16 || img.width % cell || !img.width) return null;
    const px = pixels(img);
    let n = img.width / cell;
    while (n > 1 && empty(px, (n - 1) * cell, 0, cell, img.height)) n--;
    let top = Math.round(cell * 0.6);
    const oy = Math.round(cell * 7 / 8);
    const y = firstRow(px, 60);
    if (y >= 0) top = oy - y;
    return { c: px.c, n: n, rows: rows, cell: cell, top: top };
  }
  // HD sheet object read by render.js / gear.js
  let hdVer = 0;
  function hdObj() {
    return { hd: true, cell: HD.CELL, ox: HD.OX, oy: HD.OY, top: 60, scale: HD.SCALE, anims: Object.create(null), hover: false, wide: false, ver: 0, phased: false };
  }
  function addHdAnim(target, anim, rec) {
    target.anims[anim] = rec;
    if (/_p\d$/.test(anim)) target.phased = true;
    else if (anim === 'idle' || !target.anims.idle) {
      target.cell = rec.cell; target.ox = rec.cell >> 1; target.oy = Math.round(rec.cell * 7 / 8); target.top = rec.top;
    }
    target.ver = ++hdVer;                 // unique across reloads, so a sheet composed from a released copy is never reused
  }
  // 'walk_8' / 'walk_p2' / 'walk_p2_8' → { anim: 'walk', key: 'walk_p2', rows: 8 } or null
  function animOf(s) {
    const m = /^([a-z]+?)(?:_p([23]))?(_8)?$/.exec(s);
    if (!m || HD.ANIMS.indexOf(m[1]) < 0) return null;
    return { base: m[1], key: m[1] + (m[2] ? '_p' + m[2] : ''), rows: m[3] ? 8 : 5, phase: !!m[2] };
  }
  function timing(rec, meta) {
    if (meta && meta.fps > 0) rec.fps = meta.fps;
    if (meta && meta.loop === false) rec.loop = false;
    if (meta && meta.stride > 0) rec.stride = meta.stride;        // walk: art px of ground one loop covers (R17)
    return rec;
  }

  // ---------------------------------------------------------------- per-kind handlers: (name, img, anim, unit, meta) → true | reason
  const SQ = function (img, min) { return img.width === img.height && img.width >= min; };
  const HANDLERS = {
    tiles: function (name, img, anim, u) {
      const k = img.width === 256 && img.height === 1344 ? 2 : img.width === 128 && img.height === 672 ? 1 : 0;
      if (!k) return 'wrong size ' + img.width + 'x' + img.height + ' (a tile sheet is 256x1344, or 128x672 for the 1x format)';
      const px = pixels(img);
      px.k = k; px.ver = (tiles[name] ? tiles[name].ver : 0) + 1;
      tiles[name] = px;
      const set = U.tiles.peek(name);
      if (set) applyTiles(name, set);
      U.assets.ver++;                        // variant-tinted copies rebuild
      return true;
    },
    sprites: function (name, img, anim, u, meta) {
      if (anim) {
        const a = animOf(anim);
        if (!a) return 'unknown animation "' + anim + '" (idle walk attack cast hit die, optional _8 / _p2 / _p3)';
        const rec = hdAnim(img, a.rows);
        if (!rec) return 'wrong size ' + img.width + 'x' + img.height + ' (' + a.rows + ' rows of square cells, height divisible by ' + a.rows + ', width a whole number of cells, cell >= 16)';
        if (!hdSprites[name]) { hdSprites[name] = hdObj(); nSprites++; }
        addHdAnim(hdSprites[name], a.key, timing(rec, meta));
        u.bytes += bytesOf(rec.c);
        portraitCache.clear();
        return true;
      }
      const s = buildSprite(img);
      if (!s) return 'wrong size ' + img.width + 'x' + img.height + ' (a 1x sheet is 16 columns x 2 rows of square cells, e.g. 640x80)';
      if (!sprites[name]) nSprites++;
      sprites[name] = s; portraitCache.clear();
      u.bytes += bytesOf(s.c);
      return true;
    },
    props: function (name, img, anim, u, meta) {
      const k = img.height === 128 ? 2 : img.height === 64 ? 1 : 0, fw = 48 * k;
      if (!k || img.width % fw || !img.width) return 'wrong size ' + img.width + 'x' + img.height + ' (frames of 96x128, or 48x64 for the 1x format, side by side)';
      const frames = [];
      for (let i = 0; i < img.width / fw; i++) frames.push(crop(img, i * fw, 0, fw, 64 * k, k));
      if (name === 'gate' && frames.length === 1) frames.push(mirror(frames[0]));   // second frame = the other door axis
      if (meta && meta.fps > 0) frames.fps = meta.fps;
      props[name] = frames;
      u.bytes += frames.length * fw * 64 * k * 4;
      return true;
    },
    icons: function (name, img, anim, u) {
      if (!SQ(img, 16)) return 'wrong size ' + img.width + 'x' + img.height + ' (a square, 64x64 recommended, at least 16)';
      if (!icons[name]) { nIcons++; const leaf = name.slice(name.lastIndexOf('/') + 1); if (!iconByLeaf[leaf] || name.indexOf('/') < 0) iconByLeaf[leaf] = name; }
      icons[name] = crop(img, 0, 0, img.width, img.height, 1);
      iconsDirty();
      return true;
    },
    projectiles: function (name, img) {
      if (!SQ(img, 16)) return 'wrong size ' + img.width + 'x' + img.height + ' (a square, 32x32 recommended, at least 16)';
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
    gear: function (name, img, anim, u, meta) {
      if (!U.gear) return 'gear overlays are not available';
      if (!anim) {
        if (U.gear.addOverlay(name, img) === false) return 'wrong size ' + img.width + 'x' + img.height + ' (a 1x overlay is 16 columns x 2 rows of square cells, like the 1x character sheet)';
        u.bytes += img.width * img.height * 8;
        return true;
      }
      const a = animOf(anim);
      if (!a || a.phase) return 'unknown animation "' + anim + '" (idle walk attack cast hit die, optional _8)';
      const rec = hdAnim(img, a.rows);
      if (!rec) return 'wrong size ' + img.width + 'x' + img.height + ' (same grid as the base body: ' + a.rows + ' rows of square cells)';
      if (!U.gear.addOverlayHD(name, a.base, timing(rec, meta))) return 'overlay rejected';
      u.bytes += bytesOf(rec.c);
      return true;
    },
    portraits: function (name, img) {
      if (!SQ(img, 48)) return 'wrong size ' + img.width + 'x' + img.height + ' (a square, 96x96 recommended, at least 48)';
      portraits[name] = crop(img, 0, 0, img.width, img.height, 1);
      portraitCache.clear();
      return true;
    },
    // effect strips: square frames side by side, played once over the effect's duration (or n / fps seconds with an fps entry)
    fx: function (name, img, anim, u, meta) {
      const h = img.height;
      if (h < 16 || img.width % h) return 'wrong size ' + img.width + 'x' + img.height + ' (square frames side by side, at least 16 px, e.g. 128 high)';
      const frames = [];
      for (let i = 0; i < img.width / h; i++) frames.push(crop(img, i * h, 0, h, h, 1));
      if (meta && meta.fps > 0) frames.fps = meta.fps;
      fx[name] = frames;
      u.bytes += img.width * h * 4;
      return true;
    },
    ui: function (name, img, anim, u) { ui[name] = crop(img, 0, 0, img.width, img.height, 1); u.bytes += img.width * img.height * 4; return true; },
  };
  const UNLOAD = {
    sprites: function (name) {
      const h = hdSprites[name], s = sprites[name];
      if (h) { for (const a in h.anims) shrink(h.anims[a].c); delete hdSprites[name]; nSprites--; }
      if (s) { shrink(s.c); delete sprites[name]; nSprites--; }
      portraitCache.clear();
    },
    gear: function (name) { if (U.gear && U.gear.removeOverlay) U.gear.removeOverlay(name); },
    props: function (name) { const f = props[name]; if (f) { f.forEach(shrink); delete props[name]; } },
    fx: function (name) { const f = fx[name]; if (f) { f.forEach(shrink); delete fx[name]; } },
    ui: function (name) { shrink(ui[name]); delete ui[name]; },
  };

  // ---------------------------------------------------------------- manifest: path → record → unit
  const ART_RE = /^(tiles|sprites|props|icons|projectiles|portraits|gear|fx|ui)\/((?:[a-z0-9_]+\/)*[a-z0-9_]+)\.png$/;
  const LAZY = { sprites: 1, gear: 1, props: 1, fx: 1, tiles: 1, ui: 1 };
  const units = { tiles: Object.create(null), sprites: Object.create(null), props: Object.create(null), icons: Object.create(null), projectiles: Object.create(null),
    portraits: Object.create(null), gear: Object.create(null), fx: Object.create(null), ui: Object.create(null) };
  const recs = Object.create(null);          // path → record
  const iconByLeaf = Object.create(null);    // 'heavy_helm_1' → 'items/heavy_helm_1'
  const themedProps = Object.create(null);
  let nListed = 0, nSound = 0, lazyBytes = 0, lazyUnits = 0;

  // → { kind, name, anim } or a string (why the path is not usable)
  function parseArt(path) {
    const m = ART_RE.exec(path);
    if (!m) return 'not a recognised asset path (expected <folder>/<name>.png with lower-case snake_case names; see ART_SPEC.md)';
    const kind = m[1], seg = m[2].split('/');
    const one = function () { return seg.length === 1 ? { kind: kind, name: seg[0], anim: null } : kind + '/ takes files directly in the folder (no sub-folder)'; };
    switch (kind) {
      case 'tiles': case 'props': case 'projectiles': case 'portraits': case 'fx': return one();
      case 'sprites': case 'gear':
        if (seg.length === 1) return { kind: kind, name: seg[0], anim: null };
        if (seg.length === 2) return { kind: kind, name: seg[0], anim: seg[1] };
        return kind + '/<id>/<anim>.png has one level of sub-folder';
      case 'icons':
        if (seg.length === 1) return { kind: kind, name: seg[0], anim: null };
        if (seg.length === 2 && ICON_GROUPS.indexOf(seg[0]) >= 0) return { kind: kind, name: seg[0] + '/' + seg[1], anim: null };
        return 'unknown icon folder "' + seg[0] + '" (icons/ or one of ' + ICON_GROUPS.join(' ') + ')';
      case 'ui':
        if (seg.length === 1) return { kind: kind, name: seg[0], anim: null };
        if (seg.length === 2 && UI_FOLDERS.indexOf(seg[0]) >= 0) return { kind: kind, name: seg[0] + '/' + seg[1], anim: null };
        return 'unknown ui folder "' + seg[0] + '" (ui/ or one of ' + UI_FOLDERS.join(' ') + ')';
    }
    return 'unsupported';
  }
  function isEager(r) { return !LAZY[r.kind] || (r.kind === 'ui' && /^joystick_/.test(r.name)); }

  // entries → records; returns the list of problems
  function register(list) {
    nListed = 0;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      let path, meta = null;
      if (typeof it === 'string') path = it;
      else if (it && typeof it === 'object' && typeof (it.file || it.path) === 'string') {
        path = it.file || it.path;
        meta = {};
        if (typeof it.fps === 'number' && it.fps > 0 && it.fps <= 120) meta.fps = it.fps; else if (it.fps != null) warn(path, 'fps must be a number between 0 and 120 - ignored');
        if (it.loop === false) meta.loop = false;
        if (typeof it.stride === 'number' && it.stride > 0 && it.stride <= 2000) meta.stride = it.stride; else if (it.stride != null) warn(path, 'stride must be a number of pixels between 0 and 2000 - ignored');
      } else { warn('assets.js entry #' + i, 'expected a path string or { file, fps, loop, stride } - ignored'); continue; }
      if (recs[path]) continue;
      nListed++;
      if (/^sound\//.test(path)) { nSound++; if (U.audio && U.audio.addFile) U.audio.addFile(path, BASE + path); continue; }
      const p = parseArt(path);
      if (typeof p === 'string') { warn(path, p); continue; }
      const r = { path: path, kind: p.kind, name: p.name, anim: p.anim, meta: meta, st: 0 };
      recs[path] = r;
      // a unit = everything one thing needs: a sprite's animations, a gear key's animations, one icon, one tile sheet ...
      const group = units[p.kind];
      const u = group[p.name] || (group[p.name] = { kind: p.kind, name: p.name, recs: [], st: 0, bytes: 0, last: 0, pending: 0, lazy: !isEager(r) });
      u.recs.push(r);
      if (u.lazy) lazyUnits++;
      if (p.kind === 'props') for (let t = 0; t < THEMES.length; t++) { const sfx = '_' + THEMES[t]; if (p.name.length > sfx.length && p.name.slice(-sfx.length) === sfx) themedProps[p.name.slice(0, -sfx.length)] = true; }
    }
  }

  // ---------------------------------------------------------------- loading: queue, handlers, memory
  const queue = [];
  let active = 0, iconTimer = 0, scenePrune = 0, scenePruneAt = 0;
  function pump() {
    while (active < MAX_ACTIVE && queue.length) loadRec(queue.shift());
  }
  function settle(r, ok, why) {
    const u = units[r.kind][r.name];
    active--;
    if (ok === true) { r.st = 2; loaded.push(r.path); info('loaded ' + r.path); }
    else { r.st = 3; warn(r.path, why || 'rejected'); }
    if (u && --u.pending <= 0) {
      u.st = 2;
      if (u.lazy) { lazyBytes += u.bytes; if (lazyBytes > BUDGET) evict(); }
    }
    pump();
  }
  function loadRec(r) {
    const u = units[r.kind][r.name];
    const img = new Image();
    try { img.decoding = 'async'; } catch (err) { /* old browsers */ }
    active++;
    img.onload = function () {
      let res;
      try { res = HANDLERS[r.kind](r.name, img, r.anim, u, r.meta); } catch (err) { res = 'failed while decoding (' + (err && err.message || err) + ') - procedural art stays'; }
      img.onload = img.onerror = null;
      settle(r, res, typeof res === 'string' ? res : null);
    };
    img.onerror = function () { img.onload = img.onerror = null; settle(r, false, 'could not be loaded (missing file, wrong path in assets.js, or not a valid PNG) - procedural art stays'); };
    img.src = BASE + r.path;
  }
  function startUnit(u, urgent) {
    if (u.st !== 0) return;
    u.st = 1; u.pending = u.recs.length; u.bytes = 0;
    for (let i = 0; i < u.recs.length; i++) {
      const r = u.recs[i];
      r.st = 1;
      if (urgent) queue.unshift(r); else queue.push(r);
    }
    pump();
  }
  // the game asks for (kind, name): start loading it when it is listed and not yet loaded; returns the unit or null
  function want(kind, name) {
    const u = units[kind][name];
    if (!u) return null;
    u.last = clock;
    if (u.st === 0) startUnit(u, true);
    return u;
  }
  function unload(u) {
    if (u.st !== 2 || !u.lazy || !UNLOAD[u.kind]) return false;
    try { UNLOAD[u.kind](u.name); } catch (err) { /* already gone */ }
    lazyBytes -= u.bytes; u.bytes = 0; u.st = 0;
    for (let i = 0; i < u.recs.length; i++) { const r = u.recs[i]; if (r.st === 2) { r.st = 0; const k = loaded.indexOf(r.path); if (k >= 0) loaded.splice(k, 1); } else if (r.st === 3) r.st = 0; }
    info('released ' + u.kind + '/' + u.name);
    return true;
  }
  function eachLazy(fn) {
    for (const kind in LAZY) { const g = units[kind]; for (const n in g) if (g[n].lazy && g[n].st === 2 && UNLOAD[kind]) fn(g[n]); }
  }
  // release least recently used units until under 80 % of the budget; units touched in the last IN_USE seconds stay
  function evict() {
    const list = [];
    eachLazy(function (u) { if (clock - u.last > IN_USE) list.push(u); });
    list.sort(function (a, b) { return a.last - b.last; });
    for (let i = 0; i < list.length && lazyBytes > BUDGET * 0.8; i++) unload(list[i]);
  }
  // release every lazy unit not touched since `stamp`
  function pruneBefore(stamp) {
    const list = [];
    eachLazy(function (u) { if (u.last < stamp) list.push(u); });
    for (let i = 0; i < list.length; i++) unload(list[i]);
  }
  function iconsDirty() {
    if (iconTimer) return;
    iconTimer = setTimeout(function () {
      iconTimer = 0;
      iconCache.clear(); urlCache.clear();
    }, 120);
  }

  // ---------------------------------------------------------------- lookups used by the renderer
  // icon descriptor (+ optional key) → loaded icon name, or null. key: 'items/heavy_helm_2' | 'heavy_helm_2' | [keys]; also read
  // from desc.key. A keyed hand-drawn icon wins over the shape icon, which wins over the procedural one.
  function iconName(d, key) {
    if (!nIcons) return null;
    let k = key != null ? key : d && d.key;
    if (k != null) {
      const ks = Array.isArray(k) ? k : [k];
      for (let i = 0; i < ks.length; i++) {
        const s = typeof ks[i] === 'string' ? ks[i] : '';
        if (icons[s]) return s;
        if (iconByLeaf[s]) return iconByLeaf[s];
      }
    }
    if (!d || typeof d.shape !== 'string') return null;
    const s = d.shape;
    if (s === 'potion' && (icons.potion_hp || icons.potion_mp)) {
      const c = U.rgbOf(d.color);
      if (c[0] > c[2] + 40 && icons.potion_hp) return 'potion_hp';
      if (c[2] > c[0] + 40 && icons.potion_mp) return 'potion_mp';
    }
    return icons[s] ? s : null;
  }
  function sheetNamed(n) {
    if (!n) return null;
    const u = units.sprites[n];
    if (u) { u.last = clock; if (u.st === 0) startUnit(u, true); }
    const h = hdSprites[n];
    return (h && h.anims.idle ? h : sprites[n]) || null;
  }
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
  // per-key eviction (oldest first) instead of dropping the whole cache at the limit
  function setLimited(map, key, val, max) {
    if (map.size >= max) map.delete(map.keys().next().value);
    map.set(key, val);
  }

  // ---------------------------------------------------------------- scan: load what the current floor will show
  let scanT = 0, scanMap = null;
  function scan() {
    const S = G.state;
    if (!S) return;
    const map = S.map, P = S.player;
    if (P) { want('sprites', P.classId); want('sprites', P.classId + '_base'); want('sprites', 'player_base'); }
    if (!map || S.scene === 'menu') return;
    if (map !== scanMap) {                                  // once per floor: its props (and rift looks)
      scanMap = map;
      const ps = map.props || [];
      for (let i = 0; i < ps.length; i++) { if (ps[i]) { want('props', ps[i].type); if (typeof ps[i].look === 'string') want('props', ps[i].look); } }
      if (typeof map.theme === 'string') want('tiles', map.theme);
    }
    const ents = S.entities || [], px = P ? P.x : 0, py = P ? P.y : 0;
    for (let i = 0; i < ents.length && i < 500; i++) {
      const e = ents[i];
      if (!e || e === P || e.dead) continue;
      if (P && (Math.abs(e.x - px) > 36 || Math.abs(e.y - py) > 36)) continue;
      if (e.fallen) { want('sprites', e.monsterId); want('sprites', e.classId); continue; }
      want('sprites', e.classId); want('sprites', e.monsterId);
      if (e.type === 'npc') want('sprites', 'npc_' + e.role);
    }
  }
  G.on('scene:changed', function () { scenePrune = clock; scenePruneAt = clock + 6; });

  U.assets = {
    ver: 0,
    applyTiles: applyTiles,
    variantSet: variantSet,
    // read assets/assets.js and index (not fetch) every listed file; small eager art starts loading in the background
    load: function () {
      if (started) return;
      started = true;
      try {
        const s = document.createElement('script');
        s.onload = function () {
          try {
            register(Array.isArray(G.assetList) ? G.assetList : []);
            for (const kind in units) for (const n in units[kind]) { const u = units[kind][n]; if (!u.lazy) startUnit(u, false); }
            info(nListed + ' files listed, ' + rejected.length + ' rejected');
          } catch (err) { warn('assets/assets.js', 'could not be read (' + (err && err.message || err) + ') - procedural art stays'); }
        };
        s.onerror = function () { /* no assets.js: nothing hand-drawn, all procedural */ };
        s.src = BASE + 'assets.js';
        document.head.appendChild(s);
      } catch (err) { /* no overrides */ }
    },
    // harness hook: feed an image/canvas as if `path` had been loaded → true if accepted (rejections are warned once)
    inject: function (path, img, meta) {
      const p = parseArt(path);
      if (typeof p === 'string') { warn(path, p); return false; }
      try {
        const u = units[p.kind][p.name] || { bytes: 0 };
        const res = HANDLERS[p.kind](p.name, img, p.anim, u, meta || null);
        if (res === true) { loaded.push(path); return true; }
        warn(path, res || 'rejected');
        return false;
      } catch (err) { return false; }
    },
    // harness hook: index a list as assets.js would, without fetching anything
    register: function (list) { const before = Object.keys(recs).length; register(list); return Object.keys(recs).length - before; },
    parse: parseArt,
    loaded: function () { return loaded.slice(); },
    rejected: function () { return rejected.slice(); },
    // numbers for the debug overlay and tests
    stats: function () {
      let ready = 0, units_ = 0;
      for (const kind in units) for (const n in units[kind]) { units_++; if (units[kind][n].st === 2) ready++; }
      return { listed: nListed, sound: nSound, units: units_, ready: ready, rejected: rejected.length, lazyBytes: lazyBytes, budget: BUDGET, queued: queue.length + active };
    },
    summary: function () { return nListed ? 'ART ' + loaded.length + '/' + nListed + (rejected.length ? ' X' + rejected.length : '') : ''; },
    // demand loading
    want: want,
    touchKeys: function (kind, keys) { const g = units[kind]; for (let i = 0; i < keys.length; i++) { const u = g[keys[i]]; if (u) u.last = clock; } },
    has: function (kind, name) { return !!units[kind][name]; },
    // called every frame by render.js update(): clock, floor scan, idle release
    tick: function (dt) {
      clock = Date.now() / 1000;
      if ((scanT -= dt) <= 0) { scanT = 0.5; if (nListed) scan(); }
      if (scenePruneAt && clock >= scenePruneAt) { scenePruneAt = 0; pruneBefore(scenePrune); }
      else if (lazyBytes > BUDGET * 0.25 && ((tickN = (tickN + 1) % 600) === 0)) { const list = []; eachLazy(function (u) { if (clock - u.last > 90) list.push(u); }); list.forEach(unload); }
    },
    // entity → override sheet (classId, then monsterId, then npc_<role>) or null. HD sheets win over 1x sheets.
    spriteFor: function (e) {
      if (!nSprites && !nSpriteUnits()) return null;
      // the Fallen are adventurers: their own sheet (monster id) first, then their class's
      if (e.fallen) return sheetNamed(e.monsterId) || sheetNamed(e.classId);
      return sheetNamed(e.classId) || sheetNamed(e.monsterId) || (e.type === 'npc' ? sheetNamed('npc_' + e.role) : null);
    },
    hasIcon: function (d, key) { return !!iconName(d, key); },
    sprite: sheetNamed,
    // fx strip for an effect type; `variants` (element / rarity names) are tried first as fx/<type>_<variant>
    fx: function (type, variants) {
      if (variants) for (let i = 0; i < variants.length; i++) { if (typeof variants[i] !== 'string') continue; const n = type + '_' + variants[i]; if (units.fx[n]) { want('fx', n); if (fx[n]) return fx[n]; } }
      const u = units.fx[type];
      if (u) { u.last = clock; if (u.st === 0) startUnit(u, true); }
      return fx[type] || null;
    },
    hasProp: function (name) { want('props', name); return !!props[name]; },
    ui: function (name) { const u = units.ui[name]; if (u) { u.last = clock; if (u.st === 0) startUnit(u, true); } return ui[name] || null; },
    // URL of a listed file (for CSS skins: border-image: url(...)); null when it is not in assets.js
    url: function (path) { return recs[path] ? BASE + path : null; },
    listed: function (prefix) { const o = []; for (const p in recs) if (p.indexOf(prefix) === 0) o.push(p); return o.sort(); },
    // a listed icon exists for (descriptor, key)?
    iconKey: iconName,
    unload: function (kind, name) { const u = units[kind] && units[kind][name]; return u ? unload(u) : false; },
    // test hook: drop every lazy unit untouched for `seconds`
    prune: function (seconds) { pruneBefore(clock - (seconds || 0)); },
    propFrames: propFrames,
  };
  let tickN = 0;
  function nSpriteUnits() { for (const n in units.sprites) return true; return false; }

  // ---------------------------------------------------------------- wrap the procedural getters
  const procIcon = E.getIcon, procURL = E.getIconURL, procPortrait = E.getPortrait, procProj = U.projectile, procProp = U.props.get, procTiles = U.tiles.get;

  // a theme's tiles load the first time the game asks for its set
  U.tiles.get = function (theme) { if (units.tiles[theme]) want('tiles', theme); return procTiles(theme); };

  E.getIcon = function (iconDesc, size, key) {
    const name = iconName(iconDesc, key);
    if (!name) return procIcon(iconDesc, size);
    size = Math.max(4, Math.min(256, (size | 0) || 32));
    const ck = name + '|' + size;
    let c = iconCache.get(ck);
    if (!c) setLimited(iconCache, ck, (c = size === icons[name].width ? icons[name] : scaled(icons[name], size)), 600);
    return c;
  };
  E.getIconURL = function (iconDesc, size, key) {
    const name = iconName(iconDesc, key);
    if (!name) return procURL(iconDesc, size);
    size = Math.max(4, Math.min(256, (size | 0) || 32));
    const ck = name + '|' + size;
    let u = urlCache.get(ck);
    if (u === undefined) {
      try { u = E.getIcon(iconDesc, size, key).toDataURL('image/png'); } catch (err) { u = procURL(iconDesc, size); }
      setLimited(urlCache, ck, u, 600);
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
    setLimited(portraitCache, key, c, 200);
    return c;
  };
  U.projectile = function (shape, color) { return projectiles[shape] || procProj(shape, color); };

  // props: props/<type>_<theme>.png (when the floor's theme has one) wins over props/<type>.png
  function propFrames(type) {
    if (themedProps[type]) {
      const m = G.state && G.state.map, th = m && m.theme;
      if (th) { const n = type + '_' + th; want('props', n); if (props[n]) return props[n]; }
    }
    want('props', type);
    return props[type] || null;
  }
  const propWrap = Object.create(null);
  U.props.get = function (type) {
    const f = propFrames(type);
    if (!f) return procProp(type);
    let w = propWrap[type];
    if (!w || w.frames !== f) w = propWrap[type] = { frames: f, light: procProp(type).light, fps: f.fps || 0 };
    return w;
  };
})();
