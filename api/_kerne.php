<?php
/**
 * Kernen i login-systemet: database, login-cookies, svar og små hjælpere.
 *
 * Alle filerne i api/ starter med at hente den her. Selv kan den ikke
 * hentes udefra — api/.htaccess spærrer alt, der begynder med _.
 *
 * DATABASEN er en SQLite-fil i samme datamappe som tilmeldingerne:
 * helst learnification-data/ én mappe OVER public_html, ellers
 * public_html/data/, som er spærret af sin egen .htaccess. Der skal ikke
 * oprettes noget i kontrolpanelet — filen laver sig selv første gang.
 *
 * Har webhotellet ikke SQLite, kan der bruges MySQL i stedet: læg en fil
 * database.php i datamappen med
 *
 *   <?php return ['dsn' => 'mysql:host=...;dbname=...;charset=utf8mb4',
 *                 'bruger' => '...', 'kode' => '...'];
 *
 * Den fil må ALDRIG ligge i repoet — repoet er offentligt.
 *
 * HVEM ER LOGGET IND bliver husket med en tilfældig nøgle i cookien
 * lf_session. I databasen står kun nøglens SHA-256, så en stjålen
 * databasefil ikke kan bruges til at logge ind. PHP's egne sessioner er
 * valgt fra: på et delt webhotel rydder serveren dem op efter 24 minutter,
 * og så ville en klasse blive smidt ud midt i en lektion.
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Copenhagen');

const MODTAGER = 'kontakt@learnification.dk';   // får besked om nye konti
const AFSENDER = 'no-reply@learnification.dk';

// Så længe man er logget ind. Skolecomputere deles, så en elev på en skole
// bliver logget ud efter en skoledag; hjemme husker den en måned.
const VOKSEN_LEVETID = 30 * 86400;
const SKOLEELEV_LEVETID = 10 * 3600;
const HJEMMEBARN_LEVETID = 30 * 86400;

const SPIL = ['regnehelten' => 'Regnehelten', 'runeborg' => 'Runeborg'];

// Kontotyperne. "privat" er en voksen, der selv spiller; "foraelder" har børn
// på (gruppen "Familien"); "skole" har klasser. Administratoren er sin egen type.
// Sætter en privat konto børn på, bliver den til en familiekonto (api/klasse.php).
const KONTOTYPER = ['privat' => 'Til mig selv', 'foraelder' => 'Familie', 'skole' => 'Skole'];
const KAPITLER = 3;                  // kapitler pr. spil — "færdig" er det sidste

// Dyr til elevernes knapper. Hvert barn i en gruppe får sit eget.
const IKONER = ['🦊', '🐻', '🐼', '🐸', '🦉', '🐢', '🦄', '🐝', '🐬', '🦁', '🐯', '🐨',
                '🐰', '🐹', '🐧', '🐙', '🦋', '🐞', '🦔', '🐳', '🦒', '🐘', '🦜', '🐿️',
                '🦓', '🐴', '🐷', '🐮', '🐶', '🐱', '🦝', '🦦'];

// Koderne er et dyr + cifre: klassen har tre (UGLE-472), hvert barn har
// sit eget med fire (RAVN-4827). Ingen æ, ø og å, så de kan skrives på
// ethvert tastatur, og ingen ord, der ligner hinanden.
const KODEORD = ['UGLE', 'RAVN', 'ULV', 'HEST', 'KAT', 'HUND', 'LOS', 'ODDER', 'GRIS',
                 'GED', 'MUS', 'HARE', 'ELG', 'SPURV', 'KRAGE', 'TORSK', 'SILD', 'LAKS',
                 'HVAL', 'PANDA', 'TIGER', 'ZEBRA', 'KAMEL', 'KOALA', 'PINGVIN', 'DELFIN',
                 'SNEGL', 'MYRE', 'FASAN', 'STORK'];

// ---------------------------------------------------------------- svar

function svar(array $data, int $kode = 200): void
{
    http_response_code($kode);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fejl(string $besked, int $kode = 400): void
{
    svar(['ok' => false, 'besked' => $besked], $kode);
}

/** Det, der blev sendt: JSON i kroppen, ellers almindelige formularfelter. */
function input(): array
{
    static $data = null;
    if ($data !== null) {
        return $data;
    }
    $raa = file_get_contents('php://input') ?: '';
    if (strlen($raa) > 100000) {
        fejl('For meget på én gang.', 413);
    }
    $d = json_decode($raa, true);
    $data = is_array($d) ? $d : ($_POST ?: []);
    $data += $_GET;
    return $data;
}

function felt(string $navn, int $hoejst = 200): string
{
    $v = input()[$navn] ?? '';
    if (!is_scalar($v)) {
        return '';
    }
    $v = str_replace(["\r", "\n", "\t"], ' ', (string) $v);
    $v = preg_replace('/[\x00-\x1F\x7F]/u', '', $v) ?? '';
    $v = trim(preg_replace('/ {2,}/', ' ', $v) ?? '');
    return function_exists('mb_substr') ? mb_substr($v, 0, $hoejst, 'UTF-8') : substr($v, 0, $hoejst);
}

function tal(string $navn): int
{
    return (int) (input()[$navn] ?? 0);
}

function handling(): string
{
    return (string) (input()['handling'] ?? '');
}

/**
 * Alt, der ændrer noget, skal komme fra vores egne sider. En fremmed side
 * kan godt lave en formular, der sender hertil, men den kan ikke sætte en
 * egen header uden at browseren spørger først — og det svarer vi nej til.
 */
function kraev_egen_side(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        fejl('Det skal sendes, ikke hentes.', 405);
    }
    if (($_SERVER['HTTP_X_LF'] ?? '') !== '1') {
        fejl('Forespørgslen kom ikke fra siden.', 403);
    }
}

function lille(string $s): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

function laengde(string $s): int
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}

// ---------------------------------------------------------------- mappen

/** Find en mappe, der kan skrives i — helst uden for public_html. */
function datamappe(): string
{
    static $fundet = null;
    if ($fundet !== null) {
        return $fundet;
    }
    $rod = dirname(__DIR__);                 // public_html
    $bud = [dirname($rod) . '/learnification-data', $rod . '/data'];
    // Til test på egen maskine: tools/lokal-php.py peger den et andet sted hen
    if (getenv('LF_DATAMAPPE')) {
        $bud = [getenv('LF_DATAMAPPE')];
    }
    foreach ($bud as $mappe) {
        if (!is_dir($mappe)) {
            @mkdir($mappe, 0750, true);
        }
        if (is_dir($mappe) && is_writable($mappe)) {
            return $fundet = $mappe;
        }
    }
    fejl('Serveren kan ikke gemme noget lige nu. Skriv til ' . MODTAGER . '.', 500);
}

/** En hemmelighed, der kun findes på serveren — til at hashe IP-adresser. */
function hemmelighed(): string
{
    $fil = datamappe() . '/hemmelighed.txt';
    if (!is_file($fil)) {
        @file_put_contents($fil, bin2hex(random_bytes(32)), LOCK_EX);
        @chmod($fil, 0640);
    }
    return trim((string) @file_get_contents($fil));
}

// ---------------------------------------------------------------- databasen

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $mappe = datamappe();
    $opsaet = $mappe . '/database.php';
    try {
        if (is_file($opsaet)) {
            $c = require $opsaet;
            $pdo = new PDO($c['dsn'], $c['bruger'] ?? null, $c['kode'] ?? null);
        } else {
            if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
                fejl('Webhotellet har ikke SQLite slået til. Se README under "Login".', 500);
            }
            $pdo = new PDO('sqlite:' . $mappe . '/learnification.sqlite');
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec('PRAGMA busy_timeout = 5000');
            $pdo->exec('PRAGMA journal_mode = WAL');
        }
    } catch (PDOException $e) {
        error_log('learnification db: ' . $e->getMessage());
        fejl('Databasen kunne ikke åbnes.', 500);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    opret_tabeller($pdo);
    return $pdo;
}

function er_mysql(): bool
{
    return db()->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
}

/**
 * Tabellerne. Ændres der på dem, så skriv en ny version nederst i
 * $trin — den gamle database bliver så løftet op, første gang nogen kommer.
 */
function opret_tabeller(PDO $pdo): void
{
    $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    $id = $mysql ? 'INTEGER PRIMARY KEY AUTO_INCREMENT' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $tekst = $mysql ? 'VARCHAR(190)' : 'TEXT';
    $slut = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';

    $pdo->exec("CREATE TABLE IF NOT EXISTS version (nr INTEGER NOT NULL)$slut");
    $nr = (int) $pdo->query('SELECT MAX(nr) FROM version')->fetchColumn();

    $trin = [
        1 => [
            "CREATE TABLE konti (
                id $id,
                type $tekst NOT NULL,
                navn $tekst NOT NULL,
                kontakt $tekst NOT NULL DEFAULT '',
                bynavn $tekst NOT NULL DEFAULT '',
                email $tekst NOT NULL UNIQUE,
                kodeord $tekst NOT NULL,
                status $tekst NOT NULL DEFAULT 'ny',
                oprettet INTEGER NOT NULL,
                sidst_inde INTEGER
            )$slut",
            "CREATE TABLE grupper (
                id $id,
                konto_id INTEGER NOT NULL,
                navn $tekst NOT NULL,
                klassetrin INTEGER,
                kode $tekst NOT NULL UNIQUE,
                oprettet INTEGER NOT NULL,
                FOREIGN KEY (konto_id) REFERENCES konti(id) ON DELETE CASCADE
            )$slut",
            "CREATE TABLE elever (
                id $id,
                gruppe_id INTEGER NOT NULL,
                kaldenavn $tekst NOT NULL,
                ikon $tekst NOT NULL,
                oprettet INTEGER NOT NULL,
                sidst_inde INTEGER,
                FOREIGN KEY (gruppe_id) REFERENCES grupper(id) ON DELETE CASCADE
            )$slut",
            // Bliver en elev slettet, bliver spilletiden stående på kontoen
            // uden navn på — så tallene i overblikket ikke hopper.
            "CREATE TABLE sessioner (
                id $id,
                konto_id INTEGER NOT NULL,
                elev_id INTEGER,
                hvem $tekst NOT NULL,
                spil $tekst NOT NULL,
                start INTEGER NOT NULL,
                sidst INTEGER NOT NULL,
                sekunder INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (konto_id) REFERENCES konti(id) ON DELETE CASCADE,
                FOREIGN KEY (elev_id) REFERENCES elever(id) ON DELETE SET NULL
            )$slut",
            'CREATE INDEX sessioner_konto ON sessioner(konto_id)',
            'CREATE INDEX sessioner_elev ON sessioner(elev_id)',
            'CREATE INDEX sessioner_start ON sessioner(start)',
            "CREATE TABLE logins (
                token $tekst NOT NULL PRIMARY KEY,
                konto_id INTEGER NOT NULL,
                elev_id INTEGER,
                udloeber INTEGER NOT NULL,
                FOREIGN KEY (konto_id) REFERENCES konti(id) ON DELETE CASCADE,
                FOREIGN KEY (elev_id) REFERENCES elever(id) ON DELETE CASCADE
            )$slut",
            "CREATE TABLE nulstil (
                token $tekst NOT NULL PRIMARY KEY,
                konto_id INTEGER NOT NULL,
                udloeber INTEGER NOT NULL,
                FOREIGN KEY (konto_id) REFERENCES konti(id) ON DELETE CASCADE
            )$slut",
            "CREATE TABLE forsoeg (noegle $tekst NOT NULL, tid INTEGER NOT NULL)$slut",
            'CREATE INDEX forsoeg_noegle ON forsoeg(noegle)',
        ],
        // Hvert barn får sin egen kode, så man ikke kan trykke sig ind på
        // en klassekammerats navn. Børn, der fandtes i forvejen, får en her.
        2 => [
            "ALTER TABLE elever ADD COLUMN kode $tekst",
            'CREATE UNIQUE INDEX elever_kode ON elever(kode)',
            function (PDO $pdo): void {
                $ret = $pdo->prepare('UPDATE elever SET kode = ? WHERE id = ?');
                foreach ($pdo->query('SELECT id FROM elever WHERE kode IS NULL')->fetchAll(PDO::FETCH_COLUMN) as $id) {
                    $ret->execute([ny_elevkode($pdo), $id]);
                }
            },
        ],
        // Besøgsstatistik (api/besoeg.php). Én linje pr. sidevisning.
        // "besoeger" er en kode, der kun gælder den ene dag — se besoeg.php.
        3 => [
            "CREATE TABLE besoeg (
                id $id,
                tid INTEGER NOT NULL,
                dag $tekst NOT NULL,
                besoeger $tekst NOT NULL,
                side $tekst NOT NULL,
                fra $tekst NOT NULL DEFAULT '',
                kilde $tekst NOT NULL DEFAULT '',
                mobil INTEGER NOT NULL DEFAULT 0
            )$slut",
            'CREATE INDEX besoeg_tid ON besoeg(tid)',
            'CREATE INDEX besoeg_dag ON besoeg(dag, besoeger)',
        ],
        // Gemte spil (api/gem.php): ét pr. spiller pr. spil, så et barn kan
        // spille videre på en anden computer. "hvem" er 'elev.<id>' eller
        // 'voksen.<id>' — samme form som cookien lf_in.
        // Nyhedsbrevet (api/nyhedsbrev.php): kun voksne, kun med samtykke,
        // og først på listen, når mailadressen er bekræftet.
        4 => [
            "CREATE TABLE gemte_spil (
                id $id,
                konto_id INTEGER NOT NULL,
                elev_id INTEGER,
                hvem $tekst NOT NULL,
                spil $tekst NOT NULL,
                data TEXT NOT NULL,
                udgave INTEGER NOT NULL DEFAULT 1,
                enhed $tekst NOT NULL DEFAULT '',
                opdateret INTEGER NOT NULL,
                FOREIGN KEY (konto_id) REFERENCES konti(id) ON DELETE CASCADE,
                FOREIGN KEY (elev_id) REFERENCES elever(id) ON DELETE CASCADE
            )$slut",
            'CREATE UNIQUE INDEX gemte_spil_hvem ON gemte_spil(hvem, spil)',
            "CREATE TABLE nyhedsbrev (
                id $id,
                email $tekst NOT NULL UNIQUE,
                navn $tekst NOT NULL DEFAULT '',
                rolle $tekst NOT NULL DEFAULT '',
                kilde $tekst NOT NULL DEFAULT '',
                samtykke TEXT NOT NULL,
                noegle $tekst NOT NULL UNIQUE,
                oprettet INTEGER NOT NULL,
                bekraeftet INTEGER,
                afmeldt INTEGER
            )$slut",
        ],
        // Cookies med samtykke (assets/samtykke.js). "bid" er statistik-
        // cookiens tilfældige id og står KUN på linjen, når den besøgende har
        // sagt ja til statistik. "maal" er konverteringer: tilmeldt
        // nyhedsbrev, oprettet konto, startet et spil. "samtykker" er beviset
        // for, hvad folk har sagt ja og nej til — uden IP-adresse.
        5 => [
            "ALTER TABLE besoeg ADD COLUMN bid $tekst NOT NULL DEFAULT ''",
            "ALTER TABLE besoeg ADD COLUMN kampagne $tekst NOT NULL DEFAULT ''",
            'CREATE INDEX besoeg_bid ON besoeg(bid)',
            "CREATE TABLE maal (
                id $id,
                tid INTEGER NOT NULL,
                dag $tekst NOT NULL,
                besoeger $tekst NOT NULL,
                bid $tekst NOT NULL DEFAULT '',
                navn $tekst NOT NULL,
                side $tekst NOT NULL DEFAULT ''
            )$slut",
            'CREATE INDEX maal_tid ON maal(tid)',
            "CREATE TABLE samtykker (
                id $id,
                samtykke_id $tekst NOT NULL,
                tid INTEGER NOT NULL,
                valg $tekst NOT NULL,
                statistik INTEGER NOT NULL,
                markedsfoering INTEGER NOT NULL,
                version INTEGER NOT NULL,
                side $tekst NOT NULL DEFAULT ''
            )$slut",
            'CREATE INDEX samtykker_tid ON samtykker(tid)',
        ],
        // Udsendte nyhedsbreve (api/nyhedsbrev.php). En linje i
        // udsendelse_modtagere bliver skrevet, FØR mailen går af sted, så
        // ingen kan få den samme mail to gange — heller ikke hvis to faner
        // sender på én gang, eller hvis en udsendelse bliver genoptaget.
        6 => [
            "CREATE TABLE udsendelser (
                id $id,
                emne $tekst NOT NULL,
                tekst TEXT NOT NULL,
                maalgruppe $tekst NOT NULL,
                hilsen INTEGER NOT NULL DEFAULT 1,
                kampagne $tekst NOT NULL DEFAULT '',
                oprettet INTEGER NOT NULL,
                faerdig INTEGER
            )$slut",
            "CREATE TABLE udsendelse_modtagere (
                udsendelse_id INTEGER NOT NULL,
                nyhedsbrev_id INTEGER NOT NULL,
                tid INTEGER NOT NULL,
                ok INTEGER,
                PRIMARY KEY (udsendelse_id, nyhedsbrev_id),
                FOREIGN KEY (udsendelse_id) REFERENCES udsendelser(id) ON DELETE CASCADE,
                FOREIGN KEY (nyhedsbrev_id) REFERENCES nyhedsbrev(id) ON DELETE CASCADE
            )$slut",
        ],
        // Velkomstmailen (api/_velkomst.php): hvornår kontoen sidst fik den
        7 => [
            'ALTER TABLE konti ADD COLUMN velkomst_sendt INTEGER',
        ],
        // Påmindelsen (api/paamind.php): sendt én gang, og hvor mange gange
        // den er fejlet — efter 3 fejl bliver den ikke prøvet mere
        8 => [
            'ALTER TABLE konti ADD COLUMN paamindelse_sendt INTEGER',
            'ALTER TABLE konti ADD COLUMN paamindelse_fejl INTEGER NOT NULL DEFAULT 0',
        ],
        // Prøvetiden (én time pr. barn, se tid_status()) og spørgeskemaet
        // (api/_spoergeskema.php): ekstra minutter / fri adgang giver admin
        // pr. konto, skema_sendt er claim-feltet (kun ét skema pr. konto)
        9 => [
            'ALTER TABLE konti ADD COLUMN ekstra_min INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE konti ADD COLUMN fri_adgang INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE konti ADD COLUMN skema_sendt INTEGER',
            'ALTER TABLE konti ADD COLUMN skema_fejl INTEGER NOT NULL DEFAULT 0',
            "CREATE TABLE spoergeskemaer (
                id $id,
                konto_id INTEGER NOT NULL,
                noegle $tekst NOT NULL UNIQUE,
                aarsag $tekst NOT NULL,
                elev_id INTEGER,
                spil $tekst,
                sendt INTEGER,
                aabnet INTEGER,
                besvaret INTEGER,
                svar TEXT,
                FOREIGN KEY (konto_id) REFERENCES konti(id) ON DELETE CASCADE
            )$slut",
            'CREATE INDEX spoergeskemaer_konto ON spoergeskemaer (konto_id)',
        ],
        // Testrunder (api/test.php): en testkonto til en skole, hvor eleverne hedder
        // Spiller 1, 2, 3 …. test = 1 holder dem ude af mails og de almindelige tal.
        // testskema = et skema, admin har vist på elevernes skærme; testsvar = et barns svar
        10 => [
            'ALTER TABLE konti ADD COLUMN test INTEGER NOT NULL DEFAULT 0',
            "CREATE TABLE testskema (
                id $id,
                konto_id INTEGER NOT NULL,
                aabnet INTEGER NOT NULL,
                lukket INTEGER,
                FOREIGN KEY (konto_id) REFERENCES konti(id) ON DELETE CASCADE
            )$slut",
            'CREATE INDEX testskema_konto ON testskema (konto_id)',
            "CREATE TABLE testsvar (
                id $id,
                testskema_id INTEGER NOT NULL,
                elev_id INTEGER NOT NULL,
                spil $tekst NOT NULL,
                svar TEXT NOT NULL,
                tid INTEGER NOT NULL,
                FOREIGN KEY (testskema_id) REFERENCES testskema(id) ON DELETE CASCADE,
                FOREIGN KEY (elev_id) REFERENCES elever(id) ON DELETE CASCADE
            )$slut",
            'CREATE UNIQUE INDEX testsvar_en ON testsvar (testskema_id, elev_id)',
        ],
        // Barnets eget klassetrin (0-9), spurgt inden første spil (assets/klassetrin.js). Har klassen et, bruges det.
        11 => [
            'ALTER TABLE elever ADD COLUMN klassetrin INTEGER',
        ],
    ];

    foreach ($trin as $version => $saetninger) {
        if ($version <= $nr) {
            continue;
        }
        $pdo->beginTransaction();
        try {
            foreach ($saetninger as $sql) {
                is_callable($sql) ? $sql($pdo) : $pdo->exec($sql);
            }
            $pdo->prepare('INSERT INTO version (nr) VALUES (?)')->execute([$version]);
            $pdo->commit();
        } catch (PDOException $e) {
            $pdo->rollBack();
            // En anden forespørgsel kan være nået først — så er den god nok
            if ((int) $pdo->query('SELECT MAX(nr) FROM version')->fetchColumn() < $version) {
                throw $e;
            }
        }
    }
}

function en(string $sql, array $p = []): ?array
{
    $s = db()->prepare($sql);
    $s->execute($p);
    $r = $s->fetch();
    return $r === false ? null : $r;
}

function alle(string $sql, array $p = []): array
{
    $s = db()->prepare($sql);
    $s->execute($p);
    return $s->fetchAll();
}

function kør(string $sql, array $p = []): int
{
    $s = db()->prepare($sql);
    $s->execute($p);
    return $s->rowCount();
}

function vaerdi(string $sql, array $p = [])
{
    $s = db()->prepare($sql);
    $s->execute($p);
    return $s->fetchColumn();
}

// ---------------------------------------------------------------- gættere

/**
 * Højst $max forsøg på $sekunder for hver nøgle. IP-adressen bliver aldrig
 * gemt som den er — kun som en hash med serverens hemmelighed, og den
 * bliver slettet igen efter en time.
 */
function bremse(string $slags, string $hvem, int $max, int $sekunder, bool $noter = true): void
{
    $nu = time();
    if (random_int(1, 20) === 1) {
        kør('DELETE FROM forsoeg WHERE tid < ?', [$nu - 3600]);
    }
    $antal = (int) vaerdi('SELECT COUNT(*) FROM forsoeg WHERE noegle = ? AND tid > ?',
                          [forsoegsnoegle($slags, $hvem), $nu - $sekunder]);
    if ($antal >= $max) {
        fejl('Det var mange forsøg på kort tid. Vent et par minutter, og prøv igen.', 429);
    }
    if ($noter) {
        noter_forsoeg($slags, $hvem);
    }
}

/** Til bremser, der kun skal tælle de forkerte forsøg (se api/elev.php). */
function noter_forsoeg(string $slags, string $hvem): void
{
    kør('INSERT INTO forsoeg (noegle, tid) VALUES (?, ?)', [forsoegsnoegle($slags, $hvem), time()]);
}

function forsoegsnoegle(string $slags, string $hvem): string
{
    return $slags . ':' . hash_hmac('sha256', $hvem, hemmelighed());
}

function ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '?');
}

// ---------------------------------------------------------------- login

function https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function saet_cookie(string $navn, string $vaerdi, int $udloeber, bool $httponly): void
{
    setcookie($navn, $vaerdi, [
        'expires' => $udloeber,
        'path' => '/',
        'secure' => https(),
        'httponly' => $httponly,
        'samesite' => 'Lax',
    ]);
}

/** Log ind som en voksen (elev_id null) eller som et barn på kontoen. */
function log_ind(int $konto_id, ?int $elev_id, int $levetid): void
{
    // Et nyt login på den samme browser erstatter det gamle
    log_ud();
    $token = bin2hex(random_bytes(32));
    $udloeber = time() + $levetid;
    kør('INSERT INTO logins (token, konto_id, elev_id, udloeber) VALUES (?, ?, ?, ?)',
        [hash('sha256', $token), $konto_id, $elev_id, $udloeber]);
    saet_cookie('lf_session', $token, $udloeber, true);
    // En harmløs lillebror, som siderne kan se: "der er nogen logget ind",
    // så de kun spørger serveren, når der er grund til det. Id'et står med,
    // så Runeborg kan gemme hvert barns eventyr for sig på en delt computer.
    // Den giver ikke adgang til noget — det gør kun lf_session.
    saet_cookie('lf_in', $elev_id ? 'elev.' . $elev_id : 'voksen.' . $konto_id, $udloeber, false);
    // Børn på en testrunde (api/test.php) får spørgeskemaet på skærmen — assets/elevskema.js
    // kigger kun efter det, når den her cookie står. Giver heller ikke adgang til noget.
    if ($elev_id && vaerdi('SELECT test FROM konti WHERE id = ?', [$konto_id])) {
        saet_cookie('lf_test', '1', $udloeber, false);
    } else {
        saet_cookie('lf_test', '', time() - 3600, false);
    }
    if (random_int(1, 10) === 1) {
        kør('DELETE FROM logins WHERE udloeber < ?', [time()]);
    }
}

function log_ud(): void
{
    $token = (string) ($_COOKIE['lf_session'] ?? '');
    if ($token !== '') {
        kør('DELETE FROM logins WHERE token = ?', [hash('sha256', $token)]);
    }
    saet_cookie('lf_session', '', time() - 3600, true);
    saet_cookie('lf_in', '', time() - 3600, false);
    saet_cookie('lf_test', '', time() - 3600, false);
    // Logger barnet ud, går den parkerede voksne med — ellers ville den
    // næste ved computeren kunne trykke sig ind på kontoen
    $parkeret = (string) ($_COOKIE['lf_voksen'] ?? '');
    if ($parkeret !== '') {
        kør('DELETE FROM logins WHERE token = ?', [hash('sha256', $parkeret)]);
        saet_cookie('lf_voksen', '', time() - 3600, true);
    }
}

/**
 * Den voksne går ind som et af sine børn (/konto). Den voksnes eget login
 * bliver ikke slettet, men parkeret i cookien lf_voksen, så "Tilbage til
 * mig" kan hente det igen uden mail og kodeord. Logger nogen ind på en anden
 * måde, eller logger barnet ud, er det parkerede login væk.
 */
function log_ind_som_barn(int $konto_id, int $elev_id, int $levetid): void
{
    $token = (string) ($_COOKIE['lf_session'] ?? '');
    $udloeber = (int) vaerdi('SELECT udloeber FROM logins WHERE token = ? AND konto_id = ? AND elev_id IS NULL',
                             [hash('sha256', $token), $konto_id]);
    // log_ind() rydder op efter det gamle login — det her skal blive stående
    unset($_COOKIE['lf_session'], $_COOKIE['lf_voksen']);
    log_ind($konto_id, $elev_id, $levetid);
    if ($udloeber > time()) {
        saet_cookie('lf_voksen', $token, $udloeber, true);
    }
}

/**
 * Er det her et barn, som den voksne selv har logget ind som? Så svarer den
 * med det parkerede login (og kontoen), ellers null. Det parkerede login
 * skal høre til den samme konto som barnet.
 */
function parkeret_voksen(): ?array
{
    $h = hvem();
    $token = (string) ($_COOKIE['lf_voksen'] ?? '');
    if (!$h || !$h['elev'] || $token === '' || strlen($token) > 128) {
        return null;
    }
    $l = en('SELECT * FROM logins WHERE token = ? AND elev_id IS NULL AND konto_id = ? AND udloeber > ?',
            [hash('sha256', $token), $h['konto']['id'], time()]);
    return $l ? ['token' => $token, 'login' => $l, 'konto' => $h['konto']] : null;
}

/**
 * Hvem er logget ind? null, hvis ingen er — eller hvis kontoen er spærret.
 * Svaret har altid 'konto', og 'elev', hvis det er et barn.
 */
function hvem(): ?array
{
    static $svar = false;
    if ($svar !== false) {
        return $svar;
    }
    $svar = null;
    $token = (string) ($_COOKIE['lf_session'] ?? '');
    if ($token === '' || strlen($token) > 128) {
        return null;
    }
    $l = en('SELECT * FROM logins WHERE token = ? AND udloeber > ?', [hash('sha256', $token), time()]);
    if (!$l) {
        return null;
    }
    $konto = en('SELECT * FROM konti WHERE id = ?', [$l['konto_id']]);
    if (!$konto || $konto['status'] === 'spaerret') {
        return null;
    }
    $elev = null;
    if ($l['elev_id'] !== null) {
        $elev = en('SELECT e.*, g.navn AS gruppe, g.kode, g.klassetrin AS gruppe_klassetrin FROM elever e
                    JOIN grupper g ON g.id = e.gruppe_id WHERE e.id = ?', [$l['elev_id']]);
        if (!$elev) {
            return null;
        }
    }
    return $svar = ['konto' => $konto, 'elev' => $elev];
}

/** En voksen skal være logget ind (ikke et barn). */
function kraev_voksen(): array
{
    $h = hvem();
    if (!$h || $h['elev']) {
        fejl('Du skal være logget ind som voksen.', 401);
    }
    return $h['konto'];
}

function kraev_admin(): array
{
    $k = kraev_voksen();
    if ($k['type'] !== 'admin') {
        fejl('Det her er kun for Learnification.', 403);
    }
    return $k;
}

/**
 * En ledig klassekode, fx UGLE-472. Børnene logger ikke ind med den længere
 * (de har hver deres, se ny_elevkode), men grupper-tabellen kræver en.
 */
function ny_kode(): string
{
    for ($i = 0; $i < 50; $i++) {
        $kode = KODEORD[random_int(0, count(KODEORD) - 1)] . '-' . random_int(100, 999);
        if (!vaerdi('SELECT 1 FROM grupper WHERE kode = ?', [$kode])) {
            return $kode;
        }
    }
    fejl('Kunne ikke finde en ledig kode. Prøv igen.', 500);
}

/**
 * En ledig kode til ét barn, fx RAVN-4827. Tager databasen som argument,
 * fordi den også bruges, mens tabellerne bliver løftet op (inden db() er klar).
 */
function ny_elevkode(PDO $pdo): string
{
    $findes = $pdo->prepare('SELECT 1 FROM elever WHERE kode = ?');
    for ($i = 0; $i < 50; $i++) {
        $kode = KODEORD[random_int(0, count(KODEORD) - 1)] . '-' . random_int(1000, 9999);
        $findes->execute([$kode]);
        if (!$findes->fetchColumn()) {
            return $kode;
        }
    }
    fejl('Kunne ikke finde en ledig kode. Prøv igen.', 500);
}

/**
 * Sæt børn på en gruppe ud fra en tekst med ét kaldenavn pr. linje (komma og
 * semikolon virker også). Svarer, hvor mange der kom på. Bruges af /konto,
 * /opret og /admin.
 */
function nye_elever(int $gruppe_id, string $raa, int $maks = 40): int
{
    $navne = [];
    foreach (preg_split('/[\r\n,;]+/', $raa) ?: [] as $n) {
        $n = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', $n) ?? '');
        $n = function_exists('mb_substr') ? mb_substr($n, 0, 30, 'UTF-8') : substr($n, 0, 30);
        if ($n !== '' && !in_array(lille($n), array_map('lille', $navne), true)) {
            $navne[] = $n;
        }
    }
    if (!$navne) {
        fejl('Skriv mindst ét navn.');
    }
    $findes = array_map('lille', array_column(
        alle('SELECT kaldenavn FROM elever WHERE gruppe_id = ?', [$gruppe_id]), 'kaldenavn'));
    if (count($findes) + count($navne) > $maks) {
        fejl('Der kan højst være ' . $maks . ' elever i en gruppe.');
    }
    $dubletter = array_values(array_filter($navne, fn($n) => in_array(lille($n), $findes, true)));
    if ($dubletter) {
        fejl('Der er allerede en, der hedder ' . implode(', ', $dubletter)
             . '. Skriv fx et forbogstav bagefter, så børnene kan kende forskel.');
    }
    $egen = !db()->inTransaction();
    if ($egen) {
        db()->beginTransaction();
    }
    foreach ($navne as $n) {
        kør('INSERT INTO elever (gruppe_id, kaldenavn, ikon, kode, oprettet) VALUES (?, ?, ?, ?, ?)',
            [$gruppe_id, $n, nyt_ikon($gruppe_id), ny_elevkode(db()), time()]);
    }
    if ($egen) {
        db()->commit();
    }
    return count($navne);
}

/**
 * Ret og tjek felterne til en ny eller rettet konto. $d har type, navn,
 * kontakt, bynavn og email. Svarer med de rensede værdier — eller stopper med
 * en fejl, man kan vise. $id er kontoen selv, når den rettes (mailen må gerne
 * være dens egen).
 */
function tjek_kontofelter(array $d, int $id = 0): array
{
    $type = (string) ($d['type'] ?? '');
    if (!isset(KONTOTYPER[$type])) {
        fejl('Vælg, hvem kontoen er til.');
    }
    $navn = (string) ($d['navn'] ?? '');
    $kontakt = (string) ($d['kontakt'] ?? '');
    $email = lille((string) ($d['email'] ?? ''));
    if (laengde($navn) < 2) {
        fejl($type === 'skole' ? 'Skriv skolens navn.' : 'Skriv dit navn.');
    }
    if ($type === 'skole' && laengde($kontakt) < 2) {
        fejl('Skriv navnet på kontaktpersonen.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fejl('Den mailadresse ser ikke rigtig ud.');
    }
    if (vaerdi('SELECT 1 FROM konti WHERE email = ? AND id != ?', [$email, $id])) {
        fejl('Der findes allerede en konto med den mailadresse. Prøv at logge ind, eller brug "Glemt kodeord".', 409);
    }
    return ['type' => $type, 'navn' => $navn, 'kontakt' => $type === 'skole' ? $kontakt : $navn,
            'bynavn' => (string) ($d['bynavn'] ?? ''), 'email' => $email];
}

/**
 * Opret en konto ud fra felter, der er tjekket med tjek_kontofelter(). En
 * familie får sin gruppe "Familien" med det samme (og børnene i $boern, hvis
 * der står nogen). Svarer med den nye kontos id.
 */
function opret_konto(array $f, string $kodeord_hash, string $status, string $boern = ''): int
{
    $nu = time();
    db()->beginTransaction();
    try {
        kør('INSERT INTO konti (type, navn, kontakt, bynavn, email, kodeord, status, oprettet)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$f['type'], $f['navn'], $f['kontakt'], $f['bynavn'], $f['email'], $kodeord_hash, $status, $nu]);
        $id = (int) db()->lastInsertId();
        if ($f['type'] === 'foraelder') {
            kør('INSERT INTO grupper (konto_id, navn, klassetrin, kode, oprettet) VALUES (?, ?, NULL, ?, ?)',
                [$id, 'Familien', ny_kode(), $nu]);
            if (trim($boern) !== '') {
                nye_elever((int) db()->lastInsertId(), $boern);
            }
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    return $id;
}

/**
 * Et link, hvor den voksne selv vælger et (nyt) kodeord: /login#nulstil=…
 * Gamle links til kontoen holder op med at virke.
 */
function nulstil_link(int $konto_id, int $gyldig): string
{
    $token = bin2hex(random_bytes(24));
    kør('DELETE FROM nulstil WHERE konto_id = ? OR udloeber < ?', [$konto_id, time()]);
    kør('INSERT INTO nulstil (token, konto_id, udloeber) VALUES (?, ?, ?)',
        [hash('sha256', $token), $konto_id, time() + $gyldig]);
    return adresse() . '/login#nulstil=' . $token;
}

/** Et dyr til en ny elev — det første, ingen andre i gruppen har. */
function nyt_ikon(int $gruppe_id): string
{
    $brugt = array_column(alle('SELECT ikon FROM elever WHERE gruppe_id = ?', [$gruppe_id]), 'ikon');
    foreach (IKONER as $i) {
        if (!in_array($i, $brugt, true)) {
            return $i;
        }
    }
    return IKONER[random_int(0, count(IKONER) - 1)];
}

// ---------------------------------------------------------------- post

require_once __DIR__ . '/_post.php';

/**
 * Send en mail. Med $html bliver den sendt i to udgaver (almindelig tekst og
 * HTML), og mailprogrammet viser den bedste. $ekstra er flere headere, fx
 * 'Reply-To' => '...'. Svarer, om mailserveren tog imod mailen — hvis ikke,
 * står grunden i post_fejl().
 *
 * Går gennem websmtp.simply.com, når smtp.php ligger i datamappen (se
 * _post.php) — ellers bliver mailen hverken DKIM-signeret eller godkendt af
 * domænets DMARC.
 */
function send_mail(string $til, string $emne, string $tekst, ?string $html = null, array $ekstra = []): bool
{
    post_fejl('');
    if (preg_match('/[\r\n<>,;]/', $til) || !filter_var($til, FILTER_VALIDATE_EMAIL)) {
        post_fejl('Ugyldig modtager');
        return false;
    }
    // Emnet kodes, så æ, ø og å kommer rigtigt frem
    $emne = '=?UTF-8?B?' . base64_encode($emne) . '?=';
    $h = 'From: Learnification <' . AFSENDER . ">\r\n";
    foreach ($ekstra as $navn => $vaerdi) {
        $h .= $navn . ': ' . str_replace(["\r", "\n"], '', $vaerdi) . "\r\n";
    }
    $h .= "MIME-Version: 1.0\r\n";

    if ($html === null) {
        $h .= "Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable";
        $krop = quoted_printable_encode($tekst);
    } else {
        $graense = 'lf-' . bin2hex(random_bytes(12));
        $h .= "Content-Type: multipart/alternative; boundary=\"$graense\"";
        $krop = "--$graense\r\n"
            . "Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
            . quoted_printable_encode($tekst) . "\r\n"
            . "--$graense\r\n"
            . "Content-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
            . quoted_printable_encode($html) . "\r\n"
            . "--$graense--\r\n";
    }

    $smtp = smtp_opsaetning();
    if ($smtp) {
        $domaene = substr(strrchr(AFSENDER, '@') ?: '@learnification.dk', 1);
        return smtp_send($smtp, AFSENDER, $til,
            'Date: ' . date('r') . "\r\n"
            . 'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . $domaene . ">\r\n"
            . "To: <$til>\r\n"
            . "Subject: $emne\r\n"
            . $h . "\r\n\r\n" . $krop);
    }

    // På egen maskine er der ingen mailserver — der lægges mailen i en fil
    if (getenv('LF_POSTKASSE')) {
        return (bool) file_put_contents(getenv('LF_POSTKASSE'),
            "==== " . date('d-m-Y H:i:s') . " til $til\r\n$h\r\n" . 'Subject: ' . $emne . "\r\n\r\n$tekst\r\n\r\n"
            . ($html !== null ? "---- HTML ----\r\n$html\r\n\r\n" : ''), FILE_APPEND | LOCK_EX);
    }

    $ok = @mail($til, $emne, $krop, $h);
    if (!$ok) {
        post_fejl('PHP\'s mail() ville ikke sende den');
    }
    return $ok;
}

function adresse(): string
{
    $vaert = (string) ($_SERVER['HTTP_HOST'] ?? 'learnification.dk');
    if (!preg_match('/^[a-z0-9.\-:]+$/i', $vaert)) {
        $vaert = 'learnification.dk';
    }
    return (https() ? 'https://' : 'http://') . $vaert;
}

// ---------------------------------------------------------------- gemte spil

/**
 * Et gemt spil som en kort status til overblikket (/admin og /konto): hvor langt, og om det
 * er gennemført. null, hvis der ikke er noget (eller det er startet forfra).
 * Formatet er spillenes eget — se fresh() i spil/regnehelten/js/game.js og
 * spil/runeborg/js/game.js (og til_gem() i Regneheltens første udgave),
 * hvis tallene her en dag ser forkerte ud.
 */
function gemt_status(string $spil, string $data, int $opdateret): ?array
{
    $d = json_decode($data, true);
    if (!is_array($d) || !empty($d['slettet'])) {
        return null;
    }
    // Udgaverne med kapitler (Runeborg v2, Regnehelten v3): færdig = sidste kapitel klaret
    if (($spil === 'regnehelten' && (int) ($d['v'] ?? 0) >= 3) || ($spil === 'runeborg' && (int) ($d['v'] ?? 0) >= 2)) {
        $klaret = array_map('intval', (array) ($d['klaret'] ?? []));
        $kap = max(1, min(KAPITLER, (int) ($d['kap'] ?? 1)));
        $faerdig = in_array(KAPITLER, $klaret, true);
        $ekstra = 0;
        foreach ((array) ($d['q'] ?? []) as $id => $status) {
            if ($status === 'done' && preg_match('/^(k\d)?s\d+$/', (string) $id)) {
                $ekstra++;
            }
        }
        $detalje = $spil === 'regnehelten'
            ? 'Regnekraft ' . (int) ($d['kraft'] ?? 0) . ' % · ' . count($klaret) . ' af ' . KAPITLER . ' kapitler klaret · ' . $ekstra . ' ekstramissioner'
            : count($klaret) . ' af ' . KAPITLER . ' kapitler klaret · ' . $ekstra . ' ekstramissioner · '
                . count((array) ($d['runes'] ?? [])) . ' runestykker · ' . (int) ($d['gold'] ?? 0) . ' guld';
        // Hvor spilleren er lige nu — spillet lægger det i det gemte (hudInfo() i game.js)
        $hud = is_array($d['hud'] ?? null) ? $d['hud'] : [];
        $kort = fn($x, int $n) => function_exists('mb_substr') ? mb_substr((string) $x, 0, $n, 'UTF-8') : substr((string) $x, 0, $n);
        return ['faerdig' => $faerdig, 'kapitel' => $kap, 'opdateret' => $opdateret,
                'tekst' => $faerdig ? 'Gennemført' : 'Kapitel ' . $kap . ' af ' . KAPITLER,
                'detalje' => $detalje,
                'sted' => $kort($hud['sted'] ?? '', 40), 'mission' => $kort($hud['mission'] ?? '', 80),
                'maal' => $kort($hud['maal'] ?? '', 120),
                'lavet' => (int) ($hud['lavet'] ?? 0), 'ialt' => (int) ($hud['ialt'] ?? 0),
                'klaret' => count($klaret), 'ekstra' => $ekstra];
    }
    if ($spil === 'regnehelten' && (int) ($d['v'] ?? 0) === 2) {
        // Udgaven bygget som Runeborg (spil/regnehelten/js/game.js, fresh())
        $q = (array) ($d['q'] ?? []);
        $hoved = $ekstra = 0;
        foreach ($q as $id => $status) {
            if ($status !== 'done') {
                continue;
            }
            if (preg_match('/^q\d+$/', (string) $id)) {
                $hoved++;
            } elseif (preg_match('/^s\d+$/', (string) $id)) {
                $ekstra++;
            }
        }
        $faerdig = (($q['q5'] ?? '') === 'done');
        return ['faerdig' => $faerdig, 'opdateret' => $opdateret,
                'tekst' => $faerdig ? 'Gennemført' : $hoved . ' af 6 missioner',
                'detalje' => 'Regnekraft ' . (int) ($d['kraft'] ?? 0) . ' % · ' . $ekstra . ' af 6 ekstramissioner · '
                             . count((array) ($d['bag']['owned'] ?? [])) . ' ting i tasken'];
    }
    if ($spil === 'regnehelten') {
        // Den første udgave (Python i browseren)
        $kapitel = max(0, min(6, (int) ($d['chapter'] ?? 0)));
        $faerdig = !empty($d['faerdig']) || $kapitel >= 6;
        return ['faerdig' => $faerdig, 'opdateret' => $opdateret,
                'tekst' => $faerdig ? 'Gennemført' : 'Kapitel ' . min(6, $kapitel + 1) . ' af 6',
                'detalje' => 'Regnekraft ' . (int) ($d['confidence'] ?? 0) . ' %'];
    }
    if ($spil === 'runeborg') {
        $hoved = $ekstra = 0;
        foreach ((array) ($d['q'] ?? []) as $id => $status) {
            if ($status !== 'done') {
                continue;
            }
            if (preg_match('/^q\d+$/', (string) $id)) {
                $hoved++;
            } elseif (preg_match('/^s\d+$/', (string) $id)) {
                $ekstra++;
            }
        }
        $faerdig = (($d['q']['q10'] ?? '') === 'done');
        return ['faerdig' => $faerdig, 'opdateret' => $opdateret,
                'tekst' => $faerdig ? 'Gennemført' : $hoved . ' af 11 missioner',
                'detalje' => $ekstra . ' af 3 ekstramissioner · ' . count((array) ($d['runes'] ?? []))
                             . ' af 8 runestykker · ' . (int) ($d['gold'] ?? 0) . ' guld'];
    }
    return null;
}

/**
 * Alle gemte spil på en konto: [pr. elev-id => [spil => status], den voksnes
 * egne som objekt spil => status]. Objektet, så JSON bliver {} og ikke [].
 */
function gemte_spil_paa_konto(int $konto_id): array
{
    $elever = [];
    $voksen = (object) [];
    foreach (alle('SELECT elev_id, spil, data, opdateret FROM gemte_spil WHERE konto_id = ?', [$konto_id]) as $g) {
        $st = gemt_status($g['spil'], $g['data'], (int) $g['opdateret']);
        if (!$st) {
            continue;
        }
        if ($g['elev_id'] === null) {
            $voksen->{$g['spil']} = $st;
        } else {
            $elever[(int) $g['elev_id']][$g['spil']] = $st;
        }
    }
    return [$elever, $voksen];
}

// ---------------------------------------------------------------- spilletid

/**
 * Spilletid samlet op: i alt, de sidste 7 dage, pr. spil og sidst spillet.
 * $hvor er fx 'konto_id = ?' eller 'elev_id = ?'.
 */
function spilletid(string $hvor, array $p): array
{
    $uge = time() - 7 * 86400;
    $r = alle("SELECT spil, SUM(sekunder) AS i_alt,
                      SUM(CASE WHEN start > $uge THEN sekunder ELSE 0 END) AS uge,
                      COUNT(*) AS gange, MAX(sidst) AS sidst
               FROM sessioner WHERE $hvor AND sekunder > 0 GROUP BY spil", $p);
    $ud = ['i_alt' => 0, 'uge' => 0, 'gange' => 0, 'sidst' => null, 'spil' => []];
    foreach ($r as $x) {
        $ud['i_alt'] += (int) $x['i_alt'];
        $ud['uge'] += (int) $x['uge'];
        $ud['gange'] += (int) $x['gange'];
        $ud['sidst'] = max((int) $ud['sidst'], (int) $x['sidst']) ?: null;
        $ud['spil'][$x['spil']] = ['i_alt' => (int) $x['i_alt'], 'uge' => (int) $x['uge'],
                                   'gange' => (int) $x['gange']];
    }
    return $ud;
}

// ------------------------------------------------------------ prøvetiden

const TIDSGRAENSE_MIN = 60;          // minutter pr. barn på tværs af begge spil

/** Grundgrænsen i minutter. tidsgraense.txt i datamappen overstyrer den (til test: 1). */
function tidsgraense_min(): int
{
    $f = @file_get_contents(datamappe() . '/tidsgraense.txt');
    return $f !== false && ctype_digit(trim($f)) ? (int) trim($f) : TIDSGRAENSE_MIN;
}

/**
 * Hvor meget af prøvetiden en spiller har brugt. $h er hvem(). Et barn måles
 * på sig selv, en voksen, der selv spiller, på den voksnes egne omgange.
 * Administratorer og konti med fri adgang har ingen grænse (graense_sek = null).
 * Ekstra minutter fra admin gælder alle på kontoen.
 */
function tid_status(array $h): array
{
    $k = $h['konto'];
    $elev_id = $h['elev'] ? (int) $h['elev']['id'] : null;
    $brugt = (int) ($elev_id
        ? vaerdi('SELECT COALESCE(SUM(sekunder), 0) FROM sessioner WHERE elev_id = ?', [$elev_id])
        : vaerdi("SELECT COALESCE(SUM(sekunder), 0) FROM sessioner WHERE konto_id = ? AND elev_id IS NULL AND hvem = 'voksen'", [$k['id']]));
    if ($k['type'] === 'admin' || !empty($k['fri_adgang'])) {
        return ['graense_sek' => null, 'brugt_sek' => $brugt, 'tilbage_sek' => null, 'slut' => false];
    }
    $graense = (tidsgraense_min() + (int) ($k['ekstra_min'] ?? 0)) * 60;
    $tilbage = max(0, $graense - $brugt);
    return ['graense_sek' => $graense, 'brugt_sek' => $brugt, 'tilbage_sek' => $tilbage, 'slut' => $tilbage <= 0];
}

/** Spilletid pr. dag de sidste $dage dage, som ['2026-09-25' => sekunder]. */
function pr_dag(string $hvor, array $p, int $dage = 30): array
{
    $fra = strtotime('today') - ($dage - 1) * 86400;
    $ud = [];
    for ($i = 0; $i < $dage; $i++) {
        $ud[date('Y-m-d', $fra + $i * 86400 + 7200)] = 0;
    }
    foreach (alle("SELECT start, sekunder FROM sessioner WHERE $hvor AND start >= ? AND sekunder > 0",
                  array_merge($p, [$fra])) as $s) {
        $d = date('Y-m-d', (int) $s['start']);
        if (isset($ud[$d])) {
            $ud[$d] += (int) $s['sekunder'];
        }
    }
    return $ud;
}

/** Som pr_dag(), men delt på spil: ['2026-09-25' => ['runeborg' => sek, 'regnehelten' => sek]]. */
function pr_dag_spil(string $hvor, array $p, int $dage = 30): array
{
    $fra = strtotime('today') - ($dage - 1) * 86400;
    $tom = array_fill_keys(array_keys(SPIL), 0);
    $ud = [];
    for ($i = 0; $i < $dage; $i++) {
        $ud[date('Y-m-d', $fra + $i * 86400 + 7200)] = $tom;
    }
    foreach (alle("SELECT start, spil, sekunder FROM sessioner WHERE $hvor AND start >= ? AND sekunder > 0",
                  array_merge($p, [$fra])) as $s) {
        $d = date('Y-m-d', (int) $s['start']);
        if (isset($ud[$d][$s['spil']])) {
            $ud[$d][$s['spil']] += (int) $s['sekunder'];
        }
    }
    return $ud;
}
