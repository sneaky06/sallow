// R7.6 / R7.10: the other six Fallen (Brannoc, Wren, Varr and Crane live in campaign.js). Names, depths and fights follow
// src/ui/story_data.js ADVENTURERS; spawning, banners and the relic grant are the shared framework in campaign.js.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS, M = game.MONSTERS, SP = game.SPECIAL, CB = game.CB;
  const ezone = CB.ezone, eshot = CB.eshot, avgDmg = CB.avgDmg, setAnim = CB.setAnim, fallen = game.defineFallen;

  // A stationary thing a Fallen owns (rope anchors…): attackable, never moves or swings.
  function owned(e, name, x, y, hpFrac, sprite) {
    const s = W.free(x, y, 2);
    if (!s) return null;
    const o = game.createMonster('boss_prop', s.x, s.y, e.level, 'normal', null, true);
    o.stats.hpMax = o.hp = Math.max(1, Math.round(e.stats.hpMax * hpFrac)); o.noLoot = true; o.xp = 0; o.bossAdd = e.id; o.ai.st = 'chase'; o.name = name;
    if (sprite) o.sprite = Object.assign({}, o.sprite, sprite);
    G.state.entities.push(o);
    return o;
  }
  function alive(ids) { let n = 0; for (const id of ids || []) { const o = game.byId(id); if (o && !o.dead) n++; } return n; }
  function rush(e, p, a, mult) {
    let hit = false;
    for (let i = 0; i < 40; i++) {
      if (!W.move(e, Math.cos(a) * 0.2, Math.sin(a) * 0.2)) break;
      if (!hit && Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.radius + 0.4) { hit = true; game.monsterHit(e, p, { mult: mult, melee: true, undodgeable: true }); }
    }
    e.ai.path = null; U.shake(3, 0.15);
  }

  // ---- Hob Garrow, the First Lamplighter (warrior, 3): lit braziers heal him (0.3%/s each) (walk through one to snuff it); a lamp-hook sweep
  // with a long glowing wind-up; with every brazier out he goes dark (+30% damage taken) and charges blind.
  fallen('fallen_1', { depth: 3, name: 'Hob Garrow, the First Lamplighter', classId: 'warrior', story: 'He went down to light the stair for the town. He is still lighting it.',
    sprite: { body: 'humanoid', color: '#5a4a3a', accent: '#ffd27a', scale: 1.25, weapon: 'axe' }, def: { hp: 40, dmg: [3, 5], armor: 12, spd: 2.6 } });
  SP.fallen_fallen_1 = function (e, def, t, d, dt, p) {
    const ai = e.ai, map = G.state.map;
    if (ai.st === 'sleep' || !map) return false;
    if (!ai.braziers) {
      ai.braziers = [];
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * Math.PI * 2 + 0.4, s = W.free(e.x + Math.cos(a) * 4, e.y + Math.sin(a) * 4, 2);
        if (!s) continue;
        const b = { type: 'torch', x: Math.floor(s.x), y: Math.floor(s.y), solid: false, light: 4, brazier: e.id, lit: true };
        map.props.push(b); ai.braziers.push(b);
      }
      if (G.world && G.world.invalidate) G.world.invalidate(map);
    }
    let lit = 0;
    for (const b of ai.braziers) {
      if (b.lit && Math.hypot(p.x - b.x - 0.5, p.y - b.y - 0.5) < 0.9) { b.lit = false; b.light = 0; U.fx('smoke', b.x + 0.5, b.y + 0.5, {}); U.text(b.x + 0.5, b.y, 'Snuffed', '#c8c8a0'); }
      if (b.lit) lit++;
    }
    if (lit && e.hp < e.stats.hpMax) e.hp = Math.min(e.stats.hpMax, e.hp + e.stats.hpMax * 0.003 * lit * dt);
    ai.relightT = (ai.relightT === undefined ? 8 : ai.relightT) - dt;
    if (ai.relightT <= 0 && lit && lit < ai.braziers.length) {
      ai.relightT = 8;
      const b = ai.braziers.find(function (q) { return !q.lit; });
      b.lit = true; b.light = 4; U.fx('spark', b.x + 0.5, b.y + 0.5, { color: '#ffd27a' }); U.text(e.x, e.y - 1.4, 'Mind the dark', '#ffd27a');
    }
    if (!lit && ai.braziers.length) {          // dark: blind charges
      if (!ai.dark) { ai.dark = true; U.text(e.x, e.y - 1.5, 'The lamplighter goes dark', '#c8c8a0', true); }
      game.addEffect(e, { id: 'dark', t: 0.3, taken: 30 });
      if (ai.blind) { if ((ai.blind.t -= dt) > 0) { setAnim(e, 'cast'); return true; } rush(e, p, ai.blind.a, 1.6); ai.blind = null; ai.blindT = 3; return true; }
      ai.blindT = (ai.blindT === undefined ? 1 : ai.blindT) - dt;
      if (ai.blindT <= 0 && d < 9) {
        const a = Math.atan2(p.y - e.y, p.x - e.x) + U.rand(-0.25, 0.25);
        for (let k = 1; k <= 3; k++) U.fx('ring', e.x + Math.cos(a) * k * 2, e.y + Math.sin(a) * k * 2, { radius: 0.8, color: '#ff5b5b', duration: 0.6 });
        ai.blind = { t: 0.6, a: a };
        return true;
      }
    }
    ai.hookT = (ai.hookT === undefined ? 3 : ai.hookT) - dt;
    if (ai.hookT <= 0 && d < 3) { ai.hookT = 5; ezone(e, e.x, e.y, 2.4, 1.2, 1.7, 'fire', { color: '#ffd27a' }); U.text(e.x, e.y - 1.4, 'The hook glows', '#ffd27a'); }
    return false;
  };

  // ---- Sefa Lind, the Ropewalker (ranger, 6): swings between ceiling ropes and cannot be hit while any of her three rope
  // anchors stands; cutting one drops her (1.5 s stun). Fan volleys with wide gaps; knotted snares that root.
  fallen('fallen_3', { depth: 6, name: 'Sefa Lind, the Ropewalker', classId: 'ranger', story: 'She went down on a rope and counted the knots wrong.',
    sprite: { body: 'humanoid', color: '#6a5a3a', accent: '#d9c9a3', scale: 1.15, weapon: 'bow' },
    def: { arch: 'ranged', atk: 'shot', range: 7, hp: 30, dmg: [3, 5], spd: 3.2, cd: 1.6, wind: 0.4, proj: { shape: 'arrow', color: '#d9c9a3', speed: 11 } } });
  SP.fallen_fallen_3 = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep') return false;
    if (!ai.anchors) {
      ai.anchors = [];
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * Math.PI * 2, o = owned(e, 'Rope Anchor', e.x + Math.cos(a) * 4.5, e.y + Math.sin(a) * 4.5, 0.04, { body: 'brute', color: '#7a5a3a', accent: '#d9c9a3', scale: 0.8 });
        if (o) ai.anchors.push(o.id);
      }
    }
    const up = alive(ai.anchors);
    if (up < (ai.lastUp === undefined ? up : ai.lastUp)) { game.removeEffect(e, 'invuln'); e.fly = false; game.applyStatus(e, 'stun', 2.5); U.text(e.x, e.y - 1.5, 'The rope gives', '#ffd0a0', true); U.shake(3, 0.2); }
    ai.lastUp = up;
    ai.fanT = (ai.fanT === undefined ? 1.5 : ai.fanT) - dt;
    if (ai.fanT <= 0 && d < 9) { ai.fanT = 2.6; const a = Math.atan2(p.y - e.y, p.x - e.x); for (let k = -2; k <= 2; k++) eshot(e, a + k * 0.42, 0.8, { shape: 'arrow', color: '#d9c9a3', speed: 10 }); U.sfx('arrow'); }
    ai.snareT = (ai.snareT === undefined ? 4 : ai.snareT) - dt;
    if (ai.snareT <= 0) {
      ai.snareT = 6;
      for (let k = 0; k < 2; k++) { const s = W.free(p.x + U.rand(-2.5, 2.5), p.y + U.rand(-2.5, 2.5), 2); if (s) game.zones.push({ x: s.x, y: s.y, r: 0.7, delay: 0, t: 15, trap: true, faction: 'enemy', dmg: avgDmg(e) * 0.4, dtype: 'phys', lvl: e.level, srcId: e.id, st: ['slow', 100, 1.5, 0.9], fx: 'spark', color: '#d9c9a3', acc: 0, pulse: 0 }); }
    }
    if (up) {          // swinging between the ropes
      game.addEffect(e, { id: 'invuln', t: 0.3 }); e.fly = true;
      ai.swingT = (ai.swingT === undefined ? 3 : ai.swingT) - dt;
      if (ai.swingT <= 0) {
        ai.swingT = 3;
        const pick = game.byId(ai.anchors.filter(function (id) { const o = game.byId(id); return o && !o.dead; })[U.rng.int(0, up - 1)]);
        if (pick) { const s = W.free(pick.x + U.rand(-1, 1), pick.y + U.rand(-1, 1), 2); if (s) { U.fx('smoke', e.x, e.y, {}); e.x = s.x; e.y = s.y; ai.path = null; } }
      }
      setAnim(e, 'idle'); e.facing = Math.atan2(p.y - e.y, p.x - e.x);
      return true;
    }
    return false;
  };

  // ---- Odile Marr, the Salt Witch (sorcerer, 13): salt circles crystallise anyone who stands still in them (stun); brine
  // waves push you toward the walls; every 15 s she forgets herself and takes double damage for 3 s.
  fallen('fallen_5', { depth: 13, name: 'Odile Marr, the Salt Witch', classId: 'sorcerer', story: 'She paid her passage with her name.',
    sprite: { body: 'caster', color: '#d8d8d0', accent: '#7fd4ff', scale: 1.25, weapon: 'staff' },
    def: { arch: 'caster', atk: 'shot', range: 7, hp: 36, dmg: [5, 7], spd: 2.4, cd: 2.0, wind: 0.5, dtype: 'cold', proj: { shape: 'shard', color: '#e8f4ff', speed: 9 } } });
  SP.fallen_fallen_5 = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep') return false;
    if (!ai.salt) ai.salt = [];
    ai.saltT = (ai.saltT === undefined ? 1 : ai.saltT) - dt;
    if (ai.saltT <= 0) {
      ai.saltT = 5;
      for (let k = 0; k < 2; k++) { const s = W.free(p.x + U.rand(-2, 2), p.y + U.rand(-2, 2), 2); if (s) ai.salt.push({ x: s.x, y: s.y, t: 7, cd: 0 }); }
    }
    for (let i = ai.salt.length - 1; i >= 0; i--) {
      const c = ai.salt[i];
      c.t -= dt; c.cd -= dt;
      if (c.t <= 0) { ai.salt.splice(i, 1); continue; }
      if ((c.fx = (c.fx || 0) - dt) <= 0) { c.fx = 0.6; U.fx('ring', c.x, c.y, { radius: 1.6, color: '#e8f4ff', duration: 0.55 }); }
      if (c.cd <= 0 && Math.hypot(p.x - c.x, p.y - c.y) < 1.6 && game.stillT > 0.9 && !game.getEffect(p, 'invuln')) {
        c.cd = 2;
        game.applyHit(p, { cold: avgDmg(e) * 1.1 }, { src: e, lvl: e.level }); game.applyStatus(p, 'stun', 1.2);
        U.text(p.x, p.y - 1.3, 'Crystallised', '#e8f4ff', true);
      }
    }
    if (ai.wave) {
      if ((ai.wave.t -= dt) > 0) return false;
      ai.wave = null;
      U.fx('nova', e.x, e.y, { radius: 4, color: '#7fd4ff' }); U.sfx('ice');
      if (d < 4 + p.radius && !game.getEffect(p, 'invuln')) {
        game.applyHit(p, { cold: avgDmg(e) * 0.9 }, { src: e, lvl: e.level });
        const k = 0.2 / (d || 1);
        for (let s = 0; s < 15; s++) if (!W.move(p, (p.x - e.x) * k, (p.y - e.y) * k)) break;
        if (game.onPlayerMoved) game.onPlayerMoved(true);
      }
    }
    ai.waveT = (ai.waveT === undefined ? 4 : ai.waveT) - dt;
    if (ai.waveT <= 0 && d < 6) { ai.waveT = 7; ai.wave = { t: 0.8 }; U.fx('ring', e.x, e.y, { radius: 4, color: '#7fd4ff', duration: 0.8 }); U.text(e.x, e.y - 1.4, 'Brine', '#7fd4ff'); }
    ai.faceT = (ai.faceT === undefined ? 15 : ai.faceT) - dt;
    if (ai.faceT <= 0) { ai.faceT = 15; game.addEffect(e, { id: 'true_face', t: 3, taken: 100 }); U.text(e.x, e.y - 1.6, 'She forgets herself', '#ffd0a0', true); U.fx('ring', e.x, e.y, { radius: 1.2, color: '#ffffff', duration: 3 }); }
    return false;
  };

  // ---- Brother Ashby, the Penitent Sexton (necromancer, 19): every toll raises three ghosts that drift toward him and heal him
  // 6% if they reach him; standing in his bell ring (3.5 tiles) at the toll stuns you. The tolls come faster as he weakens.
  fallen('fallen_6', { depth: 19, name: 'Brother Ashby, the Penitent Sexton', classId: 'necromancer', story: 'He rang the bell for the dead until the dead rang back.',
    sprite: { body: 'caster', color: '#4a4030', accent: '#c9a84a', scale: 1.3, weapon: 'mace' },
    def: { arch: 'caster', atk: 'shot', range: 6.5, hp: 40, dmg: [5, 7], spd: 2.2, cd: 2.2, wind: 0.5, dtype: 'cold', proj: { shape: 'orb', color: '#c8d8ff', speed: 8 } } });
  M.ashby_ghost = { id: 'ashby_ghost', n: 'Tolled Ghost', arch: 'swarm', theme: 'event', hp: 8, dmg: [0, 0], spd: 1.4, cd: 99, wind: 1, aggro: 0, xp: 2, armor: 0, r: 0.28, atk: 'melee',
    special: 'ashby_ghost', sprite: { body: 'wraith', color: '#c8d8ff', accent: '#ffffff', scale: 0.8, weapon: 'none' }, desc: 'It drifts home.' };
  SP.ashby_ghost = function (g, def, t, d, dt) {
    const o = game.byId(g.bossAdd);
    if (!o || o.dead) { g.hp = 0; game.kill(g, null); return true; }
    const dd = Math.hypot(o.x - g.x, o.y - g.y);
    if (dd < o.radius + 0.4) { game.heal(o, o.stats.hpMax * 0.06); U.fx('heal', o.x, o.y, { color: '#c8d8ff' }); U.text(o.x, o.y - 1.5, 'A ghost comes home', '#c8d8ff'); g.noLoot = true; g.hp = 0; game.kill(g, null); return true; }
    g.fly = true;
    W.move(g, (o.x - g.x) / dd * g.speed * dt, (o.y - g.y) / dd * g.speed * dt);
    g.facing = Math.atan2(o.y - g.y, o.x - g.x); setAnim(g, 'walk');
    return true;
  };
  SP.fallen_fallen_6 = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep') return false;
    if ((ai.ringFx = (ai.ringFx || 0) - dt) <= 0) { ai.ringFx = 1; U.fx('ring', e.x, e.y, { radius: 3.5, color: '#c9a84a', duration: 0.9 }); }
    ai.tollT = (ai.tollT === undefined ? 3 : ai.tollT) - dt;
    if (ai.tollT <= 0) {
      ai.tollT = 3 + 5 * (e.hp / e.stats.hpMax);
      U.fx('nova', e.x, e.y, { radius: 3.5, color: '#c9a84a' }); U.sfx('shrine'); U.text(e.x, e.y - 1.6, 'TOLL', '#c9a84a', true);
      if (d < 3.5 + p.radius * 0.5 && !game.getEffect(p, 'invuln')) { game.applyHit(p, { phys: avgDmg(e) * 0.8 }, { src: e, lvl: e.level }); game.applyStatus(p, 'stun', 1); }
      for (let k = 0; k < 3; k++) {
        const a = U.rand(0, 6.28), s = W.free(e.x + Math.cos(a) * U.rand(6, 8), e.y + Math.sin(a) * U.rand(6, 8), 2);
        if (!s) continue;
        const g = game.createMonster('ashby_ghost', s.x, s.y, e.level, 'normal', null, true);
        g.stats.hpMax = g.hp = Math.round(e.stats.hpMax * 0.03); g.bossAdd = e.id; g.noLoot = true; g.xp = 0; g.ai.st = 'chase';
        G.state.entities.push(g);
      }
    }
    return false;
  };

  // ---- Corwin Dask, the Debt Collector (warrior, 21): his hits knock gold out of you (4%, at least 10) a few tiles away — he
  // walks over to collect it (and heals); coin barrages in straight lines; Foreclosure marks a circle that locks shut for 10 s.
  fallen('fallen_7', { depth: 21, name: 'Corwin Dask, the Debt Collector', classId: 'warrior', story: 'He came to collect from the rift. The rift pays in kind.',
    sprite: { body: 'humanoid', color: '#8a7a3a', accent: '#ffd94a', scale: 1.3, weapon: 'mace' }, def: { hp: 55, dmg: [6, 9], armor: 25, spd: 2.7 } });
  G.on('player:damaged', function (ev) {
    const src = ev && ev.source, p = G.state.player;
    if (!src || src.monsterId !== 'adv_fallen_7' || !p || !(p.gold > 0) || !(G.items && G.items.dropItemAt)) return;
    const amt = Math.min(p.gold, Math.max(10, Math.round(p.gold * 0.04)));
    p.gold -= amt; G.emit('gold:changed', { gold: p.gold, delta: -amt });
    const a = U.rand(0, 6.28), s = W.free(p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3, 2) || { x: p.x, y: p.y };
    G.items.dropItemAt(s.x, s.y, { type: 'gold', qty: amt, name: 'Gold', rarity: 'common', icon: { shape: 'gold', color: '#ffd94a' } });
    U.text(p.x, p.y - 1.3, '-' + amt + ' gold', '#ffd94a');
  });
  SP.fallen_fallen_7 = function (e, def, t, d, dt, p) {
    const ai = e.ai, S = G.state;
    if (ai.st === 'sleep') return false;
    // collect loose gold nearby
    let gold = null, gd = 6;
    for (const g of S.groundItems) if (g.item && g.item.type === 'gold') { const dd = Math.hypot(g.x - e.x, g.y - e.y); if (dd < gd) { gd = dd; gold = g; } }
    if (gold && d > 1.6) {
      if (gd < 0.8) { S.groundItems.splice(S.groundItems.indexOf(gold), 1); game.heal(e, e.stats.hpMax * 0.03); U.text(e.x, e.y - 1.4, 'Collected', '#ffd94a'); U.sfx('gold'); }
      else { const a = Math.atan2(gold.y - e.y, gold.x - e.x); W.move(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt); e.facing = a; setAnim(e, 'walk'); }
      return true;
    }
    ai.coinT = (ai.coinT === undefined ? 3 : ai.coinT) - dt;
    if (ai.coinT <= 0 && d < 10) {
      ai.coinT = 5;
      const a = Math.atan2(p.y - e.y, p.x - e.x), nx = -Math.sin(a), ny = Math.cos(a);
      for (let k = -1; k <= 1; k++) game.spawnProjectile({ x: e.x + nx * k * 0.9, y: e.y + ny * k * 0.9, ang: a, speed: 12, shape: 'orb', color: '#ffd94a', radius: 0.22,
        faction: 'enemy', dmg: avgDmg(e) * 0.8, dtype: 'phys', srcId: e.id, lvl: e.level, life: 1 });
      U.sfx('gold');
    }
    if (ai.fore) {
      if ((ai.fore.t -= dt) <= 0) {
        const f = ai.fore;
        ai.fore = null;
        if (Math.hypot(p.x - f.x, p.y - f.y) < 2.5 && !game.getEffect(p, 'invuln')) { game.applyHit(p, { phys: avgDmg(e) * 1.4 }, { src: e, lvl: e.level }); game.addEffect(p, { id: 'foreclosed', t: 2, slow: 0.9 }); U.text(p.x, p.y - 1.3, 'Foreclosed', '#ffd94a', true); }
        ezone(e, f.x, f.y, 2.5, 0.01, 0.5, 'phys', { t: 10, every: 1, color: '#ffd94a' });
      }
    }
    ai.foreT = (ai.foreT === undefined ? 6 : ai.foreT) - dt;
    if (ai.foreT <= 0 && !ai.fore) { ai.foreT = 12; ai.fore = { t: 1.5, x: p.x, y: p.y }; U.fx('ring', p.x, p.y, { radius: 2.5, color: '#ffd94a', duration: 1.5 }); U.text(e.x, e.y - 1.5, 'Foreclosure', '#ffd94a', true); }
    return false;
  };

  // ---- Ivo Marrow, the Last Candidate (ranger, 35 → 36: never a boss floor): root-arrows grow thorn walls that cut the room
  // into lanes; he retreats through the roots when you close in; Refusal — every 15 s he lowers his bow for 5 s: leave him be
  // and he fights cleanly; hit him and he enrages for good.
  fallen('fallen_10', { depth: 35, name: 'Ivo Marrow, the Last Candidate', classId: 'ranger', story: 'He was offered the Ember and said no.',
    sprite: { body: 'humanoid', color: '#3a4a2a', accent: '#a04040', scale: 1.25, weapon: 'bow' },
    def: { arch: 'ranged', atk: 'shot', range: 8, hp: 40, dmg: [6, 8], spd: 3.2, cd: 1.3, wind: 0.35, proj: { shape: 'arrow', color: '#a04040', speed: 13 } } });
  SP.fallen_fallen_10 = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep') return false;
    if (ai.refuse) {
      ai.refuse.t -= dt; setAnim(e, 'idle');
      if (e.hp < ai.refuse.hp0 && !ai.enraged) {
        ai.enraged = true; ai.refuse = null;
        e.speed *= 1.3; e.atkCd *= 0.7; e.dmgMin *= 1.4; e.dmgMax *= 1.4;
        U.text(e.x, e.y - 1.6, 'You chose.', '#ff3b4e', true); U.fx('nova', e.x, e.y, { radius: 3, color: '#ff3b4e' }); U.shake(4, 0.3);
        return false;
      }
      if (ai.refuse.t > 0) return true;
      ai.refuse = null; U.text(e.x, e.y - 1.6, 'He raises his bow again', '#c8c8a0');
      return false;
    }
    ai.refuseT = (ai.refuseT === undefined ? 10 : ai.refuseT) - dt;
    if (ai.refuseT <= 0 && !ai.enraged) { ai.refuseT = 15; ai.refuse = { t: 5, hp0: e.hp }; U.text(e.x, e.y - 1.6, 'Ivo lowers his bow', '#ffd0a0', true); return true; }
    ai.thornT = (ai.thornT === undefined ? 2 : ai.thornT) - dt;
    if (ai.thornT <= 0 && d < 10) {
      ai.thornT = 7;
      const a = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2, cx = (p.x + e.x) / 2, cy = (p.y + e.y) / 2;
      for (let k = -3; k <= 3; k++) { const x = cx + Math.cos(a) * k, y = cy + Math.sin(a) * k; if (W.walkable(x, y)) ezone(e, x, y, 0.55, 0.8, 0.35, 'phys', { t: 10, every: 0.5, color: '#a04040' }); }
      U.sfx('arrow');
    }
    ai.retreatT = (ai.retreatT === undefined ? 0 : ai.retreatT) - dt;
    if (d < 3 && ai.retreatT <= 0) {
      ai.retreatT = 5;
      const a = Math.atan2(e.y - p.y, e.x - p.x), s = W.free(e.x + Math.cos(a) * 7, e.y + Math.sin(a) * 7, 3);
      if (s) { U.fx('smoke', e.x, e.y, { color: '#3a4a2a' }); e.x = s.x; e.y = s.y; ai.path = null; U.fx('smoke', e.x, e.y, { color: '#3a4a2a' }); U.text(e.x, e.y - 1.4, 'Into the roots', '#a04040'); }
      return true;
    }
    return false;
  };

  // braziers and other leftovers go with their owner
  G.on('monster:killed', function (ev) {
    const m = ev && ev.monster, map = G.state.map;
    if (!m || !m.fallen || !map) return;
    const before = map.props.length;
    map.props = map.props.filter(function (pr) { return pr.brazier !== m.id; });
    if (map.props.length !== before && G.world && G.world.invalidate) G.world.invalidate(map);
  });
})();
