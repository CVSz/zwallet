import type {
  WalletTransferRecord,
} from "../walletEngine.js";

import type {
  SigningKeyRef,
} from "../signers/types.js";

export function assertSigningAllowed(
  transfer: WalletTransferRecord,
  key: SigningKeyRef
) {

  if (
    key.status !== "active"
  ) {
    throw new Error(
      "signing key disabled"
    );
  }

  if (
    transfer.chain !== key.chain
  ) {
    throw new Error(
      "signing key chain mismatch"
    );
  }

  if (
    transfer.from.toLowerCase() !==
    key.address.toLowerCase()
  ) {
    throw new Error(
      "signing key address mismatch"
    );
  }

  if (
    BigInt(
      transfer.amountAtomic
    ) <= 0n
  ) {
    throw new Error(
      "invalid transfer amount"
    );
  }
}
