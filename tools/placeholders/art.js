// Draws one art placeholder (tools/placeholders/gen.html): a starting sketch (the game's procedural art from assets_templates/, resampled
// to the catalog's cell size and frame count, or a neutral grey silhouette) plus faint guides: cell borders, the feet anchor cross,
// frame numbers and direction labels. Returns a canvas of exactly spec.w x spec.h.
(function () {
  'use strict';
  const PH = window.PH = window.PH || {};
  const DIRS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
  const BORDER = 'rgba(120,190,255,0.30)', ANCHOR = 'rgba(255,60,60,0.95)', LABEL = 'rgba(255,255,255,0.85)', TITLE = '#ffd94a', EDGE = 'rgba(0,0,0,0.75)';
  // Procedural humans are ~42 px tall in a 96 cell; ART_SPEC wants ~58. Character and gear sketches are scaled by this about the anchor.
  const SKETCH_K = 58 / 42;
  const TILE_ROWS = ['floor', 'wall', 'door', 'stairs dn', 'stairs up', 'water', 'grass', 'path', 'lava', 'bridge', 'rubble', 'deep wtr', 'deep lav', 'chasm'];

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function text(x, str, px, py, size, fill, align) {
    x.font = size + 'px monospace'; x.textAlign = align || 'left'; x.textBaseline = 'alphabetic';
    x.lineWidth = 2; x.lineJoin = 'round'; x.strokeStyle = EDGE; x.strokeText(str, px, py);
    x.fillStyle = fill || LABEL; x.fillText(str, px, py);
  }
  function cross(x, cx, cy, r) {
    x.strokeStyle = ANCHOR; x.lineWidth = 1; x.beginPath();
    x.moveTo(cx - r + 0.5, cy + 0.5); x.lineTo(cx + r + 1.5, cy + 0.5); x.moveTo(cx + 0.5, cy - r + 0.5); x.lineTo(cx + 0.5, cy + r + 1.5); x.stroke();
  }
  function borders(x, s) {
    x.strokeStyle = BORDER; x.lineWidth = 1;
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) x.strokeRect(c * s.cw + 0.5, r * s.ch + 0.5, s.cw - 1, s.ch - 1);
  }
  function leaf(path) { return path.split('/').pop().replace(/\.png$/, ''); }
  function clip(str, n) { return str.length > n ? str.slice(0, n - 1) + '~' : str; }

  // ---------------------------------------------------------------- neutral silhouettes
  const GREY = 'rgba(150,150,160,0.55)', GREY2 = 'rgba(190,190,200,0.55)';
  function silhouette(x, s, cx, cy, dirRow, i, n) {
    const bob = Math.round(Math.sin(i / Math.max(1, n) * Math.PI * 2) * s.cw / 96 * (s.anim === 'walk' ? 1.5 : 0.8));
    const H = Math.min(s.ch * 0.78, 58 * (s.scale || 1) * (s.cw / 96)), W = H * 0.4, back = dirRow >= 3;
    const quad = /quadruped|crawler|beast|spider|rat|wolf/i.test(s.desc), fly = /flyer|hover|wisp|floating|bat\b|ghost|wraith/i.test(s.desc);
    x.fillStyle = GREY;
    if (quad) {
      const L = H * 0.9, T = H * 0.5;
      x.beginPath(); x.ellipse(cx, cy - T * 0.5 + bob, L / 2, T / 2, 0, 0, 7); x.fill();
      x.fillRect(cx - L * 0.4, cy - T * 0.2, L * 0.12, T * 0.2); x.fillRect(cx + L * 0.28, cy - T * 0.2, L * 0.12, T * 0.2);
      x.beginPath(); x.ellipse(cx + (dirRow === 0 ? 0 : L * 0.45), cy - T * 0.7 + bob, T * 0.28, T * 0.24, 0, 0, 7); x.fill();
    } else if (fly) {
      x.beginPath(); x.ellipse(cx, cy - H * 0.55 + bob, W * 0.6, H * 0.35, 0, 0, 7); x.fill();
      x.fillStyle = GREY2; x.beginPath(); x.ellipse(cx, cy - H * 0.8 + bob, W * 0.28, W * 0.28, 0, 0, 7); x.fill();
    } else {
      x.fillRect(cx - W * 0.32, cy - H * 0.42, W * 0.25, H * 0.42); x.fillRect(cx + W * 0.07, cy - H * 0.42, W * 0.25, H * 0.42);
      x.beginPath(); x.moveTo(cx - W * 0.5, cy - H * 0.38 + bob); x.lineTo(cx + W * 0.5, cy - H * 0.38 + bob); x.lineTo(cx + W * 0.4, cy - H * 0.78 + bob); x.lineTo(cx - W * 0.4, cy - H * 0.78 + bob); x.closePath(); x.fill();
      x.fillStyle = GREY2; x.beginPath(); x.arc(cx, cy - H * 0.88 + bob, H * 0.11, 0, 7); x.fill();
      if (!back) { x.fillStyle = 'rgba(40,40,50,0.7)'; x.fillRect(cx - H * 0.05, cy - H * 0.9 + bob, 2, 2); x.fillRect(cx + H * 0.03, cy - H * 0.9 + bob, 2, 2); }
    }
  }
  // a gear overlay with no procedural sketch: a small grey mark where the piece sits on the body
  function gearMark(x, s, cx, cy) {
    const H = 58 * (s.cw / 96), key = s.path.split('/')[1];
    x.fillStyle = GREY;
    if (/_helm$/.test(key)) { x.beginPath(); x.arc(cx, cy - H * 0.88, H * 0.13, 0, 7); x.fill(); }
    else if (/_chest$/.test(key)) x.fillRect(cx - H * 0.17, cy - H * 0.76, H * 0.34, H * 0.34);
    else if (/_gloves$/.test(key)) { x.fillRect(cx - H * 0.3, cy - H * 0.5, H * 0.1, H * 0.1); x.fillRect(cx + H * 0.2, cy - H * 0.5, H * 0.1, H * 0.1); }
    else if (/_boots$/.test(key)) { x.fillRect(cx - H * 0.14, cy - H * 0.06, H * 0.12, H * 0.06); x.fillRect(cx + H * 0.02, cy - H * 0.06, H * 0.12, H * 0.06); }
    else if (/_(shield|orb|tome)$/.test(key)) { x.beginPath(); x.arc(cx - H * 0.3, cy - H * 0.45, H * 0.14, 0, 7); x.fill(); }
    else if (/_quiver$/.test(key)) x.fillRect(cx - H * 0.05, cy - H * 0.8, H * 0.08, H * 0.34);
    else { x.save(); x.strokeStyle = GREY; x.lineWidth = Math.max(2, H * 0.05); x.beginPath(); x.moveTo(cx + H * 0.28, cy - H * 0.42); x.lineTo(cx + H * 0.45, cy - H * 0.9); x.stroke(); x.restore(); }
  }

  // ---------------------------------------------------------------- per kind
  function drawChar(x, s, img) {
    const N = s.cols, R = s.rows;
    if (img && img.height >= 16) {
      const sc = img.height / 5, M = Math.max(1, Math.round(img.width / sc)), ratio = s.cw / sc;
      // The procedural figures are smaller than ART_SPEC's target (a human ~58 px in a 96 cell), so every sketch is enlarged
      // by the same factor about its feet anchor — relative sizes between creatures stay as in the game.
      const k = SKETCH_K;
      x.imageSmoothingEnabled = (ratio * k) % 1 !== 0;
      x.globalAlpha = 0.92;
      for (let r = 0; r < R; r++) for (let i = 0; i < N; i++) {
        const f = Math.min(M - 1, Math.floor(i * M / N));
        const cx0 = i * s.cw, cy0 = r * s.ch, dw = s.cw * k, dh = s.ch * k;
        x.save(); x.beginPath(); x.rect(cx0, cy0, s.cw, s.ch); x.clip();
        x.drawImage(img, f * sc, Math.min(r, 4) * sc, sc, sc, cx0 + s.ax - s.ax * k, cy0 + s.ay - s.ay * k, dw, dh);
        x.restore();
      }
      x.globalAlpha = 1;
    } else {
      for (let r = 0; r < R; r++) for (let i = 0; i < N; i++) {
        const cx = i * s.cw + s.ax, cy = r * s.ch + s.ay;
        if (s.path.split('/')[0] === 'gear') gearMark(x, s, cx, cy); else silhouette(x, s, cx, cy, r, i, N);
      }
    }
    borders(x, s);
    for (let r = 0; r < R; r++) for (let i = 0; i < N; i++) {
      cross(x, i * s.cw + s.ax, r * s.ch + s.ay, 3);
      if (r === 0) text(x, String(i + 1), (i + 1) * s.cw - 2, 8, 7, LABEL, 'right');
      if (i === 0) text(x, DIRS[r] || String(r), 2, (r + 1) * s.ch - 3, 7, 'rgba(160,230,255,0.95)');
    }
    const id = s.path.split('/')[1], an = leaf(s.path) + ' ' + N + 'f';
    text(x, clip(id, Math.floor(s.cw / 4.4)), 2, 8, 7, TITLE);
    text(x, an, 2, 17, 7, TITLE);
  }
  function drawTile(x, s, img) {
    if (img && img.width === s.w && img.height === s.h) x.drawImage(img, 0, 0);
    borders(x, s);
    x.strokeStyle = 'rgba(120,190,255,0.35)';
    for (let r = 0; r < s.rows; r++) {
      for (let c = 0; c < s.cols; c++) {
        const ox = c * s.cw, oy = r * s.ch;
        x.strokeStyle = 'rgba(120,190,255,0.35)';
        x.beginPath(); x.moveTo(ox + 0.5, oy + 80.5); x.lineTo(ox + 32.5, oy + 64.5); x.lineTo(ox + 63.5, oy + 80.5); x.lineTo(ox + 32.5, oy + 95.5); x.closePath(); x.stroke();
        cross(x, ox + 32, oy + 80, 2);
      }
      text(x, TILE_ROWS[r] || String(r), 2, r * s.ch + 9, 7, TITLE);
    }
    text(x, clip(leaf(s.path), 14), 2, 18, 7, TITLE);
  }
  function drawProp(x, s, img) {
    if (img && img.height >= 16) {
      const M = Math.max(1, Math.round(img.width / 96));
      x.imageSmoothingEnabled = false; x.globalAlpha = 0.92;
      for (let i = 0; i < s.cols; i++) { const f = Math.min(M - 1, Math.floor(i * M / s.cols)); x.drawImage(img, f * 96, 0, 96, 128, i * 96, 0, 96, 128); }
      x.globalAlpha = 1;
    } else {
      for (let i = 0; i < s.cols; i++) { x.fillStyle = GREY; x.fillRect(i * 96 + 32, 40, 32, 72); x.fillStyle = GREY2; x.fillRect(i * 96 + 36, 34, 24, 10); }
    }
    borders(x, s);
    for (let i = 0; i < s.cols; i++) {
      const ox = i * 96;
      x.strokeStyle = 'rgba(120,190,255,0.35)'; x.beginPath(); x.moveTo(ox + 16.5, 112.5); x.lineTo(ox + 48.5, 96.5); x.lineTo(ox + 79.5, 112.5); x.lineTo(ox + 48.5, 127.5); x.closePath(); x.stroke();
      cross(x, ox + 48, 112, 3);
      text(x, String(i + 1), ox + 94, 8, 7, LABEL, 'right');
    }
    text(x, clip(leaf(s.path), 21) + ' ' + s.cols + 'f', 2, 8, 7, TITLE);
  }
  function drawIcon(x, s, img) {
    const w = s.w, h = s.h;
    if (img && img.width >= 16) { x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.globalAlpha = 0.92; x.drawImage(img, 0, 0, img.width, img.height, 0, 0, w, h); x.globalAlpha = 1; }
    else { x.fillStyle = GREY; x.beginPath(); x.moveTo(w / 2, h * 0.16); x.lineTo(w * 0.84, h / 2); x.lineTo(w / 2, h * 0.84); x.lineTo(w * 0.16, h / 2); x.closePath(); x.fill(); }
    if (s.tint && img) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = s.tint; x.globalAlpha = 0.45; x.fillRect(0, 0, w, h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    x.strokeStyle = BORDER; x.lineWidth = 1; x.strokeRect(0.5, 0.5, w - 1, h - 1);
    cross(x, w >> 1, h >> 1, 3);
    if (w >= 48) text(x, clip(leaf(s.path), Math.floor(w / 3.6)), 2, h - 3, 6, TITLE);
  }
  function drawProj(x, s, img) {
    if (img) { x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, s.w, s.h); }
    else { x.fillStyle = GREY2; x.beginPath(); x.moveTo(26, 16); x.lineTo(10, 11); x.lineTo(10, 21); x.closePath(); x.fill(); }
    x.strokeStyle = BORDER; x.strokeRect(0.5, 0.5, s.w - 1, s.h - 1);
    cross(x, 16, 16, 2);
  }
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function drawFx(x, s) {
    const hex = (s.hex && s.hex[0]) || '#cfcfd8';
    for (let i = 0; i < s.cols; i++) {
      const t = (i + 1) / s.cols, cx = i * s.cw + s.ax, cy = s.ay, R = s.cw * (/lootbeam/.test(s.path) ? 0.22 : 0.12 + 0.3 * Math.sin(Math.min(1, t) * Math.PI * 0.85 + 0.2));
      for (let b = 0; b < 5; b++) {                   // flat bands, not a gradient: keeps the PNG tiny
        const rr = R * (1 - b * 0.18);
        x.fillStyle = rgba(hex, 0.16 + b * 0.1);
        if (/lootbeam/.test(s.path)) x.fillRect(cx - rr, 0, rr * 2, s.ch); else { x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); }
      }
    }
    borders(x, s);
    for (let i = 0; i < s.cols; i++) { cross(x, i * s.cw + s.ax, s.ay, 3); text(x, String(i + 1), (i + 1) * s.cw - 2, 8, 7, LABEL, 'right'); }
    text(x, clip(leaf(s.path), Math.floor(s.cw / 4.4)) + ' ' + s.cols + 'f', 2, 8, 7, TITLE);
  }
  function drawUi(x, s) {
    const opaque = /appicon|splash_|title_bg/.test(s.path);
    if (opaque) { x.fillStyle = '#1b1923'; x.fillRect(0, 0, s.w, s.h); }
    const cw = s.cw, ch = s.ch;
    for (let c = 0; c < s.cols; c++) {
      const ox = c * cw;
      if (!opaque) { x.fillStyle = 'rgba(110,110,125,0.30)'; x.fillRect(ox + 1, 1, cw - 2, ch - 2); }
      if (/orb|knob|joystick_base/.test(s.path)) { x.strokeStyle = 'rgba(190,190,200,0.5)'; x.lineWidth = 2; x.beginPath(); x.arc(ox + cw / 2, ch / 2, Math.min(cw, ch) * 0.42, 0, 7); x.stroke(); }
    }
    const n = Math.min(s.w, s.h);
    if (s.slice && s.slice * 2 < n) {          // 9-slice corner guides
      x.strokeStyle = 'rgba(255,200,80,0.55)'; x.setLineDash([3, 3]); x.beginPath();
      x.moveTo(s.slice + 0.5, 0); x.lineTo(s.slice + 0.5, s.h); x.moveTo(s.w - s.slice + 0.5, 0); x.lineTo(s.w - s.slice + 0.5, s.h);
      x.moveTo(0, s.slice + 0.5); x.lineTo(s.w, s.slice + 0.5); x.moveTo(0, s.h - s.slice + 0.5); x.lineTo(s.w, s.h - s.slice + 0.5); x.stroke(); x.setLineDash([]);
    }
    if (/appicon/.test(s.path)) { x.strokeStyle = 'rgba(255,200,80,0.55)'; x.setLineDash([4, 4]); x.strokeRect(s.w * 0.1 + 0.5, s.h * 0.1 + 0.5, s.w * 0.8, s.h * 0.8); x.setLineDash([]); }
    borders(x, s);
    const size = Math.max(6, Math.min(26, Math.floor(Math.min(cw, s.h) / 11))), nm = leaf(s.path);
    if (cw >= 40 && ch >= 20) {
      text(x, clip(nm, Math.max(4, Math.floor(cw / (size * 0.62)))), 3, size + 2, size, TITLE);
      if (ch >= size * 2 + 6) text(x, s.w + 'x' + s.h, 3, size * 2 + 4, size, LABEL);
    }
    if (s.cols > 1) for (let c = 0; c < s.cols; c++) text(x, String(c), c * cw + cw / 2, ch - 2, Math.min(7, size), LABEL, 'center');
  }
  function drawPortrait(x, s, img, src) {
    if (img && src === 'head') {
      const sc = img.height / 5;
      x.imageSmoothingEnabled = true; x.globalAlpha = 0.9;
      x.drawImage(img, sc * 0.2, sc * 0.1, sc * 0.6, sc * 0.6, 0, 0, s.w, s.h); x.globalAlpha = 1;
    } else if (img) { x.imageSmoothingEnabled = true; x.globalAlpha = 0.92; x.drawImage(img, 0, 0, s.w, s.h); x.globalAlpha = 1; }
    else {
      x.fillStyle = GREY; x.beginPath(); x.arc(s.w / 2, s.h * 0.4, s.w * 0.16, 0, 7); x.fill();
      x.beginPath(); x.moveTo(s.w * 0.2, s.h); x.quadraticCurveTo(s.w * 0.5, s.h * 0.45, s.w * 0.8, s.h); x.closePath(); x.fill();
    }
    x.strokeStyle = BORDER; x.strokeRect(0.5, 0.5, s.w - 1, s.h - 1);
    text(x, clip(leaf(s.path), 24), 2, s.h - 3, 7, TITLE);
  }

  // ---------------------------------------------------------------- PNG writer (indexed colour with alpha: ~4x smaller than canvas.toBlob RGBA)
  let CRC = null;
  function crc32(b, s, e) {
    if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
    let c = 0xffffffff;
    for (let i = s; i < e; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const b = new Uint8Array(12 + data.length), dv = new DataView(b.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i);
    b.set(data, 8);
    dv.setUint32(8 + data.length, crc32(b, 4, 8 + data.length));
    return b;
  }
  async function deflate(raw) {
    const s = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  // the first pass with <= 256 distinct colours wins; each later pass drops one more low bit of every channel
  function palettise(d, n) {
    for (let shift = 0; shift <= 5; shift++) {
      const map = new Map(), idx = new Uint8Array(n), pal = [];
      let ok = true;
      for (let i = 0; i < n; i++) {
        const o = i * 4, a = d[o + 3];
        const key = a === 0 ? 0 : (((d[o] >> shift) << 24 | (d[o + 1] >> shift) << 16 | (d[o + 2] >> shift) << 8 | (a >> shift)) >>> 0) + 1;
        let k = map.get(key);
        if (k === undefined) {
          if (pal.length >= 256) { ok = false; break; }
          k = pal.length; map.set(key, k); pal.push(a === 0 ? [0, 0, 0, 0] : [d[o], d[o + 1], d[o + 2], a]);
        }
        idx[i] = k;
      }
      if (ok) return { idx: idx, pal: pal, shift: shift };
    }
    return null;
  }
  PH.encodePng = async function (c) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, q = palettise(d, w * h);
    if (!q || typeof CompressionStream === 'undefined') return null;
    const raw = new Uint8Array((w + 1) * h);
    for (let y = 0; y < h; y++) raw.set(q.idx.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);
    const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
    dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 3;
    const plte = new Uint8Array(q.pal.length * 3), trns = new Uint8Array(q.pal.length);
    q.pal.forEach(function (p, i) { plte[i * 3] = p[0]; plte[i * 3 + 1] = p[1]; plte[i * 3 + 2] = p[2]; trns[i] = p[3]; });
    let nt = trns.length; while (nt > 0 && trns[nt - 1] === 255) nt--;
    const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte)];
    if (nt) parts.push(chunk('tRNS', trns.subarray(0, nt)));
    parts.push(chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array(0)));
    let len = 0; parts.forEach(function (p) { len += p.length; });
    const out = new Uint8Array(len); let o = 0; parts.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  };

  // ---------------------------------------------------------------- template lookup
  PH.templatePaths = function (s) {                // candidate assets_templates/ paths, best first
    const out = [], base = s.path.split('/').pop();
    if (s.po) out.push(/\.png$/.test(s.po) ? s.po : s.po + '/' + base.replace(/_p[23](?=\.png)/, '').replace(/_8(?=\.png)/, ''));
    if (s.kind === 'char' && s.phase) out.push(s.path.replace(/_p[23]\.png$/, '.png'));
    out.push(s.path);
    if (s.kind === 'tile') out.push('tiles/' + s.path.split('/').pop().split('_')[0] + '.png');
    if (s.kind === 'prop') out.push(s.path.replace(/_(crypt|caves|inferno|abyss)\.png$/, '.png'));
    if (s.kind === 'icon') {
      const m = /Fallback shape (\w+)/.exec(s.desc);
      if (m) out.push('icons/' + m[1] + '.png');
      if (/^icons\/(gems|blood|materials|consumables|relics|perks|skills|status|class)\//.test(s.path)) {
        const g = s.path.split('/')[1];
        out.push('icons/' + ({ gems: 'gem', blood: 'bloodstone', materials: 'rune', consumables: 'potion', relics: 'amulet', perks: 'star', skills: 'star', status: 'aura', class: 'star' }[g]) + '.png');
      }
    }
    if (s.kind === 'portrait') out.push('sprites/' + leaf(s.path) + '/idle.png');
    return out;
  };
  PH.drawArt = function (s, img, imgPath) {
    const c = mk(s.w, s.h), x = c.getContext('2d');
    if (s.kind === 'icon' && s.hex && s.hex.length && /icons\/(gems|blood)\//.test(s.path)) s.tint = s.hex[0];
    switch (s.kind) {
      case 'char': drawChar(x, s, img); break;
      case 'tile': drawTile(x, s, img); break;
      case 'prop': drawProp(x, s, img); break;
      case 'icon': drawIcon(x, s, img); break;
      case 'proj': drawProj(x, s, img); break;
      case 'fx': drawFx(x, s); break;
      case 'portrait': drawPortrait(x, s, img, imgPath && /^sprites\//.test(imgPath) ? 'head' : ''); break;
      default: drawUi(x, s);
    }
    return c;
  };
})();
