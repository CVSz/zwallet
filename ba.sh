cd /opt/zwallet || exit 1

set -e

echo "== Create transfer worker systemd service =="

sudo tee /etc/systemd/system/zwallet-transfer-worker.service >/dev/null <<'EOF'
[Unit]
Description=zWallet transfer worker
After=network.target redis.service

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zwallet
Environment=NODE_ENV=production
Environment=REDIS_URL=redis://127.0.0.1:6379
ExecStart=/usr/bin/node /opt/zwallet/services/wallet-engine/dist/runTransferWorker.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "== Reload systemd =="

sudo systemctl daemon-reload

echo "== Enable worker =="

sudo systemctl enable zwallet-transfer-worker

echo "== Restart services =="

sudo systemctl restart zwallet-transfer-worker
sudo systemctl restart zwallet

sleep 5

echo "== Worker status =="

sudo systemctl status zwallet-transfer-worker --no-pager

echo "== Runtime status =="

sudo systemctl status zwallet --no-pager

echo "== Health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo "== Create transfer preview =="

TRANSFER_ID="$(
curl -s -X POST https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H 'content-type: application/json' \
  -d '{"chain":"evm","from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","amountAtomic":"1000000000000000000"}' \
  | jq -r '.transfer.id'
)"

echo "Transfer ID: $TRANSFER_ID"

echo "== Queue transfer =="

curl -s -X POST \
  "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" \
  | jq

echo "== Wait for async worker =="

sleep 5

echo "== Verify async execution =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  | jq '.transfers[0]'

echo
echo "== PHASE 6 COMPLETE =="
