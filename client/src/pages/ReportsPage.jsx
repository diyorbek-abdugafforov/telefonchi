import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Users, Smartphone, FileSpreadsheet, 
  Send, Copy, Check, Download, Calendar, Filter, ArrowUpRight, ArrowDownRight, Percent
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function ReportsPage() {
  const { user, canViewCostPrice, canViewProfit } = useAuth();
  const { showToast, branches, selectedBranch } = useApp();

  const [activeTab, setActiveTab] = useState('pnl'); // pnl, sellers, new_vs_used, telegram
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st day of current month
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('all');
  const [sellerPeriod, setSellerPeriod] = useState('month');

  // Data states
  const [pnlData, setPnlData] = useState(null);
  const [sellersData, setSellersData] = useState([]);
  const [newVsUsedData, setNewVsUsedData] = useState([]);
  const [telegramSummary, setTelegramSummary] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeTab === 'pnl') loadPnl();
    else if (activeTab === 'sellers') loadSellers();
    else if (activeTab === 'new_vs_used') loadNewVsUsed();
    else if (activeTab === 'telegram') loadTelegramSummary();
  }, [activeTab, fromDate, toDate, branchId, sellerPeriod]);

  async function loadPnl() {
    setLoading(true);
    try {
      const res = await apiRequest(`/reports/pnl?from_date=${fromDate}&to_date=${toDate}&branch_id=${branchId}`);
      if (res.success) setPnlData(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadSellers() {
    setLoading(true);
    try {
      const res = await apiRequest(`/reports/sellers?period=${sellerPeriod}&branch_id=${branchId}`);
      if (res.success) setSellersData(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadNewVsUsed() {
    setLoading(true);
    try {
      const res = await apiRequest('/reports/new-vs-used');
      if (res.success) setNewVsUsedData(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadTelegramSummary() {
    setLoading(true);
    try {
      const res = await apiRequest('/reports/daily-summary');
      if (res.success) setTelegramSummary(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleCopyTelegram = () => {
    if (!telegramSummary?.telegramMessage) return;
    navigator.clipboard.writeText(telegramSummary.telegramMessage);
    setCopied(true);
    showToast("Telegram hisoboti nusxalandi!");
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadExcel = (type) => {
    const token = localStorage.getItem('token');
    const url = `/api/reports/export/${type}`;
    
    // Create an invisible anchor to trigger direct browser download with auth
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(resp => resp.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `${type}_hisobot_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("Excel fayli yuklab olindi");
    })
    .catch(err => {
      showToast("Yuklab olishda xatolik: " + err.message, 'error');
    });
  };

  if (!canViewProfit() && !canViewCostPrice()) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold text-rose-800 dark:text-rose-300">Ruxsat Cheklangan</h2>
        <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">
          Moliyaviy foyda va zararlar (P&L) hisobotlarini faqat Do'kon Egasi (Admin) va Menejer ko'rish huquqiga ega.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header and Quick Excel Exports */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Tahlil va Moliyaviy Hisobotlar (P&L)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Savdo tushumlari, sof foyda, xodimlar samaradorligi va Excel formatida yuklab olish.
          </p>
        </div>

        {/* Excel Export Quick Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadExcel('devices')}
            className="btn-success"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Telefonlar (.xlsx)
          </button>
          <button
            onClick={() => downloadExcel('sales')}
            className="btn-primary"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Sotuvlar (.xlsx)
          </button>
          <button
            onClick={() => downloadExcel('pnl')}
            className="btn-secondary"
          >
            <FileSpreadsheet className="w-4 h-4" />
            P&L Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'pnl', label: '1. Foyda va Zarar (P&L)', icon: DollarSign },
          { id: 'sellers', label: '2. Sotuvchilar Reytingi & KPI', icon: Users },
          { id: 'new_vs_used', label: '3. Yangi vs Ishlatilgan (B/U)', icon: Smartphone },
          { id: 'telegram', label: '4. Kunlik Telegram Xabari', icon: Send },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn-tab ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: P&L Statement */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-bold">Dan:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-bold">Gacha:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-bold">Filial:</span>
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="all">Barcha filiallar</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={loadPnl}
              className="btn-secondary"
            >
              Yangilash
            </button>
          </div>

          {/* KPI Metrics */}
          {pnlData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">Sof Savdo Tushumi</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {Number(pnlData.net_sales).toLocaleString()} <span className="text-xs font-normal">so'm</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Chegirmalar: -{Number(pnlData.discounts).toLocaleString()} so'm
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">Yalpi Foyda (Gross Profit)</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {Number(pnlData.gross_profit).toLocaleString()} <span className="text-xs font-normal">so'm</span>
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Rentabellik: {pnlData.margin_pct}%
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">Operatsion Xarajatlar</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {Number(pnlData.total_expenses).toLocaleString()} <span className="text-xs font-normal">so'm</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {pnlData.expenses_by_category?.length || 0} ta kategoriya bo'yicha
                </p>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 p-5 rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">Sof Foyda (Net Profit)</p>
                <p className="text-2xl font-black text-indigo-900 dark:text-white mt-1">
                  {Number(pnlData.net_profit).toLocaleString()} <span className="text-xs font-normal">so'm</span>
                </p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                  Sof Rentabellik: {pnlData.net_margin_pct}%
                </p>
              </div>
            </div>
          )}

          {/* Detailed Statement Table */}
          {pnlData && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                Moliyaviy Hisobot Tafsilotlari (P&L Ko'rsatkichlari)
              </h3>

              <div className="space-y-3 font-mono text-xs">
                
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="font-sans font-semibold text-slate-700 dark:text-slate-300">1. Yalpi Savdo (Gross Sales)</span>
                  <span className="font-bold">{Number(pnlData.gross_sales).toLocaleString()} so'm</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 text-rose-600">
                  <span className="font-sans font-semibold">2. Berilgan Chegirmalar (Discounts)</span>
                  <span>- {Number(pnlData.discounts).toLocaleString()} so'm</span>
                </div>

                <div className="flex justify-between py-2 bg-slate-50 dark:bg-slate-700/40 px-3 rounded-lg font-bold text-sm">
                  <span className="font-sans">3. Sof Tushum (Net Sales)</span>
                  <span>{Number(pnlData.net_sales).toLocaleString()} so'm</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 text-slate-500">
                  <span className="font-sans font-semibold">4. Sotilgan Mahsulotlar Tannarxi (COGS)</span>
                  <span>- {Number(pnlData.cogs).toLocaleString()} so'm</span>
                </div>

                <div className="flex justify-between py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 px-3 rounded-lg font-bold text-sm">
                  <span className="font-sans">5. Yalpi Foyda (Gross Profit = Sof Tushum - Tannarx)</span>
                  <span>{Number(pnlData.gross_profit).toLocaleString()} so'm ({pnlData.margin_pct}%)</span>
                </div>

                {/* Operating expenses sublist */}
                <div className="pt-2">
                  <p className="font-sans font-bold text-slate-700 dark:text-slate-300 mb-2">
                    6. Operatsion Xarajatlar (Opex):
                  </p>
                  <div className="pl-4 space-y-1.5 border-l-2 border-rose-300 dark:border-rose-800">
                    {pnlData.expenses_by_category?.length === 0 ? (
                      <p className="text-slate-400 font-sans italic">Ushbu davrda xarajatlar kiritilmagan</p>
                    ) : (
                      pnlData.expenses_by_category?.map(exp => (
                        <div key={exp.category} className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span className="font-sans">• {exp.category}</span>
                          <span>{Number(exp.total).toLocaleString()} so'm</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between font-bold text-rose-600 pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="font-sans">Jami Operatsion Xarajatlar:</span>
                      <span>- {Number(pnlData.total_expenses).toLocaleString()} so'm</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between py-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 px-4 rounded-xl font-bold text-base mt-4 border border-indigo-200 dark:border-indigo-800">
                  <span className="font-sans">7. SOF FOYDA (NET PROFIT = Yalpi Foyda - Xarajatlar)</span>
                  <span>{Number(pnlData.net_profit).toLocaleString()} so'm</span>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Sellers Leaderboard & KPI */}
      {activeTab === 'sellers' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Davr:</span>
              {[
                { id: 'today', label: 'Bugun' },
                { id: 'week', label: 'Oxirgi 7 kun' },
                { id: 'month', label: 'Oxirgi 30 kun' },
                { id: 'year', label: 'Bu yil' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSellerPeriod(p.id)}
                  className={`btn-sm ${
                    sellerPeriod === p.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Jami sotuvchilar: {sellersData.length} nafar
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">O'rin</th>
                    <th className="px-4 py-3">Xodim (Sotuvchi)</th>
                    <th className="px-4 py-3">Filial</th>
                    <th className="px-4 py-3">Sotuvlar soni</th>
                    <th className="px-4 py-3">Savdo Hajmi</th>
                    <th className="px-4 py-3">Keltirgan Yalpi Foyda</th>
                    <th className="px-4 py-3">Maosh sxemasi</th>
                    <th className="px-4 py-3 text-right">Hisoblangan Mukofot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sellersData.map((s, idx) => (
                    <tr key={s.user_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                          idx === 0 
                            ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300' 
                            : idx === 1 
                            ? 'bg-slate-300 text-slate-800' 
                            : idx === 2 
                            ? 'bg-amber-700 text-amber-100' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        {s.name}
                        <p className="text-[10px] text-slate-400 font-normal capitalize">{s.role}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {s.branch_name || 'Markaziy'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                        {s.sales_count} ta
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        {Number(s.total_revenue).toLocaleString()} so'm
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(s.total_profit).toLocaleString()} so'm
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-slate-500">
                        {s.salary_type === 'pct_sales' 
                          ? `${s.commission_pct}% savdodan` 
                          : `${s.commission_pct}% sof foydadan`}
                        <p className="text-[10px] text-slate-400">Oklad: {Number(s.base_salary).toLocaleString()} so'm</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        +{Number(s.earned_commission).toLocaleString()} so'm
                        <p className="text-[10px] text-slate-400 font-normal">
                          Jami to'lov: {Number(s.total_estimated_payout).toLocaleString()} so'm
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: New vs Used (B/U) */}
      {activeTab === 'new_vs_used' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {newVsUsedData.map(group => {
              const isNew = group.category_group.includes('Yangi');
              return (
                <div 
                  key={group.category_group}
                  className={`p-6 rounded-3xl border shadow-sm ${
                    isNew 
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' 
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Smartphone className={`w-5 h-5 ${isNew ? 'text-blue-600' : 'text-emerald-600'}`} />
                      {group.category_group}
                    </h3>
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-bold shadow-sm">
                      {group.sold_count} ta sotilgan
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600 dark:text-slate-400">Jami Tannarx (COGS):</span>
                      <span className="font-bold">{Number(group.total_cost).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600 dark:text-slate-400">Jami Savdo Tushumi:</span>
                      <span className="font-bold">{Number(group.total_revenue).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="font-sans">Keltirilgan Yalpi Foyda:</span>
                      <span>+{Number(group.total_profit).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex justify-between text-indigo-600 font-bold">
                      <span className="font-sans">Rentabellik darajasi (Margin):</span>
                      <span>{group.margin_pct}%</span>
                    </div>
                    <div className="flex justify-between text-purple-600 font-bold">
                      <span className="font-sans">Ustama foizi (Markup):</span>
                      <span>{group.markup_pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            💡 <b>Biznes xulosasi:</b> Ko'p hollarda B/U (Ishlatilgan) va Skupkadan qabul qilingan telefonlar yangi telefonlarga nisbatan yuqoriroq rentabellik (margin) beradi, chunki ularning ustama marjasi odatda 15-30% oralig'ida bo'ladi.
          </div>
        </div>
      )}

      {/* Tab 4: Telegram Summary */}
      {activeTab === 'telegram' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
                <Send className="w-5 h-5" />
                <span>Kunlik Telegram Bot Formati</span>
              </div>
              <button
                onClick={handleCopyTelegram}
                className="btn-primary"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? "Nusxalandi!" : "Nusxa olish"}
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Ushbu format har oqshom do'kon egasiga yoki Telegram guruhiga yuborish uchun tayyorlangan matn ko'rinishidir:
            </p>

            <pre className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-xs overflow-x-auto">
              {telegramSummary?.telegramMessage || "Yuklanmoqda..."}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
}
