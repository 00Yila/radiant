# Admin access setup

`public/admin/orders.php` and `public/admin/order.php` are internal tools — the
order list and the status-change form. They carry no login of their own; they
rely entirely on Apache Basic Auth in front of the whole `/admin/` directory.

This is set up once per environment, directly in hPanel, not in this repo:

1. hPanel → **Websites → Manage → Password Protect Directories**.
2. Select the `public_html/admin` directory.
3. Create a username and password (a password manager, not a memorised one —
   this guards a page that can flip any order to any status).
4. Save. hPanel writes its own `.htaccess`/`.htpasswd` pair directly on the
   server — nothing to upload, nothing to commit.

Do this before uploading `public/admin/*.php` for the first time, or upload
and protect it in the same session — never leave the directory reachable
without it, even briefly.

## CSRF secret

The status-change form on `order.php` is also protected by a stateless CSRF
token, signed with the `csrf_secret` value from `appConfig()` (see
`public/config/radiant-alpha.php.example`). This is unrelated to the Basic
Auth step above — it stops a cross-site replay through an already-authenticated
admin session, which Basic Auth alone does not prevent. No setup needed beyond
having a real `csrf_secret` configured, which `checkout.php` and the Paystack
endpoints already require.
