import { memo } from "react";

/**
 * WhatsApp-style typing indicator shown above the composer.
 * Shows "Name is typing..." with bouncing dots and real user names.
 */
export const TypingIndicator = memo(function TypingIndicator({ users = [] }) {
  if (!users.length) return null;

  const label =
    users.length === 1
      ? `${users[0].userName} is typing`
      : users.length === 2
        ? `${users[0].userName} and ${users[1].userName} are typing`
        : `${users[0].userName} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 border-t border-gray-100 bg-white px-6 py-2">
      {/* Bouncing dots */}
      <span className="flex items-center gap-[3px]">
        <span className="size-[5px] rounded-full bg-brand-primary animate-bounce [animation-delay:0ms]" />
        <span className="size-[5px] rounded-full bg-brand-primary animate-bounce [animation-delay:150ms]" />
        <span className="size-[5px] rounded-full bg-brand-primary animate-bounce [animation-delay:300ms]" />
      </span>
      {/* Name label */}
      <span className="text-xs font-semibold text-brand-primary">
        {label}
        <span className="animate-pulse">…</span>
      </span>
    </div>
  );
});
