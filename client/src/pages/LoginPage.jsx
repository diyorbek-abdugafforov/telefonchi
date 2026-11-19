import React, { useState } from 'react';
import { 
  Smartphone, Lock, User, Eye, EyeOff, ShieldCheck, 
  ArrowRight, AlertCircle, CheckCircle2, UserX, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, switchRole } = useAuth();

  const [form, setForm] = useState({ login: 'admin', password: 'password123' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = [
    {
      role: 'admin',
      login: 'admin',
      title: "Do'kon Egasi (Bosh Ma'mur)",
      desc: "Barcha huquqlar: tushum, sof foyda, xodimlarni qo'shish va bloklash",
      badge: "To'liq foyda & Egasi",
      badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      color: "from-purple-600 to-indigo-600"
    },
    {
      role: 'manager',
      login: 'manager',
      title: "Menejer / Hisobchi",
      desc: "Moliya, hisobotlar, xaridlar, filiallararo ombor nazorati",
      badge: "Moliya & Nazorat",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      color: "from-blue-600 to-cyan-600"
    },
    {
      role: 'cashier',
      login: 'cashier',
      title: "Kassir (Moliya & Kassa)",
      desc: "Kassa, sotish narxlari, qabul qilish, vozvrat (Tannarx va foyda yashirilgan)",
      badge: "Faqat sotuv narxi",
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      color: "from-amber-500 to-orange-600"
    },
    {
      role: 'seller',
      login: 'seller',
      title: "Sotuvchi (POS)",
      desc: "Faqat telefon sotish, chek chiqarish, sotuv narxlari (Foyda ko'rinmaydi)",
      badge: "Faqat sotuv narxi",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      color: "from-emerald-500 to-teal-600"
    },
    {
      role: 'warehouse',
      login: 'warehouse',
      title: "Omborchi (Qabul & Saralash)",
      desc: "Yangi telefon kiritish, IMEI nazorati, brend va narx bo'yicha saralash",
      badge: "Qabul & Saralash",
      badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
      color: "from-cyan-600 to-blue-700"
    },
    {
      role: 'former',
      login: 'former',
      title: "Ishdan ketgan xodim (Test)",
      desc: "Bloklangan/arxivlangan xodim kirishga uringanda tizim to'xtatadi",
      badge: "Bloklangan (Tekshirish)",
      badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      color: "from-rose-600 to-red-700"
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.login || !form.password) {
      setError("Login va parolni kiriting");
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(form.login.trim(), form.password);
    } catch (err) {
      setError(err.message || "Login yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  const fillAndLogin = (acc) => {
    setForm({ login: acc.login, password: 'password123' });
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-blue-600/20 to-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left column: Branding & System Overview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                SMARTPHONE PRO
              </h1>
              <p className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">
                Savdo, Kassa & Ombor Tizimi
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Telefon savdosi va qabul qilish boshqaruvi
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Do'kon egasi uchun to'liq tushum va foyda hisobi, kassir va sotuvchilar uchun qulay sotuv oynasi, omborchi uchun saralash va qabul qilish moduli.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {[
              { title: "Ega va Hisobchi:", desc: "Sof foyda, tannarx va moliya to'liq ko'rinadi" },
              { title: "Kassir va Sotuvchi:", desc: "Faqat sotuv narxi ko'rinadi, foyda va tannarx yopiq" },
              { title: "Ishdan ketgan xodimlar:", desc: "Tarix saqlangan holda avtomatik bloklanadi" },
              { title: "Mijoz qaytargan telefon:", desc: "1 bosishda vozvrat qilinadi va omborga qaytadi" }
            ].map((f, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">{f.title}</strong> {f.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Login form card */}
        <div className="lg:col-span-7 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          
          <div className="mb-6">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Tizimga Kirish
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              O'z login va parolingiz orqali shaxsiy ish oynangizga kiring
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Kirishda xatolik:</p>
                <p className="text-rose-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Foydalanuvchi Logini
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="Masalan: admin, cashier, warehouse..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Maxfiy Parol
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Parolingizni kiriting"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Tizimga Kirish</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Roles Section */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Sinash uchun tayyor hisoblar (1-bosishda to'ldirish):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.login}
                  type="button"
                  onClick={() => fillAndLogin(acc)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-left transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 w-full mb-1">
                    <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {acc.title}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${acc.badgeColor}`}>
                      {acc.badge}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>login: <strong className="text-slate-300">@{acc.login}</strong></span>
                    <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Tanlash &rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
