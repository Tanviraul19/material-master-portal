import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, CheckCircle2, AlertCircle, TrendingUp,
  ArrowRight, Loader2, Search, Download, Activity, FilePlus,
  ArrowUpRight, Zap, ListChecks, User, ChevronRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const statusBadge = (s) => {
  if (!s) return 'badge badge-default';
  if (s.includes('Pending')) return 'badge badge-pending';
  if (s === 'Approved') return 'badge badge-approved';
  if (s === 'Rejected') return 'badge badge-rejected';
  if (s.includes('Sent Back')) return 'badge badge-sentback';
  return 'badge badge-default';
};

const Skel = ({ w = 'w-full', h = 'h-4', r = 'rounded' }) => (
  <div className={`skeleton ${w} ${h} ${r}`} />
);

const STATS = [
  {
    key: 'total',
    label: 'Total Requests',
    icon: FileText,
    grad: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
    glow: 'rgba(37,99,235,.22)',
    light: '#eff6ff',
    textColor: '#1e40af',
  },
  {
    key: 'pending',
    label: 'In Workflow',
    icon: Clock,
    grad: 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
    glow: 'rgba(217,119,6,.22)',
    light: '#fffbeb',
    textColor: '#92400e',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle2,
    grad: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
    glow: 'rgba(5,150,105,.22)',
    light: '#ecfdf5',
    textColor: '#065f46',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: AlertCircle,
    grad: 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ef4444 100%)',
    glow: 'rgba(220,38,38,.22)',
    light: '#fef2f2',
    textColor: '#991b1b',
  },
];

const StatCard = ({ cfg, value, loading }) => {
  const { label, icon: Icon, grad, glow, light, textColor } = cfg;
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden cursor-default"
      style={{
        background: '#ffffff',
        border: '1px solid #e8edf5',
        boxShadow: hovered
          ? `0 12px 32px -4px ${glow}, 0 4px 12px rgba(0,0,0,.06)`
          : '0 1px 3px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.04)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all .22s cubic-bezier(.22,1,.36,1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: grad }}
      />

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: grad,
          boxShadow: `0 4px 14px ${glow}`,
        }}
      >
        <Icon size={18} className="text-white" />
      </div>

      {/* Value */}
      {loading ? (
        <Skel w="w-16" h="h-8" />
      ) : (
        <p
          className="text-[32px] font-black leading-none mb-1"
          style={{ color: '#0f172a', letterSpacing: '-0.04em' }}
        >
          {value}
        </p>
      )}

      {/* Label */}
      <p className="text-[11.5px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
        {label}
      </p>

      {/* Trend indicator */}
      {!loading && (
        <div className="flex items-center gap-1 mt-2.5">
          <div
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: light, color: textColor }}
          >
            <ArrowUpRight size={10} />
            Live
          </div>
        </div>
      )}

      {/* Subtle background decoration */}
      <div
        className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-[0.04]"
        style={{ background: grad }}
      />
    </div>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-[12px]"
      style={{
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,.1)',
        boxShadow: '0 8px 24px rgba(0,0,0,.4)',
      }}
    >
      <p className="text-slate-400 mb-0.5 text-[11px]">{label}</p>
      <p className="font-bold text-blue-400">{payload[0].value} requests</p>
    </div>
  );
};

const STAGE_COLOR = {
  'Plant Head':    { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Purchase Team': { bg: '#fefce8', text: '#854d0e', dot: '#eab308' },
  'GST Team':      { bg: '#f0fdf4', text: '#166534', dot: '#22c55e' },
  'Store Head':    { bg: '#fdf4ff', text: '#6b21a8', dot: '#a855f7' },
  'IT Team':       { bg: '#fff1f2', text: '#9f1239', dot: '#f43f5e' },
  'Department':    { bg: '#fff7ed', text: '#9a3412', dot: '#f97316' },
};

const PendingApprovalsWidget = ({ requests, loading }) => {
  const pending = (Array.isArray(requests) ? requests : [])
    .filter(r => r.status?.includes('Pending'))
    .slice(0, 5);

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #f8faff 100%)',
        border: '1px solid #e2e8f4',
        boxShadow: '0 1px 3px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.04)',
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center px-5 py-4"
        style={{ borderBottom: '1px solid #f1f5f9' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 3px 8px rgba(59,130,246,.35)' }}
          >
            <ListChecks size={13} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-[13px] leading-none" style={{ color: '#0f172a' }}>Pending Approvals</h2>
            <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>Awaiting action across stages</p>
          </div>
        </div>
        <Link
          to="/approvals"
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#1d4ed8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}
        >
          View all <ChevronRight size={11} />
        </Link>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="flex gap-3 items-center px-5 py-3.5">
              <Skel w="w-8 shrink-0" h="h-8" r="rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skel w="w-28" h="h-3" />
                <Skel w="w-40" h="h-2.5" />
              </div>
              <Skel w="w-16" h="h-5" r="rounded-full" />
            </div>
          ))
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-[12px] font-semibold" style={{ color: '#475569' }}>All caught up!</p>
            <p className="text-[11px]" style={{ color: '#94a3b8' }}>No pending approvals right now</p>
          </div>
        ) : (
          pending.map((req, i) => {
            const stageKey = req.current_stage?.replace('Pending ','') ?? '';
            const color = STAGE_COLOR[stageKey] || { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' };
            const initials = (req.current_approver_name || req.requester_name || '?')
              .split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
            return (
              <Link
                to="/approvals"
                key={req.id ?? i}
                className="flex gap-3 items-center px-5 py-3.5 group transition-all block"
                style={{ textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${color.dot}cc, ${color.dot})`,
                    boxShadow: `0 2px 8px ${color.dot}44`,
                  }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold font-mono" style={{ color: '#2563eb' }}>
                      {req.req_number}
                    </span>
                    {req.priority === 'High' && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                      >
                        High
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] truncate mt-0.5" style={{ color: '#475569' }}>
                    {req.description || req.material_name || '—'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <User size={8} style={{ color: '#94a3b8' }} />
                    <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                      {req.current_approver_name || req.requester_name || '—'}
                    </span>
                  </div>
                </div>

                {/* Stage badge */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: color.bg, color: color.text, border: `1px solid ${color.dot}33` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.dot }} />
                    {stageKey || req.current_stage || 'Pending'}
                  </span>
                  <span className="text-[10px]" style={{ color: '#cbd5e1' }}>
                    {req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''}
                  </span>
                </div>

                {/* Arrow on hover */}
                <ChevronRight
                  size={13}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#94a3b8' }}
                />
              </Link>
            );
          })
        )}
      </div>

      {/* Footer summary */}
      {!loading && pending.length > 0 && (
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid #f1f5f9', background: '#fafbff' }}
        >
          <span className="text-[11px]" style={{ color: '#94a3b8' }}>
            Showing {pending.length} of {(Array.isArray(requests)?requests:[]).filter(r=>r.status?.includes('Pending')).length} pending
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-medium" style={{ color: '#d97706' }}>Needs attention</span>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats]       = useState({ total: 0, pending: 0, approved: 0, rejected: 0, timeline: [], activity: [] });
  const [requests, setRequests] = useState([]);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, rRes, pRes] = await Promise.all([
          api.get('/stats'), 
          api.get('/requests'),
          api.get('/workflow/pending').catch(() => ({ data: [] }))
        ]);
        const s = sRes.data || {};
        setStats({
          total: s.total ?? 0, pending: s.pending ?? 0,
          approved: s.approved ?? 0, rejected: s.rejected ?? 0,
          timeline: Array.isArray(s.timeline) ? s.timeline : [],
          activity: Array.isArray(s.activity) ? s.activity : [],
        });
        const d = rRes.data;
        setRequests(Array.isArray(d) ? d : (d?.requests ?? []));
        const p = pRes?.data;
        setPendingQueue(Array.isArray(p) ? p : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const combinedRequests = [...(Array.isArray(requests) ? requests : [])];
  (Array.isArray(pendingQueue) ? pendingQueue : []).forEach(p => {
    if (!combinedRequests.some(r => r.id === p.id)) {
      combinedRequests.push(p);
    }
  });
  
  // Sort combined requests by date descending
  combinedRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filtered = combinedRequests.filter(r =>
    (r.req_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? r.material_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const chartData = (stats.timeline ?? []).map(i => ({
    name: i.date?.split('-').slice(1).join('/') ?? '', value: i.count ?? 0,
  }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'Request #': r.req_number, 'Description': r.description || r.material_name,
      'Type': r.material_type, 'Plant': r.plant, 'Status': r.status,
      'Date': new Date(r.created_at).toLocaleDateString(),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Requests');
    XLSX.writeFile(wb, `MaterialPortal_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isAdmin    = ['IT Team', 'Super Admin', 'Admin'].includes(user?.role);
  const isApprover = ['Plant Head','Store Head','Purchase Team','GST Team','Mechanical Team','Electrical Team'].includes(user?.role);

  return (
    <div className="space-y-6 page-enter">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isAdmin ? 'Admin Dashboard' : isApprover ? 'Approval Dashboard' : 'My Dashboard'}
          </h1>
          <p className="page-sub flex items-center gap-1.5">
            <Zap size={11} className="text-blue-500" />
            Live data · Updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Search requests..."
              className="input pl-9 w-52 text-[13px]"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={exportExcel} className="btn btn-secondary btn-sm">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {STATS.map(cfg => (
          <StatCard key={cfg.key} cfg={cfg} value={stats[cfg.key]} loading={loading} />
        ))}
      </div>

      {/* ── Chart + Activity ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Chart card */}
        <div
          className="xl:col-span-2 rounded-2xl p-6"
          style={{
            background: '#ffffff',
            border: '1px solid #e8edf5',
            boxShadow: '0 1px 3px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.04)',
          }}
        >
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2
                className="font-bold text-[14px] flex items-center gap-2"
                style={{ color: '#0f172a' }}
              >
                <TrendingUp size={15} className="text-blue-500" />
                Request Trends
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: '#94a3b8' }}>
                Daily inflow — last 7 days
              </p>
            </div>
            <div
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}
            >
              7 days
            </div>
          </div>

          {loading ? (
            <Skel h="h-48" />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false} tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }} dy={6}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="value"
                    stroke="#3b82f6" strokeWidth={2.5}
                    fill="url(#grad)" dot={false}
                    activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pending Approvals widget */}
        <PendingApprovalsWidget requests={pendingQueue} loading={loading} />
      </div>

      {/* ── Recent Requests + CTA ───────────────────────────────────────── */}
      <div className={`grid grid-cols-1 ${!isAdmin ? 'lg:grid-cols-3' : ''} gap-6`}>

        {/* Table */}
        <div
          className={`rounded-2xl overflow-hidden ${!isAdmin ? 'lg:col-span-2' : ''}`}
          style={{
            background: '#ffffff',
            border: '1px solid #e8edf5',
            boxShadow: '0 1px 3px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.04)',
          }}
        >
          <div
            className="flex justify-between items-center px-5 py-3.5"
            style={{ borderBottom: '1px solid #f1f5f9' }}
          >
            <h2 className="font-bold text-[14px]" style={{ color: '#0f172a' }}>Recent Requests</h2>
            <Link
              to="/approvals"
              className="text-[12px] font-semibold flex items-center gap-1 transition-colors"
              style={{ color: '#3b82f6' }}
              onMouseEnter={e => e.currentTarget.style.color = '#1d4ed8'}
              onMouseLeave={e => e.currentTarget.style.color = '#3b82f6'}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Description</th>
                  <th>Plant</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5].map(j => (
                        <td key={j}><Skel w="w-full max-w-[100px]" h="h-3.5" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.slice(0, 7).map(req => (
                  <tr key={req.id}>
                    <td>
                      <span
                        className="font-bold text-[12px] font-mono"
                        style={{ color: '#2563eb' }}
                      >
                        {req.req_number}
                      </span>
                    </td>
                    <td>
                      <p
                        className="font-medium text-[13px] truncate max-w-[160px]"
                        style={{ color: '#334155' }}
                      >
                        {(req.description || req.material_name) || '—'}
                      </p>
                      <p
                        className="text-[10px] uppercase font-medium mt-0.5"
                        style={{ color: '#94a3b8' }}
                      >
                        {req.material_type}
                      </p>
                    </td>
                    <td className="text-[13px]" style={{ color: '#64748b' }}>{req.plant}</td>
                    <td><span className={statusBadge(req.status)}>{req.status}</span></td>
                    <td className="text-[12px]" style={{ color: '#94a3b8' }}>
                      {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state py-10">
                        <div className="empty-icon"><FileText size={18} className="text-slate-400" /></div>
                        <p className="text-[13px]" style={{ color: '#94a3b8' }}>No requests found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA card */}
        {!isAdmin && (
          <div
            className="rounded-2xl p-6 flex flex-col justify-between overflow-hidden relative"
            style={{
              background: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 75%, #3b82f6 100%)',
              border: '1px solid rgba(255,255,255,.12)',
              boxShadow: '0 8px 32px rgba(37,99,235,.35)',
            }}
          >
            {/* Decorative orbs */}
            <div
              className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none"
              style={{ background: 'rgba(255,255,255,.06)' }}
            />
            <div
              className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full pointer-events-none"
              style={{ background: 'rgba(255,255,255,.04)' }}
            />

            <div className="relative z-10">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)' }}
              >
                <FilePlus size={19} className="text-white" />
              </div>
              <h3
                className="font-bold text-white text-[17px] mb-2 leading-tight"
                style={{ letterSpacing: '-0.02em' }}
              >
                Create New<br />Material Request
              </h3>
              <p className="text-[13px] mb-6 leading-relaxed" style={{ color: 'rgba(191,219,254,.8)' }}>
                Submit a new material master request for multi-stage enterprise approval.
              </p>
              <Link
                to="/request/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[13px] transition-all"
                style={{
                  background: 'rgba(255,255,255,.95)',
                  color: '#1d4ed8',
                  boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,.95)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.2)';
                }}
              >
                New Request <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
