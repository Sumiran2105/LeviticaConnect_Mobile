import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Hand, LoaderCircle, MicOff, Plus, Search, Trash2, Users, Video, VideoOff, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/layouts/admin-layout";
import { UserLayout } from "@/layouts/user-layout";
import {
  CALENDAR_LIVEKIT_TOKEN,
  MEETING_DETAILS,
  DM_USERS_SEARCH,
  MEETING_ACTIVE_PARTICIPANTS,
  MEETING_ADD_PARTICIPANT,
  MEETING_HEARTBEAT,
  MEETING_JOIN,
  MEETING_LEAVE,
  MEETING_LIVEKIT_TOKEN,
  MEETING_LOWER_HAND,
  MEETING_PARTICIPANTS,
  MEETING_MUTE_PARTICIPANT,
  MEETING_REMOVE_PARTICIPANT,
  MEETING_RAISE_HAND,
  MEETING_RAISED_HANDS,
  MEETING_REACTION,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import {
  consumeMeetingLaunchSession,
  getMeetingDisplayName,
  getMeetingVariantConfig,
  normalizeLiveKitCredentials,
  normalizeMeetingRecord,
} from "../utils/meeting-utils";

const FALLBACK_LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://connectio-wt6u99iq.livekit.cloud";
const MEETING_REACTIONS = ["👍", "👏", "❤️", "😂"];

function buildAuthHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function getSessionUserId(session) {
  return session?.userId || session?.user_id || session?.id || null;
}

function buildLoginRedirectPath(location) {
  const returnPath = `${location.pathname}${location.search}${location.hash}`;
  return `/login?redirect=${encodeURIComponent(returnPath)}`;
}

function normalizeRaisedHands(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.raised_hands)
        ? payload.raised_hands
        : Array.isArray(payload?.users)
          ? payload.users
          : [];

  return items
    .map((item) => {
      const user = item?.user || item?.participant || {};
      const userId = item?.user_id || item?.userId || user?.id || user?.user_id;
      const name =
        item?.user_name ||
        item?.name ||
        item?.full_name ||
        user?.full_name ||
        user?.name ||
        "Participant";

      if (!userId && !name) return null;

      return {
        id: String(userId || name),
        name,
        image:
          item?.profile_image ||
          item?.profile_image_url ||
          user?.profile_image ||
          user?.profile_image_url ||
          "",
      };
    })
    .filter(Boolean);
}

function normalizeMeetingParticipants(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.participants)
        ? payload.participants
        : [];

  return items
    .map((item) => {
      const user = item?.user || {};
      const userId = item?.user_id || item?.userId || user?.id || user?.user_id;
      const name =
        item?.user_name ||
        item?.name ||
        item?.full_name ||
        user?.full_name ||
        user?.name ||
        item?.email ||
        user?.email ||
        "Participant";

      return {
        id: String(userId || item?.id || name),
        name,
        email: item?.email || user?.email || "",
        image:
          item?.profile_image ||
          item?.profile_image_url ||
          user?.profile_image ||
          user?.profile_image_url ||
          "",
        role: item?.role || "participant",
        isMuted: Boolean(item?.is_muted ?? item?.muted),
        videoEnabled: item?.video_enabled ?? item?.videoEnabled ?? true,
        handRaised: Boolean(item?.hand_raised ?? item?.handRaised),
        isActive: item?.is_active ?? item?.active ?? !item?.left_at,
      };
    })
    .filter(Boolean);
}

function normalizeActiveParticipantIds(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.active_participants)
      ? payload.active_participants
      : Array.isArray(payload?.participants)
        ? payload.participants
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

  return new Set(
    items
      .map((item) => {
        if (item == null) return null;
        if (typeof item === "string" || typeof item === "number") return String(item);
        return String(item.user_id || item.userId || item.id || "");
      })
      .filter(Boolean)
  );
}

function getArrayPayload(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
}

function normalizeUserOptions(payload) {
  return getArrayPayload(payload, ["users", "items", "results", "data"])
    .map((item) => {
      const user = item?.user || item;
      const userId = user?.id || user?.user_id || item?.user_id || item?.userId;
      const name =
        user?.full_name ||
        user?.name ||
        item?.full_name ||
        item?.name ||
        user?.email ||
        item?.email ||
        "Participant";

      if (!userId) return null;

      return {
        id: String(userId),
        name,
        email: user?.email || item?.email || "",
        image:
          user?.profile_image ||
          user?.profile_image_url ||
          item?.profile_image ||
          item?.profile_image_url ||
          "",
      };
    })
    .filter(Boolean);
}

function getInitials(name) {
  return String(name || "P")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";
}

const LiveKitMeetingRoom = lazy(async () => {
  await import("@livekit/components-styles");
  const {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    VideoConference,
    useRoomContext,
  } = await import("@livekit/components-react");

  function CallMonitor({ isDirect, onLeave }) {
  const participants = useParticipants();
  const room = useRoomContext();

  const hadOtherParticipantsRef = useRef(false);
  const leavingRef = useRef(false);

  useEffect(() => {
    // Wait until another participant actually joins.
    if (participants.length > 1) {
      hadOtherParticipantsRef.current = true;
    }

    // Don't leave if:
    // - Not a direct call
    // - Already leaving
    // - Nobody else ever joined
    if (
      !isDirect ||
      leavingRef.current ||
      !hadOtherParticipantsRef.current
    ) {
      return;
    }

    // Only you remain in the room.
    if (participants.length <= 1) {
      leavingRef.current = true;

      (async () => {
        try {
          console.log("Disconnecting LiveKit room...");

          await room.disconnect();

          console.log("LiveKit disconnected.");
        } catch (err) {
          console.error("LiveKit disconnect failed", err);
        }

        onLeave();
      })();
    }
  }, [participants.length, isDirect, room, onLeave]);

  return null;
}

  function LiveKitMeetingRoomComponent({
    callMode,
    connectionDetails,
    isDirect,
    onDisconnected,
    onDirectParticipantLeft,
  }) {
    return (
      <LiveKitRoom
        audio
        connect
        data-lk-theme="default"
        onDisconnected={onDisconnected}
        serverUrl={connectionDetails.serverUrl}
        token={connectionDetails.token}
        video={callMode !== "audio"}
        className="levitica-meeting-room h-full bg-[#0f172a] [&_.lk-video-conference]:bg-transparent [&_.lk-grid-layout]:gap-3 [&_.lk-participant-tile]:overflow-hidden [&_.lk-participant-tile]:rounded-2xl [&_.lk-participant-tile]:border [&_.lk-participant-tile]:border-white/10 [&_.lk-participant-tile]:bg-white/[0.04] [&_.lk-participant-tile]:shadow-[0_20px_60px_rgba(0,0,0,0.25)] [&_.lk-control-bar]:border-t [&_.lk-control-bar]:border-white/10 [&_.lk-control-bar]:bg-[#020617]/90 [&_.lk-control-bar]:backdrop-blur-xl [&_.lk-button]:rounded-xl"
      >
        <VideoConference />
        <RoomAudioRenderer />
        <CallMonitor isDirect={isDirect} onLeave={onDirectParticipantLeft} />
      </LiveKitRoom>
    );
  }

  return { default: LiveKitMeetingRoomComponent };
});

function MeetingRoomLoader({ isStandalone }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div
        className={`flex max-w-md flex-col items-center gap-4 rounded-[28px] border px-8 py-10 text-center shadow-sm ${
          isStandalone ? "border-white/10 bg-white/5 text-white" : "border-brand-line bg-white"
        }`}
      >
        <LoaderCircle className="size-10 animate-spin text-brand-primary" />
        <div>
          <h2 className={`text-lg font-bold ${isStandalone ? "text-white" : "text-brand-ink"}`}>
            Starting video room
          </h2>
          <p className={`mt-2 text-sm ${isStandalone ? "text-white/60" : "text-brand-secondary"}`}>
            Loading audio, video, and screen sharing controls.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SharedMeetingRoomPage({ layout = "user" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { meetingId } = useParams();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const launchId = searchParams.get("launchId");
  const [isRestoringLaunchSession, setIsRestoringLaunchSession] = useState(Boolean(launchId));
  const sessionRef = useRef(session);
  const participantNameRef = useRef(session?.full_name || session?.name || "Participant");
  const leaveAttemptedRef = useRef(false);
  const joinedMeetingRef = useRef(false);
  const leftToastShownRef = useRef(false);
  // const meetingEndedRef = useRef(false);
  const prefetchedCredentialsRef = useRef(
    normalizeLiveKitCredentials(location.state?.connectionDetails)
  );
  const [meeting, setMeeting] = useState(() =>
    normalizeMeetingRecord(location.state?.meeting, meetingId)
  );
  const meetingRoomNameRef = useRef(meeting.roomName || "");
  const [connectionDetails, setConnectionDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isSendingMeetingAction, setIsSendingMeetingAction] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const Layout = layout === "admin" ? AdminLayout : UserLayout;
  const { backLabel, homePath } = getMeetingVariantConfig(layout);
  const callMode = searchParams.get("mode") === "audio" ? "audio" : "video";
  const isStandalone = searchParams.get("standalone") === "true";
  const displayNameParam = searchParams.get("displayName") || "";
  const calendarEventId = searchParams.get("calendarEventId") || "";
  const externalRoomToken = searchParams.get("token") || "";
  const externalRoomServerUrl = searchParams.get("livekitUrl") || FALLBACK_LIVEKIT_URL;
  const externalRoomName = searchParams.get("roomName") || meetingId;
  const isExternalLiveKitRoom = Boolean(externalRoomToken || calendarEventId);
  const meetingDisplayName = getMeetingDisplayName(meeting, displayNameParam);
  const currentUserId = getSessionUserId(session);
  const raisedHandsQuery = useQuery({
    queryKey: ["meetings", meetingId, "raised-hands", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(MEETING_RAISED_HANDS(meetingId), {
        headers: buildAuthHeaders(session.accessToken),
      });

      return normalizeRaisedHands(response.data);
    },
    enabled: Boolean(
      !isExternalLiveKitRoom && meetingId && session?.accessToken && joinedMeetingRef.current
    ),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });
  const raisedHands = useMemo(() => raisedHandsQuery.data || [], [raisedHandsQuery.data]);
  const participantsQuery = useQuery({
    queryKey: ["meetings", meetingId, "participants", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(MEETING_PARTICIPANTS(meetingId), {
        headers: buildAuthHeaders(session.accessToken),
      });

      return normalizeMeetingParticipants(response.data);
    },
    enabled: Boolean(
      !isExternalLiveKitRoom && meetingId && session?.accessToken && joinedMeetingRef.current
    ),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });
  const participants = useMemo(() => participantsQuery.data || [], [participantsQuery.data]);
  const activeParticipantsQuery = useQuery({
    queryKey: ["meetings", meetingId, "active-participants", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(MEETING_ACTIVE_PARTICIPANTS(meetingId), {
        headers: buildAuthHeaders(session.accessToken),
      });

      return normalizeActiveParticipantIds(response.data);
    },
    enabled: Boolean(
      !isExternalLiveKitRoom && meetingId && session?.accessToken && joinedMeetingRef.current
    ),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });
  const { refetch: refetchActiveParticipants } = activeParticipantsQuery;
  const activeParticipantIds = useMemo(
    () => activeParticipantsQuery.data || new Set(),
    [activeParticipantsQuery.data]
  );
  const activeParticipantCount = activeParticipantIds.size;
  const participantSearchTerm = participantSearch.trim();
  const userOptionsQuery = useQuery({
    queryKey: ["meetings", meetingId, "add-participant-options", participantSearchTerm, session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(DM_USERS_SEARCH, {
        headers: buildAuthHeaders(session.accessToken),
        params: { query: participantSearchTerm },
        suppressGlobalErrorReport: true,
      });

      return normalizeUserOptions(response.data);
    },
    enabled: Boolean(
      !isExternalLiveKitRoom &&
        isAddParticipantOpen &&
        meetingId &&
        session?.accessToken &&
        participantSearchTerm.length >= 2
    ),
    staleTime: 1000 * 60,
  });
  const addableParticipants = useMemo(() => {
    const existingIds = new Set(participants.map((participant) => String(participant.id)));
    const searchTerm = participantSearchTerm.toLowerCase();

    return (userOptionsQuery.data || [])
      .filter((participant) => !existingIds.has(String(participant.id)))
      .filter((participant) => {
        if (!searchTerm) return true;

        return `${participant.name} ${participant.email}`.toLowerCase().includes(searchTerm);
      });
  }, [participantSearchTerm, participants, userOptionsQuery.data]);
  const addParticipantMutation = useMutation({
    mutationFn: async (userId) => {
      await apiClient.post(
        MEETING_ADD_PARTICIPANT(meetingId, userId),
        {},
        { headers: buildAuthHeaders(session?.accessToken) }
      );
    },
    onSuccess: async () => {
      await Promise.all([
        participantsQuery.refetch(),
        activeParticipantsQuery.refetch(),
      ]);
      setParticipantSearch("");
      setIsAddParticipantOpen(false);
      toast.success("Participant added to call.");
    },
    onError: (error) => {
      toast.error(error.userMessage || "Unable to add participant.");
    },
  });
  const muteParticipantMutation = useMutation({
    mutationFn: async (userId) => {
      await apiClient.post(
        MEETING_MUTE_PARTICIPANT(meetingId, userId),
        {},
        { headers: buildAuthHeaders(session?.accessToken) }
      );
    },
    onSuccess: async () => {
      await participantsQuery.refetch();
      toast.success("Participant muted.");
    },
    onError: (error) => {
      toast.error(error.userMessage || "Unable to mute participant.");
    },
  });
  const removeParticipantMutation = useMutation({
    mutationFn: async (userId) => {
      await apiClient.delete(MEETING_REMOVE_PARTICIPANT(meetingId, userId), {
        headers: buildAuthHeaders(session?.accessToken),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        participantsQuery.refetch(),
        activeParticipantsQuery.refetch(),
      ]);
      toast.success("Participant removed.");
    },
    onError: (error) => {
      toast.error(error.userMessage || "Unable to remove participant.");
    },
  });
//   const endMeeting = useCallback(async () => {
//     if (meetingEndedRef.current) return;

//     meetingEndedRef.current = true;

//     try {
//         await leaveMeeting(true);
//     } catch (e) {
//         console.error(e);
//     }
// }, [leaveMeeting]);

  useEffect(() => {
    if (session?.accessToken) {
      sessionRef.current = session;
    }
  }, [session]);

  useEffect(() => {
    participantNameRef.current = session?.full_name || session?.name || "Participant";
  }, [session?.full_name, session?.name]);

  useEffect(() => {
    meetingRoomNameRef.current = meeting.roomName || "";
  }, [meeting.roomName]);

  useEffect(() => {
    if (!currentUserId) return;

    const currentUserHasRaisedHand = raisedHands.some(
      (participant) => String(participant.id) === String(currentUserId)
    );
    setIsHandRaised(currentUserHasRaisedHand);
  }, [currentUserId, raisedHands]);

  const leaveMeeting = useCallback(async (shouldNavigate = true) => {
    if (leaveAttemptedRef.current) {
        return;
    }
    const activeSession = session?.accessToken ? session : sessionRef.current;

    if (isExternalLiveKitRoom) {
      if (shouldNavigate) {
        if (isStandalone) {
          window.close();
        } else {
          navigate(homePath, { replace: true });
        }
      }
      return;
    }

    if (!meetingId || !activeSession?.accessToken) {
      if (shouldNavigate) {
        navigate(homePath, { replace: true });
      }
      return;
    }

    if (!leaveAttemptedRef.current && joinedMeetingRef.current) {
      leaveAttemptedRef.current = true;

      try {
        await apiClient.post(
          MEETING_LEAVE(meetingId),
          {},
          { headers: buildAuthHeaders(activeSession.accessToken) }
        );
      } catch (error) {
        console.error("Failed to leave meeting:", error);
      }
    }

    if (shouldNavigate) {
      if (isStandalone) {
        window.close();
      } else {
        navigate(homePath, { replace: true });
      }
    }
  }, [homePath, isExternalLiveKitRoom, isStandalone, meetingId, navigate, session]);

  useEffect(() => {
    if (
      isExternalLiveKitRoom ||
      !meetingId ||
      !session?.accessToken ||
      !connectionDetails ||
      !joinedMeetingRef.current
    ) {
      return undefined;
    }

    let disposed = false;
    const headers = buildAuthHeaders(session.accessToken);

    async function sendHeartbeat() {
      try {
        await apiClient.post(
          MEETING_HEARTBEAT(meetingId),
          {},
          {
            headers,
            suppressGlobalErrorReport: true,
          }
        );

        if (!disposed) {
          void refetchActiveParticipants();
        }
      } catch (error) {
        if (error.response?.status === 404 || error.response?.status === 403) {
          toast.info("The call is no longer available.");
          void leaveMeeting(true);
        }
      }
    }

    void sendHeartbeat();
    const heartbeatInterval = window.setInterval(sendHeartbeat, 10000);

    return () => {
      disposed = true;
      window.clearInterval(heartbeatInterval);
    };
  }, [
    connectionDetails,
    isExternalLiveKitRoom,
    leaveMeeting,
    meetingId,
    refetchActiveParticipants,
    session?.accessToken,
  ]);

  useEffect(() => {
    if (!launchId || session?.accessToken) {
      setIsRestoringLaunchSession(false);
      return;
    }

    const launchSession = consumeMeetingLaunchSession(launchId);

    if (launchSession) {
      setSession(launchSession);
    }

    setIsRestoringLaunchSession(false);
  }, [launchId, session?.accessToken, setSession]);

  useEffect(() => {
    let isMounted = true;

    async function requestJoin(headers) {
      const joinResponse = await apiClient.post(
        MEETING_JOIN(meetingId),
        {
          name: participantNameRef.current,
          participant_name: participantNameRef.current
        },
        { headers }
      );

      const meeting = normalizeMeetingRecord(joinResponse.data, meetingId);
      const credentials = normalizeLiveKitCredentials(joinResponse.data);
      const serverUrl = credentials.serverUrl || FALLBACK_LIVEKIT_URL;

      joinedMeetingRef.current = true;

      return {
        meeting,
        connectionDetails:
          credentials.token && serverUrl
            ? {
                token: credentials.token,
                serverUrl,
                roomName: credentials.roomName || meeting.roomName || "",
              }
            : null,
      };
    }

    async function requestConnectionDetails(headers) {
      const tokenResponse = await apiClient.post(
        MEETING_LIVEKIT_TOKEN(meetingId),
        {
          name: participantNameRef.current,
          participant_name: participantNameRef.current
        },
        { headers }
      );
      const credentials = normalizeLiveKitCredentials(tokenResponse.data);
      const serverUrl = credentials.serverUrl || FALLBACK_LIVEKIT_URL;

      if (!credentials.token || !serverUrl) {
        throw new Error("LiveKit token response is missing a token or server URL.");
      }

      return {
        token: credentials.token,
        serverUrl,
        roomName: credentials.roomName || "",
      };
    }

    async function requestCalendarConnectionDetails(headers) {
      const tokenResponse = await apiClient.post(
        CALENDAR_LIVEKIT_TOKEN(calendarEventId),
        {
          name: participantNameRef.current,
          participant_name: participantNameRef.current
        },
        { headers }
      );
      const credentials = normalizeLiveKitCredentials(tokenResponse.data);
      const serverUrl = credentials.serverUrl || FALLBACK_LIVEKIT_URL;

      if (!credentials.token || !serverUrl) {
        throw new Error("Calendar meeting token response is missing a token or server URL.");
      }

      return {
        token: credentials.token,
        serverUrl,
        roomName: credentials.roomName || externalRoomName || calendarEventId,
      };
    }

    async function bootstrapRoom() {
      if (isRestoringLaunchSession) {
        return;
      }

      if (isExternalLiveKitRoom) {
        if (calendarEventId) {
          if (!session?.accessToken) {
            navigate(buildLoginRedirectPath(location), { replace: true });
            return;
          }

          try {
            setIsLoading(true);
            setErrorMessage("");

            const connection = await requestCalendarConnectionDetails(
              buildAuthHeaders(session.accessToken)
            );

            joinedMeetingRef.current = true;

            if (isMounted) {
              setMeeting((current) => ({
                ...current,
                id: current.id || calendarEventId,
                roomName: connection.roomName,
              }));
              setConnectionDetails(connection);
              setErrorMessage("");
              setIsLoading(false);
            }
          } catch (error) {
            if (!isMounted) {
              return;
            }

            const nextMessage =
              error.response?.data?.detail ||
              error.response?.data?.message ||
              error.message ||
              "Unable to join this calendar meeting right now.";

            console.error("Calendar meeting room bootstrap failed:", error);
            setErrorMessage(nextMessage);
            setIsLoading(false);
          }
          return;
        }

        if (!externalRoomToken || !externalRoomServerUrl) {
          if (isMounted) {
            setErrorMessage("This meeting link is missing its LiveKit connection details.");
            setIsLoading(false);
          }
          return;
        }

        joinedMeetingRef.current = true;

        if (isMounted) {
          setMeeting((current) => ({
            ...current,
            id: current.id || meetingId,
            roomName: externalRoomName || current.roomName || meetingId,
          }));
          setConnectionDetails({
            token: externalRoomToken,
            serverUrl: externalRoomServerUrl,
            roomName: externalRoomName || meetingId || "",
          });
          setErrorMessage("");
          setIsLoading(false);
        }
        return;
      }

      if (!meetingId || !session?.accessToken) {
        if (isMounted) {
          setErrorMessage("Your session is missing. Please sign in again.");
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const headers = buildAuthHeaders(session.accessToken);
        const joinResult = await requestJoin(headers);
        const prefetched = prefetchedCredentialsRef.current;
        const joinConnection = joinResult.connectionDetails;
        const hasPrefetchedConnection =
          prefetched.token && (prefetched.serverUrl || FALLBACK_LIVEKIT_URL);

        if (joinResult.meeting?.id) {
          setMeeting(joinResult.meeting);
        }

        if (joinConnection || hasPrefetchedConnection) {
          const connection = joinConnection || {
            token: prefetched.token,
            serverUrl: prefetched.serverUrl || FALLBACK_LIVEKIT_URL,
            roomName: prefetched.roomName || joinResult.meeting.roomName || "",
          };

          if (!isMounted) {
            return;
          }

          setConnectionDetails({
            ...connection,
            roomName: connection.roomName || joinResult.meeting.roomName || meetingRoomNameRef.current || "",
          });
          return;
        }

        const connection = await requestConnectionDetails(headers);

        if (!isMounted) {
          return;
        }

        setConnectionDetails({
          ...connection,
          roomName: connection.roomName || joinResult.meeting.roomName || meetingRoomNameRef.current || "",
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const nextMessage =
          error.response?.data?.message ||
          error.message ||
          "Unable to join this meeting right now.";

        console.error("Meeting room bootstrap failed:", error);
        setErrorMessage(nextMessage);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapRoom();

    return () => {
      isMounted = false;
    };
  }, [
    externalRoomName,
    externalRoomServerUrl,
    externalRoomToken,
    calendarEventId,
    isExternalLiveKitRoom,
    isRestoringLaunchSession,
    location,
    meetingId,
    navigate,
    session?.accessToken,
  ]);

  useEffect(() => {
    if (isExternalLiveKitRoom) {
      return undefined;
    }

    const handleBeforeUnload = () => {
      const activeSession = sessionRef.current;

      if (meetingId && activeSession?.accessToken && !leaveAttemptedRef.current && joinedMeetingRef.current) {
        const headers = buildAuthHeaders(activeSession.accessToken);
        // Use sendBeacon for reliable leave notification on window close
        const url = new URL(MEETING_LEAVE(meetingId), window.location.origin);
        
        // Note: fetch with keepalive: true is a modern alternative to sendBeacon
        void fetch(url, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          keepalive: true,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (
        !meetingId ||
        leaveAttemptedRef.current ||
        !joinedMeetingRef.current
      ) {
        return;
      }

      const activeSession = sessionRef.current;

      if (!activeSession?.accessToken) {
        return;
      }

      leaveAttemptedRef.current = true;
      void apiClient.post(
        MEETING_LEAVE(meetingId),
        {},
        { headers: buildAuthHeaders(activeSession.accessToken) }
      );
    };
  }, [isExternalLiveKitRoom, meetingId]);

  useEffect(() => {
    if (isRestoringLaunchSession || session?.accessToken || !joinedMeetingRef.current) {
      return;
    }

    toast.info("You signed out in another tab. The call has ended.");
    setConnectionDetails(null);
    void leaveMeeting(true);
  }, [isRestoringLaunchSession, leaveMeeting, session?.accessToken]);

  // Handle real-time call cancellation/declining from the single global user-events socket.
  useEffect(() => {
    if (!meetingId) return;

    function handleUserEvent(event) {
      const payload = event.detail;
      if (!payload) return;

      const eventStr = String(payload.event || payload.type || "").toLowerCase();
      const isTermination =
        eventStr.includes("cancel") ||
        eventStr.includes("end") ||
        eventStr.includes("decline") ||
        eventStr.includes("reject");

      if (!isTermination) return;

      const targetId =
        payload.meeting_id ||
        payload.meetingId ||
        payload.id ||
        payload.meeting?.id ||
        payload.data?.meeting_id ||
        payload.data?.id;

      if (targetId && String(targetId) === String(meetingId)) {
        toast.info("The call has ended or was declined.");
        void leaveMeeting(true);
      }
    }

    window.addEventListener("Levitica Connect:user-event", handleUserEvent);

    return () => {
      window.removeEventListener("Levitica Connect:user-event", handleUserEvent);
    };
  }, [leaveMeeting, meetingId]);

  // Robust Polling Fallback to ensure call closes even if WebSockets fail
  useEffect(() => {
    if (isExternalLiveKitRoom || !meetingId || !session?.accessToken) return;

    let disposed = false;
    const headers = buildAuthHeaders(session.accessToken);

    const pollInterval = window.setInterval(async () => {
      if (disposed) return;

      try {
        const response = await apiClient.get(MEETING_DETAILS(meetingId), { headers });
        const rawStatus = 
          response.data?.status || 
          response.data?.meeting?.status || 
          response.data?.state || 
          response.data?.meeting?.state;
          
        const isInactive = 
          response.data?.is_active === false || 
          response.data?.meeting?.is_active === false ||
          response.data?.active === false ||
          response.data?.meeting?.active === false;
          
        if (isInactive) {
          toast.info("The call has ended or was declined.");
          void leaveMeeting(true);
          return;
        }
          
        if (typeof rawStatus === "string") {
          const status = rawStatus.toLowerCase();
          if (status === "declined" || status === "ended" || status === "cancelled" || status === "rejected") {
            toast.info("The call has ended or was declined.");
            void leaveMeeting(true);
          }
        }
      } catch (error) {
        if (error.response?.status === 404 || error.response?.status === 403) {
          toast.info("The call is no longer available.");
          void leaveMeeting(true);
        }
      }
    }, 3000);

    return () => {
      disposed = true;
      window.clearInterval(pollInterval);
    };
  }, [isExternalLiveKitRoom, leaveMeeting, meetingId, session?.accessToken]);

  function handleDisconnected() {
    toast.message("Call ended");
    void leaveMeeting(true);
  }

  async function sendMeetingAction(endpoint, successMessage) {
    if (isExternalLiveKitRoom) {
      toast.info("Meeting room controls are available in the video toolbar.");
      return false;
    }

    if (!meetingId || !session?.accessToken) {
      toast.error("Please sign in again to use meeting controls.");
      return false;
    }

    try {
      setIsSendingMeetingAction(true);
      await apiClient.post(endpoint, {}, { headers: buildAuthHeaders(session.accessToken) });
      toast.success(successMessage);
      void raisedHandsQuery.refetch();
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to send that meeting action."
      );
      return false;
    } finally {
      setIsSendingMeetingAction(false);
    }
  }

  async function toggleHandRaised() {
    const nextRaised = !isHandRaised;
    setIsHandRaised(nextRaised);

    const succeeded = await sendMeetingAction(
      nextRaised ? MEETING_RAISE_HAND(meetingId) : MEETING_LOWER_HAND(meetingId),
      nextRaised ? "Hand raised" : "Hand lowered"
    );

    if (!succeeded) {
      setIsHandRaised(!nextRaised);
    }
  }

  async function sendReaction(emoji) {
    await sendMeetingAction(MEETING_REACTION(meetingId, emoji), `${emoji} sent`);
  }

  const content = (
    <div className="flex h-full min-h-0 flex-col bg-[#08111f] text-white">
      <div className="shrink-0 border-b border-white/10 bg-[#08111f]/95 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:px-6">
        {!isStandalone ? (
          <button
            type="button"
            onClick={() => navigate(homePath)}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="size-4" />
            {backLabel}
          </button>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-[0_10px_30px_rgba(56,189,248,0.12)]">
              <Video className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                Live meeting
              </div>
              <h1 className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">
                {meetingDisplayName}
              </h1>
              <p className="truncate text-xs font-semibold text-white/45 sm:text-sm">
                Meeting ID: {meetingId}
              </p>
              {raisedHands.length ? (
                <div className="mt-2 flex max-w-full flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/15 px-2.5 py-1 text-[11px] font-black text-amber-100">
                    <Hand className="size-3.5" />
                    {raisedHands.length} raised
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {raisedHands.slice(0, 4).map((participant) => (
                      <span
                        key={participant.id}
                        className="inline-flex max-w-[170px] items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-bold text-white/85"
                        title={`${participant.name} raised hand`}
                      >
                        {participant.image ? (
                          <img
                            src={participant.image}
                            alt=""
                            className="size-5 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex size-5 items-center justify-center rounded-full bg-amber-300/20 text-[9px] font-black text-amber-100">
                            {getInitials(participant.name)}
                          </span>
                        )}
                        <span className="truncate">{participant.name}</span>
                      </span>
                    ))}
                    {raisedHands.length > 4 ? (
                      <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-bold text-white/70">
                        +{raisedHands.length - 4} more
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {!isExternalLiveKitRoom ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void toggleHandRaised()}
                disabled={isSendingMeetingAction}
                className={`h-10 rounded-xl border px-3 text-xs font-bold transition ${
                  isHandRaised
                    ? "border-amber-300/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/20"
                    : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {isSendingMeetingAction ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Hand className="mr-2 size-4" />
                )}
                {isHandRaised ? "Lower hand" : "Raise hand"}
              </Button>

              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsAddParticipantOpen((open) => !open);
                    void userOptionsQuery.refetch();
                  }}
                  className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <Plus className="mr-2 size-4" />
                  Add participant
                </Button>
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                {MEETING_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void sendReaction(emoji)}
                    disabled={isSendingMeetingAction}
                    className="flex size-8 items-center justify-center rounded-lg text-base transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    title={`Send ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsParticipantsOpen((open) => !open);
                    void participantsQuery.refetch();
                    void activeParticipantsQuery.refetch();
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <Users className="size-4" />
                  Participants
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">
                    {activeParticipantCount} active
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div
            className={`flex max-w-md flex-col items-center gap-4 rounded-[28px] border px-8 py-10 text-center shadow-sm ${
              isStandalone
                ? "border-white/10 bg-white/5 text-white"
                : "border-brand-line bg-white"
            }`}
          >
            <LoaderCircle className="size-10 animate-spin text-brand-primary" />
            <div>
              <h2
                className={`text-lg font-bold ${
                  isStandalone ? "text-white" : "text-brand-ink"
                }`}
              >
                Connecting to your room
              </h2>
              <p
                className={`mt-2 text-sm ${
                  isStandalone ? "text-white/60" : "text-brand-secondary"
                }`}
              >
                We&apos;re fetching the meeting token and setting up audio,
                video, and screen sharing.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div
            className={`max-w-lg rounded-[28px] border px-8 py-10 shadow-sm ${
              isStandalone
                ? "border-red-500/20 bg-white/5"
                : "border-red-200 bg-white"
            }`}
          >
            <h2
              className={`text-lg font-bold ${
                isStandalone ? "text-white" : "text-brand-ink"
              }`}
            >
              Unable to open this meeting
            </h2>
            <p
              className={`mt-3 text-sm leading-6 ${
                isStandalone ? "text-white/60" : "text-brand-secondary"
              }`}
            >
              {errorMessage}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() =>
                  isStandalone
                    ? window.close()
                    : navigate(homePath, { replace: true })
                }
                className="rounded-xl bg-brand-primary px-5 py-2.5 font-bold text-white hover:bg-brand-primary/90"
              >
                {isStandalone ? "Close Window" : "Return"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
                className={`rounded-xl px-5 py-2.5 font-bold ${
                  isStandalone
                    ? "border-white/10 text-white hover:bg-white/5"
                    : ""
                }`}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && !errorMessage && connectionDetails ? (
        <div className="min-h-0 flex-1 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_32%),#08111f] p-3 sm:p-4">
          <Suspense
            fallback={<MeetingRoomLoader isStandalone={isStandalone} />}
          >
            <LiveKitMeetingRoom
              callMode={callMode}
              connectionDetails={connectionDetails}
              isDirect={
                searchParams.get("isCall") === "true" ||
                meeting.meeting_type === "direct" ||
                meeting.is_direct ||
                meeting.type === "direct"
              }
              onDisconnected={handleDisconnected}
              onDirectParticipantLeft={() => {
                if (leftToastShownRef.current) return;

                leftToastShownRef.current = true;

                toast.info("The other participant has left the call.");

                void leaveMeeting(true);
              }}
            />
          </Suspense>
        </div>
      ) : null}

      {isAddParticipantOpen ? (
        <div className="fixed inset-x-3 top-28 z-[2147483646] mx-auto w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] text-white shadow-2xl shadow-black/50 sm:right-[315px] sm:left-auto sm:mx-0">
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Search className="size-4 text-white/40" />
              <input
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Search users"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsAddParticipantOpen(false)}
                className="rounded-lg p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                aria-label="Close add participant"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[340px] overflow-y-auto p-2 [scrollbar-width:thin]">
            {participantSearchTerm.length < 2 ? (
              <div className="px-3 py-8 text-center text-sm font-semibold text-white/45">
                Type at least 2 letters to find users.
              </div>
            ) : userOptionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm font-bold text-white/55">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Loading users...
              </div>
            ) : userOptionsQuery.isError ? (
              <div className="px-3 py-8 text-center text-sm font-semibold text-red-200">
                Unable to load users.
              </div>
            ) : addableParticipants.length ? (
              addableParticipants.map((participant) => {
                const isAdding =
                  addParticipantMutation.isPending &&
                  String(addParticipantMutation.variables) ===
                    String(participant.id);

                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() =>
                      addParticipantMutation.mutate(participant.id)
                    }
                    disabled={addParticipantMutation.isPending}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {participant.image ? (
                      <img
                        src={participant.image}
                        alt=""
                        className="size-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-full bg-sky-400/15 text-xs font-black text-sky-100">
                        {getInitials(participant.name)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">
                        {participant.name}
                      </span>
                      {participant.email ? (
                        <span className="block truncate text-xs font-semibold text-white/40">
                          {participant.email}
                        </span>
                      ) : null}
                    </span>
                    {isAdding ? (
                      <LoaderCircle className="size-4 animate-spin text-white/60" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-8 text-center text-sm font-semibold text-white/45">
                No matching users found.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {isParticipantsOpen ? (
        <div className="fixed inset-0 z-[2147483647] flex justify-end bg-black/30 backdrop-blur-[1px]">
          <button
            type="button"
            aria-label="Close participants"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsParticipantsOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-[380px] flex-col border-l border-white/10 bg-[#0f172a] text-white shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-base font-black">Participants</h3>
                <p className="mt-1 text-xs font-semibold text-white/45">
                  {activeParticipantCount} currently in call •{" "}
                  {participants.length} invited/history
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void participantsQuery.refetch();
                    void activeParticipantsQuery.refetch();
                  }}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsParticipantsOpen(false)}
                  className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close participants"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
              {participantsQuery.isLoading ? (
                <div className="flex items-center justify-center py-16 text-sm font-bold text-white/55">
                  <LoaderCircle className="mr-2 size-5 animate-spin" />
                  Loading participants...
                </div>
              ) : participantsQuery.isError ? (
                <div className="px-3 py-12 text-center text-sm font-semibold text-red-200">
                  Unable to load participants.
                </div>
              ) : participants.length ? (
                participants.map((participant) => {
                  const isInCall = activeParticipantIds.has(
                    String(participant.id),
                  );
                  const isCurrentUser =
                    String(participant.id) === String(currentUserId);
                  const isRemoving =
                    removeParticipantMutation.isPending &&
                    String(removeParticipantMutation.variables) ===
                      String(participant.id);
                  const isMuting =
                    muteParticipantMutation.isPending &&
                    String(muteParticipantMutation.variables) ===
                      String(participant.id);

                  return (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5"
                    >
                      {participant.image ? (
                        <img
                          src={participant.image}
                          alt=""
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-full bg-sky-400/15 text-xs font-black text-sky-100">
                          {getInitials(participant.name)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-bold text-white">
                            {participant.name}
                          </p>
                          {participant.handRaised ? (
                            <Hand className="size-3.5 shrink-0 text-amber-200" />
                          ) : null}
                        </div>
                        <p className="truncate text-xs font-semibold text-white/40">
                          {participant.role}
                          <span
                            className={
                              isInCall ? "text-emerald-200" : "text-white/35"
                            }
                          >
                            {isInCall ? " • In call" : " • Not in call"}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 text-white/45">
                        <span
                          className={`size-2.5 rounded-full ${
                            isInCall
                              ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]"
                              : "bg-white/20"
                          }`}
                          title={isInCall ? "In call" : "Not in call"}
                        />
                        {participant.isMuted ? (
                          <MicOff className="size-4" />
                        ) : null}
                        {participant.videoEnabled ? null : (
                          <VideoOff className="size-4" />
                        )}
                        {!isCurrentUser ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                muteParticipantMutation.mutate(participant.id)
                              }
                              disabled={
                                muteParticipantMutation.isPending ||
                                participant.isMuted
                              }
                              className="ml-1 rounded-lg p-1.5 text-amber-100 transition hover:bg-amber-400/15 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Mute ${participant.name}`}
                              title={
                                participant.isMuted
                                  ? "Participant muted"
                                  : "Mute participant"
                              }
                            >
                              {isMuting ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <MicOff className="size-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeParticipantMutation.mutate(participant.id)
                              }
                              disabled={removeParticipantMutation.isPending}
                              className="rounded-lg p-1.5 text-red-200 transition hover:bg-red-500/15 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Remove ${participant.name}`}
                              title="Remove participant"
                            >
                              {isRemoving ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-12 text-center text-sm font-semibold text-white/45">
                  No participants found.
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );

  if (isStandalone) {
    return <div className="h-screen w-screen overflow-hidden">{content}</div>;
  }

  return (
    <Layout
      showFloatingActions={false}
      contentClassName="!px-0 !py-0 !overflow-hidden"
      contentInnerClassName="!mx-0 !h-full !max-w-none !w-full"
    >
      {content}
    </Layout>
  );
}
