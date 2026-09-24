/* Runeborg — historien
   Alt indhold: personer, missioner, opgaver, spor, evner og runestykker.

   Opgaverne er valgt ud fra de områder, hvor danske elever klarede sig
   dårligst i PISA 2025: læsning (finde information, fakta/holdning,
   kildekritik), naturfag (planlægge undersøgelser og især fortolke data og
   evidens) og matematik i hverdagssituationer (forhold, procent, målestok).
   Nysgerrighed og vedholdenhed, som også faldt, belønnes i selve spillet:
   runestykker at finde, og ingen straf for at prøve igen.

   Hver mission bygger på den forrige: evner og spor, man har samlet, bliver
   brugt senere — sporene i dagbogen er bogstaveligt talt dem, man skal
   fremlægge for borgmesteren. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};

  var AREA = {
    find: 'Læsning · Find informationen',
    fakta: 'Læsning · Fakta eller holdning',
    kilde: 'Læsning · Kildekritik',
    forsog: 'Naturfag · Fair undersøgelse',
    data: 'Naturfag · Data og beviser',
    argument: 'Tænk kritisk · Beviser',
    forhold: 'Matematik · Forhold',
    procent: 'Matematik · Pris og procent',
    maalestok: 'Matematik · Målestok'
  };
  var CANDO = [
    ['find', 'finde præcis det, en tekst fortæller'],
    ['fakta', 'skelne fakta fra holdninger'],
    ['kilde', 'vurdere, om en kilde er til at stole på'],
    ['forsog', 'planlægge en fair undersøgelse'],
    ['data', 'aflæse grafer og se, hvad data faktisk viser'],
    ['argument', 'bruge beviser, når jeg skal overbevise nogen'],
    ['forhold', 'regne med forhold og skalere en opskrift'],
    ['procent', 'sammenligne priser og regne med procent'],
    ['maalestok', 'bruge et korts målestok']
  ];

  // ---------------------------------------------------------------- klasser
  var classes = [
    { name: 'Kriger', desc: 'Modig og stærk — men beviser slår muskler.', look: { hair: '#7a4a2a', cloth: '#b03a3a', hat: 'helmet', hatColor: '#9a9aa8', accent: '#e8e8f0' } },
    { name: 'Magiker', desc: 'Klog og nysgerrig — elsker gamle bøger.', look: { hair: '#e8d8a8', cloth: '#3a4ab0', hat: 'wizard', hatColor: '#3a4ab0', accent: '#ffe070' } },
    { name: 'Spejder', desc: 'Skarpe øjne — ser detaljer, andre overser.', look: { hair: '#5a3a22', cloth: '#3a7a3a', hat: 'hood', hatColor: '#2c5a2c', skin: '#e0a878' } },
    { name: 'Bard', desc: 'God til ord — og til at stille spørgsmål.', look: { hair: '#2a1a1a', cloth: '#8a3a8a', hat: 'feather', hatColor: '#c83a5a', accent: '#ffe070', skin: '#a86a48' } }
  ];

  // ---------------------------------------------------------------- personer
  // pos(S) giver {map,x,y,dir} eller null, hvis personen ikke er der lige nu.
  function at(map, x, y, dir) { return function () { return { map: map, x: x, y: y, dir: dir || 'down' }; }; }
  // Til høstfesten til sidst samles byens venner på torvet
  function festOr(normal, p) { return function (S) { return S.flags.clean ? { map: 'by', x: p[0], y: p[1], dir: p[2] } : normal(S); }; }
  var npcs = {
    brynja: { name: 'Brynja Jernskæg', look: { hair: '#c8502a', beard: true, beardColor: '#c8502a', hat: 'helmet', hatColor: '#c0a040', accent: '#ffe070', cloth: '#3a5aa8', skin: '#f0b890' }, pos: festOr(at('laug', 6, 3), [23, 20, 'down']) },
    mira: { name: 'Mira, lærling', look: { hair: '#2a1a1a', cloth: '#5a8a4a', skin: '#8a5a3a' }, pos: at('laug', 10, 7, 'left') },
    gorm: { name: 'Gorm, kroværten', look: { skin: '#8ab870', tusks: true, hair: '#2a2a2a', cloth: '#8a5a2a', belt: '#e8d8b4' }, pos: festOr(at('kro', 3, 2), [28, 21, 'left']) },
    karl: { name: 'Karl, bonde', look: { hair: '#c8a060', cloth: '#6a7a3a', hat: 'beret', hatColor: '#8a6a3a' }, pos: at('kro', 10, 5, 'up') },
    agnete: { name: 'Agnete', look: { hair: '#8a8a8a', cloth: '#7a3a5a', skin: '#f0c8a0' }, pos: at('kro', 13, 7, 'up') },
    troels: { name: 'Gamle Troels', look: { hair: '#e8e8e8', beard: true, beardColor: '#e8e8e8', cloth: '#4a4a6a' }, pos: at('kro', 4, 8, 'up') },
    laerke: { name: 'Lærke, bard', look: { hair: '#e8a040', cloth: '#c85a8a', hat: 'feather', hatColor: '#3a8a7a', accent: '#ff9d81' }, pos: festOr(at('kro', 8, 6), [24, 19, 'down']) },
    ugla: { name: 'Ugla, bibliotekar', look: { hair: '#e8e0c0', ears: true, cloth: '#4a6a3a', skin: '#f4d8b8' }, pos: festOr(at('bibliotek', 7, 2), [19, 22, 'right']) },
    zara: { name: 'Zara, alkymist', look: { skin: '#c8708a', horns: true, accent: '#3a2a3a', hair: '#2a1a3a', cloth: '#6a3a8e' }, pos: festOr(at('alkymist', 6, 3), [26, 24, 'up']) },
    aldrik: { name: 'Borgmester Aldrik', look: { hair: '#9a9a9a', beard: true, beardColor: '#b8b8b8', hat: 'beret', hatColor: '#a02e38', accent: '#ffe070', cloth: '#8a1a2a' }, pos: at('by', 22, 20) },
    hilde: {
      name: 'Hilde', look: { hair: '#b8b8c8', hat: 'wizard', hatColor: '#3a2a4a', accent: '#9ad0ff', cloth: '#4a3a5a', skin: '#f0c8a0' },
      pos: function (S) { return S.flags.clean ? { map: 'by', x: 27, y: 21, dir: 'left' } : S.flags.hildeFree ? { map: 'by', x: 30, y: 6, dir: 'down' } : { map: 'by', x: 31, y: 20, dir: 'down' }; }
    },
    ole: { name: 'Færgemand Ole', look: { hair: '#6a6a6a', beard: true, beardColor: '#8a8a8a', cloth: '#3a5a7a', hat: 'beret', hatColor: '#2a3a5a' }, pos: at('by', 27, 10) },
    sigrid: { name: 'Sigrid', look: { hair: '#e8c060', cloth: '#c85a3a', skin: '#f4d0a8' }, pos: at('by', 17, 17) },
    bodil: { name: 'Bodil, bager', look: { hair: '#c86a3a', cloth: '#e8e0d0', belt: '#c8b48c', skin: '#f0c090' }, pos: at('by', 19, 20, 'right') },
    aksel: { name: 'Aksel', look: { hair: '#3a2a1a', cloth: '#3a6ab0', skin: '#8a5a3a' }, pos: at('by', 14, 10, 'up') },
    durin: { name: 'Durin, dværg', look: { hair: '#2a2a2a', beard: true, beardColor: '#2a2a2a', cloth: '#7a5a2a', hat: 'helmet', hatColor: '#8a8a9a' }, pos: at('by', 18, 22) },
    liv: { name: 'Liv, elver', look: { hair: '#f0e0a0', ears: true, cloth: '#3a8a6a' }, pos: at('by', 27, 22) },
    knud: { name: 'Knud, kræmmer', look: { hair: '#8a5a3a', cloth: '#c8a030', hat: 'beret', hatColor: '#3a3a8a' }, pos: at('by', 30, 22) },
    bjorn: { name: 'Bjørn, smed', look: { hair: '#1a1a1a', beard: true, beardColor: '#1a1a1a', cloth: '#5a4a3a', skin: '#b87850' }, pos: at('by', 20, 28, 'left') },
    esben: {
      name: 'Esben, portvagt', look: { hair: '#5a3a22', cloth: '#5a5a7a', hat: 'helmet', hatColor: '#9a9aa8' },
      pos: function (S) { return S.flags.gateOpen ? { map: 'by', x: 44, y: 16, dir: 'down' } : { map: 'by', x: 44, y: 17, dir: 'left' }; }
    },
    ulf: {
      name: 'Ulf, vagt', look: { hair: '#3a2a1a', cloth: '#2a3a6a', hat: 'helmet', hatColor: '#5a5a6a', beard: true, beardColor: '#3a2a1a' },
      pos: function (S) { return S.flags.f_guard ? { map: 'farveri', x: 13, y: 12, dir: 'left' } : { map: 'farveri', x: 11, y: 12, dir: 'down' }; }
    },
    baron: { name: 'Baron Grimmark', look: { hair: '#1a1a1a', cloth: '#2a3a6a', hat: 'tophat', hatColor: '#1a1a2a', accent: '#e0a82c', skin: '#f4d8c0' }, pos: at('farveri', 11, 2) },
    glod: { name: 'Glød, laugets drage', dragon: true, pos: festOr(at('laug', 2, 2), [22, 19, 'down']) }
  };

  // ---------------------------------------------------------------- ting i verden
  // Ting er ikke personer: vandprøver, runestykker, katten.
  var things = [
    { id: 'sampleA', map: 'by', x: 12, y: 5, kind: 'sample', visible: function (S) { return S.q.q5 === 'active' && !S.flags.sA; } },
    { id: 'sampleB', map: 'by', x: 42, y: 10, kind: 'sample', visible: function (S) { return S.q.q5 === 'active' && !S.flags.sB; } },
    { id: 'mis', map: 'by', x: 43, y: 14, kind: 'cat', visible: function (S) { return S.q.s1 === 'active' && !S.flags.misFound; } }
  ];
  var runes = [
    { id: 'r1', map: 'by', x: 20, y: 4, where: 'Engen nord for åen', title: 'Om vand', t: 'Vand kan opløse flere stoffer end næsten alle andre væsker. Derfor blandes farvesalt så let ud i en å — og derfor skal man passe på, hvad man hælder i den.' },
    { id: 'r2', map: 'by', x: 3, y: 20, where: 'Vest i byen, ved den øvre gade', title: 'Om rygter', t: 'Et gammelt ordsprog fra Runeborg: "Et rygte løber tre gange rundt om torvet, før sandheden har fået støvlerne på."' },
    { id: 'r3', map: 'laug', x: 11, y: 8, where: 'Inde i Eventyrerlauget', title: 'Om drager', t: 'Drager græder, når de griner. Deres tårer er varme som te og renser alt, de rører ved. Derfor spørger alkymister altid pænt.' },
    { id: 'r4', map: 'by', x: 12, y: 24, where: 'Mellem biblioteket og smedjen', title: 'Om kort', t: 'Runeborgs første kortmager tegnede byen dobbelt så stor, som den var. Han havde glemt målestokken — og alle gik vild i en uge.' },
    { id: 'r5', map: 'by', x: 40, y: 10, where: 'Ved åbredden mod øst', title: 'Om fisk', t: 'Ørreder kan kun leve i rent vand med masser af ilt. Forsvinder ørrederne fra en å, er det et tegn på, at noget er galt.' },
    { id: 'r6', map: 'kro', x: 15, y: 9, where: 'På kroen', title: 'Om Den Gyldne Drage', t: 'Kroen er opkaldt efter en drage, der engang betalte for sin suppe med et gyldent skæl. Skællet hænger stadig over disken, siger Gorm. Ingen har nogensinde set det.' },
    { id: 'r7', map: 'bibliotek', x: 13, y: 9, where: 'På biblioteket', title: 'Om spørgsmål', t: 'Skrevet med sirlig hånd: "Den, der spørger, er dum i fem minutter. Den, der aldrig spørger, er dum hele livet."' },
    { id: 'r8', map: 'farveri', x: 3, y: 9, where: 'Et sted i farveriet', title: 'Om farver', t: 'Blå farve var engang så dyr, at kun konger havde råd. Så lærte man at lave den af planter — og snart kunne alle få en blå kappe.' }
  ];

  // Felter på kortet, man kan undersøge (skilte, tavlen, brønden, rør ...)
  var places = {
    'by:28,19': 'tavle', 'by:21,21': 'brond', 'by:43,10': 'ror',
    'by:12,16': 'sign_laug', 'by:41,15': 'sign_kro', 'by:11,29': 'sign_bib', 'by:32,29': 'sign_alk', 'by:23,33': 'sign_syd', 'by:43,19': 'sign_port',
    'by:45,17': 'port', 'by:45,18': 'port', 'by:20,29': 'ambolt',
    'farveri:5,7': 'ventil', 'farveri:8,7': 'ventil', 'farveri:17,7': 'ventil',
    'farveri:3,13': 'kar', 'farveri:5,13': 'kar', 'farveri:17,13': 'kar', 'farveri:19,13': 'kar',
    'laug:6,1': 'vaegkort', 'kro:8,1': 'banner', 'alkymist:6,4': 'kedel'
  };
  var placePos = { tavle: ['by', 28, 19], brond: ['by', 21, 21], ventil: ['farveri', 8, 7], ror: ['by', 43, 10] };

  // ---------------------------------------------------------------- spor og evner
  var clues = {
    c_lukket: { t: 'Månebrønden blev lukket den 5. dag i Høstmåneden. Vandet er grønt og lugter, og syv er blevet syge.', src: 'Borgmesterens opslag på tavlen', why: 'Det er rigtigt, men det fortæller ikke, hvorfor vandet er grønt.' },
    c_farveri: { t: 'Vandet blev grønt i samme uge, som farveriet åbnede.', src: 'Karl på kroen — et faktum, der kan tjekkes', evidence: true },
    c_rygte: { t: 'Borgmesteren påstår, at heksen Hilde har skylden.', src: 'Påstand — ingen beviser', weak: true, why: 'Det er en påstand uden beviser. Den kan ikke bruges som bevis for sig selv.' },
    c_hat: { t: 'Agnete siger, at Hilde er ond, fordi hun går med sort hat.', src: 'Holdning — og en fordom', weak: true, why: 'En sort hat er ikke et bevis. Det er en fordom.' },
    c_pjece: { t: 'Baronen skriver, at farvesaltet er ufarligt — men han har selv undersøgt det.', src: 'Baronens pjece — ikke uvildig', weak: true, why: 'Baronen har selv interesse i sagen. Hans pjece er ikke et uvildigt bevis.' },
    c_ole: { t: 'Oles logbog: grønt vand fra dag 5 — kun nedenfor farveriets rør. Ovenfor er vandet klart.', src: 'Øjenvidne med datoer', evidence: true },
    c_data: { t: 'Målinger: Nordbækken 1, ved røret 9, Månebrønden 6. Grønheden steg, efter farveriet startede.', src: 'Vores egne målinger hos Zara', evidence: true },
    c_fisk: { t: 'Aksel talte tolv fisk i åen i sidste uge. I dag så han ingen.', src: 'Optælling ved åen', evidence: true },
    c_opskrift: { t: 'Månebrønden skal have 150 skefulde månesalt for at blive ren.', src: 'Regnet ud fra Hildes opskrift' }
  };
  var skills = {
    laeselup: { name: 'Læseluppen', desc: 'Du finder præcis det, en tekst siger — og lægger mærke til detaljer. Nu kan du se runestykker rundt om i byen.' },
    sandhed: { name: 'Sandhedsøjet', desc: 'Du kan skelne fakta, der kan tjekkes, fra holdninger og rygter.' },
    kilde: { name: 'Kildekritik', desc: 'Du spørger: Hvem har skrevet det? Hvorfor? Og hvordan ved de det?' },
    forsker: { name: 'Forskerblikket', desc: 'Du kan planlægge en fair test, hvor kun én ting ændres ad gangen.' },
    data: { name: 'Dataøjet', desc: 'Du kan aflæse grafer og se forskel på det, data viser, og det, folk påstår.' },
    skalering: { name: 'Skaleringsstaven', desc: 'Du ved, at opskrifter skal ganges — ikke lægges til — når man laver mere.' },
    kobmand: { name: 'Købmandsøjet', desc: 'Du regner prisen pr. stk. ud og kan regne med procent og rabat.' },
    maalestok: { name: 'Kortmagerens passer', desc: 'Du kan bruge et korts målestok til at finde afstande i virkeligheden.' }
  };

  // ---------------------------------------------------------------- missioner
  var ACT1 = 'Akt 1 · Rygter i Runeborg', ACT2 = 'Akt 2 · Beviserne', ACT3 = 'Akt 3 · Eliksiren', ACT4 = 'Akt 4 · Farveriet';
  var quests = [
    { id: 'q0', act: ACT1, title: 'Lærlingens første dag', desc: 'Læs laugets regler hos Brynja.', target: function () { return 'brynja'; }, goal: 'Tal med Brynja i Eventyrerlauget' },
    { id: 'q1', act: ACT1, title: 'Opslagstavlen', desc: 'Find ud af, hvad der står på tavlen på torvet.', requires: ['q0'], target: function () { return 'tavle'; }, goal: 'Læs opslagene på tavlen på torvet' },
    { id: 'q2', act: ACT1, title: 'Rygter på Den Gyldne Drage', desc: 'Hør, hvad folk siger på kroen — og skil fakta fra holdninger.', requires: ['q1'], uses: 'Opslaget om brønden', target: function () { return 'gorm'; }, goal: 'Hør rygterne på kroen' },
    { id: 'q3', act: ACT1, title: 'To kilder, to historier', desc: 'Sammenlign baronens pjece med færgemandens logbog.', requires: ['q2'], uses: 'Sporet om farveriet fra kroen', target: function () { return 'ugla'; }, goal: 'Find Ugla på biblioteket' },
    { id: 'q4', act: ACT2, title: 'Alkymistens forsøg', desc: 'Planlæg en fair test sammen med Zara.', requires: ['q3'], uses: 'Kildekritik: vi må undersøge selv', target: function () { return 'zara'; }, goal: 'Besøg Zara i alkymistens værksted' },
    {
      id: 'q5', act: ACT2, title: 'Prøverne taler', desc: 'Tag vandprøver tre steder, og fortolk målingerne.', requires: ['q4'], uses: 'Måleglasset fra forsøget',
      target: function (S) { if (!S.flags.sA) return 'sampleA'; if (!S.flags.sB) return 'sampleB'; if (!S.flags.sC) return 'brond'; return 'zara'; },
      goal: function (S) { var n = (S.flags.sA ? 1 : 0) + (S.flags.sB ? 1 : 0) + (S.flags.sC ? 1 : 0); if (n < 3) return 'Tag vandprøver: ' + n + ' af 3 (' + (!S.flags.sA ? 'Nordbækken' : !S.flags.sB ? 'farveriets rør' : 'Månebrønden') + ')'; return 'Bring prøverne til Zara'; }
    },
    { id: 'q6', act: ACT2, title: 'Sagen mod Hilde', desc: 'Overbevis borgmesteren med beviser — ikke rygter.', requires: ['q5'], uses: 'Sporene i din dagbog', target: function () { return 'aldrik'; }, goal: 'Skynd dig til torvet — borgmesteren vil dømme Hilde' },
    { id: 'q7', act: ACT3, title: 'Hildes opskrift', desc: 'Regn Klarvandseliksiren op til hele brønden.', requires: ['q6'], uses: 'Hilde er fri takket være dine beviser', target: function () { return 'hilde'; }, goal: 'Besøg Hilde i hytten på engen' },
    { id: 'q8', act: ACT3, title: 'Markedsdag', desc: 'Køb månesalt der, hvor det er billigst.', requires: ['q7'], uses: 'Opskriften: 150 skefulde månesalt', target: function () { return 'durin'; }, goal: 'Køb månesalt på markedet på torvet' },
    { id: 'q9', act: ACT3, title: 'Kortet til farveriet', desc: 'Brug målestokken på Brynjas kort.', requires: ['q8'], uses: 'Månesaltet til eliksiren', target: function () { return 'brynja'; }, goal: 'Gå tilbage til Brynja i lauget' },
    {
      id: 'q10', act: ACT4, title: 'Farveriets hemmelighed', desc: 'Kom forbi vagten, luk det rigtige rør, og stil baronen til ansvar.', requires: ['q9'], uses: 'Alt, du har lært',
      target: function (S) { if (!S.flags.f_guard) return 'ulf'; if (!S.flags.f_valve) return 'ventil'; return 'baron'; },
      goal: function (S) { if (!S.flags.f_guard) return 'Gå gennem Østporten til farveriet'; if (!S.flags.f_valve) return 'Find røret, der leder farvesalt ud i åen'; return 'Stil Baron Grimmark til ansvar'; }
    },
    { id: 's1', act: 'Ekstramissioner', side: true, title: 'Hvor er Mis?', desc: 'Find Sigrids kat ud fra beskrivelsen på opslaget.', requires: ['q1'], giver: 'sigrid', uses: 'Opslaget om Mis', target: function (S) { return S.flags.misFound ? 'sigrid' : 'mis'; }, goal: function (S) { return S.flags.misFound ? 'Bring Mis hjem til Sigrid' : 'Find Mis — læs beskrivelsen i opslaget igen'; } },
    { id: 's2', act: 'Ekstramissioner', side: true, title: 'Rygtejægeren', desc: 'Saml rygter til Lærkes vise — og skil sand fra snak.', requires: ['q2'], giver: 'laerke', uses: 'Sandhedsøjet', target: function (S) { if (!S.flags.rBodil) return 'bodil'; if (!S.flags.rAksel) return 'aksel'; if (!S.flags.rOle) return 'ole'; return 'laerke'; }, goal: function (S) { var n = (S.flags.rBodil ? 1 : 0) + (S.flags.rAksel ? 1 : 0) + (S.flags.rOle ? 1 : 0); return n < 3 ? 'Hør rygter hos Bodil, Aksel og Ole (' + n + '/3)' : 'Gå tilbage til Lærke på kroen'; } },
    { id: 's3', act: 'Ekstramissioner', side: true, title: 'Smedens blanding', desc: 'Hjælp Bjørn med at blande jern og kul i det rigtige forhold.', requires: ['q7'], giver: 'bjorn', uses: 'Skaleringsstaven', target: function () { return 'bjorn'; }, goal: 'Hjælp Bjørn ved smedjen' }
  ];
  var byId = {}; quests.forEach(function (q) { byId[q.id] = q; });

  function available(q) { var S = RB.state; return (q.requires || []).every(function (r) { return S.q[r] === 'done'; }); }

  // ---------------------------------------------------------------- opgaverne
  var DOC_REGLER = { kind: 'letter', title: 'Eventyrerlaugets regler for lærlinge', lines: [
    '1. En lærling hjælper byens borgere — store som små, rige som fattige.',
    '2. En lærling bærer altid sin dagbog og skriver sine spor ned.',
    '3. Før en lærling påstår noget, skal hun eller han finde beviser for det.',
    '4. En lærling giver aldrig op efter første forsøg. Det er dér, man lærer mest.',
    '5. Lærlinge må ikke fodre laugets drage efter solnedgang.'
  ] };
  var DOC_A = { kind: 'notice', title: 'BEKENDTGØRELSE', lines: [
    'Månebrønden er lukket fra og med den 5. dag i Høstmåneden.',
    'Vandet er blevet grønt og lugter af rådne æg.',
    'Syv borgere har fået ondt i maven efter at have drukket det.',
    'Indtil videre skal drikkevand hentes hos vandsælgeren ved Østporten for 2 kobber pr. spand.'
  ], by: '— Borgmester Aldrik Stenhjelm' };
  var DOC_B = { kind: 'notice', title: 'BELØNNING', lines: ['60 guldstykker til den, der finder ud af, hvorfor vandet i Månebrønden er grønt. Henvend dig i Eventyrerlauget.'] };
  var DOC_C = { kind: 'notice', title: 'FORSVUNDET: MIS', lines: [
    'Min kat Mis er væk. Hun er rødlig og har grønne øjne.',
    'Hun elsker fisk og gemmer sig altid mellem to ting, hvor ingen kan se hende.',
    'Hun blev sidst set øst for kroen.'
  ], by: '— Sigrid, det røde hus ved siden af lauget' };
  var DOC_PJECE = { kind: 'pamphlet', title: 'FARVERIET — EN GAVE TIL RUNEBORG', lines: [
    'Grimmarks Farveri laver de smukkeste stoffer i hele kongeriget.',
    'Vores farvesalt er fuldstændig ufarligt. Det har vi selv undersøgt.',
    'Alle, der siger noget andet, er bare misundelige.',
    'Køb Grimmark-blå i dag — nu med 10 % rabat!'
  ], by: '— Baron Grimmark, ejer af Grimmarks Farveri' };
  var DOC_LOG = { kind: 'log', title: 'Færgemand Oles logbog (afskrift)', lines: [
    'Dag 1: Åen er klar. Fangede seks ørreder ved broen.',
    'Dag 3: Farveriet tændte sine kedler for første gang. Masser af røg.',
    'Dag 4: Åen er stadig klar ovenfor farveriets rør.',
    'Dag 5: Grønt vand nedenfor røret. Tre døde fisk ved broen.',
    'Dag 7: Stadig grønt nedenfor røret. Ovenfor røret er vandet klart.'
  ], by: 'Afskrevet af Ugla, bibliotekar' };
  var DOC_GLAS = { kind: 'letter', title: 'Zaras fire glas', html:
    '<table><tr><th>Glas</th><th>Vand</th><th>Farvesalt</th><th>Temperatur</th></tr>' +
    '<tr><td>A</td><td>klart vand</td><td>1 skefuld</td><td>stuevarm</td></tr>' +
    '<tr><td>B</td><td>klart vand</td><td>ingen</td><td>stuevarm</td></tr>' +
    '<tr><td>C</td><td>brøndvand</td><td>ingen</td><td>varmet op</td></tr>' +
    '<tr><td>D</td><td>klart vand</td><td>1 skefuld</td><td>varmet op</td></tr></table>' };
  var CH_BAR = { kind: 'bar', title: 'Grønhed i vandprøverne (0 = klart, 10 = helt grønt)', labels: ['Nordbækken', 'Ved røret', 'Månebrønden'], values: [1, 9, 6], colors: ['#6fb0e8', '#8cc43c', '#b8d85a'], max: 10 };
  var CH_LINE = { kind: 'line', title: 'Grønhed i Månebrønden, dag for dag', labels: ['1', '2', '3', '4', '5', '6', '7'], values: [1, 1, 1, 2, 6, 7, 6], max: 10, marker: { at: 2, label: 'Farveriet starter' }, xlabel: 'Dag' };
  var DOC_OPSKRIFT = { kind: 'recipe', title: 'Klarvandseliksir — nok til 4 spande vand', lines: ['3 skefulde månesalt', '2 kviste sølvmynte', '1 dråbe dragetåre (spørg pænt)', 'Rør rundt syv gange med uret.'], by: '— fra Hildes gamle bog' };
  var DOC_PRISER = { kind: 'notice', title: 'Månesalt på markedet i dag', html:
    '<table><tr><th>Købmand</th><th>Pose</th><th>Pris</th></tr>' +
    '<tr><td>Durin (dværg)</td><td>50 skefulde</td><td>20 guld</td></tr>' +
    '<tr><td>Liv (elver)</td><td>30 skefulde</td><td>15 guld</td></tr>' +
    '<tr><td>Knud (kræmmer)</td><td>75 skefulde</td><td>36 guld — <b>i dag 25 % rabat!</b></td></tr></table>' };
  var DOC_KORT = { kind: 'letter', title: 'Brynjas kort over egnen', html:
    '<svg viewBox="0 0 400 220" style="width:100%;height:auto;display:block" font-family="Atkinson Hyperlegible, Verdana, sans-serif" font-size="14">' +
    '<rect x="0" y="0" width="400" height="220" fill="#ead6a6"/>' +
    '<path d="M0 150 C80 140 120 170 200 150 S320 120 400 135" stroke="#6a9a4a" stroke-width="10" fill="none" opacity=".8"/>' +
    '<g fill="#5a8a4a">' + [30, 60, 330, 360, 300].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (40 + (i % 2) * 18) + '" r="12"/>'; }).join('') + '</g>' +
    '<line x1="50" y1="185" x2="170" y2="185" stroke="#8a2a2a" stroke-width="4" stroke-dasharray="10 6"/>' +
    '<line x1="170" y1="185" x2="350" y2="95" stroke="#8a2a2a" stroke-width="4" stroke-dasharray="10 6"/>' +
    '<rect x="30" y="170" width="36" height="28" fill="#a02e38" stroke="#3a2616" stroke-width="3"/><text x="18" y="214" fill="#3a2616">Runeborg</text>' +
    '<rect x="160" y="140" width="22" height="12" fill="#8e5a32" stroke="#3a2616" stroke-width="2"/><text x="140" y="132" fill="#3a2616">Broen</text>' +
    '<rect x="336" y="72" width="40" height="30" fill="#2c4a9c" stroke="#3a2616" stroke-width="3"/><text x="286" y="64" fill="#3a2616">Farveriet</text>' +
    '<text x="92" y="178" fill="#8a2a2a" font-weight="bold">3 cm</text><text x="262" y="130" fill="#8a2a2a" font-weight="bold">4,5 cm</text>' +
    '<rect x="230" y="190" width="40" height="8" fill="#3a2616"/><rect x="270" y="190" width="40" height="8" fill="#ead6a6" stroke="#3a2616" stroke-width="2"/>' +
    '<text x="232" y="184" fill="#3a2616">1 cm = 200 m</text>' +
    '</svg>' };
  var DOC_CERT = { kind: 'pamphlet', title: 'CERTIFIKAT', lines: ['Hermed bekræftes, at Grimmarks Farveri er 100 % rent og ufarligt.', 'Undersøgt og godkendt af: Baron Grimmark', 'Underskrevet af: Baron Grimmark'] };
  var CH_ROR = { kind: 'line', title: 'Farvesalt gennem rørene (skefulde i timen)', labels: ['Morgen', 'Middag', 'Aften', 'Nat'], max: 10, series: [
    { name: 'Rør 1 → farvekarrene', values: [5, 5, 5, 5], color: '#6fb0e8' },
    { name: 'Rør 2 → åen', values: [0, 1, 1, 9], color: '#8cc43c' },
    { name: 'Rør 3 → lageret', values: [2, 3, 2, 1], color: '#e0a82c' }
  ] };

  // ---------------------------------------------------------------- dialog og handling
  // g er spillets hjælpere: g.say, g.ask, g.task, g.start, g.finish, g.clue, g.skill, g.gold, g.flag ...
  var script = {};

  script.intro = async function (g) {
    await g.say(null, 'Høstmåneden. Bladene er ved at blive gyldne, og røgen fra skorstenene dufter af æbler og brænde.');
    await g.say(null, 'Du er netop ankommet til Runeborg som den nyeste lærling i Eventyrerlauget.');
    await g.say(null, 'Men noget er galt. Vandet i byens brønd er blevet grønt — og rygterne flyver rundt som efterårsblade.');
    g.start('q0', true);
    await q0(g);
  };

  async function q0(g) {
    var cls = g.S.cls;
    if (!g.seen('q0a')) {
      await g.say('brynja', 'Nå, dér er du jo! Velkommen til Eventyrerlauget, {navn}. Jeg er Brynja Jernskæg, laugsmester.');
      await g.say('brynja', ['En kriger, hva\'? Godt. Men her i lauget vinder vi med hovedet, ikke med sværdet.', 'En magiker! Så kan du sikkert lide at læse. Det bliver nyttigt.', 'En spejder. Godt — skarpe øjne er guld værd i dette hverv.', 'En bard! Så kan du stille spørgsmål. Det er det vigtigste af alt.'][cls]);
      await g.say('brynja', 'Før du får din første mission, skal du kende laugets regler. Læs dem godt.');
    }
    if (!await g.task('q0a', { type: 'pick', area: AREA.find, doc: DOC_REGLER, q: 'Hvad skal en lærling gøre, før hun eller han påstår noget? Klik på den regel, der svarer på det.', answer: 2,
      whyLine: { 3: 'Den handler om ikke at give op — ikke om at påstå noget.', 1: 'Den handler om dagbogen. Hvilken regel handler om at påstå noget?' }, explain: 'Regel 3: find beviser først. Den regel får du brug for.' })) return;
    if (!await g.task('q0b', { type: 'choice', area: AREA.find, doc: DOC_REGLER, q: 'Hvornår må man IKKE fodre laugets drage?', opts: [
      { t: 'Efter solnedgang', ok: true },
      { t: 'Før morgenmad', why: 'Det står der ikke noget om. Læs regel 5 igen.' },
      { t: 'Aldrig', why: 'Reglen siger kun noget om et bestemt tidspunkt.' },
      { t: 'Om søndagen', why: 'Står der noget om søndage? Læs regel 5 igen.' }
    ], explain: 'Glød bliver mildest talt vild af sukker om aftenen.' })) return;
    await g.say('brynja', 'Flot. Her er din dagbog. Alt, hvad du finder ud af, skriver du ned i den — tryk <span class="key">B</span> for at åbne den.');
    await g.say('brynja', 'Og nu til sagen: Borgmesteren har hængt et opslag op på tavlen på torvet. Gå ud og læs det — og kom med alt, hvad du finder ud af.');
    g.finish('q0'); g.start('q1');
  }

  var on = {};   // on[mission][person] = handling, mens missionen er i gang

  on.q0 = { brynja: q0 };

  on.q1 = {
    tavle: async function (g) {
      if (!g.seen('q1a')) await g.say(null, 'Tavlen er fuld af opslag. Tre af dem er helt nye.');
      if (!await g.task('q1a', { type: 'pick', area: AREA.find, doc: DOC_A, q: 'Hvornår blev brønden lukket? Klik på sætningen, der fortæller det.', answer: 0,
        whyLine: { 1: 'Den fortæller, hvordan vandet er — ikke hvornår brønden blev lukket.', 2: 'Den handler om de syge.', 3: 'Den handler om, hvor man kan få vand nu.' } })) return;
      if (!await g.task('q1b', { type: 'choice', area: AREA.find, doc: DOC_A, q: 'Hvor mange borgere er blevet syge af vandet?', opts: [
        { t: '7', ok: true }, { t: '5', why: '5 er datoen, hvor brønden blev lukket — ikke antallet af syge.' },
        { t: '2', why: '2 er prisen for en spand vand.' }, { t: '60', why: '60 står ikke på dette opslag. Det er belønningen på et andet.' }
      ], explain: 'Der står mange tal på opslaget. Kunsten er at finde det, der svarer på spørgsmålet.' })) return;
      if (!await g.task('q1c', { type: 'multi', area: AREA.find, doc: [DOC_A, DOC_B, DOC_C], q: 'Hvilke af disse ting står der faktisk på opslagene? Vælg alle, der passer.', opts: [
        { t: 'Brønden er lukket.', ok: true }, { t: 'Vandet lugter af rådne æg.', ok: true }, { t: 'Der er en belønning på 60 guld.', ok: true },
        { t: 'Mis har grønne øjne.', ok: true },
        { t: 'Heksen Hilde har forgiftet brønden.', why: 'Det står ikke på nogen af opslagene. Det er noget, folk siger.' },
        { t: 'Vandsælgeren er borgmesterens bror.', why: 'Det står ingen steder.' }
      ], explain: 'Det er en vigtig evne: at holde det, der faktisk står, adskilt fra det, man har hørt.' })) return;
      g.clue('c_lukket');
      await g.skill('laeselup');
      await g.say(null, 'Du lægger mærke til noget, du ikke så før: små glimt rundt om i byen. Runestykker! Nysgerrighed kan betale sig.');
      await g.say(null, 'Brynja sagde, at man hører alt på kroen. Den Gyldne Drage ligger i den østlige ende af den øvre gade.');
      g.finish('q1'); g.start('q2');
    }
  };

  on.q2 = {
    gorm: async function (g) {
      if (!g.seen('q2a')) {
        await g.say('gorm', 'Velkommen på Den Gyldne Drage! Varm suppe og kolde historier. Brønden, siger du? Alle har en mening om brønden. Lyt selv.');
        await g.say('karl', 'Vandet blev grønt i samme uge, som det nye farveri øst for byen åbnede. Det har jeg selv set.');
        await g.say('agnete', 'Heksen Hilde er ond, det kan enhver se. Hun går med sort hat!');
        await g.say('troels', 'Brønden er 40 alen dyb. Det har min oldefar målt.');
        await g.say('laerke', 'Det er det værste, der nogensinde er sket i Runeborg! Og Baron Grimmark er den flotteste mand i kongeriget.');
        await g.say('gorm', 'Syv personer har fået ondt i maven. Jeg har selv serveret kamillete for dem alle sammen.');
        await g.say('gorm', 'Så. Hvad er sandt, og hvad er bare snak? Det må du selv sortere.');
      }
      if (!await g.task('q2a', { type: 'sort', area: AREA.fakta, q: 'Sortér det, folk sagde på kroen.', help: 'Et fakta-udsagn kan tjekkes: man kan måle, tælle eller se efter. En holdning er en mening — den kan man være enig eller uenig i.',
        cats: ['Fakta — kan tjekkes', 'Holdning — en mening'], items: [
          { t: 'Vandet blev grønt i samme uge, som farveriet åbnede.', c: 0 }, { t: 'Heksen Hilde er ond.', c: 1 },
          { t: 'Syv personer har fået ondt i maven.', c: 0 }, { t: 'Baron Grimmark er den flotteste mand i kongeriget.', c: 1 },
          { t: 'Brønden er 40 alen dyb.', c: 0 }, { t: 'Det er det værste, der nogensinde er sket.', c: 1 }
        ], explain: 'Læg mærke til: et fakta-udsagn er ikke automatisk sandt. Det betyder bare, at man kan undersøge det.' })) return;
      if (!await g.task('q2b', { type: 'choice', area: AREA.fakta, q: 'Borgmesteren siger: «Det er helt sikkert heksens skyld.» Hvad er det?', opts: [
        { t: 'En påstand, som ingen har bevist', ok: true },
        { t: 'Et bevist faktum', why: 'Har nogen vist beviser for det? Ingen har målt eller set noget, der viser, at Hilde har gjort noget.' },
        { t: 'En måling', why: 'En måling er noget, man har talt eller målt. Her har ingen målt noget.' }
      ], explain: 'At sige «helt sikkert» gør ikke noget mere sandt.' })) return;
      if (!await g.task('q2c', { type: 'choice', area: AREA.fakta, q: 'Hvilket udsagn fra kroen er det vigtigste at undersøge nærmere?', opts: [
        { t: 'Vandet blev grønt i samme uge, som farveriet åbnede.', ok: true },
        { t: 'Heksen Hilde er ond.', why: 'Det er en holdning. Den kan man ikke undersøge med beviser.' },
        { t: 'Brønden er 40 alen dyb.', why: 'Det kan godt tjekkes, men dybden fortæller ikke, hvorfor vandet er blevet grønt.' }
      ], explain: 'Det kan tjekkes — og hvis det passer, er det et spor, der peger mod farveriet.' })) return;
      g.clue('c_farveri'); g.clue('c_rygte'); g.clue('c_hat');
      await g.skill('sandhed');
      await g.say('gorm', 'Skarp er du. Vil du vide mere om det farveri, så spørg Ugla på biblioteket. Hun samler på alt, der er skrevet ned.');
      g.finish('q2'); g.start('q3');
    }
  };

  on.q3 = {
    ugla: async function (g) {
      if (!g.seen('q3a')) {
        await g.say('ugla', 'Shh — hvisk venligst. Farveriet, siger du? Jeg har to tekster om det. De siger vidt forskellige ting.');
        await g.say('ugla', 'Den ene er en pjece, baronen har delt ud. Den anden er en afskrift af færgemand Oles logbog. Læs dem begge.');
      }
      if (!await g.task('q3a', { type: 'choice', area: AREA.kilde, doc: [DOC_PJECE, DOC_LOG], q: 'Hvem har skrevet pjecen — og hvorfor er det vigtigt at vide?', opts: [
        { t: 'Baronen, som ejer farveriet. Han tjener penge på, at folk synes, farveriet er ufarligt.', ok: true },
        { t: 'En forsker, som ikke har noget med farveriet at gøre.', why: 'Se, hvem der har skrevet under nederst.' },
        { t: 'Borgmesteren, som skal passe på byen.', why: 'Se, hvem der har skrevet under nederst.' }
      ], explain: 'Når den, der skriver, selv har noget at vinde, skal man være ekstra forsigtig.' })) return;
      if (!await g.task('q3b', { type: 'multi', area: AREA.kilde, doc: [DOC_PJECE, DOC_LOG], q: 'Hvad gør Oles logbog mere troværdig end pjecen? Vælg alle, der passer.', opts: [
        { t: 'Ole skriver præcist, hvilken dag han så hvad.', ok: true }, { t: 'Ole skriver om det, han selv har set.', ok: true },
        { t: 'Ole tjener ikke penge på farveriet.', ok: true },
        { t: 'Oles logbog er længst.', why: 'Længde gør ikke en tekst mere sand.' },
        { t: 'Ole skriver med pæn håndskrift.', why: 'Pæn skrift siger intet om, om indholdet er rigtigt.' }
      ] })) return;
      if (!await g.task('q3c', { type: 'pick', area: AREA.kilde, doc: [DOC_PJECE, DOC_LOG], docIndex: 1, q: 'Klik på linjen i logbogen, hvor Ole første gang ser grønt vand.', answer: 3,
        whyLine: { 4: 'Den handler også om grønt vand — men er det første gang? Kig på dagene.', 1: 'Den dag startede farveriet. Var vandet grønt allerede dér?' } })) return;
      if (!await g.task('q3d', { type: 'choice', area: AREA.kilde, q: 'Kilderne siger modsatte ting. Hvad er det klogeste at gøre nu?', opts: [
        { t: 'Undersøge vandet selv, så vi får vores egne beviser.', ok: true },
        { t: 'Tro på baronen — han er rig og vigtig.', why: 'At være rig eller vigtig gør ikke det, man siger, mere sandt.' },
        { t: 'Tro på Ole, fordi han virker sød.', why: 'Ole virker troværdig, men «sød» er ikke et bevis. Kan vi finde ud af det helt sikkert?' },
        { t: 'Stemme om det på kroen.', why: 'Man kan ikke stemme om, hvad der er sandt. Det må man undersøge.' }
      ] })) return;
      g.clue('c_ole'); g.clue('c_pjece');
      await g.skill('kilde');
      await g.say('ugla', 'Kloge ord. Zara, alkymisten, har alt det udstyr, I skal bruge. Hendes værksted er det med det grønne tag i den nedre gade.');
      g.finish('q3'); g.start('q4');
    }
  };

  on.q4 = {
    zara: async function (g) {
      if (!g.seen('q4a')) {
        await g.say('zara', 'Pas på kedlen, den bider. Nå — I vil undersøge, om farvesalt gør vand grønt? Fremragende. Så laver vi et rigtigt forsøg.');
        await g.say('zara', 'Men et forsøg er kun noget værd, hvis det er fair. Først: hvad er det egentlig, vi vil teste?');
      }
      if (!await g.task('q4a', { type: 'choice', area: AREA.forsog, q: 'Hvad er vores hypotese — det, vi tror, og som vi vil teste?', opts: [
        { t: 'Farvesaltet fra farveriet gør vandet grønt.', ok: true },
        { t: 'Vandet i brønden er grønt.', why: 'Det ved vi allerede — det er noget, vi har set (en observation). En hypotese er en forklaring, vi kan teste.' },
        { t: 'Hilde har forhekset brønden.', why: 'Det kan vi ikke teste med glas og vand — og ingen beviser peger på det.' },
        { t: 'Farver er smukke.', why: 'Det er en holdning, ikke noget, man kan teste.' }
      ] })) return;
      if (!await g.task('q4b', { type: 'multi', area: AREA.forsog, doc: DOC_GLAS, keepOrder: true, q: 'Vælg de to glas, der giver en fair test af, om farvesalt gør vandet grønt.', help: 'En test er fair, når kun én ting er forskellig mellem glassene.',
        opts: [{ t: 'Glas A' }, { t: 'Glas B' }, { t: 'Glas C' }, { t: 'Glas D' }],
        check: function (sel) {
          sel.sort(); var k = sel.join();
          if (sel.length !== 2) return { ok: false, msg: 'Vælg præcis to glas.' };
          if (k === '0,1') return { ok: true };
          if (k === '0,3') return { ok: false, msg: 'A og D har begge farvesalt — forskellen er kun temperaturen. Så tester vi varme, ikke farvesalt.' };
          if (sel.indexOf(2) >= 0) return { ok: false, msg: 'Glas C har brøndvand og er varmet op. Bliver det grønt, ved vi ikke, om det var vandet, varmen eller farvesaltet.' };
          return { ok: false, msg: 'B og D er forskellige på to måder: farvesalt OG temperatur. Så ved vi ikke, hvad der gjorde forskellen.' };
        }, explain: 'A og B er ens på alt — undtagen farvesaltet. Så ved vi, at en forskel skyldes farvesaltet.' })) return;
      if (!await g.task('q4c', { type: 'multi', area: AREA.forsog, q: 'Hvad skal være ens i de to glas, for at testen er fair? Vælg alle, der passer.', opts: [
        { t: 'Mængden af vand', ok: true }, { t: 'Slags vand', ok: true }, { t: 'Temperaturen', ok: true }, { t: 'Hvor længe glassene står', ok: true },
        { t: 'Mængden af farvesalt', why: 'Det er netop den ting, vi ændrer med vilje — det er dén, vi tester.' }
      ] })) return;
      if (!await g.task('q4d', { type: 'order', area: AREA.forsog, q: 'Sæt trinene i forsøget i den rigtige rækkefølge.', items: [
        'Hæld lige meget klart vand i to ens glas.',
        'Kom en skefuld farvesalt i det ene glas — ikke i det andet.',
        'Lad begge glas stå lige længe ved samme temperatur.',
        'Sammenlign farven, og skriv resultatet ned.'
      ] })) return;
      await g.say('zara', 'Så venter vi … og … se! Glas A er blevet grønt. Glas B er stadig klart. Farvesalt KAN altså gøre vand grønt.');
      await g.say('zara', 'Men er det farvesalt, der er i åen? Det ved vi først, når vi har målt derude. Her — tag mit måleglas.');
      g.flag('maaleglas');
      await g.skill('forsker');
      await g.say('zara', 'Tag tre vandprøver: én fra Nordbækken, FØR vandet når farveriet. Én ved farveriets rør. Og én fra Månebrønden. Så kan vi sammenligne.');
      g.finish('q4'); g.start('q5');
    }
  };

  async function takeSample(g, key, name, look) {
    g.flag(key); RB.audio.sfx('pick');
    var n = (g.S.flags.sA ? 1 : 0) + (g.S.flags.sB ? 1 : 0) + (g.S.flags.sC ? 1 : 0);
    await g.say(null, 'Du fylder måleglasset. ' + look);
    g.toast('<b>Vandprøve ' + n + ' af 3</b> — ' + name);
    if (n === 3) await g.say(null, 'Du har alle tre prøver. Tilbage til Zara!');
  }
  on.q5 = {
    sampleA: function (g) { return takeSample(g, 'sA', 'Nordbækken', 'Vandet her er klart og koldt. En lille ørred smutter forbi.'); },
    sampleB: function (g) { return takeSample(g, 'sB', 'ved farveriets rør', 'Vandet er grønt og lugter skarpt. Det drypper ud af røret.'); },
    ror: function (g) { if (!g.S.flags.sB) return takeSample(g, 'sB', 'ved farveriets rør', 'Vandet er grønt og lugter skarpt. Det drypper ud af røret.'); return g.say(null, 'Et tykt rør stikker ud fra muren. Grønt vand drypper ned i åen.'); },
    brond: function (g) { if (!g.S.flags.sC) return takeSample(g, 'sC', 'Månebrønden', 'Vandet er grønligt og lugter af rådne æg.'); return g.say(null, 'Du har allerede en prøve herfra.'); },
    zara: async function (g) {
      var S = g.S;
      if (!(S.flags.sA && S.flags.sB && S.flags.sC)) { await g.say('zara', 'Vi mangler stadig prøver. Nordbækken, farveriets rør og Månebrønden — tjek din dagbog.'); return; }
      if (!g.seen('q5a')) {
        await g.say('zara', 'Lad os se … Farvemåleren giver et tal fra 0 til 10. Og jeg har målt brønden hver dag i en uge. Her er det hele.');
      }
      if (!await g.task('q5a', { type: 'choice', area: AREA.data, chart: CH_BAR, q: 'Hvor var vandet mest grønt?', opts: [
        { t: 'Ved farveriets rør', ok: true }, { t: 'I Nordbækken', why: 'Nordbækken har den laveste søjle: 1.' }, { t: 'I Månebrønden', why: 'Månebrønden er grøn — men hvilken søjle er højest?' }
      ] })) return;
      if (!await g.task('q5b', { type: 'number', area: AREA.data, chart: CH_BAR, q: 'Hvor mange gange grønnere er vandet ved røret end i Nordbækken?', unit: 'gange', answer: 9,
        near: [{ v: 8, why: '8 er forskellen (9 − 1). Men spørgsmålet er, hvor mange GANGE — altså 9 divideret med 1.' }], hint: 'Aflæs de to søjler, og del det største tal med det mindste.' })) return;
      if (!await g.task('q5c', { type: 'choice', area: AREA.data, chart: CH_LINE, q: 'Farveriet tændte sine kedler på dag 3. Hvad viser grafen?', opts: [
        { t: 'Grønheden steg kraftigt et par dage efter.', ok: true },
        { t: 'Vandet var grønt, før farveriet startede.', why: 'Se på dag 1-3: grønheden er 1 — næsten klart.' },
        { t: 'Der skete ingenting.', why: 'Se på dag 4 og 5: fra 2 til 6.' }
      ] })) return;
      if (!await g.task('q5d', { type: 'multi', area: AREA.data, chart: [CH_BAR, CH_LINE], q: 'Hvilke konklusioner kan vi trække ud fra vores data? Vælg alle, der passer.', opts: [
        { t: 'Vandet er mest grønt tæt på farveriets rør.', ok: true }, { t: 'Vandet ovenfor farveriet er næsten klart.', ok: true },
        { t: 'Grønheden steg, efter farveriet startede.', ok: true },
        { t: 'Farveriet vil forgifte hele kongeriget.', why: 'Det er en alt for stor påstand. Vi har kun målt tre steder i Runeborg.' },
        { t: 'Baron Grimmark er et dårligt menneske.', why: 'Det er en holdning. Data siger noget om vandet — ikke om, hvad baronen er for et menneske.' }
      ], explain: 'Godt skelnet: data kan bære nogle konklusioner — men ikke alle dem, folk gerne vil drage.' })) return;
      if (!await g.task('q5e', { type: 'choice', area: AREA.data, q: 'Hvad ville gøre vores beviser endnu stærkere?', opts: [
        { t: 'Måle flere steder og flere dage.', ok: true },
        { t: 'Kun måle ét sted.', why: 'Færre målinger giver svagere beviser.' },
        { t: 'Spørge baronen, om han er enig.', why: 'Hans mening ændrer ikke på målingerne.' },
        { t: 'Holde op med at måle nu.', why: 'Vi har gode beviser — men flere målinger gør dem stærkere.' }
      ], explain: 'Jo flere målinger, desto mindre er risikoen for, at det bare var et tilfælde.' })) return;
      g.clue('c_data');
      await g.skill('data');
      await g.say('zara', 'Det her er beviser, {navn}. Rigtige beviser. Men —' );
      await g.say(null, 'Udefra lyder en klokke. Nogen råber: «Retssag på torvet! Heksen skal forvises!»');
      await g.say('zara', 'Borgmesteren! Han vil forvise Hilde nu. Løb — og tag dine spor med!');
      g.finish('q5'); g.start('q6');
    }
  };

  on.q6 = {
    aldrik: async function (g) {
      var S = g.S;
      if (!g.seen('q6a')) {
        await g.say('aldrik', 'Borgere af Runeborg! Heksen Hilde har forgiftet vores brønd. I dag skal hun forvises fra byen!');
        await g.say('hilde', 'Jeg har ikke rørt den brønd! Jeg dyrker urter og strikker sokker til byens katte!');
        await g.say('aldrik', 'Hvad? En lærling? Du siger, du har beviser? Så lad os høre dem. Men kun de bedste — jeg har ikke hele dagen.');
      }
      var ids = S.clues.filter(function (c) { return c !== 'c_opskrift'; });
      if (!await g.task('q6a', { type: 'multi', area: AREA.argument, q: 'Vælg de tre stærkeste spor fra din dagbog, som du vil vise borgmesteren.', help: 'Et godt bevis er noget, der er set, talt eller målt — ikke noget, nogen mener.',
        opts: ids.map(function (id) { return { t: clues[id].t, id: id }; }),
        check: function (sel) {
          if (sel.length !== 3) return { ok: false, msg: 'Vælg præcis tre spor.' };
          var bad = sel.map(function (i) { return ids[i]; }).filter(function (id) { return !clues[id].evidence; });
          if (!bad.length) return { ok: true };
          return { ok: false, msg: '«' + RB.esc(clues[bad[0]].t) + '» — ' + (clues[bad[0]].why || 'Det er ikke et stærkt bevis.') };
        }, explain: 'Et øjenvidne med datoer, en optælling eller vores egne målinger — det er noget, man kan stå inde for.' })) return;
      if (!await g.task('q6b', { type: 'choice', area: AREA.argument, q: 'Borgmesteren: «Men farveriet giver byen arbejde og penge! Så kan det da ikke være farligt!» Hvad svarer du?', opts: [
        { t: 'At farveriet giver penge, siger ikke noget om, om det er farligt. Målingerne viser, hvor det grønne kommer fra.', ok: true },
        { t: 'Du har ret. Så må det være heksen alligevel.', why: 'Ændrer penge noget ved målingerne?' },
        { t: 'Penge er dumme.', why: 'Det er en holdning — og den svarer ikke på borgmesterens argument.' }
      ] })) return;
      if (!await g.task('q6c', { type: 'choice', area: AREA.argument, q: 'Borgmesteren: «Men kan du bevise, at det IKKE var Hilde?» Hvad svarer du?', opts: [
        { t: 'Det er den, der påstår noget, der skal bevise det. Der er ingen beviser mod Hilde — og flere, der peger på farveriet.', ok: true },
        { t: 'Nej. Så må vi hellere forvise hende for en sikkerheds skyld.', why: 'Er det retfærdigt at straffe nogen uden beviser?' },
        { t: 'Hun går med sort hat, så det er nok hende.', why: 'En hat er ikke et bevis — det er en fordom.' }
      ] })) return;
      await g.say('aldrik', '… Hm. Hmm! Det er … et overbevisende argument. Vagter! Slip Hilde fri.');
      await g.say('aldrik', 'Jeg skylder dig og lauget en undskyldning, Hilde. Og dig, lærling, skylder byen belønningen. 60 guld — værsgo.');
      g.gold(60);
      g.flag('hildeFree');
      await g.say('hilde', 'Tak, {navn}. Du kunne have troet på rygterne som alle de andre. Kom op til min hytte på engen nord for åen — jeg kender en eliksir, der kan rense brønden.');
      g.finish('q6'); g.start('q7');
    }
  };

  on.q7 = {
    hilde: async function (g) {
      if (!g.seen('q7a')) {
        await g.say('hilde', 'Velkommen til min lille hytte. Sæt dig, teen er lige kogt. Se her — opskriften på Klarvandseliksir fra min bedstemors bog.');
        await g.say('hilde', 'Problemet er bare, at opskriften kun er til 4 spande. Brønden er noget større.');
      }
      if (!await g.task('q7a', { type: 'number', area: AREA.forhold, doc: DOC_OPSKRIFT, q: 'Hvor mange skefulde månesalt skal der bruges til 8 spande vand?', unit: 'skefulde', answer: 6,
        near: [{ v: 7, why: 'Du har lagt 4 til. Men 8 spande er DOBBELT så meget som 4 — så alt skal ganges med 2.' }], hint: '8 spande er dobbelt så meget som 4 spande.' })) return;
      if (!await g.task('q7b', { type: 'number', area: AREA.forhold, doc: DOC_OPSKRIFT, q: 'Hvor mange kviste sølvmynte skal der bruges til 12 spande?', unit: 'kviste', answer: 6,
        near: [{ v: 10, why: 'Du har lagt 8 til. Hvor mange gange går 4 op i 12?' }], hint: '12 spande er 3 gange så meget som 4 spande.' })) return;
      if (!await g.task('q7c', { type: 'choice', area: AREA.forhold, doc: DOC_OPSKRIFT, q: 'Gamle Troels siger: «Til 6 spande skal der bruges 5 skefulde månesalt. For 4 + 2 = 6, så må det være 3 + 2 = 5.» Har han ret?', opts: [
        { t: 'Nej. 6 spande er 1,5 gange så meget som 4 — så man skal gange: 3 · 1,5 = 4,5 skefulde.', ok: true },
        { t: 'Ja, man lægger bare det samme til begge dele.', why: 'Prøv hans metode med 8 spande: 3 + 4 = 7. Men vi regnede lige 6 ud. Opskrifter skal ganges, ikke lægges til.' },
        { t: 'Nej, der skal bruges 6 skefulde.', why: '6 skefulde passer til 8 spande. Hvor mange gange 4 er 6?' }
      ], explain: 'Det her er en fælde, mange falder i — også voksne. Når noget skal gøres større, skal det ganges.' })) return;
      if (!await g.task('q7d', { type: 'number', area: AREA.forhold, doc: DOC_OPSKRIFT, q: 'Månebrønden rummer 200 spande vand. Hvor mange skefulde månesalt skal der bruges?', unit: 'skefulde', answer: 150,
        hint: 'Hvor mange gange går 4 op i 200? Gang så det tal med 3.', near: [{ v: 50, why: '50 er, hvor mange gange opskriften skal laves. Hver gang kræver 3 skefulde.' }, { v: 199, why: 'Du har lagt til i stedet for at gange.' }] })) return;
      g.clue('c_opskrift');
      await g.skill('skalering');
      await g.say('hilde', '150 skefulde. Så meget har jeg slet ikke. Du må købe det på markedet på torvet — men se dig godt for, købmændene tager meget forskellige priser.');
      await g.say('hilde', 'Og dragetåren … den har Glød i lauget. Han græder, når han griner. Fortæl ham en god vittighed.');
      g.finish('q7'); g.start('q8');
    }
  };

  on.q8 = {};
  ['durin', 'liv', 'knud'].forEach(function (id) {
    on.q8[id] = async function (g) {
      if (!g.seen('q8a')) {
        await g.say('durin', 'Månesalt! Bedste kvalitet fra bjergene. 50 skefulde for 20 guld.');
        await g.say('liv', 'Mit er høstet i måneskin. 30 skefulde for 15 guld.');
        await g.say('knud', 'Kom og køb! 75 skefulde for 36 guld — og i dag giver jeg 25 % rabat!');
        await g.say(null, 'Tre priser, tre poser. Hvem er billigst? Det er ikke til at se med det samme.');
      }
      if (!await g.task('q8a', { type: 'number', area: AREA.procent, doc: DOC_PRISER, q: 'Hvad koster én skefuld hos Durin?', unit: 'guld', answer: 0.4, tol: 0.001,
        hint: 'Del prisen med antallet af skefulde: 20 : 50.', near: [{ v: 2.5, why: 'Du har delt 50 med 20. Det er skefulde pr. guld — spørgsmålet er guld pr. skefuld.' }] })) return;
      if (!await g.task('q8b', { type: 'number', area: AREA.procent, doc: DOC_PRISER, q: 'Knud giver 25 % rabat på 36 guld. Hvad koster hans pose så?', unit: 'guld', answer: 27,
        hint: '25 % er det samme som en fjerdedel.', near: [{ v: 9, why: '9 guld er selve rabatten (25 % af 36). Hvad koster posen, når rabatten er trukket fra?' }, { v: 11, why: '25 % er ikke det samme som 25 guld. 25 % er en fjerdedel.' }] })) return;
      if (!await g.task('q8c', { type: 'choice', area: AREA.procent, doc: DOC_PRISER, q: 'Hvem sælger billigst pr. skefuld, når Knuds rabat er regnet med?', opts: [
        { t: 'Knud', ok: true }, { t: 'Durin', why: 'Durin tager 0,40 guld pr. skefuld. Regn Knuds pris ud efter rabatten: 27 : 75.' },
        { t: 'Liv', why: 'Liv tager 15 : 30 = 0,50 guld pr. skefuld — den dyreste.' }
      ], explain: 'Knud: 27 : 75 = 0,36 guld. Durin: 0,40. Liv: 0,50. Den største pose var ikke den dyreste!' })) return;
      if (!await g.task('q8d', { type: 'number', area: AREA.procent, doc: DOC_PRISER, q: 'Du skal bruge 150 skefulde (to af Knuds poser). Hvad koster det i alt, med rabat?', unit: 'guld', answer: 54,
        hint: 'En pose koster 27 guld efter rabat.', near: [{ v: 72, why: '72 er prisen uden rabat. Husk de 25 %.' }] })) return;
      g.gold(-54);
      await g.say('knud', 'En fornøjelse at handle med en, der kan regne! To poser månesalt — værsgo.');
      g.flag('salt');
      await g.skill('kobmand');
      await g.say(null, 'Nu mangler I bare at stoppe farveriet. Brynja vil sikkert vide, hvordan man kommer derud.');
      g.finish('q8'); g.start('q9');
    };
  });

  on.q9 = {
    brynja: async function (g) {
      if (!g.seen('q9a')) {
        await g.say('brynja', 'Du har gjort det godt, {navn}. Men eliksiren er kun halvdelen. Så længe farveriet leder farvesalt ud, bliver brønden grøn igen.');
        await g.say('brynja', 'Her er mit gamle kort over egnen. Før jeg lukker nogen ud ad Østporten, vil jeg se, at du kan bruge det.');
      }
      if (!await g.task('q9a', { type: 'number', area: AREA.maalestok, doc: DOC_KORT, q: 'Hvor langt er der i virkeligheden fra Runeborg til broen?', unit: 'meter', answer: 600,
        hint: 'På kortet er der 3 cm. Hver centimeter er 200 meter i virkeligheden.', near: [{ v: 3, why: '3 cm er afstanden på kortet. Hvor mange meter svarer det til?' }, { v: 203, why: 'Du har lagt til. Hver centimeter er 200 m — så 3 cm er 3 · 200.' }] })) return;
      if (!await g.task('q9b', { type: 'number', area: AREA.maalestok, doc: DOC_KORT, q: 'Hvor lang er hele turen til farveriet, i meter?', unit: 'meter', answer: 1500,
        hint: 'Læg de to stykker sammen på kortet først: 3 cm + 4,5 cm.', near: [{ v: 900, why: '900 m er kun det sidste stykke. Husk turen til broen.' }, { v: 7.5, why: '7,5 cm er længden på kortet. Gang med 200.' }] })) return;
      if (!await g.task('q9c', { type: 'number', area: AREA.maalestok, doc: DOC_KORT, q: 'Du går 3 km i timen — altså 3000 meter på 60 minutter. Hvor mange minutter tager turen?', unit: 'minutter', answer: 30,
        hint: '1500 m er halvdelen af 3000 m.' })) return;
      if (!await g.task('q9d', { type: 'choice', area: AREA.maalestok, q: 'På et andet kort er målestokken 1 cm = 400 m. Hvor lang er den samme tur (1500 m) på det kort?', opts: [
        { t: '3,75 cm — halvt så lang', ok: true },
        { t: '15 cm — dobbelt så lang', why: 'Når hver centimeter betyder mere virkelighed, bliver tegningen mindre, ikke større.' },
        { t: '7,5 cm — lige så lang', why: 'Målestokken er ændret, så tegningen må også ændre sig.' }
      ] })) return;
      await g.skill('maalestok');
      await g.say('brynja', 'Så er du klar. Jeg sender bud til portvagten. Østporten er åben for dig.');
      await g.say('brynja', 'Og — Glød har grinet så meget af mine vittigheder, at jeg har fyldt et lille glas med dragetårer. Tag det med.');
      g.flag('gateOpen'); g.world.by.flags.gateOpen = true; g.refresh();
      g.finish('q9'); g.start('q10');
    }
  };

  on.q10 = {
    ulf: async function (g) {
      if (!g.seen('q10a')) {
        await g.say('ulf', 'Stop! Ingen snushaner i farveriet. Og se her — vi har et certifikat. Farveriet er helt rent!');
      }
      if (!await g.task('q10a', { type: 'choice', area: AREA.kilde, doc: DOC_CERT, q: 'Hvorfor er certifikatet ikke et godt bevis?', opts: [
        { t: 'Baronen har selv undersøgt og godkendt sit eget farveri.', ok: true },
        { t: 'Det er skrevet på for tyndt papir.', why: 'Papiret er ligegyldigt. Se på, hvem der har undersøgt og underskrevet.' },
        { t: 'Det har ingen farver.', why: 'Farver gør ikke et dokument mere eller mindre sandt.' }
      ], explain: 'Man kan ikke være dommer i sin egen sag.' })) return;
      if (!await g.task('q10b', { type: 'sort', area: AREA.fakta, q: 'Ulf siger fire ting. Hvilke kan tjekkes?', cats: ['Kan tjekkes', 'Holdning'], items: [
        { t: 'Farveriet har tre rør.', c: 0 }, { t: 'Baronen er den klogeste i landet.', c: 1 },
        { t: 'Røret til åen blev åbnet i nat.', c: 0 }, { t: 'Snushaner er irriterende.', c: 1 }
      ] })) return;
      await g.say('ulf', 'Hmpf. Røret til åen blev åbnet i nat … det skulle jeg ikke have sagt. Du er skarpere, end du ser ud. Gå bare ind.');
      g.flag('f_guard'); g.refresh();
    },
    ventil: async function (g) {
      if (!g.S.flags.f_guard) return g.say(null, 'Et stort ventilhjul. Men du skal forbi vagten først.');
      if (!g.seen('q10c')) await g.say(null, 'Tre rør med tre ventiler. På væggen hænger en tavle, hvor nogen har skrevet, hvor meget der løber gennem rørene.');
      if (!await g.task('q10c', { type: 'choice', area: AREA.data, chart: CH_ROR, q: 'Hvornår løber der mest farvesalt ud i åen?', opts: [
        { t: 'Om natten', ok: true }, { t: 'Om morgenen', why: 'Se på den grønne linje (rør 2) om morgenen: 0.' },
        { t: 'Hele tiden lige meget', why: 'Det er rør 1, der er lige højt hele tiden. Rør 2 er den grønne linje.' }
      ], explain: 'Rør 2 hopper op til 9 om natten — når ingen kigger.' })) return;
      if (!await g.task('q10d', { type: 'choice', area: AREA.data, chart: CH_ROR, q: 'Hvilket rør skal lukkes for at stoppe udslippet til åen?', opts: [
        { t: 'Rør 2 — det, der går til åen', ok: true }, { t: 'Rør 1', why: 'Rør 1 går til farvekarrene. Det er dér, farveriet bruger farven.' },
        { t: 'Rør 3', why: 'Rør 3 går til lageret — ikke til åen.' }
      ] })) return;
      RB.audio.sfx('door');
      await g.say(null, 'Du drejer ventilen på rør 2. Det knirker, det hvæser … og så bliver der stille. Ingen farve løber længere ud i åen.');
      g.flag('f_valve'); g.world.farveri.flags.valveClosed = true; g.refresh();
    },
    baron: async function (g) {
      if (!g.seen('q10e')) {
        await g.say('baron', 'Så-å. Lærlingen, der har rodet rundt i mine rør. Fint, I har lukket røret. Men min tank er stadig fuld af farvevand, og brønden er stadig grøn. Ha!');
        await g.say(null, 'Du har månesalt, sølvmynte fra Hilde og Gløds dragetårer. Opskriften kan også rense tanken — hvis du regner rigtigt.');
      }
      if (!await g.task('q10e', { type: 'number', area: AREA.forhold, doc: DOC_OPSKRIFT, q: 'Der er 40 spande farvevand i tanken. Opskriften bruger 3 skefulde månesalt til 4 spande. Hvor mange skefulde skal der bruges?', unit: 'skefulde', answer: 30,
        hint: '40 spande er 10 gange så meget som 4.', near: [{ v: 39, why: 'Du har lagt til. 40 er 10 gange 4 — så månesaltet skal også ganges med 10.' }] })) return;
      var c = await g.ask('baron', 'Hør her, lærling … Jeg giver dig 500 guld, hvis du glemmer det hele og går hjem.', ['Nej tak. Beviserne skal frem, så byen kan få rent vand.', 'Hmm … 500 guld er mange penge.']);
      if (c === 1) {
        await g.say(null, 'Du tænker på alle de syge i byen. Og på Hilde, der næsten blev forvist. Og på lærlingenes regler.');
        await g.say(null, 'Nej. Det kan du ikke. Du ryster på hovedet.');
      }
      await g.say('baron', 'Du … afviser 500 guld? Så er du enten meget dum eller meget klog. Og jeg er bange for, at du er det sidste.');
      await g.say('baron', 'Godt. Røret forbliver lukket. Jeg bygger et sivefilter, så farvevandet bliver renset, før det når åen. Og jeg betaler for at rense brønden. Er du så tilfreds?');
      await g.say(null, 'Du nikker. Sammen hælder I eliksiren i tanken, og farvevandet bliver klart som glas.');
      g.flag('clean');
      g.finish('q10');
      await g.epilogue();
    }
  };

  // ---------------------------------------------------------------- ekstramissioner
  var offer = {
    s1: async function (g) {
      await g.say('sigrid', 'Har du set Mis? Min kat? Hun har været væk i tre dage. Jeg har hængt et opslag op på tavlen …');
      await g.say('sigrid', 'Hvis du læser det rigtigt, kan du måske finde hende. Hun gemmer sig altid så godt.');
      g.start('s1');
    },
    s2: async function (g) {
      await g.say('laerke', 'Du! Du kan jo skelne sandt fra snak. Jeg vil skrive en vise om brønden — men KUN med ting, der er sande.');
      await g.say('laerke', 'Gå ud og hør, hvad folk siger: Bodil på torvet, Aksel og færgemand Ole nede ved åen. Kom så tilbage.');
      g.start('s2');
    },
    s3: async function (g) {
      await g.say('bjorn', 'Du er lærlingen med regnestokken, ikke? Jeg skal lave klingestål, men min lærling har blandet det forkert igen.');
      await g.say('bjorn', 'Opskriften er 2 dele jern til 3 dele kul. Hjælp mig lige med tallene.');
      g.start('s3');
    }
  };
  on.s1 = {
    mis: async function (g) {
      RB.audio.sfx('pick');
      await g.say(null, 'Mellem to tønder, øst for kroen, lige hvor ingen kan se hende … sidder en rødlig kat med grønne øjne og spiser en fiskehale.');
      await g.say(null, '«Mjav.» Det er Mis! Hun følger efter dig.');
      g.flag('misFound'); g.flag('catFollow');
    },
    sigrid: async function (g) {
      if (!g.S.flags.misFound) { await g.say('sigrid', 'Har du fundet hende? Læs opslaget igen: rødlig, grønne øjne, gemmer sig mellem to ting, sidst set øst for kroen.'); return; }
      await g.say('sigrid', 'MIS! Du fandt hende! Hvor var hun? … Mellem tønderne? Selvfølgelig. Tusind tak!');
      await g.say('sigrid', 'Hun kan godt lide dig, kan jeg se. Hun må gerne gå med dig på eventyr — hun kommer altid hjem til aftensmad.');
      g.gold(10); g.finish('s1');
    }
  };
  function rumor(key, id, text) {
    return async function (g) {
      if (!g.S.flags[key]) { g.flag(key); g.toast('<b>Rygte noteret</b> — ' + npcs[id].name); }
      await g.say(id, text);
    };
  }
  on.s2 = {
    bodil: rumor('rBodil', 'bodil', 'Folk siger, det er fordi Hilde danser om natten. Det er sikkert rigtigt — hun ser da uhyggelig ud.'),
    aksel: rumor('rAksel', 'aksel', 'Jeg har talt fiskene! I sidste uge talte jeg tolv. I dag har jeg ikke set en eneste.'),
    ole: rumor('rOle', 'ole', 'Nedenfor farveriets rør er vandet grønt. Ovenfor er det klart. Det står i min logbog, sort på hvidt.'),
    laerke: async function (g) {
      var S = g.S;
      if (!(S.flags.rBodil && S.flags.rAksel && S.flags.rOle)) { await g.say('laerke', 'Har du hørt Bodil, Aksel og Ole? Jeg vil have alle tre rygter, før jeg skriver en eneste linje.'); return; }
      if (!await g.task('s2a', { type: 'sort', area: AREA.fakta, q: 'Hvilke rygter kan komme med i Lærkes vise om sandheden?', cats: ['Kan tjekkes — med i visen', 'Mening eller fordom — ikke med'], items: [
        { t: 'Aksel: I sidste uge talte jeg tolv fisk. I dag så jeg ingen.', c: 0 },
        { t: 'Bodil: Hilde ser uhyggelig ud, så det er nok hende.', c: 1 },
        { t: 'Ole: Nedenfor røret er vandet grønt, ovenfor er det klart.', c: 0 },
        { t: 'Lærke: En vise om farveriet bliver den bedste vise i verden.', c: 1 }
      ], explain: 'Og Lærkes egen påstand? Den er ren holdning — men hun tager det pænt.' })) return;
      g.clue('c_fisk');
      await g.say('laerke', 'Perfekt! «Tolv små fisk i åen stod, nu er der ingen, hvor de før gik god …» Nå, jeg arbejder på rimene. Tak, {navn}!');
      g.gold(10); g.finish('s2');
    }
  };
  on.s3 = {
    bjorn: async function (g) {
      if (!await g.task('s3a', { type: 'number', area: AREA.forhold, q: 'Klingestål: 2 dele jern til 3 dele kul. Hvor mange dele kul skal der til 10 dele jern?', unit: 'dele kul', answer: 15,
        hint: '10 dele jern er 5 gange så meget som 2.', near: [{ v: 11, why: 'Du har lagt til. 10 er 5 gange 2 — så kullet skal også ganges med 5.' }] })) return;
      if (!await g.task('s3b', { type: 'number', area: AREA.forhold, q: 'Der er plads til 20 spande i ovnen i alt. Hvor mange spande af dem skal være jern?', unit: 'spande jern', answer: 8,
        hint: '2 + 3 = 5 dele i alt. Hvis 5 dele er 20 spande, hvor meget er én del så?', near: [{ v: 10, why: 'Halvdelen ville være jern og kul lige meget. Men der skal være mere kul end jern.' }] })) return;
      await g.say('bjorn', '8 spande jern og 12 spande kul. Præcis! Her — et lille smedemærke til din kappe. Og lidt guld for ulejligheden.');
      g.gold(15); g.finish('s3');
    }
  };

  // ---------------------------------------------------------------- når der ikke er noget særligt
  function pick(arr, S) { return arr[(S.talks = (S.talks || 0) + 1) % arr.length]; }
  var idle = {
    brynja: function (g) { return g.say('brynja', g.S.flags.clean ? 'Runeborg har aldrig haft en bedre lærling. Glød er enig — ikke, Glød?' : 'Tjek din dagbog, hvis du er i tvivl om, hvad du skal nu. Og husk regel 4.'); },
    mira: function (g) { return g.say('mira', pick(['Tip fra en gammel lærling: Tryk <span class="key">B</span>, og læs dine spor. Dagbogen husker det, du glemmer.', 'Kig efter små gnister rundt om i byen. Det kan være runestykker!', 'Det gule udråbstegn over folk betyder, at de har brug for hjælp. Det blå spørgsmålstegn viser, hvor din mission fortsætter.', 'Jeg dumpede min første opgave tre gange. Nu er jeg den bedste i lauget til kildekritik. Bare sådan at du ved det.'], g.S)); },
    glod: function (g) { return g.say(null, pick(['Glød snorker. En lille røgring stiger op — den er formet som et hjerte.', 'Glød åbner ét øje, kigger på dig og lukker det igen. Det må være en godkendelse.', 'Glød klukker i søvne. En enkelt varm tåre triller ned ad snuden.'], g.S)); },
    gorm: function (g) { return g.say('gorm', pick(['Suppe? Det er græskarsuppe i dag. Med vand fra Nordbækken, bare rolig.', 'Den Gyldne Drage har stået her i to hundrede år. Tagbjælkerne har hørt flere historier end nogen bog.'], g.S)); },
    karl: function (g) { return g.say('karl', 'Mine køer vil ikke drikke af åen længere. Kloge dyr, køer.'); },
    agnete: function (g) { return g.say('agnete', g.S.flags.hildeFree ? 'Nå, det var altså ikke Hilde … Så må jeg vel hellere give hende en undskyldning. Og en kage.' : 'Hilde har en kat, der er helt sort. Det siger vel alt.'); },
    troels: function (g) { return g.say('troels', 'Da jeg var ung, kunne man se bunden af Månebrønden. Man kunne ønske sig noget, når man kastede en mønt.'); },
    laerke: function (g) { return g.say('laerke', pick(['♪ Høstmånens blade falder blødt, i Runeborg er alting sødt … ♪ Nej, det er for sukkersødt.', 'En god vise er som en god kilde: den skal kunne tåle, at man spørger.'], g.S)); },
    ugla: function (g) { return g.say('ugla', pick(['Alle bøger her kan lånes. Undtagen den om drager — den har Glød tygget i.', 'Et godt spørgsmål til enhver tekst: Hvem har skrevet den, og hvordan ved de det?'], g.S)); },
    zara: function (g) { return g.say('zara', pick(['Rør ikke ved den lilla flaske. Heller ikke den grønne. Faktisk — rør ikke ved noget.', 'Et forsøg, der går galt, er ikke spildt. Så ved man noget mere.'], g.S)); },
    aldrik: function (g) { return g.say('aldrik', g.S.flags.hildeFree ? 'Jeg har lært noget i dag, lærling. En borgmester bør lytte til beviser, ikke til larm.' : 'Brønden er lukket! Vi finder den skyldige, det lover jeg!'); },
    hilde: function (g) { return g.say('hilde', g.S.flags.hildeFree ? 'Kom forbi, når du vil. Der er altid te i kedlen — og kattene elsker besøg.' : 'Jeg har ikke gjort noget, barn. Find beviser — så skal du se, hvem der har skylden.'); },
    ole: function (g) { return g.say('ole', g.S.flags.clean ? 'Se! En ørred! Den første i to uger. Åen lever igen.' : 'Jeg har sejlet på denne å i fyrre år. Aldrig har jeg set den så grøn.'); },
    sigrid: function (g) { return g.say('sigrid', g.S.q.s1 === 'done' ? 'Mis sover i min seng hver nat nu. Men om dagen vil hun hellere være sammen med dig.' : 'Mis kommer sikkert snart hjem …'); },
    bodil: function (g) { return g.say('bodil', pick(['Friskbagte kanelsnegle! … Men uden rent vand kan jeg snart ikke bage mere.', 'Duften af kanel gør alting bedre. Undtagen grønt vand.'], g.S)); },
    aksel: function (g) { return g.say('aksel', g.S.flags.clean ? 'Fiskene kommer tilbage! Jeg har allerede talt tre!' : 'Der plejede at være masser af fisk her. Nu er de væk.'); },
    durin: function (g) { return g.say('durin', 'Bjergsalt, bjergsten, bjergsko! Alt er bedre fra bjergene.'); },
    liv: function (g) { return g.say('liv', 'Månesalt skal høstes, når månen er fuld. Så er det mest virksomt — siger min mormor. Jeg har nu aldrig målt på det.'); },
    knud: function (g) { return g.say('knud', 'Tilbud, tilbud! Men regn altid efter selv — det siger min mor, og hun er også kræmmer.'); },
    bjorn: function (g) { return g.say('bjorn', 'Ild, jern og tålmodighed. Det er hele hemmeligheden.'); },
    esben: function (g) { return g.say('esben', g.S.flags.gateOpen ? 'Brynja har sendt bud. Porten er åben — pas godt på derinde.' : 'Østporten er lukket. Kun lærlinge med laugets tilladelse må gå ud til farveriet.'); },
    ulf: function (g) { return g.say('ulf', 'Jeg holder bare vagt. Og jeg har intet sagt. Overhovedet.'); },
    baron: function (g) { return g.say('baron', 'Sivefilteret er bestilt. Er du nu glad? … Godt. Det er jeg faktisk også lidt.'); }
  };
  var placeIdle = {
    tavle: function (g) { return g.say(null, g.S.q.q1 === 'done' ? 'Opslagene om brønden, belønningen og Mis. Og et nyt: «Høstmarked på lørdag — alle er velkomne!»' : 'En tavle fuld af opslag.'); },
    brond: function (g) { return g.say(null, g.S.flags.clean ? 'Vandet glitrer klart. Nogen har bundet en rød sløjfe om hanken.' : 'Månebrønden. Vandet er grønt og lugter af rådne æg. Et skilt siger: LUKKET.'); },
    ror: function (g) { return g.say(null, g.S.flags.clean ? 'Røret er tørt. Der er sat en prop i.' : 'Et tykt rør stikker ud fra muren. Grønt vand drypper ned i åen.'); },
    sign_laug: function (g) { return g.say(null, 'EVENTYRERLAUGET — lærlinge er velkomne. Tør fødderne af. Fodr ikke dragen.'); },
    sign_kro: function (g) { return g.say(null, 'DEN GYLDNE DRAGE — varm suppe og kolde historier.'); },
    sign_bib: function (g) { return g.say(null, 'BIBLIOTEKET — stille, tak. Bøger skal læses, ikke tygges. (Det gælder også dig, Glød.)'); },
    sign_alk: function (g) { return g.say(null, 'ALKYMISTENS VÆRKSTED — rør ikke ved noget, der bobler.'); },
    sign_syd: function (g) { return g.say(null, 'Kongevejen mod syd er lukket pga. mudder. Man synker helt til knæene.'); },
    sign_port: function (g) { return g.say(null, 'ØSTPORTEN — til Grimmarks Farveri. Kun med laugets tilladelse.'); },
    port: function (g) { return g.say(null, g.S.flags.gateOpen ? 'Porten står åben.' : 'Porten er lukket og låst med en tung bom.'); },
    ambolt: function (g) { return g.say(null, 'Bjørns ambolt. Den er stadig varm.'); },
    ventil: function (g) { return g.say(null, g.S.flags.f_valve ? 'Rør 2 er lukket. Du har selv drejet ventilen.' : 'Et stort ventilhjul.'); },
    kar: function (g) { return g.say(null, g.S.flags.clean ? 'Farvekarret er fyldt med smuk, blå farve — og intet løber ud i åen.' : 'Et kar fuld af farve. Det bobler.'); },
    vaegkort: function (g) { return g.say(null, 'Et kort over Runeborg og egnen omkring. Nogen har tegnet en lille drage i hjørnet.'); },
    banner: function (g) { return g.say(null, 'Et banner med en gylden drage. Den ligner Glød, bare med flere tænder.'); },
    kedel: function (g) { return g.say(null, 'Kedlen bobler og siger «blubb». Det lugter af kanel og noget, du ikke kan sætte navn på.'); }
  };

  // Byens huse, der er låst
  var lockedDoors = {
    'by:16,16': 'Sigrids hus. Der står en lille skål med fiskeben ved døren.',
    'by:28,16': 'Døren er låst. Det dufter af kanelsnegle indenfor.',
    'by:15,29': 'Smedjen. Bjørn arbejder udenfor ved ambolten i dag.',
    'by:42,29': 'Døren er låst. Nogen snorker højlydt indenfor.',
    'by:31,5': 'Hildes hytte. Der hænger urter til tørre over døren.'
  };

  // ---------------------------------------------------------------- opslag
  async function talk(g, id) {
    var S = g.S;
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

  RB.content = {
    AREA: AREA, CANDO: CANDO, classes: classes, npcs: npcs, things: things, runes: runes, places: places, placePos: placePos,
    clues: clues, skills: skills, lockedDoors: lockedDoors, script: script,
    talk: talk, available: available,
    quest: function (id) { return byId[id]; },
    questList: function () { return quests; },
    goal: function (id) { var q = byId[id], g = q.goal; return typeof g === 'function' ? g(RB.state) : g; },
    // Hvem skal have et "!" (har en ekstramission til dig) og hvem et "?" (din mission fortsætter her)
    markers: function (S) {
      var m = {};
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
    timeOfDay: function (S) {
      if (S.flags.clean) return 'fest';
      if (S.q.q10 === 'active') return 'nat';
      if (S.q.q6 === 'done') return 'aften';
      if (S.q.q3 === 'done') return 'eftermiddag';
      return 'morgen';
    }
  };
})();
