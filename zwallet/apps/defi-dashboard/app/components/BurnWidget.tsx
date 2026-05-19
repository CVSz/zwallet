"use client";

import React, { useState } from "react";
import { WalletEngine } from "../../../world/src/services/wallet-engine";

interface BurnProps {
  engine: WalletEngine;
  zeaBalance: string;
  onSuccess: () => void;
}

export const BurnWidget: React.FC<BurnProps> = ({ engine, zeaBalance, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [burning, setBurning] = useState(false);

  const handleBurn = async () => {
    setBurning(true);
    try {
      await engine.executeBurn(amount);
      onSuccess();
      setAmount("");
    } catch (err) {
      console.error(err);
    } finally {
      setBurning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl">
        <h3 className="text-red-400 font-black text-sm mb-2">⚠ CRITICAL ACTION: SUPPLY REDUCTION</h3>
        <p className="text-red-300/60 text-xs leading-relaxed">
          Burning $ZEA stablecoins permanently destroys the assets and reduces the systemic supply. 
          This action cannot be reversed. Collateral redemptions must be verified through the 
          institutional portal before execution.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl font-mono">
        <div className="flex justify-between text-[10px] font-black text-slate-500 mb-4">
          <span>TERMINAL_INPUT://ZEA_DESTRUCTION_AMOUNT</span>
          <span>MAX: {zeaBalance}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-red-500 font-bold">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="bg-transparent text-3xl font-bold text-white focus:outline-none w-full placeholder:text-slate-800"
          />
          <span className="text-slate-500 font-black">ZEA</span>
        </div>
      </div>

      <button
        onClick={handleBurn}
        disabled={burning || !amount}
        className="w-full bg-red-600/10 border border-red-600/50 hover:bg-red-600 hover:text-white text-red-500 py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 disabled:opacity-30"
      >
        {burning ? "EXECUTING DESTRUCTION..." : "CONFIRM STABILITY BURN"}
      </button>
    </div>
  );
};
