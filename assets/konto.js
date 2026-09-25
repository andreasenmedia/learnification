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

  /** Søjlediagram over spilletid pr. dag: {'2026-09-25': sek, ...} */
  LF.soejler = function (el, dage) {
    var noegler = Object.keys(dage);
    var max = Math.max.apply(null, noegler.map(function (k) { return dage[k]; }).concat([60]));
    var html = '<div class="soejler" role="img" aria-label="Spilletid pr. dag">';
    noegler.forEach(function (k) {
      var v = dage[k], h = v ? Math.max(2, Math.round(v / max * 100)) : 0;
      var d = new Date(k + 'T12:00:00');
      var navn = d.toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' });
      html += '<div class="s"><i style="height:' + h + '%"></i><span class="tip">' + LF.esc(navn) + ': ' + LF.tid(v) + '</span></div>';
    });
    html += '</div><div class="soejler-akse"><span>' + fmt(noegler[0]) + '</span><span>i dag</span></div>';
    el.innerHTML = html;
    function fmt(k) { return new Date(k + 'T12:00:00').toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }); }
  };

  /** Hvor må man sendes hen efter login? Kun sider på vores eget domæne. */
  LF.til = function (standard) {
    var t = new URLSearchParams(location.search).get('til') || '';
    return /^\/(?!\/)[^\s\\]*$/.test(t) ? t : standard;
  };
})();
