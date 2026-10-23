import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatMoney, formatDateTime } from '../api';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Eye,
  Calendar,
  AlertCircle,
  X
} from 'lucide-react';

export default function SalesHistoryView() {
  const { setActiveReceiptModal, showToast } = useStore();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/pos/receipts?';
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;
      if (fromDate) url += `from_date=${fromDate}&`;
      if (toDate) url += `to_date=${toDate}&`;
      if (statusFilter) url += `status=${statusFilter}&`;

      const res = await apiRequest(url);
      setReceipts(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Lỗi tải lịch sử bán hàng', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, fromDate, toDate, statusFilter, showToast]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Open receipt for printing or preview
  async function handleViewReceipt(receipt) {
    try {
      const res = await apiRequest(`/pos/receipts/${receipt.id}`);
      setActiveReceiptModal(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Cancel / Refund invoice
  async function handleCancelReceipt(receipt) {
    const reason = window.prompt(
      `Nhập lý do hoàn trả / hủy hóa đơn ${receipt.receipt_code}:`,
      'Khách đổi ý trả lại hàng'
    );
    if (!reason) return;

    try {
      const res = await apiRequest(`/pos/receipts/${receipt.id}/cancel`, 'POST', { reason });
      showToast(res.message, 'success');
      fetchReceipts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Lịch sử bán hàng
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Tra cứu toàn bộ hóa đơn đã bán, in lại hóa đơn và xử lý hoàn trả hàng.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã hóa đơn (HD...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {/* From Date */}
        <div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* To Date */}
        <div>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="completed">Đã hoàn tất</option>
          <option value="cancelled">Đã hủy / Hoàn trả</option>
        </select>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Đang tải lịch sử hóa đơn...</div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Không tìm thấy hóa đơn nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã hóa đơn</th>
                  <th className="py-3 px-3">Thời gian</th>
                  <th className="py-3 px-3 text-center">Số món</th>
                  <th className="py-3 px-3 text-right">Tổng tiền</th>
                  <th className="py-3 px-3 text-right">Khách trả</th>
                  <th className="py-3 px-3 text-right">Tiền thừa</th>
                  <th className="py-3 px-3 text-center">Thanh toán</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.receipt_code}</td>
                    <td className="py-3 px-3 text-slate-500 text-xs font-mono">{formatDateTime(r.created_at)}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{r.total_items}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-800 font-mono">
                      {formatMoney(r.final_amount)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 font-mono">{formatMoney(r.customer_paid)}</td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono">{formatMoney(r.change_amount)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-medium text-slate-600">
                        {r.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                      </span>
                    </td>
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
                          onClick={() => handleViewReceipt(r)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Xem & In lại hóa đơn"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {r.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelReceipt(r)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hoàn trả đơn hàng (phục hồi tồn kho)"
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
    </div>
  );
}
