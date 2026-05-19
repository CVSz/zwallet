#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

python3 <<'PY'
from pathlib import Path
import re

p = Path("apps/admin-wallet/src/server.ts")
s = p.read_text()

pattern = r'''for \(const t of transfers\.slice\(0,12\)\) \{.*?tbody\.appendChild\(tr\);\s*\}'''

replacement = r'''for (const t of transfers.slice(0,12)) {

    const tr =
      document.createElement("tr");

    tr.innerHTML =
      "<td><span class='" + statusClass(t.status) + "'>" + t.status + "</span></td>" +
      "<td>" + t.chain + "</td>" +
      "<td>" + short(t.from) + "</td>" +
      "<td>" + short(t.to) + "</td>" +
      "<td>" + t.amountAtomic + "</td>" +
      "<td>" + short(t.txHash || "-") + "</td>";

    tbody.appendChild(tr);
  }'''

s = re.sub(
    pattern,
    replacement,
    s,
    flags=re.DOTALL
)

pattern2 = r'''for \(const t of transfers\.slice\(0,6\)\) \{.*?activity\.appendChild\(div\);\s*\}'''

replacement2 = r'''for (const t of transfers.slice(0,6)) {

    const div =
      document.createElement("div");

    div.className =
      "activity-item";

    div.innerHTML =
      "<div>" + t.status.toUpperCase() + "</div>" +
      "<div style='font-size:12px;color:#94a3b8;margin-top:6px'>" +
      short(t.id) +
      "</div>";

    activity.appendChild(div);
  }'''

s = re.sub(
    pattern2,
    replacement2,
    s,
    flags=re.DOTALL
)

p.write_text(s)

print("frontend template literals removed safely")
PY

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm --filter @zwallet/admin-wallet build

sudo systemctl restart zwallet

sleep 5

curl -s https://admin-wallet.zeaz.dev/healthz
echo
