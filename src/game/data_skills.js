// Classes, skill trees and auto-build plans. Pure tables: G.game.CLASSES, G.game.SKILLS, G.game.BUILDS.
// Skill numbers are [base, perRank]: value(rank) = base + perRank * (rank - 1). `cast` bodies run at runtime only and
// use the helper kit G.game.K (skills.js). Passives contribute `mods` (keys of G.C.STATS) and `bonus` (player.bonus keys).
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;
  const COL = game.COLORS;
  const TAU = Math.PI * 2;

  game.CLASSES = {
    warrior: {
      id: 'warrior', name: 'Warrior', desc: 'Steel and fury. Wades in, shrugs off blows, breaks packs apart.',
      sprite: { body: 'humanoid', color: '#9a3b2e', accent: '#c9c2b0', scale: 1, weapon: 'sword' },
      icon: { shape: 'sword', color: '#d8d2c4', accent: '#9a3b2e' },
      baseAttrs: { str: 10, dex: 5, int: 3, vit: 8 }, primaryStat: 'str', weaponTypes: ['sword', 'axe', 'mace'],
      // R6.3 class action: one charge, but it hits — foes in the path are knocked aside and struck
      action: { id: 'dash', kind: 'charge', name: 'Shoulder Charge', desc: 'Barge about 3.5 tiles toward your stick, knocking foes in your path aside for 60% weapon damage. Untouchable for a moment.',
        icon: { shape: 'shield', color: '#c9c2b0', accent: '#9a3b2e' }, cd: 4.5, d: 3.5, inv: 0.3, charges: 1 },
      hp: 60, hpLvl: 12, hpVit: 11, dr: 15, mp: 26, mpLvl: 1.5, mpRegen: 1.2, mpOnHit: 2, starter: { dmgMin: 2, dmgMax: 4, attackSpeed: 1.4, weaponType: 'sword' },
      trees: [
        { id: 'arms', name: 'Arms', desc: 'Precise, crushing blows against one foe.', skills: ['bash', 'weapon_mastery', 'charge', 'rend', 'execute', 'deadly_precision'] },
        { id: 'berserker', name: 'Berserker', desc: 'Wide swings and reckless momentum.', skills: ['cleave', 'frenzy', 'whirlwind', 'leap', 'bloodthirst', 'earthquake', 'ground_slam'] },
        { id: 'guardian', name: 'Guardian', desc: 'Armour, shouts and stubbornness.', skills: ['iron_skin', 'battle_shout', 'toughness', 'shield_wall', 'war_cry', 'thorns_aura'] },
      ],
    },
    ranger: {
      id: 'ranger', name: 'Ranger', desc: 'Death from a distance. Fast, fragile, never where the claws land.',
      sprite: { body: 'humanoid', color: '#3f6b3a', accent: '#b89a5a', scale: 1, weapon: 'bow' },
      icon: { shape: 'bow', color: '#b89a5a', accent: '#3f6b3a' },
      baseAttrs: { str: 5, dex: 10, int: 4, vit: 7 }, primaryStat: 'dex', weaponTypes: ['bow', 'dagger'],
      action: { id: 'dash', kind: 'roll', name: 'Dash', desc: 'Dash about 3 tiles toward your stick (or away from the nearest enemy), untouchable for a moment. 2 charges.',
        icon: { shape: 'leap', color: '#b89a5a' }, cd: 3, d: 3, inv: 0.35, charges: 2 },
      hp: 42, hpLvl: 7, mp: 30, mpLvl: 2, mpRegen: 1.5, mpOnHit: 1, starter: { dmgMin: 3, dmgMax: 6, attackSpeed: 1.3, weaponType: 'bow' },
      trees: [
        { id: 'marksman', name: 'Marksman', desc: 'One arrow, one corpse.', skills: ['aimed_shot', 'eagle_eye', 'piercing_shot', 'poison_arrow', 'lethal_focus', 'snipe'] },
        { id: 'barrage', name: 'Barrage', desc: 'Fill the air with arrows.', skills: ['multishot', 'rapid_fire', 'rain_of_arrows', 'explosive_arrow', 'ricochet', 'arrow_storm', 'tumble_shot'] },
        { id: 'survival', name: 'Survival', desc: 'Traps, rolls and staying alive.', skills: ['dodge_roll', 'spike_trap', 'evasion', 'frost_trap', 'vigor', 'camouflage'] },
      ],
    },
    sorcerer: {
      id: 'sorcerer', name: 'Sorcerer', desc: 'Fire, frost and storm. Enormous damage behind paper-thin robes.',
      sprite: { body: 'caster', color: '#3a4f9a', accent: '#ffb347', scale: 1, weapon: 'staff' },
      icon: { shape: 'staff', color: '#ffb347', accent: '#3a4f9a' },
      baseAttrs: { str: 3, dex: 4, int: 11, vit: 6 }, primaryStat: 'int', weaponTypes: ['staff', 'wand'],
      action: { id: 'dash', kind: 'blink', name: 'Blink', desc: 'Vanish and reappear about 3.5 tiles toward your stick (or away from the nearest enemy). 2 charges.',
        icon: { shape: 'star', color: '#b98cff', accent: '#3a4f9a' }, cd: 3.5, d: 3.5, inv: 0.25, charges: 2 },
      hp: 36, hpLvl: 6, mp: 40, mpLvl: 4, mpRegen: 2.6, starter: { dmgMin: 3, dmgMax: 6, attackSpeed: 1.0, weaponType: 'staff' },
      trees: [
        { id: 'fire', name: 'Fire', desc: 'Burn it. Burn all of it.', skills: ['fire_bolt', 'fireball', 'fire_mastery', 'incinerate', 'combustion', 'meteor'] },
        { id: 'frost', name: 'Frost', desc: 'Slow them, freeze them, shatter them.', skills: ['ice_shard', 'frost_nova', 'frost_armor', 'blizzard', 'shatter', 'glacial_spike', 'rime_step'] },
        { id: 'storm', name: 'Storm', desc: 'Lightning, raw mana and tricks of space.', skills: ['arcane_mind', 'chain_lightning', 'teleport', 'mana_shield', 'overcharge', 'thunderstorm'] },
      ],
    },
    necromancer: {
      id: 'necromancer', name: 'Necromancer', desc: 'Commands the dead. Lets bone and curse do the dying.',
      sprite: { body: 'caster', color: '#3b2a4a', accent: '#8ee06a', scale: 1, weapon: 'wand' },
      icon: { shape: 'skull', color: '#d9d4c0', accent: '#8ee06a' },
      baseAttrs: { str: 3, dex: 4, int: 10, vit: 7 }, primaryStat: 'int', weaponTypes: ['wand', 'staff', 'dagger'],
      action: { id: 'dash', kind: 'roll', name: 'Grave Step', desc: 'Slip about 3 tiles through the dark toward your stick (or away from the nearest enemy), untouchable for a moment. 2 charges.',
        icon: { shape: 'skull', color: '#b98cff', accent: '#3b2a4a' }, cd: 3.5, d: 3, inv: 0.3, charges: 2, fx: 'teleport' },
      hp: 38, hpLvl: 6, mp: 40, mpLvl: 4, mpRegen: 2.3, starter: { dmgMin: 1, dmgMax: 3, attackSpeed: 1.5, weaponType: 'wand' },
      trees: [
        { id: 'summoning', name: 'Summoning', desc: 'An army that never tires.', skills: ['raise_skeleton', 'skeleton_mastery', 'corpse_explosion', 'skeletal_mage', 'golem', 'unholy_might', 'grave_swap'] },
        { id: 'bone', name: 'Bone & Blood', desc: 'Spears of bone, stolen life.', skills: ['bone_spear', 'bone_armor', 'bone_nova', 'life_drain', 'soul_harvest', 'bone_spirit'] },
        { id: 'curses', name: 'Curses', desc: 'Weaken, wither, rot.', skills: ['dark_knowledge', 'amplify_damage', 'withering', 'decrepify', 'poison_nova', 'lich_form'] },
      ],
    },
  };

  const RAW = {};
  const def = function (id, o) { o.id = id; RAW[id] = o; };
  const K = function () { return game.K; };

  // ============================== WARRIOR ==============================
  def('bash', { n: 'Bash', c: 'warrior', tr: 'arms', row: 0, col: 1, k: 'active', tags: ['single'], ic: ['mace', '#d9c9a3'], lvl: 1,
    mp: [4, 0.5], tg: 'melee', v: { dmg: [200, 28], stun: [25, 5] },
    text: 'Smash one foe for {dmg}% weapon damage. {stun}% chance to stun for 1.2s.',
    cast(p, t, V) { K().swing(p, t); K().hit(t, V.dmg, 'phys', { st: [['stun', V.stun, 1.2]] }); } });
  def('weapon_mastery', { n: 'Weapon Mastery', c: 'warrior', tr: 'arms', row: 1, col: 0, k: 'passive', tags: ['single'], ic: ['sword', '#c9c2b0'], lvl: 3,
    v: { dmg: [8, 8], crit: [1, 1] }, text: 'Passive. +{dmg}% damage and +{crit}% critical chance.',
    mods: V => ({ dmgPct: V.dmg, critChance: V.crit }) });
  def('charge', { n: 'Charge', c: 'warrior', tr: 'arms', row: 1, col: 1, k: 'active', tags: ['single', 'mobility'], ic: ['leap', '#e0b060'], lvl: 6, req: 'bash',
    mp: [8, 0.5], cd: [8, -0.5], tg: 'enemy', range: 8, v: { dmg: [220, 32], stun: [1, 0.15] },
    text: 'Rush to a foe and strike for {dmg}% weapon damage, stunning for {stun}s.',
    cast(p, t, V) { K().dashTo(p, t.x, t.y, 1.0 + t.radius); K().swing(p, t); K().hit(t, V.dmg, 'phys', { st: [['stun', 100, V.stun]] }); U().shake(3, 0.15); } });
  def('rend', { n: 'Rend', c: 'warrior', tr: 'arms', row: 2, col: 2, k: 'active', tags: ['single'], ic: ['slash', '#d04a3a'], lvl: 10, req: 'bash',
    mp: [6, 0.5], cd: [3, 0], tg: 'melee', v: { dmg: [140, 18], bleed: [200, 40] },
    text: 'Slash for {dmg}% weapon damage and open a wound that bleeds for {bleed}% over 4s.',
    cast(p, t, V) { K().swing(p, t); K().hit(t, V.dmg, 'phys', { st: [['bleed', 100, 4, V.bleed / V.dmg / 4]] }); } });
  def('execute', { n: 'Execute', c: 'warrior', tr: 'arms', row: 3, col: 1, k: 'active', tags: ['single'], ic: ['axe', '#e04a3a'], lvl: 16, req: 'charge',
    mp: [10, 1], cd: [6, -0.5], tg: 'melee', v: { dmg: [340, 50] },
    text: 'A killing blow for {dmg}% weapon damage — doubled against foes below 30% life.',
    cast(p, t, V) { K().swing(p, t); K().hit(t, t.hp < t.stats.hpMax * 0.3 ? V.dmg * 2 : V.dmg, 'phys'); U().shake(3, 0.12); } });
  def('deadly_precision', { n: 'Deadly Precision', c: 'warrior', tr: 'arms', row: 3, col: 0, k: 'passive', tags: ['single'], ic: ['star', '#e0b060'], lvl: 20, req: 'weapon_mastery',
    v: { cd: [15, 15], crit: [2, 1] }, text: 'Passive. +{cd}% critical damage and +{crit}% critical chance.',
    mods: V => ({ critDmg: V.cd, critChance: V.crit }) });

  def('cleave', { n: 'Cleave', c: 'warrior', tr: 'berserker', row: 0, col: 1, k: 'active', tags: ['aoe'], ic: ['slash', '#e8e0d0'], lvl: 1,
    mp: [5, 0.5], tg: 'melee', v: { dmg: [150, 22] },
    text: 'A wide swing hitting every foe in front of you for {dmg}% weapon damage.',
    cast(p, t, V, aim) {
      K().swing(p, t, 2.4);
      const rend = game.combo(p, 'rend');      // combo: Cleave opens Rend's wounds on everything it hits
      const st = rend ? { st: [['bleed', 100, 4, rend.bleed / 100 / 4 * 0.5]] } : undefined;
      for (const e of K().arc(p, aim.ang, 2.4, 1.35)) K().hit(e, V.dmg, 'phys', st && { st: st.st });
    } });
  def('frenzy', { n: 'Frenzy', c: 'warrior', tr: 'berserker', row: 1, col: 0, k: 'passive', tags: ['buff'], ic: ['buff', '#e04a3a'], lvl: 4,
    v: { as: [6, 6] }, text: 'Passive. +{as}% attack speed.', mods: V => ({ attackSpeed: V.as }) });
  def('whirlwind', { n: 'Whirlwind', c: 'warrior', tr: 'berserker', row: 1, col: 1, k: 'active', tags: ['aoe'], ic: ['whirl', '#e8e0d0'], lvl: 6, req: 'cleave',
    mp: [10, 1], cd: [5, -0.25], tg: 'self', v: { dmg: [95, 15] },
    text: 'Spin for 1.2s, striking everything around you 4 times for {dmg}% weapon damage. You can move while spinning.',
    cast(p, t, V) { K().buff(p, { id: 'whirlwind', t: 1.25, every: 0.3, acc: 0.3, pct: V.dmg }); } });
  def('leap', { n: 'Leap', c: 'warrior', tr: 'berserker', row: 2, col: 2, k: 'active', tags: ['aoe', 'mobility'], ic: ['leap', '#e8e0d0'], lvl: 10,
    mp: [9, 0.5], cd: [8, -0.5], tg: 'point', range: 6.5, v: { dmg: [200, 30] },
    text: 'Leap to the target and crash down for {dmg}% weapon damage in a wide area, slowing foes.',
    cast(p, t, V, aim) {
      K().blink(p, aim.x, aim.y, 'smoke');
      U().fx('explosion', p.x, p.y, { radius: 2.4, color: '#c9b27a' }); U().shake(4, 0.2); U().sfx('hit');
      for (const e of K().around(p.x, p.y, 2.4)) K().hit(e, V.dmg, 'phys', { st: [['slow', 100, 2, 0.4]] });
    } });
  def('bloodthirst', { n: 'Bloodthirst', c: 'warrior', tr: 'berserker', row: 2, col: 0, k: 'passive', tags: ['defense'], ic: ['heal', '#d03a3a'], lvl: 14,
    v: { ls: [2, 1], lok: [2, 2] }, text: 'Passive. {ls}% of damage dealt returns as life; +{lok} life per kill.',
    mods: V => ({ lifeSteal: V.ls, lifeOnKill: V.lok }) });
  def('earthquake', { n: 'Earthquake', c: 'warrior', tr: 'berserker', row: 3, col: 1, k: 'active', tags: ['aoe'], ic: ['whirl', '#c08a4a'], lvl: 20, req: 'whirlwind',
    mp: [18, 1.5], cd: [14, -1], tg: 'self', v: { dmg: [170, 28] },
    text: 'Shatter the ground: 3 shockwaves of {dmg}% weapon damage around you, slowing all foes hit.',
    cast(p, t, V) {
      U().shake(6, 0.5);
      K().zone({ x: p.x, y: p.y, r: 3.8, t: 1.3, every: 0.5, pct: V.dmg, dtype: 'phys', st: [['slow', 100, 2, 0.4]], fx: 'explosion', color: '#c08a4a' });
    } });
  // R6.3 dash augments (one per class): passives read by the class action in player.js through player.bonus.dash*
  def('ground_slam', { n: 'Ground Slam', c: 'warrior', tr: 'berserker', row: 0, col: 2, k: 'passive', tags: ['mobility', 'aoe'], ic: ['leap', '#c08a4a'], lvl: 3,
    v: { dmg: [120, 30], cd: [0.2, 0.2] }, text: 'Passive. Your Shoulder Charge ends in a ground slam: {dmg}% weapon damage around you, slowing foes. Its cooldown is {cd}s shorter.',
    bonus: V => ({ dashSlam: V.dmg, dashCd: V.cd }) });

  def('iron_skin', { n: 'Iron Skin', c: 'warrior', tr: 'guardian', row: 0, col: 0, k: 'passive', tags: ['defense'], ic: ['armor', '#9aa0aa'], lvl: 1,
    v: { ar: [8, 8], pct: [10, 10] }, text: 'Passive. +{ar} armour and +{pct}% total armour.',
    mods: V => ({ armor: V.ar }), bonus: V => ({ armorPct: V.pct }) });
  def('battle_shout', { n: 'Battle Shout', c: 'warrior', tr: 'guardian', row: 0, col: 2, k: 'active', tags: ['buff'], ic: ['buff', '#e0b060'], lvl: 4,
    mp: [8, 0.5], cd: [30, 0], tg: 'self', v: { dmg: [15, 5], ar: [10, 10] },
    text: 'A rallying roar: +{dmg}% damage and +{ar} armour for 20s. Your minions feel it too.',
    cast(p, t, V) { K().shout(p, '#e0b060'); K().buff(p, { id: 'battle_shout', t: 20, mods: { dmgPct: V.dmg, armor: V.ar } }); } });
  def('toughness', { n: 'Toughness', c: 'warrior', tr: 'guardian', row: 1, col: 0, k: 'passive', tags: ['defense'], ic: ['heal', '#c9c2b0'], lvl: 6,
    v: { hp: [6, 6], reg: [1, 1] }, text: 'Passive. +{hp}% maximum life and +{reg} life regenerated per second.',
    mods: V => ({ hpRegen: V.reg }), bonus: V => ({ hpPct: V.hp }) });
  def('shield_wall', { n: 'Shield Wall', c: 'warrior', tr: 'guardian', row: 1, col: 1, k: 'active', tags: ['defense'], ic: ['shield', '#9aa0aa'], lvl: 10, req: 'iron_skin',
    mp: [8, 0], cd: [25, -1], tg: 'self', v: { red: [50, 5], dur: [4, 0.5] },
    text: 'Brace: take {red}% less damage for {dur}s.',
    cast(p, t, V) { U().fx('ring', p.x, p.y, { radius: 1, color: '#9aa0aa', duration: 0.4 }); K().buff(p, { id: 'shield_wall', t: V.dur, taken: -V.red }); } });
  def('war_cry', { n: 'War Cry', c: 'warrior', tr: 'guardian', row: 2, col: 2, k: 'active', tags: ['defense', 'aoe'], ic: ['skull', '#e0b060'], lvl: 14, req: 'battle_shout',
    mp: [10, 0.5], cd: [18, -1], tg: 'self', v: { stun: [1.5, 0.25], weak: [20, 4] },
    text: 'Terrify nearby foes: stunned for {stun}s and dealing {weak}% less damage for 6s.',
    cast(p, t, V) {
      K().shout(p, '#ffffff');
      for (const e of K().around(p.x, p.y, 4.5)) { game.applyStatus(e, 'stun', V.stun); game.addEffect(e, { id: 'weaken', t: 6, dealt: -V.weak }); }
    } });
  def('thorns_aura', { n: 'Spiked Plate', c: 'warrior', tr: 'guardian', row: 3, col: 0, k: 'passive', tags: ['defense'], ic: ['aura', '#9aa0aa'], lvl: 18, req: 'toughness',
    v: { th: [4, 3], res: [4, 4] }, text: 'Passive. Melee attackers take thorns damage ({th} × level scaling) and you gain +{res}% all resistances.',
    mods: (V, p) => ({ thorns: Math.round(V.th * (1 + p.level * 0.3)), resAll: V.res }) });

  // ============================== RANGER ==============================
  const arrow = (extra) => Object.assign({ shape: 'arrow', color: '#e8dcb0', speed: 15, type: 'phys' }, extra);
  def('aimed_shot', { n: 'Aimed Shot', c: 'ranger', tr: 'marksman', row: 0, col: 1, k: 'active', tags: ['single'], ic: ['arrow', '#e8dcb0'], lvl: 1,
    mp: [4, 0.5], tg: 'aim', range: 9, v: { dmg: [170, 25] },
    text: 'A careful shot for {dmg}% weapon damage with +20% critical chance.',
    cast(p, t, V, aim) { U().sfx('arrow'); K().shoot(p, aim.ang, arrow({ pct: V.dmg, crit: 20 })); } });
  def('eagle_eye', { n: 'Eagle Eye', c: 'ranger', tr: 'marksman', row: 1, col: 0, k: 'passive', tags: ['single'], ic: ['star', '#e8dcb0'], lvl: 3,
    v: { crit: [3, 2], dmg: [4, 4] }, text: 'Passive. +{crit}% critical chance and +{dmg}% damage.',
    mods: V => ({ critChance: V.crit, dmgPct: V.dmg }) });
  def('piercing_shot', { n: 'Piercing Shot', c: 'ranger', tr: 'marksman', row: 1, col: 1, k: 'active', tags: ['single', 'aoe'], ic: ['arrow', '#7fd4ff'], lvl: 6, req: 'aimed_shot',
    mp: [7, 0.5], cd: [2, 0], tg: 'aim', range: 10, v: { dmg: [150, 22] },
    text: 'An arrow that punches through every foe in its path for {dmg}% weapon damage.',
    cast(p, t, V, aim) { U().sfx('arrow'); K().shoot(p, aim.ang, arrow({ pct: V.dmg, pierce: 99, speed: 18, color: '#bfe8ff' })); } });
  def('poison_arrow', { n: 'Poison Arrow', c: 'ranger', tr: 'marksman', row: 2, col: 2, k: 'active', tags: ['single'], ic: ['poison', '#7be04a'], lvl: 10,
    mp: [6, 0.5], cd: [2, 0], tg: 'aim', range: 9, v: { dmg: [90, 10], poi: [220, 45] },
    text: 'Hits for {dmg}% weapon damage and poisons for {poi}% over 5s.',
    cast(p, t, V, aim) { U().sfx('arrow'); K().shoot(p, aim.ang, arrow({ pct: V.dmg, color: COL.poison, st: [['poison', 100, 5, V.poi / V.dmg / 5]] })); } });
  def('lethal_focus', { n: 'Lethal Focus', c: 'ranger', tr: 'marksman', row: 2, col: 0, k: 'passive', tags: ['single'], ic: ['dagger', '#e8dcb0'], lvl: 14, req: 'eagle_eye',
    v: { cd: [15, 12] }, text: 'Passive. +{cd}% critical damage.', mods: V => ({ critDmg: V.cd }) });
  def('snipe', { n: 'Snipe', c: 'ranger', tr: 'marksman', row: 3, col: 1, k: 'active', tags: ['single'], ic: ['arrow', '#ff5b4a'], lvl: 20, req: 'piercing_shot',
    mp: [12, 1], cd: [8, -0.5], tg: 'aim', range: 12, v: { dmg: [400, 60] },
    text: 'A devastating long-range shot for {dmg}% weapon damage with +30% critical chance.',
    cast(p, t, V, aim) { U().sfx('arrow'); U().shake(2, 0.1); K().shoot(p, aim.ang, arrow({ pct: V.dmg, crit: 30, speed: 24, color: '#ff8a6a', radius: 0.3, life: 0.7 })); } });

  def('multishot', { n: 'Multishot', c: 'ranger', tr: 'barrage', row: 0, col: 1, k: 'active', tags: ['aoe'], ic: ['multishot', '#e8dcb0'], lvl: 1,
    mp: [6, 0.5], tg: 'aim', range: 8, v: { dmg: [85, 10], n: [3, 0.5] },
    text: 'Loose a fan of {n} arrows, each dealing {dmg}% weapon damage.',
    cast(p, t, V, aim) {
      U().sfx('arrow');
      const n = Math.floor(V.n);
      const poi = game.combo(p, 'poison_arrow');      // combo: every Multishot arrow is poisoned
      for (let i = 0; i < n; i++) K().shoot(p, aim.ang + (i - (n - 1) / 2) * 0.17, arrow(poi ? { pct: V.dmg, color: COL.poison, st: [['poison', 100, 5, poi.poi / 100 / 5 * 0.5]] } : { pct: V.dmg }));
    } });
  def('rapid_fire', { n: 'Rapid Fire', c: 'ranger', tr: 'barrage', row: 1, col: 0, k: 'passive', tags: ['buff'], ic: ['buff', '#b89a5a'], lvl: 4,
    v: { as: [6, 5] }, text: 'Passive. +{as}% attack speed.', mods: V => ({ attackSpeed: V.as }) });
  def('rain_of_arrows', { n: 'Rain of Arrows', c: 'ranger', tr: 'barrage', row: 1, col: 1, k: 'active', tags: ['aoe'], ic: ['multishot', '#7fd4ff'], lvl: 8, req: 'multishot',
    mp: [10, 1], cd: [8, -0.5], tg: 'point', range: 8, v: { dmg: [60, 10] },
    text: 'Arrows hammer an area for 2s: 5 volleys of {dmg}% weapon damage.',
    cast(p, t, V, aim) { U().sfx('arrow'); K().zone({ x: aim.x, y: aim.y, r: 3, t: 2.1, every: 0.4, pct: V.dmg, dtype: 'phys', fx: 'spark', color: '#e8dcb0', tele: 0.3 }); } });
  def('explosive_arrow', { n: 'Explosive Arrow', c: 'ranger', tr: 'barrage', row: 2, col: 2, k: 'active', tags: ['aoe'], ic: ['fire', '#ff7a2b'], lvl: 12,
    mp: [8, 0.5], cd: [3, 0], tg: 'aim', range: 9, v: { dmg: [150, 25] },
    text: 'An arrow that detonates for {dmg}% weapon damage as fire in an area.',
    cast(p, t, V, aim) { U().sfx('arrow'); K().shoot(p, aim.ang, arrow({ pct: V.dmg, type: 'fire', color: COL.fire, explode: 2.3 })); } });
  def('ricochet', { n: 'Split Shot', c: 'ranger', tr: 'barrage', row: 2, col: 0, k: 'passive', tags: ['aoe'], ic: ['multishot', '#b89a5a'], lvl: 16, req: 'rapid_fire',
    v: { ch: [15, 10] }, text: 'Passive. Basic attacks have a {ch}% chance to loose two extra arrows.',
    bonus: V => ({ extraArrow: V.ch }) });
  def('arrow_storm', { n: 'Arrow Storm', c: 'ranger', tr: 'barrage', row: 3, col: 1, k: 'active', tags: ['aoe'], ic: ['multishot', '#ff5b4a'], lvl: 22, req: 'rain_of_arrows',
    mp: [18, 1.5], cd: [15, -1], tg: 'self', v: { dmg: [130, 20] },
    text: 'Fire an arrow at every foe in sight (up to 14) for {dmg}% weapon damage each.',
    cast(p, t, V) {
      U().sfx('arrow');
      const list = K().around(p.x, p.y, 9);
      let n = 0;
      for (const e of list) {
        if (n >= 14 || !game.W.los(p.x, p.y, e.x, e.y)) continue;
        K().shoot(p, Math.atan2(e.y - p.y, e.x - p.x), arrow({ pct: V.dmg, speed: 18 })); n++;
      }
      if (!n) for (let i = 0; i < 12; i++) K().shoot(p, i / 12 * TAU, arrow({ pct: V.dmg, speed: 18 }));
    } });
  def('tumble_shot', { n: 'Tumble Shot', c: 'ranger', tr: 'barrage', row: 0, col: 2, k: 'passive', tags: ['mobility', 'aoe'], ic: ['multishot', '#b89a5a'], lvl: 3,
    v: { dmg: [70, 12], n: [3, 0.5] }, text: 'Passive. Every Dash looses a free Multishot of {n} arrows at the nearest foe, each for {dmg}% weapon damage.',
    bonus: V => ({ dashShot: V.dmg, dashShotN: Math.floor(V.n) }) });

  // R4.4: the roll itself is the Ranger's innate class action (Dash); this passive makes it better.
  def('dodge_roll', { n: 'Acrobatics', c: 'ranger', tr: 'survival', row: 0, col: 0, k: 'passive', tags: ['mobility', 'defense'], ic: ['leap', '#b89a5a'], lvl: 1,
    v: { cd: [0.25, 0.25], d: [0.3, 0.3], inv: [0.05, 0.05] }, text: 'Passive. Your Dash: {cd}s shorter cooldown, {d} tiles further, {inv}s longer untouchable.',
    bonus: V => ({ dashCd: V.cd, dashD: V.d, dashInv: V.inv }) });
  def('spike_trap', { n: 'Spike Trap', c: 'ranger', tr: 'survival', row: 1, col: 1, k: 'active', tags: ['aoe'], ic: ['trap', '#c9c2b0'], lvl: 4,
    mp: [7, 0.5], cd: [4, -0.25], tg: 'self', v: { dmg: [200, 35] },
    text: 'Lay a trap (max 3) that bursts for {dmg}% weapon damage and slows.',
    cast(p, t, V) { K().trap(p, { r: 2.1, pct: V.dmg, dtype: 'phys', st: [['slow', 100, 2.5, 0.4]], color: '#c9c2b0', fx: 'explosion' }); } });
  def('evasion', { n: 'Evasion', c: 'ranger', tr: 'survival', row: 1, col: 0, k: 'passive', tags: ['defense'], ic: ['boots', '#b89a5a'], lvl: 6,
    v: { dg: [3, 3], ms: [2, 2] }, text: 'Passive. +{dg}% dodge and +{ms}% movement speed.',
    mods: V => ({ dodge: V.dg, moveSpeed: V.ms }) });
  def('frost_trap', { n: 'Frost Trap', c: 'ranger', tr: 'survival', row: 2, col: 1, k: 'active', tags: ['aoe', 'defense'], ic: ['trap', '#7fd4ff'], lvl: 10, req: 'spike_trap',
    mp: [9, 0.5], cd: [10, -0.5], tg: 'self', v: { dmg: [100, 20], fr: [2, 0.25] },
    text: 'Lay a trap that deals {dmg}% weapon damage as cold and freezes foes for {fr}s.',
    cast(p, t, V) { K().trap(p, { r: 2.8, pct: V.dmg, dtype: 'cold', st: [['freeze', 100, V.fr]], color: COL.cold, fx: 'frost' }); } });
  def('vigor', { n: 'Vigor', c: 'ranger', tr: 'survival', row: 2, col: 0, k: 'passive', tags: ['defense'], ic: ['heal', '#7be04a'], lvl: 12,
    v: { hp: [5, 5], reg: [1, 1] }, text: 'Passive. +{hp}% maximum life and +{reg} life per second.',
    mods: V => ({ hpRegen: V.reg }), bonus: V => ({ hpPct: V.hp }) });
  def('camouflage', { n: 'Camouflage', c: 'ranger', tr: 'survival', row: 3, col: 0, k: 'active', tags: ['defense', 'buff'], ic: ['aura', '#3f6b3a'], lvl: 18, req: 'dodge_roll',
    mp: [10, 0], cd: [20, 0], tg: 'self', v: { dmg: [20, 5], dur: [5, 0.5] },
    text: 'Fade from sight for {dur}s: +40% dodge and +{dmg}% damage.',
    cast(p, t, V) { U().fx('smoke', p.x, p.y, {}); K().buff(p, { id: 'camouflage', t: V.dur, mods: { dodge: 40, dmgPct: V.dmg } }); } });

  // ============================== SORCERER ==============================
  def('fire_bolt', { n: 'Fire Bolt', c: 'sorcerer', tr: 'fire', row: 0, col: 1, k: 'active', tags: ['single'], ic: ['fire', '#ff7a2b'], lvl: 1,
    mp: [5, 0.5], tg: 'aim', range: 9, v: { dmg: [170, 25] },
    text: 'Hurl a bolt of flame for {dmg}% weapon damage as fire. Sets the target burning.',
    cast(p, t, V, aim) { U().sfx('fire'); K().shoot(p, aim.ang, { pct: V.dmg, type: 'fire', shape: 'fireball', color: COL.fire, speed: 13, st: [['burn', 100, 3, 0.1]] }); } });
  def('fireball', { n: 'Fireball', c: 'sorcerer', tr: 'fire', row: 1, col: 1, k: 'active', tags: ['aoe'], ic: ['fire', '#ffb347'], lvl: 4, req: 'fire_bolt',
    mp: [9, 1], tg: 'aim', range: 9, v: { dmg: [150, 22] },
    text: 'An exploding ball of fire: {dmg}% weapon damage to everything in the blast.',
    cast(p, t, V, aim) { U().sfx('fire'); K().shoot(p, aim.ang, { pct: V.dmg, type: 'fire', shape: 'fireball', color: '#ffb347', speed: 11, radius: 0.35, explode: 2.3 }); } });
  def('fire_mastery', { n: 'Fire Mastery', c: 'sorcerer', tr: 'fire', row: 1, col: 0, k: 'passive', tags: ['single', 'aoe'], ic: ['fire', '#e04a3a'], lvl: 6,
    v: { f: [8, 8] }, text: 'Passive. +{f}% fire damage.', bonus: V => ({ elem_fire: V.f }) });
  def('incinerate', { n: 'Incinerate', c: 'sorcerer', tr: 'fire', row: 2, col: 2, k: 'active', tags: ['single'], ic: ['fire', '#ff3b2e'], lvl: 10,
    mp: [10, 1], cd: [4, -0.25], tg: 'enemy', range: 8, v: { dmg: [100, 15] },
    text: 'A searing jet strikes one foe 4 times for {dmg}% weapon damage as fire.',
    cast(p, t, V) { U().sfx('fire'); K().buff(p, { id: 'incinerate', t: 0.85, every: 0.2, acc: 0.2, pct: V.dmg, tid: t.id }); } });
  def('combustion', { n: 'Combustion', c: 'sorcerer', tr: 'fire', row: 2, col: 0, k: 'passive', tags: ['single', 'aoe'], ic: ['star', '#ff7a2b'], lvl: 12,
    v: { crit: [2, 2], cd: [8, 8] }, text: 'Passive. +{crit}% critical chance and +{cd}% critical damage.',
    mods: V => ({ critChance: V.crit, critDmg: V.cd }) });
  def('meteor', { n: 'Meteor', c: 'sorcerer', tr: 'fire', row: 3, col: 1, k: 'active', tags: ['aoe'], ic: ['orb', '#ff5b2e'], lvl: 18, req: 'fireball',
    mp: [18, 2], cd: [10, -0.5], tg: 'point', range: 9, v: { dmg: [380, 60] },
    text: 'Call a meteor that lands after 0.9s for {dmg}% weapon damage as fire and leaves foes burning.',
    cast(p, t, V, aim) { U().sfx('cast'); K().zone({ x: aim.x, y: aim.y, r: 3, delay: 0.9, pct: V.dmg, dtype: 'fire', st: [['burn', 100, 4, 0.08]], fx: 'explosion', color: COL.fire, shake: 6 }); } });

  def('ice_shard', { n: 'Ice Shard', c: 'sorcerer', tr: 'frost', row: 0, col: 1, k: 'active', tags: ['single'], ic: ['ice', '#7fd4ff'], lvl: 1,
    mp: [5, 0.5], tg: 'aim', range: 9, v: { dmg: [150, 22] },
    text: 'A shard of ice for {dmg}% weapon damage as cold. Chills, slowing the target.',
    cast(p, t, V, aim) { U().sfx('ice'); K().shoot(p, aim.ang, { pct: V.dmg, type: 'cold', shape: 'shard', color: COL.cold, speed: 14, st: [['chill', 100, 2.5]] }); } });
  def('frost_nova', { n: 'Frost Nova', c: 'sorcerer', tr: 'frost', row: 1, col: 1, k: 'active', tags: ['aoe', 'defense'], ic: ['ice', '#d8f4ff'], lvl: 4,
    mp: [10, 1], cd: [9, -0.5], tg: 'self', v: { dmg: [110, 20], fr: [1.6, 0.2] },
    text: 'A ring of frost: {dmg}% weapon damage as cold and freezes nearby foes for {fr}s.',
    cast(p, t, V) {
      U().sfx('ice'); U().fx('nova', p.x, p.y, { radius: 3.6, color: COL.cold });
      for (const e of K().around(p.x, p.y, 3.6)) K().hit(e, V.dmg, 'cold', { st: [['freeze', 100, V.fr]] });
    } });
  def('frost_armor', { n: 'Frost Armor', c: 'sorcerer', tr: 'frost', row: 1, col: 0, k: 'passive', tags: ['defense'], ic: ['armor', '#7fd4ff'], lvl: 6,
    v: { ar: [8, 6], pct: [10, 8], res: [6, 6] }, text: 'Passive. +{ar} armour, +{pct}% total armour, +{res}% cold resistance. Melee attackers are chilled.',
    mods: V => ({ armor: V.ar, resCold: V.res }), bonus: V => ({ armorPct: V.pct, chillAttackers: 1 }) });
  def('blizzard', { n: 'Blizzard', c: 'sorcerer', tr: 'frost', row: 2, col: 1, k: 'active', tags: ['aoe'], ic: ['ice', '#5b8cff'], lvl: 12, req: 'frost_nova',
    mp: [16, 1.5], cd: [12, -0.5], tg: 'point', range: 9, v: { dmg: [45, 8] },
    text: 'A 5s storm of ice: {dmg}% weapon damage as cold twice a second, chilling everything inside.',
    cast(p, t, V, aim) { U().sfx('ice'); K().zone({ x: aim.x, y: aim.y, r: 3.6, t: 5, every: 0.5, pct: V.dmg, dtype: 'cold', st: [['chill', 100, 1.5]], fx: 'frost', color: COL.cold }); } });
  def('shatter', { n: 'Shatter', c: 'sorcerer', tr: 'frost', row: 2, col: 0, k: 'passive', tags: ['single', 'aoe'], ic: ['gem', '#7fd4ff'], lvl: 14,
    v: { d: [10, 8] }, text: 'Passive. +{d}% damage against chilled or frozen foes.', bonus: V => ({ vsChilled: V.d }) });
  def('glacial_spike', { n: 'Glacial Spike', c: 'sorcerer', tr: 'frost', row: 3, col: 1, k: 'active', tags: ['single'], ic: ['ice', '#b0e8ff'], lvl: 18, req: 'ice_shard',
    mp: [14, 1], cd: [6, -0.5], tg: 'aim', range: 10, v: { dmg: [360, 55] },
    text: 'A massive spike of ice for {dmg}% weapon damage as cold. Freezes for 1.5s.',
    cast(p, t, V, aim) { U().sfx('ice'); K().shoot(p, aim.ang, { pct: V.dmg, type: 'cold', shape: 'shard', color: '#d8f4ff', speed: 16, radius: 0.35, st: [['freeze', 100, 1.5]] }); } });
  def('rime_step', { n: 'Rime Step', c: 'sorcerer', tr: 'frost', row: 0, col: 2, k: 'passive', tags: ['mobility', 'defense'], ic: ['ice', '#b0e8ff'], lvl: 3,
    v: { dmg: [30, 8], d: [0.2, 0.2] }, text: 'Passive. Blink leaves a frost trail for 3s that chills foes and deals {dmg}% weapon damage as cold twice a second. Blink reaches {d} tiles further.',
    bonus: V => ({ dashFrost: V.dmg, dashD: V.d }) });

  def('arcane_mind', { n: 'Arcane Mind', c: 'sorcerer', tr: 'storm', row: 0, col: 0, k: 'passive', tags: ['buff'], ic: ['tome', '#6aa8ff'], lvl: 1,
    v: { mp: [8, 8], reg: [0.6, 0.6] }, text: 'Passive. +{mp}% maximum mana and +{reg} mana per second.',
    mods: V => ({ mpRegen: V.reg }), bonus: V => ({ mpPct: V.mp }) });
  def('chain_lightning', { n: 'Chain Lightning', c: 'sorcerer', tr: 'storm', row: 0, col: 1, k: 'active', tags: ['aoe'], ic: ['bolt', '#fff06a'], lvl: 4,
    mp: [8, 1], tg: 'enemy', range: 8, v: { dmg: [125, 18], n: [3, 0.5] },
    text: 'Lightning strikes a foe for {dmg}% weapon damage and arcs to {n} more.',
    cast(p, t, V) { U().sfx('bolt'); K().chain(p, t, Math.floor(V.n), V.dmg, 'lightning'); } });
  def('teleport', { n: 'Teleport', c: 'sorcerer', tr: 'storm', row: 1, col: 2, k: 'active', tags: ['mobility', 'defense'], ic: ['star', '#b98cff'], lvl: 6,
    mp: [8, 0], cd: [6, -0.5], tg: 'dir', range: 6, v: { d: [6, 0.5] },
    text: 'Blink up to {d} tiles in your movement direction.',
    cast(p, t, V) {
      const m = G.input.move, ang = Math.hypot(m.x, m.y) > 0.2 ? Math.atan2(m.y, m.x) : p.facing;
      for (let d = V.d; d >= 1; d -= 0.5) {
        const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
        if (game.W.canStand(x, y, p.radius)) { K().blink(p, x, y, 'teleport'); return; }
      }
      U().fx('teleport', p.x, p.y, {});
    } });
  def('mana_shield', { n: 'Mana Shield', c: 'sorcerer', tr: 'storm', row: 1, col: 0, k: 'active', tags: ['defense', 'buff'], ic: ['shield', '#6aa8ff'], lvl: 8,
    mp: [10, 0], cd: [20, 0], tg: 'self', v: { pct: [40, 5] },
    text: 'For 15s, {pct}% of damage taken drains mana instead of life.',
    cast(p, t, V) { U().fx('ring', p.x, p.y, { radius: 1, color: COL.mana, duration: 0.4 }); K().buff(p, { id: 'mana_shield', t: 15, pct: V.pct }); } });
  def('overcharge', { n: 'Overcharge', c: 'sorcerer', tr: 'storm', row: 2, col: 0, k: 'passive', tags: ['single', 'aoe'], ic: ['bolt', '#b98cff'], lvl: 12,
    v: { sd: [5, 5], cs: [3, 3] }, text: 'Passive. +{sd}% skill damage and +{cs}% cast speed.',
    mods: V => ({ skillDmgPct: V.sd, castSpeed: V.cs }) });
  def('thunderstorm', { n: 'Thunderstorm', c: 'sorcerer', tr: 'storm', row: 2, col: 1, k: 'active', tags: ['aoe', 'buff'], ic: ['bolt', '#ffffff'], lvl: 16, req: 'chain_lightning',
    mp: [20, 1.5], cd: [20, 0], tg: 'self', v: { dmg: [130, 20] },
    text: 'For 10s a storm follows you, striking a random nearby foe every 0.6s for {dmg}% weapon damage.',
    cast(p, t, V) { U().sfx('bolt'); K().buff(p, { id: 'thunderstorm', t: 10, every: 0.6, pct: V.dmg }); } });

  // ============================== NECROMANCER ==============================
  def('raise_skeleton', { n: 'Raise Skeleton', c: 'necromancer', tr: 'summoning', row: 0, col: 1, k: 'active', tags: ['summon', 'single'], ic: ['summon', '#d9d4c0'], lvl: 1,
    mp: [8, 1], cd: [4, 0], tg: 'self', v: { n: [2, 0.5], pow: [100, 15] },
    text: 'Raise skeleton warriors to fight for you (max {n}, {pow}% power). Recasting restores the full squad.',
    cast(p, t, V) { K().summon(p, 'raise_skeleton', 'minion_skeleton', Math.floor(V.n), V.pow); } });
  def('skeleton_mastery', { n: 'Skeleton Mastery', c: 'necromancer', tr: 'summoning', row: 1, col: 0, k: 'passive', tags: ['summon'], ic: ['skull', '#d9d4c0'], lvl: 4, req: 'raise_skeleton',
    v: { m: [15, 15] }, text: 'Passive. Your minions have +{m}% life and damage.', bonus: V => ({ minionPct: V.m }) });
  def('corpse_explosion', { n: 'Corpse Explosion', c: 'necromancer', tr: 'summoning', row: 1, col: 2, k: 'active', tags: ['aoe'], ic: ['skull', '#ff7a2b'], lvl: 6,
    mp: [8, 0.5], cd: [1, 0], tg: 'corpse', range: 9, v: { dmg: [240, 40] },
    text: 'Detonate a nearby corpse for {dmg}% weapon damage as fire in a wide blast.',
    cast(p, t, V, aim, sk, corpse) {
      corpse.ai.corpse = 0; corpse.exploded = true;
      U().sfx('fire'); U().fx('explosion', corpse.x, corpse.y, { radius: 2.7, color: '#d03a3a' }); U().fx('blood', corpse.x, corpse.y, {}); U().shake(3, 0.15);
      const amp = game.combo(p, 'amplify_damage');      // combo: the blast curses everything it does not kill
      for (const e of K().around(corpse.x, corpse.y, 2.7)) { K().hit(e, V.dmg, 'fire'); if (amp && !e.dead) game.addEffect(e, { id: 'amp', t: 6, taken: amp.amp }); }
    } });
  def('skeletal_mage', { n: 'Skeletal Mage', c: 'necromancer', tr: 'summoning', row: 2, col: 1, k: 'active', tags: ['summon', 'aoe'], ic: ['summon', '#7fd4ff'], lvl: 8, req: 'raise_skeleton',
    mp: [10, 1], cd: [4, 0], tg: 'self', v: { n: [1, 0.5], pow: [100, 15] },
    text: 'Raise skeletal mages that hurl frost from range (max {n}, {pow}% power).',
    cast(p, t, V) { K().summon(p, 'skeletal_mage', 'minion_mage', Math.floor(V.n), V.pow); } });
  def('golem', { n: 'Bone Golem', c: 'necromancer', tr: 'summoning', row: 3, col: 1, k: 'active', tags: ['summon', 'defense'], ic: ['summon', '#c08a4a'], lvl: 14,
    mp: [25, 1], cd: [12, 0], tg: 'self', v: { pow: [100, 20] },
    text: 'Assemble a hulking golem ({pow}% power) that draws the attention of your foes.',
    cast(p, t, V) { K().summon(p, 'golem', 'minion_golem', 1, V.pow); } });
  def('unholy_might', { n: 'Unholy Might', c: 'necromancer', tr: 'summoning', row: 3, col: 0, k: 'passive', tags: ['summon'], ic: ['buff', '#8ee06a'], lvl: 18, req: 'skeleton_mastery',
    v: { as: [8, 8], le: [2, 1] }, text: 'Passive. Minions attack {as}% faster and heal {le}% of their life on each hit.',
    bonus: V => ({ minionAS: V.as, minionLeech: V.le }) });
  def('grave_swap', { n: 'Grave Swap', c: 'necromancer', tr: 'summoning', row: 0, col: 2, k: 'passive', tags: ['mobility', 'summon', 'defense'], ic: ['summon', '#b98cff'], lvl: 3,
    v: { abs: [20, 8] }, text: 'Passive. Grave Step swaps you with your minion nearest its landing spot (within 8 tiles). The minion is wrapped in bone worth {abs}% of its life and taunts foes for 2s.',
    bonus: V => ({ dashSwap: V.abs }) });

  def('bone_spear', { n: 'Bone Spear', c: 'necromancer', tr: 'bone', row: 0, col: 1, k: 'active', tags: ['single'], ic: ['dagger', '#e8e0d0'], lvl: 1,
    mp: [5, 0.5], tg: 'aim', range: 9, v: { dmg: [150, 22] },
    text: 'A spear of bone that pierces every foe in its path for {dmg}% weapon damage.',
    cast(p, t, V, aim) { U().sfx('cast'); K().shoot(p, aim.ang, { pct: V.dmg, type: 'phys', shape: 'shard', color: '#e8e0d0', speed: 15, pierce: 99 }); } });
  def('bone_armor', { n: 'Bone Armor', c: 'necromancer', tr: 'bone', row: 1, col: 0, k: 'active', tags: ['defense', 'buff'], ic: ['armor', '#e8e0d0'], lvl: 4,
    mp: [10, 0.5], cd: [30, -1], tg: 'self', v: { abs: [100, 25] },
    text: 'A shell of bone absorbs damage for 20s ({abs}% strength, scales with level).',
    cast(p, t, V) {
      U().fx('ring', p.x, p.y, { radius: 1, color: '#e8e0d0', duration: 0.4 });
      K().buff(p, { id: 'bone_armor', t: 20, absorb: Math.round((15 + p.level * 8) * V.abs / 100) });
    } });
  def('bone_nova', { n: 'Bone Nova', c: 'necromancer', tr: 'bone', row: 1, col: 1, k: 'active', tags: ['aoe'], ic: ['whirl', '#e8e0d0'], lvl: 6, req: 'bone_spear',
    mp: [9, 1], cd: [1.5, 0], tg: 'self', v: { dmg: [95, 14], n: [8, 1] },
    text: 'Burst {n} shards of bone outward, each dealing {dmg}% weapon damage.',
    cast(p, t, V) {
      U().sfx('cast');
      const n = Math.floor(V.n), a0 = p.facing;
      for (let i = 0; i < n; i++) K().shoot(p, a0 + i / n * TAU, { pct: V.dmg, type: 'phys', shape: 'shard', color: '#e8e0d0', speed: 12, pierce: 1, life: 0.55 });
    } });
  def('life_drain', { n: 'Life Drain', c: 'necromancer', tr: 'bone', row: 2, col: 2, k: 'active', tags: ['single', 'defense'], ic: ['heal', '#b98cff'], lvl: 10,
    mp: [9, 0.5], cd: [5, -0.25], tg: 'enemy', range: 8, v: { dmg: [85, 14] },
    text: 'Siphon a foe 4 times for {dmg}% weapon damage, healing you for 60% of the damage dealt.',
    cast(p, t, V) { U().sfx('cast'); K().buff(p, { id: 'life_drain', t: 0.85, every: 0.2, acc: 0.2, pct: V.dmg, tid: t.id }); } });
  def('soul_harvest', { n: 'Soul Harvest', c: 'necromancer', tr: 'bone', row: 2, col: 0, k: 'passive', tags: ['defense'], ic: ['orb', '#8ee06a'], lvl: 8,
    v: { l: [3, 2], m: [2, 1] }, text: 'Passive. Each kill restores {l} life and {m} mana.',
    mods: V => ({ lifeOnKill: V.l, manaOnKill: V.m }) });
  def('bone_spirit', { n: 'Bone Spirit', c: 'necromancer', tr: 'bone', row: 3, col: 1, k: 'active', tags: ['single'], ic: ['skull', '#b98cff'], lvl: 18, req: 'bone_spear',
    mp: [14, 1], cd: [6, -0.5], tg: 'aim', range: 11, v: { dmg: [400, 60] },
    text: 'A vengeful spirit hunts down a foe for {dmg}% weapon damage.',
    cast(p, t, V, aim) { U().sfx('cast'); K().shoot(p, aim.ang, { pct: V.dmg, type: 'phys', shape: 'orb', color: COL.shadow, speed: 8, radius: 0.35, life: 3, homing: t ? t.id : 0 }); } });

  def('dark_knowledge', { n: 'Dark Knowledge', c: 'necromancer', tr: 'curses', row: 0, col: 0, k: 'passive', tags: ['buff'], ic: ['tome', '#8ee06a'], lvl: 1,
    v: { mp: [6, 6], sd: [3, 3] }, text: 'Passive. +{mp}% maximum mana and +{sd}% skill damage.',
    mods: V => ({ skillDmgPct: V.sd }), bonus: V => ({ mpPct: V.mp }) });
  def('amplify_damage', { n: 'Amplify Damage', c: 'necromancer', tr: 'curses', row: 0, col: 2, k: 'active', tags: ['single', 'buff'], ic: ['rune', '#d03a3a'], lvl: 4,
    mp: [6, 0.5], cd: [6, 0], tg: 'point', range: 9, v: { amp: [20, 5] },
    text: 'Curse an area: foes take {amp}% more damage for 10s.',
    cast(p, t, V, aim) {
      U().sfx('cast'); U().fx('ring', aim.x, aim.y, { radius: 3.6, color: '#d03a3a', duration: 0.5 });
      for (const e of K().around(aim.x, aim.y, 3.6)) game.addEffect(e, { id: 'amp', t: 10, taken: V.amp });
    } });
  def('withering', { n: 'Withering', c: 'necromancer', tr: 'curses', row: 1, col: 0, k: 'passive', tags: ['aoe', 'single'], ic: ['poison', '#8ee06a'], lvl: 8,
    v: { po: [10, 10], crit: [1, 1] }, text: 'Passive. +{po}% poison damage and +{crit}% critical chance.',
    mods: V => ({ critChance: V.crit }), bonus: V => ({ elem_poison: V.po }) });
  def('decrepify', { n: 'Decrepify', c: 'necromancer', tr: 'curses', row: 1, col: 2, k: 'active', tags: ['defense', 'aoe'], ic: ['rune', '#7fd4ff'], lvl: 10, req: 'amplify_damage',
    mp: [8, 0.5], cd: [8, 0], tg: 'point', range: 9, v: { weak: [20, 4] },
    text: 'Curse an area: foes are slowed by 40% and deal {weak}% less damage for 8s.',
    cast(p, t, V, aim) {
      U().sfx('cast'); U().fx('ring', aim.x, aim.y, { radius: 3.6, color: COL.cold, duration: 0.5 });
      for (const e of K().around(aim.x, aim.y, 3.6)) game.addEffect(e, { id: 'decrepify', t: 8, slow: 0.4, dealt: -V.weak });
    } });
  def('poison_nova', { n: 'Poison Nova', c: 'necromancer', tr: 'curses', row: 2, col: 1, k: 'active', tags: ['aoe'], ic: ['poison', '#7be04a'], lvl: 14,
    mp: [14, 1], cd: [8, -0.5], tg: 'self', v: { dmg: [40, 5], poi: [280, 50] },
    text: 'A ring of venom: {dmg}% weapon damage as poison, then {poi}% more over 5s.',
    cast(p, t, V) {
      U().sfx('cast'); U().fx('nova', p.x, p.y, { radius: 4.6, color: COL.poison });
      for (const e of K().around(p.x, p.y, 4.6)) K().hit(e, V.dmg, 'poison', { st: [['poison', 100, 5, V.poi / V.dmg / 5]] });
    } });
  def('lich_form', { n: 'Lich Form', c: 'necromancer', tr: 'curses', row: 3, col: 1, k: 'active', tags: ['buff'], ic: ['skull', '#8ee06a'], lvl: 20, req: 'poison_nova',
    mp: [20, 0], cd: [45, 0], tg: 'self', v: { sd: [30, 8], dur: [12, 1] },
    text: 'Become death for {dur}s: +{sd}% skill damage and 4% life steal.',
    cast(p, t, V) { K().shout(p, COL.poison); K().buff(p, { id: 'lich_form', t: V.dur, mods: { skillDmgPct: V.sd, lifeSteal: 4 } }); } });

  function U() { return game.U; }

  // ---- build the public table ----
  const fmt = function (n) { return Math.abs(n - Math.round(n)) < 0.01 ? String(Math.round(n)) : (Math.round(n * 100) / 100).toString(); };
  game.skillValues = function (sk, rank) {
    const V = {};
    if (sk.v) for (const k in sk.v) V[k] = sk.v[k][0] + sk.v[k][1] * (rank - 1);
    return V;
  };
  game.skillDesc = function (sk, rank) {
    const V = game.skillValues(sk, Math.max(1, rank));
    return sk.text.replace(/\{(\w+)\}/g, function (m, k) { return k === 'n' ? String(Math.floor(V[k])) : fmt(V[k]); });
  };

  const SKILLS = game.SKILLS = {};
  for (const id in RAW) {
    const o = RAW[id];
    const sk = {
      id: id, name: o.n, classId: o.c, tree: o.tr, icon: { shape: o.ic[0], color: o.ic[1] }, desc: '', maxRank: 5, reqLevel: o.lvl,
      requires: o.req || undefined, kind: o.k, tags: o.tags, row: o.row, col: o.col,
      // internal
      mp: o.mp || [0, 0], cd: o.cd || [0, 0], tg: o.tg || null, range: o.range || 0, v: o.v, text: o.text,
      cast: o.cast, mods: o.mods, bonus: o.bonus,
    };
    sk.desc = game.skillDesc(sk, 1);
    SKILLS[id] = sk;
  }

  // ---- R3.8 synergies: [fromSkill, value key boosted, % per rank of fromSkill]  or  [fromSkill, 'combo', description] ----
  // Numeric synergies boost the cast's own value (damage, power, duration…) per rank of the other skill, D2-style.
  // One combo per class changes behaviour (wired in the cast bodies above / playerHit) and is live from rank 1.
  const SYN = {
    bash: [['charge', 'dmg', 4], ['iron_skin', 'stun', 4]],
    charge: [['leap', 'dmg', 5]],
    rend: [['cleave', 'bleed', 5]],
    execute: [['bash', 'dmg', 3], ['bloodthirst', 'dmg', 4]],
    cleave: [['bash', 'dmg', 4], ['rend', 'combo', 'Cleave makes everything it hits bleed (half of Rend\'s bleed).']],
    whirlwind: [['cleave', 'dmg', 4], ['frenzy', 'dmg', 3]],
    leap: [['charge', 'dmg', 5], ['war_cry', 'dmg', 3]],
    earthquake: [['leap', 'dmg', 4], ['whirlwind', 'dmg', 3]],
    battle_shout: [['war_cry', 'dmg', 5]],
    shield_wall: [['iron_skin', 'dur', 5]],
    war_cry: [['battle_shout', 'stun', 6]],
    aimed_shot: [['multishot', 'dmg', 3], ['eagle_eye', 'dmg', 3]],
    piercing_shot: [['aimed_shot', 'dmg', 4]],
    poison_arrow: [['spike_trap', 'poi', 4], ['multishot', 'dmg', 3]],
    snipe: [['aimed_shot', 'dmg', 4], ['camouflage', 'dmg', 4]],
    multishot: [['aimed_shot', 'dmg', 3], ['poison_arrow', 'combo', 'Every Multishot arrow is poisoned (half of Poison Arrow\'s poison).']],
    rain_of_arrows: [['multishot', 'dmg', 4], ['frost_trap', 'dmg', 3]],
    explosive_arrow: [['rain_of_arrows', 'dmg', 4], ['spike_trap', 'dmg', 3]],
    arrow_storm: [['multishot', 'dmg', 3], ['rain_of_arrows', 'dmg', 3]],
    spike_trap: [['explosive_arrow', 'dmg', 5]],
    frost_trap: [['spike_trap', 'dmg', 5]],
    camouflage: [['dodge_roll', 'dmg', 6]],
    fire_bolt: [['ice_shard', 'dmg', 3], ['frost_nova', 'combo', 'Fire hitting a frozen enemy shatters it: +50% damage and a burst of frost around it.']],
    fireball: [['fire_bolt', 'dmg', 4], ['frost_nova', 'combo', 'Fire hitting a frozen enemy shatters it: +50% damage and a burst of frost around it.']],
    incinerate: [['fire_bolt', 'dmg', 4]],
    meteor: [['fireball', 'dmg', 4], ['blizzard', 'dmg', 3]],
    ice_shard: [['fire_bolt', 'dmg', 3]],
    frost_nova: [['ice_shard', 'dmg', 4], ['blizzard', 'fr', 3]],
    blizzard: [['frost_nova', 'dmg', 4]],
    glacial_spike: [['ice_shard', 'dmg', 4], ['chain_lightning', 'dmg', 3]],
    chain_lightning: [['thunderstorm', 'dmg', 4], ['ice_shard', 'dmg', 2]],
    teleport: [['arcane_mind', 'd', 3]],
    mana_shield: [['arcane_mind', 'pct', 4]],
    thunderstorm: [['chain_lightning', 'dmg', 4]],
    raise_skeleton: [['bone_armor', 'pow', 4], ['skeletal_mage', 'pow', 3]],
    corpse_explosion: [['bone_nova', 'dmg', 4], ['amplify_damage', 'combo', 'The blast curses everything it does not kill with Amplify Damage.']],
    skeletal_mage: [['raise_skeleton', 'pow', 4]],
    golem: [['bone_armor', 'pow', 6], ['raise_skeleton', 'pow', 3]],
    bone_spear: [['bone_nova', 'dmg', 3], ['raise_skeleton', 'dmg', 2]],
    bone_armor: [['golem', 'abs', 8]],
    bone_nova: [['bone_spear', 'dmg', 4]],
    life_drain: [['bone_spear', 'dmg', 4]],
    bone_spirit: [['bone_spear', 'dmg', 4], ['life_drain', 'dmg', 3]],
    amplify_damage: [['decrepify', 'amp', 5]],
    decrepify: [['amplify_damage', 'weak', 5]],
    poison_nova: [['bone_nova', 'poi', 3], ['withering', 'poi', 3]],
    lich_form: [['dark_knowledge', 'sd', 4]],
  };
  const SYN_LABEL = { dmg: 'damage', stun: 'stun', bleed: 'bleed damage', poi: 'poison damage', d: 'distance', dur: 'duration', fr: 'freeze time',
    pct: 'absorbed share', pow: 'minion power', abs: 'absorb', amp: 'curse strength', weak: 'curse strength', sd: 'skill damage' };
  for (const id in SYN) {
    const sk = SKILLS[id];
    sk.synergies = SYN[id].map(function (s) {
      const from = SKILLS[s[0]];
      if (s[1] === 'combo') return { from: s[0], desc: 'Combo with ' + from.name + ': ' + s[2], combo: true };
      return { from: s[0], desc: '+' + s[2] + '% ' + SYN_LABEL[s[1]] + ' per rank of ' + from.name, key: s[1], pct: s[2] };
    });
  }
  for (const id in SKILLS) if (!SKILLS[id].synergies) SKILLS[id].synergies = [];

  // Scale a cast's values by the ranks the player holds in its synergy skills (mutates V).
  game.applySynergies = function (p, sk, V) {
    const list = sk.synergies;
    for (let i = 0; i < list.length; i++) {
      const s = list[i], r = s.key ? (p.skills[s.from] || 0) : 0;
      if (r > 0 && V[s.key] !== undefined) V[s.key] *= 1 + s.pct * r / 100;
    }
    return V;
  };
  // A combo's partner skill values when the player has learned it (null otherwise).
  game.combo = function (p, fromId) {
    const r = p.skills[fromId] || 0;
    return r > 0 ? game.skillValues(SKILLS[fromId], r) : null;
  };

  // ---- auto-build plans: bar = final 4-slot layout, order = [skillId, targetRank] steps taken first-legal-first ----
  game.BUILDS = {
    warrior: {
      single: { bar: ['bash', 'charge', 'execute', 'battle_shout'],
        order: [['bash', 1], ['iron_skin', 1], ['weapon_mastery', 1], ['bash', 3], ['charge', 1], ['toughness', 1], ['ground_slam', 1], ['battle_shout', 1], ['weapon_mastery', 3], ['rend', 1], ['execute', 1], ['bash', 5], ['weapon_mastery', 5], ['execute', 5], ['deadly_precision', 5], ['frenzy', 5], ['toughness', 5], ['iron_skin', 5], ['charge', 5], ['bloodthirst', 5], ['battle_shout', 5], ['thorns_aura', 5], ['ground_slam', 5], ['shield_wall', 5]] },
      aoe: { bar: ['cleave', 'whirlwind', 'leap', 'earthquake'],
        order: [['cleave', 1], ['iron_skin', 1], ['cleave', 2], ['frenzy', 1], ['battle_shout', 1], ['cleave', 3], ['whirlwind', 1], ['toughness', 1], ['ground_slam', 1], ['whirlwind', 3], ['rend', 1], ['leap', 1], ['bloodthirst', 1], ['cleave', 5], ['earthquake', 1], ['whirlwind', 5], ['frenzy', 5], ['earthquake', 5], ['bloodthirst', 5], ['weapon_mastery', 5], ['toughness', 5], ['iron_skin', 5], ['leap', 5], ['deadly_precision', 5], ['thorns_aura', 5], ['ground_slam', 5]] },
      balanced: { bar: ['bash', 'whirlwind', 'charge', 'battle_shout'],
        order: [['bash', 1], ['cleave', 1], ['iron_skin', 1], ['weapon_mastery', 1], ['bash', 3], ['whirlwind', 1], ['toughness', 1], ['ground_slam', 1], ['charge', 1], ['battle_shout', 1], ['whirlwind', 3], ['rend', 1], ['bash', 5], ['weapon_mastery', 5], ['whirlwind', 5], ['frenzy', 5], ['toughness', 5], ['iron_skin', 5], ['bloodthirst', 5], ['battle_shout', 5], ['charge', 5], ['deadly_precision', 5], ['thorns_aura', 5], ['ground_slam', 5], ['cleave', 5]] },
    },
    ranger: {
      single: { bar: ['aimed_shot', 'poison_arrow', 'snipe', 'piercing_shot'],
        order: [['aimed_shot', 1], ['dodge_roll', 1], ['eagle_eye', 1], ['aimed_shot', 3], ['evasion', 1], ['spike_trap', 1], ['piercing_shot', 1], ['eagle_eye', 3], ['poison_arrow', 1], ['aimed_shot', 5], ['vigor', 1], ['lethal_focus', 1], ['eagle_eye', 5], ['snipe', 1], ['poison_arrow', 5], ['snipe', 5], ['lethal_focus', 5], ['rapid_fire', 5], ['evasion', 5], ['vigor', 5], ['dodge_roll', 3], ['camouflage', 5], ['ricochet', 5], ['tumble_shot', 5], ['dodge_roll', 5]] },
      aoe: { bar: ['multishot', 'rain_of_arrows', 'explosive_arrow', 'arrow_storm'],
        order: [['multishot', 1], ['dodge_roll', 1], ['multishot', 3], ['rapid_fire', 1], ['tumble_shot', 1], ['evasion', 1], ['rain_of_arrows', 1], ['multishot', 5], ['explosive_arrow', 1], ['poison_arrow', 1], ['vigor', 1], ['rain_of_arrows', 3], ['rapid_fire', 5], ['explosive_arrow', 5], ['arrow_storm', 1], ['rain_of_arrows', 5], ['arrow_storm', 5], ['eagle_eye', 5], ['ricochet', 5], ['tumble_shot', 5], ['evasion', 5], ['vigor', 5], ['lethal_focus', 5], ['dodge_roll', 5]] },
      balanced: { bar: ['aimed_shot', 'multishot', 'rain_of_arrows', 'explosive_arrow'],
        order: [['aimed_shot', 1], ['multishot', 1], ['dodge_roll', 1], ['eagle_eye', 1], ['aimed_shot', 3], ['multishot', 3], ['rapid_fire', 1], ['tumble_shot', 1], ['evasion', 1], ['rain_of_arrows', 1], ['poison_arrow', 1], ['aimed_shot', 5], ['multishot', 5], ['vigor', 1], ['rain_of_arrows', 5], ['eagle_eye', 5], ['rapid_fire', 5], ['lethal_focus', 5], ['evasion', 5], ['vigor', 5], ['ricochet', 5], ['tumble_shot', 5], ['dodge_roll', 5], ['poison_arrow', 5], ['explosive_arrow', 5]] },
    },
    sorcerer: {
      single: { bar: ['fire_bolt', 'incinerate', 'glacial_spike', 'mana_shield'],
        order: [['fire_bolt', 1], ['arcane_mind', 1], ['rime_step', 1], ['ice_shard', 1], ['fire_bolt', 3], ['fire_mastery', 1], ['frost_armor', 1], ['mana_shield', 1], ['frost_nova', 1], ['incinerate', 1], ['fire_bolt', 5], ['fire_mastery', 3], ['incinerate', 3], ['combustion', 1], ['glacial_spike', 1], ['fire_mastery', 5], ['incinerate', 5], ['glacial_spike', 5], ['combustion', 5], ['overcharge', 5], ['arcane_mind', 5], ['rime_step', 3], ['mana_shield', 5], ['frost_armor', 5], ['shatter', 5], ['teleport', 5]] },
      aoe: { bar: ['fireball', 'chain_lightning', 'frost_nova', 'meteor'],
        order: [['fire_bolt', 1], ['arcane_mind', 1], ['rime_step', 1], ['fire_bolt', 2], ['fireball', 1], ['chain_lightning', 1], ['frost_nova', 1], ['fireball', 3], ['frost_armor', 1], ['fire_mastery', 1], ['fireball', 5], ['chain_lightning', 5], ['fire_mastery', 5], ['meteor', 1], ['meteor', 5], ['overcharge', 5], ['combustion', 5], ['frost_nova', 5], ['arcane_mind', 5], ['rime_step', 3], ['frost_armor', 5], ['blizzard', 5], ['shatter', 5], ['thunderstorm', 5]] },
      balanced: { bar: ['fire_bolt', 'fireball', 'chain_lightning', 'frost_nova'],
        order: [['fire_bolt', 1], ['arcane_mind', 1], ['rime_step', 1], ['fire_bolt', 2], ['fireball', 1], ['chain_lightning', 1], ['frost_nova', 1], ['fire_bolt', 3], ['fireball', 3], ['fire_mastery', 1], ['frost_armor', 1], ['fire_bolt', 5], ['fireball', 5], ['fire_mastery', 5], ['chain_lightning', 5], ['overcharge', 5], ['combustion', 5], ['frost_nova', 5], ['arcane_mind', 5], ['rime_step', 3], ['frost_armor', 5], ['shatter', 5], ['meteor', 5], ['mana_shield', 5]] },
    },
    necromancer: {
      single: { bar: ['bone_spear', 'raise_skeleton', 'life_drain', 'bone_spirit'],
        order: [['bone_spear', 1], ['raise_skeleton', 1], ['dark_knowledge', 1], ['grave_swap', 1], ['bone_spear', 3], ['skeleton_mastery', 1], ['bone_armor', 1], ['raise_skeleton', 2], ['life_drain', 1], ['bone_spear', 5], ['soul_harvest', 1], ['raise_skeleton', 3], ['bone_spirit', 1], ['life_drain', 3], ['bone_spirit', 5], ['life_drain', 5], ['dark_knowledge', 5], ['grave_swap', 3], ['skeleton_mastery', 5], ['soul_harvest', 5], ['raise_skeleton', 5], ['withering', 5], ['unholy_might', 5], ['amplify_damage', 5]] },
      aoe: { bar: ['bone_nova', 'corpse_explosion', 'raise_skeleton', 'poison_nova'],
        order: [['bone_spear', 1], ['raise_skeleton', 1], ['dark_knowledge', 1], ['grave_swap', 1], ['raise_skeleton', 2], ['bone_spear', 2], ['bone_nova', 1], ['corpse_explosion', 1], ['amplify_damage', 1], ['skeleton_mastery', 1], ['soul_harvest', 1], ['bone_nova', 3], ['corpse_explosion', 3], ['poison_nova', 1], ['bone_nova', 5], ['poison_nova', 5], ['withering', 5], ['corpse_explosion', 5], ['dark_knowledge', 5], ['grave_swap', 3], ['skeleton_mastery', 5], ['raise_skeleton', 5], ['soul_harvest', 5], ['unholy_might', 5], ['skeletal_mage', 5]] },
      balanced: { bar: ['bone_spear', 'bone_nova', 'raise_skeleton', 'skeletal_mage'],
        order: [['bone_spear', 1], ['raise_skeleton', 1], ['dark_knowledge', 1], ['grave_swap', 1], ['bone_spear', 3], ['skeleton_mastery', 1], ['bone_nova', 1], ['raise_skeleton', 2], ['soul_harvest', 1], ['skeletal_mage', 1], ['bone_nova', 3], ['raise_skeleton', 3], ['bone_spear', 5], ['bone_nova', 5], ['skeleton_mastery', 5], ['skeletal_mage', 3], ['raise_skeleton', 5], ['dark_knowledge', 5], ['grave_swap', 3], ['soul_harvest', 5], ['skeletal_mage', 5], ['unholy_might', 5], ['golem', 5], ['withering', 5]] },
    },
  };
})();
