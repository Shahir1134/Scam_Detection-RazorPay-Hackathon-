import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Search, CheckCircle2, 
  Clock, ShieldAlert, RefreshCw, X
} from 'lucide-react';
import { RiskBadge } from '../components/ui/RiskBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { listCases, addCaseAction } from '../api/cases';


export const Cases: React.FC = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState('ADD_NOTE');
  const [actionDetails, setActionDetails] = useState('');

  const fallbackCases = [
    { 
      case_id: 'CASE-2026-001', 
      title: 'Suspected Mule Network - RJ Hub', 
      transaction_id: 'TXN-98234-A',
      primary_account_id: 'ACC038', 
      transaction_amount: 1450000, 
      priority: 'CRITICAL', 
      status: 'OPEN', 
      assigned_investigator: 'Shahir Ali', 
      created_at: new Date().toISOString(),
      notes: 'Multiple incoming transfers from vulnerable accounts with rapid fan-out.',
      audit_log: [
        { action: 'CASE_CREATED', investigator: 'Shahir Ali', timestamp: new Date().toISOString(), details: 'Initial automated flag triggered by ML Model (94% fraud prob).' }
      ]
    },
    { 
      case_id: 'CASE-2026-002', 
      title: 'High Velocity Cash-Outs Alert', 
      transaction_id: 'TXN-98236-C',
      primary_account_id: 'ACC881', 
      transaction_amount: 320000, 
      priority: 'HIGH', 
      status: 'UNDER_INVESTIGATION', 
      assigned_investigator: 'Shahir Ali', 
      created_at: new Date(Date.now() - 86400000).toISOString(),
      notes: 'Atmosphere of high velocity debit transfers after sudden deposit.',
      audit_log: [
        { action: 'CASE_CREATED', investigator: 'System', timestamp: new Date(Date.now() - 86400000).toISOString(), details: 'Case opened from transaction TXN-98236-C.' }
      ]
    },
    { 
      case_id: 'CASE-2026-003', 
      title: 'Account Takeover Anomalous Login', 
      transaction_id: 'TXN-98237-D',
      primary_account_id: 'ACC105', 
      transaction_amount: 450000, 
      priority: 'HIGH', 
      status: 'OPEN', 
      assigned_investigator: 'Shahir Ali', 
      created_at: new Date(Date.now() - 172800000).toISOString(),
      notes: 'Geolocation mismatch detected alongside large transfer attempt.',
      audit_log: []
    },
    { 
      case_id: 'CASE-2025-842', 
      title: 'Salary Bulk Disbursement Verification', 
      transaction_id: 'TXN-88123-X',
      primary_account_id: 'ACC442', 
      transaction_amount: 2800000, 
      priority: 'LOW', 
      status: 'CLOSED', 
      assigned_investigator: 'Shahir Ali', 
      created_at: new Date(Date.now() - 500000000).toISOString(),
      notes: 'Verified legitimate payroll distribution after employer confirmation.',
      audit_log: [
        { action: 'MARK_FALSE_POSITIVE', investigator: 'Shahir Ali', timestamp: new Date(Date.now() - 400000000).toISOString(), details: 'Verified with payroll ledger.' }
      ]
    },
  ];

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await listCases({
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        priority: filterPriority !== 'ALL' ? filterPriority : undefined,
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        // Enforce investigator name Shahir Ali if generic
        const formatted = res.data.map((c: any) => ({
          ...c,
          assigned_investigator: (!c.assigned_investigator || c.assigned_investigator === 'Investigator' || c.assigned_investigator === 'Raj Sharma') 
            ? 'Shahir Ali' 
            : c.assigned_investigator
        }));
        setCases(formatted);
      } else {
        setCases(fallbackCases);
      }
    } catch (err) {
      console.warn('API cases fetch failed, using rich fallback:', err);
      let list = [...fallbackCases];
      if (filterStatus !== 'ALL') {
        list = list.filter(c => c.status === filterStatus);
      }
      if (filterPriority !== 'ALL') {
        list = list.filter(c => c.priority === filterPriority);
      }
      setCases(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filterStatus, filterPriority]);

  const handleCaseAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      await addCaseAction(selectedCase.case_id, {
        action: actionType,
        investigator: 'Shahir Ali',
        details: actionDetails || `Action ${actionType} performed by Shahir Ali.`
      });
      setActionModalOpen(false);
      setActionDetails('');
      fetchCases();
    } catch (err) {
      // simulate in-memory update if offline
      setCases(prev => prev.map(c => {
        if (c.case_id === selectedCase.case_id) {
          const newStatus = actionType === 'ESCALATE' ? 'ESCALATED' :
                            actionType === 'MARK_CONFIRMED_FRAUD' || actionType === 'MARK_FALSE_POSITIVE' ? 'CLOSED' :
                            'UNDER_INVESTIGATION';
          return { ...c, status: newStatus };
        }
        return c;
      }));
      setActionModalOpen(false);
      setActionDetails('');
    }
  };

  const filteredCases = cases.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.case_id && c.case_id.toLowerCase().includes(q)) ||
      (c.primary_account_id && c.primary_account_id.toLowerCase().includes(q)) ||
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.assigned_investigator && c.assigned_investigator.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-rose-950/40 via-surface to-surface p-6 rounded-2xl border border-rose-900/30 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Briefcase className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Case Management & Escalations</h1>
          </div>
          <p className="text-sm text-text-secondary">
            Lead Investigator: <span className="text-white font-semibold">Shahir Ali</span> • Track, escalate, and resolve active scam & fraud cases.
          </p>
        </div>
        <button 
          onClick={() => fetchCases()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-elevated hover:bg-elevated/80 border border-border text-xs font-semibold text-text-primary transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary uppercase">Open Cases</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{cases.filter(c => c.status === 'OPEN').length}</p>
          <p className="text-xs text-blue-400 mt-1">Requiring review</p>
        </div>

        <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-amber-300 uppercase">Under Investigation</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400">{cases.filter(c => c.status === 'UNDER_INVESTIGATION').length}</p>
          <p className="text-xs text-amber-300/80 mt-1">Active evidence gathering</p>
        </div>

        <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-rose-300 uppercase">Escalated to Ops</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-400">{cases.filter(c => c.status === 'ESCALATED').length}</p>
          <p className="text-xs text-rose-300/80 mt-1">High priority money flow</p>
        </div>

        <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-emerald-300 uppercase">Resolved Cases</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">{cases.filter(c => c.status === 'CLOSED').length}</p>
          <p className="text-xs text-emerald-300/80 mt-1">Confirmed / Cleared</p>
        </div>
      </div>

      {/* Main Cases Container */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[500px]">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-base/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search by Case ID, Target Account, or Title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-base border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500 placeholder:text-text-muted"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-base px-3 py-1.5 rounded-xl border border-border text-xs">
              <span className="text-text-muted font-medium">Status:</span>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-surface">All Statuses</option>
                <option value="OPEN" className="bg-surface text-blue-400">Open</option>
                <option value="UNDER_INVESTIGATION" className="bg-surface text-amber-400">Under Investigation</option>
                <option value="ESCALATED" className="bg-surface text-rose-400">Escalated</option>
                <option value="CLOSED" className="bg-surface text-emerald-400">Closed</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-base px-3 py-1.5 rounded-xl border border-border text-xs">
              <span className="text-text-muted font-medium">Priority:</span>
              <select 
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-surface">All Priorities</option>
                <option value="CRITICAL" className="bg-surface text-rose-400">Critical</option>
                <option value="HIGH" className="bg-surface text-orange-400">High</option>
                <option value="MEDIUM" className="bg-surface text-yellow-400">Medium</option>
                <option value="LOW" className="bg-surface text-emerald-400">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cases Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-muted bg-base/80 border-b border-border uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Case ID / Description</th>
                <th className="px-6 py-4">Target Account</th>
                <th className="px-6 py-4">Amount at Risk</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned Investigator</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium">Loading Cases...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Briefcase className="w-10 h-10 text-text-muted opacity-40 mb-1" />
                      <p className="text-base font-semibold text-white">No Cases Match Criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.case_id || c.id} className="hover:bg-elevated/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs text-white font-bold mb-1">{c.case_id || c.id}</p>
                      <p className="text-text-secondary text-xs line-clamp-1">{c.title || c.notes || 'Automated ML Flag Investigation'}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-rose-300">
                      {c.primary_account_id || c.target}
                    </td>
                    <td className="px-6 py-4 font-medium text-white font-mono">
                      {formatCurrency(c.transaction_amount || c.amount || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge level={c.priority} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        c.status === 'OPEN' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 
                        c.status === 'UNDER_INVESTIGATION' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        c.status === 'ESCALATED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse' :
                        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          SA
                        </div>
                        <span className="text-xs font-semibold text-white">
                          {c.assigned_investigator || 'Shahir Ali'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-text-secondary">
                      {formatDate(c.created_at || c.date)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedCase(c);
                          setActionModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/15 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                      >
                        Action Case
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Dialog Modal */}
      {actionModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-rose-400" />
                  Investigate Case: {selectedCase.case_id}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Target Account: <span className="font-mono text-white font-bold">{selectedCase.primary_account_id}</span>
                </p>
              </div>
              <button 
                onClick={() => setActionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-elevated text-text-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCaseAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Select Investigation Action
                </label>
                <select 
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="ADD_NOTE">Add Investigation Note</option>
                  <option value="ESCALATE">Escalate to Fraud Ops & Freeze Account</option>
                  <option value="MARK_CONFIRMED_FRAUD">Confirm Fraud & Initiate Recovery</option>
                  <option value="MARK_FALSE_POSITIVE">Mark False Positive & Dismiss</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Action Details & Evidence Log (Investigator: Shahir Ali)
                </label>
                <textarea 
                  rows={3}
                  placeholder="Enter detailed reason, customer verification outcomes, or graph cluster findings..."
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  className="w-full bg-base border border-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 placeholder:text-text-muted"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-elevated hover:bg-elevated/80 text-text-secondary text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all"
                >
                  Submit Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
