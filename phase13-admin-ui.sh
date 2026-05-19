#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 13: Full Admin Wallet UI =="

cat > apps/admin-wallet/src/server.ts <<'EOF'
import http from "node:http";

import {
  createTransferPreview,
  createWalletAccount,
  enqueueTransferExecution,
  getRuntimeWalletOverview,
  getTransfer,
  markTransferQueued,
} from "@zwallet/wallet-engine";

const PORT = Number(process.env.PORT ?? 8081);

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return await new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (err) { reject(err); }
    });
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res: http.ServerResponse) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });

  res.end(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>zWallet Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root{--bg:#080b12;--card:#111827;--muted:#94a3b8;--text:#f8fafc;--line:#1f2937;--good:#22c55e;--warn:#f59e0b;--bad:#ef4444;--brand:#38bdf8}
    *{box-sizing:border-box}
    body{margin:0;background:linear-gradient(135deg,#020617,#0f172a);color:var(--text);font-family:Inter,Arial,sans-serif}
    header{padding:24px 32px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
    h1{margin:0;font-size:24px}
    main{padding:28px 32px;display:grid;gap:22px}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
    .card{background:rgba(17,24,39,.92);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
    .metric{font-size:30px;font-weight:800}
    .muted{color:var(--muted);font-size:13px}
    .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    input,select,button{border-radius:12px;border:1px solid var(--line);background:#020617;color:var(--text);padding:11px 12px}
    button{cursor:pointer;background:linear-gradient(135deg,#0ea5e9,#2563eb);border:none;font-weight:700}
    button.secondary{background:#1f2937}
    table{width:100%;border-collapse:collapse}
    th,td{padding:12px;border-bottom:1px solid var(--line);text-align:left;font-size:13px}
    th{color:var(--muted)}
    code{font-size:12px;color:#bae6fd}
    .status{padding:4px 9px;border-radius:999px;font-weight:700;font-size:12px}
    .confirmed{background:rgba(34,197,94,.15);color:var(--good)}
    .queued,.executing,.broadcasted{background:rgba(245,158,11,.15);color:var(--warn)}
    .failed{background:rgba(239,68,68,.15);color:var(--bad)}
    .previewed{background:rgba(56,189,248,.15);color:var(--brand)}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media(max-width:900px){.grid,.two{grid-template-columns:1fr}header{padding:18px}main{padding:18px}}
  </style>
</head>
<body>
<header>
  <div>
    <h1>zWallet Admin</h1>
    <div class="muted">Runtime control plane · queues · transfers · signing · settlement</div>
  </div>
  <button onclick="load()">Refresh</button>
</header>

<main>
  <section class="grid">
    <div class="card"><div class="muted">Accounts</div><div id="mAccounts" class="metric">-</div></div>
    <div class="card"><div class="muted">Transfers</div><div id="mTransfers" class="metric">-</div></div>
    <div class="card"><div class="muted">Confirmed</div><div id="mConfirmed" class="metric">-</div></div>
    <div class="card"><div class="muted">Pending</div><div id="mPending" class="metric">-</div></div>
  </section>

  <section class="two">
    <div class="card">
      <h3>Create Wallet</h3>
      <div class="row">
        <select id="walletChain"><option>evm</option><option>solana</option><option>bitcoin</option></select>
        <input id="walletUser" placeholder="userId" value="ops" />
        <input id="walletAddress" placeholder="address" />
        <input id="walletLabel" placeholder="label" />
        <button onclick="createWallet()">Create</button>
      </div>
    </div>

    <div class="card">
      <h3>Preview Transfer</h3>
      <div class="row">
        <select id="txChain"><option>evm</option><option>solana</option><option>bitcoin</option></select>
        <input id="txFrom" placeholder="from" value="0x1111111111111111111111111111111111111111" />
        <input id="txTo" placeholder="to" value="0x2222222222222222222222222222222222222222" />
        <input id="txAmount" placeholder="amountAtomic" value="1000000000000000000" />
        <button onclick="previewTransfer()">Preview</button>
      </div>
    </div>
  </section>

  <section class="card">
    <h3>Transfers</h3>
    <table>
      <thead>
        <tr><th>Status</th><th>Chain</th><th>From</th><th>To</th><th>Amount</th><th>Tx</th><th>Action</th></tr>
      </thead>
      <tbody id="transfers"></tbody>
    </table>
  </section>

  <section class="card">
    <h3>Accounts</h3>
    <table>
      <thead>
        <tr><th>Chain</th><th>Address</th><th>Label</th><th>Status</th></tr>
      </thead>
      <tbody id="accounts"></tbody>
    </table>
  </section>

  <section class="card">
    <h3>Events</h3>
    <pre id="events" class="muted"></pre>
  </section>
</main>

<script>
const token = localStorage.getItem("ZWALLET_TOKEN") || prompt("Paste admin bearer token");
if (token) localStorage.setItem("ZWALLET_TOKEN", token);

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "authorization": "Bearer " + token,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text }; }
}

function short(v){ return v ? String(v).slice(0,10) + "…" + String(v).slice(-6) : ""; }
function cls(s){ return "status " + String(s || "").toLowerCase(); }

async function load(){
  const data = await api("/api/overview");
  const transfers = data.transfers || [];
  const accounts = data.accounts || [];
  document.getElementById("mAccounts").textContent = accounts.length;
  document.getElementById("mTransfers").textContent = transfers.length;
  document.getElementById("mConfirmed").textContent = transfers.filter(t=>t.status==="confirmed").length;
  document.getElementById("mPending").textContent = transfers.filter(t=>["previewed","queued","executing","broadcasted"].includes(t.status)).length;

  document.getElementById("transfers").innerHTML = transfers.map(t => \`
    <tr>
      <td><span class="\${cls(t.status)}">\${t.status}</span></td>
      <td>\${t.chain}</td>
      <td><code>\${short(t.from)}</code></td>
      <td><code>\${short(t.to)}</code></td>
      <td><code>\${t.amountAtomic}</code></td>
      <td><code>\${t.txHash ? short(t.txHash) : "-"}</code></td>
      <td>\${t.status==="previewed" ? \`<button onclick="queueTransfer('\${t.id}')">Queue</button>\` : ""}</td>
    </tr>\`).join("");

  document.getElementById("accounts").innerHTML = accounts.map(a => \`
    <tr><td>\${a.chain}</td><td><code>\${short(a.address)}</code></td><td>\${a.label || ""}</td><td>\${a.status}</td></tr>
  \`).join("");

  document.getElementById("events").textContent = JSON.stringify(data.events || [], null, 2);
}

async function createWallet(){
  const body = {
    chain: walletChain.value,
    userId: walletUser.value,
    address: walletAddress.value,
    label: walletLabel.value
  };
  alert(JSON.stringify(await api("/api/wallets", { method:"POST", body:JSON.stringify(body) }), null, 2));
  load();
}

async function previewTransfer(){
  const body = {
    chain: txChain.value,
    from: txFrom.value,
    to: txTo.value,
    amountAtomic: txAmount.value
  };
  alert(JSON.stringify(await api("/api/transfers/preview", { method:"POST", body:JSON.stringify(body) }), null, 2));
  load();
}

async function queueTransfer(id){
  alert(JSON.stringify(await api("/api/transfers/" + id + "/queue", { method:"POST" }), null, 2));
  setTimeout(load, 2000);
}

load();
setInterval(load, 10000);
</script>
</body>
</html>`);
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", \`http://\${req.headers.host}\`);

    if (method === "GET" && url.pathname === "/healthz") {
      return sendJson(res, 200, { status: "ok", service: "admin-wallet", runtime: process.env.NODE_ENV ?? "development" });
    }

    if (method === "GET" && url.pathname === "/") return sendHtml(res);

    if (method === "GET" && url.pathname === "/api/overview") {
      return sendJson(res, 200, await getRuntimeWalletOverview());
    }

    if (method === "POST" && url.pathname === "/api/wallets") {
      const body = await readJsonBody(req);
      const account = await createWalletAccount({
        userId: body.userId ?? "ops",
        chain: body.chain,
        address: body.address,
        label: body.label,
      });
      return sendJson(res, 200, { account });
    }

    if (method === "POST" && url.pathname === "/api/transfers/preview") {
      const body = await readJsonBody(req);
      const transfer = await createTransferPreview({
        chain: body.chain,
        from: body.from,
        to: body.to,
        amountAtomic: body.amountAtomic,
      });
      return sendJson(res, 200, { transfer });
    }

    const queueMatch = url.pathname.match(/^\\/api\\/transfers\\/([^/]+)\\/queue$/);
    if (method === "POST" && queueMatch?.[1]) {
      const transfer = await getTransfer(queueMatch[1]);
      if (!transfer) return sendJson(res, 404, { error: "transfer not found" });
      const queued = await markTransferQueued(transfer.id);
      const job = await enqueueTransferExecution({ transferId: queued.id });
      return sendJson(res, 200, { transfer: queued, jobId: job.id });
    }

    return sendJson(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err instanceof Error ? err.message : "internal error" });
  }
});

server.listen(PORT, () => {
  console.log(\`zWallet admin runtime listening on :\${PORT}\`);
});
EOF

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm --filter @zwallet/admin-wallet build

sudo systemctl restart zwallet

sleep 3

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo "== Admin UI ready =="
echo "https://admin-wallet.zeaz.dev/"
