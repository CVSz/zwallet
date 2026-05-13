#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 9: Authentication + RBAC + operator security =="

echo "== Install auth dependencies =="

pnpm add -w jsonwebtoken cookie

pnpm add -Dw @types/jsonwebtoken @types/cookie

echo "== Create auth modules =="

mkdir -p apps/admin-wallet/src/auth

cat > apps/admin-wallet/src/auth/types.ts <<'EOF'
export type OperatorRole = "viewer" | "operator" | "approver" | "admin";

export interface OperatorIdentity {
  id: string;
  email: string;
  name: string;
  roles: OperatorRole[];
  source: "cloudflare-access" | "dev-token" | "anonymous";
}

export interface AuthConfig {
  nodeEnv: string;
  allowDevAuth: boolean;
  devToken?: string;
}

export type Permission =
  | "overview:read"
  | "wallet:create"
  | "transfer:preview"
  | "transfer:queue"
  | "transfer:sign"
  | "transfer:broadcast"
  | "policy:admin";
EOF

cat > apps/admin-wallet/src/auth/rbac.ts <<'EOF'
import type { OperatorIdentity, OperatorRole, Permission } from "./types.js";

const rolePermissions: Record<OperatorRole, Permission[]> = {
  viewer: ["overview:read"],
  operator: [
    "overview:read",
    "wallet:create",
    "transfer:preview",
    "transfer:queue"
  ],
  approver: [
    "overview:read",
    "wallet:create",
    "transfer:preview",
    "transfer:queue",
    "transfer:sign",
    "transfer:broadcast"
  ],
  admin: [
    "overview:read",
    "wallet:create",
    "transfer:preview",
    "transfer:queue",
    "transfer:sign",
    "transfer:broadcast",
    "policy:admin"
  ]
};

export function hasPermission(
  identity: OperatorIdentity,
  permission: Permission
): boolean {
  return identity.roles.some((role) =>
    rolePermissions[role]?.includes(permission)
  );
}

export function requirePermission(
  identity: OperatorIdentity,
  permission: Permission
): void {
  if (!hasPermission(identity, permission)) {
    throw new Error(`forbidden:${permission}`);
  }
}
EOF

cat > apps/admin-wallet/src/auth/identity.ts <<'EOF'
import type { IncomingMessage } from "node:http";
import jwt from "jsonwebtoken";
import type { OperatorIdentity, OperatorRole } from "./types.js";

function parseRoles(value: string | undefined): OperatorRole[] {
  if (!value) return ["viewer"];

  const allowed = new Set(["viewer", "operator", "approver", "admin"]);

  const roles = value
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is OperatorRole => allowed.has(role));

  return roles.length > 0 ? roles : ["viewer"];
}

function fromCloudflareAccess(req: IncomingMessage): OperatorIdentity | undefined {
  const email = req.headers["cf-access-authenticated-user-email"]?.toString();

  if (!email) return undefined;

  const name =
    req.headers["cf-access-authenticated-user-name"]?.toString()
    ?? email;

  return {
    id: email,
    email,
    name,
    roles: parseRoles(
      req.headers["x-zwallet-roles"]?.toString()
      ?? process.env.DEFAULT_OPERATOR_ROLES
      ?? "viewer"
    ),
    source: "cloudflare-access"
  };
}

function fromDevToken(req: IncomingMessage): OperatorIdentity | undefined {
  const allowDevAuth = process.env.ALLOW_DEV_AUTH === "true";
  const configuredToken = process.env.ZWALLET_DEV_TOKEN;

  if (!allowDevAuth || !configuredToken) return undefined;

  const auth = req.headers.authorization?.toString() ?? "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice("Bearer ".length)
    : "";

  if (!token) return undefined;

  try {
    const decoded = jwt.verify(token, configuredToken) as {
      sub?: string;
      email?: string;
      name?: string;
      roles?: string[] | string;
    };

    const roles = Array.isArray(decoded.roles)
      ? parseRoles(decoded.roles.join(","))
      : parseRoles(decoded.roles);

    return {
      id: decoded.sub ?? decoded.email ?? "dev-operator",
      email: decoded.email ?? "dev@localhost",
      name: decoded.name ?? decoded.email ?? "Dev Operator",
      roles,
      source: "dev-token"
    };
  } catch {
    return undefined;
  }
}

export function getOperatorIdentity(
  req: IncomingMessage
): OperatorIdentity {
  return (
    fromCloudflareAccess(req)
    ?? fromDevToken(req)
    ?? {
      id: "anonymous",
      email: "anonymous",
      name: "Anonymous",
      roles: [],
      source: "anonymous"
    }
  );
}
EOF

cat > apps/admin-wallet/src/auth/index.ts <<'EOF'
export * from "./types.js";
export * from "./rbac.js";
export * from "./identity.js";
EOF

echo "== Patch admin-wallet server with auth/RBAC =="

python3 - <<'PY'
from pathlib import Path

p = Path("apps/admin-wallet/src/server.ts")
s = p.read_text()

if 'getOperatorIdentity' not in s:
    s = s.replace(
        'import { isSupportedChain, type SupportedChain } from "@zwallet/shared-types/wallet";',
        'import { isSupportedChain, type SupportedChain } from "@zwallet/shared-types/wallet";\nimport { getOperatorIdentity, requirePermission } from "./auth/index.js";'
    )

# Add helper before server creation
marker = 'const server = http.createServer((req, res) => {'
helper = '''
function isPublicPath(pathname: string): boolean {
  return pathname === "/healthz" || pathname === "/readyz";
}

function authErrorStatus(message: string): number {
  if (message.startsWith("forbidden:")) return 403;
  return 401;
}
'''
if helper.strip() not in s:
    s = s.replace(marker, helper + "\n" + marker)

# Inject identity after url parse
s = s.replace(
    'const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);',
    'const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);\n    const identity = getOperatorIdentity(req);'
)

# Overview read permission
s = s.replace(
    'if (req.method === "GET" && url.pathname === "/api/overview") return sendJson(res, 200, await getRuntimeWalletOverview());',
    'if (req.method === "GET" && url.pathname === "/api/overview") {\n      requirePermission(identity, "overview:read");\n      return sendJson(res, 200, { ...(await getRuntimeWalletOverview()), operator: identity });\n    }'
)

# Wallet create permission
s = s.replace(
    'if (req.method === "POST" && (url.pathname === "/wallets" || url.pathname === "/api/wallets")) {',
    'if (req.method === "POST" && (url.pathname === "/wallets" || url.pathname === "/api/wallets")) {\n      requirePermission(identity, "wallet:create");'
)

# Transfer preview permission
s = s.replace(
    'if (req.method === "POST" && (url.pathname === "/transfers/preview" || url.pathname === "/api/transfers/preview")) {',
    'if (req.method === "POST" && (url.pathname === "/transfers/preview" || url.pathname === "/api/transfers/preview")) {\n      requirePermission(identity, "transfer:preview");'
)

# Queue permission
s = s.replace(
    'if (req.method === "POST" && queueMatch?.[1]) {',
    'if (req.method === "POST" && queueMatch?.[1]) {\n      requirePermission(identity, "transfer:queue");'
)

# Render HTML permission for dashboard, but leave health public
s = s.replace(
    'if (req.method === "GET" || req.method === "HEAD") return await sendHtml(res);',
    'if (req.method === "GET" || req.method === "HEAD") {\n      if (!isPublicPath(url.pathname)) requirePermission(identity, "overview:read");\n      return await sendHtml(res);\n    }'
)

# Better error handling status
s = s.replace(
    '})().catch((error: unknown) => sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }));',
    '})().catch((error: unknown) => {\n    const message = error instanceof Error ? error.message : String(error);\n    sendJson(res, authErrorStatus(message), { error: message });\n  });'
)

p.write_text(s)
PY

echo "== Add dev token generator =="

mkdir -p apps/admin-wallet/scripts

cat > apps/admin-wallet/scripts/create-dev-token.mjs <<'EOF'
import jwt from "jsonwebtoken";

const secret = process.env.ZWALLET_DEV_TOKEN;

if (!secret) {
  console.error("ZWALLET_DEV_TOKEN is required");
  process.exit(1);
}

const token = jwt.sign(
  {
    sub: "dev-admin",
    email: "dev-admin@localhost",
    name: "Dev Admin",
    roles: ["admin"]
  },
  secret,
  {
    expiresIn: "12h"
  }
);

console.log(token);
EOF

echo "== Update systemd env for default protected mode =="

sudo mkdir -p /etc/zwallet

sudo tee /etc/zwallet/admin-wallet.env >/dev/null <<'EOF'
NODE_ENV=production
PORT=8081
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zwallet
REDIS_URL=redis://127.0.0.1:6379
ALLOW_DEV_AUTH=false
DEFAULT_OPERATOR_ROLES=admin
EOF

echo "== Build =="

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm install --frozen-lockfile=false

pnpm --filter @zwallet/rpc build
pnpm --filter @zwallet/shared-types build
pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo "== Restart services =="

sudo systemctl daemon-reload
sudo systemctl restart zwallet-transfer-worker
sudo systemctl restart zwallet

sleep 5

echo "== Status =="

sudo systemctl status zwallet-transfer-worker --no-pager
sudo systemctl status zwallet --no-pager

echo "== Public health should stay open =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo "== Overview should work with default Cloudflare/admin role fallback =="

curl -s https://admin-wallet.zeaz.dev/api/overview | jq '.operator'

echo "== Create transfer preview with admin fallback =="

TRANSFER_ID="$(
curl -s -X POST https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H 'content-type: application/json' \
  -d '{"chain":"evm","from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","amountAtomic":"1000000000000000000"}' \
  | jq -r '.transfer.id'
)"

echo "Transfer ID: $TRANSFER_ID"

echo "== Queue transfer =="

curl -s -X POST "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" | jq

sleep 6

echo "== Verify transfer =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  | jq --arg id "$TRANSFER_ID" '.transfers[] | select(.id == $id)'

echo
echo "== PHASE 9 COMPLETE =="
