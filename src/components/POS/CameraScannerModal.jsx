import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Barcode, X, Zap, CheckCircle2, Video, VideoOff } from 'lucide-react';
import { usePOS } from '../../context/POSContext';

export default function CameraScannerModal({ onClose, onWeightedProduct }) {
  const { products, addToCart, activeMode, systemScope } = usePOS();
  const [simulatedCode, setSimulatedCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isErrorStatus, setIsErrorStatus] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const effectiveMode = systemScope === 'pharmacy_only'
    ? 'pharmacy'
    : systemScope === 'market_only'
    ? 'market'
    : activeMode;

  const scopedProducts = products.filter((p) => {
    if (effectiveMode === 'pharmacy' && p.type !== 'pharmacy') return false;
    if (effectiveMode === 'market' && p.type !== 'market') return false;
    return true;
  });

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        stopCamera();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stopCamera();
    };
  }, [stopCamera, onClose]);

  const handleSimulatedScan = useCallback((code) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) return;
    const target = scopedProducts.find((p) => p.barcode === trimmed || p.code === trimmed);
    if (target) {
      setIsErrorStatus(false);
      setStatusMessage(`تم قراءة الباركود بنجاح: ${target.name}`);
      stopCamera();
      if (target.isWeighted && onWeightedProduct) {
        setTimeout(() => {
          onClose();
          onWeightedProduct(target);
        }, 350);
      } else {
        addToCart(target);
        setTimeout(() => {
          onClose();
        }, 550);
      }
    } else {
      setIsErrorStatus(true);
      setStatusMessage(`لم يتم العثور على منتج بهذا الباركود (${trimmed})`);
    }
  }, [scopedProducts, stopCamera, onWeightedProduct, onClose, addToCart]);

  const startLiveCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('المتصفح لا يدعم تشغيل الكاميرا مباشرة — استخدم الإدخال اليدوي أو المحاكاة.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      // Use native BarcodeDetector if available (Chrome/Edge/Android)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
        });
        const scanFrame = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const codes = await detector.detect(videoRef.current);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                handleSimulatedScan(codes[0].rawValue);
                return;
              }
            }
          } catch {}
          rafRef.current = requestAnimationFrame(scanFrame);
        };
        rafRef.current = requestAnimationFrame(scanFrame);
      } else {
        setCameraError('تم تشغيل الكاميرا — متصفحك لا يدعم القراءة التلقائية للباركود، يمكنك كتابة الرقم يدوياً أدناه.');
      }
    } catch {
      setCameraError('تعذر الوصول للكاميرا (تحقق من صلاحيات المتصفح) — استخدم المحاكاة أو الإدخال اليدوي.');
      stopCamera();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-modal-backdrop">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-modal-pop">

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm sm:text-base">
            <Camera className="w-5 h-5" />
            <span>قارئ الباركود بالكاميرا</span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative p-4 sm:p-5 bg-slate-950 flex flex-col items-center justify-center min-h-[210px] overflow-y-auto">
          <div className="relative w-60 h-44 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-center overflow-hidden bg-slate-900/60 shadow-inner">
            {cameraActive ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <Barcode className="w-20 h-20 text-slate-700 opacity-40" />
            )}
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse-glow shadow-lg shadow-emerald-500" />
            <span className="absolute bottom-2 text-[10px] text-slate-300 bg-slate-950/70 px-2 py-0.5 rounded-full font-mono">
              {cameraActive ? 'وجه الكاميرا نحو الباركود' : 'اضغط لتشغيل كاميرا الهاتف أو اختر محاكاة'}
            </span>
          </div>

          <div className="mt-3">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startLiveCamera}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition flex items-center gap-1.5"
              >
                <Video className="w-4 h-4" />
                <span>تشغيل الكاميرا الحية</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition flex items-center gap-1.5"
              >
                <VideoOff className="w-4 h-4" />
                <span>إيقاف الكاميرا</span>
              </button>
            )}
          </div>

          {cameraError && (
            <p className="mt-2 text-[11px] text-amber-300 text-center max-w-xs">{cameraError}</p>
          )}

          {statusMessage && (
            <div
              className={`mt-2.5 text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                isErrorStatus
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Quick Simulated Barcode Test Buttons & Manual Entry */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3 flex-shrink-0">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>اختبار محاكاة المسح السريع:</span>
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {scopedProducts.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => handleSimulatedScan(p.barcode)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-right text-xs transition border border-slate-700/60 flex flex-col gap-0.5"
              >
                <span className="font-bold text-slate-200 truncate">{p.name}</span>
                <span className="text-[10px] font-mono text-emerald-400">{p.barcode}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="أدخل الباركود يدوياً..."
              value={simulatedCode}
              onChange={(e) => setSimulatedCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSimulatedScan(simulatedCode);
              }}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleSimulatedScan(simulatedCode)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"
            >
              إرسال
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
