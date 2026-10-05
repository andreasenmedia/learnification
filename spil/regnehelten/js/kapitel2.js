/* Regnehelten — kapitel 2: Udflugten til Dyreparken
   Dagen efter. Hr. Poulsen tager klassen med bus til Dyreparken. Seks steder, seks opgavesæt i Blooms
   rækkefølge (HUSK -> SKAB), og to ekstramissioner. Opgaverne er ét klassetrin sværere end i kapitel 1.

   Alt, der hører til kapitlet, har id'er med k2 foran, så det ikke støder sammen med kapitel 1. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var K = RH.content;
  var SKIN = K.SKIN, HAIRC = K.HAIRC, CLOTH = K.CLOTH;

  function at(map, x, y, dir) { return function (S) { return S.kap === 2 ? { map: map, x: x, y: y, dir: dir || 'down' } : null; }; }

  // ---------------------------------------------------------------- personer
  var npcs = {
    buschauffoer: { name: 'Chauffør Britt', look: { skin: SKIN[2], hair: HAIRC[4], style: 'kort', hatColor: '#2c4a9c', cloth: '#2c4a9c', pants: '#3e4048', whistle: true }, pos: at('zoo', 20, 28, 'up') },
    billet: { name: 'Billetsælgeren', look: { skin: SKIN[1], hair: HAIRC[5], style: 'kort', cloth: '#c8282e', pants: '#4e5670', extra: 'briller', beard: true, beardColor: '#8a8a96' }, pos: at('zoo', 20, 23, 'down') },
    kioskdame: { name: 'Kioskdamen', look: { skin: SKIN[3], hair: HAIRC[1], style: 'knold', cloth: '#e0a82c', pants: '#54505c', apron: true }, pos: at('zoo', 31, 15, 'down') },
    passer: {
      name: 'Dyrepasser Jonas', look: { skin: SKIN[2], hair: HAIRC[0], style: 'kasket', hatColor: '#2c8a4e', cloth: '#2c8a4e', pants: '#4a544a', extra: 'taske' },
      pos: function (S) {
        if (S.kap !== 2) return null;
        if (S.q.k2q4 === 'active') return { map: 'zoo', x: 17, y: 13, dir: 'left' };     // ved aberne
        return { map: 'zoo', x: 38, y: 12, dir: 'down' };                                   // ved pingvinhuset
      }
    }
  };
  // Klassen og læreren i Dyreparken (de samme personer som i kapitel 1, men et andet sted)
  function flytKap2(id, map, x, y, dir) {
    var gammel = K.npcs[id].pos;
    K.npcs[id].pos = function (S) { return S.kap === 2 ? { map: map, x: x, y: y, dir: dir || 'down' } : gammel(S); };
  }
  flytKap2('oskar', 'zoo', 25, 25, 'left');
  flytKap2('sofie', 'zoo', 26, 24, 'down');
  flytKap2('emma', 'zoo', 21, 17, 'down');
  (function () {
    var gammel = K.npcs.poulsen.pos;
    K.npcs.poulsen.pos = function (S) {
      if (S.kap !== 2) return gammel(S);
      return S.q.k2q5 === 'active' ? { map: 'zoo', x: 23, y: 5, dir: 'down' } : { map: 'zoo', x: 21, y: 25, dir: 'down' };
    };
  })();

  var things = [
    { id: 'k2_abe1', map: 'zoo', x: 9, y: 11, kind: 'dyr_abe', visible: function (S) { return S.kap === 2; } },
    { id: 'k2_abe2', map: 'zoo', x: 12, y: 14, kind: 'dyr_abe', visible: function (S) { return S.kap === 2; } },
    { id: 'k2_ged1', map: 'zoo', x: 10, y: 4, kind: 'dyr_ged', visible: function (S) { return S.kap === 2; } },
    { id: 'k2_ged2', map: 'zoo', x: 14, y: 5, kind: 'dyr_ged', visible: function (S) { return S.kap === 2; } },
    { id: 'k2_ping1', map: 'pingvinhus', x: 3, y: 7, kind: 'dyr_pingvin', visible: function (S) { return S.kap === 2; } },
    { id: 'k2_ping2', map: 'pingvinhus', x: 6, y: 7, kind: 'dyr_pingvin', visible: function (S) { return S.kap === 2; } },
    { id: 'k2_ping3', map: 'pingvinhus', x: 9, y: 7, kind: 'dyr_pingvin', visible: function (S) { return S.kap === 2; } }
  ];

  var places = {
    'zoo:19,22': 'billetluge', 'zoo:20,22': 'billetluge', 'zoo:28,22': 'udgang', 'zoo:31,14': 'kiosk2', 'zoo:32,14': 'kiosk2',
    'zoo:19,18': 'plan', 'pingvinhus:5,1': 'pingvintavle', 'zoo:26,4': 'baenk_zoo', 'zoo:27,4': 'baenk_zoo', 'zoo:11,7': 'aberskilt'
  };
  var placePos = { billetluge: ['zoo', 20, 22] };
  var lockedDoors = { };

  // ---------------------------------------------------------------- missioner
  var ACT1 = 'Udflugten · Ankomsten', ACT2 = 'Udflugten · Dyrene', ACT3 = 'Udflugten · Hjemturen', SIDE = 'Ekstramissioner';
  var quests = [
    { id: 'k2q0', act: ACT1, title: 'Bussen til Dyreparken', desc: 'Tal tider og pladser igennem med Chauffør Britt.', bloom: 'HUSK', target: function () { return 'buschauffoer'; }, goal: 'Tal med Chauffør Britt ved bussen' },
    { id: 'k2q1', act: ACT1, title: 'Billetlugen', desc: 'Klassen skal have billetter. Hjælp billetsælgeren med at regne rigtigt.', bloom: 'FORSTÅ', requires: ['k2q0'], target: function () { return 'billet'; }, goal: 'Gå hen til billetlugen' },
    { id: 'k2q2', act: ACT2, title: 'Kiosken ved pladsen', desc: 'Der skal købes frokost og drikkevarer til dagen.', bloom: 'ANVEND', requires: ['k2q1'], target: function () { return 'kioskdame'; }, goal: 'Find kioskdamen midt i parken' },
    { id: 'k2q3', act: ACT2, title: 'Dyrene skal have mad', desc: 'Dyrepasser Jonas har brug for en, der kan regne på foder og tider.', bloom: 'ANALYSÉR', requires: ['k2q2'], target: function () { return 'passer'; }, goal: 'Tal med Jonas ved pingvinhuset' },
    { id: 'k2q4', act: ACT2, title: 'Regnskabet ved aberne', desc: 'Jonas har regnet en masse sammen. Passer det hele?', bloom: 'VURDÉR', requires: ['k2q3'], target: function () { return 'passer'; }, goal: 'Gå hen til aberne, hvor Jonas venter' },
    { id: 'k2q5', act: ACT3, title: 'Fremlæggelse på græsset', desc: 'Vis Hr. Poulsen, hvad du har lært i dag.', bloom: 'SKAB', requires: ['k2q4'], target: function () { return 'poulsen'; }, goal: 'Find Hr. Poulsen ved madpakkegræsset' },
    { id: 'k2s1', act: SIDE, side: true, title: 'Aberne er sultne', desc: 'Jonas skal fordele bananer — og passe på med at regne forkert.', bloom: 'FORSTÅ', requires: ['k2q2'], giver: 'passer', target: function () { return 'passer'; }, goal: 'Hjælp Jonas' },
    { id: 'k2s2', act: SIDE, side: true, title: 'Souvenirbutikken', desc: 'Kioskdamen skal bruge en regnemaskine med to ben.', bloom: 'ANVEND', requires: ['k2q1'], giver: 'kioskdame', target: function () { return 'kioskdame'; }, goal: 'Hjælp kioskdamen' }
  ];

  // ---------------------------------------------------------------- opgavesættene: replikker før og efter
  var enc = {
    k2q0: { saet: 'u_husk', scene: 'Bussen', flag: null, next: 'k2q1',
      intro: [['buschauffoer', 'Velkommen til Dyreparken! Jeg er Britt, jeg har kørt jer helt herhen.'], ['buschauffoer', 'Inden I går ind, skal vi lige have styr på tallene: tider, pladser og billetter.']],
      after: [['buschauffoer', 'Flot regnet! Gå hen til billetlugen — så får klassen sine billetter.']] },
    k2q1: { saet: 'u_forstaa', scene: 'Billetlugen', flag: 'zooInd', next: 'k2q2',
      intro: [['billet', 'Goddag! Er det jer, der er klassen fra byen? Jeg skal lige bruge en, der kan regne.'], ['billet', 'Priser, halve billetter og at dele regningen — det er mit job.']],
      after: [['billet', 'Så er billetterne i orden. Lågen er åben — god tur ind til dyrene!']] },
    k2q2: { saet: 'u_anvend', scene: 'Kiosken', flag: null, next: 'k2q3',
      intro: [['kioskdame', 'Nå, sultne rejsende! Jeg har is, saftevand og pandekager.'], ['kioskdame', 'Men jeg har glemt mine briller — du må være min regnemaskine.']],
      after: [['kioskdame', 'Fint, fint. Gå du bare ud til dyrene. Jonas venter ved pingvinhuset.']] },
    k2q3: { saet: 'u_analyser', scene: 'Dyrene', flag: null, next: 'k2q4',
      intro: [['passer', 'Hej, jeg hedder Jonas. Jeg passer dyrene her.'], ['passer', 'Pingvinerne, aberne og gederne skal alle have mad til tiden. Det er mønstre og tal hele dagen.']],
      after: [['passer', 'Det klarede du godt! Kom ned til aberne bagefter, så skal vi se på regnskabet.']] },
    k2q4: { saet: 'u_vurder', scene: 'Regnskabet', flag: null, next: 'k2q5',
      intro: [['passer', 'Her er mit regnskab. Jeg tror, der er sneget sig fejl ind.'], ['passer', 'Vil du være dommer? Sig bare, hvad der er rigtigt.']],
      after: [['passer', 'Hr. Poulsen venter ved madpakkegræsset oppe nord for pladsen. Han vil høre, hvad du har lært i dag.']] },
    k2q5: { saet: 'u_boss', scene: 'Fremlæggelsen', flag: null, next: null,
      intro: [['poulsen', 'Nå, der er du.'], ['poulsen', 'I går sagde jeg, du kunne mere, end du troede. I dag har du regnet i bus, ved billetlugen og blandt dyrene.'], ['poulsen', 'Så vis mig det. Ikke for min skyld — for din egen.']],
      after: [['poulsen', 'Nu ved du, hvordan det føles at kunne. Det var ikke et held — det var dig.']] },
    k2s1: { saet: 'sq_u_aber', scene: 'Aberne',
      intro: [['passer', 'Dig kan jeg godt bruge! Aberne har fået fat i bananerne igen.'], ['passer', 'Hjælp mig med at dele dem ligeligt — og tjek mine tal.']],
      after: [['passer', 'Perfekt! Aberne siger tak. Tag en banan med dig.']] },
    k2s2: { saet: 'sq_u_souvenir', scene: 'Souvenirbutikken',
      intro: [['kioskdame', 'Hej igen! Jeg skal lige have hjælp i souvenirbutikken.'], ['kioskdame', 'Kan du lægge pengene op, dele regningen og finde regnestykkerne på prismærkerne?']],
      after: [['kioskdame', 'Du er guld værd. Her, tag et kort med hjem.']] }
  };
  var rewards = { k2q0: 'k2_billet', k2q1: 'k2_diplom', k2q2: 'k2_flaske', k2q3: 'k2_fjer', k2q4: 'k2_glas', k2q5: 'k2_medalje', k2s1: 'k2_banan', k2s2: 'k2_kurv' };
  var items = {
    k2_billet: { name: 'Busbilletten', icon: 'billet', desc: 'Britt klippede et hul i den. Nu er den din billet til alle slags udflugter.' },
    k2_diplom: { name: 'Klassebilletten', icon: 'diplom', desc: 'En stor billet til hele klassen, stemplet af billetsælgeren. Du lagde den i tasken.' },
    k2_flaske: { name: 'Saftflasken', icon: 'flaske', desc: 'Fra kiosken. Der står "til den, der regner hurtigst" på etiketten.' },
    k2_fjer: { name: 'Pingvinfjeren', icon: 'fjer', desc: 'Den lå ved bassinet. Jonas siger, at pingvinerne taber en fjer, når de er glade.' },
    k2_glas: { name: 'Forstørrelsesglasset', icon: 'forstoerrelsesglas', desc: 'Jonas bruger det til at tjekke tal. Nu er det dit.' },
    k2_medalje: { name: 'Udflugtsmedaljen', icon: 'maedal', desc: 'Hr. Poulsen hængte den om din hals på græsset. Den er lavet af chokolade — og guldfolie.' },
    k2_banan: { name: 'Bananen', icon: 'banan', desc: 'Aberne sagde tak på deres måde.' },
    k2_kurv: { name: 'Souvenirkurven', icon: 'kurv', desc: 'En lille kurv med et dyrekort i. Til at huske dagen med.' }
  };

  // ---------------------------------------------------------------- handlinger
  var on = {};
  on.k2q0 = { buschauffoer: K.main('k2q0') };
  on.k2q1 = { billet: K.main('k2q1'), billetluge: K.main('k2q1') };
  on.k2q2 = { kioskdame: K.main('k2q2'), kiosk2: K.main('k2q2') };
  on.k2q3 = { passer: K.main('k2q3') };
  on.k2q4 = { passer: K.main('k2q4') };
  on.k2q5 = { poulsen: K.main('k2q5') };
  on.k2s1 = { passer: K.side('k2s1') };
  on.k2s2 = { kioskdame: K.side('k2s2'), kiosk2: K.side('k2s2') };
  var offer = {
    k2s1: async function (g) { g.start('k2s1'); await on.k2s1.passer(g); },
    k2s2: async function (g) { g.start('k2s2'); await on.k2s2.kioskdame(g); }
  };

  // ---------------------------------------------------------------- når der ikke er noget særligt
  function done(S, id) { return S.q[id] === 'done'; }
  var idle = {
    buschauffoer: function (g) { return g.say('buschauffoer', done(g.S, 'k2q5') ? 'Hjemturen bliver både høj og lav — I har regnet hele dagen!' : done(g.S, 'k2q0') ? 'Bussen venter her, til I skal hjem. Husk at tælle hoveder, inden vi kører.' : 'Er I klar til udflugt?'); },
    billet: function (g) { return g.say('billet', done(g.S, 'k2q1') ? 'God tur! Og husk at holde jer til stierne.' : 'Hej! Er I klassen fra byen?'); },
    kioskdame: function (g) { return g.say('kioskdame', done(g.S, 'k2q2') ? 'Pandekager er også til dem, der har regnet godt.' : 'Hvad skulle det være? Is, saftevand eller en pandekage?'); },
    passer: function (g) { return g.say('passer', done(g.S, 'k2q4') ? 'Tak for hjælpen med regnskabet. Pingvinerne siger tak. Eller — de siger ingenting.' : 'Pingvinerne spiser kun fisk. Aberne spiser næsten alt. Og gederne spiser dit tøj.'); },
    oskar: function (g) { return g.say('oskar', done(g.S, 'k2q1') ? 'Har du set pingvinerne? De ligner små tjenere!' : 'Kommer du med ind? Jeg har aldrig set en rigtig pingvin.'); },
    sofie: function (g) { return g.say('sofie', 'Jeg skal vinde quizzen i bussen hjem. Vil du være på mit hold?'); },
    emma: function (g) { return g.say('emma', done(g.S, 'k2q2') ? 'Pandekager og matematik — det er en god kombination.' : 'Jeg har fået den bedste plads i bussen.'); },
    poulsen: function (g) { return g.say('poulsen', done(g.S, 'k2q5') ? 'Det var en god dag. I bussen hjem vil jeg høre jeres bedste dyrefakta.' : 'Vi mødes på græsset, når I er færdige med stederne. Ingen skynder sig.'); },
    k2_abe1: function (g) { return g.say(null, 'Aben holder sig i sit eget øre og kigger på dig, som om du har et regnestykke i lommen.'); },
    k2_abe2: function (g) { return g.say(null, 'Aben tygger en banan og rækker den ene hånd frem. Du har ikke flere.'); },
    k2_ged1: function (g) { return g.say(null, 'Geden skubber til gitteret. Den vil have din madpakke.'); },
    k2_ged2: function (g) { return g.say(null, 'Geden kigger på din jakke. Den er ikke til at stole på.'); },
    k2_ping1: function (g) { return g.say(null, 'Pingvinen vralter ned til bassinet og kigger på dig, som om du var sen.'); },
    k2_ping2: function (g) { return g.say(null, 'Pingvinen står helt stille og kigger op i loftet. Måske tæller den lysene.'); },
    k2_ping3: function (g) { return g.say(null, 'Pingvinen dykker i vandet og kommer op igen uden fisk. Den ser skuffet ud.'); }
  };
  var placeIdle = {
    billetluge: function (g) { return g.say(null, 'BILLETLUGEN. Børn: halv pris. Voksne: hel pris. Skoleklasser: kom og spørg.'); },
    udgang: function (g) { return g.say(null, 'UDGANG. Souvenirs købes her på vej ud.'); },
    kiosk2: function (g) { return g.say(null, 'KIOSKEN. Is, saftevand og pandekager — og en lille hylde med dyrekort.'); },
    plan: function (g) { return g.say(null, 'Parkens kort: Aberne mod vest, pingvinerne mod øst, gederne mod nordvest og madpakkegræsset mod nord. Du er her.'); },
    pingvintavle: function (g) { return g.say(null, 'PINGVINERNE. De kan holde vejret i op til 20 minutter — og de ligner små tjenere.'); },
    baenk_zoo: function (g) { return g.say(null, 'En bænk med udsigt til madpakkegræsset. Nogen har efterladt en halv sandwich.'); },
    aberskilt: function (g) { return g.say(null, 'ABEHUSET. Fodr ikke aberne — de kan godt selv finde ud af at stjæle fra dig.'); }
  };

  // ---------------------------------------------------------------- start og slut
  async function intro(g) {
    await g.say(null, 'Dagen efter. Klassen står samlet på Dyreparkens parkeringsplads, og Hr. Poulsen tæller hoveder.');
    await g.say('poulsen', 'I går sagde jeg, at jeg troede på jer. I dag skal vi på udflugt til Dyreparken — og der er matematik hele vejen.', 'I går sagde jeg, at jeg troede på jer. I dag skal vi på udflugt til Dyreparken, og der er matematik hele vejen.');
    await g.say('oskar', 'Hold op, hvor skal det blive sjovt! Jeg vil se aberne først!');
    await g.say('poulsen', 'Gå først hen til Chauffør Britt ved bussen — hun har et par spørgsmål til dig.');
    g.start('k2q0', true);
    g.toast('<b>Mission:</b> ' + RH.esc(K.quest('k2q0').title) + '<br>Tryk <span class="key">B</span> for at åbne Dagbogen.');
  }
  async function sceneSlut(g) {
    await g.say('poulsen', 'Så er I færdige. I har regnet i bussen, ved billetlugen, i kiosken og blandt dyrene. Og hvad har I lært?');
    await g.say('oskar', 'At aberne har flere bananer, end jeg har penge!');
    await g.say('sofie', 'At halv pris er halvdelen!');
    await g.say('poulsen', 'Og dig, {navn}? Jeg ser en elev, der går i gang med tingene — og blir ved. Det er den eneste måde at lære det på.');
    await g.say(null, 'Bussen kører, og solen går ned bag de grå skyer. På vej hjem tæller I stolene: alle er med.');
  }

  K.tilfoej({
    kap: 2,
    npcs: npcs, things: things, places: places, placePos: placePos, lockedDoors: lockedDoors,
    quests: quests, enc: enc, rewards: rewards, items: items, on: on, offer: offer, idle: idle, placeIdle: placeIdle,
    meta: {
      navn: 'Udflugten til Dyreparken',
      kort: 'Dagen efter. Hele klassen tager med bussen til Dyreparken.',
      tilbud: 'I morgen tager klassen på udflugt til Dyreparken! Der er matematik hele vejen: billetter, kiosk, dyr og regnskab. Vil du med?',
      start: { map: 'zoo', x: 22, y: 26, dir: 'up' },
      tod: function (S) {
        if (S.q.k2q5 === 'active' || (S.klaret || []).indexOf(2) >= 0) return 'eftermiddag';
        if (S.q.k2q3 === 'active' || S.q.k2q4 === 'active') return 'formiddag';
        return 'morgen';
      },
      efterTitel: 'Udflugten er klaret!',
      efterMaal: 'Gå en tur i Dyreparken, og hjælp dem, der stadig har brug for det',
      efter: { npc: 'poulsen' },
      sider: ['k2s1', 'k2s2'],
      intro: intro,
      slut: {
        titel: 'Udflugten er klaret!',
        tekst: 'I dag regnede du i bus, ved billetlugen, i kiosken og blandt dyrene — og du blev ved, også når det var svært. Her er, hvad du har vist, at du kan:',
        rundt: 'Gå en tur i Dyreparken',
        scene: sceneSlut
      }
    }
  });
})();
