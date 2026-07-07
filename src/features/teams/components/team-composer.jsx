import { memo, useLayoutEffect, useRef, useState } from "react";
import { FileText, FileUp, Image as ImageIcon, LoaderCircle, Paperclip, Plus as PlusIcon, Send, Smile, Sparkles, UserRoundPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentionSuggestions } from "./mention-suggestions";
import { EmojiPicker } from "./emoji-picker";

const COMPOSER_MAX_HEIGHT = 220;

export const TeamComposer = memo(function TeamComposer({
  isSending,
  messageInput,
  editingMessageId,
  onChange,
  onKeyDown,
  onRemovePendingAttachment,
  onSend,
  pendingAttachment,
  onCancelEdit,
  replyTarget,
  onCancelReply,
  onUploadAttachment,
  placeholder = "Type a message",
  disabled = false,
  channelMembers = [],
  isFetchingMembers = false,
  onMentionInsert,
  smartReplies = [],
  isLoadingSmartReplies = false,
  onSmartReplySelect,
}) {
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isEditing = Boolean(editingMessageId);
  const hasMessageText = Boolean(messageInput.trim());
  const pendingAttachments = Array.isArray(pendingAttachment)
    ? pendingAttachment
    : pendingAttachment
      ? [pendingAttachment]
      : [];
  const hasPendingAttachment = pendingAttachments.length > 0;
  const canSend = hasMessageText || (!isEditing && hasPendingAttachment);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const isUploadingAttachment = Boolean(onUploadAttachment?.isPending);
  
  // Mention state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState("");

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
    textarea.style.overflowY = textarea.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }, [messageInput]);

  const updateMessageValue = (value) => {
    onChange?.({ target: { value } });
  };

  const insertText = (text) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      updateMessageValue(`${messageInput}${text}`);
      return;
    }

    const start = textarea.selectionStart ?? messageInput.length;
    const end = textarea.selectionEnd ?? messageInput.length;
    const nextValue = `${messageInput.slice(0, start)}${text}${messageInput.slice(end)}`;

    updateMessageValue(nextValue);

    window.setTimeout(() => {
      textarea.focus();
      const nextCursorPosition = start + text.length;
      textarea.selectionStart = nextCursorPosition;
      textarea.selectionEnd = nextCursorPosition;
    }, 0);
  };

  const handleEmojiSelect = (emoji) => {
    insertText(emoji);
    setShowEmojiPicker(false);
  };

  const handleAttachmentSelect = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    onUploadAttachment?.(files);
    setShowMoreOptions(false);
  };

  const updateMentionState = (value, cursorPos = value.length) => {
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) {
      setShowMentionSuggestions(false);
      setMentionSearchQuery("");
      return;
    }

    // Check if @ is at the start or preceded by whitespace
    const isValidMentionStart =
      lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]);

    if (!isValidMentionStart) {
      setShowMentionSuggestions(false);
      setMentionSearchQuery("");
      return;
    }

    // Extract search query after @
    const query = textBeforeCursor.substring(lastAtIndex + 1);

    // A newline ends the mention search, but spaces are allowed for full names.
    if (/[\n]/.test(query)) {
      setShowMentionSuggestions(false);
      setMentionSearchQuery("");
      return;
    }

    setMentionSearchQuery(query);
    setShowMentionSuggestions(true);
  };

  const handleTextChange = (event) => {
    onChange?.(event);
    updateMentionState(event.target.value, event.target.selectionStart);
  };

  const handleCursorMentionCheck = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    updateMentionState(messageInput, textarea.selectionStart);
  };

  const handleMemberSelect = (member) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = messageInput.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) return;

    // Replace @ and search query with mention
    const beforeMention = messageInput.substring(0, lastAtIndex);
    const afterMention = messageInput.substring(cursorPos);
    const mentionName = member.full_name || member.fullName || member.name;
    const mentionText = `@${mentionName}`;
    const newMessage = `${beforeMention}${mentionText} ${afterMention}`;

    // Update the message through onChange callback
    updateMessageValue(newMessage);

    // Call the mention insert callback if provided
    onMentionInsert?.(member, newMessage);

    setShowMentionSuggestions(false);
    setMentionSearchQuery("");

    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + mentionText.length + 1;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleEveryoneMention = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = messageInput.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) return;

    const beforeMention = messageInput.substring(0, lastAtIndex);
    const afterMention = messageInput.substring(cursorPos);
    const mentionText = "@everyone";
    const newMessage = `${beforeMention}${mentionText} ${afterMention}`;

    updateMessageValue(newMessage);

    setShowMentionSuggestions(false);
    setMentionSearchQuery("");

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + mentionText.length + 1;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="shrink-0 border-t border-gray-200/80 bg-white/95 backdrop-blur-xl">
      {isEditing && (
        <div className="mx-6 mt-4 flex items-center justify-between rounded-2xl border border-brand-primary/15 bg-brand-soft/70 px-4 py-2.5">
          <div className="min-w-0 text-sm text-brand-ink">
            <p className="font-semibold text-brand-primary">Editing message</p>
            <p className="truncate text-xs text-brand-ink/60">Update your channel message, then send to save.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
            className="h-auto rounded-xl px-2 py-1.5 text-brand-ink/60 hover:bg-white hover:text-brand-primary"
          >
            Cancel
          </Button>
        </div>
      )}
      {replyTarget && !isEditing ? (
        <div className="mx-6 mt-4 flex items-start justify-between gap-3 rounded-2xl border border-brand-primary/15 bg-gradient-to-r from-brand-soft/90 to-white px-4 py-3 shadow-sm">
          <div className="min-w-0 border-l-4 border-brand-primary pl-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-primary">Replying to</p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-bold text-slate-800">
                {replyTarget.senderName || "Message"}
              </span>
              {replyTarget.time ? (
                <span className="shrink-0 text-xs font-semibold text-slate-400">{replyTarget.time}</span>
              ) : null}
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
              {replyTarget.text || "Attachment"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            className="h-auto shrink-0 rounded-xl px-2 py-1.5 text-slate-400 hover:bg-white hover:text-slate-800"
            aria-label="Cancel reply"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
      {(isLoadingSmartReplies || smartReplies.length > 0) && !isEditing ? (
        <div className="border-b border-gray-100 px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
            <Sparkles className="size-4 shrink-0 text-brand-primary" />
            {isLoadingSmartReplies && !smartReplies.length ? (
              <>
                <div className="h-8 w-24 shrink-0 rounded-full animate-shimmer" />
                <div className="h-8 w-32 shrink-0 rounded-full animate-shimmer" />
                <div className="h-8 w-28 shrink-0 rounded-full animate-shimmer" />
              </>
            ) : (
              smartReplies.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSmartReplySelect?.(suggestion)}
                  className="shrink-0 rounded-full border border-brand-primary/15 bg-brand-soft/70 px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
      <div className="relative px-6 py-4">
        {showEmojiPicker ? (
          <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
        ) : null}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAttachmentSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleAttachmentSelect}
        />
        <div className="relative flex items-end gap-3 rounded-[24px] border border-slate-200 bg-slate-50/50 px-4 py-2.5 shadow-sm transition-all duration-200 focus-within:border-brand-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-primary/10">
          <button
            type="button"
            disabled={disabled || isUploadingAttachment}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-xl p-2 text-slate-500 transition-all duration-200 hover:scale-105 hover:bg-slate-100 hover:text-brand-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            title="Attach file"
          >
            {isUploadingAttachment ? <LoaderCircle className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
          </button>
          <div className="relative flex-1">
            {hasPendingAttachment && !isEditing ? (
              <div className="mb-2 flex max-w-md flex-col gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                {pendingAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-primary">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-850">{attachment.name}</p>
                      <p className="truncate text-xs text-slate-400">{attachment.type || "Ready to send"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemovePendingAttachment?.(attachment.id)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                      aria-label="Remove attachment"
                      title="Remove attachment"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <textarea
              ref={textareaRef}
              rows={1}
              value={messageInput}
              onChange={handleTextChange}
              onKeyDown={onKeyDown}
              onKeyUp={handleCursorMentionCheck}
              onClick={handleCursorMentionCheck}
              placeholder={placeholder}
              disabled={disabled}
              className="max-h-[220px] min-h-8 w-full resize-none border-none bg-transparent py-1 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400/80 focus:outline-none disabled:cursor-not-allowed [scrollbar-width:thin]"
            />
            
            {/* Mention suggestions dropdown */}
            {showMentionSuggestions && (
              <div className="absolute bottom-full left-0 mb-2 z-50">
                <MentionSuggestions
                  members={channelMembers}
                  searchQuery={mentionSearchQuery}
                  isLoading={isFetchingMembers}
                  onSelectMember={handleMemberSelect}
                  onSelectEveryone={handleEveryoneMention}
                  onAddMember={() => {
                    // TODO: Handle adding new member to channel
                    setShowMentionSuggestions(false);
                  }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowEmojiPicker(true)}
            className="shrink-0 rounded-xl p-2 text-slate-500 transition-all duration-200 hover:scale-105 hover:bg-slate-100 hover:text-brand-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            title="Add emoji"
          >
            <Smile className="size-5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowMoreOptions((current) => !current)}
            className="shrink-0 rounded-xl p-2 text-slate-500 transition-all duration-200 hover:scale-105 hover:bg-slate-100 hover:text-brand-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            title="More options"
          >
            <PlusIcon className="size-5" />
          </button>
          {showMoreOptions ? (
            <div className="glass-tooltip absolute bottom-full right-16 z-40 mb-3 w-56 overflow-hidden rounded-2xl p-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-brand-soft hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ImageIcon className="size-4" />
                Upload image
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-brand-soft hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileUp className="size-4" />
                Upload file
              </button>
              <button
                type="button"
                onClick={() => {
                  insertText("@");
                  setShowMoreOptions(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-brand-soft hover:text-brand-primary"
              >
                <UserRoundPlus className="size-4" />
                Mention member
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(true);
                  setShowMoreOptions(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-brand-soft hover:text-brand-primary"
              >
                <Smile className="size-4" />
                Add emoji
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onSend}
            disabled={disabled || !canSend}
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-primary to-indigo-600 text-white shadow-lg shadow-brand-primary/20 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {isSending && canSend ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
});
