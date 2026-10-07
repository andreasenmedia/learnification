<?php
/**
 * Spilletid. Siden omkring spillet (assets/spilletid.js) tæller de
 * sekunder, hvor spillet er fremme på skærmen OG nogen har rørt tastatur,
 * mus eller skærm inden for de sidste to minutter, og sender dem hertil
 * hvert halve minut:
 *
 *   POST {handling: "puls", spil, id, sek}   -> {ok, id, tid}
 *
 * tid = prøvetiden (tid_status() i _kerne.php): {graense_sek, brugt_sek,
 * tilbage_sek, slut}. Spillet viser en slutskærm, når slut er sand.
 *
 * Første puls har intet id; så bliver der startet en ny omgang, og id'et
 * kommer retur. Har en omgang ligget stille i over en halv time, bliver
 * der også startet en ny — så "gange" i overblikket betyder noget.
 *
 * En spiller kan aldrig få talt mere tid, end uret går — heller ikke med
 * spillet åbent i flere faner (hver fane er sin egen omgang).
 *
 * Pulsen kan komme med navigator.sendBeacon, når fanen bliver lukket, og
 * den kan ikke sætte egne headers. Derfor kræves X-LF ikke her — det
 * eneste, en fremmed side kunne opnå, er at lægge lidt tid til en omgang,
 * som den ikke kender id'et på.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';
require_once __DIR__ . '/_spoergeskema.php';

const MAKS_PR_PULS = 90;       // sekunder
const PAUSE_NY_OMGANG = 1800;  // sekunder

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fejl('Det skal sendes, ikke hentes.', 405);
}
if (handling() !== 'puls') {
    fejl('Ukendt handling.', 404);
}

$h = hvem();
if (!$h) {
    fejl('Ikke logget ind.', 401);
}
$spil = felt('spil', 30);
if (!isset(SPIL[$spil])) {
    fejl('Ukendt spil.');
}

$konto_id = (int) $h['konto']['id'];
$elev_id = $h['elev'] ? (int) $h['elev']['id'] : null;
$nu = time();
$sek = max(0, tal('sek'));

$s = null;
if (tal('id') > 0) {
    $s = en('SELECT * FROM sessioner WHERE id = ? AND konto_id = ? AND spil = ? AND '
            . ($elev_id ? 'elev_id = ?' : 'elev_id IS NULL'),
            array_merge([tal('id'), $konto_id, $spil], $elev_id ? [$elev_id] : []));
    if ($s && $nu - (int) $s['sidst'] > PAUSE_NY_OMGANG) {
        $s = null;
    }
}

// Spillerens seneste puls på tværs af ALLE omgange. Har barnet spillet åbent
// i to faner (eller begge spil side om side), har hver fane sin egen omgang,
// og uden det her ville tiden løbe dobbelt så hurtigt som uret.
$seneste = en('SELECT id, sidst FROM sessioner WHERE '
              . ($elev_id ? 'elev_id = ?' : "konto_id = ? AND elev_id IS NULL AND hvem = 'voksen'")
              . ' ORDER BY sidst DESC, id DESC LIMIT 1', [$elev_id ?: $konto_id]);
$anden_fane = $seneste && (!$s || (int) $seneste['id'] !== (int) $s['id'])
              && $nu - (int) $seneste['sidst'] < MAKS_PR_PULS;

if (!$s) {
    kør('INSERT INTO sessioner (konto_id, elev_id, hvem, spil, start, sidst, sekunder) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [$konto_id, $elev_id, $elev_id ? 'elev' : 'voksen', $spil, $nu, $nu]);
    $s = ['id' => (int) db()->lastInsertId(), 'sidst' => $nu];
    // En ny omgang kan ikke have mere tid med, end én puls kan bære
    $sek = min($sek, MAKS_PR_PULS);
} else {
    // Aldrig mere tid, end der rent faktisk er gået siden sidst
    $sek = min($sek, $nu - (int) $s['sidst'] + 10, MAKS_PR_PULS);
}
if ($anden_fane) {
    // En anden fane har lige talt tiden op til $seneste['sidst'] — kun det,
    // der er gået siden, er nyt
    $sek = min($sek, max(0, $nu - (int) $seneste['sidst']));
}

// Prøvetiden: aldrig mere tid end der er tilbage (tid_status() i _kerne.php).
// Er den allerede brugt, tælles der ikke videre — og kommer der en puls, hvor
// grænsen lige er nået, går spørgeskemaet af sted (kun første gang pr. konto).
$for = tid_status($h);
if ($for['tilbage_sek'] !== null) {
    $sek = min($sek, $for['tilbage_sek']);
}

kør('UPDATE sessioner SET sekunder = sekunder + ?, sidst = ? WHERE id = ?', [$sek, $nu, $s['id']]);
if ($elev_id) {
    kør('UPDATE elever SET sidst_inde = ? WHERE id = ?', [$nu, $elev_id]);
}

$efter = tid_status($h);
if ($efter['slut']) {
    // skema_udloes gør selv ingenting, hvis kontoen har fået det før
    skema_udloes($konto_id, 'tid', $elev_id, $spil);
}
svar(['ok' => true, 'id' => (int) $s['id'], 'tid' => $efter]);
