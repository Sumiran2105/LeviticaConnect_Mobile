import { useEffect } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";

import { NOTIFICATIONS_FCM_TOKEN, NOTIFICATIONS_FCM_TOKEN_FALLBACK } from "@/config/api";
import { apiClient } from "@/lib/client";
import {
  getFirebaseNotificationStatus,
  registerFirebaseNotifications,
  subscribeToFirebaseMessages,
} from "@/lib/firebase-notifications";
import { getStoredNotificationSettings, playNotificationSound } from "@/lib/notification-settings";
import { useAuthStore } from "@/store/auth-store";

const FIREBASE_CALL_EVENT = "Levitica Connect:firebase-incoming-call";
const FIREBASE_MESSAGE_EVENT = "Levitica Connect:firebase-message";
const isDevelopment = import.meta.env.DEV;

function getSessionUserId(session) {
  return session?.userId || session?.user_id || session?.id || null;
}

function getNotificationData(payload) {
  return payload?.data || {};
}

function getNotificationTitle(payload, fallback = "Levitica Connect") {
  return payload?.notification?.title || payload?.data?.title || fallback;
}

function getNotificationBody(payload, fallback = "You have a new notification.") {
  return payload?.notification?.body || payload?.data?.body || payload?.data?.content || fallback;
}

function isCallNotification(payload) {
  const data = getNotificationData(payload);
  return data.notification_type === "call" || data.event === "incoming_call";
}

function parseJsonField(value) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function normalizeFirebasePayload(payload) {
  const data = getNotificationData(payload);

  return {
    ...data,
    event: data.event || data.notification_type,
    meeting_id: data.meeting_id || data.meetingId,
    call_type: data.call_type || data.callType,
    caller_name: data.caller_name || data.sender_name,
    from_user_name: data.caller_name || data.sender_name,
    caller: parseJsonField(data.caller),
    from_user: parseJsonField(data.from_user),
    meeting: parseJsonField(data.meeting),
    channel: parseJsonField(data.channel),
  };
}

function dispatchIncomingCall(payload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(FIREBASE_CALL_EVENT, { detail: payload }));
}

function dispatchFirebaseMessage(payload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(FIREBASE_MESSAGE_EVENT, { detail: payload }));
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function registerTokenWithRetry(token) {
  const retryDelays = [0, 3000, 8000];
  const endpoints = [NOTIFICATIONS_FCM_TOKEN, NOTIFICATIONS_FCM_TOKEN_FALLBACK];
  let lastError = null;

  for (const delay of retryDelays) {
    if (delay) {
      await wait(delay);
    }

    try {
      for (const endpoint of endpoints) {
        try {
          return await apiClient.post(
            endpoint,
            { token },
            {
              suppressGlobalErrorReport: true,
              timeout: 60000,
            }
          );
        } catch (error) {
          lastError = error;
          if (error?.status !== 404) {
            throw error;
          }
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export function FirebaseNotificationBridge() {
  const session = useAuthStore((state) => state.session);
  const accessToken = session?.accessToken || "";
  const userId = getSessionUserId(session);

  useEffect(() => {
    if (!accessToken || !userId || session?.role === "SUPER_ADMIN") {
      return undefined;
    }

    const status = getFirebaseNotificationStatus();
    if (!status.configured) {
      console.warn("Firebase notifications are not configured.", status.missing);
      if (isDevelopment) {
        toast.warning("Firebase notifications are not configured.", {
          description: `Missing ${status.missing.join(", ")}`,
          id: "firebase-notifications-missing-config",
        });
      }
      return undefined;
    }

    let disposed = false;

    async function registerToken() {
      try {
        const token = await registerFirebaseNotifications();
        if (!token || disposed) {
          return;
        }

        await registerTokenWithRetry(token);
      } catch (error) {
        console.error("Firebase notification registration failed", error);
        toast.error("Firebase notification registration failed.", {
          description: error?.userMessage || error?.message || "Check browser console and backend logs.",
          id: "firebase-notifications-registration-failed",
        });
      }
    }

    void registerToken();

    return () => {
      disposed = true;
    };
  }, [accessToken, session?.role, userId]);

  useEffect(() => {
    if (!accessToken || !userId || session?.role === "SUPER_ADMIN") {
      return undefined;
    }

    let unsubscribe = () => {};
    let disposed = false;

    async function subscribe() {
      unsubscribe = await subscribeToFirebaseMessages((payload) => {
        if (disposed) {
          return;
        }

        if (isCallNotification(payload)) {
          const callPayload = normalizeFirebasePayload(payload);
          dispatchIncomingCall(callPayload);
          const notificationSettings = getStoredNotificationSettings();
          if (notificationSettings.muteAll) {
            return;
          }

          toast.message(getNotificationBody(payload, "Incoming call"), {
            icon: <Phone className="size-4" />,
          });
          return;
        }

        const messagePayload = normalizeFirebasePayload(payload);
        dispatchFirebaseMessage(messagePayload);

        const notificationSettings = getStoredNotificationSettings();
        if (notificationSettings.muteAll) {
          return;
        }

        void playNotificationSound().catch(() => {});
        toast.message(getNotificationTitle(payload, "New message"), {
          description: getNotificationBody(payload),
          icon: <MessageSquare className="size-4" />,
        });
      });
    }

    void subscribe();

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [accessToken, session?.role, userId]);

  return null;
}

export { FIREBASE_CALL_EVENT, FIREBASE_MESSAGE_EVENT };
