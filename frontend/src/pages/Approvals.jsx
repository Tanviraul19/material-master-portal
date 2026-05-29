import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, CornerUpLeft, Eye, Clock, AlertCircle,
  ChevronRight, User, Mail, Calendar, Info,
  ArrowRight, RefreshCw, Loader2, Download, Printer, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchableDropdown from '../components/SearchableDropdown';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

const statusBadge = (s) => {
  if (!s) return 'badge badge-default';
  if (s.includes('Pending'))   return 'badge badge-pending';
  if (s === 'Approved')        return 'badge badge-approved';
  if (s.includes('Sent Back')) return 'badge badge-sentback';
  if (s === 'Rejected')        return 'badge badge-rejected';
  return 'badge badge-default';
};

const PRIORITY_BADGE = {
  High:'badge badge-rejected', Medium:'badge badge-pending', Low:'badge badge-approved'
};

// ── Build workflow stages ─────────────────────────────────────────────────────
function buildStages(req, history) {
  const dept = req.department;
  const hasDept = ['Mechanical','Electrical'].includes(dept);
  const stageList = [
    { key:'Submitted',    label:'Submitted',       statusKey:null },
    { key:'Plant Head',   label:'Plant Head',      statusKey:'Pending Plant Head' },
    ...(hasDept ? [{ key:'Department', label:dept==='Mechanical'?'Mechanical Team (Deepak Sir)':'Electrical Team (Pradeep Sir)', statusKey:'Pending Department' }] : []),
    { key:'Purchase Team',label:'Purchase Team',   statusKey:'Pending Purchase' },
    { key:'GST Team',     label:'GST Team',        statusKey:'Pending GST' },
    { key:'Store Head',   label:'Store Head',      statusKey:'Pending Store Head' },
    { key:'IT Team',      label:'IT Team (Final)', statusKey:'Pending IT Final Approval' },
  ];
  const currentStatus = req.status;
  return stageList.map(s => {
    const histEntry = history.find(h =>
      h.stage===s.key || (s.key==='Department'&&h.stage==='Department') || (s.key==='Submitted'&&h.action==='SUBMIT')
    );
    let state = 'pending';
    if (s.key==='Submitted') state='done';
    else if (currentStatus==='Approved') state='done';
    else if (currentStatus==='Rejected') state=histEntry?'done':'pending';
    else if (s.statusKey===currentStatus) state='active';
    else if (histEntry) state='done';
    return { ...s, state, actor:histEntry?.approver_name||null, time:histEntry?.created_at||(s.key==='Submitted'?req.created_at:null), comments:histEntry?.comments||null, action:histEntry?.action||null };
  });
}

// ── Timeline ──────────────────────────────────────────────────────────────────
const Timeline = ({ stages }) => (
  <div className="flex items-start justify-between w-full px-2 py-3 bg-white border border-slate-100 rounded-lg shadow-sm mb-2 overflow-x-auto no-scrollbar">
    {stages.map((s, i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center min-w-[80px] text-center relative px-2">
          {/* Connector Line (Back) */}
          {i > 0 && (
            <div className={`absolute left-[-50%] top-3 w-full h-[2px] -z-0 ${
              s.state === 'done' || s.state === 'active' ? 'bg-emerald-400' : 'bg-slate-100'
            }`} />
          )}
          
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 z-10 shadow-sm mb-1 ${
            s.state==='done'  ?'bg-emerald-500 border-emerald-500 text-white':
            s.state==='active'?'bg-white border-amber-400 ring-2 ring-amber-100':
                               'bg-slate-50 border-slate-200'
          }`}>
            {s.state==='done'  ?<CheckCircle2 size={12}/>:
             s.state==='active'?<Clock size={12} className="text-amber-500 animate-pulse"/>:
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"/>}
          </div>
          
          <div className="z-10 bg-white/80 rounded px-1">
            <p className={`text-[8.5px] font-black uppercase tracking-tighter leading-none whitespace-nowrap ${
              s.state==='done'?'text-emerald-700':s.state==='active'?'text-amber-700':'text-slate-400'
            }`}>{s.label}</p>
            {s.actor && (
               <p className="text-[7px] font-bold text-slate-400 mt-0.5 truncate max-w-[70px] leading-none">{s.actor.split(' ')[0]}</p>
            )}
          </div>
        </div>
      </React.Fragment>
    ))}
  </div>
);

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({ req, onClose, onActionDone, userRole }) => {
  const [comments, setComments] = useState('');
  const [editData, setEditData] = useState({
    material_type:req.material_type||'', description:req.description||'',
    control_code:req.control_code||'', material_group:req.material_group||'',
    long_description:req.long_description||'', plant:req.plant||'',
    storage_location:req.storage_location||'', purchase_group:req.purchase_group||'',
    uom: req.uom || ''
  });
  const [history, setHistory]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  // ── Fetch functions for dropdowns ─────────────────────────────────────────
  const fetchMaterialGroups = useCallback(async (q) => {
    const res = await api.get(`/master/material-groups?q=${encodeURIComponent(q || '')}&limit=60`);
    return res.data;
  }, []);

  const fetchUOM = useCallback(async (q) => {
    const res = await api.get(`/master/uom?q=${encodeURIComponent(q || '')}&limit=60`);
    return res.data;
  }, []);

  const fetchPurchaseGroups = useCallback(async (q) => {
    const res = await api.get(`/master/purchase-groups?q=${encodeURIComponent(q || '')}&limit=60`);
    return res.data;
  }, []);

  const fetchPlants = useCallback(async (q) => {
    const res = await api.get(`/master/plants?q=${encodeURIComponent(q || '')}`);
    return res.data;
  }, []);

  const fetchStorageLocations = useCallback(async (q) => {
    const res = await api.get(`/master/storage-locations?plant=${encodeURIComponent(editData.plant)}&q=${encodeURIComponent(q || '')}`);
    return res.data;
  }, [editData.plant]);

  // ── Control Code validation ──────────────────────────────────────────────
  const [ccError, setCcError] = useState('');

  const handleCCChange = (val) => {
    const numeric = val.replace(/[^0-9]/g, '').slice(0, 8);
    setEditData(prev => ({ ...prev, control_code: numeric }));
    if (numeric.length > 0 && numeric.length < 4) setCcError('Minimum 4 digits required');
    else if (numeric.length > 8) setCcError('Maximum 8 digits allowed');
    else setCcError('');
  };

  const handleCCKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'];
    if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
    if (/^[0-9]$/.test(e.key) && editData.control_code.length >= 8) e.preventDefault();
  };

  const handleCCPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 8);
    setEditData(prev => ({ ...prev, control_code: pasted }));
    if (pasted.length > 0 && pasted.length < 4) setCcError('Minimum 4 digits required');
    else setCcError('');
  };

  const ccValid = editData.control_code === '' || (editData.control_code.length >= 4 && editData.control_code.length <= 8);

  const isPurchase     = userRole==='Purchase Team';
  const isStoreHead    = userRole==='Store Head';
  const canEdit        = userRole==='GST Team'||isStoreHead||userRole==='IT Team'||isPurchase;
  const canEditHSN     = userRole==='GST Team'||userRole==='IT Team';
  const canEditGrp     = userRole==='GST Team'||isStoreHead||userRole==='IT Team';
  const canEditMatType = userRole==='GST Team'||isStoreHead||userRole==='IT Team';
  const canEditPurchGrp= isPurchase||isStoreHead||userRole==='IT Team';
  const canEditUOM     = isStoreHead||userRole==='IT Team';
  const canSendBack    = userRole!=='GST Team';
  const isGST          = userRole==='GST Team';
  const isIT           = userRole==='IT Team';

  // Track which fields IT Team has modified for badge + highlight
  const editedFields = (isIT || isGST) ? Object.keys(editData).filter(k => {
    if (k === 'material_type') return editData.material_type !== (req.material_type||'');
    if (k === 'description')   return editData.description   !== (req.description||'');
    if (k === 'long_description') return editData.long_description !== (req.long_description||'');
    if (k === 'material_group')   return editData.material_group   !== (req.material_group||'');
    if (k === 'plant')             return editData.plant             !== (req.plant||'');
    if (k === 'storage_location')  return editData.storage_location  !== (req.storage_location||'');
    if (k === 'purchase_group')    return editData.purchase_group    !== (req.purchase_group||'');
    if (k === 'control_code')      return editData.control_code      !== (req.control_code||'');
    if (k === 'uom')               return editData.uom               !== (req.uom||'');
    return false;
  }) : [];
  const hasEdits = editedFields.length > 0;

  const setField = (name, value) => {
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const editStyle = (field) => (isIT || isGST) && editedFields.includes(field)
    ? { borderColor: '#f59e0b', background: '#fffbeb', boxShadow: '0 0 0 3px rgba(245,158,11,.15)' }
    : {};

  useEffect(() => {
    api.get(`/workflow/${req.id}/history`)
      .then(r => setHistory(Array.isArray(r.data)?r.data:[]))
      .catch(() => setHistory([]));
  }, [req.id]);

  const stages = buildStages(req, history);

  const handleAction = async (action) => {
    setSubmitting(true);
    try {
      await api.post(`/workflow/${req.id}/approve`, { action, comments, editData: canEdit ? editData : null });
      setActionResult(action);
      setTimeout(() => { onActionDone(); }, 1200);
    } catch (err) { alert(err.response?.data?.error||'Action failed'); }
    finally { setSubmitting(false); }
  };

  if (actionResult) {
    const isApprove = actionResult==='APPROVE';
    return (
      <div className="card flex flex-col items-center justify-center py-20 gap-4">
        {isApprove ? <CheckCircle2 size={44} className="text-emerald-500"/> : <CornerUpLeft size={44} className="text-amber-500"/>}
        <p className="font-bold text-[17px] text-slate-800">{isApprove?'Approved!':'Sent Back!'}</p>
        <p className="text-slate-400 text-[13px]">Refreshing queue…</p>
      </div>
    );
  }

  // ── GST Team: focused view ───────────────────────────────────────────────────
  if (isGST) {
    const approveDisabled = submitting || !!ccError || (editData.control_code.length > 0 && editData.control_code.length < 4);
    return (
      <div className="max-w-xl mx-auto space-y-3 page-enter">
        <div className="card p-4 border-slate-200 shadow-sm bg-white">
          <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-100">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block"/> Tax Review Mode
              </span>
              <h2 className="text-[14px] font-black text-slate-900 font-mono tracking-tight uppercase">{req.req_number}</h2>
            </div>
            <button onClick={onClose} className="p-1 px-3 py-1 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-[10px] font-black uppercase transition-all">✕ Close</button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Short Description</label>
                <span className="text-[9px] font-bold text-slate-300">{editData.description.length}/40</span>
              </div>
              <input type="text" maxLength={40} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-black outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-inner" 
                value={editData.description}
                onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Control Code (HSN/SAC)
                </label>
                <span className="text-[9px] font-black tabular-nums" style={{ color: ccError ? '#ef4444' : editData.control_code.length >= 4 ? '#16a34a' : '#94a3b8' }}>
                  {editData.control_code.length}/8 Digits
                </span>
              </div>
              <div className="relative">
                <input
                  type="text" inputMode="numeric" maxLength={8} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[15px] font-black text-center outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
                  placeholder="e.g., 7210"
                  style={{ borderColor: ccError ? '#ef4444' : editData.control_code.length >= 4 ? '#22c55e' : undefined }}
                  value={editData.control_code}
                  onChange={e => handleCCChange(e.target.value)}
                  onKeyDown={handleCCKeyDown}
                  onPaste={handleCCPaste}
                />
              </div>
              {ccError && <p className="text-[9px] text-red-500 font-black mt-2 uppercase flex items-center gap-1"><AlertCircle size={10}/> {ccError}</p>}
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleAction('APPROVE')}
                disabled={approveDisabled}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[12px] text-white uppercase tracking-widest transition-all shadow-lg ${approveDisabled ? 'bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-200'}`}
              >
                {submitting ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} 
                {submitting ? 'Processing...' : 'Approve for SAP'}
              </button>
              {approveDisabled && !submitting && editData.control_code.length > 0 && editData.control_code.length < 4 && (
                <p className="text-[10px] text-red-500 font-black text-center mt-3 uppercase tracking-tighter">Validation Failed: 8-digit HSN required for compliance</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-2">
      {/* Top: Horizontal Timeline */}
      <Timeline stages={stages} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left: details (8 columns) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden">
          <div className="card-flat p-3 border-slate-200 shadow-sm bg-white flex flex-col h-full">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <h2 className="text-[15px] font-black text-slate-900 font-mono tracking-tighter uppercase">{req.req_number}</h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                  {req.status}
                </span>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter border-l border-slate-200 pl-4">
                  {req.material_type} • {req.department || 'GENERAL'} • {req.requester_name || 'System'}
                </p>
              </div>
              <button onClick={onClose} className="p-1 px-3 py-1 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-[10px] font-black uppercase transition-all hover:bg-slate-100">✕ Close</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-4 pt-1">
              {/* Info grid - Editable for IT Team, Read-only for others */}
              {isIT ? (
                <div className="grid grid-cols-4 gap-2">
                  <SearchableDropdown
                    label="Plant"
                    compact
                    value={editData.plant}
                    onChange={(val) => { setField('plant', val); setField('storage_location', ''); }}
                    fetchOptions={fetchPlants}
                    className="col-span-1"
                    style={editStyle('plant')}
                  />
                  <SearchableDropdown
                    label="S-Loc"
                    compact
                    value={editData.storage_location}
                    onChange={(val) => setField('storage_location', val)}
                    fetchOptions={fetchStorageLocations}
                    disabled={!editData.plant}
                    className="col-span-1"
                    style={editStyle('storage_location')}
                  />
                  <SearchableDropdown
                    label="UOM"
                    compact
                    value={editData.uom}
                    onChange={(val) => setField('uom', val)}
                    fetchOptions={fetchUOM}
                    className="col-span-1"
                    style={editStyle('uom')}
                  />
                  <SearchableDropdown
                    label="Purch. Grp"
                    compact
                    value={editData.purchase_group}
                    onChange={(val) => setField('purchase_group', val)}
                    disabled={!canEditPurchGrp}
                    fetchOptions={fetchPurchaseGroups}
                    className="col-span-1"
                    style={editStyle('purchase_group')}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label:'Plant',            value:req.plant },
                    { label:'S-Loc',            value:req.storage_location },
                    { label:'UOM',              value:req.uom },
                    { label:'Purch. Grp',       value:req.purchase_group },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg p-2 transition-colors hover:bg-slate-100/50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-[12px] font-bold text-slate-700 truncate">{value||'—'}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Short Description (Orig)</p>
                  <p className="text-[12px] font-bold text-slate-800 truncate">{req.description || '—'}</p>
                </div>
                <div className="col-span-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Long Description (Orig)</p>
                  <p className="text-[11px] font-medium text-slate-600 leading-tight line-clamp-2">{req.long_description||'—'}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">HSN Code (Orig)</p>
                  <p className="text-[12px] font-black text-slate-800">{req.control_code || '—'}</p>
                </div>
              </div>

              {/* Editable fields - Premium Layout */}
              {canEdit && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} /> MODIFICATION PANEL
                    </h4>
                    {hasEdits && (
                      <span className="text-[8px] font-black px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase animate-pulse">
                        {editedFields.length} Pending Changes
                      </span>
                    )}
                  </div>

                  {/* Purchase Team — only Purchase Group editable */}
                  {isPurchase ? (
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-6 space-y-1">
                        <SearchableDropdown
                          label="Purchase Group"
                          compact
                          value={editData.purchase_group}
                          onChange={(val) => setField('purchase_group', val)}
                          fetchOptions={fetchPurchaseGroups}
                          style={editStyle('purchase_group')}
                        />
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Material Type</label>
                      <select className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] outline-none font-bold focus:ring-2 focus:ring-blue-100 transition-all shadow-sm" 
                        value={editData.material_type} style={editStyle('material_type')} disabled={!canEditMatType}
                        onChange={e => setEditData(p=>({...p,material_type:e.target.value}))}>
                        {['ZMIS','ZEIS','ZCOM','ZPAC','ZPRT','ZNVA','ZNVM'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-6 space-y-1">
                      <div className="flex justify-between px-0.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Short Description</label>
                        <span className="text-[8px] font-bold text-slate-300">{editData.description.length}/40</span>
                      </div>
                      <input type="text" maxLength={40} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] outline-none font-bold focus:ring-2 focus:ring-blue-100 transition-all shadow-sm" 
                        value={editData.description} style={editStyle('description')}
                        onChange={e => setEditData(p=>({...p,description:e.target.value}))}/>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <SearchableDropdown
                        label="Material Group"
                        compact
                        value={editData.material_group}
                        onChange={(val) => setField('material_group', val)}
                        fetchOptions={fetchMaterialGroups}
                        style={editStyle('material_group')}
                      />
                    </div>
                  </div>

                  {/* Store Head extra fields — UOM + Purchase Group */}
                  {(isStoreHead || isIT) && (
                    <div className="grid grid-cols-12 gap-3 mt-3">
                      <div className="col-span-4 space-y-1">
                        <SearchableDropdown
                          label="UOM"
                          compact
                          value={editData.uom}
                          onChange={(val) => setField('uom', val)}
                          fetchOptions={fetchUOM}
                          style={editStyle('uom')}
                          disabled={!canEditUOM}
                        />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <SearchableDropdown
                          label="Purchase Group"
                          compact
                          value={editData.purchase_group}
                          onChange={(val) => setField('purchase_group', val)}
                          fetchOptions={fetchPurchaseGroups}
                          style={editStyle('purchase_group')}
                          disabled={!canEditPurchGrp}
                        />
                      </div>
                    </div>
                  )}
                  )}

                  {(isIT || isGST) && (
                    <div className="grid grid-cols-12 gap-3 mt-3">
                      <div className="col-span-9 space-y-1">
                        <div className="flex justify-between px-0.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Long Description</label>
                          <span className="text-[8px] font-bold text-slate-300">{editData.long_description.length}/200</span>
                        </div>
                        <textarea rows={2} maxLength={200} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none font-medium resize-none leading-relaxed focus:ring-2 focus:ring-blue-100 transition-all shadow-sm" 
                          value={editData.long_description} style={editStyle('long_description')}
                          onChange={e => setEditData(p=>({...p,long_description:e.target.value}))}/>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">HSN Code</label>
                        <input type="text" inputMode="numeric" maxLength={8} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] outline-none font-black text-center focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                          style={{ ...editStyle('control_code'), ...(ccError ? { borderColor:'#ef4444', backgroundColor: '#fef2f2' } : {}) }}
                          value={editData.control_code} onChange={e => handleCCChange(e.target.value)}/>
                        {ccError && <p className="text-[8px] text-red-500 font-bold px-1">{ccError}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: actions (4 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <div className="card-flat p-3 border-slate-200 shadow-md bg-white flex flex-col justify-between h-fit min-h-[180px]">
            <div>
              <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-50 pb-1 flex items-center gap-2">
                <CheckCircle2 size={11} className="text-blue-500"/> DECISION CENTER
              </h3>
              
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider ml-1">Reviewer Remarks</label>
                  <textarea rows={3} placeholder="Type your comments here..."
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] outline-none font-medium resize-none shadow-inner focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all h-20"
                    value={comments} onChange={e => setComments(e.target.value)}/>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 mt-2">
              <button onClick={() => handleAction('APPROVE')} disabled={submitting} 
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-black text-[11px] text-white uppercase tracking-widest transition-all shadow-lg active:scale-95 ${submitting ? 'bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'}`}>
                {submitting ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} 
                {submitting ? 'Processing...' : 'Approve Request'}
              </button>
              
              <div className="grid grid-cols-2 gap-1.5">
                {canSendBack && (
                  <button onClick={() => handleAction('SEND_BACK')} disabled={submitting} 
                    className="flex items-center justify-center gap-2 py-2 rounded-md font-black text-[9px] text-white bg-amber-500 hover:bg-amber-600 shadow-md uppercase tracking-wider transition-all active:scale-95">
                    <CornerUpLeft size={12}/> Send Back
                  </button>
                )}
                
                <button onClick={() => handleAction('REJECT')} disabled={submitting}
                  className={`flex items-center justify-center gap-2 py-2 rounded-md font-black text-[9px] text-white bg-red-500 hover:bg-red-600 shadow-md uppercase tracking-wider transition-all active:scale-95 ${!canSendBack ? 'col-span-2' : ''}`}>
                  <AlertCircle size={12}/> Reject
                </button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-6 text-center bg-blue-50/20 border-2 border-dashed border-slate-100 rounded-2xl opacity-60">
             <Info size={24} className="text-blue-300 mb-2" />
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
               Verified Record<br />Consolidated View
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Approvals = () => {
  const { user } = useAuth();
  const [queue, setQueue]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/workflow/pending'); setQueue(Array.isArray(r.data)?r.data:[]); }
    catch { setQueue([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleExport = async () => {
    try {
      // ── Today's date boundaries (local midnight → midnight) ──
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const isToday = (iso) => {
        if (!iso) return false;
        const d = new Date(iso);
        return d >= todayStart && d <= todayEnd;
      };

      // ── Filter: Approved or Completed, updated_at must be today ──
      const eligible = queue.filter(req => {
        const statusOk = req.status === 'Approved' || req.current_stage === 'Completed';
        const dateOk   = isToday(req.updated_at) || isToday(req.created_at);
        return statusOk && dateOk;
      });

      if (eligible.length === 0) {
        alert('No approved or completed requests found for today.');
        return;
      }

      // ── Fetch IT Team approver name from history for each request ──
      const rows = [];
      for (const req of eligible) {
        let approvedBy = '';
        let completedTime = '';
        try {
          const hr = await api.get(`/workflow/${req.id}/history`);
          const history = Array.isArray(hr.data) ? hr.data : [];
          // Find the IT Team APPROVE action
          const itEntry = history.slice().reverse().find(
            h => h.action === 'APPROVE' && (h.stage === 'IT Team' || h.approver_role === 'IT Team')
          );
          if (itEntry) {
            approvedBy    = itEntry.approver_name || '';
            completedTime = itEntry.created_at
              ? new Date(itEntry.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
              : '';
          }
        } catch (_) {}

        rows.push({
          'Request ID':       req.req_number,
          'Material Code':    req.req_number,
          'Short Description':req.description || req.material_name || '',
          'Material Type':    req.material_type || '',
          'Control Code':     req.control_code || '',
          'Final Status':     req.status,
          'Approved By':      approvedBy,
          'Completed Time':   completedTime,
        });
      }

      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths
      const colWidths = Object.keys(rows[0] || {}).map(k => ({
        wch: Math.max(k.length, ...rows.map(r => String(r[k] || '').length)) + 2
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Approved Today');
      XLSX.writeFile(wb, `Approved_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) { alert('Export failed: ' + err.message); }
  };

  const handlePrint = () => window.print();
  const handleActionDone = () => { setSelected(null); fetchQueue(); };

  const STAGE_BANNER = ['Submitted','Plant Head','Dept Team*','Purchase Team','GST Team','Store Head','IT Team'];

  return (
    <div className="page-enter h-full flex flex-col overflow-hidden">
      {!selected && (
        <div className="flex flex-col h-full space-y-3">
          {/* Header */}
          <div className="page-header shrink-0">
            <div>
              <h1 className="page-title">Approval Queue</h1>
              <p className="page-sub">
                Viewing as: <span className="font-semibold text-blue-600">{user?.role??'Approver'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-blue-700 font-bold text-[12px] shadow-sm">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 align-middle"/>Queue: {queue.length}
              </div>
              <button onClick={fetchQueue} className="btn btn-secondary btn-sm" title="Refresh">
                <RefreshCw size={13}/>
              </button>
              {user?.role==='IT Team' && (
                <>
                  <button onClick={handleExport} className="btn btn-secondary btn-sm">
                    <Download size={13}/> Export
                  </button>
                  <button onClick={handlePrint} className="btn btn-secondary btn-sm">
                    <Printer size={13}/> Print
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Workflow path banner */}
          <div className="card py-2 px-4 border border-slate-100 shadow-sm shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Workflow Path <span className="text-slate-300 font-normal normal-case tracking-normal">(*Dept Team only for Mechanical/Electrical)</span>
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {STAGE_BANNER.map((stage, i, arr) => (
                <React.Fragment key={stage}>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded transition-all border ${
                    stage.replace('*','')===user?.role||stage===user?.role
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>{stage}</span>
                  {i < arr.length-1 && <ChevronRight size={10} className="text-slate-300 shrink-0"/>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Queue table */}
          <div className="card-flat overflow-hidden flex-1 min-h-0">
            <div className="overflow-x-auto h-full overflow-y-auto custom-scrollbar">
              <table className="data-table">
                <thead><tr>
                  {['Request #','Material','Dept / Type','Current Approver','Stage','Priority','Submitted','Action'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="py-16 text-center text-slate-400">
                      <Loader2 size={20} className="animate-spin mx-auto mb-2"/>
                      Loading queue…
                    </td></tr>
                  ) : queue.length===0 ? (
                    <tr><td colSpan="8">
                      <div className="empty-state">
                        <div className="empty-icon"><CheckCircle2 size={20} className="text-emerald-500"/></div>
                        <p className="text-[14px] font-semibold text-slate-500 mt-1">Queue is empty</p>
                        <p className="text-[12px] text-slate-400">All caught up — no pending approvals</p>
                      </div>
                    </td></tr>
                  ) : queue.map(req => (
                    <tr key={req.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="font-bold text-blue-600 text-[12px] font-mono whitespace-nowrap">{req.req_number}</td>
                      <td>
                        <p className="font-semibold text-slate-800 text-[13px]">{req.description||req.material_name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-medium mt-0.5 tracking-wide">{req.material_type}</p>
                      </td>
                      <td>
                        <p className="font-medium text-slate-700 text-[13px]">{req.department||'—'}</p>
                        <p className="text-[11px] text-slate-400">{req.plant}</p>
                      </td>
                      <td>
                        {req.current_approver_name ? (
                          <div>
                            <p className="font-semibold text-slate-800 text-[13px]">{req.current_approver_name}</p>
                            <p className="text-[11px] text-slate-400">{req.current_approver_role}</p>
                            {req.current_approver_email && (
                              <p className="text-[10px] text-blue-600 flex items-center gap-0.5 mt-0.5">
                                <Mail size={8}/> {req.current_approver_email}
                              </p>
                            )}
                          </div>
                        ) : <span className="text-slate-300 text-[13px]">—</span>}
                      </td>
                      <td><span className={statusBadge(req.status)}>{req.current_stage}</span></td>
                      <td><span className={PRIORITY_BADGE[req.priority]||'badge badge-default'}>{req.priority||'Medium'}</span></td>
                      <td className="text-slate-400 text-[12px] whitespace-nowrap">
                        <span className="flex items-center gap-1"><Calendar size={10}/> {fmt(req.created_at)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelected(req)} className="btn btn-primary btn-sm shadow-sm hover:shadow-md transition-shadow">
                            Review <ArrowRight size={11}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <DetailPanel req={selected} onClose={() => setSelected(null)} onActionDone={handleActionDone} userRole={user?.role}/>
      )}
    </div>
  );
};

export default Approvals;
