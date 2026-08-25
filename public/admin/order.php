<?php
/**
 * Internal single-order view. Each line item gets its own status-change
 * form, since fulfillment now happens per item, not per order. Same access-
 * control assumption as orders.php: Apache Basic Auth on the whole
 * directory — see docs/admin-setup.md.
 *
 * CSRF token is now scoped per item id (rather than per order id), since
 * that's the granularity being changed: hash_hmac('sha256', $itemId . '|' .
 * date('Y-m-d'), $secret). Same reasoning as before — Basic Auth alone
 * doesn't stop a cross-site replay of this form.
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

function itemCsrfToken(int $itemId, string $secret): string
{
    return hash_hmac('sha256', $itemId . '|' . date('Y-m-d'), $secret);
}

$id = (int) ($_GET['id'] ?? 0);

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
    $itemId = (int) ($_POST['item_id'] ?? 0);
    $token = (string) ($_POST['csrf'] ?? '');
    $status = (string) ($_POST['status'] ?? '');

    if ($itemId <= 0 || !hash_equals(itemCsrfToken($itemId, $secret), $token)) {
        http_response_code(403);
        exit('Invalid or expired form — go back and try again.');
    }

    // Confirms the posted item actually belongs to the order this page is
    // showing — not a security boundary (there's one trusted admin behind
    // Basic Auth), but it catches a stale-page mistake before it silently
    // edits the wrong order's item.
    $targetItem = findOrderItemById($pdo, $itemId);
    if ($targetItem === null || (int) $targetItem['order_id'] !== $id) {
        http_response_code(404);
        exit('That item does not belong to this order.');
    }

    if (!updateOrderItemStatus($pdo, $itemId, $status)) {
        $error = 'Not a valid status.';
    } else {
        header('Location: /admin/order.php?id=' . $id, true, 303);
        exit;
    }
}

$items = getOrderItems($pdo, $id);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Order <?= h($order['reference']) ?> — Admin</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #10203a; background: #f7f7f5; max-width: 42rem; }
  dl { display: grid; grid-template-columns: 10rem 1fr; gap: 0.4rem 1rem; background: #fff; padding: 1rem 1.25rem; border-radius: 6px; }
  dt { color: #5a6472; font-size: 0.85rem; }
  dd { margin: 0; font-weight: 600; }
  h1 { font-size: 1.3rem; }
  .item { background: #fff; border-radius: 6px; padding: 1rem 1.25rem; margin-top: 1rem; }
  ol.timeline { list-style: none; padding: 0; }
  ol.timeline li { padding: 0.35rem 0; border-bottom: 1px solid #e3e3e0; font-size: 0.9rem; }
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
    <dt>Payment status</dt><dd><?= h($order['status']) ?></dd>
    <dt>Total</dt><dd><?= formatNaira((int) $order['amount_kobo']) ?></dd>
    <dt>Customer</dt><dd><?= h($order['customer_name']) ?></dd>
    <dt>Email</dt><dd><?= h($order['customer_email']) ?></dd>
    <dt>Phone</dt><dd><?= h($order['customer_phone']) ?></dd>
    <dt>Placed</dt><dd><?= h($order['created_at']) ?></dd>
  </dl>

  <?php foreach ($items as $item): ?>
    <div class="item">
      <p><strong><?= h($item['product_label']) ?> — <?= h($item['variant_label']) ?></strong> × <?= (int) $item['quantity'] ?></p>
      <p><?= formatNaira((int) $item['unit_price_kobo']) ?> each — status: <strong><?= h($item['status']) ?></strong></p>

      <?php $history = getOrderItemHistory($pdo, (int) $item['id']); ?>
      <ol class="timeline">
        <?php foreach ($history as $row): ?>
          <li><?= h($row['status']) ?> — <?= h($row['created_at']) ?></li>
        <?php endforeach; ?>
      </ol>

      <form method="post" action="/admin/order.php?id=<?= (int) $order['id'] ?>">
        <input type="hidden" name="item_id" value="<?= (int) $item['id'] ?>">
        <input type="hidden" name="csrf" value="<?= h(itemCsrfToken((int) $item['id'], $secret)) ?>">
        <select name="status">
          <?php foreach (ADMIN_SETTABLE_STATUSES as $status): ?>
            <option value="<?= h($status) ?>" <?= $status === $item['status'] ? 'selected' : '' ?>><?= h($status) ?></option>
          <?php endforeach; ?>
        </select>
        <button type="submit">Update</button>
      </form>
    </div>
  <?php endforeach; ?>
</body>
</html>
