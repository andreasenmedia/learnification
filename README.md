# Learnification.dk

Statisk hjemmeside for Learnification — danske læringsspil til børn. Første
spil er **Regnehelten**, som kan spilles direkte i browseren.

Hostes på **Simply.com** (Apache-webhotel). Alt ligger i `public_html`.

## Sider

| Fil | URL | Hvad |
|---|---|---|
| `index.html` | `/` | Forside: hvad Learnification er, spilkort, skærmbilleder |
| `regnehelten.html` | `/regnehelten` | Om spillet: steder, opgavetyper, Regnebogen, Regnekraft |
| `spil/index.html` | `/spil/` | Selve spilleren — spillet i en ramme med tastaturhjælp |
| `for-voksne.html` | `/for-voksne` | Forældre og lærere: hvad barnet øver, data, FAQ |
| `om.html` | `/om` | Om Learnification |
| `404.html` | — | Vises ved forkert adresse |
| `tilmeld.php` | — | Tager imod tilmeldinger til spørgeskemaet |
| `resultat.php` | — | Tager imod resultater fra testomgangene |
| `.htaccess` | — | Serveropsætning. **Læs den, før du retter i strukturen** |
| `spil/regnehelten/` | — | Spilpakken fra pygbag. **Overskrives ved hver bygning** |
| `runeborg.html` | `/runeborg` | Om Runeborg: historien, PISA-grundlaget, missionerne |
| `spil/runeborg/` | `/spil/runeborg/` | Selve Runeborg — skrevet direkte her, ingen bygning |
| `login.html` | `/login` | Log ind: elev med klassekode, voksen med mail og kodeord, glemt kodeord |
| `opret.html` | `/opret` | Opret testkonto som skole eller familie |
| `konto.html` | `/konto` | Den voksnes side: klasser, elever, koder og spilletid |
| `login-kort.html` | `/login-kort?g=<id>` | Login-kort til udskrift, ét pr. elev |
| `admin.html` | `/admin` | Overblikket over alle testbrugere (kun administrator) |
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

**Spillet sender kun spilletid** (se "Login og testkonti"). Eventyret
gemmes i browserens `localStorage` (`runeborg-v1[-elev.<id>]` og
`runeborg-indstillinger`), og der er intet `resultat.php`-kald. Skal det
ændres, skal teksten om privatliv på `/runeborg` rettes samtidig.

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

`assets/billeder/*.png` er rigtige skærmbilleder fra spillet, lavet af
`tools/screenshots.py` i spillets eget projekt.

## Udseende

Siden har ét stilark, `assets/style.css`, skrevet i hånden. Farverne er
papir og blæk med en varm orange til knapper og links — de samme toner som
i spillet, så rammen om Regnehelten ligner det, der kører indeni.

Skriften er **Fraunces** til overskrifter og **Inter** til brødtekst, begge
fra Google Fonts. Linket i `<head>` skal se ud, som det gør nu, på alle
sider, ellers skifter overskrifterne udseende midt i et klik.

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

- **Den voksne** (lærer eller forælder) opretter en konto på `/opret` med
  mail og kodeord og logger ind på `/login` under "Jeg er voksen".
- **En skole** laver klasser (fx 4.B) og skriver elevernes fornavne. **En
  familie** får én gruppe, "Familien", med det samme.
- Hver klasse/familie får en **kode** som `UGLE-472`. **Barnet** går ind på
  `/login`, skriver koden og trykker på sit navn og sit dyr. Ingen mail og
  intet kodeord til børn. Små bogstaver, mellemrum og manglende bindestreg
  er ligegyldige.
- Nye konti kan bruges med det samme, står som **Ny** i overblikket og kan
  godkendes eller spærres derfra. En spærret konto og alle dens elever bliver
  logget ud med det samme.

**Spilletid** bliver målt af `assets/spilletid.js` på begge spillersider. Et
sekund tæller, når spillet er fremme på skærmen, spillet er i gang (på
Regnehelten: efter der er trykket Spil), og nogen har rørt tastatur, mus
eller skærm inden for to minutter. Tiden sendes til `api/spilletid.php` hvert
halve minut og med `sendBeacon`, når fanen lukkes. Serveren lægger aldrig
mere tid til, end der faktisk er gået siden sidste puls (højst 90 sek. ad
gangen), og en pause på over en halv time starter en ny "omgang".

**Sådan slukkes login-kravet**, når testen er slut: sæt
`var KRAEV_LOGIN = true;` til `false` i både `spil/index.html` og
`spil/runeborg/index.html`. Så kan alle spille, og tiden bliver stadig talt
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
børnenes kaldenavn, gruppe og spilletid pr. spil og dag. IP-adresser kun som
HMAC-hash i højst en time til gætte-bremsen. Én login-cookie `lf_session`
(tilfældig nøgle, kun dens SHA-256 står i databasen) og en harmløs
`lf_in=elev.<id>`, som siderne bruger til at vide, at nogen er logget ind.

**Sletning:** den voksne kan selv slette børn og hele kontoen under
`/konto`. Slettes et barn, bliver dets spilletid stående på kontoen uden navn,
så tallene i overblikket ikke hopper. Slettes kontoen, forsvinder alt.

**Sikkerhed, kort:** kodeord med `password_hash`; alt, der ændrer noget,
kræver headeren `X-LF: 1` (en fremmed side kan ikke sætte den); `api/_*.php`
og `data/` er spærret; gæt på klassekoder bremses til 30 pr. kvarter pr.
adresse, login til 8 pr. kvarter pr. mail. Glemt kodeord sender et link med
`mail()` til den voksne, gyldigt i en time.

### API

| Fil | Handlinger |
|---|---|
| `api/konto.php` | `mig`, `opret`, `login`, `logud`, `glemt`, `nulstil`, `skift_kodeord`, `ret`, `slet_konto` |
| `api/klasse.php` | `oversigt`, `ny_gruppe`, `ret_gruppe`, `slet_gruppe`, `ny_kode`, `nye_elever`, `ret_elev`, `slet_elev` |
| `api/elev.php` | `kode`, `login` |
| `api/spilletid.php` | `puls` |
| `api/admin.php` | `status`, `opsaet`, `overblik`, `konto`, `saet_status`, `eksport` (CSV til Excel) |

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

**Hvornår der bliver sendt.** Spillet sender selv, hver gang en runde er
ovre, og når spillet er færdigt. Lukker nogen fanen midt i en opgave, når
Python ikke at gøre noget — derfor lægger spillet hele tiden den nyeste
udgave i sit `window.lfResultat`, og siden omkring spillet sender den med
`navigator.sendBeacon`, som netop overlever, at siden forsvinder.

Den samme omgang melder sig altså flere gange. Den bliver kendt på sit id
og **opdateret** i CSV-filen, ikke lagt til igen. Der kommer kun mail, når
en omgang er spillet helt færdig — ellers ville det blive en strøm af mails
om den samme omgang.

**Det er et barns oplysninger.** Fornavnet kommer fra det, barnet skrev i
spillet. Filerne hører derfor til uden for `public_html` sammen med
tilmeldingerne, og teksten på `/for-voksne` fortæller præcis, hvad der
bliver sendt, og at det slettes, når testen er slut. Ændres der på, hvad
spillet sender, **skal den tekst rettes samtidig** — den er et løfte.

**Sådan slukkes det igen:** når testen er slut, fjernes afsendelsen ved at
sætte `KRAEV_TILMELDING = false` i `spil/index.html` (så forsvinder porten)
og slette `resultat.send(...)`-kaldene i spillets `main.py`. Så kører
spillet igen uden at sende noget som helst.

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

## Sådan bliver spillet opdateret

Spillet ligger i `Claude/Projects/matematik-eventyr`:

```bash
cd ~/Claude/Projects/matematik-eventyr
python tools/build_web.py
cd ~/Claude/Projects/learnification
git rm spil/regnehelten/regnehelten.*.apk spil/regnehelten/regnehelten.*.tar.gz
cp ~/Claude/Projects/matematik-eventyr/build/web/* spil/regnehelten/
```

**Bemærk `git rm`-linjen.** Spilpakken hedder `regnehelten.<stempel>.tar.gz`,
hvor stemplet følger indholdet, så den hedder noget nyt, hver gang den er
lavet om. Den gamle bliver derfor ikke skrevet over af `cp` — den skal
fjernes, ellers ligger der to pakker og fylder. Bliver den fjernet i repoet,
sletter FTP-uploaden den også på serveren.

**Spilleren behøver ikke gøre noget for at få den nye udgave** — heller
ikke en hård genindlæsning. Der er to lag om det:

1. **Pakken skifter navn, når den skifter indhold.** En adresse, browseren
   aldrig har set før, kan ikke ligge gammel i dens lager. Det er `tools/build_web.py`
   i spillets projekt, der sætter stemplet på og skriver de to linjer om i
   `index.html`, hvor indlæseren henter pakken.
2. **Alt under `/spil/` bliver leveret med `Cache-Control: no-cache`**
   (afsnit 6 i `.htaccess`), så browseren spørger serveren hver gang, om
   `index.html` er lavet om — og det er dén fil, der peger på pakkens nye
   navn. Er der ikke noget nyt, svarer serveren `304` uden at sende noget.

Det første lag er dét, der virker; det andet er dét, der sørger for, at
det første bliver opdaget. Før begge dele lå spilpakken en time i Chromes
lager, uden at browseren overhovedet spurgte.

Nye skærmbilleder til hjemmesiden:

```bash
cd ~/Claude/Projects/matematik-eventyr
python tools/screenshots.py
cp build/billeder/*.png ~/Claude/Projects/learnification/assets/billeder/
```

## Ting man skal vide, før man laver om

**`/spil/` er en mappe, ikke `spil.html`.** Det er med vilje. Ligger der
både en fil `spil.html` og en mappe `spil/`, sender Apache folk i ring.
Derfor hedder spillersiden `spil/index.html`.

**Spillet skal hentes ind i rammen, før nogen klikker.** Browseren giver
først et spil lyd og tastatur, når brugeren har rørt ved siden, og den
tilstand gælder kun for rammer, der allerede findes på klikketidspunktet.
Derfor har `<iframe id="game">` sin `src` fra start, og startskærmen ligger
_oven på_ den. Laver man rammen først, når der trykkes "Spil", starter
spillet aldrig.

**Retter du `style.css` eller `script.js`, så tæl `?v=` op.** Begge filer
ligger en måned i de besøgendes browser, og uden et nyt tal i adressen får
de, der har været her før, den gamle udgave. Tallet står i `<head>` på alle
sider — de skal følges ad.

**`.tar.gz` må ikke leveres med `Content-Encoding: gzip`.** Spillet pakker
selv filen ud med Pythons `tarfile`. Pakker serveren den ud undervejs,
fejler spillet. `RemoveEncoding .gz` i `.htaccess` er dét, der forhindrer
det — fjern den ikke.

**Sæt aldrig `Cross-Origin-Embedder-Policy` på spilsiden.** Spillet henter
sin Python-motor fra `pygame-web.github.io`, og `require-corp` ville blokere
den hentning.

## Afhængigheder udefra

- **Google Fonts** (Fraunces + Inter) til hjemmesiden. Linket skal se ud,
  som det gør i `<head>` — begge vægtsæt skal med.
- **pygame-web.github.io** leverer Python-motoren til spillet (ca. 20-30 MB,
  som browseren gemmer efter første besøg). Går den ned, kan spillet ikke
  starte. Skal det undgås, kan motoren lægges på eget webhotel og pygbag
  køres med `--cdn https://learnification.dk/motor/`.

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

Spilpakken i `spil/regnehelten/` **er** med i repoet med vilje. Den bliver
bygget i spillets eget projekt, ikke her, så uden den er der ikke noget at
lægge op.
