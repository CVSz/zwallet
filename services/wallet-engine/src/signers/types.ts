export interface SignTransferInput {
  chain: string;
  from: string;
  to: string;
  amountAtomic: string;
}

export interface SignedTransfer {
  rawTransaction: string;
}

export interface TransferSigner {
  signTransfer(input: SignTransferInput): Promise<SignedTransfer>;
}
