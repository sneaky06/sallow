// Story (R4.1, reworked for R6.5 "the corrupted rift"): premise, the Elder's lines around each main-chain step, act cards,
// boss + Echo banners, the ending, lore pages and the Journal. ALL player-facing story text is data in this file, and the
// recurring proper nouns come from NAMES ({town}, {rift}, {Rift}, {pale}, {Pale}, {star}) so a rename is a one-line edit.
// quests.js owns the chain itself (its descriptions use the same tokens). Tone: short, grim, a little strange.
// state.flags.storySeen = [key] (which scenes have played), state.flags.loreFound = [loreIndex]. Both are saved with flags.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const meta = G.meta = G.meta || {};
  const ui = G.ui;
  const h = ui._h;

  // ---------- names (rename here) ----------
  const NAMES = {
    town: 'Emberfall',
    rift: 'the rift', Rift: 'The rift',          // the warm crack under the town
    pale: 'the pale', Pale: 'The pale',          // the corruption; Pallor is the pale getting into you
    star: 'the Star',                            // what lies at the core: a fallen star the town was built on
  };
  function names(text) {
    return String(text).replace(/\{(town|rift|Rift|pale|Pale|star)\}/g, function (m, k) { return NAMES[k]; });
  }
  meta._fillNames = names;

  const TAGLINE = 'The rift below {town} has turned.';
  const TITLE = 'Warden of the Rift';
  const OLD_TITLES = ['Warden of the Well'];   // titles from older builds, swapped for TITLE on load

  const PREMISE = [
    'Under {town} there is a crack in the world. For three hundred years {rift} breathed warm air, and the town never knew winter.',
    'This year it breathes cold. Something pale has got into it. The hearths will not catch. People are turning grey and slow, and some have forgotten their names.',
    'The deeper you go, the worse the rot. At the bottom is whatever warmed us once. The Elder wants it cleansed, or torn out by the root.',
  ];

  // Elder lines before (on accepting) and after (on claiming) each main step, keyed by quest id. {boss} = the boss's name.
  const STEPS = {
    main_1: { before: ['You came up the north road. Then you saw our fires.', 'They burn, but they give nothing. {Rift} under the well breathes cold now.', 'Go down. Not far. Tell me what is breathing.'],
      after: ['Bones that walk. Doors that open from the inside.', 'So the rot has reached the crypt. It is climbing toward us.'] },
    main_2: { before: ['There is a crowned thing in the crypt. {boss}.', '{Pale} found it first and made it a king. It counts our dead every night.', 'Break the count.'],
      after: ['The bells rang by themselves when it fell.', 'Old Marta remembered her daughter\'s name this morning. Cut the rot back and the colour comes back with it.'] },
    main_3: { before: ['The crypt was only the lid. Under it {rift} opens into wet caves.', 'The rot is thicker there. Some of what you meet was ours once. Bring nothing back that still moves.'],
      after: ['Water that remembers voices. I do not like how plainly you said that.', 'Rest. The cold got worse while you were gone.'] },
    main_4: { before: ['{boss}. The miners called her Mother, before they stopped coming home.', 'She nests where the warm air used to rise, and breeds on it.'],
      after: ['Three hearths caught last night. Three.', 'Below her nest the rock is red. That is where the warmth came from, once.'] },
    main_5: { before: ['Deeper down {rift} still burns, but the fire gives no heat. It is sick. Like us.', 'Walk it. Drink nothing down there.'],
      after: ['You smell of ash that is not ash.', 'Someone down there is keeping the fire from us.'] },
    main_6: { before: ['{boss} squats on the last clean fire, the way a miser sits on coin.', '{Pale} promised it everything. Take the fire back.'],
      after: ['{Rift} breathed warm for an hour. Then cold again.', 'So the fire was never the source. It only leaked up from the core.'] },
    main_7: { before: ['Past the fire, {rift} stops pretending to be a cave. No stone, no water. Only a quiet that listens.', 'I have heard it in my sleep. It says your name, not mine.'],
      after: ['You came back. I did not think you would.', 'It knows you now. Every floor down, it takes a little more of your colour. Watch your hands.'] },
    main_8: { before: ['At the bottom is what warmed us: {star}. It fell before the town was built. We dug the well into its crater.', '{Pale} has eaten it hollow. Now it drinks heat instead of giving it. {boss}.', 'Cleanse what you can. What you cannot, tear out by the root.'],
      after: ['Listen. {Rift} is breathing warm.', 'Children are shouting in the square. I had forgotten that sound.'] },
  };

  const ENDING = [
    'When {star} tore loose, {rift} shook from top to bottom, and every hearth in {town} caught at once.',
    'The Elder slept for the first time in years, and did not dream.',
    'But the rot had roots. Where {star} was torn out they go on down, pale and thick as rope, into a dark that is warm.',
    'Something at the end of them is still drinking.',
    'The deeper floors are open.',
  ];

  // Shown once after the ending, when Pallor switches on (R5.2): Pallor is the rot getting into you.
  const PALLOR_INTRO = [
    'Every floor you go down without coming home, {pale} gets a little further into you. Your colour goes first. That is Pallor.',
    'The paler you are, the richer the deep pays, and the harder it bites. Some finds come back bleached, hiding something until you bring them home.',
    'Come home and the colour returns. Die pale, and the bleached things stay below with your corpse.',
  ];

  // Act cards: a banner the first time a hero reaches each stretch of the rift (after the floor-name banner).
  // `after`: a storySeen key that must exist first (the roots only show once the Star is gone).
  const ACTS = [
    { from: 1, title: 'I · The Mouth', line: 'Cold air rises from the crypt. Something below is breathing in.' },
    { from: 6, title: 'II · The Throat', line: 'The stone goes wet. Pale threads hang from the roof like hair.' },
    { from: 11, title: 'III · The Sick Fire', line: '{Rift} still burns here. The fire gives no heat.' },
    { from: 16, title: 'IV · The Hollow', line: 'No stone, no water. Only a quiet that listens.' },
    { from: 21, title: 'V · The Roots', line: 'Pale roots, thick as rope, going down into a dark that is warm.', after: 'ending' },
  ];

  // One line when a boss is first seen on a floor, one when it dies. Keyed by monsterId.
  const BOSS_LINES = {
    boss_gravelord: { intro: 'Another name for the ledger.', death: 'The ledger burns. A hundred names go home.' },
    boss_broodmother: { intro: 'Warm. You are so warm.', death: 'Her brood scatters into the dark, cold and small. The rot has lost its nest.' },
    boss_tyrant: { intro: 'The fire is mine. The pale one promised.', death: 'The clean fire spills loose. For a moment {rift} is bright.' },
    boss_hollow: { intro: '...so warm... give it to me...', death: '{star} tears loose from its roots. Far above, {rift} breathes warm.' },
  };

  // R6.2 Your Echo. {name} = the hero's name, {depth} = where the abandoned remains lie.
  const ECHO = {
    title: 'Echo of {name}',
    intro: 'It wears your face. It fights the way you fight.',
    death: 'Your echo comes apart. What you left behind is yours again.',
    deathScreen: 'What you left on depth {depth} will rise as your Echo. Kill it to win it back.',
    corpseNote: 'Die before you reach it and it rises as your Echo.',
    tracker: '☠ Your Echo waits: depth {depth}',
    trackerHere: '☠ Your Echo walks this floor',
  };

  meta.LORE = [
    { title: 'The Rift Charter', text: 'Founded in the year of the long frost, on the warm lip of the rift. Let no fire be lit in {town} that the rift did not warm first.\n— the first Elder' },
    { title: 'Miner\'s Tally', text: 'Day 1: warm seam. Day 9: seam colder. Day 14: Dav says the rock is humming.\nDay 15: Dav gone.\nDay 16: we hear him humming.' },
    { title: 'A Gravestone', text: 'The name has been scratched away. The scratches are on the inside of the lid.' },
    { title: 'A Child\'s Drawing', text: 'A house, a sun, a crack in the ground. Under the crack, in grey, a much bigger sun with roots for legs.' },
    { title: 'The Ledger, First Page', text: 'Names, thousands of them, in a hand that never lifts from the page. Each one crossed through twice.' },
    { title: 'Priest\'s Note', text: 'Bury them face down. They climb toward warmth.' },
    { title: 'On the Brood', text: 'She does not hunt. She waits where the heat collects and lets it come to her.\nSo did we, once.' },
    { title: 'Water Hymn', text: 'Below the stone, the water keeps every voice that falls into it.\nDo not shout in the caves. Do not answer.' },
    { title: 'Smith\'s Complaint', text: 'Iron from the deep seams will not hold an edge in daylight. At night it is the best steel I have ever forged. I have stopped asking why.' },
    { title: 'The Fallen Star', text: 'The old songs say a star fell here and would not go out. Where it struck, the ground split and breathed. The founders built on the warm side.' },
    { title: 'Contract of Embers', text: 'I, keeper of the clean fire, swear to hold it against the cold below for as long as the town above remembers me.\n\nThe town did not remember.' },
    { title: 'A Last Letter', text: 'If you find this, the stair is behind the third pillar. I went down because I heard my mother calling.\nMy mother is upstairs.' },
    { title: 'Survey of the Deep', text: 'No floor. No wall. Distance behaves badly. We dropped a lamp and it fell upward for a while.' },
    { title: 'Torn Sermon', text: 'It is not a god. Gods want things. {Pale} only drinks, and grows toward whatever is warm.' },
    { title: 'The Elder\'s Diary', text: 'I was the first to go grey. I hide it with soot. The founders knew {rift} could sicken. They wrote it down, and one hard winter we burned the book to keep warm.' },
    { title: 'Scratched on the Lowest Step', text: 'The roots go on below {star}. They are warm.\nDo not follow the warmth.' },
    { title: 'Herbalist\'s Folio', text: 'Pale threads in every sample from below the caves. Not fungus. Not root. They lean toward my lamp, and they are getting longer.' },
    { title: 'On Pallor', text: 'Grey hands, grey lips, grey thoughts. The deep pays well for colour.\nCount what you have left before you take the next stair.' },
  ];
  meta.LORE.forEach(function (p) { p.title = names(p.title); p.text = names(p.text); });

  // Everything a rename or reskin needs, in one place.
  meta.STORY = { NAMES: NAMES, TAGLINE: TAGLINE, TITLE: TITLE, PREMISE: PREMISE, STEPS: STEPS, ENDING: ENDING, PALLOR_INTRO: PALLOR_INTRO,
    ACTS: ACTS, BOSS_LINES: BOSS_LINES, ECHO: ECHO };
  ui._tagline = function () { return names(TAGLINE); };
  const fill = function (lines) { return lines.map(names); };

  // ---------- flags ----------
  function list(key) {
    const f = S.flags;
    if (!Array.isArray(f[key])) f[key] = [];
    return f[key];
  }
  function seen(key) { return list('storySeen').indexOf(key) >= 0; }
  function markSeen(key) { if (!seen(key)) list('storySeen').push(key); }

  // ---------- dialogue box ----------
  // lines: strings; opts: { who, sprite } — a speaker with a portrait, or narration without one. Tap anywhere to advance.
  const queue = [];
  let playing = false;
  function say(lines, opts) {
    if (!lines || !lines.length) return;
    queue.push({ lines: lines, opts: opts || {} });
    if (!playing) next();
  }
  ui._say = say;
  function next() {
    const job = queue.shift();
    if (!job) { playing = false; return; }
    playing = true;
    let i = 0, close = null;
    const o = job.opts;
    const text = h('p', { class: 'ed-talk-text' });
    const more = h('span', { class: 'ed-talk-more' });
    const box = h('div', { class: 'ed-talk' + (o.who ? '' : ' narr'), role: 'button', tabindex: '0' },
      o.who ? ui._portrait(o.sprite, 48) : null,
      h('div', { class: 'ed-talk-main' }, o.who ? h('b', { text: o.who }) : null, text, more));
    const show = function () {
      text.textContent = job.lines[i];
      more.textContent = i < job.lines.length - 1 ? '▶ tap' : '■ close';
    };
    box.addEventListener('click', function () {
      ui._sfx('click');
      i++;
      if (i < job.lines.length) show();
      else {
        close();
        if (o.onDone) { try { o.onDone(); } catch (err) { console.error('[ui story]', err); } }
        next();
      }
    });
    show();
    close = ui._modal(box, { dismiss: false, pause: true });
  }

  function elder() {
    const e = (S.entities || []).find(function (x) { return x.role === 'elder'; });
    return { who: (e && e.name) || 'The Elder', sprite: (e && e.sprite) || { body: 'humanoid', color: '#5a5a6a', accent: '#d8c9a3', scale: 1 } };
  }
  function fillBoss(lines, questId) {
    const m = (meta._MAIN || []).find(function (q) { return q.id === questId; });
    const name = m && m.boss && meta._bossName ? meta._bossName(m.boss) : 'it';
    return lines.map(function (l) { return names(l.replace('{boss}', name)); });
  }

  // ---------- story beats driven by contract events ----------
  // Premise on the first arrival in town; before-lines when a main step is accepted; after-lines when it is turned in;
  // the ending after the last one. Each plays once per hero (storySeen is saved).
  G.on('scene:changed', function (e) {
    bossSeen = {};
    if (!e || e.scene !== 'town' || !S.player) return;
    if (!seen('premise')) {
      markSeen('premise');
      setTimeout(function () { say(fill(PREMISE), {}); }, 400);
    }
  });

  // Act card on the first arrival in each stretch (after the floor-name banner, which hud.js shows at 0.7 s).
  let actTimer = 0;
  G.on('scene:changed', function (e) {
    clearTimeout(actTimer);
    if (!e || e.scene !== 'dungeon' || !S.player) return;
    const d = S.depth | 0;
    let act = null;
    for (const a of ACTS) if (d >= a.from && (!a.after || seen(a.after))) act = a;
    if (!act || seen('act:' + act.from)) return;
    markSeen('act:' + act.from);
    actTimer = setTimeout(function () {
      if (S.scene === 'dungeon') ui._banner(names(act.title), names(act.line), '#b8b0a0', 6);
    }, 4400);
  });

  G.on('quest:updated', function (e) {
    const q = e && e.quest;
    if (!q || !q.main || q.status !== 'active' || !STEPS[q.id]) return;
    const key = q.id + ':before';
    if (seen(key)) return;
    markSeen(key);
    say(fillBoss(STEPS[q.id].before, q.id), elder());
  });

  G.on('quest:completed', function (e) {
    const q = e && e.quest;
    if (!q || !q.main || !STEPS[q.id]) return;
    const key = q.id + ':after';
    if (seen(key)) return;
    markSeen(key);
    say(fillBoss(STEPS[q.id].after, q.id), elder());
    const MAIN = meta._MAIN || [];
    if (MAIN.length && q.id === MAIN[MAIN.length - 1].id && !seen('ending')) {
      markSeen('ending');
      say(fill(ENDING), { onDone: unlockEndgame });
    }
  });

  // ---------- endgame unlock (R5.2 / R5.5) ----------
  // When the ending has been read: Pallor switches on, the hero earns a title, deeper floors are open.
  function giveTitle() {
    const f = S.flags;
    if (!Array.isArray(f.titles)) f.titles = [];
    f.titles = f.titles.filter(function (t) { return OLD_TITLES.indexOf(t) < 0; });
    if (f.titles.indexOf(TITLE) < 0) f.titles.push(TITLE);
    if (!f.title || OLD_TITLES.indexOf(f.title) >= 0) f.title = TITLE;
  }
  function unlockEndgame() {
    const f = S.flags;
    const first = !f.pallorUnlocked;
    f.pallorUnlocked = true;
    giveTitle();
    if (G.meta.save) G.meta.save();
    if (first) {
      ui._sfx('levelup');
      ui._banner('Title earned', TITLE, '#dfc06a', 5);
      setTimeout(function () { say(fill(PALLOR_INTRO), {}); }, 600);
    }
  }
  ui._heroTitle = function () { return (S.player && typeof S.flags.title === 'string') ? S.flags.title : ''; };
  // A hero who read the ending before this build still gets the unlock (once, quietly); renamed titles are swapped.
  G.on('scene:changed', function (e) {
    if (!e || e.scene === 'menu' || !S.player) return;
    if (seen('ending') && !S.flags.pallorUnlocked) S.flags.pallorUnlocked = true;
    if (seen('ending') || (Array.isArray(S.flags.titles) && S.flags.titles.some(function (t) { return OLD_TITLES.indexOf(t) >= 0; }))) giveTitle();
  });

  // ---------- boss + Echo banners ----------
  // R6.2: the game marks its Echo; the field is not in the contract yet, so several spellings are accepted.
  function isEcho(e) {
    return !!e && (e.echo === true || e.isEcho === true || e.monsterId === 'echo' || e.kind === 'echo' ||
      (typeof e.name === 'string' && e.name.indexOf('Echo of ') === 0));
  }
  ui._isEcho = isEcho;
  function echoName(e) {
    if (e && typeof e.name === 'string' && e.name.indexOf('Echo of ') === 0) return e.name;
    const n = (S.player && S.player.name) || (e && e.name) || 'you';
    return ECHO.title.replace('{name}', n);
  }
  ui._echoName = echoName;
  ui._echoText = function (key, depth) { return names(String(ECHO[key] || '').replace('{depth}', depth == null ? '?' : depth)); };

  let bossSeen = {}, scanT = 0;
  function bossTitle(e) {
    let info = null;
    if (e.monsterId && G.game && G.game.getMonsterInfo) { try { info = G.game.getMonsterInfo(e.monsterId); } catch (err) { info = null; } }
    return (info && info.name) || e.name || 'Something old';
  }
  ui._updaters.push(function (dt) {
    scanT -= dt;
    if (scanT > 0) return;
    scanT = 0.25;
    const p = S.player, map = S.map;
    if (!p || !map || S.scene !== 'dungeon') return;
    for (const e of S.entities) {
      if (e.dead || bossSeen[e.id] || (e.faction && e.faction !== 'enemy')) continue;
      const echo = isEcho(e);
      if (!echo && e.rarity !== 'boss') continue;
      const tx = Math.floor(e.x), ty = Math.floor(e.y);
      const lit = map.visible && map.w ? map.visible[ty * map.w + tx] : 0;
      const dx = e.x - p.x, dy = e.y - p.y;
      if (!lit && dx * dx + dy * dy > 100) continue;
      bossSeen[e.id] = true;
      if (echo) {
        ui._banner(echoName(e), '“' + names(ECHO.intro) + '”', '#bfe6ff', 5);
        ui._sfx('shrine');
        continue;
      }
      const lines = BOSS_LINES[e.monsterId];
      ui._banner(bossTitle(e), lines ? '“' + names(lines.intro) + '”' : '', '#ff6a5a', 5);
    }
  });
  G.on('monster:killed', function (e) {
    const m = e && e.monster;
    if (!m || (m.faction && m.faction !== 'enemy')) return;
    if (isEcho(m)) { ui._banner(echoName(m) + ' falls', names(ECHO.death), '#bfe6ff', 6); return; }
    if (m.rarity !== 'boss') return;
    const lines = BOSS_LINES[m.monsterId];
    ui._banner(bossTitle(m) + ' falls', lines ? names(lines.death) : '', '#dfc06a', 6);
  });

  // ---------- lore pages ----------
  function showPage(i) {
    const page = meta.LORE[i];
    if (!page) return;
    let close = null;
    close = ui._modal(ui._dialog([h('div', { class: 'ed-tipname', text: page.title, style: 'color:#e8dec6' }),
      h('div', { class: 'ed-page', text: page.text })], [ui._btn('Close', function () { close(); })], 'tip'));
  }
  ui._showLore = showPage;

  const shownNow = {};
  function found(idx) {
    idx = idx | 0;
    if (!S.player || !meta.LORE[idx]) return;
    const have = list('loreFound');
    const isNew = have.indexOf(idx) < 0;
    if (isNew) have.push(idx);
    if (shownNow[idx]) return;          // lore:found and item:picked can both arrive for the same page
    shownNow[idx] = true;
    setTimeout(function () { shownNow[idx] = false; }, 2000);
    if (isNew) {
      ui._sfx('quest');
      showPage(idx);
      if (G.meta.save) G.meta.save();
    }
  }
  G.on('lore:found', function (e) { if (e && e.loreIndex != null) found(e.loreIndex); });
  G.on('item:picked', function (e) { const it = e && e.item; if (it && it.type === 'lore' && it.loreIndex != null) found(it.loreIndex); });

  // ---------- journal ----------
  ui._register('journal', {
    render: function () {
      const have = list('loreFound').slice().sort(function (a, b) { return a - b; });
      const acts = ACTS.filter(function (a) { return seen('act:' + a.from); });
      const story = h('div', { class: 'ed-box' }, h('div', { class: 'ed-h', text: 'The tale so far' }),
        fill(PREMISE).map(function (t) { return h('p', { class: 'ed-page', text: t }); }),
        acts.map(function (a) { return h('p', { class: 'ed-page', style: 'color:#b8b0a0' }, h('b', { text: names(a.title) + '  ' }), names(a.line)); }),
        seen('ending') ? h('p', { class: 'ed-page', style: 'color:#dfc06a', text: names('{star} is torn out and {rift} breathes warm again. Its pale roots go on below.') }) : null);
      const pages = h('div', { class: 'ed-list' }, h('div', { class: 'ed-h', text: 'Pages found  ' + have.length + ' / ' + meta.LORE.length }));
      have.forEach(function (i) {
        const pg = meta.LORE[i];
        if (pg) pages.appendChild(h('button', { type: 'button', class: 'ed-row', onclick: function () { ui._sfx('click'); showPage(i); } },
          ui._icon({ shape: 'scroll', color: '#d9cba3', accent: '#8f8470' }, 32), h('span', { class: 'n', text: pg.title })));
      });
      if (!have.length) pages.appendChild(h('div', { class: 'ed-note', text: 'Torn pages turn up in chests and on the strongest monsters.' }));
      return ui._frame('Journal', null, h('div', { class: 'ed-body' }, h('div', { class: 'ed-list' }, story, pages)));
    },
  });
})();
