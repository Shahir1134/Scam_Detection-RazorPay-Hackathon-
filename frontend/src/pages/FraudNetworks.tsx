import React, { useState, useEffect, useCallback } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  Handle, 
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Search, Activity, ArrowRight, 
  Clock, RefreshCw, ExternalLink, Layers, 
  ArrowDownLeft, ArrowUpRight, ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, timeAgo } from '../utils/formatters';
import { RiskBadge } from '../components/ui/RiskBadge';
import { getAccountNetwork } from '../api/accounts';
import { NetworkGraphResponse, FundFlowSource, FundFlowDestination, FundFlowTimelineItem } from '../types';

// Preset notable demo accounts for fast investigation
const PRESET_ACCOUNTS = [
  { id: 'ACC038', label: 'ACC038 (Primary Mule)', badge: 'CRITICAL', note: 'High fan-in rapid drain' },
  { id: 'ACC012', label: 'ACC012 (Layering Hub)', badge: 'HIGH', note: 'Split-routing entity' },
  { id: 'ACC005', label: 'ACC005 (Source Drain)', badge: 'HIGH', note: 'Victim drain terminal' },
  { id: 'ACC042', label: 'ACC042 (Aggregator)', badge: 'MEDIUM', note: 'Consolidation point' },
];

const riskColorMap: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  UNKNOWN: '#64748b'
};

// ── CUSTOM FLOW NODES ──────────────────────────────────────────

// 1. Source Node (Where money came from)
const SourceNode = ({ data }: any) => {
  const color = riskColorMap[data.risk_level] || riskColorMap.LOW;
  return (
    <div className="bg-surface/95 backdrop-blur-sm border rounded-xl p-3 w-56 shadow-lg hover:shadow-cyan-900/20 transition-all duration-150 group cursor-pointer"
         style={{ borderColor: data.isSelected ? '#38bdf8' : 'rgba(51, 65, 85, 0.7)' }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
          <ArrowDownLeft className="w-3 h-3" /> MONEY SOURCE
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
              style={{ backgroundColor: `${color}20`, color: color }}>
          {data.risk_level || 'LOW'}
        </span>
      </div>
      <div className="text-xs font-bold text-white truncate font-mono">{data.account_id}</div>
      <div className="text-[11px] text-text-secondary truncate">{data.name || data.masked_id}</div>
      <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
        <span className="text-text-muted text-[10px]">Sent:</span>
        <span className="font-mono font-bold text-emerald-400">{formatCurrency(data.volume || 0)}</span>
      </div>
      <Handle 
        id="right"
        type="source" 
        position={Position.Right} 
        style={{ background: '#38bdf8', width: 8, height: 8, border: '2px solid #0f172a' }} 
      />
    </div>
  );
};

// 2. Center Node (Investigated Target Account)
const CenterNode = ({ data }: any) => {
  const isHighRisk = data.risk_level === 'CRITICAL' || data.risk_level === 'HIGH';
  return (
    <div className="bg-elevated/95 backdrop-blur-sm border-2 rounded-2xl p-4 w-64 shadow-2xl transition-all duration-200 cursor-pointer"
         style={{ 
           borderColor: isHighRisk ? '#ef4444' : '#3b82f6',
           boxShadow: isHighRisk ? '0 0 25px rgba(239, 68, 68, 0.25)' : '0 0 25px rgba(59, 130, 246, 0.25)'
         }}>
      <Handle 
        id="left"
        type="target" 
        position={Position.Left} 
        style={{ background: '#38bdf8', width: 9, height: 9, border: '2px solid #0f172a' }} 
      />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue flex items-center gap-1">
          <Layers className="w-3 h-3" /> TARGET ACCOUNT
        </span>
        <RiskBadge level={data.risk_level || 'HIGH'} />
      </div>

      <div className="text-sm font-bold text-white font-mono">{data.account_id}</div>
      <div className="text-xs text-text-secondary truncate mb-3">{data.name || 'Account Holder'}</div>

      <div className="grid grid-cols-2 gap-2 bg-base/80 p-2 rounded-lg border border-border/50 text-[11px]">
        <div>
          <span className="text-text-muted text-[10px] block">Inflow</span>
          <span className="font-mono font-bold text-emerald-400">{formatCurrency(data.total_incoming || 0)}</span>
        </div>
        <div>
          <span className="text-text-muted text-[10px] block">Outflow</span>
          <span className="font-mono font-bold text-rose-400">{formatCurrency(data.total_outgoing || 0)}</span>
        </div>
      </div>

      {data.pass_through_rate > 0 && (
        <div className="mt-2 text-[10px] flex items-center justify-between text-text-muted">
          <span>Pass-Through Drain:</span>
          <span className={`font-mono font-bold ${data.pass_through_rate >= 80 ? 'text-rose-400' : 'text-amber-400'}`}>
            {data.pass_through_rate.toFixed(1)}%
          </span>
        </div>
      )}

      <Handle 
        id="right"
        type="source" 
        position={Position.Right} 
        style={{ background: '#10b981', width: 9, height: 9, border: '2px solid #0f172a' }} 
      />
    </div>
  );
};

// 3. Destination Node (Where money went)
const DestNode = ({ data }: any) => {
  const color = riskColorMap[data.risk_level] || riskColorMap.LOW;
  return (
    <div className="bg-surface/95 backdrop-blur-sm border rounded-xl p-3 w-56 shadow-lg hover:shadow-rose-900/20 transition-all duration-150 group cursor-pointer"
         style={{ borderColor: data.isSelected ? '#f43f5e' : 'rgba(51, 65, 85, 0.7)' }}>
      <Handle 
        id="left"
        type="target" 
        position={Position.Left} 
        style={{ background: '#10b981', width: 8, height: 8, border: '2px solid #0f172a' }} 
      />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" /> MONEY DESTINATION
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
              style={{ backgroundColor: `${color}20`, color: color }}>
          {data.risk_level || 'LOW'}
        </span>
      </div>
      <div className="text-xs font-bold text-white truncate font-mono">{data.account_id}</div>
      <div className="text-[11px] text-text-secondary truncate">{data.name || data.masked_id}</div>
      <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
        <span className="text-text-muted text-[10px]">Received:</span>
        <span className="font-mono font-bold text-rose-400">{formatCurrency(data.volume || 0)}</span>
      </div>
    </div>
  );
};

const nodeTypes = {
  sourceNode: SourceNode,
  centerNode: CenterNode,
  destNode: DestNode,
  flowNode: CenterNode,
  accountNode: CenterNode,
};

export const FraudNetworks: React.FC = () => {
  const [searchInput, setSearchInput] = useState('ACC038');
  const [activeAccount, setActiveAccount] = useState('ACC038');
  const [timeframeDays, setTimeframeDays] = useState<number>(7);
  const [activeTab, setActiveTab] = useState<'graph' | 'table' | 'timeline'>('graph');
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
  const [sources, setSources] = useState<FundFlowSource[]>([]);
  const [destinations, setDestinations] = useState<FundFlowDestination[]>([]);
  const [timeline, setTimeline] = useState<FundFlowTimelineItem[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  const fetchNetwork = useCallback(async (targetId: string, days: number) => {
    const idToFetch = (targetId || 'ACC038').trim();
    setIsLoading(true);
    try {
      const res = await getAccountNetwork(idToFetch, 2, days);
      const data: NetworkGraphResponse = res.data;
      if (data) {
        setSources(data.sources || []);
        setDestinations(data.destinations || []);
        setTimeline(data.timeline || []);
        setSummary(data.summary || null);

        // Format and attach marker arrows on edges
        const formattedEdges = (data.edges || []).map((e: any) => ({
          ...e,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: e.style?.stroke || '#64748b',
            width: 14,
            height: 14,
          },
        }));

        setNodes(data.nodes || []);
        setEdges(formattedEdges);

        // Select the center node by default
        const centerNode = (data.nodes || []).find((n: any) => n.data?.is_center);
        if (centerNode) {
          setSelectedNode(centerNode);
        } else if (data.nodes && data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      }
    } catch (err) {
      console.warn('Network flow fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges]);

  // Initial load
  useEffect(() => {
    fetchNetwork(activeAccount, timeframeDays);
  }, [activeAccount, timeframeDays, fetchNetwork]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveAccount(searchInput.trim());
    }
  };

  const handleSelectPreset = (id: string) => {
    setSearchInput(id);
    setActiveAccount(id);
  };

  const onNodeClick = (_event: any, node: any) => {
    setSelectedNode(node);
  };

  return (
    <div className="h-full flex flex-col -m-6 bg-base">
      {/* ── TOP CONTROL BAR ── */}
      <div className="bg-surface border-b border-border px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-base tracking-tight">Fund Flow & Fraud Network</h2>
              <span className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono font-semibold px-2 py-0.5 rounded">
                {activeAccount}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Trace where money came from and where it went
            </p>
          </div>
        </div>

        {/* Search & Timeframe Controls */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search account (e.g. ACC038)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-base border border-border rounded-lg pl-9 pr-20 py-1.5 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-accent-blue font-mono"
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-accent-blue hover:bg-blue-600 text-white text-[11px] font-medium px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              {isLoading ? 'Tracing...' : 'Trace'}
            </button>
          </form>

          {/* Timeframe Selector (24h, 7d / 1 week, 30d / 1 month max) */}
          <div className="bg-base border border-border p-0.5 rounded-lg flex items-center">
            <button
              onClick={() => setTimeframeDays(1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                timeframeDays === 1 
                  ? 'bg-accent-blue text-white shadow-sm font-semibold' 
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" /> 24h
            </button>
            <button
              onClick={() => setTimeframeDays(7)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                timeframeDays === 7 
                  ? 'bg-accent-blue text-white shadow-sm font-semibold' 
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              1 Week
            </button>
            <button
              onClick={() => setTimeframeDays(30)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                timeframeDays === 30 
                  ? 'bg-accent-blue text-white shadow-sm font-semibold' 
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              1 Month Max
            </button>
          </div>

          <button 
            onClick={() => fetchNetwork(activeAccount, timeframeDays)}
            title="Refresh Network"
            className="p-2 border border-border rounded-lg bg-base text-text-secondary hover:text-white hover:border-accent-blue transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent-blue' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── QUICK PRESETS BAR ── */}
      <div className="bg-surface/60 border-b border-border/60 px-6 py-2 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[11px] text-text-muted font-medium whitespace-nowrap">Suggested Targets:</span>
          {PRESET_ACCOUNTS.map((preset) => {
            const isActive = activeAccount === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                  isActive 
                    ? 'bg-accent-blue/15 border-accent-blue text-accent-blue font-bold shadow-sm' 
                    : 'bg-base/80 border-border hover:border-text-secondary text-text-secondary hover:text-white'
                }`}
              >
                <span>{preset.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  preset.badge === 'CRITICAL' ? 'bg-rose-500' : preset.badge === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'
                }`} />
              </button>
            );
          })}
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-base p-0.5 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'graph' ? 'bg-surface text-white shadow-sm font-semibold' : 'text-text-muted hover:text-white'
            }`}
          >
            Flow Graph
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'table' ? 'bg-surface text-white shadow-sm font-semibold' : 'text-text-muted hover:text-white'
            }`}
          >
            Flow Breakdown
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'timeline' ? 'bg-surface text-white shadow-sm font-semibold' : 'text-text-muted hover:text-white'
            }`}
          >
            Ledger ({timeline.length})
          </button>
        </div>
      </div>

      {/* ── HIGHLIGHT METRIC TILES ── */}
      {summary && (
        <div className="bg-surface/30 border-b border-border px-6 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted block uppercase tracking-wider font-semibold">Money Came From</span>
              <div className="text-sm font-mono font-bold text-white flex items-center gap-1.5">
                {formatCurrency(summary.total_incoming_volume || 0)}
                <span className="text-[10px] text-text-muted font-normal">({sources.length} senders)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted block uppercase tracking-wider font-semibold">Money Went To</span>
              <div className="text-sm font-mono font-bold text-white flex items-center gap-1.5">
                {formatCurrency(summary.total_outgoing_volume || 0)}
                <span className="text-[10px] text-text-muted font-normal">({destinations.length} receivers)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              (summary.pass_through_rate || 0) >= 80
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted block uppercase tracking-wider font-semibold">Pass-Through Velocity</span>
              <div className="text-sm font-mono font-bold text-white flex items-center gap-1.5">
                <span className={summary.pass_through_rate >= 80 ? 'text-rose-400' : 'text-amber-400'}>
                  {(summary.pass_through_rate || 0).toFixed(1)}%
                </span>
                <span className="text-[10px] text-text-muted font-normal">
                  {summary.pass_through_rate >= 80 ? '(Mule Ring Pattern)' : '(Standard)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted block uppercase tracking-wider font-semibold">Timeframe Window</span>
              <div className="text-sm font-mono font-bold text-white flex items-center gap-1.5">
                <span>{summary.timeframe_label || 'Past 7 Days'}</span>
                <span className="text-[10px] text-text-muted font-normal">({summary.total_transactions_count || timeline.length} txns)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* TAB 1: GRAPH VIEW */}
        {activeTab === 'graph' && (
          <>
            {/* Graph Left/Right Side Inspector */}
            <div className="w-80 bg-surface border-r border-border flex flex-col z-10">
              {selectedNode ? (
                <div className="p-5 h-full overflow-y-auto space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-base text-text-secondary border border-border">
                        {selectedNode.data?.role === 'SOURCE' 
                          ? 'Fund Source' 
                          : selectedNode.data?.role === 'DESTINATION' 
                          ? 'Fund Destination' 
                          : 'Target Account'}
                      </span>
                      <h3 className="text-base font-bold text-white font-mono mt-2">{selectedNode.data?.account_id}</h3>
                      <p className="text-xs text-text-secondary">{selectedNode.data?.name || selectedNode.data?.masked_id}</p>
                    </div>
                    <RiskBadge level={selectedNode.data?.risk_level || 'LOW'} />
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="bg-base rounded-lg p-3 border border-border">
                      <p className="text-[10px] text-text-muted mb-0.5">Volume Handled in Window</p>
                      <p className="text-base font-mono font-bold text-white">
                        {formatCurrency(
                          selectedNode.data?.volume || 
                          (selectedNode.data?.total_incoming || 0) + (selectedNode.data?.total_outgoing || 0)
                        )}
                      </p>
                    </div>

                    {selectedNode.data?.tx_count && (
                      <div className="bg-base rounded-lg p-3 border border-border">
                        <p className="text-[10px] text-text-muted mb-0.5">Direct Transaction Count</p>
                        <p className="text-sm font-mono font-bold text-white">
                          {selectedNode.data?.tx_count} Transfer{selectedNode.data?.tx_count > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {selectedNode.data?.risk_score !== undefined && (
                      <div className="bg-base rounded-lg p-3 border border-border">
                        <p className="text-[10px] text-text-muted mb-0.5">Risk Score</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono font-bold text-white">{selectedNode.data?.risk_score} / 100</span>
                          <span className="text-xs text-text-muted">
                            {selectedNode.data?.risk_score >= 60 ? 'High Mule Suspect' : 'Normal'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border space-y-2">
                    {!selectedNode.data?.is_center && (
                      <button
                        onClick={() => {
                          const newId = selectedNode.data?.account_id;
                          if (newId) {
                            setSearchInput(newId);
                            setActiveAccount(newId);
                          }
                        }}
                        className="w-full py-2 bg-accent-blue/15 hover:bg-accent-blue/25 border border-accent-blue/30 text-accent-blue text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" /> Re-Center Graph on this Node
                      </button>
                    )}

                    <Link 
                      to={`/accounts/${selectedNode.data?.account_id}`}
                      className="w-full py-2 bg-base border border-border hover:border-accent-blue hover:text-accent-blue text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Full Account Profile
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-5 h-full flex flex-col items-center justify-center text-center text-text-muted">
                  <Activity className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">Click any card on the graph to inspect flow details.</p>
                </div>
              )}
            </div>

            {/* ReactFlow Canvas */}
            <div className="flex-1 relative bg-base">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-right"
              >
                <Background color="#1e293b" gap={20} size={1} />
                <Controls className="bg-surface border-border fill-white" />
              </ReactFlow>

              {/* Visual Flow Guide Legend */}
              <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-sm border border-border rounded-lg p-2.5 text-[11px] text-text-secondary flex items-center gap-4 pointer-events-none shadow-lg">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>Inflow Sources (Left)</span>
                </div>
                <ArrowRight className="w-3 h-3 text-text-muted" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-blue"></span>
                  <span>Target Node (Center)</span>
                </div>
                <ArrowRight className="w-3 h-3 text-text-muted" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span>Drained Outflows (Right)</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: STRUCTURED BREAKDOWN (WHERE MONEY CAME FROM VS WHERE IT WENT) */}
        {activeTab === 'table' && (
          <div className="flex-1 p-6 overflow-y-auto bg-base space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Box: Money Received (Sources) */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Money Came From (Inflow)</h3>
                      <p className="text-[11px] text-text-muted">Originating senders in {summary?.timeframe_label || 'selected window'}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {formatCurrency(summary?.total_incoming_volume || 0)}
                  </span>
                </div>

                {sources.length === 0 ? (
                  <div className="text-center py-8 text-xs text-text-muted">
                    No incoming transfers found for this timeframe.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sources.map((src) => (
                      <div key={src.account_id} 
                           className="bg-base border border-border/80 rounded-lg p-3 flex items-center justify-between hover:border-emerald-500/50 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">{src.account_id}</span>
                            <RiskBadge level={src.risk_level} />
                          </div>
                          <p className="text-[11px] text-text-secondary truncate max-w-xs">{src.name || src.masked_id}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-mono font-bold text-emerald-400 text-xs">{formatCurrency(src.total_amount)}</div>
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-text-muted">{src.tx_count} transfer{src.tx_count > 1 ? 's' : ''}</span>
                            <button
                              onClick={() => {
                                setSearchInput(src.account_id);
                                setActiveAccount(src.account_id);
                                setActiveTab('graph');
                              }}
                              className="text-[10px] text-accent-blue hover:underline cursor-pointer"
                            >
                              Trace
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Box: Money Sent (Destinations) */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Money Went To (Outflow)</h3>
                      <p className="text-[11px] text-text-muted">Destination beneficiaries in {summary?.timeframe_label || 'selected window'}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-rose-400 text-sm">
                    {formatCurrency(summary?.total_outgoing_volume || 0)}
                  </span>
                </div>

                {destinations.length === 0 ? (
                  <div className="text-center py-8 text-xs text-text-muted">
                    No outgoing transfers found for this timeframe.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {destinations.map((dest) => (
                      <div key={dest.account_id} 
                           className="bg-base border border-border/80 rounded-lg p-3 flex items-center justify-between hover:border-rose-500/50 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">{dest.account_id}</span>
                            <RiskBadge level={dest.risk_level} />
                          </div>
                          <p className="text-[11px] text-text-secondary truncate max-w-xs">{dest.name || dest.masked_id}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-mono font-bold text-rose-400 text-xs">{formatCurrency(dest.total_amount)}</div>
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-text-muted">{dest.tx_count} transfer{dest.tx_count > 1 ? 's' : ''}</span>
                            <button
                              onClick={() => {
                                setSearchInput(dest.account_id);
                                setActiveAccount(dest.account_id);
                                setActiveTab('graph');
                              }}
                              className="text-[10px] text-accent-blue hover:underline cursor-pointer"
                            >
                              Trace
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSACTION TIMELINE LEDGER */}
        {activeTab === 'timeline' && (
          <div className="flex-1 p-6 overflow-y-auto bg-base">
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-white">Chronological Fund Movement Ledger</h3>
                <span className="text-xs text-text-muted">Showing {timeline.length} transactions for {summary?.timeframe_label}</span>
              </div>

              {timeline.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted">
                  No fund movement records in this window.
                </div>
              ) : (
                <div className="space-y-2">
                  {timeline.map((tx) => {
                    const isIncoming = tx.direction === 'IN';
                    return (
                      <div key={tx.transaction_id}
                           className="bg-base border border-border/70 rounded-lg p-3 flex items-center justify-between hover:border-border transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isIncoming ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {isIncoming ? 'IN' : 'OUT'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-white">{tx.counterparty_account}</span>
                              <span className="text-[10px] text-text-muted font-mono">{tx.type}</span>
                            </div>
                            <p className="text-[11px] text-text-secondary">{tx.counterparty_name || tx.masked_counterparty}</p>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <div className={`font-mono font-bold text-xs ${isIncoming ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncoming ? '+' : '-'}{formatCurrency(tx.amount)}
                          </div>
                          <div className="text-[10px] text-text-muted" title={formatDate(tx.timestamp)}>
                            {timeAgo(tx.timestamp) || formatDate(tx.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
