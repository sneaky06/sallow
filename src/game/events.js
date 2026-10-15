// R7.5 skill and speed: explored % for the HUD, the speed-clear grade on reaching the stairs (with its chest), and timed
// floor events — Run the Gauntlet, Key Hunt, Cave-in and The Magpie. Events talk to the UI only through
// event:start / event:update / event:end { id, name, timer, goal, progress? , success?, reward? } and G.game.getEvent().
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, C = G.C, M = game.MONSTERS;

  // ------------------------------ explored % ------------------------------
  const ex = { map: null, walk: 0, val: 0, t: 0 };
  function walkableCount(map) {
    let n = 0;
    for (let i = 0; i < map.tiles.length; i++) if (C.WALKABLE[map.tiles[i]]) n++;
    return Math.max(1, n);
  }
  game.getExplored = function () {
    const S = G.state, map = S.map;
    if (!map || !map.explored) return 0;
    if (map.kind === 'town') return 100;
    if (ex.map !== map) { ex.map = map; ex.walk = walkableCount(map); ex.t = -1; }
    if (S.time - ex.t < 0.5 && ex.t >= 0) return ex.val;
    ex.t = S.time;
    let n = 0;
    const t = map.tiles, e = map.explored;
    for (let i = 0; i < t.length; i++) if (e[i] && C.WALKABLE[t[i]]) n++;
    ex.val = Math.min(100, Math.round(n / ex.walk * 100));
    return ex.val;
  };

  // ------------------------------ speed-clear grade ------------------------------
  // On first reaching a stairs-down tile: score = explored fraction × min(1.3, par / time), par = 45 s + 1 s per 10 walkable tiles.
  // S ≥ 0.85 · A ≥ 0.65 · B ≥ 0.45 · C ≥ 0.25 · D. Reward: XP (share of the level), dust/shards, and (D excepted) a small chest by
  // the stairs whose best item is at least uncommon (B), rare (A) or magic (S).
  const GRADES = [
    { g: 'S', min: 0.85, xp: 0.12, dust: 6, shard: 2, floor: 'magic' },
    { g: 'A', min: 0.65, xp: 0.08, dust: 4, shard: 1, floor: 'rare' },
    { g: 'B', min: 0.45, xp: 0.05, dust: 2, shard: 0, floor: 'uncommon' },
    { g: 'C', min: 0.25, xp: 0.03, dust: 1, shard: 0, floor: null },
    { g: 'D', min: -1, xp: 0, dust: 0, shard: 0, floor: null, noChest: true },
  ];
  game.CLEAR_GRADES = GRADES;
  const fl = { t0: 0, stairs: [], grade: null, chk: 0 };
  function par(map) { return 45 + walkableCount(map) / 10; }
  game.getClearGrade = function () {
    const S = G.state;
    if (!S.map || S.scene !== 'dungeon') return null;
    if (fl.grade) return fl.grade;
    return { grade: null, explored: game.getExplored(), time: Math.round(S.time - fl.t0), par: Math.round(par(S.map)) };
  };
  function gradeFloor(p, sx, sy) {
    const S = G.state, map = S.map, time = Math.max(1, S.time - fl.t0), xp = game.getExplored(), pr = par(map);
    const score = xp / 100 * Math.min(1.3, pr / time);
    let G0 = GRADES[GRADES.length - 1];
    for (const g of GRADES) if (score >= g.min) { G0 = g; break; }
    fl.grade = { grade: G0.g, score: Math.round(score * 100) / 100, explored: xp, time: Math.round(time), par: Math.round(pr), depth: S.depth };
    if (G0.xp > 0) game.gainXp(p.xpNext * G0.xp);
    if (G0.dust || G0.shard) {
      p.materials = p.materials || {};
      p.materials.dust = (p.materials.dust || 0) + G0.dust; p.materials.shard = (p.materials.shard || 0) + G0.shard;
    }
    if (!G0.noChest) {
      const spot = G.world && G.world.findFreeTileNear ? G.world.findFreeTileNear(map, sx + 1, sy, 3) : null;
      if (spot && !(spot.x === sx && spot.y === sy)) {
        map.props.push({ type: 'chest', x: spot.x, y: spot.y, solid: true, interact: 'chest', gradeFloor: G0.floor || undefined, light: 2 });
        if (G.world.invalidate) G.world.invalidate(map);
        U.fx('lootbeam', spot.x + 0.5, spot.y + 0.5, { color: '#ffe45b' });
      }
    }
    U.toast('Floor cleared: grade ' + G0.g + ' (' + xp + '% explored, ' + fl.grade.time + 's / par ' + fl.grade.par + 's)', G0.g === 'S' ? '#ffe45b' : '#d8d8d8');
    U.sfx(G0.g === 'S' || G0.g === 'A' ? 'quest' : 'click');
    G.emit('floor:graded', fl.grade);
  }

  // ------------------------------ timed events ------------------------------
  let cur = null, pending = null, updT = 0;
  game.EVENTS = {
    gauntlet: { name: 'Run the Gauntlet', goal: 'Reach the beacon before time runs out' },
    keyhunt:  { name: 'Key Hunt', goal: 'Break the crates and find the key before the vault locks' },
    collapse: { name: 'Cave-in', goal: 'The roof is coming down. Survive it' },
    thief:    { name: 'The Magpie', goal: 'Catch the thief before it gets away' },
  };
  game.getEvent = function () { return cur ? { id: cur.id, name: cur.name, timer: Math.max(0, Math.round(cur.timer * 10) / 10), goal: cur.goal, progress: cur.progress || '' } : null; };
  function payload() { return game.getEvent(); }
  function refDmg(d) { return 3 * game.dmgScale(game.monsterLevel(d)); }

  function farSpot(p, rng, dmin, dmax) {
    for (let k = 0; k < 60; k++) {
      const a = rng.range(0, 6.28), r = rng.range(dmin, dmax), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (!W.walkable(x, y)) continue;
      const path = W.path(p.x, p.y, Math.floor(x) + 0.5, Math.floor(y) + 0.5, 3000);
      if (!path || !path.length) continue;
      let len = Math.hypot(path[0].x - p.x, path[0].y - p.y);
      for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      if (len >= dmin) return { x: Math.floor(x), y: Math.floor(y), len: len };
    }
    return null;
  }
  function start(id, o) {
    const E = game.EVENTS[id];
    cur = Object.assign({ id: id, name: E.name, goal: E.goal, timer: 30, progress: '' }, o);
    U.toast(E.name + ' — ' + E.goal, '#7fffd4'); U.sfx('quest');
    G.emit('event:start', payload());
  }
  function end(success, reward) {
    if (!cur) return;
    const out = { id: cur.id, name: cur.name, timer: Math.max(0, cur.timer), goal: cur.goal, success: !!success, reward: reward || null };
    if (cur.beacon && G.state.map) { const i = G.state.map.props.indexOf(cur.beacon); if (i >= 0) G.state.map.props.splice(i, 1); if (G.world.invalidate) G.world.invalidate(G.state.map); }
    cur = null;
    U.toast(out.name + (success ? ' — done!' : ' — failed'), success ? '#7fffd4' : '#c96a6a');
    U.sfx(success ? 'quest' : 'error');
    G.emit('event:end', out);
  }
  function lootHere(x, y, floor, source) {
    const p = G.state.player;
    if (!(G.items && G.items.dropLoot) || !p) return;
    try { G.items.dropLoot(x, y, { source: source || 'chest', level: game.monsterLevel(G.state.depth), magicFind: p.stats.magicFind || 0, goldFind: p.stats.goldFind || 0, floor: floor || undefined,
      pallor: game.pallorValue ? game.pallorValue() : 0 }); } catch (err) { console.error('[game] dropLoot failed', err); }
  }

  const BEGIN = {
    gauntlet(p, rng) {
      const s = farSpot(p, rng, 16, 26);
      if (!s) return false;
      const beacon = { type: 'torch', x: s.x, y: s.y, solid: false, light: 5, event: 'gauntlet' };
      G.state.map.props.push(beacon); if (G.world.invalidate) G.world.invalidate(G.state.map);
      start('gauntlet', { timer: Math.round(s.len / ((game.BASE_SPEED || 5) * 0.75) + 10), tx: s.x + 0.5, ty: s.y + 0.5, beacon: beacon, spawnT: 2, pulse: 0 });
      return true;
    },
    keyhunt(p, rng) {
      const v = farSpot(p, rng, 10, 18);
      if (!v) return false;
      const map = G.state.map, vault = { type: 'chest', x: v.x, y: v.y, solid: true, interact: 'chest', locked: true, gradeFloor: 'rare', event: 'keyhunt', light: 2 };
      map.props.push(vault);
      const crates = [];
      for (let k = 0; k < 40 && crates.length < 5; k++) {
        const t = G.world.findFreeTileNear(map, v.x + rng.int(-6, 6), v.y + rng.int(-6, 6), 3);
        if (!t || (t.x === v.x && t.y === v.y) || crates.some(function (c) { return c.x === t.x && c.y === t.y; })) continue;
        const c = { type: 'barrel', x: t.x, y: t.y, solid: true, interact: 'barrel', event: 'keyhunt' };
        map.props.push(c); crates.push(c);
      }
      if (crates.length < 2) return false;
      crates[rng.int(0, crates.length - 1)].key = true;
      if (G.world.invalidate) G.world.invalidate(map);
      start('keyhunt', { timer: 60, vault: vault, left: crates.length, progress: crates.length + ' crates' });
      return true;
    },
    collapse() { start('collapse', { timer: 25, rockT: 1, hits: 0, progress: 'untouched' }); return true; },
    thief(p, rng) {
      const s = farSpot(p, rng, 5, 9);
      if (!s) return false;
      const e = game.createMonster('magpie', s.x + 0.5, s.y + 0.5, game.monsterLevel(G.state.depth) + 1, 'normal', null, true);
      e.stats.hpMax = e.hp = Math.round(e.stats.hpMax * 3); e.speed = (game.BASE_SPEED || 5) * 0.85; e.ai.st = 'chase'; e.noLoot = true; e.magpie = true;
      e.sprite.accent = '#ffd94a'; e.rarity = 'champion';
      G.state.entities.push(e);
      start('thief', { timer: 20, thiefId: e.id, dropAt: 0.85 });
      return true;
    },
  };

  // The Magpie: runs from you, drops a little gold for every 15% of its life you take, vanishes when the timer ends.
  M.magpie = Object.assign({}, M.goblin, { id: 'magpie', n: 'The Magpie', special: 'magpie', desc: 'It took something shiny. It wants more.', theme: 'event' });
  M.magpie.sprite = Object.assign({}, M.goblin.sprite, { accent: '#ffd94a' });
  game.SPECIAL.magpie = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (cur && cur.thiefId === e.id) {
      while (e.hp < e.stats.hpMax * cur.dropAt && cur.dropAt > 0.1) {
        cur.dropAt -= 0.15;
        if (G.items && G.items.dropItemAt) G.items.dropItemAt(e.x, e.y, { type: 'gold', qty: Math.round(10 + G.state.depth * 6), name: 'Gold', rarity: 'common', icon: { shape: 'gold', color: '#ffd94a' } });
      }
    }
    if (ai.fleeA === undefined || (ai.fleeT = (ai.fleeT || 0) - dt) <= 0) {
      ai.fleeT = 0.6;
      const away = Math.atan2(e.y - p.y, e.x - p.x);
      let best = away;
      for (let k = 0; k < 8; k++) {
        const a = away + U.rand(-1.4, 1.4);
        if (W.walkable(e.x + Math.cos(a) * 1.5, e.y + Math.sin(a) * 1.5)) { best = a; break; }
      }
      ai.fleeA = best;
    }
    const sp = e.speed * game.speedMult(e) * dt;
    if (!W.move(e, Math.cos(ai.fleeA) * sp, Math.sin(ai.fleeA) * sp)) ai.fleeT = 0;
    e.facing = ai.fleeA;
    if (e.anim !== 'walk') { e.anim = 'walk'; e.animT = 0; }
    return true;
  };

  function tick(p, dt) {
    const S = G.state;
    cur.timer -= dt;
    switch (cur.id) {
      case 'gauntlet': {
        if ((cur.pulse -= dt) <= 0) { cur.pulse = 0.6; U.fx('ring', cur.tx, cur.ty, { radius: 1.2, color: '#7fffd4', duration: 0.55 }); }
        if (Math.hypot(p.x - cur.tx, p.y - cur.ty) < 1.3) { const tx = cur.tx, ty = cur.ty; end(true, 'chest'); lootHere(tx, ty, 'rare'); return; }
        if ((cur.spawnT -= dt) <= 0) {
          cur.spawnT = 3.5;
          const pool = game.THEME_POOLS[S.map.theme] || game.THEME_POOLS[C.themeForDepth(S.depth)] || game.THEME_POOLS.crypt;
          for (let k = 0; k < 2; k++) {
            const a = U.rand(0, 6.28), s = W.free(p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6, 2);
            if (!s) continue;
            const m = game.createMonster(game.pickMonsterType(S.depth, S.map.theme), s.x, s.y, game.monsterLevel(S.depth), 'normal');
            m.ai.st = 'chase'; m.ai.atk = 0.8; m.noLoot = true; m.xp = Math.round(m.xp * 0.5);
            S.entities.push(m); U.fx('smoke', s.x, s.y, {});
          }
        }
        cur.progress = Math.round(Math.hypot(p.x - cur.tx, p.y - cur.ty)) + ' tiles';
        break;
      }
      case 'keyhunt':
        if (cur.found) { if (cur.vault.used) { end(true, 'vault'); return; } cur.timer += dt; cur.progress = 'key found — open the vault'; }
        break;
      case 'collapse':
        if ((cur.rockT -= dt) <= 0) {
          cur.rockT = Math.max(0.5, 0.95 - (25 - cur.timer) * 0.015);
          for (let k = 0; k < 2; k++) {
            const r = k ? U.rand(0.5, 3.5) : U.rand(0, 0.8), a = U.rand(0, 6.28);
            game.addZone({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 1.2, delay: 1.0, faction: 'enemy', dmg: refDmg(S.depth) * 1.6, dtype: 'phys', lvl: S.depth,
              fx: 'explosion', color: '#c9b27a', shake: 2, rock: true });
          }
        }
        break;
      case 'thief': {
        const e = game.byId(cur.thiefId);
        if (!e || e.dead) { end(true, 'loot'); return; }
        cur.progress = Math.round(Math.hypot(e.x - p.x, e.y - p.y)) + ' tiles away';
        if (cur.timer <= 0) { U.fx('teleport', e.x, e.y, { color: '#ffd94a' }); const i = S.entities.indexOf(e); if (i >= 0) S.entities.splice(i, 1); }
        break;
      }
    }
    if (cur && cur.timer <= 0) {
      if (cur.id === 'collapse') {
        const clean = cur.hits === 0;
        end(true, clean ? 'clean' : 'cache');
        lootHere(p.x, p.y, clean ? 'rare' : 'uncommon');
        return;
      }
      if (cur.id === 'keyhunt') { cur.vault.sealed = true; cur.vault.locked = true; }
      end(false);
    }
  }
  G.on('player:damaged', function (e) { if (cur && cur.id === 'collapse' && e && e.amount > 0 && e.source == null) { cur.hits++; cur.progress = cur.hits + ' hit' + (cur.hits > 1 ? 's' : ''); } });
  G.on('monster:killed', function (ev) {
    const m = ev && ev.monster;
    if (m && m.magpie) lootHere(m.x, m.y, 'rare', 'rare');
  });
  // a smashed barrel (player.js) — the key may be inside
  game.onBarrelBroken = function (prop) {
    if (!cur || cur.id !== 'keyhunt' || prop.event !== 'keyhunt' || cur.found) return;
    cur.left--;
    if (prop.key) {
      cur.found = true; cur.vault.locked = false;
      U.toast('You find the key. The vault opens.', '#7fffd4'); U.sfx('loot_rare');
      U.fx('lootbeam', cur.vault.x + 0.5, cur.vault.y + 0.5, { color: '#7fffd4' });
    } else cur.progress = cur.left + ' crates left';
  };

  // Start an event now (dev / tests / a future shrine). false if it cannot be placed on this floor.
  game.startEvent = function (id) {
    const S = G.state, p = S.player;
    if (!p || !S.map || S.scene !== 'dungeon' || !BEGIN[id] || cur) return false;
    try { return !!BEGIN[id](p, G.rng.create(((S.time * 1000) | 0) + 17)); } catch (err) { console.error('[game] event start failed', err); cur = null; return false; }
  };

  // ------------------------------ per-frame + floor setup ------------------------------
  game.updateEvents = function (dt) {
    const S = G.state, p = S.player;
    if (!p || !S.map || S.scene !== 'dungeon' || p.dead) return;
    if (pending && (pending.t -= dt) <= 0) {
      const id = pending.id, rng = pending.rng;
      pending = null;
      if (!cur) { try { if (!BEGIN[id](p, rng)) cur = null; } catch (err) { console.error('[game] event start failed', err); cur = null; } }
    }
    if (cur) {
      tick(p, dt);
      if (cur && (updT -= dt) <= 0) { updT = 0.25; G.emit('event:update', payload()); }
    }
    if (!fl.grade && (fl.chk -= dt) <= 0) {
      fl.chk = 0.25;
      for (const s of fl.stairs) if (Math.abs(s.x + 0.5 - p.x) < 2.5 && Math.abs(s.y + 0.5 - p.y) < 2.5) { gradeFloor(p, s.x, s.y); break; }
    }
  };

  G.on('scene:changed', function (ev) {
    const S = G.state, map = ev && ev.map;
    if (cur) G.emit('event:end', { id: cur.id, name: cur.name, timer: cur.timer, goal: cur.goal, success: false, reward: null });
    cur = null; pending = null; fl.grade = null; fl.stairs = []; fl.t0 = S.time; ex.map = null;
    if (!map || ev.scene !== 'dungeon') return;
    for (let i = 0; i < map.tiles.length; i++) if (map.tiles[i] === C.TILE.STAIRS_DOWN) fl.stairs.push({ x: i % map.w, y: (i / map.w) | 0 });
    const depth = map.depth | 0;
    if (depth < 2 || depth % C.BOSS_EVERY === 0) return;
    const rng = G.rng.create(((map.seed | 0) ^ 0x7f4a7c15) >>> 0);
    if (!rng.chance(0.4)) return;
    pending = { id: rng.pick(['gauntlet', 'keyhunt', 'collapse', 'thief']), t: 5, rng: rng };
  });
})();
