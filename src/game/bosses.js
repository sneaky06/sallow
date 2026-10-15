// Revision 7 act bosses of acts I and II, rebuilt to the story's designs (src/ui/story_data.js BOSSES). The base stats and
// looks stay in data_monsters.js; this file replaces their phases and adds each fight's own mechanic through G.game.SPECIAL.
// Deeper repeats (depth 35+) reuse these fights with a tier.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS, M = game.MONSTERS, SP = game.SPECIAL, CB = game.CB;
  const ezone = CB.ezone, eshot = CB.eshot, avgDmg = CB.avgDmg, setAnim = CB.setAnim;

  function adds(e) { let n = 0; for (const o of G.state.entities) if (o.bossAdd === e.id && !o.dead) n++; return n; }
  function spawnAdd(e, id, x, y, lvlDrop) {
    const s = W.free(x, y, 3);
    if (!s) return null;
    const a = game.createMonster(id, s.x, s.y, Math.max(1, e.level - (lvlDrop || 2)), 'normal');
    a.bossAdd = e.id; a.noLoot = true; a.xp = Math.round(a.xp * 0.3); a.ai.st = 'chase'; a.ai.atk = 1;
    G.state.entities.push(a);
    U.fx('smoke', s.x, s.y, { color: COL.shadow });
    return a;
  }
  // Stationary things the boss owns (egg sacs, graves…): monsters that never move or swing.
  M.boss_prop = { id: 'boss_prop', n: 'Egg Sac', arch: 'brute', theme: 'event', hp: 20, dmg: [0, 0], spd: 0, cd: 99, wind: 1, aggro: 0, xp: 2, armor: 0, r: 0.4, atk: 'melee',
    special: 'inert', sprite: { body: 'blob', color: '#e8d8a0', accent: '#ffb347', scale: 0.9, weapon: 'none' }, desc: 'Warm.' };
  SP.inert = function () { return true; };

  // ============================== Morgrath the Gravelord (5) ==============================
  // Sermon: slow axe sweeps; every name he reads lights a grave that raises a skeleton after 4 s unless you stand on it.
  // The Count (50%): a ring of names circles the arena; every second inside it adds a Named stack (+5% damage taken, 8 s).
  // Last Rites (20%): no more graves; three long telegraphed lunges in a row.
  M.boss_gravelord.phases = [
    { at: 1, moves: [
      { id: 'Axe Sweep', kind: 'slam', cd: 5.5, r: 2.6, tele: 1.0, mult: 1.6, color: '#b98cff' },
      { id: 'Bone Volley', kind: 'fan', cd: 7, n: 5, spread: 0.22, tele: 0.55, mult: 0.9, proj: { shape: 'shard', color: '#e8e0c8', speed: 8.5 } }] },
    { at: 0.5, say: 'The ledger opens. Your name is in it.', moves: [
      { id: 'Axe Sweep', kind: 'slam', cd: 6, r: 2.6, tele: 1.0, mult: 1.6, color: '#b98cff' }] },
    { at: 0.2, say: 'The crown cracks. Last rites.', enrage: true, moves: [
      { id: 'Bone Storm', kind: 'ring', cd: 7, n: 12, tele: 0.7, mult: 0.9, proj: { shape: 'shard', color: '#e8e0c8', speed: 7.5 } }] },
  ];
  M.boss_gravelord.special = 'gravelord';
  SP.gravelord = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep' || p.dead) return false;
    if (!ai.graves) ai.graves = [];
    // graves (phases I–II)
    for (let i = ai.graves.length - 1; i >= 0; i--) {
      const g = ai.graves[i];
      g.t -= dt;
      if (Math.hypot(p.x - g.x, p.y - g.y) < 1.0) { ai.graves.splice(i, 1); U.fx('smoke', g.x, g.y, {}); U.text(g.x, g.y - 0.8, 'Laid to rest', '#e8e8ff'); continue; }
      if ((g.pulse = (g.pulse || 0) - dt) <= 0) { g.pulse = 0.5; U.fx('ring', g.x, g.y, { radius: 0.8, color: '#b98cff', duration: 0.45 }); }
      if (g.t <= 0) { ai.graves.splice(i, 1); if (adds(e) < 6) spawnAdd(e, 'skeleton', g.x, g.y); }
    }
    if (ai.phase < 2) {
      ai.graveT = (ai.graveT === undefined ? 3 : ai.graveT) - dt;
      if (ai.graveT <= 0) {
        ai.graveT = ai.phase ? 5 : 6;
        for (let k = 0; k < (ai.phase ? 2 : 1); k++) {
          const a = U.rand(0, 6.28), s = W.free(e.x + Math.cos(a) * U.rand(3, 6), e.y + Math.sin(a) * U.rand(3, 6), 2);
          if (s) { ai.graves.push({ x: s.x, y: s.y, t: 4 }); U.fx('ring', s.x, s.y, { radius: 1, color: '#b98cff', duration: 4 }); }
        }
        U.text(e.x, e.y - 2, 'He reads a name', '#d8c8ff', true);
      }
    }
    // the ring of names (phase II)
    if (ai.phase === 1) {
      ai.ringA = (ai.ringA || 0) + dt * 0.7;
      const rx = e.x + Math.cos(ai.ringA) * 4.5, ry = e.y + Math.sin(ai.ringA) * 4.5;
      if ((ai.ringFx = (ai.ringFx || 0) - dt) <= 0) { ai.ringFx = 0.35; U.fx('ring', rx, ry, { radius: 2, color: '#d8c8ff', duration: 0.4 }); }
      if (Math.hypot(p.x - rx, p.y - ry) < 2 + p.radius) {
        ai.namedT = (ai.namedT || 0) + dt;
        if (ai.namedT >= 1) {
          ai.namedT -= 1;
          const old = game.getEffect(p, 'named'), n = Math.min(10, (old ? old.stacks : 0) + 1);
          game.addEffect(p, { id: 'named', t: 8, stacks: n, taken: 5 * n });
          U.text(p.x, p.y - 1.2, 'Named ×' + n, '#d8c8ff');
        }
      }
    }
    // three lunges (phase III)
    if (ai.phase >= 2) {
      if (ai.lunge) {
        const L = ai.lunge;
        L.t -= dt; setAnim(e, 'cast');
        if (L.t > 0) return true;
        for (let i = 0; i < 40; i++) {
          if (!W.move(e, Math.cos(L.a) * 0.2, Math.sin(L.a) * 0.2)) break;
          if (!L.hit && Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.radius + 0.4) { L.hit = true; game.monsterHit(e, p, { mult: 1.8, melee: true, undodgeable: true }); }
        }
        U.shake(3, 0.15); ai.path = null;
        ai.lunge = L.n > 1 ? lungeAt(e, p, L.n - 1) : null;
        if (!ai.lunge) ai.lungeT = 6;
        return true;
      }
      ai.lungeT = (ai.lungeT === undefined ? 1 : ai.lungeT) - dt;
      if (ai.lungeT <= 0 && d < 10) { ai.lunge = lungeAt(e, p, 3); return true; }
    }
    return false;
  };
  function lungeAt(e, p, n) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    for (let k = 1; k <= 4; k++) U.fx('ring', e.x + Math.cos(a) * k * 2, e.y + Math.sin(a) * k * 2, { radius: 0.8, color: '#ff5b5b', duration: 0.7 });
    return { t: 0.7, a: a, n: n };
  }

  // ============================== Skarn the Broodmother, "Mother" (10) ==============================
  // Nest: she hangs from the roof and cannot be hit; glowing egg sacs hatch every 10 s — each sac popped costs her 10% of her
  // life. Web spit slows. (After 45 s she drops anyway.)
  // Hungry (60%): she drops and charges the warmest target — your minions first, then you — leaving poison pools.
  // Mother (25%): she eats her own brood to heal 5% each. Kill the brood before she reaches it.
  M.boss_broodmother.phases = [
    { at: 1, moves: [
      { id: 'Web Spit', kind: 'fan', cd: 4.5, n: 3, spread: 0.25, tele: 0.5, mult: 0.8, dtype: 'poison', st: ['slow', 100, 2.5, 0.5], proj: { shape: 'spit', color: '#d9d4c0', speed: 9 } }] },
    { at: 0.6, say: 'Mother drops from the roof. She is hungry.', moves: [
      { id: 'Venom Spit', kind: 'fan', cd: 5.5, n: 3, spread: 0.25, tele: 0.5, mult: 1.0, dtype: 'poison', st: ['poison', 100, 4, 0.3], proj: { shape: 'spit', color: '#7be04a', speed: 9 } }] },
    { at: 0.25, say: 'Mother is starving. Her brood comes to her.', enrage: true, moves: [
      { id: 'Hatch', kind: 'summon', cd: 9, first: 0.5, mon: 'cave_spider', n: 3, max: 7 }] },
  ];
  M.boss_broodmother.special = 'mother';
  SP.mother = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep' || p.dead) return false;
    ai.fightT = (ai.fightT || 0) + dt;
    if (ai.phase === 0) {
      game.addEffect(e, { id: 'invuln', t: 0.3 });
      e.fly = true;
      if (!ai.sacs) ai.sacs = [];
      ai.sacT = (ai.sacT === undefined ? 1 : ai.sacT) - dt;
      if (ai.sacT <= 0 && ai.sacs.length < 4) {
        ai.sacT = 10;
        const a = U.rand(0, 6.28), s = W.free(e.x + Math.cos(a) * U.rand(2.5, 5), e.y + Math.sin(a) * U.rand(2.5, 5), 2);
        if (s) {
          const sac = game.createMonster('boss_prop', s.x, s.y, e.level, 'normal', null, true);
          sac.stats.hpMax = sac.hp = Math.round(e.stats.hpMax * 0.02); sac.noLoot = true; sac.bossAdd = e.id; sac.sacOf = e.id; sac.hatchT = 10; sac.ai.st = 'chase';
          G.state.entities.push(sac); ai.sacs.push(sac.id);
          U.fx('ring', s.x, s.y, { radius: 1, color: '#ffb347', duration: 0.6 });
        }
      }
      for (let i = ai.sacs.length - 1; i >= 0; i--) {
        const sac = game.byId(ai.sacs[i]);
        if (!sac || sac.dead) {
          ai.sacs.splice(i, 1);
          if (sac && sac.dead && !sac.hatched) { e.hp = Math.max(e.stats.hpMax * 0.59, e.hp - e.stats.hpMax * 0.1); U.text(e.x, e.y - 2, 'Mother shrieks', '#ffb347', true); }
          continue;
        }
        if ((sac.hatchT -= dt) <= 0) {
          sac.hatched = true; sac.hp = 0; game.kill(sac, null);
          for (let k = 0; k < 3; k++) spawnAdd(e, 'cave_spider', sac.x + U.rand(-0.6, 0.6), sac.y + U.rand(-0.6, 0.6));
        }
      }
      if (ai.fightT > 45) e.hp = Math.min(e.hp, e.stats.hpMax * 0.59);          // she drops anyway
      return false;
    }
    e.fly = false;
    if (ai.phase === 1) {           // the charge at the warmest target, poison pools in her wake
      ai.chargeT = (ai.chargeT === undefined ? 1.5 : ai.chargeT) - dt;
      if (ai.chargeT <= 0) {
        ai.chargeT = 7;
        let tgt = p, bd = 1e9;
        for (const m of game.live.allies) { if (m.dead) continue; const dd = Math.hypot(m.x - e.x, m.y - e.y); if (dd < bd) { bd = dd; tgt = m; } }
        const a = Math.atan2(tgt.y - e.y, tgt.x - e.x), len = Math.min(9, Math.hypot(tgt.x - e.x, tgt.y - e.y) + 1);
        for (let i = 0; i < len / 0.2; i++) {
          if (!W.move(e, Math.cos(a) * 0.2, Math.sin(a) * 0.2)) break;
          if (i % 8 === 4) ezone(e, e.x, e.y, 1.1, 0.3, 0.2, 'poison', { t: 4, every: 0.5, color: '#7be04a' });
          for (const o of [p].concat(game.live.allies)) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < e.radius + o.radius + 0.4 && !(o.hitBy === ai.chargeN)) { o.hitBy = ai.chargeN; game.monsterHit(e, o, { mult: 1.7, melee: true, undodgeable: true }); }
        }
        ai.chargeN = (ai.chargeN || 0) + 1;
        U.text(e.x, e.y - 2, tgt === p ? 'She smells your heat' : 'She goes for the warm ones', '#ffb347'); U.shake(4, 0.2);
        ai.path = null;
        return true;
      }
    }
    if (ai.phase >= 2) {            // she eats her brood
      let food = null, bd = 6;
      for (const o of G.state.entities) if (o.bossAdd === e.id && !o.dead && !o.sacOf) { const dd = Math.hypot(o.x - e.x, o.y - e.y); if (dd < bd) { bd = dd; food = o; } }
      if (food) {
        if (bd < e.radius + food.radius + 0.4) {
          food.hp = 0; game.kill(food, null);
          game.heal(e, e.stats.hpMax * 0.05); U.fx('blood', food.x, food.y, {}); U.text(e.x, e.y - 2, 'Mother feeds', '#ff6a5a', true);
        } else { const a = Math.atan2(food.y - e.y, food.x - e.x); W.move(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt); e.facing = a; setAnim(e, 'walk'); }
        return true;
      }
    }
    return false;
  };

  // ============================== Azgalor, the Ember Tyrant (15) ==============================
  // Hoard: he heals (2%/s) while standing on the clean-fire vein where he waits; hit him from range and he chases you off it.
  // Molten (50%): fire lines rake the floor in a grid, rows then columns; stand in the gaps.
  // The Promise (20%): he roars the names of those who forgot him; a meteor falls on your position every second.
  M.boss_tyrant.phases = [
    { at: 1, moves: [
      { id: 'Fire Nova', kind: 'slam', cd: 6.5, r: 3.3, tele: 0.9, mult: 1.6, dtype: 'fire', color: '#ff7a2b', st: ['burn', 100, 3, 0.15] },
      { id: 'Flame Lash', kind: 'fan', cd: 6, n: 3, spread: 0.3, tele: 0.5, mult: 1.0, dtype: 'fire', explode: 1.6, proj: { shape: 'fireball', color: '#ff7a2b', speed: 8.5 } }] },
    { at: 0.5, say: 'The slag cracks. The floor runs with fire.', moves: [
      { id: 'Infernal Leap', kind: 'blink', cd: 8, first: 3, r: 3.0, tele: 0.8, mult: 1.5, dtype: 'fire', color: '#ff5b2e' }] },
    { at: 0.2, say: 'They will remember me now!', enrage: true, moves: [
      { id: 'Ring of Cinders', kind: 'ring', cd: 7, n: 12, tele: 0.8, mult: 0.9, dtype: 'fire', proj: { shape: 'fireball', color: '#ffb347', speed: 6.5 } }] },
  ];
  M.boss_tyrant.special = 'tyrant';
  const FORGOT = ['Hedda', 'Old Bram', 'the Ell boy', 'Marta', 'the cooper', 'Sister Ada', 'Garrick', 'every one of you'];
  SP.tyrant = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep' || p.dead) return false;
    if (ai.vx === undefined) { ai.vx = ai.hx; ai.vy = ai.hy; }
    if (ai.phase === 0) {
      if ((ai.veinFx = (ai.veinFx || 0) - dt) <= 0) { ai.veinFx = 0.6; U.fx('ring', ai.vx, ai.vy, { radius: 1.5, color: '#ffffff', duration: 0.55 }); }
      if (Math.hypot(e.x - ai.vx, e.y - ai.vy) < 1.5 && e.hp < e.stats.hpMax) {
        e.hp = Math.min(e.stats.hpMax, e.hp + e.stats.hpMax * 0.02 * dt);
        if ((ai.healTxt = (ai.healTxt || 0) - dt) <= 0) { ai.healTxt = 2; U.text(e.x, e.y - 2, 'The vein feeds him', '#ffffff'); }
      }
    }
    if (ai.phase === 1) {
      ai.gridT = (ai.gridT === undefined ? 1 : ai.gridT) - dt;
      if (ai.gridT <= 0) {
        ai.gridT = 4.5;
        ai.rows = !ai.rows;
        const off = U.rand(0, 3);
        for (let k = -3; k <= 3; k++) for (let s = -7; s <= 7; s += 1.4) {
          const x = ai.rows ? p.x + s : p.x + k * 3 + off - 1.5, y = ai.rows ? p.y + k * 3 + off - 1.5 : p.y + s;
          if (W.walkable(x, y)) ezone(e, x, y, 0.75, 1.1, 1.2, 'fire', { color: '#ff5b2e' });
        }
        U.sfx('fire');
      }
    }
    if (ai.phase >= 2) {
      ai.metT = (ai.metT === undefined ? 0.5 : ai.metT) - dt;
      if (ai.metT <= 0) { ai.metT = 1; ezone(e, p.x, p.y, 1.4, 0.9, 1.3, 'fire', { color: '#ff5b2e', shake: 2 }); }
      ai.roarT = (ai.roarT === undefined ? 0 : ai.roarT) - dt;
      if (ai.roarT <= 0) { ai.roarT = 3; U.text(e.x, e.y - 2.2, FORGOT[(ai.roarN = (ai.roarN || 0) + 1) % FORGOT.length].toUpperCase() + ' FORGOT ME', '#ffb347', true); }
    }
    return false;
  };

  // ============================== Xal'thuun, the Hollow Star (20) ==============================
  // Gaze: a slow cone beam sweeps the room; break line of sight behind pillars.
  // Hollow (55%): the shell splits; its inside pulls you to the centre while shards orbit. Dash outward.
  // Blink (20%): it closes and vanishes; a rising whine and a ring mark where it reopens — behind you.
  M.boss_hollow.phases = [
    { at: 1, moves: [
      { id: 'Void Bolts', kind: 'fan', cd: 6, n: 5, spread: 0.2, tele: 0.5, mult: 0.9, dtype: 'lightning', st: ['shock', 60, 3], proj: { shape: 'bolt', color: '#c9a8ff', speed: 10 } }] },
    { at: 0.55, say: 'The shell splits. Something inside it pulls.', moves: [
      { id: 'Orbiting Shards', kind: 'ring', cd: 5, n: 10, tele: 0.6, mult: 0.8, dtype: 'cold', proj: { shape: 'shard', color: '#d8c8ff', speed: 6 } }] },
    { at: 0.2, say: 'The eye closes. The dark is total.', enrage: true, moves: [
      { id: 'Starfall', kind: 'ring', cd: 6, n: 14, tele: 0.7, mult: 0.8, dtype: 'lightning', proj: { shape: 'orb', color: '#d8c8ff', speed: 6.5 } }] },
  ];
  M.boss_hollow.special = 'hollow';
  SP.hollow = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep' || p.dead) return false;
    // the gaze sweeps in every phase but the last
    if (ai.phase < 2) {
      ai.gazeA = (ai.gazeA === undefined ? Math.atan2(p.y - e.y, p.x - e.x) - 1.2 : ai.gazeA) + dt * 0.45;
      if ((ai.gazeFx = (ai.gazeFx || 0) - dt) <= 0) {
        ai.gazeFx = 0.2;
        for (let k = 2; k <= 10; k += 2) U.fx('spark', e.x + Math.cos(ai.gazeA) * k, e.y + Math.sin(ai.gazeA) * k, { color: '#fff6c8', radius: 0.5 });
      }
      let da = Math.atan2(p.y - e.y, p.x - e.x) - ai.gazeA;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < 0.22 && d < 12 && W.los(e.x, e.y, p.x, p.y) && (ai.gazeHit = (ai.gazeHit || 0) - dt) <= 0) {
        ai.gazeHit = 0.3;
        game.applyHit(p, { cold: avgDmg(e) * 0.45 }, { src: e, lvl: e.level }); game.applyStatus(p, 'chill', 1.5);
      }
    }
    if (ai.phase === 1 && d < 10 && !game.getEffect(p, 'invuln')) {          // the pull
      const k = Math.min(d - 0.8, 1.3 * dt) / (d || 1);
      if (k > 0 && W.move(p, (e.x - p.x) * k, (e.y - p.y) * k) && game.onPlayerMoved) game.onPlayerMoved(false);
      if ((ai.pullFx = (ai.pullFx || 0) - dt) <= 0) { ai.pullFx = 0.5; U.fx('ring', e.x, e.y, { radius: 3, color: '#7a5aff', duration: 0.45 }); }
    }
    if (ai.phase >= 2) {
      if (ai.gone) {
        ai.gone.t -= dt;
        game.addEffect(e, { id: 'invuln', t: 0.3 });
        if (ai.gone.t > 0) return true;
        const s = W.free(ai.gone.x, ai.gone.y, 2);
        if (s) { e.x = s.x; e.y = s.y; ai.path = null; }
        e.cloaked = false; game.removeEffect(e, 'invuln');
        U.fx('teleport', e.x, e.y, { color: '#d8c8ff' });
        ezone(e, e.x, e.y, 2.4, 0.05, 1.6, 'cold', { color: '#d8c8ff', shake: 4 });
        ai.gone = null; ai.goneT = 7;
        return true;
      }
      ai.goneT = (ai.goneT === undefined ? 1 : ai.goneT) - dt;
      if (ai.goneT <= 0) {
        const bx = p.x - Math.cos(p.facing) * 2, by = p.y - Math.sin(p.facing) * 2;
        ai.gone = { t: 1.6, x: bx, y: by };
        e.cloaked = true;
        U.fx('teleport', e.x, e.y, { color: '#d8c8ff' });
        U.fx('ring', bx, by, { radius: 2.4, color: '#d8c8ff', duration: 1.6 });
        U.sfx('cast'); U.text(p.x, p.y - 1.6, 'A rising whine behind you', '#d8c8ff', true);
        G.emit('boss:blackout', { boss: e, t: 1.6 });
        return true;
      }
    }
    return false;
  };
})();
