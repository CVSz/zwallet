#!/usr/bin/env bash
set -euo pipefail

cd /opt/zveo

echo "== Create ZVEO API service =="

sudo tee /etc/systemd/system/zveo-api.service >/dev/null <<'EOT'
[Unit]
Description=ZVEO API Gateway
After=network.target

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zveo/apps/api-gateway
Environment=NODE_ENV=production
Environment=PORT=8090
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOT

echo "== Create ZVEO dashboard service =="

sudo tee /etc/systemd/system/zveo-web.service >/dev/null <<'EOT'
[Unit]
Description=ZVEO Dashboard
After=network.target

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zveo/apps/dashboard
Environment=NODE_ENV=production
Environment=PORT=3002
ExecStart=/usr/bin/bash -lc 'pnpm start -- -p 3002'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOT

echo "== Create ZVEO render worker service =="

sudo tee /etc/systemd/system/zveo-render-worker.service >/dev/null <<'EOT'
[Unit]
Description=ZVEO Render Worker
After=network.target

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zveo/apps/render-worker
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/src/worker.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOT

sudo systemctl daemon-reload

sudo systemctl enable zveo-api
sudo systemctl enable zveo-web
sudo systemctl enable zveo-render-worker

sudo systemctl restart zveo-api
sudo systemctl restart zveo-web
sudo systemctl restart zveo-render-worker

sleep 6

echo
echo "== Status =="

sudo systemctl status zveo-api --no-pager -l || true
sudo systemctl status zveo-web --no-pager -l || true
sudo systemctl status zveo-render-worker --no-pager -l || true

echo
echo "== Local checks =="

curl -I http://127.0.0.1:3002 || true
curl -I http://127.0.0.1:8090 || true

echo
echo "== COMPLETE =="
