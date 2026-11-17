import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, Key, AlertTriangle, History, Clock, 
  UserPlus, UserX, UserCheck, Smartphone, Globe, LogOut, CheckCircle, RefreshCw
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function StaffSecurityPage() {
  const { user } = useAuth();
  const { showToast, branches } = useApp();

  const [activeTab, setActiveTab] = useState('staff'); // 'staff', 'sessions', 'alerts', 'audit'
  const [loading, setLoading] = useState(true);

  // Data states
  const [staffList, setStaffList] = useState([]);
  const [sessionsList, setSessionsList] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(null);

  // Add staff form
  const [addForm, setAddForm] = useState({
    name: '',
    login: '',
    password: '',
    role: 'seller',
    branch_id: '',
    phone: '',
    salary_type: 'fixed_plus_pct',
    base_salary: '3000000',
    commission_pct: '2',
    notes: ''
  });

  const [terminateReason, setTerminateReason] = useState('');

  useEffect(() => {
    if (activeTab === 'staff') loadStaff();
    else if (activeTab === 'sessions') loadSessions();
    else if (activeTab === 'alerts') loadAlerts();
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await apiRequest('/staff');
      if (res.success) setStaffList(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadSessions() {
    setLoading(true);
    try {
      const res = await apiRequest('/staff/sessions');
      if (res.success) setSessionsList(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await apiRequest('/staff/security-alerts');
      if (res.success) setSecurityAlerts(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLogs() {
    setLoading(true);
    try {
      const res = await apiRequest('/staff/audit-logs?limit=100');
      if (res.success) setAuditLogs(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/staff', {
        method: 'POST',
        body: {
          ...addForm,
          base_salary: Number(addForm.base_salary || 0),
          commission_pct: Number(addForm.commission_pct || 0)
        }
      });
      if (res.success) {
        showToast(res.message || "Yangi xodim muvaffaqiyatli qo'shildi");
        setShowAddModal(false);
        setAddForm({
          name: '',
          login: '',
          password: '',
          role: 'seller',
          branch_id: '',
          phone: '',
          salary_type: 'fixed_plus_pct',
          base_salary: '3000000',
          commission_pct: '2',
          notes: ''
        });
        loadStaff();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTerminateStaff = async () => {
    if (!showTerminateModal) return;
    try {
      const res = await apiRequest(`/staff/${showTerminateModal.id}/terminate`, {
        method: 'POST',
        body: { reason: terminateReason }
      });
      if (res.success) {
        showToast(res.message);
        setShowTerminateModal(null);
        setTerminateReason('');
        loadStaff();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReactivateStaff = async (userId) => {
    try {
      const res = await apiRequest(`/staff/${userId}/reactivate`, { method: 'POST' });
      if (res.success) {
        showToast(res.message);
        loadStaff();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await apiRequest(`/staff/sessions/${sessionId}/revoke`, { method: 'POST' });
      if (res.success) {
        showToast("Seans muvaffaqiyatli majburan yopildi");
        loadSessions();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMarkAlertRead = async (alertId) => {
    try {
      await apiRequest(`/staff/security-alerts/${alertId}/read`, { method: 'POST' });
      setSecurityAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: 1 } : a));
    } catch (err) {}
  };

  const roleNameMap = {
    admin: "Do'kon Egasi / Bosh Ma'mur",
    manager: "Menejer / Do'kon Boshqaruvchisi",
    seller: "Sotuvchi (POS)",
    cashier: "Kassir (Moliya & Kassa)",
    warehouse: "Omborchi (Qabul & O'tkazma)",
    technician: "Usta-Muhandis (Servis)"
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Xodimlar va Xavfsizlik Nazorati
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Xodimlar roli (RBAC), ishdan ketganlarni arxivlash, faol seanslarni majburan yopish va audit xavfsizlik jurnali.
          </p>
        </div>

        {activeTab === 'staff' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            Yangi Xodim Qo'shish
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'staff', label: '1. Xodimlar Ro\'yxati', icon: Users },
          { id: 'sessions', label: '2. Faol Seanslar (Live Monitor)', icon: Globe },
          { id: 'alerts', label: '3. Xavfsizlik Ogohlantirishlari', icon: AlertTriangle },
          { id: 'audit', label: '4. Audit Tarixi (Tizim Jurnali)', icon: History },
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

      {/* Tab 1: Staff List */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Xodim / Login</th>
                    <th className="px-4 py-3">Roli (Lavozim)</th>
                    <th className="px-4 py-3">Filial</th>
                    <th className="px-4 py-3">Aloqa</th>
                    <th className="px-4 py-3">Maosh sxemasi</th>
                    <th className="px-4 py-3">Savdo Ko'rsatkichi</th>
                    <th className="px-4 py-3">Holati</th>
                    <th className="px-4 py-3 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {staffList.map(s => {
                    const isArchived = s.status === 'archived';
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${isArchived ? 'opacity-60 bg-slate-50/40' : ''}`}>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {s.name}
                            {s.id === user.id && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">Siz</span>
                            )}
                          </p>
                          <p className="font-mono text-[10px] text-slate-400 mt-0.5">login: @{s.login}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            s.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' 
                              : s.role === 'manager' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' 
                              : s.role === 'seller' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {roleNameMap[s.role] || s.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          {s.branch_name || 'Barcha filiallar'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          {s.phone || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-[11px]">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {Number(s.base_salary).toLocaleString()} so'm
                          </p>
                          <p className="text-[10px] text-slate-400">
                            +{s.commission_pct}% {s.salary_type === 'pct_sales' ? 'savdodan' : 'foydadan'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {s.total_sales_count} ta sotuv
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {Number(s.total_sales_volume).toLocaleString()} so'm
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          {isArchived ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              Ishdan ketgan (Arxivlangan)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Faol ishlamoqda
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {s.role !== 'admin' && (
                            isArchived ? (
                              <button
                                onClick={() => handleReactivateStaff(s.id)}
                                className="btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                Qayta tiklash
                              </button>
                            ) : (
                              <button
                                onClick={() => setShowTerminateModal(s)}
                                className="btn-sm bg-rose-50 text-rose-700 hover:bg-rose-100 ml-auto"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Ishdan bo'shatish
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Active Sessions Monitor */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Ushbu ro'yxatda ayni vaqtda tizimga kirib turgan xodimlarning seanslari ko'rsatilgan. Xavfli holatda darhol "Majburan yopish" tugmasini bosing.
            </p>
            <button
              onClick={loadSessions}
              className="btn-secondary"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Yangilash
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Foydalanuvchi</th>
                  <th className="px-4 py-3">Roli & Filial</th>
                  <th className="px-4 py-3">IP Manzil & Qurilma</th>
                  <th className="px-4 py-3">Kirish vaqti</th>
                  <th className="px-4 py-3">Oxirgi faollik</th>
                  <th className="px-4 py-3 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {sessionsList.map(sess => (
                  <tr key={sess.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {sess.user_name}
                      <p className="text-[10px] text-slate-400 font-normal">@{sess.login}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize font-semibold">{sess.role}</span>
                      <p className="text-[10px] text-slate-400">{sess.branch_name || 'Markaziy'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-xs">{sess.ip_address || '127.0.0.1'}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-xs">{sess.user_agent || 'Browser'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {new Date(sess.login_time).toLocaleString('uz-UZ')}
                    </td>
                    <td className="px-4 py-3.5 text-emerald-600 font-semibold">
                      {new Date(sess.last_active_at).toLocaleTimeString('uz-UZ')}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="btn-sm btn-danger ml-auto"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Majburan yopish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Ish vaqtidan tashqarida (09:00 dan oldin yoki 20:00 dan keyin) kirishlar va shubhali amallar tizim tomonidan avtomatik qayd etiladi.
          </p>

          <div className="space-y-3">
            {securityAlerts.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center text-slate-400 border border-slate-200 dark:border-slate-700">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                Hech qanday xavfsizlik ogohlantirishlari mavjud emas. Tizim xavfsiz holatda.
              </div>
            ) : (
              securityAlerts.map(a => (
                <div 
                  key={a.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                    a.is_read 
                      ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70' 
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">
                        {a.message}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Xodim: <span className="font-semibold">{a.user_name || 'Noma\'lum'}</span> | Turi: {a.alert_type} | Sana: {new Date(a.created_at).toLocaleString('uz-UZ')}
                      </p>
                    </div>
                  </div>

                  {!a.is_read && (
                    <button
                      onClick={() => handleMarkAlertRead(a.id)}
                      className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100"
                    >
                      O'qildi deb belgilash
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">ID / Vaqt</th>
                  <th className="px-4 py-3">Foydalanuvchi</th>
                  <th className="px-4 py-3">Amal turi</th>
                  <th className="px-4 py-3">Obyekt</th>
                  <th className="px-4 py-3">Tafsilotlar</th>
                  <th className="px-4 py-3">IP Manzil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5">
                      #{log.id}
                      <p className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString('uz-UZ')}</p>
                    </td>
                    <td className="px-4 py-2.5 font-bold font-sans">
                      {log.user_name || `User #${log.user_id}`}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-sans capitalize">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="px-4 py-2.5 max-w-md truncate font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      {log.new_values || log.old_values || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Staff */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Yangi Xodim Ro'yxatga Olish
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4 mt-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    F.I.Sh (To'liq ismi) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Azizbek Rahimov"
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
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
                    value={addForm.phone}
                    onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Login *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: aziz_seller"
                    value={addForm.login}
                    onChange={e => setAddForm(f => ({ ...f, login: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Parol *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Kamida 6 belgi"
                    value={addForm.password}
                    onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Roli (Lavozimi) *
                  </label>
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                  >
                    <option value="seller">Sotuvchi (POS oynasi)</option>
                    <option value="manager">Menejer / Boshqaruvchi</option>
                    <option value="cashier">Kassir (Moliya & Kassa)</option>
                    <option value="warehouse">Omborchi (Ombor nazorati)</option>
                    <option value="technician">Usta-Muhandis (Servis)</option>
                    <option value="admin">Admin / Do'kon Egasi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Filial
                  </label>
                  <select
                    value={addForm.branch_id}
                    onChange={e => setAddForm(f => ({ ...f, branch_id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="">Barcha filiallar</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salary and commission structure */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Maosh va Motivatsiya (KPI) Sxemasi
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Sxema turi
                    </label>
                    <select
                      value={addForm.salary_type}
                      onChange={e => setAddForm(f => ({ ...f, salary_type: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    >
                      <option value="fixed_plus_pct">Oklad + %</option>
                      <option value="pct_sales">Faqat % (Savdodan)</option>
                      <option value="pct_profit">Faqat % (Sof foydadan)</option>
                      <option value="fixed_only">Faqat qat'iy oklad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Oklad (so'm)
                    </label>
                    <input
                      type="number"
                      value={addForm.base_salary}
                      onChange={e => setAddForm(f => ({ ...f, base_salary: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Bonus (% stavka)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={addForm.commission_pct}
                      onChange={e => setAddForm(f => ({ ...f, commission_pct: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
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
                  Xodimni Saqlash
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Terminate Staff */}
      {showTerminateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <UserX className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Xodimni Ishdan Bo'shatish (Arxivlash)
              </h3>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 mb-4 space-y-1">
              <p className="font-bold">⚠️ TZ Xavfsizlik qoidasi (2.2-modda):</p>
              <p>Xodim akkaunti bazadan o'chirib yuborilmaydi (Never Delete). Uning barcha bajargan sotuvlari, kafolatlari va jurnallari saqlanadi.</p>
              <p>Xodimning barcha faol seanslari darhol majburan yopiladi va qayta tizimga kira olmaydi.</p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Xodim: <span className="font-bold">{showTerminateModal.name}</span> (@{showTerminateModal.login})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Ishdan ketish sababi:
                </label>
                <textarea
                  rows={2}
                  placeholder="O'z xohishi bilan, intizom buzilishi va h.k."
                  value={terminateReason}
                  onChange={e => setTerminateReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowTerminateModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleTerminateStaff}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Ishdan bo'shatishni tasdiqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
