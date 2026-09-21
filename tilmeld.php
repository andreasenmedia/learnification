<?php
/**
 * Tilmelding til spørgeskemaet om Regnehelten.
 *
 * Forældre, der har prøvet spillet, kan lægge deres mailadresse her, så de
 * kan få tilsendt ét spørgeskema bagefter. Adressen bliver skrevet i en
 * CSV-fil på webhotellet, og der kommer en besked på mail ved hver
 * tilmelding — så listen findes to steder, også hvis filen går tabt.
 *
 * Der bliver gemt så lidt som muligt: tidspunkt, mailadresse og hvilken
 * side tilmeldingen kom fra. Ingen IP-adresser, ingen cookies, ingen
 * tredjeparter.
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

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    svar(405, false, 'Tilmeldingen skal sendes fra formularen.');
}

// Fælden: et felt, som kun en robot udfylder. Den får pænt svar og
// ingenting gemt, så den ikke prøver igen med et andet trick.
if (trim((string) ($_POST['hjemmeside'] ?? '')) !== '') {
    svar(200, true, 'Tak! Du er skrevet op.');
}

$email = trim((string) ($_POST['email'] ?? ''));
$samtykke = isset($_POST['samtykke']);

if ($email === '') {
    svar(422, false, 'Skriv lige din mailadresse.');
}
if (strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    svar(422, false, 'Den mailadresse ser ikke rigtig ud. Prøv igen.');
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
        "Denne tilmelding kunne ikke skrives til en fil:\n\n$email\n\n"
        . "Tjek rettighederne paa data-mappen.\n",
        'From: Learnification <' . AFSENDER . ">\r\nContent-Type: text/plain; charset=utf-8"
    );
    svar(500, false, 'Der gik noget galt her hos os. Prøv igen om lidt, eller skriv til ' . MODTAGER . '.');
}

$fil = $mappe . '/tilmeldinger.csv';
$ny = !file_exists($fil);

$fh = @fopen($fil, 'c+');
if ($fh === false) {
    svar(500, false, 'Der gik noget galt her hos os. Prøv igen om lidt.');
}
flock($fh, LOCK_EX);

// Står adressen der allerede, skal den ikke stå der to gange
$allerede = false;
rewind($fh);
while (($linje = fgetcsv($fh)) !== false) {
    if (isset($linje[1]) && lille(trim($linje[1])) === $email) {
        $allerede = true;
        break;
    }
}

if (!$allerede) {
    fseek($fh, 0, SEEK_END);
    if ($ny) {
        fputcsv($fh, ['tidspunkt', 'email', 'side']);
    }
    fputcsv($fh, [date('c'), $email, $side]);
}

fflush($fh);
flock($fh, LOCK_UN);
fclose($fh);
@chmod($fil, 0640);

if ($allerede) {
    svar(200, true, 'Du står allerede på listen — så hører du fra os.');
}

@mail(
    MODTAGER,
    'Ny tilmelding til spoergeskemaet: ' . $email,
    "En foraelder har skrevet sig op til spoergeskemaet om Regnehelten.\n\n"
    . "Mail:      $email\n"
    . "Tidspunkt: " . date('d-m-Y H:i') . "\n"
    . "Fra siden: $side\n\n"
    . "Hele listen ligger i:\n$fil\n",
    'From: Learnification <' . AFSENDER . ">\r\nContent-Type: text/plain; charset=utf-8"
);

svar(200, true, 'Tak! Du er skrevet op — du hører fra os, når spørgeskemaet er klar.');
