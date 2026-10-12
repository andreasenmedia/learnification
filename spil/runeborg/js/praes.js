/* Runeborg — reglerne for præstationerne (kataloget ligger i /spil/faelles/praestationer.js).
   Hver regel læser kun spillets tilstand S, så den også virker på en gammel save. */
(function () {
  'use strict';
  function klaret(n) { return function (S) { return (S.klaret || []).indexOf(n) >= 0; }; }
  function alleDone(ids) { return function (S) { return ids.every(function (id) { return S.q[id] === 'done'; }); }; }
  function alleRuner(a, b) { return function (S) { for (var i = a; i <= b; i++) if (S.runes.indexOf('r' + i) < 0) return false; return true; }; }

  LFPraes.registrer('runeborg', {
    rb_start: function (S) { return S.q.q0 === 'done'; },
    rb_runer1: alleRuner(1, 8),
    rb_vedhold: function (S) { return S.persist >= 5; },
    rb_mis: function (S) { return !!S.flags.catFollow; },
    rb_kap1: klaret(1), rb_kap2: klaret(2), rb_kap3: klaret(3),
    rb_sider1: alleDone(['s1', 's2', 's3']),
    rb_sider2: alleDone(['k2s1', 'k2s2']),
    rb_sider3: alleDone(['k3s1', 'k3s2']),
    rb_skarp: function (S) {
      var n = 0, first = 0;
      Object.keys(S.stats || {}).forEach(function (k) { n += S.stats[k].n; first += S.stats[k].first; });
      return n >= 10 && first / n >= 0.85;
    },
    rb_evner: function (S) { return S.skills.length >= 20; },
    rb_runemester: alleRuner(1, 16)
  });
})();
