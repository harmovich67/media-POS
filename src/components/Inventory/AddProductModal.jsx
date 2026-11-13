import React, { useState, useRef, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  X,
  Plus,
  Save,
  Package,
  Pill,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Link2,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { CATEGORIES } from '../../data/initialData';
import { compressProductImage, isImageSrc, formatCurrency } from '../../utils/helpers';
import ProductMedia from '../Common/ProductMedia';

const QUICK_EMOJIS = {
  pharmacy: ['💊', '💉', '🧪', '🩹', '🩺', '🧴', '🥤', '🧼', '🌿'],
  market: ['📦', '🥛', '🧀', '🍎', '🥩', '🍗', '🥓', '🫒', '🥤', '🍿', '🍚', '🍾', '🍝', '🧴', '🧼', '🍞', '🍫']
};

export default function AddProductModal({ initialProduct, onClose }) {
  const { saveProduct, activeMode, systemScope, products, notify } = usePOS();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const defaultType = initialProduct?.type || (
    systemScope === 'pharmacy_only'
      ? 'pharmacy'
      : systemScope === 'market_only'
      ? 'market'
      : activeMode === 'pharmacy'
      ? 'pharmacy'
      : 'market'
  );

  const initialBatches = Array.isArray(initialProduct?.batches) && initialProduct.batches.length > 0
    ? initialProduct.batches.map((b) => ({ ...b }))
    : defaultType === 'pharmacy'
    ? [{ batchNo: 'B-' + Math.floor(1000 + Math.random() * 9000), expiryDate: '2027-06-30', stock: Number(initialProduct?.stock) || 50 }]
    : [];

  const [formData, setFormData] = useState({
    id: initialProduct?.id || null,
    code: initialProduct?.code || '',
    name: initialProduct?.name || '',
    barcode: initialProduct?.barcode || String(Math.floor(6220000000 + Math.random() * 9999999)),
    type: defaultType,
    category: initialProduct?.category || (defaultType === 'pharmacy' ? 'مسكنات وخافض حرارة' : 'بقالة ومواد غذائية'),
    price: initialProduct?.price ?? 10,
    costPrice: initialProduct?.costPrice ?? 7,
    stock: initialProduct?.stock ?? 50,
    minStock: initialProduct?.minStock ?? 10,
    unit: initialProduct?.unit || (initialProduct?.isWeighted ? 'كيلو' : 'عبوة'),
    image: initialProduct?.image || (defaultType === 'pharmacy' ? '💊' : '📦'),
    imageFit: initialProduct?.imageFit || 'cover',
    isWeighted: initialProduct?.isWeighted || false,
    isDeli: initialProduct?.isDeli || false,
    minWeight: initialProduct?.minWeight || 0.05,
    // Pharmacy specific fields
    activeIngredient: initialProduct?.activeIngredient || '',
    dosageForm: initialProduct?.dosageForm || 'أقراص',
    manufacturer: initialProduct?.manufacturer || '',
    requiresPrescription: initialProduct?.requiresPrescription || false,
    dosageInfo: initialProduct?.dosageInfo || '',
    alternatives: initialProduct?.alternatives || []
  });

  const [batches, setBatches] = useState(initialBatches);
  const [trackExpiryForMarket, setTrackExpiryForMarket] = useState(
    defaultType === 'market' && Array.isArray(initialProduct?.batches) && initialProduct.batches.length > 0
  );

  const [newAlternativeInput, setNewAlternativeInput] = useState('');
  const [formError, setFormError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMeta, setUploadMeta] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(
    isImageSrc(initialProduct?.image) && !initialProduct.image.startsWith('data:')
      ? initialProduct.image
      : ''
  );

  const pharmacyProducts = products ? products.filter((p) => p.type === 'pharmacy') : [];
  const hasPhoto = isImageSrc(formData.image);
  const usesBatches = formData.type === 'pharmacy' || trackExpiryForMarket;

  const handleImageFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setFormError('');
    try {
      const { dataUrl, width, height, sizeKB } = await compressProductImage(file, 520, 0.84);
      setFormData((prev) => ({ ...prev, image: dataUrl }));
      setUploadMeta(`${width}×${height}px · ${sizeKB} KB`);
      notify('تم تجهيز وضغط صورة المنتج بنجاح', 'success');
    } catch (err) {
      setFormError(err.message || 'تعذر رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!isImageSrc(trimmed)) {
      setFormError('الرابط يجب أن يبدأ بـ http:// أو https:// أو /');
      return;
    }
    setFormData((prev) => ({ ...prev, image: trimmed }));
    setUploadMeta('رابط صورة خارجي');
    setShowUrlInput(false);
    setFormError('');
  };

  const handleClearImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: prev.type === 'pharmacy' ? '💊' : '📦'
    }));
    setUploadMeta('');
    setUrlInput('');
  };

  const handleSwitchType = (nextType) => {
    if (nextType === formData.type) return;
    const nextCats = (nextType === 'pharmacy' ? CATEGORIES.pharmacy : CATEGORIES.market).filter((c) => c !== 'الكل');
    setFormData((prev) => ({
      ...prev,
      type: nextType,
      category: nextCats.includes(prev.category) ? prev.category : nextCats[0],
      // Preserve uploaded product image when switching type; only update emoji fallback
      image: isImageSrc(prev.image) ? prev.image : nextType === 'pharmacy' ? '💊' : '📦',
      isWeighted: nextType === 'pharmacy' ? false : prev.isWeighted,
    }));
    if (nextType === 'pharmacy' && batches.length === 0) {
      setBatches([{
        batchNo: 'B-' + Math.floor(1000 + Math.random() * 9000),
        expiryDate: '2027-06-30',
        stock: Number(formData.stock) || 50
      }]);
    }
  };

  const handleBatchChange = (idx, field, val) => {
    setBatches((prev) => {
      const updated = prev.map((b, i) =>
        i === idx ? { ...b, [field]: field === 'stock' ? Math.max(0, Number(val) || 0) : val } : b
      );
      const sum = updated.reduce((acc, b) => acc + (Number(b.stock) || 0), 0);
      setFormData((fd) => ({ ...fd, stock: Number(sum.toFixed(3)) }));
      return updated;
    });
  };

  const handleAddBatch = () => {
    setBatches((prev) => [
      ...prev,
      {
        batchNo: 'B-' + Math.floor(1000 + Math.random() * 9000),
        expiryDate: '2027-12-31',
        stock: 10
      }
    ]);
    setFormData((fd) => ({ ...fd, stock: Number(((Number(fd.stock) || 0) + 10).toFixed(3)) }));
  };

  const handleRemoveBatch = (idx) => {
    if (batches.length <= 1) return;
    setBatches((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      const sum = updated.reduce((acc, b) => acc + (Number(b.stock) || 0), 0);
      setFormData((fd) => ({ ...fd, stock: Number(sum.toFixed(3)) }));
      return updated;
    });
  };

  const handleAddAlternative = (altName) => {
    const name = altName || newAlternativeInput.trim();
    if (!name) return;
    if (!formData.alternatives.includes(name)) {
      setFormData({
        ...formData,
        alternatives: [...formData.alternatives, name]
      });
    }
    setNewAlternativeInput('');
  };

  const handleRemoveAlternative = (nameToRemove) => {
    setFormData({
      ...formData,
      alternatives: formData.alternatives.filter((alt) => alt !== nameToRemove)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormError('يرجى كتابة اسم المنتج');
      return;
    }

    if (formData.barcode) {
      const duplicate = products.find(
        (p) => p.barcode === formData.barcode.trim() && p.id !== formData.id
      );
      if (duplicate) {
        setFormError(`الباركود ${formData.barcode} مستخدم بالفعل للصنف "${duplicate.name}"`);
        return;
      }
    }

    if (Number(formData.price) < Number(formData.costPrice)) {
      setFormError('تنبيه: سعر البيع أقل من سعر التكلفة — راجع الأسعار قبل الحفظ');
      return;
    }

    const normalizedBatches = usesBatches
      ? (batches.length > 0
          ? batches.map((b) => ({
              batchNo: (b.batchNo || '').trim() || 'B-' + Math.floor(1000 + Math.random() * 9000),
              expiryDate: b.expiryDate || '2027-12-31',
              stock: Math.max(0, Number(b.stock) || 0)
            }))
          : [{
              batchNo: 'B-' + Math.floor(1000 + Math.random() * 9000),
              expiryDate: '2027-12-31',
              stock: Math.max(0, Number(formData.stock) || 0)
            }])
      : null;

    const computedStock = normalizedBatches
      ? Number(normalizedBatches.reduce((sum, b) => sum + b.stock, 0).toFixed(3))
      : Math.max(0, Number(formData.stock) || 0);

    const payload = {
      ...formData,
      name: formData.name.trim(),
      barcode: formData.barcode.trim(),
      price: Number(formData.price) || 0,
      costPrice: Number(formData.costPrice) || 0,
      stock: computedStock,
      minStock: Number(formData.minStock) || 0,
      isDeli: formData.category === 'قسم المائدة والتلاجة',
      batches: normalizedBatches,
    };

    saveProduct(payload);
    onClose();
  };

  const currentCategories = (formData.type === 'pharmacy' ? CATEGORIES.pharmacy : CATEGORIES.market).filter(
    (c) => c !== 'الكل'
  );
  const emojiList = formData.type === 'pharmacy' ? QUICK_EMOJIS.pharmacy : QUICK_EMOJIS.market;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-modal-backdrop">
      <div className="w-full max-w-2xl glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94dvh] animate-modal-pop">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm sm:text-lg">
            <Package className="w-5 h-5" />
            <span>{formData.id ? 'تعديل بيانات المنتج' : 'إضافة صنف جديد للمخزون'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">

          {/* Validation Error Banner */}
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Product Image Upload + Live Customer Card Preview */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white flex items-center gap-1.5 text-xs sm:text-sm">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>صورة المنتج والشكل الظاهر للعميل في الجريد</span>
              </span>
              {uploadMeta && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {uploadMeta}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
              {/* Live Distinctive Grid Card Preview */}
              <div className="sm:col-span-5">
                <div className="p-2.5 rounded-2xl glass-card border border-emerald-500/30 space-y-2 h-full flex flex-col justify-between">
                  <ProductMedia
                    product={formData}
                    variant="card"
                    topRightOverlay={
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/85 text-white shadow">
                        معاينة الجريد
                      </span>
                    }
                    bottomLeftOverlay={
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-950/80 keep-dark text-emerald-300 border border-emerald-500/40">
                        {formatCurrency(formData.price)}
                      </span>
                    }
                  />
                  <div className="px-1">
                    <p className="font-extrabold text-xs text-white truncate">
                      {formData.name || 'اسم المنتج سيظهر هنا'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{formData.category}</p>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone & Controls */}
              <div className="sm:col-span-7 flex flex-col justify-between gap-2.5">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleImageFile(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 min-h-[104px] rounded-2xl border-2 border-dashed p-3 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-500/15'
                      : 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 hover:bg-slate-900'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageFile(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <Upload className={`w-6 h-6 mb-1.5 ${isUploading ? 'animate-bounce text-emerald-400' : 'text-emerald-400'}`} />
                  <span className="font-bold text-xs text-white">
                    {isUploading ? 'جاري ضغط وتجهيز الصورة...' : 'اضغط لرفع صورة أو اسحبها هنا'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    يدعم كاميرا الهاتف و PNG / JPG / WebP (تُضغط تلقائياً)
                  </span>
                </div>

                {/* Image Fit + URL + Clear Controls */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {hasPhoto && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            imageFit: p.imageFit === 'contain' ? 'cover' : 'contain'
                          }))
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 transition"
                        title="تبديل أسلوب ملء الصورة داخل الإطار"
                      >
                        {formData.imageFit === 'contain' ? (
                          <>
                            <Maximize2 className="w-3 h-3 text-cyan-400" />
                            <span>احتواء كامل</span>
                          </>
                        ) : (
                          <>
                            <Minimize2 className="w-3 h-3 text-emerald-400" />
                            <span>ملء الإطار</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>إزالة الصورة</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowUrlInput((v) => !v)}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1 transition"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>{showUrlInput ? 'إخفاء الرابط' : 'رابط صورة'}</span>
                  </button>
                </div>

                {showUrlInput && (
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      dir="ltr"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/product.jpg"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs hover:bg-cyan-400"
                    >
                      تطبيق
                    </button>
                  </div>
                )}

                {/* Quick Emoji Icon Selector when no photo is uploaded (or to switch back) */}
                {!hasPhoto && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap ml-1">أيقونة:</span>
                    {emojiList.map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, image: emo }))}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0 border transition ${
                          formData.image === emo
                            ? 'bg-emerald-500/25 border-emerald-500 scale-105'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Item Type Switcher (Pharmacy vs Market) - Only shown in full hybrid scope */}
          {systemScope === 'full_hybrid' && (
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="font-bold text-slate-300">نوع المنتج المستهدف:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchType('market')}
                  className={`flex-1 xs:flex-none px-3 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    formData.type === 'market'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🛒 سوبرماركت</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchType('pharmacy')}
                  className={`flex-1 xs:flex-none px-3 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    formData.type === 'pharmacy'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>💊 دواء / صيدلية</span>
                </button>
              </div>
            </div>
          )}

          {/* General Product Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">اسم المنتج / الدواء *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل اسم المنتج..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">الباركود (Barcode)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => {
                  setFormData({ ...formData, barcode: e.target.value });
                  setFormError('');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">التصنيف الرئيسي</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                {currentCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">الوحدة القياسية</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="علبة، كيس، كيلو..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Weighted Item Toggle & Minimum Order Weight Field (Supermarket Market Only) */}
          {formData.type === 'market' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isWeighted"
                  checked={formData.isWeighted || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isWeighted: e.target.checked,
                      unit: e.target.checked ? 'كيلو' : formData.unit === 'كيلو' ? 'عبوة' : formData.unit
                    })
                  }
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="isWeighted" className="font-bold text-amber-300 text-xs cursor-pointer">
                  ⚖️ صنف يباع بالوزن والميزان (السعر المحدد هو سعر الكيلو)
                </label>
              </div>

              {formData.isWeighted && (
                <div className="space-y-1 pt-1 border-t border-amber-500/20">
                  <label className="font-bold text-slate-300 text-xs block">
                    أدنى كمية / وزن مسموح بطلبها (كجم):
                  </label>
                  <input
                    type="number"
                    step="0.025"
                    value={formData.minWeight}
                    onChange={(e) => setFormData({ ...formData, minWeight: Number(e.target.value) || 0.05 })}
                    placeholder="مثال: 0.125 كجم (125 جرام)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    {(Number(formData.minWeight || 0) * 1000).toFixed(0)} جرام كحد أدنى عند الشراء
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pricing & Stock */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="space-y-1">
              <label className="font-bold text-slate-400 text-[11px] sm:text-xs">سعر البيع (ج.م)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-400 text-[11px] sm:text-xs">سعر الشراء (التكلفة)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-400 text-[11px] sm:text-xs">
                {usesBatches ? 'الرصيد (مجموع التشغيلات)' : 'الكمية بالمخزون'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                readOnly={usesBatches}
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 ${
                  usesBatches ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-400 text-[11px] sm:text-xs">حد إعادة الطلب</label>
              <input
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-amber-400 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Expiry Date & Multi-Batch Info Section */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm">
                <Pill className="w-4 h-4" />
                <span>تواريخ الصلاحية والتشغيلات (Batches FEFO)</span>
              </div>

              {formData.type === 'market' ? (
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackExpiryForMarket}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTrackExpiryForMarket(checked);
                      if (checked && batches.length === 0) {
                        setBatches([{
                          batchNo: 'B-' + Math.floor(1000 + Math.random() * 9000),
                          expiryDate: '2027-06-30',
                          stock: Number(formData.stock) || 0
                        }]);
                      }
                    }}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>تتبع الصلاحية</span>
                </label>
              ) : (
                <button
                  type="button"
                  onClick={handleAddBatch}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة تشغيلة</span>
                </button>
              )}
            </div>

            {usesBatches && (
              <div className="space-y-2">
                {batches.map((batch, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 items-end"
                  >
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">رقم التشغيلة</label>
                      <input
                        type="text"
                        value={batch.batchNo}
                        onChange={(e) => handleBatchChange(idx, 'batchNo', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">تاريخ الانتهاء</label>
                      <input
                        type="date"
                        value={batch.expiryDate}
                        onChange={(e) => handleBatchChange(idx, 'expiryDate', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">رصيد التشغيلة</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={batch.stock}
                        onChange={(e) => handleBatchChange(idx, 'stock', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      {batches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBatch(idx)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          title="حذف التشغيلة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {formData.type === 'market' && (
                  <button
                    type="button"
                    onClick={handleAddBatch}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة تشغيلة أخرى</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pharmacy Special Fields (Active Ingredient, Dosage Form, Prescription, Alternatives) */}
          {formData.type === 'pharmacy' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-cyan-950/30 border border-cyan-900/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Pill className="w-4 h-4" />
                  <span>بيانات الصيدلية والدواء التخصصية:</span>
                </div>

                <label className="flex items-center gap-1.5 text-xs font-bold text-rose-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresPrescription || false}
                    onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                    className="w-4 h-4 accent-rose-500 rounded"
                  />
                  <span>⚕ يصرف بروشتة طبية</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">المادة الفعالة (Active Ingredient)</label>
                  <input
                    type="text"
                    value={formData.activeIngredient}
                    onChange={(e) => setFormData({ ...formData, activeIngredient: e.target.value })}
                    placeholder="مثل: Paracetamol 500mg"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">الشكل الدوائي</label>
                  <select
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="أقراص">أقراص (Tablets)</option>
                    <option value="كبسولات">كبسولات (Capsules)</option>
                    <option value="شراب">شراب (Syrup)</option>
                    <option value="حقن">حقن (Injection)</option>
                    <option value="مراهم">مراهم/كريم (Ointment)</option>
                    <option value="قطرة">قطرة (Drops)</option>
                    <option value="فوار">فوار (Effervescent)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">الشركة المصنعة</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="مثل: GSK / Hikma"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">إرشادات الجرعة</label>
                  <input
                    type="text"
                    value={formData.dosageInfo}
                    onChange={(e) => setFormData({ ...formData, dosageInfo: e.target.value })}
                    placeholder="مثال: قرص كل 12 ساعة بعد الأكل"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Medicine Alternatives Linker Section (Pharmacy Only) */}
              <div className="space-y-2 pt-3 border-t border-cyan-900/40">
                <label className="font-bold text-cyan-300 flex flex-wrap items-center justify-between gap-1 text-xs sm:text-sm">
                  <span>🔗 ربط الأدوية البديلة والمكافئة (Alternatives):</span>
                  <span className="text-[11px] text-slate-400 font-normal">تظهر للكاشير عند طلب بدائل الصنف</span>
                </label>

                {formData.alternatives && formData.alternatives.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    {formData.alternatives.map((alt) => (
                      <span
                        key={alt}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5"
                      >
                        <span>💊 {alt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAlternative(alt)}
                          className="hover:text-rose-400 font-black text-xs transition"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAlternativeInput}
                    onChange={(e) => setNewAlternativeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAlternative();
                      }
                    }}
                    placeholder="اكتب اسم دواء بديل واضغط إضافة..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAlternative()}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-500/30 text-xs flex items-center gap-1 transition flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ربط</span>
                  </button>
                </div>

                {pharmacyProducts.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] text-slate-400 block font-bold">
                      💡 اختيارات سريعة من أدوية الصيدلية:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                      {pharmacyProducts
                        .filter((p) => p.name !== formData.name && !formData.alternatives.includes(p.name))
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAddAlternative(p.name)}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 transition flex items-center gap-1 font-bold"
                          >
                            <span>+ {p.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800 sticky bottom-0 bg-slate-900/95 backdrop-blur-md -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 text-xs sm:text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/20 flex items-center gap-2 text-xs sm:text-sm"
            >
              <Save className="w-4 h-4" />
              <span>حفظ المنتج</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
