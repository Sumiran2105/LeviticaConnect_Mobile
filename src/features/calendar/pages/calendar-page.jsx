import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  MoreVertical,
  Calendar as CalIcon,
  X,
  Check,
  LoaderCircle,
  Search,
  UserPlus,
  Edit3,
  Trash2,
  ExternalLink,
} from "lucide-react";

import { AdminLayout } from "@/layouts/admin-layout";
import { UserLayout } from "@/layouts/user-layout";
import { CALENDAR_EVENT, USERS_SEARCH } from "@/config/api";
import { COMPANY_PENDING_USERS } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import { useCalendarEvents, useUpcomingCalendarEvents } from "../hooks/use-calendar-events";
import { buildStandaloneMeetingRoomUrl, getMeetingVariantConfig } from "@/features/meetings/utils/meeting-utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = [
  { label: "Blue", value: "bg-blue-500" },
  { label: "Green", value: "bg-brand-primary" },
  { label: "Purple", value: "bg-purple-500" },
  { label: "Pink", value: "bg-pink-500" },
  { label: "Amber", value: "bg-amber-500" },
  { label: "Rose", value: "bg-rose-500" },
];

const DURATION_OPTIONS = [
  { label: "15 min", mins: 15 },
  { label: "30 min", mins: 30 },
  { label: "45 min", mins: 45 },
  { label: "1 hr", mins: 60 },
  { label: "1.5 hrs", mins: 90 },
  { label: "2 hrs", mins: 120 },
  { label: "3 hrs", mins: 180 },
];
function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function toDateInputValue(value) {
  if (!value) return "";
  let str = String(value).trim();
  if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += "Z";
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(value) {
  if (!value) return "";
  let str = String(value).trim();
  if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += "Z";
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateTime(value) {
  if (!value) return "";
  let str = String(value).trim();
  // If the datetime string has no timezone indicator, treat it as UTC
  if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += "Z";
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  const day = pad(d.getDate());
  const mon = SHORT_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const mins = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day} ${mon} ${year}, ${hours}:${mins} ${ampm}`;
}

function getDurationLabel(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "30 min";

  const mins = Math.max(15, Math.round((end - start) / 60000));
  const option = DURATION_OPTIONS.find((duration) => duration.mins === mins);
  if (option) return option.label;
  return mins < 60 ? `${mins} min` : `${mins / 60} hrs`;
}

const today = new Date();

const BLANK_FORM = {
  title: "",
  description: "",
  date: "",
  time: "",
  duration: "30 min",
  durationMins: 30,
  color: "bg-blue-500",
  participant_ids: [],
  participants: [],
};

function normalizeParticipantList(data) {
  if (Array.isArray(data)) return dedupeParticipants(data);
  if (Array.isArray(data?.users)) return dedupeParticipants(data.users);
  if (Array.isArray(data?.results)) return dedupeParticipants(data.results);
  if (Array.isArray(data?.data)) return dedupeParticipants(data.data);
  return [];
}

function getParticipantId(user) {
  return user?.user_id || user?.userId || user?.auth_user_id || user?.authUserId || user?.id || null;
}

function dedupeParticipants(participants = []) {
  const seen = new Set();
  const deduped = [];

  for (const participant of participants) {
    const id = getParticipantId(participant);
    if (!id || seen.has(String(id))) continue;

    seen.add(String(id));
    deduped.push({
      ...participant,
      id,
      name: getParticipantName(participant),
      email: participant?.email || "",
    });
  }

  return deduped;
}

function dedupeIds(ids = []) {
  return Array.from(new Set(ids.filter(Boolean).map(String)));
}

function dedupeStrings(values = []) {
  const seen = new Set();
  const deduped = [];

  for (const value of values) {
    const nextValue = String(value || "").trim();
    const key = nextValue.toLowerCase();
    if (!nextValue || seen.has(key)) continue;

    seen.add(key);
    deduped.push(nextValue);
  }

  return deduped;
}

function getParticipantName(user) {
  return user?.name || user?.full_name || user?.username || user?.email || "Unknown user";
}

function getParticipantSubtitle(user) {
  return user?.email || user?.role || "Workspace member";
}

function buildCalendarMeetingPath(event, layout, session) {
  const eventId = event?.id;
  const meetingUrl = event?.meeting_url;
  const rawUrl = String(meetingUrl || "").trim();

  if (!rawUrl) return "";

  try {
    const parsedUrl = new URL(rawUrl, window.location.origin);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const meetingIndex = pathParts.findIndex((part) => part === "meeting");

    if (meetingIndex >= 0 && pathParts[meetingIndex + 1]) {
      const rawRoomPart = pathParts[meetingIndex + 1];
      const [roomNameFromPath] = rawRoomPart.split("&token=");
      const roomName = roomNameFromPath || parsedUrl.searchParams.get("roomName") || "";

      if (roomName && eventId) {
        const { homePath } = getMeetingVariantConfig(layout);
        const roomSearch = new URLSearchParams({
          roomName,
          calendarEventId: eventId,
        });
        const roomPath = `${homePath}/${encodeURIComponent(roomName)}/room?${roomSearch.toString()}`;

        return buildStandaloneMeetingRoomUrl(roomPath, session);
      }
    }
  } catch {
    // Fall back to the original URL below.
  }

  return rawUrl;
}

export function SharedCalendarPage({ layout = "user" }) {
  const Layout = layout === "admin" ? AdminLayout : UserLayout;
  const {
    eventsByDate,
    isLoading,
    createEvent,
    isCreating,
    updateEvent,
    isUpdating,
    deleteEvent,
    isDeleting,
  } = useCalendarEvents();
  const { events: dashboardMeetings } = useUpcomingCalendarEvents();
  const session = useAuthStore((state) => state.session);

  const currentUserId = String(session?.userId || session?.user_id || session?.id || "");

  function canEditEvent(ev) {
    if (!ev || !currentUserId) return false;
    if (ev.is_host === true) return true;

    const hostId = String(
      ev.host_id ||
        ev.hostId ||
        ev.created_by ||
        ev.createdBy ||
        ev.creator_id ||
        ev.creatorId ||
        ev.user_id ||
        ev.userId ||
        ""
    );

    return Boolean(hostId) && hostId === currentUserId;
  }

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [errors, setErrors] = useState({});
  const [participantQuery, setParticipantQuery] = useState("");
  const [participantResults, setParticipantResults] = useState([]);
  const [isSearchingParticipants, setIsSearchingParticipants] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [isLoadingEventDetail, setIsLoadingEventDetail] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const participantSearchRef = useRef(null);
  const [pendingEmails, setPendingEmails] = useState(new Set());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const selectedKey = dateKey(year, month, selectedDay);
  const meetingsByDate = useMemo(() => {
    const grouped = {};

    for (const meeting of dashboardMeetings || []) {
      const date = new Date(meeting.start_time || meeting.scheduled_at);
      if (Number.isNaN(date.getTime())) continue;

      const key = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(meeting);
    }

    return grouped;
  }, [dashboardMeetings]);
  const selectedEvents = eventsByDate[selectedKey] || meetingsByDate[selectedKey] || [];
  const monthEvents = useMemo(() => {
    const prefix = `${year}-${pad(month + 1)}-`;
    return Object.entries(eventsByDate)
      .filter(([key]) => key.startsWith(prefix))
      .flatMap(([, items]) => items || []);
  }, [eventsByDate, month, year]);
  const selectedDate = new Date(year, month, selectedDay);
  const selectedDateLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const selectedParticipantIds = useMemo(
    () => new Set((form.participants || []).map((participant) => String(participant.id))),
    [form.participants]
  );

  const upcomingAll = useMemo(() => {
    return [...(dashboardMeetings || [])]
      .sort((a, b) => new Date(a.start_time || a.scheduled_at) - new Date(b.start_time || b.scheduled_at))
      .slice(0, 4);
  }, [dashboardMeetings]);


  function openModal() {
    const defaultDate = dateKey(year, month, selectedDay);
    setForm({ ...BLANK_FORM, date: defaultDate });
    setEditingEventId(null);
    setErrors({});
    setParticipantQuery("");
    setParticipantResults([]);
    setShowModal(true);
  }

  async function openEventDetails(event) {
    if (!event?.id || !session?.accessToken) return;

    setSelectedEvent(event);
    setEventDetail(null);
    setIsLoadingEventDetail(true);

    try {
      const response = await apiClient.get(CALENDAR_EVENT(event.id), {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      setEventDetail(response.data);
    } catch {
      setEventDetail(event);
    } finally {
      setIsLoadingEventDetail(false);
    }
  }

  function closeEventDetails() {
    setSelectedEvent(null);
    setEventDetail(null);
    setIsLoadingEventDetail(false);
  }

  function beginEditEvent() {
    const source = eventDetail || selectedEvent;
    if (!source) return;

    const duration = getDurationLabel(source.start_time, source.end_time);
    const participants = dedupeParticipants(source.participants || selectedEvent?.participants || []);
    const participantIds = dedupeIds(
      source.participant_ids ||
      participants.map((participant) => participant.id).filter(Boolean)
    );

    setForm({
      ...BLANK_FORM,
      title: source.title || "",
      description: source.description || "",
      date: toDateInputValue(source.start_time),
      time: toTimeInputValue(source.start_time),
      duration,
      durationMins: DURATION_OPTIONS.find((option) => option.label === duration)?.mins || 30,
      participant_ids: participantIds,
      participants,
    });
    setEditingEventId(source.id);
    setErrors({});
    setParticipantQuery("");
    setParticipantResults([]);
    setSelectedEvent(null);
    setEventDetail(null);
    setShowModal(true);
  }

  // Fetch pending users when modal opens so we can exclude them from search results
  useEffect(() => {
    if (!showModal || !session?.accessToken || layout !== "admin") return;

    async function fetchPendingUsers() {
      try {
        const response = await apiClient.get(COMPANY_PENDING_USERS, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        const raw = response.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.users)
            ? raw.users
            : Array.isArray(raw?.pending_users)
              ? raw.pending_users
              : Array.isArray(raw?.data)
                ? raw.data
                : [];
        setPendingEmails(
          new Set(list.map((u) => (u.email || "").toLowerCase()).filter(Boolean))
        );
      } catch {
        // If we can't fetch pending users, allow all results through
        setPendingEmails(new Set());
      }
    }

    fetchPendingUsers();
  }, [showModal, session?.accessToken, layout]);

  useEffect(() => {
    if (participantSearchRef.current) clearTimeout(participantSearchRef.current);

    const query = participantQuery.trim();
    if (!showModal || !query || !session?.accessToken) {
      setParticipantResults([]);
      setIsSearchingParticipants(false);
      return undefined;
    }

    setIsSearchingParticipants(true);
    participantSearchRef.current = setTimeout(async () => {
      try {
        const response = await apiClient.get(USERS_SEARCH, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          params: { query },
        });
        const results = normalizeParticipantList(response.data);
        const activeResults = results.filter((user) => {
          const email = (user.email || "").toLowerCase();
          // Exclude users whose email is in the pending list
          if (email && pendingEmails.has(email)) return false;
          // Also filter by status fields if available
          const status = String(user.status || user.account_status || "active").toLowerCase();
          if (status.includes("pending") || status.includes("invited") || status.includes("unverified")) return false;
          if (user.is_active === false || user.active === false) return false;
          return true;
        });
        setParticipantResults(activeResults);
      } catch {
        setParticipantResults([]);
      } finally {
        setIsSearchingParticipants(false);
      }
    }, 300);

    return () => clearTimeout(participantSearchRef.current);
  }, [participantQuery, session?.accessToken, showModal, pendingEmails]);

  function addParticipant(user) {
    const id = getParticipantId(user);
    if (!id || selectedParticipantIds.has(String(id))) return;

    const participant = {
      ...user,
      id,
      name: getParticipantName(user),
      email: user?.email || "",
    };

    setForm((current) => ({
      ...current,
      participants: [...(current.participants || []), participant],
      participant_ids: dedupeIds([...(current.participant_ids || []), id]),
    }));
    setParticipantQuery("");
    setParticipantResults([]);
  }

  function removeParticipant(participantId) {
    setForm((current) => ({
      ...current,
      participants: (current.participants || []).filter(
        (participant) => String(participant.id) !== String(participantId)
      ),
      participant_ids: (current.participant_ids || []).filter(
        (id) => String(id) !== String(participantId)
      ),
    }));
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.date) e.date = "Date is required";
    if (!form.time) e.time = "Time is required";

    if (form.date && form.time) {
      const startTime = new Date(`${form.date}T${form.time}:00`);
      if (startTime < new Date()) {
        e.time = "Event time cannot be in the past";
      }
    }

    if (
      (!form.participant_ids || form.participant_ids.length === 0) &&
      (!form.participants || form.participants.length === 0)
    ) {
      e.participants = "Please select at least one participant";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function saveEvent() {
    if (!validate()) return;

    const startTime = new Date(`${form.date}T${form.time}:00`);
    const durationEntry = DURATION_OPTIONS.find(d => d.label === form.duration);
    const mins = durationEntry ? durationEntry.mins : 30;
    const endTime = new Date(startTime.getTime() + mins * 60000);

    const selectedParticipantNames = dedupeStrings(
      (form.participants || []).map((participant) => getParticipantName(participant))
    );
    const selectedParticipantIds = form.participants?.length
      ? (form.participants || []).map((participant) => getParticipantId(participant))
      : form.participant_ids;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || "",
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      participant_ids: dedupeIds(Array.isArray(selectedParticipantIds) ? selectedParticipantIds : []),
      participant_names: selectedParticipantNames,
    };

    try {
      if (editingEventId) {
        await updateEvent({ eventId: editingEventId, eventData: payload });
      } else {
        await createEvent(payload);
      }

      const [y, m, d] = form.date.split("-").map(Number);
      setYear(y); setMonth(m - 1); setSelectedDay(d);
      setShowModal(false);
      setEditingEventId(null);
    } catch (error) {
      void error;
    }
  }

  async function handleDeleteEvent() {
    const eventId = (eventDetail || selectedEvent)?.id;
    if (!eventId) return;

    try {
      await deleteEvent(eventId);
      closeEventDetails();
    } catch (error) {
      void error;
    }
  }

  function openMeetingLink(event) {
    const nextPath = buildCalendarMeetingPath(event, layout, session);

    if (!nextPath) return;

    window.open(nextPath, "_blank", "width=1280,height=720,noopener,noreferrer");
  }

  return (
    <Layout
      contentClassName="!p-0 h-full overflow-hidden"
      contentInnerClassName="!m-0 h-full !w-full !max-w-none"
      showFloatingActions={false}
    >

      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[90dvh] overflow-y-auto [scrollbar-width:thin] bg-white rounded-[28px] shadow-2xl border border-brand-line p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-brand-ink">{editingEventId ? "Edit Event" : "New Event"}</h3>
                <p className="text-xs text-brand-secondary mt-0.5">
                  {editingEventId ? "Update the event details below" : "Fill in the details below"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEventId(null);
                }}
                className="size-8 flex items-center justify-center rounded-xl bg-brand-neutral hover:bg-brand-soft text-brand-secondary hover:text-brand-ink transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">

              <div>
                <label className="block text-xs font-bold  tracking-widest text-brand-secondary mb-1.5">Event Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Team Standup"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-brand-ink focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all ${errors.title ? "border-red-400 bg-red-50" : "border-brand-line bg-brand-neutral/40"}`}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>


              <div>
                <label className="block text-xs font-bold  tracking-widest text-brand-secondary mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Add a description..."
                  rows={2}
                  className="w-full rounded-xl border border-brand-line bg-brand-neutral/40 px-4 py-2.5 text-sm text-brand-ink focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all resize-none"
                />
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold  tracking-widest text-brand-secondary mb-1.5">Date *</label>
                  <input
                    type="date"
                    min={toDateInputValue(new Date())}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-brand-ink focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all ${errors.date ? "border-red-400 bg-red-50" : "border-brand-line bg-brand-neutral/40"}`}
                  />
                  {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold  tracking-widest text-brand-secondary mb-1.5">Time *</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-brand-ink focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all ${errors.time ? "border-red-400 bg-red-50" : "border-brand-line bg-brand-neutral/40"}`}
                  />
                  {errors.time && <p className="text-xs text-red-500 mt-1">{errors.time}</p>}
                </div>
              </div>


              <div>
                <label className="block text-xs font-bold  tracking-widest text-brand-secondary mb-1.5">Duration</label>
                <select
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full rounded-xl border border-brand-line bg-brand-neutral/40 px-3 py-2.5 text-sm text-brand-ink focus:ring-2 focus:ring-brand-primary/20 focus:outline-none"
                >
                  {DURATION_OPTIONS.map(d => (
                    <option key={d.label} value={d.label}>{d.label}</option>
                  ))}
                </select>
              </div>


              <div>
                <label className="block text-xs font-bold  tracking-widest text-brand-secondary mb-1.5">
                  Participants
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-secondary/50" />
                  <input
                    type="text"
                    value={participantQuery}
                    onChange={e => setParticipantQuery(e.target.value)}
                    placeholder="Search participants by name..."
                    className={`w-full rounded-xl border px-4 py-2.5 pl-9 text-sm text-brand-ink focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all ${errors.participants ? "border-red-400 bg-red-50" : "border-brand-line bg-brand-neutral/40"}`}
                  />

                  {(participantQuery.trim() || isSearchingParticipants) && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-48 overflow-y-auto rounded-2xl border border-brand-line bg-white p-2 shadow-xl [scrollbar-width:thin]">
                      {isSearchingParticipants ? (
                        <div className="flex items-center gap-2 px-3 py-3 text-sm text-brand-secondary">
                          <LoaderCircle className="size-4 animate-spin" />
                          Searching participants...
                        </div>
                      ) : participantResults.length ? (
                        participantResults.map((user) => {
                          const id = getParticipantId(user);
                          if (!id) return null;
                          const isSelected = selectedParticipantIds.has(String(id));

                          return (
                            <button
                              key={id}
                              type="button"
                              disabled={isSelected}
                              onClick={() => addParticipant(user)}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-xs font-bold text-brand-primary">
                                {(user?.initials || getParticipantName(user).slice(0, 2)).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-brand-ink">
                                  {getParticipantName(user)}
                                </p>
                                <p className="truncate text-xs text-brand-secondary">
                                  {isSelected ? "Already added" : getParticipantSubtitle(user)}
                                </p>
                              </div>
                              {!isSelected ? <UserPlus className="size-4 text-brand-primary" /> : <Check className="size-4 text-emerald-500" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-3 text-sm text-brand-secondary">No participants found.</div>
                      )}
                    </div>
                  )}
                </div>

                {form.participants.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.participants.map((participant) => (
                      <span
                        key={participant.id}
                        className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-sm"
                      >
                        {getParticipantName(participant)}
                        <button
                          type="button"
                          onClick={() => removeParticipant(participant.id)}
                          className="rounded-full text-brand-secondary transition hover:bg-brand-soft hover:text-brand-ink"
                          aria-label={`Remove ${getParticipantName(participant)}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-brand-secondary">
                    Selected users will receive the meeting details in their calendar.
                  </p>
                )}
                {errors.participants && <p className="text-xs text-red-500 mt-1">{errors.participants}</p>}
              </div>


              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-secondary mb-1.5">Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      className={`size-8 rounded-full flex items-center justify-center ${c.value} transition-transform hover:scale-110 ${form.color === c.value ? "ring-2 ring-offset-2 ring-brand-ink/30 scale-110" : ""}`}
                    >
                      {form.color === c.value && <Check className="size-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>


            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEventId(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-brand-line bg-brand-neutral text-brand-ink text-sm font-semibold hover:bg-brand-soft transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEvent}
                disabled={isCreating || isUpdating}
                className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-md shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating || isUpdating ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {isCreating || isUpdating ? "Saving..." : editingEventId ? "Update Event" : "Save Event"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedEvent && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm" onClick={closeEventDetails} />
          <div className="relative z-10 w-full max-w-lg max-h-[90dvh] overflow-y-auto [scrollbar-width:thin] rounded-[28px] border border-brand-line bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold  tracking-widest text-brand-secondary">Event details</p>
                <h3 className="mt-2 text-xl font-bold text-brand-ink">
                  {(eventDetail || selectedEvent).title || "Untitled Event"}
                </h3>
              </div>
              <button onClick={closeEventDetails} className="flex size-8 items-center justify-center rounded-xl bg-brand-neutral text-brand-secondary transition-colors hover:bg-brand-soft hover:text-brand-ink">
                <X className="size-4" />
              </button>
            </div>

            {isLoadingEventDetail ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-brand-secondary">
                <LoaderCircle className="size-5 animate-spin text-brand-primary" />
                Loading event details...
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-brand-line bg-brand-neutral/40 p-4">
                    <p className="text-xs font-bold  tracking-widest text-brand-secondary">Description</p>
                    <p className="mt-2 text-sm leading-6 text-brand-ink">
                      {(eventDetail || selectedEvent).description || "No description added."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-brand-line bg-white p-4">
                      <p className="text-xs font-bold  tracking-widest text-brand-secondary">Start</p>
                      <p className="mt-2 text-sm font-semibold text-brand-ink">
                        {formatDateTime((eventDetail || selectedEvent).start_time)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-brand-line bg-white p-4">
                      <p className="text-xs font-bold  tracking-widest text-brand-secondary">End</p>
                      <p className="mt-2 text-sm font-semibold text-brand-ink">
                        {formatDateTime((eventDetail || selectedEvent).end_time)}
                      </p>
                    </div>
                  </div>

                  {(eventDetail || selectedEvent).meeting_url ? (
                    <button
                      type="button"
                      onClick={() => openMeetingLink(eventDetail || selectedEvent)}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-brand-line bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-primary transition hover:border-brand-primary/30"
                    >
                      <span className="truncate">Open meeting link</span>
                      <ExternalLink className="size-4 shrink-0" />
                    </button>
                  ) : null}

                  {(eventDetail || selectedEvent).participants?.length ? (
                    <div>
                      <p className="mb-2 text-xs font-bold  tracking-widest text-brand-secondary">
                        Participants
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(eventDetail || selectedEvent).participants.map((participant) => (
                          <span
                            key={participant.id || participant.email || participant.name}
                            className="rounded-full border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink"
                          >
                            {getParticipantName(participant)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {canEditEvent(eventDetail || selectedEvent) && (
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteEvent}
                      disabled={isDeleting}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      {isDeleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={beginEditEvent}
                      disabled={new Date((eventDetail || selectedEvent).end_time) < new Date()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-primary/20 transition hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={new Date((eventDetail || selectedEvent).end_time) < new Date() ? "Cannot edit an expired event" : ""}
                    >
                      <Edit3 className="size-4" />
                      Edit Event
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}


      <div className="flex h-full min-h-0 w-full md:overflow-hidden overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
        <div className="flex h-fit w-full flex-col gap-6 pb-10 md:h-full md:flex-row md:pb-0">


          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-[24px] border border-brand-line bg-white p-3 shadow-sm sm:p-5">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-secondary/70">
                  {monthEvents.length} meeting{monthEvents.length !== 1 ? "s" : ""} this month
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-ink">
                  {MONTHS[month]} <span className="text-brand-secondary font-semibold">{year}</span>
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()); }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-brand-soft text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                >Today</button>
                <button onClick={prevMonth} className="size-8 flex items-center justify-center rounded-xl bg-brand-neutral hover:bg-brand-soft text-brand-secondary hover:text-brand-primary transition-colors">
                  <ChevronLeft className="size-4" />
                </button>
                <button onClick={nextMonth} className="size-8 flex items-center justify-center rounded-xl bg-brand-neutral hover:bg-brand-soft text-brand-secondary hover:text-brand-primary transition-colors">
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>


            <div className="grid grid-cols-7 rounded-2xl bg-brand-neutral/60 px-1 py-2 text-center">
              {DAYS.map(d => (
                <div key={d} className={`text-[10px] font-bold uppercase tracking-widest ${d === "Sun" || d === "Sat" ? "text-brand-secondary/40" : "text-brand-secondary"}`}>
                  {d}
                </div>
              ))}
            </div>


            <div className="grid min-h-0 flex-1 grid-cols-7 gap-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {isLoading ? (
                <div className="col-span-7 flex items-center justify-center py-20">
                  <LoaderCircle className="size-6 animate-spin text-brand-primary" />
                </div>
              ) : (
                cells.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} />;
                  const key = dateKey(year, month, day);
                  const evs = eventsByDate[key] || [];
                  const isSel = day === selectedDay;
                  const isTod = isToday(day);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`group relative flex min-h-[58px] flex-col items-start gap-1 overflow-hidden rounded-2xl border px-2 py-2 text-left transition-all duration-150 sm:min-h-[78px] xl:min-h-[104px] ${isSel ? "border-brand-primary bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                        : isTod ? "border-brand-primary/30 bg-brand-soft"
                          : "border-brand-line/60 bg-white hover:border-brand-primary/30 hover:bg-brand-soft/50"
                        }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className={`flex size-7 items-center justify-center rounded-full text-xs font-black ${isSel ? "bg-white/20 text-white" : isTod ? "bg-brand-primary text-white" : "text-brand-ink"}`}>
                          {day}
                        </span>
                        {evs.length > 0 ? (
                          <span className={`hidden rounded-full px-1.5 py-0.5 text-[10px] font-bold sm:inline-flex ${isSel ? "bg-white/20 text-white" : "bg-brand-neutral text-brand-secondary"}`}>
                            {evs.length}
                          </span>
                        ) : null}
                      </div>

                      {evs.length > 0 ? (
                        <>
                          <div className="mt-auto flex flex-wrap justify-center gap-0.5 sm:hidden">
                            {evs.slice(0, 3).map(ev => (
                              <span key={ev.id} className={`size-1.5 rounded-full ${isSel ? "bg-white/70" : ev.color}`} />
                            ))}
                          </div>
                          <div className="hidden w-full space-y-1 sm:block">
                            {evs.slice(0, 2).map(ev => (
                              <span
                                key={ev.id}
                                className={`block truncate rounded-lg px-2 py-1 text-[11px] font-semibold ${isSel ? "bg-white/15 text-white" : "bg-brand-neutral/80 text-brand-ink group-hover:bg-white"}`}
                              >
                                <span className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${isSel ? "bg-white/70" : ev.color}`} />
                                {ev.time} {ev.title}
                              </span>
                            ))}
                            {evs.length > 2 ? (
                              <span className={`block px-2 text-[10px] font-bold ${isSel ? "text-white/75" : "text-brand-secondary"}`}>
                                +{evs.length - 2} more
                              </span>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div className="mt-auto hidden h-6 w-full rounded-lg bg-brand-neutral/40 opacity-0 transition-opacity group-hover:opacity-100 xl:block" />
                      )}
                      {evs.length > 0 && (
                        <div className="sr-only">
                          {evs.slice(0, 3).map(ev => (
                            <span key={ev.id}>{ev.title}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>


          <aside className="flex w-full shrink-0 flex-col gap-3 md:h-full md:w-80 md:overflow-hidden">

            <button
              onClick={openModal}
              className="flex h-12 shrink-0 w-full items-center justify-center gap-2 rounded-2xl bg-brand-primary text-sm font-bold text-white shadow-lg shadow-brand-primary/25 transition-all hover:bg-brand-primary/90 active:scale-95"
            >
              <Plus className="size-4" /> New Event
            </button>


            <div className="flex min-h-[340px] flex-1 basis-0 flex-col overflow-hidden rounded-[22px] border border-brand-line bg-white p-4 shadow-sm md:min-h-0">
              <div className="mb-4 flex items-center gap-3 border-b border-brand-line/60 pb-4">
                <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-primary/10">
                  <CalIcon className="size-4 text-brand-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                    Selected day
                  </p>
                  <p className="truncate text-lg font-black leading-tight text-brand-ink">{selectedDateLabel}</p>
                </div>
              </div>

              {selectedEvents.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-brand-line bg-brand-neutral/30 px-4 py-8 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <CalIcon className="size-4 text-brand-secondary/40" />
                  </div>
                  <p className="text-sm font-bold text-brand-ink">No meetings planned</p>
                  <p className="mt-1 max-w-44 text-xs leading-5 text-brand-secondary">
                    Create one for this date and invite your team.
                  </p>
                  <button onClick={openModal} className="mt-3 text-xs font-bold text-brand-primary hover:underline">
                    + Add event
                  </button>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <p className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-brand-secondary/60">
                    {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {selectedEvents.map(ev => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => openEventDetails(ev)}
                        className="group w-full cursor-pointer rounded-2xl border border-brand-line bg-white p-3 text-left shadow-sm transition-all hover:border-brand-primary/30 hover:shadow-md"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-1 size-2.5 shrink-0 rounded-full ${ev.color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-brand-ink group-hover:text-brand-primary">{ev.title}</p>
                            {ev.description && (
                              <p className="text-[11px] text-brand-secondary mt-0.5 truncate">{ev.description}</p>
                            )}
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-1.5 text-[11px] text-brand-secondary">
                                <Clock className="size-3 shrink-0" />
                                {ev.time} · {ev.duration}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-brand-secondary">
                                <Users className="size-3 shrink-0" />{ev.attendees} participant{ev.attendees !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <span className="rounded-lg p-0.5 text-brand-secondary opacity-0 group-hover:text-brand-primary group-hover:opacity-100">
                            <MoreVertical className="size-3.5" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>


            <div className="flex min-h-[260px] flex-1 basis-0 flex-col overflow-hidden rounded-[22px] border border-brand-line bg-white p-4 shadow-sm md:min-h-0">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary/60">Upcoming</p>
                <span className="rounded-full bg-brand-neutral px-2 py-1 text-[10px] font-bold text-brand-secondary">
                  {upcomingAll.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {upcomingAll.length === 0 ? (
                  <p className="rounded-2xl bg-brand-neutral/50 px-3 py-4 text-xs text-brand-secondary">No upcoming events</p>
                ) : (
                  upcomingAll.map(ev => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openEventDetails(ev)}
                      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-brand-soft"
                    >
                      <div className={`size-2 shrink-0 rounded-full ${ev.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-brand-ink group-hover:text-brand-primary">{ev.title}</p>
                        <p className="text-[10px] text-brand-secondary">{ev.time}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
