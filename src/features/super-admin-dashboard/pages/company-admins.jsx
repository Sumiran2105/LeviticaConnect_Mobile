import { useQuery } from "@tanstack/react-query";
import {
  LoaderCircle,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { SUPERADMIN_COMPANIES } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";

function normalizeCompanies(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.companies)) {
    return data.companies;
  }

  return [];
}

export function CompanyAdminsPage() {
  const session = useAuthStore((state) => state.session);
  const [search, setSearch] = useState("");

  const companyAdminsQuery = useQuery({
    queryKey: ["super-admin-company-admins"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_COMPANIES, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      return normalizeCompanies(response.data);
    },
  });

  const adminRows = useMemo(() => {
    return (companyAdminsQuery.data || []).map((company, index) => {
      return {
        id: company.id || company.company_id || `company-${index}`,
        companyName: company.name || company.company_name || `Company ${index + 1}`,
        adminName:
          company.admin_full_name ||
          company.full_name ||
          company.name_of_admin ||
          "Not available",
        mobileNumber:
          company.phone_number ||
          company.phone ||
          company.mobile_number ||
          "Not available",
        email: company.admin_email || company.email || "Not available",
        status: company.status || "unknown",
      };
    });
  }, [companyAdminsQuery.data]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return adminRows;
    }

    return adminRows.filter((row) =>
      [row.companyName, row.adminName, row.mobileNumber, row.email, row.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [adminRows, search]);

  const activeCount = adminRows.filter((row) => row.status.toLowerCase() === "approved").length;
  const pendingCount = adminRows.filter((row) => row.status.toLowerCase() === "pending").length;

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1 text-[10px] font-bold  tracking-[0.2em] text-brand-secondary">
              <UserRoundCog className="size-3 text-brand-primary" />
              Company Admins
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
                All Company Admins
              </h1>
              <p className="mt-2 text-sm text-brand-secondary">
                A live directory of company admin accounts across all onboarded companies.
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-secondary" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or company"
              className="h-12 rounded-2xl border-brand-line bg-white pl-11 text-brand-ink"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-brand-line bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Total Admins</p>
                <p className="text-2xl font-semibold text-brand-ink">{adminRows.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-brand-line bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Active</p>
                <p className="text-2xl font-semibold text-brand-ink">{activeCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-brand-line bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
                <Mail className="size-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Pending</p>
                <p className="text-2xl font-semibold text-brand-ink">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-brand-line bg-white shadow-[0_16px_50px_rgba(68,83,74,0.06)]">
          <div className="border-b border-brand-line px-6 py-5">
            <h2 className="text-lg font-semibold text-brand-ink">Admin Directory</h2>
            <p className="mt-1 text-sm text-brand-secondary">
              This table is derived from the live company records returned by the super admin companies API.
            </p>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            {companyAdminsQuery.isLoading ? (
              <div className="flex min-h-56 items-center justify-center gap-3 px-6 py-10 text-brand-secondary">
                <LoaderCircle className="size-5 animate-spin" />
                Loading company admins
              </div>
            ) : companyAdminsQuery.isError ? (
              <div className="px-6 py-10 text-sm text-brand-tertiary">
                Unable to load company admins right now. Try refreshing the page or signing in again.
              </div>
            ) : filteredRows.length ? (
              <table className="min-w-full border-collapse">
                <thead className="bg-brand-neutral sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Company Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Admin Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Mobile No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-brand-line hover:bg-brand-neutral/50">
                      <td className="px-6 py-4 text-sm font-semibold text-brand-ink">
                        {row.companyName}
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-ink">{row.adminName}</td>
                      <td className="px-6 py-4 text-sm text-brand-secondary">
                        <div className="inline-flex items-center gap-2">
                          <Phone className="size-4 text-brand-primary" />
                          {row.mobileNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-secondary">{row.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-10 text-sm text-brand-secondary">
                No company admins found yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </SuperAdminLayout>
  );
}
