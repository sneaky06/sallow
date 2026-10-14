// Placeholder story (R4.1): premise, the Elder's lines around each main-chain step, boss banners, the ending, lore pages
// and the Journal. All text is data here; quests.js owns the chain itself. Tone: grim, terse, a little strange.
// state.flags.storySeen = [key] (which scenes have played), state.flags.loreFound = [loreIndex]. Both are saved with flags.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const meta = G.meta = G.meta || {};
  const ui = G.ui;
  const h = ui._h;

  const PREMISE = [
    'Emberfall was built around a well that breathed warm air up from below. For three hundred years the town never knew winter.',
    'This year the well breathes cold. The hearths will not catch. People are turning grey and slow, and some have forgotten their names.',
    'Something at the bottom is drinking the warmth. The Elder has been waiting for someone foolish enough to go and look.',
  ];

  // Elder lines before (on accepting) and after (on claiming) each main step, keyed by quest id. {boss} = the boss's name.
  const STEPS = {
    main_1: { before: ['You came up the north road. Then you saw our fires.', 'They burn, but they give nothing. The well breathes cold now.', 'Go down. Not far. Tell me what is breathing.'],
      after: ['Bones that walk. Doors that open from the inside.', 'So it is true. Something below is awake, and it is hungry for heat.'] },
    main_2: { before: ['There is a crowned thing down there. {boss}.', 'It keeps the names of our dead and counts them every night.', 'Break the count.'],
      after: ['The bells rang by themselves when it fell.', 'Old Marta remembered her daughter\'s name this morning. First time in a year.'] },
    main_3: { before: ['The crypt was only the lid. Under it the stone goes soft and wet.', 'Some of what you find down there was ours once. Bring nothing back that still moves.'],
      after: ['Water that remembers voices. I do not like how plainly you said that.', 'Rest. The cold got worse while you were gone.'] },
    main_4: { before: ['{boss}. The miners called her Mother, before they stopped coming home.', 'She is fat on our warmth. Every child of hers was a hearth up here.'],
      after: ['Three hearths caught last night. Three.', 'Below her nest the rock is red. They say there was real fire there once, before ours.'] },
    main_5: { before: ['The old fire is older than the town. It still burns, but it gives no heat. Like ours.', 'Walk it. Drink nothing down there.'],
      after: ['You smell of ash that is not ash.', 'Someone is keeping that fire. Someone who does not want to share.'] },
    main_6: { before: ['{boss} sits on what is left of the fire, the way a miser sits on coin.', 'Take it back. I do not care how.'],
      after: ['The well breathed warm for an hour. Then cold again.', 'So the fire was never the bottom. Something under it drinks even that.'] },
    main_7: { before: ['Past the fire there is nothing. No stone, no water. Only a quiet that listens.', 'I have heard it in my sleep. It says your name, not mine.'],
      after: ['You came back. I did not think you would.', 'It knows you now. That might be useful. It might not.'] },
    main_8: { before: ['{boss}. It was here before the well, before the town, before the fire.', 'It is not cruel. It is thirsty. That is worse.', 'Go to the end. Make it stop drinking.'],
      after: ['Listen. The well is breathing warm.', 'Children are shouting in the square. I had forgotten that sound.'] },
  };

  const ENDING = [
    'That night every hearth in Emberfall caught at once.',
    'The Elder slept for the first time in years, and did not dream.',
    'But at the bottom of the well, where the thirsty thing had been, there is a stair.',
    'It goes down. It is warm. Something is climbing it.',
    'The deeper floors are open. Nothing down there has a name yet.',
  ];

  // One line when a boss is first seen on a floor, one when it dies. Keyed by monsterId.
  const BOSS_LINES = {
    boss_gravelord: { intro: 'Another name for the ledger.', death: 'The ledger burns. A hundred names go home.' },
    boss_broodmother: { intro: 'Warm. You are so warm.', death: 'Her children scatter into the dark, cold and small.' },
    boss_tyrant: { intro: 'Mine. All of it is mine.', death: 'The embers spill loose. For a moment the deep is bright.' },
    boss_hollow: { intro: '...thirsty...', death: 'The quiet ends. Far above, a well begins to breathe.' },
  };

  meta.LORE = [
    { title: 'The Well Charter', text: 'Founded in the year of the long frost, around the breathing well. Let no fire be lit in Emberfall that the well did not warm first.\n— the first Elder' },
    { title: 'Miner\'s Tally', text: 'Day 1: warm seam. Day 9: seam colder. Day 14: Dav says the rock is humming.\nDay 15: Dav gone.\nDay 16: we hear him humming.' },
    { title: 'A Gravestone', text: 'The name has been scratched away. The scratches are on the inside of the lid.' },
    { title: 'A Child\'s Drawing', text: 'A house, a sun, a well. Under the well, in black, a much bigger sun with an open mouth.' },
    { title: 'The Ledger, First Page', text: 'Names, thousands of them, in a hand that never lifts from the page. Each one crossed through twice.' },
    { title: 'Priest\'s Note', text: 'Bury them face down. They climb toward warmth.' },
    { title: 'On the Brood', text: 'She does not hunt. She waits where the heat collects and lets it come to her.\nSo did we, once.' },
    { title: 'Water Hymn', text: 'Below the stone, the water keeps every voice that falls into it.\nDo not shout in the caves. Do not answer.' },
    { title: 'Smith\'s Complaint', text: 'Iron from the deep seams will not hold an edge in daylight. At night it is the best steel I have ever forged. I have stopped asking why.' },
    { title: 'The Old Fire', text: 'Before Emberfall there was a city here that kept a flame with no smoke. Its ash is the red soil of the deep roads.' },
    { title: 'Contract of Embers', text: 'I, keeper of the old fire, swear to hold it against the cold below for as long as the town above remembers me.\n\nThe town did not remember.' },
    { title: 'A Last Letter', text: 'If you find this, the stair is behind the third pillar. I went down because I heard my mother calling.\nMy mother is upstairs.' },
    { title: 'Survey of the Deep', text: 'No floor. No wall. Distance behaves badly. We dropped a lamp and it fell upward for a while.' },
    { title: 'Torn Sermon', text: 'It is not a god. Gods want things. It only drinks.' },
    { title: 'The Elder\'s Diary', text: 'I was the first to go grey. I hide it with soot. If the stranger fails there is no one after, and I will not remember why I waited.' },
    { title: 'Scratched on the Lowest Step', text: 'There is more below. It is warm.\nDo not follow the warmth.' },
  ];

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
    return lines.map(function (l) { return l.replace('{boss}', name); });
  }

  // ---------- story beats driven by contract events ----------
  // Premise on the first arrival in town; before-lines when a main step is accepted; after-lines when it is turned in;
  // the ending after the last one. Each plays once per hero (storySeen is saved).
  G.on('scene:changed', function (e) {
    bossSeen = {};
    if (!e || e.scene !== 'town' || !S.player) return;
    if (!seen('premise')) {
      markSeen('premise');
      setTimeout(function () { say(PREMISE, {}); }, 400);
    }
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
      say(ENDING, { onDone: unlockEndgame });
    }
  });

  // ---------- endgame unlock (R5.2 / R5.5) ----------
  // When the ending has been read: Pallor switches on, the hero earns a title, deeper floors are open.
  const TITLE = 'Warden of the Well';
  function unlockEndgame() {
    const f = S.flags;
    const first = !f.pallorUnlocked;
    f.pallorUnlocked = true;
    if (!Array.isArray(f.titles)) f.titles = [];
    if (f.titles.indexOf(TITLE) < 0) f.titles.push(TITLE);
    if (!f.title) f.title = TITLE;
    if (G.meta.save) G.meta.save();
    if (first) {
      ui._sfx('levelup');
      ui._banner('Title earned', TITLE, '#dfc06a', 5);
      setTimeout(function () {
        say(['Every floor you go down without coming home, the dark leaches a little more colour out of you. That is Pallor.',
          'The paler you are, the richer the deep pays — and the harder it bites. Some finds come back bleached, hiding something until you bring them home.',
          'Come home, and the colour returns. Die pale, and the bleached things stay below with your corpse.'], {});
      }, 600);
    }
  }
  ui._heroTitle = function () { return (S.player && typeof S.flags.title === 'string') ? S.flags.title : ''; };
  // A hero who read the ending before this build still gets the unlock (once, quietly).
  G.on('scene:changed', function (e) {
    if (e && e.scene !== 'menu' && S.player && seen('ending') && !S.flags.pallorUnlocked) {
      S.flags.pallorUnlocked = true;
      if (!Array.isArray(S.flags.titles)) S.flags.titles = [];
      if (S.flags.titles.indexOf(TITLE) < 0) S.flags.titles.push(TITLE);
      if (!S.flags.title) S.flags.title = TITLE;
    }
  });

  // ---------- boss banners ----------
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
      if (e.rarity !== 'boss' || e.dead || bossSeen[e.id] || (e.faction && e.faction !== 'enemy')) continue;
      const tx = Math.floor(e.x), ty = Math.floor(e.y);
      const lit = map.visible && map.w ? map.visible[ty * map.w + tx] : 0;
      const dx = e.x - p.x, dy = e.y - p.y;
      if (!lit && dx * dx + dy * dy > 100) continue;
      bossSeen[e.id] = true;
      const lines = BOSS_LINES[e.monsterId];
      ui._banner(bossTitle(e), lines ? '“' + lines.intro + '”' : '', '#ff6a5a', 5);
    }
  });
  G.on('monster:killed', function (e) {
    const m = e && e.monster;
    if (!m || m.rarity !== 'boss' || (m.faction && m.faction !== 'enemy')) return;
    const lines = BOSS_LINES[m.monsterId];
    ui._banner(bossTitle(m) + ' falls', lines ? lines.death : '', '#dfc06a', 6);
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
      const story = h('div', { class: 'ed-box' }, h('div', { class: 'ed-h', text: 'The tale so far' }),
        PREMISE.map(function (t) { return h('p', { class: 'ed-page', text: t }); }),
        seen('ending') ? h('p', { class: 'ed-page', style: 'color:#dfc06a', text: 'The well breathes warm again. There is a stair below the bottom.' }) : null);
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
