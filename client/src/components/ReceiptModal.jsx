import React from 'react';
import { useStore } from '../context/StoreContext';
import { formatMoney, formatDateTime } from '../api';
import { Printer, X, CheckCircle2, RotateCcw } from 'lucide-react';

export default function ReceiptModal() {
  const { activeReceiptModal, setActiveReceiptModal, settings, clearCart, navigateTo } = useStore();

  if (!activeReceiptModal) return null;

  const receipt = activeReceiptModal;

  function handlePrint() {
    window.print();
  }

  function handleCloseAndNewSale() {
    setActiveReceiptModal(null);
    clearCart();
    navigateTo('pos');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in no-print-bg">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top actions bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Hóa đơn #{receipt.receipt_code}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              In hóa đơn
            </button>
            <button
              onClick={() => setActiveReceiptModal(null)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[340px] bg-white p-5 rounded-lg shadow-sm border border-slate-200 text-slate-900 font-mono text-xs leading-relaxed"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              {settings.store_logo && (
                <img
                  src={settings.store_logo}
                  alt="Logo"
                  className="w-12 h-12 object-contain mx-auto mb-1.5 rounded-full"
                />
              )}
              <h2 className="font-bold text-base uppercase text-slate-900 tracking-wider">
                {settings.store_name || 'TẠP HÓA MAI CUA'}
              </h2>
              {settings.store_address && (
                <p className="text-[11px] text-slate-600 mt-0.5">{settings.store_address}</p>
              )}
              {settings.store_phone && (
                <p className="text-[11px] text-slate-600">SĐT: {settings.store_phone}</p>
              )}
              <div className="mt-2 text-[11px] font-semibold text-slate-700 uppercase">
                HÓA ĐƠN BÁN HÀNG
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Số HĐ:</span>
                <span className="font-bold text-slate-800">{receipt.receipt_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời gian:</span>
                <span>{formatDateTime(receipt.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thanh toán:</span>
                <span>{receipt.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span>
              </div>
            </div>

            {/* Items List */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 font-bold text-[10px] text-slate-500 uppercase pb-1.5 border-b border-slate-200">
                <span className="col-span-6">Tên hàng</span>
                <span className="col-span-2 text-center">SL</span>
                <span className="col-span-4 text-right">T.Tiền</span>
              </div>
              <div className="divide-y divide-slate-100">
                {(receipt.items || []).map((item, idx) => (
                  <div key={idx} className="py-1.5 text-[11px]">
                    <div className="font-semibold text-slate-800">{item.product_name}</div>
                    <div className="grid grid-cols-12 text-slate-600 text-[10px] mt-0.5">
                      <span className="col-span-6 text-slate-500">
                        {item.quantity} {item.unit_name} × {formatMoney(item.unit_price)}
                      </span>
                      <span className="col-span-2 text-center font-medium">{item.quantity}</span>
                      <span className="col-span-4 text-right font-bold text-slate-800">
                        {formatMoney(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 space-y-1 text-xs border-b border-dashed border-slate-300">
              <div className="flex justify-between text-slate-600">
                <span>Tổng tiền hàng:</span>
                <span>{formatMoney(receipt.subtotal_amount)}</span>
              </div>
              {receipt.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Giảm giá:</span>
                  <span>-{formatMoney(receipt.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>KHÁCH PHẢI TRẢ:</span>
                <span className="text-emerald-700">{formatMoney(receipt.final_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-0.5">
                <span>Tiền khách đưa:</span>
                <span>{formatMoney(receipt.customer_paid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Tiền thừa trả khách:</span>
                <span>{formatMoney(receipt.change_amount)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 text-center text-[11px] text-slate-600">
              <p className="font-medium italic">{settings.receipt_footer || 'Cảm ơn Quý khách! Hẹn gặp lại!'}</p>
              <p className="text-[10px] text-slate-400 mt-1">Phần mềm quản lý TẠP HÓA MAI CUA</p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-2.5 no-print">
          <button
            onClick={handleCloseAndNewSale}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Tạo đơn hàng mới
          </button>
          <button
            onClick={() => setActiveReceiptModal(null)}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
