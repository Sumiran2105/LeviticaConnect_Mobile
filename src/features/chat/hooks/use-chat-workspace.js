import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FIREBASE_MESSAGE_EVENT } from "@/components/firebase-notification-bridge";
import {
  CHANNEL_AI_SUMMARY,
  CHANNEL_AI_TRANSLATE,
  CHANNEL_MESSAGE,
  CHANNEL_MESSAGE_READ,
  CHANNEL_MESSAGE_DELIVERY_STATUS,
  CHANNEL_MESSAGE_PIN,
  CHANNEL_MESSAGE_THREAD,
  CHANNEL_MESSAGE_UNPIN,
  CHANNEL_MESSAGES,
  CHAT_WEBSOCKET,
  DM_CHANNELS,
  DM_SEND_MESSAGE,
  DM_USERS_SEARCH,
  MESSAGE_BULK_READ,
  MESSAGE_BULK_READ_STATUS,
  MESSAGE_REACTION,
  MESSAGE_REACTIONS,
  MESSAGE_READ_STATUS,
  MESSAGES_SEARCH,
  PRESENCE_USER,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { createRealtimeSocket } from "@/lib/realtime-socket";
import { getProfileImageSource } from "@/lib/image-utils";
import { useAuthStore } from "@/store/auth-store";
import { formatStatusLabel, normalizePresence } from "@/lib/presence-utils";
import {
  formatMessageDateTime,
  getChatStorageKey,
  getInitialChatState,
  getMessageTimestamp,
  mergeMessagesAndReconcilePending,
  mergeMessages,
  normalizeCollection,
  normalizeMessageReactions,
  normalizeReadStatus,
  normalizeDmChannels,
  normalizeSearchResults,
  normalizeServerMessage,
  sortMessagesChronologically,
  getSessionUserIdentifiers,
} from "../utils/chat-utils";
import { uploadFiles } from "@/lib/file-utils";

function normalizeContactId(contact) {
  if (!contact) return null;

  const id = contact.id || contact.user_id || contact.email;
  if (!id) return null;
  const image = getContactImageSource(contact);

  return {
    ...contact,
    id,
    image,
    avatar_url: image,
    profile_image: image,
  };
}

function getContactImageSource(contact = {}) {
  const nestedUser =
    contact.user ||
    contact.peer ||
    contact.member ||
    contact.profile ||
    contact.participant ||
    contact.contact ||
    contact.from_user ||
    contact.sender ||
    {};

  return (
    getProfileImageSource(contact) ||
    getProfileImageSource(nestedUser) ||
    contact.profile_image_url ||
    contact.profile_image ||
    contact.avatar_url ||
    contact.image_url ||
    contact.image ||
    contact.photo_url ||
    contact.picture ||
    nestedUser.profile_image_url ||
    nestedUser.profile_image ||
    nestedUser.avatar_url ||
    nestedUser.image_url ||
    nestedUser.image ||
    ""
  );
}

function getFirebaseMessageText(payload = {}) {
  return (
    payload.content ||
    payload.message ||
    payload.body ||
    payload.text ||
    payload.notification_body ||
    payload.description ||
    "New message"
  );
}

function isLikelyFileMessage(payload = {}) {
  const message = payload.message || {};
  const contentType = String(
    payload.content_type ||
      payload.contentType ||
      payload.message_type ||
      payload.messageType ||
      message.content_type ||
      message.contentType ||
      message.message_type ||
      message.messageType ||
      ""
  ).toLowerCase();
  const content = String(
    payload.content ||
      payload.message ||
      payload.text ||
      message.content ||
      message.message ||
      message.text ||
      ""
  );

  return Boolean(
    contentType.includes("file") ||
      payload.file_id ||
      payload.file ||
      message.file_id ||
      message.file ||
      (Array.isArray(payload.file_ids) && payload.file_ids.length) ||
      (Array.isArray(message.file_ids) && message.file_ids.length) ||
      /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z|png|jpe?g|webp|gif|mp4|mov|mp3|wav)$/i.test(content.trim())
  );
}

function getFirebaseMessageSenderIds(payload = {}) {
  const fromUser = payload.from_user || payload.sender || payload.user || {};

  return [
    payload.sender_id,
    payload.senderId,
    payload.from_user_id,
    payload.fromUserId,
    payload.user_id,
    payload.userId,
    fromUser.id,
    fromUser.user_id,
    payload.sender_email,
    payload.senderEmail,
    payload.email,
    fromUser.email,
  ]
    .filter(Boolean)
    .map(String);
}

function getFirebaseMessageContactName(payload = {}) {
  const fromUser = payload.from_user || payload.sender || payload.user || {};

  return (
    payload.sender_name ||
    payload.senderName ||
    payload.from_user_name ||
    payload.fromUserName ||
    fromUser.full_name ||
    fromUser.name ||
    payload.title ||
    "Unknown user"
  );
}

function getFirebaseMessageContactImage(payload = {}) {
  const fromUser = payload.from_user || payload.sender || payload.user || {};

  return getContactImageSource({
    ...fromUser,
    profile_image_url: payload.sender_profile_image_url || payload.profile_image_url,
    profile_image: payload.sender_profile_image || payload.profile_image,
    avatar_url: payload.sender_avatar_url || payload.avatar_url,
    image_url: payload.sender_image_url || payload.image_url,
    image: payload.sender_image || payload.image,
  });
}

function removeMessageById(messages = [], messageId) {
  return messages.filter((message) => String(message.id) !== String(messageId));
}

function updateMessageById(messages = [], messageId, patch) {
  return messages.map((message) =>
    String(message.id) === String(messageId)
      ? {
          ...message,
          ...patch,
          raw: {
            ...message.raw,
            ...(patch.raw || {}),
          },
        }
      : message
  );
}

function replaceMessageReactions(messages = [], messageId, reactions) {
  const nextReactions = normalizeMessageReactions(reactions);

  return updateMessageById(messages, messageId, {
    reactions: nextReactions,
  });
}

function updateMessageReaction(messages = [], messageId, emoji, delta, currentUserName = "You") {
  return updateMessageById(messages, messageId, {
    reactions: (() => {
      const message = messages.find((item) => String(item.id) === String(messageId));
      const reactions = normalizeCollection(message?.reactions);
      const existingReaction = reactions.find((reaction) => reaction.emoji === emoji);

      if (!existingReaction && delta > 0) {
        return [...reactions, { emoji, count: 1, users: [currentUserName], reacted: true }];
      }

      return reactions
        .map((reaction) =>
          reaction.emoji === emoji
            ? {
                ...reaction,
                count: Math.max(0, Number(reaction.count || 0) + delta),
                reacted: delta > 0,
              }
            : reaction
        )
        .filter((reaction) => Number(reaction.count || 0) > 0);
    })(),
  });
}

function getLastMessageTime(messages = []) {
  const lastMessage = messages[messages.length - 1];
  return Number(lastMessage?.timestamp) || (lastMessage?.time ? new Date(lastMessage.time).getTime() : 0) || 0;
}

function getContactActivityTime(contact, conversations = {}) {
  const contactId = contact?.id || contact?.user_id || contact?.email;
  const messages = conversations[contactId] || contact?.messages || [];
  const serverValue = contact?.lastMessageAt || contact?.last_message_at || contact?.updated_at || contact?.created_at;
  const serverTime = serverValue ? new Date(serverValue).getTime() : 0;

  return Math.max(getLastMessageTime(messages), Number.isNaN(serverTime) ? 0 : serverTime);
}

function getLatestContactPatch(messages = [], fallback = {}) {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return {};
  }

  const lastMessageAt = lastMessage.timestamp || getMessageTimestamp(lastMessage) || fallback.lastMessageAt || Date.now();

  return {
    role: lastMessage.from === "me" ? `You: ${lastMessage.text || fallback.text || ""}` : lastMessage.text || fallback.text || "Conversation",
    lastMessageAt,
    lastMessageFromMe: lastMessage.from === "me",
  };
}

function contactLatestMessageIsMine(contact, conversations = {}) {
  const contactId = contact?.id || contact?.user_id || contact?.email;
  const messages = conversations[contactId] || contact?.messages || [];
  const lastMessage = messages[messages.length - 1];
  const localMessageTime = getLastMessageTime(messages);
  const serverValue = contact?.lastMessageAt || contact?.last_message_at || contact?.updated_at || contact?.created_at;
  const serverTime = serverValue ? new Date(serverValue).getTime() : 0;

  if (
    !Number.isNaN(serverTime) &&
    serverTime > localMessageTime &&
    typeof contact?.lastMessageFromMe === "boolean"
  ) {
    return contact.lastMessageFromMe;
  }

  return lastMessage?.from === "me" || String(contact?.role || "").trim().toLowerCase().startsWith("you:");
}

function getChannelActivityTime(channel) {
  const rawValue =
    channel?.last_message_at ||
    channel?.lastMessageAt ||
    channel?.updated_at ||
    channel?.created_at ||
    null;
  const parsed = rawValue ? new Date(rawValue).getTime() : 0;

  return Number.isNaN(parsed) ? 0 : parsed;
}

function getDmUnreadCount(channel) {
  return Number(channel?.unread_count ?? channel?.unreadCount ?? channel?.unread ?? 0) || 0;
}

function getDmUnreadTotal(channels = []) {
  return channels.reduce((total, channel) => total + getDmUnreadCount(channel), 0);
}

function createPendingMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pending-${crypto.randomUUID()}`;
  }

  return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createReplyReference(message) {
  if (!message?.id) return null;

  return {
    id: String(message.id),
    rootId: message.replyTo?.rootId || message.raw?.root_id || message.raw?.rootId || message.id,
    senderName: message.senderName || message.raw?.sender_name || message.raw?.sender?.name || "Message",
    text: message.text || message.raw?.content || "",
    time: message.time || "",
  };
}

function isServerMessageId(messageId) {
  return typeof messageId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
}

function markIncomingMessagesRead(messages = []) {
  return messages.map((message) =>
    message.from === "them" ? { ...message, read: true, delivered: true } : message
  );
}

function getReadableIncomingMessageIds(messages = []) {
  return messages
    .filter((message) => message.from === "them" && message.id && isServerMessageId(message.id))
    .map((message) => message.id);
}

function applyMessageReadStatus(messages = [], messageId, readStatus, currentUserIds = []) {
  const readByIds = normalizeReadStatus(readStatus).map((read) =>
    String(read?.user_id || read?.userId || read?.id || read)
  );
  const readBySomeoneElse = readByIds.some((id) => !currentUserIds.includes(String(id)));
  const hasReadReceipt = readByIds.length ? readBySomeoneElse : Boolean(readStatus?.is_read);

  if (!hasReadReceipt) {
    return messages;
  }

  return messages.map((message) =>
    String(message.id) === String(messageId) && message.from === "me"
      ? { ...message, read: true, delivered: true }
      : message
  );
}

function getTranslatedText(data) {
  const payload = data?.data || data?.result || data;

  if (typeof payload === "string") {
    return payload;
  }

  return (
    payload?.translated_text ||
    payload?.translatedText ||
    payload?.translation ||
    payload?.translated ||
    payload?.text ||
    payload?.message ||
    ""
  );
}

function getSummaryText(data) {
  const payload = data?.data || data?.result || data;

  if (typeof payload === "string") {
    return payload;
  }

  return (
    payload?.summary ||
    payload?.summary_text ||
    payload?.summaryText ||
    payload?.summarized_text ||
    payload?.summarizedText ||
    payload?.text ||
    payload?.message ||
    ""
  );
}

function replaceMessage(messages = [], nextMessage) {
  return messages.map((message) =>
    String(message.id) === String(nextMessage.id)
      ? {
          ...message,
          ...nextMessage,
          raw: {
            ...message.raw,
            ...nextMessage.raw,
          },
        }
      : message
  );
}

const MESSAGE_PAGE_SIZE = 50;

function flattenMessagePages(data) {
  if (!data?.pages) return [];
  return sortMessagesChronologically(data.pages.flat());
}

function updateMessagePages(current, updater) {
  const currentMessages = flattenMessagePages(current);
  const nextValue = typeof updater === "function" ? updater(currentMessages) : updater;
  const nextMessages = sortMessagesChronologically(nextValue || []);

  if (!current?.pages) {
    return { pageParams: [null], pages: [nextMessages] };
  }

  return {
    ...current,
    pageParams: [current.pageParams?.[0] ?? null],
    pages: [nextMessages],
  };
}

export function useChatWorkspace(initialTargetUser = null) {
  const session = useAuthStore((state) => state.session);
  const queryClient = useQueryClient();
  const chatStorageKey = getChatStorageKey(session);
  const getTargetContact = useCallback((state) => {
    if (!initialTargetUser) return null;

    const targetId = initialTargetUser.user_id || initialTargetUser.id || initialTargetUser.email;
    if (!targetId) return null;

    const targetIdentifiers = [targetId, initialTargetUser.user_id, initialTargetUser.id, initialTargetUser.email]
      .filter(Boolean)
      .map(String);
    const existingContact = state.contacts.find((contact) => {
      const contactIdentifiers = [contact.id, contact.user_id, contact.email, contact.role]
        .filter(Boolean)
        .map(String);

      return targetIdentifiers.some((identifier) => contactIdentifiers.includes(identifier));
    });

    return normalizeContactId({
      ...existingContact,
      id: targetId,
      user_id: initialTargetUser.user_id || initialTargetUser.id,
      email: initialTargetUser.email,
      name:
        initialTargetUser.full_name ||
        (initialTargetUser.first_name || initialTargetUser.last_name ? `${initialTargetUser.first_name || ''} ${initialTargetUser.last_name || ''}`.trim() : null) ||
        initialTargetUser.name ||
        initialTargetUser.display_name ||
        existingContact?.name ||
        initialTargetUser.email ||
        "Unknown user",
      role: initialTargetUser.email || existingContact?.role || "New conversation",
      online: Boolean(existingContact?.online),
      channelId: existingContact?.channelId || null,
      image: getContactImageSource(initialTargetUser) || existingContact?.image || existingContact?.avatar_url || "",
      unread: 0,
      messages: state.conversations[targetId] || existingContact?.messages || [],
    });
  }, [initialTargetUser]);
  const initialChatState = () => {
    const state = getInitialChatState(chatStorageKey);
    const targetContact = getTargetContact(state);

    if (!targetContact) return state;

    return {
      contacts: state.contacts.some((contact) => String(contact.id) === String(targetContact.id))
        ? state.contacts
        : [targetContact, ...state.contacts],
      activeContact: targetContact,
      conversations: {
        ...state.conversations,
        [targetContact.id]: state.conversations[targetContact.id] || targetContact.messages || [],
      },
    };
  };
  const [contacts, setContacts] = useState(() => initialChatState().contacts);
  const [activeContact, setActiveContact] = useState(() => initialChatState().activeContact);
  const [messageInput, setMessageInput] = useState("");
  const [conversations, setConversations] = useState(() => initialChatState().conversations);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [isActiveConversationAtBottom, setIsActiveConversationAtBottom] = useState(true);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const bottomRef = useRef(null);
  const searchInputRef = useRef(null);
  const chatSocketRef = useRef(null);
  const lastChannelReadKeyRef = useRef(null);
  const locallyReadChannelsRef = useRef(new Map());
  const [locallyReadChannels, setLocallyReadChannels] = useState(() => new Map());
  const deferredNewChatQuery = useDeferredValue(searchQuery.trim());
  const deferredMessageSearchQuery = useDeferredValue(messageSearchQuery.trim());
  const currentUserIds = useMemo(() => getSessionUserIdentifiers(session), [session]);
  const peerUserIds = useMemo(() => {
    return activeContact
      ? [activeContact.id, activeContact.user_id, activeContact.email].filter(Boolean).map(String)
      : [];
  }, [activeContact]);
  const currentUserIdsRef = useRef(currentUserIds);
  const peerUserIdsRef = useRef(peerUserIds);
  const isActiveConversationAtBottomRef = useRef(isActiveConversationAtBottom);
  const activeMessageQueryKey = useMemo(
    () => ["channel-messages", activeContact?.channelId, activeContact?.id],
    [activeContact?.channelId, activeContact?.id]
  );

  const markChannelLocallyRead = useCallback((channelId, readThroughTime = Date.now()) => {
    if (!channelId) return;

    const normalizedChannelId = String(channelId);
    const nextReadTime = Number(readThroughTime) || Date.now();
    const currentReadTime = locallyReadChannelsRef.current.get(normalizedChannelId) || 0;

    if (currentReadTime >= nextReadTime) return;

    locallyReadChannelsRef.current.set(normalizedChannelId, nextReadTime);
    setLocallyReadChannels((current) => {
      if ((current.get(normalizedChannelId) || 0) >= nextReadTime) return current;
      const next = new Map(current);
      next.set(normalizedChannelId, nextReadTime);
      return next;
    });
  }, []);

  const isChannelLocallyRead = useCallback((channelId, activityTime = 0) => {
    if (!channelId) return false;

    const readThroughTime = locallyReadChannels.get(String(channelId));
    if (!readThroughTime) return false;

    return !activityTime || activityTime <= readThroughTime + 1000;
  }, [locallyReadChannels]);

  const getUnreadForDmChannel = useCallback((channel, activeContactId) => {
    const channelId = channel?.channel_id || channel?.id;
    const activityTime = getChannelActivityTime(channel);

    if (String(channel?.user_id) === String(activeContactId)) return 0;
    if (channelId && isChannelLocallyRead(channelId, activityTime)) return 0;

    return getDmUnreadCount(channel);
  }, [isChannelLocallyRead]);

  const syncDmUnreadTotal = useCallback((channels) => {
    if (!session?.accessToken || !Array.isArray(channels)) return;

    queryClient.setQueryData(
      ["dm-unread-total", session.accessToken],
      getDmUnreadTotal(channels)
    );
  }, [queryClient, session?.accessToken]);

  const dmChannelsQuery = useQuery({
    queryKey: ["dm-channels", session?.accessToken, session?.userId],
    queryFn: async () => {
      const response = await apiClient.get(DM_CHANNELS, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      return normalizeDmChannels(response.data);
    },
    enabled: Boolean(session?.accessToken),
    initialData: () => {
      const cachedChannels = contacts
        .filter((contact) => contact.channelId)
        .map((contact) => ({
          channel_id: contact.channelId,
          user_id: contact.id,
          name: contact.name,
          last_message_at: contact.lastMessageAt || contact.last_message_at || null,
        }));

      return cachedChannels.length ? cachedChannels : undefined;
    },
    initialDataUpdatedAt: 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnReconnect: true,
    refetchInterval: 15 * 1000,
  });

  const channelMessagesQuery = useInfiniteQuery({
    queryKey: activeMessageQueryKey,
    queryFn: async ({ pageParam = null }) => {
      const response = await apiClient.get(CHANNEL_MESSAGES(activeContact.channelId), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
        params: {
          limit: MESSAGE_PAGE_SIZE,
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });

      return sortMessagesChronologically(
        normalizeCollection(response.data).map((message) =>
          normalizeServerMessage(message, currentUserIds, peerUserIds)
        )
      );
    },
    enabled: Boolean(session?.accessToken && activeContact?.channelId),
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.length >= MESSAGE_PAGE_SIZE ? lastPage[0]?.id : undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnReconnect: true,
    refetchOnMount: "always",
  });

  const currentMessages = useMemo(
    () => {
      if (channelMessagesQuery.data?.pages) {
        return flattenMessagePages(channelMessagesQuery.data);
      }

      return activeContact ? conversations[activeContact.id] || activeContact.messages || [] : [];
    },
    [activeContact, channelMessagesQuery.data, conversations]
  );

  const activePresenceQuery = useQuery({
    queryKey: ["presence-user", activeContact?.id],
    queryFn: async () => {
      const response = await apiClient.get(PRESENCE_USER(activeContact.id), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      return normalizePresence(response.data);
    },
    enabled: Boolean(session?.accessToken && activeContact?.id),
    staleTime: 15 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const unreadCountsByContactId = contacts.reduce((acc, contact) => {
    const contactActivityTime = getContactActivityTime(contact, conversations);
    const unreadCount = Number(contact.unreadCount || contact.unread_count || contact.unread || 0);

    acc[contact.id] =
      (contact.id === activeContact?.id && isActiveConversationAtBottom) ||
      (contact.channelId && isChannelLocallyRead(contact.channelId, contactActivityTime)) ||
      (unreadCount <= 0 && contactLatestMessageIsMine(contact, conversations))
        ? 0
        : unreadCount;
    return acc;
  }, {});

  const pendingCountsByContactId = contacts.reduce((acc, contact) => {
    if (activeContact?.id === contact.id && isActiveConversationAtBottom) {
      acc[contact.id] = 0;
      return acc;
    }

    const contactActivityTime = getContactActivityTime(contact, conversations);
    if (contact.channelId && isChannelLocallyRead(contact.channelId, contactActivityTime)) {
      acc[contact.id] = 0;
      return acc;
    }

    const serverUnreadCount = unreadCountsByContactId[contact.id] || 0;

    if (serverUnreadCount <= 0 && contactLatestMessageIsMine(contact, conversations)) {
      acc[contact.id] = 0;
      return acc;
    }

    const conversation = conversations[contact.id] || contact.messages || [];
    const pendingCount = conversation.filter(
      (message) => message.from === "them" && !message.read
    ).length;

    acc[contact.id] = conversation.length > 0
      ? Math.max(pendingCount, serverUnreadCount)
      : serverUnreadCount;

    return acc;
  }, {});
  const activeUnreadCount = activeContact?.id ? pendingCountsByContactId[activeContact.id] || 0 : 0;

  const reactionsByMessageId = currentMessages.reduce((acc, message) => {
    acc[message.id] = normalizeMessageReactions(message.reactions);
    return acc;
  }, {});

  const sendMessageMutation = useMutation({
    mutationFn: async ({ targetUserId, text, attachment, attachments, replyTo }) => {
      const messageAttachments = attachments || (attachment ? [attachment] : []);
      const replyToId = replyTo?.id || null;
      const rootId = replyTo?.rootId || replyToId;
      const response = await apiClient.post(
        DM_SEND_MESSAGE(targetUserId),
        {
          content: text,
          content_type: messageAttachments.length ? "file" : "text",
          ...(messageAttachments.length ? { file_ids: messageAttachments.map((item) => item.id) } : {}),
          ...(replyToId
            ? {
                parent_id: replyToId,
                root_id: rootId,
                reply_to_message_id: replyToId,
              }
            : {}),
        },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );

      return response.data;
    },
    onMutate: ({ targetUserId, text, attachment, attachments, replyTo }) => {
      const messageAttachments = attachments || (attachment ? [attachment] : []);
      const sentAt = Date.now();
      const optimisticMessage = {
        id: createPendingMessageId(),
        from: "me",
        text,
        time: formatMessageDateTime(sentAt),
        timestamp: sentAt,
        read: false,
        isPending: true,
        reactions: [],
        attachments: messageAttachments,
        replyTo,
      };

      const targetChannelId =
        activeContact?.id === targetUserId
          ? activeContact.channelId
          : contacts.find((contact) => contact.id === targetUserId)?.channelId;

      updateConversationMessages(
        targetUserId,
        (messages) => mergeMessages(messages, [optimisticMessage]),
        { channelId: targetChannelId }
      );

      setContacts((current) =>
        current.map((contact) =>
          contact.id === targetUserId
            ? {
                ...contact,
                role: `You: ${text}`,
                lastMessageAt: sentAt,
                lastMessageFromMe: true,
                unread: 0,
                unread_count: 0,
                unreadCount: 0,
              }
            : contact
        )
      );

      setActiveContact((current) =>
        current?.id === targetUserId
          ? {
              ...current,
              role: `You: ${text}`,
              lastMessageAt: sentAt,
              lastMessageFromMe: true,
              unread: 0,
              unread_count: 0,
              unreadCount: 0,
            }
          : current
      );

      setMessageInput("");
      setReplyTarget(null);
      setPendingAttachment(null);

      return { optimisticMessage };
    },
    onSuccess: (data, variables, context) => {
      const sentAt = Date.now();
      const channelId =
        data?.channel_id ||
        data?.channel?.id ||
        data?.message?.channel_id ||
        variables.channelId ||
        null;
      const newMessage = data?.message
        ? normalizeServerMessage(data.message, currentUserIds, peerUserIds)
        : {
            id: data?.id || data?.message_id || Date.now(),
            from: "me",
            text: data?.content || variables.text,
            time: data?.created_at ? formatMessageDateTime(data.created_at) : formatMessageDateTime(sentAt),
            timestamp: getMessageTimestamp({
              created_at: data?.created_at || sentAt,
            }),
            read: false,
          };
      const messageAttachments = variables.attachments || (variables.attachment ? [variables.attachment] : []);
      if (messageAttachments.length && !newMessage.attachments?.length) {
        newMessage.attachments = messageAttachments;
      }
      if (
        variables.replyTo &&
        (!newMessage.replyTo?.text || newMessage.replyTo?.senderName === "Message")
      ) {
        newMessage.replyTo = {
          ...newMessage.replyTo,
          ...variables.replyTo,
        };
      }
      const replaceOptimisticMessage = (messages = []) =>
        mergeMessages(
          context?.optimisticMessage
            ? removeMessageById(messages, context.optimisticMessage.id)
            : messages,
          [newMessage]
        );

      updateConversationMessages(
        variables.targetUserId,
        replaceOptimisticMessage,
        { channelId }
      );

      setContacts((current) =>
        current.map((contact) =>
          contact.id === variables.targetUserId
            ? {
                ...contact,
                channelId: channelId || contact.channelId,
                role: `You: ${variables.text}`,
                lastMessageAt: newMessage.timestamp || sentAt,
                lastMessageFromMe: true,
                unread: 0,
                unread_count: 0,
                unreadCount: 0,
              }
            : contact
        )
      );

      setActiveContact((current) =>
        current?.id === variables.targetUserId
          ? {
              ...current,
              channelId: channelId || current.channelId,
              role: `You: ${variables.text}`,
              lastMessageAt: newMessage.timestamp || sentAt,
              lastMessageFromMe: true,
              unread: 0,
              unread_count: 0,
              unreadCount: 0,
            }
          : current
      );

      if (channelId) {
        markChannelLocallyRead(channelId);
        queryClient.setQueriesData({ queryKey: ["dm-channels"] }, (current) =>
          Array.isArray(current)
            ? current.map((channel) =>
                String(channel.channel_id || channel.id) === String(channelId)
                  ? { ...channel, unread: 0, unread_count: 0, unreadCount: 0 }
                  : channel
              )
            : current
        );
      }
    },
    onError: (_error, variables, context) => {
      if (context?.optimisticMessage) {
        const markMessageFailed = (messages = []) =>
          messages.map((message) =>
            String(message.id) === String(context.optimisticMessage.id)
              ? { ...message, isPending: false, failed: true }
              : message
          );

        const targetChannelId =
          activeContact?.id === variables.targetUserId
            ? activeContact.channelId
            : contacts.find((contact) => contact.id === variables.targetUserId)?.channelId;

        updateConversationMessages(
          variables.targetUserId,
          markMessageFailed,
          { channelId: targetChannelId }
        );

        setContacts((current) =>
          current.map((contact) =>
            contact.id === variables.targetUserId
              ? contact
              : contact
          )
        );

        setActiveContact((current) =>
          current?.id === variables.targetUserId
            ? current
            : current
        );
      }

      toast.error("Unable to send the message right now.");
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (files) => {
      if (!activeContact) {
        throw new Error("Select a chat before uploading a file.");
      }

      if (!activeContact.channelId) {
        throw new Error("Send a message first, then attach files once the chat is synced.");
      }

      return uploadFiles({
        files,
        accessToken: session?.accessToken,
        contextName: `chat-${activeContact.channelId}`,
      });
    },
    onSuccess: (attachments) => {
      setPendingAttachment((current) => [...(Array.isArray(current) ? current : current ? [current] : []), ...attachments]);
      toast.success(attachments.length === 1 ? "File uploaded." : `${attachments.length} files uploaded.`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || error.message || "Unable to upload file.");
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      const response = await apiClient.post(
        MESSAGE_REACTIONS(messageId),
        { emoji },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );

      return response.data;
    },
    onMutate: (variables) => {
      applyActiveConversationUpdate((messages) =>
        updateMessageReaction(messages, variables.messageId, variables.emoji, 1, session?.full_name || session?.name || "You")
      );
    },
    onSuccess: (data, variables) => {
      applyReactionResponse(variables.messageId, data, variables.emoji, 1);
      queryClient.invalidateQueries({ queryKey: ["message-reactions", variables.messageId, "dialog"] });
    },
    onError: (_error, variables) => {
      applyActiveConversationUpdate((messages) =>
        updateMessageReaction(messages, variables.messageId, variables.emoji, -1)
      );
      toast.error("Unable to add reaction right now.");
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      const response = await apiClient.delete(MESSAGE_REACTION(messageId, emoji), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      return response.data;
    },
    onMutate: (variables) => {
      applyActiveConversationUpdate((messages) =>
        updateMessageReaction(messages, variables.messageId, variables.emoji, -1)
      );
    },
    onSuccess: (data, variables) => {
      applyReactionResponse(variables.messageId, data, variables.emoji, -1);
      queryClient.invalidateQueries({ queryKey: ["message-reactions", variables.messageId, "dialog"] });
    },
    onError: (_error, variables) => {
      applyActiveConversationUpdate((messages) =>
        updateMessageReaction(messages, variables.messageId, variables.emoji, 1, session?.full_name || session?.name || "You")
      );
      toast.error("Unable to remove reaction right now.");
    },
  });

  const markChannelReadMutation = useMutation({
    mutationFn: async ({ channelId, contactId, messageId, messageIds = [], readThroughTime }) => {
      const readableMessageIds = Array.from(
        new Set([...(Array.isArray(messageIds) ? messageIds : []), messageId].filter(Boolean).map(String))
      );

      if (readableMessageIds.length) {
        try {
          await apiClient.post(MESSAGE_BULK_READ, readableMessageIds, {
            headers: { Authorization: `Bearer ${session?.accessToken}` },
            suppressGlobalErrorReport: true,
          });
        } catch {
          // The read cursor below still keeps unread counts in sync if detailed receipts fail.
        }
      }

      try {
        await apiClient.post(CHANNEL_MESSAGE_READ(channelId, messageId), null, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
          suppressGlobalErrorReport: true,
        });
      } catch {
        // Read receipts are background sync; keep the conversation usable if the server rejects them.
      }

      return { channelId, contactId, readThroughTime };
    },
    onMutate: ({ channelId, contactId, readThroughTime }) => {
      markChannelLocallyRead(channelId, readThroughTime);
      queryClient.setQueryData(["channel-unread-count", channelId, contactId], 0);
      queryClient.setQueryData(["channel-messages", channelId, contactId], (current) =>
        updateMessagePages(current, markIncomingMessagesRead)
      );
      queryClient.setQueriesData({ queryKey: ["dm-channels"] }, (current) =>
        {
          if (!Array.isArray(current)) return current;

          const nextChannels = current.map((channel) =>
            String(channel.channel_id || channel.id) === String(channelId)
              ? { ...channel, unread: 0, unread_count: 0, unreadCount: 0 }
              : channel
          );

          syncDmUnreadTotal(nextChannels);
          return nextChannels;
        }
      );
      setConversations((current) => ({
        ...current,
        [contactId]: markIncomingMessagesRead(current[contactId] || []),
      }));
      setContacts((current) =>
        current.map((contact) =>
          contact.id === contactId || String(contact.channelId) === String(channelId)
            ? {
                ...contact,
                unread: 0,
                unread_count: 0,
                unreadCount: 0,
                messages: markIncomingMessagesRead(contact.messages || []),
              }
            : contact
        )
      );
      setActiveContact((current) =>
        current?.id === contactId || String(current?.channelId) === String(channelId)
          ? {
              ...current,
              unread: 0,
              unread_count: 0,
              unreadCount: 0,
              messages: markIncomingMessagesRead(current.messages || []),
            }
          : current
      );
    },
    onSuccess: ({ channelId, contactId, readThroughTime }) => {
      markChannelLocallyRead(channelId, readThroughTime);
      queryClient.setQueryData(["channel-unread-count", channelId, contactId], 0);
      queryClient.setQueriesData({ queryKey: ["dm-channels"] }, (current) =>
        {
          if (!Array.isArray(current)) return current;

          const nextChannels = current.map((channel) =>
            String(channel.channel_id || channel.id) === String(channelId)
              ? { ...channel, unread: 0, unread_count: 0, unreadCount: 0 }
              : channel
          );

          syncDmUnreadTotal(nextChannels);
          return nextChannels;
        }
      );
      setContacts((current) =>
        current.map((contact) =>
          contact.id === contactId || String(contact.channelId) === String(channelId)
            ? { ...contact, unread: 0, unread_count: 0, unreadCount: 0 }
            : contact
        )
      );
      setActiveContact((current) =>
        current?.id === contactId || String(current?.channelId) === String(channelId)
          ? { ...current, unread: 0, unread_count: 0, unreadCount: 0 }
          : current
      );
      queryClient.invalidateQueries({ queryKey: ["dm-channels"] });
      queryClient.invalidateQueries({ queryKey: ["dm-unread-total", session?.accessToken] });
    },
  });

  const updateConversationMessages = useCallback((contactId, updater, options = {}) => {
    if (!contactId) return;

    const channelId = options.channelId || activeContact?.channelId;
    const normalizeNext = (messages = []) => {
      const nextMessages = typeof updater === "function" ? updater(messages) : updater;
      return sortMessagesChronologically(nextMessages || []);
    };

    if (channelId) {
      queryClient.setQueryData(["channel-messages", channelId, contactId], (current) =>
        updateMessagePages(current, normalizeNext)
      );
    }

    setConversations((current) => ({
      ...current,
      [contactId]: normalizeNext(current[contactId] || []),
    }));

    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId
          ? (() => {
              const nextMessages = normalizeNext(contact.messages || []);
              return {
                ...contact,
                ...getLatestContactPatch(nextMessages, contact),
                messages: nextMessages,
              };
            })()
          : contact
      )
    );

    setActiveContact((current) =>
      current?.id === contactId
        ? (() => {
            const nextMessages = normalizeNext(current.messages || []);
            return {
              ...current,
              ...getLatestContactPatch(nextMessages, current),
              messages: nextMessages,
            };
          })()
        : current
    );
  }, [activeContact?.channelId, queryClient]);

  const applyActiveConversationUpdate = (updater) => {
    if (!activeContact?.id) return;

    updateConversationMessages(activeContact.id, updater, { channelId: activeContact.channelId });
  };

  const outgoingUnreadMessageIds = useMemo(
    () =>
      currentMessages
        .filter((message) => message.from === "me" && !message.read && message.id && isServerMessageId(message.id))
        .slice(-30)
        .map((message) => String(message.id)),
    [currentMessages]
  );

  const readStatusQuery = useQuery({
    queryKey: ["message-read-status", activeContact?.channelId, outgoingUnreadMessageIds.join(",")],
    queryFn: async () => {
      try {
        const response = await apiClient.post(MESSAGE_BULK_READ_STATUS, outgoingUnreadMessageIds, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
          suppressGlobalErrorReport: true,
        });
        const statuses = normalizeCollection(response.data);

        return statuses.map((status) => ({
          messageId: status.message_id || status.messageId || status.id,
          data: status,
        })).filter((status) => status.messageId);
      } catch (error) {
        if (error?.response?.status !== 404 && error?.response?.status !== 405) {
          throw error;
        }

        const results = await Promise.all(
          outgoingUnreadMessageIds.map(async (messageId) => {
            const response = await apiClient.get(MESSAGE_READ_STATUS(messageId), {
              headers: { Authorization: `Bearer ${session?.accessToken}` },
              suppressGlobalErrorReport: true,
            });

            return { messageId, data: response.data };
          })
        );

        return results;
      }
    },
    enabled: Boolean(session?.accessToken && activeContact?.channelId && outgoingUnreadMessageIds.length),
    staleTime: 5 * 1000,
    refetchInterval: outgoingUnreadMessageIds.length ? 15 * 1000 : false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!readStatusQuery.data?.length || !activeContact?.id) return;

    const applyReadStatuses = (messages) =>
      readStatusQuery.data.reduce(
        (nextMessages, status) =>
          applyMessageReadStatus(nextMessages, status.messageId, status.data, currentUserIds),
        messages
      );

    updateConversationMessages(activeContact.id, applyReadStatuses, { channelId: activeContact.channelId });
  }, [
    activeContact?.channelId,
    activeContact?.id,
    currentUserIds,
    readStatusQuery.data,
    updateConversationMessages,
  ]);

  const applyReactionResponse = (messageId, data, fallbackEmoji, fallbackDelta) => {
    if (data?.reactions) {
      applyActiveConversationUpdate((messages) =>
        replaceMessageReactions(messages, messageId, data.reactions)
      );
      return;
    }

    if (data?.emoji && typeof data?.count !== "undefined") {
      applyActiveConversationUpdate((messages) => {
        const message = messages.find((item) => String(item.id) === String(messageId));
        const nextReactions = [
          ...normalizeMessageReactions(message?.reactions || []).filter(
            (reaction) => reaction.emoji !== data.emoji
          ),
          ...(Number(data.count || 0) > 0
            ? [{
                emoji: data.emoji,
                count: Number(data.count || 0),
                users: Array.isArray(data.users) ? data.users : [],
                reacted: fallbackDelta > 0,
              }]
            : []),
        ];

        return replaceMessageReactions(messages, messageId, nextReactions);
      });
      return;
    }

    if (fallbackEmoji) {
      applyActiveConversationUpdate((messages) =>
        updateMessageReaction(
          messages,
          messageId,
          fallbackEmoji,
          fallbackDelta,
          session?.full_name || session?.name || "You"
        )
      );
    }
  };

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, text }) => {
      const response = await apiClient.put(
        CHANNEL_MESSAGE(activeContact.channelId, messageId),
        { content: text, content_type: "text" },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );

      return response.data?.message || response.data || { id: messageId, content: text };
    },
    onSuccess: (message, variables) => {
      const normalizedMessage = normalizeServerMessage(message, currentUserIds, peerUserIds);
      const nextMessage = normalizedMessage.text
        ? normalizedMessage
        : { id: variables.messageId, text: variables.text };

      applyActiveConversationUpdate((messages) => replaceMessage(messages, nextMessage));
      setEditingMessageId(null);
      setMessageInput("");
      toast.success("Message updated.");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to edit message.");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await apiClient.delete(CHANNEL_MESSAGE(activeContact.channelId, messageId), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      return messageId;
    },
    onMutate: (messageId) => {
      const cachedMessages = flattenMessagePages(queryClient.getQueryData(activeMessageQueryKey));
      const previousMessages = cachedMessages.length ? cachedMessages : currentMessages;

      applyActiveConversationUpdate((messages) => removeMessageById(messages, messageId));

      return { previousMessages };
    },
    onSuccess: () => {
      toast.success("Message deleted.");
    },
    onError: (error, _messageId, context) => {
      if (context?.previousMessages) {
        applyActiveConversationUpdate(() => context.previousMessages);
      }

      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to delete message.");
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await apiClient.post(CHANNEL_MESSAGE_PIN(activeContact.channelId, messageId), null, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      return messageId;
    },
    onSuccess: (messageId) => {
      applyActiveConversationUpdate((messages) => updateMessageById(messages, messageId, { pinned: true }));
      toast.success("Message pinned.");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to pin message.");
    },
  });

  const unpinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await apiClient.post(CHANNEL_MESSAGE_UNPIN(activeContact.channelId, messageId), null, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      return messageId;
    },
    onSuccess: (messageId) => {
      applyActiveConversationUpdate((messages) => updateMessageById(messages, messageId, { pinned: false }));
      toast.success("Message unpinned.");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to unpin message.");
    },
  });

  const deliveryStatusMutation = useMutation({
    mutationFn: async (messageId) => {
      const response = await apiClient.get(
        CHANNEL_MESSAGE_DELIVERY_STATUS(activeContact.channelId, messageId),
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );

      return response.data;
    },
    onSuccess: (data) => {
      const count = data?.delivered_count ?? data?.read_count ?? data?.seen_count ?? null;
      toast.info(count === null ? "Delivery status loaded." : `Delivery status: ${count} users.`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to load delivery status.");
    },
  });

  const threadMessagesMutation = useMutation({
    mutationFn: async (messageId) => {
      const response = await apiClient.get(CHANNEL_MESSAGE_THREAD(activeContact.channelId, messageId), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      return normalizeCollection(response.data);
    },
    onSuccess: (threadMessages) => {
      toast.info(`${threadMessages.length} thread messages found.`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to load thread.");
    },
  });

  const translateMessageMutation = useMutation({
    mutationFn: async ({ messageId, text, language }) => {
      const response = await apiClient.post(
        CHANNEL_AI_TRANSLATE(activeContact.channelId),
        { text, language },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );

      const translatedText = getTranslatedText(response.data);

      if (!translatedText) {
        throw new Error("Translation response did not include translated text.");
      }

      return { messageId, language, translatedText };
    },
    onMutate: ({ messageId, language }) => {
      const markTranslating = (messages) =>
        updateMessageById(messages, messageId, {
          translation: {
            language,
            text: "",
            isLoading: true,
          },
        });

      applyActiveConversationUpdate(markTranslating);
    },
    onSuccess: ({ messageId, language, translatedText }) => {
      const applyTranslation = (messages) =>
        updateMessageById(messages, messageId, {
          translation: {
            language,
            text: translatedText,
            isLoading: false,
          },
        });

      applyActiveConversationUpdate(applyTranslation);
    },
    onError: (error, variables) => {
      const clearTranslation = (messages) =>
        updateMessageById(messages, variables.messageId, {
          translation: null,
        });

      applyActiveConversationUpdate(clearTranslation);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Unable to translate message."
      );
    },
  });

  const summarizeMessageMutation = useMutation({
    mutationFn: async ({ messageId, text }) => {
      const response = await apiClient.post(CHANNEL_AI_SUMMARY(activeContact.channelId), null, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
        params: { text },
      });

      const summaryText = getSummaryText(response.data);

      if (!summaryText) {
        throw new Error("Summary response did not include summarized text.");
      }

      return { messageId, summaryText };
    },
    onMutate: ({ messageId }) => {
      const markSummarizing = (messages) =>
        updateMessageById(messages, messageId, {
          summary: {
            text: "",
            isLoading: true,
          },
        });

      applyActiveConversationUpdate(markSummarizing);
    },
    onSuccess: ({ messageId, summaryText }) => {
      const applySummary = (messages) =>
        updateMessageById(messages, messageId, {
          summary: {
            text: summaryText,
            isLoading: false,
          },
        });

      applyActiveConversationUpdate(applySummary);
    },
    onError: (error, variables) => {
      const clearSummary = (messages) =>
        updateMessageById(messages, variables.messageId, {
          summary: null,
        });

      applyActiveConversationUpdate(clearSummary);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Unable to summarize message."
      );
    },
  });

  const searchUsersQuery = useQuery({
    queryKey: ["dm-users-search", deferredNewChatQuery],
    queryFn: async () => {
      const response = await apiClient.get(DM_USERS_SEARCH, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
        params: { query: deferredNewChatQuery },
      });

      return normalizeSearchResults(response.data);
    },
    enabled: Boolean(session?.accessToken) && deferredNewChatQuery.length > 1 && isNewChatMode,
    staleTime: 30 * 1000,
  });

  const searchMessagesQuery = useQuery({
    queryKey: ["messages-search", activeContact?.channelId, deferredMessageSearchQuery],
    queryFn: async () => {
      const response = await apiClient.get(MESSAGES_SEARCH, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
        params: { query: deferredMessageSearchQuery, channel_id: activeContact?.channelId },
      });

      return sortMessagesChronologically(
        normalizeCollection(response.data).map((message) =>
          normalizeServerMessage(message, currentUserIds, peerUserIds)
        )
      );
    },
    enabled: Boolean(session?.accessToken && activeContact?.channelId && deferredMessageSearchQuery.length > 0 && isMessageSearchOpen),
    staleTime: 30 * 1000,
  });

  const sidebarResults = useMemo(() => {
    if (isNewChatMode) {
      return searchUsersQuery.data || [];
    }

    const query = searchQuery.toLowerCase();

    return contacts
      .filter((contact) => contact.name.toLowerCase().includes(query))
      .sort((first, second) => {
        const activityDelta =
          getContactActivityTime(second, conversations) - getContactActivityTime(first, conversations);
        if (activityDelta !== 0) return activityDelta;

        return String(first.name || "").localeCompare(String(second.name || ""));
      });
  }, [contacts, conversations, isNewChatMode, searchQuery, searchUsersQuery.data]);

  const activePresenceLabel = activePresenceQuery.data?.customStatus
    ? `${activePresenceQuery.data.customStatus.emoji || ""} ${activePresenceQuery.data.customStatus.text || ""}`.trim()
    : formatStatusLabel(activePresenceQuery.data?.status || (activeContact?.online ? "online" : "offline"));

  useEffect(() => {
    currentUserIdsRef.current = currentUserIds;
  }, [currentUserIds]);

  useEffect(() => {
    peerUserIdsRef.current = peerUserIds;
  }, [peerUserIds]);

  useEffect(() => {
    isActiveConversationAtBottomRef.current = isActiveConversationAtBottom;
  }, [isActiveConversationAtBottom]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const findNotificationContact = (payload) => {
      const channelId = payload.channel_id || payload.channelId || payload.channel?.id || payload.channel?.channel_id;
      const senderIds = getFirebaseMessageSenderIds(payload);
      const senderName = getFirebaseMessageContactName(payload);

      return contacts.find((contact) => {
        const contactIds = [
          contact.id,
          contact.user_id,
          contact.userId,
          contact.email,
        ]
          .filter(Boolean)
          .map(String);

        if (channelId && String(contact.channelId) === String(channelId)) {
          return true;
        }

        if (senderIds.some((id) => contactIds.includes(id))) {
          return true;
        }

        return senderName && String(contact.name || "").toLowerCase() === String(senderName).toLowerCase();
      });
    };

    const handleFirebaseMessage = (event) => {
      const payload = event.detail || {};
      const eventType = String(payload.event || payload.notification_type || payload.type || "").toLowerCase();
      const channelId = payload.channel_id || payload.channelId || payload.channel?.id || payload.channel?.channel_id || null;
      const senderIds = getFirebaseMessageSenderIds(payload);
      const messageText = getFirebaseMessageText(payload);
      const messageTimestamp = getMessageTimestamp(payload) || Date.now();
      const senderIsCurrentUser = senderIds.some((id) => currentUserIdsRef.current.includes(String(id)));

      if (senderIsCurrentUser) return;
      if (
        eventType &&
        !eventType.includes("message") &&
        !eventType.includes("chat") &&
        !eventType.includes("dm")
      ) {
        return;
      }

      const matchedContact = findNotificationContact(payload);
      const contactId = matchedContact?.id || senderIds[0] || null;

      if (!contactId) {
        void queryClient.invalidateQueries({ queryKey: ["dm-channels"] });
        return;
      }

      const shouldStayRead = String(activeContact?.id) === String(contactId) && isActiveConversationAtBottom;
      const normalizedNotificationMessage = normalizeServerMessage(
        payload,
        currentUserIdsRef.current,
        senderIds
      );
      const optimisticMessage = {
        ...normalizedNotificationMessage,
        id: normalizedNotificationMessage.id || payload.message_id || payload.messageId || payload.id || `firebase-${contactId}-${messageTimestamp}`,
        from: "them",
        text: normalizedNotificationMessage.text || messageText,
        time: normalizedNotificationMessage.time || formatMessageDateTime(messageTimestamp),
        timestamp: normalizedNotificationMessage.timestamp || messageTimestamp,
        delivered: true,
        read: shouldStayRead,
        raw: {
          ...normalizedNotificationMessage.raw,
          ...payload,
        },
      };

      setConversations((current) => ({
        ...current,
        [contactId]: mergeMessages(current[contactId] || matchedContact?.messages || [], [optimisticMessage]),
      }));

      if (channelId) {
        queryClient.setQueryData(["channel-messages", channelId, contactId], (current) =>
          updateMessagePages(current, (messages) =>
            mergeMessages(messages, [optimisticMessage])
          )
        );

        if (!optimisticMessage.attachments?.length && isLikelyFileMessage(payload)) {
          void queryClient.invalidateQueries({ queryKey: ["channel-messages", channelId, contactId] });
        }
      }

      setContacts((current) => {
        const matched = current.find((contact) => String(contact.id) === String(contactId));
        const nextUnreadCount = shouldStayRead
          ? 0
          : Math.max(
              Number(matched?.unreadCount || matched?.unread_count || matched?.unread || 0) + 1,
              Number(payload.unread_count || payload.unreadCount || payload.unread || 1)
            );
        const nextContact = normalizeContactId({
          ...(matched || matchedContact || {}),
          id: contactId,
          user_id: matched?.user_id || matchedContact?.user_id || senderIds[0] || contactId,
          name: matched?.name || matchedContact?.name || getFirebaseMessageContactName(payload),
          channelId: channelId || matched?.channelId || matchedContact?.channelId || null,
          image: matched?.image || matched?.avatar_url || matchedContact?.image || matchedContact?.avatar_url || getFirebaseMessageContactImage(payload),
          role: messageText,
          lastMessageAt: messageTimestamp,
          lastMessageFromMe: false,
          unread: nextUnreadCount,
          unread_count: nextUnreadCount,
          unreadCount: nextUnreadCount,
          messages: mergeMessages(matched?.messages || matchedContact?.messages || [], [optimisticMessage]),
        });

        if (!nextContact) return current;

        return current.some((contact) => String(contact.id) === String(contactId))
          ? current.map((contact) => (String(contact.id) === String(contactId) ? { ...contact, ...nextContact } : contact))
          : [nextContact, ...current];
      });

      setActiveContact((current) =>
        String(current?.id) === String(contactId)
          ? {
              ...current,
              role: messageText,
              lastMessageAt: messageTimestamp,
              lastMessageFromMe: false,
              unread: shouldStayRead ? 0 : Number(current.unread || 0) + 1,
              unread_count: shouldStayRead ? 0 : Number(current.unread_count || 0) + 1,
              unreadCount: shouldStayRead ? 0 : Number(current.unreadCount || 0) + 1,
              messages: mergeMessages(current.messages || [], [optimisticMessage]),
            }
          : current
      );

      queryClient.setQueriesData({ queryKey: ["dm-channels"] }, (current) =>
        {
          if (!Array.isArray(current)) return current;

          const nextChannels = current.map((channel) =>
            (channelId && String(channel.channel_id || channel.id) === String(channelId)) ||
            String(channel.user_id) === String(contactId)
              ? {
                  ...channel,
                  last_message: messageText,
                  last_message_at: new Date(messageTimestamp).toISOString(),
                  last_message_user_id: senderIds[0] || channel.last_message_user_id,
                  unread: shouldStayRead ? 0 : getDmUnreadCount(channel) + 1,
                  unread_count: shouldStayRead ? 0 : getDmUnreadCount(channel) + 1,
                  unreadCount: shouldStayRead ? 0 : getDmUnreadCount(channel) + 1,
                }
              : channel
          );

          syncDmUnreadTotal(nextChannels);
          return nextChannels;
        }
      );
      void queryClient.invalidateQueries({ queryKey: ["dm-channels"] });
      void queryClient.invalidateQueries({ queryKey: ["dm-unread-total", session?.accessToken] });
    };

    window.addEventListener(FIREBASE_MESSAGE_EVENT, handleFirebaseMessage);

    return () => {
      window.removeEventListener(FIREBASE_MESSAGE_EVENT, handleFirebaseMessage);
    };
  }, [
    activeContact?.id,
    contacts,
    isActiveConversationAtBottom,
    queryClient,
    session?.accessToken,
    syncDmUnreadTotal,
  ]);

  useEffect(() => {
    if (isNewChatMode) {
      searchInputRef.current?.focus();
    }
  }, [isNewChatMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !chatStorageKey) return;

    const storedContacts = contacts.map((contact) => ({
      ...contact,
      messages: [],
    }));

    window.localStorage.setItem(chatStorageKey, JSON.stringify({ contacts: storedContacts }));
  }, [chatStorageKey, contacts]);

  useEffect(() => {
    const nextState = getInitialChatState(chatStorageKey);
    const targetContact = getTargetContact(nextState);

    if (targetContact) {
      setContacts(
        nextState.contacts.some((contact) => String(contact.id) === String(targetContact.id))
          ? nextState.contacts
          : [targetContact, ...nextState.contacts]
      );
      setActiveContact(targetContact);
      setConversations({
        ...nextState.conversations,
        [targetContact.id]: nextState.conversations[targetContact.id] || targetContact.messages || [],
      });
      return;
    }

    setContacts(nextState.contacts);
    setActiveContact(nextState.activeContact);
    setConversations(nextState.conversations);
  }, [chatStorageKey, getTargetContact, initialTargetUser]);

  useEffect(() => {
    if (!dmChannelsQuery.data?.length) return;

    setContacts((current) => {
      const currentById = new Map(current.map((contact) => [String(contact.id), contact]));
      const backendContacts = dmChannelsQuery.data.map((channel) => {
        const existing = currentById.get(String(channel.user_id));
        const existingMessages = existing?.messages || conversations[channel.user_id] || [];
        const unreadCount = getUnreadForDmChannel(channel, activeContact?.id);
        const serverActivity = getChannelActivityTime(channel);
        const localActivity = getLastMessageTime(existingMessages);
        const lastMessageAt = channel.last_message_at || channel.lastMessageAt || existing?.lastMessageAt || null;
        const lastMessageFromMe = currentUserIds.includes(String(channel.last_message_user_id));
        const latestMessageText = channel.last_message
          ? `${lastMessageFromMe ? "You: " : ""}${channel.last_message}`
          : null;
        const latestPreview =
          serverActivity >= localActivity && latestMessageText
            ? latestMessageText
            : existingMessages[existingMessages.length - 1]?.text || latestMessageText || existing?.role || "Conversation";

        return normalizeContactId({
          id: channel.user_id,
          user_id: channel.user_id,
          name: channel.name || existing?.name || "Unknown user",
          role: latestPreview,
          online: existing?.online || false,
          channelId: channel.channel_id,
          image: getContactImageSource(channel) || existing?.image || existing?.avatar_url || "",
          lastMessageAt,
          lastMessageFromMe,
          unreadCount,
          unread: unreadCount,
          messages: existingMessages,
        });
      });
      const merged = new Map();

      backendContacts.forEach((contact) => {
        merged.set(String(contact.id), contact);
      });

      current.forEach((contact) => {
        const key = String(contact.id);
        const existing = merged.get(key);
        const isActiveContact = String(contact.id) === String(activeContact?.id);

        merged.set(
          key,
          existing
            ? {
                ...contact,
                ...existing,
                role: existing.role || contact.role,
                lastMessageFromMe:
                  typeof existing.lastMessageFromMe === "boolean"
                    ? existing.lastMessageFromMe
                    : contact.lastMessageFromMe,
                unreadCount: isActiveContact ? 0 : existing.unreadCount ?? contact.unreadCount ?? 0,
                unread: isActiveContact ? 0 : existing.unread ?? contact.unread ?? 0,
                unread_count: isActiveContact ? 0 : existing.unread_count ?? contact.unread_count ?? 0,
                messages: mergeMessages(contact.messages || [], existing.messages || []),
              }
            : contact
        );
      });

      return Array.from(merged.values());
    });

    setConversations((current) => {
      const next = { ...current };

      dmChannelsQuery.data.forEach((channel) => {
        next[channel.user_id] = current[channel.user_id] || [];
      });

      return next;
    });

    setActiveContact((current) => {
      const refreshedContacts = dmChannelsQuery.data.map((channel) =>
        normalizeContactId({
          id: channel.user_id,
          user_id: channel.user_id,
          name: channel.name || "Unknown user",
          channelId: channel.channel_id,
          image: getContactImageSource(channel),
          lastMessageAt: channel.last_message_at || null,
          lastMessageFromMe: currentUserIds.includes(String(channel.last_message_user_id)),
          role: channel.last_message
            ? `${currentUserIds.includes(String(channel.last_message_user_id)) ? "You: " : ""}${channel.last_message}`
            : "Conversation",
          unreadCount: getUnreadForDmChannel(channel, current?.id),
          unread: getUnreadForDmChannel(channel, current?.id),
          unread_count: getUnreadForDmChannel(channel, current?.id),
        })
      );

      if (current) {
        const refreshed = refreshedContacts.find((contact) => contact.id === current.id);
        return refreshed ? { ...current, ...refreshed } : current;
      }

      return refreshedContacts[0] || null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContact?.id, dmChannelsQuery.data, getUnreadForDmChannel, session?.userId]);

  useEffect(() => {
    if (!activeContact?.id || !channelMessagesQuery.data) return;

    const contactId = activeContact.id;
    const messages = flattenMessagePages(channelMessagesQuery.data);

    setConversations((current) => ({
      ...current,
      [contactId]: mergeMessages(current[contactId] || [], messages),
    }));

    setContacts((current) =>
      current.map((contact) => {
        if (contact.id !== contactId) return contact;

        const nextMessages = mergeMessages(contact.messages || [], messages);

        return {
          ...contact,
          ...getLatestContactPatch(nextMessages, contact),
          messages: nextMessages,
        };
      })
    );

    setActiveContact((current) =>
      current?.id === contactId
        ? {
            ...current,
            ...getLatestContactPatch(mergeMessages(current.messages || [], messages), current),
            messages: mergeMessages(current.messages || [], messages),
          }
        : current
    );
  }, [activeContact?.id, channelMessagesQuery.data]);

  useEffect(() => {
    if (!activeContact?.channelId || !currentMessages.length || !isActiveConversationAtBottom) {
      lastChannelReadKeyRef.current = null;
      return;
    }

    const latestMessage = currentMessages[currentMessages.length - 1];

    if (!latestMessage?.id || !isServerMessageId(latestMessage.id)) return;

    const readableIncomingMessageIds = getReadableIncomingMessageIds(currentMessages);
    const channelReadKey = `${activeContact.channelId}:${latestMessage.id}`;

    if (lastChannelReadKeyRef.current !== channelReadKey && !markChannelReadMutation.isPending) {
      lastChannelReadKeyRef.current = channelReadKey;
      markChannelReadMutation.mutate({
        channelId: activeContact.channelId,
        contactId: activeContact.id,
        messageId: latestMessage.id,
        messageIds: readableIncomingMessageIds,
        readThroughTime: getLastMessageTime(currentMessages),
      });
    }
  }, [
    activeContact?.channelId,
    activeContact?.id,
    currentMessages,
    isActiveConversationAtBottom,
    markChannelReadMutation,
  ]);

  useEffect(() => {
    if (!activeContact?.channelId || !session?.accessToken) return undefined;

    const socketUrl = CHAT_WEBSOCKET(activeContact.channelId, session.accessToken);

    if (!socketUrl) return undefined;

    const activeContactId = activeContact.id;
    const activeChannelId = activeContact.channelId;
    const updateActiveConversation = (updater) => {
      updateConversationMessages(activeContactId, updater, { channelId: activeChannelId });
    };

    const applyIncomingSocketMessage = (rawMessage) => {
      const normalizedMessage = normalizeServerMessage(
        rawMessage,
        currentUserIdsRef.current,
        peerUserIdsRef.current
      );
      const shouldStayRead = normalizedMessage.from === "me" || isActiveConversationAtBottomRef.current;
      const unreadDelta = normalizedMessage.from === "them" && !shouldStayRead ? 1 : 0;
      const nextMessage = normalizedMessage.from === "them"
        ? { ...normalizedMessage, read: shouldStayRead, delivered: true }
        : normalizedMessage;
      const mergeIncoming = (messages = []) =>
        mergeMessagesAndReconcilePending(messages, [nextMessage]);

      updateActiveConversation(mergeIncoming);

      setContacts((current) =>
        current.map((contact) =>
          contact.id === activeContactId
            ? {
                ...contact,
                role: nextMessage.from === "me" ? `You: ${nextMessage.text || contact.role || ""}` : nextMessage.text || contact.role,
                lastMessageAt: nextMessage.timestamp || Date.now(),
                lastMessageFromMe: nextMessage.from === "me",
                unread: unreadDelta ? Number(contact.unread || contact.unread_count || contact.unreadCount || 0) + unreadDelta : 0,
                unread_count: unreadDelta ? Number(contact.unread_count || contact.unread || contact.unreadCount || 0) + unreadDelta : 0,
                unreadCount: unreadDelta ? Number(contact.unreadCount || contact.unread || contact.unread_count || 0) + unreadDelta : 0,
              }
            : contact
        )
      );

      setActiveContact((current) =>
        current?.id === activeContactId
          ? {
              ...current,
              role: nextMessage.from === "me" ? `You: ${nextMessage.text || current.role || ""}` : nextMessage.text || current.role,
              lastMessageAt: nextMessage.timestamp || Date.now(),
              lastMessageFromMe: nextMessage.from === "me",
              unread: unreadDelta ? Number(current.unread || current.unread_count || current.unreadCount || 0) + unreadDelta : 0,
              unread_count: unreadDelta ? Number(current.unread_count || current.unread || current.unreadCount || 0) + unreadDelta : 0,
              unreadCount: unreadDelta ? Number(current.unreadCount || current.unread || current.unread_count || 0) + unreadDelta : 0,
            }
          : current
      );

      queryClient.setQueriesData({ queryKey: ["dm-channels"] }, (current) => {
        if (!Array.isArray(current)) return current;

        const nextChannels = current.map((channel) =>
          String(channel.channel_id || channel.id) === String(activeChannelId) ||
          String(channel.user_id) === String(activeContactId)
            ? {
                ...channel,
                last_message: nextMessage.text || channel.last_message,
                last_message_at: new Date(nextMessage.timestamp || Date.now()).toISOString(),
                last_message_user_id: nextMessage.raw?.user_id || nextMessage.raw?.sender_id || channel.last_message_user_id,
                unread: unreadDelta ? getDmUnreadCount(channel) + unreadDelta : 0,
                unread_count: unreadDelta ? getDmUnreadCount(channel) + unreadDelta : 0,
                unreadCount: unreadDelta ? getDmUnreadCount(channel) + unreadDelta : 0,
              }
            : channel
        );

        syncDmUnreadTotal(nextChannels);
        return nextChannels;
      });

      if (!nextMessage.attachments?.length && isLikelyFileMessage(rawMessage)) {
        void queryClient.invalidateQueries({ queryKey: ["channel-messages", activeChannelId, activeContactId] });
      }
    };

    const applySocketPayload = (rawPayload) => {
      const eventType = String(rawPayload.type || rawPayload.event || "").toLowerCase();
      const messageId = rawPayload.message_id || rawPayload.id;

      if (eventType.includes("typing") || eventType.includes("presence") || eventType === "smart_reply") {
        return;
      }

      if (rawPayload.channel_id && String(rawPayload.channel_id) !== String(activeContact.channelId)) {
        return;
      }

      if (eventType.includes("deleted")) {
        if (!messageId) return;
        updateActiveConversation((messages) => removeMessageById(messages, messageId));
        return;
      }

      if (eventType.includes("read")) {
        if (!messageId) return;
        const readerId = rawPayload.user_id || rawPayload.userId || rawPayload.reader_id || rawPayload.readerId;
        const hasReaderId = Boolean(readerId);
        const readerIsCurrentUser = hasReaderId && currentUserIdsRef.current.includes(String(readerId));

        updateActiveConversation((messages) =>
          messages.map((message) => {
            if (String(message.id) !== String(messageId)) return message;

            if (message.from === "me") {
              return hasReaderId && !readerIsCurrentUser ? { ...message, read: true, delivered: true } : message;
            }

            return { ...message, read: true, delivered: true };
          })
        );
        return;
      }

      if (eventType.includes("reaction")) {
        if (!messageId) return;

        if (rawPayload.reactions) {
          updateActiveConversation((messages) =>
            replaceMessageReactions(messages, messageId, rawPayload.reactions)
          );
          return;
        }

        const emoji = rawPayload.emoji;
        if (!emoji) return;

        updateActiveConversation((messages) =>
          replaceMessageReactions(
            messages,
            messageId,
            [
              ...normalizeMessageReactions(
                messages.find((message) => String(message.id) === String(messageId))?.reactions || []
              ).filter((reaction) => reaction.emoji !== emoji),
              ...(Number(rawPayload.count || 0) > 0
                ? [{
                    emoji,
                    count: Number(rawPayload.count || 0),
                    users: Array.isArray(rawPayload.users) ? rawPayload.users : [],
                    reacted: currentUserIdsRef.current.includes(String(rawPayload.user_id)),
                  }]
                : []),
            ]
          )
        );
        return;
      }

      if (eventType.includes("edited") || eventType.includes("update")) {
        if (!messageId || !rawPayload.content) return;
        updateActiveConversation((messages) =>
          messages.map((message) =>
            String(message.id) === String(messageId)
              ? {
                  ...message,
                  text: rawPayload.content,
                  raw: { ...message.raw, ...rawPayload },
                }
              : message
          )
        );
        return;
      }

      const nestedMessage = rawPayload?.message || {};
      const hasAttachmentPayload = Boolean(
        rawPayload.file_id ||
        rawPayload.file ||
        nestedMessage.file_id ||
        nestedMessage.file ||
        (Array.isArray(rawPayload.files) && rawPayload.files.length) ||
        (Array.isArray(rawPayload.attachments) && rawPayload.attachments.length) ||
        (Array.isArray(nestedMessage.files) && nestedMessage.files.length) ||
        (Array.isArray(nestedMessage.attachments) && nestedMessage.attachments.length)
      );

      if (!rawPayload.content && !nestedMessage.content && !rawPayload.text && !nestedMessage.text && !hasAttachmentPayload) {
        return;
      }

      applyIncomingSocketMessage(rawPayload?.message || rawPayload);
    };

    const realtimeSocket = createRealtimeSocket(socketUrl, {
      heartbeatMessage: JSON.stringify({ event: "heartbeat", channel_id: String(activeChannelId) }),
      onOpen: (_event, socket) => {
        chatSocketRef.current = socket;
      },
      onMessage: async (event) => {
        try {
          const rawPayload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

          if (!rawPayload) return;

          applySocketPayload(rawPayload);
        } catch {
          return;
        }
      },
    });
    chatSocketRef.current = realtimeSocket.getSocket();

    return () => {
      realtimeSocket.close();
      chatSocketRef.current = null;
    };
  }, [
    activeContact?.channelId,
    activeContact?.id,
    queryClient,
    session?.accessToken,
    session?.userId,
    syncDmUnreadTotal,
    updateConversationMessages,
  ]);

  useEffect(() => {
    setPendingAttachment(null);
    setReplyTarget(null);
  }, [activeContact?.id, activeContact?.channelId]);

  function sendMessage() {
    const text = messageInput.trim();
    const attachments = editingMessageId
      ? []
      : Array.isArray(pendingAttachment)
        ? pendingAttachment
        : pendingAttachment
          ? [pendingAttachment]
          : [];
    const replyTo = editingMessageId ? null : createReplyReference(replyTarget);

    if ((!text && !attachments.length) || !activeContact || editMessageMutation.isPending) return;

    if (editingMessageId) {
      if (!activeContact.channelId) {
        toast.error("This message cannot be edited until the conversation is synced.");
        return;
      }

      editMessageMutation.mutate({
        messageId: editingMessageId,
        text,
      });
      return;
    }

    sendMessageMutation.mutate({
      targetUserId: activeContact.id,
      text: text || attachments.map((attachment) => attachment.name).join(", "),
      attachments,
      replyTo,
    });
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function handleInputChange(event) {
    setMessageInput(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 220)}px`;
    event.target.style.overflowY = event.target.scrollHeight > 220 ? "auto" : "hidden";
  }

  function openConversation(contact) {
    const normalizedContact = normalizeContactId(contact);

    if (!normalizedContact) return;

    const nextMessages = markIncomingMessagesRead(conversations[normalizedContact.id] || normalizedContact.messages || []);

    setConversations((current) => ({ ...current, [normalizedContact.id]: nextMessages }));
    setContacts((current) =>
      current.map((item) =>
        item.id === normalizedContact.id
          ? { ...item, messages: nextMessages, unread: 0, unread_count: 0, unreadCount: 0 }
          : item
      )
    );

    if (normalizedContact.channelId) {
      const readThroughTime = getLastMessageTime(nextMessages);

      markChannelLocallyRead(normalizedContact.channelId, readThroughTime);
      queryClient.setQueryData(["channel-unread-count", normalizedContact.channelId, normalizedContact.id], 0);
      queryClient.setQueriesData({ queryKey: ["dm-channels"] }, (current) =>
        {
          if (!Array.isArray(current)) return current;

          const nextChannels = current.map((channel) =>
            String(channel.channel_id || channel.id) === String(normalizedContact.channelId)
              ? { ...channel, unread: 0, unread_count: 0, unreadCount: 0 }
              : channel
          );

          syncDmUnreadTotal(nextChannels);
          return nextChannels;
        }
      );

      const latestMessage = nextMessages[nextMessages.length - 1];
      const readableIncomingMessageIds = getReadableIncomingMessageIds(nextMessages);

      if (latestMessage?.id && isServerMessageId(latestMessage.id) && !markChannelReadMutation.isPending) {
        markChannelReadMutation.mutate({
          channelId: normalizedContact.channelId,
          contactId: normalizedContact.id,
          messageId: latestMessage.id,
          messageIds: readableIncomingMessageIds,
          readThroughTime,
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["channel-messages", normalizedContact.channelId, normalizedContact.id],
      });
    }

    setActiveContact({ ...normalizedContact, unread: 0, unread_count: 0, unreadCount: 0, messages: nextMessages });
    setIsActiveConversationAtBottom(true);
    setIsMobileChatOpen(true);
    setIsNewChatMode(false);
    setSearchQuery("");
  }

  function handleSelectSearchUser(user) {
    const contactId = user.user_id || user.auth_user_id || user.id || user.email;
    const normalizedContact = normalizeContactId({
      id: contactId,
      user_id: user.user_id || user.auth_user_id || user.id,
      userId: user.user_id || user.auth_user_id || user.id,
      name: user.full_name || user.name || user.display_name || user.email || "Unknown user",
      role: user.email || user.user_role || "New conversation",
      online: Boolean(user.online || user.is_online || user.is_active),
      channelId: user.channel_id || user.dm_channel_id || user.direct_channel_id || null,
      image: getContactImageSource(user),
      unread: 0,
      messages: conversations[contactId] || [],
    });

    if (!normalizedContact) return;

    setContacts((current) =>
      current.some((item) => item.id === normalizedContact.id)
        ? current
        : [normalizedContact, ...current]
    );

    setConversations((current) => ({
      ...current,
      [normalizedContact.id]: current[normalizedContact.id] || [],
    }));

    openConversation(normalizedContact);
  }

  function openTargetUser(user) {
    const targetId = user.user_id || user.userId || user.auth_user_id || user.id || user.email;
    const targetIdentifiers = [targetId, user.user_id, user.userId, user.auth_user_id, user.id, user.email]
      .filter(Boolean)
      .map(String);
    const existingContact = contacts.find((item) => {
      const existingIdentifiers = [item.id, item.user_id, item.email, item.role]
        .filter(Boolean)
        .map(String);

      return targetIdentifiers.some((identifier) => existingIdentifiers.includes(identifier));
    });
    const normalizedContact = normalizeContactId({
      ...existingContact,
      id: targetId,
      user_id: user.user_id || user.userId || user.auth_user_id || user.id,
      userId: user.user_id || user.userId || user.auth_user_id || user.id,
      email: user.email,
      name: user.full_name || user.name || user.display_name || existingContact?.name || user.email || "Unknown user",
      role: user.email || existingContact?.role || user.user_role || "New conversation",
      online: Boolean(user.online || user.is_online || user.is_active || existingContact?.online),
      channelId: user.channel_id || user.dm_channel_id || user.direct_channel_id || existingContact?.channelId || null,
      image: getContactImageSource(user) || existingContact?.image || existingContact?.avatar_url || "",
      unread: 0,
      messages: conversations[targetId] || existingContact?.messages || [],
    });

    if (!normalizedContact) return;

    setContacts((current) => {
      const existing = current.find((item) => {
        const existingIdentifiers = [item.id, item.user_id, item.email, item.role]
          .filter(Boolean)
          .map(String);
        const targetIdentifiers = [normalizedContact.id, normalizedContact.user_id, normalizedContact.email, normalizedContact.role]
          .filter(Boolean)
          .map(String);

        return targetIdentifiers.some((identifier) => existingIdentifiers.includes(identifier));
      });

      if (existing) {
        return current.map((item) =>
          item === existing
            ? {
                ...item,
                ...normalizedContact,
                id: normalizedContact.id,
                channelId: item.channelId || normalizedContact.channelId,
                messages: item.messages || normalizedContact.messages,
              }
            : item
        );
      }

      return [normalizedContact, ...current];
    });

    setConversations((current) => ({
      ...current,
      [normalizedContact.id]: current[normalizedContact.id] || normalizedContact.messages || [],
    }));

    setActiveContact(normalizedContact);
    setReplyTarget(null);
    setIsMobileChatOpen(true);
    setIsNewChatMode(false);
    setSearchQuery("");
  }

  function beginEditMessage(messageId) {
    const message = currentMessages.find((item) => String(item.id) === String(messageId));

    if (!message || message.from !== "me" || message.isPending) return;

    setPendingAttachment(null);
    setReplyTarget(null);
    setEditingMessageId(message.id);
    setMessageInput(message.text || "");
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setMessageInput("");
  }

  function handleNewChatClick() {
    setIsNewChatMode(true);
    setSearchQuery("");
  }

  return {
    activeContact,
    activePresenceLabel,
    activeUnreadCount,
    activeTab,
    bottomRef,
    contacts,
    conversations,
    currentMessages,
    deferredNewChatQuery,
    editingMessageId,
    editMessageMutation,
    deleteMessageMutation,
    isMobileChatOpen,
    isActiveConversationAtBottom,
    isNewChatMode,
    messageInput,
    pendingAttachment,
    replyTarget,
    pendingCountsByContactId,
    reactionsByMessageId,
    searchInputRef,
    searchQuery,
    searchUsersQuery,
    sendMessageMutation,
    sidebarResults,
    isMessageSearchOpen,
    messageSearchQuery,
    searchMessagesQuery,
    setIsMessageSearchOpen,
    setMessageSearchQuery,
    addReaction: (messageId, emoji) => addReactionMutation.mutate({ messageId, emoji }),
    beginEditMessage,
    cancelSearch: () => {
      setIsNewChatMode(false);
      setSearchQuery("");
    },
    cancelEditMessage,
    deleteMessage: (messageId) => deleteMessageMutation.mutate(messageId),
    handleInputChange,
    handleKeyDown,
    handleNewChatClick,
    handleSelectSearchUser,
    openTargetUser,
    openConversation,
    pinMessage: (messageId) => pinMessageMutation.mutate(messageId),
    removeReaction: (messageId, emoji) => removeReactionMutation.mutate({ messageId, emoji }),
    removePendingAttachment: (attachmentId) =>
      setPendingAttachment((current) => {
        const attachments = Array.isArray(current) ? current : current ? [current] : [];
        const nextAttachments = attachmentId
          ? attachments.filter((attachment) => String(attachment.id) !== String(attachmentId))
          : [];
        return nextAttachments.length ? nextAttachments : null;
      }),
    setReplyTarget,
    cancelReply: () => setReplyTarget(null),
    sendMessage,
    uploadAttachment: Object.assign((files) => uploadAttachmentMutation.mutate(files), {
      isPending: uploadAttachmentMutation.isPending,
    }),
    showDeliveryStatus: (messageId) => deliveryStatusMutation.mutate(messageId),
    loadThreadMessages: (messageId) => threadMessagesMutation.mutate(messageId),
    translateMessage: (messageId, text, language) => translateMessageMutation.mutate({ messageId, text, language }),
    summarizeMessage: (messageId, text) => summarizeMessageMutation.mutate({ messageId, text }),
    setActiveTab,
    setIsActiveConversationAtBottom,
    setIsMobileChatOpen,
    setSearchQuery,
    unpinMessage: (messageId) => unpinMessageMutation.mutate(messageId),
    isLoadingConversations: dmChannelsQuery.isLoading,
    isLoadingMessages: channelMessagesQuery.isLoading,
    hasMoreMessages: Boolean(channelMessagesQuery.hasNextPage),
    isLoadingOlderMessages: channelMessagesQuery.isFetchingNextPage,
    loadOlderMessages: channelMessagesQuery.fetchNextPage,
  };
}
