import React, { useState, useEffect } from 'react';
import { 
  Wallet, DollarSign, ArrowUpRight, ArrowDownRight, ArrowRightLeft, 
  Clock, Plus, CheckCircle, AlertTriangle, Users, Award, Calendar, X 
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function FinancePage() {
  const { user, requireRoles } = useAuth();
  const { showToast, selectedBranch } = useApp();

  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts', 'shifts', 'expenses', 'salaries'
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txType, setTxType] = useState('in'); // 'in' or 'out'
  const [txForm, setTxForm] = useState({ cash_account_id: '', category: 'other', amount: '', description: '' });

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ from_account_id: '', to_account_id: '', amount: '', description: '' });

  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [shiftOpeningBalance, setShiftOpeningBalance] = useState('');

  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [shiftClosingActual, setShiftClosingActual] = useState('');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Ijara',
    amount: '',
    cash_account_id: '',
    date: new Date().toISOString().slice(0, 10),
    is_recurring: false,
    description: ''
  });

  const loadData = async () => {
    try {
      const aRes = await apiRequest('/finance/accounts');
      if (aRes.success) {
        setAccounts(aRes.data);
        if (aRes.data.length > 0) {
          setTxForm(prev => ({ ...prev, cash_account_id: aRes.data[0].id }));
          setExpenseForm(prev => ({ ...prev, cash_account_id: aRes.data[0].id }));
          setTransferForm(prev => ({ ...prev, from_account_id: aRes.data[0].id, to_account_id: aRes.data[1]?.id || '' }));
        }
      }

      const tRes = await apiRequest('/finance/transactions?limit=50');
      if (tRes.success) setTransactions(tRes.data);

      const sRes = await apiRequest('/finance/shifts/current');
      if (sRes.success) setCurrentShift(sRes.data);

      const eRes = await apiRequest('/finance/expenses');
      if (eRes.success) setExpenses(eRes.data);

      if (user?.role === 'admin') {
        const salRes = await apiRequest('/finance/salaries');
        if (salRes.success) setSalaries(salRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Submit Kirim / Chiqim
  const handleCreateTx = async (e) => {
    e.preventDefault();
    if (!txForm.amount || Number(txForm.amount) <= 0) {
      showToast('Summani to\'g\'ri kiriting', 'error');
      return;
    }

    try {
      const res = await apiRequest('/finance/transactions', {
        method: 'POST',
        body: {
          ...txForm,
          type: txType,
          amount: Number(txForm.amount)
        }
      });
      if (res.success) {
        showToast(res.message, 'success');
        setTxModalOpen(false);
        setTxForm({ cash_account_id: accounts[0]?.id || '', category: 'other', amount: '', description: '' });
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Submit Inter-account transfer
  const handleTransfer = async (e) => {
    e.preventDefault();
    if (transferForm.from_account_id === transferForm.to_account_id) {
      showToast('Kassalar har xil bo\'lishi shart', 'error');
      return;
    }
    try {
      const res = await apiRequest('/finance/transfer', { method: 'POST', body: transferForm });
      if (res.success) {
        showToast(res.message, 'success');
        setTransferModalOpen(false);
        setTransferForm({ from_account_id: accounts[0]?.id || '', to_account_id: accounts[1]?.id || '', amount: '', description: '' });
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Shift Open
  const handleOpenShift = async () => {
    try {
      const res = await apiRequest('/finance/shifts/open', {
        method: 'POST',
        body: { opening_balance: Number(shiftOpeningBalance || 0) }
      });
      if (res.success) {
        showToast(res.message, 'success');
        setOpenShiftModal(false);
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Shift Close
  const handleCloseShift = async () => {
    if (!shiftClosingActual) {
      showToast('Haqiqiy sanalgan naqd summani kiriting', 'error');
      return;
    }

    try {
      const res = await apiRequest('/finance/shifts/close', {
        method: 'POST',
        body: {
          shift_id: currentShift.id,
          closing_actual: Number(shiftClosingActual)
        }
      });
      if (res.success) {
        const diff = res.data.difference;
        if (diff !== 0) {
          showToast(`Smena yopildi! Kassa tafovuti: ${diff > 0 ? '+' : ''}${diff.toLocaleString()} UZS`, diff < 0 ? 'error' : 'info');
        } else {
          showToast('Smena muvaffaqiyatli yopildi! Tafovut yo\'q (100% aniq)', 'success');
        }
        setCloseShiftModal(false);
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Submit Expense
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/finance/expenses', { method: 'POST', body: expenseForm });
      if (res.success) {
        showToast(res.message, 'success');
        setExpenseModalOpen(false);
        setExpenseForm({ category: 'Ijara', amount: '', cash_account_id: accounts[0]?.id || '', date: new Date().toISOString().slice(0, 10), is_recurring: false, description: '' });
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Kassa, Smena va Moliya Boshqaruvi
          </h1>
          <p className="text-xs text-slate-500">
            Kassalar balansi, kirim/chiqim amallari, kunlik smena ochish/yopish va xodimlar maoshi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Shift Button */}
          {currentShift ? (
            <button
              onClick={() => setCloseShiftModal(true)}
              className="btn-danger"
            >
              <Clock className="w-4 h-4" />
              <span>Smenani Yopish (Tafovut)</span>
            </button>
          ) : (
            <button
              onClick={() => setOpenShiftModal(true)}
              className="btn-success"
            >
              <Clock className="w-4 h-4" />
              <span>Smenani Ochish</span>
            </button>
          )}

          <button
            onClick={() => {
              setTxType('in');
              setTxModalOpen(true);
            }}
            className="btn-secondary"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            <span>Kirim</span>
          </button>

          <button
            onClick={() => {
              setTxType('out');
              setTxModalOpen(true);
            }}
            className="btn-secondary"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>Chiqim</span>
          </button>

          <button
            onClick={() => setTransferModalOpen(true)}
            className="btn-secondary"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            <span>O'tkazma</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        {[
          { id: 'accounts', label: 'Kassalar Balansi & Harakat', icon: Wallet },
          { id: 'expenses', label: 'Xarajatlar (Ijara, Reklama)', icon: DollarSign },
          ...(user?.role === 'admin' ? [{ id: 'salaries', label: 'Maoshlar & KPI Hisobi', icon: Users }] : [])
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`btn-tab ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ACCOUNTS & TRANSACTIONS VIEW */}
      {activeTab === 'accounts' && (
        <div className="space-y-5">
          {/* Cash Accounts Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map(a => (
              <div key={a.id} className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-slate-400 mb-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold">{a.branch_name || 'Bosh kassa'}</span>
                    <Wallet className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">{a.name}</h4>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {Number(a.balance).toLocaleString()} <span className="text-xs text-slate-400">{a.type === 'cash_usd' ? '$' : 'UZS'}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Shift Banner if open */}
          {currentShift && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Ochiq Smena: {currentShift.cashier_name}
                  </span>
                  <span className="block text-[11px] text-emerald-700 dark:text-emerald-400">
                    Ochilgan vaqti: {new Date(currentShift.opened_at).toLocaleTimeString('uz-UZ')} • Boshlang'ich qoldiq: {Number(currentShift.opening_balance).toLocaleString()} UZS
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCloseShiftModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
              >
                Smenani Yopish
              </button>
            </div>
          )}

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Pul Harakati Jurnali</h4>
            </div>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase">
                    <th className="py-2.5 px-4">Sana</th>
                    <th className="py-2.5 px-4">Kassa</th>
                    <th className="py-2.5 px-4">Turi</th>
                    <th className="py-2.5 px-4">Kategoriya</th>
                    <th className="py-2.5 px-4">Tavsif</th>
                    <th className="py-2.5 px-4 text-right">Summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-400">{new Date(tx.created_at).toLocaleDateString('uz-UZ')} {new Date(tx.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2.5 px-4 font-semibold">{tx.account_name}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {tx.type === 'in' ? 'Kirim' : 'Chiqim'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 capitalize">{tx.category}</td>
                      <td className="py-2.5 px-4 text-slate-500 truncate max-w-[200px]">{tx.description || '-'}</td>
                      <td className={`py-2.5 px-4 text-right font-extrabold ${tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'in' ? '+' : '-'}{Number(tx.amount).toLocaleString()} UZS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXPENSES VIEW */}
      {activeTab === 'expenses' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Do'kon Xarajatlari</h4>
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yangi Xarajat</span>
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 font-bold border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                  <th className="py-2.5 px-3">Sana</th>
                  <th className="py-2.5 px-3">Kategoriya</th>
                  <th className="py-2.5 px-3">Tavsif</th>
                  <th className="py-2.5 px-3">Kassa</th>
                  <th className="py-2.5 px-3 text-right">Summa (UZS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td className="py-2.5 px-3 text-slate-400">{e.date}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">{e.category}</td>
                    <td className="py-2.5 px-3 text-slate-500">{e.description}</td>
                    <td className="py-2.5 px-3">{e.account_name}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-rose-600">{Number(e.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SALARIES & KPI VIEW */}
      {activeTab === 'salaries' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Xodimlar Oylik Maoshi va KPI (Sotuvdan Foiz)
          </h4>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 font-bold border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                  <th className="py-3 px-3">Xodim</th>
                  <th className="py-3 px-3">Lavozimi</th>
                  <th className="py-3 px-3">Oklad (Asosiy)</th>
                  <th className="py-3 px-3">Sotuv Soni</th>
                  <th className="py-3 px-3">Keltirgan Tushumi</th>
                  <th className="py-3 px-3">Keltirgan Foydasi</th>
                  <th className="py-3 px-3">Bonus / Foiz</th>
                  <th className="py-3 px-3 text-right">Jami Oylik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salaries.map(s => (
                  <tr key={s.user_id}>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{s.name}</td>
                    <td className="py-3 px-3 capitalize">{s.role}</td>
                    <td className="py-3 px-3 font-semibold">{Number(s.base_salary).toLocaleString()} UZS</td>
                    <td className="py-3 px-3 font-bold text-blue-600">{s.sales_count} ta</td>
                    <td className="py-3 px-3">{Number(s.total_sales).toLocaleString()}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">{Number(s.total_profit).toLocaleString()}</td>
                    <td className="py-3 px-3 font-bold text-indigo-600">+{Number(s.commission_earned).toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white text-sm">
                      {Number(s.total_payout).toLocaleString()} UZS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Kirim / Chiqim Modal */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Kassa {txType === 'in' ? 'Kirimi' : 'Chiqimi'}
            </h3>
            <form onSubmit={handleCreateTx} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kassa:</label>
                <select
                  value={txForm.cash_account_id}
                  onChange={(e) => setTxForm({ ...txForm, cash_account_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Summa (UZS):</label>
                <input
                  type="number"
                  required
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border font-black text-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Izoh / Sabab:</label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  placeholder="Inkassatsiya / Xarid to'lovi..."
                  className="w-full p-2.5 rounded-xl border"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setTxModalOpen(false)} className="px-3 py-1.5 text-slate-400">Bekor</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md">Tasdiqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Kassalararo Pul O'tkazmasi</h3>
            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Qaysi kassadan (Chiqim):</label>
                <select
                  value={transferForm.from_account_id}
                  onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                  className="w-full p-2 rounded-xl border font-bold"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Qaysi kassaga (Kirim):</label>
                <select
                  value={transferForm.to_account_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                  className="w-full p-2 rounded-xl border font-bold"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">O'tkazma summasi (UZS):</label>
                <input
                  type="number"
                  required
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border font-black text-blue-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setTransferModalOpen(false)} className="px-3 py-1.5 text-slate-400">Bekor</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md">O'tkazish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Open Shift Modal */}
      {openShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Yangi Smenani Ochish</h3>
            <p className="text-slate-500 text-[11px]">Kassadagi boshlang'ich qoldiqni sanab kiriting:</p>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Boshlang'ich qoldiq (UZS):</label>
              <input
                type="number"
                value={shiftOpeningBalance}
                onChange={(e) => setShiftOpeningBalance(e.target.value)}
                placeholder="0"
                className="w-full p-2.5 rounded-xl border font-bold text-blue-600"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setOpenShiftModal(false)} className="px-3 py-1.5 text-slate-400">Bekor</button>
              <button onClick={handleOpenShift} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-md">Smenani Ochish</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Close Shift Modal (Discrepancy calculation!) */}
      {closeShiftModal && currentShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Smenani Yopish va Tafovut Hisobi
            </h3>
            <p className="text-slate-500 text-[11px]">
              Kassirdan smena oxirida haqiqiy sanalgan naqd pulni kiritish so'raladi. Tizim avtomatik kutilayotgan summa bilan solishtiradi.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Haqiqiy sanalgan summa (UZS) *:</label>
              <input
                type="number"
                required
                value={shiftClosingActual}
                onChange={(e) => setShiftClosingActual(e.target.value)}
                placeholder="48500000"
                className="w-full p-2.5 rounded-xl border font-black text-rose-600"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setCloseShiftModal(false)} className="px-3 py-1.5 text-slate-400">Bekor</button>
              <button onClick={handleCloseShift} className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-md">Smenani Yopish</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Yangi Xarajat Qo'shish</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kategoriya:</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full p-2 rounded-xl border font-bold"
                >
                  <option value="Ijara">Ijara</option>
                  <option value="Kommunal">Kommunal</option>
                  <option value="Reklama">Reklama / Marketing</option>
                  <option value="Transport">Transport / Yetkazish</option>
                  <option value="Maosh">Xodimlar Maoshi</option>
                  <option value="Boshqa">Boshqa xarajatlar</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Summa (UZS):</label>
                <input
                  type="number"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border font-black text-rose-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tavsif:</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Instagram reklama to'lovi..."
                  className="w-full p-2 rounded-xl border"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setExpenseModalOpen(false)} className="px-3 py-1.5 text-slate-400">Bekor</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
