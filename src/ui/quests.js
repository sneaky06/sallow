// G.meta quests: the elder's main chain + three rotating bounties, tracked purely through contract events.
// state.quests = { v, main: { step, status, progress }, bounties: [{ id, kind, name, desc, goal, progress, status, rewards }], n }
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const TX = ui.S;
  const meta = G.meta = G.meta || {};

  // kind 'depth': reach depth `goal`. kind 'boss': slay `boss` (a monsterId, R4.1) — any depth, it returns deeper; with
  // `orDepth` any boss killed at depth >= `depth` also counts (repeat bosses deeper down; the world boss the combat team adds).
  // {boss} is G.game.getMonsterInfo(boss).name at display time (else `bossName`). Dialogue and acts live in story_data.js.
  // R7.7 campaign: Act I The Shallows (1–10), Act II The Deep (11–20), Act III Hellscape (21–30), world boss at 30.
  // Reward items name rarity keys in order of preference (the rarity ladder changes in R7.1; the first key that exists wins).
  const LOW = ['uncommon'], MID = ['rare'], HIGH = ['magic'], TOP = ['legendary'];
  const MAIN = [
    { id: 'main_1', name: 'The Cold Stair', kind: 'depth', goal: 3,
      desc: 'Start in the old mine and the crypt beneath it. Reach depth 3 and see what is rotting.',
      rewards: { gold: 120, xp: 150, item: LOW } },
    { id: 'main_2', name: 'The Crowned Dead', kind: 'boss', boss: 'boss_gravelord', depth: 5,
      desc: '{boss} was the town priest. Now he keeps court on depth 5 and will not let the dead lie. Put him in the ground.',
      rewards: { gold: 400, xp: 600, item: MID } },
    { id: 'main_3', name: 'Where the Water Remembers', kind: 'depth', goal: 8,
      desc: 'Under the crypt the stone goes wet and the water keeps voices. Do not answer. Reach depth 8.',
      rewards: { gold: 600, xp: 1200, item: LOW } },
    { id: 'main_4', name: 'The Nest', kind: 'boss', boss: 'boss_broodmother', depth: 10,
      desc: '{boss} breeds on the last of the heat at the bottom of the Shallows. Find her on depth 10 and empty her.',
      rewards: { gold: 1200, xp: 3000, item: MID } },
    { id: 'main_5', name: 'Fever Heat', kind: 'depth', goal: 13,
      desc: 'Below depth 10 the heat cooks instead of warming. The missing adventurers went this way. Reach depth 13.',
      rewards: { gold: 1800, xp: 5500, item: MID } },
    { id: 'main_6', name: 'The Keeper of Embers', kind: 'boss', boss: 'boss_tyrant', depth: 15,
      desc: '{boss} sits on a vein of clean fire on depth 15 and lets none of it rise. Take it back.',
      rewards: { gold: 3200, xp: 11000, item: HIGH } },
    { id: 'main_7', name: 'The Quiet', kind: 'depth', goal: 18,
      desc: 'Past the fire the Deep goes quiet, and listens. Reach depth 18.',
      rewards: { gold: 4500, xp: 18000, item: MID } },
    { id: 'main_8', name: 'The Hollow Star', kind: 'boss', boss: 'boss_hollow', depth: 20,
      desc: '{boss} is the floor of the Deep, on depth 20. Put it out.',
      rewards: { gold: 8000, xp: 30000, item: HIGH } },
    { id: 'main_9', name: 'The Skin Floors', kind: 'depth', goal: 23,
      desc: 'Nobody came back to map what lies under the Deep. Reach depth 23.',
      rewards: { gold: 9000, xp: 42000, item: MID } },
    { id: 'main_10', name: 'The Choir', kind: 'boss', boss: 'boss_choir', bossName: 'the singer', orDepth: true, depth: 25,
      desc: 'Something on depth 25 sings, and the whole town hears it through the floorboards. Kill the singer.',
      rewards: { gold: 12000, xp: 60000, item: HIGH } },
    { id: 'main_11', name: 'The Heartbeat', kind: 'depth', goal: 28,
      desc: 'The floor down here has a pulse. Reach depth 28.',
      rewards: { gold: 14000, xp: 80000, item: MID } },
    { id: 'main_12', name: 'The Hearthking', kind: 'boss', boss: 'boss_world', bossName: '{king}', orDepth: true, depth: 30,
      desc: 'At the core of {rift}, on depth 30: {boss}, founder of {town}. Tear it out. All of it.',
      rewards: { gold: 30000, xp: 150000, item: TOP } },
  ];
  meta._rarityPick = function (r) {
    if (!Array.isArray(r)) return r;
    for (const k of r) if (C.RARITY[k]) return k;
    return 'rare';
  };
  function bossName(id, fallback) {
    let info = null;
    if (id && G.game && G.game.getMonsterInfo) { try { info = G.game.getMonsterInfo(id); } catch (err) { info = null; } }
    const n = info && info.name && info.name !== id ? info.name : (fallback || 'the guardian');
    return meta._fillNames ? meta._fillNames(n) : n;
  }
  meta._bossName = bossName;
  function fill(text, m) {
    const t = String(text).replace('{boss}', bossName(m.boss, m.bossName));
    return meta._fillNames ? meta._fillNames(t) : t;     // {rift}, {town}… live in story_data.js NAMES
  }

  const BOUNTIES = {
    kill:   { name: 'Cull the Horde',    desc: n => TX.quests.slay + n + TX.quests.monstersInTheDeep,                       goal: (r, L) => 15 + r.int(0, 3) * 5 + Math.min(20, L), w: 1.0 },
    elite:  { name: 'Marked for Death',  desc: n => TX.quests.slay + n + TX.quests.championRareOrLegendary,                 goal: r => r.int(2, 4), w: 1.4, item: 'magic' },
    depth:  { name: 'Deeper Still',      desc: n => TX.quests.setFootOnDepth + n + '.',                               goal: () => Math.max(2, (S.flags.maxDepth | 0) + 1), w: 1.2 },
    rares:  { name: 'Glittering Prizes', desc: n => TX.quests.recover + n + TX.chute.item + (n > 1 ? 's' : '') + TX.quests.ofRareQualityOr, goal: r => r.int(1, 3), w: 1.5, item: 'rare' },
    chests: { name: 'Grave Goods',       desc: n => TX.quests.open + n + TX.quests.chests,                                     goal: r => r.int(2, 4), w: 1.0 },
    // lockdown rooms only exist from depth 2 (R2.5), so this is not offered to a hero who has never left depth 1
    lockdown: { name: 'Break the Seal',  desc: n => TX.quests.survive + n + TX.quests.sealedRoom + (n > 1 ? 's' : '') + TX.quests.whenTheDoorsSlam, goal: r => r.int(1, 2), w: 1.8, item: 'rare',
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
    const def = BOUNTIES[b.kind];      // name and text are read from the table every time, so a rewrite also reaches bounties already in a save
    return { id: b.id, name: def ? def.name : b.name, desc: def ? def.desc(b.goal) : b.desc, giver: 'elder', status: b.status, progress: Math.min(b.progress, b.goal),
      goal: b.goal, rewards: Object.assign({}, b.rewards), main: false };
  }

  function viewOf(id) {
    const list = meta.getQuests();
    for (const v of list) if (v.id === id) return v;
    return null;
  }

  function becameReady(id, name, who) {
    G.emit('ui:toast', { text: name + TX.quests.returnTo + (who || 'the Elder'), color: '#ffd94a' });
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
    sideAdvance(fn);
    for (const b of q.bounties) {
      if (b.status !== 'active') continue;
      const before = b.progress;
      b.progress = Math.min(b.goal, fn(b.kind, b.progress, b) | 0);
      if (b.progress >= b.goal) { b.status = 'ready'; becameReady(b.id, b.name); }
      else if (b.progress !== before) G.emit('quest:updated', { quest: bountyView(b) });
    }
  }

  // ---------- side quest lines (R7.7, story_data.js SIDE) ----------
  // state.quests.side = { [lineId]: { step, status, progress } }. A line opens once state.flags.act reaches line.act; the
  // Elder hands it over. The view's id is the line id; story.js plays the giver's lines from (lineId, step).
  // R12: lines with a `role` (merchant, blacksmith, mystic, healer, stashkeeper, curator, camp_merchant, refugee ...) are given by that
  // townsperson instead of the Elder; the story writes them into SIDE or VENDOR_QUESTS (same shape).
  function sideLines() { const S0 = meta.STORY || {}; return (S0.SIDE || []).concat(Array.isArray(S0.VENDOR_QUESTS) ? S0.VENDOR_QUESTS : []); }
  function sideState(q, line) {
    if (!q.side || typeof q.side !== 'object') q.side = {};
    return q.side[line.id] || (q.side[line.id] = { step: 0, status: 'available', progress: 0 });
  }
  function sideView(line, st) {
    const s = line.steps[Math.min(st.step, line.steps.length - 1)];
    const lastStep = st.step >= line.steps.length - 1;
    const fillN = meta._fillNames || String;
    return { id: line.id, lineId: line.id, side: true, step: st.step, giver: line.role || 'elder', giverRole: line.role || null, npc: line.npc || null, chain: line.chain || null, giverName: line.giver,
      name: fillN(line.name) + (line.steps.length > 1 ? ' (' + (Math.min(st.step, line.steps.length - 1) + 1) + '/' + line.steps.length + ')' : ''),
      desc: fillN(s.desc), status: st.status, progress: Math.min(st.progress, s.goal), goal: s.goal, main: false,
      rewards: lastStep ? Object.assign({}, line.rewards) : { xp: Math.round((line.rewards.xp || 0) / 4) } };
  }
  function sideViews() {
    const q = Q(), out = [];
    if (!q) return out;
    const act = S.flags.act | 0 || 1;
    for (const line of sideLines()) {
      if (act < Math.max(line.act || 1, line.requiresAct || 1)) continue;
      if (line.requires && !(q.side && q.side[line.requires] && q.side[line.requires].status === 'done')) continue;        // the giver's previous quest comes first
      const st = sideState(q, line);
      if (st.status !== 'done') out.push(sideView(line, st));
    }
    return out;
  }
  function sideAdvance(fn) {
    const q = Q();
    if (!q || !q.side) return;
    for (const line of sideLines()) {
      const st = q.side[line.id];
      if (!st || st.status !== 'active') continue;
      const s = line.steps[st.step];
      if (!s || (s.minDepth && s.kind !== 'depth' && (S.depth | 0) < s.minDepth)) continue;
      const before = st.progress;
      st.progress = Math.min(s.goal, fn(s.kind, st.progress, s) | 0);
      if (st.progress >= s.goal) { st.status = 'ready'; becameReady(line.id, (meta._fillNames || String)(line.name), line.role ? line.giver : null); }
      else if (st.progress !== before) G.emit('quest:updated', { quest: sideView(line, st) });
    }
  }
  function sideAccept(id) {
    const q = Q(), line = sideLines().find(l => l.id === id);
    if (!q || !line) return false;
    const st = sideState(q, line);
    if (st.status !== 'available') return false;
    st.status = 'active'; st.progress = 0;
    G.emit('sfx', { name: 'quest' });
    G.emit('quest:updated', { quest: sideView(line, st) });
    const s = line.steps[st.step];
    if (s && s.kind === 'depth') sideAdvance((kind, prog, e) => (e === s ? Math.max(prog, S.flags.maxDepth | 0) : prog));
    if (typeof refreshDeliver === 'function') refreshDeliver();
    return true;
  }
  function sideTurnIn(id) {
    const q = Q(), line = sideLines().find(l => l.id === id);
    if (!q || !line) return false;
    const st = sideState(q, line);
    if (st.status !== 'ready') return false;
    const stp = line.steps[st.step];
    if (stp && stp.kind === 'deliver') {                                        // materials are handed over now
      const have = (S.player.materials && S.player.materials[stp.mat]) | 0;
      if (have < stp.goal) { G.emit('ui:toast', { text: TX.quests.youNeed + stp.goal + ' ' + (ui._matName ? ui._matName(stp.mat) : stp.mat) + '.', color: '#ff8a7a' }); st.status = 'active'; st.progress = have; return false; }
      S.player.materials[stp.mat] = have - stp.goal;
      G.emit('inventory:changed', {});
    }
    const done = sideView(line, st);
    done.status = 'done';
    grant(done.rewards, id);
    st.step++; st.progress = 0;
    st.status = st.step < line.steps.length ? 'available' : 'done';
    G.emit('sfx', { name: 'quest' });
    G.emit('quest:completed', { quest: done });
    G.emit('quest:updated', { quest: done });
    return true;
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
    for (const v of sideViews()) out.push(v);
    return out;
  };

  // R12: what marker should float over this townsperson? null | 'available' | 'active' | 'ready' (who = role string or an npc entity / { role })
  meta.npcQuestState = function (who) {
    const role = typeof who === 'string' ? who : (who && who.role) || null;
    if (!role || !Q()) return null;
    let best = null;
    const rank = { active: 1, available: 2, ready: 3 };
    for (const v of meta.getQuests()) {
      if (role === 'elder' ? v.giverRole : v.giverRole !== role) continue;
      if (!rank[v.status]) continue;
      if (!best || rank[v.status] > rank[best]) best = v.status;
    }
    return best;
  };

  meta.acceptQuest = function (id) {
    if (sideAccept(id)) return true;
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

  function grant(rewards, qid) {
    const p = S.player;
    if (!p || !rewards) return;
    const parts = [];
    // R13 loyalty: a trader's quest raises the crate's bulk rate (flags.loyalty.sell / .salvage, each capped at +0.3)
    if (rewards.loyalty && (rewards.loyalty.kind === 'sell' || rewards.loyalty.kind === 'salvage')) {
      const L = S.flags.loyalty && typeof S.flags.loyalty === 'object' ? S.flags.loyalty : (S.flags.loyalty = {});
      L[rewards.loyalty.kind] = Math.min(0.3, Math.round(((L[rewards.loyalty.kind] || 0) + (+rewards.loyalty.amount || 0.1)) * 100) / 100);
      parts.push(TX.quests.betterCrate + (rewards.loyalty.kind === 'sell' ? 'sell' : 'salvage') + TX.npc.rate);
    }
    // R16 challenge quests grow the surface crate (flags.crateBonus, up to 300 slots in all)
    if (rewards.crate > 0) { S.flags.crateBonus = Math.min(275, ((S.flags.crateBonus | 0) + (rewards.crate | 0))); parts.push('+' + (rewards.crate | 0) + ' crate slots'); }
    if (rewards.gold) {
      p.gold = (p.gold || 0) + rewards.gold;
      G.emit('gold:changed', { gold: p.gold, delta: rewards.gold });
      if (G.meta && G.meta.addStat) G.meta.addStat('goldEarned', rewards.gold | 0);
      parts.push(rewards.gold + TX.filter.gold2);
    }
    if (rewards.xp) {
      if (G.game && G.game.gainXp) G.game.gainXp(rewards.xp);
      parts.push(rewards.xp + ' XP');
    }
    if (rewards.mats) {
      p.materials = p.materials || {};
      for (const k in rewards.mats) p.materials[k] = (p.materials[k] || 0) + rewards.mats[k];
      parts.push(ui._matsText ? ui._matsText(rewards.mats) : 'materials');
    }
    if (rewards.mark > 0) {                                                       // a Mark: a feat of its own per quest, so it counts like any other
      for (let i = 0; i < rewards.mark; i++) {
        if (G.game && typeof G.game.perkFeat === 'function') { try { G.game.perkFeat('quest_' + (qid || 'x') + '_' + i); } catch (err) { p.marks = (p.marks | 0) + 1; } } else p.marks = (p.marks | 0) + 1;
      }
      parts.push(rewards.mark + TX.npc.mark + (rewards.mark > 1 ? 's' : ''));
    }
    if (rewards.tome > 0 && G.items && typeof G.items.grantTome === 'function') { try { G.items.grantTome(rewards.tome); parts.push(rewards.tome + TX.npc.skillPoint + (rewards.tome > 1 ? 's' : '')); } catch (err) { /* ignore */ } }
    if (rewards.item && G.items && G.items.rollItem) {
      const item = G.items.rollItem({ level: p.level || 1, rarity: meta._rarityPick(rewards.item) });
      if (item) {
        const stored = !!(G.items.addToInventory && G.items.addToInventory(item));
        if (!stored && G.items.dropItemAt) G.items.dropItemAt(p.x, p.y, item);
        parts.push(item.name + (stored ? '' : ' (at your feet)'));
      }
    }
    if (parts.length) G.emit('ui:toast', { text: TX.npc.reward + parts.join(', '), color: '#ffd94a' });
  }

  meta.turnInQuest = function (id) {
    if (sideTurnIn(id)) return true;
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
    if (q.main.status === 'done' && q.main.step < MAIN.length) q.main.status = 'available';     // the chain grew (R7.7)
    if (!q.side || typeof q.side !== 'object') q.side = {};
  };

  meta._MAIN = MAIN;

  // ---------- tracking ----------
  // kill goals may carry filters: tier (elite | champion | rare | legendary | boss), body (monster.sprite.body), minDepth (checked by sideAdvance)
  function killMatches(entry, mon) {
    if (entry.tier) {
      const r = mon.rarity;
      if (entry.tier === 'elite' ? !(r === 'champion' || r === 'rare' || r === 'legendary' || r === 'boss') : r !== entry.tier) return false;
    }
    if (entry.body && !((mon.sprite && mon.sprite.body === entry.body) || mon.body === entry.body)) return false;
    return true;
  }
  G.on('monster:killed', function (e) {
    const mon = e && e.monster;
    if (!mon) return;
    if (mon.faction && mon.faction !== 'enemy') return;      // a fallen minion is not a kill
    const elite = mon.rarity === 'champion' || mon.rarity === 'rare' || mon.rarity === 'legendary' || mon.rarity === 'boss';
    advance(function (kind, prog, entry) {
      if (kind === 'kill') return killMatches(entry, mon) ? prog + 1 : prog;
      if (kind === 'elite' && elite) return prog + 1;
      if (kind === 'boss' && mon.rarity === 'boss' && (mon.monsterId === entry.boss || ((entry.orDepth || !mon.monsterId) && (S.depth | 0) >= entry.depth))) return 1;
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

  // R7.11 / R6.5 side-line triggers (story_data.js SIDE kinds): Curator registrations, completed Book pages, cleansed items.
  G.on('collection:registered', function () { advance((kind, prog) => (kind === 'collect' ? prog + 1 : prog)); });
  G.on('collection:page', function () { advance((kind, prog) => (kind === 'collectPage' ? prog + 1 : prog)); });
  // 'item:cleansed' { item } is emitted by the UI's Cleanse button (and by items when it learns to); each item counts once.
  const cleansedSeen = typeof WeakSet === 'function' ? new WeakSet() : null;
  G.on('item:cleansed', function (e) {
    const it = e && e.item;
    if (it && cleansedSeen) { if (cleansedSeen.has(it)) return; cleansedSeen.add(it); }
    advance((kind, prog) => (kind === 'cleanse' ? prog + 1 : prog));
  });

  // ---------- R12/R13 goal kinds written by the story (story_data.js VENDOR_QUESTS) ----------
  // found (item:picked >= rarity), chute (items sent up while in the dungeon), goldSpent (all spending in town, or at a given trader's
  // role via gold:spent), sold / salvaged (BY HAND only: item:sold / item:salvaged with bulk false, filtered by role and min rarity),
  // deliver (progress = what you carry; handed over on claim), fallen, events, grade, closeCall, flow.
  const rankOf = function (list) { const k = meta._rarityPick ? meta._rarityPick(list) : list; return rarityOrder(k); };
  const GRADE = { S: 4, A: 3, B: 2, C: 1, D: 0 };
  G.on('item:picked', function (e) {
    const it = e && e.item;
    if (!it || it.type === 'gold' || e.salvaged) return;
    advance(function (kind, prog, entry) { return kind === 'found' && (!entry.rarity || rarityOrder(it.rarity) >= rankOf(entry.rarity)) ? prog + 1 : prog; });
  });
  let surfLen = -1;
  G.on('surface:changed', function () {
    const len = Array.isArray(S.surface) ? S.surface.length : 0, d = surfLen >= 0 ? len - surfLen : 0;
    surfLen = len;
    if (d > 0 && S.scene === 'dungeon') advance(function (kind, prog) { return kind === 'chute' ? prog + d : prog; });
  });
  G.on('scene:changed', function () { surfLen = Array.isArray(S.surface) ? S.surface.length : 0; });
  G.on('gold:changed', function (e) {
    if (!e || !(e.delta < 0) || S.scene !== 'town' || e.quiet) return;
    advance(function (kind, prog, entry) { return kind === 'goldSpent' && !entry.role ? prog - e.delta : prog; });
  });
  G.on('gold:spent', function (e) {
    if (!e || !(e.amount > 0)) return;
    advance(function (kind, prog, entry) { return kind === 'goldSpent' && entry.role && entry.role === e.role ? prog + (e.amount | 0) : prog; });
  });
  const handFilter = function (entry, e) {
    if (e.bulk) return false;                                                  // crate sales never count
    if (entry.role && e.role && entry.role !== e.role) return false;
    if (entry.rarity && e.item && rarityOrder(e.item.rarity) < rankOf(entry.rarity)) return false;
    return true;
  };
  G.on('item:sold', function (e) { if (e) advance(function (kind, prog, entry) { return kind === 'sold' && handFilter(entry, e) ? prog + ((e.count | 0) || 1) : prog; }); });
  G.on('item:salvaged', function (e) { if (e) advance(function (kind, prog, entry) { return kind === 'salvaged' && handFilter(entry, e) ? prog + ((e.count | 0) || 1) : prog; }); });
  G.on('relic:granted', function () { advance(function (kind, prog) { return kind === 'fallen' ? prog + 1 : prog; }); });
  G.on('event:end', function (e) { if (e && e.success) advance(function (kind, prog) { return kind === 'events' ? prog + 1 : prog; }); });
  G.on('floor:graded', function (e) {
    const g = e && GRADE[String(e.grade).toUpperCase().charAt(0)];
    if (g == null) return;
    advance(function (kind, prog, entry) { return kind === 'grade' && g >= (GRADE[entry.grade || 'C'] || 0) ? prog + 1 : prog; });
  });
  G.on('closecall:ui', function () { advance(function (kind, prog) { return kind === 'closeCall' ? prog + 1 : prog; }); });
  G.on('flow:chain', function (e) {
    const c = e && ((e.count | 0) || (e.chain | 0));
    advance(function (kind, prog, entry) { return kind === 'flow' && c === (entry.chain | 0 || 1) ? prog + 1 : prog; });
  });
  // deliver: progress follows the materials you carry (checked when they change and once a second), capped at the goal
  function refreshDeliver() {
    const q = Q();
    if (!q || !q.side || !S.player) return;
    advance(function (kind, prog, entry) { return kind === 'deliver' ? Math.min(entry.goal || 1, (S.player.materials && S.player.materials[entry.mat]) | 0) : prog; });
  }
  ['inventory:changed', 'item:picked', 'scene:changed'].forEach(function (n) { G.on(n, refreshDeliver); });
  ui._updaters.push((function () { let t = 0; return function (dt) { t -= dt; if (t <= 0) { t = 1; refreshDeliver(); } }; })());

  // ---------- R15 return trips: visit { depth, after } and retrieve { depth, item } ----------
  // visit: reaching `depth` (in the dungeon) counts once the `after` condition holds (a number = flags.act is at least that act, a string =
  // that flag is truthy). retrieve: while the quest is active a quest item (a crate prop that raises object:interact 'quest_item') is placed
  // beside the arrival point of floor `depth`; interacting with it completes the step. Placement is guarded and happens on scene:changed.
  const afterOk = function (a) { return a == null || (typeof a === 'number' ? (S.flags.act | 0) >= a : !!S.flags[a]); };
  function activeSteps(kind) {
    const q = Q(), out = [];
    if (!q || !q.side) return out;
    for (const line of sideLines()) {
      const st = q.side[line.id];
      if (!st || st.status !== 'active') continue;
      const s = line.steps[st.step];
      if (s && s.kind === kind) out.push({ line: line, step: s });
    }
    return out;
  }
  G.on('scene:changed', function (e) {
    if (!e || e.scene !== 'dungeon' || !S.map) return;
    const d = S.depth | 0;
    advance(function (kind, prog, entry) { return kind === 'visit' && (entry.depth | 0) === d && afterOk(entry.after) ? Math.max(prog, 1) : prog; });
    activeSteps('retrieve').forEach(function (x) {
      if ((x.step.depth | 0) !== d || !S.map.props) return;
      if (S.map.props.some(function (p) { return p && p.qid === x.line.id; })) return;
      const sp = S.map.spawn || { x: S.player.x, y: S.player.y };
      let pos = { x: Math.floor(sp.x) + 2, y: Math.floor(sp.y) + 1 };
      if (G.world && G.world.findFreeTileNear) { try { pos = G.world.findFreeTileNear(S.map, pos.x, pos.y, 5) || pos; } catch (err) { /* keep */ } }
      S.map.props.push({ type: 'crate', x: pos.x, y: pos.y, solid: true, interact: 'quest_item', qid: x.line.id, light: 2 });
      if (G.world && G.world.invalidate) { try { G.world.invalidate(S.map); } catch (err) { /* ignore */ } }
    });
  });
  G.on('object:interact', function (e) {
    if (!e || e.type !== 'quest_item' || !e.prop) return;
    const qid = e.prop.qid;
    const hit = activeSteps('retrieve').filter(function (x) { return x.line.id === qid; })[0];
    if (S.map && S.map.props) { const i = S.map.props.indexOf(e.prop); if (i >= 0) S.map.props.splice(i, 1); if (G.world && G.world.invalidate) { try { G.world.invalidate(S.map); } catch (err) { /* ignore */ } } }
    if (!hit) return;
    const nm = typeof hit.step.item === 'string' ? hit.step.item : (hit.step.item && hit.step.item.name) || 'the thing you were sent for';
    G.emit('ui:toast', { text: TX.quests.youFound + nm + '.', color: '#ffd94a' });
    G.emit('sfx', { name: 'loot' });
    advance(function (kind, prog, entry) { return kind === 'retrieve' && entry === hit.step ? Math.max(prog, 1) : prog; });
  });
})();
