import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatMoney } from '../api';
import {
  Search,
  Camera,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  RotateCcw,
  Package,
  QrCode,
  Printer,
  WifiOff
} from 'lucide-react';

export default function PosView() {
  const {
    cart,
    setCart,
    cartDiscount,
    setCartDiscount,
    addToCart,
    updateCartQty,
    updateCartUnit,
    removeFromCart,
    clearCart,
    openScanner,
    setActiveReceiptModal,
    showToast,
    settings
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [customerPaid, setCustomerPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'transfer'
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    function handleOnline() { setIsOnline(true); }
    function handleOffline() { setIsOnline(false); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Search products for POS
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest(`/products?search=${encodeURIComponent(searchTerm.trim())}&limit=8`);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Support External USB / Bluetooth Barcode Scanners
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          handleBarcodeScanned(barcodeBuffer);
        }
        setBarcodeBuffer('');
      } else if (e.key.length === 1) {
        if (diff > 120 && barcodeBuffer.length > 0) {
          setBarcodeBuffer(e.key);
        } else {
          setBarcodeBuffer(prev => prev + e.key);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcodeBuffer]);

  async function handleBarcodeScanned(code) {
    try {
      const res = await apiRequest(`/products/by-barcode/${encodeURIComponent(code)}`);
      if (res.success && res.data) {
        addToCart(res.data, res.matchedUnit);
        showToast(`Đã thêm "${res.data.name}"`, 'success');
      }
    } catch (e) {
      showToast(`Chưa có sản phẩm mang mã "${code}"`, 'warning');
    }
  }

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discount = Math.max(0, Math.min(subtotal, Number(cartDiscount) || 0));
  const finalAmount = Math.max(0, subtotal - discount);
  const paid = customerPaid === '' ? 0 : Number(customerPaid);
  const change = paid >= finalAmount ? paid - finalAmount : 0;
  const deficit = paid < finalAmount && paid > 0 ? finalAmount - paid : 0;

  function handleQuickCash(amount) {
    if (amount === 'exact') {
      setCustomerPaid(finalAmount);
    } else {
      setCustomerPaid(amount);
    }
  }

  async function handleCheckout() {
    if (!isOnline) {
      showToast('Đang mất kết nối mạng! Yêu cầu kết nối mạng để hoàn tất thanh toán và cập nhật kho.', 'error', 4500);
      return;
    }

    if (cart.length === 0) {
      showToast('Giỏ hàng đang trống! Vui lòng chọn sản phẩm.', 'warning');
      return;
    }

    if (submitting) return;

    setSubmitting(true);
    try {
      const checkoutPayload = {
        items: cart.map(item => ({
          product_id: item.product_id,
          unit_name: item.unit_name,
          conversion_factor: item.conversion_factor,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        discount_amount: discount,
        customer_paid: paid > 0 ? paid : finalAmount,
        payment_method: paymentMethod,
        notes: orderNotes
      };

      const res = await apiRequest('/pos/checkout', 'POST', checkoutPayload);
      if (res.success && res.data) {
        showToast('Thanh toán thành công!', 'success');
        clearCart();
        setCustomerPaid('');
        setOrderNotes('');
        setActiveReceiptModal(res.data);
      }
    } catch (err) {
      showToast(err.message, 'error', 5000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 pb-32 lg:pb-8">
      {/* Search & Barcode Scan Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm sản phẩm theo tên, mã SKU, mã vạch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />

          {/* Search suggestions dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-30 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {searchResults.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    addToCart(p);
                    setSearchTerm('');
                    setSearchResults([]);
                  }}
                  className="p-3 hover:bg-emerald-50 flex items-center justify-between cursor-pointer transition-colors active:bg-emerald-100"
                >
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {p.code} | Tồn: {p.current_stock} {p.base_unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-800 text-sm">{formatMoney(p.selling_price)}</span>
                    <div className="text-[10px] text-emerald-600 font-bold">+ Bấm chọn</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => openScanner()}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm shrink-0 active:scale-95"
        >
          <Camera className="w-5 h-5" />
          <span>Quét mã vạch</span>
        </button>
      </div>

      {/* POS Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[380px]">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Đơn hàng hiện tại</h3>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {cart.length} món
              </span>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa giỏ hàng
              </button>
            )}
          </div>

          {/* Cart items list */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Package className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold text-slate-700 text-sm">Chưa có sản phẩm trong đơn</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Bấm "Quét mã vạch" hoặc tìm kiếm sản phẩm phía trên để tính tiền.
                </p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={item.unit_name}
                          onChange={(e) => updateCartUnit(index, e.target.value)}
                          className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-2 py-1 focus:outline-none"
                        >
                          {item.all_units.map((u, ui) => (
                            <option key={ui} value={u.unit_name}>
                              {u.unit_name} ({formatMoney(u.selling_price)})
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                          {formatMoney(item.unit_price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {/* Stepper with larger tap targets for iPhone */}
                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
                      <button
                        onClick={() => updateCartQty(index, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-700 transition-colors active:scale-95"
                        title="Giảm 1"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => updateCartQty(index, parseFloat(e.target.value) || 0)}
                        className="w-12 text-center bg-transparent font-black text-sm text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => updateCartQty(index, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-700 transition-colors active:scale-95"
                        title="Tăng 1"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <div className="font-black text-slate-900 text-sm">
                        {formatMoney(item.quantity * item.unit_price)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(index)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Xóa món"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Payment Calculation (Highlights Grand Total prominently for iPhone) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100">
              Chi tiết thanh toán
            </h3>

            {/* PROMINENT GRAND TOTAL BOX FOR IPHONE */}
            <div className="my-3 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-center shadow-inner">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                TỔNG TIỀN PHẢI THU
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight font-mono">
                {formatMoney(finalAmount)}
              </div>
              {discount > 0 && (
                <div className="text-xs text-rose-600 font-semibold mt-1">
                  (Đã giảm giá: -{formatMoney(discount)})
                </div>
              )}
            </div>

            <div className="py-2 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600 text-xs">
                <span>Tổng tiền hàng ({cart.length} món):</span>
                <span className="font-semibold text-slate-800">{formatMoney(subtotal)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between text-slate-600 text-xs">
                <span>Giảm giá (VNĐ):</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={cartDiscount || ''}
                  onChange={(e) => setCartDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-28 text-right px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Customer Paid Input with iPhone Numeric Keypad */}
            <div className="pt-2 pb-1 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Tiền khách đưa (VNĐ)
              </label>
              <input
                type="number"
                inputMode="numeric"
                step="1000"
                placeholder={String(finalAmount)}
                value={customerPaid}
                onChange={(e) => setCustomerPaid(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl font-black text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* Quick money chips (Easy touch targets on iPhone) */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickCash('exact')}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-colors active:scale-95"
                >
                  Đủ tiền
                </button>
                {[50000, 100000, 200000, 500000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickCash(val)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors active:scale-95"
                  >
                    {val / 1000}k
                  </button>
                ))}
              </div>
            </div>

            {/* Change / Deficit Display */}
            <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              {deficit > 0 ? (
                <div className="flex items-center justify-between text-rose-600 font-bold text-sm">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Khách còn thiếu:
                  </span>
                  <span className="font-mono text-base">{formatMoney(deficit)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-emerald-800 font-bold text-sm">
                  <span>Tiền thừa trả khách:</span>
                  <span className="text-lg font-black font-mono">{formatMoney(change)}</span>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Hình thức thanh toán
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Tiền mặt
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    paymentMethod === 'transfer'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  Chuyển khoản QR
                </button>
              </div>
            </div>
          </div>

          {/* Complete checkout button */}
          <div className="pt-2">
            {!isOnline ? (
              <div className="w-full py-3.5 px-4 bg-slate-200 text-slate-500 rounded-2xl font-bold text-center text-sm flex items-center justify-center gap-2">
                <WifiOff className="w-4 h-4" />
                <span>Không có mạng - Tạm khóa thanh toán</span>
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-base sm:text-lg transition-all shadow-lg shadow-emerald-700/25 active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{submitting ? 'Đang thanh toán...' : `HOÀN TẤT BÁN HÀNG`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
