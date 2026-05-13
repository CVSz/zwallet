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
