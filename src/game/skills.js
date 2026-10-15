// Skill helper kit (G.game.K) used by the cast bodies in data_skills.js, channelled-effect ticks, and player minions.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS;

  const K = game.K = {};

  K.hit = function (t, pct, type, extra) {
    const spec = extra || {};
    spec.pct = pct; spec.type = type;
    return game.playerHit(t, spec);
  };

  // Living hostile monsters whose body touches the circle. Fresh array (casts are rare).
  K.around = function (x, y, r) {
    const out = [], foes = game.live.foes;
    for (let i = 0; i < foes.length; i++) {
      const e = foes[i];
      if (!e.dead && Math.hypot(e.x - x, e.y - y) <= r + e.radius) out.push(e);
    }
    return out;
  };

  K.arc = function (p, ang, reach, half) {
    return K.around(p.x, p.y, reach).filter(function (e) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 0.9) return true;
      let a = Math.atan2(e.y - p.y, e.x - p.x) - ang;
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return Math.abs(a) <= half;
    });
  };

  K.swing = function (p, t, reach) {
    if (t) p.facing = Math.atan2(t.y - p.y, t.x - p.x);
    U.fx('slash', p.x + Math.cos(p.facing) * 0.7, p.y + Math.sin(p.facing) * 0.7, { angle: p.facing, radius: reach || 1.2 });
    U.sfx('swing');
  };

  K.shoot = function (p, ang, o) {
    const speed = o.speed || 13;
    if (o.shape === 'arrow' && p.bonus.w.type !== 'bow') o.shape = 'shard';      // R2.3: arrow skills without a bow hurl blades instead
    return game.spawnProjectile({
      // start just inside the shooter so a target standing on top of you is still hit
      x: p.x + Math.cos(ang) * 0.1, y: p.y + Math.sin(ang) * 0.1, ang: ang, speed: speed,
      shape: o.shape, color: o.color, radius: o.radius, faction: 'player', life: o.life || 11 / speed + 0.1,
      pierce: o.pierce, explode: o.explode, homing: o.homing,
      spec: { pct: o.pct, type: o.type || 'phys', crit: o.crit || 0, st: o.st || null, skill: o.skill },
    });
  };

  K.zone = function (o) {
    o.faction = 'player';
    o.delay = o.delay || o.tele || 0;
    return game.addZone(o);
  };

  K.trap = function (p, o) {
    const zs = game.zones;
    let n = 0, oldest = -1;
    for (let i = 0; i < zs.length; i++) if (zs[i].trap) { n++; if (oldest < 0) oldest = i; }
    if (n >= 3) zs.splice(oldest, 1);
    o.x = p.x; o.y = p.y; o.t = 45; o.trap = true; o.faction = 'player';
    U.sfx('click');
    return game.addZone(o);
  };

  K.buff = function (p, eff) { return game.addEffect(p, eff); };

  K.shout = function (p, color) {
    U.fx('nova', p.x, p.y, { radius: 4.5, color: color });
    U.sfx('cast');
    U.shake(2, 0.15);
  };

  // Instant relocation to (or next to) x,y. Returns false if nowhere to stand.
  K.blink = function (p, x, y, fxType) {
    let spot = W.canStand(x, y, p.radius) ? { x: x, y: y } : W.free(x, y, 3);
    if (!spot || (game.inSealedRoom && !game.inSealedRoom(spot.x, spot.y))) return false;      // no blinking out of a lockdown
    U.fx(fxType || 'teleport', p.x, p.y, {});
    p.x = spot.x; p.y = spot.y;
    U.fx(fxType || 'teleport', p.x, p.y, {});
    if (game.onPlayerMoved) game.onPlayerMoved(true);
    return true;
  };

  // Slide along the straight line toward x,y, stopping `stop` tiles short or at the first obstacle.
  K.dashTo = function (p, x, y, stop) {
    const d = Math.hypot(x - p.x, y - p.y) - (stop || 0);
    if (d > 0.05) {
      const ang = Math.atan2(y - p.y, x - p.x), n = Math.ceil(d / 0.2);
      const sx = Math.cos(ang) * d / n, sy = Math.sin(ang) * d / n;
      p.facing = ang;
      for (let i = 0; i < n; i++) {
        if (!W.move(p, sx, sy)) break;
        if (i % 4 === 0) U.fx('smoke', p.x, p.y, {});
      }
    }
    if (game.onPlayerMoved) game.onPlayerMoved(true);
  };

  K.chain = function (p, t, jumps, pct, type) {
    const hit = [t.id];
    let cur = t;
    U.fx('spark', p.x, p.y, { color: COL[type] });
    for (let j = 0; j <= jumps && cur; j++) {
      U.fx('spark', cur.x, cur.y, { color: COL[type], radius: 0.8 });
      const cx = cur.x, cy = cur.y;
      K.hit(cur, pct, type);
      let best = null, bd = 4.8;
      const foes = game.live.foes;
      for (let i = 0; i < foes.length; i++) {
        const e = foes[i];
        if (e.dead || hit.indexOf(e.id) >= 0) continue;
        const d = Math.hypot(e.x - cx, e.y - cy);
        if (d < bd) { bd = d; best = e; }
      }
      cur = best;
      if (cur) hit.push(cur.id);
    }
  };

  // ---- channelled / periodic player effects ----
  game.EFFECT_TICK.whirlwind = function (p, e) {
    U.fx('slash', p.x, p.y, { angle: U.rand(0, 6.28), radius: 2.3 });
    U.sfx('swing');
    const list = K.around(p.x, p.y, 2.3);
    for (let i = 0; i < list.length; i++) K.hit(list[i], e.pct, 'phys', { melee: true });
  };
  function channelTarget(p, e) {
    let t = game.byId(e.tid);
    if (!t || t.dead) {
      t = game.pickTarget ? game.pickTarget(9) : null;
      if (!t) { e.t = 0; return null; }
      e.tid = t.id;
    }
    p.facing = Math.atan2(t.y - p.y, t.x - p.x);
    return t;
  }
  game.EFFECT_TICK.incinerate = function (p, e) {
    const t = channelTarget(p, e);
    if (!t) return;
    U.fx('spark', (p.x + t.x) / 2, (p.y + t.y) / 2, { color: COL.fire });
    K.hit(t, e.pct, 'fire', { st: [['burn', 100, 3, 0.08]] });
  };
  game.EFFECT_TICK.life_drain = function (p, e) {
    const t = channelTarget(p, e);
    if (!t) return;
    U.fx('spark', (p.x + t.x) / 2, (p.y + t.y) / 2, { color: COL.shadow });
    U.fx('heal', p.x, p.y, { color: COL.shadow });
    K.hit(t, e.pct, 'phys', { heal: 0.6 });
  };
  game.EFFECT_TICK.thunderstorm = function (p, e) {
    const list = K.around(p.x, p.y, 7.5).filter(function (m) { return W.los(p.x, p.y, m.x, m.y); });
    if (!list.length) return;
    const t = U.rng.pick(list);
    U.fx('spark', t.x, t.y, { color: COL.lightning, radius: 1 });
    U.sfx('bolt');
    K.hit(t, e.pct, 'lightning');
  };

  // ---- minions ----
  function clearMinions(skillId) {
    const ents = G.state.entities;
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (e.faction === 'player' && e.summonOf && (!skillId || e.summonOf === skillId)) {
        if (!e.dead) U.fx('smoke', e.x, e.y, {});
        ents.splice(i, 1);
      }
    }
  }

  K.summon = function (p, skillId, monId, max, power) {
    if (game.fxOf(p).legion) max += skillId === 'raise_skeleton' ? 2 : skillId === 'skeletal_mage' ? 1 : 0;      // mythic legion: +2 warriors, +1 mage
    if (game.fxOf(p).extra_minion && skillId === 'raise_skeleton') max += 1;          // relic: Old Tobiah Crane
    clearMinions(skillId);
    const mult = power / 100 * (1 + (p.bonus.minionPct || 0) / 100);
    for (let i = 0; i < max; i++) {
      const a = p.facing + (i - (max - 1) / 2) * 0.9;
      const spot = W.free(p.x + Math.cos(a) * 1.3, p.y + Math.sin(a) * 1.3, 3) || { x: p.x, y: p.y };
      const e = game.createMinion(monId, spot.x, spot.y, p, mult);
      e.summonOf = skillId;
      G.state.entities.push(e);
      U.fx('smoke', e.x, e.y, { color: '#8ee06a' });
    }
    p.minions[skillId] = max;
    U.sfx('cast');
  };

  game.dismissMinions = function () {
    clearMinions(null);
    const p = G.state.player;
    if (p) p.minions = {};
  };

  // Minions do not survive a map swap (scenes clears state.entities) — raise them again beside the player in dungeons.
  const SUMMON_MON = { raise_skeleton: 'minion_skeleton', skeletal_mage: 'minion_mage', golem: 'minion_golem' };
  G.on('scene:changed', function (e) {
    const p = G.state.player;
    if (!p || !p.minions || !e || e.scene !== 'dungeon' || p.dead) return;
    for (const id in p.minions) {
      const n = p.minions[id], sk = game.SKILLS[id];
      if (!(n > 0) || !sk || !(p.skills[id] > 0)) continue;
      const V = game.applySynergies(p, sk, game.skillValues(sk, game.skillRank(p, id)));
      K.summon(p, id, SUMMON_MON[id], V.n ? Math.floor(V.n) : 1, V.pow);
    }
  });
})();
