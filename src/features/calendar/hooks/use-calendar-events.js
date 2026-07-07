import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "@/lib/client";
import {
  CALENDAR_CREATE_EVENT,
  CALENDAR_EVENT,
  CALENDAR_EVENTS,
  CALENDAR_UPCOMING_EVENTS,
} from "@/config/api";
import { useAuthStore } from "@/store/auth-store";

function buildAuthHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function getParticipantId(participant) {
  return (
    participant?.user_id ||
    participant?.userId ||
    participant?.auth_user_id ||
    participant?.authUserId ||
    participant?.user?.id ||
    participant?.participant?.id ||
    participant?.id ||
    null
  );
}

function dedupeParticipants(participants = []) {
  const seen = new Set();
  const deduped = [];

  for (const participant of participants) {
    const id = getParticipantId(participant);
    if (!id || seen.has(String(id))) continue;

    seen.add(String(id));
    deduped.push({ ...participant, id });
  }

  return deduped;
}

function normalizeEvent(raw) {
  const start = new Date(raw.start_time);
  const end = new Date(raw.end_time);
  const durationMs = end - start;
  const durationMins = Math.round(durationMs / 60000);

  let durationLabel;
  if (durationMins < 60) {
    durationLabel = `${durationMins} min`;
  } else {
    const hrs = durationMins / 60;
    durationLabel = hrs === 1 ? "1 hr" : `${hrs} hrs`;
  }


  let hours = start.getHours();
  const minutes = start.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const timeStr = `${hours}:${String(minutes).padStart(2, "0")} ${ampm}`;
  const participants = dedupeParticipants(raw.participants || []);
  const participantIds = participants.length
    ? participants.map((participant) => String(participant.id))
    : Array.from(new Set((raw.participant_ids || []).filter(Boolean).map(String)));

  return {
    ...raw,
    id: raw.id,
    title: raw.title || "Untitled Event",
    description: raw.description || "",
    created_by: raw.created_by || raw.createdBy || raw.creator_id || raw.creatorId || raw.user_id || raw.userId || raw.host_id || raw.hostId || "",
    host_id: raw.host_id || raw.hostId || raw.created_by || raw.createdBy || raw.creator_id || raw.creatorId || raw.user_id || raw.userId || "",
    is_host: raw.is_host === true || raw.isHost === true,
    time: timeStr,
    duration: durationLabel,
    color: raw.color || "bg-blue-500",
    type: raw.type || "meet",
    attendees: participants.length || participantIds.length,
    start_time: raw.start_time,
    end_time: raw.end_time,
    participant_ids: participantIds,
    participants,
  };
}

/**

 */
function groupEventsByDate(events) {
  const grouped = {};
  for (const ev of events) {
    const d = new Date(ev.start_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  }
  return grouped;
}

export function useCalendarEvents() {
  const session = useAuthStore((state) => state.session);
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();


  const eventsQuery = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const response = await apiClient.get(CALENDAR_EVENTS, {
        headers: buildAuthHeaders(accessToken),
      });

      const rawEvents = Array.isArray(response.data)
        ? response.data
        : response.data?.events || response.data?.items || response.data?.data || [];

      return rawEvents.map(normalizeEvent);
    },
    enabled: Boolean(accessToken),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const eventsByDate = groupEventsByDate(eventsQuery.data || []);


  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await apiClient.post(CALENDAR_CREATE_EVENT, eventData, {
        headers: buildAuthHeaders(accessToken),
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Event created successfully.");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-upcoming-events"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message ||
          "Failed to create event."
      );
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, eventData }) => {
      const response = await apiClient.put(CALENDAR_EVENT(eventId), eventData, {
        headers: buildAuthHeaders(accessToken),
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Event updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-upcoming-events"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message ||
          "Failed to update event."
      );
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const response = await apiClient.delete(CALENDAR_EVENT(eventId), {
        headers: buildAuthHeaders(accessToken),
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Event deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-upcoming-events"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message ||
          "Failed to delete event."
      );
    },
  });

  return {
    events: eventsQuery.data || [],
    eventsByDate,
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    refetch: eventsQuery.refetch,
    createEvent: createEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
    updateEvent: updateEventMutation.mutateAsync,
    isUpdating: updateEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutateAsync,
    isDeleting: deleteEventMutation.isPending,
  };
}

export function useUpcomingCalendarEvents() {
  const session = useAuthStore((state) => state.session);
  const accessToken = session?.accessToken;

  const eventsQuery = useQuery({
    queryKey: ["calendar-upcoming-events"],
    queryFn: async () => {
      const response = await apiClient.get(CALENDAR_UPCOMING_EVENTS, {
        headers: buildAuthHeaders(accessToken),
      });

      const rawEvents = Array.isArray(response.data)
        ? response.data
        : response.data?.events || response.data?.items || response.data?.data || [];

      return rawEvents.map(normalizeEvent);
    },
    enabled: Boolean(accessToken),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    refetch: eventsQuery.refetch,
  };
}
