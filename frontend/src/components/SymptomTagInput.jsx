import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function SymptomTagInput({ evidence, onAdd, onRemove, sex, age }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.searchSymptoms(query, sex, age);
        const filtered = data.filter((s) => !evidence.some((e) => e.id === s.id));
        setResults(filtered);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, sex, age, evidence]);

  return (
    <div ref={wrapperRef}>
      <div className="flex flex-wrap gap-2 min-h-[42px] rounded-xl border border-slate-300 p-2 focus-within:border-medical-500 focus-within:ring-2 focus-within:ring-medical-500/20">
        {evidence.map((e) => (
          <span
            key={e.id}
            className="inline-flex items-center gap-1 rounded-lg bg-medical-100 px-3 py-1 text-sm font-medium text-medical-800"
          >
            {e.name}
            <button
              type="button"
              onClick={() => onRemove(e.id)}
              className="ml-1 text-medical-600 hover:text-medical-900"
              aria-label={`Remove ${e.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className="flex-1 min-w-[120px] border-0 bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-0"
          placeholder={evidence.length ? 'Add another…' : 'Search symptoms (e.g. headache, fever)…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-medical-50 transition"
                onClick={() => {
                  onAdd(s);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {s.common_name || s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
