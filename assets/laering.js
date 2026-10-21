/* "Elevernes læring" — lærerens overblik over, hvordan en klasse har klaret opgaverne.

   LFL.vis(el, gruppeId, kontoId?)   tegner overblikket i el (kontoId bruges kun af administratoren)

   Data kommer fra api/klasse.php (laering, laering_elev, laering_xlsx) og er bygget af det, spillene
   gemmer: hvilke opgaver der er løst, om de blev løst i første forsøg, og hvor lang tid der blev spillet.
   Tid uden opgaver er enten målt (spillet har gemt tidspunkter) eller anslået — det står altid ved tallet. */
(function () {
  'use strict';
  var esc = function (s) { return LF.esc(s); };
  var SPILNAVN = { runeborg: 'Runeborg', regnehelten: 'Regnehelten' };
  var ORDEN = ['runeborg', 'regnehelten'];

  function niveau(pct) { return pct === null ? '' : pct >= 80 ? 'hoej' : pct >= 50 ? 'mid' : 'lav'; }
  function niveauTekst(pct) { return pct === null ? '' : pct >= 80 ? 'stærk' : pct >= 50 ? 'på vej' : 'øv mere'; }
  function pct(n, f) { return n ? Math.round(100 * f / n) : null; }

  /** Procent som bjælke + tal + ord, så farven aldrig er alene om at fortælle det. */
  function pctBjaelke(p, n) {
    if (p === null) return '<span class="lr-intet">–</span>';
    return '<span class="lr-pct ' + niveau(p) + '" title="' + p + ' % af ' + n + ' opgaver var rigtige i første forsøg">'
      + '<span class="lr-spor"><i style="width:' + p + '%"></i></span><b>' + p + ' %</b> <span class="lr-ord">' + niveauTekst(p) + '</span></span>';
  }

  /** Aktiv tid delt i opgavetid og tid uden opgaver. */
  function tidBjaelke(e, maks) {
    if (!e.aktiv_sek) return '<span class="lr-intet">–</span>';
    var bredde = Math.max(4, Math.round(e.aktiv_sek / maks * 100));
    var v = Math.round(e.vandre_sek / e.aktiv_sek * 100);
    return '<span class="lr-tid" title="' + esc(LF.tid(e.opgave_sek) + ' med opgaver · ' + LF.tid(e.vandre_sek) + ' uden opgaver ('
      + (e.vandre_type === 'maalt' ? 'målt' : 'anslået') + ')') + '"><span class="lr-spor tid" style="width:' + bredde + '%">'
      + '<i class="opg" style="flex-grow:' + (100 - v) + '"></i><i class="vandre" style="flex-grow:' + v + '"></i></span>'
      + '<b>' + LF.tid(e.aktiv_sek) + '</b></span>';
  }

  function tegn(el, d, ctx) {
    var k = d.klasse, elever = d.elever.slice();
    var maks = Math.max.apply(null, elever.map(function (e) { return e.aktiv_sek; }).concat([60]));
    var maalt = k.vandre_type === 'maalt';
    var vandrePct = k.aktiv_sek ? Math.round(k.vandre_sek / k.aktiv_sek * 100) : 0;

    var html = '<div class="lr-top"><div><h4>Elevernes læring</h4>'
      + '<p class="lille">Bygget på de opgaver, eleverne har løst i spillene. “Rigtige i første forsøg” er det bedste mål for, hvad barnet kan uden hjælp.</p></div>'
      + '<a class="btn btn-sm" href="' + esc(ctx.xlsx) + '" download>⬇ Hent rådata (Excel)</a></div>';

    html += '<div class="tal-raekke">' + [
      [k.aktive + ' af ' + k.elever, 'Elever, der har spillet'],
      [k.pct === null ? '–' : k.pct + ' %', 'Rigtige i første forsøg'],
      [k.opgaver, 'Opgaver løst i alt'],
      [LF.tid(k.aktiv_sek), 'Aktiv spilletid'],
      [k.aktiv_sek ? vandrePct + ' %' : '–', 'Tid uden opgaver (' + (maalt ? 'målt' : 'anslået') + ')'],
      [k.svageste ? k.svageste.pct + ' %' : '–', k.svageste ? 'Svageste emne: ' + k.svageste.navn.replace(/^[^·]*· /, '') : 'Svageste emne']
    ].map(function (t) { return '<div class="tal-kort"><div class="v">' + esc(t[0]) + '</div><div class="l">' + esc(t[1]) + '</div></div>'; }).join('') + '</div>';

    html += '<div class="lr-forklaring" aria-label="Forklaring til tidsbjælken"><span><i class="opg"></i> Tid med opgaver</span>'
      + '<span><i class="vandre"></i> Tid uden opgaver: dialog, læsning og at gå rundt ' + (maalt ? '(målt)' : '(anslået)') + '</span></div>';

    html += '<div class="lr-sorter"><label for="lr-sorter-' + ctx.id + '">Sortér efter</label><select id="lr-sorter-' + ctx.id + '" data-lr-sorter>'
      + '<option value="navn">Navn</option><option value="pct-lav">Rigtige i første forsøg (laveste først)</option>'
      + '<option value="pct-hoej">Rigtige i første forsøg (højeste først)</option><option value="vandre">Mest tid uden opgaver</option>'
      + '<option value="tid">Mest spilletid</option></select></div>';

    html += '<div class="tabel-rul"><table class="liste lr-tabel"><thead><tr><th>Elev</th><th>Spilletid</th><th class="t">Opgaver</th>'
      + '<th>Rigtige i første forsøg</th><th>Kapitel</th><th></th></tr></thead><tbody data-lr-elever></tbody></table></div>';

    html += '<details class="foldud lr-katalog"><summary>Hvilke opgaver bygger det på? (' + d.omraader.length + ' emner i spillene)</summary>'
      + '<p class="lille">Hvert emne er en gruppe opgaver i spillene. Tallene viser, hvor mange af klassens elever der har prøvet emnet, og hvordan det gik.'
      + ' Klik på en elev ovenfor for at se hver enkelt opgave.</p>';
    ORDEN.forEach(function (spil) {
      var rk = d.omraader.filter(function (o) { return o.spil === spil; });
      if (!rk.length) return;
      html += '<h5>' + esc(SPILNAVN[spil] || spil) + '</h5><div class="tabel-rul"><table class="liste lr-tabel"><thead><tr><th>Emne</th><th>Hvad det træner</th>'
        + '<th class="t">Elever</th><th class="t">Opgaver løst</th><th>Rigtige i første forsøg</th></tr></thead><tbody>'
        + rk.map(function (o) {
          return '<tr><td><strong>' + esc(o.navn.replace(/^[^·]*· /, '')) + '</strong>' + (spil === 'runeborg' && o.navn.indexOf('·') > 0 ? '<br><span class="lille">' + esc(o.navn.split(' · ')[0]) + '</span>' : '') + '</td>'
            + '<td>' + esc(o.forklaring || '') + (o.opgaver_i_spillet ? ' <span class="lille">(' + o.opgaver_i_spillet + ' opgaver i spillet)</span>' : '') + '</td>'
            + '<td class="t">' + o.elever + '</td><td class="t">' + o.n + '</td><td>' + pctBjaelke(pct(o.n, o.foerste), o.n) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    });
    html += '</details>';

    html += '<p class="lille lr-note">' + (maalt
      ? 'Tid uden opgaver er målt: pauser på over 90 sekunder mellem to løste opgaver.'
      : 'Tid uden opgaver er et skøn: aktiv tid minus antal opgaver × ' + k.typisk_sek + ' sekunder (den typiske tid pr. opgave for de mest fokuserede elever i klassen). '
        + 'Spillene gemte ikke tidspunkter, da klassen spillede — nye omgange måler det præcist.')
      + ' Runeborg viser kun tal pr. emne for omgange fra før tidspunkter blev gemt.</p>';

    el.innerHTML = html;

    var body = el.querySelector('[data-lr-elever]');
    var sort = {
      'navn': function (a, b) { return a.navn.localeCompare(b.navn, 'da', { numeric: true }); },
      'pct-lav': function (a, b) { return (a.pct === null ? 999 : a.pct) - (b.pct === null ? 999 : b.pct); },
      'pct-hoej': function (a, b) { return (b.pct === null ? -1 : b.pct) - (a.pct === null ? -1 : a.pct); },
      'vandre': function (a, b) { return b.vandre_sek - a.vandre_sek; },
      'tid': function (a, b) { return b.aktiv_sek - a.aktiv_sek; }
    };
    function raekker(naegle) {
      elever.sort(sort[naegle]);
      body.innerHTML = elever.map(function (e) {
        var kap = ORDEN.map(function (s) {
          var c = e.kapitler[s]; if (!c) return '';
          return '<span class="lille">' + esc(SPILNAVN[s]) + ': ' + c.kapitel + '/3</span>';
        }).filter(Boolean).join('<br>') || '<span class="lr-intet">–</span>';
        return '<tr class="lr-elev" data-elev="' + e.id + '"><td><strong>' + esc(e.navn) + '</strong></td><td>' + tidBjaelke(e, maks) + '</td>'
          + '<td class="t">' + e.opgaver + '</td><td>' + pctBjaelke(e.pct, e.opgaver) + '</td><td>' + kap + '</td>'
          + '<td class="handling"><button type="button" class="link-knap" data-lr-aabn aria-expanded="false">Vis detaljer</button></td></tr>'
          + '<tr class="lr-detalje" data-detalje="' + e.id + '" hidden><td colspan="6"></td></tr>';
      }).join('');
    }
    raekker('navn');
    el.querySelector('[data-lr-sorter]').addEventListener('change', function () { raekker(this.value); });

    body.addEventListener('click', function (ev) {
      var knap = ev.target.closest('[data-lr-aabn]');
      if (knap) {
        var id = +knap.closest('tr').dataset.elev, rk = body.querySelector('[data-detalje="' + id + '"]');
        var aaben = rk.hidden;
        rk.hidden = !aaben;
        knap.setAttribute('aria-expanded', aaben ? 'true' : 'false');
        knap.textContent = aaben ? 'Skjul detaljer' : 'Vis detaljer';
        if (aaben && !rk.dataset.tegnet) { rk.dataset.tegnet = 1; detaljer(rk.firstChild, elever.filter(function (x) { return x.id === id; })[0], ctx); }
        return;
      }
      var opg = ev.target.closest('[data-lr-opgaver]');
      if (opg) {
        opg.disabled = true; opg.textContent = 'Henter …';
        var celle = opg.closest('td'), id2 = +opg.dataset.lrOpgaver;
        LF.hent('klasse', 'laering_elev', ctx.params({ id: id2 })).then(function (r) {
          celle.querySelector('[data-lr-liste]').innerHTML = opgaveliste(r.opgaver);
          opg.remove();
        }).catch(function (err) { opg.disabled = false; opg.textContent = 'Vis opgaverne'; alert(err.message); });
      }
    });
  }

  /** Én elev: emner, læringstrin, spørgeskema og knap til de enkelte opgaver. */
  function detaljer(td, e, ctx) {
    var h = '<div class="lr-detalje-boks">';
    if (!e.omraader.length) {
      td.innerHTML = h + '<p class="lille">' + esc(e.navn) + ' har ikke løst nogen opgaver endnu.</p></div>';
      return;
    }
    ORDEN.forEach(function (spil) {
      var rk = e.omraader.filter(function (o) { return o.spil === spil; });
      if (!rk.length) return;
      h += '<h5>' + esc(SPILNAVN[spil]) + (e.sek_spil[spil] ? ' <span class="lille">· ' + LF.tid(e.sek_spil[spil]) + '</span>' : '') + '</h5><ul class="lr-emner">'
        + rk.sort(function (a, b) { return (pct(a.n, a.foerste) || 0) - (pct(b.n, b.foerste) || 0); }).map(function (o) {
          return '<li><span class="lr-emnenavn">' + esc(o.navn.replace(/^[^·]*· /, '')) + '</span>' + pctBjaelke(pct(o.n, o.foerste), o.n)
            + '<span class="lille"> ' + o.foerste + ' af ' + o.n + ' opgaver</span></li>';
        }).join('') + '</ul>';
    });
    var trin = Object.keys(e.trin || {});
    if (trin.length) {
      var NAVN = { HUSK: 'Tal-fakta', 'FORSTÅ': 'Forstå opgaven', ANVEND: 'Handle ind', 'ANALYSÉR': 'Mønstre og flere trin', 'VURDÉR': 'Tjekke et svar', SKAB: 'Bygge sit eget regnestykke' };
      h += '<h5>Niveau pr. læringstrin (Regnehelten)</h5><p class="lille">' + trin.map(function (t) {
        return esc(NAVN[t] || t) + ': ' + ['', 'øver endnu', 'på vej', 'sikker'][e.trin[t]];
      }).join(' · ') + '</p>';
    }
    h += '<p class="lille">' + (e.vandre_type === 'maalt' ? 'Målt' : 'Anslået') + ' tid uden opgaver: ' + LF.tid(e.vandre_sek) + ' af ' + LF.tid(e.aktiv_sek)
      + (e.pr10 !== null ? ' · ' + String(e.pr10).replace('.', ',') + ' opgaver pr. 10 min' : '') + '</p>';
    if (e.skema) {
      var S = e.skema, T = { sjovt: { 1: 'slet ikke sjovt', 2: 'lidt sjovt', 3: 'ret sjovt', 4: 'super sjovt' } };
      h += '<p class="lille">Barnets eget svar: ' + esc(T.sjovt[S.sjovt] || '') + (S.svaerhed ? ' · opgaverne var ' + esc(String(S.svaerhed).replace('_', ' ').replace('tilpas', 'lige tilpas')) : '')
        + (S.igen ? ' · vil spille igen: ' + esc(S.igen === 'maaske' ? 'måske' : S.igen) : '') + '</p>';
    }
    h += '<div data-lr-liste></div><button type="button" class="btn btn-sm" data-lr-opgaver="' + e.id + '">Vis opgaverne</button></div>';
    td.innerHTML = h;
  }

  /** De enkelte opgaver, grupperet pr. emne, med det svageste først. */
  function opgaveliste(opg) {
    if (!opg.length) return '<p class="lille">Ingen enkelte opgaver gemt endnu.</p>';
    var grp = {}, rk = [];
    opg.forEach(function (o) {
      var k = o.spil + ':' + o.omraade;
      if (!grp[k]) { grp[k] = { spil: o.spil, navn: o.omraade, o: [] }; rk.push(k); }
      grp[k].o.push(o);
    });
    var svag = function (g) { var m = g.o.filter(function (x) { return x.foerste !== null; }); return m.length ? m.filter(function (x) { return x.foerste; }).length / m.length : 0.5; };
    rk.sort(function (a, b) { return svag(grp[a]) - svag(grp[b]); });
    return rk.map(function (k) {
      var g = grp[k], m = g.o.filter(function (x) { return x.foerste !== null; }), r = m.filter(function (x) { return x.foerste; }).length;
      return '<details class="lr-opg"><summary><b>' + esc(g.navn.replace(/^[^·]*· /, '')) + '</b> <span class="lille">' + esc(SPILNAVN[g.spil]) + ' · ' + g.o.length + ' opgaver'
        + (m.length ? ' · ' + r + ' rigtige i første forsøg' : '') + '</span></summary>'
        + '<div class="tabel-rul"><table class="liste lr-tabel"><thead><tr><th>Opgave</th><th>Rigtigt svar</th><th class="t">Forsøg</th><th>1. forsøg</th></tr></thead><tbody>'
        + g.o.map(function (x) {
          return '<tr><td>' + esc(x.spoergsmaal) + (x.trin ? '<br><span class="lille">' + esc(x.trin) + '</span>' : '') + '</td><td>' + esc(x.facit) + '</td>'
            + '<td class="t">' + (x.forsoeg === null ? '–' : x.forsoeg) + '</td>'
            + '<td>' + (x.foerste === null ? '<span class="lr-intet" title="Spillet gemte ikke forsøgene for denne opgave">ikke gemt</span>' : x.foerste ? '✓ ja' : '✗ nej') + '</td></tr>';
        }).join('') + '</tbody></table></div></details>';
    }).join('');
  }

  var tæller = 0;
  window.LFL = {
    vis: function (el, gruppe, konto) {
      var ctx = {
        id: ++tæller,
        params: function (p) { p = p || {}; if (konto) p.konto = konto; return p; },
        xlsx: '/api/klasse.php?' + new URLSearchParams(Object.assign({ handling: 'laering_xlsx', gruppe: gruppe }, konto ? { konto: konto } : {}))
      };
      el.innerHTML = '<p class="lille">Henter elevernes resultater …</p>';
      return LF.hent('klasse', 'laering', ctx.params({ gruppe: gruppe })).then(function (d) { tegn(el, d, ctx); })
        .catch(function (err) { el.innerHTML = '<p class="besked fejl" role="alert">' + esc(err.message) + '</p>'; });
    }
  };
})();
