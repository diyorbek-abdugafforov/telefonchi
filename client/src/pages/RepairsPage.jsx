import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Search, ShieldCheck, CheckCircle2, Clock, AlertTriangle, 
  User, Phone, Printer, Smartphone, DollarSign, Calendar, Eye
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function RepairsPage() {
  const { user } = useAuth();
  const { showToast, t } = useApp();

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(null);
  
  // Warranty check
  const [warrantyImei, setWarrantyImei] = useState('');
  const [warrantyResult, setWarrantyResult] = useState(null);
  const [warrantyLoading, setWarrantyLoading] = useState(false);

  // New repair form
  const [form, setForm] = useState({
    device_type: 'customer',
    device_id: '',
    model_name: '',
    imei: '',
    customer_name: '',
    customer_phone: '',
    issue_description: '',
    technician_id: '',
    parts_cost: '',
    labor_cost: '',
    notes: ''
  });

  // Stock devices for repair selection
  const [stockDevices, setStockDevices] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    loadRepairs();
    loadAuxData();
  }, [filterStatus]);

  async function loadRepairs() {
    setLoading(true);
    try {
      const res = await apiRequest(`/repairs?status=${filterStatus}`);
      if (res.success) {
        setRepairs(res.data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadAuxData() {
    try {
      const devRes = await apiRequest('/devices?status=omborda');
      if (devRes.success) setStockDevices(devRes.data);

      const staffRes = await apiRequest('/staff');
      if (staffRes.success) {
        setTechnicians(staffRes.data.filter(s => s.role === 'technician' || s.role === 'admin'));
      }
    } catch (e) {}
  }

  const handleWarrantyCheck = async (e) => {
    e.preventDefault();
    if (!warrantyImei) return;
    setWarrantyLoading(true);
    setWarrantyResult(null);
    try {
      const res = await apiRequest(`/repairs/warranty-check/${warrantyImei.trim()}`);
      if (res.success) {
        setWarrantyResult(res.data);
      }
    } catch (err) {
      showToast(err.message, 'error');
      setWarrantyResult({ error: err.message });
    } finally {
      setWarrantyLoading(false);
    }
  };

  const handleCreateRepair = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/repairs', {
        method: 'POST',
        body: {
          ...form,
          parts_cost: Number(form.parts_cost || 0),
          labor_cost: Number(form.labor_cost || 0)
        }
      });
      if (res.success) {
        showToast(res.message || "Ta'mir buyurtmasi ro'yxatga olindi");
        setShowAddModal(false);
        setForm({
          device_type: 'customer',
          device_id: '',
          model_name: '',
          imei: '',
          customer_name: '',
          customer_phone: '',
          issue_description: '',
          technician_id: '',
          parts_cost: '',
          labor_cost: '',
          notes: ''
        });
        loadRepairs();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateStatus = async (repairId, newStatus, parts, labor, notes) => {
    try {
      const res = await apiRequest(`/repairs/${repairId}/status`, {
        method: 'PUT',
        body: {
          status: newStatus,
          parts_cost: parts,
          labor_cost: labor,
          notes: notes
        }
      });
      if (res.success) {
        showToast(res.message || "Holat yangilandi");
        setShowStatusModal(null);
        loadRepairs();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredRepairs = repairs.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      r.order_number?.toLowerCase().includes(q) ||
      r.model_name?.toLowerCase().includes(q) ||
      r.imei?.includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_phone?.includes(q)
    );
  });

  const statusBadges = {
    received: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300', text: 'Qabul qilindi' },
    in_progress: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', text: "Ta'mirda" },
    ready: { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', text: 'Tayyor' },
    delivered: { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300', text: 'Topshirildi' },
    cancelled: { bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300', text: 'Bekor qilindi' },
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Warranty Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Header & Summary */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 rounded-lg text-xs font-bold">
                Servis Markazi & Kafolat
              </span>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                Yangi Ta'mir Buyurtmasi
              </button>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Telefonlarni Ta'mirlash va Servis Nazorati</h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 max-w-xl leading-relaxed">
              Mijoz telefonlari va ombordagi nuqsonli telefonlarni ta'mirlash. Ombordagi telefon ta'mirlangach, ehtiyot qismlar va usta xarajati avtomatik ravishda uning tannarxiga qo'shiladi.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Jami buyurtmalar</p>
              <p className="text-lg font-black mt-0.5 text-slate-900 dark:text-white">{repairs.length}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Jarayonda</p>
              <p className="text-lg font-black mt-0.5 text-amber-600 dark:text-amber-400">
                {repairs.filter(r => r.status === 'in_progress').length}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Tayyor</p>
              <p className="text-lg font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
                {repairs.filter(r => r.status === 'ready').length}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Topshirilgan</p>
              <p className="text-lg font-black mt-0.5 text-purple-600 dark:text-purple-400">
                {repairs.filter(r => r.status === 'delivered').length}
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Instant IMEI Warranty Checker */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>Tezkor Kafolat Tekshiruvi (IMEI)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Mijoz keltirgan telefon bizning do'kondan sotilganmi va kafolat muddati o'tmaganmi?
            </p>

            <form onSubmit={handleWarrantyCheck} className="flex gap-2">
              <input
                type="text"
                placeholder="15 xonali IMEI kiriting..."
                value={warrantyImei}
                onChange={e => setWarrantyImei(e.target.value)}
                className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="submit"
                disabled={warrantyLoading}
                className="btn-primary"
              >
                {warrantyLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Tekshirish
              </button>
            </form>
          </div>

          {/* Warranty Result Box */}
          {warrantyResult && (
            <div className={`mt-3 p-3 rounded-xl border text-xs ${
              warrantyResult.error 
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
                : warrantyResult.is_valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
                : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300'
            }`}>
              {warrantyResult.error ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{warrantyResult.error}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>{warrantyResult.status_text}</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800">
                      {warrantyResult.sale_number}
                    </span>
                  </div>
                  <p>Mijoz: <span className="font-semibold">{warrantyResult.customer_name || 'Noma\'lum'}</span> ({warrantyResult.customer_phone})</p>
                  <p>Filial: <span className="font-semibold">{warrantyResult.branch_name}</span> | Sotilgan: {new Date(warrantyResult.sale_date).toLocaleDateString('uz-UZ')}</p>
                  <p>Kafolat tugash sanasi: <span className="font-semibold">{warrantyResult.warranty_end_date}</span></p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'received', label: 'Qabul qilindi' },
            { id: 'in_progress', label: "Ta'mirda" },
            { id: 'ready', label: 'Tayyor' },
            { id: 'delivered', label: 'Topshirildi' },
            { id: 'cancelled', label: 'Bekor qilingan' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`btn-tab ${
                filterStatus === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buyurtma raqami, model yoki mijoz..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Repairs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">№ / Buyurtma</th>
                <th className="px-4 py-3">Turi & Qurilma</th>
                <th className="px-4 py-3">Mijoz / Telefon</th>
                <th className="px-4 py-3">Muammo & Holat</th>
                <th className="px-4 py-3">Usta</th>
                <th className="px-4 py-3">Xarajatlar</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Ta'mir buyurtmalari yuklanmoqda...
                  </td>
                </tr>
              ) : filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Buyurtmalar topilmadi
                  </td>
                </tr>
              ) : (
                filteredRepairs.map(r => {
                  const badge = statusBadges[r.status] || { bg: 'bg-slate-100 text-slate-700', text: r.status };
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{r.order_number}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(r.created_at).toLocaleDateString('uz-UZ')} {new Date(r.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.device_type === 'stock' 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}>
                            {r.device_type === 'stock' ? 'Ombor telefoni' : 'Mijoz telefoni'}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white mt-1">{r.model_name}</p>
                        {r.imei && <p className="font-mono text-[10px] text-slate-400">IMEI: {r.imei}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {r.device_type === 'customer' ? (
                          <>
                            <p className="font-semibold text-slate-900 dark:text-white">{r.customer_name || 'Noma\'lum'}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.customer_phone}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Do'kon mulki</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="line-clamp-2 text-slate-700 dark:text-slate-200 font-medium">
                          {r.issue_description}
                        </p>
                        {r.notes && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">
                            Izoh: {r.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.technician_name || 'Biriktirilmagan'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {Number(r.total_cost).toLocaleString()} so'm
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Qism: {Number(r.parts_cost).toLocaleString()} | Ish: {Number(r.labor_cost).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.bg}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setShowPrintModal(r)}
                            title="Kvitansiyani chop etish"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowStatusModal(r)}
                            className="btn-sm bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                          >
                            Holatni o'zgartirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Repair Order */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                Yangi Ta'mir Buyurtmasi Qabul Qilish
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRepair} className="space-y-4 mt-4">
              
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Qurilma egasi turi:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, device_type: 'customer', device_id: '' }))}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      form.device_type === 'customer'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Mijoz telefoni
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, device_type: 'stock' }))}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      form.device_type === 'stock'
                        ? 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Do'kon omboridagi telefon
                  </button>
                </div>
              </div>

              {/* If Stock Phone: Select Device */}
              {form.device_type === 'stock' && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                    Ombordagi nuqsonli telefonni tanlang:
                  </label>
                  <select
                    value={form.device_id}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const dev = stockDevices.find(d => String(d.id) === String(selectedId));
                      if (dev) {
                        setForm(f => ({
                          ...f,
                          device_id: dev.id,
                          model_name: `${dev.brand_name} ${dev.model_name} ${dev.storage}`,
                          imei: dev.imei1 || ''
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value="">Telefonni tanlang...</option>
                    {stockDevices.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.brand_name} {d.model_name} {d.color_name} (IMEI: {d.imei1 || 'Yo\'q'}) - Tannarx: {Number(d.cost_price).toLocaleString()} so'm
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1">
                    ⚠️ Ushbu telefon ta'mirlab topshirilgach, uning sarflangan qismlari va usta haqi avtomatik tarzda uning <b>tannarxiga (cost_price)</b> qo'shiladi!
                  </p>
                </div>
              )}

              {/* Model and IMEI */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Model nomi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: iPhone 13 128GB Midnight"
                    value={form.model_name}
                    onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    IMEI kodi
                  </label>
                  <input
                    type="text"
                    placeholder="15 xonali IMEI..."
                    value={form.imei}
                    onChange={e => setForm(f => ({ ...f, imei: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Customer details if customer type */}
              {form.device_type === 'customer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Mijoz ismi
                    </label>
                    <input
                      type="text"
                      placeholder="Mijoz F.I.Sh"
                      value={form.customer_name}
                      onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Telefon raqami
                    </label>
                    <input
                      type="text"
                      placeholder="+998 90 123 45 67"
                      value={form.customer_phone}
                      onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Problem Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Nuqson / Shikoyat ta'rifi *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ekran singan, batareya tez o'chyapti, Face ID ishlamayapti..."
                  value={form.issue_description}
                  onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              {/* Technician and Costs */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Mas'ul Usta
                  </label>
                  <select
                    value={form.technician_id}
                    onChange={e => setForm(f => ({ ...f, technician_id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="">Ustani tanlang...</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Ehtiyot qism qiymati (so'm)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.parts_cost}
                    onChange={e => setForm(f => ({ ...f, parts_cost: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Usta xizmati haqi (so'm)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.labor_cost}
                    onChange={e => setForm(f => ({ ...f, labor_cost: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Qo'shimcha eslatma / Aksessuarlar (chexol, sim-karta va h.k.)
                </label>
                <input
                  type="text"
                  placeholder="G'ilofsiz, sim-karta olingan..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Buyurtmani Qabul Qilish
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Status Change */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Ta'mir Holatini O'zgartirish: {showStatusModal.order_number}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{showStatusModal.model_name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Yangi status:
                </label>
                <select
                  id="new_status_select"
                  defaultValue={showStatusModal.status}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                >
                  <option value="received">Qabul qilindi</option>
                  <option value="in_progress">Ta'mir jarayonida</option>
                  <option value="ready">Tayyor (Ta'mirlandi)</option>
                  <option value="delivered">Mijozga topshirildi</option>
                  <option value="cancelled">Bekor qilindi</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Ehtiyot qism (so'm)
                  </label>
                  <input
                    id="new_parts_cost"
                    type="number"
                    defaultValue={showStatusModal.parts_cost}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Usta haqi (so'm)
                  </label>
                  <input
                    id="new_labor_cost"
                    type="number"
                    defaultValue={showStatusModal.labor_cost}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Bajarilgan ishlar / Izoh
                </label>
                <textarea
                  id="new_status_notes"
                  rows={2}
                  defaultValue={showStatusModal.notes || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowStatusModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => {
                    const status = document.getElementById('new_status_select').value;
                    const parts = Number(document.getElementById('new_parts_cost').value || 0);
                    const labor = Number(document.getElementById('new_labor_cost').value || 0);
                    const notes = document.getElementById('new_status_notes').value;
                    handleUpdateStatus(showStatusModal.id, status, parts, labor, notes);
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Print Repair Ticket */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl font-mono text-xs">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h4 className="font-bold text-base">SMARTPHONE SERVICE</h4>
              <p className="text-[10px] text-slate-500">Ta'mir Qabul Kvitansiyasi</p>
              <p className="font-bold mt-1 text-sm">{showPrintModal.order_number}</p>
            </div>

            <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Sana:</span>
                <span>{new Date(showPrintModal.created_at).toLocaleDateString('uz-UZ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mijoz:</span>
                <span className="font-bold">{showPrintModal.customer_name || 'Do\'kon mulki'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Telefon:</span>
                <span>{showPrintModal.customer_phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Model:</span>
                <span className="font-bold">{showPrintModal.model_name}</span>
              </div>
              {showPrintModal.imei && (
                <div className="flex justify-between">
                  <span className="text-slate-500">IMEI:</span>
                  <span>{showPrintModal.imei}</span>
                </div>
              )}
            </div>

            <div className="py-3 space-y-1 border-b border-dashed border-slate-300">
              <p className="text-slate-500 font-bold">Muammo ta'rifi:</p>
              <p className="bg-slate-100 p-2 rounded">{showPrintModal.issue_description}</p>
            </div>

            <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Ehtiyot qismlar:</span>
                <span>{Number(showPrintModal.parts_cost).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Usta xizmati:</span>
                <span>{Number(showPrintModal.labor_cost).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1">
                <span>Jami to'lov:</span>
                <span>{Number(showPrintModal.total_cost).toLocaleString()} so'm</span>
              </div>
            </div>

            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
              <p>Qurilmani topshirishda ushbu kvitansiya talab qilinadi.</p>
              <p>Kafolat faqat almashtirilgan qismlarga beriladi.</p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 flex items-center justify-center gap-1"
              >
                <Printer className="w-4 h-4" />
                Chop etish
              </button>
              <button
                onClick={() => setShowPrintModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                Yopish
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
