import React, { useState, useEffect } from 'react';
import { Printer, X, FileText, Check, ShieldCheck, Smartphone, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';

export default function ReceiptModal({ sale, onClose }) {
  const { settings } = useApp();
  const [receiptType, setReceiptType] = useState('thermal80'); // 'thermal80' or 'a4'
  const [receiptQrUrl, setReceiptQrUrl] = useState('');

  useEffect(() => {
    if (!sale) return;
    const qrData = JSON.stringify({
      doc: "RECEIPT",
      num: sale.sale_number,
      sum: sale.final_amount,
      date: new Date(sale.created_at || Date.now()).toLocaleDateString(),
      branch: sale.branch_name || "Bosh filial",
      check_url: `https://smartphonepro.uz/check/${sale.sale_number}`
    });
    QRCode.toDataURL(qrData, { width: 160, margin: 1 })
      .then(url => setReceiptQrUrl(url))
      .catch(console.error);
  }, [sale]);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Chek va Kafolat Taloni
              </h3>
              <p className="text-xs text-slate-500">
                Hujjat: {sale.sale_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setReceiptType('thermal80')}
                className={`px-3 py-1.5 rounded-lg transition-all ${receiptType === 'thermal80' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                80 mm Termal Chek
              </button>
              <button
                onClick={() => setReceiptType('a4')}
                className={`px-3 py-1.5 rounded-lg transition-all ${receiptType === 'a4' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                A4 Shartnoma & Kafolat
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 max-h-[70vh] overflow-y-auto flex justify-center bg-slate-100/70 dark:bg-slate-950/40">
          
          <div id="printable-area" className="w-full flex justify-center">
            
            {/* 80mm Thermal Receipt Layout */}
            {receiptType === 'thermal80' ? (
              <div className="bg-white text-black p-5 rounded-lg shadow-sm w-[340px] font-mono text-xs leading-relaxed border border-slate-200">
                <div className="text-center pb-3 border-b border-dashed border-gray-400">
                  <h2 className="font-bold text-base uppercase tracking-wider">{settings.company_name || "iStore Uzbekistan"}</h2>
                  <p className="text-[11px] text-gray-700">{sale.branch_name || "Malika Savdo Markazi"}</p>
                  <p className="text-[11px] text-gray-700">{settings.phone || "+998 71 200 00 01"}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Fiskal / Sotuv Cheki</p>
                </div>

                <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Chek №:</span>
                    <span className="font-bold">{sale.sale_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sana & Vaqt:</span>
                    <span>{new Date(sale.created_at || Date.now()).toLocaleString('uz-UZ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sotuvchi:</span>
                    <span>{sale.seller_name || "Jasur M."}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mijoz:</span>
                    <span>{sale.customer_name || "Oddiy xaridor"}</span>
                  </div>
                  {sale.customer_phone && (
                    <div className="flex justify-between">
                      <span>Telefon:</span>
                      <span>{sale.customer_phone}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="py-2.5 border-b border-dashed border-gray-400 space-y-2">
                  <div className="font-bold text-[11px] flex justify-between border-b pb-1">
                    <span>Mahsulot</span>
                    <span>Jami</span>
                  </div>
                  {sale.items?.map((item, idx) => (
                    <div key={idx} className="text-[11px] space-y-0.5">
                      <div className="font-semibold text-gray-900">{item.item_name}</div>
                      {item.imei && (
                        <div className="text-[10px] text-gray-600 font-mono">
                          IMEI: <span className="font-bold">{item.imei}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-700">
                        <span>{item.quantity} dona × {Number(item.unit_price).toLocaleString()}</span>
                        <span className="font-bold">{Number(item.total_price).toLocaleString()} so'm</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Jami summa:</span>
                    <span>{Number(sale.total_amount).toLocaleString()} so'm</span>
                  </div>
                  {Number(sale.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>Chegirma:</span>
                      <span>-{Number(sale.discount_amount).toLocaleString()} so'm</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-300">
                    <span>TO'LANDI:</span>
                    <span>{Number(sale.final_amount).toLocaleString()} UZS</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>To'lov turi:</span>
                    <span className="uppercase font-semibold">{sale.payment_type}</span>
                  </div>
                </div>

                {/* Warranty Notice & QR */}
                <div className="pt-2 text-center text-[10px] text-gray-700 space-y-1">
                  {receiptQrUrl && (
                    <div className="pt-1 pb-1 flex flex-col items-center justify-center">
                      <img src={receiptQrUrl} alt="Receipt QR" className="w-24 h-24 border border-gray-200 p-0.5 rounded bg-white shadow-2xs" />
                      <span className="text-[9px] text-gray-500 font-sans mt-0.5">Kafolat va Fiskal tekshirish QR</span>
                    </div>
                  )}

                  <p className="font-bold text-gray-900">Do'kon kafolati: 12 oy</p>
                  <p>Kafolat amal qilish muddati: {new Date(sale.warranty_end_date || Date.now()).toLocaleDateString('uz-UZ')} gacha.</p>
                  <p className="text-[9px] text-gray-500 pt-1">
                    * Telefonni suvga tushishi va mexanik shikastlanish kafolatga kirmaydi. Chekni saqlang!
                  </p>
                  <p className="font-bold text-[11px] pt-1">Xaridingiz uchun rahmat!</p>
                </div>
              </div>
            ) : (
              /* A4 Formal Contract & Warranty Layout */
              <div className="bg-white text-black p-8 rounded-lg shadow-sm w-[580px] font-sans text-xs leading-normal border border-slate-200">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-blue-900">
                      {settings.company_name || "iStore Uzbekistan"}
                    </h2>
                    <p className="text-xs text-gray-600">Telefon savdosi va kafolatli xizmat ko'rsatish markazi</p>
                    <p className="text-xs text-gray-600">{sale.branch_address || "Toshkent sh., Malika Savdo Markazi, A-24"}</p>
                    <p className="text-xs text-gray-600">Telefon: {settings.phone || "+998 71 200 00 01"}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    {receiptQrUrl && (
                      <img src={receiptQrUrl} alt="Contract QR" className="w-16 h-16 border border-gray-300 p-0.5 rounded mb-1 bg-white shadow-2xs" />
                    )}
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200 text-xs mb-1">
                      KAFOLAT TALONI & SHARTNOMA
                    </span>
                    <p className="font-mono text-xs font-bold text-gray-800">№ {sale.sale_number}</p>
                    <p className="text-xs text-gray-500">Sana: {new Date(sale.created_at || Date.now()).toLocaleDateString('uz-UZ')}</p>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4 text-[11px]">
                  <div>
                    <p className="font-bold text-gray-700 uppercase">Sotuvchi:</p>
                    <p className="font-semibold text-gray-900">{settings.company_name || "iStore Mobile Trade MCHJ"}</p>
                    <p>Filial: {sale.branch_name}</p>
                    <p>Xodim: {sale.seller_name}</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 uppercase">Xaridor:</p>
                    <p className="font-semibold text-gray-900">{sale.customer_name || "Oddiy xaridor"}</p>
                    <p>Telefon: {sale.customer_phone || "-"}</p>
                    {sale.passport_series && (
                      <p>Pasport: {sale.passport_series} {sale.passport_number}</p>
                    )}
                  </div>
                </div>

                {/* Products Table */}
                <table className="w-full border-collapse mb-4 text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b">
                      <th className="py-2 px-2 text-left">№</th>
                      <th className="py-2 px-2 text-left">Mahsulot / Model</th>
                      <th className="py-2 px-2 text-left">IMEI / Seriya</th>
                      <th className="py-2 px-2 text-center">Soni</th>
                      <th className="py-2 px-2 text-right">Narxi</th>
                      <th className="py-2 px-2 text-right">Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items?.map((it, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 px-2 font-medium">{it.item_name}</td>
                        <td className="py-2 px-2 font-mono font-bold text-gray-800">{it.imei || "-"}</td>
                        <td className="py-2 px-2 text-center">{it.quantity}</td>
                        <td className="py-2 px-2 text-right">{Number(it.unit_price).toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-bold">{Number(it.total_price).toLocaleString()} UZS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-6 text-xs">
                  <div className="w-64 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Jami hisob:</span>
                      <span>{Number(sale.total_amount).toLocaleString()} UZS</span>
                    </div>
                    {Number(sale.discount_amount) > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Chegirma:</span>
                        <span>-{Number(sale.discount_amount).toLocaleString()} UZS</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold border-t pt-1 text-blue-900">
                      <span>YAKUNIY TO'LOV:</span>
                      <span>{Number(sale.final_amount).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>

                {/* Warranty Terms */}
                <div className="border-t pt-3 mb-6 text-[10px] text-gray-600 leading-relaxed">
                  <p className="font-bold text-gray-800 mb-1">Kafolat shartlari va qoidalari:</p>
                  <p>1. Mazkur qurilma uchun xarid qilingan kundan boshlab 12 oy muddatga do'kon kafolati beriladi.</p>
                  <p>2. Kafolat muddati ichida nosozlik aniqlansa, servis markazimiz tomonidan bepul ta'mirlab beriladi.</p>
                  <p>3. Qurilmaga tashqi mexanik shikast yetgan (singan, ezilgan), suv yoki suyuqlik tushgan, begona usta tomonidan ochilgan holatlarda kafolat bekor qilinadi.</p>
                  <p>4. IMEI kodi mos kelishi va ushbu talon taqdim etilishi shart.</p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-4 border-t text-xs">
                  <div>
                    <p className="font-bold text-gray-800 mb-6">Sotuvchi vakili:</p>
                    <div className="border-b border-gray-400 pb-1 flex justify-between text-[11px] text-gray-600">
                      <span>{sale.seller_name || "Imzo"}</span>
                      <span>M.O'.</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 mb-6">Xaridor (Tovar va kafolatni qabul qildim):</p>
                    <div className="border-b border-gray-400 pb-1 text-[11px] text-gray-600">
                      <span>{sale.customer_name || "Imzo"}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Yopish
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Chop Etish (Print)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
