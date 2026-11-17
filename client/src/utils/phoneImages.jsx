import React, { useState } from 'react';
import { Smartphone, Image as ImageIcon, ZoomIn, X, Camera, Upload } from 'lucide-react';

/**
 * Returns a high-quality SVG data URI for modern smartphones based on brand and model.
 * These are realistic, crisp vector renderings with camera modules, screen bezel, and titanium/metal finishes.
 */
export function getVectorPhoneSvg(brand = 'Apple', modelName = '', colorHex = '#262626') {
  const b = (brand || '').toLowerCase();
  const m = (modelName || '').toLowerCase();

  // 1. iPhone Pro Series (iPhone 14 Pro, 15 Pro, 16 Pro, Pro Max)
  if (b.includes('apple') && (m.includes('pro') || m.includes('max'))) {
    const isGold = m.includes('desert') || colorHex.toLowerCase().includes('bfa796');
    const frameColor = isGold ? '#C5A98D' : (colorHex || '#3C3B37');
    const backGrad = isGold ? '#E4D5C7' : '#2D2D2A';
    
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220" width="160" height="220">
      <defs>
        <linearGradient id="body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${encodeURIComponent(backGrad)}"/>
          <stop offset="100%" stop-color="${encodeURIComponent(frameColor)}"/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.25"/>
        </filter>
      </defs>
      <!-- Shadow & Phone Body -->
      <rect x="25" y="15" width="110" height="190" rx="22" fill="url(#body)" stroke="${encodeURIComponent(frameColor)}" stroke-width="2.5" filter="url(#shadow)"/>
      <!-- Triple Camera Plateau -->
      <rect x="33" y="23" width="48" height="48" rx="14" fill="${encodeURIComponent(frameColor)}" opacity="0.85"/>
      <!-- 3 Camera Lenses with Glass Rings -->
      <circle cx="45" cy="35" r="8" fill="#0D0D0D" stroke="#555" stroke-width="1.5"/>
      <circle cx="45" cy="35" r="3.5" fill="#1A2A3A"/>
      <circle cx="45" cy="59" r="8" fill="#0D0D0D" stroke="#555" stroke-width="1.5"/>
      <circle cx="45" cy="59" r="3.5" fill="#1A2A3A"/>
      <circle cx="69" cy="47" r="8" fill="#0D0D0D" stroke="#555" stroke-width="1.5"/>
      <circle cx="69" cy="47" r="3.5" fill="#1A2A3A"/>
      <!-- LiDAR and True Tone Flash -->
      <circle cx="68" cy="29" r="3.5" fill="#FEF08A" stroke="#CA8A04" stroke-width="0.8"/>
      <circle cx="58" cy="62" r="2.5" fill="#111827"/>
      <!-- Apple Logo -->
      <path d="M 80 115 C 76 115 74 117 71 117 C 68 117 66 115 63 115 C 57 115 52 121 52 130 C 52 139 57 149 61 149 C 64 149 65 147 68 147 C 71 147 72 149 75 149 C 79 149 84 141 84 136 C 81 135 79 132 79 128 C 79 123 83 120 84 119 C 81 116 77 115 75 115 Z M 73 113 C 75 110 76 107 75 104 C 72 105 70 106 68 108 C 67 111 67 113 68 115 C 70 115 72 114 73 113 Z" fill="#FFFFFF" opacity="0.35" transform="translate(10, -10) scale(0.85)"/>
    </svg>`;
  }

  // 2. Standard iPhone (iPhone 13, 14, 15, 16)
  if (b.includes('apple')) {
    const frameColor = colorHex || '#1E293B';
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220" width="160" height="220">
      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.25"/>
        </filter>
      </defs>
      <rect x="25" y="15" width="110" height="190" rx="22" fill="${encodeURIComponent(frameColor)}" stroke="#38BDF8" stroke-width="1.5" filter="url(#shadow)"/>
      <!-- Dual Camera Island -->
      <rect x="33" y="23" width="42" height="42" rx="12" fill="#000000" opacity="0.25"/>
      <!-- Diagonal Lenses -->
      <circle cx="44" cy="34" r="7.5" fill="#0A0A0A" stroke="#777" stroke-width="1.2"/>
      <circle cx="64" cy="54" r="7.5" fill="#0A0A0A" stroke="#777" stroke-width="1.2"/>
      <circle cx="63" cy="33" r="2.8" fill="#FDE047"/>
      <!-- Apple Logo -->
      <circle cx="80" cy="115" r="4" fill="#FFFFFF" opacity="0.3"/>
    </svg>`;
  }

  // 3. Samsung Galaxy S-Series / Ultra
  if (b.includes('samsung') && (m.includes('ultra') || m.includes('s24') || m.includes('s23') || m.includes('s25'))) {
    const isUltra = m.includes('ultra');
    const rx = isUltra ? '8' : '18'; // Ultra is squared boxy
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220" width="160" height="220">
      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.25"/>
        </filter>
      </defs>
      <!-- Titanium/Armor Body -->
      <rect x="24" y="15" width="112" height="190" rx="${rx}" fill="#334155" stroke="#64748B" stroke-width="2" filter="url(#shadow)"/>
      <!-- Floating Camera Rings (Samsung signature style) -->
      <circle cx="42" cy="35" r="8" fill="#0F172A" stroke="#94A3B8" stroke-width="2"/>
      <circle cx="42" cy="35" r="3" fill="#38BDF8"/>
      <circle cx="42" cy="57" r="8" fill="#0F172A" stroke="#94A3B8" stroke-width="2"/>
      <circle cx="42" cy="57" r="3" fill="#38BDF8"/>
      <circle cx="42" cy="79" r="8" fill="#0F172A" stroke="#94A3B8" stroke-width="2"/>
      <circle cx="42" cy="79" r="3" fill="#38BDF8"/>
      <!-- Secondary Telephoto & Laser AF -->
      <circle cx="62" cy="35" r="4.5" fill="#0F172A" stroke="#94A3B8" stroke-width="1.5"/>
      <circle cx="62" cy="48" r="2.5" fill="#EF4444"/>
      <circle cx="62" cy="61" r="5" fill="#0F172A" stroke="#94A3B8" stroke-width="1.5"/>
      <!-- SAMSUNG wordmark -->
      <text x="80" y="180" font-family="sans-serif" font-size="7" font-weight="900" fill="#94A3B8" text-anchor="middle" letter-spacing="1">SAMSUNG</text>
    </svg>`;
  }

  // 4. Xiaomi / Redmi / Poco
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) {
    const isPoco = b.includes('poco') || m.includes('poco');
    const bodyColor = isPoco ? '#EAB308' : '#1E293B';
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220" width="160" height="220">
      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.25"/>
        </filter>
      </defs>
      <rect x="25" y="15" width="110" height="190" rx="18" fill="${encodeURIComponent(bodyColor)}" stroke="#475569" stroke-width="1.5" filter="url(#shadow)"/>
      <!-- Large Horizontal or Circular Camera Block -->
      <rect x="32" y="24" width="96" height="46" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1"/>
      <circle cx="50" cy="47" r="11" fill="#000000" stroke="#F59E0B" stroke-width="1.5"/>
      <circle cx="50" cy="47" r="4" fill="#3B82F6"/>
      <circle cx="76" cy="39" r="6" fill="#000000" stroke="#64748B"/>
      <circle cx="76" cy="55" r="6" fill="#000000" stroke="#64748B"/>
      <text x="106" y="50" font-family="monospace" font-size="8" font-weight="bold" fill="#F8FAFC">200MP</text>
      <text x="80" y="185" font-family="sans-serif" font-size="8" font-weight="900" fill="#CBD5E1" text-anchor="middle" letter-spacing="1.5">${isPoco ? 'POCO' : 'Redmi'}</text>
    </svg>`;
  }

  // 5. Generic Modern Android / Honor / Google / Other
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220" width="160" height="220">
    <defs>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.25"/>
      </filter>
    </defs>
    <rect x="25" y="15" width="110" height="190" rx="20" fill="#1E293B" stroke="#6366F1" stroke-width="1.5" filter="url(#shadow)"/>
    <circle cx="80" cy="55" r="22" fill="#0F172A" stroke="#818CF8" stroke-width="1.5"/>
    <circle cx="72" cy="48" r="6" fill="#000000" stroke="#CBD5E1"/>
    <circle cx="88" cy="48" r="6" fill="#000000" stroke="#CBD5E1"/>
    <circle cx="80" cy="64" r="6" fill="#000000" stroke="#CBD5E1"/>
    <circle cx="80" cy="55" r="2.5" fill="#F59E0B"/>
    <text x="80" y="180" font-family="sans-serif" font-size="7" font-weight="bold" fill="#94A3B8" text-anchor="middle" letter-spacing="1">SMARTPHONE</text>
  </svg>`;
}

/**
 * Resolves the displayable image URL for any device or model
 */
export function getDevicePhoto(device = {}) {
  // 1. Direct photo on device
  if (device.image_url && typeof device.image_url === 'string' && device.image_url.trim().length > 3) {
    return device.image_url;
  }

  // 2. Photos array or json
  if (device.photos) {
    if (Array.isArray(device.photos) && device.photos.length > 0 && device.photos[0]) {
      return device.photos[0];
    }
    if (typeof device.photos === 'string' && device.photos.startsWith('[')) {
      try {
        const parsed = JSON.parse(device.photos);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
          return parsed[0];
        }
      } catch (e) {}
    } else if (typeof device.photos === 'string' && device.photos.trim().length > 3) {
      return device.photos.trim();
    }
  }

  // 3. Model-level image
  if (device.model_image && typeof device.model_image === 'string' && device.model_image.trim().length > 3) {
    return device.model_image;
  }

  // 4. Default realistic vector rendering based on model and brand
  return getVectorPhoneSvg(
    device.brand_name || '', 
    device.model_name || device.name || '', 
    device.color_hex || '#262626'
  );
}

/**
 * Reusable Phone Thumbnail Component
 */
export function PhoneThumbnail({ device, className = "w-12 h-14", onPreview, showBadge = false }) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getDevicePhoto(device);

  const handleClick = (e) => {
    if (onPreview) {
      e.stopPropagation();
      onPreview(device);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center select-none ${className} ${onPreview ? 'cursor-pointer hover:scale-105 hover:shadow-md transition-all' : ''}`}
    >
      {!imgError && photoUrl ? (
        <img 
          src={photoUrl} 
          alt={device?.model_name || 'Telefon'} 
          onError={() => setImgError(true)}
          className="w-full h-full object-contain p-1"
          loading="lazy"
        />
      ) : (
        <Smartphone className="w-6 h-6 text-slate-400" />
      )}

      {onPreview && (
        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white">
          <ZoomIn className="w-3.5 h-3.5" />
        </div>
      )}

      {showBadge && device?.condition_type && (
        <span className={`absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded text-[8px] font-black leading-none ${
          device.condition_type.includes('Yangi') ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
        }`}>
          {device.condition_type.includes('Yangi') ? 'Yangi' : 'B/U'}
        </span>
      )}
    </div>
  );
}

/**
 * Fullscreen / Modal Photo Preview
 */
export function PhotoPreviewModal({ device, onClose }) {
  if (!device) return null;
  const photoUrl = getDevicePhoto(device);

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {device.model_name || 'Telefon Rasmi'}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {device.storage} • {device.color_name} {device.imei1 ? `• IMEI: ${device.imei1}` : ''}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-80 w-full bg-slate-50 dark:bg-slate-950/60 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 p-4">
          <img 
            src={photoUrl} 
            alt={device.model_name || 'Telefon'} 
            className="max-h-full max-w-full object-contain drop-shadow-xl"
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="font-extrabold text-slate-900 dark:text-white text-base">
            {Number(device.selling_price || 0).toLocaleString()} UZS
          </span>
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
            (device.condition_type || '').includes('Yangi') 
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
          }`}>
            {device.condition_type || 'Mavjud'} {device.battery_pct ? `• 🔋${device.battery_pct}%` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * File / Camera Image Uploader component for modals
 */
export function ImageUploader({ photo, onPhotoChange, label = "Telefon Rasmini Yuklash" }) {
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Rasm hajmi 10MB dan oshmasligi kerak!");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Data, name: file.name })
        });
        const data = await res.json();
        if (data.success && data.url) {
          onPhotoChange(data.url);
        } else {
          // Fallback to local base64
          onPhotoChange(base64Data);
        }
      } catch (err) {
        // Fallback to base64
        onPhotoChange(base64Data);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
        {label}:
      </label>

      <div className="flex items-center gap-3">
        {photo ? (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-800 shrink-0">
            <img src={photo} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onPhotoChange('')}
              className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white rounded-full hover:bg-rose-600"
              title="O'chirish"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
            <ImageIcon className="w-5 h-5 opacity-60" />
            <span className="text-[9px] mt-0.5">Rasm yo'q</span>
          </div>
        )}

        <div className="flex-1 space-y-1.5">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition">
            <Camera className="w-3.5 h-3.5 text-indigo-600" />
            <span>{loading ? "Yuklanmoqda..." : "Rasm tanlash / Kamera"}</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileChange}
              className="hidden" 
            />
          </label>

          <input
            type="text"
            placeholder="yoki rasm URL manzilini kiriting..."
            value={photo}
            onChange={(e) => onPhotoChange(e.target.value)}
            className="w-full p-2 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono"
          />
        </div>
      </div>
    </div>
  );
}
