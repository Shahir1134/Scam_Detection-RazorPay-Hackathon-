import client from './client';
import { AnalyzeResponse, Transaction } from '../types';

export const analyzeTransaction = (data: any) => client.post<AnalyzeResponse>('/transactions/analyze', data);
export const getTransaction = (id: string) => client.get<Transaction>(`/transactions/${id}`);
export const listTransactions = (params?: any) => client.get<{ items: Transaction[], total: number }>('/transactions/', { params });
export const getTransactions = listTransactions;

