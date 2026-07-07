/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { Route, Navigate, useLocation } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { useAuthStore } from "@/store/auth-store";

const adminRoles = ["COMPANY_ADMIN", "TEAM_ADMIN"];

const AdminDashboardPage = lazy(() => import("./pages/admin-dashboard-page").then((module) => ({ default: module.AdminDashboardPage })));
const TeamsPage = lazy(() => import("./pages/teams-page").then((module) => ({ default: module.TeamsPage })));
const DepartmentsPage = lazy(() => import("./pages/departments-page").then((module) => ({ default: module.DepartmentsPage })));
const CompanyApprovals = lazy(() => import("./pages/company-approvals").then((module) => ({ default: module.CompanyApprovals })));
const CompanyUsers = lazy(() => import("./pages/company-users").then((module) => ({ default: module.CompanyUsers })));
const InviteUser = lazy(() => import("./pages/invite-user").then((module) => ({ default: module.InviteUser })));
const AdminBillingPage = lazy(() => import("./pages/billing-page").then((module) => ({ default: module.AdminBillingPage })));
const SettingsPage = lazy(() => import("./pages/settings-page").then((module) => ({ default: module.SettingsPage })));
const AdminSupportPage = lazy(() => import("./pages/support-page").then((module) => ({ default: module.AdminSupportPage })));
const AdminAlertsPage = lazy(() => import("./pages/admin-alerts-page").then((module) => ({ default: module.AdminAlertsPage })));
const ChatPage = lazy(() => import("@/features/chat/pages/chat-page").then((module) => ({ default: module.ChatPage })));
const AdminMfaSetupPage = lazy(() => import("@/features/admin-auth/pages/admin-mfa-setup-page").then((module) => ({ default: module.AdminMfaSetupPage })));
const AdminMfaVerifyPage = lazy(() => import("@/features/admin-auth/pages/admin-mfa-verify-page").then((module) => ({ default: module.AdminMfaVerifyPage })));
const SharedMeetPage = lazy(() => import("@/features/meetings/pages/meet-page").then((module) => ({ default: module.SharedMeetPage })));
const SharedCalendarPage = lazy(() => import("@/features/calendar/pages/calendar-page").then((module) => ({ default: module.SharedCalendarPage })));
const SharedMeetingRoomPage = lazy(() => import("@/features/meetings/pages/meeting-room-page").then((module) => ({ default: module.SharedMeetingRoomPage })));
const FilesPage = lazy(() => import("@/features/user-dashboard/pages/files-page").then((module) => ({ default: module.FilesPage })));
const CommunityPage = lazy(() => import("@/features/community/pages/community-page").then((module) => ({ default: module.CommunityPage })));

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

function ProtectedAdminRoute({ children }) {
  const session = useAuthStore((state) => state.session);
  const location = useLocation();
  const hasMeetingLaunchSession = new URLSearchParams(location.search).has("launchId");

  if (
    !session?.accessToken ||
    !adminRoles.includes(session?.role)
  ) {
    if (hasMeetingLaunchSession) {
      return children;
    }

    return <Navigate to="/admin/auth" replace />;
  }

  return children;
}

function PendingMfaRoute({ children }) {
  const pendingMfaSession = useAuthStore((state) => state.pendingMfaSession);

  if (!pendingMfaSession?.mfaToken && !pendingMfaSession?.userId) {
    return <Navigate to="/admin/auth" replace />;
  }

  return children;
}

export const AdminRoutes = (
  <>
    <Route
      path="/admin/auth"
      element={
        <RouteErrorBoundary routeName="Admin Auth">
          <Navigate to="/login?mode=workspace" replace />
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/mfa/setup"
      element={
        <RouteErrorBoundary routeName="Admin MFA Setup">
          <LazyRoute>
            <PendingMfaRoute>
              <AdminMfaSetupPage />
            </PendingMfaRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/mfa/verify"
      element={
        <RouteErrorBoundary routeName="Admin MFA Verify">
          <LazyRoute>
            <PendingMfaRoute>
              <AdminMfaVerifyPage />
            </PendingMfaRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard"
      element={
        <RouteErrorBoundary routeName="Admin Dashboard">
          <LazyRoute>
            <ProtectedAdminRoute>
              <AdminDashboardPage />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/users"
      element={
        <RouteErrorBoundary routeName="Admin Users">
          <LazyRoute>
            <ProtectedAdminRoute>
              <CompanyUsers />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/approvals"
      element={
        <RouteErrorBoundary routeName="Admin Approvals">
          <LazyRoute>
            <ProtectedAdminRoute>
              <CompanyApprovals />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/invite"
      element={
        <RouteErrorBoundary routeName="Admin Invite">
          <LazyRoute>
            <ProtectedAdminRoute>
              <InviteUser />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/chat"
      element={
        <RouteErrorBoundary routeName="Admin Chat">
          <LazyRoute>
            <ProtectedAdminRoute>
              <ChatPage layout="admin" />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/community"
      element={
        <RouteErrorBoundary routeName="Admin Community">
          <LazyRoute>
            <ProtectedAdminRoute>
              <CommunityPage layout="admin" />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/channels"
      element={
        <RouteErrorBoundary routeName="Admin Channels">
          <LazyRoute>
            <ProtectedAdminRoute>
              <TeamsPage />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/teams"
      element={
        <RouteErrorBoundary routeName="Admin Teams">
          <LazyRoute>
            <ProtectedAdminRoute>
              <DepartmentsPage />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/meetings"
      element={
        <RouteErrorBoundary routeName="Admin Meetings">
          <LazyRoute>
            <ProtectedAdminRoute>
              <SharedMeetPage layout="admin" />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/files"
      element={
        <RouteErrorBoundary routeName="Admin Files">
          <LazyRoute>
            <ProtectedAdminRoute>
              <FilesPage layout="admin" />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/meetings/:meetingId/room"
      element={
        <RouteErrorBoundary routeName="Admin Meeting Room">
          <LazyRoute>
            <ProtectedAdminRoute>
              <SharedMeetingRoomPage layout="admin" />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/calendar"
      element={
        <RouteErrorBoundary routeName="Admin Calendar">
          <LazyRoute>
            <ProtectedAdminRoute>
              <SharedCalendarPage layout="admin" />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/settings"
      element={
        <RouteErrorBoundary routeName="Admin Settings">
          <LazyRoute>
            <ProtectedAdminRoute>
              <SettingsPage />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/billing"
      element={
        <RouteErrorBoundary routeName="Admin Billing">
          <LazyRoute>
            <ProtectedAdminRoute>
              <AdminBillingPage />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/alerts"
      element={
        <RouteErrorBoundary routeName="Admin Alerts">
          <LazyRoute>
            <ProtectedAdminRoute>
              <AdminAlertsPage />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/admin/dashboard/support"
      element={
        <RouteErrorBoundary routeName="Admin Support">
          <LazyRoute>
            <ProtectedAdminRoute>
              <AdminSupportPage />
            </ProtectedAdminRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
  </>
);
