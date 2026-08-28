import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Users, Network, Briefcase, Activity, Sparkles, ArrowUpRight } from 'lucide-react';

import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { RiskBadge } from '../components/ui/RiskBadge';
import { formatCurrency, timeAgo } from '../utils/formatters';
import { Link } from 'react-router-dom';
import { DashboardStats } from '../types';
import { getDashboardStats } from '../api/dashboard';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    try {
      const res = await getDashboardStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Dashboard stats fetch failed:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-surface/80 rounded-2xl border border-border"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 h-80 bg-surface/80 rounded-2xl border border-border"></div>
          <div className="col-span-2 h-80 bg-surface/80 rounded-2xl border border-border"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = [
    { name: 'CRITICAL', value: stats.risk_distribution.CRITICAL, color: '#f43f5e' },
    { name: 'HIGH', value: stats.risk_distribution.HIGH, color: '#f97316' },
    { name: 'MEDIUM', value: stats.risk_distribution.MEDIUM, color: '#f59e0b' },
    { name: 'LOW', value: stats.risk_distribution.LOW, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-surface border border-indigo-800/40 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Real-Time AI Scam & Mule Detection Center
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Investigator Command Hub
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Active Session: <span className="text-white font-semibold">Shahir Ali</span> • PaySim XGBoost Engine & Graph Mule Heuristics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => loadStats(true)}
              className="p-2 rounded-xl bg-elevated hover:bg-elevated/80 border border-border text-text-secondary transition-all"
              title="Refresh Dashboard"
            >
              <Activity className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link 
              to="/transactions" 
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" /> Analyze Transaction
            </Link>
            <Link 
              to="/accounts" 
              className="px-4 py-2 rounded-xl bg-elevated hover:bg-elevated/80 border border-border text-white text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" /> View Accounts
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-5">
        <StatCard title="Total Analyzed (24h)" value={stats.total_analyzed.toLocaleString()} icon={<Activity className="w-5 h-5" />} trend={stats.total_analyzed > 0 ? 12 : undefined} color="blue" />
        <StatCard title="High Risk Alerts" value={stats.high_risk_count.toLocaleString()} icon={<AlertTriangle className="w-5 h-5" />} trend={stats.high_risk_count > 0 ? -5 : undefined} color="orange" />
        <StatCard title="Critical Alerts" value={stats.critical_alerts.toLocaleString()} icon={<ShieldAlert className="w-5 h-5" />} trend={stats.critical_alerts > 0 ? 8 : undefined} color="red" />
        <StatCard title="Open Cases" value={stats.open_cases.toLocaleString()} icon={<Briefcase className="w-5 h-5" />} trend={stats.open_cases > 0 ? 2 : undefined} color="yellow" />
        <StatCard title="Potential Mule Accounts" value={stats.potential_mule_accounts.toLocaleString()} icon={<Users className="w-5 h-5" />} trend={stats.potential_mule_accounts > 0 ? 15 : undefined} color="indigo" />
        <StatCard title="Suspicious Networks" value={stats.suspicious_networks.toLocaleString()} icon={<Network className="w-5 h-5" />} trend={stats.suspicious_networks > 0 ? 4 : undefined} color="green" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Pie */}
        <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Risk Level Distribution</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-elevated text-text-muted">PaySim ML</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={88}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#080d1a" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-border/50">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between p-1.5 rounded-lg bg-base/60">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span className="text-text-secondary text-[11px] font-semibold">{d.name}</span>
                </div>
                <span className="font-mono font-bold text-white text-[11px]">{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Over Time */}
        <div className="col-span-1 lg:col-span-2 bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Alert Velocity & Trends</h3>
              <p className="text-xs text-text-secondary">7-Day transaction risk volume tracking</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Total
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.alerts_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                />
                <Line type="monotone" dataKey="count" name="Total Alerts" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="critical" name="Critical Alerts" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent High-Risk Alerts */}
        <div className="xl:col-span-2 bg-surface/90 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 border-b border-border flex justify-between items-center bg-base/40">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Recent Critical & High-Risk Detections</h3>
            </div>
            <Link to="/transactions" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-muted bg-base/80 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 font-semibold uppercase">Txn ID</th>
                  <th className="px-5 py-3.5 font-semibold uppercase">Amount</th>
                  <th className="px-5 py-3.5 font-semibold uppercase">Flow (Sender → Receiver)</th>
                  <th className="px-5 py-3.5 font-semibold uppercase">Risk Level</th>
                  <th className="px-5 py-3.5 font-semibold uppercase">Time</th>
                  <th className="px-5 py-3.5 font-semibold uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(!stats.recent_alerts || stats.recent_alerts.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-secondary text-xs">
                      <p className="font-medium text-text-muted">No high-risk detections recorded yet.</p>
                      <p className="mt-1 text-text-muted">Analyze transactions from the Transactions page to generate live alerts.</p>
                    </td>
                  </tr>
                ) : (
                  stats.recent_alerts.map(tx => (
                    <tr key={tx.transaction_id} className="hover:bg-elevated/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-white">{tx.transaction_id}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-white">{formatCurrency(tx.amount)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/40">{tx.sender_account_id}</span>
                          <span className="text-text-muted">→</span>
                          <span className="text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">{tx.receiver_account_id}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <RiskBadge level={tx.risk_level || 'HIGH'} />
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary text-xs">{timeAgo(tx.timestamp)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link 
                          to={`/transactions/${tx.transaction_id}`} 
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          Analyze
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority Cases */}
        <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-md flex flex-col">
          <div className="p-5 border-b border-border bg-base/40 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Priority Cases</h3>
            </div>
            <Link to="/cases" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              Manage
            </Link>
          </div>
          <div className="divide-y divide-border/60 flex-1">
            {(!stats.priority_cases || stats.priority_cases.length === 0) ? (
              <div className="p-8 text-center text-text-muted text-xs flex flex-col items-center justify-center h-full">
                <Briefcase className="w-8 h-8 text-text-muted/40 mb-2" />
                <p className="font-medium text-text-secondary">No active priority cases</p>
                <p className="text-[11px] text-text-muted mt-1">Open cases from transactions to monitor investigations here.</p>
              </div>
            ) : (
              stats.priority_cases.map(case_ => (
                <div key={case_.case_id} className="p-5 hover:bg-elevated/40 transition-colors">
                  <div className="flex justify-between items-start mb-2.5">
                    <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-elevated border border-border">
                      {case_.case_id}
                    </span>
                    <RiskBadge level={case_.priority} />
                  </div>
                  <div className="text-xs mb-3 text-text-secondary">
                    <span className="text-text-muted">Target Account: </span>
                    <span className="font-mono font-bold text-rose-300">{case_.primary_account_id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-[10px] text-white font-bold">
                        SA
                      </div>
                      <span className="text-xs text-text-secondary font-medium">
                        {case_.assigned_investigator || 'Shahir Ali'}
                      </span>
                    </div>
                    <Link to="/cases" className="text-xs font-semibold text-indigo-400 hover:underline">
                      Open Case
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
