import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Lock, Eye, EyeOff, ShieldCheck, Sparkles, User, Pill, ShoppingBag, Crown } from 'lucide-react';
import { isImageSrc } from '../../utils/helpers';

export default function LoginScreen({ onLoginSuccess }) {
  const { storeInfo } = usePOS();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preset Accounts
  const ACCOUNTS = {
    admin: {
      username: 'admin',
      password: '123@@##$$456Hh',
      role: 'admin',
      name: 'المدير العام (الأدمن)',
      scope: 'full_hybrid',
      isSandbox: false
    },
    pharma: {
      username: 'pharma',
      password: '123',
      role: 'pharmacy',
      name: 'كاشير الصيدلية (ديمو)',
      scope: 'pharmacy_only',
      isSandbox: true
    },
    market: {
      username: 'market',
      password: '123',
      role: 'market',
      name: 'كاشير السوبرماركت (ديمو)',
      scope: 'market_only',
      isSandbox: true
    }
  };

  const handleSelectDemoAccount = (accKey) => {
    const acc = ACCOUNTS[accKey];
    if (acc) {
      setUsername(acc.username);
      // For security, do not auto-fill admin password
      setPassword(accKey === 'admin' ? '' : acc.password);
      setErrorMessage('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    setTimeout(() => {
      const matched = Object.values(ACCOUNTS).find(
        (acc) => acc.username.toLowerCase() === username.toLowerCase().trim() && acc.password === password
      );

      if (matched) {
        onLoginSuccess(matched);
      } else {
        setErrorMessage('اسم المستخدم أو كلمة المرور غير صحيحة!');
        setIsSubmitting(false);
      }
    }, 250);
  };

  const logoVal = storeInfo?.logo || '🔒';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 backdrop-blur-xl font-sans overflow-y-auto">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden p-5 sm:p-8 space-y-4 sm:space-y-5 relative my-auto max-h-[95dvh] overflow-y-auto">

        {/* Top Glow & Store Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-2xl shadow-xl shadow-emerald-500/20 text-white animate-pulse-glow overflow-hidden keep-white">
            {isImageSrc(logoVal) ? (
              <img src={logoVal} alt="logo" className="w-full h-full object-cover" />
            ) : (
              logoVal
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>{storeInfo?.name || 'فارما ماركت'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              منظومة الكاشير وإدارة الصيدليات والسوبرماركت
            </p>
          </div>
        </div>

        {/* Quick Demo Preset Chips Selector */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block text-center">
            ⚡ اختر حساب تجريبي للدخول بنقرة واحدة:
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('admin')}
              className={`p-2 rounded-2xl border text-right transition flex flex-col items-center justify-center gap-1 ${
                username === 'admin'
                  ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crown className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-[11px]">الأدمن</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemoAccount('pharma')}
              className={`p-2 rounded-2xl border text-right transition flex flex-col items-center justify-center gap-1 ${
                username === 'pharma'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pill className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-[11px]">ديمو صيدلية</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemoAccount('market')}
              className={`p-2 rounded-2xl border text-right transition flex flex-col items-center justify-center gap-1 ${
                username === 'market'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-[11px]">ديمو ماركت</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300">
              اسم المستخدم (Username)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoComplete="off"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="أدخل اسم المستخدم..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pr-4 pl-10 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300">
              كلمة المرور 🔑
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder={username === 'admin' ? 'أدخل كلمة مرور الأدمن الخاصة...' : 'أدخل كلمة المرور...'}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pr-4 pl-10 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black text-sm hover:from-emerald-400 hover:to-cyan-400 shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{isSubmitting ? 'جاري تسجيل الدخول...' : 'دخول النظام'}</span>
          </button>
        </form>

        {/* Account Info Legend Note */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p className="font-bold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ملاحظات الدخول والتجربة:</span>
          </p>
          <p>• <strong className="text-purple-300">حساب الأدمن:</strong> صلاحيات كاملة + الإعدادات ⚙️</p>
          <p>• <strong className="text-cyan-300">حسابات التجربة (ديمو):</strong> كلمة المرور `123` (وضع تجريبي آمن)</p>
        </div>
      </div>
    </div>
  );
}
