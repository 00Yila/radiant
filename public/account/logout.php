<?php
declare(strict_types=1);

require_once __DIR__ . '/../_lib/http.php';
require_once __DIR__ . '/../_lib/session.php';

startSecureSession();
$_SESSION = [];
session_destroy();

redirect('/account/login/');
