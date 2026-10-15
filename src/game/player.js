// Player controller: joystick / tap-to-move, auto-target attacks, skills, potions, interactables, pickups, visibility,
// death & revive — and G.game.update, the per-frame entry point.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS, K = game.K;

  const BASE_SPEED = game.BASE_SPEED = 5.0;          // R6.3: +19% (was 4.2); monsters move game.SPEED_SCALE faster to match
  const POTION_CD = 3;
  const SELF_HANDLED = { chest: 1, barrel: 1, shrine: 1 };

  // Transient controller state. Holds ids only (never entity references) so the player object can be swapped by a load.
  const ctl = game.ctl = {
    intent: null,           // { type: 'move'|'attack'|'skill'|'npc'|'item'|'prop'|'stairs', id?, slot?, x?, y?, once?, st? }
    path: null, pi: 0, repath: 0, targetId: 0,
    gcd: 0, atkT: 0, lock: 0, animLock: 0, queued: -1, queuedT: 0,
    tm: 1, lavaT: 0, basicN: 0, tgtT: 0, dashCd: 0, dashN: -1, dbl: null, wakeX: 0, wakeY: 0,      // terrain multiplier; dash charges (-1 = full); mythic-effect bookkeeping
    potCd: { hp: 0, mp: 0 }, visTile: -1, visDirty: true, visT: 0, goldT: 0, warnT: 0,
  };

  function resetCtl() {
    ctl.intent = null; ctl.path = null; ctl.pi = 0; ctl.repath = 0; ctl.targetId = 0;
    ctl.gcd = 0; ctl.atkT = 0; ctl.lock = 0; ctl.animLock = 0; ctl.queued = -1;
    ctl.visTile = -1; ctl.visDirty = true; ctl.visT = 0;
    ctl.tm = 1; ctl.dbl = null; ctl.wakeX = ctl.wakeY = -99; ctl.tgtT = 0; ctl.descend = null; ctl.dashN = -1; ctl.dashCd = 0;
    G.state.targetId = null;
  }
  G.on('scene:changed', resetCtl);

  function setAnim(p, a, lock) {
    if (lock) ctl.animLock = lock;
    else if (ctl.animLock > 0) return;
    if (p.anim !== a) { p.anim = a; p.animT = 0; }
    else if (lock) p.animT = 0;
  }

  game.getPotionCooldown = function (kind) { return Math.max(0, ctl.potCd[kind] || 0); };

  game.onPlayerMoved = function (teleported) {
    ctl.visDirty = true;
    if (teleported) { ctl.path = null; ctl.visT = 0; if (ctl.intent && ctl.intent.type === 'move') ctl.intent = null; }
  };

  // ---- targeting ----
  // Nearest visible living enemy within range of the player; sticks to the current target while it stays valid.
  game.pickTarget = function (range) {
    const p = G.state.player;
    if (!p) return null;
    const foes = game.live.foes;
    let best = null, bd = range;
    for (let i = 0; i < foes.length; i++) {
      const e = foes[i];
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y) - e.radius;
      if (d > range || !W.visible(e.x, e.y)) continue;
      if (e.id === ctl.targetId && d < range * 0.8) { best = e; break; }
      if (d < bd) { bd = d; best = e; }
    }
    if (best) ctl.targetId = best.id;
    return best;
  };

  function weaponRange(p) { return p.bonus.w.ranged ? 8 : 0; }

  // The monster the player is already fighting (tapped / last auto-target), if still alive and on screen.
  function currentTarget() {
    const t = game.byId(ctl.targetId);
    return t && !t.dead && t.type === 'monster' && t.faction === 'enemy' && W.visible(t.x, t.y) ? t : null;
  }

  // ---- movement ----
  function playerSpeed(p) { return BASE_SPEED * (1 + p.stats.moveSpeed / 100) * game.speedMult(p) * ctl.tm; }

  // The 2:1 iso projection makes equal world speeds look unequal on screen (screen-horizontal ≈ 2× screen-vertical).
  // Scale the player's world step so on-screen speed is the same in every direction; world-axis moves (screen diagonals) are unchanged.
  const ISO_REF = Math.hypot(G.C.TILE_W / 2, G.C.TILE_H / 2);
  function screenSpeedScale(dx, dy) {
    const d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    return ISO_REF / (Math.hypot((ux - uy) * G.C.TILE_W / 2, (ux + uy) * G.C.TILE_H / 2) || ISO_REF);
  }

  function planPath(p, tx, ty) {
    ctl.path = W.path(p.x, p.y, tx, ty);
    ctl.pi = ctl.path && ctl.path.length > 1 && Math.hypot(ctl.path[0].x - p.x, ctl.path[0].y - p.y) < 0.75 ? 1 : 0;
    ctl.repath = 0.5;
  }

  // One movement step toward tx,ty along the planned path. Returns false if blocked.
  function stepToward(p, tx, ty, dt, moving) {
    if (ctl.lock > 0) return true;
    if (!ctl.path || (moving && (ctl.repath -= dt) <= 0)) planPath(p, tx, ty);
    let gx = tx, gy = ty;
    const path = ctl.path;
    if (path && ctl.pi < path.length - 1) {
      let n = path[ctl.pi];
      if (Math.hypot(n.x - p.x, n.y - p.y) < 0.25) n = path[++ctl.pi];
      if (ctl.pi < path.length - 1) { gx = n.x; gy = n.y; }
    }
    const dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy);
    if (d < 0.01) return true;
    const step = Math.min(d, playerSpeed(p) * screenSpeedScale(dx, dy) * dt);
    p.facing = Math.atan2(dy, dx);
    const ok = W.move(p, dx / d * step, dy / d * step);
    setAnim(p, 'walk');
    ctl.visDirty = true;
    return ok;
  }

  // ---- basic attack ----
  function attackInterval(p) {
    return 1 / (p.bonus.w.aps * (1 + p.stats.attackSpeed / 100) * game.speedMult(p));
  }

  function basicAttack(p, t) {
    const w = p.bonus.w, iv = attackInterval(p);
    p.facing = Math.atan2(t.y - p.y, t.x - p.x);
    ctl.atkT = iv;
    ctl.gcd = Math.max(ctl.gcd, Math.min(0.2, iv * 0.5));
    ctl.lock = Math.min(0.22, iv * 0.5);
    setAnim(p, 'attack', Math.min(0.35, iv * 0.8));
    const myth = game.fxOf(p);
    if (myth.thunderstep && ++ctl.basicN % 4 === 0) {          // mythic: every 4th basic attack calls lightning
      U.sfx('bolt'); U.shake(3, 0.12);
      U.fx('spark', t.x, t.y, { color: COL.lightning, radius: 1.5 });
      K.zone({ x: t.x, y: t.y, r: 1.5, delay: 0.05, pct: 200, dtype: 'lightning', fx: 'explosion', color: COL.lightning });
    }
    if (myth.legion && !game.live.allies.length) ctl.dbl = { t: 0.18, id: t.id };      // mythic: spectral double repeats the attack
    if (game.noteStyle) game.noteStyle('attack');
    const gain = game.CLASSES[p.classId].mpOnHit;            // martial classes build mana by fighting
    if (gain) p.mp = Math.min(p.stats.mpMax, p.mp + gain);
    if (!w.ranged) {
      K.swing(p, t);
      game.playerHit(t, { pct: 120, type: 'phys', skill: false, melee: true });      // melee pays for its risk with harder swings
      return;
    }
    const bow = w.type === 'bow';
    const shot = { pct: 100, type: 'phys', skill: false, shape: bow ? 'arrow' : 'bolt', color: bow ? '#e8dcb0' : game.CLASSES[p.classId].sprite.accent, speed: bow ? 15 : 13 };
    U.sfx(bow ? 'arrow' : 'bolt');
    K.shoot(p, p.facing, shot);
    if (p.bonus.extraArrow && U.chance(p.bonus.extraArrow)) { K.shoot(p, p.facing - 0.16, shot); K.shoot(p, p.facing + 0.16, shot); }
  }

  // Attack t if possible; otherwise (optionally) close the distance. Returns true if an attack was launched.
  function tryAttack(p, t, approach, dt) {
    const w = p.bonus.w;
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    const inRange = w.ranged ? (d <= 8 + t.radius && W.shotClear(p.x, p.y, t.x, t.y)) : d <= p.radius + t.radius + 0.8;
    if (inRange) {
      ctl.path = null;
      if (ctl.atkT <= 0 && ctl.gcd <= 0 && ctl.lock <= 0) { basicAttack(p, t); return true; }
      if (ctl.lock <= 0) { p.facing = Math.atan2(t.y - p.y, t.x - p.x); setAnim(p, 'idle'); }
    } else if (approach) {
      stepToward(p, t.x, t.y, dt, true);
    }
    return false;
  }

  // ---- skills ----
  function skillInRange(p, sk, t) {
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (sk.tg === 'melee') return d <= p.radius + t.radius + 0.9;
    return d <= sk.range + t.radius && W.shotClear(p.x, p.y, t.x, t.y);
  }

  function findCorpse(p, range) {
    const ents = G.state.entities, near = game.byId(ctl.targetId);
    let best = null, bd = 1e9;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (!e.dead || e.type !== 'monster' || e.noCorpse || e.exploded || !(e.ai && e.ai.corpse > 0.2)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > range || !W.visible(e.x, e.y)) continue;
      const ref = near && !near.dead ? near : p;
      const d = Math.hypot(e.x - ref.x, e.y - ref.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function warn(p, text, color) {
    U.sfx('error');
    if (ctl.warnT > 0) return;
    ctl.warnT = 0.8;
    U.text(p.x, p.y - 1, text, color || '#ff6a6a');
  }

  function castNow(p, sk, rank, t, corpse) {
    const V = game.applySynergies(p, sk, game.skillValues(sk, rank));      // R3.8: ranks in partner skills boost this cast
    const cost = game.skillMpCost(sk, rank);
    const myth = game.fxOf(p);
    if (myth.blood_price) {                  // mythic: skills are paid for in blood
      if (cost > 0) { p.hp = Math.max(1, p.hp - cost); U.text(p.x, p.y - 0.9, '-' + cost, '#d03a3a'); U.fx('blood', p.x, p.y, {}); }
    } else { p.mp -= cost; }
    const cd = game.skillCooldown(p, sk, rank);
    if (cd > 0) p.cooldowns[sk.id] = cd;

    let ang = p.facing;
    if (t) ang = Math.atan2(t.y - p.y, t.x - p.x);
    const aim = { x: p.x, y: p.y, ang: ang };
    if (sk.tg === 'point') {
      const d = t ? Math.min(sk.range, Math.hypot(t.x - p.x, t.y - p.y)) : Math.min(sk.range, 4.5);
      aim.x = p.x + Math.cos(ang) * d; aim.y = p.y + Math.sin(ang) * d;
    }
    const utility = sk.tg === 'self' && !(sk.tags.indexOf('aoe') >= 0 || sk.tags.indexOf('summon') >= 0) || sk.tg === 'dir';
    const martial = game.MARTIAL[p.classId];
    const gcd = utility ? 0.15 : martial ? U.clamp(attackInterval(p) * 0.9, 0.25, 0.9) : 0.6 / (1 + p.stats.castSpeed / 100);
    ctl.gcd = gcd;
    ctl.atkT = Math.max(ctl.atkT, gcd);
    if (!utility) { ctl.lock = Math.min(gcd, 0.22); p.facing = ang; setAnim(p, sk.tg === 'melee' ? 'attack' : 'cast', Math.min(0.35, gcd)); }
    ctl.path = null;
    if (game.noteStyle) game.noteStyle(sk.id);
    sk.cast(p, t, V, aim, sk, corpse);
    if (myth.echo_cast && sk.tg !== 'corpse' && sk.tg !== 'dir' && sk.tags.indexOf('mobility') < 0 && U.chance(25) && !(t && t.dead && (sk.tg === 'melee' || sk.tg === 'enemy'))) {
      U.text(p.x, p.y - 1.3, 'Echo', COL.shadow, true); U.fx('ring', p.x, p.y, { radius: 1.2, color: COL.shadow, duration: 0.3 }); U.sfx('cast');
      sk.cast(p, t, V, aim, sk, corpse);       // mythic: free second cast
    }
    return true;
  }

  game.useSkill = function (slot) {
    const S = G.state, p = S.player;
    if (!p || p.dead || !S.map) return false;
    const id = p.skillBar[slot], sk = id && game.SKILLS[id];
    if (!sk || sk.kind !== 'active') return false;
    const rank = game.skillRank(p, id);
    if (rank <= 0) return false;
    if (S.scene === 'town') { warn(p, 'Not in town', '#cccccc'); return false; }
    if (game.isStunned(p)) return false;
    if ((p.cooldowns[id] || 0) > 0) { U.sfx('error'); return false; }
    if (game.fxOf(p).blood_price) { if (p.hp <= game.skillMpCost(sk, rank) + 1) { warn(p, 'Not enough life', '#d03a3a'); return false; } }
    else if (p.mp < game.skillMpCost(sk, rank)) { warn(p, 'No mana', COL.mana); return false; }
    if (ctl.gcd > 0) {                       // buffer the press so mashing feels responsive
      if (ctl.gcd < 0.4) { ctl.queued = slot; ctl.queuedT = 0.5; return true; }
      return false;
    }
    let t = null, corpse = null;
    switch (sk.tg) {
      case 'melee':
        t = game.pickTarget(7);
        if (!t) { warn(p, 'No target', '#cccccc'); return false; }
        if (!skillInRange(p, sk, t)) { ctl.intent = { type: 'skill', slot: slot, id: t.id }; ctl.path = null; return true; }
        break;
      case 'enemy':
        t = game.pickTarget(sk.range + 3);
        if (!t) { warn(p, 'No target', '#cccccc'); return false; }
        if (!skillInRange(p, sk, t)) { ctl.intent = { type: 'skill', slot: slot, id: t.id }; ctl.path = null; return true; }
        break;
      case 'aim':
      case 'point':
        t = game.pickTarget(sk.range + 1);
        break;
      case 'corpse':
        corpse = findCorpse(p, sk.range);
        if (!corpse) { warn(p, 'No corpse', '#cccccc'); return false; }
        break;
      default:
        t = game.pickTarget(8);
    }
    if (ctl.intent && ctl.intent.type === 'move') { ctl.intent = null; }
    return castNow(p, sk, rank, t, corpse);
  };

  game.usePotion = function (kind) {
    const p = G.state.player;
    if (!p || p.dead || (kind !== 'hp' && kind !== 'mp')) return false;
    if (!(p.potions[kind] > 0)) { U.sfx('error'); return false; }
    if (ctl.potCd[kind] > 0) return false;
    if (kind === 'hp') {
      if (p.hp >= p.stats.hpMax) return false;
      if (game.noteStyle) game.noteStyle('potion', p.hp / p.stats.hpMax);
      const veil = game.floorHas('thin_veil') ? 0.5 : 1;          // deep floor modifier Thin Veil
      game.heal(p, Math.round(p.stats.hpMax * 0.4 * veil), true);
      game.addEffect(p, { id: 'potion_hp', t: 3, mods: { hpRegen: Math.round(p.stats.hpMax * 0.04 * veil) } });
      U.fx('heal', p.x, p.y, { color: '#ff5b5b' });
    } else {
      if (p.mp >= p.stats.mpMax) return false;
      p.mp = Math.min(p.stats.mpMax, p.mp + Math.round(p.stats.mpMax * 0.5));
      U.fx('heal', p.x, p.y, { color: COL.mana });
    }
    p.potions[kind]--;
    ctl.potCd[kind] = POTION_CD;
    U.sfx('potion');
    return true;
  };

  // ---- R4.4 / R6.3 innate class action: every class dashes. Charges recharge one at a time; passives improve it
  // through player.bonus.dash* (Acrobatics, Ground Slam, Tumble Shot, Rime Step, Grave Swap). ----
  const CA = { a: null, cd: 0, d: 0, inv: 0, max: 1 };      // reused: the charge tick reads this every frame
  function classAction(p) {
    const a = p && game.CLASSES[p.classId] && game.CLASSES[p.classId].action;
    if (!a) return null;
    const b = p.bonus || {};
    CA.a = a; CA.cd = Math.max(1, a.cd - (b.dashCd || 0)); CA.d = a.d + (b.dashD || 0); CA.inv = a.inv + (b.dashInv || 0);
    CA.max = Math.max(1, (a.charges || 1) + (b.dashCharges || 0));
    return CA;
  }
  function tickDash(p, dt) {
    const c = classAction(p);
    if (!c) return;
    if (ctl.dashN < 0 || ctl.dashN > c.max) { ctl.dashN = c.max; ctl.dashCd = 0; }
    if (ctl.dashN >= c.max) { ctl.dashCd = 0; return; }
    ctl.dashCd -= dt;
    if (ctl.dashCd <= 0) { ctl.dashN++; ctl.dashCd = ctl.dashN < c.max ? ctl.dashCd + c.cd : 0; }
  }

  // cdRemaining = recharge = seconds until the next charge (0 when full); a dash is possible while charges > 0 (ready).
  game.getClassAction = function () {
    const p = G.state.player, c = classAction(p);
    if (!c) return null;
    const n = ctl.dashN < 0 ? c.max : Math.min(ctl.dashN, c.max), rech = n >= c.max ? 0 : Math.max(0, ctl.dashCd || 0);
    return { id: c.a.id, kind: c.a.kind || 'roll', name: c.a.name, desc: c.a.desc, icon: Object.assign({}, c.a.icon), cooldown: Math.round(c.cd * 100) / 100,
      cdRemaining: rech, recharge: rech, charges: n, maxCharges: c.max, ready: n > 0 };
  };

  // Living hostile monsters whose body comes within `pad` of the segment a→b.
  function foesOnSegment(ax, ay, bx, by, pad) {
    const out = [], foes = game.live.foes, vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy || 1;
    for (let i = 0; i < foes.length; i++) {
      const e = foes[i];
      if (e.dead) continue;
      const k = U.clamp(((e.x - ax) * vx + (e.y - ay) * vy) / L, 0, 1);
      if (Math.hypot(e.x - ax - vx * k, e.y - ay - vy * k) <= pad + e.radius) out.push(e);
    }
    return out;
  }

  game.useClassAction = function () {
    const S = G.state, p = S.player, c = classAction(p);
    if (!c || p.dead || !S.map || S.scene === 'menu' || game.isStunned(p)) return false;
    if (ctl.dashN < 0 || ctl.dashN > c.max) ctl.dashN = c.max;
    if (ctl.dashN <= 0) { U.sfx('error'); return false; }
    const m = G.input.move;
    let ang;
    if (Math.hypot(m.x, m.y) > 0.2) ang = Math.atan2(m.y, m.x);
    else {                                         // idle: away from the nearest enemy (or backwards)
      let near = null, nd = 1e9;
      for (const e of game.live.foes) { if (e.dead) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; near = e; } }
      ang = near && nd < 12 ? Math.atan2(p.y - near.y, p.x - near.x) : p.facing + Math.PI;
    }
    ctl.dashN--;
    if (ctl.dashCd <= 0) ctl.dashCd = c.cd;
    ctl.intent = null; ctl.path = null; ctl.lock = 0;
    game.addEffect(p, { id: 'invuln', t: c.inv });
    const a = c.a, b = p.bonus, x0 = p.x, y0 = p.y, tx = p.x + Math.cos(ang) * c.d, ty = p.y + Math.sin(ang) * c.d;
    let swapped = false;
    if (b.dashSwap) swapped = graveSwap(p, tx, ty, b.dashSwap);
    if (swapped) {
      // Grave Swap: the minion took our place
    } else if (a.kind === 'blink') {
      let done = false;
      for (let d = c.d; d >= 1 && !done; d -= 0.5) {
        const x = x0 + Math.cos(ang) * d, y = y0 + Math.sin(ang) * d;
        if (W.canStand(x, y, p.radius) && W.shotClear(x0, y0, x, y)) done = K.blink(p, x, y, 'teleport');
      }
      if (!done) U.fx('teleport', p.x, p.y, {});
      U.sfx('cast');
    } else {
      U.fx(a.fx || 'smoke', p.x, p.y, {});
      U.sfx('swing');
      K.dashTo(p, tx, ty, 0);
      U.fx(a.fx || 'smoke', p.x, p.y, {});
    }
    p.facing = ang;
    if (a.kind === 'charge' && !swapped) {           // Shoulder Charge: what stood in the way is struck and shoved aside
      const hit = foesOnSegment(x0, y0, p.x, p.y, 0.55);
      for (const e of hit) {
        game.playerHit(e, { pct: 60, type: 'phys', skill: false, melee: true });
        if (e.dead || e.rarity === 'boss') continue;
        const k = U.clamp(((e.x - x0) * Math.cos(ang) + (e.y - y0) * Math.sin(ang)), 0, c.d);
        let nx = e.x - (x0 + Math.cos(ang) * k), ny = e.y - (y0 + Math.sin(ang) * k);
        const nl = Math.hypot(nx, ny);
        if (nl < 0.05) { nx = -Math.sin(ang); ny = Math.cos(ang); } else { nx /= nl; ny /= nl; }
        for (let s = 0; s < 6; s++) if (!W.move(e, nx * 0.2, ny * 0.2)) break;
        game.applyStatus(e, 'stun', 0.4);
        if (e.ai) e.ai.path = null;
      }
      if (hit.length) { U.shake(3, 0.15); U.sfx('hit'); }
    }
    if (b.dashSlam) {                                // Ground Slam
      U.shake(4, 0.2);
      K.zone({ x: p.x, y: p.y, r: 2.2, delay: 0.05, pct: b.dashSlam, dtype: 'phys', st: [['slow', 100, 2, 0.4]], fx: 'explosion', color: '#c08a4a' });
    }
    if (b.dashFrost) {                               // Rime Step: a frost trail along the path
      const len = Math.hypot(p.x - x0, p.y - y0), n = Math.max(1, Math.min(4, Math.round(len)));
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n;
        K.zone({ x: x0 + (p.x - x0) * k, y: y0 + (p.y - y0) * k, r: 0.95, t: 3, every: 0.5, pct: b.dashFrost, dtype: 'cold', st: [['chill', 100, 2]], fx: 'frost', color: COL.cold });
      }
    }
    if (b.dashShot) {                                // Tumble Shot: a free Multishot at the nearest foe
      const t = game.pickTarget(9);
      if (t) {
        const sa = Math.atan2(t.y - p.y, t.x - p.x), n = b.dashShotN || 3, bow = p.bonus.w.type === 'bow';
        for (let i = 0; i < n; i++) K.shoot(p, sa + (i - (n - 1) / 2) * 0.17, { pct: b.dashShot, type: 'phys', shape: bow ? 'arrow' : 'shard', color: '#e8dcb0', speed: 15 });
        U.sfx('arrow');
        p.facing = sa;
      }
    }
    setAnim(p, 'walk', 0.2);
    if (game.relicDash) game.relicDash(p, x0, y0);          // R7.10 relic dash powers
    if (game.noteStyle) game.noteStyle('dash');
    return true;
  };

  // Grave Swap: trade places with the minion nearest the dash's landing spot; it is shielded and taunts for 2 s.
  function graveSwap(p, tx, ty, absPct) {
    const al = game.live.allies;
    let best = null, bd = 1e9;
    for (let i = 0; i < al.length; i++) {
      const e = al[i];
      if (e.dead || !e.summon || Math.hypot(e.x - p.x, e.y - p.y) > 8) continue;
      if (game.inSealedRoom && !game.inSealedRoom(e.x, e.y)) continue;
      const d = Math.hypot(e.x - tx, e.y - ty);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return false;
    const ox = p.x, oy = p.y;
    U.fx('teleport', p.x, p.y, { color: COL.shadow }); U.fx('teleport', best.x, best.y, { color: COL.shadow });
    p.x = best.x; p.y = best.y;
    best.x = ox; best.y = oy;
    if (best.ai) { best.ai.path = null; best.ai.tgt = 0; }
    best.tauntT = G.state.time + 2;
    best.effects = best.effects.filter(function (f) { return f.id !== 'bone_swap'; });
    best.effects.push({ id: 'bone_swap', t: 4, absorb: Math.round(best.stats.hpMax * absPct / 100) });
    U.fx('ring', ox, oy, { radius: 1.2, color: '#e8e0d0', duration: 0.5 });
    U.sfx('cast');
    if (game.onPlayerMoved) game.onPlayerMoved(true);
    return true;
  }
  G.on('input:classaction', function () { if (canAct()) game.useClassAction(); });

  game.revivePlayer = function () {
    const p = G.state.player;
    if (!p) return;
    p.dead = false;
    p.effects = [];
    p.cooldowns = {};
    p.anim = 'idle'; p.animT = 0; p.hitFlash = 0;
    game.recomputeStats(p);
    p.hp = p.stats.hpMax;
    p.mp = p.stats.mpMax;
    resetCtl();
    ctl.dashN = -1; ctl.dashCd = 0;
    if (game.onRevive) game.onRevive();
  };

  game.healPlayer = function (full) {
    const p = G.state.player;
    if (!p || p.dead) return;
    if (full === undefined || full) {
      p.effects = p.effects.filter(function (e) { return !(e.dps || e.slow || e.stun || e.taken > 0 || e.dealt < 0); });
      game.recomputeStats(p);
      p.hp = p.stats.hpMax;
      p.mp = p.stats.mpMax;
    } else {
      game.heal(p, p.stats.hpMax * 0.5, true);
      p.mp = Math.min(p.stats.mpMax, p.mp + p.stats.mpMax * 0.5);
    }
    U.fx('heal', p.x, p.y, {});
    U.sfx('potion');
  };

  // ---- interactables ----
  const SHRINES = [
    { name: 'Shrine of Might', text: '+40% damage', color: '#ff7a2b', mods: function () { return { dmgPct: 40 }; } },
    { name: 'Shrine of Stone', text: 'armour and resistances', color: '#9aa0aa', mods: function (p) { return { armor: 30 + p.level * 10, resAll: 20 }; } },
    { name: 'Shrine of Haste', text: '+25% speed', color: '#fff06a', mods: function () { return { moveSpeed: 25, attackSpeed: 25, castSpeed: 25 }; } },
    { name: 'Shrine of Fortune', text: '+100% magic and gold find', color: '#ffe45b', mods: function () { return { magicFind: 100, goldFind: 100 }; } },
    { name: 'Shrine of Wisdom', text: '+50% experience', color: '#b98cff', mods: function () { return { xpGain: 50 }; } },
    { name: 'Shrine of Renewal', text: 'restored, and regenerating', color: '#5bff8a', mods: function (p) { return { hpRegen: Math.round(p.stats.hpMax * 0.03), mpRegen: Math.round(p.stats.mpMax * 0.03) }; }, heal: true },
  ];

  function lootOpts(p, source) {
    return { source: source, level: Math.max(1, G.state.depth | 0), magicFind: p.stats.magicFind || 0, goldFind: p.stats.goldFind || 0, pallor: game.pallorValue ? game.pallorValue() : 0 };
  }
  function dropLoot(x, y, opts) {
    if (!(G.items && G.items.dropLoot)) return;
    try { G.items.dropLoot(x, y, opts); } catch (err) { console.error('[game] dropLoot failed', err); }
  }

  function interactProp(p, prop) {
    const map = G.state.map, cx = prop.x + 0.5, cy = prop.y + 0.5;
    p.facing = Math.atan2(cy - p.y, cx - p.x);
    switch (prop.interact) {
      case 'chest':
        if (prop.used) return;
        if (prop.locked) { warn(p, 'Sealed', '#cccccc'); return; }
        prop.used = true;
        prop.type = 'chest_open';
        U.sfx('chest');
        U.fx('spark', cx, cy, { color: '#ffe45b' });
        // spill toward the player so loot does not land under the (solid) chest
        const co = lootOpts(p, 'chest');
        if (prop.lockReward) co.floor = 'rare';            // lockdown prize: best item at least rare (opts.floor, R3.6)
        if (prop.gradeFloor) co.floor = prop.gradeFloor;      // R7.5 speed-clear chest / event vault
        dropLoot(cx + Math.cos(p.facing + Math.PI) * 0.8, cy + Math.sin(p.facing + Math.PI) * 0.8, co);
        if (prop.lockReward) game.lockdownReward(p, cx + Math.cos(p.facing + Math.PI) * 0.8, cy + Math.sin(p.facing + Math.PI) * 0.8);
        G.emit('object:interact', { type: 'chest', prop: prop });
        break;
      case 'barrel': {
        if (prop.used) return;
        prop.used = true;
        prop.solid = false;
        const i = map.props.indexOf(prop);
        if (i >= 0) map.props.splice(i, 1);          // smashed: gone from the map
        if (G.world && G.world.invalidate) G.world.invalidate(map);
        setAnim(p, 'attack', 0.25);
        U.sfx('hit');
        U.fx('smoke', cx, cy, { color: '#8a6a4a' });
        dropLoot(cx, cy, lootOpts(p, 'barrel'));
        if (game.onBarrelBroken) game.onBarrelBroken(prop);      // R7.5 Key Hunt
        break;
      }
      case 'shrine': {
        if (prop.used) return;
        prop.used = true;
        const s = U.rng.pick(SHRINES);
        game.removeEffect(p, 'shrine');
        game.addEffect(p, { id: 'shrine', name: s.name, t: 90, mods: s.mods(p) });
        if (s.heal) { p.hp = p.stats.hpMax; p.mp = p.stats.mpMax; }
        U.sfx('shrine');
        U.fx('nova', cx, cy, { radius: 2.5, color: s.color });
        U.fx('heal', p.x, p.y, { color: s.color });
        U.toast(s.name + ': ' + s.text, s.color);
        G.emit('object:interact', { type: 'shrine', prop: prop });
        if (game.floorHas('cursed')) game.cursedShrine(cx, cy);
        break;
      }
      default:
        if (prop.interact) G.emit('object:interact', { type: prop.interact, prop: prop });
    }
  }

  // G.items.pickup with the midas mythic hooked in: gold picked up heals 2% and stacks +5% damage (6 s, up to 10).
  function pickup(p, g) {
    if (!(G.items && G.items.pickup)) return false;
    const gold0 = p.gold, isGold = g.item && g.item.type === 'gold';
    let ok = false;
    try { ok = G.items.pickup(g.id); } catch (err) { console.error('[game] pickup failed', err); }
    if (isGold && p.gold > gold0 && game.fxOf(p).midas && !p.dead) {
      const old = game.getEffect(p, 'midas'), n = Math.min(10, (old ? old.stacks : 0) + 1);
      game.addEffect(p, { id: 'midas', t: 6, stacks: n, mods: { dmgPct: 5 * n } });
      game.heal(p, p.stats.hpMax * 0.02, true);
      U.fx('spark', p.x, p.y, { color: '#ffd94a' });
    }
    return ok;
  }

  // R5.6: a tapped ground item may be part of a pile. A pile with one item (gold aside) is simply taken; with several,
  // the gold is taken and the UI is asked to open the pile popup.
  function takeGround(p, g) {
    const I = G.items, pid = g.pileId;
    let pile = null;
    if (pid !== undefined && pid !== null && I && I.getPile) {
      try { pile = I.getPile(pid); } catch (err) { console.error('[game] getPile failed', err); pile = null; }
    }
    if (!pile || pile.length <= 1) { pickup(p, g); return; }
    let items = 0;
    for (let i = 0; i < pile.length; i++) if (pile[i] && pile[i].item && pile[i].item.type !== 'gold') items++;
    if (items <= 1) { for (let i = pile.length - 1; i >= 0; i--) if (pile[i]) pickup(p, pile[i]); return; }
    for (let i = pile.length - 1; i >= 0; i--) if (pile[i] && pile[i].item && pile[i].item.type === 'gold') pickup(p, pile[i]);
    U.sfx('click');
    G.emit('pile:open', { pileId: pid });
  }

  function groundById(id) {
    const list = G.state.groundItems;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function usable(prop) { return prop && prop.interact && !(prop.used && SELF_HANDLED[prop.interact]); }

  function stairsType(x, y) {
    const t = W.tile(x, y);
    return t === C.TILE.STAIRS_DOWN ? 'stairs_down' : t === C.TILE.STAIRS_UP ? 'stairs_up' : null;
  }

  // Attack button with nothing to fight: use whatever is closest (NPC, loot, chest, stairs…).
  function interactNearest(p) {
    const S = G.state;
    let best = null, bd = 2.4;
    for (const e of S.entities) {
      if (e.type !== 'npc') continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = { type: 'npc', id: e.id }; }
    }
    for (const g of S.groundItems) {
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < bd) { bd = d; best = { type: 'item', id: g.id }; }
    }
    const px = Math.floor(p.x), py = Math.floor(p.y);
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
      const tx = px + ox, ty = py + oy;
      const d = Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y);
      if (d >= bd) continue;
      const st = stairsType(tx, ty);
      if (st) { bd = d; best = { type: 'stairs', x: tx, y: ty, st: st }; continue; }
      const prop = W.prop(tx, ty);
      if (usable(prop)) { bd = d; best = { type: 'prop', x: tx, y: ty }; }
    }
    if (best) { ctl.intent = best; ctl.path = null; }
    return !!best;
  }

  // ---- input events ----
  function canAct() {
    const S = G.state;
    return S.player && !S.player.dead && S.map && !S.paused && S.scene !== 'menu';
  }

  G.on('input:tap', function (e) {
    if (!e || !canAct()) return;
    const S = G.state, p = S.player, x = e.x, y = e.y;
    let best = null, bd = 1e9;
    const foes = game.live.foes;
    for (let i = 0; i < foes.length; i++) {
      const m = foes[i];
      if (m.dead || !W.visible(m.x, m.y)) continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < m.radius + 0.75 && d < bd) { bd = d; best = m; }
    }
    ctl.path = null;
    if (best) { ctl.targetId = best.id; ctl.intent = { type: 'attack', id: best.id }; return; }
    for (const n of S.entities) {
      if (n.type === 'npc' && Math.hypot(n.x - x, n.y - y) < 0.9) { ctl.intent = { type: 'npc', id: n.id }; return; }
    }
    bd = 0.8; best = null;
    for (const g of S.groundItems) {
      const d = Math.hypot(g.x - x, g.y - y);
      if (d < bd) { bd = d; best = g; }
    }
    const tx = Math.floor(x), ty = Math.floor(y);
    const onProp = usable(W.prop(tx, ty));
    if (best && !(onProp && bd > 0.4)) { ctl.intent = { type: 'item', id: best.id }; return; }      // loot lying beside a chest must not steal the tap
    if (onProp) { ctl.intent = { type: 'prop', x: tx, y: ty }; return; }
    const st = stairsType(tx, ty);
    if (st) { ctl.intent = { type: 'stairs', x: tx, y: ty, st: st }; return; }
    const spot = W.walkable(x, y) ? { x: x, y: y } : W.free(x, y, 3);
    if (!spot) return;
    ctl.intent = { type: 'move', x: spot.x, y: spot.y };
    planPath(p, spot.x, spot.y);
    if (!ctl.path) ctl.intent = null;
  });

  G.on('input:skill', function (e) { if (e && canAct()) game.useSkill(e.slot | 0); });
  G.on('input:potion', function (e) { if (e && canAct()) game.usePotion(e.kind); });
  G.on('input:attack', function () {
    if (!canAct()) return;
    const p = G.state.player;
    const t = game.pickTarget(p.bonus.w.ranged ? 8 : 7);
    if (t) { ctl.intent = { type: 'attack', id: t.id, once: true }; ctl.path = null; }
    else interactNearest(p);
  });

  function takeStairs(st) {
    U.sfx('stairs');
    game.pallorStairs = st;            // R5.2: only floors entered by the stairs raise Pallor
    G.emit('object:interact', { type: st });
    game.pallorStairs = null;
  }
  // R6.1: the UI's answer to 'stairs:confirm'. Valid while the player is alive, on the same floor and still near the stairs.
  game.confirmDescend = function () {
    const S = G.state, p = S.player, d = ctl.descend;
    ctl.descend = null;
    if (!d || !p || p.dead || S.scene !== 'dungeon' || d.depth !== (S.depth | 0) + 1 || Math.hypot(d.x + 0.5 - p.x, d.y + 0.5 - p.y) > 2.5) return false;
    takeStairs('stairs_down');
    return true;
  };
  game.cancelDescend = function () { ctl.descend = null; };

  // ---- per-frame ----
  function runIntent(p, dt) {
    const it = ctl.intent, S = G.state;
    switch (it.type) {
      case 'move':
        if (Math.hypot(it.x - p.x, it.y - p.y) < 0.12 || !stepToward(p, it.x, it.y, dt, false)) { ctl.intent = null; ctl.path = null; }
        break;
      case 'attack': {
        const t = game.byId(it.id);
        if (!t || t.dead || t.type !== 'monster') { ctl.intent = null; break; }
        if (tryAttack(p, t, true, dt) && it.once) ctl.intent = null;
        break;
      }
      case 'skill': {
        const t = game.byId(it.id), sk = game.SKILLS[p.skillBar[it.slot]];
        if (!t || t.dead || !sk) { ctl.intent = null; break; }
        if (skillInRange(p, sk, t)) { ctl.intent = null; ctl.targetId = t.id; game.useSkill(it.slot); }
        else stepToward(p, t.x, t.y, dt, true);
        break;
      }
      case 'npc': {
        const n = game.byId(it.id);
        if (!n) { ctl.intent = null; break; }
        if (Math.hypot(n.x - p.x, n.y - p.y) <= 1.6) {
          ctl.intent = null; ctl.path = null;
          p.facing = Math.atan2(n.y - p.y, n.x - p.x);
          U.sfx('click');
          G.emit('npc:interact', { role: n.role, entity: n });
        } else if (!stepToward(p, n.x, n.y, dt, false)) { ctl.intent = null; }
        break;
      }
      case 'item': {
        const g = groundById(it.id);
        if (!g) { ctl.intent = null; break; }
        if (Math.hypot(g.x - p.x, g.y - p.y) <= 1.0) {
          ctl.intent = null; ctl.path = null;
          takeGround(p, g);
        } else if (!stepToward(p, g.x, g.y, dt, false)) { ctl.intent = null; }
        break;
      }
      case 'prop': {
        const prop = W.prop(it.x, it.y);
        if (!usable(prop)) { ctl.intent = null; break; }
        if (Math.hypot(it.x + 0.5 - p.x, it.y + 0.5 - p.y) <= 1.55) { ctl.intent = null; ctl.path = null; interactProp(p, prop); }
        else {
          if (!ctl.path) { const spot = W.free(it.x + 0.5, it.y + 0.5, 2); if (spot) planPath(p, spot.x, spot.y); }
          const end = ctl.path && ctl.path.length ? ctl.path[ctl.path.length - 1] : { x: it.x + 0.5, y: it.y + 0.5 };
          if (!stepToward(p, end.x, end.y, dt, false) || Math.hypot(end.x - p.x, end.y - p.y) < 0.05) ctl.intent = null;
        }
        break;
      }
      case 'stairs':
        if (Math.hypot(it.x + 0.5 - p.x, it.y + 0.5 - p.y) <= 0.7) {
          ctl.intent = null; ctl.path = null;
          // R6.1: once Pallor is unlocked, the UI asks "Go deeper?" first and calls confirmDescend() (no UI loaded → just go)
          if (it.st === 'stairs_down' && S.flags.pallorUnlocked && G.ui) {
            ctl.descend = { x: it.x, y: it.y, depth: (S.depth | 0) + 1 };
            G.emit('stairs:confirm', { depth: ctl.descend.depth, nextValue: game.nextPallorValue ? game.nextPallorValue(ctl.descend.depth) : null });
            break;
          }
          takeStairs(it.st);
        } else if (!stepToward(p, it.x + 0.5, it.y + 0.5, dt, false)) { ctl.intent = null; }
        break;
      default:
        ctl.intent = null;
    }
    void S;
  }

  function updatePlayer(p, dt) {
    const S = G.state;
    p.animT += dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (!p.bonus || !p.bonus.w) game.recomputeStats(p, true);     // e.g. a save written before this field existed
    if (p.effects.length) { game.tickEffects(p, dt); if (p.dead) return; }

    const st = p.stats;
    if (!game.floorHas('no_regen')) {          // floor modifier Withering Air
      if (p.hp < st.hpMax && !game.getEffect(p, 'bleach')) p.hp = Math.min(st.hpMax, p.hp + st.hpRegen * dt);
      if (p.mp < st.mpMax) p.mp = Math.min(st.mpMax, p.mp + st.mpRegen * dt);
    }
    const cds = p.cooldowns;
    for (const id in cds) if (cds[id] > 0) { cds[id] -= dt; if (cds[id] < 0) cds[id] = 0; }
    if (ctl.gcd > 0) ctl.gcd -= dt;
    if (ctl.atkT > 0) ctl.atkT -= dt;
    if (ctl.lock > 0) ctl.lock -= dt;
    if (ctl.animLock > 0) ctl.animLock -= dt;
    if (ctl.warnT > 0) ctl.warnT -= dt;
    if (ctl.potCd.hp > 0) ctl.potCd.hp -= dt;
    if (ctl.potCd.mp > 0) ctl.potCd.mp -= dt;
    tickDash(p, dt);

    ctl.tm = game.terrain(p, ctl, dt);          // shallow water / lava (R2.1)
    if (p.dead) return;
    if (ctl.dbl && (ctl.dbl.t -= dt) <= 0) {      // legion: the spectral double strikes
      const dt2 = game.byId(ctl.dbl.id);
      ctl.dbl = null;
      if (dt2 && !dt2.dead) {
        const ox = p.x - Math.sin(p.facing) * 0.6, oy = p.y + Math.cos(p.facing) * 0.6;
        U.fx('teleport', ox, oy, { color: COL.shadow });
        if (p.bonus.w.ranged) K.shoot({ x: ox, y: oy, bonus: p.bonus }, Math.atan2(dt2.y - oy, dt2.x - ox), { pct: 50, type: 'phys', skill: false, shape: 'bolt', color: COL.shadow, speed: 13 });
        else { U.fx('slash', dt2.x, dt2.y, { angle: p.facing, radius: 1, color: COL.shadow }); game.playerHit(dt2, { pct: 50, type: 'phys', skill: false, melee: true }); }
      }
    }
    if (game.fxOf(p).frozen_wake && Math.hypot(p.x - ctl.wakeX, p.y - ctl.wakeY) > 0.75) {      // mythic: frost trail while moving
      if (ctl.wakeX > -90) K.zone({ x: p.x, y: p.y, r: 0.9, t: 3, every: 0.5, pct: 35, dtype: 'cold', st: [['chill', 100, 2]], fx: 'frost', color: COL.cold });
      ctl.wakeX = p.x; ctl.wakeY = p.y;
    }
    if (game.isStunned(p)) { setAnim(p, 'idle'); return; }

    if (ctl.queued >= 0) {
      ctl.queuedT -= dt;
      if (ctl.queuedT <= 0) ctl.queued = -1;
      else if (ctl.gcd <= 0) { const s = ctl.queued; ctl.queued = -1; game.useSkill(s); }
    }

    const mv = G.input.move, mag = Math.hypot(mv.x, mv.y);
    const stick = mag > 0.15;
    let acted = false;
    if (stick) {                                   // joystick overrides tap-to-move and any walk-to intent
      ctl.intent = null; ctl.path = null;
      if (ctl.lock <= 0) {
        const k = playerSpeed(p) * screenSpeedScale(mv.x, mv.y) * dt * Math.min(1, mag) / mag;
        W.move(p, mv.x * k, mv.y * k);
        p.facing = Math.atan2(mv.y, mv.x);
        setAnim(p, 'walk');
        ctl.visDirty = true;
      }
      acted = true;
    }
    if (G.input.attackHeld && S.scene !== 'town') {
      const t = game.pickTarget(weaponRange(p) ? 8 : 7);
      if (t) {
        ctl.intent = null;
        tryAttack(p, t, !stick, dt);
        acted = true;
      }
    }
    if (!acted && ctl.intent) { runIntent(p, dt); acted = !!ctl.intent || ctl.animLock > 0; }
    if (!acted) setAnim(p, 'idle');

    // visibility: only when the player changed tile, at most ~12×/s
    if (ctl.visT > 0) ctl.visT -= dt;
    if (ctl.visDirty && ctl.visT <= 0) {
      const tile = Math.floor(p.y) * S.map.w + Math.floor(p.x);
      if (tile !== ctl.visTile) {
        ctl.visTile = tile;
        ctl.visT = 0.08;
        if (G.world && G.world.updateVisibility) G.world.updateVisibility(S.map, p.x, p.y, game.floorHas('darkness') ? 5 : 9);
      }
      ctl.visDirty = false;
    }

    // G.state.targetId = what the attack button / skills would hit right now (engine name plate + UI target bar follow it)
    ctl.tgtT -= dt;
    if (ctl.tgtT <= 0) {
      ctl.tgtT = 0.15;
      const t = S.scene === 'dungeon' ? game.pickTarget(weaponRange(p) ? 8 : 7) || currentTarget() : null;
      S.targetId = t ? t.id : null;
    }

    // auto-pickup gold
    ctl.goldT -= dt;
    if (ctl.goldT <= 0) {
      ctl.goldT = 0.15;
      if (S.settings.autoPickupGold !== false && G.items && G.items.pickup) {
        const list = S.groundItems, r = st.pickupRadius;
        for (let i = list.length - 1; i >= 0; i--) {
          const g = list[i];
          if (!g || !g.item || g.item.type !== 'gold') continue;
          if (Math.abs(g.x - p.x) > r || Math.abs(g.y - p.y) > r || Math.hypot(g.x - p.x, g.y - p.y) > r) continue;
          pickup(p, g);
        }
      }
    }
  }

  game.update = function (dt) {
    const S = G.state, p = S.player;
    if (!p || !S.map) return;
    if (game.updateDeep) game.updateDeep(dt);
    game.updateMonsters(dt);
    if (!p.dead) updatePlayer(p, dt);
    else { p.animT += dt; S.targetId = null; }
    game.updateProjectiles(dt);
    game.updateZones(dt);
    if (game.updateLockdown) game.updateLockdown(dt);
    if (game.updateEvents) game.updateEvents(dt);
  };
})();
