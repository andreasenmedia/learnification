<?php
/**
 * Router til PHP's indbyggede testserver, så login-systemet kan prøves af
 * på egen maskine før upload — den opfører sig som Apache med .htaccess:
 *
 *   php -S 127.0.0.1:8792 tools/lokal-router.php
 *
 * og åbn http://127.0.0.1:8792/ (kør den fra projektets rodmappe).
 *
 * Pæne adresser (/login -> login.html), index.html i mapper, api/_*.php
 * og data/ spærret. Databasen havner i systemets midlertidige mappe, ikke
 * i projektet, så der aldrig ryger testdata med i repoet.
 *
 * Bliver ikke lagt op (tools/ er undtaget i deploy.yml).
 */

$rod = dirname(__DIR__);
if (!getenv('LF_DATAMAPPE')) {
    putenv('LF_DATAMAPPE=' . sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'learnification-lokal');
}

$sti = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');

if (preg_match('#^/api/_#', $sti) || preg_match('#^/data/#', $sti) || strpos($sti, '..') !== false) {
    http_response_code(403);
    echo 'Forbudt';
    return true;
}

$fil = $rod . $sti;

if (is_dir($fil)) {
    if (substr($sti, -1) !== '/') {
        header('Location: ' . $sti . '/', true, 301);
        return true;
    }
    $fil .= 'index.html';
} elseif (!is_file($fil) && is_file($fil . '.html')) {
    $fil .= '.html';
}

if (!is_file($fil)) {
    http_response_code(404);
    readfile($rod . '/404.html');
    return true;
}

if (substr($fil, -4) === '.php') {
    chdir(dirname($fil));
    require $fil;
    return true;
}

$typer = ['html' => 'text/html; charset=utf-8', 'css' => 'text/css', 'js' => 'application/javascript',
          'png' => 'image/png', 'svg' => 'image/svg+xml', 'json' => 'application/json', 'mp3' => 'audio/mpeg',
          'gz' => 'application/gzip', 'apk' => 'application/octet-stream', 'wasm' => 'application/wasm',
          'ogg' => 'audio/ogg', 'txt' => 'text/plain; charset=utf-8', 'ico' => 'image/x-icon'];
$endelse = strtolower(pathinfo($fil, PATHINFO_EXTENSION));
header('Content-Type: ' . ($typer[$endelse] ?? 'application/octet-stream'));
if (strpos($sti, '/spil/') === 0) {
    header('Cache-Control: no-cache, must-revalidate');
}
readfile($fil);
return true;
