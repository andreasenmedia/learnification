/* Regnehelten — alt det, der ligger oven på verden: dialog, opgaver,
   Dagbogen (missioner, Regnebogen og tasken), menuen, titel- og slutskærm
   og de to pausespil. Bygget som Runeborgs ui.js: almindelig HTML, så
   teksten er skarp og kan læses op, og hver funktion giver et Promise
   tilbage, så historien kan skrives som en lige linje: await sig, await opgave.

   Matematikken har otte måder at svare på (skriv, vælg, find dem alle,
   vægtskål, talrække, rigtigt/forkert, byg selv, betal præcis). Alle bor i
   det samme opgavevindue som Runeborgs opgaver. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var layer, open = 0;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function btn(cls, html) { var b = el('button', cls, html); b.type = 'button'; return b; }
  RH.esc = esc;

  function push(node) { layer.appendChild(node); open++; RH.audio.sfx('open'); return node; }
  function pop(node) { RH.vkbd.release(node); if (node.parentNode) node.parentNode.removeChild(node); open = Math.max(0, open - 1); }

  var SPEAKER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"/></svg>';
  var PRAISE = ['Præcis!', 'Lige i øjet.', 'Korrekt.', 'Sådan!', 'Helt rigtigt.', 'Flot regnet.', 'Det sidder lige i skabet.'];

  // Tastatur til vinduerne: E / Enter / mellemrum går videre i dialog
  var advanceFn = null;
  document.addEventListener('keydown', function (e) {
    if (!advanceFn) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      e.preventDefault(); advanceFn();
    }
  });

  var UI = RH.ui = {
    init: function () { layer = document.getElementById('layer'); },
    isOpen: function () { return open > 0; },

    // ---------------------------------------------------------------- dialog
    say: function (who, text, speakText) {
      return new Promise(function (resolve) {
        var d = el('div', 'dialog px' + (who ? '' : ' narrator'));
        d.setAttribute('role', 'dialog');
        if (who) { var pc = RH.portrait(who.sheet, 64); pc.className = 'portrait'; d.appendChild(pc); }
        var box = el('div');
        if (who) box.appendChild(el('div', 'who', esc(who.name)));
        var sayEl = el('div', 'say'); box.appendChild(sayEl);
        d.appendChild(box);
        d.appendChild(el('div', 'next', '&#9660; <span class="key">E</span>'));
        var again = btn('say-again', SPEAKER); again.title = 'Læs op igen'; again.setAttribute('aria-label', 'Læs op igen');
        var voiceText = speakText || text, voiceWho = who ? who.id : null;
        if (RH.voice.on && RH.voice.has(voiceText, voiceWho)) d.appendChild(again);
        push(d);
        RH.voice.speak(voiceText, voiceWho);
        again.addEventListener('click', function (e) { e.stopPropagation(); RH.voice.speak(voiceText, voiceWho); });
        text = text.replace(/\{navn\}/g, esc(RH.state.name || 'du'));
        // hurtig skrivemaskine — kan springes over med et tryk
        var full = text, i = 0, done = false, plain = full.replace(/<[^>]+>/g, '');
        var timer = setInterval(function () {
          i += 2;
          if (i >= plain.length) { finish(); return; }
          sayEl.textContent = plain.slice(0, i);
        }, 16);
        function finish() { clearInterval(timer); done = true; sayEl.innerHTML = full; }
        function adv() {
          if (!done) { finish(); return; }
          advanceFn = null; RH.voice.stop(); RH.audio.sfx('blip'); pop(d); resolve();
        }
        advanceFn = adv;
        d.addEventListener('click', adv);
      });
    },

    // Et spørgsmål med valgknapper — giver nummeret på det valgte svar
    ask: function (who, text, choices) {
      return new Promise(function (resolve) {
        var d = el('div', 'dialog px' + (who ? '' : ' narrator'));
        if (who) { var pc = RH.portrait(who.sheet, 64); pc.className = 'portrait'; d.appendChild(pc); }
        var box = el('div');
        if (who) box.appendChild(el('div', 'who', esc(who.name)));
        box.appendChild(el('div', 'say', text));
        var ch = el('div', 'choices');
        choices.forEach(function (c, i) {
          var b = btn('btn', esc(c));
          b.addEventListener('click', function () { RH.voice.stop(); pop(d); resolve(i); });
          ch.appendChild(b);
        });
        box.appendChild(ch); d.appendChild(box); push(d);
        RH.voice.speak(text, who ? who.id : null);
        setTimeout(function () { var f = ch.querySelector('button'); if (f) f.focus(); }, 30);
      });
    },

    toast: function (html) {
      var t = el('div', 'toast', html);
      document.getElementById('toasts').appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3800);
    },

    // ---------------------------------------------------------------- opgaver
    // Giver {first, tries, klaret} — eller null, hvis man lukker ("Senere").
    // meta: {who, area, count, kraft, onBook}
    opgave: function (S0, meta) {
      meta = meta || {};
      var O = RH.opgaver;
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg');
        var box = el('div', 'task px'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
        bg.appendChild(box);
        var head = el('div', 'task-head');
        head.appendChild(el('span', 'task-area', esc(meta.area || 'Matematik')));
        var right = el('span', 'task-count');
        right.innerHTML = (meta.count ? esc(meta.count) : '') + (meta.kraft != null ? ' <span class="kraft" title="Regnekraft"><i class="ico ico-kraft"></i>' + meta.kraft + ' %</span>' : '');
        head.appendChild(right);
        box.appendChild(head);

        var main = el('div', 'task-main'); box.appendChild(main);
        if (meta.who) {
          var w = el('div', 'task-who');
          var pc = RH.portrait(meta.who.sheet, 48); pc.className = 'mini'; w.appendChild(pc);
          w.appendChild(el('b', null, esc(meta.who.name)));
          main.appendChild(w);
        }
        var qText = S0.q;
        if (RH.voice.on && RH.voice.has(qText, meta.who ? meta.who.id : null)) {
          var rd = btn('btn small read-q', SPEAKER + ' Læs op');
          rd.addEventListener('click', function () { RH.voice.speak(qText, meta.who ? meta.who.id : null); });
          main.appendChild(rd);
        }
        main.appendChild(el('p', 'task-q', esc(qText)));
        var area = el('div', 'task-area-play'); main.appendChild(area);

        var fb = el('div', 'feedback'); main.appendChild(fb);
        var foot = el('div', 'task-foot');
        var later = btn('btn small', 'Senere');
        var bookB = btn('btn small', 'Regnebogen');
        var ok = btn('btn primary', 'Tjek svar');
        foot.appendChild(later); if (meta.onBook) foot.appendChild(bookB); foot.appendChild(el('span', 'spacer')); foot.appendChild(ok);
        main.appendChild(foot);

        var G = GAMES[S0.kind](S0, area, ok);
        var maxTries = { build: 4, findall: 3, coins: 3 }[S0.kind] || 2;
        var tries = 0, solved = false, finished = false;
        push(bg);
        setTimeout(function () { if (G.focus) G.focus(); else ok.focus(); }, 60);

        later.addEventListener('click', function () { RH.voice.stop(); pop(bg); resolve(null); });
        bookB.addEventListener('click', function () { if (meta.onBook) meta.onBook(S0.book); });
        ok.addEventListener('click', function () { if (finished) finish(); else check(); });
        bg.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { e.stopPropagation(); RH.voice.stop(); pop(bg); resolve(null); return; }
          if (finished) return;
          if (G.key && G.key(e)) { e.preventDefault(); e.stopPropagation(); }
        });
        G.onEnter = function () { if (finished) finish(); else check(); };

        function check() {
          var r = G.evaluate();
          if (r === 'empty') { show('bad', G.emptyMsg || 'Vælg et svar først.'); return; }
          tries++;
          if (r.ok) {
            solved = true; finished = true; RH.audio.sfx('good');
            var praise = tries === 1 ? PRAISE[(Math.random() * PRAISE.length) | 0] : 'Rigtigt — du blev ved, og det virkede!';
            show('good', '<b>' + praise + '</b>');
            done();
          } else if (tries >= maxTries) {
            finished = true; RH.audio.sfx('soft');
            show('bad', '<b>Svaret er ' + esc(answerText(S0)) + '.</b> ' + esc(S0.hint) + '<br><span class="soft">Det er helt i orden. Næste gang ved du, hvordan man gør.</span>');
            if (G.reveal) G.reveal();
            done();
          } else {
            RH.audio.sfx('soft');
            show('bad', '<b>Ikke helt.</b> ' + (r.msg ? esc(r.msg) + ' ' : '') + '<br><b>Tip:</b> ' + esc(S0.hint) + ' <span class="soft">Prøv igen — det er her, man lærer mest.</span>');
            if (G.reset) G.reset();
          }
        }
        function done() { ok.textContent = 'Videre'; later.hidden = true; G.lock && G.lock(); ok.focus(); }
        function show(kind, html) { fb.className = 'feedback show ' + kind; fb.innerHTML = html; }
        function finish() { RH.voice.stop(); pop(bg); resolve({ first: solved && tries === 1, tries: tries, klaret: solved }); }
      });
    },

    // ---------------------------------------------------------------- Dagbogen
    // Giver {spil: 'fodbold'} tilbage, hvis man vælger et pausespil i tasken.
    // Midt i en opgave (iOpgave) kan man slå op, men ikke gå i gang med et pausespil.
    book: function (tab, side, iOpgave) {
      return new Promise(function (resolve) {
        var S = RH.state, K = RH.content;
        var bg = el('div', 'modal-bg');
        var b = el('div', 'book px'); bg.appendChild(b);
        var head = el('div', 'book-head');
        head.appendChild(el('h2', null, 'Dagbogen'));
        var tabs = el('div', 'tabs'); head.appendChild(tabs);
        var close = btn('btn small', 'Luk'); head.appendChild(close);
        b.appendChild(head);
        var body = el('div'); b.appendChild(body);
        var names = [['missioner', 'Missioner'], ['regnebogen', 'Regnebogen'], ['tasken', 'Tasken']];
        names.forEach(function (n) {
          var t = btn('tab', n[1]);
          t.addEventListener('click', function () { show(n[0]); });
          tabs.appendChild(t); n.push(t);
        });
        function show(which, arg) {
          names.forEach(function (n) { n[2].classList.toggle('on', n[0] === which); });
          body.innerHTML = '';
          if (which === 'missioner') missioner(body, S, K);
          else if (which === 'regnebogen') regnebogen(body, arg || side || 'plus');
          else tasken(body, S, K, iOpgave ? null : function (spil) { pop(bg); resolve({ spil: spil }); });
        }
        function done() { pop(bg); resolve(null); }
        close.addEventListener('click', done);
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') { e.stopPropagation(); done(); } });
        push(bg); show(tab || 'missioner', side); close.focus();
      });
    },

    // ---------------------------------------------------------------- menu
    menu: function () {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu px'); bg.appendChild(m);
        m.appendChild(el('h2', null, 'Pause'));
        function toggle(label, get, set) {
          var b = btn('btn toggle');
          var paint = function () { b.innerHTML = '<span>' + label + '</span><span>' + (get() ? 'Til' : 'Fra') + '</span>'; };
          b.addEventListener('click', function () { set(!get()); paint(); RH.saveSettings(); }); paint(); m.appendChild(b); return b;
        }
        var first = btn('btn', 'Fortsæt'); m.appendChild(first);
        toggle('Musik', function () { return RH.audio.musicOn; }, function (v) { RH.audio.setMusic(v); });
        toggle('Lydeffekter', function () { return RH.audio.sfxOn; }, function (v) { RH.audio.setSfx(v); });
        toggle('Oplæsning af dialog', function () { return RH.voice.on; }, function (v) { RH.voice.on = v; });
        toggle('Større tekst', function () { return document.body.classList.contains('big'); }, function (v) { document.body.classList.toggle('big', v); });
        if (RH.canFullscreen) toggle('Fuld skærm', function () { return RH.isFullscreen(); }, function () { RH.toggleFullscreen(); });
        var kapB = btn('btn', 'Kapitler'); m.appendChild(kapB);
        kapB.addEventListener('click', function () { pop(bg); resolve('kapitler'); });
        var restart = btn('btn', 'Start forfra'); m.appendChild(restart);
        var home = el('a', 'btn', 'Til Learnification.dk'); home.href = '/regnehelten'; home.style.textDecoration = 'none'; m.appendChild(home);
        // Logget ind? Så kan man logge ud herfra — vigtigt på en delt skolecomputer
        if (window.LF_SPILLER && window.LFSpil) {
          // Tilbage til spiloversigten; pagehide gemmer, før siden skifter
          var andre = el('a', 'btn', 'Vælg et andet spil'); andre.href = '/spil/'; andre.style.textDecoration = 'none'; m.appendChild(andre);
          // Gik den voksne ind som barnet fra /konto, kan den voksne komme tilbage.
          // Skiftet sker på /spil/, så spillet når at gemme som barnet først (pagehide)
          if (LF_SPILLER.tilbage_til) {
            var tilbage = el('a', 'btn', 'Tilbage til ' + String(LF_SPILLER.tilbage_til).replace(/[<>&]/g, ''));
            tilbage.href = '/spil/?tilbage=1'; tilbage.style.textDecoration = 'none'; m.appendChild(tilbage);
          }
          var hvem = LF_SPILLER.hvem === 'elev' ? LF_SPILLER.elev.kaldenavn : 'voksen';
          var ud = btn('btn', 'Log ud (' + esc(hvem) + ')'); m.appendChild(ud);
          ud.addEventListener('click', function () { LFSpil.logUd('/login'); });   // pagehide gemmer spillet
        }
        m.appendChild(el('div', 'keys', '<span class="key">&#8592;&#8593;&#8594;&#8595;</span><span>Gå (eller WASD)</span><span class="key">E</span><span>Tal, undersøg, gå videre</span><span class="key">B</span><span>Dagbogen med Regnebogen og tasken</span><span class="key">F</span><span>Fuld skærm</span><span class="key">M</span><span>Musik til/fra</span><span class="key">Esc</span><span>Denne menu</span>'));
        function done() { pop(bg); resolve(); }
        first.addEventListener('click', done);
        restart.addEventListener('click', function () {
          if (window.confirm('Vil du starte forfra? Alt, du har nået, bliver slettet.')) RH.resetGame();
        });
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); done(); } });
        push(bg); first.focus();
      });
    },

    // ---------------------------------------------------------------- titel
    // hasSave er navnet fra det gemte spil ('' = intet gemt)
    // info: {kap, kapnavn, naeste} — kapitlet, man står i, og navnet på det næste, hvis det er låst op
    title: function (hasSave, info) {
      info = info || {};
      return new Promise(function (resolve) {
        var s = el('div', 'screen-full'), c = el('div', 'title-card px'); s.appendChild(c);
        c.appendChild(el('h1', null, 'Regnehelten'));
        c.appendChild(el('p', 'sub', 'En helt almindelig skoledag — fuld af tal. Kan du vise Hr. Poulsen, hvad du kan?'));
        var row = el('div', 'row');
        if (hasSave) {
          var cont = btn('btn' + (info.naeste ? '' : ' primary'), 'Fortsæt som ' + esc(hasSave) + (info.kapnavn ? ' <small>· ' + esc(info.kapnavn) + '</small>' : '')); row.appendChild(cont);
          cont.addEventListener('click', function () { RH.audio.unlock(); pop(s); resolve('continue'); });
          if (info.naeste) {
            var nxt = btn('btn primary', 'Næste kapitel: ' + esc(info.naeste) + ' →'); row.insertBefore(nxt, cont);
            nxt.addEventListener('click', function () { RH.audio.unlock(); pop(s); resolve('naeste'); });
          }
        }
        var nw = btn('btn' + (hasSave ? '' : ' primary'), 'Nyt spil'); row.appendChild(nw);
        nw.addEventListener('click', function () {
          if (hasSave && !window.confirm('Et nyt spil sletter det, du har gemt. Vil du det?')) return;
          RH.audio.unlock(); pop(s); resolve('new');
        });
        c.appendChild(row);
        c.appendChild(el('p', 'tiny', 'Spillet gemmer af sig selv. Er du logget ind, kan du spille videre på en anden computer eller tablet. <a href="/for-voksne#data">Hvad gemmes?</a>'));
        push(s); (row.querySelector('.primary') || nw).focus();
      });
    },

    // En anden skærm har gemt nyere fremskridt — hent det, før der spilles videre
    konflikt: function () {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu px'); bg.appendChild(m);
        m.setAttribute('role', 'alertdialog'); m.setAttribute('aria-modal', 'true');
        m.appendChild(el('h2', null, 'Du har spillet videre et andet sted'));
        m.appendChild(el('p', null, 'Spillet er gemt på en anden computer eller tablet, efter du startede her. Vi henter det nyeste, så du ikke mister noget.'));
        var ok = btn('btn primary', 'Hent det nyeste'); m.appendChild(ok);
        ok.addEventListener('click', function () { ok.disabled = true; resolve(); });
        bg.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') resolve(); });
        push(bg); ok.focus();
      });
    },

    // Navn, klassetrin og udseende. pre er det sidst gemte, så man ikke skal starte forfra med alt.
    create: function (pre) {
      return new Promise(function (resolve) {
        var K = RH.content, O = RH.opgaver;
        var s = el('div', 'screen-full'), c = el('div', 'title-card px create'); s.appendChild(c);
        c.appendChild(el('h2', null, 'Hvem er du?'));
        var name = el('input', 'name-in'); name.maxLength = 12; name.placeholder = 'Dit navn'; name.setAttribute('aria-label', 'Dit navn');
        name.value = (pre && pre.name) || '';
        c.appendChild(name);
        c.appendChild(el('p', 'tiny', 'Dit fornavn eller et kælenavn. Det bliver kun i spillet.'));
        c.appendChild(el('h3', null, 'Hvilken klasse går du i?'));
        var kl = el('div', 'klasser'), klasse = (pre && pre.klasse) || O.STANDARD_KLASSE;
        var maal = el('p', 'tiny maal');
        O.KLASSER.forEach(function (k) {
          var b = btn('kl', k + '.');
          b.setAttribute('aria-label', k + '. klasse');
          b.addEventListener('click', function () { klasse = k; paintK(); });
          kl.appendChild(b);
        });
        function paintK() {
          [].forEach.call(kl.children, function (b, i) { b.classList.toggle('sel', O.KLASSER[i] === klasse); b.setAttribute('aria-pressed', O.KLASSER[i] === klasse); });
          maal.textContent = O.trin(klasse).navn + ': ' + O.trin(klasse).maal;
        }
        c.appendChild(kl); c.appendChild(maal); paintK();
        c.appendChild(el('h3', null, 'Sådan ser du ud'));
        var look = Object.assign({}, K.STD_LOOK, (pre && pre.look) || {});
        var ed = lookEditor(look); c.appendChild(ed.node);
        var go = btn('btn primary', 'Begynd'); c.appendChild(go);
        function start() {
          var n = name.value.trim().slice(0, 12);
          if (!n) { name.focus(); name.classList.add('need'); UI.toast('Skriv lige dit navn først'); return; }
          pop(s); resolve({ name: n, klasse: klasse, look: ed.look });
        }
        go.addEventListener('click', start);
        name.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); start(); } e.stopPropagation(); });
        name.addEventListener('input', function () { name.classList.remove('need'); });
        push(s); name.focus(); RH.vkbd.attach(name, 'text');
      });
    },

    // ---------------------------------------------------------------- slut
    // opt: {titel, tekst, rundt, naeste} — naeste er navnet på det næste kapitel (eller tom). Resolver 'naeste' eller undefined.
    ending: function (rows, badges, ord, poulsen, opt) {
      opt = opt || {};
      return new Promise(function (resolve) {
        var s = el('div', 'screen-full'), c = el('div', 'end px'); s.appendChild(c);
        c.appendChild(el('h2', null, esc(opt.titel || 'Du klarede det!')));
        c.appendChild(el('p', null, esc(opt.tekst || '')));
        var list = el('div', 'cando');
        rows.forEach(function (r) {
          var st = ''; for (var i = 0; i < 3; i++) st += i < r.stars ? '★' : '<span class="off">★</span>';
          list.appendChild(el('div', null, '<span>Jeg kan ' + esc(r.t) + '</span><span class="stars" aria-label="' + r.stars + ' af 3 stjerner">' + st + '</span>'));
        });
        c.appendChild(list);
        var q = el('div', 'quote');
        if (poulsen) { var pc = RH.portrait(poulsen.sheet, 48); pc.className = 'mini'; q.appendChild(pc); }
        q.appendChild(el('div', null, '<b>Hr. Poulsen siger:</b><br>' + esc(ord)));
        c.appendChild(q);
        var bd = el('div', 'badges');
        badges.forEach(function (b) { bd.appendChild(el('div', 'badge', b)); });
        c.appendChild(bd);
        c.appendChild(el('p', 'task-help', 'Stjernerne viser, hvor tit du ramte i første forsøg. Men læg mærke til vedholdenheden: hver gang du prøvede igen efter en fejl, lærte du noget, du ikke kunne før.'));
        var row = el('div', 'end-row');
        var again = btn('btn', esc(opt.rundt || 'Gå rundt i kvarteret'));
        var home = el('a', 'btn', 'Tilbage til Learnification'); home.href = '/regnehelten'; home.style.textDecoration = 'none';
        var nxt = null;
        if (opt.naeste) {
          nxt = btn('btn primary', 'Næste kapitel: ' + esc(opt.naeste) + ' →');
          row.appendChild(nxt);
          nxt.addEventListener('click', function () { pop(s); resolve('naeste'); });
        } else { home.className = 'btn primary'; }
        row.appendChild(again); row.appendChild(home); c.appendChild(row);
        again.addEventListener('click', function () { pop(s); resolve(); });
        push(s); (nxt || again).focus();
      });
    },

    // Kort mellem to kapitler: "Kapitel 2 · Udflugten" og en linje om, hvor og hvornår vi er
    kapitelkort: function (n, navn, tekst, klasseTekst) {
      return new Promise(function (resolve) {
        var s = el('div', 'screen-full'), c = el('div', 'title-card px'); s.appendChild(c);
        c.appendChild(el('p', 'sub', 'Kapitel ' + n));
        c.appendChild(el('h1', null, esc(navn)));
        if (tekst) c.appendChild(el('p', 'sub', esc(tekst)));
        if (klasseTekst) c.appendChild(el('p', 'tiny', esc(klasseTekst)));
        var go = btn('btn primary', 'Begynd');
        var row = el('div', 'row'); row.appendChild(go); c.appendChild(row);
        go.addEventListener('click', function () { pop(s); resolve(); });
        push(s); go.focus();
      });
    },

    // Kapitelliste: [{n, navn, status: klaret|igang|klar|laast}] — resolver nummeret på det kapitel, man vil i gang med
    kapitler: function (liste) {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu px'); bg.appendChild(m);
        m.appendChild(el('h2', null, 'Kapitler'));
        m.appendChild(el('p', 'task-help', 'Et kapitel bliver låst op, når du har klaret det før. For hvert kapitel bliver opgaverne ét klassetrin sværere.'));
        var tekst = { klaret: '✓ Klaret', igang: '► Her er du nu', klar: 'Klar — start', laast: '🔒 Klar det forrige først' };
        liste.forEach(function (k) {
          var b = btn('btn' + (k.status === 'klar' ? ' primary' : ''));
          b.innerHTML = '<span>' + k.n + '. ' + esc(k.navn) + '</span><span>' + tekst[k.status] + '</span>';
          if (k.status !== 'klar') b.disabled = true;
          else b.addEventListener('click', function () { pop(bg); resolve(k.n); });
          m.appendChild(b);
        });
        var close = btn('btn', 'Luk'); m.appendChild(close);
        function done() { pop(bg); resolve(null); }
        close.addEventListener('click', done);
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); done(); } });
        push(bg); close.focus();
      });
    },

    // Prøvetiden er brugt (LFSpil i /assets/spilletid.js). Ingen vej tilbage ind i spillet:
    // en voksen kan åbne for mere tid i /admin, og så virker en ny indlæsning af siden.
    tidSlut: function () {
      var s = el('div', 'screen-full'), c = el('div', 'end px'); s.appendChild(c);
      c.appendChild(el('h2', null, 'Tak, fordi du spillede!'));
      c.appendChild(el('p', null, 'Du har brugt hele din spilletid i Learnification. Det, du nåede, er gemt.'));
      c.appendChild(el('p', 'task-help', 'Vil du spille videre, kan en voksen åbne for mere tid. Så kan du hente spillet igen og fortsætte, hvor du slap.'));
      var row = el('div', 'end-row');
      var home = el('a', 'btn primary', 'Tilbage til Learnification'); home.href = '/regnehelten'; home.style.textDecoration = 'none';
      row.appendChild(home);
      if (window.LFSpil && window.LF_SPILLER) {
        var ud = btn('btn', 'Log ud');
        ud.addEventListener('click', function () { LFSpil.logUd('/login'); });
        row.appendChild(ud);
      }
      if (window.LF_SPILLER && LF_SPILLER.tilbage_til) {
        var tilbage = el('a', 'btn', 'Tilbage til ' + String(LF_SPILLER.tilbage_til).replace(/[<>&]/g, ''));
        tilbage.href = '/spil/?tilbage=1'; tilbage.style.textDecoration = 'none'; row.appendChild(tilbage);
      }
      c.appendChild(row);
      push(s); home.focus();
    },

    // ---------------------------------------------------------------- pausespil: Klæd om
    dressup: function (look0) {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu px dress'); bg.appendChild(m);
        m.appendChild(el('h2', null, 'Klæd om'));
        var ed = lookEditor(Object.assign({}, look0)); m.appendChild(ed.node);
        var row = el('div', 'end-row');
        var keep = btn('btn', 'Behold mit tøj'), okB = btn('btn primary', 'Færdig');
        row.appendChild(keep); row.appendChild(okB); m.appendChild(row);
        keep.addEventListener('click', function () { pop(bg); resolve(null); });
        okB.addEventListener('click', function () { pop(bg); resolve(ed.look); });
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); pop(bg); resolve(null); } });
        push(bg); okB.focus();
      });
    },

    // ---------------------------------------------------------------- pausespil: Straffespark
    // Fem spark. Sigt (venstre/midt/højre), og ram det grønne felt på kraftmåleren.
    straffespark: function (look) {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu px kick'); bg.appendChild(m);
        m.appendChild(el('h2', null, 'Straffespark'));
        var info = el('p', 'kick-info'); m.appendChild(info);
        var W = 160, H = 112, cv = RH.canvas(W, H), x = cv.getContext('2d'); cv.className = 'kick-cv'; m.appendChild(cv);
        var ctrl = el('div', 'kick-ctrl');
        var bL = btn('btn', '&#9664; Venstre'), bM = btn('btn', 'Midt'), bR = btn('btn', 'Højre &#9654;'), shoot = btn('btn primary', 'Skyd!');
        [bL, bM, bR, shoot].forEach(function (b) { ctrl.appendChild(b); });
        m.appendChild(ctrl);
        var stop = btn('btn small', 'Stop'); m.appendChild(stop);
        var me = RH.makeSheet(look), keeperSheet = RH.makeSheet({ skin: '#be8b62', hair: '#2c221e', style: 'kort', cloth: '#e8c440', pants: '#3c404c' });
        var SHOTS = 5, shot = 0, goals = 0, aim = 1, phase = 'aim', power = 0, pdir = 1, timer = 0, keeper = 1, last = '', t = 0, raf = 0, prev = 0;
        var zones = [W / 2 - 38, W / 2, W / 2 + 38];
        function paintInfo() {
          info.innerHTML = 'Spark ' + Math.min(shot + 1, SHOTS) + ' af ' + SHOTS + ' &nbsp;·&nbsp; Mål: <b>' + goals + '</b><br><span class="soft">' +
            (phase === 'aim' ? 'Vælg et hjørne, og tryk Skyd.' : phase === 'power' ? 'Tryk Skyd igen, når pilen er i det grønne.' : '&nbsp;') + '</span>';
          [bL, bM, bR].forEach(function (b, i) { b.classList.toggle('sel', i === aim); b.disabled = phase !== 'aim'; });
          shoot.disabled = !(phase === 'aim' || phase === 'power');
        }
        function setAim(i) { if (phase !== 'aim') return; aim = i; RH.audio.sfx('blip'); paintInfo(); }
        function press() {
          if (phase === 'aim') { phase = 'power'; power = 0; pdir = 1; RH.audio.sfx('open'); }
          else if (phase === 'power') { keeper = (Math.random() * 3) | 0; phase = 'fly'; timer = 0; }
          paintInfo();
        }
        function resolveShot() {
          var saved = keeper === aim, soft = power < 0.25, hard = power > 0.95;
          if (hard) last = 'Over mål!'; else if (saved && !soft) last = 'Målmanden havde den!'; else if (saved) last = 'For blødt — reddet.';
          else { goals++; last = 'MÅL!'; }
          RH.audio.sfx(last === 'MÅL!' ? 'good' : 'soft');
          phase = 'result'; timer = 0; paintInfo();
        }
        function frame(ts) {
          var dt = Math.min(0.05, (ts - (prev || ts)) / 1000); prev = ts; t += dt;
          if (phase === 'power') { power += pdir * dt * 1.6; if (power >= 1) { power = 1; pdir = -1; } else if (power <= 0) { power = 0; pdir = 1; } }
          else if (phase === 'fly') { timer += dt; if (timer > 0.55) resolveShot(); }
          else if (phase === 'result') { timer += dt; if (timer > 1.3) { shot++; if (shot >= SHOTS) { end(); return; } phase = 'aim'; power = 0; paintInfo(); } }
          draw(); raf = requestAnimationFrame(frame);
        }
        function draw() {
          x.fillStyle = '#4f9e4c'; x.fillRect(0, 0, W, H);
          for (var y = 0; y < H; y += 16) { x.fillStyle = '#459044'; x.fillRect(0, y, W, 8); }
          x.fillStyle = '#eef0ec'; x.fillRect(20, 60, W - 40, 1); x.fillRect(20, 60, 1, 30); x.fillRect(W - 21, 60, 1, 30);
          var gx = W / 2 - 58, gy = 14, gw = 116, gh = 40;
          x.fillStyle = 'rgba(255,255,255,.25)';
          for (var nx = 0; nx < gw; nx += 4) x.fillRect(gx + nx, gy, 1, gh);
          for (var ny = 0; ny < gh; ny += 4) x.fillRect(gx, gy + ny, gw, 1);
          x.fillStyle = '#f4f4f0'; x.fillRect(gx - 2, gy - 2, gw + 4, 3); x.fillRect(gx - 2, gy - 2, 3, gh + 2); x.fillRect(gx + gw - 1, gy - 2, 3, gh + 2);
          var kx = (phase === 'fly' || phase === 'result') ? zones[keeper] : zones[1] + Math.sin(t * 3) * 6;
          x.drawImage(keeperSheet, 0, 0, 16, 16, Math.round(kx - 8), gy + gh - 22, 16, 16);
          if (phase === 'aim') {
            var pulse = 1 + (Math.floor(t * 6) % 2);
            x.strokeStyle = '#ffe070'; x.lineWidth = 1; x.strokeRect(Math.round(zones[aim] - 6 - pulse), gy + 12 - pulse, 12 + pulse * 2, 12 + pulse * 2);
          }
          var bx = W / 2, by = 88;
          if (phase === 'fly' || phase === 'result') {
            var p = Math.min(1, timer / 0.55); if (phase === 'result') p = 1;
            var ty = power > 0.95 ? gy - 10 : gy + 18;
            bx = W / 2 + (zones[aim] - W / 2) * p; by = 88 - (88 - ty) * p;
          }
          x.fillStyle = '#1a1420'; x.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 5, 5);
          x.fillStyle = '#f8f8f4'; x.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3);
          x.drawImage(me, 0, 16, 16, 16, W / 2 - 8, 92, 16, 16);
          if (phase === 'power') {
            x.fillStyle = '#1a1420'; x.fillRect(W / 2 - 42, H - 9, 84, 7);
            x.fillStyle = '#f4f0e8'; x.fillRect(W / 2 - 41, H - 8, 82, 5);
            x.fillStyle = '#5fd068'; x.fillRect(W / 2 - 41 + 82 * 0.25, H - 8, 82 * 0.7, 5);
            x.fillStyle = '#d8584a'; x.fillRect(Math.round(W / 2 - 41 + 82 * power) - 1, H - 10, 2, 9);
          }
          if (phase === 'result') {
            x.font = '10px "Pixelify Sans", monospace'; x.textAlign = 'center';
            x.fillStyle = '#1a1420'; x.fillText(last, W / 2 + 1, 72);
            x.fillStyle = last === 'MÅL!' ? '#ffe070' : '#ffb3a8'; x.fillText(last, W / 2, 71);
          }
        }
        function end() {
          cancelAnimationFrame(raf); pop(bg);
          resolve('Du scorede ' + goals + ' ud af ' + SHOTS + '.');
        }
        bL.addEventListener('click', function () { setAim(0); });
        bM.addEventListener('click', function () { setAim(1); });
        bR.addEventListener('click', function () { setAim(2); });
        shoot.addEventListener('click', press);
        stop.addEventListener('click', function () { cancelAnimationFrame(raf); pop(bg); resolve('Du scorede ' + goals + ', inden du gik.'); });
        bg.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { e.stopPropagation(); stop.click(); return; }
          if (e.key === 'ArrowLeft') { setAim(Math.max(0, aim - 1)); e.preventDefault(); }
          else if (e.key === 'ArrowRight') { setAim(Math.min(2, aim + 1)); e.preventDefault(); }
          else if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') { press(); e.preventDefault(); }
        });
        push(bg); paintInfo(); shoot.focus(); raf = requestAnimationFrame(frame);
      });
    }
  };

  // ---------------------------------------------------------------- dagbogens sider
  function missioner(body, S, K) {
    var tr = RH.opgaver.trin(S.klasse);
    body.appendChild(el('p', 'task-help', esc(S.name) + ' · ' + esc(tr.navn) + ' · Regnekraft ' + S.kraft + ' %. Klarer du et opgavesæt med mindst 85 % rigtige i første forsøg, får du en ting i tasken.'));
    var lastAct = null;
    K.questList().forEach(function (q) {
      if (q.act !== lastAct) { body.appendChild(el('p', 'act-h', esc(q.act))); lastAct = q.act; }
      var st = S.q[q.id] || (K.available(q) ? 'ready' : 'locked');
      if (q.side && st === 'locked') return;
      var it = el('div', 'qitem ' + (st === 'done' ? 'done' : st === 'active' ? 'active' : st === 'locked' ? 'locked' : ''));
      it.appendChild(el('span', 'st', st === 'done' ? '✓' : st === 'active' ? '►' : st === 'locked' ? '·' : '!'));
      var inner = el('div');
      inner.appendChild(el('div', null, '<b>' + esc(st === 'locked' ? '???' : q.title) + '</b>' + (q.side ? ' <span class="meta">(ekstramission)</span>' : '')));
      if (st !== 'locked') inner.appendChild(el('div', 'meta', esc(st === 'active' ? K.goal(q.id) : q.desc)));
      var r = S.runde[q.id];
      if (st === 'done' && r && r.n) inner.appendChild(el('div', 'uses', r.first + ' af ' + r.n + ' i første forsøg'));
      it.appendChild(inner); body.appendChild(it);
    });
  }
  function regnebogen(body, sideId) {
    var K = RH.content, wrap = el('div', 'rbog');
    var list = el('div', 'rbog-list'), page = el('div', 'rbog-page doc letter');
    wrap.appendChild(list); wrap.appendChild(page); body.appendChild(wrap);
    function vis(id) {
      var p = K.BOG.filter(function (x) { return x.id === id; })[0] || K.BOG[0];
      [].forEach.call(list.children, function (b) { b.classList.toggle('on', b.dataset.id === p.id); });
      page.innerHTML = '';
      page.appendChild(el('h4', null, esc(p.title)));
      page.appendChild(el('p', 'tag', esc(p.tag)));
      p.body.forEach(function (t) { page.appendChild(el('p', null, esc(t))); });
      var ex = el('div', 'eksempel'); ex.appendChild(el('b', null, 'Eksempel')); p.example.forEach(function (t) { ex.appendChild(el('div', null, esc(t))); });
      page.appendChild(ex);
      if (p.diagram) page.insertAdjacentHTML('beforeend', DIAGRAM[p.diagram]());
    }
    K.BOG.forEach(function (p) {
      var b = btn('tab', esc(p.title)); b.dataset.id = p.id;
      b.addEventListener('click', function () { vis(p.id); });
      list.appendChild(b);
    });
    vis(sideId);
  }
  function tasken(body, S, K, spil) {
    var bag = S.bag;
    if (!bag.owned.length) {
      body.appendChild(el('p', 'empty', 'Tasken er tom endnu. Klar et opgavesæt med mindst 85 % rigtige i første forsøg, så får du noget med herind.'));
    }
    var grid = el('div', 'bag');
    bag.owned.forEach(function (id) {
      var it = K.ITEMS[id], d = el('div', 'bag-item');
      d.insertAdjacentHTML('beforeend', RH.iconSvg(it.icon || id, 52));
      var txt = el('div');
      txt.appendChild(el('b', null, esc(it.name) + (bag.counts[id] > 1 ? ' <span class="meta">x' + bag.counts[id] + '</span>' : '')));
      txt.appendChild(el('div', 'meta', esc(it.desc)));
      if (it.unlocks) {
        var left = bag.plays[it.unlocks] || 0, label = K.PAUSESPIL[it.unlocks];
        var row = el('div', 'bag-play');
        row.appendChild(el('span', left ? 'good' : 'soft', label + ': ' + left + (left === 1 ? ' tur' : ' ture') + ' tilbage'));
        if (left && spil) { var b = btn('btn small primary', 'Spil'); b.addEventListener('click', function () { spil(it.unlocks); }); row.appendChild(b); }
        else if (left) row.appendChild(el('span', 'soft', ' — kan spilles, når opgaven er færdig'));
        else row.appendChild(el('span', 'soft', ' — klar et opgavesæt med 85 % for at få flere'));
        txt.appendChild(row);
      }
      d.appendChild(txt); grid.appendChild(d);
    });
    body.appendChild(grid);
    body.appendChild(el('p', 'task-help', 'Pausespil får du ture til ved at regne godt — hver ting giver 2 ture, og du kan højst have 6. De kan ikke spilles i det uendelige.'));
  }

  // Tegningerne i Regnebogen (SVG på papir)
  var INK = '#3a2616', BLUE = '#2c4a9c', RED = '#a02e38';
  function svg(h, inner) { return '<svg class="diagram" viewBox="0 0 400 ' + h + '" font-family="Atkinson Hyperlegible, Verdana, sans-serif" font-size="15" role="img" aria-hidden="true">' + inner + '</svg>'; }
  var DIAGRAM = {
    numberline: function () {
      var s = '<line x1="20" y1="70" x2="380" y2="70" stroke="' + INK + '" stroke-width="3"/>';
      for (var i = 0; i <= 10; i++) { var x = 20 + i * 36; s += '<line x1="' + x + '" y1="62" x2="' + x + '" y2="78" stroke="' + INK + '" stroke-width="2"/><text x="' + x + '" y="98" text-anchor="middle" fill="' + INK + '">' + i + '</text>'; }
      for (var j = 3; j < 7; j++) { var a = 20 + j * 36; s += '<path d="M' + a + ' 60 Q' + (a + 18) + ' 30 ' + (a + 36) + ' 60" fill="none" stroke="' + BLUE + '" stroke-width="2.5"/>'; }
      s += '<text x="200" y="22" text-anchor="middle" fill="' + BLUE + '">3 + 4: fire hop til højre</text>';
      return svg(110, s);
    },
    array: function () {
      var s = '';
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) s += '<circle cx="' + (130 + c * 46) + '" cy="' + (26 + r * 36) + '" r="13" fill="' + RED + '" stroke="' + INK + '" stroke-width="2"/><rect x="' + (128 + c * 46) + '" y="' + (8 + r * 36) + '" width="4" height="7" fill="#4a7a2a"/>';
      s += '<text x="40" y="66" fill="' + INK + '">3 rækker</text><text x="340" y="66" fill="' + INK + '">4 i hver</text>';
      return svg(120, s);
    },
    share: function () {
      var s = '';
      for (var g = 0; g < 3; g++) {
        var gx = 40 + g * 120;
        s += '<rect x="' + gx + '" y="14" width="100" height="70" rx="8" fill="none" stroke="' + INK + '" stroke-width="2" stroke-dasharray="6 4"/>';
        for (var i = 0; i < 4; i++) s += '<circle cx="' + (gx + 22 + (i % 2) * 56) + '" cy="' + (34 + (i / 2 | 0) * 30) + '" r="11" fill="' + ['#d8584a', '#e0a82c', '#5a8ad8', '#5fa05a'][g] + '" stroke="' + INK + '" stroke-width="2"/>';
        s += '<text x="' + (gx + 50) + '" y="104" text-anchor="middle" fill="' + INK + '">4</text>';
      }
      return svg(112, s);
    },
    half: function () {
      var s = '<rect x="40" y="16" width="320" height="34" fill="#fff" stroke="' + INK + '" stroke-width="3"/><rect x="40" y="16" width="160" height="34" fill="' + BLUE + '" opacity=".55"/><line x1="200" y1="16" x2="200" y2="50" stroke="' + INK + '" stroke-width="3"/>';
      s += '<text x="120" y="38" text-anchor="middle" fill="' + INK + '">en halv</text>';
      s += '<rect x="40" y="70" width="320" height="34" fill="#fff" stroke="' + INK + '" stroke-width="3"/><rect x="40" y="70" width="80" height="34" fill="' + RED + '" opacity=".55"/>';
      for (var i = 1; i < 4; i++) s += '<line x1="' + (40 + i * 80) + '" y1="70" x2="' + (40 + i * 80) + '" y2="104" stroke="' + INK + '" stroke-width="3"/>';
      s += '<text x="80" y="92" text-anchor="middle" fill="' + INK + '">en fjerdedel</text>';
      return svg(116, s);
    },
    coins: function () {
      var vals = [[50, 22, '#d8c8a0'], [10, 17, '#e0b850'], [2, 13, '#c8c8d0'], [1, 11, '#c8c8d0']], x = 50, s = '<rect x="20" y="20" width="96" height="52" rx="4" fill="#9ac0a0" stroke="' + INK + '" stroke-width="2"/><text x="68" y="52" text-anchor="middle" fill="' + INK + '" font-weight="bold">100 kr</text>';
      s += '<text x="140" y="52" fill="' + INK + '">−  63 kr  =</text>';
      x = 252;
      [[20, 18], [10, 16], [5, 14], [2, 12]].forEach(function (v) {
        s += '<circle cx="' + x + '" cy="46" r="' + v[1] + '" fill="' + (v[0] >= 10 ? '#e0b850' : '#c8c8d0') + '" stroke="' + INK + '" stroke-width="2"/><text x="' + x + '" y="51" text-anchor="middle" fill="' + INK + '" font-size="13">' + v[0] + '</text>';
        x += v[1] * 2 + 6;
      });
      void vals;
      s += '<text x="200" y="100" text-anchor="middle" fill="' + BLUE + '">20 + 10 + 5 + 2 = 37 kr tilbage</text>';
      return svg(112, s);
    },
    pattern: function () {
      var nums = ['3', '7', '11', '15', '?'], s = '';
      nums.forEach(function (n, i) {
        var x = 30 + i * 74;
        s += '<rect x="' + x + '" y="30" width="54" height="44" rx="6" fill="' + (n === '?' ? '#fff3c4' : '#fff') + '" stroke="' + INK + '" stroke-width="2.5"/><text x="' + (x + 27) + '" y="59" text-anchor="middle" fill="' + INK + '" font-size="20" font-weight="bold">' + n + '</text>';
        if (i < 4) s += '<text x="' + (x + 64) + '" y="22" text-anchor="middle" fill="' + BLUE + '">+4</text>';
      });
      return svg(90, s);
    },
    rect: function () {
      var s = '';
      for (var r = 0; r < 3; r++) for (var c = 0; c < 8; c++) s += '<rect x="' + (60 + c * 34) + '" y="' + (14 + r * 26) + '" width="34" height="26" fill="#e8f0d8" stroke="#8aa070" stroke-width="1"/>';
      s += '<rect x="60" y="14" width="272" height="78" fill="none" stroke="' + INK + '" stroke-width="3"/>';
      s += '<text x="196" y="112" text-anchor="middle" fill="' + INK + '">8 m</text><text x="40" y="58" text-anchor="middle" fill="' + INK + '">3 m</text>';
      return svg(120, s);
    },
    order: function () {
      var s = '<text x="200" y="42" text-anchor="middle" fill="' + INK + '" font-size="30" font-weight="bold">2 + 3 x 4</text>';
      s += '<rect x="214" y="50" width="72" height="4" fill="' + RED + '"/><text x="250" y="74" text-anchor="middle" fill="' + RED + '">først: 12</text>';
      s += '<text x="200" y="104" text-anchor="middle" fill="' + BLUE + '">så: 2 + 12 = 14</text>';
      return svg(114, s);
    }
  };

  // ---------------------------------------------------------------- figureditor (ny figur og Klæd om)
  function lookEditor(look) {
    var K = RH.content, node = el('div', 'looked');
    var prev = el('div', 'look-prev'), cv = RH.canvas(64, 64); prev.appendChild(cv); node.appendChild(prev);
    var rows = el('div', 'look-rows'); node.appendChild(rows);
    var step = 0;
    var spec = [
      ['Frisure', function () { return K.STYLES.map(function (s) { return s[0]; }); }, 'style', function (v) { return K.STYLES.filter(function (s) { return s[0] === v; })[0][1]; }],
      ['Hårfarve', function () { return K.HAIRC; }, 'hair'],
      ['Hudfarve', function () { return K.SKIN; }, 'skin'],
      ['Trøje', function () { return K.CLOTH; }, 'cloth'],
      ['Bukser', function () { return K.PANTS; }, 'pants'],
      ['Ekstra', function () { return K.EXTRAS.map(function (s) { return s[0]; }); }, 'extra', function (v) { return K.EXTRAS.filter(function (s) { return s[0] === v; })[0][1]; }]
    ];
    function paint() {
      var sheet = RH.makeSheet(look), c = cv.getContext('2d');
      c.imageSmoothingEnabled = false; c.fillStyle = '#2a2140'; c.fillRect(0, 0, 64, 64);
      c.drawImage(sheet, (step % 3) * 16, 0, 16, 16, 0, 2, 64, 64);
    }
    spec.forEach(function (sp) {
      var r = el('div', 'look-row'); r.appendChild(el('span', 'lbl', sp[0]));
      var l = btn('arr', '&#9664;'), v = el('span', 'val'), rr = btn('arr', '&#9654;');
      l.setAttribute('aria-label', sp[0] + ': forrige'); rr.setAttribute('aria-label', sp[0] + ': næste');
      function show() {
        var cur = look[sp[2]];
        if (sp[3]) v.textContent = sp[3](cur); else v.innerHTML = '<i class="swatch" style="background:' + cur + '"></i>';
      }
      function change(d) {
        var opts = sp[1](), i = opts.indexOf(look[sp[2]]); if (i < 0) i = 0;
        look[sp[2]] = opts[(i + d + opts.length) % opts.length];
        if (sp[2] === 'style' && look.style === 'kasket' && !look.hatColor) look.hatColor = '#c8282e';
        show(); paint(); RH.audio.sfx('blip');
      }
      l.addEventListener('click', function () { change(-1); }); rr.addEventListener('click', function () { change(1); });
      r.appendChild(l); r.appendChild(v); r.appendChild(rr); rows.appendChild(r); show();
    });
    var rnd = btn('btn small', 'Tilfældig');
    rnd.addEventListener('click', function () {
      spec.forEach(function (sp) { var o = sp[1](); look[sp[2]] = o[(Math.random() * o.length) | 0]; });
      look.hatColor = K.CLOTH[(Math.random() * K.CLOTH.length) | 0];
      rows.querySelectorAll('.look-row').forEach(function (r, i) { var sp = spec[i], v = r.querySelector('.val'); if (sp[3]) v.textContent = sp[3](look[sp[2]]); else v.innerHTML = '<i class="swatch" style="background:' + look[sp[2]] + '"></i>'; });
      paint(); RH.audio.sfx('blip');
    });
    rows.appendChild(rnd);
    // figuren går lidt på stedet, så man kan se den bevæge sig
    var iv = setInterval(function () { if (!node.isConnected) { clearInterval(iv); return; } step++; paint(); }, 260);
    paint();
    return { node: node, get look() { return look; } };
  }

  // ---------------------------------------------------------------- facit som tekst
  function answerText(S0) {
    var O = RH.opgaver;
    switch (S0.kind) {
      case 'write': return O.fmt(S0.answer) + (S0.unit ? ' ' + S0.unit : '');
      case 'choice': return S0.choices[S0.answer];
      case 'findall': return S0.tiles.filter(function (t) { return t[1] === S0.target; }).map(function (t) { return t[0]; }).join(', ');
      case 'balance': case 'sequence': return String(S0.answer);
      case 'truefalse': return S0.is_true ? 'Rigtigt' : 'Forkert';
      case 'build': return S0.puzzle.expr.replace(/\*/g, ' x ').replace(/\//g, ' : ').replace(/\+/g, ' + ').replace(/-/g, ' - ') + ' = ' + S0.puzzle.target;
      case 'coins':
        var rest = S0.target, parts = [];
        [50, 20, 10, 5, 2, 1].forEach(function (v) { while (rest >= v) { rest -= v; parts.push(v); } });
        return parts.join(' + ') + ' = ' + S0.target + ' kr';
    }
    return '';
  }
  RH.answerText = answerText;

  // ---------------------------------------------------------------- de otte måder at svare på
  // Hver får (opgave, område, ok-knap) og giver {evaluate, reset?, lock?, focus?, key?} tilbage.
  function numberInput(width) {
    var inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.setAttribute('aria-label', 'Dit svar');
    if (width) inp.style.width = width;
    return inp;
  }
  var GAMES = {
    write: function (S0, area) {
      var nb = el('div', 'num'), inp = numberInput();
      nb.appendChild(inp); if (S0.unit) nb.appendChild(el('span', 'unit', esc(S0.unit)));
      area.appendChild(nb);
      var G = {
        evaluate: function () { var v = inp.value.trim(); if (!v) return 'empty'; return { ok: RH.opgaver.checkNumeric(v, S0.answer) }; },
        emptyMsg: 'Skriv dit svar først.',
        reset: function () { inp.value = ''; inp.focus(); },
        lock: function () { inp.readOnly = true; },
        focus: function () { inp.focus(); RH.vkbd.attach(inp, 'num'); }
      };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); G.onEnter(); } });
      return G;
    },
    sequence: function (S0, area) {
      var row = el('div', 'seq'), inp = numberInput('3.2em');
      S0.seq.forEach(function (v, i) {
        if (v == null) { var c = el('span', 'seq-cell blank'); c.appendChild(inp); row.appendChild(c); }
        else row.appendChild(el('span', 'seq-cell', String(v)));
        if (i < S0.seq.length - 1) row.appendChild(el('span', 'seq-arrow', '&#8594;'));
      });
      area.appendChild(row);
      var G = {
        evaluate: function () { var v = inp.value.trim(); if (!v) return 'empty'; return { ok: RH.opgaver.checkNumeric(v, S0.answer) }; },
        emptyMsg: 'Skriv det tal, der mangler.',
        reset: function () { inp.value = ''; inp.focus(); },
        lock: function () { inp.readOnly = true; },
        reveal: function () { inp.value = S0.answer; },
        focus: function () { inp.focus(); RH.vkbd.attach(inp, 'num'); }
      };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); G.onEnter(); } });
      return G;
    },
    choice: function (S0, area) { return choiceLike(S0, area, S0.choices, S0.answer); },
    truefalse: function (S0, area) {
      area.appendChild(el('div', 'statement', esc(S0.statement)));
      return choiceLike(S0, area, ['Rigtigt', 'Forkert'], S0.is_true ? 0 : 1, true);
    },
    findall: function (S0, area) {
      var grid = el('div', 'tiles'), picked = {}, els = [];
      S0.tiles.forEach(function (t, i) {
        var b = btn('tile', esc(t[0])); b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { picked[i] = !picked[i]; b.classList.toggle('sel', picked[i]); b.setAttribute('aria-pressed', !!picked[i]); RH.audio.sfx('blip'); count(); });
        grid.appendChild(b); els.push(b);
      });
      var cnt = el('p', 'task-help', ''); area.appendChild(grid); area.appendChild(cnt);
      function count() { var n = 0; for (var k in picked) if (picked[k]) n++; cnt.textContent = 'Valgt: ' + n; return n; }
      count();
      return {
        evaluate: function () {
          if (!count()) return 'empty';
          var missed = 0, wrong = 0;
          S0.tiles.forEach(function (t, i) { var want = t[1] === S0.target; if (want && !picked[i]) missed++; if (!want && picked[i]) wrong++; });
          if (!missed && !wrong) return { ok: true };
          return { ok: false, msg: wrong && missed ? 'Du har ' + wrong + ' for meget og mangler ' + missed + '.' : wrong ? (wrong === 1 ? 'Én af dem passer ikke.' : wrong + ' af dem passer ikke.') : 'Du mangler ' + missed + ' mere.' };
        },
        emptyMsg: 'Vælg de regnestykker, der passer.',
        reset: function () { picked = {}; els.forEach(function (b) { b.classList.remove('sel'); b.setAttribute('aria-pressed', 'false'); }); count(); },
        reveal: function () { S0.tiles.forEach(function (t, i) { els[i].classList.toggle('right', t[1] === S0.target); els[i].classList.remove('sel'); }); },
        lock: function () { els.forEach(function (b) { b.disabled = true; }); }
      };
    },
    balance: function (S0, area) {
      var value = S0.start, tilt = 0;
      var wrap = el('div', 'balance');
      wrap.appendChild(el('p', 'task-help', 'Hvilket tal skal stå på den tomme plads, så vægten er i balance?'));
      var sv = el('div', 'scale'); wrap.appendChild(sv);
      var ctrl = el('div', 'bal-ctrl');
      var minus = btn('btn', '&minus;'), val = el('span', 'bal-val'), plus = btn('btn', '+');
      minus.setAttribute('aria-label', 'Mindre'); plus.setAttribute('aria-label', 'Større');
      ctrl.appendChild(minus); ctrl.appendChild(val); ctrl.appendChild(plus); wrap.appendChild(ctrl);
      area.appendChild(wrap);
      function paint() {
        val.textContent = value;
        // Bjælken drejer, men skålene hænger lodret ned fra enderne — ligesom en rigtig vægt
        var ang = tilt * 12 * Math.PI / 180, left = S0.a + ' ' + S0.op + ' ' + value;
        var dx = Math.cos(ang) * 140, dy = Math.sin(ang) * 140, lx = 200 - dx, ly = 60 - dy, rx = 200 + dx, ry = 60 + dy;
        function pan(x, y, txt, col) {
          return '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + 22) + '" stroke="#8e8c9a" stroke-width="2"/>' +
            '<rect x="' + (x - 60) + '" y="' + (y + 22) + '" width="120" height="50" rx="8" fill="#fff" stroke="' + col + '" stroke-width="4"/>' +
            '<text x="' + x + '" y="' + (y + 55) + '" text-anchor="middle" font-size="24" font-weight="bold" fill="#1a1420">' + esc(txt) + '</text>';
        }
        sv.innerHTML = '<svg viewBox="0 0 400 180" font-family="Atkinson Hyperlegible, Verdana, sans-serif" role="img" aria-label="Vægt: ' + esc(left) + ' mod ' + S0.target + '">' +
          '<rect x="192" y="60" width="16" height="100" fill="#8e8c9a"/><path d="M150 176 L250 176 L232 160 L168 160 Z" fill="#8e8c9a"/>' +
          '<line x1="' + lx + '" y1="' + ly + '" x2="' + rx + '" y2="' + ry + '" stroke="#62606e" stroke-width="8" stroke-linecap="round"/>' +
          pan(lx, ly, left, '#e0a82c') + pan(rx, ry, String(S0.target), '#5a7ed4') +
          '<circle cx="200" cy="60" r="9" fill="#3e3c4c"/></svg>';
      }
      function change(d) { value = Math.max(S0.min, Math.min(S0.max, value + d)); tilt = 0; RH.audio.sfx('blip'); paint(); }
      minus.addEventListener('click', function () { change(-1); }); plus.addEventListener('click', function () { change(1); });
      paint();
      function left() { return S0.op === 'x' ? S0.a * value : S0.op === '+' ? S0.a + value : S0.a - value; }
      return {
        evaluate: function () {
          var diff = left() - S0.target;
          tilt = Math.max(-1, Math.min(1, diff / Math.max(4, Math.abs(S0.target) * 0.5)));
          // venstre side tung = den hælder mod venstre (negativ vinkel)
          tilt = -tilt; paint();
          if (!diff) return { ok: true };
          return { ok: false, msg: diff > 0 ? 'For tungt i venstre side.' : 'For let i venstre side.' };
        },
        reveal: function () { value = S0.answer; tilt = 0; paint(); },
        lock: function () { minus.disabled = plus.disabled = true; },
        focus: function () { plus.focus(); },
        key: function (e) { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { change(1); return true; } if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { change(-1); return true; } return false; }
      };
    },
    coins: function (S0, area) {
      var VALS = [1, 2, 5, 10, 20, 50], counts = [0, 0, 0, 0, 0, 0];
      var wrap = el('div', 'coins');
      wrap.appendChild(el('p', 'task-help', 'Tryk på en mønt for at lægge den på disken. Tryk på minus for at tage den tilbage.'));
      var row = el('div', 'coin-row'), cnts = [];
      VALS.forEach(function (v, i) {
        var col = el('div', 'coin-col');
        var c = btn('coin c' + v, v + (v === 50 ? ' kr' : '')); c.setAttribute('aria-label', 'Læg ' + v + ' kr på disken');
        var n = el('span', 'coin-n', '0'), m = btn('coin-minus', '&minus;'); m.setAttribute('aria-label', 'Tag ' + v + ' kr tilbage');
        c.addEventListener('click', function () { if (counts[i] < 9) { counts[i]++; RH.audio.sfx('pick'); paint(); } });
        m.addEventListener('click', function () { if (counts[i] > 0) { counts[i]--; RH.audio.sfx('blip'); paint(); } });
        col.appendChild(c); col.appendChild(n); col.appendChild(m); row.appendChild(col); cnts.push(n);
      });
      var total = el('p', 'coin-total');
      wrap.appendChild(row); wrap.appendChild(total); area.appendChild(wrap);
      function sum() { var s = 0; counts.forEach(function (c, i) { s += c * VALS[i]; }); return s; }
      function paint() { cnts.forEach(function (n, i) { n.textContent = 'x' + counts[i]; n.classList.toggle('on', counts[i] > 0); }); var s = sum(); total.innerHTML = 'På disken: <b>' + s + ' kr</b>'; total.classList.toggle('good', s === S0.target); }
      paint();
      return {
        evaluate: function () {
          var s = sum(); if (!s) return 'empty';
          var d = s - S0.target;
          return d === 0 ? { ok: true } : { ok: false, msg: d > 0 ? 'Det er ' + d + ' kr for meget.' : 'Der mangler ' + (-d) + ' kr.' };
        },
        emptyMsg: 'Læg nogle mønter på disken først.',
        reset: function () { counts = [0, 0, 0, 0, 0, 0]; paint(); },
        lock: function () { wrap.querySelectorAll('button').forEach(function (b) { b.disabled = true; }); }
      };
    },
    build: function (S0, area) {
      var P0 = S0.puzzle, sym = { '+': '+', '-': '-', '*': 'x', '/': ':' };
      var nums = P0.numbers.map(String), ops = P0.allowed.split('').map(function (o) { return sym[o]; }).concat(['(', ')']);
      var expr = [], used = [];
      var wrap = el('div', 'build');
      wrap.appendChild(el('p', 'task-help', 'Byg et regnestykke, der giver <b>' + P0.target + '</b>. Brug hvert tal én gang.'));
      var disp = el('div', 'build-disp'); wrap.appendChild(disp);
      var pal = el('div', 'build-pal'), numEls = [];
      nums.forEach(function (n, i) { var b = btn('tile num', n); b.addEventListener('click', function () { if (used.indexOf(i) >= 0) return; used.push(i); expr.push({ t: n, i: i }); RH.audio.sfx('blip'); paint(); }); pal.appendChild(b); numEls.push(b); });
      pal.appendChild(el('span', 'build-gap'));
      ops.forEach(function (o) { var b = btn('tile op', o); b.addEventListener('click', function () { expr.push({ t: o }); RH.audio.sfx('blip'); paint(); }); pal.appendChild(b); });
      var bs = btn('tile op wide', '&#9003;'); bs.setAttribute('aria-label', 'Slet det sidste');
      bs.addEventListener('click', back); pal.appendChild(bs);
      var clr = btn('tile op wide', 'Ryd'); clr.addEventListener('click', function () { expr = []; used = []; paint(); }); pal.appendChild(clr);
      wrap.appendChild(pal); area.appendChild(wrap);
      function back() { var tok = expr.pop(); if (tok && tok.i != null) used.splice(used.indexOf(tok.i), 1); RH.audio.sfx('blip'); paint(); }
      function str() { return expr.map(function (x) { return x.t; }).join('').replace(/x/g, '*').replace(/:/g, '/'); }
      function paint() {
        numEls.forEach(function (b, i) { b.disabled = used.indexOf(i) >= 0; });
        var shown = expr.length ? expr.map(function (x) { return x.t; }).join(' ') : '...', val = '';
        if (expr.length) { try { var v = RH.calc(str()); val = ' = ' + RH.opgaver.fmt(Math.round(v * 1000) / 1000); } catch (e) { val = ''; } }
        disp.innerHTML = '<span class="' + (expr.length ? '' : 'soft') + '">' + esc(shown) + '</span><b class="' + (val && Math.abs(RH.calc(str()) - P0.target) < 1e-9 ? 'hit' : '') + '">' + esc(val) + '</b>';
      }
      paint();
      return {
        evaluate: function () {
          if (!expr.length) return 'empty';
          var r = RH.opgaver.checkCreative(str(), P0);
          return { ok: r[0], msg: r[1] };
        },
        emptyMsg: 'Byg et regnestykke først — tryk på tallene og regnetegnene.',
        reset: function () { },
        lock: function () { pal.querySelectorAll('button').forEach(function (b) { b.disabled = true; }); },
        key: function (e) { if (e.key === 'Backspace') { back(); return true; } return false; }
      };
    }
  };
  function choiceLike(S0, area, choices, answer, big) {
    var opts = el('div', 'opts single' + (big ? ' tf' : '')), sel = null, els = [];
    choices.forEach(function (c, i) {
      var b = btn('opt', '<span class="mark"></span><span>' + (big ? '' : '<b class="num">' + (i + 1) + '</b> ') + esc(c) + '</span>');
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { pick(i); });
      opts.appendChild(b); els.push(b);
    });
    area.appendChild(opts);
    function pick(i) { sel = i; els.forEach(function (b, j) { b.classList.toggle('sel', j === i); b.classList.remove('wrong', 'right'); b.setAttribute('aria-pressed', j === i); }); }
    return {
      evaluate: function () {
        if (sel == null) return 'empty';
        var ok = sel === answer;
        els[sel].classList.add(ok ? 'right' : 'wrong');
        return { ok: ok };
      },
      reveal: function () { els[answer].classList.add('right'); },
      lock: function () { els.forEach(function (b) { b.disabled = true; }); },
      focus: function () { els[0].focus(); },
      key: function (e) { var n = parseInt(e.key, 10); if (n >= 1 && n <= choices.length) { pick(n - 1); els[n - 1].focus(); return true; } return false; }
    };
  }

  // ---------------------------------------------------------------- skærmtastatur
  // Kun på berøringsskærme: QWERTY med æøå til navnet, taltastatur til regning.
  RH.vkbd = (function () {
    var box = null, input = null, mode = 'text', shift = true;
    var ROWS = {
      text: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'å'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'æ', 'ø'], ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'], ['mellemrum', 'OK']],
      num: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['-', '0', ','], ['⌫', 'OK']]
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
      RH.audio.sfx('blip');
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
        if (RH.wakeTouch) RH.wakeTouch();
        setTimeout(function () { inp.scrollIntoView({ block: 'center' }); }, 50);
      },
      release: function (node) {
        if (!input || !node.contains(input)) return;
        input = null; box.hidden = true; document.body.classList.remove('vkbd-open');
      }
    };
  })();
})();
