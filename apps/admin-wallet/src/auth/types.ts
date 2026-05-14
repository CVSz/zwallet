export type OperatorRole =
  | "viewer"
  | "operator"
  | "approver"
  | "admin"
  | "treasury_manager"
  | "defi_analyst"
  | "governance_manager"
  | "nft_curator";

export type Permission =
  | "overview:read"
  | "wallet:create"
  | "wallet:permission:manage"
  | "transfer:preview"
  | "transfer:queue"
  | "transfer:sign"
  | "transfer:broadcast"
  | "policy:admin"
  | "treasury:read"
  | "treasury:execute"
  | "defi:read"
  | "defi:stake"
  | "defi:lp:read"
  | "defi:lending:read"
  | "nft:read"
  | "governance:read"
  | "governance:vote"
  | "governance:propose";

export interface SessionClaims {
  sub: string;
  email: string;
  name: string;
  roles: OperatorRole[];
  orgId: string;
  workspaceId: string;
  csrfToken: string;
  exp: number;
  iat: number;
}

export interface OperatorIdentity {
  id: string;
  email: string;
  name: string;
  roles: OperatorRole[];
  orgId: string;
  workspaceId: string;
  source: "session-cookie" | "cloudflare-access" | "dev-token" | "anonymous";
}
