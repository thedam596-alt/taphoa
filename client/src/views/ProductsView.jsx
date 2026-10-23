import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatMoney } from '../api';
import {
  Package,
  PlusCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  Star,
  Power,
  AlertCircle,
  Eye,
  Warehouse,
  Barcode
} from 'lucide-react';

export default function ProductsView() {
  const { navigateTo, showToast } = useStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSort, setSelectedSort] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/products?';
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;
      if (selectedCategory) url += `category_id=${selectedCategory}&`;
      if (selectedStatus !== '') url += `is_active=${selectedStatus}&`;
      if (selectedSort) url += `sort=${selectedSort}&`;

      const res = await apiRequest(url);
      setProducts(res.data || []);

      const catRes = await apiRequest('/categories');
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
      showToast('Không thể tải danh sách sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedStatus, selectedSort, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Toggle active status
  async function handleToggleActive(p) {
    try {
      const res = await apiRequest(`/products/${p.id}/toggle-active`, 'PUT');
      showToast(res.message, 'success');
      fetchProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Toggle featured status
  async function handleToggleFeatured(p) {
    try {
      const res = await apiRequest(`/products/${p.id}/toggle-featured`, 'PUT');
      showToast(res.message, 'success');
      fetchProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Delete product
  async function handleDeleteProduct(p) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${p.name}"?`)) {
      return;
    }

    try {
      const res = await apiRequest(`/products/${p.id}`, 'DELETE');
      showToast(res.message, 'success');
      fetchProducts();
    } catch (err) {
      showToast(err.message, 'error', 5000);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tất cả sản phẩm
          </h2>
          <p className="text-sm text-slate-500">
            Quản lý thông tin hàng hóa, đơn vị tính quy đổi, giá bán và trạng thái.
          </p>
        </div>

        <button
          onClick={() => navigateTo('product_add')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-emerald-700/20 shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Thêm sản phẩm mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã SKU, mã vạch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="1">Đang kinh doanh</option>
          <option value="0">Ngừng kinh doanh</option>
        </select>

        {/* Sort selector */}
        <select
          value={selectedSort}
          onChange={(e) => setSelectedSort(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Sắp xếp: Mới nhất</option>
          <option value="name_asc">Tên (A-Z)</option>
          <option value="name_desc">Tên (Z-A)</option>
          <option value="price_asc">Giá bán (Thấp đến cao)</option>
          <option value="price_desc">Giá bán (Cao đến thấp)</option>
          <option value="stock_asc">Tồn kho (Thấp đến cao)</option>
          <option value="stock_desc">Tồn kho (Cao đến thấp)</option>
        </select>
      </div>

      {/* Products Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Đang tải dữ liệu sản phẩm...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchTerm || selectedCategory
                ? 'Không tìm thấy sản phẩm phù hợp với bộ lọc'
                : 'Chưa có sản phẩm nào. Hãy thêm sản phẩm đầu tiên để bắt đầu bán hàng.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Cửa hàng hoàn toàn sạch sẽ, không có dữ liệu mẫu. Bạn có thể tự thêm toàn bộ mặt hàng của mình.
            </p>
            <button
              onClick={() => navigateTo('product_add')}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              + Thêm sản phẩm mới
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Sản phẩm</th>
                  <th className="py-3 px-3">Mã hàng / Vạch</th>
                  <th className="py-3 px-3">Danh mục</th>
                  <th className="py-3 px-3 text-right">Giá nhập</th>
                  <th className="py-3 px-3 text-right">Giá bán</th>
                  <th className="py-3 px-3 text-center">Tồn kho</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => {
                  const isLow = p.current_stock > 0 && p.current_stock <= p.min_stock;
                  const isOut = p.current_stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-11 h-11 object-cover rounded-xl border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.is_featured === 1 && (
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" title="Ghim bán chạy" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Đơn vị: <span className="font-semibold text-slate-700">{p.base_unit}</span>
                              {p.units && p.units.length > 0 && (
                                <span className="ml-1.5 text-emerald-700">
                                  (+{p.units.length} đơn vị phụ: {p.units.map(u => u.unit_name).join(', ')})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Code / Barcode */}
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        <div className="font-bold text-slate-800">{p.code}</div>
                        {p.barcode && <div className="text-slate-400">{p.barcode}</div>}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {p.category_name || 'Chưa phân loại'}
                        </span>
                      </td>

                      {/* Cost price */}
                      <td className="py-3 px-3 text-right text-slate-500 font-mono text-xs">
                        {formatMoney(p.cost_price)}
                      </td>

                      {/* Selling price */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-700 font-mono">
                        {formatMoney(p.selling_price)}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.current_stock} {p.base_unit}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            p.is_active === 1
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.is_active === 1 ? 'Đang bán' : 'Ngừng bán'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle Featured */}
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(p)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.is_featured === 1
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                            }`}
                            title={p.is_featured === 1 ? 'Bỏ ghim bán chạy' : 'Ghim vào sản phẩm bán chạy trang chủ'}
                          >
                            <Star className={`w-4 h-4 ${p.is_featured === 1 ? 'fill-amber-400' : ''}`} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => navigateTo('product_add', p)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Sửa sản phẩm"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Toggle Active / Ngừng kinh doanh */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.is_active === 1
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={p.is_active === 1 ? 'Ngừng kinh doanh' : 'Tiếp tục kinh doanh'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
