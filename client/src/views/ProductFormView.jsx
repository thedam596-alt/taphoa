import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../api';
import { compressImageFile } from '../utils/imageCompressor';
import CameraCaptureModal from '../components/CameraCaptureModal';
import {
  Save,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Trash2,
  Plus,
  AlertTriangle,
  QrCode,
  Check,
  Package,
  Loader2
} from 'lucide-react';

export default function ProductFormView() {
  const { editingProduct, navigateTo, showToast, openScanner } = useStore();
  const isEditing = !!editingProduct?.id;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [baseUnit, setBaseUnit] = useState('cái');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [minStock, setMinStock] = useState('5');
  const [notes, setNotes] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [units, setUnits] = useState([]);

  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [priceWarning, setPriceWarning] = useState(false);

  const nativeCameraInputRef = useRef(null);
  const photoLibraryInputRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const catRes = await apiRequest('/categories');
        setCategories(catRes.data || []);

        if (editingProduct) {
          setName(editingProduct.name || '');
          setCode(editingProduct.code || '');
          setBarcode(editingProduct.barcode || '');
          setImageUrl(editingProduct.image_url || '');
          setCategoryId(editingProduct.category_id ? String(editingProduct.category_id) : '');
          setBaseUnit(editingProduct.base_unit || 'cái');
          setCostPrice(editingProduct.cost_price !== undefined ? String(editingProduct.cost_price) : '');
          setSellingPrice(editingProduct.selling_price !== undefined ? String(editingProduct.selling_price) : '');
          setMinStock(editingProduct.min_stock !== undefined ? String(editingProduct.min_stock) : '5');
          setNotes(editingProduct.notes || '');
          setIsFeatured(editingProduct.is_featured === 1);
          setUnits(editingProduct.units || []);
        } else {
          setName('');
          setCode('');
          setBarcode('');
          setImageUrl('');
          setCategoryId('');
          setBaseUnit('cái');
          setCostPrice('');
          setSellingPrice('');
          setInitialStock('0');
          setMinStock('5');
          setNotes('');
          setIsFeatured(false);
          setUnits([]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [editingProduct]);

  useEffect(() => {
    const cost = Number(costPrice) || 0;
    const sell = Number(sellingPrice) || 0;
    if (sell > 0 && cost > 0 && sell < cost) {
      setPriceWarning(true);
    } else {
      setPriceWarning(false);
    }
  }, [costPrice, sellingPrice]);

  function handleAddUnit() {
    setUnits(prev => [
      ...prev,
      {
        unit_name: '',
        conversion_factor: 24,
        selling_price: 0,
        barcode: ''
      }
    ]);
  }

  function handleUpdateUnit(index, field, value) {
    setUnits(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleRemoveUnit(index) {
    setUnits(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const res = await apiRequest('/categories', 'POST', { name: newCategoryName.trim() });
      if (res.success && res.data) {
        setCategories(prev => [...prev, res.data]);
        setCategoryId(String(res.data.id));
        setNewCategoryName('');
        setShowAddCategory(false);
        showToast('Đã thêm danh mục mới', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function handleGenerateInternalBarcode() {
    const timestamp = String(Date.now()).slice(-8);
    const code = `MC${timestamp}`;
    setBarcode(code);
    showToast(`Đã tạo mã nội bộ: ${code}`, 'info');
  }

  // Handle image upload with auto-compression (essential for iPhone Photos!)
  async function handleImageFile(file) {
    if (!file) return;
    setUploadingImage(true);
    try {
      const compressed = await compressImageFile(file);
      const formData = new FormData();
      formData.append('image', compressed);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        setImageUrl(data.url);
        showToast('Đã tải và tối ưu hóa ảnh thành công', 'success');
      } else {
        throw new Error(data.message || 'Lỗi tải ảnh');
      }
    } catch (err) {
      showToast('Lỗi xử lý ảnh: ' + err.message, 'error');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Vui lòng nhập tên sản phẩm', 'warning');
      return;
    }
    if (!baseUnit.trim()) {
      showToast('Vui lòng nhập đơn vị tính cơ sở', 'warning');
      return;
    }

    if (priceWarning) {
      const confirmLowPrice = window.confirm(
        'CẢNH BÁO: Giá bán đang thấp hơn giá nhập hàng! Bạn có chắc chắn muốn lưu mức giá này?'
      );
      if (!confirmLowPrice) return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        barcode: barcode.trim() || undefined,
        image_url: imageUrl || null,
        category_id: categoryId ? Number(categoryId) : null,
        base_unit: baseUnit.trim(),
        cost_price: Number(costPrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        min_stock: Number(minStock) || 5,
        notes: notes.trim() || null,
        is_featured: isFeatured ? 1 : 0,
        units: units.map(u => ({
          unit_name: u.unit_name.trim(),
          conversion_factor: Math.max(0.0001, Number(u.conversion_factor) || 1),
          selling_price: Math.max(0, Number(u.selling_price) || 0),
          barcode: (u.barcode && u.barcode.trim()) || null
        }))
      };

      if (!isEditing) {
        payload.initial_stock = Math.max(0, Number(initialStock) || 0);
        const res = await apiRequest('/products', 'POST', payload);
        showToast(res.message || 'Đã thêm sản phẩm thành công', 'success');
      } else {
        const res = await apiRequest(`/products/${editingProduct.id}`, 'PUT', payload);
        showToast(res.message || 'Đã cập nhật sản phẩm thành công', 'success');
      }

      navigateTo('products');
    } catch (err) {
      showToast(err.message, 'error', 5000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-28 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('products')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isEditing ? `Sửa: ${editingProduct?.name}` : 'Thêm sản phẩm mới'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {isEditing ? 'Cập nhật giá và quy cách hàng' : 'Nhập thông tin sản phẩm và tồn kho đầu kỳ'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || uploadingImage}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-sm transition-colors shadow-sm active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : 'Lưu sản phẩm'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information & Image */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            1. Thông tin chung & Hình ảnh
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Image Preview & Controls (4 cols) */}
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="w-full aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                {uploadingImage ? (
                  <div className="flex flex-col items-center text-emerald-700 p-4">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-xs font-semibold">Đang tối ưu ảnh...</span>
                  </div>
                ) : imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg shadow-md hover:bg-rose-700 transition-colors"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-slate-400 p-4 text-center">
                    <Package className="w-10 h-10 mb-2 stroke-1" />
                    <span className="text-xs font-medium">Chưa có ảnh</span>
                  </div>
                )}
              </div>

              {/* Native iPhone Photo Controls */}
              <input
                type="file"
                ref={nativeCameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
                className="hidden"
              />
              <input
                type="file"
                ref={photoLibraryInputRef}
                accept="image/*"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-2 w-full mt-3">
                {/* iPhone Camera Button */}
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors active:scale-95"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Chụp ảnh
                </button>

                {/* iPhone Photos Library Button */}
                <button
                  type="button"
                  onClick={() => photoLibraryInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors active:scale-95"
                >
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  Thư viện
                </button>
              </div>
            </div>

            {/* Fields (8 cols) */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nước ngọt Coca-Cola 330ml, Mì Hảo Hảo Tôm Chua Cay..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Mã hàng nội bộ (SKU)
                  </label>
                  <input
                    type="text"
                    placeholder="Tự động (SP0001...)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Mã vạch / QR
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateInternalBarcode}
                      className="text-[11px] text-emerald-700 hover:underline font-semibold"
                    >
                      + Tạo mã nội bộ
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Quét hoặc nhập mã vạch..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => openScanner((prod, unit) => {
                        showToast(`Mã quét được: ${prod?.barcode || prod?.code}`, 'info');
                      })}
                      className="absolute right-2 top-2 text-slate-400 hover:text-emerald-700 p-1"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Danh mục hàng hóa
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold"
                  >
                    + Thêm danh mục mới
                  </button>
                </div>

                {showAddCategory && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Tên danh mục mới (Bánh kẹo, Gia vị...)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(false)}
                      className="px-2 py-1.5 text-slate-500 text-xs"
                    >
                      Hủy
                    </button>
                  </div>
                )}

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chưa phân loại --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  Ghim vào nhóm "Sản phẩm bán chạy" trên trang chủ
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Pricing & Units & Stock */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            2. Giá bán, Đơn vị tính cơ sở & Tồn kho
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Đơn vị cơ sở <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="cái, gói, chai, lon, kg, gram..."
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Đơn vị quản lý tồn kho</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Giá nhập hàng (VNĐ)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="500"
                placeholder="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Dùng tính giá vốn</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Giá bán lẻ (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="500"
                required
                placeholder="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-emerald-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Giá theo 1 {baseUnit || 'cái'}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Tồn kho ban đầu
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                disabled={isEditing}
                placeholder="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="text-[11px] text-slate-400">
                {isEditing ? 'Sửa qua mục Kho hàng' : `Tính theo ${baseUnit || 'cái'}`}
              </span>
            </div>
          </div>

          {priceWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Cảnh báo: Giá bán đang thấp hơn giá nhập hàng! Bạn có thể lưu nếu đây là xả hàng.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Mức cảnh báo sắp hết hàng
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Ghi chú sản phẩm
              </label>
              <input
                type="text"
                placeholder="Vị trí kệ, lưu ý hạn dùng..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Conversion Units */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                3. Các đơn vị bán quy đổi (Thùng, Lốc, Cân kg...)
              </h3>
              <p className="text-xs text-slate-500">
                Bán theo thùng/lốc tự động trừ kho theo tỷ lệ quy đổi (Ví dụ: 1 Thùng = 24 {baseUnit}).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddUnit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              + Thêm đơn vị quy đổi
            </button>
          </div>

          {units.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-dashed border-slate-200">
              Sản phẩm này chỉ bán theo đơn vị cơ sở ({baseUnit || 'cái'}). Bấm nút trên nếu muốn thêm quy cách Thùng / Lốc.
            </div>
          ) : (
            <div className="space-y-3">
              {units.map((u, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tên đơn vị quy đổi
                    </label>
                    <input
                      type="text"
                      placeholder="thùng, lốc, kg..."
                      value={u.unit_name}
                      onChange={(e) => handleUpdateUnit(idx, 'unit_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Hệ số (1 {u.unit_name || 'quy cách'} = ? {baseUnit})
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0.0001"
                      value={u.conversion_factor}
                      onChange={(e) => handleUpdateUnit(idx, 'conversion_factor', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Giá bán riêng (VNĐ)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="500"
                      value={u.selling_price}
                      onChange={(e) => handleUpdateUnit(idx, 'selling_price', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mã vạch riêng
                    </label>
                    <input
                      type="text"
                      placeholder="Tùy chọn"
                      value={u.barcode || ''}
                      onChange={(e) => handleUpdateUnit(idx, 'barcode', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xóa quy cách này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigateTo('products')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={saving || uploadingImage}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-sm transition-colors shadow-md shadow-emerald-700/20 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu sản phẩm'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
