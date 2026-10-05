/* Regnehelten — historien
   Alt indhold: personer, missioner, steder at undersøge og replikker.

   Du spiller en elev, for hvem matematiktimen i går var noget rod. Hr.
   Poulsen har bedt dig komme igen i dag og vise, hvad du kan. Mellem
   morgenmaden og skoleklokken går du gennem en helt almindelig dag — og
   det viser sig, at der er matematik overalt i den.

   Hver hovedmission er et opgavesæt (5-6 opgaver) fra js/opgaver.js, og
   rækkefølgen følger Blooms taksonomi: HUSK -> FORSTÅ -> ANVEND ->
   ANALYSÉR -> VURDÉR -> SKAB. Ekstramissionerne er frivillige, har tre
   opgaver hver og giver ting i tasken — men flytter ikke historien.

   Ingen karakterer: danske børn får dem først i 8. klasse. Fremskridt er
   Regnekraft og en "Jeg kan ..."-liste til sidst. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};

  // ---------------------------------------------------------------- udseender
  var SKIN = ['#ffe0c4', '#f5cdaa', '#deb088', '#be8b62', '#8e6242', '#60402c'];
  var HAIRC = ['#2c221e', '#5c3a24', '#966230', '#d6a854', '#be4e34', '#464650'];
  var CLOTH = ['#487ac4', '#ce5460', '#56a86e', '#de963e', '#8c60b8', '#40b0b4', '#e884a8', '#5a6474'];
  var PANTS = ['#4e5670', '#3e4048', '#806048', '#364c6c', '#966078', '#5c6c5a'];
  var STYLES = [['kort', 'Kort'], ['lang', 'Langt'], ['kroeller', 'Krøller'], ['kasket', 'Kasket'], ['knold', 'Knold']];
  var EXTRAS = [['ingen', 'Ingen'], ['taske', 'Skoletaske'], ['briller', 'Briller'], ['briller+taske', 'Briller og taske']];
  var STD_LOOK = { skin: SKIN[1], hair: HAIRC[3], style: 'lang', cloth: CLOTH[6], pants: PANTS[0], extra: 'taske', hatColor: '#c8282e' };

  // ---------------------------------------------------------------- personer
  // pos(S) giver {map,x,y,dir} eller null, hvis personen ikke er der lige nu
  function at(map, x, y, dir) { return function () { return { map: map, x: x, y: y, dir: dir || 'down' }; }; }
  // i går (åbningsscenen) er det kun klassen, der findes
  function idag(p) { return function (S) { return S.cut ? null : p(S); }; }
  var npcs = {
    mor: { name: 'Mor', look: { skin: SKIN[1], hair: HAIRC[3], style: 'knold', cloth: CLOTH[2], pants: '#5c5678', apron: true }, pos: idag(at('hjem', 13, 3)) },
    ida: { name: 'Ida', look: { skin: SKIN[0], hair: HAIRC[3], style: 'kroeller', cloth: CLOTH[6], pants: '#b07896' }, pos: idag(at('hjem', 16, 5, 'up')) },
    far: { name: 'Far', look: { skin: SKIN[2], hair: HAIRC[0], style: 'kort', cloth: CLOTH[7], pants: '#4e5260', beard: true }, pos: idag(at('butik', 12, 8)) },
    ekspedient: { name: 'Ekspedienten', look: { skin: SKIN[1], hair: HAIRC[3], style: 'knold', cloth: '#3a9a5a', pants: '#505460' }, pos: idag(at('butik', 4, 8)) },
    nabo: { name: 'Naboen', look: { skin: SKIN[4], hair: HAIRC[5], style: 'skaldet', cloth: CLOTH[6], pants: '#605c68', beard: true, beardColor: '#9a9aa6' }, pos: idag(at('by', 15, 12, 'left')) },
    kioskmand: { name: 'Kioskmanden', look: { skin: SKIN[2], hair: HAIRC[1], style: 'kasket', hatColor: '#2c4a9c', cloth: CLOTH[3], pants: '#54505c' }, pos: idag(at('by', 32, 13)) },
    bibliotekar: { name: 'Bibliotekaren', look: { skin: SKIN[1], hair: HAIRC[5], style: 'knold', cloth: CLOTH[5], pants: '#58546e', extra: 'briller' }, pos: idag(at('bibliotek', 10, 3)) },
    bogorm: { name: 'Dreng med bog', look: { skin: SKIN[0], hair: HAIRC[0], style: 'kort', cloth: CLOTH[4], pants: '#484e60', extra: 'briller' }, pos: idag(at('bibliotek', 8, 9, 'up')) },
    viggo: { name: 'Viggo', look: { skin: SKIN[0], hair: HAIRC[1], style: 'kroeller', cloth: CLOTH[2], pants: '#786c96' }, pos: idag(at('by', 19, 27)) },
    hundelufter: { name: 'Hundelufteren', look: { skin: SKIN[3], hair: HAIRC[2], style: 'kort', cloth: CLOTH[4], pants: '#464c58' }, pos: idag(at('by', 7, 26, 'right')) },
    oskar: { name: 'Oskar', look: { skin: SKIN[3], hair: HAIRC[0], style: 'kasket', hatColor: '#c8282e', cloth: CLOTH[0], pants: '#565c6e', extra: 'taske' }, pos: function (S) { return S.cut ? { map: 'klasse', x: 14, y: 9, dir: 'up' } : { map: 'by', x: 52, y: 10, dir: 'down' }; } },
    sofie: { name: 'Sofie', look: { skin: SKIN[2], hair: HAIRC[3], style: 'lang', cloth: CLOTH[6], pants: '#966482' }, pos: function (S) { return S.cut ? { map: 'klasse', x: 11, y: 6, dir: 'up' } : { map: 'by', x: 55, y: 9, dir: 'left' }; } },
    sportslaerer: { name: 'Sportslæreren', look: { skin: SKIN[4], hair: HAIRC[0], style: 'kort', cloth: CLOTH[2], pants: '#3c4250', whistle: true }, pos: idag(at('by', 49, 8)) },
    emma: { name: 'Emma', look: { skin: SKIN[4], hair: HAIRC[2], style: 'lang', cloth: CLOTH[4], pants: '#786096', extra: 'briller' }, pos: idag(at('skole', 5, 4)) },
    pedel: { name: 'Pedellen', look: { skin: SKIN[2], hair: HAIRC[0], style: 'kasket', hatColor: '#5a6474', cloth: CLOTH[7], pants: '#4a544a', beard: true }, pos: idag(at('skole', 22, 10, 'left')) },
    poulsen: { name: 'Hr. Poulsen', look: { skin: SKIN[2], hair: HAIRC[5], style: 'skaldet', cloth: CLOTH[5], pants: '#464a5a', extra: 'briller', beard: true, beardColor: '#8a8a96' }, pos: function (S) { return S.cut ? { map: 'klasse', x: 8, y: 2, dir: 'down' } : { map: 'klasse', x: 6, y: 3, dir: 'down' }; } }
  };
  // Klassekammeraterne i åbningsscenen
  var KAMMERATER = [[2, 6], [5, 6], [8, 6], [14, 6], [17, 6], [2, 9], [5, 9], [11, 9], [17, 9]];
  KAMMERATER.forEach(function (p, i) {
    var h = function (s) { return RH.hash(i, s, 7); };
    npcs['elev' + i] = {
      name: 'En fra klassen', klassekammerat: true,
      look: { skin: SKIN[(h(1) * SKIN.length) | 0], hair: HAIRC[(h(2) * HAIRC.length) | 0], style: ['kort', 'lang', 'kroeller', 'kasket', 'knold'][(h(3) * 5) | 0], hatColor: CLOTH[(h(5) * 8) | 0], cloth: CLOTH[(h(4) * CLOTH.length) | 0], pants: PANTS[(h(6) * PANTS.length) | 0] },
      pos: function (S) { return S.cut ? { map: 'klasse', x: p[0], y: p[1], dir: 'up' } : null; }
    };
  });

  // Ting i verden, der ikke er personer
  var things = [
    { id: 'sally', map: 'by', x: 8, y: 26, kind: 'dog', visible: function (S) { return !S.cut; } }
  ];

  // Felter, man kan undersøge
  var places = {
    'hjem:4,2': 'skrivebord', 'hjem:5,2': 'skrivebord', 'hjem:1,2': 'seng', 'hjem:1,3': 'seng', 'hjem:4,8': 'tv', 'hjem:11,1': 'koeleskab', 'hjem:7,1': 'reol', 'hjem:13,1': 'komfur',
    'by:9,14': 'postkasse', 'by:34,13': 'kioskskilt', 'by:13,23': 'parkskilt', 'by:37,13': 'baenk_bib', 'by:38,13': 'baenk_bib', 'by:7,23': 'baenk_park', 'by:8,23': 'baenk_park',
    'by:6,30': 'lygtepael', 'by:36,21': 'bus', 'by:37,21': 'bus', 'by:47,10': 'maal', 'by:57,10': 'maal', 'by:55,7': 'cykler', 'by:56,7': 'cykler', 'by:17,13': 'cykler_butik',
    'by:15,15': 'lygte', 'by:30,15': 'lygte', 'by:45,15': 'lygte',
    'butik:10,5': 'frugt', 'butik:11,5': 'frugt', 'butik:12,5': 'frugt', 'butik:3,9': 'kassen', 'butik:4,9': 'kassen', 'butik:7,9': 'kassen', 'butik:8,9': 'kassen', 'butik:9,1': 'tilbud',
    'butik:14,2': 'fryser', 'butik:15,2': 'fryser', 'butik:16,2': 'fryser', 'butik:17,2': 'fryser', 'butik:18,2': 'fryser', 'butik:19,2': 'fryser',
    'bibliotek:9,1': 'opslag_bib', 'skole:8,1': 'opslag_skole', 'skole:2,1': 'skabe', 'skole:20,1': 'skabe',
    'klasse:6,1': 'tavle', 'klasse:7,1': 'tavle', 'klasse:8,1': 'tavle', 'klasse:9,1': 'tavle', 'klasse:10,1': 'tavle', 'klasse:11,1': 'tavle', 'klasse:17,1': 'bogreol', 'klasse:18,1': 'bogreol'
  };
  var placePos = { skrivebord: ['hjem', 4, 2] };
  var lockedDoors = {
    'by:40,26': 'Der står en cykel med fladt dæk ved døren. Ingen lukker op.',
    'by:50,26': 'Det dufter af nybagte boller. Men der er ingen, der lukker op.'
  };

  // ---------------------------------------------------------------- missioner
  var ACT1 = 'Morgen derhjemme', ACT2 = 'På vej i skole', ACT3 = 'I skolen', SIDE = 'Ekstramissioner';
  var quests = [
    { id: 'q0', act: ACT1, title: 'Klar til skole', desc: 'Pak tasken, og varm hjernen op ved skrivebordet.', bloom: 'HUSK', target: function () { return 'skrivebord'; }, goal: 'Kig på dit skrivebord' },
    { id: 'q1', act: ACT1, title: 'Morgenmad med Mor', desc: 'Hjælp Mor med bollerne og Ida med vingummierne.', bloom: 'FORSTÅ', requires: ['q0'], target: function () { return 'mor'; }, goal: 'Spis morgenmad — snak med Mor i køkkenet' },
    { id: 'q2', act: ACT2, title: 'Indkøb med Far', desc: 'Far har glemt sine briller. Vær hans regnemaskine i supermarkedet.', bloom: 'ANVEND', requires: ['q1'], target: function () { return 'far'; }, goal: 'Find Far i supermarkedet' },
    { id: 'q3', act: ACT3, title: 'Mønstre i skolegården', desc: 'Oskar har fundet noget mærkeligt ved fliserne.', bloom: 'ANALYSÉR', requires: ['q2'], target: function () { return 'oskar'; }, goal: 'Mød Oskar i skolegården' },
    { id: 'q4', act: ACT3, title: 'Dommer i kantinen', desc: 'Emma og Oskar er uenige. Du skal sige, hvad der er rigtigt.', bloom: 'VURDÉR', requires: ['q3'], target: function () { return 'emma'; }, goal: 'Find Emma i kantinen inde på skolen' },
    { id: 'q5', act: ACT3, title: 'Vis Hr. Poulsen, hvad du kan', desc: 'Det, hele dagen har handlet om.', bloom: 'SKAB', requires: ['q4'], target: function () { return 'poulsen'; }, goal: 'Gå ind i klassen til Hr. Poulsen' },
    { id: 's1', act: SIDE, side: true, title: 'Kioskmandens regnemaskine', desc: 'Regnemaskinen er i stykker, og køen vokser.', bloom: 'ANVEND', requires: ['q1'], giver: 'kioskmand', target: function () { return 'kioskmand'; }, goal: 'Hjælp kioskmanden' },
    { id: 's2', act: SIDE, side: true, title: 'Styr på reolerne', desc: 'Bibliotekaren skal have orden på bøgerne.', bloom: 'ANALYSÉR', requires: ['q1'], giver: 'bibliotekar', target: function () { return 'bibliotekar'; }, goal: 'Hjælp bibliotekaren' },
    { id: 's3', act: SIDE, side: true, title: 'Del lige!', desc: 'Viggos storebror snyder altid, når de deler.', bloom: 'FORSTÅ', requires: ['q1'], giver: 'viggo', target: function () { return 'viggo'; }, goal: 'Hjælp Viggo i parken' },
    { id: 's4', act: SIDE, side: true, title: 'Sallys gåture', desc: 'Hvor meget går hundelufteren egentlig om dagen?', bloom: 'ANVEND', requires: ['q2'], giver: 'hundelufter', target: function () { return 'hundelufter'; }, goal: 'Hjælp hundelufteren i parken' },
    { id: 's5', act: SIDE, side: true, title: 'Målscoren', desc: 'Sportslæreren skal have styr på tallene før turneringen.', bloom: 'ANALYSÉR', requires: ['q2'], giver: 'sportslaerer', target: function () { return 'sportslaerer'; }, goal: 'Hjælp sportslæreren i skolegården' },
    { id: 's6', act: SIDE, side: true, title: 'Stole til morgensang', desc: 'Pedellen gider ikke tælle stolene én ad gangen igen.', bloom: 'HUSK', requires: ['q3'], giver: 'pedel', target: function () { return 'pedel'; }, goal: 'Hjælp pedellen i kantinen' }
  ];
  var byId = {}; quests.forEach(function (q) { byId[q.id] = q; });
  function available(q) { var S = RH.state; return (q.requires || []).every(function (r) { return S.q[r] === 'done'; }); }

  // ---------------------------------------------------------------- opgavesættene
  // saet: hvilket sæt fra opgaver.js · flag: hvad der låses op bagefter
  var ENC = {
    q0: { saet: 'husk', scene: 'Skrivebordet', flag: null, next: 'q1',
      intro: [['player', 'Puha. Matematiktimen i går var en katastrofe.'], ['player', 'Hr. Poulsen sagde, jeg skulle vise ham noget i dag.'], ['player', 'Okay. Først skal jeg bare nå bussen. Lad mig lige tænke ...']],
      after: [['player', 'Tasken er pakket. Nu skal jeg have morgenmad.']] },
    q1: { saet: 'forstaa', scene: 'Mor', flag: 'hjemUd', next: 'q2',
      intro: [['mor', 'Der er du. Kan du hjælpe mig med bollerne, mens du spiser?'], ['mor', 'Jeg skal bruge en, der kan regne. Og det er dig i dag.']],
      after: [['mor', 'Tak for hjælpen! Far venter — I skal lige forbi supermarkedet. Det ligger lige ovre på den anden side af haven.']] },
    q2: { saet: 'anvend', scene: 'Far', flag: 'skolegaard', next: 'q3',
      intro: [['far', 'Godt, du er med. Jeg har glemt mine briller, så du må være regnemaskine.'], ['far', 'Og vi har et budget i dag, så det skal passe.']],
      after: [['far', 'Flot regnet. Af sted med dig — skolen ligger for enden af vejen. Lågen til skolegården er åben nu.']] },
    q3: { saet: 'analyser', scene: 'Oskar', flag: 'skoleInd', next: 'q4',
      intro: [['oskar', 'Der er du! Kom, jeg har fundet noget mærkeligt ved fliserne.'], ['oskar', 'Der er et mønster i dem. Kan du regne ud, hvad der kommer næst?']],
      after: [['oskar', 'Du er jo blevet vildt god til det der. Vi ses i kantinen!']] },
    q4: { saet: 'vurder', scene: 'Emma', flag: 'klasseInd', next: 'q5',
      intro: [['emma', 'Godt, du kommer. Oskar og jeg er uenige om et regnestykke.'], ['emma', 'Vil du være dommer? Sig bare, hvad der er rigtigt.']],
      after: [['emma', 'Held og lykke derinde. Du kan godt, altså. Døren til klassen er den midt på væggen.']] },
    q5: { saet: 'boss', scene: 'Hr. Poulsen', flag: null, next: null,
      intro: [['poulsen', 'Nå. Der er du.'], ['poulsen', 'Timen i går gik ikke særlig godt, og det ved du godt selv.'], ['poulsen', 'Men jeg har hørt, at du har regnet en hel del i dag.'], ['poulsen', 'Så vis mig det. Ikke for min skyld — for din egen.']],
      after: [['poulsen', 'Kan du mærke forskellen fra i går? Det kan jeg.']] },
    s1: { saet: 'sq_kiosk', scene: 'Kioskmanden',
      intro: [['kioskmand', 'Hey, dig der. Har du to minutter?'], ['kioskmand', 'Min regnemaskine er gået i stykker, og køen vokser.']],
      after: [['kioskmand', 'Du reddede min formiddag. Kom igen i morgen!']] },
    s2: { saet: 'sq_bibliotek', scene: 'Bibliotekaren',
      intro: [['bibliotekar', 'Godt, du kommer. Jeg skal have styr på reolerne.'], ['bibliotekar', 'Vil du regne med? Så finder jeg en bog til dig bagefter.']],
      after: [['bibliotekar', 'Bogen er din, så længe du vil. Pas godt på den.']] },
    s3: { saet: 'sq_park_barn', scene: 'Viggo',
      intro: [['viggo', 'Hej! Er du god til at dele?'], ['viggo', 'Jeg skal dele med min bror, og han snyder altid.']],
      after: [['viggo', 'Nu snyder han ikke mere. Tak!']] },
    s4: { saet: 'sq_hund', scene: 'Hundelufteren',
      intro: [['hundelufter', 'Undskyld — har du lige et øjeblik?'], ['hundelufter', 'Jeg skal finde ud af, hvor meget jeg egentlig går om dagen.']],
      after: [['hundelufter', 'Så mange minutter! Ikke underligt, jeg er træt. Sally er det i hvert fald ikke.']] },
    s5: { saet: 'sq_sport', scene: 'Sportslæreren',
      intro: [['sportslaerer', 'Dig der! Du er god til tal, har jeg hørt.'], ['sportslaerer', 'Jeg skal have styr på målscoren inden turneringen.']],
      after: [['sportslaerer', 'Flot. Tag den gamle bold — den ligger bare og samler støv.']] },
    s6: { saet: 'sq_pedel', scene: 'Pedellen',
      intro: [['pedel', 'Er du god til at gange? Jeg skal stille stole op.'], ['pedel', 'Og jeg gider ikke tælle dem én ad gangen igen.']],
      after: [['pedel', 'Perfekt. Her — tag den her nøgle. Den passer til noget.']] }
  };
  // Mindst 85 % rigtige i første forsøg giver en ting i tasken
  var REWARD_PCT = 0.85;
  var REWARDS = { q0: 'guldmoent', q1: 'toejpose', q2: 'is', q3: 'fodbold', q4: 'kridt', q5: 'pokal', s1: 'slik', s2: 'bog', s3: 'toejpose', s4: 'hundeben', s5: 'fodbold', s6: 'noegle' };
  var ITEMS = {
    fodbold: { name: 'Fodbolden', unlocks: 'fodbold', desc: 'Oskars gamle fodbold. Nu kan du tage et par straffespark, når du trænger til en pause.' },
    toejpose: { name: 'Tøjposen', unlocks: 'dressup', desc: 'En pose med dit eget tøj. Nu kan du klæde om og skifte udseende, når du har lyst.' },
    guldmoent: { name: 'Den blanke mønt', desc: 'Den lå bagerst i sparegrisen. Bedstefar siger, den er fra dengang, han selv gik i skole.' },
    is: { name: 'Isen fra Far', desc: '"Fordi du regnede det hele rigtigt," sagde han. Den smelter ikke — det er den slags is.' },
    kridt: { name: 'Et stykke kridt', desc: 'Fra kantinens gulv. Man kan tegne hinkeruder med det — eller regnestykker.' },
    pokal: { name: 'Pokalen', desc: 'Den stod øverst i skabet i klassen. I dag er den din.' },
    bog: { name: 'Lånt bog', desc: '"Tal og mønstre for nysgerrige". Bibliotekaren fandt den frem til dig helt af sig selv.' },
    slik: { name: 'Bland selv-pose', desc: 'Fra kiosken. Kioskmanden gav en ekstra, fordi du regnede byttepengene hurtigere end ham.' },
    hundeben: { name: 'Hundekiks', desc: 'Til Sally, hunden i parken. Hun kan lide dig nu.' },
    noegle: { name: 'Pedellens nøgle', desc: '"Pas godt på den," sagde han. Du er ikke helt sikker på, hvad den låser op.' }
  };
  var PAUSESPIL = { fodbold: 'Straffespark', dressup: 'Klæd om' };
  var PLAYS_PER_ITEM = 2, MAX_PLAYS = 6;

  // ---------------------------------------------------------------- Regnebogen
  var BOG = [
    { id: 'plus', title: 'Plus og minus', tag: 'At lægge til og trække fra', diagram: 'numberline',
      body: ['Plus betyder, at der kommer noget til. Minus betyder, at noget går væk.', 'Et trick: du kan altid tælle videre på en tallinje. Ved plus går du til højre, ved minus går du til venstre.'],
      example: ['Du har 3 kr og får 4 kr mere.', '3 + 4 = 7 kr.'] },
    { id: 'gange', title: 'Gangetabellen', tag: 'Mange lige store bunker', diagram: 'array',
      body: ['At gange er en hurtig måde at lægge det samme tal sammen mange gange. 4 + 4 + 4 er det samme som 3 x 4.', 'Tricks: 5-tabellen ender altid på 0 eller 5. 10-tabellen sætter bare et 0 bagpå. Og 2-tabellen er bare det dobbelte.'],
      example: ['3 rækker med 4 æbler i hver:', '3 x 4 = 12 æbler.'] },
    { id: 'division', title: 'Division', tag: 'At dele ligeligt', diagram: 'share',
      body: ['At dividere er at dele noget i lige store bunker. Spørg dig selv: hvor mange gange går det lille tal op i det store?', 'Division og gange hører sammen. Hvis 3 x 4 = 12, så er 12 : 3 = 4.'],
      example: ['12 bolsjer skal deles mellem 3 børn.', '12 : 3 = 4 til hver.'] },
    { id: 'halve', title: 'Halve og fjerdedele', tag: 'Dele af et tal', diagram: 'half',
      body: ['Halvdelen betyder delt i 2 lige store dele. En fjerdedel betyder delt i 4.', 'Du finder halvdelen ved at dividere med 2, og en fjerdedel ved at dividere med 4.'],
      example: ['Halvdelen af 18 er 18 : 2 = 9.', 'En fjerdedel af 20 er 20 : 4 = 5.'] },
    { id: 'penge', title: 'Penge og byttepenge', tag: 'Når du handler', diagram: 'coins',
      body: ['Når du køber flere ting, lægger du priserne sammen.', 'Byttepenge er det, du får tilbage: tag det, du betalte med, og træk prisen fra. Skal du købe flere ens ting, kan du gange prisen med antallet.'],
      example: ['Varer for 63 kr, du betaler med 100 kr.', '100 - 63 = 37 kr tilbage.'] },
    { id: 'monstre', title: 'Mønstre og talrækker', tag: 'Hvad kommer så?', diagram: 'pattern',
      body: ['I en talrække sker der det samme hele vejen igennem.', 'Find ud af, hvor meget der bliver lagt til (eller trukket fra) mellem to tal ved siden af hinanden. Tjek så, om det passer hele vejen. Så kan du regne det næste tal ud.'],
      example: ['3, 7, 11, 15 ... Der lægges 4 til hver gang.', 'Næste tal: 15 + 4 = 19.'] },
    { id: 'areal', title: 'Omkreds og areal', tag: 'Rundt om og indeni', diagram: 'rect',
      body: ['Omkredsen er hele vejen rundt om kanten. Læg alle siderne sammen — eller tag (længde + bredde) og gang med 2.', 'Arealet er, hvor meget der er indeni. Gang længden med bredden.'],
      example: ['En mark er 8 m lang og 3 m bred.', 'Omkreds: (8 + 3) x 2 = 22 m. Areal: 8 x 3 = 24 m².'] },
    { id: 'raekkefolge', title: 'Hvad regner man først?', tag: 'Regnearternes orden', diagram: 'order',
      body: ['Man regner ikke altid fra venstre mod højre.', 'Først regner du det, der står i en parentes. Så gange og dividere. Til sidst plus og minus. Derfor er 2 + 3 x 4 ikke 20, men 14.'],
      example: ['2 + 3 x 4  →  3 x 4 = 12  →  2 + 12 = 14.', 'Med parentes: (2 + 3) x 4 = 20.'] },
    { id: 'tjek', title: 'Tjek dit svar', tag: 'Gode vaner', diagram: null,
      body: ['Et svar kan tjekkes. Det tager ti sekunder og redder mange fejl.', 'Regn den anden vej: har du lagt sammen, så træk fra igen. Har du ganget, så divider tilbage.', 'Spørg også: kan svaret overhovedet passe? Hvis du deler 12 mellem 3, kan svaret ikke være større end 12.'],
      example: ['Du fik 47 + 26 = 73.', 'Tjek: 73 - 26 = 47. Det passer.'] }
  ];

  // ---------------------------------------------------------------- dialog og handling
  // g er spillets hjælpere: g.say, g.ask, g.saet, g.start, g.finish, g.flag, g.toast ...
  var script = {};

  // Åbningsscenen: klasselokalet i går, sidste time
  script.intro = async function (g) {
    var navn = g.S.name;
    await g.say(null, 'I går. Sidste time.');
    await g.say('poulsen', 'Og hvem kan så svare på den her?');
    await g.say('sofie', '48!');
    await g.say('poulsen', 'Rigtigt. Og den næste?');
    await g.say('oskar', '72! Den var nem.');
    await g.say('player', '... jeg kan ikke engang se, hvor de starter.');
    await g.say('poulsen', '{navn}? Hvad siger du?', 'Hvad siger du?');
    await g.say('player', '... det ved jeg ikke.');
    await g.say(null, 'Nogen grinede. Ikke alle. Men nogen.');
    await g.say('player', 'Jeg hader det her.');
    await g.say(null, 'Bagefter, da klassen var tom:');
    await g.tomKlasse();
    await g.say('poulsen', 'Kom forbi i morgen, og vis mig, hvad du kan.');
    await g.say('poulsen', 'Jeg tror på dig. Det er ikke bare noget, jeg siger.');
    await g.say('player', 'Jeg vil ikke have det sådan her mere.');
    await g.say('player', 'Jeg vil kunne det. Også mig.');
    await g.morgen();
    await g.say(null, 'Det er i morgen nu. Og klokken er alt for mange.');
    await g.say('mor', '{navn}! Bussen kører om lidt!', 'Bussen kører om lidt!');
    g.start('q0', true);
    g.toast('<b>Mission:</b> ' + RH.esc(byId.q0.title) + '<br>Tryk <span class="key">B</span> for at åbne Dagbogen.');
    return navn;
  };

  // Et opgavesæt fra start til slut. Giver false, hvis man trykkede "Senere".
  async function enc(g, qid) {
    var E = ENC[qid];
    if (!g.seen(qid + ':intro')) for (var i = 0; i < E.intro.length; i++) await g.say(E.intro[i][0], E.intro[i][1]);
    var res = await g.saet(qid, E.saet, E.scene);
    if (!res) return false;
    for (var j = 0; j < E.after.length; j++) await g.say(E.after[j][0], E.after[j][1]);
    await g.belonning(qid, res.ratio);
    return true;
  }
  function main(qid) {
    return async function (g) {
      if (!await enc(g, qid)) return;
      var E = ENC[qid];
      if (E.flag) { g.flag(E.flag); g.refresh(); }
      g.finish(qid);
      if (E.next) g.start(E.next);
      else await g.epilogue();
    };
  }
  function side(qid) {
    return async function (g) { if (await enc(g, qid)) g.finish(qid); };
  }

  var on = {};   // on[mission][person] = handling, mens missionen er i gang
  on.q0 = { skrivebord: main('q0') };
  on.q1 = { mor: main('q1') };
  on.q2 = { far: main('q2') };
  on.q3 = { oskar: main('q3') };
  on.q4 = { emma: main('q4') };
  on.q5 = { poulsen: main('q5') };
  on.s1 = { kioskmand: side('s1') }; on.s2 = { bibliotekar: side('s2') }; on.s3 = { viggo: side('s3') };
  on.s4 = { hundelufter: side('s4') }; on.s5 = { sportslaerer: side('s5') }; on.s6 = { pedel: side('s6') };
  // En ekstramission begynder, så snart man taler med den, der har den
  var offer = {};
  ['s1', 's2', 's3', 's4', 's5', 's6'].forEach(function (id) { offer[id] = async function (g) { g.start(id); await on[id][byId[id].giver](g); }; });

  // ---------------------------------------------------------------- når der ikke er noget særligt
  function pick(arr, S) { return arr[(S.talks = (S.talks || 0) + 1) % arr.length]; }
  function done(S, id) { return S.q[id] === 'done'; }
  // Replikker, der skifter med, hvordan det går med regningen ("good"/"low")
  function perf(g, normal, good, low) { var p = g.perf(); return p === 'good' && good ? good : p === 'low' && low ? low : normal; }
  var idle = {
    mor: function (g) { return g.say('mor', done(g.S, 'q1') ? 'Tak for hjælpen! Far venter i supermarkedet. Og husk madpakken!' : 'Godmorgen! Du når det nok — men kig lige på dit skrivebord først.'); },
    ida: function (g) { return g.say('ida', done(g.S, 'q1') ? 'Fint. Vi deler. Men jeg tæller efter!' : 'Jeg har fået en hel pose vingummier. Du får IKKE nogen.'); },
    far: function (g) { return g.say('far', done(g.S, 'q2') ? 'Skynd dig, skolen venter! Jeg klarer resten af indkøbene.' : 'Nå, er du klar? Vi skal lige handle, før du skal i skole.'); },
    ekspedient: function (g) { return g.say('ekspedient', perf(g, 'Tilbuddene hænger ved indgangen, hvis I skal spare.', done(g.S, 'q2') ? 'Var det dig, der regnede det hele for din far? Flot.' : null)); },
    nabo: function (g) { return g.say('nabo', perf(g, 'Godmorgen! Du er tidligt oppe i dag. Jeg river blade — de bliver ved med at falde.', 'Du ser godt tilfreds ud i dag. Er der sket noget godt?', 'Sådan en dag, hva\'? Dem har jeg også haft. De går over.')); },
    kioskmand: function (g) { return g.say('kioskmand', done(g.S, 's1') ? 'Du reddede min formiddag. Kom igen i morgen!' : 'Godmorgen! Jeg har ikke åbnet endnu.'); },
    bibliotekar: function (g) { return g.say('bibliotekar', done(g.S, 's2') ? 'Bogen er din, så længe du vil.' : 'Velkommen. Her må man godt tale — bare stille.'); },
    bogorm: function (g) { return g.say('bogorm', perf(g, 'Shh. Jeg er på side 200.', 'Er du også god til tal? Så er vi to.')); },
    viggo: function (g) { return g.say('viggo', done(g.S, 's3') ? 'Nu snyder han ikke mere. Tak!' : 'Jeg venter på min storebror. Han er altid sen.'); },
    hundelufter: function (g) { return g.say('hundelufter', done(g.S, 's4') ? 'Sally siger tak for kiksen. Altså — det tror jeg, hun gør.' : 'Sally! Kom her, Sally!'); },
    oskar: function (g) { return g.say('oskar', done(g.S, 'q3') ? 'Vi ses i kantinen! Emma venter derinde.' : 'Hey! Kommer du ud i gården?'); },
    sofie: function (g) { return g.say('sofie', perf(g, 'Har du set Oskar? Han skylder mig en is.', 'Alle snakker om, at du er blevet god til matematik.', 'Matematik er også svært. Det siger min mor i hvert fald.')); },
    sportslaerer: function (g) { return g.say('sportslaerer', done(g.S, 's5') ? 'Turneringen er reddet. Takket være dig.' : 'Ikke bolde mod vinduerne, tak!'); },
    emma: function (g) { return g.say('emma', done(g.S, 'q4') ? 'Held og lykke derinde. Du kan godt, altså.' : 'Hej! Jeg sidder her i frikvarteret, hvis du skal noget.'); },
    pedel: function (g) { return g.say('pedel', done(g.S, 's6') ? 'Pas godt på nøglen.' : 'Pas på gulvet, jeg har lige vasket det.'); },
    poulsen: function (g) { return g.say('poulsen', done(g.S, 'q5') ? 'Kan du mærke forskellen fra i går? Det kan jeg.' : 'Vi ses til timen. Husk det, vi talte om.'); },
    sally: function (g) { return g.say(null, pick(['Sally logrer med halen og snuser til dine sko.', 'Sally sætter sig pænt. Hun håber vist på en kiks.', 'Sally gør én gang. Det lyder mest af alt som et "godmorgen".'], g.S)); }
  };
  var placeIdle = {
    skrivebord: function (g) { return g.say('player', done(g.S, 'q0') ? 'Tasken er pakket. Nu skal jeg have morgenmad.' : 'Skoletasken ligger klar.'); },
    seng: function (g) { return g.say(null, 'Din seng. Redt — næsten. Mor ville kalde det "et forsøg".'); },
    tv: function (g) { return g.say(null, 'Fjernsynet er slukket. Der er skole i dag, desværre.'); },
    koeleskab: function (g) { return g.say(null, 'Rugbrød, leverpostej og en tegning fra Ida på døren.'); },
    komfur: function (g) { return g.say(null, 'Det dufter af boller fra ovnen.'); },
    reol: function (g) { return g.say(null, 'Mest Idas bøger. Og en gammel matematikbog fra sidste år.'); },
    postkasse: function (g) { return g.say(null, 'Postkassen. Der ligger en tilbudsavis — og en regning til Far.'); },
    kioskskilt: function (g) { return g.say(null, 'KIOSKEN — is, aviser og bland selv-slik.'); },
    parkskilt: function (g) { return g.say(null, 'PARKEN. Fodr ikke ænderne med brød — de bliver syge af det.'); },
    baenk_bib: function (g) { return g.say(null, 'En bænk foran biblioteket. Nogen har glemt en halvspist æble.'); },
    baenk_park: function (g) { return g.say(null, 'Her sidder de gamle og fodrer ænderne hver eneste formiddag.'); },
    lygtepael: function (g) { return g.say(null, 'Nogen har ridset et regnestykke ind i lygtepælen. Det passer endda.'); },
    lygte: function (g) { return g.say(null, g.tid() === 'tidlig' ? 'Gadelygten lyser stadig. Det er ikke helt lyst endnu.' : 'En gadelygte. Den har slukket sig selv.'); },
    bus: function (g) { return g.say(null, 'Busstoppestedet. Bussen er kørt — du må gå. Skolen ligger heldigvis lige for enden af vejen.'); },
    maal: function (g) { return g.say(null, 'Nettet har et hul. Det har det haft i to år.'); },
    cykler: function (g) { return g.say(null, 'Cykelstativet. Din cykel står derhjemme — du sov over dig.'); },
    cykler_butik: function (g) { return g.say(null, 'Fars cykel med cykelkurven. Den skal nok blive fyldt.'); },
    frugt: function (g) { return g.say(null, 'Æbler, bananer og noget, der ligner meget dyre blåbær.'); },
    kassen: function (g) { return g.say(null, 'Køen er lang. Far beder dig helt sikkert regne noget ud imens.'); },
    tilbud: function (g) { return g.say(null, 'TILBUD: Yoghurt — 3 for 20 kr! Kartofler i løs vægt. Grill med rabat.'); },
    fryser: function (g) { return g.say(null, 'Is, ærter og fiskefrikadeller. Det er koldt at stå her.'); },
    opslag_bib: function (g) { return g.say(null, '"Læsemaraton starter mandag." "Lektiecafé hver torsdag — alle er velkomne."'); },
    opslag_skole: function (g) { return g.say(null, '"Forældremøde torsdag." "Husk gymnastiktøj." "Matematikprøve — fredag."'); },
    skabe: function (g) { return g.say(null, 'Elevskabe. Dit er nummer 14. Det er låst — og du har glemt koden.'); },
    tavle: function (g) { return g.say(null, g.S.cut ? 'Tavlen er fuld af regnestykker. Alle de andre ser ud til at forstå dem.' : 'Der står stadig gårsdagens opgaver. De ser pludselig ikke så slemme ud.'); },
    bogreol: function (g) { return g.say(null, 'Matematikbøger. Række efter række af dem.'); }
  };

  // ---------------------------------------------------------------- kapitler
  // Kapitel 1 er dagen ovenfor. Kapitel 2 (udflugten) og 3 (lørdagsmarkedet) ligger i
  // kapitel2.js og kapitel3.js og lægger deres personer, missioner og opgavesæt oveni med
  // RH.content.tilfoej({...}). Alt i et kapitel har en kap-markering, så Dagbogen kun viser det,
  // man har nået. Sværhedsgraden stiger ét klassetrin pr. kapitel: S.klasse = startKlasse + kap − 1
  // (højst 6. klasse) — det bestemmer game.js, når et kapitel begynder.
  var KAPITLER = 3;
  var kapitler = {
    1: {
      navn: 'En almindelig skoledag', start: null,
      tod: function (S) {
        if (S.cut) return 'igaar';
        if (S.q.q1 !== 'done') return 'tidlig';
        if (S.q.q3 !== 'done') return 'morgen';
        if (S.q.q5 !== 'done') return 'formiddag';
        return 'eftermiddag';
      },
      efterTitel: 'Dagen er klaret!', efterMaal: 'Gå rundt, og hjælp dem, der stadig har brug for det',
      efter: { npc: 'poulsen' }, sider: ['s1', 's2', 's3', 's4', 's5', 's6'],
      slut: {
        titel: 'Du klarede det!',
        tekst: 'I går kunne du ikke se, hvor regnestykkerne startede. I dag har du regnet dig gennem en hel dag. Her er, hvad du har vist, at du kan:',
        rundt: 'Gå rundt i kvarteret'
      }
    }
  };
  function kapNu() { return kapitler[(RH.state && RH.state.kap) || 1] || kapitler[1]; }

  function tilfoej(e) {
    var kap = e.kap;
    [[npcs, e.npcs], [places, e.places], [placePos, e.placePos], [lockedDoors, e.lockedDoors], [ENC, e.enc], [REWARDS, e.rewards], [ITEMS, e.items],
     [on, e.on], [offer, e.offer]].forEach(function (par) {
      Object.keys(par[1] || {}).forEach(function (k) { par[0][k] = par[1][k]; });
    });
    // Replikker til personer, der også findes i et tidligere kapitel (fx Oskar og Hr. Poulsen), gælder kun i det her kapitel
    [[idle, e.idle], [placeIdle, e.placeIdle]].forEach(function (par) {
      Object.keys(par[1] || {}).forEach(function (k) {
        var gammel = par[0][k], ny = par[1][k];
        par[0][k] = gammel ? function (g) { return (g.S.kap || 1) === kap ? ny(g) : gammel(g); } : ny;
      });
    });
    (e.things || []).forEach(function (t) { t.kap = kap; things.push(t); });
    (e.bog || []).forEach(function (p) { BOG.push(p); });
    (e.quests || []).forEach(function (q) { q.kap = kap; quests.push(q); byId[q.id] = q; });
    kapitler[kap] = e.meta;
  }

  // ---------------------------------------------------------------- opslag
  async function talk(g, id) {
    var S = g.S;
    // Efter et kapitel: personen, der sender én videre til næste kapitel
    var kp = kapitler[S.kap || 1], nxt = kapitler[(S.kap || 1) + 1];
    if (kp && kp.efter && kp.efter.npc === id && (S.klaret || []).indexOf(S.kap || 1) >= 0 && nxt) {
      var c = await g.ask(id, nxt.tilbud || 'Der er mere at regne på. Kommer du med?', ['Ja — afsted: ' + nxt.navn + '!', 'Ikke lige nu.']);
      if (c === 0) { await g.naesteKapitel(); return; }
    }
    for (var i = 0; i < quests.length; i++) {
      var q = quests[i];
      if (S.q[q.id] === 'active' && on[q.id] && on[q.id][id]) return on[q.id][id](g);
    }
    for (var j = 0; j < quests.length; j++) {
      var q2 = quests[j];
      if (!S.q[q2.id] && q2.side && q2.giver === id && available(q2) && offer[q2.id]) return offer[q2.id](g);
    }
    if (idle[id]) return idle[id](g);
    if (placeIdle[id]) return placeIdle[id](g);
  }

  RH.content = {
    npcs: npcs, things: things, places: places, placePos: placePos, lockedDoors: lockedDoors, script: script,
    talk: talk, available: available, ENC: ENC, REWARDS: REWARDS, REWARD_PCT: REWARD_PCT, ITEMS: ITEMS, PAUSESPIL: PAUSESPIL,
    PLAYS_PER_ITEM: PLAYS_PER_ITEM, MAX_PLAYS: MAX_PLAYS, BOG: BOG,
    SKIN: SKIN, HAIRC: HAIRC, CLOTH: CLOTH, PANTS: PANTS, STYLES: STYLES, EXTRAS: EXTRAS, STD_LOOK: STD_LOOK,
    KAPITLER: KAPITLER, kapitler: kapitler, tilfoej: tilfoej, kapNu: kapNu, main: main, side: side,
    quest: function (id) { return byId[id]; },
    // Missioner til Dagbogen: kun dem fra de kapitler, spilleren har nået
    questList: function () { var k = (RH.state && RH.state.kap) || 1; return quests.filter(function (q) { return (q.kap || 1) <= k; }); },
    goal: function (id) { var q = byId[id], gl = q.goal; return typeof gl === 'function' ? gl(RH.state) : gl; },
    // Hvem skal have et "!" (har en ekstramission til dig) og hvem et "?" (din mission fortsætter her)
    markers: function (S) {
      var m = {};
      if (S.cut) return m;
      quests.forEach(function (q) {
        if (S.q[q.id] === 'active') { var t = q.target(S); if (t && !m[t]) m[t] = '?'; }
        else if (!S.q[q.id] && q.side && available(q)) m[q.giver] = '!';
      });
      return m;
    },
    mainTarget: function (S) {
      for (var i = 0; i < quests.length; i++) { var q = quests[i]; if (!q.side && S.q[q.id] === 'active') return { q: q, t: q.target(S) }; }
      for (var j = 0; j < quests.length; j++) { var q2 = quests[j]; if (q2.side && S.q[q2.id] === 'active') return { q: q2, t: q2.target(S) }; }
      return null;
    },
    // Dagen går: tidlig morgen med gadelygterne tændt, så formiddag og eftermiddag
    timeOfDay: function (S) { return kapNu().tod(S); }
  };
})();
