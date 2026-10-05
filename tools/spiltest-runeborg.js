// Kører et kapitel af Runeborg uden menneske (åbn spillet med #foto=by, og kør:
//   eval(await (await fetch('/tools/spiltest-runeborg.js')).text()); await driveRB(2)
// )
// Kører et kapitel af Runeborg uden menneske: patcher UI, så alt går igennem, og validerer hver opgave.
// Brug: await driveRB(2)  — returnerer {opgaver, fejl, log}
window.driveRB = async function (kap) {
  const K = RB.content, D = RB.debug, g = D.g, UI = RB.ui;
  const fejl = [], log = [], specs = [];
  const orig = { say: UI.say, ask: UI.ask, task: UI.task, toast: UI.toast, ending: UI.ending, kapitelkort: UI.kapitelkort, sfx: RB.audio.sfx };
  UI.say = (who, text) => { if (typeof text !== 'string') fejl.push('say uden tekst'); return Promise.resolve(); };
  UI.ask = (who, text, ch) => { log.push('ask: ' + text.slice(0, 40)); return Promise.resolve(0); };
  UI.toast = () => {};
  UI.ending = async (rows, badges, opt) => { log.push('ending: ' + JSON.stringify(opt).slice(0, 80) + ' rows=' + rows.length); };
  UI.kapitelkort = () => Promise.resolve();
  RB.audio.sfx = () => {};
  UI.task = (T0) => {
    specs.push(T0);
    const p = (m) => fejl.push((T0.q || '?').slice(0, 50) + ' → ' + m);
    const t = T0.type;
    if (!T0.area) p('mangler area');
    if (!T0.q) p('mangler spørgsmål');
    if (t === 'choice') {
      const ok = (T0.opts || []).filter(o => o.ok).length;
      if (ok !== 1) p('choice: ' + ok + ' rigtige svar');
      (T0.opts || []).forEach(o => { if (!o.ok && !o.why) p('choice: svarmulighed uden why: ' + o.t.slice(0, 30)); });
    } else if (t === 'multi') {
      if (T0.check) {
        // find den rigtige delmængde ved at prøve alle (højst 6 muligheder)
        const n = T0.opts.length, goods = [];
        for (let m = 1; m < (1 << n); m++) { const sel = []; for (let i = 0; i < n; i++) if (m & (1 << i)) sel.push(i); const r = T0.check(sel.slice()); if (r && r.ok) goods.push(sel.join()); }
        if (goods.length < 1) p('multi/check: ingen rigtig løsning'); else log.push('check-løsninger: ' + goods.join(' | '));
      } else {
        const ok = (T0.opts || []).filter(o => o.ok).length;
        if (ok < 1) p('multi: ingen rigtige');
        (T0.opts || []).forEach(o => { if (!o.ok && !o.why) p('multi: falsk mulighed uden why: ' + o.t.slice(0, 30)); });
      }
    } else if (t === 'pick') {
      const doc = Array.isArray(T0.doc) ? T0.doc[T0.docIndex || 0] : T0.doc;
      if (!doc || !doc.lines) p('pick uden doc.lines');
      else if (!(T0.answer >= 0 && T0.answer < doc.lines.length)) p('pick: answer uden for linjerne');
    } else if (t === 'number') {
      if (typeof T0.answer !== 'number') p('number: answer mangler');
    } else if (t === 'sort') {
      if (!T0.cats || !T0.items) p('sort: cats/items mangler');
      else T0.items.forEach(it => { if (!(it.c >= 0 && it.c < T0.cats.length)) p('sort: ugyldig c'); });
    } else if (t === 'order') {
      if (!T0.items || T0.items.length < 3) p('order: for få trin');
    } else p('ukendt opgavetype ' + t);
    return Promise.resolve({ first: true });
  };
  try {
    const S = D.S;
    // Sørg for, at kapitlet kan startes
    for (let i = 1; i < kap; i++) if (S.klaret.indexOf(i) < 0) S.klaret.push(i);
    ['q0','q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'].forEach(q => { S.q[q] = 'done'; });   // kapitel 1 er klaret
    await window.__startKap(kap);
    const seq = window.__sekvens[kap];
    for (const step of seq) {
      const tid = performance.now();
      await K.talk(g, step);
      log.push(step + ' ok (' + Math.round(performance.now() - tid) + ' ms) q=' + JSON.stringify(Object.keys(S.q).filter(k => k.indexOf('k' + kap) === 0 && S.q[k] === 'done')));
    }
  } catch (e) { fejl.push('UNDTAGELSE: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  Object.assign(UI, { say: orig.say, ask: orig.ask, task: orig.task, toast: orig.toast, ending: orig.ending, kapitelkort: orig.kapitelkort });
  RB.audio.sfx = orig.sfx;
  return { opgaver: specs.length, fejl, log };
};

// Hvem man taler med, i hvilken rækkefølge, for at gennemspille et kapitel (efter at kapitlets intro har kørt)
window.__startKap = function (n) { return RB.debug.kapitel(n); };
window.__sekvens = {
  2: ['k2stA', 'k2stB', 'k2stC', 'fenja', 'tuk', 'brage', 'mads', 'fenja', 'fenja', 'fenja', 'mads', 'brage', 'brage', 'tuk', 'tuk'],
  3: ['tavle3', 'tilde', 'tilde', 'tilde', 'rane', 'vaegt', 'soeren', 'soeren', 'soeren', 'orla', 'maja', 'lampe']
};

// Er alt nåeligt? Bredde-først fra hver ankomstflise på hvert kort; tjekker personer, steder, ting, runestykker og døre.
// Brug: reachRB()  — returnerer en liste over problemer (tom = alt ok)
window.reachRB = function () {
  const K = RB.content, D = RB.debug, W = D.world(), S = D.S, probs = [];
  const maps = Object.keys(W);
  // ankomstflader: hvor døre fører hen, plus startpunkter for kapitlerne
  const arrive = {};
  maps.forEach(id => W[id].doors.forEach(d => { (arrive[d.to] = arrive[d.to] || []).push([d.tx, d.ty]); }));
  [1, 2, 3].forEach(k => { const st = K.kapitler[k] && K.kapitler[k].start; if (st) (arrive[st.map] = arrive[st.map] || []).push([st.x, st.y]); });
  arrive.laug = (arrive.laug || []).concat([[6, 5]]);
  const reach = {};
  maps.forEach(id => {
    const m = W[id], seen = {}, q = (arrive[id] || []).slice();
    q.forEach(p => { seen[p[0] + ',' + p[1]] = true; });
    while (q.length) {
      const [x, y] = q.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen[k] || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) return;
        if (m.solid(nx, ny)) return;
        seen[k] = true; q.push([nx, ny]);
      });
    }
    reach[id] = seen;
    if (!arrive[id]) probs.push('kort uden ankomst: ' + id);
  });
  const ok = (id, x, y) => !!reach[id][x + ',' + y];
  const naboOk = (id, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ok(id, x + dx, y + dy));
  // personer: prøv flere tilstande
  const states = [];
  [1, 2, 3].forEach(k => {
    states.push({ kap: k, q: {}, flags: {} });
    Object.keys(K.questList ? (function () { const o = {}; RB.content.questList(); return o; })() : {});
  });
  const qids = ['q0', 'q5', 'q10', 'k2q0', 'k2q1', 'k2q2', 'k2q3', 'k2q4', 'k2q5', 'k3q0', 'k3q5'];
  const keep = { kap: S.kap, q: S.q, flags: S.flags };
  [1, 2, 3].forEach(k => {
    qids.concat([null]).forEach(qid => {
      [{}, { clean: true, hildeFree: true, gateOpen: true, f_guard: true }, { k2_mads: true, k2_lys: true, k3_olie: true, k3_lys: true }].forEach(fl => {
        S.kap = k; S.q = qid ? { [qid]: 'active' } : {}; S.flags = fl;
        Object.keys(K.npcs).forEach(id => {
          const p = K.npcs[id].pos(S); if (!p) return;
          if (!W[p.map]) { probs.push('npc ' + id + ' på ukendt kort ' + p.map); return; }
          if (W[p.map].solid(p.x, p.y)) probs.push('npc ' + id + ' står i en solid flise: ' + p.map + ' ' + p.x + ',' + p.y);
          else if (!naboOk(p.map, p.x, p.y)) probs.push('npc ' + id + ' kan ikke nås: ' + p.map + ' ' + p.x + ',' + p.y + ' (kap ' + k + ', ' + (qid || '-') + ')');
        });
      });
    });
  });
  S.kap = keep.kap; S.q = keep.q; S.flags = keep.flags;
  K.things.forEach(t => { if (!W[t.map]) return probs.push('ting på ukendt kort ' + t.id); if (!ok(t.map, t.x, t.y) && !naboOk(t.map, t.x, t.y)) probs.push('ting ' + t.id + ' kan ikke nås'); });
  K.runes.forEach(r => { if (!W[r.map]) return probs.push('rune på ukendt kort ' + r.id); if (!ok(r.map, r.x, r.y)) probs.push('rune ' + r.id + ' ligger i en solid/utilgængelig flise ' + r.map + ' ' + r.x + ',' + r.y); });
  Object.keys(K.places).forEach(key => { const [id, xy] = key.split(':'), [x, y] = xy.split(',').map(Number); if (!W[id]) return probs.push('sted på ukendt kort ' + key); if (!naboOk(id, x, y)) probs.push('sted ' + key + ' (' + K.places[key] + ') kan ikke nås'); });
  Object.keys(K.lockedDoors).forEach(key => { const [id, xy] = key.split(':'), [x, y] = xy.split(',').map(Number); if (!naboOk(id, x, y)) probs.push('låst dør ' + key + ' kan ikke nås'); });
  maps.forEach(id => W[id].doors.forEach(d => { if (!ok(id, d.x, d.y)) probs.push('dør ' + id + ' ' + d.x + ',' + d.y + ' kan ikke nås'); if (!W[d.to]) probs.push('dør til ukendt kort ' + d.to); else if (W[d.to].solid(d.tx, d.ty)) probs.push('dør ' + id + '→' + d.to + ' lander i solid flise ' + d.tx + ',' + d.ty); }));
  return probs;
};
