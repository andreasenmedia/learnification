/* Regnehelten — kapitel 3: Lørdagsmarkedet
   Lørdag på torvet. Far og Ida skal handle, og de har brug for en, der kan regne. Seks steder, seks opgavesæt
   i Blooms rækkefølge (HUSK -> SKAB), og to ekstramissioner. Opgaverne er ét klassetrin sværere end i kapitel 2.

   Alt, der hører til kapitlet, har id'er med k3 foran, så det ikke støder sammen med kapitel 1 og 2. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var K = RH.content;
  var SKIN = K.SKIN, HAIRC = K.HAIRC;

  function at(map, x, y, dir) { return function (S) { return S.kap === 3 ? { map: map, x: x, y: y, dir: dir || 'down' } : null; }; }

  // ---------------------------------------------------------------- personer
  var npcs = {
    bager: { name: 'Bageren Karen', look: { skin: SKIN[1], hair: HAIRC[3], style: 'knold', cloth: '#f4f4f0', pants: '#8a8a96', apron: true, hatColor: '#f4f4f0' }, pos: at('bageri', 7, 3, 'down') },
    frugtmand: { name: 'Frugthandler Ali', look: { skin: SKIN[4], hair: HAIRC[0], style: 'kort', cloth: '#2c8a4e', pants: '#4a544a', beard: true, beardColor: '#2c221e', apron: true }, pos: at('marked', 13, 14, 'up') },
    loppe: { name: 'Svend på loppemarkedet', look: { skin: SKIN[2], hair: HAIRC[5], style: 'kasket', hatColor: '#8a5a32', cloth: '#8a5a32', pants: '#5a5866', beard: true, beardColor: '#8a8a96' }, pos: at('marked', 37, 14, 'up') },
    blomsterkone: { name: 'Blomsterhandler Rosa', look: { skin: SKIN[3], hair: HAIRC[4], style: 'lang', cloth: '#c8508a', pants: '#786096', apron: true }, pos: at('marked', 14, 20, 'down') }
  };
  // Far og Ida er med på markedet (og Mor er blevet hjemme med forkølelse)
  (function () {
    var farGammel = K.npcs.far.pos, idaGammel = K.npcs.ida.pos;
    K.npcs.far.pos = function (S) {
      if (S.kap !== 3) return farGammel(S);
      return S.q.k3q5 === 'active' || (S.klaret || []).indexOf(3) >= 0 ? { map: 'marked', x: 34, y: 20, dir: 'down' } : { map: 'marked', x: 24, y: 25, dir: 'up' };
    };
    K.npcs.ida.pos = function (S) {
      if (S.kap !== 3) return idaGammel(S);
      return S.q.k3q4 === 'active' ? { map: 'marked', x: 24, y: 14, dir: 'up' } : { map: 'marked', x: 26, y: 25, dir: 'up' };
    };
  })();

  var things = [];
  var places = {
    'marked:21,17': 'opslag_marked', 'marked:22,17': 'opslag_marked',
    'marked:25,16': 'baenk_marked', 'marked:26,16': 'baenk_marked', 'marked:18,20': 'baenk_marked', 'marked:19,20': 'baenk_marked',
    'marked:10,13': 'frugtbod', 'marked:12,13': 'frugtbod', 'marked:14,13': 'frugtbod', 'marked:16,13': 'frugtbod',
    'marked:22,12': 'honningbod', 'marked:24,12': 'honningbod', 'marked:26,12': 'honningbod', 'marked:28,12': 'honningbod',
    'marked:34,13': 'loppebod', 'marked:36,13': 'loppebod', 'marked:38,13': 'loppebod', 'marked:40,13': 'loppebod',
    'marked:11,19': 'blomsterbod', 'marked:12,19': 'blomsterbod', 'marked:13,19': 'blomsterbod', 'marked:15,19': 'blomsterbod',
    'marked:32,19': 'egenbod', 'marked:34,19': 'egenbod', 'marked:36,19': 'egenbod',
    'bageri:7,1': 'opslag_bageri'
  };
  var placePos = {};
  var lockedDoors = {};

  // ---------------------------------------------------------------- missioner
  var ACT1 = 'Markedet · Om morgenen', ACT2 = 'Markedet · Handlen', ACT3 = 'Markedet · Egen bod', SIDE = 'Ekstramissioner';
  var quests = [
    { id: 'k3q0', act: ACT1, title: 'Torvet åbner', desc: 'Far og Ida har brug for en, der har styr på tider, penge og tal.', bloom: 'HUSK', target: function () { return 'far'; }, goal: 'Tal med Far ved indgangen til torvet' },
    { id: 'k3q1', act: ACT1, title: 'Bageren og opskriften', desc: 'Bageren skal lave dobbelt portion — og have regnet rigtigt.', bloom: 'FORSTÅ', requires: ['k3q0'], target: function () { return 'bager'; }, goal: 'Gå ind i bageriet' },
    { id: 'k3q2', act: ACT2, title: 'Frugt og grønt', desc: 'Kilopriser, byttepenge og et par gode tilbud.', bloom: 'ANVEND', requires: ['k3q1'], target: function () { return 'frugtmand'; }, goal: 'Find frugthandler Ali ved frugtboden' },
    { id: 'k3q3', act: ACT2, title: 'Loppemarkedet', desc: 'Svend har bøger på bordene, og regnestykkerne på prismærkerne skal gå op.', bloom: 'ANALYSÉR', requires: ['k3q2'], target: function () { return 'loppe'; }, goal: 'Gå hen til loppemarkedet' },
    { id: 'k3q4', act: ACT2, title: 'Hvilket tilbud er bedst?', desc: 'Ida har fundet tre tilbud. Vis, hvilket der faktisk er billigst.', bloom: 'VURDÉR', requires: ['k3q3'], target: function () { return 'ida'; }, goal: 'Find Ida ved honningboderne' },
    { id: 'k3q5', act: ACT3, title: 'Vores egen bod', desc: 'Klassen har sin egen bod i dag. Regn overskuddet ud — og byg et skilt.', bloom: 'SKAB', requires: ['k3q4'], target: function () { return 'far'; }, goal: 'Gå hen til jeres egen bod for enden af torvet' },
    { id: 'k3s1', act: SIDE, side: true, title: 'Blomsterboden', desc: 'Rosa skal have buketter delt og regnet rigtigt.', bloom: 'FORSTÅ', requires: ['k3q1'], giver: 'blomsterkone', target: function () { return 'blomsterkone'; }, goal: 'Hjælp Rosa ved blomsterboden' },
    { id: 'k3s2', act: SIDE, side: true, title: 'Tombolaen', desc: 'Svend vil trække lodder og skal bruge en, der kan regne.', bloom: 'ANVEND', requires: ['k3q2'], giver: 'loppe', target: function () { return 'loppe'; }, goal: 'Hjælp Svend ved loppemarkedet' }
  ];

  var enc = {
    k3q0: { saet: 'm_husk', scene: 'Torvet åbner', flag: null, next: 'k3q1',
      intro: [['far', 'Lørdag morgen! Torvet åbner om lidt, og jeg skal bruge en, der har styr på tider og tal.'], ['ida', 'Og jeg har sparet op! Jeg vil købe noget fra loppemarkedet.']],
      after: [['far', 'Flot! Bageren venter — hun vil gerne have hjælp med opskriften. Gå ind i bageriet derovre.']] },
    k3q1: { saet: 'm_forstaa', scene: 'Bageren', flag: null, next: 'k3q2',
      intro: [['bager', 'Velkommen i bageriet! Jeg skal lave dobbelt portion kanelsnegle til markedet, og nu kan jeg ikke huske opskriften.'], ['bager', 'Kan du hjælpe mig med at regne den om?']],
      after: [['bager', 'Perfekt! Her lugter allerede af hele dagen. Frugthandler Ali har brug for hjælp bagefter.']] },
    k3q2: { saet: 'm_anvend', scene: 'Frugt og grønt', flag: null, next: 'k3q3',
      intro: [['frugtmand', 'Godmorgen! Frugt, grønt og gode tilbud!'], ['frugtmand', 'Men jeg har glemt mine briller, så jeg skal bruge en, der kan regne, når folk handler.']],
      after: [['frugtmand', 'Du har fødder i matematikken! Gå over til Svend på loppemarkedet — han venter på dig.']] },
    k3q3: { saet: 'm_analyser', scene: 'Loppemarkedet', flag: null, next: 'k3q4',
      intro: [['loppe', 'Hej, kunde! Jeg har bøger, bamser og en masse gammelt rod.'], ['loppe', 'Prismærkerne er sat i en rækkefølge, men jeg har mistet overblikket.']],
      after: [['loppe', 'Tak! Så kan jeg sælge mine bøger uden bekymringer. Ida venter ved honningboderne.']] },
    k3q4: { saet: 'm_vurder', scene: 'Tilbuddene', flag: null, next: 'k3q5',
      intro: [['ida', 'Der er så mange tilbud på markedet!'], ['ida', 'Men er et tilbud altid et godt tilbud? Hjælp mig med at regne efter.']],
      after: [['ida', 'Nu ved jeg, hvad jeg skal spare op til. Far venter ved vores egen bod, for enden af torvet.']] },
    k3q5: { saet: 'm_boss', scene: 'Egen bod', flag: null, next: null,
      intro: [['far', 'Her er vores egen bod! Klassen har stillet marmelade, kager og krukker op.'], ['far', 'Nu skal du hjælpe os med at regne på salget og overskuddet — og bygge et regnestykke til vores skilt.']],
      after: [['far', 'Det var det! Vi har tjent penge, og du har regnet hele dagen. Jeg er stolt af dig.']] },
    k3s1: { saet: 'sq_m_blomster', scene: 'Blomsterboden',
      intro: [['blomsterkone', 'Hej! Jeg har rigtig mange blomster, og jeg skal lave buketter.'], ['blomsterkone', 'Kan du hjælpe mig med at regne på dem?']],
      after: [['blomsterkone', 'Prægtigt! Her — en buket til dig.']] },
    k3s2: { saet: 'sq_m_tombola', scene: 'Tombolaen',
      intro: [['loppe', 'Hej igen! Jeg skal bruge hjælp til tombolaen.'], ['loppe', 'Hvor mange lodder er solgt, og hvor mange er der tilbage i trommen?']],
      after: [['loppe', 'Du er guld værd! Her er et lod til dig. Måske vinder du en bamse.']] }
  };
  var rewards = { k3q0: 'k3_blomst', k3q1: 'k3_bolle', k3q2: 'k3_aeble', k3q3: 'k3_bamse', k3q4: 'k3_honning', k3q5: 'k3_overskud', k3s1: 'k3_buket', k3s2: 'k3_lod' };
  var items = {
    k3_blomst: { name: 'Blomsten fra Ida', icon: 'blomst', desc: 'Ida fandt den ved blomsterboden. "Til at huske, hvem der spurgte først," sagde hun.' },
    k3_bolle: { name: 'Kanelsneglen', icon: 'bolle', desc: 'Den er stadig varm. Karen siger, den smager bedst, når man har regnet opskriften rigtigt.' },
    k3_aeble: { name: 'Æblet fra Ali', icon: 'aeble', desc: 'Det blankeste æble på hele torvet. Du kan næsten se dig selv i det.' },
    k3_bamse: { name: 'Plysbamsen', icon: 'bamse', desc: 'Fra loppemarkedet. Svend sagde, den var gratis, hvis du kunne regne dens pris ud — og det kunne du.' },
    k3_honning: { name: 'Honningglasset', icon: 'honning', desc: 'Det bedste honning på torvet. Ida har allerede lånt det.' },
    k3_overskud: { name: 'Overskuddet', icon: 'guldmoent', desc: 'En blank mønt fra klassens bod. Det er den første, I tjente.' },
    k3_buket: { name: 'Buketten', icon: 'blomst', desc: 'Roser, tulipaner og en enkelt solsikke. Rosa bandt dem selv sammen.' },
    k3_lod: { name: 'Tombolalodden', icon: 'billet', desc: 'Nummer 17. Svend sagde, at det var heldigt.' }
  };

  var on = {};
  on.k3q0 = { far: K.main('k3q0') };
  on.k3q1 = { bager: K.main('k3q1') };
  on.k3q2 = { frugtmand: K.main('k3q2') };
  on.k3q3 = { loppe: K.main('k3q3') };
  on.k3q4 = { ida: K.main('k3q4') };
  on.k3q5 = { far: K.main('k3q5') };
  on.k3s1 = { blomsterkone: K.side('k3s1') };
  on.k3s2 = { loppe: K.side('k3s2') };
  var offer = {
    k3s1: async function (g) { g.start('k3s1'); await on.k3s1.blomsterkone(g); },
    k3s2: async function (g) { g.start('k3s2'); await on.k3s2.loppe(g); }
  };

  function done(S, id) { return S.q[id] === 'done'; }
  var idle = {
    far: function (g) { return g.say('far', done(g.S, 'k3q5') ? 'Vi har tjent ti kroner på hver krukke. Det er mere, end jeg troede.' : 'Torvet åbner snart! Husk at spørge, hvis noget er uklart.'); },
    ida: function (g) { return g.say('ida', done(g.S, 'k3q4') ? 'Tak for hjælpen — nu ved jeg, hvad der er billigst.' : 'Jeg har kigget på bamserne. De er søde. Og de er ikke billige.'); },
    bager: function (g) { return g.say('bager', done(g.S, 'k3q1') ? 'Duften af kanel sælger bageriet — mere end priserne.' : 'Velkommen til! Vil du smage en bolle?'); },
    frugtmand: function (g) { return g.say('frugtmand', done(g.S, 'k3q2') ? 'Frisk frugt hver dag. Og aldrig for mange briller.' : 'Æbler, pærer og de bedste jordbær i byen.'); },
    loppe: function (g) { return g.say('loppe', done(g.S, 'k3q3') ? 'Alt er til salg, undtagen mit gamle ur.' : 'Her er alt, hvad ingen vil have — og alt, alle vil have.'); },
    blomsterkone: function (g) { return g.say('blomsterkone', done(g.S, 'k3s1') ? 'Duften af roser giver mig mere energi end kaffe.' : 'Blomster til alle! Og et smil, hvis I køber to buketter.'); }
  };
  var placeIdle = {
    opslag_marked: function (g) { return g.say(null, 'TORVEDAGEN: Boderne åbner klokken 9. Loppemarkedet lukker klokken 14. Husk poser.'); },
    opslag_bageri: function (g) { return g.say(null, 'KANELSNEGLE — i dag 3 for 20 kr. Rugbrød fra i går: halv pris.'); },
    baenk_marked: function (g) { return g.say(null, 'En bænk midt på torvet. Alle sætter sig her, når posen bliver for tung.'); },
    frugtbod: function (g) { return g.say(null, 'Æbler, pærer, jordbær — og et skilt: "Prøv inden du køber". Det gør du.'); },
    honningbod: function (g) { return g.say(null, 'Honning, ost og marmelade i små krukker. Alt med håndskrevne etiketter.'); },
    loppebod: function (g) { return g.say(null, 'Gamle bøger, bamser og en grammofon, der ikke virker.'); },
    blomsterbod: function (g) { return g.say(null, 'Spande med roser, tulipaner og solsikker. Det dufter af sommer.'); },
    egenbod: function (g) { return g.say(null, 'Jeres egen bod. Hr. Poulsen har malet skiltet — uden at stave "marmelade" rigtigt.'); }
  };

  async function intro(g) {
    await g.say(null, 'Lørdag formiddag. Torvet summer af stemmer, kaffe og duften af nybagt brød. Overalt står boder med striber.');
    await g.say('far', 'Der er du! Mor er blevet hjemme med forkølelse, så Ida og jeg skal selv klare markedet. Vil du hjælpe os med at regne?', 'Der er du! Mor er blevet hjemme med forkølelse, så Ida og jeg skal selv klare markedet. Vil du hjælpe os med at regne?');
    await g.say('ida', 'Der er så mange boder! Jeg ved slet ikke, hvor jeg skal begynde.');
    g.start('k3q0', true);
    g.toast('<b>Mission:</b> ' + RH.esc(K.quest('k3q0').title) + '<br>Tryk <span class="key">B</span> for at åbne Dagbogen.');
  }
  async function sceneSlut(g) {
    await g.say('far', 'Nu er markedet ved at lukke. Vi har solgt det meste, og regnskabet går op.');
    await g.say('ida', 'Jeg har købt en bamse, en honning og en buket. Og det hele passer med mine penge!');
    await g.say('mor', 'Jeg ringede lige for at høre, hvordan det går. Jeg hørte, at du har regnet hele dagen?', 'Jeg ringede lige for at høre, hvordan det går. Jeg hørte, at du har regnet hele dagen?');
    await g.say('far', 'Hver eneste opgave, {navn}. Ikke for karakterer, men fordi du ville. Det er det, der tæller.');
    await g.say(null, 'Solen står lavt over torvet, og de sidste boder pakkes sammen. Du har regnet i bus, i dyreparken og på markedet — og du har mærket, hvor langt du er kommet.');
  }

  K.tilfoej({
    kap: 3,
    npcs: npcs, things: things, places: places, placePos: placePos, lockedDoors: lockedDoors,
    quests: quests, enc: enc, rewards: rewards, items: items, on: on, offer: offer, idle: idle, placeIdle: placeIdle,
    meta: {
      navn: 'Lørdagsmarkedet',
      kort: 'Lørdag. Far og Ida skal på markedet — og de skal bruge en, der kan regne.',
      tilbud: 'På lørdag skal Far og Ida på torvet, hvor der er marked. De har brug for en, der kan regne på priser, tilbud og byttepenge. Vil du med?',
      start: { map: 'marked', x: 24, y: 28, dir: 'up' },
      tod: function (S) {
        if (S.q.k3q5 === 'active' || (S.klaret || []).indexOf(3) >= 0) return 'eftermiddag';
        if (S.q.k3q3 === 'active' || S.q.k3q4 === 'active') return 'formiddag';
        return 'morgen';
      },
      efterTitel: 'Markedet er klaret!',
      efterMaal: 'Gå en tur på torvet, og hjælp dem, der stadig har brug for det',
      efter: { npc: 'far' },
      sider: ['k3s1', 'k3s2'],
      intro: intro,
      slut: {
        titel: 'Du klarede det hele!',
        tekst: 'Fra en dårlig matematiktime til en hel dag, en udflugt og et marked. Du har regnet, tænkt dig om og blevet ved — hver gang. Her er, hvad du har vist, at du kan:',
        rundt: 'Gå en tur på torvet',
        scene: sceneSlut
      }
    }
  });
})();
