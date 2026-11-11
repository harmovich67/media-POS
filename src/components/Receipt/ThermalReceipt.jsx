import React, { useEffect, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate, paymentMethodLabel, isImageSrc } from '../../utils/helpers';

// Generate a clean deterministic 21x21 QR-like SVG pattern from receipt metadata
function buildQrCells(seedText) {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const size = 21;
  const cells = [];
  const inFinder = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

  const finderOn = (r, c) => {
    const lr = r >= size - 7 ? r - (size - 7) : r;
    const lc = c >= size - 7 ? c - (size - 7) : c;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      let on = false;
      if (inFinder(r, c)) {
        on = finderOn(r, c);
      } else {
        hash = Math.imul(hash ^ (r * 31 + c * 17), 16777619);
        on = ((hash >>> 0) & 1) === 1;
      }
      if (on) cells.push({ r, c });
    }
  }
  return cells;
}

export default function ThermalReceipt({ saleRecord, onClose }) {
  const { storeInfo } = usePOS();

  // Ensure printing prints ONLY the thermal receipt even if opened over ReportsScreen
  useEffect(() => {
    if (!saleRecord) return undefined;
    document.body.dataset.printMode = 'receipt';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      delete document.body.dataset.printMode;
      window.removeEventListener('keydown', onKey);
    };
  }, [saleRecord, onClose]);

  const qrCells = useMemo(() => {
    if (!saleRecord) return [];
    const payload = `${saleRecord.id}|${saleRecord.total}|${saleRecord.date}|${storeInfo?.taxNo || ''}`;
    return buildQrCells(payload);
  }, [saleRecord, storeInfo?.taxNo]);

  if (!saleRecord) return null;

  const handlePrintNow = () => {
    window.print();
  };

  const logoVal = storeInfo?.logo || (saleRecord.mode === 'pharmacy' ? '💊' : '🛒');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-modal-backdrop">
      <div className="w-full max-w-sm glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94dvh] animate-modal-pop">

        {/* Top Header Controls */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <span className="font-extrabold text-xs text-emerald-400">معاينة الفاتورة الحرارية</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div
          className="p-4 bg-white text-slate-950 font-sans text-xs overflow-y-auto max-h-[70dvh] space-y-3 print-container"
          id="thermal-receipt-printable"
        >
          {/* Store Logo & Header */}
          <div className="text-center space-y-1 border-b border-slate-300 pb-3">
            <h1 className="font-black text-base text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
              {isImageSrc(logoVal) ? (
                <img src={logoVal} alt="logo" className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <span>{logoVal}</span>
              )}
              <span>{storeInfo?.name || (saleRecord.mode === 'pharmacy' ? 'صيدلية فارما برو' : 'سوبر ماركت البركة')}</span>
            </h1>
            <p className="text-[11px] text-slate-600">
              {storeInfo?.address || 'الفرع الرئيسي'} - هاتف: {storeInfo?.phone || '01000000000'}
            </p>
            {storeInfo?.taxNo && (
              <p className="text-[10px] text-slate-500 font-mono">
                الرقم الضريبي / السجل: {storeInfo.taxNo}
              </p>
            )}
            {saleRecord.isSettlement && (
              <div className="inline-block mt-1 px-2.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold">
                إيصال تحصيل مديونية آجلة
              </div>
            )}
            {saleRecord.returned && (
              <div className="inline-block mt-1 px-2.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                فاتورة مرتجعة بالكامل
              </div>
            )}
          </div>

          {/* Invoice Meta Details */}
          <div className="text-[11px] space-y-0.5 border-b border-slate-300 pb-2">
            <div className="flex justify-between font-bold">
              <span>رقم المستند:</span>
              <span className="font-mono">{saleRecord.id}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>التاريخ والوقت:</span>
              <span>{formatDate(saleRecord.date)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>الكاشير:</span>
              <span>{saleRecord.cashier}</span>
            </div>
            {saleRecord.customer && (
              <div className="flex justify-between text-slate-700">
                <span>العميل:</span>
                <span>{saleRecord.customer.name}</span>
              </div>
            )}
          </div>

          {/* Items Table (for regular sales) */}
          {!saleRecord.isSettlement && (
            <table className="w-full text-right text-[11px] border-b border-slate-300 pb-2">
              <thead>
                <tr className="border-b border-slate-200 font-bold text-slate-800">
                  <th className="py-1">الصنف</th>
                  <th className="py-1 text-center">الكمية</th>
                  <th className="py-1 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saleRecord.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5">
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                      {item.selectedBatch && (
                        <span className="text-[9px] text-slate-500 block font-mono">
                          تشغيلة: {item.selectedBatch} {item.batchInfo ? `(انتهاء: ${item.batchInfo.expiryDate})` : ''}
                        </span>
                      )}
                      {(item.itemDiscount || 0) > 0 && (
                        <span className="text-[9px] text-rose-600 block">
                          خصم صنف: {formatCurrency(item.itemDiscount)}/وحدة
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-center font-bold text-slate-800 whitespace-nowrap">
                      {item.isWeighted ? `${Number(item.quantity).toFixed(3)} ك` : item.quantity}
                    </td>
                    <td className="py-1.5 text-left font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency((item.price - (item.itemDiscount || 0)) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Totals Summary */}
          <div className="space-y-1 text-[11px] pt-1">
            {!saleRecord.isSettlement && (
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{formatCurrency(saleRecord.subtotal)}</span>
              </div>
            )}
            {saleRecord.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>الخصم:</span>
                <span>- {formatCurrency(saleRecord.discount)}</span>
              </div>
            )}
            {saleRecord.pointsDiscount > 0 && (
              <div className="flex justify-between text-purple-700 font-bold">
                <span>خصم نقاط الولاء:</span>
                <span>- {formatCurrency(saleRecord.pointsDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-slate-900 border-t border-b border-slate-300 py-1">
              <span>{saleRecord.isSettlement ? 'المبلغ المحصّل:' : 'الصافي المطلوب:'}</span>
              <span>{formatCurrency(saleRecord.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>طريقة الدفع:</span>
              <span className="font-bold">{paymentMethodLabel(saleRecord.paymentMethod)}</span>
            </div>
            <div className="flex justify-between">
              <span>المبلغ المدفوع:</span>
              <span>{formatCurrency(saleRecord.paidAmount)}</span>
            </div>
            {saleRecord.changeDue > 0 && (
              <div className="flex justify-between font-bold text-slate-900">
                <span>الباقي للعميل:</span>
                <span>{formatCurrency(saleRecord.changeDue)}</span>
              </div>
            )}
          </div>

          {saleRecord.note && (
            <div className="p-2 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-700">
              <strong>ملاحظة:</strong> {saleRecord.note}
            </div>
          )}

          {/* Prescription / Patient Info if present */}
          {saleRecord.prescriptionNote &&
            (saleRecord.prescriptionNote.doctorName ||
              saleRecord.prescriptionNote.patientName ||
              saleRecord.prescriptionNote.instructions) && (
              <div className="p-2 rounded bg-slate-100 border border-slate-200 text-[10px] space-y-0.5">
                <span className="font-bold text-slate-800 block">إرشادات الطبيب والروشتة:</span>
                {saleRecord.prescriptionNote.doctorName && (
                  <div>الطبيب: {saleRecord.prescriptionNote.doctorName}</div>
                )}
                {saleRecord.prescriptionNote.patientName && (
                  <div>المريض: {saleRecord.prescriptionNote.patientName}</div>
                )}
                {saleRecord.prescriptionNote.instructions && (
                  <div className="font-bold text-slate-800">
                    التعليمات: {saleRecord.prescriptionNote.instructions}
                  </div>
                )}
              </div>
            )}

          {/* Deterministic SVG QR Code */}
          <div className="pt-2 text-center space-y-1.5">
            <svg
              viewBox="0 0 21 21"
              className="w-20 h-20 mx-auto border border-slate-300 p-1 bg-white"
              shapeRendering="crispEdges"
              aria-label="QR Code"
            >
              {qrCells.map((cell, idx) => (
                <rect key={idx} x={cell.c} y={cell.r} width="1" height="1" fill="#0f172a" />
              ))}
            </svg>
            <p className="text-[10px] text-slate-600 font-bold">
              {storeInfo?.receiptFooter || 'شكراً لزيارتكم! نتمنى لكم الصحة والعافية'}
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
          >
            إغلاق
          </button>
          <button
            onClick={handlePrintNow}
            className="flex-[2] py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الفاتورة الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
}
