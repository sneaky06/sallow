// R2.5 Lockdown rooms: the doors slam shut, waves of monsters spawn, the last wave brings a rare, then the chest unlocks.
// Progress lives on the room object (room.locked / room.wave / room.cleared — plain data); `lock` only holds ids.
(function () {
  'use strict';
  const G = window.G;
  const C = G.C;
  const game = G.game;
  const U = game.U, W = game.W;

  let lock = null;          // { ri (room index), ids: [monster ids of the current wave], next (s until the next wave), t }
  let scanT = 0;

  function invalidate(map) { if (G.world && G.world.invalidate) G.world.invalidate(map); }
  function inRect(r, x, y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }
  function activeRoom() { const m = G.state.map; return lock && m && m.rooms ? m.rooms[lock.ri] : null; }

  // True when no room is sealed, or x,y lies inside the sealed room (used to stop blinks/leaps leaving it).
  game.inSealedRoom = function (x, y) {
    const r = activeRoom();
    return !r || inRect(r, Math.floor(x), Math.floor(y));
  };
  game.getLockdown = function () {
    const r = activeRoom();
    return r ? { room: r, wave: r.wave || 0, waves: r.waves || 2 } : null;
  };

  function seal(map, room, ri) {
    const S = G.state;
    room.locked = true;
    room.wave = 0;
    room.waves = Math.max(1, room.waves | 0) || 2;
    for (const d of room.doors || []) map.props.push({ type: 'gate', x: d.x, y: d.y, solid: true });
    invalidate(map);
    S.flags.sealed = true;
    lock = { ri: ri, ids: [], next: 1.0 };
    U.sfx('door'); U.shake(5, 0.3);
    for (const d of room.doors || []) U.fx('smoke', d.x + 0.5, d.y + 0.5, {});
    G.emit('room:locked', { room: room });
  }

  function spawnWave(map, room) {
    const S = G.state, p = S.player, depth = Math.max(1, map.depth | 0);
    room.wave++;
    const last = room.wave >= room.waves;
    const n = 3 + Math.min(4, Math.floor(depth / 4)) + (room.wave - 1);
    const type = game.pickMonsterType(depth, map.theme);
    lock.ids.length = 0;
    for (let i = 0; i < n; i++) {
      let spot = null;
      for (let k = 0; k < 12 && !spot; k++) {
        const x = room.x + 0.5 + Math.floor(U.rng.next() * room.w), y = room.y + 0.5 + Math.floor(U.rng.next() * room.h);
        // must be floor the player can actually walk to with the gates down — never strand a wave behind a wall
        if (W.walkable(x, y) && W.tile(x, y) !== C.TILE.DOOR && Math.hypot(x - p.x, y - p.y) > 2.5 && W.path(p.x, p.y, x, y, 800)) spot = { x: x, y: y };
      }
      if (!spot) continue;
      const rare = last && i === 0, tier = rare ? (depth >= 8 ? 'legendary' : 'rare') : 'normal';      // R3.6: legendary in the last wave from depth 8
      const e = game.createMonster(rare ? type : (i % 3 === 2 ? game.pickMonsterType(depth, map.theme) : type), spot.x, spot.y, depth + (tier === 'legendary' ? 3 : rare ? 2 : 0), tier);
      e.lockdown = true;
      e.ai.st = 'chase'; e.ai.atk = 0.8 + U.rng.next() * 0.6;
      S.entities.push(e);
      lock.ids.push(e.id);
      U.fx('smoke', spot.x, spot.y, { color: '#b98cff' });
      U.fx('ring', spot.x, spot.y, { radius: 0.6, color: '#b98cff', duration: 0.4 });
    }
    U.sfx('cast');
    U.toast('Wave ' + room.wave + ' / ' + room.waves, '#ff9a6a');
  }

  function release(map, room, cleared) {
    const S = G.state;
    map.props = map.props.filter(function (pr) { return pr.type !== 'gate'; });
    invalidate(map);
    room.locked = false;
    S.flags.sealed = false;
    lock = null;
    if (!cleared) return;
    room.cleared = true;
    for (const pr of map.props) {
      if (pr.interact === 'chest' && pr.locked && inRect(room, pr.x, pr.y)) {
        pr.locked = false; pr.lockReward = true;
        U.fx('nova', pr.x + 0.5, pr.y + 0.5, { radius: 2, color: '#ffe45b' });
      }
    }
    U.sfx('quest'); U.sfx('door');
    G.emit('room:cleared', { room: room });
  }

  // The reward chest: loot source 'chest' rolled twice (player.js already rolled once), each with the best item at least rare.
  game.lockdownReward = function (p, x, y) {
    const I = G.items;
    if (!I) return;
    const opts = { source: 'chest', level: Math.max(1, G.state.depth | 0), magicFind: p.stats.magicFind || 0, goldFind: p.stats.goldFind || 0, floor: 'rare' };
    try {
      if (I.dropLoot) I.dropLoot(x, y, opts);
    } catch (err) { console.error('[game] lockdown reward failed', err); }
  };

  game.updateLockdown = function (dt) {
    const S = G.state, map = S.map, p = S.player;
    if (!map || !p || S.scene !== 'dungeon' || !map.rooms) return;
    if (!lock) {
      scanT -= dt;
      if (scanT > 0 || p.dead) return;
      scanT = 0.15;
      const px = Math.floor(p.x), py = Math.floor(p.y);
      for (let i = 0; i < map.rooms.length; i++) {
        const r = map.rooms[i];
        if (r.type !== 'lockdown' || r.cleared || r.locked || !inRect(r, px, py) || W.tile(px, py) === C.TILE.DOOR) continue;
        let clear = true;       // fully inside: not standing where a gate is about to drop
        for (const d of r.doors || []) if (Math.hypot(d.x + 0.5 - p.x, d.y + 0.5 - p.y) < 1.3) clear = false;
        if (clear) { seal(map, r, i); return; }
      }
      return;
    }
    const room = activeRoom();
    if (!room) { lock = null; S.flags.sealed = false; return; }
    if (p.dead) return;                       // respawn changes the scene, which resets everything
    // Fail-safe: the player somehow ended up outside (knock-back through a corner, a future skill…). Never leave
    // them locked out with the floor's portal disabled — lift the lockdown unrewarded; re-entering starts it again.
    if (inRect(room, Math.floor(p.x), Math.floor(p.y))) lock.out = 0;
    else if ((lock.out = (lock.out || 0) + dt) > 3) {
      for (let i = 0; i < lock.ids.length; i++) { const e = game.byId(lock.ids[i]); if (e) e.lockdown = false; }
      release(map, room, false);
      return;
    }
    if (lock.next > 0) {
      lock.next -= dt;
      if (lock.next <= 0) spawnWave(map, room);
      return;
    }
    // Every 2 s: a wave monster nobody can walk to (wedged behind furniture, the far side of a pit) is pulled back in.
    lock.reach = (lock.reach || 0) - dt;
    const check = lock.reach <= 0;
    if (check) lock.reach = 2;
    let alive = false;
    for (let i = 0; i < lock.ids.length; i++) {
      const e = game.byId(lock.ids[i]);
      if (!e || e.dead) continue;
      alive = true;
      if (check && Math.hypot(e.x - p.x, e.y - p.y) > 1.2 && !e.fly && !W.path(p.x, p.y, e.x, e.y, 800)) {
        const spot = W.free(p.x + U.rand(-2, 2), p.y + U.rand(-2, 2), 3);
        if (spot && inRect(room, Math.floor(spot.x), Math.floor(spot.y))) {
          U.fx('teleport', e.x, e.y, {}); e.x = spot.x; e.y = spot.y; e.ai.path = null; U.fx('teleport', e.x, e.y, {});
        }
      }
    }
    if (alive) return;
    if (room.wave >= room.waves) release(map, room, true);
    else lock.next = 1.2;
  };

  G.on('scene:changed', function () {
    lock = null;
    scanT = 0;
    if (G.state.flags) G.state.flags.sealed = false;
  });
})();
