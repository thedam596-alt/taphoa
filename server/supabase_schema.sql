-- ====================================================================
-- TẠP HÓA MAI CUA - SUPABASE CLOUD DATABASE SCHEMA
-- Hỗ trợ đồng bộ thời gian thực (Realtime Sync) giữa Máy tính & iPhone
-- ====================================================================

-- 1. Bảng cài đặt cửa hàng
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng danh mục hàng hóa
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng nhà cung cấp
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng sản phẩm
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  image_url TEXT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  base_unit TEXT NOT NULL DEFAULT 'cái',
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12, 3) NOT NULL DEFAULT 5,
  default_supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  notes TEXT,
  is_active SMALLINT NOT NULL DEFAULT 1,
  is_featured SMALLINT NOT NULL DEFAULT 0,
  featured_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng đơn vị tính quy đổi
CREATE TABLE IF NOT EXISTS product_units (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  conversion_factor NUMERIC(12, 4) NOT NULL DEFAULT 1,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  barcode TEXT,
  is_base SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bảng hóa đơn bán hàng
CREATE TABLE IF NOT EXISTS sales_receipts (
  id BIGSERIAL PRIMARY KEY,
  receipt_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_items NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  customer_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ
);

-- 7. Bảng chi tiết hóa đơn
CREATE TABLE IF NOT EXISTS sales_receipt_items (
  id BIGSERIAL PRIMARY KEY,
  receipt_id BIGINT NOT NULL REFERENCES sales_receipts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_code TEXT,
  unit_name TEXT NOT NULL,
  conversion_factor NUMERIC(12, 4) NOT NULL DEFAULT 1,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  base_quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- 8. Bảng phiếu nhập hàng
CREATE TABLE IF NOT EXISTS purchase_receipts (
  id BIGSERIAL PRIMARY KEY,
  receipt_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  debt_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ
);

-- 9. Bảng chi tiết phiếu nhập
CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id BIGSERIAL PRIMARY KEY,
  receipt_id BIGINT NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  conversion_factor NUMERIC(12, 4) NOT NULL DEFAULT 1,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  base_quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- 10. Bảng thẻ kho (Lịch sử biến động)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  transaction_type TEXT NOT NULL,
  reference_id BIGINT,
  reference_code TEXT,
  quantity_change NUMERIC(12, 3) NOT NULL,
  stock_before NUMERIC(12, 3) NOT NULL,
  stock_after NUMERIC(12, 3) NOT NULL,
  unit_cost NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Bảng kiểm kê điều chỉnh kho
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id BIGSERIAL PRIMARY KEY,
  adjustment_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  product_id BIGINT NOT NULL REFERENCES products(id),
  old_stock NUMERIC(12, 3) NOT NULL,
  new_stock NUMERIC(12, 3) NOT NULL,
  difference NUMERIC(12, 3) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT
);

-- Chỉ mục tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_product_units_barcode ON product_units(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_receipts_date ON sales_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_inv_prod ON inventory_transactions(product_id);

-- Kích hoạt Realtime Replication cho Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_transactions;

-- Cài đặt mặc định ban đầu
INSERT INTO store_settings (key, value) VALUES
  ('store_name', 'TẠP HÓA MAI CUA'),
  ('store_phone', ''),
  ('store_address', ''),
  ('store_logo', ''),
  ('strict_stock', 'true'),
  ('default_min_stock', '5'),
  ('cost_method', 'latest'),
  ('receipt_footer', 'Cảm ơn Quý khách! Hẹn gặp lại!')
ON CONFLICT (key) DO NOTHING;
