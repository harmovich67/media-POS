import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import WeightedModal from './WeightedModal';
import ProductMedia from '../Common/ProductMedia';
import {
  Trash2,
  Plus,
  Minus,
  PauseCircle,
  CreditCard,
  Tag,
  Pill,
  Calendar,
  X,
  Scale,
  Gift,
  User,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, getExpiryStatus, calcEarnedPoints } from '../../utils/helpers';

export default function CartPanel({ onOpenCheckout, onOpenHeldCarts, isMobileOpen, onCloseMobile }) {
  const [weightedEditItem, setWeightedEditItem] = useState(null);

  const {
    cart,
    heldCarts,
    updateCartQuantity,
    removeFromCart,
    updateItemDiscount,
    clearCart,
    subtotal,
    cartDiscount,
    setCartDiscount,
    totalDiscount,
    grandTotal,
    holdCurrentCart,
    selectedCustomer,
    setSelectedCustomer,
    customers,
    shift,
    openNewShift
  } = usePOS();

  const earnedPointsPreview = selectedCustomer && selectedCustomer.id !== 'c1'
    ? calcEarnedPoints(grandTotal)
    : 0;

  const hasPrescriptionItems = cart.some((item) => item.requiresPrescription);

  return (
    <div
      className={`glass-panel border-r border-slate-200 dark:border-slate-800/80 flex flex-col h-full ${
        isMobileOpen
          ? 'fixed inset-0 z-50 bg-slate-950/95 md:relative md:inset-auto md:bg-transparent'
          : 'hidden md:flex'
      }`}
    >
      {/* Panel Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-extrabold text-sm sm:text-base text-white">سلة الفاتورة الحالية</h2>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            {cart.length} أصناف
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {heldCarts?.length > 0 && onOpenHeldCarts && (
            <button
              onClick={onOpenHeldCarts}
              className="text-[11px] text-amber-300 hover:text-amber-200 font-bold px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 transition flex items-center gap-1"
              title="عرض الفواتير المعلقة"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>({heldCarts.length})</span>
            </button>
          )}

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تفريغ</span>
            </button>
          )}

          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              aria-label="إغلاق السلة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Customer Selector Bar */}
      <div className="px-3.5 py-2 border-b border-slate-800/70 bg-slate-900/50 flex items-center gap-2 flex-shrink-0">
        <User className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
        <select
          value={selectedCustomer?.id || 'c1'}
          onChange={(e) => {
            const found = customers.find((c) => c.id === e.target.value);
            if (found) setSelectedCustomer(found);
          }}
          className="flex-1 bg-transparent text-xs font-bold text-slate-200 focus:outline-none truncate"
          aria-label="اختيار العميل"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
              {c.name} {c.id !== 'c1' ? `(${c.points} نقطة${c.debt > 0 ? ` · آجل ${c.debt}` : ''})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Closed Shift Warning */}
      {shift.isOpen === false && (
        <div className="mx-3 mt-2.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center justify-between gap-2 flex-shrink-0">
          <span>الوردية الحالية مغلقة</span>
          <button
            type="button"
            onClick={() => openNewShift(shift.closedSummary?.countedCash ?? 500)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black hover:bg-amber-400"
          >
            فتح وردية
          </button>
        </div>
      )}

      {/* Prescription Alert */}
      {hasPrescriptionItems && (
        <div className="mx-3 mt-2.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1.5 flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>تحتوي السلة على أدوية تصرف بروشتة طبية</span>
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl">
              🛒
            </div>
            <p className="font-bold text-sm text-slate-400">السلة فارغة حالياً</p>
            <p className="text-xs text-slate-500 max-w-[200px]">
              امسح الباركود أو انقر على المنتجات لإضافتها للفاتورة الحالية
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const expiryInfo = item.batchInfo ? getExpiryStatus(item.batchInfo.expiryDate) : null;
            const itemTotal = (item.price - (item.itemDiscount || 0)) * item.quantity;

            return (
              <div
                key={`${item.id}-${item.selectedBatch || 'nobatch'}`}
                className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <ProductMedia product={item} variant="thumb" className="w-10 h-10" />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h3 className="font-bold text-xs sm:text-sm text-white flex flex-wrap items-center gap-1">
                        <span className="truncate">{item.name}</span>
                        {item.type === 'pharmacy' && (
                          <span className="text-[10px] px-1.5 rounded bg-cyan-500/20 text-cyan-300 flex-shrink-0">
                            {item.dosageForm || 'دواء'}
                          </span>
                        )}
                      </h3>

                      {item.selectedBatch && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono text-cyan-400">
                            <Pill className="w-3 h-3" />
                            {item.selectedBatch}
                          </span>
                          {item.batchInfo && (
                            <span
                              className={`flex items-center gap-1 font-bold ${
                                expiryInfo.status === 'warning'
                                  ? 'text-amber-400'
                                  : expiryInfo.status === 'expired'
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              {item.batchInfo.expiryDate}
                            </span>
                          )}
                        </div>
                      )}

                      {item.type === 'pharmacy' && item.dosageInfo && (
                        <p className="text-[10px] text-cyan-400/80 truncate" title={item.dosageInfo}>
                          {item.dosageInfo}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id, item.selectedBatch)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity and Item Total Control */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-slate-950 rounded-xl border border-slate-800 p-1">
                      <button
                        onClick={() => {
                          const step = item.isWeighted ? 0.100 : 1;
                          const minAllowed = item.minWeight || (item.isWeighted ? 0.050 : 1);
                          const nextVal = Number((item.quantity - step).toFixed(3));
                          if (nextVal < minAllowed) {
                            removeFromCart(item.id, item.selectedBatch);
                          } else {
                            updateCartQuantity(item.id, item.selectedBatch, nextVal);
                          }
                        }}
                        className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => {
                          if (item.isWeighted) setWeightedEditItem(item);
                        }}
                        title={item.isWeighted ? 'انقر لتعديل الوزن بالجرامات' : ''}
                        className={`min-w-[46px] px-1 text-center font-black text-xs text-white ${
                          item.isWeighted ? 'hover:text-amber-400 cursor-pointer underline decoration-dotted' : ''
                        }`}
                      >
                        {item.isWeighted ? `${item.quantity.toFixed(3)}كجم` : item.quantity}
                      </button>

                      <button
                        onClick={() => {
                          const step = item.isWeighted ? 0.100 : 1;
                          const nextVal = Number((item.quantity + step).toFixed(3));
                          updateCartQuantity(item.id, item.selectedBatch, nextVal);
                        }}
                        className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {item.isWeighted && (
                      <button
                        onClick={() => setWeightedEditItem(item)}
                        className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition"
                        title="تعديل الوزن بالجرامات والميزان"
                      >
                        <Scale className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-left">
                    <div className="text-[11px] text-slate-400">
                      {item.isWeighted ? (
                        <span>{formatCurrency(item.price)}/كجم × {item.quantity.toFixed(3)}</span>
                      ) : (
                        <span>{formatCurrency(item.price)} × {item.quantity}</span>
                      )}
                    </div>
                    <div className="font-extrabold text-sm text-emerald-400">
                      {formatCurrency(itemTotal)}
                    </div>
                    {item.isWeighted && (
                      <div className="text-[10px] text-amber-400/80 font-bold">
                        ({(item.quantity * 1000).toFixed(0)} جرام)
                      </div>
                    )}
                  </div>
                </div>

                {/* Per-Item Discount Row */}
                <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800/40">
                  <span className="text-slate-500 flex items-center gap-1 font-bold">
                    <Tag className="w-3 h-3 text-amber-400/70" />
                    خصم الصنف (ج.م/وحدة):
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={item.price}
                    step="0.5"
                    value={item.itemDiscount || ''}
                    placeholder="0"
                    onChange={(e) => updateItemDiscount(item.id, item.selectedBatch, e.target.value)}
                    className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-center font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Weighted Precision Edit Modal */}
      {weightedEditItem && (
        <WeightedModal
          product={weightedEditItem}
          isEditMode={true}
          onClose={() => setWeightedEditItem(null)}
        />
      )}

      {/* Cart Summary Footer */}
      <div className="p-3.5 sm:p-4 bg-slate-900/90 border-t border-slate-800 space-y-2.5 flex-shrink-0 pb-safe">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-bold">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            خصم إضافي (ج.م):
          </span>
          <input
            type="number"
            min="0"
            max={subtotal}
            value={cartDiscount || ''}
            onChange={(e) => setCartDiscount(Math.min(Number(e.target.value) || 0, subtotal))}
            placeholder="0"
            className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-center font-bold text-emerald-400 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span className="font-bold">{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>الخصم الكلي:</span>
              <span className="font-bold">- {formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 border-t border-slate-800 text-base font-black text-white">
            <span>الصافي النهائي:</span>
            <span className="text-emerald-400">{formatCurrency(grandTotal)}</span>
          </div>
          {earnedPointsPreview > 0 && (
            <div className="flex justify-between text-[10px] text-purple-300/90 font-bold">
              <span className="flex items-center gap-1">
                <Gift className="w-3 h-3" />
                نقاط ولاء مستحقة للعميل:
              </span>
              <span>+{earnedPointsPreview} نقطة</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={holdCurrentCart}
            disabled={cart.length === 0}
            className={`py-2.5 sm:py-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
              cart.length > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <PauseCircle className="w-4 h-4" />
            <span>تعليق</span>
          </button>

          <button
            onClick={() => {
              if (cart.length > 0) {
                if (isMobileOpen && onCloseMobile) onCloseMobile();
                onOpenCheckout();
              }
            }}
            disabled={cart.length === 0}
            className={`col-span-2 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
              cart.length > 0
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>دفع وإتمام (F4)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
