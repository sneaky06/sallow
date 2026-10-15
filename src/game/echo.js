// R6.2 Your Echo — the player's fighting style (player.style), the abandoned corpse rising as a hostile copy of the player,
// its AI (picks actions in the player's own proportions, telegraphed so it can be beaten) and its reward.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS;

  // ------------------------------ player.style ------------------------------
  // player.style = { attack, dash, potion, [skillId]: decaying use counts, hpAt: life fraction at which potions are drunk
  // (moving average), open: { action: decaying count of fight openers } }. Every new tally decays the old ones by 1%, so the
  // record follows the current build within a few hundred actions.
  const DECAY = 0.99, OPEN_GAP = 5;
  let lastAct = -99;
  game.noteStyle = function (kind, hpFrac) {
    const p = G.state.player;
    if (!p || !kind) return;
    const s = p.style || (p.style = { hpAt: 0.45, open: {} });
    if (!s.open || typeof s.open !== 'object') s.open = {};
    for (const k in s) if (k !== 'hpAt' && typeof s[k] === 'number') s[k] *= DECAY;
    s[kind] = (s[kind] || 0) + 1;
    if (kind === 'potion') {
      if (hpFrac >= 0 && hpFrac <= 1) s.hpAt = (typeof s.hpAt === 'number' ? s.hpAt : 0.45) * 0.8 + hpFrac * 0.2;
      return;
    }
    const now = G.state.time;
    if (now - lastAct > OPEN_GAP) {
      for (const k in s.open) s.open[k] *= 0.9;
      s.open[kind] = (s.open[kind] || 0) + 1;
    }
    lastAct = now;
  };
  G.on('scene:changed', function () { lastAct = -99; });

  // { shares: { action: fraction of actions }, hpAt, opener } — for the Echo and for anyone curious (UI banner).
  game.getStyle = function (style) {
    const s = style || (G.state.player && G.state.player.style) || {};
    let tot = 0;
    const shares = {};
    for (const k in s) if (k !== 'hpAt' && k !== 'potion' && typeof s[k] === 'number') tot += s[k];
    for (const k in s) if (k !== 'hpAt' && k !== 'potion' && typeof s[k] === 'number' && tot > 0) shares[k] = s[k] / tot;
    let opener = null, ob = 0;
    if (s.open) for (const k in s.open) if (s.open[k] > ob) { ob = s.open[k]; opener = k; }
    return { shares: shares, hpAt: typeof s.hpAt === 'number' ? s.hpAt : 0.45, opener: opener, potions: s.potion || 0 };
  };

  // ------------------------------ the abandoned corpse becomes an Echo ------------------------------
  // Core's respawn() abandons an unclaimed corpse (flags.corpse is replaced or cleared). The corpse that was there when the
  // player died is remembered; if revivePlayer() finds it gone, it becomes state.flags.echo = { depth, seed, x, y, gold, items,
  // snap }. One Echo at a time: while one waits, further abandoned corpses are simply lost.
  let pending = null;
  G.on('player:died', function () { pending = (G.state.flags && G.state.flags.corpse) || null; });

  function snapshot(p) {
    const st = p.stats;
    return { name: p.name, classId: p.classId, level: p.level, sprite: Object.assign({}, p.sprite),
      equipment: JSON.parse(JSON.stringify(p.equipment || {})), skills: Object.assign({}, p.skills), bar: p.skillBar.slice(),
      hpMax: st.hpMax, armor: st.armor, dodge: st.dodge, block: st.block, moveSpeed: st.moveSpeed,
      res: { fire: st.resFire, cold: st.resCold, lightning: st.resLightning, poison: st.resPoison },
      ranged: p.bonus && p.bonus.w ? p.bonus.w.ranged : 0, wtype: p.bonus && p.bonus.w ? p.bonus.w.type : 'none',
      style: JSON.parse(JSON.stringify(p.style || {})) };
  }

  // R8.2: every dungeon death leaves a corpse with the bag (core). The new corpse carries a snapshot of you (`corpse.echo`);
  // on returning to that depth your Echo rises at the corpse and guards it until it is killed (`corpse.echoSlain`).
  // (An old save's `flags.echo` — the R6 abandoned-corpse Echo — still spawns as before.)
  game.onRevive = function () {
    const f = G.state.flags, p = G.state.player, old = pending;
    pending = null;
    if (!f || !p || !f.corpse || f.corpse === old || f.corpse.echo) return;
    f.corpse.echo = snapshot(p);
    f.corpse.echoSlain = false;
  };

  // ------------------------------ the Echo's moves ------------------------------
  // Every skill becomes a telegraphed version of itself. kind: strike (melee) · cleave (arc) · shot (projectile) · beam
  // (channel on the player) · zone (circle at the player) · leap · nova (around itself) · spin · buff · summon · trap · blink.
  const KIT = {
    bash: ['strike', { st: ['stun', 30, 0.8] }], rend: ['strike', { st: ['bleed', 100, 4, 0.3] }], execute: ['strike', { mult: 1.4 }],
    charge: ['strike', { rush: true }], cleave: ['cleave'], whirlwind: ['spin'], leap: ['leap'], earthquake: ['nova', { r: 3.6, ticks: 3 }],
    battle_shout: ['buff', { dealt: 25 }], shield_wall: ['buff', { taken: -40 }], war_cry: ['nova', { r: 4, st: ['stun', 100, 0.8], mult: 0.4 }],
    aimed_shot: ['shot'], piercing_shot: ['shot', { speed: 16 }], poison_arrow: ['shot', { dt: 'poison', st: ['poison', 100, 4, 0.3] }],
    snipe: ['shot', { speed: 20, tele: 0.9 }], multishot: ['shot', { n: 3 }], rain_of_arrows: ['zone', { r: 2.6, ticks: 4 }],
    explosive_arrow: ['shot', { dt: 'fire', explode: 2 }], arrow_storm: ['ring', { n: 10 }], spike_trap: ['trap'],
    frost_trap: ['trap', { dt: 'cold', st: ['chill', 100, 3] }], camouflage: ['buff', { dealt: 20, dodge: 30 }],
    fire_bolt: ['shot', { dt: 'fire', shape: 'fireball' }], fireball: ['shot', { dt: 'fire', shape: 'fireball', explode: 2 }],
    incinerate: ['beam', { dt: 'fire' }], meteor: ['zone', { r: 2.6, dt: 'fire', tele: 1.1 }], ice_shard: ['shot', { dt: 'cold', shape: 'shard', st: ['chill', 100, 2] }],
    frost_nova: ['nova', { r: 3.4, dt: 'cold', st: ['chill', 100, 3] }], blizzard: ['zone', { r: 3, dt: 'cold', ticks: 6, st: ['chill', 100, 1.5] }],
    glacial_spike: ['shot', { dt: 'cold', shape: 'shard', st: ['chill', 100, 3] }], chain_lightning: ['beam', { dt: 'lightning', ticks: 1 }],
    teleport: ['blink'], mana_shield: ['buff', { taken: -35 }], thunderstorm: ['zone', { r: 1.4, dt: 'lightning', tele: 0.7 }],
    raise_skeleton: ['summon', { mon: 'minion_skeleton', n: 2 }], skeletal_mage: ['summon', { mon: 'minion_mage', n: 1 }], golem: ['summon', { mon: 'minion_golem', n: 1 }],
    corpse_explosion: ['zone', { r: 2.4, dt: 'fire', tele: 0.8 }], bone_spear: ['shot', { shape: 'shard', speed: 14 }], bone_armor: ['buff', { absorb: 0.15 }],
    bone_nova: ['ring', { n: 8 }], life_drain: ['beam', { heal: 0.5 }], bone_spirit: ['shot', { homing: true, speed: 7, shape: 'orb', color: COL.shadow }],
    amplify_damage: ['curse', { taken: 15 }], decrepify: ['curse', { slow: 0.3 }], poison_nova: ['nova', { r: 4.2, dt: 'poison', st: ['poison', 100, 5, 0.3], mult: 0.6 }],
    lich_form: ['buff', { dealt: 30 }],
  };
  const TELE = { strike: 0.35, cleave: 0.45, shot: 0.45, beam: 0.5, zone: 0.9, leap: 0.7, nova: 0.6, spin: 0.35, buff: 0.25, summon: 0.6, trap: 0.3, blink: 0.2, ring: 0.5, curse: 0.6, attack: 0.3 };
  const ECHO_COL = '#bfe6ff';

  function buildKit(snap) {
    const moves = [], shares = game.getStyle(snap.style).shares;
    moves.push({ id: 'attack', kind: 'attack', name: 'Attack', w: Math.max(0.08, shares.attack || 0.3), cd: 0, mult: 1, o: {} });
    for (const id of snap.bar || []) {
      const sk = id && game.SKILLS[id], k = KIT[id];
      if (!sk || !k || !(snap.skills[id] > 0)) continue;
      const rank = snap.skills[id], V = game.applySynergies({ skills: snap.skills }, sk, game.skillValues(sk, rank));
      const o = k[1] || {};
      moves.push({ id: id, kind: k[0], name: sk.name, o: o, w: shares[id] || 0.04, cd: Math.max(1.6, (sk.cd[0] + sk.cd[1] * (rank - 1)) * 1.25),
        mult: U.clamp((V.dmg || 150) / 150, 0.5, 2.4) * (o.mult || 1), color: sk.icon.color });
    }
    return moves;
  }

  // ------------------------------ spawning ------------------------------
  const M = game.MONSTERS;
  M.echo = { id: 'echo', n: 'Echo', arch: 'melee', theme: 'echo', hp: 20, dmg: [2, 4], spd: 3.2, cd: 1, wind: 0.3, aggro: 8, xp: 30, armor: 0, r: 0.32, atk: 'melee',
    sprite: { body: 'humanoid', color: '#9fb4c8', accent: ECHO_COL, scale: 1, weapon: 'sword' }, desc: 'You, as the dark remembers you.' };

  function placeEcho(map, ec) {
    if (map.seed === ec.seed) { const s = W.free(ec.x, ec.y, 4); if (s) return s; }
    let best = null, bd = -1;
    for (const r of map.rooms || []) {
      if (r.type === 'boss' || r.type === 'lockdown' || r.type === 'start') continue;
      const cx = r.x + (r.w >> 1) + 0.5, cy = r.y + (r.h >> 1) + 0.5, d = Math.hypot(cx - map.spawn.x, cy - map.spawn.y);
      if (d > 12 && d < 40 && d > bd && W.walkable(cx, cy)) { bd = d; best = { x: cx, y: cy }; }
    }
    return best || W.free(map.spawn.x + 10, map.spawn.y, 8);
  }

  game.createEcho = function (ec, x, y, depth) {
    const s = ec.snap, L = game.monsterLevel(depth) + 2;
    const e = game.createMonster('echo', x, y, L, 'normal', null, true);
    const legHp = M.skeleton.hp * game.hpScale(L) * 6;
    e.name = 'Echo of ' + s.name; e.echo = true; e.ghost = true; e.rarity = 'legendary'; e.affixes = [];
    e.classId = s.classId; e.equipment = s.equipment; e.sprite = Object.assign({}, s.sprite, { scale: 1 });
    e.stats.hpMax = e.hp = Math.round(Math.max(2.5 * s.hpMax, legHp * 0.9));
    e.stats.armor = s.armor | 0; e.stats.dodge = Math.min(25, s.dodge || 0); e.stats.block = Math.min(25, s.block || 0);
    e.stats.resFire = s.res.fire | 0; e.stats.resCold = s.res.cold | 0; e.stats.resLightning = s.res.lightning | 0; e.stats.resPoison = s.res.poison | 0;
    const swing = 3 * game.dmgScale(L) * 1.45 * 0.8;          // a legendary monster's swing at this depth, ×0.8
    e.dmgMin = swing * 0.85; e.dmgMax = swing * 1.15;
    e.speed = (game.BASE_SPEED || 5) * (1 + (s.moveSpeed || 0) / 100) * 0.8;
    e.xp = Math.round(e.xp * 6); e.noLoot = true; e.radius = 0.32;
    const st = game.getStyle(s.style);
    e.kit = { moves: buildKit(s), ranged: !!s.ranged, opener: st.opener, hpAt: U.clamp(st.hpAt, 0.2, 0.6), pots: Math.min(3, Math.max(1, Math.round(st.potions / 4))),
      dash: (st.shares.dash || 0) > 0.03, charges: (game.CLASSES[s.classId] && game.CLASSES[s.classId].action && game.CLASSES[s.classId].action.charges) || 1 };
    e.kit.dashN = e.kit.charges;
    e.anim = 'die'; e.animT = 99;          // lies where it fell until you come close
    return e;
  };

  G.on('scene:changed', function (ev) {
    const S = G.state, f = S.flags, ec = f && f.echo, map = ev && ev.map;
    const c = f && f.corpse;
    if (c && c.echo && !c.echoSlain && map && ev.scene === 'dungeon' && (map.depth | 0) === c.depth) {          // R8.2: it guards the corpse
      const at = W.free(c.x, c.y, 3);
      if (at) {
        const e = game.createEcho({ snap: c.echo }, at.x, at.y, c.depth);
        e.guardCorpse = true; e.home = { x: at.x, y: at.y };
        S.entities.push(e);
      }
      return;
    }
    if (!ec || !map || ev.scene !== 'dungeon' || (map.depth | 0) !== ec.depth || !ec.snap) return;
    const at = placeEcho(map, ec);
    if (!at) return;
    S.entities.push(game.createEcho(ec, at.x, at.y, ec.depth));
  });

  // ------------------------------ AI ------------------------------
  function setAnim(e, a) { if (e.anim !== a) { e.anim = a; e.animT = 0; } }
  function dmgOf(e, mult) {
    let a = U.rand(e.dmgMin, e.dmgMax) * mult;
    for (const f of e.effects) if (f.dealt) a *= Math.max(0.1, 1 + f.dealt / 100);
    return a;
  }
  function zone(e, x, y, r, delay, mult, o, extra) {
    const dt = o.dt || 'phys';
    return game.addZone(Object.assign({ x: x, y: y, r: r, delay: delay, faction: 'enemy', dmg: dmgOf(e, mult), dtype: dt, st: o.st || null, lvl: e.level, srcId: e.id,
      fx: dt === 'cold' ? 'frost' : dt === 'poison' ? 'poison' : 'explosion', color: dt === 'phys' ? ECHO_COL : COL[dt] }, extra || {}));
  }
  function shoot(e, ang, mult, o, p) {
    const speed = o.speed || 12;
    game.spawnProjectile({ x: e.x + Math.cos(ang) * 0.3, y: e.y + Math.sin(ang) * 0.3, ang: ang, speed: speed, shape: o.shape || (e.kit.ranged ? 'arrow' : 'bolt'),
      color: o.color || ECHO_COL, radius: 0.24, faction: 'enemy', dmg: dmgOf(e, mult), dtype: o.dt || 'phys', st: o.st || null, srcId: e.id, lvl: e.level,
      explode: o.explode || 0, homing: o.homing ? p.id : 0, life: (o.homing ? 24 : 11) / speed });
  }
  function moveBy(e, tx, ty, dt, away) {
    const ai = e.ai;
    let gx = tx, gy = ty;
    if (!away) {
      ai.losT = (ai.losT || 0) - dt;
      if (ai.losT <= 0) { ai.losT = 0.3; ai.los = W.los(e.x, e.y, tx, ty); if (!ai.los) { ai.path = W.path(e.x, e.y, tx, ty, 700); ai.pi = 1; } }
      if (!ai.los && ai.path && ai.pi < ai.path.length) {
        const n = ai.path[ai.pi];
        if (Math.hypot(n.x - e.x, n.y - e.y) < 0.3) ai.pi++;
        else { gx = n.x; gy = n.y; }
      }
    }
    let dx = gx - e.x, dy = gy - e.y;
    const d = Math.hypot(dx, dy) || 1, k = e.speed * game.speedMult(e) * game.terrain(e, ai, dt) * dt / d * (away ? -1 : 1);
    W.move(e, dx * k, dy * k);
    e.facing = Math.atan2(dy * (away ? -1 : 1), dx * (away ? -1 : 1));
    setAnim(e, 'walk');
  }
  function reach(mv, kit) {
    switch (mv.kind) {
      case 'attack': return kit.ranged ? 7 : 1.1;
      case 'strike': return mv.o.rush ? 7 : 1.1;
      case 'cleave': case 'spin': return 1.6;
      case 'nova': return (mv.o.r || 3) - 0.4;
      case 'buff': case 'summon': case 'trap': case 'blink': return 99;
      case 'leap': return 6.5;
      default: return 8;
    }
  }

  function dash(e, p, toward) {
    const k = e.kit;
    if (!(k.dashN > 0)) return false;
    k.dashN--; k.dashT = k.dashT > 0 ? k.dashT : 4.5;
    const a = Math.atan2(p.y - e.y, p.x - e.x) + (toward ? 0 : Math.PI) + U.rand(-0.6, 0.6);
    U.fx('smoke', e.x, e.y, { color: ECHO_COL });
    for (let i = 0; i < 15; i++) if (!W.move(e, Math.cos(a) * 0.2, Math.sin(a) * 0.2)) break;
    U.fx('smoke', e.x, e.y, { color: ECHO_COL });
    game.addEffect(e, { id: 'invuln', t: 0.25 });
    e.ai.path = null; e.ai.losT = 0;
    if (toward && game.CLASSES[e.classId] && game.CLASSES[e.classId].action && game.CLASSES[e.classId].action.kind === 'charge' && Math.hypot(p.x - e.x, p.y - e.y) < 1.4) {
      game.monsterHit(e, p, { mult: 0.6, melee: true });
    }
    return true;
  }

  function startMove(e, mv, p) {
    const ai = e.ai;
    ai.mcd[mv.id] = mv.cd;
    ai.gcd = mv.kind === 'attack' ? 0.75 : 1.05;
    const tele = (mv.o.tele || TELE[mv.kind] || 0.4);
    ai.cast = { mv: mv, t: tele, x: p.x, y: p.y };
    ai.al = tele;
    e.facing = Math.atan2(p.y - e.y, p.x - e.x);
    setAnim(e, mv.kind === 'attack' && !e.kit.ranged || mv.kind === 'strike' || mv.kind === 'cleave' ? 'attack' : 'cast');
    if (mv.kind !== 'attack') U.text(e.x, e.y - 1.5, mv.name, ECHO_COL, true);
    switch (mv.kind) {
      case 'zone': zone(e, p.x, p.y, mv.o.r || 2.5, tele, mv.mult * (mv.o.ticks ? 0.55 : 1.4), mv.o, mv.o.ticks ? { t: mv.o.ticks * 0.5, every: 0.5 } : null); ai.cast.done = true; break;
      case 'nova': U.fx('ring', e.x, e.y, { radius: mv.o.r || 3, color: mv.o.dt ? COL[mv.o.dt] : ECHO_COL, duration: tele }); break;
      case 'leap': U.fx('ring', p.x, p.y, { radius: 2.2, color: ECHO_COL, duration: tele }); break;
      case 'cleave': case 'spin': U.fx('ring', e.x, e.y, { radius: 1.8, color: ECHO_COL, duration: tele }); break;
      case 'trap': zone(e, e.x, e.y, 1.8, 0, mv.mult * 1.3, mv.o, { t: 30, trap: true, glyph: true, pulse: 0 }); ai.cast.done = true; break;
    }
  }

  function finishMove(e, c, p) {
    const mv = c.mv, o = mv.o, ai = e.ai;
    const ang = Math.atan2(p.y - e.y, p.x - e.x), d = Math.hypot(p.x - e.x, p.y - e.y);
    if (c.done) return;
    switch (mv.kind) {
      case 'attack':
        if (e.kit.ranged) { shoot(e, ang, 1, {}, p); U.sfx('arrow'); }
        else if (d <= e.radius + p.radius + 1.0) { U.fx('slash', (e.x + p.x) / 2, (e.y + p.y) / 2, { angle: ang, radius: 0.8, color: ECHO_COL }); game.monsterHit(e, p, { melee: true }); }
        break;
      case 'strike':
        if (o.rush && d > 1.2) { for (let i = 0; i < 40 && Math.hypot(p.x - e.x, p.y - e.y) > 1.1; i++) if (!W.move(e, Math.cos(ang) * 0.2, Math.sin(ang) * 0.2)) break; U.fx('smoke', e.x, e.y, {}); }
        if (Math.hypot(p.x - e.x, p.y - e.y) <= e.radius + p.radius + 1.0) { U.fx('slash', p.x, p.y, { angle: ang, radius: 1, color: ECHO_COL }); game.monsterHit(e, p, { mult: mv.mult * 1.2, melee: true, st: o.st }); }
        U.sfx('swing');
        break;
      case 'cleave':
      case 'spin':
        U.fx('slash', e.x, e.y, { angle: ang, radius: 1.9, color: ECHO_COL }); U.sfx('swing');
        if (d <= 1.9 + p.radius) game.monsterHit(e, p, { mult: mv.mult * (mv.kind === 'spin' ? 0.7 : 1), melee: true });
        if (mv.kind === 'spin' && !(c.n >= 3)) { ai.cast = { mv: mv, t: 0.3, x: 0, y: 0, n: (c.n || 0) + 1 }; ai.spin = true; }
        break;
      case 'shot': {
        const n = o.n || 1;
        for (let i = 0; i < n; i++) shoot(e, ang + (i - (n - 1) / 2) * 0.17, mv.mult * (n > 1 ? 0.75 : 1.2), o, p);
        U.sfx(o.dt === 'fire' ? 'fire' : o.dt === 'cold' ? 'ice' : 'arrow');
        break;
      }
      case 'ring':
        for (let i = 0; i < (o.n || 8); i++) shoot(e, ang + i / (o.n || 8) * Math.PI * 2, mv.mult * 0.7, { shape: 'shard', speed: 10 }, p);
        U.sfx('cast');
        break;
      case 'beam':
        if (d < 9 && W.shotClear(e.x, e.y, p.x, p.y)) {
          U.fx('spark', (e.x + p.x) / 2, (e.y + p.y) / 2, { color: o.dt ? COL[o.dt] : COL.shadow }); U.fx('spark', p.x, p.y, { color: o.dt ? COL[o.dt] : COL.shadow });
          const parts = {}; parts[o.dt || 'phys'] = dmgOf(e, mv.mult * 0.9);
          const got = game.applyHit(p, parts, { src: e, lvl: e.level });
          if (o.heal && got > 0) game.heal(e, got * o.heal * 3);
          U.sfx(o.dt === 'lightning' ? 'bolt' : 'cast');
        }
        if ((o.ticks || 3) > (c.n || 1)) ai.cast = { mv: mv, t: 0.25, x: 0, y: 0, n: (c.n || 1) + 1 };
        break;
      case 'nova':
        zone(e, e.x, e.y, o.r || 3, 0.01, mv.mult * 1.2, o, o.ticks ? { t: o.ticks * 0.45, every: 0.45 } : null);
        break;
      case 'leap': {
        const spot = W.free(c.x, c.y, 2);
        if (spot) { U.fx('smoke', e.x, e.y, {}); e.x = spot.x; e.y = spot.y; e.ai.path = null; }
        zone(e, e.x, e.y, 2.2, 0.01, mv.mult * 1.3, { st: ['slow', 100, 2, 0.4] }); U.shake(3, 0.2);
        break;
      }
      case 'buff':
        game.addEffect(e, { id: 'echo_' + mv.id, t: 6, dealt: o.dealt || 0, taken: o.taken || 0, mods: o.dodge ? { dodge: o.dodge } : null });
        if (o.absorb) game.addEffect(e, { id: 'echo_absorb', t: 10, absorb: Math.round(e.stats.hpMax * o.absorb) });
        U.fx('ring', e.x, e.y, { radius: 1.2, color: mv.color || ECHO_COL, duration: 0.5 }); U.sfx('cast');
        break;
      case 'curse':
        if (d < 9) {
          if (o.taken) game.addEffect(p, { id: 'echo_curse', t: 6, taken: o.taken });
          if (o.slow) game.addEffect(p, { id: 'echo_decrepify', t: 4, slow: o.slow });
          U.fx('ring', p.x, p.y, { radius: 1.2, color: '#d03a3a', duration: 0.5 }); U.sfx('cast');
        }
        break;
      case 'summon': {
        let alive = 0;
        for (const o2 of G.state.entities) if (o2.bossAdd === e.id && !o2.dead) alive++;
        for (let i = 0; i < (o.n || 1) && alive < 4; i++, alive++) {
          const a = U.rand(0, 6.28), spot = W.free(e.x + Math.cos(a) * 1.5, e.y + Math.sin(a) * 1.5, 3);
          if (!spot) continue;
          const m = game.createMonster(o.mon, spot.x, spot.y, Math.max(1, e.level - 2), 'normal');
          m.bossAdd = e.id; m.noLoot = true; m.xp = 0; m.ai.st = 'chase'; m.ai.atk = 1; m.sprite.accent = ECHO_COL; m.name = 'Echo ' + m.name;
          G.state.entities.push(m);
          U.fx('smoke', spot.x, spot.y, { color: ECHO_COL });
        }
        U.sfx('cast');
        break;
      }
      case 'blink': {
        const a = U.rand(0, 6.28), spot = W.free(p.x + Math.cos(a) * (e.kit.ranged ? 5 : 1.5), p.y + Math.sin(a) * (e.kit.ranged ? 5 : 1.5), 2);
        if (spot) { U.fx('teleport', e.x, e.y, { color: ECHO_COL }); e.x = spot.x; e.y = spot.y; e.ai.path = null; U.fx('teleport', e.x, e.y, { color: ECHO_COL }); }
        break;
      }
    }
  }

  function pickMove(e, p, d) {
    const ai = e.ai, k = e.kit;
    if (!ai.opened && k.opener) {            // it opens a fight the way you do
      ai.opened = true;
      for (const mv of k.moves) if (mv.id === k.opener && !(ai.mcd[mv.id] > 0)) return mv;
    }
    ai.opened = true;
    let tot = 0;
    for (const mv of k.moves) if (!(ai.mcd[mv.id] > 0)) tot += mv.w;
    let r = U.rng.next() * tot;
    for (const mv of k.moves) {
      if (ai.mcd[mv.id] > 0) continue;
      if ((r -= mv.w) <= 0) return mv;
    }
    return k.moves[0];
  }

  game.thinkEcho = function (e, dt, p) {
    const ai = e.ai, k = e.kit;
    if (!k) return;
    if (ai.st === 'sleep' && ai.risen) ai.st = 'chase';          // the active-range cull put it to sleep; it remembers you
    if (!ai.risen) {
      if (p.dead) return;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.hp < e.stats.hpMax || (d < 7 && W.visible(e.x, e.y) && W.los(e.x, e.y, p.x, p.y))) {
        ai.risen = true; ai.st = 'chase'; ai.al = 1.1; ai.gcd = 1.3;
        setAnim(e, 'idle');
        U.fx('teleport', e.x, e.y, { color: ECHO_COL }); U.fx('ring', e.x, e.y, { radius: 2.5, color: ECHO_COL, duration: 1 });
        U.sfx('shrine'); U.shake(3, 0.3);
        G.emit('echo:rise', { entity: e });
      }
      return;
    }
    if (p.dead) { setAnim(e, 'idle'); ai.cast = null; return; }
    if (k.dashN < k.charges) { k.dashT -= dt; if (k.dashT <= 0) { k.dashN++; k.dashT = k.dashN < k.charges ? 4.5 : 0; } }
    for (const id in ai.mcd) if (ai.mcd[id] > 0) ai.mcd[id] -= dt;
    ai.gcd -= dt;
    if (k.potT > 0) k.potT -= dt;
    if (k.pots > 0 && !(k.potT > 0) && e.hp < e.stats.hpMax * k.hpAt) {          // drinks at your threshold, a few times
      k.pots--; k.potT = 4;
      game.heal(e, e.stats.hpMax * 0.25);
      U.fx('heal', e.x, e.y, { color: '#ff5b5b' }); U.text(e.x, e.y - 1.3, 'Potion', '#ff9a9a'); U.sfx('potion');
    }
    if (game.isStunned(e)) { setAnim(e, 'idle'); ai.cast = null; return; }
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (e.home) {          // R8.2: a guard does not chase you far from your corpse
      const hd = Math.hypot(e.x - e.home.x, e.y - e.home.y);
      if (hd > 9 || Math.hypot(p.x - e.home.x, p.y - e.home.y) > 12) {
        ai.cast = null; ai.want = null;
        if (hd > 0.8) moveBy(e, e.home.x, e.home.y, dt); else setAnim(e, 'idle');
        return;
      }
    }
    if (ai.cast) {
      ai.cast.t -= dt * game.speedMult(e);
      if (ai.spin) moveBy(e, p.x, p.y, dt * 0.6);
      if (ai.cast.t > 0) return;
      const c = ai.cast;
      ai.cast = null; ai.spin = false;
      finishMove(e, c, p);
      return;
    }
    // dashes like you do: out of your telegraphs, out of melee if it fights at range, in if it fights up close
    ai.dashCheck = (ai.dashCheck || 0) - dt;
    if (k.dash && ai.dashCheck <= 0) {
      ai.dashCheck = 0.4;
      let threat = false;
      for (const z of game.zones) if (z.faction === 'player' && z.delay > 0 && Math.hypot(z.x - e.x, z.y - e.y) < z.r + 0.3) { threat = true; break; }
      if (threat || (k.ranged && d < 2.2)) { if (dash(e, p, false)) return; }
      else if (!k.ranged && d > 5 && d < 9 && U.chance(35)) { if (dash(e, p, true)) return; }
    }
    if (ai.gcd > 0) {
      if (k.ranged && d < 4) moveBy(e, p.x, p.y, dt, true);
      else if (d > (k.ranged ? 6.5 : 1.0)) moveBy(e, p.x, p.y, dt);
      else { e.facing = Math.atan2(p.y - e.y, p.x - e.x); setAnim(e, 'idle'); }
      return;
    }
    if (!ai.want || ai.wantT <= 0) { ai.want = pickMove(e, p, d); ai.wantT = 2.5; }
    ai.wantT -= dt;
    const mv = ai.want, rch = reach(mv, k);
    const clear = rch > 50 || mv.kind === 'nova' || mv.kind === 'cleave' || mv.kind === 'spin' || mv.kind === 'leap' || W.shotClear(e.x, e.y, p.x, p.y);
    if (d <= rch + p.radius && clear) { ai.want = null; startMove(e, mv, p); }
    else moveBy(e, p.x, p.y, dt);
  };

  // ------------------------------ the reward ------------------------------
  // Killing the Echo hands back what the abandoned corpse carried, through core's reclaimCorpse() (anything that does not
  // fit drops at your feet), plus a guaranteed rare-or-better drop.
  game.onEchoKilled = function (t) {
    if (t.guardCorpse) {          // R8.2: the way to your corpse is clear; the bag is still on the corpse
      const S0 = G.state, c = S0.flags.corpse, p0 = S0.player;
      if (c) c.echoSlain = true;
      for (const o of S0.entities) if (o.bossAdd === t.id && !o.dead) { o.hp = 0; game.kill(o, p0); }
      if (p0 && G.items && G.items.dropLoot) { try { G.items.dropLoot(t.x, t.y, { source: 'legendary', level: t.level, magicFind: p0.stats.magicFind || 0, goldFind: p0.stats.goldFind || 0, floor: 'rare', pallor: game.pallorValue ? game.pallorValue() : 0 }); } catch (err) { console.error('[game] dropLoot failed', err); } }
      U.fx('nova', t.x, t.y, { radius: 3, color: ECHO_COL }); U.toast('Your Echo falls. Your remains are yours to take.', '#bfe6ff');
      return;
    }
    const S = G.state, f = S.flags, p = S.player, ec = f.echo;
    if (ec) {
      f.echo = null;
      const cur = f.corpse, kept = S.map ? S.map.props.filter(function (pr) { return pr.type === 'corpse'; }) : [];
      f.corpse = { depth: S.depth, seed: S.map ? S.map.seed : 0, x: t.x, y: t.y, gold: ec.gold | 0, items: ec.items || [] };
      try {
        if (G.scenes && G.scenes.reclaimCorpse) G.scenes.reclaimCorpse();
        else if (p) { p.gold += ec.gold | 0; G.emit('gold:changed', { gold: p.gold, delta: ec.gold | 0 }); }
      } catch (err) { console.error('[game] echo reclaim failed', err); }
      f.corpse = cur;
      if (S.map && kept.length) {          // your newer corpse on this floor stays where it is
        for (const pr of kept) if (S.map.props.indexOf(pr) < 0) S.map.props.push(pr);
        if (G.world && G.world.invalidate) G.world.invalidate(S.map);
      }
    }
    for (const o of S.entities) if (o.bossAdd === t.id && !o.dead) { o.hp = 0; game.kill(o, p); }
    if (p && G.items && G.items.dropLoot) {
      try {
        G.items.dropLoot(t.x, t.y, { source: 'legendary', level: t.level, magicFind: p.stats.magicFind || 0, goldFind: p.stats.goldFind || 0, floor: 'rare',
          pallor: game.pallorValue ? game.pallorValue() : 0 });
      } catch (err) { console.error('[game] dropLoot failed', err); }
    }
    U.fx('nova', t.x, t.y, { radius: 3, color: ECHO_COL }); U.sfx('loot_rare');
  };
})();
