<?php
/**
 * Påmindelsen, kørt af Simply.coms cronjob (Kontrolpanel → Website →
 * Cronjobs). Adressen med nøglen står på /admin#velkomst:
 *
 *   https://learnification.dk/api/paamind.php?noegle=<nøglen>
 *
 * Sæt den til at køre hver halve time (…:00 og …:30). Uden for kl. 9-19 gør
 * den ingenting, så ingen får mail midt om natten, og påmindelsen går først fra
 * kl. 16:30, så den lander, når folk er kommet hjem fra arbejde. Reglerne står i _velkomst.php. Den samme
 * kørsel gemmer dagens XP-stand og sender ugens fremskridtsmail (_xp.php),
 * hvis det er slået til under /admin#fremskridt.
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
$skemaer = skema_genforsoeg() + skema_indhent();
$s = paamind_tid_nu() ? paamind_koer('cron') : ['sendt' => 0, 'fejlet' => 0, 'fejl' => ''];
// XP-tavlen: dagens stand for børnene, og — hvis administratoren har slået det til — ugens fremskridtsmail
require_once __DIR__ . '/_xp.php';
xp_stand_alle();
$xp = xp_mail_cron();
echo $xp . ($skemaer > 0 ? "Spørgeskemaer sendt igen: $skemaer. " : '') . 'OK — sendt: ' . $s['sendt'] . ', fejlet: ' . $s['fejlet'] . ($s['fejl'] !== '' ? ' (' . $s['fejl'] . ')' : '') . "\n";
