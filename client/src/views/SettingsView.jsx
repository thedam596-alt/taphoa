import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../api';
import {
  Settings,
  Store,
  Save,
  Download,
  Upload,
  FileSpreadsheet,
  Wifi,
  Smartphone,
  ShieldCheck,
  Check,
  AlertCircle,
  HelpCircle,
  Globe
} from 'lucide-react';

export default function SettingsView() {
  const { settings, setSettings, refreshSettings, showToast, networkInfo } = useStore();

  const [storeName, setStoreName] = useState(settings.store_name || 'TẠP HÓA MAI CUA');
  const [storePhone, setStorePhone] = useState(settings.store_phone || '');
  const [storeAddress, setStoreAddress] = useState(settings.store_address || '');
  const [storeLogo, setStoreLogo] = useState(settings.store_logo || '');
  const [strictStock, setStrictStock] = useState(settings.strict_stock === 'true');
  const [defaultMinStock, setDefaultMinStock] = useState(settings.default_min_stock || '5');
  const [costMethod, setCostMethod] = useState(settings.cost_method || 'latest');
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer || 'Cảm ơn Quý khách! Hẹn gặp lại!');

  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [importing, setImporting] = useState(false);

  // Save Settings
  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        store_name: storeName.trim(),
        store_phone: storePhone.trim(),
        store_address: storeAddress.trim(),
        store_logo: storeLogo,
        strict_stock: String(strictStock),
        default_min_stock: defaultMinStock,
        cost_method: costMethod,
        receipt_footer: receiptFooter.trim()
      };

      const res = await apiRequest('/settings', 'PUT', payload);
      setSettings(res.data);
      showToast('Đã lưu cấu hình cửa hàng thành công!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Backup JSON
  function handleDownloadBackup() {
    window.open('/api/settings/backup', '_blank');
  }

  // Restore JSON
  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('CẢNH BÁO: Phục hồi sao lưu sẽ ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu trong file sao lưu. Bạn có chắc chắn muốn tiếp tục?')) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await apiRequest('/settings/restore', 'POST', json);
      showToast(res.message, 'success', 5000);
      refreshSettings();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      showToast('Lỗi phục hồi: ' + err.message, 'error', 6000);
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  }

  // Export CSV
  function handleExportCsv() {
    window.open('/api/settings/export-products', '_blank');
  }

  // Import CSV
  async function handleImportCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const res = await apiRequest('/settings/import-products', 'POST', { csvData: text });
      showToast(res.message, 'success', 5000);
    } catch (err) {
      showToast('Lỗi nhập file CSV: ' + err.message, 'error', 6000);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Cài đặt cửa hàng
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Thông tin hiển thị hóa đơn, quy tắc kho, sao lưu & kết nối điện thoại.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-sm transition-colors shadow-md shadow-emerald-700/20"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
        </button>
      </div>

      {/* Section 1: Store Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-600" />
          1. Thông tin cửa hàng & Hóa đơn
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Tên cửa hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Số điện thoại
            </label>
            <input
              type="text"
              placeholder="0912 345 678"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Địa chỉ cửa hàng
            </label>
            <input
              type="text"
              placeholder="Số nhà, đường, thôn/xã, quận/huyện..."
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Lời cảm ơn chân trang hóa đơn
            </label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Store Rules & Inventory Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          2. Quy tắc bán hàng & Quản lý tồn kho
        </h3>

        <div className="space-y-4 text-xs sm:text-sm">
          {/* Strict Stock Toggle */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="font-bold text-slate-900 text-sm">Quản lý tồn kho nghiêm ngặt (Chặn bán âm kho)</div>
              <p className="text-slate-500 text-xs mt-0.5">
                Khi bật: hệ thống sẽ không cho phép hoàn tất đơn hàng nếu số lượng bán vượt quá số lượng tồn trong kho.
                Khi tắt: chủ cửa hàng vẫn có thể bấm bán ngay cả khi hàng trong kho hiển thị 0.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={strictStock}
                onChange={(e) => setStrictStock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Cost valuation method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Phương pháp tính giá vốn
              </label>
              <select
                value={costMethod}
                onChange={(e) => setCostMethod(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 font-medium"
              >
                <option value="latest">Giá nhập gần nhất (Phổ biến cho tiệm tạp hóa)</option>
                <option value="weighted_average">Bình quân gia quyền</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Mức cảnh báo sắp hết hàng mặc định
              </label>
              <input
                type="number"
                min="0"
                value={defaultMinStock}
                onChange={(e) => setDefaultMinStock(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Backup & Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-600" />
          3. Sao lưu & Phục hồi toàn bộ dữ liệu
        </h3>

        <p className="text-xs text-slate-500">
          Dữ liệu được lưu trữ trực tiếp trên máy chủ bằng cơ sở dữ liệu SQLite bền vững. Bạn nên tải bản sao lưu định kỳ để lưu trữ an toàn trên máy tính cá nhân hoặc Google Drive.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Download JSON Backup */}
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-semibold text-xs sm:text-sm transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Tải file sao lưu CSDL (.json)</span>
          </button>

          {/* Restore JSON Backup */}
          <label className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer text-center">
            <Upload className="w-4 h-4 text-slate-600" />
            <span>{restoring ? 'Đang phục hồi...' : 'Phục hồi từ file .json'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              disabled={restoring}
              className="hidden"
            />
          </label>
        </div>

        {/* Excel / CSV import and export */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Xuất & Nhập danh sách hàng hóa qua Excel / CSV
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất danh sách sản phẩm (.csv)</span>
            </button>

            <label className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>{importing ? 'Đang nhập...' : 'Nhập sản phẩm từ file CSV'}</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCsv}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Section 4: Multi-device & Phone Access Guide */}
      <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200 p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-emerald-900 text-base flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-700" />
          4. Hướng dẫn sử dụng trên iPhone (Bật 4G / 5G & Wi-Fi)
        </h3>

        {/* 4G / 5G Live HTTPS Tunnel Notice */}
        {networkInfo && networkInfo.public_url && (
          <div className="p-4 bg-emerald-700 text-white rounded-2xl shadow-md space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Globe className="w-5 h-5 text-emerald-300" />
              <span>Đường truyền 4G / 5G trực tuyến đang hoạt động!</span>
            </div>
            <p className="text-emerald-100 text-xs">
              Mở link bảo mật này trên iPhone khi đang dùng 4G hoặc 5G:
            </p>
            <div className="font-mono text-sm font-bold text-slate-900 bg-white px-3 py-2 rounded-xl border border-emerald-300 select-all break-all">
              {networkInfo.public_url}
            </div>
            <p className="text-[11px] text-emerald-200 italic">
              * Có chứng chỉ SSL HTTPS nên camera quét mã vạch và tải ảnh hoạt động 100% trên Safari iPhone!
            </p>
          </div>
        )}

        <div className="space-y-3 text-xs sm:text-sm text-slate-700">
          <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-600" />
              Cách 1: Sử dụng trong cửa hàng qua mạng Wi-Fi chung (Không cần Internet)
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Kết nối điện thoại (iPhone hoặc Android) vào cùng mạng Wi-Fi với máy tính này. Mở trình duyệt (Safari hoặc Chrome) trên điện thoại và gõ địa chỉ:
            </p>
            {networkInfo && networkInfo.ips && networkInfo.ips.length > 0 ? (
              <div className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 select-all">
                http://{networkInfo.ips[0].ip}:{networkInfo.port}
              </div>
            ) : (
              <div className="font-mono text-xs text-slate-500">Đang nhận diện mạng...</div>
            )}
            <p className="text-[11px] text-slate-500 italic">
              * Mọi thao tác bán hàng hoặc thêm sản phẩm trên điện thoại sẽ tự động đồng bộ ngay lập tức với máy tính!
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              Cách 2: Triển khai trực tuyến (Online Cloud) để dùng mọi lúc mọi nơi
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Để quản lý cửa hàng từ xa qua 4G/5G khi đi ra ngoài, bạn có thể đẩy mã nguồn này lên <strong>Render.com</strong>, <strong>Railway.app</strong>, hoặc VPS cá nhân với HTTPS. HTTPS cũng giúp camera quét mã vạch hoạt động mượt mà trên mọi dòng iPhone Safari.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-600" />
              Cài đặt như ứng dụng (App) trên màn hình chính điện thoại
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              - Trên <strong>iPhone (Safari)</strong>: Bấm nút Chia sẻ (biểu tượng hình vuông có mũi tên lên) &gt; chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.
              <br />
              - Trên <strong>Android (Chrome)</strong>: Bấm dấu 3 chấm góc trên &gt; chọn <strong>"Thêm vào màn hình chính"</strong> hoặc <strong>"Cài đặt ứng dụng"</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
