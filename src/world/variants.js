// Floor variants (CONTRACT R5.10): every dungeon floor gets map.variant + map.floorName, chosen from its theme's pool by
// depth band. Pure data + one picker; the engine renders palette/light/ambient, the world team only decides which.
// Field reference lives in docs/handover/world-team-notes.md.
(function () {
  'use strict';
  const G = window.G;
  const W = G.world = G.world || {};

  const P = function (kind, color, density) { return { kind, color, density }; };
  // pal(tint, amount, saturation, brightness, accent, liquid)
  const pal = function (tint, tintAmount, saturation, brightness, accent, liquid) {
    return { tint, tintAmount, saturation, brightness, accent, liquid: liquid || null };
  };
  // lit(color, radius, torch, torchRadius, flicker)
  const lit = function (color, radius, torch, torchRadius, flicker) { return { color, radius, torch, torchRadius, flicker }; };
  // amb(darkness, fog, fogColor, particles, sound)
  const amb = function (darkness, fog, fogColor, particles, sound) { return { darkness, fog, fogColor, particles, sound }; };

  // min/max = depth range the variant may appear in; w = weight; layouts = [[layoutId, weight]];
  // lm = landmark weight multipliers; decor = optional prop-pool override for populate.
  const V = [
    // ---- crypt (depth 1-5) ----------------------------------------------------------------------------------
    { id: 'restless_graves', name: 'Restless Graves', theme: 'crypt', min: 1, max: 4, w: 3,
      layouts: [['ossuary_halls', 3], ['collapsed_catacomb', 1]],
      names: ['The Restless Graves', 'Graveyard Under the Hill', 'The Quiet Dead'],
      palette: pal('#8aa0c8', 0.22, 0.9, 1.0, '#9fd0ff'), light: lit('#ffd9a0', 1.0, '#ff9a3c', 1.0, 0.5),
      ambient: amb(0.1, 0.12, '#1a2030', P('dust', '#9aa6c0', 0.25), 'wind') },
    { id: 'forgotten_cellars', name: 'Forgotten Cellars', theme: 'crypt', min: 1, max: 3, w: 2,
      layouts: [['collapsed_catacomb', 2], ['ossuary_halls', 1]],
      names: ['The Forgotten Cellars', 'Under the Abbey', 'The Wine of the Dead'],
      palette: pal('#b08a5a', 0.25, 0.85, 1.0, '#ffc070'), light: lit('#ffcf8a', 1.05, '#ff8a2b', 1.0, 0.6),
      ambient: amb(0.12, 0.1, '#241a10', P('dust', '#b89a70', 0.3), 'drip'),
      lm: { chained_arena: 0.5, bone_garden: 0.5 } },
    { id: 'ossuary', name: 'Ossuary', theme: 'crypt', min: 2, max: 5, w: 3,
      layouts: [['ossuary_halls', 2], ['collapsed_catacomb', 1]],
      names: ['The Ossuary of Whispers', 'Hall of Ten Thousand Bones', 'The Bone Reliquary'],
      palette: pal('#d8d0a8', 0.3, 0.75, 1.05, '#fff2b0'), light: lit('#fff0c8', 0.95, '#ffe08a', 0.9, 0.35),
      ambient: amb(0.15, 0.15, '#2a281c', P('dust', '#e8e0c0', 0.35), 'whisper'),
      lm: { bone_garden: 3 }, decor: { soft: ['bones', 'bones', 'bones'], solid: ['tombstone', 'pillar'] } },
    { id: 'drowned_vaults', name: 'Drowned Vaults', theme: 'crypt', min: 3, max: 5, w: 3,
      layouts: [['flooded_crypt', 3], ['ossuary_halls', 1]],
      names: ['The Drowned Ossuary', 'Vaults of the Weeping Tide', 'The Sunken Crypt'],
      palette: pal('#4fb8b0', 0.3, 0.95, 0.95, '#5ff0e0', '#1f7f86'), light: lit('#c8fff4', 0.9, '#6fe0d0', 1.0, 0.3),
      ambient: amb(0.2, 0.3, '#0c2428', P('bubble', '#8ff0e8', 0.35), 'drip'),
      lm: { flooded_crypt: 4 } },
    { id: 'gravelord_approach', name: "Gravelord's Approach", theme: 'crypt', min: 5, max: 5, w: 3,
      layouts: [['ossuary_halls', 2], ['collapsed_catacomb', 1], ['flooded_crypt', 1]],
      names: ['The Gravelord’s Approach', 'Throne of Ash and Bone', 'Procession of the Dead'],
      palette: pal('#7a3a9a', 0.35, 0.8, 0.85, '#d070ff'), light: lit('#e0b0ff', 0.9, '#b060ff', 1.1, 0.7),
      ambient: amb(0.3, 0.25, '#180a24', P('mote', '#c080ff', 0.4), 'hum') },

    // ---- caves (depth 6-10) ---------------------------------------------------------------------------------
    { id: 'mossy_caverns', name: 'Mossy Caverns', theme: 'caves', min: 6, max: 10, w: 3,
      layouts: [['caverns', 3], ['warrens', 1]],
      names: ['The Mossy Caverns', 'Hollow Under the Roots', 'The Green Dark'],
      palette: pal('#6ca860', 0.28, 1.0, 0.95, '#9fff7a'), light: lit('#e8ffd0', 1.0, '#ffb45a', 1.0, 0.5),
      ambient: amb(0.15, 0.18, '#10201a', P('spore', '#b8ff8a', 0.3), 'drip') },
    { id: 'fungal_warrens', name: 'Fungal Warrens', theme: 'caves', min: 6, max: 9, w: 3,
      layouts: [['warrens', 3], ['caverns', 1]],
      names: ['The Fungal Warrens', 'Where the Spores Sing', 'The Glowcap Maze'],
      palette: pal('#7a5ad0', 0.3, 1.1, 0.9, '#d070ff'), light: lit('#e8d8ff', 0.85, '#b080ff', 1.0, 0.4),
      ambient: amb(0.28, 0.25, '#140c28', P('spore', '#e090ff', 0.55), 'whisper'),
      decor: { glow: 'crystal' } },
    { id: 'crystal_lake', name: 'Crystal Lake', theme: 'caves', min: 7, max: 10, w: 3,
      layouts: [['underground_lake', 3], ['caverns', 1]],
      names: ['The Crystal Lake', 'Mirror Water', 'The Still Deep'],
      palette: pal('#5a9ae0', 0.28, 1.0, 1.0, '#7fd8ff', '#2a74c0'), light: lit('#d0ecff', 1.05, '#80d0ff', 1.0, 0.3),
      ambient: amb(0.18, 0.2, '#0c1a2c', P('mote', '#a8e0ff', 0.3), 'chime'),
      lm: { crystal_grotto: 3 } },
    { id: 'amber_hollows', name: 'Amber Hollows', theme: 'caves', min: 6, max: 8, w: 2,
      layouts: [['caverns', 2], ['underground_lake', 1], ['warrens', 1]],
      names: ['The Amber Hollows', 'Honeyed Stone', 'The Sleeping Hive'],
      palette: pal('#c8883a', 0.3, 0.95, 1.0, '#ffb347'), light: lit('#ffe0a0', 1.1, '#ff8a2b', 1.0, 0.45),
      ambient: amb(0.1, 0.1, '#241608', P('dust', '#d8b070', 0.3), 'wind') },

    // ---- inferno (depth 11-15) ------------------------------------------------------------------------------
    { id: 'smouldering_halls', name: 'Smouldering Halls', theme: 'inferno', min: 11, max: 14, w: 3,
      layouts: [['broken_halls', 3], ['ash_fields', 1]],
      names: ['The Smouldering Halls', 'Cinder Court', 'The Burning Nave'],
      palette: pal('#e06a3a', 0.28, 1.05, 0.95, '#ff8a2b', '#ff5a1e'), light: lit('#ffc890', 1.0, '#ff6a1e', 1.1, 0.8),
      ambient: amb(0.12, 0.2, '#2a0c06', P('ember', '#ff9a40', 0.4), 'crackle') },
    { id: 'magma_flows', name: 'Magma Flows', theme: 'inferno', min: 12, max: 15, w: 3,
      layouts: [['magma_flows', 3], ['broken_halls', 1]],
      names: ['The Magma Flows', 'Rivers of the Earth’s Blood', 'The Molten Reach'],
      palette: pal('#ff4a1e', 0.32, 1.15, 1.05, '#ffcf4a', '#ff7a1e'), light: lit('#ffd8a0', 1.05, '#ff8a2b', 1.2, 0.7),
      ambient: amb(0.1, 0.28, '#3a1004', P('ember', '#ffb050', 0.6), 'rumble'),
      lm: { collapsed_bridge: 3 } },
    { id: 'ash_wastes', name: 'Ash Wastes', theme: 'inferno', min: 11, max: 15, w: 3,
      layouts: [['ash_fields', 3], ['broken_halls', 1]],
      names: ['The Ash Wastes', 'Field of Grey Snow', 'The Cold Hearth'],
      palette: pal('#a09a98', 0.35, 0.5, 0.9, '#ff6a3a'), light: lit('#ffe0d0', 0.95, '#e86a4a', 1.0, 0.5),
      ambient: amb(0.2, 0.35, '#2a2624', P('ash', '#cfc8c4', 0.6), 'wind'),
      lm: { pyre_court: 3 } },
    { id: 'forgeworks', name: 'Forgeworks', theme: 'inferno', min: 13, max: 15, w: 3,
      layouts: [['broken_halls', 2], ['magma_flows', 1]],
      names: ['The Forgeworks', 'Anvil of the Damned', 'The Furnace Ward'],
      palette: pal('#ffa84a', 0.25, 1.0, 1.0, '#ffe08a', '#ff9a2a'), light: lit('#fff0c0', 1.1, '#ffb040', 1.0, 0.6),
      ambient: amb(0.1, 0.15, '#2a1808', P('ember', '#ffd080', 0.5), 'crackle'),
      lm: { forge_island: 4 } },

    // ---- abyss (depth 16+; 21+ blends the other themes in) ---------------------------------------------------
    { id: 'starless_isles', name: 'Starless Isles', theme: 'abyss', min: 16, max: 28, w: 3,
      layouts: [['floating_chambers', 3], ['scattered_isles', 2]],
      names: ['The Starless Isles', 'Islands in Nothing', 'The Floating Dark'],
      palette: pal('#5a4ad0', 0.3, 1.0, 0.85, '#9a8aff'), light: lit('#d8d0ff', 0.9, '#8a7aff', 1.0, 0.4),
      ambient: amb(0.3, 0.3, '#0a0820', P('mote', '#a090ff', 0.4), 'whisper') },
    { id: 'shattered_spire', name: 'Shattered Spire', theme: 'abyss', min: 16, max: 30, w: 3,
      layouts: [['shattered_spire', 3], ['floating_chambers', 1]],
      names: ['The Shattered Spire', 'Crown of Broken Stone', 'The Ring of Ruin'],
      palette: pal('#8a5ac8', 0.3, 1.0, 0.9, '#c890ff'), light: lit('#e8d0ff', 0.95, '#b080ff', 1.0, 0.45),
      ambient: amb(0.28, 0.35, '#120a28', P('rune', '#d0a0ff', 0.4), 'hum') },
    { id: 'glasswork_drift', name: 'Glasswork Drift', theme: 'abyss', min: 16, max: 26, w: 2,
      layouts: [['scattered_isles', 2], ['floating_chambers', 1]],
      names: ['The Glasswork Drift', 'Shards Without a Sky', 'The Prism Dark'],
      palette: pal('#5ad0c8', 0.3, 1.05, 0.9, '#80fff0'), light: lit('#d0fff8', 1.0, '#70f0e0', 1.0, 0.3),
      ambient: amb(0.26, 0.25, '#08201e', P('mote', '#a0fff0', 0.45), 'chime'),
      lm: { crystal_grotto: 3 }, decor: { solid: ['crystal', 'crystal', 'pillar'] } },
    // deep-only: these never appear above depth 20 (the first abyss floors are 16-20)
    { id: 'fallen_cathedral', name: 'Fallen Cathedral', theme: 'abyss', min: 21, max: 999, w: 3, blend: { theme: 'crypt', amount: 0.5 },
      layouts: [['fallen_cathedral', 3], ['shattered_spire', 1]],
      names: ['The Fallen Cathedral', 'Nave of the Last Prayer', 'Where the Crypt Fell'],
      palette: pal('#7a6a98', 0.35, 0.7, 0.85, '#e0c0ff'), light: lit('#e8d8ff', 0.9, '#a070ff', 1.0, 0.5),
      ambient: amb(0.3, 0.3, '#140c1c', P('dust', '#b0a0c8', 0.4), 'hum'),
      lm: { bone_garden: 3, chained_arena: 2 }, decor: { solid: ['tombstone', 'pillar', 'pillar'], soft: ['bones'] } },
    { id: 'cinder_drift', name: 'Cinder Drift', theme: 'abyss', min: 21, max: 999, w: 3, blend: { theme: 'inferno', amount: 0.5 },
      layouts: [['cinder_isles', 3], ['floating_chambers', 1]],
      names: ['The Cinder Drift', 'Embers Over Nothing', 'The Burning Fall'],
      palette: pal('#b04a5a', 0.35, 1.0, 0.9, '#ff6a4a', '#ff4a2a'), light: lit('#ffc0a0', 1.1, '#ff5a3a', 1.1, 0.8),
      ambient: amb(0.3, 0.3, '#200810', P('ember', '#ff7a50', 0.5), 'crackle'),
      lm: { pyre_court: 3, forge_island: 2 }, decor: { solid: ['pillar', 'campfire'], glow: 'campfire' } },
    { id: 'overgrown_dark', name: 'Overgrown Dark', theme: 'abyss', min: 21, max: 999, w: 3, blend: { theme: 'caves', amount: 0.5 },
      layouts: [['hollow_grove', 3], ['scattered_isles', 1]],
      names: ['The Overgrown Dark', 'Roots Without a Ceiling', 'The Hanging Grove'],
      palette: pal('#4a9a7a', 0.32, 0.9, 0.85, '#7affb0', '#1f7a60'), light: lit('#c8ffe0', 0.9, '#70ffb0', 1.0, 0.4),
      ambient: amb(0.3, 0.3, '#08201a', P('spore', '#9affc0', 0.5), 'drip'),
      lm: { crystal_grotto: 2, flooded_crypt: 0 } },
    { id: 'unmaking', name: 'The Unmaking', theme: 'abyss', min: 31, max: 999, w: 4, blend: { theme: 'crypt', amount: 0.35 },
      layouts: [['fallen_cathedral', 1], ['cinder_isles', 1], ['hollow_grove', 1], ['shattered_spire', 1]],
      names: ['The Unmaking', 'Where Maps Come Undone', 'The Wrong Place'],
      palette: pal('#c040a0', 0.4, 1.2, 0.8, '#ff60d0', '#a02080'), light: lit('#ffd0f0', 0.8, '#ff40c0', 1.0, 0.9),
      ambient: amb(0.4, 0.4, '#200818', P('rune', '#ff80e0', 0.6), 'whisper'),
      lm: { bone_garden: 2, chained_arena: 3, collapsed_bridge: 2 } },
    { id: 'pale_end', name: 'The Pale End', theme: 'abyss', min: 41, max: 999, w: 5, blend: { theme: 'caves', amount: 0.25 },
      layouts: [['scattered_isles', 1], ['shattered_spire', 1], ['hollow_grove', 1]],
      names: ['The Pale End', 'Bleached Nothing', 'The White Below'],
      palette: pal('#e8e8f0', 0.45, 0.2, 1.1, '#ffffff', '#c8d0e8'), light: lit('#ffffff', 0.75, '#e0e8ff', 1.0, 0.2),
      ambient: amb(0.45, 0.5, '#c8ccd8', P('snow', '#ffffff', 0.6), 'silence'),
      lm: { chained_arena: 3, collapsed_bridge: 3 } },
  ];

  W.VARIANTS = V;
  // Layout each theme falls back to if its variant layout keeps failing validation.
  W.DEFAULT_LAYOUT = { crypt: 'ossuary_halls', caves: 'caverns', inferno: 'broken_halls', abyss: 'floating_chambers' };

  const PART = { dust: 'mist', ember: 'ember', ash: 'ash', spore: 'spore', drip: 'drip', bubble: 'drip', mote: 'motes', snow: 'snow', rune: 'void', none: 'none' };
  const SOUND = { wind: 'wind', hum: 'drone', drip: 'drip', crackle: 'fire', whisper: 'choir', rumble: 'heart', chime: 'water', silence: 'none' };
  const clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  // Deterministic: depends only on (depth, seed). Returns { variant, floorName, def }.
  W.pickVariant = function (depth, seed) {
    const rng = G.rng.create(((seed >>> 0) ^ 0x5A110F) >>> 0 || 1);
    const theme = G.C.themeForDepth(depth);
    let pool = V.filter(function (v) { return v.theme === theme && depth >= v.min && depth <= v.max; });
    if (!pool.length) pool = V.filter(function (v) { return v.theme === theme; });
    if (W._force && W._force.variant) pool = V.filter(function (v) { return v.id === W._force.variant; });     // test hook
    const def = rng.weighted(pool);
    const layout = (W._force && W._force.layout) || rng.weighted(def.layouts.map(function (l) { return { w: l[1], id: l[0] }; })).id;
    const floorName = rng.pick(def.names);
    // Shapes follow what the engine reads (engine-r5-shapes.md): palette.amount, light.radius in tiles, engine particle/sound names.
    const pa = def.palette, li = def.light, am = def.ambient;
    const variant = {
      id: def.id, name: def.name, layout,
      palette: { tint: pa.tint, amount: pa.tintAmount, saturation: pa.saturation, brightness: pa.brightness, accent: pa.accent, liquid: pa.liquid },
      light: { color: li.color, radius: Math.round(7 * li.radius * 10) / 10, ambient: am.fogColor, torch: li.torch, torchRadius: li.torchRadius, flicker: li.flicker },
      ambient: { particles: PART[am.particles.kind], density: Math.round(am.particles.density * 4) / 2, color: am.particles.color, fog: am.fog, darkness: am.darkness, sound: SOUND[am.sound] },
      blend: def.blend ? clone(def.blend) : null,
    };
    return { variant, floorName, def };
  };
})();
