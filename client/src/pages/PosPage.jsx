import React, { useState, useEffect } from 'react';
import { 
  Search, Scan, ShoppingCart, Trash2, Plus, Minus, User, 
  CreditCard, DollarSign, RefreshCw, Printer, Check, AlertCircle, 
  Sparkles, Smartphone, ShieldCheck, Tag, ArrowRight, UserPlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import ReceiptModal from '../components/ReceiptModal';
import { PhoneThumbnail, PhotoPreviewModal } from '../utils/phoneImages';

export default function PosPage() {
  const { user, canCancelSales } = useAuth();
  const { selectedBranch, showToast, usdRate, settings } = useApp();

  // Photo preview modal state
  const [previewDevice, setPreviewDevice] = useState(null);

  // Catalog state
  const [catalogType, setCatalogType] = useState('phones'); // 'phones' or 'accessories'
  const [devices, setDevices] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [imeiInput, setImeiInput] = useState('');

  // Cart state
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: '', phone: '', passport_series: 'AA', passport_number: '' });
  const [overallDiscount, setOverallDiscount] = useState(0);

  // Checkout modal
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('cash_uzs'); // 'cash_uzs', 'cash_usd', 'card', 'transfer', 'mixed', 'installment'
  const [selectedCashAccount, setSelectedCashAccount] = useState('');
  const [mixedPayment, setMixedPayment] = useState({ cash: 0, card: 0 });

  // Installment (Nasiya)
  const [installmentDuration, setInstallmentDuration] = useState(6);
  const [installmentMarkup, setInstallmentMarkup] = useState(15);
  const [upfrontPayment, setUpfrontPayment] = useState(0);

  // Trade-In options
  const [tradeInEnabled, setTradeInEnabled] = useState(false);
  const [tradeInForm, setTradeInForm] = useState({
    model_name: '',
    imei: '',
    condition_grade: 'A',
    battery_pct: 85,
    agreed_price: 0
  });

  // Recent sales & return
  const [recentSales, setRecentSales] = useState([]);
  const [activeReceiptSale, setActiveReceiptSale] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [saleToReturn, setSaleToReturn] = useState(null);
  const [returnReason, setReturnReason] = useState('');

  // Load catalog and customers
  const loadData = async () => {
    try {
      const dRes = await apiRequest(`/devices?status=omborda&branch_id=${selectedBranch}&limit=60`);
      if (dRes.success) setDevices(dRes.data);

      const aRes = await apiRequest(`/inventory/accessories?branch_id=${selectedBranch}`);
      if (aRes.success) setAccessories(aRes.data);

      const cRes = await apiRequest('/customers');
      if (cRes.success) setCustomers(cRes.data);

      const caRes = await apiRequest('/finance/accounts');
      if (caRes.success) {
        setCashAccounts(caRes.data);
        const def = caRes.data.find(a => a.is_default);
        if (def) setSelectedCashAccount(def.id);
        else if (caRes.data.length > 0) setSelectedCashAccount(caRes.data[0].id);
      }

      const sRes = await apiRequest(`/sales?limit=10&branch_id=${selectedBranch}`);
      if (sRes.success) setRecentSales(sRes.data);
    } catch (err) {
      console.error('Error loading POS data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch]);

  // Fast IMEI Scan Handler (Press Enter or barcode scanner)
  const handleImeiScan = (e) => {
    if (e.key === 'Enter' && imeiInput.trim()) {
      const targetImei = imeiInput.trim();
      const found = devices.find(d => d.imei1 === targetImei || d.imei2 === targetImei);
      if (found) {
        addToCartDevice(found);
        setImeiInput('');
        showToast(`"${found.model_name}" savatga qo'shildi!`, 'success');
      } else {
        showToast(`Ushbu IMEI (${targetImei}) bo'yicha omborda telefon topilmadi!`, 'error');
      }
    }
  };

  // Add Device to Cart
  const addToCartDevice = (device) => {
    const existing = cart.find(item => item.device_id === device.id);
    if (existing) {
      showToast('Ushbu telefon allaqachon savatga kiritilgan!', 'warning');
      return;
    }

    setCart(prev => [
      ...prev,
      {
        type: 'device',
        device_id: device.id,
        name: device.model_name,
        imei: device.imei1,
        condition: device.condition_type,
        battery: device.battery_pct,
        unit_price: Number(device.selling_price),
        min_price: Number(device.min_price || device.selling_price),
        cost_price: device.cost_price,
        quantity: 1,
        discount: 0
      }
    ]);
  };

  // Add Accessory to Cart
  const addToCartAccessory = (acc) => {
    setCart(prev => {
      const existing = prev.find(item => item.accessory_id === acc.id);
      if (existing) {
        return prev.map(item => item.accessory_id === acc.id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [
          ...prev,
          {
            type: 'accessory',
            accessory_id: acc.id,
            name: acc.name,
            unit_price: Number(acc.selling_price),
            min_price: Number(acc.cost_price),
            cost_price: acc.cost_price,
            quantity: 1,
            discount: 0
          }
        ];
      }
    });
    showToast(`"${acc.name}" qo'shildi`, 'success');
  };

  // Cart operations
  const updateItemPrice = (idx, newPrice) => {
    setCart(prev => prev.map((item, i) => {
      if (i === idx) {
        const val = Number(newPrice);
        if (val < item.min_price) {
          showToast(`Ogohlantirish: Narx minimal narxdan (${item.min_price.toLocaleString()} UZS) past!`, 'warning');
        }
        return { ...item, unit_price: val };
      }
      return item;
    }));
  };

  const updateItemDiscount = (idx, disc) => {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, discount: Number(disc) || 0 } : item));
  };

  const updateItemQty = (idx, delta) => {
    setCart(prev => prev.map((item, i) => {
      if (i === idx) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (idx) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity) - (item.discount || 0), 0);
  const tradeInVal = tradeInEnabled ? Number(tradeInForm.agreed_price || 0) : 0;
  const grandTotal = Math.max(0, subtotal - Number(overallDiscount || 0) - tradeInVal);

  // Installment calculations
  const totalInstallmentPayable = Math.round(grandTotal * (1 + Number(installmentMarkup) / 100));
  const remainingInstallment = Math.max(0, totalInstallmentPayable - Number(upfrontPayment || 0));
  const monthlyInstallment = installmentDuration > 0 ? Math.round(remainingInstallment / installmentDuration) : 0;

  // Checkout execution
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast("Savat bo'sh!", 'error');
      return;
    }

    const payload = {
      customer_id: selectedCustomer?.id || null,
      branch_id: selectedBranch !== 'all' ? selectedBranch : (user?.branch_id || 1),
      cart_items: cart,
      payment_type: paymentType,
      cash_account_id: selectedCashAccount,
      overall_discount: Number(overallDiscount),
      payment_details: paymentType === 'mixed' ? mixedPayment : null,
      installment_plan: paymentType === 'installment' ? {
        duration_months: Number(installmentDuration),
        markup_pct: Number(installmentMarkup),
        upfront_payment: Number(upfrontPayment)
      } : null,
      trade_in: tradeInEnabled ? {
        ...tradeInForm,
        customer_name: selectedCustomer?.name || 'Trade-in Mijoz',
        customer_phone: selectedCustomer?.phone || '+998 00 000 00 00'
      } : null
    };

    try {
      const res = await apiRequest('/sales/checkout', {
        method: 'POST',
        body: payload
      });

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        showToast(res.message, 'success');
        setCheckoutModalOpen(false);

        // Fetch full sale to preview receipt
        const fullSale = await apiRequest(`/sales/${res.data.saleId}`);
        if (fullSale.success) {
          setActiveReceiptSale(fullSale.data);
        }

        // Reset cart
        setCart([]);
        setSelectedCustomer(null);
        setOverallDiscount(0);
        setTradeInEnabled(false);
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Return sale execution
  const handleReturnSale = async () => {
    if (!returnReason.trim()) {
      showToast('Qaytarish sababini yozing', 'error');
      return;
    }

    try {
      const res = await apiRequest(`/sales/${saleToReturn.id}/return`, {
        method: 'POST',
        body: {
          reason: returnReason,
          cash_account_id: selectedCashAccount
        }
      });

      if (res.success) {
        showToast(res.message, 'success');
        setReturnModalOpen(false);
        setSaleToReturn(null);
        setReturnReason('');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Filter catalog
  const filteredDevices = devices.filter(d => {
    if (!search) return true;
    const term = search.toLowerCase();
    return d.model_name.toLowerCase().includes(term) || d.imei1.includes(term);
  });

  const filteredAccessories = accessories.filter(a => {
    if (!search) return true;
    const term = search.toLowerCase();
    return a.name.toLowerCase().includes(term) || (a.sku && a.sku.toLowerCase().includes(term));
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
      
      {/* Left 7 Columns: Product Selection & Barcode Scanner */}
      <div className="lg:col-span-7 space-y-4">
        
        {/* Top Scanner & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
          
          {/* Quick IMEI Scanner Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <input
              type="text"
              value={imeiInput}
              onChange={(e) => setImeiInput(e.target.value)}
              onKeyDown={handleImeiScan}
              placeholder="IMEI skaner qiling yoki kiriting (Enter)..."
              className="w-full pl-11 pr-4 py-2.5 text-xs font-mono font-bold bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-blue-400"
            />
          </div>

          {/* Catalog search filter */}
          <div className="sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Model yoki nom bo'yicha..."
              className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none"
            />
          </div>

        </div>

        {/* Catalog Tabs (Telefonlar vs Aksessuarlar) */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setCatalogType('phones')}
            className={`btn-tab ${
              catalogType === 'phones'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Ombordagi Telefonlar ({filteredDevices.length})</span>
          </button>
          <button
            onClick={() => setCatalogType('accessories')}
            className={`btn-tab ${
              catalogType === 'accessories'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Aksessuarlar & Xizmatlar ({filteredAccessories.length})</span>
          </button>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
          {catalogType === 'phones' ? (
            filteredDevices.map(d => (
              <div
                key={d.id}
                onClick={() => addToCartDevice(d)}
                className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-2.5">
                    {/* Phone Image Thumbnail */}
                    <PhoneThumbnail 
                      device={d} 
                      className="w-13 h-16 shadow-xs" 
                      onPreview={(dev) => setPreviewDevice(dev)}
                      showBadge={true}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[80px]">
                          {d.brand_name || 'Telefon'}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                          d.condition_type.includes('Yangi')
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {d.condition_type.includes('Yangi') ? 'Yangi' : 'B/U'}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600">
                        {d.model_name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {d.storage} • {d.color_name} {d.battery_pct ? `• 🔋${d.battery_pct}%` : ''}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                        IMEI: <span className="text-slate-600 dark:text-slate-300 font-semibold">{d.imei1.slice(0, 8)}...</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {Number(d.selling_price).toLocaleString()} <span className="text-[10px] font-semibold text-slate-400">UZS</span>
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            filteredAccessories.map(a => (
              <div
                key={a.id}
                onClick={() => addToCartAccessory(a)}
                className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600">
                    {a.category || 'Aksessuar'}
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-2 mt-1">
                    {a.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Qoldiq: <strong className="text-slate-700 dark:text-slate-200">{a.stock_qty} ta</strong>
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {Number(a.selling_price).toLocaleString()} UZS
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent sales table & Return action */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Oxirgi Sotuvlar Tarixi & Cheklar
            </h4>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                  <th className="py-2">Chek №</th>
                  <th className="py-2">Mijoz</th>
                  <th className="py-2">Summa</th>
                  <th className="py-2">Holati</th>
                  <th className="py-2 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 font-mono font-bold text-blue-600">{s.sale_number}</td>
                    <td className="py-2 font-medium">{s.customer_name || 'Oddiy xaridor'}</td>
                    <td className="py-2 font-extrabold">{Number(s.final_amount).toLocaleString()} UZS</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {s.status === 'completed' ? 'Muvaffaqiyatli' : 'Qaytarilgan'}
                      </span>
                    </td>
                    <td className="py-2 text-right space-x-2">
                      <button
                        onClick={async () => {
                          const full = await apiRequest(`/sales/${s.id}`);
                          if (full.success) setActiveReceiptSale(full.data);
                        }}
                        className="p-1 hover:text-blue-600 text-slate-500"
                        title="Chekni chop etish"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {canCancelSales() && s.status === 'completed' && (
                        <button
                          onClick={() => {
                            setSaleToReturn(s);
                            setReturnModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Sotuvni bekor qilish / Qaytarish"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right 5 Columns: Cart, Customer Picker & Checkout Panel */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
        
        <div>
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                Savat ({cart.length} ta mahsulot)
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Tozalash
              </button>
            )}
          </div>

          {/* Customer Selection Bar */}
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                  {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : "Oddiy xaridor (Naqd)"}
                </span>
                {selectedCustomer && Number(selectedCustomer.debt) > 0 && (
                  <span className="text-[10px] text-rose-600 font-bold block">
                    Qarzi: {Number(selectedCustomer.debt).toLocaleString()} UZS
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'default') setSelectedCustomer(null);
                  else setSelectedCustomer(customers.find(c => c.id === Number(val)));
                }}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 max-w-[120px] focus:outline-none"
              >
                <option value="default">Tanlash...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewCustModal(true)}
                className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-xl hover:bg-blue-100"
                title="Tezkor yangi mijoz qo'shish"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="mt-4 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Savat hozircha bo'sh</p>
                <p className="text-[11px] text-slate-500 mt-1">IMEI skaner qiling yoki chapdagi tovarlarni tanlang</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-extrabold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </h5>
                      {item.imei && (
                        <p className="text-[10px] font-mono text-slate-500 font-semibold">
                          IMEI: {item.imei}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity & Unit Price & Discount */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-1">
                      {item.type === 'accessory' ? (
                        <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button onClick={() => updateItemQty(idx, -1)} className="px-2 py-0.5 hover:bg-slate-100">-</button>
                          <span className="px-2 font-bold">{item.quantity}</span>
                          <button onClick={() => updateItemQty(idx, 1)} className="px-2 py-0.5 hover:bg-slate-100">+</button>
                        </div>
                      ) : (
                        <span className="text-slate-500">1 dona</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Narx:</span>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItemPrice(idx, e.target.value)}
                          className="w-20 font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-right focus:outline-none"
                        />
                      </div>
                      <span className="font-black text-slate-900 dark:text-white">
                        {((item.unit_price * item.quantity) - (item.discount || 0)).toLocaleString()} UZS
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cart Bottom Summary & Checkout Action */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          
          {/* Trade-in Toggle */}
          <div className="flex items-center justify-between text-xs p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-indigo-950 dark:text-indigo-200">
                Trade-In (Eski telefonni qabul qilish)
              </span>
            </div>
            <input
              type="checkbox"
              checked={tradeInEnabled}
              onChange={(e) => setTradeInEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
          </div>

          {/* Trade-in fields if enabled */}
          {tradeInEnabled && (
            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Eski telefon modeli (iPhone 13)"
                  value={tradeInForm.model_name}
                  onChange={(e) => setTradeInForm({ ...tradeInForm, model_name: e.target.value })}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs"
                />
                <input
                  type="text"
                  placeholder="IMEI (15 xona)"
                  value={tradeInForm.imei}
                  onChange={(e) => setTradeInForm({ ...tradeInForm, imei: e.target.value })}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Baholangan qiymati:</span>
                <input
                  type="number"
                  placeholder="0 UZS"
                  value={tradeInForm.agreed_price}
                  onChange={(e) => setTradeInForm({ ...tradeInForm, agreed_price: e.target.value })}
                  className="flex-1 p-1.5 font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-right text-indigo-600"
                />
              </div>
            </div>
          )}

          {/* Overall Discount Input */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Umumiy chegirma (UZS):</span>
            <input
              type="number"
              value={overallDiscount}
              onChange={(e) => setOverallDiscount(e.target.value)}
              placeholder="0"
              className="w-28 text-right font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs"
            />
          </div>

          {/* Totals */}
          <div className="space-y-1 text-xs pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-slate-500">
              <span>Tovarlar summasi:</span>
              <span>{subtotal.toLocaleString()} UZS</span>
            </div>
            {tradeInVal > 0 && (
              <div className="flex justify-between text-indigo-600 font-semibold">
                <span>Trade-in chegirmasi:</span>
                <span>-{tradeInVal.toLocaleString()} UZS</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                Yakuniy to'lov:
              </span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                {grandTotal.toLocaleString()} <span className="text-xs font-semibold text-slate-400">UZS</span>
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={() => setCheckoutModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>To'lovni Rasmiylashtirish (Checkout)</span>
          </button>
        </div>

      </div>

      {/* Checkout Modal (Payment Method & Installments) */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                To'lov Turini Tanlang
              </h3>
              <span className="text-sm font-black text-blue-600">
                {grandTotal.toLocaleString()} UZS
              </span>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              {[
                { id: 'cash_uzs', label: 'Naqd (So\'m)' },
                { id: 'cash_usd', label: 'Naqd ($ USD)' },
                { id: 'card', label: 'Karta (Humo/Uzcard)' },
                { id: 'transfer', label: 'O\'tkazma/Payme' },
                { id: 'installment', label: 'Nasiya (Bo\'lib to\'lash)' },
                { id: 'mixed', label: 'Aralash To\'lov' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentType(m.id)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    paymentType === m.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-extrabold shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Installment Options View */}
            {paymentType === 'installment' && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-3 text-xs">
                <h5 className="font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider text-[11px]">
                  Nasiya Rejasi & Shartlari
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Muddat (Oylar soni):</label>
                    <select
                      value={installmentDuration}
                      onChange={(e) => setInstallmentDuration(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    >
                      <option value="3">3 oy</option>
                      <option value="6">6 oy</option>
                      <option value="9">9 oy</option>
                      <option value="12">12 oy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Ustama foizi (%):</label>
                    <input
                      type="number"
                      value={installmentMarkup}
                      onChange={(e) => setInstallmentMarkup(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Boshlang'ich to'lov (UZS):</label>
                  <input
                    type="number"
                    value={upfrontPayment}
                    onChange={(e) => setUpfrontPayment(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                <div className="pt-2 border-t border-purple-200 dark:border-purple-800 flex justify-between items-baseline font-bold">
                  <span>Oylik to'lov:</span>
                  <span className="text-base text-purple-700 dark:text-purple-300">
                    {monthlyInstallment.toLocaleString()} UZS / oy
                  </span>
                </div>
              </div>
            )}

            {/* Cash Account Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Kirim Kassasini Tanlang:
              </label>
              <select
                value={selectedCashAccount}
                onChange={(e) => setSelectedCashAccount(e.target.value)}
                className="w-full p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {cashAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({Number(a.balance).toLocaleString()} {a.type === 'cash_usd' ? '$' : 'so\'m'})
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCheckout}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25"
              >
                Tasdiqlash & Sotish
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick New Customer Modal */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Yangi Mijoz Qo'shish (10 soniya)
            </h4>
            <div className="space-y-2.5 text-xs">
              <input
                type="text"
                placeholder="F.I.Sh. (Ism familiya)"
                value={newCustForm.name}
                onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
              <input
                type="text"
                placeholder="Telefon (+998 90 123 45 67)"
                value={newCustForm.phone}
                onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Seriya (AA)"
                  maxLength={2}
                  value={newCustForm.passport_series}
                  onChange={(e) => setNewCustForm({ ...newCustForm, passport_series: e.target.value.toUpperCase() })}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono uppercase"
                />
                <input
                  type="text"
                  placeholder="Raqam (7654321)"
                  maxLength={7}
                  value={newCustForm.passport_number}
                  onChange={(e) => setNewCustForm({ ...newCustForm, passport_number: e.target.value })}
                  className="col-span-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowNewCustModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400"
              >
                Bekor
              </button>
              <button
                onClick={async () => {
                  if (!newCustForm.name || !newCustForm.phone) {
                    showToast('Ism va telefon raqami shart', 'error');
                    return;
                  }
                  try {
                    const res = await apiRequest('/customers', { method: 'POST', body: newCustForm });
                    if (res.success) {
                      showToast('Mijoz saqlandi', 'success');
                      setSelectedCustomer({ id: res.customerId, ...newCustForm });
                      setShowNewCustModal(false);
                      loadData();
                    }
                  } catch (e) {
                    showToast(e.message, 'error');
                  }
                }}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Sale Modal */}
      {returnModalOpen && saleToReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <span>Sotuvni Bekor Qilish & Qaytarish</span>
            </h4>
            <p className="text-xs text-slate-500">
              Chek №: <strong className="font-mono text-slate-800 dark:text-slate-200">{saleToReturn.sale_number}</strong>. Tovar avtomatik omborga qaytadi va kassa qoldig'i to'g'rilanadi.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Qaytarish sababi:
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Mijoz boshqa modelga almashtirmoqchi / brak aniqlandi..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setReturnModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleReturnSale}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Qaytarishni Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          onClose={() => setActiveReceiptSale(null)}
        />
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
