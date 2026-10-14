// Combat & Classes — shared helpers: math, event shorthands, guarded world access, timed effects.
// Everything else in src/game builds on G.game.U (utils), G.game.W (world wrappers) and the effect helpers here.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C;
  const game = G.game = G.game || {};

  const U = game.U = {};
  U.rng = G.rng.global;
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.dist = function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); };
  U.rand = function (a, b) { return a + U.rng.next() * (b - a); };
  U.chance = function (pct) { return U.rng.next() * 100 < pct; };
  U.fx = function (type, x, y, o) {
    const e = o || {};
    e.type = type; e.x = x; e.y = y;
    G.emit('fx:spawn', e);
  };
  U.text = function (x, y, text, color, crit) {
    if (G.state.settings && G.state.settings.showDamage === false) return;
    G.emit('fx:text', { x: x, y: y, text: String(text), color: color, crit: !!crit });
  };
  U.sfx = function (name) { G.emit('sfx', { name: name }); };
  U.toast = function (text, color) { G.emit('ui:toast', { text: text, color: color }); };
  U.shake = function (amount, duration) { G.emit('fx:shake', { amount: amount, duration: duration }); };
  U.zeroStats = function () {
    const s = {};
    for (const k of C.STATS) s[k] = 0;
    return s;
  };

  game.COLORS = { phys: '#f0e6d2', fire: '#ff7a2b', cold: '#7fd4ff', lightning: '#fff06a', poison: '#7be04a', shadow: '#b98cff', heal: '#5bff8a', mana: '#6aa8ff' };
  game.DTYPES = ['phys', 'fire', 'cold', 'lightning', 'poison'];
  game.RES_KEY = { fire: 'resFire', cold: 'resCold', lightning: 'resLightning', poison: 'resPoison' };

  // ---- world access: every call guarded so src/game runs (crudely) without the world team ----
  const W = game.W = {
    tile(x, y) {
      const m = G.state.map;
      if (!m) return 0;
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 0;
      return m.tiles[y * m.w + x];
    },
    walkable(x, y) {
      const m = G.state.map;
      if (!m) return false;
      if (G.world && G.world.isWalkable) return G.world.isWalkable(m, x, y);
      return !!C.WALKABLE[W.tile(x, y)];
    },
    canStand(x, y, r) {
      const m = G.state.map;
      if (!m) return false;
      if (G.world && G.world.canMoveTo) return G.world.canMoveTo(m, x, y, r);
      return W.walkable(x, y);
    },
    // Projectiles stop at opaque tiles and the map edge; they fly over water, lava and chasms like sight does.
    blocksShot(x, y) {
      const m = G.state.map;
      if (!m) return true;
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
      const t = m.tiles[y * m.w + x];
      return !!C.OPAQUE[t];
    },
    // Would a projectile get from A to B? Sampled exactly like projectile flight, so "can shoot" never disagrees with
    // what the shot then does (a sight line that grazes a wall corner is not a firing line).
    shotClear(x0, y0, x1, y1) {
      let tx = Math.floor(x0), ty = Math.floor(y0);
      const ex = Math.floor(x1), ey = Math.floor(y1);
      const dx = x1 - x0, dy = y1 - y0;
      const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
      const ddx = dx !== 0 ? Math.abs(1 / dx) : Infinity, ddy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
      let mx = dx !== 0 ? (dx > 0 ? tx + 1 - x0 : x0 - tx) * ddx : Infinity;
      let my = dy !== 0 ? (dy > 0 ? ty + 1 - y0 : y0 - ty) * ddy : Infinity;
      for (let guard = 0; (tx !== ex || ty !== ey) && guard < 96; guard++) {      // exact grid walk: every tile the segment touches
        if (mx < my) { tx += sx; mx += ddx; } else { ty += sy; my += ddy; }
        if (W.blocksShot(tx, ty)) return false;
      }
      return true;
    },
    los(x0, y0, x1, y1) {
      const m = G.state.map;
      if (!m) return false;
      if (G.world && G.world.hasLineOfSight) return G.world.hasLineOfSight(m, x0, y0, x1, y1);
      const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d * 2);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (W.blocksShot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
      }
      return true;
    },
    move(ent, dx, dy) {
      const m = G.state.map;
      if (!m) return false;
      if (G.world && G.world.moveWithCollision) return G.world.moveWithCollision(m, ent, dx, dy);
      let moved = false;
      if (dx && W.walkable(ent.x + dx, ent.y)) { ent.x += dx; moved = true; }
      if (dy && W.walkable(ent.x, ent.y + dy)) { ent.y += dy; moved = true; }
      return moved;
    },
    path(sx, sy, tx, ty, maxNodes) {
      const m = G.state.map;
      if (!m) return null;
      if (G.world && G.world.findPath) return G.world.findPath(m, sx, sy, tx, ty, maxNodes || 2000);
      return [{ x: tx, y: ty }];
    },
    // Walkable spot (tile centre) at or near x,y, or null.
    free(x, y, maxR) {
      const m = G.state.map;
      if (!m) return null;
      if (W.walkable(x, y)) return { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 };
      if (G.world && G.world.findFreeTileNear) {
        const t = G.world.findFreeTileNear(m, Math.floor(x), Math.floor(y), maxR || 6);
        return t ? { x: Math.floor(t.x) + 0.5, y: Math.floor(t.y) + 0.5 } : null;
      }
      for (let r = 1; r <= (maxR || 6); r++) {
        for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
          if (W.walkable(x + ox, y + oy)) return { x: Math.floor(x + ox) + 0.5, y: Math.floor(y + oy) + 0.5 };
        }
      }
      return null;
    },
    visible(x, y) {
      const m = G.state.map;
      if (!m) return false;
      if (!m.visible || !(G.world && G.world.updateVisibility)) return true;
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
      return m.visible[y * m.w + x] === 1;
    },
    prop(tx, ty) {
      const m = G.state.map;
      if (!m) return null;
      if (G.world && G.world.propAt) return G.world.propAt(m, tx, ty);
      for (const p of m.props) if (p.x === tx && p.y === ty) return p;
      return null;
    },
  };

  // ---- timed effects (plain data on ent.effects) ----
  // Generic fields: t (remaining s), mods {stat: add}, dps + dtype (damage over time), slow (0..1 of speed lost),
  // stun (cannot act), taken (% more damage taken, may be negative), dealt (% more damage dealt), absorb (damage pool),
  // every/acc (periodic tick → game.EFFECT_TICK[id]).
  game.EFFECT_TICK = {};

  game.getEffect = function (ent, id) {
    const fx = ent.effects;
    for (let i = 0; i < fx.length; i++) if (fx[i].id === id) return fx[i];
    return null;
  };

  game.addEffect = function (ent, eff) {
    const old = game.getEffect(ent, eff.id);
    if (old) {
      if (old.dps && eff.dps) eff.dps = Math.max(old.dps, eff.dps);
      eff.t = Math.max(old.t, eff.t);
      ent.effects[ent.effects.indexOf(old)] = eff;
    } else {
      ent.effects.push(eff);
    }
    if (eff.mods || (old && old.mods)) game.recomputeStats(ent);
    return eff;
  };

  game.removeEffect = function (ent, id) {
    const e = game.getEffect(ent, id);
    if (!e) return;
    ent.effects.splice(ent.effects.indexOf(e), 1);
    if (e.mods) game.recomputeStats(ent);
  };

  game.isStunned = function (ent) {
    const fx = ent.effects;
    for (let i = 0; i < fx.length; i++) if (fx[i].stun) return true;
    return false;
  };

  // Movement/attack rate multiplier from chill/slow (stun handled separately).
  game.speedMult = function (ent) {
    let m = 1;
    const fx = ent.effects;
    for (let i = 0; i < fx.length; i++) if (fx[i].slow) m *= 1 - fx[i].slow;
    return m < 0.25 ? 0.25 : m;
  };

  game.tickEffects = function (ent, dt) {
    const fx = ent.effects;
    if (!fx.length) return;
    let recompute = false;
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i];
      e.t -= dt;
      if (e.dps) {
        e.acc = (e.acc || 0) + dt;
        if (e.acc >= 0.5) {
          e.acc -= 0.5;
          const parts = {};
          parts[e.dtype || 'phys'] = e.dps * 0.5;
          game.applyHit(ent, parts, { dot: true, srcId: e.src });
          if (ent.dead) return;
        }
      } else if (e.every) {
        e.acc = (e.acc || 0) + dt;
        if (e.acc >= e.every) {
          e.acc -= e.every;
          const fn = game.EFFECT_TICK[e.id];
          if (fn) fn(ent, e);
          if (ent.dead) return;
        }
      }
      if (e.t <= 0 || (e.absorb !== undefined && e.absorb <= 0)) {
        const at = fx.indexOf(e);          // a tick handler may have reshuffled the list
        if (at >= 0) fx.splice(at, 1);
        if (e.mods) recompute = true;
      }
    }
    if (recompute) game.recomputeStats(ent);
  };

  // Find a living entity (player included) by id. Linear, only for occasional lookups.
  game.byId = function (id) {
    const S = G.state;
    if (!id) return null;
    if (S.player && S.player.id === id) return S.player;
    const ents = S.entities;
    for (let i = 0; i < ents.length; i++) if (ents[i].id === id) return ents[i];
    return null;
  };
})();

// ---- Revision 2.1: shallow water / lava ----
(function () {
  'use strict';
  const G = window.G, C = G.C, game = G.game, U = game.U, W = game.W;
  const WATER = C.TILE.WATER, LAVA = C.TILE.LAVA;

  // Movement multiplier for the tile the entity stands on; also applies the lava burn (twice a second).
  // `holder` keeps the tick timer (ent.ai for monsters, the controller for the player). Flyers and wraiths ignore both.
  game.terrain = function (ent, holder, dt) {
    if (ent.fly) return 1;
    const t = W.tile(ent.x, ent.y);
    if (t !== LAVA) holder.lavaT = 0;
    if (t !== WATER && t !== LAVA) return 1;
    if (t === LAVA && !ent.lavaProof) {
      holder.lavaT = (holder.lavaT || 0) + dt;
      if (holder.lavaT >= 0.5) {
        holder.lavaT -= 0.5;
        U.fx(U.rng.next() < 0.5 ? 'smoke' : 'spark', ent.x, ent.y, { color: '#ff7a2b' });
        game.applyHit(ent, { fire: Math.max(1, ent.stats.hpMax * (C.LAVA_DPS_PCT || 4) / 100 * 0.5) }, { dot: true });
      }
    }
    return C.SLOW_TILE_SPEED || 0.6;
  };

  // Does the straight line cross shallow lava? (coarse; used so lava-vulnerable monsters path around instead of wading in)
  game.lavaOnLine = function (x0, y0, x1, y1) {
    const n = Math.min(60, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 5));
    for (let i = 1; i < n; i++) {
      const k = i / n;
      if (W.tile(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k) === LAVA) return true;
    }
    return false;
  };

  const NOFX = {};
  // Active mythic effects of the player ({ effectId: true }), cached by recomputeStats.
  game.fxOf = function (p) { return (p && p.bonus && p.bonus.fx) || NOFX; };
})();
