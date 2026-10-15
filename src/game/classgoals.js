// R16 class goals: per-class achievements tracked in state.flags.classGoals = { [goalId]: { n, done } }. Rewards are Marks
// (a feat 'goal_<id>' in player.feats, spent like any Mark) and titles (pushed to state.flags.titles). Names are placeholders
// for the story team. API: G.game.CLASS_GOALS, G.game.getClassGoals(), event classgoal:done { id, reward }.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U;

  const COMMON = [
    { id: 'branch', name: 'Path Walked', desc: 'Complete a perk branch (all five tiers).', goal: 1, reward: { mark: 1 } },
    { id: 'tree20', name: 'Devotion', desc: 'Put 20 ranks into one skill tree.', goal: 20, reward: { title: 'the Devoted' } },
    { id: 'flow8', name: 'Unbroken', desc: 'Chain Flow ×8.', goal: 1, reward: { mark: 1 } },
    { id: 'depth30', name: 'At the Core', desc: 'Reach depth 30.', goal: 1, reward: { title: 'of the Core' } },
  ];
  const SPECIFIC = {
    warrior: [
      { id: 'w_charge_stun', name: 'Battering Ram', desc: 'Stun 50 enemies with Shoulder Charge.', goal: 50, reward: { mark: 1 } },
      { id: 'w_cleave_three', name: 'Reaper of Ranks', desc: 'Hit three or more enemies with one basic swing 200 times.', goal: 200, reward: { mark: 1 } },
      { id: 'w_act_bosses', name: 'Kingbreaker', desc: 'Kill the six act bosses as a Warrior.', goal: 6, reward: { title: 'Kingbreaker' } },
    ],
    ranger: [
      { id: 'r_long_kill', name: 'Far Shot', desc: 'Kill 100 enemies from 8 or more tiles away.', goal: 100, reward: { mark: 1 } },
      { id: 'r_moving_kill', name: 'Never Still', desc: 'Kill 300 enemies while moving.', goal: 300, reward: { mark: 1 } },
      { id: 'r_close_calls', name: 'Hair\'s Breadth', desc: 'Earn 100 Close Calls.', goal: 100, reward: { title: 'the Untouched' } },
    ],
    sorcerer: [
      { id: 's_shatter', name: 'Glassmaker', desc: 'Shatter 50 frozen enemies with fire.', goal: 50, reward: { mark: 1 } },
      { id: 's_freeze', name: 'Winter\'s Hand', desc: 'Freeze 200 enemies.', goal: 200, reward: { mark: 1 } },
      { id: 's_blink_cc', name: 'Phase Dancer', desc: 'Earn 25 Close Calls within a second of a Blink.', goal: 25, reward: { title: 'Phase Dancer' } },
    ],
    necromancer: [
      { id: 'n_minion_kills', name: 'The Host', desc: 'Your minions kill 1,000 enemies.', goal: 1000, reward: { mark: 1 } },
      { id: 'n_corpses', name: 'Pyre Keeper', desc: 'Detonate 200 corpses.', goal: 200, reward: { mark: 1 } },
      { id: 'n_army', name: 'Legion', desc: 'Command 8 minions at once.', goal: 1, reward: { title: 'of the Legion' } },
    ],
  };
  const GOALS = game.CLASS_GOALS = {};
  for (const c in SPECIFIC) GOALS[c] = COMMON.map(function (g) { return Object.assign({}, g, { id: c[0] + '_' + g.id }); }).concat(SPECIFIC[c]);

  function store() { const f = G.state.flags || (G.state.flags = {}); if (!f.classGoals || typeof f.classGoals !== 'object') f.classGoals = {}; return f.classGoals; }
  function defOf(id) { const p = G.state.player; const list = p && GOALS[p.classId]; return list ? list.find(function (g) { return g.id === id; }) : null; }
  function complete(id) {
    const d = defOf(id), s = store()[id], p = G.state.player;
    if (!d || !s || s.done) return;
    s.done = true;
    if (d.reward.mark && p) { p.feats = p.feats || {}; p.feats['goal_' + id] = true; G.emit('perk:mark', { feat: 'goal_' + id }); }
    if (d.reward.title) { const f = G.state.flags; if (!Array.isArray(f.titles)) f.titles = []; if (f.titles.indexOf(d.reward.title) < 0) f.titles.push(d.reward.title); }
    U.toast('Class goal: ' + d.name + (d.reward.mark ? ' — a Mark' : d.reward.title ? ' — title "' + d.reward.title + '"' : ''), '#ffd94a');
    U.sfx('quest');
    G.emit('classgoal:done', { id: id, reward: d.reward });
  }
  // add `n` to a goal of the current class (ignored for other classes' goals)
  game.goalAdd = function (id, n) {
    const d = defOf(id);
    if (!d) return;
    const s = store()[id] || (store()[id] = { n: 0, done: false });
    if (s.done) return;
    s.n += n === undefined ? 1 : n;
    if (s.n >= d.goal) complete(id);
  };
  game.goalSet = function (id, v) {           // monotonic "best so far" goals
    const d = defOf(id);
    if (!d) return;
    const s = store()[id] || (store()[id] = { n: 0, done: false });
    if (s.done || v <= s.n) return;
    s.n = v;
    if (s.n >= d.goal) complete(id);
  };
  game.getClassGoals = function () {
    const p = G.state.player, list = p && GOALS[p.classId];
    if (!list) return [];
    const S = store();
    return list.map(function (g) { const s = S[g.id] || { n: 0, done: false }; return { id: g.id, name: g.name, desc: g.desc, goal: g.goal, n: Math.min(g.goal, s.n), done: !!s.done, reward: Object.assign({}, g.reward) }; });
  };

  const pre = function () { const p = G.state.player; return p ? p.classId[0] + '_' : 'x_'; };
  // ---- common goals ----
  G.on('perk:bought', function () {
    const p = G.state.player;
    if (!p || !game.PERK_ORDER || !game.PERK_ORDER[p.classId]) return;
    const O = game.PERK_ORDER[p.classId];
    for (const b in O) { let all = true; for (let t = 1; t <= 5; t++) if (!p.perks[O[b][t][0]] && !p.perks[O[b][t][1]]) all = false; if (all) { game.goalAdd(pre() + 'branch'); return; } }
  });
  G.on('skill:learned', function () {
    const p = G.state.player;
    if (!p) return;
    let best = 0;
    for (const tr of game.CLASSES[p.classId].trees) { let n = 0; for (const id of tr.skills) n += p.skills[id] || 0; if (n > best) best = n; }
    game.goalSet(pre() + 'tree20', best);
  });
  G.on('flow:trigger', function (e) { if (e && e.chain >= 8) game.goalAdd(pre() + 'flow8'); });
  G.on('scene:changed', function (e) { if (e && e.scene === 'dungeon' && e.depth >= 30) game.goalAdd(pre() + 'depth30'); });
  // ---- class feats (the rest are counted where they happen: player.js, combat.js, skills) ----
  G.on('monster:killed', function (e) {
    const p = G.state.player, m = e && e.monster;
    if (!p || !m) return;
    if (m.rarity === 'boss' && game.ACT_BOSSES && Object.values(game.ACT_BOSSES).indexOf(m.monsterId) >= 0) {
      const S = store(), k = 'w_act_bosses_' + m.monsterId;
      if (p.classId === 'warrior' && !S[k]) { S[k] = { n: 1, done: true }; game.goalAdd('w_act_bosses'); }
    }
  });
  game.goalKill = function (p, t, killer) {          // combat.js: every kill, with who did it
    if (!p) return;
    if (killer && killer.summon && killer.faction === 'player') { game.goalAdd('n_minion_kills'); return; }
    if (killer !== p) return;
    if (Math.hypot(t.x - p.x, t.y - p.y) >= 8) game.goalAdd('r_long_kill');
    if ((game.stillT || 0) < 0.2) game.goalAdd('r_moving_kill');
  };
  game.goalTick = function (p) {
    if (p.classId === 'necromancer') { let n = 0; for (const m of game.live.allies) if (!m.dead && m.summon) n++; if (n >= 8) game.goalAdd('n_army'); }
  };
})();
