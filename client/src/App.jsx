import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import GlobalSearchModal from './components/GlobalSearchModal';

// Pages
import DashboardPage from './pages/DashboardPage';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import PurchasesPage from './pages/PurchasesPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import FinancePage from './pages/FinancePage';
import RepairsPage from './pages/RepairsPage';
import ReportsPage from './pages/ReportsPage';
import StaffSecurityPage from './pages/StaffSecurityPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set default page according to role when user changes
  useEffect(() => {
    if (user) {
      if (user.role === 'seller') setCurrentPage('pos');
      else if (user.role === 'cashier') setCurrentPage('finance');
      else if (user.role === 'warehouse') setCurrentPage('inventory');
      else if (user.role === 'technician') setCurrentPage('repairs');
      else if (!['admin', 'manager'].includes(user.role)) setCurrentPage('pos');
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center shadow-2xl shadow-indigo-500/50 mb-4 animate-bounce">
          <span className="text-2xl font-black">📱</span>
        </div>
        <h2 className="text-xl font-black tracking-wide">SMARTPHONE PRO POS</h2>
        <p className="text-xs text-slate-400 mt-1">Telefon Savdosi va Ombor Hisobi Tizimi yuklanmoqda...</p>
        <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div className="w-1/2 h-full bg-indigo-500 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'pos':
        return <PosPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'customers':
        return <CustomersPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'finance':
        return <FinancePage />;
      case 'repairs':
        return <RepairsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'staff_security':
        return <StaffSecurityPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* Top Navbar */}
      <Navbar 
        onToggleSidebar={() => setSidebarOpen(prev => !prev)} 
        onNavigate={setCurrentPage}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar 
          currentPage={currentPage} 
          onNavigate={(page) => setCurrentPage(page)} 
        />

        {/* Mobile Sidebar Overlay Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-900 z-50 shadow-2xl">
              <Sidebar 
                currentPage={currentPage} 
                isMobile={true}
                onNavigate={(page) => {
                  setCurrentPage(page);
                  setSidebarOpen(false);
                }} 
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {renderPage()}
        </main>
      </div>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal onSelectDevice={(dev) => setCurrentPage('inventory')} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
