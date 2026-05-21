import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Shield, Bell, Lock, Eye, EyeOff, Loader2,
  CheckCircle2, Camera, Building2, BadgeCheck,
  Sun, Moon, Monitor, Palette, PanelLeft,
  Activity, Database, Server, GitBranch, RefreshCw,
  Workflow, Factory, ShoppingCart, Save, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ── Toggle Switch ─────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="relative shrink-0 transition-all"
    style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : '#e2e8f0',
      boxShadow: checked ? '0 2px 8px rgba(37,99,235,.35)' : 'none',
      border: 'none', cursor: 'pointer',
      transition: 'background .2s ease, box-shadow .2s ease',
    }}
  >
    <span
      style={{
        position: 'absolute', top: 3,
        left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.18)',
        transition: 'left .2s cubic-bezier(.22,1,.36,1)',
      }}
    />
  </button>
);

// ── Section Card ──────────────────────────────────────────────────────────────
const SectionCard = ({ icon: Icon, title, subtitle, accent = '#2563eb', children }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{
      background: '#fff',
      border: '1px solid #e8edf5',
      boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)',
    }}
  >
    <div
      className="flex items-center gap-3 px-6 py-4"
      style={{ borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f8fafd,#f1f5fb)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 3px 8px ${accent}44` }}
      >
        <Icon size={14} className="text-white" />
      </div>
      <div>
        <p className="text-[13.5px] font-bold text-slate-800 leading-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

// ── Row ───────────────────────────────────────────────────────────────────────
const SettingRow = ({ label, desc, children, last = false }) => (
  <div
    className="flex items-center justify-between gap-4 py-3.5"
    style={{ borderBottom: last ? 'none' : '1px solid #f8fafc' }}
  >
    <div className="min-w-0">
      <p className="text-[13px] font-semibold text-slate-700 leading-tight">{label}</p>
      {desc && <p className="text-[11.5px] text-slate-400 mt-0.5 leading-snug">{desc}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

// ── localStorage helpers ─────────────────────────────────────────────────────
const LS = {
  get: (k, fallback) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Settings = () => {
  const { user } = useAuth();
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme();

  const USER_KEY = user?.id || user?.email || 'default';

  const initials = (user?.full_name || user?.username || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const AVATAR_KEY = `mmr_avatar_${USER_KEY}`;
  const fileInputRef = useRef(null);
  const [avatarSrc, setAvatarSrc]         = useState(() => localStorage.getItem(AVATAR_KEY) || null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarError, setAvatarError]     = useState('');

  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarFile  = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png','image/jpeg','image/jpg','image/webp'].includes(file.type)) {
      setAvatarError('Only PNG, JPG, JPEG or WEBP allowed.');
      setTimeout(() => setAvatarError(''), 3000); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('File must be under 2 MB.');
      setTimeout(() => setAvatarError(''), 3000); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setAvatarSrc(url);
      localStorage.setItem(AVATAR_KEY, url);
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 2500);
    };
    reader.readAsDataURL(file);
  };

  // ── Profile ─────────────────────────────────────────────────────────────────
  const PROFILE_KEY = `mmr_profile_${USER_KEY}`;
  const [fullName, setFullName]         = useState(() => LS.get(PROFILE_KEY, user?.full_name || ''));
  const [email]                         = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [displayName, setDisplayName]   = useState(() => LS.get(PROFILE_KEY, user?.full_name || ''));

  const handleProfileSave = () => {
    setProfileError('');
    if (!fullName.trim()) { setProfileError('Full name cannot be empty.'); return; }
    if (fullName.trim().length < 2) { setProfileError('Name must be at least 2 characters.'); return; }
    setProfileLoading(true);
    setTimeout(() => {
      LS.set(PROFILE_KEY, fullName.trim());
      setDisplayName(fullName.trim());
      // Patch user object in localStorage so sidebar/topbar reflect change
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.full_name = fullName.trim();
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      } catch {}
      setProfileLoading(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }, 600);
  };

  // ── Security ─────────────────────────────────────────────────────────────────
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [pwError, setPwError]         = useState('');
  const [pwLoading, setPwLoading]     = useState(false);
  const [pwSaved, setPwSaved]         = useState(false);

  const pwStrength      = newPw.length === 0 ? null : newPw.length < 6 ? 'Weak' : newPw.length < 10 ? 'Fair' : 'Strong';
  const pwStrengthColor = { Weak: '#ef4444', Fair: '#f59e0b', Strong: '#22c55e' };
  const pwCanSubmit     = currentPw.length > 0 && newPw.length >= 8 && newPw === confirmPw;

  const handlePasswordSave = () => {
    setPwError('');
    if (!currentPw)          { setPwError('Enter your current password.'); return; }
    if (newPw.length < 8)    { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setPwLoading(true);
    setTimeout(() => {
      setPwLoading(false);
      setPwSaved(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSaved(false), 2500);
    }, 700);
  };

  // ── Notifications ────────────────────────────────────────────────────────────
  const NOTIF_KEY = `mmr_notifs_${USER_KEY}`;
  const [notifs, setNotifs] = useState(() => LS.get(NOTIF_KEY, {
    email_approval: true, email_rejection: true, email_sendback: false,
    email_digest: true, browser_push: false, workflow_update: true,
  }));

  const handleNotifChange = (key, val) => {
    const next = { ...notifs, [key]: val };
    setNotifs(next);
    LS.set(NOTIF_KEY, next);
  };

  // ── Appearance ───────────────────────────────────────────────────────────────
  const APPEAR_KEY = `mmr_appearance_${USER_KEY}`;
  const [themeMode, setThemeMode]      = useState(globalTheme);
  const [compactLayout, setCompact]    = useState(() => LS.get(APPEAR_KEY, {}).compact    ?? false);
  const [sidebarCollapsed, setSidebar] = useState(() => LS.get(APPEAR_KEY, {}).sidebar    ?? false);
  const [accentColor, setAccent]       = useState(() => LS.get(APPEAR_KEY, {}).accent     ?? '#2563eb');

  const saveAppearance = (patch) => {
    const current = LS.get(APPEAR_KEY, {});
    LS.set(APPEAR_KEY, { ...current, ...patch });
  };

  const handleThemeChange = (id) => {
    setThemeMode(id);
    setGlobalTheme(id);
    saveAppearance({ theme: id });
  };
  const handleCompact = (v) => { setCompact(v);  saveAppearance({ compact: v }); };
  const handleSidebar = (v) => { setSidebar(v);  saveAppearance({ sidebar: v }); };
  const handleAccent  = (hex) => {
    setAccent(hex);
    saveAppearance({ accent: hex });
    document.documentElement.style.setProperty('--blue-600', hex);
    document.documentElement.style.setProperty('--blue-700', hex);
  };

  // Apply persisted accent on mount
  useEffect(() => {
    const saved = LS.get(APPEAR_KEY, {}).accent;
    if (saved) {
      document.documentElement.style.setProperty('--blue-600', saved);
      document.documentElement.style.setProperty('--blue-700', saved);
    }
  }, []);

  const ACCENT_COLORS = [
    { hex: '#2563eb', label: 'Blue' },
    { hex: '#7c3aed', label: 'Violet' },
    { hex: '#0ea5e9', label: 'Sky' },
    { hex: '#059669', label: 'Emerald' },
    { hex: '#f59e0b', label: 'Amber' },
    { hex: '#ef4444', label: 'Red' },
    { hex: '#ec4899', label: 'Pink' },
    { hex: '#0f172a', label: 'Slate' },
  ];

  // ── Workflow prefs ───────────────────────────────────────────────────────────
  const WF_KEY = `mmr_workflow_${USER_KEY}`;
  const [defaultPlant, setDefaultPlant]       = useState(() => LS.get(WF_KEY, {}).plant    ?? '');
  const [defaultPG, setDefaultPG]             = useState(() => LS.get(WF_KEY, {}).pg       ?? '');
  const [autoSave, setAutoSave]               = useState(() => LS.get(WF_KEY, {}).autoSave ?? true);
  const [confirmApproval, setConfirmApproval] = useState(() => LS.get(WF_KEY, {}).confirm  ?? true);
  const [wfSaved, setWfSaved]                 = useState(false);
  const [wfLoading, setWfLoading]             = useState(false);

  const PLANTS = ['1000 – Main Plant', '1100 – Unit II', '1200 – Warehouse', '2000 – Corporate'];
  const PGS    = ['P01 – General', 'P02 – Mechanical', 'P03 – Electrical', 'P04 – Consumables', 'P05 – Packing'];

  const handleWfSave = () => {
    setWfLoading(true);
    setTimeout(() => {
      LS.set(WF_KEY, { plant: defaultPlant, pg: defaultPG, autoSave, confirm: confirmApproval });
      setWfLoading(false);
      setWfSaved(true);
      setTimeout(() => setWfSaved(false), 2500);
    }, 500);
  };

  // ── System info ──────────────────────────────────────────────────────────────
  const [syncing, setSyncing]   = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setLastSync(new Date()); }, 1800);
  };

  const SYS_INFO = [
    { label: 'ERP Version',    value: 'v2.4.1',            badge: { text: 'Latest', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' } },
    { label: 'Environment',    value: 'PRODUCTION',        badge: { text: 'PROD',   bg: '#fef2f2', color: '#991b1b', border: '#fecaca' } },
    { label: 'API Status',     value: 'Operational',       badge: { text: 'Online', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' } },
    { label: 'Database',       value: 'Connected',         badge: { text: 'Healthy',bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' } },
    { label: 'Auth Service',   value: 'JWT / TLS 1.3',     badge: { text: 'Secure', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' } },
    { label: 'Build',          value: 'React 18 · Vite 5', badge: null },
  ];

  // ── SelectField ──────────────────────────────────────────────────────────────
  const SelectField = ({ label, value, onChange, options, placeholder }) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <select
          className="w-full pl-3 pr-8 py-2.5 rounded-xl text-[13px] font-medium outline-none appearance-none transition-all"
          style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc', color: value ? '#0f172a' : '#94a3b8', cursor: 'pointer' }}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );

  const ROLE_STYLE = {
    'IT Team':        { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    'Plant Head':     { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    'Purchase Team':  { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
    'GST Team':       { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    'Store Head':     { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'User':           { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  };
  const rs = ROLE_STYLE[user?.role] || ROLE_STYLE['User'];

  return (
    <div className="space-y-6 page-enter max-w-3xl mx-auto pb-12">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your profile, security, and preferences</p>
      </div>

      {/* ── 1. Profile Card ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          border: '1px solid #e8edf5',
          boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)',
        }}
      >
        {/* Banner */}
        <div
          className="h-24 relative"
          style={{ background: 'linear-gradient(135deg, #0b1120 0%, #1a2540 50%, #1e3a8a 100%)' }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full" style={{ background: 'rgba(59,130,246,.1)' }} />
            <div className="absolute -bottom-4 left-12 w-24 h-24 rounded-full" style={{ background: 'rgba(99,102,241,.08)' }} />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-10 mb-5">
            <div className="relative group" style={{ cursor: 'pointer' }} onClick={handleAvatarClick}>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleAvatarFile}
              />
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-[22px] font-black border-4 border-white overflow-hidden"
                style={{
                  background: avatarSrc ? 'transparent' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                  boxShadow: '0 4px 20px rgba(59,130,246,.4)',
                  transition: 'box-shadow .2s ease',
                }}
              >
                {avatarSrc
                  ? <img src={avatarSrc} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials
                }
              </div>
              {/* Hover overlay */}
              <div
                className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
                style={{
                  background: 'rgba(0,0,0,.52)',
                  transition: 'opacity .18s ease',
                }}
              >
                <Camera size={16} className="text-white" />
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.85)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Change</span>
              </div>
              {/* Success ring */}
              {avatarSuccess && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: '#22c55e', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(34,197,94,.5)' }}
                >
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
              >
                <BadgeCheck size={11} /> {user?.role || 'User'}
              </span>
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
          </div>

          {/* Avatar error toast */}
          {avatarError && (
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold mb-4"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            >
              ⚠ {avatarError}
            </div>
          )}
          {avatarSuccess && (
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold mb-4"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}
            >
              <CheckCircle2 size={13} /> Profile photo updated successfully
            </div>
          )}

          {/* Name + email display */}
          <div className="mb-5">
            <p className="text-[18px] font-bold text-slate-900 leading-tight">{displayName || user?.username || '—'}</p>
            <p className="text-[13px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Mail size={12} /> {user?.email || '—'}
            </p>
            <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Building2 size={12} /> Enterprise Material Management System
            </p>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] font-medium outline-none transition-all"
                  style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="email"
                  readOnly
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] font-medium outline-none"
                  style={{ border: '1.5px solid #e2e8f0', background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }}
                  value={email}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed. Contact IT Team.</p>
            </div>
          </div>

          {profileError && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold mb-4"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              ⚠ {profileError}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleProfileSave}
              disabled={profileLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all"
              style={{
                background: profileLoading ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#4f46e5)',
                boxShadow: profileLoading ? 'none' : '0 4px 14px rgba(37,99,235,.35)',
                cursor: profileLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!profileLoading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,.5)'; }}
              onMouseLeave={e => { if (!profileLoading) e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,.35)'; }}
            >
              {profileLoading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : profileSaved ? <><CheckCircle2 size={14} /> Saved!</> : 'Save Profile'}
            </button>
            {profileSaved && (
              <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} /> Changes saved successfully
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Security ──────────────────────────────────────────────────── */}
      <SectionCard icon={Shield} title="Security" subtitle="Password and account protection" accent="#7c3aed">
        {pwError && (
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium mb-4"
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
          >
            ⚠ {pwError}
          </div>
        )}
        {pwSaved && (
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium mb-4"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}
          >
            <CheckCircle2 size={13} /> Password updated successfully
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Current password */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-[13px] font-medium outline-none transition-all"
                style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer p-0">
                {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-[13px] font-medium outline-none transition-all"
                style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer p-0">
                {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {newPw.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{
                      background: newPw.length >= i * 2 ? pwStrengthColor[pwStrength] : '#e2e8f0'
                    }} />
                  ))}
                </div>
                <p className="text-[10px] font-bold" style={{ color: pwStrengthColor[pwStrength] }}>{pwStrength}</p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="password"
                placeholder="Re-enter password"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] font-medium outline-none transition-all"
                style={{
                  border: `1.5px solid ${confirmPw && confirmPw !== newPw ? '#ef4444' : confirmPw && confirmPw === newPw ? '#22c55e' : '#e2e8f0'}`,
                  background: '#f8fafc',
                }}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)'; }}
                onBlur={e => { e.target.style.boxShadow = 'none'; }}
              />
            </div>
            {confirmPw && confirmPw === newPw && (
              <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1"><CheckCircle2 size={10} /> Match</p>
            )}
          </div>
        </div>

        {/* Security info row */}
        <div
          className="flex flex-wrap items-center gap-4 p-3.5 rounded-xl mb-5"
          style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}
        >
          {[
            { label: 'Last login', value: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
            { label: 'Session', value: 'Active · This device' },
            { label: '2FA', value: 'Not configured' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">{label}:</span>
              <span className="text-[11px] text-slate-600 font-semibold">{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handlePasswordSave}
          disabled={pwLoading || !pwCanSubmit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all"
          style={{
            background: pwLoading || !pwCanSubmit ? '#c4b5fd' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
            boxShadow: pwLoading || !pwCanSubmit ? 'none' : '0 4px 14px rgba(124,58,237,.35)',
            cursor: pwLoading || !pwCanSubmit ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (!pwLoading && pwCanSubmit) e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,.5)'; }}
          onMouseLeave={e => { if (!pwLoading && pwCanSubmit) e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,58,237,.35)'; }}
        >
          {pwLoading ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : <><Shield size={14} /> Update Password</>}
        </button>
      </SectionCard>

      {/* ── 3. Notifications ─────────────────────────────────────────────── */}
      <SectionCard icon={Bell} title="Notification Preferences" subtitle="Control how and when you receive alerts" accent="#0ea5e9">
        <div className="space-y-0">
          {[
            { key: 'email_approval',  label: 'Approval notifications',  desc: 'Email when your request is approved at any stage', last: false },
            { key: 'email_rejection', label: 'Rejection alerts',         desc: 'Email when a request is rejected', last: false },
            { key: 'email_sendback',  label: 'Send-back notifications',  desc: 'Email when a request is sent back for revision', last: false },
            { key: 'email_digest',    label: 'Daily digest',             desc: 'Summary of all workflow activity once per day', last: false },
            { key: 'browser_push',    label: 'Browser push notifications', desc: 'Real-time alerts in your browser', last: false },
            { key: 'workflow_update', label: 'Workflow stage updates',   desc: 'Notify on every stage transition in your requests', last: true },
          ].map(({ key, label, desc, last }) => (
            <SettingRow key={key} label={label} desc={desc} last={last}>
              <Toggle checked={notifs[key]} onChange={v => handleNotifChange(key, v)} />
            </SettingRow>
          ))}
        </div>

        <div
          className="mt-4 flex items-center justify-between p-3.5 rounded-xl"
          style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}
        >
          <p className="text-[12px] text-sky-700 font-medium">
            Notifications are delivered to <span className="font-bold">{user?.email || 'your registered email'}</span>
          </p>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: '#0ea5e9', color: '#fff' }}
          >
            {Object.values(notifs).filter(Boolean).length} active
          </span>
        </div>
      </SectionCard>

      {/* ── 4. Appearance & Theme ─────────────────────────────────────── */}
      <SectionCard icon={Palette} title="Appearance & Theme" subtitle="Personalise your interface experience" accent="#f59e0b">

        {/* Theme mode */}
        <div className="mb-5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Interface Mode</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light',  Icon: Sun,     label: 'Light' },
              { id: 'dark',   Icon: Moon,    label: 'Dark' },
              { id: 'system', Icon: Monitor, label: 'System' },
            ].map(({ id, Icon, label }) => {
              const active = themeMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleThemeChange(id)}
                  className="flex flex-col items-center gap-2 py-4 rounded-xl transition-all"
                  style={{
                    border: `2px solid ${active ? '#f59e0b' : '#e2e8f0'}`,
                    background: active ? '#fffbeb' : '#f8fafc',
                    boxShadow: active ? '0 0 0 3px rgba(245,158,11,.15)' : 'none',
                    cursor: 'pointer',
                    transition: 'all .18s ease',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#fcd34d'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <Icon size={18} style={{ color: active ? '#d97706' : '#94a3b8' }} />
                  <span className="text-[12px] font-bold" style={{ color: active ? '#92400e' : '#64748b' }}>{label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent color */}
        <div className="mb-5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Accent Color</p>
          <div className="flex flex-wrap gap-2.5">
            {ACCENT_COLORS.map(({ hex, label }) => (
              <button
                key={hex}
                type="button"
                title={label}
                onClick={() => handleAccent(hex)}
                className="relative transition-all"
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: hex,
                  border: `3px solid ${accentColor === hex ? hex : 'transparent'}`,
                  outline: accentColor === hex ? `3px solid ${hex}44` : 'none',
                  outlineOffset: 2,
                  boxShadow: accentColor === hex ? `0 0 0 2px #fff, 0 0 0 4px ${hex}` : `0 2px 6px ${hex}55`,
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                }}
              >
                {accentColor === hex && (
                  <CheckCircle2 size={12} className="absolute inset-0 m-auto text-white" />
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Selected: <span className="font-bold" style={{ color: accentColor }}>{ACCENT_COLORS.find(c => c.hex === accentColor)?.label}</span></p>
        </div>

        {/* Layout toggles */}
        <div className="space-y-0">
          <SettingRow label="Compact Layout" desc="Reduce spacing and padding for denser information display">
            <Toggle checked={compactLayout} onChange={handleCompact} />
          </SettingRow>
          <SettingRow label="Collapse Sidebar by Default" desc="Start with a minimised sidebar on every session" last>
            <Toggle checked={sidebarCollapsed} onChange={handleSidebar} />
          </SettingRow>
        </div>
      </SectionCard>

      {/* ── 5. Workflow Preferences ───────────────────────────────────────── */}
      <SectionCard icon={Workflow} title="Workflow Preferences" subtitle="Default values and submission behaviour" accent="#059669">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <SelectField
            label="Default Plant"
            value={defaultPlant}
            onChange={setDefaultPlant}
            options={PLANTS}
            placeholder="Select default plant…"
          />
          <SelectField
            label="Default Purchasing Group"
            value={defaultPG}
            onChange={setDefaultPG}
            options={PGS}
            placeholder="Select purchasing group…"
          />
        </div>

        <div className="space-y-0 mb-5">
          <SettingRow label="Auto-save Drafts" desc="Automatically save form progress every 30 seconds">
            <Toggle checked={autoSave} onChange={v => setAutoSave(v)} />
          </SettingRow>
          <SettingRow label="Confirm Before Approving" desc="Show a confirmation dialog before submitting approval actions" last>
            <Toggle checked={confirmApproval} onChange={v => setConfirmApproval(v)} />
          </SettingRow>
        </div>

        <div
          className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl mb-5"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <Factory size={13} className="text-emerald-600 shrink-0" />
          <p className="text-[12px] text-emerald-700 font-medium flex-1">
            Default values pre-fill the material request form. You can override them per request.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleWfSave}
            disabled={wfLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all"
            style={{
              background: wfLoading ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#047857)',
              boxShadow: wfLoading ? 'none' : '0 4px 14px rgba(5,150,105,.35)',
              cursor: wfLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!wfLoading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(5,150,105,.5)'; }}
            onMouseLeave={e => { if (!wfLoading) e.currentTarget.style.boxShadow = '0 4px 14px rgba(5,150,105,.35)'; }}
          >
            {wfLoading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Preferences</>}
          </button>
          {wfSaved && (
            <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} /> Preferences saved
            </span>
          )}
        </div>
      </SectionCard>

      {/* ── 6. System Information ─────────────────────────────────────────── */}
      <SectionCard icon={Server} title="System Information" subtitle="Runtime environment and service health" accent="#0f172a">

        {/* Status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {SYS_INFO.map(({ label, value, badge }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all"
              style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{value}</p>
              </div>
              {badge && (
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                >
                  {badge.text}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Live indicators */}
        <div
          className="flex flex-wrap items-center gap-4 p-4 rounded-xl mb-5"
          style={{
            background: 'linear-gradient(135deg,#0b1120,#0f1a30)',
            border: '1px solid rgba(255,255,255,.08)',
          }}
        >
          {[
            { label: 'API',      ok: true },
            { label: 'Database', ok: true },
            { label: 'Auth',     ok: true },
            { label: 'Storage',  ok: true },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: ok ? '#22c55e' : '#ef4444',
                  boxShadow: ok ? '0 0 6px rgba(34,197,94,.7)' : '0 0 6px rgba(239,68,68,.7)',
                  animation: 'pulse 2s infinite',
                }}
              />
              <span className="text-[11px] font-semibold" style={{ color: ok ? '#86efac' : '#fca5a5' }}>{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,.3)' }}>
              Last sync: {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all"
          style={{
            background: syncing ? '#f1f5f9' : '#fff',
            border: '1.5px solid #e2e8f0',
            color: syncing ? '#94a3b8' : '#334155',
            boxShadow: syncing ? 'none' : '0 1px 4px rgba(0,0,0,.06)',
            cursor: syncing ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (!syncing) { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; } }}
          onMouseLeave={e => { if (!syncing) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.06)'; } }}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </SectionCard>

    </div>
  );
};

export default Settings;
