import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  const location = useLocation();
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard Overview';
    if (location.pathname.startsWith('/transactions')) return 'Transaction Intelligence';
    if (location.pathname.startsWith('/accounts')) return 'Account Profiles';
    if (location.pathname.startsWith('/networks')) return 'Fraud Network Analysis';
    if (location.pathname.startsWith('/cases')) return 'Case Management';
    return 'ScamDetect AI';
  };

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header title={getPageTitle()} />
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
