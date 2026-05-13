import http from "node:http";
import {
  createWalletAccount,
  getWalletOverview,
  previewWalletTransfer,
  queueWalletTransfer,
  getWalletTransfer,
  updateWalletTransfer,
  enqueueTransferExecution,
  type WalletOverview
} from "@zwallet/wallet-engine";
import { isSupportedChain, type SupportedChain } from "@zwallet/shared-types/wallet";
import { getOperatorIdentity, requirePermission } from "./auth/index.js";
import { getRuntimeWalletOverview } from "@zwallet/wallet-engine";

const port = Number(process.env.PORT || 8081);
const pageTitle = "zWallet Admin";
const maxBodyBytes = 1_000_000;

function seedDemoData(): void {
  if (getWalletOverview().accounts.length > 0) return;
  createWalletAccount({ userId: "ops", chain: "evm", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", label: "Treasury EVM" });
  createWalletAccount({ userId: "ops", chain: "solana", address: "So11111111111111111111111111111111111111112", label: "Solana Ops" });
  createWalletAccount({ userId: "ops", chain: "bitcoin", address: "bc1qexamplewalletaddress000000000000000000", label: "Bitcoin Reserve" });
}

seedDemoData();

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderAccountRows(overview: WalletOverview): string {
  return overview.accounts.map((account) => `
    <div class="row">
      <div><b>${escapeHtml(account.label)}</b><small>${escapeHtml(account.chain)} · ${escapeHtml(account.address)}</small></div>
      <span class="status"><i class="dot"></i>${escapeHtml(account.status)}</span>
    </div>`).join("");
}

function renderBalanceRows(overview: WalletOverview): string {
  return overview.balances.map((balance) => `
    <div class="row">
      <div><b>${escapeHtml(balance.asset.toUpperCase())}</b><small>${escapeHtml(balance.accountId)}</small></div>
      <span class="mono">${escapeHtml(balance.amountAtomic)} / 1e${balance.decimals}</span>
    </div>`).join("");
}

function renderTransferRows(overview: WalletOverview): string {
  if (overview.transfers.length === 0) return `<div class="empty">No transfer previews yet. Create one from the form.</div>`;
  return overview.transfers.slice(0, 8).map((transfer) => `
    <div class="row">
      <div><b>${escapeHtml(transfer.chain)} transfer</b><small>${escapeHtml(transfer.from)} → ${escapeHtml(transfer.to)}</small></div>
      <span class="status"><i class="dot warn"></i>${escapeHtml(transfer.status)}</span>
    </div>`).join("");
}

function renderEventRows(overview: WalletOverview): string {
  return overview.events.slice(0, 8).map((event) => `
    <div class="row">
      <div><b>${escapeHtml(event.type)}</b><small>${escapeHtml(event.chain)} · ${escapeHtml(event.occurredAt)}</small></div>
      <span class="mono">${escapeHtml(event.id.slice(0, 8))}</span>
    </div>`).join("");
}

async function renderHtml(): Promise<string> {
  const overview = await getRuntimeWalletOverview();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${pageTitle}</title><style>:root{color-scheme:dark;--bg:#07111f;--panel:rgba(15,23,42,.9);--border:rgba(148,163,184,.22);--text:#e5eefb;--muted:#8ea3bb;--accent:#38bdf8;--good:#22c55e;--warn:#f59e0b}*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at top left,rgba(56,189,248,.18),transparent 32rem),radial-gradient(circle at bottom right,rgba(34,197,94,.1),transparent 28rem),var(--bg);color:var(--text)}header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.25rem clamp(1rem,4vw,3rem);border-bottom:1px solid var(--border);background:rgba(7,17,31,.78);position:sticky;top:0;z-index:2}.brand{display:flex;align-items:center;gap:.8rem;font-weight:800}.logo{width:2.5rem;height:2.5rem;border-radius:.9rem;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--good));color:#03111f}.pill{border:1px solid var(--border);border-radius:999px;padding:.45rem .75rem;color:var(--muted);background:rgba(15,23,42,.64);font-size:.85rem}main{padding:clamp(1rem,4vw,3rem);max-width:1360px;margin:0 auto}.hero,.two{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin:1rem 0}.card{border:1px solid var(--border);background:var(--panel);border-radius:1.35rem;padding:1.25rem;box-shadow:0 24px 80px rgba(0,0,0,.18)}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:.95;margin:.2rem 0 1rem;letter-spacing:-.07em}h2{font-size:1rem;margin:0 0 .9rem;color:#dbeafe}p{color:var(--muted);line-height:1.65}.stat strong{display:block;font-size:1.9rem}.stat span,.row small{display:block;color:var(--muted);font-size:.82rem;margin-top:.2rem;overflow:hidden;text-overflow:ellipsis}.list,form{display:grid;gap:.75rem}.row{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.8rem;border:1px solid var(--border);border-radius:.9rem;background:rgba(2,6,23,.28);min-width:0}.status{display:inline-flex;align-items:center;gap:.45rem;color:var(--muted);font-size:.85rem;white-space:nowrap}.dot{width:.55rem;height:.55rem;border-radius:999px;background:var(--good);box-shadow:0 0 20px var(--good)}.dot.warn{background:var(--warn);box-shadow:0 0 20px var(--warn)}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#b7c7dc;font-size:.78rem;white-space:nowrap}.empty{color:var(--muted);border:1px dashed var(--border);border-radius:.9rem;padding:1rem}.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}.button,button{display:inline-flex;align-items:center;justify-content:center;min-height:2.5rem;padding:.65rem .9rem;border-radius:.85rem;text-decoration:none;color:#06111f;background:linear-gradient(135deg,var(--accent),var(--good));font-weight:750;border:0;cursor:pointer}.button.secondary{color:var(--text);background:rgba(15,23,42,.8);border:1px solid var(--border)}input,select{width:100%;padding:.75rem;border-radius:.8rem;border:1px solid var(--border);background:rgba(2,6,23,.4);color:var(--text)}label{display:grid;gap:.35rem;color:var(--muted);font-size:.86rem}footer{padding:2rem;color:var(--muted);text-align:center}@media(max-width:980px){.hero,.two,.grid{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}}</style></head><body><header><div class="brand"><div class="logo">zW</div><div><div>zWallet Admin</div><small style="color:var(--muted)">wallet runtime console</small></div></div><div class="pill">admin-wallet.zeaz.dev · localhost:8081</div></header><main><section class="hero"><div class="card"><p>Wallet operations console</p><h1>Wallet control plane is live.</h1><p>Create wallet accounts, preview transfer digests, monitor balances, and review wallet event flow from the admin surface.</p><div class="actions"><a class="button" href="/api/overview">JSON overview</a><a class="button secondary" href="/healthz">Health check</a></div></div><div class="card"><h2>Create wallet account</h2><form method="post" action="/wallets"><label>Chain<select name="chain"><option value="evm">EVM</option><option value="solana">Solana</option><option value="bitcoin">Bitcoin</option></select></label><label>User ID<input name="userId" value="ops" /></label><label>Address<input name="address" value="0x0000000000000000000000000000000000000001" /></label><label>Label<input name="label" value="Operations wallet" /></label><button type="submit">Create account</button></form></div></section><section class="grid"><div class="card stat"><strong>${overview.accounts.length}</strong><span>wallet accounts</span></div><div class="card stat"><strong>${overview.balances.length}</strong><span>balance records</span></div><div class="card stat"><strong>${overview.transfers.length}</strong><span>transfer previews</span></div><div class="card stat"><strong>${overview.events.length}</strong><span>wallet events</span></div></section><section class="two"><div class="card"><h2>Accounts</h2><div class="list">${renderAccountRows(overview)}</div></div><div class="card"><h2>Balances</h2><div class="list">${renderBalanceRows(overview)}</div></div></section><section class="two"><div class="card"><h2>Preview transfer</h2><form method="post" action="/transfers/preview"><label>Chain<select name="chain"><option value="evm">EVM</option><option value="solana">Solana</option><option value="bitcoin">Bitcoin</option></select></label><label>From<input name="from" value="0x0000000000000000000000000000000000000001" /></label><label>To<input name="to" value="0x0000000000000000000000000000000000000002" /></label><label>Amount atomic<input name="amountAtomic" value="1000000000000000000" /></label><button type="submit">Preview digest</button></form></div><div class="card"><h2>Recent transfers</h2><div class="list">${renderTransferRows(overview)}</div></div></section><section class="two"><div class="card"><h2>Recent events</h2><div class="list">${renderEventRows(overview)}</div></div><div class="card"><h2>API endpoints</h2><div class="list"><div class="row"><b>GET /api/overview</b><span class="status"><i class="dot"></i>ready</span></div><div class="row"><b>POST /api/wallets</b><span class="status"><i class="dot"></i>ready</span></div><div class="row"><b>POST /api/transfers/preview</b><span class="status"><i class="dot"></i>ready</span></div><div class="row"><b>POST /api/transfers/:id/queue</b><span class="status"><i class="dot warn"></i>preview</span></div></div></div></section></main><footer>zWallet Admin · wallet-engine connected · persistence, auth, signing, and RPC broadcast next</footer></body></html>`;
}

async function sendHtml(res: http.ServerResponse): Promise<void> {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "x-content-type-options": "nosniff" });
  res.end(await renderHtml());
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(payload));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maxBodyBytes) throw new Error("request_body_too_large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readForm(req: http.IncomingMessage): Promise<Record<string, string>> {
  const body = await readBody(req);
  const params = new URLSearchParams(body);
  return Object.fromEntries([...params.entries()]);
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const body = await readBody(req);
  return body ? JSON.parse(body) : {};
}

function redirectHome(res: http.ServerResponse): void {
  res.writeHead(303, { location: "/" });
  res.end();
}

function parseChain(value: unknown): SupportedChain {
  if (!isSupportedChain(value)) throw new Error("unsupported_chain");
  return value;
}

function buildAccountInput(payload: Record<string, unknown>): Parameters<typeof createWalletAccount>[0] {
  const input: Parameters<typeof createWalletAccount>[0] = {
    userId: String(payload.userId ?? "ops"),
    chain: parseChain(payload.chain),
    address: String(payload.address ?? "")
  };
  if (payload.label) input.label = String(payload.label);
  return input;
}


function isPublicPath(pathname: string): boolean {
  return pathname === "/healthz" || pathname === "/readyz";
}

function authErrorStatus(message: string): number {
  if (message.startsWith("forbidden:")) return 403;
  return 401;
}

const server = http.createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const identity = getOperatorIdentity(req);
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/healthz") return sendJson(res, 200, { status: "ok", service: "admin-wallet", runtime: "production" });
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/readyz") return sendJson(res, 200, { status: "ready", service: "admin-wallet" });
    if (req.method === "GET" && url.pathname === "/api/overview") {
      requirePermission(identity, "overview:read");
      return sendJson(res, 200, { ...(await getRuntimeWalletOverview()), operator: identity });
    }
    if (req.method === "POST" && (url.pathname === "/wallets" || url.pathname === "/api/wallets")) {
      requirePermission(identity, "wallet:create");
      const payload = req.headers["content-type"]?.includes("application/json") ? await readJson(req) as Record<string, unknown> : await readForm(req);
      const account = createWalletAccount(buildAccountInput(payload));
      return url.pathname.startsWith("/api/") ? sendJson(res, 201, { account }) : redirectHome(res);
    }
    if (req.method === "POST" && (url.pathname === "/transfers/preview" || url.pathname === "/api/transfers/preview")) {
      requirePermission(identity, "transfer:preview");
      const payload = req.headers["content-type"]?.includes("application/json") ? await readJson(req) as Record<string, unknown> : await readForm(req);
      const transfer = previewWalletTransfer({ chain: parseChain(payload.chain), from: String(payload.from ?? ""), to: String(payload.to ?? ""), amountAtomic: String(payload.amountAtomic ?? "0"), nonce: payload.nonce ? Number(payload.nonce) : undefined, createdAt: new Date().toISOString() });
      return url.pathname.startsWith("/api/") ? sendJson(res, 202, { transfer }) : redirectHome(res);
    }
    const queueMatch = url.pathname.match(/^\/api\/transfers\/([^/]+)\/queue$/);
    if (req.method === "POST" && queueMatch?.[1]) return sendJson(res, 202, { transfer: queueWalletTransfer(queueMatch[1]) });
    if (req.method === "GET" || req.method === "HEAD") {
      if (!isPublicPath(url.pathname)) requirePermission(identity, "overview:read");
      return await sendHtml(res);
    }
    return sendJson(res, 405, { error: "method_not_allowed" });
  })().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, authErrorStatus(message), { error: message });
  });
});

server.listen(port, () => {
  console.log(`zWallet admin runtime listening on :${port}`);
});
