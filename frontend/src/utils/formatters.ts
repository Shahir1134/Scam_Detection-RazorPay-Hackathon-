export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const maskAccountId = (id: string) => {
  if (!id) return '';
  if (id.length <= 4) return id;
  return 'XXXX' + id.slice(-4);
};

export const formatProbability = (p: number) => `${(p * 100).toFixed(1)}%`;

export const getRiskColor = (level: string) => ({
  'CRITICAL': 'text-red-400',
  'HIGH': 'text-orange-400', 
  'MEDIUM': 'text-yellow-400',
  'LOW': 'text-green-400',
}[level] || 'text-slate-400');

export const getRiskBg = (level: string) => ({
  'CRITICAL': 'bg-red-500/10 border-red-500/30 text-red-400',
  'HIGH': 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  'MEDIUM': 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  'LOW': 'bg-green-500/10 border-green-500/30 text-green-400',
}[level] || 'bg-slate-500/10 border-slate-500/30 text-slate-400');

export const timeAgo = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  }).format(new Date(dateStr));
};
