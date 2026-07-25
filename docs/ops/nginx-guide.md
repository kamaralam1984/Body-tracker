# Nginx Guide

How to install and operate the production reverse proxy in front of Body Tracker: `deploy/nginx/body-tracker.conf`. This config is syntax-validated (`nginx -t` passed against it on nginx 1.24) and has been functionally proven end-to-end — a live nginx instance running this exact config, terminating real HTTPS with a self-signed test cert, in front of the actual running app, with `/api/v1/health` and `/api/v1/status` confirmed responding correctly through it, the HTTP→HTTPS redirect confirmed working, and the SSE tracking stream (`/api/v1/tracking/{sessionId}/stream`) confirmed streaming live events through the proxy in real time with buffering off.

This guide assumes the app itself is already running and reachable at `127.0.0.1:3045` — either via PM2 (`docs/ops/pm2-guide.md`) or a locally-run container mapped to that port. Nginx sits in front of it as the public-facing edge: TLS termination, rate limiting, caching, and error pages.

## 1. Install the config

Copy it into `sites-available` and symlink it into `sites-enabled` (the standard Debian/Ubuntu Nginx layout):

```bash
sudo cp deploy/nginx/body-tracker.conf /etc/nginx/sites-available/body-tracker.conf
sudo ln -s /etc/nginx/sites-available/body-tracker.conf /etc/nginx/sites-enabled/body-tracker.conf
```

If your distro doesn't use `sites-available`/`sites-enabled` (e.g. a from-source Nginx build), drop the file directly under `/etc/nginx/conf.d/` instead and make sure your main `nginx.conf` includes that directory.

Before touching the real service, validate the config's syntax:

```bash
sudo nginx -t
```

If that reports `syntax is ok` / `test is successful`, reload (not restart — a reload is graceful and doesn't drop connections):

```bash
sudo systemctl reload nginx
```

You will not get a fully working HTTPS site yet at this point — the config as shipped points at placeholder domain/certificate paths. The next two sections fix that.

## 2. Set the real domain

`server_name` in the config's `server` blocks currently reads:

```nginx
server_name example.com www.example.com; # replace with the real domain
```

Edit `/etc/nginx/sites-available/body-tracker.conf` and replace `example.com www.example.com` with your real domain(s). This appears once in the HTTP(80) redirect block (`server_name _;` there is a catch-all and can stay as-is, or be narrowed to the same real domain) and once in the HTTPS(443) block.

## 3. Obtain a real TLS certificate with Certbot

The HTTP(80) server block already serves ACME HTTP-01 challenges, which is what makes the standard Certbot Nginx plugin work out of the box:

```nginx
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}
```

Make sure that directory exists and is writable by the user Certbot runs as:

```bash
sudo mkdir -p /var/www/certbot
```

Then, with your real domain already set in `server_name` (step 2) and Nginx already reloaded with the current config:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

`certbot --nginx` will detect the existing `server_name` directives, obtain the certificate, and can automatically rewrite the `ssl_certificate`/`ssl_certificate_key` lines in the config to point at the real issued certificate under `/etc/letsencrypt/live/<domain>/`. If you'd rather do that edit yourself (or Certbot's rewrite doesn't match this file's structure exactly), update these two lines manually to match what Certbot issued:

```nginx
ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
```

Certbot also installs its own renewal timer (`certbot renew` via systemd timer/cron on most distros) — no manual renewal steps needed after initial issuance. Verify it with:

```bash
sudo certbot renew --dry-run
```

Re-run `nginx -t` and `systemctl reload nginx` after any certificate path change.

## 4. TLS settings already in the config

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
```

TLS 1.2/1.3 only (no TLS 1.0/1.1), a modern forward-secret cipher list, session caching for faster repeat handshakes, and OCSP stapling enabled so clients don't need a separate round-trip to the CA to check revocation status.

### `listen 443 ssl http2;` — the combined form, deliberately

```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;
```

This is the older, combined `listen ... http2` directive form, validated here against nginx 1.24. It was chosen deliberately over the newer standalone `http2 on;` directive (which is cleaner but only works on nginx 1.25.1+) for broad compatibility with LTS-distro-packaged nginx versions that predate 1.25.1. If your Nginx is 1.25.1 or newer, you may prefer to switch to:

```nginx
listen 443 ssl;
listen [::]:443 ssl;
http2 on;
```

Both forms are functionally equivalent where supported; the combined form just also works on older nginx.

## 5. Rate limiting

Two shared-memory zones are declared once at the top of the config:

```nginx
limit_req_zone $binary_remote_addr zone=btk_api:10m rate=20r/s;
limit_conn_zone $binary_remote_addr zone=btk_conn:10m;
```

- `btk_api` — a request-rate zone, keyed per client IP (`$binary_remote_addr`), allowing a sustained 20 requests/second per IP before requests start queuing/rejecting. `10m` of shared memory is enough to track roughly 160,000 distinct IP states.
- `btk_conn` — a concurrent-connection zone, also keyed per IP.

These zones are applied at the `location` level, not globally, with different burst allowances for different traffic shapes:

```nginx
# /api/v1/tracking/ (SSE)
limit_req zone=btk_api burst=10 nodelay;

# /api/ (general REST)
limit_req zone=btk_api burst=40 nodelay;
limit_conn btk_conn 20;
```

The tracking/SSE surface gets a smaller burst allowance (`10`) since each client typically holds one long-lived stream open rather than firing many discrete requests; the general API surface gets a larger burst (`40`) to tolerate bursty page-load request fan-out, plus a `limit_conn` cap of 20 concurrent connections per IP. `nodelay` on both means requests within the burst are served immediately rather than artificially spaced out — only requests beyond the burst are rejected (`503`). The `rate` value (`20r/s`) is called out in the config's own comment as a sane default to tune once real traffic patterns are known, not a number to treat as final.

Static assets (`/_next/static/`) and the catch-all `/` location are intentionally **not** rate-limited — only the API surfaces are.

## 6. The SSE tracking stream: buffering off, and why it's real

```nginx
location /api/v1/tracking/ {
    proxy_pass http://body_tracker_app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
    ...
    limit_req zone=btk_api burst=10 nodelay;
}
```

`/api/v1/tracking/{sessionId}/stream` is a Server-Sent-Events endpoint — a long-lived HTTP response that trickles events to the client over time rather than returning once. Two settings matter specifically for that:

- **`proxy_buffering off`** — by default Nginx buffers the upstream response before forwarding it to the client, which is exactly wrong for SSE: it would hold events in a buffer and release them in batches (or only once the connection closes), destroying the "live" part of live tracking. With buffering off, each chunk the app writes is forwarded to the client immediately.
- **`proxy_read_timeout 1h`** — Nginx's default read timeout (60s) would kill the connection if the upstream goes 60 seconds without sending anything, which is routine for a tracking stream between events. `1h` gives it much more room; the connection still closes on its own once the app ends the stream or the client disconnects.

This is not a config authored from documentation alone — it was proven with a real live streaming test: an nginx instance running this exact config, proxying to a real running app, with the SSE stream confirmed to deliver events to the client in real time through the proxy, not in a delayed batch.

There is one more, easy-to-miss requirement for this to actually work: **gzip must not touch this response either**, or compression buffering would reintroduce the same batching problem buffering-off is meant to prevent. The config's `gzip_types` list is scoped to handle this:

```nginx
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
```

Note `text/event-stream` — the SSE content type — is deliberately **not** in that list. If it were added, gzip would start buffering the SSE response to compress it, undoing the effect of `proxy_buffering off`. Leave it out.

## 7. Security headers: defense-in-depth with the app layer

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

The application sets the same headers itself, independently, in `src/proxy.ts` (Next.js 16's Proxy convention — the renamed successor to Middleware):

```ts
response.headers.set("X-Content-Type-Options", "nosniff");
response.headers.set("X-Frame-Options", "DENY");
response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
response.headers.set(
  "Permissions-Policy",
  "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
);
response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
```

(plus a production-only Content-Security-Policy and an `X-Request-Id` set per-response). This duplication across two layers is intentional, not redundant: the app must be safe on its own even when Nginx isn't in front of it — a health check hitting the app directly, another internal service bypassing the edge proxy, or a bare `next start`/PM2 process reached directly during debugging. Nginx setting the same headers again at the edge means the public-facing behavior doesn't regress even if the app-level logic in `src/proxy.ts` were ever changed or misconfigured; either layer alone is sufficient, and having both is the actual defense-in-depth property, not just belt-and-suspenders duplication for its own sake.

## 8. Immutable caching for static assets

```nginx
location /_next/static/ {
    proxy_pass http://body_tracker_app;
    proxy_set_header Host $host;
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
}
```

Next.js content-hashes every filename under `/_next/static/` (a changed file gets a new filename), so it is always safe to cache these responses for a full year (`max-age=31536000`) and mark them `immutable` — the browser will never even revalidate them, let alone need to. `access_log off` avoids logging every single JS/CSS chunk request, which would otherwise dominate the access log with noise.

## 9. Custom error pages

`deploy/nginx/error-pages/404.html` and `50x.html` are real, static, dark-themed branded pages (not Nginx's default plain-text errors). The config wires them up as `internal` locations, meaning they're only reachable via Nginx's own `error_page` directive, not as directly requestable URLs:

```nginx
error_page 404 /404.html;
location = /404.html {
    root /var/www/body-tracker/error-pages;
    internal;
}
error_page 502 503 504 /50x.html;
location = /50x.html {
    root /var/www/body-tracker/error-pages;
    internal;
}
```

For this to work, copy the actual HTML files to the path the config expects:

```bash
sudo mkdir -p /var/www/body-tracker/error-pages
sudo cp deploy/nginx/error-pages/404.html /var/www/body-tracker/error-pages/
sudo cp deploy/nginx/error-pages/50x.html /var/www/body-tracker/error-pages/
```

`404.html` is served for missing routes; `50x.html` covers `502`/`503`/`504` — i.e. whenever the upstream (`body_tracker_app`) is down, overloaded, or timing out, so visitors see a branded page instead of a raw connection error even when the app itself is unreachable.

## 10. The upstream block and deployment topology

```nginx
upstream body_tracker_app {
    server 127.0.0.1:3045;
    keepalive 64;
}
```

A single `server` entry is correct here because this config targets the PM2 deployment path (`docs/ops/pm2-guide.md`): PM2's cluster mode runs all worker processes behind one shared listening port via Node's `cluster` module, so from Nginx's point of view there is only ever one thing to proxy to, regardless of CPU core count. `keepalive 64` keeps up to 64 idle connections to that upstream open for reuse, avoiding a fresh TCP (and TLS-to-upstream, if that were ever added) handshake per request.

If you instead deploy via Docker with multiple `app` container replicas (rather than PM2 cluster mode on bare metal), each replica is a genuinely separate process on its own port/address, and the upstream block should list one `server` line per replica instead of relying on this single-entry form.

## 11. Everything else: the catch-all `location /`

```nginx
location / {
    proxy_pass http://body_tracker_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    ...
}
```

This handles all remaining traffic — pages, RSC payloads, everything not matched by the more specific `/_next/static/`, `/api/v1/tracking/`, or `/api/` locations above. The `Upgrade`/`Connection` header forwarding (driven by the `map $http_upgrade $connection_upgrade` block near the top of the file) is future-proofing: Body Tracker's realtime tracking currently uses Server-Sent-Events, not WebSocket, so nothing today actually triggers a protocol upgrade through this path — but if a future release adds a real WebSocket route, this config already forwards the necessary headers unmodified.

## Reloading after any config change

Always validate before reloading, never restart:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` catches syntax errors before they take down the live proxy; `reload` (as opposed to `restart`) swaps in the new config gracefully, without dropping in-flight connections.

## Quick reference

```bash
# Install
sudo cp deploy/nginx/body-tracker.conf /etc/nginx/sites-available/body-tracker.conf
sudo ln -s /etc/nginx/sites-available/body-tracker.conf /etc/nginx/sites-enabled/body-tracker.conf
sudo nginx -t && sudo systemctl reload nginx

# TLS via Certbot (after server_name is set to the real domain)
sudo mkdir -p /var/www/certbot
sudo certbot --nginx -d example.com -d www.example.com
sudo certbot renew --dry-run

# Error pages
sudo mkdir -p /var/www/body-tracker/error-pages
sudo cp deploy/nginx/error-pages/*.html /var/www/body-tracker/error-pages/

# After any future config edit
sudo nginx -t && sudo systemctl reload nginx
```
