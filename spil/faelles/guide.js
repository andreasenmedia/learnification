/* Hurtig guide til knapperne — vises første gang, man åbner et spil, og kan åbnes igen fra menuen
   ("Sådan spiller du"). Fælles for Runeborg, Regnehelten og Eventyrbiblioteket.

   LFGuide.bygg(o, done) giver et vindue (.modal-bg), som spillets ui.js lægger i #layer.
   o = { touch?: true/false (ellers gættes det), bog?: false i Eventyrbiblioteket (ingen Dagbog),
         ekstra?: [{ tast, tekst }] ekstra taster på kortet "Bog og kort", fx I og J i Regnehelten }
   done() kaldes, når barnet er færdig (eller springer over). */
(function () {
  'use strict';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function tast(t) { return '<span class="key">' + t + '</span>'; }

  function kort(o, berøring) {
    var bog = o.bog !== false, ekstra = (o.ekstra || []).map(function (x) { return tast(x.tast) + ' ' + x.tekst; });
    if (berøring) {
      return [
        { ikon: '🕹️', titel: 'Gå rundt', tekst: 'Hold en finger på skærmen og træk — så kommer en <b>joystick</b> frem. Du kan også trykke på en person eller en ting, så går du derhen.' },
        { ikon: '💬', titel: 'Tal og undersøg', tekst: 'Tryk på den <b>runde knap</b> nederst til højre, når du står ved en person eller en ting. Tryk på skærmen for at komme videre i en samtale.' },
        { ikon: '🗺️', titel: bog ? 'Bog og kort' : 'Kort', tekst: (bog ? 'Knappen <b>Bog</b> viser dine missioner. ' : '') + 'Knappen <b>Kort</b> viser stedet set ovenfra. Tryk på et sted, så viser en <b>pil</b> vej.' + (ekstra.length ? '<br>' + ekstra.join('<br>') : '') },
        { ikon: '☰', titel: 'Menu', tekst: 'Knappen <b>Menu</b> øverst til højre åbner pausemenuen: lyd, tekststørrelse og at skifte spil.' }
      ];
    }
    return [
      { ikon: '⌨️', titel: 'Gå rundt', tekst: 'Brug ' + tast('←') + tast('↑') + tast('→') + tast('↓') + ' eller ' + tast('W') + tast('A') + tast('S') + tast('D') + '. Du kan også klikke på en person eller en ting, så går du derhen.' },
      { ikon: '💬', titel: 'Tal og undersøg', tekst: 'Tryk ' + tast('E') + ' (eller ' + tast('Mellemrum') + ') når du står ved en person eller en ting. Det går også videre i en samtale.' },
      { ikon: '🗺️', titel: bog ? 'Bog og kort' : 'Kort', tekst: (bog ? tast('B') + ' åbner <b>Dagbogen</b> med dine missioner.<br>' : '') + tast('M') + ' åbner <b>kortet</b>. Klik på et sted, så viser en <b>pil</b> i kanten af skærmen vej.' + (ekstra.length ? '<br>' + ekstra.join('<br>') : '') },
      { ikon: '☰', titel: 'Menu og lyd', tekst: tast('Esc') + ' åbner menuen.<br>' + tast('L') + ' slår musikken til og fra.<br>' + tast('F') + ' gør spillet fuldt på skærmen.' }
    ];
  }

  window.LFGuide = {
    bygg: function (o, done) {
      o = o || {};
      var berøring = o.touch != null ? o.touch : (window.matchMedia && matchMedia('(pointer: coarse)').matches);
      var kortene = kort(o, berøring), nr = 0;
      var bg = el('div', 'modal-bg guide-bg'), v = el('div', 'menu guide-vindue px'); bg.appendChild(v);
      v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', 'Sådan spiller du');

      var ikon = el('div', 'guide-ikon'), titel = el('h2'), tekst = el('p', 'guide-tekst');
      var prikker = el('div', 'guide-prikker');
      var række = el('div', 'guide-raekke');
      var tilbage = el('button', 'btn small', 'Tilbage'); tilbage.type = 'button';
      var spring = el('button', 'btn small guide-spring', 'Spring over'); spring.type = 'button';
      var næste = el('button', 'btn primary', 'Næste'); næste.type = 'button';
      række.appendChild(tilbage); række.appendChild(spring); række.appendChild(næste);
      v.appendChild(el('p', 'guide-over', 'Sådan spiller du'));
      v.appendChild(ikon); v.appendChild(titel); v.appendChild(tekst); v.appendChild(prikker); v.appendChild(række);

      function tegn() {
        var k = kortene[nr];
        ikon.textContent = k.ikon; titel.textContent = k.titel; tekst.innerHTML = k.tekst;
        prikker.innerHTML = kortene.map(function (_, i) { return '<i' + (i === nr ? ' class="paa"' : '') + '></i>'; }).join('');
        tilbage.hidden = nr === 0;
        spring.hidden = nr === kortene.length - 1;
        næste.textContent = nr === kortene.length - 1 ? 'Nu spiller jeg!' : 'Næste';
      }
      function frem() { if (nr < kortene.length - 1) { nr++; tegn(); næste.focus(); } else done(); }
      næste.addEventListener('click', frem);
      tilbage.addEventListener('click', function () { if (nr > 0) { nr--; tegn(); } });
      spring.addEventListener('click', function () { done(); });
      bg.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(); }
        else if (e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); frem(); }
        else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (nr > 0) { nr--; tegn(); } }
      });
      tegn();
      bg._fokus = næste;
      return bg;
    }
  };
})();
