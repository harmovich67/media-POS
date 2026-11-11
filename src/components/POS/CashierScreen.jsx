import React, { useState, useEffect } from 'react';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import PaymentModal from './PaymentModal';
import AlternativesModal from './AlternativesModal';
import CameraScannerModal from './CameraScannerModal';
import WeightedModal from './WeightedModal';
import ProductDetailsModal from './ProductDetailsModal';
import { usePOS } from '../../context/POSContext';
import { formatCurrency } from '../../utils/helpers';

export default function CashierScreen({ onOpenHeldCarts, onPrintReceiptTrigger }) {
  const { cart, grandTotal, holdCurrentCart } = usePOS();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [alternativeTarget, setAlternativeTarget] = useState(null);
  const [weightedTarget, setWeightedTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const handleSaleSuccess = (completedSale) => {
    setIsCheckoutOpen(false);
    setIsMobileCartOpen(false);
    if (onPrintReceiptTrigger) {
      onPrintReceiptTrigger(completedSale);
    }
  };

  // Global cashier hotkeys: F4 = checkout, F8 = hold current invoice (F2 handled in ProductGrid)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutOpen) setIsCheckoutOpen(true);
      }
      if (e.key === 'F8') {
        e.preventDefault();
        holdCurrentCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, isCheckoutOpen, holdCurrentCart]);

  return (
    <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden h-full min-h-0">

      {/* Product Grid Area */}
      <ProductGrid
        onOpenAlternatives={(prod) => setAlternativeTarget(prod)}
        onOpenWeightedModal={(prod) => setWeightedTarget(prod)}
        onOpenDetails={(prod) => setDetailsTarget(prod)}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Cart Panel (Desktop fixed sidebar / Mobile full-screen overlay when open) */}
      <div className={`${isMobileCartOpen ? 'block' : 'hidden md:block'} md:w-80 lg:w-96 flex-shrink-0 md:h-full`}>
        <CartPanel
          onOpenCheckout={() => setIsCheckoutOpen(true)}
          onOpenHeldCarts={onOpenHeldCarts}
          isMobileOpen={isMobileCartOpen}
          onCloseMobile={() => setIsMobileCartOpen(false)}
        />
      </div>

      {/* Mobile Floating Cart Action Bar (Positioned cleanly above the bottom navigation bar) */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="fixed bottom-[66px] left-3 right-3 z-30 md:hidden">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full px-3.5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-xl shadow-emerald-500/30 flex items-center justify-between animate-pulse-glow"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center font-bold text-xs">
                {cart.length}
              </div>
              <span className="text-xs font-extrabold">عرض سلة المشتريات</span>
            </div>

            <div className="font-black text-sm">
              {formatCurrency(grandTotal)} ←
            </div>
          </button>
        </div>
      )}

      {/* Modals */}
      {isCheckoutOpen && (
        <PaymentModal
          onClose={() => setIsCheckoutOpen(false)}
          onCompleteSuccess={handleSaleSuccess}
        />
      )}

      {alternativeTarget && (
        <AlternativesModal
          targetProduct={alternativeTarget}
          onClose={() => setAlternativeTarget(null)}
        />
      )}

      {weightedTarget && (
        <WeightedModal
          product={weightedTarget}
          onClose={() => setWeightedTarget(null)}
        />
      )}

      {detailsTarget && (
        <ProductDetailsModal
          product={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          onOpenAlternatives={(prod) => setAlternativeTarget(prod)}
          onOpenWeightedModal={(prod) => setWeightedTarget(prod)}
        />
      )}

      {isScannerOpen && (
        <CameraScannerModal
          onClose={() => setIsScannerOpen(false)}
          onWeightedProduct={(prod) => setWeightedTarget(prod)}
        />
      )}
    </div>
  );
}
