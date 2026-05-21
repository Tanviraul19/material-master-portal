import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Loader2, ArrowRight, Shield, Zap, BarChart2, GitBranch, X, KeyRound, Eye, EyeOff, CheckCircle2, RefreshCw } from 'lucide-react';
import virajLogo from '../assets/viraj-logo.png';

const FEATURES = [
  { icon: GitBranch,    label:'7-Stage Workflow',    desc:'Automated multi-stage approval routing' },
  { icon: Zap,          label:'Duplicate Detection', desc:'Real-time check across 86k+ records' },
  { icon: BarChart2,    label:'Full Audit Trail',    desc:'Complete history and workflow analytics' },
  { icon: Shield,       label:'Role-Based Access',   desc:'Granular permissions per approver role' },
];

// ── Forgot Password Modal ────────────────────────────────────────────────────
const STEPS = ['Email', 'OTP', 'Reset', 'Done'];

// Mock API calls — swap these for real endpoints when backend is ready
const api_sendOTP    = (email)       => new Promise(r => setTimeout(() => r({ ok: true }), 1400));
const api_verifyOTP  = (email, otp)  => new Promise((r, j) => setTimeout(() => otp === '123456' ? r({ ok: true }) : j(new Error('Invalid OTP')), 1000));
const api_resetPass  = (email, pass) => new Promise(r => setTimeout(() => r({ ok: true }), 1200));

const OTPInput = ({ value, onChange }) => {
  const refs = Array.from({ length: 6 }, () => useRef(null));
  const digits = value.split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, i) + '' + value.slice(i + 1);
      onChange(next);
      if (i > 0) refs[i - 1].current?.focus();
      return;
    }
    if (!/^[0-9]$/.test(e.key)) return;
    const next = value.slice(0, i) + e.key + value.slice(i + 1);
    onChange(next.slice(0, 6));
    if (i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs[Math.min(pasted.length, 5)].current?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onChange={() => {}}
          style={{
            width: 44, height: 52, textAlign: 'center',
            fontSize: 22, fontWeight: 700, letterSpacing: 0,
            borderRadius: 12,
            border: `2px solid ${digits[i] ? '#3b82f6' : '#e2e8f0'}`,
            outline: 'none',
            background: digits[i] ? '#eff6ff' : '#f8fafc',
            color: '#0f172a',
            transition: 'border-color .15s, background .15s, box-shadow .15s',
            boxShadow: digits[i] ? '0 0 0 3px rgba(59,130,246,.12)' : 'none',
          }}
          onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.15)'; }}
          onBlur={e => { if (!digits[i]) { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; } }}
        />
      ))}
    </div>
  );
};

const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep]           = useState(0); // 0=email 1=otp 2=reset 3=done
  const [fpEmail, setFpEmail]     = useState('');
  const [otp, setOtp]             = useState('');
  const [newPass, setNewPass]     = useState('');
  const [confirmPass, setConfirm] = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [busy, setBusy]           = useState(false);
  const [err, setErr]             = useState('');
  const [resendTimer, setTimer]   = useState(0);
  const timerRef                  = useRef(null);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  // Close on Escape
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail);
  const passValid  = newPass.length >= 8;
  const matchValid = newPass === confirmPass && confirmPass.length > 0;

  const sendOTP = async () => {
    if (!emailValid) { setErr('Enter a valid email address.'); return; }
    setErr(''); setBusy(true);
    try {
      await api_sendOTP(fpEmail);
      setStep(1);
      setTimer(30);
    } catch { setErr('Failed to send OTP. Please try again.'); }
    finally { setBusy(false); }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) { setErr('Enter the 6-digit OTP.'); return; }
    setErr(''); setBusy(true);
    try {
      await api_verifyOTP(fpEmail, otp);
      setStep(2);
    } catch (e) { setErr(e.message || 'Incorrect OTP. Please try again.'); }
    finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if (!passValid)  { setErr('Password must be at least 8 characters.'); return; }
    if (!matchValid) { setErr('Passwords do not match.'); return; }
    setErr(''); setBusy(true);
    try {
      await api_resetPass(fpEmail, newPass);
      setStep(3);
    } catch { setErr('Reset failed. Please try again.'); }
    finally { setBusy(false); }
  };

  const resendOTP = async () => {
    if (resendTimer > 0) return;
    setBusy(true); setErr('');
    try { await api_sendOTP(fpEmail); setTimer(30); }
    catch { setErr('Failed to resend OTP.'); }
    finally { setBusy(false); }
  };

  const stepLabels = ['Email', 'Verify OTP', 'New Password', 'Done'];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,9,26,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f2',
          boxShadow: '0 32px 80px -12px rgba(0,0,0,.35), 0 8px 32px rgba(0,0,0,.12)',
          animation: 'fpIn .22s cubic-bezier(.22,1,.36,1)',
        }}
      >
        <style>{`@keyframes fpIn { from { opacity:0; transform:scale(.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f8faff,#f1f5fb)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 12px rgba(37,99,235,.35)' }}
            >
              <KeyRound size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-800 leading-tight">Reset Password</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{stepLabels[step]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Step progress */}
        {step < 3 && (
          <div className="px-6 pt-5">
            <div className="flex items-center gap-1">
              {[0,1,2].map(i => (
                <React.Fragment key={i}>
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 transition-all"
                    style={{
                      background: i < step ? '#22c55e' : i === step ? '#2563eb' : '#e2e8f0',
                      color: i <= step ? '#fff' : '#94a3b8',
                      boxShadow: i === step ? '0 0 0 3px rgba(37,99,235,.18)' : 'none',
                    }}
                  >
                    {i < step ? <CheckCircle2 size={12} /> : i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className="flex-1 h-0.5 rounded-full transition-all"
                      style={{ background: i < step ? '#22c55e' : '#e2e8f0' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {['Email', 'Verify OTP', 'New Password'].map((l, i) => (
                <span key={l} className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: i === step ? '#2563eb' : i < step ? '#22c55e' : '#cbd5e1' }}>{l}</span>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Error */}
          {err && (
            <div
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-[12.5px] font-medium"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            >
              <span className="shrink-0">⚠</span> {err}
            </div>
          )}

          {/* Step 0: Email */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-500 leading-relaxed">
                Enter your registered work email. We'll send a 6-digit verification code.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="email"
                    autoFocus
                    placeholder="name@enterprise.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13.5px] font-medium outline-none transition-all"
                    style={{
                      border: `1.5px solid ${fpEmail && !emailValid ? '#ef4444' : fpEmail && emailValid ? '#22c55e' : '#e2e8f0'}`,
                      boxShadow: fpEmail && emailValid ? '0 0 0 3px rgba(34,197,94,.1)' : fpEmail && !emailValid ? '0 0 0 3px rgba(239,68,68,.1)' : 'none',
                      background: '#f8fafc',
                    }}
                    value={fpEmail}
                    onChange={e => { setFpEmail(e.target.value); setErr(''); }}
                    onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  />
                </div>
                {fpEmail && !emailValid && <p className="text-[10px] text-red-500 font-bold mt-1">Enter a valid email address</p>}
              </div>
              <button
                onClick={sendOTP}
                disabled={busy || !emailValid}
                className="w-full py-2.5 rounded-xl font-bold text-[13.5px] text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: busy || !emailValid ? '#cbd5e1' : 'linear-gradient(135deg,#2563eb,#4f46e5)',
                  boxShadow: busy || !emailValid ? 'none' : '0 4px 14px rgba(37,99,235,.35)',
                  cursor: busy || !emailValid ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? <><Loader2 size={14} className="animate-spin" /> Sending OTP…</> : <>Send Verification Code <ArrowRight size={14} /></>}
              </button>
            </div>
          )}

          {/* Step 1: OTP */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-[13px] text-slate-500">OTP sent to</p>
                <p className="text-[13.5px] font-bold text-slate-800 mt-0.5">{fpEmail}</p>
                <p className="text-[11px] text-slate-400 mt-1">Check your inbox · Valid for 10 minutes</p>
              </div>
              <OTPInput value={otp} onChange={v => { setOtp(v); setErr(''); }} />
              <div className="text-center">
                <p className="text-[11px] text-slate-400">
                  Didn't receive it?{' '}
                  <button
                    onClick={resendOTP}
                    disabled={resendTimer > 0 || busy}
                    className="font-bold transition-colors bg-transparent border-none cursor-pointer p-0"
                    style={{ color: resendTimer > 0 ? '#94a3b8' : '#2563eb', cursor: resendTimer > 0 ? 'default' : 'pointer' }}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : <span className="flex items-center gap-1 inline-flex"><RefreshCw size={10} /> Resend OTP</span>}
                  </button>
                </p>
              </div>
              <button
                onClick={verifyOTP}
                disabled={busy || otp.length !== 6}
                className="w-full py-2.5 rounded-xl font-bold text-[13.5px] text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: busy || otp.length !== 6 ? '#cbd5e1' : 'linear-gradient(135deg,#2563eb,#4f46e5)',
                  boxShadow: busy || otp.length !== 6 ? 'none' : '0 4px 14px rgba(37,99,235,.35)',
                  cursor: busy || otp.length !== 6 ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : <>Verify OTP <ArrowRight size={14} /></>}
              </button>
              <p className="text-center text-[10px] text-slate-300">Hint: use <span className="font-bold text-slate-400">123456</span> for demo</p>
            </div>
          )}

          {/* Step 2: New Password */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-500">Create a strong new password for your account.</p>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoFocus
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-[13.5px] font-medium outline-none transition-all"
                    style={{
                      border: `1.5px solid ${newPass && !passValid ? '#ef4444' : newPass && passValid ? '#22c55e' : '#e2e8f0'}`,
                      boxShadow: newPass && passValid ? '0 0 0 3px rgba(34,197,94,.1)' : newPass && !passValid ? '0 0 0 3px rgba(239,68,68,.1)' : 'none',
                      background: '#f8fafc',
                    }}
                    value={newPass}
                    onChange={e => { setNewPass(e.target.value); setErr(''); }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer p-0">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {/* Strength bar */}
                {newPass.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{
                          background: newPass.length >= i * 2
                            ? newPass.length < 6 ? '#ef4444' : newPass.length < 10 ? '#f59e0b' : '#22c55e'
                            : '#e2e8f0'
                        }} />
                      ))}
                    </div>
                    <p className="text-[10px] font-semibold" style={{ color: newPass.length < 6 ? '#ef4444' : newPass.length < 10 ? '#f59e0b' : '#22c55e' }}>
                      {newPass.length < 6 ? 'Weak' : newPass.length < 10 ? 'Fair' : 'Strong'}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type={showConf ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-[13.5px] font-medium outline-none transition-all"
                    style={{
                      border: `1.5px solid ${confirmPass && !matchValid ? '#ef4444' : confirmPass && matchValid ? '#22c55e' : '#e2e8f0'}`,
                      boxShadow: confirmPass && matchValid ? '0 0 0 3px rgba(34,197,94,.1)' : confirmPass && !matchValid ? '0 0 0 3px rgba(239,68,68,.1)' : 'none',
                      background: '#f8fafc',
                    }}
                    value={confirmPass}
                    onChange={e => { setConfirm(e.target.value); setErr(''); }}
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer p-0">
                    {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {confirmPass && !matchValid && <p className="text-[10px] text-red-500 font-bold mt-1">Passwords do not match</p>}
                {confirmPass && matchValid && <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1"><CheckCircle2 size={10} /> Passwords match</p>}
              </div>
              <button
                onClick={resetPassword}
                disabled={busy || !passValid || !matchValid}
                className="w-full py-2.5 rounded-xl font-bold text-[13.5px] text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: busy || !passValid || !matchValid ? '#cbd5e1' : 'linear-gradient(135deg,#059669,#047857)',
                  boxShadow: busy || !passValid || !matchValid ? 'none' : '0 4px 14px rgba(5,150,105,.35)',
                  cursor: busy || !passValid || !matchValid ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? <><Loader2 size={14} className="animate-spin" /> Resetting…</> : <>Reset Password <ArrowRight size={14} /></>}
              </button>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', boxShadow: '0 8px 24px rgba(34,197,94,.25)' }}
              >
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-slate-800 tracking-tight">Password Reset!</p>
                <p className="text-[13px] text-slate-500 mt-1">Your password has been updated successfully.</p>
                <p className="text-[12px] text-slate-400 mt-0.5">You can now sign in with your new password.</p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl font-bold text-[13.5px] text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 14px rgba(37,99,235,.35)' }}
              >
                Back to Sign In <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && (
          <div
            className="px-6 py-3 flex items-center gap-1.5"
            style={{ borderTop: '1px solid #f1f5f9', background: '#fafbff' }}
          >
            <Shield size={11} className="text-slate-300" />
            <span className="text-[10px] text-slate-300">Secured with enterprise-grade encryption · TLS 1.3</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (err) { setError(err.response?.data?.message || 'Invalid credentials. Please try again.'); }
    finally { setLoading(false); }
  };

  const [fpOpen, setFpOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background:'#060c18' }}>
      {fpOpen && <ForgotPasswordModal onClose={() => setFpOpen(false)} />}

      {/* ── Left: Branding panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[48%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background:'linear-gradient(160deg, #060c18 0%, #0b1120 40%, #0f1a30 100%)' }}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute rounded-full blur-3xl"
            style={{ width:600, height:600, top:-200, right:-200, background:'radial-gradient(circle, rgba(37,99,235,.12) 0%, transparent 70%)' }}
          />
          <div
            className="absolute rounded-full blur-3xl"
            style={{ width:500, height:500, bottom:-200, left:-150, background:'radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)' }}
          />
          <div
            className="absolute rounded-full blur-2xl"
            style={{ width:300, height:300, top:'40%', left:'30%', background:'radial-gradient(circle, rgba(14,165,233,.05) 0%, transparent 70%)' }}
          />
          {/* Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center mb-16">
            <div
              className="group cursor-default"
              style={{ transition: 'transform .22s cubic-bezier(.22,1,.36,1)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img
                src={virajLogo}
                alt="Viraj"
                style={{
                  height: '52px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 16px rgba(251,146,60,.35))',
                }}
              />
            </div>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-[11px] font-semibold text-blue-400"
              style={{ background:'rgba(37,99,235,.12)', border:'1px solid rgba(37,99,235,.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Manufacturing ERP Platform
            </div>
            <h1
              className="text-[42px] font-black leading-[1.1] tracking-tight mb-5"
              style={{ color:'#f0f6ff' }}
            >
              Material Master<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage:'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #38bdf8 100%)' }}
              >
                Request & Approval
              </span>
            </h1>
            <p className="text-[#4b6080] text-[14px] leading-relaxed max-w-sm">
              Streamline material master creation with intelligent multi-stage workflow automation, real-time duplicate detection, and complete audit trails.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-xl p-3.5 transition-all"
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.06)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5"
                  style={{ background:'rgba(37,99,235,.15)' }}
                >
                  <Icon size={13} className="text-blue-400" />
                </div>
                <p className="text-slate-300 text-[12px] font-semibold leading-tight mb-0.5">{label}</p>
                <p className="text-[#3d5070] text-[11px] leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-[#2a3a52] text-[11px]">© 2024 Enterprise ERP Solutions</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#2a3a52] text-[11px]">All systems operational</span>
          </div>
        </div>
      </div>

      {/* ── Right: Login form ─────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ background:'#f0f2f7' }}
      >
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center mb-10 lg:hidden">
            <img
              src={virajLogo}
              alt="Viraj"
              style={{
                height: '36px',
                width: 'auto',
                objectFit: 'contain',
                filter: 'invert(58%) sepia(90%) saturate(600%) hue-rotate(360deg) brightness(105%)',
              }}
            />
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f2',
              boxShadow: '0 4px 24px -4px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)',
            }}
          >
            <div className="mb-7">
              <h2 className="text-[22px] font-bold text-slate-900 mb-1.5 tracking-tight">Sign in to your account</h2>
              <p className="text-slate-500 text-[13.5px]">Enter your enterprise credentials to continue</p>
            </div>

            {error && (
              <div
                className="mb-5 flex items-start gap-3 p-3.5 rounded-xl text-red-700 text-[13px] fade-in"
                style={{ background:'#fef2f2', border:'1px solid #fecaca' }}
              >
                <span className="shrink-0 mt-0.5 text-base">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="email"
                    className="input pl-10"
                    placeholder="name@enterprise.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide">
                    Password
                  </label>
                  <button type="button" onClick={() => setFpOpen(true)} className="text-[12px] text-blue-600 hover:text-blue-700 font-medium transition-colors bg-transparent border-none cursor-pointer p-0">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="password"
                    className="input pl-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full mt-2"
                style={{ boxShadow:'0 4px 16px rgba(37,99,235,.3)' }}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                  : <>Sign In <ArrowRight size={15} /></>}
              </button>
            </form>

            <div
              className="mt-6 pt-5 flex items-center justify-between text-[12px] text-slate-400"
              style={{ borderTop:'1px solid #f1f5f9' }}
            >
              <div className="flex items-center gap-1.5">
                <Shield size={12} className="text-slate-400" />
                <span>Secure enterprise login</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>System online</span>
              </div>
            </div>
          </div>

          {/* Bottom note */}
          <p className="text-center text-[12px] text-slate-400 mt-5">
            Protected by enterprise-grade security · TLS 1.3 encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
