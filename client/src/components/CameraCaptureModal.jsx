import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, SwitchCamera, Check, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { apiRequest } from '../api';

export default function CameraCaptureModal({ isOpen, onClose, onImageCaptured }) {
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhoto(null);
      setErrorMsg('');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, deviceIndex]);

  async function startCamera() {
    stopCamera();
    setErrorMsg('');
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);

      const constraints = {
        video: videoDevices.length > 0 ? { deviceId: { exact: videoDevices[deviceIndex]?.deviceId } } : { facingMode: 'environment' }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Lỗi mở camera chụp ảnh:', err);
      setErrorMsg('Không thể truy cập camera. Vui lòng chọn ảnh từ thư viện hoặc cấp quyền camera.');
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }

  function switchCamera() {
    if (devices.length <= 1) return;
    setDeviceIndex((prev) => (prev + 1) % devices.length);
  }

  function takePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Resize to reasonable dimension (max 800px width)
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(base64);
    stopCamera();
  }

  function retake() {
    setCapturedPhoto(null);
    startCamera();
  }

  async function confirmPhoto() {
    if (!capturedPhoto) return;
    setLoading(true);
    try {
      const res = await apiRequest('/upload/base64', 'POST', { imageBase64: capturedPhoto });
      if (res.success && res.url) {
        onImageCaptured(res.url);
        onClose();
      }
    } catch (err) {
      setErrorMsg('Không thể lưu ảnh lên máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fallback upload file directly
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (result.success && result.url) {
        onImageCaptured(result.url);
        onClose();
      } else {
        throw new Error(result.message || 'Lỗi tải ảnh');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-700 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            <h3 className="font-semibold text-base">Chụp ảnh sản phẩm</h3>
          </div>
          <div className="flex items-center gap-2">
            {devices.length > 1 && !capturedPhoto && (
              <button
                type="button"
                onClick={switchCamera}
                className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white transition-colors"
                title="Đổi camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera or Preview View */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-950">
          <canvas ref={canvasRef} className="hidden" />

          {capturedPhoto ? (
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={capturedPhoto}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {errorMsg && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-900/90 text-white">
                  <p className="text-sm font-medium text-amber-300 mb-3">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Chọn ảnh từ thư viện
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-white border-t border-slate-200">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {capturedPhoto ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={retake}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Chụp lại
              </button>
              <button
                type="button"
                onClick={confirmPhoto}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                {loading ? 'Đang lưu...' : 'Sử dụng ảnh này'}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                Thư viện
              </button>
              <button
                type="button"
                onClick={takePhoto}
                disabled={!!errorMsg}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
              >
                <Camera className="w-5 h-5" />
                Bấm chụp ảnh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
