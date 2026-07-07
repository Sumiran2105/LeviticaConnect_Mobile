/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { Navigate, Route, useLocation } from "react-router-dom";

import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { useAuthStore } from "@/store/auth-store";

const workspaceUserRoles = ["USER", "CLIENT", "GUEST"];

const SharedMeetPage = lazy(() => import("@/features/meetings/pages/meet-page").then((module) => ({ default: module.SharedMeetPage })));
const SharedMeetingRoomPage = lazy(() => import("@/features/meetings/pages/meeting-room-page").then((module) => ({ default: module.SharedMeetingRoomPage })));
const UserDashboardPage = lazy(() => import("./pages/user-dashboard-page").then((module) => ({ default: module.UserDashboardPage })));
const FilesPage = lazy(() => import("./pages/files-page").then((module) => ({ default: module.FilesPage })));
const ChatPage = lazy(() => import("@/features/chat/pages/chat-page").then((module) => ({ default: module.ChatPage })));
const SharedCalendarPage = lazy(() => import("@/features/calendar/pages/calendar-page").then((module) => ({ default: module.SharedCalendarPage })));
const AiPage = lazy(() => import("./pages/ai-page").then((module) => ({ default: module.AiPage })));
const TeamsPage = lazy(() => import("./pages/teams-page").then((module) => ({ default: module.TeamsPage })));
const DepartmentsPage = lazy(() => import("./pages/departments-page").then((module) => ({ default: module.DepartmentsPage })));
const SettingsPage = lazy(() => import("./pages/settings-page").then((module) => ({ default: module.SettingsPage })));
const AdminMfaSetupPage = lazy(() => import("@/features/admin-auth/pages/admin-mfa-setup-page").then((module) => ({ default: module.AdminMfaSetupPage })));
const AdminMfaVerifyPage = lazy(() => import("@/features/admin-auth/pages/admin-mfa-verify-page").then((module) => ({ default: module.AdminMfaVerifyPage })));
const ActivityPage = lazy(() => import("./pages/activity-page").then((module) => ({ default: module.ActivityPage })));
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

function ProtectedUserRoute({ children }) {
  const session = useAuthStore((state) => state.session);
  const location = useLocation();
  const hasMeetingLaunchSession = new URLSearchParams(location.search).has("launchId");

  if (!session?.accessToken || !workspaceUserRoles.includes(session?.role)) {
    if (hasMeetingLaunchSession) {
      return children;
    }

    return <Navigate to="/login?mode=workspace" replace />;
  }

  return children;
}

function PendingMfaRoute({ children }) {
  const pendingMfaSession = useAuthStore((state) => state.pendingMfaSession);

  if (!pendingMfaSession?.mfaToken && !pendingMfaSession?.userId) {
    return <Navigate to="/login?mode=workspace" replace />;
  }

  return children;
}

export const UserRoutes = (
  <>
    <Route
      path="/user/mfa/setup"
      element={
        <RouteErrorBoundary routeName="User MFA Setup">
          <LazyRoute>
            <PendingMfaRoute>
              <AdminMfaSetupPage />
            </PendingMfaRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/mfa/verify"
      element={
        <RouteErrorBoundary routeName="User MFA Verify">
          <LazyRoute>
            <PendingMfaRoute>
              <AdminMfaVerifyPage />
            </PendingMfaRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard"
      element={
        <RouteErrorBoundary routeName="User Dashboard">
          <LazyRoute>
            <ProtectedUserRoute>
              <UserDashboardPage />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/chat"
      element={
        <RouteErrorBoundary routeName="User Chat">
          <LazyRoute>
            <ProtectedUserRoute>
              <ChatPage />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/community"
      element={
        <RouteErrorBoundary routeName="User Community">
          <LazyRoute>
            <ProtectedUserRoute>
              <CommunityPage layout="user" />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/meet"
      element={
        <RouteErrorBoundary routeName="User Meet">
          <LazyRoute>
            <ProtectedUserRoute>
              <SharedMeetPage layout="user" />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/meet/:meetingId/room"
      element={
        <RouteErrorBoundary routeName="User Meeting Room">
          <LazyRoute>
            <ProtectedUserRoute>
              <SharedMeetingRoomPage layout="user" />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/channels"
      element={
        <RouteErrorBoundary routeName="User Channels">
          <LazyRoute>
            <ProtectedUserRoute>
              <TeamsPage />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/teams"
      element={
        <RouteErrorBoundary routeName="User Teams">
          <LazyRoute>
            <ProtectedUserRoute>
              <DepartmentsPage />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/files"
      element={
        <RouteErrorBoundary routeName="User Files">
          <LazyRoute>
            <ProtectedUserRoute>
              <FilesPage />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/calendar"
      element={
        <RouteErrorBoundary routeName="User Calendar">
          <LazyRoute>
            <ProtectedUserRoute>
              <SharedCalendarPage layout="user" />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/user/dashboard/ai"
      element={
        <RouteErrorBoundary routeName="User AI">
          <LazyRoute>
            <ProtectedUserRoute>
              <AiPage />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
      <Route 
      path="/user/dashboard/activity"
      element={
        <RouteErrorBoundary routeName="User Activity">
          <LazyRoute>
            <ProtectedUserRoute>
              <ActivityPage />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
      />

    <Route
      path="/user/dashboard/settings"
      element={
        <RouteErrorBoundary routeName="User Settings">
          <LazyRoute>
            <ProtectedUserRoute>
              <SettingsPage />
            </ProtectedUserRoute>
          </LazyRoute>
        </RouteErrorBoundary>
      }
    />
  </>
);
