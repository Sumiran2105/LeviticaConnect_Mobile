import {
  Check,
  CheckCheck,
  ChevronLeft,
  Eye,
  FileText,
  FolderOpen,
  Forward,
  ImageIcon,
  Languages,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Phone,
  Pin,
  PinOff,
  Reply,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LinkifiedText } from "@/components/linkified-text";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatAvatar } from "./chat-avatar";
import { ChatComposer } from "./chat-composer";
import { TypingIndicator } from "@/features/teams/components/typing-indicator";
import { ForwardDialog } from "@/features/teams/components/forward-dialog";
import { FileAttachmentCard } from "./file-attachment-card";
import { getFileName, getFileType, listChannelFiles } from "@/lib/file-utils";

const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
};

const MESSAGE_RENDER_BATCH_SIZE = 120;
const tabs = ["chat", "files", "photos"];
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
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-gray-900">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function formatDividerDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

function MessageStatusIcon({ message, isMeInBubble = false }) {
  const iconClass = isMeInBubble ? "size-3" : "size-3.5";
  if (message.isPending) {
    return (
      <Check
        className={`${iconClass} ${isMeInBubble ? "text-white/50" : "text-gray-300"}`}
      />
    );
  }

  if (message.read) {
    return (
      <CheckCheck
        className={`${iconClass} ${isMeInBubble ? "text-cyan-300" : "text-sky-500"}`}
      />
    );
  }

  if (message.delivered) {
    return (
      <CheckCheck
        className={`${iconClass} ${isMeInBubble ? "text-white/70" : "text-gray-400"}`}
      />
    );
  }

  return (
    <Check
      className={`${iconClass} ${isMeInBubble ? "text-white/70" : "text-gray-400"}`}
    />
  );
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

function isImageAttachment(file) {
  const type = getFileType(file).toLowerCase();
  const name = getFileName(file).toLowerCase();

  return (
    type.startsWith("image/") ||
    /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(name)
  );
}

export function ChatConversationPane({
  activeContact,
  activePresenceLabel,
  activeUnreadCount = 0,
  activeTab,
  bottomRef,
  currentMessages,
  editingMessageId,
  hasMoreMessages = false,
  isLoading,
  isLoadingOlderMessages = false,
  isMobileChatOpen,
  messageInput,
  onAddReaction,
  onBack,
  onCancelEdit,
  onDeleteMessage,
  onEditMessage,
  onLoadOlderMessages,
  onLoadThreadMessages,
  onReplyMessage,
  onConversationAtBottomChange,
  onInputChange,
  onKeyDown,
  onPinMessage,
  onRemoveReaction,
  onRemovePendingAttachment,
  onCancelReply,
  onSendMessage,
  onShowDeliveryStatus,
  onStartAudioCall,
  onStartVideoCall,
  onSummarizeMessage,
  onTabChange,
  onTranslateMessage,
  onUnpinMessage,
  onUploadAttachment,
  pendingAttachment,
  replyTarget,
  reactionsByMessageId,
  sendMessageMutation,
  editMessageMutation,
  typingUsers = [],
  isMessageSearchOpen,
  messageSearchQuery,
  searchMessagesQuery,
  setIsMessageSearchOpen,
  setMessageSearchQuery,
}) {
  const [visibleMessageCount, setVisibleMessageCount] = useState(
    MESSAGE_RENDER_BATCH_SIZE,
  );
  const scrollContainerRef = useRef(null);
  const pendingScrollRestoreRef = useRef(null);
  const nearBottomRef = useRef(true);
  const messageEdgesRef = useRef({
    contactId: null,
    firstId: null,
    lastId: null,
    length: 0,
  });
  const [forwardDialog, setForwardDialog] = useState({
    open: false,
    message: null,
  });
  const [translateDialog, setTranslateDialog] = useState({
    open: false,
    message: null,
    language: "English",
    customLanguage: "",
  });

  const updateNearBottom = useCallback(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const nextIsNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 120;

    if (nearBottomRef.current !== nextIsNearBottom) {
      nearBottomRef.current = nextIsNearBottom;
      onConversationAtBottomChange?.(nextIsNearBottom);
    }
  }, [onConversationAtBottomChange]);

  useEffect(() => {
    if (typingUsers.length > 0 && nearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [typingUsers.length, bottomRef]);

  const hasHiddenLoadedMessages = currentMessages.length > visibleMessageCount;
  const hasOlderMessages = hasHiddenLoadedMessages || hasMoreMessages;
  const visibleMessages = useMemo(
    () =>
      hasHiddenLoadedMessages
        ? currentMessages.slice(-visibleMessageCount)
        : currentMessages,
    [currentMessages, hasHiddenLoadedMessages, visibleMessageCount],
  );

  const captureScrollPosition = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    pendingScrollRestoreRef.current = {
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  };

  useLayoutEffect(() => {
    const restore = pendingScrollRestoreRef.current;
    const element = scrollContainerRef.current;

    if (!element) return;

    if (restore) {
      pendingScrollRestoreRef.current = null;
      element.scrollTop =
        restore.scrollTop + (element.scrollHeight - restore.scrollHeight);
      updateNearBottom();
      return;
    }

    const contactId = activeContact?.id || null;
    const firstId = visibleMessages[0]?.id || null;
    const lastId = visibleMessages[visibleMessages.length - 1]?.id || null;
    const previous = messageEdgesRef.current;
    const contactChanged = previous.contactId !== contactId;
    const initialLoad = !previous.lastId;
    const appendedMessage =
      previous.lastId &&
      previous.lastId !== lastId &&
      previous.firstId === firstId;
    const latestMessage = visibleMessages[visibleMessages.length - 1];

    messageEdgesRef.current = {
      contactId,
      firstId,
      lastId,
      length: visibleMessages.length,
    };

    if (
      contactChanged ||
      initialLoad ||
      (appendedMessage &&
        (nearBottomRef.current || latestMessage?.from === "me"))
    ) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: contactChanged || initialLoad ? "auto" : "smooth",
      });
      nearBottomRef.current = true;
      onConversationAtBottomChange?.(true);
    }
  }, [
    activeContact?.id,
    currentMessages.length,
    onConversationAtBottomChange,
    updateNearBottom,
    visibleMessages,
  ]);

  const showOlderMessages = async () => {
    captureScrollPosition();

    if (hasHiddenLoadedMessages) {
      setVisibleMessageCount((count) =>
        Math.min(currentMessages.length, count + MESSAGE_RENDER_BATCH_SIZE),
      );
      return;
    }

    await onLoadOlderMessages?.();
    setVisibleMessageCount((count) => count + MESSAGE_RENDER_BATCH_SIZE);
  };

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

    onTranslateMessage?.(
      translateDialog.message.id,
      translateDialog.message.text,
      language,
    );
    closeTranslateDialog();
  };

  const isSearching =
    isMessageSearchOpen && messageSearchQuery.trim().length > 0;
  const displayedMessages = useMemo(() => {
    if (!isSearching) return [];

    // Remote search results from the API
    const apiMessages = searchMessagesQuery?.data || [];

    // Local search results from currently loaded messages
    const queryLower = messageSearchQuery.toLowerCase();
    const localMatches = currentMessages.filter((msg) =>
      msg.text?.toLowerCase().includes(queryLower),
    );

    // Combine and deduplicate by message ID
    const combined = [...apiMessages, ...localMatches];
    const uniqueIds = new Set();
    const uniqueMessages = combined.filter((msg) => {
      if (uniqueIds.has(msg.id)) return false;
      uniqueIds.add(msg.id);
      return true;
    });

    // Sort chronologically (newest first for search results usually, or newest last?)
    // Let's sort newest first so recent messages show at top of search results.
    return uniqueMessages.sort(
      (a, b) =>
        new Date(b.time || b.timestamp) - new Date(a.time || a.timestamp),
    );
  }, [
    isSearching,
    messageSearchQuery,
    searchMessagesQuery?.data,
    currentMessages,
  ]);
  const sharedFilesQuery = useQuery({
    queryKey: ["dm-channel-files", activeContact?.channelId],
    queryFn: () => listChannelFiles(activeContact.channelId),
    enabled: Boolean(
      activeContact?.channelId &&
      (activeTab === "files" || activeTab === "photos"),
    ),
    staleTime: 30 * 1000,
  });
  const sharedFiles = useMemo(
    () => sharedFilesQuery.data || [],
    [sharedFilesQuery.data],
  );
  const sharedPhotos = useMemo(
    () => sharedFiles.filter(isImageAttachment),
    [sharedFiles],
  );
  const activeSharedItems = activeTab === "photos" ? sharedPhotos : sharedFiles;
  const activeSharedTitle =
    activeTab === "photos" ? "Shared Photos" : "Shared Files";
  const activeSharedEmptyTitle =
    activeTab === "photos" ? "No photos shared yet" : "No files shared yet";
  const activeSharedEmptyDescription =
    activeTab === "photos"
      ? "Images shared between you and this person will appear here."
      : "Attachments shared between you and this person will appear here.";

  return (
    <div
      className={`h-full min-h-0 min-w-0 flex-1 flex bg-white ${isMobileChatOpen ? "flex" : "max-sm:hidden sm:flex"}`}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col relative">
        {activeContact ? (
          <>
            <header className="shrink-0 border-b border-gray-200/80 bg-white/90 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] backdrop-blur-xl sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-3xl p-2 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:scale-105 active:scale-95 sm:hidden border border-black/10"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <ChatAvatar
                    image={
                      activeContact.image ||
                      activeContact.avatar_url ||
                      activeContact.profile_image
                    }
                    name={activeContact.name}
                    online={activeContact.online}
                    size="size-11"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-gray-950">
                      {activeContact.name}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium  tracking-[0.18em] text-gray-400">
                        {activePresenceLabel}
                      </p>
                      {activeUnreadCount > 0 ? (
                        <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold text-white">
                          {activeUnreadCount > 99 ? "99+" : activeUnreadCount}{" "}
                          unread
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={onStartVideoCall}
                    className="rounded-xl p-2 text-gray-700 transition-all duration-200 hover:scale-105 hover:bg-brand-soft hover:text-brand-primary active:scale-95"
                  >
                    <Video className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={onStartAudioCall}
                    className="rounded-xl p-2 text-gray-700 transition-all duration-200 hover:scale-105 hover:bg-brand-soft hover:text-brand-primary active:scale-95"
                  >
                    <Phone className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMessageSearchOpen(!isMessageSearchOpen)}
                    className={`rounded-xl p-2 transition-all duration-200 hover:scale-105 active:scale-95 ${isMessageSearchOpen ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-gray-700 hover:bg-brand-soft hover:text-brand-primary"}`}
                  >
                    <Search className="size-5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-xl p-2 text-gray-700 transition-all duration-200 hover:scale-105 hover:bg-brand-soft hover:text-brand-primary active:scale-95"
                  >
                    <MoreVertical className="size-5" />
                  </button>
                </div>
              </div>
            </header>

            <div className="shrink-0 border-b border-brand-line/45 bg-[#EBF1F2]/20 px-6 py-2.5 backdrop-blur-xl">
              <div className="flex items-center gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onTabChange(tab)}
                    className={`border-b-2 pb-1.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 ${activeTab === tab
                      ? "border-brand-primary text-brand-primary"
                      : "border-transparent text-brand-secondary/60 hover:text-brand-ink"
                      }`}
                  >
                    {toUserCamelCase(tab)}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <div
          ref={scrollContainerRef}
          onScroll={updateNearBottom}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full overscroll-contain bg-[radial-gradient(circle_at_top_left,_rgba(1,138,190,0.08),_transparent_32%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-4 py-6 sm:px-6 [scrollbar-width:thin]"
        >
          {!activeContact ? (
            <div className="flex min-h-[420px] h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-soft to-white text-brand-primary shadow-lg shadow-brand-primary/10">
                <Video className="size-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-950">
                Start a conversation
              </h3>
              <p className="mt-2 max-w-sm text-sm text-gray-500">
                Choose a teammate from the left or start a new chat to begin
                messaging.
              </p>
            </div>
          ) : null}

          {activeContact &&
            (activeTab === "files" || activeTab === "photos") ? (
            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    {activeSharedTitle}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    Shared between you and {activeContact.name}
                  </p>
                </div>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-primary">
                  {activeSharedItems.length}{" "}
                  {activeSharedItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              {sharedFilesQuery.isLoading ? (
                <div className="flex items-center justify-center py-24 text-sm font-bold text-gray-500">
                  <LoaderCircle className="mr-2 size-5 animate-spin text-brand-primary" />
                  Loading shared files...
                </div>
              ) : sharedFilesQuery.isError ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-red-50 text-red-500">
                    <FileText className="size-8" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-950">
                    Unable to load shared files
                  </h4>
                  <p className="mt-2 max-w-xs text-sm text-gray-500">
                    Please try again in a moment.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-4 rounded-xl border border-gray-100 bg-white px-4 text-brand-primary shadow-sm"
                    onClick={() => sharedFilesQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : activeSharedItems.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {activeSharedItems.map((file) => (
                    <FileAttachmentCard key={file.id} attachment={file} isSharedFile={true} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gray-50 text-gray-400">
                    {activeTab === "photos" ? (
                      <ImageIcon className="size-8" />
                    ) : (
                      <FolderOpen className="size-8" />
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-gray-950">
                    {activeSharedEmptyTitle}
                  </h4>
                  <p className="mt-2 max-w-xs text-sm text-gray-500">
                    {activeSharedEmptyDescription}
                  </p>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="space-y-4 px-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  {i % 2 !== 0 && (
                    <div className="size-8 shrink-0 rounded-full animate-shimmer" />
                  )}
                  <div
                    className={`space-y-2 ${i % 2 === 0 ? "items-end" : "items-start"} flex flex-col`}
                  >
                    <div
                      className={`h-10 rounded-[22px] animate-shimmer shadow-sm ${i % 3 === 0 ? "w-48" : i % 3 === 1 ? "w-64" : "w-36"}`}
                    />
                    <div
                      className={`h-2.5 rounded-full animate-shimmer ${i % 2 === 0 ? "w-16" : "w-20"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeContact && activeTab === "chat" ? (
            <div className="space-y-4">
              {hasOlderMessages ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={showOlderMessages}
                    disabled={isLoadingOlderMessages}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-brand-primary/30 hover:text-brand-primary"
                  >
                    {isLoadingOlderMessages
                      ? "Loading..."
                      : "Show older messages"}
                  </button>
                </div>
              ) : null}

              {visibleMessages.map((message, index) => {
                const isMe = message.from === "me";
                const nextMessage = visibleMessages[index + 1];
                const prevMessage = visibleMessages[index - 1];
                const showDateDivider =
                  !prevMessage ||
                  new Date(message.timestamp).toDateString() !==
                  new Date(prevMessage.timestamp).toDateString();
                const isSameUserAsPrev =
                  prevMessage?.from === message.from && !showDateDivider;
                const showAvatar = !isMe && nextMessage?.from !== "them";
                const canUseMessageActions = Boolean(
                  activeContact?.channelId && message.id && !message.isPending,
                );

                return (
                  <div
                    key={message.id}
                    className={`w-full ${isSameUserAsPrev ? "!mt-1" : ""}`}
                  >
                    {showDateDivider ? (
                      <div className="flex justify-center my-4 animate-fade-in-up">
                        <span className="rounded-full bg-slate-100/80 px-3 py-1 text-[10px] font-semibold text-slate-500 shadow-sm border border-slate-200/40">
                          {formatDividerDate(message.timestamp)}
                        </span>
                      </div>
                    ) : null}
                    <div
                      className={`chat-message-enter flex w-full items-start gap-3 ${isMe ? "justify-end" : "justify-start"} ${isSameUserAsPrev ? "!mt-1" : ""}`}
                      style={{ animationDelay: `${Math.min(index, 8) * 24}ms` }}
                    >
                      {!isMe ? (
                        <div
                          className={`h-8 w-8 shrink-0 ${isSameUserAsPrev ? "mt-0" : "mt-2"}`}
                        >
                          {showAvatar ? (
                            <ChatAvatar
                              image={
                                activeContact.image ||
                                activeContact.avatar_url ||
                                activeContact.profile_image
                              }
                              name={activeContact.name}
                              online={false}
                              size="size-8"
                            />
                          ) : null}
                        </div>
                      ) : null}

                      <div
                        className={`group/bubble flex flex-col ${isMe
                          ? "max-w-full items-end"
                          : "max-w-[86%] sm:max-w-[78%] lg:max-w-[90%] items-start"
                          }`}
                      >
                        <div className={`flex items-center gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`chat-bubble relative min-w-0 w-full overflow-hidden rounded-[22px] px-4 pt-2.5 break-all whitespace-pre-wrap overflow-wrap:anywhere pb-3.5 pr-12 text-left text-sm leading-relaxed transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.012] active:scale-[0.99] ${isMe
                              ? "rounded-br-md bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20"
                              : "rounded-bl-md border border-brand-line/45 bg-white text-brand-ink shadow-sm hover:border-brand-line hover:shadow-md"
                              }`}
                          >
                            {message.isForwarded && (
                              <span className={`flex items-center gap-1 text-[11px] font-medium mb-1.5 italic ${isMe ? "text-white/70" : "text-brand-secondary/70"}`}>
                                <Forward className="size-3 shrink-0" />
                                <span>{toUserCamelCase("forwarded")}</span>
                              </span>
                            )}
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
                            {message.pinned ? <Pin className="mr-1 inline size-3.5" /> : null}
                            {message.text && (!message.attachments?.length || message.text !== message.attachments[0]?.name) ? (
                              <LinkifiedText
                                text={message.text}
                                className="whitespace-pre-wrap break-words"
                                linkClassName={isMe ? "font-semibold text-white underline underline-offset-2" : "font-semibold text-brand-primary underline underline-offset-2"}
                              />
                            ) : null}
                            {message.attachments?.map((attachment) => (
                              <FileAttachmentCard key={attachment.id} attachment={attachment} isMe={isMe} />
                            ))}

                            {/* WhatsApp-style inside time/status badge */}
                            <div
                              className={`absolute bottom-1 right-2.5 flex items-center gap-1 text-[9px] pointer-events-none select-none leading-none mt-1 sm:pt-0 ${isMe ? "text-white/65" : "text-gray-400"
                                }`}
                            >
                              <span>{message.time}</span>
                              {isMe ? (
                                <MessageStatusIcon
                                  message={message}
                                  isMeInBubble={true}
                                />
                              ) : null}
                            </div>
                          </div>

                          {canUseMessageActions ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="mt-1 rounded-full border border-gray-200 bg-white/90 p-1.5 text-gray-400 opacity-0 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:text-brand-primary group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100"
                                  aria-label="Message actions"
                                >
                                  <MoreHorizontal className="size-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align={isMe ? "end" : "start"}
                                className="w-48 rounded-2xl bg-white p-1.5"
                              >
                                {isMe ? (
                                  <DropdownMenuItem
                                    onClick={() => onEditMessage?.(message.id)}
                                  >
                                    <Pencil className="mr-2 size-4" />{" "}
                                    {toUserCamelCase("edit")}
                                  </DropdownMenuItem>
                                ) : null}
                                {message.pinned ? (
                                  <DropdownMenuItem
                                    onClick={() => onUnpinMessage?.(message.id)}
                                  >
                                    <PinOff className="mr-2 size-4" />{" "}
                                    {toUserCamelCase("unpin")}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => onPinMessage?.(message.id)}
                                  >
                                    <Pin className="mr-2 size-4" />{" "}
                                    {toUserCamelCase("pin")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    onLoadThreadMessages?.(message.id)
                                  }
                                >
                                  <MessageSquare className="mr-2 size-4" />{" "}
                                  {toUserCamelCase("thread")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onReplyMessage?.({
                                      ...message,
                                      senderName: isMe ? "You" : activeContact?.name,
                                    })
                                  }
                                >
                                  <Reply className="mr-2 size-4" />{" "}
                                  {toUserCamelCase("reply")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onShowDeliveryStatus?.(message.id)
                                  }
                                >
                                  <Eye className="mr-2 size-4" />{" "}
                                  {toUserCamelCase("delivery status")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setForwardDialog({
                                      open: true,
                                      message: {
                                        ...message,
                                        senderName: isMe
                                          ? "You"
                                          : activeContact?.name,
                                      },
                                    })
                                  }
                                >
                                  <Forward className="mr-2 size-4" />{" "}
                                  {toUserCamelCase("forward")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openTranslateDialog(message)}
                                >
                                  <Languages className="mr-2 size-4" />{" "}
                                  {toUserCamelCase("translate")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onSummarizeMessage?.(
                                      message.id,
                                      message.text,
                                    )
                                  }
                                >
                                  <FileText className="mr-2 size-4" />{" "}
                                  {toUserCamelCase("summarize")}
                                </DropdownMenuItem>
                                {isMe ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() =>
                                        onDeleteMessage?.(message.id)
                                      }
                                    >
                                      <Trash2 className="mr-2 size-4" />{" "}
                                      {toUserCamelCase("delete")}
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>

                        {(reactionsByMessageId[message.id] || []).length ? (
                          <div
                            className={`mt-2 flex flex-wrap gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            {(reactionsByMessageId[message.id] || []).map(
                              (reaction) => (
                                <button
                                  key={`${message.id}-${reaction.emoji}`}
                                  type="button"
                                  onClick={() =>
                                    reaction.reacted
                                      ? onRemoveReaction(
                                        message.id,
                                        reaction.emoji,
                                      )
                                      : onAddReaction(
                                        message.id,
                                        reaction.emoji,
                                      )
                                  }
                                  title={
                                    reaction.users?.length
                                      ? reaction.users.join(", ")
                                      : "Reaction"
                                  }
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-brand-primary/30 animate-reaction-pop ${reaction.reacted
                                    ? "border-brand-primary/30 bg-brand-soft text-brand-primary"
                                    : "border-gray-200 bg-white/90 text-gray-700"
                                    }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span>{reaction.count}</span>
                                </button>
                              ),
                            )}
                          </div>
                        ) : null}

                        {message.translation ? (
                          <div
                            className={`mt-2 max-w-full rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-slate-700 shadow-sm ${isMe ? "text-right" : "text-left"
                              }`}
                          >
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-600">
                              {message.translation.isLoading
                                ? "Translating..."
                                : `Translated to ${message.translation.language}`}
                            </div>
                            <p className="leading-relaxed">
                              {message.translation.text || "Working on it..."}
                            </p>
                          </div>
                        ) : null}

                        {message.summary ? (
                          <div
                            className={`mt-2 max-w-full rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-slate-700 shadow-sm ${isMe ? "text-right" : "text-left"
                              }`}
                          >
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                              {message.summary.isLoading
                                ? "Summarizing..."
                                : "Summary"}
                            </div>
                            <p className="leading-relaxed">
                              {message.summary.text || "Working on it..."}
                            </p>
                          </div>
                        ) : null}

                        <div
                          className={`h-0 overflow-hidden opacity-0 transition-all duration-200 mt-0 group-hover/bubble:h-auto group-hover/bubble:opacity-100 group-hover/bubble:mt-1.5 group-focus-within/bubble:h-auto group-focus-within/bubble:opacity-100 group-focus-within/bubble:mt-1.5 flex flex-wrap gap-1.5 ${isMe ? "justify-end" : "justify-start"
                            }`}
                        >
                          {["👍", "❤️", "😂"].map((emoji) => (
                            <button
                              key={`${message.id}-${emoji}-add`}
                              type="button"
                              onClick={() => onAddReaction(message.id, emoji)}
                              className="inline-flex items-center justify-center rounded-full border border-dashed border-gray-200 bg-white/90 px-2 py-1 text-xs text-gray-500 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-primary hover:text-brand-primary"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {typingUsers && typingUsers.length > 0 ? (
                <div className="group chat-message-enter flex w-full items-start gap-3 justify-start !mt-2">
                  <div className="h-8 w-8 shrink-0 mt-1">
                    <ChatAvatar
                      image={
                        activeContact?.image ||
                        activeContact?.avatar_url ||
                        activeContact?.profile_image
                      }
                      name={activeContact?.name || "User"}
                      online={false}
                      size="size-8"
                    />
                  </div>
                  <div className="flex flex-col items-start max-w-[72%]">
                    <div className="chat-bubble relative rounded-[22px] rounded-bl-md border border-white/80 bg-gradient-to-br from-white via-white to-slate-50 px-4 py-3.5 text-left shadow-slate-200/70">
                      <span className="flex items-center gap-1.5 py-1">
                        <span className="size-2 rounded-full bg-brand-primary/80 animate-bounce [animation-delay:0ms]" />
                        <span className="size-2 rounded-full bg-brand-primary/80 animate-bounce [animation-delay:150ms]" />
                        <span className="size-2 rounded-full bg-brand-primary/80 animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          ) : null}
        </div>

        {activeContact ? (
          <>
            <ChatComposer
              editingMessageId={editingMessageId}
              isSending={
                sendMessageMutation.isPending || editMessageMutation?.isPending
              }
              messageInput={messageInput}
              onCancelEdit={onCancelEdit}
              onCancelReply={onCancelReply}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              onRemovePendingAttachment={onRemovePendingAttachment}
              onSend={onSendMessage}
              pendingAttachment={pendingAttachment}
              replyTarget={replyTarget}
              onUploadAttachment={onUploadAttachment}
            />
          </>
        ) : null}
      </div>

      {isMessageSearchOpen ? (
        <div className="animate-fade-in-up flex w-[320px] shrink-0 flex-col border-l border-brand-line/45 bg-white sm:w-[360px] z-10 shadow-[-10px_0_30px_rgba(15,23,42,0.04)]">
          <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-brand-line/45 px-4 bg-white/40">
            <h3 className="text-base font-extrabold text-brand-ink">
              {toUserCamelCase("find in chat")}
            </h3>
            <button
              type="button"
              onClick={() => setIsMessageSearchOpen(false)}
              className="rounded-xl p-1.5 text-brand-secondary/60 hover:bg-brand-soft hover:text-brand-ink transition"
            >
              <X className="size-4.5" />
            </button>
          </header>

          <div className="shrink-0 border-b border-brand-line/30 p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="search messages..."
                className="h-10 w-full rounded-xl border border-brand-line/60 bg-[#ebf1f2]/20 pr-10 pl-3 text-xs font-medium placeholder:text-brand-secondary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary/30"
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                autoFocus
              />
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-brand-secondary/40" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 [scrollbar-width:thin]">
            {!isSearching ? (
              <div className="flex h-full flex-col items-center justify-center text-center mt-6">
                <div className="mb-6 relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-tr from-brand-primary/10 to-blue-50 border-4 border-white shadow-sm">
                  <div className="absolute inset-0 bg-blue-100/30 rounded-full animate-pulse"></div>
                  <Search className="size-16 text-brand-primary drop-shadow-md" />
                </div>
                <h4 className="text-sm font-bold text-brand-ink">
                  {toUserCamelCase("search in this chat")}
                </h4>
                <p className="mt-2 text-xs text-brand-secondary font-medium max-w-[220px] leading-relaxed lowercase">
                  find messages and links shared in this chat.
                </p>
              </div>
            ) : displayedMessages.length > 0 ? (
              <div className="space-y-3">
                {displayedMessages.map((message) => (
                  <div
                    key={message.id}
                    className="flex w-full flex-col text-left rounded-2xl p-3 hover:bg-brand-soft/40 transition border border-transparent hover:border-brand-line/45"
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="text-xs font-extrabold text-brand-ink">
                        {message.from === "me" ? "You" : activeContact?.name}
                      </span>
                      <span className="text-[10px] font-semibold text-brand-secondary/55">
                        {message.time}
                      </span>
                    </div>
                    <p className="text-xs text-brand-secondary leading-relaxed line-clamp-3">
                      <HighlightedText
                        text={message.text}
                        query={messageSearchQuery}
                      />
                    </p>
                  </div>
                ))}
              </div>
            ) : searchMessagesQuery?.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-brand-line/45 bg-white p-3 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="h-3.5 w-20 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                      <div className="h-3 w-12 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                      <div className="h-3 w-2/3 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-semibold text-brand-secondary lowercase">
                no results found.
              </div>
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
        <DialogContent className="max-w-md rounded-[32px] border border-brand-line bg-white p-0 text-brand-ink shadow-2xl overflow-hidden">
          <form onSubmit={submitTranslation}>
            <DialogHeader className="border-b border-brand-line/30 px-6 pb-4 pt-6">
              <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary border border-brand-line/20">
                <Languages className="size-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                {toUserCamelCase("translate message")}
              </DialogTitle>
              <DialogDescription className="text-xs text-brand-secondary font-medium leading-relaxed lowercase">
                choose a language and the translated version will appear below
                the message.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-2xl border border-brand-line/45 bg-[#ebf1f2]/20 px-4 py-3">
                <p className="line-clamp-3 text-xs leading-relaxed text-brand-secondary font-medium lowercase">
                  {translateDialog.message?.text || "no message selected."}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-ink">
                  {toUserCamelCase("target language")}
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
                  <SelectTrigger className="h-11 w-full rounded-xl border-brand-line/60 bg-white px-4 text-xs font-semibold text-brand-ink focus:ring-2 focus:ring-brand-primary/10">
                    <SelectValue
                      placeholder={toUserCamelCase("select language")}
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-brand-line/60 bg-white shadow-xl">
                    {TRANSLATE_LANGUAGES.map((language) => (
                      <SelectItem
                        key={language}
                        value={language}
                        className="rounded-lg text-xs font-medium cursor-pointer focus:bg-brand-soft"
                      >
                        {toUserCamelCase(language)}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value="custom"
                      className="rounded-lg text-xs font-medium cursor-pointer focus:bg-brand-soft"
                    >
                      {toUserCamelCase("custom language")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {translateDialog.language === "custom" ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-ink">
                    {toUserCamelCase("custom language")}
                  </label>
                  <Input
                    value={translateDialog.customLanguage}
                    onChange={(event) =>
                      setTranslateDialog((current) => ({
                        ...current,
                        customLanguage: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border-brand-line/60 px-4 text-xs font-medium"
                    placeholder="example: Japanese"
                    autoFocus
                  />
                </div>
              ) : null}
            </div>

            <DialogFooter className="rounded-b-[32px] border-t border-brand-line/30 bg-brand-soft/40 px-6 py-4 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-brand-line/80 px-5 text-xs font-bold text-brand-secondary hover:bg-brand-soft"
                onClick={closeTranslateDialog}
              >
                {toUserCamelCase("cancel")}
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-gradient-to-r from-[#1094EB] to-[#3B5BFC] hover:from-[#0082f4] hover:to-[#2563EB] text-white shadow-md border-none px-5 text-xs font-extrabold transition-all duration-200 active:scale-[0.98]"
                disabled={
                  !translateDialog.message ||
                  (translateDialog.language === "custom" &&
                    !translateDialog.customLanguage.trim())
                }
              >
                {toUserCamelCase("translate")}
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
            message: open ? current.message : null,
          }))
        }
        message={forwardDialog.message}
      />
    </div>
  );
}
