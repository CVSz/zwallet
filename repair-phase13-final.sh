#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Repair Phase 13 escaped template syntax =="

python3 <<'PY'
from pathlib import Path

p = Path("apps/admin-wallet/src/server.ts")
s = p.read_text()

# fix escaped backticks
s = s.replace("\\`", "`")

# fix escaped template placeholders
s = s.replace("\\${", "${")

# fix escaped regex slashes
s = s.replace(
    r'/^\\/api\\/transfers\\/([^/]+)\\/queue$/',
    r'/^\/api\/transfers\/([^/]+)\/queue$/'
)

p.write_text(s)

print("all escaped template syntax repaired")
PY

echo
echo "== Verify escaped backticks removed =="

grep -n '\\`' apps/admin-wallet/src/server.ts || true

echo
echo "== Verify escaped template placeholders removed =="

grep -n '\\${' apps/admin-wallet/src/server.ts || true

echo
echo "== Verify queue regex =="

grep -n "queueMatch" apps/admin-wallet/src/server.ts

echo
echo "== Clean cache =="

find . -name 'tsconfig.tsbuildinfo' -delete

echo
echo "== Rebuild =="

pnpm --filter @zwallet/admin-wallet build

echo
echo "== Restart runtime =="

sudo systemctl restart zwallet

sleep 5

echo
echo "== Health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo
echo "== Phase 13 FINAL repair complete =="
