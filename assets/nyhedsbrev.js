/* Tilmelding til nyhedsbrevet.

   Gør hver <form data-nyhedsbrev> på siden levende. Formularen skal have
   felterne email, navn (frivilligt), rolle (frivilligt), samtykke og
   fælden hjemmeside — og et element med klassen nb-besked til svaret.

   Tilmeldingen er dobbelt: man kommer først på listen, når man har
   klikket på linket i den mail, der bliver sendt nu. Se api/_nyhedsbrev.php. */

(function () {
  function besked(el, tekst, slags) {
    el.textContent = tekst;
    el.className = 'nb-besked ' + (slags || '');
  }

  function klar(form) {
    var ud = form.querySelector('.nb-besked');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) {
        besked(ud, 'Skriv en mailadresse, vi kan sende til.', 'fejl'); f.email.focus(); return;
      }
      if (!f.samtykke.checked) {
        besked(ud, 'Sæt flueben, hvis du gerne vil have mails fra os.', 'fejl'); f.samtykke.focus(); return;
      }
      var rolle = form.querySelector('input[name="rolle"]:checked');
      var knap = form.querySelector('button[type="submit"]');
      knap.disabled = true;
      fetch('/api/nyhedsbrev.php', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-LF': '1' },
        body: JSON.stringify({
          handling: 'tilmeld', email: f.email.value.trim(),
          navn: f.navn ? f.navn.value.trim() : '', rolle: rolle ? rolle.value : '',
          samtykke: true, hjemmeside: f.hjemmeside ? f.hjemmeside.value : '',
          kilde: location.pathname
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.ok) throw new Error(d.besked);
        form.reset();
        if (window.LFMaal) LFMaal('nyhedsbrev');
        besked(ud, 'Tak! Tjek din indbakke — du er først skrevet op, når du har klikket på linket i den mail, vi lige har sendt. Kig også i spam.', 'ok');
      }).catch(function (err) {
        besked(ud, (err && err.message && err.message !== 'Failed to fetch')
          ? err.message : 'Kunne ikke komme i kontakt med serveren. Prøv igen om lidt.', 'fejl');
      }).then(function () { knap.disabled = false; });
    });
  }

  function start() {
    document.querySelectorAll('form[data-nyhedsbrev]').forEach(klar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
