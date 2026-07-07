import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { CHANNELS_MY_CHANNELS, CHANNEL_UNREAD_COUNT } from "@/config/api";
import { apiClient } from "@/lib/client";
import { isDirectChannel } from "@/features/teams/utils/team-utils";
import { getJwtPayload } from "@/features/chat/utils/chat-utils";

const CHANNEL_CACHE_PREFIX = "Levitica Connect-user-channels-v1";

function normalizeChannels(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.channels)) {
    return data.channels;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function buildChannelView(channel, index) {
  const name = channel?.name || channel?.channel_name || `channel-${index + 1}`;
  const description =
    channel?.description ||
    channel?.purpose ||
    channel?.topic ||
    "No channel description available yet.";
  const memberCount =
    channel?.members_count ||
    channel?.member_count ||
    channel?.members?.length ||
    0;
  const teamName =
    channel?.team_name || channel?.team?.name || channel?.workspace_name || "Workspace channel";
  const isPrivate = Boolean(channel?.private || channel?.is_private);

  return {
    ...channel,
    id: channel?.id || channel?.channel_id || `${name}-${index}`,
    name,
    description,
    memberCount,
    isPrivate,
    teamName,
    visibilityLabel: isPrivate ? "Private" : "Public",
    lastActivityAt: channel?.last_message_at || channel?.updated_at || channel?.created_at || null,
  };
}

function getChannelActivityTime(channel) {
  const value = channel?.lastActivityAt || channel?.last_message_at || channel?.updated_at || channel?.created_at;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export function useUserTeams({ accessToken, initialChannelId = null }) {
  const [search, setSearch] = useState("");
  const [activeChannelId, setActiveChannelId] = useState(initialChannelId);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const cacheKey = useMemo(() => {
    const payload = getJwtPayload(accessToken);
    const userKey = payload?.sub || payload?.user_id || payload?.id || payload?.email || "anonymous";
    return `${CHANNEL_CACHE_PREFIX}:${userKey}`;
  }, [accessToken]);

  const channelsQuery = useQuery({
    queryKey: ["my-channels", accessToken],
    queryFn: async () => {
      const response = await apiClient.get(CHANNELS_MY_CHANNELS, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return normalizeChannels(response.data).filter((channel) => !isDirectChannel(channel)).map(buildChannelView);
    },
    enabled: Boolean(accessToken),
    initialData: () => {
      if (typeof window === "undefined" || !accessToken) return undefined;

      try {
        return JSON.parse(window.localStorage.getItem(cacheKey) || "null") || undefined;
      } catch {
        return undefined;
      }
    },
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnReconnect: true,
    refetchInterval: 15 * 1000,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !channelsQuery.data?.length) return;

    window.localStorage.setItem(cacheKey, JSON.stringify(channelsQuery.data));
  }, [cacheKey, channelsQuery.data]);

  useEffect(() => {
    if (!initialChannelId) return undefined;

    const timerId = window.setTimeout(() => {
      setActiveChannelId(initialChannelId);
      setIsMobilePanelOpen(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [initialChannelId]);

  const rawChannels = useMemo(() => channelsQuery.data || [], [channelsQuery.data]);
  const unreadCountQueries = useQueries({
    queries: rawChannels.map((channel) => ({
      queryKey: ["channel-unread-count", channel.id],
      queryFn: async () => {
        try {
          const response = await apiClient.get(CHANNEL_UNREAD_COUNT(channel.id), {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            suppressGlobalErrorReport: true,
          });

          return response.data?.unread_messages ?? 0;
        } catch {
          return 0;
        }
      },
      enabled: Boolean(accessToken && channel.id),
      retry: false,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const channels = useMemo(() => {
    return rawChannels
      .map((channel, index) => ({
        ...channel,
        unreadCount: unreadCountQueries[index]?.data ?? channel.unreadCount ?? 0,
      }))
      .sort((first, second) => {
        const unreadDelta = Number(second.unreadCount || 0) - Number(first.unreadCount || 0);
        if (unreadDelta !== 0) return unreadDelta;
        return getChannelActivityTime(second) - getChannelActivityTime(first);
      });
  }, [rawChannels, unreadCountQueries]);

  const filteredChannels = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return channels;
    }

    return channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) ||
        channel.description.toLowerCase().includes(query) ||
        channel.teamName.toLowerCase().includes(query)
    );
  }, [channels, deferredSearch]);

  const activeChannel =
    channels.find((channel) => channel.id === activeChannelId) ||
    filteredChannels.find((channel) => channel.id === activeChannelId) ||
    filteredChannels[0] ||
    channels[0] ||
    null;

  const openChannel = (channel) => {
    setActiveChannelId(channel.id);
    setIsMobilePanelOpen(true);
  };

  return {
    channelState: {
      filteredChannels,
      activeChannel,
      isLoading: channelsQuery.isLoading,
      isError: channelsQuery.isError,
    },
    sidebarState: {
      search,
      setSearch,
      isMobilePanelOpen,
      setIsMobilePanelOpen,
      openChannel,
    },
  };
}
