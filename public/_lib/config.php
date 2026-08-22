<?php
declare(strict_types=1);

/**
 * Loads every secret this backend needs — Paystack keys, database
 * credentials, the CSRF signing secret — from a single place kept outside
 * this repository. Nothing here is ever committed with a real value.
 *
 * Resolution order:
 *   1. Environment variables (PAYSTACK_SECRET_KEY, DB_HOST, ...) — used for
 *      local development and any environment that sets them directly.
 *   2. A plain PHP file one level ABOVE public_html — on Hostinger this is a
 *      sibling directory in the account's home folder, which Apache never
 *      serves regardless of any .htaccess rule. This is the production path.
 *   3. Fallback: the same file inside public/config/, denied by an explicit
 *      <FilesMatch> rule in public/.htaccess — only if the hosting account
 *      restricts file access to inside public_html.
 *
 * See public/config/radiant-alpha.php.example for the exact shape expected.
 * Fails closed (HTTP 500, no further execution) if nothing is found — a
 * payment endpoint must never run with a silently-missing key.
 */
function appConfig(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $env = static function (string $key): ?string {
        $value = getenv($key);
        return $value === false || $value === '' ? null : $value;
    };

    $fromEnv = [
        'paystack_secret_key' => $env('PAYSTACK_SECRET_KEY'),
        'paystack_public_key' => $env('PAYSTACK_PUBLIC_KEY'),
        'db_host' => $env('DB_HOST'),
        'db_name' => $env('DB_NAME'),
        'db_user' => $env('DB_USER'),
        'db_pass' => $env('DB_PASS'),
        'csrf_secret' => $env('CSRF_SECRET'),
    ];

    if (count(array_filter($fromEnv, static fn ($v) => $v === null)) === 0) {
        $config = $fromEnv;
        return $config;
    }

    $candidates = [
        dirname($_SERVER['DOCUMENT_ROOT'] ?? __DIR__) . '/config/radiant-alpha.php',
        __DIR__ . '/../config/radiant-alpha.php',
    ];

    foreach ($candidates as $path) {
        if (is_file($path)) {
            $loaded = require $path;
            if (is_array($loaded)) {
                $config = $loaded;
                return $config;
            }
        }
    }

    http_response_code(500);
    error_log('appConfig(): no configuration source found (checked env vars and: ' . implode(', ', $candidates) . ')');
    exit('Server configuration error.');
}
