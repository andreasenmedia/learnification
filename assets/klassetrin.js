/* "Hvilket klassetrin går du i?" — spørges ét sted, én gang pr. barn, inden man kommer ind.

   Bruges af /spil/ og begge spil. Børn, der ikke har et klassetrin endnu (hverken fra
   klassen eller fra et tidligere svar), får et vindue oven på siden med knapper fra
   0. til 9. klasse. Svaret gemmes på barnet (api/konto.php, saet_klassetrin) og ligger
   bagefter i window.LF_KLASSETRIN, hvor Regnehelten henter sit startniveau, og
   /spil/ viser "Passer til din klasse". Passer klassetrinnet ikke til det spil, man er
   i, får barnet det at vide — og må stadig selv vælge. */
(function () {
  if (!/(?:^|;\s*)lf_in=elev\./.test(document.cookie)) return;

  var spil = (location.pathname.match(/\/spil\/(runeborg|regnehelten)\//) || [])[1] || '';
  var FRA_TIL = { runeborg: [5, 9], regnehelten: [1, 6] };
  var NAVN = { runeborg: 'Runeborg', regnehelten: 'Regnehelten' };
  var ANDET = { runeborg: 'regnehelten', regnehelten: 'runeborg' };
  var bg = null;

  window.LF_KLASSETRIN = window.LF_KLASSETRIN === undefined ? null : window.LF_KLASSETRIN;

  var css = document.createElement('style');
  css.textContent =
    '#lf-klasse{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;padding:14px;background:rgba(10,7,16,.88);' +
    'font:20px/1.35 "Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif;color:#f4ecdc;overflow:auto}' +
    '#lf-klasse .vindue{width:min(100%,600px);background:#1f1830;border:3px solid #f4ecdc;padding:24px 22px 20px;' +
    'box-shadow:0 0 0 3px #140f1c,6px 6px 0 3px rgba(0,0,0,.45);text-align:center}' +
    '#lf-klasse .lille{font-size:.78em;letter-spacing:.12em;text-transform:uppercase;color:#ffcc4d;margin:0 0 6px}' +
    '#lf-klasse h2{margin:0 0 6px;font-size:1.5em;line-height:1.2}' +
    '#lf-klasse p{margin:0 0 14px;color:#c9bfdc}' +
    '#lf-klasse .trin{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}' +
    '#lf-klasse .trin button{min-height:64px;font:inherit;font-weight:700;font-size:1.3em;cursor:pointer;color:#f4ecdc;background:#2a2140;border:3px solid #7a6aa0;box-shadow:0 4px 0 #140f1c}' +
    '#lf-klasse .trin button:hover,#lf-klasse .trin button:focus-visible{border-color:#ffcc4d;outline:none}' +
    '#lf-klasse .trin button:active{transform:translateY(3px);box-shadow:0 1px 0 #140f1c}' +
    '#lf-klasse .hint{margin-top:16px;padding:12px 14px;border:3px solid #7a6aa0;background:#2a2140;color:#f4ecdc;text-align:left}' +
    '#lf-klasse .knapper{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px}' +
    '#lf-klasse .knapper a,#lf-klasse .knapper button{padding:10px 20px;font:inherit;font-weight:700;color:#f4ecdc;background:#2a2140;border:3px solid #f4ecdc;box-shadow:0 4px 0 #140f1c;cursor:pointer;text-decoration:none}' +
    '#lf-klasse .knapper .gul{color:#140f1c;background:#ffcc4d;border-color:#fff3c4}' +
    '@media (max-width:420px){#lf-klasse .trin{grid-template-columns:repeat(4,1fr)}}';
  document.head.appendChild(css);

  function el(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst != null) e.textContent = tekst;
    return e;
  }

  // Tastetryk må ikke nå ind til spillet, mens vinduet er åbent
  function vagt(e) {
    if (!bg) return;
    var nav = e.key === 'Tab' || e.key === 'Enter' || e.key === ' ';
    if (!nav || !bg.contains(e.target)) e.stopImmediatePropagation();
    if (e.key.indexOf('Arrow') === 0) e.preventDefault();
  }
  ['keydown', 'keyup', 'keypress'].forEach(function (t) { window.addEventListener(t, vagt, true); });

  function luk() {
    if (bg && bg.parentNode) bg.parentNode.removeChild(bg);
    bg = null; window.LF_MODAL = false;
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' ', 'Enter'].forEach(function (k) {
      try { window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); } catch (e) { /* ældre browser */ }
    });
  }

  function gem(n, fejlFn) {
    fetch('/api/konto.php', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-LF': '1' },
      body: JSON.stringify({ handling: 'saet_klassetrin', klassetrin: n })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) throw new Error(d.besked || 'Det lykkedes ikke.');
      window.LF_KLASSETRIN = n;
      if (window.LF_SPILLER && LF_SPILLER.elev) LF_SPILLER.elev.klassetrin = n;
      try { window.dispatchEvent(new CustomEvent('lf-klassetrin', { detail: n })); } catch (e) { /* ældre browser */ }
      efter(n);
    }).catch(function (e) { fejlFn(e.message); });
  }

  // Passer klassetrinnet til spillet? Ellers en venlig besked, og barnet vælger selv.
  function efter(n) {
    var r = FRA_TIL[spil];
    if (!r || (n >= r[0] && n <= r[1])) { luk(); return; }
    var v = bg.querySelector('.vindue');
    v.textContent = '';
    var bedre = ANDET[spil];
    v.appendChild(el('p', 'lille', n + '. klasse'));
    v.appendChild(el('h2', null, NAVN[spil] + ' er lavet til ' + r[0] + '.-' + r[1] + '. klasse'));
    v.appendChild(el('p', null, 'Så kan det blive ' + (n < r[0] ? 'svært' : 'lidt for let') + '. ' + NAVN[bedre] + ' passer bedre til dig — men du må gerne prøve.'));
    var k = el('div', 'knapper');
    var a = el('a', 'gul', 'Til ' + NAVN[bedre]); a.href = '/spil/' + bedre + '/';
    var b = el('button', null, 'Prøv ' + NAVN[spil] + ' alligevel'); b.type = 'button';
    b.addEventListener('click', luk);
    k.appendChild(a); k.appendChild(b); v.appendChild(k);
    a.focus();
  }

  function spoerg() {
    window.LF_MODAL = true;
    bg = el('div'); bg.id = 'lf-klasse';
    bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', 'Klassetrin');
    var v = el('div', 'vindue'); bg.appendChild(v);
    v.appendChild(el('p', 'lille', 'Inden vi går i gang'));
    var h = el('h2', null, 'Hvilket klassetrin går du i?'); h.setAttribute('tabindex', '-1'); v.appendChild(h);
    v.appendChild(el('p', null, 'Så passer spillet til dig. Du skal kun svare én gang.'));
    var trin = el('div', 'trin');
    var besked = el('p', null, ''); besked.style.color = '#ff9d8a'; besked.style.marginTop = '12px';
    for (var n = 0; n <= 9; n++) {
      (function (n) {
        var b = el('button', null, n + '.');
        b.type = 'button';
        b.setAttribute('aria-label', n === 0 ? 'Børnehaveklasse' : n + '. klasse');
        b.addEventListener('click', function () {
          [].forEach.call(trin.children, function (x) { x.disabled = true; });
          gem(n, function (m) { besked.textContent = m + ' Prøv igen.'; [].forEach.call(trin.children, function (x) { x.disabled = false; }); });
        });
        trin.appendChild(b);
      })(n);
    }
    v.appendChild(trin);
    v.appendChild(besked);
    document.body.appendChild(bg);
    h.focus();
  }

  fetch('/api/konto.php?handling=mig', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.logget_ind || d.hvem !== 'elev') return;
      var k = d.elev.klassetrin;
      window.LF_KLASSETRIN = k === null || k === undefined ? null : k;
      if (window.LF_KLASSETRIN === null) spoerg();
    })
    .catch(function () { /* uden forbindelse spørger vi næste gang */ });
})();
