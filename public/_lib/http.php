<?php
declare(strict_types=1);

/**
 * Small request helpers, matching the conventions already established in
 * public/contact.php. contact.php itself is left as-is (it works, and it
 * predates this directory) — this file exists because six new endpoints
 * need the same three helpers, and duplicating them six times is worse than
 * one shared file.
 */

function field(string $key): string
{
    return trim((string) ($_POST[$key] ?? $_GET[$key] ?? ''));
}

/** Strips CR/LF so a submitted value can never inject extra mail/HTTP headers. */
function headerSafe(string $value): string
{
    return trim(str_replace(["\r", "\n", "%0a", "%0d"], '', $value));
}

function redirect(string $path): never
{
    header('Location: ' . $path, true, 303);
    exit;
}
