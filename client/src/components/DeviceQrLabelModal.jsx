import React, { useState, useEffect } from 'react';
import { QrCode, Printer, Download, X, Copy, Check, Smartphone, Tag, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';

export default function DeviceQrLabelModal({ device, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [stickerType, setStickerType] = useState('box'); // 'box' (58mm sticker) or 'showcase' (vitrina narxnomasi)

  useEffect(() => {
    if (!device) return;

    // Rich QR payload: contains device verification data and link
    const qrPayload = JSON.stringify({
      app: "SMARTPHONE_PRO",
      id: device.id,
      model: device.model_name,
      imei: device.imei1,
      storage: device.storage,
      color: device.color_name,
      condition: device.condition_type,
      battery: device.battery_pct ? `${device.battery_pct}%` : '100%',
      price: device.selling_price,
      warranty: `${device.warranty_months || 12} oy`,
      check_url: `https://smartphonepro.uz/check?imei=${device.imei1}`
    }, null, 2);

    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [device]);

  if (!device) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR_${device.model_name.replace(/\s+/g, '_')}_${device.imei1}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleCopyImei = () => {
    navigator.clipboard.writeText(device.imei1);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                QR Kod & Narx Stikeri
              </h3>
              <p className="text-[11px] text-slate-500">
                Termoprinter yoki vitrina uchun
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-xl text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setStickerType('box')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${stickerType === 'box' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Quti stikeri
              </button>
              <button
                type="button"
                onClick={() => setStickerType('showcase')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${stickerType === 'showcase' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Vitrina narxnomasi
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Label View */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-100/70 dark:bg-slate-950/50">
          
          <div 
            id="printable-area" 
            className={`bg-white text-black rounded-2xl shadow-md border border-slate-300 ${
              stickerType === 'box' 
                ? 'w-[280px] p-4 text-center font-mono space-y-2' 
                : 'w-[320px] p-5 text-left font-sans space-y-3'
            }`}
          >
            {/* Header info */}
            <div className="border-b border-gray-300 pb-2 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 block">
                SMARTPHONE PRO POS
              </span>
              <h4 className="font-extrabold text-sm text-gray-900 mt-0.5 leading-tight">
                {device.model_name}
              </h4>
              <p className="text-[11px] text-gray-600 font-sans mt-0.5">
                {device.storage} • {device.color_name} {device.battery_pct ? `• 🔋${device.battery_pct}%` : ''}
              </p>
            </div>

            {/* QR Code image */}
            <div className="flex flex-col items-center justify-center py-1">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Device QR Code" 
                  className="w-36 h-36 border border-gray-200 rounded-lg p-1 bg-white shadow-xs" 
                />
              ) : (
                <div className="w-36 h-36 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center text-xs text-gray-400">
                  QR tayyorlanmoqda...
                </div>
              )}
              <span className="text-[9px] text-gray-500 font-sans mt-1">
                Kamerada skanerlab tekshiring
              </span>
            </div>

            {/* Price & Details */}
            <div className="border-t border-gray-300 pt-2 text-center space-y-1">
              <div className="text-base font-black text-gray-900">
                {Number(device.selling_price).toLocaleString()} <span className="text-xs font-bold">UZS</span>
              </div>
              
              <div className="text-[10px] text-gray-700 font-mono flex items-center justify-center gap-1">
                <span>IMEI:</span>
                <span className="font-bold">{device.imei1}</span>
              </div>

              {device.imei2 && (
                <div className="text-[9px] text-gray-500 font-mono">
                  IMEI2: {device.imei2}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-1 text-[9px] font-sans text-gray-600">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 font-semibold">
                  {device.condition_type}
                </span>
                <span>•</span>
                <span className="font-semibold text-emerald-700">
                  Kafolat: {device.warranty_months || 12} oy
                </span>
              </div>
            </div>

          </div>

          {/* Quick copy IMEI */}
          <button
            onClick={handleCopyImei}
            className="mt-3 text-[11px] text-slate-500 hover:text-indigo-600 dark:text-slate-400 flex items-center gap-1 font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "IMEI nusxalandi!" : `IMEI nusxalash: ${device.imei1}`}</span>
          </button>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-2">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            title="QR kod rasmini PNG formatda yuklab olish"
          >
            <Download className="w-3.5 h-3.5" />
            <span>QR Rasmini Saqlash</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Yopish
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Chop Etish (Print)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
