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
