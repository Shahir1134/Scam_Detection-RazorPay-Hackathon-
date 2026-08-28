import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck } from 'lucide-react';


export const Header: React.FC<{ title: string }> = ({ title }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-border/80 flex items-center justify-between px-6 sticky top-0 z-20 shadow-md">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h2>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          ML Engine Active (XGBoost 97% Thresh)
        </span>
      </div>
      
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-xs font-mono text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-800/50 shadow-inner flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          {time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </div>
        
        <div className="relative cursor-pointer p-2 rounded-lg hover:bg-elevated transition-colors">
          <Bell className="w-5 h-5 text-text-secondary hover:text-white transition-colors" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-surface animate-pulse"></span>
        </div>
        
        <div className="flex items-center gap-3 pl-4 border-l border-border/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-sm">
            SA
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <p className="text-white font-semibold text-xs leading-none">Shahir Ali</p>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-indigo-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Lead Investigator</p>
          </div>
        </div>
      </div>
    </header>
  );
};
