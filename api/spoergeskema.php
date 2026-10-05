<?php
/**
 * Spørgeskemaet (siden /spoergeskema). Nøglen i linket fra mailen er adgangen,
 * så det virker uden login — og kan besvares fra mobilen.
 *
 *   GET  ?handling=hent&n=<nøgle>        -> {ok, spoergsmaal, barn, spil, besvaret}
 *   POST {handling: "svar", n, svar:{…}} -> {ok}   (kun én gang pr. nøgle)
 *
 * "hent" sætter aabnet. Det sker ved GET, fordi mailprogrammer, der åbner
 * links for at tjekke dem, ikke kører siden og derfor ikke kalder API'et.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';
require_once __DIR__ . '/_spoergeskema.php';

header('X-Robots-Tag: noindex');

$n = preg_replace('/[^0-9a-f]/', '', strtolower(felt('n', 64))) ?? '';
bremse('skema', ip(), 60, 3600, false);
$s = strlen($n) === 32 ? en('SELECT * FROM spoergeskemaer WHERE noegle = ?', [$n]) : null;
if (!$s) {
    bremse('skema', ip(), 60, 3600);
    fejl('Linket virker ikke. Brug linket fra mailen, eller skriv til ' . MODTAGER . '.', 404);
}

switch (handling()) {

case 'hent':
    if ($s['aabnet'] === null) {
        kør('UPDATE spoergeskemaer SET aabnet = ? WHERE id = ?', [time(), $s['id']]);
    }
    $barn = $s['elev_id'] ? (string) vaerdi('SELECT kaldenavn FROM elever WHERE id = ?', [$s['elev_id']]) : '';
    $sp = [];
    foreach (SKEMA_SPOERGSMAAL as $nøgle => [$slags, $tekst, $valg]) {
        $sp[] = ['nøgle' => $nøgle, 'slags' => $slags, 'tekst' => $tekst, 'valg' => $valg];
    }
    svar(['ok' => true, 'spoergsmaal' => $sp, 'barn' => $barn, 'spil' => SPIL[$s['spil']] ?? '',
          'besvaret' => $s['besvaret'] !== null]);

case 'svar':
    kraev_egen_side();
    if ($s['besvaret'] !== null) {
        fejl('Skemaet er allerede besvaret — tak!', 409);
    }
    $svar = skema_rens((array) (input()['svar'] ?? []));
    if (count($svar) < 3) {
        fejl('Besvar mindst et par af spørgsmålene.');
    }
    // Kun den første indsendelse tæller (to faner, dobbeltklik)
    if (!kør('UPDATE spoergeskemaer SET svar = ?, besvaret = ? WHERE id = ? AND besvaret IS NULL',
             [json_encode($svar, JSON_UNESCAPED_UNICODE), time(), $s['id']])) {
        fejl('Skemaet er allerede besvaret — tak!', 409);
    }
    svar(['ok' => true]);
}

fejl('Ukendt handling.', 404);
