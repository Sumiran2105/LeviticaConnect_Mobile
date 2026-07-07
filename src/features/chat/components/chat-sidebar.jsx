import { Check, CheckCheck, Plus as PlusIcon, Search, SquarePen } from "lucide-react";
import { ChatAvatar } from "./chat-avatar";
import { motion } from "framer-motion";

const Motion = motion;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 14,
    },
  },
};

const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

function getDateGroup(contact, conversations = {}) {
  const contactId = contact.id || contact.user_id || contact.email;
  const msgs = conversations[contactId] || contact.messages || [];
  const lastMsg = msgs[msgs.length - 1];
  const fallbackTime = contact.lastMessageAt || contact.last_message_at || contact.updated_at || contact.created_at;
  const activityTime = lastMsg?.timestamp || fallbackTime || lastMsg?.time;

  if (!activityTime) return "older";

  const msgDate = new Date(activityTime);
  if (Number.isNaN(msgDate.getTime())) return "older";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (msgDate >= today) return "today";
  if (msgDate >= yesterday) return "yesterday";
  if (msgDate >= weekAgo) return "this week";
  return "older";
}

function formatSidebarTime(lastMsg) {
  if (!lastMsg) return "";

  const date = lastMsg.timestamp ? new Date(lastMsg.timestamp) : new Date(lastMsg.time);
  if (isNaN(date.getTime())) return lastMsg.time || "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  if (date >= yesterday) {
    return "Yesterday";
  }

  if (date >= weekAgo) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getContactPreview(contact, messages = []) {
  const lastMsg = messages[messages.length - 1];
  const text = lastMsg?.text || lastMsg?.content || lastMsg?.message || contact.role || "Conversation";
  return lastMsg?.from === "me" && text ? `You: ${text}` : text;
}

function SidebarMessageStatusIcon({ message }) {
  if (message?.read) {
    return <CheckCheck className="size-3 shrink-0 text-sky-500" aria-label="Read" />;
  }

  if (message?.delivered || message?.id) {
    return <CheckCheck className="size-3 shrink-0 text-brand-secondary/40" aria-label="Delivered" />;
  }

  return <Check className="size-3 shrink-0 text-brand-secondary/40" aria-label="Sent" />;
}

const GROUP_LABELS = {
  today: "Today",
  yesterday: "Yesterday",
  "this week": "ThisWeek",
  older: "Older",
};

const GROUP_ORDER = ["today", "yesterday", "this week", "older"];

export function ChatSidebar({
  activeContact,
  conversations = {},
  deferredNewChatQuery,
  isLoadingConversations,
  isMobileChatOpen,
  isNewChatMode,
  onCancelSearch,
  onNewChatClick,
  onOpenConversation,
  onSearchChange,
  onSelectSearchUser,
  searchInputRef,
  searchQuery,
  searchUsersQuery,
  sidebarResults,
  unreadCountsByContactId,
}) {
  return (
    <aside
      className={`h-full min-h-0 shrink-0 flex-col border-r border-brand-line/50 bg-gradient-to-b from-[#f6f6ff]/80 to-[#ffffff]/90 shadow-[8px_0_30px_rgba(15,23,42,0.02)] backdrop-blur-xl ${
        isMobileChatOpen ? "max-sm:hidden sm:flex sm:w-[18rem]" : "flex w-full sm:w-[18rem]"
      }`}
    >
      <div className="border-b border-brand-line/45 px-5 py-5 bg-white/40">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink">{toUserCamelCase("chat")}</h2>
            {/* No need of this description for now, can be added later if needed */}
            {/* <p className="mt-1 text-xs font-semibold text-brand-secondary/70">
              {isNewChatMode ? "Search teammates and start a conversation." : "Recent conversations"}
            </p> */}
          </div>
          <button
            type="button"
            className="rounded-xl border border-brand-line bg-white p-2.5 text-brand-secondary shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-primary/30 hover:text-brand-primary hover:shadow-lg hover:shadow-brand-primary/5 active:scale-95"
            aria-label="New chat"
            title="New chat"
            onClick={onNewChatClick}
          >
            <SquarePen className="size-4.5" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand-secondary/40" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={isNewChatMode ? "Search by name or email..." : "Search conversations..."}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-brand-line/60 bg-white/90 pl-10 pr-4 text-xs font-medium placeholder:text-brand-secondary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary/30"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-line hover:[&::-webkit-scrollbar-thumb]:bg-brand-secondary/20">
        <div className="px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[15px] sm:text-[14px] pl-1 font-bold text-brand-secondary/70 sm:text-brand-secondary/100">
              {isNewChatMode ? "Search Results" : "Recent"}
            </h3>
            {isNewChatMode ? (
              <button
                type="button"
                onClick={onCancelSearch}
                className="text-[11px] font-extrabold text-brand-primary border border-sky-200 bg-sky-50 px-2 py-1 rounded-lg transition-all duration-200 active:scale-[0.98]"
              >
                {toUserCamelCase("cancel")}
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            {isNewChatMode && deferredNewChatQuery.length <= 1 ? (
              <div className="rounded-2xl border border-dashed border-brand-line bg-white/60 px-4 py-4 text-xs font-medium text-brand-secondary/70 text-center inherit">
                Type at least 2 characters to search for a person.
              </div>
            ) : null}

            {isNewChatMode && deferredNewChatQuery.length > 1 && searchUsersQuery.isLoading ? (
              <div className="space-y-3 rounded-2xl border border-brand-line/45 bg-white/60 px-4 py-4 shadow-sm">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-9 shrink-0 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-24 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                      <div className="h-2.5 w-36 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {isNewChatMode && deferredNewChatQuery.length > 1 && searchUsersQuery.isError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-xs font-semibold text-rose-600">
                Unable to search users right now.
              </div>
            ) : null}

            {!isNewChatMode && isLoadingConversations ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl px-3.5 py-3 bg-white/40">
                    <div className="size-10 shrink-0 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-24 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                      <div className="h-2.5 w-36 rounded-full bg-[#EBF1F2]/60 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!isNewChatMode && !isLoadingConversations && sidebarResults.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-brand-line/60 bg-white/50 px-4 py-6 text-center shadow-sm">
                <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary border border-brand-line/45">
                  <SquarePen className="size-5" />
                </div>
                <p className="mt-3 text-xs font-bold text-brand-ink">{toUserCamelCase("start new conversation")}</p>
                <p className="mt-1 text-[10px] font-semibold leading-relaxed text-brand-secondary/70 lowercase">
                  search for a teammate to begin messaging.
                </p>
                <button
                  type="button"
                  onClick={onNewChatClick}
                  className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#1094EB] to-[#3B5BFC] hover:from-[#0082f4] hover:to-[#2563EB] text-white shadow-sm border-none px-4 text-[10px] font-extrabold transition-all duration-200 active:scale-[0.98]"
                >
                  {toUserCamelCase("new chat")}
                </button>
              </div>
            ) : null}

            {isNewChatMode ? (
              <Motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-1.5"
              >
                {sidebarResults.map((contact) => {
                  const contactId = contact.id || contact.user_id || contact.email;
                  const normalizedContact = {
                    ...contact,
                    id: contactId,
                  };
                  const contactName =
                    contact.full_name ||
                    (contact.first_name || contact.last_name ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : null) ||
                    contact.name ||
                    contact.display_name ||
                    "Unknown user";
                  const contactSubtitle = contact.email || "No email available";
                  const contactOnline = Boolean(
                    contact.online || contact.is_online || contact.is_active,
                  );
                  const isActive = activeContact?.id === contactId;

                  return (
                    <Motion.button
                      variants={itemVariants}
                      key={contactId}
                      type="button"
                      onClick={() => onSelectSearchUser(normalizedContact)}
                      className={`group w-full rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] flex items-center justify-between ${
                        isActive
                          ? "border-brand-primary/20 bg-white shadow-md shadow-brand-primary/5"
                          : "border-transparent bg-transparent hover:bg-white hover:border-brand-line/45 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ChatAvatar
                          image={contact.image || contact.avatar_url || contact.profile_image}
                          name={contactName}
                          online={contactOnline}
                          size="size-9"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-brand-ink transition-colors group-hover:text-brand-primary">
                            {contactName}
                          </p>
                          <p className="truncate text-[10px] font-semibold text-brand-secondary/60 mt-0.5 lowercase">
                            {contactSubtitle}
                          </p>
                        </div>
                      </div>
                    </Motion.button>
                  );
                })}
              </Motion.div>
            ) : (
              GROUP_ORDER.filter((group) =>
                sidebarResults.some(
                  (contact) => getDateGroup(contact, conversations) === group,
                ),
              ).map((group) => (
                <div key={group} className="space-y-1.5 mt-4 first:mt-0">
                  <p className="text-[12px] sm:text-[10px] font-extrabold text-brand-secondary/50 px-1.5 mb-1.5">
                    {toUserCamelCase(GROUP_LABELS[group])}
                  </p>
                  <Motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-1.5"
                  >
                    {sidebarResults
                      .filter(
                        (contact) => getDateGroup(contact, conversations) === group,
                      )
                      .map((contact) => {
                        const contactId = contact.id || contact.user_id || contact.email;
                        const normalizedContact = {
                          ...contact,
                          id: contactId,
                        };
                        const contactName =
                          contact.full_name ||
                          (contact.first_name || contact.last_name ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : null) ||
                          contact.name ||
                          contact.display_name ||
                          "Unknown user";
                        const contactOnline = contact.online;
                        const isActive = activeContact?.id === contactId;
                        const contactMessages = conversations[contactId] || contact.messages || [];
                        const latestMessage = contactMessages[contactMessages.length - 1];
                        const contactSubtitle = getContactPreview(contact, contactMessages);
                        const latestMessageIsMine =
                          latestMessage?.from === "me" ||
                          (!latestMessage && Boolean(contact.lastMessageFromMe)) ||
                          String(contactSubtitle).trim().toLowerCase().startsWith("you:");
                        const previewTime =
                          formatSidebarTime(
                            contactMessages[contactMessages.length - 1] || {
                              timestamp: contact.lastMessageAt || contact.last_message_at,
                            }
                          );
                        const unreadCount = unreadCountsByContactId[contactId];

                        return (
                          <Motion.button
                            variants={itemVariants}
                            key={contactId}
                            type="button"
                            onClick={() => onOpenConversation(normalizedContact)}
                            className={`group w-full rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] ${
                              isActive
                                ? "border-brand-primary/20 bg-white shadow-md shadow-brand-primary/5"
                                : unreadCount
                                  ? "border-brand-primary/25 bg-brand-soft/70 shadow-sm shadow-brand-primary/5 hover:bg-white"
                                : "border-transparent bg-transparent hover:bg-white hover:border-brand-line/45 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <ChatAvatar
                                image={contact.image || contact.avatar_url || contact.profile_image}
                                name={contactName}
                                online={contactOnline}
                                size="size-10"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-extrabold text-brand-ink transition-colors group-hover:text-brand-primary">
                                    {contactName}
                                  </p>
                                  {/* No need of this preview time for now, can be added later if needed */}
                                  {previewTime ? (
                                    <span className="shrink-0 text-[9px] font-semibold text-brand-secondary/100">
                                      {previewTime}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-0.5">
                                  <div
                                    className={`truncate text-[10px] ${
                                      unreadCount
                                        ? "font-bold text-brand-ink"
                                        : "font-semibold text-brand-secondary/60"
                                    } flex min-w-0 items-center gap-1`}
                                  >
                                    {latestMessageIsMine ? <SidebarMessageStatusIcon message={latestMessage} /> : null}
                                    <span className="truncate">{contactSubtitle}</span>
                                  </div>
                                </div>
                              </div>
                              {unreadCount ? (
                                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#1094EB] to-[#3B5BFC] px-1.5 text-[10px] font-bold leading-none text-white shadow-md shadow-brand-primary/10">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </Motion.button>
                        );
                      })}
                  </Motion.div>
                </div>
              ))
            )}

            {isNewChatMode &&
            deferredNewChatQuery.length > 1 &&
            !searchUsersQuery.isLoading &&
            !searchUsersQuery.isError &&
            !sidebarResults.length ? (
              <div className="rounded-2xl border border-dashed border-brand-line bg-white/60 px-4 py-4 text-xs text-brand-secondary/60 text-center lowercase">
                no users found for this search.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* <div className="mt-auto border-t border-brand-line/45 bg-white/60 p-4 backdrop-blur-xl">
        <button
          type="button"
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-brand-line/60 bg-white px-4 py-3 text-xs font-extrabold text-brand-secondary shadow-sm transition-all duration-300 hover:border-brand-primary/30 hover:bg-brand-soft hover:text-brand-primary active:scale-[0.98]"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft transition-colors duration-300 group-hover:bg-brand-primary/10">
            <PlusIcon className="size-3.5 text-brand-primary transition-transform duration-300 group-hover:rotate-90" />
          </div>
          <span>{toUserCamelCase("invite to connect")}</span>
        </button>
      </div> */}
    </aside>
  );
}
