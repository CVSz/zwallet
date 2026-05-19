export const store = {
  users: new Map<string, { id: string; email: string; password: string }>(),
  devices: new Map<string, Set<string>>(),
  replayTokens: new Set<string>(),
  wallets: [] as Array<Record<string, string>>,
  audit: [] as Array<Record<string, unknown>>,
  txIndex: [] as Array<Record<string, unknown>>,
  swaps: [] as Array<Record<string, unknown>>,
  balances: new Map<string, number>(),
  lifecycleTx: new Map<string, Record<string, unknown>>()
};
