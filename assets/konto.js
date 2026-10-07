/* Fælles hjælpere til login-, konto- og overbliksiderne.

   LF.hent('konto', 'mig')              GET  /api/konto.php?handling=mig
   LF.send('konto', 'login', {...})     POST /api/konto.php med X-LF: 1

   Begge giver et løfte med serverens svar. Svarer serveren med en fejl,
   bliver løftet afvist med en Error, hvis .message er serverens besked —
   den er skrevet til at kunne vises direkte på siden. */

var LF = window.LF || {};
window.LF = LF;

(function () {
  function svar(r) {
    return r.json().catch(function () { return { ok: false, besked: 'Serveren svarede ikke rigtigt. Prøv igen om lidt.' }; })
      .then(function (d) {
        if (!r.ok || !d.ok) {
          var e = new Error(d.besked || 'Noget gik galt. Prøv igen.');
          e.status = r.status;
          throw e;
        }
        return d;
      });
  }
  function netfejl(e) {
    if (e && e.status) throw e;
    throw new Error('Kunne ikke komme i kontakt med serveren. Er der net?');
  }

  LF.hent = function (fil, handling, params) {
    var q = new URLSearchParams(Object.assign({ handling: handling }, params || {}));
    return fetch('/api/' + fil + '.php?' + q, { credentials: 'same-origin', cache: 'no-store' })
      .then(svar, netfejl);
  };

  LF.send = function (fil, handling, data) {
    return fetch('/api/' + fil + '.php', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-LF': '1' },
      body: JSON.stringify(Object.assign({ handling: handling }, data || {}))
    }).then(svar, netfejl);
  };

  /** Fremskridtet i et gemt spil som en lille linje under spilletiden. */
  LF.gemt = function (g) {
    if (!g) return '';
    return '<br><span class="lille gemt' + (g.faerdig ? ' faerdig' : '') + '" title="'
      + LF.esc(g.detalje + ' · gemt ' + LF.dato(g.opdateret)) + '">'
      + (g.faerdig ? '★ ' : '') + LF.esc(g.tekst) + '</span>';
  };

  /** Tekst ind i HTML uden at den kan blive til kode. */
  LF.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /** 0 -> "–", 540 -> "9 min", 7440 -> "2 t 4 min" */
  LF.tid = function (sek) {
    sek = +sek || 0;
    if (sek < 30) return sek > 0 ? '< 1 min' : '–';
    var m = Math.round(sek / 60);
    if (m < 60) return m + ' min';
    var t = Math.floor(m / 60);
    m = m % 60;
    return t + ' t' + (m ? ' ' + m + ' min' : '');
  };

  /** Unix-tid -> "i dag 14.05", "i går", "3. sep." */
  LF.dato = function (t) {
    if (!t) return '–';
    var d = new Date(t * 1000), nu = new Date();
    var dage = Math.round((new Date(nu.toDateString()) - new Date(d.toDateString())) / 86400000);
    var kl = d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    if (dage === 0) return 'i dag ' + kl;
    if (dage === 1) return 'i går ' + kl;
    if (dage < 7) return dage + ' dage siden';
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: d.getFullYear() === nu.getFullYear() ? undefined : 'numeric' });
  };

  LF.klassetrin = function (t) {
    if (t === null || t === undefined || t === '') return '';
    return t === 0 ? '0. klasse' : t + '. klasse';
  };

  /** Beskedfeltet over en formular: LF.besked(el, 'tekst', 'fejl'|'ok'|'') */
  LF.besked = function (el, tekst, slags) {
    if (!el) return;
    el.textContent = tekst || '';
    el.className = 'besked' + (slags ? ' ' + slags : '');
    el.setAttribute('role', slags === 'fejl' ? 'alert' : 'status');
  };

  /** Lås knappen, mens der bliver sendt, så der ikke kommer to af alt. */
  LF.travl = function (knap, travl) {
    if (!knap) return;
    if (travl) { knap.dataset.tekst = knap.textContent; knap.disabled = true; }
    else { knap.disabled = false; }
  };

  /** Søjlediagram pr. dag: {'2026-09-25': sek, ...}. Uden fmt er tallene
      spilletid i sekunder; statistikken giver sin egen, fx antal besøg. */
  LF.soejler = function (el, dage, fmt, navn) {
    fmt = fmt || LF.tid;
    var noegler = Object.keys(dage);
    var max = Math.max.apply(null, noegler.map(function (k) { return dage[k]; }).concat([fmt === LF.tid ? 60 : 1]));
    var html = '<div class="soejler" role="img" aria-label="' + LF.esc(navn || 'Spilletid pr. dag') + '">';
    noegler.forEach(function (k) {
      var v = dage[k], h = v ? Math.max(2, Math.round(v / max * 100)) : 0;
      var d = new Date(k + 'T12:00:00');
      var dagnavn = d.toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' });
      html += '<div class="s"><i style="height:' + h + '%"></i><span class="tip">' + LF.esc(dagnavn) + ': ' + LF.esc(fmt(v)) + '</span></div>';
    });
    html += '</div><div class="soejler-akse"><span>' + kort(noegler[0]) + '</span><span>i dag</span></div>';
    el.innerHTML = html;
    function kort(k) { return new Date(k + 'T12:00:00').toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }); }
  };

  /* ---- Spilletid i admin: stablede søjler, prøvetidsbjælker, tidslinje ----
     Hvert spil har sin faste farve (CSS-klassen spil-<id> sætter --c), og
     navnet står altid også i tekst: forklaring, tip eller etiket. */

  function kl(t) { return new Date(t * 1000).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }); }
  LF.kl = kl;

  // Runeborg er spil nr. 1 overalt på sitet — også i forklaringer og stabler
  var ORDEN = ['runeborg', 'regnehelten'];
  function orden(spil) {
    return Object.keys(spil).sort(function (a, b) {
      var x = ORDEN.indexOf(a), y = ORDEN.indexOf(b);
      return (x < 0 ? 99 : x) - (y < 0 ? 99 : y);
    });
  }

  /** Forklaringen over et diagram: farveprik + navn pr. spil. */
  LF.forklaring = function (spil) {
    return '<div class="forklaring">' + orden(spil).map(function (s) {
      return '<span class="spil-' + LF.esc(s) + '"><i></i>' + LF.esc(spil[s]) + '</span>';
    }).join('') + '</div>';
  };

  /** Stablede søjler pr. dag: {'2026-09-25': {runeborg: sek, regnehelten: sek}}, spil = {id: navn}. */
  LF.stabel = function (el, dage, spil) {
    var noegler = Object.keys(dage), ids = orden(spil);
    var sum = function (k) { return ids.reduce(function (a, s) { return a + (dage[k][s] || 0); }, 0); };
    var max = Math.max.apply(null, noegler.map(sum).concat([60]));
    var html = LF.forklaring(spil) + '<div class="soejler stabel" role="img" aria-label="Spilletid pr. dag pr. spil">';
    noegler.forEach(function (k) {
      var i_alt = sum(k), d = new Date(k + 'T12:00:00');
      var tip = '<b>' + LF.esc(d.toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' })) + '</b>';
      var seg = '';
      ids.forEach(function (s) {
        var v = dage[k][s] || 0;
        tip += '<br>' + LF.esc(spil[s]) + ': ' + LF.tid(v);
        if (v) seg += '<i class="spil-' + LF.esc(s) + '" style="flex-grow:' + v + '"></i>';
      });
      if (ids.length > 1) tip += '<br>I alt: ' + LF.tid(i_alt);
      var h = i_alt ? Math.max(2, Math.round(i_alt / max * 100)) : 0;
      html += '<div class="s" tabindex="0"><span class="stak" style="height:' + h + '%">' + seg + '</span><span class="tip">' + tip + '</span></div>';
    });
    html += '</div><div class="soejler-akse"><span>' + kort(noegler[0]) + '</span><span>i dag</span></div>';
    el.innerHTML = html;
    function kort(k) { return new Date(k + 'T12:00:00').toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }); }
  };

  /** Fordelingen mellem spillene som én tynd, delt bjælke + procenter. tid = {id: {i_alt}}. */
  LF.fordeling = function (tid, spil) {
    var ids = orden(spil), i_alt = ids.reduce(function (a, s) { return a + ((tid[s] || {}).i_alt || 0); }, 0);
    if (!i_alt) return '';
    var bar = '', tekst = [];
    ids.forEach(function (s) {
      var v = (tid[s] || {}).i_alt || 0, pct = Math.round(v / i_alt * 100);
      if (v) bar += '<i class="spil-' + LF.esc(s) + '" style="flex-grow:' + v + '"></i>';
      tekst.push('<span class="spil-' + LF.esc(s) + '"><i></i>' + LF.esc(spil[s]) + ' ' + pct + ' %</span>');
    });
    return '<div class="fordeling"><div class="delt">' + bar + '</div><div class="forklaring lille">' + tekst.join('') + '</div></div>';
  };

  /** Prøvetiden som bjælke: "42 / 60 min". graense null = fri adgang. */
  LF.bjaelke = function (brugt, graense) {
    if (graense === null || graense === undefined) return '<span class="proeve fri">Fri adgang' + (brugt ? ' · ' + LF.tid(brugt) : '') + '</span>';
    var pct = Math.min(100, Math.round(brugt / graense * 100));
    var over = brugt > graense + 60, slut = brugt >= graense;
    var tekst = LF.tid(brugt) + ' / ' + LF.tid(graense)
      + (over ? ' · ⚠ over grænsen' : slut ? ' · ✓ brugt' : '');
    return '<span class="proeve' + (over ? ' over' : slut ? ' slut' : '') + '" title="' + pct + ' % af prøvetiden">'
      + '<span class="spor"><i style="width:' + pct + '%"></i></span><span class="tal">' + LF.esc(tekst) + '</span></span>';
  };

  /** Vandrette bjælker for en tragt: [[navn, antal], ...]; procent af første trin. */
  LF.tragt = function (el, trin) {
    var top = trin[0][1] || 0;
    el.innerHTML = '<div class="tragt">' + trin.map(function (t) {
      var pct = top ? Math.round(t[1] / top * 100) : 0;
      return '<div class="trin"><span class="navn">' + LF.esc(t[0]) + '</span>'
        + '<span class="spor"><i style="width:' + (t[1] ? Math.max(1, pct) : 0) + '%"></i></span>'
        + '<span class="tal"><strong>' + t[1] + '</strong> · ' + pct + ' %</span></div>';
    }).join('') + '</div>';
  };

  /**
   * Tidslinjen for én konto: én bane pr. spiller, én bjælke pr. omgang.
   * Bjælken går fra omgangens første til sidste puls; det fyldte stykke er
   * den tid, der blev talt (tomgang tæller ikke). Overlapper to omgange for
   * samme spiller, var spillet åbent i flere faner på én gang — det bliver
   * markeret, og banen viser både talt tid og tid på uret.
   */
  LF.tidslinje = function (el, omgange, spil, oprettet) {
    var dage = {};
    omgange.forEach(function (o) {
      var d = new Date(o.start * 1000).toDateString();
      (dage[d] = dage[d] || []).push(o);
    });
    var liste = Object.keys(dage).sort(function (a, b) { return new Date(a) - new Date(b); });
    if (!liste.length) { el.innerHTML = '<p class="tom">Ingen omgange de sidste 30 dage.</p>'; return; }
    var valgt = liste.length - 1;

    function tegn() {
      var os = dage[liste[valgt]];
      // Første puls kan have op til et halvt minut med fra før, så bjælken
      // starter, hvor den talte tid tidligst kan være begyndt
      os.forEach(function (o) { o.fra = Math.min(o.start, o.sidst - o.sekunder); });
      var t0 = Math.min.apply(null, os.map(function (o) { return o.fra; }));
      var t1 = Math.max.apply(null, os.map(function (o) { return o.sidst; }));
      t0 = Math.floor(t0 / 3600) * 3600; t1 = Math.max(Math.ceil(t1 / 3600) * 3600, t0 + 3600);
      var span = t1 - t0, pos = function (t) { return ((t - t0) / span * 100).toFixed(3) + '%'; };

      var baner = {}, raekke = [];
      os.forEach(function (o) {
        var k = o.elev_id ? 'e' + o.elev_id : o.hvem;
        if (!baner[k]) { baner[k] = { navn: (o.ikon ? o.ikon + ' ' : '') + o.navn, os: [] }; raekke.push(k); }
        baner[k].os.push(o);
      });

      var akse = '';
      for (var t = t0; t <= t1; t += 3600) akse += '<span style="left:' + pos(t) + '">' + kl(t).slice(0, 2) + '</span>';
      var html = '<div class="tl-hoved"><button type="button" class="btn btn-sm" data-tl="-1"' + (valgt ? '' : ' disabled') + ' aria-label="Dagen før">&larr;</button>'
        + '<strong>' + LF.esc(new Date(liste[valgt]).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })) + '</strong>'
        + '<button type="button" class="btn btn-sm" data-tl="1"' + (valgt < liste.length - 1 ? '' : ' disabled') + ' aria-label="Dagen efter">&rarr;</button></div>'
        + LF.forklaring(spil) + '<div class="tl">';
      var advarsler = 0;
      // Stiplet streg ned gennem alle baner der, hvor kontoen blev oprettet
      var opr = oprettet >= t0 && oprettet <= t1 ? '<span class="tl-opr" style="left:' + pos(oprettet) + '"></span>' : '';
      raekke.forEach(function (k) {
        var b = baner[k], talt = 0, uret = 0, slut = -Infinity, bars = '';
        b.os.sort(function (x, y) { return x.fra - y.fra; });
        b.os.forEach(function (o, i) {
          talt += o.sekunder;
          uret += Math.max(0, o.sidst - Math.max(o.fra, slut));
          o.overlap = o.fra < slut - 5;
          if (o.overlap) b.os.forEach(function (p, j) { if (j < i && p.sidst > o.fra + 5) p.overlap = true; });
          slut = Math.max(slut, o.sidst);
        });
        // Omgange, der overlapper, lægges i hver sin række i banen, så man kan se dem side om side
        var rk = [];
        b.os.forEach(function (o) {
          for (o.r = 0; o.r < rk.length && rk[o.r] > o.fra + 5; o.r++) { /* find en ledig række */ }
          rk[o.r] = o.sidst;
        });
        b.os.forEach(function (o) {
          var varighed = Math.max(1, o.sidst - o.fra), fyld = Math.min(100, Math.round(o.sekunder / varighed * 100));
          var tip = '<b>' + LF.esc(spil[o.spil] || o.spil) + '</b> · kl. ' + kl(o.fra) + '–' + kl(o.sidst)
            + '<br>Talt ' + LF.tid(o.sekunder) + ' af ' + LF.tid(varighed) + (o.overlap ? '<br>⚠ Samtidig med en anden omgang' : '');
          bars += '<span class="tl-bar spil-' + LF.esc(o.spil) + (o.overlap ? ' overlap' : '') + '" tabindex="0" style="left:' + pos(o.fra)
            + ';width:' + ((o.sidst - o.fra) / span * 100).toFixed(3) + '%;top:' + (4 + o.r * 24) + 'px"><i style="width:' + fyld + '%"></i>'
            + (o.overlap ? '<b class="ad" aria-hidden="true">⚠</b>' : '') + '<span class="tip">' + tip + '</span></span>';
        });
        var forMeget = talt > uret + 60;
        if (forMeget) advarsler++;
        html += '<div class="tl-bane"><div class="tl-navn">' + LF.esc(b.navn) + '<span class="lille">talt ' + LF.tid(talt)
          + (forMeget ? ' · <strong class="advar">⚠ på uret ' + LF.tid(uret) + '</strong>' : '') + '</span></div>'
          + '<div class="tl-spor" style="height:' + (8 + rk.length * 24) + 'px">' + opr + bars + '</div></div>';
      });
      html += '<div class="tl-bane akse"><div class="tl-navn"></div><div class="tl-spor">' + opr + '<div class="tl-akse">' + akse + '</div></div></div></div>';
      if (opr) html += '<p class="tl-opr-tekst">┆ Stiplet streg: kontoen blev oprettet kl. ' + kl(oprettet) + '.</p>';
      if (advarsler) html += '<p class="lille advar">⚠ Der er talt mere tid, end der gik på uret. Spillet har været åbent flere steder på én gang.</p>';
      html += '<details class="foldud"><summary>Vis som tabel</summary><div class="tabel-rul"><table class="liste"><thead><tr><th>Spiller</th><th>Spil</th>'
        + '<th class="t">Fra</th><th class="t">Til</th><th class="t">Talt</th></tr></thead><tbody>'
        + os.map(function (o) {
          return '<tr><td>' + LF.esc(o.navn) + '</td><td>' + LF.esc(spil[o.spil] || o.spil) + '</td><td class="t">' + kl(o.fra)
            + '</td><td class="t">' + kl(o.sidst) + '</td><td class="t">' + LF.tid(o.sekunder) + (o.overlap ? ' ⚠' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></details>';
      el.innerHTML = html;
    }
    el.onclick = function (e) {
      var b = e.target.closest('[data-tl]');
      if (!b) return;
      valgt = Math.max(0, Math.min(liste.length - 1, valgt + +b.dataset.tl));
      tegn();
    };
    tegn();
  };

  /** Hvor må man sendes hen efter login? Kun sider på vores eget domæne. */
  LF.til = function (standard) {
    var t = new URLSearchParams(location.search).get('til') || '';
    return /^\/(?!\/)[^\s\\]*$/.test(t) ? t : standard;
  };
})();
