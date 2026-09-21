/* Learnification — lidt opførsel, ikke mere end nødvendigt. */

document.addEventListener('DOMContentLoaded', function () {
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Luk menuen igen, hvis vinduet bliver bredt nok til den rigtige navigation
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880 && menu.classList.contains('open')) {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  skrivOp();
});


/* Tilmelding til testen.

   Formularerne virker også helt uden det her: uden JavaScript sender de
   ganske almindeligt til /tilmeld.php, som sender folk tilbage igen med
   svaret i adressen. Koden herunder sparer dem for det hop — og lader
   siden reagere på en tilmelding med det samme (det er dét, porten foran
   spillet lytter efter).

   Gik det godt, bliver der sendt en 'lf:tilmeldt' af sted på document. */

var HUSKET = 'lf-tester';     // står her, når browseren har meldt sig til

function erTilmeldt() {
  try { return window.localStorage.getItem(HUSKET) === 'ja'; }
  catch (e) { return false; }      // privat vindue: så spørger vi bare igen
}

function huskTilmeldt() {
  try { window.localStorage.setItem(HUSKET, 'ja'); } catch (e) { /* pyt */ }
}

function skrivOp() {
  var forme = document.querySelectorAll('.signup-form');
  if (!forme.length) return;

  // Kom nogen tilbage fra tilmeld.php uden JavaScript, står svaret i adressen
  var q = new URLSearchParams(window.location.search);
  if (q.get('tilmeldt')) {
    var ok = q.get('tilmeldt') === 'ja';
    if (ok) huskTilmeldt();
    svarTilbage(forme[0], ok, q.get('besked') || '');
    history.replaceState(null, '', window.location.pathname + '#skriv-op');
  }

  if (!window.fetch) return;

  Array.prototype.forEach.call(forme, function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var knap = form.querySelector('button[type="submit"]');
      var note = form.querySelector('.signup-note');
      var tekst = knap.textContent;

      Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (f) {
        f.removeAttribute('aria-invalid');
      });
      knap.disabled = true;
      knap.textContent = 'Sender …';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
      })
        .then(function (r) {
          return r.json().catch(function () { return { ok: false, besked: '' }; });
        })
        .then(function (d) {
          if (d.ok) {
            huskTilmeldt();
            svarTilbage(form, true, d.besked);
            return;
          }
          knap.disabled = false;
          knap.textContent = tekst;
          markerFeltet(form, d.besked || '');
          note.className = 'signup-note fejl';
          note.textContent = d.besked || 'Det gik ikke igennem. Prøv igen om lidt.';
        })
        .catch(function () {
          knap.disabled = false;
          knap.textContent = tekst;
          note.className = 'signup-note fejl';
          note.textContent = 'Der er ingen forbindelse lige nu. Prøv igen om lidt.';
        });
    });
  });
}

/* Sæt markøren i det felt, serveren brokkede sig over — ellers skal folk
   selv gætte, hvad der var galt. */
function markerFeltet(form, besked) {
  var navn = null;
  if (besked.indexOf('navn') > -1) navn = 'navn';
  else if (besked.indexOf('mail') > -1) navn = 'email';
  else if (besked.indexOf('mobil') > -1) navn = 'mobil';
  if (!navn) return;
  var felt = form.querySelector('[name="' + navn + '"]');
  if (felt) {
    felt.setAttribute('aria-invalid', 'true');
    felt.focus();
  }
}

function svarTilbage(form, ok, besked) {
  if (!ok) {
    var note = form.querySelector('.signup-note');
    if (note) {
      note.className = 'signup-note fejl';
      note.textContent = besked || 'Det gik ikke igennem. Prøv igen om lidt.';
    }
    return;
  }

  document.dispatchEvent(new CustomEvent('lf:tilmeldt', { detail: { besked: besked } }));

  // Formularen i porten foran spillet bliver lukket af siden selv
  if (form.getAttribute('data-modal')) return;

  var tak = document.createElement('div');
  tak.className = 'signup-tak';
  tak.setAttribute('role', 'status');
  tak.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2f7d4c"'
    + ' stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
    + ' style="flex:none;margin-top:2px;"><path d="M20 6 9 17l-5-5"/></svg><div></div>';
  var d = tak.querySelector('div');
  var b = document.createElement('strong');
  b.textContent = besked || 'Tak! I er skrevet op.';
  var p = document.createElement('p');
  p.textContent = 'Spørgeskemaet tager to minutter, og I får det kun én gang.';
  d.appendChild(b);
  d.appendChild(p);
  form.parentNode.replaceChild(tak, form);
}
