// Visible gear (CONTRACT R5.9). The player's equipped weapon, off-hand, helm, chest, gloves and boots are drawn on the
// character, from `item.look = { family, palette }`. One sheet is built per distinct equipment combination and cached;
// the renderer only does a cheap numeric signature check per frame.
//
// Procedural: looks are drawn into the procedural rig (sprites.js, GEAR hooks), so they follow every animation frame.
// Hand-drawn (ART_SPEC "Gear overlays"): if `sprites/<classId>_base.png` (or `sprites/player_base.png`) is loaded, the
// player is composed from that base + `gear/<family>_<slot>.png` overlays (640x80, character grid) in a fixed order:
//   front rows: base, boots, chest, gloves, helm, offhand, weapon
//   back rows:  offhand, weapon, base, boots, chest, gloves, helm      (held items go behind the body)
// A slot without a drawn overlay for its family shows nothing on a hand-drawn base. Without a base sheet, a hand-drawn
// full class sheet (`sprites/<classId>.png`) is used as-is and gear is not shown; otherwise the procedural look is used.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const SLOTS = ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'boots'];
  const WEAPON_TYPES = { sword: 1, axe: 1, mace: 1, dagger: 1, bow: 1, staff: 1, wand: 1 };

  // ---------------------------------------------------------------- palettes
  // [main, trim, glow|null]
  const PAL = {
    iron: ['#7c828e', '#4a4f5a', null], steel: ['#9aa2b0', '#565c6a', null], rust: ['#8a5a3a', '#4e3022', null],
    bone: ['#c8bea0', '#7e735c', null], ivory: ['#e0d8c0', '#9a9076', null], ash: ['#66605c', '#2e2a2a', '#ff7a1e'],
    blood: ['#7e2026', '#3a0e10', '#ff3a30'], crimson: ['#a02030', '#501018', null], gold: ['#c8a040', '#7a5a1e', null],
    bronze: ['#a0703a', '#5a3a1e', null], void: ['#4e3270', '#1e1230', '#b65bff'], moss: ['#4e6a3a', '#2a3a20', null],
    frost: ['#8ab0c8', '#4a6a8a', '#bfe8ff'], ember: ['#6a3020', '#2a1210', '#ffb040'], shadow: ['#3e3a4a', '#1a1820', null],
    verdigris: ['#4a8a78', '#2a5048', null], leather: ['#6e4c32', '#3e2a1c', null], cloth: ['#55506a', '#2a2636', null],
    plague: ['#6a7a3a', '#33401c', '#b0f060'], grave: ['#6a6e60', '#34362e', null], obsidian: ['#2e2a36', '#121018', '#7a5aff'],
  };
  const MAT_DEFAULT = { plate: 'iron', mail: 'steel', leather: 'leather', cloth: 'cloth', bone: 'bone', generic: 'iron' };
  const WORDS = [
    [/plate|iron|steel|knight|forged|greave|gauntlet|helm|warden|templar|paladin|bulwark|aegis/, 'plate'],
    [/mail|chain|ring|scale|hauberk|brigand/, 'mail'],
    [/leather|hide|hunter|stalker|studded|jerkin|drake|skin|ranger|scout|boot|glove/, 'leather'],
    [/cloth|robe|silk|shroud|wrap|cowl|hood|linen|weave|acolyte|mystic|archon|vestment|slipper|threadbare|woven|sorcer|mage/, 'cloth'],
    [/bone|grave|skull|ossuar|marrow|lich|crypt|corpse|necro/, 'bone'],
  ];
  function words(item) {
    const lk = item.look || {};
    return (String(lk.family || '') + ' ' + String(item.baseId || '') + ' ' + String(item.name || '')).toLowerCase();
  }
  const MATS = { plate: 1, mail: 1, leather: 1, cloth: 1, bone: 1 };
  function matOf(item, slot) {
    const lk = item.look || {}, fam = String(lk.family || '').toLowerCase();
    if (MATS[lk.material]) return lk.material;               // items team states it outright

    for (let i = 0; i < WORDS.length; i++) if (WORDS[i][0].test(fam)) return WORDS[i][1];
    const ac = item.armorClass;
    if (ac === 'heavy') return 'plate';
    if (ac === 'light') return 'leather';
    if (ac === 'cloth') return 'cloth';
    const w = words(item);
    for (let i = 0; i < WORDS.length; i++) if (WORDS[i][0].test(w)) return WORDS[i][1];
    return 'generic';
  }
  function hueHash(s) {
    let h = 7;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    const hue = ((h >>> 0) % 360) / 60, c = 70, x = c * (1 - Math.abs(hue % 2 - 1));
    const rgb = hue < 1 ? [c, x, 0] : hue < 2 ? [x, c, 0] : hue < 3 ? [0, c, x] : hue < 4 ? [0, x, c] : hue < 5 ? [x, 0, c] : [c, 0, x];
    return U.hex(U.pack(rgb[0] + 50, rgb[1] + 50, rgb[2] + 50));
  }
  // palette spec (name | [main, trim, glow] | { main, trim, glow }) → [main, trim, glow]
  U.paletteOf = function (spec, fallbackName) {
    if (Array.isArray(spec) && spec.length) return [U.safeColor(spec[0], '#7c828e'), U.safeColor(spec[1], U.tone(U.safeColor(spec[0], '#7c828e'), 0.6)), spec[2] ? U.safeColor(spec[2], null) : null];
    if (spec && typeof spec === 'object') {
      const m = U.safeColor(spec.main || spec.primary || spec.base || spec.tint, null);
      if (m) return [m, U.safeColor(spec.trim || spec.secondary || spec.accent, U.tone(m, 0.6)), U.safeColor(spec.glow, null), U.safeColor(spec.accent, null)];
    }
    if (typeof spec === 'string') {
      const k = spec.toLowerCase();
      if (PAL[k]) return PAL[k];
      for (const n in PAL) if (k.indexOf(n) >= 0) return PAL[n];
      const hx = U.safeColor(spec, null);
      if (hx) return [hx, U.tone(hx, 0.6), null];
      return [hueHash(k), U.tone(hueHash(k), 0.55), null];
    }
    return PAL[fallbackName] || PAL.iron;
  };

  function lift(hex, min) {
    const c = U.rgbOf(hex), l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    if (l >= min) return hex;
    const k = (min - l) / (255 - l);
    return U.hex(U.pack(c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k));
  }
  // item → resolved look piece used by the rig
  function lookOf(item, slot) {
    const lk = (item.look && typeof item.look === 'object') ? item.look : {};
    const mat = matOf(item, slot), w = words(item);
    let pal;
    if (lk.palette != null) pal = U.paletteOf(lk.palette, MAT_DEFAULT[mat]);
    else {
      // no look yet: guess from the name, else the base's own icon colours (items team picks natural colours there)
      let named = null;
      for (const n in PAL) if (w.indexOf(n) >= 0) { named = PAL[n]; break; }
      const ic = item.icon && item.icon.color;
      pal = named || (U.safeColor(ic, null) && slot !== 'weapon' ? [ic, U.safeColor(item.icon.accent, U.tone(ic, 0.6)), null] : PAL[MAT_DEFAULT[mat]]);
    }
    let glow = U.safeColor(lk.glow, null) || pal[2];
    if (!glow && /ember|ash|cinder|flame|fire/.test(w)) glow = '#ffa030';
    else if (!glow && /void|abyss|eye|shadow/.test(w)) glow = '#b65bff';
    else if (!glow && /frost|rime|ice|winter/.test(w)) glow = '#bfe8ff';
    const m = lift(pal[0], 64), t = lift(pal[1], 40);
    return {
      mat: mat, acc: pal[3] || null, m: m, md: U.tone(m, 0.68), ml: U.tone(m, 1.28), t: t, td: U.tone(t, 0.7), g: glow, gd: glow ? U.tone(glow, 0.6) : null,
      glowy: !!glow, horns: /horn|demon|fiend|devil|ram|bull/.test(w), crown: /crown|king|regal|royal|queen/.test(w),
      spikes: /spike|thorn|barb|spine|bristl/.test(w),
    };
  }
  function weaponPalette(P, L, kind) {
    const wood = kind === 'bow' || kind === 'staff' || kind === 'wand';
    const o = Object.assign({}, P);
    if (wood) { o.wood = L.m; o.woodD = L.md; }
    else { o.metal = L.ml; o.metalD = L.m; }
    o.ad = L.t; o.a = L.g || L.t; o.al = U.tone(L.g || L.t, 1.3);
    return o;
  }
  function offKind(item) {
    const k = String(item.offhandType || (item.icon && item.icon.shape) || '').toLowerCase();
    if (k === 'orb' || k === 'tome') return k;
    if (k === 'quiver' || k === 'arrow' || /quiver/.test(String(item.baseId || ''))) return 'quiver';
    return 'shield';
  }

  // ---------------------------------------------------------------- hand-drawn overlays
  const overlays = Object.create(null);    // '<family>_<slot>' → 4-row canvas (rows like a sprite sheet)
  let ver = 0;
  // Called by assets.js for every gear/<family>_<slot>.png that loaded with the right size.
  function addOverlay(name, img) {
    const cell = img.width / 16;
    if (cell !== (cell | 0) || cell < 8 || img.height !== cell * 2) return false;
    const src = U.makeCanvas(img.width, img.height), sx = U.ctx2d(src, true);
    sx.drawImage(img, 0, 0);
    const d = sx.getImageData(0, 0, src.width, src.height).data, w = src.width;
    const empty = function (x0, y0) { for (let y = y0; y < y0 + cell; y++) for (let x = x0; x < x0 + cell; x++) if (d[(y * w + x) * 4 + 3] > 8) return false; return true; };
    let backEmpty = true;
    for (let i = 0; i < 16 && backEmpty; i++) if (!empty(i * cell, cell)) backEmpty = false;
    const c = U.makeCanvas(cell * 16, cell * 4), x = U.ctx2d(c);
    for (let r = 0; r < 2; r++) {
      const sr = r === 1 && backEmpty ? 0 : r;
      for (let i = 0; i < 16; i++) {
        const si = empty(i * cell, sr * cell) ? 0 : i;
        x.drawImage(src, si * cell, sr * cell, cell, cell, i * cell, r * 2 * cell, cell, cell);
        x.save(); x.translate((i + 1) * cell, (r * 2 + 1) * cell); x.scale(-1, 1);
        x.drawImage(src, si * cell, sr * cell, cell, cell, 0, 0, cell, cell);
        x.restore();
      }
    }
    overlays[name] = { c: c, cell: cell };
    ver++;
    return true;
  }

  function sheetObj(c, cell, ox, oy, top) {
    return {
      c: c, base: c, cell: cell, ox: ox, oy: oy, top: top, hover: false, wide: false, _flash: null, _outl: null,
      flash: function () { return this._flash || (this._flash = U.tint(this.c, '#ffffff')); },
      outlined: function () { return this.c; },
    };
  }
  const FRONT_ORDER = ['boots', 'chest', 'gloves', 'helm', 'offhand', 'weapon'], BACK_BEHIND = ['offhand', 'weapon'], BACK_FRONT = ['boots', 'chest', 'gloves', 'helm'];
  function composeHand(base, eq) {
    const cell = base.cell, c = U.makeCanvas(cell * 16, cell * 4), x = U.ctx2d(c);
    const ov = function (slot) {
      const it = eq[slot], fam = it && it.look && it.look.family;
      const o = fam && overlays[String(fam).toLowerCase() + '_' + slot];
      return o && o.cell === cell ? o.c : null;
    };
    const row = function (src, r) { x.drawImage(src, 0, r * cell, cell * 16, cell, 0, r * cell, cell * 16, cell); };
    for (let r = 0; r < 4; r++) {
      if (r < 2) { row(base.c, r); for (let i = 0; i < FRONT_ORDER.length; i++) { const o = ov(FRONT_ORDER[i]); if (o) row(o, r); } }
      else {
        for (let i = 0; i < BACK_BEHIND.length; i++) { const o = ov(BACK_BEHIND[i]); if (o) row(o, r); }
        row(base.c, r);
        for (let i = 0; i < BACK_FRONT.length; i++) { const o = ov(BACK_FRONT[i]); if (o) row(o, r); }
      }
    }
    return sheetObj(c, cell, base.ox, base.oy, base.top);
  }

  // ---------------------------------------------------------------- hand-drawn 2x overlays (R6.4): gear/<key>/<anim>.png
  // key = <family>_<slot> for armour, <family>_<weaponType> / <family>_<offhandKind> for held items; generic fallbacks
  // generic_<material>_<slot>, generic_<weaponType>, generic_<offhandKind> are recoloured by the item's palette.
  const hdOver = Object.create(null);      // key → { anims: { [anim]: rec } }
  function addOverlayHD(key, anim, rec) {
    const o = hdOver[key] || (hdOver[key] = { anims: Object.create(null) });
    o.anims[anim] = rec;
    ver++;
    return true;
  }
  const tints = new WeakMap();
  // 'color' blend keeps each pixel's brightness and takes the palette hue, so one grey-ish generic piece fits every family
  function recolour(rec, hex) {
    let m = tints.get(rec);
    if (!m) { m = new Map(); tints.set(rec, m); }
    let c = m.get(hex);
    if (c) return c;
    c = U.makeCanvas(rec.c.width, rec.c.height);
    const x = U.ctx2d(c);
    x.drawImage(rec.c, 0, 0);
    x.globalCompositeOperation = 'color'; x.fillStyle = hex; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(rec.c, 0, 0);
    c = { c: c, n: rec.n, rows: rec.rows, cell: rec.cell, top: rec.top };
    m.set(hex, c);
    return c;
  }
  function hdPiece(it, slot, anim) {
    if (!it) return null;
    const fam = String((it.look && it.look.family) || '').toLowerCase();
    const kind = slot === 'weapon' ? (WEAPON_TYPES[it.weaponType] ? it.weaponType : 'sword') : slot === 'offhand' ? offKind(it) : slot;
    const own = hdOver[fam + '_' + kind] || (slot === 'weapon' || slot === 'offhand' ? hdOver[fam + '_' + slot] : null);
    if (own) return own.anims[anim] || null;
    const L = lookOf(it, slot), gen = hdOver[slot === 'weapon' || slot === 'offhand' ? 'generic_' + kind : 'generic_' + L.mat + '_' + slot];
    const rec = gen && gen.anims[anim];
    return rec ? recolour(rec, L.m) : null;
  }
  // rows nw / n (/ ne on 8-row sheets) show the back: held items go behind the body there
  function composeHD(base, eq) {
    const out = { hd: true, cell: base.cell, ox: base.ox, oy: base.oy, top: base.top, scale: base.scale, anims: Object.create(null), hover: false, wide: false };
    for (const anim in base.anims) {
      const b = base.anims[anim], cell = b.cell, c = U.makeCanvas(b.c.width, b.c.height), x = U.ctx2d(c);
      const pieces = Object.create(null);
      for (let i = 0; i < SLOTS.length; i++) { const p = hdPiece(eq[SLOTS[i]], SLOTS[i], anim); if (p && p.cell === cell && p.rows === b.rows) pieces[SLOTS[i]] = p; }
      const lay = function (p, r) {
        for (let f = 0; f < b.n; f++) x.drawImage(p.c, Math.min(f, p.n - 1) * cell, r * cell, cell, cell, f * cell, r * cell, cell, cell);
      };
      for (let r = 0; r < b.rows; r++) {
        const back = r === 3 || r === 4 || (b.rows === 8 && r === 5);
        if (back) for (let i = 0; i < BACK_BEHIND.length; i++) if (pieces[BACK_BEHIND[i]]) lay(pieces[BACK_BEHIND[i]], r);
        x.drawImage(b.c, 0, r * cell, b.c.width, cell, 0, r * cell, b.c.width, cell);
        const order = back ? BACK_FRONT : FRONT_ORDER;
        for (let i = 0; i < order.length; i++) if (pieces[order[i]]) lay(pieces[order[i]], r);
      }
      out.anims[anim] = { c: c, n: b.n, rows: b.rows, cell: cell, top: b.top };
    }
    return out;
  }

  // ---------------------------------------------------------------- sheet cache
  const cache = new Map();
  let bump = 0;
  G.on('equipment:changed', function () { bump++; });
  G.on('scene:changed', function () { bump++; });

  function equipment(p) { return p && p.equipment && typeof p.equipment === 'object' ? p.equipment : null; }
  function signature(p, eq) {
    let s = (ver * 977 + bump) | 0;
    for (let i = 0; i < SLOTS.length; i++) {
      const it = eq[SLOTS[i]];
      s = (Math.imul(s, 31) + (it ? (typeof it.id === 'number' ? it.id : 7) + 1 : 0)) | 0;
    }
    return s;
  }
  function pieceKey(it, slot) {
    if (!it) return '-';
    const lk = it.look || {};
    return slot + ':' + (lk.family || '') + '/' + (typeof lk.palette === 'string' ? lk.palette : JSON.stringify(lk.palette || null)) + '/' + (lk.glow || '') + '/' +
      (it.weaponType || it.offhandType || '') + '/' + (it.armorClass || '') + '/' + (it.baseId || it.name || '') + '/' + ((it.icon && it.icon.color) || '');
  }
  function fullKey(p, eq) {
    const d = p.sprite || {};
    let k = (p.classId || '') + '|' + d.body + '|' + d.color + '|' + d.accent + '|' + d.weapon;
    for (let i = 0; i < SLOTS.length; i++) k += '|' + pieceKey(eq[SLOTS[i]], SLOTS[i]);
    return k;
  }
  function handBase(p) {
    if (!U.assets || !U.assets.sprite) return null;
    return (p.classId && U.assets.sprite(p.classId + '_base')) || U.assets.sprite('player_base') || null;
  }
  function build(p, eq) {
    const hb = handBase(p);
    if (hb) return hb.hd ? composeHD(hb, eq) : composeHand(hb, eq);
    const desc = p.sprite || {}, P = U.sprites.palette(desc);
    const gear = { helm: null, chest: null, gloves: null, boots: null, off: null, wP: null };
    for (let i = 2; i < SLOTS.length; i++) { const it = eq[SLOTS[i]]; if (it) gear[SLOTS[i]] = lookOf(it, SLOTS[i]); }
    const off = eq.offhand;
    if (off) gear.off = { kind: offKind(off), L: lookOf(off, 'offhand') };
    const w = eq.weapon;
    let wpn = 'none';
    if (w) {
      wpn = WEAPON_TYPES[w.weaponType] ? w.weaponType : (WEAPON_TYPES[desc.weapon] ? desc.weapon : 'sword');
      gear.wP = weaponPalette(P, lookOf(w, 'weapon'), wpn);
    }
    return U.sprites.buildGeared(desc, gear, wpn);
  }

  const memo = new WeakMap();      // player object → { sig, sprite, sheet }
  U.gear = {
    addOverlay: addOverlay, addOverlayHD: addOverlayHD,
    lookOf: lookOf,
    // geared sheet for the player, or null when the default path should be used
    sheetFor: function (p) {
      const eq = equipment(p);
      if (!eq) return null;
      if (!handBase(p) && U.assets && U.assets.spriteFor(p)) return null;     // hand-drawn class sheet wins (gear not shown)
      const sig = signature(p, eq);
      let m = memo.get(p);
      if (m && m.sig === sig && m.sprite === p.sprite) return m.sheet;
      const key = fullKey(p, eq) + '|' + ver;
      let sheet = cache.get(key);
      if (!sheet) {
        try { sheet = build(p, eq); } catch (err) { console.warn('[engine] gear build failed', err); sheet = U.sprites.get(p.sprite); }
        if (cache.size > (sheet && sheet.hd ? 3 : 24)) cache.clear();
        cache.set(key, sheet);
      }
      if (!m) { m = { sig: 0, sprite: null, sheet: null }; memo.set(p, m); }
      m.sig = sig; m.sprite = p.sprite; m.sheet = sheet;
      return sheet;
    },
  };
  E.gearKey = function (p) { const eq = equipment(p || G.state.player); return eq ? fullKey(p || G.state.player, eq) : ''; };

  // Paper-doll figure: idle frame, front-right, scaled up with whole pixels, transparent background.
  const previews = new WeakMap();
  E.getPlayerPreview = function (player, size) {
    size = Math.max(16, Math.min(512, (size | 0) || 96));
    const p = player && typeof player === 'object' ? player : G.state.player;
    if (!p) return U.makeCanvas(size, size);
    let sheet = null;
    try { sheet = U.gear.sheetFor(p) || (U.assets && U.assets.spriteFor(p)) || U.sprites.get(p.sprite); }
    catch (err) { sheet = U.sprites.get(p.sprite); }
    let per = previews.get(sheet);
    if (!per) { per = new Map(); previews.set(sheet, per); }
    let c = per.get(size);
    if (c) return c;
    const k = sheet.cell / 40, side = Math.max(Math.round(30 * k), sheet.top + Math.round(8 * k));
    const z = Math.max(1, Math.floor(size / side)), sx = sheet.ox - (side >> 1), sy = sheet.oy - side + Math.round(4 * k);
    c = U.makeCanvas(size, size);
    const x = U.ctx2d(c);
    if (sheet.hd) {                       // painted 2x art: front (s) idle frame, scaled smoothly to fit
      const a = sheet.anims.idle || sheet.anims[Object.keys(sheet.anims)[0]], cs = a.cell, s2 = Math.min(cs, Math.round(a.top * 1.25));
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(a.c, (cs - s2) >> 1, sheet.oy - s2 + Math.round(cs / 16), s2, s2, 0, 0, size, size);
    } else x.drawImage(sheet.c, sx, sy, side, side, Math.round((size - side * z) / 2), Math.round((size - side * z) / 2), side * z, side * z);
    per.set(size, c);
    return c;
  };
})();
