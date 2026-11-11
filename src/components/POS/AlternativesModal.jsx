import React, { useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { Pill, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import ProductMedia from '../Common/ProductMedia';

export default function AlternativesModal({ targetProduct, onClose }) {
  const { products, addToCart } = usePOS();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!targetProduct) return null;

  const alternativesList = products.filter((p) => {
    if (p.id === targetProduct.id) return false;
    if (p.type !== 'pharmacy') return false;

    const matchesActive =
      p.activeIngredient &&
      targetProduct.activeIngredient &&
      p.activeIngredient.toLowerCase().includes(targetProduct.activeIngredient.toLowerCase().slice(0, 8));

    const matchesName =
      targetProduct.alternatives &&
      targetProduct.alternatives.some((alt) => p.name.includes(alt) || alt.includes(p.name));

    return matchesActive || matchesName;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-modal-backdrop">
      <div className="w-full max-w-2xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] animate-modal-pop">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border-b border-slate-700/60 flex items-center justify-between flex-shrink-0 keep-white">
          <div className="flex items-center gap-3 min-w-0">
            <ProductMedia product={targetProduct} variant="thumb" className="w-10 h-10" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                البدائل المثيلة والبدائل التجارية
              </h2>
              <p className="text-[11px] sm:text-xs text-cyan-200/90 truncate">
                المادة الفعالة: {targetProduct.activeIngredient || 'غير محددة'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Product Banner */}
        <div className="p-3 sm:p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs sm:text-sm gap-2 flex-shrink-0">
          <div className="min-w-0">
            <span className="text-slate-400">الصنف المطلوب بديله: </span>
            <span className="font-bold text-white">{targetProduct.name}</span>
          </div>
          <div className="font-extrabold text-emerald-400 flex-shrink-0">
            {formatCurrency(targetProduct.price)}
          </div>
        </div>

        {/* Alternatives List */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {alternativesList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <Pill className="w-12 h-12 mx-auto text-slate-600 animate-pulse" />
              <p className="font-bold text-sm">لم يتم العثور على بدائل أخرى مسجلة بنفس المادة الفعالة في المخزون الحالي.</p>
            </div>
          ) : (
            alternativesList.map((alt) => (
              <div
                key={alt.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <ProductMedia product={alt} variant="thumb" className="w-11 h-11" />
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-sm text-white">{alt.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                        {alt.dosageForm || 'دواء'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>الشركة: <strong className="text-slate-300">{alt.manufacturer || '-'}</strong></span>
                      <span>
                        الرصيد:{' '}
                        <strong className={alt.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {alt.stock} {alt.unit || 'عبوة'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 flex-shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block">السعر</span>
                    <span className="font-black text-sm text-emerald-400">{formatCurrency(alt.price)}</span>
                  </div>

                  <button
                    onClick={() => {
                      const ok = addToCart(alt);
                      if (ok) onClose();
                    }}
                    disabled={alt.stock <= 0}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 keep-white ${
                      alt.stock > 0
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>إضافة للسلة</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-cyan-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>استشارة الصيدلي متاحة لمطابقة التركيز والجرعة.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
