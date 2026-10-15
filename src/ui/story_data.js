// Campaign text (R7.7). PURE DATA: every player-facing story line lives here so the lead dev can rename people, places
// and items without touching logic. story.js plays it, quests.js tracks it. Read docs/STORY.md for the outline.
// Tokens filled at display time: {town} {rift} {Rift} {rot} {figure} {Figure} {king} {ember} (from NAMES), {boss} (the
// step's boss name from G.game.getMonsterInfo), {name} (the hero), {depth}.
// Tables in meta.STORY: NAMES OPENING ACTS STEPS FINALE PALLOR_INTRO BOSSES/BOSS_LINES ECHO ADVENTURERS (the Fallen)
// FALLEN_COMBINED CURATOR CAMP (camp NPC ids 'camp:<x>') SIDE (Elder side lines) VENDOR_QUESTS (R12.2, shape documented at the
// table) MILESTONES (R12.8 names, flavour and tier titles per counter) TOWN (revival stages) LORE.
(function () {
  'use strict';
  const G = window.G;
  const meta = G.meta = G.meta || {};

  const NAMES = {
    town: 'Emberdeep',
    rift: 'the rift', Rift: 'The rift',
    rot: 'the rot',
    figure: 'the man in grey', Figure: 'The man in grey',
    king: 'Oswin Marrow, the Hearthking',           // world boss fallback name (combat team's monster name wins)
    ember: 'the Ember',                             // the heart at the core
  };

  const TAGLINE = 'Something under {town} is rotting.';
  const TITLE = 'Bearer of the Ember';             // earned at the end of the campaign
  const OLD_TITLES = ['Warden of the Well', 'Warden of the Rift'];

  // ---------- opening (first arrival in town; plays once per hero) ----------
  const OPENING = {
    home: [
      'Three weeks guarding a salt caravan. You came home with the pay in your boot.',
      'Home was ash. The door kicked in. The well full of what used to be your neighbours.',
      'Nobody saw who did it. Nobody was left to see.',
      'In the next town a man in a grey hood found you before you found work. He knew your name. He gave you a note and walked away.',
    ],
    note: { title: 'The Note', text: 'Go to {town}. There is something under it that only you can mend.\nYou will be paid more than you lost.\nDo not look for me. I will find you.' },
    arrival: [
      '{town} sits in a bowl of black rock. Frost on every roof. No smoke from any chimney.',
      'A handful of people come out to stare at you. One of them starts to cry. It takes you a moment to understand she is glad.',
    ],
    elder: [
      'You came. Gods. Sit, if you can stand the cold.',
      'This town was built over a rift. It runs down further than anyone has walked. Thousands of miles, the old maps say.',
      'For three hundred years it breathed heat into our hearths and light into our lamps. We never cut wood. We never had to.',
      'This year the heat started to fade. What comes up instead is wrong. It smells of meat.',
      'We sent adventurers. Good ones. Most never came back. The ones who did will not go down again, and will not say why.',
      'There is no grain here, no timber, nothing to trade. Without the rift we are dead by midwinter.',
      'Go down. Find what is rotting it. Cleanse it, once and for all.',
      '...A note? From a man in grey?',
      'Nobody here sent for you. We had nothing left to send.',
    ],
  };

  // ---------- acts ----------
  // intro: narration on the first arrival at `from`; outro: after the Elder's lines for the step that ends the act.
  const ACTS = [
    { n: 1, name: 'The Shallows', from: 1, to: 10, endStep: 'main_4',
      intro: ['Act I · The Shallows', 'Old mine, then older crypt. The rot is thin here: mould on the bones, a sweetness in the air.', 'Things still die when you kill them. Mostly.'],
      outro: ['The Shallows go quiet behind you.', 'Up in {town} a chimney smokes for the first time in a month. Someone is singing, badly. Nobody tells him to stop.'] },
    { n: 2, name: 'The Deep', from: 11, to: 20, endStep: 'main_8',
      intro: ['Act II · The Deep', 'Below the tenth floor the rock sweats. The walls bend as if they were poured. The heat is real here, and it is sick: fever heat.', 'The missing adventurers got this far. You find their camps. You find what is left of them.'],
      outro: ['The fever breaks behind you. The Deep cools to a clean, honest warmth.', 'In {town} the market opens. Three stalls. Someone is selling bread made with real flour.', 'On the Elder\'s door, a grey note, nailed at eye height. One word: "Further."'] },
    { n: 3, name: 'Hellscape', from: 21, to: 30, endStep: 'main_12',
      intro: ['Act III · Hellscape', 'There is no rock any more. The floor is skin. The walls are teeth, or prayers, or both.', 'Nothing here was made for you to understand. Keep walking down.'],
      outro: null },                                 // the finale below is Act III's outro
    { n: 4, name: 'The Roots', from: 31, to: 0, after: 'finale',
      intro: ['Below the Hearthking', 'Roots of the thing the Ember belonged to, thick as rope, going down into a dark that is warm.', 'It is growing back. It always will be.'],
      outro: null },
  ];

  // ---------- main chain: Elder lines before (on accept) and after (on turn-in), keyed by quest id ----------
  const STEPS = {
    main_1: { before: ['Start shallow. The old mine, then the crypt we cut beneath it.', 'Reach the third floor and tell me what you see.'],
      after: ['Mould on the bones. A sweet smell. Yes.', 'It was like that the year my father died. The rot has been coming a long time. We only noticed when it got cold.'] },
    main_2: { before: ['Our crypt has a king now. {boss}. He was our priest, once.', 'He went down to bless the stair and came back crowned. He does not let our dead stay down.', 'Put him back in the ground.'],
      after: ['The bells rang by themselves when he fell.', 'Old Marta remembered her daughter\'s name this morning. Push the rot back and people come back with it.'] },
    main_3: { before: ['Under the crypt the stone goes wet. The water keeps the voices of whoever drowned in it.', 'Do not answer them. Reach the eighth floor.'],
      after: ['You answered, didn\'t you. I can see it on you.', 'Sleep with a lamp. The cold got worse while you were gone.'] },
    main_4: { before: ['{boss}. The miners called her Mother, before they stopped coming home.', 'She nests at the bottom of the Shallows, where the heat used to rise, and breeds on it.', 'Kill her and the Shallows are ours again.'],
      after: ['Three hearths caught last night. Three.', 'You did that. Go and look at them. You should see it.'] },
    main_5: { before: ['Below the tenth floor the heat is real again, but wrong. It cooks. It does not warm.', 'Our missing went that way. Find them, if there is anything to find.'],
      after: ['Camps. Bedrolls. Names scratched into the rock, then scratched out.', 'They did not die down there. That is the worst of it. They stayed.'] },
    main_6: { before: ['{boss} was the Keeper of Embers. He swore to hold the clean fire as long as we remembered him.', 'We forgot him. The rot did not. Now he sits on the fire and lets none of it rise.'],
      after: ['{Rift} breathed warm for an hour. Then the fever came back.', 'The fire was never the source. It leaks up from something further down.'] },
    main_7: { before: ['Past the fire the Deep goes quiet. Not empty. Listening.', 'I hear it in my sleep. It says your name, not mine. Reach the eighteenth floor.'],
      after: ['You came back. I did not think you would.', 'It knows you now. That is no comfort to either of us.'] },
    main_8: { before: ['{boss} is the floor of the Deep. We always called it a fallen star.', 'Sister Ada says it was never a star. She says it is an eye, and it has been watching us the whole time.', 'Put it out.'],
      after: ['The Deep cools behind you. Clean warmth.', 'There was a note nailed to my door this morning. Grey paper. You know who left it.'] },
    main_9: { before: ['I have no maps for what is under the Deep. Nobody came back to draw them.', 'Reach the twenty-third floor. Remember what you can stand to.'],
      after: ['You remember nothing. I see.', 'Eat something. You are thinner than when you left, and it has been two days.'] },
    main_10: { before: ['Something below sings. The whole town hears it at night now, through the floorboards.', 'Find the singer on the twenty-fifth floor. Stop the song.'],
      after: ['Quiet. The children slept through the night.', 'Tam saw the man in grey on the north road. He says he was smiling.'] },
    main_11: { before: ['Oswin Marrow founded {town}. Three hundred years ago he went down alone and came back with heat.', 'The founders\' book said he never came back at all. We burned that book one hard winter. I am sorry now.', 'Reach the twenty-eighth floor.'],
      after: ['A heartbeat. You felt it in the floor. So did we, up here.', 'Whatever is at the bottom is alive. Go and end it.'] },
    main_12: { before: ['At the core of {rift} is {boss}. Our founder. Our hearth. Our rot.', 'He bound himself to something down there so that we could be warm. He has paid for it for three hundred years. Now we pay.', 'Tear it out. All of it.'],
      after: ['Listen. {Rift} is breathing warm.', 'Children are shouting in the square. I had forgotten that sound.', 'Whatever you carried up with you, keep it close. And keep it away from me.'] },
  };

  // After the world boss (Act III's outro). Then Pallor switches on.
  const FINALE = [
    'The Hearthking comes apart like wet paper. Under him the Ember is still beating.',
    'It is the warmest thing you have ever touched. You do not remember picking it up.',
    'Far above, every hearth in {town} catches at once.',
    'The man in grey waits at the top of the stair. He bows to you, the way a servant bows to a new master.',
    '"It is still growing down there," he says. "It always will be. Someone has to carry the heart."',
    'The rift goes on below. Thousands of miles of it. The deeper floors are open.',
  ];

  // R5.2 Pallor, explained once after the finale: Pallor is the Ember feeding on its new carrier.
  const PALLOR_INTRO = [
    'Every floor you go down without coming home, the Ember drinks a little of your colour to feed what grows below. That is Pallor.',
    'The paler you are, the richer the deep pays, and the harder it bites. Some finds come back bleached, hiding something until you bring them home.',
    'Come home and the colour returns. Die pale, and the bleached things stay below with your corpse.',
  ];

  // ---------- act bosses (keyed by monsterId). Combat builds the fights; `name` is only a fallback for getMonsterInfo ----------
  // who / look / phases (hp % where each starts) are design notes for the combat team; intro + death are shown as banners.
  const BOSSES = {
    boss_gravelord: { name: 'Morgrath the Gravelord', act: 1, depth: 5,
      who: 'Father Morgrath, the town priest. He went down to bless the stair and the rot crowned him. He keeps a ledger of every death in {town} and will not let one of them stay buried.',
      look: 'Tall skeleton in rotted vestments; a crown of fused finger bones; a ledger chained to his wrist that turns its own pages.',
      phases: ['100% Sermon: slow axe sweeps. Each name he reads lights a grave; it raises a skeleton after 4 s unless you stand on it.',
        '50% The Count: the ledger opens and a ring of names circles the arena. Each second inside it adds a Named stack (+5% damage taken).',
        '20% Last Rites: the crown cracks. No more graves; he lunges along long telegraphed lines, three in a row.'],
      intro: 'Another name for the ledger.', death: 'The ledger burns. A hundred names go home.' },
    boss_broodmother: { name: 'Skarn the Broodmother', act: 1, depth: 10,
      who: '"Mother", to the miners she ate. She nests where the warm air used to rise and breeds on stolen heat.',
      look: 'A bloated spider with a miner\'s lantern grown into her abdomen; egg sacs glowing with warmth that was ours.',
      phases: ['100% Nest: she hangs from the roof and cannot be hit. Glowing egg sacs hatch every 10 s; pop them first. Web spit slows.',
        '60% Hungry: she drops and charges the warmest target (minions first, then the hero), leaving poison pools.',
        '25% Mother: she eats her own brood to heal 5% each. Kill the brood before she reaches it.'],
      intro: 'Warm. You are so warm.', death: 'Her brood scatters into the dark, cold and small.' },
    boss_tyrant: { name: 'Azgalor, the Ember Tyrant', act: 2, depth: 15,
      who: 'The Keeper of Embers, who swore to hold the clean fire for as long as the town remembered him. The town forgot. The rot promised he would be remembered forever.',
      look: 'An armoured demon in plate of cooling slag; the white clean-fire vein chained to his back like a stolen banner.',
      phases: ['100% Hoard: he heals while standing on the fire vein. Hit him from range and he chases you off it.',
        '50% Molten: the slag cracks. Fire lines rake the floor in a grid; stand in the gaps.',
        '20% The Promise: he roars the names of the townsfolk who forgot him; meteors fall on your position every second. Keep moving.'],
      intro: 'The fire is mine. They will remember me now.', death: 'The clean fire spills loose. For a moment the Deep is bright.' },
    boss_hollow: { name: 'Xal\'thuun, the Hollow Star', act: 2, depth: 20,
      who: 'The town calls it a fallen star. It was never a star. It is the dead giant\'s eye, rotted hollow: the quiet that listens.',
      look: 'A floating shell of cracked white light; something wet turns inside it and looks out.',
      phases: ['100% Gaze: a slow cone beam sweeps the room. Break line of sight behind pillars.',
        '55% Hollow: the shell splits; its inside pulls you to the centre while shards orbit. Dash outward.',
        '20% Blink: it closes and the room goes dark except your light. A rising whine marks where it reopens: behind you.'],
      intro: 'I see you. I have always seen you.', death: 'The eye goes dark. Far below, something turns over in its sleep.' },
    boss_choir: { name: 'The Choir', act: 3, depth: 25,
      who: 'Every voice the caves kept, every throat the rot took, knotted into one column of mouths on a spine of ribs. It sings the giant awake.',
      look: 'A swaying pillar of fused people, all mouths, on a spine of ribs; hair and hands drift around it like weed.',
      phases: ['100% Hymn: each note sends out a ring of sound; the rings alternate safe and harmful. Dodge on the beat.',
        '50% Discord: it splits into three singers. Only the one singing the wrong note (inverted colours) can be hurt.',
        '20% Last Verse: it rejoins and the song speeds up. Hit it while it swells to inhale and it falls silent for 3 s.'],
      intro: 'Sing with us. Everyone does, eventually.', death: 'The song breaks off mid-word. Up in {town}, every child wakes at once, and then sleeps.' },
    boss_world: { name: 'Oswin Marrow, the Hearthking', act: 3, depth: 30,
      who: 'Founder of {town}. He put the Ember in his own chest so the town could be warm. The dead giant has been growing back around him for three hundred years.',
      look: 'A gaunt old king on a throne of roots, chest open, the Ember beating inside; a cold crown of hearth-iron.',
      phases: ['100% The Founder: a tired, clean swordsman. Readable three-hit combos; dashing through a swing is rewarded.',
        '60% The Roots: roots tear him open. Root lashes erupt from the floor; the Ember pulses on a timer: burst it in the pulse.',
        '25% The Body: the giant itself. The floor inverts on each heartbeat; the man in grey counts your dashes aloud.'],
      intro: 'Three hundred years warm. Come closer. Take it from me.', death: 'The Hearthking comes apart. The Ember goes on beating.' },
  };
  const BOSS_LINES = {};
  Object.keys(BOSSES).forEach(function (k) { BOSS_LINES[k] = { intro: BOSSES[k].intro, death: BOSSES[k].death }; });
  const WORLD_BOSS_IDS = ['boss_world', 'boss_hearthking'];   // whichever id the combat team uses

  // ---------- R6.2 your Echo ----------
  const ECHO = {
    title: 'Echo of {name}',
    intro: 'It wears your face. It fights the way you fight.',
    death: 'Your echo comes apart. What you left behind is yours again.',
    deathScreen: 'What you left on depth {depth} will rise as your Echo. Kill it to win it back.',
    corpseNote: 'Die before you reach it and it rises as your Echo.',
    tracker: '☠ Your Echo waits: depth {depth}',
    trackerHere: '☠ Your Echo walks this floor',
  };

  // ---------- R7.6 / R7.10 the Fallen: ten corrupted former adventurers ----------
  // Every one was a candidate of the man in grey. He burned or bought out each of their lives, as he burned yours, and sent
  // them down to take the Ember from the Hearthking. They failed and the rot kept them. `id` = relic id in G.items.RELICS =
  // the entity's adventurerId (story.js banners). Spread: Act I 3/6/9, Act II 13/16/19, Act III 21/24/28, endgame 35.
  const ADVENTURERS = [
    { id: 'fallen_1', classId: 'warrior', depth: 3, name: 'Hob Garrow, the First Lamplighter',
      story: 'The town lamplighter, forty years ago. His family died in a house fire nobody could explain; a man in grey bought him a drink at the wake. He went down to light the stair for the town, and he is still lighting it.',
      corruption: 'His lamp has grown into his chest and the flame lives in his skull. He cannot stop lighting things.',
      fight: ['Lights braziers round the room; each lit brazier heals him. Walk through one to snuff it.',
        'A lamp-hook sweep with a long, glowing wind-up.',
        'When every brazier is out he goes dark and charges blind.'],
      relic: 'Garrow\'s Wick', relicText: 'A small light that will not go out: life regenerates.',
      intro: 'Mind the dark. Mind the dark.', death: 'His wick gutters out. The stair stays lit.' },
    { id: 'fallen_3', classId: 'ranger', depth: 6, name: 'Sefa Lind, the Ropewalker',
      story: 'A mountain guide whose hamlet burned the week she was away. The note said the rift had no bottom and a climber could name her price. She went down the shaft on a rope and counted the knots wrong.',
      corruption: 'She fell three hundred feet and the rot kept her alive. The rope grew through her. She still hangs from it.',
      fight: ['Swings between ceiling ropes and cannot be hit while swinging. Cut the anchor posts to bring her down.',
        'Fan volleys from above; the gaps are wide.',
        'Drops knotted snares that root you if you step in one.'],
      relic: 'The Last Knot', relicText: 'You always know where your feet are: faster movement.',
      intro: 'Ninety-eight. Ninety-nine. Where is a hundred?', death: 'She lets go. She finally reaches the bottom.' },
    { id: 'fallen_2', classId: 'warrior', depth: 9, name: 'Brannoc the Unbent',
      story: 'A sergeant whose free company was hired by a grey note "on behalf of the founders". He held the stair at the bottom of the Shallows so his company could run. He held it for forty days. Nobody came to relieve him.',
      corruption: 'His shield is fused to his arm and his feet are rooted to the stair.',
      fight: ['Blocks everything from the front. Get behind him.',
        'A shoulder charge with knockback, telegraphed by a lowered shield.',
        'Below half life he plants himself and the stair grows a ring of spikes around him.'],
      relic: 'Brannoc\'s Buckle', relicText: 'Your dash ends in a shield bash that staggers enemies.',
      intro: 'None pass. None. Pass.', death: 'He kneels at last. The stair is free.' },
    { id: 'fallen_5', classId: 'sorcerer', depth: 13, name: 'Odile Marr, the Salt Witch',
      story: 'A sea-witch from the drowned coast. The man in grey asked no gold for her passage, only her name. She paid. Down here nobody has a name for her.',
      corruption: 'Without a name the rot filled her with salt. She is a pillar of crust that weeps brine.',
      fight: ['Salt circles crystallise anyone standing still in them. Keep moving.',
        'Brine waves push you toward the walls.',
        'Every 15 s she forgets herself and shows her true face: she takes double damage for 3 s.'],
      relic: 'Odile\'s Name', relicText: 'You keep what she lost: more mana and mana regeneration.',
      intro: 'Do you know my name? Tell me my name.', death: 'Somewhere, someone remembers it for her.' },
    { id: 'fallen_4', classId: 'ranger', depth: 16, name: 'Wren Halloway, the Cartographer',
      story: 'Commissioned by a grey stranger to map the rift "for the founders\' heirs". She maps the Deep by counting steps. She is still counting.',
      corruption: 'Her arrows are cut from her own bones, and there is very little of her left.',
      fight: ['Never stops moving; strings snare lines across the lanes.',
        'Vanishes and fires from the dark; each arrow glints before it flies.',
        'Every 10 s she must stop and count: free damage.'],
      relic: 'Wren\'s Count', relicText: 'Dashing reloads a free shot, and the floor map opens on arrival.',
      intro: 'Four thousand and ten. Four thousand and eleven.', death: 'Her map unrolls across the floor. It goes much, much deeper.' },
    { id: 'fallen_6', classId: 'necromancer', depth: 19, name: 'Brother Ashby, the Penitent Sexton',
      story: 'The crypt chapel\'s bellringer. He rang the bell for every dead man until one night the dead rang back. The man in grey told him where the answer came from.',
      corruption: 'The bell has grown over his head like a helm. He hears nothing but its toll.',
      fight: ['Each toll raises ghosts that drift toward him; any that reach him heal him.',
        'Standing inside the bell ring (drawn on the floor) when it tolls stuns you.',
        'The tolls come faster as his life drops.'],
      relic: 'Ashby\'s Clapper', relicText: 'A dull bell that keeps the rot off: poison resistance and vitality.',
      intro: 'One for each. One for each. One for each.', death: 'The bell cracks through. Silence, at last, and it is kind.' },
    { id: 'fallen_7', classId: 'warrior', depth: 21, name: 'Corwin Dask, the Debt Collector',
      story: 'A bailiff hired by the man in grey to collect what the rift owed the founders\' heirs. He came to collect. The rift pays in kind.',
      corruption: 'Coins have grown into his skin like scales. He jingles when he breathes.',
      fight: ['His hits knock gold out of you onto the floor. Pick it up before he does.',
        'Coin barrage in straight lines.',
        'Foreclosure: he marks a zone that locks shut for 10 s. Do not be inside it.'],
      relic: 'Dask\'s Ledger', relicText: 'Every debt paid: more gold found and harder critical hits.',
      intro: 'You owe. Everyone owes.', death: 'The account is closed. Pick up your change.' },
    { id: 'fallen_8', classId: 'sorcerer', depth: 24, name: 'Magister Ilse Varr',
      story: 'She came to bottle the rift\'s heat and sell it in the south. Her first customer, a man in grey, ordered a thousand bottles. She drank the first to test it.',
      corruption: 'She is a furnace now, and still selling.',
      fight: ['Fire novas that grow larger with each cast.',
        'Bottles that burst late: watch where they land.',
        'Her own heat burns her over time: kite and wait.'],
      relic: 'Varr\'s Tincture', relicText: 'Fire damage ramps up the longer a fight lasts.',
      intro: 'A sample, friend? Very warming.', death: 'The last bottle cracks. For once, nothing burns.' },
    { id: 'fallen_9', classId: 'necromancer', depth: 28, name: 'Old Tobiah Crane',
      story: 'The town gravedigger. He saw soot on every body the man in grey left behind, and went down to fetch the dead the crypt-king stole. He found them. He would not leave them.',
      corruption: 'He is part of the heap of dead now. They move him as much as he moves them.',
      fight: ['Raises the corpses you left on this floor. Clean floors make him weak.',
        'Shovel slam: a long line, slow to land.',
        'Below 30% his dead pile onto him as a shield; break them one by one.'],
      relic: 'Crane\'s Spade', relicText: 'One more minion, and your kills cannot be raised against you.',
      intro: 'Back in the ground, all of you. In a moment.', death: 'His dead lie down with him, gently.' },
    { id: 'fallen_10', classId: 'ranger', depth: 35, name: 'Ivo Marrow, the Last Candidate',
      story: 'The Hearthking\'s own great-great-grandson, and the last pick before you. He went furthest: he reached the throne, was offered the Ember, and said no. He ran down into the roots instead.',
      corruption: 'Half root now. He is what you would have become if you had refused.',
      fight: ['Root-arrows sprout thorn walls that cut the room into lanes.',
        'He retreats through the roots; chase him across the arena.',
        'Refusal: he lowers his bow for 5 s. Leave him be and he fights cleanly; hit him and he enrages.'],
      relic: 'Ivo\'s Refusal', relicText: 'The strength to say no: more damage and experience.',
      intro: 'He sent you too? Run. Run while you can still say no.', death: 'He smiles. He never has to carry it now.' },
  ];
  // All ten relics laid in the founding hearth at the Elder's (R7.10).
  const FALLEN_COMBINED = {
    name: 'The Ten Who Went Before', title: 'Heir of the Fallen',
    why: 'Each of the ten was sent to carry the Ember and broke under it alone. Laid in the founding hearth together, their relics stop being trophies and become a promise: they will carry it with you.',
    lines: ['Ten relics on the old hearth. The fire takes them one by one.',
      'For a moment the square is full of strangers, every one of them looking at you.',
      'Then they are gone, and the weight in your chest is lighter. Shared.'],
    suggest: 'On top of the combined stats: Pallor builds 25% slower, because the burden is shared.',
  };

  // ---------- the Curator (R7.11): a town NPC who keeps the Collection Book ----------
  const CURATOR = {
    role: 'curator', name: 'Isra Vell, the Curator',
    look: 'Tall, stooped woman in a long coat patched from a dozen mismatched mail shirts; smoked-glass spectacles; a needle and black thread always in hand; chalk-white fingers.',
    why: 'She was quartermaster to every party the man in grey sent down. She sold them their armour and kept a ledger of who wore what. None came back. Now she buys their gear back from the dark, piece by piece, and sews each set whole again, so that someone, at least, is buried complete.',
    voice: 'Quiet and precise, like a ledger read aloud. Never says please; always says thank you.',
    greet: ['Helm, ash plate, third issue. Returned. Thank you.', 'Bring me what they wore. I will see to the rest.'],
    pageDone: ['That one is whole again. I will sew it tonight.', 'Complete. Someone can rest in that now.'],
    tierDone: ['More of them home than I ever hoped. Take this. It was set aside for whoever came back.'],
  };

  // ---------- friendly floors (R7.7): a refugee camp appears on cleansed acts ----------
  // act: the act that must be finished (flags.act > act). World places the camp on a floor in that act's band; each NPC
  // `role` reuses a vendor panel. Lines rotate per visit.
  const CAMP = [
    { act: 1, band: [3, 9], name: 'Lamp Camp', npcs: [
      { id: 'camp:gammer', name: 'Gammer Wick', role: 'healer', look: 'Tiny old woman in three shawls, stirring a pot over a rift-vent.',
        lines: ['Broth. It is mostly rat. The rat was warm, so it is good broth.', 'You cleaned these floors. My grandson walked down to me today. Walked!'] },
      { id: 'camp:jory', name: 'Jory Tallow', role: 'merchant', look: 'A former adventurer with one sleeve pinned up; sells what his party left behind.',
        lines: ['I came back up. The others did not. I sell their things. Do not look at me like that.', 'Further down it is worse. Buy the potions.'] },
      { id: 'camp:pell', name: 'Pell the Ferryman', role: 'waypoint', look: 'Gaunt man working a rope-lift of chain and crate.',
        lines: ['Up or down. I do not ask which. I only ask you hold on.'] },
    ] },
    { act: 2, band: [12, 19], name: 'Fever Camp', npcs: [
      { id: 'camp:twins', name: 'Ama and Odo', role: 'merchant', look: 'Scavenger twins in salvaged armour, finishing each other\'s haggling.',
        lines: ['Found it on a dead man.', '"Found" is a strong word.', 'Buy it anyway.'] },
      { id: 'camp:ada', name: 'Sister Ada', role: 'healer', look: 'The town healer, come down with bandages and a psalter.',
        lines: ['They come up out of the fever floors and I patch them. Some of them were adventurers once. Some still are.'] },
      { id: 'camp:tam', name: 'Tam', role: 'stashkeeper', look: 'The lamplighter boy, guarding a chest bigger than he is.',
        lines: ['He was here last night, the grey man. He looked at the chest. He did not touch it. I did not let him.'] },
    ] },
  ];

  // ---------- side quest lines (named townsfolk). quests.js tracks them; steps use the bounty kinds ----------
  // kind: depth (reach depth goal) | kill | elite | chests | rares. act: unlocked from that act. Offered by the Elder.
  const SIDE = [
    { id: 'side_marta', giver: 'Marta Ell', act: 1, name: 'Marta\'s Daughter',
      steps: [
        { kind: 'depth', goal: 6, desc: 'Marta\'s daughter Lise went down with the first party. Look for her past depth 6.',
          before: ['Lise had red hair. Wore my ring on a string round her neck.', 'Just find her. I do not care what state she is in.'],
          after: ['A ring on a string. In a bedroll, with nobody in it.', 'Then she is still walking about down there. Good. Good.'] },
        { kind: 'elite', goal: 3, desc: 'Something wearing red hair walks the Shallows. Kill the strong ones until one of them is her.',
          before: ['If she is one of them now, put her down. Gently, if you can manage gently.'],
          after: ['Thank you. Do not tell me how.', 'I will bury the ring. It is all of her I want.'] },
      ], rewards: { gold: 500, xp: 1500, item: 'rare' } },
    { id: 'side_ada', giver: 'Sister Ada', act: 1, name: 'Psalms for the Drowned',
      steps: [
        { kind: 'kill', goal: 40, desc: 'Sister Ada wants the dead in the Shallows laid down before she reads over them. Kill 40.',
          before: ['I cannot say the words over something that is still moving.', 'Forty should quiet the nearest ones.'],
          after: ['Forty. I said forty psalms. My voice went at thirty.'] },
        { kind: 'depth', goal: 9, desc: 'Carry Ada\'s psalter to depth 9 and leave it open on the floor.',
          before: ['Leave it open. They read, down there. They remember how.'],
          after: ['They will be reading it now. I hope it helps them. I hope it helps us.'] },
      ], rewards: { gold: 400, xp: 1200, item: 'magic' } },
    { id: 'side_garrick', giver: 'Garrick Holt', act: 2, name: 'Deep Iron',
      steps: [
        { kind: 'chests', goal: 5, minDepth: 11, desc: 'Garrick the smith needs iron from the Deep. Break open 5 chests below depth 10.',
          before: ['Deep iron holds an edge only in the dark. I want to know why.', 'Bring me what the dead were carrying.'],
          after: ['Warm. The metal is warm, and nothing heated it.', 'I will forge it anyway. I am not a careful man.'] },
        { kind: 'rares', goal: 3, minDepth: 11, desc: 'Bring back 3 rare finds so Garrick can see what deep iron becomes.',
          before: ['Show me what it makes, in the hands of something that knew how.'],
          after: ['I can do that. Not as well. Yet.'] },
      ], rewards: { gold: 1200, xp: 4000, item: 'magic' } },
    { id: 'side_tam', giver: 'Tam the lamplighter', act: 3, name: 'The Grey Paper',
      steps: [
        { kind: 'depth', goal: 26, desc: 'Tam has been finding grey notes under the town\'s doors. Each one names a floor. The last says 26.',
          before: ['He leaves them at night. I seen him once. He has no face, just a hood with soot in it.', 'This one says twenty-six. Will you look?'],
          after: ['A hearth? Down there? With a chair in front of it?', 'Someone is keeping house at the bottom.'] },
        { kind: 'elite', goal: 5, minDepth: 21, desc: 'Kill 5 strong ones in the Hellscape. Tam says the man in grey watches every fight.',
          before: ['He counts how you fight. Same as he counted the others. Make him count something he does not like.'],
          after: ['There was a note this morning. It said: "Good."', 'I burned it. I did not want it in the house.'] },
      ], rewards: { gold: 3000, xp: 12000, item: 'magic' } },
    // New kinds (need tracking in quests.js): 'collect' = one piece registered with the Curator (collection:registered),
    // 'collectPage' = one Collection Book page completed (collection:page), 'cleanse' = one corrupted item cleansed (item:cleansed).
    { id: 'side_isra', giver: 'Isra Vell, the Curator', act: 1, name: 'The Quartermaster\'s Ledger',
      steps: [
        { kind: 'collect', goal: 4, desc: 'Isra kept a ledger of what every lost party wore. Bring her 4 pieces of their gear.',
          before: ['I sold them their armour. I wrote down every buckle.', 'Bring me four pieces. Any four. I will know whose they were.'],
          after: ['Ash plate, Garrow\'s. Grave wrap, Lind\'s. Two I cannot place.', 'That frightens me more than the ones I can.'] },
        { kind: 'collectPage', goal: 1, desc: 'Complete one page of Isra\'s Collection Book: one dead adventurer\'s set, whole.',
          before: ['One whole set. Helm to boots. One of them should go into the ground complete.'],
          after: ['I sewed it shut last night. There is nobody inside it. I buried it anyway.', 'Thank you.'] },
      ], rewards: { gold: 800, xp: 2500, item: 'rare' } },
    { id: 'side_jory', giver: 'Jory Tallow', act: 2, name: 'The Warm Blade',
      steps: [
        { kind: 'cleanse', goal: 1, desc: 'Jory\'s old sword came back corrupted. Learn how: cleanse any corrupted item at the blacksmith.',
          before: ['My blade came back up without me holding it. It hums. It is warm at night.', 'Show me it can be made clean. Any piece will do.'],
          after: ['It goes quiet. Just steel. I did not think that was possible.'] },
        { kind: 'cleanse', goal: 3, desc: 'Cleanse 3 more corrupted items so Jory can bear to hold his own sword again.',
          before: ['Three more. I want to be sure before I let mine go into the fire.'],
          after: ['I held it today. It was cold. It was mine.', 'The rest of my party is still down there. Bring them back cold, too, if you can.'] },
      ], rewards: { gold: 2000, xp: 7000, item: 'magic' } },
  ];


  // ---------- R12.2 vendor quests: every townsperson gives 1–3 ----------
  // Authoring shape (converted below to the SIDE line shape quests.js reads; a giver's quests unlock in list order):
  // { id, giver, giverName, act?, name, desc, goal, before: [lines], after: [lines], rewards }
  //   giver:     NPC role ('merchant' 'blacksmith' 'mystic' 'healer' 'stashkeeper' 'curator') or a camp NPC id from CAMP
  //              ('camp:gammer', 'camp:jory', 'camp:pell', 'camp:twins', 'camp:ada', 'camp:tam'). giverName is display only.
  //   act:       offered once state.flags.act >= act (default 1). Camp quests also need their camp to exist.
  //   goal:      { kind, n, ...filters }. Kinds and the event that counts one:
  //     kill        monster:killed (filters: tier 'elite'|'boss'|'champion'|'rare'|'legendary', body e.g. 'skeleton'|'spider'|
  //                 'demon'|'wraith' read from monster.sprite.body, minDepth)
  //     depth       reach depth n (scene:changed; counts flags.maxDepth at accept)
  //     found       item:picked with rarity at or above `rarity` (C.RARITY key; prefer lists like the rewards)
  //     chests      object:interact type 'chest' (minDepth)
  //     cleanse     item:cleansed
  //     collect     collection:registered          collectPage   collection:page
  //     chute       items sent up the chute (surface:changed count rising while in the dungeon)
  //     goldSpent   gold:changed with delta < 0 while in town (sum of -delta)
  //     fallen      relic:granted                  events        event:end with success
  //     grade       floor:graded with grade at or above `grade` ('S' 'A' 'B' 'C')
  //     closeCall   one Close Call (game.onCloseCall)   flow   flow:chain with count >= `chain`
  //     lockdown    room:cleared
  //   rewards:   { gold?, xp?, item?: [rarity keys, first that exists wins], mats?: { dust|shard|essence|gemdust|riftshard: n },
  //                mark?: n (a Mark, R12.8 currency/token), tome?: n (Tome of Insight) }
  const VENDOR_RAW = [
    // Orlen the Peddler — merchant; cheerful about death, because death is stock.
    { id: 'vq_orlen_1', giver: 'merchant', giverName: 'Orlen the Peddler', name: 'Stock From Below',
      desc: 'Orlen wants goods with a story. Find 5 items of Rare quality or better.', goal: { kind: 'found', n: 5, rarity: ['rare'] },
      before: ['People pay more for a dead man\'s sword than a new one. Nobody knows why. I do not ask.', 'Five good pieces. Blue or better.'],
      after: ['Lovely. Still warm, some of them.', 'Here. A cut of what I will make on them. A small cut.'],
      rewards: { gold: 300, xp: 600 } },
    { id: 'vq_orlen_2', giver: 'merchant', giverName: 'Orlen the Peddler', name: 'A Spending Town',
      desc: 'Spend 5,000 gold in town. Orlen says a town that buys things is a town that means to live.', goal: { kind: 'goldSpent', n: 5000 },
      before: ['Nobody spends when they think they will die by winter. Spend. Show them.'],
      after: ['The baker bought a second oven. A second oven! That is faith, that is.'],
      rewards: { gold: 1000, xp: 2000, item: ['rare'] } },
    { id: 'vq_orlen_3', giver: 'merchant', giverName: 'Orlen the Peddler', act: 2, name: 'Freight',
      desc: 'Send 30 items up the chute. Orlen has buyers waiting at the crate.', goal: { kind: 'chute', n: 30 },
      before: ['That chute is the best thing that ever happened to commerce. Fill it.'],
      after: ['Thirty crates of the dead\'s belongings. I could weep. I am weeping. It is greed.'],
      rewards: { gold: 2500, xp: 6000, mats: { dust: 40 }, mark: 1 } },

    // Brakka Ironhand — blacksmith; few words, all of them about metal.
    { id: 'vq_brakka_1', giver: 'blacksmith', giverName: 'Brakka Ironhand', name: 'Bones for the Bellows',
      desc: 'Kill 30 skeletons. Brakka grinds their bones into flux.', goal: { kind: 'kill', n: 30, body: 'skeleton' },
      before: ['Bone ash makes good flux. The crypt is full of it, walking about.', 'Thirty.'],
      after: ['Good ash. Fine and white. They were well fed once.'],
      rewards: { gold: 250, xp: 700, mats: { dust: 15 } } },
    { id: 'vq_brakka_2', giver: 'blacksmith', giverName: 'Brakka Ironhand', act: 2, name: 'Clean Steel',
      desc: 'Cleanse 2 corrupted items. Brakka wants to watch the rot burn out of the metal.', goal: { kind: 'cleanse', n: 2 },
      before: ['Rot in steel sings when it burns. I want to hear it twice. Then I know I am not mad.'],
      after: ['It sings. A thin, high note, like a child. I am going to stop listening now.'],
      rewards: { gold: 1500, xp: 5000, mats: { riftshard: 2, gemdust: 30 } } },
    { id: 'vq_brakka_3', giver: 'blacksmith', giverName: 'Brakka Ironhand', act: 3, name: 'Demon Iron',
      desc: 'Kill 20 demons below depth 20. Their horns forge like nothing else.', goal: { kind: 'kill', n: 20, body: 'demon', minDepth: 21 },
      before: ['Horn from the Hellscape. Hard as a promise. Twenty pairs.'],
      after: ['I made a hammer. It is too heavy for me. It is not too heavy for you.'],
      rewards: { gold: 4000, xp: 15000, item: ['mythic', 'legendary'], mark: 1 } },

    // Seer Ysolde — mystic; speaks to the cards more than to you.
    { id: 'vq_ysolde_1', giver: 'mystic', giverName: 'Seer Ysolde', name: 'The Cards Want Blood',
      desc: 'Clear 3 timed events in the rift. The cards will not turn until something has been dared.', goal: { kind: 'events', n: 3 },
      before: ['The deck is stuck. It wants to see someone run out of time and live.', 'Three times.'],
      after: ['There. The Tower turned over by itself. That is either very good or very bad.'],
      rewards: { gold: 400, xp: 1200, item: ['uncommon', 'magic'] } },
    { id: 'vq_ysolde_2', giver: 'mystic', giverName: 'Seer Ysolde', act: 2, name: 'Near Things',
      desc: 'Survive 15 Close Calls. Ysolde reads fortunes in how near the blade came.', goal: { kind: 'closeCall', n: 15 },
      before: ['Every blade that misses you leaves a little of your future on the floor. Bring me fifteen of them.'],
      after: ['Your future is very long and very strange. I have stopped reading it.'],
      rewards: { gold: 1200, xp: 4500, mats: { essence: 6 } } },
    { id: 'vq_ysolde_3', giver: 'mystic', giverName: 'Seer Ysolde', act: 3, name: 'The Unbroken Thread',
      desc: 'Reach a Flow chain of 5. Ysolde wants to see the thread pulled tight.', goal: { kind: 'flow', n: 1, chain: 5 },
      before: ['Five misses in a row, each one closer. The thread pulls tight and time holds its breath.', 'Show me.'],
      after: ['Time stopped for you. Did you feel it? It noticed you. Be careful what notices you.'],
      rewards: { gold: 3000, xp: 12000, mark: 1 } },

    // Sister Maren — healer; tired, kind, unshockable.
    { id: 'vq_maren_1', giver: 'healer', giverName: 'Sister Maren', name: 'Bandages',
      desc: 'Open 6 chests. Maren needs linen, and the dead were buried with plenty.', goal: { kind: 'chests', n: 6 },
      before: ['I have torn up every sheet in town. The dead were buried in good linen. They will not mind.'],
      after: ['Grave linen. It smells of cedar. I will boil it twice.'],
      rewards: { gold: 200, xp: 500 } },
    { id: 'vq_maren_2', giver: 'healer', giverName: 'Sister Maren', name: 'Quiet the Wards',
      desc: 'Kill 10 champions, rares or legendaries. The strong ones keep the weak ones walking.', goal: { kind: 'kill', n: 10, tier: 'elite' },
      before: ['The sick dream of the strong ones down there. Kill those and the dreams thin out.'],
      after: ['They slept through the night. Ten of them. Ten.'],
      rewards: { gold: 900, xp: 3000, item: ['rare'] } },
    { id: 'vq_maren_3', giver: 'healer', giverName: 'Sister Maren', act: 2, name: 'Do No Harm',
      desc: 'Clear a floor with an S grade. Maren wants proof you can go in and out without bleeding everywhere.', goal: { kind: 'grade', n: 1, grade: 'S' },
      before: ['You come back to me in pieces every time. Once — just once — come back clean and quick.'],
      after: ['Not a scratch. I do not believe it. Sit down anyway. I am checking.'],
      rewards: { gold: 1500, xp: 6000, mats: { essence: 4 } } },

    // Old Wick — stashkeeper; hoards, distrusts, remembers everything.
    { id: 'vq_wick_1', giver: 'stashkeeper', giverName: 'Old Wick', name: 'Things Worth Keeping',
      desc: 'Find 2 items of Magic quality or better. Old Wick wants to see what is worth guarding.', goal: { kind: 'found', n: 2, rarity: ['magic'] },
      before: ['People leave me rubbish and call it treasure. Show me real treasure. Then I know what I am guarding.'],
      after: ['Hm. Yes. That one I would lock up twice.'],
      rewards: { gold: 500, xp: 1500 } },
    { id: 'vq_wick_2', giver: 'stashkeeper', giverName: 'Old Wick', act: 3, name: 'The Dead Do Not Pay Rent',
      desc: 'Claim 3 relics of the Fallen. Old Wick kept their chests. He wants to know he can stop.', goal: { kind: 'fallen', n: 3 },
      before: ['I kept chests for the ones who went before you. Paid a year ahead, all of them. The year ran out.', 'Find out which of them are not coming back. Three.'],
      after: ['Then I can open their chests. There was nothing in them. Just notes. Grey paper.'],
      rewards: { gold: 3000, xp: 10000, item: ['legendary'], mark: 1 } },

    // Isra Vell — the Curator; a ledger read aloud.
    { id: 'vq_isra_1', giver: 'curator', giverName: 'Isra Vell', name: 'Returns',
      desc: 'Register 10 pieces with the Curator.', goal: { kind: 'collect', n: 10 },
      before: ['Ten pieces. Any ten. Each one is a line I can strike from the ledger.'],
      after: ['Ten lines struck. My hand is steadier than it was.'],
      rewards: { gold: 600, xp: 2000, mats: { dust: 20 } } },
    { id: 'vq_isra_2', giver: 'curator', giverName: 'Isra Vell', act: 2, name: 'Three Shrouds',
      desc: 'Complete 3 Collection Book pages.', goal: { kind: 'collectPage', n: 3 },
      before: ['Three sets, whole. Three shrouds to sew. I have the thread ready.'],
      after: ['Three graves in the square, and nothing in them but armour. It is still a funeral. Thank you.'],
      rewards: { gold: 2500, xp: 9000, item: ['magic'], mark: 1 } },

    // Camp NPCs (CAMP ids). Offered at the camp.
    { id: 'vq_gammer_1', giver: 'camp:gammer', giverName: 'Gammer Wick', name: 'Meat for the Pot',
      desc: 'Kill 25 spiders. Gammer Wick says they boil up lovely.', goal: { kind: 'kill', n: 25, body: 'spider' },
      before: ['Rat is running thin. Spider boils up lovely. Do not make that face.'],
      after: ['Lovely. Eight legs each, that is two hundred legs. Stew for a week.'],
      rewards: { gold: 300, xp: 1200, item: ['uncommon', 'magic'] } },
    { id: 'vq_jory_1', giver: 'camp:jory', giverName: 'Jory Tallow', name: 'My Old Company',
      desc: 'Reach depth 14. Jory\'s party camped there. He wants to know if the fire is still lit.', goal: { kind: 'depth', n: 14 },
      before: ['We camped on fourteen. I left the fire burning when I ran. Is it still?'],
      after: ['Still burning. Of course it is. They are still sitting round it, aren\'t they.', 'Do not tell me.'],
      rewards: { gold: 1200, xp: 5000, mats: { shard: 6 } } },
    { id: 'vq_pell_1', giver: 'camp:pell', giverName: 'Pell the Ferryman', name: 'Counterweight',
      desc: 'Send 15 items up the chute. Pell uses the same chain, and the weight keeps it from slipping.', goal: { kind: 'chute', n: 15 },
      before: ['My lift shares a chain with the chute. Weight going up keeps it honest coming down.'],
      after: ['Smooth as anything. Nobody has fallen all week. Nobody new.'],
      rewards: { gold: 700, xp: 2500 } },
    { id: 'vq_twins_1', giver: 'camp:twins', giverName: 'Ama and Odo', act: 2, name: 'Finders',
      desc: 'Find 3 items of Legendary quality or better. The twins want to see one before they die.', goal: { kind: 'found', n: 3, rarity: ['legendary'] },
      before: ['We have found everything down here.', 'Except anything good.', 'Find us something good. Three somethings.'],
      after: ['Ohh.', 'Ohhh.', 'We are not giving those back.', 'They are giving those back.'],
      rewards: { gold: 3500, xp: 12000, mark: 1 } },
    { id: 'vq_ada_1', giver: 'camp:ada', giverName: 'Sister Ada', act: 2, name: 'Sealed Rooms',
      desc: 'Survive 3 lockdowns. Ada prays over every room that seals itself.', goal: { kind: 'lockdown', n: 3 },
      before: ['A room that locks itself is a grave that has not been filled yet. Fill it with the right bodies.'],
      after: ['Three rooms, three psalms. You are a better deacon than I ever was.'],
      rewards: { gold: 1500, xp: 6000, item: ['rare'] } },
    { id: 'vq_tam_1', giver: 'camp:tam', giverName: 'Tam', act: 2, name: 'Lights Out',
      desc: 'Kill 3 bosses. Tam has been counting the lights that go out below.', goal: { kind: 'kill', n: 3, tier: 'boss' },
      before: ['When a big one dies down there, a light goes out. I can see it from the camp. Make three go out.'],
      after: ['Three. And the man in grey wrote a fourth on my wall. I scrubbed it off.'],
      rewards: { gold: 2500, xp: 9000, tome: 1 } },

    // R13 loyalty quests: one per act from Orlen (bulk sell rate +10%) and Brakka (bulk salvage yield +10%). chain: 'loyalty'
    // keeps them out of the giver's other quest order; requiresAct = the act that must be reached (flags.act >= n).
    // New goal kinds: sold (items sold BY HAND to that trader: item:sold { item, role, bulk:false }), salvaged (by hand at the
    // blacksmith: item:salvaged { item, role, bulk:false }), goldSpent with role (gold spent at that trader), deliver (materials
    // handed over on turn-in: progress = player.materials[mat], consumed when claimed).
    { id: 'vq_orlen_loyal_1', giver: 'merchant', giverName: 'Orlen the Peddler', chain: 'loyalty', requiresAct: 1, name: 'A Good Customer',
      desc: 'Sell 20 items to Orlen by hand, at his counter. He wants to know you will come back.', goal: { kind: 'sold', n: 20, role: 'merchant' },
      before: ['Everyone who walks in here might be the last customer I ever have. So I remember the ones who come back.', 'Sell to me. Here, at the counter, like a person.'],
      after: ['Twenty. You came back twenty times. Most people do not come back once.', 'Your crate goods. I will take them at a better rate now. Do not tell the twins.'],
      rewards: { xp: 800, loyalty: { kind: 'sell', amount: 0.1 } } },
    { id: 'vq_orlen_loyal_2', giver: 'merchant', giverName: 'Orlen the Peddler', chain: 'loyalty', requiresAct: 2, name: 'Credit',
      desc: 'Spend 8,000 gold at Orlen\'s stall. A merchant who is paid stays open.', goal: { kind: 'goldSpent', n: 8000, role: 'merchant' },
      before: ['I extended credit to six adventurers. Six. You know how many paid me back.', 'You pay up front. I like that. Keep doing it.'],
      after: ['My ledger has more black ink than red for the first time in nine years.', 'Better rate on the crate. You have earned it. The dead have not.'],
      rewards: { xp: 4000, loyalty: { kind: 'sell', amount: 0.1 } } },
    { id: 'vq_orlen_loyal_3', giver: 'merchant', giverName: 'Orlen the Peddler', chain: 'loyalty', requiresAct: 3, name: 'Last Man Standing',
      desc: 'Sell 40 items of Rare quality or better to Orlen by hand. He means to outlast the town.', goal: { kind: 'sold', n: 40, role: 'merchant', rarity: ['rare'] },
      before: ['If this town dies, I want to be the last shop open. Lights on, door open, prices fair. Nearly fair.', 'Bring me good stock. Forty good pieces.'],
      after: ['I will be here when the rest have gone. Now I have a reason to be.', 'Best rate I give anyone. Do not die. It would ruin my books.'],
      rewards: { xp: 12000, loyalty: { kind: 'sell', amount: 0.1 } } },
    { id: 'vq_brakka_loyal_1', giver: 'blacksmith', giverName: 'Brakka Ironhand', chain: 'loyalty', requiresAct: 1, name: 'Feed the Forge',
      desc: 'Salvage 15 items by hand at Brakka\'s anvil.', goal: { kind: 'salvaged', n: 15, role: 'blacksmith' },
      before: ['A cold forge is a dead smith. Bring me metal to break. Here. At my anvil.'],
      after: ['Fifteen. The fire held all week.', 'Your crate scrap comes back richer now. I have learned where to strike.'],
      rewards: { xp: 800, loyalty: { kind: 'salvage', amount: 0.1 } } },
    { id: 'vq_brakka_loyal_2', giver: 'blacksmith', giverName: 'Brakka Ironhand', chain: 'loyalty', requiresAct: 2, name: 'Shards for the Quench',
      desc: 'Bring Brakka 3 Rift Shards. He wants to quench in something that remembers heat.', goal: { kind: 'deliver', n: 3, mat: 'riftshard' },
      before: ['Water quench is for farm tools. I want to quench in rift. Three shards. Hand them over; I will not ask how.'],
      after: ['The steel screamed. Good steel screams.', 'Better yield from your scrap. Do not waste it.'],
      rewards: { xp: 4000, loyalty: { kind: 'salvage', amount: 0.1 } } },
    { id: 'vq_brakka_loyal_3', giver: 'blacksmith', giverName: 'Brakka Ironhand', chain: 'loyalty', requiresAct: 3, name: 'The Last Anvil',
      desc: 'Spend 15,000 gold at Brakka\'s forge on upgrades, gems or cleansing.', goal: { kind: 'goldSpent', n: 15000, role: 'blacksmith' },
      before: ['My father\'s anvil cracked the winter the rift went cold. I have been working on a flawed one ever since.', 'Pay for good work. I will buy a good anvil. One of us should leave something whole behind.'],
      after: ['A new anvil. It rings true. My father would have wept.', 'Nothing you break will be wasted again. Not while I live.'],
      rewards: { xp: 12000, loyalty: { kind: 'salvage', amount: 0.1 } } },

    // R15 return trips: two per act, sending the hero back to floors they have outgrown. chain: 'return'.
    // Quest gates: requiresAct (flags.act >= n) and requiresDepth (flags.maxDepth >= n) before it is offered.
    // Goal kinds (UI tracks): visit { depth, after } = set foot on `depth` while flags.act >= after (or, with `camp: n`, any floor
    // whose map.camps exist in CAMP[n-1].band); retrieve { depth, item } = the UI drops `item` ({ id, name, icon }) on that depth
    // and it counts when picked up (a quest token, never a bag item).
    { id: 'rq_maren_hymnal', giver: 'healer', giverName: 'Sister Maren', chain: 'return', requiresAct: 1, requiresDepth: 7, name: 'The Priest\'s Hymnal',
      desc: 'Go back to depth 2 and fetch Father Morgrath\'s hymnal from the crypt chapel.',
      goal: { kind: 'retrieve', n: 1, depth: 2, item: { id: 'qi_hymnal', name: 'Morgrath\'s Hymnal', icon: { shape: 'scroll', color: '#8f6a4a', accent: '#d8c9a3' } } },
      before: ['He was a good priest before he was a crowned one. His hymnal is still on the chapel lectern, two floors down.', 'It will be easy now. That is rather the point.'],
      after: ['The pages are stuck together. Something wet. I will dry them by the fire.', 'You walked through the crypt like it was a garden path. Do you remember when it frightened you?'],
      rewards: { gold: 400, xp: 1200, item: ['uncommon', 'magic'] } },
    { id: 'rq_elder_firststep', giver: 'elder', giverName: 'Elder Thane', chain: 'return', requiresAct: 1, requiresDepth: 9, name: 'The First Stair',
      desc: 'Walk back down to depth 1 and look at where you started.', goal: { kind: 'visit', n: 1, depth: 1, after: 1 },
      before: ['Go and stand on the first floor again. Humour an old man.', 'I want you to see how small it is.'],
      after: ['Small, wasn\'t it. It was the whole world to the last ones who went down.', 'Remember that when the deep starts to feel small too.'],
      rewards: { gold: 300, xp: 1500 } },
    { id: 'rq_maren_medicine', giver: 'healer', giverName: 'Sister Maren', chain: 'return', requiresAct: 2, name: 'Medicine for Lamp Camp',
      desc: 'Carry Maren\'s medicine chest to the refugee camp in the Shallows.', goal: { kind: 'visit', n: 1, camp: 1, after: 2 },
      before: ['Gammer Wick sends word the camp has doubled. Children with coughs. Carry this down to them.', 'You know the way. Everyone in town knows you know the way.'],
      after: ['Gammer says the Shallows are so quiet the children play on the stairs.', 'Children. On the stairs to the rift. I do not know whether to laugh.'],
      rewards: { gold: 1200, xp: 5000, mats: { essence: 2 } } },
    { id: 'rq_isra_ring', giver: 'curator', giverName: 'Isra Vell', chain: 'return', requiresAct: 2, name: 'A Ring on a String',
      desc: 'Return to depth 6 and find the ring Lise Ell wore on a string. Isra wants it for Marta.',
      goal: { kind: 'retrieve', n: 1, depth: 6, item: { id: 'qi_ring', name: 'Lise\'s Ring', icon: { shape: 'ring', color: '#c9a35a', accent: '#8f1212' } } },
      before: ['Marta buried the ring. The ground on six moved, the way it does, and it surfaced again. They talk about it at the camp.', 'Bring it to me. I will set it in the book where she cannot lose it twice.'],
      after: ['Gold, and a little red thread. Lise\'s. I wrote her a line in the ledger.', 'Six used to be the bottom of everyone\'s courage. You did not even draw your weapon, did you.'],
      rewards: { gold: 1500, xp: 6000, item: ['rare'] } },
    { id: 'rq_elder_lantern', giver: 'elder', giverName: 'Elder Thane', chain: 'return', requiresAct: 3, name: 'What We Left at Three',
      desc: 'Go back up to depth 3 and bring home Hob Garrow\'s first lantern.',
      goal: { kind: 'retrieve', n: 1, depth: 3, item: { id: 'qi_lantern', name: 'The First Lantern', icon: { shape: 'potion', color: '#ffb347', accent: '#3a3442' } } },
      before: ['Before the Hellscape takes the rest of you, go back up to three. Hob Garrow\'s lantern still hangs there.', 'I want it in the square. I want people to remember there was a time the dark was only dark.'],
      after: ['It lit on its own when you set it down. The children cheered.', 'Three is a cellar now. You made it a cellar.'],
      rewards: { gold: 4000, xp: 15000, item: ['magic'], mark: 1 } },
    { id: 'rq_wick_grave', giver: 'stashkeeper', giverName: 'Old Wick', chain: 'return', requiresAct: 3, name: 'A Grave by the Stair',
      desc: 'Visit the grave on depth 2, near the first stair. Old Wick wants you to read it to him.', goal: { kind: 'visit', n: 1, depth: 2, after: 3 },
      before: ['There is a grave by the stair on two. You walked past it your first day. I watched you go.', 'Go back. Read me the name. My eyes are no good and my legs are worse.'],
      after: ['...My wife. Yes.', 'Forty years she has been down there, and now the floor is quiet enough to visit. Thank you. Go away now.'],
      rewards: { gold: 3000, xp: 12000, item: ['legendary'] } },
  ];

  // Converted to the SIDE line shape that quests.js reads: { id, role, npc, giver (display name), act, requires, name,
  // steps: [{ kind, goal (number), desc, before, after, ...filters }], rewards }. `requires` = the giver's previous quest id.
  const CAMP_ROLE = { 'camp:gammer': 'refugee', 'camp:jory': 'camp_merchant', 'camp:pell': 'refugee', 'camp:twins': 'camp_merchant', 'camp:ada': 'refugee', 'camp:tam': 'refugee' };
  const lastOf = {};
  const VENDOR_QUESTS = VENDOR_RAW.map(function (q) {
    const g = q.goal, step = { kind: g.kind, goal: g.n, desc: q.desc, before: q.before, after: q.after };
    ['rarity', 'body', 'tier', 'minDepth', 'grade', 'chain', 'role', 'mat', 'depth', 'after', 'camp', 'item'].forEach(function (k) { if (g[k] != null) step[k] = g[k]; });
    const key = q.giver + (q.chain ? ':' + q.chain : '');
    const line = { id: q.id, role: CAMP_ROLE[q.giver] || q.giver, npc: q.giver, giver: q.giverName, act: q.requiresAct || q.act || 1,
      requiresAct: q.requiresAct || null, requiresDepth: q.requiresDepth || null, chain: q.chain || null,
      requires: lastOf[key] || null, name: q.name, steps: [step], rewards: q.rewards };
    lastOf[key] = q.id;
    return line;
  });


  // ---------- R15 how earlier floors feel once you have moved on ----------
  // On arriving at a floor in `band` while flags.act >= act: one banner line (random pick). camp: extra line per camp NPC id
  // once the camp has grown (shown instead of the NPC's usual line on the first visit at that act).
  const RETURN_LINES = [
    { act: 2, band: [1, 10], floor: ['The Shallows are quiet. Things scatter from your lamp instead of toward it.',
      'You remember being afraid of this corridor. You cannot remember why.',
      'A refugee child is drawing on the crypt wall in chalk. Nobody stops her.'] },
    { act: 3, band: [1, 10], floor: ['The Shallows smell of woodsmoke now, not meat.', 'Something small hisses at you and flees. It does not come back.'] },
    { act: 3, band: [11, 20], floor: ['The fever has broken here. The walls only sweat a little.', 'Old campfires along the walls. Somebody is living down here on purpose.'] },
    { act: 4, band: [1, 30], floor: ['The rift breathes warm around you. Nothing on this floor wants to fight you any more.'] },
  ];
  const CAMP_GROWTH = {
    'camp:gammer': { act: 2, line: 'Forty mouths now, and I feed every one. The rat population is in decline, I can tell you.' },
    'camp:jory': { act: 2, line: 'More stock than I can carry. People come down from town to buy now. From town. Down here.' },
    'camp:pell': { act: 2, line: 'I run the lift both ways all day. Families, mostly. Going down to see where their dead were.' },
    'camp:twins': { act: 3, line: 'We have a stall.  /  A stall with a roof.  /  The roof is a shield.  /  It is still a roof.' },
    'camp:ada': { act: 3, line: 'I baptised a baby in rift water this morning. It was warm. Nobody screamed. Not even me.' },
    'camp:tam': { act: 3, line: 'No grey notes this week. I check every morning. I think he has stopped watching the camp. He is watching you.' },
  };

  // ---------- R12.8 milestones: names and one-line flavour per counter; tier titles low → high ----------
  // The UI pairs tiers[i] with the i-th threshold from G.meta.getMilestones(); extra thresholds reuse the last title + numeral.
  const MILESTONES = {
    kills:      { name: 'Butcher\'s Tally', flavour: 'Every one of them was something once.', tiers: ['Bloodied', 'Culler', 'Butcher', 'Reaper', 'The Rift\'s Undertaker'] },
    elites:     { name: 'Heads on Pikes', flavour: 'The strong ones take longer to stop moving.', tiers: ['Giant-Feller', 'Champion-Breaker', 'Headtaker', 'Crownbreaker', 'Nothing Down There Is Stronger'] },
    bosses:     { name: 'Crowns in the Dust', flavour: 'Kings of nothing, all of them.', tiers: ['Kingkiller', 'Regicide', 'Usurper', 'Throne-Breaker', 'Last of the Crowns'] },
    goldEarned: { name: 'Grave Wealth', flavour: 'The dead do not spend it. You might as well.', tiers: ['Pocketed', 'Purse-Heavy', 'Grave-Rich', 'Hoarder', 'Dragon\'s Bed'] },
    goldSpent:  { name: 'Open Hand', flavour: 'Coin spent in Emberdeep is a hearth kept lit.', tiers: ['Customer', 'Patron', 'Benefactor', 'Pillar of the Town', 'The Town\'s Second Hearth'] },
    sold:       { name: 'Trader in Relics', flavour: 'Orlen calls you his favourite. He calls everyone that.', tiers: ['Seller', 'Dealer', 'Merchant-Friend', 'Market Baron', 'The Whole Market'] },
    salvaged:   { name: 'Scrapper', flavour: 'Melted down, it is just iron again. Almost.', tiers: ['Tinkerer', 'Breaker', 'Scrapper', 'Smelter', 'Unmaker'] },
    chute:      { name: 'Up the Chute', flavour: 'Somewhere above, a crate fills with other people\'s lives.', tiers: ['Sender', 'Hauler', 'Freighter', 'Conveyor', 'The Rift\'s Postmaster'] },
    chests:     { name: 'Lid-Lifter', flavour: 'Locks were for the living.', tiers: ['Prier', 'Looter', 'Grave-Robber', 'Vault-Breaker', 'Nothing Stays Shut'] },
    floors:     { name: 'Stairs Taken', flavour: 'Every floor goes down. None of them go far enough.', tiers: ['Descender', 'Delver', 'Deepwalker', 'Abyss-Treader', 'Thousand Stairs'] },
    sGrades:    { name: 'Clean Work', flavour: 'In and out, and nothing left alive behind you.', tiers: ['Swift', 'Thorough', 'Surgical', 'Immaculate', 'Ghost of the Rift'] },
    closeCalls: { name: 'Hair\'s Breadth', flavour: 'Ysolde says each miss leaves a little of your future on the floor.', tiers: ['Lucky', 'Nimble', 'Untouchable', 'Blade-Dancer', 'Death Keeps Missing'] },
    flowChains: { name: 'The Thread', flavour: 'For a heartbeat, time holds its breath for you.', tiers: ['In Rhythm', 'Flowing', 'Unbroken', 'Time-Bender', 'The Stillness'] },
    deaths:     { name: 'Returned', flavour: 'You keep coming back. So does your Echo.', tiers: ['Fallen Once', 'Stubborn', 'Unburied', 'Gravedodger', 'The Rift Spits You Out'] },
  };

  // ---------- town revival (R7.7) ----------
  // state.flags.act: 1..4 (4 = campaign done); state.flags.cleansed: [boss monsterIds killed for the main chain];
  // state.flags.warmth: 0..3 for world/engine to warm the town. Each stage adds NPC lines and opens services
  // ('role:tab'). A stage applies from its act onward; later stages override earlier lines.
  const TOWN = [
    { act: 1, warmth: 0, lines: {
      merchant: 'I sell what the dead do not need. It is most of my stock.',
      blacksmith: 'My forge has not been warm in a month. I hammer cold. It shows.',
      mystic: 'The veil is thin and cold tonight. Wager against it, if you like losing.',
      healer: 'Sit. Bleed quietly. I have very little left to bandage with.',
      elder: 'Every floor you clear, the cold backs off a step.',
      stashkeeper: 'What you leave with me, the dark cannot take. Probably.',
      curator: 'Helm, ash plate, third issue. Returned. Thank you.' } },
    { act: 2, warmth: 1, news: 'Chimneys smoke in {town}. The mystic can work the Reroll again.', services: ['mystic:enchant'], lines: {
      merchant: 'Trade picked up when the chimneys did. People buy things when they think they will live.',
      blacksmith: 'Fire in the forge. Real fire. Bring me something worth hitting.',
      mystic: 'Warmth thins the veil. I can unpick an enchantment again. For a price.',
      healer: 'Children came to me with burns this week. From hearths. I could kiss them.',
      elder: 'People are talking to each other again. Arguing, even. It is wonderful.',
      curator: 'Warmer hands sew straighter. I have finished three shrouds this week.' } },
    { act: 3, warmth: 2, news: 'The market is open in {town}.', services: [], lines: {
      merchant: 'Three stalls now, and I am the cheapest. Do not tell the other two.',
      blacksmith: 'The deep iron sings when I quench it. I have stopped asking why.',
      mystic: 'Something below is listening to my cards. I deal them face down now.',
      healer: 'The grey ones are getting their colour back. Slowly. Faster when you win.',
      elder: 'There was a note on my door. Grey paper. You know who.',
      curator: 'Some of what you bring me now I never sold. Someone else outfitted them. Someone in grey.' } },
    { act: 4, warmth: 3, news: '{town} is warm.', services: [], lines: {
      merchant: 'Caravans came up the north road this morning. Caravans! For us!',
      blacksmith: 'Whatever you carry now, it makes my forge burn hotter when you stand near it. Stand near it.',
      mystic: 'You are warm as a hearth and pale as a candle. Both at once. Sit away from me.',
      healer: 'I can heal what the deep does. I cannot heal what you are carrying.',
      elder: 'We are warm because of you. I am frightened because of you. Both are true.',
      curator: 'There is one ledger I have not opened. It has your name in it. I did not write it.' } },
  ];

  // ---------- lore pages ----------
  const LORE = [
    { title: 'The Note', text: 'Go to {town}. There is something under it that only you can mend.\nYou will be paid more than you lost.\nDo not look for me. I will find you.' },
    { title: 'The Founding', text: 'Year one. Forty of us in the black bowl, starving. Oswin went down the crack alone with a lamp and a knife.\nYear one, winter. Oswin came back. The crack breathes warm. Nobody asks what he did.' },
    { title: 'Miner\'s Tally', text: 'Day 1: warm seam. Day 9: seam colder. Day 14: Dav says the rock is humming.\nDay 15: Dav gone.\nDay 16: we hear him humming.' },
    { title: 'A Gravestone', text: 'The name has been scratched away. The scratches are on the inside of the lid.' },
    { title: 'The Ledger, First Page', text: 'Names, thousands of them, in a hand that never lifts from the page. Each one crossed through twice.' },
    { title: 'Priest\'s Note', text: 'Bury them face down. They climb toward warmth.' },
    { title: 'On the Brood', text: 'She does not hunt. She waits where the heat collects and lets it come to her.\nSo did we, once.' },
    { title: 'Water Hymn', text: 'Below the stone, the water keeps every voice that falls into it.\nDo not shout in the caves. Do not answer.' },
    { title: 'Brannoc\'s Order', text: 'Hold the stair. Hold it until relieved.\n\nNobody came to relieve him. Nobody was left who knew he was there.' },
    { title: 'Wren\'s Map, a Corner', text: 'Floor 14: 3,112 steps. Floor 15: 3,980 steps. Floor 16: the floor is not the same length twice. Counting anyway.' },
    { title: 'Varr & Co. Price List', text: 'Bottled Rift Heat. Warms a house for a winter. One silver.\nSide effects: none known.\n(Handwritten:) one known.' },
    { title: 'Gravedigger\'s Prayer', text: 'Lie down. Lie down. I have dug you a good place, and it is warm, and I will be right here.' },
    { title: 'Survey of the Deep', text: 'No floor. No wall. Distance behaves badly. We dropped a lamp and it fell upward for a while.' },
    { title: 'Torn Sermon', text: 'It is not a god. Gods want things. The thing under us only grows, toward whatever is warm.' },
    { title: 'The Elder\'s Diary', text: 'I was the first to go grey. I hide it with soot. The founders\' book warned us what Oswin did. One hard winter we burned it to keep warm.' },
    { title: 'A Grey Receipt', text: 'One village, the hero\'s. Burned. Paid in full.\nOne hero, delivered to {town}.\n— F.' },
    { title: 'Skin, Written On', text: 'Not a page. The words grew there: HE OPENED HIS CHEST AND PUT IT IN AND CLOSED IT AND WAS WARM FOREVER.' },
    { title: 'On Pallor', text: 'Grey hands, grey lips, grey thoughts. The deep pays well for colour.\nCount what you have left before you take the next stair.' },
    { title: 'The Hearthking\'s Last Letter', text: 'To whoever comes next. It is not a burden. It is warm. You will want to put it down after the first hundred years. You will not be able to.' },
  ];

  meta.STORY = { NAMES, TAGLINE, TITLE, OLD_TITLES, OPENING, ACTS, STEPS, FINALE, PALLOR_INTRO, BOSS_LINES, WORLD_BOSS_IDS,
    BOSSES, ECHO, ADVENTURERS, FALLEN_COMBINED, CURATOR, CAMP, SIDE, VENDOR_QUESTS, RETURN_LINES, CAMP_GROWTH, MILESTONES, TOWN, LORE };
})();
