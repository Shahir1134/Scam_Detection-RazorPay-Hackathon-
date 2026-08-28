import React from 'react';
import { RiskLevel } from '../../types';
import { getRiskBg } from '../../utils/formatters';

interface RiskBadgeProps {
  level: RiskLevel | string | null;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  if (!level) return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">UNKNOWN</span>;
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRiskBg(level)} ${className}`}>
      {level}
    </span>
  );
};
