// R17 motion: a visual state the renderer keeps beside each entity (the game's x / y / anim / animT are never written).
// Shoves and knockback ease out instead of popping, hits jolt the target and briefly freeze its pose (hit-stop), the
// player's swing holds a beat on its strike frame when it connects, walk cycles advance with the ground actually covered
// (no foot sliding at any speed), animation changes get a short hold / cross-fade, bodies slide with their momentum and
// settle when they die, and melee swings leave a weapon trail. With settings.lowFx none of it runs (the old look).
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  const C = G.C, HW = C.TILE_W / 2, HH = C.TILE_H / 2, HD = U.HD;

  // Reference walk: the player's base speed on screen, in art (2x) px per second. One walk loop at the default timing
  // (HD.TIME.walk) covers STRIDE px of ground — ART_SPEC "Smooth animation" tells the artist to paint to that.
  const ISO = Math.hypot(HW, HH);
  function refSpeed() { return ((G.game && G.game.BASE_SPEED) || 5) * ISO * 2; }
  U.motion = { STRIDE: 0 };
  U.motion.stride = function () { return (U.motion.STRIDE = refSpeed() * HD.TIME.walk); };

  const vs = new WeakMap();
  let frameNo = 0, P = null;
  U.motion.begin = function (player) { frameNo++; P = player || null; };

  function make(e) {
    return {
      f: -1, px: e.x, py: e.y, vx: 0, vy: 0, kx: 0, ky: 0,        // last position, velocity (tiles/s), knockback offset
      walk: (typeof e.id === 'number' && isFinite(e.id) ? Math.abs(e.id) * 37 % 89 : 0), hf: 0, rx: 0, ry: 0, rt: 9, ra: 0,  // walked px (seeded so crowds are out of step), hit recoil
      stop: 0, stopAt: -1, stopLen: 0, shift: 0, anim: '', lastT: 0, t: 0, changed: false, fresh: true,
      dead: !!e.dead, dt: 9, sx: 0, sy: 0, landed: true,          // death: time since, slide vector (tiles), thud done
      last: { img: null, sx: 0, sy: 0, s: 0, d: 0, ox: 0, oy: 0, mirror: false, anim: '' },
      prev: { img: null, sx: 0, sy: 0, s: 0, d: 0, ox: 0, oy: 0, mirror: false, anim: '' }, bt: 9, hold: 0,
      ox: 0, oy: 0,                                               // this frame's screen offset (logical px)
    };
  }
  U.motion.get = function (e) { let m = vs.get(e); if (!m) { m = make(e); vs.set(e, m); } return m; };

  const easeOut = function (k) { return 1 - (1 - k) * (1 - k); };
  // hit recoil: out fast (55 ms), back slowly — a jolt, not a wobble
  function recoil(k) { return k < 0.22 ? easeOut(k / 0.22) : k < 1 ? 1 - (1 - Math.cos((k - 0.22) / 0.78 * Math.PI)) / 2 : 0; }

  // Once per frame per drawn entity. dt = frame time, low = lowFx.
  U.motion.step = function (e, dt, low) {
    const m = U.motion.get(e);
    if (m.f === frameNo) return m;
    m.f = frameNo;
    const mx = e.x - m.px, my = e.y - m.py, d = Math.hypot(mx, my), dead = !!e.dead;
    m.px = e.x; m.py = e.y;
    const fresh = m.fresh; m.fresh = false;
    if (d > 3 || fresh) {                                          // a new floor, a teleport, a blink: just be there
      m.kx = m.ky = m.vx = m.vy = 0;
    } else if (dt > 0) {
      const jump = d > 0.3 && d / Math.max(dt, 1 / 120) > 14;      // faster than anything walks: a shove
      if (jump && !low && e !== P && !dead) { m.kx -= mx; m.ky -= my; }
      else {
        const k = 1 - Math.exp(-dt * 12);
        m.vx += (mx / dt - m.vx) * k; m.vy += (my / dt - m.vy) * k;
        if (e.anim === 'walk' && !dead) m.walk += Math.hypot((mx - my) * HW, (mx + my) * HH) * 2;     // art px of ground covered
      }
    }
    const kd = Math.exp(-dt * 15);                                 // knockback eases out over ~0.2 s
    m.kx *= kd; m.ky *= kd;
    if (Math.abs(m.kx) + Math.abs(m.ky) < 0.004) m.kx = m.ky = 0;

    // a new hit: the game sets hitFlash to 0.12 — jolt away from the player (or back from the facing, for the player)
    const hf = +e.hitFlash || 0;
    if (!low && !dead && hf > m.hf + 0.04) {
      m.stop = Math.max(m.stop, e === P ? 0.045 : 0.065); m.stopAt = -1;
      let ax, ay;
      if (e !== P && P) { ax = e.x - P.x; ay = e.y - P.y; } else { ax = -Math.cos(+e.facing || 0); ay = -Math.sin(+e.facing || 0); }
      const n = Math.hypot(ax, ay) || 1;
      m.rx = ax / n; m.ry = ay / n; m.rt = 0; m.ra = e === P ? 0.05 : 0.11;
    }
    m.hf = hf;

    // the anim clock as the game runs it, minus time spent frozen in hit-stop since this animation began
    const t = typeof e.animT === 'number' && isFinite(e.animT) ? e.animT : 0, anim = dead ? 'die' : (e.anim || 'idle');
    m.changed = anim !== m.anim || t < m.lastT - 1e-4;
    // (a strike-frame stop scheduled by player:dealt survives the change into 'attack' — the hit lands in the same update)
    if (m.changed) { m.shift = 0; if (anim !== m.anim) { m.stop = 0; if (anim !== 'attack') m.stopAt = -1; } }
    m.anim = anim; m.lastT = t;
    if (m.stopAt >= 0 && t - m.shift >= m.stopAt) { m.stop = Math.max(m.stop, m.stopLen); m.stopAt = -1; }
    if (m.stop > 0 && !low) { const s = Math.min(m.stop, dt); m.stop -= s; m.shift = Math.min(t, m.shift + s); }
    else m.stop = 0;
    m.t = Math.max(0, t - m.shift);

    // death: momentum carries the body a little further (and away from the killer), then it settles with a thud
    if (dead && !m.dead) {
      m.dt = 0; m.landed = false;
      let vx = m.vx * 0.12, vy = m.vy * 0.12;
      if (P && e !== P) { const ax = e.x - P.x, ay = e.y - P.y, n = Math.hypot(ax, ay) || 1; vx += ax / n * 0.18; vy += ay / n * 0.18; }
      const n = Math.hypot(vx, vy);
      if (n > 0.38) { vx *= 0.38 / n; vy *= 0.38 / n; }
      m.sx = low ? 0 : vx; m.sy = low ? 0 : vy;
    } else if (!dead && m.dead) { m.sx = m.sy = 0; m.dt = 9; }
    m.dead = dead;
    if (dead && m.dt < 9) m.dt += dt;

    // screen offset this frame: knockback + recoil + death slide (world → logical px)
    let wx = m.kx, wy = m.ky, lift = 0;
    if (m.rt < 0.3) { m.rt += m.stop > 0 ? dt * 0.35 : dt; const r = recoil(Math.min(1, m.rt / 0.3)) * m.ra; wx += m.rx * r; wy += m.ry * r; }
    if (dead) {
      const k = Math.min(1, m.dt / 0.42);
      wx += m.sx * easeOut(k); wy += m.sy * easeOut(k);
      const land = HD.TIME.die * 0.85;                             // the body hits the ground near the end of the fall
      if (m.dt > land && m.dt < land + 0.16) lift = Math.sin((m.dt - land) / 0.16 * Math.PI) * 1.5;
      if (!m.landed && m.dt > land && !low) { m.landed = true; if (U.fx && m.dt < land + 0.2) U.fx.burst(e.x + m.sx, e.y + m.sy, DUST); }
    }
    m.ox = (wx - wy) * HW; m.oy = (wx + wy) * HH - lift;
    if (m.stop > 0 && e !== P) m.ox += (frameNo & 1) ? 0.5 : -0.5;      // a tremor while frozen
    return m;
  };
  const DUST = { n: 5, sp: [0.3, 0.9], vz: [6, 18], life: [0.3, 0.55], size: 1, cols: ['#4a4440', '#5a524c', '#38322e'], grav: 40, z: 1, spread: 0.25 };

  // Walk phase in loops (0..∞) from the ground covered. stride = art px one loop covers: the file's `stride`, else from
  // its fps (frames / fps seconds at the reference speed), else the default timing; scaled by the cell for big bodies.
  U.motion.walkPhase = function (m, rec, cellScale) {
    const st = rec && rec.stride > 0 ? rec.stride : rec && rec.fps > 0 ? refSpeed() * rec.n / rec.fps : U.motion.stride() * (cellScale || 1);
    return m.walk / st;
  };

  // the player's swing holds its strike frame for a beat when it connects (damage lands as the swing starts, so the
  // freeze is scheduled for the frame where the weapon is fully out)
  G.on('player:dealt', function (ev) {
    const p = G.state.player;
    if (!p || !ev || ev.dot || ev.minion || p.anim !== 'attack' || (p.bonus && p.bonus.w && p.bonus.w.ranged)) return;
    const m = U.motion.get(p);
    if (m.stopAt >= 0 || m.stop > 0) return;
    m.stopLen = ev.crit ? 0.08 : 0.05;
    const at = HD.TIME.attack * 0.5;
    if ((p.animT || 0) - m.shift < at) m.stopAt = at; else m.stop = m.stopLen;
  });

  // Anim-change blend: hold the outgoing frame briefly after a swing / cast, then cross-fade (~70 ms). Called by the
  // renderer with the frame it is about to draw (fd); returns the outgoing frame to lay over it, or null.
  const NO_BLEND = { hit: 1, die: 1 };
  U.motion.blend = function (m, fd, anim, dt, low) {
    const L = m.last;
    if (m.changed && L.img && !low && !NO_BLEND[anim] && L.anim !== 'die') {
      const P2 = m.prev;
      P2.img = L.img; P2.sx = L.sx; P2.sy = L.sy; P2.s = L.s; P2.d = L.d; P2.ox = L.ox; P2.oy = L.oy; P2.mirror = L.mirror; P2.anim = L.anim;
      m.bt = 0; m.hold = (L.anim === 'attack' || L.anim === 'cast') && (anim === 'idle' || anim === 'walk') ? 0.05 : 0;
    } else if (m.changed) m.bt = 9;
    L.img = fd.img; L.sx = fd.sx; L.sy = fd.sy; L.s = fd.s; L.d = fd.d; L.ox = fd.ox; L.oy = fd.oy; L.mirror = fd.mirror; L.anim = anim;
    if (m.bt >= 9) return null;
    m.bt += dt;
    if (m.bt > m.hold + 0.07) { m.bt = 9; return null; }
    m.prev.a = m.bt < m.hold ? 1 : 1 - (m.bt - m.hold) / 0.07;
    return m.prev;
  };

  // ---- weapon trails: a crescent sweeping round the attacker during the strike part of a melee swing
  const MEL = Object.create(null);
  function meleeMonster(e) {
    const id = e.monsterId;
    if (typeof id !== 'string') return false;
    if (MEL[id] !== undefined) return MEL[id];
    const M = G.game && G.game.MONSTERS && G.game.MONSTERS[id];
    return (MEL[id] = !!M && !M.proj && !M.ranged);
  }
  function trailColour(e) {
    if (e === G.state.player) {
      const w = e.equipment && e.equipment.weapon, g = w && w.look && (w.look.glow || (Array.isArray(w.look.palette) && w.look.palette[2]));
      return U.safeColor(g, '#e8e2d4');
    }
    return '#b8b0a4';
  }
  U.motion.trail = function (ctx, e, sx, sy, m, T, scale) {
    if (e.anim !== 'attack' || e.dead) return;
    const p = G.state.player;
    if (e === p ? !!(p.bonus && p.bonus.w && p.bonus.w.ranged) || !e.equipment || !e.equipment.weapon : !meleeMonster(e)) return;
    const k = m.t / (T || HD.TIME.attack);
    if (k < 0.2 || k > 1.15) return;
    const f = e.facing || 0, r = 0.85 * (scale || 1), head = f - 1.25 + 2.3 * Math.min(1, (k - 0.2) / 0.55), tail = Math.max(f - 1.25, head - 1.5);
    const fade = (k > 0.8 ? Math.max(0, 1 - (k - 0.8) / 0.35) : 1) * (e === p ? 0.7 : 0.35);
    if (head - tail < 0.05 || fade <= 0) return;
    const cy = sy - 13 * (scale || 1), c = trailColour(e), SEG = 6;
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < SEG; s++) {
      const a0 = tail + (head - tail) * s / SEG, a1 = tail + (head - tail) * (s + 1) / SEG, w = (s + 1) / SEG;
      ctx.globalAlpha = fade * (0.15 + 0.85 * w * w);
      ctx.fillStyle = s === SEG - 1 ? '#ffffff' : c;
      ctx.beginPath();
      ctx.moveTo(sx + (Math.cos(a0) - Math.sin(a0)) * r * HW, cy + (Math.cos(a0) + Math.sin(a0)) * r * HH);
      ctx.lineTo(sx + (Math.cos(a1) - Math.sin(a1)) * r * HW, cy + (Math.cos(a1) + Math.sin(a1)) * r * HH);
      const ri = r * (0.5 + 0.25 * (1 - w));
      ctx.lineTo(sx + (Math.cos(a1) - Math.sin(a1)) * ri * HW, cy + (Math.cos(a1) + Math.sin(a1)) * ri * HH);
      ctx.lineTo(sx + (Math.cos(a0) - Math.sin(a0)) * ri * HW, cy + (Math.cos(a0) + Math.sin(a0)) * ri * HH);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
})();
