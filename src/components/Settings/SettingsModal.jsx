import React, { useState, useRef, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import StoreSetupWizardModal from './StoreSetupWizardModal';
import {
  Settings,
  X,
  UtensilsCrossed,
  Check,
  Building2,
  Wand2,
  Download,
  Upload,
  RotateCcw,
  Database
} from 'lucide-react';
import { isImageSrc } from '../../utils/helpers';

export default function SettingsModal({ onClose }) {
  const {
    systemScope,
    setSystemScope,
    enableAlMaida,
    setEnableAlMaida,
    storeInfo,
    exportBackup,
    importBackup,
    resetAllData,
    notify
  } = usePOS();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isWizardOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isWizardOpen, onClose]);

  if (isWizardOpen) {
    return <StoreSetupWizardModal onClose={() => setIsWizardOpen(false)} />;
  }

  const handleExport = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `pos-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBackupMessage('✅ تم تنزيل ملف النسخة الاحتياطية بنجاح');
    notify('تم تصدير النسخة الاحتياطية بنجاح', 'success');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importBackup(String(reader.result || ''));
      if (ok) {
        notify('تم استعادة النسخة الاحتياطية بنجاح — جاري تحديث النظام', 'success');
        setTimeout(() => window.location.reload(), 650);
      } else {
        setBackupMessage('❌ ملف غير صالح — تأكد من اختيار ملف نسخة احتياطية صحيح');
        notify('ملف النسخة الاحتياطية غير صالح', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md font-sans overflow-y-auto animate-modal-backdrop">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh] animate-modal-pop">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm sm:text-base">
            <Settings className="w-5 h-5" />
            <span>إعدادات وتخصيص النظام</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-6 space-y-4 overflow-y-auto text-xs sm:text-sm flex-1">

          {/* Setup Store Wizard Banner Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-cyan-600/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-300">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>إعداد هوية المؤسسة (Setup Wizard)</span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>المؤسسة الحالية:</span>
                {isImageSrc(storeInfo?.logo) ? (
                  <img src={storeInfo.logo} alt="logo" className="w-4 h-4 rounded object-cover inline-block" />
                ) : (
                  <span>{storeInfo?.logo}</span>
                )}
                <strong className="text-white">{storeInfo?.name}</strong>
              </p>
            </div>

            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 transition flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
            >
              <Wand2 className="w-4 h-4" />
              <span>تعديل بيانات المؤسسة</span>
            </button>
          </div>

          {/* System Deployment Scope Option */}
          <div className="space-y-2.5">
            <label className="font-extrabold text-white text-sm block">
              🎯 نمط تسليم المشروع للعميل (Delivery Scope):
            </label>
            <p className="text-xs text-slate-400">
              يمكنك تخصيص النظام ليعمل كـ صيدلية فقط، أو سوبرماركت فقط، أو نظام مدمج شامل:
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => setSystemScope('full_hybrid')}
                className={`p-3 rounded-2xl border text-right transition flex items-center justify-between ${
                  systemScope === 'full_hybrid'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-white">نظام مدمج شامل (Full Hybrid)</h4>
                    <p className="text-[11px] text-slate-400">دعم كامل للصيدلية والسوبرماركت والتحويل بينهما بحرية</p>
                  </div>
                </div>
                {systemScope === 'full_hybrid' && <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />}
              </button>

              <button
                onClick={() => setSystemScope('pharmacy_only')}
                className={`p-3 rounded-2xl border text-right transition flex items-center justify-between ${
                  systemScope === 'pharmacy_only'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    💊
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-white">صيدلية منفصلة فقط (Pharmacy Only)</h4>
                    <p className="text-[11px] text-slate-400">إخفاء خيارات الماركت كلياً والتركيز على الأدوية والروشتات</p>
                  </div>
                </div>
                {systemScope === 'pharmacy_only' && <Check className="w-5 h-5 text-cyan-400 flex-shrink-0" />}
              </button>

              <button
                onClick={() => setSystemScope('market_only')}
                className={`p-3 rounded-2xl border text-right transition flex items-center justify-between ${
                  systemScope === 'market_only'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    🛒
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-white">سوبرماركت منفصل فقط (Market Only)</h4>
                    <p className="text-[11px] text-slate-400">إخفاء خيارات الصيدلية والتركيز على الماركت والميزان والتلاجة</p>
                  </div>
                </div>
                {systemScope === 'market_only' && <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              </button>
            </div>
          </div>

          {/* Al-Maida Section Feature Toggle */}
          {systemScope !== 'pharmacy_only' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-amber-300">قسم المائدة والتلاجة (Deli Counter)</h4>
                    <p className="text-[11px] text-slate-400">تفعيل تبويب خاص للأجبان واللانشون بكسور الأوزان</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={enableAlMaida}
                  onChange={(e) => setEnableAlMaida(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer flex-shrink-0"
                />
              </div>
            </div>
          )}

          {/* Data Backup & Restore Section */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-extrabold text-sm text-white">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>النسخ الاحتياطي واستعادة البيانات</span>
            </div>
            <p className="text-[11px] text-slate-400">
              احفظ نسخة من كل بيانات النظام (المنتجات بصورها، المبيعات، العملاء، الإعدادات) أو استعدها لاحقاً.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-500/25 transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>تصدير نسخة</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>استعادة ملف</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            {backupMessage && (
              <p className="text-[11px] font-bold text-slate-300">{backupMessage}</p>
            )}

            {!confirmingReset ? (
              <button
                onClick={() => setConfirmingReset(true)}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط المصنع (مسح كل البيانات)</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2">
                <p className="text-[11px] font-bold text-rose-300 text-center">
                  هل أنت متأكد من مسح كافة المنتجات والمبيعات والعودة للإعدادات الافتراضية؟
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    تراجع
                  </button>
                  <button
                    onClick={resetAllData}
                    className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-black text-xs hover:bg-rose-500 keep-white"
                  >
                    نعم، مسح الكل
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 text-left flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 shadow-md transition"
          >
            تأكيد وإغلاق الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
