<?php
/**
 * Tilmelding til testen af Regnehelten.
 *
 * Den voksne skriver navn, mailadresse og eventuelt mobilnummer, inden
 * spillet kan gå i gang på /spil/. Oplysningerne bliver skrevet i en
 * CSV-fil på webhotellet, og der kommer en besked på mail ved hver
 * tilmelding — så listen findes to steder, også hvis filen går tabt.
 *
 * Der bliver gemt: tidspunkt, navn, mailadresse, mobilnummer (hvis det er
 * givet) og hvilken side tilmeldingen kom fra. Ikke andet. Ingen
 * IP-adresser, ingen cookies, ingen tredjeparter.
 *
 * Filen ligger helst UDEN FOR public_html, så den ikke kan hentes ned af
 * andre. Kan den ikke skrives der, ryger den i public_html/data/, som er
 * spærret af sin egen .htaccess.
 */

declare(strict_types=1);

// Hvem får besked, når nogen melder sig til. Skal du have det et andet
// sted hen, er det kun denne linje, der skal rettes.
const MODTAGER = 'kontakt@learnification.dk';
const AFSENDER = 'no-reply@learnification.dk';

// Rækkefølgen i CSV-filen. Laves den om, bliver den gamle fil lagt til
// side, så de to formater ikke ender i samme fil.
const KOLONNER = ['tidspunkt', 'navn', 'email', 'mobil', 'side'];

date_default_timezone_set('Europe/Copenhagen');

/**
 * Svar tilbage — som JSON til formularen, eller som en omdirigering,
 * hvis nogen har slået JavaScript fra.
 */
function svar(int $kode, bool $ok, string $besked): void
{
    $vil_json = (
        (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'fetch')
        || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
    );

    if ($vil_json) {
        http_response_code($kode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'besked' => $besked], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Uden JavaScript: tilbage til siden, man kom fra, med svaret i adressen.
    // Adressen skal starte med ét skråstreg og intet andet — ellers kunne
    // nogen sende folk videre til en fremmed side via vores egen formular.
    $tilbage = '/spil/';
    $ønsket = (string) ($_POST['side'] ?? '');
    if ($ønsket !== '' && $ønsket[0] === '/' && strpos($ønsket, '//') !== 0
            && strpbrk($ønsket, "\r\n") === false && strlen($ønsket) <= 120) {
        $tilbage = $ønsket;
    }
    $tilbage .= (strpos($tilbage, '?') === false ? '?' : '&')
        . 'tilmeldt=' . ($ok ? 'ja' : 'nej')
        . '&besked=' . rawurlencode($besked) . '#skriv-op';
    header('Location: ' . $tilbage, true, 303);
    exit;
}

/** Små bogstaver, også hvis mbstring ikke er slået til på serveren. */
function lille(string $s): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

/** Væk med linjeskift og andet, der ikke hører hjemme i en celle. */
function ryd(string $s): string
{
    $s = str_replace(["\r", "\n", "\t"], ' ', $s);
    $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s) ?? '';
    return trim(preg_replace('/ {2,}/', ' ', $s) ?? '');
}

/** Find en mappe, der kan skrives i — helst uden for public_html. */
function find_mappe(): ?string
{
    $bud = [dirname(__DIR__) . '/learnification-data', __DIR__ . '/data'];
    foreach ($bud as $mappe) {
        if (!is_dir($mappe)) {
            @mkdir($mappe, 0750, true);
        }
        if (is_dir($mappe) && is_writable($mappe)) {
            return $mappe;
        }
    }
    return null;
}

/**
 * Er filen skrevet med andre kolonner end dem, vi bruger nu, bliver den
 * lagt til side med en dato bagpå. Så bliver gamle tilmeldinger ikke
 * blandet sammen med nye — og ingenting bliver slettet.
 */
function ryd_op_i_gammelt_format(string $fil): void
{
    if (!file_exists($fil) || filesize($fil) === 0) {
        return;
    }
    $fh = @fopen($fil, 'r');
    if ($fh === false) {
        return;
    }
    $første = fgetcsv($fh);
    fclose($fh);
    if ($første !== false && $første !== null && $første === KOLONNER) {
        return;
    }
    @rename($fil, substr($fil, 0, -4) . '-tidligere-' . date('Y-m-d-His') . '.csv');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    svar(405, false, 'Tilmeldingen skal sendes fra formularen.');
}

// Fælden: et felt, som kun en robot udfylder. Den får pænt svar og
// ingenting gemt, så den ikke prøver igen med et andet trick.
if (trim((string) ($_POST['hjemmeside'] ?? '')) !== '') {
    svar(200, true, 'Tak! I er skrevet op.');
}

$navn = ryd((string) ($_POST['navn'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$mobil = ryd((string) ($_POST['mobil'] ?? ''));
$samtykke = isset($_POST['samtykke']);

if ($navn === '' || strlen($navn) < 2) {
    svar(422, false, 'Skriv lige dit navn.');
}
if (strlen($navn) > 80) {
    svar(422, false, 'Det navn er for langt — de første 80 tegn er rigeligt.');
}
if ($email === '') {
    svar(422, false, 'Skriv lige din mailadresse.');
}
if (strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    svar(422, false, 'Den mailadresse ser ikke rigtig ud. Prøv igen.');
}
if ($mobil !== '') {
    // Mobilnummer er frivilligt, men er der skrevet noget, skal det ligne
    // et telefonnummer: cifre, mellemrum, plus og bindestreger.
    $kun_tal = preg_replace('/[^0-9]/', '', $mobil) ?? '';
    if (!preg_match('/^[0-9 +\-()]{6,25}$/', $mobil) || strlen($kun_tal) < 6 || strlen($kun_tal) > 15) {
        svar(422, false, 'Det mobilnummer ser ikke rigtigt ud. Du kan også bare lade feltet stå tomt.');
    }
}
if (!$samtykke) {
    svar(422, false, 'Sæt lige flueben i, at vi må skrive til dig.');
}

$email = lille($email);
$side = (string) ($_POST['side'] ?? '');
if (strpos($side, '/') !== 0 || strlen($side) > 120) {
    $side = '-';
}

$mappe = find_mappe();
if ($mappe === null) {
    // Så er der noget galt med rettighederne. Mailen er redningsplanken.
    @mail(
        MODTAGER,
        'Tilmelding (kunne IKKE gemmes): ' . $email,
        "Denne tilmelding kunne ikke skrives til en fil:\n\n"
        . "Navn:  $navn\nMail:  $email\nMobil: " . ($mobil !== '' ? $mobil : '-') . "\n\n"
        . "Tjek rettighederne paa data-mappen.\n",
        'From: Learnification <' . AFSENDER . ">\r\nContent-Type: text/plain; charset=utf-8"
    );
    svar(500, false, 'Der gik noget galt her hos os. Prøv igen om lidt, eller skriv til ' . MODTAGER . '.');
}

$fil = $mappe . '/tilmeldinger.csv';
ryd_op_i_gammelt_format($fil);
$ny = !file_exists($fil) || filesize($fil) === 0;

$fh = @fopen($fil, 'c+');
if ($fh === false) {
    svar(500, false, 'Der gik noget galt her hos os. Prøv igen om lidt.');
}
flock($fh, LOCK_EX);

// Står adressen der allerede, skal den ikke stå der to gange
$allerede = false;
rewind($fh);
while (($linje = fgetcsv($fh)) !== false) {
    if (isset($linje[2]) && lille(trim($linje[2])) === $email) {
        $allerede = true;
        break;
    }
}

if (!$allerede) {
    fseek($fh, 0, SEEK_END);
    if ($ny) {
        fputcsv($fh, KOLONNER);
    }
    fputcsv($fh, [date('c'), $navn, $email, $mobil, $side]);
}

fflush($fh);
flock($fh, LOCK_UN);
fclose($fh);
@chmod($fil, 0640);

if ($allerede) {
    svar(200, true, 'I står allerede på listen — så hører I fra os.');
}

@mail(
    MODTAGER,
    'Ny tester af Regnehelten: ' . $navn,
    "En voksen har skrevet sig op til testen af Regnehelten.\n\n"
    . "Navn:      $navn\n"
    . "Mail:      $email\n"
    . "Mobil:     " . ($mobil !== '' ? $mobil : '(ikke oplyst)') . "\n"
    . "Tidspunkt: " . date('d-m-Y H:i') . "\n"
    . "Fra siden: $side\n\n"
    . "Hele listen ligger i:\n$fil\n",
    'From: Learnification <' . AFSENDER . ">\r\nContent-Type: text/plain; charset=utf-8"
);

svar(200, true, 'Tak! I er skrevet op — så er spillet klar.');
