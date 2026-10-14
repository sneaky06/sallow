// Service worker: after the first visit the whole game starts and plays with no network.
//
// RELEASING: change VERSION below every time you deploy changed files. That is the only switch — the browser sees
// sw.js changed, the new worker downloads a complete fresh copy of the game into its own cache next to the old one,
// and takes over on the next launch (or at once if the player taps "Update now" in the menu). The running game is
// never fed a mix of old and new files. Saves live in localStorage, which no cache operation ever touches.
const VERSION = 'emberdeep-v7';      // cache key prefix stays 'emberdeep-' so old caches are found and deleted
const STATUS_URL = '__offline-status';

// The shell is listed here; every team's scripts are discovered from src/<team>/manifest.js and hand-drawn art from
// assets/assets.js at install time, so this file needs no edit when files are added. A missing file is skipped and
// reported in the status, never fatal.
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'src/core/constants.js', 'src/core/events.js', 'src/core/rng.js', 'src/core/state.js', 'src/core/scenes.js', 'src/core/main.js',
  'assets/assets.js',
];
const TEAMS = ['engine', 'world', 'items', 'game', 'ui'];

// On a dev box (serve.ps1) always prefer the network, or edits would never show up.
const DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(self.location.hostname) || /\.(localhost|test)$/.test(self.location.hostname);

function text(url) {
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

function fileList() {
  const jobs = TEAMS.map(function (team) {
    const url = 'src/' + team + '/manifest.js';
    return text(url).then(function (src) {
      return (src ? [url] : []).concat(listed(src).map(function (f) { return 'src/' + team + '/' + f; }));
    });
  });
  jobs.push(text('assets/assets.js').then(function (src) { return listed(src).map(function (f) { return 'assets/' + f; }); }));
  return Promise.all(jobs).then(function (lists) {
    const all = SHELL.concat.apply(SHELL, lists);
    return all.filter(function (f, i) { return all.indexOf(f) === i; });
  });
}

function precache() {
  return caches.open(VERSION).then(function (cache) {
    return fileList().then(function (files) {
      const missing = [];
      return Promise.all(files.map(function (f) {
        return fetch(f, { cache: 'no-cache' })
          .then(function (res) { if (res && res.ok) return cache.put(f, res); missing.push(f); })
          .catch(function () { missing.push(f); });
      })).then(function () {
        const status = { version: VERSION, files: files.length, cached: files.length - missing.length, missing: missing, at: Date.now() };
        return cache.put(STATUS_URL, new Response(JSON.stringify(status), { headers: { 'Content-Type': 'application/json' } }));
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
        return Promise.all(keys.filter(function (k) { return k.indexOf('emberdeep-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  const msg = event.data || {};
  if (msg.type === 'skip-waiting') { self.skipWaiting(); return; }
  if (msg.type === 'status' && event.ports && event.ports[0]) {
    const port = event.ports[0];
    event.waitUntil(caches.open(VERSION)
      .then(function (cache) { return cache.match(STATUS_URL); })
      .then(function (res) { return res ? res.json() : null; })
      .then(function (status) { port.postMessage(status || { version: VERSION, files: 0, cached: 0, missing: [] }); })
      .catch(function () { port.postMessage(null); }));
  }
  if (msg.type === 'recache') event.waitUntil(precache());       // "repair" from the menu when files were missing
});

function fromNetwork(request, cache) {
  return fetch(request).then(function (res) {
    if (res && res.ok && res.type === 'basic') cache.put(request, res.clone());
    return res;
  });
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(function (cache) {
      if (DEV) {
        return fromNetwork(req, cache).catch(function () {
          return cache.match(req, { ignoreSearch: true }).then(function (hit) { return hit || Response.error(); });
        });
      }
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fromNetwork(req, cache).catch(function () {
          // offline navigation to an uncached URL: fall back to the app shell
          return req.mode === 'navigate' ? cache.match('index.html').then(function (r) { return r || Response.error(); }) : Response.error();
        });
      });
    })
  );
});
