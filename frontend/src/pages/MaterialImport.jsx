import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  SkipForward, XCircle, Database, RefreshCw, Info
} from 'lucide-react';

const MaterialImport = () => {
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [dbStats, setDbStats]   = useState(null);
  const fileRef = useRef();

  const fetchStats = async () => {
    try { const r = await api.get('/duplicate/stats'); setDbStats(r.data); } catch (_) {}
  };
  useEffect(() => { fetchStats(); }, []);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) { setError('Only .xlsx, .xls, or .csv files are accepted.'); return; }
    setError(''); setResult(null); setFile(f);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/duplicate/import', form, { headers:{'Content-Type':'multipart/form-data'} });
      setResult(res.data.stats); setFile(null); fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-5 page-enter max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Descriptions</h1>
          <p className="page-sub">Upload Excel or CSV files to populate the duplicate detection database</p>
        </div>
      </div>

      {/* DB Stats */}
      {dbStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:'Total Records', value:dbStats.total?.toLocaleString(),  icon:Database,       cls:'text-blue-600 bg-blue-50' },
            { label:'From Excel',    value:dbStats.excel?.toLocaleString(),  icon:FileSpreadsheet,cls:'text-emerald-600 bg-emerald-50' },
            { label:'Manual',        value:dbStats.manual?.toLocaleString(), icon:Info,           cls:'text-purple-600 bg-purple-50' },
            { label:'Last Import',   value:dbStats.last_import?new Date(dbStats.last_import).toLocaleDateString():'Never', icon:RefreshCw, cls:'text-amber-600 bg-amber-50' },
          ].map(({ label, value, icon:Icon, cls }) => (
            <div key={label} className="card flex items-center gap-3 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}><Icon size={16} /></div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-[18px] font-black text-slate-800 leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div className="card space-y-4">
        <div className="section-header">
          <Upload size={15} className="text-blue-500" />
          <span className="section-title">Upload File</span>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
          }`}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          <FileSpreadsheet size={36} className="mx-auto text-slate-300 mb-3" />
          {file ? (
            <div>
              <p className="font-bold text-blue-600 text-[14px]">{file.name}</p>
              <p className="text-[12px] text-slate-400 mt-1">{(file.size/1024).toFixed(1)} KB — ready to import</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-600 text-[14px]">Drag & drop or click to select</p>
              <p className="text-[12px] text-slate-400 mt-1">Accepts .xlsx, .xls, .csv — max 50 MB</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-[12px] text-blue-700">
          <strong>Expected columns:</strong> Auto-detects{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">description</code>,{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">material_name</code>, or{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">short_desc</code> for descriptions, and{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">material_type</code> for type. First column used if none match.
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[13px]">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}

        <button onClick={handleUpload} disabled={!file||uploading} className="btn btn-primary btn-lg w-full">
          {uploading
            ? <><RefreshCw size={16} className="animate-spin" /> Importing... (this may take a minute for large files)</>
            : <><Upload size={16} /> Start Import</>}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="card space-y-4 fade-in">
          <div className="section-header">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="section-title text-emerald-700">Import Complete</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Total Rows',         value:result.total,      icon:Database,     cls:'bg-slate-100 text-slate-700' },
              { label:'Imported',           value:result.imported,   icon:CheckCircle2, cls:'bg-emerald-100 text-emerald-700' },
              { label:'Duplicates Skipped', value:result.duplicates, icon:SkipForward,  cls:'bg-amber-100 text-amber-700' },
              { label:'Failed',             value:result.failed,     icon:XCircle,      cls:'bg-red-100 text-red-700' },
            ].map(({ label, value, icon:Icon, cls }) => (
              <div key={label} className={`rounded-xl p-4 flex items-center gap-3 ${cls}`}>
                <Icon size={18} />
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-70">{label}</p>
                  <p className="text-[22px] font-black leading-tight">{value?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-slate-400 italic">
            Duplicate detection is now active against {(dbStats?.total||0).toLocaleString()} records.
          </p>
        </div>
      )}
    </div>
  );
};

export default MaterialImport;
