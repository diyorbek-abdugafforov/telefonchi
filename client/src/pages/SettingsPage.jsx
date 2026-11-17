import React, { useState, useEffect } from 'react';
import { 
  Settings, DollarSign, Store, Clock, Building, Tag, 
  Smartphone, Palette, Plus, Save, CheckCircle, RefreshCw
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast, branches, setUsdRate, usdRate } = useApp();

  const [activeTab, setActiveTab] = useState('general'); // general, branches, brands_models
  const [loading, setLoading] = useState(false);

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    store_name: "SMARTPHONE PRO POS",
    phone: "+998 71 200 00 00",
    address: "Toshkent sh., Malika savdo majmuasi, B-24 do'kon",
    receipt_header: "Xaridingiz uchun rahmat!",
    receipt_footer: "Kafolat muddati davomida chekni saqlang.",
    usd_rate: "12850",
    work_start_time: "09:00",
    work_end_time: "20:00",
    default_warranty_months: "12"
  });

  // Dictionaries
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [colors, setColors] = useState([]);

  // New item forms
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '', is_main: 0 });
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState({ brand_id: '', name: '', ram: '8GB', storage: '256GB', release_year: '2024' });

  useEffect(() => {
    loadSettings();
    loadDictionaries();
  }, []);

  async function loadSettings() {
    try {
      const res = await apiRequest('/settings');
      if (res.success && res.data) {
        setSettingsForm(prev => ({ ...prev, ...res.data }));
        if (res.data.usd_rate) setUsdRate(Number(res.data.usd_rate));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function loadDictionaries() {
    try {
      const [brRes, modRes, colRes] = await Promise.all([
        apiRequest('/settings/brands'),
        apiRequest('/settings/models'),
        apiRequest('/settings/colors')
      ]);
      if (brRes.success) setBrands(brRes.data);
      if (modRes.success) setModels(modRes.data);
      if (colRes.success) setColors(colRes.data);
    } catch (e) {}
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/settings', {
        method: 'POST',
        body: { settings: settingsForm }
      });
      if (res.success) {
        showToast(res.message || "Sozlamalar saqlandi");
        if (settingsForm.usd_rate) setUsdRate(Number(settingsForm.usd_rate));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/settings/branches', {
        method: 'POST',
        body: newBranch
      });
      if (res.success) {
        showToast(res.message);
        setNewBranch({ name: '', address: '', phone: '', is_main: 0 });
        window.location.reload(); // Refresh app branch context
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/settings/brands', {
        method: 'POST',
        body: { name: newBrand }
      });
      if (res.success) {
        showToast("Brend qo'shildi");
        setNewBrand('');
        loadDictionaries();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddModel = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/settings/models', {
        method: 'POST',
        body: newModel
      });
      if (res.success) {
        showToast("Model qo'shildi");
        setNewModel({ brand_id: '', name: '', ram: '8GB', storage: '256GB', release_year: '2024' });
        loadDictionaries();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-indigo-600" />
          Tizim Sozlamalari va Ma'lumotnomalar
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Valyuta kursi (USD/UZS), kvitansiya shablonlari, filiallar, brend va modellar katalogi.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'general', label: '1. Asosiy Sozlamalar & Kurs', icon: Store },
          { id: 'branches', label: '2. Filiallar Boshqaruvi', icon: Building },
          { id: 'brands_models', label: '3. Brendlar & Modellar Katalogi', icon: Tag },
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

      {/* Tab 1: General Settings */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* USD Rate Card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1 uppercase tracking-wider">
                <DollarSign className="w-4 h-4" />
                Markaziy Valyuta Kursi
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">AQSH Dollari (USD) Kursi</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                POS savdoda va qabul qilishda kiritilgan dollar narxlari ushbu kurs bo'yicha so'mga konvertatsiya qilinadi.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2">
              <span className="font-bold text-xs text-slate-700 dark:text-slate-200">1 USD =</span>
              <input
                type="number"
                value={settingsForm.usd_rate}
                onChange={e => setSettingsForm(f => ({ ...f, usd_rate: e.target.value }))}
                className="w-28 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-center text-base border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="font-bold text-xs text-slate-700 dark:text-slate-200">so'm</span>
            </div>
          </div>

          {/* Store Info */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-600" />
              Do'kon Rekvizitlari & Chek Ma'lumotlari
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Do'kon / Savdo tarmog'i nomi
                </label>
                <input
                  type="text"
                  value={settingsForm.store_name}
                  onChange={e => setSettingsForm(f => ({ ...f, store_name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Aloqa telefoni (Chekda ko'rsatiladi)
                </label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Manzil (Chek va Shartnomada ko'rsatiladi)
                </label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={e => setSettingsForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Chek yuqori yozuvi (Header)
                </label>
                <input
                  type="text"
                  value={settingsForm.receipt_header}
                  onChange={e => setSettingsForm(f => ({ ...f, receipt_header: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Chek quyi minnatdorchilik yozuvi (Footer)
                </label>
                <input
                  type="text"
                  value={settingsForm.receipt_footer}
                  onChange={e => setSettingsForm(f => ({ ...f, receipt_footer: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Work Hours and Default Warranty */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Ish Vaqti va Xavfsizlik Sozlamalari
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Ish boshlanish vaqti
                </label>
                <input
                  type="time"
                  value={settingsForm.work_start_time}
                  onChange={e => setSettingsForm(f => ({ ...f, work_start_time: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Ushbu vaqtdan oldin kirilsa ogohlantirish beriladi</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Ish tugash vaqti
                </label>
                <input
                  type="time"
                  value={settingsForm.work_end_time}
                  onChange={e => setSettingsForm(f => ({ ...f, work_end_time: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Ushbu vaqtdan keyin kirilsa ogohlantirish beriladi</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Standart Kafolat Muddati (Oy)
                </label>
                <input
                  type="number"
                  value={settingsForm.default_warranty_months}
                  onChange={e => setSettingsForm(f => ({ ...f, default_warranty_months: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-6"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saqlanmoqda..." : "Sozlamalarni Saqlash"}
            </button>
          </div>

        </form>
      )}

      {/* Tab 2: Branches Management */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Branches List */}
            <div className="md:col-span-2 space-y-3">
              {branches.map(b => (
                <div 
                  key={b.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{b.name}</h4>
                      {b.is_main === 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          Bosh Filial
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{b.address || 'Manzil ko\'rsatilmagan'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Tel: {b.phone || '-'}</p>
                  </div>

                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                    ID #{b.id}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Branch Form */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Yangi Filial Qo'shish
              </h4>

              <form onSubmit={handleAddBranch} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Filial nomi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Samarqand filiali"
                    value={newBranch.name}
                    onChange={e => setNewBranch(b => ({ ...b, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Manzili
                  </label>
                  <input
                    type="text"
                    placeholder="Ko'cha, bino..."
                    value={newBranch.address}
                    onChange={e => setNewBranch(b => ({ ...b, address: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Telefon raqami
                  </label>
                  <input
                    type="text"
                    placeholder="+998..."
                    value={newBranch.phone}
                    onChange={e => setNewBranch(b => ({ ...b, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                >
                  Filialni Qo'shish
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Tab 3: Brands and Models */}
      {activeTab === 'brands_models' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Brands Section */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Brendlar Katalogi ({brands.length} ta)</span>
              </h3>

              <form onSubmit={handleAddBrand} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Yangi brend (masalan: Google Pixel)..."
                  value={newBrand}
                  onChange={e => setNewBrand(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Qo'shish
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-2">
                {brands.map(b => (
                  <span key={b.id} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                    {b.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Add Model Form */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Yangi Model Qo'shish
              </h3>

              <form onSubmit={handleAddModel} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Brend</label>
                    <select
                      required
                      value={newModel.brand_id}
                      onChange={e => setNewModel(m => ({ ...m, brand_id: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="">Brendni tanlang...</option>
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Model nomi</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Galaxy S25 Ultra"
                      value={newModel.name}
                      onChange={e => setNewModel(m => ({ ...m, name: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">RAM</label>
                    <input
                      type="text"
                      placeholder="12GB"
                      value={newModel.ram}
                      onChange={e => setNewModel(m => ({ ...m, ram: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Xotira</label>
                    <input
                      type="text"
                      placeholder="512GB"
                      value={newModel.storage}
                      onChange={e => setNewModel(m => ({ ...m, storage: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Chiqarilgan yili</label>
                    <input
                      type="number"
                      value={newModel.release_year}
                      onChange={e => setNewModel(m => ({ ...m, release_year: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                >
                  Modelni Qo'shish
                </button>
              </form>
            </div>

          </div>

          {/* Existing Models Grid */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Mavjud Modellar ({models.length} ta)
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
              {models.map(m => (
                <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">{m.brand_name}</span>
                  <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.ram} / {m.storage} ({m.release_year})</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
