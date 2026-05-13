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
