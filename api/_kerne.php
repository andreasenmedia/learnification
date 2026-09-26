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
        $elev = en('SELECT e.*, g.navn AS gruppe, g.kode, g.klassetrin FROM elever e
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

function send_mail(string $til, string $emne, string $tekst): void
{
    // Emnet kodes, så æ, ø og å kommer rigtigt frem
    $emne = '=?UTF-8?B?' . base64_encode($emne) . '?=';
    @mail($til, $emne, $tekst,
          'From: Learnification <' . AFSENDER . ">\r\n"
          . "Content-Type: text/plain; charset=utf-8\r\n"
          . 'Content-Transfer-Encoding: 8bit');
}

function adresse(): string
{
    $vaert = (string) ($_SERVER['HTTP_HOST'] ?? 'learnification.dk');
    if (!preg_match('/^[a-z0-9.\-:]+$/i', $vaert)) {
        $vaert = 'learnification.dk';
    }
    return (https() ? 'https://' : 'http://') . $vaert;
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
