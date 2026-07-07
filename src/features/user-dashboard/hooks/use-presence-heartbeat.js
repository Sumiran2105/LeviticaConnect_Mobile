import { useEffect, useRef } from "react";

import { PRESENCE_HEARTBEAT } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";

const HEARTBEAT_INTERVAL_MS = 25 * 1000;
const ACTIVITY_HEARTBEAT_THROTTLE_MS = 10 * 1000;

function isPlatformVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function usePresenceHeartbeat() {
  const session = useAuthStore((state) => state.session);
  const accessToken = session?.accessToken;
  const role = session?.role;
  const userId = session?.userId || session?.user_id || session?.id;
  const inFlightRef = useRef(false);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!accessToken || !userId || role === "SUPER_ADMIN") {
      return undefined;
    }

    let disposed = false;
    async function sendHeartbeat({ force = false } = {}) {
      if (disposed || inFlightRef.current || !isPlatformVisible()) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastSentAtRef.current < ACTIVITY_HEARTBEAT_THROTTLE_MS) {
        return;
      }

      inFlightRef.current = true;

      try {
        await apiClient.post(PRESENCE_HEARTBEAT, null, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        lastSentAtRef.current = now;
      } catch {
        // Presence should never interrupt the user's current workflow.
      } finally {
        inFlightRef.current = false;
      }
    }

    void sendHeartbeat({ force: true });

    const heartbeatTimer = window.setInterval(() => {
      sendHeartbeat({ force: true });
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (isPlatformVisible()) {
        sendHeartbeat({ force: true });
      }
    };

    const handleActivity = () => {
      sendHeartbeat();
    };

    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("pointermove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("scroll", handleActivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(heartbeatTimer);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("pointermove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accessToken, role, userId]);
}
