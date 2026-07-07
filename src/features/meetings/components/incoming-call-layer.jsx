import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { LoaderCircle, Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FIREBASE_CALL_EVENT } from "@/components/firebase-notification-bridge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MEETING_ACCEPT,
  MEETING_DECLINE,
  MEETING_DETAILS,
  MEETING_INCOMING_RINGING,
  USER_EVENTS_WEBSOCKET,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { getImageUrl, getProfileImageSource } from "@/lib/image-utils";
import { getRingtoneSoundSource, getStoredNotificationSettings } from "@/lib/notification-settings";
import { createRealtimeSocket } from "@/lib/realtime-socket";
import { useAuthStore } from "@/store/auth-store";
import {
  buildMeetingRoomPath,
  buildStandaloneMeetingRoomUrl,
  getMeetingDisplayName,
  normalizeMeetingRecord,
} from "../utils/meeting-utils";

function buildAuthHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function getSessionUserId(session) {
  return session?.userId || session?.user_id || session?.id || null;
}

function parseSocketPayload(rawPayload) {
  if (!rawPayload) {
    return null;
  }

  if (typeof rawPayload === "object") {
    return rawPayload;
  }

  if (typeof rawPayload !== "string") {
    return null;
  }

  try {
    return JSON.parse(rawPayload);
  } catch {
    return null;
  }
}

function getPayloadEvent(payload) {
  return String(payload?.event || payload?.type || "").toLowerCase();
}

function getPayloadMeetingId(payload) {
  return (
    payload?.meeting_id ||
    payload?.meetingId ||
    payload?.meeting?.id ||
    payload?.meeting?.meeting_id ||
    payload?.call_id ||
    payload?.callId ||
    payload?.id ||
    null
  );
}

function isIncomingCallPayload(payload) {
  const event = getPayloadEvent(payload);

  return event === "incoming_call" || event === "call_invite" || event === "call_incoming";
}

function isCallEndedPayload(payload) {
  const event = getPayloadEvent(payload);

  return (
    event === "call_cancelled" ||
    event === "call_canceled" ||
    event === "call_ended" ||
    event === "call_declined"
  );
}

function resolveCallMode(payload, meeting) {
  const rawMode =
    payload?.call_type ||
    payload?.callType ||
    payload?.mode ||
    meeting?.call_type ||
    meeting?.callType ||
    "video";

  return String(rawMode).toLowerCase() === "audio" ? "audio" : "video";
}

function pickFirstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function isDirectCallPayload(payload, meeting) {
  const meetingType = String(
    payload?.meeting_type ||
      payload?.meetingType ||
      payload?.type ||
      meeting?.meeting_type ||
      meeting?.meetingType ||
      meeting?.type ||
      ""
  ).toLowerCase();
  const title = String(payload?.title || meeting?.title || "").trim().toLowerCase();

  return Boolean(
    payload?.is_channel_call === false ||
      payload?.isChannelCall === false ||
      meeting?.is_channel_call === false ||
      meeting?.isChannelCall === false ||
      (payload?.caller && payload?.receiver) ||
      (meeting?.caller && meeting?.receiver) ||
    payload?.is_direct ||
      payload?.isDirect ||
      payload?.is_direct_call ||
      payload?.isDirectCall ||
      meeting?.is_direct ||
      meeting?.isDirect ||
      meeting?.is_direct_call ||
      meeting?.isDirectCall ||
      meetingType === "direct" ||
      title === "direct" ||
      title === "direct call"
  );
}

function isChannelCallPayload(payload, meeting) {
  if (isDirectCallPayload(payload, meeting)) {
    return false;
  }

  return Boolean(
    payload?.is_channel_call ||
      payload?.isChannelCall ||
      payload?.channel_id ||
      payload?.channelId ||
      payload?.channel?.id ||
      payload?.channel?.channel_id ||
      meeting?.is_channel_call ||
      meeting?.isChannelCall ||
      meeting?.channel_id ||
      meeting?.channelId ||
      meeting?.channel?.id ||
      meeting?.channel?.channel_id ||
      meeting?.meeting_type === "channel" ||
      meeting?.type === "channel"
  );
}

function resolveChannelCallLabel(payload, meeting) {
  const channel = payload?.channel || meeting?.channel || meeting?.channel_data || meeting?.channelData || {};
  const meetingName = getMeetingDisplayName(meeting);

  return pickFirstString(
    payload?.channel_name,
    payload?.channelName,
    payload?.team_name,
    payload?.teamName,
    channel?.name,
    channel?.channel_name,
    meeting?.channel_name,
    meeting?.channelName,
    meeting?.team_name,
    meeting?.teamName,
    meetingName && meetingName !== "Meeting Room" ? meetingName : "",
    payload?.title,
    meeting?.title,
    "Team call"
  );
}

function resolveCallerLabel(payload, meeting) {
  if (isChannelCallPayload(payload, meeting)) {
    return resolveChannelCallLabel(payload, meeting);
  }

  const caller = payload?.caller || payload?.caller_data || payload?.callerData || meeting?.caller || meeting?.caller_data || meeting?.callerData || {};
  const fromUser = payload?.from_user || payload?.fromUser || meeting?.from_user || meeting?.fromUser || {};
  const sender = payload?.sender || payload?.user || meeting?.sender || meeting?.user || {};

  return (
    payload?.from_user_name ||
    payload?.fromName ||
    payload?.caller_name ||
    payload?.callerName ||
    caller?.full_name ||
    caller?.name ||
    fromUser?.full_name ||
    fromUser?.name ||
    sender?.full_name ||
    sender?.name ||
    meeting?.caller_name ||
    meeting?.callerName ||
    meeting?.from_user_name ||
    meeting?.fromUserName ||
    payload?.name ||
    "A teammate"
  );
}

function resolveCallerImage(payload, meeting) {
  const caller = payload?.caller || payload?.caller_data || payload?.callerData || meeting?.caller || meeting?.caller_data || meeting?.callerData || {};
  const fromUser = payload?.from_user || payload?.fromUser || meeting?.from_user || meeting?.fromUser || {};
  const sender = payload?.sender || payload?.user || meeting?.sender || meeting?.user || {};

  return (
    getProfileImageSource(caller) ||
    getProfileImageSource(fromUser) ||
    getProfileImageSource(sender) ||
    payload?.caller_profile_image_url ||
    payload?.caller_profile_image ||
    payload?.sender_profile_image_url ||
    payload?.sender_profile_image ||
    payload?.profile_image_url ||
    payload?.profile_image ||
    meeting?.caller_profile_image_url ||
    meeting?.caller_profile_image ||
    ""
  );
}

function getCallerInitials(name) {
  return String(name || "Call")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getWorkspaceVariant(role) {
  return role === "USER" ? "user" : "admin";
}

function getActiveMeetingId(pathname) {
  const match = pathname.match(/\/(?:meet|meetings)\/([^/]+)\/room/i);
  return match?.[1] || null;
}

function dispatchUserEvent(payload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("Levitica Connect:user-event", { detail: payload }));
}

export function IncomingCallLayer() {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const socketRef = useRef(null);
  const activeMeetingIdRef = useRef(null);
  const ringtoneAudioRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [failedCallerImage, setFailedCallerImage] = useState("");
  const incomingCallIdRef = useRef(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isAcceptingCall, setIsAcceptingCall] = useState(false);
  const [isDecliningCall, setIsDecliningCall] = useState(false);
  const accessToken = session?.accessToken || "";
  const userId = getSessionUserId(session);
  const workspaceVariant = getWorkspaceVariant(session?.role);
  const activeMeetingId = getActiveMeetingId(location.pathname);
  const isStandaloneMeetingRoom = new URLSearchParams(location.search).get("standalone") === "true";
  const callerInitials = getCallerInitials(incomingCall?.callerLabel);
  const callerImageSource = incomingCall?.callerImage || "";
  const callerImageUrl =
    callerImageSource && failedCallerImage !== callerImageSource
      ? getImageUrl(callerImageSource)
      : "";
  const incomingCallDescription = incomingCall?.isChannelCall ? "channel call is ringing" : "is calling you";

  const stopRingtone = useCallback(() => {
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.pause();
      ringtoneAudioRef.current.currentTime = 0;
    }
  }, []);

  const startRingtone = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    stopRingtone();

    try {
      const notificationSettings = getStoredNotificationSettings();
      if (notificationSettings.muteAll || notificationSettings.ringtone === "none") {
        return;
      }

      const ringtoneSrc = getRingtoneSoundSource(notificationSettings.ringtone);
      if (!ringtoneSrc) {
        return;
      }

      ringtoneAudioRef.current = new Audio(ringtoneSrc);
      ringtoneAudioRef.current.loop = true;
      ringtoneAudioRef.current.preload = "auto";
      ringtoneAudioRef.current.volume = 1;

      await ringtoneAudioRef.current.play();
    } catch {
      stopRingtone();
    }
  }, [stopRingtone]);

  useEffect(() => {
    activeMeetingIdRef.current = activeMeetingId;

    if (incomingCall?.meeting?.id && incomingCall.meeting.id === activeMeetingId) {
      setIncomingCall(null);
      setFailedCallerImage("");
    }
  }, [activeMeetingId, incomingCall]);

  useEffect(() => {
    if (!accessToken || !userId || session?.role === "SUPER_ADMIN" || isStandaloneMeetingRoom) {
      setIncomingCall(null);
      setFailedCallerImage("");
      stopRingtone();
      return undefined;
    }

    let disposed = false;
    let isRecoveringIncomingCall = false;

    async function hydrateIncomingCall(payload) {
      const nextMeetingId = getPayloadMeetingId(payload);

      if (!nextMeetingId || String(nextMeetingId) === String(activeMeetingIdRef.current)) {
        return;
      }

      setIsHydrating(true);

      let meeting = normalizeMeetingRecord(payload, nextMeetingId);

      try {
        const response = await apiClient.get(MEETING_DETAILS(nextMeetingId), {
          headers: buildAuthHeaders(accessToken),
        });
        meeting = normalizeMeetingRecord(response.data, nextMeetingId);
      } catch {
        // Keep the fallback meeting stub when details are unavailable.
      } finally {
        if (!disposed) {
          setIsHydrating(false);
        }
      }

      if (disposed) {
        return;
      }

      const mode = resolveCallMode(payload, meeting);
      const callerLabel = resolveCallerLabel(payload, meeting);
      const callerImage = resolveCallerImage(payload, meeting);

      setIncomingCall((current) => {
        if (current?.meeting?.id === nextMeetingId) {
          return current;
        }

        incomingCallIdRef.current = nextMeetingId;
        return {
          callerImage,
          callerLabel,
          isChannelCall: isChannelCallPayload(payload, meeting),
          meeting,
          mode,
        };
      });

      if (!getStoredNotificationSettings().muteAll) {
        toast.message(`${callerLabel} is calling you.`);
      }
    }

    async function recoverIncomingCall() {
      if (disposed || isRecoveringIncomingCall || incomingCallIdRef.current) {
        return;
      }

      isRecoveringIncomingCall = true;

      try {
        const response = await apiClient.get(MEETING_INCOMING_RINGING, {
          headers: buildAuthHeaders(accessToken),
        });
        const payload = response.data?.call || response.data?.incoming_call || response.data?.meeting || null;

        if (payload && isIncomingCallPayload(payload)) {
          await hydrateIncomingCall(payload);
        }
      } catch {
        // Realtime sockets remain the primary path; this is only best-effort recovery.
      } finally {
        isRecoveringIncomingCall = false;
      }
    }

    function handleFirebaseCall(event) {
      const payload = event?.detail;
      if (payload && isIncomingCallPayload(payload)) {
        void hydrateIncomingCall(payload);
      }
    }

    function handleRecoverIncomingCall() {
      void recoverIncomingCall();
    }

    function handleVisibilityRecover() {
      if (document.visibilityState === "visible") {
        void recoverIncomingCall();
      }
    }

    window.addEventListener(FIREBASE_CALL_EVENT, handleFirebaseCall);
    window.addEventListener("focus", handleRecoverIncomingCall);
    window.addEventListener("online", handleRecoverIncomingCall);
    document.addEventListener("visibilitychange", handleVisibilityRecover);

    const realtimeSocket = createRealtimeSocket(
      () => USER_EVENTS_WEBSOCKET(userId, accessToken),
      {
        heartbeatIntervalMs: 20000,
        onOpen: (_event, socket) => {
          socketRef.current = socket;
          void recoverIncomingCall();
        },
        onMessage: (event) => {
          const payload = parseSocketPayload(event.data);

          if (!payload) {
            return;
          }

          dispatchUserEvent(payload);

          if (isIncomingCallPayload(payload)) {
            void hydrateIncomingCall(payload);
            return;
          }

          if (isCallEndedPayload(payload)) {
            const cancelledId = getPayloadMeetingId(payload);
            if (cancelledId && String(cancelledId) === String(incomingCallIdRef.current)) {
              setIncomingCall(null);
              setFailedCallerImage("");
              incomingCallIdRef.current = null;
              stopRingtone();
            }
          }
        },
      }
    );
    socketRef.current = realtimeSocket.getSocket();
    void recoverIncomingCall();

    return () => {
      disposed = true;
      window.removeEventListener(FIREBASE_CALL_EVENT, handleFirebaseCall);
      window.removeEventListener("focus", handleRecoverIncomingCall);
      window.removeEventListener("online", handleRecoverIncomingCall);
      document.removeEventListener("visibilitychange", handleVisibilityRecover);
      stopRingtone();
      realtimeSocket.close();
      socketRef.current = null;
    };
  }, [accessToken, isStandaloneMeetingRoom, session?.role, stopRingtone, userId]);

  useEffect(() => {
    if (incomingCall?.meeting?.id) {
      void startRingtone();
      return () => {
        stopRingtone();
      };
    }

    stopRingtone();
    return undefined;
  }, [incomingCall?.meeting?.id, startRingtone, stopRingtone]);

  async function dismissIncomingCall(shouldNotifyBackend = false) {
    if (shouldNotifyBackend && incomingCall?.meeting?.id && accessToken) {
      try {
        setIsDecliningCall(true);
        await apiClient.post(
          MEETING_DECLINE(incomingCall.meeting.id),
          {},
          { headers: buildAuthHeaders(accessToken) }
        );
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to decline the call right now."
        );
      } finally {
        setIsDecliningCall(false);
      }
    }

    stopRingtone();
    setIncomingCall(null);
    setFailedCallerImage("");
    incomingCallIdRef.current = null;
  }

  async function acceptIncomingCall() {
    if (!incomingCall?.meeting?.id) {
      return;
    }

    try {
      setIsAcceptingCall(true);

      await apiClient.post(
        MEETING_ACCEPT(incomingCall.meeting.id),
        {},
        { headers: buildAuthHeaders(accessToken) }
      );

      const baseUrl = buildMeetingRoomPath(
        workspaceVariant,
        incomingCall.meeting.id,
        incomingCall.mode,
        true,
        { displayName: incomingCall.callerLabel }
      );
      const nextPath = buildStandaloneMeetingRoomUrl(baseUrl, session);

      window.open(nextPath, "_blank", "width=1280,height=720,noopener,noreferrer");

      stopRingtone();
      setIncomingCall(null);
      setFailedCallerImage("");
      incomingCallIdRef.current = null;
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.response?.data?.detail ||
        "Unable to accept the call right now."
      );
    } finally {
      setIsAcceptingCall(false);
    }
  }

  return (
    <Dialog
      open={Boolean(incomingCall)}
      onOpenChange={(open) => (!open && !isAcceptingCall && !isDecliningCall ? dismissIncomingCall(false) : null)}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[360px] overflow-hidden rounded-[30px] border border-white/50 bg-white/95 p-0 shadow-[0_36px_100px_rgba(15,23,42,0.22)] backdrop-blur-2xl transition-all duration-500 animate-in fade-in zoom-in-95"
      >
        <div className="relative bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
          <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 shadow-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
              </span>
              {incomingCall?.mode === "audio" ? "Audio call" : "Video call"}
            </div>
          </div>

          <div className="relative px-7 pt-16 pb-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute -inset-5 rounded-full bg-sky-200/50 blur-2xl" />
                <div className="absolute -inset-3 animate-pulse rounded-full border border-sky-200" />
                <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-3xl font-black text-white shadow-[0_18px_44px_rgba(14,165,233,0.25)] ring-[7px] ring-white">
                  {callerImageUrl ? (
                    <img
                      src={callerImageUrl}
                      alt={incomingCall?.callerLabel || "Caller"}
                      className="size-full object-cover"
                      onError={() => setFailedCallerImage(callerImageSource)}
                    />
                  ) : (
                    callerInitials
                  )}
                </div>
              </div>

              <DialogTitle className="mb-2 text-3xl font-black tracking-tight text-slate-900">
                {incomingCall?.callerLabel || "Incoming call"}
              </DialogTitle>

              <DialogDescription className="max-w-[260px] text-sm font-semibold leading-6 text-slate-500">
                {incomingCallDescription}
              </DialogDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-white/70 px-5 pb-5 pt-4">
            <Button
              type="button"
              variant="outline"
              className="group h-[52px] rounded-2xl border-rose-100 bg-rose-50/70 text-sm font-black text-rose-600 transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700"
              onClick={() => void dismissIncomingCall(true)}
              disabled={isAcceptingCall || isDecliningCall}
            >
              {isDecliningCall ? (
                <LoaderCircle className="mr-2 size-5 animate-spin" />
              ) : (
                <PhoneOff className="mr-2 size-5 transition-transform group-hover:-rotate-12" />
              )}
              {isDecliningCall ? "Declining..." : "Decline"}
            </Button>
            <Button
              type="button"
              className="h-[52px] rounded-2xl bg-sky-600 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)] transition-all hover:-translate-y-0.5 hover:bg-sky-700"
              onClick={() => void acceptIncomingCall()}
              disabled={isHydrating || isAcceptingCall || isDecliningCall}
            >
              <span className="flex items-center justify-center gap-2">
                {isHydrating || isAcceptingCall ? (
                  <>
                    <LoaderCircle className="size-5 animate-spin" />
                    {isHydrating ? "Opening..." : "Joining..."}
                  </>
                ) : (
                  <>
                    {incomingCall?.mode === "audio" ? (
                      <Phone className="size-5" />
                    ) : (
                      <Video className="size-5" />
                    )}
                    Join Call
                  </>
                )}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
