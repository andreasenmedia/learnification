/* Regnehelten — hvad nåede spilleren at løse?

   Spillet samler op undervejs — hvilken opgave, hvilket emne, om den blev
   klaret i første forsøg — og sender det til /resultat.php, så en voksen
   kan se, hvordan det gik. Formatet er det samme som i Python-udgaven, så
   resultat.php og overblikket ikke skal ændres.

   Der sendes efter hver opgave (højst hvert 8. sekund), når et opgavesæt
   er færdigt, når spillet er slut, og når fanen bliver lukket — sendBeacon
   er lavet til netop dét: den overlever, at siden forsvinder.

   Omgangen ligger i det gemte spil (S.res), så en omgang, der fortsættes
   på en anden skærm, bliver ved med at være den samme omgang. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var URL = '/resultat.php';
  var TRINNAVN = { 'HUSK': 'Tal-fakta', 'FORSTÅ': 'Forstå opgaven', 'ANVEND': 'Handle ind', 'ANALYSÉR': 'Mønstre og flere trin', 'VURDÉR': 'Tjekke et svar', 'SKAB': 'Bygge sit eget regnestykke' };
  var sidst = 0, sendt = '';

  function nyOmgang() {
    return { id: Math.floor(Date.now() / 1000) + '-' + ('000' + ((Math.random() * 10000) | 0)).slice(-4), svar: [], sek: 0, faerdig: false };
  }

  function noter(S, scene, bloom, spec, r) {
    S.res.svar.push({
      scene: scene,
      trin: TRINNAVN[bloom] || bloom,
      type: spec.kind,
      emne: spec.book || '',
      spoergsmaal: String(spec.q).slice(0, 140),
      facit: RH.answerText(spec),
      forsoeg: r.tries,
      foerste_forsoeg: !!r.first,
      klaret: !!r.klaret
    });
  }

  function opsummering(S) {
    var svar = S.res.svar, rigtige = 0, klaret = 0, emner = {};
    svar.forEach(function (s) {
      if (s.foerste_forsoeg) rigtige++;
      if (s.klaret) klaret++;
      var e = emner[s.emne || 'andet'] || (emner[s.emne || 'andet'] = { opgaver: 0, foerste: 0 });
      e.opgaver++; if (s.foerste_forsoeg) e.foerste++;
    });
    // antal klarede hovedmissioner på tværs af kapitlerne (q0-q5, k2q0-k2q5, k3q0-k3q5)
    var kapitel = Object.keys(S.q).filter(function (q) { return /^(k\d)?q\d$/.test(q) && S.q[q] === 'done'; }).length;
    return {
      id: S.res.id, navn: S.name, klasse: S.klasse, trin: RH.opgaver.trin(S.klasse).navn,
      minutter: Math.round(S.res.sek / 6) / 10,
      opgaver: svar.length, foerste_forsoeg: rigtige, klaret: klaret,
      procent: svar.length ? Math.round(100 * rigtige / svar.length) : 0,
      regnekraft: S.kraft, kapitel: kapitel, kap: S.kap || 1, klaret: (S.klaret || []).join(','), faerdig: !!S.res.faerdig,
      emner: emner, detaljer: svar
    };
  }

  function send(S, tvungen) {
    if (!S || !S.res || !S.res.svar.length) return;
    if (!tvungen && Date.now() - sidst < 8000) return;
    var data = JSON.stringify(opsummering(S));
    if (data === sendt) return;
    sendt = data; sidst = Date.now();
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(URL, data);
      else fetch(URL, { method: 'POST', body: data, keepalive: true });
    } catch (e) { /* så må det være */ }
  }

  RH.resultat = { nyOmgang: nyOmgang, noter: noter, send: send, opsummering: opsummering };
})();
