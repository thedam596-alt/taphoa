import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, formatMoney, formatDate } from '../api';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Package,
  Printer,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function ReportsView() {
  const [period, setPeriod] = useState('today'); // 'today' | 'yesterday' | '7days' | 'this_month' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/reports?period=${period}`;
      if (period === 'custom') {
        if (fromDate) url += `&from_date=${fromDate}`;
        if (toDate) url += `&to_date=${toDate}`;
      }

      const res = await apiRequest(url);
      setReportData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period, fromDate, toDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const summary = reportData?.summary || {
    total_revenue: 0,
    total_invoices: 0,
    total_items_sold: 0,
    total_cogs: 0,
    gross_profit: 0,
    profit_margin_percent: 0,
    total_inventory_value: 0
  };

  const topProducts = reportData?.top_products || [];
  const slowProducts = reportData?.slow_products || [];
  const dailyBreakdown = reportData?.daily_breakdown || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Báo cáo doanh thu & Lợi nhuận
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Thống kê doanh số bán buôn, tính giá vốn hàng bán (COGS) và ước tính lợi nhuận gộp thực tế.
          </p>
        </div>

        {/* Time period selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'yesterday', label: 'Hôm qua' },
            { id: '7days', label: '7 ngày qua' },
            { id: 'this_month', label: 'Tháng này' },
            { id: 'custom', label: 'Tùy chọn' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.id ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {period === 'custom' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">Từ ngày:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          />
          <span className="text-xs font-semibold text-slate-600">Đến ngày:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          />
          <button
            onClick={fetchReports}
            className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
          >
            Xem báo cáo
          </button>
        </div>
      )}

      {/* Financial KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Doanh thu bán hàng
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatMoney(summary.total_revenue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary.total_invoices} hóa đơn ({summary.total_items_sold} món hàng)
          </div>
        </div>

        {/* COGS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Giá vốn hàng bán (COGS)
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-700 mt-1">
            {formatMoney(summary.total_cogs)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Chi phí nhập hàng đã bán</div>
        </div>

        {/* Gross Profit */}
        <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
            Lợi nhuận gộp ước tính
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
            {formatMoney(summary.gross_profit)}
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            Tỷ suất lãi: {summary.profit_margin_percent}%
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Giá trị kho hiện tại
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatMoney(summary.total_inventory_value)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Theo giá vốn</div>
        </div>
      </div>

      {/* Top Sellers & Slow Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Best-Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Sản phẩm bán chạy nhất
            </h3>
            <span className="text-xs text-slate-400 font-medium">Theo doanh thu</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Chưa có dữ liệu bán hàng trong kỳ này.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{p.product_name}</div>
                      <div className="text-slate-500">
                        Đã bán: <span className="font-semibold text-slate-800">{p.total_quantity_sold} {p.base_unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-800">{formatMoney(p.total_sales_amount)}</div>
                    <div className="text-[11px] text-emerald-600">Lãi: +{formatMoney(p.product_profit)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slow-Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400" />
              Mặt hàng bán chậm / Tồn nhiều
            </h3>
            <span className="text-xs text-slate-400 font-medium">Doanh số ít</span>
          </div>

          {slowProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Không có dữ liệu mặt hàng.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {slowProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-slate-500">
                      Tồn kho hiện tại: <span className="font-bold text-slate-700">{p.current_stock} {p.base_unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Đã bán: {p.sold_quantity} {p.base_unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      {dailyBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Doanh thu chi tiết theo ngày</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Ngày</th>
                  <th className="py-2.5 px-4 text-center">Số hóa đơn</th>
                  <th className="py-2.5 px-4 text-right">Doanh thu trong ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyBreakdown.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{formatDate(row.sale_date)}</td>
                    <td className="py-2.5 px-4 text-center font-semibold text-slate-700">{row.invoice_count}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-800 font-mono">
                      {formatMoney(row.daily_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
