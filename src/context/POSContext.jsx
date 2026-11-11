import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS } from '../data/initialData';
import { playBeepSound, playSuccessSound, playErrorSound } from '../utils/audio';
import { safeParse, getExpiryStatus, calcEarnedPoints, POINTS_REDEEM_RATE } from '../utils/helpers';

const POSContext = createContext();

const BACKUP_KEYS = [
  'pos_products', 'pos_customers', 'pos_sales_history', 'pos_shift',
  'pos_shift_history', 'pos_store_info', 'pos_mode', 'pos_system_scope',
  'pos_admin_scope', 'pos_enable_almaida', 'pos_cart', 'pos_cart_discount',
  'pos_held_carts', 'pos_sound', 'pos_theme'
];

function nextSequenceId(records, prefix, predicate) {
  const maxNum = records.reduce((max, rec) => {
    if (predicate && !predicate(rec)) return max;
    const match = typeof rec.id === 'string' && rec.id.startsWith(prefix)
      ? parseInt(rec.id.slice(prefix.length), 10)
      : NaN;
    return Number.isFinite(match) && match > max ? match : max;
  }, 0);
  return prefix + String(maxNum + 1).padStart(5, '0');
}

export function POSProvider({ children }) {
  // Toast notifications queue
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message, type = 'info') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const safeSetStorage = useCallback((key, value) => {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Storage error for key:', key, err);
      notify('مساحة التخزين بالمتصفح ممتلئة — يفضل تقليل أحجام الصور أو تصدير نسخة احتياطية', 'warning');
      return false;
    }
  }, [notify]);

  // Store operational mode: 'market' (سوبرماركت), 'pharmacy' (صيدلية), or 'hybrid' (مدمج)
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('pos_mode') || 'pharmacy';
  });

  // Dark/Light Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pos_theme') || 'dark';
  });

  // Active View / Tab: 'pos', 'almaida', 'inventory', 'sales', 'shift', 'customers', 'reports'
  const [activeTab, setActiveTab] = useState('pos');

  // Products state
  const [products, setProducts] = useState(() => {
    return safeParse(localStorage.getItem('pos_products'), INITIAL_PRODUCTS);
  });

  // Customers state
  const [customers, setCustomers] = useState(() => {
    return safeParse(localStorage.getItem('pos_customers'), INITIAL_CUSTOMERS);
  });
  const [selectedCustomer, setSelectedCustomer] = useState(() => {
    const list = safeParse(localStorage.getItem('pos_customers'), INITIAL_CUSTOMERS);
    return list[0] || INITIAL_CUSTOMERS[0];
  });

  // Cart state (persisted so a refresh never loses an active invoice)
  const [cart, setCart] = useState(() => {
    return safeParse(localStorage.getItem('pos_cart'), []);
  });
  const [cartDiscount, setCartDiscountRaw] = useState(() => {
    return Number(safeParse(localStorage.getItem('pos_cart_discount'), 0)) || 0;
  });

  // Held carts list (persisted)
  const [heldCarts, setHeldCarts] = useState(() => {
    return safeParse(localStorage.getItem('pos_held_carts'), []);
  });

  // Active Shift State
  const [shift, setShift] = useState(() => {
    const saved = safeParse(localStorage.getItem('pos_shift'), null);
    if (saved) {
      return { drawerMovements: [], ...saved };
    }
    return {
      isOpen: true,
      cashierName: 'محمد أحمد (الكاشير)',
      startTime: new Date().toISOString(),
      startCash: 500.00,
      totalSales: 0,
      salesCount: 0,
      drawerMovements: [],
    };
  });

  // Closed Shifts (Z-Reports) History
  const [shiftHistory, setShiftHistory] = useState(() => {
    return safeParse(localStorage.getItem('pos_shift_history'), []);
  });

  // Completed Sales History
  const [salesHistory, setSalesHistory] = useState(() => {
    return safeParse(localStorage.getItem('pos_sales_history'), []);
  });

  // Prescription / Patient note info for pharmacy checkout
  const [prescriptionNote, setPrescriptionNote] = useState({
    doctorName: '',
    patientName: '',
    instructions: ''
  });

  // Store & Organization Profile Info
  const [storeInfo, setStoreInfo] = useState(() => {
    return safeParse(localStorage.getItem('pos_store_info'), {
      name: 'فارما ماركت PRO',
      logo: '💊',
      phone: '01000000000',
      taxNo: 'TAX-990-123',
      address: 'القاهرة - شارع التحرير',
      receiptFooter: 'نتمنى لكم دوام الصحة والعافية وشكراً لزيارتكم!'
    });
  });

  // Current User Account State
  const [currentUser, setCurrentUser] = useState(() => {
    return safeParse(sessionStorage.getItem('pos_current_user'), null);
  });

  // Admin's saved scope preference (preserved even if someone tests a sandbox demo account)
  const [adminScope, setAdminScope] = useState(() => {
    return localStorage.getItem('pos_admin_scope') || localStorage.getItem('pos_system_scope') || 'full_hybrid';
  });

  // System Scope (Stand-alone delivery presets: 'full_hybrid', 'pharmacy_only', 'market_only')
  const [systemScope, setSystemScopeState] = useState(() => {
    return localStorage.getItem('pos_system_scope') || 'full_hybrid';
  });

  const setSystemScope = useCallback((nextScope) => {
    setSystemScopeState(nextScope);
    if (!currentUser || currentUser.role === 'admin') {
      setAdminScope(nextScope);
      try {
        localStorage.setItem('pos_admin_scope', nextScope);
      } catch {}
    }
  }, [currentUser]);

  // Option for "قسم المائدة والتلاجة" (Deli Counter tab in Supermarket)
  const [enableAlMaida, setEnableAlMaida] = useState(() => {
    return safeParse(localStorage.getItem('pos_enable_almaida'), true);
  });

  // Audio mute setting (persisted)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return safeParse(localStorage.getItem('pos_sound'), true);
  });

  // Auto-initialize from client preset config.json if available
  useEffect(() => {
    if (!localStorage.getItem('pos_initialized')) {
      fetch('/config.json')
        .then((res) => (res.ok ? res.json() : null))
        .then((cfg) => {
          if (cfg) {
            if (cfg.mode) {
              setActiveMode(cfg.mode);
              localStorage.setItem('pos_mode', cfg.mode);
            }
            if (cfg.systemScope) {
              setSystemScopeState(cfg.systemScope);
              setAdminScope(cfg.systemScope);
              localStorage.setItem('pos_system_scope', cfg.systemScope);
              localStorage.setItem('pos_admin_scope', cfg.systemScope);
            }
            if (cfg.storeInfo) {
              setStoreInfo((prev) => {
                const updated = { ...prev, ...cfg.storeInfo };
                localStorage.setItem('pos_store_info', JSON.stringify(updated));
                return updated;
              });
            }
            localStorage.setItem('pos_initialized', 'true');
          }
        })
        .catch(() => {});
    }
  }, []);

  // Sync Current User Role & Scope cleanly
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('pos_current_user', JSON.stringify(currentUser));
      if (currentUser.role === 'pharmacy') {
        setSystemScopeState('pharmacy_only');
        setActiveMode('pharmacy');
      } else if (currentUser.role === 'market') {
        setSystemScopeState('market_only');
        setActiveMode('market');
      } else if (currentUser.role === 'admin') {
        setSystemScopeState(adminScope);
        if (adminScope === 'pharmacy_only') setActiveMode('pharmacy');
        else if (adminScope === 'market_only') setActiveMode('market');
      }
    }
  }, [currentUser, adminScope]);

  // Keep activeTab valid when Al-Maida is hidden due to mode/scope/settings change
  useEffect(() => {
    const alMaidaAllowed = enableAlMaida && systemScope !== 'pharmacy_only' && activeMode !== 'pharmacy';
    if (activeTab === 'almaida' && !alMaidaAllowed) {
      setActiveTab('pos');
    }
  }, [activeTab, enableAlMaida, systemScope, activeMode]);

  // Save changes to LocalStorage safely
  useEffect(() => {
    safeSetStorage('pos_store_info', storeInfo);
  }, [storeInfo, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_system_scope', systemScope);
    if (systemScope === 'pharmacy_only') {
      setActiveMode('pharmacy');
    } else if (systemScope === 'market_only') {
      setActiveMode('market');
    }
  }, [systemScope, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_enable_almaida', enableAlMaida);
  }, [enableAlMaida, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_mode', activeMode);
  }, [activeMode, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_products', products);
  }, [products, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_customers', customers);
  }, [customers, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_shift', shift);
  }, [shift, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_shift_history', shiftHistory);
  }, [shiftHistory, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_sales_history', salesHistory);
  }, [salesHistory, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_cart', cart);
  }, [cart, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_cart_discount', cartDiscount);
  }, [cartDiscount, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_held_carts', heldCarts);
  }, [heldCarts, safeSetStorage]);

  useEffect(() => {
    safeSetStorage('pos_sound', soundEnabled);
  }, [soundEnabled, safeSetStorage]);

  // Audio helper wrapper
  const triggerAudio = useCallback((type) => {
    if (!soundEnabled) return;
    if (type === 'beep') playBeepSound();
    if (type === 'success') playSuccessSound();
    if (type === 'error') playErrorSound();
  }, [soundEnabled]);

  // Resolve the batch a pharmacy sale should draw from (FEFO, accounting for quantities already in cart)
  const resolveBatch = useCallback((product, preferredBatchNo, currentCart = cart) => {
    if (product.type !== 'pharmacy' || !Array.isArray(product.batches) || product.batches.length === 0) {
      return { batchNo: null, batchInfo: null, remainingInBatch: product.stock };
    }

    const inCartQtyForBatch = (bNo) =>
      currentCart
        .filter((item) => item.id === product.id && item.selectedBatch === bNo)
        .reduce((sum, item) => sum + item.quantity, 0);

    if (preferredBatchNo) {
      const batchInfo = product.batches.find((b) => b.batchNo === preferredBatchNo) || null;
      if (!batchInfo) {
        return { error: 'التشغيلة المحددة غير موجودة لهذا الدواء.' };
      }
      if (getExpiryStatus(batchInfo.expiryDate).status === 'expired') {
        return { error: `التشغيلة ${preferredBatchNo} منتهية الصلاحية ولا يمكن بيعها!` };
      }
      const remaining = Math.max(0, batchInfo.stock - inCartQtyForBatch(preferredBatchNo));
      return { batchNo: preferredBatchNo, batchInfo, remainingInBatch: remaining };
    }

    const sellable = product.batches
      .map((b) => ({
        batch: b,
        remaining: Math.max(0, b.stock - inCartQtyForBatch(b.batchNo)),
      }))
      .filter(({ batch, remaining }) => getExpiryStatus(batch.expiryDate).status !== 'expired' && remaining > 0)
      .sort((a, b) => new Date(a.batch.expiryDate) - new Date(b.batch.expiryDate));

    if (sellable.length === 0) {
      const hasAnyNonExpired = product.batches.some((b) => getExpiryStatus(b.expiryDate).status !== 'expired' && b.stock > 0);
      if (hasAnyNonExpired) {
        return { error: `تم سحب كامل الرصيد المتاح من "${product.name}" في السلة الحالية!` };
      }
      return { error: `كل تشغيلات "${product.name}" منتهية الصلاحية أو نافذة الرصيد!` };
    }

    return {
      batchNo: sellable[0].batch.batchNo,
      batchInfo: sellable[0].batch,
      remainingInBatch: sellable[0].remaining,
    };
  }, [cart]);

  // Add Item to Cart (with FEFO automatic batch assignment & spillover across batches)
  const addToCart = (product, selectedBatch = null, qtyToAdd = 1) => {
    if (!product) return false;

    const liveProduct = products.find((p) => p.id === product.id) || product;

    if (liveProduct.stock <= 0) {
      triggerAudio('error');
      notify(`المنتج "${liveProduct.name}" غير متوفر في المخزون!`, 'error');
      return false;
    }

    const totalAlreadyInCart = cart
      .filter((item) => item.id === liveProduct.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    const minAllowed = liveProduct.minWeight || (liveProduct.isWeighted ? 0.050 : 1);
    let qty = Number(qtyToAdd) || minAllowed;
    if (liveProduct.isWeighted && qty < minAllowed) {
      notify(`أدنى وزن مسموح به لهذا الصنف هو ${minAllowed} كجم (${(minAllowed * 1000).toFixed(0)} جرام)`, 'warning');
      qty = minAllowed;
    }
    qty = Number(qty.toFixed(3));

    if (totalAlreadyInCart + qty > liveProduct.stock + 1e-6) {
      triggerAudio('error');
      notify(`لا يمكن تجاوز الكمية المتاحة بالرصيد (${liveProduct.stock})`, 'error');
      return false;
    }

    const { batchNo, batchInfo, remainingInBatch, error } = resolveBatch(liveProduct, selectedBatch, cart);
    if (error) {
      triggerAudio('error');
      notify(error, 'error');
      return false;
    }

    // If preferred batch was specified and exceeded, notify cleanly
    if (selectedBatch && qty > remainingInBatch) {
      triggerAudio('error');
      notify(`لا يمكن تجاوز رصيد التشغيلة ${selectedBatch} (المتبقي: ${remainingInBatch})`, 'error');
      return false;
    }

    // Standard single-batch allocation (or FEFO spillover when qty > first batch remaining)
    const addAmt = batchInfo && !selectedBatch ? Math.min(qty, remainingInBatch) : qty;

    triggerAudio('beep');
    setCart((prevCart) => {
      let nextCart = [...prevCart];
      let remainingToAllocate = qty;

      if (batchInfo && !selectedBatch && qty > remainingInBatch) {
        // Spill across multiple sellable batches in FEFO order
        let safety = 0;
        while (remainingToAllocate > 0.0001 && safety < 20) {
          safety += 1;
          const res = resolveBatch(liveProduct, null, nextCart);
          if (res.error || !res.batchInfo) break;
          const chunk = Number(Math.min(remainingToAllocate, res.remainingInBatch).toFixed(3));
          if (chunk <= 0) break;
          const idx = nextCart.findIndex((i) => i.id === liveProduct.id && i.selectedBatch === res.batchNo);
          if (idx > -1) {
            nextCart[idx] = { ...nextCart[idx], quantity: Number((nextCart[idx].quantity + chunk).toFixed(3)) };
          } else {
            nextCart.push({
              ...liveProduct,
              quantity: chunk,
              itemDiscount: 0,
              selectedBatch: res.batchNo,
              batchInfo: res.batchInfo,
            });
          }
          remainingToAllocate = Number((remainingToAllocate - chunk).toFixed(3));
        }
        return nextCart;
      }

      const idx = nextCart.findIndex(
        (item) => item.id === liveProduct.id && item.selectedBatch === batchNo
      );
      if (idx > -1) {
        nextCart[idx] = {
          ...nextCart[idx],
          quantity: Number((nextCart[idx].quantity + addAmt).toFixed(3)),
        };
        return nextCart;
      }
      nextCart.push({
        ...liveProduct,
        quantity: addAmt,
        itemDiscount: 0,
        selectedBatch: batchNo,
        batchInfo,
      });
      return nextCart;
    });
    return true;
  };

  // Update Item Quantity in Cart
  const updateCartQuantity = (productId, batchNo, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId, batchNo);
      return;
    }

    const prod = products.find((p) => p.id === productId);
    let targetQty = Number(Number(newQty).toFixed(3));

    if (prod) {
      const minAllowed = prod.minWeight || (prod.isWeighted ? 0.050 : 1);
      if (prod.isWeighted && targetQty < minAllowed) {
        notify(`أدنى كمية مسموح بطلبها من هذا الصنف هي ${minAllowed} كجم (${(minAllowed * 1000).toFixed(0)} جرام)`, 'warning');
        targetQty = minAllowed;
      }
      const otherBatchesQty = cart
        .filter((i) => i.id === productId && i.selectedBatch !== batchNo)
        .reduce((s, i) => s + i.quantity, 0);

      const batch = prod.batches && batchNo ? prod.batches.find((b) => b.batchNo === batchNo) : null;
      const available = batch
        ? Math.min(batch.stock, Math.max(0, prod.stock - otherBatchesQty))
        : Math.max(0, prod.stock - otherBatchesQty);

      if (targetQty > available + 1e-6) {
        triggerAudio('error');
        notify(`الكمية المطلوبة أكبر من الرصيد المتوفر (${available})`, 'error');
        return;
      }
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId && item.selectedBatch === batchNo) {
          return { ...item, quantity: targetQty };
        }
        return item;
      })
    );
  };

  // Remove Item from Cart
  const removeFromCart = (productId, batchNo) => {
    setCart((prev) => prev.filter((item) => !(item.id === productId && item.selectedBatch === batchNo)));
  };

  // Update item discount (clamped so it never exceeds the unit price)
  const updateItemDiscount = (productId, batchNo, discountVal) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId && item.selectedBatch === batchNo) {
          const clamped = Math.min(Math.max(0, Number(discountVal) || 0), item.price);
          return { ...item, itemDiscount: clamped };
        }
        return item;
      })
    );
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setCartDiscountRaw(0);
    setPrescriptionNote({ doctorName: '', patientName: '', instructions: '' });
  };

  // Hold current cart
  const holdCurrentCart = () => {
    if (cart.length === 0) return;
    const newHold = {
      id: 'HOLD-' + Date.now(),
      time: new Date().toLocaleTimeString('ar-EG'),
      customer: selectedCustomer,
      cart: [...cart],
      cartDiscount,
      prescriptionNote: { ...prescriptionNote }
    };
    setHeldCarts((prev) => [...prev, newHold]);
    clearCart();
    triggerAudio('beep');
    notify('تم تعليق الفاتورة بنجاح', 'info');
  };

  // Restore held cart (if active cart has items, auto-hold it first so nothing is lost)
  const restoreHeldCart = (holdId) => {
    const target = heldCarts.find((h) => h.id === holdId);
    if (!target) return;

    let updatedHolds = heldCarts.filter((h) => h.id !== holdId);
    if (cart.length > 0) {
      const currentSnapshot = {
        id: 'HOLD-' + Date.now(),
        time: new Date().toLocaleTimeString('ar-EG'),
        customer: selectedCustomer,
        cart: [...cart],
        cartDiscount,
        prescriptionNote: { ...prescriptionNote }
      };
      updatedHolds = [currentSnapshot, ...updatedHolds];
      notify('تم تعليق الفاتورة الحالية تلقائياً واسترجاع الفاتورة المختارة', 'info');
    }

    setCart(target.cart);
    setCartDiscountRaw(target.cartDiscount || 0);
    if (target.customer) setSelectedCustomer(target.customer);
    setPrescriptionNote(target.prescriptionNote || { doctorName: '', patientName: '', instructions: '' });
    setHeldCarts(updatedHolds);
    triggerAudio('beep');
  };

  // Delete a held cart without restoring it
  const deleteHeldCart = (holdId) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== holdId));
    notify('تم حذف الفاتورة المعلقة', 'info');
  };

  // Calculate totals (overall discount is clamped so the bill never goes negative)
  const subtotal = cart.reduce((acc, item) => {
    const itemPrice = item.price - (item.itemDiscount || 0);
    return acc + itemPrice * item.quantity;
  }, 0);

  const totalDiscount = Math.min(cartDiscount, subtotal);
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  const setCartDiscount = (val) => {
    setCartDiscountRaw(Math.max(0, Number(val) || 0));
  };

  // Complete Payment Process
  const processSale = (paymentMethod, paidAmount, note = '', pointsDiscount = 0) => {
    if (cart.length === 0) return null;
    if (shift.isOpen === false) {
      triggerAudio('error');
      notify('الوردية مغلقة حالياً — يرجى فتح وردية جديدة قبل إصدار فواتير جديدة', 'warning');
      return null;
    }

    const appliedPointsDiscount = Math.min(Math.max(0, Number(pointsDiscount) || 0), grandTotal);
    const finalTotal = Math.max(0, grandTotal - appliedPointsDiscount);

    const invoiceId = nextSequenceId(salesHistory, 'INV-', (s) => !s.isSettlement);
    const cashierName = currentUser?.name || shift.cashierName;
    const paid = Number(paidAmount) || 0;
    const effectivePaid = paymentMethod === 'debt' ? 0 : paymentMethod === 'cash' ? paid : finalTotal;

    const saleRecord = {
      id: invoiceId,
      date: new Date().toISOString(),
      mode: activeMode,
      items: cart.map((item) => ({ ...item, returnedQty: 0 })),
      subtotal,
      discount: totalDiscount,
      pointsDiscount: appliedPointsDiscount,
      total: finalTotal,
      paidAmount: effectivePaid,
      changeDue: paymentMethod === 'cash' ? Math.max(0, effectivePaid - finalTotal) : 0,
      paymentMethod, // 'cash', 'card', 'instapay', 'wallet', 'debt'
      customer: selectedCustomer,
      cashier: cashierName,
      prescriptionNote: { ...prescriptionNote },
      note,
      returned: false,
      returnedAmount: 0,
    };

    // Deduct stock from products and batches
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const cartItems = cart.filter((c) => c.id === prod.id);
        if (cartItems.length === 0) return prod;

        let totalQtyDeducted = 0;
        let updatedBatches = prod.batches ? [...prod.batches] : null;

        cartItems.forEach((cItem) => {
          totalQtyDeducted += cItem.quantity;
          if (updatedBatches && cItem.selectedBatch) {
            updatedBatches = updatedBatches.map((b) => {
              if (b.batchNo === cItem.selectedBatch) {
                return { ...b, stock: Math.max(0, Number((b.stock - cItem.quantity).toFixed(3))) };
              }
              return b;
            });
          }
        });

        return {
          ...prod,
          stock: Math.max(0, Number((prod.stock - totalQtyDeducted).toFixed(3))),
          batches: updatedBatches
        };
      })
    );

    // Update Shift Totals
    setShift((prev) => ({
      ...prev,
      totalSales: prev.totalSales + finalTotal,
      salesCount: prev.salesCount + 1
    }));

    // Add to Sales History
    setSalesHistory((prev) => [saleRecord, ...prev]);

    // Handle Customer Points/Debt
    if (selectedCustomer && selectedCustomer.id !== 'c1') {
      const redeemedPoints = appliedPointsDiscount * POINTS_REDEEM_RATE;
      const earnedPoints = calcEarnedPoints(finalTotal);
      const addedDebt = paymentMethod === 'debt' ? finalTotal : 0;
      const applyUpdate = (c) => ({
        ...c,
        points: Math.max(0, c.points - redeemedPoints + earnedPoints),
        debt: Number((c.debt + addedDebt).toFixed(2))
      });
      setCustomers((prev) => prev.map((c) => (c.id === selectedCustomer.id ? applyUpdate(c) : c)));
      setSelectedCustomer((prev) => (prev && prev.id === selectedCustomer.id ? applyUpdate(prev) : prev));
    }

    triggerAudio('success');
    clearCart();
    return saleRecord;
  };

  // Full or Partial Invoice Return: restore stock/batches, reverse shift & customer effects
  const processReturn = (saleId, returnQuantitiesMap = null) => {
    const sale = salesHistory.find((s) => s.id === saleId);
    if (!sale || sale.returned || sale.isSettlement) return null;

    const keyOf = (item, idx) => `${item.id}::${item.selectedBatch || 'nobatch'}::${idx}`;

    // Build exact per-line return quantities
    const lineReturns = sale.items.map((item, idx) => {
      const alreadyReturned = item.returnedQty || 0;
      const remaining = Math.max(0, Number((item.quantity - alreadyReturned).toFixed(3)));
      if (!returnQuantitiesMap) {
        return remaining;
      }
      const key = keyOf(item, idx);
      const requested = Number(returnQuantitiesMap[key] ?? returnQuantitiesMap[item.id] ?? 0);
      return Math.min(remaining, Math.max(0, Number(requested.toFixed(3))));
    });

    const totalReturningQty = lineReturns.reduce((s, q) => s + q, 0);
    if (totalReturningQty <= 0) {
      notify('يرجى تحديد كمية واحدة على الأقل للإرجاع', 'warning');
      return null;
    }

    const updatedItems = sale.items.map((item, idx) => ({
      ...item,
      returnedQty: Number(((item.returnedQty || 0) + lineReturns[idx]).toFixed(3)),
    }));

    const allReturned = updatedItems.every((item) => item.returnedQty >= item.quantity - 1e-6);
    const alreadyReturnedAmount = sale.returnedAmount || 0;
    const remainingRefundable = Math.max(0, Number((sale.total - alreadyReturnedAmount).toFixed(2)));

    let refundTotal = 0;
    if (allReturned) {
      refundTotal = remainingRefundable;
    } else {
      const returnedItemsSubtotal = sale.items.reduce((acc, item, idx) => {
        const unitNet = item.price - (item.itemDiscount || 0);
        return acc + unitNet * lineReturns[idx];
      }, 0);
      const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
      refundTotal = Math.min(remainingRefundable, Number((returnedItemsSubtotal * ratio).toFixed(2)));
    }

    // Restore stock & batch balances
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        let addBack = 0;
        let updatedBatches = prod.batches ? [...prod.batches] : null;

        sale.items.forEach((item, idx) => {
          if (item.id !== prod.id) return;
          const q = lineReturns[idx];
          if (q <= 0) return;
          addBack += q;
          if (updatedBatches && item.selectedBatch) {
            updatedBatches = updatedBatches.map((b) =>
              b.batchNo === item.selectedBatch
                ? { ...b, stock: Number((b.stock + q).toFixed(3)) }
                : b
            );
          }
        });

        if (addBack <= 0) return prod;
        return {
          ...prod,
          stock: Number((prod.stock + addBack).toFixed(3)),
          batches: updatedBatches,
        };
      })
    );

    // Reverse shift totals
    setShift((prev) => ({
      ...prev,
      totalSales: Math.max(0, Number((prev.totalSales - refundTotal).toFixed(2))),
      salesCount: allReturned ? Math.max(0, prev.salesCount - 1) : prev.salesCount,
    }));

    // Reverse customer loyalty points & debt proportionally
    if (sale.customer && sale.customer.id !== 'c1') {
      const fractionOfSale = sale.total > 0 ? refundTotal / sale.total : 1;
      const earnedPointsToReverse = Math.round(calcEarnedPoints(sale.total) * fractionOfSale);
      const redeemedPointsToRestore = Math.round((sale.pointsDiscount || 0) * POINTS_REDEEM_RATE * fractionOfSale);

      const applyReversal = (c) => ({
        ...c,
        points: Math.max(0, c.points - earnedPointsToReverse + redeemedPointsToRestore),
        debt: sale.paymentMethod === 'debt' ? Math.max(0, Number((c.debt - refundTotal).toFixed(2))) : c.debt,
      });

      setCustomers((prev) => prev.map((c) => (c.id === sale.customer.id ? applyReversal(c) : c)));
      setSelectedCustomer((prev) => (prev && prev.id === sale.customer.id ? applyReversal(prev) : prev));
    }

    const returnedAt = new Date().toISOString();
    const updatedSale = {
      ...sale,
      items: updatedItems,
      returned: allReturned,
      partiallyReturned: !allReturned,
      returnedAmount: Number((alreadyReturnedAmount + refundTotal).toFixed(2)),
      returnedAt,
    };

    setSalesHistory((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));

    triggerAudio('success');
    notify(
      allReturned
        ? `تم إرجاع الفاتورة ${saleId} بالكامل (${refundTotal.toFixed(2)} ج.م)`
        : `تم تسجيل مرتجع جزئي بقيمة ${refundTotal.toFixed(2)} ج.م من الفاتورة ${saleId}`,
      'success'
    );
    return updatedSale;
  };

  // Shift drawer petty cash movement (in / out)
  const addDrawerMovement = (type, amount, reason = '') => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return false;
    const entry = {
      id: 'MOV-' + Date.now(),
      type: type === 'in' ? 'in' : 'out',
      amount: amt,
      reason: reason.trim() || (type === 'in' ? 'إيداع نقدي بالدرج' : 'مصروفات من الدرج'),
      time: new Date().toISOString(),
      user: currentUser?.name || shift.cashierName,
    };
    setShift((prev) => ({
      ...prev,
      drawerMovements: [...(prev.drawerMovements || []), entry],
    }));
    triggerAudio('beep');
    notify(type === 'in' ? 'تم تسجيل إيداع بالدرج' : 'تم تسجيل سحب / مصروف من الدرج', 'info');
    return true;
  };

  // Save closed shift (Z-Report) to history and mark shift closed
  const recordClosedShift = (summary) => {
    const record = {
      id: 'Z-' + Date.now(),
      ...summary,
    };
    setShiftHistory((prev) => [record, ...prev]);
    setShift((prev) => ({
      ...prev,
      isOpen: false,
      closedSummary: summary,
    }));
    triggerAudio('success');
    notify('تم إغلاق الوردية وحفظ تقرير Z في السجل بنجاح', 'success');
    return record;
  };

  // Open a new cashier shift cleanly
  const openNewShift = (startCashAmount = 500) => {
    setShift({
      isOpen: true,
      cashierName: currentUser?.name || 'الكاشير الحالي',
      startTime: new Date().toISOString(),
      startCash: Math.max(0, Number(startCashAmount) || 0),
      totalSales: 0,
      salesCount: 0,
      drawerMovements: [],
      closedSummary: null,
    });
    triggerAudio('beep');
    notify('تم فتح وردية جديدة بنجاح', 'success');
  };

  // Customer CRUD
  const addCustomer = (data) => {
    const newCustomer = {
      id: 'c-' + Date.now(),
      name: (data?.name || '').trim() || 'عميل جديد',
      phone: (data?.phone || '').trim() || '',
      points: 0,
      debt: 0,
    };
    setCustomers((prev) => [...prev, newCustomer]);
    notify(`تم إضافة العميل "${newCustomer.name}"`, 'success');
    return newCustomer;
  };

  const updateCustomer = (customerId, updates) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, ...updates } : c))
    );
    setSelectedCustomer((prev) =>
      prev && prev.id === customerId ? { ...prev, ...updates } : prev
    );
    notify('تم تحديث بيانات العميل', 'success');
  };

  const deleteCustomer = (customerId) => {
    if (customerId === 'c1') {
      notify('لا يمكن حذف العميل النقدي العام', 'error');
      return false;
    }
    const target = customers.find((c) => c.id === customerId);
    if (target && target.debt > 0) {
      notify('لا يمكن حذف عميل عليه مديونية قائمة — قم بتحصيلها أولاً', 'warning');
      return false;
    }
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    setSelectedCustomer((prev) =>
      prev && prev.id === customerId ? (customers.find((c) => c.id === 'c1') || INITIAL_CUSTOMERS[0]) : prev
    );
    notify('تم حذف العميل من السجل', 'info');
    return true;
  };

  // Collect (part of) a customer's outstanding debt; records a settlement entry
  const settleCustomerDebt = (customerId, amount, method = 'cash') => {
    if (shift.isOpen === false) {
      triggerAudio('error');
      notify('الوردية مغلقة حالياً — يرجى فتح وردية جديدة قبل تحصيل الدفعات الآجلة', 'warning');
      return null;
    }
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    const amt = Math.min(Math.max(0, Number(amount) || 0), customer.debt);
    if (amt <= 0) return null;

    const recordId = nextSequenceId(salesHistory, 'PAY-', (s) => s.isSettlement);
    const record = {
      id: recordId,
      date: new Date().toISOString(),
      mode: activeMode,
      items: [],
      subtotal: amt,
      discount: 0,
      pointsDiscount: 0,
      total: amt,
      paidAmount: amt,
      changeDue: 0,
      paymentMethod: method,
      customer,
      cashier: currentUser?.name || shift.cashierName,
      prescriptionNote: { doctorName: '', patientName: '', instructions: '' },
      note: 'تحصيل دفعة من حساب آجل',
      isSettlement: true,
      returned: false,
    };

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, debt: Math.max(0, Number((c.debt - amt).toFixed(2))) } : c))
    );
    setSelectedCustomer((prev) =>
      prev && prev.id === customerId ? { ...prev, debt: Math.max(0, Number((prev.debt - amt).toFixed(2))) } : prev
    );
    setShift((prev) => ({ ...prev, totalSales: prev.totalSales + amt }));
    setSalesHistory((prev) => [record, ...prev]);

    triggerAudio('success');
    notify(`تم تحصيل ${amt.toFixed(2)} ج.م من حساب ${customer.name}`, 'success');
    return record;
  };

  // Add / Edit / Delete product in inventory
  const saveProduct = (productData) => {
    if (productData.id) {
      setProducts((prev) => prev.map((p) => (p.id === productData.id ? { ...p, ...productData } : p)));
      setCart((prev) =>
        prev.map((item) =>
          item.id === productData.id
            ? {
                ...item,
                name: productData.name,
                image: productData.image,
                imageFit: productData.imageFit,
                price: productData.price,
                costPrice: productData.costPrice,
                unit: productData.unit,
                dosageInfo: productData.dosageInfo,
                requiresPrescription: productData.requiresPrescription,
              }
            : item
        )
      );
      notify(`تم تحديث "${productData.name}" بنجاح`, 'success');
    } else {
      const newProd = {
        ...productData,
        id: (productData.type === 'pharmacy' ? 'ph-' : 'mk-') + Date.now(),
        code: productData.code || String(Math.floor(1000 + Math.random() * 9000))
      };
      setProducts((prev) => [newProd, ...prev]);
      notify(`تم إضافة "${newProd.name}" إلى المخزون`, 'success');
    }
  };

  const deleteProduct = (productId) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((c) => c.id !== productId));
    notify('تم حذف الصنف من المخزون', 'info');
  };

  // Backup: serialize all persisted POS keys
  const exportBackup = () => {
    const payload = {};
    BACKUP_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw !== null) payload[key] = safeParse(raw, null);
    });
    return JSON.stringify(
      { app: 'pharmamarket-pos-pro', version: 2, exportedAt: new Date().toISOString(), payload },
      null,
      2
    );
  };

  // Restore: write a previously exported backup back to storage
  const importBackup = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      const payload = data && data.payload;
      if (!payload || typeof payload !== 'object') return false;
      let applied = 0;
      Object.entries(payload).forEach(([key, value]) => {
        if (BACKUP_KEYS.includes(key) && value !== null && value !== undefined) {
          localStorage.setItem(key, JSON.stringify(value));
          applied += 1;
        }
      });
      return applied > 0;
    } catch {
      return false;
    }
  };

  // Factory reset: clear every persisted key and reload
  const resetAllData = () => {
    [...BACKUP_KEYS, 'pos_initialized'].forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  // Toggle Theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <POSContext.Provider
      value={{
        toasts,
        notify,
        dismissToast,
        activeMode,
        setActiveMode,
        theme,
        toggleTheme,
        activeTab,
        setActiveTab,
        products,
        setProducts,
        saveProduct,
        deleteProduct,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        settleCustomerDebt,
        selectedCustomer,
        setSelectedCustomer,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        updateItemDiscount,
        clearCart,
        cartDiscount,
        setCartDiscount,
        subtotal,
        totalDiscount,
        grandTotal,
        heldCarts,
        holdCurrentCart,
        restoreHeldCart,
        deleteHeldCart,
        processSale,
        processReturn,
        shift,
        setShift,
        shiftHistory,
        addDrawerMovement,
        recordClosedShift,
        openNewShift,
        salesHistory,
        prescriptionNote,
        setPrescriptionNote,
        soundEnabled,
        setSoundEnabled,
        triggerAudio,
        systemScope,
        setSystemScope,
        enableAlMaida,
        setEnableAlMaida,
        currentUser,
        setCurrentUser,
        storeInfo,
        setStoreInfo,
        exportBackup,
        importBackup,
        resetAllData
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  return useContext(POSContext);
}
