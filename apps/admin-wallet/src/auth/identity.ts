import type { IncomingMessage } from "node:http";
import crypto from "node:crypto";

import type { OperatorIdentity, OperatorRole, SessionClaims } from "./types.js";

const allowedRoles = new Set<OperatorRole>([
  "viewer", "operator", "approver", "admin", "treasury_manager", "defi_analyst", "governance_manager", "nft_curator"
]);

function parseRoles(value: string | undefined): OperatorRole[] {
  if (!value) return ["viewer"];
  const roles = value.split(",").map((r) => r.trim()).filter((r): r is OperatorRole => allowedRoles.has(r as OperatorRole));
  return roles.length ? roles : ["viewer"];
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(header.split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((p) => p.length === 2));
}

function verifySession(token: string): SessionClaims | undefined {
  const secret = process.env.JWT_SESSION_SECRET;
  if (!secret) return undefined;
  const [encodedBody, encodedSig] = token.split(".");
  if (!encodedBody || !encodedSig) return undefined;
  const expectedSig = crypto.createHmac("sha256", secret).update(encodedBody).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(encodedSig), Buffer.from(expectedSig))) return undefined;
  const claims = JSON.parse(Buffer.from(encodedBody, "base64url").toString("utf8")) as SessionClaims;
  if (Date.now() / 1000 >= claims.exp) return undefined;
  return claims;
}

export function createSession(claims: Omit<SessionClaims, "exp" | "iat" | "csrfToken">): { token: string; csrfToken: string; expiresAt: number } {
  const ttl = Number(process.env.JWT_SESSION_TTL_SECONDS ?? 8 * 3600);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttl;
  const csrfToken = crypto.randomBytes(24).toString("hex");
  const fullClaims: SessionClaims = { ...claims, iat, exp, csrfToken };
  const body = Buffer.from(JSON.stringify(fullClaims)).toString("base64url");
  const secret = process.env.JWT_SESSION_SECRET ?? "development-secret-change-me";
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return { token: `${body}.${sig}`, csrfToken, expiresAt: exp };
}

function fromSessionCookie(req: IncomingMessage): OperatorIdentity | undefined {
  const cookies = parseCookies(req.headers.cookie?.toString());
  const session = cookies.zw_session;
  if (!session) return undefined;
  const claims = verifySession(session);
  if (!claims) return undefined;
  (req as IncomingMessage & { csrfToken?: string }).csrfToken = claims.csrfToken;
  return {
    id: claims.sub,
    email: claims.email,
    name: claims.name,
    roles: claims.roles,
    orgId: claims.orgId,
    workspaceId: claims.workspaceId,
    source: "session-cookie"
  };
}

function fromCloudflareAccess(req: IncomingMessage): OperatorIdentity | undefined {
  const email = req.headers["cf-access-authenticated-user-email"]?.toString();
  if (!email) return undefined;
  return {
    id: email,
    email,
    name: req.headers["cf-access-authenticated-user-name"]?.toString() ?? email,
    roles: parseRoles(req.headers["x-zwallet-roles"]?.toString() ?? process.env.DEFAULT_OPERATOR_ROLES ?? "viewer"),
    orgId: req.headers["x-zwallet-org"]?.toString() ?? "org-default",
    workspaceId: req.headers["x-zwallet-workspace"]?.toString() ?? "workspace-default",
    source: "cloudflare-access"
  };
}

export function getOperatorIdentity(req: IncomingMessage): OperatorIdentity {
  return fromSessionCookie(req) ?? fromCloudflareAccess(req) ?? {
    id: "anonymous", email: "anonymous", name: "Anonymous", roles: [], orgId: "none", workspaceId: "none", source: "anonymous"
  };
}

export function getRequestCsrf(req: IncomingMessage): string | undefined {
  return req.headers["x-csrf-token"]?.toString();
}
