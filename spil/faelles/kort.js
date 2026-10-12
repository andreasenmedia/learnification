/* Kortet — fælles for Runeborg, Regnehelten og Eventyrbiblioteket.

   LFKort.bygg(o, done) giver et vindue (samme .modal-bg som spillenes egne vinduer), som spillets
   ui.js lægger ind i #layer. Barnet trykker på et sted (på kortet eller i listen) — så kalder vi
   done({ maal, navn }), og spillet lader pilen i kanten af skærmen vise vej derhen. Kortet flytter
   ikke barnet: det går selv.

   o = {
     titel:    'Kort over Runeborg',
     flade:    <canvas> med området set ovenfra (spillets egen forudtegnede bane),
     pins:     [{ navn, x, y, art: 'sted' | 'mission' | 'her', maal }]   x/y i pixel på `flade`
     steder:   [{ navn, sted?, maal, valgt? }]      listen under/ved siden af kortet
     personer: [{ navn, sted?, maal, valgt? }]      (fanen "Personer", udeladt hvis tom)
     mission:  { navn } eller null                  knappen "Følg missionen"
     valgt:    navnet på det, pilen viser vej til lige nu (eller '')
   }
   done(null) = lukket, done({ mission: true }) = følg missionen igen, done({ maal, navn }) = vis vej. */
(function () {
  'use strict';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  window.LFKort = {
    bygg: function (o, done) {
      var bg = el('div', 'modal-bg kort-bg'), v = el('div', 'menu kort-vindue px'); bg.appendChild(v);
      v.setAttribute('role', 'dialog');
      v.setAttribute('aria-label', o.titel || 'Kort');

      var top = el('div', 'kort-top');
      top.appendChild(el('h2', null, esc(o.titel || 'Kort')));
      var tabs = el('div', 'tabs');
      var luk = el('button', 'btn small kort-luk', 'Luk'); luk.type = 'button';
      top.appendChild(tabs); top.appendChild(luk);
      v.appendChild(top);

      var krop = el('div', 'kort-krop'); v.appendChild(krop);

      // Området set ovenfra
      var f = o.flade, flade = el('div', 'kort-flade');
      flade.style.setProperty('--r', (f.width / f.height).toFixed(4));
      var c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
      c.getContext('2d').drawImage(f, 0, 0);
      c.setAttribute('aria-hidden', 'true');
      flade.appendChild(c);
      (o.pins || []).forEach(function (p) {
        var l = p.x / f.width * 100, t = p.y / f.height * 100;
        var node;
        if (p.art === 'her') {
          node = el('span', 'kort-her', '<i></i><b>Her er du</b>');
        } else {
          node = el('button', 'kort-pin ' + p.art + (o.valgt && o.valgt === p.navn ? ' valgt' : ''), '<i>' + (p.art === 'mission' ? '★' : '') + '</i><b>' + esc(p.navn) + '</b>');
          node.type = 'button'; node.title = p.navn; node.setAttribute('aria-label', 'Vis vej til ' + p.navn);
          node.addEventListener('click', function () { done({ maal: p.maal, navn: p.navn }); });
        }
        if (l > 62) node.classList.add('venstre');
        node.style.left = l + '%'; node.style.top = t + '%';
        flade.appendChild(node);
      });
      krop.appendChild(flade);

      // Listerne: store knapper, der også virker uden at ramme en lille nål. Personer står grupperet efter sted.
      function knap(i) {
        var b = el('button', 'btn' + (i.valgt ? ' primary' : '')); b.type = 'button';
        b.innerHTML = '<span>' + esc(i.navn) + '</span>' + (!i.gruppe && i.sted ? '<small>' + esc(i.sted) + '</small>' : '');
        b.addEventListener('click', function () { done({ maal: i.maal, navn: i.navn }); });
        return b;
      }
      function liste(items, gruppe) {
        var d = el('div', 'kort-liste' + (gruppe ? ' grupper' : ''));
        if (gruppe) {
          var ud = {}, raekke = [];
          items.forEach(function (i) { var g = i.sted || ''; if (!ud[g]) { ud[g] = []; raekke.push(g); } i.gruppe = true; ud[g].push(i); });
          raekke.forEach(function (g) {
            d.appendChild(el('div', 'kort-gruppe', esc(g === 'ude' ? 'Udenfor' : g)));
            var r = el('div', 'kort-chips'); ud[g].forEach(function (i) { r.appendChild(knap(i)); }); d.appendChild(r);
          });
        } else items.forEach(function (i) { d.appendChild(knap(i)); });
        if (!items.length) d.appendChild(el('p', 'task-help', 'Ingen her lige nu.'));
        return d;
      }
      var sider = [];
      function side(navn, items, gruppe) {
        var t = el('button', 'tab', esc(navn)); t.type = 'button';
        var l = liste(items, gruppe);
        sider.push({ t: t, l: l });
        t.addEventListener('click', function () { vis(navn); });
        tabs.appendChild(t); krop.appendChild(l);
        t.dataset.navn = navn;
      }
      function vis(navn) {
        sider.forEach(function (s) { var paa = s.t.dataset.navn === navn; s.t.classList.toggle('on', paa); s.l.hidden = !paa; });
        v.classList.toggle('paa-personer', navn === 'Personer');
      }
      side('Steder', o.steder || []);
      if (o.personer && o.personer.length) side('Personer', o.personer, true);
      else tabs.hidden = true;
      vis('Steder');

      // Foden: missionen og en lille forklaring
      var fod = el('div', 'kort-fod');
      fod.appendChild(el('p', 'task-help', o.valgt ? 'Pilen viser vej til <b>' + esc(o.valgt) + '</b>.' : 'Tryk på et sted, så viser en pil i kanten af skærmen vej.'));
      if (o.mission) {
        var m = el('button', 'btn small' + (o.valgt ? ' primary' : ''), (o.valgt ? 'Følg missionen igen' : 'Vis vej til missionen')); m.type = 'button';
        m.addEventListener('click', function () { done({ mission: true }); });
        fod.appendChild(m);
      }
      v.appendChild(fod);

      luk.addEventListener('click', function () { done(null); });
      bg.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') { e.stopPropagation(); e.preventDefault(); done(null); }
      });
      bg.addEventListener('pointerdown', function (e) { if (e.target === bg) done(null); });
      bg._fokus = luk;
      return bg;
    }
  };
})();
