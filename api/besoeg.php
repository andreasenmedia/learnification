<?php
/**
 * Besøgsstatistik: tager imod én sidevisning fra assets/besoeg.js.
 *
 *   POST {side, fra, kilde}     ->  204, uanset hvad
 *
 * Den er lavet, så der IKKE skal et cookie-banner til:
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
    $mobil = preg_match('/Mobi|Android|iPhone|iPad/i', $ua) ? 1 : 0;
    kør('INSERT INTO besoeg (tid, dag, besoeger, side, fra, kilde, mobil) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [$nu, $dag, $besoeger, $side, $fra, $kilde, $mobil]);

    if (random_int(1, 200) === 1) {
        kør('DELETE FROM besoeg WHERE tid < ?', [$nu - BEHOLD_DAGE * 86400]);
    }
} catch (Throwable $e) {
    error_log('learnification besoeg: ' . $e->getMessage());
}
faerdig();
