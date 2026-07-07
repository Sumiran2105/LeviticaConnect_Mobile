import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { FIREBASE_MESSAGE_EVENT } from "@/components/firebase-notification-bridge";
import { DM_CHANNELS } from "@/config/api";
import { apiClient } from "@/lib/client";

function normalizeChannels(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.channels)) return data.channels;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getUnreadCount(channel) {
  return Number(channel?.unread_count ?? channel?.unreadCount ?? channel?.unread ?? 0) || 0;
}

export function useUnreadDirectMessages(accessToken) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["dm-unread-total", accessToken], [accessToken]);
  const { data = 0, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => fetchUnreadDirectMessageTotal(accessToken),
    enabled: Boolean(accessToken),
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 10 * 1000,
  });

  useEffect(() => {
    if (!accessToken || typeof window === "undefined") {
      return undefined;
    }

    function handleIncomingMessage() {
      queryClient.invalidateQueries({ queryKey });
    }

    window.addEventListener(FIREBASE_MESSAGE_EVENT, handleIncomingMessage);

    return () => {
      window.removeEventListener(FIREBASE_MESSAGE_EVENT, handleIncomingMessage);
    };
  }, [accessToken, queryClient, queryKey]);

  return {
    unreadCount: data,
    isLoading,
    isError,
  };
}

async function fetchUnreadDirectMessageTotal(accessToken) {
  const response = await apiClient.get(DM_CHANNELS, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  return normalizeChannels(response.data).reduce(
    (total, channel) => total + getUnreadCount(channel),
    0
  );
}
