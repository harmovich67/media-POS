import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import AddProductModal from './AddProductModal';
import ProductMedia from '../Common/ProductMedia';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Calendar,
  Edit,
  Trash2,
  Download
} from 'lucide-react';
import { formatCurrency, getExpiryStatus, exportToCSV, formatQuantity } from '../../utils/helpers';

export default function InventoryScreen() {
  const { products, systemScope, deleteProduct } = usePOS();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'low_stock', 'near_expiry', 'pharmacy', 'market'
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Enforce system scope products filter
  const scopedProducts = products.filter((p) => {
    if (systemScope === 'pharmacy_only' && p.type !== 'pharmacy') return false;
    if (systemScope === 'market_only' && p.type !== 'market') return false;
    return true;
  });

  // Computed stats
  const totalStockCount = Number(
    scopedProducts.reduce((acc, p) => acc + (Number(p.stock) || 0), 0).toFixed(2)
  );
  const totalStockValue = scopedProducts.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0);
  const lowStockCount = scopedProducts.filter((p) => p.stock <= p.minStock).length;

  const nearExpiryCount = scopedProducts.filter((p) => {
    if (!Array.isArray(p.batches) || p.batches.length === 0) return false;
    return p.batches.some((b) => getExpiryStatus(b.expiryDate).status !== 'normal');
  }).length;

  // Filter products
  const filteredProducts = scopedProducts.filter((p) => {
    if (filterType === 'pharmacy' && p.type !== 'pharmacy') return false;
    if (filterType === 'market' && p.type !== 'market') return false;
    if (filterType === 'out_of_stock' && p.stock > 0) return false;
    if (filterType === 'low_stock' && p.stock > p.minStock) return false;
    if (filterType === 'near_expiry') {
      if (!Array.isArray(p.batches) || p.batches.length === 0) return false;
      const hasExpiryWarning = p.batches.some(
        (b) => getExpiryStatus(b.expiryDate).status !== 'normal'
      );
      if (!hasExpiryWarning) return false;
    }

    if (!search.trim()) return true;

    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      (p.code && p.code.toLowerCase().includes(term)) ||
      (p.activeIngredient && p.activeIngredient.toLowerCase().includes(term))
    );
  });

  const handleExportInventory = () => {
    const headers = ['الكود', 'الباركود', 'الاسم', 'النوع', 'التصنيف', 'سعر البيع', 'سعر التكلفة', 'الرصيد', 'الوحدة'];
    const rows = filteredProducts.map((p) => [
      p.code || '',
      p.barcode || '',
      p.name,
      p.type === 'pharmacy' ? 'صيدلية' : 'سوبرماركت',
      p.category || '',
      p.price,
      p.costPrice || 0,
      p.stock,
      p.unit || 'عبوة'
    ]);
    exportToCSV(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            <span>إدارة المخزون والدفعات والمنتجات</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400">
            متابعة أرصدة الأصناف، صور المنتجات، تواريخ الصلاحية، والأسعار
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleExportInventory}
            className="px-3.5 py-2.5 sm:py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
            title="تصدير المخزون إلى Excel / CSV"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden xs:inline">تصدير CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block">إجمالي عدد المنتجات</span>
          <span className="text-lg sm:text-2xl font-black text-white">{scopedProducts.length} أصناف</span>
          <span className="text-[10px] text-slate-500 block">إجمالي الكمية: {totalStockCount}</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block">قيمة المخزون الإجمالية</span>
          <span className="text-lg sm:text-2xl font-black text-emerald-400 truncate block">
            {formatCurrency(totalStockValue)}
          </span>
          <span className="text-[10px] text-slate-500 block">بسعر البيع الحالي</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-amber-500/30 bg-amber-500/5 space-y-1">
          <span className="text-[11px] sm:text-xs text-amber-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            نواقص المخزون
          </span>
          <span className="text-lg sm:text-2xl font-black text-amber-300">{lowStockCount} منتج</span>
          <span className="text-[10px] text-amber-400/80 block">تجاوزت حد إعادة الطلب</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-rose-500/30 bg-rose-500/5 space-y-1">
          <span className="text-[11px] sm:text-xs text-rose-400 font-bold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            تنبيهات الصلاحية
          </span>
          <span className="text-lg sm:text-2xl font-black text-rose-300">{nearExpiryCount} صنف</span>
          <span className="text-[10px] text-rose-400/80 block">ينتهي قريباً أو منتهي</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'low_stock', label: '⚠️ قرب النفاذ' },
            { id: 'out_of_stock', label: '🚫 نافذ الرصيد' },
            { id: 'near_expiry', label: '⏳ قرب الصلاحية' },
            ...(systemScope === 'full_hybrid'
              ? [
                  { id: 'pharmacy', label: '💊 أدوية' },
                  { id: 'market', label: '🛒 سوبرماركت' }
                ]
              : [])
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                filterType === f.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Mobile Cards List (Phone-Friendly Layout) */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 glass-panel rounded-2xl">
            لا توجد أصناف مطابقة للبحث
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isPharma = product.type === 'pharmacy';
            return (
              <div
                key={product.id}
                className="p-3.5 rounded-2xl glass-panel border border-slate-800 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProductMedia product={product} variant="thumb" className="w-12 h-12" />
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-white truncate">{product.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {product.category}
                        </span>
                        <span className="font-mono text-slate-400">{product.barcode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingProduct(product);
                        setIsAddModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                      title="تعديل"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(product)}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isPharma && product.activeIngredient && (
                  <p className="text-[11px] text-cyan-300 truncate">🧪 {product.activeIngredient}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">البيع</span>
                      <strong className="text-emerald-400 font-black">{formatCurrency(product.price)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">التكلفة</span>
                      <strong className="text-slate-400 font-bold">{formatCurrency(product.costPrice || 0)}</strong>
                    </div>
                  </div>

                  <span
                    className={`font-black px-2.5 py-1 rounded-xl text-[11px] ${
                      product.stock <= product.minStock
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {formatQuantity(product.stock, product.isWeighted, product.unit)}
                  </span>
                </div>

                {Array.isArray(product.batches) && product.batches.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                    {product.batches.map((batch) => {
                      const bStatus = getExpiryStatus(batch.expiryDate);
                      return (
                        <span
                          key={batch.batchNo}
                          className={`px-2 py-0.5 rounded-lg bg-slate-950 border ${
                            bStatus.status === 'expired'
                              ? 'border-rose-500/40 text-rose-400'
                              : bStatus.status === 'warning'
                              ? 'border-amber-500/40 text-amber-400'
                              : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          {batch.batchNo} ({batch.stock}) · {batch.expiryDate}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Products Inventory Table */}
      <div className="hidden md:block glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-bold">
              <tr>
                <th className="p-3.5">المنتج / الدواء</th>
                <th className="p-3.5">النوع والتصنيف</th>
                <th className="p-3.5">الباركود</th>
                <th className="p-3.5">سعر البيع</th>
                <th className="p-3.5">سعر التكلفة</th>
                <th className="p-3.5">الرصيد المتاح</th>
                <th className="p-3.5">التشغيلة والصلاحية</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredProducts.map((product) => {
                const isPharma = product.type === 'pharmacy';

                return (
                  <tr key={product.id} className="hover:bg-slate-900/40 transition">

                    <td className="p-3.5">
                      <div className="font-bold text-white flex items-center gap-2.5">
                        <ProductMedia product={product} variant="thumb" />
                        <div>
                          <span>{product.name}</span>
                          {isPharma && product.activeIngredient && (
                            <span className="block text-[10px] text-cyan-300 font-normal">
                              🧪 {product.activeIngredient}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                        {product.category}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-slate-400">
                      {product.barcode}
                    </td>

                    <td className="p-3.5 font-bold text-emerald-400">
                      {formatCurrency(product.price)}
                    </td>

                    <td className="p-3.5 font-bold text-slate-400">
                      {formatCurrency(product.costPrice || 0)}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`font-black px-2.5 py-1 rounded-xl text-xs inline-block ${
                          product.stock <= product.minStock
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {formatQuantity(product.stock, product.isWeighted, product.unit)}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {product.batches?.length ? (
                        <div className="text-[11px] space-y-1">
                          {product.batches.map((batch) => {
                            const bStatus = getExpiryStatus(batch.expiryDate);
                            return (
                              <div key={batch.batchNo} className="flex items-center gap-2">
                                <span className="font-mono text-cyan-400">{batch.batchNo}</span>
                                <span className="text-slate-500">({batch.stock})</span>
                                <span
                                  className={`font-bold ${
                                    bStatus.status === 'warning'
                                      ? 'text-amber-400'
                                      : bStatus.status === 'expired'
                                      ? 'text-rose-400'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {batch.expiryDate}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setIsAddModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="تعديل المنتج"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 transition"
                          title="حذف المنتج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <AddProductModal
          initialProduct={editingProduct}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-modal-backdrop">
          <div className="w-full max-w-sm glass-panel rounded-3xl border border-rose-500/40 shadow-2xl p-5 space-y-4 text-center animate-modal-pop">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">حذف "{deleteTarget.name}"؟</h3>
              <p className="text-xs text-slate-400 mt-1">
                سيتم إزالة الصنف من قائمة المخزون ونقطة البيع نهائياً.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                تراجع
              </button>
              <button
                onClick={() => {
                  deleteProduct(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-xs hover:from-rose-400 hover:to-red-500"
              >
                نعم، حذف الصنف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
