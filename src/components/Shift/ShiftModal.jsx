import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Clock,
  Lock,
  Unlock,
  UserCheck,
  Printer,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  History
} from 'lucide-react';
import { formatCurrency, formatDate, isImageSrc } from '../../utils/helpers';

export default function ShiftModal() {
  const {
    shift,
    shiftHistory,
    addDrawerMovement,
    recordClosedShift,
    openNewShift,
    salesHistory,
    storeInfo,
    notify
  } = usePOS();

  const isClosedSuccess = shift.isOpen === false;
  const closedSummary = shift.closedSummary || null;

  const [countedCash, setCountedCash] = useState('');
  const [nextStartCash, setNextStartCash] = useState(() =>
    shift.closedSummary ? String(shift.closedSummary.countedCash ?? 500) : ''
  );
  const [printingSummary, setPrintingSummary] = useState(null);

  // Petty cash drawer movement form
  const [movType, setMovType] = useState('out');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');

  // Compute shift metrics from sales history (accounting for partial returns)
  const inShift = salesHistory.filter(
    (s) => !s.returned && new Date(s.date) >= new Date(shift.startTime)
  );

  const netAmount = (s) => Math.max(0, s.total - (s.returnedAmount || 0));

  const shiftSales = inShift.filter((s) => !s.isSettlement);
  const shiftSettlements = inShift.filter((s) => s.isSettlement);

  const totalShiftSales = shiftSales.reduce((acc, s) => acc + netAmount(s), 0);
  const totalSettlements = shiftSettlements.reduce((acc, s) => acc + s.total, 0);

  const cashSales = shiftSales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((acc, s) => acc + netAmount(s), 0);

  const cardSales = shiftSales
    .filter((s) => s.paymentMethod === 'card')
    .reduce((acc, s) => acc + netAmount(s), 0);

  const walletSales = shiftSales
    .filter((s) => s.paymentMethod === 'instapay' || s.paymentMethod === 'wallet')
    .reduce((acc, s) => acc + netAmount(s), 0);

  const debtSales = shiftSales
    .filter((s) => s.paymentMethod === 'debt')
    .reduce((acc, s) => acc + netAmount(s), 0);

  const cashSettlements = shiftSettlements
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((acc, s) => acc + s.total, 0);

  const movements = shift.drawerMovements || [];
  const drawerCashIn = movements.filter((m) => m.type === 'in').reduce((acc, m) => acc + m.amount, 0);
  const drawerCashOut = movements.filter((m) => m.type === 'out').reduce((acc, m) => acc + m.amount, 0);

  const expectedCashInDrawer =
    (shift.startCash || 0) + cashSales + cashSettlements + drawerCashIn - drawerCashOut;
  const counted = Number(countedCash) || 0;
  const variance = counted - expectedCashInDrawer;

  const handleAddMovement = (e) => {
    e.preventDefault();
    const amt = Number(movAmount) || 0;
    if (amt <= 0) {
      notify('يرجى إدخال مبلغ صحيح لحركة الدرج', 'warning');
      return;
    }
    addDrawerMovement(movType, amt, movReason);
    setMovAmount('');
    setMovReason('');
  };

  const handleCloseShift = () => {
    if (countedCash === '') {
      notify('يرجى كتابة النقدية الفعلية الموجودة بدرج الكاشير حالياً.', 'warning');
      return;
    }
    const summary = {
      closedAt: new Date().toISOString(),
      cashierName: shift.cashierName,
      startTime: shift.startTime,
      startCash: shift.startCash,
      invoicesCount: shiftSales.length,
      totalSales: totalShiftSales,
      cashSales,
      cardSales,
      walletSales,
      debtSales,
      settlements: totalSettlements,
      drawerCashIn,
      drawerCashOut,
      expectedCash: expectedCashInDrawer,
      countedCash: counted,
      variance
    };
    recordClosedShift(summary);
    setPrintingSummary(summary);
    setNextStartCash(String(counted));
  };

  const handleOpenNewShift = () => {
    const startAmt = nextStartCash !== '' ? Number(nextStartCash) || 0 : Number(countedCash) || 500;
    openNewShift(startAmt);
    setCountedCash('');
    setNextStartCash('');
  };

  const handlePrintPastZReport = (zRec) => {
    setPrintingSummary(zRec);
    setTimeout(() => window.print(), 60);
  };

  const activePrintTarget = printingSummary || closedSummary;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            <span>إدارة وردية الكاشير وإغلاق الدرج</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400">
            تتبع مبيعات الوردية، حركات الدرج النقدية، وحساب العجز أو الزيادة
          </p>
        </div>

        <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 self-start sm:self-auto">
          <UserCheck className="w-4 h-4" />
          <span>الوردية حية: {shift.cashierName}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block">بداية الوردية</span>
          <span className="text-[11px] font-mono text-slate-300 block">{formatDate(shift.startTime)}</span>
          <span className="text-xs sm:text-sm font-black text-white block pt-0.5">
            عهدة: {formatCurrency(shift.startCash)}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block">إجمالي مبيعات الوردية</span>
          <span className="text-lg sm:text-2xl font-black text-emerald-400 block truncate">
            {formatCurrency(totalShiftSales)}
          </span>
          <span className="text-[10px] text-slate-500 block">عدد الفواتير: {shiftSales.length}</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-cyan-500/30 space-y-1">
          <span className="text-[11px] sm:text-xs text-cyan-400 font-bold block">النقدية المتوقعة بالدرج</span>
          <span className="text-lg sm:text-2xl font-black text-cyan-300 block truncate">
            {formatCurrency(expectedCashInDrawer)}
          </span>
          <span className="text-[10px] text-slate-400 block">مبيعات كاش: {formatCurrency(cashSales)}</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-purple-500/30 space-y-1">
          <span className="text-[11px] sm:text-xs text-purple-400 font-bold block">دفع إلكتروني وآجل</span>
          <span className="text-sm sm:text-base font-black text-purple-300 block truncate">
            فيزا/محفظة: {formatCurrency(cardSales + walletSales)}
          </span>
          <span className="text-xs font-bold text-amber-400 block">آجل: {formatCurrency(debtSales)}</span>
        </div>
      </div>

      {/* Shift Reconciliation Panel */}
      <div className="p-4 sm:p-6 rounded-3xl glass-panel border border-slate-800 space-y-5">
        <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-400" />
          <span>مطابقة درج النقدية وتأكيد الإغلاق</span>
        </h3>

        {!isClosedSuccess ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

            {/* Input Counted Cash */}
            <div className="space-y-4 p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <label className="text-xs font-bold text-slate-300 block">
                أدخل المبلغ النقدي الفعلي الموجود بالدرج حالياً (ج.م):
              </label>

              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="أدخل المبلغ بعد العد اليدوي..."
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-lg sm:text-xl font-black text-white focus:outline-none focus:border-emerald-500 text-center"
              />

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>المبلغ المتوقع بالدرج:</span>
                  <strong className="text-white">{formatCurrency(expectedCashInDrawer)}</strong>
                </div>

                {countedCash !== '' && (
                  <div className="flex justify-between pt-2 border-t border-slate-800 font-bold">
                    <span>نتيجة المطابقة:</span>
                    <span
                      className={
                        variance === 0
                          ? 'text-emerald-400'
                          : variance > 0
                          ? 'text-cyan-400'
                          : 'text-rose-400'
                      }
                    >
                      {variance === 0
                        ? 'مضبوط تماماً (0)'
                        : variance > 0
                        ? `زيادة بالدرج (+${formatCurrency(variance)})`
                        : `عجز بالدرج (${formatCurrency(variance)})`}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleCloseShift}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs sm:text-sm hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20"
              >
                تأكيد وتقفيل الوردية الحالية
              </button>
            </div>

            {/* Shift Breakdown + Petty Cash Movements */}
            <div className="space-y-4">
              <div className="space-y-2 p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
                <h4 className="font-bold text-slate-200 mb-1">ملخص الوردية الإحصائي:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                    <span>عمليات البيع:</span>
                    <strong className="text-white">{shiftSales.length}</strong>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                    <span>مبيعات كاش:</span>
                    <strong className="text-emerald-400">{formatCurrency(cashSales)}</strong>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                    <span>فيزا (بطاقة):</span>
                    <strong className="text-cyan-400">{formatCurrency(cardSales)}</strong>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                    <span>إنستاباي/محفظة:</span>
                    <strong className="text-purple-400">{formatCurrency(walletSales)}</strong>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                    <span>مبيعات آجلة:</span>
                    <strong className="text-amber-400">{formatCurrency(debtSales)}</strong>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-amber-400" />
                      تحصيلات آجل:
                    </span>
                    <strong className="text-amber-300">{formatCurrency(totalSettlements)}</strong>
                  </div>
                </div>
              </div>

              {/* Drawer Petty Cash In/Out */}
              <form
                onSubmit={handleAddMovement}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200">حركات الدرج (مصروفات / إيداع نقدي)</h4>
                  {(drawerCashIn > 0 || drawerCashOut > 0) && (
                    <span className="text-[10px] text-slate-400">
                      +{drawerCashIn} / -{drawerCashOut}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMovType('out')}
                    className={`py-1.5 rounded-xl font-bold flex items-center justify-center gap-1 border ${
                      movType === 'out'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>سحب / مصروف</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovType('in')}
                    className={`py-1.5 rounded-xl font-bold flex items-center justify-center gap-1 border ${
                      movType === 'in'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>إيداع نقدي</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="المبلغ..."
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    className="sm:w-28 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="السبب (مثال: مصروفات نظافة، فكة)..."
                    value={movReason}
                    onChange={(e) => setMovReason(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700"
                  >
                    تسجيل
                  </button>
                </div>

                {movements.length > 0 && (
                  <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                    {movements.map((m) => (
                      <div key={m.id} className="flex justify-between text-[11px] px-2 py-1 rounded-lg bg-slate-950">
                        <span className="text-slate-300 truncate">{m.reason}</span>
                        <span className={m.type === 'in' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {m.type === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          /* Shift Closed Confirmation Card */
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-black text-white">تم إغلاق الوردية وحفظ التقرير بنجاح</h4>
              <p className="text-xs text-slate-400 mt-1">
                الفرق النهائي المسجل بالدرج: {formatCurrency(closedSummary?.variance ?? variance)}
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-1 text-right">
              <label className="text-[11px] font-bold text-slate-400 block">عهدة بداية الوردية القادمة (ج.م):</label>
              <input
                type="number"
                min="0"
                value={nextStartCash}
                onChange={(e) => setNextStartCash(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center font-bold text-emerald-400 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-2.5 pt-2">
              <button
                onClick={() => {
                  setPrintingSummary(closedSummary);
                  setTimeout(() => window.print(), 60);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة تقرير Z الوردية</span>
              </button>

              <button
                onClick={handleOpenNewShift}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>فتح وردية جديدة الآن</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Closed Shifts Z-Report Archive */}
      {shiftHistory.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-slate-800 space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>أرشيف الورديات المغلقة ({shiftHistory.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {shiftHistory.slice(0, 6).map((z) => (
              <div
                key={z.id}
                className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold text-white truncate">{z.cashierName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{formatDate(z.closedAt)}</p>
                  <p className="text-[11px] font-black text-emerald-400">
                    مبيعات: {formatCurrency(z.totalSales)} · فرق: {formatCurrency(z.variance)}
                  </p>
                </div>
                <button
                  onClick={() => handlePrintPastZReport(z)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex-shrink-0"
                  title="طباعة تقرير Z"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable Z-Report */}
      <div id="report-printable" className="hidden print:block">
        <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", color: '#000', padding: '16px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 900, textAlign: 'center', marginBottom: '4px' }}>
            {!isImageSrc(storeInfo?.logo) ? storeInfo?.logo : ''} {storeInfo?.name}
          </h1>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#444', marginBottom: '12px' }}>
            تقرير Z — إغلاق الوردية {activePrintTarget ? `بتاريخ ${formatDate(activePrintTarget.closedAt)}` : ''}
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>الكاشير</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {activePrintTarget?.cashierName || shift.cashierName}
                </td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>بداية الوردية</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatDate(activePrintTarget?.startTime || shift.startTime)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>عهدة البداية</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.startCash ?? shift.startCash)}
                </td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>عدد الفواتير</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {activePrintTarget?.invoicesCount ?? shiftSales.length}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>إجمالي المبيعات</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.totalSales ?? totalShiftSales)}
                </td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>مبيعات كاش</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.cashSales ?? cashSales)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>مبيعات فيزا</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.cardSales ?? cardSales)}
                </td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>إنستاباي / محفظة</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.walletSales ?? walletSales)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>مبيعات آجلة</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.debtSales ?? debtSales)}
                </td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>تحصيلات مديونيات</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.settlements ?? totalSettlements)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px' }}>النقدية المتوقعة بالدرج</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.expectedCash ?? expectedCashInDrawer)}
                </td>
                <td style={{ border: '1px solid #999', padding: '6px' }}>النقدية المعدودة فعلياً</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>
                  {formatCurrency(activePrintTarget?.countedCash ?? counted)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }}>الفرق (عجز / زيادة)</td>
                <td style={{ border: '1px solid #999', padding: '6px', fontWeight: 900 }} colSpan="3">
                  {formatCurrency(activePrintTarget?.variance ?? variance)}
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginTop: '14px' }}>
            توقيع الكاشير: ____________________ &nbsp;&nbsp; توقيع المدير: ____________________
          </p>
        </div>
      </div>
    </div>
  );
}
