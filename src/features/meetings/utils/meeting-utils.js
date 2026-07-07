function pickFirstString(values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

const meetingLaunchStoragePrefix = "Levitica Connect-meeting-launch:";

function createLaunchId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function withSearchParam(path, key, value) {
  if (!value) {
    return path;
  }

  if (typeof window === "undefined") {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }

  const url = new URL(path, window.location.origin);
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getMeetingId(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  return (
    record.id ||
    record.meeting_id ||
    record.meetingId ||
    record.uuid ||
    record._id ||
    null
  );
}

export function normalizeMeetingRecord(payload, fallbackId = "") {
  const sources = [
    payload,
    payload?.data,
    payload?.meeting,
    payload?.item,
    payload?.result,
    payload?.data?.meeting,
    payload?.data?.item,
    payload?.result?.meeting,
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    const id = getMeetingId(source) || fallbackId || null;
    const title = pickFirstString([
      source.title,
      source.name,
      source.topic,
      source.subject,
    ]) || (id ? `Meeting ${String(id).slice(-6)}` : "Meeting");
    const joinLink = pickFirstString([
      source.join_link,
      source.joinLink,
      source.meeting_link,
      source.meetingLink,
      source.meeting_url,
      source.meetingUrl,
      source.invite_link,
      source.inviteLink,
      source.share_url,
      source.shareUrl,
      source.url,
      source.link,
    ]);
    const roomName = pickFirstString([
      source.room_name,
      source.roomName,
      source.livekit_room,
      source.livekitRoom,
      source.room,
    ]);

    if (id || joinLink || roomName) {
      return {
        ...source,
        id,
        title,
        joinLink,
        roomName,
      };
    }
  }

  return {
    id: fallbackId || null,
    title: fallbackId ? `Meeting ${String(fallbackId).slice(-6)}` : "Meeting",
    joinLink: "",
    roomName: "",
  };
}

export function getMeetingDisplayName(meeting, fallback = "") {
  const channel = meeting?.channel || meeting?.channel_data || meeting?.channelData || {};
  const caller = meeting?.caller || meeting?.caller_data || meeting?.callerData || {};
  const receiver = meeting?.receiver || meeting?.receiver_data || meeting?.receiverData || {};
  const target = meeting?.target_user || meeting?.targetUser || meeting?.user || meeting?.participant || {};
  const isDirectCall =
    meeting?.is_direct ||
    meeting?.is_direct_call ||
    meeting?.is_channel_call === false ||
    meeting?.isChannelCall === false ||
    (meeting?.caller && meeting?.receiver) ||
    meeting?.meeting_type === "direct" ||
    meeting?.type === "direct" ||
    ["direct", "direct call"].includes(String(meeting?.title || "").trim().toLowerCase());
  const isChannelCall =
    !isDirectCall &&
    (meeting?.is_channel_call ||
      meeting?.channel_id ||
      meeting?.channelId ||
      meeting?.meeting_type === "channel" ||
      meeting?.type === "channel");

  if (isChannelCall) {
    return pickFirstString([
      fallback,
      meeting?.channel_name,
      meeting?.channelName,
      channel?.name,
      channel?.channel_name,
      meeting?.title,
    ]);
  }

  if (isDirectCall) {
    return pickFirstString([
      fallback,
      meeting?.participant_name,
      meeting?.participantName,
      meeting?.target_name,
      meeting?.targetName,
      target?.full_name,
      target?.name,
      caller?.full_name,
      caller?.name,
      receiver?.full_name,
      receiver?.name,
      String(meeting?.title || "").trim().toLowerCase() === "direct" ? "" : meeting?.title,
    ]);
  }

  return pickFirstString([fallback, meeting?.title, meeting?.name]) || "Meeting Room";
}

export function normalizeLiveKitCredentials(payload) {
  const sources = [
    payload,
    payload?.data,
    payload?.result,
    payload?.livekit,
    payload?.data?.livekit,
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    const token = pickFirstString([
      source.token,
      source.livekit_token,
      source.livekitToken,
      source.access_token,
      source.accessToken,
      source.participant_token,
      source.participantToken,
    ]);
    const serverUrl = pickFirstString([
      source.url,
      source.livekit_url,
      source.livekitUrl,
      source.server_url,
      source.serverUrl,
      source.ws_url,
      source.wsUrl,
    ]);
    const roomName = pickFirstString([
      source.room_name,
      source.roomName,
      source.room,
      source.livekit_room,
      source.livekitRoom,
    ]);

    if (token || serverUrl || roomName) {
      return { token, serverUrl, roomName };
    }
  }

  return { token: "", serverUrl: "", roomName: "" };
}

export function extractInviteToken(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmed);
    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    const joinIndex = segments.findIndex((segment) => segment === "join");

    if (joinIndex >= 0 && segments[joinIndex + 1]) {
      return segments[joinIndex + 1];
    }

    return segments.at(-1) || trimmed;
  } catch {
    return trimmed.replace(/^\/+|\/+$/g, "");
  }
}

export function toLocalDateTimeValue(date) {
  const instance = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return "";
  }

  const offset = instance.getTimezoneOffset();
  const localDate = new Date(instance.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

export function getMeetingVariantConfig(variant = "user") {
  if (variant === "admin") {
    return {
      homePath: "/admin/dashboard/meetings",
      title: "Meetings",
      intro:
        "Create a meeting, join by invite, and move into the shared LiveKit room from the admin workspace.",
      backLabel: "Back to Meetings",
    };
  }

  return {
    homePath: "/user/dashboard/meet",
    title: "Meet",
    intro:
      "Create a meeting, join by invite, and move into a full LiveKit room for audio, video, and screen share.",
    backLabel: "Back to Meet",
  };
}

export function buildMeetingRoomPath(variant = "user", meetingId, mode = "video", isCall = false, options = {}) {
  const { homePath } = getMeetingVariantConfig(variant);
  const search = new URLSearchParams();
  
  if (mode === "audio") {
    search.set("mode", "audio");
  }
  
  if (isCall) {
    search.set("isCall", "true");
  }

  if (options.displayName) {
    search.set("displayName", options.displayName);
  }

  const searchStr = search.toString() ? `?${search.toString()}` : "";
  return `${homePath}/${meetingId}/room${searchStr}`;
}

export function buildStandaloneMeetingRoomUrl(path, session) {
  let nextPath = withSearchParam(path, "standalone", "true");

  if (typeof window === "undefined" || !session?.accessToken) {
    return nextPath;
  }

  try {
    const launchId = createLaunchId();
    window.localStorage.setItem(
      `${meetingLaunchStoragePrefix}${launchId}`,
      JSON.stringify({
        expiresAt: Date.now() + 60 * 1000,
        session,
      })
    );
    nextPath = withSearchParam(nextPath, "launchId", launchId);
  } catch {
    // If storage is unavailable, the room can still try the current tab session.
  }

  return nextPath;
}

export function consumeMeetingLaunchSession(launchId) {
  if (typeof window === "undefined" || !launchId) {
    return null;
  }

  const storageKey = `${meetingLaunchStoragePrefix}${launchId}`;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    window.localStorage.removeItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const payload = JSON.parse(rawValue);

    if (!payload?.session?.accessToken || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload.session;
  } catch {
    return null;
  }
}
