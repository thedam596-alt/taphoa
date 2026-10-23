import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatMoney } from '../api';
import {
  DollarSign,
  Receipt,
  Package,
  AlertTriangle,
  Warehouse,
  PlusCircle,
  ShoppingCart,
  Camera,
  Search,
  Star,
  ChevronRight,
  TrendingUp,
  Store,
  Sparkles
} from 'lucide-react';

export default function HomeView() {
  const { navigateTo, openScanner, addToCart, settings } = useStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today_revenue: 0,
    today_invoices: 0,
    total_products: 0,
    low_stock_count: 0,
    total_inventory_value: 0
  });
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Today's Vietnamese date string
  const todayDateStr = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch today report
      const rep = await apiRequest('/reports?period=today');
      if (rep.summary) {
        setStats({
          today_revenue: rep.summary.total_revenue || 0,
          today_invoices: rep.summary.total_invoices || 0,
          total_products: rep.summary.total_active_products || 0,
          low_stock_count: rep.summary.low_stock_count || 0,
          total_inventory_value: rep.summary.total_inventory_value || 0
        });
      }

      // Fetch featured products
      const featRes = await apiRequest('/products?featured_only=true');
      if (featRes.data) {
        setFeaturedProducts(featRes.data);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu trang chủ:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle quick search input
  async function handleSearch(term) {
    setQuickSearch(term);
    if (!term || !term.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      setSearching(true);
      const res = await apiRequest(`/products?search=${encodeURIComponent(term.trim())}&limit=5`);
      setSearchResults(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Date Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white rounded-2xl p-5 sm:p-6 shadow-md shadow-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium uppercase tracking-wider mb-1">
            <Store className="w-4 h-4" />
            <span>Cửa hàng {settings.store_name || 'TẠP HÓA MAI CUA'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight capitalize">
            {todayDateStr}
          </h2>
          <p className="text-emerald-100 text-sm mt-0.5">
            Chúc quý khách một ngày buôn bán thuận buồm xuôi gió!
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigateTo('pos')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            Bán hàng nhanh
          </button>
          <button
            onClick={() => openScanner()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/60 hover:bg-emerald-600 text-white border border-emerald-400/40 rounded-xl font-medium text-sm transition-all active:scale-95"
          >
            <Camera className="w-4 h-4" />
            Quét mã
          </button>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nhanh sản phẩm theo tên, mã hàng hoặc mã vạch..."
            value={quickSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Quick search dropdown results */}
        {quickSearch.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-20 overflow-hidden divide-y divide-slate-100">
            {searching ? (
              <div className="p-4 text-center text-sm text-slate-500">Đang tìm kiếm...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    addToCart(p);
                    setQuickSearch('');
                    setSearchResults([]);
                  }}
                  className="p-3.5 hover:bg-emerald-50/50 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {p.code} {p.barcode && `| ${p.barcode}`} | Tồn: {p.current_stock} {p.base_unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700 text-sm">{formatMoney(p.selling_price)}</div>
                    <div className="text-[11px] text-emerald-600 font-medium">+ Thêm vào đơn</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-slate-500">
                Không tìm thấy sản phẩm phù hợp với "{quickSearch}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Real-Time Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Revenue Today */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Doanh thu hôm nay</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatMoney(stats.today_revenue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.today_invoices} hóa đơn đã bán
            </p>
          </div>
        </div>

        {/* Metric 2: Today Invoices */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Số hóa đơn</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.today_invoices}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Đơn hàng hoàn tất</p>
          </div>
        </div>

        {/* Metric 3: Total Managed Products */}
        <div
          onClick={() => navigateTo('products')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mặt hàng</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.total_products}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Đang kinh doanh</p>
          </div>
        </div>

        {/* Metric 4: Low Stock Products */}
        <div
          onClick={() => navigateTo('inventory')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sắp hết hàng</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-lg sm:text-2xl font-black tracking-tight ${stats.low_stock_count > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {stats.low_stock_count}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Cần nhập thêm</p>
          </div>
        </div>

        {/* Metric 5: Total Inventory Valuation */}
        <div
          onClick={() => navigateTo('inventory')}
          className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Giá trị tồn kho</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatMoney(stats.total_inventory_value)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Theo giá vốn</p>
          </div>
        </div>
      </div>

      {/* Featured / Best Sellers Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Sản phẩm bán chạy / Thường bán
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
              {featuredProducts.length} mặt hàng
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo('products')}
              className="text-xs sm:text-sm text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 transition-colors"
            >
              Chọn sản phẩm ghim lên trang chủ
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Featured Products Grid */}
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {featuredProducts.map(p => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="group relative bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <div>
                  {/* Image */}
                  <div className="aspect-square w-full rounded-lg bg-white overflow-hidden mb-2.5 flex items-center justify-center border border-slate-200/60">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  {/* Name */}
                  <h4 className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-snug">
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    ĐVT: {p.base_unit}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="font-bold text-emerald-700 text-xs sm:text-sm">
                    {formatMoney(p.selling_price)}
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-medium group-hover:bg-emerald-700">
                    + Thêm
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chưa có sản phẩm bán chạy nào được ghim</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Bạn có thể tự chọn bất kỳ sản phẩm nào từ danh sách hàng hóa để đưa lên trang chủ, giúp bấm bán nhanh chỉ với 1 chạm.
            </p>
            <button
              onClick={() => navigateTo('products')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <Package className="w-4 h-4" />
              Đến danh sách sản phẩm để ghim
            </button>
          </div>
        )}
      </div>

      {/* Empty Database Getting Started Banner */}
      {stats.total_products === 0 && !loading && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">
            Chào mừng bạn đến với TẠP HÓA MAI CUA!
          </h3>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-4">
            Cơ sở dữ liệu sản phẩm hiện đang hoàn toàn trống. Hãy thêm những mặt hàng đầu tiên của cửa hàng bạn để bắt đầu bán hàng và quản lý doanh thu.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigateTo('product_add')}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-emerald-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              Thêm sản phẩm đầu tiên
            </button>
            <button
              onClick={() => navigateTo('settings')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition-colors"
            >
              Nhập từ file Excel / CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
