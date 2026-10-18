import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS } from '../data/initialData';
import { playBeepSound, playSuccessSound, playErrorSound } from '../utils/audio';

const POSContext = createContext();

export function POSProvider({ children }) {
  // Store operational mode: 'market' (سوبرماركت), 'pharmacy' (صيدلية), or 'hybrid' (مدمج)
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('pos_mode') || 'pharmacy';
  });

  // Dark/Light Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pos_theme') || 'dark';
  });

  // Active View / Tab: 'pos', 'inventory', 'sales', 'shift', 'customers', 'reports'
  const [activeTab, setActiveTab] = useState('pos');

  // Products state
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('pos_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  // Customers state
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('pos_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });
  const [selectedCustomer, setSelectedCustomer] = useState(INITIAL_CUSTOMERS[0]);

  // Cart state
  const [cart, setCart] = useState([]);
  const [cartDiscount, setCartDiscount] = useState(0); // overall percentage or fixed discount

  // Held carts list
  const [heldCarts, setHeldCarts] = useState([]);

  // Active Shift State
  const [shift, setShift] = useState(() => {
    const saved = localStorage.getItem('pos_shift');
    return saved
      ? JSON.parse(saved)
      : {
          isOpen: true,
          cashierName: 'محمد أحمد (الكاشير)',
          startTime: new Date().toISOString(),
          startCash: 500.00,
          totalSales: 0,
          salesCount: 0,
        };
  });

  // Completed Sales History
  const [salesHistory, setSalesHistory] = useState(() => {
    const saved = localStorage.getItem('pos_sales_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Prescription / Patient note info for pharmacy checkout
  const [prescriptionNote, setPrescriptionNote] = useState({
    doctorName: '',
    patientName: '',
    instructions: ''
  });

  // Store & Organization Profile Info
  const [storeInfo, setStoreInfo] = useState(() => {
    const saved = localStorage.getItem('pos_store_info');
    return saved ? JSON.parse(saved) : {
      name: 'فارما ماركت PRO',
      logo: '💊',
      phone: '01000000000',
      taxNo: 'TAX-990-123',
      address: 'القاهرة - شارع التحرير',
      receiptFooter: 'نتمنى لكم دوام الصحة والعافية وشكراً لزيارتكم!'
    };
  });

  useEffect(() => {
    localStorage.setItem('pos_store_info', JSON.stringify(storeInfo));
  }, [storeInfo]);

  // Current User Account State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('pos_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // System Scope (Stand-alone delivery presets: 'full_hybrid', 'pharmacy_only', 'market_only')
  const [systemScope, setSystemScope] = useState(() => {
    return localStorage.getItem('pos_system_scope') || 'full_hybrid';
  });

  // Option for "قسم المائدة والتلاجة" (Deli Counter tab in Supermarket)
  const [enableAlMaida, setEnableAlMaida] = useState(() => {
    const saved = localStorage.getItem('pos_enable_almaida');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Audio mute setting
  const [soundEnabled, setSoundEnabled] = useState(true);

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
              setSystemScope(cfg.systemScope);
              localStorage.setItem('pos_system_scope', cfg.systemScope);
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

  // Sync Current User Role & Scope
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('pos_current_user', JSON.stringify(currentUser));
      if (currentUser.role === 'pharmacy') {
        setSystemScope('pharmacy_only');
        setActiveMode('pharmacy');
      } else if (currentUser.role === 'market') {
        setSystemScope('market_only');
        setActiveMode('market');
      }
    }
  }, [currentUser]);

  // Save changes to LocalStorage
  useEffect(() => {
    localStorage.setItem('pos_system_scope', systemScope);
    if (systemScope === 'pharmacy_only') {
      setActiveMode('pharmacy');
    } else if (systemScope === 'market_only') {
      setActiveMode('market');
    }
  }, [systemScope]);

  useEffect(() => {
    localStorage.setItem('pos_enable_almaida', JSON.stringify(enableAlMaida));
  }, [enableAlMaida]);

  useEffect(() => {
    localStorage.setItem('pos_mode', activeMode);
  }, [activeMode]);

  useEffect(() => {
    localStorage.setItem('pos_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pos_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('pos_shift', JSON.stringify(shift));
  }, [shift]);

  useEffect(() => {
    localStorage.setItem('pos_sales_history', JSON.stringify(salesHistory));
  }, [salesHistory]);

  // Audio helper wrapper
  const triggerAudio = (type) => {
    if (!soundEnabled) return;
    if (type === 'beep') playBeepSound();
    if (type === 'success') playSuccessSound();
    if (type === 'error') playErrorSound();
  };

  // Add Item to Cart (with FEFO automatic batch assignment for pharma items)
  const addToCart = (product, selectedBatch = null, qtyToAdd = 1) => {
    if (product.stock <= 0) {
      triggerAudio('error');
      alert(`المنتج "${product.name}" غير متوفر في المخزون!`);
      return;
    }

    triggerAudio('beep');

    setCart((prevCart) => {
      // Determine batch if pharmacy product
      let batchToUse = selectedBatch;
      if (!batchToUse && product.type === 'pharmacy' && product.batches && product.batches.length > 0) {
        // Pick earliest expiring batch (FEFO)
        const sorted = [...product.batches].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        batchToUse = sorted[0].batchNo;
      }

      const existingIndex = prevCart.findIndex(
        (item) => item.id === product.id && item.selectedBatch === batchToUse
      );

      const minAllowed = product.minWeight || (product.isWeighted ? 0.050 : 1);
      if (product.isWeighted && qtyToAdd < minAllowed) {
        alert(`أدنى كمية/وزن مسموح بطلبه لهذا الصنف هو ${minAllowed} كجم (${(minAllowed * 1000).toFixed(0)} جرام)`);
        qtyToAdd = minAllowed;
      }

      if (existingIndex > -1) {
        const updated = [...prevCart];
        const currentQty = updated[existingIndex].quantity;
        const newQty = product.isWeighted && qtyToAdd !== 1
          ? Number(qtyToAdd.toFixed(3))
          : Number((currentQty + qtyToAdd).toFixed(3));

        if (newQty > product.stock) {
          triggerAudio('error');
          alert(`لا يمكن تجاوز الكمية المتاحة بالرصيد (${product.stock})`);
          return prevCart;
        }
        updated[existingIndex].quantity = newQty;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            ...product,
            quantity: Number(qtyToAdd.toFixed(3)),
            itemDiscount: 0,
            selectedBatch: batchToUse,
            batchInfo: product.batches
              ? product.batches.find((b) => b.batchNo === batchToUse)
              : null,
          },
        ];
      }
    });
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
        alert(`أدنى كمية مسموح بطلبها من هذا الصنف هي ${minAllowed} كجم (${(minAllowed * 1000).toFixed(0)} جرام)`);
        targetQty = minAllowed;
      }
      if (targetQty > prod.stock) {
        triggerAudio('error');
        alert(`الكمية المطلوبة أكبر من الرصيد المتوفر (${prod.stock})`);
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

  // Update item discount
  const updateItemDiscount = (productId, batchNo, discountVal) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId && item.selectedBatch === batchNo) {
          return { ...item, itemDiscount: Math.max(0, Number(discountVal) || 0) };
        }
        return item;
      })
    );
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setCartDiscount(0);
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
      prescriptionNote: { ...prescriptionNote }
    };
    setHeldCarts((prev) => [...prev, newHold]);
    clearCart();
    triggerAudio('beep');
  };

  // Restore held cart
  const restoreHeldCart = (holdId) => {
    const target = heldCarts.find((h) => h.id === holdId);
    if (target) {
      setCart(target.cart);
      if (target.customer) setSelectedCustomer(target.customer);
      if (target.prescriptionNote) setPrescriptionNote(target.prescriptionNote);
      setHeldCarts((prev) => prev.filter((h) => h.id !== holdId));
      triggerAudio('beep');
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => {
    const itemPrice = item.price - (item.itemDiscount || 0);
    return acc + itemPrice * item.quantity;
  }, 0);

  const totalDiscount = cartDiscount;
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  // Complete Payment Process
  const processSale = (paymentMethod, paidAmount, note = '') => {
    if (cart.length === 0) return null;

    const invoiceId = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const saleRecord = {
      id: invoiceId,
      date: new Date().toISOString(),
      mode: activeMode,
      items: [...cart],
      subtotal,
      discount: totalDiscount,
      total: grandTotal,
      paidAmount: Number(paidAmount) || grandTotal,
      changeDue: Math.max(0, (Number(paidAmount) || grandTotal) - grandTotal),
      paymentMethod, // 'cash', 'card', 'instapay', 'wallet', 'debt'
      customer: selectedCustomer,
      cashier: shift.cashierName,
      prescriptionNote: { ...prescriptionNote },
      note
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
                return { ...b, stock: Math.max(0, b.stock - cItem.quantity) };
              }
              return b;
            });
          }
        });

        return {
          ...prod,
          stock: Math.max(0, prod.stock - totalQtyDeducted),
          batches: updatedBatches
        };
      })
    );

    // Update Shift Totals
    setShift((prev) => ({
      ...prev,
      totalSales: prev.totalSales + grandTotal,
      salesCount: prev.salesCount + 1
    }));

    // Add to Sales History
    setSalesHistory((prev) => [saleRecord, ...prev]);

    // Handle Customer Points/Debt
    if (selectedCustomer && selectedCustomer.id !== 'c1') {
      const addedPoints = Math.floor(grandTotal / 10); // 1 point per 10 EGP
      const addedDebt = paymentMethod === 'debt' ? grandTotal : 0;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? { ...c, points: c.points + addedPoints, debt: c.debt + addedDebt }
            : c
        )
      );
    }

    triggerAudio('success');
    clearCart();
    return saleRecord;
  };

  // Add / Edit product in inventory
  const saveProduct = (productData) => {
    if (productData.id) {
      setProducts((prev) => prev.map((p) => (p.id === productData.id ? productData : p)));
    } else {
      const newProd = {
        ...productData,
        id: (productData.type === 'pharmacy' ? 'ph-' : 'mk-') + Date.now(),
        code: String(Math.floor(1000 + Math.random() * 9000))
      };
      setProducts((prev) => [newProd, ...prev]);
    }
  };

  // Toggle Theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <POSContext.Provider
      value={{
        activeMode,
        setActiveMode,
        theme,
        toggleTheme,
        activeTab,
        setActiveTab,
        products,
        setProducts,
        saveProduct,
        customers,
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
        processSale,
        shift,
        setShift,
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
        setStoreInfo
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  return useContext(POSContext);
}
