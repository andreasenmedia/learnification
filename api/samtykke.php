<?php
/**
 * Bevis for cookie-samtykke. assets/samtykke.js sender hertil, hver gang
 * nogen trykker i banneret eller i cookie-indstillingerne:
 *
 *   POST {id, valg, s, m, v, side}   ->  204
 *
 *   id    tilfældigt id, som også står i cookien lf_samtykke
 *   valg  'tillad_alle', 'afvis_alle' eller 'valgt'
 *   s, m  1/0 for statistik og markedsføring
 *   v     versionen af teksten, der blev sagt ja/nej til
 *
 * Der bliver ikke gemt IP-adresse eller andet, der peger på en person —
 * kun at "id X sagde det her på det tidspunkt". Linjerne bliver slettet
 * efter 3 år (samtykket gælder i 12 måneder, og så er der tid til at kunne
 * dokumentere det bagefter).
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

const BEHOLD_SAMTYKKE_DAGE = 3 * 365;

function faerdig(): void
{
    http_response_code(204);
    header('Cache-Control: no-store');
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    faerdig();
}
$d = json_decode((string) file_get_contents('php://input', false, null, 0, 1000), true);
if (!is_array($d)) {
    faerdig();
}
$id = (string) ($d['id'] ?? '');
$valg = (string) ($d['valg'] ?? '');
if (!preg_match('/^[0-9a-f]{16}$/', $id) || !in_array($valg, ['tillad_alle', 'afvis_alle', 'valgt'], true)) {
    faerdig();
}
$side = (string) ($d['side'] ?? '');
if (!preg_match('~^/[a-z0-9/\-]{0,60}$~', $side)) {
    $side = '';
}

try {
    bremse('samtykke', ip(), 30, 3600);
    kør('INSERT INTO samtykker (samtykke_id, tid, valg, statistik, markedsfoering, version, side)
         VALUES (?, ?, ?, ?, ?, ?, ?)',
        [$id, time(), $valg, empty($d['s']) ? 0 : 1, empty($d['m']) ? 0 : 1,
         max(1, min(99, (int) ($d['v'] ?? 1))), $side]);
    if (random_int(1, 100) === 1) {
        kør('DELETE FROM samtykker WHERE tid < ?', [time() - BEHOLD_SAMTYKKE_DAGE * 86400]);
    }
} catch (Throwable $e) {
    error_log('learnification samtykke: ' . $e->getMessage());
}
faerdig();
