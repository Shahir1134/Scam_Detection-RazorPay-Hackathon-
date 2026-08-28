import client from './client';
import { Account, Transaction, Incident } from '../types';

export interface AccountListItemData {
  account_id: string;
  masked_account_id: string;
  customer_id: string;
  customer_name: string;
  kyc_status: string;
  account_type: string;
  account_open_date?: string;
  account_age_days: number;
  status: string;
  balance: number;
  risk_score: number;
  risk_status: string;
  mule_score: number;
  incident_count: number;
  location_city?: string;
  location_state?: string;
}

export interface AccountListResponseData {
  items: AccountListItemData[];
  total: number;
  page: number;
  page_size: number;
}

export const getAccounts = (params?: {
  page?: number;
  page_size?: number;
  risk_status?: string;
  kyc_status?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}) => client.get<AccountListResponseData>('/accounts/', { params });

export const getAccount = (id: string) => client.get<Account>(`/accounts/${id}`);
export const getAccountTransactions = (id: string, params?: any) => client.get<{ items: Transaction[], total: number }>(`/accounts/${id}/transactions`, { params });
export const getAccountIncidents = (id: string) => client.get<Incident[]>(`/accounts/${id}/incidents`);
export const getAccountNetwork = (id: string, depth = 2, days = 7) => client.get<any>(`/accounts/${id}/network`, { params: { depth, days } });

