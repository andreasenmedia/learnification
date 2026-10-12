/* Runeborg — alt det, der ligger oven på verden: dialog, opgaver,
   Dagbogen, menuen, titel- og slutskærm. Det er almindelig HTML, så teksten
   er skarp og kan læses op. Hver funktion giver et Promise tilbage, så
   historien i content.js kan skrives som en lige linje: await sig, await opgave. */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {};
  var layer, open = 0;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  BB.esc = esc;

  function push(node) { layer.appendChild(node); open++; BB.audio.sfx('open'); return node; }
  function pop(node) { BB.vkbd.release(node); if (node.parentNode) node.parentNode.removeChild(node); open = Math.max(0, open - 1); }

  // Tastatur til vinduerne: E / Enter / mellemrum går videre i dialog.
  var advanceFn = null;
  document.addEventListener('keydown', function (e) {
    if (!advanceFn) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      e.preventDefault(); advanceFn();
    }
  });

  // Tryk hvor som helst på skærmen går videre i dialog — ikke kun på
  // tekstboksen. Et tryk tæller kun, hvis fingeren kom ned, EFTER at
  // replikken kom frem; ellers ville trykket, der startede samtalen, springe
  // den første replik over. Knapper (E, Bog, Menu, læs op) er undtaget.
  var replikTid = 0, nede = {};
  document.addEventListener('pointerdown', function (e) { nede[e.pointerId] = performance.now(); }, true);
  document.addEventListener('pointerup', function (e) {
    var t0 = nede[e.pointerId]; delete nede[e.pointerId];
    if (!advanceFn || t0 === undefined || t0 < replikTid || e.button > 0) return;
    if (e.target.closest && e.target.closest('button, a, input, textarea, select, label, #vkbd')) return;
    advanceFn();
  });

  var UI = BB.ui = {
    init: function () { layer = document.getElementById('layer'); },
    isOpen: function () { return open > 0; },
    // E-knappen på skærmen: går videre i en replik, hvis der er en
    advance: function () { if (!advanceFn) return false; advanceFn(); return true; },

    // ---------------------------------------------------------------- dialog
    say: function (who, text, speakText) {
      return new Promise(function (resolve) {
        var d = el('div', 'dialog px' + (who ? '' : ' narrator'));
        d.setAttribute('role', 'dialog');
        if (who) {
          var pc = BB.portrait(who.sheet, 64); pc.className = 'portrait'; d.appendChild(pc);
        }
        var box = el('div');
        if (who) box.appendChild(el('div', 'who', esc(who.name)));
        var sayEl = el('div', 'say'); box.appendChild(sayEl);
        d.appendChild(box);
        var nx = el('div', 'next', '&#9660; <span class="key">E</span>'); d.appendChild(nx);
        var again = el('button', 'say-again', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"/></svg>'); again.type = 'button'; again.title = 'Læs op igen'; again.setAttribute('aria-label', 'Læs op igen');
        if (BB.voice.on) d.appendChild(again);
        push(d);
        var voiceText = speakText || text, voiceWho = who ? who.id : null;
        BB.voice.speak(voiceText, voiceWho);
        again.addEventListener('click', function (e) { e.stopPropagation(); BB.voice.speak(voiceText, voiceWho); });
        text = text.replace(/\{navn\}/g, esc(BB.state.name || 'lærling'));
        // hurtig skrivemaskine — kan springes over med et tryk
        var full = text, i = 0, done = false;
        var plain = full.replace(/<[^>]+>/g, '');
        var timer = setInterval(function () {
          i += 2;
          if (i >= plain.length) { finish(); return; }
          sayEl.textContent = plain.slice(0, i);
        }, 16);
        function finish() { clearInterval(timer); done = true; sayEl.innerHTML = full; }
        function adv() {
          if (!done) { finish(); return; }
          advanceFn = null; BB.voice.stop(); BB.audio.sfx('blip'); pop(d); resolve();
        }
        advanceFn = adv; replikTid = performance.now();
      });
    },

    ask: function (who, text, choices) {
      return new Promise(function (resolve) {
        var d = el('div', 'dialog px' + (who ? '' : ' narrator'));
        if (who) { var pc = BB.portrait(who.sheet, 64); pc.className = 'portrait'; d.appendChild(pc); }
        var box = el('div');
        if (who) box.appendChild(el('div', 'who', esc(who.name)));
        box.appendChild(el('div', 'say', text));
        var ch = el('div', 'choices');
        choices.forEach(function (c, i) {
          var b = el('button', 'btn', esc(c)); b.type = 'button';
          b.addEventListener('click', function () { BB.voice.stop(); pop(d); resolve(i); });
          ch.appendChild(b);
        });
        box.appendChild(ch); d.appendChild(box); push(d);
        BB.voice.speak(text, who ? who.id : null);
        setTimeout(function () { var f = ch.querySelector('button'); if (f) f.focus(); }, 30);
      });
    },

    toast: function (html) {
      var t = el('div', 'toast', html);
      document.getElementById('toasts').appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3800);
    },

    // ---------------------------------------------------------------- port
    // Vinduet ved en port: hvad er spillet, hvor langt er man, og vil man ind?
    // info: {navn, tekst, status, passer, tidSlut}. Giver true (gå ind) eller false.
    // Kortet (M) og den hurtige guide — vinduerne bygges i /spil/faelles/kort.js og guide.js
    kort: function (o) {
      return new Promise(function (resolve) {
        var bg; function done(v) { pop(bg); resolve(v); }
        bg = LFKort.bygg(o, done); push(bg); bg._fokus.focus();
      });
    },
    guide: function (o) {
      return new Promise(function (resolve) {
        var bg; function done() { pop(bg); resolve(); }
        bg = LFGuide.bygg(o, done); push(bg); bg._fokus.focus();
      });
    },

    port: function (info) {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu px'); bg.appendChild(m);
        m.setAttribute('role', 'dialog');
        m.appendChild(el('h2', null, esc(info.navn)));
        m.appendChild(el('p', null, esc(info.tekst)));
        if (info.passer) m.appendChild(el('p', 'tiny', '&#9733; Passer til din klasse'));
        m.appendChild(el('p', 'tiny', esc(info.status)));
        var row = el('div', 'end-row');
        var go = el('button', 'btn primary', info.tidSlut ? 'Spilletiden er brugt' : 'Gå ind'); go.type = 'button'; go.disabled = !!info.tidSlut;
        var nej = el('button', 'btn', 'Ikke nu'); nej.type = 'button';
        row.appendChild(go); row.appendChild(nej); m.appendChild(row);
        function ud(v) { pop(bg); resolve(v); }
        go.addEventListener('click', function () { ud(true); });
        nej.addEventListener('click', function () { ud(false); });
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); ud(false); } });
        push(bg); (info.tidSlut ? nej : go).focus();
      });
    },

    // ---------------------------------------------------------------- udseende
    // Både "lav din figur" første gang og klædeskabet bagefter.
    // opt: {titel, tekst, knap, visNavn, navn, look, oplaast, kanLukke}
    // Giver {navn, look} — eller null, hvis man lukker uden at gemme.
    udseende: function (opt) {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu fig-vindue px'); bg.appendChild(m);
        m.setAttribute('role', 'dialog');
        m.appendChild(el('h2', null, esc(opt.titel)));
        if (opt.tekst) m.appendChild(el('p', 'tiny', esc(opt.tekst)));
        var ok = el('button', 'btn primary', esc(opt.knap || 'Gem')); ok.type = 'button';
        var ed = LFEditor.bygg({
          visNavn: opt.visNavn, navn: opt.navn, look: opt.look, oplaast: opt.oplaast,
          lyd: function () { BB.audio.sfx('blip'); },
          tastatur: function (inp) { BB.vkbd.attach(inp, 'text'); },
          enter: function () { ok.click(); }
        });
        m.appendChild(ed.node);
        var row = el('div', 'end-row'); row.appendChild(ok);
        var luk = null;
        if (opt.kanLukke) { luk = el('button', 'btn', 'Luk uden at gemme'); luk.type = 'button'; row.appendChild(luk); }
        m.appendChild(row);
        function ud(v) { pop(bg); resolve(v); }
        ok.addEventListener('click', function () {
          if (opt.visNavn && !ed.navn) { BB.audio.sfx('blip'); ed.fokus(); return; }
          ud({ navn: ed.navn, look: ed.look });
        });
        if (luk) luk.addEventListener('click', function () { ud(null); });
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape' && opt.kanLukke) { e.stopPropagation(); ud(null); } });
        push(bg); if (opt.visNavn) ed.fokus(); else ok.focus();
      });
    },

    // ---------------------------------------------------------------- præstationer
    // Vinduet i Trofærummet: alle præstationer for et spil (eller alle), opnåede og endnu låste.
    praestationer: function (spil, profil) {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu praes-vindue px'); bg.appendChild(m);
        m.setAttribute('role', 'dialog');
        var har = (profil && profil.praes) || {}, a = LFPraes.antal(profil, spil);
        // Overskrift og Luk bliver stående øverst, mens listen ruller under dem
        var top = el('div', 'praes-top'), luk = el('button', 'btn small primary', 'Luk'); luk.type = 'button';
        top.appendChild(el('h2', null, spil ? esc(LFPraes.SPIL[spil]) : 'Alle præstationer'));
        top.appendChild(el('p', 'praes-sum', '<b>' + a.faerdig + '</b> af ' + a.ialt + ' præstationer'));
        top.appendChild(luk); m.appendChild(top);
        function dato(d) { var t = ('000000' + d).slice(-6); return t.slice(4, 6) + '.' + t.slice(2, 4) + '.20' + t.slice(0, 2); }
        (spil ? [spil] : ['runeborg', 'regnehelten', 'bib']).forEach(function (sp) {
          if (!spil) { var n = LFPraes.antal(profil, sp); m.appendChild(el('h3', null, esc(LFPraes.SPIL[sp]) + ' <small>' + n.faerdig + '/' + n.ialt + '</small>')); }
          var liste = el('div', 'praes-liste');
          LFPraes.forSpil(sp).forEach(function (pr) {
            var d = har[pr.id], faaet = d !== undefined, skjult = pr.skjult && !faaet;
            var kort = el('div', 'praes' + (faaet ? ' har' : ''));
            var g = pr.laas && LFFigur.GENSTANDE.filter(function (x) { return x.id === pr.laas; })[0];
            kort.innerHTML = '<span class="pi">' + LFPraes.ikon(skjult ? 'laas' : pr.ikon, 40, !faaet) + '</span>'
              + '<span class="pt"><b>' + esc(skjult ? '???' : pr.navn) + '</b>'
              + '<small>' + esc(skjult ? 'En hemmelig præstation.' : pr.tekst) + '</small>'
              + (g ? '<small class="pb">Giver tøj: ' + esc(g.navn) + '</small>' : '')
              + (faaet ? '<small class="pd">Fået ' + dato(d) + '</small>' : '') + '</span>';
            liste.appendChild(kort);
          });
          m.appendChild(liste);
        });
        function ud() { pop(bg); resolve(); }
        luk.addEventListener('click', ud);
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); ud(); } });
        push(bg); luk.focus();
      });
    },

    // ---------------------------------------------------------------- menu
    // Giver 'udseende', hvis man vil skifte tøj
    menu: function () {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu pause px'); bg.appendChild(m);
        m.appendChild(el('h2', null, 'Pause'));
        function toggle(label, get, set) {
          var b = el('button', 'btn toggle'); b.type = 'button';
          var paint = function () { b.innerHTML = '<span>' + label + '</span><span>' + (get() ? 'Til' : 'Fra') + '</span>'; };
          b.addEventListener('click', function () { set(!get()); paint(); BB.saveSettings(); }); paint(); m.appendChild(b); return b;
        }
        var first = el('button', 'btn primary', 'Fortsæt'); first.type = 'button'; m.appendChild(first);
        var guideB = el('button', 'btn', 'Sådan spiller du'); guideB.type = 'button'; m.appendChild(guideB);
        guideB.addEventListener('click', function () { pop(bg); resolve('guide'); });
        var skift = el('button', 'btn', 'Skift udseende'); skift.type = 'button'; m.appendChild(skift);
        skift.addEventListener('click', function () { pop(bg); resolve('udseende'); });
        toggle('Musik (L)', function () { return BB.audio.musicOn; }, function (v) { BB.audio.setMusic(v); });
        toggle('Lydeffekter', function () { return BB.audio.sfxOn; }, function (v) { BB.audio.setSfx(v); });
        toggle('Oplæsning', function () { return BB.voice.on; }, function (v) { BB.voice.on = v; });
        toggle('Større tekst', function () { return document.body.classList.contains('big'); }, function (v) { document.body.classList.toggle('big', v); });
        if (BB.canFullscreen) toggle('Fuld skærm', function () { return BB.isFullscreen(); }, function () { BB.toggleFullscreen(); });
        var home = el('a', 'btn', 'Til Learnification.dk'); home.href = '/'; home.style.textDecoration = 'none'; m.appendChild(home);
        if (window.LF_SPILLER && window.LFSpil) {
          // Gik den voksne ind som barnet fra /konto, kan den voksne komme tilbage.
          if (LF_SPILLER.tilbage_til) {
            var tilbage = el('a', 'btn', 'Tilbage til ' + String(LF_SPILLER.tilbage_til).replace(/[<>&]/g, ''));
            tilbage.href = '/spil/?tilbage=1'; tilbage.style.textDecoration = 'none'; m.appendChild(tilbage);
          }
          var hvem = LF_SPILLER.hvem === 'elev' ? LF_SPILLER.elev.kaldenavn : 'voksen';
          var ud = el('button', 'btn', 'Log ud (' + hvem.replace(/[<>&]/g, '') + ')'); ud.type = 'button'; m.appendChild(ud);
          ud.addEventListener('click', function () { LFSpil.logUd('/login'); });
        }
        function done() { pop(bg); resolve(); }
        first.addEventListener('click', done);
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); done(); } });
        push(bg); first.focus();
      });
    }
  };

  // ---------------------------------------------------------------- skærmtastatur
  // Kun på berøringsskærme: QWERTY med æøå til navnet, taltastatur til regning.
  // Telefonens eget tastatur holdes nede (inputmode="none"), så der ikke
  // kommer to tastaturer oven på hinanden.
  BB.vkbd = (function () {
    var box = null, input = null, mode = 'text', shift = true;
    var ROWS = {
      text: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'å'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'æ', 'ø'], ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'], ['mellemrum', 'OK']],
      num: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], [',', '0', '⌫'], ['OK']]
    };
    function draw() {
      box.innerHTML = ''; box.className = mode === 'num' ? 'num' : '';
      ROWS[mode].forEach(function (row) {
        var r = el('div', 'vk-row');
        row.forEach(function (k) {
          var label = k.length === 1 && shift && mode === 'text' ? k.toUpperCase() : k;
          var cls = 'vk' + (k === 'OK' ? ' ok wide' : k === 'mellemrum' ? ' space' : (k === '⇧' || k === '⌫') ? ' wide' : '') + (k === '⇧' && shift ? ' on' : '');
          var b = el('button', cls, esc(label));
          b.type = 'button'; b.tabIndex = -1;
          b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(k); });
          r.appendChild(b);
        });
        box.appendChild(r);
      });
      document.documentElement.style.setProperty('--vk-h', box.offsetHeight + 'px');
    }
    function press(k) {
      if (!input) return;
      BB.audio.sfx('blip');
      var v = input.value;
      if (k === '⌫') v = v.slice(0, -1);
      else if (k === '⇧') { shift = !shift; draw(); return; }
      else if (k === 'OK') { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); return; }
      else {
        var ch = k === 'mellemrum' ? ' ' : (shift && mode === 'text' ? k.toUpperCase() : k);
        if (input.maxLength > 0 && v.length >= input.maxLength) return;
        v += ch;
        if (shift && mode === 'text') { shift = false; draw(); }
      }
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (mode === 'text' && v === '' && !shift) { shift = true; draw(); }
    }
    return {
      attach: function (inp, m) {
        if (!document.body.classList.contains('touching')) return;
        box = box || document.getElementById('vkbd');
        input = inp; mode = m; shift = inp.value === '';
        inp.setAttribute('inputmode', 'none');
        box.hidden = false; document.body.classList.add('vkbd-open'); draw();
        if (BB.wakeTouch) BB.wakeTouch();
        setTimeout(function () { inp.scrollIntoView({ block: 'center' }); }, 50);
      },
      release: function (node) {
        if (!input || !node.contains(input)) return;
        input = null; box.hidden = true; document.body.classList.remove('vkbd-open');
      }
    };
  })();
})();
