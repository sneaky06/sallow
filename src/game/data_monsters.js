// Bestiary, elite affixes, bosses, NPC presets. Pure tables: G.game.MONSTERS, AFFIXES, BOSS_ORDER, NPCS.
// Numbers are "level 1" values; monsters.js scales them by level (= map.depth) without an upper bound.
(function () {
  'use strict';
  const G = window.G;
  const game = G.game;

  // Archetype defaults — a monster def overrides any field.
  const ARCH = {
    melee:  { hp: 20, dmg: [2, 4],  spd: 2.7, cd: 1.4, wind: 0.35, aggro: 7.5, xp: 10, armor: 5,  r: 0.32, atk: 'melee' },
    ranged: { hp: 13, dmg: [3, 4],  spd: 2.4, cd: 1.9, wind: 0.45, aggro: 8.5, xp: 11, armor: 3,  r: 0.3,  atk: 'shot', range: 6.5 },
    caster: { hp: 13, dmg: [3, 7],  spd: 2.2, cd: 2.5, wind: 0.6,  aggro: 8.5, xp: 13, armor: 2,  r: 0.3,  atk: 'shot', range: 6.5 },
    swarm:  { hp: 7,  dmg: [1, 2],  spd: 3.5, cd: 1.0, wind: 0.25, aggro: 8,   xp: 4,  armor: 0,  r: 0.22, atk: 'melee' },
    brute:  { hp: 52, dmg: [6, 9], spd: 1.9, cd: 2.0, wind: 0.65, aggro: 7,   xp: 24, armor: 14, r: 0.45, atk: 'melee' },
    boss:   { hp: 1100, dmg: [8, 12], spd: 2.3, cd: 1.9, wind: 0.55, aggro: 12, xp: 400, armor: 10, r: 0.7, atk: 'melee' },
  };

  const M = game.MONSTERS = {};
  const mon = function (id, arch, o) {
    const d = Object.assign({}, ARCH[arch], o);
    d.id = id; d.arch = arch;
    d.sprite = { body: o.body, color: o.color, accent: o.accent, scale: o.scale || 1, weapon: o.weapon || 'none' };
    M[id] = d;
  };

  // ---------------- crypt (depth 1-5) ----------------
  mon('skeleton', 'melee', { n: 'Skeleton', theme: 'crypt', body: 'skeleton', color: '#d9d4c0', accent: '#6b6455', weapon: 'sword', desc: 'Rattling footman of the old dead.' });
  mon('skeleton_archer', 'ranged', { n: 'Skeleton Archer', theme: 'crypt', body: 'skeleton', color: '#cfc8ae', accent: '#7a5a3a', weapon: 'bow',
    proj: { shape: 'arrow', color: '#d9d4c0', speed: 9 }, desc: 'Keeps its distance and its aim.' });
  mon('grave_rat', 'swarm', { n: 'Grave Rat', theme: 'crypt', body: 'beast', color: '#6b5a4a', accent: '#c96a6a', scale: 0.7, desc: 'Never alone.' });
  mon('ghoul', 'brute', { n: 'Ghoul', theme: 'crypt', body: 'brute', color: '#6f8a6a', accent: '#3a4a3a', onHit: ['poison', 30, 4, 0.25], desc: 'Slow, heavy and rotten through.' });
  mon('bone_mage', 'caster', { n: 'Bone Mage', theme: 'crypt', body: 'caster', color: '#4a3b5a', accent: '#ff7a2b', weapon: 'staff', dtype: 'fire',
    proj: { shape: 'fireball', color: '#ff7a2b', speed: 7.5 }, onHit: ['burn', 40, 3, 0.2], desc: 'Hurls fire from behind its betters.' });
  mon('wraith', 'melee', { n: 'Wraith', theme: 'crypt', body: 'wraith', color: '#8fb8c9', accent: '#d8f4ff', hp: 17, spd: 3.3, dtype: 'cold', onHit: ['chill', 100, 2],
    res: { cold: 60 }, desc: 'A cold hunger that drifts through the dark.' });

  // ---------------- caves (depth 6-10) ----------------
  mon('goblin', 'melee', { n: 'Cave Goblin', theme: 'caves', body: 'humanoid', color: '#5f8a3a', accent: '#8a5a2a', scale: 0.85, weapon: 'dagger', spd: 3.0, desc: 'Vicious, quick, cowardly in ones.' });
  mon('goblin_slinger', 'ranged', { n: 'Goblin Slinger', theme: 'caves', body: 'humanoid', color: '#6f9a4a', accent: '#c9c2b0', scale: 0.85,
    proj: { shape: 'orb', color: '#9a9080', speed: 9.5 }, desc: 'Stones hurt more than you would think.' });
  mon('cave_spider', 'swarm', { n: 'Cave Spider', theme: 'caves', body: 'spider', color: '#3a2a3a', accent: '#7be04a', scale: 0.75, dtype: 'phys', onHit: ['poison', 35, 4, 0.5], desc: 'Skittering venom.' });
  mon('cave_bat', 'swarm', { n: 'Gloom Bat', theme: 'caves', body: 'flyer', color: '#4a3a4a', accent: '#c96a6a', scale: 0.7, spd: 4.2, hp: 6, desc: 'Erratic, fast, annoying.' });
  mon('troll', 'brute', { n: 'Cave Troll', theme: 'caves', body: 'brute', color: '#5a6a7a', accent: '#8a7a5a', weapon: 'mace', hp: 70, regen: 1.5, desc: 'Heals what you do not kill quickly.' });
  mon('shaman', 'caster', { n: 'Goblin Shaman', theme: 'caves', body: 'caster', color: '#4a6a3a', accent: '#fff06a', scale: 0.9, weapon: 'staff', dtype: 'lightning',
    proj: { shape: 'bolt', color: '#fff06a', speed: 10 }, onHit: ['shock', 50, 3], desc: 'Calls the storm underground.' });
  mon('slime', 'melee', { n: 'Bile Slime', theme: 'caves', body: 'blob', color: '#6aa84a', accent: '#c9e06a', hp: 30, spd: 2.0, dtype: 'poison', onHit: ['poison', 60, 4, 0.4],
    res: { poison: 75 }, desc: 'Digests slowly. Has time.' });

  // ---------------- inferno (depth 11-15) ----------------
  mon('imp', 'swarm', { n: 'Imp', theme: 'inferno', body: 'flyer', color: '#c94a2a', accent: '#ffb347', scale: 0.75, dtype: 'fire', res: { fire: 60 }, desc: 'Cackling sparks with teeth.' });
  mon('fire_imp', 'ranged', { n: 'Ember Imp', theme: 'inferno', body: 'flyer', color: '#e0662a', accent: '#fff06a', scale: 0.85, dtype: 'fire',
    proj: { shape: 'fireball', color: '#ff7a2b', speed: 9 }, onHit: ['burn', 40, 3, 0.2], res: { fire: 60 }, desc: 'Spits coals from the air.' });
  mon('hellhound', 'melee', { n: 'Hellhound', theme: 'inferno', body: 'beast', color: '#7a2a1a', accent: '#ff7a2b', spd: 3.6, hp: 20, dtype: 'fire', onHit: ['burn', 50, 3, 0.25],
    res: { fire: 50 }, desc: 'Runs you down, then burns what is left.' });
  mon('magma_brute', 'brute', { n: 'Magma Brute', theme: 'inferno', body: 'brute', color: '#4a2a1a', accent: '#ff5b2e', dtype: 'fire', res: { fire: 75, cold: -25 }, deathBlast: 'fire', desc: 'A walking furnace. Stand back when it falls.' });
  mon('pyromancer', 'caster', { n: 'Cult Pyromancer', theme: 'inferno', body: 'caster', color: '#5a1a1a', accent: '#ffb347', weapon: 'staff', dtype: 'fire', atk: 'blast',
    blast: { r: 1.8, tele: 0.9 }, onHit: ['burn', 100, 3, 0.2], res: { fire: 50 }, desc: 'Marks the ground, then sets it alight.' });
  mon('demon_warrior', 'melee', { n: 'Pit Fiend', theme: 'inferno', body: 'demon', color: '#8a1a2a', accent: '#2a1a1a', weapon: 'axe', hp: 30, dmg: [4, 7], armor: 9, desc: 'Hell\'s infantry.' });

  // ---------------- abyss (depth 16+) ----------------
  mon('void_wraith', 'melee', { n: 'Void Wraith', theme: 'abyss', body: 'wraith', color: '#5a3a8a', accent: '#b98cff', spd: 3.3, dtype: 'cold', onHit: ['chill', 100, 2], blink: 6,
    res: { cold: 50, lightning: 50 }, desc: 'Is behind you.' });
  mon('abyss_stalker', 'melee', { n: 'Abyss Stalker', theme: 'abyss', body: 'spider', color: '#2a2a4a', accent: '#b98cff', spd: 3.5, hp: 24, dmg: [4, 6], onHit: ['poison', 40, 4, 0.5], desc: 'Too many legs, too little mercy.' });
  mon('gazer', 'ranged', { n: 'Gazer', theme: 'abyss', body: 'flyer', color: '#3a2a5a', accent: '#fff06a', dtype: 'lightning',
    proj: { shape: 'bolt', color: '#c9a8ff', speed: 11 }, onHit: ['shock', 40, 3], desc: 'An eye that hates what it sees.' });
  mon('void_caller', 'caster', { n: 'Void Caller', theme: 'abyss', body: 'caster', color: '#2a1a4a', accent: '#7fd4ff', weapon: 'staff', dtype: 'cold', atk: 'blast',
    blast: { r: 2.0, tele: 0.9 }, onHit: ['chill', 100, 3], res: { cold: 50 }, desc: 'Opens small, cold holes in the world.' });
  mon('dread_knight', 'brute', { n: 'Dread Knight', theme: 'abyss', body: 'demon', color: '#2a2a3a', accent: '#8a8a9a', weapon: 'sword', scale: 1.2, armor: 22, hp: 64, desc: 'Something else wears the armour now.' });
  mon('shadowling', 'swarm', { n: 'Shadowling', theme: 'abyss', body: 'blob', color: '#1a1a2a', accent: '#b98cff', scale: 0.7, desc: 'Scraps of the dark, hungry for more.' });

  // ---------------- player minions ----------------
  mon('minion_skeleton', 'melee', { n: 'Skeleton Warrior', theme: 'minion', body: 'skeleton', color: '#e8e0c8', accent: '#8ee06a', weapon: 'sword', hp: 30, dmg: [3, 5], spd: 3.6, cd: 1.2, armor: 6, desc: 'Yours.' });
  mon('minion_mage', 'ranged', { n: 'Skeletal Mage', theme: 'minion', body: 'caster', color: '#cfc8ae', accent: '#7fd4ff', weapon: 'staff', hp: 20, dmg: [4, 6], spd: 3.4, cd: 1.6, range: 6, dtype: 'cold',
    proj: { shape: 'shard', color: '#7fd4ff', speed: 11 }, onHit: ['chill', 100, 2], desc: 'Yours, and colder.' });
  mon('minion_golem', 'brute', { n: 'Bone Golem', theme: 'minion', body: 'brute', color: '#d9d4c0', accent: '#8ee06a', scale: 1.25, hp: 110, dmg: [6, 9], spd: 3.0, cd: 1.6, armor: 20, taunt: true, desc: 'Yours, and enormous.' });

  // ---------------- bosses ----------------
  // phases[i].at = hp fraction at which the phase begins. Moves are telegraphed (tele seconds) and resolved in monsters.js.
  mon('boss_gravelord', 'boss', { n: 'Morgrath the Gravelord', theme: 'crypt', boss: true, body: 'skeleton', color: '#e8e0c8', accent: '#7a3bd0', scale: 1.9, weapon: 'axe',
    desc: 'First king buried here. Last one still ruling.',
    phases: [
      { at: 1, moves: [
        { id: 'Grave Slam', kind: 'slam', cd: 6, r: 2.8, tele: 0.9, mult: 1.7, color: '#b98cff' },
        { id: 'Bone Volley', kind: 'fan', cd: 7, n: 5, spread: 0.22, tele: 0.55, mult: 0.9, proj: { shape: 'shard', color: '#e8e0c8', speed: 8.5 } },
        { id: 'Grave Step', kind: 'blink', cd: 9, first: 6, r: 2.6, tele: 0.8, mult: 1.4, color: '#b98cff', minRange: 4.5 }] },
      { at: 0.6, say: 'Rise, my court!', moves: [
        { id: 'Raise Court', kind: 'summon', cd: 16, first: 0.5, mon: 'skeleton', n: 3, max: 6 },
        { id: 'Grave Burst', kind: 'circles', cd: 8, n: 3, r: 1.8, spread: 2.2, tele: 1.0, mult: 1.4, color: '#b98cff' }] },
      { at: 0.3, say: 'I will not be buried twice!', enrage: true, moves: [
        { id: 'Bone Storm', kind: 'ring', cd: 6, n: 12, tele: 0.7, mult: 0.9, proj: { shape: 'shard', color: '#e8e0c8', speed: 7.5 } }] },
    ] });
  mon('boss_broodmother', 'boss', { n: 'Skarn the Broodmother', theme: 'caves', boss: true, body: 'spider', color: '#2a1a2a', accent: '#7be04a', scale: 2.0, hp: 1180, spd: 2.8, dtype: 'poison',
    onHit: ['poison', 60, 4, 0.3], res: { poison: 75 }, desc: 'Every spider in the dark is hers.',
    phases: [
      { at: 1, moves: [
        { id: 'Venom Spit', kind: 'fan', cd: 5.5, n: 3, spread: 0.25, tele: 0.5, mult: 1.0, dtype: 'poison', st: ['poison', 100, 4, 0.3], proj: { shape: 'spit', color: '#7be04a', speed: 9 } },
        { id: 'Pounce', kind: 'charge', cd: 9, tele: 0.8, mult: 1.8, dist: 8 }] },
      { at: 0.6, say: 'The eggs hatch.', moves: [
        { id: 'Hatch', kind: 'summon', cd: 15, first: 0.5, mon: 'cave_spider', n: 4, max: 8 },
        { id: 'Bile Pools', kind: 'circles', cd: 9, n: 3, r: 1.9, spread: 2.5, tele: 0.9, mult: 0.7, dtype: 'poison', color: '#7be04a', linger: { t: 4, every: 0.5, mult: 0.3 } }] },
      { at: 0.3, say: 'Skarn shrieks in fury!', enrage: true, moves: [
        { id: 'Web Burst', kind: 'ring', cd: 7, n: 10, tele: 0.7, mult: 0.8, dtype: 'poison', st: ['slow', 100, 2.5, 0.5], proj: { shape: 'spit', color: '#d9d4c0', speed: 7 } }] },
    ] });
  mon('boss_tyrant', 'boss', { n: 'Azgalor, the Ember Tyrant', theme: 'inferno', boss: true, body: 'demon', color: '#7a1a1a', accent: '#ffb347', scale: 2.0, weapon: 'sword', hp: 1120, dmg: [8, 12], dtype: 'fire',
    onHit: ['burn', 60, 3, 0.2], res: { fire: 75, cold: -20 }, desc: 'Sits a throne of slag and waits for kindling.',
    phases: [
      { at: 1, moves: [
        { id: 'Fire Nova', kind: 'slam', cd: 6.5, r: 3.3, tele: 0.9, mult: 1.6, dtype: 'fire', color: '#ff7a2b', st: ['burn', 100, 3, 0.15] },
        { id: 'Flame Lash', kind: 'fan', cd: 6, n: 3, spread: 0.3, tele: 0.5, mult: 1.0, dtype: 'fire', explode: 1.6, proj: { shape: 'fireball', color: '#ff7a2b', speed: 8.5 } },
        { id: 'Infernal Leap', kind: 'blink', cd: 9, first: 6, r: 3.0, tele: 0.8, mult: 1.5, dtype: 'fire', color: '#ff5b2e', minRange: 4.5 }] },
      { at: 0.65, say: 'Burn with me!', moves: [
        { id: 'Meteor Rain', kind: 'circles', cd: 8, first: 0.5, n: 4, r: 2.0, spread: 3.2, tele: 1.1, mult: 1.5, dtype: 'fire', color: '#ff5b2e' },
        { id: 'Call Imps', kind: 'summon', cd: 18, mon: 'imp', n: 4, max: 8 }] },
      { at: 0.3, say: 'The Tyrant\'s flames turn white!', enrage: true, moves: [
        { id: 'Ring of Cinders', kind: 'ring', cd: 7, n: 12, tele: 0.8, mult: 0.9, dtype: 'fire', proj: { shape: 'fireball', color: '#ffb347', speed: 6.5 } }] },
    ] });
  mon('boss_hollow', 'boss', { n: 'Xal\'thuun, the Hollow Star', theme: 'abyss', boss: true, body: 'wraith', color: '#3a1a6a', accent: '#d8c8ff', scale: 2.1, hp: 1260, dmg: [9, 13], spd: 2.6, dtype: 'cold',
    onHit: ['chill', 100, 2], res: { cold: 60, lightning: 60 }, desc: 'A hole where a god used to be.',
    phases: [
      { at: 1, moves: [
        { id: 'Rift Step', kind: 'blink', cd: 8, r: 2.7, tele: 0.8, mult: 1.6, dtype: 'cold', color: '#b98cff' },
        { id: 'Void Bolts', kind: 'fan', cd: 5.5, n: 5, spread: 0.2, tele: 0.5, mult: 0.9, dtype: 'lightning', st: ['shock', 60, 3], proj: { shape: 'bolt', color: '#c9a8ff', speed: 10 } }] },
      { at: 0.65, say: 'The dark between stars opens.', moves: [
        { id: 'Void Wells', kind: 'circles', cd: 8, first: 0.5, n: 3, r: 2.0, spread: 2.6, tele: 1.0, mult: 1.0, dtype: 'cold', color: '#7a5aff', st: ['chill', 100, 3], linger: { t: 4, every: 0.5, mult: 0.3 } },
        { id: 'Shed Shadows', kind: 'summon', cd: 16, mon: 'shadowling', n: 4, max: 8 }] },
      { at: 0.3, say: 'Xal\'thuun collapses inward!', enrage: true, moves: [
        { id: 'Starfall', kind: 'ring', cd: 5.5, n: 14, waves: 2, tele: 0.7, mult: 0.8, dtype: 'lightning', proj: { shape: 'orb', color: '#d8c8ff', speed: 6.5 } }] },
    ] });

  game.BOSS_ORDER = ['boss_gravelord', 'boss_broodmother', 'boss_tyrant', 'boss_hollow'];
  game.THEME_POOLS = { crypt: [], caves: [], inferno: [], abyss: [] };
  for (const id in M) if (!M[id].boss && game.THEME_POOLS[M[id].theme]) game.THEME_POOLS[M[id].theme].push(id);

  // Elite affixes, keyed by the display string stored in ent.affixes. `apply` tweaks the fresh entity (plain data only);
  // behavioural affixes are checked by name in monsters.js / combat.js.
  game.AFFIXES = {
    'Fast':           { color: '#fff06a', apply(e) { e.speed *= 1.35; e.atkCd *= 0.75; } },
    'Extra Strong':   { color: '#e04a3a', apply(e) { e.dmgMin *= 1.45; e.dmgMax *= 1.45; } },
    'Stalwart':       { color: '#9aa0aa', apply(e) { e.stats.hpMax = Math.round(e.stats.hpMax * 1.5); e.stats.armor *= 1.5; } },
    'Fire Enchanted': { color: '#ff7a2b', apply(e) { e.stats.resFire = 75; } },
    'Frozen':         { color: '#7fd4ff', apply(e) { e.stats.resCold = 75; } },
    'Shocking':       { color: '#fff06a', apply(e) { e.stats.resLightning = 75; } },
    'Venomous':       { color: '#7be04a', apply(e) { e.stats.resPoison = 75; } },
    'Vampiric':       { color: '#d03a3a', apply() {} },
    'Teleporter':     { color: '#b98cff', apply(e) { e.ai.blinkT = 4; } },
    'Shielding':      { color: '#d8f4ff', apply(e) { e.ai.shieldT = 5; } },
    'Thorned':        { color: '#8a7a5a', apply(e) { e.stats.thorns = Math.max(1, Math.round((e.dmgMin + e.dmgMax) * 0.2)); } },
    'Regenerating':   { color: '#5bff8a', apply(e) { e.regen = (e.regen || 0) + 2 / (game.TIER_HP[e.rarity] || 1); } },      // % of a normal monster's life: tough tiers do not out-heal you
  };
  game.AFFIX_IDS = Object.keys(game.AFFIXES);
  // Life multiplier per tier (mirrors monsters.js) — heals and regen are scaled down by it so elites stay killable.
  game.TIER_HP = { normal: 1, champion: 2.2, rare: 3.5, legendary: 8, boss: 10 };

  game.RARE_NAMES = {
    a: ['Gore', 'Bone', 'Rot', 'Grim', 'Blight', 'Dread', 'Ash', 'Vile', 'Night', 'Skull', 'Plague', 'Soul'],
    b: ['fang', 'maw', 'claw', 'shade', 'rend', 'gnash', 'thorn', 'wail', 'husk', 'brand', 'gut', 'spite'],
    t: ['the Cruel', 'the Unclean', 'the Hungry', 'the Flayer', 'the Hollow', 'the Butcher', 'the Undying', 'the Mad', 'the Patient', 'the Defiler'],
  };

  game.NPCS = {
    merchant:    { name: 'Orlen the Peddler',  sprite: { body: 'humanoid', color: '#7a5a2a', accent: '#e0c060', scale: 1, weapon: 'none' } },
    blacksmith:  { name: 'Brakka Ironhand',    sprite: { body: 'brute',    color: '#5a3a2a', accent: '#9aa0aa', scale: 0.9, weapon: 'mace' } },
    mystic:      { name: 'Seer Ysolde',        sprite: { body: 'caster',   color: '#5a2a7a', accent: '#b98cff', scale: 1, weapon: 'wand' } },
    healer:      { name: 'Sister Maren',       sprite: { body: 'caster',   color: '#d8d2c4', accent: '#d03a3a', scale: 1, weapon: 'staff' } },
    elder:       { name: 'Elder Thane',        sprite: { body: 'humanoid', color: '#4a4a5a', accent: '#d8d2c4', scale: 1, weapon: 'staff' } },
    stashkeeper: { name: 'Old Wick',           sprite: { body: 'humanoid', color: '#3a4a3a', accent: '#b89a5a', scale: 1, weapon: 'none' } },
  };
})();
