import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  Download,
  LoaderCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BILLING_DETAILS, BILLING_HISTORY, BILLING_RAZORPAY, BILLING_VERIFY, COMPANY_ME, PLANS } from "@/config/api";
import { AdminLayout } from "@/layouts/admin-layout";
import { apiClient } from "@/lib/client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  billingStatusClass,
  downloadInvoice,
  fallbackPlans,
  formatBillingDate,
  formatPlanName,
  formatPlanPrice,
  isPopularPlan,
  loadRazorpayScript,
  normalizePlans,
  planFeatures,
} from "@/lib/billing";

export function AdminBillingPage() {
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const response = await apiClient.get(PLANS);
      return response.data;
    },
  });

  const billingDetailsQuery = useQuery({
    queryKey: ["billing-details"],
    queryFn: async () => {
      const response = await apiClient.get(BILLING_DETAILS);
      return response.data;
    },
  });

  const paymentHistoryQuery = useQuery({
    queryKey: ["billing-history"],
    queryFn: async () => {
      const response = await apiClient.get(BILLING_HISTORY);
      return response.data;
    },
  });

  const companyQuery = useQuery({
    queryKey: ["company-me", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_ME);
      return response.data?.data || response.data?.company || response.data || {};
    },
    enabled: Boolean(session?.accessToken),
    staleTime: 5 * 60 * 1000,
  });

  const plans = useMemo(() => normalizePlans(plansQuery.data || fallbackPlans), [plansQuery.data]);
  const currentPlanName = String(billingDetailsQuery.data?.plan || "").toUpperCase();
  const currentPlan = plans.find((plan) => plan.name === currentPlanName);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || currentPlan || plans[0],
    [currentPlan, plans, selectedPlanId]
  );

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, orderId, signature, planName }) => {
      const response = await apiClient.post(BILLING_VERIFY, null, {
        params: {
          provider: "razorpay",
          payment_id: paymentId,
          order_id: orderId,
          signature,
          plan: planName,
        },
      });
      return response.data;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing-details"] }),
        queryClient.invalidateQueries({ queryKey: ["billing-history"] }),
      ]);
      toast.success(data?.message || "Payment verified successfully.");
    },
    onError: (error) => {
      toast.error(error.userMessage || "Payment verification failed.");
    },
  });

  const startPaymentMutation = useMutation({
    mutationFn: async (plan) => {
      const response = await apiClient.post(BILLING_RAZORPAY, null, {
        params: { plan: plan.name },
      });
      return {
        selectedPlan: plan,
        paymentOrder: response.data,
      };
    },
    onSuccess: async ({ selectedPlan, paymentOrder }) => {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        toast.error("Unable to load Razorpay checkout.");
        return;
      }

      const company = companyQuery.data || {};
      const razorpayKey = paymentOrder.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "";

      if (!razorpayKey) {
        toast.error("Razorpay key is missing. Set RAZORPAY_KEY_ID on the backend or VITE_RAZORPAY_KEY_ID on the frontend.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: Math.round(Number(paymentOrder.order?.amount || paymentOrder.display_amount || 0) * 100),
        currency: paymentOrder.currency || "INR",
        name: company.company_name || company.name || "Levitica Connect",
        description: `${formatPlanName(selectedPlan.name)} plan subscription`,
        order_id: paymentOrder.order?.id,
        handler: async (response) => {
          await verifyPaymentMutation.mutateAsync({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            planName: selectedPlan.name,
          });
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment was cancelled.");
          },
        },
        prefill: {
          name: session?.full_name || session?.name || "",
          email: session?.email || "",
          contact: session?.mobile_number || session?.phone_number || "",
        },
        notes: {
          plan: selectedPlan.name,
          company_id: session?.company_id || "",
        },
        theme: {
          color: "#4A90E2",
        },
      });

      razorpay.on("payment.failed", (response) => {
        const message = response?.error?.description || "Payment failed.";
        toast.error(message);
      });

      razorpay.open();
    },
    onError: (error) => {
      toast.error(error.userMessage || "Unable to start payment.");
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: downloadInvoice,
    onError: (error) => {
      toast.error(error.userMessage || "Unable to download invoice.");
    },
  });

  const rows = Array.isArray(paymentHistoryQuery.data) ? paymentHistoryQuery.data : [];
  const latestPayment = rows[0];
  const selectedIsCurrent = selectedPlan?.name === currentPlanName;
  const isProcessingPayment = startPaymentMutation.isPending || verifyPaymentMutation.isPending;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-5 pb-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-brand-secondary">
              <ReceiptText className="size-3 text-brand-primary" />
              Admin / Billing
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-brand-ink">Billing</h1>
              <p className="mt-1 text-sm text-brand-secondary">Manage your plan, payment, and invoices.</p>
            </div>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-brand-line bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary">Current plan</p>
            <p className="mt-2 text-xl font-bold text-brand-ink">
              {formatPlanName(currentPlanName || selectedPlan?.name)}
            </p>
            <p className="mt-1 text-xs text-brand-secondary">
              {currentPlan ? `${currentPlan.duration_days}-day billing cycle` : "Plan details loading"}
            </p>
          </div>
          <div className="rounded-lg border border-brand-line bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary">Amount due</p>
            <p className="mt-2 text-xl font-bold text-brand-ink">{formatPlanPrice(selectedPlan)}</p>
            <p className="mt-1 text-xs text-brand-secondary">
              {selectedIsCurrent ? "No upgrade selected" : `${formatPlanName(selectedPlan?.name)} selected`}
            </p>
          </div>
          <div className="rounded-lg border border-brand-line bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary">Last payment</p>
            <p className="mt-2 truncate text-xl font-bold text-brand-ink">
              {latestPayment ? formatBillingDate(latestPayment.created_at || latestPayment.payment_date) : "NA"}
            </p>
            <p className="mt-1 text-xs text-brand-secondary">
              {latestPayment ? latestPayment.status || "pending" : "No payments yet"}
            </p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-brand-line bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-brand-ink">Available Plans</h2>
                <p className="text-xs text-brand-secondary">Choose a plan, then confirm payment.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Razorpay ready
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {plans.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                const isCurrent = plan.name === currentPlanName;
                const features = planFeatures(plan);

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "relative rounded-lg border bg-white p-4 text-left transition hover:border-brand-primary/70 hover:bg-brand-soft/20",
                      isSelected
                        ? "border-brand-primary bg-brand-soft/25 shadow-sm"
                        : "border-brand-line"
                    )}
                  >
                    {isPopularPlan(plan, plans) ? (
                      <span className="absolute right-3 top-3 rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Popular
                      </span>
                    ) : null}
                    <div className="flex items-start justify-between gap-3 pr-16">
                      <div>
                        <p className="text-base font-bold text-brand-ink">{formatPlanName(plan.name)}</p>
                        <p className="mt-1 text-xs text-brand-secondary">{plan.duration_days}-day cycle</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-brand-ink">{formatPlanPrice(plan)}</p>
                        <p className="text-[11px] font-semibold text-brand-secondary">{plan.max_users} users</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs font-medium text-brand-secondary sm:grid-cols-2">
                      {features.slice(1, 3).map((feature) => (
                        <div key={feature} className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 shrink-0 text-brand-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <span
                      className={cn(
                        "mt-4 inline-flex rounded-md border px-2.5 py-1 text-[11px] font-bold",
                        isSelected
                          ? "border-brand-primary bg-brand-primary text-white"
                          : "border-brand-line bg-brand-neutral text-brand-secondary"
                      )}
                    >
                      {isCurrent ? "Current plan" : isSelected ? "Selected" : "Select"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-lg border border-brand-line bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-brand-ink">Checkout</h2>
                <p className="text-xs text-brand-secondary">Review before payment.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-lg border border-brand-line bg-brand-neutral/40 p-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-brand-secondary">Selected plan</span>
                <span className="font-bold text-brand-ink">{formatPlanName(selectedPlan?.name)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-brand-secondary">Duration</span>
                <span className="font-bold text-brand-ink">{selectedPlan?.duration_days || 0} days</span>
              </div>
              <div className="border-t border-brand-line pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-secondary">Amount due</span>
                  <span className="text-xl font-black text-brand-ink">
                    {formatPlanPrice(selectedPlan)}
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              className="mt-4 h-10 w-full rounded-lg bg-brand-primary text-sm font-bold text-white hover:bg-brand-primary/90"
              onClick={() => startPaymentMutation.mutate(selectedPlan)}
              disabled={!selectedPlan || selectedIsCurrent || isProcessingPayment}
            >
              {isProcessingPayment ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 size-4" />
              )}
              {selectedIsCurrent ? "Current Plan Active" : "Continue to Payment"}
            </Button>
            <p className="mt-3 text-xs leading-5 text-brand-secondary">
              Payment verification refreshes your plan and invoice list automatically.
            </p>
          </aside>
        </section>

        <section className="overflow-hidden rounded-lg border border-brand-line bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-brand-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-brand-ink">Payment History</h2>
              <p className="text-xs text-brand-secondary">Recent payments and downloadable invoices.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-brand-neutral/60 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-secondary">
                <tr>
                  <th className="px-4 py-3">Payment ID</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {rows.map((payment) => (
                  <tr key={payment.id || payment.payment_id} className="transition-colors hover:bg-brand-soft/30">
                    <td className="max-w-[190px] truncate px-4 py-3 font-mono text-xs font-semibold text-brand-ink">{payment.payment_id || payment.id || "NA"}</td>
                    <td className="px-4 py-3 font-semibold text-brand-ink">{formatPlanName(payment.plan)}</td>
                    <td className="px-4 py-3 text-brand-secondary">{formatBillingDate(payment.created_at || payment.payment_date)}</td>
                    <td className="px-4 py-3 font-bold text-brand-ink">
                      {formatPlanPrice({ price: payment.amount || payment.base_amount, currency: payment.currency || "INR" })}
                    </td>
                    <td className="px-4 py-3 text-brand-secondary">{payment.provider || "Razorpay"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize", billingStatusClass(payment.status))}>
                        {payment.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {payment.payment_id && ["paid", "success", "successful"].includes(String(payment.status || "").toLowerCase()) ? (
                        <Button
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-xs font-semibold text-brand-primary"
                          onClick={() => invoiceMutation.mutate(payment.payment_id)}
                        >
                          <Download className="mr-1.5 size-3.5" />
                          PDF
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-brand-secondary/50">NA</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!paymentHistoryQuery.isLoading && rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm font-medium text-brand-secondary">
              No payment history yet.
            </div>
          ) : null}
        </section>
      </div>
    </AdminLayout>
  );
}
