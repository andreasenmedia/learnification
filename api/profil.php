<?php
/**
 * Barnets figur: navn, udseende og låst tøj. Fælles for alle spil og
 * Eventyrbiblioteket, så det er den samme figur, man spiller som overalt.
 *
 *   GET  ?handling=hent        -> {ok, data|null}
 *   POST {handling: "gem", data, hvem}  -> {ok}
 *
 *   POST {handling: "oplaes", til}      -> {ok}  barnet slår "Læs opgaver op" til/fra
 *
 * Ét lille JSON-objekt pr. spiller (barnet på sin kode, den voksne på sin
 * konto). Sidste skrivning vinder — profilen er lille, og der er ingen
 * konflikter at tage hensyn til som i api/gem.php.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

const MAKS_PROFIL = 16000;   // tegn

$h = hvem();
if (!$h) {
    fejl('Ikke logget ind.', 401);
}
$elev_id = $h['elev'] ? (int) $h['elev']['id'] : null;
$hvem = $elev_id ? 'elev.' . $elev_id : 'voksen.' . (int) $h['konto']['id'];

switch (handling()) {

case 'hent':
    $r = en('SELECT data FROM profiler WHERE hvem = ?', [$hvem]);
    svar(['ok' => true, 'data' => $r ? $r['data'] : null]);

case 'oplaes':
    // Barnet slår "Læs opgaver op" til/fra i spillets menu. Voksne spillere gemmer kun lokalt.
    kraev_egen_side();
    if (!$elev_id) {
        svar(['ok' => true]);
    }
    kør('UPDATE elever SET oplaes = ? WHERE id = ?', [!empty(input()['til']) ? 1 : 0, $elev_id]);
    svar(['ok' => true]);

case 'gem':
    kraev_egen_side();
    $fra = felt('hvem', 40);
    if ($fra !== '' && $fra !== $hvem) {
        fejl('Der er logget ind som en anden nu.', 401);
    }
    $data = input()['data'] ?? '';
    if (!is_string($data) || $data === '' || strlen($data) > MAKS_PROFIL) {
        fejl('Profilen er tom eller for stor.', 413);
    }
    if (!is_array(json_decode($data, true))) {
        fejl('Det ligner ikke en profil.');
    }
    if (en('SELECT 1 AS x FROM profiler WHERE hvem = ?', [$hvem])) {
        kør('UPDATE profiler SET data = ?, opdateret = ? WHERE hvem = ?', [$data, time(), $hvem]);
    } else {
        kør('INSERT INTO profiler (konto_id, elev_id, hvem, data, opdateret) VALUES (?, ?, ?, ?, ?)',
            [(int) $h['konto']['id'], $elev_id, $hvem, $data, time()]);
    }
    svar(['ok' => true]);
}

fejl('Ukendt handling.', 404);
