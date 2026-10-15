// Story player (R4.1 → R7.7 campaign). The text is data in story_data.js (meta.STORY); this file decides when it plays:
// the opening on the first arrival in town, act intros/outros, the Elder's lines around each main step, side-quest
// lines, the finale, boss / Echo / corrupted-adventurer banners, town revival (flags.act / cleansed / warmth), lore + Journal.
// state.flags.storySeen = [key] (which scenes have played), state.flags.loreFound = [loreIndex]. Both are saved with flags.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const meta = G.meta = G.meta || {};
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h;
  const D = meta.STORY;
  const NAMES = D.NAMES;

  function names(text) {
    return String(text).replace(/\{(town|rift|Rift|rot|Rot|figure|Figure|king|ember)\}/g, function (m, k) {
      if (k === 'Rot') return NAMES.rot.charAt(0).toUpperCase() + NAMES.rot.slice(1);
      return NAMES[k] != null ? NAMES[k] : m;
    }).replace(/\{name\}/g, (S.player && S.player.name) || 'you');
  }
  meta._fillNames = names;
  const fill = function (lines) { return (lines || []).map(names); };
  ui._townName = function () { return NAMES.town; };
  ui._tagline = function () { return names(D.TAGLINE); };

  meta.LORE = D.LORE.map(function (p) { return { title: names(p.title), text: names(p.text) }; });

  // ---------- flags ----------
  function list(key) {
    const f = S.flags;
    if (!Array.isArray(f[key])) f[key] = [];
    return f[key];
  }
  function seen(key) { return list('storySeen').indexOf(key) >= 0; }
  function markSeen(key) { if (!seen(key)) list('storySeen').push(key); }

  // ---------- dialogue box ----------
  // lines: strings; opts: { who, sprite, onDone } — a speaker with a portrait, or narration without one. Tap to advance.
  const queue = [];
  let playing = false;
  function say(lines, opts) {
    if (!lines || !lines.length) { if (opts && opts.onDone) opts.onDone(); return; }
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

  function speaker(role, fallbackName) {
    const e = (S.entities || []).find(function (x) { return x.role === role; });
    return { who: (role === 'elder' && e && e.name) || fallbackName || 'The Elder',
      sprite: (e && e.sprite) || { body: 'humanoid', color: '#5a5a6a', accent: '#d8c9a3', scale: 1 } };
  }
  const elder = function () { return speaker('elder', 'The Elder'); };
  function fillBoss(lines, questId) {
    const m = (meta._MAIN || []).find(function (q) { return q.id === questId; });
    const name = m && meta._bossName ? meta._bossName(m.boss, m.bossName) : 'it';
    return lines.map(function (l) { return names(l.replace('{boss}', name)); });
  }

  // ---------- opening (first arrival in town) ----------
  function page(title, text, onClose) {
    let close = null;
    close = ui._modal(ui._dialog([h('div', { class: 'ed-tipname', text: title, style: 'color:#e8dec6' }),
      h('div', { class: 'ed-page', text: text })], [ui._btn(TX.common.close, function () { close(); if (onClose) onClose(); })], 'tip'), { dismiss: false, pause: true });
  }
  function opening() {
    const O = D.OPENING;
    say(fill(O.home), { onDone: function () {
      if (list('loreFound').indexOf(0) < 0) list('loreFound').push(0);      // the note is lore page 0
      page(names(O.note.title), names(O.note.text), function () {
        say(fill(O.arrival), { onDone: function () { say(fill(O.elder), elder()); } });
      });
    } });
  }
  G.on('scene:changed', function (e) {
    bossSeen = {};
    if (!e || e.scene !== 'town' || !S.player) return;
    syncTown(true);
    // heroes from before R7 saw the old premise; they skip the opening
    if (!seen('opening') && !seen('premise')) {
      markSeen('opening');
      setTimeout(opening, 400);
    }
  });

  // ---------- acts ----------
  function actAt(depth) {
    let a = null;
    for (const x of D.ACTS) if (depth >= x.from && (!x.to || depth <= x.to) && (!x.after || seen(x.after))) a = x;
    return a;
  }
  ui._actName = function (depth) { const a = actAt(depth); return a ? a.name : ''; };
  let actTimer = 0;
  G.on('scene:changed', function (e) {
    clearTimeout(actTimer);
    if (!e || e.scene !== 'dungeon' || !S.player) return;
    const act = actAt(S.depth | 0);
    if (!act || seen('act:' + act.n)) return;
    markSeen('act:' + act.n);
    actTimer = setTimeout(function () {       // after the floor-name banner (hud.js, 0.7 s)
      if (S.scene !== 'dungeon') return;
      ui._sfx('quest');
      say(fill(act.intro), {});
    }, 1600);
  });

  // ---------- main chain + side lines ----------
  G.on('quest:updated', function (e) {
    const q = e && e.quest;
    if (!q || q.status !== 'active') return;
    if (q.main && D.STEPS[q.id]) {
      const key = q.id + ':before';
      if (seen(key)) return;
      markSeen(key);
      say(fillBoss(D.STEPS[q.id].before, q.id), elder());
    } else if (q.side) {
      const st = sideStep(q);
      const key = q.id + ':' + q.step + ':before';
      if (!st || seen(key)) return;
      markSeen(key);
      say(fill(st.before), speaker(null, q.giverName));
    }
  });

  G.on('quest:completed', function (e) {
    const q = e && e.quest;
    if (!q) return;
    if (q.side) {
      const st = sideStep(q);
      const key = q.id + ':' + q.step + ':after';
      if (st && !seen(key)) { markSeen(key); say(fill(st.after), speaker(null, q.giverName)); }
      return;
    }
    if (!q.main || !D.STEPS[q.id]) return;
    const key = q.id + ':after';
    if (seen(key)) return;
    markSeen(key);
    say(fillBoss(D.STEPS[q.id].after, q.id), elder());
    const act = D.ACTS.find(function (a) { return a.endStep === q.id; });
    const MAIN = meta._MAIN || [];
    const last = MAIN.length && q.id === MAIN[MAIN.length - 1].id;
    if (last && !seen('finale')) {
      markSeen('finale');
      say(fill(D.FINALE), { onDone: unlockEndgame });
    } else if (act && act.outro && !seen('outro:' + act.n)) {
      markSeen('outro:' + act.n);
      say(fill(act.outro), { onDone: function () { syncTown(true); } });
      return;
    }
    syncTown(true);
  });
  function sideStep(q) {
    const line = D.SIDE.find(function (s) { return s.id === q.lineId; });
    return line ? line.steps[q.step] : null;
  }

  // ---------- town revival (R7.7) ----------
  // Derived from main-chain progress so old saves land in the right stage: flags.act, flags.cleansed, flags.warmth.
  function stage(act) {
    let s = D.TOWN[0];
    for (const t of D.TOWN) if (act >= t.act) s = t;
    return s;
  }
  function syncTown(announce) {
    const f = S.flags, q = S.quests, MAIN = meta._MAIN || [];
    if (!S.player || !q || !q.main) return;
    const step = Math.min(q.main.step | 0, MAIN.length);
    let act = 1;
    D.ACTS.forEach(function (a) {
      const i = MAIN.findIndex(function (m) { return m.id === a.endStep; });
      if (i >= 0 && step > i) act = Math.max(act, a.n + 1);
    });
    const cleansed = [];
    for (let i = 0; i < step; i++) if (MAIN[i].kind === 'boss') cleansed.push(MAIN[i].boss || 'depth_' + MAIN[i].depth);
    const before = f.act | 0;
    f.act = act;
    f.cleansed = cleansed;
    f.warmth = stage(act).warmth;
    if (announce && before && act > before && stage(act).news) {
      ui._banner(names(stage(act).news), '', '#ffb347', 6);
      G.emit('town:warmed', { act: act, warmth: f.warmth });
    }
  }
  meta._syncTown = syncTown;
  // NPC greeting for the current stage, and whether a vendor tab ('role:tab') is open yet.
  ui._townLine = function (role) {
    const act = S.flags.act | 0 || 1;
    for (let i = D.TOWN.length - 1; i >= 0; i--) if (act >= D.TOWN[i].act && D.TOWN[i].lines && D.TOWN[i].lines[role]) return names(D.TOWN[i].lines[role]);
    return '';
  };
  ui._serviceOpen = function (role, tab) {
    const id = role + ':' + tab, act = S.flags.act | 0 || 1;
    for (const t of D.TOWN) if (t.services && t.services.indexOf(id) >= 0 && act < t.act) return false;
    return true;
  };

  // ---------- endgame unlock (R5.2 / R5.5): after the finale ----------
  function giveTitle() {
    const f = S.flags;
    if (!Array.isArray(f.titles)) f.titles = [];
    f.titles = f.titles.filter(function (t) { return D.OLD_TITLES.indexOf(t) < 0; });
    if (f.titles.indexOf(D.TITLE) < 0) f.titles.push(D.TITLE);
    if (!f.title || D.OLD_TITLES.indexOf(f.title) >= 0) f.title = D.TITLE;
  }
  function unlockEndgame() {
    const f = S.flags;
    const first = !f.pallorUnlocked;
    f.pallorUnlocked = true;
    giveTitle();
    syncTown(false);
    if (G.meta.save) G.meta.save();
    ui._sfx('levelup');
    ui._banner(TX.story.titleEarned, D.TITLE, '#dfc06a', 5);
    if (first) setTimeout(function () { say(fill(D.PALLOR_INTRO), {}); }, 600);
  }
  ui._heroTitle = function () { return (S.player && typeof S.flags.title === 'string') ? S.flags.title : ''; };
  // Titles renamed since an older build are swapped (heroes who earned one keep their Pallor unlock).
  G.on('scene:changed', function (e) {
    if (!e || e.scene === 'menu' || !S.player || !Array.isArray(S.flags.titles)) return;
    if (S.flags.titles.some(function (t) { return D.OLD_TITLES.indexOf(t) >= 0; })) giveTitle();
  });

  // ---------- banners: bosses, the Echo, corrupted adventurers ----------
  // R6.2: the game marks its Echo with e.echo = true (other spellings accepted).
  function isEcho(e) {
    return !!e && (e.echo === true || e.isEcho === true || e.monsterId === 'echo' ||
      (typeof e.name === 'string' && e.name.indexOf('Echo of ') === 0));
  }
  ui._isEcho = isEcho;
  function echoName(e) {
    if (e && typeof e.name === 'string' && e.name.indexOf('Echo of ') === 0) return e.name;
    return names(D.ECHO.title);
  }
  ui._echoName = echoName;
  ui._echoText = function (key, depth) { return names(String(D.ECHO[key] || '').replace('{depth}', depth == null ? '?' : depth)); };
  function adventurer(e) {
    const id = e.adventurerId || (typeof e.monsterId === 'string' && e.monsterId.indexOf('adv_') === 0 ? e.monsterId.slice(4) : null);
    return id ? D.ADVENTURERS.find(function (a) { return a.id === id; }) || null : null;
  }

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
      if (e.dead || bossSeen[e.id] || e.type === 'npc' || (e.faction && e.faction !== 'enemy')) continue;
      const echo = isEcho(e), adv = echo ? null : adventurer(e);
      if (!echo && !adv && e.rarity !== 'boss') continue;
      const tx = Math.floor(e.x), ty = Math.floor(e.y);
      const lit = map.visible && map.w ? map.visible[ty * map.w + tx] : 0;
      const dx = e.x - p.x, dy = e.y - p.y;
      if (!lit && dx * dx + dy * dy > 100) continue;
      bossSeen[e.id] = true;
      if (echo) { ui._banner(echoName(e), '“' + names(D.ECHO.intro) + '”', '#bfe6ff', 5); ui._sfx('shrine'); continue; }
      if (adv) { ui._banner(names(adv.name), '“' + names(adv.intro) + '”', '#c96aff', 5); continue; }
      const lines = D.BOSS_LINES[e.monsterId];
      ui._banner(bossTitle(e), lines ? '“' + names(lines.intro) + '”' : '', '#ff6a5a', 5);
    }
  });
  G.on('monster:killed', function (e) {
    const m = e && e.monster;
    if (!m || (m.faction && m.faction !== 'enemy')) return;
    if (isEcho(m)) { ui._banner(echoName(m) + TX.story.falls, names(D.ECHO.death), '#bfe6ff', 6); return; }
    const adv = adventurer(m);
    if (adv) { ui._banner(names(adv.name) + TX.story.falls, names(adv.death), '#c96aff', 6); return; }
    if (m.rarity !== 'boss') return;
    const lines = D.BOSS_LINES[m.monsterId];
    ui._banner(bossTitle(m) + TX.story.falls, lines ? names(lines.death) : '', '#dfc06a', 6);
  });

  // ---------- lore pages ----------
  function showPage(i) {
    const pg = meta.LORE[i];
    if (pg) page(pg.title, pg.text);
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
      const story = h('div', { class: 'ed-box' }, h('div', { class: 'ed-h', text: TX.story.theTaleSoFar }),
        h('p', { class: 'ed-page', text: names('Your home was burned. A man in grey sent you to {town}, a cold town over a rotting rift. Its Elder asked you to cleanse it.') }),
        D.ACTS.filter(function (a) { return seen('act:' + a.n); }).map(function (a) {
          return h('p', { class: 'ed-page', style: 'color:#b8b0a0' }, h('b', { text: names(a.intro[0]) + '  ' }), names(a.intro[1]));
        }),
        seen('finale') ? h('p', { class: 'ed-page', style: 'color:#dfc06a', text: names('The Hearthking is dead and {town} is warm. You carry {ember} now.') }) : null);
      const pages = h('div', { class: 'ed-list' }, h('div', { class: 'ed-h', text: TX.story.pagesFound + have.length + ' / ' + meta.LORE.length }));
      have.forEach(function (i) {
        const pg = meta.LORE[i];
        if (pg) pages.appendChild(h('button', { type: 'button', class: 'ed-row', onclick: function () { ui._sfx('click'); showPage(i); } },
          ui._icon({ shape: 'scroll', color: '#d9cba3', accent: '#8f8470' }, 32), h('span', { class: 'n', text: pg.title })));
      });
      if (!have.length) pages.appendChild(h('div', { class: 'ed-note', text: TX.story.tornPagesTurnUp }));
      // R7.10 / R7.11: the Relics and the Collection Book are one tap from the journal, wherever the player is
      const right = [];
      if (ui._relicsBody && G.items && G.items.RELICS) right.push(ui._btn(TX.common.relics, function () { ui.open('relics'); }));
      if (ui._frame && G.meta && G.meta.getMilestones) right.push(ui._btn(TX.common.milestones, function () { ui.open('milestones'); }));
      if (G.game && typeof G.game.getClassGoals === 'function') right.push(ui._btn(TX.goals.classGoals, function () { ui.open('classgoals'); }));
      if (ui._bookBody && G.items && G.items.collection) right.push(ui._btn(TX.common.book, function () { ui.open('collection'); }));
      return ui._frame(TX.common.journal, null, h('div', { class: 'ed-body' }, right.length ? h('div', { class: 'ed-seg', style: 'flex-wrap:wrap;margin-bottom:8px' }, right) : null, h('div', { class: 'ed-list' }, story, pages)));
    },
  });

  // ---------- the rift core (R10): the finale screen ----------
  // object:interact { type: 'rift_core' } after the Hearthking. The finale lines play once (also covered by the main-quest path),
  // then a closing screen with the run's numbers; leaving it unlocks the endgame (title, Pallor) exactly once.
  ui._register('finale', {
    locked: false,
    render: function () {
      const mins = Math.floor((S.time || 0) / 60), f = S.flags;
      const relics = G.items && G.items.relicCount ? G.items.relicCount() : 0;
      const leave = function (home) { ui.close(); unlockEndgame(); if (home) G.scenes.enterTown(); };
      return ui._frame(TX.story.theRiftCore, { noClose: true }, h('div', { class: 'ed-body' }, h('div', { class: 'ed-list', style: 'text-align:center' },
        h('div', { style: 'display:flex;justify-content:center;margin:6px 0' }, ui._emblem(64, true)),
        h('p', { class: 'ed-page', style: 'color:#dfc06a', text: names('The Hearthking is dead and {town} is warm. You carry {ember} now.') }),
        h('div', { class: 'ed-box' },
          h('div', { class: 'ed-kv' }, h('span', { text: TX.story.timePlayed }), h('b', { text: mins + TX.story.min })),
          h('div', { class: 'ed-kv' }, h('span', { text: TX.common.foesSlain }), h('b', { text: String(f.kills | 0) })),
          h('div', { class: 'ed-kv' }, h('span', { text: TX.story.deaths }), h('b', { text: String(f.deaths | 0) })),
          relics ? h('div', { class: 'ed-kv' }, h('span', { text: TX.story.relicsOfTheFallen }), h('b', { text: relics + ' / 10' })) : null),
        h('p', { class: 'ed-note', text: names('The rift goes on below. The deeper floors are open, and the Ember is hungry.') }),
        ui._btn('Go home to {town}'.replace('{town}', ui._townName()), function () { leave(true); }, 'big gold'),
        ui._btn(TX.story.keepDescending, function () { leave(false); }, 'big'))));
    },
  });
  G.on('object:interact', function (e) {
    if (!e || e.type !== 'rift_core' || !S.player || S.scene !== 'dungeon' || seen('finale_screen')) return;
    markSeen('finale_screen');
    const show = function () { ui.open('finale'); };
    if (!seen('finale')) { markSeen('finale'); say(fill(D.FINALE), { onDone: show }); } else show();
  });
})();
