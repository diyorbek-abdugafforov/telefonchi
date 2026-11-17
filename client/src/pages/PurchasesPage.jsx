import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, Search, Truck, User, FileText, Check, 
  Printer, AlertTriangle, ShieldCheck, DollarSign, Smartphone, X 
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PhoneThumbnail, PhotoPreviewModal, ImageUploader } from '../utils/phoneImages';

// Simple 15-digit Luhn check
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

export default function PurchasesPage() {
  const { user } = useAuth();
  const { selectedBranch, showToast, usdRate } = useApp();

  // Photo preview modal state
  const [previewDevice, setPreviewDevice] = useState(null);

  const [activeTab, setActiveTab] = useState('suppliers'); // 'suppliers' or 'buyouts'
  const [purchases, setPurchases] = useState([]);
  const [buyouts, setBuyouts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [colors, setColors] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);

  // Quick Add Model (when a new phone model just came out)
  const [showQuickModelModal, setShowQuickModelModal] = useState(false);
  const [quickModelTarget, setQuickModelTarget] = useState('buyout'); // 'buyout' or 'supplier'
  const [quickModelForm, setQuickModelForm] = useState({
    brand_id: '',
    new_brand_name: '',
    is_new_brand: false,
    name: '',
    storage: '256GB',
    ram: '8GB',
    release_year: new Date().getFullYear()
  });

  // Wholesale Purchase Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    supplier_id: '',
    invoice_number: '',
    currency: 'UZS',
    exchange_rate: usdRate || 12850,
    paid_amount: '',
    cash_account_id: '',
    extra_costs: 0,
    notes: '',
    devices: [] // array of { model_id, color_id, imei1, condition_type, purchase_price, selling_price }
  });
  const [tempDevice, setTempDevice] = useState({
    model_id: '',
    color_id: '',
    imei1: '',
    condition_type: 'Yangi (muhrlangan)',
    purchase_price: '',
    selling_price: ''
  });

  // Skupka (Aholidan xarid akti) Modal
  const [showBuyoutModal, setShowBuyoutModal] = useState(false);
  const [buyoutForm, setBuyoutForm] = useState({
    customer_name: '',
    customer_phone: '',
    passport_series: 'AA',
    passport_number: '',
    model_id: '',
    model_name: '',
    color_id: '',
    imei: '',
    battery_pct: 88,
    condition_grade: 'A',
    agreed_price: '',
    selling_price: '',
    cash_account_id: '',
    image_url: '',
    is_clean_confirmed: true,
    checklist: {
      screen_ok: true,
      body_ok: true,
      face_id_ok: true,
      icloud_clean: true,
      camera_ok: true,
      water_damage_none: true
    }
  });

  // Active printable Buyout Act
  const [activeBuyoutAct, setActiveBuyoutAct] = useState(null);

  const loadData = async () => {
    try {
      const pRes = await apiRequest('/purchases');
      if (pRes.success) setPurchases(pRes.data);

      const bRes = await apiRequest('/purchases/buyouts');
      if (bRes.success) setBuyouts(bRes.data);

      const sRes = await apiRequest('/suppliers');
      if (sRes.success) setSuppliers(sRes.data);

      const brRes = await apiRequest('/settings/brands');
      if (brRes.success) {
        setBrands(brRes.data);
        if (brRes.data.length > 0) {
          setQuickModelForm(prev => ({ ...prev, brand_id: prev.brand_id || brRes.data[0].id }));
        }
      }

      const mRes = await apiRequest('/settings/models');
      if (mRes.success) setModels(mRes.data);

      const cRes = await apiRequest('/settings/colors');
      if (cRes.success) setColors(cRes.data);

      const caRes = await apiRequest('/finance/accounts');
      if (caRes.success) {
        setCashAccounts(caRes.data);
        if (caRes.data.length > 0) {
          setSupplierForm(prev => ({ ...prev, cash_account_id: caRes.data[0].id }));
          setBuyoutForm(prev => ({ ...prev, cash_account_id: caRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error loading purchases data:', err);
    }
  };

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

        // Auto-select in current receiving form
        if (quickModelTarget === 'buyout') {
          setBuyoutForm(prev => ({
            ...prev,
            model_id: createdModel.id,
            model_name: `${createdModel.brand_name || ''} ${createdModel.name}`
          }));
        } else if (quickModelTarget === 'supplier') {
          setTempDevice(prev => ({
            ...prev,
            model_id: createdModel.id
          }));
        }

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

  useEffect(() => {
    loadData();
  }, []);

  // Add item to wholesale purchase
  const handleAddDeviceToPurchase = () => {
    if (!tempDevice.model_id || !tempDevice.imei1 || !tempDevice.purchase_price) {
      showToast('Model, IMEI va xarid narxi kiritilishi shart', 'error');
      return;
    }
    if (!checkLuhn(tempDevice.imei1)) {
      showToast('IMEI Luhn nazoratidan o\'tmadi (15 xona)', 'error');
      return;
    }

    const modelObj = models.find(m => m.id === Number(tempDevice.model_id));
    setSupplierForm(prev => ({
      ...prev,
      devices: [
        ...prev.devices,
        {
          ...tempDevice,
          model_name: modelObj ? `${modelObj.brand_name} ${modelObj.name} (${modelObj.storage})` : 'Model'
        }
      ]
    }));

    setTempDevice({
      model_id: tempDevice.model_id,
      color_id: tempDevice.color_id,
      imei1: '',
      condition_type: tempDevice.condition_type,
      purchase_price: tempDevice.purchase_price,
      selling_price: tempDevice.selling_price
    });
  };

  // Submit Wholesale Purchase
  const handleSubmitSupplierPurchase = async (e) => {
    e.preventDefault();
    if (!supplierForm.supplier_id || supplierForm.devices.length === 0) {
      showToast('Yetkazib beruvchi va kamida 1 ta telefon qo\'shilishi shart', 'error');
      return;
    }

    try {
      const res = await apiRequest('/purchases/supplier', {
        method: 'POST',
        body: {
          ...supplierForm,
          branch_id: selectedBranch !== 'all' ? selectedBranch : 1
        }
      });

      if (res.success) {
        showToast(res.message, 'success');
        setShowSupplierModal(false);
        setSupplierForm({
          supplier_id: '',
          invoice_number: '',
          currency: 'UZS',
          exchange_rate: usdRate || 12850,
          paid_amount: '',
          cash_account_id: cashAccounts[0]?.id || '',
          extra_costs: 0,
          notes: '',
          devices: []
        });
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Submit Buyout from Public (Aholidan skupka akti)
  const handleSubmitBuyout = async (e) => {
    e.preventDefault();
    if (!buyoutForm.customer_name || !buyoutForm.passport_number || !buyoutForm.imei || !buyoutForm.agreed_price) {
      showToast('Mijoz ismi, pasporti, IMEI va narxi shart', 'error');
      return;
    }
    if (!checkLuhn(buyoutForm.imei)) {
      showToast('IMEI 15 xonali Luhn nazoratidan o\'tmadi', 'error');
      return;
    }

    const modelObj = models.find(m => m.id === Number(buyoutForm.model_id));
    const modelName = modelObj ? `${modelObj.brand_name} ${modelObj.name}` : (buyoutForm.model_name || 'B/U Telefon');

    try {
      const res = await apiRequest('/purchases/buyouts', {
        method: 'POST',
        body: {
          ...buyoutForm,
          model_name: modelName
        }
      });

      if (res.success) {
        showToast(res.message, 'success');
        setShowBuyoutModal(false);
        setActiveBuyoutAct({
          ...buyoutForm,
          model_name: modelName,
          act_number: res.data.actNumber,
          created_at: new Date().toISOString()
        });
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isSeller = user?.role === 'seller';

  useEffect(() => {
    if (isSeller) {
      setActiveTab('buyouts');
    }
  }, [isSeller]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {isSeller ? "Aholidan Telefon Qabul Qilish (Skupka)" : "Xaridlar va Skupka (Qabul Qilish)"}
          </h1>
          <p className="text-xs text-slate-500">
            {isSeller 
              ? "Mijozlardan B/U telefonlarni pasport bilan sotib olish va qonuniy A4 dalolatnoma tuzish" 
              : "Yetkazib beruvchilardan ulgurji qabul qilish hamda aholidan b/u telefon sotib olish aktlari"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBuyoutModal(true)}
            className="btn-primary"
          >
            <Smartphone className="w-4 h-4" />
            <span>Aholidan Skupka (Akt)</span>
          </button>

          {!isSeller && (
            <button
              onClick={() => setShowSupplierModal(true)}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4" />
              <span>Ulgurji Xarid (Optom)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
        {!isSeller && (
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`btn-tab ${
              activeTab === 'suppliers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Yetkazib Beruvchilar Xaridlari ({purchases.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('buyouts')}
          className={`btn-tab ${
            activeTab === 'buyouts'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Aholidan Skupka Aktlari ({buyouts.length})</span>
        </button>
      </div>

      {/* 1. SUPPLIER PURCHASES LIST */}
      {activeTab === 'suppliers' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Faktura №</th>
                  <th className="py-3 px-4">Yetkazib Beruvchi</th>
                  <th className="py-3 px-4">Filial</th>
                  <th className="py-3 px-4">Jami Summa</th>
                  <th className="py-3 px-4">To'landi</th>
                  <th className="py-3 px-4">Qarz Qoldi</th>
                  <th className="py-3 px-4">Sana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.invoice_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{p.supplier_name}</td>
                    <td className="py-3 px-4 text-slate-500">{p.branch_name}</td>
                    <td className="py-3 px-4 font-extrabold">{Number(p.total_amount).toLocaleString()} UZS</td>
                    <td className="py-3 px-4 text-emerald-600 font-semibold">{Number(p.paid_amount).toLocaleString()} UZS</td>
                    <td className="py-3 px-4">
                      {Number(p.debt_amount) > 0 ? (
                        <span className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                          {Number(p.debt_amount).toLocaleString()} UZS
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[11px] font-bold">To'liq to'langan</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(p.created_at).toLocaleDateString('uz-UZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. BUYOUTS LIST (SKUPKA AKTLARI) */}
      {activeTab === 'buyouts' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Akt №</th>
                  <th className="py-3 px-4">Mijoz (Sotuvchi)</th>
                  <th className="py-3 px-4">Pasport</th>
                  <th className="py-3 px-4">Model & IMEI</th>
                  <th className="py-3 px-4">Kelishilgan Narx</th>
                  <th className="py-3 px-4">Kassadan Chiqim</th>
                  <th className="py-3 px-4">Sana</th>
                  <th className="py-3 px-4 text-right">Hujjat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {buyouts.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{b.act_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{b.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">{b.passport_series} {b.passport_number}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <PhoneThumbnail
                          device={{
                            model_name: b.model_name,
                            image_url: b.passport_photo || b.image_url,
                            imei1: b.imei,
                            selling_price: b.agreed_price
                          }}
                          className="w-9 h-11 shadow-xs shrink-0"
                          onPreview={() => setPreviewDevice({
                            model_name: b.model_name,
                            image_url: b.passport_photo || b.image_url,
                            imei1: b.imei,
                            selling_price: b.agreed_price,
                            condition_type: "B/U (Skupka)",
                            storage: b.condition_details || ''
                          })}
                        />
                        <div>
                          <div 
                            className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition-colors cursor-pointer"
                            onClick={() => setPreviewDevice({
                              model_name: b.model_name,
                              image_url: b.passport_photo || b.image_url,
                              imei1: b.imei,
                              selling_price: b.agreed_price,
                              condition_type: "B/U (Skupka)",
                              storage: b.condition_details || ''
                            })}
                          >
                            {b.model_name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">IMEI: {b.imei}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-blue-600">{Number(b.agreed_price).toLocaleString()} UZS</td>
                    <td className="py-3 px-4 text-slate-500">{b.cash_account_name || 'Asosiy kassa'}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(b.created_at).toLocaleDateString('uz-UZ')}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActiveBuyoutAct(b)}
                        className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold hover:bg-indigo-100 flex items-center gap-1 ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Akt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WHOLESALE SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 my-8 text-xs">
            
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Yetkazib Beruvchidan Ulgurji Xarid (Optom Faktura)
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupplierPurchase} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Yetkazib beruvchi *:</label>
                  <select
                    value={supplierForm.supplier_id}
                    onChange={(e) => setSupplierForm({ ...supplierForm, supplier_id: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="">Tanlang...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company_name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Faktura Raqami:</label>
                  <input
                    type="text"
                    placeholder="INV-09823"
                    value={supplierForm.invoice_number}
                    onChange={(e) => setSupplierForm({ ...supplierForm, invoice_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Qo'shimcha xarajat (Yetkazish):</label>
                  <input
                    type="number"
                    placeholder="0 UZS"
                    value={supplierForm.extra_costs}
                    onChange={(e) => setSupplierForm({ ...supplierForm, extra_costs: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Add device to batch input strip */}
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 dark:text-blue-200 block text-[11px]">
                    Fakturaga telefon qo'shish (IMEI skaner qiling):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickModelTarget('supplier');
                      setShowQuickModelModal(true);
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Yangi chiqqan model kiritish</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <select
                    value={tempDevice.model_id}
                    onChange={(e) => setTempDevice({ ...tempDevice, model_id: e.target.value })}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="">Modelni tanlang...</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.brand_name} {m.name} ({m.storage})</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    maxLength={15}
                    placeholder="IMEI 1 (15 xona)"
                    value={tempDevice.imei1}
                    onChange={(e) => setTempDevice({ ...tempDevice, imei1: e.target.value.replace(/\D/g, '') })}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
                  />

                  <input
                    type="number"
                    placeholder="Xarid narxi (UZS)"
                    value={tempDevice.purchase_price}
                    onChange={(e) => setTempDevice({ ...tempDevice, purchase_price: e.target.value })}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
                  />

                  <button
                    type="button"
                    onClick={handleAddDeviceToPurchase}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Qo'shish</span>
                  </button>
                </div>
              </div>

              {/* Added devices list */}
              <div className="max-h-48 overflow-y-auto border rounded-2xl divide-y">
                {supplierForm.devices.map((d, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold">{d.model_name}</span>
                      <span className="font-mono text-slate-500 ml-2">IMEI: {d.imei1}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-800 dark:text-slate-200">{Number(d.purchase_price).toLocaleString()} UZS</span>
                      <button
                        type="button"
                        onClick={() => setSupplierForm(prev => ({ ...prev, devices: prev.devices.filter((_, i) => i !== idx) }))}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment strip */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">To'lanayotgan summa:</label>
                  <input
                    type="number"
                    placeholder="0 UZS"
                    value={supplierForm.paid_amount}
                    onChange={(e) => setSupplierForm({ ...supplierForm, paid_amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">To'lov hisobi (Kassa):</label>
                  <select
                    value={supplierForm.cash_account_id}
                    onChange={(e) => setSupplierForm({ ...supplierForm, cash_account_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  >
                    {cashAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 text-slate-400">Bekor</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md">Xaridni Saqlash & Qabul Qilish</button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* SKUPKA / BUYOUT MODAL */}
      {showBuyoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 my-8 text-xs">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-indigo-900 dark:text-indigo-200">
                  Aholidan B/U Telefon Sotib Olish (Skupka Akti)
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Pasport ma'lumotlari, o'g'irlik tekshiruvi va qabul qilish dalolatnomasi bilan
                </p>
              </div>
              <button onClick={() => setShowBuyoutModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBuyout} className="space-y-4">
              
              {/* Seller details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                  Sotuvchi Fuqaro Ma'lumotlari:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="F.I.Sh. (To'liq ismi)"
                    value={buyoutForm.customer_name}
                    onChange={(e) => setBuyoutForm({ ...buyoutForm, customer_name: e.target.value })}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Telefon raqami"
                    value={buyoutForm.customer_phone}
                    onChange={(e) => setBuyoutForm({ ...buyoutForm, customer_phone: e.target.value })}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    maxLength={2}
                    required
                    placeholder="Pasport Seriya (AA)"
                    value={buyoutForm.passport_series}
                    onChange={(e) => setBuyoutForm({ ...buyoutForm, passport_series: e.target.value.toUpperCase() })}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold uppercase"
                  />
                  <input
                    type="text"
                    maxLength={7}
                    required
                    placeholder="Pasport Raqami (7654321)"
                    value={buyoutForm.passport_number}
                    onChange={(e) => setBuyoutForm({ ...buyoutForm, passport_number: e.target.value })}
                    className="col-span-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Phone details & IMEI */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Telefon Modeli *:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickModelTarget('buyout');
                        setShowQuickModelModal(true);
                      }}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Yangi chiqqan model kiritish</span>
                    </button>
                  </div>
                  <select
                    value={buyoutForm.model_id}
                    onChange={(e) => setBuyoutForm({ ...buyoutForm, model_id: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="">Tanlang...</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.brand_name} {m.name} ({m.storage})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">IMEI (15 xona) *:</label>
                  <input
                    type="text"
                    maxLength={15}
                    required
                    placeholder="358742100000000"
                    value={buyoutForm.imei}
                    onChange={(e) => setBuyoutForm({ ...buyoutForm, imei: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900 space-y-2">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tekshiruv Nazorat Ro'yxati (Checklist):</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                    <span>Ekran butun va original</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                    <span>Face ID / Touch ID ishlaydi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                    <span>iCloud / Google akkaunt toza</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                    <span>O'g'irlangan / Blokda emas (tasdiqlandi)</span>
                  </label>
                </div>
              </div>

              {/* Phone Physical Condition Photo */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <ImageUploader
                  photo={buyoutForm.image_url}
                  onPhotoChange={(url) => setBuyoutForm({ ...buyoutForm, image_url: url })}
                  label="Qabul Qilinayotgan Telefon Rasmi (Holati / Chiziqlari / Kamera)"
                />
              </div>

              {/* Price & Cash Out */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Kelishilgan narx (UZS) *:</label>
                  <input
                    type="number"
                    required
                    placeholder="5000000"
                    value={buyoutForm.agreed_price}
                    onChange={(e) => setBuyoutForm({ ...buyoutForm, agreed_price: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold text-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">To'lov qilinadigan kassa:</label>
                  <select
                    value={buyoutForm.cash_account_id}
                    onChange={(e) => setBuyoutForm({ ...buyoutForm, cash_account_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  >
                    {cashAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({Number(a.balance).toLocaleString()} so'm)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowBuyoutModal(false)} className="px-4 py-2 text-slate-400">Bekor</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md">
                  Aktni Rasmiylashtirish & Omborga Qabul
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PRINTABLE BUYOUT ACT MODAL */}
      {activeBuyoutAct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full text-black space-y-4 shadow-2xl border font-sans text-xs">
            
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold uppercase text-indigo-900">
                  Telefonni Qabul Qilish Dalolatnomasi (Akt)
                </h3>
                <p className="text-[11px] text-gray-500">№ {activeBuyoutAct.act_number}</p>
              </div>
              <p className="text-xs text-gray-600 font-mono">{new Date(activeBuyoutAct.created_at || Date.now()).toLocaleDateString('uz-UZ')}</p>
            </div>

            <p className="text-[11px] leading-relaxed text-gray-700">
              Biz, quyida imzo chekuvchi fuqaro <strong>{activeBuyoutAct.customer_name}</strong> (Pasport: {activeBuyoutAct.passport_series} {activeBuyoutAct.passport_number}, Tel: {activeBuyoutAct.customer_phone}) va <strong>iStore Mobile</strong> do'koni vakili mazkur dalolatnomani tuzdik:
            </p>

            <div className="p-3 bg-gray-50 border rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Topshirilgan telefon modeli:</span>
                <span className="font-bold">{activeBuyoutAct.model_name}</span>
              </div>
              <div className="flex justify-between">
                <span>IMEI raqami:</span>
                <span className="font-mono font-bold text-gray-900">{activeBuyoutAct.imei}</span>
              </div>
              <div className="flex justify-between">
                <span>Kelishilgan xarid narxi:</span>
                <span className="font-extrabold text-blue-700">{Number(activeBuyoutAct.agreed_price).toLocaleString()} UZS</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-600 leading-normal border-t pt-2">
              * Fuqaro topshirilgan telefon uning shaxsiy mulki ekanligini, garovda yoki qidiruvda emasligini, iCloud/Google akkauntlaridan to'liq chiqarilganligini tasdiqlaydi. Ko'rsatilgan summa fuqaroga to'liq naqd shaklda to'lab berildi.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-8 text-xs border-t">
              <div>
                <p className="font-bold mb-6">Topshiruvchi (Fuqaro):</p>
                <div className="border-b border-gray-400 pb-1 text-[11px]">{activeBuyoutAct.customer_name} (Imzo)</div>
              </div>
              <div>
                <p className="font-bold mb-6">Qabul qiluvchi (Do'kon vakili):</p>
                <div className="border-b border-gray-400 pb-1 text-[11px]">{user?.name || "Do'kon egasi"} (M.O'.)</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t no-print">
              <button onClick={() => setActiveBuyoutAct(null)} className="px-4 py-2 text-gray-500 font-semibold">Yopish</button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md">Chop Etish (Print)</button>
            </div>

          </div>
        </div>
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
