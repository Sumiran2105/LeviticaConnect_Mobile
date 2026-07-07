/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { useAuthStore } from "@/store/auth-store";

const AddCompanyPage = lazy(() => import("./pages/add-company").then((module) => ({ default: module.AddCompanyPage })));
const CompaniesPage = lazy(() => import("./pages/companies").then((module) => ({ default: module.CompaniesPage })));
const CompanyAdminsPage = lazy(() => import("./pages/company-admins").then((module) => ({ default: module.CompanyAdminsPage })));
const PendingCompaniesPage = lazy(() => import("./pages/pending-companies").then((module) => ({ default: module.PendingCompaniesPage })));
const RegistrationPendingCompaniesPage = lazy(() => import("./pages/pending-companies").then((module) => ({ default: module.RegistrationPendingCompaniesPage })));
const SuperAdminDashboardPage = lazy(() => import("./pages/super-admin-dashboard-page").then((module) => ({ default: module.SuperAdminDashboardPage })));
const SendNotificationsPage = lazy(() => import("./pages/send-notifications-page").then((module) => ({ default: module.SendNotificationsPage })));
const AnalyticsPage = lazy(() => import("./pages/analytics-page").then((module) => ({ default: module.AnalyticsPage })));
const SettingsPage = lazy(() => import("./pages/settings-page").then((module) => ({ default: module.SettingsPage })));
const BillingPage = lazy(() => import("./pages/billing").then((module) => ({ default: module.BillingPage })));
const ActivateAdminPage = lazy(() => import("./pages/activate-admin").then((module) => ({ default: module.ActivateAdminPage })));
const SupportTicketsPage = lazy(() => import("./pages/support-tickets-page").then((module) => ({ default: module.SupportTicketsPage })));

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
      Loading...
    </div>
  );
}

function LazyRoute({ children }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

function ProtectedSuperAdminRoute({ children }) {
  const session = useAuthStore((state) => state.session);

  if (!session?.accessToken) {
    return <Navigate to="/super-admin/auth" replace />;
  }

  return children;
}

export const SuperAdminRoutes = (
  <>
    <Route
      path="/super-admin/auth"
      element={
        <RouteErrorBoundary routeName="Super Admin Auth">
          <Navigate to="/login/super-admin" replace />
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/auth/activate"
      element={
        <RouteErrorBoundary routeName="Activate Admin">
          <LazyRoute>
            <ActivateAdminPage />
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard"
      element={
        <RouteErrorBoundary routeName="Super Admin Dashboard">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <SuperAdminDashboardPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/pending-companies"
      element={
        <RouteErrorBoundary routeName="Super Admin Pending Companies">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <PendingCompaniesPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/registration-pending"
      element={
        <RouteErrorBoundary routeName="Super Admin Registration Pending">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <RegistrationPendingCompaniesPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/companies"
      element={
        <RouteErrorBoundary routeName="Super Admin Companies">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <CompaniesPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/companies/create"
      element={
        <RouteErrorBoundary routeName="Super Admin Add Company">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <AddCompanyPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/admins"
      element={
        <RouteErrorBoundary routeName="Super Admin Company Admins">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <CompanyAdminsPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/billing"
      element={
        <RouteErrorBoundary routeName="Super Admin Billing">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <BillingPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/notifications"
      element={
        <RouteErrorBoundary routeName="Super Admin Notifications">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <SendNotificationsPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/analytics"
      element={
        <RouteErrorBoundary routeName="Super Admin Analytics">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <AnalyticsPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/settings"
      element={
        <RouteErrorBoundary routeName="Super Admin Settings">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <SettingsPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/super-admin/dashboard/support"
      element={
        <RouteErrorBoundary routeName="Super Admin Support">
          <LazyRoute>
            <ProtectedSuperAdminRoute>
              <SupportTicketsPage />
            </ProtectedSuperAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
  </>
);
