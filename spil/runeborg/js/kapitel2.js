/* Runeborg — kapitel 2: Skoven ved Mosekrogen
   Nogle dage efter høstfesten. Træerne ved mosen i Mosekrogen er blevet grå, de lysende svampe er
   væk, og landsbyen siger, at Mosetrolden Grum er vred. Spilleren skal finde ud af, hvad der
   egentlig sker — med iagttagelser, hypoteser, målinger og en fair test.

   Fagligt er kapitlet bygget på det, danske elever klarede dårligst i PISA 2025 i naturfag:
   at skelne iagttagelse fra forklaring, at planlægge en fair undersøgelse med gentagelser, at
   aflæse tabeller og grafer — og at skelne sammenhæng fra årsag. Dertil lidt regning med tid og tempo.

   Alt, der hører til kapitlet, har id'er med k2 foran, så det ikke støder sammen med kapitel 1. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};
  var K0 = RB.content, AREA = K0.AREA;

  var A = {
    iagttag: 'Naturfag · Se og tro',
    hypotese: 'Naturfag · Hypoteser',
    tabel: 'Naturfag · Tabeller og grafer',
    aarsag: 'Tænk kritisk · Sammenhæng eller årsag',
    gentag: 'Naturfag · Fair test og gentagelser',
    tempo: 'Matematik · Tid og tempo'
  };
  var AR = Object.assign({}, AREA, A);   // AREA får de nye nøgler først i tilfoej() — så vi bruger vores egen samling i opgaverne

  function at(map, x, y, dir) { return function (S) { return S.kap === 2 ? { map: map, x: x, y: y, dir: dir || 'down' } : null; }; }

  // ---------------------------------------------------------------- dokumenter og diagrammer
  var DOC_BREV = { kind: 'letter', title: 'Brev fra Mosekrogen', lines: [
    'Kære Hilde og Eventyrerlauget,',
    'For fem uger siden begyndte træerne ved mosen at få grå blade. Først to, så ti, nu mere end tredive.',
    'De lysende svampe langs stien forsvandt for tre uger siden, og uglerne i den gamle eg er fløjet væk.',
    'Landsbyen siger, at Mosetrolden Grum er vred. Jeg tror på målinger — men jeg har brug for hjælp til at lave dem rigtigt.',
    'Kom gerne hurtigt.'
  ], by: '— Fenja Skovfoged, Mosekrogen' };
  var DOC_STAT = { kind: 'notice', title: 'Fenjas tre stationer', html:
    '<table><tr><th>Sted</th><th>Træer talt</th><th>Træer med grå blade</th><th>Jorden</th></tr>' +
    '<tr><td>A · ved mosen</td><td>10</td><td>9</td><td>sort og våd</td></tr>' +
    '<tr><td>B · ved kulmilen</td><td>10</td><td>3</td><td>tør, lugter af røg</td></tr>' +
    '<tr><td>C · på bakken</td><td>10</td><td>1</td><td>tør og fast</td></tr></table>' };
  var CH_AFSTAND = { kind: 'bar', title: 'Grå blade efter afstand til mosen (procent af bladene)', labels: ['2 m', '5 m', '10 m', '20 m', '30 m', '40 m'], values: [90, 75, 45, 20, 10, 5], colors: ['#8a8896', '#8a8896', '#a0a090', '#9ab070', '#8cc43c', '#8cc43c'], max: 100 };
  var CH_VAND = { kind: 'line', title: 'Vandstand i mosen (cm over normal), uge for uge', labels: ['1', '2', '3', '4', '5', '6', '7', '8'], values: [0, 0, 0, 12, 20, 26, 31, 35], max: 40, marker: { at: 2, label: 'Dæmningen bygges' }, xlabel: 'Uge' };
  var DOC_GRUPPER = { kind: 'letter', title: 'Fenjas fire grupper (3 ens egetræsplanter i hver)', html:
    '<table><tr><th>Gruppe</th><th>Vand</th><th>Røg</th></tr>' +
    '<tr><td>A</td><td>normalt</td><td>ingen</td></tr>' +
    '<tr><td>B</td><td>stående vand (3 cm)</td><td>ingen</td></tr>' +
    '<tr><td>C</td><td>normalt</td><td>røg fra kulmilen</td></tr>' +
    '<tr><td>D</td><td>stående vand (3 cm)</td><td>røg fra kulmilen</td></tr></table>' };
  var DOC_RESULT = { kind: 'letter', title: 'Efter fire uger: planter med grå blade', html:
    '<table><tr><th>Gruppe</th><th>Vand</th><th>Røg</th><th>Grå (af 3)</th></tr>' +
    '<tr><td>A</td><td>normalt</td><td>ingen</td><td>0</td></tr>' +
    '<tr><td>B</td><td>stående vand</td><td>ingen</td><td>3</td></tr>' +
    '<tr><td>C</td><td>normalt</td><td>røg</td><td>0</td></tr>' +
    '<tr><td>D</td><td>stående vand</td><td>røg</td><td>3</td></tr></table>' };
  var DOC_VANDSTAND = { kind: 'notice', title: 'Hvad tåler træer og mølle?', html:
    '<table><tr><th>Vandstand over normal</th><th>Hvad sker der?</th></tr>' +
    '<tr><td>0–8 cm</td><td>Træerne trives</td></tr>' +
    '<tr><td>9–20 cm</td><td>Grå blade</td></tr>' +
    '<tr><td>Over 20 cm</td><td>Træerne dør</td></tr>' +
    '<tr><td>Under 5 cm</td><td>Møllehjulet står stille</td></tr></table>' };
  var DOC_SVAMPE = { kind: 'log', title: 'Fenjas svampetælling langs stien (hver morgen)', lines: [
    'Uge 1: 48 lysende svampe.', 'Uge 3: 31 lysende svampe.', 'Uge 5: 12 lysende svampe.', 'Uge 7: 12 lysende svampe — og jorden under dem er mærkbart tørrere.'
  ], by: 'Afskrift af Fenjas feltbog' };

  // ---------------------------------------------------------------- personer
  var npcs = {
    fenja: {
      name: 'Fenja, skovfoged', look: { hair: '#6a3a1a', cloth: '#3a6a3a', hat: 'hood', hatColor: '#2c5a2c', skin: '#e8b890', accent: '#e0a82c' },
      pos: function (S) {
        if (S.kap !== 2) return null;
        if (S.q.k2q0 === 'active') return { map: 'skov', x: 20, y: 25, dir: 'down' };
        if (S.q.k2q4 === 'active') return { map: 'skovfoged', x: 7, y: 6, dir: 'down' };
        if (S.q.k2q5 === 'active') return { map: 'skov', x: 28, y: 13, dir: 'right' };
        return { map: 'skov', x: 16, y: 10, dir: 'down' };
      }
    },
    tuk: { name: 'Tuk, kulsvier', look: { hair: '#2a2a2a', beard: true, beardColor: '#3a3a3a', cloth: '#4a3a2a', skin: '#a8805a', hat: 'beret', hatColor: '#2a2a2a' }, pos: at('skov', 11, 6, 'left') },
    brage: { name: 'Gamle Brage', look: { hair: '#e8e8e8', beard: true, beardColor: '#e8e8e8', cloth: '#6a4a6a', skin: '#e8c8a8', hat: 'wizard', hatColor: '#4a3a6a' }, pos: at('skov', 20, 7, 'up') },
    mads: {
      name: 'Møller Mads', look: { hair: '#c8a060', beard: true, beardColor: '#c8a060', cloth: '#e8e0d0', skin: '#f0c090', belt: '#8a6a3a' },
      pos: function (S) { return S.kap === 2 ? { map: 'skov', x: 33, y: 12, dir: 'left' } : null; }
    }
  };
  var things = [
    { id: 'k2stA', map: 'skov', x: 16, y: 25, kind: 'station', visible: function (S) { return S.q.k2q1 === 'active' && !S.flags.k2_a; } },
    { id: 'k2stB', map: 'skov', x: 8, y: 8, kind: 'station', visible: function (S) { return S.q.k2q1 === 'active' && !S.flags.k2_b; } },
    { id: 'k2stC', map: 'skov', x: 24, y: 6, kind: 'station', visible: function (S) { return S.q.k2q1 === 'active' && !S.flags.k2_c; } }
  ];
  var runes = [
    { id: 'r9', map: 'skov', x: 18, y: 26, where: 'Ved hovedstien, syd for åen', title: 'Om mos', t: 'Mos har ingen rødder. Det suger vand ind gennem bladene — og viser derfor, hvor der er fugtigt. Kloge skovfogeder læser mosset som et kort.' },
    { id: 'r10', map: 'skov', x: 26, y: 5, where: 'På bakken i nordøst', title: 'Om ugler', t: 'En ugle kan dreje hovedet næsten rundt, fordi dens øjne sidder fast i hovedet. Den må se sig om i stedet for at kigge til siden.' },
    { id: 'r11', map: 'skovfoged', x: 12, y: 4, where: 'I Fenjas feltstation', title: 'Om årringe', t: 'Hver årring i et træ er ét år. Brede ringe betyder et godt, vådt år. Smalle ringe betyder tørke. Et træ er altså også en dagbog.' },
    { id: 'r12', map: 'skov', x: 11, y: 10, where: 'På stien op til kulmilen', title: 'Om kul', t: 'Af fem kilo træ bliver der kun et kilo kul tilbage. Resten forsvinder som røg og damp. Derfor er kul så let at bære — og så dyrt.' }
  ];
  var places = {
    'skov:20,5': 'baal', 'skov:30,11': 'sluse', 'skov:21,28': 'sign_skov', 'skov:13,9': 'sign_fenja', 'skov:37,12': 'sign_moelle',
    'skov:9,5': 'kulmile', 'skovfoged:7,1': 'fkort', 'skovfoged:12,7': 'fbord'
  };
  var placePos = { sluse: ['skov', 30, 11], baal: ['skov', 20, 5] };
  var lockedDoors = { 'skov:36,11': 'Møllen. Der buldrer kværnsten indenfor — og det dufter af nybagt brød.' };

  // ---------------------------------------------------------------- spor og evner
  var clues = {
    c2_stationer: { t: 'Træer med grå blade: 9 af 10 ved mosen, 3 af 10 ved kulmilen, 1 af 10 på bakken.', src: 'Fenjas stationer — talt efter', evidence: true },
    c2_trold: { t: 'Brage siger, at Mosetrolden Grum er vred og har gjort træerne grå.', src: 'Fortælling — kan ikke prøves', weak: true, why: 'Man kan ikke måle sig frem til, om en trold er vred. Det er en fortælling, ikke et bevis.' },
    c2_roeg: { t: 'Tuk mener, at det er røg fra kulmilen, der gør træerne grå.', src: 'Tuk — en påstand, ikke en måling', weak: true, why: 'Ved kulmilen er der færrest grå træer. Det passer ikke med, at røgen er skyld.' },
    c2_data: { t: 'Jo tættere på mosen, desto flere grå blade (90 % ved 2 m, 5 % ved 40 m). Vandstanden steg 35 cm efter dæmningen.', src: 'Fenjas målinger og grafer', evidence: true },
    c2_fairtest: { t: 'Fair test: planter med stående vand fik grå blade (3 af 3). Planter med røg fik ikke. Gentaget tre gange.', src: 'Fenjas drivhusforsøg', evidence: true },
    c2_billerne: { t: 'Fenja har set barkbiller i et par stammer.', src: 'Fenja — uundersøgt', weak: true, why: 'Barkbiller kan være en følge af, at træerne er svage, ikke årsagen. Ingen har talt dem endnu.' }
  };
  var skills = {
    feltbog: { name: 'Feltbogen', desc: 'Du skriver ned, hvad du faktisk ser, tæller og måler — før du gætter på, hvorfor.' },
    iagttager: { name: 'Iagttagerens øje', desc: 'Du kan skelne det, du ser, fra det, du tror.' },
    hypotese: { name: 'Hypotesejægeren', desc: 'Du ved, at en god forklaring skal kunne prøves — og kunne vise sig at være forkert.' },
    tendens: { name: 'Tendensøjet', desc: 'Du kan se, om tallene stiger eller falder — og tør sige, at sammenhæng ikke altid er årsag.' },
    gentagelse: { name: 'Gentagelsens kraft', desc: 'Du ændrer kun én ting ad gangen og gentager forsøget, så et tilfælde ikke narrer dig.' },
    tidsur: { name: 'Tidsuret', desc: 'Du kan regne ud, hvor lang tid noget tager, når du kender tempoet.' }
  };

  // ---------------------------------------------------------------- missioner
  var ACT1 = 'Kapitel 2 · Akt 1 · De grå træer', ACT2 = 'Kapitel 2 · Akt 2 · Hvorfor?', ACT3 = 'Kapitel 2 · Akt 3 · Slusen';
  var quests = [
    { id: 'k2q0', act: ACT1, title: 'Bud fra Mosekrogen', desc: 'Læs Fenjas brev, og find ud af, hvad der er sket.', target: function () { return 'fenja'; }, goal: 'Tal med Fenja, skovfogeden' },
    {
      id: 'k2q1', act: ACT1, title: 'Se — og tro', desc: 'Besøg Fenjas tre stationer, og skriv kun ned, hvad du kan se og tælle.', requires: ['k2q0'], uses: 'Feltbogen: først se, så gætte',
      target: function (S) { if (!S.flags.k2_a) return 'k2stA'; if (!S.flags.k2_b) return 'k2stB'; if (!S.flags.k2_c) return 'k2stC'; return 'fenja'; },
      goal: function (S) { var n = (S.flags.k2_a ? 1 : 0) + (S.flags.k2_b ? 1 : 0) + (S.flags.k2_c ? 1 : 0); return n < 3 ? 'Undersøg stationerne: ' + n + ' af 3 (' + (!S.flags.k2_a ? 'ved mosen' : !S.flags.k2_b ? 'ved kulmilen' : 'på bakken') + ')' : 'Vis Fenja, hvad du har noteret'; }
    },
    {
      id: 'k2q2', act: ACT1, title: 'Fire forklaringer', desc: 'Hør, hvad Tuk, Brage og Mads tror — og find ud af, hvilke forklaringer man kan prøve.', requires: ['k2q1'], uses: 'Iagttagerens øje: er det set eller tænkt?',
      target: function (S) { if (!S.flags.k2_hTuk) return 'tuk'; if (!S.flags.k2_hBrage) return 'brage'; if (!S.flags.k2_hMads) return 'mads'; return 'fenja'; },
      goal: function (S) { var n = (S.flags.k2_hTuk ? 1 : 0) + (S.flags.k2_hBrage ? 1 : 0) + (S.flags.k2_hMads ? 1 : 0); return n < 3 ? 'Hør forklaringerne hos Tuk, Brage og Mads (' + n + '/3)' : 'Gå tilbage til Fenja med forklaringerne'; }
    },
    { id: 'k2q3', act: ACT2, title: 'Målinger i mosen', desc: 'Aflæs Fenjas tal og grafer, og find ud af, hvad de faktisk viser.', requires: ['k2q2'], uses: 'De fire forklaringer', target: function () { return 'fenja'; }, goal: 'Tal med Fenja om målingerne' },
    { id: 'k2q4', act: ACT2, title: 'Drivhusets fair test', desc: 'Planlæg en fair test sammen med Fenja, og læs resultaterne.', requires: ['k2q3'], uses: 'Tendensøjet: der er en sammenhæng — men er den en årsag?', target: function () { return 'fenja'; }, goal: 'Besøg Fenja i feltstationen' },
    {
      id: 'k2q5', act: ACT3, title: 'Slusen', desc: 'Overbevis Møller Mads med beviser — og regn ud, hvor længe slusen skal stå åben.', requires: ['k2q4'], uses: 'Alle dine beviser',
      target: function (S) { return S.flags.k2_mads ? 'sluse' : 'mads'; },
      goal: function (S) { return S.flags.k2_mads ? 'Åbn slusen i mølledæmningen' : 'Tal med Møller Mads ved dæmningen'; }
    },
    { id: 'k2s1', act: 'Ekstramissioner', side: true, title: 'Svampene der lyser', desc: 'Hjælp Brage med at skille fortællingen fra målingerne.', requires: ['k2q2'], giver: 'brage', uses: 'Iagttagerens øje', target: function () { return 'brage'; }, goal: 'Tal med Brage ved stencirklen' },
    { id: 'k2s2', act: 'Ekstramissioner', side: true, title: 'Tuks kul', desc: 'Regn på, hvor meget træ en kulmile skal bruge.', requires: ['k2q3'], giver: 'tuk', uses: 'Forhold fra Runeborg', target: function () { return 'tuk'; }, goal: 'Tal med Tuk ved kulmilen' }
  ];

  // ---------------------------------------------------------------- dialog og handling
  var on = {}, offer = {}, idle = {}, placeIdle = {};

  async function intro(g) {
    await g.say(null, 'Tre dage efter høstfesten. Hilde har fået en post-due fra Mosekrogen, en lille skovlandsby øst for Runeborg. Brynja har pakket din taske og lånt dig en vogn.');
    await g.say(null, 'Du kommer ind ad skovstien, mens tågen endnu hænger mellem stammerne. Her lugter af mos, våd jord og et eller andet, der ikke helt hører til.');
    await g.say(null, 'Langs mosen står træerne med grå, hængende blade. Det ser ud, som om nogen har slukket farverne.');
    g.start('k2q0', true);
    await on.k2q0.fenja(g);
  }

  on.k2q0 = {
    fenja: async function (g) {
      if (!g.seen('k2q0a')) {
        await g.say('fenja', 'Dér er du! Hilde skrev, at hun ville sende en lærling. Jeg er Fenja, skovfoged her i Mosekrogen. Tak, fordi du kom så hurtigt.');
        await g.say('fenja', 'Her er mit brev til lauget — så ved du, hvad vi har brug for hjælp til. Læs det grundigt, for jeg har skrevet præcis det, jeg ved.');
      }
      if (!await g.task('k2q0a', { type: 'pick', area: AR.find, doc: DOC_BREV, q: 'Hvor længe er det siden, de første træer fik grå blade? Klik på sætningen, der fortæller det.', answer: 1,
        whyLine: { 2: 'Den handler om svampene og uglerne, ikke om, hvornår træerne blev grå.', 3: 'Det er noget, landsbyen siger — ikke et tidspunkt.', 0: 'Det er bare en hilsen.' } })) return;
      if (!await g.task('k2q0b', { type: 'multi', area: AR.find, doc: DOC_BREV, q: 'Hvad siger Fenja selv, at hun har set? Vælg alle, der passer.', opts: [
        { t: 'Træer med grå blade ved mosen.', ok: true }, { t: 'At de lysende svampe er forsvundet.', ok: true }, { t: 'At uglerne er fløjet væk.', ok: true },
        { t: 'At Mosetrolden Grum er vred.', why: 'Det er noget, «landsbyen siger». Fenja skriver ikke, at hun har set det.' },
        { t: 'At mølleren har gjort noget galt.', why: 'Det står ingen steder i brevet.' }
      ], explain: 'Fenja skelner mellem det, hun har set, og det, andre siger. Det er en god vane.' })) return;
      await g.say('fenja', 'Præcis. Og nu en regel, jeg lærte som ung: skriv aldrig, hvorfor noget sker, før du har skrevet, hvad du faktisk så. Her er min gamle feltbog. Den er din nu.');
      await g.skill('feltbog');
      await g.say('fenja', 'Jeg har sat pæle op tre steder: ved mosen, ved Tuks kulmile og oppe på bakken. Gå hen til dem og skriv ned, hvad du ser og tæller. Kun det. Så snakker vi om, hvad det betyder.');
      g.finish('k2q0'); g.start('k2q1');
    }
  };

  // Fælles opgave ved en station: sortér sætninger i iagttagelser og forklaringer
  async function station(g, flag, key, navn, intro, items, hjaelp) {
    if (!g.seen(key + 'i')) await g.say(null, intro);
    if (!await g.task(key, { type: 'sort', area: AR.iagttag, q: 'Du skriver i feltbogen ved ' + navn + '. Hvad er en iagttagelse (det, du ser eller tæller) — og hvad er en forklaring (det, du tror)?', help: hjaelp,
      cats: ['Iagttagelse — set eller talt', 'Forklaring — noget, jeg tror'], items: items,
      explain: 'En iagttagelse kan alle andre tjekke ved selv at gå derhen. En forklaring er et gæt, indtil man har prøvet det af.' })) return;
    g.flag(flag); RB.audio.sfx('pick');
    var n = (g.S.flags.k2_a ? 1 : 0) + (g.S.flags.k2_b ? 1 : 0) + (g.S.flags.k2_c ? 1 : 0);
    g.toast('<b>Station noteret ' + n + ' af 3</b> — ' + navn);
    if (n === 3) await g.say(null, 'Feltbogen er fuld. Tilbage til Fenja!');
  }
  var STH = 'En iagttagelse er noget, man kan se, tælle eller måle lige nu. En forklaring begynder ofte med «fordi», «sikkert» eller «det må være».';
  on.k2q1 = {
    k2stA: function (g) {
      return station(g, 'k2_a', 'k2q1a', 'mosen', 'Mosen. Jorden giver efter under støvlerne, og vandet står i fordybningerne efter dine fodspor. Du tæller ti træer ved pælen. Ni af dem har grå, hængende blade.', [
        { t: 'Jorden er sort og våd. Støvlerne synker fem centimeter ned.', c: 0 }, { t: 'Ni af ti træer har grå blade.', c: 0 },
        { t: 'Rødderne er sikkert blevet kvalt.', c: 1 }, { t: 'Det er trolden, der har forbandet dem.', c: 1 }], STH);
    },
    k2stB: function (g) {
      return station(g, 'k2_b', 'k2q1b', 'kulmilen', 'Ved Tuks kulmile lugter der af røg, men jorden er tør og fast. Du tæller ti træer ved pælen. Tre af dem har grå blade.', [
        { t: 'Der lugter af røg, og jorden er tør.', c: 0 }, { t: 'Tre af ti træer har grå blade.', c: 0 },
        { t: 'Røgen har gjort træerne syge.', c: 1 }, { t: 'Kulsvieren er skyld i det hele.', c: 1 }], STH);
    },
    k2stC: function (g) {
      return station(g, 'k2_c', 'k2q1c', 'bakken', 'Oppe på bakken er der sol, og jorden er tør. Du tæller ti træer ved pælen. Kun ét har grå blade.', [
        { t: 'Jorden er tør og fast.', c: 0 }, { t: 'Kun ét af ti træer har grå blade.', c: 0 },
        { t: 'Træerne her får mest sol, så de må have det bedst.', c: 1 }, { t: 'Bakken har bare haft heldet med sig.', c: 1 }], STH);
    },
    fenja: async function (g) {
      var S = g.S;
      if (!(S.flags.k2_a && S.flags.k2_b && S.flags.k2_c)) { await g.say('fenja', 'Har du været ved alle tre pæle? Mosen, kulmilen og bakken. Tjek din dagbog, hvis du er i tvivl.'); return; }
      if (!g.seen('k2q1d')) await g.say('fenja', 'Lad os sætte dine noter sammen. Jeg har skrevet dem op i en tabel.');
      if (!await g.task('k2q1d', { type: 'choice', area: AR.tabel, doc: DOC_STAT, q: 'Hvor var der flest træer med grå blade?', opts: [
        { t: 'Ved mosen', ok: true }, { t: 'Ved kulmilen', why: 'Ved kulmilen var det 3 af 10. Ved mosen var det flere.' }, { t: 'På bakken', why: 'På bakken var det kun 1 af 10 — det færreste.' }
      ] })) return;
      if (!await g.task('k2q1e', { type: 'number', area: AR.tabel, doc: DOC_STAT, q: 'Hvor mange procent af træerne ved mosen havde grå blade?', unit: '%', answer: 90,
        hint: '9 af 10 er det samme som 90 af 100.', near: [{ v: 9, why: '9 er antallet af træer. Spørgsmålet er, hvor mange procent 9 af 10 er.' }] })) return;
      if (!await g.task('k2q1f', { type: 'choice', area: AR.iagttag, doc: DOC_STAT, q: 'Hvilket udsagn bygger på tabellen — og ikke på en gætteri?', opts: [
        { t: 'Der er flere grå træer, hvor jorden er våd, end hvor jorden er tør.', ok: true },
        { t: 'Våd jord dræber altid træer.', why: 'Det er en stor påstand. Tabellen viser kun tre steder — ikke «altid».' },
        { t: 'Kulsvieren har gjort noget forkert.', why: 'Ved kulmilen er der færre grå træer end ved mosen. Det peger ikke på Tuk.' }
      ], explain: 'Tabellen kan bære en sammenligning mellem de tre steder — men ikke mere end det.' })) return;
      g.clue('c2_stationer');
      await g.skill('iagttager');
      await g.say('fenja', 'Netop: vi ved, HVOR de grå træer står. Vi ved ikke endnu, HVORFOR. Det er to forskellige spørgsmål.');
      await g.say('fenja', 'Landsbyen har sine egne forklaringer. Hør dem alle, og tæl, hvor mange man kan prøve af. Tuk ved kulmilen, Brage ved stencirklen og Møller Mads ved dæmningen.');
      g.finish('k2q1'); g.start('k2q2');
    }
  };

  function hypo(key, id, tekst) {
    return async function (g) {
      if (!g.S.flags[key]) { g.flag(key); g.toast('<b>Forklaring noteret</b> — ' + npcs[id].name); }
      await g.say(id, tekst);
    };
  }
  on.k2q2 = {
    tuk: hypo('k2_hTuk', 'tuk', 'Mig? Jeg brænder kun kul på vindstille dage, og røgen stiger lige op. Men folk siger, at det er min røg, der har gjort træerne syge. Jeg ved det ikke — jeg ved bare, at jeg ikke vil have skylden.'),
    brage: hypo('k2_hBrage', 'brage', 'Mosetrolden Grum, mit barn. Han bor under mosen og kan ikke lide at blive forstyrret. Nu er han vred, så han har taget skovens farver. Sådan har jeg altid fortalt det.'),
    mads: hypo('k2_hMads', 'mads', 'Min dæmning? Pøh! Den giver strøm til møllen, så hele landsbyen får brød. Det er noget, I andre har fundet på, fordi I ikke kan forstå vandet. Men hvis I kan bevise noget, så vis mig det!'),
    fenja: async function (g) {
      var S = g.S;
      if (!(S.flags.k2_hTuk && S.flags.k2_hBrage && S.flags.k2_hMads)) { await g.say('fenja', 'Har du hørt Tuk, Brage og Mads? Jeg vil have alle tre forklaringer, før vi sorterer dem.'); return; }
      if (!g.seen('k2q2a')) {
        await g.say('fenja', 'Fire forklaringer, altså: Tuks røg, Brages trold, Mads\' dæmning — og mine barkbiller. Jeg har set et par biller i stammerne.');
        await g.say('fenja', 'En god forklaring er en, man kan prøve af. Man skal kunne sige: «Hvis den her passer, så vil jeg se det her — og hvis jeg ser noget andet, er den forkert.»');
      }
      if (!await g.task('k2q2a', { type: 'choice', area: AR.hypotese, doc: DOC_STAT, q: 'Tuk mener, at røgen fra kulmilen gør træerne grå. Hvilken iagttagelse passer IKKE til det?', opts: [
        { t: 'Ved kulmilen er 3 af 10 træer grå — men ved mosen, langt fra røgen, er 9 af 10 grå.', ok: true },
        { t: 'Der lugter af røg ved kulmilen.', why: 'Det er rigtigt, men det siger ikke noget om, om røgen gør træerne syge.' },
        { t: 'Kulmilen brænder på vindstille dage.', why: 'Det er noget, Tuk siger. Det modsiger ikke, at røgen kan skade.' }
      ], explain: 'Hvis røgen var skyld, skulle træerne være værst ramt ved kulmilen. Det er de ikke.' })) return;
      if (!await g.task('k2q2b', { type: 'choice', area: AR.hypotese, q: 'Hvorfor kan man ikke prøve, om Mosetrolden Grum har gjort træerne grå?', opts: [
        { t: 'Fordi ingen måling kan vise, at han IKKE var der. En forklaring, der aldrig kan vise sig forkert, kan man ikke bruge.', ok: true },
        { t: 'Fordi trolde ikke findes.', why: 'Måske ikke — men det er ikke det, der gør forklaringen svær at prøve. Pointen er, at ingen måling kan modbevise den.' },
        { t: 'Fordi Brage er gammel.', why: 'Alder gør ikke en forklaring mere eller mindre testbar.' }
      ], explain: 'Fortællinger kan være dejlige — men de er ikke beviser.' })) return;
      if (!await g.task('k2q2c', { type: 'multi', area: AR.hypotese, q: 'Hvilke af disse forklaringer kan man prøve af med målinger eller tællinger? Vælg alle, der passer.', opts: [
        { t: 'Vandet i mosen står for højt og kvæler rødderne.', ok: true }, { t: 'Røg fra kulmilen gør bladene grå.', ok: true }, { t: 'Barkbiller har ædt træerne.', ok: true },
        { t: 'Trolden Grum er vred.', why: 'Der findes ingen måling, der kan vise det ene eller det andet.' }
      ], explain: 'Vandstand kan måles, røg kan sammenlignes, og biller kan tælles. Troldens humør kan ikke.' })) return;
      if (!await g.task('k2q2d', { type: 'choice', area: AR.hypotese, q: 'Mads\' dæmning har hævet vandet i mosen. Hvad ville være den bedste måde at prøve, om det har skadet træerne?', opts: [
        { t: 'Måle vandstanden, og se om de grå træer står, hvor vandet står højest.', ok: true },
        { t: 'Spørge Mads, om han synes, det er hans skyld.', why: 'Hans mening ændrer ikke på tallene.' },
        { t: 'Vente og se, om trolden dukker op.', why: 'Det er ikke en måling.' }
      ] })) return;
      g.clue('c2_trold'); g.clue('c2_roeg'); g.clue('c2_billerne');
      await g.skill('hypotese');
      await g.say('fenja', 'Så er vi nået frem til, hvad der kan prøves: vandet, røgen og billerne. Næste skridt er at måle — rigtigt og mange steder.');
      await g.say('fenja', 'Kom tilbage hos mig, så ser vi på de tal, jeg har samlet.');
      g.finish('k2q2'); g.start('k2q3');
    }
  };

  on.k2q3 = {
    fenja: async function (g) {
      if (!g.seen('k2q3a')) {
        await g.say('fenja', 'Her er mine to vigtigste målinger. Til venstre: hvor grå bladene er, afhængigt af hvor langt træet står fra mosens kant. Til højre: vandstanden i mosen, uge for uge.');
      }
      if (!await g.task('k2q3a', { type: 'choice', area: AR.tabel, chart: CH_AFSTAND, q: 'Hvad viser søjlerne?', opts: [
        { t: 'Jo tættere på mosen, desto flere grå blade.', ok: true },
        { t: 'Jo længere fra mosen, desto flere grå blade.', why: 'Se på søjlerne: den højeste er ved 2 meter.' },
        { t: 'Afstanden betyder ikke noget.', why: 'Søjlerne er meget forskellige — det er netop pointen.' }
      ] })) return;
      if (!await g.task('k2q3b', { type: 'number', area: AR.tabel, chart: CH_AFSTAND, q: 'Hvor mange procentpoint flere grå blade har et træ 5 m fra mosen end et træ 20 m fra mosen?', unit: 'procentpoint', answer: 55,
        hint: 'Aflæs 5 m (75) og 20 m (20), og træk dem fra hinanden.', near: [{ v: 15, why: 'Du har regnet 20 − 5. Husk at aflæse procenterne, ikke afstandene.' }] })) return;
      if (!await g.task('k2q3c', { type: 'number', area: AR.tabel, chart: CH_AFSTAND, q: 'Hvad er gennemsnittet for de tre træer tættest på mosen (2 m, 5 m og 10 m)?', unit: '%', answer: 70,
        hint: 'Læg 90, 75 og 45 sammen, og del med 3.', near: [{ v: 210, why: '210 er summen. Gennemsnittet får du, når du deler med 3.' }] })) return;
      if (!await g.task('k2q3d', { type: 'choice', area: AR.tabel, chart: CH_VAND, q: 'Dæmningen blev bygget i uge 3. Hvad viser grafen?', opts: [
        { t: 'Vandstanden steg tydeligt, efter dæmningen var bygget.', ok: true },
        { t: 'Vandstanden var høj, før dæmningen blev bygget.', why: 'Se på uge 1-3: der er vandstanden 0 over normal.' },
        { t: 'Vandstanden har ikke ændret sig.', why: 'Den går fra 0 til 35 cm.' }
      ] })) return;
      if (!await g.task('k2q3e', { type: 'number', area: AR.tabel, chart: CH_VAND, q: 'Hvor mange cm steg vandet i gennemsnit pr. uge fra uge 3 til uge 8?', unit: 'cm pr. uge', answer: 7,
        hint: 'Vandet gik fra 0 til 35 cm på 5 uger.', near: [{ v: 35, why: '35 cm er den samlede stigning. Spørgsmålet er pr. uge — del med antallet af uger.' }] })) return;
      if (!await g.task('k2q3f', { type: 'multi', area: AR.aarsag, chart: [CH_AFSTAND, CH_VAND], q: 'Hvilke konklusioner kan vi trække ud fra målingerne? Vælg alle, der passer.', opts: [
        { t: 'De grå træer står tættest på mosen.', ok: true },
        { t: 'Vandstanden er steget siden uge 3.', ok: true },
        { t: 'Der er en sammenhæng mellem våde omgivelser og grå blade — men målinger alene viser ikke, at vandet er årsagen.', ok: true },
        { t: 'Dæmningen har bevist dræbt træerne.', why: 'At to ting sker på samme tid, er ikke det samme som, at den ene forårsager den anden.' },
        { t: 'Alle træer i hele skoven bliver snart grå.', why: 'Det er en alt for stor påstand. Vi har målt ved én mose.' }
      ], explain: 'Sammenhæng er ikke det samme som årsag. Derfor skal vi bruge en fair test.' })) return;
      if (!await g.task('k2q3g', { type: 'choice', area: AR.aarsag, q: 'Mads siger: «Der er altid nogle træer, der bliver syge. Det er bare et tilfælde.» Hvad svarer du?', opts: [
        { t: 'Tilfælde er usandsynligt: der er en klar tendens, og vandet steg samtidig. Men en fair test kan afgøre det.', ok: true },
        { t: 'Du har ret. Det er sikkert bare et tilfælde.', why: 'Ni af ti træer ved mosen og en tydelig tendens er svært at kalde et tilfælde.' },
        { t: 'Nej, det er helt sikkert din skyld.', why: 'Det har vi ikke bevist endnu. Vi har en stærk mistanke, ikke et bevis.' }
      ], explain: 'Godt svar. Vi er klogere, når vi kan sige både «det her peger mod vandet» og «men vi mangler at prøve det af».' })) return;
      g.clue('c2_data');
      await g.skill('tendens');
      await g.say('fenja', 'Mistanken peger mod vandet. Men jeg vil have det bevist, så Mads ikke kan vifte det væk. Kom med ind i feltstationen — jeg har fire grupper planter på bordene.');
      g.finish('k2q3'); g.start('k2q4');
    }
  };

  on.k2q4 = {
    fenja: async function (g) {
      if (!g.seen('k2q4a')) {
        await g.say('fenja', 'Her er mit forsøg. Tolv ens egetræsplanter, delt i fire grupper med tre i hver. Jeg vil prøve både vandet og røgen af, så ingen kan sige, at jeg glemte noget.');
      }
      if (!await g.task('k2q4a', { type: 'multi', area: AR.gentag, doc: DOC_GRUPPER, keepOrder: true, q: 'Vælg de to grupper, der giver en fair test af, om stående vand gør bladene grå.', help: 'En test er fair, når kun én ting er forskellig mellem de to grupper.',
        opts: [{ t: 'Gruppe A' }, { t: 'Gruppe B' }, { t: 'Gruppe C' }, { t: 'Gruppe D' }],
        check: function (sel) {
          sel.sort(); var k = sel.join();
          if (sel.length !== 2) return { ok: false, msg: 'Vælg præcis to grupper.' };
          if (k === '0,1' || k === '2,3') return { ok: true };
          if (k === '0,3') return { ok: false, msg: 'A og D er forskellige på to måder: vand OG røg. Så ved vi ikke, hvad der gjorde forskellen.' };
          return { ok: false, msg: 'De to grupper er forskellige på mere end én ting. Find to, hvor kun vandet er forskelligt.' };
        }, explain: 'A og B er ens på alt — undtagen vandet. (C og D er også et fair par: de har begge røg, men kun vandet er forskelligt.) Så ved vi, at en forskel skyldes vandet.' })) return;
      if (!await g.task('k2q4b', { type: 'multi', area: AR.gentag, q: 'Hvad skal være ens i alle grupper, for at testen er fair? Vælg alle, der passer.', opts: [
        { t: 'Jordtypen', ok: true }, { t: 'Mængden af lys', ok: true }, { t: 'Temperaturen', ok: true }, { t: 'Plantens art og størrelse', ok: true },
        { t: 'Hvor meget vand planterne får', why: 'Det er netop den ting, vi ændrer med vilje, når vi tester vandet.' }
      ] })) return;
      if (!await g.task('k2q4c', { type: 'choice', area: AR.gentag, q: 'Hvorfor har Fenja tre planter i hver gruppe i stedet for kun én?', opts: [
        { t: 'Fordi én plante kan være syg af en helt anden grund. Når forsøget gentages, kan vi se, om resultatet går igen.', ok: true },
        { t: 'Fordi tre planter vokser hurtigere end én.', why: 'Antallet påvirker ikke, hvor hurtigt de vokser.' },
        { t: 'Fordi det ser pænere ud på bordet.', why: 'Det handler om, hvor sikre vi kan være på resultatet.' }
      ], explain: 'Jo flere gentagelser, desto mindre risiko for, at et tilfælde snyder os.' })) return;
      if (!await g.task('k2q4d', { type: 'order', area: AR.gentag, q: 'Sæt trinene i forsøget i den rigtige rækkefølge.', items: [
        'Plant tolv ens egetræer i ens jord, og del dem i fire grupper med tre i hver.',
        'Giv hver gruppe sin behandling: normalt vand, stående vand, røg eller begge dele.',
        'Lad alle grupper stå lige længe ved samme lys og temperatur.',
        'Tæl, hvor mange planter i hver gruppe der har grå blade, og skriv det ned.'
      ] })) return;
      await g.say(null, 'Fire uger går. Fenja tæller, skriver og tæller igen. Så rækker hun dig tabellen.');
      if (!await g.task('k2q4e', { type: 'choice', area: AR.gentag, doc: DOC_RESULT, q: 'Hvad viser resultaterne?', opts: [
        { t: 'Planter med stående vand fik grå blade — uanset om der var røg. Røg alene gjorde ingen forskel.', ok: true },
        { t: 'Røgen gjorde planterne grå.', why: 'Gruppe C (kun røg) har 0 grå planter. Røgen gjorde ingen forskel.' },
        { t: 'Ingen af behandlingerne gjorde en forskel.', why: 'Se på B og D: begge har 3 af 3 grå planter.' }
      ], explain: 'A mod B viser, at vand gør en forskel. C mod A viser, at røg ikke gør.' })) return;
      if (!await g.task('k2q4f', { type: 'number', area: AR.tabel, doc: DOC_RESULT, q: 'Hvor mange af de i alt 12 planter fik grå blade?', unit: 'planter', answer: 6,
        hint: 'Læg de grå planter i alle fire grupper sammen: 0 + 3 + 0 + 3.', near: [{ v: 3, why: '3 er antallet i én gruppe. Læg alle fire grupper sammen.' }] })) return;
      if (!await g.task('k2q4g', { type: 'choice', area: AR.aarsag, doc: DOC_RESULT, q: 'Hvad er den vigtigste forsigtighed, når vi bruger resultatet?', opts: [
        { t: 'Forsøget er lavet i et drivhus. Vi skal også tjekke, om det samme gælder ude i skoven.', ok: true },
        { t: 'Der er ingen grund til forsigtighed. Nu er alt bevist for evigt.', why: 'Et enkelt forsøg kan være et godt bevis — men man tjekker altid, om det holder i virkeligheden.' },
        { t: 'Man bør kun stole på forsøg med mindst hundrede planter.', why: 'Mere er bedre, men tolv ens planter og en tydelig forskel er allerede et stærkt bevis.' }
      ] })) return;
      g.clue('c2_fairtest');
      await g.skill('gentagelse');
      await g.say('fenja', 'Så har vi beviserne: målinger OG en fair test. Der er kun tilbage at overbevise manden, der har dæmningen — og regne ud, hvordan vi redder både træerne og møllen.');
      await g.say('fenja', 'Mads står nede ved dæmningen. Jeg kommer efter dig.');
      g.finish('k2q4'); g.start('k2q5');
    }
  };

  on.k2q5 = {
    mads: async function (g) {
      var S = g.S;
      if (!g.seen('k2q5a')) {
        await g.say('mads', 'Nå, lærlingen. Du kommer sikkert for at sige, at min dæmning er skyld i det hele. Jeg har hørt alle ordene før. Giv mig noget andet end snak.');
      }
      var ids = S.clues.filter(function (c) { return /^c2_/.test(c); });
      if (!await g.task('k2q5a', { type: 'multi', area: AR.argument, q: 'Vælg de tre stærkeste spor fra din dagbog, som du vil vise Mads.', help: 'Et godt bevis er noget, man har set, talt eller prøvet af — ikke noget, nogen mener eller fortæller.',
        opts: ids.map(function (id) { return { t: clues[id].t, id: id }; }),
        check: function (sel) {
          if (sel.length !== 3) return { ok: false, msg: 'Vælg præcis tre spor.' };
          var bad = sel.map(function (i) { return ids[i]; }).filter(function (id) { return !clues[id].evidence; });
          if (!bad.length) return { ok: true };
          return { ok: false, msg: '«' + RB.esc(clues[bad[0]].t) + '» — ' + (clues[bad[0]].why || 'Det er ikke et stærkt bevis.') };
        }, explain: 'Stationerne, målingerne og den fair test er noget, Mads selv kan tjekke.' })) return;
      if (!await g.task('k2q5b', { type: 'choice', area: AR.argument, q: 'Mads: «Men uden dæmningen kan jeg ikke male korn! Så sulter hele landsbyen.» Hvad svarer du?', opts: [
        { t: 'At møllen og træerne begge har brug for noget: vi skal finde en vandstand, der virker for begge.', ok: true },
        { t: 'Så er det dit problem. Riv dæmningen ned.', why: 'Det løser ikke Mads\' problem — og det overbeviser ham ikke.' },
        { t: 'Du har ret. Så lader vi være.', why: 'Beviserne viser, at der er et problem. Det skal løses.' }
      ], explain: 'Gode løsninger tager højde for begge sider — og bygger på tal.' })) return;
      if (!await g.task('k2q5c', { type: 'choice', area: AR.tempo, doc: DOC_VANDSTAND, q: 'Hvilken vandstand kan både møllen og træerne leve med?', opts: [
        { t: 'Mellem 5 og 8 cm over normal', ok: true },
        { t: '15 cm over normal', why: 'Ved 15 cm får træerne grå blade.' },
        { t: '2 cm over normal', why: 'Under 5 cm står møllehjulet stille.' }
      ] })) return;
      await g.say('mads', 'Hm. Mellem fem og otte centimeter … Det kan jeg godt leve med. Men hvor lang tid tager det at sænke vandet? Jeg har lovet byen brød i morgen.');
      g.flag('k2_mads');
      await g.say('fenja', 'Det regner vi ud sammen. Gå hen til slusen og åbn den — men først skal vi vide, hvor længe den skal stå åben.');
      await on.k2q5.sluse(g);
    },
    sluse: async function (g) {
      var S = g.S;
      if (!S.flags.k2_mads) { await g.say(null, 'Slusen sidder i mølledæmningen. Den må ikke åbnes uden Mads\' tilladelse — tal med ham først.'); return; }
      if (!g.seen('k2q5d')) await g.say('fenja', 'Vandet står 35 cm over normal. Slusen sænker det med 3 cm i timen. Vi vil ned på 5 cm — så møllen stadig kan køre.');
      if (!await g.task('k2q5d', { type: 'number', area: AR.tempo, q: 'Hvor mange timer skal slusen stå åben, for at vandet går fra 35 cm til 5 cm over normal?', unit: 'timer', answer: 10,
        hint: 'Vandet skal sænkes 35 − 5 = 30 cm. Slusen tager 3 cm i timen.', near: [{ v: 12, why: '12 timer ville sænke vandet med 36 cm — for meget. Regn 30 : 3.' }, { v: 30, why: '30 cm er hvor meget, vandet skal sænkes. Spørgsmålet er, hvor mange timer det tager.' }] })) return;
      if (!await g.task('k2q5e', { type: 'number', area: AR.tempo, q: 'Efter 4 timer — hvor mange cm over normal står vandet så?', unit: 'cm', answer: 23,
        hint: 'Efter 4 timer er vandet sænket 4 · 3 = 12 cm. Træk det fra 35.', near: [{ v: 12, why: '12 cm er hvor meget, vandet er sænket. Spørgsmålet er, hvor højt det står nu.' }] })) return;
      if (!await g.task('k2q5f', { type: 'choice', area: AR.tempo, q: 'Slusen åbnes klokken 20. Hvornår står vandet 5 cm over normal?', opts: [
        { t: 'Klokken 6 næste morgen', ok: true }, { t: 'Klokken 8 næste morgen', why: '20 + 10 timer er 6 næste morgen, ikke 8.' }, { t: 'Klokken 10 i aften', why: '10 timer efter klokken 20 er ikke klokken 22 — tæl 10 timer frem.' }
      ], explain: 'Klokken 20 + 10 timer = klokken 6. Møllen kan køre til morgenbrødet.' })) return;
      await g.skill('tidsur');
      RB.audio.sfx('door');
      await g.say(null, 'Du og Mads vælter spagen om. Sluseporten løfter sig, og vandet bruser ud i åen med et dybt, jævnt drøn. Fenja skriver tiden i sin feltbog.');
      g.flag('k2_sluse'); g.refresh();
      await g.say('mads', 'Tja. Det er første gang i mit liv, jeg har ladet en lærling sænke mit vand. Men jeg har aldrig set så mange tal i én samtale. Jeg tror, I har ret.');
      g.finish('k2q5');
      await g.epilogue();
    }
  };

  // ---------------------------------------------------------------- ekstramissioner
  offer.k2s1 = async function (g) {
    await g.say('brage', 'Kom her, barn. Du har hørt, at jeg fortæller om trolden. Men mine svampe … dem tror jeg faktisk, Fenja tæller rigtigt. Hjælp mig lidt med at skille det, der er sagn, fra det, der er målt.');
    g.start('k2s1');
  };
  on.k2s1 = {
    brage: async function (g) {
      if (!await g.task('k2s1a', { type: 'sort', area: AR.iagttag, q: 'Sortér, hvad der er sagn, og hvad der kan måles.', cats: ['Kan måles og tælles', 'Sagn og fortælling'], items: [
        { t: 'Der var 48 lysende svampe i uge 1, men kun 12 i uge 5.', c: 0 }, { t: 'Svampene lyser, fordi Grum sætter lys til dem.', c: 1 },
        { t: 'Jorden under svampene er blevet tørrere.', c: 0 }, { t: 'Svampene kommer tilbage, når trolden er glad.', c: 1 }
      ] })) return;
      if (!await g.task('k2s1b', { type: 'number', area: AR.tabel, doc: DOC_SVAMPE, q: 'Hvor mange procent færre svampe var der i uge 5 end i uge 1?', unit: '%', answer: 75,
        hint: '48 → 12. Det er en fjerdedel tilbage. Hvor mange procent er væk?', near: [{ v: 36, why: '36 er forskellen i antal (48 − 12). Spørgsmålet er procent.' }, { v: 25, why: '25 % er det, der er tilbage — spørgsmålet er, hvor mange der er forsvundet.' }] })) return;
      await g.say('brage', 'Femoghalvfjerds procent … så er det altså ikke Grum, der har taget dem, men noget, man kan se i tallene. Jeg fortæller stadig om ham, men nu med et lille «men».');
      g.gold(10); g.finish('k2s1');
    }
  };
  offer.k2s2 = async function (g) {
    await g.say('tuk', 'Du kan regne, hører jeg. Jeg skal levere kul til smeden i Runeborg, men jeg har glemt, hvor meget træ jeg skal bruge. Femten kilo træ giver tre kilo kul, har jeg engang lært.');
    g.start('k2s2');
  };
  on.k2s2 = {
    tuk: async function (g) {
      if (!await g.task('k2s2a', { type: 'number', area: AR.tempo, q: 'Femten kilo træ giver tre kilo kul. Hvor mange kilo træ skal der bruges til 12 kilo kul?', unit: 'kg træ', answer: 60,
        hint: '12 kg kul er 4 gange så meget som 3 kg kul.', near: [{ v: 27, why: 'Du har lagt 12 − 3 = 9 til 15 — men opskrifter skal ganges, ikke lægges sammen.' }] })) return;
      if (!await g.task('k2s2b', { type: 'number', area: AR.procent, q: 'Hvor mange procent af træets vægt bliver til kul?', unit: '%', answer: 20,
        hint: '3 kg ud af 15 kg. Hvor mange gange går 3 op i 15? Det er 5 — så er det en femtedel.', near: [{ v: 5, why: '5 er, hvor mange gange 3 går op i 15. Spørgsmålet er procent.' }] })) return;
      await g.say('tuk', 'En femtedel — tyve procent. Det passer med mine fingre. Nu ved jeg, hvor mange stammer jeg skal hente. Her, en lille sæk kul til din tur.');
      g.gold(15); g.finish('k2s2');
    }
  };

  // ---------------------------------------------------------------- når der ikke er noget særligt
  function pick(arr, S) { return arr[(S.talks = (S.talks || 0) + 1) % arr.length]; }
  idle.fenja = function (g) {
    var klaret = g.S.flags.k2_lys;
    return g.say('fenja', klaret ? 'Tre nye skud på hvert af de grå træer. Jeg har skrevet det i feltbogen — med dato og tal, naturligvis.' : pick(['Skriv først, hvad du ser. Tænk bagefter.', 'Et tal er en ven. Et rygte er en gæst, der ikke vil gå.', 'Brug dagbogen, hvis du er i tvivl om, hvad vi mangler.'], g.S));
  };
  idle.tuk = function (g) { return g.say('tuk', g.S.flags.k2_lys ? 'Røgen stiger lige op igen. Og nu ved jeg, at det ikke var den, der tog træerne. Det er en skøn følelse.' : 'Jeg brænder kun kul på vindstille dage. Jeg er ikke en skurk — bare sort i hovedet.'); };
  idle.brage = function (g) { return g.say('brage', g.S.flags.k2_lys ? 'Se, svampene lyser igen! Måske havde Grum bare brug for nogle gode tal, så han kunne slappe af.' : pick(['Ved du, hvad en fortælling er værd? Præcis så meget, som den kan tåle at blive spurgt om.', 'Sæt dig ned et øjeblik. Bålet er varmt, og skoven lytter.'], g.S)); };
  idle.mads = function (g) { return g.say('mads', g.S.flags.k2_sluse ? 'Vandet falder. Jeg bager morgenbrødet uden strøm i dag — men med en god samvittighed.' : 'Jeg har travlt. Dæmningen kan ikke bare rives ned, vel?'); };
  placeIdle.sign_skov = function (g) { return g.say(null, 'MOSEKROGEN — landsby med mølle, mos og et par gamle ugler. (Uglerne er ikke hjemme for tiden.)'); };
  placeIdle.sign_fenja = function (g) { return g.say(null, 'SKOVFOGED FENJA — feltstation. Rør ikke ved potteplanterne. De er videnskab.'); };
  placeIdle.sign_moelle = function (g) { return g.say(null, 'MOSEKROGENS MØLLE — alt malet korn bliver til brød inden for et døgn.'); };
  placeIdle.baal = function (g) { return g.say(null, g.S.flags.k2_lys ? 'Bålet knitrer. Rundt om stenene lyser små, blågrønne svampe som lanterner.' : 'Et bål i midten af en stencirkel. Rundt om er der pladser til dem, der vil lytte til Brages fortællinger.'); };
  placeIdle.kulmile = function (g) { return g.say(null, 'Tuks kulmile. Den ligner en stor, rygende jordhøj. Du kan mærke varmen på afstand.'); };
  placeIdle.fkort = function (g) { return g.say(null, 'Et kort over Mosekrogen. Fenja har sat røde nåle i mosen — dem, der er grå, er mange.'); };
  placeIdle.fbord = function (g) { return g.say(null, 'Fenjas arbejdsbord med notater, målebånd og en sammenfoldet kikkert.'); };
  placeIdle.sluse = function (g) { return g.say(null, g.S.flags.k2_sluse ? 'Sluseporten står åben. Vandet bruser ud i åen.' : 'Mølledæmningens sluse. Porten er lukket med en tung træbjælke.'); };

  // ---------------------------------------------------------------- afslutningen
  async function sceneSlut(g) {
    await g.say(null, 'Tre uger senere. Fenja har bedt dig komme tilbage, før du rejser hjem.');
    await g.flyt('skov', 20, 9, 'up', 'skov');
    g.flag('k2_lys'); g.refresh();
    await g.say('fenja', 'Vandstanden har ligget på fem-seks centimeter siden den første nat. Se på det grå træ dér — to friske skud. Og se på stien.');
    await g.say(null, 'Langs stien tænder små, blågrønne lys sig, én efter én. De lysende svampe er kommet tilbage.');
    await g.say('brage', 'Jeg har aldrig set det før, barn. Jeg troede, jeg kendte skoven. Men jeg lærte noget i dag: man kan godt elske en historie og alligevel tjekke den.');
    await g.say('mads', 'Møllen kører. Brødet dufter. Og jeg har lovet at måle vandet hver uge — med Fenjas målebånd.');
    await g.say('tuk', 'Og jeg har lovet at brænde kul på vindstille dage. Det plejer jeg at gøre.');
    await g.say('fenja', 'Du tænkte som en rigtig forsker, {navn}: først se, så gætte, så prøve af. Mosekrogen er dig tak skyldig.');
  }

  K0.tilfoej({
    kap: 2,
    areas: A,
    cando: [
      ['iagttag', 'skelne det, jeg ser, fra det, jeg tror'],
      ['hypotese', 'finde ud af, hvilke forklaringer man kan prøve af'],
      ['tabel', 'aflæse tabeller og grafer og se en tendens'],
      ['aarsag', 'skelne sammenhæng fra årsag'],
      ['gentag', 'planlægge en fair test med gentagelser'],
      ['tempo', 'regne med tid og tempo']
    ],
    npcs: npcs, things: things, runes: runes, places: places, placePos: placePos, lockedDoors: lockedDoors,
    clues: clues, skills: skills, quests: quests, on: on, offer: offer, idle: idle, placeIdle: placeIdle,
    meta: {
      navn: 'Skoven ved Mosekrogen',
      kort: 'Tre dage efter høstfesten. En skovlandsby, grå træer og en vred trold?',
      tilbud: 'Der er kommet en post-due fra Mosekrogen, en lille skovlandsby øst for byen. Træerne ved mosen er blevet grå, og landsbyen frygter en trold. Hilde har bedt om dig. Kommer du med?',
      start: { map: 'skov', x: 20, y: 28, dir: 'up' },
      tod: function (S) {
        if (S.flags.k2_lys) return 'nat';
        if (S.q.k2q5 === 'active') return 'aften';
        if (S.q.k2q3 === 'done') return 'eftermiddag';
        return 'morgen';
      },
      efterTitel: 'Mosekrogen har det godt',
      efterMaal: 'Gå en tur langs de lysende svampe — og find de sidste runestykker',
      efter: { npc: 'fenja' },
      sider: ['k2s1', 'k2s2'],
      intro: intro,
      slut: {
        titel: 'Mosekrogen er reddet!',
        tekst: 'Træerne får nye skud, svampene lyser igen, og møllen kører. Det var ikke en trold, der havde gjort det — det var vand, og I fandt det med tællinger, målinger og en fair test. Her er, hvad du har vist, at du kan:',
        rundt: 'Gå en tur i skoven',
        scene: sceneSlut
      }
    }
  });
})();
