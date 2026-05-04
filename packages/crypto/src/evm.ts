import { TypedDataEncoder, Wallet, keccak256 } from "ethers";
import { z } from "zod";

const SignInput = z.object({
  privateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  payload: z.string().min(1),
  chainId: z.number().int().positive(),
  nonce: z.number().int().nonnegative(),
});

export function signEvmMessageDeterministic(input: z.infer<typeof SignInput>): Promise<string> {
  const parsed = SignInput.parse(input);
  const wallet = new Wallet(parsed.privateKey);
  const digest = keccak256(Buffer.from(`${parsed.chainId}:${parsed.nonce}:${parsed.payload}`));
  return wallet.signMessage(Buffer.from(digest.slice(2), "hex"));
}

export function signEip712TypedData(
  privateKey: string,
  domain: Record<string, unknown>,
  types: Record<string, Array<{ name: string; type: string }>>,
  value: Record<string, unknown>,
): Promise<string> {
  const wallet = new Wallet(privateKey);
  TypedDataEncoder.hash(domain, types, value);
  return wallet.signTypedData(domain, types, value);
}
