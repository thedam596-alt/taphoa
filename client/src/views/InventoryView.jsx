import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatMoney, formatDateTime } from '../api';
import {
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  ClipboardList,
  History,
  FileSpreadsheet,
  Plus,
  Minus,
  X
} from 'lucide-react';

export default function InventoryView() {
  const { showToast } = useStore();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'transactions'
  const [inventoryList, setInventoryList] = useState([]);
  const [summary, setSummary] = useState({
    total_products: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_inventory_value: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [actualStock, setActualStock] = useState('');
  const [adjustReason, setAdjustReason] = useState('Kiểm kê định kỳ');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/inventory?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await apiRequest(url);
      setInventoryList(res.data || []);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      console.error(err);
      showToast('Lỗi tải dữ liệu kho', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, showToast]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await apiRequest('/inventory/transactions?limit=100');
      setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchInventory();
    } else {
      fetchTransactions();
    }
  }, [activeTab, fetchInventory, fetchTransactions]);

  // Open adjustment modal for specific product
  function openAdjustModal(prod) {
    setSelectedProduct(prod);
    setActualStock(String(prod.current_stock));
    setAdjustReason('Kiểm kê định kỳ');
    setAdjustNotes('');
    setAdjustModalOpen(true);
  }

  // Submit stock adjustment
  async function handleAdjustSubmit(e) {
    e.preventDefault();
    if (!selectedProduct) return;

    const targetStock = Number(actualStock);
    if (isNaN(targetStock) || targetStock < 0) {
      showToast('Số lượng tồn thực tế không hợp lệ', 'warning');
      return;
    }

    setAdjusting(true);
    try {
      const res = await apiRequest('/inventory/adjust', 'POST', {
        product_id: selectedProduct.id,
        new_stock: targetStock,
        reason: adjustReason,
        notes: adjustNotes
      });
      showToast(res.message, 'success');
      setAdjustModalOpen(false);
      fetchInventory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAdjusting(false);
    }
  }

  // Export inventory to CSV
  function handleExportCsv() {
    window.open('/api/settings/export-products', '_blank');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý kho & Tồn kho
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Theo dõi số lượng tồn thời gian thực, giá trị vốn hàng hóa và lịch sử xuất nhập kho.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Xuất Excel / CSV
          </button>

          {/* Sub-tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'stock' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Danh sách tồn kho
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'transactions' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch sử biến động
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mặt hàng quản lý</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{summary.total_products}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sản phẩm đang kinh doanh</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'low_stock' ? '' : 'low_stock')}
          className={`bg-white p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'low_stock' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Sắp hết hàng</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{summary.low_stock_count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tồn kho ≤ mức tối thiểu</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? '' : 'out_of_stock')}
          className={`bg-white p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'out_of_stock' ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Hết hàng (0)</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{summary.out_of_stock_count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Không còn hàng bán</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Tổng giá trị tồn kho</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {formatMoney(summary.total_inventory_value)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tính theo giá vốn nhập</div>
        </div>
      </div>

      {activeTab === 'stock' ? (
        <>
          {/* Search & Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mặt hàng theo tên, mã hàng hoặc mã vạch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === '' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setStatusFilter('low_stock')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === 'low_stock' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Sắp hết
              </button>
              <button
                onClick={() => setStatusFilter('out_of_stock')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === 'out_of_stock' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Hết hàng
              </button>
            </div>
          </div>

          {/* Real-time Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Đang tải dữ liệu tồn kho...</div>
            ) : inventoryList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Không tìm thấy mặt hàng nào trong kho.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Sản phẩm</th>
                      <th className="py-3 px-3">Mã hàng</th>
                      <th className="py-3 px-3">Đơn vị cơ sở</th>
                      <th className="py-3 px-3 text-right">Tồn hiện tại</th>
                      <th className="py-3 px-3 text-right">Giá vốn</th>
                      <th className="py-3 px-3 text-right">Giá bán</th>
                      <th className="py-3 px-3 text-right">Giá trị tồn</th>
                      <th className="py-3 px-3 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Kiểm kê</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-xs">{item.code}</td>
                        <td className="py-3 px-3 text-slate-700">{item.base_unit}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 font-mono text-sm">
                          {item.current_stock}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">{formatMoney(item.cost_price)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">{formatMoney(item.selling_price)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatMoney(item.inventory_value)}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              item.stock_status === 'out_of_stock'
                                ? 'bg-rose-100 text-rose-700'
                                : item.stock_status === 'low_stock'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.stock_status === 'out_of_stock'
                              ? 'Hết hàng'
                              : item.stock_status === 'low_stock'
                              ? 'Sắp hết'
                              : 'Còn hàng'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openAdjustModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            Kiểm kê
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Inventory Audit Log / Thẻ kho */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Lịch sử biến động kho (Thẻ kho chi tiết)
            </h3>
            <span className="text-xs text-slate-500">{transactions.length} giao dịch gần nhất</span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Chưa có biến động kho nào được ghi nhận.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-3">Sản phẩm</th>
                    <th className="py-3 px-3">Loại biến động</th>
                    <th className="py-3 px-3">Mã tham chiếu</th>
                    <th className="py-3 px-3 text-right">Thay đổi</th>
                    <th className="py-3 px-3 text-right">Tồn trước</th>
                    <th className="py-3 px-3 text-right">Tồn sau</th>
                    <th className="py-3 px-4">Lý do / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(t => {
                    const isPositive = t.quantity_change > 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-500 text-xs font-mono">{formatDateTime(t.created_at)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{t.product_name}</td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-xs">
                            {t.transaction_type === 'SALE' && <span className="text-blue-600">Bán hàng</span>}
                            {t.transaction_type === 'PURCHASE' && <span className="text-emerald-700">Nhập hàng</span>}
                            {t.transaction_type === 'INITIAL' && <span className="text-purple-700">Tồn ban đầu</span>}
                            {t.transaction_type === 'ADJUSTMENT' && <span className="text-amber-600">Kiểm kê kho</span>}
                            {t.transaction_type === 'SALE_CANCEL' && <span className="text-rose-600">Hủy đơn bán</span>}
                            {t.transaction_type === 'PURCHASE_CANCEL' && <span className="text-rose-600">Hủy đơn nhập</span>}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-xs">{t.reference_code || '-'}</td>
                        <td className="py-3 px-3 text-right font-bold font-mono">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                            {isPositive ? `+${t.quantity_change}` : t.quantity_change} {t.base_unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">{t.stock_before}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">{t.stock_after}</td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{t.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                Kiểm kê điều chỉnh kho
              </h3>
              <button onClick={() => setAdjustModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-sm text-slate-900">{selectedProduct.name}</div>
              <div className="text-slate-500">Mã SKU: {selectedProduct.code} | Đơn vị cơ sở: {selectedProduct.base_unit}</div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-600">Tồn kho trên hệ thống:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedProduct.current_stock} {selectedProduct.base_unit}</span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Số lượng tồn thực tế sau khi đếm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={actualStock}
                  onChange={(e) => setActualStock(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {/* Difference indicator */}
                {actualStock !== '' && !isNaN(Number(actualStock)) && (
                  <div className="mt-2 text-xs flex justify-between font-semibold">
                    <span className="text-slate-500">Chênh lệch điều chỉnh:</span>
                    <span
                      className={
                        Number(actualStock) - selectedProduct.current_stock > 0
                          ? 'text-emerald-700'
                          : Number(actualStock) - selectedProduct.current_stock < 0
                          ? 'text-rose-600'
                          : 'text-slate-600'
                      }
                    >
                      {Number(actualStock) - selectedProduct.current_stock > 0 ? '+' : ''}
                      {Number(actualStock) - selectedProduct.current_stock} {selectedProduct.base_unit}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Lý do điều chỉnh <span className="text-rose-500">*</span>
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium"
                >
                  <option value="Kiểm kê định kỳ">Kiểm kê định kỳ</option>
                  <option value="Hàng hư hỏng / Bể vỡ">Hàng hư hỏng / Bể vỡ</option>
                  <option value="Hết hạn sử dụng">Hết hạn sử dụng</option>
                  <option value="Mất mát / Thất thoát">Mất mát / Thất thoát</option>
                  <option value="Thừa thực tế">Thừa thực tế</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Ghi chú kiểm kê
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú thêm..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                >
                  {adjusting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
