<?php
/**
 * Barnets login: sin egen kode, fx RAVN-4827, og så er man inde.
 *
 *   POST login   {kode}   -> logget ind
 *
 * Der er ingen kodeord til børn. Koden er både navn og nøgle, så et barn
 * kan ikke komme ind som en klassekammerat. Den står på barnets login-kort.
 *
 * Gæt bliver bremset: der er 30 dyr x 9.000 tal = 270.000 mulige koder, og
 * kun de forkerte forsøg tæller — 30 pr. kvarter pr. adresse. Så kan en hel
 * klasse bag skolens ene IP-adresse logge ind på én gang, mens det at ramme
 * et bestemt barns kode ved at prøve sig frem tager måneder fra én adresse.
 * Rammer nogen en tilfældig kode, får de et kaldenavn og et spil at spille —
 * ikke andet. Er en kode sluppet ud, laver den voksne en ny under /konto.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

kraev_egen_side();

/** "ravn 4827", "RAVN4827" og "Ravn-4827" er alle den samme kode. */
function ren_kode(string $s): string
{
    $s = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $s) ?? '');
    if (preg_match('/^([A-Z]+)([0-9]{3,4})$/', $s, $m)) {
        return $m[1] . '-' . $m[2];
    }
    return $s;
}

switch (handling()) {

case 'login':
    bremse('elevlogin', ip(), 30, 900, false);
    $kode = ren_kode(felt('kode', 30));
    $e = $kode === '' ? null : en('SELECT e.*, g.konto_id, k.status, k.type FROM elever e
                                   JOIN grupper g ON g.id = e.gruppe_id
                                   JOIN konti k ON k.id = g.konto_id
                                   WHERE e.kode = ?', [$kode]);
    if (!$e || $e['status'] === 'spaerret') {
        noter_forsoeg('elevlogin', ip());
        // Klassens kode (tre cifre) virkede før. Så er det et gammelt kort.
        if (preg_match('/^[A-Z]+-[0-9]{3}$/', $kode)) {
            fejl('Nu har hver elev sin egen kode. Spørg din lærer eller en voksen om dit nye login-kort.', 404);
        }
        fejl('Den kode kender vi ikke. Tjek, at den er skrevet rigtigt — den står på dit login-kort.', 404);
    }
    log_ind((int) $e['konto_id'], (int) $e['id'],
            $e['type'] === 'skole' ? SKOLEELEV_LEVETID : HJEMMEBARN_LEVETID);
    kør('UPDATE elever SET sidst_inde = ? WHERE id = ?', [time(), $e['id']]);
    svar(['ok' => true, 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon']]);
}

fejl('Ukendt handling.', 404);
