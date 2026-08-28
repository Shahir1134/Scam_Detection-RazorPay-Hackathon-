import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ArrowRight, Zap, 
  AlertTriangle, RefreshCw, Sparkles, ShieldCheck
} from 'lucide-react';
import { RiskBadge } from '../components/ui/RiskBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { analyzeTransaction, getTransactions } from '../api/transactions';


export const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('85000');
  const [type, setType] = useState('TRANSFER');
  const [sender, setSender] = useState('ACC037');
  const [receiver, setReceiver] = useState('ACC038');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Fallback mock transactions
  const fallbackTransactions = [
    { transaction_id: 'TXN-98234-A', timestamp: new Date().toISOString(), sender_account_id: 'ACC037', receiver_account_id: 'ACC038', amount: 85000, transaction_type: 'TRANSFER', risk_level: 'CRITICAL', fraud_probability: 0.941 },
    { transaction_id: 'TXN-98235-B', timestamp: new Date(Date.now() - 3600000).toISOString(), sender_account_id: 'ACC001', receiver_account_id: 'ACC002', amount: 12500, transaction_type: 'PAYMENT', risk_level: 'LOW', fraud_probability: 0.021 },
    { transaction_id: 'TXN-98236-C', timestamp: new Date(Date.now() - 7200000).toISOString(), sender_account_id: 'ACC030', receiver_account_id: 'ACC032', amount: 70000, transaction_type: 'TRANSFER', risk_level: 'HIGH', fraud_probability: 0.884 },
    { transaction_id: 'TXN-98237-D', timestamp: new Date(Date.now() - 86400000).toISOString(), sender_account_id: 'ACC027', receiver_account_id: 'ACC030', amount: 85000, transaction_type: 'TRANSFER', risk_level: 'CRITICAL', fraud_probability: 0.932 },
    { transaction_id: 'TXN-98238-E', timestamp: new Date(Date.now() - 172800000).toISOString(), sender_account_id: 'ACC005', receiver_account_id: 'ACC012', amount: 3200, transaction_type: 'DEBIT', risk_level: 'LOW', fraud_probability: 0.009 },
  ];

  const fetchTransactionsList = async () => {
    setLoading(true);
    try {
      const res = await getTransactions({
        page: 1,
        page_size: 50,
        risk_level: riskFilter !== 'ALL' ? riskFilter : undefined,
      });
      if (res.data && res.data.items !== undefined) {
        setTransactions(res.data.items);
      } else {
        setTransactions(fallbackTransactions);
      }
    } catch (err) {
      console.warn('Live transactions fetch failed, using fallback:', err);
      let list = [...fallbackTransactions];
      if (riskFilter !== 'ALL') {
        list = list.filter(t => t.risk_level === riskFilter);
      }
      setTransactions(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionsList();
  }, [riskFilter]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await analyzeTransaction({
        amount: parseFloat(amount),
        type,
        sender_account: sender.trim(),
        receiver_account: receiver.trim(),
      });
      setAnalysisResult(res.data);
      // Refresh transaction table to show newly analyzed transaction
      fetchTransactionsList();
    } catch (err: any) {
      console.error('Inference error:', err);
      setAnalysisError(err.response?.data?.detail || 'Inference engine error. Ensure accounts exist.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredTx = transactions.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.transaction_id && t.transaction_id.toLowerCase().includes(q)) ||
      (t.sender_account_id && t.sender_account_id.toLowerCase().includes(q)) ||
      (t.receiver_account_id && t.receiver_account_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Quick Analyze Form */}
      <div className="bg-gradient-to-r from-surface via-surface to-blue-950/30 border border-border/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Live Transaction Inference & Risk Scoring
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Online
                </span>
              </h2>
              <p className="text-xs text-text-secondary">
                Evaluates PaySim XGBoost fraud probability + Behavioral velocities & Mule heuristics in real-time.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAmount('85000');
                setType('TRANSFER');
                setSender('ACC037');
                setReceiver('ACC038');
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/25 border border-indigo-500/30 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Load Hackathon Demo (ACC037 → ACC038)
            </button>
          </div>
        </div>
        
        <form onSubmit={handleAnalyze} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Amount (₹)
            </label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Transaction Type
            </label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="TRANSFER">TRANSFER</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="CASH_OUT">CASH_OUT</option>
              <option value="CASH_IN">CASH_IN</option>
              <option value="DEBIT">DEBIT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Sender Account
            </label>
            <input 
              type="text" 
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. ACC037"
              className="w-full bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Receiver Account
            </label>
            <input 
              type="text" 
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="e.g. ACC038"
              className="w-full bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              required
            />
          </div>

          <div>
            <button 
              type="submit" 
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl py-2.5 px-4 text-sm font-semibold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Running Model...' : 'Score with AI'}
            </button>
          </div>
        </form>

        {/* Live Analysis Alert Banner */}
        {analysisError && (
          <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        {analysisResult && (
          <div className="mt-5 p-5 rounded-2xl bg-gradient-to-r from-base/90 via-surface to-base border border-indigo-500/40 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-elevated border border-border">
                    {analysisResult.transaction_id}
                  </span>
                  <RiskBadge level={analysisResult.risk_level} />
                  <span className="text-xs font-mono text-text-secondary">
                    Investigation Risk: <strong className="text-white font-extrabold">{analysisResult.investigation_risk ?? analysisResult.risk_score}/100</strong>
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  ML Probability: <strong className="text-purple-400">{(analysisResult.fraud_probability * 100).toFixed(3)}%</strong> (Threshold: {((analysisResult.model_threshold || 0.99525) * 100).toFixed(3)}%)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/transactions/${analysisResult.transaction_id}`)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/25 flex items-center gap-1 cursor-pointer"
                >
                  Inspect Evidence & Breakdown <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Investigator Explanation Box */}
            {analysisResult.investigator_explanation && (
              <div className="p-3 rounded-xl bg-base border border-border/70 text-xs text-text-secondary space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    {analysisResult.investigator_explanation.headline}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    Intel: <strong className="text-rose-400">{analysisResult.investigator_explanation.investigation_intel_level}</strong> • ML: <strong className="text-purple-400">{analysisResult.investigator_explanation.ml_signal_level}</strong>
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {analysisResult.investigator_explanation.summary}
                </p>
              </div>
            )}

            {/* Explainable 5-Component Breakdown Grid */}
            {analysisResult.risk_breakdown && analysisResult.risk_breakdown.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Mathematical Score Breakdown (100 pts):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                  {analysisResult.risk_breakdown.map((c: any) => (
                    <div key={c.key} className="bg-base border border-border/80 rounded-xl p-2.5 flex flex-col justify-between">
                      <span className="text-[10px] text-text-muted font-semibold truncate">{c.name}</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono font-bold text-sm text-white">{c.score}</span>
                        <span className="text-[10px] text-text-muted font-mono">/ {c.max_score} pts</span>
                      </div>
                      <div className="w-full bg-elevated rounded-full h-1 mt-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${(c.score / c.max_score) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk factors pill list */}
            {analysisResult.risk_factors && analysisResult.risk_factors.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Detected Risk Indicators:</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.risk_factors.map((rf: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      {rf}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transactions List Container */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-base/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search by Transaction ID or Account..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-base border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-text-muted"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-base px-3 py-1.5 rounded-xl border border-border text-xs">
              <span className="text-text-muted font-medium">Risk Filter:</span>
              <select 
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-surface">All Risk Levels</option>
                <option value="CRITICAL" className="bg-surface text-rose-400">Critical</option>
                <option value="HIGH" className="bg-surface text-orange-400">High</option>
                <option value="MEDIUM" className="bg-surface text-yellow-400">Medium</option>
                <option value="LOW" className="bg-surface text-emerald-400">Low</option>
              </select>
            </div>

            <button
              onClick={() => fetchTransactionsList()}
              className="p-2 rounded-xl bg-elevated hover:bg-elevated/80 text-text-secondary border border-border"
              title="Refresh table"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-muted bg-base/80 border-b border-border uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Flow (Sender → Receiver)</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Risk Level</th>
                <th className="px-6 py-4">Fraud Probability</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium">Loading Transaction Stream...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-text-secondary">
                    <p className="text-sm">No transactions match the selected criteria</p>
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => {
                  const prob = tx.fraud_probability || 0;
                  return (
                    <tr 
                      key={tx.transaction_id}
                      className={`hover:bg-elevated/40 transition-colors ${
                        tx.risk_level === 'CRITICAL' ? 'bg-rose-950/10' : 
                        tx.risk_level === 'HIGH' ? 'bg-orange-950/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-mono text-xs font-bold text-white">
                        {tx.transaction_id}
                      </td>
                      <td className="px-6 py-4 text-text-secondary text-xs">
                        {formatDate(tx.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="bg-indigo-950/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/40">
                            {tx.sender_account_id}
                          </span>
                          <ArrowRight className="w-3 h-3 text-text-muted" />
                          <span className="bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded border border-rose-800/40 font-bold">
                            {tx.receiver_account_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium font-mono text-white">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-text-secondary">
                        {tx.transaction_type}
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge level={tx.risk_level || 'LOW'} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-20 h-2 bg-elevated rounded-full overflow-hidden border border-border/50">
                            <div 
                              className={`h-full rounded-full ${
                                prob > 0.8 ? 'bg-gradient-to-r from-orange-500 to-rose-500' : 
                                prob > 0.5 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                                'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`} 
                              style={{ width: `${Math.max(5, prob * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono font-bold text-white">
                            {(prob * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => navigate(`/transactions/${tx.transaction_id}`)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
