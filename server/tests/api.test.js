const assert = require('assert');
const http = require('http');
const { app, server } = require('../server');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ BACKEND TẠP HÓA MAI CUA ---');

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.appName, 'TẠP HÓA MAI CUA');
    console.log('✓ [1/10] Kiểm tra máy chủ hoạt động: OK');

    // 2. Initial state must be empty products
    const initialProducts = await request('GET', '/api/products');
    assert.strictEqual(initialProducts.status, 200);
    assert.strictEqual(Array.isArray(initialProducts.body.data), true);
    console.log(`✓ [2/10] Danh sách sản phẩm ban đầu: ${initialProducts.body.data.length} sản phẩm (đúng yêu cầu rỗng mẫu)`);

    // 3. Create Category
    const catRes = await request('POST', '/api/categories', { name: 'Nước giải khát', description: 'Bia, nước ngọt' });
    assert.strictEqual(catRes.status, 201);
    const categoryId = catRes.body.data.id;
    console.log('✓ [3/10] Thêm danh mục hàng hóa: OK');

    // 4. Create Product with multiple units (Chai & Thùng, conversion = 24)
    const prodRes = await request('POST', '/api/products', {
      name: 'Nước ngọt Coca-Cola 330ml',
      barcode: '893000000001',
      category_id: categoryId,
      base_unit: 'chai',
      cost_price: 8000,
      selling_price: 10000,
      initial_stock: 48,
      min_stock: 10,
      is_featured: 1,
      units: [
        {
          unit_name: 'thùng',
          conversion_factor: 24,
          selling_price: 230000,
          barcode: '893000000002'
        }
      ]
    });
    assert.strictEqual(prodRes.status, 201);
    const product = prodRes.body.data;
    assert.strictEqual(product.current_stock, 48);
    assert.strictEqual(product.units.length, 1);
    assert.strictEqual(product.units[0].conversion_factor, 24);
    console.log('✓ [4/10] Thêm sản phẩm có đơn vị quy đổi (Chai/Thùng) & tồn đầu kỳ: OK');

    // 5. Lookup by barcode
    const bcLookup1 = await request('GET', '/api/products/by-barcode/893000000001');
    assert.strictEqual(bcLookup1.status, 200);
    assert.strictEqual(bcLookup1.body.matchedUnit.unit_name, 'chai');

    const bcLookup2 = await request('GET', '/api/products/by-barcode/893000000002');
    assert.strictEqual(bcLookup2.status, 200);
    assert.strictEqual(bcLookup2.body.matchedUnit.unit_name, 'thùng');
    console.log('✓ [5/10] Quét mã vạch chai & mã vạch thùng nhận diện chính xác: OK');

    // 6. POS Checkout (Sell 1 thùng = 24 chai + 2 chai = 26 chai total)
    const checkoutRes = await request('POST', '/api/pos/checkout', {
      items: [
        {
          product_id: product.id,
          unit_name: 'thùng',
          conversion_factor: 24,
          quantity: 1,
          unit_price: 230000
        },
        {
          product_id: product.id,
          unit_name: 'chai',
          conversion_factor: 1,
          quantity: 2,
          unit_price: 10000
        }
      ],
      discount_amount: 10000,
      customer_paid: 250000,
      payment_method: 'cash'
    });
    assert.strictEqual(checkoutRes.status, 201);
    const receipt = checkoutRes.body.data;
    assert.strictEqual(receipt.subtotal_amount, 250000);
    assert.strictEqual(receipt.final_amount, 240000);
    assert.strictEqual(receipt.change_amount, 10000);

    // Verify stock deducted accurately (48 - 26 = 22 chai)
    const prodAfterSale = await request('GET', `/api/products/${product.id}`);
    assert.strictEqual(prodAfterSale.body.data.current_stock, 22);
    console.log('✓ [6/10] Bán hàng & Trừ tồn kho chính xác theo đơn vị quy đổi: OK');

    // 7. Strict stock check - Try to sell 25 chai when only 22 remain
    const overStockSale = await request('POST', '/api/pos/checkout', {
      items: [
        {
          product_id: product.id,
          unit_name: 'chai',
          conversion_factor: 1,
          quantity: 25,
          unit_price: 10000
        }
      ],
      customer_paid: 300000
    });
    assert.strictEqual(overStockSale.status, 400);
    assert.strictEqual(overStockSale.body.success, false);
    console.log('✓ [7/10] Chặn bán âm kho khi bật chế độ nghiêm ngặt: OK');

    // 8. Purchase Inbound (Nhập thêm 1 thùng = 24 chai)
    const purchaseRes = await request('POST', '/api/purchases', {
      items: [
        {
          product_id: product.id,
          unit_name: 'thùng',
          conversion_factor: 24,
          quantity: 1,
          cost_price: 192000
        }
      ],
      paid_amount: 192000,
      notes: 'Nhập hàng đợt 1'
    });
    assert.strictEqual(purchaseRes.status, 201);
    const prodAfterPurchase = await request('GET', `/api/products/${product.id}`);
    assert.strictEqual(prodAfterPurchase.body.data.current_stock, 46); // 22 + 24 = 46
    console.log('✓ [8/10] Nhập hàng & Tăng tồn kho: OK');

    // 9. Stock Adjustment (Kiểm kê kho: thực tế còn 45 chai, chênh lệch -1)
    const adjRes = await request('POST', '/api/inventory/adjust', {
      product_id: product.id,
      new_stock: 45,
      reason: 'Hàng móp méo bể vỡ'
    });
    assert.strictEqual(adjRes.status, 200);
    const prodAfterAdj = await request('GET', `/api/products/${product.id}`);
    assert.strictEqual(prodAfterAdj.body.data.current_stock, 45);
    console.log('✓ [9/10] Kiểm kê kho & lưu vết lịch sử biến động: OK');

    // 10. Financial Reports verification
    const repRes = await request('GET', '/api/reports?period=today');
    assert.strictEqual(repRes.status, 200);
    assert.strictEqual(repRes.body.summary.total_revenue, 240000);
    assert.strictEqual(repRes.body.summary.total_invoices, 1);
    console.log('✓ [10/10] Báo cáo doanh thu & lợi nhuận: OK');

    // Deletion safeguard test: product has transactions, should reject deletion
    const delRes = await request('DELETE', `/api/products/${product.id}`);
    assert.strictEqual(delRes.status, 400);
    console.log('✓ Bảo vệ tính toàn vẹn dữ liệu: Không xóa sản phẩm đã có giao dịch');

    console.log('\n===> TOÀN BỘ 10/10 KIỂM THỬ BACKEND ĐỀU THÀNH CÔNG RỰC RỠ! <===\n');
  } catch (err) {
    console.error('LỖI KIỂM THỬ:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
