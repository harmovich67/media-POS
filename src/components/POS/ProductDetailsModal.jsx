import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import ProductMedia from '../Common/ProductMedia';
import {
  X,
  Pill,
  Package,
  Barcode,
  Factory,
  FileText,
  Calendar,
  Plus,
  Minus,
  ShoppingCart,
  RefreshCw,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatQuantity, getExpiryStatus } from '../../utils/helpers';

export default function ProductDetailsModal({
  product,
  onClose,
  onOpenAlternatives,
  onOpenWeightedModal
}) {
  const { addToCart, currentUser } = usePOS();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!product) return null;

  const isPharma = product.type === 'pharmacy';
  const sortedBatches = Array.isArray(product.batches)
    ? [...product.batches].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    : [];

  const handleAddDefault = () => {
    if (product.isWeighted && onOpenWeightedModal) {
      onClose();
      onOpenWeightedModal(product);
      return;
    }
    const ok = addToCart(product, null, qty);
    if (ok) onClose();
  };

  const handleAddFromBatch = (batchNo) => {
    const ok = addToCart(product, batchNo, 1);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-modal-backdrop">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh] animate-modal-pop">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm sm:text-base min-w-0">
            {isPharma ? <Pill className="w-5 h-5 flex-shrink-0" /> : <Package className="w-5 h-5 flex-shrink-0" />}
            <span className="truncate">تفاصيل الصنف</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Hero Product Visual */}
          <ProductMedia
            product={product}
            variant="hero"
            topRightOverlay={
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950/80 text-white border border-white/15 backdrop-blur-md keep-white">
                {product.category}
              </span>
            }
            topLeftOverlay={
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-md ${
                  product.stock <= 0
                    ? 'bg-rose-600 text-white border-rose-400/50 keep-white'
                    : product.stock <= product.minStock
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-emerald-500 text-slate-950 border-emerald-400'
                }`}
              >
                المتوفر: {formatQuantity(product.stock, product.isWeighted, product.unit)}
              </span>
            }
          />

          {/* Title & Price */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
                {product.name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  <Barcode className="w-3.5 h-3.5 text-emerald-400" />
                  {product.barcode || product.code}
                </span>
                {product.manufacturer && (
                  <span className="flex items-center gap-1">
                    <Factory className="w-3.5 h-3.5 text-cyan-400" />
                    {product.manufacturer}
                  </span>
                )}
              </div>
            </div>

            <div className="text-left flex-shrink-0">
              <span className="text-lg sm:text-xl font-black text-emerald-400 block">
                {formatCurrency(product.price)}
              </span>
              {product.isWeighted && (
                <span className="text-[10px] text-amber-400 font-bold flex items-center justify-end gap-1">
                  <Scale className="w-3 h-3" /> / كيلو
                </span>
              )}
              {currentUser?.role === 'admin' && product.costPrice > 0 && (
                <span className="text-[10px] text-slate-400 block">
                  التكلفة: {formatCurrency(product.costPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Pharmacy Medical Information */}
          {isPharma && (product.activeIngredient || product.dosageInfo) && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/25 border border-cyan-500/30 space-y-2 text-xs">
              {product.activeIngredient && (
                <div>
                  <span className="font-bold text-cyan-400 block text-[11px]">المادة الفعالة:</span>
                  <span className="text-slate-200 font-medium" dir="auto">{product.activeIngredient}</span>
                </div>
              )}
              {product.dosageInfo && (
                <div className="pt-1.5 border-t border-cyan-500/20 flex items-start gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-cyan-400 block text-[11px]">الجرعة وإرشادات الاستعمال:</span>
                    <span className="text-slate-200">{product.dosageInfo}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Batches (FEFO) List with Direct Batch Selection */}
          {sortedBatches.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>التشغيلات وتواريخ الصلاحية (ترتيب FEFO):</span>
              </span>
              <div className="space-y-1.5">
                {sortedBatches.map((b) => {
                  const exp = getExpiryStatus(b.expiryDate);
                  const canSell = exp.status !== 'expired' && b.stock > 0;
                  return (
                    <div
                      key={b.batchNo}
                      className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono font-bold text-cyan-400">{b.batchNo}</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            exp.status === 'expired'
                              ? 'text-rose-400'
                              : exp.status === 'warning'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {exp.status !== 'normal' && <AlertTriangle className="w-3 h-3" />}
                          {b.expiryDate} ({exp.label})
                        </span>
                        <span className="text-emerald-400 font-bold">رصيد: {b.stock}</span>
                      </div>

                      {isPharma && canSell && (
                        <button
                          type="button"
                          onClick={() => handleAddFromBatch(b.batchNo)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] hover:bg-cyan-500/30 flex-shrink-0"
                        >
                          صرف من هذه التشغيلة
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center gap-2 flex-shrink-0">
          {isPharma && onOpenAlternatives && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAlternatives(product);
              }}
              className="px-3 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-xs hover:bg-cyan-500/25 flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>البدائل</span>
            </button>
          )}

          {!product.isWeighted && product.stock > 0 && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center font-black text-xs text-white">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={handleAddDefault}
            className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition ${
              product.stock > 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {product.isWeighted ? <Scale className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            <span>
              {product.stock <= 0
                ? 'غير متوفر'
                : product.isWeighted
                ? 'تحديد الوزن وإضافة للسلة'
                : `إضافة للسلة (${formatCurrency(product.price * qty)})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
