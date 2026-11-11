import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Scale, Search, UtensilsCrossed, ShoppingCart, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import WeightedModal from './WeightedModal';
import PaymentModal from './PaymentModal';
import ProductMedia from '../Common/ProductMedia';

export default function AlMaidaScreen({ onPrintReceiptTrigger }) {
  const { products, addToCart, cart, grandTotal, setActiveTab } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [weightedTarget, setWeightedTarget] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Filter Al-Maida deli / refrigerated products
  const deliProducts = products.filter((p) => {
    const isDeliCategory = p.category === 'قسم المائدة والتلاجة' || p.isDeli;
    if (!isDeliCategory) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || (p.code && p.code.includes(term));
  });

  const handleQuickAddFraction = (product, fractionKg) => {
    addToCart(product, null, Number(fractionKg.toFixed(3)));
  };

  const getCartWeight = (productId) => {
    return cart
      .filter((i) => i.id === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-6 space-y-3 sm:space-y-4 font-sans">

      {/* Header Banner */}
      <div className="p-3.5 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-600/25 via-orange-600/15 to-slate-900 border border-amber-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl font-bold flex-shrink-0">
            🧀
          </div>
          <div>
            <h2 className="text-base sm:text-2xl font-black text-white flex flex-wrap items-center gap-2">
              <span>قسم المائدة والتلاجة</span>
              <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                أجبان ولحوم طازجة
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              اختيار سريع للأوزان (ثمن، ربع، نصف، كيلو) للأجبان واللانشون والبسطرمة والزيتون
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في أصناف المائدة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pr-10 pl-4 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {cart.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setActiveTab('pos')}
                className="px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-1.5"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>السلة ({cart.length}) · {formatCurrency(grandTotal)}</span>
              </button>
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 flex items-center gap-1.5 shadow-md"
              >
                <CreditCard className="w-4 h-4" />
                <span>دفع الآن</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className={`flex-1 overflow-y-auto pl-0.5 ${cart.length > 0 ? 'pb-24 md:pb-2' : 'pb-2'}`}>
        {deliProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
            <UtensilsCrossed className="w-12 h-12 text-slate-600" />
            <p className="font-bold text-sm">لا توجد أصناف في قسم المائدة مطابقة للبحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {deliProducts.map((product) => {
              const unitPrice = product.price || 0;
              const inCartWeight = getCartWeight(product.id);

              return (
                <div
                  key={product.id}
                  className={`group p-3 sm:p-4 rounded-3xl glass-panel border transition-all duration-200 flex flex-col justify-between space-y-3 bg-slate-900/70 ${
                    inCartWeight > 0
                      ? 'border-amber-400 ring-2 ring-amber-400/30'
                      : 'border-amber-500/20 hover:border-amber-500/50'
                  }`}
                >
                  <div className="space-y-2.5">
                    <ProductMedia
                      product={product}
                      variant="card"
                      topRightOverlay={
                        inCartWeight > 0 ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow">
                            بالسلة: {inCartWeight.toFixed(2)} كجم
                          </span>
                        ) : null
                      }
                      topLeftOverlay={
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 border border-emerald-500/30 dark:bg-slate-950/80 dark:text-emerald-300 dark:border-emerald-500/40 backdrop-blur-md shadow-sm">
                          متاح: {Number(Number(product.stock).toFixed(2))} كجم
                        </span>
                      }
                    />

                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-white">
                        {product.name}
                      </h3>
                      <span className="text-xs font-bold text-emerald-400">
                        {formatCurrency(unitPrice)} / كيلو
                      </span>
                    </div>
                  </div>

                  {/* Quick Weight Fractions Buttons Bar */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400 block">
                      إضافة سريعة بالوزن والكسور:
                    </span>

                    <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-xs">
                      {[
                        { label: 'ثمن', val: 0.125 },
                        { label: 'ربع', val: 0.25 },
                        { label: 'نصف', val: 0.5 },
                        { label: '3/4', val: 0.75 },
                        { label: '1 كجم', val: 1.0 }
                      ].map((frac) => {
                        const priceForFrac = unitPrice * frac.val;
                        return (
                          <button
                            key={frac.label}
                            onClick={() => handleQuickAddFraction(product, frac.val)}
                            className="py-2 px-1 rounded-xl bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 text-slate-200 hover:text-amber-300 font-bold transition flex flex-col items-center justify-center gap-0.5"
                          >
                            <span className="text-[10px] sm:text-[11px] font-extrabold">{frac.label}</span>
                            <span className="text-[9px] text-emerald-400 font-bold">
                              {priceForFrac.toFixed(0)}ج
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Weight Modal Trigger */}
                  <button
                    onClick={() => setWeightedTarget(product)}
                    className="w-full py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Scale className="w-4 h-4" />
                    <span>وزن مخصص أو حاسبة الميزان</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Floating Checkout / Cart Bar on Al-Maida Screen */}
      {cart.length > 0 && (
        <div className="fixed bottom-[66px] left-3 right-3 z-30 md:hidden flex gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex-1 px-3 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-bold text-xs shadow-xl flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span>السلة ({cart.length})</span>
          </button>
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="flex-[2] px-3.5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-xl flex items-center justify-between"
          >
            <span>إتمام الدفع</span>
            <span>{formatCurrency(grandTotal)} ←</span>
          </button>
        </div>
      )}

      {/* Weighted Scale Modal */}
      {weightedTarget && (
        <WeightedModal
          product={weightedTarget}
          onClose={() => setWeightedTarget(null)}
        />
      )}

      {/* Direct Checkout Modal */}
      {isCheckoutOpen && (
        <PaymentModal
          onClose={() => setIsCheckoutOpen(false)}
          onCompleteSuccess={(sale) => {
            setIsCheckoutOpen(false);
            if (onPrintReceiptTrigger) onPrintReceiptTrigger(sale);
          }}
        />
      )}
    </div>
  );
}
