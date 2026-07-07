import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeIndianRupee,
  Building2,
  CalendarDays,
  FileBarChart2,
  ShieldAlert,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";

import {
  SUPERADMIN_ANALYTICS_COMPANIES,
  SUPERADMIN_ANALYTICS_LICENSES_EXPIRING,
  SUPERADMIN_ANALYTICS_REVENUE,
  SUPERADMIN_ANALYTICS_REVENUE_MONTHLY,
  SUPERADMIN_ANALYTICS_USERS,
  SUPERADMIN_ANALYTICS_USERS_ACTIVE,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(toNumber(value));
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(toNumber(value));
}

function formatDate(value) {
  if (!value) return "Not available";

  return formatISTDateTime(value, {
    dateStyle: "medium",
    timeStyle: "short",
  }, "Not available");
}

function getDaysUntilExpiry(value) {
  if (!value) return null;

  const expiresAt = new Date(value).getTime();
  if (!Number.isFinite(expiresAt)) return null;

  const msRemaining = expiresAt - Date.now();
  return Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(daysRemaining) {
  if (daysRemaining === null) {
    return {
      label: "Unknown",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (daysRemaining <= 0) {
    return {
      label: "Expired",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (daysRemaining <= 7) {
    return {
      label: `${daysRemaining} days left`,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: `${daysRemaining} days left`,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

async function fetchAnalytics() {
  const [
    revenueResponse,
    monthlyRevenueResponse,
    companiesResponse,
    usersResponse,
    activeUsersResponse,
  ] = await Promise.all([
    apiClient.get(SUPERADMIN_ANALYTICS_REVENUE),
    apiClient.get(SUPERADMIN_ANALYTICS_REVENUE_MONTHLY),
    apiClient.get(SUPERADMIN_ANALYTICS_COMPANIES),
    apiClient.get(SUPERADMIN_ANALYTICS_USERS),
    apiClient.get(SUPERADMIN_ANALYTICS_USERS_ACTIVE),
  ]);

  const totalRevenue = toNumber(revenueResponse.data?.total_revenue);
  const monthlyRevenue = toNumber(monthlyRevenueResponse.data?.monthly_revenue);
  const totalCompanies = toNumber(companiesResponse.data?.total_companies);
  const totalUsers = toNumber(usersResponse.data?.total_users);
  const activeUsers = toNumber(activeUsersResponse.data?.active_users);
  const inactiveUsers = Math.max(totalUsers - activeUsers, 0);

  return {
    activeUsers,
    inactiveUsers,
    monthlyRevenue,
    totalCompanies,
    totalRevenue,
    totalUsers,
  };
}

async function fetchExpiringLicenses() {
  const response = await apiClient.get(SUPERADMIN_ANALYTICS_LICENSES_EXPIRING);
  return Array.isArray(response.data) ? response.data : [];
}

function StatCard({ stat, isLoading }) {
  const Icon = stat.icon;

  return (
    <div className="group relative min-h-[152px] overflow-hidden rounded-[28px] border border-brand-line bg-white p-5 shadow-sm transition-all duration-300 hover:border-brand-primary/30 hover:shadow-lg hover:shadow-brand-primary/5">
      <div className="relative z-10 flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-secondary">{stat.label}</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-brand-ink">
              {isLoading ? (
                <span className="inline-flex h-8 w-24 animate-pulse rounded-lg bg-brand-neutral" />
              ) : (
                stat.value
              )}
            </h3>
          </div>
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="size-5" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            {stat.trend === "up" ? <ArrowUpRight className="size-3 text-emerald-600" /> : null}
            <span className={`text-[11px] font-bold ${stat.trend === "up" ? "text-emerald-600" : "text-brand-secondary"}`}>
              {stat.caption}
            </span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-7 -right-7 size-24 rounded-full bg-brand-neutral opacity-45 transition-colors group-hover:bg-brand-primary/5" />
    </div>
  );
}

export function AnalyticsPage() {
  const analyticsQuery = useQuery({
    queryKey: ["super-admin-analytics-overview"],
    queryFn: fetchAnalytics,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const expiringLicensesQuery = useQuery({
    queryKey: ["super-admin-analytics-expiring-licenses"],
    queryFn: fetchExpiringLicenses,
    staleTime: 30_000,
  });

  const data = analyticsQuery.data || {
    activeUsers: 0,
    inactiveUsers: 0,
    monthlyRevenue: 0,
    totalCompanies: 0,
    totalRevenue: 0,
    totalUsers: 0,
  };

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(data.totalRevenue),
      caption: "All successful payments",
      icon: BadgeIndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      trend: "up",
    },
    {
      label: "Monthly Revenue",
      value: formatCurrency(data.monthlyRevenue),
      caption: "Last 30 days",
      icon: CalendarDays,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "up",
    },
    {
      label: "Total Companies",
      value: formatCompact(data.totalCompanies),
      caption: "Registered companies",
      icon: Building2,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Total Users",
      value: formatCompact(data.totalUsers),
      caption: "All platform users",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Active Users",
      value: formatCompact(data.activeUsers),
      caption: "Active and enabled",
      icon: UserCheck,
      color: "text-teal-600",
      bg: "bg-teal-50",
      trend: "up",
    },
    {
      label: "Inactive Users",
      value: formatCompact(data.inactiveUsers),
      caption: "Derived from users minus active",
      icon: UserMinus,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-brand-secondary">
              <FileBarChart2 className="size-3 text-brand-primary" />
              Operations / Analytics
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
                Business Intelligence Overview
              </h1>
            </div>
          </div>
        </div>

        {analyticsQuery.isError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-bold">Could not load analytics.</p>
              <p className="mt-1 text-rose-600">
                {analyticsQuery.error?.message || "Please check the API response and try again."}
              </p>
            </div>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              stat={stat}
              isLoading={analyticsQuery.isLoading}
            />
          ))}
        </section>

        <section className="overflow-hidden rounded-[32px] border border-brand-line bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-brand-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                <ShieldAlert className="size-3.5" />
                License Monitoring
              </div>
              <h2 className="mt-3 text-lg font-semibold text-brand-ink">Expiring Licenses</h2>
              <p className="mt-1 text-sm text-brand-secondary">
                Licenses expiring within the next 30 days.
              </p>
            </div>
            <div className="rounded-2xl bg-brand-neutral px-4 py-3 text-sm font-bold text-brand-ink">
              {expiringLicensesQuery.isLoading
                ? "Loading..."
                : `${expiringLicensesQuery.data?.length || 0} expiring`}
            </div>
          </div>

          {expiringLicensesQuery.isError ? (
            <div className="m-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:m-6">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-bold">Could not load expiring licenses.</p>
                <p className="mt-1 text-rose-600">
                  {expiringLicensesQuery.error?.message || "Please check the API response and try again."}
                </p>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-brand-neutral/60 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-secondary">
                <tr>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Expires At</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {expiringLicensesQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-64 animate-pulse rounded bg-brand-neutral" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-20 animate-pulse rounded bg-brand-neutral" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-36 animate-pulse rounded bg-brand-neutral" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-6 w-24 animate-pulse rounded-full bg-brand-neutral" />
                      </td>
                    </tr>
                  ))
                ) : null}

                {!expiringLicensesQuery.isLoading && expiringLicensesQuery.data?.length ? (
                  expiringLicensesQuery.data.map((license) => {
                    const companyLabel = license.company_name || license.company || license.company_id || "Unknown company";
                    const daysRemaining = getDaysUntilExpiry(license.expires_at);
                    const status = getExpiryStatus(daysRemaining);

                    return (
                      <tr key={`${license.company_id}-${license.expires_at}`} className="transition-colors hover:bg-brand-soft/30">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-brand-ink">{companyLabel}</p>
                          {license.company_name ? (
                            <p className="mt-1 font-mono text-[11px] text-brand-secondary">{license.company_id}</p>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full border border-brand-line bg-brand-neutral px-2.5 py-1 text-xs font-bold text-brand-ink">
                            {license.plan || "No plan"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-brand-secondary">{formatDate(license.expires_at)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : null}

                {!expiringLicensesQuery.isLoading && !expiringLicensesQuery.data?.length && !expiringLicensesQuery.isError ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm font-semibold text-brand-secondary">
                      No licenses are expiring in the next 30 days.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SuperAdminLayout>
  );
}
