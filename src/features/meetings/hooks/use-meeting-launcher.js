import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { MEETING_CALL, MEETING_CHANNEL_CALL } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import {
  buildMeetingRoomPath,
  buildStandaloneMeetingRoomUrl,
  getMeetingVariantConfig,
  normalizeMeetingRecord,
} from "../utils/meeting-utils";

function buildAuthHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function resolveTargetUserId(targetUser) {
  return (
    targetUser?.userId ||
    targetUser?.auth_user_id ||
    targetUser?.authUserId ||
    targetUser?.user_id ||
    targetUser?.user?.id ||
    targetUser?.user?.user_id ||
    targetUser?.id ||
    null
  );
}

function resolveTargetUserName(targetUser) {
  return (
    targetUser?.full_name ||
    targetUser?.fullName ||
    targetUser?.name ||
    targetUser?.display_name ||
    targetUser?.displayName ||
    targetUser?.participant_name ||
    targetUser?.email ||
    ""
  );
}

function getDeliveryInfo(payload) {
  return payload?.delivery || payload?.data?.delivery || null;
}

function getResponseSuccess(payload) {
  if (typeof payload?.success === "boolean") {
    return payload.success;
  }

  if (typeof payload?.data?.success === "boolean") {
    return payload.data.success;
  }

  return true;
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.message || data?.detail || error?.message || fallback;
}

export function useMeetingLauncher(variant) {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const { homePath } = getMeetingVariantConfig(variant);

  function openMeetingsHome() {
    navigate(homePath);
  }

  function openMeetingRoom(meeting, options = {}) {
    const normalizedMeeting = normalizeMeetingRecord(meeting);

    if (!normalizedMeeting.id) {
      toast.error("Meeting ID is missing.");
      return null;
    }

    const baseUrl = buildMeetingRoomPath(variant, normalizedMeeting.id, options.mode, false, {
      displayName: options.displayName,
    });
    const nextPath = buildStandaloneMeetingRoomUrl(baseUrl, session);

    window.open(nextPath, "_blank", "width=1280,height=720,noopener,noreferrer");

    return normalizedMeeting;
  }

  async function startDirectCall(targetUser, options = {}) {
    const targetUserId = resolveTargetUserId(targetUser);

    if (!session?.accessToken) {
      toast.error("Please sign in again to start a call.");
      return null;
    }

    if (!targetUserId) {
      toast.error("This user is missing a call target ID.");
      return null;
    }

    try {
      const requestedCallType = options.mode === "audio" ? "audio" : "video";
      const response = await apiClient.post(
        MEETING_CALL(targetUserId),
        { call_type: requestedCallType },
        { headers: buildAuthHeaders(session.accessToken) }
      );

      if (!getResponseSuccess(response.data) || response.data?.receiver_connected === false) {
        toast.error(
          response.data?.message ||
            "This user is offline right now. Please try again when they are connected."
        );
        return null;
      }

      const meeting = normalizeMeetingRecord(response.data);

      if (!meeting.id) {
        throw new Error("Call response did not include a meeting ID.");
      }

      const baseUrl = buildMeetingRoomPath(variant, meeting.id, options.mode, true, {
        displayName: resolveTargetUserName(targetUser),
      });
      const nextPath = buildStandaloneMeetingRoomUrl(baseUrl, session);

      window.open(nextPath, "_blank", "width=1280,height=720,noopener,noreferrer");

      return meeting;
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to start the call."));

      return null;
    }
  }

  async function startChannelCall(channel, options = {}) {
    const channelId =
      channel?.channel_id ||
      channel?.id ||
      channel?.uuid ||
      null;

    if (!session?.accessToken) {
      toast.error("Please sign in again to start a channel call.");
      return null;
    }

    if (!channelId) {
      toast.error("Select a channel before starting a call.");
      return null;
    }

    try {
      const requestedCallType = options.mode === "audio" ? "audio" : "video";
      const channelName = channel?.name || channel?.channel_name || "Channel";
      const response = await apiClient.post(
        MEETING_CHANNEL_CALL,
        {
          title: `${channelName} call`,
          channel_id: channelId,
          call_type: requestedCallType,
          is_channel_call: true,
          scheduled_at: new Date().toISOString(),
        },
        { headers: buildAuthHeaders(session.accessToken) }
      );

      if (!getResponseSuccess(response.data)) {
        toast.error(response.data?.message || "Unable to start the channel call.");
        return null;
      }

      const meeting = normalizeMeetingRecord(response.data);
      const delivery = getDeliveryInfo(response.data);

      if (!meeting.id) {
        throw new Error("Channel call response did not include a meeting ID.");
      }

      if (delivery?.total_members > 0 && delivery.delivered_users?.length === 0) {
        toast.error("No channel members are connected right now.");
        return null;
      }

      const baseUrl = buildMeetingRoomPath(variant, meeting.id, requestedCallType, true, {
        displayName: channelName,
      });
      const nextPath = buildStandaloneMeetingRoomUrl(baseUrl, session);

      window.open(nextPath, "_blank", "width=1280,height=720,noopener,noreferrer");
      toast.success(
        delivery?.failed_users?.length
          ? `Calling #${channelName}. ${delivery.delivered_users?.length || 0} member(s) reached.`
          : `Calling #${channelName}. Channel members can join the room.`
      );

      return meeting;
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to start the channel call."));

      return null;
    }
  }

  return {
    homePath,
    openMeetingsHome,
    openMeetingRoom,
    startDirectCall,
    startChannelCall,
  };
}
