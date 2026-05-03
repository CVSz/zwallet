export interface ChainAdapter { chainId: string; getBalance(address: string): Promise<string> }
