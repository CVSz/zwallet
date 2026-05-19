"use client";

import React from "react";

interface NavbarProps {
  address: string;
  isConnected: boolean;
  onConnect: () => void;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ address, isConnected, onConnect, loading }) => {
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-black tracking-tighter text-white">
          ZEA<span className="text-indigo-500">PROTOCOL</span>
        </h1>
        <div className="hidden md:flex items-center gap-4 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            ZEA: $1.00
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></span>
            ZEAZ: $0.42
          </span>
        </div>
      </div>

      <button
        onClick={onConnect}
        disabled={loading}
        className={`px-6 py-2 rounded-full font-bold transition-all ${
          isConnected
            ? "bg-slate-800 text-indigo-400 border border-indigo-500/30"
            : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
        }`}
      >
        {loading ? (
          <span className="animate-pulse">CONNECTING...</span>
        ) : isConnected ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {shortAddress}
          </div>
        ) : (
          "CONNECT WALLET"
        )}
      </button>
    </nav>
  );
};
