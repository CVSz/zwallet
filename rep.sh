cd /opt/zwallet || exit 1

set -e

echo "== Enable dev token auth temporarily =="

sudo tee /etc/zwallet/admin-wallet.env >/dev/null <<'EOF'
NODE_ENV=production
PORT=8081
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zwallet
REDIS_URL=redis://127.0.0.1:6379
ALLOW_DEV_AUTH=true
ZWALLET_DEV_TOKEN=change-me-local-admin-token
DEFAULT_OPERATOR_ROLES=admin
EOF

echo "== Restart runtime =="

sudo systemctl restart zwallet
sleep 3
sudo systemctl status zwallet --no-pager

echo "== Create admin token =="

TOKEN="$(
ZWALLET_DEV_TOKEN=change-me-local-admin-token \
node apps/admin-wallet/scripts/create-dev-token.mjs
)"

echo "TOKEN created"

echo "== Health remains public =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo "== Authenticated overview =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  -H "authorization: Bearer $TOKEN" | jq '.operator'

echo "== Authenticated transfer preview =="

TRANSFER_ID="$(
curl -s -X POST https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"chain":"evm","from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","amountAtomic":"1000000000000000000"}' \
  | jq -r '.transfer.id'
)"

echo "Transfer ID: $TRANSFER_ID"

echo "== Queue authenticated transfer =="

curl -s -X POST \
  "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" \
  -H "authorization: Bearer $TOKEN" | jq

sleep 6

echo "== Verify authenticated overview =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  -H "authorization: Bearer $TOKEN" \
  | jq --arg id "$TRANSFER_ID" '.transfers[] | select(.id == $id)'

echo
echo "== PHASE 9 AUTH REPAIR COMPLETE =="
