<?php
/**
 * Internal single-order view and status-change form. Same access-control
 * assumption as orders.php: Apache Basic Auth on the whole directory,
 * configured once via hPanel — see docs/admin-setup.md.
 *
 * The status form carries a stateless CSRF token (HMAC over the order id and
 * today's date, signed with a secret only this server knows) because Basic
 * Auth alone does not stop a cross-site form replay once a browser has
 * cached credentials for this realm — a malicious page could otherwise POST
 * a status change through the admin's own authenticated session.
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/db.php';
require_once __DIR__ . '/../_lib/orders.php';
require_once __DIR__ . '/../_lib/config.php';

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function formatNaira(int $kobo): string
{
    return '₦' . number_format($kobo / 100, 2);
}

function csrfToken(int $orderId, string $secret): string
{
    return hash_hmac('sha256', $orderId . '|' . date('Y-m-d'), $secret);
}

$id = (int) ($_GET['id'] ?? $_POST['id'] ?? 0);

if ($id <= 0) {
    http_response_code(404);
    exit('Order not found.');
}

$pdo = dbConnect();
$order = findOrderById($pdo, $id);

if ($order === null) {
    http_response_code(404);
    exit('Order not found.');
}

$secret = appConfig()['csrf_secret'];
$error = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $token = (string) ($_POST['csrf'] ?? '');
    $status = (string) ($_POST['status'] ?? '');

    if (!hash_equals(csrfToken($id, $secret), $token)) {
        http_response_code(403);
        exit('Invalid or expired form — go back and try again.');
    }

    if (updateOrderStatus($pdo, $id, $status)) {
        header('Location: /admin/order.php?id=' . $id, true, 303);
        exit;
    }

    $error = 'Not a valid status.';
    $order = findOrderById($pdo, $id);
}

$history = getOrderHistory($pdo, $id);
$csrf = csrfToken($id, $secret);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Order <?= h($order['reference']) ?> — Admin</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #10203a; background: #f7f7f5; max-width: 40rem; }
  dl { display: grid; grid-template-columns: 10rem 1fr; gap: 0.4rem 1rem; background: #fff; padding: 1rem 1.25rem; border-radius: 6px; }
  dt { color: #5a6472; font-size: 0.85rem; }
  dd { margin: 0; font-weight: 600; }
  h1 { font-size: 1.3rem; }
  ol.timeline { list-style: none; padding: 0; }
  ol.timeline li { padding: 0.35rem 0; border-bottom: 1px solid #e3e3e0; font-size: 0.9rem; }
  form { margin-top: 1.5rem; background: #fff; padding: 1rem 1.25rem; border-radius: 6px; }
  select { padding: 0.4rem; font-size: 1rem; }
  button { padding: 0.5rem 1rem; font-size: 1rem; margin-left: 0.5rem; cursor: pointer; }
  .error { color: #8a1f1f; }
  a.back { display: inline-block; margin-bottom: 1rem; }
</style>
</head>
<body>
  <a class="back" href="/admin/orders.php">&larr; All orders</a>
  <h1>Order <?= h($order['reference']) ?></h1>

  <?php if ($error !== null): ?>
    <p class="error"><?= h($error) ?></p>
  <?php endif; ?>

  <dl>
    <dt>Product</dt><dd><?= h($order['product_label']) ?> — <?= h($order['variant_label']) ?></dd>
    <dt>Amount</dt><dd><?= formatNaira((int) $order['amount_kobo']) ?></dd>
    <dt>Customer</dt><dd><?= h($order['customer_name']) ?></dd>
    <dt>Email</dt><dd><?= h($order['customer_email']) ?></dd>
    <dt>Phone</dt><dd><?= h($order['customer_phone']) ?></dd>
    <dt>Status</dt><dd><?= h($order['status']) ?></dd>
    <dt>Placed</dt><dd><?= h($order['created_at']) ?></dd>
  </dl>

  <h2>History</h2>
  <ol class="timeline">
    <?php foreach ($history as $row): ?>
      <li><?= h($row['status']) ?> — <?= h($row['created_at']) ?></li>
    <?php endforeach; ?>
  </ol>

  <form method="post" action="/admin/order.php">
    <input type="hidden" name="id" value="<?= (int) $order['id'] ?>">
    <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
    <label for="status">Change status</label><br>
    <select id="status" name="status">
      <?php foreach (ORDER_STATUSES as $status): ?>
        <option value="<?= h($status) ?>" <?= $status === $order['status'] ? 'selected' : '' ?>><?= h($status) ?></option>
      <?php endforeach; ?>
    </select>
    <button type="submit">Update</button>
  </form>
</body>
</html>
