import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: 'blue' | 'red' | 'orange' | 'yellow' | 'green' | 'indigo';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'blue' }) => {
  const colorStyles = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  return (
    <div className="bg-surface rounded-xl p-5 border border-border shadow-sm hover:border-border-subtle transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-text-secondary font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg border ${colorStyles[color]}`}>
          {icon}
        </div>
      </div>
      
      {trend !== undefined && (
        <div className="mt-4 flex items-center text-xs">
          {trend > 0 ? (
            <span className="flex items-center text-red-400 font-medium bg-red-400/10 px-1.5 py-0.5 rounded mr-2">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{trend}%
            </span>
          ) : trend < 0 ? (
            <span className="flex items-center text-green-400 font-medium bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
              <TrendingDown className="w-3 h-3 mr-1" />
              {trend}%
            </span>
          ) : (
            <span className="flex items-center text-slate-400 font-medium bg-slate-400/10 px-1.5 py-0.5 rounded mr-2">
              <Minus className="w-3 h-3 mr-1" />
              0%
            </span>
          )}
          <span className="text-text-muted">vs last 24h</span>
        </div>
      )}
    </div>
  );
};
