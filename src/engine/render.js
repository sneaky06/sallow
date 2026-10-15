// Canvas setup, camera, isometric renderer, lighting, overlays, minimap and the public G.engine API.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const C = G.C, T = C.TILE, HW = C.TILE_W / 2, HH = C.TILE_H / 2;
  const V = U.view = {
    canvas: null, ctx: null, W: 270, H: 480, R: 1, mode: 'auto', autoLow: false, scale: 1, left: 0, top: 0,
    camX: 0, camY: 0, offX: 0, offY: 0, time: 0, snap: true, lastMap: null, info: null, mapT: 0,
  };
  let lightC = null, lightX = null, LW = 1, LH = 1;
  let backdrop = null;
  let trailT = 0, sparkT = 0;

  // ---------------------------------------------------------------- sizing
  // state.settings.graphics = 'auto' (default) | 'high' | 'low'. In auto, a device that cannot hold ~42 fps for 4 s
  // drops to 'low' for the rest of the session (V.autoLow).
  function gfxMode() {
    const S = G.state, g = S && S.settings && S.settings.graphics;
    if (g === 'high' || g === 'low') return g;
    return V.autoLow ? 'low' : 'auto';
  }
  const perf = { ema: 1 / 60, slow: 0, poll: 0 };
  function watchPerf(dt) {
    if (dt > 0 && dt < 0.25) {
      perf.ema += (dt - perf.ema) * 0.05;
      perf.slow = perf.ema > 1 / 42 && V.mode === 'auto' && V.R > 1 ? perf.slow + dt : 0;
      if (perf.slow > 4) { V.autoLow = true; perf.slow = 0; resize(); }
    }
    if ((perf.poll -= dt) <= 0) { perf.poll = 0.5; if (gfxMode() !== V.mode) resize(); }
  }
  function resize() {
    const c = V.canvas;
    if (!c) return;
    c.style.width = ''; c.style.height = '';
    const r = c.getBoundingClientRect();
    const cw = Math.max(32, r.width || window.innerWidth || 320), ch = Math.max(32, r.height || window.innerHeight || 480);
    const dpr = window.devicePixelRatio || 1;
    const short = Math.min(cw, ch) * dpr;
    // integer device-pixel scale that lands the short axis nearest 270 logical px; fractional only if none fits
    let k = 0, best = 1e9;
    for (let i = 1; i <= 16; i++) {
      const l = short / i;
      if (l >= 216 && l <= 340 && Math.abs(l - 270) < best) { best = Math.abs(l - 270); k = i; }
    }
    if (!k) k = Math.max(1, short / 270);
    // R6.4: the backing store is R x the logical size; j = whole device px per backing px, so it always maps cleanly.
    // auto: R near 2 (1.5 on 3x-scale phones such as iPhone 6-8, 2 on newer ones); low: R 1 (the old look); high: native.
    const mode = gfxMode(), j = mode === 'low' ? k : mode === 'high' || k < 2 ? 1 : Math.max(1, Math.round(k / 2));
    const R = k / j, step = Number.isInteger(R) ? 1 : j;
    const W = Math.max(64, Math.ceil(cw * dpr / k / step) * step), H = Math.max(64, Math.ceil(ch * dpr / k / step) * step);
    const BW = Math.round(W * R), BH = Math.round(H * R);
    if (c.width !== BW) c.width = BW;
    if (c.height !== BH) c.height = BH;
    V.W = W; V.H = H; V.R = R; V.mode = mode; V.scale = k / dpr; V.left = r.left; V.top = r.top;
    c.style.width = (W * V.scale) + 'px'; c.style.height = (H * V.scale) + 'px';
    c.style.imageRendering = Number.isInteger(j) ? 'pixelated' : 'auto';
    V.ctx.imageSmoothingEnabled = false;
    LW = Math.ceil(W / 2); LH = Math.ceil(H / 2);
    if (!lightC) { lightC = U.makeCanvas(LW, LH); lightX = U.ctx2d(lightC); }
    else if (lightC.width !== LW || lightC.height !== LH) { lightC.width = LW; lightC.height = LH; lightX.imageSmoothingEnabled = false; }
    backdrop = null;
  }

  E.init = function (canvas) {
    if (!canvas || !canvas.getContext) return;
    if (V.canvas === canvas) { resize(); return; }
    V.canvas = canvas;
    V.ctx = canvas.getContext('2d', { alpha: false });
    canvas.style.imageRendering = 'pixelated';
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 60); setTimeout(resize, 400); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    U.input.init(canvas);
    if (U.assets) U.assets.load();
  };

  E.worldToScreen = function (x, y) {
    return { x: ((x - y) * HW - V.offX) * V.scale + V.left, y: ((x + y) * HH - V.offY) * V.scale + V.top };
  };
  E.screenToWorld = function (sx, sy) {
    const lx = (sx - V.left) / V.scale + V.offX, ly = (sy - V.top) / V.scale + V.offY;
    return { x: lx / C.TILE_W + ly / C.TILE_H, y: ly / C.TILE_H - lx / C.TILE_W };
  };

  // ---------------------------------------------------------------- update
  function camTarget(out) {
    const S = G.state, p = S.player, map = S.map;
    if (p && isFinite(p.x) && isFinite(p.y)) { out.x = p.x; out.y = p.y; }
    else if (map && map.spawn) { out.x = map.spawn.x + 0.5; out.y = map.spawn.y + 0.5; }
    else if (map) { out.x = map.w / 2; out.y = map.h / 2; }
    else { out.x = out.y = 0; }
  }
  const tgt = { x: 0, y: 0 };
  function computeOffsets() {
    // snapped to whole backing pixels, so 2x art scrolls smoothly instead of in logical-pixel steps
    V.offX = Math.round(((V.camX - V.camY) * HW - V.W / 2) * V.R) / V.R;
    V.offY = Math.round(((V.camX + V.camY) * HH - V.H / 2 - 8) * V.R) / V.R;
  }

  E.update = function (dt) {
    if (!(dt > 0)) dt = 0;
    V.time += dt;
    V.dt = dt;
    watchPerf(dt);
    const S = G.state, map = S.map;
    if (map !== V.lastMap) { V.lastMap = map; V.snap = true; V.info = null; V.mapT = V.time; }
    if (glint.t > 0) glint.t -= dt;
    camTarget(tgt);
    if (V.snap || Math.abs(tgt.x - V.camX) + Math.abs(tgt.y - V.camY) > 8) { V.camX = tgt.x; V.camY = tgt.y; V.snap = false; }
    else { const k = 1 - Math.exp(-dt * 12); V.camX += (tgt.x - V.camX) * k; V.camY += (tgt.y - V.camY) * k; }
    computeOffsets();
    U.fx.update(dt);
    U.audio.setBed(map && S.scene !== 'menu' ? U.rift.bed(U.variant.get(map).sound) : 'none', pal.tier);
    U.rift.update(dt, map);
    if ((V.musT -= dt) <= 0 || map !== V.musMap) { V.musT = 0.5; V.musMap = map; U.audio.setMusic(musicTrack(S, map)); }
    U.audio.tick();
    if (!map || S.scene === 'menu') return;

    // projectile trails
    trailT += dt;
    if (trailT >= (lowFx() ? 0.1 : 0.045)) {
      trailT = 0;
      const ps = S.projectiles || [], n = Math.min(ps.length, 40);
      for (let i = 0; i < n; i++) {
        const p = ps[i];
        if (!p || p.shape === 'arrow') continue;
        const c = U.projectileColor(p.shape, p.color);
        if (p.shape === 'fireball') U.fx.particle(p.x, p.y, 12, 0, 0, 12, 0.3, 2, Math.random() < 0.5 ? '#ff8a1e' : '#ffd84a', -20);
        else if (p.shape === 'spit') U.fx.particle(p.x, p.y, 11, 0, 0, 0, 0.3, 1, c, 120);
        else U.fx.particle(p.x, p.y, 12, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 4, 0.22, 1, c, 0);
      }
    }
    // sparkles on epic+ drops
    sparkT += dt;
    if (sparkT >= 0.13) {
      sparkT = 0;
      const gs = S.groundItems || [], n = Math.min(gs.length, 120);
      for (let i = 0; i < n; i++) {
        const g = gs[i], r = g && g.item && C.RARITY[g.item.rarity];
        if (r && glowOf(g.item.rarity) >= 3 && filterAllows(g) && Math.random() < 0.45 && (!map.explored || map.explored[Math.floor(g.y) * map.w + Math.floor(g.x)])) {
          U.fx.particle(g.x + (Math.random() - 0.5) * 0.5, g.y + (Math.random() - 0.5) * 0.5, 2, 0, 0, 26 + Math.random() * 20, 0.6, 1, Math.random() < 0.3 ? '#ffffff' : r.color, -4);
        }
      }
    }
  };

  // R6.4 music: title / town / theme (rift past depth 20); boss or echo while one is alive and close
  function musicTrack(S, map) {
    if (!map || S.scene === 'menu') return 'title';
    if (map.kind === 'town' || S.scene === 'town') return 'town';
    const p = S.player, es = S.entities || [];
    if (p) for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (!e || e.dead || e.type !== 'monster') continue;
      const echo = isEcho(e);
      if ((echo || e.rarity === 'boss') && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) < 16) return echo ? 'echo' : 'boss';
    }
    return map.depth > 20 ? 'rift' : (map.theme || 'crypt');
  }

  // ---------------------------------------------------------------- menu backdrop
  const EMB = 14, embSeed = new Float32Array(EMB * 4);
  for (let i = 0; i < EMB * 4; i++) embSeed[i] = U.hash(i, 3, 77);
  function buildBackdrop(W, H) {
    const b = new U.Buf(W, H);
    const cx = W / 2, gy = Math.round(H * 0.72), aw = Math.max(14, Math.min(34, W * 0.13)), ah = aw * 2.3, ay = gy - ah + aw;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const q = Math.floor(y / H * 12 + U.hash(x, y, 1) * 0.9) / 12;
        let r = 7 + q * 15, g = 6 + q * 3, bl = 12 + q * 2;
        if (y < gy * 0.62 && U.hash(x, y, 7) > 0.9994) r = g = bl = 60 + U.hash(x, y, 8) * 60;
        const ridge1 = gy - 26 - U.vnoise(x / 38, 1, 3) * H * 0.17 - U.vnoise(x / 9, 2, 4) * 8;
        if (y > ridge1) { r = 12; g = 8; bl = 14; }
        const ridge2 = gy - 5 - U.vnoise(x / 22, 5, 5) * H * 0.08;
        if (y > ridge2) { r = 6; g = 5; bl = 8; }
        const dx = Math.abs(x - cx);
        if (y >= gy) {
          r = 6; g = 5; bl = 9;
          if ((y - gy) % 6 === 0 && dx < aw + 4 + (y - gy) * 0.9) { r = 24; g = 13; bl = 16; }
        }
        const dA = Math.hypot(dx, y - ay);
        const open = dx < aw && y <= gy && (y > ay || dA < aw);
        const frame = dx < aw + 8 && y <= gy && (y > ay || dA < aw + 8);
        if (open) {
          const k = Math.floor(Math.max(0, Math.min(1, (y - (gy - ah)) / ah)) * 7 + U.hash(x, y, 9) * 0.8) / 7;
          r = 10 + k * k * 190; g = 3 + k * k * 46; bl = 5 + k * 8;
        } else if (frame) {
          const v = 24 + U.hash(x >> 2, y >> 2, 9) * 12;
          r = v; g = v * 0.84; bl = v * 1.18;
          if (y % 5 === 0 || (x + ((y / 5) | 0) * 3) % 8 === 0) { r *= 0.6; g *= 0.6; bl *= 0.6; }
        } else {
          const d = Math.hypot((x - cx) / (W * 0.55), (y - gy) / (H * 0.2));
          if (d < 1) { const k = Math.floor((1 - d) * 5 + U.hash(x, y, 11) * 0.7) / 5 * 0.22; r += 130 * k; g += 26 * k; bl += 6 * k; }
        }
        b.set(x, y, U.pack(r, g, bl));
      }
    }
    return { c: b.done(), cx: cx, gy: gy, aw: aw, ah: ah };
  }
  function drawBackdrop(ctx, W, H) {
    if (!backdrop || backdrop.c.width !== W || backdrop.c.height !== H) backdrop = buildBackdrop(W, H);
    const t = V.time, B = backdrop;
    ctx.drawImage(B.c, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1 + 0.08 * Math.sin(t * 0.5) + 0.02 * Math.sin(t * 3.1);
    ctx.drawImage(U.lightSprite("red"), Math.round(B.cx - 90), Math.round(B.gy - B.ah * 0.5 - 60), 180, 120);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < EMB; i++) {
      const s0 = embSeed[i * 4], s1 = embSeed[i * 4 + 1], s2 = embSeed[i * 4 + 2], s3 = embSeed[i * 4 + 3];
      const ph = (t * (0.015 + s1 * 0.025) + s2) % 1;
      const spread = s0 < 0.6 ? B.aw * 1.6 : W * 0.5;
      const x = B.cx + (s3 - 0.5) * 2 * spread * (0.4 + ph) + Math.sin(t * 1.3 + i) * 5;
      const y = B.gy + 6 - ph * H * 0.78;
      ctx.fillStyle = ph < 0.3 ? '#ffd84a' : ph < 0.6 ? '#ff8a1e' : ph < 0.85 ? '#b0301a' : '#5a1810';
      const sz = s0 > 0.8 && ph < 0.5 ? 2 : 1;
      ctx.fillRect(x | 0, y | 0, sz, sz);
    }
  }

  // ---------------------------------------------------------------- per-map wall info
  // WALL tiles: 0 = full height, 1 = mid, 2 = low (walls with open ground just behind them are lowered so they never
  // hide the room). DOOR tiles: 0/1 = which axis the frame spans.
  function buildInfo(map) {
    const w = map.w, h = map.h, t = map.tiles, info = new Uint8Array(w * h), town = map.kind === 'town';
    const open = function (x, y) { if (x < 0 || y < 0 || x >= w || y >= h) return false; const v = t[y * w + x]; return v !== T.WALL && v !== T.VOID; };
    const wall = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && t[y * w + x] === T.WALL; };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = t[y * w + x];
        if (v === T.WALL && !town) {
          info[y * w + x] = (open(x - 1, y) || open(x, y - 1) || open(x - 1, y - 1)) ? 2
            : (open(x - 2, y - 1) || open(x - 1, y - 2) || open(x - 2, y - 2)) ? 1 : 0;
        } else if (v === T.DOOR) {
          info[y * w + x] = (wall(x - 1, y) || wall(x + 1, y)) ? 0 : 1;
        }
      }
    }
    return info;
  }

  // ---------------------------------------------------------------- frame scratch (pooled)
  const dl = [], ord = [];
  let dn = 0;
  const lights = [], bars = [], labels = [], beams = [], marks = [];
  let nLights = 0, nBars = 0, nLabels = 0, nBeams = 0, nMarks = 0;
  const seen = new Map();          // ground item id → time first drawn (drop hop)
  const fr = { low: false, torch: null, torchR: 1, flick: 1, ox: 0, oy: 0, W: 0, H: 0, psx: 0, psy: 0, pd: 0, hasP: false, filter: 0 };

  function pushItem(kind, ref, x, y, bias, lit) {
    const sx = (x - y) * HW - fr.ox, sy = (x + y) * HH - fr.oy;
    if (sx < -50 || sx > fr.W + 50 || sy < -40 || sy > fr.H + 90) return;
    let it = dl[dn];
    if (!it) it = dl[dn] = { b: 0, k: 0, kind: 0, ref: null, sx: 0, sy: 0, lit: true };
    dn++;
    it.b = Math.floor(x) + Math.floor(y); it.k = x + y + bias; it.kind = kind; it.ref = ref;
    it.sx = Math.round(sx * V.R) / V.R; it.sy = Math.round(sy * V.R) / V.R; it.lit = lit;
  }
  function addLight(x, y, r, key) {
    if (nLights >= (fr.low ? 14 : 40) || !(r > 0)) return;
    let l = lights[nLights];
    if (!l) l = lights[nLights] = { x: 0, y: 0, r: 0, key: '' };
    nLights++;
    l.x = x; l.y = y; l.r = r; l.key = key;
  }
  const cmp = function (a, b) { return a.b - b.b || a.k - b.k; };

  // soft stepped ground halo per colour (additive)
  const halos = Object.create(null);
  function halo(hex) {
    if (halos[hex]) return halos[hex];
    const c = U.rgbOf(hex), b = new U.Buf(32, 16);
    b.ell(15.5, 7.5, 15.5, 7.5, function (nx, ny) { const k = Math.ceil((1 - Math.sqrt(nx * nx + ny * ny)) * 4) / 4 * 0.7; return U.pack(c[0] * k, c[1] * k, c[2] * k); });
    return (halos[hex] = b.done());
  }
  const glint = { t: 0, c: '#ffffff' };
  const FALLEN_SUB = ['THE FALLEN'], WORLD_SUB = ['HEART OF THE RIFT'];
  const BEAM_HALO = [0, 22, 32, 36, 42, 52], BEAM_H = [0, 0, 40, 52, 68, 86];       // by glow level       // brief screen-edge flash when a Legendary-tier item drops

  const RIM = { champion: '#5b8cff', rare: '#ffe45b', legendary: '#ff8a2b', boss: '#ff3b4e', fallen: '#c86aff', world: '#ffb040' };
  const PLATE = { champion: '#8fb0ff', rare: '#ffe45b', legendary: '#ff9a3a', boss: '#ff6a5a', fallen: '#e0a8ff', world: '#ffd070' };

  // Props with the world's optional look / tint / corrupt (R6.5): hand-drawn props/<look>.png wins; otherwise the base
  // type, recoloured toward prop.tint (more for higher corrupt). Cached per type + tint + corrupt step.
  const tintedProps = new Map();
  function propArt(pr) {
    const type = pr.type === 'shrine' && pr.used ? 'shrine_used' : pr.type;
    if (typeof pr.look === 'string' && U.assets && U.assets.hasProp(pr.look)) return U.props.get(pr.look);
    const P = U.props.get(type), tint = pr.tint && U.safeColor(pr.tint, null);
    if (!tint) return P;
    const k = Math.round(Math.max(0, Math.min(1, +pr.corrupt || 0.5)) * 4) / 4, key = type + tint + k + (P.frames[0].hd || 1);
    let o = tintedProps.get(key);
    if (o && o.src === P.frames) return o;
    const frames = P.frames.map(function (c) {
      const t = U.makeCanvas(c.width, c.height), x = U.ctx2d(t);
      x.drawImage(c, 0, 0);
      x.globalCompositeOperation = 'color'; x.globalAlpha = 0.35 + 0.5 * k; x.fillStyle = tint; x.fillRect(0, 0, t.width, t.height);
      x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1; x.drawImage(c, 0, 0);
      t.hd = c.hd;
      return t;
    });
    o = { frames: frames, light: P.light, src: P.frames };
    if (tintedProps.size > 80) tintedProps.clear();
    tintedProps.set(key, o);
    return o;
  }

  // R7.7 entity kinds: the Fallen (corrupted adventurers), the world boss, camp NPCs whose role the game has no look for
  function isFallen(e) { return !!e && (e.fallen === true || (typeof e.monsterId === 'string' && e.monsterId.indexOf('adv_fallen') === 0)); }
  function isWorldBoss(e) {
    if (!e || typeof e.monsterId !== 'string') return false;
    const M = G.game && G.game.MONSTERS && G.game.MONSTERS[e.monsterId];
    return e.monsterId === 'boss_world' || e.monsterId === 'world_boss' || !!(M && M.worldBoss);
  }
  const ROLE_LOOK = {
    refugee: { body: 'humanoid', color: '#5a5048', accent: '#8a7a60', scale: 0.92, weapon: 'none' },
    camp_merchant: { body: 'humanoid', color: '#4a5a3a', accent: '#d8b060', scale: 1, weapon: 'none' },
    curator: { body: 'caster', color: '#6a6a72', accent: '#d8d8e0', scale: 1.1, weapon: 'none' },
  };
  const ROLE_NAME = { refugee: 'Refugee', camp_merchant: 'Camp Trader', curator: 'The Curator' };
  function npcLook(e) {
    const N = G.game && G.game.NPCS;
    return N && N[e.role] ? null : ROLE_LOOK[e.role] || null;
  }

  // R16 path readability: map.route (the main way through: [{x,y}], flat [x,y,...] or a w*h Uint8Array mask) gets a faint warm
  // glow on its floor, map.openings ([{x,y}] doorways / gaps into rooms) a pair of small lit notches. After lighting, subtle.
  const routes = new WeakMap();
  function routeCells(map) {
    let r = routes.get(map);
    if (r) return r;
    const R0 = map.route, n = map.w * map.h, out = [];
    if (R0 && R0.length === n && typeof R0[0] === 'number' && !Array.isArray(R0)) { for (let i = 0; i < n; i++) if (R0[i]) out.push(i); }
    else if (Array.isArray(R0)) {
      if (R0.length && typeof R0[0] === 'number') { for (let i = 0; i + 1 < R0.length; i += 2) out.push((R0[i + 1] | 0) * map.w + (R0[i] | 0)); }
      else for (let i = 0; i < R0.length; i++) { const c = R0[i]; if (c && isFinite(c.x) && isFinite(c.y)) out.push((c.y | 0) * map.w + (c.x | 0)); }
    }
    r = { cells: out, ops: Array.isArray(map.openings) ? map.openings.filter(function (o) { return o && isFinite(o.x) && isFinite(o.y); }) : [] };
    routes.set(map, r);
    return r;
  }
  let routeTile = null;
  function drawRoute(ctx, map, ox, oy, W, H) {
    if (!map.route && !map.openings) return;
    const R0 = routeCells(map), exp = map.explored, vis = map.kind !== 'town' ? map.visible : null, mw = map.w;
    if (!routeTile) {
      routeTile = U.makeCanvas(64, 32);
      const x = routeTile.getContext('2d'), g = x.createRadialGradient(32, 16, 2, 32, 16, 32);
      g.addColorStop(0, 'rgba(255,190,120,1)'); g.addColorStop(1, 'rgba(255,190,120,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, 16); x.lineTo(32, 0); x.lineTo(64, 16); x.lineTo(32, 32); x.closePath(); x.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    for (let k = 0; k < R0.cells.length; k++) {
      const i = R0.cells[k];
      if (exp && !exp[i]) continue;
      const tx = i % mw, ty = (i / mw) | 0, sx = (tx - ty) * HW - ox, sy = (tx + ty) * HH - oy;
      if (sx < -32 || sy < -16 || sx > W + 32 || sy > H + 16) continue;
      ctx.globalAlpha = (vis && !vis[i] ? 0.06 : 0.13) + 0.05 * Math.sin(V.time * 1.2 - k * 0.25);    // a slow pulse travels along the route
      ctx.drawImage(routeTile, sx - 16, sy, 32, 16);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < R0.ops.length; k++) {
      const o = R0.ops[k], i = (o.y | 0) * mw + (o.x | 0);
      if (exp && !exp[i]) continue;
      const x = o.x + 0.5, y = o.y + 0.5, sx = Math.round((x - y) * HW - ox), sy = Math.round((x + y) * HH - oy);
      if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(V.time * 2 + k);
      ctx.fillStyle = '#e8c890';
      ctx.fillRect(sx - 13, sy - 1, 4, 1); ctx.fillRect(sx - 12, sy, 2, 1);
      ctx.fillRect(sx + 9, sy - 1, 4, 1); ctx.fillRect(sx + 10, sy, 2, 1);
    }
    ctx.globalAlpha = 1;
  }

  // R16 loot filter: G.items.lootFilterAllows(item) === false hides a ground item (the items team owns the rules; gold,
  // lore, quest, Legendary tiers and sets always pass there). Asked at most twice a second per item; missing → shown.
  const lfCache = new Map();
  let lfSettings = null;
  function filterAllows(g) {
    const fn = G.items && G.items.lootFilterAllows, item = g && g.item;
    if (typeof fn !== 'function' || !item) return true;
    const st = G.state.settings;
    if (st !== lfSettings) { lfSettings = st; lfCache.clear(); }
    let c = lfCache.get(g.id);
    if (c && V.time - c.t < 0.5 && V.time >= c.t) return c.ok;
    let ok = true;
    try { ok = fn(item) !== false; } catch (err) { ok = true; }
    if (!c) { if (lfCache.size > 600) lfCache.clear(); c = { t: 0, ok: true }; lfCache.set(g.id, c); }
    c.t = V.time; c.ok = ok;
    return ok;
  }

  // R12 quest markers above NPCs: G.meta.npcQuestState(role, else id) → null | 'available' | 'active' | 'ready',
  // asked at most twice a second per NPC. Gold "!" available, dim "?" active, bright pulsing green "?" ready to turn in.
  // Glyphs are the bitmap font at 2x with a dark outline, so they read at phone size.
  const qCache = new Map();
  function questState(e) {
    const fn = G.meta && G.meta.npcQuestState;
    if (typeof fn !== 'function') return null;
    let c = qCache.get(e.id);
    if (c && V.time - c.t < 0.5 && V.time >= c.t) return c.s;
    let s = null;
    try { s = (e.role != null ? fn(e.role) : null) || fn(e.id) || null; } catch (err) { s = null; }
    if (!c) { if (qCache.size > 64) qCache.clear(); c = { t: 0, s: null }; qCache.set(e.id, c); }
    c.t = V.time; c.s = s;
    return s;
  }
  function questMarker(ctx, e, x, y) {
    const s = questState(e);
    if (s !== 'available' && s !== 'active' && s !== 'ready') return;
    const t = V.time, ready = s === 'ready', act = s === 'active';
    const img = U.text(act || ready ? '?' : '!', ready ? '#5bff8a' : act ? '#a8a49a' : '#ffd94a');
    const bob = act ? 0 : Math.round(Math.sin(t * 4 + (e.id || 0)) * 1.5), w = img.width * 2, h = img.height * 2;
    const by = y - h - 1 + bob;
    if (!act) {                                                    // a soft halo behind the live markers
      const a = U.aura(ready ? '#5bff8a' : '#ffd94a', 24);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = ready ? 0.55 + 0.4 * Math.sin(t * 5) : 0.4;
      ctx.drawImage(a, x - 12, by + h / 2 - 6, 24, 12);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = act ? 0.7 : 1;
    const sc = ready ? 1 + 0.15 * Math.max(0, Math.sin(t * 5)) : 1;
    ctx.drawImage(img, Math.round(x - w * sc / 2), Math.round(by - (sc - 1) * h), Math.round(w * sc), Math.round(h * sc));
    ctx.globalAlpha = 1;
  }

  // R6.2: the Echo (a hostile copy of the player) — matched loosely, like the UI does
  function isEcho(e) { return !!e && (e.echo === true || e.isEcho === true || e.monsterId === 'echo' || e.kind === 'echo'); }
  // Echo look: the sheet drained of colour, cold-tinted (cached per source canvas)
  const ghosts = new WeakMap();
  function ghostOf(src) {
    let g = ghosts.get(src);
    if (g) return g;
    g = U.makeCanvas(src.width, src.height);
    const x = U.ctx2d(g);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, g.width, g.height);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(150,205,255,0.38)'; x.fillRect(0, 0, g.width, g.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0);
    ghosts.set(src, g);
    return g;
  }
  // soft contact shadow (high-res mode); the old hard pixel ellipse at R 1
  let softSh = null;
  function shadowAt(ctx, sx, sy, w) {
    if (V.R <= 1) { const s = U.shadow(w); ctx.drawImage(s, sx - (s.width >> 1), sy - (s.height >> 1)); return; }
    if (!softSh) {
      softSh = U.makeCanvas(64, 64);
      const x = softSh.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(0.55, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    }
    const ww = w * 1.35, hh = ww * 0.5;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(softSh, sx - ww / 2, sy - hh / 2, ww, hh);
    ctx.imageSmoothingEnabled = false;
  }

  // One frame of a sheet, resolved to a source rect + a logical destination (shared by the body, the flash and the
  // Echo's after-images). 2x sheets: per-animation strips, 8 screen directions (5 drawn + 3 mirrored).
  const FD = { img: null, sx: 0, sy: 0, s: 0, ox: 0, oy: 0, d: 0, mirror: false, top: 0 };
  function hdRec(sh, anim) {
    const A = sh.anims;
    return A[anim] || (anim === 'cast' ? A.attack : anim === 'attack' ? A.cast : null) || A.idle || A.walk || A[Object.keys(A)[0]];
  }
  function frameOf(sh, e, dead, t) {
    if (!sh.hd) {
      FD.img = sh.c; FD.d = sh.cell; FD.s = sh.cell;
      FD.sx = (dead ? (e.anim === 'die' ? U.sprites.column('die', t) : 15) : U.sprites.column(e.anim, t + (e.anim === 'idle' || !e.anim ? (e.id || 0) * 0.37 : 0))) * sh.cell;
      FD.sy = U.sprites.row(e.facing) * sh.cell; FD.ox = sh.ox; FD.oy = sh.oy; FD.mirror = false; FD.top = sh.top;
      return FD;
    }
    let anim = dead ? 'die' : (e.anim || 'idle');
    const rec = hdRec(sh, anim), H = U.HD;
    if (rec !== sh.anims[anim]) anim = rec === sh.anims.idle ? 'idle' : rec === sh.anims.walk ? 'walk' : anim;
    const n = rec.n, T = H.TIME[anim] || 1;
    let f;
    if (dead && anim === 'die' && e.anim !== 'die') f = n - 1;                       // lying corpse
    else if (anim === 'idle' || anim === 'walk') f = Math.floor((t + (anim === 'idle' ? (e.id || 0) * 0.37 : 0)) / T * n) % n;
    else f = Math.min(n - 1, Math.floor(t / T * n));
    const dir = U.dir8(e.facing);
    let row = dir, mirror = false;
    if (rec.rows < 8 && dir > 4) { row = 8 - dir; mirror = true; }
    const k = sh.scale || 2, cell = rec.cell;
    FD.img = rec.c; FD.s = cell; FD.d = cell / k; FD.sx = f * cell; FD.sy = row * cell;
    FD.ox = (cell >> 1) / k; FD.oy = Math.round(cell * 7 / 8) / k; FD.mirror = mirror; FD.top = rec.top / k;
    return FD;
  }
  function paint(ctx, fd, img, x, y) {
    if (fd.mirror) {
      ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, fd.sx, fd.sy, fd.s, fd.s, -fd.ox, y - fd.oy, fd.d, fd.d);
      ctx.restore();
    } else ctx.drawImage(img, fd.sx, fd.sy, fd.s, fd.s, x - fd.ox, y - fd.oy, fd.d, fd.d);
  }

  // Echo after-images: a short trail of past frames (positions in world units), drawn additively
  const trails = new WeakMap();
  function echoTrail(ctx, e, fd, img) {
    let tr = trails.get(e);
    if (!tr) { tr = { t: 0, n: 0, list: [] }; for (let i = 0; i < 4; i++) tr.list.push({ x: 0, y: 0, img: null, sx: 0, sy: 0, s: 0, d: 0, ox: 0, oy: 0, mirror: false }); trails.set(e, tr); }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < tr.n; i++) {
      const p = tr.list[i];
      if (!p.img) continue;
      ctx.globalAlpha = [0.2, 0.13, 0.08, 0.04][i];
      paint(ctx, p, p.img, Math.round(((p.x - p.y) * HW - fr.ox) * V.R) / V.R, Math.round(((p.x + p.y) * HH - fr.oy) * V.R) / V.R);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (V.time - tr.t < 0.07) return;
    tr.t = V.time;
    for (let i = tr.list.length - 1; i > 0; i--) Object.assign(tr.list[i], tr.list[i - 1]);
    const q = tr.list[0];
    q.x = e.x; q.y = e.y; q.img = img; q.sx = fd.sx; q.sy = fd.sy; q.s = fd.s; q.d = fd.d; q.ox = fd.ox; q.oy = fd.oy; q.mirror = fd.mirror;
    tr.n = Math.min(tr.list.length, tr.n + 1);
  }

  // R6.3: dash charges as small pips under the player while any charge is recharging (fade out once all are back).
  // Reads getClassAction(): charges / maxCharges (or charges: { cur, max }); without them, one pip that refills.
  const dashUi = { full: 9 };
  function dashInfo() {
    const fn = G.game && G.game.getClassAction;
    let a = null;
    try { a = fn ? fn() : null; } catch (err) { a = null; }
    if (!a) return null;
    const max = Math.max(1, Math.min(5, +(a.maxCharges || a.chargesMax || (a.charges && a.charges.max) || 1) | 0));
    let cur = typeof a.charges === 'number' ? a.charges : a.charges && typeof a.charges.cur === 'number' ? a.charges.cur : (+a.cdRemaining > 0 ? max - 1 : max);
    cur = Math.max(0, Math.min(max, cur | 0));
    const cd = +a.cooldown || 0, rem = +a.cdRemaining || 0;
    return { max: max, cur: cur, prog: cur < max && cd > 0 ? Math.max(0, Math.min(1, 1 - rem / cd)) : 1 };
  }
  function drawDash(ctx, sx, sy) {
    const d = dashInfo();
    if (!d) return;
    if (d.cur >= d.max) { dashUi.full += V.dt || 0; if (dashUi.full > 0.9) return; } else dashUi.full = 0;
    ctx.globalAlpha = d.cur >= d.max ? 1 - dashUi.full / 0.9 : 1;
    const w = 7, x0 = Math.round(sx - (d.max * w - 2) / 2), y = Math.round(sy + 5);
    for (let i = 0; i < d.max; i++) {
      const x = x0 + i * w;
      ctx.fillStyle = '#0b0910'; ctx.fillRect(x - 1, y - 1, w, 4);
      ctx.fillStyle = '#3a3448'; ctx.fillRect(x, y, w - 2, 2);
      const f = i < d.cur ? 1 : i === d.cur ? d.prog : 0;
      if (f > 0) { ctx.fillStyle = i < d.cur ? '#9fe0ff' : '#4a7a96'; ctx.fillRect(x, y, Math.max(1, Math.round((w - 2) * f)), 2); }
    }
    ctx.globalAlpha = 1;
  }

  function drawEntity(ctx, it) {
    const e = it.ref, sx = it.sx, sy = it.sy, P = G.state.player, echo = isEcho(e);
    const sh = (e === P && U.gear.sheetFor(e)) || (echo && e.equipment && U.gear.sheetFor(e)) || (U.assets && U.assets.spriteFor(e))
      || (echo && P && P.classId === e.classId && U.gear.sheetFor(P)) || U.sprites.get((e.type === 'npc' && npcLook(e)) || e.sprite);
    const dead = !!e.dead || e.anim === 'die';
    const t = typeof e.animT === 'number' && isFinite(e.animT) ? e.animT : V.time;
    const fallen = isFallen(e), world = !fallen && isWorldBoss(e);
    const rim = !dead && e.type === 'monster' ? (echo ? '#9fd8ff' : fallen ? RIM.fallen : world ? RIM.world : RIM[e.rarity]) : null;
    const fd = frameOf(sh, e, dead, t);
    if (!dead) {
      const w = Math.round((sh.hd ? fd.d * 0.62 : sh.cell) * (sh.wide ? 0.42 : 0.3) * (sh.hover ? 0.75 : 1) * (sh.hd ? 1.6 : 1));
      shadowAt(ctx, sx, sy, w);
      if (rim) {
        const a = U.aura(rim, Math.max(20, Math.min(64, (w * 1.9) & ~1)));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 + 0.25 * Math.sin(V.time * 5 + (e.id || 0));
        ctx.drawImage(a, sx - (a.width >> 1), sy - (a.height >> 1));
        if (e.rarity === 'legendary' || fallen || world) {
          const a2 = U.aura(rim, Math.min(64, a.width + 16));
          ctx.globalAlpha = 0.35 + 0.3 * Math.sin(V.time * 2.5 + (e.id || 0) + 1.6);
          ctx.drawImage(a2, sx - (a2.width >> 1), sy - (a2.height >> 1));
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    if (!dead && world) addLight(sx, sy - 20, 3.2 + 0.8 * Math.sin(V.time * 5.2) * Math.sin(V.time * 1.3), 'warm');
    else if (!dead && fallen) addLight(sx, sy - 14, 1.8 + 0.3 * Math.sin(V.time * 3 + (e.id || 0)), RIM.fallen);
    if (sh.hd) ctx.imageSmoothingEnabled = V.R !== 2;          // painted art lands 1:1 at R 2, filtered otherwise
    if (echo) {
      const img = ghostOf(fd.img);
      if (!dead) echoTrail(ctx, e, fd, img);
      ctx.globalAlpha = dead ? 0.35 : 0.62 + 0.12 * Math.sin(V.time * 9 + (e.id || 0)) * Math.sin(V.time * 2.3);
      paint(ctx, fd, img, sx, sy);
      ctx.globalAlpha = 1;
      if (e.hitFlash > 0 && !dead) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; paint(ctx, fd, img, sx, sy); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    } else if (sh.hd) {
      paint(ctx, fd, fd.img, sx, sy);
      if (e.hitFlash > 0 && !dead) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; paint(ctx, fd, fd.img, sx, sy); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    } else {
      paint(ctx, fd, (e.hitFlash > 0 && !dead) ? sh.flash() : rim ? sh.outlined(rim) : sh.c, sx, sy);
    }
    ctx.imageSmoothingEnabled = false;
    if (e === P) { if (!dead) drawDash(ctx, sx, sy); return; }
    if (dead) return;
    if (e.type === 'npc' || (e.type === 'monster' && (rim || e.hp < ((e.stats && e.stats.hpMax) || e.hp)))) {
      if (nBars < 90) {
        let b = bars[nBars];
        if (!b) b = bars[nBars] = { e: null, x: 0, y: 0 };
        nBars++;
        b.e = e; b.x = sx; b.y = sy - fd.top - 4;
      }
    }
  }

  // ---- loot piles (R5.6): ground items sharing a pileId are drawn as one heap
  const pileMap = new Map(), pilePool = [];
  let nPiles = 0;
  function lootRank(g) {
    const item = g && g.item;
    if (!item) return -10;
    if (item.type === 'gold') return -5;
    const r = C.RARITY[item.rarity];
    return (r ? r.order * 4 : 0) + (item.type === 'consumable' || item.type === 'material' ? 0 : 1);
  }
  // ground icons are fetched at 32 px and drawn at 16 logical px (1:1 on the 2x backing store)
  function iconOf(item, rar, gold) {
    const c = E.getIcon(item.icon || { shape: gold ? 'gold' : 'fallback', color: gold ? '#ffd94a' : rar.color }, 32);
    c.hd = 2;
    return c;
  }
  // R7.1 rarity ladder → glow level 0..5 (none, slight, a little bigger, slightly bigger, bigger, biggest + slow pulse).
  // Read by key; a numeric C.RARITY[key].glow wins, so core can retune it without an engine change.
  const GLOW_KEY = { common: 0, uncommon: 0, rare: 0, magic: 1, epic: 1, set: 2, legendary: 2, mythic: 3, unique: 4, corrupted: 4, rift: 5 };
  function glowOf(key) {
    const r = C.RARITY[key];
    if (r && typeof r.glow === 'number') return Math.max(0, Math.min(5, r.glow | 0));
    return GLOW_KEY[key] || 0;
  }
  E.rarityGlow = glowOf;
  const badges = [], reicons = [];
  let nBadges = 0, nReicons = 0;

  function drawGroundItem(ctx, it) {
    const pile = it.kind === 4 ? it.ref : null;
    const g = pile ? pile.a : it.ref, item = g.item || {}, sx = it.sx, sy = it.sy;
    let born = seen.get(g.id);
    if (born === undefined) { if (seen.size > 500) seen.clear(); seen.set(g.id, (born = V.time)); }
    const age = V.time - born, hop = age >= 0 && age < 0.4 ? Math.round(Math.sin(age / 0.4 * Math.PI) * 9) : 0;
    const rar = C.RARITY[item.rarity] || C.RARITY.common, gold = item.type === 'gold';
    const isz = 16, icon = iconOf(item, rar, gold);
    let lift = 0;
    if (pile) {                                           // the heap: two lesser items peeking out under the best one
      lift = 3;
      const s = U.shadow(22);
      ctx.drawImage(s, sx - 11, sy - 5);
      if (pile.c) { const ci = pile.c.item || {}; U.blit(ctx, iconOf(ci, C.RARITY[ci.rarity] || C.RARITY.common, ci.type === 'gold'), sx - 1, sy - 13); }
      if (pile.b) { const bi = pile.b.item || {}; U.blit(ctx, iconOf(bi, C.RARITY[bi.rarity] || C.RARITY.common, bi.type === 'gold'), sx - 14, sy - 12); }
      if (nBadges < 24) {
        let bd = badges[nBadges];
        if (!bd) bd = badges[nBadges] = { x: 0, y: 0, img: null };
        nBadges++;
        bd.img = U.text(String(Math.min(99, pile.n)), '#ffffff'); bd.x = sx + 5; bd.y = sy - 19 - hop;
      }
    } else {
      const s = U.shadow(12);
      ctx.drawImage(s, sx - 6, sy - 3);
    }
    U.blit(ctx, icon, sx - (isz >> 1), sy - isz + 3 - hop - lift);
    const glow = gold ? 0 : glowOf(item.rarity);
    if (glow === 0 && gold) {                      // gold glints
      const ph = (V.time * 1.1 + (g.id || 0) * 0.37) % 1;
      if (ph < 0.16) { const gx = sx - 3 + ((g.id || 0) % 5), gy = sy - 9 - hop; ctx.fillStyle = '#ffffff'; ctx.fillRect(gx - (ph < 0.08 ? 2 : 1), gy, ph < 0.08 ? 5 : 3, 1); ctx.fillRect(gx, gy - (ph < 0.08 ? 2 : 1), 1, ph < 0.08 ? 5 : 3); }
    }
    if (!glow && nReicons < 48) {              // under Pallor the plain loot icons are redrawn in colour
      let ri = reicons[nReicons];
      if (!ri) ri = reicons[nReicons] = { x: 0, y: 0, img: null };
      nReicons++;
      ri.img = icon; ri.x = sx - (isz >> 1); ri.y = sy - isz + 3 - hop - lift;
    }
    if (glow && nBeams < 60) {
      let b = beams[nBeams];
      if (!b) b = beams[nBeams] = { x: 0, y: 0, c: '', o: 0 };
      nBeams++;
      b.x = sx; b.y = sy; b.c = rar.color; b.o = glow; b.icon = icon; b.hop = hop + lift; b.id = g.id || 0;
    }
    if ((gold || rar.order >= fr.filter) && nLabels < 32) {
      let name = gold ? ((item.qty | 0) + ' GOLD') : String(item.name || '?');
      const max = pile ? 20 : 24;
      if (name.length > max) name = name.slice(0, max - 1) + '.';
      if (!gold && item.qty > 1) name += ' X' + item.qty;
      if (pile) name += ' +' + (pile.n - 1);
      const img = U.text(name, gold ? '#ffd94a' : rar.color);
      let l = labels[nLabels];
      if (!l) l = labels[nLabels] = { x: 0, y: 0, w: 0, img: null };
      nLabels++;
      l.img = img; l.w = img.width; l.x = sx - (img.width >> 1); l.y = sy - 27 - hop - lift;
    }
  }

  function drawItem(ctx, it) {
    const sx = it.sx, sy = it.sy;
    if (it.kind === 2) { drawEntity(ctx, it); return; }
    if (it.kind === 1 || it.kind === 4) { drawGroundItem(ctx, it); return; }
    if (it.kind === 0) {
      const pr = it.ref;
      const P = propArt(pr);
      const n = P.frames.length;
      const img = pr.type === 'gate' ? P.frames[(V.info ? V.info[(pr.y | 0) * G.state.map.w + (pr.x | 0)] & 1 : 0) % n] : n > 1 ? P.frames[((V.time * (n >= 3 ? 8 : 2.5) + pr.x * 3 + pr.y) | 0) % n] : P.frames[0];
      U.blit(ctx, it.lit ? img : U.dim(img), sx - 24, sy - 56);
      if (it.lit && !pr.used) {
        const r = pr.light > 0 ? pr.light : (P.light ? P.light[0] : 0);
        if (r > 0) {
          const tk = pr.tint && U.safeColor(pr.tint, null), key = tk || (P.light ? P.light[1] : 'warm'), warm = key === 'warm';
          const RFt = U.rift.F, cold = RFt.town && RFt.warmth === 0;          // the town's dead hearths
          if (cold && pr.type === 'campfire') return;
          // torches follow the floor variant: colour, reach and how hard they flicker
          addLight(sx, sy - 12, (cold ? 0.6 : 1) * (warm ? r * fr.torchR * (0.9 + fr.flick * (0.08 * Math.sin(V.time * 11 + pr.x * 5 + pr.y * 3) + 0.06 * Math.sin(V.time * 23.7 + pr.x))) : r), warm && fr.torch ? fr.torch : key);
        }
      }
      return;
    }
    // projectile
    const p = it.ref, vx = +p.vx || 0, vy = +p.vy || 0;
    const dir = (Math.round(Math.atan2((vx + vy) / 2, vx - vy) / 6.2832 * 16) + 16) & 15;
    const sp = U.projectile(p.shape, p.color)[dir];
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx - 2, sy - 1, 4, 2);
    ctx.imageSmoothingEnabled = sp.width > 20;
    if (p.radius > 0.45) ctx.drawImage(sp, sx - 20, sy - 32, 40, 40);
    else ctx.drawImage(sp, sx - 10, sy - 22, 20, 20);
    ctx.imageSmoothingEnabled = false;
    if (p.shape !== 'arrow') addLight(sx, sy - 12, 1.8, U.lightKeyFor(U.projectileColor(p.shape, p.color)));
  }

  // Loot spill (engine pitch): a new drop bursts out of the pile point and gathers back into it, so every item of a
  // kill gets its own beat on screen before it settles into the heap. Cosmetic only; a fixed pool, nothing allocated.
  const SPN = 24, spills = [];
  for (let i = 0; i < SPN; i++) spills.push({ on: false, x: 0, y: 0, t0: 0, dx: 0, dy: 0, h: 0, icon: null, c: null });
  let spHead = 0, spFrame = -1, spK = 0;
  function spill(g) {
    if (V.time - V.mapT < 1) return V.time;                   // not for loot already lying there when a floor loads
    const item = g.item || {}, rar = C.RARITY[item.rarity] || C.RARITY.common;
    if (spFrame !== V.time) { spFrame = V.time; spK = 0; }
    const s = spills[spHead]; spHead = (spHead + 1) % SPN;
    const a = Math.random() * 6.283, d = 9 + Math.random() * 9;
    s.on = true; s.x = g.x; s.y = g.y; s.t0 = V.time + spK++ * 0.05; s.dx = Math.cos(a) * d; s.dy = Math.sin(a) * d * 0.5;
    if (glowOf(item.rarity) >= 3) { glint.t = 0.7; glint.c = rar.color; }  // brief screen-edge flash
    s.h = 16 + Math.random() * 10; s.icon = iconOf(item, rar, item.type === 'gold'); s.c = glowOf(item.rarity) >= 1 ? rar.color : null;
    return s.t0 + 0.5;                                        // the heap hops when this one lands
  }
  function drawSpills(ctx, ox, oy) {
    for (let i = 0; i < SPN; i++) {
      const s = spills[i];
      if (!s.on) continue;
      const k = (V.time - s.t0) / 0.5;
      if (k < 0) continue;
      if (k >= 1) { s.on = false; if (s.c) U.fx.burst(s.x, s.y, SPILL_SPARK(s.c)); continue; }
      const out = Math.sin(k * Math.PI), sx = (s.x - s.y) * HW - ox + s.dx * out, sy = (s.x + s.y) * HH - oy + s.dy * out - s.h * Math.sin(Math.min(1, k * 1.15) * Math.PI);
      U.blit(ctx, s.icon, Math.round(sx) - 8, Math.round(sy) - 13);
      if (s.c) { ctx.fillStyle = s.c; ctx.fillRect(Math.round(sx), Math.round(sy) - 4, 1, 1); }
    }
  }
  const spark = { n: 5, sp: [0.4, 1.2], vz: [20, 45], life: [0.2, 0.4], size: 1, cols: ['#ffffff', '#ffffff'], grav: 160, z: 2 };
  function SPILL_SPARK(c) { spark.cols[1] = c; return spark; }

  // Per-theme drifting motes (mist wisps, ash, embers, spores). Deterministic from time: no state, no allocation.
  // Variants add drip, snow, motes (glowing, blinking) and void (dark specks rising); density 0..2 scales the count.
  const MOTES = 60, moteSeed = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES * 3; i++) moteSeed[i] = U.hash(i, 9, 91);
  function drawAtmosphere(ctx, VR, W, H, ox, oy) {
    const kind = VR.kind;
    if (!VR.mist || kind === 'none') return;
    const t = V.time, n = Math.min(MOTES, Math.round(30 * VR.density * (fr.low ? 0.4 : 1)));
    ctx.fillStyle = VR.mist;
    if (kind === 'motes') ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = moteSeed[i * 3], b = moteSeed[i * 3 + 1], c = moteSeed[i * 3 + 2];
      // anchored to the world (parallax 1) so they don't slide with the camera; wrapped to the screen
      let x, y, w = 1, h = 1;
      if (kind === 'mist') { x = a * W + t * (3 + b * 5); y = b * H + Math.sin(t * 0.3 + i) * 6; w = 8 + ((c * 14) | 0); ctx.globalAlpha = 0.03 + c * 0.04; }
      else if (kind === 'ash') { x = a * W + Math.sin(t * 0.6 + i) * 8 + t * 2; y = b * H + t * (5 + c * 7); ctx.globalAlpha = 0.25 + c * 0.3; }
      else if (kind === 'ember') { x = a * W + Math.sin(t * 1.1 + i) * 6; y = b * H - t * (8 + c * 14); ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(t * 2 + i)); }
      else if (kind === 'drip') { x = a * W; y = b * H * 3 + t * (70 + c * 50); h = 2; ctx.globalAlpha = 0.25 + c * 0.25; }
      else if (kind === 'snow') { x = a * W + Math.sin(t * 0.7 + i) * 7 + t * 1.5; y = b * H + t * (6 + c * 6); ctx.globalAlpha = 0.3 + c * 0.35; }
      else if (kind === 'motes') { x = a * W + Math.sin(t * 0.5 + i * 3) * 14; y = b * H + Math.cos(t * 0.4 + i) * 10; ctx.globalAlpha = Math.max(0, Math.sin(t * (0.8 + c) + i * 1.7)) * 0.8; }
      else if (kind === 'void') { x = a * W + Math.sin(t * 0.3 + i) * 5; y = b * H - t * (3 + c * 4); w = h = c > 0.6 ? 2 : 1; ctx.globalAlpha = 0.55 + c * 0.35; }
      else { x = a * W + Math.sin(t * 0.4 + i * 2) * 10; y = b * H + Math.cos(t * 0.3 + i) * 8 - t * 1.5; ctx.globalAlpha = 0.15 + 0.3 * Math.abs(Math.sin(t * 0.8 + i)); }
      x = (((x - ox) % W) + W) % W; y = (((y - oy) % H) + H) % H;
      ctx.fillRect(x | 0, y | 0, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Pallor: tier 0..4 → how much colour is drained. Eased so a tier change washes in over ~2 s.
  const PALLOR_SAT = [0, 0.3, 0.5, 0.68, 0.85];
  const pal = { t: 0, cur: 0, tier: 0, mode: null };
  function pallorTier() {
    const S = G.state, f = S.flags || {};
    try { const gp = G.game && G.game.getPallor && G.game.getPallor(); if (gp && typeof gp.tier === 'number') return Math.max(0, Math.min(4, gp.tier | 0)); }
    catch (err) { /* fall through */ }
    const v = +f.pallor;
    return v > 0 ? Math.min(4, Math.floor(v / 20)) : 0;
  }
  function drawPallor(ctx, W, H) {
    if (V.time - pal.t > 0.25 || V.time < pal.t) { pal.t = V.time; pal.tier = G.state.scene === 'town' ? 0 : pallorTier(); }
    const target = PALLOR_SAT[pal.tier], dt = Math.min(0.1, V.dt || 0.016);
    pal.cur += Math.max(-dt * 0.4, Math.min(dt * 0.4, target - pal.cur));
    if (pal.cur < 0.01) return false;
    if (pal.mode === null) {               // 'saturation' (or 'color' with grey) desaturates; plain grey wash as last resort
      ctx.globalCompositeOperation = 'saturation';
      pal.mode = ctx.globalCompositeOperation === 'saturation' ? 'saturation' : 'color';
      ctx.globalCompositeOperation = pal.mode;
      if (ctx.globalCompositeOperation !== pal.mode) pal.mode = 'source-over';
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalCompositeOperation = pal.mode;
    ctx.globalAlpha = pal.mode === 'source-over' ? pal.cur * 0.25 : pal.cur;
    ctx.fillStyle = '#8a8a90';
    ctx.fillRect(0, 0, W, H);
    // a cold pale wash on top at the high tiers: the colour is gone and the air is wrong
    if (pal.cur > 0.6) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (pal.cur - 0.6) * 0.18;
      ctx.fillStyle = '#c8ccd8';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return true;
  }
  E.getPallorLevel = function () { return pal.cur; };

  // Blood-red vignette that pulses when the player is below 30% life.
  let dangerC = null;
  function drawDanger(ctx, p, W, H) {
    const max = p && p.stats && p.stats.hpMax;
    if (!max || p.dead || !(p.hp < max * 0.3)) return;
    if (fr.low) {                                      // lowFx: a pulsing red frame instead of the full-screen vignette
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(V.time * 5); ctx.fillStyle = '#a01010';
      ctx.fillRect(0, 0, W, 3); ctx.fillRect(0, H - 3, W, 3); ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H);
      ctx.globalAlpha = 1; return;
    }
    if (!dangerC || dangerC.width !== LW || dangerC.height !== LH) {
      const b = new U.Buf(LW, LH);
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
        const dx = (x - LW / 2) / (LW / 2), dy = (y - LH / 2) / (LH / 2), d = Math.sqrt(dx * dx + dy * dy) - 0.78;
        if (d > 0) b.set(x, y, 0x6a080a, Math.min(170, Math.floor(d * 8) * 30 + 24));
      }
      dangerC = b.done();
    }
    const k = 1 - Math.max(0, p.hp) / (max * 0.3);
    ctx.globalAlpha = Math.min(1, (0.35 + 0.65 * k) * (0.6 + 0.4 * Math.sin(V.time * (3 + k * 3))));
    ctx.drawImage(dangerC, 0, 0, LW * 2, LH * 2);
    ctx.globalAlpha = 1;
  }

  // small bobbing chevrons over stairs
  let arrowDown = null, arrowUp = null;
  function arrows() {
    const mk = function (up, c) {
      const b = new U.Buf(11, 11);
      for (let r = 0; r < 5; r++) b.rect(1 + r, up ? 5 - r : 5 + r, 9 - r * 2, 1, c);
      b.rect(4, up ? 6 : 1, 3, 4, c);
      return b.outline().done();
    };
    arrowDown = mk(false, 0xffa030); arrowUp = mk(true, 0x9fd0ff);
  }

  let joyBase = null, joyKnob = null, joyR = 0;
  function joySprites(r) {
    if (joyBase && joyR === r) return;
    joyR = r;
    const d = r * 2 + 5, b = new U.Buf(d, d);
    for (let i = 0; i < 64; i++) { const a = i / 64 * 6.283; b.set(Math.round(d / 2 - 0.5 + Math.cos(a) * r), Math.round(d / 2 - 0.5 + Math.sin(a) * r), i & 1 ? 0xe8dcc0 : 0x8a7c60, 200); }
    joyBase = b.done();
    const kr = Math.max(4, Math.round(r * 0.38)), k = new U.Buf(kr * 2 + 3, kr * 2 + 3);
    k.ell(kr + 1, kr + 1, kr, kr, function (nx, ny) { return nx + ny < -0.5 ? 0xf0e4c8 : nx + ny > 0.7 ? 0x8a7c60 : 0xc8b890; });
    for (let i = 3; i < k.d.length; i += 4) if (k.d[i]) k.d[i] = 190;
    joyKnob = k.outline(0x0b0910, 190).done();
  }

  // ---------------------------------------------------------------- R10: Heat embers, the Leap's gap, lowFx, FPS counter
  // Heat embers (G.game.embers = [{ x, y, t }]): a hot coal hanging at chest height, pulsing, throwing a little light;
  // it blinks in its last second. Drawn after the light pass so it reads on any floor.
  function emberLights(ox, oy, W, H) {
    const em = G.game && G.game.embers;
    if (!Array.isArray(em)) return;
    for (let i = 0; i < em.length && i < 24; i++) {
      const e = em[i], sx = (e.x - e.y) * HW - ox, sy = (e.x + e.y) * HH - oy;
      if (sx > -20 && sy > -20 && sx < W + 20 && sy < H + 20) addLight(sx, sy - 10, 1.3, 'warm');
    }
  }
  function drawEmbers(ctx, ox, oy, W, H, map) {
    const em = G.game && G.game.embers;
    if (!Array.isArray(em) || !em.length) return;
    const t = V.time, vis = map.kind !== 'town' && map.visible && map.visible.length === map.tiles.length ? map.visible : null;
    const a = U.aura('#ff8a2b', 24);
    for (let i = 0; i < em.length && i < 24; i++) {
      const e = em[i];
      if (vis && !vis[Math.floor(e.y) * map.w + Math.floor(e.x)]) continue;
      const sx = Math.round((e.x - e.y) * HW - ox), sy = Math.round((e.x + e.y) * HH - oy);
      if (sx < -20 || sy < -30 || sx > W + 20 || sy > H + 20) continue;
      if (e.t < 1 && ((t * 10) | 0) & 1) continue;                    // about to go out: blink
      const bob = Math.sin(t * 3 + i) * 1.5, pulse = 0.5 + 0.5 * Math.sin(t * 7 + i * 1.3), y = sy - 11 + bob;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45 + 0.3 * pulse;
      ctx.drawImage(a, sx - 12, sy - 6);                               // glow pooled on the ground
      ctx.drawImage(a, sx - 8, y - 4, 16, 8);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#5a1808'; ctx.fillRect(sx - 2, y - 2, 5, 5);
      ctx.fillStyle = '#ff8a1e'; ctx.fillRect(sx - 1, y - 2, 3, 5); ctx.fillRect(sx - 2, y - 1, 5, 3);
      ctx.fillStyle = pulse > 0.5 ? '#fff0a0' : '#ffd84a'; ctx.fillRect(sx - 1, y - 1, 2, 2);
      if (((t * 6 + i) | 0) % 3 === 0) { ctx.fillStyle = '#ffb040'; ctx.fillRect(sx + ((i * 7 + (t * 13 | 0)) % 5) - 2, y - 5 - ((t * 20 | 0) % 6), 1, 1); }
    }
  }
  // The Leap (landmark 'dash_gap', gap = the CHASM cells to dash over): edge marks on both lips and chevrons pointing
  // across, pulsing, so "dash here" reads at a glance. Only once the gap has been seen.
  function drawGaps(ctx, ox, oy, W, H, map) {
    const L = map.landmarks;
    if (!Array.isArray(L)) return;
    const exp = map.explored, t = V.time;
    for (let k = 0; k < L.length; k++) {
      const lm = L[k];
      if (!lm || lm.id !== 'dash_gap' || !Array.isArray(lm.gap) || lm.gap.length < 1) continue;
      const g0 = lm.gap[0], g1 = lm.gap[lm.gap.length - 1];
      if (exp && !exp[g0.y * map.w + g0.x]) continue;
      // run direction: along the gap if it is 2+ cells, else across whichever neighbours are floor
      let dx = g1.x - g0.x, dy = g1.y - g0.y;
      if (!dx && !dy) { const T0 = map.tiles, w = map.w; dx = C.WALKABLE[T0[g0.y * w + g0.x + 1]] ? 1 : 0; dy = dx ? 0 : 1; }
      const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
      const cx = (g0.x + g1.x) / 2 + 0.5, cy = (g0.y + g1.y) / 2 + 0.5, half = (Math.abs(g1.x - g0.x) + Math.abs(g1.y - g0.y)) / 2 + 0.75;
      const pulse = 0.55 + 0.45 * Math.sin(t * 4);
      const S = function (wx, wy) { return [(wx - wy) * HW - ox, (wx + wy) * HH - oy]; };
      // the drop itself glows cold blue, so the gap is visible even under a wall's shadow
      const glow = U.aura('#5bc8ff', 32);
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < lm.gap.length; j++) {
        const g = lm.gap[j], q = S(g.x + 0.5, g.y + 0.5);
        ctx.globalAlpha = 0.35 + 0.35 * pulse;
        ctx.drawImage(glow, Math.round(q[0]) - 16, Math.round(q[1]) - 8);
      }
      ctx.globalCompositeOperation = 'source-over';
      // lip marks: a short bright bar across the corridor at each edge
      ctx.globalAlpha = 0.5 + 0.4 * pulse;
      ctx.fillStyle = '#9fe0ff';
      for (let s = -1; s <= 1; s += 2) {
        const lx = cx + dx * half * s, ly = cy + dy * half * s;
        for (let j = -4; j <= 4; j++) { const q = S(lx - dy * j * 0.09, ly + dx * j * 0.09); ctx.fillRect(Math.round(q[0]), Math.round(q[1]), j & 1 ? 1 : 2, 1); }
      }
      // three chevrons marching across
      for (let c = 0; c < 3; c++) {
        const f = ((t * 0.9 + c / 3) % 1) * 2 - 1, px = cx + dx * half * 0.8 * f, py = cy + dy * half * 0.8 * f;
        ctx.globalAlpha = (1 - Math.abs(f)) * (0.6 + 0.4 * pulse);
        for (let j = -3; j <= 3; j++) {
          const back = Math.abs(j) * 0.11, q = S(px - dx * back - dy * j * 0.1, py - dy * back + dx * j * 0.1);
          ctx.fillStyle = '#0b0910';
          ctx.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - 4, 4, 4);
          ctx.fillStyle = j === 0 ? '#ffffff' : '#bfefff';
          ctx.fillRect(Math.round(q[0]), Math.round(q[1]) - 3, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  function lowFx() { const s = G.state.settings; return !!(s && s.lowFx); }
  E.lowFx = lowFx;
  // optional frame counter: fps from the real frame interval, ms = time spent in E.render
  const fps = { ema: 1 / 60, ms: 0, t: 0, img: null };
  function drawFps(ctx, W, msNow) {
    fps.ema += ((V.dt || 1 / 60) - fps.ema) * 0.1;
    fps.ms += (msNow - fps.ms) * 0.1;
    if (!fps.img || V.time - fps.t > 0.25) { fps.t = V.time; fps.img = U.text(Math.round(1 / Math.max(0.001, fps.ema)) + ' FPS ' + fps.ms.toFixed(1) + ' MS' + (lowFx() ? ' LOW' : '') + ' R' + V.R, '#9fe0a0'); }
    const x = Math.round(W / 2 - fps.img.width / 2), y = 2;
    ctx.fillStyle = 'rgba(8,6,12,0.7)'; ctx.fillRect(x - 2, y - 1, fps.img.width + 4, 11);
    ctx.drawImage(fps.img, x, y);
  }

  // light sprite: stepped bands at R 1 (the old pixel look), a smooth falloff in high-res mode
  const WARP = { a: 1, b: 1, dx: 0 };
  function LS(key) { return V.R > 1 && !fr.low ? U.lightSoft(key) : U.lightSprite(key); }

  // ---------------------------------------------------------------- render
  E.render = function () {
    const ctx = V.ctx;
    if (!ctx) return;
    const tStart = performance.now();
    fr.low = lowFx();
    const S = G.state, map = S && S.map, W = V.W, H = V.H;
    ctx.setTransform(V.R, 0, 0, V.R, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (!map || !map.tiles || S.scene === 'menu') { drawBackdrop(ctx, W, H); return; }

    const VR = U.variant.get(map), set = VR.set, bm = VR.blendMask, bs = VR.blendSet;
    const RF = U.rift.frame(map, V.time);
    fr.torch = VR.torchKey; fr.torchR = VR.torchR; fr.flick = VR.flicker;
    U.fogA = VR.fogA;
    const WH = U.tiles.WALL_HEIGHTS;
    if (!V.info || V.info.length !== map.tiles.length) V.info = buildInfo(map);
    const info = V.info;
    ctx.fillStyle = VR.bg;
    ctx.fillRect(0, 0, W, H);

    const p = S.player, mw = map.w, mh = map.h, tiles = map.tiles;
    const ox = V.offX + U.fx.shake.x, oy = V.offY + U.fx.shake.y;
    const exp = map.explored && map.explored.length === tiles.length ? map.explored : null;
    const tnt = map.taint && map.taint.length === tiles.length ? map.taint : null;
    const vis = map.kind !== 'town' && map.visible && map.visible.length === tiles.length ? map.visible : null;
    fr.ox = ox; fr.oy = oy; fr.W = W; fr.H = H;
    fr.hasP = !!(p && isFinite(p.x) && isFinite(p.y));
    if (fr.hasP) { fr.psx = (p.x - p.y) * HW - ox; fr.psy = (p.x + p.y) * HH - oy; fr.pd = p.x + p.y; }
    const st = S.settings || {};
    fr.filter = (C.RARITY[st.lootFilter] || C.RARITY.common).order;
    dn = nLights = nBars = nLabels = nBeams = nMarks = nBadges = nReicons = 0;

    const dMin = Math.floor(oy / HH) - 2, dMax = Math.ceil((oy + H) / HH) + 4;
    const eMin = Math.floor(ox / HW) - 2, eMax = Math.ceil((ox + W) / HW) + 2;
    const wf = (V.time * 3.2) | 0, lf = (V.time * 2.4) | 0;

    // ---- ground pass
    for (let d = dMin; d <= dMax; d++) {
      for (let e = eMin + ((d + eMin) & 1); e <= eMax; e += 2) {
        const tx = (d + e) >> 1, ty = (d - e) >> 1;
        if (tx < 0 || ty < 0 || tx >= mw || ty >= mh) continue;
        const i = ty * mw + tx, t = tiles[i], ts = bm && bm[i] ? bs : set;
        if (t === T.VOID || t === T.WALL) continue;
        if (exp && !exp[i]) continue;
        const h = (Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 7;
        let img;
        switch (t) {
          case T.WATER: img = set.water[h & 1][wf & 3]; break;
          case T.LAVA: img = set.lava[h & 1][lf & 3]; break;
          case T.GRASS: img = ts.grass.length === 3 ? ts.grass[(h & 15) < 7 ? 0 : (h & 15) < 13 ? 1 : 2] : ts.grass[h % ts.grass.length]; break;
          case T.PATH: img = ts.path[h % ts.path.length]; break;
          case T.BRIDGE: img = ts.bridge[h % ts.bridge.length]; break;
          case T.RUBBLE: img = ts.rubble[h % ts.rubble.length]; break;
          case T.DEEP_WATER: img = set.deepWater[wf & 3]; break;
          case T.DEEP_LAVA: img = set.deepLava[lf & 3]; break;
          case T.CHASM: img = ts.chasm[h % ts.chasm.length]; break;
          case T.STAIRS_DOWN: img = set.stairsDown; break;
          default: img = ts.floor[U.tiles.FLOOR_PICK[h & 31]];
        }
        const lit = !vis || vis[i];
        const sx = e * HW - ox - 16, sy = d * HH - oy;
        U.blit(ctx, lit ? img : U.dim(img), sx, sy);
        if (tnt && tnt[i] && !(fr.low && tnt[i] < 2) && (t === T.FLOOR || t === T.PATH || t === T.GRASS || t === T.RUBBLE || t === T.STAIRS_DOWN)) {     // rift taint: sinew veins
          const dc = U.rift.decal(Math.min(3, tnt[i]), h & 1, RF.vein, RF.hell > 0);
          ctx.globalAlpha = U.rift.taintAlpha(Math.min(3, tnt[i]));
          U.blit(ctx, lit ? dc : U.dim(dc), sx, sy);
          ctx.globalAlpha = 1;
        }
        if ((t === T.STAIRS_DOWN || t === T.STAIRS_UP) && nMarks < 8) {
          let m = marks[nMarks];
          if (!m) m = marks[nMarks] = { x: 0, y: 0, up: false };
          nMarks++;
          m.x = sx + 16; m.y = sy + 8; m.up = t === T.STAIRS_UP;
        }
      }
    }

    // ---- collect depth-sorted things
    const props = map.props || [];
    for (let i = 0; i < props.length; i++) {
      const pr = props[i];
      if (!pr) continue;
      const idx = (pr.y | 0) * mw + (pr.x | 0);
      if (exp && !exp[idx]) continue;
      pushItem(0, pr, (pr.x | 0) + 0.5, (pr.y | 0) + 0.5, 0, !vis || !!vis[idx]);
    }
    const gis = S.groundItems || [];
    nPiles = 0;
    for (let i = 0; i < gis.length; i++) {
      const g = gis[i];
      if (!g || !isFinite(g.x) || !isFinite(g.y)) continue;
      const idx = Math.floor(g.y) * mw + Math.floor(g.x);
      if (exp && !exp[idx]) continue;
      if (!filterAllows(g)) continue;                       // R16: filtered-out loot is not shown at all
      if (seen.get(g.id) === undefined) { if (seen.size > 500) seen.clear(); seen.set(g.id, spill(g)); }
      if (g.pileId == null) { pushItem(1, g, g.x, g.y, -0.3, true); continue; }
      let pl = pileMap.get(g.pileId);
      if (!pl) {
        pl = pilePool[nPiles];
        if (!pl) pl = pilePool[nPiles] = { a: null, b: null, c: null, n: 0, ra: 0, rb: 0, rc: 0, x: 0, y: 0 };
        nPiles++;
        pl.a = g; pl.b = pl.c = null; pl.n = 1; pl.ra = lootRank(g); pl.rb = pl.rc = -99; pl.x = g.x; pl.y = g.y;
        pileMap.set(g.pileId, pl);
        continue;
      }
      pl.n++;
      const r = lootRank(g);                       // keep the three best: a on top, b and c peeking out
      if (r > pl.ra) { pl.c = pl.b; pl.rc = pl.rb; pl.b = pl.a; pl.rb = pl.ra; pl.a = g; pl.ra = r; }
      else if (r > pl.rb) { pl.c = pl.b; pl.rc = pl.rb; pl.b = g; pl.rb = r; }
      else if (r > pl.rc) { pl.c = g; pl.rc = r; }
    }
    for (let i = 0; i < nPiles; i++) {
      const pl = pilePool[i];
      if (pl.n === 1) pushItem(1, pl.a, pl.a.x, pl.a.y, -0.3, true);
      else pushItem(4, pl, pl.x, pl.y, -0.3, true);
    }
    pileMap.clear();
    const ents = S.entities || [];
    for (let i = 0; i < ents.length; i++) {
      const en = ents[i];
      if (!en || !isFinite(en.x) || !isFinite(en.y)) continue;
      const idx = Math.floor(en.y) * mw + Math.floor(en.x);
      if (vis && !vis[idx] && en.type !== 'npc') continue;
      if (exp && !exp[idx]) continue;
      pushItem(2, en, en.x, en.y, en.dead ? -0.6 : 0, true);
    }
    if (fr.hasP) pushItem(2, p, p.x, p.y, p.dead ? -0.6 : 0.01, true);
    const prj = S.projectiles || [];
    for (let i = 0; i < prj.length; i++) {
      const pj = prj[i];
      if (!pj || !isFinite(pj.x) || !isFinite(pj.y)) continue;
      if (vis && !vis[Math.floor(pj.y) * mw + Math.floor(pj.x)]) continue;
      pushItem(3, pj, pj.x, pj.y, 0.2, true);
    }
    ord.length = dn;
    for (let i = 0; i < dn; i++) ord[i] = dl[i];
    ord.sort(cmp);

    // ---- object pass: walls by diagonal, merged with the sorted list
    let q = 0;
    while (q < dn && ord[q].b < dMin) drawItem(ctx, ord[q++]);
    for (let d = dMin; d <= dMax; d++) {
      for (let e = eMin + ((d + eMin) & 1); e <= eMax; e += 2) {
        const tx = (d + e) >> 1, ty = (d - e) >> 1;
        if (tx < 0 || ty < 0 || tx >= mw || ty >= mh) continue;
        const i = ty * mw + tx, t = tiles[i], ts = bm && bm[i] ? bs : set;
        if (t !== T.WALL && t !== T.DOOR && t !== T.STAIRS_UP) continue;
        if (exp && !exp[i]) continue;
        const lit = !vis || vis[i];
        const sx = e * HW - ox - 16, sy = d * HH - oy;
        if (t === T.WALL) {
          const lvl = info[i], vr = ((Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 9) & 3;
          const img = ts.wall[lvl][vr], hgt = WH[lvl];
          if (lvl < 2 && fr.hasP && d + 1 > fr.pd && sx + 16 > fr.psx - 34 && sx + 16 < fr.psx + 34 && sy - hgt < fr.psy + 2 && sy + 16 > fr.psy - 26) {
            const low = ts.wall[2][vr];
            U.blit(ctx, lit ? low : U.dim(low), sx, sy - WH[2]);
            ctx.globalAlpha = 0.2;
            U.blit(ctx, img, sx, sy - hgt);
            ctx.globalAlpha = 1;
          } else {
            U.blit(ctx, lit ? img : U.dim(img), sx, sy - hgt);
          }
        } else if (t === T.DOOR) {
          const img = set.door[info[i] & 1];
          if (fr.hasP && d + 0.5 > fr.pd && Math.abs(sx + 16 - fr.psx) < 30 && sy - 24 < fr.psy && sy + 16 > fr.psy - 26) ctx.globalAlpha = 0.3;
          U.blit(ctx, lit ? img : U.dim(img), sx, sy - U.tiles.WALL_H);
          ctx.globalAlpha = 1;
        } else {
          const su = set.stairsUp;
          U.blit(ctx, lit ? su : U.dim(su), sx, sy - (su.height / (su.hd || 1) - 16));
        }
      }
      while (q < dn && ord[q].b <= d) drawItem(ctx, ord[q++]);
    }
    while (q < dn) drawItem(ctx, ord[q++]);

    // ---- lighting: additive light map multiplied over the scene
    U.rift.lights(map, addLight, ox, oy, W, H, V.time);
    emberLights(ox, oy, W, H);
    if (lightX) {
      lightX.globalCompositeOperation = 'source-over';
      lightX.fillStyle = U.rift.amb(VR);
      lightX.fillRect(0, 0, LW, LH);
      lightX.globalCompositeOperation = 'lighter';
      if (fr.hasP) {
        const wp = U.rift.warp(WARP, V.time), rx = VR.lightR * 22 * (1 + 0.02 * Math.sin(V.time * 7.3)) * wp.a, ry = rx * 0.6 * wp.b / wp.a;
        lightX.drawImage(LS(VR.lightKey), (fr.psx + wp.dx - rx) / 2, (fr.psy - 10 - ry) / 2, rx, ry);
      }
      for (let i = 0; i < nLights; i++) {
        const l = lights[i], rx = l.r * 22, ry = rx * 0.6;
        lightX.drawImage(LS(l.key), (l.x - rx) / 2, (l.y - ry) / 2, rx, ry);
      }
      ctx.globalCompositeOperation = 'multiply';
      ctx.imageSmoothingEnabled = V.R > 1 && !fr.low;     // D2-style: the light map is filtered, not blocky
      ctx.drawImage(lightC, 0, 0, LW * 2, LH * 2);
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---- Pallor (R5.2): the world drains of colour by tier. One composite fill over the lit world, before loot,
    // spell fx, labels and bars are drawn, so those stay fully saturated. No per-pixel work in JS.
    // lowFx: no screen-wide washes (rift / town / Pallor); the Pallor meter in the HUD still tells the story
    if (!fr.low) U.rift.post(ctx, W, H, ox, oy, map, V.time, LW, LH);
    if (!fr.low && drawPallor(ctx, W, H)) for (let i = 0; i < nReicons; i++) { const ri = reicons[i]; U.blit(ctx, ri.img, ri.x, ri.y); }

    // ---- overlay: beams, fx, markers, labels, bars, text, joystick
    // rare+ loot: soft pulsing halo, beam, then the icon again on top so it stays bright after lighting.
    // Legendary tier (Elite = 2, Mythic = 3): taller double beam and orbiting sparkles; Mythic adds a second counter-orbit.
    if (nBeams) {
      for (let i = 0; i < nBeams; i++) {
        const b = beams[i], o = b.o, h = halo(b.c), t = V.time;
        const pulse = 0.5 + 0.5 * Math.sin(t * (o >= 5 ? 1.3 : 3) + b.id);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (o === 1 ? 0.3 : 0.45) + (o === 1 ? 0.2 : 0.35) * pulse;
        const hw = BEAM_HALO[o];
        ctx.drawImage(h, b.x - (hw >> 1), b.y - (hw >> 2) - 1, hw, hw >> 1);
        if (BEAM_H[o]) {
          const bm = U.beam(b.c, BEAM_H[o]);
          ctx.globalAlpha = 0.55 + 0.3 * pulse;
          ctx.drawImage(bm, b.x - 4, b.y - bm.height + 1);
          if (o >= 4) ctx.drawImage(bm, b.x - 4, b.y - bm.height + 1);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        U.blit(ctx, b.icon, b.x - 8, b.y - 13 - b.hop);
        if (o >= 3) {
          const n = o === 3 ? 3 : o === 4 ? 4 : 6;
          for (let k = 0; k < n; k++) {
            const inner = k >= 3, a = (inner ? -t * 2.1 : t * 1.4) + k * 6.283 / Math.min(3, n) + b.id;
            const px = Math.round(b.x + Math.cos(a) * (inner ? 6 : 11)), py = Math.round(b.y - 6 + Math.sin(a) * (inner ? 3 : 5) - (inner ? 8 : 0));
            ctx.fillStyle = Math.sin(a) > 0 || inner ? '#ffffff' : b.c;
            ctx.fillRect(px, py, 1, 1);
            if (!inner && k === 0) { ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3); }
          }
        }
      }
    }
    drawSpills(ctx, ox, oy);
    drawRoute(ctx, map, ox, oy, W, H);
    drawGaps(ctx, ox, oy, W, H, map);
    drawEmbers(ctx, ox, oy, W, H, map);
    for (let i = 0; i < nBadges; i++) {           // pile count badges, after lighting so they stay readable
      const bd = badges[i];
      ctx.fillStyle = '#0b0910';
      ctx.fillRect(bd.x - 1, bd.y, bd.img.width + 1, 9);
      ctx.drawImage(bd.img, bd.x - 1, bd.y);
    }
    drawAtmosphere(ctx, VR, W, H, ox, oy);
    U.fx.draw(ctx, ox, oy, W, H);

    if (nMarks) {
      if (!arrowDown) arrows();
      const bob = Math.round(Math.sin(V.time * 4) * 2);
      for (let i = 0; i < nMarks; i++) { const m = marks[i]; ctx.drawImage(m.up ? arrowUp : arrowDown, m.x - 5, m.y - (m.up ? 36 : 20) + bob); }
    }

    // loot labels: stack upward instead of overlapping
    for (let i = 0; i < nLabels; i++) {
      const l = labels[i];
      for (let pass = 0; pass < 16; pass++) {
        let hit = false;
        for (let j = 0; j < i; j++) {
          const o = labels[j];
          if (l.x < o.x + o.w + 2 && l.x + l.w + 2 > o.x && Math.abs(l.y - o.y) < 10) { hit = true; break; }
        }
        if (!hit) break;
        l.y -= 10;
      }
      ctx.fillStyle = 'rgba(8,6,12,0.72)';
      ctx.fillRect(l.x - 1, l.y, l.w + 2, 9);
      ctx.drawImage(l.img, l.x, l.y);
    }

    for (let i = 0; i < nBars; i++) {
      const b = bars[i], e = b.e;
      let y = b.y;
      if (e.type === 'monster') {
        const fal = isFallen(e), wb = !fal && isWorldBoss(e), boss = e.rarity === 'boss' || wb, w = wb ? 40 : boss ? 30 : fal ? 28 : e.rarity === 'legendary' ? 26 : RIM[e.rarity] ? 20 : 14;
        const max = (e.stats && e.stats.hpMax) || e.hp || 1, f = Math.max(0, Math.min(1, e.hp / max));
        ctx.fillStyle = '#0b0910';
        ctx.fillRect(b.x - (w >> 1) - 1, y - 1, w + 2, boss ? 5 : 4);
        ctx.fillStyle = '#3a1014';
        ctx.fillRect(b.x - (w >> 1), y, w, boss ? 3 : 2);
        ctx.fillStyle = fal ? '#a03ad8' : wb ? '#ff9a2a' : boss ? '#ff5a2a' : '#d8281e';
        ctx.fillRect(b.x - (w >> 1), y, Math.round(w * f), boss ? 3 : 2);
        ctx.fillStyle = fal ? '#e0a8ff' : boss ? '#ffb070' : '#ff7a6a';
        ctx.fillRect(b.x - (w >> 1), y, Math.round(w * f), 1);
        y -= 10;
      } else {
        y -= 6;
      }
      const fal = isFallen(e), wb = !fal && isWorldBoss(e);
      const color = e.type === 'npc' ? '#ffe9a8' : isEcho(e) ? '#bfe6ff' : fal ? PLATE.fallen : wb ? PLATE.world : PLATE[e.rarity];
      if (color && e.name) {
        // modifier names under the plate: rare / legendary only, and only when near the player or targeted
        // the Fallen and the world boss carry a title line instead of modifier names
        const af = fal ? FALLEN_SUB : wb ? WORLD_SUB : (e.rarity === 'rare' || e.rarity === 'legendary') && Array.isArray(e.affixes) ? e.affixes : null;
        let lines = 0;
        if (af && af.length && p) {
          const dx = e.x - p.x, dy = e.y - p.y;
          if (fal || wb || dx * dx + dy * dy < 36 || p.targetId === e.id || S.targetId === e.id) lines = Math.min(3, af.length);
        }
        y -= lines * 8;
        const nm = e.type === 'npc' && npcLook(e) && ROLE_NAME[e.role] && G.game && G.game.NPCS && G.game.NPCS.merchant && e.name === G.game.NPCS.merchant.name ? ROLE_NAME[e.role] : e.name;
        const img = U.text(String(nm).slice(0, 26), color);
        ctx.drawImage(img, b.x - (img.width >> 1), y);
        if (e.type === 'npc') questMarker(ctx, e, b.x, y - 3);
        for (let k = 0; k < lines; k++) {
          let s = String(af[k]).slice(0, 18);
          if (k === 2 && af.length > 3) s = '+' + (af.length - 2);
          const m = U.text(s, fal ? '#b080d8' : wb ? '#e8b060' : e.rarity === 'legendary' ? '#d8a878' : '#c8c098');
          ctx.drawImage(m, b.x - (m.width >> 1), y + 8 + k * 8);
        }
      }
    }

    U.fx.drawText(ctx, ox, oy);
    drawDanger(ctx, p, W, H);
    if (glint.t > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, glint.t / 0.7) * 0.8;
      ctx.fillStyle = glint.c;
      ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(0, 0, 2, H); ctx.fillRect(W - 2, 0, 2, H);
      ctx.globalAlpha *= 0.4;
      ctx.fillRect(2, 2, W - 4, 2); ctx.fillRect(2, H - 4, W - 4, 2); ctx.fillRect(2, 2, 2, H - 4); ctx.fillRect(W - 4, 2, 2, H - 4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    drawJoystick(ctx);
    if (st.showFps) drawFps(ctx, W, performance.now() - tStart);
  };

  // Floating stick: drawn while held. Fixed stick (R5.1): always drawn at its anchor (dimmer when idle).
  const vrect = { left: 0, top: 0, width: 0, height: 0 };
  function drawJoystick(ctx) {
    const joy = U.input.joy, S = G.state;
    if (!joy.active && (S.paused || (S.player && S.player.dead))) return;
    vrect.left = V.left; vrect.top = V.top; vrect.width = V.W * V.scale; vrect.height = V.H * V.scale;
    const c = U.input.config(vrect);
    if (!c || (!joy.active && !c.fixed)) return;
    let cx = c.cx, cy = c.cy, mx = 0, my = 0, rr = c.r, alpha = 0.55 * c.opacity;
    if (joy.active) { cx = joy.ox; cy = joy.oy; mx = joy.mx; my = joy.my; rr = joy.r; alpha = c.opacity; }
    if (alpha <= 0.02) return;
    const r = Math.max(8, Math.round(rr / V.scale));
    joySprites(r);
    const bx = Math.round((cx - V.left) / V.scale), by = Math.round((cy - V.top) / V.scale);
    const kx = Math.round((cx + mx - V.left) / V.scale), ky = Math.round((cy + my - V.top) / V.scale);
    ctx.globalAlpha = alpha;
    const hb = U.assets && U.assets.ui('joystick_base'), hk = U.assets && U.assets.ui('joystick_knob');
    ctx.imageSmoothingEnabled = !!(hb || hk);
    const bd = r * 2 + 5, kd = Math.round(bd * 0.4);             // painted ui/joystick_*.png scale to the stick size
    if (hb) ctx.drawImage(hb, bx - bd / 2, by - bd / 2, bd, bd); else ctx.drawImage(joyBase, bx - (joyBase.width >> 1), by - (joyBase.height >> 1));
    if (hk) ctx.drawImage(hk, kx - kd / 2, ky - kd / 2, kd, kd); else ctx.drawImage(joyKnob, kx - (joyKnob.width >> 1), ky - (joyKnob.height >> 1));
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- minimap
  let mmC = null, mmX = null, mmImg = null, mm32 = null;
  const abgr = function (r, g, b, a) { return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; };
  const MMC = {
    floor: abgr(150, 138, 120, 235), floorDim: abgr(92, 86, 80, 215), wall: abgr(58, 52, 66, 235), wallDim: abgr(40, 36, 48, 215),
    water: abgr(50, 100, 170, 235), lava: abgr(230, 100, 30, 235), door: abgr(190, 140, 70, 240), grass: abgr(70, 110, 66, 230),
    deepWater: abgr(22, 44, 84, 235), deepLava: abgr(255, 170, 40, 235), chasm: abgr(14, 10, 20, 235), blocked: abgr(30, 28, 36, 235),
    path: abgr(150, 124, 92, 235), down: abgr(255, 150, 40, 255), up: abgr(140, 200, 255, 255),
    charted: abgr(84, 80, 92, 140), chartedWall: abgr(44, 40, 52, 140),
  };
  const MM_PROP = { inn: '#ffb050', inn_fire: '#ffb050', chute: '#5be0c8', surface_crate: '#d8a050', portal: '#b65bff', waypoint: '#4ac8ff', dungeon_entrance: '#ff7a2a', stash: '#ffd94a', shrine: '#fff0a0', chest: '#e8b040', corpse: '#7fe8ff' };

  E.drawMinimap = function (ctx, w, h) {
    if (!ctx || !(w > 0) || !(h > 0)) return;
    const S = G.state, map = S.map;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    if (!map || !map.tiles) { ctx.restore(); return; }
    const mw = map.w, mh = map.h, tiles = map.tiles;
    if (!mmC || mmC.width !== mw || mmC.height !== mh) {
      mmC = U.makeCanvas(mw, mh); mmX = U.ctx2d(mmC);
      mmImg = mmX.createImageData(mw, mh); mm32 = new Uint32Array(mmImg.data.buffer);
    }
    const exp = map.explored && map.explored.length === tiles.length ? map.explored : null;
    const tnt = map.taint && map.taint.length === tiles.length ? map.taint : null;
    const vis = map.kind !== 'town' && map.visible && map.visible.length === tiles.length ? map.visible : null;
    // R16: map.revealed (true or Uint8Array) charts the map without lifting the fog in the world view (relic maps etc.)
    const rev = map.revealed === true ? true : map.revealed && map.revealed.length === tiles.length ? map.revealed : null;
    for (let i = 0; i < mw * mh; i++) {
      const t = tiles[i];
      if (t === T.VOID) { mm32[i] = 0; continue; }
      if (exp && !exp[i]) { mm32[i] = rev && (rev === true || rev[i]) ? (C.WALKABLE[t] ? MMC.charted : t === T.WALL ? MMC.chartedWall : 0) : 0; continue; }
      const lit = !vis || vis[i];
      mm32[i] = t === T.WALL ? (lit ? MMC.wall : MMC.wallDim) : t === T.WATER ? MMC.water : t === T.LAVA ? MMC.lava : t === T.DOOR ? MMC.door
        : t === T.STAIRS_DOWN ? MMC.down : t === T.STAIRS_UP ? MMC.up : t === T.GRASS ? MMC.grass : t === T.PATH || t === T.BRIDGE ? MMC.path : t === T.DEEP_WATER ? MMC.deepWater : t === T.DEEP_LAVA ? MMC.deepLava : t === T.CHASM ? MMC.chasm
          : !C.WALKABLE[t] ? (C.OPAQUE[t] ? MMC.wallDim : MMC.blocked) : (lit ? MMC.floor : MMC.floorDim);
    }
    mmX.putImageData(mmImg, 0, 0);

    const p = S.player, hasP = !!(p && isFinite(p.x) && isFinite(p.y));
    const whole = w >= 220 || !hasP;
    const s = whole ? Math.min(w, h * 2) / (mw + mh) * 0.98 : Math.max(1.5, w / 44);
    const cx = whole ? mw / 2 : p.x, cy = whole ? mh / 2 : p.y;
    // remembered for mapPick (taps on the full map are in the same canvas pixels as w / h)
    pick.map = map; pick.w = w; pick.h = h; pick.s = s; pick.cx = cx; pick.cy = cy; pick.whole = whole;
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    ctx.translate(w / 2, h / 2);
    ctx.transform(s, s / 2, -s, s / 2, 0, 0);          // iso: sx = (x - y) * s, sy = (x + y) * s / 2
    ctx.translate(-cx, -cy);
    ctx.drawImage(mmC, 0, 0);
    const mark = function (x, y, r, c) { ctx.fillStyle = c; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    const big = Math.max(0.9, 2.2 / s);
    // exits
    for (let i = 0; i < mw * mh; i++) {
      const t = tiles[i];
      if ((t === T.STAIRS_DOWN || t === T.STAIRS_UP) && (!exp || exp[i])) mark((i % mw) + 0.5, ((i / mw) | 0) + 0.5, big * 1.2, t === T.STAIRS_DOWN ? '#ff9628' : '#8cc8ff');
    }
    const props = map.props || [];
    for (let i = 0; i < props.length; i++) {
      const pr = props[i], c = pr && MM_PROP[pr.type];
      if (!c || pr.used || (exp && !exp[(pr.y | 0) * mw + (pr.x | 0)])) continue;
      mark(pr.x + 0.5, pr.y + 0.5, big, c);
    }
    const lms = Array.isArray(map.landmarks) ? map.landmarks : [];
    for (let i = 0; i < lms.length; i++) {
      const lm = lms[i];
      if (!lm || lm.id !== 'dash_gap' || !Array.isArray(lm.gap)) continue;
      for (let j = 0; j < lm.gap.length; j++) { const g = lm.gap[j]; if (!exp || exp[g.y * mw + g.x]) mark(g.x + 0.5, g.y + 0.5, big * 0.9, '#9fe0ff'); }
    }
    // R16 left-behind loot (bag was full): a pulsing magenta pin with a dark rim until it is picked up
    const gis = S.groundItems || [], on = (performance.now() % 900) < 600;
    for (let i = 0; i < gis.length; i++) {
      const g = gis[i];
      if (!leftBehind(g) || !isFinite(g.x) || !isFinite(g.y) || (exp && !exp[Math.floor(g.y) * mw + Math.floor(g.x)])) continue;
      mark(g.x, g.y, big * 1.5, '#0b0910');
      mark(g.x, g.y, big * (on ? 1.15 : 0.9), '#ff5ad0');
    }
    const ents = S.entities || [];
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (!e || e.dead || !isFinite(e.x) || !isFinite(e.y)) continue;
      if (e.type === 'npc') mark(e.x, e.y, big, '#5bff8a');
      else if (e.type === 'monster' && (!vis || vis[Math.floor(e.y) * mw + Math.floor(e.x)])) mark(e.x, e.y, e.rarity === 'boss' ? big * 1.3 : big * 0.7, e.rarity === 'boss' ? '#ff3b4e' : '#e03a2a');
    }
    if (hasP) {
      mark(p.x, p.y, big * 1.5, '#0b0910');
      mark(p.x, p.y, big * 1.1, (performance.now() % 600) < 420 ? '#ffffff' : '#ffd94a');
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- R16 map tap: what is under (sx, sy)?
  // sx, sy = pixels on the canvas last drawn with drawMinimap (the same units as its w / h). Returns the nearest discovered
  // thing within a finger's reach → { kind, name, x, y } (x, y in tiles), or null. Only explored tiles count.
  const pick = { map: null, w: 0, h: 0, s: 1, cx: 0, cy: 0, whole: false };
  function leftBehind(g) { return !!g && (g.leftBehind === true || !!(g.item && g.item.leftBehind === true)); }
  const PICK_PROP = {
    chute: 'Chute', surface_crate: 'Surface crate', portal: 'Town portal', waypoint: 'Waypoint', dungeon_entrance: 'Way down', stash: 'Stash',
    shrine: 'Shrine', chest: 'Chest', corpse: 'Your corpse', campfire: 'Campfire', inn: 'The inn', inn_fire: 'Fire at the inn', well: 'Well', fountain: 'Fountain',
  };
  E.mapPick = function (sx, sy) {
    const S = G.state, map = S.map;
    if (!map || pick.map !== map || !(pick.s > 0) || !isFinite(sx) || !isFinite(sy)) return null;
    const a = (sx - pick.w / 2) / pick.s, b = (sy - pick.h / 2) * 2 / pick.s;      // a = x - y, b = x + y (relative)
    const wx = pick.cx + (a + b) / 2, wy = pick.cy + (b - a) / 2;
    const reach = Math.max(1.2, 9 / pick.s), mw = map.w;
    const exp = map.explored && map.explored.length === map.tiles.length ? map.explored : null;
    const seen = function (x, y) { const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < mw && ty < map.h && (!exp || exp[ty * mw + tx]); };
    let best = null, bd = reach;
    const consider = function (kind, name, x, y, bias) {
      if (!seen(x, y)) return;
      const d = Math.hypot(x - wx, y - wy) - (bias || 0);
      if (d < bd) { bd = d; best = { kind: kind, name: name, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }; }
    };
    for (let i = 0; i < map.tiles.length; i++) {
      const t = map.tiles[i];
      if (t === T.STAIRS_DOWN || t === T.STAIRS_UP) consider('stairs', t === T.STAIRS_DOWN ? 'Stairs down' : 'Stairs up', (i % mw) + 0.5, ((i / mw) | 0) + 0.5, 0.3);
    }
    const props = map.props || [];
    for (let i = 0; i < props.length; i++) {
      const pr = props[i];
      if (!pr || !PICK_PROP[pr.type] || (pr.used && pr.type !== 'chest')) continue;
      consider(pr.type === 'shrine' && pr.look === 'rift_shrine' ? 'shrine' : pr.type, pr.name || (pr.look === 'rift_shrine' ? 'Rift shrine' : PICK_PROP[pr.type]), pr.x + 0.5, pr.y + 0.5, 0.2);
    }
    const camps = Array.isArray(map.camps) ? map.camps : [];
    for (let i = 0; i < camps.length; i++) { const c = camps[i]; if (c && c.fire) consider('camp', c.name || 'Camp', c.fire.x + 0.5, c.fire.y + 0.5, 0.3); }
    const lms = Array.isArray(map.landmarks) ? map.landmarks : [];
    for (let i = 0; i < lms.length; i++) { const l = lms[i]; if (l && l.name) consider('landmark', l.name, l.x + (l.w || 1) / 2, l.y + (l.h || 1) / 2); }
    const evs = Array.isArray(map.events) ? map.events : [];
    for (let i = 0; i < evs.length; i++) { const v = evs[i]; if (v && isFinite(v.x) && isFinite(v.y)) consider('event', v.name || 'Event', v.x + 0.5, v.y + 0.5, 0.2); }
    const gis = S.groundItems || [];
    for (let i = 0; i < gis.length; i++) {
      const g = gis[i];
      if (leftBehind(g)) consider('pile', 'Left behind: ' + String((g.item && g.item.name) || 'loot'), g.x, g.y, 0.5);
    }
    const ents = S.entities || [];
    for (let i = 0; i < ents.length; i++) { const e = ents[i]; if (e && e.type === 'npc' && !e.dead) consider('npc', String(e.name || e.role || 'Someone'), e.x, e.y, 0.2); }
    return best;
  };
})();
