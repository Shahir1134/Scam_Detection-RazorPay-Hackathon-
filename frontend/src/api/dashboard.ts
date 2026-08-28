import client from './client';
import { DashboardStats } from '../types';

export const getDashboardStats = () => client.get<DashboardStats>('/dashboard/stats');
