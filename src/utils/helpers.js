// Formatting & Helper Utilities for POS System

export function formatCurrency(amount) {
  const numericAmount = Number(amount) || 0;
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatQuantity(qty, isWeighted = false, unit = 'عبوة') {
  const n = Number(qty) || 0;
  if (isWeighted) {
    return `${n.toFixed(3)} كجم`;
  }
  const clean = Number.isInteger(n) ? n : Number(n.toFixed(2));
  return `${clean} ${unit || 'عبوة'}`;
}

// Check if a product/store image field is a real image URL or Data URI (vs emoji icon)
export function isImageSrc(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  );
}

// Resize & compress uploaded product image to a lightweight Data URL for localStorage persistence
export function compressProductImage(file, maxDimension = 512, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)'));
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('حجم الصورة كبير جداً (الحد الأقصى 12 ميجابايت قبل الضغط)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = () => {
      const rawResult = String(reader.result || '');
      if (file.type === 'image/svg+xml') {
        const sizeKB = Math.round((rawResult.length * 3) / 4 / 1024);
        resolve({ dataUrl: rawResult, width: maxDimension, height: maxDimension, sizeKB });
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة تالف أو غير مدعوم'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('المتصفح لا يدعم معالجة الصور'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, width, height, sizeKB });
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  });
}

// Export tabular data to UTF-8 BOM CSV (Excel-safe Arabic)
export function exportToCSV(filename, headers, rows) {
  const escapeCell = (val) => {
    const str = String(val ?? '').replace(/\r?\n/g, ' ');
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Safe JSON.parse wrapper — corrupted localStorage must never crash the app
export function safeParse(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

// Loyalty points rules: earn 1 point per 10 EGP, redeem 10 points = 1 EGP
export const POINTS_PER_EGP = 0.1;
export const POINTS_REDEEM_RATE = 10;

export function calcEarnedPoints(total) {
  return Math.floor((Number(total) || 0) * POINTS_PER_EGP);
}

export function maxRedeemableDiscount(points, billTotal) {
  const byPoints = Math.floor((Number(points) || 0) / POINTS_REDEEM_RATE);
  return Math.max(0, Math.min(byPoints, Number(billTotal) || 0));
}

// Calculate days remaining to expiry
export function getExpiryStatus(expiryDateStr) {
  if (!expiryDateStr) return { label: 'طبيعي', status: 'normal', days: 999 };

  const expiry = new Date(expiryDateStr);
  const now = new Date();
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { label: 'منتهي الصلاحية', status: 'expired', days: diffDays };
  } else if (diffDays <= 90) {
    return { label: `قريب الانتهاء (${diffDays} يوم)`, status: 'warning', days: diffDays };
  } else {
    return { label: 'صالح', status: 'normal', days: diffDays };
  }
}

// Date-range presets used by reports ('today' | 'yesterday' | '7d' | '30d' | 'all')
export function getDateRange(rangeKey) {
  const now = new Date();
  const startOfDay = (d) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };

  if (rangeKey === 'today') {
    return { start: startOfDay(now), end: now };
  }
  if (rangeKey === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const end = startOfDay(now);
    end.setMilliseconds(-1);
    return { start: startOfDay(y), end };
  }
  if (rangeKey === '7d' || rangeKey === '30d') {
    const days = rangeKey === '7d' ? 7 : 30;
    const s = startOfDay(now);
    s.setDate(s.getDate() - (days - 1));
    return { start: s, end: now };
  }
  return { start: null, end: null }; // 'all'
}

export function isWithinRange(dateString, range) {
  if (!range.start || !range.end) return true;
  const d = new Date(dateString);
  return d >= range.start && d <= range.end;
}

// Arabic label for payment methods (shared by reports, receipts, shift)
export function paymentMethodLabel(method) {
  switch (method) {
    case 'cash': return 'نقدي (كاش)';
    case 'card': return 'بطاقة (فيزا)';
    case 'instapay': return 'إنستاباي / محفظة';
    case 'wallet': return 'محفظة إلكترونية';
    case 'debt': return 'حساب آجل';
    default: return method || 'غير محدد';
  }
}

// Thermal receipt generator print trigger
export function triggerPrintReceipt() {
  window.print();
}
