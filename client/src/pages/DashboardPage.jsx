import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Smartphone, DollarSign, Wallet, AlertTriangle, 
  Clock, Users, Package, CheckCircle2,
  Calendar, Award, ShoppingCart, ShoppingBag, 
  Wrench, BarChart3, ChevronRight, Sparkles, Building2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function DashboardPage({ onNavigate }) {
  const { user, canViewCostPrice, canViewProfit } = useAuth();
  const { selectedBranch, t, theme } = useApp();

  const [period, setPeriod] = useState('month'); // 'today', 'week', 'month', 'year'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/dashboard/stats?period=${period}&branch_id=${selectedBranch}`);
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period, selectedBranch]);

  const metrics = stats?.metrics || {};

  const roleTitles = {
    admin: "Do'kon Egasi / Bosh Ma'mur",
    manager: "Menejer / Do'kon Boshqaruvchisi",
    seller: "Sotuvchi (POS)",
    cashier: "Kassir (Moliya & Kassa)",
    warehouse: "Omborchi (Qabul & O'tkazma)",
    technician: "Usta-Muhandis (Servis)"
  };

  // Quick Action Cards - Clean, modern, adaptive
  const quickActions = [
    {
      id: 'pos',
      title: "1. Yangi Sotuv Qilish (POS)",
      desc: "Shtrix-kod / IMEI orqali sotish, 80mm kassa cheki, A4 kafolat qog'ozi, Trade-In va Nasiya",
      icon: ShoppingCart,
      colorClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
      borderHover: "hover:border-blue-500",
      badge: "Kassa & POS"
    },
    {
      id: 'inventory',
      title: "2. Ombor (Telefonlar Qoldig'i)",
      desc: "Do'kondagi barcha telefonlar, 15 xonali IMEI, batareya foizi va yangi telefon kiritish",
      icon: Smartphone,
      colorClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      borderHover: "hover:border-emerald-500",
      badge: "Ombor"
    },
    {
      id: 'purchases',
      title: "3. Xarid & Skupka Qabuli",
      desc: "Aholidan B/U telefon sotib olish (Pasport + A4 Dalolatnoma) yoki ta'minotchidan qabul qilish",
      icon: ShoppingBag,
      colorClass: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300",
      borderHover: "hover:border-purple-500",
      badge: "Skupka"
    },
    {
      id: 'finance',
      title: "4. Kassa & Smena Boshqaruvi",
      desc: "Kunlik kassa smenasini ochish/yopish, kamomad/ortiqcha hisobi, xarajatlar va kassa qoldiqlari",
      icon: Wallet,
      colorClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
      borderHover: "hover:border-amber-500",
      badge: "Kassa"
    },
    {
      id: 'repairs',
      title: "5. Ta'mirlash & Kafolat",
      desc: "Mijoz telefonini ta'mirga qabul qilish, usta tayinlash va IMEI orqali kafolat muddatini ko'rish",
      icon: Wrench,
      colorClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
      borderHover: "hover:border-rose-500",
      badge: "Servis"
    },
    {
      id: 'reports',
      title: "6. Tahlil & Moliyaviy Hisobot (P&L)",
      desc: "Sof foyda, xarajatlar tahlili, sotuvchilar reytingi, Excel (.xlsx) va kunlik Telegram hisoboti",
      icon: BarChart3,
      colorClass: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
      borderHover: "hover:border-indigo-500",
      badge: "Foyda & P&L"
    },
  ];

  // Filter quick actions strictly based on role
  const role = user?.role || 'admin';
  const filteredQuickActions = quickActions.filter(act => {
    if (role === 'seller') {
      return ['pos', 'purchases', 'inventory', 'repairs'].includes(act.id);
    }
    if (role === 'cashier') {
      return ['finance', 'pos'].includes(act.id);
    }
    if (role === 'warehouse') {
      return ['inventory', 'purchases', 'repairs'].includes(act.id);
    }
    if (role === 'technician') {
      return ['repairs', 'inventory'].includes(act.id);
    }
    return true; // admin and manager get all
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* 1. Clean, Balanced Welcome Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/80 dark:border-indigo-800/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Telefon Savdosi va Ombor Tizimi
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Tizim Faol
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Assalomu alaykum, {user?.name || 'Foydalanuvchi'}!
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Siz hozir <strong className="text-indigo-600 dark:text-indigo-400 font-bold">"{roleTitles[user?.role] || user?.role}"</strong> lavozimidasiz. 
              {role === 'seller' 
                ? " Siz uchun faqat sotuv (POS), telefon qabul qilish (Skupka) va ombordagi qoldiqlar bo'limi ajratilgan."
                : " Do'koningiz barcha tushumlari, sof foydasi va ombor zaxirasini to'liq nazorat qilishingiz mumkin."}
            </p>
          </div>

          {/* Quick Period Selector */}
          <div className="flex items-center h-9 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold self-start md:self-auto">
            {[
              { id: 'today', label: 'Bugun' },
              { id: 'week', label: 'Hafta' },
              { id: 'month', label: 'Shu oy' },
              { id: 'year', label: 'Yil' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`h-7 px-3 rounded-lg transition-all cursor-pointer ${
                  period === p.id 
                    ? 'bg-indigo-600 text-white shadow-xs font-black' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. "Tezkor Amallar" — Clean Navigation Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Tezkor Amallar — Qayerga o'tmoqchisiz?
          </h2>
          <span className="text-xs text-slate-400">Kerakli amalni bosing ➔</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredQuickActions.map(act => {
            const Icon = act.icon;
            return (
              <div
                key={act.id}
                onClick={() => onNavigate(act.id)}
                className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 ${act.borderHover} shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-9 h-9 rounded-xl ${act.colorClass} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {act.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {act.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {act.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <span>Bo'limga o'tish</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Tushum (Owner/Admin) or Personal Sales (Seller) */}
        {canViewProfit() ? (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Sof Savdo Tushumi
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {Number(metrics.total_revenue || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-400">so'm</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
                <span>{metrics.total_sales_count || 0} ta muvaffaqiyatli sotuv</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Sizning Sotuvlaringiz
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {metrics.total_sales_count || 0} <span className="text-xs font-semibold text-slate-400">ta chek</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Kassada rasmiylashtirilgan savdolar
              </p>
            </div>
          </div>
        )}

        {/* KPI 2: Sof Foyda (Admin/Owner) or Skupka Faolligi (Seller) */}
        {canViewProfit() ? (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Sof Foyda (Net Profit)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {Number(metrics.net_profit || 0).toLocaleString()} <span className="text-xs font-semibold text-emerald-500">so'm</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between font-medium">
                <span>Rentabellik: <strong className="text-emerald-600 dark:text-emerald-400">{metrics.margin_pct || 0}%</strong></span>
                <span>Yalpi: {Number(metrics.total_gross_profit || 0).toLocaleString()}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Skupka & Qabul Qilish
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                Aholidan Qabul
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pasport bilan A4 akt chiqarish
              </p>
            </div>
          </div>
        )}

        {/* KPI 3: Sotilgan Telefonlar */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sotilgan Telefonlar
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {(metrics.count_new_sold || 0) + (metrics.count_used_sold || 0)} <span className="text-xs font-semibold text-slate-400">dona</span>
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs font-bold">
              <span className="text-blue-600 dark:text-blue-400">Yangi: {metrics.count_new_sold || 0} ta</span>
              <span className="text-amber-600 dark:text-amber-400">B/U: {metrics.count_used_sold || 0} ta</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Omborda Qoldiq */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Omborda Qoldiq
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.total_devices_in_stock || 0} <span className="text-xs font-semibold text-slate-400">ta telefon</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
              {canViewProfit() && metrics.total_stock_cost_value ? (
                <span>Tannarx: {Number(metrics.total_stock_cost_value).toLocaleString()} so'm</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Sotuvga tayyor qoldiqlar</span>
              )}
            </p>
          </div>
        </div>

      </div>

      {/* 4. Cash Balances Strip - Admin/Owner Only */}
      {canViewProfit() && stats?.cashBalances?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Kassalardagi Haqiqiy Qoldiqlar
              </h4>
            </div>
            {metrics.total_receivable !== undefined && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Nasiya kutilayotgan qarzlar: <strong className="text-rose-600 dark:text-rose-400">{Number(metrics.total_receivable || 0).toLocaleString()} so'm</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.cashBalances.map((acc, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700"
              >
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate">
                  {acc.name}
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">
                  {Number(acc.balance).toLocaleString()} {acc.type === 'cash_usd' ? '$' : 'so\'m'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Sales Dynamics & Top Models */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Savdo Dinamikasi (Oxirgi 14 kun)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tushum va kunlik ko'rsatkichlar tahlili</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {stats?.chartSales && stats.chartSales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartSales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="sale_date" tickLine={false} tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                  <YAxis 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} 
                    tickFormatter={(v) => canViewProfit() ? `${(v / 1000000).toFixed(0)}M` : `${v} ta`} 
                  />
                  <Tooltip 
                    formatter={(val) => [canViewProfit() ? `${Number(val).toLocaleString()} so'm` : `${val} ta sotuv`]}
                    contentStyle={{ 
                      borderRadius: 12, 
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                      color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                    }}
                  />
                  {canViewProfit() ? (
                    <>
                      <Area type="monotone" dataKey="revenue" name="Tushum" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                      <Area type="monotone" dataKey="profit" name="Foyda" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                    </>
                  ) : (
                    <Area type="monotone" dataKey="count" name="Sotuvlar soni" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Ushbu davrda hali savdo ma'lumotlari mavjud emas
              </div>
            )}
          </div>
        </div>

        {/* Top Models */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Eng Ko'p Sotilgan Modellar</span>
            </h4>

            <div className="space-y-2">
              {stats?.topModels?.length > 0 ? (
                stats.topModels.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                      {m.item_name}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                      {m.sold_count} ta
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">Hali sotuvlar bo'lmagan</p>
              )}
            </div>
          </div>

          {/* Top Sellers */}
          {canViewProfit() && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Faol Sotuvchilar</span>
              </h4>

              <div className="space-y-2">
                {stats?.topSellers?.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</span>
                      <span className="block text-[10px] text-slate-500">{s.sales_count} ta sotuv</span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(s.total_revenue).toLocaleString()} so'm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 6. Critical System Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Low Stock Alert */}
        <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <h5 className="text-xs font-bold uppercase tracking-wider">
              Qoldig'i Kamaygan Aksessuarlar
            </h5>
          </div>
          <div className="space-y-1.5">
            {stats?.alerts?.lowStockAccessories?.length > 0 ? (
              stats.alerts.lowStockAccessories.map((a, i) => (
                <div key={i} className="flex justify-between items-center text-xs text-amber-900 dark:text-amber-200 bg-white/90 dark:bg-slate-800/80 p-2 rounded-xl">
                  <span className="truncate max-w-[180px]">{a.name}</span>
                  <span className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded">
                    Qoldiq: {a.stock_qty} ta
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-amber-700/80 dark:text-amber-400 py-1">Barcha aksessuarlar yetarli miqdorda</p>
            )}
          </div>
        </div>

        {/* Aging Stock Phones Alert (>30 kun) */}
        <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-rose-800 dark:text-rose-400">
            <Clock className="w-4 h-4" />
            <h5 className="text-xs font-bold uppercase tracking-wider">
              Uzoq Yotgan Telefonlar (&gt;30 kun)
            </h5>
          </div>
          <div className="space-y-1.5">
            {stats?.alerts?.agingPhones?.length > 0 ? (
              stats.alerts.agingPhones.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xs text-rose-900 dark:text-rose-200 bg-white/90 dark:bg-slate-800/80 p-2 rounded-xl">
                  <span className="truncate max-w-[170px]">{p.model_name}</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400 text-[10px]">
                    {p.days_in_stock} kun turibdi
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-rose-700/80 dark:text-rose-400 py-1">Uzoq qolgan tovarlar yo'q</p>
            )}
          </div>
        </div>

        {/* Overdue Installments Alert */}
        <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-purple-800 dark:text-purple-400">
            <Clock className="w-4 h-4" />
            <h5 className="text-xs font-bold uppercase tracking-wider">
              Muddati O'tgan Nasiyalar
            </h5>
          </div>
          <div className="space-y-1.5">
            {stats?.alerts?.overdueInstallments?.length > 0 ? (
              stats.alerts.overdueInstallments.map((inst, i) => (
                <div key={i} className="flex justify-between items-center text-xs text-purple-900 dark:text-purple-200 bg-white/90 dark:bg-slate-800/80 p-2 rounded-xl">
                  <span className="truncate max-w-[160px]">{inst.customer_name}</span>
                  <span className="font-bold text-rose-600">
                    {Number(inst.monthly_amount).toLocaleString()} so'm
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-purple-700/80 dark:text-purple-400 py-1">Qarzdorlik muddati o'tganlar yo'q</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
