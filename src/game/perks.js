// R11 perk trees (docs/PERKS.md). Per class: Craft, Edge, Crossroads × 5 tiers × a choice of two. Perk points (1 per 6 levels)
// and Marks (feats) buy them; Wagers take one for free with your life as the stake. Every perk is a rule; the rules run through
// the hook functions at the bottom (game.perkDmg, perkHurt, perkCC, …) which combat/player/stats call.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const U = game.U, W = game.W, COL = game.COLORS;

  const BRANCHES = [{ id: 'craft', name: 'Craft' }, { id: 'edge', name: 'Edge' }, { id: 'cross', name: 'Crossroads' }];
  const COST = [0, 1, 1, 2, 2, 3];
  const PERKS = game.PERKS = {};
  const ORDER = {};          // classId → branch → tier → [idA, idB]
  function def(id, c, b, t, o, name, text, h) {
    const d = Object.assign({ id: id, classId: c, branch: b, tier: t, opt: o, name: name, text: text, cost: COST[t], keystone: t === 5 }, h || {});
    PERKS[id] = d;
    ((ORDER[c] = ORDER[c] || {})[b] = ORDER[c][b] || {})[t] = ORDER[c][b][t] || [];
    ORDER[c][b][t][o] = id;
  }
  const isElite = function (t) { return t && (t.rarity === 'champion' || t.rarity === 'rare' || t.rarity === 'legendary' || t.rarity === 'boss'); };
  const distTo = function (p, t) { return Math.hypot(t.x - p.x, t.y - p.y); };
  const heat = function () { return game.heatStacks ? game.heatStacks() : 0; };
  const stacks = function (p, id, max, t, per, key) {
    const old = game.getEffect(p, id), n = Math.min(max, (old ? old.stacks : 0) + 1), e = { id: id, t: t, stacks: n };
    if (key === 'dealt') e.dealt = per * n; else { e.mods = {}; e.mods[key] = per * n; }
    game.addEffect(p, e);
  };
  const minions = function () { return game.live.allies.filter(function (m) { return !m.dead && m.summon; }); };
  const haste = function (amt, t) { for (const m of minions()) game.addEffect(m, { id: 'perk_haste', t: t, slow: -amt }); };
  const tempSkeleton = function (p, x, y, life, max) {
    let n = 0;
    for (const e of G.state.entities) if (e.perkTemp && !e.dead) n++;
    if (n >= max) return null;
    const s = W.free(x, y, 2);
    if (!s) return null;
    const m = game.createMinion('minion_skeleton', s.x, s.y, p, 1);
    m.summonOf = 'perk_temp'; m.perkTemp = true; m.expireAt = G.state.time + life;
    G.state.entities.push(m);
    U.fx('smoke', s.x, s.y, { color: '#8ee06a' });
    return m;
  };
  const classWeapon = function (p) { const c = game.CLASSES[p.classId]; return c.weaponTypes.indexOf(p.bonus.w.type) >= 0; };
  const weaponMaster = function (cls) {
    return { stats: function (p, st, b) { b.licenceAll = 1; }, dmg: function (p, t, spec) { return classWeapon(p) ? 0.9 : 1.1; } };
  };
  const licence = function (types) { return { stats: function (p, st, b) { b.licence = (b.licence || []).concat(types); } }; };
  const shield = function (pct, every) {
    return { tick: function (p, dt, s) { s.wardT = (s.wardT || 0) - dt; if (s.wardT <= 0) { s.wardT = every; game.addEffect(p, { id: 'perk_ward', t: every, absorb: Math.round(p.stats.hpMax * pct / 100) }); } } };
  };

  // ============================== Warrior ==============================
  def('w_edge_discipline', 'warrior', 'craft', 1, 0, 'Edge Discipline', '+12% damage with swords, axes and maces.', { dmg: function (p) { return classWeapon(p) ? 1.12 : 1; } });
  def('w_brute_force', 'warrior', 'craft', 1, 1, 'Brute Force', 'Basic attacks deal 30% more damage; 10% slower attacks.', { stats: function (p, st) { st.attackSpeed -= 10; }, dmg: function (p, t, s) { return s.skill === false ? 1.3 : 1; } });
  def('w_second_swing', 'warrior', 'craft', 2, 0, 'Second Swing', 'Your cleave hits the others for 90% (not 60%).', { stats: function (p, st, b) { b.cleavePct = 90; } });
  def('w_executioner', 'warrior', 'craft', 2, 1, "Executioner's Eye", '+30% damage to foes below 35% life.', { dmg: function (p, t) { return t.hp < t.stats.hpMax * 0.35 ? 1.3 : 1; } });
  def('w_unyielding', 'warrior', 'craft', 3, 0, 'Unyielding', 'Below 30% life you take 30% less damage.', { hurt: function (p, a) { return p.hp < p.stats.hpMax * 0.3 ? a * 0.7 : a; } });
  def('w_bloodrush', 'warrior', 'craft', 3, 1, 'Bloodrush', 'Kills heal 3% life and give +5% attack speed for 4 s (stacks 3).', { kill: function (p) { game.heal(p, p.stats.hpMax * 0.03); stacks(p, 'bloodrush', 3, 4, 5, 'attackSpeed'); } });
  def('w_warlord', 'warrior', 'craft', 4, 0, 'Warlord', 'Battle Shout and War Cry refill Shoulder Charge and give +15% damage for 6 s.', { cast: function (p, sk) { if (sk.id === 'battle_shout' || sk.id === 'war_cry') { game.ctl.dashN = -1; game.ctl.dashCd = 0; game.addEffect(p, { id: 'warlord', t: 6, dealt: 15 }); } } });
  def('w_crushing', 'warrior', 'craft', 4, 1, 'Crushing Blows', 'Stunned foes take 40% more damage from you.', { dmg: function (p, t) { return game.isStunned(t) ? 1.4 : 1; } });
  def('w_juggernaut', 'warrior', 'craft', 5, 0, 'Juggernaut', 'Shoulder Charge has 2 charges and you cannot be stunned. −10% maximum life.', { stats: function (p, st, b) { b.dashCharges = (b.dashCharges || 0) + 1; b.noStun = 1; b.hpPct -= 10; } });
  def('w_oath', 'warrior', 'craft', 5, 1, "Berserker's Oath", '+40% damage and +20% attack speed. You cannot drink health potions.', { stats: function (p, st, b) { st.dmgPct += 40; st.attackSpeed += 20; b.noPotions = 1; } });
  def('w_shoulder_through', 'warrior', 'edge', 1, 0, 'Shoulder Through', 'Being untouchable inside a telegraph as it lands counts as a Close Call.', { stats: function (p, st, b) { b.ccInvuln = 1; } });
  def('w_steel_nerves', 'warrior', 'edge', 1, 1, 'Steel Nerves', 'Close Call lasts 8 s (not 5).', { stats: function (p, st, b) { b.ccTime = 8; } });
  def('w_iron_tempo', 'warrior', 'edge', 2, 0, 'Iron Tempo', 'Each Close Call halves the dash recharge left.', { cc: function () { game.ctl.dashCd *= 0.5; } });
  def('w_counterweight', 'warrior', 'edge', 2, 1, 'Counterweight', 'After a Close Call your next basic attack deals double damage.', { cc: function (p) { game.addEffect(p, { id: 'counterweight', t: 6 }); }, dmg: function (p, t, s) { return s.skill === false && game.getEffect(p, 'counterweight') ? 2 : 1; }, afterHit: function (p, t, d, s) { if (s.skill === false) game.removeEffect(p, 'counterweight'); } });
  def('w_avalanche', 'warrior', 'edge', 3, 0, 'Avalanche', 'Flow brings down a 2.5-tile slam for 150% that stuns for 1 s.', { flow: function (p) { U.shake(5, 0.3); game.K.zone({ x: p.x, y: p.y, r: 2.5, delay: 0.05, pct: 150, dtype: 'phys', st: [['stun', 100, 1]], fx: 'explosion', color: '#c08a4a' }); } });
  def('w_unbroken', 'warrior', 'edge', 3, 1, 'Unbroken Flow', 'Your Flow chain window is 12 s (not 8).', { stats: function (p, st, b) { b.flowWindow = 12; } });
  def('w_forge_heat', 'warrior', 'edge', 4, 0, 'Forge Heat', 'Take 2% less damage per Heat; hard hits knock out only a third of it.', { stats: function (p, st, b) { b.heatLossDiv = 3; }, hurt: function (p, a) { return a * (1 - 0.02 * heat()); } });
  def('w_ember_hunger', 'warrior', 'edge', 4, 1, 'Ember Hunger', 'Embers fly to you from 2.5 tiles.', { stats: function (p, st, b) { b.emberR = 2.5; } });
  def('w_last_stand', 'warrior', 'edge', 5, 0, 'Last Stand', 'Once per floor a lethal hit leaves you at 1 life, untouchable for 3 s. Heat cannot exceed 5.', { stats: function (p, st, b) { b.lastStand = 1; b.heatMax = 5; } });
  def('w_glory', 'warrior', 'edge', 5, 1, 'Glory Hound', 'Close Call stacks give +25% damage (not 15). You take 15% more damage.', { stats: function (p, st, b) { b.ccPer = 25; }, hurt: function (p, a) { return a * 1.15; } });
  def('w_hunters_grip', 'warrior', 'cross', 1, 0, "Hunter's Grip", 'Licence: bows and daggers carry no off-class penalty.', Object.assign({ licence: ['bow', 'dagger'] }, licence(['bow', 'dagger'])));
  def('w_pit_fighter', 'warrior', 'cross', 1, 1, 'Pit Fighter', 'Licence: staves and wands carry no off-class penalty.', Object.assign({ licence: ['staff', 'wand'] }, licence(['staff', 'wand'])));
  def('w_point_blank', 'warrior', 'cross', 2, 0, 'Point Blank', 'Bow basic attacks within 2.5 tiles deal +40% and shove. −15% armour while you hold a bow.',
    { statsPost: function (p, st, b) { if (b.w && b.w.type === 'bow') st.armor = Math.round(st.armor * 0.85); },
      dmg: function (p, t, s) { return s.skill === false && p.bonus.w.type === 'bow' && distTo(p, t) < 2.5 ? 1.4 : 1; },
      afterHit: function (p, t, d, s) { if (s.skill === false && p.bonus.w.type === 'bow' && distTo(p, t) < 2.5 && t.rarity !== 'boss' && !t.dead) { const k = 0.2 / (distTo(p, t) || 1); for (let i = 0; i < 5; i++) if (!W.move(t, (t.x - p.x) * k, (t.y - p.y) * k)) break; } } });
  def('w_quarterstaff', 'warrior', 'cross', 2, 1, 'Quarterstaff', 'With a staff your basic attacks are melee sweeps that hit everything around you (60%).', { statsPost: function (p, st, b) { if (b.w && b.w.type === 'staff') { b.w.ranged = 0; b.staffSweep = 1; } } });
  def('w_borrowed_arrow', 'warrior', 'cross', 3, 0, 'Borrowed Arrow', 'Every dash ends with a free basic attack at the nearest foe.', { dash: function (p) { const t = game.pickTarget(8); if (t && game.freeBasic) game.freeBasic(p, t); } });
  def('w_shield_line', 'warrior', 'cross', 3, 1, 'Shield Line', 'With a shield, shots from the front are stopped half the time.', { stats: function (p, st, b) { b.shieldLine = 1; } });
  def('w_spoils', 'warrior', 'cross', 4, 0, 'Spoils of War', 'Elites you kill roll their loot twice.', { loot: function (p, t) { return isElite(t) ? 1 : 0; } });
  def('w_tactician', 'warrior', 'cross', 4, 1, 'Tactician', 'Each skill different from the one before gives +8% damage (stacks 4); repeating one resets it.', { cast: function (p, sk, ctx, V, s) { if (s.last && s.last !== sk.id) stacks(p, 'tactician', 4, 6, 8, 'dealt'); else game.removeEffect(p, 'tactician'); s.last = sk.id; } });
  def('w_weapon_master', 'warrior', 'cross', 5, 0, 'Weapon Master', 'Every weapon is licensed and off-class weapons deal +10%. Your class weapons deal −10%.', weaponMaster());
  def('w_colossus', 'warrior', 'cross', 5, 1, 'Colossus', '+30% life and +20% armour. −15% move speed; dash recharges 50% slower.', { stats: function (p, st, b) { b.hpPct += 30; b.armorPct += 20; st.moveSpeed -= 15; b.dashCdMult = 1.5; } });

  // ============================== Ranger ==============================
  def('r_steady', 'ranger', 'craft', 1, 0, 'Steady Draw', '+15% critical chance after standing still for 0.5 s.', { crit: function () { return game.stillT >= 0.5 ? 15 : 0; } });
  def('r_running', 'ranger', 'craft', 1, 1, 'Running Shot', '+15% damage while moving.', { dmg: function () { return game.stillT < 0.2 ? 1.15 : 1; } });
  def('r_volley', 'ranger', 'craft', 2, 0, 'Volley Tempo', 'Multishot looses one more arrow per 3 Heat.', { cast: function (p, sk, ctx, V) { if (sk.id === 'multishot' && V.n) V.n += Math.floor(heat() / 3); } });
  def('r_long_draw', 'ranger', 'craft', 2, 1, 'Long Draw', '+2% damage per tile beyond 4 (up to +20%).', { dmg: function (p, t) { const d = distTo(p, t); return d > 4 ? 1 + Math.min(0.2, (d - 4) * 0.02) : 1; } });
  def('r_mark', 'ranger', 'craft', 3, 0, "Hunter's Mark", 'Your first hit on an elite marks it: +12% damage from you for 8 s.', { afterHit: function (p, t) { if (isElite(t) && !t.perkMarked && !t.dead) { t.perkMarked = true; game.addEffect(t, { id: 'hunter_mark', t: 8 }); U.text(t.x, t.y - 1.3, 'Marked', '#ffd94a'); } }, dmg: function (p, t) { return t.effects.length && game.getEffect(t, 'hunter_mark') ? 1.12 : 1; } });
  def('r_pinning', 'ranger', 'craft', 3, 1, 'Pinning Shot', 'Basic attacks slow by 30% for 2 s.', { afterHit: function (p, t, d, s) { if (s.skill === false && !t.dead) game.applyStatus(t, 'slow', 2, 0.3); } });
  def('r_trapper', 'ranger', 'craft', 4, 0, 'Trapper', 'Your traps deal 40% more.', { stats: function (p, st, b) { b.trapPct = 40; } });
  def('r_poison_tips', 'ranger', 'craft', 4, 1, 'Poison Tips', 'Basic attacks poison for 20% of the hit over 4 s.', { afterHit: function (p, t, d, s) { if (s.skill === false && !t.dead && d > 0) game.applyStatus(t, 'poison', 4, d * 0.05, p); } });
  def('r_ghost_step', 'ranger', 'craft', 5, 0, 'Ghost Step', '3 dash charges and 0.15 s more untouchable. Each charge recharges 1 s slower.', { stats: function (p, st, b) { b.dashCharges = (b.dashCharges || 0) + 1; b.dashInv = (b.dashInv || 0) + 0.15; b.dashCd = (b.dashCd || 0) - 1; } });
  def('r_deadeye', 'ranger', 'craft', 5, 1, 'Deadeye', 'Crits on foes 8+ tiles away deal double again. −20% damage within 3 tiles.', { dmg: function (p, t, s, crit) { const d = distTo(p, t); return (crit && d >= 8 ? 2 : 1) * (d < 3 ? 0.8 : 1); } });
  def('r_reload', 'ranger', 'edge', 1, 0, 'Reload Roll', 'A dash that passes within 1.5 tiles of a foe refunds a charge (once per 4 s).',
    { dash: function (p, x0, y0, s) { if (G.state.time < (s.reloadAt || 0)) return; const vx = p.x - x0, vy = p.y - y0, L = vx * vx + vy * vy || 1;
      for (const e of game.live.foes) { if (e.dead) continue; const k = U.clamp(((e.x - x0) * vx + (e.y - y0) * vy) / L, 0, 1); if (Math.hypot(e.x - x0 - vx * k, e.y - y0 - vy * k) < 1.5) { s.reloadAt = G.state.time + 4; game.ctl.dashN = Math.max(0, game.ctl.dashN) + 1; U.text(p.x, p.y - 1.2, 'Reload', '#7fffd4'); return; } } } });
  def('r_evasive', 'ranger', 'edge', 1, 1, 'Evasive Roll', 'Each dash gives +30% dodge for 2 s.', { dash: function (p) { game.addEffect(p, { id: 'evasive', t: 2, mods: { dodge: 30 } }); } });
  def('r_kite', 'ranger', 'edge', 2, 0, 'Kite Rhythm', 'Each Close Call: +10% attack speed for 4 s (stacks 3).', { cc: function (p) { stacks(p, 'kite', 3, 4, 10, 'attackSpeed'); } });
  def('r_second_chance', 'ranger', 'edge', 2, 1, 'Second Chance', 'Each Close Call heals 4% life.', { cc: function (p) { game.heal(p, p.stats.hpMax * 0.04, true); } });
  def('r_bullet_time', 'ranger', 'edge', 3, 0, 'Bullet Time', 'Flow slow-motion lasts 50% longer and your basic shots pierce everything during it.', { stats: function (p, st, b) { b.flowSlowMult = 1.5; b.flowPierce = 1; } });
  def('r_flow_volley', 'ranger', 'edge', 3, 1, 'Flow Volley', 'Flow looses an arrow at every foe within 8 tiles (130%).', { flow: function (p) { for (const e of game.K.around(p.x, p.y, 8)) if (W.los(p.x, p.y, e.x, e.y)) game.K.shoot(p, Math.atan2(e.y - p.y, e.x - p.x), { pct: 130, type: 'phys', shape: 'arrow', color: '#7fffd4', speed: 18 }); } });
  def('r_fletching', 'ranger', 'edge', 4, 0, 'Ember Fletching', 'At Heat 6 or more your basic attacks deal +20%.', { dmg: function (p, t, s) { return s.skill === false && heat() >= 6 ? 1.2 : 1; } });
  def('r_hot_pursuit', 'ranger', 'edge', 4, 1, 'Hot Pursuit', '+2% move speed per Heat.', { stats: function (p, st, b) { b.heatMove = 2; } });
  def('r_wind_dancer', 'ranger', 'edge', 5, 0, 'Wind Dancer', '+20% move speed and dash charges recharge 1 s faster. You cannot block and take 15% more damage.', { stats: function (p, st, b) { st.moveSpeed += 20; b.dashCd = (b.dashCd || 0) + 1; }, statsPost: function (p, st) { st.block = 0; }, hurt: function (p, a) { return a * 1.15; } });
  def('r_sniper', 'ranger', 'edge', 5, 1, "Sniper's Nest", 'After standing still for 1 s you deal +40%; while moving −15%.', { dmg: function () { return game.stillT >= 1 ? 1.4 : game.stillT < 0.2 ? 0.85 : 1; } });
  def('r_duellist', 'ranger', 'cross', 1, 0, "Duellist's Hand", 'Licence: swords and maces carry no off-class penalty.', Object.assign({ licence: ['sword', 'mace'] }, licence(['sword', 'mace'])));
  def('r_staffwand', 'ranger', 'cross', 1, 1, 'Staff and Wand', 'Licence: staves and wands carry no off-class penalty.', Object.assign({ licence: ['staff', 'wand'] }, licence(['staff', 'wand'])));
  def('r_riposte', 'ranger', 'cross', 2, 0, 'Riposte', 'After a Close Call your next melee hit stuns for 1 s.', { cc: function (p) { game.addEffect(p, { id: 'riposte', t: 6 }); }, afterHit: function (p, t, d, s) { if (s.melee && game.getEffect(p, 'riposte')) { game.removeEffect(p, 'riposte'); if (!t.dead) game.applyStatus(t, 'stun', 1); } } });
  def('r_spell_arrows', 'ranger', 'cross', 2, 1, 'Spell Arrows', 'With a staff or wand your basic attacks burst for 70% in 1.5 tiles.', { stats: function (p, st, b) { b.spellArrows = 1; } });
  def('r_brawler', 'ranger', 'cross', 3, 0, "Brawler's Roll", 'Every dash ends in a 1.6-tile sweep (100%).', { dash: function (p) { U.fx('slash', p.x, p.y, { angle: p.facing, radius: 1.6 }); for (const e of game.K.around(p.x, p.y, 1.6)) game.playerHit(e, { pct: 100, type: 'phys', skill: false, melee: true, noProc: true }); } });
  def('r_quiver', 'ranger', 'cross', 3, 1, 'Arcane Quiver', '+20% skill damage while holding an off-class weapon.', { dmg: function (p, t, s) { return s.skill !== false && !classWeapon(p) ? 1.2 : 1; } });
  def('r_trophy', 'ranger', 'cross', 4, 0, 'Trophy Hunter', 'Elites you kill roll their loot twice.', { loot: function (p, t) { return isElite(t) ? 1 : 0; } });
  def('r_medic', 'ranger', 'cross', 4, 1, 'Field Medic', 'Health potions heal 50% more.', { stats: function (p, st, b) { b.potionPct = 50; } });
  def('r_weapon_master', 'ranger', 'cross', 5, 0, 'Weapon Master', 'Every weapon is licensed and off-class weapons deal +10%. Your class weapons deal −10%.', weaponMaster());
  def('r_lone_wolf', 'ranger', 'cross', 5, 1, 'Lone Wolf', '+30% damage while no foe is within 4 tiles. Melee hits on you deal 25% more.', { dmg: function (p) { for (const e of game.live.foes) if (!e.dead && Math.abs(e.x - p.x) < 4 && Math.abs(e.y - p.y) < 4 && distTo(p, e) < 4) return 1; return 1.3; }, hurt: function (p, a, src, o) { return o && o.melee ? a * 1.25 : a; } });

  // ============================== Sorcerer ==============================
  const ELEM = function (sk) { const i = sk.id; return /fire|meteor|incinerat|combust/.test(i) ? 'fire' : /ice|frost|blizzard|glacial|shatter/.test(i) ? 'cold' : /lightning|thunder|overcharge|chain/.test(i) ? 'lightning' : 'arcane'; };
  def('s_kindling', 'sorcerer', 'craft', 1, 0, 'Kindling', 'Fire skills deal +15% to burning foes.', { dmg: function (p, t, s) { return s.skill !== false && s.type === 'fire' && t.effects.length && game.getEffect(t, 'burn') ? 1.15 : 1; } });
  def('s_cold_snap', 'sorcerer', 'craft', 1, 1, 'Cold Snap', 'Frost Nova freezes 0.6 s longer.', { cast: function (p, sk, ctx, V) { if (sk.id === 'frost_nova' && V.fr) V.fr += 0.6; } });
  def('s_overload', 'sorcerer', 'craft', 2, 0, 'Overload', 'Every 5th spell within 6 s costs no mana and deals +30%.', { cast: function (p, sk, ctx, V, s) { const now = G.state.time; s.n = now - (s.at || -99) <= 6 ? (s.n || 0) + 1 : 1; s.at = now; if (s.n % 5 === 0) { ctx.cost = 0; if (V.dmg) V.dmg *= 1.3; U.text(p.x, p.y - 1.4, 'Overload', '#b98cff', true); } } });
  def('s_static', 'sorcerer', 'craft', 2, 1, 'Static Field', 'Your lightning hits always shock.', { afterHit: function (p, t, d, s) { if (s.type === 'lightning' && !t.dead) game.applyStatus(t, 'shock', 3); } });
  def('s_pyromania', 'sorcerer', 'craft', 3, 0, 'Pyromania', 'Burning foes you kill set foes within 2 tiles burning.', { afterHit: function (p, t) { if (t.effects.length && game.getEffect(t, 'burn')) t.wasBurning = true; }, kill: function (p, t) { if (!t.wasBurning) return; U.fx('explosion', t.x, t.y, { radius: 2, color: COL.fire }); for (const e of game.K.around(t.x, t.y, 2)) if (e !== t) game.applyStatus(e, 'burn', 4, Math.max(1, t.stats.hpMax * 0.04), p); } });
  def('s_permafrost', 'sorcerer', 'craft', 3, 1, 'Permafrost', 'Chilled or frozen foes take 15% more from you.', { dmg: function (p, t) { return t.effects.length && (game.getEffect(t, 'chill') || game.getEffect(t, 'freeze')) ? 1.15 : 1; } });
  def('s_battery', 'sorcerer', 'craft', 4, 0, 'Arcane Battery', 'Up to +10% skill damage while above half mana.', { dmg: function (p, t, s) { return s.skill !== false ? 1 + U.clamp((p.mp / Math.max(1, p.stats.mpMax) - 0.5) * 0.2, 0, 0.1) : 1; } });
  def('s_rotation', 'sorcerer', 'craft', 4, 1, 'Elemental Rotation', 'A spell of a different element than your last deals +15% for 3 s.', { cast: function (p, sk, ctx, V, s) { const e = ELEM(sk); if (s.last && s.last !== e) game.addEffect(p, { id: 'rotation', t: 3, dealt: 15 }); s.last = e; } });
  def('s_glass', 'sorcerer', 'craft', 5, 0, 'Glass Cannon', '+35% skill damage. You take 25% more damage.', { stats: function (p, st) { st.skillDmgPct += 35; }, hurt: function (p, a) { return a * 1.25; } });
  def('s_archmage', 'sorcerer', 'craft', 5, 1, 'Archmage', 'Cooldowns are 30% shorter. Mana costs are 50% higher.', { cast: function (p, sk, ctx) { ctx.cd *= 0.7; ctx.cost = Math.round(ctx.cost * 1.5); } });
  def('s_rime_blink', 'sorcerer', 'edge', 1, 0, 'Rime Blink', 'Blink leaves a 2-tile frost nova (80%) where you were.', { dash: function (p, x0, y0) { game.K.zone({ x: x0, y: y0, r: 2, delay: 0.05, pct: 80, dtype: 'cold', st: [['chill', 100, 2]], fx: 'frost', color: COL.cold }); } });
  def('s_phase', 'sorcerer', 'edge', 1, 1, 'Phase Shift', 'After a Blink you take 50% less damage for 1.5 s.', { dash: function (p) { game.addEffect(p, { id: 'phase_shift', t: 1.5, taken: -50 }); } });
  def('s_arcane_rhythm', 'sorcerer', 'edge', 2, 0, 'Arcane Rhythm', 'Each Close Call returns 10% mana.', { cc: function (p) { p.mp = Math.min(p.stats.mpMax, p.mp + p.stats.mpMax * 0.1); } });
  def('s_spell_echo', 'sorcerer', 'edge', 2, 1, 'Spell Echo', 'A Close Call makes your next spell free.', { cc: function (p) { game.addEffect(p, { id: 'spell_echo', t: 8 }); }, cast: function (p, sk, ctx) { if (game.getEffect(p, 'spell_echo')) { ctx.cost = 0; game.removeEffect(p, 'spell_echo'); } } });
  def('s_time_thief', 'sorcerer', 'edge', 3, 0, 'Time Thief', 'During Flow slow-motion your cooldowns run 3× as fast.', { stats: function (p, st, b) { b.flowCdx = 3; } });
  def('s_singularity', 'sorcerer', 'edge', 3, 1, 'Singularity', 'Flow pulls foes within 5 tiles 2 tiles toward you and chills them.', { flow: function (p) { U.fx('nova', p.x, p.y, { radius: 5, color: '#b98cff' }); for (const e of game.K.around(p.x, p.y, 5)) { const d = distTo(p, e) || 1, k = Math.min(2, d - 0.8) / d; if (e.rarity !== 'boss') for (let i = 0; i < 10; i++) if (!W.move(e, (p.x - e.x) * k / 10, (p.y - e.y) * k / 10)) break; game.applyStatus(e, 'chill', 3); } } });
  def('s_conflag', 'sorcerer', 'edge', 4, 0, 'Conflagration', '+4% fire damage per Heat, and Heat cools every 8 s (not 6).', { stats: function (p, st, b) { b.heatCool = 8; }, dmg: function (p, t, s) { return s.type === 'fire' ? 1 + 0.04 * heat() : 1; } });
  def('s_heat_shield', 'sorcerer', 'edge', 4, 1, 'Heat Shield', 'Take 2% less damage per Heat.', { hurt: function (p, a) { return a * (1 - 0.02 * heat()); } });
  def('s_event_horizon', 'sorcerer', 'edge', 5, 0, 'Event Horizon', '3 Blink charges. Every Blink costs 8% of your maximum mana.', { stats: function (p, st, b) { b.dashCharges = (b.dashCharges || 0) + 1; }, dash: function (p) { p.mp = Math.max(0, p.mp - p.stats.mpMax * 0.08); } });
  def('s_pyre_heart', 'sorcerer', 'edge', 5, 1, 'Pyre Heart', 'Heat can reach 15, but it cools every 3 s.', { stats: function (p, st, b) { b.heatMax = 15; b.heatCool = 3; } });
  def('s_battlemage', 'sorcerer', 'cross', 1, 0, 'Battle-Mage', 'Licence: swords, maces and daggers carry no off-class penalty.', Object.assign({ licence: ['sword', 'mace', 'dagger'] }, licence(['sword', 'mace', 'dagger'])));
  def('s_hexbow', 'sorcerer', 'cross', 1, 1, 'Hexbow', 'Licence: bows carry no off-class penalty.', Object.assign({ licence: ['bow'] }, licence(['bow'])));
  def('s_spellblade', 'sorcerer', 'cross', 2, 0, 'Spellblade', 'Every 3rd basic attack fires a free Fire Bolt (100%). −20% mana regeneration with an off-class weapon.',
    { statsPost: function (p, st, b) { if (b.w && game.CLASSES[p.classId].weaponTypes.indexOf(b.w.type) < 0) st.mpRegen = Math.round(st.mpRegen * 80) / 100; },
      afterHit: function (p, t, d, s, st) { if (s.skill !== false || s.noProc) return; st.n = (st.n || 0) + 1; if (st.n % 3 === 0 && !t.dead) { game.K.shoot(p, Math.atan2(t.y - p.y, t.x - p.x), { pct: 100, type: 'fire', shape: 'fireball', color: COL.fire, speed: 13, st: [['burn', 100, 3, 0.1]] }); U.sfx('fire'); } } });
  def('s_arcane_arrows', 'sorcerer', 'cross', 2, 1, 'Arcane Arrows', 'Bow basic attacks deal +30%.', { dmg: function (p, t, s) { return s.skill === false && p.bonus.w.type === 'bow' ? 1.3 : 1; } });
  def('s_blood_magic', 'sorcerer', 'cross', 3, 0, 'Blood Magic', 'Without enough mana, spells cost life instead.', { stats: function (p, st, b) { b.bloodMagic = 1; } });
  def('s_mana_thief', 'sorcerer', 'cross', 3, 1, 'Mana Thief', 'Basic attacks restore 2% mana.', { afterHit: function (p, t, d, s) { if (s.skill === false && !s.noProc) p.mp = Math.min(p.stats.mpMax, p.mp + p.stats.mpMax * 0.02); } });
  def('s_charged', 'sorcerer', 'cross', 4, 0, 'Spell-Charged', 'Each spell charges your next basic attack with +40% (holds 3).',
    { cast: function (p) { stacks(p, 'charged', 3, 10, 0, 'dealt'); const e = game.getEffect(p, 'charged'); if (e) e.dealt = 0; },
      dmg: function (p, t, s) { return s.skill === false && game.getEffect(p, 'charged') ? 1.4 : 1; },
      afterHit: function (p, t, d, s) { if (s.skill !== false || s.noProc) return; const e = game.getEffect(p, 'charged'); if (!e) return; if (e.stacks > 1) e.stacks--; else game.removeEffect(p, 'charged'); } });
  def('s_ward', 'sorcerer', 'cross', 4, 1, 'Ward', 'Every 10 s a shield absorbs damage worth 15% of your life.', shield(15, 10));
  def('s_weapon_master', 'sorcerer', 'cross', 5, 0, 'Weapon Master', 'Every weapon is licensed and off-class weapons deal +10%. Your class weapons deal −10%.', weaponMaster());
  def('s_unbound', 'sorcerer', 'cross', 5, 1, 'Unbound Mind', 'Mana costs are 40% lower. −30% maximum mana.', { stats: function (p, st, b) { b.mpPct -= 30; }, cast: function (p, sk, ctx) { ctx.cost = Math.round(ctx.cost * 0.6); } });

  // ============================== Necromancer ==============================
  const BONE = { bone_spear: 1, bone_nova: 1, bone_spirit: 1 }, POISON = { poison_nova: 1, poison_arrow: 1 };
  def('n_hollow', 'necromancer', 'craft', 1, 0, 'Hollow Bones', 'Your minions move and attack 25% faster.', { minion: function (p, m) { m.speed *= 1.25; m.atkCd /= 1.25; } });
  def('n_bone_wall', 'necromancer', 'craft', 1, 1, 'Bone Wall', 'Skeleton warriors have +40% life and −15% damage.', { minion: function (p, m) { if (m.monsterId !== 'minion_skeleton') return; m.stats.hpMax = m.hp = Math.round(m.stats.hpMax * 1.4); m.dmgMin *= 0.85; m.dmgMax *= 0.85; } });
  def('n_marrow', 'necromancer', 'craft', 2, 0, 'Marrow Feast', 'Corpse Explosion deals +30%.', { cast: function (p, sk, ctx, V) { if (sk.id === 'corpse_explosion' && V.dmg) V.dmg *= 1.3; } });
  def('n_hoarder', 'necromancer', 'craft', 2, 1, 'Corpse Hoarder', 'Corpses last twice as long.', { kill: function (p, t) { if (t.ai) t.ai.corpse *= 2; } });
  def('n_grave_pact', 'necromancer', 'craft', 3, 0, 'Grave Pact', "A minion's death heals you 3% life.", { minionDeath: function (p) { game.heal(p, p.stats.hpMax * 0.03, true); } });
  def('n_deaths_due', 'necromancer', 'craft', 3, 1, "Death's Due", 'Your minions\' kills restore 2 mana.', { minionKill: function (p) { p.mp = Math.min(p.stats.mpMax, p.mp + 2); } });
  def('n_plague', 'necromancer', 'craft', 4, 0, 'Plague Bearer', 'Poison skills deal +20%; poisoned foes spread poison when they die.',
    { cast: function (p, sk, ctx, V) { if (POISON[sk.id]) { if (V.dmg) V.dmg *= 1.2; if (V.poi) V.poi *= 1.2; } }, afterHit: function (p, t) { if (t.effects.length && game.getEffect(t, 'poison')) t.wasPoisoned = true; },
      kill: function (p, t) { if (!t.wasPoisoned) return; U.fx('poison', t.x, t.y, { radius: 2 }); for (const e of game.K.around(t.x, t.y, 2)) if (e !== t) game.applyStatus(e, 'poison', 4, Math.max(1, t.stats.hpMax * 0.04), p); } });
  def('n_bone_lord', 'necromancer', 'craft', 4, 1, 'Bone Lord', 'Bone skills deal +20%.', { cast: function (p, sk, ctx, V) { if (BONE[sk.id] && V.dmg) V.dmg *= 1.2; } });
  def('n_legion', 'necromancer', 'craft', 5, 0, 'Legion Unbound', '+2 skeleton warriors. All minions have −25% life.', { stats: function (p, st, b) { b.extraSkel = 2; }, minion: function (p, m) { m.stats.hpMax = m.hp = Math.max(1, Math.round(m.stats.hpMax * 0.75)); } });
  def('n_lone_lich', 'necromancer', 'craft', 5, 1, 'Lone Lich', 'You cannot raise minions. +50% skill damage.', { stats: function (p, st, b) { b.noSummon = 1; st.skillDmgPct += 50; } });
  def('n_swap_tempo', 'necromancer', 'edge', 1, 0, 'Swap Tempo', 'Every dash hastes your minions by 30% for 3 s.', { dash: function () { haste(0.3, 3); } });
  def('n_bone_step', 'necromancer', 'edge', 1, 1, 'Bone Step', 'Grave Step leaves a bone burst (80%) where you were.', { dash: function (p, x0, y0) { game.K.zone({ x: x0, y: y0, r: 1.8, delay: 0.05, pct: 80, dtype: 'phys', fx: 'explosion', color: '#e8e0d0' }); } });
  def('n_death_march', 'necromancer', 'edge', 2, 0, 'Death March', 'Each Close Call hastes your minions by 25% for 4 s.', { cc: function () { haste(0.25, 4); } });
  def('n_soul_sip', 'necromancer', 'edge', 2, 1, 'Soul Sip', 'Each Close Call heals your minions 20%.', { cc: function () { for (const m of minions()) game.heal(m, m.stats.hpMax * 0.2); } });
  def('n_black_flow', 'necromancer', 'edge', 3, 0, 'Black Flow', 'Flow detonates every corpse within 6 tiles (60% Corpse Explosion).',
    { flow: function (p) { for (const c of G.state.entities) { if (!c.dead || c.type !== 'monster' || c.exploded || c.noCorpse || !(c.ai && c.ai.corpse > 0.2) || distTo(p, c) > 6) continue; c.exploded = true; c.ai.corpse = 0; game.K.zone({ x: c.x, y: c.y, r: 2.4, delay: 0.05, pct: 144, dtype: 'fire', fx: 'explosion', color: '#d03a3a' }); } } });
  def('n_army_flow', 'necromancer', 'edge', 3, 1, 'Army of Flow', 'Flow raises 2 skeletons for 10 s.', { flow: function (p) { for (let i = 0; i < 2; i++) tempSkeleton(p, p.x + U.rand(-1.5, 1.5), p.y + U.rand(-1.5, 1.5), 10, 4); } });
  def('n_pyre', 'necromancer', 'edge', 4, 0, 'Pyre', 'Embers your minions walk through count as yours.', { stats: function (p, st, b) { b.minionEmbers = 1; } });
  def('n_cold_hands', 'necromancer', 'edge', 4, 1, 'Cold Hands', '+3% poison damage per Heat.', { dmg: function (p, t, s) { return s.type === 'poison' ? 1 + 0.03 * heat() : 1; } });
  def('n_lich_bargain', 'necromancer', 'edge', 5, 0, 'Lich Bargain', 'Lich Form lasts until a single hit takes more than 10% of your life. Its cooldown doubles.',
    { cast: function (p, sk, ctx) { if (sk.id === 'lich_form') ctx.cd *= 2; }, afterCast: function (p, sk) { if (sk.id === 'lich_form') { const e = game.getEffect(p, 'lich_form'); if (e) e.t = 1e6; } },
      hurt: function (p, a) { if (a > p.stats.hpMax * 0.1 && game.getEffect(p, 'lich_form')) { game.removeEffect(p, 'lich_form'); U.text(p.x, p.y - 1.4, 'The lich breaks', '#8ee06a'); } return a; } });
  def('n_hungering', 'necromancer', 'edge', 5, 1, 'Hungering Dark', 'Kills heal 2% life. You do not regenerate life.', { stats: function (p, st, b) { b.noRegen = 1; }, kill: function (p) { game.heal(p, p.stats.hpMax * 0.02); } });
  def('n_grave_archer', 'necromancer', 'cross', 1, 0, 'Grave Archer', 'Licence: bows and axes carry no off-class penalty.', Object.assign({ licence: ['bow', 'axe'] }, licence(['bow', 'axe'])));
  def('n_gravedigger', 'necromancer', 'cross', 1, 1, 'Gravedigger', 'Licence: swords and maces carry no off-class penalty.', Object.assign({ licence: ['sword', 'mace'] }, licence(['sword', 'mace'])));
  def('n_bone_arrows', 'necromancer', 'cross', 2, 0, 'Bone Arrows', 'Basic attacks that kill raise a skeleton for 15 s (up to 2). Your minions take 15% more damage.',
    { stats: function (p, st, b) { b.minionTaken = 15; }, afterHit: function (p, t, d, s) { if (s.skill === false) t.lastBasic = G.state.time; }, kill: function (p, t) { if (t.lastBasic === G.state.time) tempSkeleton(p, t.x, t.y, 15, 2); } });
  def('n_reaper', 'necromancer', 'cross', 2, 1, "Reaper's Swing", 'Melee basic attacks heal 5% of their damage.', { afterHit: function (p, t, d, s) { if (s.skill === false && s.melee && d > 0) game.heal(p, d * 0.05); } });
  def('n_curse_ink', 'necromancer', 'cross', 3, 0, 'Curse Ink', 'Basic attacks curse for 3 s: +10% damage taken.', { afterHit: function (p, t, d, s) { if (s.skill === false && !t.dead) game.addEffect(t, { id: 'curse_ink', t: 3, taken: 10 }); } });
  def('n_withering', 'necromancer', 'cross', 3, 1, 'Withering Touch', 'Basic attacks poison for 30% of the hit over 4 s.', { afterHit: function (p, t, d, s) { if (s.skill === false && !t.dead && d > 0) game.applyStatus(t, 'poison', 4, d * 0.075, p); } });
  def('n_lantern', 'necromancer', 'cross', 4, 0, 'Corpse Lantern', '+4% damage per corpse within 4 tiles (up to 5).', { dmg: function (p, t, s, crit, st) { const now = G.state.time; if (!(st.at > now - 0.5)) { st.at = now; let n = 0; for (const c of G.state.entities) if (c.dead && c.type === 'monster' && !c.exploded && distTo(p, c) < 4) n++; st.n = Math.min(5, n); } return 1 + 0.04 * (st.n || 0); } });
  def('n_bone_ward', 'necromancer', 'cross', 4, 1, 'Bone Ward', 'Every 12 s a shield absorbs damage worth 12% of your life.', shield(12, 12));
  def('n_weapon_master', 'necromancer', 'cross', 5, 0, 'Weapon Master', 'Every weapon is licensed and off-class weapons deal +10%. Your class weapons deal −10%.', weaponMaster());
  def('n_puppets', 'necromancer', 'cross', 5, 1, 'Master of Puppets', 'Your minions deal +40%. You deal 25% less.', { minion: function (p, m) { m.dmgMin *= 1.4; m.dmgMax *= 1.4; }, dmg: function () { return 0.75; } });

  // ============================== points, marks, wagers ==============================
  function perksOf(p) { if (!p.perks || typeof p.perks !== 'object') p.perks = {}; return p.perks; }
  function act() { const f = G.state.flags || {}; return f.act | 0 || Math.max(1, Math.min(4, Math.ceil((f.maxDepth | 0) / 10))); }
  function earnedMarks(p) { let n = 0; for (const k in (p.feats || {})) if (p.feats[k]) n++; return n; }
  function spent(p, how) { let n = 0; const P = perksOf(p); for (const id in P) if (P[id] === how && PERKS[id]) n += PERKS[id].cost; return n; }
  game.getPerkPoints = function (p) {
    p = p || G.state.player;
    if (!p) return { points: 0, marks: 0, wagerOpen: null, wagerAvailable: false };
    const f = G.state.flags || {};
    return { points: Math.floor(p.level / 6) + (p.wagerCredits | 0) - spent(p, 'point'), marks: earnedMarks(p) - spent(p, 'mark'),
      wagerOpen: p.wager || null, wagerAvailable: !p.wager && f.perkWagerAct !== act(), earnedPoints: Math.floor(p.level / 6), earnedMarks: earnedMarks(p) };
  };
  function legal(p, id) {
    const d = PERKS[id];
    if (!d || !p) return 'Unknown perk';
    if (d.classId !== p.classId) return 'Another class\'s perk';
    const P = perksOf(p);
    if (P[id]) return 'Already taken';
    const pair = ORDER[d.classId][d.branch][d.tier];
    if (P[pair[1 - d.opt]]) return 'You chose ' + PERKS[pair[1 - d.opt]].name;
    if (d.tier > 1) { const prev = ORDER[d.classId][d.branch][d.tier - 1]; if (!P[prev[0]] && !P[prev[1]]) return 'Needs a tier ' + (d.tier - 1) + ' perk in ' + d.branch; }
    return null;
  }
  game.buyPerk = function (id, opts) {
    const p = G.state.player, d = PERKS[id];
    opts = opts || {};
    if (legal(p, id)) return false;
    const pts = game.getPerkPoints(p);
    let how;
    if (opts.wager) { if (!pts.wagerAvailable) return false; how = 'wager'; }
    else if (opts.mark) { if (pts.marks < d.cost) return false; how = 'mark'; }
    else if (pts.points >= d.cost) how = 'point';
    else return false;
    perksOf(p)[id] = how;
    if (how === 'wager') { p.wager = id; G.state.flags.perkWagerAct = act(); }
    game.recomputeStats(p);
    G.emit('perk:bought', { id: id, how: how });
    return true;
  };
  game.getPerkInfo = function (id) {
    const p = G.state.player, d = PERKS[id];
    if (!d) return null;
    const P = p ? perksOf(p) : {}, why = p ? legal(p, id) : 'No hero', pts = p ? game.getPerkPoints(p) : { points: 0, marks: 0 };
    const pair = ORDER[d.classId][d.branch][d.tier];
    return { id: id, classId: d.classId, branch: d.branch, tier: d.tier, opt: d.opt, name: d.name, text: d.text, cost: d.cost, keystone: d.keystone, licence: d.licence || null,
      owned: !!P[id], how: P[id] || null, locked: !!P[pair[1 - d.opt]], lockedReason: P[id] ? null : why,
      canBuy: !why && (pts.points >= d.cost || pts.marks >= d.cost), canWager: !why && !!pts.wagerAvailable };
  };
  game.getPerkTree = function (classId) {
    classId = classId || (G.state.player && G.state.player.classId);
    const O = ORDER[classId];
    if (!O) return [];
    return BRANCHES.map(function (b) {
      const tiers = [];
      for (let t = 1; t <= 5; t++) {
        const pair = O[b.id][t], opts = pair.map(game.getPerkInfo);
        tiers.push({ tier: t, cost: COST[t], keystone: t === 5, options: opts, chosen: opts[0].owned ? pair[0] : opts[1].owned ? pair[1] : null });
      }
      return { id: b.id, name: b.name, tiers: tiers };
    });
  };
  game.PERK_ORDER = ORDER;

  // lose a perk (a lost wager) and everything above it in its branch that no longer has its tier below
  function dropPerk(p, id) {
    const P = perksOf(p), d = PERKS[id];
    delete P[id];
    for (let t = d.tier + 1; t <= 5; t++) {
      const below = ORDER[d.classId][d.branch][t - 1], here = ORDER[d.classId][d.branch][t];
      if (!P[below[0]] && !P[below[1]]) for (const h of here) if (P[h]) { if (P[h] === 'wager') p.wager = null; delete P[h]; }
    }
  }
  G.on('player:died', function () {
    const p = G.state.player;
    if (!p || !p.wager) return;
    const id = p.wager;
    p.wager = null;
    dropPerk(p, id);
    game.recomputeStats(p);
    G.emit('perk:lost', { id: id });
    U.toast('Your wager is lost: ' + PERKS[id].name, '#c96a6a');
  });
  G.on('scene:changed', function (e) {
    const p = G.state.player;
    if (!p || !e || e.scene !== 'town' || !p.wager) return;
    const id = p.wager;
    p.wager = null;
    perksOf(p)[id] = 'won';
    G.emit('perk:won', { id: id });
    U.toast('Wager won: ' + PERKS[id].name + ' is yours.', '#ffd94a');
  });

  game.getPerkRespecCost = function () {
    const p = G.state.player, f = G.state.flags || {};
    return !p ? 0 : f.perkRespecAct === act() ? 40 * p.level : 0;
  };
  game.respecPerks = function () {
    const p = G.state.player;
    if (!p || p.wager) return false;
    const cost = game.getPerkRespecCost();
    if ((p.gold || 0) < cost) { U.toast('Perk respec costs ' + cost + ' gold', '#ff6a6a'); return false; }
    if (cost) { p.gold -= cost; G.emit('gold:changed', { gold: p.gold, delta: -cost }); }
    else G.state.flags.perkRespecAct = act();
    const P = perksOf(p);
    for (const id in P) if (P[id] === 'won') p.wagerCredits = (p.wagerCredits | 0) + PERKS[id].cost;
    p.perks = {};
    if (p.autoBuild) game.autoPerks(p);
    game.recomputeStats(p);
    G.emit('perk:respec', {});
    return true;
  };

  // ---- feats → Marks ----
  function feat(p, id) {
    if (!p) return;
    p.feats = p.feats || {};
    if (p.feats[id]) return;
    p.feats[id] = true;
    G.emit('perk:mark', { feat: id, marks: game.getPerkPoints(p).marks });
    U.toast('Mark earned (' + id.replace(/_/g, ' ') + ')', '#ffd94a');
  }
  game.perkFeat = function (id) { feat(G.state.player, id); };
  G.on('floor:graded', function (e) {
    const p = G.state.player;
    if (!p || !e || e.grade !== 'S') return;
    p.featCount = p.featCount || {};
    const n = p.featCount.s = (p.featCount.s | 0) + 1;
    if (n === 1 || n === 5 || n === 15) feat(p, 's_grade_' + n);
    if (game.bargain && game.pallorTier && game.pallorTier() >= 3) feat(p, 'bargain_pallor');
  });
  G.on('flow:trigger', function (e) { const p = G.state.player, c = e && e.chain; if (c >= 5) feat(p, 'flow_5'); if (c >= 8) feat(p, 'flow_8'); if (c >= 12) feat(p, 'flow_12'); });
  const fight = { boss: 0, pots: 0, heatT: 0 };
  G.on('monster:killed', function (ev) {
    const p = G.state.player, m = ev && ev.monster;
    if (!p || !m) return;
    if (m.rarity === 'boss' && game.ACT_BOSSES && Object.values(game.ACT_BOSSES).indexOf(m.monsterId) >= 0 && fight.boss === m.id && fight.pots === 0) feat(p, 'dry_' + m.monsterId);
    if (m.monsterId === 'scavenger' && !(m.stash && m.stash.length)) {
      p.featCount = p.featCount || {};
      const n = p.featCount.scav = (p.featCount.scav | 0) + 1;
      if (n === 1 || n === 5) feat(p, 'scavenger_' + n);
    }
  });
  G.on('object:interact', function (e) { if (e && e.type === 'stairs_down' && game.bargain && game.pallorTier && game.pallorTier() >= 3) feat(G.state.player, 'bargain_pallor'); });
  game.FEATS = ['s_grade_1', 's_grade_5', 's_grade_15', 'flow_5', 'flow_8', 'flow_12', 'dry_boss_gravelord', 'dry_boss_broodmother', 'dry_boss_tyrant', 'dry_boss_hollow',
    'dry_boss_choir', 'dry_boss_world', 'heat_hold', 'scavenger_1', 'scavenger_5', 'bargain_pallor'];

  // ---- auto-build: perk points only, never Marks / Keystones / Wagers ----
  const PLANS = {
    warrior: { single: ['w_edge_discipline', 'w_executioner', 'w_unyielding', 'w_crushing', 'w_shoulder_through', 'w_iron_tempo', 'w_avalanche', 'w_forge_heat'],
      aoe: ['w_edge_discipline', 'w_second_swing', 'w_bloodrush', 'w_warlord', 'w_steel_nerves', 'w_counterweight', 'w_avalanche', 'w_ember_hunger'],
      balanced: ['w_edge_discipline', 'w_second_swing', 'w_unyielding', 'w_warlord', 'w_shoulder_through', 'w_iron_tempo', 'w_unbroken', 'w_forge_heat'] },
    ranger: { single: ['r_steady', 'r_long_draw', 'r_mark', 'r_poison_tips', 'r_reload', 'r_kite', 'r_bullet_time', 'r_fletching'],
      aoe: ['r_running', 'r_volley', 'r_pinning', 'r_trapper', 'r_evasive', 'r_kite', 'r_flow_volley', 'r_fletching'],
      balanced: ['r_steady', 'r_volley', 'r_mark', 'r_trapper', 'r_reload', 'r_second_chance', 'r_flow_volley', 'r_hot_pursuit'] },
    sorcerer: { single: ['s_kindling', 's_overload', 's_permafrost', 's_battery', 's_phase', 's_arcane_rhythm', 's_time_thief', 's_heat_shield'],
      aoe: ['s_kindling', 's_static', 's_pyromania', 's_rotation', 's_rime_blink', 's_spell_echo', 's_singularity', 's_conflag'],
      balanced: ['s_cold_snap', 's_overload', 's_permafrost', 's_rotation', 's_phase', 's_arcane_rhythm', 's_singularity', 's_heat_shield'] },
    necromancer: { single: ['n_bone_wall', 'n_hoarder', 'n_grave_pact', 'n_bone_lord', 'n_swap_tempo', 'n_death_march', 'n_army_flow', 'n_cold_hands'],
      aoe: ['n_hollow', 'n_marrow', 'n_deaths_due', 'n_plague', 'n_bone_step', 'n_soul_sip', 'n_black_flow', 'n_pyre'],
      balanced: ['n_hollow', 'n_marrow', 'n_grave_pact', 'n_bone_lord', 'n_swap_tempo', 'n_death_march', 'n_black_flow', 'n_cold_hands'] },
  };
  game.PERK_PLANS = PLANS;
  game.autoPerks = function (p) {
    if (!p || !p.autoBuild) return;
    const plan = (PLANS[p.classId] || {})[p.autoBuild] || [];
    const list = [];
    if (p.bonus && p.bonus.w && p.equipment && p.equipment.weapon && !classWeapon(p)) {          // holding off-class: the licence first
      for (const o of ORDER[p.classId].cross[1]) if (PERKS[o].licence.indexOf(p.bonus.w.type) >= 0) list.push(o);
    }
    for (const id of list.concat(plan)) {
      if (PERKS[id].keystone || legal(p, id)) continue;
      if (game.getPerkPoints(p).points < PERKS[id].cost) break;
      perksOf(p)[id] = 'point';
      G.emit('perk:bought', { id: id, how: 'point', auto: true });
    }
  };
  // an auto-build mode change re-plans the point-bought perks (Marks and wagers stay)
  game.resetAutoPerks = function (p) {
    const P = perksOf(p);
    for (const id in P) if (P[id] === 'point') delete P[id];
  };

  // ============================== hooks ==============================
  const NONE = [];
  const state = {};          // per-perk runtime scratch (counters, timers), by perk id
  function list(p) { return (p && p.bonus && p.bonus.perkList) || NONE; }
  function S(id) { return state[id] || (state[id] = {}); }
  G.on('scene:changed', function () { for (const k in state) delete state[k]; });
  game.perkStats = function (p, st, b, post) {
    const P = perksOf(p), L = [];
    for (const id in P) { const d = PERKS[id]; if (d && d.classId === p.classId) L.push(d); }
    if (!post) b.perkList = L;
    for (const d of L) { const f = post ? d.statsPost : d.stats; if (f) f(p, st, b); }
  };
  game.perkCrit = function (p, t, spec) { let c = 0; for (const d of list(p)) if (d.crit) c += d.crit(p, t, spec) || 0; return c; };
  game.perkDmg = function (p, t, spec, crit) { let m = 1; for (const d of list(p)) if (d.dmg) m *= d.dmg(p, t, spec, crit, S(d.id)); return m; };
  game.perkAfterHit = function (p, t, dealt, spec) { for (const d of list(p)) if (d.afterHit) d.afterHit(p, t, dealt, spec, S(d.id)); };
  game.perkHurt = function (p, amount, src, o) { for (const d of list(p)) if (d.hurt) amount = d.hurt(p, amount, src, o); return amount; };
  game.perkCC = function (p) { for (const d of list(p)) if (d.cc) d.cc(p, S(d.id)); };
  game.perkFlow = function (p, chain) { for (const d of list(p)) if (d.flow) d.flow(p, chain); };
  game.perkDash = function (p, x0, y0) { for (const d of list(p)) if (d.dash) d.dash(p, x0, y0, S(d.id)); };
  game.perkKill = function (p, t) { for (const d of list(p)) if (d.kill) d.kill(p, t); };
  game.perkCast = function (p, sk, ctx, V) { for (const d of list(p)) if (d.cast) d.cast(p, sk, ctx, V, S(d.id)); };
  game.perkAfterCast = function (p, sk) { for (const d of list(p)) if (d.afterCast) d.afterCast(p, sk); };
  game.perkMinion = function (p, m) { for (const d of list(p)) if (d.minion) d.minion(p, m); };
  game.perkMinionDeath = function (p, m) { for (const d of list(p)) if (d.minionDeath) d.minionDeath(p, m); };
  game.perkMinionKill = function (p, m, t) { for (const d of list(p)) if (d.minionKill) d.minionKill(p, m, t); };
  game.perkLootRolls = function (p, t) { let n = 0; for (const d of list(p)) if (d.loot) n += d.loot(p, t); return n; };
  game.perkTick = function (p, dt) {
    for (const d of list(p)) if (d.tick) d.tick(p, dt, S(d.id));
    const now = G.state.time;
    for (const e of G.state.entities) if (e.perkTemp && !e.dead && e.expireAt < now) { e.hp = 0; game.kill(e, null); }
    // feats that need watching
    if (heat() >= 10) { fight.heatT += dt; if (fight.heatT >= 20) feat(p, 'heat_hold'); } else fight.heatT = 0;
    if (!fight.boss) { for (const e of game.live.foes) if (e.rarity === 'boss' && !e.dead && e.ai && e.ai.st !== 'sleep') { fight.boss = e.id; fight.pots = 0; break; } }
    else { const b = game.byId(fight.boss); if (!b || (b.dead && b.ai.corpse <= 0)) fight.boss = 0; }
  };
  G.on('scene:changed', function () { fight.boss = 0; fight.pots = 0; fight.heatT = 0; });
  game.perkPotion = function () { if (fight.boss) fight.pots++; };
})();
