/* Runeborg — kapitel 3: Havnen i Saltvig
   Kongevejen mod syd er tørret ud, og Brynja sender dig til havnebyen Saltvig. Fyrets lampe er gået
   ud, skibet Stormfuglen er forsinket, og byen skændes om, hvem der snyder med vægten.

   Fagligt er kapitlet bygget på det, danske elever klarede dårligst i PISA 2025 i læsning og
   hverdagsmatematik: at finde oplysninger i tabeller og lister, at skelne fakta fra holdning og vurdere
   kilder — og at regne med procent, forhold, målestok, tempo og tid. Alt er knyttet til én handling,
   så hver opgave bygger på den forrige.

   Alt, der hører til kapitlet, har id'er med k3 foran. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};
  var K0 = RB.content, AREA = K0.AREA;

  var A = {
    tabel3: 'Læsning · Find i tabeller',
    kilde3: 'Læsning · Kilder og vidner',
    procent3: 'Matematik · Rabat og procent',
    kort3: 'Matematik · Søkort og målestok',
    tempo3: 'Matematik · Fart, tid og afstand',
    tidevand: 'Naturfag · Tidevand og mønstre'
  };
  var AR = Object.assign({}, AREA, A);

  function at(map, x, y, dir) { return function (S) { return S.kap === 3 ? { map: map, x: x, y: y, dir: dir || 'down' } : null; }; }

  // ---------------------------------------------------------------- dokumenter og diagrammer
  var DOC_SKIBE = { kind: 'notice', title: 'HAVNETAVLEN — skibe i Saltvig', html:
    '<table><tr><th>Skib</th><th>Fra</th><th>Last</th><th>Ventes</th></tr>' +
    '<tr><td>Måneskæret</td><td>Brandvig</td><td>Tørret torsk</td><td>mandag</td></tr>' +
    '<tr><td>Sølvmåge</td><td>Nordhavn</td><td>Salt og tov</td><td>tirsdag</td></tr>' +
    '<tr><td>Stormfuglen</td><td>Sydkysten</td><td>Vinterkorn og lampeolie</td><td>onsdag — <b>endnu ikke ankommet</b></td></tr>' +
    '<tr><td>Havørnen</td><td>Brandvig</td><td>Træ</td><td>torsdag</td></tr></table>' };
  var DOC_ORLA = { kind: 'letter', title: 'Orlas besked på havnetavlen', lines: [
    'Fyrets lampe gik ud i nat — olien er brugt op.',
    'Stormfuglen skulle have bragt ny olie i går, men er forsinket.',
    'Fyrpasser Maja har brug for 40 liter olie, før det bliver mørkt.',
    'Alle, der kan hjælpe, bedes henvende sig på havnekontoret.'
  ], by: '— Orla, havnefoged' };
  var DOC_PRISER = { kind: 'notice', title: 'Sildemarkedet i dag', html:
    '<table><tr><th>Bod</th><th>Vare</th><th>Pris</th></tr>' +
    '<tr><td>Tilde</td><td>Sild, 4 kg-kasse</td><td>32 guld</td></tr>' +
    '<tr><td>Rane</td><td>Sild, 6 kg-kasse</td><td>54 guld — <b>i dag 20 % rabat!</b></td></tr>' +
    '<tr><td>Fiskehallen</td><td>Sild, 10 kg-kasse</td><td>90 guld — <b>køb 2, betal for 1,5</b></td></tr></table>' };
  var DOC_OLIE = { kind: 'notice', title: 'Lampeolie til fyret', html:
    '<table><tr><th>Sælger</th><th>Dunk</th><th>Pris</th></tr>' +
    '<tr><td>Rane</td><td>8 liter</td><td>48 guld</td></tr>' +
    '<tr><td>Tilde</td><td>5 liter</td><td>25 guld</td></tr>' +
    '<tr><td>Fiskehallen</td><td>12 liter</td><td>66 guld</td></tr></table>' };
  var DOC_VAEGT = { kind: 'letter', title: 'Ranes kontrolvejning — Orlas vægt mod tre prøvelodder', html:
    '<table><tr><th>Lod (rigtig vægt)</th><th>Vægten viser</th></tr>' +
    '<tr><td>1 kg</td><td>0,95 kg</td></tr>' +
    '<tr><td>5 kg</td><td>4,75 kg</td></tr>' +
    '<tr><td>10 kg</td><td>9,50 kg</td></tr></table>' };
  var DOC_RANE = { kind: 'pamphlet', title: 'RANES VARER — ALTID RET OG RIMELIGT', lines: [
    'Rane Handelshus har aldrig snydt en eneste kunde.',
    'Havnefoged Orla har selv ansvaret for vægten, og hun passer ikke på den.',
    'Alle ved, at Orla tager imod gaver fra de skibe, der kommer ind.',
    'Køb hos Rane — så er du sikker!'
  ], by: '— Rane, købmand' };
  var DOC_LOG = { kind: 'log', title: 'Havnekontorets vejejournal (uddrag)', lines: [
    'Mandag: Vægten kontrolleret med prøvelodder. Viser 5 % for lidt.',
    'Tirsdag: Vægten kontrolleret igen — samme afvigelse. Skruen i vægtarmen er slidt.',
    'Onsdag: Ny skrue bestilt hos smeden i Runeborg. Alle vejninger noteres med afvigelse.',
    'Torsdag: Rane protesterer. Han vejer selv sine kasser på sin egen vægt.'
  ], by: 'Afskrift af Orlas journal' };
  var DOC_SOEMAND = { kind: 'pamphlet', title: 'Gamle Søren fortæller', lines: [
    'Der er en rev ved Tandskær, som æder skibe. Jeg har set den med mine egne øjne, og jeg sejlede forbi dengang.',
    'Man kan altid se, hvor revet er, for der er skum på vandet. Men skummet kan snyde.',
    'Min far sagde: «Sejl aldrig forbi Tandskær i mørke.» Det har jeg aldrig gjort.'
  ], by: '— Søren, pensioneret skipper' };
  var DOC_KORT = { kind: 'letter', title: 'Søkort over farvandet ved Saltvig', html:
    '<svg viewBox="0 0 420 220" style="width:100%;height:auto;display:block" font-family="Atkinson Hyperlegible, Verdana, sans-serif" font-size="14">' +
    '<rect x="0" y="0" width="420" height="220" fill="#bcd8ea"/>' +
    '<path d="M0 190 C60 170 120 200 200 185 S340 170 420 190 L420 220 L0 220 Z" fill="#ead6a6"/>' +
    '<path d="M280 40 L330 60 L310 100 L270 90 Z" fill="#8a7a6a" stroke="#3a2616" stroke-width="2"/><text x="272" y="34" fill="#3a2616">Tandskær</text>' +
    '<line x1="70" y1="170" x2="190" y2="110" stroke="#8a2a2a" stroke-width="4" stroke-dasharray="10 6"/>' +
    '<line x1="190" y1="110" x2="320" y2="130" stroke="#8a2a2a" stroke-width="4" stroke-dasharray="10 6"/>' +
    '<rect x="50" y="165" width="40" height="22" fill="#a02e38" stroke="#3a2616" stroke-width="3"/><text x="40" y="206" fill="#3a2616">Saltvig</text>' +
    '<circle cx="190" cy="110" r="8" fill="#e0a82c" stroke="#3a2616" stroke-width="2"/><text x="170" y="96" fill="#3a2616">Fyrbøjen</text>' +
    '<circle cx="320" cy="130" r="8" fill="#2c4a9c" stroke="#3a2616" stroke-width="2"/><text x="236" y="152" fill="#3a2616">Stormfuglen sidst set</text>' +
    '<text x="124" y="146" fill="#8a2a2a" font-weight="bold">4 cm</text><text x="232" y="112" fill="#8a2a2a" font-weight="bold">6,5 cm</text>' +
    '<rect x="20" y="20" width="40" height="8" fill="#3a2616"/><rect x="60" y="20" width="40" height="8" fill="#fff" stroke="#3a2616" stroke-width="2"/>' +
    '<text x="22" y="46" fill="#3a2616">1 cm = 2 km</text>' +
    '</svg>' };
  var DOC_TIDE = { kind: 'notice', title: 'Tidevandstavle — vand over rendens bund (meter)', html:
    '<table><tr><th>Klokken</th><th>16</th><th>18</th><th>20</th><th>22</th><th>24</th><th>02</th></tr>' +
    '<tr><td>Vand over bunden</td><td>0,8</td><td>1,6</td><td>2,6</td><td>3,2</td><td>2,5</td><td>1,5</td></tr></table>' +
    '<p style="margin-top:8px">Stormfuglen stikker 2,4 meter. Der skal være mindst 2,4 meter vand over rendens bund, for at hun kan sejle ind.</p>' };
  var CH_TIDE = { kind: 'line', title: 'Vand over rendens bund (meter) — tidevandet i aften', labels: ['16', '18', '20', '22', '24', '02'], values: [0.8, 1.6, 2.6, 3.2, 2.5, 1.5], max: 4, marker: { at: 3, label: 'Højvande' }, xlabel: 'Klokken' };
  var DOC_SIGNAL = { kind: 'letter', title: 'Fyrets signalbog', html:
    '<table><tr><th>Signal</th><th>Betyder</th></tr>' +
    '<tr><td>Kort – kort – lang</td><td>Rendens løb er åbent — sejl ind</td></tr>' +
    '<tr><td>Lang – lang</td><td>Vent — vandet er for lavt</td></tr>' +
    '<tr><td>Kort – lang – kort</td><td>Fare — vend om</td></tr></table>' };

  // ---------------------------------------------------------------- personer
  var npcs = {
    orla: { name: 'Orla, havnefoged', look: { hair: '#7a3a1a', cloth: '#2a3a6a', hat: 'beret', hatColor: '#1a2a5a', skin: '#e8b890', accent: '#e0a82c' }, pos: at('havn', 12, 11, 'right') },
    rane: { name: 'Rane, købmand', look: { hair: '#1a1a1a', cloth: '#8a2a3a', hat: 'tophat', hatColor: '#2a1a2a', beard: true, beardColor: '#1a1a1a', skin: '#f0c8a0', accent: '#e0a82c' }, pos: at('havn', 24, 15, 'down') },
    tilde: { name: 'Tilde, fiskerkone', look: { hair: '#c86a3a', cloth: '#3a6a8a', skin: '#f0c090', hat: 'hood', hatColor: '#3a6a8a' }, pos: at('havn', 18, 14, 'down') },
    soeren: { name: 'Gamle Søren', look: { hair: '#e8e8e8', beard: true, beardColor: '#e8e8e8', cloth: '#3a4a6a', skin: '#d0a078', hat: 'beret', hatColor: '#3a3a5a' }, pos: at('havn', 28, 10, 'up') },
    maja: {
      name: 'Maja, fyrpasser', look: { hair: '#f0d890', cloth: '#6a3a3a', skin: '#f4d0a8', hat: 'hood', hatColor: '#4a2a2a' },
      pos: function (S) { if (S.kap !== 3) return null; return S.q.k3q5 === 'active' ? { map: 'fyr', x: 4, y: 5, dir: 'down' } : { map: 'havn', x: 39, y: 10, dir: 'down' }; }
    }
  };
  var things = [];
  var runes = [
    { id: 'r13', map: 'havn', x: 8, y: 7, where: 'På den vestlige mole', title: 'Om tidevand', t: 'Havet stiger og falder to gange i døgnet, fordi Månen trækker i vandet. Havnefogeder lærer tidevandstavlen udenad, for et skib på grund koster mere end en vægt.' },
    { id: 'r14', map: 'havn', x: 20, y: 27, where: 'Bag fiskehallen', title: 'Om sild', t: 'Sildestimer kan være mange kilometer lange. Fiskerne siger, at man kan høre dem: et svagt knitren som sne, der falder på vand.' },
    { id: 'r15', map: 'havnekontor', x: 11, y: 4, where: 'På havnekontoret', title: 'Om lodder', t: 'En vægt er kun så god som sine lodder. Derfor ligger Saltvigs prøvelodder i en aflåst kasse — og bliver vejet af en anden, hvert halve år.' },
    { id: 'r16', map: 'fyr', x: 7, y: 4, where: 'Øverst i fyret', title: 'Om fyr', t: 'Hvert fyr har sit eget mønster af lys, så skippere kan se, hvilket fyr det er. Saltvigs fyr blinker tre gange hurtigt og holder så pause.' }
  ];
  var places = {
    'havn:22,11': 'tavle3', 'havn:11,20': 'sign_havn', 'havn:33,20': 'sign_fyr', 'havn:10,11': 'rack', 'havn:20,11': 'rack', 'havn:31,11': 'rack',
    'havnekontor:6,4': 'vaegt', 'fyr:4,1': 'lampe', 'fyr:4,4': 'signalbog'
  };
  var placePos = { tavle3: ['havn', 22, 11], vaegt: ['havnekontor', 6, 4], lampe: ['fyr', 4, 1], kaj: ['havn', 20, 10] };
  var lockedDoors = {
    'havn:36,17': 'Ranes pakhus. Døren er låst, og der står vagt — Rane har travlt indenfor.',
    'havn:7,26': 'Kroen «Det Salte Anker». Der lyder trækharmonika indenfor.',
    'havn:16,26': 'Fiskehallen. Dørene er åbne, men der er lukket for i dag.',
    'havn:27,26': 'Et hus. Nogen har hængt fisk til tørre uden for vinduet.',
    'havn:36,26': 'Et hus. Gardinerne er trukket for.'
  };

  // ---------------------------------------------------------------- spor og evner
  var clues = {
    c3_tavle: { t: 'Stormfuglen skulle have været i havn i onsdags med 40 liter lampeolie, men er ikke kommet.', src: 'Havnetavlen og Orlas besked — kan tjekkes', evidence: true },
    c3_vaegt: { t: 'Havnevægten viser 5 % for lidt: 1 kg vejer 0,95, 5 kg vejer 4,75, 10 kg vejer 9,5.', src: 'Kontrolvejning med prøvelodder', evidence: true },
    c3_journal: { t: 'Orlas journal noterer afvigelsen allerede mandag og har bestilt en ny skrue.', src: 'Havnekontorets journal — dateret', evidence: true },
    c3_rane: { t: 'Rane påstår, at Orla tager imod gaver, og at hun snyder med vægten.', src: 'Ranes folder — han tjener selv på sagen', weak: true, why: 'Rane skriver om Orla uden beviser — og han har selv fordel af, at folk mister tilliden til vægten.' },
    c3_soeren: { t: 'Søren siger, at der er en rev ved Tandskær, som æder skibe.', src: 'Et gammelt sagn — men revet er rigtigt nok', weak: true, why: 'Det er en gammel historie. Revet findes dog på søkortet — og dét er et bevis.' },
    c3_tide: { t: 'Højvande er klokken 22 med 3,2 meter. Stormfuglen skal have mindst 2,4 meter, så renden er åben fra cirka klokken 20 til 23.', src: 'Tidevandstavlen', evidence: true }
  };
  var skills = {
    tabeller: { name: 'Tabelblikket', desc: 'Du finder hurtigt det rigtige tal i en tabel og tjekker, at det passer til spørgsmålet.' },
    handelsblik: { name: 'Handelsblikket', desc: 'Du regner rabat og pris pr. enhed — og lader dig ikke narre af et stort «20 % rabat!».' },
    vidnet: { name: 'Vidnernes ven', desc: 'Du spørger, hvem der fortæller, hvad de har set selv, og hvad de tjener ved at fortælle det.' },
    kortlaeser: { name: 'Søkortets passer', desc: 'Du kan regne afstande i virkeligheden ud fra et søkorts målestok.' },
    fartogtid: { name: 'Fart og tid', desc: 'Du ved: afstand = fart × tid. Så kan du finde en af dem, når du kender de to andre.' },
    taarnur: { name: 'Fyrvogterens ur', desc: 'Du kan aflæse tidevandet og se, hvornår der er vand nok til at sejle.' }
  };

  // ---------------------------------------------------------------- missioner
  var ACT1 = 'Kapitel 3 · Akt 1 · Ankomst', ACT2 = 'Kapitel 3 · Akt 2 · Vægtsagen', ACT3 = 'Kapitel 3 · Akt 3 · Natten på havet';
  var quests = [
    { id: 'k3q0', act: ACT1, title: 'Havnetavlen', desc: 'Find ud af, hvad der er galt i Saltvig, ved at læse tavlen og Orlas besked.', target: function () { return 'tavle3'; }, goal: 'Læs havnetavlen på torvet' },
    { id: 'k3q1', act: ACT1, title: 'Sildemarkedet', desc: 'Find de bedste priser på olie og fisk — og regn rabatterne efter.', requires: ['k3q0'], uses: 'Hvilken olie skal bruges, og hvor meget?', target: function () { return 'tilde'; }, goal: 'Tal med Tilde ved fiskebodene' },
    { id: 'k3q2', act: ACT2, title: 'Vægtsagen', desc: 'Rane siger, at Orla snyder med vægten. Hvem har ret? Undersøg kilderne og tallene.', requires: ['k3q1'], uses: 'Handelsblikket: priserne, vi lige regnede på', target: function (S) { if (!S.flags.k3_rane) return 'rane'; return 'vaegt'; }, goal: function (S) { return S.flags.k3_rane ? 'Undersøg vægten på havnekontoret' : 'Hør Ranes version ved boderne'; } },
    { id: 'k3q3', act: ACT2, title: 'Søkortet', desc: 'Regn afstanden ud til det sted, hvor Stormfuglen sidst blev set.', requires: ['k3q2'], uses: 'Orlas journal og Ranes folder', target: function () { return 'soeren'; }, goal: 'Tal med Gamle Søren på kajen' },
    { id: 'k3q4', act: ACT3, title: 'Tidevand og tid', desc: 'Aflæs tidevandstavlen, og find ud af, hvornår Stormfuglen kan sejle ind.', requires: ['k3q3'], uses: 'Søkortets afstand', target: function () { return 'orla'; }, goal: 'Tal med Orla om tidevandet' },
    {
      id: 'k3q5', act: ACT3, title: 'Fyret', desc: 'Få fyret tændt og guide Stormfuglen sikkert ind i aften.', requires: ['k3q4'], uses: 'Alt, du har lært',
      target: function (S) { if (!S.flags.k3_olie) return 'maja'; return 'lampe'; },
      goal: function (S) { return S.flags.k3_olie ? 'Tænd lampen øverst i fyret' : 'Tal med Maja ved fyret'; }
    },
    { id: 'k3s1', act: 'Ekstramissioner', side: true, title: 'Fiskekassen', desc: 'Hjælp Tilde med at fordele fisk i kasser.', requires: ['k3q1'], giver: 'tilde', uses: 'Handelsblikket', target: function () { return 'tilde'; }, goal: 'Tal med Tilde' },
    { id: 'k3s2', act: 'Ekstramissioner', side: true, title: 'Sørens revhistorie', desc: 'Find ud af, hvad der er sandt i Sørens gamle fortælling.', requires: ['k3q3'], giver: 'soeren', uses: 'Vidnernes ven', target: function () { return 'soeren'; }, goal: 'Tal med Søren på kajen' }
  ];

  // ---------------------------------------------------------------- dialog og handling
  var on = {}, offer = {}, idle = {}, placeIdle = {};

  async function intro(g) {
    await g.say(null, 'Kongevejen mod syd er endelig tørret ud, og Brynja har sendt dig afsted med en lille vogn. Mod aften dufter luften pludselig af tang, tjære og saltvand.');
    await g.say(null, 'Foran dig ligger Saltvig: en havn med røde tage, moler, der stikker ud i havet — og et fyr på næsset, hvor lyset skulle have været tændt. Men det er mørkt.');
    g.start('k3q0', true);
    await g.say(null, 'På torvet hænger en tavle fuld af skibe og beskeder. Måske er svaret derinde.');
  }

  on.k3q0 = {
    tavle3: async function (g) {
      if (!g.seen('k3q0a')) await g.say(null, 'Havnetavlen: en liste over skibe, en besked fra Orla — og en lang række tal. Du læser den langsomt.');
      if (!await g.task('k3q0a', { type: 'choice', area: AR.tabel3, doc: DOC_SKIBE, q: 'Hvilket skib er forsinket?', opts: [
        { t: 'Stormfuglen', ok: true }, { t: 'Måneskæret', why: 'Måneskæret ventes mandag — og står ikke som forsinket.' }, { t: 'Havørnen', why: 'Havørnen ventes først torsdag.' }
      ], explain: 'I tabellen står det tydeligt i sidste kolonne: «endnu ikke ankommet».' })) return;
      if (!await g.task('k3q0b', { type: 'multi', area: AR.tabel3, doc: DOC_SKIBE, q: 'Hvad fragter Stormfuglen? Vælg alle, der passer.', opts: [
        { t: 'Vinterkorn', ok: true }, { t: 'Lampeolie', ok: true },
        { t: 'Tørret torsk', why: 'Tørret torsk er Måneskærets last.' }, { t: 'Salt og tov', why: 'Det er Sølvmågens last.' }
      ] })) return;
      if (!await g.task('k3q0c', { type: 'pick', area: AR.tabel3, doc: DOC_ORLA, q: 'Hvor mange liter olie har fyrpasser Maja brug for? Klik på sætningen, der fortæller det.', answer: 2,
        whyLine: { 0: 'Den fortæller, at lampen er gået ud — men ikke hvor meget olie, der skal bruges.', 1: 'Den handler om Stormfuglen, ikke om, hvor meget olie Maja skal have.', 3: 'Den er en opfordring.' } })) return;
      g.clue('c3_tavle');
      await g.skill('tabeller');
      await g.say(null, 'Så er det klart: Stormfuglen har lampeolie med, og uden olie kan fyret ikke tændes. Men der er også andre veje til olie — Saltvig har et marked.');
      await g.say(null, 'Orla står ved havnekontoret, og fiskerkonen Tilde står ved boderne. Tal med Tilde — hun ved, hvad olie og fisk koster.');
      g.finish('k3q0'); g.start('k3q1');
    }
  };

  on.k3q1 = {
    tilde: async function (g) {
      if (!g.seen('k3q1a')) {
        await g.say('tilde', 'En ny lærling! Olie, siger du? Jeg har fem liter til 25 guld. Men Rane har større dunke, og fiskehallen har endnu større. Og så er der rabatterne … regn selv efter. Det bedste tilbud er sjældent det, der skriger højest.');
      }
      if (!await g.task('k3q1a', { type: 'number', area: AR.procent3, doc: DOC_OLIE, q: 'Hvad koster én liter olie hos Rane?', unit: 'guld pr. liter', answer: 6, tol: 0.001,
        hint: 'Del prisen med antallet af liter: 48 : 8.', near: [{ v: 0.17, why: 'Du har delt 8 med 48. Spørgsmålet er guld pr. liter.' }] })) return;
      if (!await g.task('k3q1b', { type: 'choice', area: AR.procent3, doc: DOC_OLIE, q: 'Hvem har den billigste olie pr. liter?', opts: [
        { t: 'Tilde (25 : 5 = 5 guld)', ok: true },
        { t: 'Fiskehallen (66 : 12 = 5,50 guld)', why: 'Fiskehallen: 66 : 12 = 5,50 guld pr. liter — dyrere end Tilde.' },
        { t: 'Rane (48 : 8 = 6 guld)', why: 'Rane er dyrest med 6 guld pr. liter.' }
      ], explain: 'Tilde: 5,00 · Fiskehallen: 5,50 · Rane: 6,00. Den mindste dunk er billigst — men Tilde har kun fem liter, og Maja skal bruge 40.' })) return;
      await g.say('tilde', 'Jeg har kun fem liter, desværre. Du får aldrig 40 liter hos mig. Men tag mit tilbud som målestok, når du kigger på priserne.');
      if (!await g.task('k3q1c', { type: 'number', area: AR.procent3, doc: DOC_PRISER, q: 'Rane giver 20 % rabat på sin sildekasse til 54 guld. Hvad koster kassen efter rabat?', unit: 'guld', answer: 43.2, tol: 0.01,
        hint: '20 % er en femtedel. 54 : 5 = 10,8. Træk det fra 54.', near: [{ v: 10.8, why: '10,8 er selve rabatten. Hvad koster kassen, når rabatten er trukket fra?' }, { v: 34, why: '20 % er ikke 20 guld. Regn 20 % af 54.' }] })) return;
      if (!await g.task('k3q1d', { type: 'number', area: AR.procent3, doc: DOC_PRISER, q: 'Fiskehallen: «Køb 2, betal for 1,5.» To kasser koster normalt 2 · 90 = 180 guld. Hvad koster de to kasser med tilbuddet?', unit: 'guld', answer: 135,
        hint: '1,5 kasse koster 1,5 · 90.', near: [{ v: 90, why: '90 er prisen for én kasse. Tilbuddet er, at man betaler for halvanden.' }] })) return;
      if (!await g.task('k3q1e', { type: 'choice', area: AR.procent3, doc: DOC_PRISER, q: 'Hvem sælger sild billigst pr. kilo? Regn efter: Tilde 32 : 4, Rane 43,2 : 6 og Fiskehallen 135 : 20 (to kasser med tilbuddet).', opts: [
        { t: 'Tilde — 8,00 guld pr. kilo', why: 'Tilde: 32 : 4 = 8,00 guld pr. kilo. Det er dyrest.' },
        { t: 'Rane — 7,20 guld pr. kilo, efter rabat', why: 'Rane: 43,2 : 6 = 7,20 guld pr. kilo. Billigere end Tilde — men ikke billigst.' },
        { t: 'Fiskehallen — 6,75 guld pr. kilo, når man køber to kasser', ok: true }
      ], explain: 'Fiskehallen med tilbud: 6,75. Rane med rabat: 7,20. Tilde: 8,00. Et stort «20 % rabat!» er ikke altid det bedste tilbud.' })) return;
      await g.skill('handelsblik');
      await g.say('tilde', 'Du kan regne! Så tag nogle gode råd med: Rane taler højest om rabatter, men han er ikke altid den billigste. Han er sur på Orla for tiden — spørg ham, hvad der er galt.');
      g.finish('k3q1'); g.start('k3q2');
    }
  };

  on.k3q2 = {
    rane: async function (g) {
      var S = g.S;
      if (!S.flags.k3_rane) {
        await g.say('rane', 'Ah, en lærling! Du har sikkert hørt, at fyret er mørkt. Det er Orlas skyld. Hun passer ikke på sin vægt, og hun tager imod gaver fra skibene. Alle ved det.');
        await g.say('rane', 'Her er min folder. Læs den, og tag selv stilling.');
        g.flag('k3_rane'); g.clue('c3_rane');
      }
      if (!await g.task('k3q2a', { type: 'sort', area: AR.kilde3, doc: DOC_RANE, q: 'Sortér udsagnene i Ranes folder.', help: 'Et fakta-udsagn kan tjekkes. En holdning eller en påstand uden bevis kan ikke.',
        cats: ['Kan tjekkes', 'Påstand uden bevis'], items: [
          { t: 'Orla har selv ansvaret for vægten.', c: 0 }, { t: 'Orla passer ikke på vægten.', c: 1 },
          { t: 'Alle ved, at Orla tager imod gaver.', c: 1 }, { t: 'Rane Handelshus har aldrig snydt en eneste kunde.', c: 1 }
        ] })) return;
      if (!await g.task('k3q2b', { type: 'choice', area: AR.kilde3, doc: DOC_RANE, q: 'Hvorfor skal man være forsigtig med at tro på Ranes folder?', opts: [
        { t: 'Rane tjener selv på, at folk køber hos ham i stedet for at stole på havnens vægt.', ok: true },
        { t: 'Fordi folderen er skrevet på papir.', why: 'Papir gør hverken folder bedre eller dårligere. Se på, hvem der har skrevet den, og hvad de tjener.' },
        { t: 'Fordi Rane er højere end Orla.', why: 'Højde har ikke noget med troværdighed at gøre.' }
      ], explain: 'Når den, der anklager, selv har noget at vinde, skal man ekstra grundigt tjekke, hvad der faktisk er bevist.' })) return;
      await g.say('rane', 'Hm. Du gider vel at tjekke, hvis jeg siger, at jeg kan bevise det? Gå ind på havnekontoret og vej selv. Orla tør nok ikke.');
    },
    vaegt: async function (g) {
      var S = g.S;
      if (!S.flags.k3_rane) { await g.say(null, 'En stor, gammeldags vægt med to skåle. Du bør høre Ranes version først — så ved du, hvad du skal tjekke.'); return; }
      if (!g.seen('k3q2c')) {
        await g.say('orla', 'Du har hørt Rane, ser jeg. Jeg skal ikke blande mig. Her er mine prøvelodder — vej dem på vægten, og skriv ned, hvad den viser.');
      }
      if (!await g.task('k3q2c', { type: 'choice', area: AR.procent3, doc: DOC_VAEGT, q: 'Hvad viser kontrolvejningen?', opts: [
        { t: 'Vægten viser lidt for lidt — hver gang.', ok: true },
        { t: 'Vægten viser lidt for meget.', why: 'Se på tallene: 0,95 er mindre end 1.' },
        { t: 'Vægten er helt rigtig.', why: 'Hverken 0,95, 4,75 eller 9,50 er lig med lodderne.' }
      ] })) return;
      if (!await g.task('k3q2d', { type: 'number', area: AR.procent3, doc: DOC_VAEGT, q: 'Hvor mange procent for lidt viser vægten? Brug 10 kg-loddet: det vejes til 9,5 kg.', unit: '%', answer: 5,
        hint: 'Forskellen er 10 − 9,5 = 0,5 kg. Hvor mange procent er 0,5 af 10?', near: [{ v: 0.5, why: '0,5 kg er forskellen. Spørgsmålet er, hvor mange procent det er af 10 kg.' }] })) return;
      if (!await g.task('k3q2e', { type: 'number', area: AR.procent3, doc: DOC_VAEGT, q: 'En kunde køber en kasse sild, som vægten viser til 19 kg. Hvor meget vejer kassen i virkeligheden? (Vægten viser 5 % for lidt.)', unit: 'kg', answer: 20,
        hint: '19 kg er 95 % af den rigtige vægt. 19 : 95 · 100.', near: [{ v: 19.95, why: 'Du har lagt 5 % oven i 19. Men 19 er allerede 5 % MINDRE end den rigtige vægt — så det er 95 %, man deler med.' }, { v: 20.5, why: 'Husk, at vægten viser 95 % af den rigtige vægt.' }] })) return;
      await g.say(null, 'På bordet ligger en slidt journal. Orla har skrevet alle afvigelser ned, dag for dag.');
      if (!await g.task('k3q2f', { type: 'multi', area: AR.kilde3, doc: DOC_LOG, q: 'Hvad viser journalen om, hvordan Orla har håndteret vægten? Vælg alle, der passer.', opts: [
        { t: 'At hun opdagede afvigelsen mandag og noterede den.', ok: true }, { t: 'At hun bestilte en ny skrue til vægtarmen.', ok: true },
        { t: 'At hun noterer afvigelsen på alle vejninger.', ok: true },
        { t: 'At hun tog imod gaver fra skibene.', why: 'Der står ingenting om gaver i journalen. Det er kun noget, Rane påstår.' },
        { t: 'At vægten aldrig har været forkert.', why: 'Journalen siger netop det modsatte.' }
      ] })) return;
      if (!await g.task('k3q2g', { type: 'choice', area: AR.kilde3, q: 'Hvad er den rimeligste konklusion?', opts: [
        { t: 'Vægten er unøjagtig, men det har Orla selv opdaget og noteret. Der er ingen beviser for, at hun har snydt.', ok: true },
        { t: 'Orla har snydt med vilje, fordi vægten viser for lidt.', why: 'En slidt vægarm er ikke et bevis for snyd. Hun skrev det jo ned.' },
        { t: 'Rane har ret i alt.', why: 'Ranes folder bygger på påstande, ikke beviser.' }
      ], explain: 'Beviserne taler for Orla. Men vægten skal repareres — og det må ikke trække ud.' })) return;
      g.clue('c3_vaegt'); g.clue('c3_journal');
      await g.skill('vidnet');
      await g.say('orla', 'Tak, {navn}. Jeg er ikke vant til, at nogen undersøger, før de dømmer. Skruen ligger i smeden i Runeborg, men vægten kan klare sig lidt endnu, hvis vi trækker 5 % fra hver gang.');
      await g.say('orla', 'Og nu til det alvorlige: Stormfuglen er stadig ikke kommet. Gamle Søren på kajen ved, hvor skibet sidst blev set. Tal med ham.');
      g.finish('k3q2'); g.start('k3q3');
    }
  };

  on.k3q3 = {
    soeren: async function (g) {
      if (!g.seen('k3q3a')) {
        await g.say('soeren', 'Stormfuglen? Jeg så hendes sejl dér, hvor jeg har sat blå cirkel på kortet. Så trak det op til tåge. Jeg vil sige, hun gik ned ved Tandskær. Der er et rev, der æder skibe — jeg har set det med mine egne øjne.');
        await g.say('soeren', 'Her er søkortet. Fyrbøjen er det gule punkt. Hvis du vil vide, hvor langt hun er herfra, så regn selv efter.');
      }
      if (!await g.task('k3q3a', { type: 'number', area: AR.kort3, doc: DOC_KORT, q: 'Hvor langt er der i virkeligheden fra Saltvig til Fyrbøjen? På kortet er det 4 cm, og 1 cm er 2 km.', unit: 'km', answer: 8,
        hint: 'Gang 4 med 2.', near: [{ v: 4, why: '4 cm er afstanden på kortet. Hvor mange km svarer det til?' }, { v: 6, why: 'Du har lagt 4 og 2 sammen. Hver cm er 2 km — så det er 4 · 2.' }] })) return;
      if (!await g.task('k3q3b', { type: 'number', area: AR.kort3, doc: DOC_KORT, q: 'Fra Fyrbøjen til det sted, hvor Stormfuglen sidst blev set, er der 6,5 cm på kortet. Hvor mange km er det?', unit: 'km', answer: 13,
        hint: '6,5 · 2.', near: [{ v: 8.5, why: 'Du har lagt 2 til. Hver cm er 2 km, så gang med 2.' }] })) return;
      if (!await g.task('k3q3c', { type: 'number', area: AR.kort3, doc: DOC_KORT, q: 'Hvor langt er hele turen fra Saltvig via Fyrbøjen til Stormfuglen?', unit: 'km', answer: 21,
        hint: 'Læg de to stykker sammen: 8 km + 13 km.', near: [{ v: 13, why: '13 km er kun det sidste stykke. Husk turen til Fyrbøjen.' }, { v: 10.5, why: '10,5 cm er længden på kortet. Gang med 2 km pr. cm.' }] })) return;
      if (!await g.task('k3q3d', { type: 'choice', area: AR.kilde3, doc: DOC_SOEMAND, q: 'Søren er sikker på, at Stormfuglen gik ned ved Tandskær. Hvad er det bedste at sige?', opts: [
        { t: 'Revet findes — det står på søkortet. Men om Stormfuglen er gået ned dér, ved vi ikke. Søren så hende langt fra Tandskær, og så kom tågen.', ok: true },
        { t: 'Søren har helt ret. Hun er forlist.', why: 'Søren så hendes sejl. Han har ikke set, at hun forliste.' },
        { t: 'Det er løgn alt sammen. Revet findes ikke.', why: 'Revet findes — det kan ses på søkortet.' }
      ], explain: 'Vigtigt at skelne: det, Søren har set (hendes sejl, og så tåge), og det, han tror (at hun forliste).' })) return;
      g.clue('c3_soeren');
      await g.skill('kortlaeser');
      await g.say('soeren', 'Hm. Når du siger det sådan, har du måske ret. Jeg så hendes sejl, og så kom tågen — så var det tågen, der tog hende, og jeg tilføjede revet. Gammelt sømandsgarn.');
      await g.say('soeren', 'Gå til Orla. Hun har tidevandstavlen. Hvis Stormfuglen skal sejle ind i nat, skal der være vand nok i renden.');
      g.finish('k3q3'); g.start('k3q4');
    }
  };

  on.k3q4 = {
    orla: async function (g) {
      if (!g.seen('k3q4a')) {
        await g.say('orla', 'Stormfuglen stikker 2,4 meter. Der skal være mindst så meget vand over rendens bund, for at hun kan sejle ind uden at tage grunden. Se her, tidevandstavlen for i aften.');
      }
      if (!await g.task('k3q4a', { type: 'choice', area: AR.tidevand, doc: DOC_TIDE, q: 'Hvornår er der mest vand i renden?', opts: [
        { t: 'Klokken 22', ok: true }, { t: 'Klokken 20', why: 'Klokken 20 er der 2,6 meter. Men klokken 22 er der 3,2.' }, { t: 'Klokken 02', why: 'Klokken 02 er vandet faldet til 1,5 meter.' }
      ] })) return;
      if (!await g.task('k3q4b', { type: 'choice', area: AR.tidevand, chart: CH_TIDE, q: 'Mellem hvilke klokkeslæt er der mindst 2,4 meter vand i renden? (Aflæs grafen.)', opts: [
        { t: 'Fra cirka klokken 20 til cirka klokken 24', ok: true },
        { t: 'Hele natten', why: 'Klokken 02 er der kun 1,5 meter — så er renden for lav.' },
        { t: 'Kun klokken 22', why: 'Der er mere end 2,4 meter både før og efter klokken 22.' }
      ], explain: 'Klokken 20 er vandet 2,6 m. Klokken 24 er det 2,5 m. Imellem er der over 2,4 m.' })) return;
      if (!await g.task('k3q4c', { type: 'number', area: AR.tidevand, doc: DOC_TIDE, q: 'Hvor mange meter vand er der i renden klokken 22 ud over de 2,4 meter, Stormfuglen skal bruge?', unit: 'meter', answer: 0.8, tol: 0.001,
        hint: '3,2 − 2,4.', near: [{ v: 5.6, why: 'Du har lagt sammen i stedet for at trække fra.' }] })) return;
      if (!await g.task('k3q4d', { type: 'choice', area: AR.tidevand, doc: DOC_TIDE, q: 'Hvad bliver problemet, hvis Stormfuglen først når renden klokken 02?', opts: [
        { t: 'Der er kun 1,5 meter vand, så hun går på grund.', ok: true },
        { t: 'Der er for meget vand.', why: 'Der er mindre vand jo senere, det bliver.' },
        { t: 'Der er ingen problemer — hun kan altid sejle ind.', why: '1,5 m er mindre end de 2,4 m, hun skal bruge.' }
      ] })) return;
      g.clue('c3_tide');
      await g.skill('taarnur');
      await g.say('orla', 'Så ved vi, hvornår Stormfuglen skal være ved renden: mellem klokken 20 og 24. Og fyret skal tændes, så hun kan se, hvor renden er.');
      await g.say('orla', 'Maja har brug for 40 liter olie. Jeg har selv 16 liter på kontoret. Du må købe resten i Fiskehallen. Gå op til Maja ved fyret — hun fortæller resten.');
      g.finish('k3q4'); g.start('k3q5');
    }
  };

  on.k3q5 = {
    maja: async function (g) {
      var S = g.S;
      if (S.flags.k3_olie) {
        await g.say('maja', 'Lampen venter på dig! Gå op ad trappen, og tænd den. Husk signalbogen — den skal følges til punkt og prikke.');
        return;
      }
      if (!g.seen('k3q5a')) {
        await g.say('maja', 'Du er den lærling, Orla har talt om! Jeg er Maja, fyrpasser. Lampen skal have 40 liter olie i nat. Orla har 16 — du skal skaffe resten.');
      }
      if (!await g.task('k3q5a', { type: 'number', area: AR.tempo3, q: 'Maja skal bruge 40 liter. Orla har 16 liter. Hvor mange liter skal du købe?', unit: 'liter', answer: 24,
        hint: '40 − 16.', near: [{ v: 56, why: 'Du har lagt sammen. Orla har allerede 16 liter, så træk dem fra.' }] })) return;
      if (!await g.task('k3q5a2', { type: 'number', area: AR.tempo3, doc: DOC_OLIE, q: 'Fiskehallen sælger 12 liter for 66 guld. Hvad koster 24 liter?', unit: 'guld', answer: 132,
        hint: '24 liter er to dunke på 12 liter.', near: [{ v: 66, why: '66 guld er prisen for én dunk (12 liter). Du skal bruge to.' }] })) return;
      if (!await g.task('k3q5b', { type: 'number', area: AR.tempo3, q: 'Lampen brænder 2,5 liter i timen. Hvor mange timer kan 40 liter lyse?', unit: 'timer', answer: 16,
        hint: '40 : 2,5 — eller 40 · 2 : 5.', near: [{ v: 100, why: '100 er 40 · 2,5. Her skal du dele: hvor mange gange går 2,5 op i 40?' }] })) return;
      if (!await g.task('k3q5c', { type: 'choice', area: AR.tempo3, q: 'Fyret skal lyse fra klokken 18 til klokken 24 — altså 6 timer. Er 40 liter nok?', opts: [
        { t: 'Ja. 6 timer bruger 6 · 2,5 = 15 liter, så der er masser tilbage.', ok: true },
        { t: 'Nej, så skal vi bruge mindst 100 liter.', why: '6 timer bruger kun 15 liter.' },
        { t: 'Nej, 40 liter er kun nok til 4 timer.', why: '40 liter er nok til 16 timer, som vi regnede før.' }
      ] })) return;
      await g.say('maja', 'Perfekt. Så har vi olie nok, og der er endda reserve. Her er nøglen — og hjælp mig med at bære olien op.');
      g.flag('k3_olie'); RB.audio.sfx('pick');
      g.toast('<b>Olie skaffet</b> — gå op i fyret og tænd lampen');
      await g.say('maja', 'Gå ind i fyret og op til lampen. Signalbogen ligger på bordet, og lampen sidder øverst. Du kan næsten ikke gå forkert.');
    },
    lampe: async function (g) {
      var S = g.S;
      if (!S.flags.k3_olie) { await g.say(null, 'Fyrets store lampe. Der er ingen olie på den. Tal med Maja udenfor først.'); return; }
      if (!g.seen('k3q5d')) await g.say('maja', 'Nu er det alvor, {navn}. Gennem kikkerten kan jeg se, at Stormfuglen er nået til Fyrbøjen — men hun kan ikke se renden uden lys. Først skal vi regne ud, hvornår hun kan være i havn.');
      if (!await g.task('k3q5d', { type: 'number', area: AR.tempo3, doc: DOC_KORT, q: 'Stormfuglen er ved Fyrbøjen og sejler 8 km til Saltvig. Hun sejler 4 km i timen. Hvor mange timer tager det?', unit: 'timer', answer: 2,
        hint: 'tid = afstand : fart = 8 : 4.', near: [{ v: 32, why: '32 er 8 · 4. Når man skal finde tiden, deler man afstanden med farten.' }] })) return;
      await g.skill('fartogtid');
      if (!await g.task('k3q5e', { type: 'number', area: AR.tempo3, q: 'Renden er åben mellem klokken 20 og 24. Hvis Stormfuglen sejler fra Fyrbøjen klokken 19.30 og sejler i 2 timer, hvornår kommer hun til renden? Skriv klokkeslættet som tal (fx 21,5 = halv ti).', unit: 'klokken', answer: 21.5, tol: 0.01,
        hint: '19,5 + 2.', near: [{ v: 21, why: '19,30 + 2 timer er halv ti — ikke ti i ti.' }, { v: 22, why: '19,5 + 2 = 21,5. Det er før klokken 22.' }] })) return;
      if (!await g.task('k3q5f', { type: 'choice', area: AR.tidevand, doc: DOC_TIDE, q: 'Er der vand nok i renden klokken 21,5 (halv ti)? Mellem klokken 20 (2,6 m) og 22 (3,2 m).', opts: [
        { t: 'Ja — der er mere end 2,6 meter, og hun skal bruge 2,4.', ok: true },
        { t: 'Nej, vandet er for lavt.', why: 'Vandet var 2,6 meter klokken 20 og stiger til 3,2 meter klokken 22. Klokken 21,5 er der altså mindst 2,6 meter.' }
      ] })) return;
      if (!await g.task('k3q5g', { type: 'choice', area: AR.tabel3, doc: DOC_SIGNAL, q: 'Stormfuglen skal vide, at renden er åben. Hvilket signal skal lampen sende?', opts: [
        { t: 'Kort – kort – lang', ok: true },
        { t: 'Lang – lang', why: 'Det betyder «vent — vandet er for lavt». Her er der vand nok.' },
        { t: 'Kort – lang – kort', why: 'Det betyder «fare — vend om». Det må vi ikke sende nu.' }
      ], explain: 'Kort – kort – lang: rendens løb er åbent.' })) return;
      await g.say(null, 'Du fylder lampen, tænder lunten og drejer det store linseglas. Et kraftigt, gyldent lys fejer ud over havet. Kort — kort — lang. Kort — kort — lang.');
      g.flag('k3_lys');
      await g.say('maja', 'Se! Dér — et lille sejl, langt ude. Hun har set os!');
      g.finish('k3q5');
      await g.epilogue();
    }
  };

  // ---------------------------------------------------------------- ekstramissioner
  offer.k3s1 = async function (g) {
    await g.say('tilde', 'Hov, du! Jeg har 36 sild til tre kasser, og jeg vil have dem delt i forholdet 1 : 2 : 3. Hjælp en stakkel — mine tal bliver altid til grød, når jeg har travlt.');
    g.start('k3s1');
  };
  on.k3s1 = {
    tilde: async function (g) {
      if (!await g.task('k3s1a', { type: 'number', area: AR.procent3, q: 'Tilde har 36 sild. De skal deles i forholdet 1 : 2 : 3. Hvor mange er der i den mindste kasse?', unit: 'sild', answer: 6,
        hint: '1 + 2 + 3 = 6 dele i alt. 36 : 6 = 6 sild pr. del.', near: [{ v: 12, why: '12 er den mellemste kasse (2 dele).' }, { v: 18, why: '18 er den største kasse (3 dele).' }] })) return;
      if (!await g.task('k3s1b', { type: 'number', area: AR.procent3, q: 'Hvor mange sild er der i den største kasse?', unit: 'sild', answer: 18, hint: '3 dele · 6 sild.' })) return;
      await g.say('tilde', 'Seks, tolv og atten — selvfølgelig! Her er en lille pose guld, og tag en røget sild med til turen.');
      g.gold(15); g.finish('k3s1');
    }
  };
  offer.k3s2 = async function (g) {
    await g.say('soeren', 'Du er klog, lærling. Hjælp mig med min gamle historie om revet ved Tandskær. Jeg vil gerne vide, hvad der er sandt, før jeg fortæller den til børnebørnene.');
    g.start('k3s2');
  };
  on.k3s2 = {
    soeren: async function (g) {
      if (!await g.task('k3s2a', { type: 'sort', area: AR.kilde3, doc: DOC_SOEMAND, q: 'Sortér Sørens udsagn.', cats: ['Kan tjekkes', 'Tro eller sagn'], items: [
        { t: 'Der er et rev ved Tandskær.', c: 0 }, { t: 'Revet æder skibe.', c: 1 },
        { t: 'Man kan se revet på skummet på vandet.', c: 0 }, { t: 'Man må aldrig sejle forbi Tandskær i mørke.', c: 1 }
      ], explain: 'Revet kan findes på et søkort. At det «æder» skibe er en måde at fortælle det på.' })) return;
      if (!await g.task('k3s2b', { type: 'choice', area: AR.kilde3, q: 'Hvordan kan Søren gøre sin historie både sand og spændende?', opts: [
        { t: 'Fortælle, at revet er rigtigt, og at skibe er forliste dér — og at resten er et sagn.', ok: true },
        { t: 'Droppe historien helt.', why: 'En historie kan være god — man skal bare vide, hvad der er sagn, og hvad der er sandt.' },
        { t: 'Fortælle, at alt er sandt.', why: 'Så mister børnebørnene lysten til at spørge, hvad der er virkeligt.' }
      ] })) return;
      await g.say('soeren', 'Præcis. Sagn og sandhed — og man skal vide, hvilket er hvilket. Her, tag mit gamle kompas. Det virker ikke, men det ser godt ud.');
      g.gold(10); g.finish('k3s2');
    }
  };

  // ---------------------------------------------------------------- når der ikke er noget særligt
  function pick(arr, S) { return arr[(S.talks = (S.talks || 0) + 1) % arr.length]; }
  idle.orla = function (g) { return g.say('orla', g.S.flags.k3_lys ? 'Stormfuglen er ved molen! Jeg har aldrig været så glad for en lampe.' : pick(['Papir og tal. Mere skal der ikke til for at holde styr på en havn.', 'En vægt er kun så god som sine lodder — og den, der bruger den.'], g.S)); };
  idle.rane = function (g) { return g.say('rane', g.S.q.k3q2 === 'done' ? 'Hm. Måske var min folder lidt hård. Men en købmand må jo sige sin mening.' : 'Rabat, rabat, rabat! Hos mig er der ingen skjulte omkostninger.'); };
  idle.tilde = function (g) { return g.say('tilde', pick(['Friske sild! Hele natten til kassen.', 'Regn altid prisen pr. kilo. Det er det eneste tal, der ikke kan snyde.'], g.S)); };
  idle.soeren = function (g) { return g.say('soeren', g.S.flags.k3_lys ? 'Jeg sagde det jo: aldrig sejle i mørke. Nu lyser fyret, så det er alligevel i orden.' : pick(['Havet har sine egne regler. Det ændrer sig, mens man ser på det.', 'Jeg har set mange storme. Men aldrig en, der kunne regnes ud på forhånd.'], g.S)); };
  idle.maja = function (g) { return g.say('maja', g.S.flags.k3_lys ? 'Lyset skal brænde hele natten. Du kan sove i fyret, hvis du vil.' : 'Fyret er hele mit liv. Og nu er det mørkt. Det gør ondt.'); };
  placeIdle.tavle3 = function (g) { return g.say(null, g.S.q.k3q0 === 'done' ? 'Havnetavlen: skibe, tider og Orlas besked. Stormfuglen står stadig som «ikke ankommet».' : 'En havnetavle fuld af skibe og beskeder.'); };
  placeIdle.sign_havn = function (g) { return g.say(null, 'HAVNEKONTORET — alle skibe skal anmeldes. Vægten kan lånes mod en lille betaling.'); };
  placeIdle.sign_fyr = function (g) { return g.say(null, 'FYRET — stien går mod øst. Fodgængere venligst på stien, så de ikke falder i havet.'); };
  placeIdle.rack = function (g) { return g.say(null, 'Et tørrestativ fuld af sølvfarvede sild. Duften er … markant.'); };
  placeIdle.vaegt = function (g) { return g.say(null, 'En stor vægt med to skåle og en række prøvelodder i en aflåst kasse.'); };
  placeIdle.lampe = function (g) { return g.say(null, g.S.flags.k3_lys ? 'Lampen brænder kraftigt. Lyset går i et jævnt, gyldent mønster ud over havet.' : 'Fyrets store lampe. Den er kold og tom.'); };
  placeIdle.signalbog = function (g) { return g.say(null, 'Fyrets signalbog. Her står, hvad de forskellige lysmønstre betyder.'); };

  // ---------------------------------------------------------------- afslutningen
  async function sceneSlut(g) {
    await g.say(null, 'Du ser lyset stryge over bølgerne. Efter en time kommer Stormfuglens sejl tættere på — og lidt efter ruller hun ind forbi molen og lægger til ved kajen.');
    await g.flyt('havn', 20, 12, 'down', 'fest');
    g.refresh();
    await g.say('orla', 'Stormfuglen er i havn — med fuld last, hele mandskabet i live og 40 tønder lampeolie. Du reddede os i aften, {navn}.');
    await g.say('rane', 'Jeg har skrevet en ny folder. Der står, at havnevægten er skæv — og at den bliver rettet. Og at jeg ikke skal bruge ord, jeg ikke kan bevise.');
    await g.say('soeren', 'Tågen tog hende, ikke revet. Jeg har rettet min historie. Men jeg beholder lyden af brølende bølger.');
    await g.say('maja', 'Lyset brænder, og kaptajnen siger tak. Du er altid velkommen på Saltvigs fyr.');
    await g.say('tilde', 'Aftensmad til alle! Nu med sild i forholdet 1 : 2 : 3.');
    await g.say(null, 'Saltvig fejrer natten med fiskesuppe, trækharmonika og sange. Og langt ude på havet, over bølgerne, blinker fyret sin rolige rytme: kort — kort — lang.');
  }

  K0.tilfoej({
    kap: 3,
    areas: A,
    cando: [
      ['tabel3', 'finde oplysninger i en tabel'],
      ['kilde3', 'vurdere vidner og kilder'],
      ['procent3', 'regne med rabat, procent og forhold'],
      ['kort3', 'bruge et søkorts målestok'],
      ['tempo3', 'regne med fart, tid og afstand'],
      ['tidevand', 'aflæse tidevandet og se mønstre']
    ],
    npcs: npcs, things: things, runes: runes, places: places, placePos: placePos, lockedDoors: lockedDoors,
    clues: clues, skills: skills, quests: quests, on: on, offer: offer, idle: idle, placeIdle: placeIdle,
    meta: {
      navn: 'Havnen i Saltvig',
      kort: 'Kongevejen er tør, og fyret i Saltvig er mørkt. Et skib er forsinket, og byen skændes.',
      tilbud: 'Kongevejen mod syd er endelig tørret ud, og Orla, havnefogeden i Saltvig, har sendt bud: Fyret er mørkt, et skib er forsinket, og byen skændes om en vægt. Kommer du med til havnen?',
      start: { map: 'havn', x: 21, y: 20, dir: 'up' },
      tod: function (S) {
        if (S.flags.k3_lys) return 'fest';
        if (S.q.k3q5 === 'active') return 'nat';
        if (S.q.k3q4 === 'done') return 'aften';
        if (S.q.k3q3 === 'done') return 'eftermiddag';
        return 'morgen';
      },
      efterTitel: 'Natten i Saltvig',
      efterMaal: 'Nyd aftenen i havnen — og find de sidste runestykker',
      efter: { npc: 'orla' },
      sider: ['k3s1', 'k3s2'],
      intro: intro,
      slut: {
        titel: 'Saltvig er reddet!',
        tekst: 'Fyret lyser, Stormfuglen er i havn, og vægten bliver rettet. Du regnede dig frem til olien, tiden og tidevandet — og lod ikke nogen narre dig med rabatter og rygter. Her er, hvad du har vist, at du kan:',
        rundt: 'Gå rundt i havnen',
        scene: sceneSlut
      }
    }
  });
})();
