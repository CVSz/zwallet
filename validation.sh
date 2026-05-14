export TOKEN="$(
ZWALLET_DEV_TOKEN=change-me-local-admin-token \
node apps/admin-wallet/scripts/create-dev-token.mjs
)"

echo
echo "== CREATE TRANSFER =="

RAW_RESPONSE="$(
curl -s -X POST https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{
    "chain":"evm",
    "from":"0x1111111111111111111111111111111111111111",
    "to":"0x2222222222222222222222222222222222222222",
    "amountAtomic":"1000000000000000000"
  }'
)"

echo "$RAW_RESPONSE" | jq

TRANSFER_ID="$(
echo "$RAW_RESPONSE" | jq -r '.transfer.id // .id'
)"

echo
echo "TRANSFER_ID=$TRANSFER_ID"

echo
echo "== VERIFY PERSISTENCE =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  -H "authorization: Bearer $TOKEN" \
  | jq '.transfers[:5]'

echo
echo "== QUEUE TRANSFER =="

curl -s -X POST \
  "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" \
  -H "authorization: Bearer $TOKEN" \
  | jq

echo
echo "== REDIS STATE =="

redis-cli KEYS "bull:transfer-execution:*"

echo
echo "== WAIT FOR WORKER =="

sleep 5

echo
echo "== WORKER LOGS =="

sudo journalctl -u zwallet-transfer-worker -n 50 --no-pager

echo
echo "== FINAL TRANSFER STATE =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  -H "authorization: Bearer $TOKEN" \
  | jq --arg id "$TRANSFER_ID" '
    .transfers[] | select(.id == $id)
  '
