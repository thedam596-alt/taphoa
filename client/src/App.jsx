import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import OfflineBanner from './components/OfflineBanner';
import BarcodeScannerModal from './components/BarcodeScannerModal';
import ReceiptModal from './components/ReceiptModal';

// Views
import HomeView from './views/HomeView';
import PosView from './views/PosView';
import ProductsView from './views/ProductsView';
import ProductFormView from './views/ProductFormView';
import PurchaseView from './views/PurchaseView';
import InventoryView from './views/InventoryView';
import SalesHistoryView from './views/SalesHistoryView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';

function MainContent() {
  const { activeTab } = useStore();

  return (
    <div className="flex-1 min-w-0">
      {activeTab === 'home' && <HomeView />}
      {activeTab === 'pos' && <PosView />}
      {activeTab === 'products' && <ProductsView />}
      {activeTab === 'product_add' && <ProductFormView />}
      {activeTab === 'purchases' && <PurchaseView />}
      {activeTab === 'inventory' && <InventoryView />}
      {activeTab === 'history' && <SalesHistoryView />}
      {activeTab === 'reports' && <ReportsView />}
      {activeTab === 'settings' && <SettingsView />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-800 antialiased font-sans overflow-x-hidden">
        {/* Navigation Sidebar (Desktop) & Mobile Top Header + Bottom Nav */}
        <Navbar />

        {/* Dynamic Content Views */}
        <main className="flex-1 flex flex-col min-w-0">
          <OfflineBanner />
          <MainContent />
        </main>

        {/* Global Modals & Notifications */}
        <Toast />
        <BarcodeScannerModal />
        <ReceiptModal />
      </div>
    </StoreProvider>
  );
}
