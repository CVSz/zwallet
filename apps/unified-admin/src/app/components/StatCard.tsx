import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, trend, trendType, icon }) => {
  return (
    <div className="industrial-panel border-l-4 border-l-amber-600">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-amber-500 uppercase tracking-widest">{label}</span>
        <div className="text-amber-500/50">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      {trend && (
        <div className={`text-xs font-mono ${
          trendType === 'up' ? 'text-green-400' : 
          trendType === 'down' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {trendType === 'up' ? '▲' : trendType === 'down' ? '▼' : '■'} {trend}
        </div>
      )}
    </div>
  );
};
