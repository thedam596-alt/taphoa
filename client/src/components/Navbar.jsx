import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import InstallPwaModal from './InstallPwaModal';
import {
  Home,
  ShoppingCart,
  Package,
  Warehouse,
  MoreHorizontal,
  ArrowDownToLine,
  Receipt,
  BarChart3,
  Settings,
  Camera,
  PlusCircle,
  Store,
  Wifi,
  Smartphone,
  X,
  ChevronRight
} from 'lucide-react';

export default function Navbar() {
  const { activeTab, navigateTo, settings, cart, openScanner, networkInfo } = useStore();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [isIosBrowser, setIsIosBrowser] = useState(false);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Detect if user is on iOS Safari in browser mode (not standalone)
  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) {
      setIsIosBrowser(true);
    }
  }, []);

  const desktopMenuItems = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'pos', label: 'Bán hàng', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : null },
    { id: 'products', label: 'Tất cả sản phẩm', icon: Package },
    { id: 'product_add', label: 'Thêm sản phẩm', icon: PlusCircle },
    { id: 'purchases', label: 'Nhập hàng', icon: ArrowDownToLine },
    { id: 'inventory', label: 'Quản lý kho', icon: Warehouse },
    { id: 'history', label: 'Lịch sử bán hàng', icon: Receipt },
    { id: 'reports', label: 'Báo cáo doanh thu', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  function handleNav(id) {
    navigateTo(id);
    setMoreSheetOpen(false);
  }

  return (
    <>
      {/* DESKTOP SIDEBAR (>= 1024px) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen sticky top-0 shrink-0 select-none z-30">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          {settings.store_logo ? (
            <img
              src={settings.store_logo}
              alt="Logo"
              className="w-10 h-10 object-contain rounded-xl border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Store className="w-5 h-5" />
            </div>
          )}
          <div className="overflow-hidden">
            <h1 className="font-bold text-slate-900 text-base leading-tight truncate">
              {settings.store_name || 'TẠP HÓA MAI CUA'}
            </h1>
            <p className="text-xs text-emerald-700 font-medium">Quản lý bán hàng</p>
          </div>
        </div>

        {/* Quick Scan Action */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => openScanner()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-medium text-sm transition-all shadow-sm group"
          >
            <Camera className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Quét mã vạch / QR</span>
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {desktopMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 4G/5G Public HTTPS Link */}
        {networkInfo && networkInfo.public_url && (
          <div className="p-3 mx-3 mb-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Link iPhone (4G / 5G)</span>
            </div>
            <div className="font-mono text-[11px] font-bold text-emerald-800 bg-white px-2 py-1 rounded border border-emerald-200 truncate select-all" title={networkInfo.public_url}>
              {networkInfo.public_url}
            </div>
          </div>
        )}

        {/* LAN Access Widget */}
        {networkInfo && networkInfo.ips && networkInfo.ips.length > 0 && (
          <div className="p-3 mx-3 mb-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-1">
              <Wifi className="w-3.5 h-3.5" />
              <span>Dùng trên iPhone / Android</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-1">Cùng mạng Wi-Fi mở Safari / Chrome:</p>
            <div className="font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 select-all">
              http://{networkInfo.ips[0].ip}:{networkInfo.port}
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE TOP HEADER (< 1024px) with Safe Area Top (Notch / Dynamic Island) */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 pt-safe px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5" onClick={() => handleNav('home')}>
          {settings.store_logo ? (
            <img
              src={settings.store_logo}
              alt="Logo"
              className="w-8 h-8 object-contain rounded-lg border border-slate-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Store className="w-4 h-4" />
            </div>
          )}
          <span className="font-bold text-slate-900 text-sm tracking-tight truncate max-w-[170px]">
            {settings.store_name || 'TẠP HÓA MAI CUA'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Scanner */}
          <button
            onClick={() => openScanner()}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors active:scale-95"
            title="Quét mã vạch"
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Quét</span>
          </button>

          {/* Quick Add Product */}
          <button
            onClick={() => handleNav('product_add')}
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Thêm sản phẩm"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* iOS Safari "Add to Home Screen" Mini Banner */}
      {isIosBrowser && (
        <div
          onClick={() => setInstallModalOpen(true)}
          className="lg:hidden bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-between cursor-pointer shadow-sm active:opacity-90"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-200 shrink-0" />
            <span className="truncate">Cài đặt "Mai Cua" lên màn hình chính iPhone</span>
          </div>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] shrink-0 font-bold">
            Xem cách cài
          </span>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Exactly 5 items per Requirement 2) */}
      {/* Supports iPhone Home Indicator with pb-safe & safe height */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* 1. Trang chủ */}
          <button
            onClick={() => handleNav('home')}
            className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              activeTab === 'home' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Trang chủ</span>
          </button>

          {/* 2. Bán hàng (POS) */}
          <button
            onClick={() => handleNav('pos')}
            className={`relative flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              activeTab === 'pos' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Bán hàng</span>
            {cartCount > 0 && (
              <span className="absolute top-2 right-4 w-4 h-4 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* 3. Sản phẩm */}
          <button
            onClick={() => handleNav('products')}
            className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              activeTab === 'products' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Package className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Sản phẩm</span>
          </button>

          {/* 4. Kho hàng (Inventory) */}
          <button
            onClick={() => handleNav('inventory')}
            className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              activeTab === 'inventory' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Warehouse className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Kho hàng</span>
          </button>

          {/* 5. Thêm (More / Menu) */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              moreSheetOpen ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Thêm</span>
          </button>
        </div>
      </nav>

      {/* iOS ACTION SHEET / BOTTOM DRAWER FOR "THÊM" */}
      {moreSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full bg-white rounded-t-3xl p-5 pb-safe space-y-4 animate-in slide-in-from-bottom-5 max-h-[85vh] overflow-y-auto"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-base">Chức năng mở rộng</span>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu List */}
            <div className="space-y-2">
              <button
                onClick={() => handleNav('purchases')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ArrowDownToLine className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Nhập hàng</div>
                    <div className="text-xs text-slate-500">Lập phiếu nhập kho & theo dõi nợ NCC</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('history')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Lịch sử bán hàng</div>
                    <div className="text-xs text-slate-500">Xem lại hóa đơn, in lại & đổi trả hàng</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('reports')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Báo cáo doanh thu</div>
                    <div className="text-xs text-slate-500">Thống kê lãi lỗ, giá vốn & hàng bán chạy</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('settings')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Cài đặt cửa hàng</div>
                    <div className="text-xs text-slate-500">Sao lưu, quy tắc kho & mẫu hóa đơn</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setMoreSheetOpen(false);
                  setInstallModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Cài đặt lên iPhone (PWA)</div>
                    <div className="text-xs text-emerald-700">Mở toàn màn hình không có thanh Safari</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Home Screen Walkthrough Modal */}
      <InstallPwaModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </>
  );
}
