import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { usePOS } from '../../context/POSContext';

export default function ToastContainer() {
  const { toasts, dismissToast } = usePOS();

  if (!toasts || toasts.length === 0) return null;

  const styleMap = {
    success: {
      box: 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    },
    error: {
      box: 'bg-rose-950/95 border-rose-500/50 text-rose-100',
      icon: <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
    },
    warning: {
      box: 'bg-amber-950/95 border-amber-500/50 text-amber-100',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    },
    info: {
      box: 'bg-slate-900/95 border-cyan-500/50 text-slate-100',
      icon: <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />,
    },
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-16 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-[70] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const cfg = styleMap[t.type] || styleMap.info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto animate-toast-in px-3.5 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-2.5 text-xs font-bold keep-white ${cfg.box}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {cfg.icon}
              <span className="leading-relaxed break-words">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 flex-shrink-0"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

