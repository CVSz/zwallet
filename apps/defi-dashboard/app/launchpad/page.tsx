'use client';
import React from 'react';
// @ts-ignore
import { Rocket, ShieldCheck, TrendingUp, Info } from 'lucide-react';

export default function Launchpad() {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
            {/* @ts-ignore */}
            {/* @ts-ignore */}
            <Rocket className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mainnet Launchpad</h1>
            <p className="text-slate-400">ZEA Protocol Liquidity Bootstrapping Event</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="glass-panel p-8 border border-white/10 rounded-3xl bg-white/5">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-bold uppercase tracking-wider text-indigo-400">Live Status</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded-full border border-green-500/30">ACTIVE</span>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Raised Amount</span>
                  <span className="font-bold">742.5 ETH / 1,000 ETH</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[74%]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-500 block mb-1">Participants</span>
                  <span className="text-xl font-bold">1,248</span>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-500 block mb-1">Time Remaining</span>
                  <span className="text-xl font-bold">4d 12h</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 border border-white/10 rounded-3xl bg-white/5">
            <h2 className="text-lg font-bold mb-4">Contribute</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                <span className="text-xs text-slate-500 block mb-2">Amount (ETH)</span>
                <input 
                  type="number" 
                  placeholder="0.0" 
                  className="bg-transparent border-none text-2xl font-bold w-full focus:outline-none"
                />
              </div>
              <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20">
                Commit Contribution
              </button>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 justify-center">
                {/* @ts-ignore */}
                <ShieldCheck className="w-3 h-3" />
                SECURED BY MPC CEREMONY
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 glass-panel p-8 border border-white/10 rounded-3xl bg-white/5">
            <div className="flex items-center gap-2 mb-6">
              {/* @ts-ignore */}
              <TrendingUp className="text-indigo-400 w-5 h-5" />
              <h2 className="text-xl font-bold">Vesting & Rewards</h2>
            </div>
            <div className="h-48 flex items-end justify-between gap-2 px-4 mb-4">
              {[40, 60, 45, 80, 55, 90, 70, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-500/20 rounded-t-lg group relative cursor-pointer hover:bg-indigo-500/40 transition-colors">
                  <div style={{ height: `${h}%` }} className="bg-indigo-500 rounded-t-lg w-full absolute bottom-0" />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {h}% Unlock
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold px-2">
              <span>Month 1</span>
              <span>Month 6</span>
              <span>Month 12</span>
            </div>
          </div>

          <div className="glass-panel p-6 border border-white/10 rounded-3xl bg-white/5 overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">Live Activity</h3>
            <div className="space-y-4">
              {[
                { addr: '0x71C...4e2', amount: '12.5 ETH', time: '2m ago' },
                { addr: '0x92b...a1f', amount: '4.2 ETH', time: '5m ago' },
                { addr: '0x3e1...c99', amount: '0.8 ETH', time: '12m ago' },
                { addr: '0xbc1...ff2', amount: '25.0 ETH', time: '15m ago' },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">{tx.addr}</span>
                    <span className="text-xs font-bold text-white">{tx.amount}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{tx.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 text-center">
              <span className="text-[10px] text-indigo-400 font-bold animate-pulse">● WAITING FOR NEXT BLOCK</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 p-6 bg-indigo-950/20 border border-indigo-500/20 rounded-3xl">
          {/* @ts-ignore */}
          <Info className="text-indigo-400 w-6 h-6 shrink-0" />
          <p className="text-sm text-slate-400 leading-relaxed">
            Liquidity bootstrapping enables fair ZEA price discovery. All contributions are locked in the ZEASwap engine for 12 months, earning 0.3% trading fees in addition to protocol rewards.
          </p>
        </div>
      </div>
    </div>
  );
}
