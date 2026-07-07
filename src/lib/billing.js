import { BILLING_INVOICE } from "@/config/api";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";

export const fallbackPlans = [
  {
    id: "FREE",
    name: "FREE",
    price: 0,
    currency: "INR",
    max_users: 50,
    max_storage: 1024,
    max_file_size: 20,
    duration_days: 30,
    is_active: true,
  },
  {
    id: "PREMIUM",
    name: "PREMIUM",
    price: 1,
    currency: "INR",
    max_users: 150,
    max_storage: 10240,
    max_file_size: 40,
    duration_days: 30,
    is_active: true,
  },
  {
    id: "ENTERPRISE",
    name: "ENTERPRISE",
    price: 2,
    currency: "INR",
    max_users: 500,
    max_storage: 100000,
    max_file_size: 60,
    duration_days: 30,
    is_active: true,
  },
];

export function normalizePlan(plan) {
  return {
    id: plan?.id || plan?.name,
    name: String(plan?.name || "Plan").toUpperCase(),
    price: Number(plan?.price || 0),
    currency: plan?.currency || "INR",
    max_users: Number(plan?.max_users || 0),
    max_storage: Number(plan?.max_storage || 0),
    max_file_size: Number(plan?.max_file_size || 0),
    duration_days: Number(plan?.duration_days || 30),
    is_active: plan?.is_active !== false,
    created_at: plan?.created_at,
  };
}

export function normalizePlans(plans) {
  const source = Array.isArray(plans) && plans.length ? plans : fallbackPlans;

  return source.map(normalizePlan).sort((a, b) => a.price - b.price);
}

export function formatPlanName(name) {
  return String(name || "Plan")
    .toLowerCase()
    .replace(/(^|\s|-|_)\S/g, (letter) => letter.toUpperCase())
    .replace(/_/g, " ");
}

export function formatPlanPrice(plan) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: plan?.currency || "INR",
  }).format(Number(plan?.price || 0));
}

export function formatAmount(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

export function formatBillingDate(value) {
  if (!value) {
    return "NA";
  }

  return formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }, value);
}

export function formatStorage(megabytes) {
  const value = Number(megabytes || 0);

  if (value >= 1024) {
    return `${Number((value / 1024).toFixed(value % 1024 === 0 ? 0 : 1))} GB`;
  }

  return `${value} MB`;
}

export function planFeatures(plan) {
  return [
    `Up to ${Number(plan.max_users || 0).toLocaleString("en-IN")} users`,
    `${formatStorage(plan.max_storage)} storage`,
    `${Number(plan.max_file_size || 0).toLocaleString("en-IN")} MB file uploads`,
    `${Number(plan.duration_days || 0).toLocaleString("en-IN")}-day billing duration`,
  ];
}

export function isPopularPlan(plan, plans = []) {
  const name = String(plan?.name || "").toUpperCase();

  if (name.includes("PREMIUM") || name.includes("PRO")) {
    return true;
  }

  return plans.length > 1 && plans[Math.floor(plans.length / 2)]?.id === plan?.id;
}

export function billingStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (["paid", "success", "successful"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "created"].includes(value)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-brand-line bg-brand-neutral text-brand-secondary";
}

export async function downloadInvoice(paymentId) {
  const response = await apiClient.get(BILLING_INVOICE(paymentId), { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice_${paymentId}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
