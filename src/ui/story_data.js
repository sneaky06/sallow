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
    main_6: { before: ['{boss} sits on a vein of clean fire and lets none of it rise.', '{Rot} promised it a crown. It always promises crowns.'],
      after: ['{Rift} breathed warm for an hour. Then the fever came back.', 'The fire was never the source. It leaks up from something further down.'] },
    main_7: { before: ['Past the fire the Deep goes quiet. Not empty. Listening.', 'I hear it in my sleep. It says your name, not mine. Reach the eighteenth floor.'],
      after: ['You came back. I did not think you would.', 'It knows you now. That is no comfort to either of us.'] },
    main_8: { before: ['{boss} is the floor of the Deep. A star fell into {rift} long ago, they say, and the rot ate it hollow.', 'Put it out. Below it is the last of the way.'],
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

  // ---------- bosses: one line when first seen, one when killed (keyed by monsterId) ----------
  const BOSS_LINES = {
    boss_gravelord: { intro: 'Another name for the ledger.', death: 'The ledger burns. A hundred names go home.' },
    boss_broodmother: { intro: 'Warm. You are so warm.', death: 'Her brood scatters into the dark, cold and small.' },
    boss_tyrant: { intro: 'The fire is mine. The rot promised.', death: 'The clean fire spills loose. For a moment the Deep is bright.' },
    boss_hollow: { intro: '...so warm... give it to me...', death: 'The hollow star goes out. Below it, something keeps beating.' },
    boss_world: { intro: 'Three hundred years warm. Come closer. Take it from me.', death: 'The Hearthking comes apart. The Ember goes on beating.' },
  };
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

  // ---------- R7.6 corrupted former adventurers (combat builds the fights; ids are suggestions) ----------
  // Each was one of the Grey Factor's earlier picks. Banner on first sight when an entity has adventurerId === id
  // (or monsterId === 'adv_' + id).
  const ADVENTURERS = [
    { id: 'brannoc', classId: 'warrior', name: 'Brannoc the Unbent', depth: 9,
      story: 'A sergeant who held the stair at the bottom of the Shallows so his company could run. He held it for forty days. The rot fused his shield to his arm and his feet to the stair.',
      fight: 'Fights shield-first: blocks everything from the front, shoulder-charges with knockback. Flank him.',
      intro: 'None pass. None. Pass.', death: 'He kneels at last. The stair is free.',
      reward: 'Unbent: a dash that ends in a shield bash, or +block for a moment after each dash.' },
    { id: 'wren', classId: 'ranger', name: 'Wren Halloway, the Cartographer', depth: 16,
      story: 'A scout who mapped the Deep by counting steps. She is still counting. Her arrows are cut from her own bones; there are very few of her left.',
      fight: 'Never stops moving; leaves snare lines; vanishes and fires from the dark. Every 10 s she must stop to count.',
      intro: 'Four thousand and ten. Four thousand and eleven.', death: 'Her map unrolls across the floor. It goes much, much deeper.',
      reward: 'Wren\'s Count: the floor map is revealed on arrival, or the dash reloads a free shot.' },
    { id: 'ilse', classId: 'sorcerer', name: 'Magister Ilse Varr', depth: 24,
      story: 'She came to bottle the rift\'s heat and sell it in the south. She drank the first bottle to test it. She is a furnace now, and still selling.',
      fight: 'Fire novas that grow each cast; drops burning bottles that burst late. Her own heat hurts her: kite and wait.',
      intro: 'A sample, friend? Very warming.', death: 'The last bottle cracks. For once, nothing burns.',
      reward: 'Varr\'s Tincture: a fire skill or +fire damage that grows the longer you stand in the fight.' },
    { id: 'tobiah', classId: 'necromancer', name: 'Old Tobiah Crane', depth: 28,
      story: '{town}\'s gravedigger. He went down to fetch the dead the crypt-king stole. He found them. He would not leave them. Now he leads them.',
      fight: 'Raises the corpses you leave; stronger the more you have killed on the floor. Clean floors make him weak.',
      intro: 'Back in the ground, all of you. In a moment.', death: 'His dead lie down with him, gently.',
      reward: 'Crane\'s Spade: one more minion, or corpses you leave cannot be raised against you.' },
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
      stashkeeper: 'What you leave with me, the dark cannot take. Probably.' } },
    { act: 2, warmth: 1, news: 'Chimneys smoke in {town}. The mystic can work the Reroll again.', services: ['mystic:enchant'], lines: {
      merchant: 'Trade picked up when the chimneys did. People buy things when they think they will live.',
      blacksmith: 'Fire in the forge. Real fire. Bring me something worth hitting.',
      mystic: 'Warmth thins the veil. I can unpick an enchantment again. For a price.',
      healer: 'Children came to me with burns this week. From hearths. I could kiss them.',
      elder: 'People are talking to each other again. Arguing, even. It is wonderful.' } },
    { act: 3, warmth: 2, news: 'The market is open in {town}.', services: [], lines: {
      merchant: 'Three stalls now, and I am the cheapest. Do not tell the other two.',
      blacksmith: 'The deep iron sings when I quench it. I have stopped asking why.',
      mystic: 'Something below is listening to my cards. I deal them face down now.',
      healer: 'The grey ones are getting their colour back. Slowly. Faster when you win.',
      elder: 'There was a note on my door. Grey paper. You know who.' } },
    { act: 4, warmth: 3, news: '{town} is warm.', services: [], lines: {
      merchant: 'Caravans came up the north road this morning. Caravans! For us!',
      blacksmith: 'Whatever you carry now, it makes my forge burn hotter when you stand near it. Stand near it.',
      mystic: 'You are warm as a hearth and pale as a candle. Both at once. Sit away from me.',
      healer: 'I can heal what the deep does. I cannot heal what you are carrying.',
      elder: 'We are warm because of you. I am frightened because of you. Both are true.' } },
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
    ECHO, ADVENTURERS, SIDE, TOWN, LORE };
})();
