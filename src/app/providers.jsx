import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "sonner";

import { FirebaseNotificationBridge } from "@/components/firebase-notification-bridge";
import { usePresenceHeartbeat } from "@/features/user-dashboard/hooks/use-presence-heartbeat";
import { installGlobalErrorHandlers } from "@/lib/monitoring";
import { queryClient } from "@/lib/query-client";
import { subscribeToSessionCleared, useAuthStore } from "@/store/auth-store";

function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}

function AuthSessionSync() {
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    return subscribeToSessionCleared(() => {
      clearSession({ broadcast: false });
    });
  }, [clearSession]);

  useEffect(() => {
    return useAuthStore.subscribe((state, previousState) => {
      if (previousState.session && !state.session) {
        queryClient.clear();
      }
    });
  }, []);

  return null;
}

function MonitoringHooks() {
  useEffect(() => installGlobalErrorHandlers(), []);

  return null;
}

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MonitoringHooks />
      <AuthSessionSync />
      <PresenceHeartbeat />
      <FirebaseNotificationBridge />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
