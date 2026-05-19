/**
 * zWallet Web3 Provider - EIP-1193 Compatible Virtual Provider
 * Allows internal and external (simulated) DApps to interact with zWallet.
 */
export class Web3Provider {
  constructor(walletService) {
    this.walletService = walletService;
    this.selectedAddress = null;
    this.chainId = '0x1'; // Ethereum Mainnet
  }

  async request({ method, params }) {
    console.log(`[Web3Provider] Request: ${method}`, params);
    
    switch (method) {
      case 'eth_requestAccounts':
        return this.connect();
      case 'eth_accounts':
        return this.selectedAddress ? [this.selectedAddress] : [];
      case 'eth_chainId':
        return this.chainId;
      case 'eth_sendTransaction':
        return this.sendTransaction(params[0]);
      default:
        throw { code: 4200, message: 'Method not supported' };
    }
  }

  async connect() {
    // Simulate wallet connection
    this.selectedAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    return [this.selectedAddress];
  }

  async sendTransaction(tx) {
    console.log('[Web3Provider] Initiating secure transaction flow...', tx);
    // In a real app, this would trigger the MPC signing ceremony
    const res = await fetch('/api/v1/wallet/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_address: this.selectedAddress,
        to_address: tx.to,
        amount_eth: parseFloat(tx.value) / 1e18 || 0,
        data: tx.data
      })
    });
    
    const data = await res.json();
    return data.request_id || `0x${Math.random().toString(16).slice(2)}`;
  }
}

// Global instance for DApp injection simulation
export const windowEthereum = new Web3Provider();
