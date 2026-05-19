import { ethers, BrowserProvider, JsonRpcSigner, Contract, formatUnits, parseUnits } from "ethers";

/**
 * Enterprise Wallet Engine
 * Specializing in high-precision Web3 interactions for the ZEA/ZEAZ ecosystem.
 */

// ABIs for internal contract interactions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

const SWAP_ABI = [
  "function swapZEAforZEAZ(uint256 amountZEA) external",
  "function swapZEAZforZEA(uint256 amountZEAZ) external",
  "function burnStablecoin(uint256 amountZEA) external"
];

export interface WalletState {
  address: string;
  chainId: bigint;
  nativeBalance: string;
  zeaBalance: string;
  zeazBalance: string;
  isConnected: boolean;
}

export class WalletEngine {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  
  // Platform Contract Addresses (Placeholders for deployment)
  private readonly ZEA_ADDR = "0xZEA_STABLECOIN_ADDRESS";
  private readonly ZEAZ_ADDR = "0xZEAZ_UTILITY_ADDRESS";
  private readonly SWAP_ADDR = "0xZEASWAP_ENGINE_ADDRESS";
  private readonly REQUIRED_CHAIN_ID = 31337n; // Hardhat Local

  /**
   * Connects to the injected EIP-1193 provider (MetaMask, etc.)
   */
  async connect(): Promise<WalletState> {
    if (!window.ethereum) {
      throw new Error("No Web3 provider detected. Please install a browser extension like MetaMask.");
    }

    try {
      this.provider = new BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const network = await this.provider.getNetwork();
      if (network.chainId !== this.REQUIRED_CHAIN_ID) {
        throw new Error(`Incorrect Network. Expected Chain ID: ${this.REQUIRED_CHAIN_ID}`);
      }

      const address = await this.signer.getAddress();
      return this.syncState();
    } catch (error: any) {
      this.handleWeb3Error(error);
      throw error;
    }
  }

  /**
   * Fetches high-precision balances across the ecosystem.
   */
  async syncState(): Promise<WalletState> {
    if (!this.signer || !this.provider) throw new Error("Wallet not connected");

    const address = await this.signer.getAddress();
    const network = await this.provider.getNetwork();
    
    const zea = new Contract(this.ZEA_ADDR, ERC20_ABI, this.provider);
    const zeaz = new Contract(this.ZEAZ_ADDR, ERC20_ABI, this.provider);

    const [native, zeaBal, zeazBal] = await Promise.all([
      this.provider.getBalance(address),
      zea.balanceOf(address),
      zeaz.balanceOf(address)
    ]);

    return {
      address,
      chainId: network.chainId,
      nativeBalance: formatUnits(native, 18),
      zeaBalance: formatUnits(zeaBal, 6), // ZEA uses 6 decimals
      zeazBalance: formatUnits(zeazBal, 18),
      isConnected: true
    };
  }

  /**
   * Safe Approval Pipeline: Only triggers 'approve' if current allowance is insufficient.
   */
  async ensureApproval(tokenAddr: string, amount: bigint): Promise<void> {
    if (!this.signer) throw new Error("Wallet not connected");

    const token = new Contract(tokenAddr, ERC20_ABI, this.signer);
    const address = await this.signer.getAddress();
    const currentAllowance = await token.allowance(address, this.SWAP_ADDR);

    if (currentAllowance < amount) {
      console.log(`[WalletEngine] Allowance insufficient. Triggering approval for ${tokenAddr}...`);
      const tx = await token.approve(this.SWAP_ADDR, ethers.MaxUint256);
      await tx.wait(1);
    }
  }

  /**
   * Executes atomic swaps between ZEA and ZEAZ.
   */
  async executeSwap(fromToken: "ZEA" | "ZEAZ", amount: string): Promise<ethers.TransactionReceipt> {
    if (!this.signer) throw new Error("Wallet not connected");
    
    const swap = new Contract(this.SWAP_ADDR, SWAP_ABI, this.signer);
    const isZEA = fromToken === "ZEA";
    const decimals = isZEA ? 6 : 18;
    const amountAtomic = parseUnits(amount, decimals);
    const tokenAddr = isZEA ? this.ZEA_ADDR : this.ZEAZ_ADDR;

    try {
      await this.ensureApproval(tokenAddr, amountAtomic);

      const tx = isZEA 
        ? await swap.swapZEAforZEAZ(amountAtomic)
        : await swap.swapZEAZforZEA(amountAtomic);

      return await tx.wait(1);
    } catch (error: any) {
      this.handleWeb3Error(error);
      throw error;
    }
  }

  /**
   * Triggers the permanent burning of ZEA stablecoins.
   */
  async executeBurn(amount: string): Promise<ethers.TransactionReceipt> {
    if (!this.signer) throw new Error("Wallet not connected");
    
    const swap = new Contract(this.SWAP_ADDR, SWAP_ABI, this.signer);
    const amountAtomic = parseUnits(amount, 6);

    try {
      const tx = await swap.burnStablecoin(amountAtomic);
      return await tx.wait(1);
    } catch (error: any) {
      this.handleWeb3Error(error);
      throw error;
    }
  }

  /**
   * Standardized EIP-1193 Error Handling
   */
  private handleWeb3Error(error: any): void {
    if (error.code === "ACTION_REJECTED") {
      console.warn("[WalletEngine] User denied the transaction.");
    } else if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("[WalletEngine] Account has insufficient native funds for gas.");
    } else {
      console.error("[WalletEngine] Unknown error occurred:", error.message);
    }
  }

  /**
   * Setup account and chain mutation listeners
   */
  onAccountChange(callback: (address: string | null) => void) {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        callback(accounts.length > 0 ? accounts[0] : null);
      });
    }
  }
}

// Global window declaration for EIP-1193
declare global {
  interface Window {
    ethereum?: any;
  }
}
