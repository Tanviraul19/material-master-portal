import React from 'react';
import { Bell, Search, Command, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import virajLogo from '../assets/viraj-logo.png';

const ROUTE_LABELS = {
  '/':            'Dashboard',
  '/request/new': 'New Request',
  '/requests/my': 'My Requests',
  '/approvals':   'All Requests',
  '/users':       'User Management',
  '/import':      'Import Descriptions',
  '/settings':    'Settings',
};

const Topbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const pageLabel = ROUTE_LABELS[location.pathname] || 'Portal';

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center"
      style={{
        left: '220px',
        height: '52px',
        padding: '0 24px',
        background: '#f8fafc', // Light gray background
        borderBottom: '1px solid #e2e8f0', // Subtle border
      }}
    >
      {/* Search removed — search is available on each page */}
      <div className="flex-1"></div>

      {/* Right actions */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Help */}
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <HelpCircle size={18} />
        </button>

        {/* Notifications */}
        <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border-2 border-slate-50 rounded-full"></span>
        </button>

        {/* Small Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-bold text-slate-700 leading-none">
              {user?.username || 'User'}
            </p>
            <p className="text-[10px] font-medium text-slate-400">
              {user?.role || 'Member'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden shadow-sm">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (user?.username?.[0] || 'U').toUpperCase()
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
