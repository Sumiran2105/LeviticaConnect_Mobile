import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCheck,
  LoaderCircle,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
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
  SUPERADMIN_DELETE_COMPANY,
  SUPERADMIN_PENDING_COMPANIES,
  SUPERADMIN_REGISTRATION_PENDING_COMPANIES,
  SUPERADMIN_REJECT_COMPANY,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { useAuthStore } from "@/store/auth-store";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";

function normalizeCollection(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.companies)) {
    return data.companies;
  }

  if (Array.isArray(data?.pending_companies)) {
    return data.pending_companies;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
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

function formatStatus(status) {
  if (!status) {
    return "Pending";
  }

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status) {
  if (status === "Pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "Rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-brand-line bg-brand-neutral text-brand-secondary";
}

function PendingCompaniesView({ variant = "pending" }) {
  const isRegistrationPending = variant === "registration";
  const pageQueryKey = isRegistrationPending
    ? "super-admin-registration-pending-companies-page"
    : "super-admin-pending-companies-page";
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const [search, setSearch] = useState("");
  const [selectedCompanyForApproval, setSelectedCompanyForApproval] = useState(null);
  const [selectedCompanyForRejection, setSelectedCompanyForRejection] = useState(null);
  const [selectedCompanyForDeletion, setSelectedCompanyForDeletion] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const requestConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
    }),
    [session?.accessToken]
  );

  const pendingCompaniesQuery = useQuery({
    queryKey: [pageQueryKey],
    queryFn: async () => {
      const response = await apiClient.get(
        isRegistrationPending ? SUPERADMIN_REGISTRATION_PENDING_COMPANIES : SUPERADMIN_PENDING_COMPANIES,
        requestConfig
      );
      return normalizeCollection(response.data);
    },
    enabled: Boolean(session?.accessToken),
  });

  const approveCompanyMutation = useMutation({
    mutationFn: async ({ companyId }) => {
      return apiClient.post(SUPERADMIN_APPROVE_COMPANY(companyId), null, requestConfig);
    },
    onSuccess: (response) => {
      toast.success(response.data?.message || "Company approved successfully.");
      setSelectedCompanyForApproval(null);
      queryClient.invalidateQueries({ queryKey: [pageQueryKey] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-registration-pending-companies-page"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-pending-companies-page"] });
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
      queryClient.invalidateQueries({ queryKey: [pageQueryKey] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-registration-pending-companies-page"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-pending-companies-page"] });
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

  const deleteCompanyMutation = useMutation({
    mutationFn: async ({ companyId }) => {
      return apiClient.delete(SUPERADMIN_DELETE_COMPANY(companyId), requestConfig);
    },
    onSuccess: (response) => {
      toast.success(response.data?.message || "Company deleted successfully.");
      setSelectedCompanyForDeletion(null);
      queryClient.invalidateQueries({ queryKey: [pageQueryKey] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-registration-pending-companies-page"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-pending-companies-page"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-pending-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-company-admins"] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to delete the company right now.";

      toast.error(message);
    },
  });

  const pendingCompanies = useMemo(() => {
    return (pendingCompaniesQuery.data || []).map((company, index) => ({
      id: company.company_id || company.id || `pending-company-${index}`,
      name: company.company_name || company.name || `Company ${index + 1}`,
      adminName: company.admin_name || company.admin?.name || "Not available",
      domain: company.domain || company.company_domain || "Not available",
      adminEmail: company.admin_email || company.email || company.owner_email || "",
      phoneNumber: company.phone_number || company.phone || "Not available",
      address: company.address || company.company_address || "Not available",
      createdOn: formatDate(company.created_at || company.created_on || company.registered_at),
      status: formatStatus(company.status || "Pending"),
    }));
  }, [pendingCompaniesQuery.data]);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return pendingCompanies;
    }

    return pendingCompanies.filter((company) =>
      [company.name, company.adminName, company.domain, company.adminEmail, company.phoneNumber, company.address, company.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [pendingCompanies, search]);

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

  function handleDeleteIntent(company) {
    setSelectedCompanyForDeletion(company);
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

  function handleConfirmDelete() {
    if (!selectedCompanyForDeletion) {
      return;
    }

    deleteCompanyMutation.mutate({
      companyId: selectedCompanyForDeletion.id,
    });
  }

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1 text-[10px] font-bold  tracking-[0.2em] text-brand-secondary">
              <Building2 className="size-3 text-brand-primary" />
              {isRegistrationPending ? "Registration Pending" : "Pending Companies"}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
                {isRegistrationPending ? "Registration Pending" : "Company Approval Queue"}
              </h1>
              <p className="mt-2 text-sm text-brand-secondary">
                {isRegistrationPending
                  ? "Review companies waiting for verification and remove duplicate or invalid registrations when needed."
                  : "Review pending companies and approve, reject, or delete them."}
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-secondary" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by company, admin, domain, or phone"
              className="h-12 rounded-2xl border-brand-line bg-white pl-11 text-brand-ink"
            />
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-brand-line bg-white shadow-[0_16px_50px_rgba(68,83,74,0.06)]">
          <div className="border-b border-brand-line px-6 py-5">
            <h2 className="text-lg font-semibold text-brand-ink">
              {isRegistrationPending ? "Pending Registrations" : "Pending Requests"}
            </h2>
            <p className="mt-1 text-sm text-brand-secondary">
              {isRegistrationPending
                ? "Each request is shown with the registration details submitted from the public page."
                : "Approve moves the verified company forward so the admin can log in with the password created during registration."}
            </p>
          </div>

          <div className="overflow-x-auto">
            {pendingCompaniesQuery.isLoading ? (
              <div className="flex min-h-56 items-center justify-center gap-3 px-6 py-10 text-brand-secondary">
                <LoaderCircle className="size-5 animate-spin" />
                Loading pending companies
              </div>
            ) : pendingCompaniesQuery.isError ? (
              <div className="px-6 py-10 text-sm text-brand-tertiary">
                Unable to load pending companies right now.
              </div>
            ) : filteredCompanies.length ? (
              <table className="min-w-full border-collapse">
                <thead className="bg-brand-neutral">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Admin
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => {
                    const isApproving =
                      approveCompanyMutation.isPending &&
                      approveCompanyMutation.variables?.companyId === company.id;
                    const isRejecting =
                      rejectCompanyMutation.isPending &&
                      rejectCompanyMutation.variables?.companyId === company.id;
                    const isDeleting =
                      deleteCompanyMutation.isPending &&
                      deleteCompanyMutation.variables?.companyId === company.id;

                    return (
                      <tr key={company.id} className="border-t border-brand-line hover:bg-brand-neutral/50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-brand-ink">{company.name}</p>
                          <p className="mt-1 text-sm text-brand-secondary">{company.domain}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-brand-ink">{company.adminName}</p>
                          <p className="mt-1 text-sm text-brand-secondary">{company.adminEmail || "Not available"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-brand-ink">{company.phoneNumber}</p>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusClass(company.status)}`}
                          >
                            {company.status}
                          </span>
                          <p className="mt-2 text-xs text-brand-secondary">Registered {company.createdOn}</p>
                        </td>
                        <td className="max-w-sm px-6 py-4">
                          <p className="line-clamp-3 text-sm text-brand-secondary">{company.address}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {!isRegistrationPending ? (
                              <>
                                <Button
                                  type="button"
                                  className="h-9 rounded-xl bg-brand-primary px-4 text-white hover:bg-brand-primary/90"
                                  disabled={isApproving || isRejecting || isDeleting}
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
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-xl border-rose-200 px-4 text-rose-700 hover:bg-rose-50"
                                  disabled={isApproving || isRejecting || isDeleting}
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
                                </Button>
                              </>
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-xl border-red-200 px-4 text-red-700 hover:bg-red-50"
                              disabled={isApproving || isRejecting || isDeleting}
                              onClick={() => handleDeleteIntent(company)}
                            >
                              {isDeleting ? (
                                <>
                                  <LoaderCircle className="size-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="size-4" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-10 text-sm text-brand-secondary">
                No pending company registrations right now.
              </div>
            )}
          </div>
        </section>

        {!isRegistrationPending ? (
          <Dialog
          open={Boolean(selectedCompanyForApproval)}
          onOpenChange={(open) => {
            if (!open && !approveCompanyMutation.isPending) {
              setSelectedCompanyForApproval(null);
            }
          }}
        >
          <DialogContent className="rounded-[28px] border border-brand-line bg-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-brand-ink">
                Confirm approval and invite
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-brand-secondary">
                The company{" "}
                <span className="font-semibold text-brand-ink">
                  {selectedCompanyForApproval?.name || "this company"}
                </span>{" "}
                will be approved. After approval, the company admin can log in using the password that was set during registration.
                Please confirm to continue.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-[22px] border border-brand-line bg-brand-neutral p-4 text-sm text-brand-secondary">
              <p>
                <span className="font-semibold text-brand-ink">Admin:</span>{" "}
                {selectedCompanyForApproval?.adminName || "Not available"}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-brand-ink">Company:</span>{" "}
                {selectedCompanyForApproval?.name || "Not available"}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-brand-ink">Domain:</span>{" "}
                {selectedCompanyForApproval?.domain || "Not available"}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-brand-ink">Admin email:</span>{" "}
                {selectedCompanyForApproval?.adminEmail || "Not available"}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-brand-ink">Phone:</span>{" "}
                {selectedCompanyForApproval?.phoneNumber || "Not available"}
              </p>
            </div>

            <DialogFooter className="gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-brand-line px-5"
                disabled={approveCompanyMutation.isPending}
                onClick={() => setSelectedCompanyForApproval(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl bg-brand-primary px-5 text-white hover:bg-brand-primary/90"
                disabled={approveCompanyMutation.isPending}
                onClick={handleConfirmApprove}
              >
                {approveCompanyMutation.isPending ? "Approving..." : "Confirm approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        ) : null}

        {!isRegistrationPending ? (
          <Dialog
          open={Boolean(selectedCompanyForRejection)}
          onOpenChange={(open) => {
            if (!open && !rejectCompanyMutation.isPending) {
              setSelectedCompanyForRejection(null);
              setRejectionReason("");
            }
          }}
        >
          <DialogContent className="rounded-[28px] border border-brand-line bg-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-brand-ink">
                Reject company request
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-brand-secondary">
                Enter the reason for rejecting{" "}
                <span className="font-semibold text-brand-ink">
                  {selectedCompanyForRejection?.name || "this company"}
                </span>
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Input
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Enter rejection reason"
                className="h-12 rounded-2xl border-brand-line bg-brand-neutral"
              />
            </div>

            <DialogFooter className="gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-brand-line px-5"
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
                className="h-11 rounded-2xl bg-rose-600 px-5 text-white hover:bg-rose-700"
                disabled={rejectCompanyMutation.isPending}
                onClick={handleConfirmReject}
              >
                {rejectCompanyMutation.isPending ? "Rejecting..." : "Confirm reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        ) : null}

        <Dialog
          open={Boolean(selectedCompanyForDeletion)}
          onOpenChange={(open) => {
            if (!open && !deleteCompanyMutation.isPending) {
              setSelectedCompanyForDeletion(null);
            }
          }}
        >
          <DialogContent className="rounded-[28px] border border-brand-line bg-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-brand-ink">
                Delete company registration
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-brand-secondary">
                This will permanently delete{" "}
                <span className="font-semibold text-brand-ink">
                  {selectedCompanyForDeletion?.name || "this company"}
                </span>
                . This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <p>
                <span className="font-semibold">Company:</span>{" "}
                {selectedCompanyForDeletion?.name || "Not available"}
              </p>
              <p className="mt-2">
                <span className="font-semibold">Admin:</span>{" "}
                {selectedCompanyForDeletion?.adminName || "Not available"}
              </p>
              <p className="mt-2">
                <span className="font-semibold">Email:</span>{" "}
                {selectedCompanyForDeletion?.adminEmail || "Not available"}
              </p>
            </div>

            <DialogFooter className="gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-brand-line px-5"
                disabled={deleteCompanyMutation.isPending}
                onClick={() => setSelectedCompanyForDeletion(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl bg-red-600 px-5 text-white hover:bg-red-700"
                disabled={deleteCompanyMutation.isPending}
                onClick={handleConfirmDelete}
              >
                {deleteCompanyMutation.isPending ? "Deleting..." : "Delete company"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}

export function PendingCompaniesPage() {
  return <PendingCompaniesView variant="pending" />;
}

export function RegistrationPendingCompaniesPage() {
  return <PendingCompaniesView variant="registration" />;
}
