import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../api';
import {
  Camera,
  X,
  AlertCircle,
  PlusCircle,
  Check,
  Keyboard,
  SwitchCamera,
  Image as ImageIcon,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

// Play sound on barcode scan
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

export default function BarcodeScannerModal() {
  const { scannerOpen, closeScanner, scannerCallback, addToCart, navigateTo, showToast } = useStore();
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraPermissionError, setCameraPermissionError] = useState(false);
  const [insecureContextError, setInsecureContextError] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'manual'

  const scannerRef = useRef(null);
  const lastScannedTimeRef = useRef(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!scannerOpen) {
      setErrorMsg('');
      setNotFoundCode(null);
      setCameraPermissionError(false);
      setInsecureContextError(false);
      return;
    }

    // Check iOS Safari Secure Context (HTTPS or localhost)
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure && !navigator.mediaDevices?.getUserMedia) {
      setInsecureContextError(true);
      setErrorMsg(
        'Safari trên iPhone yêu cầu HTTPS để mở trực tiếp camera. Bạn hãy chụp ảnh mã vạch hoặc nhập mã thủ công bên dưới.'
      );
      return;
    }

    let html5QrCode = null;
    let isSubscribed = true;

    async function initCamera() {
      try {
        setErrorMsg('');
        setCameraPermissionError(false);

        const devices = await Html5Qrcode.getCameras();
        if (!isSubscribed) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer rear/environment camera
          const backIndex = devices.findIndex(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('sau') ||
            d.label.toLowerCase().includes('environment')
          );
          const chosenIndex = backIndex >= 0 ? backIndex : 0;
          setCurrentCameraIndex(chosenIndex);

          html5QrCode = new Html5Qrcode('barcode-reader-view');
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            devices[chosenIndex].id,
            {
              fps: 15,
              qrbox: { width: 260, height: 180 },
              aspectRatio: 1.333333
            },
            (decodedText) => {
              // Debounce: prevent duplicate scan within 1.5 seconds
              const now = Date.now();
              if (now - lastScannedTimeRef.current < 1500) {
                return;
              }
              lastScannedTimeRef.current = now;
              playBeep();
              handleScannedCode(decodedText);
            },
            () => {}
          );
          if (isSubscribed) setIsScanning(true);
        } else {
          setCameraPermissionError(true);
          setErrorMsg('Không tìm thấy thiết bị camera.');
        }
      } catch (err) {
        console.error('Lỗi camera:', err);
        if (isSubscribed) {
          setCameraPermissionError(true);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setErrorMsg('Bạn đã từ chối quyền camera. Vui lòng cho phép trong Cài đặt iPhone > Safari > Camera.');
          } else if (err.name === 'NotFoundError') {
            setErrorMsg('Không tìm thấy camera trên thiết bị.');
          } else {
            setErrorMsg('Không thể mở camera. Bạn có thể chụp ảnh mã hoặc nhập tay bên dưới.');
          }
        }
      }
    }

    initCamera();

    return () => {
      isSubscribed = false;
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scannerOpen]);

  // Decode from file (works 100% on iOS Safari over HTTP or HTTPS!)
  async function handleFileScan(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Đang nhận diện mã vạch từ ảnh...', 'info', 2000);
      const html5QrCode = new Html5Qrcode('barcode-file-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      playBeep();
      handleScannedCode(decodedText);
    } catch (err) {
      showToast('Không nhận diện được mã vạch trong ảnh, vui lòng thử lại hoặc nhập tay.', 'warning');
    } finally {
      e.target.value = '';
    }
  }

  // Handle scanned code
  async function handleScannedCode(code) {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();
    setNotFoundCode(null);

    try {
      const res = await apiRequest(`/products/by-barcode/${encodeURIComponent(cleanCode)}`);
      if (res.success && res.data) {
        if (scannerCallback) {
          scannerCallback(res.data, res.matchedUnit);
          closeScanner();
        } else {
          addToCart(res.data, res.matchedUnit);
          showToast(`Đã thêm "${res.data.name}" (${res.matchedUnit?.unit_name || res.data.base_unit})`, 'success');
          closeScanner();
        }
      }
    } catch (err) {
      setNotFoundCode(cleanCode);
      showToast(`Chưa có sản phẩm mang mã "${cleanCode}"`, 'warning');
    }
  }

  // Switch camera
  async function switchCamera() {
    if (cameras.length <= 1 || !scannerRef.current) return;
    try {
      const nextIndex = (currentCameraIndex + 1) % cameras.length;
      await scannerRef.current.stop();
      setCurrentCameraIndex(nextIndex);
      await scannerRef.current.start(
        cameras[nextIndex].id,
        { fps: 15, qrbox: { width: 260, height: 180 } },
        (decodedText) => {
          const now = Date.now();
          if (now - lastScannedTimeRef.current < 1500) return;
          lastScannedTimeRef.current = now;
          playBeep();
          handleScannedCode(decodedText);
        },
        () => {}
      );
    } catch (e) {
      console.error(e);
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScannedCode(manualCode.trim());
      setManualCode('');
    }
  }

  function handleAddNewWithBarcode() {
    const code = notFoundCode;
    closeScanner();
    navigateTo('product_add', { barcode: code });
  }

  if (!scannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Hidden container for file scan decode */}
        <div id="barcode-file-reader" className="hidden"></div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileScan}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-base sm:text-lg">Quét mã vạch</h3>
          </div>
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-900 text-white transition-colors"
                title="Đổi camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={closeScanner}
              className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-900 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Camera View Area */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 min-h-[240px] flex items-center justify-center shadow-inner">
            <div id="barcode-reader-view" className="w-full"></div>

            {/* Visual Scan Frame Overlay (When camera is running) */}
            {!cameraPermissionError && !insecureContextError && isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[240px] h-[160px] border-2 border-emerald-400 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br"></div>
                  {/* Animated laser line */}
                  <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse absolute top-1/2 -translate-y-1/2"></div>
                </div>
              </div>
            )}

            {/* Error / Fallback State for iOS Safari on HTTP */}
            {(cameraPermissionError || insecureContextError) && (
              <div className="p-6 text-center text-white flex flex-col items-center justify-center">
                <ShieldAlert className="w-12 h-12 text-amber-400 mb-2" />
                <p className="text-xs sm:text-sm font-medium text-slate-200 mb-4 leading-relaxed max-w-xs">
                  {errorMsg}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-700/30 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Chụp ảnh mã vạch để quét
                </button>
              </div>
            )}
          </div>

          {/* Quick Snapshot Scan Button for iPhone */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              Chụp ảnh mã từ iPhone
            </button>
          </div>

          {/* Not Found Banner */}
          {notFoundCode && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900 text-sm">Chưa có sản phẩm mang mã này</p>
                  <p className="text-amber-700 font-mono mt-0.5">Mã: <span className="font-bold">{notFoundCode}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddNewWithBarcode}
                className="mt-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Thêm sản phẩm mới với mã này
              </button>
            </div>
          )}

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Hoặc nhập mã vạch / SKU bằng tay
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập hoặc dán mã vạch..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-colors shrink-0 shadow-sm"
              >
                Tìm
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
