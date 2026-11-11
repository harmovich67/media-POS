import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  CheckCircle2,
  X,
  User,
  UserPlus,
  FileText,
  Gift
} from 'lucide-react';
import { formatCurrency, maxRedeemableDiscount, calcEarnedPoints } from '../../utils/helpers';

export default function PaymentModal({ onClose, onCompleteSuccess }) {
  const {
    grandTotal,
    subtotal,
    totalDiscount,
    cart,
    selectedCustomer,
    customers,
    setSelectedCustomer,
    addCustomer,
    processSale,
    activeMode,
    prescriptionNote,
    setPrescriptionNote,
    shift,
    openNewShift,
    notify
  } = usePOS();

  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'card', 'instapay', 'debt'
  const [paidInput, setPaidInput] = useState(String(grandTotal));
  const [noteInput, setNoteInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isProcessing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isProcessing, onClose]);

  // Loyalty points redemption
  const isRegisteredCustomer = selectedCustomer && selectedCustomer.id !== 'c1';
  const maxPointsDiscount = isRegisteredCustomer
    ? maxRedeemableDiscount(selectedCustomer.points, grandTotal)
    : 0;
  const [redeemPoints, setRedeemPoints] = useState(false);
  const pointsDiscount = redeemPoints ? maxPointsDiscount : 0;
  const payableTotal = Math.max(0, grandTotal - pointsDiscount);

  // Quick add customer form
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const paidAmount = Number(paidInput) || 0;
  const changeDue = Math.max(0, paidAmount - payableTotal);

  const handleQuickAdd = (amt) => {
    setPaidInput((prev) => String((Number(prev) || 0) + amt));
  };

  const handleExactAmount = () => {
    setPaidInput(String(payableTotal));
  };

  const handleToggleRedeem = () => {
    setRedeemPoints((prev) => {
      const next = !prev;
      setPaidInput(String(next ? Math.max(0, grandTotal - maxPointsDiscount) : grandTotal));
      return next;
    });
  };

  const handleSaveNewCustomer = () => {
    if (!newCustomerName.trim()) {
      notify('يرجى كتابة اسم العميل الجديد', 'warning');
      return;
    }
    const created = addCustomer({ name: newCustomerName, phone: newCustomerPhone });
    setSelectedCustomer(created);
    setIsAddingCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  const handleConfirmCheckout = () => {
    if (isProcessing) return;

    if (paymentMethod === 'cash' && paidAmount < payableTotal) {
      notify(`المبلغ المدفوع أصغر من إجمالي الفاتورة! المطلوب: ${formatCurrency(payableTotal)}`, 'error');
      return;
    }

    if (paymentMethod === 'debt' && !isRegisteredCustomer) {
      notify('يرجى تحديد عميل مسجل لإضافة الفاتورة للحساب الآجل.', 'warning');
      return;
    }

    setIsProcessing(true);
    const saleRecord = processSale(paymentMethod, paidAmount, noteInput, pointsDiscount);
    if (saleRecord && onCompleteSuccess) {
      onCompleteSuccess(saleRecord);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-modal-backdrop">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94dvh] animate-modal-pop">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-900/60 via-teal-900/60 to-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0 keep-white">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-lg sm:text-xl">
              💰
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-extrabold text-white">إتمام عملية البيع والدفع</h2>
              <p className="text-[11px] sm:text-xs text-slate-300">حدد طريقة الدفع وقيمة المبلغ المستلم</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">

          {shift?.isOpen === false && (
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between gap-2">
              <span>تنبيه: الوردية الحالية مغلقة، افتح وردية جديدة لإتمام الدفع.</span>
              <button
                type="button"
                onClick={() => openNewShift(shift.closedSummary?.countedCash ?? 500)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black hover:bg-amber-400 flex-shrink-0"
              >
                فتح وردية
              </button>
            </div>
          )}

          {/* Amount Overview Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">الإجمالي الصافي المطلوب</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {formatCurrency(payableTotal)}
              </span>
              {pointsDiscount > 0 && (
                <span className="text-[11px] text-purple-300 block mt-0.5">
                  بعد خصم نقاط الولاء (- {formatCurrency(pointsDiscount)})
                </span>
              )}
            </div>

            <div className="text-xs space-y-1 sm:text-left text-slate-400 border-t sm:border-t-0 sm:border-r border-slate-800 sm:pr-4 pt-2 sm:pt-0">
              <div className="flex justify-between sm:justify-end gap-4">
                <span>المجموع:</span>
                <strong className="text-slate-200">{formatCurrency(subtotal)}</strong>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between sm:justify-end gap-4 text-emerald-400">
                  <span>الخصم:</span>
                  <strong>- {formatCurrency(totalDiscount)}</strong>
                </div>
              )}
              <div className="flex justify-between sm:justify-end gap-4">
                <span>عدد الأصناف:</span>
                <strong className="text-slate-200">{cart.length} أصناف</strong>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">طريقة الدفع:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>نقدي (كاش)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  paymentMethod === 'card'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>بطاقة (فيزا)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  paymentMethod === 'instapay'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span>إنستاباي/محفظة</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('debt')}
                className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  paymentMethod === 'debt'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span>حساب آجل</span>
              </button>
            </div>
          </div>

          {/* Cash Payment Details Calculator */}
          {paymentMethod === 'cash' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-300">المبلغ المستلم (ج.م):</label>
                <button
                  type="button"
                  onClick={handleExactAmount}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                >
                  بالمضبوط ({payableTotal})
                </button>
              </div>

              <input
                type="number"
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmCheckout();
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-black text-white focus:outline-none focus:border-emerald-500 text-center"
              />

              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[10, 20, 50, 100, 200].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAdd(amt)}
                    className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-300">الباقي للعميل:</span>
                <span className={`font-black text-lg ${changeDue > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <User className="w-4 h-4 text-cyan-400" />
                <span>بيانات العميل (نقاط الولاء أو الآجل):</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustomer((v) => !v)}
                className="text-[11px] font-bold px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 flex items-center gap-1 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAddingCustomer ? 'إلغاء' : 'عميل جديد'}</span>
              </button>
            </div>

            <select
              value={selectedCustomer?.id || 'c1'}
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                if (found) setSelectedCustomer(found);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone !== '0000000000' && c.phone ? `(${c.phone})` : ''} - نقاط: {c.points}
                  {c.debt > 0 ? ` - مديونية: ${c.debt}` : ''}
                </option>
              ))}
            </select>

            {isAddingCustomer && (
              <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="اسم العميل الجديد..."
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="رقم الهاتف (اختياري)..."
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveNewCustomer}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs hover:from-cyan-400 hover:to-blue-500 transition flex items-center justify-center gap-1.5 keep-white"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>حفظ العميل واختياره للفاتورة</span>
                </button>
              </div>
            )}

            {isRegisteredCustomer && maxPointsDiscount > 0 && (
              <button
                type="button"
                onClick={handleToggleRedeem}
                className={`w-full p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-between ${
                  redeemPoints
                    ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span>
                    استبدال نقاط الولاء ({selectedCustomer.points} نقطة)
                  </span>
                </span>
                <span className={redeemPoints ? 'text-purple-300' : 'text-slate-500'}>
                  {redeemPoints ? `خصم ${formatCurrency(pointsDiscount)}` : `حتى ${formatCurrency(maxPointsDiscount)}`}
                </span>
              </button>
            )}

            {isRegisteredCustomer && (
              <p className="text-[10px] text-slate-500">
                🎁 سيحصل العميل على {calcEarnedPoints(payableTotal)} نقطة ولاء إضافية من هذه الفاتورة.
              </p>
            )}
          </div>

          {/* Prescription Notes for Pharmacy Mode */}
          {(activeMode === 'pharmacy' || activeMode === 'hybrid') && (
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-cyan-900/40 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                <FileText className="w-4 h-4" />
                <span>إرشادات الروشتة والطبيب (اختياري):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="اسم الطبيب المعالج..."
                  value={prescriptionNote.doctorName}
                  onChange={(e) => setPrescriptionNote({ ...prescriptionNote, doctorName: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="اسم المريض..."
                  value={prescriptionNote.patientName}
                  onChange={(e) => setPrescriptionNote({ ...prescriptionNote, patientName: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="تعليمات الجرعة / إرشادات الصيدلي (تظهر على الفاتورة)..."
                  value={prescriptionNote.instructions || ''}
                  onChange={(e) => setPrescriptionNote({ ...prescriptionNote, instructions: e.target.value })}
                  className="sm:col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Invoice Note */}
          <input
            type="text"
            placeholder="ملاحظات الفاتورة (اختياري)..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            onClick={handleConfirmCheckout}
            disabled={isProcessing}
            className="flex-[2] py-3 px-4 sm:px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black text-xs sm:text-sm hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isProcessing ? 'جاري التنفيذ...' : 'تأكيد وطباعة الفاتورة'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
