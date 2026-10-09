/* Spørgeskemaet til eleverne på en testrunde (api/test.php).

   Kun børn på en testrunde har cookien lf_test. De spørger hvert 8. sekund,
   om læreren har vist skemaet — og så kommer det som et vindue ovenpå spillet:
   ét spørgsmål ad gangen, store knapper, seks tryk i alt. Svaret sendes til
   /api/test.php og kan ses (og hentes som CSV) under /admin#test.

   Bruges af /spil/ og begge spil. Samme fil begge steder, så vinduet ser ens ud.
   Mens vinduet er åbent, når tastetryk ikke ind til spillet, og spilleren står stille. */
(function () {
  if (!/(?:^|;\s*)lf_test=1/.test(document.cookie) || !/(?:^|;\s*)lf_in=elev\./.test(document.cookie)) return;

  var spil = (location.pathname.match(/\/spil\/(runeborg|regnehelten)\//) || [])[1] || 'oversigt';
  var aabent = false, udsat = 0, bg = null, tast = null;

  var css = document.createElement('style');
  css.textContent =
    '#lf-skema{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:14px;background:rgba(10,7,16,.8);' +
    'font:20px/1.35 "Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif;color:#f4ecdc;overflow:auto}' +
    '#lf-skema .vindue{width:min(100%,640px);background:#1f1830;border:3px solid #f4ecdc;padding:22px 22px 18px;' +
    'box-shadow:0 0 0 3px #140f1c,6px 6px 0 3px rgba(0,0,0,.45);text-align:center}' +
    '#lf-skema .lille{font-size:.78em;letter-spacing:.12em;text-transform:uppercase;color:#ffcc4d;margin:0 0 6px}' +
    '#lf-skema h2{margin:0 0 16px;font-size:1.5em;line-height:1.2;color:#f4ecdc}' +
    '#lf-skema .valg{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}' +
    '#lf-skema .valg button{flex:1 1 130px;min-height:92px;display:grid;gap:2px;place-items:center;padding:10px 8px;cursor:pointer;' +
    'font:inherit;color:#f4ecdc;background:#2a2140;border:3px solid #7a6aa0;box-shadow:0 4px 0 #140f1c}' +
    '#lf-skema .valg button:hover,#lf-skema .valg button:focus-visible{border-color:#ffcc4d;outline:none}' +
    '#lf-skema .valg button:active{transform:translateY(3px);box-shadow:0 1px 0 #140f1c}' +
    '#lf-skema .valg .e{font-size:2.3em;line-height:1}' +
    '#lf-skema .valg .t{font-size:.9em}' +
    '#lf-skema .prik{display:flex;gap:7px;justify-content:center;margin:16px 0 0}' +
    '#lf-skema .prik i{width:12px;height:12px;background:#2a2140;border:2px solid #7a6aa0}' +
    '#lf-skema .prik i.klar{background:#ffcc4d;border-color:#ffcc4d}' +
    '#lf-skema .senere{margin-top:12px;background:none;border:0;color:#b9aed6;font:inherit;font-size:.8em;text-decoration:underline;cursor:pointer}' +
    '#lf-skema .tak .e{font-size:3em}' +
    '#lf-skema .fortsaet{margin-top:14px;padding:10px 26px;font:inherit;font-weight:700;color:#140f1c;background:#ffcc4d;border:3px solid #fff3c4;box-shadow:0 4px 0 #140f1c;cursor:pointer}' +
    '@media (max-height:520px){#lf-skema .valg button{min-height:68px}#lf-skema h2{margin-bottom:10px}}';
  document.head.appendChild(css);

  function el(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst != null) e.textContent = tekst;
    return e;
  }

  // Taster, spillet kan have fået "holdt nede" — så spilleren stopper, når vinduet kommer og går
  var TASTER = [['ArrowUp', 'ArrowUp'], ['ArrowDown', 'ArrowDown'], ['ArrowLeft', 'ArrowLeft'], ['ArrowRight', 'ArrowRight'],
                ['w', 'KeyW'], ['a', 'KeyA'], ['s', 'KeyS'], ['d', 'KeyD'], [' ', 'Space'], ['Enter', 'Enter'], ['Shift', 'ShiftLeft']];
  function slipTaster() {
    TASTER.forEach(function (t) {
      try { window.dispatchEvent(new KeyboardEvent('keyup', { key: t[0], code: t[1], bubbles: true })); } catch (e) { /* ældre browser */ }
    });
  }

  var tasteVagt = function (e) {
    if (!aabent) return;
    if (e.type === 'keydown' && /^[1-9]$/.test(e.key) && tast) tast(parseInt(e.key, 10));
    var navigation = e.key === 'Tab' || e.key === 'Enter' || e.key === ' ';
    if (!navigation || !bg || !bg.contains(e.target)) e.stopImmediatePropagation();
    else e.stopPropagation();
    if (e.key.indexOf('Arrow') === 0) e.preventDefault();
  };
  ['keydown', 'keyup', 'keypress'].forEach(function (t) { window.addEventListener(t, tasteVagt, true); });

  function luk() {
    if (bg && bg.parentNode) bg.parentNode.removeChild(bg);
    bg = null; aabent = false; tast = null;
    slipTaster();
  }

  function vis(skema) {
    aabent = true;
    slipTaster();
    var q = skema.spoergsmaal, nr = 0, svar = {};
    bg = el('div'); bg.id = 'lf-skema';
    bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', 'Spørgeskema');
    var v = el('div', 'vindue');
    bg.appendChild(v);
    document.body.appendChild(bg);

    function spoerg() {
      v.textContent = '';
      var sp = q[nr];
      v.appendChild(el('p', 'lille', 'Spørgsmål ' + (nr + 1) + ' af ' + q.length));
      var h = el('h2', null, sp.tekst);
      h.setAttribute('tabindex', '-1');
      v.appendChild(h);
      var valg = el('div', 'valg');
      sp.valg.forEach(function (o, i) {
        var b = el('button');
        b.type = 'button';
        b.appendChild(el('span', 'e', o.emoji));
        b.appendChild(el('span', 't', o.tekst));
        b.setAttribute('aria-keyshortcuts', String(i + 1));
        b.addEventListener('click', function () { vaelg(sp.noegle, o.v); });
        valg.appendChild(b);
      });
      v.appendChild(valg);
      var prik = el('div', 'prik');
      q.forEach(function (_, i) { prik.appendChild(el('i', i < nr ? 'klar' : '')); });
      v.appendChild(prik);
      var senere = el('button', 'senere', 'Svar lidt senere');
      senere.type = 'button';
      senere.addEventListener('click', function () { udsat = Date.now() + 2 * 60 * 1000; luk(); });
      v.appendChild(senere);
      h.focus();
    }

    function vaelg(noegle, vaerdi) {
      svar[noegle] = vaerdi;
      if (++nr < q.length) { spoerg(); return; }
      send();
    }

    function tak(tekst, emoji) {
      v.textContent = '';
      var d = el('div', 'tak');
      d.appendChild(el('div', 'e', emoji));
      d.appendChild(el('h2', null, tekst));
      var b = el('button', 'fortsaet', 'Spil videre');
      b.type = 'button';
      b.addEventListener('click', luk);
      d.appendChild(b);
      v.appendChild(d);
      b.focus();
      setTimeout(function () { if (aabent && bg && bg.contains(b)) luk(); }, 6000);
    }

    function send() {
      v.textContent = '';
      v.appendChild(el('h2', null, 'Sender …'));
      fetch('/api/test.php', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-LF': '1' },
        body: JSON.stringify({ handling: 'skema_svar', id: skema.id, spil: spil, svar: svar })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok && d.ok, status: r.status }; }); })
        .then(function (r) {
          if (r.ok || r.status === 410) tak('Tak for hjælpen!', '💛');
          else fejl();
        }).catch(fejl);
    }

    function fejl() {
      v.textContent = '';
      v.appendChild(el('h2', null, 'Det lykkedes ikke. Tryk for at prøve igen.'));
      var b = el('button', 'fortsaet', 'Prøv igen');
      b.type = 'button';
      b.addEventListener('click', send);
      v.appendChild(b);
      b.focus();
    }

    // Tal-taster svarer på spørgsmålet — hurtigt for dem, der sidder med tastatur
    tast = function (n) {
      var sp = q[nr];
      if (sp && n <= sp.valg.length && v.querySelector('.valg')) vaelg(sp.noegle, sp.valg[n - 1].v);
    };
    spoerg();
  }

  function tjek() {
    if (aabent || window.LF_MODAL || document.hidden || Date.now() < udsat) return;
    fetch('/api/test.php?handling=skema_aktuel', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok && d.skema && !aabent) vis(d.skema); })
      .catch(function () { /* ingen forbindelse lige nu — vi prøver igen om lidt */ });
  }

  setTimeout(tjek, 1500);
  setInterval(tjek, 8000);
})();
