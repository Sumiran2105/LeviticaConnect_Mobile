import {
  formatPlatformDateTime,
  formatPlatformTime,
  getPlatformTimestamp,
} from "@/lib/date-time";
import { normalizeMessageAttachments } from "@/lib/file-utils";

const chatStorageKeyPrefix = "Levitica Connect-user-chat-state-v5";

export function normalizeSearchResults(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

export function normalizeDmChannels(data) {
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

export function normalizeCollection(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.messages)) {
    return data.messages;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

export function normalizeReadStatus(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.reads)) {
    return data.reads;
  }

  if (Array.isArray(data?.read_by)) {
    return data.read_by;
  }

  if (Array.isArray(data?.readBy)) {
    return data.readBy;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

export function normalizeMessageReactions(data) {
  const reactions = normalizeCollection(data);

  return reactions
    .map((reaction) => ({
      emoji: reaction?.emoji,
      count: Number(reaction?.count || reaction?.total || 0),
      users: Array.isArray(reaction?.users) ? reaction.users : [],
      user_ids: Array.isArray(reaction?.user_ids) ? reaction.user_ids : [],
      reacted: Boolean(reaction?.reacted || reaction?.is_mine || reaction?.mine),
    }))
    .filter((reaction) => reaction.emoji && reaction.count > 0);
}

export function getMessageTimestamp(message) {
  const rawValue =
    message?.created_at ||
    message?.sent_at ||
    message?.created_on ||
    message?.updated_at ||
    message?.createdAt ||
    message?.sentAt ||
    message?.timestamp ||
    null;

  return getPlatformTimestamp(rawValue);
}

export function sortMessagesChronologically(messages = []) {
  return [...messages].sort((a, b) => {
    const first = a?.timestamp ?? 0;
    const second = b?.timestamp ?? 0;

    if (first !== second) {
      return first - second;
    }

    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });
}

export function isDeletedMessage(message) {
  return Boolean(message?.isDeleted || message?.is_deleted || message?.deleted_at);
}

export function mergeMessages(existing = [], incoming = []) {
  const byId = new Map();

  existing.forEach((message) => {
    if (!message?.id) {
      return;
    }

    byId.set(String(message.id), message);
  });

  incoming.forEach((message) => {
    if (!message?.id) {
      return;
    }

    const messageId = String(message.id);

    if (isDeletedMessage(message)) {
      byId.delete(messageId);
      return;
    }

    const existingMessage = byId.get(messageId);
    const incomingReplyText = message?.replyTo?.text?.trim?.() || "";
    const existingReplyText = existingMessage?.replyTo?.text?.trim?.() || "";

    byId.set(messageId, {
      ...message,
      replyTo:
        message?.replyTo && existingReplyText && !incomingReplyText
          ? {
              ...message.replyTo,
              ...existingMessage.replyTo,
            }
          : message?.replyTo,
    });
  });

  return sortMessagesChronologically(Array.from(byId.values()));
}

export function mergeMessagesAndReconcilePending(existing = [], incoming = []) {
  const incomingMessages = Array.isArray(incoming) ? incoming : [incoming].filter(Boolean);
  let nextExisting = existing;

  incomingMessages.forEach((incomingMessage) => {
    if (incomingMessage?.from !== "me" || !incomingMessage?.text) {
      return;
    }

    const incomingTimestamp = Number(incomingMessage.timestamp) || Date.now();
    const pendingMatch = nextExisting.find((message) => {
      if (!message?.isPending || message.from !== "me" || message.text !== incomingMessage.text) {
        return false;
      }

      const pendingTimestamp = Number(message.timestamp) || incomingTimestamp;
      return Math.abs(pendingTimestamp - incomingTimestamp) < 30 * 1000;
    });

    if (pendingMatch) {
      const incomingReplyText = incomingMessage?.replyTo?.text?.trim?.() || "";
      const pendingReplyText = pendingMatch?.replyTo?.text?.trim?.() || "";

      if (pendingReplyText && !incomingReplyText) {
        incomingMessage.replyTo = {
          ...incomingMessage.replyTo,
          ...pendingMatch.replyTo,
        };
      }

      nextExisting = nextExisting.filter((message) => String(message.id) !== String(pendingMatch.id));
    }
  });

  return mergeMessages(nextExisting, incomingMessages);
}

export function formatMessageTime(value) {
  if (!value) {
    return formatPlatformTime();
  }

  return formatPlatformTime(value);
}

export function formatMessageDateTime(value) {
  return formatPlatformDateTime(value || Date.now());
}

function firstNonEmptyValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || null;
}

function getMessageSenderName(message) {
  const firstName = message?.first_name || message?.user?.first_name || message?.sender?.first_name;
  const lastName = message?.last_name || message?.user?.last_name || message?.sender?.last_name;
  const fullName = firstNonEmptyValue(
    firstName || lastName ? `${firstName || ""} ${lastName || ""}` : "",
    message?.sender_name,
    message?.senderName,
    message?.user_name,
    message?.userName,
    message?.author_name,
    message?.authorName,
    message?.created_by_name,
    message?.sender?.full_name,
    message?.sender?.name,
    message?.sender?.display_name,
    message?.user?.full_name,
    message?.user?.name,
    message?.user?.display_name,
    message?.full_name,
    message?.name,
    message?.display_name
  );

  return fullName;
}

function getMessageSenderEmail(message) {
  return firstNonEmptyValue(
    message?.sender_email,
    message?.senderEmail,
    message?.user_email,
    message?.userEmail,
    message?.created_by_email,
    message?.sender?.email,
    message?.user?.email,
    message?.email
  );
}

function normalizeReplyReference(message) {
  const reply =
    message?.reply_message ||
    message?.replyMessage ||
    message?.reply_to_message ||
    message?.replyToMessage ||
    message?.parent_message ||
    message?.parentMessage ||
    message?.quoted_message ||
    message?.quotedMessage ||
    message?.reply ||
    null;
  const replyId =
    message?.reply_to_message_id ||
    message?.replyToMessageId ||
    message?.parent_id ||
    message?.parentId ||
    reply?.id ||
    reply?.message_id ||
    null;

  if (!replyId && !reply) {
    return null;
  }

  return {
    id: replyId ? String(replyId) : null,
    rootId: message?.root_id || message?.rootId || reply?.root_id || reply?.rootId || replyId || null,
    senderName: getMessageSenderName(reply || {}) || message?.reply_to_sender_name || message?.replyToSenderName || "Message",
    text: reply?.content || reply?.message || reply?.text || message?.reply_to_content || message?.replyToContent || "",
    time: reply
      ? formatMessageTime(
          reply.created_at ||
            reply.sent_at ||
            reply.created_on ||
            reply.updated_at ||
            reply.createdAt ||
            reply.sentAt ||
            reply.timestamp
        )
      : "",
  };
}

export function normalizeServerMessage(message, currentUserId, peerUserId = null) {
  const senderIdentifiers = [
    message.user_id ||
    message.sender_id ||
    message.sender?.id ||
    message.sender?.user_id ||
    message.user?.id ||
    message.user?.user_id ||
    message.author_id ||
    message.created_by_id ||
    message.created_by,
    message.email,
    message.user_email,
    message.sender_email,
    message.sender?.email,
    message.user?.email,
    message.created_by_email,
  ].filter(Boolean);
  const currentUserIdentifiers = Array.isArray(currentUserId)
    ? currentUserId.filter(Boolean).map(String)
    : [currentUserId].filter(Boolean).map(String);
  const peerIdentifiers = Array.isArray(peerUserId)
    ? peerUserId.filter(Boolean).map(String)
    : [peerUserId].filter(Boolean).map(String);
  const explicitFromCurrentUser =
    message.is_own || message.is_mine || message.from_me || message.is_sender;
  const matchesCurrentUser = senderIdentifiers.some((id) =>
    currentUserIdentifiers.includes(String(id))
  );
  const matchesPeer = senderIdentifiers.some((id) => peerIdentifiers.includes(String(id)));
  const isFromCurrentUser =
    explicitFromCurrentUser ||
    (currentUserIdentifiers.length && senderIdentifiers.length
      ? matchesCurrentUser
      : peerIdentifiers.length && senderIdentifiers.length
        ? !matchesPeer
        : false);

  const readByIds = [
    ...(Array.isArray(message.read_by) ? message.read_by : []),
    ...(Array.isArray(message.readBy) ? message.readBy : []),
    ...(Array.isArray(message.reads) ? message.reads.map((read) => read?.user_id || read?.userId || read?.id) : []),
  ]
    .filter(Boolean)
    .map(String);
  const readBySomeoneElse = readByIds.some((id) => !currentUserIdentifiers.includes(String(id)));
  const hasPeerReadReceipt = peerIdentifiers.length
    ? readByIds.some((id) => peerIdentifiers.includes(String(id)))
    : readBySomeoneElse;
  const deliveryStatus = String(message.delivery_status || message.deliveryStatus || message.status || "").toLowerCase();
  const isRead = isFromCurrentUser
    ? Boolean(hasPeerReadReceipt || deliveryStatus === "read" || deliveryStatus === "seen")
    : Boolean(message.is_read || message.read_at || message.seen_at || message.read);
  const isDelivered = Boolean(
    isRead ||
      message.is_delivered ||
      message.delivered ||
      message.delivered_at ||
      deliveryStatus === "delivered" ||
      deliveryStatus === "read" ||
      deliveryStatus === "seen"
  );
  const senderName = getMessageSenderName(message);
  const senderEmail = getMessageSenderEmail(message);
  const timestamp = getMessageTimestamp(message) || Date.now();

  return {
    id: message.id || message.message_id || `${Date.now()}-${Math.random()}`,
    from: isFromCurrentUser ? "me" : "them",
    text: message.content || message.message || message.text || "",
    time: formatMessageTime(
      message.created_at ||
        message.sent_at ||
        message.created_on ||
        message.updated_at ||
        message.createdAt ||
        message.sentAt ||
        message.timestamp
    ),
    timestamp,
    delivered: isDelivered,
    read: isRead,
    pinned: Boolean(message.is_pinned),
    attachments: normalizeMessageAttachments(message),
    isForwarded: Boolean(
      message.forward_from_message_id ||
      message.forward_from_channel_id ||
      message.forward_from ||
      message.is_forwarded ||
      message.forwarded
    ),
    replyTo: normalizeReplyReference(message),
    isDeleted: isDeletedMessage(message),
    senderId: senderIdentifiers[0] || null,
    senderName,
    senderEmail,
    reactions: normalizeMessageReactions(message.reactions),
    raw: message,
  };
}

export function getJwtPayload(token) {
  if (!token || typeof window === "undefined") {
    return {};
  }

  try {
    const [, payload] = String(token).split(".");
    if (!payload) return {};

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );

    return JSON.parse(window.atob(paddedPayload));
  } catch {
    return {};
  }
}

export function getSessionUserIdentifiers(session) {
  const tokenPayload = getJwtPayload(session?.accessToken);

  return Array.from(
    new Set(
      [
        session?.userId,
        session?.user_id,
        session?.id,
        session?.email,
        tokenPayload?.sub,
        tokenPayload?.user_id,
        tokenPayload?.id,
        tokenPayload?.email,
      ]
        .filter(Boolean)
        .map(String)
    )
  );
}

export function getChatStorageKey(session) {
  const identity = session?.userId || session?.email;

  if (!identity) {
    return null;
  }

  return `${chatStorageKeyPrefix}-${identity}`;
}

export function loadStoredChatState(storageKey) {
  if (typeof window === "undefined" || !storageKey) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function mergeContacts(storedContacts = []) {
  const byId = new Map();

  storedContacts.forEach((contact) => {
    byId.set(String(contact.id), {
      ...contact,
      messages: [],
    });
  });

  return Array.from(byId.values());
}

export function getInitialContacts(storageKey) {
  const stored = loadStoredChatState(storageKey);
  return mergeContacts(stored?.contacts || []);
}

export function getInitialConversations(contacts) {
  return Object.fromEntries(contacts.map((contact) => [contact.id, []]));
}

export function getInitialChatState(storageKey) {
  const contacts = getInitialContacts(storageKey);

  return {
    contacts,
    activeContact: contacts[0] || null,
    conversations: getInitialConversations(contacts, storageKey),
  };
}
