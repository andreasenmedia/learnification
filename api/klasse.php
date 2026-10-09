<?php
/**
 * Den voksnes side af sagen: klasser (eller familien) og elever.
 *
 *   GET  ?handling=oversigt     alt på kontoen: grupper, elever, spilletid
 *   POST ny_gruppe, ret_gruppe, slet_gruppe
 *   POST nye_elever             ét kaldenavn pr. linje
 *   POST ret_elev, slet_elev, ny_elevkode
 *   POST log_ind_som {id}       den voksne går ind som barnet (fx på familiens
 *                               tablet) — "tilbage" i api/konto.php henter den
 *                               voksne igen
 *
 * En skole har klasser, en familie har én gruppe, "Familien". Hvert barn
 * har sin egen kode (fx RAVN-4827) og logger ind med den alene. En konto
 * "til mig selv" har ingen børn — den bliver først familie eller skole med
 * skift_type i api/konto.php.
 *
 * Administratoren kan gøre det samme på en hvilken som helst konto ved at
 * sende "konto": <id> med (bruges af /admin).
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

const MAKS_GRUPPER = 40;
const MAKS_ELEVER = 40;

$k = kraev_voksen();
$som_admin = false;
if ($k['type'] === 'admin' && tal('konto') > 0) {
    $som_admin = true;
    $k = en("SELECT * FROM konti WHERE id = ? AND type != 'admin'", [tal('konto')]);
    if (!$k) {
        fejl('Kontoen findes ikke.', 404);
    }
}
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
    [$gemt, $voksen_gemt] = gemte_spil_paa_konto($kid);
    $grupper = [];
    foreach (alle('SELECT * FROM grupper WHERE konto_id = ? ORDER BY klassetrin, navn', [$kid]) as $g) {
        $elever = [];
        foreach (alle('SELECT * FROM elever WHERE gruppe_id = ? ORDER BY kaldenavn', [$g['id']]) as $e) {
            $elever[] = ['id' => (int) $e['id'], 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon'],
                         'kode' => $e['kode'], 'tid' => spilletid('elev_id = ?', [$e['id']]),
                         'gemt' => $gemt[(int) $e['id']] ?? (object) []];
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
          'voksen_gemt' => $voksen_gemt,
          // Den voksnes egen prøvetid — det er den, der tæller på en konto "til mig selv"
          'voksen_proeve' => tid_status(['konto' => $k, 'elev' => null]),
          'dage' => pr_dag('konto_id = ?', [$kid], 14),
          'spil' => SPIL]);
}

kraev_egen_side();

switch ($h) {

case 'ny_gruppe':
    // En konto "til mig selv" vælger først familie eller skole (konto.php, skift_type)
    if ($k['type'] === 'privat') {
        fejl('Vælg først, om kontoen skal være til en familie eller en skole.');
    }
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
    svar(['ok' => true, 'antal' => nye_elever((int) $g['id'], (string) (input()['navne'] ?? ''), MAKS_ELEVER)]);

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

case 'ret_navne':
    // Alle navnene i en klasse på én gang: {gruppe, navne: [{id, kaldenavn}]}
    $g = min_gruppe($kid, tal('gruppe'));
    $nye = [];
    foreach ((array) (input()['navne'] ?? []) as $x) {
        $x = (array) $x;
        $n = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', (string) ($x['kaldenavn'] ?? '')) ?? '');
        $n = function_exists('mb_substr') ? mb_substr($n, 0, 30, 'UTF-8') : substr($n, 0, 30);
        $e = min_elev($kid, (int) ($x['id'] ?? 0));
        if ((int) $e['gruppe_id'] !== (int) $g['id']) {
            fejl('Den elev hører ikke til klassen.');
        }
        if ($n === '') {
            fejl('Et navn må ikke være tomt.');
        }
        $nye[(int) $e['id']] = $n;
    }
    // Navnene skal være forskellige — også mod dem, der ikke bliver rettet
    $alle_navne = $nye;
    foreach (alle('SELECT id, kaldenavn FROM elever WHERE gruppe_id = ?', [$g['id']]) as $e) {
        if (!isset($alle_navne[(int) $e['id']])) {
            $alle_navne[(int) $e['id']] = $e['kaldenavn'];
        }
    }
    $set = array_map('lille', $alle_navne);
    if (count(array_unique($set)) < count($set)) {
        $dub = array_keys(array_filter(array_count_values($set), fn($c) => $c > 1));
        fejl('Der er to, der hedder det samme (' . implode(', ', array_map(fn($d) => ucfirst($d), $dub)) . '). Skriv fx et forbogstav bagefter.');
    }
    db()->beginTransaction();
    foreach ($nye as $id => $n) {
        kør('UPDATE elever SET kaldenavn = ? WHERE id = ?', [$n, $id]);
    }
    db()->commit();
    svar(['ok' => true, 'rettet' => count($nye)]);

case 'ny_elevkode':
    // Er barnets kode sluppet ud, får det en ny, og det bliver logget ud
    $e = min_elev($kid, tal('id'));
    $kode = ny_elevkode(db());
    kør('UPDATE elever SET kode = ? WHERE id = ?', [$kode, $e['id']]);
    kør('DELETE FROM logins WHERE elev_id = ?', [$e['id']]);
    svar(['ok' => true, 'kode' => $kode]);

case 'log_ind_som':
    // Kun kontoens egen voksne — administratoren skal ikke kunne gå ind som andres børn
    if ($som_admin) {
        fejl('Det kan kun den voksne på kontoen selv.', 403);
    }
    $e = min_elev($kid, tal('id'));
    // Den voksnes login bliver parkeret, så man kan komme tilbage igen
    log_ind_som_barn($kid, (int) $e['id'], $k['type'] === 'skole' ? SKOLEELEV_LEVETID : HJEMMEBARN_LEVETID);
    kør('UPDATE elever SET sidst_inde = ? WHERE id = ?', [time(), $e['id']]);
    svar(['ok' => true, 'kaldenavn' => $e['kaldenavn']]);

case 'slet_elev':
    $e = min_elev($kid, tal('id'));
    kør('DELETE FROM elever WHERE id = ?', [$e['id']]);
    svar(['ok' => true]);
}

fejl('Ukendt handling.', 404);
