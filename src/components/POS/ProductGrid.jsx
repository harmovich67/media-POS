import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../../context/POSContext';
import { CATEGORIES } from '../../data/initialData';
import ProductMedia from '../Common/ProductMedia';
import {
  Search,
  Camera,
  Barcode,
  Pill,
  AlertTriangle,
  Scale,
  RefreshCw,
  Plus,
  Minus,
  ChevronRight,
  ChevronLeft,
  Layers,
  ShoppingBag,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { formatCurrency, getExpiryStatus } from '../../utils/helpers';

export default function ProductGrid({
  onOpenAlternatives,
  onOpenWeightedModal,
  onOpenScanner,
  onOpenDetails
}) {
  const { products, cart, activeMode, setActiveMode, addToCart, updateCartQuantity, systemScope, notify } = usePOS();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [pharmaSearchType, setPharmaSearchType] = useState('all'); // 'all', 'ingredient'
  const [inStockOnly, setInStockOnly] = useState(false);

  const searchInputRef = useRef(null);
  const categoriesScrollRef = useRef(null);

  const effectiveMode = systemScope === 'pharmacy_only'
    ? 'pharmacy'
    : systemScope === 'market_only'
    ? 'market'
    : activeMode;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset selectedCategory when switching between Pharmacy and Market via Header
  useEffect(() => {
    const validCats = effectiveMode === 'market'
      ? CATEGORIES.market
      : effectiveMode === 'pharmacy'
      ? CATEGORIES.pharmacy
      : [...new Set([...CATEGORIES.market, ...CATEGORIES.pharmacy])];
    if (!validCats.includes(selectedCategory)) {
      setSelectedCategory('الكل');
    }
  }, [effectiveMode, selectedCategory]);

  const handleScrollCategories = (direction) => {
    if (categoriesScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      categoriesScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Mode-scoped products (used for exact barcode scan even across categories)
  const modeScopedProducts = products.filter((product) => {
    if (effectiveMode === 'market' && product.type !== 'market') return false;
    if (effectiveMode === 'pharmacy' && product.type !== 'pharmacy') return false;
    return true;
  });

  // Filter products by category, stock, and search text
  const filteredProducts = modeScopedProducts.filter((product) => {
    if (inStockOnly && product.stock <= 0) return false;

    if (selectedCategory !== 'الكل' && product.category !== selectedCategory) {
      return false;
    }

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const matchName = product.name.toLowerCase().includes(term);
    const matchCode = product.code && product.code.toLowerCase().includes(term);
    const matchBarcode = product.barcode && product.barcode.toLowerCase().includes(term);
    const matchIngredient =
      product.activeIngredient && product.activeIngredient.toLowerCase().includes(term);

    if (pharmaSearchType === 'ingredient') return matchIngredient;
    return matchName || matchCode || matchBarcode || matchIngredient;
  });

  // Direct barcode scanner Enter key input (checks all mode-scoped products)
  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      const trimmed = searchTerm.trim();
      const exactMatch = modeScopedProducts.find(
        (p) => p.barcode === trimmed || p.code === trimmed
      );
      if (exactMatch) {
        if (exactMatch.isWeighted && onOpenWeightedModal) {
          onOpenWeightedModal(exactMatch);
        } else {
          addToCart(exactMatch);
        }
        setSearchTerm('');
      } else {
        notify(`لم يتم العثور على باركود مطابق (${trimmed})`, 'warning');
      }
    }
  };

  const categoriesList = effectiveMode === 'market'
    ? CATEGORIES.market
    : effectiveMode === 'pharmacy'
    ? CATEGORIES.pharmacy
    : [...new Set([...CATEGORIES.market, ...CATEGORIES.pharmacy])];

  const getCategoryItemCount = (catName) => {
    return modeScopedProducts.filter((p) => {
      if (catName === 'الكل') return true;
      return p.category === catName;
    }).length;
  };

  const getCartInfoForProduct = (productId) => {
    const items = cart.filter((item) => item.id === productId);
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const lastEntry = items.length > 0 ? items[items.length - 1] : null;
    return { totalQty, lastEntry };
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 min-w-0">

      {/* Search Bar & Scanner Button */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={
              effectiveMode === 'pharmacy'
                ? 'ابحث بالدواء، الباركود، المادة الفعالة... (F2)'
                : 'ابحث بالمنتج، الكود، أو امسح الباركود... (F2)'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchSubmit}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pr-9 pl-8 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Camera Scanner Trigger Button */}
        <button
          onClick={onOpenScanner}
          className="px-3 sm:px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:from-emerald-500 hover:to-teal-500 transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 flex-shrink-0 keep-white"
          title="مسح الباركود بالكاميرا"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden xs:inline">مسح باركود</span>
        </button>
      </div>

      {/* Mode Quick Filter & Search Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
        {systemScope === 'full_hybrid' && (
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => {
                setActiveMode('pharmacy');
                setSelectedCategory('الكل');
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition whitespace-nowrap ${
                activeMode === 'pharmacy'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>الصيدلية ({products.filter((p) => p.type === 'pharmacy').length})</span>
            </button>

            <button
              onClick={() => {
                setActiveMode('market');
                setSelectedCategory('الكل');
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition whitespace-nowrap ${
                activeMode === 'market'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>السوبرماركت ({products.filter((p) => p.type === 'market').length})</span>
            </button>

            <button
              onClick={() => {
                setActiveMode('hybrid');
                setSelectedCategory('الكل');
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition whitespace-nowrap ${
                activeMode === 'hybrid'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>الكل ({products.length})</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {(effectiveMode === 'pharmacy' || effectiveMode === 'hybrid') && (
            <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setPharmaSearchType('all')}
                className={`px-2 py-1 rounded-lg transition font-bold ${
                  pharmaSearchType === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400'
                }`}
              >
                بالاسم
              </button>
              <button
                onClick={() => setPharmaSearchType('ingredient')}
                className={`px-2 py-1 rounded-lg transition font-bold ${
                  pharmaSearchType === 'ingredient'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400'
                }`}
              >
                💊 المادة الفعالة
              </button>
            </div>
          )}

          <button
            onClick={() => setInStockOnly((v) => !v)}
            className={`px-2.5 py-1 rounded-xl font-bold border transition ${
              inStockOnly
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            المتوفر فقط
          </button>
        </div>
      </div>

      {/* Category Pills Slider with Arrow Controls */}
      <div className="relative flex items-center gap-1">
        <button
          onClick={() => handleScrollCategories('right')}
          className="hidden sm:flex p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 flex-shrink-0"
          title="التمرير لليمين"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div
          ref={categoriesScrollRef}
          className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          {categoriesList.map((cat) => {
            const count = getCategoryItemCount(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/30 text-emerald-200'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handleScrollCategories('left')}
          className="hidden sm:flex p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 flex-shrink-0"
          title="التمرير لليسار"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Distinctive Customer-Ready Product Showcase Grid */}
      <div className={`flex-1 overflow-y-auto pl-0.5 ${cart.length > 0 ? 'pb-24 md:pb-2' : 'pb-2'}`}>
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center space-y-3 p-4">
            <Barcode className="w-12 h-12 text-slate-600 animate-pulse" />
            <div>
              <p className="font-extrabold text-sm text-white">لم يتم العثور على منتجات مطابقة للبحث</p>
              <p className="text-xs text-slate-400 mt-1">
                قد تكون المنتجات تابعة لنمط آخر (ماركت أو صيدلية) أو قسم مختلف.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('الكل');
                  setInStockOnly(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition"
              >
                إلغاء التصفية
              </button>

              {systemScope === 'full_hybrid' && activeMode !== 'hybrid' && (
                <button
                  onClick={() => {
                    setActiveMode('hybrid');
                    setSelectedCategory('الكل');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition flex items-center gap-1.5 keep-white"
                >
                  <Layers className="w-4 h-4" />
                  <span>عرض كافة المنتجات</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3.5">
            {filteredProducts.map((product) => {
              const isPharma = product.type === 'pharmacy';
              const isLowStock = product.stock <= product.minStock;
              const isOutOfStock = product.stock <= 0;
              const { totalQty: qtyInCart, lastEntry } = getCartInfoForProduct(product.id);

              const nearestExpiry = product.batches?.length
                ? product.batches
                    .slice()
                    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0]
                : null;
              const expiryInfo = nearestExpiry ? getExpiryStatus(nearestExpiry.expiryDate) : null;

              const nameParts = product.name.split('(');
              const mainTitle = nameParts[0].trim();
              const subTitle = nameParts[1] ? nameParts[1].replace(')', '').trim() : '';

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (product.isWeighted && onOpenWeightedModal) {
                      onOpenWeightedModal(product);
                    } else {
                      addToCart(product);
                    }
                  }}
                  className={`group relative p-2 sm:p-3 rounded-[22px] glass-card hover-lift transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                    qtyInCart > 0
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : isPharma
                      ? 'border-cyan-500/20 dark:border-cyan-900/40 hover:border-cyan-400/60'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                  } ${isOutOfStock ? 'opacity-60 saturate-50' : ''}`}
                >
                  <div className="space-y-2">
                    {/* Distinctive Product Showcase Image / Visual Frame */}
                    <ProductMedia
                      product={product}
                      variant="card"
                      topRightOverlay={
                        <>
                          {qtyInCart > 0 && (
                            <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-md flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {product.isWeighted ? `${qtyInCart.toFixed(2)}ك` : `×${qtyInCart}`}
                            </span>
                          )}

                          {product.isWeighted && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/90 text-slate-950 font-black flex items-center gap-0.5 shadow-sm">
                              <Scale className="w-2.5 h-2.5" />
                              <span>ميزان</span>
                            </span>
                          )}

                          {isPharma && product.requiresPrescription && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-bold shadow-sm keep-white">
                              ⚕ بروشتة
                            </span>
                          )}
                        </>
                      }
                      topLeftOverlay={
                        <span
                          className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm border ${
                            product.stock <= 0
                              ? 'bg-rose-600 text-white border-rose-400/50 keep-white'
                              : isLowStock
                              ? 'bg-amber-400 text-slate-950 border-amber-300/60'
                              : 'bg-white/90 text-emerald-700 border-emerald-500/30 dark:bg-slate-950/80 dark:text-emerald-300 dark:border-emerald-500/40'
                          }`}
                        >
                          {product.stock <= 0
                            ? 'نفذ'
                            : `${Number(Number(product.stock).toFixed(2))} ${product.unit || 'عبوة'}`}
                        </span>
                      }
                      bottomRightOverlay={
                        expiryInfo && expiryInfo.status !== 'normal' ? (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-lg font-bold backdrop-blur-md border flex items-center gap-1 shadow-sm ${
                              expiryInfo.status === 'expired'
                                ? 'bg-rose-600 text-white border-rose-400/50 keep-white'
                                : 'bg-amber-400 text-slate-950 border-amber-300/60'
                            }`}
                            title={`أقرب تشغيلة: ${nearestExpiry.batchNo} - ${nearestExpiry.expiryDate}`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>{expiryInfo.status === 'expired' ? 'منتهي' : `${expiryInfo.days}ي`}</span>
                          </span>
                        ) : null
                      }
                      bottomLeftOverlay={
                        isPharma ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-lg bg-white/90 text-cyan-800 border border-cyan-500/30 dark:bg-cyan-950/85 dark:text-cyan-200 dark:border-cyan-400/30 font-bold backdrop-blur-md shadow-sm">
                            {product.dosageForm || 'دواء'}
                          </span>
                        ) : null
                      }
                    />

                    {/* Title & Subtitle */}
                    <div className="px-0.5">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                        {mainTitle}
                      </h3>
                      {subTitle && (
                        <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
                          {subTitle}
                        </span>
                      )}
                      {isPharma && product.activeIngredient && (
                        <p className="text-[10px] text-cyan-300/90 line-clamp-1 mt-0.5 font-medium" title={product.activeIngredient}>
                          🧪 <span dir="auto">{product.activeIngredient}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Price & Action Footer */}
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800/70 flex items-center justify-between gap-1">
                    <div className="font-black text-xs sm:text-sm text-emerald-400 flex items-baseline gap-0.5 min-w-0">
                      <span className="truncate">{formatCurrency(product.price)}</span>
                      {product.isWeighted && (
                        <span className="text-[9px] text-slate-400 font-normal flex-shrink-0">/كجم</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onOpenDetails && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails(product);
                          }}
                          className="p-1.5 rounded-xl bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50 transition"
                          title="تفاصيل الصنف والتشغيلات"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isPharma && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAlternatives(product);
                          }}
                          className="px-1.5 sm:px-2 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 transition text-[10px] font-bold flex items-center gap-1"
                          title="عرض البدائل المثيلة"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span className="hidden xl:inline">البدائل</span>
                        </button>
                      )}

                      {qtyInCart > 0 && !product.isWeighted && lastEntry ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-0.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-0.5"
                        >
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, lastEntry.selectedBatch, lastEntry.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-slate-900/90 text-slate-200 hover:bg-rose-500 hover:text-white flex items-center justify-center transition keep-white"
                            title="تقليل الكمية"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1 font-black text-[11px] text-emerald-400 min-w-[18px] text-center">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 flex items-center justify-center transition"
                            title="زيادة الكمية"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black group-hover:bg-emerald-400 shadow-md transition active:scale-95">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
