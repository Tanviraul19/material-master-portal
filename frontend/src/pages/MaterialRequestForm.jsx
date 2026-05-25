import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Send, AlertCircle, ArrowLeft, Layout, Info,
  Shield, Briefcase, CheckCircle2, Ban, Loader2, ChevronDown, Check,
  Zap, ChevronRight
} from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import SearchableDropdown from '../components/SearchableDropdown';
import virajLogo from '../assets/viraj-logo.png';

// ── Valuation mapping (unchanged) ──────────────────────────────────────────
const VALUATION_MAPPING = {
  'ZMIS': { department: 'Mechanical', category: 'M', class: '2MID' },
  'ZEIS': { department: 'Electrical', category: 'E', class: 'ZEID' },
  'ZCOM': { department: 'Consumable', category: 'C', class: 'ZCOD' },
  'ZPAC': { department: '-', category: '-', class: 'ZPAC' },
  'ZNVA': { department: '-', category: '-', class: 'ZNVA' },
  'ZNVM': { department: '-', category: '-', class: 'ZNVM' },
  'ZRET': { department: '-', category: '-', class: 'ZRET' },
  'ZPRT': { department: 'Production', category: 'T', class: 'ZPRP' },
};

// ── Read-only description box ───────────────────────────────────────────────
const DescriptionBox = ({ label, value, placeholder = '—' }) => (
  <div className="space-y-1">
    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    <div className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-600 min-h-[36px] flex items-center shadow-inner">
      {value ? <span className="font-bold text-slate-800">{value}</span> : <span className="text-slate-400 italic text-xs">{placeholder}</span>}
    </div>
  </div>
);

// ── Material Type premium dropdown ────────────────────────────────────────
const MT_STYLE_ID = 'mtd-styles';
if (typeof document !== 'undefined' && !document.getElementById(MT_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = MT_STYLE_ID;
  s.textContent = `
    @keyframes mtd-in  { from { opacity:0; transform:scale(.97) translateY(-6px); } to { opacity:1; transform:scale(1) translateY(0); } }
    @keyframes mtd-out { from { opacity:1; transform:scale(1) translateY(0); } to { opacity:0; transform:scale(.97) translateY(-6px); } }
    .mtd-panel         { animation: mtd-in  .18s cubic-bezier(.16,1,.3,1) forwards; }
    .mtd-panel-closing { animation: mtd-out .14s ease forwards; }
  `;
  document.head.appendChild(s);
}

const MaterialTypeDropdown = ({ value, onChange, options, error }) => {
  const [open, setOpen]       = useState(false);
  const [closing, setClosing] = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0, width: 0 });
  const [preferTop, setPreferTop] = useState(false);
  const triggerRef            = useRef(null);
  const wrapperRef            = useRef(null);

  const closePanel = () => { setClosing(true); setTimeout(() => { setOpen(false); setClosing(false); setPreferTop(false); }, 140); };

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target) &&
          !document.getElementById('mtd-portal')?.contains(e.target)) closePanel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const panelHeight = (options.length * 44) + 12;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const shouldGoTop = preferTop || (spaceBelow < panelHeight && spaceAbove > spaceBelow);
    
    if (shouldGoTop) {
      setPos({ top: r.top - panelHeight - 8, left: r.left, width: r.width });
    } else {
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
  }, [options.length, preferTop]);

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  const handleOpen = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (open) { closePanel(); return; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const panelHeight = (options.length * 44) + 12;
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      const shouldGoTop = spaceBelow < panelHeight && spaceAbove > spaceBelow;
      setPreferTop(shouldGoTop);
      
      if (shouldGoTop) {
        setPos({ top: r.top - panelHeight - 8, left: r.left, width: r.width });
      } else {
        setPos({ top: r.bottom + 6, left: r.left, width: r.width });
      }
    }
    setOpen(true); setClosing(false);
  };

  const isOpen = open || closing;

  const DESCRIPTIONS = {
    ZMIS: 'Mechanical Inventory Spare',
    ZEIS: 'Electrical Inventory Spare',
    ZCOM: 'Consumable',
    ZPAC: 'Packing Material',
    ZNVA: 'Non-Valuated',
    ZNVM: 'Non-Valuated Material',
    ZRET: 'Returnable',
    ZPRT: 'Production Tool',
  };

  const panel = isOpen ? (
    <div
      id="mtd-portal"
      className={`mtd-panel${closing ? ' mtd-panel-closing' : ''}`}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
        zIndex: 9999, borderRadius: 12, overflow: 'hidden',
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }}
    >
      <ul style={{ padding: '6px 0' }}>
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <li
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); closePanel(); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 10, margin: '0 6px', borderRadius: 8,
                background: isSelected ? '#eff6ff' : 'transparent',
                transition: 'all .1s ease',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isSelected && <Check size={12} style={{ color: '#2563eb' }} />}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#1d4ed8' : '#1e293b', minWidth: 44 }}>{opt}</span>
              <span style={{ fontSize: 11, color: '#64748b', flex: 1, fontWeight: 500 }}>{DESCRIPTIONS[opt] || ''}</span>
            </li>
          );
        })}
      </ul>
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className="space-y-1">
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
        Material Type <span className="text-red-500">*</span>
      </label>
      <div
        ref={triggerRef}
        onMouseDown={handleOpen}
        className={`
          flex items-center w-full px-3 py-1.5 border transition-all cursor-pointer shadow-sm select-none
          ${error ? 'border-red-500 bg-red-50/30' : open ? 'border-blue-500 ring-4 ring-blue-100/50' : 'border-slate-200 hover:border-slate-300 bg-white'}
          rounded-lg
        `}
      >
        <span className={`flex-1 text-[13px] ${value ? 'text-slate-900 font-bold' : 'text-slate-300'}`}>
          {value || 'Select Material Type'}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {error && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tight">{error}</p>}
      {typeof document !== 'undefined' && isOpen
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
};

// ── Modern Form Section Component ──────────────────────────────────────────
const Section = ({ title, subtitle, icon: Icon, children, badge, variant = 'default' }) => {
  const variants = {
    default: {
      bg: 'bg-white',
      border: 'border-slate-200',
      header: 'bg-slate-50/50',
      iconBg: 'bg-blue-600',
      shadow: 'shadow-sm'
    },
    blue: {
      bg: 'bg-blue-50/30',
      border: 'border-blue-100',
      header: 'bg-blue-100/30',
      iconBg: 'bg-blue-700',
      shadow: 'shadow-sm'
    }
  };
  
  const v = variants[variant] || variants.default;

  return (
    <div className={`rounded-xl border ${v.border} ${v.bg} ${v.shadow} overflow-hidden transition-all duration-200 hover:shadow-md`}>
      <div 
        className={`flex items-center gap-3 px-3 py-2 border-b ${v.border} ${v.header}`}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-sm ${v.iconBg}`}>
          <Icon size={14} />
        </div>
        <div className="flex-1">
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">{title}</h2>
          {subtitle && <p className="text-[9px] font-medium text-slate-500 leading-tight">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 uppercase tracking-tighter shadow-sm">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-3.5 space-y-4">
        {children}
      </div>
    </div>
  );
};

// ── Main Form ───────────────────────────────────────────────────────────────
const MaterialRequestForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    material_type: '', plant: '', storage_location: '',
    description: '', long_description: '', uom: '',
    purchase_group: '', material_group: '', control_code: ''
  });

  // Description fields (auto-filled)
  const [uomDesc, setUomDesc] = useState('');
  const [pgDesc, setPgDesc] = useState('');
  const [slocDesc, setSlocDesc] = useState('');
  const [mgShortDesc, setMgShortDesc] = useState('');

  const [valuationInfo, setValuationInfo] = useState({ department: '-', category: '-', class: '-' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  // Suggestion list state (view-only, shows while typing)
  const [suggestions, setSuggestions] = useState({ list: [], total: 0 });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);


  // Valuation auto-map
  useEffect(() => {
    const m = VALUATION_MAPPING[formData.material_type?.toUpperCase()] || { department: '-', category: '-', class: '-' };
    setValuationInfo(m);
  }, [formData.material_type]);

  // Duplicate check (debounced 600ms) — blocks submission on high similarity
  useEffect(() => {
    if (!formData.description || formData.description.length < 3) {
      setDuplicates([]); return;
    }
    const t = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await api.get(`/duplicate/check?description=${encodeURIComponent(formData.description)}`);
        setDuplicates(res.data?.duplicates || []);
      } catch { setDuplicates([]); }
      finally { setIsCheckingDuplicate(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [formData.description]);

  // Suggestion list (debounced 300ms) — substring search, view-only
  useEffect(() => {
    if (!formData.description || formData.description.length < 4) {
      setSuggestions({ list: [], total: 0 }); return;
    }
    const t = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await api.get(`/duplicate/suggest?q=${encodeURIComponent(formData.description)}`);
        const list = res.data?.suggestions || [];
        setSuggestions({
          list: list.map(x => ({
            description: x.description || '',
            material_code: x.material_code || '',
            source: x.source || 'excel',
            material_type: x.material_type || '',
          })),
          total: res.data?.total || 0,
        });
      } catch { setSuggestions({ list: [], total: 0 }); }
      finally { setIsLoadingSuggestions(false); }
    }, 700);

    return () => clearTimeout(t);
  }, [formData.description]);

  // Load draft
  useEffect(() => {
    try {
      const d = localStorage.getItem('mmr_draft');
      if (d) setFormData(JSON.parse(d));
    } catch (_) {}
  }, []);

  const isDuplicateBlocked = duplicates.length > 0 && !isCheckingDuplicate;

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
    const plant = formData.plant;
    const res = await api.get(`/master/storage-locations?plant=${encodeURIComponent(plant)}&q=${encodeURIComponent(q || '')}`);
    return res.data;
  }, [formData.plant]);

  // ── Field change handlers ──────────────────────────────────────────────────
  const setField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleUOMChange = (code, item) => {
    setField('uom', code);
    setUomDesc(item?.description || '');
  };

  const handlePGChange = (code, item) => {
    setField('purchase_group', code);
    setPgDesc(item?.description || '');
  };

  const handlePlantChange = (code) => {
    setField('plant', code);
    // Reset storage location when plant changes
    setField('storage_location', '');
    setSlocDesc('');
  };

  const handleSlocChange = (code, item) => {
    setField('storage_location', code);
    setSlocDesc(item?.description || '');
  };

  const handleMGChange = (code, item) => {
    setField('material_group', code);
    setMgShortDesc(item?.description || '');
    // Auto-fill long description from material group long desc
    if (item?.description && !formData.long_description) {
      setField('long_description', item.description.slice(0, 200));
    }
  };

  // HSN: allow only digits, max 8
  const handleHSNChange = (e) => {
    const numeric = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
    setField('control_code', numeric);
    if (numeric.length > 0 && numeric.length < 4) {
      setErrors(prev => ({ ...prev, control_code: 'Minimum 4 digits required' }));
    } else if (numeric.length > 8) {
      setErrors(prev => ({ ...prev, control_code: 'Maximum 8 digits allowed' }));
    } else {
      setErrors(prev => ({ ...prev, control_code: '' }));
    }
  };

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setField(name, value);
  };



  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.material_type) e.material_type = 'Required';
    if (!formData.plant) e.plant = 'Required';
    if (!formData.storage_location) e.storage_location = 'Required';
    if (!formData.description) e.description = 'Required';
    if (formData.description.length > 40) e.description = 'Max 40 characters';
    if (formData.long_description.length > 200) e.long_description = 'Max 200 characters';
    if (!formData.uom) e.uom = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDraft = () => {
    if (isDuplicateBlocked) return;
    localStorage.setItem('mmr_draft', JSON.stringify(formData));
    alert('Draft saved!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Final sync duplicate check — catches timing issues when user submits quickly
    if (formData.description && formData.description.length >= 3) {
      setIsSubmitting(true);
      try {
        const dupRes = await api.get(`/duplicate/check?description=${encodeURIComponent(formData.description)}`);
        const dupList = dupRes.data?.duplicates || [];
        if (dupList.length > 0) {
          setDuplicates(dupList);
          setIsSubmitting(false);
          alert('⚠️ Duplicate description detected!\nThis description already exists. Please enter a unique description.');
          return;
        }
      } catch { /* allow submit if check API fails */ }
      setIsSubmitting(false);
    }

    if (isDuplicateBlocked) {
      alert('⚠️ Duplicate description detected! Please enter a unique description.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/requests', formData);
      localStorage.removeItem('mmr_draft');
      setSuccess(true);
      setTimeout(() => navigate('/requests/my'), 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const descBorderClass = () => {
    if (errors.description) return 'border-red-500 bg-red-50/30';
    if (isDuplicateBlocked) return 'border-red-500 bg-red-50 ring-4 ring-red-100/50';
    if (isCheckingDuplicate) return 'border-blue-400 ring-4 ring-blue-100/50';
    return 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[1000px] bg-[#f8fafc]/95 backdrop-blur-xl rounded-[24px] shadow-2xl overflow-hidden border border-blue-900/10 flex flex-col"
        style={{ height: 'calc(100vh - 80px)' }}
      >
        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-blue-900/5 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h1 className="text-[15px] font-black text-slate-800 uppercase tracking-[0.15em]">Material Creation</h1>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Top Row: Dropdowns */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-4">
                <MaterialTypeDropdown
                  value={formData.material_type}
                  onChange={(val) => { setField('material_type', val); }}
                  options={Object.keys(VALUATION_MAPPING)}
                  error={errors.material_type}
                />
              </div>
              <div className="col-span-4">
                <SearchableDropdown
                  label="Plant Head"
                  required
                  compact
                  value={formData.plant}
                  onChange={handlePlantChange}
                  fetchOptions={fetchPlants}
                  placeholder="Select"
                  error={errors.plant}
                />
              </div>
              <div className="col-span-4">
                <SearchableDropdown
                  label="Storage Location"
                  required
                  compact
                  value={formData.storage_location}
                  onChange={handleSlocChange}
                  fetchOptions={fetchStorageLocations}
                  placeholder={formData.plant ? 'Select' : 'Select plant'}
                  error={errors.storage_location}
                  disabled={!formData.plant}
                />
              </div>
            </div>

            {/* Side-by-Side Descriptions */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-5 space-y-1.5 pt-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Short Description</label>
                <div className="relative">
                  <input
                    name="description"
                    autoComplete="off"
                    className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none transition-all text-[13px] font-bold shadow-sm placeholder:font-medium placeholder:text-slate-300 ${descBorderClass()}`}
                    value={formData.description}
                    onChange={handleTextChange}
                    placeholder="Brief material identifier..."
                  />
                  {errors.description && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tight pl-1">{errors.description}</p>}
                </div>
                
                {/* Suggestions List */}
                <AnimatePresence>
                  {suggestions.list.length > 0 && formData.description.trim().length >= 2 && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 mt-1 z-[9999] rounded-xl border border-blue-200 bg-white shadow-2xl overflow-hidden backdrop-blur-sm">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border-b border-blue-100">
                        <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider">
                          Existing Descriptions Containing "{formData.description}"
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 uppercase">
                          {suggestions.total} matches
                        </span>
                      </div>
                      <ul className="max-h-[160px] overflow-y-auto custom-scrollbar">
                        {suggestions.list.map((s, i) => (
                          <li key={i} className="px-4 py-2 hover:bg-slate-50 transition-colors cursor-default border-b border-slate-50 last:border-0">
                            <div className="flex flex-col">
                              <p className="text-[12px] font-bold text-slate-800 leading-tight">
                                <span className="text-blue-600 mr-2">[{s.material_code || 'N/A'}]</span>
                                {s.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Master Data</span>
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tighter">
                                  {s.material_type || 'ZMIS'}
                                </span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="bg-blue-50/50 px-4 py-1.5 border-t border-blue-100">
                        <p className="text-[9px] font-medium text-blue-600">
                          These are existing records for reference. Please type a unique description.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="col-span-7 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Long Description</label>
                <textarea
                  name="long_description"
                  placeholder="Detailed technical parameters and additional notes..."
                  rows={2}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-[13px] font-medium shadow-sm resize-none"
                  value={formData.long_description}
                  onChange={handleTextChange}
                />
              </div>
            </div>

            {/* Material Group & Category */}
            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-7">
                <SearchableDropdown
                  label="Material Group"
                  compact
                  value={formData.material_group}
                  onChange={handleMGChange}
                  fetchOptions={fetchMaterialGroups}
                  placeholder="Search group"
                />
              </div>
              <div className="col-span-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Category</label>
                  <div className="relative">
                    <input
                      disabled
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-400 cursor-not-allowed"
                      value={mgShortDesc || 'Auto'}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                      <Layout size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* UOM & Integration Panel */}
            <div className="grid grid-cols-12 gap-6 items-stretch pt-1">
              <div className="col-span-4 self-start pt-1">
                <SearchableDropdown
                  label="UOM"
                  required
                  compact
                  value={formData.uom}
                  onChange={handleUOMChange}
                  fetchOptions={fetchUOM}
                  placeholder="Select UOM"
                />
              </div>
              
              <div className="col-span-8">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                  
                  <div className="relative bg-white border border-blue-100 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Zap size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">System Integration</h3>
                          <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase tracking-tighter">Auto</span>
                        </div>
                        <div className="flex gap-6 mt-1">
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Dept</span>
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{valuationInfo.department}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Cat.</span>
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{valuationInfo.category}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Class</span>
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{valuationInfo.class}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer Buttons */}
        <div className="px-8 py-5 border-t border-slate-200 bg-white/80 flex items-center justify-between">
          <img src={virajLogo} alt="" className="h-6 opacity-40 grayscale" />
          <div className="flex items-center gap-3">
            {isDuplicateBlocked && (
              <span className="text-red-500 text-[11px] font-bold flex items-center gap-1">
                <Ban size={12} /> Duplicate Detected
              </span>
            )}
            <button 
              type="button" 
              onClick={handleSaveDraft} 
              className="px-8 py-2.5 font-black text-[11px] text-slate-500 hover:text-slate-700 uppercase tracking-widest transition-all"
            >
              Draft
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || isDuplicateBlocked || isCheckingDuplicate}
              title={isDuplicateBlocked ? 'Duplicate description — enter a unique description' : ''}
              className={`px-10 py-2.5 font-black text-[11px] rounded-lg uppercase tracking-[0.1em] shadow-lg active:scale-95 transition-all flex items-center gap-2 ${
                isDuplicateBlocked ? 'bg-red-500 text-white cursor-not-allowed shadow-red-500/20' :
                isCheckingDuplicate ? 'bg-blue-400 text-white cursor-wait shadow-blue-400/20' :
                'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : isDuplicateBlocked ? <Ban size={14} /> : <Send size={14} />}
              {isDuplicateBlocked ? 'Duplicate Blocked' : isCheckingDuplicate ? 'Checking...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Success Modal */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[200] bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-6 rounded-3xl shadow-2xl text-center max-w-sm mx-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Request Filed!</h2>
              <p className="text-slate-500 text-[13px] font-medium mb-5">Workflow validation in progress. Redirecting...</p>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2 }} className="bg-emerald-500 h-full" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MaterialRequestForm;
