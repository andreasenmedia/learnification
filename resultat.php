<?php
/**
 * Resultater fra en testomgang af Regnehelten.
 *
 * Spillet sender af sted, når en runde er ovre og når spillet er færdigt,
 * og siden omkring spillet sender med sendBeacon, hvis fanen bliver lukket
 * midt i det hele. Den samme omgang kan altså melde sig flere gange — den
 * bliver kendt på sit id og opdateret, ikke lagt til igen.
 *
 * To filer bliver skrevet, ved siden af tilmeldingerne:
 *
 *   resultater.csv              én linje pr. omgang — overblikket
 *   resultater/<id>.json        hele omgangen, opgave for opgave
 *
 * Der bliver ikke gemt IP-adresser, og der bliver ikke sat cookies.
 * Navnet er dét, barnet skrev i spillet, og det er ikke andet end et
 * fornavn — men det er stadig et barns oplysninger, og filen hører derfor
 * til uden for public_html sammen med tilmeldingerne.
 */

declare(strict_types=1);

const MODTAGER = 'kontakt@learnification.dk';
const AFSENDER = 'no-reply@learnification.dk';
const MAX_BYTES = 200000;

const KOLONNER = ['tidspunkt', 'navn', 'klasse', 'trin', 'opgaver',
                  'foerste_forsoeg', 'procent', 'regnekraft', 'minutter',
                  'kapitel', 'faerdig', 'id'];

date_default_timezone_set('Europe/Copenhagen');

function farvel(int $kode, string $besked): void
{
    http_response_code($kode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => $kode < 400, 'besked' => $besked], JSON_UNESCAPED_UNICODE);
    exit;
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

function ryd(string $s, int $hoejst = 120): string
{
    $s = str_replace(["\r", "\n", "\t"], ' ', $s);
    $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s) ?? '';
    return substr(trim($s), 0, $hoejst);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    farvel(405, 'Resultater sendes fra spillet.');
}

$raa = file_get_contents('php://input');
if ($raa === false || $raa === '' || strlen($raa) > MAX_BYTES) {
    farvel(400, 'Tomt eller alt for stort.');
}

$d = json_decode($raa, true);
if (!is_array($d) || empty($d['id'])) {
    farvel(400, 'Det ligner ikke et resultat.');
}

$id = preg_replace('/[^0-9A-Za-z\-]/', '', (string) $d['id']);
if ($id === '' || strlen($id) > 40) {
    farvel(400, 'Ugyldigt id.');
}

$mappe = find_mappe();
if ($mappe === null) {
    farvel(500, 'Kunne ikke gemme.');
}

// 1. Hele omgangen, opgave for opgave
$detaljer = $mappe . '/resultater';
if (!is_dir($detaljer)) {
    @mkdir($detaljer, 0750, true);
}
if (is_dir($detaljer) && is_writable($detaljer)) {
    @file_put_contents($detaljer . '/' . $id . '.json',
                       json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
                       LOCK_EX);
    @chmod($detaljer . '/' . $id . '.json', 0640);
}

// 2. Overblikket: én linje pr. omgang, som bliver opdateret undervejs
$faerdig = !empty($d['faerdig']);
$linje = [
    date('c'),
    ryd((string) ($d['navn'] ?? ''), 60),
    (string) (int) ($d['klasse'] ?? 0),
    ryd((string) ($d['trin'] ?? ''), 40),
    (string) (int) ($d['opgaver'] ?? 0),
    (string) (int) ($d['foerste_forsoeg'] ?? 0),
    (string) (int) ($d['procent'] ?? 0),
    (string) (int) ($d['regnekraft'] ?? 0),
    (string) (float) ($d['minutter'] ?? 0),
    (string) (int) ($d['kapitel'] ?? 0),
    $faerdig ? 'ja' : 'nej',
    $id,
];

$fil = $mappe . '/resultater.csv';
$fh = @fopen($fil, 'c+');
if ($fh === false) {
    farvel(500, 'Kunne ikke skrive listen.');
}
flock($fh, LOCK_EX);

$rk = [];
rewind($fh);
while (($r = fgetcsv($fh)) !== false) {
    if ($r === [null] || $r === false) {
        continue;
    }
    $rk[] = $r;
}

// Er overskriften en anden end vores, hører filen til et ældre format
if ($rk && $rk[0] !== KOLONNER) {
    flock($fh, LOCK_UN);
    fclose($fh);
    @rename($fil, substr($fil, 0, -4) . '-tidligere-' . date('Y-m-d-His') . '.csv');
    $fh = @fopen($fil, 'c+');
    if ($fh === false) {
        farvel(500, 'Kunne ikke skrive listen.');
    }
    flock($fh, LOCK_EX);
    $rk = [];
}

if (!$rk) {
    $rk[] = KOLONNER;
}

// Samme omgang må kun stå én gang: find den på id'et i sidste kolonne
$fundet = false;
$sidst = count(KOLONNER) - 1;
foreach ($rk as $i => $r) {
    if ($i > 0 && isset($r[$sidst]) && $r[$sidst] === $id) {
        $rk[$i] = $linje;
        $fundet = true;
        break;
    }
}
if (!$fundet) {
    $rk[] = $linje;
}

ftruncate($fh, 0);
rewind($fh);
foreach ($rk as $r) {
    fputcsv($fh, $r);
}
fflush($fh);
flock($fh, LOCK_UN);
fclose($fh);
@chmod($fil, 0640);

// 3. En besked på mail, når en omgang er spillet færdig. Undervejs ville
//    det blive til en strøm af mails om det samme.
if ($faerdig) {
    $navn = ryd((string) ($d['navn'] ?? '?'), 60);
    $krop = "En omgang Regnehelten er spillet faerdig.\n\n"
        . "Navn:            $navn\n"
        . "Klassetrin:      " . (int) ($d['klasse'] ?? 0) . ". klasse\n"
        . "Opgaver:         " . (int) ($d['opgaver'] ?? 0) . "\n"
        . "Klaret i 1. forsoeg: " . (int) ($d['foerste_forsoeg'] ?? 0)
        . "  (" . (int) ($d['procent'] ?? 0) . " %)\n"
        . "Regnekraft:      " . (int) ($d['regnekraft'] ?? 0) . " %\n"
        . "Tid:             " . (float) ($d['minutter'] ?? 0) . " minutter\n\n";
    if (!empty($d['emner']) && is_array($d['emner'])) {
        $krop .= "Fordelt paa emner:\n";
        foreach ($d['emner'] as $emne => $tal) {
            $krop .= sprintf("  %-14s %d opgaver, %d i foerste forsoeg\n",
                             ryd((string) $emne, 14),
                             (int) ($tal['opgaver'] ?? 0),
                             (int) ($tal['foerste'] ?? 0));
        }
    }
    $krop .= "\nHele omgangen, opgave for opgave:\n$detaljer/$id.json\n"
        . "Overblikket over alle omgange:\n$fil\n";
    @mail(MODTAGER, "Regnehelten spillet faerdigt: $navn", $krop,
          'From: Learnification <' . AFSENDER . ">\r\nContent-Type: text/plain; charset=utf-8");
}

farvel(200, 'Tak for resultatet.');
