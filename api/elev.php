<?php
/**
 * Barnets login: klassekode, og så et tryk på sit eget navn.
 *
 *   POST kode    {kode}             -> gruppens navn og elever
 *   POST login   {kode, elev_id}    -> logget ind
 *
 * Der er ingen kodeord til børn. Koden er det, der holder fremmede ude, og
 * derfor bliver gæt bremset hårdt: en klassekode har ca. 27.000 mulige
 * værdier, og med 30 forsøg i kvarteret pr. adresse tager det måneder at
 * ramme én ved at prøve sig frem.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

kraev_egen_side();

/** "ugle 472", "UGLE472" og "Ugle-472" er alle den samme kode. */
function ren_kode(string $s): string
{
    $s = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $s) ?? '');
    if (preg_match('/^([A-Z]+)([0-9]{3})$/', $s, $m)) {
        return $m[1] . '-' . $m[2];
    }
    return $s;
}

function find_gruppe(): array
{
    $kode = ren_kode(felt('kode', 30));
    $g = $kode === '' ? null : en('SELECT g.*, k.status, k.type FROM grupper g JOIN konti k ON k.id = g.konto_id
                                   WHERE g.kode = ?', [$kode]);
    if (!$g || $g['status'] === 'spaerret') {
        fejl('Den kode kender vi ikke. Tjek, at den er skrevet rigtigt — den står på jeres login-kort.', 404);
    }
    return $g;
}

switch (handling()) {

case 'kode':
    bremse('elevkode', ip(), 30, 900);
    $g = find_gruppe();
    $elever = alle('SELECT id, kaldenavn, ikon FROM elever WHERE gruppe_id = ? ORDER BY kaldenavn', [$g['id']]);
    if (!$elever) {
        fejl('Der er ikke sat nogen elever på ' . $g['navn'] . ' endnu. Spørg din lærer eller en voksen.', 404);
    }
    svar(['ok' => true, 'gruppe' => $g['navn'], 'kode' => $g['kode'],
          'elever' => array_map(fn($e) => ['id' => (int) $e['id'], 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon']], $elever)]);

case 'login':
    bremse('elevlogin', ip(), 60, 900);
    $g = find_gruppe();
    $e = en('SELECT * FROM elever WHERE id = ? AND gruppe_id = ?', [tal('elev_id'), $g['id']]);
    if (!$e) {
        fejl('Det navn findes ikke i gruppen længere. Prøv igen.', 404);
    }
    log_ind((int) $g['konto_id'], (int) $e['id'],
            $g['type'] === 'skole' ? SKOLEELEV_LEVETID : HJEMMEBARN_LEVETID);
    kør('UPDATE elever SET sidst_inde = ? WHERE id = ?', [time(), $e['id']]);
    svar(['ok' => true, 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon']]);
}

fejl('Ukendt handling.', 404);
