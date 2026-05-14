import http from "node:http";

import {
  createTransferPreview,
  createWalletAccount,
  enqueueTransferExecution,
  getRuntimeWalletOverview,
  getTransfer,
  markTransferQueued,
} from "@zwallet/wallet-engine";

import { createSession, getOperatorIdentity, getRequestCsrf } from "./auth/identity.js";
import { hasPermission } from "./auth/rbac.js";
import type { OperatorIdentity, Permission } from "./auth/types.js";

const PORT = Number(process.env.PORT ?? 8081);

const dashboardData = {
  defi: {
    stakingPools: [{ id: "eth-staking", apr: 4.6, tvlUsd: 12000000 }],
    lpPositions: [{ id: "eth-usdc", protocol: "Uniswap v3", valueUsd: 45210.54, fees24hUsd: 45.12 }],
    lending: { suppliedUsd: 222100.22, borrowedUsd: 44111.25, healthFactor: 2.44 }
  },
  nfts: [
    { id: "nft-1", name: "Genesis Validator", collection: "zWallet Origins", floorEth: 1.3 },
    { id: "nft-2", name: "Treasury Sigil", collection: "zWallet Gov", floorEth: 2.0 }
  ],
  governance: {
    proposals: [
      { id: "gov-42", title: "Deploy treasury diversification", state: "active", forVotes: 392000, againstVotes: 22000 }
    ]
  },
  treasuryActions: [] as Array<{ proposalId: string; executedBy: string; at: string }>
};

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return await new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (err) { reject(err); }
    });
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown, headers?: Record<string, string>) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(payload));
}

function assertAuthorized(req: http.IncomingMessage, permission: Permission): OperatorIdentity {
  const identity = getOperatorIdentity(req);
  if (!identity.roles.length) throw new Error("unauthorized");
  const stateChangingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method ?? "GET");
  if (stateChangingMethod && identity.source === "session-cookie") {
    const requestCsrf = getRequestCsrf(req);
    const storedCsrf = (req as http.IncomingMessage & { csrfToken?: string }).csrfToken;
    if (!requestCsrf || !storedCsrf || requestCsrf !== storedCsrf) throw new Error("forbidden:csrf");
  }
  if (!hasPermission(identity, permission)) throw new Error(`forbidden:${permission}`);
  return identity;
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (method === "GET" && url.pathname === "/healthz") return sendJson(res, 200, { status: "ok", service: "admin-wallet" });

    if (method === "POST" && url.pathname === "/auth/session") {
      const body = await readJsonBody(req);
      const session = createSession({
        sub: body.userId ?? "ops-user",
        email: body.email ?? "ops@zwallet.io",
        name: body.name ?? "Ops User",
        roles: body.roles ?? ["viewer"],
        orgId: body.orgId ?? "org-default",
        workspaceId: body.workspaceId ?? "workspace-default"
      });
      return sendJson(res, 200, { authenticated: true, csrfToken: session.csrfToken }, {
        "set-cookie": `zw_session=${session.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${session.expiresAt - Math.floor(Date.now() / 1000)}`
      });
    }

    if (method === "GET" && url.pathname === "/api/overview") {
      assertAuthorized(req, "overview:read");
      const overview = await getRuntimeWalletOverview();
      return sendJson(res, 200, { ...overview, orgId: getOperatorIdentity(req).orgId, workspaceId: getOperatorIdentity(req).workspaceId });
    }

    if (method === "POST" && url.pathname === "/api/wallets") {
      const identity = assertAuthorized(req, "wallet:create");
      const body = await readJsonBody(req);
      const account = await createWalletAccount({ userId: body.userId ?? identity.id, chain: body.chain, address: body.address, label: body.label });
      return sendJson(res, 200, { account });
    }

    if (method === "GET" && url.pathname === "/api/wallet-permissions") {
      assertAuthorized(req, "wallet:permission:manage");
      return sendJson(res, 200, { policies: ["owner", "operator", "signer", "auditor"] });
    }

    if (method === "POST" && url.pathname === "/api/transfers/preview") {
      assertAuthorized(req, "transfer:preview");
      const body = await readJsonBody(req);
      const transfer = await createTransferPreview({ chain: body.chain, from: body.from, to: body.to, amountAtomic: body.amountAtomic });
      return sendJson(res, 200, { transfer });
    }

    const queueMatch = url.pathname.match(/^\/api\/transfers\/([^/]+)\/queue$/);
    if (method === "POST" && queueMatch) {
      assertAuthorized(req, "transfer:queue");
      const transferId = queueMatch[1];
      if (!transferId) return sendJson(res, 400, { error: "missing transfer id" });
      const transfer = await getTransfer(transferId);
      if (!transfer) return sendJson(res, 404, { error: "transfer not found" });
      const queued = await markTransferQueued(transfer.id);
      const job = await enqueueTransferExecution({ transferId: queued.id });
      return sendJson(res, 200, { transfer: queued, jobId: job.id });
    }

    if (method === "GET" && url.pathname === "/api/defi/staking") {
      assertAuthorized(req, "defi:read");
      return sendJson(res, 200, dashboardData.defi.stakingPools);
    }
    if (method === "GET" && url.pathname === "/api/defi/lp-positions") {
      assertAuthorized(req, "defi:lp:read");
      return sendJson(res, 200, dashboardData.defi.lpPositions);
    }
    if (method === "GET" && url.pathname === "/api/defi/lending") {
      assertAuthorized(req, "defi:lending:read");
      return sendJson(res, 200, dashboardData.defi.lending);
    }
    if (method === "GET" && url.pathname === "/api/nft/gallery") {
      assertAuthorized(req, "nft:read");
      return sendJson(res, 200, dashboardData.nfts);
    }
    const nftMatch = url.pathname.match(/^\/api\/nft\/([^/]+)$/);
    if (method === "GET" && nftMatch) {
      assertAuthorized(req, "nft:read");
      return sendJson(res, 200, dashboardData.nfts.find((n) => n.id === nftMatch[1]) ?? { error: "not found" });
    }
    if (method === "GET" && url.pathname === "/api/governance/proposals") {
      assertAuthorized(req, "governance:read");
      return sendJson(res, 200, dashboardData.governance.proposals);
    }
    if (method === "POST" && url.pathname === "/api/governance/vote") {
      const identity = assertAuthorized(req, "governance:vote");
      const body = await readJsonBody(req);
      return sendJson(res, 200, { status: "recorded", voter: identity.id, ...body });
    }
    if (method === "POST" && url.pathname === "/api/treasury/execute") {
      const identity = assertAuthorized(req, "treasury:execute");
      const body = await readJsonBody(req);
      dashboardData.treasuryActions.push({ proposalId: body.proposalId, executedBy: identity.id, at: new Date().toISOString() });
      return sendJson(res, 200, { status: "executed", history: dashboardData.treasuryActions });
    }

    return sendJson(res, 404, { error: "not found" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error";
    const status = message.startsWith("forbidden") ? 403 : message === "unauthorized" ? 401 : 500;
    return sendJson(res, status, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`zWallet admin runtime listening on :${PORT}`);
});
