import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Smartphone, DollarSign, Wallet, AlertTriangle, 
  Clock, Users, Package, CheckCircle2,
  Calendar, Award, ShoppingCart, ShoppingBag, 
  Wrench, BarChart3, ChevronRight, ChevronLeft, Sparkles, Building2,
  Megaphone, Bell, ShieldCheck, ArrowUpRight, Activity, Flame,
  CheckCircle, PlusCircle, UserCheck, FileText
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function DashboardPage({ onNavigate }) {
  const { user, canViewCostPrice, canViewProfit } = useAuth();
  const { selectedBranch, t, theme, usdRate } = useApp();

  const [period, setPeriod] = useState('month'); // 'today', 'week', 'month', 'year'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);

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

  // 1. Latest News / Ticker Items matching reference image
  const newsItems = [
    { text: "Yangi iPhone 16 Pro Max qabul qilindi — Aholidan Skupka orqali", badge: "Yangi", color: "bg-emerald-500 text-white" },
    { text: `Rasmiy USD kursi: 1$ = ${Number(usdRate || 12850).toLocaleString()} so'm yangilandi`, badge: "Valyuta", color: "bg-blue-500 text-white" },
    { text: "Kunlik kassa smenasi muvaffaqiyatli ochildi va to'lovlar qabul qilinmoqda", badge: "Kassa", color: "bg-purple-500 text-white" },
    { text: "e-Kafolat va IMEI tekshiruv tizimi 2.0 versiyasiga yangilandi", badge: "Tizim", color: "bg-indigo-500 text-white" },
    { text: "Malika A-24 filiali bugun to'liq faoliyat yuritmoqda (qoldiq: 140+ ta)", badge: "Filial", color: "bg-amber-500 text-white" },
  ];

  const handleNextNews = () => {
    setActiveNewsIndex(prev => (prev + 1) % newsItems.length);
  };

  const handlePrevNews = () => {
    setActiveNewsIndex(prev => (prev - 1 + newsItems.length) % newsItems.length);
  };

  // Auto rotate news every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      handleNextNews();
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Quick Action Buttons matching reference image
  const quickActions = [
    {
      id: 'pos',
      title: "Yangi Sotuv (POS)",
      desc: "Kassa, chek va Trade-In",
      icon: ShoppingCart,
      glowColor: "from-blue-600/30 to-blue-900/30 border-blue-500/40 text-blue-400",
      iconBg: "bg-blue-600 text-white"
    },
    {
      id: 'purchases',
      title: "Skupka Qabul",
      desc: "Aholidan telefon sotib olish",
      icon: Smartphone,
      glowColor: "from-purple-600/30 to-purple-900/30 border-purple-500/40 text-purple-400",
      iconBg: "bg-purple-600 text-white"
    },
    {
      id: 'inventory',
      title: "Ombor Qoldig'i",
      desc: "Telefonlar va IMEI bazasi",
      icon: Package,
      glowColor: "from-emerald-600/30 to-emerald-900/30 border-emerald-500/40 text-emerald-400",
      iconBg: "bg-emerald-600 text-white"
    },
    {
      id: 'finance',
      title: "Kassa & Smena",
      desc: "Naqd, terminal va chiqim",
      icon: Wallet,
      glowColor: "from-amber-600/30 to-amber-900/30 border-amber-500/40 text-amber-400",
      iconBg: "bg-amber-600 text-white"
    },
    {
      id: 'repairs',
      title: "Ta'mirlash & Servis",
      desc: "Kafolat va usta nazorati",
      icon: Wrench,
      glowColor: "from-rose-600/30 to-rose-900/30 border-rose-500/40 text-rose-400",
      iconBg: "bg-rose-600 text-white"
    },
    {
      id: 'reports',
      title: "Hisobotlar (P&L)",
      desc: "Foyda va xodimlar KPI",
      icon: BarChart3,
      glowColor: "from-indigo-600/30 to-indigo-900/30 border-indigo-500/40 text-indigo-400",
      iconBg: "bg-indigo-600 text-white"
    },
  ];

  // Role filtering for quick actions
  const role = user?.role || 'admin';
  const filteredQuickActions = quickActions.filter(act => {
    if (role === 'seller') return ['pos', 'purchases', 'inventory', 'repairs'].includes(act.id);
    if (role === 'cashier') return ['finance', 'pos', 'purchases'].includes(act.id);
    if (role === 'warehouse') return ['inventory', 'purchases', 'repairs'].includes(act.id);
    if (role === 'technician') return ['repairs', 'inventory'].includes(act.id);
    return true;
  });

  // Data for Donut chart (Brand Distribution)
  const brandData = stats?.brandBreakdown?.length > 0 
    ? stats.brandBreakdown 
    : [
        { name: 'Apple', value: 38 },
        { name: 'Samsung', value: 24 },
        { name: 'Xiaomi', value: 16 },
        { name: 'Honor', value: 10 },
        { name: 'Boshqa', value: 6 }
      ];

  const brandColors = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f472b6'];
  const totalBrandCount = brandData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  // Data for Bar chart (Branch / Department Distribution)
  const branchData = stats?.branchDistribution?.length > 0
    ? stats.branchDistribution
    : [
        { name: 'Malika A-24', count: 48 },
        { name: 'Bosh ofis', count: 36 },
        { name: 'Chilonzor', count: 28 },
        { name: 'Yunusobod', count: 22 }
      ];

  const barColors = ['#38bdf8', '#a855f7', '#34d399', '#f97316', '#ec4899'];

  // Upcoming Events / Reminders
  const upcomingEvents = [
    {
      date: '20',
      month: 'Noy',
      title: "Nasiya to'lov muddati",
      subtitle: "Temur Xoliqov (Galaxy S24 Ultra)",
      type: "Nasiya",
      badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30"
    },
    {
      date: '22',
      month: 'Noy',
      title: "Ulgurji faktura qabuli",
      subtitle: "Dubai Optom (25 ta yangi iPhone)",
      type: "Xarid",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    },
    {
      date: '25',
      month: 'Noy',
      title: "Oylik inventarizatsiya",
      subtitle: "Barcha filiallar IMEI solishtiruvi",
      type: "Ombor",
      badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30"
    }
  ];

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('uz-UZ', { 
    weekday: 'short', 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-slate-100">
      
      {/* 1. TOP TICKER / LATEST NEWS BAR (Exact replica from reference image) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0d1636] via-[#101c45] to-[#0d1636] rounded-2xl p-2.5 px-4 border border-[#1e2a5a] shadow-lg flex items-center justify-between gap-3">
        
        {/* Left: Latest News Purple Pill */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md shadow-purple-500/30 flex items-center gap-1.5 shrink-0">
            <Megaphone className="w-3.5 h-3.5" />
            <span>Tezkor E'lonlar</span>
          </div>

          {/* Ticker Text */}
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="text-xs font-semibold text-slate-200 truncate">
              {newsItems[activeNewsIndex]?.text}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${newsItems[activeNewsIndex]?.color}`}>
              {newsItems[activeNewsIndex]?.badge}
            </span>
          </div>
        </div>

        {/* Right: Controls & Navigation */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 mr-2">
            <span>{activeNewsIndex + 1} / {newsItems.length}</span>
          </div>
          <button 
            onClick={handlePrevNews}
            className="w-7 h-7 rounded-lg bg-[#18234d] hover:bg-[#20306b] text-slate-300 hover:text-white flex items-center justify-center transition border border-[#263773]"
            title="Oldingi"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={handleNextNews}
            className="w-7 h-7 rounded-lg bg-[#18234d] hover:bg-[#20306b] text-slate-300 hover:text-white flex items-center justify-center transition border border-[#263773]"
            title="Keyingi"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. HERO BANNER & GREETING CARD (Matching reference image) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left 2 Cols: Scenic/Modern System Banner */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a122e] via-[#101e4a] to-[#0f2868] p-6 sm:p-8 border border-[#1e2f6a] shadow-xl flex flex-col justify-between min-h-[180px]">
          {/* Subtle background tech glow circle */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 top-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-black">
                SMARTPHONE PRO POS &bull; v2.0
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              Telefon Savdosi va Ombor Tizimi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Real vaqtda savdo, 15 xonali IMEI nazorati, kassa smenalari va aholidan pasport bilan qonuniy skupka qabuli
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2 sm:gap-3 flex-wrap text-[11px] font-bold text-slate-300">
            <span className="px-3 py-1 rounded-xl bg-[#14214d]/80 border border-[#243573] flex items-center gap-1.5 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              15 Xonali Luhn Nazorati
            </span>
            <span className="px-3 py-1 rounded-xl bg-[#14214d]/80 border border-[#243573] flex items-center gap-1.5 shadow-xs">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              A4 Skupka Dalolatnomasi
            </span>
            <span className="px-3 py-1 rounded-xl bg-[#14214d]/80 border border-[#243573] flex items-center gap-1.5 shadow-xs">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              P&L Sof Foyda Tahlili
            </span>
          </div>
        </div>

        {/* Right 1 Col: Profile & Welcome Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1433] via-[#101b44] to-[#141f4f] p-5 sm:p-6 border border-[#1e2f6a] shadow-xl flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {todayFormatted}
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-2">
                Xayrli kun, {user?.name?.split(' ')[0] || 'Foydalanuvchi'}!
              </h3>
              <p className="text-xs text-indigo-300 font-bold mt-0.5">
                {roleTitles[user?.role] || user?.role}
              </p>
            </div>

            {/* Glowing Brand Emblem */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25 shrink-0">
              <div className="w-full h-full bg-[#0a1129] rounded-[14px] flex items-center justify-center text-white">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e2d63] flex items-center justify-between text-xs">
            <span className="text-slate-400">Tanlangan filial:</span>
            <span className="font-bold text-white px-2 py-0.5 rounded-lg bg-indigo-950/80 border border-indigo-800 text-[11px]">
              {selectedBranch === 'all' ? "Barcha filiallar" : `Filial №${selectedBranch}`}
            </span>
          </div>
        </div>

      </div>

      {/* 3. 4 MAIN GLOWING METRIC CARDS (Exact match to reference image with mini SVG sparklines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Revenue (Blue Glow) */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0b1330] p-5 border border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.12)] hover:border-blue-400 transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {canViewProfit() ? "Tushum" : "Sotuvlar"}
            </span>
          </div>

          <div className="mt-4">
            <span className="text-xs font-bold text-slate-400 block">
              {canViewProfit() ? "Umumiy Savdo Tushumi" : "Sizning Cheklaringiz"}
            </span>
            <div className="text-2xl font-black text-white tracking-tight mt-1">
              {canViewProfit() ? (
                <>
                  {Number(metrics.total_revenue || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">so'm</span>
                </>
              ) : (
                <>
                  {metrics.total_sales_count || 0} <span className="text-xs font-bold text-slate-400">ta chek</span>
                </>
              )}
            </div>
          </div>

          {/* Sparkline curve & Growth indicator */}
          <div className="mt-3 pt-2.5 border-t border-[#172454] flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12.4%</span>
              <span className="text-slate-400 text-[10px] ml-1 font-normal">o'tgan oyga</span>
            </span>

            {/* Blue Mini Sparkline SVG */}
            <svg className="w-20 h-6 shrink-0" viewBox="0 0 80 24" fill="none">
              <path d="M 0 18 Q 15 22, 30 10 T 55 12 T 80 4" stroke="#38bdf8" strokeWidth="2" fill="none" />
              <path d="M 0 18 Q 15 22, 30 10 T 55 12 T 80 4 L 80 24 L 0 24 Z" fill="url(#blueSparkGrad)" opacity="0.25" />
              <defs>
                <linearGradient id="blueSparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Metric 2: Net Profit (Green/Emerald Glow) */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0b1330] p-5 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.12)] hover:border-emerald-400 transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-md">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {canViewProfit() ? "Sof Foyda" : "Faollik"}
            </span>
          </div>

          <div className="mt-4">
            <span className="text-xs font-bold text-slate-400 block">
              {canViewProfit() ? "Do'kon Sof Foydasi" : "Muvaffaqiyatli Bitimlar"}
            </span>
            <div className="text-2xl font-black text-emerald-400 tracking-tight mt-1">
              {canViewProfit() ? (
                <>
                  {Number(metrics.net_profit || 0).toLocaleString()} <span className="text-xs font-bold text-emerald-500/80">so'm</span>
                </>
              ) : (
                <>
                  {metrics.total_sales_count || 0} <span className="text-xs font-bold text-slate-400">ta muvaffaqiyatli</span>
                </>
              )}
            </div>
          </div>

          {/* Sparkline curve & Growth indicator */}
          <div className="mt-3 pt-2.5 border-t border-[#172454] flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{canViewProfit() ? `${metrics.margin_pct || 18.5}% rentabellik` : "100% faol"}</span>
            </span>

            {/* Emerald Mini Sparkline SVG */}
            <svg className="w-20 h-6 shrink-0" viewBox="0 0 80 24" fill="none">
              <path d="M 0 20 Q 20 8, 40 14 T 65 6 T 80 2" stroke="#34d399" strokeWidth="2" fill="none" />
              <path d="M 0 20 Q 20 8, 40 14 T 65 6 T 80 2 L 80 24 L 0 24 Z" fill="url(#greenSparkGrad)" opacity="0.25" />
              <defs>
                <linearGradient id="greenSparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Metric 3: Warehouse Stock (Purple/Violet Glow) */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0b1330] p-5 border border-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.12)] hover:border-purple-400 transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Ombor
            </span>
          </div>

          <div className="mt-4">
            <span className="text-xs font-bold text-slate-400 block">
              Mavjud Telefonlar Qoldig'i
            </span>
            <div className="text-2xl font-black text-white tracking-tight mt-1">
              {metrics.total_devices_in_stock || 0} <span className="text-xs font-bold text-slate-400">dona telefon</span>
            </div>
          </div>

          {/* Sparkline curve & Subtitle */}
          <div className="mt-3 pt-2.5 border-t border-[#172454] flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-300">
              15 xonali IMEI bilan
            </span>

            {/* Purple Mini Sparkline SVG */}
            <svg className="w-20 h-6 shrink-0" viewBox="0 0 80 24" fill="none">
              <path d="M 0 12 Q 20 22, 40 8 T 65 14 T 80 6" stroke="#c084fc" strokeWidth="2" fill="none" />
              <path d="M 0 12 Q 20 22, 40 8 T 65 14 T 80 6 L 80 24 L 0 24 Z" fill="url(#purpleSparkGrad)" opacity="0.25" />
              <defs>
                <linearGradient id="purpleSparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Metric 4: Sold Devices (Amber/Orange Glow) */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0b1330] p-5 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.12)] hover:border-amber-400 transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Savdo
            </span>
          </div>

          <div className="mt-4">
            <span className="text-xs font-bold text-slate-400 block">
              Sotilgan Jami Qurilmalar
            </span>
            <div className="text-2xl font-black text-amber-400 tracking-tight mt-1">
              {(metrics.count_new_sold || 0) + (metrics.count_used_sold || 0)} <span className="text-xs font-bold text-slate-400">dona</span>
            </div>
          </div>

          {/* Sparkline curve & Breakdown */}
          <div className="mt-3 pt-2.5 border-t border-[#172454] flex items-center justify-between text-[11px] font-bold">
            <span className="text-blue-400">Yangi: {metrics.count_new_sold || 0} ta</span>
            <span className="text-amber-400">B/U: {metrics.count_used_sold || 0} ta</span>

            {/* Amber Mini Sparkline SVG */}
            <svg className="w-16 h-6 shrink-0" viewBox="0 0 64 24" fill="none">
              <path d="M 0 16 Q 16 4, 32 14 T 48 6 T 64 2" stroke="#fbbf24" strokeWidth="2" fill="none" />
              <path d="M 0 16 Q 16 4, 32 14 T 48 6 T 64 2 L 64 24 L 0 24 Z" fill="url(#amberSparkGrad)" opacity="0.25" />
              <defs>
                <linearGradient id="amberSparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

      </div>

      {/* 4. MIDDLE ROW: DONUT CHART + BAR CHART + RECENT ACTIVITY (Exact match to reference image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 4 Cols: DONUT CHART (Brand Distribution / "Leave Overview" replica) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0b1330] p-5 border border-[#1e2a5a] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#18234e]">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Brendlar Ulushi (Omborda)</span>
            </h4>
            <span className="text-[11px] font-bold text-slate-400 bg-[#141e47] px-2 py-0.5 rounded-lg border border-[#20306c]">
              Shu oy
            </span>
          </div>

          {/* Donut Chart with Center Total */}
          <div className="my-2 relative flex items-center justify-center h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {brandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={brandColors[index % brandColors.length]} stroke="#0b1330" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val, name) => [`${val} ta telefon`, name]}
                  contentStyle={{ backgroundColor: '#0f1738', borderColor: '#22316c', borderRadius: 12, color: '#fff', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jami</span>
              <span className="text-xl font-black text-white">{totalBrandCount || 100}</span>
              <span className="text-[9px] text-slate-400">telefon</span>
            </div>
          </div>

          {/* Legend Items with Color Dots, Counts and Percentages */}
          <div className="space-y-1.5 pt-2 border-t border-[#18234e] text-xs">
            {brandData.map((b, i) => {
              const pct = totalBrandCount > 0 ? Math.round((b.value / totalBrandCount) * 100) : 20;
              return (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: brandColors[i % brandColors.length] }} />
                    <span className="font-semibold text-slate-300">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400">{b.value} ta</span>
                    <span className="font-bold text-white w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center 4 Cols: BAR CHART (Distribution by Branch / "Employee Distribution" replica) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0b1330] p-5 border border-[#1e2a5a] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#18234e]">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Filiallar Bo'yicha Taqsimot</span>
            </h4>
            <span className="text-[11px] font-bold text-slate-400 bg-[#141e47] px-2 py-0.5 rounded-lg border border-[#20306c]">
              Ombor
            </span>
          </div>

          {/* Vertical Bar Chart with Values */}
          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#172454" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  formatter={(val) => [`${val} dona telefon`, "Qoldiq"]}
                  contentStyle={{ backgroundColor: '#0f1738', borderColor: '#22316c', borderRadius: 12, color: '#fff', fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {branchData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-[#18234e] flex items-center justify-between text-xs text-slate-400">
            <span>Eng yuqori zaxira:</span>
            <span className="font-bold text-emerald-400">{branchData[0]?.name || 'Malika A-24'} ({branchData[0]?.count || 0} ta)</span>
          </div>
        </div>

        {/* Right 4 Cols: RECENT ACTIVITY TIMELINE (Exact match to reference image) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0b1330] p-5 border border-[#1e2a5a] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#18234e]">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Oxirgi Harakatlar (Live)</span>
            </h4>
            <button 
              onClick={() => onNavigate('pos')}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Activity Timeline List */}
          <div className="space-y-3.5 my-3">
            {stats?.recentActivities?.length > 0 ? (
              stats.recentActivities.map((act, idx) => {
                const isSale = act.type === 'sale';
                const isBuyout = act.type === 'buyout';
                const isRepair = act.type === 'repair';

                const iconBg = isSale 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : isBuyout 
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                  : "bg-purple-500/20 text-purple-400 border-purple-500/30";

                const IconComponent = isSale ? ShoppingCart : isBuyout ? Smartphone : Wrench;

                const timeStr = act.created_at 
                  ? new Date(act.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) 
                  : "10:24";

                return (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className={`w-8 h-8 rounded-xl ${iconBg} border flex items-center justify-center shrink-0 mt-0.5`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="font-bold text-white truncate">{act.title}</h5>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{timeStr}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{act.subtitle}</p>
                      {act.amount && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 block mt-0.5">
                          {Number(act.amount).toLocaleString()} UZS
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              // Default Fallback Activities matching styling
              [
                { title: "Yangi sotuv rasmiylashtirildi", desc: "Chek №1042 — iPhone 16 Pro Max", time: "10:24", color: "emerald", icon: ShoppingCart },
                { title: "Aholidan skupka qabul qilindi", desc: "iPhone 15 Pro 128GB (8.8M UZS)", time: "09:48", color: "blue", icon: Smartphone },
                { title: "Kassa smenasi ochildi", desc: "Nilufar Qodirova (Kassir)", time: "09:12", color: "purple", icon: Wallet },
                { title: "Omborga yangi tovar kirdi", desc: "Galaxy S24 Ultra (Dubai Optom)", time: "08:45", color: "amber", icon: Package },
                { title: "Kafolat tekshirildi", desc: "IMEI 356984... kafolat faol", time: "08:20", color: "rose", icon: Wrench },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className={`w-8 h-8 rounded-xl bg-${item.color}-500/20 text-${item.color}-400 border border-${item.color}-500/30 flex items-center justify-center shrink-0 mt-0.5`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="font-bold text-white truncate">{item.title}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-[#18234e] flex items-center justify-between text-[11px] text-slate-400">
            <span>Status:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Doimiy sinxronizatsiya
            </span>
          </div>
        </div>

      </div>

      {/* 5. BOTTOM ROW: UPCOMING EVENTS + QUICK ACTIONS + SALES DYNAMICS (Exact match to reference image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left 4 Cols: UPCOMING EVENTS & REMINDERS */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0b1330] p-5 border border-[#1e2a5a] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#18234e]">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Muhim Eslatmalar & Rejalar</span>
            </h4>
            <span className="text-[11px] text-slate-400 hover:text-white cursor-pointer">Barchasi &rarr;</span>
          </div>

          <div className="space-y-3.5 my-3">
            {upcomingEvents.map((evt, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#0e173a] border border-[#192652]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex flex-col items-center justify-center shrink-0 text-center">
                    <span className="text-sm font-black text-indigo-300 leading-none">{evt.date}</span>
                    <span className="text-[9px] uppercase font-bold text-indigo-400 leading-none mt-0.5">{evt.month}</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">{evt.title}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{evt.subtitle}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${evt.badgeColor}`}>
                  {evt.type}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#18234e] text-center">
            <button 
              onClick={() => onNavigate('finance')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
            >
              + Yangi eslatma yoki nasiya muddatini qo'shish
            </button>
          </div>
        </div>

        {/* Center 4 Cols: QUICK ACTIONS GRID (3x2 Buttons from reference image) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0b1330] p-5 border border-[#1e2a5a] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#18234e]">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Tezkor Amallar (Quick Actions)</span>
            </h4>
            <span className="text-[11px] text-slate-400">Tezkor o'tish</span>
          </div>

          {/* 3x2 Grid of Glowing Action Cards */}
          <div className="grid grid-cols-2 gap-2.5 my-3">
            {filteredQuickActions.slice(0, 6).map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  onClick={() => onNavigate(act.id)}
                  className={`p-3 rounded-2xl bg-gradient-to-br ${act.glowColor} border hover:scale-105 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center text-center justify-center space-y-1.5 group`}
                >
                  <div className={`w-8 h-8 rounded-xl ${act.iconBg} flex items-center justify-center shadow-md`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {act.title}
                  </span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">
                    {act.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#18234e] flex items-center justify-between text-xs text-slate-400">
            <span>Ruxsat darajasi:</span>
            <span className="font-bold text-white">{roleTitles[user?.role] || user?.role}</span>
          </div>
        </div>

        {/* Right 4 Cols: SALES DYNAMICS / INSIGHTS AREA CHART */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0b1330] p-5 border border-[#1e2a5a] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#18234e]">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Savdo Dinamikasi</span>
            </h4>
            
            {/* Period Selector Tabs */}
            <div className="flex items-center bg-[#141e47] p-0.5 rounded-lg border border-[#20306c] text-[10px] font-bold">
              {['week', 'month', 'year'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-0.5 rounded-md transition ${period === p ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  {p === 'week' ? 'Hafta' : p === 'month' ? 'Oy' : 'Yil'}
                </button>
              ))}
            </div>
          </div>

          {/* Area Chart with Cyan and Purple/Green Gradients */}
          <div className="h-48 my-2">
            {stats?.chartSales && stats.chartSales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartSales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="glowRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="glowProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#172454" />
                  <XAxis dataKey="sale_date" tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#94a3b8' }} 
                    tickFormatter={(v) => canViewProfit() ? `${(v / 1000000).toFixed(0)}M` : `${v} ta`} 
                  />
                  <Tooltip 
                    formatter={(val) => [canViewProfit() ? `${Number(val).toLocaleString()} so'm` : `${val} ta sotuv`]}
                    contentStyle={{ backgroundColor: '#0f1738', borderColor: '#22316c', borderRadius: 12, color: '#fff', fontSize: 11 }}
                  />
                  {canViewProfit() ? (
                    <>
                      <Area type="monotone" dataKey="revenue" name="Tushum" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#glowRev)" />
                      <Area type="monotone" dataKey="profit" name="Foyda" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#glowProf)" />
                    </>
                  ) : (
                    <Area type="monotone" dataKey="count" name="Sotuvlar soni" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#glowRev)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Ushbu davrda ma'lumotlar mavjud emas
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#18234e] flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-blue-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              Tushum
            </span>
            {canViewProfit() && (
              <span className="flex items-center gap-1.5 text-purple-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                Sof Foyda
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 6. REAL CASH BALANCES STRIP (Admin & Cashier) */}
      {canViewProfit() && stats?.cashBalances?.length > 0 && (
        <div className="bg-[#0b1330] p-5 rounded-3xl border border-[#1e2a5a] shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Kassalardagi Haqiqiy Qoldiqlar
              </h4>
            </div>
            {metrics.total_receivable !== undefined && (
              <span className="text-xs text-slate-400">
                Nasiya kutilayotgan qarzlar: <strong className="text-rose-400 font-mono">{Number(metrics.total_receivable || 0).toLocaleString()} so'm</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.cashBalances.map((acc, idx) => (
              <div 
                key={idx} 
                className="p-3.5 bg-[#0e173a] rounded-2xl border border-[#192652] hover:border-emerald-500/40 transition"
              >
                <span className="text-xs font-medium text-slate-400 block truncate">
                  {acc.name}
                </span>
                <span className="text-base font-black text-white mt-1 block font-mono">
                  {Number(acc.balance).toLocaleString()} {acc.type === 'cash_usd' ? '$' : 'so\'m'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
