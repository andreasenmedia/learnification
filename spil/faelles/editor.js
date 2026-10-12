/* Learnification — figureditoren
   Den samme "lav din figur" i Eventyrbiblioteket (klædeskabet) og i spillene.
   Den bygger kun indholdet; hvert spil lægger det i sit eget vindue.

     var ed = LFEditor.bygg({
       navn: 'Freja',                 // udfyldt navn (udelades, hvis man ikke skal vælge navn)
       visNavn: true,
       look: {...}, oplaast: ['hat:beret'],
       lyd: function () {},           // klik-lyd
       tastatur: function (input) {}, // kaldes med navnefeltet (skærmtastatur)
       enter: function () {}          // tryk på Enter i navnefeltet
     });
     ed.node  -> DOM-elementet
     ed.look  -> det valgte udseende (kopi)
     ed.navn  -> det skrevne navn */
(function () {
  'use strict';
  var LFEditor = window.LFEditor = window.LFEditor || {};

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(cls, html) { var b = el('button', cls, html); b.type = 'button'; return b; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  LFEditor.bygg = function (opt) {
    var F = window.LFFigur, P = window.LFProfil;
    var look = F.ren(opt.look), lyd = opt.lyd || function () {}, step = 0;
    var oplaast = opt.oplaast || [];
    var node = el('div', 'fig-ed');

    var navnFelt = null;
    if (opt.visNavn) {
      var nr = el('div', 'fig-navn');
      navnFelt = el('input', 'name-in'); navnFelt.maxLength = 16; navnFelt.placeholder = 'Dit navn';
      navnFelt.value = opt.navn || ''; navnFelt.setAttribute('aria-label', 'Dit navn');
      navnFelt.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter' && opt.enter) { e.preventDefault(); opt.enter(); } });
      nr.appendChild(navnFelt);
      node.appendChild(nr);
      if (opt.tastatur) setTimeout(function () { opt.tastatur(navnFelt); }, 0);
    }

    var body = el('div', 'fig-krop'); node.appendChild(body);
    var prev = el('div', 'fig-prev'), cv = F.canvas(64, 64); prev.appendChild(cv); body.appendChild(prev);
    var rows = el('div', 'fig-rows'); body.appendChild(rows);

    function paint() {
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false; c.fillStyle = '#2a2140'; c.fillRect(0, 0, 64, 64);
      c.drawImage(F.makeSheet(look), (step % 3) * 16, 0, 16, 16, 0, 2, 64, 64);
    }

    function huer() {
      var ids = ['']; // ingen hat
      oplaast.forEach(function (id) { var g = F.GENSTANDE.filter(function (x) { return x.id === id; })[0]; if (g) ids.push(g.hat); });
      return ids;
    }
    function hatNavn(h) {
      if (!h) return 'Ingen';
      var g = F.GENSTANDE.filter(function (x) { return x.hat === h; })[0];
      return g ? g.navn : h;
    }

    // [overskrift, muligheder(), nøgle, tekst(værdi) — uden den vises en farveprøve, skjul()]
    var spec = [
      ['Frisure', function () { return F.STYLES.map(function (s) { return s[0]; }); }, 'style', function (v) { return F.STYLES.filter(function (s) { return s[0] === v; })[0][1]; }],
      ['Hårfarve', function () { return F.HAIRC; }, 'hair'],
      ['Hudfarve', function () { return F.SKIN; }, 'skin'],
      ['Trøje', function () { return F.CLOTH; }, 'cloth'],
      ['Bukser', function () { return F.PANTS; }, 'pants'],
      ['Ekstra', function () { return F.EXTRAS.map(function (s) { return s[0]; }); }, 'extra', function (v) { return F.EXTRAS.filter(function (s) { return s[0] === v; })[0][1]; }],
      ['Hat', huer, 'hat', hatNavn, function () { return huer().length < 2; }],
      ['Hattefarve', function () { return F.HATCOL; }, 'hatColor', null, function () { return !(look.hat || look.style === 'kasket'); }]
    ];
    var raekker = [];

    function visVaerdi(sp, v) {
      var cur = look[sp[2]];
      if (sp[3]) v.textContent = sp[3](cur); else v.innerHTML = '<i class="fig-prove" style="background:' + cur + '"></i>';
    }
    function opdaterSkjul() { raekker.forEach(function (x) { x.r.hidden = !!(x.sp[4] && x.sp[4]()); }); }

    spec.forEach(function (sp) {
      var r = el('div', 'fig-row'); r.appendChild(el('span', 'lbl', sp[0]));
      var l = btn('arr', '&#9664;'), v = el('span', 'val'), rr = btn('arr', '&#9654;');
      l.setAttribute('aria-label', sp[0] + ': forrige'); rr.setAttribute('aria-label', sp[0] + ': næste');
      function skift(d) {
        var opts = sp[1](), i = opts.indexOf(look[sp[2]]); if (i < 0) i = 0;
        look[sp[2]] = opts[(i + d + opts.length) % opts.length];
        visVaerdi(sp, v); opdaterSkjul(); paint(); lyd();
      }
      l.addEventListener('click', function () { skift(-1); }); rr.addEventListener('click', function () { skift(1); });
      r.appendChild(l); r.appendChild(v); r.appendChild(rr); rows.appendChild(r);
      raekker.push({ r: r, sp: sp, v: v });
      visVaerdi(sp, v);
    });
    opdaterSkjul();

    var rnd = btn('btn small', 'Tilfældig');
    rnd.addEventListener('click', function () {
      var t = F.tilfaeldig(); t.hat = look.hat;     // hatten vælger man selv
      Object.keys(t).forEach(function (k) { look[k] = t[k]; });
      raekker.forEach(function (x) { visVaerdi(x.sp, x.v); });
      opdaterSkjul(); paint(); lyd();
    });
    rows.appendChild(rnd);

    // Tøj, der endnu ikke er fortjent: vises som en hængelås med, hvor man får det
    var laast = P.tilgaengelige({ oplaast: oplaast }).filter(function (g) { return g.laast; });
    if (laast.length) {
      var box = el('div', 'fig-laast');
      box.appendChild(el('b', null, 'Mere tøj på vej'));
      var ul = el('ul'); laast.forEach(function (g) { ul.appendChild(el('li', null, '&#128274; ' + esc(g.navn) + ' <small>' + esc(g.kilde) + '</small>')); });
      box.appendChild(ul); node.appendChild(box);
    }

    // figuren går lidt på stedet, så man kan se den bevæge sig
    var iv = setInterval(function () { if (!node.isConnected && node.__sat) { clearInterval(iv); return; } if (node.isConnected) node.__sat = true; step++; paint(); }, 260);
    paint();

    return {
      node: node,
      get look() { return F.ren(look); },
      get navn() { return navnFelt ? navnFelt.value.trim().slice(0, 16) : (opt.navn || ''); },
      fokus: function () { if (navnFelt) navnFelt.focus(); }
    };
  };
})();
