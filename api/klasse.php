<?php
/**
 * Den voksnes side af sagen: klasser (eller familien) og elever.
 *
 *   GET  ?handling=oversigt     alt på kontoen: grupper, elever, spilletid
 *   POST ny_gruppe, ret_gruppe, slet_gruppe
 *   POST nye_elever             ét kaldenavn pr. linje
 *   POST ret_elev, slet_elev, ny_elevkode
 *
 * En skole har klasser, en familie har én gruppe, "Familien". Hvert barn
 * har sin egen kode (fx RAVN-4827) og logger ind med den alene.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

const MAKS_GRUPPER = 40;
const MAKS_ELEVER = 40;

$k = kraev_voksen();
$kid = (int) $k['id'];

/** Gruppen skal høre til den, der er logget ind — ellers er den der ikke. */
function min_gruppe(int $kid, int $id): array
{
    $g = en('SELECT * FROM grupper WHERE id = ? AND konto_id = ?', [$id, $kid]);
    if (!$g) {
        fejl('Den gruppe findes ikke.', 404);
    }
    return $g;
}

function min_elev(int $kid, int $id): array
{
    $e = en('SELECT e.* FROM elever e JOIN grupper g ON g.id = e.gruppe_id
             WHERE e.id = ? AND g.konto_id = ?', [$id, $kid]);
    if (!$e) {
        fejl('Den elev findes ikke.', 404);
    }
    return $e;
}

function klassetrin_ind(): ?int
{
    $t = input()['klassetrin'] ?? null;
    if ($t === null || $t === '') {
        return null;
    }
    $t = (int) $t;
    if ($t < 0 || $t > 10) {
        fejl('Klassetrin skal være fra 0 til 10.');
    }
    return $t;
}

$h = handling();

if ($h === 'oversigt') {
    $grupper = [];
    foreach (alle('SELECT * FROM grupper WHERE konto_id = ? ORDER BY klassetrin, navn', [$kid]) as $g) {
        $elever = [];
        foreach (alle('SELECT * FROM elever WHERE gruppe_id = ? ORDER BY kaldenavn', [$g['id']]) as $e) {
            $elever[] = ['id' => (int) $e['id'], 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon'],
                         'kode' => $e['kode'], 'tid' => spilletid('elev_id = ?', [$e['id']])];
        }
        $grupper[] = ['id' => (int) $g['id'], 'navn' => $g['navn'],
                      'klassetrin' => $g['klassetrin'] !== null ? (int) $g['klassetrin'] : null,
                      'elever' => $elever];
    }
    svar(['ok' => true,
          'konto' => ['id' => $kid, 'type' => $k['type'], 'navn' => $k['navn'], 'kontakt' => $k['kontakt'],
                      'bynavn' => $k['bynavn'], 'email' => $k['email'], 'status' => $k['status']],
          'grupper' => $grupper,
          'tid' => spilletid('konto_id = ?', [$kid]),
          'voksen_tid' => spilletid("konto_id = ? AND hvem = 'voksen'", [$kid]),
          'dage' => pr_dag('konto_id = ?', [$kid], 14),
          'spil' => SPIL]);
}

kraev_egen_side();

switch ($h) {

case 'ny_gruppe':
    $navn = felt('navn', 60);
    if (laengde($navn) < 1) {
        fejl('Giv klassen et navn, fx 4.B.');
    }
    if ((int) vaerdi('SELECT COUNT(*) FROM grupper WHERE konto_id = ?', [$kid]) >= MAKS_GRUPPER) {
        fejl('Der er ikke plads til flere klasser på kontoen. Skriv til ' . MODTAGER . '.');
    }
    kør('INSERT INTO grupper (konto_id, navn, klassetrin, kode, oprettet) VALUES (?, ?, ?, ?, ?)',
        [$kid, $navn, klassetrin_ind(), ny_kode(), time()]);
    svar(['ok' => true, 'id' => (int) db()->lastInsertId()]);

case 'ret_gruppe':
    $g = min_gruppe($kid, tal('id'));
    $navn = felt('navn', 60);
    if (laengde($navn) < 1) {
        fejl('Navnet må ikke være tomt.');
    }
    kør('UPDATE grupper SET navn = ?, klassetrin = ? WHERE id = ?', [$navn, klassetrin_ind(), $g['id']]);
    svar(['ok' => true]);

case 'slet_gruppe':
    $g = min_gruppe($kid, tal('id'));
    // Elevernes logins ryger med; spilletiden bliver stående uden navn
    kør('DELETE FROM grupper WHERE id = ?', [$g['id']]);
    svar(['ok' => true]);

case 'nye_elever':
    $g = min_gruppe($kid, tal('id'));
    $raa = (string) (input()['navne'] ?? '');
    $navne = [];
    foreach (preg_split('/[\r\n,;]+/', $raa) ?: [] as $n) {
        $n = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', $n) ?? '');
        $n = function_exists('mb_substr') ? mb_substr($n, 0, 30, 'UTF-8') : substr($n, 0, 30);
        if ($n !== '' && !in_array(lille($n), array_map('lille', $navne), true)) {
            $navne[] = $n;
        }
    }
    if (!$navne) {
        fejl('Skriv mindst ét navn.');
    }
    $findes = array_map('lille', array_column(
        alle('SELECT kaldenavn FROM elever WHERE gruppe_id = ?', [$g['id']]), 'kaldenavn'));
    if (count($findes) + count($navne) > MAKS_ELEVER) {
        fejl('Der kan højst være ' . MAKS_ELEVER . ' elever i en gruppe.');
    }
    $dubletter = array_values(array_filter($navne, fn($n) => in_array(lille($n), $findes, true)));
    if ($dubletter) {
        fejl('Der er allerede en, der hedder ' . implode(', ', $dubletter)
             . '. Skriv fx et forbogstav bagefter, så børnene kan kende forskel.');
    }
    db()->beginTransaction();
    foreach ($navne as $n) {
        kør('INSERT INTO elever (gruppe_id, kaldenavn, ikon, kode, oprettet) VALUES (?, ?, ?, ?, ?)',
            [$g['id'], $n, nyt_ikon((int) $g['id']), ny_elevkode(db()), time()]);
    }
    db()->commit();
    svar(['ok' => true, 'antal' => count($navne)]);

case 'ret_elev':
    $e = min_elev($kid, tal('id'));
    $navn = felt('kaldenavn', 30);
    if ($navn === '') {
        fejl('Navnet må ikke være tomt.');
    }
    if (vaerdi('SELECT 1 FROM elever WHERE gruppe_id = ? AND id != ? AND LOWER(kaldenavn) = ?',
               [$e['gruppe_id'], $e['id'], lille($navn)])) {
        fejl('Der er allerede en, der hedder sådan i gruppen.');
    }
    $ikon = felt('ikon', 8);
    if (!in_array($ikon, IKONER, true)) {
        $ikon = $e['ikon'];
    }
    kør('UPDATE elever SET kaldenavn = ?, ikon = ? WHERE id = ?', [$navn, $ikon, $e['id']]);
    svar(['ok' => true]);

case 'ny_elevkode':
    // Er barnets kode sluppet ud, får det en ny, og det bliver logget ud
    $e = min_elev($kid, tal('id'));
    $kode = ny_elevkode(db());
    kør('UPDATE elever SET kode = ? WHERE id = ?', [$kode, $e['id']]);
    kør('DELETE FROM logins WHERE elev_id = ?', [$e['id']]);
    svar(['ok' => true, 'kode' => $kode]);

case 'slet_elev':
    $e = min_elev($kid, tal('id'));
    kør('DELETE FROM elever WHERE id = ?', [$e['id']]);
    svar(['ok' => true]);
}

fejl('Ukendt handling.', 404);
