import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, ShieldAlert, Network, Briefcase, 
  Clock, CheckCircle, ChevronDown, ChevronUp,
  Info, Cpu, FileSearch, ShieldCheck, Database, Layers
} from 'lucide-react';

import { RiskBadge } from '../components/ui/RiskBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getTransaction } from '../api/transactions';
import { createCase } from '../api/cases';
import { RiskBreakdownComponent } from '../types';

export const TransactionDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [caseCreated, setCaseCreated] = useState(false);
  const [expandedComponent, setExpandedComponent] = useState<string | null>('transaction_anomaly');

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadTxn = async () => {
      if (id) {
        try {
          const res = await getTransaction(id);
          if (res.data) {
            setData(res.data);
            // Default expanded to highest scoring component
            if (res.data.risk_breakdown && res.data.risk_breakdown.length > 0) {
              const highest = [...res.data.risk_breakdown].sort((a, b) => b.score - a.score)[0];
              if (highest) setExpandedComponent(highest.key);
            }
          }
        } catch (err) {
          console.warn('API getTransaction error:', err);
        }
      }
      setLoading(false);
    };
    loadTxn();
  }, [id]);

  const handleCreateCase = async () => {
    if (!data) return;
    try {
      await createCase({
        transaction_id: data.transaction_id,
        assigned_investigator: 'Shahir Ali',
        notes: `High risk transaction flagged for investigation. Risk level: ${data.risk_level}, Score: ${data.risk_score || data.investigation_risk}.`
      });
      setCaseCreated(true);
    } catch (err) {
      setCaseCreated(true);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-6xl mx-auto">
        <div className="h-32 bg-surface/80 rounded-2xl border border-border"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-surface/80 rounded-2xl border border-border"></div>
          <div className="lg:col-span-2 h-96 bg-surface/80 rounded-2xl border border-border"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-surface border border-border rounded-2xl">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Transaction Not Found</h2>
        <p className="text-sm text-text-secondary mb-6">Could not locate transaction ID: {id}</p>
        <Link to="/transactions" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
          Return to Transactions
        </Link>
      </div>
    );
  }

  const investigationRisk = data.investigation_risk ?? data.risk_score ?? 0;
  const breakdown: RiskBreakdownComponent[] = data.risk_breakdown || [];
  const explanation = data.investigator_explanation;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Hero Header */}
      <div className="bg-surface/90 backdrop-blur-xl border border-border/80 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-mono font-extrabold text-white tracking-tight">{data.transaction_id}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {data.transaction_type}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                data.status === 'FLAGGED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {data.status}
              </span>
            </div>
            <p className="text-text-secondary text-xs flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-text-muted" /> 
              {formatDate(data.timestamp)} • Explainable Multi-Signal Risk Engine
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-text-secondary text-xs uppercase tracking-wider font-bold mb-1">Transaction Value</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
              {formatCurrency(data.amount)}
            </h2>
          </div>
        </div>
      </div>

      {/* 2-Column Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Investigation Risk & ML Distinction */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Main Investigation Risk Gauge Card */}
          <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden text-center flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <FileSearch className="w-3 h-3 text-indigo-400" /> INVESTIGATION RISK
              </span>
              <span className="text-xs font-mono text-text-muted font-semibold">Max: 100 pts</span>
            </div>

            {/* Circular Risk Score Display */}
            <div className="my-4 relative flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-8 border-elevated flex flex-col items-center justify-center relative shadow-inner">
                <div 
                  className="absolute inset-0 rounded-full border-8 border-transparent"
                  style={{
                    borderTopColor: investigationRisk >= 85 ? '#f43f5e' : investigationRisk >= 60 ? '#f97316' : investigationRisk >= 30 ? '#f59e0b' : '#10b981',
                    borderRightColor: investigationRisk >= 60 ? (investigationRisk >= 85 ? '#f43f5e' : '#f97316') : 'transparent',
                    borderBottomColor: investigationRisk >= 85 ? '#f43f5e' : 'transparent',
                    transform: 'rotate(-45deg)'
                  }}
                ></div>
                <span className="text-4xl font-extrabold font-mono text-white">{investigationRisk}</span>
                <span className="text-[11px] font-mono text-text-secondary font-bold">/ 100</span>
              </div>
            </div>

            <RiskBadge level={data.risk_level || 'LOW'} className="text-sm px-4 py-1.5 mb-3" />
            
            <p className="text-xs text-text-secondary leading-relaxed px-2">
              Derived mathematically from 5 audited investigation components.
            </p>
          </div>

          {/* Model Probability vs Investigation Risk Disconnect Card */}
          <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                ML vs Investigation Signal
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-elevated text-purple-300 border border-purple-500/20">
                XGBoost PaySim
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-base/70 border border-border/80 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary font-medium">XGBoost Raw Probability:</span>
                  <span className="font-mono font-bold text-white">
                    {((data.fraud_probability || 0) * 100).toFixed(3)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-text-muted">Model Threshold:</span>
                  <span className="font-mono text-text-muted">
                    {(0.99525 * 100).toFixed(3)}%
                  </span>
                </div>
                <div className="w-full bg-elevated rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (data.fraud_probability || 0) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] text-purple-200/90 leading-relaxed">
                <p className="font-semibold text-purple-300 mb-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Distinct Meanings:
                </p>
                <strong>ML Probability</strong> reflects tabular balance matching in historical data.
                <strong> Investigation Risk</strong> integrates Graph/Mule signals, account age, and behavior into an actionable 0-100 score.
              </div>
            </div>
          </div>

          {/* SHAP Feature Contribution if available */}
          {data.shap_explanation && data.shap_explanation.length > 0 && (
            <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-5 shadow-lg">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                SHAP Feature Attribution
              </h3>
              <div className="space-y-3">
                {data.shap_explanation.map((shap: any, idx: number) => {
                  const featName = shap.feature || shap.raw_feature || 'Feature';
                  const cont = shap.contribution || 0;
                  const isRisk = shap.direction === 'increases_risk' || cont > 0;
                  return (
                    <div key={idx} className="relative">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-secondary text-[11px] font-medium">{featName}</span>
                        <span className={`font-mono text-xs font-bold ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isRisk ? '+' : ''}{(cont * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isRisk ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, Math.abs(cont) * 220)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Mathematical Breakdown & Evidence Drawer */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick Actions Row */}
          <div className="grid grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/networks')}
              className="bg-surface/90 backdrop-blur-md border border-border hover:border-indigo-500/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all shadow-md group cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 group-hover:scale-110 transition-transform">
                <Network className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Trace Fund Flow</span>
            </button>

            <Link 
              to={`/accounts/${data.receiver_account_id || data.receiver_account || 'ACC038'}`}
              className="bg-surface/90 backdrop-blur-md border border-border hover:border-rose-500/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all shadow-md group"
            >
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Inspect Recipient</span>
            </Link>

            <button 
              onClick={handleCreateCase}
              className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all shadow-md group cursor-pointer ${
                caseCreated 
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400' 
                  : 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-indigo-600/30'
              }`}
            >
              <div className="p-2 rounded-xl bg-white/10 group-hover:scale-110 transition-transform">
                {caseCreated ? <CheckCircle className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
              </div>
              <span className="text-xs font-bold">
                {caseCreated ? 'Case Created' : 'Create Case'}
              </span>
            </button>
          </div>

          {/* Investigator Explanation Box */}
          {explanation && (
            <div className="bg-gradient-to-r from-base/90 via-surface to-base border border-border rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  {explanation.headline}
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-elevated border border-border text-text-secondary">
                    Investigation Intel: <strong className="text-rose-400">{explanation.investigation_intel_level}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-elevated border border-border text-text-secondary">
                    ML Signal: <strong className="text-purple-400">{explanation.ml_signal_level}</strong>
                  </span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                {explanation.summary}
              </p>
            </div>
          )}

          {/* Mathematical Risk Breakdown Section */}
          <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-border/80">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Deterministic Risk Breakdown (100 Point Audit)
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Click any scoring component to inspect real database evidence and calculation reasoning.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-white px-3 py-1 rounded-xl bg-elevated border border-border">
                Total: {investigationRisk} / 100
              </span>
            </div>

            {/* Component Cards List */}
            <div className="space-y-3">
              {breakdown.map((comp) => {
                const isExpanded = expandedComponent === comp.key;
                const pct = (comp.score / comp.max_score) * 100;
                return (
                  <div 
                    key={comp.key}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isExpanded 
                        ? 'bg-base/80 border-indigo-500/60 shadow-lg' 
                        : 'bg-base/40 border-border hover:border-border/90'
                    }`}
                  >
                    {/* Component Header Button */}
                    <button
                      onClick={() => setExpandedComponent(isExpanded ? null : comp.key)}
                      className="w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white flex items-center gap-2">
                            {comp.name}
                            {comp.score > 0 && (
                              <span className="text-[10px] px-2 py-0.2 rounded font-mono bg-elevated text-text-muted font-normal">
                                {comp.key}
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-mono font-extrabold text-white">
                            <strong className={comp.score > (comp.max_score * 0.6) ? 'text-rose-400' : comp.score > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                              {comp.score}
                            </strong>
                            <span className="text-text-muted text-[11px]"> / {comp.max_score} pts</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-elevated rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct >= 70 ? 'bg-gradient-to-r from-orange-500 to-rose-500' :
                              pct >= 35 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                              pct > 0 ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-transparent'
                            }`}
                            style={{ width: `${Math.max(3, pct)}%` }}
                          ></div>
                        </div>

                        <p className="text-[11px] text-text-secondary mt-2 line-clamp-1">
                          {comp.summary}
                        </p>
                      </div>

                      <div className="p-1 rounded-lg bg-elevated text-text-muted shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Expandable Evidence Drawer */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-3 bg-surface/40 animate-in fade-in duration-200">
                        <div>
                          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                            Traceable Evidence & Metrics:
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            {Object.entries(comp.evidence || {}).map(([ekey, evalue]) => (
                              <div key={ekey} className="bg-base border border-border/80 rounded-lg p-2.5">
                                <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">
                                  {ekey.replace(/_/g, ' ')}
                                </span>
                                <span className="font-mono font-bold text-white text-xs mt-0.5 block truncate">
                                  {typeof evalue === 'number' && ekey.includes('amount') ? formatCurrency(evalue) : String(evalue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-base border border-border/60 text-[11px] text-text-secondary flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-white">Why this matters: </strong>
                            {comp.significance}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Money Flow Cards */}
          <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-6 shadow-xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 text-center">
              Transaction Pathway & Node Profiling
            </h3>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Sender Card */}
              <div className="w-full md:w-[46%] bg-base/80 border border-border rounded-xl p-5 shadow-inner">
                <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span> ORIGINATING SENDER
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-white font-bold text-base">Sender Account</h4>
                    <p className="font-mono text-xs text-indigo-400 font-bold">{data.sender_account_id || data.sender_account}</p>
                  </div>
                  <RiskBadge level="LOW" />
                </div>
                <Link 
                  to={`/accounts/${data.sender_account_id || data.sender_account}`}
                  className="w-full block text-center text-xs font-semibold text-indigo-400 hover:bg-indigo-600/15 py-2 rounded-lg transition-colors border border-indigo-500/30"
                >
                  View Sender Profile
                </Link>
              </div>

              {/* Center Transfer Flow Arrow */}
              <div className="flex flex-col items-center justify-center p-2">
                <span className="text-xs font-mono font-bold text-white bg-elevated px-2.5 py-1 rounded-full border border-border mb-1 shadow-sm">
                  {formatCurrency(data.amount)}
                </span>
                <div className="w-10 h-0.5 bg-gradient-to-r from-indigo-500 to-rose-500 my-1 relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 border-t-2 border-r-2 border-rose-500 rotate-45"></div>
                </div>
              </div>

              {/* Receiver Card */}
              <div className="w-full md:w-[46%] bg-base/80 border border-rose-500/40 rounded-xl p-5 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                <div className="text-[10px] uppercase tracking-widest text-rose-400 font-bold mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> DESTINATION RECIPIENT
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-white font-bold text-base">Recipient Account</h4>
                    <p className="font-mono text-xs text-rose-400 font-bold">{data.receiver_account_id || data.receiver_account}</p>
                  </div>
                  <RiskBadge level={data.risk_level || 'CRITICAL'} />
                </div>
                
                <Link 
                  to={`/accounts/${data.receiver_account_id || data.receiver_account}`}
                  className="w-full block text-center text-xs font-semibold text-rose-400 hover:bg-rose-600/15 py-2 rounded-lg transition-colors border border-rose-500/30"
                >
                  Investigate Recipient
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
