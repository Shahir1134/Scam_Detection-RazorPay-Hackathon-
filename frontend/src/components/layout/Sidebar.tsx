import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Users, Network, Briefcase, ShieldAlert, Sparkles } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, color: 'text-blue-400' },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight, color: 'text-cyan-400' },
    { name: 'Accounts', path: '/accounts', icon: Users, color: 'text-indigo-400' },
    { name: 'Fraud Networks', path: '/networks', icon: Network, color: 'text-purple-400' },
    { name: 'Cases', path: '/cases', icon: Briefcase, color: 'text-rose-400' },
  ];

  return (
    <div className="w-64 bg-surface/95 backdrop-blur-xl border-r border-border/80 h-screen flex flex-col shadow-xl z-20">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
            <ShieldAlert className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
              ScamDetect <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">AI</span>
            </h1>
            <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Risk & Mule Engine</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-5">
        <div className="px-3 pb-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
          Navigation
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-transparent text-white border-l-4 border-blue-500 shadow-md shadow-blue-500/5'
                  : 'text-text-secondary hover:bg-elevated/70 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400 drop-shadow' : item.color}`} />
                <span>{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400"></span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-gradient-to-br from-indigo-950/40 via-surface to-elevated p-3.5 rounded-xl text-xs text-text-secondary border border-indigo-800/30 shadow-inner">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <p className="font-semibold text-white">Razorpay Hackathon 2026</p>
          </div>
          <p className="text-[11px] text-text-muted">PaySim ML + Graph Analysis</p>
        </div>
      </div>
    </div>
  );
};
