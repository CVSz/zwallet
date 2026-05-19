"use client";

import React, { useState } from "react";
import { WalletEngine } from "../../../world/src/services/wallet-engine";

interface SwapProps {
  engine: WalletEngine;
  balances: { zea: string; zeaz: string };
  onSuccess: () => void;
}

export const SwapWidget: React.FC<SwapProps> = ({ engine, balances, onSuccess }) => {
  const [fromToken, setFromToken] = useState<"ZEA" | "ZEAZ">("ZEA");
  const [amount, setAmount] = useState("");
  const [swapping, setSwapping] = useState(false);

  const handleSwap = async () => {
    setSwapping(true);
    try {
      await engine.executeSwap(fromToken, amount);
      onSuccess();
      setAmount("");
    } catch (err) {
      console.error(err);
    } finally {
      setSwapping(false);
    }
  };

  const toToken = fromToken === "ZEA" ? "ZEAZ" : "ZEA";
  const currentBalance = fromToken === "ZEA" ? balances.zea : balances.zeaz;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
          <span>FROM</span>
          <span>BALANCE: {currentBalance} {fromToken}</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full"
          />
          <button 
            onClick={() => setAmount(currentBalance)}
            className="text-indigo-400 text-xs font-black hover:text-indigo-300 px-2 py-1 rounded bg-indigo-500/10"
          >
            MAX
          </button>
          <div className="bg-slate-800 px-3 py-1 rounded-lg font-bold text-white min-w-[80px] text-center">
            {fromToken}
          </div>
        </div>
      </div>

      <div className="flex justify-center -my-6 z-10">
        <button
          onClick={() => setFromToken(toToken)}
          className="bg-slate-800 border-4 border-slate-950 p-2 rounded-xl text-indigo-400 hover:text-indigo-300 hover:rotate-180 transition-all duration-300"
        >
          ↓
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
          <span>TO (ESTIMATED)</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={amount}
            readOnly
            placeholder="0.00"
            className="bg-transparent text-2xl font-bold text-slate-400 focus:outline-none w-full"
          />
          <div className="bg-slate-800 px-3 py-1 rounded-lg font-bold text-white min-w-[80px] text-center">
            {toToken}
          </div>
        </div>
      </div>

      <div className="px-2 flex justify-between text-xs text-slate-500 font-bold">
        <span>Slippage Tolerance</span>
        <span className="text-indigo-400">0.3%</span>
      </div>

      <button
        onClick={handleSwap}
        disabled={swapping || !amount}
        className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
      >
        {swapping ? "PROCESSING..." : "SWAP ASSETS"}
      </button>
    </div>
  );
};
