import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatMoney, formatDateTime } from '../api';
import {
  ArrowDownToLine,
  Plus,
  Trash2,
  Package,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  X,
  Eye,
  Calendar
} from 'lucide-react';

export default function PurchaseView() {
  const { showToast, navigateTo } = useStore();
  const [activeSubTab, setActiveSubTab] = useState('create'); // 'create' | 'history'

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Supplier modal
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Selected receipt detail modal
  const [viewReceipt, setViewReceipt] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [supRes, prodRes, historyRes] = await Promise.all([
        apiRequest('/suppliers'),
        apiRequest('/products?is_active=1'),
        apiRequest('/purchases')
      ]);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);
      setPurchaseHistory(historyRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add product to purchase draft
  function handleAddProduct(product) {
    setPurchaseItems(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          code: product.code,
          unit_name: product.base_unit,
          conversion_factor: 1,
          quantity: 1,
          cost_price: product.cost_price || 0,
          all_units: [
            { unit_name: product.base_unit, conversion_factor: 1, selling_price: product.selling_price },
            ...(product.units || [])
          ]
        }
      ];
    });
  }

  function handleUpdateItem(index, field, value) {
    setPurchaseItems(prev => {
      const next = [...prev];
      if (field === 'unit_name') {
        const found = next[index].all_units.find(u => u.unit_name === value);
        if (found) {
          next[index] = {
            ...next[index],
            unit_name: found.unit_name,
            conversion_factor: found.conversion_factor
          };
        }
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  }

  function handleRemoveItem(index) {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  }

  // Create Supplier inline
  async function handleCreateSupplier() {
    if (!newSupplierName.trim()) return;
    try {
      const res = await apiRequest('/suppliers', 'POST', {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined
      });
      if (res.success && res.data) {
        setSuppliers(prev => [...prev, res.data]);
        setSelectedSupplierId(String(res.data.id));
        setNewSupplierName('');
        setNewSupplierPhone('');
        setShowAddSupplier(false);
        showToast('Đã thêm nhà cung cấp', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Calculations
  const totalAmount = purchaseItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.cost_price) || 0),
    0
  );
  const paid = paidAmount === '' ? totalAmount : Number(paidAmount);
  const debt = Math.max(0, totalAmount - paid);

  // Submit Inbound Receipt
  async function handleSubmitPurchase() {
    if (purchaseItems.length === 0) {
      showToast('Vui lòng chọn ít nhất một sản phẩm cần nhập kho', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: selectedSupplierId ? Number(selectedSupplierId) : null,
        items: purchaseItems.map(item => ({
          product_id: item.product_id,
          unit_name: item.unit_name,
          conversion_factor: Number(item.conversion_factor) || 1,
          quantity: Number(item.quantity),
          cost_price: Number(item.cost_price)
        })),
        paid_amount: paid,
        notes
      };

      const res = await apiRequest('/purchases', 'POST', payload);
      showToast(res.message, 'success');
      setPurchaseItems([]);
      setPaidAmount('');
      setNotes('');
      loadData();
      setActiveSubTab('history');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Cancel purchase receipt
  async function handleCancelPurchase(receipt) {
    const reason = window.prompt(`Nhập lý do hủy phiếu nhập ${receipt.receipt_code}:`, 'Nhập sai số lượng/giá');
    if (!reason) return;

    try {
      const res = await apiRequest(`/purchases/${receipt.id}/cancel`, 'POST', { reason });
      showToast(res.message, 'success');
      loadData();
      if (viewReceipt?.id === receipt.id) {
        setViewReceipt(null);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Nhập hàng từ nhà cung cấp
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tạo phiếu nhập kho, tăng số lượng tồn, cập nhật giá vốn và theo dõi công nợ.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'create'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Tạo phiếu nhập mới
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'history'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lịch sử phiếu nhập ({purchaseHistory.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left (7 cols): Inbound items table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                Danh sách hàng nhập ({purchaseItems.length})
              </h3>

              {/* Quick select product dropdown */}
              <div className="relative">
                <select
                  onChange={(e) => {
                    const prod = products.find(p => p.id === Number(e.target.value));
                    if (prod) handleAddProduct(prod);
                    e.target.value = '';
                  }}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="">+ Chọn sản phẩm nhập...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {purchaseItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Chưa chọn sản phẩm nào để nhập</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chọn sản phẩm từ danh sách góc phải trên để thêm vào phiếu.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Unit selector */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                          Đơn vị nhập
                        </label>
                        <select
                          value={item.unit_name}
                          onChange={(e) => handleUpdateItem(idx, 'unit_name', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                        >
                          {item.all_units.map((u, ui) => (
                            <option key={ui} value={u.unit_name}>
                              {u.unit_name} ({u.conversion_factor}x)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                          Số lượng
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                        />
                      </div>

                      {/* Cost price per unit */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                          Giá nhập/{item.unit_name}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={item.cost_price}
                          onChange={(e) => handleUpdateItem(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                        />
                      </div>

                      {/* Line subtotal */}
                      <div className="sm:col-span-3 text-right">
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                          Thành tiền
                        </label>
                        <span className="font-bold text-emerald-800 text-sm">
                          {formatMoney((item.quantity || 0) * (item.cost_price || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right (5 cols): Supplier, Payment & Confirmation */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100">
              Thông tin nhà cung cấp & Thanh toán
            </h3>

            {/* Supplier Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Nhà cung cấp
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(!showAddSupplier)}
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  + Thêm NCC mới
                </button>
              </div>

              {showAddSupplier && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mb-2">
                  <input
                    type="text"
                    placeholder="Tên nhà cung cấp *"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateSupplier}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Lưu NCC
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(false)}
                      className="px-2 py-1 text-slate-500 text-xs"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 font-medium"
              >
                <option value="">-- Mua ngoài chợ / NCC vãng lai --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.phone ? `(${s.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Total and Paid amounts */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-sm">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Tổng tiền hàng nhập:</span>
                <span className="text-emerald-800 text-base">{formatMoney(totalAmount)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Đã thanh toán cho NCC:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder={String(totalAmount)}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {debt > 0 ? (
                <div className="flex justify-between font-bold text-rose-600 text-xs pt-1 border-t border-slate-200">
                  <span>Còn nợ nhà cung cấp:</span>
                  <span>{formatMoney(debt)}</span>
                </div>
              ) : (
                <div className="flex justify-between font-semibold text-emerald-700 text-xs pt-1 border-t border-slate-200">
                  <span>Tình trạng công nợ:</span>
                  <span>Đã thanh toán đủ</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Ghi chú phiếu nhập
              </label>
              <textarea
                rows={2}
                placeholder="Số hóa đơn đỏ, người giao hàng..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitPurchase}
              disabled={submitting || purchaseItems.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm transition-colors shadow-md shadow-emerald-700/20"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{submitting ? 'Đang lưu phiếu...' : 'Xác nhận nhập kho & Tăng tồn'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Purchase Receipts History */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {purchaseHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Chưa có phiếu nhập hàng nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Mã phiếu</th>
                    <th className="py-3 px-3">Thời gian</th>
                    <th className="py-3 px-3">Nhà cung cấp</th>
                    <th className="py-3 px-3 text-right">Tổng tiền</th>
                    <th className="py-3 px-3 text-right">Đã trả</th>
                    <th className="py-3 px-3 text-right">Còn nợ</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseHistory.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold font-mono text-slate-900">{r.receipt_code}</td>
                      <td className="py-3 px-3 text-slate-500">{formatDateTime(r.created_at)}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{r.supplier_name || 'Vãng lai'}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatMoney(r.total_amount)}</td>
                      <td className="py-3 px-3 text-right text-emerald-700">{formatMoney(r.paid_amount)}</td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold">{formatMoney(r.debt_amount)}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            r.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {r.status === 'cancelled' ? 'Đã hủy' : 'Hoàn tất'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async () => {
                              const res = await apiRequest(`/purchases/${r.id}`);
                              setViewReceipt(res.data);
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {r.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelPurchase(r)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Hủy phiếu nhập (trừ lại tồn kho)"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Receipt Detail Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Chi tiết phiếu nhập #{viewReceipt.receipt_code}
                </h3>
                <span className="text-xs text-slate-500">{formatDateTime(viewReceipt.created_at)}</span>
              </div>
              <button onClick={() => setViewReceipt(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl">
              <div><span className="text-slate-500">Nhà cung cấp:</span> <span className="font-semibold">{viewReceipt.supplier_name || 'Vãng lai'}</span></div>
              {viewReceipt.supplier_phone && <div><span className="text-slate-500">Điện thoại:</span> {viewReceipt.supplier_phone}</div>}
              {viewReceipt.notes && <div><span className="text-slate-500">Ghi chú:</span> {viewReceipt.notes}</div>}
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-100 text-xs">
              {(viewReceipt.items || []).map((it, i) => (
                <div key={i} className="py-2 flex justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{it.product_name}</div>
                    <div className="text-slate-500">{it.quantity} {it.unit_name} × {formatMoney(it.cost_price)}</div>
                  </div>
                  <div className="font-bold text-slate-900">{formatMoney(it.subtotal)}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
              <div className="flex justify-between font-bold text-sm">
                <span>Tổng tiền:</span>
                <span className="text-emerald-800">{formatMoney(viewReceipt.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Đã trả:</span>
                <span>{formatMoney(viewReceipt.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Còn nợ:</span>
                <span>{formatMoney(viewReceipt.debt_amount)}</span>
              </div>
            </div>

            <button
              onClick={() => setViewReceipt(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
