import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, DollarSign, FileText, Check, X } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useApp } from '../context/AppContext';

export default function SuppliersPage() {
  const { showToast } = useApp();
  const [suppliers, setSuppliers] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [payDebtModal, setPayDebtModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedCashAccount, setSelectedCashAccount] = useState('');
  const [sverkaModal, setSverkaModal] = useState(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    company_name: '',
    address: '',
    notes: ''
  });

  const loadSuppliers = async () => {
    try {
      const sRes = await apiRequest(`/suppliers?search=${encodeURIComponent(search)}`);
      if (sRes.success) setSuppliers(sRes.data);

      const caRes = await apiRequest('/finance/accounts');
      if (caRes.success) {
        setCashAccounts(caRes.data);
        if (caRes.data.length > 0) setSelectedCashAccount(caRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/suppliers', { method: 'POST', body: form });
      if (res.success) {
        showToast(res.message, 'success');
        setShowAddModal(false);
        setForm({ name: '', phone: '', company_name: '', address: '', notes: '' });
        loadSuppliers();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePayDebt = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      showToast('To\'lov summasini kiriting', 'error');
      return;
    }

    try {
      const res = await apiRequest(`/suppliers/${payDebtModal.id}/pay-debt`, {
        method: 'POST',
        body: {
          amount: Number(payAmount),
          cash_account_id: selectedCashAccount
        }
      });
      if (res.success) {
        showToast(res.message, 'success');
        setPayDebtModal(null);
        setPayAmount('');
        loadSuppliers();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openSverka = async (sup) => {
    try {
      const res = await apiRequest(`/suppliers/${sup.id}`);
      if (res.success) setSverkaModal(res.data);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Yetkazib Beruvchilar (Optom Kontragentlar)
          </h1>
          <p className="text-xs text-slate-500">
            Telefon ta'minotchilari, xaridlar tarixi, qarzdorlik va akt sverka (o'zaro hisob-kitob)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Yetkazib Beruvchi</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Kontragent (Ism)</th>
                <th className="py-3 px-4">Kompaniya</th>
                <th className="py-3 px-4">Telefon</th>
                <th className="py-3 px-4">Manzil</th>
                <th className="py-3 px-4">Bizning Qarzimiz</th>
                <th className="py-3 px-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                  <td className="py-3 px-4 font-semibold text-blue-600">{s.company_name || '-'}</td>
                  <td className="py-3 px-4 font-mono">{s.phone}</td>
                  <td className="py-3 px-4 text-slate-500">{s.address || '-'}</td>
                  <td className="py-3 px-4">
                    {Number(s.debt) > 0 ? (
                      <span className="font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                        {Number(s.debt).toLocaleString()} UZS
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Qarzimiz yo'q</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openSverka(s)}
                      className="btn-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Akt Sverka
                    </button>
                    {Number(s.debt) > 0 && (
                      <button
                        onClick={() => {
                          setPayDebtModal(s);
                          setPayAmount(s.debt);
                        }}
                        className="btn-sm bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Qarz To'lash
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW SUPPLIER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Yangi Yetkazib Beruvchi</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Mas'ul Shaxs Ismi *:</label>
                <input
                  type="text"
                  required
                  placeholder="Akmal aka"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kompaniya Nomi:</label>
                <input
                  type="text"
                  placeholder="Dubai Wholesale Trade"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Telefon:</label>
                <input
                  type="text"
                  placeholder="+998 90 100 20 30"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Bekor qilish</button>
                <button type="submit" className="btn-primary">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY DEBT MODAL */}
      {payDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Yetkazib Beruvchi Qarzini To'lash
            </h3>
            <p className="text-slate-500">
              {payDebtModal.name} ({payDebtModal.company_name}). Jami qarzimiz: <strong>{Number(payDebtModal.debt).toLocaleString()} UZS</strong>
            </p>

            <form onSubmit={handlePayDebt} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">To'lanayotgan Summa (UZS):</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border font-bold text-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Qaysi Kassadan Chiqim:</label>
                <select
                  value={selectedCashAccount}
                  onChange={(e) => setSelectedCashAccount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border font-bold"
                >
                  {cashAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({Number(a.balance).toLocaleString()} so'm)</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setPayDebtModal(null)} className="px-3 py-1.5 text-slate-400">Bekor</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-md">To'lovni Tasdiqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AKT SVERKA MODAL */}
      {sverkaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 text-black space-y-4 border shadow-2xl text-xs font-sans">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold uppercase text-blue-900">
                  O'zaro Hisob-Kitob Dalolatnomasi (Akt Sverka)
                </h3>
                <p className="text-gray-500 font-semibold">{sverkaModal.supplier.company_name || sverkaModal.supplier.name}</p>
              </div>
              <p className="font-mono text-gray-500">{new Date().toLocaleDateString('uz-UZ')}</p>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Biz, <strong>iStore Uzbekistan</strong> va <strong>{sverkaModal.supplier.name}</strong> o'rtasidagi tovar xaridlari va to'lovlar bo'yicha hisob-kitobni solishtirib chiqdik:
            </p>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2">Hujjat</th>
                    <th className="p-2">Sana</th>
                    <th className="p-2">Operatsiya</th>
                    <th className="p-2 text-right">Summa (UZS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sverkaModal.purchases?.map(p => (
                    <tr key={p.id}>
                      <td className="p-2 font-mono font-bold text-blue-600">{p.invoice_number}</td>
                      <td className="p-2 text-gray-500">{new Date(p.created_at).toLocaleDateString('uz-UZ')}</td>
                      <td className="p-2">Tovar qabul qilindi</td>
                      <td className="p-2 text-right font-bold text-gray-900">+{Number(p.total_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {sverkaModal.payments?.map(pm => (
                    <tr key={pm.id} className="bg-emerald-50/50">
                      <td className="p-2 font-mono text-emerald-700">TO'LOV</td>
                      <td className="p-2 text-gray-500">{new Date(pm.created_at).toLocaleDateString('uz-UZ')}</td>
                      <td className="p-2 text-emerald-800">Qarz to'landi</td>
                      <td className="p-2 text-right font-bold text-emerald-700">-{Number(pm.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 text-sm">
              <p>Joriy qoldiq qarzimiz: <strong className="text-rose-600">{Number(sverkaModal.supplier.debt).toLocaleString()} UZS</strong></p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t no-print">
              <button onClick={() => setSverkaModal(null)} className="px-4 py-2 text-gray-500">Yopish</button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md">Chop Etish</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
