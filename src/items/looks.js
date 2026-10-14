// Loot & Economy — R5.9 visible gear: appearance families ("looks") and the Matched bonus.
// A family is an appearance line shared across slots and tiers, so a player can assemble one look. Each armour weight has three
// families per depth band (band 0 = item tiers 1-3, band 1 = tiers 4-6, band 2 = tiers 7-8); weapons and off-hands share their
// own weapon lines. Wearing helm + chest + gloves + boots of one family grants a small Matched bonus at 2 and 4 pieces.
// A few uniques have a family of their own, and set pieces wear their set's family (sets have set bonuses, not Matched).
// Items carry `item.look = { family, palette: { main, trim, accent } }`; the base type carries its default in `def.look`.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;

  const LOOKS = I.LOOKS = {};
  D.LOOK_SLOTS = ['helm', 'chest', 'gloves', 'boots'];
  D.LOOKS_BY = {};            // 'kind:band' -> [familyId]

  // m2 / m4: Matched bonus at 2 and 4 pieces (cumulative). Percent stats only, so the bonus never needs level scaling.
  // palette.glow (optional) marks families whose accent is emissive (embers, void light, frost); src/engine/gear.js reads it.
  // material: what the engine's rig should draw ('plate' | 'mail' | 'leather' | 'cloth' | 'bone'), from the family's kind.
  const GLOW = { ash_plate: 1, cinder_king: 1, abyss_carapace: 1, cinderfox: 1, emberhymn: 1, voidweave: 1, starless: 1, emberforged: 1, abyssal: 1,
    starfallen: 1, juggernaut: 1, lich_emperor: 1, cinderlord: 1, rimewalkers: 1, cinderweave: 1 };
  const MATERIAL = { heavy: 'plate', light: 'leather', cloth: 'cloth' };
  const MATERIAL_OF = { rusted_mail: 'mail', chainpriest: 'mail', ossuary: 'bone', juggernaut: 'plate', ironbound: 'plate', shadowstep: 'leather',
    nightstalker: 'leather', rimewalkers: 'leather', pale_king: 'cloth', archmagi: 'cloth', lich_emperor: 'bone', cinderlord: 'cloth', cinderweave: 'cloth',
    gravecaller: 'cloth' };
  function L(id, kind, band, name, main, trim, accent, desc, m2, m4) {
    const palette = { main: main, trim: trim, accent: accent };
    if (GLOW[id]) palette.glow = accent;
    LOOKS[id] = { id: id, kind: kind, band: band, name: name, palette: palette, desc: desc };
    const mat = MATERIAL_OF[id] || MATERIAL[kind];
    if (mat) LOOKS[id].material = mat;
    if (m2) LOOKS[id].matched = { 2: m2, 4: m4 };
    else LOOKS[id].noMatch = true;
    if (band >= 0) (D.LOOKS_BY[kind + ':' + band] || (D.LOOKS_BY[kind + ':' + band] = [])).push(id);
  }

  // ---- heavy ----
  L('rusted_mail', 'heavy', 0, 'Rusted Mail', '#7a5a44', '#4a3a2e', '#c26a3a', 'Pitted ring-mail with rust blooming at every joint; a dented kettle helm.',
    [['resAll', 3]], [['block', 4], ['dmgPct', 5]]);
  L('gravewarden', 'heavy', 0, 'Gravewarden', '#8a7a4a', '#3e5a4a', '#7fc8a0', 'Tarnished bronze scales gone green, a crypt-guard tabard, a grilled visor.',
    [['resPoison', 10]], [['lifeSteal', 1], ['dmgPct', 5]]);
  L('tallow_iron', 'heavy', 0, 'Tallow-Iron', '#9aa3ad', '#e8dcb0', '#ff9a3c', 'Emberfall militia plate, wax-stained from the candle vigils; a stub of candle on the helm.',
    [['resFire', 10]], [['critDmg', 10], ['block', 3]]);
  L('ash_plate', 'heavy', 1, 'Ash Plate', '#3a3636', '#6a6260', '#ff6a2a', 'Soot-black plate with ember-orange seams that glow faintly when struck.',
    [['resFire', 12]], [['dmgPct', 8], ['resAll', 4]]);
  L('bellfounder', 'heavy', 1, "Bellfounder's", '#b8862a', '#5a3a1a', '#ffe08a', 'Thick cast bronze ridged like a church bell; the helm is a bell with a slit.',
    [['block', 5]], [['resAll', 6], ['attackSpeed', 4]]);
  L('chainpriest', 'heavy', 1, 'Chainpriest', '#5a5a66', '#8a1a22', '#c8c8d0', 'Iron plates hung on chains over red penitent cloth; padlocks for buckles.',
    [['lifeSteal', 1]], [['dmgPct', 8], ['critChance', 2]]);
  L('pallbearer', 'heavy', 2, 'Pallbearer', '#e0dccb', '#1e1c22', '#b8a060', 'Bleached white enamel over black iron, coffin-nail rivets, a mourning veil under the helm.',
    [['resAll', 6]], [['dmgPct', 10], ['cdr', 4]]);
  L('cinder_king', 'heavy', 2, 'Cinderking', '#2a1a16', '#d9a63a', '#ff5b2b', 'Charred plate split by molten-gold seams; a crown of cooling slag.',
    [['resFire', 15]], [['dmgPct', 10], ['critDmg', 15]]);
  L('abyss_carapace', 'heavy', 2, 'Abyss Carapace', '#2a2238', '#6a4a9a', '#b98cff', 'Overlapping chitin plates with a violet oil-sheen; a mandibled helm.',
    [['resPoison', 15]], [['block', 6], ['lifeSteal', 2]]);

  // ---- light ----
  L('grave_wrap', 'light', 0, 'Grave Wraps', '#8a7e66', '#4a3a2a', '#a8a08a', 'Burial linen bound tight with leather thongs, mud to the knee.',
    [['resPoison', 10]], [['dodge', 3], ['moveSpeed', 4]]);
  L('ratcatcher', 'light', 0, 'Ratcatcher', '#6e5a44', '#3a2e24', '#c8b070', 'Patched leathers, a belt of tails, a wide-brimmed hood.',
    [['goldFind', 10]], [['attackSpeed', 4], ['magicFind', 6]]);
  L('mosshide', 'light', 0, 'Mosshide', '#4f6a3a', '#3a2e1e', '#9ac860', 'Damp hide grown over with cave moss; it smells of wet stone.',
    [['resPoison', 8]], [['dodge', 3], ['critChance', 2]]);
  L('hollowmoth', 'light', 1, 'Hollowmoth', '#7a7062', '#4a4238', '#d8d0b0', 'Dust-grey leathers with a moth-wing capelet that sheds powder when you run.',
    [['dodge', 3]], [['moveSpeed', 5], ['critDmg', 12]]);
  L('cinderfox', 'light', 1, 'Cinderfox', '#a8542a', '#3a2418', '#ffd08a', 'Rust-red fox fur over scorched leather; a fox-mask hood.',
    [['resFire', 12]], [['attackSpeed', 5], ['critChance', 2]]);
  L('nightjar', 'light', 1, 'Nightjar', '#2a3048', '#1a1a24', '#8fa8ff', 'Midnight-blue leather fletched with dark feathers; silent at the seams.',
    [['moveSpeed', 4]], [['dodge', 4], ['critChance', 3]]);
  L('sallowskin', 'light', 2, 'Sallowskin', '#d8cc98', '#6a5a3a', '#f0e8c0', 'Pale yellowed hide from something that lived without sun. It is still slightly warm.',
    [['magicFind', 8]], [['dodge', 4], ['critDmg', 18]]);
  L('wyrmscale', 'light', 2, 'Wyrmscale', '#2a3a2a', '#0e1a12', '#7be04a', 'Oily green-black scales stitched with sinew; a frilled hood.',
    [['resAll', 5]], [['attackSpeed', 6], ['dmgPct', 8]]);
  L('veilrunner', 'light', 2, 'Veilrunner', '#9aa4b0', '#4a5260', '#e8f4ff', 'Grey gauze over fitted leather, half-transparent at the edges, like smoke.',
    [['dodge', 4]], [['moveSpeed', 6], ['critChance', 3]]);

  // ---- cloth ----
  L('candlewick', 'cloth', 0, 'Candlewick', '#e0d8c0', '#4a3a2a', '#ffb347', 'Wax-white vestments, soot at the hem, wick-cord at the cuffs.',
    [['resFire', 8]], [['castSpeed', 4], ['skillDmgPct', 5]]);
  L('penitent', 'cloth', 0, 'Penitent', '#8a7a5a', '#5a4a32', '#c8b890', 'Hessian sackcloth, knotted rope belt, a hood pulled low.',
    [['resAll', 3]], [['cdr', 3], ['skillDmgPct', 5]]);
  L('ossuary', 'cloth', 0, 'Ossuary Linen', '#b8b2a0', '#5a5448', '#e8e0c8', 'Grey linen strung with knucklebone beads; a skull-cap under the cowl.',
    [['resPoison', 10]], [['skillDmgPct', 6], ['manaSteal', 1]]);
  L('ashen_choir', 'cloth', 1, 'Ashen Choir', '#6a6668', '#8a1a22', '#e8dcc8', 'Ash-grey choir robes with blood-red stoles and a high collar.',
    [['castSpeed', 4]], [['skillDmgPct', 8], ['resAll', 4]]);
  L('starless', 'cloth', 1, 'Starless Silk', '#1e2448', '#9aa8c8', '#e8f0ff', 'Deep navy silk embroidered with silver constellations that do not exist.',
    [['resLightning', 12]], [['critChance', 3], ['cdr', 4]]);
  L('rookmask', 'cloth', 1, 'Rookmask', '#1a1a1e', '#4a4440', '#c8a060', 'Black waxed cloth, a beaked plague cowl, brass spectacles.',
    [['resPoison', 12]], [['skillDmgPct', 8], ['castSpeed', 4]]);
  L('pale_court', 'cloth', 2, 'Pale Court', '#ece6d6', '#c8a040', '#ffffff', 'Ivory court robes trimmed in gold, a tall collar, a face-veil of pearls.',
    [['resAll', 6]], [['skillDmgPct', 10], ['cdr', 5]]);
  L('voidweave', 'cloth', 2, 'Voidweave', '#1a1028', '#5a2f8a', '#d0a0ff', 'Black-violet cloth that seems to fold inward; pinpricks of light drift across it.',
    [['resCold', 15]], [['castSpeed', 6], ['critChance', 3]]);
  L('emberhymn', 'cloth', 2, 'Emberhymn', '#8a1a1a', '#d9bd6a', '#ff8a2b', 'Crimson vestments stitched with gold flame-hymns; the hem smoulders.',
    [['resFire', 15]], [['skillDmgPct', 10], ['critDmg', 15]]);

  // ---- weapons & off-hands (no Matched bonus; they show in the hands) ----
  L('pitted_iron', 'weapon', 0, 'Pitted Iron', '#8d7b68', '#5a4632', '#c26a3a', 'Old iron with a pitted face and a leather-wrapped grip.');
  L('bonecarved', 'weapon', 0, 'Bonecarved', '#d9d4c0', '#6b6455', '#8a1a22', 'Grips, hafts and guards carved from yellowed bone.');
  L('hearthwood', 'weapon', 0, 'Hearthwood', '#7a5a3a', '#3a2a1e', '#ffb347', 'Dark oak scorched by the hearth, banded with copper.');
  L('blackiron', 'weapon', 1, 'Blackiron', '#2e2e34', '#6a6a78', '#c8d0e0', 'Blued black iron with bright-ground edges.');
  L('gravesilver', 'weapon', 1, 'Gravesilver', '#c0c4cc', '#3a3a48', '#7fd4ff', 'Tarnished silver etched with funeral prayers.');
  L('emberforged', 'weapon', 1, 'Emberforged', '#5a2a1a', '#d9a63a', '#ff6a2a', 'Quenched in the Emberfall forge; the fuller still glows.');
  L('pallid', 'weapon', 2, 'Pallid', '#e8e2cc', '#8a8070', '#f8f4e0', 'Bleached to the colour of old teeth. It drinks the light around it.');
  L('abyssal', 'weapon', 2, 'Abyssal', '#1a1028', '#6a4a9a', '#b98cff', 'Something grown, not forged: ridged, violet-black, faintly breathing.');
  L('starfallen', 'weapon', 2, 'Starfallen', '#3a4a6a', '#c8d8ff', '#fff06a', 'Meteoric metal, cold to the touch, flecked with light.');

  // ---- unique families (one item each) ----
  L('juggernaut', 'unique', -1, 'Juggernaut', '#4a4a58', '#2a2a30', '#ff5b2b', 'A walking wall: slab plate, a furnace-grille visor.');
  L('shadowstep', 'unique', -1, 'Shadowstep', '#2a2a3a', '#1a1a22', '#8a5fd0', 'Leather that blurs at the edges like a shadow cast twice.');
  L('pale_king', 'unique', -1, 'Pale King', '#c8c8d8', '#5a2f8a', '#e8e0ff', 'Grave-clothes of a twice-buried king, frost-white and violet.');
  L('archmagi', 'unique', -1, 'Archmagi', '#d9bd6a', '#2a2a6a', '#5b8cff', 'A tall gold crown-cowl with seven blue stones, one cracked.');
  L('lich_emperor', 'unique', -1, 'Lich Emperor', '#e8e0c8', '#2a1a22', '#ff3b4e', 'A bone crown fused to a hood; red light where eyes should be.');
  L('cinderlord', 'unique', -1, 'Cinderlord', '#ff5b2b', '#2a1a16', '#ffe45b', 'A mantle of living embers over a charred robe.');
  L('rimewalkers', 'unique', -1, 'Rimewalkers', '#d8f4ff', '#6a8aa8', '#ffffff', 'Boots rimed in frost that never melts; ice crystals trail behind.');

  // ---- set families: set pieces always look like their set ----
  L('ironbound', 'set', -1, 'Ironbound', '#7a8494', '#3a3e48', '#3ddc6a', 'Riveted iron bands over grey steel, green oath-ribbons.');
  L('nightstalker', 'set', -1, 'Nightstalker', '#3a3350', '#1a1828', '#3ddc6a', 'Dark violet leathers, a hunting mask, green glass eyes.');
  L('cinderweave', 'set', -1, 'Cinderweave', '#c84a2a', '#3a1a12', '#ffd08a', 'Orange-red robes woven with cinder thread.');
  L('gravecaller', 'set', -1, 'Gravecaller', '#4a5a4a', '#1e241e', '#9ac860', 'Moss-green shroud, a skull-cap, grave-dirt to the elbow.');

  // Unique ids with a family of their own; sets map setId -> family.
  const UNIQUE_LOOK = { juggernaut: 'juggernaut', shadowstep: 'shadowstep', pale_king: 'pale_king', archmagi: 'archmagi',
    lich_emperor: 'lich_emperor', cinderlord: 'cinderlord', rimewalkers: 'rimewalkers' };

  // Which family kind a base type wears. Jewellery has no look.
  D.lookKind = function (def) {
    if (!def) return null;
    if (def.type === 'weapon' || def.slot === 'offhand') return 'weapon';
    if (def.armorClass) return def.armorClass;
    if (def.slot === 'belt') return 'light';
    return null;
  };
  D.lookBand = function (tier) { return tier <= 2 ? 0 : tier <= 5 ? 1 : 2; };

  function lookOf(family, palette) {
    const f = LOOKS[family];
    const p = palette || f.palette;
    const look = { family: family, palette: { main: p.main, trim: p.trim, accent: p.accent } };
    if (f.palette.glow) look.palette.glow = p.accent;
    if (f.material) look.material = f.material;
    return look;
  }
  D.lookOf = lookOf;

  // Default look of every weapon / armour base: the first family of its kind in its band.
  for (const id in D.BASES) {
    const def = D.BASES[id];
    const kind = D.lookKind(def);
    if (kind) def.look = lookOf(D.LOOKS_BY[kind + ':' + D.lookBand(def.tier)][0]);
  }

  // Look for a freshly rolled item: any family of its kind and band, sometimes one from the band below so a favourite early
  // look keeps turning up deeper. -> { family, palette } | undefined
  D.rollLook = function (def, rng) {
    const kind = D.lookKind(def);
    if (!kind) return undefined;
    let band = D.lookBand(def.tier);
    if (band > 0 && rng.chance(0.15)) band--;
    return lookOf(rng.pick(D.LOOKS_BY[kind + ':' + band]));
  };

  function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  // Uniques: own family, set family, or (deterministically) a regular family of their band tinted with the unique's colour.
  D.uniqueLook = function (u, def) {
    const kind = D.lookKind(def);
    if (!kind) return undefined;
    if (UNIQUE_LOOK[u.id]) return lookOf(UNIQUE_LOOK[u.id]);
    if (u.setId && LOOKS[u.setId]) return lookOf(u.setId);
    const list = D.LOOKS_BY[kind + ':' + D.lookBand(def.tier)];
    const f = LOOKS[list[hash(u.id) % list.length]];
    return lookOf(f.id, { main: u.color || f.palette.main, trim: f.palette.trim, accent: u.accent || f.palette.accent });
  };
  D.UNIQUE_LOOK = UNIQUE_LOOK;

  // Public: an item's look, falling back to its base default (items from before R5.9). null for jewellery / non-equipment.
  I.getLook = function (item) {
    if (!item) return null;
    if (item.look && LOOKS[item.look.family]) return item.look;
    const def = D.BASES[item.baseId];
    return (def && def.look) || null;
  };

  // Matched (R5.9): the family most represented across helm / chest / gloves / boots. -> { family, name, count, bonuses } | null
  D.matchedOf = function (eq) {
    const counts = {};
    let best = null;
    for (const s of D.LOOK_SLOTS) {
      const look = I.getLook(eq[s]);
      const f = look && LOOKS[look.family];
      if (!f || f.noMatch) continue;
      counts[f.id] = (counts[f.id] || 0) + 1;
      if (!best || counts[f.id] > counts[best]) best = f.id;
    }
    if (!best || counts[best] < 2) return null;
    const f = LOOKS[best], n = counts[best];
    const bonuses = f.matched[2].slice();
    if (n >= 4) for (const b of f.matched[4]) bonuses.push(b);
    return { family: best, name: f.name, count: n, bonuses: bonuses };
  };
  I.getMatched = function (pl) { return D.matchedOf((pl && pl.equipment) || {}); };
})();
