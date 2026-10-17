// Service worker: after the first visit the whole game starts and plays with no network.
//
// RELEASING: change VERSION below every time you deploy changed files. That is the only switch — the browser sees
// sw.js changed, the new worker downloads a complete fresh copy of the GAME CODE into its own cache next to the old one,
// and takes over on the next launch (or at once if the player taps "Update now" in the menu). The running game is
// never fed a mix of old and new files. Saves live in localStorage, which no cache operation ever touches.
//
// Two caches: `emberdeep-shell-<VERSION>` holds the code (index.html, every src/ file, icons) and is installed ATOMICALLY — if any
// one of those files fails to download the install is rejected and the old worker keeps serving the old, complete build.
// `emberdeep-assets-v1` holds art and sound; it survives releases, a file is fetched once (cache-first) and music is never
// pre-downloaded, so a deploy does not re-download the assets and a failed asset never blocks an update.
const VERSION = 'emberdeep-v28';      // cache key prefix stays 'emberdeep-' so old caches are found and deleted
const SHELL_CACHE = 'emberdeep-shell-' + VERSION.replace(/^emberdeep-/, '');
const ASSET_CACHE = 'emberdeep-assets-v1';
const ASSET_MAX = 3000;               // entries kept in the asset cache (oldest-added dropped first)
const STATUS_URL = '__offline-status';

// The shell is listed here; every team's scripts are discovered from src/<team>/manifest.js and hand-drawn art from
// assets/assets.js at install time, so this file needs no edit when files are added.
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'src/core/constants.js', 'src/core/events.js', 'src/core/rng.js', 'src/core/state.js', 'src/core/scenes.js', 'src/core/main.js',
  'assets/assets.js',
];
const TEAMS = ['engine', 'world', 'items', 'game', 'ui'];

// On a dev box (serve.ps1) always prefer the network, or edits would never show up.
const DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(self.location.hostname) || /\.(localhost|test)$/.test(self.location.hostname);

// Text of a file that MUST exist: a failed fetch rejects, which fails the install.
function mustText(url) {
  return fetch(url, { cache: 'no-cache' }).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
    return res.text();
  });
}
// Text of an optional file: '' when it is missing.
function maybeText(url) {
  return fetch(url, { cache: 'no-cache' }).then(function (res) { return res.ok ? res.text() : ''; }).catch(function () { return ''; });
}

// Quoted strings inside the first [...] of a script, ignoring // and /* */ comments.
function listed(src) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([,\[\s])\/\/.*$/gm, '$1');
  const list = /=\s*\[([\s\S]*?)\]/.exec(code);
  const out = [];
  if (list) {
    const re = /['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(list[1]))) out.push(m[1]);
  }
  return out;
}

function unique(all) { return all.filter(function (f, i) { return all.indexOf(f) === i; }); }

// -> { code: [files that must download], assets: [art / sound that may fail] }
function fileList() {
  const jobs = TEAMS.map(function (team) {
    const url = 'src/' + team + '/manifest.js';
    return mustText(url).then(function (src) { return [url].concat(listed(src).map(function (f) { return 'src/' + team + '/' + f; })); });
  });
  return Promise.all(jobs).then(function (lists) {
    return maybeText('assets/assets.js').then(function (src) {
      const assets = listed(src).map(function (f) { return 'assets/' + f; });
      return { code: unique(SHELL.concat.apply(SHELL, lists)), assets: unique(assets) };
    });
  });
}

function fetchPut(cache, f, missing) {
  return fetch(f, { cache: 'no-cache' })
    .then(function (res) { if (res && res.ok) return cache.put(f, res); missing.push(f); })
    .catch(function () { missing.push(f); });
}

// a few at a time: thousands of parallel fetches during an install are slow and can run a phone out of memory
function putAll(cache, files, missing, onlyNew) {
  let i = 0;
  function lane() {
    if (i >= files.length) return Promise.resolve();
    const f = files[i++];
    const job = onlyNew ? cache.match(f).then(function (hit) { return hit ? null : fetchPut(cache, f, missing); }) : fetchPut(cache, f, missing);
    return job.then(lane);
  }
  return Promise.all([lane(), lane(), lane(), lane(), lane(), lane()]);
}

function precache() {
  return fileList().then(function (lists) {
    return caches.open(SHELL_CACHE).then(function (shell) {
      const codeMissing = [];
      return putAll(shell, lists.code, codeMissing, false).then(function () {
        // all or nothing: a build with a hole in it is worse than the old complete one
        if (codeMissing.length) throw new Error('install failed, missing: ' + codeMissing.join(', '));
        return caches.open(ASSET_CACHE);
      }).then(function (assets) {
        const missing = [];
        const art = lists.assets.filter(function (f) { return !/(^|\/)music(\/|$)/i.test(f); });       // music is fetched when played
        return putAll(assets, art, missing, true).then(function () {
          const total = lists.code.length + art.length;
          const status = { version: VERSION, files: total, cached: total - missing.length, missing: missing, at: Date.now() };
          return shell.put(STATUS_URL, new Response(JSON.stringify(status), { headers: { 'Content-Type': 'application/json' } }));
        });
      });
    });
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(precache().then(function () {
    // First ever install: take over straight away so the very first visit ends offline-ready.
    // An update waits instead, so a game in progress keeps the files it started with.
    if (!self.registration.active) return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        // old versions' caches (including the pre-split 'emberdeep-v25' style) go; the current shell and the asset cache stay
        return Promise.all(keys.filter(function (k) { return k.indexOf('emberdeep-') === 0 && k !== SHELL_CACHE && k !== ASSET_CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  const msg = event.data || {};
  if (msg.type === 'skip-waiting') { self.skipWaiting(); return; }
  if (msg.type === 'status' && event.ports && event.ports[0]) {
    const port = event.ports[0];
    event.waitUntil(caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.match(STATUS_URL); })
      .then(function (res) { return res ? res.json() : null; })
      .then(function (status) { port.postMessage(status || { version: VERSION, files: 0, cached: 0, missing: [] }); })
      .catch(function () { port.postMessage(null); }));
  }
  if (msg.type === 'recache') event.waitUntil(precache().catch(function () { /* stays as it was; the menu shows the status */ }));       // "repair" from the menu
});

function isAsset(url) { return /\/assets\//.test(new URL(url).pathname) && !/assets\.js$/.test(url); }

function fromNetwork(request, cache) {
  return fetch(request).then(function (res) {
    if (res && res.ok && res.type === 'basic') cache.put(request, res.clone());
    return res;
  });
}

// keep the asset cache bounded: drop the oldest-added entries beyond ASSET_MAX
function trimAssets(cache) {
  return cache.keys().then(function (keys) {
    if (keys.length <= ASSET_MAX) return;
    return Promise.all(keys.slice(0, keys.length - ASSET_MAX).map(function (k) { return cache.delete(k); }));
  });
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const asset = isAsset(req.url);
  event.respondWith(
    caches.open(asset ? ASSET_CACHE : SHELL_CACHE).then(function (cache) {
      if (DEV && !asset) {
        return fromNetwork(req, cache).catch(function () {
          return cache.match(req, { ignoreSearch: true }).then(function (hit) { return hit || Response.error(); });
        });
      }
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fromNetwork(req, cache).then(function (res) { if (asset) event.waitUntil(trimAssets(cache)); return res; }).catch(function () {
          // offline navigation to an uncached URL: fall back to the app shell
          return req.mode === 'navigate' ? caches.open(SHELL_CACHE).then(function (c) { return c.match('index.html'); }).then(function (r) { return r || Response.error(); }) : Response.error();
        });
      });
    })
  );
});
