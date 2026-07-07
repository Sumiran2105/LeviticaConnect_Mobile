import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  CHANNEL_AI_SUMMARY,
  CHANNEL_AI_SMART_REPLY,
  CHANNEL_AI_TRANSLATE,
  CHANNEL_MARK_READ,
  CHANNEL_MESSAGE,
  CHANNEL_MESSAGE_DELIVERY_STATUS,
  CHANNEL_MESSAGE_FORWARD,
  CHANNEL_MESSAGE_PIN,
  CHANNEL_MESSAGE_THREAD,
  CHANNEL_MESSAGE_UNPIN,
  CHANNEL_MESSAGES,
  CHANNEL_MESSAGES_SEARCH,
  CHAT_WEBSOCKET,
  MESSAGE_REACTION,
  MESSAGE_REACTIONS,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { createRealtimeSocket } from "@/lib/realtime-socket";
import {
  formatMessageDateTime,
  mergeMessagesAndReconcilePending,
  mergeMessages,
  normalizeCollection,
  normalizeMessageReactions,
  normalizeServerMessage,
  sortMessagesChronologically,
} from "@/features/chat/utils/chat-utils";
import { uploadFiles } from "@/lib/file-utils";

function normalizeChannelMessages(data, currentUserId) {
  return sortMessagesChronologically(
    normalizeCollection(data).map((message) => normalizeServerMessage(message, currentUserId))
  );
}

function replaceReactions(messages, messageId, reactions) {
  const nextReactions = normalizeMessageReactions(reactions);

  return messages.map((message) =>
    String(message.id) === String(messageId)
      ? { ...message, reactions: nextReactions }
      : message
  );
}

function applyReaction(messages, messageId, emoji, delta, currentUserName = "You") {
  return messages.map((message) => {
    if (String(message.id) !== String(messageId)) {
      return message;
    }

    const currentReactions = Array.isArray(message.reactions) ? message.reactions : [];
    const existingReaction = currentReactions.find((reaction) => reaction.emoji === emoji);

    if (!existingReaction && delta < 0) {
      return message;
    }

    if (!existingReaction) {
      return {
        ...message,
        reactions: [...currentReactions, { emoji, count: 1, users: [currentUserName], reacted: true }],
      };
    }

    const nextReactions = currentReactions
      .map((reaction) =>
        reaction.emoji === emoji
          ? {
              ...reaction,
              count: Math.max(0, Number(reaction.count || 0) + delta),
              reacted: delta > 0,
            }
          : reaction
      )
      .filter((reaction) => reaction.count > 0);

    return {
      ...message,
      reactions: nextReactions,
    };
  });
}

function replaceMessage(messages, nextMessage) {
  return sortMessagesChronologically(
    messages.map((message) =>
      String(message.id) === String(nextMessage.id) ? { ...message, ...nextMessage } : message
    )
  );
}

function updateMessageById(messages, messageId, patch) {
  return messages.map((message) =>
    String(message.id) === String(messageId) ? { ...message, ...patch } : message
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

function normalizeSmartReplySuggestions(data) {
  const payload = data?.suggestions || data?.data || data?.result || data;

  if (Array.isArray(payload)) {
    return payload
      .map((suggestion) =>
        typeof suggestion === "string"
          ? suggestion
          : suggestion?.text || suggestion?.message || suggestion?.reply || ""
      )
      .map((suggestion) => suggestion.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  if (typeof payload !== "string") {
    return [];
  }

  return payload
    .split(/\n|(?=\d+\.\s)|(?=-\s)|(?=•\s)/)
    .map((suggestion) => suggestion.replace(/^\s*(?:\d+\.|-|•)\s*/, "").replace(/^["']|["']$/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function removeMessageById(messages, messageId) {
  return messages.filter((message) => String(message.id) !== String(messageId));
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

const MESSAGE_PAGE_SIZE = 50;

function flattenMessagePages(data) {
  if (!data?.pages) return [];
  return sortMessagesChronologically(data.pages.flat());
}

export function useTeamMessages({ channelId, accessToken, currentUserId, enabled = true }) {
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const previousMessageEdgesRef = useRef({ firstId: null, lastId: null, length: 0 });
  const hydratedChannelIdRef = useRef(null);
  const fetchedMessageIdsRef = useRef(new Set());
  const lastChannelReadMessageIdRef = useRef(null);
  const smartReplyMutationRef = useRef(null);
  const [smartReplies, setSmartReplies] = useState([]);
  const [smartReplyMessageId, setSmartReplyMessageId] = useState(null);
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [pendingAttachmentDraft, setPendingAttachmentDraft] = useState(null);
  const deferredMessageSearchQuery = useDeferredValue(messageSearchQuery.trim());

  const canLoad = useMemo(
    () => Boolean(enabled && channelId && accessToken),
    [accessToken, channelId, enabled]
  );
  const queryKey = useMemo(
    () => ["shared-channel-messages", channelId, currentUserId],
    [channelId, currentUserId]
  );
  const pendingAttachment =
    pendingAttachmentDraft?.channelId && String(pendingAttachmentDraft.channelId) === String(channelId)
      ? pendingAttachmentDraft.attachment
      : null;

  const messagesQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const response = await apiClient.get(CHANNEL_MESSAGES(channelId), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit: MESSAGE_PAGE_SIZE,
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });

      return normalizeChannelMessages(response.data, currentUserId);
    },
    enabled: canLoad,
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.length >= MESSAGE_PAGE_SIZE ? lastPage[0]?.id : undefined,
    staleTime: 10 * 1000,
  });

  const searchMessagesQuery = useQuery({
    queryKey: ["channel-messages-search", channelId, deferredMessageSearchQuery],
    queryFn: async () => {
      const response = await apiClient.get(CHANNEL_MESSAGES_SEARCH, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { query: deferredMessageSearchQuery, channel_id: channelId },
      });

      return normalizeChannelMessages(response.data, currentUserId);
    },
    enabled: Boolean(accessToken && channelId && deferredMessageSearchQuery.length > 0 && isMessageSearchOpen),
    staleTime: 30 * 1000,
  });
  const messages = useMemo(() => flattenMessagePages(messagesQuery.data), [messagesQuery.data]);

  useEffect(() => {
    if (!canLoad) {
      hydratedChannelIdRef.current = null;
      fetchedMessageIdsRef.current = new Set();
      return;
    }

    if (!messages.length) {
      return;
    }

    if (hydratedChannelIdRef.current !== channelId) {
      hydratedChannelIdRef.current = channelId;
      fetchedMessageIdsRef.current = new Set(messages.map((message) => String(message.id)));
    }
  }, [canLoad, channelId, messages]);

  const updateMessagesCache = useCallback(
    (updater) => {
      queryClient.setQueryData(queryKey, (current) => {
        const currentMessages = flattenMessagePages(current);
        const nextValue = typeof updater === "function" ? updater(currentMessages) : updater;
        const nextMessages = sortMessagesChronologically(nextValue);

        if (!current?.pages) {
          return {
            pageParams: [null],
            pages: [nextMessages],
          };
        }

        return {
          ...current,
          pageParams: [current.pageParams?.[0] ?? null],
          pages: [nextMessages],
        };
      });
    },
    [queryClient, queryKey]
  );

  const applyMessageEdit = useCallback(
    (messageId, content, rawPayload) => {
      const updateEditedMessage = (current) =>
        current.map((message) =>
          String(message.id) === String(messageId)
            ? {
                ...message,
                text: content,
                raw: { ...message.raw, ...rawPayload },
              }
            : message
        );

      updateMessagesCache(updateEditedMessage);
    },
    [updateMessagesCache]
  );

  const applyMessageRead = useCallback(
    (messageId) => {
      const markRead = (current) =>
        current.map((message) =>
          String(message.id) === String(messageId)
            ? { ...message, read: true, delivered: true }
            : message
        );

      updateMessagesCache(markRead);
    },
    [updateMessagesCache]
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (payload) => {
      const text = typeof payload === "string" ? payload : payload?.text;
      const attachment = typeof payload === "string" ? null : payload?.attachment;
      const attachments = typeof payload === "string" ? [] : payload?.attachments || (attachment ? [attachment] : []);
      const replyTo = typeof payload === "string" ? null : payload?.replyTo;
      const replyToId = replyTo?.id || null;
      const rootId = replyTo?.rootId || replyToId;
      const response = await apiClient.post(
        CHANNEL_MESSAGES(channelId),
        {
          content: text,
          content_type: attachments.length ? "file" : "text",
          ...(attachments.length ? { file_ids: attachments.map((item) => item.id) } : {}),
          ...(replyToId
            ? {
                parent_id: replyToId,
                root_id: rootId,
                reply_to_message_id: replyToId,
              }
            : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data?.message || response.data;
    },
    onMutate: async (payload) => {
      const text = typeof payload === "string" ? payload : payload?.text;
      const attachment = typeof payload === "string" ? null : payload?.attachment;
      const attachments = typeof payload === "string" ? [] : payload?.attachments || (attachment ? [attachment] : []);
      const replyTo = typeof payload === "string" ? null : payload?.replyTo;
      const sentAt = Date.now();
      const optimisticMessage = {
        id: createPendingMessageId(),
        from: "me",
        text,
        time: formatMessageDateTime(sentAt),
        timestamp: sentAt,
        read: false,
        pinned: false,
        reactions: [],
        attachments,
        replyTo,
        isPending: true,
      };

      updateMessagesCache((current) => mergeMessages(current, [optimisticMessage]));

      return { optimisticMessage };
    },
    onSuccess: (message, payload, context) => {
      const attachment = typeof payload === "string" ? null : payload?.attachment;
      const attachments = typeof payload === "string" ? [] : payload?.attachments || (attachment ? [attachment] : []);
      const replyTo = typeof payload === "string" ? null : payload?.replyTo;
      const normalizedMessage = {
        ...normalizeServerMessage(message, currentUserId),
        from: "me",
      };
      if (attachments.length && !normalizedMessage.attachments?.length) {
        normalizedMessage.attachments = attachments;
      }
      if (
        replyTo &&
        (!normalizedMessage.replyTo?.text || normalizedMessage.replyTo?.senderName === "Message")
      ) {
        normalizedMessage.replyTo = {
          ...normalizedMessage.replyTo,
          ...replyTo,
        };
      }
      const replaceOptimisticMessage = (current) =>
        mergeMessages(
          context?.optimisticMessage
            ? removeMessageById(current, context.optimisticMessage.id)
            : current,
          [normalizedMessage]
        );

      fetchedMessageIdsRef.current.add(String(normalizedMessage.id));
      updateMessagesCache(replaceOptimisticMessage);
    },
    onError: (error, _text, context) => {
      if (context?.optimisticMessage) {
        const markMessageFailed = (current) =>
          current.map((message) =>
            String(message.id) === String(context.optimisticMessage.id)
              ? { ...message, isPending: false, failed: true }
              : message
          );

        updateMessagesCache(markMessageFailed);
      }

      toast.error(
        error.response?.data?.detail || error.response?.data?.message || "Unable to send the message right now."
      );
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (files) => {
      if (!channelId) {
        throw new Error("Select a channel before uploading a file.");
      }

      return uploadFiles({
        files,
        accessToken,
        contextName: `channel-${channelId}`,
      });
    },
    onSuccess: (attachments) => {
      const currentAttachments = Array.isArray(pendingAttachment) ? pendingAttachment : pendingAttachment ? [pendingAttachment] : [];
      setPendingAttachmentDraft({ channelId, attachment: [...currentAttachments, ...attachments] });
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
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return { messageId, emoji, data: response.data };
    },
    onMutate: ({ messageId, emoji }) => {
      updateMessagesCache((current) => applyReaction(current, messageId, emoji, 1));
    },
    onSuccess: ({ messageId, data }) => {
      if (data?.reactions) {
        updateMessagesCache((current) => replaceReactions(current, messageId, data.reactions));
      }
    },
    onError: (_error, { messageId, emoji }) => {
      updateMessagesCache((current) => applyReaction(current, messageId, emoji, -1));
      toast.error("Unable to add reaction right now.");
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      const response = await apiClient.delete(MESSAGE_REACTION(messageId, emoji), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return { messageId, emoji, data: response.data };
    },
    onMutate: ({ messageId, emoji }) => {
      updateMessagesCache((current) => applyReaction(current, messageId, emoji, -1));
    },
    onSuccess: ({ messageId, data }) => {
      if (data?.reactions) {
        updateMessagesCache((current) => replaceReactions(current, messageId, data.reactions));
      }
    },
    onError: (_error, { messageId, emoji }) => {
      updateMessagesCache((current) => applyReaction(current, messageId, emoji, 1));
      toast.error("Unable to remove reaction right now.");
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, text }) => {
      const response = await apiClient.put(
        CHANNEL_MESSAGE(channelId, messageId),
        { content: text, content_type: "text" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data?.message || response.data || { id: messageId, content: text };
    },
    onSuccess: (message, variables) => {
      const normalizedMessage = normalizeServerMessage(message, currentUserId);
      const nextMessage = normalizedMessage.text
        ? normalizedMessage
        : { id: variables.messageId, text: variables.text };

      updateMessagesCache((current) => replaceMessage(current, nextMessage));
      toast.success("Message updated.");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to edit message.");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await apiClient.delete(CHANNEL_MESSAGE(channelId, messageId), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return messageId;
    },
    onMutate: (messageId) => {
      const previousMessages = flattenMessagePages(queryClient.getQueryData(queryKey));
      const removeMessage = (current) => removeMessageById(current, messageId);

      updateMessagesCache(removeMessage);

      return { previousMessages };
    },
    onSuccess: () => {
      toast.success("Message deleted.");
    },
    onError: (error, _messageId, context) => {
      if (context?.previousMessages) {
        updateMessagesCache(context.previousMessages);
      }

      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to delete message.");
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await apiClient.post(CHANNEL_MESSAGE_PIN(channelId, messageId), null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return messageId;
    },
    onSuccess: (messageId) => {
      updateMessagesCache((current) => updateMessageById(current, messageId, { pinned: true }));
      toast.success("Message pinned.");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to pin message.");
    },
  });

  const unpinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await apiClient.post(CHANNEL_MESSAGE_UNPIN(channelId, messageId), null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return messageId;
    },
    onSuccess: (messageId) => {
      updateMessagesCache((current) => updateMessageById(current, messageId, { pinned: false }));
      toast.success("Message unpinned.");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to unpin message.");
    },
  });

  const markChannelReadMutation = useMutation({
    mutationFn: async (messageId) => {
      try {
        await apiClient.post(CHANNEL_MARK_READ(channelId), null, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            message_id: messageId,
          },
          suppressGlobalErrorReport: true,
        });
      } catch {
        // Read receipts are background sync; keep the conversation usable if the server rejects them.
      }

      return messageId;
    },
    onSuccess: () => {
      queryClient.setQueryData(["channel-unread-count", channelId], 0);
    },
  });

  const deliveryStatusMutation = useMutation({
    mutationFn: async (messageId) => {
      const response = await apiClient.get(CHANNEL_MESSAGE_DELIVERY_STATUS(channelId, messageId), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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
      const response = await apiClient.get(CHANNEL_MESSAGE_THREAD(channelId, messageId), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return normalizeChannelMessages(response.data, currentUserId);
    },
    onSuccess: (threadMessages) => {
      toast.info(`${threadMessages.length} thread messages found.`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to load thread.");
    },
  });

  const forwardMessageMutation = useMutation({
    mutationFn: async ({ messageId, targetChannelId }) => {
      await apiClient.post(
        CHANNEL_MESSAGE_FORWARD(channelId, messageId),
        { target_channel_id: targetChannelId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return targetChannelId;
    },
    onSuccess: () => {
      toast.success("Message forwarded.");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to forward message.");
    },
  });

  const translateMessageMutation = useMutation({
    mutationFn: async ({ messageId, text, language }) => {
      const response = await apiClient.post(
        CHANNEL_AI_TRANSLATE(channelId),
        {
          text,
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const translatedText = getTranslatedText(response.data);

      if (!translatedText) {
        throw new Error("Translation response did not include translated text.");
      }

      return { messageId, language, translatedText };
    },
    onMutate: ({ messageId, language }) => {
      const markTranslating = (current) =>
        updateMessageById(current, messageId, {
          translation: {
            language,
            text: "",
            isLoading: true,
          },
        });

      updateMessagesCache(markTranslating);
    },
    onSuccess: ({ messageId, language, translatedText }) => {
      const applyTranslation = (current) =>
        updateMessageById(current, messageId, {
          translation: {
            language,
            text: translatedText,
            isLoading: false,
          },
        });

      updateMessagesCache(applyTranslation);
    },
    onError: (error, variables) => {
      const clearTranslationLoading = (current) =>
        updateMessageById(current, variables.messageId, {
          translation: null,
        });

      updateMessagesCache(clearTranslationLoading);
      toast.error(error.response?.data?.detail || error.response?.data?.message || error.message || "Unable to translate message.");
    },
  });

  const summarizeMessageMutation = useMutation({
    mutationFn: async ({ messageId, text }) => {
      const response = await apiClient.post(
        CHANNEL_AI_SUMMARY(channelId),
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: { text },
        }
      );

      const summaryText = getSummaryText(response.data);

      if (!summaryText) {
        throw new Error("Summary response did not include summarized text.");
      }

      return { messageId, summaryText };
    },
    onMutate: ({ messageId }) => {
      const markSummarizing = (current) =>
        updateMessageById(current, messageId, {
          summary: {
            text: "",
            isLoading: true,
          },
        });

      updateMessagesCache(markSummarizing);
    },
    onSuccess: ({ messageId, summaryText }) => {
      const applySummary = (current) =>
        updateMessageById(current, messageId, {
          summary: {
            text: summaryText,
            isLoading: false,
          },
        });

      updateMessagesCache(applySummary);
    },
    onError: (error, variables) => {
      const clearSummaryLoading = (current) =>
        updateMessageById(current, variables.messageId, {
          summary: null,
        });

      updateMessagesCache(clearSummaryLoading);
      toast.error(error.response?.data?.detail || error.response?.data?.message || error.message || "Unable to summarize message.");
    },
  });

  const smartReplyMutation = useMutation({
    mutationFn: async ({ messageId, text }) => {
      const response = await apiClient.post(CHANNEL_AI_SMART_REPLY(channelId), null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: { message: text },
      });

      return {
        messageId,
        suggestions: normalizeSmartReplySuggestions(response.data),
      };
    },
    onSuccess: ({ messageId, suggestions }) => {
      if (!suggestions.length) return;

      setSmartReplyMessageId(messageId);
      setSmartReplies(suggestions);
    },
  });

  useEffect(() => {
    smartReplyMutationRef.current = smartReplyMutation.mutate;
  }, [smartReplyMutation.mutate]);

  useEffect(() => {
    if (!canLoad || !messages.length) {
      lastChannelReadMessageIdRef.current = null;
      return;
    }

    const latestMessage = messages[messages.length - 1];

    if (!latestMessage?.id) return;

    if (!isServerMessageId(latestMessage.id)) return;

    if (lastChannelReadMessageIdRef.current !== latestMessage.id && !markChannelReadMutation.isPending) {
      lastChannelReadMessageIdRef.current = latestMessage.id;
      markChannelReadMutation.mutate(latestMessage.id);
    }
  }, [canLoad, markChannelReadMutation, messages]);

  useEffect(() => {
    if (!canLoad) {
      return undefined;
    }

    const socketUrl = CHAT_WEBSOCKET(channelId, accessToken);

    if (!socketUrl) {
      return undefined;
    }

    const realtimeSocket = createRealtimeSocket(socketUrl, {
      heartbeatMessage: JSON.stringify({ event: "heartbeat", channel_id: String(channelId) }),
      onOpen: (_event, socket) => {
        socketRef.current = socket;
      },
      onMessage: async (event) => {
        try {
          const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

          if (!payload) {
            return;
          }

          const eventType = String(payload.type || payload.event || "").toLowerCase();
          const messageId = payload.message_id || payload.id;

          if (eventType === "smart_reply") {
            const suggestions = normalizeSmartReplySuggestions(payload);

            if (suggestions.length) {
              setSmartReplyMessageId(messageId || payload.message?.id || null);
              setSmartReplies(suggestions);
            }
            return;
          }

          if (eventType.includes("typing") || eventType.includes("presence")) {
            return;
          }

          if (payload.channel_id && String(payload.channel_id) !== String(channelId)) {
            return;
          }

          if (eventType.includes("deleted")) {
            if (!messageId) return;
            updateMessagesCache((current) => removeMessageById(current, messageId));
            fetchedMessageIdsRef.current.delete(String(messageId));
            return;
          }

          if (eventType.includes("read")) {
            if (!messageId) return;
            applyMessageRead(messageId);
            return;
          }

          if (eventType.includes("reaction")) {
            if (!messageId) return;

            if (payload.reactions) {
              updateMessagesCache((current) => replaceReactions(current, messageId, payload.reactions));
              return;
            }

            const emoji = payload.emoji;
            if (!emoji) return;

            const nextReaction =
              Number(payload.count || 0) > 0
                ? [{
                    emoji,
                    count: Number(payload.count || 0),
                    users: Array.isArray(payload.users) ? payload.users : [],
                    reacted: false,
                  }]
                : [];

            updateMessagesCache((current) => replaceReactions(
              current,
              messageId,
              [
                ...normalizeMessageReactions(
                  current.find((message) => String(message.id) === String(messageId))?.reactions || []
                ).filter((reaction) => reaction.emoji !== emoji),
                ...nextReaction,
              ]
            ));
            return;
          }

          if (eventType.includes("edited") || eventType.includes("update")) {
            if (!messageId || !payload.content) return;
            applyMessageEdit(messageId, payload.content, payload);
            return;
          }

          if (!payload.content && !payload.message?.content && !payload.text && !payload.message?.text) {
            return;
          }

          if (messageId && fetchedMessageIdsRef.current.has(String(messageId))) {
            return;
          }

          const normalizedMessage = normalizeServerMessage(payload?.message || payload, currentUserId);
          fetchedMessageIdsRef.current.add(String(normalizedMessage.id));
          updateMessagesCache((current) => mergeMessagesAndReconcilePending(current, [normalizedMessage]));

          if (normalizedMessage.from === "them" && normalizedMessage.text) {
            smartReplyMutationRef.current?.({
              messageId: normalizedMessage.id,
              text: normalizedMessage.text,
            });
          }
        } catch {
          return;
        }
      },
    });
    socketRef.current = realtimeSocket.getSocket();

    return () => {
      realtimeSocket.close();
      socketRef.current = null;
    };
  }, [accessToken, applyMessageEdit, applyMessageRead, canLoad, channelId, currentUserId, updateMessagesCache]);

  useEffect(() => {
    const firstId = messages[0]?.id || null;
    const lastId = messages[messages.length - 1]?.id || null;
    const previous = previousMessageEdgesRef.current;
    const loadedOlderMessages =
      previous.lastId &&
      previous.lastId === lastId &&
      previous.firstId !== firstId &&
      messages.length > previous.length;

    previousMessageEdgesRef.current = { firstId, lastId, length: messages.length };

    if (loadedOlderMessages) {
      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior: messages.length > 12 ? "auto" : "smooth",
      block: "end",
    });
  }, [messages]);

  const sendMessage = useCallback((text = "", options = {}) => {
    const trimmedText = String(text || "").trim();
    const attachments = Array.isArray(pendingAttachment)
      ? pendingAttachment
      : pendingAttachment
        ? [pendingAttachment]
        : [];
    const replyTo = createReplyReference(options.replyTo);

    if (!trimmedText && !attachments.length) return;

    setPendingAttachmentDraft(null);
    sendMessageMutation.mutate({
      text: trimmedText || attachments.map((attachment) => attachment.name).join(", "),
      attachments,
      replyTo,
    });
  }, [pendingAttachment, sendMessageMutation]);

  return {
    messages,
    bottomRef,
    isLoading: messagesQuery.isLoading,
    isLoadingOlderMessages: messagesQuery.isFetchingNextPage,
    hasMoreMessages: Boolean(messagesQuery.hasNextPage),
    isSending: sendMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isMessageSearchOpen,
    setIsMessageSearchOpen,
    messageSearchQuery,
    pendingAttachment,
    setMessageSearchQuery,
    searchMessagesQuery,
    smartReplies,
    smartReplyMessageId,
    isLoadingSmartReplies: smartReplyMutation.isPending,
    clearSmartReplies: useCallback(() => {
      setSmartReplies([]);
      setSmartReplyMessageId(null);
    }, []),
    sendMessage,
    removePendingAttachment: useCallback((attachmentId) => {
      setPendingAttachmentDraft((current) => {
        const attachments = Array.isArray(current?.attachment)
          ? current.attachment
          : current?.attachment
            ? [current.attachment]
            : [];
        const nextAttachments = attachmentId
          ? attachments.filter((attachment) => String(attachment.id) !== String(attachmentId))
          : [];
        return nextAttachments.length ? { ...current, attachment: nextAttachments } : null;
      });
    }, []),
    uploadAttachment: Object.assign((files) => uploadAttachmentMutation.mutate(files), {
      isPending: uploadAttachmentMutation.isPending,
    }),
    addReaction: useCallback(
      (messageId, emoji) => addReactionMutation.mutate({ messageId, emoji }),
      [addReactionMutation]
    ),
    removeReaction: useCallback(
      (messageId, emoji) => removeReactionMutation.mutate({ messageId, emoji }),
      [removeReactionMutation]
    ),
    editMessage: useCallback(
      (messageId, text) => editMessageMutation.mutate({ messageId, text }),
      [editMessageMutation]
    ),
    deleteMessage: useCallback((messageId) => deleteMessageMutation.mutate(messageId), [deleteMessageMutation]),
    pinMessage: useCallback((messageId) => pinMessageMutation.mutate(messageId), [pinMessageMutation]),
    unpinMessage: useCallback((messageId) => unpinMessageMutation.mutate(messageId), [unpinMessageMutation]),
    showDeliveryStatus: useCallback(
      (messageId) => deliveryStatusMutation.mutate(messageId),
      [deliveryStatusMutation]
    ),
    loadThreadMessages: useCallback(
      (messageId) => threadMessagesMutation.mutate(messageId),
      [threadMessagesMutation]
    ),
    forwardMessage: useCallback(
      (messageId, targetChannelId) => forwardMessageMutation.mutate({ messageId, targetChannelId }),
      [forwardMessageMutation]
    ),
    translateMessage: useCallback(
      (messageId, text, language) => translateMessageMutation.mutate({ messageId, text, language }),
      [translateMessageMutation]
    ),
    summarizeMessage: useCallback(
      (messageId, text) => summarizeMessageMutation.mutate({ messageId, text }),
      [summarizeMessageMutation]
    ),
    loadOlderMessages: messagesQuery.fetchNextPage,
    refetchMessages: messagesQuery.refetch,
  };
}
