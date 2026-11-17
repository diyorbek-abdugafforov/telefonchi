import React, { useState } from 'react';
import { 
  Smartphone, Search, Building2, DollarSign, Globe, Moon, Sun, 
  ShieldAlert, UserCheck, LogOut, ChevronDown, Bell, Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function Navbar({ onNavigate, onToggleSidebar }) {
  const { user, logout, switchRole } = useAuth();
  const { 
    selectedBranch, setSelectedBranch, branches, 
    lang, changeLanguage, theme, toggleTheme, 
    usdRate, setGlobalSearchOpen, t 
  } = useApp();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const roles = [
    { key: 'admin', label: "Do'kon Egasi (Admin)", desc: "Barcha filiallar, to'liq foyda, xodimlar va sozlamalar", color: "bg-purple-600" },
    { key: 'manager', label: "Menejer", desc: "Sotuv, xarid, ombor va xodimlar nazorati", color: "bg-blue-600" },
    { key: 'seller', label: "Sotuvchi (POS)", desc: "Tezkor POS savdo, mijozlar, ombor qoldig'i (Tannarx yopiq)", color: "bg-emerald-600" },
    { key: 'cashier', label: "Kassir", desc: "Kassa, to'lovlar, nasiya, smena ochish/yopish", color: "bg-amber-600" },
    { key: 'warehouse', label: "Omborchi", desc: "Telefon qabul qilish, inventarizatsiya, ko'chirish", color: "bg-cyan-600" },
    { key: 'technician', label: "Usta-Muhandis", desc: "Ta'mirlash buyurtmalari va ehtiyot qismlar", color: "bg-rose-600" },
  ];

  const currentRoleInfo = roles.find(r => r.key === user?.role) || roles[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="flex items-center justify-between px-3 md:px-6 py-2">
        
        {/* Left: Hamburger menu + Brand + Branch */}
        <div className="flex items-center gap-3">
          
          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={onToggleSidebar}
            className="btn-icon text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            title="Menyuni ochish"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div 
            onClick={() => onNavigate('dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-base md:text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                SMARTPHONE PRO
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 -mt-1 tracking-wider">
                Savdo & Ombor Tizimi
              </span>
            </div>
          </div>

          {/* Branch Switcher */}
          <div className="hidden lg:flex items-center h-9 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 text-xs border border-slate-200/80 dark:border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mr-1.5 shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Barcha filiallar (Tarmoq)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Quick Search Trigger */}
        <div className="flex-1 max-w-sm mx-4 hidden md:block">
          <button
            onClick={() => setGlobalSearchOpen(true)}
            className="w-full h-9 flex items-center justify-between px-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>IMEI, model yoki mijoz qidirish...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Currency Rate, Role Switcher, Lang, Theme, User */}
        <div className="flex items-center gap-2">
          
          {/* USD Exchange Rate Pill */}
          <div className="hidden xl:flex items-center gap-1.5 h-9 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold">
            <DollarSign className="w-3.5 h-3.5" />
            <span>1$ = {usdRate.toLocaleString()} so'm</span>
          </div>

          {/* Role Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className={`h-9 flex items-center gap-1.5 px-3.5 text-xs font-bold text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer ${currentRoleInfo.color}`}
              title="Alohida lavozim ish oynasini sinash uchun bosing"
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Rol:</span>
              <span className="truncate max-w-[120px]">{currentRoleInfo.label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80 shrink-0" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Lavozim Ish Oynasini Almashtirish
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    TZ bo'yicha har bir lavozim o'ziga ruxsat etilgan ma'lumotlarni ko'radi
                  </p>
                </div>
                <div className="py-1">
                  {roles.map(r => (
                    <button
                      key={r.key}
                      onClick={() => {
                        switchRole(r.key);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                        user?.role === r.key ? 'bg-indigo-50/70 dark:bg-indigo-900/30' : ''
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${r.color}`} />
                      <div>
                        <p className={`text-xs font-bold ${user?.role === r.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {r.label}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                          {r.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="hidden sm:flex items-center h-9 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => changeLanguage('uz_lat')}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'uz_lat' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
              O'zb
            </button>
            <button
              onClick={() => changeLanguage('uz_cyr')}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'uz_cyr' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
              Ўзб
            </button>
            <button
              onClick={() => changeLanguage('ru')}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'ru' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
              Рус
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn-icon text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Mavzuni almashtirish (Qorong'i / Yorug')"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-xs shadow-xs" title={user?.name}>
              {user?.name?.charAt(0) || 'A'}
            </div>
            <button
              onClick={logout}
              className="btn-icon text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Tizimdan chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
