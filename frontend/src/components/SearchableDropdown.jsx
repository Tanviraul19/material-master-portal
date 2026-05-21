import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Loader2, X, Check } from 'lucide-react';

/* ── Inject scrollbar + animation styles once ─────────────────────────────── */
const STYLE_ID = 'sdd-premium-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes sdd-in {
      from { opacity: 0; transform: scale(.97) translateY(-6px); }
      to   { opacity: 1; transform: scale(1)  translateY(0);     }
    }
    @keyframes sdd-out {
      from { opacity: 1; transform: scale(1)  translateY(0);     }
      to   { opacity: 0; transform: scale(.97) translateY(-6px); }
    }
    .sdd-panel          { animation: sdd-in  .18s cubic-bezier(.16,1,.3,1) forwards; }
    .sdd-panel-closing  { animation: sdd-out .14s ease forwards; }
    .sdd-scroll::-webkit-scrollbar       { width: 4px; }
    .sdd-scroll::-webkit-scrollbar-track { background: transparent; }
    .sdd-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
    .sdd-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  `;
  document.head.appendChild(s);
}

const SearchableDropdown = ({
  label, value, onChange, fetchOptions,
  placeholder = 'Search...', error, required, disabled, className = '',
  compact = false
}) => {
  const [query, setQuery]               = useState('');
  const [options, setOptions]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [open, setOpen]                 = useState(false);
  const [closing, setClosing]           = useState(false);
  const [highlighted, setHighlighted]   = useState(0);
  const [displayValue, setDisplayValue] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(value || '');
  const wrapperRef  = useRef(null);
  const inputRef    = useRef(null);
  const listRef     = useRef(null);
  const debounceRef = useRef(null);
  const triggerRef  = useRef(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const [preferTop, setPreferTop] = useState(false);

  useEffect(() => { 
    if (!value) setSelectedLabel('');
    else if (value && !selectedLabel) setSelectedLabel(value);
  }, [value, selectedLabel]);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        !document.getElementById('sdd-portal')?.contains(e.target)
      ) closePanel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* reposition on scroll/resize */
  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    
    // Determine direction: if less than ~250px below, and more space above, go up.
    const shouldGoTop = spaceBelow < 250 && spaceAbove > spaceBelow;
    
    // To prevent the panel from "floating" high above when there are few results,
    // we use a transform-based approach or just a very careful top calculation.
    // For simplicity with portals, we'll keep using 'top' but we'll anchor it better.
    setDropPos({ 
      top: shouldGoTop ? 'auto' : r.bottom + 6, 
      bottom: shouldGoTop ? (window.innerHeight - r.top + 6) : 'auto',
      left: r.left, 
      width: r.width 
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const handler = () => reposition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, reposition]);

  const loadOptions = useCallback(async (q) => {
    setLoading(true);
    try {
      const results = await fetchOptions(q);
      const data = Array.isArray(results) ? results : [];
      setOptions(data);
      setHighlighted(0);
      // Reposition after options load to catch any height changes if needed 
      // (though our bottom-anchor/top-anchor logic now handles height changes gracefully)
      setTimeout(reposition, 0); 
    } catch (_) { setOptions([]); }
    finally { setLoading(false); }
  }, [fetchOptions, reposition]);

  const closePanel = () => {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 140);
  };

  const handleInputChange = (e) => {
    const q = e.target.value;
    setDisplayValue(q); setQuery(q); 
    if (!open) setOpen(true);
    setClosing(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadOptions(q), 250);
  };

  const handleOpen = (e) => {
    // Stop all other events to prevent "glitches" or double-firing
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (disabled) return;

    // Toggle logic
    if (open) {
      closePanel();
      return;
    }

    // Prepare to open
    reposition(); // Immediate position snapshot
    setOpen(true);
    setClosing(false);
    setDisplayValue('');
    setQuery('');
    loadOptions('');

    // Reliable focus with multiple attempts if needed (common pattern for dropdowns)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Optional: clear any selection
        inputRef.current.setSelectionRange(0, 0);
      }
    }, 50);
  };

  const handleSelect = (item) => {
    // Default behavior: save/display the "code" field.
    // Material Request Form uses this component for various masters;
    // for Short Description dropdown we will override via fetchOptions/item mapping.
    const lbl = item.description ? `${item.code} — ${item.description}` : item.code;
    onChange(item.code, item);
    setSelectedLabel(lbl); closePanel(); setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSelectedLabel(''); setDisplayValue(''); setQuery(''); setOptions([]);
  };

  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'Enter' || e.key === 'ArrowDown') handleOpen(); return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHighlighted(h => Math.min(h + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (options[highlighted]) handleSelect(options[highlighted]); }
    else if (e.key === 'Escape')    { closePanel(); }
  };

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlighted];
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  const isOpen = open || closing;

  /* ── Portal panel ─────────────────────────────────────────────────────── */
  const panel = isOpen ? createPortal(
    <div
      id="sdd-portal"
      className={`sdd-panel${closing ? ' sdd-panel-closing' : ''}`}
      style={{
        position: 'fixed',
        top: dropPos.top,
        bottom: dropPos.bottom,
        left: dropPos.left,
        width: dropPos.width,
        zIndex: 9999,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 24px 64px -12px rgba(0,0,0,.22), 0 8px 24px -4px rgba(0,0,0,.12), 0 0 0 1px rgba(255,255,255,.6) inset',
      }}
    >
      {/* Search header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(241,245,249,0.9)',
        background: 'linear-gradient(135deg, rgba(248,250,253,0.9), rgba(241,245,251,0.9))',
      }}>
        <Search size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type to filter…"
          autoFocus
          style={{
            flex: 1, fontSize: 13, outline: 'none',
            background: 'transparent', color: '#1e293b',
            fontFamily: 'inherit', fontWeight: 500,
          }}
        />
        {loading
          ? <Loader2 size={12} style={{ color: '#3b82f6', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
          : displayValue && (
            <button type="button" onClick={() => { setDisplayValue(''); setQuery(''); loadOptions(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#cbd5e1', borderRadius: 4, flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#64748b'}
              onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
            ><X size={11} /></button>
          )
        }
      </div>

      {/* Options list */}
      <ul ref={listRef} className="sdd-scroll" style={{ maxHeight: 232, overflowY: 'auto', padding: '4px 0' }}>
        {options.length === 0 && !loading && (
          <li style={{ padding: '18px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', userSelect: 'none' }}>
            {query ? 'No matches found' : 'Start typing to search…'}
          </li>
        )}
        {loading && options.length === 0 && (
          <li style={{ padding: '18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Loader2 size={14} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Loading…</span>
          </li>
        )}
        {options.map((item, idx) => {
          const isSelected   = value === item.code;
          const isHighlighted = idx === highlighted;
          return (
            <li
              key={item.code + idx}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              onMouseEnter={() => setHighlighted(idx)}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: '0 4px',
                borderRadius: 10,
                background: isHighlighted
                  ? 'linear-gradient(135deg, #eff6ff, #e0f2fe)'
                  : 'transparent',
                transition: 'background .1s ease',
              }}
            >
              {/* checkmark slot — always reserve space */}
              <span style={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isSelected && <Check size={12} style={{ color: '#2563eb' }} />}
              </span>

              <span style={{
                fontSize: 12.5, fontWeight: 700, flexShrink: 0, minWidth: 52,
                color: isHighlighted ? '#1d4ed8' : isSelected ? '#2563eb' : '#334155',
                letterSpacing: '-0.01em',
              }}>
                {item.code}
              </span>

              {item.description && (
                <span style={{
                  fontSize: 11.5, color: isHighlighted ? '#3b82f6' : '#64748b',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  transition: 'color .1s',
                }}>
                  {item.description}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Footer hint */}
      {options.length > 0 && (
        <div style={{
          padding: '7px 14px',
          borderTop: '1px solid rgba(241,245,249,0.9)',
          background: 'linear-gradient(135deg, rgba(248,250,253,0.9), rgba(241,245,251,0.9))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
            {options.length} result{options.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 10, color: '#cbd5e1' }}>↑↓ navigate · Enter select · Esc close</span>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={wrapperRef} className={`space-y-1 relative ${className}`}>
      {label && (
        <label className={`block font-black text-slate-500 uppercase tracking-widest ${compact ? 'text-[9.5px] mb-1' : 'text-[11px] mb-1.5'}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div
        ref={triggerRef}
        onMouseDown={handleOpen}
        className={`
          flex items-center w-full bg-white border cursor-pointer outline-none transition-all select-none
          ${error ? 'border-red-500 bg-red-50/30' : open ? 'border-blue-500 ring-4 ring-blue-100/50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' : ''}
          ${compact ? 'rounded-lg px-2.5 py-1.5' : 'rounded-xl px-3 py-2.5'}
        `}
      >
        <span className={`flex-1 truncate ${selectedLabel ? 'text-slate-900 font-bold' : 'text-slate-300 font-normal'} ${compact ? 'text-[12.5px]' : 'text-[13.5px]'}`}>
          {selectedLabel || placeholder}
        </span>
        
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {selectedLabel && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X size={compact ? 12 : 14} />
            </button>
          )}
          <ChevronDown 
            size={compact ? 13 : 16} 
            className={`text-slate-400 transition-transform duration-300 ${open ? 'rotate-180 text-blue-500' : ''}`}
          />
        </div>
      </div>

      {error && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tight">{error}</p>}
      {typeof document !== 'undefined' && isOpen && panel}
    </div>
  );
};

export default SearchableDropdown;
