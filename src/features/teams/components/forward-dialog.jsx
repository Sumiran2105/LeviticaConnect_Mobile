import { useEffect, useRef, useState, useMemo } from "react";
import {
  Search,
  X,
  CornerUpRight,
  Loader2,
  User,
  Users2,
} from "lucide-react";
import { toast } from "sonner";

import {
  CHANNEL_FORWARD_BY_NAME,
  CHANNELS_MY_CHANNELS,
  DM_USERS_SEARCH,
} from "@/config/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/features/chat/components/chat-avatar";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract the part after "@", e.g. "user@company.com" → "company.com" */
function getEmailDomain(email) {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1].toLowerCase();
}

/** Normalize a channel-list response into an array. */
function normalizeChannelList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.channels)) return data.channels;
  return [];
}

/** Normalize a user-search response into an array. */
function normalizeUserList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// ── Component ──────────────────────────────────────────────────────────────

export function ForwardDialog({ open, onOpenChange, message, onSuccess }) {
  const session = useAuthStore((state) => state.session);
  const accessToken = session?.accessToken;

  /** The logged-in user's email domain — used for same-company filtering. */
  const myDomain = getEmailDomain(session?.email);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [optionalMessage, setOptionalMessage] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Pre-loaded channel list (same across all users) ──
  const [channels, setChannels] = useState([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  // ── Live user search state ──
  const [userResults, setUserResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Reset & pre-load channels on dialog open ───────────────────────────
  useEffect(() => {
    if (!open || !accessToken) return;

    setSearchQuery("");
    setSelectedRecipient(null);
    setOptionalMessage("");
    setShowDropdown(false);
    setUserResults([]);

    setIsLoadingChannels(true);
    apiClient
      .get(CHANNELS_MY_CHANNELS, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => setChannels(normalizeChannelList(res.data)))
      .catch(() => setChannels([]))
      .finally(() => setIsLoadingChannels(false));
  }, [open, accessToken]);

  // ── Live user search — debounced 350 ms ────────────────────────────────
  // DM_USERS_SEARCH is already workspace-scoped by the backend, so we
  // display all returned results without any client-side domain filtering.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (!q || q.length < 2 || !accessToken) {
      setUserResults([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(DM_USERS_SEARCH, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { query: q },
        });
        setUserResults(normalizeUserList(res.data));
      } catch {
        setUserResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, accessToken]);

  // ── Filtered channel list (local, based on current query) ──────────────
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels.slice(0, 5);
    const q = searchQuery.toLowerCase();
    return channels.filter((c) => c.name?.toLowerCase().includes(q)).slice(0, 5);
  }, [channels, searchQuery]);

  // ── Merged dropdown items ──────────────────────────────────────────────
  const dropdownItems = useMemo(() => {
    const channelItems = filteredChannels.map((c) => ({
      id: `channel-${c.id}`,
      name: c.name,
      type: "channel",
      subtitle: `#${c.name}`,
      avatar_url: c.avatar_url || c.image || null,
      forwardName: c.name,
    }));

    const userItems = userResults.map((u) => ({
      id: `user-${u.id || u.user_id}`,
      name: u.full_name || u.name || u.email || "Unknown",
      type: "user",
      subtitle: u.email || u.phone_number || u.mobile_number || "Team member",
      avatar_url: u.profile_image || u.image || u.avatar_url || null,
      forwardName: u.full_name || u.name || u.email,
    }));

    return [...channelItems, ...userItems];
  }, [filteredChannels, userResults]);

  const isLoading = isLoadingChannels || isSearchingUsers;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setShowDropdown(true);
  };

  const handleSelect = (item) => {
    setSelectedRecipient(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSelectedRecipient(null);
    setSearchQuery("");
    setUserResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const recipientName = selectedRecipient
      ? selectedRecipient.forwardName
      : searchQuery.trim();

    if (!message || !recipientName) {
      toast.error("Please select a recipient first.");
      return;
    }

    setIsForwarding(true);
    try {
      await apiClient.post(
        CHANNEL_FORWARD_BY_NAME,
        {
          message_id: message.id,
          target_name: recipientName,
          ...(optionalMessage ? { optional_message: optionalMessage } : {}),
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      toast.success(`Message forwarded to ${selectedRecipient?.name ?? recipientName}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to forward message. Please try again."
      );
    } finally {
      setIsForwarding(false);
    }
  };

  // ── Sender info helpers ────────────────────────────────────────────────
  const senderName =
    message?.senderName ||
    message?.raw?.sender?.full_name ||
    message?.raw?.sender?.name ||
    "User";

  const senderAvatar =
    message?.senderAvatar ||
    message?.raw?.sender?.profile_image ||
    message?.raw?.sender?.image ||
    null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] rounded-3xl border border-gray-100 bg-white p-0 text-gray-950 shadow-2xl overflow-visible">
        <form onSubmit={handleSubmit} className="flex flex-col overflow-visible">

          {/* ── Header ── */}
          <DialogHeader className="px-8 pt-7 pb-4 border-b border-gray-100/80">
            <DialogTitle className="text-[22px] font-bold text-gray-900 tracking-tight">
              Forward this message
            </DialogTitle>
            <DialogDescription className="text-[14px] text-gray-500 font-normal mt-0.5">
              Forward to a channel or a teammate
              {myDomain ? ` (@${myDomain})` : ""}.
            </DialogDescription>
          </DialogHeader>

          {/* ── Body ── */}
          <div className="px-8 py-6 space-y-5 overflow-visible relative">

            {/* Add Recipients */}
            <div className="space-y-2 relative">
              <label className="text-[13px] font-semibold text-gray-700 flex items-center gap-0.5">
                Add recipients <span className="text-red-500">*</span>
              </label>

              {/* Selected chip OR text input */}
              <div className="relative flex items-center">
                {selectedRecipient ? (
                  <div className="flex items-center w-full h-[46px] rounded-2xl border border-brand-primary bg-brand-primary/5 px-4 text-[14px] font-medium text-brand-primary select-none justify-between">
                    <div className="flex items-center gap-2.5">
                      {selectedRecipient.type === "channel" ? (
                        <Users2 className="size-4 shrink-0" />
                      ) : (
                        <ChatAvatar
                          name={selectedRecipient.name}
                          src={selectedRecipient.avatar_url}
                          size="size-6 shrink-0"
                        />
                      )}
                      <span className="font-semibold">{selectedRecipient.name}</span>
                      <span className="text-[10px] uppercase font-bold bg-brand-primary/10 px-2 py-0.5 rounded-full">
                        {selectedRecipient.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="rounded-full p-1 hover:bg-brand-primary/15 transition-colors"
                      title="Clear"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      ref={inputRef}
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => setShowDropdown(true)}
                      className="h-[46px] rounded-2xl border-gray-200 bg-white pr-10 pl-4 text-[14px] font-medium text-gray-800 placeholder:text-gray-400 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                      placeholder="Search by name or email…"
                      autoComplete="off"
                      autoFocus
                    />
                    {isLoading ? (
                      <Loader2 className="absolute right-4 size-4 animate-spin text-gray-400 pointer-events-none" />
                    ) : (
                      <Search className="absolute right-4 size-4 text-gray-400 pointer-events-none" />
                    )}
                  </>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && !selectedRecipient && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-[240px] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-2xl [scrollbar-width:thin]">
                    {isLoading && dropdownItems.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-gray-400">
                        <Loader2 className="size-4 animate-spin" />
                        <span>Searching…</span>
                      </div>
                    ) : dropdownItems.length > 0 ? (
                      dropdownItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        >
                          {/* Avatar / Icon */}
                          <div className="shrink-0">
                            {item.type === "channel" ? (
                              <div className="size-9 rounded-xl bg-brand-soft text-brand-primary flex items-center justify-center">
                                <Users2 className="size-4" />
                              </div>
                            ) : item.avatar_url ? (
                              <ChatAvatar
                                name={item.name}
                                src={item.avatar_url}
                                size="size-9"
                              />
                            ) : (
                              <div className="size-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                                <User className="size-4" />
                              </div>
                            )}
                          </div>

                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[14px] text-gray-900 truncate">
                                {item.name}
                              </span>
                              <span className="shrink-0 text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {item.type}
                              </span>
                            </div>
                            <span className="block text-xs text-gray-500 truncate mt-0.5">
                              {item.subtitle}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : searchQuery.trim().length >= 2 ? (
                      <div className="py-5 text-center text-sm text-gray-400">
                        No matching teammates found
                        {myDomain ? ` in @${myDomain}` : ""}.
                      </div>
                    ) : (
                      <div className="py-5 text-center text-sm text-gray-400">
                        Type at least 2 characters to search.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Message Preview */}
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-gray-700">
                Message preview
              </label>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                {/* Optional message */}
                <input
                  type="text"
                  value={optionalMessage}
                  onChange={(e) => setOptionalMessage(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-[14px] text-gray-800 placeholder:text-gray-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  placeholder="Add a message (optional)"
                />

                {/* Original message bubble */}
                {message && (
                  <div className="rounded-xl border border-gray-200/70 bg-white p-3.5 flex items-start gap-3 shadow-sm">
                    <CornerUpRight className="mt-0.5 size-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <ChatAvatar
                          name={senderName}
                          src={senderAvatar}
                          size="size-5 shrink-0"
                        />
                        <span className="text-[13px] font-semibold text-gray-800">
                          {senderName}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {message.time || ""}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-600 leading-relaxed break-words">
                        {message.text}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <DialogFooter className="px-8 py-5 border-t border-gray-100 bg-gray-50/60 rounded-b-3xl flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-gray-200 px-6 font-semibold text-gray-600 hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl bg-brand-primary px-6 font-semibold text-white hover:bg-brand-primary/90 shadow disabled:opacity-50"
              disabled={isForwarding || (!selectedRecipient && !searchQuery.trim())}
            >
              {isForwarding ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-4 animate-spin" />
                  Forwarding…
                </span>
              ) : (
                "Forward"
              )}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}
