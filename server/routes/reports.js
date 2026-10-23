const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Helper to get date strings in local time
function getDateRange(period, fromDate, toDate) {
  const today = new Date();
  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (period === 'today') {
    const str = format(today);
    return { start: str, end: str };
  } else if (period === 'yesterday') {
    const yday = new Date(today);
    yday.setDate(today.getDate() - 1);
    const str = format(yday);
    return { start: str, end: str };
  } else if (period === '7days') {
    const past = new Date(today);
    past.setDate(today.getDate() - 6);
    return { start: format(past), end: format(today) };
  } else if (period === 'this_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: format(firstDay), end: format(today) };
  } else if (period === 'custom') {
    return {
      start: fromDate || format(today),
      end: toDate || format(today)
    };
  }

  // Default to today
  const str = format(today);
  return { start: str, end: str };
}

// Overview revenue & profit reports
router.get('/', (req, res) => {
  try {
    const { period = 'today', from_date, to_date } = req.query;
    const range = getDateRange(period, from_date, to_date);

    // 1. Sales revenue, total invoices, discount
    const salesSummary = db.prepare(`
      SELECT 
        COUNT(id) as total_invoices,
        COALESCE(SUM(total_items), 0) as total_items_sold,
        COALESCE(SUM(subtotal_amount), 0) as total_subtotal,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(final_amount), 0) as total_revenue
      FROM sales_receipts
      WHERE status = 'completed'
        AND date(created_at) >= date(?)
        AND date(created_at) <= date(?)
    `).get(range.start, range.end);

    // 2. COGS (Cost of goods sold) from sales receipt items
    const cogsSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(sri.base_quantity * sri.cost_price), 0) as total_cogs
      FROM sales_receipt_items sri
      JOIN sales_receipts sr ON sr.id = sri.receipt_id
      WHERE sr.status = 'completed'
        AND date(sr.created_at) >= date(?)
        AND date(sr.created_at) <= date(?)
    `).get(range.start, range.end);

    const totalRevenue = salesSummary.total_revenue || 0;
    const totalCogs = cogsSummary.total_cogs || 0;
    const grossProfit = totalRevenue - totalCogs;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

    // 3. Current inventory valuation & stock alerts
    const inventorySummary = db.prepare(`
      SELECT 
        COUNT(id) as total_active_products,
        COALESCE(SUM(current_stock * cost_price), 0) as total_inventory_value,
        COALESCE(SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count,
        COALESCE(SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock THEN 1 ELSE 0 END), 0) as low_stock_count
      FROM products
      WHERE is_active = 1
    `).get();

    // 4. Daily sales breakdown within the range
    const dailyBreakdown = db.prepare(`
      SELECT 
        date(created_at) as sale_date,
        COUNT(id) as invoice_count,
        COALESCE(SUM(final_amount), 0) as daily_revenue
      FROM sales_receipts
      WHERE status = 'completed'
        AND date(created_at) >= date(?)
        AND date(created_at) <= date(?)
      GROUP BY date(created_at)
      ORDER BY sale_date ASC
    `).all(range.start, range.end);

    // 5. Top 10 best-selling products
    const topProducts = db.prepare(`
      SELECT 
        sri.product_id,
        sri.product_name,
        sri.product_code,
        p.image_url,
        p.base_unit,
        COALESCE(SUM(sri.base_quantity), 0) as total_quantity_sold,
        COALESCE(SUM(sri.subtotal), 0) as total_sales_amount,
        COALESCE(SUM(sri.subtotal - (sri.base_quantity * sri.cost_price)), 0) as product_profit
      FROM sales_receipt_items sri
      JOIN sales_receipts sr ON sr.id = sri.receipt_id
      LEFT JOIN products p ON p.id = sri.product_id
      WHERE sr.status = 'completed'
        AND date(sr.created_at) >= date(?)
        AND date(sr.created_at) <= date(?)
      GROUP BY sri.product_id
      ORDER BY total_sales_amount DESC
      LIMIT 10
    `).all(range.start, range.end);

    // 6. Slow-selling products (active products with 0 or minimal sales in this period)
    const slowProducts = db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.code,
        p.current_stock,
        p.base_unit,
        p.selling_price,
        COALESCE(sales.sold_qty, 0) as sold_quantity
      FROM products p
      LEFT JOIN (
        SELECT sri.product_id, SUM(sri.base_quantity) as sold_qty
        FROM sales_receipt_items sri
        JOIN sales_receipts sr ON sr.id = sri.receipt_id
        WHERE sr.status = 'completed'
          AND date(sr.created_at) >= date(?)
          AND date(sr.created_at) <= date(?)
        GROUP BY sri.product_id
      ) sales ON sales.product_id = p.id
      WHERE p.is_active = 1
      ORDER BY sold_quantity ASC, p.current_stock DESC
      LIMIT 10
    `).all(range.start, range.end);

    res.json({
      success: true,
      period,
      range,
      summary: {
        total_revenue: totalRevenue,
        total_invoices: salesSummary.total_invoices || 0,
        total_items_sold: salesSummary.total_items_sold || 0,
        total_discount: salesSummary.total_discount || 0,
        total_cogs: totalCogs,
        gross_profit: grossProfit,
        profit_margin_percent: Number(profitMargin),
        total_inventory_value: inventorySummary.total_inventory_value || 0,
        total_active_products: inventorySummary.total_active_products || 0,
        low_stock_count: inventorySummary.low_stock_count || 0,
        out_of_stock_count: inventorySummary.out_of_stock_count || 0
      },
      daily_breakdown: dailyBreakdown,
      top_products: topProducts,
      slow_products: slowProducts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
