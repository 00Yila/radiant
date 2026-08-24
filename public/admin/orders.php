<?php
/**
 * Internal order list. Access control is Apache Basic Auth on this whole
 * directory (hPanel's "Password Protect Directories", set up once after
 * deploy — see docs/admin-setup.md) — this file assumes anyone reaching it
 * has already authenticated and does no auth of its own.
 *
 * Templates its own HTML rather than being an Astro page because it needs a
 * live DB read on every request, which the static site can't do.
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/db.php';
require_once __DIR__ . '/../_lib/orders.php';

$pdo = dbConnect();
$orders = listOrders($pdo);

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function formatNaira(int $kobo): string
{
    return '₦' . number_format($kobo / 100, 2);
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Orders — Admin</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #10203a; background: #f7f7f5; }
  h1 { font-size: 1.4rem; }
  table { border-collapse: collapse; width: 100%; background: #fff; }
  th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e3e3e0; text-align: left; font-size: 0.9rem; }
  th { background: #eef1f6; }
  a { color: #0a1930; }
  .status { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
  .status-pending { background: #f0e6c8; }
  .status-paid { background: #d9f0e0; }
  .status-failed { background: #f5d9d9; }
</style>
</head>
<body>
  <h1>Orders</h1>
  <p><?= count($orders) ?> most recent order<?= count($orders) === 1 ? '' : 's' ?>.</p>
  <table>
    <thead>
      <tr>
        <th>Reference</th>
        <th>Items</th>
        <th>Customer</th>
        <th>Amount</th>
        <th>Payment</th>
        <th>Placed</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($orders as $order): ?>
        <tr>
          <td><?= h($order['reference']) ?></td>
          <td><?= (int) $order['item_count'] ?> item<?= (int) $order['item_count'] === 1 ? '' : 's' ?></td>
          <td><?= h($order['customer_name']) ?><br><small><?= h($order['customer_email']) ?></small></td>
          <td><?= formatNaira((int) $order['amount_kobo']) ?></td>
          <td><span class="status status-<?= h($order['status']) ?>"><?= h($order['status']) ?></span></td>
          <td><?= h($order['created_at']) ?></td>
          <td><a href="/admin/order.php?id=<?= (int) $order['id'] ?>">View</a></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</body>
</html>
