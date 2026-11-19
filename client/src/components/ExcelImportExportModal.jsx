import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, Download, Upload, X, CheckCircle2, 
  AlertTriangle, RefreshCw, FileText, Check, ArrowRight 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiRequest } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function ExcelImportExportModal({ devices = [], onImportSuccess, onClose }) {
  const { showToast, selectedBranch, branches } = useApp();
  const { canViewCostPrice } = useAuth();
  
  const [activeTab, setActiveTab] = useState('import'); // 'import', 'export', 'template'
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // 1. GENERATE & DOWNLOAD EXCEL TEMPLATE (SHABLON)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Brend": "Apple",
        "Model": "iPhone 16 Pro Max",
        "Xotira": "256GB",
        "Rang": "Desert Titanium",
        "IMEI1 (15 xona)": "356984118292767",
        "IMEI2": "356984118292768",
        "Seriya": "F2LXYZ12345",
        "Holati": "Yangi (muhrlangan)",
        "Batareya (%)": 100,
        "Tan Narxi (UZS)": 14500000,
        "Sotish Narxi (UZS)": 16800000,
        "Kafolat (oy)": 12,
        "Eslatma": "AQSH versiya, e-SIM"
      },
      {
        "Brend": "Samsung",
        "Model": "Galaxy S24 Ultra",
        "Xotira": "512GB",
        "Rang": "Titanium Black",
        "IMEI1 (15 xona)": "357891218527415",
        "IMEI2": "",
        "Seriya": "R58M123XYZ",
        "Holati": "Yangi (muhrlangan)",
        "Batareya (%)": 100,
        "Tan Narxi (UZS)": 13000000,
        "Sotish Narxi (UZS)": 15200000,
        "Kafolat (oy)": 12,
        "Eslatma": "Dubay optom"
      },
      {
        "Brend": "Xiaomi",
        "Model": "Redmi Note 13 Pro+",
        "Xotira": "256GB",
        "Rang": "Midnight Black",
        "IMEI1 (15 xona)": "865421015411202",
        "IMEI2": "",
        "Seriya": "XM994821",
        "Holati": "B/U (ishlatilgan)",
        "Batareya (%)": 92,
        "Tan Narxi (UZS)": 3200000,
        "Sotish Narxi (UZS)": 3950000,
        "Kafolat (oy)": 3,
        "Eslatma": "Karobka-dokument bor"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for clean readability
    ws['!cols'] = [
      { wch: 12 }, // Brend
      { wch: 22 }, // Model
      { wch: 10 }, // Xotira
      { wch: 18 }, // Rang
      { wch: 20 }, // IMEI1
      { wch: 18 }, // IMEI2
      { wch: 14 }, // Seriya
      { wch: 20 }, // Holati
      { wch: 12 }, // Batareya
      { wch: 16 }, // Tan Narxi
      { wch: 18 }, // Sotish Narxi
      { wch: 12 }, // Kafolat
      { wch: 25 }  // Eslatma
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Telefonlar");
    XLSX.writeFile(wb, "Telefonlar_Import_Shabloni.xlsx");
    showToast("Excel shablon yuklab olindi! Shu faylni to'ldirib qayta yuklang.", "success");
  };

  // 2. EXPORT CURRENT INVENTORY TO EXCEL
  const handleExportCurrent = () => {
    if (!devices || devices.length === 0) {
      showToast("Eksport qilish uchun omborda telefonlar yo'q", "error");
      return;
    }

    const exportRows = devices.map((d, idx) => ({
      "№": idx + 1,
      "Brend": d.brand_name || "",
      "Model": d.model_name || "",
      "Xotira": d.storage || "",
      "Rang": d.color_name || "",
      "IMEI 1": d.imei1 || "",
      "IMEI 2": d.imei2 || "",
      "Seriya raqami": d.serial_number || "",
      "Holati": d.condition_type || "",
      "Batareya (%)": d.battery_pct ? `${d.battery_pct}%` : "100%",
      ...(canViewCostPrice() ? { "Tan Narxi (UZS)": Number(d.cost_price || 0) } : {}),
      "Sotish Narxi (UZS)": Number(d.selling_price || 0),
      "Filial": d.branch_name || "Asosiy",
      "Status": d.status || "omborda",
      "Kafolat (oy)": d.warranty_months || 12,
      "Kiritilgan sana": d.created_at ? new Date(d.created_at).toLocaleDateString() : ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ombor Qoldig'i");
    
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Ombor_Telefonlar_${today}.xlsx`);
    showToast("Ombor qoldig'i Excel faylga muvaffaqiyatli eksport qilindi!", "success");
  };

  // 3. READ & PARSE UPLOADED EXCEL FILE
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          showToast("Excel faylda ma'lumot topilmadi", "error");
          return;
        }

        // Map and validate rows
        const parsed = rawJson.map((row, idx) => {
          // Flexible key lookup
          const brand = row["Brend"] || row["brend"] || row["Brand"] || row["brand"] || "Apple";
          const model = row["Model"] || row["model"] || row["Model nomi"] || "";
          const storage = row["Xotira"] || row["xotira"] || row["Storage"] || "256GB";
          const color = row["Rang"] || row["rang"] || row["Color"] || "Qora";
          
          let imei1 = String(row["IMEI1 (15 xona)"] || row["IMEI1"] || row["imei1"] || row["IMEI"] || row["imei"] || "").trim();
          // Remove scientific notation if Excel saved as number
          if (imei1.includes('e+') || imei1.includes('E+')) {
            imei1 = String(Number(imei1));
          }
          let imei2 = String(row["IMEI2"] || row["imei2"] || "").trim();
          if (imei2.includes('e+') || imei2.includes('E+')) {
            imei2 = String(Number(imei2));
          }

          const serial = String(row["Seriya"] || row["seriya"] || row["Serial"] || "").trim();
          const condition = row["Holati"] || row["holat"] || row["Condition"] || "Yangi (muhrlangan)";
          const battery = Number(row["Batareya (%)"] || row["Batareya"] || row["battery"] || 100);
          const purchase_price = Number(row["Tan Narxi (UZS)"] || row["Tan Narxi"] || row["purchase_price"] || 0);
          const selling_price = Number(row["Sotish Narxi (UZS)"] || row["Sotish Narxi"] || row["selling_price"] || 0);
          const warranty = Number(row["Kafolat (oy)"] || row["Kafolat"] || 12);
          const notes = row["Eslatma"] || row["eslatma"] || "Excel orqali yuklangan";

          const isValidImei = /^\d{14,16}$/.test(imei1);
          let error = null;
          if (!model) error = "Model ko'rsatilmagan";
          else if (!imei1) error = "IMEI ko'rsatilmagan";
          else if (!isValidImei) error = "IMEI formati noto'g'ri (15 xonali bo'lishi kerak)";

          return {
            rowNum: idx + 2,
            brand_name: brand,
            model_name: model,
            storage,
            color_name: color,
            imei1,
            imei2,
            serial_number: serial,
            condition_type: condition,
            battery_pct: battery,
            purchase_price,
            cost_price: purchase_price,
            selling_price,
            warranty_months: warranty,
            notes,
            isValid: !error,
            error
          };
        });

        setParsedRows(parsed);
        showToast(`${parsed.length} ta qator o'qildi. Tekshirib "Saqlash"ni bosing.`, "success");
      } catch (err) {
        console.error("Excel parse error:", err);
        showToast("Excel faylni o'qishda xatolik yuz berdi: " + err.message, "error");
      }
    };

    reader.readAsBinaryString(file);
  };

  // 4. SUBMIT VALID ROWS TO DATABASE
  const handleSaveToDatabase = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast("Yuklash uchun to'g'ri qatorlar topilmadi", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/devices/bulk-import', {
        method: 'POST',
        body: {
          devices: validRows,
          branch_id: selectedBranch !== 'all' ? selectedBranch : 1
        }
      });

      if (res.success) {
        showToast(res.message || `${res.insertedCount} ta telefon omborga kiritildi!`, "success");
        if (onImportSuccess) onImportSuccess();
        onClose();
      }
    } catch (err) {
      showToast(err.message || "Yuklashda xatolik yuz berdi", "error");
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                Excel orqali Telefonlar Import / Eksporti
              </h3>
              <p className="text-xs text-slate-500">
                Shablonni to'ldirib yuzlab telefonlarni 1 bosishda omborga qabul qilish
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'import' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                1. Exceldan Yuklash
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'export' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                2. Omborni Eksport Qilish
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

        {/* Tab 1: IMPORT TAB */}
        {activeTab === 'import' && (
          <div className="p-6 space-y-6">
            
            {/* Step instructions banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Step 1 Card: Download template */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">1</span>
                    <h4 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                      Excel Shablonini Yuklab Oling
                    </h4>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                    Tizim formatiga moslashtirilgan tayyor namunaviy jadval. Unda ustunlar va namunaviy telefonlar ko'rsatilgan.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="mt-3.5 btn-primary text-xs flex items-center justify-center gap-2 py-2.5 cursor-pointer shadow-indigo-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Namunaviy Excel Shablonni Yuklab Olish</span>
                </button>
              </div>

              {/* Step 2 Card: Upload file */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">2</span>
                    <h4 className="font-extrabold text-xs text-emerald-950 dark:text-emerald-200">
                      To'ldirilgan Faylni Yuklang
                    </h4>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                    Telefonlar ma'lumotlarini to'ldirgach, faylni shu yerga tanlang (.xlsx yoki .xls).
                  </p>
                </div>

                <div className="mt-3.5 flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full btn-secondary text-xs flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent cursor-pointer shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{fileName ? `Fayl: ${fileName}` : "To'ldirilgan Excelni Tanlash"}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      O'qilgan qatorlar: {parsedRows.length} ta
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                      ✓ {validCount} ta to'g'ri
                    </span>
                    {invalidCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[10px]">
                        ✕ {invalidCount} ta xato
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Filial: <strong>{branches.find(b => b.id === Number(selectedBranch))?.name || "Asosiy filial"}</strong>
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold text-[10px] sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Qator</th>
                        <th className="py-2.5 px-3">Model</th>
                        <th className="py-2.5 px-3">Xotira / Rang</th>
                        <th className="py-2.5 px-3">IMEI 1</th>
                        <th className="py-2.5 px-3">Holat</th>
                        <th className="py-2.5 px-3">Sotuv Narxi</th>
                        <th className="py-2.5 px-3 text-right">Holati</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                      {parsedRows.map((r, i) => (
                        <tr key={i} className={`hover:bg-white dark:hover:bg-slate-800/80 ${!r.isValid ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}`}>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-400">#{r.rowNum}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            {r.brand_name} {r.model_name}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {r.storage} • {r.color_name}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold">
                            {r.imei1 || "-"}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {r.condition_type}
                          </td>
                          <td className="py-2 px-3 font-extrabold text-slate-900 dark:text-white">
                            {Number(r.selling_price).toLocaleString()} UZS
                          </td>
                          <td className="py-2 px-3 text-right">
                            {r.isValid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit ml-auto">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Tayyor
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={r.error}>
                                ⚠️ {r.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setFileName('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Jadvalni tozalash
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToDatabase}
                    disabled={loading || validCount === 0}
                    className="btn-primary text-xs flex items-center gap-2 py-2.5 px-6 font-extrabold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Yuklanmoqda...</span>
                    ) : (
                      <>
                        <span>{validCount} ta Telefonni Omborda Saqlash</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: EXPORT TAB */}
        {activeTab === 'export' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-md">
              <Download className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Mavjud Ombordagi Telefonlarni Excelga Yuklash
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hozirgi barcha filiallardagi ombor qoldig'i, IMEI'lar, sotuv narxlari va holatlarini yagona .xlsx fayl qilib yuklab oling.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleExportCurrent}
                className="btn-primary text-xs py-3 px-6 inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Barcha Telefonlarni Excelga Eksport Qilish ({devices.length} ta)</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
