import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, ShieldAlert, History, Award, X, Check } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useApp } from '../context/AppContext';

export default function CustomersPage() {
  const { showToast } = useApp();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterBlacklist, setFilterBlacklist] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustHistory, setSelectedCustHistory] = useState(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    passport_series: 'AA',
    passport_number: '',
    address: '',
    notes: ''
  });

  const loadCustomers = async () => {
    try {
      const res = await apiRequest(`/customers?search=${encodeURIComponent(search)}&blacklisted=${filterBlacklist}`);
      if (res.success) setCustomers(res.data);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [filterBlacklist]);

  useEffect(() => {
    const t = setTimeout(loadCustomers, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/customers', {
        method: 'POST',
        body: form
      });
      if (res.success) {
        showToast(res.message, 'success');
        setShowAddModal(false);
        setForm({ name: '', phone: '', passport_series: 'AA', passport_number: '', address: '', notes: '' });
        loadCustomers();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleBlacklist = async (cust) => {
    try {
      const nextStatus = cust.is_blacklisted ? 0 : 1;
      const res = await apiRequest(`/customers/${cust.id}`, {
        method: 'PUT',
        body: { is_blacklisted: nextStatus }
      });
      if (res.success) {
        showToast(nextStatus ? 'Mijoz qora ro\'yxatga kiritildi' : 'Mijoz qora ro\'yxatdan chiqarildi', 'info');
        loadCustomers();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openHistory = async (cust) => {
    try {
      const res = await apiRequest(`/customers/${cust.id}`);
      if (res.success) setSelectedCustHistory(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Mijozlar Bazasi (CRM)
          </h1>
          <p className="text-xs text-slate-500">
            Mijozlar kartochkasi, xaridlar tarixi, nasiya qarzdorligi va qora ro'yxat nazorati
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Mijoz Qo'shish</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz ismi, telefon raqami yoki pasporti bo'yicha qidiruv..."
            className="w-full bg-transparent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterBlacklist}
            onChange={(e) => setFilterBlacklist(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
          >
            <option value="all">Barcha mijozlar</option>
            <option value="0">Oq ro'yxat (Faol)</option>
            <option value="1">Qora ro'yxatdagilar</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">F.I.Sh. (Ism)</th>
                <th className="py-3 px-4">Telefon</th>
                <th className="py-3 px-4">Pasport</th>
                <th className="py-3 px-4">Manzil</th>
                <th className="py-3 px-4">Nasiya / Qarz</th>
                <th className="py-3 px-4">Bonus Balans</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-600">{c.phone}</td>
                  <td className="py-3 px-4 font-mono">{c.passport_series ? `${c.passport_series} ${c.passport_number}` : '-'}</td>
                  <td className="py-3 px-4 text-slate-500 truncate max-w-[180px]">{c.address || '-'}</td>
                  <td className="py-3 px-4">
                    {Number(c.debt) > 0 ? (
                      <span className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                        {Number(c.debt).toLocaleString()} UZS
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Qarzi yo'q</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-600">{Number(c.bonus_balance || 0).toLocaleString()} UZS</td>
                  <td className="py-3 px-4">
                    {c.is_blacklisted ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-extrabold uppercase">
                        Qora Ro'yxat
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                        Faol
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openHistory(c)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg font-bold"
                      title="Xaridlar tarixi"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleBlacklist(c)}
                      className={`p-1.5 rounded-lg ${
                        c.is_blacklisted ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title={c.is_blacklisted ? "Qora ro'yxatdan chiqarish" : "Qora ro'yxatga kiritish"}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Yangi Mijoz Qo'shish</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">F.I.Sh. *:</label>
                <input
                  type="text"
                  required
                  placeholder="Aliyev Vali"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Telefon Raqami *:</label>
                <input
                  type="text"
                  required
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  maxLength={2}
                  placeholder="Seriya"
                  value={form.passport_series}
                  onChange={(e) => setForm({ ...form, passport_series: e.target.value.toUpperCase() })}
                  className="p-2 rounded-xl border font-mono uppercase font-bold"
                />
                <input
                  type="text"
                  maxLength={7}
                  placeholder="Raqam"
                  value={form.passport_number}
                  onChange={(e) => setForm({ ...form, passport_number: e.target.value })}
                  className="col-span-2 p-2 rounded-xl border font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Yashash Manzili:</label>
                <input
                  type="text"
                  placeholder="Toshkent sh., Chilonzor 9"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border"
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

      {/* CUSTOMER HISTORY MODAL */}
      {selectedCustHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedCustHistory.customer.name} — Xaridlar Tarixi
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">{selectedCustHistory.customer.phone}</p>
              </div>
              <button onClick={() => setSelectedCustHistory(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              <h5 className="font-bold text-slate-700 dark:text-slate-300">Sotuv Hujjatlari:</h5>
              {selectedCustHistory.sales?.map(s => (
                <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-blue-600">{s.sale_number}</span>
                    <span className="text-[11px] text-slate-400 ml-2">{new Date(s.created_at).toLocaleDateString('uz-UZ')}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Sotuvchi: {s.seller_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 dark:text-white">{Number(s.final_amount).toLocaleString()} UZS</span>
                    <span className="block text-[10px] text-slate-400 uppercase">{s.payment_type}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setSelectedCustHistory(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Yopish</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
