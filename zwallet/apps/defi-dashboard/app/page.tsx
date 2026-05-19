"use client";

import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { SwapWidget } from "./components/SwapWidget";
import { BurnWidget } from "./components/BurnWidget";
import { useWallet } from "../hooks/useWallet";

export default function DeFiDashboard() {
  const { state, loading, connect, refresh, engine } = useWallet();
  const [activeTab, setActiveTab] = useState<"swap" | "burn">("swap");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Background Neon Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 blur-[120px] rounded-full animate-pulse delay-700"></div>
      </div>

      <Navbar 
        address={state.address} 
        isConnected={state.isConnected} 
        onConnect={connect} 
        loading={loading} 
      />

      <div className="relative pt-32 pb-20 px-4 max-w-lg mx-auto flex flex-col gap-8">
        {/* State Banner */}
        {!state.isConnected && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl text-center backdrop-blur-sm">
            <h2 className="text-white font-black text-xl mb-2">Protocol Access Locked</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Synchronize your secure enclave wallet to interact with ZEA Stablecoins and access systemic swap liquidity.
            </p>
            <button
              onClick={connect}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all"
            >
              INITIALIZE CONNECTION
            </button>
          </div>
        )}

        {state.isConnected && (
          <div className="bg-slate-950/50 border border-slate-800 p-2 rounded-3xl backdrop-blur-xl shadow-2xl">
            {/* Tab Selector */}
            <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-900 rounded-2xl">
              <button
                onClick={() => setActiveTab("swap")}
                className={`py-3 rounded-xl font-black text-xs transition-all ${
                  activeTab === "swap" 
                  ? "bg-slate-800 text-white shadow-lg" 
                  : "text-slate-500 hover:text-slate-300"
                }`}
              >
                SWAP ASSETS
              </button>
              <button
                onClick={() => setActiveTab("burn")}
                className={`py-3 rounded-xl font-black text-xs transition-all ${
                  activeTab === "burn" 
                  ? "bg-slate-800 text-red-400 shadow-lg" 
                  : "text-slate-500 hover:text-slate-300"
                }`}
              >
                STABILITY BURN
              </button>
            </div>

            {/* Main Widget */}
            <div className="p-4">
              {activeTab === "swap" ? (
                <SwapWidget 
                  engine={engine} 
                  balances={{ zea: state.zeaBalance, zeaz: state.zeazBalance }} 
                  onSuccess={refresh}
                />
              ) : (
                <BurnWidget 
                  engine={engine} 
                  zeaBalance={state.zeaBalance} 
                  onSuccess={refresh}
                />
              )}
            </div>
          </div>
        )}

        {/* Info Cards */}
        {state.isConnected && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 block mb-1">NETWORK_STATUS</span>
              <span className="text-emerald-500 font-bold text-sm">OPTIMIZED</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 block mb-1">GAS_PRICE</span>
              <span className="text-indigo-400 font-bold text-sm">12 GWEI</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
