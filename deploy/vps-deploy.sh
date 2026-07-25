#!/usr/bin/env bash
# One-shot first deployment for Body Tracker on the shared KVL VPS
# (srv1569796, 187.127.148.237) — subdomain bodytracker.kvlbusinesssolutions.com.
#
# Safe by construction: uses port 3045 (confirmed free), PM2 app name
# "body-tracker" (confirmed unused), and a brand-new Nginx site file —
# nothing existing is stopped, restarted, or edited. `nginx reload` is
# graceful and does not drop other sites' connections.
#
# Run as root on the VPS (via Hostinger's Terminal or SSH).
set -euo pipefail

DOMAIN="bodytracker.kvlbusinesssolutions.com"
APP_DIR="/var/www/body-tracker"
PORT=3045
REPO_URL="https://github.com/kamaralam1984/Body-tracker.git"

echo "==> Node version check (need >= 20)"
node --version

echo "==> Cloning repository"
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git fetch origin && git reset --hard origin/main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "==> Creating .env.local — EDIT DATABASE_URL/BTK_JWT_SECRET below before running, or edit after"
if [ ! -f "$APP_DIR/.env.local" ]; then
  cat > "$APP_DIR/.env.local" <<EOF
NODE_ENV=production
PORT=$PORT
BTK_JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
DATABASE_URL=REPLACE_WITH_YOUR_REAL_NEON_CONNECTION_STRING
EOF
  echo "!!! .env.local created with a random BTK_JWT_SECRET — you MUST edit DATABASE_URL before starting the app:"
  echo "    nano $APP_DIR/.env.local"
else
  echo ".env.local already exists — leaving it as-is."
fi

echo "==> Installing dependencies and building"
cd "$APP_DIR"
npm ci
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> Starting under PM2 (app name: body-tracker, port: $PORT)"
pm2 delete body-tracker 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

echo "==> Writing new Nginx site (HTTP only for now — Certbot adds SSL next)"
cat > "/etc/nginx/sites-available/$DOMAIN" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /api/v1/tracking/ {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 1h;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"

echo "==> Validating Nginx config (will NOT reload if this fails)"
nginx -t

echo "==> Reloading Nginx (graceful — does not drop other sites)"
systemctl reload nginx

echo "==> Requesting a real SSL certificate via Certbot (matches your other kvlbusinesssolutions.com subdomains)"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@kvlbusinesssolutions.com --redirect

echo "==> Done. Verify:"
echo "    curl -s https://$DOMAIN/api/v1/health"
echo "    pm2 logs body-tracker --lines 30"
