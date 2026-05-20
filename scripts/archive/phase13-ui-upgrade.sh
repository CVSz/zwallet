#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 13 UI/UX Upgrade =="

mkdir -p apps/admin-wallet/public

cat > apps/admin-wallet/public/dashboard.css <<'EOF'
:root{
  --bg:#050816;
  --panel:rgba(15,23,42,.72);
  --panel-solid:#0f172a;
  --line:rgba(255,255,255,.08);
  --text:#f8fafc;
  --muted:#94a3b8;
  --blue:#38bdf8;
  --green:#22c55e;
  --yellow:#f59e0b;
  --red:#ef4444;
}

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Inter,Arial,sans-serif;
  background:
    radial-gradient(circle at top left,#0f172a,#020617 45%),
    linear-gradient(#020617,#020617);
  color:var(--text);
}

.layout{
  display:flex;
  min-height:100vh;
}

.sidebar{
  width:260px;
  background:rgba(2,6,23,.92);
  border-right:1px solid var(--line);
  padding:24px;
  backdrop-filter:blur(20px);
}

.brand{
  font-size:24px;
  font-weight:800;
  margin-bottom:28px;
}

.nav{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.nav a{
  text-decoration:none;
  color:var(--muted);
  padding:14px;
  border-radius:14px;
  transition:.2s;
}

.nav a:hover{
  background:rgba(56,189,248,.12);
  color:white;
}

.main{
  flex:1;
  padding:28px;
}

.hero{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:24px;
}

.hero h1{
  margin:0;
  font-size:34px;
}

.hero p{
  color:var(--muted);
}

.grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:18px;
  margin-bottom:24px;
}

.card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:22px;
  backdrop-filter:blur(18px);
  box-shadow:
    0 10px 40px rgba(0,0,0,.35),
    inset 0 1px 0 rgba(255,255,255,.04);
}

.metric{
  font-size:34px;
  font-weight:800;
  margin-top:12px;
}

.label{
  color:var(--muted);
  font-size:13px;
}

.row{
  display:grid;
  grid-template-columns:2fr 1fr;
  gap:20px;
}

.table-card{
  overflow:auto;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  padding:14px;
  border-bottom:1px solid rgba(255,255,255,.06);
  text-align:left;
  font-size:13px;
}

th{
  color:var(--muted);
}

.status{
  display:inline-flex;
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:700;
}

.confirmed{
  background:rgba(34,197,94,.15);
  color:var(--green);
}

.previewed,
.queued,
.executing,
.broadcasted{
  background:rgba(245,158,11,.15);
  color:var(--yellow);
}

.failed{
  background:rgba(239,68,68,.15);
  color:var(--red);
}

.panel-title{
  font-size:18px;
  margin-bottom:18px;
}

.activity{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.activity-item{
  padding:14px;
  border-radius:16px;
  background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.05);
}

button{
  background:linear-gradient(135deg,#0ea5e9,#2563eb);
  border:none;
  color:white;
  padding:10px 14px;
  border-radius:12px;
  font-weight:700;
  cursor:pointer;
}

input,select{
  width:100%;
  margin-bottom:10px;
  padding:12px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.08);
  background:#020617;
  color:white;
}

.quick-actions{
  display:flex;
  flex-direction:column;
  gap:12px;
}

@media(max-width:1100px){
  .grid{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }

  .row{
    grid-template-columns:1fr;
  }
}

@media(max-width:700px){
  .layout{
    flex-direction:column;
  }

  .sidebar{
    width:100%;
  }

  .grid{
    grid-template-columns:1fr;
  }
}
EOF

echo
echo "== Replace dashboard HTML renderer =="

python3 <<'PY'
from pathlib import Path
p = Path("apps/admin-wallet/src/server.ts")
s = p.read_text()

start = s.index("function sendHtml")
end = s.index("const server =")

replacement = r'''
function sendHtml(res: http.ServerResponse) {

  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
  });

  res.end(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>zWallet Control Plane</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="/dashboard.css" />
</head>

<body>

<div class="layout">

  <aside class="sidebar">
    <div class="brand">zWallet</div>

    <nav class="nav">
      <a href="#">Dashboard</a>
      <a href="#">Transfers</a>
      <a href="#">Wallets</a>
      <a href="#">Queues</a>
      <a href="#">Signing</a>
      <a href="#">Security</a>
      <a href="#">Audit</a>
    </nav>
  </aside>

  <main class="main">

    <div class="hero">
      <div>
        <h1>Wallet Operations</h1>
        <p>Secure multi-chain treasury runtime</p>
      </div>

      <button onclick="loadOverview()">
        Refresh
      </button>
    </div>

    <section class="grid">

      <div class="card">
        <div class="label">Wallet Accounts</div>
        <div id="accountsMetric" class="metric">0</div>
      </div>

      <div class="card">
        <div class="label">Transfers</div>
        <div id="transfersMetric" class="metric">0</div>
      </div>

      <div class="card">
        <div class="label">Confirmed</div>
        <div id="confirmedMetric" class="metric">0</div>
      </div>

      <div class="card">
        <div class="label">Pending</div>
        <div id="pendingMetric" class="metric">0</div>
      </div>

    </section>

    <section class="row">

      <div class="card table-card">

        <div class="panel-title">
          Recent Transfers
        </div>

        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Chain</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Tx</th>
            </tr>
          </thead>

          <tbody id="transfersTable"></tbody>
        </table>

      </div>

      <div class="quick-actions">

        <div class="card">

          <div class="panel-title">
            Preview Transfer
          </div>

          <select id="chain">
            <option value="evm">evm</option>
            <option value="solana">solana</option>
            <option value="bitcoin">bitcoin</option>
          </select>

          <input
            id="from"
            value="0x1111111111111111111111111111111111111111"
          />

          <input
            id="to"
            value="0x2222222222222222222222222222222222222222"
          />

          <input
            id="amount"
            value="1000000000000000000"
          />

          <button onclick="previewTransfer()">
            Create Transfer
          </button>

        </div>

        <div class="card">

          <div class="panel-title">
            Runtime Activity
          </div>

          <div id="activity" class="activity"></div>

        </div>

      </div>

    </section>

  </main>

</div>

<script>

const token =
  localStorage.getItem("ZWALLET_TOKEN")
  || prompt("Paste admin token");

localStorage.setItem(
  "ZWALLET_TOKEN",
  token
);

async function api(path, options = {}) {

  const res = await fetch(path, {
    ...options,

    headers: {
      "authorization":
        "Bearer " + token,

      "content-type":
        "application/json",

      ...(options.headers || {})
    }
  });

  return await res.json();
}

function short(v) {

  if (!v) return "-";

  return String(v).slice(0,10)
    + "..."
    + String(v).slice(-6);
}

function statusClass(status) {
  return "status " + status;
}

async function loadOverview() {

  const data =
    await api("/api/overview");

  const transfers =
    data.transfers || [];

  const accounts =
    data.accounts || [];

  document.getElementById(
    "accountsMetric"
  ).textContent = accounts.length;

  document.getElementById(
    "transfersMetric"
  ).textContent = transfers.length;

  document.getElementById(
    "confirmedMetric"
  ).textContent =
    transfers.filter(
      t => t.status === "confirmed"
    ).length;

  document.getElementById(
    "pendingMetric"
  ).textContent =
    transfers.filter(
      t => t.status !== "confirmed"
    ).length;

  const tbody =
    document.getElementById(
      "transfersTable"
    );

  tbody.innerHTML = "";

  for (const t of transfers.slice(0,12)) {

    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>
        <span class="${statusClass(t.status)}">
          ${t.status}
        </span>
      </td>

      <td>${t.chain}</td>

      <td>${short(t.from)}</td>

      <td>${short(t.to)}</td>

      <td>${t.amountAtomic}</td>

      <td>${short(t.txHash || "-")}</td>
    `;

    tbody.appendChild(tr);
  }

  const activity =
    document.getElementById(
      "activity"
    );

  activity.innerHTML = "";

  for (const t of transfers.slice(0,6)) {

    const div =
      document.createElement("div");

    div.className =
      "activity-item";

    div.innerHTML = `
      <div>
        ${t.status.toUpperCase()}
      </div>

      <div style="font-size:12px;color:#94a3b8;margin-top:6px">
        ${short(t.id)}
      </div>
    `;

    activity.appendChild(div);
  }
}

async function previewTransfer() {

  await api(
    "/api/transfers/preview",
    {
      method:"POST",

      body: JSON.stringify({
        chain:
          document.getElementById("chain").value,

        from:
          document.getElementById("from").value,

        to:
          document.getElementById("to").value,

        amountAtomic:
          document.getElementById("amount").value,
      })
    }
  );

  await loadOverview();
}

loadOverview();

setInterval(
  loadOverview,
  10000
);

</script>

</body>
</html>`);
}
'''

s = s[:start] + replacement + "\n\n" + s[end:]

insert = '''
        if (
          method === "GET"
          && url.pathname === "/dashboard.css"
        ) {

          const fs =
            await import("node:fs/promises");

          const css =
            await fs.readFile(
              new URL(
                "../public/dashboard.css",
                import.meta.url
              ),
              "utf8"
            );

          res.writeHead(200,{
            "content-type":"text/css"
          });

          return res.end(css);
        }

'''

marker = 'if (\n          method === "GET"\n          && url.pathname === "/healthz"\n        ) {'

s = s.replace(marker, insert + "\n" + marker)

p.write_text(s)

print("dashboard upgraded")
PY

echo
echo "== Clean cache =="

find . -name 'tsconfig.tsbuildinfo' -delete

echo
echo "== Build =="

pnpm --filter @zwallet/admin-wallet build

echo
echo "== Restart =="

sudo systemctl restart zwallet

sleep 5

echo
echo "== Health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo
echo "== UI upgrade complete =="
