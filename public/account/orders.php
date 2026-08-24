<?php
/**
 * Session-gated order history: every order placed with the logged-in
 * session's email, each with its line items and their individual statuses.
 * Guest orders appear here automatically the moment someone logs in with
 * the same email — this query is the entire mechanism, no separate linking
 * step exists.
 *
 * Plain PHP rather than an Astro page for the same reason the admin tool
 * is: this needs a live session + DB read on every request, which the
 * static site can't do.
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/session.php';
require_once __DIR__ . '/../_lib/db.php';
require_once __DIR__ . '/../_lib/orders.php';

startSecureSession();

if (!isset($_SESSION['email'])) {
    header('Location: /account/login/', true, 303);
    exit;
}

$email = $_SESSION['email'];

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function formatNaira(int $kobo): string
{
    return '₦' . number_format($kobo / 100, 2);
}

$pdo = dbConnect();
$orders = listOrdersForEmail($pdo, $email);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Your orders</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #10203a; background: #f7f7f5; max-width: 40rem; }
  h1 { font-size: 1.4rem; }
  .order { background: #fff; border-radius: 6px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
  .order__ref { font-weight: 700; }
  .order__total { color: #5a6472; font-size: 0.9rem; }
  ul.items { list-style: none; padding: 0; margin-top: 0.75rem; }
  ul.items li { padding: 0.35rem 0; border-top: 1px solid #e3e3e0; font-size: 0.9rem; display: flex; justify-content: space-between; }
  .status { font-weight: 600; }
  a.logout { display: inline-block; margin-top: 1.5rem; }
</style>
</head>
<body>
  <h1>Your orders</h1>
  <p><?= h($email) ?></p>

  <?php if (count($orders) === 0): ?>
    <p>No orders yet.</p>
  <?php endif; ?>

  <?php foreach ($orders as $order): ?>
    <?php $items = getOrderItems($pdo, (int) $order['id']); ?>
    <div class="order">
      <p class="order__ref"><?= h($order['reference']) ?></p>
      <p class="order__total"><?= formatNaira((int) $order['amount_kobo']) ?> — <?= h($order['status']) ?></p>
      <ul class="items">
        <?php foreach ($items as $item): ?>
          <li>
            <span><?= h($item['product_label']) ?> — <?= h($item['variant_label']) ?> × <?= (int) $item['quantity'] ?></span>
            <span class="status"><?= h($item['status']) ?></span>
          </li>
        <?php endforeach; ?>
      </ul>
    </div>
  <?php endforeach; ?>

  <a class="logout" href="/account/logout.php">Log out</a>
</body>
</html>
