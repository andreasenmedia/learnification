/* Regnehelten — reglerne for præstationerne (kataloget ligger i /spil/faelles/praestationer.js).
   Hver regel læser kun spillets tilstand S, så den også virker på en gammel save.
   S.mastery bruges ikke: den bliver skrevet om i hvert kapitel. */
(function () {
  'use strict';
  function klaret(n) { return function (S) { return (S.klaret || []).indexOf(n) >= 0; }; }
  function alleDone(ids) { return function (S) { return ids.every(function (id) { return S.q[id] === 'done'; }); }; }

  LFPraes.registrer('regnehelten', {
    rh_start: function (S) { return S.q.q0 === 'done'; },
    rh_kap1: klaret(1), rh_kap2: klaret(2), rh_kap3: klaret(3),
    rh_kraft50: function (S) { return S.kraft >= 50; },
    rh_kraft100: function (S) { return S.kraft >= 100; },
    rh_rent: function (S) { return Object.keys(S.runde || {}).some(function (q) { var r = S.runde[q]; return r.n >= 3 && r.first === r.n; }); },
    rh_vedhold: function (S) { return S.persist >= 5; },
    rh_taske: function (S) { return S.bag.owned.length >= 5; },
    rh_pause: function (S) { var s = S.bag.spillet || {}; return (s.fodbold || 0) + (s.dressup || 0) >= 1; },
    rh_sider1: alleDone(['s1', 's2', 's3', 's4', 's5', 's6']),
    rh_sider2: alleDone(['k2s1', 'k2s2']),
    rh_sider3: alleDone(['k3s1', 'k3s2'])
  });
})();
