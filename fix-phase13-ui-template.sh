#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Fix Phase 13 template literals =="

python3 <<'PY'
from pathlib import Path

p = Path("apps/admin-wallet/src/server.ts")
s = p.read_text()

s = s.replace(
    r'const url = new URL(req.url ?? "/", \`http://\${req.headers.host}\`);',
    'const url = new URL(req.url ?? "/", `http://${req.headers.host}`);'
)

s = s.replace(
    r'console.log(\`zWallet admin runtime listening on :\${PORT}\`);',
    'console.log(`zWallet admin runtime listening on :${PORT}`);'
)

p.write_text(s)

print("template literals fixed")
PY

echo
echo "== Verify no escaped backticks remain =="

grep -n '\\`' apps/admin-wallet/src/server.ts || true

echo
echo "== Clean cache =="

find . -name 'tsconfig.tsbuildinfo' -delete

echo
echo "== Build =="

pnpm --filter @zwallet/admin-wallet build

echo
echo "== Restart =="

sudo systemctl restart zwallet

sleep 4

echo
echo "== Health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo
echo "== Phase 13 UI fixed =="
