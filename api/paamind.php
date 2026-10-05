<?php
/**
 * Påmindelsen, kørt af Simply.coms cronjob (Kontrolpanel → Website →
 * Cronjobs). Adressen med nøglen står på /admin#velkomst:
 *
 *   https://learnification.dk/api/paamind.php?noegle=<nøglen>
 *
 * Sæt den til at køre hver time. Uden for kl. 9-19 gør den ingenting, så
 * ingen får mail midt om natten. Reglerne står i _velkomst.php.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';
require_once __DIR__ . '/_velkomst.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$noegle = (string) ($_GET['noegle'] ?? '');
if ($noegle === '' || !hash_equals(paamind_noegle(), $noegle)) {
    bremse('paamind', ip(), 10, 3600);
    http_response_code(403);
    exit("Forkert nøgle.\n");
}

// Noteres altid, så /admin kan se, at cronjobbet lever
paamind_gem_status(['cron' => time()]);

$time = (int) date('G');
if ($time < PAAMIND_TIMER[0] || $time >= PAAMIND_TIMER[1]) {
    exit('OK — uden for tidsrummet kl. ' . PAAMIND_TIMER[0] . '-' . PAAMIND_TIMER[1] . ", intet sendt.\n");
}

@set_time_limit(60);
require_once __DIR__ . '/_spoergeskema.php';
$skemaer = skema_genforsoeg();
$s = paamind_koer('cron');
echo ($skemaer > 0 ? "Spørgeskemaer sendt igen: $skemaer. " : '') . 'OK — sendt: ' . $s['sendt'] . ', fejlet: ' . $s['fejlet'] . ($s['fejl'] !== '' ? ' (' . $s['fejl'] . ')' : '') . "\n";
