const statusLabels = {
  ar: {
    pending: "معلقة",
    accepted: "مقبولة",
    delivered: "مكتملة",
    cancelled: "ملغاة",
    online: "متصل",
    offline: "غير متصل",
    available: "متاح",
    busy: "مشغول"
  },
  en: {
    pending: "Pending",
    accepted: "Accepted",
    delivered: "Delivered",
    cancelled: "Cancelled",
    online: "Online",
    offline: "Offline",
    available: "Available",
    busy: "Busy"
  }
};

const paymentMethodLabels = {
  ar: {
    cash_on_delivery: "الدفع عند الاستلام",
    cash: "نقدًا",
    card: "بطاقة",
    online: "دفع إلكتروني"
  },
  en: {
    cash_on_delivery: "Cash on delivery",
    cash: "Cash",
    card: "Card",
    online: "Online payment"
  }
};

function resolveLocale(locale) {
  return locale === "en" ? "en-OM" : "ar-OM";
}

function isValidDate(value) {
  return value && !Number.isNaN(new Date(value).getTime());
}

export function formatNumber(value, locale = "ar") {
  return new Intl.NumberFormat(resolveLocale(locale)).format(value || 0);
}

export function formatMoney(value, locale = "ar", currency = "OMR") {
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(Number(value || 0));
}

export function formatDateTime(value, locale = "ar") {
  if (!isValidDate(value)) {
    return locale === "en" ? "Unavailable" : "غير متوفر";
  }

  return new Intl.DateTimeFormat(resolveLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatRelativeTime(value, locale = "ar") {
  if (!value) {
    return locale === "en" ? "now" : "الآن";
  }

  const date = new Date(value);
  const diffInMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(resolveLocale(locale), {
    numeric: "auto"
  });

  if (Math.abs(diffInMinutes) < 60) {
    return rtf.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (Math.abs(diffInHours) < 24) {
    return rtf.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);
  return rtf.format(diffInDays, "day");
}

export function getStatusLabel(status, locale = "ar") {
  return statusLabels[locale]?.[status] || statusLabels.ar[status] || status;
}

export function getPaymentMethodLabel(paymentMethod, locale = "ar") {
  return (
    paymentMethodLabels[locale]?.[paymentMethod] ||
    paymentMethodLabels.ar[paymentMethod] ||
    paymentMethod ||
    (locale === "en" ? "Unavailable" : "غير متوفر")
  );
}
