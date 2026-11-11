import React from 'react';
import { usePOS } from '../context/POSContext';
import {
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Clock,
  BarChart3,
  Sparkles,
  UtensilsCrossed,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Settings,
  Lock,
  X
} from 'lucide-react';

export default function Navigation({ isMobileOpen, onToggleMobile, onCloseMobile, onOpenSettings, onLockSession }) {
  const {
    activeTab,
    setActiveTab,
    cart,
    enableAlMaida,
    systemScope,
    activeMode,
    soundEnabled,
    setSoundEnabled,
    theme,
    toggleTheme,
    currentUser,
    shift
  } = usePOS();

  const showAlMaidaTab = enableAlMaida && systemScope !== 'pharmacy_only' && activeMode !== 'pharmacy';

  const navItems = [
    { id: 'pos', label: 'نقطة البيع (الكاشير)', shortLabel: 'الكاشير', icon: ShoppingCart, badge: cart.length > 0 ? cart.length : null },
    ...(showAlMaidaTab ? [{ id: 'almaida', label: 'قسم المائدة والتلاجة', shortLabel: 'المائدة', icon: UtensilsCrossed }] : []),
    { id: 'inventory', label: 'إدارة المخزون', shortLabel: 'المخزون', icon: Package },
    { id: 'sales', label: 'سجل المبيعات', shortLabel: 'المبيعات', icon: Receipt },
    { id: 'customers', label: 'العملاء والآجل', shortLabel: 'العملاء', icon: Users },
    { id: 'shift', label: 'إغلاق الوردية', shortLabel: 'الوردية', icon: Clock },
    { id: 'reports', label: 'التقارير والتحليلات', shortLabel: 'التقارير', icon: BarChart3 }
  ];

  // Primary 4 items for compact phone bottom bar + "المزيد" drawer trigger
  const mobileBarItems = [
    navItems.find((i) => i.id === 'pos'),
    showAlMaidaTab ? navItems.find((i) => i.id === 'almaida') : navItems.find((i) => i.id === 'customers'),
    navItems.find((i) => i.id === 'inventory'),
    navItems.find((i) => i.id === 'sales'),
  ].filter(Boolean);

  const isMoreTabActive = !mobileBarItems.some((i) => i.id === activeTab);

  const handleSelect = (id) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 glass-panel border-l border-slate-200 dark:border-slate-800/80 p-3 min-h-0 flex-shrink-0">
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 keep-white'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-800/10 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Helper Banner */}
        <div className="mt-auto p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>اختصارات السريعة (F-Keys)</span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1">
            <p>• <span className="text-slate-200 font-bold">F2</span> : التركيز على الباركود</p>
            <p>• <span className="text-slate-200 font-bold">F4</span> : إتمام الدفع</p>
            <p>• <span className="text-slate-200 font-bold">F8</span> : تعليق الفاتورة</p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] glass-panel p-4 transition-transform duration-300 md:hidden flex flex-col ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800">
          <div>
            <h2 className="font-extrabold text-base text-white">القائمة الرئيسية</h2>
            <p className="text-[11px] text-slate-400">{currentUser?.name || shift.cashierName}</p>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md keep-white'
                    : 'text-slate-300 hover:bg-slate-800/20 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Quick Controls inside Drawer */}
        <div className="pt-3 mt-3 border-t border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold flex items-center justify-center gap-1.5"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
              <span>{soundEnabled ? 'الصوت مفعّل' : 'الصوت مكتوم'}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold flex items-center justify-center gap-1.5"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span>{theme === 'dark' ? 'النهاري' : 'الداكن'}</span>
            </button>
          </div>

          <div className="flex gap-2 text-xs">
            {onOpenSettings && currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  onCloseMobile();
                  onOpenSettings();
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span>الإعدادات</span>
              </button>
            )}
            {onLockSession && (
              <button
                onClick={() => {
                  onCloseMobile();
                  onLockSession();
                }}
                className="flex-1 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold flex items-center justify-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>قفل النظام</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed 5 clean slots - never overflows on small phones) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-panel border-t border-slate-200 dark:border-slate-800 px-1.5 py-1 pb-safe flex items-center justify-between">
        {mobileBarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition ${
                isActive ? 'text-emerald-400 font-extrabold bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && (
                  <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] truncate max-w-full">{item.shortLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => (onToggleMobile ? onToggleMobile() : onCloseMobile())}
          className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition ${
            isMoreTabActive || isMobileOpen
              ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px]">المزيد</span>
        </button>
      </nav>
    </>
  );
}
