import React from "react";
import api from "../services/api";
import { Loader2, X, Eye, History, CheckCircle2 } from "lucide-react";
const HistoryModal = ({ req, onClose }) => {
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    api.get('/workflow/' + req.id + '/history')
      .then(r => setHistory(r.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [req.id]);
  const changedFields = history.filter(h => h.fields_changed).flatMap(h => {
    try { return JSON.parse(h.fields_changed).map(f => ({ ...f, approver: h.approver_name || h.approver_role })); }
    catch { return []; }
  });
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-panel max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-[15px]">Approval History & Changes</h2>
            <p className="text-slate-400 text-[11px] mt-0.5 font-mono">{req.req_number}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={15} className="text-slate-500"/></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400"/></div>
          ) : (
            <>
              {changedFields.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-2">
                    <Eye size={12}/> Fields Modified During Approval
                  </h3>
                  <div className="rounded-xl border border-blue-100 overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 grid grid-cols-4 gap-2">
                      <span className="text-[9px] font-black uppercase text-blue-400">Field</span>
                      <span className="text-[9px] font-black uppercase text-blue-400">Original</span>
                      <span className="text-[9px] font-black uppercase text-blue-400">Changed To</span>
                      <span className="text-[9px] font-black uppercase text-blue-400">By</span>
                    </div>
                    {changedFields.map((f, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">{(f.field||'').replace(/_/g,' ')}</span>
                        <span className="text-[11px] text-red-500 line-through">{f.old || '—'}</span>
                        <span className="text-[11px] text-emerald-600 font-bold">{f.new || '—'}</span>
                        <span className="text-[10px] text-slate-400">{f.approver}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <History size={12}/> Approval Timeline
              </h3>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className={"rounded-xl border px-4 py-3 " + (
                    h.action==='APPROVE'||h.action==='RESUBMIT' ? 'border-emerald-100 bg-emerald-50' :
                    h.action==='REJECT' ? 'border-red-100 bg-red-50' :
                    h.action==='SEND_BACK' ? 'border-amber-100 bg-amber-50' : 'border-slate-100 bg-slate-50')}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={"text-[9px] font-black px-2 py-0.5 rounded-full uppercase " + (
                          h.action==='APPROVE'||h.action==='RESUBMIT' ? 'bg-emerald-200 text-emerald-800' :
                          h.action==='REJECT' ? 'bg-red-200 text-red-800' :
                          h.action==='SEND_BACK' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'
                        )}>{h.action}</span>
                        <span className="text-[12px] font-semibold text-slate-700">{h.approver_name || 'User'}</span>
                        <span className="text-[10px] text-slate-400">({h.approver_role || h.stage})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{h.created_at ? new Date(h.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span>
                    </div>
                    {h.comments && <p className="text-[11px] text-slate-600 italic">"{h.comments}"</p>}
                  </div>
                ))}
                {history.length === 0 && <p className="text-[12px] text-slate-400 text-center py-4">No history found</p>}
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn btn-secondary w-full">Close</button>
        </div>
      </div>
    </div>
  );
};
export default HistoryModal;
