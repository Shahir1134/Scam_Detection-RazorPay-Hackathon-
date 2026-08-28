export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CaseStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'ESCALATED' | 'CLOSED';
export type IncidentStatus = 'FLAGGED' | 'UNDER_INVESTIGATION' | 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE' | 'CLEARED' | 'VICTIM';

export interface RiskBreakdownComponent {
  name: string;
  key: string;
  score: number;
  max_score: number;
  summary: string;
  evidence: Record<string, any>;
  significance: string;
}

export interface InvestigatorExplanation {
  headline: string;
  summary: string;
  ml_signal_level: string;
  investigation_intel_level: string;
}

export interface Transaction {
  transaction_id: string;
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  transaction_type: string;
  timestamp: string;
  status: string;
  fraud_probability: number | null;
  risk_score: number | null;
  investigation_risk?: number | null;
  risk_level: RiskLevel | null;
  risk_factors: string[] | null;
  risk_breakdown?: RiskBreakdownComponent[];
  investigator_explanation?: InvestigatorExplanation;
  is_analyzed: boolean;
  sender_risk_score?: number;
  receiver_risk_score?: number;
}

export interface AnalyzeResponse {
  transaction_id: string;
  fraud_probability: number;
  risk_level: RiskLevel;
  risk_score: number;
  investigation_risk: number;
  risk_factors: string[];
  risk_breakdown: RiskBreakdownComponent[];
  investigator_explanation: InvestigatorExplanation;
  shap_explanation: ShapEntry[] | null;
  amount: number;
  transaction_type: string;
  sender_account: string;
  receiver_account: string;
  sender_account_id: string;
  receiver_account_id: string;
  timestamp: string;
  is_above_model_threshold: boolean;
  model_threshold?: number;
  behavioral_signals: Record<string, any>;
  risk_summary?: string;
}

export interface ShapEntry {
  feature: string;
  contribution: number;
  direction: 'increases_risk' | 'decreases_risk';
}

export interface Account {
  account_id: string;
  masked_account_id: string;
  customer_id: string;
  customer_name: string;
  kyc_status: string;
  account_type: string;
  account_open_date: string;
  status: string;
  balance: number;
  risk_score: number;
  risk_status: string;
  masked_phone: string;
  masked_address: string;
  location_city: string;
  location_state: string;
  behavioral_stats: BehavioralStats;
  mule_score: number;
  mule_signals: string[];
  incident_count: number;
}

export interface BehavioralStats {
  avg_transaction_amount: number;
  min_amount: number;
  max_amount: number;
  tx_count_5min: number;
  tx_count_1hr: number;
  tx_count_24hr: number;
  tx_count_30days: number;
  unique_senders: number;
  unique_receivers: number;
  total_incoming: number;
  total_outgoing: number;
  last_transaction_at: string | null;
}

export interface Incident {
  incident_id: string;
  account_id: string;
  transaction_id: string | null;
  incident_type: string;
  status: IncidentStatus;
  severity: string;
  description: string;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
}

export interface Case {
  case_id: string;
  transaction_id: string;
  primary_account_id: string;
  risk_score: number;
  status: CaseStatus;
  priority: RiskLevel;
  assigned_investigator: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
  audit_log: AuditEntry[];
}

export interface AuditEntry {
  action: string;
  investigator: string;
  timestamp: string;
  details: string;
}

export interface FundFlowSource {
  account_id: string;
  masked_id: string;
  name: string;
  customer_name?: string;
  account_type?: string;
  total_amount: number;
  tx_count: number;
  risk_score: number;
  risk_level: RiskLevel;
  last_timestamp: string;
  transaction_type: string;
}

export interface FundFlowDestination {
  account_id: string;
  masked_id: string;
  name: string;
  customer_name?: string;
  account_type?: string;
  total_amount: number;
  tx_count: number;
  risk_score: number;
  risk_level: RiskLevel;
  last_timestamp: string;
  transaction_type: string;
}

export interface FundFlowTimelineItem {
  transaction_id: string;
  direction: 'IN' | 'OUT';
  counterparty_account: string;
  counterparty_name?: string;
  masked_counterparty: string;
  amount: number;
  timestamp: string;
  risk_level: RiskLevel;
  type: string;
  status: string;
}

export interface NetworkSummary {
  center_account: string;
  center_name?: string;
  center_masked?: string;
  timeframe_days: number;
  timeframe_label: string;
  total_incoming_volume: number;
  total_outgoing_volume: number;
  net_retention: number;
  pass_through_rate: number;
  unique_senders_count: number;
  unique_receivers_count: number;
  total_transactions_count: number;
  high_risk_connections: number;
  total_accounts?: number;
  total_transactions?: number;
  high_risk_accounts?: number;
}

export interface NetworkGraphResponse {
  nodes: any[];
  edges: any[];
  sources: FundFlowSource[];
  destinations: FundFlowDestination[];
  timeline: FundFlowTimelineItem[];
  summary: NetworkSummary;
}


export interface DashboardStats {
  total_analyzed: number;
  high_risk_count: number;
  critical_alerts: number;
  open_cases: number;
  potential_mule_accounts: number;
  suspicious_networks: number;
  risk_distribution: Record<RiskLevel, number>;
  recent_alerts: Transaction[];
  alerts_over_time: { date: string; count: number; critical: number }[];
  priority_cases: Case[];
}
