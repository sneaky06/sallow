// Revision 7 campaign fights: the act bosses at depth 25 (the Choir) and 30 (Oswin Marrow, the Hearthking — the world boss),
// the Fallen (corrupted former adventurers, R7.6/R7.10) and the combat side of their relics. Story text lives with UI/meta
// (docs/STORY.md, src/ui/story_data.js); names here are data.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS, M = game.MONSTERS, SP = game.SPECIAL;

  function setAnim(e, a) { if (e.anim !== a) { e.anim = a; e.animT = 0; } }
  function avgDmg(e) { let a = (e.dmgMin + e.dmgMax) * 0.5; for (const f of e.effects) if (f.dealt) a *= Math.max(0.1, 1 + f.dealt / 100); return a; }
  function ezone(e, x, y, r, delay, mult, dtype, extra) {
    return game.addZone(Object.assign({ x: x, y: y, r: r, delay: delay, faction: 'enemy', dmg: avgDmg(e) * mult, dtype: dtype || 'phys', lvl: e.level, srcId: e.id,
      fx: dtype === 'cold' ? 'frost' : dtype === 'poison' ? 'poison' : 'explosion', color: COL[dtype || 'phys'] }, extra || {}));
  }
  function eshot(e, ang, mult, o) {
    return game.spawnProjectile({ x: e.x + Math.cos(ang) * 0.4, y: e.y + Math.sin(ang) * 0.4, ang: ang, speed: o.speed || 9, shape: o.shape || 'orb', color: o.color || '#ffffff',
      radius: 0.25, faction: 'enemy', dmg: avgDmg(e) * mult, dtype: o.dtype || 'phys', st: o.st || null, srcId: e.id, lvl: e.level, life: (o.range || 10) / (o.speed || 9) });
  }
  game.CB = { setAnim: setAnim, avgDmg: avgDmg, ezone: ezone, eshot: eshot };          // shared with bosses.js and fallen.js
  const BOSS = function (id, o) {
    M[id] = Object.assign({ id: id, arch: 'boss', hp: 1100, dmg: [8, 12], spd: 2.3, cd: 1.9, wind: 0.55, aggro: 12, xp: 400, armor: 10, r: 0.7, atk: 'melee', boss: true }, o);
    M[id].sprite = { body: o.body, color: o.color, accent: o.accent, scale: o.scale || 2, weapon: o.weapon || 'none' };
  };

  // ============================== act III boss: the Choir (depth 25) ==============================
  // Hymn: every note sends out a ring; the rings alternate safe (pale) and harmful (red) at 2.5 / 4.5 / 6.5 tiles. Dodge on the beat.
  // Discord (50%): it splits into three singers; only the one singing the wrong note (inverted colours) can be hurt, and the
  //   wrong note moves every 6 s. Damage to a wrong-note singer is the Choir's.
  // Last Verse (20%): it rejoins and sings faster. Every 8 s it swells to inhale for 1.5 s: hit it then and it falls silent
  //   (stunned, no notes) for 3 s; otherwise it lets out the verse — a 5.5-tile blast that stuns.
  BOSS('boss_choir', { n: 'The Choir', theme: 'abyss', body: 'wraith', color: '#c8a090', accent: '#ff6a8a', scale: 2.3, hp: 1250, dmg: [9, 13], dtype: 'lightning',
    res: { lightning: 50, cold: 30 }, special: 'choir', desc: 'Many mouths. One hymn.',
    phases: [
      { at: 1, moves: [
        { id: 'Shriek', kind: 'fan', cd: 6, n: 5, spread: 0.24, tele: 0.5, mult: 0.8, dtype: 'lightning', proj: { shape: 'bolt', color: '#ff9ab0', speed: 10 } }] },
      { at: 0.5, say: 'The Choir comes apart into three voices. One of them is wrong.', moves: [
        { id: 'Discord', kind: 'circles', cd: 9, n: 3, r: 1.8, spread: 3, tele: 1.0, mult: 1.2, dtype: 'lightning', color: '#ff6a8a' }] },
      { at: 0.2, say: 'The voices rejoin for the last verse.', enrage: true, moves: [
        { id: 'Crescendo', kind: 'ring', cd: 7, n: 14, tele: 0.7, mult: 0.8, dtype: 'lightning', proj: { shape: 'orb', color: '#ff9ab0', speed: 6.5 } }] },
    ] });
  M.choir_singer = { id: 'choir_singer', n: 'A Voice of the Choir', arch: 'brute', theme: 'event', hp: 20, dmg: [0, 0], spd: 0, cd: 99, wind: 1, aggro: 0, xp: 0, armor: 0, r: 0.5,
    atk: 'melee', special: 'inert', sprite: { body: 'wraith', color: '#c8a090', accent: '#ff6a8a', scale: 1.6, weapon: 'none' }, desc: 'One of many mouths.' };
  const RINGS = [2.5, 4.5, 6.5];
  SP.choir = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep' || p.dead) return false;
    // the hymn: notes on a beat
    const silent = ai.silentT > 0;
    if (silent) ai.silentT -= dt;
    ai.noteT = (ai.noteT === undefined ? 1 : ai.noteT) - dt;
    if (ai.noteT <= 0 && !silent) {
      ai.noteT = ai.phase >= 2 ? 1.0 : 1.5;
      ai.note = (ai.note || 0) + 1;
      const bad = ai.note % 2 === 0, R = RINGS[ai.note % 3];
      U.fx('ring', e.x, e.y, { radius: R, color: bad ? '#ff3b4e' : '#ffe0e8', duration: 0.5 });
      ai.pend = bad ? { t: 0.5, R: R } : null;
    }
    if (ai.pend && (ai.pend.t -= dt) <= 0) {
      const R = ai.pend.R, pd = Math.hypot(p.x - e.x, p.y - e.y);
      ai.pend = null;
      U.fx('nova', e.x, e.y, { radius: R, color: '#ff3b4e' }); U.sfx('bolt');
      if (Math.abs(pd - R) < 1.0 && !game.getEffect(p, 'invuln')) game.applyHit(p, { lightning: avgDmg(e) * 1.1 }, { src: e, lvl: e.level });
    }
    // Discord: three singers
    if (ai.phase === 1) {
      if (!ai.singers) {
        ai.singers = [e.id];
        for (let k = 0; k < 2; k++) {
          const a = Math.atan2(p.y - e.y, p.x - e.x) + (k ? 2.1 : -2.1), s = W.free(e.x + Math.cos(a) * 4, e.y + Math.sin(a) * 4, 2) || { x: e.x, y: e.y };
          const v = game.createMonster('choir_singer', s.x, s.y, e.level, 'normal', null, true);
          v.stats.hpMax = v.hp = 1e6; v.noLoot = true; v.bossAdd = e.id; v.ai.st = 'chase'; v.name = 'The Choir';
          G.state.entities.push(v); ai.singers.push(v.id);
          U.fx('teleport', s.x, s.y, { color: '#ff6a8a' });
        }
        ai.wrongT = 0;
      }
      ai.wrongT -= dt;
      if (ai.wrongT <= 0) { ai.wrongT = 6; ai.wrong = U.rng.int(0, ai.singers.length - 1); U.sfx('cast'); }
      for (let k = 0; k < ai.singers.length; k++) {
        const s = game.byId(ai.singers[k]);
        if (!s || s.dead) continue;
        const wrong = k === ai.wrong;
        s.sprite.accent = wrong ? '#00e8ff' : '#ff6a8a';
        if (!wrong) game.addEffect(s, { id: 'invuln', t: 0.3 });
        else if (s !== e) {
          game.removeEffect(s, 'invuln');
          const lost = s.stats.hpMax - s.hp;
          s.hp = s.stats.hpMax;
          if (lost > 0) { e.hp -= lost; if (e.hp <= 0) { e.hp = 0; game.kill(e, p); return true; } }
        }
        if (wrong && (ai.wrongFx = (ai.wrongFx || 0) - dt) <= 0) { ai.wrongFx = 0.5; U.fx('ring', s.x, s.y, { radius: 1.1, color: '#00e8ff', duration: 0.45 }); }
      }
      if (ai.wrong !== 0) game.addEffect(e, { id: 'invuln', t: 0.3 });
      else game.removeEffect(e, 'invuln');
    } else if (ai.singers && ai.phase >= 2) {
      for (const id of ai.singers) { const s = game.byId(id); if (s && s !== e) { U.fx('smoke', s.x, s.y, { color: '#ff6a8a' }); G.state.entities.splice(G.state.entities.indexOf(s), 1); } }
      ai.singers = null; game.removeEffect(e, 'invuln');
    }
    // Last Verse: the inhale
    if (ai.phase >= 2) {
      if (ai.inhale) {
        const s = ai.inhale;
        s.t -= dt; setAnim(e, 'cast');
        if (e.hp < s.hp0) {
          ai.inhale = null; ai.inhaleT = 8; ai.silentT = 3;
          game.applyStatus(e, 'stun', 10);
          U.text(e.x, e.y - 1.8, 'Silenced', '#ffd0dc', true); U.sfx('hit'); U.shake(3, 0.2);
          return true;
        }
        if (s.t > 0) return true;
        ai.inhale = null; ai.inhaleT = 8;
        U.fx('nova', e.x, e.y, { radius: 5.5, color: '#ff6a8a' }); U.sfx('bolt'); U.shake(5, 0.35);
        if (Math.hypot(p.x - e.x, p.y - e.y) <= 5.5 + p.radius * 0.5 && !game.getEffect(p, 'invuln')) {
          game.applyHit(p, { lightning: avgDmg(e) * 2.2 }, { src: e, lvl: e.level });
          game.applyStatus(p, 'stun', 1);
        }
        return true;
      }
      ai.inhaleT = (ai.inhaleT === undefined ? 4 : ai.inhaleT) - dt;
      if (ai.inhaleT <= 0 && d < 10) {
        ai.cast = null;
        ai.inhale = { t: 1.5, hp0: e.hp };
        U.fx('ring', e.x, e.y, { radius: 5.5, color: '#ff6a8a', duration: 1.5 });
        U.text(e.x, e.y - 1.8, 'The Choir swells to inhale…', '#ffd0dc', true); U.sfx('cast');
        return true;
      }
    }
    return false;
  };

  // ============================== the world boss: Oswin Marrow, the Hearthking (depth 30) ==============================
  // I  (100–60%) a tired, clean swordsman: readable three-hit combos (dash through a swing for a Close Call), a charge, a sweep.
  // II (60–25%) the roots tear him open: root lashes (telegraphed lines), lingering pools; every 12 s the Ember is exposed for
  //    3 s (+100% damage taken) — deal 8% of his life in the window or he drinks from it and heals 6%.
  // III (<25%) the thing itself: the floor inverts on a pulse — INWARD hits everything near him, OUTWARD everything far from
  //    him — and the Factor counts your dashes: "One. Two. Three." On three, the thing is upon you.
  BOSS('boss_world', { n: 'Oswin Marrow, the Hearthking', theme: 'abyss', body: 'humanoid', color: '#5a3a2a', accent: '#ff8a2b', scale: 2.0, weapon: 'sword',
    hp: 1500, dmg: [10, 14], spd: 2.5, dtype: 'phys', res: { fire: 50, cold: 25, lightning: 25, poison: 25 }, special: 'hearthking', worldBoss: true,
    desc: 'The founder. The hearth. The wound.',
    phases: [
      { at: 1, moves: [
        { id: 'Founder\'s Cut', kind: 'fan', cd: 5.5, n: 3, spread: 0.2, tele: 0.45, mult: 1.0, proj: { shape: 'shard', color: '#ffd0a0', speed: 11 } },
        { id: 'Hearth Sweep', kind: 'slam', cd: 6.5, r: 2.8, tele: 0.85, mult: 1.6, dtype: 'fire', color: '#ff8a2b' },
        { id: 'Throne Charge', kind: 'charge', cd: 9, first: 5, tele: 0.8, mult: 1.7, dist: 9 }] },
      { at: 0.6, say: 'The roots tear Oswin open. Something red beats inside him.', moves: [
        { id: 'Rootfall', kind: 'circles', cd: 9, first: 1, n: 4, r: 1.8, spread: 3.5, tele: 1.0, mult: 1.0, dtype: 'poison', color: '#a04040', linger: { t: 4, every: 0.5, mult: 0.3 } },
        { id: 'Hearth Sweep', kind: 'slam', cd: 7, r: 3.0, tele: 0.85, mult: 1.6, dtype: 'fire', color: '#ff8a2b' }] },
      { at: 0.25, say: 'Oswin is gone. The thing he carried stands up.', enrage: true, moves: [
        { id: 'Heartbeat', kind: 'ring', cd: 6, n: 16, tele: 0.7, mult: 0.8, dtype: 'fire', proj: { shape: 'orb', color: '#ff3b2e', speed: 6 } }] },
    ] });
  function comboSwing(e, p, n) {          // one swing of the Founder's combo: a short glow where the blade will land
    const a = Math.atan2(p.y - e.y, p.x - e.x), x = e.x + Math.cos(a) * 1.4, y = e.y + Math.sin(a) * 1.4, tele = n === 1 ? 0.6 : 0.42;
    U.fx('ring', x, y, { radius: 1.7, color: '#ffd0a0', duration: tele });
    e.facing = a;
    return { t: tele, x: x, y: y, a: a, n: n };
  }
  SP.hearthking = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep' || p.dead) return false;
    const ph = ai.phase;
    if (ph === 0) {          // the Founder: three-hit combos with a readable rhythm
      if (ai.combo) {
        const c = ai.combo;
        c.t -= dt; setAnim(e, 'attack');
        if (c.t > 0) return true;
        const zx = c.x, zy = c.y, inIt = Math.hypot(p.x - zx, p.y - zy) <= 1.7 + p.radius * 0.5;
        U.fx('slash', zx, zy, { angle: c.a, radius: 1.7, color: '#ffd0a0' }); U.sfx('swing');
        if (inIt) {
          if (game.getEffect(p, 'invuln')) { if (game.closeCall) game.closeCall({ r: 1.7 }); }
          else game.monsterHit(e, p, { mult: c.n === 1 ? 1.6 : 1.1, melee: true });
        }
        ai.combo = c.n > 1 ? comboSwing(e, p, c.n - 1) : null;
        if (!ai.combo) ai.comboT = 4.5;
        return true;
      }
      ai.comboT = (ai.comboT === undefined ? 2 : ai.comboT) - dt;
      if (ai.comboT <= 0 && d < 3.5 && !ai.cast) { ai.combo = comboSwing(e, p, 3); return true; }
    }
    if (ph >= 1) {
      // root lashes: 2–3 telegraphed lines from his feet
      ai.lashT = (ai.lashT === undefined ? 2 : ai.lashT) - dt;
      if (ai.lashT <= 0) {
        ai.lashT = ph >= 2 ? 3 : 3.8;
        const base = Math.atan2(p.y - e.y, p.x - e.x), n = ph >= 2 ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const a = base + (k - (n - 1) / 2) * 0.55;
          for (let s = 1; s <= 7; s++) ezone(e, e.x + Math.cos(a) * s * 1.1, e.y + Math.sin(a) * s * 1.1, 0.6, 0.9 + s * 0.04, 0.9, 'phys', { color: '#a04040' });
        }
        U.sfx('cast');
      }
      // the Ember exposed
      ai.heartT = (ai.heartT === undefined ? 4 : ai.heartT) - dt;
      if (ai.heart) {
        ai.heart.t -= dt;
        if (ai.heart.t <= 0) {
          const dealt = ai.heart.hp0 - e.hp;
          if (dealt < e.stats.hpMax * 0.08) {
            game.heal(e, e.stats.hpMax * 0.06); U.fx('heal', e.x, e.y, { color: '#ff3b2e' });
            U.text(e.x, e.y - 2, 'The Ember feeds', '#ff6a5a', true);
          } else U.text(e.x, e.y - 2, 'The Ember falters', '#ffd0a0', true);
          ai.heart = null;
        }
      } else if (ai.heartT <= 0) {
        ai.heartT = 12;
        ai.heart = { t: 3, hp0: e.hp };
        game.addEffect(e, { id: 'ember_exposed', t: 3, taken: 100 });
        U.fx('ring', e.x, e.y, { radius: 1.6, color: '#ff3b2e', duration: 3 });
        U.text(e.x, e.y - 2, 'THE EMBER IS EXPOSED', '#ff3b2e', true); U.sfx('shrine');
      }
    }
    if (ph >= 2) {
      if (!ai.thing) {           // the body changes
        ai.thing = true;
        e.sprite = { body: 'demon', color: '#3a0a0a', accent: '#ff3b2e', scale: 2.3, weapon: 'none' };
        e.name = 'The Ember';
        U.fx('nova', e.x, e.y, { radius: 5, color: '#ff3b2e' }); U.shake(8, 0.6);
      }
      // the floor inverts on a pulse
      ai.pulseT = (ai.pulseT === undefined ? 3 : ai.pulseT) - dt;
      if (ai.pulse) {
        ai.pulse.t -= dt;
        if (ai.pulse.t <= 0) {
          const inward = ai.pulse.inward, R = 4.5, pd = Math.hypot(p.x - e.x, p.y - e.y);
          U.fx('nova', e.x, e.y, { radius: inward ? R : 9, color: '#ff3b2e' }); U.shake(5, 0.3); U.sfx('fire');
          if ((inward ? pd <= R : pd > R) && !game.getEffect(p, 'invuln')) game.applyHit(p, { fire: avgDmg(e) * 1.8 }, { src: e, lvl: e.level });
          ai.pulse = null;
        }
      } else if (ai.pulseT <= 0) {
        ai.pulseT = 7;
        ai.pulse = { t: 1.4, inward: !ai.lastInward };
        ai.lastInward = ai.pulse.inward;
        U.fx('ring', e.x, e.y, { radius: 4.5, color: ai.pulse.inward ? '#ff3b2e' : '#ffd0a0', duration: 1.4 });
        U.text(e.x, e.y - 2, ai.pulse.inward ? 'INWARD' : 'OUTWARD', '#ffd0a0', true);
      }
      // the Factor counts your dashes
      const n = game.dashCount || 0;
      if (ai.dash0 === undefined) ai.dash0 = n;
      if (n > ai.dash0) {
        ai.counted = (ai.counted || 0) + (n - ai.dash0); ai.dash0 = n;
        const word = ['One.', 'Two.', 'Three.'][Math.min(2, ai.counted - 1)];
        U.toast('The Factor: "' + word + '"', '#b8b8b8');
        if (ai.counted >= 3) {
          ai.counted = 0;
          const spot = W.free(p.x + U.rand(-1, 1), p.y + U.rand(-1, 1), 2);
          if (spot) { U.fx('teleport', e.x, e.y, { color: '#ff3b2e' }); e.x = spot.x; e.y = spot.y; e.ai.path = null; }
          ezone(e, e.x, e.y, 2.4, 0.5, 1.8, 'fire', { shake: 5, color: '#ff3b2e' });
        }
      }
    }
    return false;
  };
  game.dashCount = 0;
  G.on('scene:changed', function () { game.dashCount = 0; });

  // ---- which boss lives where: the story's act bosses, then the first four again with a tier ----
  game.ACT_BOSSES = { 5: 'boss_gravelord', 10: 'boss_broodmother', 15: 'boss_tyrant', 20: 'boss_hollow', 25: 'boss_choir', 30: 'boss_world' };
  game.bossForDepth = function (depth) {
    const d = Math.max(1, depth | 0), at = Math.ceil(d / G.C.BOSS_EVERY) * G.C.BOSS_EVERY;
    if (game.ACT_BOSSES[at]) return { id: game.ACT_BOSSES[at], tier: 0 };
    const idx = Math.ceil(d / G.C.BOSS_EVERY) - 7;          // depth 35 → the Gravelord II, 40 → the Broodmother II …
    return { id: game.BOSS_ORDER[((idx % 4) + 4) % 4], tier: 1 + Math.floor(Math.max(0, idx) / 4) };
  };
  // The world boss drops a Tome of Insight (the title is the story team's, on monster:killed).
  G.on('monster:killed', function (ev) {
    const m = ev && ev.monster;
    if (!m || !M[m.monsterId] || !M[m.monsterId].worldBoss) return;
    if (G.items && G.items.grantTome) { try { G.items.grantTome(1); } catch (err) { console.error('[game] grantTome failed', err); } }
    G.state.flags.worldBossKilled = true;
  });

  // ============================== the Fallen (R7.6 / R7.10) ==============================
  // FALLEN[adventurerId] = { depth, monsterId, ... }. A Fallen waits on its depth (never a boss floor) until killed, once per
  // floor visit, in a room away from the stairs; it is optional (it does not leave its room until you come close) and
  // announced on first sight. Killing it grants the relic of the same id (G.items.grantRelic) and records
  // state.flags.fallenSlain. Entities: fallen: true, adventurerId, monsterId 'adv_<id>'.
  const FALLEN = game.FALLEN = {};
  const fallen = function (id, o) {
    FALLEN[id] = o;
    M['adv_' + id] = Object.assign({ id: 'adv_' + id, arch: o.arch || 'melee', hp: 40, dmg: [4, 6], spd: 3, cd: 1.2, wind: 0.35, aggro: 8, xp: 60, armor: 10, r: 0.34, atk: 'melee', theme: 'fallen' }, o.def,
      { special: 'fallen_' + id, n: o.name, desc: o.story });
    M['adv_' + id].sprite = o.sprite;
  };

  game.defineFallen = fallen;

  // Brannoc the Unbent (warrior, 9): his shield faces you and stops most of a frontal hit; he turns slowly. Every 7 s he
  // lowers his head and charges in a line (knockback); after the charge he stands winded for 1.6 s. Flank him. Below half
  // life he plants himself: no more charges, a ring of spikes every 4.5 s.
  fallen('fallen_2', { depth: 9, name: 'Brannoc the Unbent', classId: 'warrior', story: 'He held the stair for forty days. The shield never came off.',
    sprite: { body: 'humanoid', color: '#6a6a72', accent: '#c96a3a', scale: 1.35, weapon: 'mace' }, def: { hp: 60, dmg: [5, 8], armor: 30, spd: 2.6 } });
  game.guardMult = function (t, src) {
    if (t.guardDown > G.state.time) return 1;
    let a = Math.atan2(src.y - t.y, src.x - t.x) - t.guard;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    if (Math.abs(a) > 1.05) return 1;
    if (!(t.blockTxt > G.state.time)) { t.blockTxt = G.state.time + 0.6; U.text(t.x, t.y - 1.3, 'Shield', '#c9c2b0'); U.sfx('hit'); }
    return 0.15;
  };
  SP.fallen_fallen_2 = function (e, def, t, d, dt, p) {
    const ai = e.ai, now = G.state.time;
    if (e.guard === undefined) e.guard = e.facing;
    // the shield turns toward you, slowly
    let want = Math.atan2(p.y - e.y, p.x - e.x) - e.guard;
    while (want > Math.PI) want -= Math.PI * 2;
    while (want < -Math.PI) want += Math.PI * 2;
    if (!(e.guardDown > now)) e.guard += U.clamp(want, -1.5 * dt, 1.5 * dt);
    if (ai.rush) {
      const r = ai.rush;
      r.t -= dt;
      if (r.t > 0) { e.facing = r.a; setAnim(e, 'cast'); return true; }
      for (let i = 0; i < 40; i++) {
        if (!W.move(e, Math.cos(r.a) * 0.2, Math.sin(r.a) * 0.2)) break;
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.radius + 0.4 && !r.hit) {
          r.hit = true;
          game.monsterHit(e, p, { mult: 1.8, melee: true, undodgeable: true });
          if (!game.getEffect(p, 'invuln')) { for (let k = 0; k < 12; k++) if (!W.move(p, Math.cos(r.a) * 0.2, Math.sin(r.a) * 0.2)) break; game.applyStatus(p, 'stun', 0.5); if (game.onPlayerMoved) game.onPlayerMoved(true); }
        }
      }
      ai.rush = null; ai.path = null;
      e.guardDown = now + 1.6; game.addEffect(e, { id: 'winded', t: 1.6, stun: true });
      U.text(e.x, e.y - 1.3, 'Winded', '#ffd0a0', true); U.shake(4, 0.2);
      return true;
    }
    if (e.hp < e.stats.hpMax * 0.5 && !ai.rush) {          // below half: he plants himself and the stair grows spikes around him
      if (!ai.planted) { ai.planted = true; U.text(e.x, e.y - 1.4, 'Brannoc plants his feet', '#ffd0a0', true); U.shake(3, 0.2); }
      ai.spikeT = (ai.spikeT === undefined ? 1 : ai.spikeT) - dt;
      if (ai.spikeT <= 0) { ai.spikeT = 4.5; ezone(e, e.x, e.y, 3, 1.0, 1.5, 'phys', { color: '#c9c2b0', shake: 3 }); U.text(e.x, e.y - 1.3, 'Spikes!', '#ffd0a0', true); }
      e.facing = Math.atan2(p.y - e.y, p.x - e.x);
      ai.bashT = (ai.bashT || 0) - dt;
      if (d < e.radius + p.radius + 1 && ai.bashT <= 0) { ai.bashT = 1.6; U.fx('slash', p.x, p.y, { angle: e.facing, radius: 0.9 }); game.monsterHit(e, p, { melee: true }); }
      setAnim(e, 'idle');
      return true;
    }
    ai.rushCd = (ai.rushCd === undefined ? 4 : ai.rushCd) - dt;
    if (ai.rushCd <= 0 && d > 2 && d < 9 && ai.st !== 'sleep') {
      ai.rushCd = 7;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      ai.rush = { t: 0.9, a: a };
      for (let k = 1; k <= 4; k++) U.fx('ring', e.x + Math.cos(a) * k * 1.8, e.y + Math.sin(a) * k * 1.8, { radius: 0.8, color: '#ff5b5b', duration: 0.9 });
      U.text(e.x, e.y - 1.3, 'Brannoc lowers his head', '#ffd0a0', true);
      return true;
    }
    return false;
  };

  // Wren Halloway, the Cartographer (ranger, 16): always moving and shooting; lays snare lines between you; every 10 s she
  // stops to count her steps for 2.5 s — then she takes 60% more damage.
  fallen('fallen_4', { depth: 16, name: 'Wren Halloway, the Cartographer', classId: 'ranger', story: 'She maps the Deep by counting steps. Her arrows are her own bone.',
    sprite: { body: 'humanoid', color: '#3f5a3a', accent: '#e8e0c8', scale: 1.2, weapon: 'bow' },
    def: { arch: 'ranged', atk: 'shot', range: 7.5, hp: 34, dmg: [5, 7], spd: 3.4, cd: 1.0, wind: 0.3, proj: { shape: 'shard', color: '#e8e0c8', speed: 12 } } });
  SP.fallen_fallen_4 = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep') return false;
    if (ai.count) {
      ai.count.t -= dt; setAnim(e, 'idle');
      const n = 10 - Math.ceil(ai.count.t * 4);
      if (n > ai.count.said && n > 0 && n <= 10) { ai.count.said = n; U.text(e.x, e.y - 1.4, String(n), '#e8e0c8'); }
      if (ai.count.t > 0) return true;
      ai.count = null;
      return false;
    }
    ai.countT = (ai.countT === undefined ? 10 : ai.countT) - dt;
    if (ai.countT <= 0) {
      ai.countT = 10;
      ai.count = { t: 2.5, said: 0 };
      game.addEffect(e, { id: 'counting', t: 2.5, taken: 60 });
      U.text(e.x, e.y - 1.6, 'Wren stops to count', '#ffd0a0', true);
      return true;
    }
    if (ai.dark) {          // vanished: untouchable, firing from the dark; every arrow glints first
      ai.dark.t -= dt;
      if ((ai.dark.shotT -= dt) <= 0) {
        ai.dark.shotT = 0.8;
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        U.fx('spark', e.x + Math.cos(a) * 0.6, e.y + Math.sin(a) * 0.6, { color: '#ffffff' });
        ai.dark.glint = { t: 0.45, a: a };
      }
      if (ai.dark.glint && (ai.dark.glint.t -= dt) <= 0) { eshot(e, ai.dark.glint.a, 1.1, { shape: 'shard', color: '#e8e0c8', speed: 13 }); ai.dark.glint = null; U.sfx('arrow'); }
      if (ai.dark.t > 0) return true;
      ai.dark = null; e.cloaked = false;
      game.removeEffect(e, 'invuln');
      U.fx('smoke', e.x, e.y, {});
      return true;
    }
    ai.darkT = (ai.darkT === undefined ? 6 : ai.darkT) - dt;
    if (ai.darkT <= 0 && d < 10) {
      ai.darkT = 12;
      ai.dark = { t: 3, shotT: 0.3, glint: null };
      e.cloaked = true;
      game.addEffect(e, { id: 'invuln', t: 3 });
      U.fx('smoke', e.x, e.y, {}); U.text(e.x, e.y - 1.4, 'Wren slips into the dark', '#c8c8a0');
      const s = W.free(p.x + U.rand(-6, 6), p.y + U.rand(-6, 6), 3);
      if (s) { e.x = s.x; e.y = s.y; ai.path = null; }
      return true;
    }
    ai.snareT = (ai.snareT === undefined ? 3 : ai.snareT) - dt;
    if (ai.snareT <= 0 && d < 9) {
      ai.snareT = 5;
      const mx = (e.x + p.x) / 2, my = (e.y + p.y) / 2, a = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2;
      for (let k = -2; k <= 2; k++) {
        const x = mx + Math.cos(a) * k * 0.9, y = my + Math.sin(a) * k * 0.9;
        if (!W.walkable(x, y)) continue;
        game.zones.push({ x: x, y: y, r: 0.7, delay: 0, t: 12, trap: true, faction: 'enemy', dmg: avgDmg(e) * 0.5, dtype: 'phys', lvl: e.level, srcId: e.id,
          st: ['slow', 100, 2, 0.6], fx: 'spark', color: '#e8e0c8', acc: 0, pulse: 0 });
      }
      U.sfx('click');
    }
    // keep moving: strafe around you at range while the default logic shoots
    const a2 = Math.atan2(e.y - p.y, e.x - p.x) + 1.4 * dt * (e.id % 2 ? 1 : -1), want = 6;
    const tx = p.x + Math.cos(a2) * want, ty = p.y + Math.sin(a2) * want, dx = tx - e.x, dy = ty - e.y, dl = Math.hypot(dx, dy) || 1;
    if (!ai.wind) W.move(e, dx / dl * e.speed * 0.5 * dt, dy / dl * e.speed * 0.5 * dt);
    return false;
  };

  // Magister Ilse Varr (sorcerer, 24): novas that grow every time; bottles that land and burst late; she burns herself
  // (1.2% of her life a second), so surviving is a way of winning.
  fallen('fallen_8', { depth: 24, name: 'Magister Ilse Varr', classId: 'sorcerer', story: 'She bottled rift heat to sell. She drank the first bottle.',
    sprite: { body: 'caster', color: '#7a2a1a', accent: '#ffb347', scale: 1.25, weapon: 'staff' },
    def: { arch: 'caster', atk: 'shot', range: 7, hp: 44, dmg: [6, 9], spd: 2.5, cd: 1.8, wind: 0.5, dtype: 'fire', res: { fire: 75 }, proj: { shape: 'fireball', color: '#ff7a2b', speed: 9 } } });
  SP.fallen_fallen_8 = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep') return false;
    ai.burnT = (ai.burnT || 0) + dt;
    if (ai.burnT >= 0.5) { ai.burnT -= 0.5; e.hp -= e.stats.hpMax * 0.006; if (e.hp <= 0) { e.hp = 0; game.kill(e, p); return true; } U.fx('spark', e.x, e.y, { color: COL.fire }); }
    ai.novaT = (ai.novaT === undefined ? 3 : ai.novaT) - dt;
    if (ai.novaT <= 0) {
      ai.novaT = 6;
      ai.novaR = Math.min(6, (ai.novaR || 1.6) + 0.6);
      ezone(e, e.x, e.y, ai.novaR, 1.0, 1.4, 'fire', { shake: 3, st: ['burn', 100, 3, 0.15] });
      U.text(e.x, e.y - 1.5, 'The heat grows', '#ffb347', true);
    }
    ai.bottleT = (ai.bottleT === undefined ? 2 : ai.bottleT) - dt;
    if (ai.bottleT <= 0 && d < 9) {
      ai.bottleT = 4;
      for (let k = 0; k < 3; k++) {
        const s = W.free(p.x + U.rand(-2.5, 2.5), p.y + U.rand(-2.5, 2.5), 2);
        if (s) ezone(e, s.x, s.y, 1.6, 2.2, 1.3, 'fire', { color: '#ffb347' });
      }
      U.sfx('fire');
    }
    return false;
  };

  // Old Tobiah Crane (necromancer, 28): raises the corpses you leave (two every 4 s within 9 tiles); each risen servant makes
  // him stronger; with no corpses near him he is weakened (+40% damage taken). Clean floors beat him.
  fallen('fallen_9', { depth: 28, name: 'Old Tobiah Crane', classId: 'necromancer', story: 'He went down to fetch the dead and stayed to lead them.',
    sprite: { body: 'caster', color: '#3b3a2a', accent: '#8ee06a', scale: 1.25, weapon: 'staff' },
    def: { arch: 'caster', atk: 'shot', range: 7, hp: 40, dmg: [5, 8], spd: 2.4, cd: 2.0, wind: 0.5, dtype: 'poison', proj: { shape: 'orb', color: '#8ee06a', speed: 8 } } });
  SP.fallen_fallen_9 = function (e, def, t, d, dt, p) {
    const ai = e.ai;
    if (ai.st === 'sleep') return false;
    if (e.hp < e.stats.hpMax * 0.3) {          // below 30%: his dead pile onto him as a shield; break them one by one
      if (!ai.pile) {
        ai.pile = [];
        for (let k = 0; k < 4; k++) {
          const a = k / 4 * Math.PI * 2, s = W.free(e.x + Math.cos(a) * 1.1, e.y + Math.sin(a) * 1.1, 1) || { x: e.x, y: e.y };
          const b = game.createMonster('skeleton', s.x, s.y, Math.max(1, e.level - 2), 'normal');
          b.stats.hpMax = b.hp = Math.round(e.stats.hpMax * 0.05); b.speed = 0; b.atkCd = 1e6; b.ai.atk = 1e6; b.noLoot = true; b.xp = 0; b.bossAdd = e.id;
          b.name = 'Piled Dead'; b.ai.st = 'chase'; b.pileOf = e.id;
          G.state.entities.push(b); ai.pile.push(b.id);
        }
        U.text(e.x, e.y - 1.5, 'The dead pile onto him', '#c8c8a0', true);
      }
      const up = ai.pile.filter(function (id) { const b = game.byId(id); return b && !b.dead; }).length;
      if (up) game.addEffect(e, { id: 'invuln', t: 0.3 });
    }
    ai.shovelT = (ai.shovelT === undefined ? 4 : ai.shovelT) - dt;          // the shovel line: a slow, slowing furrow toward you
    if (ai.shovelT <= 0 && d < 8) {
      ai.shovelT = 6;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      for (let s = 1; s <= 6; s++) ezone(e, e.x + Math.cos(a) * s, e.y + Math.sin(a) * s, 0.65, 0.6 + s * 0.12, 1.1, 'phys', { st: ['slow', 100, 2, 0.5], color: '#8a6a4a' });
      U.text(e.x, e.y - 1.4, 'Crane digs', '#c8c8a0');
    }
    ai.raiseT = (ai.raiseT === undefined ? 2 : ai.raiseT) - dt;
    if (ai.raiseT > 0) return false;
    ai.raiseT = 4;
    const ents = G.state.entities;
    let raised = 0, near = 0, servants = 0;
    for (const o of ents) if (o.bossAdd === e.id && !o.dead) servants++;
    for (let i = 0; i < ents.length; i++) {
      const c = ents[i];
      if (!c.dead || c.type !== 'monster' || c.faction !== 'enemy' || c.exploded || c.noCorpse || c === e || !(c.ai && c.ai.corpse > 0.3)) continue;
      if (Math.hypot(c.x - e.x, c.y - e.y) > 9) continue;
      near++;
      if (raised >= 2 || servants + raised >= 6 || game.fxOf(p).extra_minion) continue;
      c.exploded = true; c.ai.corpse = 0.01;
      const r = game.createMonster(c.monsterId === 'adv_fallen_9' ? 'skeleton' : c.monsterId, c.x, c.y, Math.max(1, e.level - 2), 'normal');
      r.stats.hpMax = r.hp = Math.round(r.stats.hpMax * 0.6); r.noLoot = true; r.xp = 0; r.bossAdd = e.id; r.risen = true;
      r.name = 'Risen ' + M[r.monsterId].n; r.ai.st = 'chase'; r.ai.atk = 0.8;
      ents.push(r); raised++;
      U.fx('teleport', c.x, c.y, { color: '#8ee06a' });
    }
    servants += raised;
    e.effects = e.effects.filter(function (f) { return f.id !== 'crane_host' && f.id !== 'crane_bare'; });
    if (servants) e.effects.push({ id: 'crane_host', t: 4.5, dealt: 8 * Math.min(6, servants), taken: -4 * Math.min(6, servants) });
    if (!near && !servants) { e.effects.push({ id: 'crane_bare', t: 4.5, taken: 40 }); U.text(e.x, e.y - 1.4, 'Nothing to raise', '#c8c8a0'); }
    if (raised) { U.text(e.x, e.y - 1.5, 'Rise.', '#8ee06a', true); U.sfx('cast'); }
    return false;
  };

  function fallenRoom(map) {
    let best = null, bd = -1;
    for (const r of map.rooms || []) {
      if (r.type === 'boss' || r.type === 'lockdown' || r.type === 'start' || r.type === 'exit') continue;
      const cx = r.x + (r.w >> 1) + 0.5, cy = r.y + (r.h >> 1) + 0.5, d = Math.hypot(cx - map.spawn.x, cy - map.spawn.y);
      if (d > 14 && d > bd && W.walkable(cx, cy)) { bd = d; best = { x: cx, y: cy }; }
    }
    if (best) return best;
    const rng = G.rng.create(((map.seed | 0) ^ 0x1b873593) >>> 0);          // no rooms (caves): the furthest of a few samples
    for (let k = 0; k < 200; k++) {
      const x = rng.int(1, map.w - 2) + 0.5, y = rng.int(1, map.h - 2) + 0.5, d = Math.hypot(x - map.spawn.x, y - map.spawn.y);
      if (d > 10 && d > bd && W.walkable(x, y)) { bd = d; best = { x: x, y: y }; }
    }
    return best;
  }
  game.createFallen = function (id, x, y, depth) {
    const F = FALLEN[id], L = game.monsterLevel(depth) + 3;
    const e = game.createMonster('adv_' + id, x, y, L, 'normal', null, true);
    e.rarity = 'legendary'; e.fallen = true; e.adventurerId = id; e.classId = F.classId; e.name = F.name; e.noLoot = false;
    e.stats.hpMax = e.hp = Math.round(e.stats.hpMax * 6 * (depth <= 6 ? 0.7 : 1.4));          // a legendary's life, and then some (the first two are gentler)
    e.dmgMin *= 1.45; e.dmgMax *= 1.45; e.xp = Math.round(e.xp * 6); e.aggro = 6;          // R10: was ×18 — levelled bots to the cap by depth 25
    return e;
  };
  game.fallenFor = function (depth) {
    for (const id in FALLEN) { const at = FALLEN[id].depth % G.C.BOSS_EVERY === 0 ? FALLEN[id].depth + 1 : FALLEN[id].depth; if (at === depth) return id; }      // a boss-floor depth moves one down
    return null;
  };
  G.on('scene:changed', function (ev) {
    const S = G.state, map = ev && ev.map;
    if (!map || ev.scene !== 'dungeon' || !S.player) return;
    const depth = map.depth | 0, id = game.fallenFor(depth), slain = S.flags.fallenSlain || [];
    if (!id || slain.indexOf(id) >= 0 || depth % G.C.BOSS_EVERY === 0) return;
    if (G.items && G.items.hasRelic && G.items.hasRelic(id)) return;
    const at = fallenRoom(map);
    if (!at) return;
    S.entities.push(game.createFallen(id, at.x, at.y, depth));
    U.toast('Someone else came this way. They are still here.', '#ff9a3a');
  });
  G.on('monster:killed', function (ev) {
    const m = ev && ev.monster, S = G.state;
    if (!m || !m.fallen) return;
    const f = S.flags;
    if (!Array.isArray(f.fallenSlain)) f.fallenSlain = [];
    if (f.fallenSlain.indexOf(m.adventurerId) < 0) f.fallenSlain.push(m.adventurerId);
    for (const o of S.entities) if (o.bossAdd === m.id && !o.dead) { o.hp = 0; game.kill(o, S.player); }
    if (G.items && G.items.grantRelic) { try { G.items.grantRelic(m.adventurerId); } catch (err) { console.error('[game] grantRelic failed', err); } }
    if (S.player) game.recomputeStats(S.player);
  });

  // ============================== R7.7 cleansed acts: the camp ==============================
  // World places `{ kind:'npc', role:'refugee'|'camp_merchant', camp:true }` spawns on cleansed floors. Each becomes one of the
  // story's camp NPCs (G.meta.STORY.CAMP, the camp whose depth band holds this floor): `camp_merchant` takes the camp's merchant,
  // refugees the others in order. The entity keeps `camp: true`, `campRole` (the world's role), `role` = the story NPC's vendor
  // role (merchant / healer / stashkeeper / waypoint…), `name`, `look`, `lines`; npc:interact works as for town NPCs.
  game.campNpc = function (npc, s, map) {
    const camps = G.meta && G.meta.STORY && G.meta.STORY.CAMP, depth = map.depth | 0;
    npc.camp = true; npc.campRole = s.role;
    npc.name = s.role === 'camp_merchant' ? 'Camp Trader' : 'Refugee';
    const camp = Array.isArray(camps) && (camps.find(function (c) { return c.band && depth >= c.band[0] && depth <= c.band[1]; }) || camps[camps.length - 1]);
    if (!camp || !Array.isArray(camp.npcs) || !camp.npcs.length) return npc;
    map.campUsed = map.campUsed || [];
    let pick = null;
    if (s.role === 'camp_merchant') pick = camp.npcs.find(function (n) { return n.role === 'merchant' && map.campUsed.indexOf(n.name) < 0; });
    if (!pick) pick = camp.npcs.find(function (n) { return map.campUsed.indexOf(n.name) < 0 && (s.role === 'camp_merchant' || n.role !== 'merchant'); }) ||
      camp.npcs.find(function (n) { return map.campUsed.indexOf(n.name) < 0; });
    if (!pick) return npc;
    map.campUsed.push(pick.name);
    const d = game.NPCS[pick.role];
    npc.name = pick.name; npc.role = pick.role; npc.look = pick.look || ''; npc.lines = (pick.lines || []).slice(); npc.campName = camp.name;
    if (d) npc.sprite = Object.assign({}, d.sprite);
    return npc;
  };

  // ============================== relic powers (combat side) ==============================
  // dash_shield_bash (Brannoc): your dash ends in a shield bash — 80% weapon damage around you and a 0.8 s stagger.
  // dash_reload (Wren): every dash looses a free aimed shot (150%) at the nearest foe; the floor map opens on arrival.
  // ramping_fire (Varr): fire damage +3% per second of fighting, up to +45%; resets after 4 s without a hit.
  // extra_minion (Crane): +1 skeleton warrior; your kills cannot be raised (skills.js / deep.js / Crane himself).
  game.relicDash = function (p, x0, y0) {
    game.dashCount++;
    const fx = game.fxOf(p);
    if (fx.dash_shield_bash) {
      U.fx('ring', p.x, p.y, { radius: 1.6, color: '#c9c2b0', duration: 0.25 }); U.sfx('hit');
      for (const e of game.K.around(p.x, p.y, 1.6)) { game.playerHit(e, { pct: 80, type: 'phys', skill: false, melee: true }); if (!e.dead) game.applyStatus(e, 'stun', 0.8); }
    }
    if (fx.dash_reload) {
      const t = game.pickTarget(9);
      if (t) game.K.shoot(p, Math.atan2(t.y - p.y, t.x - p.x), { pct: 150, type: 'phys', shape: 'arrow', color: '#e8e0c8', speed: 16 });
    }
  };
  const ramp = { start: -99, last: -99 };
  game.fireRamp = function () {
    const now = G.state.time;
    if (now - ramp.last > 4) ramp.start = now;
    ramp.last = now;
    return Math.min(0.45, (now - ramp.start) * 0.03);
  };
  G.on('scene:changed', function (ev) {
    ramp.start = ramp.last = -99;
    const p = G.state.player, map = ev && ev.map;
    if (p && map && ev.scene === 'dungeon' && game.fxOf(p).dash_reload && map.explored) map.explored.fill(1);
  });
})();
