// Driver of tools/placeholders/gen.html: parse the two catalogs, render every placeholder, POST it to tools/placeholders/receiver.ps1.
(function () {
  'use strict';
  const PH = window.PH, Q = new URLSearchParams(location.search);
  const RECV = 'http://localhost:' + (Q.get('port') || '8398') + '/';
  const $ = function (id) { return document.getElementById(id); };
  const out = function (s) { $('out').textContent = s; };
  const DRY = Q.get('dry') === '1', ONLY = Q.get('only') || '', LIMIT = +Q.get('limit') || 0;

  function post(path, body) {
    const go = function () { return fetch(RECV + '?p=' + encodeURIComponent(path), { method: 'POST', body: body }).then(function (r) { if (!r.ok) throw new Error(path + ' -> HTTP ' + r.status); }); };
    return go().catch(function () { return go(); });
  }
  function pool(items, n, fn) {
    let i = 0, done = 0;
    return new Promise(function (res) {
      if (!items.length) return res();
      const next = function () {
        if (i >= items.length) return;
        const k = i++;
        Promise.resolve().then(function () { return fn(items[k], k); }).catch(function (e) { fn.errors.push(String(e && e.message || e)); }).then(function () { if (++done === items.length) res(); else next(); });
      };
      for (let j = 0; j < n && j < items.length; j++) next();
    });
  }

  // ---------------------------------------------------------------- engine (for the synth)
  function loadScript(src) {
    return new Promise(function (res) {
      const s = document.createElement('script');
      s.src = src; s.async = false; s.onload = res; s.onerror = function () { console.error('missing ' + src); res(); };
      document.body.appendChild(s);
    });
  }
  async function loadEngine() {
    window.G = { manifest: {} };
    for (const f of ['constants.js', 'events.js', 'rng.js', 'state.js', 'scenes.js']) await loadScript('../../src/core/' + f);
    await loadScript('../../src/engine/manifest.js');
    for (const f of (window.G.manifest.engine || [])) await loadScript('../../src/engine/' + f);
    return window.G.engine && window.G.engine._ && window.G.engine._.audio;
  }

  // ---------------------------------------------------------------- art
  const imgCache = new Map();
  function loadImg(rel) {
    if (imgCache.has(rel)) return imgCache.get(rel);
    const p = new Promise(function (res) {
      const im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = '../../assets_templates/' + rel;
    });
    if (imgCache.size > 48) imgCache.delete(imgCache.keys().next().value);
    imgCache.set(rel, p);
    return p;
  }
  function blobOf(c) { return new Promise(function (res) { c.toBlob(res, 'image/png'); }); }

  async function doArt(files, report) {
    const st = report.art = { files: files.length, written: 0, bytes: 0, sketch: 0, plain: 0, byKind: {}, errors: [], missingTemplates: [] };
    const fn = async function (s, k) {
      let img = null, from = null;
      for (const cand of PH.templatePaths(s)) { img = await loadImg(cand); if (img) { from = cand; break; } }
      const c = PH.drawArt(s, img, from);
      if (c.width !== s.w || c.height !== s.h) throw new Error(s.path + ': drew ' + c.width + 'x' + c.height + ', wanted ' + s.w + 'x' + s.h);
      const png = await PH.encodePng(c), b = png ? new Blob([png], { type: 'image/png' }) : await blobOf(c);
      if (!png) st.rgba = (st.rgba || 0) + 1;
      if (!DRY) await post('assets/' + s.path, b);
      st.written++; st.bytes += b.size; if (img) st.sketch++; else st.plain++;
      const bk = st.byKind[s.kind] || (st.byKind[s.kind] = { n: 0, bytes: 0, sketch: 0 }); bk.n++; bk.bytes += b.size; if (img) bk.sketch++;
      if (!img && s.po) st.missingTemplates.push(s.path);
      if (k < 40) $('grid').appendChild(c);
      if (st.written % 100 === 0) out('art ' + st.written + '/' + files.length + ' (' + Math.round(st.bytes / 1048576) + ' MB)');
    };
    fn.errors = st.errors;
    await pool(files, 4, fn);
  }

  // ---------------------------------------------------------------- sound
  async function doSound(files, report, audioApi) {
    const st = report.sound = { files: files.length, written: 0, bytes: 0, synth: 0, standin: 0, seconds: 0, errors: [], synthNames: [] };
    const fn = async function (f) {
      const r = await PH.sound(f, audioApi);
      if (!DRY) await post('assets/' + f.path, new Blob([r.bytes]));
      st.written++; st.bytes += r.bytes.length; st.seconds += r.seconds;
      if (r.kind === 'synth') { st.synth++; if (st.synthNames.indexOf(f.base) < 0) st.synthNames.push(f.base); } else st.standin++;
      if (st.written % 200 === 0) out('sound ' + st.written + '/' + files.length + ' (' + Math.round(st.bytes / 1048576) + ' MB)');
    };
    fn.errors = st.errors;
    await pool(files, 3, fn);
  }

  async function run(what) {
    const report = { when: new Date().toISOString(), dry: DRY, problems: [], done: false };
    window.__PH = report;
    try {
      const art = PH.parseArt(await (await fetch('../../docs/ART_CATALOG.md', { cache: 'no-store' })).text());
      const snd = PH.parseSound(await (await fetch('../../docs/SOUND_DESIGN.md', { cache: 'no-store' })).text());
      report.problems = art.problems.concat(snd.problems);
      const pick = function (l, key) { l = l.filter(function (f) { return !ONLY || ONLY.split(",").some(function (o) { return f.path.indexOf(o) === 0; }); }); return LIMIT ? l.slice(0, LIMIT) : l; };
      if (what === 'art' || what === 'both') await doArt(pick(art.files), report);
      if (what === 'sound' || what === 'both') {
        const audioApi = await loadEngine();
        report.sound0 = { audio: !!audioApi, renderOffline: !!(audioApi && audioApi.renderOffline) };
        await doSound(pick(snd.files), report, audioApi);
      }
      report.catalogs = { art: art.files.length, sound: snd.files.length };
      if (!DRY && !ONLY && !LIMIT) await post('tools/placeholders/report.json', new Blob([JSON.stringify(report, null, 1)]));
    } catch (e) { report.fatal = String(e && e.stack || e); }
    report.done = true;
    out('done: ' + JSON.stringify({ art: report.art && { n: report.art.written, mb: +(report.art.bytes / 1048576).toFixed(1), err: report.art.errors.length }, sound: report.sound && { n: report.sound.written, mb: +(report.sound.bytes / 1048576).toFixed(1), err: report.sound.errors.length }, fatal: report.fatal }));
  }
  $('bArt').onclick = function () { run('art'); };
  $('bSnd').onclick = function () { run('sound'); };
  $('bBoth').onclick = function () { run('both'); };
  const auto = Q.get('auto');
  if (auto) setTimeout(function () { run(auto); }, 200);
})();
