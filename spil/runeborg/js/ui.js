/* Runeborg — alt det, der ligger oven på verden: dialog, opgaver,
   Dagbogen, menuen, titel- og slutskærm. Det er almindelig HTML, så teksten
   er skarp og kan læses op. Hver funktion giver et Promise tilbage, så
   historien i content.js kan skrives som en lige linje: await sig, await opgave. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};
  var layer, open = 0;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  RB.esc = esc;

  function push(node) { layer.appendChild(node); open++; RB.audio.sfx('open'); return node; }
  function pop(node) { RB.vkbd.release(node); if (node.parentNode) node.parentNode.removeChild(node); open = Math.max(0, open - 1); }

  // Tastatur til vinduerne: E / Enter / mellemrum går videre i dialog.
  var advanceFn = null;
  document.addEventListener('keydown', function (e) {
    if (!advanceFn) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      e.preventDefault(); advanceFn();
    }
  });

  var UI = RB.ui = {
    init: function () { layer = document.getElementById('layer'); },
    isOpen: function () { return open > 0; },

    // ---------------------------------------------------------------- dialog
    say: function (who, text, speakText) {
      return new Promise(function (resolve) {
        var d = el('div', 'dialog px' + (who ? '' : ' narrator'));
        d.setAttribute('role', 'dialog');
        if (who) {
          var pc = RB.portrait(who.sheet, 64); pc.className = 'portrait'; d.appendChild(pc);
        }
        var box = el('div');
        if (who) box.appendChild(el('div', 'who', esc(who.name)));
        var sayEl = el('div', 'say'); box.appendChild(sayEl);
        d.appendChild(box);
        var nx = el('div', 'next', '&#9660; <span class="key">E</span>'); d.appendChild(nx);
        var again = el('button', 'say-again', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"/></svg>'); again.type = 'button'; again.title = 'Læs op igen'; again.setAttribute('aria-label', 'Læs op igen');
        if (RB.voice.on) d.appendChild(again);
        push(d);
        var voiceText = speakText || text, voiceWho = who ? who.id : null;
        RB.voice.speak(voiceText, voiceWho);
        again.addEventListener('click', function (e) { e.stopPropagation(); RB.voice.speak(voiceText, voiceWho); });
        text = text.replace(/\{navn\}/g, esc(RB.state.name || 'lærling'));
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
          advanceFn = null; RB.voice.stop(); RB.audio.sfx('blip'); pop(d); resolve();
        }
        advanceFn = adv;
        d.addEventListener('click', adv);
      });
    },

    ask: function (who, text, choices) {
      return new Promise(function (resolve) {
        var d = el('div', 'dialog px' + (who ? '' : ' narrator'));
        if (who) { var pc = RB.portrait(who.sheet, 64); pc.className = 'portrait'; d.appendChild(pc); }
        var box = el('div');
        if (who) box.appendChild(el('div', 'who', esc(who.name)));
        box.appendChild(el('div', 'say', text));
        var ch = el('div', 'choices');
        choices.forEach(function (c, i) {
          var b = el('button', 'btn', esc(c)); b.type = 'button';
          b.addEventListener('click', function () { RB.voice.stop(); pop(d); resolve(i); });
          ch.appendChild(b);
        });
        box.appendChild(ch); d.appendChild(box); push(d);
        RB.voice.speak(text, who ? who.id : null);
        setTimeout(function () { var f = ch.querySelector('button'); if (f) f.focus(); }, 30);
      });
    },

    toast: function (html) {
      var t = el('div', 'toast', html);
      document.getElementById('toasts').appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3800);
    },

    // ---------------------------------------------------------------- opgaver
    // Giver {first: løst i første forsøg, tries: antal forsøg} — eller null, hvis man lukker.
    task: function (T, meta) {
      meta = meta || {};
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg');
        var box = el('div', 'task px'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
        bg.appendChild(box);
        var head = el('div', 'task-head');
        head.appendChild(el('span', 'task-area', esc(T.area || '')));
        head.appendChild(el('span', 'task-count', meta.count ? esc(meta.count) : ''));
        box.appendChild(head);

        var hasSide = !!(T.doc || T.chart || T.table);
        var body = el('div', 'task-body' + (hasSide ? ' two' : ''));
        var side = el('div'), main = el('div');
        if (hasSide) body.appendChild(side);
        body.appendChild(main);
        box.appendChild(body);

        // venstre side: dokumenter og grafer
        var pickEls = [];
        (T.doc ? [].concat(T.doc) : []).forEach(function (D, di) {
          var d = el('div', 'doc ' + (D.kind || 'letter'));
          if (D.title) d.appendChild(el('h4', null, esc(D.title)));
          if (D.lines) {
            var pickable = T.type === 'pick' && (T.docIndex || 0) === di;
            if (pickable) d.classList.add('pickable');
            D.lines.forEach(function (ln, li) {
              var p = el('p');
              var s = el('span', 'sent', esc(ln)); p.appendChild(s); d.appendChild(p);
              if (pickable) {
                s.tabIndex = 0; s.setAttribute('role', 'button');
                s.addEventListener('click', function () { pickEls.forEach(function (x) { x.classList.remove('sel', 'wrong'); }); s.classList.add('sel'); state.pick = li; });
                s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.click(); } });
                pickEls[li] = s;
              }
            });
          }
          if (D.html) d.insertAdjacentHTML('beforeend', D.html);
          if (D.by) d.appendChild(el('div', 'by', esc(D.by)));
          side.appendChild(d);
        });
        if (T.chart) [].concat(T.chart).forEach(function (ch) { side.appendChild(chart(ch)); });

        var qEl = el('p', 'task-q', T.q); main.appendChild(qEl);
        if (RB.voice.on) {
          var rd = el('button', 'btn small read-q', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"/></svg> Læs spørgsmålet op'); rd.type = 'button';
          rd.addEventListener('click', function () { RB.voice.speak(T.q, 'fortaeller'); });
          main.insertBefore(rd, qEl);
        }
        if (T.help) main.appendChild(el('p', 'task-help', T.help));

        var state = { sel: [], pick: null, sort: {}, order: null };
        var area = el('div'); main.appendChild(area);
        var optEls = [];

        if (T.type === 'choice' || T.type === 'multi') {
          var opts = el('div', 'opts' + (T.type === 'choice' ? ' single' : ''));
          var order = T.keepOrder ? T.opts.map(function (_, i) { return i; }) : shuffle(T.opts.map(function (_, i) { return i; }));
          order.forEach(function (oi) {
            var o = T.opts[oi];
            var b = el('button', 'opt'); b.type = 'button';
            b.innerHTML = '<span class="mark">' + (T.type === 'multi' ? '' : '') + '</span><span>' + esc(o.t) + '</span>';
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () {
              optEls.forEach(function (x) { x.el.classList.remove('wrong', 'right'); });
              if (T.type === 'choice') { state.sel = [oi]; optEls.forEach(function (x) { x.el.classList.toggle('sel', x.i === oi); x.el.setAttribute('aria-pressed', x.i === oi); }); }
              else {
                var k = state.sel.indexOf(oi);
                if (k >= 0) state.sel.splice(k, 1); else state.sel.push(oi);
                b.classList.toggle('sel', k < 0); b.setAttribute('aria-pressed', k < 0);
                b.querySelector('.mark').textContent = k < 0 ? '✓' : '';
              }
            });
            optEls.push({ el: b, i: oi }); opts.appendChild(b);
          });
          area.appendChild(opts);
        } else if (T.type === 'sort') {
          T.items.forEach(function (it, ii) {
            var row = el('div', 'sort-row');
            row.appendChild(el('div', null, esc(it.t)));
            var bs = el('div', 'sort-btns');
            T.cats.forEach(function (c, ci) {
              var b = el('button', 'sort-btn', esc(c)); b.type = 'button';
              b.addEventListener('click', function () {
                state.sort[ii] = ci; row.classList.remove('wrong', 'right');
                [].forEach.call(bs.children, function (x, xi) { x.classList.toggle('on', xi === ci); });
              });
              bs.appendChild(b);
            });
            row.appendChild(bs); area.appendChild(row); optEls.push({ el: row, i: ii });
          });
        } else if (T.type === 'order') {
          var idx = T.items.map(function (_, i) { return i; });
          do { state.order = shuffle(idx); } while (state.order.join() === idx.join() && idx.length > 1);
          var list = el('div'); area.appendChild(list);
          var draw = function () {
            list.innerHTML = '';
            state.order.forEach(function (it, pos) {
              var row = el('div', 'order-row');
              row.appendChild(el('span', 'n', (pos + 1) + '.'));
              row.appendChild(el('span', null, esc(T.items[it])));
              var mv = el('span', 'mv');
              var up = el('button', null, '&#9650;'); up.type = 'button'; up.disabled = pos === 0; up.setAttribute('aria-label', 'Flyt op');
              var dn = el('button', null, '&#9660;'); dn.type = 'button'; dn.disabled = pos === state.order.length - 1; dn.setAttribute('aria-label', 'Flyt ned');
              up.addEventListener('click', function () { var t = state.order[pos - 1]; state.order[pos - 1] = it; state.order[pos] = t; draw(); list.children[pos - 1].querySelector('button').focus(); });
              dn.addEventListener('click', function () { var t = state.order[pos + 1]; state.order[pos + 1] = it; state.order[pos] = t; draw(); list.children[pos + 1].querySelectorAll('button')[1].focus(); });
              mv.appendChild(up); mv.appendChild(dn); row.appendChild(mv); list.appendChild(row);
            });
          };
          draw();
        } else if (T.type === 'number') {
          var nb = el('div', 'num');
          var inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.setAttribute('aria-label', 'Dit svar');
          nb.appendChild(inp); if (T.unit) nb.appendChild(el('span', 'unit', esc(T.unit)));
          area.appendChild(nb);
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!solved) check(); else finish(); } });
          setTimeout(function () { inp.focus(); RB.vkbd.attach(inp, 'num'); }, 60);
        } else if (T.type === 'pick') {
          area.appendChild(el('p', 'task-help', 'Klik på sætningen i teksten til venstre.'));
        }

        var fb = el('div', 'feedback'); main.appendChild(fb);
        var foot = el('div', 'task-foot');
        var later = el('button', 'btn small', 'Senere'); later.type = 'button';
        var ok = el('button', 'btn primary', 'Tjek svar'); ok.type = 'button';
        foot.appendChild(later); foot.appendChild(el('span', 'spacer')); foot.appendChild(ok);
        main.appendChild(foot);
        push(bg);

        var tries = 0, solved = false;
        later.addEventListener('click', function () { RB.voice.stop(); pop(bg); resolve(null); });
        ok.addEventListener('click', function () { if (solved) finish(); else check(); });
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); RB.voice.stop(); pop(bg); resolve(null); } });

        function check() {
          var r = evaluate();
          if (r === 'empty') { show('bad', 'Vælg et svar først.'); return; }
          tries++;
          if (r.ok) {
            solved = true; RB.audio.sfx('good');
            var praise = tries === 1 ? 'Rigtigt!' : 'Rigtigt — du blev ved, og det virkede!';
            show('good', '<b>' + praise + '</b> ' + (T.explain || ''));
            ok.textContent = 'Videre'; later.hidden = true; ok.focus();
          } else {
            RB.audio.sfx('soft');
            var msg = r.msg || 'Ikke helt.';
            if (tries >= 1 && T.hint) msg += '<br><b>Tip:</b> ' + T.hint;
            if (tries >= 2 && T.hint2) msg += '<br><b>Ekstra tip:</b> ' + T.hint2;
            show('bad', msg + '<br><span style="color:var(--txt-soft)">Prøv igen — det er her, man lærer mest.</span>');
          }
        }
        function show(kind, html) { fb.className = 'feedback show ' + kind; fb.innerHTML = html; }
        function finish() { RB.voice.stop(); pop(bg); resolve({ first: tries === 1, tries: tries }); }

        function evaluate() {
          if (T.type === 'choice') {
            if (!state.sel.length) return 'empty';
            var o = T.opts[state.sel[0]];
            optEls.forEach(function (x) { if (x.i === state.sel[0]) x.el.classList.add(o.ok ? 'right' : 'wrong'); });
            return { ok: !!o.ok, msg: o.why };
          }
          if (T.type === 'multi') {
            if (!state.sel.length) return 'empty';
            if (T.check) { var c = T.check(state.sel.slice()); if (c.ok) mark(); return c; }
            var need = T.opts.map(function (o, i) { return o.ok ? i : -1; }).filter(function (i) { return i >= 0; });
            var wrong = state.sel.filter(function (i) { return !T.opts[i].ok; });
            var missing = need.filter(function (i) { return state.sel.indexOf(i) < 0; });
            if (!wrong.length && !missing.length) { mark(); return { ok: true }; }
            if (wrong.length) {
              var w = T.opts[wrong[0]];
              optEls.forEach(function (x) { if (wrong.indexOf(x.i) >= 0) x.el.classList.add('wrong'); });
              return { ok: false, msg: (w.why ? '«' + esc(w.t) + '» — ' + w.why : 'Mindst én af dem, du har valgt, passer ikke.') + (missing.length ? ' Og der mangler også noget.' : '') };
            }
            return { ok: false, msg: 'Det, du har valgt, er rigtigt — men der er ' + (missing.length === 1 ? 'én mere' : missing.length + ' mere') + ', der også passer.' };
          }
          if (T.type === 'sort') {
            var all = T.items.every(function (_, i) { return state.sort[i] != null; });
            if (!all) return 'empty';
            var bad = 0;
            T.items.forEach(function (it, i) {
              var row = optEls[i].el; row.classList.remove('wrong', 'right');
              if (state.sort[i] !== it.c) { bad++; row.classList.add('wrong'); }
            });
            if (!bad) { optEls.forEach(function (x) { x.el.classList.add('right'); }); return { ok: true }; }
            return { ok: false, msg: (bad === 1 ? 'Én af dem' : bad + ' af dem') + ' er havnet i den forkerte kasse — de er markeret med rødt.' };
          }
          if (T.type === 'order') {
            var okk = state.order.every(function (v, i) { return v === i; });
            return okk ? { ok: true } : { ok: false, msg: 'Rækkefølgen holder ikke helt endnu. Hvad skal ske først, for at resten giver mening?' };
          }
          if (T.type === 'number') {
            var raw = area.querySelector('input').value.trim().replace(',', '.').replace(/\s/g, '');
            if (!raw) return 'empty';
            var v = parseFloat(raw);
            if (isNaN(v)) return { ok: false, msg: 'Skriv et tal.' };
            var good = Math.abs(v - T.answer) <= (T.tol || 0.001);
            var msg2 = null;
            if (!good && T.near) T.near.forEach(function (n) { if (Math.abs(v - n.v) < 0.001) msg2 = n.why; });
            return { ok: good, msg: msg2 };
          }
          if (T.type === 'pick') {
            if (state.pick == null) return 'empty';
            var ans = [].concat(T.answer), yes = ans.indexOf(state.pick) >= 0;
            pickEls[state.pick].classList.remove('sel');
            pickEls[state.pick].classList.add(yes ? 'right' : 'wrong');
            var why = T.whyLine && T.whyLine[state.pick];
            return { ok: yes, msg: why };
          }
          return { ok: false };
        }
        function mark() { optEls.forEach(function (x) { if (state.sel.indexOf(x.i) >= 0) x.el.classList.add('right'); }); }
      });
    },

    // ---------------------------------------------------------------- bogen
    book: function (tab) {
      return new Promise(function (resolve) {
        var S = RB.state, K = RB.content;
        var bg = el('div', 'modal-bg');
        var b = el('div', 'book px'); bg.appendChild(b);
        var head = el('div', 'book-head');
        head.appendChild(el('h2', null, 'Dagbogen'));
        var tabs = el('div', 'tabs'); head.appendChild(tabs);
        var close = el('button', 'btn small', 'Luk'); close.type = 'button'; head.appendChild(close);
        b.appendChild(head);
        var body = el('div'); b.appendChild(body);
        var names = [['kvester', 'Missioner'], ['spor', 'Spor'], ['evner', 'Evner'], ['runer', 'Runestykker']];
        names.forEach(function (n) {
          var t = el('button', 'tab', n[1]); t.type = 'button';
          t.addEventListener('click', function () { show(n[0]); });
          tabs.appendChild(t); n.push(t);
        });
        function show(which) {
          names.forEach(function (n) { n[2].classList.toggle('on', n[0] === which); });
          body.innerHTML = '';
          if (which === 'kvester') {
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
              if (q.uses && st !== 'locked') inner.appendChild(el('div', 'uses', 'Bygger på: ' + esc(q.uses)));
              it.appendChild(inner); body.appendChild(it);
            });
          } else if (which === 'spor') {
            var cl = S.clues.map(function (id) { return K.clues[id]; });
            if (!cl.length) body.appendChild(el('p', 'empty', 'Du har ikke samlet nogen spor endnu. Spor er ting, du finder ud af undervejs — dem kan du bruge senere.'));
            body.appendChild(el('p', 'task-help', 'Spor med guldkant bygger på beviser. Grå spor er rygter eller påstande, som ingen har tjekket.'));
            cl.forEach(function (c) {
              var d = el('div', 'clue' + (c.weak ? ' weak' : ''));
              d.innerHTML = esc(c.t) + '<small>' + esc(c.src) + '</small>';
              body.appendChild(d); body.appendChild(el('div', null, '')).style.height = '6px';
            });
          } else if (which === 'evner') {
            Object.keys(K.skills).forEach(function (id) {
              var sk = K.skills[id], has = S.skills.indexOf(id) >= 0;
              var d = el('div', 'skill' + (has ? '' : ' no'));
              d.appendChild(el('span', 'gem'));
              d.appendChild(el('div', null, '<b>' + esc(has ? sk.name : '???') + '</b><br><span class="meta">' + esc(has ? sk.desc : 'Endnu ikke lært.') + '</span>'));
              body.appendChild(d); body.appendChild(el('div')).style.height = '6px';
            });
          } else {
            var found = S.runes;
            body.appendChild(el('p', 'task-help', 'Runestykker ligger gemt rundt omkring. Du har fundet ' + found.length + ' af ' + K.runes.length + '. Nysgerrighed betaler sig!'));
            K.runes.forEach(function (r) {
              var has = found.indexOf(r.id) >= 0;
              var d = el('div', 'clue' + (has ? '' : ' weak'));
              d.innerHTML = has ? '<b>' + esc(r.title) + '</b><br>' + esc(r.t) : '??? <small>' + esc(r.where) + '</small>';
              body.appendChild(d); body.appendChild(el('div')).style.height = '6px';
            });
          }
        }
        function done() { pop(bg); resolve(); }
        close.addEventListener('click', done);
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') { e.stopPropagation(); done(); } });
        push(bg); show(tab || 'kvester'); close.focus();
      });
    },

    // ---------------------------------------------------------------- menu
    menu: function () {
      return new Promise(function (resolve) {
        var bg = el('div', 'modal-bg'), m = el('div', 'menu px'); bg.appendChild(m);
        m.appendChild(el('h2', null, 'Pause'));
        function toggle(label, get, set) {
          var b = el('button', 'btn toggle'); b.type = 'button';
          var paint = function () { b.innerHTML = '<span>' + label + '</span><span>' + (get() ? 'Til' : 'Fra') + '</span>'; };
          b.addEventListener('click', function () { set(!get()); paint(); RB.saveSettings(); }); paint(); m.appendChild(b); return b;
        }
        var first = el('button', 'btn', 'Fortsæt'); first.type = 'button'; m.appendChild(first);
        toggle('Musik', function () { return RB.audio.musicOn; }, function (v) { RB.audio.setMusic(v); });
        toggle('Lydeffekter', function () { return RB.audio.sfxOn; }, function (v) { RB.audio.setSfx(v); });
        toggle('Oplæsning af dialog', function () { return RB.voice.on; }, function (v) { RB.voice.on = v; });
        toggle('Større tekst', function () { return document.body.classList.contains('big'); }, function (v) { document.body.classList.toggle('big', v); });
        if (RB.canFullscreen) toggle('Fuld skærm', function () { return RB.isFullscreen(); }, function () { RB.toggleFullscreen(); });
        var restart = el('button', 'btn', 'Start forfra'); restart.type = 'button'; m.appendChild(restart);
        var home = el('a', 'btn', 'Til Learnification.dk'); home.href = '/runeborg'; home.style.textDecoration = 'none'; m.appendChild(home);
        // Logget ind? Så kan man logge ud herfra — vigtigt på en delt skolecomputer
        if (window.LF_SPILLER && window.LFSpil) {
          var hvem = LF_SPILLER.hvem === 'elev' ? LF_SPILLER.elev.kaldenavn : 'voksen';
          var ud = el('button', 'btn', 'Log ud (' + hvem.replace(/[<>&]/g, '') + ')'); ud.type = 'button'; m.appendChild(ud);
          ud.addEventListener('click', function () { LFSpil.logUd('/login'); });   // pagehide gemmer eventyret
        }
        m.appendChild(el('div', 'keys', '<span class="key">&#8592;&#8593;&#8594;&#8595;</span><span>Gå (eller WASD)</span><span class="key">E</span><span>Tal, undersøg, gå videre</span><span class="key">B</span><span>Dagbogen</span><span class="key">F</span><span>Fuld skærm</span><span class="key">M</span><span>Musik til/fra</span><span class="key">Esc</span><span>Denne menu</span>'));
        function done() { pop(bg); resolve(); }
        first.addEventListener('click', done);
        restart.addEventListener('click', function () {
          if (window.confirm('Vil du starte forfra? Alt, du har nået, bliver slettet.')) { RB.resetGame(); }
        });
        bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); done(); } });
        push(bg); first.focus();
      });
    },

    // ---------------------------------------------------------------- titel
    title: function (hasSave) {
      return new Promise(function (resolve) {
        var s = el('div', 'screen-full'), c = el('div', 'title-card px'); s.appendChild(c);
        c.appendChild(el('h1', null, 'Runeborg'));
        c.appendChild(el('p', 'sub', 'Et eventyr om en grøn brønd, et hav af rygter — og de beviser, der skal til for at finde sandheden.'));
        var row = el('div', 'row');
        if (hasSave) { var cont = el('button', 'btn primary', 'Fortsæt eventyret'); cont.type = 'button'; row.appendChild(cont); cont.addEventListener('click', function () { RB.audio.unlock(); pop(s); resolve('continue'); }); }
        var nw = el('button', 'btn' + (hasSave ? '' : ' primary'), 'Nyt eventyr'); nw.type = 'button'; row.appendChild(nw);
        nw.addEventListener('click', function () {
          if (hasSave && !window.confirm('Et nyt eventyr sletter det, du har gemt. Vil du det?')) return;
          RB.audio.unlock(); pop(s); resolve('new');
        });
        c.appendChild(row);
        c.appendChild(el('p', 'tiny', 'Eventyret gemmes i din egen browser. Mens spillet er til test, sendes kun, hvor længe du har spillet. <a href="/for-voksne#data">Hvad gemmes?</a>'));
        push(s); (row.querySelector('.primary') || nw).focus();
      });
    },

    create: function (classes) {
      return new Promise(function (resolve) {
        var s = el('div', 'screen-full'), c = el('div', 'title-card px'); s.appendChild(c);
        c.appendChild(el('h2', null, 'Hvem er du, lærling?'));
        var name = el('input', 'name-in'); name.maxLength = 16; name.placeholder = 'Dit heltenavn'; name.setAttribute('aria-label', 'Dit heltenavn');
        c.appendChild(name);
        c.appendChild(el('p', 'tiny', 'Brug gerne et opdigtet navn. Det bliver kun i spillet.'));
        var grid = el('div', 'classes'), pick = 0;
        classes.forEach(function (k, i) {
          var b = el('button', 'cls'); b.type = 'button';
          var cv = RB.portrait(RB.makeSheet(k.look), 64); b.appendChild(cv);
          b.appendChild(el('b', null, esc(k.name))); b.appendChild(el('small', null, esc(k.desc)));
          b.addEventListener('click', function () { pick = i; [].forEach.call(grid.children, function (x, xi) { x.classList.toggle('sel', xi === i); }); });
          if (i === 0) b.classList.add('sel');
          grid.appendChild(b);
        });
        c.appendChild(grid);
        var go = el('button', 'btn primary', 'Begynd eventyret'); go.type = 'button'; c.appendChild(go);
        function start() { pop(s); resolve({ name: name.value.trim().slice(0, 16) || 'Lærling', cls: pick }); }
        go.addEventListener('click', start);
        name.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); start(); } e.stopPropagation(); });
        push(s); name.focus(); RB.vkbd.attach(name, 'text');
      });
    },

    // ---------------------------------------------------------------- slut
    ending: function (rows, badges) {
      return new Promise(function (resolve) {
        var s = el('div', 'screen-full'), c = el('div', 'end px'); s.appendChild(c);
        c.appendChild(el('h2', null, 'Runeborg er reddet!'));
        c.appendChild(el('p', null, 'Brønden er klar igen, Hilde er fri, og farveriet har fået et filter. Og det var ikke et sværd, der gjorde det — det var beviser. Her er, hvad du har vist, at du kan:'));
        var list = el('div', 'cando');
        rows.forEach(function (r) {
          var st = ''; for (var i = 0; i < 3; i++) st += i < r.stars ? '★' : '<span class="off">★</span>';
          list.appendChild(el('div', null, '<span>Jeg kan ' + esc(r.t) + '</span><span class="stars" aria-label="' + r.stars + ' af 3 stjerner">' + st + '</span>'));
        });
        c.appendChild(list);
        var bd = el('div', 'badges');
        badges.forEach(function (b) { bd.appendChild(el('div', 'badge', b)); });
        c.appendChild(bd);
        c.appendChild(el('p', 'task-help', 'Stjernerne viser, hvor tit du ramte i første forsøg. Men læg mærke til vedholdenheden: hver gang du prøvede igen efter en fejl, lærte du noget, du ikke kunne før.'));
        var row = el('div', 'end-row');
        var again = el('button', 'btn', 'Gå rundt i byen'); again.type = 'button';
        var home = el('a', 'btn primary', 'Tilbage til Learnification'); home.href = '/runeborg'; home.style.textDecoration = 'none';
        row.appendChild(again); row.appendChild(home); c.appendChild(row);
        again.addEventListener('click', function () { pop(s); resolve(); });
        push(s); again.focus();
      });
    }
  };

  // ---------------------------------------------------------------- skærmtastatur
  // Kun på berøringsskærme: QWERTY med æøå til navnet, taltastatur til regning.
  // Telefonens eget tastatur holdes nede (inputmode="none"), så der ikke
  // kommer to tastaturer oven på hinanden.
  RB.vkbd = (function () {
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
      RB.audio.sfx('blip');
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
        if (RB.wakeTouch) RB.wakeTouch();
        setTimeout(function () { inp.scrollIntoView({ block: 'center' }); }, 50);
      },
      release: function (node) {
        if (!input || !node.contains(input)) return;
        input = null; box.hidden = true; document.body.classList.remove('vkbd-open');
      }
    };
  })();

  // ---------------------------------------------------------------- grafer
  // Små pixelgrafer i SVG. bar: søjler, line: en eller flere kurver.
  function chart(ch) {
    var wrap = el('div', 'chart');
    if (ch.title) wrap.appendChild(el('div', 'chart-title', esc(ch.title)));
    var W = 420, H = 230, L = 42, B = 40, Tp = 12, Rr = 12;
    var pw = W - L - Rr, ph = H - Tp - B, max = ch.max || 10;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" font-family="Atkinson Hyperlegible, Verdana, sans-serif" font-size="13" shape-rendering="crispEdges" role="img" aria-label="' + esc(ch.title || 'Graf') + '">';
    var steps = ch.steps || 5;
    for (var i = 0; i <= steps; i++) {
      var v = max / steps * i, y = Tp + ph - ph * v / max;
      s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y + '" y2="' + y + '" stroke="#3a3052" stroke-width="2"/>';
      s += '<text x="' + (L - 8) + '" y="' + (y + 4) + '" fill="#c9bfdc" text-anchor="end">' + (Math.round(v * 10) / 10) + '</text>';
    }
    s += '<line x1="' + L + '" x2="' + L + '" y1="' + Tp + '" y2="' + (Tp + ph) + '" stroke="#f4ecdc" stroke-width="2"/>';
    s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + (Tp + ph) + '" y2="' + (Tp + ph) + '" stroke="#f4ecdc" stroke-width="2"/>';
    var n = ch.labels.length, slot = pw / n;
    if (ch.kind === 'bar') {
      ch.values.forEach(function (v, i) {
        var bw = slot * 0.56, x = L + slot * i + (slot - bw) / 2, h = ph * v / max, y = Tp + ph - h;
        var col = (ch.colors && ch.colors[i]) || '#ffcc4d';
        s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" fill="' + col + '"/>';
        s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="4" fill="#fff3c4" opacity=".6"/>';
        s += '<text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" fill="#f4ecdc" text-anchor="middle">' + v + '</text>';
      });
    } else {
      if (ch.marker != null) {
        var mx = L + slot * ch.marker.at + slot / 2;
        s += '<line x1="' + mx + '" x2="' + mx + '" y1="' + Tp + '" y2="' + (Tp + ph) + '" stroke="#ff6b5a" stroke-width="2" stroke-dasharray="6 4"/>';
        s += '<text x="' + (mx + 5) + '" y="' + (Tp + 14) + '" fill="#ff9d8a">' + esc(ch.marker.label) + '</text>';
      }
      var series = ch.series || [{ values: ch.values, color: '#ffcc4d' }];
      series.forEach(function (se) {
        var pts = se.values.map(function (v, i) { return [L + slot * i + slot / 2, Tp + ph - ph * v / max]; });
        s += '<polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="' + se.color + '" stroke-width="3" shape-rendering="auto"/>';
        pts.forEach(function (p) { s += '<rect x="' + (p[0] - 4) + '" y="' + (p[1] - 4) + '" width="8" height="8" fill="' + se.color + '" stroke="#140f1c" stroke-width="2"/>'; });
      });
    }
    ch.labels.forEach(function (lb, i) {
      s += '<text x="' + (L + slot * i + slot / 2) + '" y="' + (H - B + 18) + '" fill="#c9bfdc" text-anchor="middle">' + esc(lb) + '</text>';
    });
    if (ch.xlabel) s += '<text x="' + (L + pw / 2) + '" y="' + (H - 4) + '" fill="#8e84a8" text-anchor="middle">' + esc(ch.xlabel) + '</text>';
    s += '</svg>';
    wrap.insertAdjacentHTML('beforeend', s);
    if (ch.series && ch.series.length > 1) {
      var lg = el('div', 'task-help'); lg.style.margin = '6px 0 0';
      lg.innerHTML = ch.series.map(function (se) { return '<span style="color:' + se.color + '">■</span> ' + esc(se.name); }).join(' &nbsp; ');
      wrap.appendChild(lg);
    }
    return wrap;
  }
})();
