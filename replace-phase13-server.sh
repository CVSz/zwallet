#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

cat > apps/admin-wallet/src/server.ts <<'EOT'
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

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  payload: unknown
) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });

  res.end(JSON.stringify(payload));
}

function sendHtml(res: http.ServerResponse) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
  });

  res.end(`
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>zWallet Admin</title>

<style>
body{
  margin:0;
  background:#0f172a;
  color:white;
  font-family:Arial,sans-serif;
}

header{
  padding:20px;
  border-bottom:1px solid #1e293b;
}

main{
  padding:20px;
}

.card{
  background:#111827;
  border:1px solid #1f2937;
  border-radius:14px;
  padding:16px;
  margin-bottom:20px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:16px;
}

.metric{
  font-size:32px;
  font-weight:bold;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  padding:10px;
  border-bottom:1px solid #1f2937;
  text-align:left;
  font-size:13px;
}

button{
  background:#2563eb;
  border:none;
  color:white;
  padding:8px 12px;
  border-radius:8px;
  cursor:pointer;
}

input,select{
  padding:10px;
  border-radius:8px;
  border:1px solid #334155;
  background:#020617;
  color:white;
}

.row{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
</style>
</head>

<body>

<header>
  <h1>zWallet Admin Dashboard</h1>
</header>

<main>

<div class="grid">
  <div class="card">
    <div>Accounts</div>
    <div id="accountsMetric" class="metric">0</div>
  </div>

  <div class="card">
    <div>Transfers</div>
    <div id="transfersMetric" class="metric">0</div>
  </div>

  <div class="card">
    <div>Confirmed</div>
    <div id="confirmedMetric" class="metric">0</div>
  </div>

  <div class="card">
    <div>Pending</div>
    <div id="pendingMetric" class="metric">0</div>
  </div>
</div>

<div class="card">
  <h3>Create Transfer</h3>

  <div class="row">
    <select id="chain">
      <option value="evm">evm</option>
      <option value="solana">solana</option>
      <option value="bitcoin">bitcoin</option>
    </select>

    <input id="from" value="0x1111111111111111111111111111111111111111" />
    <input id="to" value="0x2222222222222222222222222222222222222222" />
    <input id="amount" value="1000000000000000000" />

    <button onclick="previewTransfer()">
      Preview Transfer
    </button>
  </div>
</div>

<div class="card">
  <h3>Transfers</h3>

  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>Chain</th>
        <th>From</th>
        <th>To</th>
        <th>Amount</th>
        <th>Tx Hash</th>
        <th>Action</th>
      </tr>
    </thead>

    <tbody id="transfers"></tbody>
  </table>
</div>

</main>

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
      "authorization": "Bearer " + token,
      "content-type": "application/json",
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

async function load() {

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
      "transfers"
    );

  tbody.innerHTML = "";

  for (const t of transfers) {

    const tr =
      document.createElement("tr");

    tr.innerHTML = \`
      <td>\${t.status}</td>
      <td>\${t.chain}</td>
      <td>\${short(t.from)}</td>
      <td>\${short(t.to)}</td>
      <td>\${t.amountAtomic}</td>
      <td>\${short(t.txHash || "")}</td>
      <td>
        \${t.status === "previewed"
          ? '<button onclick="queueTransfer(\\'' + t.id + '\\')">Queue</button>'
          : ''}
      </td>
    \`;

    tbody.appendChild(tr);
  }
}

async function previewTransfer() {

  const transfer =
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

  console.log(transfer);

  await load();
}

async function queueTransfer(id) {

  await api(
    "/api/transfers/" + id + "/queue",
    {
      method:"POST"
    }
  );

  await load();
}

load();

setInterval(load, 10000);

</script>

</body>
</html>
`);
}

const server =
  http.createServer(
    async (req, res) => {

      try {

        const method =
          req.method ?? "GET";

        const url =
          new URL(
            req.url ?? "/",
            "http://" + req.headers.host
          );

        if (
          method === "GET"
          && url.pathname === "/healthz"
        ) {

          return sendJson(
            res,
            200,
            {
              status: "ok",
              service: "admin-wallet",
              runtime: "production",
            }
          );
        }

        if (
          method === "GET"
          && url.pathname === "/"
        ) {

          return sendHtml(res);
        }

        if (
          method === "GET"
          && url.pathname === "/api/overview"
        ) {

          return sendJson(
            res,
            200,
            await getRuntimeWalletOverview()
          );
        }

        if (
          method === "POST"
          && url.pathname === "/api/transfers/preview"
        ) {

          const body =
            await readJsonBody(req);

          const transfer =
            await createTransferPreview({
              chain: body.chain,
              from: body.from,
              to: body.to,
              amountAtomic:
                body.amountAtomic,
            });

          return sendJson(
            res,
            200,
            { transfer }
          );
        }

        const queueMatch =
          url.pathname.match(
            /^\/api\/transfers\/([^/]+)\/queue$/
          );

        if (
          method === "POST"
          && queueMatch
        ) {

          const transferId =
            queueMatch[1];

          const transfer =
            await getTransfer(
              transferId
            );

          if (!transfer) {

            return sendJson(
              res,
              404,
              {
                error:
                  "transfer not found"
              }
            );
          }

          const queued =
            await markTransferQueued(
              transfer.id
            );

          const job =
            await enqueueTransferExecution({
              transferId:
                queued.id
            });

          return sendJson(
            res,
            200,
            {
              transfer: queued,
              jobId: job.id
            }
          );
        }

        if (
          method === "POST"
          && url.pathname === "/api/wallets"
        ) {

          const body =
            await readJsonBody(req);

          const account =
            await createWalletAccount({
              userId:
                body.userId ?? "ops",

              chain:
                body.chain,

              address:
                body.address,

              label:
                body.label,
            });

          return sendJson(
            res,
            200,
            { account }
          );
        }

        return sendJson(
          res,
          404,
          { error:"not found" }
        );

      } catch (err) {

        console.error(err);

        return sendJson(
          res,
          500,
          {
            error:
              err instanceof Error
                ? err.message
                : "internal error"
          }
        );
      }
    }
  );

server.listen(
  PORT,
  () => {
    console.log(
      "zWallet admin runtime listening on :" + PORT
    );
  }
);
EOT

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm --filter @zwallet/admin-wallet build

sudo systemctl restart zwallet

sleep 5

curl -s https://admin-wallet.zeaz.dev/healthz
echo
