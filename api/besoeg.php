<?php
/**
 * Besøgsstatistik: tager imod én sidevisning fra assets/besoeg.js.
 *
 *   POST {side, fra, kilde, kampagne, bid}   ->  204, uanset hvad
 *   POST {maal, side, bid}                   ->  204   (en konvertering)
 *
 * "bid" kommer KUN med, når den besøgende har sagt ja til statistik i
 * cookie-banneret (assets/samtykke.js): det er id'et fra cookien lf_bes,
 * som lader os se, at det er den samme, der kommer igen en anden dag.
 * Alt det følgende gælder for alle andre:
 *
 * Grundstatistikken er lavet, så den IKKE kræver samtykke:
 *
 *  - Der bliver ikke sat cookies og ikke gemt noget i browseren.
 *  - IP-adressen bliver aldrig gemt. Sammen med browserens navn bliver den
 *    lavet om til en kode med et "salt", der skiftes hver nat og ikke gemmes
 *    bagefter. Så kan vi se, at de tre sidevisninger i dag kom fra den samme,
 *    men i morgen er det en ny kode — ingen kan genkende nogen fra dag til dag,
 *    heller ikke os.
 *  - Browsere med "Do Not Track" eller "Global Privacy Control" slået til
 *    bliver slet ikke talt (det tjekker besoeg.js, og vi tjekker igen her).
 *  - Linjerne bliver slettet efter 13 måneder.
 *
 * Står på /privatliv under "Besøgsstatistik" — ret teksten der, hvis noget
 * her bliver lavet om.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

const BEHOLD_DAGE = 400;          // ca. 13 måneder
const MAKS_PR_BESOEGER = 300;     // pr. dag — mere end det er ikke et menneske

// Konverteringer, der kan tælles. Kaldes med LFMaal('navn') fra siderne.
const MAAL = ['nyhedsbrev', 'opret_konto', 'spil_regnehelten', 'spil_runeborg'];

function faerdig(): void
{
    http_response_code(204);
    header('Cache-Control: no-store');
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    faerdig();
}
if (($_SERVER['HTTP_DNT'] ?? '') === '1' || ($_SERVER['HTTP_SEC_GPC'] ?? '') === '1') {
    faerdig();
}
$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|php/i', $ua)) {
    faerdig();
}

$raa = (string) file_get_contents('php://input', false, null, 0, 2000);
$d = json_decode($raa, true);
if (!is_array($d)) {
    faerdig();
}

/** "/runeborg.html" -> "/runeborg", "/spil/index.html" -> "/spil/". Ellers ''. */
function sti($v): string
{
    if (!is_string($v) || $v === '' || $v[0] !== '/' || strlen($v) > 120) {
        return '';
    }
    $v = strtolower(strtok($v, '?#'));
    $v = preg_replace('~/index\.html$~', '/', $v);
    $v = preg_replace('~\.html$~', '', $v);
    if (!preg_match('~^/[a-z0-9/_\-.()]*$~', $v) && $v !== '/404 (findes ikke)') {
        return '';
    }
    return $v;
}

/** Hvor kom de fra? Kun et værtsnavn eller en ?ref=-kode, aldrig en hel adresse. */
function kilde($v): string
{
    if (!is_string($v) || $v === '') {
        return '';
    }
    $v = strtolower(substr($v, 0, 60));
    $v = preg_replace('/^www\./', '', $v);
    return preg_match('/^[a-z0-9.\-_: ]+$/', $v) ? $v : '';
}

$side = sti($d['side'] ?? '');
if ($side === '' || $side === '/admin' || $side === '/statistik') {
    faerdig();
}
$fra = sti($d['fra'] ?? '');
$kilde = kilde($d['kilde'] ?? '');
if ($kilde === 'learnification.dk') {
    $kilde = '';
}
$kampagne = kilde($d['kampagne'] ?? '');
$bid = is_string($d['bid'] ?? null) && preg_match('/^[0-9a-f]{16}$/', $d['bid']) ? $d['bid'] : '';
// Børnenes sider får aldrig et id med, heller ikke hvis nogen prøver
if (strpos($side, '/spil/') === 0 || strpos($side, '/login') === 0) {
    $bid = '';
}
$maal = is_string($d['maal'] ?? null) && in_array($d['maal'], MAAL, true) ? $d['maal'] : '';

/**
 * Dagens salt. Det skiftes, når datoen skifter, og det gamle bliver skrevet
 * over — så kan gårsdagens koder ikke laves igen, og ingen kan følge nogen
 * fra én dag til den næste.
 */
function dagens_salt(string $dag): string
{
    $fil = datamappe() . '/besoegssalt.txt';
    $f = @fopen($fil, 'c+');
    if (!$f) {
        return '';
    }
    flock($f, LOCK_EX);
    $linje = trim((string) stream_get_contents($f));
    [$dato, $salt] = array_pad(explode(':', $linje, 2), 2, '');
    if ($dato !== $dag || strlen($salt) < 32) {
        $salt = bin2hex(random_bytes(32));
        ftruncate($f, 0);
        rewind($f);
        fwrite($f, $dag . ':' . $salt);
        fflush($f);
    }
    flock($f, LOCK_UN);
    fclose($f);
    @chmod($fil, 0640);
    return $salt;
}

try {
    $nu = time();
    $dag = date('Y-m-d', $nu);
    $salt = dagens_salt($dag);
    if ($salt === '') {
        faerdig();
    }
    $besoeger = substr(hash_hmac('sha256', ip() . '|' . $ua, $salt), 0, 16);

    if ((int) vaerdi('SELECT COUNT(*) FROM besoeg WHERE dag = ? AND besoeger = ?', [$dag, $besoeger]) >= MAKS_PR_BESOEGER) {
        faerdig();
    }
    if ($maal !== '') {
        // Én gang pr. mål pr. besøgende pr. dag — et dobbeltklik er ikke to
        if (!vaerdi('SELECT 1 FROM maal WHERE dag = ? AND besoeger = ? AND navn = ?', [$dag, $besoeger, $maal])) {
            kør('INSERT INTO maal (tid, dag, besoeger, bid, navn, side) VALUES (?, ?, ?, ?, ?, ?)',
                [$nu, $dag, $besoeger, $bid, $maal, $side]);
        }
        faerdig();
    }
    $mobil = preg_match('/Mobi|Android|iPhone|iPad/i', $ua) ? 1 : 0;
    kør('INSERT INTO besoeg (tid, dag, besoeger, side, fra, kilde, mobil, bid, kampagne) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$nu, $dag, $besoeger, $side, $fra, $kilde, $mobil, $bid, $kampagne]);

    if (random_int(1, 200) === 1) {
        kør('DELETE FROM besoeg WHERE tid < ?', [$nu - BEHOLD_DAGE * 86400]);
        kør('DELETE FROM maal WHERE tid < ?', [$nu - BEHOLD_DAGE * 86400]);
    }
} catch (Throwable $e) {
    error_log('learnification besoeg: ' . $e->getMessage());
}
faerdig();
