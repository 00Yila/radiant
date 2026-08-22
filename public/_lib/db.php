<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

/**
 * A single PDO connection, reused across the request. PDO::ATTR_EMULATE_PREPARES
 * is off so placeholders are real prepared-statement parameters at the MySQL
 * protocol level, not just string-escaped by the driver.
 */
function dbConnect(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $config = appConfig();
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);

    try {
        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        // Never surface $e->getMessage() to the response — a PDO connection
        // exception can include the DSN, which contains the database name.
        error_log('dbConnect(): ' . $e->getMessage());
        http_response_code(500);
        exit('Could not connect to the database.');
    }

    return $pdo;
}
