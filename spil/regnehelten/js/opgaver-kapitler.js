/* Regnehelten — matematikken i kapitel 2 og 3
   Kapitel 2: udflugten til Dyreparken (bus, billetlug, kiosk, dyrene, regnskabet, fremlæggelsen).
   Kapitel 3: lørdagsmarkedet (torvet åbner, bageren, frugt og grønt, loppemarkedet, tilbuddene, egen bod).

   Samme regler som i opgaver.js: hvert sæt følger Blooms taksonomi (HUSK -> SKAB), og sværhedsgraden
   følger klassetrinnet — i kapitel 2 og 3 er det ét klassetrin højere pr. kapitel (3. klasse -> 4. -> 5.).
   Sættene bliver tjekket mod trinnene af tools/regnehelten-tjek.py, ligesom kapitel 1. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var O = RH.opgaver, H = O.H;
  var r = H.r, choice = H.choice, fd = H.fd, pyround = H.pyround, pad2 = H.pad2, spring = H.spring, prGruppe = H.prGruppe, gangPar = H.gangPar,
    beloeb = H.beloeb, tal = H.tal, plusPar = H.plusPar, regneloft = H.regneloft, makeCreative = H.makeCreative,
    write = H.write, choose = H.choose, balance = H.balance, sequence = H.sequence, truefalse = H.truefalse, coins = H.coins, build = H.build, findall = H.findall;
  var kr = O.kr, fmt = O.fmt;

  // Et antal pladser/stykker, der passer til trinnet
  function antal(t) { return choice(t.klasse === 1 ? [14, 16, 18, 20] : t.klasse === 2 ? [24, 30, 36, 40, 48] : t.klasse === 3 ? [30, 40, 50, 60, 80] : [40, 50, 60, 80, 100, 120]); }
  // En rigtig-eller-forkert-påstand: halvdelen af tiden vises den rigtige, ellers en forskudt
  function vistTal(rigtigt, valgt, afvigelser) { return rigtigt ? valgt : valgt + choice(afvigelser || [-2, -1, 1, 2]); }
  // En talrække med et hul — springene holder sig inden for trinnets talområde
  function raekke(t, hvem, q, hjaelp, blanke) {
    var top = t.klasse <= 2 ? t.sum : Math.min(t.hi, 1000), step = spring(t, top);
    var start = r(2, Math.max(2, Math.min(t.klasse <= 3 ? 9 : 40, top - 4 * step))), seq = [];
    for (var i = 0; i < 5; i++) seq.push(start + i * step);
    var blank = choice(blanke || [2, 3]), shown = seq.slice(), svar = seq[blank]; shown[blank] = null;
    return sequence(hvem, q, shown, svar, hjaelp);
  }
  // Klokken: hele timer i 1. klasse, derefter minutter
  function turTid(t, hvem, prefix, slut) {
    var start = choice([8, 9]);
    if (t.klokke === 'hel') return write(hvem, prefix + ' klokken ' + start + ', og turen tager 1 time. Hvad er klokken, når ' + slut + '?', start + 1, 'Én time senere er ét tal længere frem.', '', 'plus');
    var m = t.klokke === 'kvarter' ? choice([15, 30, 45]) : choice([20, 25, 35, 40, 50]);
    return write(hvem, prefix + ' ' + start + ':00, og ' + slut + ' ' + start + ':' + pad2(m) + '. Hvor mange minutter varer turen?', m, 'Tæl fra den hele time og frem til klokkeslættet.', 'min', 'plus');
  }

  // ================================================================ KAPITEL 2: UDFLUGTEN
  // 1. HUSK: bussen
  function uHusk(t) {
    var qs = [], ab, target;
    qs.push(turTid(t, 'buschauffoer', 'Bussen kører', 'vi er fremme'));
    if (!t.gange) {
      ab = plusPar(t, 0.9);
      qs.push(write('buschauffoer', 'Der sidder ' + ab[0] + ' elever nede i bussen og ' + ab[1] + ' oppe. Hvor mange er der i alt?', ab[0] + ab[1], 'Læg de to tal sammen.', 'elever', 'plus'));
    } else {
      var rk = choice([3, 4, 5]), pr = prGruppe(t, rk, 2, 6);
      qs.push(write('buschauffoer', 'Der er ' + rk + ' rækker med ' + pr + ' sæder i hver. Hvor mange sæder er der i alt?', rk * pr, rk + ' rækker med ' + pr + ' i hver: ' + rk + ' gange ' + pr + '.', 'sæder', 'gange'));
    }
    if (t.gange) { ab = gangPar(t, Math.min(t.klasse <= 3 ? 30 : 60, regneloft(t) - 6)); target = ab[0] * ab[1]; }
    else target = r(8, Math.min(14, t.sum - 6));
    qs.push(findall('poulsen', 'Billetterne til dyrene har regnestykker på bagsiden. Hvilke af dem giver ' + target + '?', target, 'Regn dem ud én ad gangen, og vælg dem, der passer.', t));
    var pladser = antal(t), fyldt = r(fd(pladser, 2), pladser - 3);
    qs.push(write('buschauffoer', 'Bussen har plads til ' + pladser + ', og ' + fyldt + ' sidder allerede i den. Hvor mange pladser er der tilbage?', pladser - fyldt, 'Træk dem, der sidder, fra pladserne.', 'pladser', 'plus'));
    qs.push(raekke(t, 'buschauffoer', 'Kilometerstenene langs vejen står med lige store spring. Hvilket tal mangler?', 'Find ud af, hvor meget tallene stiger hver gang.'));
    return qs;
  }

  // 2. FORSTÅ: billetlugen
  function uForstaa(t) {
    var qs = [], pris, n, pa;
    if (!t.gange) {
      pris = choice([4, 5, 6, 8]);
      qs.push(write('billet', 'En billet koster ' + pris + ' kr. Hvad koster to billetter?', pris * 2, 'To billetter er det dobbelte: ' + pris + ' + ' + pris + '.', 'kr', 'plus'));
    } else {
      pa = gangPar(t, t.kr); pris = Math.max(pa[0], pa[1]); n = Math.max(2, Math.min(pa[0], pa[1]));
      qs.push(write('billet', 'Billetten koster ' + pris + ' kr, og vi er ' + n + ' elever. Hvad koster det for os alle?', pris * n, pris + ' kr gange ' + n + ' elever.', 'kr', 'gange'));
    }
    if (!t.gange) {
      var tre = choice([3, 4]), p3 = choice([2, 3, 4]);
      qs.push(choose('billet', 'Vi skal bruge ' + tre + ' billetter til ' + p3 + ' kr. Hvad skal jeg regne ud?', ['Lægge priserne sammen: ' + Array(tre).fill(p3).join(' + '), 'Trække ' + p3 + ' fra ' + tre, 'Lægge ' + p3 + ' og ' + tre + ' sammen'], 0, 'Hver billet koster det samme. Læg priserne sammen.', 'plus'));
    } else {
      var el = choice([10, 12, 15]), bp = choice([5, 6, 8]);
      qs.push(choose('billet', 'Vi er ' + el + ' elever, og en billet koster ' + bp + ' kr. Hvad skal jeg regne ud?', ['Lægge ' + el + ' og ' + bp + ' sammen', 'Gange ' + el + ' med ' + bp, 'Trække ' + bp + ' fra ' + el], 1, 'Mange ens billetter: gange antallet med prisen.', 'gange'));
    }
    var voksen = choice([6, 8, 10, 12, 16, 20]);
    if (t.klasse >= 3) voksen = choice([20, 30, 40, 50, 60, 80, 100].filter(function (p) { return p <= t.kr; }));
    qs.push(write('billet', 'En voksenbillet koster ' + voksen + ' kr, og børn betaler halv pris. Hvad koster en børnebillet?', voksen / 2, 'Halv pris betyder halvdelen af ' + voksen + '.', 'kr', 'halve'));
    var klasse, del;
    if (t.broek) {
      del = choice([3, 4]); klasse = del === 3 ? choice([12, 18, 24]) : choice([12, 16, 20, 24]);
      var navn = del === 3 ? 'tredjedele' : 'fjerdedele';
      qs.push(write('poulsen', 'Klassen er ' + klasse + ' elever, og ' + (del === 3 ? 'to' : 'tre') + ' ' + navn + ' går ind til aberne først. Hvor mange elever er det?', klasse / del * (del - 1), 'Find først én ' + (del === 3 ? 'tredjedel' : 'fjerdedel') + ': ' + klasse + ' delt med ' + del + '.', 'elever', 'halve'));
    } else if (t.fjerdedele) {
      klasse = choice([12, 16, 20, 24]);
      qs.push(write('poulsen', 'Klassen er ' + klasse + ' elever, og en fjerdedel går ind til aberne først. Hvor mange elever er det?', klasse / 4, 'En fjerdedel er delt i 4 lige store dele.', 'elever', 'halve'));
    } else {
      klasse = choice([10, 12, 14, 16]);
      qs.push(write('poulsen', 'Klassen er ' + klasse + ' elever, og halvdelen går ind til aberne først. Hvor mange elever er det?', klasse / 2, 'Halvdelen er to lige store bunker.', 'elever', 'halve'));
    }
    var hver = beloeb(t, 0.15, 60), ant = Math.max(2, Math.min(4, fd(t.del_top || 4, Math.max(1, hver))));
    if (t.division) qs.push(write('billet', 'Vi er ' + ant + ' venner, der deler en regning på ' + (hver * ant) + ' kr. Hvor meget skal hver give?', hver, 'Del ' + (hver * ant) + ' med ' + ant + '.', 'kr', 'division'));
    else qs.push(write('billet', 'To venner deler en regning på ' + (hver * 2) + ' kr. Hvor meget skal hver give?', hver, 'Halvdelen af beløbet til hver.', 'kr', 'halve'));
    var rigtigt = Math.random() < 0.5;
    if (t.gange) { pa = gangPar(t, Math.min(100, regneloft(t))); qs.push(truefalse('billet', 'Billetsælgeren har regnet billetterne sammen. Passer det?', pa[0] + ' x ' + pa[1] + ' = ' + vistTal(rigtigt, pa[0] * pa[1], [-2, -1, 1, 2]), rigtigt, 'Regn ' + pa[0] + ' gange ' + pa[1] + ' selv.')); }
    else { pa = [r(4, 9), r(3, 9)]; qs.push(truefalse('billet', 'Billetsælgeren har regnet billetterne sammen. Passer det?', pa[0] + ' + ' + pa[1] + ' = ' + vistTal(rigtigt, pa[0] + pa[1], [-2, -1, 1, 2]), rigtigt, 'Læg ' + pa[0] + ' og ' + pa[1] + ' sammen selv.')); }
    return qs;
  }

  // 3. ANVEND: kiosken ved vandet
  function uAnvend(t) {
    var qs = [], pris, n, pa, total;
    if (!t.gange) {
      pris = choice([3, 4, 5, 6]);
      qs.push(write('kioskdame', 'En is koster ' + pris + ' kr, og vi køber to. Hvad bliver det?', pris * 2, 'To is er det dobbelte: ' + pris + ' + ' + pris + '.', 'kr', 'plus'));
      total = pris * 2;
    } else {
      pa = gangPar(t, t.kr); pris = Math.max(pa[0], pa[1]); n = Math.max(2, Math.min(pa[0], pa[1]));
      qs.push(write('kioskdame', 'Vandflasker koster ' + pris + ' kr stykket, og klassen køber ' + n + '. Hvad bliver det?', pris * n, pris + ' kr gange ' + n + ' flasker.', 'kr', 'gange'));
      total = pris * n;
    }
    var op = beloeb(t, 0.25, 100);
    qs.push(coins('kioskdame', 'Pandekagen koster ' + op + ' kr, og jeg vil helst have pengene præcist. Vil du lægge dem op?', op, 'Start med de store mønter, og fyld op med de små.'));
    var sedler = t.klasse === 1 ? [20, 50] : [50, 100, 200, 500, 1000], seddel = null;
    for (var i = 0; i < sedler.length; i++) if (sedler[i] > total) { seddel = sedler[i]; break; }
    if (seddel == null) seddel = (fd(total, 50) + 1) * 50;
    qs.push(write('kioskdame', 'Du betaler med ' + seddel + ' kr, og varerne koster ' + total + ' kr. Hvor meget får du tilbage?', seddel - total, 'Byttepenge = det, du giver, minus prisen.', 'kr', 'penge'));
    if (t.procent) {
      var fuld = choice([200, 300, 400, 500]), pct = choice([10, 20, 25, 50]);
      qs.push(write('kioskdame', 'Skoleklasser får ' + pct + ' procent rabat på en kasse til ' + fuld + ' kr. Hvor mange kroner sparer klassen?', fd(fuld * pct, 100), pct + ' procent er ' + pct + ' ud af 100. Find først 1 procent: ' + fuld + ' delt med 100.', 'kr', 'penge'));
    } else if (t.decimal) {
      var kgp = choice([12.5, 14.5, 22.5]), kg = choice([2, 4]);
      qs.push(write('kioskdame', 'Dyrefoder koster ' + kr(kgp) + ' kr pr. pose, og vi køber ' + kg + ' poser. Hvad koster det?', kgp * kg, 'Gang prisen med antal poser — også ørerne.', 'kr', 'gange'));
    } else if (t.gange) {
      var kg2 = choice([2, 3]), mulige = [10, 12, 15, 20, 24, 30].filter(function (p) { return p * kg2 <= t.gange_top; });
      var pp = choice(mulige.length ? mulige : [10]);
      qs.push(write('kioskdame', 'Dyrefoder koster ' + pp + ' kr pr. pose, og vi køber ' + kg2 + ' poser. Hvad koster det?', pp * kg2, 'Gang prisen med antal poser.', 'kr', 'gange'));
    } else {
      var haves = r(12, 20), koster = r(4, 11);
      qs.push(write('kioskdame', 'Du har ' + haves + ' kr, og en saftevand koster ' + koster + ' kr. Hvor meget har du tilbage?', haves - koster, 'Træk prisen fra det, du har.', 'kr', 'penge'));
    }
    if (t.gange) {
      var pk = t.tabeller.indexOf(3) >= 0 ? 3 : 2, stk = choice([6, 8, 9]), tilbud = stk * pk - choice([3, 4, 5]);
      qs.push(choose('kioskdame', 'Kiks koster ' + stk + ' kr stykket, men der er tilbud: ' + pk + ' for ' + tilbud + ' kr. Hvad er billigst, hvis vi skal have ' + pk + '?',
        [pk + ' stykker enkeltvis', 'Tilbuddet: ' + pk + ' for ' + tilbud + ' kr', 'Det koster det samme'], 1, 'Regn ' + stk + ' gange ' + pk + ', og sammenlign med ' + tilbud + '.', 'penge'));
    } else {
      var ab = choice([[7, 9], [6, 8], [9, 12]]);
      qs.push(choose('kioskdame', 'Den lille is koster ' + ab[0] + ' kr, og den store koster ' + ab[1] + ' kr. Hvor meget dyrere er den store?', [(ab[1] - ab[0]) + ' kr', ab[0] + ' kr', (ab[0] + ab[1]) + ' kr'], 0, 'Træk ' + ab[0] + ' fra ' + ab[1] + '.', 'penge'));
    }
    return qs;
  }

  // 4. ANALYSÉR: dyrene
  function uAnalyser(t) {
    var qs = [], d, f;
    qs.push(raekke(t, 'passer', 'Pingvinerne fodres med lige store spring i mængden. Hvilket tal mangler i rækken?', 'Find ud af, hvor meget der lægges til hver gang.', [3, 4]));
    if (t.gange) {
      f = choice([3, 4, 5, 6]); d = prGruppe(t, f, 2, 7);
      qs.push(write('passer', 'Pingvinerne får ' + f + ' kg fisk hver dag. Hvor mange kg får de på ' + d + ' dage?', f * d, f + ' kg gange ' + d + ' dage.', 'kg', 'gange'));
      var dage = choice([4, 5, 6]), pr = prGruppe(t, dage, 2, 8);
      qs.push(balance('passer', 'Aberne har fået ' + (dage * pr) + ' bananer på ' + dage + ' dage. Hvor mange får de pr. dag?', dage, 'x', pr, 'Del ' + (dage * pr) + ' med ' + dage + '.', 'division'));
    } else {
      f = r(3, 5); d = r(3, 4);
      var led = []; for (var i = 0; i < d; i++) led.push(f);
      qs.push(write('passer', 'Pingvinerne får ' + f + ' kg fisk hver dag. Hvor mange kg får de på ' + d + ' dage?', f * d, 'Læg ' + f + ' sammen for hver dag: ' + led.join(' + ') + '.', 'kg', 'plus'));
      var bm = r(12, 18), spist = r(3, 6);
      qs.push(write('passer', 'Aberne har ' + bm + ' bananer, og de spiser ' + spist + '. Hvor mange er der tilbage?', bm - spist, 'Træk de spiste fra.', 'stk', 'plus'));
    }
    var target = t.gange ? (t.klasse <= 3 ? choice([12, 16, 18, 20, 24]) : choice([24, 30, 36, 42])) : choice([10, 12, 14, 16]);
    qs.push(findall('passer', 'Dyrepasseren har skrevet foder-regnestykker på tavlen. Find alle dem, der giver ' + target + '.', target, 'Regn hvert stykke ud, og sammenlign med tallet.', t));
    if (t.areal) {
      var l = r(8, 14), b = r(3, 6);
      qs.push(write('passer', 'Elefantengen er ' + l + ' m lang og ' + b + ' m bred. Hvor stort er arealet?', l * b, 'Areal: længden gange bredden.', 'm²', 'areal'));
    } else if (t.negative) {
      var m1 = -r(2, 9), st = r(5, 14);
      qs.push(write('passer', 'I pingvinhuset var der ' + m1 + ' grader i nat, og nu er det steget ' + st + ' grader. Hvor mange grader er der nu?', m1 + st, 'Tæl op ad tallinjen fra minus og forbi nul.', 'grader', 'plus'));
    } else {
      var stolper = r(4, 8), pr2 = t.gange ? prGruppe(t, stolper, 3, 6) : r(2, 3);
      if (t.gange) qs.push(write('passer', 'Hegnet har ' + stolper + ' sider med ' + pr2 + ' stolper på hver. Hvor mange stolper er der i alt?', stolper * pr2, stolper + ' gange ' + pr2 + '.', 'stk', 'gange'));
      else qs.push(write('passer', 'Hegnet har ' + (stolper + 2) + ' stolper på den ene side og ' + stolper + ' på den anden. Hvor mange er der i alt?', stolper * 2 + 2, 'Læg de to sider sammen.', 'stk', 'plus'));
    }
    var dyr = r(6, 12), tilfoej = r(3, 6);
    qs.push(write('passer', 'Der var ' + dyr + ' geder i folden, og der kommer ' + tilfoej + ' nye. Hvor mange er der så?', dyr + tilfoej, 'Læg de nye til dem, der er der.', 'stk', 'plus'));
    return qs;
  }

  // 5. VURDÉR: dyrepasserens regnskab
  function uVurder(t) {
    var qs = [], ab, rigtigt;
    if (t.gange) { ab = gangPar(t, Math.min(100, regneloft(t))); rigtigt = Math.random() < 0.5; qs.push(truefalse('passer', 'Jeg har regnet foderet sammen i går. Passer det?', ab[0] + ' x ' + ab[1] + ' = ' + vistTal(rigtigt, ab[0] * ab[1]), rigtigt, 'Regn ' + ab[0] + ' gange ' + ab[1] + ' selv, og sammenlign.')); }
    else { ab = [r(5, 9), r(4, 9)]; rigtigt = Math.random() < 0.5; qs.push(truefalse('passer', 'Jeg har regnet foderet sammen i går. Passer det?', ab[0] + ' + ' + ab[1] + ' = ' + vistTal(rigtigt, ab[0] + ab[1]), rigtigt, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen selv.')); }
    var x = Math.max(8, tal(t, 0.6)), y = r(2, Math.min(19, x - 2));
    qs.push(write('passer', 'Og her har jeg skrevet ' + x + ' - ' + y + ' = ' + ((x - y) + choice([-2, -1, 1, 2])) + '. Det ser forkert ud. Hvad skal der stå?', x - y, 'Regn det selv, og sammenlign med det, der står.', '', 'tjek'));
    if (t.gennemsnit && Math.random() < 0.5) {
      var dage = [r(20, 60), r(20, 60), r(20, 60), r(20, 60)];
      while ((dage[0] + dage[1] + dage[2] + dage[3]) % 4 !== 0) dage[0]++;
      qs.push(write('sofie', 'Dyreparken talte gæster fire dage i træk: ' + dage.join(', ') + '. Hvad er gennemsnittet pr. dag?', (dage[0] + dage[1] + dage[2] + dage[3]) / 4, 'Læg dem sammen, og del med, hvor mange dage der er.', 'gæster', 'tjek'));
    } else if (t.division) {
      var pa = choice([12, 16]), pb = pyround(pa / 4 * 6) + choice([-3, -2, 2, 3]);
      qs.push(choose('sofie', 'I butikken: 4 plakater for ' + pa + ' kr, eller 6 plakater for ' + pb + ' kr. Hvor er prisen pr. plakat lavest?', ['4 for ' + pa + ' kr', '6 for ' + pb + ' kr', 'De er lige gode'], pa / 4 < pb / 6 ? 0 : 1, 'Regn ud, hvad ÉN plakat koster hvert sted.', 'penge'));
    } else {
      ab = choice([[6, 9], [7, 10], [5, 8]]);
      qs.push(choose('sofie', 'Et kort koster ' + ab[0] + ' kr, og et andet koster ' + ab[1] + ' kr. Hvor meget koster de to tilsammen?', [(ab[0] + ab[1]) + ' kr', (ab[1] - ab[0]) + ' kr', (ab[0] + ab[1] + 2) + ' kr'], 0, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen.', 'penge'));
    }
    var st = t.klasse <= 3 ? choice([8, 12]) : choice([12, 16, 24]), folk = t.division ? choice([2, 4]) : 2;
    var rg2 = Math.random() < 0.5, v2 = vistTal(rg2, st / folk, [-1, 1, 2]);
    qs.push(truefalse('oskar', 'Vi har ' + st + ' sandwich i madkurven, og vi er ' + folk + '. Oskar siger, at vi får ' + v2 + ' hver. Passer det?',
      t.division ? st + ' : ' + folk + ' = ' + v2 : 'Halvdelen af ' + st + ' er ' + v2, rg2, t.division ? 'Del ' + st + ' ligeligt mellem ' + folk + ', og se efter.' : 'Læg ' + st + ' i to lige store bunker, og tæl den ene.'));
    var tg = t.gange ? (t.klasse <= 3 ? choice([14, 18, 21, 27]) : choice([27, 32, 36, 45])) : choice([11, 13, 15, 17]);
    qs.push(findall('sofie', 'Vi laver en quiz om dyrene. Find alle de regnestykker, der giver ' + tg + ' — så bruger vi dem.', tg, 'Tjek hvert stykke grundigt, også dem, der ligner.', t));
    return qs;
  }

  // 6. SKAB: fremlæggelsen i bussen på vej hjem
  function uBoss(t) {
    var qs = [], total;
    if (t.gange) {
      var elever = t.klasse <= 3 ? choice([10, 20]) : choice([20, 24, 25]), loft = Math.max(2, fd(t.gange_top, elever));
      var pris = Math.max.apply(null, [2, 5, 10, 20, 25, 35, 45, 60].filter(function (p) { return p <= loft; }));
      qs.push(write('poulsen', 'Hver elev har lagt ' + pris + ' kr i klassekassen, og vi er ' + elever + ' i klassen. Hvor mange kroner har vi til udflugter?', pris * elever, pris + ' kr gange ' + elever + ' elever.', 'kr', 'gange'));
      total = pris * elever;
    } else {
      var laagt = r(6, 14), mangler = r(2, 5);
      qs.push(write('poulsen', 'Der ligger ' + laagt + ' kr i klassekassen, og vi mangler ' + mangler + ' kr til næste udflugt. Hvor mange kroner skal der være i alt?', laagt + mangler, 'Læg det, der mangler, til det, I har.', 'kr', 'plus'));
      total = laagt + mangler;
    }
    var bus = total >= 50 ? pyround(total * 0.4 / 10) * 10 : fd(total, 2);
    qs.push(write('poulsen', 'Bussen i dag kostede ' + bus + ' kr af de ' + total + ' kr. Hvor meget er der tilbage til næste gang?', total - bus, 'Træk busprisen fra det samlede beløb.', 'kr', 'penge'));
    if (t.division) {
      var grupper = choice([3, 4]), prG = prGruppe(t, grupper, 5, 8);
      qs.push(balance('poulsen', 'Vi har ' + (grupper * prG) + ' dyrekort, som skal deles ligeligt mellem ' + grupper + ' grupper. Hvor mange kort til hver gruppe?', grupper, 'x', prG, 'Del ' + (grupper * prG) + ' med ' + grupper + '.', 'division'));
    } else {
      var kort = choice([16, 18, 20]), brugt = r(4, 9);
      qs.push(write('poulsen', 'Vi har ' + kort + ' dyrekort, og ' + brugt + ' af dem er brugt. Hvor mange er der tilbage?', kort - brugt, 'Træk de brugte fra.', 'stk', 'plus'));
    }
    var ab, rg, vist;
    if (t.ligning) { var x = r(4, 12), a = H.fak(t, 3, 9); qs.push(write('poulsen', 'På tavlen i bussen står: ' + a + ' · x = ' + (a * x) + '. Hvad er x?', x, 'Hvad skal ' + a + ' ganges med for at give ' + (a * x) + '?', '', 'raekkefolge')); }
    else if (t.gange) { ab = gangPar(t, Math.min(100, regneloft(t))); rg = Math.random() < 0.5; vist = vistTal(rg, ab[0] * ab[1], [-3, 3]); qs.push(truefalse('poulsen', 'Hr. Poulsen har skrevet noget på tavlen i bussen. Holder det?', ab[0] + ' x ' + ab[1] + ' = ' + vist, rg, 'Regn ' + ab[0] + ' gange ' + ab[1] + ' omhyggeligt.')); }
    else { ab = [r(6, 12), r(4, 8)]; rg = Math.random() < 0.5; vist = vistTal(rg, ab[0] + ab[1], [-2, 2]); qs.push(truefalse('poulsen', 'Hr. Poulsen har skrevet noget på tavlen i bussen. Holder det?', ab[0] + ' + ' + ab[1] + ' = ' + vist, rg, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen omhyggeligt.')); }
    for (var n = 0; n < 2; n++) {
      var p = makeCreative(t), hj = t.hierarki ? 'Husk: gange og dividere regnes før plus og minus.' : 'Prøv dig frem — regn fra venstre mod højre.';
      qs.push(build('poulsen', (n === 0 ? 'Og så en, du selv skal bygge til dyrene. ' : 'Og en sidste. ') + 'Byg et regnestykke, der giver ' + p.target + ', med tallene ' + p.numbers.join(', ') + ' — hvert tal én gang — og ' +
        (p.min_ops < 2 ? 'mindst én regneart.' : 'mindst ' + p.min_ops + ' forskellige regnearter.'), p, hj));
    }
    return qs;
  }

  // Ekstramissioner i kapitel 2: aberne og souvenirbutikken
  function sqAber(t) {
    var b = choice([12, 16, 20]), pr = t.division ? choice([2, 4]) : 2, rg = Math.random() < 0.5, nv = t.fjerdedele ? 4 : 2;
    return [
      write('passer', 'Jeg har ' + b + ' bananer til aberne, og der er ' + pr + ' aber. Hvor mange får de hver, hvis jeg deler lige?', b / pr, pr > 2 ? 'Del ' + b + ' med ' + pr + '.' : 'Halvdelen til hver.', 'stk', pr > 2 ? 'division' : 'halve'),
      write('passer', 'Hvis jeg giver halvdelen af mine ' + b + ' bananer til den ældste abe, hvor mange har jeg så tilbage?', b / 2, t.division ? 'Halvdelen betyder delt med 2.' : 'Halvdelen er lige så mange i to bunker.', 'stk', 'halve'),
      truefalse('passer', 'Min kollega siger, det her passer. Gør det?', t.division ? b + ' : ' + nv + ' = ' + vistTal(rg, b / nv, [1]) : 'Halvdelen af ' + b + ' er ' + vistTal(rg, b / nv, [1]), rg, 'Regn det selv, og se efter.')
    ];
  }
  function sqSouvenir(t) {
    var p = beloeb(t, 0.15, 60), n = Math.max(2, Math.min(4, fd(t.del_top || 4, Math.max(1, p))));
    var anden = t.division ? write('kioskdame', 'Og hvis ' + n + ' venner deler en regning på ' + (p * n) + ' kr — hvor meget skal hver give?', p, 'Del ' + (p * n) + ' med ' + n + '.', 'kr', 'division')
                           : write('kioskdame', 'Og hvis to venner deler en regning på ' + (p * 2) + ' kr — hvor meget skal hver give?', p, 'Halvdelen af beløbet til hver.', 'kr', 'halve');
    var loft = regneloft(t), stk = t.gange ? choice([4, 6, 7].filter(function (s) { return s * 3 <= loft; }).concat([3])) : choice([4, 5, 6].filter(function (s) { return s * 3 <= loft; }).concat([3]));
    return [
      coins('kioskdame', 'Plakaten koster ' + p + ' kr. Har du lige pengene? Jeg har ingen byttepenge i dag.', p, 'Tag de store mønter først, og fyld op med de små.'),
      anden,
      findall('kioskdame', 'Jeg skal have prismærker på. Hvilke af dem giver ' + (stk * 3) + '?', stk * 3, 'Regn hvert stykke ud, ét ad gangen.', t)
    ];
  }

  // ================================================================ KAPITEL 3: LØRDAGSMARKEDET
  // 1. HUSK: torvet åbner
  function mHusk(t) {
    var qs = [], ab, target;
    var aaben = choice([8, 9]);
    if (t.klokke === 'hel') qs.push(write('far', 'Markedet åbner klokken ' + aaben + ', og vi kommer en time før. Hvad er klokken, når vi kommer?', aaben - 1, 'En time før er ét tal tilbage.', '', 'plus'));
    else {
      var mm = t.klokke === 'kvarter' ? choice([15, 30, 45]) : choice([10, 20, 25, 35, 40]);
      qs.push(write('far', 'Markedet åbner klokken ' + (aaben + 1) + ':00, og vi kommer ' + mm + ' minutter før. Hvor mange minutter over ' + aaben + ' er klokken, når vi kommer?', 60 - mm, 'Fra ' + aaben + ':00 og frem til ' + (aaben + 1) + ':00 er der 60 minutter. Træk ' + mm + ' fra.', 'min', 'plus'));
    }
    ab = plusPar(t, 0.9);
    qs.push(write('ida', 'Jeg har ' + ab[0] + ' kr i lommen, og Mor giver mig ' + ab[1] + ' kr mere til markedet. Hvor mange har jeg så?', ab[0] + ab[1], 'Læg de to beløb sammen.', 'kr', 'plus'));
    if (t.gange) { ab = gangPar(t, Math.min(t.klasse <= 3 ? 30 : 60, regneloft(t) - 6)); target = ab[0] * ab[1]; }
    else target = r(8, Math.min(14, t.sum - 6));
    qs.push(findall('ida', 'Der hænger regnestykker på alle bodernes skilte. Hvilke af dem giver ' + target + '?', target, 'Regn dem ud én ad gangen, og vælg dem, der passer.', t));
    var boder = antal(t), aabnede = r(fd(boder, 2), boder - 3);
    qs.push(write('far', 'Der er ' + boder + ' boder på torvet, og ' + aabnede + ' er åbnet. Hvor mange mangler at åbne?', boder - aabnede, 'Træk de åbne fra det samlede antal.', 'boder', 'plus'));
    qs.push(raekke(t, 'far', 'Bodnumrene står i en fast rækkefølge. Hvilket nummer mangler?', 'Se, hvor meget numrene stiger hver gang.'));
    return qs;
  }

  // 2. FORSTÅ: bageren
  function mForstaa(t) {
    var qs = [];
    var boller = t.klasse <= 3 ? choice([6, 8, 10]) : choice([12, 16, 20]);
    if (!t.gange) qs.push(write('bager', 'Opskriften giver ' + boller + ' boller. Vi vil lave dobbelt så mange. Hvor mange bliver det?', boller * 2, 'Dobbelt så mange er det samme lagt til én gang til.', 'stk', 'plus'));
    else qs.push(write('bager', 'Opskriften giver ' + boller + ' boller. Vi vil lave 3 gange så mange. Hvor mange bliver det?', boller * 3, 'Tre gange så mange er ' + boller + ' gange 3.', 'stk', 'gange'));
    var plader = choice([2, 3, 4]), pr;
    if (t.gange) { pr = prGruppe(t, plader, 3, 8); qs.push(balance('bager', 'Der er bagt ' + (plader * pr) + ' boller på ' + plader + ' plader. Hvor mange lå der på hver plade?', plader, 'x', pr, 'Del ' + (plader * pr) + ' med ' + plader + '.', 'division')); }
    else { var pl = r(4, 9), bd = r(3, 8); qs.push(write('bager', 'Der ligger ' + pl + ' boller på pladen og ' + bd + ' i kurven. Hvor mange er der i alt?', pl + bd, 'Læg de to tal sammen.', 'stk', 'plus')); }
    var dl = choice([4, 6, 8, 10, 12]);
    if (t.fjerdedele && dl % 4 === 0 && Math.random() < 0.5) qs.push(write('bager', 'Opskriften siger ' + dl + ' dl mælk, men jeg laver kun en fjerdedel. Hvor mange dl skal jeg bruge?', dl / 4, 'En fjerdedel er delt i 4 lige store dele.', 'dl', 'halve'));
    else qs.push(write('bager', 'Opskriften siger ' + dl + ' dl mælk, men jeg laver kun den halve portion. Hvor mange dl skal jeg bruge?', dl / 2, 'Den halve portion er halvdelen.', 'dl', 'halve'));
    var vg, del;
    if (t.broek) { del = choice([3, 4]); vg = del === 3 ? choice([12, 18, 24]) : choice([12, 16, 20, 24]);
      qs.push(write('ida', 'Der er ' + vg + ' kanelsnegle, og jeg får ' + (del === 3 ? 'to tredjedele' : 'tre fjerdedele') + ' af dem. Hvor mange er det?', vg / del * (del - 1), 'Find først én ' + (del === 3 ? 'tredjedel' : 'fjerdedel') + ': ' + vg + ' delt med ' + del + '.', 'stk', 'halve')); }
    else { vg = t.klasse >= 2 ? choice([12, 16, 20, 24]) : choice([6, 8, 10, 12]); qs.push(write('ida', 'Vi deler kanelsneglene lige over! Der er ' + vg + '. Hvor mange får jeg?', vg / 2, 'Lige over betyder to lige store bunker.', 'stk', 'halve')); }
    var min = choice([12, 15, 18]);
    qs.push(choose('bager', 'Bollerne skal bage i ' + min + ' minutter, og de har været i ovnen i ' + (min - 5) + ' minutter. Hvad passer?', ['De er færdige nu', 'De skal have 5 minutter mere', 'De skal have ' + min + ' minutter mere', 'De skal have ' + (min + 5) + ' minutter mere'], 1, 'Hvor meget mangler der, før tiden er gået?', 'plus'));
    return qs;
  }

  // 3. ANVEND: frugt og grønt
  function mAnvend(t) {
    var qs = [], pris, n, pa, total;
    if (!t.gange) { pris = choice([4, 5, 6, 8]); qs.push(write('frugtmand', 'En pose æbler koster ' + pris + ' kr, og vi tager to. Hvad bliver det?', pris * 2, 'To poser er det dobbelte: ' + pris + ' + ' + pris + '.', 'kr', 'plus')); total = pris * 2; }
    else { pa = gangPar(t, t.kr); pris = Math.max(pa[0], pa[1]); n = Math.max(2, Math.min(pa[0], pa[1])); qs.push(write('frugtmand', 'Pærerne koster ' + pris + ' kr for en pose, og vi tager ' + n + ' poser. Hvad bliver det?', pris * n, pris + ' kr gange ' + n + ' poser.', 'kr', 'gange')); total = pris * n; }
    var op = beloeb(t, 0.25, 100);
    qs.push(coins('frugtmand', 'Meloner koster ' + op + ' kr, og jeg vil helst have det præcist. Vil du lægge pengene op?', op, 'Start med de store mønter, og fyld op med de små.'));
    var sedler = t.klasse === 1 ? [20, 50] : [50, 100, 200, 500, 1000], seddel = null;
    for (var i = 0; i < sedler.length; i++) if (sedler[i] > total) { seddel = sedler[i]; break; }
    if (seddel == null) seddel = (fd(total, 50) + 1) * 50;
    qs.push(write('frugtmand', 'Far betaler med ' + seddel + ' kr, og varerne koster ' + total + ' kr. Hvor meget får han tilbage?', seddel - total, 'Byttepenge = det, man giver, minus prisen.', 'kr', 'penge'));
    if (t.procent) { var fuld = choice([200, 240, 300, 400, 500]), pct = choice([10, 25, 50]); qs.push(write('frugtmand', 'En kasse jordbær koster ' + fuld + ' kr, men i dag er der ' + pct + ' procent rabat. Hvor mange kroner sparer vi?', fd(fuld * pct, 100), pct + ' procent er ' + pct + ' ud af 100. Find først 1 procent: ' + fuld + ' delt med 100.', 'kr', 'penge')); }
    else if (t.decimal) { var kp = choice([12.5, 14.5, 22.5]), kg = choice([2, 4]); qs.push(write('frugtmand', 'Kartoflerne koster ' + kr(kp) + ' kr pr. kilo, og vi køber ' + kg + ' kilo. Hvad koster det?', kp * kg, 'Gang kiloprisen med antal kilo — også ørerne.', 'kr', 'gange')); }
    else if (t.gange) { var kg3 = choice([2, 3]), m = [10, 12, 15, 20, 24, 30].filter(function (p) { return p * kg3 <= t.gange_top; }); var kp3 = choice(m.length ? m : [10]); qs.push(write('frugtmand', 'Gulerødder koster ' + kp3 + ' kr pr. kilo, og vi køber ' + kg3 + ' kilo. Hvad koster det?', kp3 * kg3, 'Gang kiloprisen med antal kilo.', 'kr', 'gange')); }
    else { var hv = r(12, 20), ko = r(4, 11); qs.push(write('frugtmand', 'Du har ' + hv + ' kr, og en banan-pose koster ' + ko + ' kr. Hvor meget har du tilbage?', hv - ko, 'Træk prisen fra det, du har.', 'kr', 'penge')); }
    if (t.gange) { var pk = t.tabeller.indexOf(3) >= 0 ? 3 : 2, sp = choice([6, 8, 9]), tb = sp * pk - choice([3, 4, 5]);
      qs.push(choose('frugtmand', 'Appelsiner koster ' + sp + ' kr stykket, men der er tilbud: ' + pk + ' for ' + tb + ' kr. Hvad er billigst, hvis vi skal have ' + pk + '?', [pk + ' stykker enkeltvis', 'Tilbuddet: ' + pk + ' for ' + tb + ' kr', 'Det koster det samme'], 1, 'Regn ' + sp + ' gange ' + pk + ', og sammenlign med ' + tb + '.', 'penge')); }
    else { var ab = choice([[7, 9], [6, 8], [9, 12]]); qs.push(choose('frugtmand', 'Den lille kasse koster ' + ab[0] + ' kr, og den store koster ' + ab[1] + ' kr. Hvor meget dyrere er den store?', [(ab[1] - ab[0]) + ' kr', ab[0] + ' kr', (ab[0] + ab[1]) + ' kr'], 0, 'Træk ' + ab[0] + ' fra ' + ab[1] + '.', 'penge')); }
    return qs;
  }

  // 4. ANALYSÉR: loppemarkedet
  function mAnalyser(t) {
    var qs = [], pr;
    qs.push(raekke(t, 'loppe', 'Prismærkerne på bogbordet stiger med lige store spring. Hvilket tal mangler?', 'Find ud af, hvor meget prisen stiger hver gang.', [3, 4]));
    if (t.gange) { var raekker = choice([3, 4, 5, 6]); pr = prGruppe(t, raekker, 3, 8); qs.push(write('loppe', 'På bordet står ' + raekker + ' rækker med ' + pr + ' bøger i hver. Hvor mange bøger er der?', raekker * pr, raekker + ' gange ' + pr + '.', 'stk', 'gange'));
      qs.push(write('loppe', 'Hvis en hel række bliver solgt, hvor mange bøger er der så tilbage på bordet? (' + raekker + ' rækker med ' + pr + ' i hver)', raekker * pr - pr, 'Regn alle bøgerne ud, og træk én række fra.', 'stk', 'gange')); }
    else { var bg = r(12, 18), solgt = r(3, 6); qs.push(write('loppe', 'Der står ' + bg + ' bøger på bordet, og ' + solgt + ' bliver solgt. Hvor mange er der så?', bg - solgt, 'Træk de solgte fra.', 'stk', 'plus'));
      var bam = r(5, 9), nyeB = r(2, 4);
      qs.push(write('loppe', 'På bordet ligger ' + bam + ' bamser, og der kommer ' + nyeB + ' nye til. Hvor mange bamser er der så?', bam + nyeB, 'Læg de nye til dem, der var der.', 'stk', 'plus')); }
    var target = t.gange ? (t.klasse <= 3 ? choice([12, 16, 18, 20, 24]) : choice([24, 30, 36, 42])) : choice([10, 12, 14, 16]);
    qs.push(findall('loppe', 'Der står regnestykker på alle prismærkerne. Find alle dem, der giver ' + target + '.', target, 'Regn hvert stykke ud, og sammenlign med tallet.', t));
    if (t.areal) { var l = r(4, 9), b = r(2, 5); qs.push(write('loppe', 'Boden er ' + l + ' m lang og ' + b + ' m bred. Hvor stort er gulvarealet?', l * b, 'Areal: længden gange bredden.', 'm²', 'areal')); }
    else if (t.negative) { var m1 = -r(2, 9), st = r(5, 14); qs.push(write('loppe', 'Det var ' + m1 + ' grader, da vi stillede op, og nu er det steget ' + st + ' grader. Hvor mange grader er der nu?', m1 + st, 'Tæl op ad tallinjen fra minus og forbi nul.', 'grader', 'plus')); }
    else { var vase = r(6, 9), kop = r(3, 5); qs.push(write('loppe', 'En vase koster ' + vase + ' kr, og en kop koster ' + kop + ' kr. Hvad koster de tilsammen?', vase + kop, 'Læg de to priser sammen.', 'kr', 'plus')); }
    return qs;
  }

  // 5. VURDÉR: tilbuddene
  function mVurder(t) {
    var qs = [], ab, rigtigt;
    if (t.gange) { ab = gangPar(t, Math.min(100, regneloft(t))); rigtigt = Math.random() < 0.5; qs.push(truefalse('ida', 'Jeg har regnet prisen på tre ens poser ud. Passer det?', ab[0] + ' x ' + ab[1] + ' = ' + vistTal(rigtigt, ab[0] * ab[1]), rigtigt, 'Regn ' + ab[0] + ' gange ' + ab[1] + ' selv.')); }
    else { ab = [r(5, 9), r(4, 9)]; rigtigt = Math.random() < 0.5; qs.push(truefalse('ida', 'Jeg har regnet prisen på to poser ud. Passer det?', ab[0] + ' + ' + ab[1] + ' = ' + vistTal(rigtigt, ab[0] + ab[1]), rigtigt, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen selv.')); }
    var x = Math.max(8, tal(t, 0.6)), y = r(2, Math.min(19, x - 2));
    qs.push(write('far', 'På regningen står ' + x + ' - ' + y + ' = ' + ((x - y) + choice([-2, -1, 1, 2])) + '. Den tror jeg ikke på. Hvad skal der stå?', x - y, 'Regn det selv, og sammenlign med det, der står.', '', 'tjek'));
    if (t.procent && Math.random() < 0.5) {
      var fuld = choice([200, 400, 500]), pct = choice([20, 25]);
      qs.push(choose('far', 'Boden tilbyder ' + pct + ' procent rabat på en vare til ' + fuld + ' kr, og en anden bod tager ' + (fuld - fd(fuld * pct, 100) + 20) + ' kr for den samme vare. Hvor er den billigst?', ['Boden med rabatten', 'Den anden bod', 'De er lige gode'], 0, 'Regn prisen med rabat ud: ' + fuld + ' minus ' + pct + ' procent.', 'penge'));
    } else if (t.gennemsnit) {
      var dage = [r(10, 40), r(10, 40), r(10, 40), r(10, 40)];
      while ((dage[0] + dage[1] + dage[2] + dage[3]) % 4 !== 0) dage[0]++;
      qs.push(write('far', 'Bagerboden har solgt ' + dage.join(', ') + ' brød i fire uger i træk. Hvad er gennemsnittet pr. uge?', (dage[0] + dage[1] + dage[2] + dage[3]) / 4, 'Læg dem sammen, og del med, hvor mange uger der er.', 'brød', 'tjek'));
    } else if (t.division) {
      var pa = choice([12, 16]), pb = pyround(pa / 4 * 6) + choice([-3, -2, 2, 3]);
      qs.push(choose('far', 'Honning: 4 glas for ' + pa + ' kr, eller 6 glas for ' + pb + ' kr. Hvor er prisen pr. glas lavest?', ['4 for ' + pa + ' kr', '6 for ' + pb + ' kr', 'De er lige gode'], pa / 4 < pb / 6 ? 0 : 1, 'Regn ud, hvad ÉT glas koster hvert sted.', 'penge'));
    } else {
      ab = choice([[6, 9], [7, 10], [5, 8]]);
      qs.push(choose('far', 'Det ene glas koster ' + ab[0] + ' kr, det andet ' + ab[1] + ' kr. Hvor meget koster de to tilsammen?', [(ab[0] + ab[1]) + ' kr', (ab[1] - ab[0]) + ' kr', (ab[0] + ab[1] + 2) + ' kr'], 0, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen.', 'penge'));
    }
    var st = t.klasse <= 3 ? choice([8, 12]) : choice([12, 16, 24]), folk = t.division ? choice([2, 4]) : 2, rg2 = Math.random() < 0.5, v2 = vistTal(rg2, st / folk, [-1, 1, 2]);
    qs.push(truefalse('ida', 'Vi har ' + st + ' pandekager og er ' + folk + '. Ida siger, at vi får ' + v2 + ' hver. Passer det?', t.division ? st + ' : ' + folk + ' = ' + v2 : 'Halvdelen af ' + st + ' er ' + v2, rg2, t.division ? 'Del ' + st + ' ligeligt mellem ' + folk + ', og se efter.' : 'Læg ' + st + ' i to lige store bunker, og tæl den ene.'));
    var tg = t.gange ? (t.klasse <= 3 ? choice([14, 18, 21, 27]) : choice([27, 32, 36, 45])) : choice([11, 13, 15, 17]);
    qs.push(findall('ida', 'Vi laver en kvik quiz til de andre på markedet. Find alle de regnestykker, der giver ' + tg + '.', tg, 'Tjek hvert stykke grundigt, også dem, der ligner.', t));
    return qs;
  }

  // 6. SKAB: vores egen bod
  function mBoss(t) {
    var qs = [], salg;
    if (t.gange) {
      var antalSolgt = t.klasse <= 3 ? choice([10, 20]) : choice([12, 20, 25]), loft = Math.max(2, fd(t.gange_top, antalSolgt));
      var pris = Math.max.apply(null, [2, 5, 10, 15, 20, 25, 35].filter(function (p) { return p <= loft; }));
      qs.push(write('far', 'Vi sælger ' + antalSolgt + ' glas marmelade for ' + pris + ' kr stykket. Hvor mange kroner får vi ind?', pris * antalSolgt, pris + ' kr gange ' + antalSolgt + ' glas.', 'kr', 'gange'));
      salg = pris * antalSolgt;
    } else {
      var a = r(6, 14), b = r(2, 5);
      qs.push(write('far', 'Vi har solgt for ' + a + ' kr, og en kunde giver os ' + b + ' kr mere. Hvor mange kroner har vi?', a + b, 'Læg de to beløb sammen.', 'kr', 'plus'));
      salg = a + b;
    }
    var udgift = salg >= 50 ? pyround(salg * 0.4 / 10) * 10 : fd(salg, 2);
    qs.push(write('far', 'Vi købte ingredienserne for ' + udgift + ' kr. Hvor meget har vi tjent, når vi har solgt for ' + salg + ' kr?', salg - udgift, 'Overskuddet er salget minus udgifterne.', 'kr', 'penge'));
    if (t.division) { var holdene = choice([3, 4]), prH = prGruppe(t, holdene, 5, 8); qs.push(balance('far', 'Vi har ' + (holdene * prH) + ' krukker, som skal deles ligeligt på ' + holdene + ' borde. Hvor mange krukker pr. bord?', holdene, 'x', prH, 'Del ' + (holdene * prH) + ' med ' + holdene + '.', 'division')); }
    else { var kr2 = choice([16, 18, 20]), br = r(4, 9); qs.push(write('far', 'Vi har ' + kr2 + ' krukker, og ' + br + ' er solgt. Hvor mange er der tilbage?', kr2 - br, 'Træk de solgte fra.', 'stk', 'plus')); }
    var ab, rg, vist;
    if (t.ligning) { var x = r(4, 12), a2 = H.fak(t, 3, 9); qs.push(write('far', 'På regnskabsbladet står: ' + a2 + ' · x = ' + (a2 * x) + '. Hvad er x?', x, 'Hvad skal ' + a2 + ' ganges med for at give ' + (a2 * x) + '?', '', 'raekkefolge')); }
    else if (t.gange) { ab = gangPar(t, Math.min(100, regneloft(t))); rg = Math.random() < 0.5; vist = vistTal(rg, ab[0] * ab[1], [-3, 3]); qs.push(truefalse('far', 'Jeg har skrevet salget ned. Holder det?', ab[0] + ' x ' + ab[1] + ' = ' + vist, rg, 'Regn ' + ab[0] + ' gange ' + ab[1] + ' omhyggeligt.')); }
    else { ab = [r(6, 12), r(4, 8)]; rg = Math.random() < 0.5; vist = vistTal(rg, ab[0] + ab[1], [-2, 2]); qs.push(truefalse('far', 'Jeg har skrevet salget ned. Holder det?', ab[0] + ' + ' + ab[1] + ' = ' + vist, rg, 'Læg ' + ab[0] + ' og ' + ab[1] + ' sammen omhyggeligt.')); }
    for (var n = 0; n < 2; n++) {
      var p = makeCreative(t), hj = t.hierarki ? 'Husk: gange og dividere regnes før plus og minus.' : 'Prøv dig frem — regn fra venstre mod højre.';
      qs.push(build('far', (n === 0 ? 'Og så en, du selv skal bygge til skiltet på vores bod. ' : 'Og en sidste. ') + 'Byg et regnestykke, der giver ' + p.target + ', med tallene ' + p.numbers.join(', ') + ' — hvert tal én gang — og ' +
        (p.min_ops < 2 ? 'mindst én regneart.' : 'mindst ' + p.min_ops + ' forskellige regnearter.'), p, hj));
    }
    return qs;
  }

  // Ekstramissioner i kapitel 3: blomsterboden og loppemarkedets tombola
  function sqBlomster(t) {
    var buket = choice([4, 5, 6]), pr;
    if (t.gange) { pr = prGruppe(t, buket, 3, 8); return [
      write('blomsterkone', 'Der er ' + buket + ' buketter med ' + pr + ' blomster i hver. Hvor mange blomster er der i alt?', buket * pr, buket + ' gange ' + pr + '.', 'stk', 'gange'),
      balance('blomsterkone', 'Jeg har ' + (buket * pr) + ' blomster og vil lave ' + buket + ' lige store buketter. Hvor mange i hver?', buket, 'x', pr, 'Del ' + (buket * pr) + ' med ' + buket + '.', 'division'),
      choose('blomsterkone', 'En buket med ' + pr + ' blomster er ét af mine hold. Hvad skal jeg regne, hvis jeg vil have dobbelt så mange blomster?', ['Gange med 2', 'Lægge 2 til', 'Trække 2 fra', 'Dele med 2'], 0, 'Dobbelt så meget betyder gange med 2.', 'gange')
    ]; }
    var bl = r(6, 12), nye = r(3, 6);
    return [
      write('blomsterkone', 'Der står ' + bl + ' roser i vasen, og jeg sætter ' + nye + ' mere i. Hvor mange er der så?', bl + nye, 'Læg de to tal sammen.', 'stk', 'plus'),
      write('blomsterkone', 'Der er ' + (bl + nye) + ' roser, og ' + nye + ' bliver solgt. Hvor mange er tilbage?', bl, 'Træk de solgte fra.', 'stk', 'plus'),
      choose('blomsterkone', 'Jeg havde ' + bl + ' tulipaner sidste år og har det dobbelte nu. Hvad skal jeg regne?', ['Lægge det samme til én gang til', 'Trække 2 fra', 'Dele med 2'], 0, 'Dobbelt så mange er det samme lagt til én gang til.', 'plus')
    ];
  }
  function sqTombola(t) {
    var rg = Math.random() < 0.5, lodder, pris, kombo;
    if (t.gange) {
      kombo = choice([[10, 2], [10, 5], [20, 2], [20, 5], [25, 2], [30, 2]].filter(function (c) { return c[0] * c[1] <= Math.min(t.gange_top, regneloft(t)); }));
      lodder = kombo[0]; pris = kombo[1];
      return [
        write('loppe', 'Der er solgt ' + lodder + ' lodder til ' + pris + ' kr. Hvor mange kroner er det i alt?', lodder * pris, pris + ' kr gange ' + lodder + ' lodder.', 'kr', 'gange'),
        write('loppe', 'Der er ' + (lodder + 6) + ' lodder i trommen, og ' + lodder + ' er trukket. Hvor mange er der tilbage?', 6, 'Træk de trukne fra.', 'stk', 'plus'),
        truefalse('loppe', 'En kunde mener, at det her passer. Gør det?', 'Halvdelen af ' + lodder + ' er ' + vistTal(rg, lodder / 2, [1]), rg, 'Læg ' + lodder + ' i to lige store bunker, og tæl den ene.')
      ];
    }
    lodder = choice([8, 10, 12]);
    return [
      write('loppe', 'Der er solgt ' + lodder + ' lodder i morges og 4 i eftermiddag. Hvor mange lodder er der solgt i alt?', lodder + 4, 'Læg de to tal sammen.', 'stk', 'plus'),
      write('loppe', 'Der er ' + (lodder + 6) + ' lodder i trommen, og ' + lodder + ' er trukket. Hvor mange er der tilbage?', 6, 'Træk de trukne fra.', 'stk', 'plus'),
      truefalse('loppe', 'En kunde mener, at det her passer. Gør det?', 'Halvdelen af ' + lodder + ' er ' + vistTal(rg, lodder / 2, [1]), rg, 'Læg ' + lodder + ' i to lige store bunker, og tæl den ene.')
    ];
  }

  // ================================================================ tilmelding
  var SAET = O.SAET;
  SAET.u_husk = { bloom: 'HUSK', gen: uHusk }; SAET.u_forstaa = { bloom: 'FORSTÅ', gen: uForstaa }; SAET.u_anvend = { bloom: 'ANVEND', gen: uAnvend };
  SAET.u_analyser = { bloom: 'ANALYSÉR', gen: uAnalyser }; SAET.u_vurder = { bloom: 'VURDÉR', gen: uVurder }; SAET.u_boss = { bloom: 'SKAB', gen: uBoss };
  SAET.sq_u_aber = { bloom: 'FORSTÅ', gen: sqAber }; SAET.sq_u_souvenir = { bloom: 'ANVEND', gen: sqSouvenir };
  SAET.m_husk = { bloom: 'HUSK', gen: mHusk }; SAET.m_forstaa = { bloom: 'FORSTÅ', gen: mForstaa }; SAET.m_anvend = { bloom: 'ANVEND', gen: mAnvend };
  SAET.m_analyser = { bloom: 'ANALYSÉR', gen: mAnalyser }; SAET.m_vurder = { bloom: 'VURDÉR', gen: mVurder }; SAET.m_boss = { bloom: 'SKAB', gen: mBoss };
  SAET.sq_m_blomster = { bloom: 'FORSTÅ', gen: sqBlomster }; SAET.sq_m_tombola = { bloom: 'ANVEND', gen: sqTombola };

  // "Jeg kan …" for hvert kapitel (kapitel 1 bruger O.CAN)
  O.CAN_KAP = {
    2: [['HUSK', 'huske tal og klokkeslæt fra en tur'], ['FORSTÅ', 'forstå billetpriser, halve priser og at dele en regning'], ['ANVEND', 'regne med mad, drikke og byttepenge'],
        ['ANALYSÉR', 'finde mønstre i foder, hegn og tider'], ['VURDÉR', 'tjekke, om et regnskab passer'], ['SKAB', 'planlægge en klasses udflugt og bygge mit eget regnestykke']],
    3: [['HUSK', 'huske priser, tider og antal på en travl dag'], ['FORSTÅ', 'forstå en opskrift og dele noget i lige store dele'], ['ANVEND', 'regne med kilopriser, tilbud og byttepenge'],
        ['ANALYSÉR', 'finde mønstre og regne i flere trin på et loppemarked'], ['VURDÉR', 'afgøre, hvilket tilbud der er bedst'], ['SKAB', 'drive en bod og regne overskuddet ud']]
  };
})();
