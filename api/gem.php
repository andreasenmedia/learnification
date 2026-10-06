<?php
/**
 * Gemte spil, så et barn kan spille videre på en anden computer.
 *
 *   GET  ?handling=hent&spil=regnehelten         -> {ok, data|null, udgave}
 *   POST {handling: "gem", spil, data, udgave, enhed} -> {ok, udgave}
 *
 * Spillet gemmer hos den, der er logget ind: barnet på sin egen kode,
 * eller den voksne på sin konto. Der er ét gemt spil pr. spiller pr. spil.
 *
 * TO SKÆRME PÅ ÉN GANG. Spiller et barn videre på skolens computer, mens
 * fanen stadig står åben derhjemme, må den gamle fane ikke gemme oven i det
 * nye. Derfor sender siden altid med, hvilken udgave den byggede videre på.
 * Er der kommet en nyere udgave fra en anden skærm i mellemtiden, svarer vi
 * 409 og sender den nyeste med — så beder siden om at hente den.
 * "enhed" er et tilfældigt id pr. sideindlæsning: kommer den nyere udgave
 * fra samme skærm (fordi et svar gik tabt på nettet), er der ingen konflikt.
 *
 * Kan komme med fetch(keepalive), når fanen lukkes — den kan godt sætte
 * X-LF, så den kræves som alle andre steder, hvor der bliver ændret noget.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';
require_once __DIR__ . '/_spoergeskema.php';

const MAKS_DATA = 60000;   // tegn — et gemt Regnehelten fylder et par kB

$h = hvem();
if (!$h) {
    fejl('Ikke logget ind.', 401);
}
$spil = felt('spil', 30);
if (!isset(SPIL[$spil])) {
    fejl('Ukendt spil.');
}
$elev_id = $h['elev'] ? (int) $h['elev']['id'] : null;
$hvem = $elev_id ? 'elev.' . $elev_id : 'voksen.' . (int) $h['konto']['id'];

$gemt = en('SELECT data, udgave, enhed, opdateret FROM gemte_spil WHERE hvem = ? AND spil = ?', [$hvem, $spil]);

switch (handling()) {

case 'hent':
    svar(['ok' => true,
          'data' => $gemt ? $gemt['data'] : null,
          'udgave' => $gemt ? (int) $gemt['udgave'] : 0,
          'opdateret' => $gemt ? (int) $gemt['opdateret'] : null]);

case 'gem':
    kraev_egen_side();
    // Fanen husker, hvem den spillede som. Er der skiftet login imens (fx
    // "Tilbage til mig" fra barnet), må barnets spil ikke lande hos den voksne
    $fra = felt('hvem', 40);
    if ($fra !== '' && $fra !== $hvem) {
        fejl('Der er logget ind som en anden nu.', 401);
    }
    $data = input()['data'] ?? '';
    if (!is_string($data) || $data === '' || strlen($data) > MAKS_DATA) {
        fejl('Det gemte spil er tomt eller for stort.', 413);
    }
    if (!is_array(json_decode($data, true))) {
        fejl('Det ligner ikke et gemt spil.');
    }
    $udgave = tal('udgave');
    $enhed = preg_replace('/[^0-9A-Za-z\-]/', '', felt('enhed', 40)) ?? '';

    if ($gemt && (int) $gemt['udgave'] !== $udgave && $gemt['enhed'] !== $enhed) {
        svar(['ok' => false, 'konflikt' => true,
              'besked' => 'Der er spillet videre på en anden skærm.',
              'data' => $gemt['data'], 'udgave' => (int) $gemt['udgave']], 409);
    }

    // Blev spillet lige nu klaret til ende (sidste kapitel)? Så får kontoen spørgeskemaet
    $var_faerdig = $gemt && ($st = gemt_status($spil, $gemt['data'], 0)) && $st['faerdig'];
    $nu_faerdig = ($st = gemt_status($spil, $data, 0)) && $st['faerdig'];

    $ny = $gemt ? (int) $gemt['udgave'] + 1 : 1;
    if ($gemt) {
        kør('UPDATE gemte_spil SET data = ?, udgave = ?, enhed = ?, opdateret = ? WHERE hvem = ? AND spil = ?',
            [$data, $ny, $enhed, time(), $hvem, $spil]);
    } else {
        kør('INSERT INTO gemte_spil (konto_id, elev_id, hvem, spil, data, udgave, enhed, opdateret)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [(int) $h['konto']['id'], $elev_id, $hvem, $spil, $data, $ny, $enhed, time()]);
    }
    if ($nu_faerdig && !$var_faerdig) {
        skema_udloes((int) $h['konto']['id'], 'faerdig', $elev_id, $spil);
    }
    svar(['ok' => true, 'udgave' => $ny]);
}

fejl('Ukendt handling.', 404);
