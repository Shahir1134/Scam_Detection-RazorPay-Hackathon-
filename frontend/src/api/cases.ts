import client from './client';
import { Case } from '../types';

export const createCase = (data: any) => client.post<Case>('/cases', data);
export const getCase = (id: string) => client.get<Case>(`/cases/${id}`);
export const addCaseAction = (id: string, data: any) => client.post<Case>(`/cases/${id}/actions`, data);
export const listCases = (params?: any) => client.get<{ items: Case[], total: number }>('/cases/', { params });
