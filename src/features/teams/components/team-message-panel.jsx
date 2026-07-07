import { useQuery } from "@tanstack/react-query";
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  CheckCheck,
  ChevronLeft,
  Eye,
  FileText,
  FolderOpen,
  Forward,
  Languages,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Pin,
  PinOff,
  Reply,
  Search,
  Trash2,
  Users2,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LinkifiedText } from "@/components/linkified-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatAvatar } from "@/features/chat/components/chat-avatar";
import { FileAttachmentCard } from "@/features/chat/components/file-attachment-card";
import { useMeetingLauncher } from "@/features/meetings/hooks/use-meeting-launcher";
import { getUserId, getUserAvatar, getUserName, parseMentions } from "@/features/teams/utils/team-utils";
import { MEETING_CHANNEL_ACTIVE_CALL } from "@/config/api";
import { apiClient } from "@/lib/client";
import { listChannelFiles } from "@/lib/file-utils";
import { useAuthStore } from "@/store/auth-store";
import { EmojiPicker } from "./emoji-picker";
import { ForwardDialog } from "./forward-dialog";

const MESSAGE_RENDER_BATCH_SIZE = 120;
const QUICK_REACTIONS = ["👍", "❤️", "😂"];
const TRANSLATE_LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Spanish",
  "French",
  "German",
  "Arabic",
];

function ChannelMessageSkeleton() {
  return (
    <div className="space-y-4 px-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
          {i % 2 !== 0 ? <div className="size-9 shrink-0 rounded-full animate-shimmer" /> : null}
          <div className={`flex flex-col space-y-2 ${i % 2 === 0 ? "items-end" : "items-start"}`}>
            {i % 2 !== 0 ? <div className="h-3 w-20 rounded-full animate-shimmer" /> : null}
            <div className={`h-11 rounded-[22px] animate-shimmer shadow-sm ${i % 3 === 0 ? "w-52" : i % 3 === 1 ? "w-72" : "w-40"}`} />
            <div className={`h-2.5 rounded-full animate-shimmer ${i % 2 === 0 ? "w-16" : "w-20"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Highlights occurrences of `query` inside `text` with a colored background.
 */
function HighlightedText({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-gray-900">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function getJoinableActiveChannelCall(payload) {
  const candidate = payload?.has_active_call
    ? payload.meeting
    : null;
  const status = candidate?.status?.toString().toLowerCase();
  const participantCount = Number(candidate?.active_participants);
  const hasActiveParticipants = Number.isNaN(participantCount) || participantCount > 0;

  return status === "active" && hasActiveParticipants
    ? candidate
    : null;
}

function MessageStatusIcon({ message }) {
  if (message.isPending) {
    return <Check className="size-3.5 text-gray-300" />;
  }

  if (message.read) {
    return <CheckCheck className="size-3.5 text-sky-500" />;
  }

  if (message.delivered) {
    return <CheckCheck className="size-3.5 text-gray-400" />;
  }

  return <Check className="size-3.5 text-gray-400" />;
}

function getSenderName(message, currentUser) {
  if (message.from === "me") {
    return currentUser?.name || "Me";
  }

  return message.senderName || getUserName(message.raw, getUserId(message.raw));
}

function getSenderAvatar(message, currentUser) {
  if (message.from === "me") {
    return currentUser?.avatar_url || currentUser?.image;
  }

  return getUserAvatar(message.raw);
}

function MessageHoverMeta({ message, isMe }) {
  if (message.failed) {
    return <span className="text-[11px] font-medium text-red-500">Failed</span>;
  }

  return (
    <span
      className={`flex items-center gap-1.5 whitespace-nowrap text-[11px] text-gray-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${isMe ? "justify-end" : "justify-start"
        }`}
    >
      {isMe ? <MessageStatusIcon message={message} /> : null}
      <span>{message.time}</span>
    </span>
  );
}

/**
 * Component to render message text with formatted mentions
 */
const FormattedMessageText = memo(function FormattedMessageText({ text }) {
  const parts = useMemo(() => parseMentions(text), [text]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.type === "mention") {
          return (
            <strong key={`mention-${index}`} className="font-bold">
              {part.content}
            </strong>
          );
        }
        return (
          <LinkifiedText
            key={`text-${index}`}
            text={part.content}
            linkClassName="font-semibold underline underline-offset-2"
          />
        );
      })}
    </span>
  );
});

const MessageBubble = memo(function MessageBubble({
  message,
  isMe,
  showAvatar,
  senderName,
  senderAvatar,
  isSameUserAsPrev,
  onAddReaction,
  onRemoveReaction,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onShowDeliveryStatus,
  onLoadThreadMessages,
  onReplyMessage,
  onForwardMessage,
  onTranslateMessage,
  onSummarizeMessage,
  style,
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEdit = () => {
    onEditMessage?.(message.id);
  };

  const handleForward = () => {
    onForwardMessage?.({ ...message, senderName, senderAvatar });
  };

  const handleReply = () => {
    onReplyMessage?.({ ...message, senderName, senderAvatar });
  };

  const handleTranslate = () => {
    onTranslateMessage?.(message);
  };

  const handleSummarize = () => {
    onSummarizeMessage?.(message.id, message.text);
  };

  const handleEmojiSelect = (emoji) => {
    onAddReaction?.(message.id, emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div
      id={`channel-msg-${message.id}`}
      className={`group chat-message-enter relative flex w-full items-start gap-3 ${isMe ? "justify-end" : "justify-start"} ${isSameUserAsPrev ? "!mt-1" : ""}`}
      style={style}
    >
      {!isMe && (
        <div className={`h-9 w-9 shrink-0 transition-all duration-200 ${showAvatar ? "mt-5" : "mt-0"}`}>
          {showAvatar ? <ChatAvatar name={senderName} src={senderAvatar} size="size-9" /> : null}
        </div>
      )}

      <div className={`flex max-w-[90%] flex-col ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && showAvatar ? (
          <span className="mb-1 ml-1 text-xs font-bold text-slate-800">
            {senderName}
          </span>
        ) : null}
        <div className={`flex items-center gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
          {isMe ? <MessageHoverMeta message={message} isMe={isMe} /> : null}
          <div
            className={`chat-bubble rounded-[20px] px-4 py-2.5 text-left text-sm leading-relaxed transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] ${isMe
              ? "rounded-br-md bg-gradient-to-r from-brand-primary to-indigo-600 text-white shadow-md shadow-brand-primary/10 hover:shadow-lg hover:shadow-brand-primary/25"
              : "rounded-bl-md border border-slate-100 bg-white text-slate-800 shadow-sm hover:border-brand-primary/15 hover:shadow-md"
              }`}
          >
            {message.replyTo ? (
              <button
                type="button"
                onClick={() => message.replyTo?.id && onLoadThreadMessages?.(message.replyTo.id)}
                className={`mb-2 block w-full rounded-xl border-l-4 px-3 py-2 text-left transition hover:scale-[1.01] ${isMe
                  ? "border-white/70 bg-white/15 text-white/90 hover:bg-white/20"
                  : "border-brand-primary bg-slate-50 text-slate-700 hover:bg-brand-soft/60"
                  }`}
                title="View original message"
              >
                <span className={`flex items-center justify-between gap-3 text-[11px] font-bold ${isMe ? "text-white/85" : "text-brand-primary"}`}>
                  <span className="truncate">{message.replyTo.senderName || "Message"}</span>
                  {message.replyTo.time ? (
                    <span className={`shrink-0 font-semibold ${isMe ? "text-white/60" : "text-slate-400"}`}>
                      {message.replyTo.time}
                    </span>
                  ) : null}
                </span>
                <span className={`mt-0.5 line-clamp-2 block text-xs leading-relaxed ${isMe ? "text-white/80" : "text-slate-600"}`}>
                  {message.replyTo.text || "Original message"}
                </span>
              </button>
            ) : null}
            {message.isForwarded && (
              <div className={`flex items-center gap-1 text-[11px] font-medium mb-1.5 italic ${isMe ? "text-white/70" : "text-gray-400"}`}>
                <Forward className="size-3 shrink-0" />
                <span>Forwarded</span>
              </div>
            )}
            {message.pinned ? <Pin className="mr-1 inline size-3.5" /> : null}
            {message.text && (!message.attachments?.length || message.text !== message.attachments[0]?.name) ? (
              <FormattedMessageText text={message.text} />
            ) : null}
            {message.attachments?.map((attachment) => (
              <FileAttachmentCard key={attachment.id} attachment={attachment} isMe={isMe} />
            ))}
          </div>
          {!isMe ? <MessageHoverMeta message={message} isMe={isMe} /> : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mt-1 rounded-full border border-gray-200 bg-white/90 p-1.5 text-gray-400 opacity-0 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:text-brand-primary group-hover:opacity-100 group-focus-within:opacity-100"
                aria-label="Message actions"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? "end" : "start"} className="w-48 rounded-2xl bg-white p-1.5">
              {isMe ? (
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="mr-2 size-4" /> Edit
                </DropdownMenuItem>
              ) : null}
              {message.pinned ? (
                <DropdownMenuItem onClick={() => onUnpinMessage?.(message.id)}>
                  <PinOff className="mr-2 size-4" /> Unpin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onPinMessage?.(message.id)}>
                  <Pin className="mr-2 size-4" /> Pin
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onLoadThreadMessages?.(message.id)}>
                <MessageSquare className="mr-2 size-4" /> Thread
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReply}>
                <Reply className="mr-2 size-4" /> Reply
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShowDeliveryStatus?.(message.id)}>
                <Eye className="mr-2 size-4" /> Delivery status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleForward}>
                <Forward className="mr-2 size-4" /> Forward
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTranslate}>
                <Languages className="mr-2 size-4" /> Translate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSummarize}>
                <FileText className="mr-2 size-4" /> Summarize
              </DropdownMenuItem>
              {isMe ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => onDeleteMessage?.(message.id)}>
                    <Trash2 className="mr-2 size-4" /> Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {message.reactions?.length ? (
          <div className={`mt-2 flex flex-wrap gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
            {message.reactions.map((reaction) => (
              <button
                key={`${message.id}-${reaction.emoji}`}
                type="button"
                onClick={() =>
                  reaction.reacted
                    ? onRemoveReaction?.(message.id, reaction.emoji)
                    : onAddReaction?.(message.id, reaction.emoji)
                }
                title={reaction.users?.length ? reaction.users.join(", ") : "Reaction"}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-brand-primary/30 ${reaction.reacted
                  ? "border-brand-primary/30 bg-brand-soft text-brand-primary"
                  : "border-gray-200 bg-white/90 text-gray-700"
                  }`}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {message.translation ? (
          <div
            className={`mt-2 max-w-full rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-slate-700 shadow-sm ${isMe ? "text-right" : "text-left"
              }`}
          >
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-600">
              {message.translation.isLoading ? "Translating..." : `Translated to ${message.translation.language}`}
            </div>
            {message.translation.isLoading ? (
              <div className="h-4 w-36 rounded animate-shimmer" />
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{message.translation.text}</p>
            )}
          </div>
        ) : null}

        {message.summary ? (
          <div
            className={`mt-2 max-w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-slate-700 shadow-sm ${isMe ? "text-right" : "text-left"
              }`}
          >
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
              {message.summary.isLoading ? "Summarizing..." : "Summary"}
            </div>
            {message.summary.isLoading ? (
              <div className="h-4 w-36 rounded animate-shimmer" />
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{message.summary.text}</p>
            )}
          </div>
        ) : null}

        <div
          className={`h-0 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-200 mt-0 group-hover:mt-1.5 flex flex-wrap gap-1.5 ${isMe ? "justify-end" : "justify-start"
            }`}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={`${message.id}-${emoji}-add`}
              type="button"
              onClick={() => onAddReaction?.(message.id, emoji)}
              className="inline-flex items-center justify-center rounded-full border border-dashed border-gray-200 bg-white/90 px-2 py-1 text-xs text-gray-500 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-primary hover:text-brand-primary"
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(true)}
            className="inline-flex items-center justify-center rounded-full border border-dashed border-gray-200 bg-white/90 px-2 py-1 text-xs text-gray-500 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-primary hover:text-brand-primary"
            title="More reactions"
          >
            +
          </button>
        </div>

        {showEmojiPicker && (
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>
    </div>
  );
});

export const TeamMessagePanel = memo(function TeamMessagePanel({
  selectedChannel,
  isLoading = false,
  onOpenSidebar,
  onBackMobile,
  headerActions,
  headerMeta,
  tabs = [],
  activeTab,
  onTabChange,
  messages = [],
  onAddReaction,
  onRemoveReaction,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onShowDeliveryStatus,
  onLoadThreadMessages,
  onReplyMessage,
  onTranslateMessage: onTranslateMessageSubmit,
  onSummarizeMessage,
  currentUser,
  members = [],
  onChatMember,
  onCallMember,
  onRemoveMember,
  removingMemberIds,
  isFetchingMembers = false,
  calendarContent = null,
  bottomRef,
  composer,
  emptySelectionTitle = "Select a team",
  emptySelectionDescription = "Pick a team from the left to start messaging.",
  emptyMessagesTitle = "No messages yet",
  emptyMessagesDescription = "Start the conversation below.",
  shellClassName = "bg-white",
  bodyClassName = "bg-gradient-to-b from-white to-gray-50/60 px-4 py-6 sm:px-6",
  isMessageSearchOpen,
  messageSearchQuery,
  searchMessagesQuery,
  setIsMessageSearchOpen,
  setMessageSearchQuery,
  hasMoreMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
  meetingVariant = "user",
}) {
  const [visibleMessageCount, setVisibleMessageCount] = useState(MESSAGE_RENDER_BATCH_SIZE);
  const [isJoiningActiveChannelCall, setIsJoiningActiveChannelCall] = useState(false);
  const scrollContainerRef = useRef(null);
  const pendingScrollRestoreRef = useRef(null);
  const session = useAuthStore((state) => state.session);
  const meetings = useMeetingLauncher(meetingVariant);
  const channelFilesQuery = useQuery({
    queryKey: ["channel-files", selectedChannel?.id],
    queryFn: () => listChannelFiles(selectedChannel.id),
    enabled: Boolean(selectedChannel?.id && activeTab === "files"),
    staleTime: 30 * 1000,
  });
  const activeChannelCallQuery = useQuery({
    queryKey: ["meetings", "channel-active-call", selectedChannel?.id],
    queryFn: async () => {
      const response = await apiClient.get(MEETING_CHANNEL_ACTIVE_CALL(selectedChannel.id), {
        headers: session?.accessToken
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {},
      });

      return response.data;
    },
    enabled: Boolean(selectedChannel?.id && session?.accessToken),
    refetchInterval: 3 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 5 * 1000,
  });

  const captureScrollPosition = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    pendingScrollRestoreRef.current = {
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  };

  const handleScrollToMessage = (messageId) => {
    const messageIndex = messages.findIndex((msg) => String(msg.id) === String(messageId));
    if (messageIndex === -1) return;

    const totalMessages = messages.length;
    const indexFromEnd = totalMessages - 1 - messageIndex;

    if (indexFromEnd >= visibleMessageCount) {
      setVisibleMessageCount(indexFromEnd + 20);
    }

    setTimeout(() => {
      const element = document.getElementById(`channel-msg-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("bg-brand-primary/10", "rounded-2xl", "transition-all", "duration-500");
        setTimeout(() => {
          element.classList.remove("bg-brand-primary/10", "rounded-2xl");
        }, 1500);
      }
    }, 150);
  };

  const [translateDialog, setTranslateDialog] = useState({
    open: false,
    message: null,
    language: "English",
    customLanguage: "",
  });

  const [forwardDialog, setForwardDialog] = useState({
    open: false,
    message: null,
  });

  const handleOpenForwardDialog = (msg) => {
    setForwardDialog({
      open: true,
      message: msg,
    });
  };

  const hasHiddenLoadedMessages = messages.length > visibleMessageCount;
  const hasOlderMessages = hasHiddenLoadedMessages || hasMoreMessages;

  const visibleMessages = useMemo(
    () => (hasHiddenLoadedMessages ? messages.slice(-visibleMessageCount) : messages),
    [hasHiddenLoadedMessages, messages, visibleMessageCount]
  );

  const renderedMessages = useMemo(
    () => {
      return visibleMessages.map((message, index) => {
        const isMe = message.from === "me";
        const previousMessage = visibleMessages[index - 1];

        const currentSenderId = getUserId(message.raw) || (isMe ? "me" : "them");
        const previousSenderId = previousMessage ? (getUserId(previousMessage.raw) || (previousMessage.from === "me" ? "me" : "them")) : null;

        const showAvatar = currentSenderId !== previousSenderId;

        const senderName = getSenderName(message, currentUser);
        const senderAvatar = getSenderAvatar(message, currentUser);

        const previousMessageDate = previousMessage ? new Date(previousMessage.time || previousMessage.timestamp) : null;
        const currentMessageDate = new Date(message.time || message.timestamp);
        const showDateDivider = previousMessageDate && currentMessageDate.toDateString() !== previousMessageDate.toDateString();
        const isSameUserAsPrev = Boolean(previousMessage && previousSenderId === currentSenderId && !showDateDivider);

        return {
          message,
          isMe,
          showAvatar,
          senderName,
          senderAvatar,
          isSameUserAsPrev,
        };
      });
    },
    [visibleMessages, currentUser]
  );

  const pinnedMessage = useMemo(
    () => messages.find((msg) => msg.pinned),
    [messages]
  );
  const activeChannelCall = getJoinableActiveChannelCall(activeChannelCallQuery.data);

  const handleJoinActiveChannelCall = async () => {
    if (!activeChannelCall || isJoiningActiveChannelCall) return;

    try {
      setIsJoiningActiveChannelCall(true);
      const result = await activeChannelCallQuery.refetch();
      const freshCall = getJoinableActiveChannelCall(result.data);

      if (!freshCall) {
        toast.info("This meeting has ended.");
        return;
      }

      meetings.openMeetingRoom(freshCall, {
        mode: freshCall.call_type === "audio" ? "audio" : "video",
        displayName: selectedChannel?.name,
      });
    } finally {
      setIsJoiningActiveChannelCall(false);
    }
  };

  useLayoutEffect(() => {
    const restore = pendingScrollRestoreRef.current;
    const element = scrollContainerRef.current;

    if (!restore || !element) return;

    pendingScrollRestoreRef.current = null;
    element.scrollTop = restore.scrollTop + (element.scrollHeight - restore.scrollHeight);
  }, [messages.length, visibleMessages.length]);

  const showOlderMessages = async () => {
    captureScrollPosition();

    if (hasHiddenLoadedMessages) {
      setVisibleMessageCount((count) => Math.min(messages.length, count + MESSAGE_RENDER_BATCH_SIZE));
      return;
    }

    if (hasMoreMessages && onLoadOlderMessages) {
      await onLoadOlderMessages();
      setVisibleMessageCount((count) => count + MESSAGE_RENDER_BATCH_SIZE);
    }
  };

  const isSearching = isMessageSearchOpen && messageSearchQuery.trim().length > 0;
  const displayedMessages = useMemo(() => {
    if (!isSearching) return [];

    // Remote search results from the API
    const apiMessages = searchMessagesQuery?.data || [];

    // Local search results from currently loaded messages
    const queryLower = messageSearchQuery.toLowerCase();
    const localMatches = messages.filter(msg =>
      msg.text?.toLowerCase().includes(queryLower)
    );

    // Combine and deduplicate by message ID
    const combined = [...apiMessages, ...localMatches];
    const uniqueIds = new Set();
    const uniqueMessages = combined.filter(msg => {
      if (uniqueIds.has(msg.id)) return false;
      uniqueIds.add(msg.id);
      return true;
    });

    // Sort chronologically (newest first for search results)
    const sorted = uniqueMessages.sort((a, b) => new Date(b.time || b.timestamp) - new Date(a.time || a.timestamp));

    return sorted.map((message) => {
      const isMe = message.from === "me";
      const senderName = getSenderName(message, currentUser);
      const senderAvatar = getSenderAvatar(message, currentUser);

      return {
        message,
        isMe,
        senderName,
        senderAvatar,
      };
    });
  }, [isSearching, messageSearchQuery, searchMessagesQuery?.data, currentUser, messages]);

  const openTranslateDialog = (message) => {
    setTranslateDialog({
      open: true,
      message,
      language: "English",
      customLanguage: "",
    });
  };

  const closeTranslateDialog = () => {
    setTranslateDialog((current) => ({
      ...current,
      open: false,
    }));
  };

  const submitTranslation = (event) => {
    event.preventDefault();

    const language =
      translateDialog.language === "custom"
        ? translateDialog.customLanguage.trim()
        : translateDialog.language;

    if (!translateDialog.message || !language) {
      return;
    }

    onTranslateMessageSubmit?.(
      translateDialog.message.id,
      translateDialog.message.text,
      language
    );
    closeTranslateDialog();
  };

  return (
    <section className={`flex h-full min-h-0 min-w-0 flex-1 ${shellClassName}`}>
      <div className="flex h-full flex-col flex-1 min-w-0 min-h-0 relative">
        {selectedChannel ? (
          <>
            <header className="shrink-0 border-b border-slate-100 bg-white/95 py-4 shadow-sm backdrop-blur-xl sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  {onBackMobile ? (
                    <button
                      type="button"
                      onClick={onBackMobile}
                      className="rounded-xl p-2 text-slate-600 transition-all duration-200 hover:scale-105 hover:bg-slate-100 active:scale-95 lg:hidden border border-rounded-3xl"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                  ) : null}

                  {onOpenSidebar && !onBackMobile ? (
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenSidebar}>
                      <div className="flex size-5 flex-col justify-center gap-1">
                        <div className="h-0.5 w-full bg-slate-800" />
                        <div className="h-0.5 w-full bg-slate-800" />
                        <div className="h-0.5 w-full bg-slate-800" />
                      </div>
                    </Button>
                  ) : null}

                  <ChatAvatar name={selectedChannel.name} size="size-11" />
                  <div className="min-w-0">
                    <h3 className="truncate text-xs sm:text-sm font-bold tracking-tight text-slate-800">#{selectedChannel.name}</h3>
                    {/* Need to use later */}
                    {/* <p className="text-xs font-semibold tracking-wider text-slate-400">
                      {typeof headerMeta === "function" ? headerMeta(selectedChannel) : headerMeta}
                    </p> */}
                  </div>
                </div>

                <div className="flex shrink-0 items-center sm:gap-2 gap-0">
                  {activeChannelCall ? (
                    <Button
                      type="button"
                      disabled={isJoiningActiveChannelCall}
                      className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700"
                      onClick={handleJoinActiveChannelCall}
                      title="Join active channel meeting"
                    >
                      {isJoiningActiveChannelCall ? (
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Video className="mr-2 size-4" />
                      )}
                      {isJoiningActiveChannelCall ? "Checking" : "Join meeting"}
                    </Button>
                  ) : null}
                  {headerActions}
                </div>
              </div>
            </header>

            {tabs.length ? (
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-6 py-2.5 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => onTabChange?.(tab.value)}
                      className={`border-b-2 pb-1.5 text-xs font-bold tracking-wider transition-all duration-200 hover:-translate-y-0.5 ${activeTab === tab.value
                        ? "border-brand-primary text-brand-primary"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {pinnedMessage ? (
              <div className="shrink-0 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/40 via-white to-blue-50/20 px-4 py-2.5 shadow-sm sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div
                    role="button"
                    onClick={() => handleScrollToMessage(pinnedMessage.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer group/pin hover:opacity-95"
                  >
                    <Pin className="size-4 shrink-0 text-brand-primary transition group-hover/pin:scale-110" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 group-hover/pin:text-brand-primary">
                          {getUserName(pinnedMessage.raw)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{pinnedMessage.time}</span>
                      </div>
                      <p className="truncate text-sm text-slate-600 group-hover/pin:text-slate-800">{pinnedMessage.text}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnpinMessage?.(pinnedMessage.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    title="Unpin message"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">
          {!selectedChannel ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-soft to-white text-brand-primary shadow-lg shadow-brand-primary/10">
                {isLoading ? <Users2 className="size-6 animate-pulse" /> : <MessageSquare className="size-6" />}
              </div>
              <h3 className="text-xl font-semibold text-gray-950">
                {isLoading ? "Loading teams..." : emptySelectionTitle}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-gray-500">{emptySelectionDescription}</p>
            </div>
          ) : activeTab === "team" ? (
            <div ref={scrollContainerRef} className="h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[radial-gradient(circle_at_top_left,_rgba(1,138,190,0.08),_transparent_32%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] [scrollbar-width:thin] min-w-0">
              <div className="mx-auto w-full max-w-5xl px-6 py-8">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-950">Department Information</h3>
                  <p className="mt-1 text-sm text-gray-500">Details about the department this team belongs to.</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-soft to-white text-brand-primary shadow-lg shadow-brand-primary/10">
                      <Users2 className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{selectedChannel.teamName}</h4>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Department</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Team Description</h5>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {selectedChannel.description}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">About this Department</h5>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        This team is part of the <strong>{selectedChannel.teamName}</strong>.
                        Department members collaborate here to share updates, files, and information related to their specific projects and goals.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-50 bg-gray-50/50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Members</p>
                        <p className="text-xl font-bold text-gray-900">
                          {Math.max(selectedChannel.memberCount || 0, members.length)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-50 bg-gray-50/50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Visibility</p>
                        <p className="text-xl font-bold text-gray-900">{selectedChannel.visibilityLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "members" ? (
            <div className="h-full overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin] min-w-0">
              <div className="mx-auto w-full max-w-5xl px-6 py-8">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-950">Team Members</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {members.length} {members.length === 1 ? "person" : "people"} in this team
                    </p>
                  </div>
                </div>

                {isFetchingMembers ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="size-11 rounded-full animate-shimmer" />
                          <div className="space-y-2">
                            <div className="h-4 w-32 rounded-full animate-shimmer" />
                            <div className="h-3 w-20 rounded-full animate-shimmer" />
                          </div>
                        </div>
                        <div className="h-9 w-24 rounded-xl animate-shimmer" />
                      </div>
                    ))}
                  </div>
                ) : members.length ? (
                  <div className="flex flex-col gap-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-primary/20 hover:shadow-lg hover:shadow-slate-200/70"
                      >
                        <div className="flex items-center gap-4">
                          <ChatAvatar
                            name={member.full_name || member.name || "User"}
                            src={member.avatar_url || member.avatar || member.image}
                            size="size-11"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-950">
                              {member.full_name || member.name || "Unknown Member"}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                {member.teamName || member.role || "Member"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-10 rounded-xl bg-brand-soft text-brand-primary transition-all duration-200 hover:scale-105 hover:bg-brand-primary hover:text-white active:scale-95"
                            onClick={() => onChatMember?.(member)}
                            disabled={!onChatMember}
                            title="Send Message"
                          >
                            <MessageCircle className="size-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-10 rounded-xl bg-emerald-50 text-emerald-600 transition-all duration-200 hover:scale-105 hover:bg-emerald-600 hover:text-white active:scale-95"
                            onClick={() => onCallMember?.(member)}
                            disabled={!onCallMember}
                            title="Start Call"
                          >
                            <Phone className="size-5" />
                          </Button>
                          {onRemoveMember ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-10 rounded-xl bg-red-50 text-red-600 transition-all duration-200 hover:scale-105 hover:bg-red-600 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => onRemoveMember(member)}
                              disabled={removingMemberIds?.has?.(String(getUserId(member) || member.id))}
                              title="Remove Member"
                            >
                              <Trash2 className="size-5" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gray-50 text-gray-400">
                      <Users2 className="size-8" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-950">No members found</h4>
                    <p className="mt-2 max-w-xs text-sm text-gray-500">
                      We couldn't find any members for this team.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "files" ? (
            <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin]">
              <div className="mx-auto w-full max-w-5xl px-6 py-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-950">Channel Files</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Files shared in #{selectedChannel.name}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-primary">
                    {(channelFilesQuery.data || []).length} {(channelFilesQuery.data || []).length === 1 ? "file" : "files"}
                  </span>
                </div>

                {channelFilesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-24 text-sm font-bold text-gray-500">
                    <LoaderCircle className="mr-2 size-5 animate-spin text-brand-primary" />
                    Loading files...
                  </div>
                ) : channelFilesQuery.isError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-red-50 text-red-500">
                      <FileText className="size-8" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-950">Unable to load files</h4>
                    <p className="mt-2 max-w-xs text-sm text-gray-500">
                      Please try again in a moment.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-4 rounded-xl border border-gray-100 bg-white px-4 text-brand-primary shadow-sm"
                      onClick={() => channelFilesQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (channelFilesQuery.data || []).length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {(channelFilesQuery.data || []).map((file) => (
                      <FileAttachmentCard key={file.id} attachment={file} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gray-50 text-gray-400">
                      <FolderOpen className="size-8" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-950">No files in this channel</h4>
                    <p className="mt-2 max-w-xs text-sm text-gray-500">
                      Attachments shared in this team chat will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "calendar" ? (
            calendarContent
          ) : (
            <div className="h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[radial-gradient(circle_at_top_left,_rgba(1,138,190,0.08),_transparent_32%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] [scrollbar-width:thin] min-w-0">
              <div className={`mx-auto flex min-h-full w-full max-w-5xl flex-col justify-end ${bodyClassName}`}>
                {isLoading ? (
                  <ChannelMessageSkeleton />
                ) : messages.length ? (
                  <div className="space-y-4">
                    {hasOlderMessages ? (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={showOlderMessages}
                          disabled={isLoadingOlderMessages}
                          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-brand-primary/30 hover:text-brand-primary"
                        >
                          {isLoadingOlderMessages ? "Loading..." : "Show older messages"}
                        </button>
                      </div>
                    ) : null}

                    {renderedMessages.map(({ message, isMe, showAvatar, senderName, senderAvatar, isSameUserAsPrev }, index) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isMe={isMe}
                        showAvatar={showAvatar}
                        senderName={senderName}
                        senderAvatar={senderAvatar}
                        isSameUserAsPrev={isSameUserAsPrev}
                        onAddReaction={onAddReaction}
                        onRemoveReaction={onRemoveReaction}
                        onEditMessage={onEditMessage}
                        onDeleteMessage={onDeleteMessage}
                        onPinMessage={onPinMessage}
                        onUnpinMessage={onUnpinMessage}
                        onShowDeliveryStatus={onShowDeliveryStatus}
                        onLoadThreadMessages={onLoadThreadMessages}
                        onReplyMessage={onReplyMessage}
                        onForwardMessage={handleOpenForwardDialog}
                        onTranslateMessage={openTranslateDialog}
                        onSummarizeMessage={onSummarizeMessage}
                        style={{ animationDelay: `${Math.min(index, 8) * 24}ms` }}
                      />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                ) : (
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-soft to-white text-brand-primary shadow-lg shadow-brand-primary/10">
                      <Users2 className="size-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-950">{emptyMessagesTitle}</h3>
                    <p className="mt-2 max-w-sm text-sm text-gray-500">{emptyMessagesDescription}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedChannel && activeTab === "chat" ? composer : null}
      </div>

      {isMessageSearchOpen && activeTab === "chat" ? (
        <div className="animate-fade-in-up flex flex-col border-l border-gray-200 bg-white shrink-0 z-20 shadow-[-10px_0_30px_rgba(15,23,42,0.06)] max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:w-full lg:relative lg:w-[360px] w-[320px]">
          <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-gray-200 px-4">
            <h3 className="text-base font-semibold text-gray-900">Find in team</h3>
            <button
              type="button"
              onClick={() => setIsMessageSearchOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="shrink-0 border-b border-gray-100 p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter a search keyword..."
                className="w-full rounded-md border border-gray-300 py-2.5 pr-10 pl-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                autoFocus
              />
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            </div>

          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 [scrollbar-width:thin]">
            {!isSearching ? (
              <div className="flex h-full flex-col items-center justify-center text-center mt-6">
                <div className="mb-6 relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-tr from-brand-primary/10 to-blue-50 border-4 border-white shadow-sm">
                  <div className="absolute inset-0 bg-blue-100/30 rounded-full animate-pulse"></div>
                  <Search className="size-16 text-brand-primary drop-shadow-md" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Search in this team</h4>
                <p className="mt-2 text-sm text-gray-500 max-w-[220px]">
                  Find messages and links shared in this team.
                </p>
              </div>
            ) : displayedMessages.length > 0 ? (
              <div className="space-y-3">
                {displayedMessages.map(({ message, isMe, senderName }) => (
                  <button
                    type="button"
                    onClick={() => handleScrollToMessage(message.id)}
                    key={message.id}
                    className="flex w-full flex-col text-left rounded-xl p-3 transition-all duration-200 border border-transparent hover:-translate-y-0.5 hover:border-brand-primary/15 hover:bg-gray-50 hover:shadow-sm"
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="text-sm font-semibold text-gray-900">{isMe ? "You" : senderName}</span>
                      <span className="text-xs text-gray-500">{message.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3"><HighlightedText text={message.text} query={messageSearchQuery} /></p>
                  </button>
                ))}
              </div>
            ) : searchMessagesQuery?.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="h-3.5 w-20 rounded-full animate-shimmer" />
                      <div className="h-3 w-12 rounded-full animate-shimmer" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded-full animate-shimmer" />
                      <div className="h-3 w-2/3 rounded-full animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">No results found.</div>
            )}
          </div>
        </div>
      ) : null}

      <Dialog
        open={translateDialog.open}
        onOpenChange={(open) =>
          setTranslateDialog((current) => ({
            ...current,
            open,
          }))
        }
      >
        <DialogContent className="max-w-md rounded-3xl border border-gray-200 bg-white p-0 text-gray-950 shadow-2xl">
          <form onSubmit={submitTranslation}>
            <DialogHeader className="border-b border-gray-100 px-6 pb-4 pt-6">
              <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
                <Languages className="size-5" />
              </div>
              <DialogTitle className="text-xl font-bold">Translate message</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Choose a language and the translated version will appear below the message.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
                  {translateDialog.message?.text || "No message selected."}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                  Target language
                </label>
                <Select
                  value={translateDialog.language}
                  onValueChange={(language) =>
                    setTranslateDialog((current) => ({
                      ...current,
                      language,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 bg-white shadow-xl">
                    {TRANSLATE_LANGUAGES.map((language) => (
                      <SelectItem key={language} value={language} className="rounded-xl">
                        {language}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom" className="rounded-xl">
                      Custom language
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {translateDialog.language === "custom" ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold  tracking-[0.16em] text-gray-400">
                    Custom language
                  </label>
                  <Input
                    value={translateDialog.customLanguage}
                    onChange={(event) =>
                      setTranslateDialog((current) => ({
                        ...current,
                        customLanguage: event.target.value,
                      }))
                    }
                    className="h-11 rounded-2xl border-gray-200 px-4"
                    placeholder="Example: Japanese"
                    autoFocus
                  />
                </div>
              ) : null}
            </div>

            <DialogFooter className="rounded-b-3xl border-t border-gray-100 bg-gray-50 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-gray-200 px-5"
                onClick={closeTranslateDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-2xl bg-brand-primary px-5 font-semibold text-white hover:bg-brand-primary/90"
                disabled={
                  !translateDialog.message ||
                  (translateDialog.language === "custom" && !translateDialog.customLanguage.trim())
                }
              >
                Translate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ForwardDialog
        open={forwardDialog.open}
        onOpenChange={(open) =>
          setForwardDialog((current) => ({
            ...current,
            open,
          }))
        }
        message={forwardDialog.message}
      />
    </section>
  );
});
