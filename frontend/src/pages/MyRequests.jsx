import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Search, Clock, CheckCircle2, XCircle, User, RefreshCw,
  Edit3, Send, CornerUpLeft, AlertTriangle, Loader2, X,
  MessageSquare, ChevronDown, FileText
} from 'lucide-react';
import SearchableDropdown from '../components/SearchableDropdown';

const VALUATION_MAPPING = {
  'ZMIS':'Mechanical Spare','ZEIS':'Electrical Spare','ZCOM':'Consumable',
  'ZPAC':'Packaging','ZNVA':'Non-Valuated','ZNVM':'Non-Valuated Moving',
  'ZRET':'Returnable','ZPRT':'Production Tool',
};
const EDITABLE_STATUSES = ['Sent Back For Changes','Sent Back To User'];

const statusBadge = (s) => {
  if (!s) return 'badge badge-default';
  if (s.includes('Pending'))   return 'badge badge-pending';
  if (s === 'Approved')        return 'badge badge-approved';
  if (s.includes('Sent Back')) return 'badge badge-sentback';
  if (s === 'Rejected')        return 'badge badge-rejected';
  return 'badge badge-default';
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : null;

// ── Edit & Resubmit Modal ─────────────────────────────────────────────────────
const EditModal = ({ req, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    material_type:req.material_type||'', plant:req.plant||'',
    storage_location:req.storage_location||'', description:req.description||'',
    long_description:req.long_description||'', uom:req.uom||'',
    purchase_group:req.purchase_group||'', material_group:req.material_group||'',
    control_code:req.control_code||'',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [ccErr, setCcErr]           = useState('');
  const isITSendback = req.it_sendback_to_user===1 || req.status==='Sent Back To User';
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  const fetchUOM            = useCallback(async (q) => (await api.get(`/master/uom?q=${encodeURIComponent(q||'')}&limit=60`)).data,[]);
  const fetchPurchaseGroups = useCallback(async (q) => (await api.get(`/master/purchase-groups?q=${encodeURIComponent(q||'')}&limit=60`)).data,[]);
  const fetchMaterialGroups = useCallback(async (q) => (await api.get(`/master/material-groups?q=${encodeURIComponent(q||'')}&limit=60`)).data,[]);
  const fetchPlants         = useCallback(async (q) => (await api.get(`/master/plants?q=${encodeURIComponent(q||'')}`)).data,[]);
  const fetchStorageLocs    = useCallback(async (q) => (await api.get(`/master/storage-locations?plant=${encodeURIComponent(form.plant)}&q=${encodeURIComponent(q||'')}`)).data,[form.plant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim())     { setError('Short description is required.'); return; }
    if (form.description.length > 40) { setError('Max 40 characters for short description.'); return; }
    if (!form.uom)                    { setError('Base UOM is required.'); return; }
    if (!form.purchase_group)         { setError('Purchase Group is required.'); return; }
    setSubmitting(true); setError('');
    try { await api.put(`/requests/${req.id}/resubmit`, form); onSuccess(); }
    catch (err) { setError(err.response?.data?.error || 'Resubmit failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-panel max-w-2xl">
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-[15px]">Edit & Resubmit Request</h2>
            <p className="text-slate-400 text-[11px] mt-0.5 font-mono">{req.req_number}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Return reason */}
        <div className="mx-6 mt-5 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 border-b border-amber-200">
            <AlertTriangle size={13} className="text-amber-700 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              {isITSendback ? 'Returned by IT Team — Corrections Required' : 'Returned for Changes'}
            </span>
          </div>
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1.5">Returned By</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[12px] shrink-0">
                  {(req.sendback_by||req.assigned_approver||'?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{req.sendback_by||req.assigned_approver||'Approver'}</p>
                  <p className="text-[10px] text-amber-700 font-medium">{req.sendback_role||req.current_stage||'—'}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1.5 flex items-center gap-1">
                <MessageSquare size={9}/> Required Changes
              </p>
              <div className="bg-white border border-amber-200 rounded-lg px-3 py-2 min-h-[40px]">
                {req.sendback_reason?.trim()
                  ? <p className="text-[13px] text-slate-700 italic leading-relaxed">"{req.sendback_reason}"</p>
                  : <p className="text-[12px] text-slate-400 italic">No specific reason provided.</p>}
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
            <p className="text-[11px] text-amber-700">
              {isITSendback
                ? '✓ After resubmit, request returns directly to IT Team. Previous approvals preserved.'
                : '✓ After resubmit, request restarts from Plant Head for full re-approval.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Edit Fields Below</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Material Type *</label>
              <div className="relative">
                <select value={form.material_type} onChange={e => set('material_type',e.target.value)} className="input appearance-none pr-8">
                  <option value="">Select Type</option>
                  {Object.entries(VALUATION_MAPPING).map(([code,label]) => (
                    <option key={code} value={code}>{code} — {label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13}/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableDropdown label="Plant" required value={form.plant} onChange={c => { set('plant',c); set('storage_location',''); }} fetchOptions={fetchPlants} placeholder="Search plant..." />
            <SearchableDropdown label="Storage Location" required value={form.storage_location} onChange={c => set('storage_location',c)} fetchOptions={fetchStorageLocs} placeholder={form.plant?'Search storage...':'Select plant first'} disabled={!form.plant} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Short Description *</label>
              <span className={`text-[10px] font-medium ${form.description.length>40?'text-red-500':'text-slate-400'}`}>{form.description.length}/40</span>
            </div>
            <input type="text" maxLength={40} className="input" value={form.description} onChange={e => set('description',e.target.value)} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Long Description</label>
              <span className={`text-[10px] font-medium ${form.long_description.length>200?'text-red-500':'text-slate-400'}`}>{form.long_description.length}/200</span>
            </div>
            <textarea rows={3} maxLength={200} className="input resize-none" value={form.long_description} onChange={e => set('long_description',e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableDropdown label="Base UOM *" required value={form.uom} onChange={c => set('uom',c)} fetchOptions={fetchUOM} placeholder="Search UOM..." />
            <SearchableDropdown label="Purchasing Group *" required value={form.purchase_group} onChange={c => set('purchase_group',c)} fetchOptions={fetchPurchaseGroups} placeholder="Search group..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableDropdown label="Material Group" value={form.material_group} onChange={c => set('material_group',c)} fetchOptions={fetchMaterialGroups} placeholder="Search group..." />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Control Code (HSN)</label>
                <span className="text-[10px] font-bold tabular-nums"
                  style={{ color: ccErr ? '#ef4444' : form.control_code.length >= 4 ? '#16a34a' : '#94a3b8' }}>
                  {form.control_code.length}/8
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                className="input"
                placeholder="4–8 digits, e.g. 7210"
                style={{
                  borderColor: ccErr ? '#ef4444' : form.control_code.length >= 4 ? '#22c55e' : undefined,
                  boxShadow:   ccErr ? '0 0 0 3px rgba(239,68,68,.1)' : form.control_code.length >= 4 ? '0 0 0 3px rgba(34,197,94,.1)' : undefined,
                }}
                value={form.control_code}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                  set('control_code', v);
                  if (v.length > 0 && v.length < 4) setCcErr('Minimum 4 digits required');
                  else setCcErr('');
                }}
                onKeyDown={e => {
                  const ok = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'];
                  if (!ok.includes(e.key) && !/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
                  if (/^[0-9]$/.test(e.key) && form.control_code.length >= 8) e.preventDefault();
                }}
                onPaste={e => {
                  e.preventDefault();
                  const p = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 8);
                  set('control_code', p);
                  if (p.length > 0 && p.length < 4) setCcErr('Minimum 4 digits required');
                  else setCcErr('');
                }}
              />
              {ccErr && (
                <p className="text-[10px] text-red-500 font-bold mt-1">{ccErr}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px]">
              <AlertTriangle size={13}/> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? <><Loader2 size={14} className="animate-spin"/> Submitting…</> : <><Send size={14}/> Resubmit for Approval</>}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary px-5">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const MyRequests = () => {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [editing, setEditing]     = useState(null);
  const [successId, setSuccessId] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/requests'); const d=r.data; setRequests(Array.isArray(d)?d:(d?.requests??[])); }
    catch { /* silent */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleResubmitSuccess = () => {
    setSuccessId(editing?.id); setEditing(null); fetchRequests();
    setTimeout(() => setSuccessId(null), 4000);
  };

  const filtered = (Array.isArray(requests)?requests:[]).filter(r =>
    (r.description??r.material_name??'').toLowerCase().includes(search.toLowerCase()) ||
    (r.req_number??'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 page-enter">
      {editing && <EditModal req={editing} onClose={() => setEditing(null)} onSuccess={handleResubmitSuccess} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">My Requests</h1>
          <p className="page-sub">Track your submitted material master requests</p>
        </div>
        <button onClick={fetchRequests} className="btn btn-secondary btn-sm">
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {successId && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[13px] font-medium fade-in">
          <CheckCircle2 size={15} className="shrink-0"/> Request resubmitted successfully and forwarded to the next approver.
        </div>
      )}

      <div className="card-flat overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13}/>
            <input type="text" placeholder="Search by request # or material..." className="input pl-9 text-[13px]"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <p className="text-[12px] text-slate-400 ml-auto">{filtered.length} requests</p>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin"/>
            <p className="text-[13px]">Loading requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FileText size={18} className="text-slate-400"/></div>
            <p className="text-[14px] font-semibold text-slate-500 mt-1">No requests found</p>
            <p className="text-[12px] text-slate-400">Your submitted requests will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(req => {
              const isEditable    = EDITABLE_STATUSES.includes(req.status);
              const isResubmitted = successId === req.id;
              return (
                <div key={req.id} className={isEditable ? 'border-l-4 border-amber-400' : ''}>
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-blue-600 text-[12px] font-mono">{req.req_number}</span>
                        {isEditable && <span className="badge badge-sentback">Action Required</span>}
                      </div>
                      <p className="font-semibold text-slate-800 text-[13px] truncate max-w-[280px]">{req.description||req.material_name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {req.material_type} · {req.plant}{req.storage_location?` / ${req.storage_location}`:''}
                      </p>
                    </div>

                    <div className="text-center">
                      <span className={statusBadge(req.status)}>{req.status}</span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}
                      </p>
                    </div>

                    <div className="min-w-[120px]">
                      {isEditable ? (
                        <div className="flex items-start gap-1.5">
                          <CornerUpLeft size={12} className="text-amber-500 shrink-0 mt-0.5"/>
                          <div>
                            <p className="text-[12px] font-semibold text-amber-800">{req.sendback_by||req.assigned_approver||'Approver'}</p>
                            <p className="text-[10px] text-amber-600">{req.sendback_role||req.current_stage||'—'}</p>
                          </div>
                        </div>
                      ) : req.status==='Approved' ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-[12px] font-semibold"><CheckCircle2 size={12}/> Approved</span>
                      ) : req.status==='Rejected' ? (
                        <span className="flex items-center gap-1 text-red-500 text-[12px] font-semibold"><XCircle size={12}/> Rejected</span>
                      ) : req.assigned_approver ? (
                        <div>
                          <p className="text-[12px] font-semibold text-slate-700 flex items-center gap-1"><User size={10} className="text-blue-500"/> {req.assigned_approver}</p>
                          <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5"><Clock size={9} className="animate-pulse"/> {req.current_stage}</p>
                        </div>
                      ) : <span className="text-slate-300 text-[12px]">—</span>}
                    </div>

                    <div>
                      {isEditable ? (
                        <button onClick={() => setEditing(req)} className="btn btn-warning btn-sm">
                          <Edit3 size={12}/> Edit & Resubmit
                        </button>
                      ) : isResubmitted ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold"><CheckCircle2 size={11}/> Resubmitted</span>
                      ) : <span className="text-slate-200 text-[12px]">—</span>}
                    </div>
                  </div>

                  {isEditable && (req.sendback_by||req.sendback_reason) && (
                    <div className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 border-b border-amber-200">
                        <CornerUpLeft size={12} className="text-amber-700 shrink-0"/>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Request Returned — Action Required</span>
                        {req.sendback_at && <span className="ml-auto text-[10px] text-amber-600">{fmtDate(req.sendback_at)}</span>}
                      </div>
                      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">Returned By</p>
                          <p className="text-[13px] font-semibold text-slate-800">{req.sendback_by||req.assigned_approver||'Approver'}</p>
                          <p className="text-[11px] text-amber-700">{req.sendback_role||req.current_stage||'—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1 flex items-center gap-1"><MessageSquare size={9}/> Required Changes</p>
                          <div className="bg-white border border-amber-200 rounded-lg px-3 py-2">
                            {req.sendback_reason?.trim()
                              ? <p className="text-[12px] text-slate-700 italic">"{req.sendback_reason}"</p>
                              : <p className="text-[12px] text-slate-400 italic">No specific reason provided.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRequests;
