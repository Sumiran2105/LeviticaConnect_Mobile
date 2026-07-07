import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  Calendar,
  FileText,
  MessageCircle,
  MessageSquareText,
  Search,
  Settings,
  Users2,
  Video,
  ArrowRight,
  CornerDownLeft,
  Command,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { DM_USERS_SEARCH } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";

const USER_SIDEBAR_MODULES = [
  { label: "Chat", description: "Direct messages and team chat", icon: MessageCircle, path: "/user/dashboard/chat", keywords: ["messages", "dm", "communication"] },
  { label: "Community", description: "Company-wide discussions", icon: MessageSquareText, path: "/user/dashboard/community", keywords: ["discussions", "posts", "forums"] },
  { label: "Meet", description: "Video conferences and calls", icon: Video, path: "/user/dashboard/meet", keywords: ["calls", "video", "meetings"] },
  { label: "Teams", description: "Your project channels", icon: Users2, path: "/user/dashboard/channels", keywords: ["groups", "channels", "projects"] },
  { label: "Departments", description: "Company structure", icon: Building2, path: "/user/dashboard/teams", keywords: ["organizations", "roles", "departments"] },
  { label: "Files", description: "Shared documents", icon: FileText, path: "/user/dashboard/files", keywords: ["documents", "attachments", "drive"] },
  { label: "Calendar", description: "Your schedule", icon: Calendar, path: "/user/dashboard/calendar", keywords: ["events", "schedule", "planner"] },
  { label: "Activity", description: "Notifications and alerts", icon: Bell, path: "/user/dashboard/activity", keywords: ["notifications", "alerts", "updates"] },
  { label: "Settings", description: "Your preferences", icon: Settings, path: "/user/dashboard/settings", keywords: ["config", "preferences", "profile"] },
];

const PLACEHOLDER_TEXTS = [
  "Search modules...",
  "Search colleagues...",
  "Find teammates...",
  "Go to settings...",
  "Browse calendar...",
];

function normalizeUsers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function highlightMatch(text, query) {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-brand-primary/15 text-brand-primary rounded-sm px-0.5 font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function UserGlobalSearch() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTerm = query.trim();

  // Search workspace users only when the user types a useful query.
  const usersQuery = useQuery({
    queryKey: ["user-global-search-users", searchTerm],
    queryFn: async () => {
      const response = await apiClient.get(DM_USERS_SEARCH, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
        params: { query: searchTerm },
        suppressGlobalErrorReport: true,
      });
      return normalizeUsers(response.data);
    },
    staleTime: 60_000,
    enabled: Boolean(session?.accessToken && searchTerm.length >= 2),
  });

  const allUsers = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  // Build search results
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return {
        modules: USER_SIDEBAR_MODULES.slice(0, 5),
        users: [],
        total: 5,
      };
    }

    // Filter modules
    const matchedModules = USER_SIDEBAR_MODULES.filter((mod) => {
      const searchable = [mod.label, mod.description, ...mod.keywords]
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });

    // Filter users
    const matchedUsers = allUsers
      .filter((user) => {
        const name = (user.name || user.full_name || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const role = (user.role || user.user_role || "").toLowerCase();

        return name.includes(term) || email.includes(term) || role.includes(term);
      })
      .slice(0, 5)
      .map((user, index) => ({
        id: user.id || user.user_id || `user-${index}`,
        userId: user.user_id || user.auth_user_id || user.id || null,
        name: user.name || user.full_name || "Unnamed user",
        email: user.email || "No email",
        role: user.role || user.user_role || "USER",
      }));

    return {
      modules: matchedModules,
      users: matchedUsers,
      total: matchedModules.length + matchedUsers.length,
    };
  }, [query, allUsers]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const items = [];

    results.modules.forEach((mod) => {
      items.push({ type: "module", data: mod, path: mod.path });
    });

    results.users.forEach((user) => {
      // Navigate to chat with this user
      const params = new URLSearchParams({
        userId: String(user.userId || user.id || ""),
        name: user.name || "",
        email: user.email || "",
      });
      items.push({
        type: "user",
        data: user,
        path: `/user/dashboard/chat?${params.toString()}`,
        state: {
          selectedUserId: user.id,
          selectedUserUserId: user.userId,
          selectedUserName: user.name,
          selectedUserEmail: user.email,
        }
      });
    });

    return items;
  }, [results]);

  // Navigate to result
  const handleSelect = useCallback(
    (item) => {
      if (item.state) {
        navigate(item.path, { state: item.state });
      } else {
        navigate(item.path);
      }
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [navigate]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((prev) => (prev + 1) % Math.max(flatResults.length, 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((prev) =>
            prev <= 0 ? Math.max(flatResults.length - 1, 0) : prev - 1
          );
          break;
        case "Enter":
          event.preventDefault();
          if (flatResults[activeIndex]) {
            handleSelect(flatResults[activeIndex]);
          }
          break;
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, flatResults, activeIndex, handleSelect]
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeElement = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handleGlobalKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const marqueeText = PLACEHOLDER_TEXTS.join("  ·  ");
  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative w-full sm:min-w-[240px] sm:max-w-[512px]">
      {/* Search Input */}
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-secondary z-10" />
      <Input
        ref={inputRef}
        id="user-global-search-input"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setIsFocused(true);
        }}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={isFocused && !query ? "Type to search..." : undefined}
        className="h-[42px] rounded-2xl border border-brand-line/30 bg-[#ebf1f2]/60 pl-11 pr-4 text-sm text-brand-ink focus-visible:ring-2 focus-visible:ring-brand-primary/10 transition-all placeholder:text-brand-ink/30"
        autoComplete="off"
      />

      {/* Marquee scrolling placeholder */}
      {!query && !isFocused && (
        <div
          className="pointer-events-none absolute left-11 right-4 top-1/2 -translate-y-1/2 h-5 overflow-hidden"
          aria-hidden="true"
        >
          <style>{`
            @keyframes marquee-scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
          <div
            className="flex items-center h-5 whitespace-nowrap text-sm text-brand-ink/40"
            style={{ animation: "marquee-scroll 10s linear infinite" }}
          >
            <span>{marqueeText}</span>
            <span className="mx-4">·</span>
            <span>{marqueeText}</span>
            <span className="mx-4">·</span>
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-brand-line bg-white shadow-[0_20px_60px_rgba(68,83,74,0.15)] animate-in fade-in-0 slide-in-from-top-2 duration-150">
          <div ref={listRef} className="max-h-[420px] overflow-y-auto overscroll-contain py-2">
            {flatResults.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Search className="mx-auto size-8 text-brand-secondary/30" />
                <p className="mt-3 text-sm font-medium text-brand-secondary">No results found</p>
                <p className="mt-1 text-xs text-brand-secondary/70">Try a different search term</p>
              </div>
            ) : (
              <>
                {/* Modules Section */}
                {results.modules.length > 0 && (
                  <div>
                    <div className="px-4 pb-1.5 pt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">Modules</p>
                    </div>
                    {results.modules.map((mod) => {
                      flatIndex++;
                      const currentIndex = flatIndex;
                      const Icon = mod.icon;

                      return (
                        <button
                          key={mod.path}
                          type="button"
                          data-index={currentIndex}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            activeIndex === currentIndex ? "bg-brand-primary/[0.06]" : "hover:bg-brand-neutral/60"
                          }`}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          onClick={() => handleSelect({ type: "module", data: mod, path: mod.path })}
                        >
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              activeIndex === currentIndex ? "bg-brand-primary text-white" : "bg-brand-neutral text-brand-secondary"
                            }`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-brand-ink truncate">{highlightMatch(mod.label, query)}</p>
                            <p className="text-xs text-brand-secondary/70 truncate">{mod.description}</p>
                          </div>
                          {activeIndex === currentIndex && <ArrowRight className="size-3.5 shrink-0 text-brand-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Users Section */}
                {results.users.length > 0 && (
                  <div>
                    <div className="mx-4 my-1.5 border-t border-brand-line/50" />
                    <div className="px-4 pb-1.5 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">Colleagues</p>
                    </div>
                    {results.users.map((user) => {
                      flatIndex++;
                      const currentIndex = flatIndex;
                      // Navigation to chat is handled by handleSelect via flatResults

                      return (
                        <button
                          key={`user-${user.id}`}
                          type="button"
                          data-index={currentIndex}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            activeIndex === currentIndex ? "bg-brand-primary/[0.06]" : "hover:bg-brand-neutral/60"
                          }`}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          onClick={() =>
                            handleSelect(flatResults[currentIndex])
                          }
                        >
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              activeIndex === currentIndex ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            <Users className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-brand-ink truncate">{highlightMatch(user.name, query)}</p>
                            <p className="text-xs text-brand-secondary/70 truncate">
                              {highlightMatch(user.email, query)}
                            </p>
                          </div>
                          {activeIndex === currentIndex && <MessageCircle className="size-3.5 shrink-0 text-brand-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="flex items-center gap-4 border-t border-brand-line/50 bg-brand-neutral/40 px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-brand-secondary/60">
              <kbd className="inline-flex items-center justify-center rounded-md border border-brand-line bg-white px-1 py-0.5 font-mono text-[10px] shadow-sm">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-brand-secondary/60">
              <kbd className="inline-flex items-center justify-center rounded-md border border-brand-line bg-white px-1 py-0.5 shadow-sm">
                <CornerDownLeft className="size-2.5" />
              </kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-brand-secondary/60">
              <kbd className="inline-flex items-center justify-center rounded-md border border-brand-line bg-white px-1 py-0.5 font-mono text-[10px] shadow-sm">Esc</kbd>
              <span>Close</span>
            </div>
            {flatResults.length > 0 && (
              <span className="ml-auto text-[10px] font-medium text-brand-secondary/50">
                {flatResults.length} result{flatResults.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
