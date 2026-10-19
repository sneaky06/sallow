// Catalog parsers for the placeholder generator (tools/placeholders/gen.html).
//   PH.parseArt(markdownText)   docs/ART_CATALOG.md   -> { files: [spec], problems: [string] }
//   PH.parseSound(markdownText) docs/SOUND_DESIGN.md  -> { files: [spec], problems: [string] }
// One spec per file the lead dev has to produce, at its exact path (relative to assets/).
(function () {
  'use strict';
  const PH = window.PH = window.PH || {};
  const THEMES = ['crypt', 'caves', 'inferno', 'abyss'];
  const CLASSES = ['warrior', 'ranger', 'sorcerer', 'necromancer'];
  const ANIMS = ['idle', 'walk', 'attack', 'cast', 'hit', 'die'];

  // {a,b} and {1..8}, any number of groups -> every combination
  function braces(s) {
    const m = /\{([^{}]*)\}/.exec(s);
    if (!m) return [s];
    const r = /^(\d+)\.\.(\d+)$/.exec(m[1]);
    let parts;
    if (r) { parts = []; for (let i = +r[1]; i <= +r[2]; i++) parts.push(String(i)); } else parts = m[1].split(',');
    let out = [];
    parts.forEach(function (p) { out = out.concat(braces(s.slice(0, m.index) + p + s.slice(m.index + m[0].length))); });
    return out;
  }
  function cells(line) {
    // columns of a markdown table row; the description may contain "|" only escaped as "/" in this catalog
    const c = line.split('|');
    c.shift(); c.pop();
    return c.map(function (x) { return x.trim(); });
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  // ---------------------------------------------------------------- art
  function artKind(path) {
    const f = path.split('/')[0];
    if (f === 'sprites' || f === 'gear') return /\/(idle|walk|attack|cast|hit|die)(_p[23])?(_8)?\.png$/.test(path) ? 'char' : 'sheet';
    return { tiles: 'tile', props: 'prop', icons: 'icon', projectiles: 'proj', fx: 'fx', portraits: 'portrait', ui: 'ui' }[f] || 'other';
  }
  function num(s) { return parseInt(s, 10); }

  // canvas column (+ cell column) -> [[w,h], ...] for `n` files
  function canvases(canvas, cellCol, n, ctx) {
    let m;
    const sheet = /sheet (\d+) × (\d+)/.exec(cellCol) || /sheet (\d+) × (\d+)/.exec(canvas);
    if (sheet) return [[num(sheet[1]), num(sheet[2])]];
    let s = canvas.replace(/^≈\s*/, '').replace(/ each$/, '');
    if ((m = /^(\d+(?:\/\d+)+) × (\d+)/.exec(s))) {
      const ws = m[1].split('/').map(num), out = ws.map(function (w) { return [w, num(m[2])]; });
      if (out.length !== n) ctx.problems.push(ctx.row + ': ' + out.length + ' widths for ' + n + ' files');
      return out;
    }
    if ((m = /^(\d+) × \((\d+) × (\d+)\)$/.exec(s))) { const o = []; for (let i = 0; i < n; i++) o.push([num(m[2]), num(m[3])]); return o; }
    if ((m = /^(\d+)×(\d+) \/ (\d+)×(\d+)$/.exec(s))) return [[num(m[1]), num(m[2])], [num(m[3]), num(m[4])]];
    if ((m = /^(\d+) × (\d+)/.exec(s))) { const o = []; for (let i = 0; i < n; i++) o.push([num(m[1]), num(m[2])]); return o; }
    return null;
  }

  // names for a "<placeholder> (N files)" pattern, from the row's description
  function namesFor(pat, desc, n, ctx) {
    let m, out = null;
    if (/<theme>/.test(pat)) out = THEMES.map(function (t) { return pat.replace('<theme>', t); });
    else if (/skills\/dash_<class>/.test(pat)) out = CLASSES.map(function (c) { return 'icons/skills/dash_' + c + '.png'; });
    else if (/<class>/.test(pat)) out = CLASSES.map(function (c) { return pat.replace('<class>', c); });
    else if (/skills\/<id>|perks\/<id>/.test(pat)) {
      const re = /(?:^|[\s·:(,])([a-z][a-z0-9_]*)★?=[A-Z]/g, ids = [];
      while ((m = re.exec(desc))) ids.push(m[1]);
      out = ids.map(function (id) { return pat.replace('<id>', id); });
    } else if (/status\/<name>/.test(pat)) {
      const re = /(?:^|, )([a-z][a-z0-9_]*) = /g, ids = [];
      while ((m = re.exec(desc))) ids.push(m[1]);
      out = ids.map(function (id) { return pat.replace('<name>', id); });
    } else if (/<element>/.test(pat)) {
      const re = /\b(phys|fire|cold|lightning|poison|shadow) #/g, ids = [];
      while ((m = re.exec(desc))) ids.push(m[1]);
      out = ids.map(function (id) { return pat.replace('<element>', id); });
    } else if (/frame_<rarity>/.test(pat)) {
      const re = /\b(common|uncommon|rare|magic|legendary|mythic|unique|rift) #/g, ids = [];
      while ((m = re.exec(desc))) ids.push(m[1]);
      out = ids.map(function (id) { return pat.replace('<rarity>', id); });
    } else if (/glow_<rarity>/.test(pat)) {
      out = ['magic', 'legendary', 'mythic', 'unique', 'rift'].map(function (id) { return pat.replace('<rarity>', id); });      // "5 files used (magic...rift)"
    } else if (/slot_<slot>/.test(pat)) {
      m = /silhouettes \([^)]*\): ([a-z, ]+) \(/.exec(desc);
      out = m ? m[1].split(',').map(function (s) { return pat.replace('<slot>', s.trim()); }) : null;
    } else if (/act_card_<1\.\.4>/.test(pat)) out = [1, 2, 3, 4].map(function (i) { return pat.replace('<1..4>', i); });
    else if (/splash_<w>x<h>/.test(pat)) {
      const re = /(\d{3,4})×(\d{3,4})/g, o = [];
      while ((m = re.exec(desc))) o.push(pat.replace('<w>', m[1]).replace('<h>', m[2]));
      out = uniq(o);
    } else if (/appicon_<size>/.test(pat)) {
      const re = /(?:^|[:;] )(\d+) = /g, o = [];
      while ((m = re.exec(desc))) o.push(pat.replace('<size>', m[1]));
      out = o;
    }
    if (!out) { ctx.problems.push(ctx.row + ': cannot expand "' + pat + '"'); return []; }
    return out;
  }

  PH.parseArt = function (text) {
    const lines = text.split('\n'), files = [], problems = [];
    let sec = '', group = '';
    lines.forEach(function (raw, li) {
      const line = raw.replace(/\r$/, '');
      let m;
      if ((m = /^### (\S+)/.exec(line))) group = m[1];
      if ((m = /^#### (\S+)/.exec(line))) sec = m[1];
      if (!/^\| `/.test(line)) return;
      const c = cells(line);
      if (c.length < 9) { problems.push('line ' + (li + 1) + ': ' + c.length + ' columns'); return; }
      const ctx = { problems: problems, row: sec + ' line ' + (li + 1) };
      let fcol = c[0].replace(/^`|`$/g, '');
      let count = null;
      if ((m = /^(.*?)`? \((\d+) files\)$/.exec(fcol))) { fcol = m[1]; count = +m[2]; }
      let names;
      if (/</.test(fcol)) {
        names = namesFor(fcol, c[5], count, ctx);
        if (count != null && names.length !== count && !/glow_<rarity>/.test(fcol)) problems.push(ctx.row + ': "' + fcol + '" says ' + count + ' files, description gives ' + names.length);
      } else names = braces(fcol);
      let sizes = canvases(c[1], c[2], names.length, ctx);
      if (!sizes && /splash_|appicon_/.test(fcol)) {
        sizes = names.map(function (p) {
          let q = /splash_(\d+)x(\d+)\.png$/.exec(p), r = /appicon_(\d+)\.png$/.exec(p);
          return q ? [num(q[1]), num(q[2])] : [num(r[1]), num(r[1])];
        });
      }
      if (!sizes) { problems.push(ctx.row + ': unreadable canvas "' + c[1] + '" for ' + fcol); return; }
      // paint-over: assets_templates/<file or folder>
      let po = null;
      if ((m = /assets_templates\/([a-z0-9_\/]+(?:\.png)?)/.exec(c[6]))) po = m[1];
      names.forEach(function (path, i) {
        let wh = sizes[i] || sizes[sizes.length - 1];
        const spec = { path: path, kind: artKind(path), sec: sec, group: group, pri: c[7], loader: c[8], desc: c[5], cellCol: c[2], frameCol: c[3], anchorCol: c[4], w: wh[0], h: wh[1], po: po, hex: (c[5].match(/#[0-9a-fA-F]{6}\b/g) || []) };
        if (!/^[a-z0-9_]+(\/[a-z0-9_]+)+\.png$/.test(path)) problems.push(ctx.row + ': odd path ' + path);
        // geometry per kind
        if (spec.kind === 'char') {
          const cm = /(\d+)×(\d+)/.exec(c[2]), am = /\((\d+), (\d+)\)/.exec(c[4]);
          spec.cw = spec.ch = cm ? num(cm[1]) : 96;
          spec.cols = Math.round(spec.w / spec.cw); spec.rows = Math.round(spec.h / spec.ch);
          spec.ax = am ? num(am[1]) : spec.cw / 2; spec.ay = am ? num(am[2]) : Math.round(spec.ch * 0.875);
          if (spec.cols * spec.cw !== spec.w || spec.rows * spec.ch !== spec.h) problems.push(ctx.row + ': ' + path + ' ' + spec.w + 'x' + spec.h + ' is not a whole number of ' + spec.cw + ' cells');
          if (/_8\.png$/.test(path)) spec.rows = 8;
          const sc = /scale ×([\d.]+)/.exec(c[5]);
          spec.scale = sc ? parseFloat(sc[1]) : 1;
          spec.anim = (/\/(idle|walk|attack|cast|hit|die)/.exec(path) || [])[1];
          spec.phase = (/_p([23])\.png$/.exec(path) || [])[1] || null;
        } else if (spec.kind === 'tile') {
          spec.cw = 64; spec.ch = 96; spec.cols = 4; spec.rows = 14; spec.ax = 32; spec.ay = 80;
        } else if (spec.kind === 'prop') {
          spec.cw = 96; spec.ch = 128; spec.cols = Math.round(spec.w / 96); spec.rows = 1; spec.ax = 48; spec.ay = 112;
        } else if (spec.kind === 'fx') {
          if (sec === 'J5') {
            const big = /telegraph|pool_/.test(path), nf = /(\d+) frames/.exec(c[5]);
            spec.ch = spec.cw = big ? 256 : 128;
            spec.cols = nf ? num(nf[1]) : 12; spec.rows = 1;
            spec.w = spec.cols * spec.cw; spec.h = spec.ch;
            spec.approx = true;
          } else { spec.ch = spec.cw = spec.h; spec.cols = Math.round(spec.w / spec.cw); spec.rows = 1; }
          spec.ax = spec.cw / 2; spec.ay = /lootbeam/.test(path) ? spec.ch - 8 : spec.ch / 2;
        } else {
          spec.cw = spec.w; spec.ch = spec.h; spec.cols = 1; spec.rows = 1;
          if (spec.kind === 'proj') { spec.ax = 16; spec.ay = 16; }
          const sm = /corners (\d+) px/.exec(c[2]);
          if (sm) spec.slice = num(sm[1]);
          if (/sheet/.test(c[2]) || /sheet/.test(c[1])) {
            const n8 = /^(\d+) × \(/.exec(c[1]);
            if (n8) { spec.cols = num(n8[1]); spec.cw = spec.w / spec.cols; }
          }
        }
        files.push(spec);
      });
    });
    // duplicates would silently overwrite each other
    const seen = {}, uniqFiles = [];
    files.forEach(function (f) {
      if (seen[f.path]) { problems.push('duplicate path ' + f.path + ' (listed in ' + seen[f.path] + ' and ' + f.sec + '; one file written)'); return; }
      seen[f.path] = f.sec; uniqFiles.push(f);
    });
    return { files: uniqFiles, problems: problems };
  };

  // ---------------------------------------------------------------- sound
  function seconds(s) {
    let m;
    if ((m = /^(\d+):(\d+)$/.exec(s))) return num(m[1]) * 60 + num(m[2]);
    if ((m = /^([\d.]+)s$/.exec(s))) return parseFloat(m[1]);
    return null;
  }
  PH.parseSound = function (text) {
    const lines = text.split('\n'), files = [], problems = [], names = {};
    let folder = null, sec = '';
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li].replace(/\r$/, '');
      let m;
      if (/^## 5\./.test(line)) break;
      if ((m = /^#### (.+)$/.exec(line))) sec = m[1];
      if ((m = /^`assets\/sound\/([^`]*)`/.exec(line))) { folder = m[1].replace(/\/$/, ''); continue; }
      if (!(m = /^\| `([a-z0-9_]+)` \| (\d+) \|/.exec(line))) continue;
      const c = cells(line), name = m[1], vars = num(m[2]), len = seconds(c[2]);
      if (c.length < 7 || len == null || folder == null) { problems.push('line ' + (li + 1) + ': unreadable row for ' + name); continue; }
      const loop = /loop/.test(c[3]), stereo = /^stereo/.test(c[3]);
      for (let v = 1; v <= vars; v++) {
        const file = v === 1 ? name : name + '_' + v;
        if (names[file]) problems.push('duplicate sound name ' + file + ' (' + names[file] + ' and ' + folder + ')');
        names[file] = folder;
        files.push({ path: 'sound/' + (folder ? folder + '/' : '') + file + '.wav', name: file, base: name, variant: v, vars: vars, folder: folder, sec: sec, len: len, loop: loop, stereo: stereo, pri: c[4], today: /✔/.test(c[5]), desc: c[6] });
      }
    }
    return { files: files, problems: problems };
  };
})();
