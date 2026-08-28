import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Search, ShieldAlert, AlertTriangle, 
  ArrowUpRight, Network, CheckCircle2, Clock, 
  RefreshCw, MapPin, Building2, ChevronLeft, ChevronRight,
  TrendingUp, ShieldCheck
} from 'lucide-react';
import { RiskBadge } from '../components/ui/RiskBadge';
import { formatCurrency } from '../utils/formatters';
import { getAccounts, AccountListItemData } from '../api/accounts';

export const Accounts: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AccountListItemData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [kycFilter, setKycFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('risk_score');
  const [sortOrder] = useState<string>('desc');


  // Fallback mock accounts for offline/demo robustness
  const fallbackAccounts: AccountListItemData[] = [
    {
      account_id: 'ACC038',
      masked_account_id: 'XXXXC038',
      customer_id: 'CUST038',
      customer_name: 'Rajesh Verma (Mule Hub)',
      kyc_status: 'PENDING',
      account_type: 'CURRENT',
      account_open_date: new Date(Date.now() - 11 * 86400000).toISOString(),
      account_age_days: 11,
      status: 'ACTIVE',
      balance: 8000,
      risk_score: 91,
      risk_status: 'HIGH_RISK',
      mule_score: 91,
      incident_count: 9,
      location_city: 'Jaipur',
      location_state: 'Rajasthan',
    },
    {
      account_id: 'ACC037',
      masked_account_id: 'XXXXC037',
      customer_id: 'CUST037',
      customer_name: 'Vikram Singh (Victim)',
      kyc_status: 'VERIFIED',
      account_type: 'SAVINGS',
      account_open_date: new Date(Date.now() - 547 * 86400000).toISOString(),
      account_age_days: 547,
      status: 'ACTIVE',
      balance: 115000,
      risk_score: 12,
      risk_status: 'NORMAL',
      mule_score: 5,
      incident_count: 0,
      location_city: 'Mumbai',
      location_state: 'Maharashtra',
    },
    {
      account_id: 'ACC030',
      masked_account_id: 'XXXXC030',
      customer_id: 'CUST030',
      customer_name: 'Deepak Sharma (Layer 1 Mule)',
      kyc_status: 'PENDING',
      account_type: 'SAVINGS',
      account_open_date: new Date(Date.now() - 15 * 86400000).toISOString(),
      account_age_days: 15,
      status: 'ACTIVE',
      balance: 5000,
      risk_score: 88,
      risk_status: 'HIGH_RISK',
      mule_score: 86,
      incident_count: 4,
      location_city: 'Delhi',
      location_state: 'Delhi',
    },
    {
      account_id: 'ACC034',
      masked_account_id: 'XXXXC034',
      customer_id: 'CUST034',
      customer_name: 'Karan Mehra (Cashout Node)',
      kyc_status: 'PENDING',
      account_type: 'CURRENT',
      account_open_date: new Date(Date.now() - 8 * 86400000).toISOString(),
      account_age_days: 8,
      status: 'ACTIVE',
      balance: 2000,
      risk_score: 95,
      risk_status: 'HIGH_RISK',
      mule_score: 94,
      incident_count: 7,
      location_city: 'Lucknow',
      location_state: 'Uttar Pradesh',
    },
    {
      account_id: 'ACC001',
      masked_account_id: 'XXXXC001',
      customer_id: 'CUST001',
      customer_name: 'Ananya Roy',
      kyc_status: 'VERIFIED',
      account_type: 'SAVINGS',
      account_open_date: new Date(Date.now() - 400 * 86400000).toISOString(),
      account_age_days: 400,
      status: 'ACTIVE',
      balance: 145000,
      risk_score: 8,
      risk_status: 'NORMAL',
      mule_score: 2,
      incident_count: 0,
      location_city: 'Kolkata',
      location_state: 'West Bengal',
    },
  ];

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await getAccounts({
        page,
        page_size: pageSize,
        risk_status: riskFilter !== 'ALL' ? riskFilter : undefined,
        kyc_status: kycFilter !== 'ALL' ? kycFilter : undefined,
        search: search.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setAccounts(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.warn('Failed to load accounts from API, falling back to mock dataset:', err);
      let filtered = [...fallbackAccounts];
      if (riskFilter !== 'ALL') {
        filtered = filtered.filter(a => a.risk_status === riskFilter);
      }
      if (kycFilter !== 'ALL') {
        filtered = filtered.filter(a => a.kyc_status === kycFilter);
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(a => 
          a.account_id.toLowerCase().includes(q) || 
          a.customer_name.toLowerCase().includes(q) ||
          (a.location_city && a.location_city.toLowerCase().includes(q))
        );
      }
      setAccounts(filtered);
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [page, riskFilter, kycFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAccounts();
  };

  // Stats calculation
  const highRiskCount = accounts.filter(a => a.risk_score >= 60).length;
  const muleSuspectCount = accounts.filter(a => a.mule_score >= 70).length;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-950/40 via-surface to-surface p-6 rounded-2xl border border-indigo-900/30 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Account Registry & Risk Profiles</h1>
          </div>
          <p className="text-sm text-text-secondary">
            Monitor customer accounts, detect mule indicators, track behavioral anomalies, and drill into graph networks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchAccounts()} 
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-elevated hover:bg-elevated/80 border border-border text-xs font-semibold text-text-primary transition-all hover:border-indigo-500/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => navigate('/networks')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all"
          >
            <Network className="w-3.5 h-3.5" />
            Explore Graph Network
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-md relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total Accounts</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{total}</p>
          <p className="text-xs text-blue-400/80 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Indexed in system
          </p>
        </div>

        <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-md relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">High Risk / Flagged</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-400">{highRiskCount}</p>
          <p className="text-xs text-rose-300/70 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Risk score ≥ 60
          </p>
        </div>

        <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-md relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Mule Suspects</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400">{muleSuspectCount}</p>
          <p className="text-xs text-amber-300/70 mt-1">High fan-in/fan-out velocity</p>
        </div>

        <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">KYC Verified</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">
            {accounts.filter(a => a.kyc_status === 'VERIFIED').length}
          </p>
          <p className="text-xs text-emerald-300/70 mt-1">Government ID verified</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-4 shadow-md">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search by Account ID (e.g. ACC038), Customer Name, or City..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-base/80 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-text-muted"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-base/80 px-2.5 py-1.5 rounded-xl border border-border text-xs">
              <span className="text-text-muted font-medium">Risk:</span>
              <select 
                value={riskFilter}
                onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-surface">All Risks</option>
                <option value="HIGH_RISK" className="bg-surface text-rose-400">High Risk</option>
                <option value="MONITORED" className="bg-surface text-amber-400">Monitored</option>
                <option value="NORMAL" className="bg-surface text-emerald-400">Normal</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-base/80 px-2.5 py-1.5 rounded-xl border border-border text-xs">
              <span className="text-text-muted font-medium">KYC:</span>
              <select 
                value={kycFilter}
                onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-surface">All KYC</option>
                <option value="VERIFIED" className="bg-surface text-emerald-400">Verified</option>
                <option value="PENDING" className="bg-surface text-amber-400">Pending</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-base/80 px-2.5 py-1.5 rounded-xl border border-border text-xs">
              <span className="text-text-muted font-medium">Sort:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="risk_score" className="bg-surface">Risk Score</option>
                <option value="balance" className="bg-surface">Balance</option>
                <option value="account_open_date" className="bg-surface">Account Age</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
            >
              Apply Search
            </button>
          </div>
        </form>
      </div>

      {/* Main Accounts Table Card */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-muted bg-base/80 border-b border-border font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Account / Customer</th>
                <th className="px-6 py-4">Risk Status</th>
                <th className="px-6 py-4">Mule Probability</th>
                <th className="px-6 py-4">Balance (₹)</th>
                <th className="px-6 py-4">KYC / Type</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Flags</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium">Loading Account Profiles...</p>
                    </div>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-10 h-10 text-text-muted opacity-40 mb-1" />
                      <p className="text-base font-semibold text-white">No Accounts Found</p>
                      <p className="text-xs text-text-muted">Try adjusting your filters or search terms</p>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr 
                    key={acc.account_id}
                    className={`hover:bg-elevated/50 transition-colors ${
                      acc.risk_score >= 80 ? 'bg-rose-950/10' : 
                      acc.risk_score >= 60 ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Account & Customer */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                          acc.risk_score >= 80 ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          acc.risk_score >= 60 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {acc.account_id.slice(-3)}
                        </div>
                        <div>
                          <Link 
                            to={`/accounts/${acc.account_id}`}
                            className="font-mono text-xs font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-1"
                          >
                            {acc.account_id}
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </Link>
                          <p className="text-xs text-text-secondary font-medium">{acc.customer_name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Risk Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <RiskBadge 
                          level={
                            acc.risk_score >= 80 ? 'CRITICAL' : 
                            acc.risk_score >= 60 ? 'HIGH' : 
                            acc.risk_score >= 30 ? 'MEDIUM' : 'LOW'
                          } 
                        />
                        <span className="text-xs font-mono font-bold text-text-secondary">
                          {acc.risk_score}/100
                        </span>
                      </div>
                    </td>

                    {/* Mule Probability */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 w-32">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className={acc.mule_score >= 70 ? 'text-rose-400 font-bold' : 'text-text-secondary'}>
                            {acc.mule_score}%
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {acc.mule_score >= 70 ? 'MULE HUB' : acc.mule_score >= 40 ? 'ELEVATED' : 'CLEAN'}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-elevated rounded-full overflow-hidden border border-border/50">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              acc.mule_score >= 80 ? 'bg-gradient-to-r from-orange-500 to-rose-500' :
                              acc.mule_score >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                              'bg-gradient-to-r from-emerald-500 to-teal-400'
                            }`}
                            style={{ width: `${Math.max(5, acc.mule_score)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {formatCurrency(acc.balance)}
                    </td>

                    {/* KYC & Type */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          acc.kyc_status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {acc.kyc_status === 'VERIFIED' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          {acc.kyc_status}
                        </span>
                        <p className="text-[11px] text-text-muted">{acc.account_type}</p>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4 text-xs text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-text-muted" />
                        <span>{acc.location_city || 'India'}, {acc.location_state || 'IN'}</span>
                      </div>
                    </td>

                    {/* Flags / Incidents */}
                    <td className="px-6 py-4">
                      {acc.incident_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                          {acc.incident_count} Incidents
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">None</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/accounts/${acc.account_id}`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          Profile
                        </Link>
                        <Link 
                          to={`/networks`}
                          className="p-1.5 text-xs rounded-lg bg-elevated text-text-secondary hover:text-cyan-400 hover:border-cyan-500/40 border border-border transition-all"
                          title="Trace Graph Network"
                        >
                          <Network className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 bg-base/50">
          <p className="text-xs text-text-muted">
            Showing <span className="text-white font-semibold">{accounts.length}</span> of <span className="text-white font-semibold">{total}</span> accounts
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-elevated border border-border text-xs font-semibold text-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="text-xs font-mono text-text-secondary px-2">
              Page <span className="text-white font-bold">{page}</span> / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-elevated border border-border text-xs font-semibold text-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
