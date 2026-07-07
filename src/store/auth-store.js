import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const AUTH_SESSION_EVENT_KEY = "Levitica Connect-auth-event";
export const AUTH_SESSION_CHANNEL = "Levitica Connect-auth";

let authEventChannel = null;

function getAuthEventChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel !== "function") {
    return null;
  }

  if (!authEventChannel) {
    authEventChannel = new BroadcastChannel(AUTH_SESSION_CHANNEL);
  }

  return authEventChannel;
}

export function broadcastSessionCleared(reason = "signout") {
  if (typeof window === "undefined") {
    return;
  }

  const event = {
    type: "session-cleared",
    reason,
    timestamp: Date.now(),
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };

  getAuthEventChannel()?.postMessage(event);

  try {
    window.localStorage.setItem(AUTH_SESSION_EVENT_KEY, JSON.stringify(event));
  } catch {
    // BroadcastChannel is the primary path; localStorage is only a fallback.
  }
}

export function subscribeToSessionCleared(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const channel = getAuthEventChannel();

  function handleEvent(event) {
    if (event?.type === "session-cleared") {
      callback(event);
    }
  }

  function handleChannelMessage(event) {
    handleEvent(event.data);
  }

  function handleStorageEvent(event) {
    if (event.key !== AUTH_SESSION_EVENT_KEY || !event.newValue) {
      return;
    }

    try {
      handleEvent(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed storage events from other code.
    }
  }

  channel?.addEventListener("message", handleChannelMessage);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    channel?.removeEventListener("message", handleChannelMessage);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

export const useAuthStore = create(
  persist(
    (set) => ({
      session: null,
      pendingMfaSession: null,
      setSession: (session) =>
        set({
          session: session
            ? {
                ...session,
                expiresAt:
                  session.expiresAt ||
                  (session.expiresIn
                    ? Date.now() + Number(session.expiresIn) * 1000
                    : null),
              }
            : null,
        }),
      setPendingMfaSession: (pendingMfaSession) =>
        set((state) => ({
          pendingMfaSession: {
            ...state.pendingMfaSession,
            ...pendingMfaSession,
          },
        })),
      clearPendingMfaSession: () => set({ pendingMfaSession: null }),
      clearSession: (options = {}) => {
        set({ session: null, pendingMfaSession: null });

        if (options.broadcast !== false) {
          broadcastSessionCleared(options.reason);
        }
      },
    }),
    {
      name: "Levitica Connect-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        session: state.session,
        pendingMfaSession: state.pendingMfaSession,
      }),
    }
  )
);
