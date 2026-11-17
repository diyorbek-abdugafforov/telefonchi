import React from 'react';
import { 
  LayoutDashboard, ShoppingCart, Smartphone, ShoppingBag, 
  Users, Truck, Wallet, Wrench, BarChart3, ShieldCheck, 
  Settings, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function Sidebar({ currentPage, onNavigate, isMobile = false }) {
  const { user } = useAuth();
  const { t } = useApp();
  const role = user?.role || 'admin';

  // Navigation items based on role
  let navItems = [];

  if (role === 'admin') {
    navItems = [
      { id: 'dashboard', label: "Bosh Boshqaruv (Dashboard)", desc: "Umumiy ko'rsatkichlar va tezkor boshqaruv", icon: LayoutDashboard },
      { id: 'pos', label: "Sotuv (POS Ekrani)", desc: "Mijozga sotish, kassa cheki, Trade-In", icon: ShoppingCart, badge: "Asosiy" },
      { id: 'inventory', label: "Ombor (Telefonlar)", desc: "IMEI, modellar, qoldiqlar va yangi kiritish", icon: Smartphone },
      { id: 'purchases', label: "Xarid & Skupka", desc: "Ta'minotchi buyurtmalari va A4 dalolatnoma", icon: ShoppingBag },
      { id: 'finance', label: "Moliya & Smena", desc: "Kassa hisoblari, smenalar, xarajatlar", icon: Wallet },
      { id: 'customers', label: "Mijozlar & Nasiya", desc: "CRM, qarzdorlik va to'lov grafigi", icon: Users },
      { id: 'suppliers', label: "Ta'minotchilar", desc: "Yetkazib beruvchilar va akt-sverka", icon: Truck },
      { id: 'repairs', label: "Ta'mirlash & Servis", desc: "Buyurtmalar va IMEI kafolat tekshiruvi", icon: Wrench },
      { id: 'reports', label: "Hisobotlar (P&L)", desc: "Sof foyda, xodimlar KPI, Excel eksport", icon: BarChart3 },
      { id: 'staff_security', label: "Xodimlar & Xavfsizlik", desc: "Rollar, arxivlash, faol seanslar va audit", icon: ShieldCheck },
      { id: 'settings', label: "Tizim Sozlamalari", desc: "USD kursi, filiallar, brend va modellar", icon: Settings },
    ];
  } else if (role === 'manager') {
    navItems = [
      { id: 'dashboard', label: "Bosh Boshqaruv (Dashboard)", desc: "Savdo va ombor tahlili", icon: LayoutDashboard },
      { id: 'pos', label: "Sotuv (POS Ekrani)", desc: "Kassa va savdo", icon: ShoppingCart },
      { id: 'inventory', label: "Ombor (Telefonlar)", desc: "Telefonlar va aksessuarlar", icon: Smartphone },
      { id: 'purchases', label: "Xarid & Skupka", desc: "Qabul qilish va skupka dalolatnomasi", icon: ShoppingBag },
      { id: 'customers', label: "Mijozlar Bazasi", desc: "Mijozlar va nasiya qarzlari", icon: Users },
      { id: 'suppliers', label: "Ta'minotchilar", desc: "Yetkazib beruvchilar", icon: Truck },
      { id: 'repairs', label: "Ta'mirlash & Kafolat", desc: "Servis nazorati", icon: Wrench },
      { id: 'reports', label: "Hisobotlar (P&L)", desc: "Savdo va foyda tahlili", icon: BarChart3 },
    ];
  } else if (role === 'seller') {
    navItems = [
      { id: 'pos', label: "Sotuv (POS Ekrani)", desc: "Mijozga sotish, kassa cheki, Trade-In", icon: ShoppingCart, badge: "Asosiy" },
      { id: 'purchases', label: "Skupka & Qabul Qilish", desc: "Aholidan telefon sotib olish va A4 akt", icon: ShoppingBag, badge: "Qabul" },
      { id: 'inventory', label: "Ombor Qoldig'i", desc: "Mavjud telefonlar va sotuv narxlari", icon: Smartphone },
      { id: 'repairs', label: "Kafolat Tekshiruvi", desc: "IMEI orqali kafolat muddatini ko'rish", icon: Wrench },
    ];
  } else if (role === 'cashier') {
    navItems = [
      { id: 'finance', label: "Kassa & Smena", desc: "Smena ochish/yopish, qoldiqlar", icon: Wallet, badge: "Asosiy" },
      { id: 'pos', label: "Sotuv & To'lovlar", desc: "Cheklar va to'lov qabul qilish", icon: ShoppingCart },
      { id: 'purchases', label: "Skupka & Qabul Qilish", desc: "Aholidan telefon sotib olish va kassa chiqimi", icon: ShoppingBag, badge: "Qabul" },
      { id: 'customers', label: "Nasiya To'lovlari", desc: "Muddati kelgan to'lovlar", icon: Users },
    ];
  } else if (role === 'warehouse') {
    navItems = [
      { id: 'inventory', label: "Ombor Boshqaruvi", desc: "Qoldiqlar va inventarizatsiya", icon: Smartphone, badge: "Asosiy" },
      { id: 'purchases', label: "Qabul Qilish & Skupka", desc: "Yangi telefonlarni kirim qilish", icon: ShoppingBag },
      { id: 'repairs', label: "Ta'mirdan Qabul", desc: "Servisdan chiqqan telefonlar", icon: Wrench },
    ];
  } else if (role === 'technician') {
    navItems = [
      { id: 'repairs', label: "Ta'mirlash Buyurtmalari", desc: "Mijoz va ombor telefonlari", icon: Wrench, badge: "Asosiy" },
      { id: 'inventory', label: "Ombor & Ehtiyot Qismlar", desc: "Qismlar qoldig'i", icon: Smartphone },
    ];
  }

  const roleTitleMap = {
    admin: "Do'kon Egasi (Admin)",
    manager: "Menejer Ish Oynasi",
    seller: "Sotuvchi Ish Oynasi",
    cashier: "Kassir Ish Oynasi",
    warehouse: "Omborchi Ish Oynasi",
    technician: "Usta-Muhandis Oynasi"
  };

  const roleBadgeColor = {
    admin: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    manager: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    seller: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    cashier: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    warehouse: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    technician: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  };

  return (
    <aside className={`w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between py-4 px-3 select-none transition-colors h-[calc(100vh-61px)] overflow-y-auto ${isMobile ? 'flex' : 'hidden md:flex'}`}>
      
      <div>
        {/* Active Role Indicator Card */}
        <div className={`mb-3 p-3 rounded-2xl border ${roleBadgeColor[role] || 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
              Faol Ish Paneli:
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs font-black mt-0.5">
            {roleTitleMap[role] || role}
          </p>
          <p className="text-[10px] opacity-80 mt-0.5">
            {user?.name}
          </p>
        </div>

        {/* Section title */}
        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Asosiy Bo'limlar
        </p>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all group text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-xl ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                  }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="truncate">
                    <p className="truncate leading-tight">{item.label}</p>
                    <p className={`text-[10px] font-normal truncate mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {item.desc}
                    </p>
                  </div>
                </div>

                {item.badge && !isActive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 px-2 mt-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Tizim holati
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">Faol (v1.0)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
            15 xonali Luhn IMEI tekshiruvi yoqilgan.
          </p>
        </div>
      </div>

    </aside>
  );
}
