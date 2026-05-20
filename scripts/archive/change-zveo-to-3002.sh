#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Create ZVEO frontend service on port 3002 =="

sudo tee /etc/systemd/system/zveo-web.service >/dev/null <<'EOT'
[Unit]
Description=ZVEO Next.js Frontend
After=network.target

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zwallet/apps/web
Environment=NODE_ENV=production
Environment=PORT=3002
ExecStart=/usr/bin/bash -lc 'cd /opt/zwallet/apps/web && /usr/bin/pnpm start -- -p 3002'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOT

sudo systemctl daemon-reload
sudo systemctl enable zveo-web
sudo systemctl restart zveo-web

sleep 5

echo "== Status =="
sudo systemctl status zveo-web --no-pager -l || true

echo "== Local test =="
curl -I http://127.0.0.1:3002 || true

echo
echo "== Now update Cloudflare Tunnel config =="
echo "Edit /etc/cloudflared/config.yml:"
echo
cat <<'EOT'
ingress:
  - hostname: app.zeaz.dev
    service: http://127.0.0.1:3000

  - hostname: zveo.zeaz.dev
    service: http://127.0.0.1:3002

  - hostname: admin-wallet.zeaz.dev
    service: http://127.0.0.1:8081

  - service: http_status:404
EOT

echo
echo "Then run:"
echo "sudo systemctl restart cloudflared"
echo
echo "Verify:"
echo "curl -I https://app.zeaz.dev"
echo "curl -I https://zveo.zeaz.dev"
