import { useEffect, useState } from "react";
import {
  Calendar,
  Copy,
  Hash,
  Link2,
  LoaderCircle,
  Phone,
  Plus,
  Video,
  X,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/layouts/admin-layout";
import { UserLayout } from "@/layouts/user-layout";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { useAuthStore } from "@/store/auth-store";
import {
  CHANNEL_MEMBERS,
  CHANNELS_LIST,
  CHANNELS_MY_CHANNELS,
  CALENDAR_CREATE_EVENT,
  COMPANY_USERS,
  MEETING_DETAILS,
  MEETING_JOIN_BY_LINK,
  CALLS_HISTORY,
} from "@/config/api";
import { isDirectChannel } from "@/features/teams/utils/team-utils";
import {
  buildMeetingRoomPath,
  buildStandaloneMeetingRoomUrl,
  extractInviteToken,
  getMeetingVariantConfig,
  normalizeMeetingRecord,
  toLocalDateTimeValue,
} from "../utils/meeting-utils";
import { useMeetingLauncher } from "../hooks/use-meeting-launcher";


function buildAuthHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function addMinutes(date, minutes) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}

function getArrayPayload(payload, keys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
}

function getSelectableId(record) {
  return record?.id || record?.channel_id || record?.team_id || record?.uuid || "";
}

function getParticipantId(record) {
  return (
    record?.user_id ||
    record?.userId ||
    record?.auth_user_id ||
    record?.authUserId ||
    record?.user?.id ||
    record?.participant?.id ||
    record?.id ||
    ""
  );
}

function getSelectableName(record, fallback = "Untitled") {
  return (
    record?.name ||
    record?.channel_name ||
    record?.department_name ||
    record?.team_name ||
    record?.full_name ||
    record?.email ||
    fallback
  );
}

function dedupeParticipantsByName(participants = []) {
  const seen = new Set();
  const deduped = [];

  for (const participant of participants) {
    const name = getSelectableName(participant, "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push({
      ...participant,
      name,
      full_name: participant?.full_name || name,
      id: getParticipantId(participant) || name,
    });
  }

  return deduped.sort((a, b) =>
    getSelectableName(a, "").localeCompare(getSelectableName(b, ""))
  );
}

function getValidDate(value) {
  const date = value ? new Date(value) : new Date();

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDateTimeLabel(value) {
  return formatISTDateTime(value || Date.now(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }, "");
}

function updateDateTime(value, updater) {
  const nextDate = getValidDate(value);
  updater(nextDate);
  return toLocalDateTimeValue(nextDate);
}

function DateTimeField({ value, onChange, label }) {
  const selectedDate = getValidDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = visibleMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const days = Array.from({ length: firstDayIndex + daysInMonth }, (_, index) =>
    index < firstDayIndex ? null : index - firstDayIndex + 1
  );
  const selectedHour24 = selectedDate.getHours();
  const selectedMinute = selectedDate.getMinutes();
  const selectedPeriod = selectedHour24 >= 12 ? "PM" : "AM";
  const selectedHour12 = selectedHour24 % 12 || 12;

  function handleDaySelect(day) {
    if (!day) {
      return;
    }

    onChange(
      updateDateTime(value, (date) => {
        date.setFullYear(year, month, day);
      })
    );
  }

  function handleHourChange(hour) {
    onChange(
      updateDateTime(value, (date) => {
        const normalizedHour = selectedPeriod === "PM" ? (hour % 12) + 12 : hour % 12;
        date.setHours(normalizedHour);
      })
    );
  }

  function handleMinuteChange(minute) {
    onChange(
      updateDateTime(value, (date) => {
        date.setMinutes(minute);
      })
    );
  }

  function handlePeriodChange(period) {
    onChange(
      updateDateTime(value, (date) => {
        const hour = date.getHours();
        if (period === "PM" && hour < 12) {
          date.setHours(hour + 12);
        }
        if (period === "AM" && hour >= 12) {
          date.setHours(hour - 12);
        }
      })
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
        <Calendar className="size-3.5" />
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 outline-none transition-all hover:border-brand-primary/60 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
        >
          <span>{formatDateTimeLabel(value)}</span>
          <Calendar className="size-4 text-slate-500" />
        </button>
        {isOpen ? (
          <div className="mt-2 w-full max-w-[360px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {"<"}
              </button>
              <p className="text-xs font-extrabold text-slate-800">{monthLabel}</p>
              <button
                type="button"
                onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {">"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1.5">
              {days.map((day, index) => {
                const isSelected =
                  day &&
                  selectedDate.getFullYear() === year &&
                  selectedDate.getMonth() === month &&
                  selectedDate.getDate() === day;

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const cellDate = day ? new Date(year, month, day) : null;
                const isPast = day && cellDate < today;

                return (
                  <button
                    key={`${day || "blank"}-${index}`}
                    type="button"
                    onClick={() => handleDaySelect(day)}
                    disabled={!day || isPast}
                    className={`flex h-9 items-center justify-center rounded-lg text-xs font-bold transition-colors ${!day
                        ? "cursor-default opacity-0"
                        : isPast
                          ? "cursor-not-allowed text-slate-300"
                          : isSelected
                            ? "bg-brand-primary text-white shadow-sm"
                            : "text-slate-700 hover:bg-brand-primary/10 hover:text-brand-primary"
                      }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  Time
                </p>
                <p className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-slate-800 shadow-sm">
                  {String(selectedHour12).padStart(2, "0")}:
                  {String(selectedMinute).padStart(2, "0")} {selectedPeriod}
                </p>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Hour
                  </span>
                  <select
                    value={selectedHour12}
                    onChange={(event) => handleHourChange(Number(event.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Minute
                  </span>
                  <select
                    value={selectedMinute}
                    onChange={(event) => handleMinuteChange(Number(event.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  >
                    {[0, 15, 30, 45].map((minute) => (
                      <option key={minute} value={minute}>
                        {String(minute).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    AM/PM
                  </span>
                  <div className="grid h-10 grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {["AM", "PM"].map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => handlePeriodChange(period)}
                        className={`px-3 text-xs font-extrabold transition-colors ${period === selectedPeriod
                            ? "bg-brand-primary text-white"
                            : "text-slate-500 hover:bg-slate-50"
                          }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {[0, 15, 30, 45].map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => handleMinuteChange(minute)}
                    className={`rounded-full px-3 py-1 text-[10px] font-bold transition-colors ${minute === selectedMinute
                        ? "bg-brand-primary text-white"
                        : "bg-white text-slate-500 hover:bg-brand-primary/10 hover:text-brand-primary"
                      }`}
                  >
                    :{String(minute).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  onChange(toLocalDateTimeValue(now));
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/10"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Avatar({ name, size = "size-12" }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    "bg-gradient-to-tr from-pink-400 to-rose-500",
    "bg-gradient-to-tr from-sky-400 to-indigo-500",
    "bg-gradient-to-tr from-emerald-400 to-teal-500",
    "bg-gradient-to-tr from-amber-400 to-orange-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full ${color} text-sm font-bold text-white shadow-sm`}
    >
      {initials}
    </div>
  );
}

function formatCallData(call) {

  const meetingData = call.meeting || call;
  const callerData = call.caller || {};
  const receiverData = call.receiver || {};
  let direction = (call.direction || "unknown").toString().toLowerCase().trim();

  const title = meetingData.title || meetingData.meeting_title || "";
  const isMissed = meetingData.is_missed || false;
  const status = meetingData.status || meetingData.call_status || "unknown";
  const duration = meetingData.duration || meetingData.call_duration || null;
  const callType = (meetingData.call_type || meetingData.type || "audio").toString().toLowerCase();

  const callerName = callerData.name || callerData.full_name || callerData.participant_name || "";
  const receiverName = receiverData.name || receiverData.full_name || receiverData.participant_name || "";

  let displayName = "Unknown";

  if (title.toLowerCase().includes("direct")) {

    if (direction === "incoming") {

      displayName = callerName || "Unknown caller";
    } else if (direction === "outgoing") {

      displayName = receiverName || "Unknown receiver";
    } else {

      displayName = callerName || receiverName || "Unknown";
    }
  } else {

    displayName = title || "Group Call";
  }


  let date = "";
  if (meetingData.created_at || meetingData.timestamp || call.date) {
    const callDate = new Date(meetingData.created_at || meetingData.timestamp || call.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (callDate.toDateString() === today.toDateString()) {
      date = "Today";
    } else if (callDate.toDateString() === yesterday.toDateString()) {
      date = "Yesterday";
    } else {
      date = callDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  }


  let displayStatus = "answered";

  if (isMissed || status === "missed") {
    displayStatus = "missed";
  } else if (status === "no_answer" || status === "no answer") {
    displayStatus = "no answer";
  } else if (status === "answered" || status === "active") {
    displayStatus = "answered";
  }

  return {
    id: call.id || call.call_id || meetingData.id || Math.random(),
    name: displayName,
    duration: duration ? String(duration) : null,
    date,
    status: displayStatus,
    direction: direction,
    isMissed: isMissed,
    title: title,
    callerName,
    receiverName,
    callType,
  };
}

function getInitialFormState(mode = "instant") {
  const scheduledAt = new Date();

  const remainder = scheduledAt.getMinutes() % 15;
  if (remainder !== 0) {
    scheduledAt.setMinutes(scheduledAt.getMinutes() + (15 - remainder));
  }
  scheduledAt.setSeconds(0);
  scheduledAt.setMilliseconds(0);

  if (mode === "scheduled") {
    scheduledAt.setMinutes(scheduledAt.getMinutes() + 30);
  }

  const endAt = addMinutes(scheduledAt, 30);

  return {
    title: "",
    description: "",
    participant_name_input: "",
    participant_ids: [],
    participant_names: [],
    meeting_type: "public",
    channel_id: "",
    scheduled_at: toLocalDateTimeValue(scheduledAt),
    end_time: toLocalDateTimeValue(endAt),
  };
}

export function SharedMeetPage({ layout = "user" }) {
  const session = useAuthStore((state) => state.session);
  const { openMeetingRoom } = useMeetingLauncher(layout);
  const accessToken = session?.accessToken;
  const [joinValue, setJoinValue] = useState("");
  const [channels, setChannels] = useState([]);
  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState("instant");
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isParticipantPickerOpen, setIsParticipantPickerOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [isChannelPickerOpen, setIsChannelPickerOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(() => getInitialFormState());
  const [callHistory, setCallHistory] = useState([]);
  const [isLoadingCallHistory, setIsLoadingCallHistory] = useState(false);
  const [isCallHistoryModalOpen, setIsCallHistoryModalOpen] = useState(false);
  const hasCreatedMeetingAccess = Boolean(
    createdMeeting?.displayValue || createdMeeting?.joinLink || createdMeeting?.id
  );
  const Layout = layout === "admin" ? AdminLayout : UserLayout;
  const { intro, title } = getMeetingVariantConfig(layout);

  function getCreatedMeetingDisplayValue(meeting = createdMeeting) {
    return meeting?.displayValue || meeting?.id || meeting?.joinLink || "";
  }

  function buildExternalRoomUrl(meeting, options = {}) {
    if (!meeting?.id || !meeting?.connectionDetails?.token) {
      return "";
    }

    const { includeLaunchSession = true } = options;
    const basePath = buildMeetingRoomPath(layout, meeting.id, "video", false, {
      displayName: meeting.title,
    });
    const standalonePath = includeLaunchSession
      ? buildStandaloneMeetingRoomUrl(basePath, session)
      : `${basePath}${basePath.includes("?") ? "&" : "?"}standalone=true`;
    const url = new URL(standalonePath, window.location.origin);

    url.searchParams.set("externalRoom", "true");
    url.searchParams.set("token", meeting.connectionDetails.token);

    if (meeting.connectionDetails.serverUrl) {
      url.searchParams.set("livekitUrl", meeting.connectionDetails.serverUrl);
    }

    if (meeting.connectionDetails.roomName) {
      url.searchParams.set("roomName", meeting.connectionDetails.roomName);
    }

    return `${url.pathname}${url.search}${url.hash}`;
  }

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;

    async function fetchCallHistory() {
      try {
        setIsLoadingCallHistory(true);
        const response = await apiClient.get(CALLS_HISTORY, {
          headers: buildAuthHeaders(accessToken),
        });

        if (!isMounted) {
          return;
        }

        const callsData = Array.isArray(response.data)
          ? response.data
          : response.data?.calls || response.data?.items || response.data?.data || [];

        setCallHistory(callsData);
      } catch (error) {
        if (isMounted) {
          console.error("Failed to load call history:", error);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCallHistory(false);
        }
      }
    }

    fetchCallHistory();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!isCreateOpen || !accessToken) {
      return;
    }

    let isMounted = true;

    async function fetchModalOptions() {
      try {
        const headers = buildAuthHeaders(accessToken);

        if (createMode === "instant") {
          setIsLoadingParticipants(true);
          let userData = [];

          if (layout === "admin") {
            const response = await apiClient.get(COMPANY_USERS, {
              headers,
              suppressGlobalErrorReport: true,
            });
            userData = getArrayPayload(response.data, ["users", "items", "results", "data"]);
          } else {
            const channelsResponse = await apiClient.get(CHANNELS_MY_CHANNELS, {
              headers,
              suppressGlobalErrorReport: true,
            });
            const joinedChannels = getArrayPayload(channelsResponse.data, ["channels", "items", "data"]);
            const memberResponses = await Promise.allSettled(
              joinedChannels
                .map((channel) => getSelectableId(channel))
                .filter(Boolean)
                .map((channelId) =>
                  apiClient.get(CHANNEL_MEMBERS(channelId), {
                    headers,
                    suppressGlobalErrorReport: true,
                  })
                )
            );

            userData = memberResponses.flatMap((response) =>
              response.status === "fulfilled"
                ? getArrayPayload(response.value.data, ["members", "items", "users", "data"])
                : []
            );
          }

          if (!isMounted) {
            return;
          }

          setParticipants(dedupeParticipantsByName(userData));
          return;
        }

        setIsLoadingChannels(true);
        const channelsEndpoint = layout === "admin" ? CHANNELS_LIST : CHANNELS_MY_CHANNELS;
        const channelsResponse = await apiClient.get(channelsEndpoint, {
          headers,
          suppressGlobalErrorReport: true,
        });
        const rawChannels = getArrayPayload(channelsResponse.data, ["channels", "items", "data"]);
        const workspaceChannels = rawChannels.filter(
          (channel) => channel && !isDirectChannel(channel)
        );
        const channelOptions = workspaceChannels.map((channel) => ({
          ...channel,
          id: getSelectableId(channel),
          name: getSelectableName(channel, "Untitled channel"),
        }));
        const meetingOptions = channelOptions.filter((option) =>
          getSelectableId(option)
        );

        if (!isMounted) {
          return;
        }

        setChannels(meetingOptions);
        setFormData((current) => ({
          ...current,
          channel_id: current.channel_id || getSelectableId(meetingOptions[0]) || "",
        }));
      } catch {
        if (isMounted) {
          toast.error(
            createMode === "instant"
              ? "Unable to load participants for meeting creation."
              : "Unable to load channels for meeting scheduling."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingChannels(false);
          setIsLoadingParticipants(false);
        }
      }
    }

    fetchModalOptions();

    return () => {
      isMounted = false;
    };
  }, [accessToken, createMode, isCreateOpen, layout]);

  function openCreateModal(mode) {
    setCreateMode(mode);
    setFormData(getInitialFormState(mode));
    setParticipantSearch("");
    setChannelSearch("");
    setIsParticipantPickerOpen(false);
    setIsChannelPickerOpen(false);
    setErrors({});
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    setIsParticipantPickerOpen(false);
    setIsChannelPickerOpen(false);
    setIsCreateOpen(false);
  }

  async function resolveMeetingTarget(rawValue) {
    const trimmed = rawValue.trim();
    const headers = buildAuthHeaders(accessToken);

    if (!trimmed) {
      throw new Error("Enter a meeting ID or invite link.");
    }

    const inviteToken = extractInviteToken(trimmed);
    const looksLikeLink = trimmed.includes("://") || trimmed.includes("/join/");

    if (!looksLikeLink) {
      try {
        const detailsResponse = await apiClient.get(MEETING_DETAILS(trimmed), {
          headers,
        });
        const meeting = normalizeMeetingRecord(detailsResponse.data, trimmed);

        if (meeting.id) {
          return meeting;
        }
      } catch (error) {
        if (!inviteToken) {
          throw error;
        }
      }
    }

    const joinLinkResponse = await apiClient.get(MEETING_JOIN_BY_LINK(inviteToken), {
      headers,
    });
    const meeting = normalizeMeetingRecord(joinLinkResponse.data, trimmed);

    if (!meeting.id) {
      throw new Error("The invite link did not return a meeting ID.");
    }

    return meeting;
  }

  async function handleJoinMeeting(rawValue = joinValue) {
    if (!accessToken) {
      toast.error("Please sign in again to join a meeting.");
      return;
    }

    try {
      setIsJoining(true);
      const meeting = await resolveMeetingTarget(rawValue);

      openMeetingRoom(meeting);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Unable to find that meeting."
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function handleCreateMeeting() {
    if (!accessToken) {
      toast.error("Please sign in again to create a meeting.");
      return;
    }

    const title = formData.title.trim();
    const newErrors = {};
    if (!title) {
      newErrors.title = "Meeting title is required";
    }
    if (createMode === "scheduled" && !formData.channel_id) {
      newErrors.channel = "Select a channel to schedule this meeting";
    }
    if (createMode === "instant" && (!formData.participant_names || formData.participant_names.length === 0)) {
      newErrors.participants = "Please select at least one participant";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      setIsSubmitting(true);

      const rawStartDate = formData.scheduled_at ? new Date(formData.scheduled_at) : new Date();
      const startDate = Number.isNaN(rawStartDate.getTime()) ? new Date() : rawStartDate;
      const rawEndDate = formData.end_time ? new Date(formData.end_time) : addMinutes(startDate, 30);
      const endDate =
        Number.isNaN(rawEndDate.getTime()) || rawEndDate <= startDate
          ? addMinutes(startDate, 30)
          : rawEndDate;
      const payload = {
        title,
        description: formData.description.trim() || "",
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        participant_ids: createMode === "instant"
          ? Array.from(new Set((formData.participant_ids || []).filter(Boolean).map(String)))
          : [],
        participant_names: createMode === "instant"
          ? Array.from(new Set((formData.participant_names || []).filter(Boolean)))
          : [],
        channel_id: createMode === "scheduled" ? formData.channel_id : "",
      };

      const response = await apiClient.post(CALENDAR_CREATE_EVENT, payload, {
        headers: buildAuthHeaders(accessToken),
      });
      const meeting = normalizeMeetingRecord(
        response.data?.meeting || response.data?.data?.meeting || response.data
      );

      setCreatedMeeting({
        ...meeting,
        title: meeting.title || payload.title,
      });
      setJoinValue(getCreatedMeetingDisplayValue(meeting));
      setIsCreateOpen(false);

      if (createMode === "instant") {
        toast.success("Meeting created. Use Join now or Open room to enter.");
      } else {
        toast.success("Meeting scheduled successfully.");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Unable to create the meeting."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyMeetingValue() {
    const externalRoomUrl = buildExternalRoomUrl(createdMeeting, {
      includeLaunchSession: false,
    });
    const valueToCopy = externalRoomUrl
      ? new URL(externalRoomUrl, window.location.origin).toString()
      : getCreatedMeetingDisplayValue();

    if (!valueToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(valueToCopy);
      toast.success("Meeting details copied.");
    } catch {
      toast.error("Copy failed. Please try again.");
    }
  }

  function openCreatedMeeting() {
    if (!createdMeeting) {
      return;
    }

    const externalRoomUrl = buildExternalRoomUrl(createdMeeting);

    if (externalRoomUrl) {
      window.open(externalRoomUrl, "_blank", "width=1280,height=720,noopener,noreferrer");
      return;
    }

    if (createdMeeting.id) {
      openMeetingRoom(createdMeeting);
      return;
    }

    if (createdMeeting.joinLink) {
      void handleJoinMeeting(createdMeeting.joinLink);
    }
  }

  const participantSearchTerm = participantSearch.trim().toLowerCase();
  const availableParticipantOptions = participants
    .filter((participant) => {
      const participantName = getSelectableName(participant, "");
      if (!participantName || formData.participant_names.includes(participantName)) {
        return false;
      }

      return !participantSearchTerm || participantName.toLowerCase().includes(participantSearchTerm);
    })
    .slice(0, 80);
  const channelSearchTerm = channelSearch.trim().toLowerCase();
  const channelOptions = channels.filter((channel) => {
    const channelName = getSelectableName(channel, "");

    return !channelSearchTerm || channelName.toLowerCase().includes(channelSearchTerm);
  });
  const selectedChannel = channels.find(
    (channel) => String(getSelectableId(channel)) === String(formData.channel_id)
  );
  const selectedChannelName = selectedChannel
    ? getSelectableName(selectedChannel, "Untitled channel")
    : "";

  return (
    <Layout>
      <div className="relative flex w-full flex-col gap-6 overflow-x-hidden">

        <div className="absolute top-[-10%] left-[-5%] -z-10 size-[320px] rounded-full bg-gradient-to-tr from-brand-primary/5 to-teal-400/5 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] -z-10 size-[380px] rounded-full bg-gradient-to-tr from-brand-primary/5 to-indigo-500/5 blur-[110px] pointer-events-none" />

        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-3xl">{intro}</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">

          <section className="space-y-6 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-xl shadow-slate-200/30 backdrop-blur-lg sm:p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/40">
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => openCreateModal("instant")}
                className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-600 p-6 text-left shadow-lg shadow-indigo-600/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-600/30 min-h-[140px]"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/20">
                  <Plus className="size-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white tracking-tight">Create meeting</p>
                  <p className="mt-1 text-xs text-white/75 leading-relaxed">Start an instant video room right now</p>
                </div>

                <div className="absolute right-[-10%] top-[-20%] size-28 rounded-full bg-white/5 blur-xl pointer-events-none group-hover:bg-white/10 transition-all duration-300" />
              </button>

              <button
                type="button"
                onClick={() => openCreateModal("scheduled")}
                className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary via-blue-500 to-sky-400 p-6 text-left shadow-lg shadow-brand-primary/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-primary/30 min-h-[140px]"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/20">
                  <Calendar className="size-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white tracking-tight">Schedule meeting</p>
                  <p className="mt-1 text-xs text-white/75 leading-relaxed">Plan a future meeting with your team</p>
                </div>

                <div className="absolute right-[-10%] top-[-20%] size-28 rounded-full bg-white/5 blur-xl pointer-events-none group-hover:bg-white/10 transition-all duration-300" />
              </button>
            </div>


            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[12.5px] font-bold capitalize tracking-[0.05em] text-brand-secondary/100">
                    Latest invite
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-800">
                    {createdMeeting?.title || "No active invite code"}
                  </h2>
                </div>
                {hasCreatedMeetingAccess ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200/40">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Ready
                  </div>
                ) : null}
              </div>

              {hasCreatedMeetingAccess ? (
                <div className="mt-5 space-y-4 animate-fade-in-up">
                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm relative overflow-hidden group">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                      {createdMeeting.displayValue || createdMeeting.id ? "Meeting ID" : "Invite link"}
                    </p>
                    <p className="mt-1 break-all text-sm font-mono font-semibold text-slate-800 selection:bg-brand-primary/10">
                      {getCreatedMeetingDisplayValue()}
                    </p>
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCopyMeetingValue}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 active:scale-95 duration-200"
                    >
                      <Copy className="mr-2 size-4" />
                      Copy details
                    </button>
                    {getCreatedMeetingDisplayValue() ? (
                      <button
                        type="button"
                        onClick={openCreatedMeeting}
                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-primary to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 transition-all hover:opacity-95 hover:shadow-lg hover:shadow-brand-primary/35 active:scale-95 duration-200"
                      >
                        <Video className="mr-2 size-4" />
                        Open room
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white/50 p-5 text-center text-xs font-medium text-slate-400 backdrop-blur-sm">
                  Create a meeting and the invite link or meeting ID will appear here.
                </div>
              )}
            </div>
          </section>


          <section className="flex flex-col justify-between rounded-3xl border border-white/60 bg-white/70 p-5 shadow-xl shadow-slate-200/30 backdrop-blur-lg sm:p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/40">
            <div>
              <p className="text-[12.5px] font-bold capitalize tracking-[0.05em] text-brand-secondary/100">
                Join meeting
              </p>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-800">
                Enter details to enter portal
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Paste the invite link or meeting ID you received. We'll automatically resolve it and take you to the secure room.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-200 focus-within:border-brand-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-primary/10 shadow-sm">
                <label
                  htmlFor="meetingTarget"
                  className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400"
                >
                  <Link2 className="size-3 text-slate-400" />
                  Meeting Token
                </label>
                <input
                  id="meetingTarget"
                  type="text"
                  value={joinValue}
                  onChange={(event) => setJoinValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleJoinMeeting();
                    }
                  }}
                  placeholder="Paste meeting ID or invite link"
                  className="w-full rounded-xl border-0 bg-transparent px-1 py-1.5 text-sm font-semibold text-slate-700 outline-none ring-0 placeholder:text-slate-400/50 focus:ring-0 focus:border-0"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleJoinMeeting()}
                disabled={isJoining}
                className="relative overflow-hidden inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-primary via-blue-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-brand-primary/20 transition-all duration-300 hover:opacity-95 hover:shadow-xl hover:shadow-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.99]"
              >
                {isJoining ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Video className="mr-2 size-4" />
                )}
                Join now
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-bold capitalize tracking-[0.05em] text-brand-secondary/100">
            Recent calls
          </p>
          {callHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCallHistoryModalOpen(true)}
              className="rounded-lg bg-brand-primary/10 px-3 py-1.5 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
            >
              View all
            </button>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {isLoadingCallHistory ? (
            <div className="flex items-center justify-center rounded-2xl border border-brand-line/30 bg-white/70 p-8 shadow-sm">
              <LoaderCircle className="size-6 animate-spin text-brand-primary" />
            </div>
          ) : callHistory.length > 0 ? (
            callHistory.slice(0, 3).map((call) => {
              const formattedCall = formatCallData(call);
              const statusText =
                formattedCall.status === "missed"
                  ? `Missed • ${formattedCall.date}`
                  : formattedCall.status === "no answer"
                    ? `No answer • ${formattedCall.date}`
                    : formattedCall.duration && formattedCall.duration !== "null"
                      ? `${formattedCall.duration} • ${formattedCall.date}`
                      : `Answered • ${formattedCall.date}`;

              const directionLabel =
                formattedCall.direction === "incoming"
                  ? "Incoming"
                  : formattedCall.direction === "outgoing"
                    ? "Outgoing"
                    : "";

              return (
                <div
                  key={formattedCall.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100/60 bg-white/80 p-4 shadow-sm hover:shadow-md hover:border-brand-primary/20 transition-all duration-300 hover:scale-[1.002]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={formattedCall.name} size="size-10" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {formattedCall.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 font-medium">
                        {statusText}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end sm:self-center">
                    {directionLabel && (
                      <div
                        className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${formattedCall.direction === "incoming"
                            ? "bg-blue-50 text-blue-700 border border-blue-100/50"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100/50"
                          }`}
                      >
                        {directionLabel}
                      </div>
                    )}
                    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border ${formattedCall.status === "missed"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : formattedCall.status === "no answer"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100"
                      }`}>
                      {formattedCall.direction === "incoming" ? (
                        <ArrowDownRight className="size-3" />
                      ) : formattedCall.direction === "outgoing" ? (
                        <ArrowUpRight className="size-3" />
                      ) : (
                        <Phone className="size-3" />
                      )}
                      {formattedCall.status}
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border ${formattedCall.callType === "video"
                        ? "bg-violet-50 text-violet-700 border-violet-100/50"
                        : "bg-sky-50 text-sky-700 border-sky-100/50"
                      }`}>
                      {formattedCall.callType === "video" ? (
                        <Video className="inline size-3 mr-1" />
                      ) : (
                        <Phone className="inline size-3 mr-1" />
                      )}
                      {formattedCall.callType}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-100/60 bg-white/70 p-8 text-center text-sm text-slate-400 shadow-sm">
              No recent calls yet.
            </div>
          )}
        </div>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-400/60 px-3 sm:px-4 backdrop-blur-md pt-3 pb-0">
          <div className="flex w-full max-w-[95vw] sm:max-w-lg h-[calc(100dvh-12px)] sm:h-auto sm:max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-xl animate-fade-in-up">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  {createMode === "instant" ? "Create meeting" : "Schedule meeting"}
                </p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-800">
                  {createMode === "instant"
                    ? "Set up a room for your next call"
                    : "Plan the meeting before you send the invite"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => {
                    setFormData((current) => ({ ...current, title: event.target.value }));
                    if (errors.title) setErrors((e) => ({ ...e, title: null }));
                  }}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:ring-2 ${errors.title ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10" : "border-slate-200 bg-white focus:border-brand-primary focus:ring-brand-primary/10"}`}
                />
                {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title}</p>}
              </div>

              {createMode === "instant" ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    placeholder="Optional agenda"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  />
                </div>
              ) : null}

              {createMode === "instant" ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Participant names *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsParticipantPickerOpen((current) => !current)}
                      disabled={isLoadingParticipants}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 outline-none transition-all hover:border-brand-primary/60 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 disabled:opacity-70"
                    >
                      <span>
                        {isLoadingParticipants ? "Loading participants..." : "Search or select participant"}
                      </span>
                      <ChevronDown className="size-4 text-slate-400" />
                    </button>
                    {isParticipantPickerOpen ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[90] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                          <Search className="size-4 text-slate-400" />
                          <input
                            type="text"
                            value={participantSearch}
                            onChange={(event) => setParticipantSearch(event.target.value)}
                            placeholder="Search participants"
                            className="h-8 w-full border-0 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-56 overflow-y-auto py-1 [scrollbar-width:thin]">
                          {availableParticipantOptions.length ? (
                            availableParticipantOptions.map((participant) => {
                              const participantName = getSelectableName(participant, "");
                              const participantId = getParticipantId(participant);

                              return (
                                <button
                                  key={participantId || participantName}
                                  type="button"
                                  onClick={() => {
                                    setFormData((current) => ({
                                      ...current,
                                      participant_ids: participantId
                                        ? Array.from(
                                          new Set([...(current.participant_ids || []), String(participantId)])
                                        )
                                        : current.participant_ids || [],
                                      participant_names: Array.from(
                                        new Set([...(current.participant_names || []), participantName])
                                      ),
                                    }));
                                    setParticipantSearch("");
                                    setIsParticipantPickerOpen(false);
                                    if (errors.participants) setErrors((e) => ({ ...e, participants: null }));
                                  }}
                                  className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-brand-primary/10 hover:text-brand-primary"
                                >
                                  <span className="truncate">{participantName}</span>
                                  <Check className="size-3.5 opacity-0" />
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3.5 py-3 text-xs font-semibold text-slate-400">
                              No participants found.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={formData.participant_name_input}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        participant_name_input: event.target.value,
                      }));
                      if (errors.participants) setErrors((e) => ({ ...e, participants: null }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }

                      event.preventDefault();
                      const nextName = formData.participant_name_input.trim();
                      if (!nextName) {
                        return;
                      }

                      setFormData((current) => ({
                        ...current,
                        participant_name_input: "",
                        participant_names: Array.from(
                          new Set([...(current.participant_names || []), nextName])
                        ),
                      }));
                      if (errors.participants) setErrors((e) => ({ ...e, participants: null }));
                    }}
                    placeholder="Type a name and press Enter"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:ring-2 ${errors.participants ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10" : "border-slate-200 bg-white focus:border-brand-primary focus:ring-brand-primary/10"}`}
                  />
                  {errors.participants && <p className="text-xs text-red-500 font-medium">{errors.participants}</p>}
                  {formData.participant_names.length ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.participant_names.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() =>
                            setFormData((current) => ({
                              ...current,
                              participant_ids: (current.participant_ids || []).filter((participantId) => {
                                const participant = participants.find(
                                  (item) => String(getParticipantId(item)) === String(participantId)
                                );

                                return getSelectableName(participant, "") !== name;
                              }),
                              participant_names: current.participant_names.filter(
                                (participantName) => participantName !== name
                              ),
                            }))
                          }
                          className="rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-primary/15"
                        >
                          {name} x
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                      <Hash className="size-3.5" />
                      Channel
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsChannelPickerOpen((current) => !current)}
                        disabled={isLoadingChannels}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 outline-none transition-all hover:border-brand-primary/60 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 disabled:opacity-70"
                      >
                        <span className="truncate">
                          {isLoadingChannels
                            ? "Loading channels..."
                            : selectedChannelName || "Select channel"}
                        </span>
                        <ChevronDown className="size-4 text-slate-400" />
                      </button>
                      {isChannelPickerOpen ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[90] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                            <Search className="size-4 text-slate-400" />
                            <input
                              type="text"
                              value={channelSearch}
                              onChange={(event) => setChannelSearch(event.target.value)}
                              placeholder="Search channels"
                              className="h-8 w-full border-0 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-56 overflow-y-auto py-1 [scrollbar-width:thin]">
                            {channelOptions.length ? (
                              channelOptions.map((channel) => {
                                const channelId = getSelectableId(channel);
                                const channelName = getSelectableName(channel, "Untitled channel");
                                const isSelected = String(channelId) === String(formData.channel_id);

                                return (
                                  <button
                                    key={channelId}
                                    type="button"
                                    onClick={() => {
                                      setFormData((current) => ({ ...current, channel_id: channelId }));
                                      setChannelSearch("");
                                      setIsChannelPickerOpen(false);
                                      if (errors.channel) setErrors((e) => ({ ...e, channel: null }));
                                    }}
                                    className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-brand-primary/10 hover:text-brand-primary"
                                  >
                                    <span className="truncate">{channelName}</span>
                                    {isSelected ? (
                                      <Check className="size-3.5 text-brand-primary" />
                                    ) : null}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3.5 py-3 text-xs font-semibold text-slate-400">
                                No channels found.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {errors.channel ? (
                      <p className="text-xs text-red-500 font-medium">{errors.channel}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                      Privacy
                    </label>
                    <select
                      value={formData.meeting_type}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          meeting_type: event.target.value,
                        }))
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              )}

              <DateTimeField
                label="Start time"
                value={formData.scheduled_at}
                onChange={(nextStartValue) => {
                  const nextStartDate = nextStartValue ? new Date(nextStartValue) : null;
                  const currentEndDate = formData.end_time ? new Date(formData.end_time) : null;
                  const shouldMoveEnd =
                    nextStartDate &&
                    (!currentEndDate ||
                      Number.isNaN(currentEndDate.getTime()) ||
                      currentEndDate <= nextStartDate);

                  setFormData((current) => ({
                    ...current,
                    scheduled_at: nextStartValue,
                    end_time: shouldMoveEnd
                      ? toLocalDateTimeValue(addMinutes(nextStartDate, 30))
                      : current.end_time,
                  }));
                }}
              />

              <DateTimeField
                label="End time"
                value={formData.end_time}
                onChange={(nextEndValue) =>
                  setFormData((current) => ({
                    ...current,
                    end_time: nextEndValue,
                  }))
                }
              />
            </div>

            <div className="sticky bottom-0 z-10 flex shrink-0 flex-wrap justify-end gap-2.5 border-t border-slate-100 bg-white/20 px-6 py-4">
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateMeeting()}
                disabled={isSubmitting}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-brand-primary to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/20 transition-all hover:opacity-95 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 active:scale-95"
              >
                {isSubmitting ? (
                  <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Video className="mr-1.5 size-3.5" />
                )}
                {createMode === "instant" ? "Create meeting" : "Schedule meeting"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCallHistoryModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-900/60 px-3 sm:px-4 backdrop-blur-md pt-3 pb-0">
          <div className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-xl animate-fade-in-up">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Call history
                </p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-800">
                  View your latest calls
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCallHistoryModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto px-6 py-4 [scrollbar-width:thin]">
              {isLoadingCallHistory ? (
                <div className="flex items-center justify-center py-12">
                  <LoaderCircle className="size-6 animate-spin text-brand-primary" />
                </div>
              ) : callHistory.length > 0 ? (
                callHistory.map((call) => {
                  const formattedCall = formatCallData(call);
                  const statusText =
                    formattedCall.status === "missed"
                      ? `Missed • ${formattedCall.date}`
                      : formattedCall.status === "no answer"
                        ? `No answer • ${formattedCall.date}`
                        : formattedCall.duration && formattedCall.duration !== "null"
                          ? `${formattedCall.duration} • ${formattedCall.date}`
                          : `Answered • ${formattedCall.date}`;

                  const directionLabel =
                    formattedCall.direction === "incoming"
                      ? "Incoming"
                      : formattedCall.direction === "outgoing"
                        ? "Outgoing"
                        : "";

                  return (
                    <div
                      key={formattedCall.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm transition-all hover:bg-white hover:border-brand-primary/20"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={formattedCall.name} size="size-10" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {formattedCall.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 font-medium">
                            {statusText}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end sm:self-center">
                        {directionLabel && (
                          <div
                            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${formattedCall.direction === "incoming"
                                ? "bg-blue-50 text-blue-700 border border-blue-100/50"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-100/50"
                              }`}
                          >
                            {directionLabel}
                          </div>
                        )}
                        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border ${formattedCall.status === "missed"
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : formattedCall.status === "no answer"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }`}>
                          {formattedCall.direction === "incoming" ? (
                            <ArrowDownRight className="size-3" />
                          ) : formattedCall.direction === "outgoing" ? (
                            <ArrowUpRight className="size-3" />
                          ) : (
                            <Phone className="size-3" />
                          )}
                          {formattedCall.status}
                        </div>
                        <div className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border ${formattedCall.callType === "video"
                            ? "bg-violet-50 text-violet-700 border-violet-100/50"
                            : "bg-sky-50 text-sky-700 border-sky-100/50"
                          }`}>
                          {formattedCall.callType === "video" ? (
                            <Video className="inline size-3 mr-1" />
                          ) : (
                            <Phone className="inline size-3 mr-1" />
                          )}
                          {formattedCall.callType}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-brand-secondary">
                  <Phone className="mx-auto mb-2 size-6 opacity-30" />
                  <p>No call history yet.</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsCallHistoryModalOpen(false)}
                className="w-full rounded-xl bg-gradient-to-r from-brand-primary to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 transition-all hover:opacity-95 hover:shadow-lg active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
