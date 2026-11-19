import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Plus, Search, Filter, QrCode, ArrowRightLeft, 
  CheckCircle, AlertTriangle, Battery, ShieldCheck, Tag, Download,
  Layers, Package, Check, X, FileText, Clock, Image as ImageIcon
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PhoneThumbnail, PhotoPreviewModal, ImageUploader } from '../utils/phoneImages';
import DeviceQrLabelModal from '../components/DeviceQrLabelModal';

// Client-side Luhn Algorithm checker for instant live form feedback
function checkLuhn(imei) {
  if (!imei) return false;
  const s = String(imei).trim();
  if (!/^\d{15}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(s.charAt(i), 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d = (d % 10) + 1;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export default function InventoryPage() {
  const { canViewCostPrice, user } = useAuth();
  const { selectedBranch, showToast, branches } = useApp();

  // Photo preview modal state
  const [previewDevice, setPreviewDevice] = useState(null);

  const [activeTab, setActiveTab] = useState('phones'); // 'phones', 'accessories', 'transfers', 'audits'
  const [devices, setDevices] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // New Device Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    model_id: '',
    color_id: '',
    country_version: 'AQSH',
    imei1: '',
    imei2: '',
    serial_number: '',
    condition_type: 'Yangi (muhrlangan)',
    battery_pct: 100,
    condition_grade: 'A+',
    defects: [],
    package_items: ['quti', 'kabel'],
    purchase_price: '',
    extra_costs: 0,
    selling_price: '',
    min_price: '',
    warranty_months: 12,
    image_url: '',
    notes: ''
  });

  // Quick Add Model (when a new phone model just came out)
  const [showQuickModelModal, setShowQuickModelModal] = useState(false);
  const [quickModelForm, setQuickModelForm] = useState({
    brand_id: '',
    new_brand_name: '',
    is_new_brand: false,
    name: '',
    storage: '256GB',
    ram: '8GB',
    release_year: new Date().getFullYear()
  });

  const handleQuickCreateModel = async (e) => {
    e.preventDefault();
    if (!quickModelForm.name.trim()) {
      showToast('Model nomini kiriting (masalan: iPhone 16 Pro Max)', 'error');
      return;
    }

    try {
      let targetBrandId = quickModelForm.brand_id;
      if (quickModelForm.is_new_brand) {
        if (!quickModelForm.new_brand_name.trim()) {
          showToast('Yangi brend nomini kiriting', 'error');
          return;
        }
        const bRes = await apiRequest('/settings/brands', {
          method: 'POST',
          body: { name: quickModelForm.new_brand_name.trim() }
        });
        if (bRes.success) {
          targetBrandId = bRes.id;
          const brandObj = bRes.data || { id: bRes.id, name: quickModelForm.new_brand_name.trim() };
          setBrands(prev => [...prev, brandObj]);
        }
      }

      if (!targetBrandId) {
        showToast('Brendni tanlang yoki yangi kiriting', 'error');
        return;
      }

      const mRes = await apiRequest('/settings/models', {
        method: 'POST',
        body: {
          brand_id: targetBrandId,
          name: quickModelForm.name.trim(),
          storage: quickModelForm.storage.trim(),
          ram: quickModelForm.ram.trim(),
          release_year: quickModelForm.release_year
        }
      });

      if (mRes.success) {
        showToast(mRes.message || 'Yangi model tizimga kiritildi va tanlandi!', 'success');
        const createdModel = mRes.data || {
          id: mRes.id,
          brand_id: targetBrandId,
          name: quickModelForm.name.trim(),
          storage: quickModelForm.storage.trim(),
          brand_name: brands.find(b => b.id === Number(targetBrandId))?.name || 'Brend'
        };

        setModels(prev => [...prev, createdModel]);
        setForm(prev => ({ ...prev, model_id: createdModel.id }));
        setShowQuickModelModal(false);
        setQuickModelForm(prev => ({
          ...prev,
          new_brand_name: '',
          is_new_brand: false,
          name: ''
        }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedDeviceForTransfer, setSelectedDeviceForTransfer] = useState(null);
  const [transferTargetBranch, setTransferTargetBranch] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Inventory Audit (Inventarizatsiya)
  const [auditScannedImeis, setAuditScannedImeis] = useState('');
  const [auditResult, setAuditResult] = useState(null);

  // Label Print Modal
  const [activeLabelDevice, setActiveLabelDevice] = useState(null);

  // Load Inventory Data
  const loadInventory = async () => {
    setLoading(true);
    try {
      const dRes = await apiRequest(`/devices?branch_id=${selectedBranch}&status=${filterStatus}&condition_type=${filterCondition}&brand_id=${filterBrand}&search=${encodeURIComponent(search)}&limit=100`);
      if (dRes.success) setDevices(dRes.data);

      const aRes = await apiRequest(`/inventory/accessories?branch_id=${selectedBranch}`);
      if (aRes.success) setAccessories(aRes.data);

      const tRes = await apiRequest('/inventory/transfers');
      if (tRes.success) setTransfers(tRes.data);

      const brRes = await apiRequest('/settings/brands');
      if (brRes.success) setBrands(brRes.data);

      const mRes = await apiRequest('/settings/models');
      if (mRes.success) setModels(mRes.data);

      const cRes = await apiRequest('/settings/colors');
      if (cRes.success) setColors(cRes.data);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [selectedBranch, filterStatus, filterCondition, filterBrand]);

  // Handle Search Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      loadInventory();
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Create Device Form Handler
  const handleCreateDevice = async (e) => {
    e.preventDefault();

    if (!form.model_id || !form.imei1) {
      showToast('Model va IMEI 1 kiritilishi shart', 'error');
      return;
    }

    if (!checkLuhn(form.imei1)) {
      showToast('IMEI 1 formati noto\'g\'ri yoki Luhn nazoratidan o\'tmadi (15 xona)', 'error');
      return;
    }

    try {
      const res = await apiRequest('/devices', {
        method: 'POST',
        body: {
          ...form,
          branch_id: selectedBranch !== 'all' ? selectedBranch : (user?.branch_id || 1)
        }
      });

      if (res.success) {
        showToast(res.message, 'success');
        setShowAddModal(false);
        setForm({
          model_id: '',
          color_id: '',
          country_version: 'AQSH',
          imei1: '',
          imei2: '',
          serial_number: '',
          condition_type: 'Yangi (muhrlangan)',
          battery_pct: 100,
          condition_grade: 'A+',
          defects: [],
          package_items: ['quti', 'kabel'],
          purchase_price: '',
          extra_costs: 0,
          selling_price: '',
          min_price: '',
          warranty_months: 12,
          notes: ''
        });
        loadInventory();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Execute Transfer
  const handleSendTransfer = async () => {
    if (!transferTargetBranch) {
      showToast('Qabul qiluvchi filialni tanlang', 'error');
      return;
    }

    try {
      const res = await apiRequest('/inventory/transfer/send', {
        method: 'POST',
        body: {
          device_id: selectedDeviceForTransfer.id,
          to_branch_id: Number(transferTargetBranch),
          notes: transferNotes
        }
      });

      if (res.success) {
        showToast(res.message, 'success');
        setTransferModalOpen(false);
        setSelectedDeviceForTransfer(null);
        loadInventory();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Accept Transfer
  const handleAcceptTransfer = async (deviceId) => {
    try {
      const res = await apiRequest('/inventory/transfer/accept', {
        method: 'POST',
        body: { device_id: deviceId }
      });
      if (res.success) {
        showToast(res.message, 'success');
        loadInventory();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Run Inventory Audit (Inventarizatsiya)
  const handleRunAudit = async () => {
    const imeis = auditScannedImeis
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (imeis.length === 0) {
      showToast('Kamida 1 ta IMEI kiriting', 'error');
      return;
    }

    try {
      const res = await apiRequest('/inventory/audits/reconcile', {
        method: 'POST',
        body: {
          branch_id: selectedBranch !== 'all' ? selectedBranch : (user?.branch_id || 1),
          scanned_imeis: imeis
        }
      });

      if (res.success) {
        setAuditResult(res.data);
        showToast(`Inventarizatsiya yakunlandi! Topildi: ${res.data.matched_count}, Kamomad: ${res.data.missing_count}`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isImei1Valid = checkLuhn(form.imei1);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Top Banner & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Ombor va Telefonlar Boshqaruvi
          </h1>
          <p className="text-xs text-slate-500">
            Real vaqt rejimida qoldiq, IMEI nazorati, Luhn tekshiruvi va filiallararo ko'chirish
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/reports/export/devices"
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            <span>Excelga Yuklash</span>
          </a>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Telefon Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'phones', label: `Barcha Telefonlar (${devices.length})`, icon: Smartphone },
          { id: 'accessories', label: `Aksessuarlar (${accessories.length})`, icon: Tag },
          { id: 'transfers', label: `Filiallararo Ko'chirish (${transfers.length})`, icon: ArrowRightLeft },
          { id: 'audits', label: 'Inventarizatsiya (Reconciliation)', icon: CheckCircle }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`btn-tab ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. PHONES VIEW */}
      {activeTab === 'phones' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="IMEI 15 xona, model nomi yoki seriya..."
                className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Brand filter */}
              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Barcha brendlar</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Barcha holatlar</option>
                <option value="omborda">Omborda mavjud</option>
                <option value="sotilgan">Sotilgan</option>
                <option value="ta'mirda">Ta'mirda</option>
                <option value="yo'lda">Yo'lda (Ko'chirish)</option>
                <option value="zahirada">Zahirada (Bron)</option>
              </select>

              {/* Condition filter */}
              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Barcha turlar</option>
                <option value="Yangi (muhrlangan)">Yangi (muhrlangan)</option>
                <option value="Yangi (ochilgan)">Yangi (ochilgan)</option>
                <option value="B/U (ishlatilgan)">B/U (ishlatilgan)</option>
                <option value="Ta'mirdan chiqqan">Ta'mirdan chiqqan</option>
              </select>

              {/* Sorting selector (Saralash) */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="newest">🕒 Saralash: Eng yangilari</option>
                <option value="price_desc">💰 Narx: Qimmatdan arzonga</option>
                <option value="price_asc">💵 Narx: Arzondan qimmatga</option>
                <option value="model_asc">🔤 Model: A dan Z gacha</option>
                <option value="battery_desc">🔋 Batareya: Yuqoridan pastga</option>
              </select>
            </div>

          </div>

          {/* Devices Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Model & Holat</th>
                    <th className="py-3 px-4">IMEI 1 / 2</th>
                    <th className="py-3 px-4">Holat / Batareya</th>
                    {canViewCostPrice() && <th className="py-3 px-4">Tannarx</th>}
                    <th className="py-3 px-4">Sotuv Narxi</th>
                    <th className="py-3 px-4">Filial</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(() => {
                    const sortedDevices = [...devices].sort((a, b) => {
                      if (sortBy === 'price_desc') return (Number(b.selling_price) || 0) - (Number(a.selling_price) || 0);
                      if (sortBy === 'price_asc') return (Number(a.selling_price) || 0) - (Number(b.selling_price) || 0);
                      if (sortBy === 'model_asc') return (a.model_name || '').localeCompare(b.model_name || '');
                      if (sortBy === 'battery_desc') return (Number(b.battery_pct) || 0) - (Number(a.battery_pct) || 0);
                      return b.id - a.id;
                    });

                    if (sortedDevices.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                            Telefonlar topilmadi
                          </td>
                        </tr>
                      );
                    }

                    return sortedDevices.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <PhoneThumbnail
                              device={d}
                              className="w-10 h-12 shadow-xs shrink-0"
                              onPreview={(dev) => setPreviewDevice(dev)}
                            />
                            <div>
                              <div 
                                className="font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer" 
                                onClick={() => setPreviewDevice(d)}
                              >
                                {d.model_name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {d.storage} • {d.color_name} {d.country_version ? `• ${d.country_version}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <span>{d.imei1}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Luhn tekshiruvidan o'tgan" />
                          </div>
                          {d.imei2 && (
                            <div className="text-[10px] text-slate-400">
                              {d.imei2}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.condition_type.includes('Yangi')
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {d.condition_type}
                          </span>
                          {d.battery_pct && (
                            <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">
                              🔋 {d.battery_pct}% • {d.condition_grade}
                            </span>
                          )}
                        </td>

                        {canViewCostPrice() && (
                          <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                            {Number(d.cost_price).toLocaleString()} UZS
                          </td>
                        )}

                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {Number(d.selling_price).toLocaleString()} UZS
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            Min: {Number(d.min_price).toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {d.branch_name || 'Bosh ofis'}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                            d.status === 'omborda' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            d.status === 'sotilgan' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                            d.status === 'yo\'lda' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 animate-pulse' :
                            d.status === 'ta\'mirda' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {d.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          {/* Print Label QR */}
                          <button
                            onClick={() => setActiveLabelDevice(d)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-lg transition-colors"
                            title="Shtrix kod / QR narx yorlig'ini chiqarish"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Transfer Phone */}
                          {d.status === 'omborda' && (
                            <button
                              onClick={() => {
                                setSelectedDeviceForTransfer(d);
                                setTransferModalOpen(true);
                              }}
                              className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Boshqa filialga ko'chirish"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          {/* Accept incoming transfer */}
                          {d.status === 'yo\'lda' && (
                            <button
                              onClick={() => handleAcceptTransfer(d.id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold shadow-xs hover:bg-emerald-700"
                            >
                              Qabul Qilish
                            </button>
                          )}
                        </td>

                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 2. ACCESSORIES VIEW */}
      {activeTab === 'accessories' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Aksessuarlar (G'ilof, Oyna, Zaryadlovchi va Kabellar - Soni bo'yicha hisob)
            </h3>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Nomi</th>
                  <th className="py-2.5 px-3">Kategoriya</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Qoldiq Soni</th>
                  {canViewCostPrice() && <th className="py-2.5 px-3">Tannarx</th>}
                  <th className="py-2.5 px-3">Sotuv Narxi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accessories.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">{a.name}</td>
                    <td className="py-3 px-3 text-slate-500">{a.category}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{a.sku}</td>
                    <td className="py-3 px-3">
                      <span className={`font-extrabold px-2 py-0.5 rounded ${
                        a.stock_qty <= a.min_alert_qty ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {a.stock_qty} dona
                      </span>
                    </td>
                    {canViewCostPrice() && (
                      <td className="py-3 px-3 font-mono">{Number(a.cost_price).toLocaleString()} UZS</td>
                    )}
                    <td className="py-3 px-3 font-extrabold text-blue-600">{Number(a.selling_price).toLocaleString()} UZS</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TRANSFERS HISTORY VIEW */}
      {activeTab === 'transfers' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Filiallararo Ko'chirish Jurnali
          </h3>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Sana</th>
                  <th className="py-2.5 px-3">Telefon</th>
                  <th className="py-2.5 px-3">IMEI</th>
                  <th className="py-2.5 px-3">Qayerdan</th>
                  <th className="py-2.5 px-3">Qayerga</th>
                  <th className="py-2.5 px-3">Holati</th>
                  <th className="py-2.5 px-3">Mas'ul xodim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfers.map(tr => (
                  <tr key={tr.id}>
                    <td className="py-3 px-3 text-slate-400">{new Date(tr.created_at).toLocaleDateString('uz-UZ')}</td>
                    <td className="py-3 px-3 font-bold">{tr.model_name || 'Telefon'}</td>
                    <td className="py-3 px-3 font-mono">{tr.imei1}</td>
                    <td className="py-3 px-3">{tr.from_branch_name}</td>
                    <td className="py-3 px-3 font-semibold text-blue-600">{tr.to_branch_name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tr.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800 animate-pulse'
                      }`}>
                        {tr.status === 'completed' ? 'Yetib bordi' : 'Yo\'lda'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{tr.created_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. INVENTORY AUDIT (INVENTARIZATSIYA) */}
      {activeTab === 'audits' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Haqiqiy Qoldiqni Skaner Qilish
            </h3>
            <p className="text-xs text-slate-500">
              Ombordagi telefonlar IMEI larini ketma-ket skaner qiling yoki nusxalab qo'ying (har bir satrda 1 ta IMEI):
            </p>

            <textarea
              rows={8}
              value={auditScannedImeis}
              onChange={(e) => setAuditScannedImeis(e.target.value)}
              placeholder="356984110000000&#10;356984130000000&#10;356984150000000"
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:outline-none"
            />

            <button
              onClick={handleRunAudit}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-98 transition-all"
            >
              Haqiqiy Qoldiq bilan Solishtirish (Solishtirma)
            </button>
          </div>

          {/* Audit Results View */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Inventarizatsiya Natijasi
            </h3>

            {auditResult ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <span className="block text-lg font-black text-emerald-700">{auditResult.matched_count}</span>
                    <span className="text-[11px] font-bold text-emerald-600">Topildi (Mos keldi)</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                    <span className="block text-lg font-black text-rose-700">{auditResult.missing_count}</span>
                    <span className="text-[11px] font-bold text-rose-600">Kamomad (Yo'q)</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                    <span className="block text-lg font-black text-amber-700">{auditResult.surplus_count}</span>
                    <span className="text-[11px] font-bold text-amber-600">Ortiqcha / Notanish</span>
                  </div>
                </div>

                {auditResult.missing?.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="font-bold text-rose-700">Kamomad qilingan telefonlar:</h5>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {auditResult.missing.map((m, i) => (
                        <div key={i} className="p-2 bg-rose-50 rounded-xl flex justify-between font-mono">
                          <span>{m.model_name}</span>
                          <span className="font-bold">{m.imei}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                Solishtirish tugmasini bosgach, bu yerda tafovutlar ko'rinadi
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW DEVICE MODAL (With Luhn live validation) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 my-8">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Yangi Telefon Kartochkasini Ochish
                </h3>
                <p className="text-xs text-slate-500">
                  IMEI va Luhn algoritmi bo'yicha to'liq tekshiruv bilan
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-4 text-xs">
              
              {/* Model & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Telefon Modeli *:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickModelModal(true)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Yangi model kiritish</span>
                    </button>
                  </div>
                  <select
                    value={form.model_id}
                    onChange={(e) => setForm({ ...form, model_id: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="">Tanlang...</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.brand_name} {m.name} ({m.storage})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Rangi:
                  </label>
                  <select
                    value={form.color_id}
                    onChange={(e) => setForm({ ...form, color_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="">Tanlang...</option>
                    {colors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* IMEI 1 with live Luhn indicator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    IMEI 1 (15 xonali raqam) *:
                  </label>
                  {form.imei1 && (
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${
                      isImei1Valid ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isImei1Valid ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> Luhn algoritmidan o'tdi</>
                      ) : (
                        <><AlertTriangle className="w-3.5 h-3.5" /> Noto'g'ri Luhn nazorat raqami!</>
                      )}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={15}
                  value={form.imei1}
                  onChange={(e) => setForm({ ...form, imei1: e.target.value.replace(/\D/g, '') })}
                  required
                  placeholder="358742100000000"
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs font-bold tracking-wider focus:outline-none ${
                    form.imei1 && !isImei1Valid 
                      ? 'border-rose-400 bg-rose-50/50 text-rose-900' 
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}
                />
              </div>

              {/* IMEI 2 & Serial Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    IMEI 2 (ixtiyoriy):
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={form.imei2}
                    onChange={(e) => setForm({ ...form, imei2: e.target.value.replace(/\D/g, '') })}
                    placeholder="358742100000001"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Davlat Versiyasi:
                  </label>
                  <select
                    value={form.country_version}
                    onChange={(e) => setForm({ ...form, country_version: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="AQSH">AQSH (LL/A)</option>
                    <option value="Dubay">Dubay (AE/A)</option>
                    <option value="Yevropa">Yevropa (ZD/A)</option>
                    <option value="Gonkong">Gonkong (ZA/A Dual-Sim)</option>
                    <option value="Yaponiya">Yaponiya (J/A)</option>
                    <option value="MDH">MDH / Global</option>
                  </select>
                </div>
              </div>

              {/* Condition & Battery */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Holat Turi:
                  </label>
                  <select
                    value={form.condition_type}
                    onChange={(e) => setForm({ ...form, condition_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Yangi (muhrlangan)">Yangi (muhrlangan)</option>
                    <option value="Yangi (ochilgan)">Yangi (ochilgan)</option>
                    <option value="B/U (ishlatilgan)">B/U (ishlatilgan)</option>
                    <option value="Ta'mirdan chiqqan">Ta'mirdan chiqqan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Batareya Holati (%):
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={form.battery_pct}
                    onChange={(e) => setForm({ ...form, battery_pct: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Kafolat (Oy):
                  </label>
                  <input
                    type="number"
                    value={form.warranty_months}
                    onChange={(e) => setForm({ ...form, warranty_months: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Financials (Purchase price, Selling price, Min price) */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Xarid Narxi (Tannarx) *:
                  </label>
                  <input
                    type="number"
                    value={form.purchase_price}
                    onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                    placeholder="10000000"
                    required
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Sotuv Narxi *:
                  </label>
                  <input
                    type="number"
                    value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                    placeholder="12000000"
                    required
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Minimal Narx (Cheklov):
                  </label>
                  <input
                    type="number"
                    value={form.min_price}
                    onChange={(e) => setForm({ ...form, min_price: e.target.value })}
                    placeholder="11500000"
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              {/* Phone Image Upload / Camera */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <ImageUploader
                  photo={form.image_url}
                  onPhotoChange={(url) => setForm({ ...form, image_url: url })}
                  label="Telefonning Haqiqiy Rasmi (Kamera yoki Fayl)"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={!isImei1Valid}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-500/25"
                >
                  Telefonni Ro'yxatga Olish
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {transferModalOpen && selectedDeviceForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <span>Filiallararo Ko'chirish</span>
            </h4>
            <p className="text-slate-500">
              {selectedDeviceForTransfer.model_name} (IMEI: {selectedDeviceForTransfer.imei1})
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Qabul qiluvchi filial:</label>
              <select
                value={transferTargetBranch}
                onChange={(e) => setTransferTargetBranch(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                <option value="">Filialni tanlang...</option>
                {branches.filter(b => b.id !== selectedDeviceForTransfer.branch_id).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Izoh:</label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Kuriyer orqali jo'natildi..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setTransferModalOpen(false)} className="px-3 py-1.5 text-slate-400">Bekor</button>
              <button onClick={handleSendTransfer} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl">Jo'natish (Yo'lda)</button>
            </div>
          </div>
        </div>
      )}

      {/* Real QR Code & Label Print Modal */}
      {activeLabelDevice && (
        <DeviceQrLabelModal
          device={activeLabelDevice}
          onClose={() => setActiveLabelDevice(null)}
        />
      )}

      {/* QUICK ADD MODEL MODAL (When phone is newly released) */}
      {showQuickModelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 my-8 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Yangi Chiqqan Modelni Kiritish</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tizimda hali yo'q bo'lgan yangi telefonni shu yerda kiritib qabul qiling
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQuickModelModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateModel} className="space-y-3.5">
              
              {/* Brand selection / New brand */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Ishlab chiqaruvchi (Brend) *:
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickModelForm(prev => ({ ...prev, is_new_brand: !prev.is_new_brand }))}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                  >
                    {quickModelForm.is_new_brand ? "← Ro'yxatdan tanlash" : "+ Yangi brend yozish"}
                  </button>
                </div>

                {quickModelForm.is_new_brand ? (
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Nothing, OnePlus, Google..."
                    value={quickModelForm.new_brand_name}
                    onChange={(e) => setQuickModelForm({ ...quickModelForm, new_brand_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-bold"
                  />
                ) : (
                  <select
                    value={quickModelForm.brand_id}
                    onChange={(e) => setQuickModelForm({ ...quickModelForm, brand_id: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Modelning To'liq Nomi *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: iPhone 16 Pro Max yoki Galaxy S25 Ultra"
                  value={quickModelForm.name}
                  onChange={(e) => setQuickModelForm({ ...quickModelForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              {/* Storage (Xotira) with Quick Select Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ichki Xotira (Storage) *:
                </label>
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  {['64GB', '128GB', '256GB', '512GB', '1TB'].map(s => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setQuickModelForm({ ...quickModelForm, storage: s })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        quickModelForm.storage === s 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="256GB"
                  value={quickModelForm.storage}
                  onChange={(e) => setQuickModelForm({ ...quickModelForm, storage: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              {/* RAM & Release Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Operativ Xotira (RAM):
                  </label>
                  <input
                    type="text"
                    placeholder="8GB"
                    value={quickModelForm.ram}
                    onChange={(e) => setQuickModelForm({ ...quickModelForm, ram: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chiqqan Yili:
                  </label>
                  <input
                    type="number"
                    value={quickModelForm.release_year}
                    onChange={(e) => setQuickModelForm({ ...quickModelForm, release_year: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickModelModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Saqlash & Tanlash</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Lightbox */}
      {previewDevice && (
        <PhotoPreviewModal
          device={previewDevice}
          onClose={() => setPreviewDevice(null)}
        />
      )}

    </div>
  );
}
