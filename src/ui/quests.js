// G.meta quests: the elder's main chain + three rotating bounties, tracked purely through contract events.
// state.quests = { v, main: { step, status, progress }, bounties: [{ id, kind, name, desc, goal, progress, status, rewards }], n }
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const meta = G.meta = G.meta || {};

  // kind 'depth': reach depth `goal`. kind 'boss': slay the theme boss `boss` (a monsterId, R4.1) — any depth, it returns deeper.
  // {boss} in name/desc is replaced by G.game.getMonsterInfo(boss).name at display time. The Elder's lines live in story.js.
  const MAIN = [
    { id: 'main_1', name: 'The Cold Stair', kind: 'depth', goal: 3,
      desc: '{Rift} under the well breathes cold now. Go down to depth 3 and see what is breathing.',
      rewards: { gold: 120, xp: 150, item: 'magic' } },
    { id: 'main_2', name: 'The Crowned Dead', kind: 'boss', boss: 'boss_gravelord', depth: 5,
      desc: 'The rot has crowned {boss}. It keeps court on depth 5 and counts our dead. Break the count.',
      rewards: { gold: 400, xp: 600, item: 'rare' } },
    { id: 'main_3', name: 'Where the Water Remembers', kind: 'depth', goal: 8,
      desc: 'Below the crypt {rift} opens into wet caves, and the rot runs thicker. Reach depth 8.',
      rewards: { gold: 600, xp: 1200, item: 'magic' } },
    { id: 'main_4', name: 'The Nest', kind: 'boss', boss: 'boss_broodmother', depth: 10,
      desc: '{boss} nests where the warm air used to rise. Find her on depth 10 and empty her.',
      rewards: { gold: 1200, xp: 3000, item: 'rare' } },
    { id: 'main_5', name: 'The Old Fire', kind: 'depth', goal: 13,
      desc: 'Deeper, {rift} still burns, but the fire gives no heat. Walk it to depth 13.',
      rewards: { gold: 1800, xp: 5500, item: 'rare' } },
    { id: 'main_6', name: 'The Keeper of Embers', kind: 'boss', boss: 'boss_tyrant', depth: 15,
      desc: '{boss} hoards the last clean fire on depth 15. Take it back.',
      rewards: { gold: 3200, xp: 11000, item: 'epic' } },
    { id: 'main_7', name: 'The Quiet', kind: 'depth', goal: 18,
      desc: 'Past the fire, {rift} is only a quiet that listens. Reach depth 18.',
      rewards: { gold: 4500, xp: 18000, item: 'rare' } },
    { id: 'main_8', name: 'The Root of the Rift', kind: 'boss', boss: 'boss_hollow', depth: 20,
      desc: 'At the core, on depth 20, {pale} has hollowed out {star}: {boss}. Cleanse it, or tear it out by the root.',
      rewards: { gold: 10000, xp: 40000, item: 'legendary' } },
  ];
  function bossName(id) {
    let info = null;
    if (id && G.game && G.game.getMonsterInfo) { try { info = G.game.getMonsterInfo(id); } catch (err) { info = null; } }
    return (info && info.name) || 'the guardian';
  }
  meta._bossName = bossName;
  function fill(text, m) {
    const t = String(text).replace('{boss}', bossName(m.boss));
    return meta._fillNames ? meta._fillNames(t) : t;     // {rift}, {town}… live in story.js NAMES
  }

  const BOUNTIES = {
    kill:   { name: 'Cull the Horde',    desc: n => 'Slay ' + n + ' monsters in the deep.',                       goal: (r, L) => 15 + r.int(0, 3) * 5 + Math.min(20, L), w: 1.0 },
    elite:  { name: 'Marked for Death',  desc: n => 'Slay ' + n + ' champion, rare or legendary monsters.',                 goal: r => r.int(2, 4), w: 1.4, item: 'magic' },
    depth:  { name: 'Deeper Still',      desc: n => 'Set foot on depth ' + n + '.',                               goal: () => Math.max(2, (S.flags.maxDepth | 0) + 1), w: 1.2 },
    rares:  { name: 'Glittering Prizes', desc: n => 'Recover ' + n + ' item' + (n > 1 ? 's' : '') + ' of rare quality or better.', goal: r => r.int(1, 3), w: 1.5, item: 'rare' },
    chests: { name: 'Grave Goods',       desc: n => 'Open ' + n + ' chests.',                                     goal: r => r.int(2, 4), w: 1.0 },
    // lockdown rooms only exist from depth 2 (R2.5), so this is not offered to a hero who has never left depth 1
    lockdown: { name: 'Break the Seal',  desc: n => 'Survive ' + n + ' sealed room' + (n > 1 ? 's' : '') + ' when the doors slam shut.', goal: r => r.int(1, 2), w: 1.8, item: 'rare',
      when: () => (S.flags.maxDepth | 0) >= 2 },
  };
  const BOUNTY_COUNT = 3;

  function Q() {
    const q = S.quests;
    if (!q || !q.main || !Array.isArray(q.bounties)) return null;
    return q;
  }

  function rarityOrder(r) { return (C.RARITY[r] && C.RARITY[r].order) || 0; }

  function rollBounty(q, kind) {
    const def = BOUNTIES[kind];
    const p = S.player;
    const L = (p && p.level) || 1;
    const goal = def.goal(G.rng.global, L);
    const xpNext = (p && p.xpNext) || L * 100;
    const rewards = { gold: Math.round((30 + L * 18) * def.w), xp: Math.round(xpNext * 0.12 * def.w) };
    if (def.item) rewards.item = def.item;
    q.n = (q.n | 0) + 1;
    return { id: 'bounty_' + q.n, kind: kind, name: def.name, desc: def.desc(goal), goal: goal, progress: 0, status: 'available', rewards: rewards };
  }

  // Keep bounties the player is working on (or can hand in); reroll the rest.
  function regenBounties() {
    const q = Q();
    if (!q) return;
    q.bounties = q.bounties.filter(b => b && (b.status === 'active' || b.status === 'ready'));
    const used = q.bounties.map(b => b.kind);
    const kinds = G.rng.global.shuffle(Object.keys(BOUNTIES).filter(k => used.indexOf(k) < 0 && (!BOUNTIES[k].when || BOUNTIES[k].when())));
    while (q.bounties.length < BOUNTY_COUNT && kinds.length) {
      const b = rollBounty(q, kinds.pop());
      q.bounties.push(b);
      G.emit('quest:updated', { quest: bountyView(b) });
    }
  }

  function mainView(i, st) {
    const m = MAIN[i];
    return { id: m.id, name: fill(m.name, m), desc: fill(m.desc, m), giver: 'elder', status: st.status, progress: st.progress,
      goal: m.kind === 'depth' ? m.goal : 1, rewards: Object.assign({}, m.rewards), main: true };
  }
  function bountyView(b) {
    return { id: b.id, name: b.name, desc: b.desc, giver: 'elder', status: b.status, progress: Math.min(b.progress, b.goal),
      goal: b.goal, rewards: Object.assign({}, b.rewards), main: false };
  }

  function viewOf(id) {
    const list = meta.getQuests();
    for (const v of list) if (v.id === id) return v;
    return null;
  }

  function becameReady(id, name) {
    G.emit('ui:toast', { text: name + ' — return to the Elder', color: '#ffd94a' });
    G.emit('sfx', { name: 'quest' });
    G.emit('quest:updated', { quest: viewOf(id) });
  }

  // Apply fn(kind, entry) to every active objective; entry is { progress, goal } (mutable).
  function advance(fn) {
    const q = Q();
    if (!q) return;
    const m = MAIN[q.main.step];
    if (m && q.main.status === 'active') {
      const before = q.main.progress;
      const goal = m.kind === 'depth' ? m.goal : 1;
      q.main.progress = Math.min(goal, fn(m.kind, q.main.progress, m) | 0);
      if (q.main.progress >= goal) { q.main.status = 'ready'; becameReady(m.id, fill(m.name, m)); }
      else if (q.main.progress !== before) G.emit('quest:updated', { quest: viewOf(m.id) });
    }
    for (const b of q.bounties) {
      if (b.status !== 'active') continue;
      const before = b.progress;
      b.progress = Math.min(b.goal, fn(b.kind, b.progress, b) | 0);
      if (b.progress >= b.goal) { b.status = 'ready'; becameReady(b.id, b.name); }
      else if (b.progress !== before) G.emit('quest:updated', { quest: bountyView(b) });
    }
  }

  // ---------- public API ----------
  meta.initQuests = function () {
    S.quests = { v: 1, main: { step: 0, status: 'available', progress: 0 }, bounties: [], n: 0 };
    regenBounties();
  };

  meta.getQuests = function () {
    const q = Q();
    if (!q) return [];
    const out = [];
    const step = Math.min(q.main.step, MAIN.length);
    for (let i = 0; i < step; i++) out.push(mainView(i, { status: 'done', progress: MAIN[i].kind === 'depth' ? MAIN[i].goal : 1 }));
    if (step < MAIN.length) out.push(mainView(step, q.main));
    for (const b of q.bounties) out.push(bountyView(b));
    return out;
  };

  meta.acceptQuest = function (id) {
    const q = Q();
    if (!q) return false;
    const m = MAIN[q.main.step];
    if (m && m.id === id && q.main.status === 'available') {
      q.main.status = 'active';
      q.main.progress = 0;
      G.emit('sfx', { name: 'quest' });
      G.emit('quest:updated', { quest: viewOf(id) });
      // Ground already covered counts: nobody should re-walk the crypt to tick a box.
      if (m.kind === 'depth') advance((kind, prog, e) => (e === m ? Math.max(prog, S.flags.maxDepth | 0) : prog));
      return true;
    }
    for (const b of q.bounties) {
      if (b.id === id && b.status === 'available') {
        b.status = 'active';
        b.progress = 0;
        G.emit('sfx', { name: 'quest' });
        G.emit('quest:updated', { quest: bountyView(b) });
        return true;
      }
    }
    return false;
  };

  function grant(rewards) {
    const p = S.player;
    if (!p || !rewards) return;
    const parts = [];
    if (rewards.gold) {
      p.gold = (p.gold || 0) + rewards.gold;
      G.emit('gold:changed', { gold: p.gold, delta: rewards.gold });
      parts.push(rewards.gold + ' gold');
    }
    if (rewards.xp) {
      if (G.game && G.game.gainXp) G.game.gainXp(rewards.xp);
      parts.push(rewards.xp + ' XP');
    }
    if (rewards.item && G.items && G.items.rollItem) {
      const item = G.items.rollItem({ level: p.level || 1, rarity: rewards.item });
      if (item) {
        const stored = !!(G.items.addToInventory && G.items.addToInventory(item));
        if (!stored && G.items.dropItemAt) G.items.dropItemAt(p.x, p.y, item);
        parts.push(item.name + (stored ? '' : ' (at your feet)'));
      }
    }
    if (parts.length) G.emit('ui:toast', { text: 'Reward: ' + parts.join(', '), color: '#ffd94a' });
  }

  meta.turnInQuest = function (id) {
    const q = Q();
    if (!q) return false;
    const m = MAIN[q.main.step];
    if (m && m.id === id && q.main.status === 'ready') {
      const done = mainView(q.main.step, { status: 'done', progress: m.kind === 'depth' ? m.goal : 1 });
      q.main.step++;
      q.main.status = q.main.step < MAIN.length ? 'available' : 'done';
      q.main.progress = 0;
      grant(m.rewards);
      G.emit('sfx', { name: 'quest' });
      G.emit('quest:completed', { quest: done });
      G.emit('quest:updated', { quest: done });
      return true;
    }
    for (const b of q.bounties) {
      if (b.id === id && b.status === 'ready') {
        b.status = 'done';
        grant(b.rewards);
        G.emit('sfx', { name: 'quest' });
        G.emit('quest:completed', { quest: bountyView(b) });
        G.emit('quest:updated', { quest: bountyView(b) });
        return true;
      }
    }
    return false;
  };

  // Called by meta.load: a save with missing/garbled quest data gets a fresh log instead of failing the load.
  meta._repairQuests = function () {
    const q = S.quests;
    const ok = q && q.main && typeof q.main.step === 'number' && Array.isArray(q.bounties);
    if (!ok) { S.quests = { v: 1, main: { step: 0, status: 'available', progress: 0 }, bounties: [], n: 0 }; return; }
    q.bounties = q.bounties.filter(b => b && BOUNTIES[b.kind] && typeof b.goal === 'number');
  };

  meta._MAIN = MAIN;

  // ---------- tracking ----------
  G.on('monster:killed', function (e) {
    const mon = e && e.monster;
    if (!mon) return;
    if (mon.faction && mon.faction !== 'enemy') return;      // a fallen minion is not a kill
    const elite = mon.rarity === 'champion' || mon.rarity === 'rare' || mon.rarity === 'legendary' || mon.rarity === 'boss';
    advance(function (kind, prog, entry) {
      if (kind === 'kill') return prog + 1;
      if (kind === 'elite' && elite) return prog + 1;
      if (kind === 'boss' && mon.rarity === 'boss' && (mon.monsterId ? mon.monsterId === entry.boss : S.depth >= entry.depth)) return 1;
      return prog;
    });
  });

  G.on('scene:changed', function (e) {
    if (!e) return;
    if (e.scene === 'dungeon') advance((kind, prog) => (kind === 'depth' ? Math.max(prog, e.depth | 0) : prog));
    else if (e.scene === 'town') {
      if (!Q() && S.player) meta.initQuests(); else regenBounties();
    }
  });

  G.on('item:picked', function (e) {
    const it = e && e.item;
    if (!it || it.type === 'gold' || rarityOrder(it.rarity) < rarityOrder('rare')) return;
    advance((kind, prog) => (kind === 'rares' ? prog + 1 : prog));
  });

  G.on('object:interact', function (e) {
    if (!e || e.type !== 'chest') return;
    advance((kind, prog) => (kind === 'chests' ? prog + 1 : prog));
  });

  G.on('room:cleared', function () {
    advance((kind, prog) => (kind === 'lockdown' ? prog + 1 : prog));
  });
})();
