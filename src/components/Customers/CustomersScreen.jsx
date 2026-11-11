import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Gift,
  BookOpen,
  Banknote,
  Smartphone,
  X,
  CheckCircle2,
  Wallet,
  Edit,
  Trash2,
  ShoppingCart
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function CustomersScreen() {
  const {
    customers,
    salesHistory,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    settleCustomerDebt,
    setSelectedCustomer,
    setActiveTab,
    triggerAudio,
    notify
  } = usePOS();

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPoints, setFormPoints] = useState('0');

  const [settleTarget, setSettleTarget] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('cash');

  const [deleteTarget, setDeleteTarget] = useState(null);

  const registeredCustomers = customers.filter((c) => c.id !== 'c1');
  const totalDebt = registeredCustomers.reduce((acc, c) => acc + (c.debt || 0), 0);
  const totalPoints = registeredCustomers.reduce((acc, c) => acc + (c.points || 0), 0);

  const filtered = registeredCustomers.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term));
  });

  const customerStats = (id) => {
    const sales = salesHistory.filter((s) => !s.isSettlement && !s.returned && s.customer?.id === id);
    const settlements = salesHistory.filter((s) => s.isSettlement && !s.returned && s.customer?.id === id);
    return {
      invoices: sales.length,
      spent: sales.reduce((acc, s) => acc + s.total, 0),
      settled: settlements.reduce((acc, s) => acc + s.total, 0),
      lastSale: sales[0]?.date || null
    };
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormPoints('0');
    setIsAddOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone || '');
    setFormPoints(String(c.points || 0));
    setIsAddOpen(true);
  };

  const handleSaveCustomer = () => {
    if (!formName.trim()) {
      notify('يرجى كتابة اسم العميل', 'warning');
      return;
    }
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: formName.trim(),
        phone: formPhone.trim(),
        points: Math.max(0, Number(formPoints) || 0)
      });
    } else {
      addCustomer({ name: formName, phone: formPhone });
    }
    triggerAudio('beep');
    setIsAddOpen(false);
  };

  const handleOpenSettle = (customer) => {
    setSettleTarget(customer);
    setSettleAmount(String(customer.debt));
    setSettleMethod('cash');
  };

  const handleConfirmSettle = () => {
    const amt = Number(settleAmount) || 0;
    if (amt <= 0) {
      notify('يرجى إدخال مبلغ صحيح أكبر من صفر', 'warning');
      return;
    }
    const record = settleCustomerDebt(settleTarget.id, amt, settleMethod);
    if (record) {
      setSettleTarget(null);
      setSettleAmount('');
    } else {
      notify('تعذر تنفيذ التحصيل — تحقق من المبلغ المدخل', 'error');
    }
  };

  const handleStartOrderForCustomer = (c) => {
    setSelectedCustomer(c);
    setActiveTab('pos');
    notify(`تم تحديد "${c.name}" للفاتورة الحالية`, 'info');
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            <span>إدارة العملاء والولاء والآجل</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400">
            سجل العملاء، نقاط الولاء، ومتابعة وتحصيل المديونيات
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 self-stretch sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block">العملاء المسجلون</span>
          <span className="text-lg sm:text-2xl font-black text-white">{registeredCustomers.length} عميل</span>
          <span className="text-[10px] text-slate-500 block">بخلاف العميل النقدي العام</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-amber-500/30 bg-amber-500/5 space-y-1">
          <span className="text-[11px] sm:text-xs text-amber-400 font-bold flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            إجمالي المديونيات
          </span>
          <span className="text-lg sm:text-2xl font-black text-amber-300">{formatCurrency(totalDebt)}</span>
          <span className="text-[10px] text-amber-400/80 block">حسابات آجلة لم تُحصّل</span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-3 sm:p-4 rounded-2xl glass-panel border border-purple-500/30 bg-purple-500/5 space-y-1">
          <span className="text-[11px] sm:text-xs text-purple-400 font-bold flex items-center gap-1">
            <Gift className="w-3.5 h-3.5" />
            إجمالي نقاط الولاء
          </span>
          <span className="text-lg sm:text-2xl font-black text-purple-300">{totalPoints} نقطة</span>
          <span className="text-[10px] text-purple-400/80 block">كل 10 نقاط = 1 ج.م خصم</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Mobile Cards View */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 glass-panel rounded-2xl">
            لا يوجد عملاء مطابقون للبحث
          </div>
        ) : (
          filtered.map((c) => {
            const stats = customerStats(c.id);
            return (
              <div key={c.id} className="p-3.5 rounded-2xl glass-panel border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-sm font-black flex-shrink-0">
                      {c.name.trim().charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white truncate">{c.name}</h3>
                      <p className="text-[11px] font-mono text-slate-400" dir="ltr">{c.phone || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-300"
                      title="تعديل"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-800/70">
                  <span className="px-2 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold inline-flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    {c.points} نقطة
                  </span>
                  <span
                    className={`font-black px-2 py-1 rounded-xl ${
                      c.debt > 0
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    مديونية: {formatCurrency(c.debt || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{stats.invoices} فاتورة · {formatCurrency(stats.spent)}</span>
                  {stats.lastSale && <span>{formatDate(stats.lastSale)}</span>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartOrderForCustomer(c)}
                    className="flex-1 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>فاتورة جديدة</span>
                  </button>
                  <button
                    onClick={() => handleOpenSettle(c)}
                    disabled={c.debt <= 0}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                      c.debt > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>تحصيل آجل</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Customers Table */}
      <div className="hidden md:block glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-bold">
              <tr>
                <th className="p-3.5">العميل</th>
                <th className="p-3.5">الهاتف</th>
                <th className="p-3.5">نقاط الولاء</th>
                <th className="p-3.5">المديونية</th>
                <th className="p-3.5">فواتير / إجمالي التعامل</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    لا يوجد عملاء مطابقون للبحث
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const stats = customerStats(c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-sm font-black">
                            {c.name.trim().charAt(0)}
                          </span>
                          <div>
                            <span>{c.name}</span>
                            {stats.lastSale && (
                              <span className="block text-[10px] text-slate-500 font-normal">
                                آخر فاتورة: {formatDate(stats.lastSale)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400" dir="ltr">
                        {c.phone || '-'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold inline-flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          {c.points} نقطة
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-black px-2.5 py-1 rounded-xl inline-block ${
                            c.debt > 0
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {formatCurrency(c.debt || 0)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-300 font-bold">{stats.invoices} فاتورة</span>
                        <span className="text-slate-500 block text-[10px]">
                          {formatCurrency(stats.spent)} {stats.settled > 0 ? `| حُصّل: ${formatCurrency(stats.settled)}` : ''}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartOrderForCustomer(c)}
                            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 text-xs font-bold inline-flex items-center gap-1"
                            title="تحديد العميل لبدء فاتورة جديدة"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>فاتورة</span>
                          </button>
                          <button
                            onClick={() => handleOpenSettle(c)}
                            disabled={c.debt <= 0}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 ${
                              c.debt > 0
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                                : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>تحصيل</span>
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="تعديل"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-modal-backdrop">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-modal-pop">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-base">
                <UserPlus className="w-5 h-5" />
                <span>{editingCustomer ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد'}</span>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">اسم العميل *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: أ. محمود سامي"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              {editingCustomer && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-purple-400" />
                    نقاط الولاء
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPoints}
                    onChange={(e) => setFormPoints(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-purple-300 font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => setIsAddOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveCustomer}
                className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingCustomer ? 'حفظ التعديلات' : 'حفظ العميل'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debt Settlement Modal */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-modal-backdrop">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-modal-pop">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm sm:text-base">
                <Wallet className="w-5 h-5" />
                <span>تحصيل دفعة آجلة — {settleTarget.name}</span>
              </div>
              <button
                onClick={() => setSettleTarget(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-sm">
                <span className="text-slate-300 font-bold">المديونية الحالية:</span>
                <span className="font-black text-amber-300 text-lg">{formatCurrency(settleTarget.debt)}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">المبلغ المحصّل الآن (ج.م):</label>
                  <button
                    onClick={() => setSettleAmount(String(settleTarget.debt))}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                  >
                    سداد كامل المديونية
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max={settleTarget.debt}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-white focus:outline-none focus:border-amber-500 text-center"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">طريقة التحصيل:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettleMethod('cash')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      settleMethod === 'cash'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>نقدي (كاش)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleMethod('instapay')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      settleMethod === 'instapay'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>إنستاباي / محفظة</span>
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                سيتم خصم المبلغ من مديونية العميل وتسجيل حركة تحصيل في سجل المبيعات والوردية الحالية.
              </p>
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => setSettleTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmSettle}
                className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-orange-500 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد التحصيل ({formatCurrency(Math.min(Number(settleAmount) || 0, settleTarget.debt))})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-modal-backdrop">
          <div className="w-full max-w-sm glass-panel rounded-3xl border border-rose-500/40 shadow-2xl p-5 space-y-4 text-center animate-modal-pop">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">حذف العميل "{deleteTarget.name}"؟</h3>
              <p className="text-xs text-slate-400 mt-1">
                {deleteTarget.debt > 0
                  ? `تنبيه: هذا العميل عليه مديونية بقيمة ${formatCurrency(deleteTarget.debt)} ولا يمكن حذفه قبل تحصيلها.`
                  : 'سيتم إزالة العميل من قائمة العملاء المسجلين.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                تراجع
              </button>
              {deleteTarget.debt <= 0 && (
                <button
                  onClick={() => {
                    deleteCustomer(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-xs hover:from-rose-400 hover:to-red-500"
                >
                  تأكيد الحذف
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
