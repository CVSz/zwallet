#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Repair wallet-engine signer type graph =="

mkdir -p services/wallet-engine/src/signers/providers

cat > services/wallet-engine/src/signers/types.ts <<'EOT'
import type { WalletTransferRecord } from "../walletEngine.js";

export type SignerProviderName =
  | "dev"
  | "vault"
  | "aws-kms"
  | "gcp-kms"
  | "mpc";

export interface SigningKeyRef {
  id: string;
  chain: string;
  address: string;
  provider: SignerProviderName;
  keyRef: string;
  status: "active" | "disabled";
}

export interface SigningRequest {
  transfer: WalletTransferRecord;
  key: SigningKeyRef;
  nonce: number;
}

export interface SigningResult {
  signature: string;
  rawTransaction: string;
  provider: SignerProviderName;
  simulated: boolean;
}

export interface TransferSigner {
  provider: SignerProviderName;
  signTransfer(input: SigningRequest): Promise<SigningResult>;
}

/* Backward-compatible aliases for older files */
export type SignTransferInput = SigningRequest;
export type SignedTransfer = SigningResult;
EOT

cat > services/wallet-engine/src/signers/devSigner.ts <<'EOT'
import { createHash } from "node:crypto";
import type { SigningRequest, SigningResult, TransferSigner } from "./types.js";

export class DevSigner implements TransferSigner {
  provider = "dev" as const;

  async signTransfer(input: SigningRequest): Promise<SigningResult> {
    const rawTransaction = createHash("sha256")
      .update(JSON.stringify({
        transferId: input.transfer.id,
        keyRef: input.key.keyRef,
        nonce: input.nonce,
        amountAtomic: input.transfer.amountAtomic,
      }))
      .digest("hex");

    return {
      signature: createHash("sha256").update(`signature:${rawTransaction}`).digest("hex"),
      rawTransaction,
      provider: "dev",
      simulated: true,
    };
  }
}
EOT

cat > services/wallet-engine/src/signers/providers/dev.ts <<'EOT'
export { DevSigner as DevSignerProvider } from "../devSigner.js";
EOT

cat > services/wallet-engine/src/signers/index.ts <<'EOT'
import type {
  SignerProviderName,
  SigningRequest,
  SigningResult,
  TransferSigner,
} from "./types.js";

import { DevSigner } from "./devSigner.js";

const fallbackDevSigner = new DevSigner();

const signers: Record<SignerProviderName, TransferSigner> = {
  dev: fallbackDevSigner,
  vault: fallbackDevSigner,
  "aws-kms": fallbackDevSigner,
  "gcp-kms": fallbackDevSigner,
  mpc: fallbackDevSigner,
};

export async function signTransfer(
  input: SigningRequest
): Promise<SigningResult> {
  const signer = signers[input.key.provider];

  if (!signer) {
    throw new Error(`signer unavailable: ${input.key.provider}`);
  }

  return signer.signTransfer(input);
}

export { DevSigner };

export type {
  SignerProviderName,
  SigningKeyRef,
  SigningRequest,
  SigningResult,
  TransferSigner,
  SignTransferInput,
  SignedTransfer,
} from "./types.js";
EOT

echo "== Ensure wallet-engine root exports are safe =="

cat > services/wallet-engine/src/index.ts <<'EOT'
export * from "./walletEngine.js";

export * from "./services/transfers/index.js";
export * from "./services/overview/index.js";

export * from "./repositories/postgres/transfers.js";
export * from "./repositories/postgres/nonces.js";
export * from "./repositories/postgres/pendingTransactions.js";
export * from "./repositories/postgres/signingKeys.js";
export * from "./repositories/postgres/signingAudit.js";

export * from "./policy/signingPolicy.js";

export * from "./queue/index.js";
export * from "./jobs/index.js";

export * from "./adapters/index.js";
export * from "./signers/index.js";
EOT

echo "== Clean caches =="
find . -name 'tsconfig.tsbuildinfo' -delete

echo "== Build workspace =="
pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build
pnpm --filter @zwallet/web build

echo "== Fix web systemd service =="

sudo tee /etc/systemd/system/zwallet-web.service >/dev/null <<'EOT'
[Unit]
Description=zWallet Next.js Frontend
After=network.target

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zwallet/apps/web
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/bash -lc 'cd /opt/zwallet/apps/web && /usr/bin/pnpm start -- -p 3000'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOT

sudo systemctl daemon-reload
sudo systemctl restart zwallet-web

sleep 5

echo "== Web service status =="
sudo systemctl status zwallet-web --no-pager -l || true

echo "== Web logs =="
sudo journalctl -u zwallet-web -n 60 --no-pager

echo "== Local web test =="
curl -I http://127.0.0.1:3000 || true

echo "== COMPLETE =="
