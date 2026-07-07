import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { AdminRoutes } from "@/features/admin-dashboard/routes";
import { IncomingCallLayer } from "@/features/meetings/components/incoming-call-layer";
import { SuperAdminRoutes } from "@/features/super-admin-dashboard/routes";
import { UserRoutes } from "@/features/user-dashboard/routes";
import { useAuthStore } from "@/store/auth-store";
import {isMobileApp} from "@/utils/platform";

const LandingPage = lazy(() => import("@/features/landing/pages/landing").then((module) => ({ default: module.LandingPage })));
const FeatureDetailsPage = lazy(() => import("@/features/landing/pages/landing/feature-details").then((module) => ({ default: module.FeatureDetailsPage })));
const PrivacyPolicyPage = lazy(() => import("@/features/landing/pages/privacy-policy").then((module) => ({ default: module.PrivacyPolicyPage })));
const TermsConditionsPage = lazy(() => import("@/features/landing/pages/terms").then((module) => ({ default: module.TermsConditionsPage })));
const LoginPage = lazy(() => import("@/features/auth/pages/login").then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/forgot-password").then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/reset-password").then((module) => ({ default: module.ResetPasswordPage })));
const ResetMfaPage = lazy(() => import("@/features/auth/pages/reset-mfa").then((module) => ({ default: module.ResetMfaPage })));
const RegisterPage = lazy(() => import("@/features/auth/pages/register").then((module) => ({ default: module.RegisterPage })));
const AcceptInvitePage = lazy(() => import("@/features/auth/pages/accept-invite").then((module) => ({ default: module.AcceptInvitePage })));
const SharedMeetingRoomPage = lazy(() => import("@/features/meetings/pages/meeting-room-page").then((module) => ({ default: module.SharedMeetingRoomPage })));

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

function SessionExpiryHandler() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!session?.accessToken) {
      return undefined;
    }

    if (!session?.expiresAt) {
      return undefined;
    }

    const msRemaining = session.expiresAt - Date.now();

    const redirectToLogin = () => {
      clearSession();
      toast.error("Your session has expired. Please sign in again.");
      navigate(
        session.role === "SUPER_ADMIN" ? "/login/super-admin" : "/login?mode=workspace",
        { replace: true }
      );
    };

    if (msRemaining <= 0) {
      redirectToLogin();
      return undefined;
    }

    timeoutRef.current = window.setTimeout(() => {
      redirectToLogin();
    }, msRemaining);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [clearSession, navigate, session]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <SessionExpiryHandler />
      <IncomingCallLayer />
      <Routes>
        <Route
          path="/"
          element={
            isMobileApp() ? (
              <Navigate to="/login" replace />
            ) : (
              <RouteErrorBoundary routeName="Landing">
                <LazyRoute>
                  <LandingPage />
                </LazyRoute>
              </RouteErrorBoundary>
            )
          }
        />
        <Route
          path="/features"
          element={
            <RouteErrorBoundary routeName="Landing Features">
              <LazyRoute>
                <LandingPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/plans"
          element={
            <RouteErrorBoundary routeName="Landing Plans">
              <LazyRoute>
                <LandingPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/contact"
          element={
            <RouteErrorBoundary routeName="Landing Contact">
              <LazyRoute>
                <LandingPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/features/:slug"
          element={
            <RouteErrorBoundary routeName="Feature Details">
              <LazyRoute>
                <FeatureDetailsPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />

        <Route
          path="/privacy"
          element={
            <RouteErrorBoundary routeName="Privacy Policy">
              <LazyRoute>
                <PrivacyPolicyPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/terms"
          element={
            <RouteErrorBoundary routeName="Terms & Conditions">
              <LazyRoute>
                <TermsConditionsPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/login"
          element={
            <RouteErrorBoundary routeName="Login">
              <LazyRoute>
                <LoginPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/login/super-admin"
          element={
            <RouteErrorBoundary routeName="Super Admin Login">
              <LazyRoute>
                <LoginPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RouteErrorBoundary routeName="Forgot Password">
              <LazyRoute>
                <ForgotPasswordPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/reset-password"
          element={
            <RouteErrorBoundary routeName="Reset Password">
              <LazyRoute>
                <ResetPasswordPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/reset-mfa"
          element={
            <RouteErrorBoundary routeName="Reset MFA">
              <LazyRoute>
                <ResetMfaPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/register"
          element={
            <RouteErrorBoundary routeName="Register">
              <LazyRoute>
                <RegisterPage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/accept-invite"
          element={
            <RouteErrorBoundary routeName="Accept Invite">
              <LazyRoute>
                <AcceptInvitePage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/activate"
          element={
            <RouteErrorBoundary routeName="Activate Invite">
              <LazyRoute>
                <AcceptInvitePage />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/meeting/:meetingId"
          element={
            <RouteErrorBoundary routeName="Meeting Room">
              <LazyRoute>
                <SharedMeetingRoomPage layout="user" />
              </LazyRoute>
            </RouteErrorBoundary>
          }
        />
        {AdminRoutes}
        {UserRoutes}
        {SuperAdminRoutes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
