import { useState, useEffect, useCallback } from "react";
import { WalletEngine, WalletState } from "../../world/src/services/wallet-engine";

const engine = new WalletEngine();

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: "",
    chainId: 0n,
    nativeBalance: "0",
    zeaBalance: "0",
    zeazBalance: "0",
    isConnected: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const newState = await engine.connect();
      setState(newState);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = useCallback(async () => {
    if (!state.isConnected) return;
    try {
      const newState = await engine.syncState();
      setState(newState);
    } catch (err) {
      console.error("Failed to sync wallet state", err);
    }
  }, [state.isConnected]);

  useEffect(() => {
    engine.onAccountChange((address) => {
      if (address) {
        refresh();
      } else {
        setState((prev) => ({ ...prev, isConnected: false, address: "" }));
      }
    });
  }, [refresh]);

  return { state, loading, error, connect, refresh, engine };
}
