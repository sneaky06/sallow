// Monster/minion/NPC entities, level scaling, map population, and AI (sleep → aggro → chase/kite → leash, boss patterns).
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS;
  const M = game.MONSTERS;
  game.SPECIAL = game.SPECIAL || {};          // R7: def.special → fn(e, def, t, d, dt, p) → true to skip the default fight logic

  const MAX_MONSTERS = 80;
  const ACTIVE_R2 = 17 * 17;        // monsters further than this from the player are not simulated at all
  const LEASH = 14.5;

  // Unbounded scaling by level. HP outgrows damage: player damage compounds faster (gear × stats × ranks) than player life.
  // The first few levels are deliberately soft (ramp → 1 at level 5) so depth 1 teaches rather than punishes.
  function ramp(L, from) { return L >= 5 ? 1 : from + (1 - from) * (L - 1) / 4; }
  // R6 difficulty pass (lead playtest: far too easy). Monsters take ~3–5 main-skill hits from on-level gear (trash at
  // depths 1–2 still folds in 1–2), and a pack kills a player who stands still in a few seconds at any depth. HPM/DMM are
  // the multipliers on top of the R5 curves; DMM is heaviest early so the first floors ramp quickly into the first boss.
  game.HPM = function (L) { return 1.6 + 1.2 * Math.min(1, Math.max(0, (L - 1) / 5)); };
  game.DMM = function (L) { return (1.15 + 1.15 * Math.min(1, Math.max(0, (17 - L) / 12))) * (L < 2 ? 0.8 : L < 3 ? 0.9 : 1); };
  game.hpScale = function (L) { return (1 + 0.25 * (L - 1)) * Math.pow(1.06, L - 1) * ramp(L, 0.9) * game.HPM(L); };
  game.dmgScale = function (L) { return 1.12 * (1 + 0.22 * (L - 1)) * Math.pow(1.05, L - 1) * ramp(L, 0.85) * game.DMM(L); };
  game.SPEED_SCALE = 1.2;           // R6.3: the player moves ~19% faster; monsters keep pace
  game.XP_MULT = 1.8;               // tougher monsters, same generous levelling pace per minute
  // Out-levelling no longer trivialises a floor: monsters are never more than 3 levels below the player.
  game.monsterLevel = function (depth) {
    const p = G.state.player;
    return Math.max(Math.max(1, depth | 0), p ? (p.level | 0) - 3 : 1);
  };
  game.xpScale = function (L) { return (1 + 0.2 * (L - 1)) * Math.pow(1.03, L - 1); };

  const RARITY_MULT = {
    normal:   { hp: 1,   dmg: 1,    xp: 1, scale: 1 },
    champion: { hp: 2.2, dmg: 1.2,  xp: 3, scale: 1.15 },
    rare:     { hp: 3.5, dmg: 1.3,  xp: 6, scale: 1.3 },
    legendary: { hp: 6,  dmg: 1.45, xp: 18, scale: 1.5 },
    boss:     { hp: 1,   dmg: 1,    xp: 1, scale: 1 },
  };
  const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

  function newAI(x, y) {
    return { st: 'sleep', hx: x, hy: y, t: U.rand(0, 0.3), tt: 0, tgt: 0, atk: 0, wind: 0, al: 0, rp: 0, path: null, pi: 0,
      los: false, losT: 0, corpse: 0, phase: 0, cast: null, gcd: 2, mcd: {}, blinkT: 0, shieldT: 0, nd: 0 };
  }

  // opts: true = player minion (no floor modifiers); a string = forced modifier for a champion pack.
  game.createMonster = function (monsterId, x, y, level, rarity, rng, opts) {
    const def = M[monsterId] || M.skeleton;
    rng = rng || U.rng;
    rarity = def.boss ? 'boss' : (rarity || 'normal');
    level = Math.max(1, Math.round(level));
    const rm = RARITY_MULT[rarity], hs = game.hpScale(level), ds = game.dmgScale(level);
    const st = U.zeroStats();
    st.hpMax = Math.max(1, Math.round(def.hp * hs * rm.hp));
    st.armor = Math.round(def.armor * (1 + 0.3 * (level - 1)));
    if (def.res) {
      st.resFire = def.res.fire || 0; st.resCold = def.res.cold || 0; st.resLightning = def.res.lightning || 0; st.resPoison = def.res.poison || 0;
    }
    const e = {
      id: G.newId(), type: 'monster', name: def.n, x: x, y: y, radius: def.r * (def.sprite.scale > 1.3 ? 1 : Math.max(0.8, def.sprite.scale)) * (rarity === 'rare' ? 1.15 : 1),
      facing: rng.range(0, 6.28), sprite: Object.assign({}, def.sprite), anim: 'idle', animT: rng.range(0, 1), hitFlash: 0, dead: false,
      level: level, hp: st.hpMax, mp: 0, stats: st, effects: [],
      monsterId: def.id, rarity: rarity, affixes: [], faction: 'enemy',
      dmgMin: def.dmg[0] * ds * rm.dmg, dmgMax: def.dmg[1] * ds * rm.dmg, speed: def.spd * game.SPEED_SCALE, atkCd: def.cd, aggro: def.aggro * 1.15,
      regen: def.regen || 0, xp: Math.round(def.xp * game.xpScale(level) * rm.xp * game.XP_MULT), ai: newAI(x, y),
    };
    if (def.sprite.body === 'flyer' || def.sprite.body === 'wraith') { e.fly = true; e.lavaProof = true; }     // R2.1: hover over water and lava
    else if (def.theme === 'inferno') e.lavaProof = true;                                                       // natives wade through lava unharmed
    if (def.blink) e.ai.blinkT = def.blink;
    if (opts !== true) game.applyFloorMods(e);          // opts === true: a player minion, untouched by the floor
    if (rarity === 'champion' || rarity === 'rare' || rarity === 'legendary') {
      game.rollAffixes(e, rarity, rng, typeof opts === 'string' ? opts : null);
      e.sprite.scale = (e.sprite.scale || 1) * rm.scale;
      const N = game.RARE_NAMES;
      if (rarity === 'champion') {
        e.sprite.accent = '#5b8cff';
        e.name = e.affixes[0] + ' ' + def.n;
      } else if (rarity === 'rare') {
        e.sprite.accent = '#ffe45b';
        e.name = rng.pick(N.a) + rng.pick(N.b) + ' ' + rng.pick(N.t);
      } else {
        e.sprite.accent = '#ff8a2b';
        e.name = rng.pick(N.a) + rng.pick(N.b) + ', ' + rng.pick(game.LEGEND_TITLES);
        e.radius *= 1.2;
      }
    }
    if (rarity === 'boss') {
      // boss hits are a big share of a life bar early on; deeper, where everything else also hurts, they grow a little slower
      // R6: bosses take half of the life multiplier (their hits carry the full one): long fights, not endless ones
      const hm = game.HPM(level);
      e.stats.hpMax = e.hp = Math.round(st.hpMax * (1 + (hm - 1) * 0.5) / hm);
      const dm = game.DMM(level);
      const soft = 1.05 * Math.max(0.72, 1 - Math.max(0, level - 7) * 0.018) * (1 + (dm - 1) * 0.7) / dm;      // and 70% of the damage one
      e.dmgMin *= soft; e.dmgMax *= soft;
      let i = 0;
      for (const mv of def.phases[0].moves) e.ai.mcd[mv.id] = mv.first !== undefined ? mv.first : 2.5 + 2.5 * i++;
    }
    return e;
  };

  // Player minion: toughness follows monster damage growth, damage follows monster life growth, so it stays relevant.
  game.createMinion = function (monsterId, x, y, p, mult) {
    const def = M[monsterId];
    const e = game.createMonster(monsterId, x, y, p.level, 'normal', null, true);
    const hp = Math.round(def.hp * game.dmgScale(p.level) * (1 + p.level * 0.08) * mult);
    const dm = game.hpScale(p.level) * mult * (1 + (p.stats.skillDmgPct || 0) / 100);
    e.stats.hpMax = hp; e.hp = hp;
    e.dmgMin = def.dmg[0] * dm; e.dmgMax = def.dmg[1] * dm;
    e.atkCd = def.cd / (1 + (p.bonus.minionAS || 0) / 100);
    e.faction = 'player';
    e.summon = true;
    e.xp = 0; e.noLoot = true;
    e.ai.st = 'chase';
    return e;
  };

  game.getMonsterInfo = function (monsterId) {
    const d = M[monsterId];
    if (!d) return null;
    return { id: d.id, name: d.n, sprite: Object.assign({}, d.sprite), theme: d.theme, archetype: d.arch, boss: !!d.boss, desc: d.desc || '',
      damageType: d.dtype || 'phys', hp: d.hp, range: d.range || 0 };
  };

  game.bossForDepth = function (depth) {
    const idx = Math.max(0, Math.ceil(depth / G.C.BOSS_EVERY) - 1);
    return { id: game.BOSS_ORDER[idx % game.BOSS_ORDER.length], tier: Math.floor(idx / game.BOSS_ORDER.length) };
  };

  game.createBoss = function (depth, x, y) {
    const b = game.bossForDepth(depth);
    const e = game.createMonster(b.id, x, y, game.monsterLevel(depth) + 2, 'boss');
    e.stats.hpMax = Math.round(e.stats.hpMax * 1.35 * (1 + depth * 0.03)); e.hp = e.stats.hpMax;      // player power snowballs with gear: bosses keep pace
    if (b.tier > 0) {
      e.name += ROMAN[Math.min(b.tier, ROMAN.length - 1)];
      e.stats.hpMax = Math.round(e.stats.hpMax * (1 + 0.4 * b.tier)); e.hp = e.stats.hpMax;
      e.speed *= 1.1;
    }
    return e;
  };

  game.createNpc = function (role, x, y) {
    const d = game.NPCS[role] || game.NPCS.merchant;
    const st = U.zeroStats();
    st.hpMax = 1;
    return { id: G.newId(), type: 'npc', name: d.name, x: x, y: y, radius: 0.35, facing: Math.PI / 4, sprite: Object.assign({}, d.sprite),
      anim: 'idle', animT: 0, hitFlash: 0, dead: false, level: 1, hp: 1, mp: 0, stats: st, effects: [], role: role, faction: 'neutral' };
  };

  // ------------------------------ map population ------------------------------
  const ARCH_W = { melee: 4, ranged: 2.4, caster: 1.6, swarm: 3, brute: 1.2 };

  // R9.1 "floors shape their monsters" — the canonical shape is World's map.variant.monsterBias = { tags, monsterIds, weight }:
  // `weight` (0..1) is the share of spawn picks drawn from `monsterIds` (archetype-weighted); the rest follow the theme pool.
  // `tags` are descriptive only. Ids that are unknown, bosses, minions or event monsters are ignored. Read once per map.
  let bias = null;
  function readBias(map) {
    const b = map && map.variant && map.variant.monsterBias;
    if (!b || !Array.isArray(b.monsterIds) || !(b.weight > 0)) return null;
    const ids = b.monsterIds.filter(function (id) { return M[id] && !M[id].boss && M[id].theme !== 'minion' && M[id].theme !== 'event'; });
    return ids.length ? { ids: ids, weight: Math.min(1, b.weight), tags: Array.isArray(b.tags) ? b.tags.slice() : [] } : null;
  }
  game.monsterBiasOf = function (map) { return readBias(map); };
  function pickType(rng, pool, depth, not) {
    if (bias && rng.next() < bias.weight) pool = bias.ids;          // this pick follows the floor's variant
    const entries = [];
    for (const id of pool) {
      if (id === not) continue;
      let w = ARCH_W[M[id].arch] || 1;
      if (depth <= 1 && (M[id].arch === 'brute' || M[id].arch === 'caster')) w *= 0.4;
      entries.push({ w: w, id: id });
    }
    return entries.length ? rng.weighted(entries).id : pool[0];
  }

  function spotNear(rng, x, y, spread) {
    for (let k = 0; k < 6; k++) {
      const tx = x + rng.int(-spread, spread), ty = y + rng.int(-spread, spread);
      if (W.walkable(tx, ty)) return { x: tx + 0.5 + rng.range(-0.2, 0.2), y: ty + 0.5 + rng.range(-0.2, 0.2) };
    }
    return W.free(x, y, 3) || { x: x + 0.5, y: y + 0.5 };
  }

  game.pickMonsterType = function (depth, theme, rng) {
    return pickType(rng || U.rng, game.THEME_POOLS[theme] || game.THEME_POOLS[G.C.themeForDepth(depth)] || game.THEME_POOLS.crypt, depth);
  };

  game.spawnMapEntities = function (map) {
    const S = G.state;
    if (!map || !map.spawns) return;
    const prevMap = S.map;
    S.map = map;                              // W.* helpers read state.map (scenes sets it before calling us anyway)
    const rng = G.rng.create(((map.seed | 0) ^ 0x5bd1e995) >>> 0);
    const depth = Math.max(1, map.depth | 0);
    if (game.notePallorFloor) game.notePallorFloor(map);       // R5.2: Pallor rises before this floor's monsters are made
    let pool = game.THEME_POOLS[map.theme] || game.THEME_POOLS[G.C.themeForDepth(depth)] || game.THEME_POOLS.crypt;
    bias = readBias(map);
    const order = { npc: 0, boss: 1, elite: 2, pack: 3, monster: 4 };
    const spawns = map.spawns.slice().sort(function (a, b) { return (order[a.kind] || 9) - (order[b.kind] || 9); });
    let count = 0;
    const bossFloor = map.spawns.some(function (s) { return s.kind === 'boss'; });
    // R3.7 floor modifiers: rolled once per map, deterministically from its seed
    if (map.kind === 'dungeon' && !map.mods) map.mods = game.rollFloorMods(depth, G.rng.create(((map.seed | 0) ^ 0x2545f491) >>> 0), bossFloor);
    const has = function (id) { return !!(map.mods && map.mods.indexOf(id) >= 0); };
    // R3.6 legendary monster: about one floor in 2–3 from depth 3, more often deeper; always on a "Hunted" floor
    let legend = map.kind === 'dungeon' && !bossFloor && !map.cleansed && depth >= 3 && (has('hunted') || rng.chance(Math.min(0.7, 0.33 + depth * 0.012)));
    if (map.kind === 'dungeon' && !bossFloor && game.pallorHunts && game.pallorHunts()) legend = true;      // Pallor IV: something pale hunts every floor
    const LVL = { champion: 1, rare: 2, legendary: 3 };
    const mlvl = game.monsterLevel(depth);          // R6: out-level scaling
    const add = function (id, s, rarity, spread, shared) {
      if (count >= MAX_MONSTERS) return null;
      const at = spread ? spotNear(rng, s.x, s.y, spread) : (W.free(s.x + 0.5, s.y + 0.5, 3) || { x: s.x + 0.5, y: s.y + 0.5 });
      const e = game.createMonster(id, at.x, at.y, mlvl + (LVL[rarity] || 0), rarity, rng, shared);
      S.entities.push(e);
      count++;
      return e;
    };
    // champions come as a small pack sharing one modifier
    const champPack = function (id, s, n) {
      const mod = rng.pick(game.affixPool ? game.affixPool(depth) : game.AFFIX_IDS);
      for (let i = 0; i < n; i++) add(id, s, 'champion', i ? 2 : 0, mod);
    };
    const eliteP = has('elite_host') ? 0.45 : 0.12;
    for (const s of spawns) {
      if (s.kind === 'npc') {
        const npc = game.createNpc(s.role, s.x + 0.5, s.y + 0.5);
        if (s.camp && game.campNpc) game.campNpc(npc, s, map);          // R7.7 cleansed-act camp: the story's named refugees
        S.entities.push(npc);
      } else if (map.kind === 'town') {
        continue;
      } else if (s.kind === 'boss') {
        if (count < MAX_MONSTERS + 1) { S.entities.push(game.createBoss(depth, s.x + 0.5, s.y + 0.5)); count++; }
      } else if (s.kind === 'elite') {
        const id = pickType(rng, pool, depth);
        if (legend) {                                   // the floor's legendary takes this elite spot, with an escort
          legend = false;
          add(id, s, 'legendary', 0);
          for (let i = 0; i < 3; i++) add(id, s, 'normal', 2);
        } else if (depth < 4 || rng.chance(0.35)) {
          champPack(id, s, depth < 3 ? 2 : rng.int(2, 4));
        } else {
          add(id, s, 'rare', 0);
          for (let i = 0; i < 3; i++) add(id, s, 'normal', 2);
        }
      } else if (s.kind === 'pack') {
        const id = pickType(rng, pool, depth);
        let n = (s.count || rng.int(3, 5)) + (depth >= 3 ? 1 : 0);          // R6: bigger packs past the first floors
        if (M[id].arch === 'swarm') n = Math.ceil(n * 1.6);
        else if (M[id].arch === 'brute') n = Math.max(1, Math.ceil(n * 0.5));
        if (has('horde')) n = Math.ceil(n * 1.4);
        if (map.cleansed) n = Math.max(1, Math.round(n * 0.6));          // R7.7: a cleansed act is quieter
        const support = rng.chance(0.3) ? pickType(rng, pool, depth, id) : null;
        let champs = 0;
        if (depth >= 2 && rng.chance(eliteP)) { champs = Math.min(n, rng.int(2, 3)); champPack(id, s, champs); }
        for (let i = champs; i < n; i++) add(support && i > 0 && i % 3 === 0 ? support : id, s, 'normal', 2);
      } else if (s.kind === 'monster') {
        add(pickType(rng, pool, depth), s, 'normal', 0);
      }
    }
    if (legend) {            // no elite spot on this floor: promote the monster furthest from the entrance
      let far = null, fd = -1;
      for (const e of S.entities) {
        if (e.type !== 'monster' || e.rarity !== 'normal') continue;
        const d = Math.hypot(e.x - map.spawn.x, e.y - map.spawn.y);
        if (d > fd) { fd = d; far = e; }
      }
      if (far) {
        const L = game.createMonster(far.monsterId, far.x, far.y, mlvl + 3, 'legendary', rng);
        S.entities[S.entities.indexOf(far)] = L;
      }
    }
    bias = null;
    S.map = prevMap || map;
  };

  // ------------------------------ AI ------------------------------
  let pathBudget = 0;
  const pVel = { x: 0, y: 0, lx: 0, ly: 0 };

  function setAnim(e, a) { if (e.anim !== a) { e.anim = a; e.animT = 0; } }
  function relax(e, a) { if (e.ai.al <= 0) setAnim(e, a); }

  function wake(e, alert) {
    const ai = e.ai;
    if (ai.st !== 'sleep') return;
    ai.st = 'chase';
    ai.atk = U.rand(0.2, 0.7);
    ai.losT = 0;
    if (e.rarity === 'boss') { U.toast(e.name, '#ff3b4e'); U.shake(3, 0.3); }
    if (!alert) return;
    const foes = game.live.foes;
    for (let i = 0; i < foes.length; i++) {
      const o = foes[i];
      if (o.ai.st === 'sleep' && Math.abs(o.x - e.x) < 5 && Math.abs(o.y - e.y) < 5) wake(o, false);
    }
  }
  game.onMonsterHurt = function (e) { if (e.ai && e.ai.st === 'sleep') wake(e, true); };

  function moveToward(e, tx, ty, dt, sm, crowd) {
    const ai = e.ai;
    let gx = tx, gy = ty;
    ai.losT -= dt;
    if (ai.losT <= 0) { ai.losT = 0.25 + U.rng.next() * 0.15; ai.los = W.los(e.x, e.y, tx, ty); }
    if (ai.nd > 0) ai.nd -= dt;
    if (!e.lavaProof) {                       // would the straight line wade through lava? then let findPath (lava cost x6) decide
      ai.lvT = (ai.lvT || 0) - dt;
      if (ai.lvT <= 0) { ai.lvT = 0.4; ai.lava = game.lavaOnLine(e.x, e.y, tx, ty); }
    }
    if (ai.los && !(ai.nd > 0) && !ai.lava) {
      ai.path = null;
    } else {
      ai.rp -= dt;
      if ((!ai.path || ai.rp <= 0) && pathBudget > 0) {          // throttled + budgeted: repaths stagger across frames
        pathBudget--;
        ai.path = W.path(e.x, e.y, tx, ty, 700);
        ai.rp = 0.7 + U.rng.next() * 0.6;
        ai.pi = ai.path && ai.path.length > 1 && Math.hypot(ai.path[0].x - e.x, ai.path[0].y - e.y) < 0.75 ? 1 : 0;
      }
      if (ai.path && ai.pi < ai.path.length) {
        let n = ai.path[ai.pi];
        if (Math.hypot(n.x - e.x, n.y - e.y) < 0.3 && ai.pi + 1 < ai.path.length) n = ai.path[++ai.pi];
        gx = n.x; gy = n.y;
      }
    }
    let dx = gx - e.x, dy = gy - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    if (separation(e, crowd)) { dx += sepX; dy += sepY; }
    const step = e.speed * sm * dt;
    if (!W.move(e, dx * step, dy * step)) { ai.rp = 0; ai.nd = 1.2; }
    // No real progress (sliding along a wall beside a doorway, wedged on a corner)? Stop steering straight at the
    // target and follow a proper path for a while.
    ai.pgT = (ai.pgT || 0) + dt;
    if (ai.pgT >= 0.7) {
      const dist = Math.hypot(tx - e.x, ty - e.y);
      if (ai.pgD !== undefined && dist > ai.pgD - 0.25 * e.speed * sm && !ai.path) { ai.nd = 2.5; ai.rp = 0; }
      ai.pgD = dist; ai.pgT = 0;
    }
    e.facing = Math.atan2(gy - e.y, gx - e.x);
    relax(e, 'walk');
  }

  // Separation: push away from overlapping neighbours so packs fan out instead of stacking. Result in sepX/sepY.
  let sepX = 0, sepY = 0;
  function separation(e, crowd) {
    sepX = 0; sepY = 0;
    for (let i = 0; i < crowd.length; i++) {
      const o = crowd[i];
      if (o === e || o.dead) continue;
      const ox = e.x - o.x, oy = e.y - o.y;
      const rr = e.radius + o.radius + 0.15;
      if (ox > rr || ox < -rr || oy > rr || oy < -rr) continue;
      const od = Math.hypot(ox, oy);
      if (od >= rr) continue;
      if (od > 0.001) { const k = (rr - od) / rr * 1.6; sepX += ox / od * k; sepY += oy / od * k; }
      else { sepX += (e.id % 2 ? 1 : -1) * 0.7; sepY += (e.id % 3 ? 1 : -1) * 0.7; }      // exactly stacked: split deterministically
    }
    return sepX !== 0 || sepY !== 0;
  }

  function fireShot(e, def, t) {
    const pj = def.proj || { shape: 'orb', color: '#ffffff', speed: 8 };
    let dmg = U.rand(e.dmgMin, e.dmgMax);
    for (const f of e.effects) if (f.dealt) dmg *= Math.max(0.1, 1 + f.dealt / 100);
    const ang = Math.atan2(t.y - e.y, t.x - e.x) + U.rand(-0.06, 0.06);
    game.spawnProjectile({ x: e.x + Math.cos(ang) * 0.3, y: e.y + Math.sin(ang) * 0.3, ang: ang, speed: pj.speed, shape: pj.shape, color: pj.color,
      faction: e.faction, dmg: dmg, dtype: def.dtype || 'phys', st: def.onHit || null, srcId: e.id, lvl: e.level, affixes: e.affixes, life: (def.range + 3) / pj.speed });
  }

  function resolveAttack(e, def, t) {
    if (!t || t.dead) return;
    e.facing = Math.atan2(t.y - e.y, t.x - e.x);
    if (def.atk === 'melee') {
      if (Math.hypot(t.x - e.x, t.y - e.y) <= e.radius + t.radius + 1.0) {
        U.fx('slash', (e.x + t.x) / 2, (e.y + t.y) / 2, { angle: e.facing, radius: 0.7, color: '#ffcccc' });
        game.monsterHit(e, t, { melee: true });
      }
    } else {
      fireShot(e, def, t);
    }
  }

  // Shared fight logic for monsters and minions once they have a target.
  function engage(e, def, t, dt, sm, crowd) {
    const ai = e.ai;
    const d = Math.hypot(t.x - e.x, t.y - e.y);
    if (def.atk === 'melee') {
      if (d <= e.radius + t.radius + 0.45) {
        e.facing = Math.atan2(t.y - e.y, t.x - e.x);
        if (ai.atk <= 0) { ai.wind = def.wind; ai.atk = e.atkCd; ai.al = def.wind + 0.2; setAnim(e, 'attack'); }
        else {
          relax(e, 'idle');
          if (separation(e, crowd)) W.move(e, sepX * e.speed * 0.5 * dt, sepY * e.speed * 0.5 * dt);     // shuffle sideways while waiting to swing
        }
      } else {
        moveToward(e, t.x, t.y, dt, sm, crowd);
      }
      return;
    }
    ai.losT -= dt;
    if (ai.losT <= 0) { ai.losT = 0.25 + U.rng.next() * 0.15; ai.los = W.shotClear(e.x, e.y, t.x, t.y); }
    // R5.5: a shooter takes careful aim at a target that plants itself far back (melee range never triggers it)
    if (def.atk === 'shot' && e.faction === 'enemy' && t.type === 'player' && game.aimedShot && game.aimedShot(e, def, t, d, dt)) return;
    if (d <= def.range && ai.los) {
      e.facing = Math.atan2(t.y - e.y, t.x - e.x);
      if (ai.atk <= 0) {
        ai.atk = e.atkCd; ai.al = def.wind + 0.25; setAnim(e, 'cast');
        if (def.atk === 'blast') {
          let dmg = (e.dmgMin + e.dmgMax) * 0.5;
          for (const f of e.effects) if (f.dealt) dmg *= Math.max(0.1, 1 + f.dealt / 100);
          game.addZone({ x: t.x, y: t.y, r: def.blast.r, delay: def.blast.tele, faction: 'enemy', dmg: dmg, dtype: def.dtype, st: def.onHit, lvl: e.level, srcId: e.id,
            affixes: e.affixes, fx: def.dtype === 'cold' ? 'frost' : 'explosion', color: COL[def.dtype] });
        } else {
          ai.wind = def.wind;
        }
      } else if (d < def.range * 0.45 && e.faction === 'enemy') {
        // kite: back away while reloading
        const step = e.speed * sm * dt * 0.85, k = 1 / (d || 1);
        if (W.move(e, (e.x - t.x) * k * step, (e.y - t.y) * k * step)) relax(e, 'walk'); else relax(e, 'idle');
      } else {
        relax(e, 'idle');
      }
    } else {
      moveToward(e, t.x, t.y, dt, sm, crowd);
    }
  }

  function blinkNear(e, t) {
    const a = U.rand(0, 6.28);
    const spot = W.free(t.x + Math.cos(a) * 1.4, t.y + Math.sin(a) * 1.4, 2);
    if (!spot) return false;
    U.fx('teleport', e.x, e.y, { color: COL.shadow });
    e.x = spot.x; e.y = spot.y;
    U.fx('teleport', e.x, e.y, { color: COL.shadow });
    e.ai.path = null; e.ai.losT = 0;
    return true;
  }

  // ---- boss pattern engine ----
  function findMove(def, id) {
    for (const ph of def.phases) for (const mv of ph.moves) if (mv.id === id) return mv;
    return null;
  }

  // Boss abilities hit much harder than its swings: they are telegraphed, so every class (kiters included) must move.
  const BOSS_MOVE = 1.9;
  function bossZone(e, mv, x, y, delay) {
    const avg = (e.dmgMin + e.dmgMax) * 0.5 * BOSS_MOVE;
    const dtype = mv.dtype || 'phys';
    const z = { x: x, y: y, r: mv.r, delay: delay, faction: 'enemy', dmg: avg * mv.mult, dtype: dtype, st: mv.st || null, lvl: e.level, srcId: e.id,
      fx: dtype === 'cold' ? 'frost' : dtype === 'poison' ? 'poison' : 'explosion', color: mv.color || COL[dtype], shake: 3 };
    if (mv.linger) { z.linger = mv.linger; z.lingerDmg = avg * mv.linger.mult; z.lingerFx = dtype === 'cold' ? 'frost' : 'poison'; }
    return game.addZone(z);
  }

  function bossShots(e, mv, ang0, n, spread) {
    const avg = (e.dmgMin + e.dmgMax) * 0.5 * BOSS_MOVE, pj = mv.proj, vol = G.newId();
    for (let i = 0; i < n; i++) {
      const ang = ang0 + (i - (n - 1) / 2) * spread;
      game.spawnProjectile({ x: e.x + Math.cos(ang) * 0.6, y: e.y + Math.sin(ang) * 0.6, ang: ang, speed: pj.speed, shape: pj.shape, color: pj.color, radius: 0.26,
        faction: 'enemy', dmg: avg * mv.mult, dtype: mv.dtype || 'phys', st: mv.st || null, srcId: e.id, lvl: e.level, explode: mv.explode || 0, life: 13 / pj.speed }).vol = vol;      // one volley can hit a given target only once
    }
    U.sfx(mv.dtype === 'fire' ? 'fire' : 'cast');
  }

  function startMove(e, def, mv, t) {
    const ai = e.ai;
    ai.mcd[mv.id] = mv.cd * (ai.enraged ? 0.8 : 1);
    e.facing = Math.atan2(t.y - e.y, t.x - e.x);
    ai.al = (mv.tele || 0.5) + 0.2;
    setAnim(e, 'cast');
    U.text(e.x, e.y - 1.6, mv.id, '#ff9a6a', true);
    const cast = { id: mv.id, t: mv.tele || 0.5, x: t.x, y: t.y, wave: 0 };
    const tele = cast.t, color = mv.color || COL[mv.dtype || 'phys'];
    switch (mv.kind) {
      case 'blink':
        blinkNear(e, t);
        U.fx('ring', e.x, e.y, { radius: mv.r, color: color, duration: tele });
        break;
      case 'slam':
        U.fx('ring', e.x, e.y, { radius: mv.r, color: color, duration: tele });
        break;
      case 'circles':
        for (let i = 0; i < mv.n; i++) {
          const a = U.rand(0, 6.28), r = i === 0 ? 0 : U.rand(0.8, mv.spread);
          bossZone(e, mv, t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, tele + i * 0.12);
        }
        cast.t = 0.45;
        break;
      case 'charge': {
        const d = Math.min(mv.dist, Math.hypot(t.x - e.x, t.y - e.y) + 1.5);
        cast.x = e.x + Math.cos(e.facing) * d; cast.y = e.y + Math.sin(e.facing) * d;
        for (let k = 1; k <= 3; k++) U.fx('ring', e.x + (cast.x - e.x) * k / 3, e.y + (cast.y - e.y) * k / 3, { radius: 0.9, color: '#ff5b5b', duration: tele });
        break;
      }
      default:
        U.fx('ring', e.x, e.y, { radius: 1.1, color: color, duration: tele });
    }
    ai.cast = cast;
  }

  function finishMove(e, def, cast, t) {
    const mv = findMove(def, cast.id), ai = e.ai;
    if (!mv) return;
    let aim = t && !t.dead ? Math.atan2(t.y - e.y, t.x - e.x) : e.facing;
    if (t && !t.dead && t.type === 'player' && mv.proj) {      // lead a moving target: kiting in a straight line gets punished
      const lead = Math.hypot(t.x - e.x, t.y - e.y) / mv.proj.speed * 0.8;
      aim = Math.atan2(t.y + pVel.y * lead - e.y, t.x + pVel.x * lead - e.x);
    }
    switch (mv.kind) {
      case 'slam':
      case 'blink':
        bossZone(e, mv, e.x, e.y, 0.01);
        break;
      case 'fan':
        e.facing = aim;
        bossShots(e, mv, aim, mv.n, mv.spread);
        break;
      case 'ring': {
        const step = Math.PI * 2 / mv.n;
        bossShots(e, mv, cast.wave * step * 0.5 + step * (mv.n - 1) / 2, mv.n, step);
        if (mv.waves && cast.wave + 1 < mv.waves) { ai.cast = { id: mv.id, t: 0.5, x: 0, y: 0, wave: cast.wave + 1 }; return true; }
        break;
      }
      case 'charge': {
        const d = Math.hypot(cast.x - e.x, cast.y - e.y), n = Math.max(1, Math.ceil(d / 0.25));
        const sx = (cast.x - e.x) / n, sy = (cast.y - e.y) / n;
        const hit = [];
        const targets = [G.state.player].concat(game.live.allies);
        for (let i = 0; i < n; i++) {
          if (!W.move(e, sx, sy)) break;
          if (i % 3 === 0) U.fx('smoke', e.x, e.y, {});
          for (const o of targets) {
            if (!o || o.dead || hit.indexOf(o.id) >= 0 || Math.hypot(o.x - e.x, o.y - e.y) > e.radius + o.radius + 0.5) continue;
            hit.push(o.id);
            game.monsterHit(e, o, { mult: mv.mult, melee: true, undodgeable: true });
          }
        }
        U.shake(4, 0.2);
        ai.path = null;
        break;
      }
      case 'summon': {
        const ents = G.state.entities;
        let alive = 0;
        for (const o of ents) if (o.bossAdd === e.id && !o.dead) alive++;
        for (let i = 0; i < mv.n && alive < mv.max; i++, alive++) {
          const a = U.rand(0, 6.28);
          const spot = W.free(e.x + Math.cos(a) * 2.2, e.y + Math.sin(a) * 2.2, 3);
          if (!spot) continue;
          const add = game.createMonster(mv.mon, spot.x, spot.y, Math.max(1, e.level - 2), 'normal');
          add.bossAdd = e.id; add.noLoot = true; add.xp = Math.round(add.xp * 0.3);
          add.ai.st = 'chase'; add.ai.atk = 1;
          ents.push(add);
          U.fx('smoke', spot.x, spot.y, { color: COL.shadow });
        }
        U.sfx('cast');
        break;
      }
    }
    return false;
  }

  const MARK_PROJ = { shape: 'orb', color: '#ff5050', speed: 16 };
  // Phase changes run every frame for a boss (also while a special mechanic has the floor), before anything else it does.
  function bossPhase(e, def) {
    const ai = e.ai;
    const frac = e.hp / e.stats.hpMax;
    while (ai.phase + 1 < def.phases.length && frac <= def.phases[ai.phase + 1].at) {
      const ph = def.phases[++ai.phase];
      if (ph.say) U.toast(ph.say, '#ff9a6a');
      if (ph.enrage && !ai.enraged) {
        ai.enraged = true;
        e.speed *= 1.25; e.atkCd *= 0.75;
        U.fx('nova', e.x, e.y, { radius: 4, color: '#ff3b4e' }); U.shake(5, 0.4);
      }
      let i = 0;
      for (const mv of ph.moves) ai.mcd[mv.id] = mv.first !== undefined ? mv.first : 1.5 + 2 * i++;
      ai.gcd = Math.min(ai.gcd, 0.6);
    }
  }
  // Returns true while the boss is busy with a telegraphed move.
  function bossThink(e, def, t, d, dt) {
    const ai = e.ai;
    // R5.5: a target planted at range gets its spot marked (red ring) and a fast volley fired at it 0.8 s later — casters
    // must keep moving; melee range never triggers it
    ai.markCd = (ai.markCd === undefined ? 3 : ai.markCd) - dt;
    if (ai.mark && (ai.mark.t -= dt) <= 0) {         // the marked spot: a fast, tight volley lands on it
      const mk = ai.mark;
      ai.mark = null;
      bossShots(e, { proj: MARK_PROJ, mult: 1.3, dtype: def.dtype || 'phys' }, Math.atan2(mk.y - e.y, mk.x - e.x), 3, 0.06);
    }
    if (ai.markCd <= 0 && !ai.mark && t.type === 'player' && d >= 5 && d < 12 && (game.stillT || 0) >= 0.8) {
      ai.markCd = 3;
      ai.mark = { t: 0.8, x: t.x, y: t.y };
      U.fx('ring', t.x, t.y, { radius: 0.8, color: '#ff5050', duration: 0.8 });
    }
    if (ai.cast) {
      ai.cast.t -= dt;
      if (ai.cast.t <= 0) {
        const c = ai.cast;
        ai.cast = null;
        if (!finishMove(e, def, c, t)) ai.gcd = ai.enraged ? 1.0 : 1.5;
      }
      return true;
    }
    const rate = d > 5 ? 2 : 1;            // a target kiting at range gets the abilities sooner: everyone has to dodge
    for (const id in ai.mcd) ai.mcd[id] -= dt * rate;
    ai.gcd -= dt * rate;
    if (ai.gcd > 0 || ai.wind > 0 || d > 11) return false;
    for (let pi = ai.phase; pi >= 0; pi--) {
      const moves = def.phases[pi].moves;
      for (let k = 0; k < moves.length; k++) {
        const mv = moves[k];
        if (ai.mcd[mv.id] > 0 || (mv.minRange && d < mv.minRange)) continue;
        startMove(e, def, mv, t);
        return true;
      }
    }
    return false;
  }

  function pickEnemyTarget(e, p, def) {
    const al = game.live.allies;
    // R5.5: shooters pick whoever stands furthest back within their reach (a taunting golem close by still wins), so a
    // summoner hiding behind a wall of skeletons is the one being shot at
    if (def && def.atk !== 'melee' && e.rarity !== 'boss' && al.length) {
      const reach = (def.range || 6) + 3;
      let far = null, fd = -1;
      if (!p.dead) { const d = Math.hypot(p.x - e.x, p.y - e.y); if (d <= reach) { far = p; fd = d; } }
      for (let i = 0; i < al.length; i++) {
        const a = al[i];
        if (a.dead) continue;
        const d = Math.hypot(a.x - e.x, a.y - e.y);
        if ((M[a.monsterId].taunt || a.tauntT > G.state.time) && d < 5) return a;
        if (d <= reach && d > fd + 0.5) { fd = d; far = a; }
      }
      if (far) return far;
    }
    // nearest of the player and their minions; a taunting golem counts as much closer than it is
    let best = p.dead ? null : p, bd = best ? Math.hypot(p.x - e.x, p.y - e.y) : 1e9;
    for (let i = 0; i < al.length; i++) {
      const a = al[i];
      if (a.dead) continue;
      let d = Math.hypot(a.x - e.x, a.y - e.y);
      const taunt = M[a.monsterId].taunt || a.tauntT > G.state.time;      // golem, or a Grave Swap minion for 2 s
      if (e.rarity === 'boss' || e.bossAdd) { if (!taunt && best) continue; }      // bosses and their adds hunt the player; only a golem can pull them off
      else if (taunt) d *= 0.4;
      if (d < bd - 0.5) { bd = d; best = a; }
    }
    return best;
  }

  function thinkEnemy(e, dt, p) {
    const ai = e.ai, def = M[e.monsterId];
    if (e.effects.length) { game.tickEffects(e, dt); if (e.dead) return; }
    if (ai.al > 0) ai.al -= dt;
    if (e.echo && game.thinkEcho) { game.thinkEcho(e, dt, p); return; }          // R6.2: the Echo fights like the player
    if (ai.st === 'sleep') {
      ai.t -= dt;
      if (ai.t > 0) return;
      ai.t = 0.25 + U.rng.next() * 0.1;
      if (p.dead) return;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < e.aggro && (d < 2.5 || (W.visible(e.x, e.y) && W.los(e.x, e.y, p.x, p.y)))) { wake(e, true); return; }
      const al = game.live.allies;
      for (let i = 0; i < al.length; i++) if (Math.abs(al[i].x - e.x) < 4 && Math.abs(al[i].y - e.y) < 4) { wake(e, true); return; }
      return;
    }
    if (e.regen && e.hp < e.stats.hpMax) e.hp = Math.min(e.stats.hpMax, e.hp + e.stats.hpMax * e.regen / 100 * dt);
    if (game.isStunned(e)) { relax(e, 'idle'); return; }
    const sm = game.speedMult(e);

    ai.tt -= dt;
    let t = ai.tgt ? game.byId(ai.tgt) : p;
    if (ai.tt <= 0 || !t || t.dead) {
      ai.tt = 0.5;
      t = pickEnemyTarget(e, p, def);
      ai.tgt = t && t !== p ? t.id : 0;
    }
    if (!t) { ai.st = 'sleep'; ai.wind = 0; ai.cast = null; relax(e, 'idle'); return; }
    const d = Math.hypot(t.x - e.x, t.y - e.y);
    if (d > LEASH && e.rarity !== 'boss' && !e.lockdown && !e.fallen && !e.noLeash) { ai.st = 'sleep'; ai.wind = 0; ai.path = null; relax(e, 'idle'); return; }   // leash: give up

    if (ai.wind > 0) {
      ai.wind -= dt * sm;
      if (ai.wind <= 0) resolveAttack(e, def, t);
      return;
    }
    ai.atk -= dt * sm;
    if (ai.blinkT > 0) {
      ai.blinkT -= dt;
      if (ai.blinkT <= 0) { ai.blinkT = def.blink || 6; if (d > 3 && d < 11) blinkNear(e, t); }
    }
    if (ai.shieldT > 0) {
      ai.shieldT -= dt;
      if (ai.shieldT <= 0) {
        ai.shieldT = 9;
        game.addEffect(e, { id: 'invuln', t: 2.5 });
        U.fx('ring', e.x, e.y, { radius: e.radius + 0.5, color: '#d8f4ff', duration: 2.5 });
      }
    }
    if (e.affixes.length || e.frenzyAt > 0) { game.runModifiers(e, t, d, dt); if (e.dead) return; }
    if (def.boss) bossPhase(e, def);
    if (def.special && game.SPECIAL[def.special] && game.SPECIAL[def.special](e, def, t, d, dt, p)) return;      // R7: act bosses, the Fallen, event monsters
    if (e.rarity === 'legendary' && !e.seen && W.visible(e.x, e.y)) {      // R3.6: announce a legendary the first time it is seen
      e.seen = true;
      U.toast(e.name + ' — ' + e.affixes.join(', '), '#ff8a2b');
      U.sfx('shrine'); U.shake(3, 0.3);
      U.fx('ring', e.x, e.y, { radius: 2.5, color: '#ff8a2b', duration: 0.8 });
    }
    if (def.boss) {
      // a golem can hold the boss's swings, never its abilities: those always go for the player when in reach
      const bt = t !== p && !p.dead && Math.abs(p.x - e.x) < 12 && Math.abs(p.y - e.y) < 12 ? p : t;
      if (bossThink(e, def, bt, bt === t ? d : Math.hypot(bt.x - e.x, bt.y - e.y), dt)) return;
    }
    const tm = game.terrain(e, ai, dt);
    if (!e.dead) engage(e, def, t, dt, sm * tm, game.live.foes);
  }

  function thinkMinion(e, dt, p) {
    const ai = e.ai, def = M[e.monsterId];
    if (e.effects.length) { game.tickEffects(e, dt); if (e.dead) return; }
    if (ai.al > 0) ai.al -= dt;
    if (game.isStunned(e)) { relax(e, 'idle'); return; }
    const sm = game.speedMult(e);
    const dp = Math.hypot(p.x - e.x, p.y - e.y);
    if (dp > 12) {            // fell behind: catch up instantly
      const spot = W.free(p.x + U.rand(-1.2, 1.2), p.y + U.rand(-1.2, 1.2), 3);
      if (spot) { e.x = spot.x; e.y = spot.y; ai.path = null; ai.tgt = 0; U.fx('smoke', e.x, e.y, {}); }
      return;
    }
    if (ai.wind > 0) {
      ai.wind -= dt * sm;
      if (ai.wind <= 0) resolveAttack(e, def, game.byId(ai.tgt));
      return;
    }
    ai.atk -= dt * sm;
    ai.tt -= dt;
    let t = ai.tgt ? game.byId(ai.tgt) : null;
    if (ai.tt <= 0 || (t && t.dead)) {
      ai.tt = 0.4;
      t = null;
      let bd = 8.5;
      const foes = game.live.foes;
      for (let i = 0; i < foes.length; i++) {
        const f = foes[i];
        if (f.dead || Math.hypot(f.x - p.x, f.y - p.y) > 10) continue;
        if (f.ai.st === 'sleep' && !W.visible(f.x, f.y)) continue;      // do not drag unseen packs into the fight
        const d = Math.hypot(f.x - e.x, f.y - e.y);
        if (d < bd) { bd = d; t = f; }
      }
      ai.tgt = t ? t.id : 0;
    }
    const tm = game.terrain(e, ai, dt);
    if (e.dead) return;
    if (t && !t.dead) { engage(e, def, t, dt, sm * tm, game.live.allies); return; }
    if (dp > 2.2) moveToward(e, p.x, p.y, dt, sm * tm * 1.15, game.live.allies);
    else relax(e, 'idle');
  }

  // Called first every frame: rebuilds game.live, removes spent corpses, runs AI for everything near the player.
  game.updateMonsters = function (dt) {
    const S = G.state, p = S.player, ents = S.entities;
    const foes = game.live.foes, allies = game.live.allies;
    foes.length = 0; allies.length = 0;
    pathBudget = 3;
    if (p && dt > 0) {            // smoothed player velocity, for bosses that lead their shots
      pVel.x = pVel.x * 0.8 + (p.x - pVel.lx) / dt * 0.2; pVel.y = pVel.y * 0.8 + (p.y - pVel.ly) / dt * 0.2;
      if (Math.abs(p.x - pVel.lx) > 2 || Math.abs(p.y - pVel.ly) > 2) { pVel.x = 0; pVel.y = 0; }      // teleports and floor changes
      pVel.lx = p.x; pVel.ly = p.y;
    }
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (e.type !== 'monster') { e.animT += dt; continue; }
      if (e.dead) {
        e.animT += dt;
        e.ai.corpse -= dt;
        if (e.ai.corpse <= 0) ents.splice(i, 1);
        continue;
      }
      if (e.faction === 'player') { allies.push(e); continue; }
      const dx = e.x - p.x, dy = e.y - p.y;
      if (dx * dx + dy * dy > ACTIVE_R2) {
        if (e.ai.st !== 'sleep') { e.ai.st = 'sleep'; e.ai.wind = 0; e.ai.cast = null; e.ai.path = null; setAnim(e, 'idle'); }
        continue;
      }
      foes.push(e);
    }
    for (let i = 0; i < foes.length; i++) {
      const e = foes[i];
      e.animT += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (!e.dead) thinkEnemy(e, dt, p);
    }
    for (let i = 0; i < allies.length; i++) {
      const e = allies[i];
      e.animT += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (!e.dead && !p.dead) thinkMinion(e, dt, p);
    }
  };
})();
