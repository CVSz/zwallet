cd /opt/zwallet || exit 1

set -e

echo "== Repair wallet-engine exports =="

cat > services/wallet-engine/src/index.ts <<'EOF'
export * from './walletEngine.js';
export * from './services/transfers/index.js';
export * from './workers/index.js';
EOF

echo "== Verify wallet-engine index =="

cat services/wallet-engine/src/index.ts

echo "== Clean build cache =="

find . -name 'tsconfig.tsbuildinfo' -delete

echo "== Rebuild workspace =="

pnpm --filter @zwallet/rpc build
pnpm --filter @zwallet/shared-types build
pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo "== Restart runtime =="

sudo systemctl restart zwallet

sleep 3

sudo systemctl status zwallet --no-pager

echo "== Public health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo "== Public overview =="

curl -s https://admin-wallet.zeaz.dev/api/overview | jq
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

echo "== Verify transfer persisted =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  | jq '.transfers[0]'

echo
echo "== PHASE 5 REPAIRED COMPLETE =="
