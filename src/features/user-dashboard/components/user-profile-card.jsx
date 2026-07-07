import { useRef, useEffect, useState } from "react";
import { MfaResetDialog } from "@/features/auth/components/mfa-reset-dialog";
import { customStatusLabel, formatStatusLabel } from "@/lib/presence-utils";
import { PresencePanel } from "./presence-panel";

export function UserProfileCard({
  identity,
  profileImageUrl = "",
  isOpen,
  onClose,
  onSignOut,
  session,
  currentPresence,
}) {
  const [imageError, setImageError] = useState({ src: "", hasError: false });
  const cardRef = useRef(null);
  const imgError = imageError.src === profileImageUrl && imageError.hasError;

  // Close card when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={cardRef}
      className="absolute right-0 top-full mt-3 w-80 rounded-lg border border-gray-200 bg-white shadow-xl z-50"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <span className="text-sm font-semibold text-gray-900">Personal</span>
        <button
          onClick={onSignOut}
          className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700 flex-shrink-0 overflow-hidden">
            {profileImageUrl && !imgError ? (
              <img 
                src={profileImageUrl}
                alt={identity.displayName} 
                className="size-full object-cover" 
                onError={() => setImageError({ src: profileImageUrl, hasError: true })}
              />
            ) : (
              identity.displayName.split(" ").map(n => n.charAt(0)).join("")
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">
              {identity.displayName}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-500">
              {currentPresence?.customStatus
                ? customStatusLabel(currentPresence.customStatus)
                : formatStatusLabel(currentPresence?.status || "online")}
            </p>
            <p className="text-xs text-gray-600 break-words">
              {identity.email}
            </p>
          </div>
        </div>
      </div>

      <PresencePanel session={session} />

      <div className="border-t border-gray-100 px-6 py-4">
        <MfaResetDialog
          session={session}
          triggerLabel="Reset MFA"
          triggerVariant="outline"
          triggerClassName="h-10 w-full justify-center rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
        />
      </div>
    </div>
  );
}
