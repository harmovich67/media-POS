import React, { useState, useRef } from 'react';
import { usePOS } from '../../context/POSContext';
import { Building2, Check, ArrowRight, ArrowLeft, X, ShieldCheck, Upload } from 'lucide-react';
import { compressProductImage, isImageSrc } from '../../utils/helpers';

export default function StoreSetupWizardModal({ onClose }) {
  const { storeInfo, setStoreInfo, setSystemScope, systemScope, enableAlMaida, setEnableAlMaida, notify } = usePOS();
  const logoInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: storeInfo?.name || 'صيدلية وفارما ماركت PRO',
    logo: storeInfo?.logo || '💊',
    phone: storeInfo?.phone || '01000000000',
    taxNo: storeInfo?.taxNo || 'TAX-990-123',
    address: storeInfo?.address || 'القاهرة - شارع التحرير',
    receiptFooter: storeInfo?.receiptFooter || 'نتمنى لكم دوام الصحة والعافية وشكراً لزيارتكم!',
    scope: systemScope || 'full_hybrid',
    enableAlMaida: enableAlMaida ?? true
  });

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await compressProductImage(file, 256, 0.85);
      setFormData((prev) => ({ ...prev, logo: dataUrl }));
      notify('تم رفع شعار المؤسسة بنجاح', 'success');
    } catch (err) {
      notify(err.message || 'تعذر رفع الشعار', 'error');
    }
    e.target.value = '';
  };

  const handleFinish = (e) => {
    e.preventDefault();
    setStoreInfo({
      name: formData.name,
      logo: formData.logo,
      phone: formData.phone,
      taxNo: formData.taxNo,
      address: formData.address,
      receiptFooter: formData.receiptFooter
    });
    setSystemScope(formData.scope);
    setEnableAlMaida(formData.enableAlMaida);
    notify('تم حفظ إعدادات المؤسسة بنجاح', 'success');
    onClose();
  };

  const EMOJI_LOGOS = ['💊', '🏥', '⚕️', '🩺', '🛒', '🛍️', '🏬', '🌟', '🍀'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/90 backdrop-blur-md font-sans overflow-y-auto animate-modal-backdrop">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94dvh] animate-modal-pop">

        {/* Wizard Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-black text-sm sm:text-lg">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            <span>معالج إعداد المؤسسة الجديدة</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="bg-slate-900/60 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold flex-shrink-0">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold">1</span>
            <span>النشاط</span>
          </div>

          <div className={`h-0.5 flex-1 mx-2 ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />

          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold">2</span>
            <span>الهوية</span>
          </div>

          <div className={`h-0.5 flex-1 mx-2 ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`} />

          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold">3</span>
            <span>الفاتورة</span>
          </div>
        </div>

        {/* Wizard Step Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-white text-sm sm:text-base">الخطوة 1: حدد نوع نشاط المؤسسة الجديدة 🎯</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  اختر نمط التشغيل المناسب ليقوم النظام بتخصيص الواجهات والخصائص تلقائياً:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, scope: 'pharmacy_only' })}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-right transition flex items-center justify-between ${
                    formData.scope === 'pharmacy_only'
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xl flex-shrink-0">
                      💊
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-white">صيدلية منفصلة فقط (Pharmacy POS)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">تخصيص الأدوية، الروشتات، التشغيلات، وتواريخ الانتهاء</p>
                    </div>
                  </div>
                  {formData.scope === 'pharmacy_only' && <Check className="w-5 h-5 text-cyan-400 flex-shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, scope: 'market_only' })}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-right transition flex items-center justify-between ${
                    formData.scope === 'market_only'
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xl flex-shrink-0">
                      🛒
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-white">سوبرماركت منفصل فقط (Market POS)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">تخصيص البقالة، الأغذية، كسور الميزان، وقسم المائدة</p>
                    </div>
                  </div>
                  {formData.scope === 'market_only' && <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, scope: 'full_hybrid' })}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-right transition flex items-center justify-between ${
                    formData.scope === 'full_hybrid'
                      ? 'bg-purple-500/20 border-purple-500/60 text-white shadow-lg shadow-purple-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-xl flex-shrink-0">
                      ⚡
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-white">نظام مدمج شامل (Full Hybrid)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">تشغيل الصيدلية والسوبرماركت مع إمكانية التحويل المباشر</p>
                    </div>
                  </div>
                  {formData.scope === 'full_hybrid' && <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-white text-sm sm:text-base">الخطوة 2: الاسم والعنوان والشعار 🏷️</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  أدخل البيانات التجارية للمؤسسة لتظهر بالهيدر والفواتير:
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">اسم الصيدلية / الماركت التجاري:</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: صيدلية د. أحمد فؤاد / سوبرماركت البركة"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 block">الشعار (أيقونة أو صورة):</label>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-500/25"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة شعار</span>
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />
                </div>

                {isImageSrc(formData.logo) && (
                  <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950 border border-emerald-500/30">
                    <img src={formData.logo} alt="store logo" className="w-12 h-12 rounded-xl object-cover" />
                    <span className="text-xs text-emerald-300 font-bold flex-1">تم رفع شعار مخصص للمؤسسة</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logo: '💊' })}
                      className="text-xs text-rose-400 font-bold px-2 py-1 rounded-lg bg-rose-500/10"
                    >
                      إزالة
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {EMOJI_LOGOS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, logo: emoji })}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border text-xl flex items-center justify-center transition ${
                        formData.logo === emoji
                          ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">رقم الهاتف للتواصل:</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01000000000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">العنوان والتفاصيل:</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="القاهرة - شارع الطيران"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-white text-sm sm:text-base">الخطوة 3: بيانات الفاتورة والختام 📄</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ضبط ملاحظات الفواتير المطبوعة والرقم الضريبي والإنهاء:
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">الرقم الضريبي / السجل التجاري:</label>
                <input
                  type="text"
                  value={formData.taxNo}
                  onChange={(e) => setFormData({ ...formData, taxNo: e.target.value })}
                  placeholder="TAX-990-123"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">رسالة وملاحظة أسفل الفاتورة:</label>
                <textarea
                  rows="3"
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  placeholder="مثال: نتمنى لكم الشفاء العاجل / يوماً سعيداً ونتطلع لخدمتكم دائماً!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 resize-none text-xs"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <span className="font-bold text-emerald-400 block">ملخص المؤسسة الجاهزة للتسليم:</span>
                <p className="flex items-center gap-1.5">
                  <strong>الاسم:</strong>
                  {isImageSrc(formData.logo) ? (
                    <img src={formData.logo} alt="logo" className="w-4 h-4 rounded object-cover" />
                  ) : (
                    <span>{formData.logo}</span>
                  )}
                  <span>{formData.name}</span>
                </p>
                <p>
                  • <strong>النمط المعتمد:</strong>{' '}
                  {formData.scope === 'pharmacy_only'
                    ? '💊 صيدلية منفصلة'
                    : formData.scope === 'market_only'
                    ? '🛒 سوبرماركت منفصل'
                    : '⚡ مدمج شامل'}
                </p>
                <p>• <strong>الهاتف والعنوان:</strong> {formData.phone} - {formData.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Navigation Actions Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 transition flex items-center gap-1.5 shadow-md"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-cyan-400 transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>حفظ وإطلاق المؤسسة 🚀</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
