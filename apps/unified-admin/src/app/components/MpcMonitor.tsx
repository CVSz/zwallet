import React from 'react';
import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Ceremony {
  id: string;
  status: 'active' | 'completed' | 'failed';
  participants: number;
  time: string;
}

const ceremonies: Ceremony[] = [
  { id: 'SIGN-0921', status: 'active', participants: 3, time: '2m ago' },
  { id: 'SIGN-0920', status: 'completed', participants: 3, time: '15m ago' },
  { id: 'KEYGEN-011', status: 'completed', participants: 5, time: '1h ago' },
  { id: 'SIGN-0919', status: 'failed', participants: 2, time: '2h ago' },
];

export const MpcMonitor: React.FC = () => {
  return (
    <div className="industrial-panel h-full">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
        <Activity className="text-amber-500 w-5 h-5" />
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">MPC Signing Ceremonies</h2>
      </div>

      <div className="space-y-4">
        {ceremonies.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700">
            <div>
              <div className="text-sm font-mono text-white mb-1">{c.id}</div>
              <div className="text-[10px] text-gray-500 uppercase">{c.time} • {c.participants} Nodes Active</div>
            </div>
            <div>
              <span className={`status-tag ${
                c.status === 'active' ? 'bg-amber-900/50 text-amber-500 border-amber-500/50 animate-pulse' :
                c.status === 'completed' ? 'bg-green-900/50 text-green-500 border-green-500/50' :
                'bg-red-900/50 text-red-500 border-red-500/50'
              }`}>
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-amber-950/20 border border-amber-900/50 flex gap-4">
        <ShieldCheck className="text-amber-500 w-10 h-10 shrink-0" />
        <div>
          <div className="text-sm font-bold text-amber-500 uppercase">System Integrity</div>
          <p className="text-xs text-gray-400 mt-1">
            Threshold signature mechanism operating at 2/3 quorom. All remote attestation nodes verified.
          </p>
        </div>
      </div>
    </div>
  );
};
