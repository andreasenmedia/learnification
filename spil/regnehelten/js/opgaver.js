/* Regnehelten — matematikken
   Hver opgave er pakket ind i en situation fra en helt almindelig skoledag,
   og hver har sin egen måde at svare på (skriv, vælg, find dem alle,
   vægtskål, talrække, rigtigt/forkert, byg selv, betal præcis).

   Blooms taksonomi styrer rækkefølgen: HUSK -> FORSTÅ -> ANVEND ->
   ANALYSÉR -> VURDÉR -> SKAB.

   Sværhedsgraden følger KLASSETRIN, ikke alder: det er klassen, der
   bestemmer, hvad barnet har lært, og Fælles Mål er skrevet efter den.
   Hvert trin har både et talområde (hvilke tal barnet KENDER) og et
   regneloft (hvor store tal det skal regne MED i hovedet). Er opgaverne for
   svære, er det regneloftet, der skal skrues ned — ikke talområdet.

   Oversat linje for linje fra content.py i Python-udgaven, så opgaverne er
   de samme. tools/regnehelten-tjek.py måler tusindvis af opgaver mod
   klassetrinnene. Hver opgave peger på en side i Regnebogen ("book"). */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};

  var TRIN = {
    1: { klasse: 1, navn: '1. klasse', maal: 'Tal op til 20. Plus og minus. Dobbelt og halvdelen. Tælle med 2, 5 og 10. Klokken hele timer. Mønter.',
      hi: 20, sum: 20, kr: 20, plus: 10, gange_top: 0, del_top: 0, tabeller: [], spring: [1, 2, 5, 10],
      gange: false, division: false, rest: false, halve: true, fjerdedele: false, broek: false, decimal: false, procent: false,
      ligning: false, hierarki: false, negative: false, areal: false, gennemsnit: false, klokke: 'hel' },
    2: { klasse: 2, navn: '2. klasse', maal: 'Tal op til 100. Plus og minus med tiere-overgang. 2-, 5- og 10-tabellen. Dele i lige store bunker. Klokken hel, halv og kvarter.',
      hi: 100, sum: 100, kr: 100, plus: 50, gange_top: 50, del_top: 50, tabeller: [2, 5, 10], spring: [2, 5, 10],
      gange: true, division: true, rest: false, halve: true, fjerdedele: false, broek: false, decimal: false, procent: false,
      ligning: false, hierarki: false, negative: false, areal: false, gennemsnit: false, klokke: 'kvarter' },
    3: { klasse: 3, navn: '3. klasse', maal: 'Tal op til 1000. Hele gangetabellen. Division uden rest. Halve og fjerdedele. Omkreds. Klokken på minuttet.',
      hi: 1000, sum: 1000, kr: 200, plus: 100, gange_top: 100, del_top: 100, tabeller: [2, 3, 4, 5, 6, 7, 8, 9, 10], spring: [2, 3, 4, 5, 10],
      gange: true, division: true, rest: false, halve: true, fjerdedele: true, broek: false, decimal: false, procent: false,
      ligning: false, hierarki: false, negative: false, areal: false, gennemsnit: false, klokke: 'minut' },
    4: { klasse: 4, navn: '4. klasse', maal: 'Tal op til 10.000. Gange flercifret med etcifret. Division med rest. Kroner og øre. Brøkdele. Areal og omkreds af et rektangel.',
      hi: 10000, sum: 5000, kr: 400, plus: 200, gange_top: 200, del_top: 200, tabeller: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], spring: [3, 4, 6, 7, 8, 25],
      gange: true, division: true, rest: true, halve: true, fjerdedele: true, broek: true, decimal: true, procent: false,
      ligning: false, hierarki: false, negative: false, areal: true, gennemsnit: false, klokke: 'minut' },
    5: { klasse: 5, navn: '5. klasse', maal: 'Store tal. Gange flercifret med etcifret. Division. Brøk, decimaltal og procent hænger sammen. Parenteser og gange før plus. Negative tal.',
      hi: 100000, sum: 20000, kr: 800, plus: 1000, gange_top: 600, del_top: 600, tabeller: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], spring: [6, 7, 8, 9, 12, 25, 50],
      gange: true, division: true, rest: true, halve: true, fjerdedele: true, broek: true, decimal: true, procent: true,
      ligning: false, hierarki: true, negative: true, areal: true, gennemsnit: true, klokke: 'minut' },
    6: { klasse: 6, navn: '6. klasse', maal: 'Procent og rabat. Brøkregning. Simple ligninger. Areal af en trekant. Gennemsnit. Negative tal. Regnearternes rækkefølge.',
      hi: 100000, sum: 50000, kr: 1200, plus: 1000, gange_top: 900, del_top: 900, tabeller: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], spring: [7, 8, 9, 12, 15, 25, 50],
      gange: true, division: true, rest: true, halve: true, fjerdedele: true, broek: true, decimal: true, procent: true,
      ligning: true, hierarki: true, negative: true, areal: true, gennemsnit: true, klokke: 'minut' }
  };
  var KLASSER = [1, 2, 3, 4, 5, 6], STANDARD_KLASSE = 3;
  function trin(k) { return TRIN[k | 0] || TRIN[STANDARD_KLASSE]; }

  // ---------------------------------------------------------------- små hjælpere
  function r(a, b) { a = Math.trunc(a); b = Math.trunc(b); var lo = Math.min(a, b), hi = Math.max(a, b); return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fd(a, b) { return Math.floor(a / b); }
  // Python runder halve til nærmeste lige tal — det gør vi også, så tallene bliver de samme
  function pyround(x) { var f = Math.floor(x), d = x - f; if (d > 0.5) return f + 1; if (d < 0.5) return f; return f % 2 === 0 ? f : f + 1; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function regneloft(t) { return Math.max(t.plus, t.gange_top, t.kr); }

  function fak(t, mindst, hoejst) {
    mindst = mindst == null ? 2 : mindst;
    var bud = t.tabeller.filter(function (n) { return n >= mindst && (hoejst == null || n <= hoejst); });
    if (!bud.length) bud = t.tabeller.length ? t.tabeller.slice() : [2];
    return choice(bud);
  }
  function spring(t, top) {
    var bud = t.spring.filter(function (s) { return 2 + 4 * s <= top; });
    return bud.length ? choice(bud) : Math.min.apply(null, t.spring);
  }
  // Hvor mange der må ligge i hver af `antal` grupper — produktet holder sig under gangeloftet
  function prGruppe(t, antal, mindst, hoejst) {
    mindst = mindst == null ? 2 : mindst;
    var loft = Math.max(2, fd(t.gange_top, Math.max(1, antal)));
    var tabel = t.tabeller.length ? t.tabeller : [2];
    var bud = tabel.filter(function (n) { return n >= mindst && n <= loft && (hoejst == null || n <= hoejst); });
    if (!bud.length) { bud = tabel.filter(function (n) { return n <= loft; }); if (!bud.length) bud = [Math.min.apply(null, tabel)]; }
    return choice(bud);
  }
  // Et gangestykke, trinnet både har mødt og kan regne
  function gangPar(t, loft) {
    var top = loft ? Math.min(t.gange_top, loft) : t.gange_top;
    if (top < 4) return [2, 2];
    var b = fak(t, 2, 9), a;
    if (t.klasse >= 4 && Math.random() < 0.6) {
      a = r(2, Math.max(2, Math.min(99, fd(top, b))));
      if (a > 20 && Math.random() < 0.5) a = Math.max(2, pyround(a / 5) * 5);
    } else {
      a = fak(t);
      if (a * b > top) a = Math.max(2, fd(top, b));
    }
    return [a, b];
  }
  // Et pænt beløb: store beløb bliver runde, så det handler om at handle ind
  function beloeb(t, andel, loft) {
    andel = andel == null ? 1 : andel;
    var top = Math.max(5, Math.trunc(t.kr * andel));
    if (loft) top = Math.max(5, Math.min(top, loft));
    if (top <= 20) return r(2, top);
    if (top <= 60) return r(1, fd(top, 5)) * 5;
    if (top <= 300) return r(2, fd(top, 10)) * 10;
    return r(2, fd(top, 25)) * 25;
  }
  // Et tal, barnet selv skal regne med — inden for regneloftet
  function tal(t, andel) {
    var top = Math.max(5, Math.trunc(t.plus * (andel == null ? 1 : andel)));
    if (top <= 20) return r(2, top);
    if (top <= 100) return Math.random() < 0.5 ? r(2, top) : r(1, fd(top, 5)) * 5;
    if (top <= 500) return r(2, fd(top, 10)) * 10;
    return r(2, fd(top, 50)) * 50;
  }
  // To tal, der må lægges sammen i hovedet på trinnet
  function plusPar(t, andel) {
    var top = Math.max(4, Math.trunc(t.plus * (andel == null ? 1 : andel)));
    var a = r(Math.max(2, fd(top, 3)), Math.max(3, top - 2));
    var b = r(1, Math.max(1, top - a));
    if (top > 100) { a = Math.max(10, pyround(a / 10) * 10); b = Math.max(10, pyround(b / 10) * 10); }
    else if (a >= 20 && Math.random() < 0.5) b = Math.max(1, pyround(b / 5) * 5);
    return [a, b];
  }

  // Tilgivende talkontrol: 12, 12,5, 12.5, 1.234 og '45 kr' virker alle
  function checkNumeric(user, answer) {
    var raw = String(user).trim().toLowerCase().split('kr').join('');
    raw = raw.replace(/[^0-9.,\-]/g, '');
    if (!raw || raw === '-' || raw === '.' || raw === ',') return false;
    var bud = [raw.split('.').join('').split(',').join('.'), raw.split(',').join('')];
    for (var i = 0; i < bud.length; i++) {
      var c = bud[i];
      if (!/^-?(\d+\.?\d*|\.\d+)$/.test(c)) continue;
      if (Math.abs(Number(c) - Number(answer)) < 0.011) return true;
    }
    return false;
  }
  function fmt(n) {
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2).replace('.', ',').replace(/0+$/, '').replace(/,$/, '');
  }
  function kr(n) { return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','); }

  // ---------------------------------------------------------------- regnestykker uden eval
  // En lille, streng regnemaskine: tal, + - * /, parenteser og fortegn.
  // Alt andet (også "2(3)" og "3 4") er en fejl — ligesom i Python-udgaven.
  function calc(expr) {
    var s = expr.replace(/\s+/g, ''), i = 0;
    function peek() { return s[i]; }
    function num() {
      var m = /^\d+(\.\d+)?/.exec(s.slice(i));
      if (!m) throw new Error('tal');
      i += m[0].length; return parseFloat(m[0]);
    }
    function factor() {
      var c = peek();
      if (c === '-') { i++; return -factor(); }
      if (c === '+') { i++; return factor(); }
      if (c === '(') { i++; var v = sum(); if (peek() !== ')') throw new Error('parentes'); i++; return v; }
      return num();
    }
    function prod() {
      var v = factor();
      while (peek() === '*' || peek() === '/') {
        var op = s[i++], w = factor();
        if (op === '/') { if (w === 0) throw new Error('nul'); v /= w; } else v *= w;
      }
      return v;
    }
    function sum() {
      var v = prod();
      while (peek() === '+' || peek() === '-') { var op = s[i++], w = prod(); v = op === '+' ? v + w : v - w; }
      return v;
    }
    if (!s) throw new Error('tom');
    var v = sum();
    if (i !== s.length || !isFinite(v)) throw new Error('rest');
    return v;
  }
  RH.calc = calc;

  // ---------------------------------------------------------------- kreative opgaver (SKAB)
  var ALLOWED_EXPR = /^[0-9+\-*/(). ]+$/;
  function makeCreative(t) {
    var antal, tegn, minOps;
    if (!t.gange) { antal = 2; tegn = '+-'; minOps = 1; }
    else if (!t.hierarki) { antal = 3; tegn = '+-*'; minOps = 2; }
    else { antal = choice([3, 4]); tegn = '+-*/'; minOps = 2; }
    var top = t.klasse <= 3 ? 9 : 12;
    for (var n = 0; n < 400; n++) {
      var nums = [], ops = [];
      for (var k = 0; k < antal; k++) nums.push(r(2, top));
      for (var j = 0; j < antal - 1; j++) ops.push(choice(tegn.split('')));
      var expr = String(nums[0]);
      ops.forEach(function (op, idx) { expr += op + nums[idx + 1]; });
      var val;
      try { val = calc(expr); } catch (e) { continue; }
      if (!Number.isInteger(val) || val <= 0) continue;
      if (!t.gange && val > t.sum) continue;
      var unikke = {}; ops.forEach(function (o) { unikke[o] = 1; });
      if (Object.keys(unikke).length >= minOps) return { numbers: nums, target: val, min_ops: minOps, allowed: tegn, expr: expr };
    }
    return { numbers: [3, 4], target: 7, min_ops: 1, allowed: '+-', expr: '3+4' };
  }
  function checkCreative(expr, puzzle) {
    var e = expr.trim().replace(/[xX]/g, '*').replace(/:/g, '/').replace(/÷/g, '/').replace(/,/g, '.');
    if (!e) return [false, 'Byg et regnestykke først.'];
    if (!ALLOWED_EXPR.test(e)) return [false, 'Brug kun tal og + - x : ( )'];
    var used = (e.match(/\d+/g) || []).map(Number).sort(function (a, b) { return a - b; });
    var need = puzzle.numbers.slice().sort(function (a, b) { return a - b; });
    if (used.join() !== need.join()) return [false, 'Du skal bruge hvert af tallene ' + puzzle.numbers.join(', ') + ' præcis én gang.'];
    var ops = {}; e.replace(/[+\-*/]/g, function (c) { ops[c] = 1; return c; });
    if (Object.keys(ops).length < puzzle.min_ops) return [false, 'Brug mindst ' + puzzle.min_ops + ' forskellige regnearter.'];
    var val;
    try { val = calc(e); } catch (x) { return [false, 'Det regnestykke kan ikke regnes ud. Tjek parenteserne.']; }
    if (Math.abs(val - puzzle.target) < 0.001) return [true, ''];
    return [false, 'Det giver ' + fmt(val) + ' — og det skulle gerne give ' + puzzle.target + '.'];
  }

  // ---------------------------------------------------------------- opgavetyper
  function write(who, q, answer, hint, unit, book) { return { kind: 'write', who: who, q: q, answer: answer, hint: hint, unit: unit || '', book: book || 'plus' }; }
  function choose(who, q, choices, answer, hint, book) { return { kind: 'choice', who: who, q: q, choices: choices, answer: answer, hint: hint, book: book || 'plus' }; }
  function balance(who, q, a, op, answer, hint, book) {
    var target = op === 'x' ? a * answer : (op === '+' ? a + answer : a - answer);
    return { kind: 'balance', who: who, q: q, a: a, op: op, target: target, answer: answer, hint: hint, book: book || 'gange', min: 0, max: Math.max(20, answer + 8), start: Math.max(1, fd(answer, 2)) };
  }
  function sequence(who, q, seq, answer, hint, book) { return { kind: 'sequence', who: who, q: q, seq: seq, answer: answer, hint: hint, book: book || 'monstre' }; }
  function truefalse(who, q, statement, isTrue, hint, book) { return { kind: 'truefalse', who: who, q: q, statement: statement, is_true: isTrue, hint: hint, book: book || 'tjek' }; }
  function coins(who, q, target, hint, book) { return { kind: 'coins', who: who, q: q, target: target, hint: hint, book: book || 'penge' }; }
  function build(who, q, puzzle, hint, book) { return { kind: 'build', who: who, q: q, puzzle: puzzle, hint: hint, book: book || 'raekkefolge' }; }

  // Et tilfældigt regnestykke, der giver netop value — kun med regnearter, trinnet har mødt
  function exprFor(value, t) {
    var forms = [];
    if (value > 1) {
      var a;
      if (value <= 20) a = r(1, value - 1);
      else {
        a = choice([r(1, 9), r(1, Math.max(1, fd(value, 10))) * 10]);
        a = Math.min(Math.max(1, a), value - 1);
      }
      forms.push(a + ' + ' + (value - a));
    }
    // Trækstykket må ikke starte over trinnets talområde
    var plads = Math.max(0, t.sum - value);
    if (plads >= 1) { var b = r(1, Math.min(9, plads)); forms.push((value + b) + ' - ' + b); }
    if (t.gange) {
      var top = t.tabeller.length ? Math.max.apply(null, t.tabeller) : 10, divs = [];
      for (var d = 2; d <= top; d++) if (value % d === 0 && value / d >= 2 && value / d <= top) divs.push(d);
      if (divs.length) { var dd = choice(divs); forms.push(dd + ' x ' + (value / dd)); }
    }
    return choice(forms);
  }
  function findall(who, q, target, hint, t, nCorrect, nTotal, book) {
    nCorrect = nCorrect || 3; nTotal = nTotal || 8;
    if (book == null) book = t.gange ? 'gange' : 'plus';
    var labels = {}, tiles = [], guard = 0;
    function correct() { return tiles.filter(function (x) { return x[1] === target; }).length; }
    while (correct() < nCorrect && guard < 200) {
      guard++;
      var lab = exprFor(target, t);
      if (!labels[lab]) { labels[lab] = 1; tiles.push([lab, target]); }
    }
    var loft = regneloft(t);
    while (tiles.length < nTotal && guard < 400) {
      guard++;
      var v = target + choice([-6, -4, -3, -2, -1, 1, 2, 3, 4, 6]);
      if (v < 1 || v > loft) continue;
      var lab2 = exprFor(v, t);
      if (!labels[lab2]) { labels[lab2] = 1; tiles.push([lab2, v]); }
    }
    shuffle(tiles);
    return { kind: 'findall', who: who, q: q, target: target, tiles: tiles, hint: hint, book: book };
  }

  // ---------------------------------------------------------------- 1. HUSK: morgen på værelset
  function husk(t) {
    var qs = [], a, b, ab;
    var time = choice([7, 8]), minutter;
    if (t.klokke === 'hel') {
      qs.push(write('player', 'Klokken er ' + time + ', og bussen kører en time senere. Hvad er klokken, når bussen kører?', time + 1, 'En time senere er ét tal længere frem.', '', 'plus'));
    } else if (t.klokke === 'kvarter') {
      minutter = choice([15, 30, 45]);
      qs.push(write('player', 'Klokken er ' + time + ':' + pad2(60 - minutter) + ', og bussen kører ' + (time + 1) + ':00. Hvor mange minutter har jeg?', minutter, 'Tæl op til den hele time — et kvarter ad gangen.', 'min', 'plus'));
    } else {
      minutter = choice([15, 20, 25, 35, 40, 50]);
      qs.push(write('player', 'Klokken er ' + time + ':' + pad2(60 - minutter) + ', og bussen kører ' + (time + 1) + ':00. Hvor mange minutter har jeg?', minutter, 'Fra ' + (60 - minutter) + ' minutter over til den hele time.', 'min', 'plus'));
    }
    // Lommepenge i sparegrisen
    ab = plusPar(t, 0.9); a = ab[0]; b = ab[1];
    qs.push(write('player', 'Der ligger ' + a + ' kr i sparegrisen, og jeg får ' + b + ' kr i lommepenge i dag. Hvor meget har jeg så?', a + b, 'Læg de to beløb sammen.', 'kr', 'plus'));
    // Find alle regnestykker, der giver det samme
    var target;
    if (t.gange) { ab = gangPar(t, Math.min(t.klasse <= 3 ? 30 : 60, regneloft(t) - 6)); target = ab[0] * ab[1]; }
    else target = r(8, Math.min(14, t.sum - 6));
    qs.push(findall('player', 'På forsiden af hæftet har jeg kradset en masse regnestykker. Hvilke af dem giver ' + target + '?', target, 'Regn dem ud én ad gangen, og vælg dem, der passer.', t));
    // Madpakken: gentagen addition i 1. klasse, deling derefter
    var per, dage;
    if (!t.gange) {
      per = r(2, 3); dage = r(3, 4);
      var led = []; for (var i = 0; i < dage; i++) led.push(per);
      qs.push(write('player', 'Der skal ' + per + ' stykker frugt i madpakken hver dag. Hvor mange stykker skal der bruges på ' + dage + ' dage?', per * dage, 'Læg ' + per + ' sammen for hver dag: ' + led.join(' + ') + '.', 'stk', 'plus'));
    } else {
      dage = r(3, 6); per = prGruppe(t, dage, 2, 6);
      qs.push(balance('player', 'Der skal ' + per + ' stykker frugt i madpakken hver dag. Hvor mange dage rækker ' + (per * dage) + ' stykker til?', per, 'x', dage, 'Hvor mange gange går ' + per + ' op i ' + (per * dage) + '?', 'gange'));
    }
    // Hvad er der tilbage
    var total = Math.max(6, beloeb(t, 0.5)), brugt = r(2, Math.max(2, fd(total, 2)));
    if (total > 60) brugt = Math.max(5, pyround(brugt / 5) * 5);
    qs.push(write('player', 'Jeg havde ' + total + ' kr, men brugte ' + brugt + ' kr på en sodavand i går. Hvor meget er der tilbage?', total - brugt, 'Træk det brugte fra det, du havde.', 'kr', 'plus'));
    return qs;
  }

  // ---------------------------------------------------------------- 2. FORSTÅ: køkkenet med Mor
  function forstaa(t) {
    var qs = [];
    var hold = t.klasse <= 3 ? choice([6, 8, 10]) : choice([12, 16, 20]), ialt = hold + choice([4, 6, 8]);
    qs.push(write('mor', 'Der skal ' + ialt + ' boller i alt, men der er kun plads til ' + hold + ' i ovnen ad gangen. Hvor mange må vente til næste hold?', ialt - hold, 'Hvor mange bliver der tilovers, når ovnen er fuld?', 'stk', 'plus'));
    if (!t.gange) {
      var paaPlade = r(4, 9), paaBord = r(3, 8);
      qs.push(write('mor', 'Der ligger ' + paaPlade + ' boller på pladen og ' + paaBord + ' på bordet. Hvor mange er der i alt?', paaPlade + paaBord, 'Læg de to tal sammen.', 'stk', 'plus'));
    } else {
      var plader = choice([2, 3, 4]), prPlade = prGruppe(t, plader, 2, 8);
      qs.push(balance('mor', 'Vi sætter ' + plader + ' plader i ovnen og får ' + (plader * prPlade) + ' boller ud. Hvor mange lå der på hver plade?', plader, 'x', prPlade, 'Del ' + (plader * prPlade) + ' med ' + plader + '.', 'division'));
    }
    var dl;
    if (t.fjerdedele && Math.random() < 0.5) {
      dl = choice([8, 12, 16, 20]);
      qs.push(write('mor', 'Opskriften siger ' + dl + ' dl mælk, men vi laver kun en fjerdedel. Hvor mange dl skal du hælde op?', dl / 4, 'En fjerdedel betyder delt i 4 lige store dele.', 'dl', 'halve'));
    } else {
      dl = choice([4, 6, 8, 10]);
      qs.push(write('mor', 'Opskriften siger ' + dl + ' dl mælk, men vi laver kun den halve portion. Hvor mange dl skal du hælde op?', dl / 2, t.division ? 'Den halve portion betyder delt med 2.' : 'Den halve portion er lige så meget i to bunker.', 'dl', 'halve'));
    }
    var vg;
    if (t.broek) {
      // posen skal kunne deles: 16 vingummier giver ikke hele tredjedele
      var del = choice([3, 4]);
      vg = del === 3 ? choice([12, 18, 24]) : choice([12, 16, 20, 24]);
      var ental = del === 3 ? 'tredjedel' : 'fjerdedel', flertal = del === 3 ? 'tredjedele' : 'fjerdedele';
      qs.push(write('ida', 'Der er ' + vg + ' vingummier, og jeg får ' + (del === 3 ? 'to' : 'tre') + ' ' + flertal + ' af dem. Hvor mange er det?', vg / del * (del - 1), 'Find først én ' + ental + ': ' + vg + ' delt med ' + del + '.', 'stk', 'halve'));
    } else {
      vg = t.klasse >= 2 ? choice([12, 16, 20, 24]) : choice([6, 8, 10, 12]);
      qs.push(write('ida', 'Vi deler posen lige over! Der er ' + vg + ' vingummier. Hvor mange får jeg så?', vg / 2, 'Lige over betyder to lige store bunker.', 'stk', 'halve'));
    }
    var minutter = choice([12, 15, 18]);
    qs.push(choose('mor', 'Bollerne skal have ' + minutter + ' minutter, og de kom ind for ' + (minutter - 5) + ' minutter siden. Hvad passer?',
      ['De er færdige nu', 'De skal have 5 minutter mere', 'De skal have ' + minutter + ' minutter mere', 'De skal have ' + (minutter + 5) + ' minutter mere'], 1, 'Hvor meget mangler der, før tiden er gået?', 'plus'));
    return qs;
  }

  // ---------------------------------------------------------------- 3. ANVEND: indkøb med Far
  function anvend(t) {
    var qs = [], pris, antal, total;
    if (!t.gange) {
      pris = choice([4, 5, 6, 8]);
      qs.push(write('far', 'En pose æbler koster ' + pris + ' kr, og vi tager to poser. Hvad bliver det?', pris * 2, 'To poser er det dobbelte: ' + pris + ' + ' + pris + '.', 'kr', 'plus'));
      total = pris * 2;
    } else {
      var pa = gangPar(t, t.kr);
      // prisen er det største af de to tal: en pose æbler til 2 kr og ni poser er et mærkeligt indkøb
      pris = Math.max(pa[0], pa[1]); antal = Math.max(2, Math.min(pa[0], pa[1]));
      qs.push(write('far', 'Æblerne koster ' + pris + ' kr for en pose, og vi tager ' + antal + ' poser. Hvad bliver det?', pris * antal, pris + ' kr gange ' + antal + ' poser.', 'kr', 'gange'));
      total = pris * antal;
    }
    // Læg pengene op. Beløbet står ÉT sted, ellers kan opgaven ikke løses.
    var op = beloeb(t, 0.25, 100);
    qs.push(coins('far', 'Bollerne koster ' + op + ' kr, og manden vil helst have det præcist. Vil du lægge pengene op?', op, 'Start med de store mønter, og fyld op med de små.'));
    // Byttepenge: sedlen er den første runde seddel over beløbet
    var sedler = t.klasse === 1 ? [20, 50] : [50, 100, 200, 500, 1000];
    var seddel = null; for (var i = 0; i < sedler.length; i++) if (sedler[i] > total) { seddel = sedler[i]; break; }
    if (seddel == null) seddel = (fd(total, 50) + 1) * 50;
    qs.push(write('far', 'Jeg betaler med ' + seddel + ' kr, og varerne koster ' + total + ' kr. Hvor meget får vi tilbage?', seddel - total, 'Byttepenge = det, du giver, minus prisen.', 'kr', 'penge'));
    // Kilopris, kroner og øre, eller rabat i procent
    var kg, kgPris;
    if (t.procent) {
      var fuld = choice([200, 240, 300, 400, 500]), pct = choice([10, 25, 50]);
      qs.push(write('far', 'Grillen koster ' + fuld + ' kr, men der er ' + pct + ' % rabat i dag. Hvor mange kroner sparer vi?', fd(fuld * pct, 100), pct + ' % er ' + pct + ' ud af 100. Find først 1 %: ' + fuld + ' delt med 100.', 'kr', 'penge'));
    } else if (t.decimal) {
      kgPris = choice([12.5, 14.5, 22.5]); kg = choice([2, 4]);
      qs.push(write('far', 'Kartoflerne koster ' + kr(kgPris) + ' kr pr. kilo, og vi skal bruge ' + kg + ' kilo. Hvad koster det?', kgPris * kg, 'Gang kiloprisen med antal kilo — også ørerne.', 'kr', 'gange'));
    } else if (t.gange) {
      kg = choice([2, 3]);
      var mulige = [10, 12, 15, 20, 24, 30].filter(function (p) { return p * kg <= t.gange_top; });
      kgPris = choice(mulige.length ? mulige : [10]);
      qs.push(write('far', 'Kartoflerne koster ' + kgPris + ' kr pr. kilo, og vi skal bruge ' + kg + ' kilo. Hvad koster det?', kgPris * kg, 'Gang kiloprisen med antal kilo.', 'kr', 'gange'));
    } else {
      var haves = r(12, 20), koster = r(4, 11);
      qs.push(write('far', 'Du har ' + haves + ' kr med, og mælken koster ' + koster + ' kr. Hvor meget har du tilbage bagefter?', haves - koster, 'Træk prisen fra det, du har.', 'kr', 'penge'));
    }
    // Er tilbuddet en god idé
    if (t.gange) {
      // 2. klasse har mødt 2-, 5- og 10-tabellen, ikke 3-tabellen
      var pakke = t.tabeller.indexOf(3) >= 0 ? 3 : 2, stkPris = choice([6, 8, 9]), tilbud = stkPris * pakke - choice([3, 4, 5]);
      qs.push(choose('far', 'Yoghurt koster ' + stkPris + ' kr stykket, men der er tilbud: ' + pakke + ' for ' + tilbud + ' kr. Hvad er billigst, hvis vi skal have ' + pakke + '?',
        [pakke + ' stykker enkeltvis', 'Tilbuddet: ' + pakke + ' for ' + tilbud + ' kr', 'Det koster det samme'], 1, 'Regn ' + stkPris + ' gange ' + pakke + ', og sammenlign med ' + tilbud + '.', 'penge'));
    } else {
      var ab = choice([[7, 9], [6, 8], [9, 12]]);
      qs.push(choose('far', 'Den lille pose koster ' + ab[0] + ' kr, og den store koster ' + ab[1] + ' kr. Hvor meget dyrere er den store?',
        [(ab[1] - ab[0]) + ' kr', ab[0] + ' kr', (ab[0] + ab[1]) + ' kr'], 0, 'Træk ' + ab[0] + ' fra ' + ab[1] + '.', 'penge'));
    }
    return qs;
  }

  // ---------------------------------------------------------------- 4. ANALYSÉR: skolegården med Oskar
  function analyser(t) {
    var qs = [];
    // Rækken er fem tal lang, så springet skal kunne være der fire gange inden for talområdet
    var top = t.klasse <= 2 ? t.sum : t.hi, step = spring(t, top);
    var hoejstStart = Math.max(2, Math.min(t.klasse <= 3 ? 9 : 40, top - 4 * step)), start = r(2, hoejstStart);
    var seq = []; for (var i = 0; i < 5; i++) seq.push(start + i * step);
    var blank = choice([3, 4]), shown = seq.slice(), answer = seq[blank]; shown[blank] = null;
    qs.push(sequence('oskar', 'Kig på fliserne — der står tal på dem hele vejen hen. Hvilket tal mangler?', shown, answer, 'Find ud af, hvor meget der lægges til hver gang.'));
    var maal = t.klasse <= 2 ? r(2, 5) : r(4, 12);
    qs.push(write('oskar', 'Vi scorede ' + maal + ' mål før pausen og dobbelt så mange efter. Hvor mange blev det i alt?', maal * 3, 'Find først anden halvleg, og læg så sammen.', 'mål', t.gange ? 'gange' : 'plus'));
    var spillere, hold;
    if (t.division) {
      hold = t.tabeller.indexOf(3) >= 0 ? choice([3, 4, 5]) : 2;
      spillere = hold * prGruppe(t, hold, 2, 6);
      qs.push(write('oskar', 'Vi er ' + spillere + ' i klassen og skal deles i ' + hold + ' lige store hold. Hvor mange er der på hvert hold?', spillere / hold, 'Del ' + spillere + ' med ' + hold + '.', 'stk', 'division'));
    } else {
      spillere = choice([8, 10, 12, 14]);
      qs.push(write('oskar', 'Vi er ' + spillere + ' og skal være to lige store hold. Hvor mange er der på hvert hold?', spillere / 2, 'To lige store hold er halvdelen til hver.', 'stk', 'halve'));
    }
    var target = t.gange ? (t.klasse <= 3 ? choice([12, 16, 18, 20, 24]) : choice([24, 30, 36, 42])) : choice([10, 12, 14, 16]);
    qs.push(findall('oskar', 'Se her — jeg har skrevet regnestykker over hele bordet. Find alle dem, der giver ' + target + '.', target, 'Regn hvert stykke ud, og sammenlign med tallet.', t));
    if (t.areal && Math.random() < 0.6) {
      var laengde = r(7, 12), bredde = r(3, 6);
      if (t.klasse >= 6 && Math.random() < 0.5) qs.push(write('oskar', 'Det skrå bed ved muren er en trekant: ' + laengde + ' m langs muren og ' + bredde + ' m ud. Hvor stort er arealet?', laengde * bredde / 2, 'Areal af en trekant: grundlinje gange højde, delt med 2.', 'm²', 'areal'));
      else qs.push(write('oskar', 'Boldbanen er ' + laengde + ' m lang og ' + bredde + ' m bred. Hvor stort er arealet?', laengde * bredde, 'Areal: længden gange bredden.', 'm²', 'areal'));
    } else if (t.negative) {
      var morgen = -r(2, 9), stigning = r(5, 14);
      qs.push(write('oskar', 'Der var ' + morgen + ' grader i morges, og nu er det steget ' + stigning + ' grader. Hvor mange grader er der nu?', morgen + stigning, 'Tæl op ad tallinjen fra minus og forbi nul.', 'grader', 'plus'));
    } else if (t.gange) {
      var raekker = r(3, 6), pr = prGruppe(t, raekker, 4, 8);
      qs.push(write('oskar', 'Der står ' + raekker + ' rækker med ' + pr + ' cykler i stativet. Hvis en hel række kører hjem, hvor mange står der så?', raekker * pr - pr, 'Regn ' + raekker + ' gange ' + pr + ', og træk én række fra.', 'stk', 'gange'));
    } else {
      var cykler = r(12, 18), hjem = r(3, 6);
      qs.push(write('oskar', 'Der står ' + cykler + ' cykler i stativet, og ' + hjem + ' af dem kører hjem. Hvor mange står der så?', cykler - hjem, 'Træk dem, der kører hjem, fra.', 'stk', 'plus'));
    }
    return qs;
  }

  // ---------------------------------------------------------------- 5. VURDÉR: kantinen
  function vurder(t) {
    var qs = [], ab, rigtigt, vist;
    if (t.gange) {
      ab = gangPar(t, Math.min(100, regneloft(t)));
      rigtigt = Math.random() < 0.5; vist = rigtigt ? ab[0] * ab[1] : ab[0] * ab[1] + choice([-2, -1, 1, 2]);
      qs.push(truefalse('oskar', 'Jeg har lavet lektier i frikvarteret. Er den her rigtig?', ab[0] + ' x ' + ab[1] + ' = ' + vist, rigtigt, 'Regn ' + ab[0] + ' gange ' + ab[1] + ' selv, og sammenlign.'));
    } else {
      ab = [r(5, 9), r(4, 9)];
      rigtigt = Math.random() < 0.5; vist = rigtigt ? ab[0] + ab[1] : ab[0] + ab[1] + choice([-2, -1, 1, 2]);
      qs.push(truefalse('oskar', 'Jeg har lavet lektier i frikvarteret. Er den her rigtig?', ab[0] + ' + ' + ab[1] + ' = ' + vist, rigtigt, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen selv, og sammenlign.'));
    }
    var x = Math.max(8, tal(t, 0.6)), y = r(2, Math.min(19, x - 2));
    qs.push(write('oskar', 'Og her har jeg skrevet ' + x + ' - ' + y + ' = ' + ((x - y) + choice([-2, -1, 1, 2])) + '. Den tror jeg ikke på. Hvad skal der stå?', x - y, 'Regn det selv, og sammenlign med det, der står.', '', 'tjek'));
    if (t.gennemsnit && Math.random() < 0.5) {
      var dage = [r(10, 40), r(10, 40), r(10, 40), r(10, 40)];
      while ((dage[0] + dage[1] + dage[2] + dage[3]) % 4 !== 0) dage[0]++;
      var sum = dage[0] + dage[1] + dage[2] + dage[3];
      qs.push(write('emma', 'Vi har talt, hvor mange der spiser i kantinen: ' + dage[0] + ', ' + dage[1] + ', ' + dage[2] + ' og ' + dage[3] + '. Hvad er gennemsnittet?', sum / 4, 'Læg dem sammen, og del med, hvor mange tal der er.', '', 'tjek'));
    } else if (t.division) {
      var prisA = choice([12, 16]), prisB = pyround(prisA / 4 * 6) + choice([-3, -2, 2, 3]);
      qs.push(choose('emma', 'I kiosken: 4 boller for ' + prisA + ' kr, eller 6 boller for ' + prisB + ' kr. Hvor er prisen pr. bolle lavest?',
        ['4 for ' + prisA + ' kr', '6 for ' + prisB + ' kr', 'De er lige gode'], prisA / 4 < prisB / 6 ? 0 : 1, 'Regn ud, hvad ÉN bolle koster hvert sted.', 'penge'));
    } else {
      ab = choice([[6, 9], [7, 10], [5, 8]]);
      qs.push(choose('emma', 'Den ene bolle koster ' + ab[0] + ' kr, den anden ' + ab[1] + ' kr. Hvor meget koster de to tilsammen?',
        [(ab[0] + ab[1]) + ' kr', (ab[1] - ab[0]) + ' kr', (ab[0] + ab[1] + 2) + ' kr'], 0, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen.', 'penge'));
    }
    var stykker = t.klasse <= 3 ? choice([8, 12]) : choice([12, 16, 24]), folk = t.division ? choice([2, 4]) : 2;
    var rigtigt2 = Math.random() < 0.5, vist2 = rigtigt2 ? stykker / folk : stykker / folk + choice([-1, 1, 2]), paastand, hjaelp;
    if (t.division) { paastand = stykker + ' : ' + folk + ' = ' + vist2; hjaelp = 'Del ' + stykker + ' ligeligt mellem ' + folk + ', og se efter.'; }
    else { paastand = 'Halvdelen af ' + stykker + ' er ' + vist2; hjaelp = 'Læg ' + stykker + ' i to lige store bunker, og tæl den ene.'; }
    qs.push(truefalse('emma', 'Pizzaen er skåret i ' + stykker + ' stykker, og vi er ' + folk + '. Oskar siger, vi får ' + vist2 + ' stykker hver. Passer det?', paastand, rigtigt2, hjaelp));
    var target = t.gange ? (t.klasse <= 3 ? choice([14, 18, 21, 27]) : choice([27, 32, 36, 45])) : choice([11, 13, 15, 17]);
    qs.push(findall('emma', 'Vi laver en quiz til de andre. Find alle de regnestykker, der giver ' + target + ' — så bruger vi dem.', target, 'Tjek hvert stykke grundigt, også dem, der ligner.', t));
    return qs;
  }

  // ---------------------------------------------------------------- 6. SKAB: fremlæggelsen for Hr. Poulsen
  function boss(t) {
    var qs = [], total;
    if (t.gange) {
      // Klassekassen skal blive inden for trinnets talområde
      var elever = t.klasse <= 3 ? choice([10, 20]) : choice([20, 24, 25]);
      var loft = Math.max(2, fd(t.gange_top, elever));
      var pris = Math.max.apply(null, [2, 5, 10, 20, 25, 35, 45, 60].filter(function (p) { return p <= loft; }));
      qs.push(write('poulsen', 'Klassekassen: hver elev lægger ' + pris + ' kr, og vi er ' + elever + ' i klassen. Hvor mange kroner har vi så?', pris * elever, pris + ' kr gange ' + elever + ' elever.', 'kr', 'gange'));
      total = pris * elever;
    } else {
      var laagt = r(6, 14), mangler = r(2, 5);
      qs.push(write('poulsen', 'Der ligger ' + laagt + ' kr i klassekassen, og vi mangler ' + mangler + ' kr til isene. Hvor mange kroner skal der være i alt?', laagt + mangler, 'Læg det, der mangler, til det, I har.', 'kr', 'plus'));
      total = laagt + mangler;
    }
    var bus = total >= 50 ? pyround(total * 0.6 / 10) * 10 : fd(total, 2);
    qs.push(write('poulsen', 'Bussen til udflugten koster ' + bus + ' kr af vores ' + total + ' kr. Hvor meget er der tilbage til mad?', total - bus, 'Træk busprisen fra det samlede beløb.', 'kr', 'penge'));
    if (t.division) {
      var grupper = choice([3, 4]), prG = prGruppe(t, grupper, 5, 8);
      qs.push(balance('poulsen', 'Vi har ' + (grupper * prG) + ' opgaveark, som skal deles ligeligt mellem ' + grupper + ' grupper. Hvor mange ark til hver gruppe?', grupper, 'x', prG, 'Del ' + (grupper * prG) + ' med ' + grupper + '.', 'division'));
    } else {
      var ark = choice([16, 18, 20]), brugt = r(4, 9);
      qs.push(write('poulsen', 'Vi har ' + ark + ' opgaveark, og ' + brugt + ' af dem er brugt. Hvor mange er der tilbage?', ark - brugt, 'Træk de brugte fra.', 'stk', 'plus'));
    }
    var ab, rigtigt, vist;
    if (t.ligning) {
      var x = r(4, 12), a = fak(t, 3, 9);
      qs.push(write('poulsen', 'Der står stadig noget på tavlen fra i går: ' + a + ' · x = ' + (a * x) + '. Hvad er x?', x, 'Hvad skal ' + a + ' ganges med for at give ' + (a * x) + '?', '', 'raekkefolge'));
    } else if (t.gange) {
      ab = gangPar(t, Math.min(100, regneloft(t)));
      rigtigt = Math.random() < 0.5; vist = rigtigt ? ab[0] * ab[1] : ab[0] * ab[1] + choice([-3, 3]);
      qs.push(truefalse('poulsen', 'Der står stadig noget på tavlen fra i går. Holder det?', ab[0] + ' x ' + ab[1] + ' = ' + vist, rigtigt, 'Regn ' + ab[0] + ' gange ' + ab[1] + ' omhyggeligt.'));
    } else {
      ab = [r(6, 12), r(4, 8)];
      rigtigt = Math.random() < 0.5; vist = rigtigt ? ab[0] + ab[1] : ab[0] + ab[1] + choice([-2, 2]);
      qs.push(truefalse('poulsen', 'Der står stadig noget på tavlen fra i går. Holder det?', ab[0] + ' + ' + ab[1] + ' = ' + vist, rigtigt, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen omhyggeligt.'));
    }
    for (var n = 0; n < 2; n++) {
      var p = makeCreative(t);
      var hjaelp = t.hierarki ? 'Husk: gange og dividere regnes før plus og minus.' : 'Prøv dig frem — regn fra venstre mod højre.';
      qs.push(build('poulsen', (n === 0 ? 'Og så en, der er din egen. ' : 'Og en sidste. ') + 'Byg et regnestykke, der giver ' + p.target + ', med tallene ' + p.numbers.join(', ') + ' — hvert tal én gang — og ' +
        (p.min_ops < 2 ? 'mindst én regneart.' : 'mindst ' + p.min_ops + ' forskellige regnearter.'), p, hjaelp));
    }
    return qs;
  }

  // ---------------------------------------------------------------- ekstramissioner (3 opgaver hver)
  function sqKiosk(t) {
    var pris = beloeb(t, 0.15, 60);
    var antal = Math.max(2, Math.min(4, fd(t.del_top, Math.max(1, pris))));
    var anden = t.division
      ? write('kioskmand', 'Og hvis I er ' + antal + ' om at dele regningen på ' + (pris * antal) + ' kr — hvor meget skal hver især give?', pris, 'Del ' + (pris * antal) + ' med ' + antal + '.', 'kr', 'division')
      : write('kioskmand', 'Og hvis I er to om at dele regningen på ' + (pris * 2) + ' kr — hvor meget skal hver især give?', pris, 'Halvdelen af beløbet til hver.', 'kr', 'halve');
    var loft = regneloft(t), stk;
    if (t.gange) { var m = [4, 6, 7].filter(function (s) { return s * 3 <= loft; }); stk = m.length ? choice(m) : 3; }
    else { var m2 = [4, 5, 6].filter(function (s) { return s * 3 <= loft; }); stk = m2.length ? choice(m2) : 3; }
    return [
      coins('kioskmand', 'Så er det ' + pris + ' kr for isen. Har du lige pengene? Jeg er løbet tør for byttepenge i dag.', pris, 'Tag de store mønter først, og fyld op med de små.'),
      anden,
      findall('kioskmand', 'Jeg skal have prismærker på. Hvilke af dem her giver ' + (stk * 3) + '?', stk * 3, 'Regn hvert stykke ud, ét ad gangen.', t)
    ];
  }
  function sqBibliotek(t) {
    var hylder = choice([4, 5, 6]), pr = t.gange ? prGruppe(t, hylder, 4, 9) : r(3, 6);
    var top = t.klasse <= 2 ? t.sum : t.hi, step = spring(t, top), start = r(2, Math.max(2, Math.min(9, top - 4 * step)));
    var vals = []; for (var i = 0; i < 5; i++) vals.push(start + i * step);
    var blank = choice([2, 3]), shown = vals.slice(), answer = vals[blank]; shown[blank] = null;
    var foerste, sidste;
    if (t.gange) {
      foerste = write('bibliotekar', 'Der skal stå ' + pr + ' bøger på hver af de ' + hylder + ' hylder. Hvor mange bøger skal jeg hente?', hylder * pr, pr + ' gange ' + hylder + '.', 'stk', 'gange');
      sidste = write('bibliotekar', (hylder * pr) + ' bøger skal deles ligeligt i ' + hylder + ' kasser. Hvor mange kommer der i hver kasse?', pr, 'Del ' + (hylder * pr) + ' med ' + hylder + '.', 'stk', 'division');
    } else {
      var paaHylde = r(6, 12), iKasse = r(3, 8);
      foerste = write('bibliotekar', 'Der står ' + paaHylde + ' bøger på hylden, og jeg sætter ' + iKasse + ' mere op. Hvor mange står der så?', paaHylde + iKasse, 'Læg de to tal sammen.', 'stk', 'plus');
      sidste = write('bibliotekar', 'Der er ' + (paaHylde + iKasse) + ' bøger, og ' + iKasse + ' bliver lånt ud. Hvor mange er tilbage?', paaHylde, 'Træk de udlånte fra.', 'stk', 'plus');
    }
    return [foerste, sequence('bibliotekar', 'Bognumrene på reolen står i en fast rækkefølge. Hvilket nummer mangler?', shown, answer, 'Se, hvor meget numrene stiger hver gang.'), sidste];
  }
  function sqParkBarn(t) {
    var slik = choice([12, 16, 20]), venner = t.division ? choice([2, 4]) : 2;
    var paastandRigtig = Math.random() < 0.5, naevner = t.fjerdedele ? 4 : 2;
    var vist = paastandRigtig ? slik / naevner : slik / naevner + 1;
    return [
      write('viggo', 'Jeg har ' + slik + ' vingummier, og vi er ' + venner + '. Hvor mange får vi hver, hvis vi deler lige?', slik / venner, venner > 2 ? 'Del ' + slik + ' med ' + venner + '.' : 'Halvdelen til hver.', 'stk', venner > 2 ? 'division' : 'halve'),
      write('viggo', 'Hvis jeg giver halvdelen af mine ' + slik + ' væk, hvor mange har jeg så tilbage?', slik / 2, t.division ? 'Halvdelen betyder delt med 2.' : 'Halvdelen er lige så mange i to bunker.', 'stk', 'halve'),
      truefalse('viggo', 'Min storebror siger, det her passer. Gør det?', t.division ? slik + ' : ' + naevner + ' = ' + vist : 'Halvdelen af ' + slik + ' er ' + vist, paastandRigtig, 'Regn det selv, og se efter.')
    ];
  }
  function sqHund(t) {
    var ture = choice([3, 4, 5]), minPr;
    if (t.gange) { var m = [5, 10, 15, 20].filter(function (x) { return x * ture <= t.gange_top; }); minPr = m.length ? choice(m) : 5; }
    else minPr = choice([5, 10]);
    if (t.gange) {
      return [
        write('hundelufter', 'Jeg går ' + ture + ' ture om dagen, og hver tur tager ' + minPr + ' minutter. Hvor mange minutter bliver det i alt?', ture * minPr, minPr + ' gange ' + ture + '.', 'min', 'gange'),
        balance('hundelufter', 'På en uge går jeg ' + (ture * 7) + ' ture. Hvor mange dage er der gået, når jeg har gået ' + (ture * 4) + ' ture?', ture, 'x', 4, 'Hvor mange gange går ' + ture + ' op i ' + (ture * 4) + '?', 'division'),
        choose('hundelufter', 'Hunden vejede ' + choice([8, 12, 16]) + ' kg sidste år og vejer det dobbelte nu. Hvad skal jeg regne?', ['Lægge 2 til', 'Gange med 2', 'Dividere med 2', 'Trække 2 fra'], 1, 'Dobbelt så meget betyder gange med 2.', 'gange')
      ];
    }
    return [
      write('hundelufter', 'Turen om formiddagen tog ' + minPr + ' minutter, og turen om eftermiddagen tog ' + minPr + ' minutter. Hvor mange minutter blev det?', minPr * 2, 'Læg ' + minPr + ' og ' + minPr + ' sammen.', 'min', 'plus'),
      write('hundelufter', 'Jeg skulle gå ' + (ture + 3) + ' ture i dag, og jeg har gået ' + ture + '. Hvor mange mangler jeg?', 3, 'Træk dem, du har gået, fra dem, du skulle.', 'stk', 'plus'),
      choose('hundelufter', 'Hunden vejede ' + choice([8, 10, 12]) + ' kg sidste år og vejer det dobbelte nu. Hvad skal jeg regne?', ['Lægge det samme til én gang til', 'Trække 2 fra', 'Dele med 2'], 0, 'Dobbelt så meget er det samme lagt til én gang til.', 'plus')
    ];
  }
  function sqPedel(t) {
    var raekker = choice([4, 5, 6]), pr = t.gange ? prGruppe(t, raekker, 5, 8) : r(3, 6), tilovers = choice([4, 6, 8]), foerste, iAlt;
    if (t.gange) {
      foerste = write('pedel', 'Der skal stilles ' + raekker + ' rækker med ' + pr + ' stole til morgensang. Hvor mange stole skal jeg hente?', raekker * pr, raekker + ' gange ' + pr + '.', 'stk', 'gange');
      iAlt = raekker * pr;
    } else {
      var stillet = r(8, 14), mangler = r(3, 6);
      foerste = write('pedel', 'Jeg har stillet ' + stillet + ' stole op, og der mangler ' + mangler + '. Hvor mange skal der være i alt?', stillet + mangler, 'Læg det, der mangler, til.', 'stk', 'plus');
      iAlt = stillet + mangler;
    }
    var maal = fd(iAlt, 2) > 3 ? fd(iAlt, 2) : iAlt;
    return [
      foerste,
      write('pedel', 'Vi har ' + (iAlt + tilovers) + ' stole i alt. Hvor mange bliver der tilovers, når jeg har stillet ' + iAlt + ' op?', tilovers, 'Træk det opstillede fra det samlede antal.', 'stk', 'plus'),
      findall('pedel', 'Jeg har kridtet tal på gulvet. Hvilke giver ' + maal + '?', maal, 'Regn dem igennem ét ad gangen.', t)
    ];
  }
  function sqSport(t) {
    var maal = choice([3, 4, 5]), km = [4, 6].filter(function (k) { return k * 5 <= t.gange_top; }), kampe = km.length ? choice(km) : 4;
    if (t.gange) {
      return [
        write('sportslaerer', 'Holdet har scoret ' + maal + ' mål i hver af de ' + kampe + ' kampe. Hvor mange mål er det i alt?', maal * kampe, maal + ' gange ' + kampe + '.', 'mål', 'gange'),
        write('sportslaerer', 'Vi skal dele ' + (kampe * 4) + ' spillere i ' + (kampe / 2) + ' lige store hold. Hvor mange på hvert hold?', (kampe * 4) / (kampe / 2), 'Del ' + (kampe * 4) + ' med ' + (kampe / 2) + '.', 'stk', 'division'),
        truefalse('sportslaerer', 'En elev har regnet målscoren sammen. Passer det?', maal + ' x ' + kampe + ' = ' + (maal * kampe), true, 'Regn ' + maal + ' gange ' + kampe + ' efter.')
      ];
    }
    return [
      write('sportslaerer', 'Vi scorede ' + maal + ' mål i første kamp og ' + (maal + 2) + ' i anden. Hvor mange mål blev det i alt?', maal * 2 + 2, 'Læg ' + maal + ' og ' + (maal + 2) + ' sammen.', 'mål', 'plus'),
      write('sportslaerer', 'Vi er ' + (kampe * 2) + ' spillere og skal være to lige store hold. Hvor mange på hvert hold?', kampe, 'To lige store hold er halvdelen til hver.', 'stk', 'halve'),
      truefalse('sportslaerer', 'En elev har regnet målscoren sammen. Passer det?', maal + ' + ' + (maal + 2) + ' = ' + (maal * 2 + 2), true, 'Læg ' + maal + ' og ' + (maal + 2) + ' sammen efter.')
    ];
  }

  var SAET = {
    husk: { bloom: 'HUSK', gen: husk }, forstaa: { bloom: 'FORSTÅ', gen: forstaa }, anvend: { bloom: 'ANVEND', gen: anvend },
    analyser: { bloom: 'ANALYSÉR', gen: analyser }, vurder: { bloom: 'VURDÉR', gen: vurder }, boss: { bloom: 'SKAB', gen: boss },
    sq_kiosk: { bloom: 'ANVEND', gen: sqKiosk }, sq_bibliotek: { bloom: 'ANALYSÉR', gen: sqBibliotek }, sq_park_barn: { bloom: 'FORSTÅ', gen: sqParkBarn },
    sq_hund: { bloom: 'ANVEND', gen: sqHund }, sq_pedel: { bloom: 'HUSK', gen: sqPedel }, sq_sport: { bloom: 'ANALYSÉR', gen: sqSport }
  };
  // Kan-mål i elevplan-sprog — vises til sidst i stedet for en karakter
  var CAN = [
    ['HUSK', 'mine tal-fakta uden at tælle på fingrene'],
    ['FORSTÅ', 'forstå, hvad en opgave spørger om'],
    ['ANVEND', 'bruge matematik, når jeg handler ind'],
    ['ANALYSÉR', 'finde mønstre og regne i flere trin'],
    ['VURDÉR', 'tjekke, om et svar er rigtigt'],
    ['SKAB', 'selv bygge et regnestykke']
  ];

  RH.opgaver = {
    TRIN: TRIN, KLASSER: KLASSER, STANDARD_KLASSE: STANDARD_KLASSE, trin: trin, regneloft: regneloft,
    SAET: SAET, CAN: CAN, lav: function (noegle, klasse) { return SAET[noegle].gen(trin(klasse)); },
    checkNumeric: checkNumeric, checkCreative: checkCreative, fmt: fmt, kr: kr
  };
})();
