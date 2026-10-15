// Campaign text (R7.7). PURE DATA: every player-facing story line lives here so the lead dev can rename people, places
// and items without touching logic. story.js plays it, quests.js tracks it. Read docs/STORY.md for the outline.
// Tokens filled at display time: {town} {rift} {Rift} {rot} {figure} {Figure} {king} {ember} (from NAMES), {boss} (the
// step's boss name from G.game.getMonsterInfo), {name} (the hero), {depth}.
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
      { name: 'Gammer Wick', role: 'healer', look: 'Tiny old woman in three shawls, stirring a pot over a rift-vent.',
        lines: ['Broth. It is mostly rat. The rat was warm, so it is good broth.', 'You cleaned these floors. My grandson walked down to me today. Walked!'] },
      { name: 'Jory Tallow', role: 'merchant', look: 'A former adventurer with one sleeve pinned up; sells what his party left behind.',
        lines: ['I came back up. The others did not. I sell their things. Do not look at me like that.', 'Further down it is worse. Buy the potions.'] },
      { name: 'Pell the Ferryman', role: 'waypoint', look: 'Gaunt man working a rope-lift of chain and crate.',
        lines: ['Up or down. I do not ask which. I only ask you hold on.'] },
    ] },
    { act: 2, band: [12, 19], name: 'Fever Camp', npcs: [
      { name: 'Ama and Odo', role: 'merchant', look: 'Scavenger twins in salvaged armour, finishing each other\'s haggling.',
        lines: ['Found it on a dead man.', '"Found" is a strong word.', 'Buy it anyway.'] },
      { name: 'Sister Ada', role: 'healer', look: 'The town healer, come down with bandages and a psalter.',
        lines: ['They come up out of the fever floors and I patch them. Some of them were adventurers once. Some still are.'] },
      { name: 'Tam', role: 'stashkeeper', look: 'The lamplighter boy, guarding a chest bigger than he is.',
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
    BOSSES, ECHO, ADVENTURERS, FALLEN_COMBINED, CURATOR, CAMP, SIDE, TOWN, LORE };
})();
