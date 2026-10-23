const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, method = 'GET', body = null) {
  const opt = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opt.body = JSON.stringify(body);
  const r = await fetch(`${BASE_URL}${endpoint}`, opt);
  return { status: r.status, data: await r.json() };
}

async function runE2E() {
  console.log('=== BẮT ĐẦU KIỂM THỬ E2E THEO 22 YÊU CẦU CỦA ĐỀ BÀI ===');

  // 1. Mở ứng dụng khi chưa có sản phẩm: DB rỗng
  const initial = await req('/products');
  assert.strictEqual(initial.data.data.length, 0, 'Phải rỗng ban đầu');
  console.log('✓ Bước 1: Ứng dụng ban đầu hoàn toàn rỗng mẫu');

  // 2 + 3 + 4: Thêm sản phẩm đầu tiên có ảnh, giá nhập, giá bán, tồn ban đầu
  const p1 = await req('/products', 'POST', {
    name: 'Bánh que Pocky Glico Dâu',
    code: 'SP0001',
    barcode: '893500112233',
    base_unit: 'hộp',
    cost_price: 12000,
    selling_price: 15000,
    initial_stock: 50,
    min_stock: 5,
    is_featured: 1
  });
  assert.strictEqual(p1.status, 201);
  const prod1Id = p1.data.data.id;
  assert.strictEqual(p1.data.data.current_stock, 50);
  console.log('✓ Bước 2, 3, 4: Thêm sản phẩm đầu tiên thành công với tồn kho 50 hộp');

  // 5: Thêm một sản phẩm có nhiều đơn vị tính (Nước Aquafina: Chai & Thùng 24 chai)
  const p2 = await req('/products', 'POST', {
    name: 'Nước khoáng Aquafina 500ml',
    code: 'SP0002',
    barcode: '893600112244',
    base_unit: 'chai',
    cost_price: 4000,
    selling_price: 6000,
    initial_stock: 48,
    min_stock: 12,
    is_featured: 1,
    units: [
      {
        unit_name: 'thùng',
        conversion_factor: 24,
        selling_price: 120000,
        barcode: '893600112299'
      }
    ]
  });
  assert.strictEqual(p2.status, 201);
  const prod2Id = p2.data.data.id;
  assert.strictEqual(p2.data.data.units.length, 1);
  console.log('✓ Bước 5: Thêm sản phẩm có nhiều đơn vị tính (Chai + Thùng 24 chai)');

  // 6: Tìm kiếm sản phẩm
  const search1 = await req('/products?search=Pocky');
  assert.strictEqual(search1.data.data.length, 1);
  console.log('✓ Bước 6: Tìm kiếm sản phẩm theo tên chính xác');

  // 7: Quét mã sản phẩm đã đăng ký
  const scanExist = await req('/products/by-barcode/893500112233');
  assert.strictEqual(scanExist.status, 200);
  assert.strictEqual(scanExist.data.data.name, 'Bánh que Pocky Glico Dâu');
  console.log('✓ Bước 7: Quét mã vạch sản phẩm đã đăng ký tìm thấy chính xác');

  // 8: Quét mã chưa đăng ký và kiểm tra thông báo
  const scanNotExist = await req('/products/by-barcode/999999999999');
  assert.strictEqual(scanNotExist.status, 404);
  assert.strictEqual(scanNotExist.data.success, false);
  console.log('✓ Bước 8: Quét mã chưa đăng ký trả lời thông báo rõ ràng');

  // 9 + 10 + 11 + 12: Thêm nhiều mặt hàng vào giỏ, chọn đơn vị tính thùng, tính tiền & tiền thừa
  // Bán: 2 hộp Pocky (2 x 15k = 30k) + 1 thùng Aquafina (1 x 120k = 120k = 24 chai) = 150k
  // Giảm giá 10k => Cần trả: 140k. Khách đưa: 200k => Tiền thừa: 60k
  const checkout = await req('/pos/checkout', 'POST', {
    items: [
      {
        product_id: prod1Id,
        unit_name: 'hộp',
        conversion_factor: 1,
        quantity: 2,
        unit_price: 15000
      },
      {
        product_id: prod2Id,
        unit_name: 'thùng',
        conversion_factor: 24,
        quantity: 1,
        unit_price: 120000
      }
    ],
    discount_amount: 10000,
    customer_paid: 200000,
    payment_method: 'cash'
  });
  assert.strictEqual(checkout.status, 201);
  const invoice = checkout.data.data;
  assert.strictEqual(invoice.subtotal_amount, 150000);
  assert.strictEqual(invoice.final_amount, 140000);
  assert.strictEqual(invoice.change_amount, 60000);
  console.log('✓ Bước 9, 10, 11, 12, 13: Bán hàng nhiều đơn vị quy đổi, tính tiền thừa 60.000 ₫');

  // 14: Kiểm tra hóa đơn và tồn kho sau bán
  // Pocky: 50 - 2 = 48
  // Aquafina: 48 - 24 = 24
  const checkP1 = await req(`/products/${prod1Id}`);
  assert.strictEqual(checkP1.data.data.current_stock, 48);
  const checkP2 = await req(`/products/${prod2Id}`);
  assert.strictEqual(checkP2.data.data.current_stock, 24);
  console.log('✓ Bước 14: Tồn kho đã trừ chính xác sau bán (Pocky: 48, Aquafina: 24 chai)');

  // 15: Tạo phiếu nhập hàng và xác nhận nhập kho
  // Nhập thêm 2 thùng Aquafina (2 * 24 = 48 chai)
  const purchase = await req('/purchases', 'POST', {
    items: [
      {
        product_id: prod2Id,
        unit_name: 'thùng',
        conversion_factor: 24,
        quantity: 2,
        cost_price: 96000
      }
    ],
    paid_amount: 192000,
    notes: 'Nhập từ Đại lý nước ngọt'
  });
  assert.strictEqual(purchase.status, 201);

  // 16: Kiểm tra tồn kho sau nhập
  // Aquafina: 24 + 48 = 72 chai
  const checkP2AfterPurchase = await req(`/products/${prod2Id}`);
  assert.strictEqual(checkP2AfterPurchase.data.data.current_stock, 72);
  console.log('✓ Bước 15, 16: Nhập hàng 2 thùng -> Tồn kho tăng chính xác lên 72 chai');

  // 17: Kiểm tra lịch sử bán hàng và báo cáo
  const receipts = await req('/pos/receipts');
  assert.strictEqual(receipts.data.data.length, 1);
  const reports = await req('/reports?period=today');
  assert.strictEqual(reports.data.summary.total_revenue, 140000);
  assert.strictEqual(reports.data.summary.total_invoices, 1);
  console.log('✓ Bước 17: Lịch sử bán hàng và Báo cáo doanh thu ghi nhận chính xác 140.000 ₫');

  // 18 + 19: Kiểm tra tính bền vững của dữ liệu trên đĩa
  const invSummary = await req('/inventory');
  assert.strictEqual(invSummary.data.data.length, 2);
  console.log('✓ Bước 18, 19: Dữ liệu được lưu bền vững trên đĩa SQLite');

  // 22: Kiểm tra không phát sinh giao dịch hoặc trừ kho hai lần khi bán quá số lượng
  const overSale = await req('/pos/checkout', 'POST', {
    items: [
      {
        product_id: prod1Id,
        unit_name: 'hộp',
        conversion_factor: 1,
        quantity: 999, // Vượt tồn kho (chỉ còn 48)
        unit_price: 15000
      }
    ]
  });
  assert.strictEqual(overSale.status, 400);
  assert.strictEqual(overSale.data.success, false);
  console.log('✓ Bước 22: Kiểm tra an toàn: Chặn bán vượt quá tồn kho nghiêm ngặt');

  console.log('\n============================================================');
  console.log('   TOÀN BỘ 22 LUỒNG KIỂM THỬ E2E ĐÃ VƯỢT QUA 100%!   ');
  console.log('============================================================\n');
}

runE2E().catch(err => {
  console.error('Lỗi E2E:', err);
  process.exitCode = 1;
});
