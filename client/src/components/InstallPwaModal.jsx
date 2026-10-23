import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, Smartphone, X, Check, ArrowDown } from 'lucide-react';

export default function InstallPwaModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cài đặt "Mai Cua" lên iPhone</h3>
              <p className="text-xs text-slate-500">Mở toàn màn hình, không có thanh Safari</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Step Guide */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <p className="font-semibold text-slate-900">Nhấn nút "Chia sẻ" trên Safari</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Nhìn xuống thanh công cụ dưới đáy Safari và chạm vào biểu tượng ô vuông có mũi tên hướng lên (
                <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" />
                ).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <p className="font-semibold text-slate-900">Chọn "Thêm vào MH chính"</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Cuộn nhẹ danh sách tùy chọn xuống và chọn dòng <strong>"Thêm vào MH chính" (Add to Home Screen)</strong> có biểu tượng (
                <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 mx-0.5" />
                ).
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <p className="font-semibold text-slate-900">Đặt tên "Mai Cua" & Bấm "Thêm"</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Chạm nút <strong>"Thêm" (Add)</strong> ở góc trên bên phải màn hình. Biểu tượng ứng dụng Tạp hóa Mai Cua sẽ xuất hiện ngay trên màn hình chính iPhone!
              </p>
            </div>
          </div>
        </div>

        {/* Benefits reminder */}
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            Lợi ích khi mở từ Màn hình chính:
          </div>
          <p className="text-emerald-700 leading-relaxed text-[11px]">
            • Ứng dụng chạy độc lập toàn màn hình như App trên App Store.
            <br />
            • Bật camera quét mã vạch và tải ảnh nhanh chóng.
            <br />
            • Tự động đồng bộ số lượng tồn kho với máy tính tại quầy.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-colors shadow-md shadow-emerald-700/20"
        >
          Tôi đã hiểu, đóng hướng dẫn
        </button>
      </div>
    </div>
  );
}
