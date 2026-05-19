import React from 'react';
import { 
  BarChart3, 
  Cpu, 
  Database, 
  Globe, 
  History, 
  Layers, 
  Menu, 
  Search, 
  Settings, 
  ShieldCheck, 
  Terminal, 
  Users,
  Wallet
} from 'lucide-react';
import { StatCard } from './components/StatCard';
import { MpcMonitor } from './components/MpcMonitor';
import { RiskAlerts } from './components/RiskAlerts';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-gray-800 bg-gray-950/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-600 flex items-center justify-center font-black text-black">Z</div>
            <span className="font-bold tracking-tighter text-white uppercase italic">Command Center</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-xs uppercase font-bold text-amber-500 border-b border-amber-500 pb-1">Overview</a>
            <a href="#" className="text-xs uppercase font-bold text-gray-500 hover:text-white transition-colors">Infrastructure</a>
            <a href="#" className="text-xs uppercase font-bold text-gray-500 hover:text-white transition-colors">Security</a>
            <a href="#" className="text-xs uppercase font-bold text-gray-500 hover:text-white transition-colors">Identity</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="SEARCH PROTOCOL..." 
              className="bg-gray-900 border border-gray-800 pl-10 pr-4 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-600 text-white w-64"
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-white"><Settings className="w-5 h-5" /></button>
          <div className="h-8 w-8 bg-gray-800 border border-gray-700"></div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-3">
              System Overview
              <span className="text-xs font-mono font-normal bg-green-900/20 text-green-500 px-2 py-0.5 border border-green-900/50">OPERATIONAL</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">Real-time telemetry from ZEA Protocol mainnet nodes and services.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-industrial text-sm bg-gray-800 text-white border border-gray-700 hover:bg-gray-700">Download Logs</button>
            <button className="btn-industrial text-sm">System Update</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            label="Total TVL" 
            value="$1,248,302" 
            trend="+12.4%" 
            trendType="up" 
            icon={<Wallet className="w-5 h-5" />} 
          />
          <StatCard 
            label="Behavior Score" 
            value="98.2" 
            trend="Stable" 
            trendType="neutral" 
            icon={<ShieldCheck className="w-5 h-5" />} 
          />
          <StatCard 
            label="MPC Participants" 
            value="12/12" 
            trend="All Online" 
            trendType="up" 
            icon={<Users className="w-5 h-5" />} 
          />
          <StatCard 
            label="Network Latency" 
            value="42ms" 
            trend="-5ms" 
            trendType="up" 
            icon={<Cpu className="w-5 h-5" />} 
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <MpcMonitor />
            
            {/* Infrastructure Map Placeholder */}
            <div className="industrial-panel">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                <Globe className="text-amber-500 w-5 h-5" />
                <h2 className="text-lg font-bold uppercase tracking-wider text-white">Global Node Distribution</h2>
              </div>
              <div className="h-64 bg-gray-950/50 border border-gray-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--accent) 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }}></div>
                <div className="text-gray-600 font-mono text-xs uppercase text-center">
                  <Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  Visualizing Global Infrastructure...
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <RiskAlerts />
            
            <div className="industrial-panel bg-amber-600 text-black">
              <h3 className="font-black uppercase italic mb-2">Protocol Governance</h3>
              <p className="text-xs font-bold leading-tight mb-4">
                PENDING PROPOSAL: UPGRADE MPC-SERVICE-V2.1. REQUIRE QUORUM (9/12).
              </p>
              <button className="w-full py-2 bg-black text-white font-black uppercase text-xs hover:bg-gray-900 transition-colors">
                Open Voting Portal
              </button>
            </div>

            <div className="industrial-panel">
              <div className="flex items-center gap-2 mb-4">
                <History className="text-gray-500 w-4 h-4" />
                <span className="text-xs font-bold uppercase text-gray-400">Audit Trail</span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="text-[10px] font-mono text-gray-500 border-b border-gray-800 pb-2 flex justify-between">
                    <span>SYS_UPDT_092{i}</span>
                    <span className="text-gray-600">SUCCESS</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="h-10 border-t border-gray-800 bg-gray-950 flex items-center justify-between px-6 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
        <div>ZEA PLATFORM v2.4.0-STABLE</div>
        <div className="flex gap-6">
          <span>LATENCY: 42MS</span>
          <span className="text-green-500">ENCRYPTION: AES-256-GCM</span>
          <span>UPTIME: 99.998%</span>
        </div>
      </footer>
    </div>
  );
}
