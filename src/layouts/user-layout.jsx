import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  Menu,
  MessageCircle,
  MessageSquareText,
  Search,
  Settings,
  Users2,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { FloatingActionMenu } from "@/components/floating-action-menu";
import { Button } from "@/components/ui/button";
import { PRESENCE_ME, USER_PROFILE } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import { customStatusLabel, formatStatusLabel, normalizePresence } from "@/lib/presence-utils";
import { UserProfileCard } from "@/features/user-dashboard/components/user-profile-card";
import { UserGlobalSearch } from "@/features/user-dashboard/components/user-global-search";
import {
  getPersistableProfileImageSource,
  getVersionedImageUrlCandidates,
} from "@/lib/image-utils";
import { useUnreadMentions } from "@/features/user-dashboard/hooks/use-unread-mentions";
import { useUnreadDirectMessages } from "@/features/chat/hooks/use-unread-direct-messages";

  const DashboardMotion = motion.div;

export function UserLayout({
  children,
  contentClassName = "",
  contentInnerClassName = "",
  showFloatingActions = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const [failedProfileImageUrls, setFailedProfileImageUrls] = useState(() => ({
    key: "",
    urls: new Set(),
  }));

  // Get unread mentions count
  const { unreadCount } = useUnreadMentions();
  const { unreadCount: unreadChatCount } = useUnreadDirectMessages(session?.accessToken);

  const profileImage = useMemo(
    () => getPersistableProfileImageSource(session) || null,
    [session]
  );

  const profileQuery = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await apiClient.get(USER_PROFILE, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (response.data?.data) return response.data.data;
      if (response.data?.user) return response.data.user;
      return response.data;
    },
    enabled: Boolean(session?.accessToken),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile || typeof profile !== "object") return;

    const nextImage = getPersistableProfileImageSource(profile);
    const sessionImage = getPersistableProfileImageSource(session);
    const nextName = profile.full_name || profile.name || "";
    const sessionName = session?.full_name || session?.name || "";

    if (nextImage !== sessionImage || (nextName && nextName !== sessionName)) {
      setSession({
        ...session,
        ...profile,
        full_name: profile.full_name || profile.name || session?.full_name || session?.name,
        name: profile.name || profile.full_name || session?.name,
        profile_image: nextImage || "",
        image: nextImage || "",
      });
    }
  }, [profileQuery.data, session, setSession]);

  const presenceQuery = useQuery({
    queryKey: ["presence-me"],
    queryFn: async () => {
      const response = await apiClient.get(PRESENCE_ME, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      return normalizePresence(response.data);
    },
    enabled: Boolean(session?.accessToken),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const sidebarItems = [
    { label: "Chat", icon: MessageCircle, path: "/user/dashboard/chat" },
    { label: "Community", icon: MessageSquareText, path: "/user/dashboard/community" },
    { label: "Meet", icon: Video, path: "/user/dashboard/meet" },
    { label: "Teams", icon: Users2, path: "/user/dashboard/channels" },
    { label: "Departments", icon: Building2, path: "/user/dashboard/teams" },
    { label: "Files", icon: FileText, path: "/user/dashboard/files" },
    { label: "Calendar", icon: Calendar, path: "/user/dashboard/calendar" },
    { label: "Activity", icon: Bell, path: "/user/dashboard/activity" },
    { label: "Settings", icon: Settings, path: "/user/dashboard/settings" },
  ];

  const identity = useMemo(() => {
    const email = session?.email || "user@demo.com";
    const [namePart] = email.split("@");
    const fallbackName = namePart
      .split(/[.\-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    const displayName = session?.full_name || session?.name || fallbackName || "User";
    const fetchedProfileImage = profileQuery.data
      ? getPersistableProfileImageSource(profileQuery.data)
      : "";

    return {
      email,
      displayName,
      role: session?.role || "USER",
      image: profileQuery.data ? fetchedProfileImage : profileImage,
      imageVersion:
        profileQuery.data?.updated_at ||
        profileQuery.data?.profile_updated_at ||
        session?.profileImageVersion ||
        session?.updated_at ||
        session?.profile_updated_at ||
        "",
    };
  }, [profileImage, profileQuery.data, session]);

  const profileImageUrls = useMemo(
    () => getVersionedImageUrlCandidates(identity.image, identity.imageVersion),
    [identity.image, identity.imageVersion]
  );
  const profileImageKey = `${identity.image || ""}|${identity.imageVersion || ""}`;
  const activeFailedProfileImageUrls =
    failedProfileImageUrls.key === profileImageKey ? failedProfileImageUrls.urls : new Set();
  const profileImageUrl = profileImageUrls.find((url) => !activeFailedProfileImageUrls.has(url)) || "";

  function handleProfileImageError() {
    if (!profileImageUrl) return;

    setFailedProfileImageUrls((current) => {
      const urls = current.key === profileImageKey ? new Set(current.urls) : new Set();
      urls.add(profileImageUrl);
      return { key: profileImageKey, urls };
    });
  }

  const activeItem =
    sidebarItems.find((item) => item.path === location.pathname) ||
    sidebarItems.find((item) => location.pathname.startsWith(`${item.path}/`)) ||
    sidebarItems[0];

    const isHomePage = location.pathname === "/user/dashboard" || location.pathname === "/user/dashboard/";

    const breadCrumbLabel = isHomePage
      ? "Home"
      : activeItem?.label;

    const quickActions = [
      {
        icon: MessageCircle,
        label: "Chat",
        color: "bg-emerald-500/15 text-emerald-600",
        path: "/user/dashboard/chat",
      },
      {
        icon: Video,
        label: "Meet",
        color: "bg-brand-primary/15 text-brand-primary",
        path: "/user/dashboard/meet",
      },
    ];
    const currentPresence = presenceQuery.data || { status: "online", customStatus: null };
    const profileSubtitle = currentPresence?.customStatus
      ? customStatusLabel(currentPresence.customStatus)
      : formatStatusLabel(currentPresence?.status || "online");

  function handleSignOut() {
    clearSession();
    navigate("/login?mode=workspace", { replace: true });
  }

  function getSidebarBadgeCount(item) {
    if (item.label === "Chat") {
      return unreadChatCount;
    }

    if (item.label === "Activity") {
      return unreadCount;
    }

    return 0;
  }

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_38%,_#f6f6ff_100%)] text-brand-ink">
      <div className="flex shrink-0 items-center justify-between border-b border-brand-line/10 bg-white p-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-600 shadow-sm" onClick={() => navigate("/user/dashboard")}>
            <img
                src="/assets/icon.png"
                alt="Levitica Connect"
                className="size-14 rounded-lg object-contain"
              />
          </div>
          <span className="font-bold tracking-tight text-brand-ink">Levitica Connect</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="rounded-lg border border-brand-line/20 bg-brand-soft p-2 text-brand-ink outline-none transition-transform active:scale-95"
          type="button"
        >
          {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 w-full overflow-hidden lg:flex-row">
        <aside
          className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            } fixed inset-y-0 left-0 z-50 flex w-[min(82vw,280px)] max-w-[280px] flex-col border-r bg-[#f0f4f5] text-brand-ink shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-auto lg:h-full lg:w-[76px] lg:max-w-[76px] lg:translate-x-0 lg:shadow-none`}
        >
          <div className="flex min-h-0 h-full flex-col items-center py-4 overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className="mb-4 flex size-16 cursor-pointer items-center justify-center rounded-xl transition-all duration-200 hover:bg-black/5"
              onClick={() => navigate("/user/dashboard")}
            >
              <img
                src="/assets/icon.png"
                alt="Levitica Connect"
                className="size-14 rounded-lg object-contain shadow-lg"
              />
            </div>

            <nav className="flex min-h-0 w-full flex-1 flex-col items-center space-y-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === "/user/dashboard"
                  ? location.pathname === item.path
                  : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                const badgeCount = getSidebarBadgeCount(item);

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`group relative flex min-h-12 w-full items-center gap-3 px-4 py-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] lg:min-h-[58px] lg:flex-col lg:justify-center lg:gap-1.5 lg:px-1 lg:py-2 text-black sm:text-brand-ink/60 ${isActive
                      ? "bg-brand-primary/10 text-brand-primary lg:bg-transparent"
                      : "text-brand-ink/60 hover:text-brand-primary lg:hover:bg-transparent"
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand-primary" />
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-xl bg-brand-primary/0 transition-all duration-300 group-hover:bg-brand-primary/5 lg:mx-2" />
                    )}

                    <div className="relative z-10">
                      <Icon className={`size-6 transition-all duration-300 ${isActive ? "scale-110 drop-shadow-sm" : "group-hover:scale-110 group-hover:drop-shadow-sm"}`} />
                      {badgeCount > 0 ? (
                        <span
                          className={`absolute flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white shadow-md ring-2 ring-[#f0f4f5] ${
                            item.label === "Chat"
                              ? "-right-3 -top-2 bg-gradient-to-r from-[#1094EB] to-[#3B5BFC] shadow-brand-primary/20"
                              : "-right-2 -top-1 bg-red-500"
                          }`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      ) : null}
                    </div>
                    <span className="glass-tooltip pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2 translate-x-2 rounded-xl px-3 py-2 text-xs font-bold text-brand-ink opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 lg:block">
                      {item.label}
                    </span>
                    <span className={`relative z-10 min-w-0 max-w-full truncate text-sm font-medium leading-none transition-all duration-200 lg:px-0.5 lg:text-center lg:text-[10px] ${isActive ? "opacity-100" : "opacity-80"}`}>
                      {item.label}
                      {badgeCount > 0 ? (
                        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white lg:hidden">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </nav>
            <p className="text-center text-sm sm:text-xs text-brand-ink/100 sm:text-brand-ink/40">
              Version 1.0.0
            </p>
          </div>
        </aside>

        {isMobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-brand-ink/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

          <section className="relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
            {isHomePage && (
            <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-brand-line/15 bg-white px-4 shadow-[0_6px_24px_rgba(68,83,74,0.05)] sm:h-20 sm:px-6 lg:px-10">
              <div className="hidden items-center gap-2 overflow-hidden whitespace-nowrap md:flex">
                <span className="text-xs font-bold text-brand-ink/40 leading-none">
                  User
                </span>
                <ChevronRight className="size-3 text-brand-ink/20" />
                <span className="text-xs font-bold text-brand-primary leading-none">
                  {breadCrumbLabel}
                </span>
              </div>

              <div className="group relative min-w-0 max-w-lg flex-1">
                <UserGlobalSearch />
              </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
              <button
                className="relative rounded-xl border border-brand-line/20 bg-white p-2 shadow-sm transition-colors hover:bg-brand-soft"
                type="button"
                onClick={() => navigate("/user/dashboard/activity")}
                aria-label="Open activity"
                title="Open activity"
              >
                <Bell className="size-5 text-brand-ink/70" />
                <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-red-500" />
              </button>

              <div className="hidden h-8 w-px bg-brand-line/30 sm:block" />

              <div className="relative">
                <div
                  className="group flex cursor-pointer items-center gap-3"
                  onClick={() => setIsProfileCardOpen(!isProfileCardOpen)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-bold leading-none text-brand-ink transition-colors group-hover:text-brand-primary">
                      {identity.displayName}
                    </p>
                    <p className="mt-1 max-w-[170px] truncate text-[12px] font-bold tracking-tight text-brand-ink/40">
                      {profileSubtitle}
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-brand-soft font-semibold text-brand-primary shadow-md">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={identity.displayName}
                        className="size-full object-cover"
                        onError={handleProfileImageError}
                      />
                    ) : (
                      identity.displayName.charAt(0)
                    )}
                  </div>
                </div>
                <UserProfileCard
                  identity={identity}
                  profileImageUrl={profileImageUrl}
                  session={session}
                  currentPresence={currentPresence}
                  isOpen={isProfileCardOpen}
                  onClose={() => setIsProfileCardOpen(false)}
                  onSignOut={handleSignOut}
                />
              </div>
            </div>
          </header>
          )}

          <div
            className={`min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 lg:px-12 lg:py-10 ${contentClassName}`}
          >
            <AnimatePresence mode="wait">
              <DashboardMotion
                key={location.pathname}
                initial={{ opacity: 0, x: 22, filter: "blur(3px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -18, filter: "blur(2px)" }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className={`w-full ${contentInnerClassName}`}
              >
                {children}
              </DashboardMotion>
            </AnimatePresence>
          </div>
        </section>

        {showFloatingActions ? <FloatingActionMenu items={quickActions} /> : null}
      </div>
    </main>
  );
}
