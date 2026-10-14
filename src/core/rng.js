// Seeded RNG (mulberry32). G.rng.create(seed) for deterministic generation, G.rng.global for everything else.
(function () {
  'use strict';
  const G = window.G;

  function create(seed) {
    let s = (seed >>> 0) || 1;
    const r = {
      next() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range(a, b) { return a + r.next() * (b - a); },          // float in [a, b)
      int(a, b) { return a + Math.floor(r.next() * (b - a + 1)); }, // integer in [a, b]
      chance(p) { return r.next() < p; },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      // entries: [{ w: weight, ... }] -> returns the chosen entry
      weighted(entries) {
        let total = 0;
        for (const e of entries) total += e.w;
        let roll = r.next() * total;
        for (const e of entries) { roll -= e.w; if (roll < 0) return e; }
        return entries[entries.length - 1];
      },
      shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(r.next() * (i + 1));
          const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
      },
    };
    return r;
  }

  G.rng = { create, global: create((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0) };
})();
