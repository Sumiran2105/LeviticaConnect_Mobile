import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Phone,
  Heart,
  AtSign,
  Search,
  Filter,
  Clock,
  Trash2,
  CheckCheck,
  Loader,
  ArrowDownRight,
  ArrowUpRight,
  Video,
  ChevronDown,
  Check,
} from "lucide-react";
import { ChatAvatar } from "@/features/chat/components/chat-avatar";
import { Button } from "@/components/ui/button";
import { UserLayout } from "@/layouts/user-layout";
import { ACTIVITY_LIST, ACTIVITY_MARK_ALL_READ } from "@/config/api";
import { apiClient } from "@/lib/client";

const ACTIVITY_TYPES = {
  MENTION: "mention",
  REACTION: "reaction",
  CALL: "call",
  MESSAGE: "message",
};

function getActivityName(item) {
  const candidates = [
    item.sender?.name,
    item.sender?.full_name,
    item.sender_name,
    item.actor?.name,
    item.actor?.full_name,
    item.user?.name,
    item.user?.full_name,
    item.user_name,
    item.full_name,
    item.caller?.name,
    item.receiver?.name,
    item.sender?.email,
    item.actor?.email,
    item.user?.email,
  ];

  return (
    candidates.find((value) => typeof value === "string" && value.trim()) ||
    "Unknown User"
  );
}

function getActivityAvatar(item) {
  return (
    item.sender?.avatar ||
    item.sender?.profile_image ||
    item.sender?.avatar_url ||
    item.user?.avatar ||
    item.user?.profile_image ||
    item.user?.avatar_url ||
    item.actor?.avatar ||
    item.actor?.profile_image ||
    item.actor?.avatar_url ||
    item.caller?.avatar ||
    item.caller?.profile_image ||
    item.receiver?.avatar ||
    item.receiver?.profile_image ||
    item.avatar ||
    null
  );
}

function getActivityUserId(item) {
  return (
    item.sender?.id ||
    item.sender?.user_id ||
    item.user?.id ||
    item.user?.user_id ||
    item.actor?.id ||
    item.actor?.user_id ||
    item.caller?.id ||
    item.receiver?.id ||
    item.user_id ||
    null
  );
}

function getActivityContent(item) {
  return (
    (item.type === "mention" && item.message?.content
      ? item.message.content
      : "") ||
    (typeof item.content === "string"
      ? item.content
      : typeof item.content?.content === "string"
        ? item.content.content
        : "") ||
    (typeof item.message === "string"
      ? item.message
      : typeof item.message?.content === "string"
        ? item.message.content
        : "") ||
    (typeof item.description === "string" ? item.description : "") ||
    ""
  );
}
// const handleDeleteActivity = async (activity) => {
//   try {
//     const response = await fetch(
//       `/api/v1/activity/${activity.activityType}/${activity.id}`,
//       {
//         method: "DELETE",
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     if (!response.ok) {
//       throw new Error("Failed to delete activity");
//     }

//     // Refresh list / remove from state
//     // onDelete?.(activity.id);

//   } catch (error) {
//     console.error("Delete activity error:", error);
//   }
// };

function transformActivityItem(item) {
  console.log("Transforming activity item:", item); 
  const createdDate = new Date(
    item.createdAt || item.created_at || item.timestamp || Date.now(),
  );
  const displayName = getActivityName(item);

  return {
    id: item.activity_id,
    activityType: item.activity_type || item.type,
    type: item.type || "message",
    user: {
      name: displayName,
      initials: displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase(),
      avatar: getActivityAvatar(item),
      userId: getActivityUserId(item),
    },
    action: item.action || `${item.type} activity`,
    content: getActivityContent(item),
    reaction: item.reaction || item.emoji || item.metadata?.emoji,
    context:
      item.context || item.channel?.name || item.channelName || "Activity",
    contextId: item.contextId || item.channel?.id || item.channelId || item.id,
    contextType: item.contextType || item.channel_type || "activity",
    timestamp: createdDate.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    }),
    date: createdDate,
    icon: item.icon || item.type || "message",
    read: item.read || item.isRead || item.is_read || false,
    metadata: item.metadata || {},
    direction: item.direction || undefined,
    callType: item.meeting?.call_type || undefined,
    callStatus: item.is_missed ? "missed" : item.meeting?.status || "answered",
  };
}


const ActivityItem = ({ activity, onNavigate, onMarkRead, onDelete }) => {
  const [imageError, setImageError] = useState(false);
  const getIcon = (iconType) => {
    const iconConfig = {
      mention: { icon: AtSign, color: "text-brand-tertiary" },
      reaction: { icon: Heart, color: "text-brand-tertiary" },
      call: { icon: Phone, color: "text-green-600" },
      message: { icon: MessageCircle, color: "text-brand-tertiary" },
    };

    const config = iconConfig[iconType] || iconConfig.message;
    const IconComponent = config.icon;

    return <IconComponent className={`size-3.5 sm:size-4 ${config.color}`} />;
  };

  return (
    <div
      className={`group flex items-start gap-3 sm:gap-4 border rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 transition mb-2.5 sm:mb-3 ${
        activity.read
          ? "border-l-brand-line border-brand-line bg-white hover:bg-brand-soft"
          : "border-l-brand-primary border-gray bg-brand-neutral hover:bg-brand-neutral/80"
      }`}
    >
      <div
        className="relative shrink-0 cursor-pointer"
        onClick={() => onNavigate?.(activity)}
      >
        {activity.user.avatar && !imageError ? (
          <img
            src={activity.user.avatar}
            alt={activity.user.initials}
            onError={() => setImageError(true)}
            className="size-10 sm:size-12 rounded-full object-cover ring-2 ring-brand-soft"
          />
        ) : (
          <ChatAvatar name={activity.user.name} size="size-10 sm:size-12" />
        )}
        <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 sm:p-1.5 shadow-md ring-1 ring-brand-line">
          {getIcon(activity.icon)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 sm:gap-3 flex-col sm:flex-row">
          <div
            className="flex-1 min-w-0 w-full cursor-pointer"
            onClick={() => onNavigate?.(activity)}
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight flex-1 min-w-0">
                <span className="font-bold text-sm sm:text-base text-brand-ink truncate max-w-full">
                  {activity.user.name}
                </span>
                <span className="text-xs sm:text-sm text-brand-secondary">
                  {activity.action
                    ?.split(" ")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase(),
                    )
                    .join(" ")}
                  {console.log("::::123", activity.action)}
                </span>
              </div>
              <span className="text-[10px] sm:text-sm font-bold text-brand-secondary/70 whitespace-nowrap shrink-0 sm:hidden mt-0.5">
                {activity.timestamp}
              </span>
            </div>

            {activity.reaction && (
              <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-2 rounded-full bg-yellow-100/50 px-2.5 py-0.5 sm:py-1 ring-1 ring-yellow-200">
                <span className="text-sm sm:text-lg">{activity.reaction}</span>
              </div>
            )}

            {activity.content && typeof activity.content === "string" && (
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium text-brand-ink">
                {activity.content}
              </p>
            )}

            {activity.type === "call" && (
              <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                {activity.direction && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] ${
                      activity.direction === "incoming"
                        ? "bg-blue-500/10 text-blue-700"
                        : "bg-green-500/10 text-green-700"
                    }`}
                  >
                    {activity.direction === "incoming" ? (
                      <ArrowDownRight className="size-3" />
                    ) : (
                      <ArrowUpRight className="size-3" />
                    )}
                    {activity.direction === "incoming"
                      ? "Incoming"
                      : "Outgoing"}
                  </span>
                )}

                {activity.callType && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] ${
                      activity.callType === "video"
                        ? "bg-violet-500/10 text-violet-700"
                        : "bg-orange-500/10 text-orange-700"
                    }`}
                  >
                    {activity.callType === "video" ? (
                      <Video className="size-3" />
                    ) : (
                      <Phone className="size-3" />
                    )}
                    {activity.callType}
                  </span>
                )}

                {activity.callStatus && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] ${
                      activity.callStatus === "missed"
                        ? "bg-red-500/10 text-red-700"
                        : "bg-gray-500/10 text-gray-700"
                    }`}
                  >
                    {activity.callStatus === "missed"
                      ? "Missed"
                      : activity.callStatus}
                  </span>
                )}
              </div>
            )}

            {/*Further Use */}
            {/* {activity.context && !activity.type?.includes("call") && (
              <p className="mt-1.5 text-[10px] sm:text-xs font-medium text-brand-secondary">
                {activity.context}
              </p>
            )} */}
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 w-full sm:w-auto mt-1 sm:mt-0">
            <span className="hidden sm:block text-sm font-bold text-brand-secondary/70 whitespace-nowrap">
              {activity.timestamp}
            </span>
            <div className="flex gap-1.5 sm:gap-1 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100 ml-auto sm:ml-0">
              {!activity.read && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead?.(activity.id);
                  }}
                  className="rounded-lg sm:rounded-md bg-white sm:bg-transparent border sm:border-0 border-brand-line p-1.5 sm:p-1.5 text-brand-secondary transition hover:bg-brand-primary hover:text-white hover:border-brand-primary shadow-sm sm:shadow-none"
                  title="Mark as read"
                >
                  <CheckCheck className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(activity);
                  console.log("Delete activity with ID:", activity.id);
                  // handleDeleteActivity(activity);
                }}
                className="rounded-lg sm:rounded-md bg-white sm:bg-transparent border sm:border-0 border-brand-line p-1.5 sm:p-1.5 text-brand-secondary transition hover:bg-brand-tertiary hover:text-white hover:border-brand-tertiary shadow-sm sm:shadow-none"
                title="Delete activity"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ActivityPage = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filterOptions = [
    { value: "all", label: "All types" },
    { value: ACTIVITY_TYPES.MENTION, label: "Mentions" },
    { value: ACTIVITY_TYPES.REACTION, label: "Reactions" },
    { value: ACTIVITY_TYPES.CALL, label: "Calls" },
  ];

  const selectedLabel =
    filterOptions.find((item) => item.value === selectedFilter)?.label ||
    "All types";

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get(ACTIVITY_LIST);
        let activityData = [];

        if (response.data) {
          if (Array.isArray(response.data)) {
            activityData = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            activityData = response.data.data;
          } else if (
            response.data.activities &&
            Array.isArray(response.data.activities)
          ) {
            activityData = response.data.activities;
          }
        }

        const transformedActivities = activityData.map(transformActivityItem);

        transformedActivities.sort((a, b) => b.date - a.date);
        setActivities(transformedActivities);
      } catch (err) {
        console.error("Failed to fetch activities:", err);
        setError("Failed to load activities. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (selectedFilter !== "all" && activity.type !== selectedFilter) {
        return false;
      }

      if (showOnlyUnread && activity.read) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          activity.user.name.toLowerCase().includes(query) ||
          activity.context?.toLowerCase().includes(query) ||
          activity.content?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [activities, searchQuery, selectedFilter, showOnlyUnread]);

  const groupedActivities = useMemo(() => {
    const groups = {};

    filteredActivities.forEach((activity) => {
      const dateKey = activity.date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return groups;
  }, [filteredActivities]);

  const handleNavigate = useCallback(
    (activity) => {
      if (!activity.read) {
        setActivities((prev) =>
          prev.map((a) => (a.id === activity.id ? { ...a, read: true } : a)),
        );
      }

      if (activity.contextType === "chat") {
        navigate(`/chat/${activity.contextId}`);
      } else if (activity.contextType === "channel") {
        navigate(`/channels/${activity.contextId}`);
      } else if (activity.contextType === "group") {
        navigate(`/chat/${activity.contextId}`);
      }
    },
    [navigate],
  );

  const handleMarkRead = useCallback(async (id) => {
    try {
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === id ? { ...activity, read: true } : activity,
        ),
      );

      await apiClient.patch(`${ACTIVITY_LIST}/${id}/read`);
    } catch (err) {
      console.error("Failed to mark as read:", err);
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === id ? { ...activity, read: false } : activity,
        ),
      );
    }
  }, []);

  const handleDelete = useCallback(
  async (activity) => {
    console.log("::::456", activity);
    const previousActivities = activities;

    try {
      setActivities((prev) =>
        prev.filter((item) => item.id !== activity.id)
      );

      await apiClient.delete(
        `/api/v1/activity/${activity.activityType}/${activity.id}`
      );

    } catch (err) {
      console.error("Failed to delete activity:", err);

      setError("Failed to delete activity. Please try again.");

      setActivities(previousActivities);
    }
  },
  [activities]
);

  const handleClearAll = useCallback(async () => {
    const previousActivities = activities;

    try {
      setActivities([]);

      await apiClient.delete(`${ACTIVITY_LIST}/clear-all`);
    } catch (err) {
      console.error("Failed to clear all activities:", err);
      setError("Failed to clear all activities. Please try again.");

      setActivities(previousActivities);
    }
  }, [activities]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      setActivities((prev) =>
        prev.map((activity) => ({ ...activity, read: true })),
      );

      await apiClient.post(ACTIVITY_MARK_ALL_READ);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      setError("Failed to mark all as read. Please try again.");

      try {
        const response = await apiClient.get(ACTIVITY_LIST);
        let activityData = [];

        if (response.data) {
          if (Array.isArray(response.data)) {
            activityData = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            activityData = response.data.data;
          }
        }

        const transformedActivities = activityData.map(transformActivityItem);

        transformedActivities.sort((a, b) => b.date - a.date);
        setActivities(transformedActivities);
      } catch (refetchErr) {
        console.error("Failed to refetch activities:", refetchErr);
      }
    }
  }, []);

  const unreadCount = activities.filter((a) => !a.read).length;

  return (
    <UserLayout
      contentClassName="!p-0 lg:h-full lg:overflow-hidden overflow-y-auto"
      contentInnerClassName="!max-w-none !w-full !m-0 lg:h-full flex flex-col"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="  px-8 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-brand-ink">Activity</h1>
              <p className="mt-1 text-sm text-brand-secondary">
                Stay updated on mentions, reactions, and important events
              </p>
            </div>
            {activities.length > 0 && (
              <div className="flex gap-3">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="border-brand-primary text-brand-primary border rounded-lg hover:bg-brand-primary hover:text-blue"
                  >
                    <CheckCheck className="mr-2 size-4" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="border-brand-tertiary  border rounded-lg hover:bg-brand-tertiary hover:text-red-600/90"
                >
                  <Trash2 className="mr-2 size-4" />
                  Clear all
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-5 text-brand-secondary" />
              <input
                type="text"
                placeholder="Search by name, channel, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-brand-line bg-white py-2 pl-10 pr-4 text-sm text-brand-ink placeholder-brand-secondary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-3 size-5 text-brand-secondary" />
                <div className="relative w-full sm:w-52">
                  <button
                    type="button"
                    onClick={() => setShowFilterMenu((prev) => !prev)}
                    className="
      flex h-11 w-full items-center justify-between
      rounded-xl border border-brand-line
      bg-white px-4 text-sm font-medium
      text-brand-ink shadow-sm
      transition-all duration-200
      hover:border-brand-primary
      hover:shadow-md
      focus:outline-none
      focus:ring-4 focus:ring-brand-primary/20
    "
                  >
                    <span>{selectedLabel}</span>

                    <ChevronDown
                      className={`h-4 w-4 text-brand-secondary transition-transform duration-200 ${
                        showFilterMenu ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showFilterMenu && (
                    <div
                      className="
        absolute right-0 z-50 mt-2
        w-full overflow-hidden
        rounded-xl border border-brand-line
        bg-white shadow-xl
      "
                    >
                      {filterOptions.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setSelectedFilter(item.value);
                            setShowFilterMenu(false);
                          }}
                          className={`
            flex w-full items-center justify-between
            px-4 py-3 text-left text-sm
            transition-colors duration-150

            ${
              selectedFilter === item.value
                ? "bg-brand-primary text-white font-semibold"
                : "text-brand-ink hover:bg-brand-neutral/60"
            }
          `}
                        >
                          {item.label}

                          {selectedFilter === item.value && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                  showOnlyUnread
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-brand-line bg-white text-brand-ink hover:border-brand-primary"
                }`}
              >
                <Clock className="mr-2 inline size-4" />
                Unread
              </button>
            </div>
          </div>

          {activities.length > 0 && (
            <div className="mt-4 flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-brand-primary"></div>
                <span className="text-brand-secondary">
                  {unreadCount} <span className="font-medium">Unread</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-brand-line"></div>
                <span className="text-brand-secondary">
                  {activities.length - unreadCount}{" "}
                  <span className="font-medium">Read</span>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 lg:min-h-0 lg:overflow-y-auto">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center p-8">
              <Loader className="size-12 animate-spin text-brand-primary" />
              <p className="mt-4 text-brand-secondary">Loading activities...</p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-3xl bg-red-50 p-4">
                <MessageCircle className="size-12 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-brand-ink">{error}</h3>
              <Button
                onClick={() => {
                  setLoading(true);
                  setError(null);

                  apiClient
                    .get(ACTIVITY_LIST)
                    .then((response) => {
                      let activityData = [];

                      if (response.data) {
                        if (Array.isArray(response.data)) {
                          activityData = response.data;
                        } else if (
                          response.data.data &&
                          Array.isArray(response.data.data)
                        ) {
                          activityData = response.data.data;
                        }
                      }

                      const transformedActivities = activityData.map(
                        transformActivityItem,
                      );

                      transformedActivities.sort((a, b) => b.date - a.date);
                      setActivities(transformedActivities);
                    })
                    .catch((err) => {
                      console.error("Failed to fetch activities:", err);
                      setError("Failed to load activities. Please try again.");
                    })
                    .finally(() => setLoading(false));
                }}
                className="mt-4 bg-brand-primary text-white hover:bg-brand-primary/90"
              >
                Retry
              </Button>
            </div>
          ) : filteredActivities.length > 0 ? (
            <div className="px-4 sm:px-8 py-4">
              {Object.entries(groupedActivities).map(([dateKey, items]) => (
                <div key={dateKey}>
                  <div className="sticky top-0 flex items-center gap-4  px-0 py-3 z-10 mb-4">
                    <div className="h-px flex-1 bg-brand-line"></div>
                    <span className="text-sm font-semibold text-brand-secondary">
                      {dateKey}
                    </span>
                    <div className="h-px flex-1 bg-brand-line"></div>
                  </div>

                  {items.map((activity, index) => (
                    <ActivityItem
                      key={`${activity.id}-${index}`}
                      activity={activity}
                      onNavigate={handleNavigate}
                      onMarkRead={handleMarkRead}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-3xl bg-brand-soft p-4">
                <MessageCircle className="size-12 text-brand-primary" />
              </div>
              <h3 className="text-lg font-semibold text-brand-ink">
                No activities yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-brand-secondary">
                {searchQuery || selectedFilter !== "all" || showOnlyUnread
                  ? "No activities match your filters. Try adjusting your search criteria."
                  : "When you receive mentions, reactions, or messages, they'll appear here."}
              </p>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};
