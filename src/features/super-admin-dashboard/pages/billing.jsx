import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  Edit3,
  LoaderCircle,
  Plus,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLAN, PLANS, SUPERADMIN_ANALYTICS_PAYMENT_HISTORY } from "@/config/api";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";
import { apiClient } from "@/lib/client";
import { cn } from "@/lib/utils";
import {
  billingStatusClass,
  downloadInvoice,
  fallbackPlans,
  formatAmount,
  formatBillingDate,
  formatPlanName,
  formatPlanPrice,
  normalizePlans,
  planFeatures,
} from "@/lib/billing";

const emptyForm = {
  id: "",
  name: "",
  price: "",
  currency: "INR",
  max_users: "",
  max_storage: "",
  max_file_size: "",
  duration_days: "30",
  is_active: true,
};

function toPayload(form, isEdit) {
  const payload = {
    price: Number(form.price),
    max_users: Number(form.max_users),
    max_storage: Number(form.max_storage),
    max_file_size: Number(form.max_file_size),
    duration_days: Number(form.duration_days),
  };

  if (isEdit) {
    payload.is_active = Boolean(form.is_active);
    return payload;
  }

  return {
    ...payload,
    name: form.name.trim().toUpperCase(),
    currency: form.currency.trim().toUpperCase() || "INR",
  };
}

function validateForm(form, isEdit) {
  if (!isEdit && !form.name.trim()) {
    return "Plan name is required.";
  }

  for (const key of ["price", "max_users", "max_storage", "max_file_size", "duration_days"]) {
    if (Number.isNaN(Number(form[key])) || Number(form[key]) < 0) {
      return "Plan numbers must be zero or greater.";
    }
  }

  return "";
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState("");

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const response = await apiClient.get(PLANS);
      return response.data;
    },
  });

  const paymentHistoryQuery = useQuery({
    queryKey: ["superadmin-payment-history"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_ANALYTICS_PAYMENT_HISTORY);
      return response.data;
    },
  });

  const plans = useMemo(() => normalizePlans(plansQuery.data || fallbackPlans), [plansQuery.data]);
  const isEditing = Boolean(form.id);

  const createPlanMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(PLANS, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Plan created.");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (error) => toast.error(error.userMessage || "Unable to create plan."),
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await apiClient.put(PLAN(id), payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Plan updated.");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (error) => toast.error(error.userMessage || "Unable to update plan."),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(PLAN(id));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Plan deleted.");
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (error) => toast.error(error.userMessage || "Unable to delete plan."),
  });

  const downloadInvoiceMutation = useMutation({
    mutationFn: async (paymentId) => {
      setDownloadingInvoiceId(paymentId);
      await downloadInvoice(paymentId);
    },
    onError: (error) => toast.error(error.userMessage || "Unable to download invoice."),
    onSettled: () => setDownloadingInvoiceId(""),
  });

  const historyRows = useMemo(
    () => (Array.isArray(paymentHistoryQuery.data?.data) ? paymentHistoryQuery.data.data : []),
    [paymentHistoryQuery.data]
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return historyRows;
    }

    return historyRows.filter((row) =>
      [
        row.company_name,
        row.plan,
        row.payment_id,
        row.invoice_path,
        row.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [historyRows, search]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editPlan(plan) {
    setForm({
      id: plan.id,
      name: plan.name,
      price: String(plan.price),
      currency: plan.currency,
      max_users: String(plan.max_users),
      max_storage: String(plan.max_storage),
      max_file_size: String(plan.max_file_size),
      duration_days: String(plan.duration_days),
      is_active: plan.is_active,
    });
  }

  function submitPlan(event) {
    event.preventDefault();
    const message = validateForm(form, isEditing);

    if (message) {
      toast.error(message);
      return;
    }

    if (isEditing) {
      updatePlanMutation.mutate({ id: form.id, payload: toPayload(form, true) });
      return;
    }

    createPlanMutation.mutate(toPayload(form, false));
  }

  const formIsSaving = createPlanMutation.isPending || updatePlanMutation.isPending;

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-brand-secondary">
              <ReceiptText className="size-3 text-brand-primary" />
              Super Admin / Billing
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
                Plans & Payments
              </h1>
              <p className="mt-2 text-sm text-brand-secondary">
                Manage plan pricing and review transaction history.
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-secondary" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search companies or payments..."
              className="h-12 rounded-2xl border-brand-line bg-white pl-11 text-brand-ink transition-all focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[32px] border border-brand-line bg-white p-6 shadow-[0_16px_50px_rgba(68,83,74,0.06)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-brand-ink">Plan Catalog</h2>
                <p className="text-sm text-brand-secondary">Active plans appear on the landing page and admin billing.</p>
              </div>
              {plansQuery.isFetching ? (
                <LoaderCircle className="size-5 animate-spin text-brand-primary" />
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-brand-line bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-brand-ink">{formatPlanName(plan.name)}</p>
                      <p className="mt-1 text-sm font-semibold text-brand-primary">{formatPlanPrice(plan)}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                        plan.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-brand-line bg-brand-neutral text-brand-secondary"
                      )}
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {planFeatures(plan).map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm font-medium text-brand-secondary">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-brand-line text-xs font-semibold"
                      onClick={() => editPlan(plan)}
                    >
                      <Edit3 className="mr-2 size-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl border-red-100 px-3 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm(`Delete ${formatPlanName(plan.name)} plan?`)) {
                          deletePlanMutation.mutate(plan.id);
                        }
                      }}
                      disabled={deletePlanMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={submitPlan}
            className="rounded-[32px] border border-brand-line bg-white p-6 shadow-[0_16px_50px_rgba(68,83,74,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-brand-ink">
                  {isEditing ? "Edit Plan" : "Create Plan"}
                </h2>
                <p className="text-sm text-brand-secondary">
                  {isEditing ? "Plan names are fixed by the API." : "Create a new public plan."}
                </p>
              </div>
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl border-brand-line text-xs font-semibold"
                  onClick={() => setForm(emptyForm)}
                >
                  New
                </Button>
              ) : (
                <Plus className="size-5 text-brand-primary" />
              )}
            </div>

            <div className="mt-6 grid gap-4">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Name</span>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  disabled={isEditing}
                  placeholder="PREMIUM"
                  className="h-11 rounded-xl border-brand-line"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Price</span>
                  <Input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    className="h-11 rounded-xl border-brand-line"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Currency</span>
                  <Input
                    value={form.currency}
                    onChange={(event) => updateField("currency", event.target.value)}
                    disabled={isEditing}
                    className="h-11 rounded-xl border-brand-line"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Max Users</span>
                  <Input
                    type="number"
                    min="0"
                    value={form.max_users}
                    onChange={(event) => updateField("max_users", event.target.value)}
                    className="h-11 rounded-xl border-brand-line"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Storage MB</span>
                  <Input
                    type="number"
                    min="0"
                    value={form.max_storage}
                    onChange={(event) => updateField("max_storage", event.target.value)}
                    className="h-11 rounded-xl border-brand-line"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">File Size MB</span>
                  <Input
                    type="number"
                    min="0"
                    value={form.max_file_size}
                    onChange={(event) => updateField("max_file_size", event.target.value)}
                    className="h-11 rounded-xl border-brand-line"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Duration Days</span>
                  <Input
                    type="number"
                    min="0"
                    value={form.duration_days}
                    onChange={(event) => updateField("duration_days", event.target.value)}
                    className="h-11 rounded-xl border-brand-line"
                  />
                </label>
              </div>

              {isEditing ? (
                <label className="flex items-center justify-between rounded-2xl border border-brand-line bg-brand-neutral/50 px-4 py-3">
                  <span className="text-sm font-semibold text-brand-ink">Active</span>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => updateField("is_active", event.target.checked)}
                    className="size-4 accent-brand-primary"
                  />
                </label>
              ) : null}
            </div>

            <Button
              type="submit"
              className="mt-6 h-12 w-full rounded-xl bg-brand-primary font-bold text-white hover:bg-brand-primary/90"
              disabled={formIsSaving}
            >
              {formIsSaving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {isEditing ? "Save Changes" : "Create Plan"}
            </Button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-brand-line bg-white shadow-[0_16px_50px_rgba(68,83,74,0.06)]">
          <div className="flex flex-col gap-4 border-b border-brand-line px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-left text-lg font-semibold text-brand-ink">Payment History</h2>
              <p className="mt-1 text-left text-sm text-brand-secondary">
                A detailed log of all transactions processed.
              </p>
            </div>
            <Button variant="outline" className="h-10 gap-2 rounded-xl border-brand-line bg-white px-4 text-xs font-semibold text-brand-ink hover:bg-brand-soft">
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-brand-neutral/50">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Company</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Plan</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Payment ID</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Date</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Status</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {filteredRows.map((row) => (
                  <tr key={`${row.company_id}-${row.payment_id || row.invoice_path || row.plan}`} className="group transition-colors hover:bg-brand-soft/30">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-neutral text-[10px] font-bold uppercase text-brand-secondary">
                          {(row.company_name || "N").charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-brand-ink">{row.company_name || "Unknown company"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs">
                      <span className="rounded-lg bg-brand-neutral px-2 py-1 font-semibold text-brand-secondary">
                        {formatPlanName(row.plan)}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-mono text-xs text-brand-secondary">
                      {row.payment_id || "NA"}
                    </td>
                    <td className="px-8 py-5 text-xs text-brand-secondary">
                      {formatBillingDate(row.created_at || row.date)}
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-brand-ink">
                      {formatAmount(row.amount, row.currency || "INR")}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${billingStatusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {row.invoice_path && row.payment_id ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 gap-1.5 rounded-lg border-brand-line px-3 text-[10px] font-bold text-brand-primary hover:bg-brand-soft"
                          onClick={() => downloadInvoiceMutation.mutate(row.payment_id)}
                          disabled={downloadInvoiceMutation.isPending}
                        >
                          {downloadingInvoiceId === row.payment_id ? (
                            <LoaderCircle className="size-3 animate-spin" />
                          ) : (
                            <Download className="size-3" />
                          )}
                          Download
                        </Button>
                      ) : (
                        <span className="text-[10px] font-bold text-brand-secondary/40">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paymentHistoryQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm font-medium text-brand-secondary">
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Loading payment history...
            </div>
          ) : null}

          {filteredRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-brand-neutral p-4 text-brand-secondary">
                <Search className="size-8" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand-ink">No transactions found</h3>
              <p className="mt-1 text-sm text-brand-secondary">Try adjusting your search filters.</p>
            </div>
          )}
        </section>
      </div>
    </SuperAdminLayout>
  );
}
