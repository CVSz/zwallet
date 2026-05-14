import type { OperatorIdentity, OperatorRole, Permission } from "./types.js";

const rolePermissions: Record<OperatorRole, Permission[]> = {
  viewer: ["overview:read", "defi:read", "nft:read", "governance:read", "treasury:read"],
  operator: [
    "overview:read",
    "wallet:create",
    "transfer:preview",
    "transfer:queue",
    "defi:read",
    "nft:read",
    "governance:read",
    "treasury:read"
  ],
  approver: [
    "overview:read",
    "wallet:create",
    "transfer:preview",
    "transfer:queue",
    "transfer:sign",
    "transfer:broadcast",
    "treasury:read",
    "governance:read",
    "governance:vote"
  ],
  admin: [
    "overview:read",
    "wallet:create",
    "wallet:permission:manage",
    "transfer:preview",
    "transfer:queue",
    "transfer:sign",
    "transfer:broadcast",
    "policy:admin",
    "treasury:read",
    "treasury:execute",
    "defi:read",
    "defi:stake",
    "defi:lp:read",
    "defi:lending:read",
    "nft:read",
    "governance:read",
    "governance:vote",
    "governance:propose"
  ],
  treasury_manager: ["treasury:read", "treasury:execute", "governance:read", "governance:propose"],
  defi_analyst: ["defi:read", "defi:stake", "defi:lp:read", "defi:lending:read", "overview:read"],
  governance_manager: ["governance:read", "governance:vote", "governance:propose", "treasury:read"],
  nft_curator: ["nft:read", "overview:read"]
};

export function hasPermission(identity: OperatorIdentity, permission: Permission): boolean {
  return identity.roles.some((role) => rolePermissions[role]?.includes(permission));
}

export function requirePermission(identity: OperatorIdentity, permission: Permission): void {
  if (!hasPermission(identity, permission)) throw new Error(`forbidden:${permission}`);
}
