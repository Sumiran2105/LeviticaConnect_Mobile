import { memo, useEffect, useRef } from "react";
import { Users, Plus, Loader } from "lucide-react";
import { ChatAvatar } from "@/features/chat/components/chat-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

function HighlightText({ text, query }) {
  if (!query || !text) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={i} className="font-bold text-brand-primary">{part}</span>
    ) : (
      part
    )
  );
}

export const MentionSuggestions = memo(function MentionSuggestions({
  members = [],
  searchQuery = "",
  onSelectMember,
  onSelectEveryone,
  isLoading = false,
}) {
  const containerRef = useRef(null);

  // Filter members based on search query
  const filteredMembers = searchQuery
    ? members.filter(
        (member) =>
          member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : members;

  useEffect(() => {
    // Scroll to top when suggestions change
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [filteredMembers]);

  return (
    <div className="w-max min-w-[320px] max-w-[480px] rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <ScrollArea className="h-auto max-h-80">
        <div ref={containerRef} className="p-2">
          {/* Suggestions header */}
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Suggestions
          </div>

          {/* Loading state */}
          {isLoading && members.length === 0 && (
            <div className="flex items-center justify-center px-4 py-8">
              <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
                <Loader className="size-4 animate-spin" />
                <span>Loading members...</span>
              </div>
            </div>
          )}

          {/* Member list */}
          {!isLoading && (
            <div className="space-y-1">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectMember?.(member)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        <ChatAvatar name={member.name} size="size-8" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-900"><HighlightText text={member.name} query={searchQuery} /></div>
                        {member.email && (
                          <div className="truncate text-xs text-gray-500"><HighlightText text={member.email} query={searchQuery} /></div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No members found for "{searchQuery}"
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No members available
                </div>
              )}
            </div>
          )}

          {/* Special options - only show when not loading */}
          {!isLoading && (
            <div className="mt-2 border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => onSelectEveryone?.()}
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                    <Users className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">Everyone</div>
                    <div className="text-xs text-gray-500">Notify everyone in the chat</div>
                  </div>
                </div>
              </button>

             
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
