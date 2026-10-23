import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [activeTab, setActiveTab] = useState('home');
  const [settings, setSettings] = useState({
    store_name: 'TẠP HÓA MAI CUA',
    store_phone: '',
    store_address: '',
    store_logo: '',
    strict_stock: 'true',
    default_min_stock: '5',
    cost_method: 'latest',
    receipt_footer: 'Cảm ơn Quý khách! Hẹn gặp lại!'
  });
  const [networkInfo, setNetworkInfo] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  // Cart state persisted across tab navigation
  const [cart, setCart] = useState([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  
  // Active product to edit in ProductFormView
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Quick Barcode Scanner Modal toggle
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerCallback, setScannerCallback] = useState(null);

  // Active Receipt Modal for reprint or viewing
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);

  // Toast notification system
  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch settings from server
  const refreshSettings = useCallback(async () => {
    try {
      const res = await apiRequest('/settings');
      if (res.data) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
      if (res.network) {
        setNetworkInfo(res.network);
      }
    } catch (err) {
      console.error('Không thể tải cài đặt:', err);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Cart helper functions
  const addToCart = useCallback((product, selectedUnit = null) => {
    setCart(prev => {
      const unit = selectedUnit || {
        unit_name: product.base_unit,
        conversion_factor: 1,
        selling_price: product.selling_price
      };

      const existingIndex = prev.findIndex(
        item => item.product_id === product.id && item.unit_name === unit.unit_name
      );

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1
        };
        return next;
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            code: product.code,
            image_url: product.image_url,
            unit_name: unit.unit_name,
            conversion_factor: unit.conversion_factor,
            unit_price: unit.selling_price,
            quantity: 1,
            current_stock: product.current_stock,
            base_unit: product.base_unit,
            all_units: [
              {
                unit_name: product.base_unit,
                conversion_factor: 1,
                selling_price: product.selling_price
              },
              ...(product.units || [])
            ]
          }
        ];
      }
    });
    showToast(`Đã thêm "${product.name}" vào đơn hàng`, 'success', 2000);
  }, [showToast]);

  const updateCartQty = useCallback((index, qty) => {
    setCart(prev => {
      const next = [...prev];
      if (qty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], quantity: qty };
      }
      return next;
    });
  }, []);

  const updateCartUnit = useCallback((index, newUnitName) => {
    setCart(prev => {
      const next = [...prev];
      const item = next[index];
      const foundUnit = item.all_units.find(u => u.unit_name === newUnitName);
      if (foundUnit) {
        next[index] = {
          ...item,
          unit_name: foundUnit.unit_name,
          conversion_factor: foundUnit.conversion_factor,
          unit_price: foundUnit.selling_price
        };
      }
      return next;
    });
  }, []);

  const removeFromCart = useCallback((index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartDiscount(0);
  }, []);

  const openScanner = useCallback((callback = null) => {
    setScannerCallback(() => callback);
    setScannerOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setScannerOpen(false);
    setScannerCallback(null);
  }, []);

  const navigateTo = useCallback((tab, data = null) => {
    if (tab === 'product_add') {
      setEditingProduct(data || null);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const value = {
    activeTab,
    setActiveTab,
    navigateTo,
    settings,
    setSettings,
    refreshSettings,
    networkInfo,
    toasts,
    showToast,
    removeToast,
    cart,
    setCart,
    cartDiscount,
    setCartDiscount,
    addToCart,
    updateCartQty,
    updateCartUnit,
    removeFromCart,
    clearCart,
    editingProduct,
    setEditingProduct,
    scannerOpen,
    openScanner,
    closeScanner,
    scannerCallback,
    activeReceiptModal,
    setActiveReceiptModal
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
