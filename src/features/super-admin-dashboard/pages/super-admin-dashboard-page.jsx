import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BellRing,
  Building2,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  CircleDashed,
  CreditCard,
  LoaderCircle,
  Plus,
  Shield,
  UserRoundCog,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SUPERADMIN_APPROVE_COMPANY,
  SUPERADMIN_COMPANIES,
  SUPERADMIN_DASHBOARD_OVERVIEW,
  SUPERADMIN_PENDING_COMPANIES,
  SUPERADMIN_REJECT_COMPANY,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { useAuthStore } from "@/store/auth-store";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";


function normalizeCollection(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

function formatStatus(status) {
  if (!status) {
    return "Pending";
  }

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }, value);
}

function statusClass(status) {
  if (status === "Active" || status === "Approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Pending" || status === "Pending Verification") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "Rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-brand-line bg-brand-neutral text-brand-secondary";
}

export function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const [selectedCompanyForApproval, setSelectedCompanyForApproval] = useState(null);
  const [selectedCompanyForRejection, setSelectedCompanyForRejection] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const requestConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
    }),
    [session?.accessToken]
  );

  const companiesQuery = useQuery({
    queryKey: ["super-admin-dashboard-companies"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_COMPANIES, requestConfig);
      return normalizeCollection(response.data, ["companies"]);
    },
  });

  const overviewQuery = useQuery({
    queryKey: ["super-admin-dashboard-overview"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_DASHBOARD_OVERVIEW, requestConfig);
      return response.data || {};
    },
  });

  const pendingCompaniesQuery = useQuery({
    queryKey: ["super-admin-dashboard-pending-companies"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_PENDING_COMPANIES, requestConfig);
      return normalizeCollection(response.data, ["companies", "pending_companies", "data"]);
    },
  });

  const companyAdminsQuery = useQuery({
    queryKey: ["super-admin-dashboard-company-admins"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_COMPANIES, requestConfig);
      return normalizeCollection(response.data, ["companies", "data"]);
    },
  });

  const approveCompanyMutation = useMutation({
    mutationFn: async ({ companyId }) => {
      return apiClient.post(SUPERADMIN_APPROVE_COMPANY(companyId), null, requestConfig);
    },
    onSuccess: (response) => {
      toast.success(response.data?.message || "Company approved successfully.");
      setSelectedCompanyForApproval(null);
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-pending-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-company-admins"] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to approve the company right now.";

      toast.error(message);
    },
  });

  const rejectCompanyMutation = useMutation({
    mutationFn: async ({ companyId, reason }) => {
      return apiClient.post(SUPERADMIN_REJECT_COMPANY(companyId), null, {
        ...requestConfig,
        params: {
          reason,
        },
      });
    },
    onSuccess: (response) => {
      toast.success(response.data?.message || "Company request rejected.");
      setSelectedCompanyForRejection(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-pending-companies"] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to reject the company request right now.";

      toast.error(message);
    },
  });

  const allCompanies = useMemo(() => companiesQuery.data || [], [companiesQuery.data]);
  const allCompanyAdmins = useMemo(() => companyAdminsQuery.data || [], [companyAdminsQuery.data]);
  const pendingCompanies = useMemo(() => {
    return (pendingCompaniesQuery.data || []).map((company, index) => ({
      id: company.company_id || company.id || `pending-company-${index}`,
      name: company.company_name || company.name || `Company ${index + 1}`,
      domain: company.domain || company.company_domain || "Not available",
      adminEmail: company.admin_email || company.email || company.owner_email || "",
      phoneNumber: company.phone_number || company.phone || "Not available",
      createdOn: formatDate(company.created_at || company.created_on || company.registered_at),
      status: formatStatus(company.status || "Pending"),
    }));
  }, [pendingCompaniesQuery.data]);

  const recentAdmins = useMemo(() => {
    return (allCompanyAdmins || []).slice(0, 4).map((admin, index) => ({
      id: admin.id || admin.company_id || `company-admin-${index}`,
      name: admin.admin_full_name || admin.full_name || "Unnamed admin",
      email: admin.admin_email || admin.email || "Not available",
      company: admin.name || admin.company_name || "Not assigned",
      status: formatStatus(admin.status || admin.account_status || admin.invite_status || "Active"),
    }));
  }, [allCompanyAdmins]);

  const overview = overviewQuery.data || {};
  const overviewCards = [
    {
      label: "Total Companies",
      value: String(overview.total ?? allCompanies.length ?? 0),
      note: "All company workspaces tracked by the platform",
      icon: Building2,
      accent: "bg-brand-soft text-brand-primary",
    },
    {
      label: "Approved",
      value: String(overview.approved ?? 0),
      note: "Companies ready for admin login and workspace access",
      icon: UserCheck,
      accent: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Pending Verification",
      value: String(allCompanies.filter(c => formatStatus(c.status) === "Pending Verification").length),
      note: "Company registrations pending domain OTP verification",
      icon: CircleDashed,
      accent: "bg-amber-50 text-amber-700",
    },
    {
      label: "Pending Admin",
      value: String(pendingCompanies.length),
      note: "Verified companies waiting for super admin approval",
      icon: UserRoundCog,
      accent: "bg-sky-50 text-sky-700",
    },
    {
      label: "Rejected",
      value: String(overview.rejected ?? 0),
      note: "Registration requests closed by the platform team",
      icon: XCircle,
      accent: "bg-rose-50 text-rose-700",
    },
    {
      label: "Platform Health",
      value: overviewQuery.isLoading ? "..." : "Healthy",
      note: "Overview and queue services are responding normally",
      icon: Activity,
      accent: "bg-violet-50 text-violet-700",
    },
  ];



  function handleApproveIntent(company) {
    setSelectedCompanyForApproval(company);
  }

  function handleConfirmApprove() {
    if (!selectedCompanyForApproval) {
      return;
    }

    approveCompanyMutation.mutate({
      companyId: selectedCompanyForApproval.id,
    });
  }

  function handleRejectIntent(company) {
    setSelectedCompanyForRejection(company);
    setRejectionReason("");
  }

  function handleConfirmReject() {
    if (!selectedCompanyForRejection) {
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error("Enter a reason before rejecting the company.");
      return;
    }

    rejectCompanyMutation.mutate({
      companyId: selectedCompanyForRejection.id,
      reason: rejectionReason.trim(),
    });
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-10 pb-12">
        {/* Hero Section */}
        <section className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-8 w-full md:w-auto">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-brand-primary w-fit">
                <Shield className="size-3.5" />
                Super Admin Dashboard
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-brand-ink lg:text-4xl">
                  Platform Command Center
                </h1>
              </div>
            </div>
          </div>
          <div className="w-full md:w-auto">
            <Button
              type="button"
              className="w-full h-12 rounded-2xl bg-brand-primary px-6 text-white shadow-lg hover:shadow-xl hover:bg-brand-primary/90 transition-all duration-200 md:w-auto"
              onClick={() => navigate("/super-admin/dashboard/companies/create")}
            >
              <Plus className="size-5" />
              <span className="ml-2 font-semibold">Add Company</span>
            </Button>
          </div>
        </section>

        {/* Overview Cards Grid */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.label}
                className="group relative overflow-hidden rounded-[20px] border border-brand-line bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" />
                <div className="relative space-y-3">
                  <div className="space-y-1.5 pr-12">
                    <p className="text-[11px] font-semibold tracking-widest text-brand-secondary truncate" title={card.label}>
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold tracking-tight text-brand-ink">
                      {card.value}
                    </p>
                  </div>
                  <p className="text-[11px] leading-5 text-brand-secondary/70">
                    {card.note}
                  </p>
                </div>
                <div className="absolute right-5 top-[25%] -translate-y-1/2">
                  <div className={`flex items-center justify-center rounded-xl p-2.5 ${card.accent} transition-transform group-hover:scale-110 duration-300`}>
                    <Icon className="size-4" />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Data Tables Section */}
        <section className="grid gap-8 lg:grid-cols-2">
          {/* Pending Companies */}
          <div className="overflow-hidden rounded-3xl border border-brand-line bg-white shadow-lg">
            <div className="flex items-center justify-between gap-4 border-b border-brand-line bg-gradient-to-r from-brand-neutral/50 to-transparent px-8 py-6">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary">
                  Pending Approvals
                </p>
                <h3 className="text-2xl font-bold text-brand-ink">
                  Company Registrations
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-brand-line bg-white px-4 text-sm font-semibold text-brand-ink hover:bg-brand-neutral transition-colors"
                onClick={() => navigate("/super-admin/dashboard/companies")}
              >
                View all
              </Button>
            </div>

            <div className="overflow-x-auto">
              {pendingCompaniesQuery.isLoading ? (
                <div className="flex min-h-64 items-center justify-center gap-3 px-8 py-10 text-brand-secondary">
                  <LoaderCircle className="size-5 animate-spin" />
                  <span className="font-medium">Loading pending companies</span>
                </div>
              ) : pendingCompaniesQuery.isError ? (
                <div className="px-8 py-10 text-sm font-medium text-brand-tertiary">
                  Unable to load pending companies right now.
                </div>
              ) : pendingCompanies.length ? (
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-brand-neutral/40">
                      <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-widest text-brand-secondary">
                        Company
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-widest text-brand-secondary">
                        Admin Email
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-widest text-brand-secondary">
                        Created On
                      </th>
                      <th className="px-8 py-4 text-center text-xs font-bold uppercase tracking-widest text-brand-secondary">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line">
                    {pendingCompanies.map((company) => {
                      const isApproving =
                        approveCompanyMutation.isPending &&
                        approveCompanyMutation.variables?.companyId === company.id;
                      const isRejecting =
                        rejectCompanyMutation.isPending &&
                        rejectCompanyMutation.variables?.companyId === company.id;

                      return (
                        <tr key={company.id} className="hover:bg-brand-neutral/30 transition-colors">
                          <td className="px-8 py-5">
                            <p className="text-sm font-semibold text-brand-ink">{company.name}</p>
                            <p className="mt-1 text-xs text-brand-secondary">{company.domain}</p>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-sm text-brand-ink">{company.adminEmail || "Not available"}</p>
                            <p className="mt-1 text-xs text-brand-secondary">{company.phoneNumber}</p>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-sm text-brand-secondary">{company.createdOn}</p>
                            <span
                              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${statusClass(company.status)}`}
                            >
                              {company.status}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                className="relative inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isApproving || isRejecting}
                                onClick={() => handleApproveIntent(company)}
                              >
                                {isApproving ? (
                                  <>
                                    <LoaderCircle className="size-4 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCheck className="size-4" />
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                className="relative inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isApproving || isRejecting}
                                onClick={() => handleRejectIntent(company)}
                              >
                                {isRejecting ? (
                                  <>
                                    <LoaderCircle className="size-4 animate-spin" />
                                    Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="size-4" />
                                    Reject
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="px-8 py-12 text-center">
                  <p className="text-sm font-medium text-brand-secondary">
                    No pending company registrations right now.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Company Admins */}
          <div className="overflow-hidden rounded-3xl border border-brand-line bg-white shadow-lg">
            <div className="flex items-center justify-between gap-4 border-b border-brand-line bg-gradient-to-r from-brand-neutral/50 to-transparent px-8 py-6">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary">
                  Recent Activity
                </p>
                <h3 className="text-2xl font-bold text-brand-ink">
                  Company Admins
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-brand-line bg-white px-4 text-sm font-semibold text-brand-ink hover:bg-brand-neutral transition-colors"
                onClick={() => navigate("/super-admin/dashboard/admins")}
              >
                View all
              </Button>
            </div>

            <div className="h-96 overflow-y-auto">
              {companyAdminsQuery.isLoading ? (
                <div className="flex min-h-64 items-center justify-center gap-3 px-8 py-10 text-brand-secondary">
                  <LoaderCircle className="size-5 animate-spin" />
                  <span className="font-medium">Loading company admins</span>
                </div>
              ) : companyAdminsQuery.isError ? (
                <div className="px-8 py-10 text-sm font-medium text-brand-tertiary">
                  Unable to load company admin activity right now.
                </div>
              ) : recentAdmins.length ? (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-brand-neutral">
                      <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-widest text-brand-secondary">
                        Admin Name
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-widest text-brand-secondary">
                        Company
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-widest text-brand-secondary">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line">
                    {recentAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-brand-neutral/30 transition-colors">
                        <td className="px-8 py-5 break-words">
                          <p className="text-sm font-semibold text-brand-ink">{admin.name}</p>
                          <p className="mt-1 text-xs text-brand-secondary break-all">{admin.email}</p>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-brand-secondary break-words">{admin.company}</td>
                        <td className="px-8 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${statusClass(admin.status)}`}
                          >
                            {admin.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-8 py-12 text-center">
                  <p className="text-sm font-medium text-brand-secondary">
                    No company admin activity found yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Approval Dialog */}
        <Dialog
          open={Boolean(selectedCompanyForApproval)}
          onOpenChange={(open) => {
            if (!open && !approveCompanyMutation.isPending) {
              setSelectedCompanyForApproval(null);
            }
          }}
        >
          <DialogContent className="rounded-3xl border border-brand-line bg-white">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold text-brand-ink">
                Confirm Company Approval
              </DialogTitle>
              <DialogDescription className="text-base leading-7 text-brand-secondary">
                You are about to approve{" "}
                <span className="font-semibold text-brand-ink">
                  {selectedCompanyForApproval?.name || "this company"}
                </span>
                . The company admin will then be able to access their workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-brand-line bg-brand-neutral/40 p-5 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Company Name</p>
                <p className="mt-2 text-sm font-semibold text-brand-ink">
                  {selectedCompanyForApproval?.name || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Domain</p>
                <p className="mt-2 text-sm font-semibold text-brand-ink">
                  {selectedCompanyForApproval?.domain || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Admin Email</p>
                <p className="mt-2 text-sm font-semibold text-brand-ink">
                  {selectedCompanyForApproval?.adminEmail || "Not available"}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-brand-line px-6 font-semibold"
                disabled={approveCompanyMutation.isPending}
                onClick={() => setSelectedCompanyForApproval(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-brand-primary px-6 text-white font-semibold shadow-lg hover:shadow-xl hover:bg-brand-primary/90 transition-all"
                disabled={approveCompanyMutation.isPending}
                onClick={handleConfirmApprove}
              >
                {approveCompanyMutation.isPending ? "Approving..." : "Approve Company"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog
          open={Boolean(selectedCompanyForRejection)}
          onOpenChange={(open) => {
            if (!open && !rejectCompanyMutation.isPending) {
              setSelectedCompanyForRejection(null);
              setRejectionReason("");
            }
          }}
        >
          <DialogContent className="rounded-3xl border border-brand-line bg-white">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold text-brand-ink">
                Reject Company Request
              </DialogTitle>
              <DialogDescription className="text-base leading-7 text-brand-secondary">
                Please provide a reason for rejecting{" "}
                <span className="font-semibold text-brand-ink">
                  {selectedCompanyForRejection?.name || "this company"}
                </span>
                . This will be communicated to the applicant.
              </DialogDescription>
            </DialogHeader>

            <Input
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Enter rejection reason"
              className="h-12 rounded-xl border-brand-line bg-brand-neutral text-brand-ink placeholder:text-brand-secondary/50"
            />

            <DialogFooter className="gap-3 sm:justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-brand-line px-6 font-semibold"
                disabled={rejectCompanyMutation.isPending}
                onClick={() => {
                  setSelectedCompanyForRejection(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-rose-600 px-6 text-white font-semibold shadow-lg hover:shadow-xl hover:bg-rose-700 transition-all"
                disabled={rejectCompanyMutation.isPending}
                onClick={handleConfirmReject}
              >
                {rejectCompanyMutation.isPending ? "Rejecting..." : "Reject Company"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
