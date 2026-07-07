import { FileText, FileUp, Image as ImageIcon, LoaderCircle, Paperclip, Plus as PlusIcon, Send, Smile, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { EmojiPicker } from "@/features/teams/components/emoji-picker";

const COMPOSER_MAX_HEIGHT = 220;

const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

export function ChatComposer({
  editingMessageId,
  isSending,
  messageInput,
  onChange,
  onCancelEdit,
  onCancelReply,
  onKeyDown,
  onRemovePendingAttachment,
  onSend,
  pendingAttachment,
  replyTarget,
  onUploadAttachment,
}) {
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const hasMessageText = Boolean(messageInput.trim());
  const pendingAttachments = Array.isArray(pendingAttachment)
    ? pendingAttachment
    : pendingAttachment
      ? [pendingAttachment]
      : [];
  const hasPendingAttachment = pendingAttachments.length > 0;
  const canSend = hasMessageText || (!editingMessageId && hasPendingAttachment);
  const isUploadingAttachment = Boolean(onUploadAttachment?.isPending);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
    textarea.style.overflowY = textarea.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }, [messageInput]);

  function updateMessageValue(value) {
    onChange?.({ target: { value } });
  }

  function insertText(text) {
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
  }

  function handleEmojiSelect(emoji) {
    insertText(emoji);
    setShowEmojiPicker(false);
  }

  function handleAttachmentSelect(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    onUploadAttachment?.(files);
    setShowMoreOptions(false);
  }

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
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
      {editingMessageId ? (
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-brand-primary/15 bg-brand-soft/70 px-4 py-2.5 text-xs text-brand-ink">
          <div className="min-w-0">
            <p className="font-extrabold text-brand-primary">{toUserCamelCase("editing message")}</p>
            <p className="truncate text-[10px] text-brand-secondary/80 lowercase">update your message, then send to save.</p>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-xl p-1.5 text-brand-ink/60 transition hover:bg-white hover:text-brand-primary"
            aria-label="Cancel edit"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      {replyTarget && !editingMessageId ? (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-brand-primary/15 bg-gradient-to-r from-brand-soft/90 to-white px-4 py-3 shadow-sm">
          <div className="min-w-0 border-l-4 border-brand-primary pl-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-primary">
              {toUserCamelCase("replying to")}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="truncate text-xs font-bold text-brand-ink">
                {replyTarget.senderName || "Message"}
              </span>
              {replyTarget.time ? (
                <span className="shrink-0 text-[10px] font-semibold text-brand-secondary/60">
                  {replyTarget.time}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-brand-secondary">
              {replyTarget.text || "Attachment"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 rounded-xl p-1.5 text-brand-secondary/50 transition hover:bg-white hover:text-brand-ink"
            aria-label="Cancel reply"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <div className="relative flex items-end gap-3 rounded-[24px] border border-brand-line/60 bg-[#ebf1f2]/20 px-4 py-3 shadow-sm transition focus-within:border-brand-primary/30 focus-within:ring-2 focus-within:ring-brand-primary/10">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingAttachment}
          className="shrink-0 rounded-xl p-2 text-brand-secondary/60 transition hover:bg-white hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
          title="Attach file"
        >
          {isUploadingAttachment ? <LoaderCircle className="size-5 animate-spin text-brand-primary" /> : <Paperclip className="size-5" />}
        </button>
        <div className="min-w-0 flex-1">
          {hasPendingAttachment && !editingMessageId ? (
            <div className="mb-2 flex max-w-md flex-col gap-2 rounded-xl border border-brand-line/45 bg-white px-3 py-2 shadow-sm">
              {pendingAttachments.map((attachment) => (
                <div key={attachment.id} className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-primary">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-brand-ink">{attachment.name}</p>
                    <p className="truncate text-[10px] text-brand-secondary/60 lowercase">{attachment.type || toUserCamelCase("ready to send")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemovePendingAttachment?.(attachment.id)}
                    className="shrink-0 rounded-lg p-1.5 text-brand-secondary/50 transition hover:bg-brand-soft hover:text-brand-ink"
                    aria-label="Remove attachment"
                    title="Remove attachment"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            rows={1}
            value={messageInput}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="type a message..."
            className="max-h-[220px] min-h-8 w-full resize-none border-none bg-transparent py-1 text-xs leading-relaxed text-brand-ink placeholder:text-brand-secondary/40 focus:outline-none [scrollbar-width:thin]"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowEmojiPicker(true)}
          className="shrink-0 rounded-xl p-2 text-brand-secondary/60 transition hover:bg-white hover:text-brand-primary"
          title="Add emoji"
        >
          <Smile className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowMoreOptions((current) => !current)}
          className="shrink-0 rounded-xl p-2 text-brand-secondary/60 transition hover:bg-white hover:text-brand-primary"
          title="More options"
        >
          <PlusIcon className="size-5" />
        </button>
        {showMoreOptions ? (
          <div className="absolute bottom-full right-16 z-40 mb-3 w-52 overflow-hidden rounded-2xl border border-brand-line/45 bg-white p-2 shadow-xl">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingAttachment}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold text-brand-secondary transition hover:bg-brand-soft hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ImageIcon className="size-4 text-brand-primary" />
              {toUserCamelCase("upload image")}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAttachment}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold text-brand-secondary transition hover:bg-brand-soft hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileUp className="size-4 text-brand-primary" />
              {toUserCamelCase("upload file")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(true);
                setShowMoreOptions(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold text-brand-secondary transition hover:bg-brand-soft hover:text-brand-primary"
            >
              <Smile className="size-4 text-brand-primary" />
              {toUserCamelCase("add emoji")}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#1094EB] to-[#3B5BFC] hover:from-[#0082f4] hover:to-[#2563EB] text-white active:scale-95 transition-all duration-200 shadow-md border-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSending && canSend ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-4.5" />}
        </button>
      </div>
    </div>
  );
}
