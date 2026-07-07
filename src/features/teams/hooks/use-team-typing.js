import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHANNEL_TYPING_START, CHANNEL_TYPING_STOP, CHAT_WEBSOCKET } from "@/config/api";
import { apiClient } from "@/lib/client";
import { createRealtimeSocket } from "@/lib/realtime-socket";

/** Auto-expire a typing indicator if no refresh arrives within this window. */
const TYPING_EXPIRE_MS = 5000;

/**
 * Try to extract a typing event from an incoming WebSocket payload.
 * Returns `null` when the payload is not a typing event.
 */
function parseTypingEvent(payload) {
  if (!payload || typeof payload !== "object") return null;

  const type = String(payload.type || payload.event || payload.action || "").toLowerCase();
  if (!type.includes("typing")) return null;

  const isStop = type.includes("stop") || type.includes("end");

  const userId = String(
    payload.user_id || payload.userId || payload.sender_id ||
    payload.user?.id || payload.user?.user_id || payload.sender?.id || ""
  );

  const userName =
    payload.user_name || payload.userName || payload.full_name || payload.fullName ||
    payload.name || payload.display_name || payload.displayName ||
    payload.user?.name || payload.user?.full_name || payload.user?.display_name ||
    payload.sender?.name || payload.sender?.full_name ||
    "Someone";

  if (!userId) return null;

  return { action: isStop ? "stop" : "start", userId, userName };
}

/**
 * Channel typing-indicator hook.
 *
 * **Outgoing** – fires `POST …/typing/start` once per typing burst and
 * `POST …/typing/stop` after `stopDelayMs` of inactivity (or on send).
 *
 * **Incoming** – listens on the channel WebSocket for typing events from
 * other users, maintains a `typingUsers` array, and auto-expires entries
 * after `TYPING_EXPIRE_MS`.
 */
export function useTeamTyping({
  channelId,
  accessToken,
  currentUserIds = [],
  stopDelayMs = 3000,
}) {
  // ── Refs ──────────────────────────────────────────────────────────────
  const isTypingRef = useRef(false);
  const stopTimerRef = useRef(null);
  const activeChannelRef = useRef(channelId);
  const currentUserIdsRef = useRef(currentUserIds);
  const typingTimersRef = useRef(new Map());
  const socketRef = useRef(null);

  // Keep refs in sync.
  useEffect(() => { activeChannelRef.current = channelId; }, [channelId]);
  useEffect(() => { currentUserIdsRef.current = currentUserIds; }, [currentUserIds]);

  // ── Incoming typing state ─────────────────────────────────────────────
  const [typingUsers, setTypingUsers] = useState([]);
  const [isCurrentUserTyping, setIsCurrentUserTyping] = useState(false);
  const visibleTypingUsers = useMemo(
    () => typingUsers.filter((user) => String(user.channelId) === String(channelId)),
    [channelId, typingUsers]
  );

  // ── Outgoing helpers ──────────────────────────────────────────────────
  const sendStart = useCallback(async (id) => {
    if (!id || !accessToken) return;
    try {
      socketRef.current?.readyState === WebSocket.OPEN && socketRef.current.send(JSON.stringify({
        event: "typing_start",
        channel_id: String(id),
        user_id: String(currentUserIdsRef.current[0] || ""),
      }));
    } catch { /* best-effort */ }

    try {
      await apiClient.post(CHANNEL_TYPING_START(id), null, {
        headers: { Authorization: `Bearer ${accessToken}` },
        suppressGlobalErrorReport: true,
      });
    } catch { /* best-effort */ }
  }, [accessToken]);

  const sendStop = useCallback(async (id) => {
    if (!id || !accessToken) return;
    try {
      socketRef.current?.readyState === WebSocket.OPEN && socketRef.current.send(JSON.stringify({
        event: "typing_stop",
        channel_id: String(id),
        user_id: String(currentUserIdsRef.current[0] || ""),
      }));
    } catch { /* best-effort */ }

    try {
      await apiClient.post(CHANNEL_TYPING_STOP(id), null, {
        headers: { Authorization: `Bearer ${accessToken}` },
        suppressGlobalErrorReport: true,
      });
    } catch { /* best-effort */ }
  }, [accessToken]);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  /** Call on every keystroke in the composer. */
  const notifyTyping = useCallback(() => {
    if (!channelId || !accessToken) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setIsCurrentUserTyping(true);
      sendStart(channelId);
    }

    clearStopTimer();
    stopTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        setIsCurrentUserTyping(false);
        sendStop(channelId);
      }
    }, stopDelayMs);
  }, [accessToken, channelId, clearStopTimer, sendStart, sendStop, stopDelayMs]);

  /** Call explicitly when the user sends a message. */
  const stopTyping = useCallback(() => {
    clearStopTimer();
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setIsCurrentUserTyping(false);
      sendStop(activeChannelRef.current);
    }
  }, [clearStopTimer, sendStop]);

  // Cleanup outgoing state on channel change / unmount.
  useEffect(() => {
    return () => {
      clearStopTimer();
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendStop(activeChannelRef.current);
      }
    };
  }, [channelId, clearStopTimer, sendStop]);

  // ── Incoming: WebSocket listener ──────────────────────────────────────
  useEffect(() => {
    if (!channelId || !accessToken) return undefined;

    const socketUrl = CHAT_WEBSOCKET(channelId, accessToken);
    if (!socketUrl) return undefined;

    const realtimeSocket = createRealtimeSocket(socketUrl, {
      heartbeatMessage: JSON.stringify({ event: "heartbeat", channel_id: String(channelId) }),
      onOpen: (_event, socket) => {
        socketRef.current = socket;
      },
      onMessage: (event) => {
        try {
          const payload =
            typeof event.data === "string" ? JSON.parse(event.data) : event.data;

          const typingEvent = parseTypingEvent(payload);
          if (!typingEvent) return;

          // Ignore own typing events.
          if (
            currentUserIdsRef.current.some(
              (id) => String(id) === typingEvent.userId,
            )
          ) {
            return;
          }

          if (typingEvent.action === "start") {
            setTypingUsers((current) => {
              if (
                current.some(
                  (u) => u.userId === typingEvent.userId && String(u.channelId) === String(channelId)
                )
              ) {
                return current;
              }
              return [
                ...current,
                { channelId, userId: typingEvent.userId, userName: typingEvent.userName },
              ];
            });

            // Reset auto-expiry timer for this user.
            const prev = typingTimersRef.current.get(typingEvent.userId);
            if (prev) clearTimeout(prev);

            typingTimersRef.current.set(
              typingEvent.userId,
              setTimeout(() => {
                setTypingUsers((c) =>
                  c.filter(
                    (u) => !(u.userId === typingEvent.userId && String(u.channelId) === String(channelId))
                  )
                );
                typingTimersRef.current.delete(typingEvent.userId);
              }, TYPING_EXPIRE_MS),
            );
          } else {
            // stop
            setTypingUsers((c) =>
              c.filter(
                (u) => !(u.userId === typingEvent.userId && String(u.channelId) === String(channelId))
              )
            );
            const timer = typingTimersRef.current.get(typingEvent.userId);
            if (timer) {
              clearTimeout(timer);
              typingTimersRef.current.delete(typingEvent.userId);
            }
          }
        } catch {
          /* ignore non-JSON or unexpected payloads */
        }
      },
    });
    socketRef.current = realtimeSocket.getSocket();

    return () => {
      realtimeSocket.close();
      socketRef.current = null;
    };
  }, [channelId, accessToken]);

  return { notifyTyping, stopTyping, typingUsers: visibleTypingUsers, isCurrentUserTyping };
}
