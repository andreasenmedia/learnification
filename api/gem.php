<?php
/**
 * Gemte spil, så et barn kan spille videre på en anden computer.
 *
 *   GET  ?handling=hent&spil=regnehelten         -> {ok, data|null, udgave}
 *   POST {handling: "gem", spil, data, udgave, enhed} -> {ok, udgave}
 *   POST {handling: "fortryd", spil, udgave, enhed}    -> {ok, data, udgave}  henter det, "Start forfra" slettede
 *
 * "Start forfra" sender {"slettet":true}. Før det overskriver det gemte, lægger vi det i `forrige`
 * (kun det mest fremskredne, og kun i 14 dage), så et barn kan fortryde et uheld i spillets menu.
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
const FORTRYD_DAGE = 14;

/** Groft mål for, hvor langt et gemt spil er nået: klarede kapitler tæller mest, så løste missioner */
function fremgang(?string $data): int
{
    $d = json_decode((string) $data, true);
    if (!is_array($d) || !empty($d['slettet'])) {
        return -1;
    }
    $n = 100 * count((array) ($d['klaret'] ?? []));
    foreach ((array) ($d['q'] ?? []) as $status) {
        if ($status === 'done') {
            $n++;
        }
    }
    return $n;
}

/** Det nulstillede spil, hvis det stadig kan fortrydes */
function forrige_aktuel(?array $gemt): ?array
{
    if (!$gemt || empty($gemt['forrige']) || (int) $gemt['forrige_tid'] < time() - FORTRYD_DAGE * 86400) {
        return null;
    }
    return ['tid' => (int) $gemt['forrige_tid'], 'data' => $gemt['forrige']];
}

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

$gemt = en('SELECT data, udgave, enhed, opdateret, forrige, forrige_tid FROM gemte_spil WHERE hvem = ? AND spil = ?', [$hvem, $spil]);

switch (handling()) {

case 'hent':
    $f = forrige_aktuel($gemt);
    $st = $f ? gemt_status($spil, $f['data'], 0) : null;
    svar(['ok' => true,
          'data' => $gemt ? $gemt['data'] : null,
          'udgave' => $gemt ? (int) $gemt['udgave'] : 0,
          'opdateret' => $gemt ? (int) $gemt['opdateret'] : null,
          'forrige' => $f ? ['tid' => $f['tid'], 'tekst' => $st ? $st['tekst'] : ''] : null]);

case 'fortryd':
    kraev_egen_side();
    $fra = felt('hvem', 40);
    if ($fra !== '' && $fra !== $hvem) {
        fejl('Der er logget ind som en anden nu.', 401);
    }
    $f = forrige_aktuel($gemt);
    if (!$f) {
        fejl('Der er ikke noget at fortryde.', 404);
    }
    $ny = (int) $gemt['udgave'] + 1;
    kør('UPDATE gemte_spil SET data = ?, udgave = ?, enhed = ?, opdateret = ?, forrige = NULL, forrige_tid = NULL WHERE hvem = ? AND spil = ?',
        [$f['data'], $ny, preg_replace('/[^0-9A-Za-z\-]/', '', felt('enhed', 40)) ?? '', time(), $hvem, $spil]);
    svar(['ok' => true, 'data' => $f['data'], 'udgave' => $ny]);

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
        // "Start forfra": gem det gamle til fortryd — men aldrig et næsten tomt spil oven i et bedre
        $forrige = $gemt['forrige'];
        $forrige_tid = $gemt['forrige_tid'];
        if (fremgang($data) === -1 && fremgang($gemt['data']) >= 0
            && (forrige_aktuel($gemt) === null || fremgang($gemt['data']) >= fremgang($gemt['forrige']))) {
            $forrige = $gemt['data'];
            $forrige_tid = time();
        }
        kør('UPDATE gemte_spil SET data = ?, udgave = ?, enhed = ?, opdateret = ?, forrige = ?, forrige_tid = ? WHERE hvem = ? AND spil = ?',
            [$data, $ny, $enhed, time(), $forrige, $forrige_tid, $hvem, $spil]);
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
