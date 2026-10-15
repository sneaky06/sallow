// Skill tree panel: auto-build selector on top, three trees with prerequisite lines, details pane, slot assignment, respec.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h;

  const AUTO = [
    { mode: 'single', label: TX.skills.singleTarget, desc: TX.skills.bossKillerPointsGo },
    { mode: 'aoe', label: TX.skills.groupDamage, desc: TX.skills.packClearerPointsGo },
    { mode: 'balanced', label: TX.skills.balanced, desc: TX.skills.aBitOfBoth },
    { mode: null, label: TX.skills.manual, desc: TX.skills.youPlaceEveryPoint },
  ];
  const TAG = { single: 'Single target', aoe: 'Group', defense: 'Defense', mobility: 'Mobility', summon: 'Summon', buff: 'Buff' };
  const CW = 72, RH = 74, NODE = 48;
  const SVG = 'http://www.w3.org/2000/svg';

  function info(id) {
    const p = S.player;
    let out = null;
    if (G.game.getSkillInfo) { try { out = G.game.getSkillInfo(id); } catch (err) { out = null; } }
    if (!out) {
      const sk = G.game.SKILLS[id] || { id: id, name: id };
      const can = G.game.canLearn ? G.game.canLearn(id) : { ok: false };
      out = Object.assign({}, sk, { rank: (p.skills && p.skills[id]) || 0, learnable: !!(can && can.ok), lockedReason: can && can.reason });
    }
    return out;
  }

  function autoBar(p) {
    return h('div', { class: 'ed-auto' }, AUTO.map(function (a) {
      const on = (p.autoBuild || null) === a.mode;
      return h('button', { type: 'button', class: 'ed-autobtn' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: function () {
        ui._sfx('click');
        if (G.game.setAutoBuild) G.game.setAutoBuild(a.mode); else p.autoBuild = a.mode;
        ui.toast(a.mode ? TX.skills.autoBuild + a.label : 'Manual build', '#ffd94a');
        ui._refresh();
      } }, h('b', { text: a.label }), h('small', { text: a.desc }));
    }));
  }

  function layout(ids) {
    const SK = G.game.SKILLS;
    const list = ids.map(function (id) { return SK[id]; }).filter(Boolean);
    let ok = list.length > 0, minR = Infinity, minC = Infinity;
    const seen = {};
    for (const s of list) {
      if (typeof s.row !== 'number' || typeof s.col !== 'number') { ok = false; break; }
      const key = s.row + ':' + s.col;
      if (seen[key]) { ok = false; break; }
      seen[key] = 1;
      minR = Math.min(minR, s.row); minC = Math.min(minC, s.col);
    }
    const pos = {};
    let rows = 0, cols = 0;
    list.forEach(function (s, i) {
      const r = ok ? s.row - minR : Math.floor(i / 3), c = ok ? s.col - minC : i % 3;
      pos[s.id] = { r: r, c: c, x: c * CW + (CW - NODE) / 2, y: r * RH + 2 };
      rows = Math.max(rows, r + 1); cols = Math.max(cols, c + 1);
    });
    return { list: list, pos: pos, w: cols * CW, h: rows * RH };
  }

  function treeEl(tree, view, p) {
    const L = layout(tree.skills || []);
    const box = h('div', { class: 'ed-tree', style: 'width:' + L.w + 'px;height:' + L.h + 'px' });
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('width', L.w); svg.setAttribute('height', L.h);
    svg.setAttribute('shape-rendering', 'crispEdges');
    box.appendChild(svg);
    for (const s of L.list) {
      const at = L.pos[s.id];
      const req = s.requires && L.pos[s.requires];
      if (req) {
        const x1 = req.x + NODE / 2, y1 = req.y + NODE / 2, x2 = at.x + NODE / 2, y2 = at.y + NODE / 2, ym = Math.round((y1 + y2) / 2) + 8;
        const line = document.createElementNS(SVG, 'polyline');
        line.setAttribute('points', x1 + ',' + y1 + ' ' + x1 + ',' + ym + ' ' + x2 + ',' + ym + ' ' + x2 + ',' + y2);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', (p.skills && p.skills[s.requires]) ? '#c9a227' : '#4a4354');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
      }
      const i = info(s.id);
      const rank = i.rank | 0;
      const cls = 'ed-node' + (rank > 0 ? ' has' : (i.learnable ? '' : ' locked')) + (i.learnable ? ' can' : '') +
        (view.sel === s.id ? ' sel' : '') + (s.kind === 'passive' ? ' passive' : '');
      box.appendChild(h('button', { type: 'button', class: cls, style: 'left:' + at.x + 'px;top:' + at.y + 'px', 'aria-label': s.name, onclick: function () {
        if (view.sel === s.id && i.learnable) learn(s.id);
        else { ui._sfx('click'); view.sel = s.id; ui._refreshNow(); }
      } }, ui._icon(s.icon, 36), h('em', { text: rank + '/' + (s.maxRank || 1) })));
    }
    return box;
  }

  function learn(id) {
    const done = G.game.learnSkill ? G.game.learnSkill(id) : false;
    ui._sfx(done ? 'levelup' : 'error');
    ui._refreshNow();
  }

  function details(view, p) {
    const box = h('div', { class: 'ed-skinfo' });
    if (!view.sel || !G.game.SKILLS[view.sel]) {
      box.appendChild(h('div', { class: 'ed-note', text: TX.skills.tapASkillTo }));
      return box;
    }
    const i = info(view.sel);
    const rank = i.rank | 0, max = i.maxRank || 1;
    const pips = h('span', { class: 'ed-pips' });
    for (let n = 0; n < max; n++) pips.appendChild(h('i', { class: n < rank ? 'f' : null }));
    box.appendChild(h('div', null, h('b', { class: 'ed-ember', text: i.name }), pips));
    const tags = (i.tags || []).map(function (t) { return TAG[t] || t; });
    box.appendChild(h('div', { class: 'ed-note', text: [i.kind === 'passive' ? 'Passive' : 'Active'].concat(tags).join(' · ') }));
    box.appendChild(h('div', { style: 'margin:4px 0', text: i.desc || '' }));
    const meta = [];
    if (i.mpCost) meta.push(TX.skills.mana + ui._fmt(i.mpCost));
    if (i.cooldown) meta.push(TX.skills.cooldown + ui._fmt(i.cooldown) + 's');
    if (meta.length) box.appendChild(h('div', { style: 'color:#8ab0ff', text: meta.join('   ') }));
    if (i.nextRankDesc && rank < max) box.appendChild(h('div', { class: 'ed-good', text: TX.skills.nextRank + i.nextRankDesc }));
    if (!i.learnable && rank < max && i.lockedReason) box.appendChild(h('div', { class: 'ed-bad', text: i.lockedReason }));
    // R3.8 synergies: points in another skill feed this one; active ones (you have ranks there) are lit
    const syn = Array.isArray(i.synergies) ? i.synergies : [];
    if (syn.length) {
      box.appendChild(h('div', { class: 'ed-h', style: 'margin-top:6px', text: TX.skills.synergies }));
      for (const s of syn) {
        const nm = s.name || (G.game.SKILLS[s.from] && G.game.SKILLS[s.from].name) || s.from;
        box.appendChild(h('div', { class: 'ed-syn' + (s.active ? ' on' : '') },
          h('b', { text: (s.active ? '✔ ' : '• ') + nm + (s.combo ? '  (combo)' : '') }), s.desc ? h('small', { text: s.desc }) : null));
      }
    }
    const row = h('div', { class: 'ed-slots' });
    if (rank < max) {
      const b = ui._btn(rank > 0 ? 'Rank up' : 'Learn', function () { learn(i.id); }, 'gold');
      if (!i.learnable) b.disabled = true;
      row.appendChild(b);
    } else row.appendChild(h('span', { class: 'ed-gold', text: TX.skills.mastered }));
    if (i.kind !== 'passive' && rank > 0) {
      row.appendChild(h('span', { class: 'ed-note', text: TX.skills.slot }));
      for (let s = 0; s < C.SKILL_SLOTS; s++) {
        const curId = p.skillBar && p.skillBar[s];
        const b = ui._btn(curId && G.game.SKILLS[curId] ? ui._icon(G.game.SKILLS[curId].icon, 28) : String(s + 1), function () {
          if (G.game.setSkillSlot) {
            if (curId === i.id) G.game.setSkillSlot(s, null);
            else {
              // one slot per skill: moving a skill frees the slot it came from
              for (let o = 0; o < C.SKILL_SLOTS; o++) if (o !== s && p.skillBar[o] === i.id) G.game.setSkillSlot(o, null);
              G.game.setSkillSlot(s, i.id);
            }
          }
          ui._refreshNow();
        }, curId === i.id ? 'on' : '');
        b.setAttribute('aria-label', 'Skill slot ' + (s + 1));
        row.appendChild(b);
      }
    }
    box.appendChild(row);
    return box;
  }

  function respec(p) {
    let cost = null;
    if (G.game.getRespecCost) { try { cost = G.game.getRespecCost(); } catch (err) { cost = null; } }
    ui._confirm(TX.skills.unlearnEverythingAllSkill + (cost != null ? TX.filter.for + ui._fmt(cost) + TX.filter.gold : ' for a fee in gold.'),
      'Respec', function () {
        const done = G.game.respec ? G.game.respec() : false;
        if (done) ui.toast(TX.skills.yourPointsHaveBeen, '#ffd94a');
        else { ui._sfx('error'); ui.toast(TX.skills.theRespecFailedNot, '#ff5b5b'); }
        ui._refresh();
      }, { danger: true, note: TX.skills.youHave + ui._fmt(p.gold || 0) + TX.filter.gold });
  }

  ui._register('skills', {
    render: function (view) {
      const p = S.player;
      const cls = p && G.game && G.game.CLASSES && G.game.CLASSES[p.classId];
      if (!cls || !G.game.SKILLS) return ui._frame(TX.common.skills, null, h('div', { class: 'ed-body', text: TX.skills.skillsAreNotAvailable }));
      const trees = cls.trees || [];
      if (!(view.tree >= 0 && view.tree < trees.length)) {
        view.tree = 0;
        // opened with points to spend: pre-select the first learnable skill so "Learn" is one tap away
        if ((p.skillPoints | 0) > 0 && !view.sel) {
          trees.some(function (t, ti) {
            const id = (t.skills || []).find(function (sid) { const x = info(sid); return x && x.learnable; });
            if (id) { view.tree = ti; view.sel = id; }
            return !!id;
          });
        }
      }
      const tree = trees[view.tree];
      const sp = p.skillPoints | 0;
      const tabs = h('div', { class: 'ed-sktabs' }, trees.map(function (t, i) {
        return h('button', { type: 'button', class: 'ed-tab' + (i === view.tree ? ' on' : ''), onclick: function () { ui._sfx('click'); view.tree = i; ui._refreshNow(); } }, t.name);
      }));
      const main = h('div', { class: 'ed-skmain' },
        h('div', { class: 'ed-skleft' }, tabs,
          h('div', { class: 'ed-treewrap' }, tree && tree.desc ? h('div', { class: 'ed-note', style: 'text-align:center;margin-bottom:8px', text: tree.desc }) : null, tree ? treeEl(tree, view, p) : null)),
        details(view, p));
      const ptabs = ui._perkTabs ? ui._perkTabs() : null;
      return ui._frame(TX.common.skills, {
        tabs: ptabs, tab: 'skills', onTab: function (id) { if (id === 'perks') ui.open('perks'); },
        right: [h('span', { class: sp > 0 ? 'ed-gold' : 'ed-dim', style: 'margin-right:4px;white-space:nowrap', text: sp + ' pt' + (sp === 1 ? '' : 's') }),
          ui._btn(TX.common.respec, function () { respec(p); })],
        sub: autoBar(p),
      }, main);
    },
  });
})();
