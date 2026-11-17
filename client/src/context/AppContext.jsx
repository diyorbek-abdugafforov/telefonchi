import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { translations } from '../translations';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [branches, setBranches] = useState([]);
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'uz_lat');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [usdRate, setUsdRate] = useState(12850);
  const [settings, setSettings] = useState({});
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Synchronize document.documentElement class for strict, reliable dark/light mode
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const bRes = await apiRequest('/settings/branches');
        if (bRes.success) setBranches(bRes.data);

        const sRes = await apiRequest('/settings');
        if (sRes.success) {
          setSettings(sRes.data);
          if (sRes.data.usd_rate) setUsdRate(Number(sRes.data.usd_rate));
        }
      } catch (err) {
        console.error('Error loading initial app data:', err);
      }
    }
    loadInitialData();
  }, []);

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const t = (key) => {
    const currentDict = translations[lang] || translations.uz_lat;
    return currentDict[key] || key;
  };

  return (
    <AppContext.Provider
      value={{
        selectedBranch,
        setSelectedBranch,
        branches,
        lang,
        changeLanguage,
        theme,
        toggleTheme,
        usdRate,
        setUsdRate,
        settings,
        globalSearchOpen,
        setGlobalSearchOpen,
        showToast,
        t
      }}
    >
      <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen transition-colors duration-150">
        {children}

        {/* Toast Container */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transition-all transform animate-in slide-in-from-bottom duration-200 flex items-center justify-between gap-3 text-white ${
                toast.type === 'error'
                  ? 'bg-rose-600'
                  : toast.type === 'warning'
                  ? 'bg-amber-600'
                  : 'bg-emerald-600'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="opacity-70 hover:opacity-100 font-bold ml-2 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
