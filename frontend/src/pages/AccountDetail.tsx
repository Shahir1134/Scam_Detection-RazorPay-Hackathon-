import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Phone, Hash, AlertTriangle, Activity, 
  Clock, Briefcase, Network, 
  ArrowUpRight, TrendingDown, TrendingUp
} from 'lucide-react';
import { RiskBadge } from '../components/ui/RiskBadge';
import { MaskableText } from '../components/ui/MaskableText';
import { formatCurrency, timeAgo } from '../utils/formatters';
import { getAccount, getAccountTransactions, getAccountIncidents } from '../api/accounts';


export const AccountDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  // Fallback demo account
  const fallbackAccount = {
    account_id: id || 'ACC038',
    customer_name: 'Rajesh Verma (Flagged Mule)',
    kyc_status: 'PENDING',
    account_type: 'CURRENT',
    account_open_date: new Date(Date.now() - 11 * 86400000).toISOString(),
    status: 'ACTIVE',
    balance: 8000,
    risk_score: 91,
    risk_status: 'HIGH_RISK',
    masked_phone: '+91 XXXXX X8921',
    masked_address: 'Main Bazaar, Jaipur, Rajasthan',
    location_city: 'Jaipur',
    location_state: 'Rajasthan',
    mule_info: {
      mule_score: 91,
      signals: [
        'Rapid pass-through: 94% of inbound funds drained within 30 minutes',
        'High fan-in: 73 unique originators in last 7 days',
        'Recent account opening: Only 11 days old'
      ]
    },
    incident_count: 9,
    behavioral_stats: {
      avg_transaction_amount: 14500,
      max_amount: 85000,
      tx_count_5min: 2,
      tx_count_1hr: 5,
      tx_count_24hr: 14,
      tx_count_30days: 114,
      unique_senders: 73,
      unique_receivers: 41,
      total_incoming: 1250000,
      total_outgoing: 1242000,
    }
  };

  const fallbackIncidents = [
    { incident_id: 'INC-101', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), incident_type: 'SUSPICIOUS_TRANSACTION', description: 'Received 5 high-value transfers in 2 hours with immediate drain', status: 'FLAGGED', severity: 'CRITICAL' },
    { incident_id: 'INC-089', created_at: new Date(Date.now() - 5 * 86400000).toISOString(), incident_type: 'MULE_SUSPECTED', description: 'Account identified as fan-in consolidation node', status: 'UNDER_INVESTIGATION', severity: 'HIGH' },
    { incident_id: 'INC-074', created_at: new Date(Date.now() - 8 * 86400000).toISOString(), incident_type: 'FRAUD_REPORT', description: 'Reported by victim account ACC027', status: 'CONFIRMED_FRAUD', severity: 'CRITICAL' },
  ];

  const fallbackTx = [
    { transaction_id: 'TXN-98234-A', timestamp: new Date().toISOString(), transaction_type: 'TRANSFER', amount: 85000, sender_account_id: 'ACC037', receiver_account_id: 'ACC038', risk_level: 'CRITICAL' },
    { transaction_id: 'TXN-98230-F', timestamp: new Date(Date.now() - 3600000).toISOString(), transaction_type: 'TRANSFER', amount: 42000, sender_account_id: 'ACC028', receiver_account_id: 'ACC038', risk_level: 'HIGH' },
    { transaction_id: 'TXN-98100-X', timestamp: new Date(Date.now() - 7200000).toISOString(), transaction_type: 'TRANSFER', amount: 70000, sender_account_id: 'ACC038', receiver_account_id: 'ACC032', risk_level: 'CRITICAL' },
  ];

  useEffect(() => {
    const loadAccountData = async () => {
      const targetId = id || 'ACC038';
      try {
        const [accRes, txRes, incRes] = await Promise.allSettled([
          getAccount(targetId),
          getAccountTransactions(targetId),
          getAccountIncidents(targetId),
        ]);

        if (accRes.status === 'fulfilled' && accRes.value.data) {
          setAccount(accRes.value.data);
        } else {
          setAccount(fallbackAccount);
        }

        if (txRes.status === 'fulfilled' && txRes.value.data?.items) {
          setTransactions(txRes.value.data.items);
        } else {
          setTransactions(fallbackTx);
        }

        if (incRes.status === 'fulfilled' && incRes.value.data) {
          setIncidents(incRes.value.data);
        } else {
          setIncidents(fallbackIncidents);
        }
      } catch (err) {
        console.warn('Account API fetch failed, using rich fallback:', err);
        setAccount(fallbackAccount);
        setTransactions(fallbackTx);
        setIncidents(fallbackIncidents);
      } finally {
        setLoading(false);
      }
    };

    loadAccountData();
  }, [id]);

  if (loading || !account) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-40 bg-surface/80 rounded-2xl border border-border"></div>
        <div className="grid grid-cols-3 gap-6">
          <div className="h-96 bg-surface/80 rounded-2xl border border-border"></div>
          <div className="col-span-2 h-96 bg-surface/80 rounded-2xl border border-border"></div>
        </div>
      </div>
    );
  }

  const muleScore = account.mule_info?.mule_score ?? account.mule_score ?? 0;
  const stats = account.behavioral_stats || fallbackAccount.behavioral_stats;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-surface via-surface to-indigo-950/40 border border-border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white font-mono">{account.account_id}</h1>
            <RiskBadge level={account.risk_status === 'HIGH_RISK' ? 'CRITICAL' : account.risk_status === 'MONITORED' ? 'HIGH' : 'LOW'} />
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              account.kyc_status === 'VERIFIED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
              'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              KYC: {account.kyc_status}
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            Customer: <strong className="text-white">{account.customer_name}</strong> • Account Age: <strong className="text-white">{account.account_age_days || 11} days</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/networks')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
            Trace in Fraud Networks
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-6 relative overflow-hidden shadow-xl">
            {account.risk_score >= 80 && (
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-orange-500"></div>
            )}
            
            <div className="flex flex-col items-center text-center border-b border-border/70 pb-6 mb-6">
              {/* Radial Score Gauge */}
              <div className="w-28 h-28 rounded-full border-4 border-surface shadow-xl flex items-center justify-center mb-4 relative" style={{ 
                background: `conic-gradient(${account.risk_score > 70 ? '#f43f5e' : '#eab308'} ${account.risk_score}%, #1e293b 0)` 
              }}>
                <div className="w-22 h-22 bg-surface rounded-full flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold font-mono text-white">{account.risk_score}</span>
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Risk Score</span>
                </div>
              </div>
              
              <h2 className="text-lg font-extrabold text-white mb-0.5">{account.customer_name}</h2>
              <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary mb-3 font-mono">
                <Hash className="w-3 h-3 text-text-muted" />
                <MaskableText text={account.account_id} />
              </div>
              <RiskBadge level={account.risk_score >= 80 ? 'CRITICAL' : account.risk_score >= 60 ? 'HIGH' : 'LOW'} />
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-base/50">
                <span className="text-text-secondary flex items-center gap-2 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400"/> Account Type
                </span>
                <span className="text-white font-bold">{account.account_type}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-base/50">
                <span className="text-text-secondary flex items-center gap-2 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-400"/> Account Age
                </span>
                <span className="text-white font-bold">{account.account_age_days || 11} days</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-base/50">
                <span className="text-text-secondary flex items-center gap-2 font-medium">
                  <Phone className="w-3.5 h-3.5 text-indigo-400"/> Registered Phone
                </span>
                <span className="text-white font-mono">{account.masked_phone}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-base/50">
                <span className="text-text-secondary flex items-center gap-2 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400"/> Geolocation
                </span>
                <span className="text-white font-medium">{account.location_city}, {account.location_state}</span>
              </div>
            </div>
            
            {/* Mule Indicator Box */}
            {muleScore >= 50 && (
              <div className="mt-6 bg-gradient-to-br from-rose-950/40 to-orange-950/30 border border-rose-800/50 rounded-xl p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between text-rose-300 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" /> Mule Risk Assessment
                  </span>
                  <span className="font-mono text-rose-400 font-extrabold">{muleScore}%</span>
                </div>

                <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-rose-900/40">
                  <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full rounded-full" style={{ width: `${muleScore}%` }}></div>
                </div>

                <div className="text-[11px] text-rose-200/80 space-y-1 pt-1">
                  <p className="font-semibold text-rose-300">Detected Mule Indicators:</p>
                  {(account.mule_info?.signals || fallbackAccount.mule_info.signals).map((sig: string, i: number) => (
                    <p key={i} className="flex items-start gap-1.5 text-text-secondary">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{sig}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Behavioral Stats & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Behavioral Profile Grid */}
          <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" /> Behavioral & Volume Metrics
              </h3>
              <span className="text-xs font-mono text-text-muted">30-Day Historical Window</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-base/70 p-4 rounded-xl border border-border/80">
                <p className="text-[10px] text-text-muted font-semibold uppercase mb-1">Average Amount</p>
                <p className="text-base font-mono font-bold text-white">{formatCurrency(stats.avg_transaction_amount || 0)}</p>
              </div>

              <div className="bg-base/70 p-4 rounded-xl border border-border/80">
                <p className="text-[10px] text-text-muted font-semibold uppercase mb-1">24h Tx Count</p>
                <p className="text-base font-mono font-bold text-indigo-400">{stats.tx_count_24hr || 0} txns</p>
              </div>

              <div className="bg-base/70 p-4 rounded-xl border border-border/80">
                <p className="text-[10px] text-text-muted font-semibold uppercase mb-1">Total Incoming</p>
                <p className="text-base font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {formatCurrency(stats.total_incoming || 0)}
                </p>
              </div>

              <div className="bg-base/70 p-4 rounded-xl border border-border/80">
                <p className="text-[10px] text-text-muted font-semibold uppercase mb-1">Total Outgoing</p>
                <p className="text-base font-mono font-bold text-rose-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {formatCurrency(stats.total_outgoing || 0)}
                </p>
              </div>

              <div className="bg-base/70 p-4 rounded-xl border border-border/80">
                <p className="text-[10px] text-text-muted font-semibold uppercase mb-1">Unique Senders</p>
                <p className="text-lg font-mono font-extrabold text-amber-400">{stats.unique_senders || 0}</p>
                <span className="text-[10px] text-text-muted">Fan-In Sources</span>
              </div>

              <div className="bg-base/70 p-4 rounded-xl border border-border/80">
                <p className="text-[10px] text-text-muted font-semibold uppercase mb-1">Unique Receivers</p>
                <p className="text-lg font-mono font-extrabold text-purple-400">{stats.unique_receivers || 0}</p>
                <span className="text-[10px] text-text-muted">Fan-Out Destinations</span>
              </div>

              <div className="bg-base/70 p-4 rounded-xl border border-border/80 col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase mb-1">Current Ledger Balance</p>
                  <p className="text-2xl font-mono font-extrabold text-white">{formatCurrency(account.balance || 0)}</p>
                </div>
                {account.balance < 10000 && stats.total_incoming > 50000 && (
                  <span className="text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                    Pass-Through Drain Detected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Transactions & Incidents Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-5 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Transactions</h3>
                <Link to="/transactions" className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1">
                  View All <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2.5">
                {transactions.slice(0, 4).map((tx) => (
                  <div key={tx.transaction_id} className="bg-base/70 border border-border rounded-xl p-3 flex justify-between items-center hover:bg-elevated/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          tx.sender_account_id === account.account_id ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {tx.sender_account_id === account.account_id ? 'OUT' : 'IN'}
                        </span>
                        <span className="text-xs font-mono font-bold text-white">{formatCurrency(tx.amount)}</span>
                      </div>
                      <p className="text-[11px] text-text-muted font-mono">
                        {tx.sender_account_id === account.account_id ? `To ${tx.receiver_account_id}` : `From ${tx.sender_account_id}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <RiskBadge level={tx.risk_level || 'HIGH'} />
                      <Link to={`/transactions/${tx.transaction_id}`} className="block text-[10px] font-semibold text-indigo-400 hover:underline mt-1">
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Incidents Timeline */}
            <div className="bg-surface/90 backdrop-blur-md border border-border rounded-2xl p-5 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Risk Incident History</h3>
                <span className="text-xs font-mono font-bold text-rose-400">{incidents.length} Logged</span>
              </div>
              <div className="space-y-3 relative border-l-2 border-border/80 ml-3 pl-4">
                {incidents.slice(0, 3).map((inc) => (
                  <div key={inc.incident_id} className="relative bg-base/70 border border-border rounded-xl p-3 text-xs">
                    <div className="absolute -left-[23px] top-3.5 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-surface"></div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-rose-300 text-xs">{inc.incident_type}</span>
                      <span className="text-[10px] text-text-muted">{timeAgo(inc.created_at)}</span>
                    </div>
                    <p className="text-text-secondary text-[11px] line-clamp-2">{inc.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-elevated text-text-secondary border border-border">
                        {inc.status}
                      </span>
                      <span className="text-[9px] font-mono text-rose-400 font-bold">
                        {inc.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
