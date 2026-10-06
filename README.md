# Learnification.dk

Statisk hjemmeside for Learnification — danske læringsspil til børn. Spillene
er **Runeborg** og **Regnehelten**. Begge er skrevet i ren JavaScript, bygget
på samme måde og spilles direkte i browseren.

Hostes på **Simply.com** (Apache-webhotel). Alt ligger i `public_html`.

## Sider

| Fil | URL | Hvad |
|---|---|---|
| `index.html` | `/` | Forside: hvad Learnification er, spilkort, skærmbilleder |
| `regnehelten.html` | `/regnehelten` | Om spillet: steder, opgavetyper, Regnebogen, Regnekraft |
| `spil/index.html` | `/spil/` | Sender videre til `/spil/regnehelten/`, så gamle links og QR-koder virker |
| `for-voksne.html` | `/for-voksne` | Forældre og lærere: hvad barnet øver, data, FAQ |
| `om.html` | `/om` | Om Learnification |
| `nyheder.html` | `/nyheder` | Nyheder: hvad der er sket på sitet, nyeste øverst. **Bygges af `tools/nyheder.py`** |
| `privatliv.html` | `/privatliv` | Privatlivs- og cookiepolitik. **Ret den, når noget nyt gemmes** |
| `404.html` | — | Vises ved forkert adresse |
| `tilmeld.php` | — | Tager imod tilmeldinger til spørgeskemaet |
| `resultat.php` | — | Tager imod resultater fra testomgangene |
| `.htaccess` | — | Serveropsætning. **Læs den, før du retter i strukturen** |
| `spil/regnehelten/` | `/spil/regnehelten/` | Selve Regnehelten — bygget som Runeborg, ingen bygning |
| `runeborg.html` | `/runeborg` | Om Runeborg: historien, PISA-grundlaget, missionerne |
| `spil/runeborg/` | `/spil/runeborg/` | Selve Runeborg — skrevet direkte her, ingen bygning |
| `login.html` | `/login` | Log ind: elev med sin egen kode, voksen med mail og kodeord, glemt kodeord |
| `opret.html` | `/opret` | Opret testkonto som skole eller familie |
| `konto.html` | `/konto` | Den voksnes side: klasser, elever, koder og spilletid |
| `login-kort.html` | `/login-kort?g=<id>` | Login-kort til udskrift, ét pr. elev |
| `admin.html` | `/admin` | Overblikket over alle testbrugere (kun administrator) |
| `statistik.html` | `/statistik` | Besøgsstatistik: kilder, landingssider, vejen rundt (kun administrator) |
| `api/` | — | PHP bag login-systemet. Se "Login og testkonti" |

## Runeborg

8-bit fantasyspil for 5.-9. klasse, skrevet i ren JavaScript uden
biblioteker og uden bygning: filerne i `spil/runeborg/` **er** spillet.
Retter man i dem, er det bare at uploade. Tæl `?v=` op i
`spil/runeborg/index.html`, når en `.js`- eller `.css`-fil er lavet om.

Indholdet er valgt ud fra de områder, hvor danske elever klarede sig
dårligst i PISA 2025 (offentliggjort 8. september 2026): læsning (finde
information, fakta/holdning, kildekritik), naturfag (planlægge undersøgelser
og især fortolke data og evidens) og hverdagsmatematik (forhold, procent,
målestok). Computationel problemløsning er udeladt — der lå danske elever
over OECD-gennemsnittet. Kilderne står nederst i PISA-afsnittet på
`/runeborg`.

| Fil | Hvad |
|---|---|
| `js/content.js` | **Alt indhold**: personer, missioner, opgaver, spor, evner, runestykker. Her retter man tekster og opgaver |
| `js/world.js` | Kortene, bygget med små hjælpefunktioner (hus, gade, å) |
| `js/art.js` | Al grafik, tegnet i kode — ingen billedfiler |
| `js/game.js` | Motoren: bevægelse, samtaler, døre, gemning, lys og stemning, joystick |
| `js/ui.js` | Dialog, opgavetyper, dagbogen, menu, skærmtastatur, grafer |
| `js/audio.js` | Lyd og musik, lavet med WebAudio i browseren |
| `js/voice.js` | Oplæsning af replikker: indtalte filer i `lyd/`, ellers browserens danske stemme |

**Missionerne bygger på hinanden.** Hver mission giver en evne og spor i
dagbogen, og senere missioner bruger dem — fx er de spor, man fremlægger for
borgmesteren, præcis dem, der står i spillerens dagbog. Tilføjer man en
mission, skal den have `requires` og gerne `uses` (vises i dagbogen).

**Spillet sender spilletid og det gemte eventyr** (se "Gemte spil").
Eventyret gemmes i `localStorage` (`runeborg-v1[-elev.<id>]` og
`runeborg-indstillinger`) og, når man er logget ind, også på serveren via
`js/gem.js`. Der er intet `resultat.php`-kald. Skal det ændres, skal
`/privatliv#gemte-spil` rettes samtidig.

**Berøringsskærme:** joystick, E-knap og skærmtastatur (QWERTY med æøå til
navnet, taltastatur til regneopgaver) dukker op ved første berøring og
gemmer sig efter 5 sekunders stilhed.

**Oplæsning:** alle replikker (og opgavernes spørgsmål) er læst ind på
forhånd med Piper — lokal, open source talesyntese med den danske stemme
`da_DK-talesyntese-medium` — og ligger som `spil/runeborg/lyd/<nøgle>.mp3`
med listen `lyd/stemmer.json`. Hver person har sin egen klang (tonehøjde og
tempo i `PROFIL` øverst i værktøjet). **Retter man en replik, skal lyden
laves igen**, ellers er den replik tavs (eller læses af browserens egen
danske stemme, hvis den har en):

```bash
python tools/runeborg-stemmer.py
```

Kun nye og ændrede replikker bliver indtalt, og overflødige filer slettes.
Spillerens navn kan ikke indtales på forhånd og læses derfor som "lærling".
Kræver `pip install piper-tts`, stemmen (`python -m piper.download_voices
da_DK-talesyntese-medium`, lægges i `%LOCALAPPDATA%/piper-voices`) og
ffmpeg. Nøglen er en hash af person + renset tekst, så `clean()` og `fnv()`
i værktøjet skal svare præcis til dem i `js/voice.js`.

**Test fra konsollen:** `RB.debug.tp('by', 24, 20)` teleporterer,
`RB.debug.S` er hele tilstanden.

**Nye skærmbilleder til siden:** `python tools/runeborg-billeder.py`
starter den lokale server, åbner spillet i en usynlig Chrome med
`#foto=<scene>` og gemmer `assets/billeder/runeborg-*.png`. Fototilstanden
gemmer intet.

## Regnehelten

Matematikspil for 1.-6. klasse. Det var oprindeligt skrevet i Python
(pygame) og kørte i browseren som WebAssembly. I oktober 2026 blev det bygget
om, så det er **bygget og spilles præcis som Runeborg**: samme motor, samme
styring (piletaster/WASD eller joystick, `E`, `B` for Dagbogen, `Esc`), samme
vinduer, skrift, gemning og oplæsning. Filerne i `spil/regnehelten/` **er**
spillet — ingen bygning. Tæl `?v=` op i `spil/regnehelten/index.html`, når en
`.js`- eller `.css`-fil er lavet om. Python-udgaven ligger stadig i
`Claude/Projects/matematik-eventyr`, men er ikke længere den, siden kører.

| Fil | Hvad |
|---|---|
| `js/opgaver.js` | **Matematikken**: klassetrinnene (Fælles Mål), regneloftet og de tolv opgavesæt. Oversat linje for linje fra `content.py` i Python-udgaven |
| `js/content.js` | Historien: personer, missioner, opgavesættenes replikker, Regnebogens sider, tingene i tasken |
| `js/world.js` | Kvarteret (hjem, supermarked, kiosk, bibliotek, skole, park) og de fem rum |
| `js/art.js` | Grafikken — et dansk kvarter i oktober, tegnet i kode som Runeborgs |
| `js/game.js` | Motoren (Runeborgs) plus opgavesæt, belønninger og pausespil |
| `js/ui.js` | Dialog, de otte måder at svare på, Dagbogen (missioner, Regnebogen, tasken), Klæd om og Straffespark |
| `js/audio.js` | De samme rolige temaer som i Python-udgaven, spillet på Runeborgs bløde klang |
| `js/voice.js`, `js/gem.js` | Som i Runeborg |
| `js/resultat.js` | Sender resultatet til `resultat.php` i samme format som før |

**Klassetrinnene skal holde.** Efter enhver ændring i `js/opgaver.js`:

```bash
python tools/regnehelten-tjek.py
```

Den laver ca. 88.000 opgaver i en usynlig Chrome og måler hver eneste mod
trinnenes regler (de samme som `tjek_klassetrin.py` i Python-udgaven:
regningsarter, talområde, regneloft, fortegn) — og tjekker, at alle
byg-selv-opgaver kan løses, og at hvert facit bliver godkendt.

**Oplæsning:** `python tools/regnehelten-stemmer.py`, som i Runeborg.
Opgaverne bliver lavet på stedet med nye tal hver gang, så de kan ikke
indtales på forhånd; dem læser enhedens egen danske stemme op, hvis den har
en (fx iPad). Ellers vises knappen "Læs op" ikke ved opgaven.

**Gemte spil:** `regnehelten-v2[-elev.<id>]`, `regnehelten-synk-<id>` og
`regnehelten-indstillinger` i `localStorage` og serveren via `js/gem.js`.
Et spil gemt med Python-udgaven bliver læst og ført over
(`fraFoersteUdgave()` i game.js): navn, klassetrin, udseende, hvor langt man
nåede, Regnekraft, tasken og omgangens resultater. `gemt_status()` i
`api/_kerne.php` kender begge formater.

**Test fra konsollen:** `RH.debug.tp('by', 52, 10)` teleporterer,
`RH.debug.S` er hele tilstanden. **Skærmbilleder:**
`python tools/regnehelten-billeder.py` → `assets/billeder/regnehelten-*.png`
(fototilstanden `#foto=<scene>`).

## Udseende

Siden har ét stilark, `assets/style.css`, skrevet i hånden. Farverne er
papir og blæk med en varm orange til knapper og links — de samme toner som
i spillet, så rammen om Regnehelten ligner det, der kører indeni.

Skriften er **Fraunces** til overskrifter og **Inter** til brødtekst.
De ligger på vores eget webhotel i `assets/skrifter/` (Runeborgs Atkinson
Hyperlegible og Pixelify Sans ligger samme sted) og bliver linket med
`/assets/skrifter/site.css` eller `runeborg.css`. **Link aldrig direkte til
fonts.googleapis.com igen**: så sender hver besøgendes browser sin IP til
Google uden samtykke, og det er set som et GDPR-brud. Skal der flere vægte
med, så ret `tools/hent-skrifter.py` og kør den.

Der lå på et tidspunkt et større designsystem henover siden med `tokens.css`
og `components.css` i et mørkt tema. Det blev rullet tilbage igen, fordi det
lyse udtryk klæder spillet bedre. Vil man se på det, ligger det i historikken
under `Laeg designsystemet Learnification ned over hele siden`.

## Den gamle tilmeldingsport (afløst af login)

**Porten er fjernet fra `/spil/` og afløst af login-systemet nedenfor.**
`tilmeld.php` og de gamle tilmeldinger i `tilmeldinger.csv` ligger der
stadig, men ingen side sender til den længere. Resten af afsnittet
beskriver, hvordan den virkede.


Mens Regnehelten er til test, skal en voksen skrive **navn, mailadresse og
eventuelt mobilnummer**, før spillet kan gå i gang. Porten er en dialog, der
lægger sig over `/spil/`, og den er stilet til den voksne — ikke til barnet,
der sidder ved skærmen. Den samme formular ligger også som en almindelig
tilmelding nederst på `/for-voksne`.

**Sådan slukkes porten, når testen er slut:** i `spil/index.html` står

```js
var KRAEV_TILMELDING = true;
```

Sæt den til `false`. Så er porten væk, og spillet starter som før. Resten —
formularen på `/for-voksne`, `tilmeld.php`, listen — bliver ved med at virke.

Porten spørger kun én gang pr. browser: efter en tilmelding står der
`lf-tester` i `localStorage`, og så kommer den ikke igen. Den er lavet i
JavaScript og er ikke en lås — den, der vil, kan komme uden om den. Den er
til at samle testere, ikke til at beskytte noget.

`tilmeld.php` tager imod og gemmer **kun** tidspunkt, navn, mailadresse,
mobilnummer og hvilken side tilmeldingen kom fra. Ingen IP-adresser, ingen
cookies, ingen tredjeparter. Der ryger også en mail til adressen øverst i
filen, så listen findes to steder.

**Hvor listen ligger.** Helst i `learnification-data/tilmeldinger.csv` én
mappe **over** `public_html`, hvor den ikke kan hentes ned fra nettet. Kan
PHP ikke skrive der, ryger den i `public_html/data/` i stedet, og den mappe
er spærret af sin egen `.htaccess`. Hvilken af de to der blev brugt, står i
beskeden, du får på mail.

**Kolonnerne står i `KOLONNER` øverst i `tilmeld.php`.** Laves de om, bliver
den gamle fil automatisk lagt til side som `tilmeldinger-tidligere-<dato>.csv`,
og der bliver startet en ny. Så bliver to formater aldrig blandet sammen, og
ingenting går tabt.

**Sådan får du fat i listen:** File Manager i Simply.coms kontrolpanel, eller
FTP. Filen er almindelig CSV og kan åbnes i Excel eller Numbers.

**Sletning.** Beder nogen om at blive slettet, fjerner du linjen i CSV-filen.
Der er ikke andre steder, oplysningerne ligger.

**Teksten om privatliv på `/for-voksne` skal passe.** Der står, hvad vi beder
den voksne om, hvad det bruges til, og at spørgsmålet falder væk, når testen
er slut. Laves opsamlingen om — en tredjepartstjeneste, flere felter, andre
formål — skal den tekst rettes samtidig.

## Login og testkonti

Mens spillene er til test, skal man være logget ind for at spille. Det
giver et overblik over, hvem der tester, og hvor meget de spiller.

**Hvem logger ind hvordan**

- **Den voksne** opretter en konto på `/opret` med navn, mail og kodeord og
  logger ind på `/login` (mail og kodeord er det første, man ser dér; børnenes
  kode-login står i en mindre boks under, og `/login#elev` går direkte til den).
- **Alle konti starter som "til mig selv"** (`konti.type = 'privat'`): den
  voksne spiller selv og har sin egen prøvetid. Kontoen er til
  folk, der er fyldt 15 år (det står på /opret og /login, og man bekræfter det i det påkrævede
  flueben på /opret); yngre sættes på
  af en voksen som barn med kode. Skal der børn på, vælger man
  det bagefter under `/konto` → "Skal andre også spille?" (`skift_type` i
  `api/konto.php`): **Familie** får én gruppe, "Familien", og børnenes navne;
  **Skole** får skolens navn (den voksne bliver kontaktperson) og laver så
  klasser (fx 4.B) med elevernes fornavne. `/opret?type=skole` (eller
  `familie`) åbner det rigtige valg på `/konto` lige efter oprettelsen.
  Det går kun den vej — vil man tilbage, gør administratoren det.
- **Hvert barn** får sin egen **kode** som `RAVN-4827` (dyr + fire cifre),
  går ind på `/login` og skriver den — så er det inde. Der er ingen navne at
  trykke på, så et barn kan ikke komme ind som en klassekammerat. Ingen mail
  og intet kodeord til børn. Små bogstaver, mellemrum og manglende bindestreg
  er ligegyldige. Koden står i tabellen under `/konto` og på login-kortene;
  "Ny kode" ud for barnet laver en ny og logger barnet ud.
- Grupperne har stadig en klassekode (`UGLE-472`) i databasen, men den
  bruges ikke til login længere. Skriver et barn en gammel klassekode, får
  det besked om at spørge efter sit nye login-kort.
- Nye konti kan bruges med det samme, står som **Ny** i overblikket og kan
  godkendes eller spærres derfra. En spærret konto og alle dens elever bliver
  logget ud med det samme.
- **Administratoren kan oprette og rette konti** i `/admin`: "Opret konto"
  (`#ny-konto`) laver en godkendt konto af enhver type (med påkrævet flueben
  for, at personen er fyldt 15 år) — med et kodeord, eller
  uden, så får personen en mail med et link til selv at vælge et (7 dage).
  Under en konto: ret navn, mail, by, type og status (skiftes typen, skal
  15-års-fluebenet sættes igen); sæt et nyt kodeord eller
  send et link (24 timer); slet kontoen (mailadressen skal skrives som
  bekræftelse); og sæt børn og klasser på, omdøb, giv ny kode og slet — det
  går gennem `api/klasse.php` med `"konto": <id>`, som kun en administrator
  må sende. Administratorkonti kan ikke rettes herfra.

**Spilletid** bliver målt af `assets/spilletid.js` på begge spillersider. Et
sekund tæller, når spillet er fremme på skærmen, og nogen har rørt tastatur, mus
eller skærm inden for to minutter. Tiden sendes til `api/spilletid.php` hvert
halve minut og med `sendBeacon`, når fanen lukkes. Serveren lægger aldrig
mere tid til, end der faktisk er gået siden sidste puls (højst 90 sek. ad
gangen), og en pause på over en halv time starter en ny "omgang".

**Sådan slukkes login-kravet**, når testen er slut: sæt
`var KRAEV_LOGIN = true;` til `false` i både `spil/regnehelten/index.html`
og `spil/runeborg/index.html`. Så kan alle spille, og tiden bliver stadig talt
for dem, der er logget ind. Login-kravet er lavet i JavaScript og er ikke en
lås — spilfilerne kan hentes direkte. Skal spillene en dag bag betaling, skal
de leveres gennem PHP i stedet.

**Runeborg gemmer hvert barns eventyr for sig.** Nøglen i `localStorage` er
`runeborg-v1-elev.<id>`, når et barn er logget ind (id'et læses fra cookien
`lf_in`), ellers `runeborg-v1` som før. Så spiller en klasse, der deler
computere, ikke videre i hinandens eventyr. Menuen i Runeborg har "Log ud".

### Første gang på Simply.com: opret administratoren

1. Læg siden op som altid (push til `main`).
2. Åbn `learnification.dk/admin`. Siden skriver en nøgle i
   `opsaetningsnoegle.txt` i datamappen — `learnification-data/` ved siden af
   `public_html`, eller `public_html/data/`, hvis PHP ikke må skrive der.
   Siden fortæller hvilken.
3. Hent nøglen med File Manager i kontrolpanelet, skriv den på siden sammen
   med navn, mail og kodeord (mindst 10 tegn). Filen slettes, og opsætningen
   lukker. Der kan kun oprettes én administrator på den måde.

Administratorens egen spilletid tæller ikke med i overblikket.

### Hvor data ligger

Alt ligger i SQLite-filen `learnification.sqlite` i datamappen (samme mappe
som `tilmeldinger.csv`). Den opretter sig selv. Ved siden af ligger
`hemmelighed.txt` (bruges til at hashe IP-adresser i gætte-bremsen) —
**slet ikke de to filer**, og tag gerne en kopi af databasen med File Manager
en gang imellem.

Har webhotellet ikke SQLite slået til (så siger `/admin` det), kan MySQL fra
kontrolpanelet bruges i stedet: læg en `database.php` i datamappen — se
kommentaren øverst i `api/_kerne.php`. Den fil må aldrig i repoet.

Tabellerne står i `opret_tabeller()` i `api/_kerne.php`. Skal de ændres,
tilføjes et nyt trin nederst i `$trin`, så eksisterende databaser bliver
løftet op af sig selv.

**Hvad der gemmes** (og står på `/for-voksne#data` — ret teksten der, hvis
det ændres): den voksnes navn, skolens navn, by, mail og kodeordet som hash;
børnenes kaldenavn, login-kode, gruppe og spilletid pr. spil og dag. IP-adresser kun som
HMAC-hash i højst en time til gætte-bremsen. Én login-cookie `lf_session`
(tilfældig nøgle, kun dens SHA-256 står i databasen) og en harmløs
`lf_in=elev.<id>`, som siderne bruger til at vide, at nogen er logget ind.

**Sletning:** den voksne kan selv slette børn og hele kontoen under
`/konto`. Slettes et barn, bliver dets spilletid stående på kontoen uden navn,
så tallene i overblikket ikke hopper. Slettes kontoen, forsvinder alt.

**Sikkerhed, kort:** kodeord med `password_hash`; alt, der ændrer noget,
kræver headeren `X-LF: 1` (en fremmed side kan ikke sætte den); `api/_*.php`
og `data/` er spærret; forkerte elevkoder bremses til 30 pr. kvarter pr.
adresse (rigtige tæller ikke, så en hel klasse bag én IP kan logge ind), login til 8 pr. kvarter pr. mail. Glemt kodeord sender et link med
`mail()` til den voksne, gyldigt i en time.

### API

| Fil | Handlinger |
|---|---|
| `api/konto.php` | `mig`, `opret`, `login`, `logud`, `glemt`, `nulstil`, `skift_kodeord`, `ret`, `slet_konto` |
| `api/klasse.php` | `oversigt`, `ny_gruppe`, `ret_gruppe`, `slet_gruppe`, `nye_elever`, `ret_elev`, `ny_elevkode`, `slet_elev` |
| `api/elev.php` | `login` |
| `api/spilletid.php` | `puls` |
| `api/admin.php` | `status`, `opsaet`, `overblik`, `konto`, `saet_status`, `ny_konto`, `ret_konto`, `kodeord`, `slet_konto`, `eksport` (CSV til Excel) |

### Test lokalt med PHP

Der er ingen PHP installeret på maskinen som standard. Med en portabel PHP
(zip fra windows.php.net, `extension=pdo_sqlite` slået til i `php.ini`):

```bash
php -S 127.0.0.1:8792 tools/lokal-router.php
```

fra projektets rodmappe. Routeren opfører sig som `.htaccess` og lægger
databasen i systemets midlertidige mappe, så testdata aldrig havner i repoet.

## Resultater fra testomgangene

Mens spillet er til test, sender det hjem, hvad spilleren nåede at løse.
`resultat.php` tager imod og skriver to steder, ved siden af tilmeldingerne:

| Fil | Hvad |
|---|---|
| `resultater.csv` | Én linje pr. omgang — navn, klassetrin, opgaver, hvor mange i første forsøg, procent, regnekraft, minutter, hvor langt de nåede, og om spillet blev spillet færdigt |
| `resultater/<id>.json` | Hele omgangen, opgave for opgave: spørgsmål, emne, facit, antal forsøg |

**Hvornår der bliver sendt.** Spillet sender efter hver opgave (højst hvert
8. sekund), når et opgavesæt er færdigt, når spillet er slut, og når fanen
bliver lukket eller skjult — med `navigator.sendBeacon`, som netop
overlever, at siden forsvinder (`js/resultat.js`). Omgangen ligger i det
gemte spil, så en omgang, der fortsættes på en anden skærm, er den samme.

Den samme omgang melder sig altså flere gange. Den bliver kendt på sit id
og **opdateret** i CSV-filen, ikke lagt til igen. Der kommer kun mail, når
en omgang er spillet helt færdig — ellers ville det blive en strøm af mails
om den samme omgang.

**Det er et barns oplysninger.** Fornavnet kommer fra det, barnet skrev i
spillet. Filerne hører derfor til uden for `public_html` sammen med
tilmeldingerne, og teksten på `/for-voksne` fortæller præcis, hvad der
bliver sendt, og at det slettes, når testen er slut. Ændres der på, hvad
spillet sender, **skal den tekst rettes samtidig** — den er et løfte.

**Sådan slukkes det igen:** når testen er slut, slettes
`RH.resultat.send(...)`-kaldene i `spil/regnehelten/js/game.js`. Så sender
spillet ikke noget som helst.

## Læg siden op på Simply.com

Webroden hedder `public_html`. Indholdet af **denne mappe** skal ligge
direkte derinde — ikke i en undermappe.

**Første gang (FTP):** FTP-oplysningerne står i oprettelsesmailen fra
Simply.com, og der er kun én FTP-konto pr. webhotel. Med FileZilla: værtsnavn
`ftp.simply.com`, og træk hele indholdet over i `public_html`.

**Små rettelser:** File Manager i Simply.coms kontrolpanel er hurtigere end
at fyre en FTP-klient op.

**Husk `.htaccess`.** Filer der starter med punktum er skjulte som
udgangspunkt — i FileZilla skal "Vis skjulte filer" slås til under
Server-menuen, ellers bliver den ikke uploadet, og så virker hverken de pæne
adresser eller spillet.

### Efter upload — tjek de fem her

1. `learnification.dk` viser forsiden
2. `learnification.dk/regnehelten` virker (uden `.html` bagefter)
3. `learnification.dk/spil/` — tryk **Spil**, og spillet starter
4. `learnification.dk/findes-ikke` giver 404-siden, ikke Apaches egen
5. Hængelåsen i adresselinjen er der

Får du **500 Internal Server Error**, er det så godt som altid én linje i
`.htaccess`, som netop den server ikke kender. Sæt `#` foran den i stedet
for at slette hele filen — `Options -Indexes` og `RemoveEncoding` er de
sædvanlige syndere.

### SSL

Simply.com udsteder selv et Let's Encrypt-certifikat kort efter, domænet er
oprettet. **Vent med at uploade `.htaccess`, til certifikatet er aktivt** —
eller kommentér de to `RewriteRule`-linjer under "HTTPS" ud indtil videre.
Ellers bliver de første besøgende sendt over på https, før der er noget
gyldigt certifikat at møde dem med.

### DNS

Bruger du Simply.coms eget webhotel, peger domænet allerede på deres
servere, og der skal ikke røres ved DNS.

## Nyheder

`/nyheder` fortæller forældre og lærere, hvad der er kommet til: nye spil,
nye kapitler, forbedringer og ændringer i, hvad der bliver gemt. Hver gang
noget, en besøgende kan mærke, går live, skal der en nyhed med — også når
ændringen er lavet af Claude (se `CLAUDE.md`).

Nyhederne står i `tools/nyheder.json` (nyeste øverst; `id`, `dato`,
`maerke`, `titel`, `tekst` som afsnit med lidt HTML, og frivilligt `kort`,
`billede` og `link`). Ret der og kør

```
python tools/nyheder.py
```

som skriver listen ind i `nyheder.html`, de tre nyeste i "Seneste nyt" på
forsiden (mellem `<!-- SENESTE-NYT:START/SLUT -->`), RSS-feedet
`nyheder.xml` og datoen i `sitemap.xml`. Commit det hele sammen med selve
ændringen. Skriv til en voksen, der ikke kender koden: hvad er nyt, og hvad
betyder det for barnet eller klassen — ikke filnavne eller tekniske detaljer.

## Sådan bliver spillene opdateret

Begge spil ligger direkte i repoet: ret filerne, tæl `?v=` op i spillets
`index.html`, og skub til `main`. Alt under `/spil/` bliver leveret med
`Cache-Control: no-cache` (afsnit 6 i `.htaccess`), så browseren spørger
serveren, om en fil er lavet om — og `?v=` sørger for, at en ny `.js`-fil
aldrig blandes med en gammel.

## Ting man skal vide, før man laver om

**`/spil/` er en mappe, ikke `spil.html`.** Det er med vilje. Ligger der
både en fil `spil.html` og en mappe `spil/`, sender Apache folk i ring.
`spil/index.html` sender videre til `/spil/regnehelten/` — den skal blive
liggende, for gamle links og QR-koder på tryksager peger på `/spil/`.

**Retter du `style.css` eller `script.js`, så tæl `?v=` op.** Begge filer
ligger en måned i de besøgendes browser, og uden et nyt tal i adressen får
de, der har været her før, den gamle udgave. Tallet står i `<head>` på alle
sider — de skal følges ad.

## Afhængigheder udefra

Ingen. Begge spil, skrifterne og oplæsningen ligger på vores eget webhotel.
(Indtil oktober 2026 hentede Regnehelten sin Python-motor fra
`pygame-web.github.io` hos GitHub; reglerne for `.tar.gz` i `.htaccess` er
fra dengang og gør ingen skade.)

## Cookies og privatliv

**Cookie-banneret** (`assets/samtykke.js`, siden 2026-09-28) spørger kun om
det, der ikke er nødvendigt. Tre kategorier:

- **Nødvendige** — `lf_session`, `lf_in` (login) og `lf_samtykke` (selve
  valget, 12 måneder). Altid tændt; undtaget fra samtykkekravet (ePrivacy
  art. 5, stk. 3).
- **Statistik** — `lf_bes`, et tilfældigt id i 12 måneder, som `besoeg.js`
  sender med, så `/statistik` kan se tilbagevendende besøgende og give en
  konvertering til den FØRSTE kilde/kampagne, vi så for id'et.
- **Markedsføring** — Meta Pixel, Google (gtag) og LinkedIn Insight. Slås til
  ved at skrive et id i `PIXELS` øverst i `samtykke.js`. Står der intet id,
  bliver kategorien slet ikke vist (man må ikke spørge om noget, der ikke
  bruges). Husk at tælle `VERSION` op, når der kommer en pixel til — så
  bliver alle spurgt igen — og at skrive den på `/privatliv#cookies`.

Reglerne, banneret er bygget efter (Datatilsynets cookievejledning): intet
før ja; "Afvis alle" lige så stor som "Tillad alle"; intet slået til på
forhånd; siden virker uden svar; "Cookie-indstillinger" i sidefoden på hver
side (sættes ind af scriptet), og et nej sletter de cookies, der er sat;
hvert valg logges som bevis i tabellen `samtykker` via `api/samtykke.php`
(uden IP, slettes efter 3 år); nyt spørgsmål efter 12 måneder. DNT/GPC
tæller som nej, og så vises banneret ikke.

**Børn får aldrig andet end det nødvendige.** `samtykke.js` er ikke med på
`/spil/*`, `/login` og `/login-kort`, og den svarer altid nej, når et barn
er logget ind (`lf_in = elev.*`). `api/besoeg.php` smider også `bid` væk på
de sider. Hold det sådan — børn under 13 kan ikke selv give samtykke.

Runeborgs oplæsning bruger kun stemmer, der kører på enheden
(`localService`), fordi Chromes "Google Dansk" sender teksten til Google.

**Besøgsstatistikken er vores egen** (`assets/besoeg.js` → `api/besoeg.php`
→ tabellerne `besoeg` og `maal`, vist på `/statistik`). Grundtallene kører
uden samtykke, og det holder kun, så længe disse ting er sande for dem, der
IKKE har sagt ja:

- ingen cookies og intet i `localStorage` — heller ikke "bare et id";
- IP-adressen gemmes aldrig; besøgskoden er en HMAC af IP + browser med et
  salt i `besoegssalt.txt`, der skiftes ved datoskift og skrives over, så
  ingen kan følges fra dag til dag;
- kun sti, forrige egen side, henvisende værtsnavn (ikke hele adressen),
  `utm_campaign`, mobil ja/nej og mål; aldrig forespørgsler (`?token=`,
  `?g=`) — `besoeg.js` sender kun `pathname`;
- DNT og GPC respekteres (i både JS og PHP);
- tallene deles ikke med nogen og bruges kun samlet; linjer slettes efter
  400 dage.

**Mål (konverteringer)** tælles med `LFMaal('navn')` fra siderne:
`nyhedsbrev` (nyhedsbrev.js), `opret_konto` (opret.html),
`spil_regnehelten` og `spil_runeborg` (første tryk eller tast i hvert
spil). Nye navne skal også i `MAAL` i `api/besoeg.php`
og `MAALRAEKKE` i `statistik.html`. Har den besøgende sagt ja til
markedsføring, sendes målet også videre til pixels (`konvertering()` i
`samtykke.js`).

Tilføj `?ref=navn` eller `?utm_source=navn&utm_campaign=kampagne` på links i
opslag, annoncer, nyhedsbreve og visitkort, så dukker de op under "Kilder" og
"Kampagner". Ændres noget af ovenstående, skal `/privatliv` rettes.

## Nyhedsbrevet

Tilmelding på `/nyhedsbrev`, forsiden og `/for-voksne` (boksen er
`form[data-nyhedsbrev]` + `assets/nyhedsbrev.js/.css`) og som frivilligt
flueben på `/opret`. **Dobbelt tilmelding**: man får en mail med et link
(`/nyhedsbrev?bekraeft=<nøgle>`) og står først som aktiv, når man har
klikket. Ubekræftede slettes efter 30 dage. Samtykketeksten gemmes ved hver
tilmelding (`NYHEDSBREV_SAMTYKKE` i `api/_nyhedsbrev.php` — ændres den, så
ret datoen i teksten).

Listen ses under **/admin → Nyhedsbrev**; "Hent aktive som CSV" giver kun
dem, der må få mails, med et personligt afmeldingslink
(`/nyhedsbrev?afmeld=<nøgle>`), som SKAL med i hver mail (flet det ind fra
CSV'en i jeres mailprogram). Afmelding kræver et klik på en knap, så
mailprogrammer, der åbner links af sig selv, ikke afmelder folk.

**Sende nyhedsbreve** gøres samme sted: vælg modtagere (alle aktive,
forældre, lærere eller andet), skriv emne og tekst, forhåndsvis, send en test
til dig selv, og send. Hver mail er personlig ("Hej Anna,"), kommer som både
tekst og HTML og har afmeldingslink, `List-Unsubscribe` og afsenderens
CVR/adresse i bunden; svar går til `kontakt@learnification.dk`. Links til
learnification.dk får `utm_source=nyhedsbrev&utm_campaign=nyhedsbrev-<dato>`,
så /statistik viser, hvad hvert brev fører til. Siden sender 25 ad gangen
(`api/nyhedsbrev.php?handling=send`), til der ikke er flere; hvem der har fået
den, står i `udsendelse_modtagere` (DB v6), så en afbrudt udsendelse kan
sendes færdig fra historikken, uden at nogen får den to gange. Lokalt havner
mailene i `post.txt` i datamappen (`LF_POSTKASSE`).

## Velkomstmailen

`api/_velkomst.php`: "sådan kommer I i gang" + en Log ind-knap til den voksne
på en konto. Går af sig selv ved oprettelse (`api/konto.php`), og under
**/admin → Velkomstmail** kan den sendes til alle, der ikke har fået den, eller
kun til dem, hvor ingen har spillet — plus til én konto ad gangen (også igen).
Teksten tilpasser sig: skole/familie, ingen elever endnu / elever, der ikke har
spillet / X af Y har spillet. `konti.velkomst_sendt` (DB v7) husker, hvem der
har fået den; spærrede konti og administratoren får den aldrig. Links får
`utm_source=velkomstmail`. Det er en **servicemail** om deres egen konto
(de sagde ja til, at vi må skrive om testen) — kommer der tilbud eller reklame
i den, er den markedsføring og må kun gå til nyhedsbrevets aktive.

**Påmindelsen** (også `_velkomst.php`): én mail til konti, hvor intet barn
har spillet 3 dage efter oprettelsen (højst 30 dage gamle), kun kl. 9-19 og
kun én gang pr. konto — det lover mailen. Den sendes af
`api/paamind.php?noegle=<nøgle>`, som **Simply.coms cronjob** åbner hver time
(Kontrolpanel → Website → Cronjobs; adressen med nøglen står på
/admin → Velkomstmail, nøglen i `cron-noegle.txt` i datamappen). Siden viser,
hvornår cronjobbet sidst kaldte (`paamindelse-status.json`), og advarer, hvis
det er mere end 3 timer siden. `konti.paamindelse_sendt` / `paamindelse_fejl`
(DB v8): en fejlet mail bliver prøvet igen ved de næste kørsler, højst 3 gange.

## Mails fra siden

DNS for learnification.dk er Simply.coms standard og skal ikke røres:
SPF `v=spf1 include:spf.simply.com -all`, DKIM som CNAME'erne
`simplycom1._domainkey → dkim1.simply.com` og `simplycom2._domainkey →
dkim2.simply.com`, og DMARC `_dmarc → dmarc.simply.com` med **p=reject**.

Netop p=reject gør, at mails fra PHP's `mail()` bliver afvist mange steder:
de bliver ikke DKIM-signeret. Kun mails gennem **websmtp.simply.com** (port
587, STARTTLS, login med en postkasse på domænet) bliver signeret. Derfor
sender `send_mail()` i `api/_kerne.php` gennem SMTP (`api/_post.php`), når der
ligger en fil `smtp.php` i datamappen `learnification-data/` (ved siden af
public_html — ALDRIG i repoet):

    <?php return ['bruger' => 'no-reply@learnification.dk', 'kode' => '...'];

Postkassen oprettes under Mail i Simply.coms kontrolpanel. Mangler filen,
bruges `mail()` som før, og /admin → Nyhedsbrev viser en rød advarsel. Går
noget galt, står mailserverens svar i fejlbeskeden ved "Send en test til mig".
Et forkert kodeord bliver kun prøvet én gang pr. forespørgsel, så postkassen
ikke bliver spærret. (De gamle `tilmeld.php` og `resultat.php` bruger stadig
`mail()` til beskeder til kontakt@.)

## Gemte spil

Begge spil gemmer på serveren, når man er logget ind, så man kan fortsætte
på en anden enhed. **Runeborg** (`spil/runeborg/js/gem.js`, siden
2026-09-28): `save()` i game.js skriver som før til `localStorage` og giver
det samme videre til `RB.gem`, som sender det op efter 1,5 s (med det samme,
når fanen lukkes eller skjules). `runeborg-synk-<spiller>` husker udgaven og
om kopien nåede op; gamle eventyr, der kun lå i browseren, bliver sendt op
første gang, hvis serveren intet har. "Start forfra" gemmer
`{"slettet":true}` på serveren, så "Fortsæt" ikke kommer igen. Konflikt →
`UI.konflikt()` → det nyeste hentes, og siden genindlæses.

**Regnehelten** (`spil/regnehelten/js/gem.js`, siden 2026-10-05) gemmer
præcis som Runeborg — efter hver opgave, ved dørskift og når fanen lukkes
eller skjules. Et spil gemt med Python-udgaven (`gemning.py`) bliver ført
over første gang.

## Test lokalt som på Simply.com

`tools/lokal-server.py` opfører sig som Apache med denne `.htaccess` (pæne
adresser, mappe-index, rigtig filtype på `.tar.gz`). Almindelig
`python -m http.server` gør ikke, og så opdager man ikke fejlene før efter
upload:

```bash
python tools/lokal-server.py . 8790
```

Åbn så `http://127.0.0.1:8790/`.

## Udgivelse fra GitHub

`.github/workflows/deploy.yml` lægger siden op i `public_html` over FTPS,
hver gang der bliver skubbet til `main`. Den sender kun de filer, der er
lavet om.

Før første kørsel skal der ligge to hemmeligheder i repoet under
**Settings → Secrets and variables → Actions**:

| Navn | Værdi |
|---|---|
| `FTP_USERNAME` | FTP-brugernavnet fra Simply.com — det er domænenavnet |
| `FTP_PASSWORD` | FTP-adgangskoden til den samme konto |

**Navnet er kun en etiket.** Det skal staves præcis som i tabellen, for det
er dét, `deploy.yml` slår op i, og GitHub tillader kun bogstaver, tal og
understreg dér — derfor kan brugernavnet ikke stå i navnefeltet. Selve
oplysningen hører hjemme i den store **Secret**-boks nedenunder. Skriver
man dem omvendt, fejler kørslen med `Input required and not supplied:
username`, og intet bliver lagt op.

Oplysningerne findes i Simply.coms kontrolpanel under FTP. De må **aldrig**
skrives ind i denne fil — repoet er offentligt.

Vil serveren ikke tale FTPS, så skift `protocol: ftps` til `ftp` i
workflow-filen — men så sendes adgangskoden ukrypteret.

Begge spil ligger direkte i repoet — der er ingen bygning og intet at
hente fra andre projekter.
