/* Lærerens forløb (demo) — historien bygges ud fra en forløbspakke
   Pakken (forloeb/*.json) er det, AI'en laver ud fra lærerens materiale, og som læreren har rettet og godkendt.
   Her bliver pakken til missioner, personer, opgaver og dagbog i Runeborgs motor.
   Skemaet står i forloeb/forloeb-skema.json. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};

  var K = RB.content = {
    pakke: null, start: null,
    AREA: {}, CANDO: [], classes: [{ name: 'Forsker', hat: '', desc: '' }, { name: 'Forsker', hat: '', desc: '' }],
    npcs: {}, things: [], runes: [], places: {}, placePos: {}, clues: {}, skills: {}, lockedDoors: {},
    script: {}, KAPITLER: 1, kapitler: {}
  };
  var quests = [], byId = {}, on = {}, idle = {}, placeIdle = {};

  function at(map, x, y, dir) { return function () { return { map: map, x: x, y: y, dir: dir || 'down' }; }; }
  function pick(arr, S) { return arr[(S.talks = (S.talks || 0) + 1) % arr.length]; }

  // doc/chart i en opgave er id'er i pakken — her bliver de til selve dokumentet/grafen
  function opgave(P, t) {
    var o = {};
    Object.keys(t).forEach(function (k) { o[k] = t[k]; });
    var l = P.laeringsmaal.filter(function (x) { return x.id === t.maal; })[0];
    o.area = l ? l.omraade : '';
    function slaaOp(v, kilde) { return v == null ? v : [].concat(v).map(function (id) { return typeof id === 'string' ? kilde[id] : id; }); }
    if (t.doc != null) { var d = slaaOp(t.doc, P.dokumenter); o.doc = d.length === 1 ? d[0] : d; }
    if (t.chart != null) { var c = slaaOp(t.chart, P.grafer); o.chart = c.length === 1 ? c[0] : c; }
    return o;
  }

  function bygMission(P, m, i) {
    var naeste = P.missioner[i + 1], g0 = m.giver;
    return async function (g) {
      if (!g.seen(m.id + '_intro')) for (var a = 0; a < m.intro.length; a++) await g.say(m.intro[a].hvem || null, m.intro[a].t);
      for (var j = 0; j < m.opgaver.length; j++) {
        var t = m.opgaver[j];
        if (!await g.task(m.id + '_' + t.id, opgave(P, t))) return;
      }
      for (var b = 0; b < m.afslutning.length; b++) await g.say(m.afslutning[b].hvem || null, m.afslutning[b].t);
      (m.begreber || []).forEach(function (id) { g.clue(id); });
      if (m.evne) await g.skill(m.evne);
      g.finish(m.id);
      if (naeste) g.start(naeste.id);
      else await g.epilogue();
    };
  }

  K.indlaes = function (url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('pakke ' + r.status); return r.json(); }).then(function (P) {
      K.pakke = P;
      K.start = P.start;
      P.laeringsmaal.forEach(function (l) { K.AREA[l.id] = l.omraade; K.CANDO.push([l.id, l.tekst]); });
      Object.keys(P.figurer).forEach(function (id) {
        var f = P.figurer[id];
        K.npcs[id] = { name: f.navn, look: f.look, pos: at(f.map, f.x, f.y, f.dir) };
        var tg = f.tomgang || [];
        if (tg.length) idle[id] = function (g) { return g.say(id, pick(tg, g.S)); };
      });
      Object.keys(P.steder || {}).forEach(function (id) {
        var s = P.steder[id];
        s.felter.forEach(function (f) { K.places[f] = id; });
        placeIdle[id] = function (g) { return g.say(null, s.tekst); };
      });
      Object.keys(P.laaste || {}).forEach(function (f) { K.lockedDoors[f] = P.laaste[f]; });
      Object.keys(P.begreber || {}).forEach(function (id) { K.clues[id] = P.begreber[id]; });
      Object.keys(P.evner || {}).forEach(function (id) { K.skills[id] = P.evner[id]; });

      P.missioner.forEach(function (m, i) {
        var q = {
          id: m.id, act: P.titel, title: m.titel, desc: m.beskrivelse, giverId: m.giver,
          requires: i ? [P.missioner[i - 1].id] : [], uses: i ? P.missioner[i - 1].titel : null,
          target: function () { return m.giver; }, goal: m.maal
        };
        quests.push(q); byId[q.id] = q;
        on[m.id] = {}; on[m.id][m.giver] = bygMission(P, m, i);
      });

      K.script.intro = async function (g) {
        for (var i = 0; i < P.intro.length; i++) await g.say(P.intro[i].hvem || null, P.intro[i].t);
        g.start(P.missioner[0].id, true);
      };
      return P;
    });
  };

  // Til skærmbilleder: en bestemt opgave, klar til at blive vist (mission-nummer og opgave-nummer, begge fra 0)
  K.fotoOpgave = function (m, t) { return opgave(K.pakke, K.pakke.missioner[m].opgaver[t]); };

  function available(q) { var S = RB.state; return (q.requires || []).every(function (r) { return S.q[r] === 'done'; }); }
  K.available = available;
  K.quest = function (id) { return byId[id]; };
  K.questList = function () { return quests; };
  K.runesNu = function () { return []; };
  K.runesIKap = function () { return []; };
  K.skillsNu = function () { return K.skills; };
  K.kapNu = function () { return { efterTitel: '', efterMaal: '' }; };
  K.goal = function (id) { var q = byId[id], g = q.goal; return typeof g === 'function' ? g(RB.state) : g; };
  K.markers = function (S) {
    var m = {};
    quests.forEach(function (q) { if (S.q[q.id] === 'active') { var t = q.target(S); if (t) m[t] = '?'; } });
    return m;
  };
  K.mainTarget = function (S) {
    for (var i = 0; i < quests.length; i++) { var q = quests[i]; if (S.q[q.id] === 'active') return { q: q, t: q.target(S) }; }
    return null;
  };
  K.timeOfDay = function (S) {
    var n = quests.filter(function (q) { return S.q[q.id] === 'done'; }).length;
    return n >= 3 ? 'aften' : n === 2 ? 'eftermiddag' : 'morgen';
  };
  K.talk = async function (g, id) {
    var S = g.S;
    for (var i = 0; i < quests.length; i++) {
      var q = quests[i];
      if (S.q[q.id] === 'active' && on[q.id] && on[q.id][id]) return on[q.id][id](g);
    }
    if (idle[id]) return idle[id](g);
    if (placeIdle[id]) return placeIdle[id](g);
  };
})();
