// Gennemspiller kapitler i Regnehelten uden menneske og tjekker, at alle kort kan nås.
// Åbn spillet med #foto=by (så intet bliver gemt), og kør i konsollen:
//   eval(await (await fetch('/tools/spiltest-regnehelten.js')).text()); await driveRH(2); reachRH()
// Opgaverne selv (tal, klassetrin) tjekkes af tools/regnehelten-tjek.py — her tester vi kun flowet.

window.__sekvensRH = {
  2: ['buschauffoer', 'billet', 'kioskdame', 'kioskdame', 'passer', 'passer', 'poulsen', 'passer'],
  3: ['far', 'bager', 'frugtmand', 'blomsterkone', 'loppe', 'loppe', 'ida', 'far']
};

window.driveRH = async function (kap) {
  const K = RH.content, D = RH.debug, g = D.g, UI = RH.ui, S = D.S;
  const fejl = [], log = [], specs = [];
  const orig = { say: UI.say, ask: UI.ask, opgave: UI.opgave, toast: UI.toast, ending: UI.ending, kapitelkort: UI.kapitelkort, sfx: RH.audio.sfx };
  UI.say = (who, text) => { if (typeof text !== 'string') fejl.push('say uden tekst'); return Promise.resolve(); };
  UI.ask = () => Promise.resolve(0);
  UI.toast = () => {};
  UI.ending = async (rows, badges, ord, poulsen, opt) => { log.push('ending: ' + JSON.stringify(opt).slice(0, 90) + ' rows=' + rows.length); };
  UI.kapitelkort = () => Promise.resolve();
  RH.audio.sfx = () => {};
  UI.opgave = (sp) => { specs.push(sp); if (!sp.q) fejl.push('opgave uden spørgsmål'); return Promise.resolve({ first: true, tries: 1, klaret: true }); };
  try {
    // klassen skal tælle op: startKlasse 3 → kapitel 2 er 4. klasse, kapitel 3 er 5.
    S.startKlasse = 3; S.klasse = 3;
    ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'].forEach(q => { S.q[q] = 'done'; });
    for (let i = 1; i < kap; i++) if (S.klaret.indexOf(i) < 0) S.klaret.push(i);
    await D.kapitel(kap);
    log.push('klasse efter kapitelstart: ' + S.klasse + ', kap ' + S.kap + ', kort ' + S.map);
    for (const step of window.__sekvensRH[kap]) {
      const tid = performance.now();
      await K.talk(g, step);
      log.push(step + ' ok (' + Math.round(performance.now() - tid) + ' ms) klaret=' + JSON.stringify(Object.keys(S.q).filter(k => k.indexOf('k' + kap) === 0 && S.q[k] === 'done')));
    }
    log.push('S.klaret=' + JSON.stringify(S.klaret) + ' tasken=' + S.bag.owned.length);
  } catch (e) { fejl.push('UNDTAGELSE: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  Object.assign(UI, { say: orig.say, ask: orig.ask, opgave: orig.opgave, toast: orig.toast, ending: orig.ending, kapitelkort: orig.kapitelkort });
  RH.audio.sfx = orig.sfx;
  return { opgavesaet: specs.length, fejl, log };
};

// Er alt nåeligt? Bredde-først fra hver ankomstflise (med alle låse åbne).
window.reachRH = function () {
  const K = RH.content, D = RH.debug, W = D.world(), S = D.S, probs = [];
  const keep = { kap: S.kap, q: S.q, flags: S.flags, cut: S.cut, klaret: S.klaret };
  const alleFlag = { hjemUd: true, skolegaard: true, skoleInd: true, klasseInd: true, zooInd: true };
  S.flags = alleFlag;
  const maps = Object.keys(W), arrive = {};
  maps.forEach(id => W[id].doors.forEach(d => { (arrive[d.to] = arrive[d.to] || []).push([d.tx, d.ty]); }));
  [1, 2, 3].forEach(k => { const st = K.kapitler[k] && K.kapitler[k].start; if (st) (arrive[st.map] = arrive[st.map] || []).push([st.x, st.y]); });
  (arrive.klasse = arrive.klasse || []).push([8, 9]); (arrive.hjem = arrive.hjem || []).push([4, 3]);
  const reach = {};
  maps.forEach(id => {
    const m = W[id], seen = {}, q = (arrive[id] || []).slice();
    q.forEach(p => { seen[p[0] + ',' + p[1]] = true; });
    while (q.length) {
      const [x, y] = q.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen[k] || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || m.solid(nx, ny)) return;
        seen[k] = true; q.push([nx, ny]);
      });
    }
    reach[id] = seen;
    if (!arrive[id]) probs.push('kort uden ankomst: ' + id);
  });
  const ok = (id, x, y) => !!reach[id][x + ',' + y];
  const naboOk = (id, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ok(id, x + dx, y + dy));
  const qids = ['q0', 'q2', 'q5', 'k2q0', 'k2q1', 'k2q2', 'k2q3', 'k2q4', 'k2q5', 'k3q0', 'k3q4', 'k3q5'];
  [1, 2, 3].forEach(k => {
    qids.concat([null]).forEach(qid => {
      [false, true].forEach(cut => {
        S.kap = k; S.q = qid ? { [qid]: 'active' } : {}; S.cut = cut; S.klaret = k === 3 ? [1, 2, 3] : [];
        Object.keys(K.npcs).forEach(id => {
          const p = K.npcs[id].pos(S); if (!p) return;
          if (!W[p.map]) { probs.push('npc ' + id + ' på ukendt kort ' + p.map); return; }
          if (W[p.map].solid(p.x, p.y)) probs.push('npc ' + id + ' står i en solid flise: ' + p.map + ' ' + p.x + ',' + p.y + ' (kap ' + k + ', ' + (qid || '-') + ')');
          else if (!naboOk(p.map, p.x, p.y)) probs.push('npc ' + id + ' kan ikke nås: ' + p.map + ' ' + p.x + ',' + p.y + ' (kap ' + k + ', ' + (qid || '-') + ')');
        });
      });
    });
  });
  S.kap = keep.kap; S.q = keep.q; S.flags = keep.flags; S.cut = keep.cut; S.klaret = keep.klaret;
  K.things.forEach(t => { if (!W[t.map]) return probs.push('ting på ukendt kort ' + t.id); if (!ok(t.map, t.x, t.y) && !naboOk(t.map, t.x, t.y)) probs.push('ting ' + t.id + ' kan ikke nås'); if (W[t.map].solid(t.x, t.y)) probs.push('ting ' + t.id + ' står i solid flise ' + t.map + ' ' + t.x + ',' + t.y); });
  Object.keys(K.places).forEach(key => { const [id, xy] = key.split(':'), [x, y] = xy.split(',').map(Number); if (!W[id]) return probs.push('sted på ukendt kort ' + key); if (!naboOk(id, x, y)) probs.push('sted ' + key + ' (' + K.places[key] + ') kan ikke nås'); });
  maps.forEach(id => W[id].doors.forEach(d => { if (!ok(id, d.x, d.y)) probs.push('dør ' + id + ' ' + d.x + ',' + d.y + ' kan ikke nås'); if (!W[d.to]) probs.push('dør til ukendt kort ' + d.to); else if (W[d.to].solid(d.tx, d.ty)) probs.push('dør ' + id + '→' + d.to + ' lander i solid flise ' + d.tx + ',' + d.ty); }));
  return probs;
};
