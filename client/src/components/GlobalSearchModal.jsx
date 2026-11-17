import React, { useState, useEffect } from 'react';
import { Search, X, Smartphone, User, ArrowRight } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useApp } from '../context/AppContext';

export default function GlobalSearchModal({ isOpen, onClose, onSelectDevice }) {
  const { globalSearchOpen, setGlobalSearchOpen } = useApp();
  const [query, setQuery] = useState('');
  const [devices, setDevices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setDevices([]);
      setCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const dRes = await apiRequest(`/devices?search=${encodeURIComponent(query)}&limit=5`);
        if (dRes.success) setDevices(dRes.data);

        const cRes = await apiRequest(`/customers?search=${encodeURIComponent(query)}`);
        if (cRes.success) setCustomers(cRes.data.slice(0, 5));
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen && !globalSearchOpen) return null;

  const close = () => {
    if (onClose) onClose();
    setGlobalSearchOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Search Input */}
        <div className="flex items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="IMEI (15 xona), telefon modeli yoki mijoz ismini kiriting..."
            className="w-full text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={close} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-500">
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {loading && (
            <p className="text-center text-xs text-slate-400 py-6">Qidirilmoqda...</p>
          )}

          {!loading && query && devices.length === 0 && customers.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-6">Hech qanday natija topilmadi</p>
          )}

          {/* Devices results */}
          {devices.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Telefonlar ({devices.length})</span>
              </p>
              <div className="space-y-1">
                {devices.map(d => (
                  <div
                    key={d.id}
                    onClick={() => {
                      if (onSelectDevice) onSelectDevice(d);
                      close();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {d.model_name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {d.condition_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        IMEI: <span className="font-semibold text-slate-700 dark:text-slate-300">{d.imei1}</span>
                        {d.branch_name ? ` • Filial: ${d.branch_name}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {Number(d.selling_price).toLocaleString()} UZS
                      </span>
                      <span className={`block text-[10px] font-semibold ${
                        d.status === 'omborda' ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {d.status === 'omborda' ? 'Omborda mavjud' : d.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers results */}
          {customers.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Mijozlar ({customers.length})</span>
              </p>
              <div className="space-y-1">
                {customers.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-100 dark:border-slate-800 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {c.phone} {c.address ? `• ${c.address}` : ''}
                      </p>
                    </div>
                    {Number(c.debt) > 0 && (
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                        Qarz: {Number(c.debt).toLocaleString()} UZS
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
