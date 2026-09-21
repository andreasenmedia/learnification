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

/* Tilmelding til spørgeskemaet.

   Formularen virker også helt uden det her: uden JavaScript sender den
   ganske almindeligt til /tilmeld.php, som sender folk tilbage igen med
   svaret i adressen. Det eneste, koden herunder gør, er at spare dem for
   det hop. */
function skrivOp() {
  var form = document.getElementById('signup-form');

  // Kom nogen tilbage fra tilmeld.php uden JavaScript, står svaret i adressen
  var q = new URLSearchParams(window.location.search);
  if (q.get('tilmeldt') && form) {
    vis(form, q.get('tilmeldt') === 'ja', q.get('besked') || '');
    history.replaceState(null, '', window.location.pathname + '#skriv-op');
  }

  if (!form || !window.fetch) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var knap = form.querySelector('button[type="submit"]');
    var felt = form.querySelector('input[type="email"]');
    var note = form.querySelector('.signup-note');

    felt.removeAttribute('aria-invalid');
    knap.disabled = true;
    var tekst = knap.textContent;
    knap.textContent = 'Sender …';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false, besked: '' }; }); })
      .then(function (d) {
        if (d.ok) {
          vis(form, true, d.besked);
          return;
        }
        knap.disabled = false;
        knap.textContent = tekst;
        felt.setAttribute('aria-invalid', 'true');
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
}

/* Byt formularen ud med svaret, så der ikke står et tomt felt og lokker
   til at skrive sig op en gang til. */
function vis(form, ok, besked) {
  if (!ok) {
    var note = form.querySelector('.signup-note');
    if (note) {
      note.className = 'signup-note fejl';
      note.textContent = besked || 'Det gik ikke igennem. Prøv igen om lidt.';
    }
    return;
  }
  var tak = document.createElement('div');
  tak.className = 'signup-tak';
  tak.setAttribute('role', 'status');
  tak.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2f7d4c"'
    + ' stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
    + ' style="flex:none;margin-top:2px;"><path d="M20 6 9 17l-5-5"/></svg><div></div>';
  var d = tak.querySelector('div');
  var b = document.createElement('strong');
  b.textContent = besked || 'Tak! Du er skrevet op.';
  var p = document.createElement('p');
  p.textContent = 'Spørgeskemaet tager to minutter, og du får det kun én gang.';
  d.appendChild(b);
  d.appendChild(p);
  form.parentNode.replaceChild(tak, form);
}
