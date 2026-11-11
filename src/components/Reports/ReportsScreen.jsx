import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import ProductMedia from '../Common/ProductMedia';
import {
  BarChart3,
  Receipt,
  TrendingUp,
  CreditCard,
  Printer,
  Calendar,
  Search,
  RotateCcw,
  Banknote,
  Smartphone,
  BookOpen,
  Wallet,
  PiggyBank,
  Eye,
  Download,
  X
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  getDateRange,
  isWithinRange,
  paymentMethodLabel,
  exportToCSV,
  isImageSrc
} from '../../utils/helpers';

const DATE_RANGES = [
  { id: 'today', label: 'اليوم' },
  { id: 'yesterday', label: 'أمس' },
  { id: '7d', label: 'آخر 7 أيام' },
  { id: '30d', label: 'آخر 30 يوم' },
  { id: 'all', label: 'كل الفترات' }
];

const RANGE_TITLES = {
  today: 'تقرير اليوم',
  yesterday: 'تقرير أمس',
  '7d': 'تقرير آخر 7 أيام',
  '30d': 'تقرير آخر 30 يوم',
  all: 'التقرير الشامل لكل الفترات'
};

const METHOD_META = [
  {
    id: 'cash',
    label: 'نقدي (كاش)',
    icon: Banknote,
    textClass: 'text-emerald-400',
    barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-400'
  },
  {
    id: 'card',
    label: 'بطاقة (فيزا)',
    icon: CreditCard,
    textClass: 'text-cyan-400',
    barClass: 'bg-gradient-to-r from-cyan-500 to-cyan-400'
  },
  {
    id: 'instapay',
    label: 'إنستاباي / محفظة',
    icon: Smartphone,
    textClass: 'text-purple-400',
    barClass: 'bg-gradient-to-r from-purple-500 to-purple-400'
  },
  {
    id: 'debt',
    label: 'حساب آجل',
    icon: BookOpen,
    textClass: 'text-amber-400',
    barClass: 'bg-gradient-to-r from-amber-500 to-amber-400'
  }
];

export default function ReportsScreen({ onPrintInvoice }) {
  const { salesHistory, systemScope, processReturn, storeInfo } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMode, setSelectedMode] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [returnTarget, setReturnTarget] = useState(null);
  const [detailSale, setDetailSale] = useState(null);
  const [partialReturnQty, setPartialReturnQty] = useState({});

  const range = useMemo(() => getDateRange(dateRange), [dateRange]);

  const filteredSales = salesHistory.filter((s) => {
    if (systemScope === 'pharmacy_only' && s.mode === 'market') return false;
    if (systemScope === 'market_only' && s.mode === 'pharmacy') return false;

    if (selectedMode !== 'all' && s.mode !== selectedMode) return false;
    if (!isWithinRange(s.date, range)) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(term) ||
      (s.customer && s.customer.name.toLowerCase().includes(term))
    );
  });

  // Effective net amount for a sale (accounting for partial or full returns)
  const netSaleTotal = (sale) => {
    if (sale.returned) return 0;
    return Math.max(0, sale.total - (sale.returnedAmount || 0));
  };

  const netSales = filteredSales.filter((s) => !s.isSettlement && !s.returned);
  const returnedSales = filteredSales.filter((s) => !s.isSettlement && (s.returned || (s.returnedAmount || 0) > 0));
  const settlements = filteredSales.filter((s) => s.isSettlement && !s.returned);

  // Analytics Metrics
  const totalRevenue = netSales.reduce((acc, s) => acc + netSaleTotal(s), 0);
  const totalInvoices = netSales.length;
  const avgOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
  const totalDiscountGiven = netSales.reduce((acc, s) => acc + (s.discount || 0) + (s.pointsDiscount || 0), 0);
  const totalSettled = settlements.reduce((acc, s) => acc + s.total, 0);
  const totalReturnedValue = returnedSales.reduce(
    (acc, s) => acc + (s.returned ? s.total : s.returnedAmount || 0),
    0
  );

  // Estimated gross profit (accounting for remaining unreturned qty and discounts)
  const grossProfit = netSales.reduce((acc, sale) => {
    const saleCostAndMargin = sale.items.reduce((itemAcc, item) => {
      const activeQty = Math.max(0, item.quantity - (item.returnedQty || 0));
      const cost = item.costPrice || 0;
      return itemAcc + (item.price - (item.itemDiscount || 0) - cost) * activeQty;
    }, 0);
    const keepRatio = sale.total > 0 ? netSaleTotal(sale) / sale.total : 1;
    return acc + saleCostAndMargin - ((sale.discount || 0) + (sale.pointsDiscount || 0)) * keepRatio;
  }, 0);

  // Payment method breakdown (with static Tailwind classes)
  const paymentBreakdown = METHOD_META.map((m) => {
    const rows = netSales.filter(
      (s) => s.paymentMethod === m.id || (m.id === 'instapay' && s.paymentMethod === 'wallet')
    );
    return {
      ...m,
      count: rows.length,
      total: rows.reduce((acc, s) => acc + netSaleTotal(s), 0)
    };
  });
  const maxMethodTotal = Math.max(...paymentBreakdown.map((m) => m.total), 1);

  // Top Selling Items aggregated
  const itemMap = {};
  netSales.forEach((sale) => {
    sale.items.forEach((item) => {
      const activeQty = Math.max(0, item.quantity - (item.returnedQty || 0));
      if (activeQty <= 0) return;
      if (!itemMap[item.id]) {
        itemMap[item.id] = {
          id: item.id,
          name: item.name,
          type: item.type,
          qty: 0,
          revenue: 0,
          image: item.image,
          imageFit: item.imageFit
        };
      }
      itemMap[item.id].qty += activeQty;
      itemMap[item.id].revenue += (item.price - (item.itemDiscount || 0)) * activeQty;
    });
  });

  const topItems = Object.values(itemMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const handleConfirmReturn = () => {
    if (!returnTarget) return;
    processReturn(returnTarget.id);
    setReturnTarget(null);
  };

  const openDetails = (sale) => {
    setDetailSale(sale);
    const initMap = {};
    sale.items.forEach((item, idx) => {
      initMap[`${item.id}::${item.selectedBatch || 'nobatch'}::${idx}`] = 0;
    });
    setPartialReturnQty(initMap);
  };

  const handleConfirmPartialReturn = () => {
    if (!detailSale) return;
    const updated = processReturn(detailSale.id, partialReturnQty);
    if (updated) {
      setDetailSale(updated);
      const resetMap = {};
      updated.items.forEach((item, idx) => {
        resetMap[`${item.id}::${item.selectedBatch || 'nobatch'}::${idx}`] = 0;
      });
      setPartialReturnQty(resetMap);
    }
  };

  const handleExportCSV = () => {
    const headers = ['رقم المستند', 'التاريخ', 'النوع', 'النمط', 'العميل', 'الكاشير', 'طريقة الدفع', 'الإجمالي', 'المرتجع', 'الحالة'];
    const rows = filteredSales.map((s) => [
      s.id,
      formatDate(s.date),
      s.isSettlement ? 'تحصيل آجل' : 'فاتورة بيع',
      s.mode === 'pharmacy' ? 'صيدلية' : s.mode === 'hybrid' ? 'مدمج' : 'سوبرماركت',
      s.customer?.name || 'عميل نقدي',
      s.cashier || '',
      paymentMethodLabel(s.paymentMethod),
      s.total,
      s.returned ? s.total : s.returnedAmount || 0,
      s.returned ? 'مرتجع كامل' : s.partiallyReturned ? 'مرتجع جزئي' : 'مكتمل'
    ]);
    exportToCSV(`sales-report-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const modeBadge = (mode) => {
    if (mode === 'pharmacy') return '💊 صيدلية';
    if (mode === 'hybrid') return '⚡ مدمج';
    return '🛒 سوبرماركت';
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            <span>لوحة التحليلات وتقارير المبيعات</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400">
            إحصائيات المبيعات، الفواتير المنفذة، المرتجعات، والأصناف الأكثر مبيعاً
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {systemScope === 'full_hybrid' && (
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-[11px] sm:text-xs font-bold">
              <button
                onClick={() => setSelectedMode('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition ${
                  selectedMode === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setSelectedMode('pharmacy')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition ${
                  selectedMode === 'pharmacy'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400'
                }`}
              >
                💊 الصيدلية
              </button>
              <button
                onClick={() => setSelectedMode('market')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition ${
                  selectedMode === 'market'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400'
                }`}
              >
                🛒 الماركت
              </button>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs bg-slate-900/80 p-2 rounded-2xl border border-slate-800 max-w-full w-fit scrollbar-none">
        <Calendar className="w-4 h-4 text-slate-500 mx-1 flex-shrink-0" />
        {DATE_RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setDateRange(r.id)}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
              dateRange === r.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block">صافي إيراد المبيعات</span>
          <span className="text-lg sm:text-2xl font-black text-emerald-400 block truncate">
            {formatCurrency(totalRevenue)}
          </span>
          <span className="text-[10px] text-slate-500 block">الخصومات: {formatCurrency(totalDiscountGiven)}</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block">عدد الفواتير الصادرة</span>
          <span className="text-lg sm:text-2xl font-black text-white">{totalInvoices} فاتورة</span>
          <span className="text-[10px] text-slate-500 block">متوسط الفاتورة: {formatCurrency(avgOrderValue)}</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-cyan-500/30 space-y-1">
          <span className="text-[11px] sm:text-xs text-cyan-400 font-bold flex items-center gap-1">
            <PiggyBank className="w-3.5 h-3.5" />
            صافي الربح التقديري
          </span>
          <span className="text-lg sm:text-2xl font-black text-cyan-300 block truncate">
            {formatCurrency(grossProfit)}
          </span>
          <span className="text-[10px] text-slate-400 block">بعد خصم التكلفة والخصومات</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-amber-500/30 space-y-1">
          <span className="text-[11px] sm:text-xs text-amber-400 font-bold flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" />
            تحصيلات الآجل / المرتجع
          </span>
          <span className="text-lg sm:text-2xl font-black text-amber-300 block truncate">
            {formatCurrency(totalSettled)}
          </span>
          <span className="text-[10px] text-rose-400/80 block">
            مرتجعات: {formatCurrency(totalReturnedValue)} ({returnedSales.length})
          </span>
        </div>
      </div>

      {/* Payment Breakdown & Top Selling Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Payment Methods Breakdown Widget */}
        <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <span>التحصيل حسب طريقة الدفع</span>
          </h3>

          <div className="space-y-3">
            {paymentBreakdown.map((m) => {
              const Icon = m.icon;
              const pct = Math.round((m.total / maxMethodTotal) * 100);
              return (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <Icon className={`w-3.5 h-3.5 ${m.textClass}`} />
                      {m.label}
                    </span>
                    <span className="font-black text-white">{formatCurrency(m.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${m.barClass}`}
                      style={{ width: `${Math.max(pct, m.total > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">{m.count} عملية</span>
                </div>
              );
            })}

            {totalSettled > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Wallet className="w-3.5 h-3.5" />
                  تحصيلات مديونيات سابقة
                </span>
                <span className="font-black text-amber-300">{formatCurrency(totalSettled)}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => window.print()}
              className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition flex items-center justify-center gap-2 text-xs"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>طباعة ملخص التقرير ({RANGE_TITLES[dateRange]})</span>
            </button>
          </div>
        </div>

        {/* Top Items Widget */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>قائمة المنتجات الأكثر مبيعاً والإيرادات</span>
          </h3>

          <div className="space-y-2.5">
            {topItems.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">لا توجد مبيعات مسجلة في هذه الفترة حتى الآن</p>
            ) : (
              topItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                      #{idx + 1}
                    </span>
                    <ProductMedia product={item} variant="thumb" className="w-10 h-10" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">{item.name}</h4>
                      <span className="text-[11px] text-slate-400">
                        الكمية المباعة: <strong>{Number(item.qty.toFixed(3))}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-left font-black text-xs sm:text-sm text-emerald-400 flex-shrink-0">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sales Invoices History Section */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden space-y-3 p-3.5 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <span>سجل الفواتير الصادرة ({filteredSales.length})</span>
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث برقم الفاتورة أو العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Mobile Invoices Card List */}
        <div className="grid grid-cols-1 gap-2.5 md:hidden">
          {filteredSales.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">لا توجد فواتير مطابقة في هذه الفترة</p>
          ) : (
            filteredSales.map((sale) => (
              <div
                key={sale.id}
                className={`p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2 ${
                  sale.returned ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-emerald-400">{sale.id}</span>
                    {sale.returned && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold">
                        مرتجع كامل
                      </span>
                    )}
                    {sale.partiallyReturned && !sale.returned && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                        مرتجع جزئي
                      </span>
                    )}
                  </div>
                  <span className="font-black text-sm text-emerald-400">{formatCurrency(sale.total)}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold text-slate-200">{sale.customer ? sale.customer.name : 'عميل نقدي'}</span>
                  <span className="font-mono">{formatDate(sale.date)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/70 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {sale.isSettlement ? '💰 تحصيل آجل' : paymentMethodLabel(sale.paymentMethod)}
                    </span>
                    <span className="text-slate-500">{modeBadge(sale.mode)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!sale.isSettlement && (
                      <button
                        onClick={() => openDetails(sale)}
                        className="p-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                        title="التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onPrintInvoice(sale)}
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-300"
                      title="طباعة"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {!sale.isSettlement && !sale.returned && (
                      <button
                        onClick={() => setReturnTarget(sale)}
                        className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400"
                        title="إرجاع كامل"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Invoices Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-bold">
              <tr>
                <th className="p-3">رقم الفاتورة</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">النمط والعميل</th>
                <th className="p-3">طريقة الدفع</th>
                <th className="p-3">الأصناف</th>
                <th className="p-3">صافي المبلغ</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    لا توجد فواتير مطابقة في هذه الفترة
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className={`hover:bg-slate-900/40 transition ${sale.returned ? 'opacity-55' : ''}`}>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      {sale.id}
                      {sale.returned && (
                        <span className="block text-[10px] text-rose-400 font-bold">↩ مرتجع كامل</span>
                      )}
                      {sale.partiallyReturned && !sale.returned && (
                        <span className="block text-[10px] text-amber-400 font-bold">
                          ↩ مرتجع جزئي ({formatCurrency(sale.returnedAmount)})
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-400">{formatDate(sale.date)}</td>
                    <td className="p-3">
                      <span className="font-bold text-white block">
                        {sale.customer ? sale.customer.name : 'عميل نقدي'}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-bold">
                        {modeBadge(sale.mode)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        sale.isSettlement
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {sale.isSettlement ? '💰 تحصيل آجل' : paymentMethodLabel(sale.paymentMethod)}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {sale.isSettlement ? 'سداد آجل' : `${sale.items.length} أصناف`}
                    </td>
                    <td className="p-3 font-black text-emerald-400">
                      {formatCurrency(sale.total)}
                      {(sale.returnedAmount || 0) > 0 && !sale.returned && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          الصافي: {formatCurrency(netSaleTotal(sale))}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!sale.isSettlement && (
                          <button
                            onClick={() => openDetails(sale)}
                            className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 transition"
                            title="عرض تفاصيل الفاتورة / مرتجع جزئي"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onPrintInvoice(sale)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="إعادة طباعة الفاتورة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {!sale.isSettlement && !sale.returned && (
                          <button
                            onClick={() => setReturnTarget(sale)}
                            className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 transition"
                            title="إرجاع الفاتورة بالكامل واستعادة المخزون"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details & Partial Return Modal */}
      {detailSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-modal-backdrop">
          <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-modal-pop">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <span>تفاصيل الفاتورة {detailSale.id}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {formatDate(detailSale.date)} · {detailSale.customer?.name || 'عميل نقدي'}
                </p>
              </div>
              <button
                onClick={() => setDetailSale(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {detailSale.items.map((item, idx) => {
                const key = `${item.id}::${item.selectedBatch || 'nobatch'}::${idx}`;
                const remaining = Math.max(0, Number((item.quantity - (item.returnedQty || 0)).toFixed(3)));
                const lineVal = (item.price - (item.itemDiscount || 0)) * item.quantity;

                return (
                  <div
                    key={key}
                    className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductMedia product={item} variant="thumb" />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400">
                          الكمية: <strong>{item.quantity}</strong> · السعر: {formatCurrency(item.price)}
                          {item.selectedBatch ? ` · تشغيلة: ${item.selectedBatch}` : ''}
                        </p>
                        {(item.returnedQty || 0) > 0 && (
                          <p className="text-[10px] text-rose-400 font-bold">
                            تم إرجاع: {item.returnedQty} (المتبقي: {remaining})
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                      <span className="font-black text-emerald-400">{formatCurrency(lineVal)}</span>
                      {!detailSale.returned && remaining > 0 && (
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-slate-400">مرتجع:</label>
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            step={item.isWeighted ? '0.05' : '1'}
                            value={partialReturnQty[key] || 0}
                            onChange={(e) => {
                              const v = Math.min(remaining, Math.max(0, Number(e.target.value) || 0));
                              setPartialReturnQty((prev) => ({ ...prev, [key]: v }));
                            }}
                            className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-rose-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">طريقة الدفع:</span>
                  <strong className="text-white">{paymentMethodLabel(detailSale.paymentMethod)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">إجمالي الفاتورة:</span>
                  <strong className="text-emerald-400">{formatCurrency(detailSale.total)}</strong>
                </div>
                {(detailSale.returnedAmount || 0) > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>إجمالي المرتجع:</span>
                    <strong>- {formatCurrency(detailSale.returned ? detailSale.total : detailSale.returnedAmount)}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2 flex-shrink-0">
              <button
                onClick={() => onPrintInvoice(detailSale)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>

              {!detailSale.returned && (
                <>
                  <button
                    onClick={handleConfirmPartialReturn}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إرجاع الكميات المحددة</span>
                  </button>
                  <button
                    onClick={() => {
                      setReturnTarget(detailSale);
                      setDetailSale(null);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/25"
                  >
                    إرجاع كامل
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-modal-backdrop">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-rose-500/40 shadow-2xl overflow-hidden animate-modal-pop">
            <div className="p-5 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                <RotateCcw className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">تأكيد إرجاع الفاتورة {returnTarget.id}؟</h3>
                <p className="text-xs text-slate-400 mt-1">
                  بقيمة <strong className="text-rose-300">{formatCurrency(netSaleTotal(returnTarget))}</strong> —
                  سيتم استعادة الكميات للمخزون وعكس نقاط العميل ومديونيته وخصم المبلغ من إجمالي الوردية.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setReturnTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
                >
                  تراجع
                </button>
                <button
                  onClick={handleConfirmReturn}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-xs hover:from-rose-400 hover:to-red-500 shadow-md shadow-rose-500/20 keep-white"
                >
                  تأكيد الإرجاع الكامل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Summary */}
      <div id="report-printable" className="hidden print:block">
        <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", color: '#000', padding: '16px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 900, textAlign: 'center', marginBottom: '4px' }}>
            {!isImageSrc(storeInfo?.logo) ? storeInfo?.logo : ''} {storeInfo?.name}
          </h1>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#444', marginBottom: '12px' }}>
            {RANGE_TITLES[dateRange]} — أُصدر بتاريخ {formatDate(new Date().toISOString())}
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>إجمالي الإيراد</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>{formatCurrency(totalRevenue)}</td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>عدد الفواتير</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>{totalInvoices}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>متوسط الفاتورة</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>{formatCurrency(avgOrderValue)}</td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>صافي الربح التقديري</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>{formatCurrency(grossProfit)}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>إجمالي الخصومات</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>{formatCurrency(totalDiscountGiven)}</td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>تحصيلات الآجل</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>{formatCurrency(totalSettled)}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>المرتجعات</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }} colSpan="3">
                  {formatCurrency(totalReturnedValue)} ({returnedSales.length} فاتورة)
                </td>
              </tr>
            </tbody>
          </table>

          <h2 style={{ fontSize: '13px', fontWeight: 900, marginBottom: '6px' }}>التحصيل حسب طريقة الدفع</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #999', padding: '6px', textAlign: 'right' }}>طريقة الدفع</th>
                <th style={{ border: '1px solid #999', padding: '6px', textAlign: 'center' }}>عدد العمليات</th>
                <th style={{ border: '1px solid #999', padding: '6px', textAlign: 'left' }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {paymentBreakdown.map((m) => (
                <tr key={m.id}>
                  <td style={{ border: '1px solid #999', padding: '6px' }}>{m.label}</td>
                  <td style={{ border: '1px solid #999', padding: '6px', textAlign: 'center' }}>{m.count}</td>
                  <td style={{ border: '1px solid #999', padding: '6px', textAlign: 'left', fontWeight: 900 }}>{formatCurrency(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {topItems.length > 0 && (
            <>
              <h2 style={{ fontSize: '13px', fontWeight: 900, marginBottom: '6px' }}>الأصناف الأكثر مبيعاً</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #999', padding: '6px', textAlign: 'right' }}>الصنف</th>
                    <th style={{ border: '1px solid #999', padding: '6px', textAlign: 'center' }}>الكمية</th>
                    <th style={{ border: '1px solid #999', padding: '6px', textAlign: 'left' }}>الإيراد</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #999', padding: '6px' }}>{item.name}</td>
                      <td style={{ border: '1px solid #999', padding: '6px', textAlign: 'center' }}>{Number(item.qty.toFixed(3))}</td>
                      <td style={{ border: '1px solid #999', padding: '6px', textAlign: 'left', fontWeight: 900 }}>{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
