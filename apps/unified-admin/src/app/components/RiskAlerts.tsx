import React from 'react';
import { ShieldAlert, Zap, Lock } from 'lucide-react';

interface Alert {
  id: number;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  msg: string;
  time: string;
}

const alerts: Alert[] = [
  { id: 1, type: 'CRITICAL', msg: 'Multiple failed signing attempts from Node-04', time: '1m ago' },
  { id: 2, type: 'WARNING', msg: 'Anomalous swap behavior detected: 0x21...4a', time: '12m ago' },
  { id: 3, type: 'INFO', msg: 'New admin role assigned to 0x70...c8', time: '4h ago' },
];

export const RiskAlerts: React.FC = () => {
  return (
    <div className="industrial-panel">
      <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-red-500 w-5 h-5" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">Security Alerts</h2>
        </div>
        <span className="text-[10px] font-mono bg-red-900/20 text-red-500 px-2 border border-red-900/50">3 ACTIVE</span>
      </div>

      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className={`p-3 border-l-2 ${
            a.type === 'CRITICAL' ? 'bg-red-950/20 border-l-red-500' :
            a.type === 'WARNING' ? 'bg-amber-950/20 border-l-amber-500' :
            'bg-blue-950/20 border-l-blue-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] font-bold ${
                a.type === 'CRITICAL' ? 'text-red-500' :
                a.type === 'WARNING' ? 'text-amber-500' :
                'text-blue-500'
              }`}>{a.type}</span>
              <span className="text-[9px] text-gray-500 uppercase">{a.time}</span>
            </div>
            <p className="text-xs text-gray-300 font-mono">{a.msg}</p>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 btn-industrial text-sm flex items-center justify-center gap-2">
        <Lock className="w-4 h-4" />
        Initialize Containment
      </button>
    </div>
  );
};
