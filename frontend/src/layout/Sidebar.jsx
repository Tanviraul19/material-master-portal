import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, ListTodo, CheckSquare,
  Settings, LogOut, Shield, FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import virajLogo from '../assets/viraj-logo.png';

const ROLE_STYLE = {
  'IT Team':        { pill: 'bg-violet-500/15 text-violet-300 border border-violet-500/20', dot: 'bg-violet-400' },
  'Plant Head':     { pill: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',       dot: 'bg-blue-400' },
  'Purchase Team':  { pill: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20',       dot: 'bg-cyan-400' },
  'GST Team':       { pill: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',    dot: 'bg-amber-400' },
  'Store Head':     { pill: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20', dot: 'bg-emerald-400' },
  'Mechanical Team':{ pill: 'bg-orange-500/15 text-orange-300 border border-orange-500/20', dot: 'bg-orange-400' },
  'Electrical Team':{ pill: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20', dot: 'bg-yellow-400' },
  'User':           { pill: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',    dot: 'bg-slate-400' },
};

const Sidebar = () => {
  const { logout, role, user } = useAuth();
  const rs = ROLE_STYLE[role] || ROLE_STYLE['User'];
  const initials = (user?.full_name || user?.username || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const navGroups = [
    {
      label: 'Main',
      items: [
        { name: 'Dashboard',   path: '/',            icon: LayoutDashboard, show: ['Super Admin', 'Admin'].includes(role) },
        { name: 'New Request', path: '/request/new', icon: FilePlus,        show: role === 'User' },
        { name: 'My Requests', path: '/requests/my', icon: ListTodo,        show: role === 'User' },
        { name: 'All Requests',path: '/approvals',   icon: CheckSquare,     show: role !== 'User' },
        { name: 'Pending Requests', path: '/approvals/pending', icon: ListTodo, show: role === 'IT Team' },
      ],
    },
    {
      label: 'Admin',
      items: [
        { name: 'User Management',     path: '/users',    icon: Shield,          show: ['IT Team', 'Super Admin', 'Admin'].includes(role) },
        { name: 'Import Descriptions', path: '/import',   icon: FileSpreadsheet, show: ['IT Team', 'Super Admin', 'Admin'].includes(role) },
      ],
    },
    {
      label: 'System',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings, show: ['IT Team', 'Super Admin', 'Admin'].includes(role) },
      ],
    },
  ];

  return (
    <aside
      className="flex flex-col fixed left-0 top-0 z-40 h-screen"
      style={{
        width: '220px',
        background: '#0a0e1f', // Solid dark blue as per reference
        borderRight: '1px solid rgba(255,255,255,.05)',
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className="px-4 pt-6 pb-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}
      >
        <div className="flex flex-col items-center gap-2">
          <img
            src={virajLogo}
            alt="Viraj"
            style={{
              width: '100%',
              maxWidth: '130px',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              filter: 'brightness(0) invert(1)', // Transform logo to white
            }}
          />
          <p
            className="text-[8px] font-black uppercase tracking-[0.2em] text-center w-full"
            style={{ color: 'rgba(255,255,255,.3)' }}
          >
            Material Master Portal
          </p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-1 px-3">
        {navGroups.map(group => {
          const visibleItems = group.items.filter(i => i.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-6">
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                {group.label}
              </p>
              <div className="space-y-1">
                {visibleItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `
                      group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-white text-[#0a0e1f] shadow-lg shadow-black/20' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} className={isActive ? 'text-[#0a0e1f]' : 'text-slate-500 group-hover:text-slate-300'} />
                        <span className="text-[13px] font-bold tracking-tight">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User Profile ─────────────────────────────────────────────────── */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-[12px] font-bold text-white shadow-inner">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white truncate uppercase tracking-tight">
              {user?.full_name || user?.username}
            </p>
            <p className="text-[10px] font-medium text-slate-500 truncate">{role}</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2 text-[11px] font-bold text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
