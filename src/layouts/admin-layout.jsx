import {
  Bell,
  Building2,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  UserPlus,
  Users,
  Users2,
  Menu,
  X,
  Search,
  MessageCircle,
  MessageSquareText,
  Video,
  FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { FloatingActionMenu } from "@/components/floating-action-menu";
import { COMPANY_ME, USER_PROFILE } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import {
  getCompanyLogoSource,
  getPersistableProfileImageSource,
  getVersionedImageUrlCandidates,
} from "@/lib/image-utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AdminGlobalSearch } from "@/features/admin-dashboard/components/admin-global-search";
import { useUnreadDirectMessages } from "@/features/chat/hooks/use-unread-direct-messages";

const DashboardMotion = motion.div;

export function AdminLayout({
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
  const [failedProfileImageUrls, setFailedProfileImageUrls] = useState(() => ({
    key: "",
    urls: new Set(),
  }));
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
    enabled: Boolean(session?.accessToken && session?.role !== "SUPER_ADMIN"),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const companyQuery = useQuery({
    queryKey: ["company-me", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_ME, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      return response.data?.data || response.data?.company || response.data || {};
    },
    enabled: Boolean(session?.accessToken && session?.role !== "SUPER_ADMIN"),
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
    const nextMobileNumber =
      profile.mobile_number || profile.phone_number || profile.phone || session?.mobile_number || session?.phone_number || "";
    const nextPhoneNumber =
      profile.phone_number || profile.mobile_number || profile.phone || session?.phone_number || session?.mobile_number || "";
    const nextAddress = profile.address || session?.address || "";
    const sessionMobileNumber = session?.mobile_number || session?.phone_number || "";
    const sessionPhoneNumber = session?.phone_number || session?.mobile_number || "";
    const sessionAddress = session?.address || "";

    if (
      nextImage !== sessionImage ||
      (nextName && nextName !== sessionName) ||
      nextMobileNumber !== sessionMobileNumber ||
      nextPhoneNumber !== sessionPhoneNumber ||
      nextAddress !== sessionAddress
    ) {
      setSession({
        ...session,
        ...profile,
        full_name: profile.full_name || profile.name || session?.full_name || session?.name,
        name: profile.name || profile.full_name || session?.name,
        mobile_number: nextMobileNumber,
        phone_number: nextPhoneNumber,
        address: nextAddress,
        profile_image: nextImage || "",
        image: nextImage || "",
      });
    }
  }, [profileQuery.data, session, setSession]);

  const sidebarItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { label: "Users", icon: Users, path: "/admin/dashboard/users" },
    { label: "Approvals", icon: ClipboardCheck, path: "/admin/dashboard/approvals" },
    { label: "Invite", icon: UserPlus, path: "/admin/dashboard/invite" },
    { label: "Chat", icon: MessageCircle, path: "/admin/dashboard/chat" },
    { label: "Community", icon: MessageSquareText, path: "/admin/dashboard/community" },
    { label: "Teams", icon: Users2, path: "/admin/dashboard/channels" },
    { label: "Departments", icon: Building2, path: "/admin/dashboard/teams" },
    { label: "Files", icon: FileText, path: "/admin/dashboard/files" },
    { label: "Meet", icon: Video, path: "/admin/dashboard/meetings" },
    { label: "Calendar", icon: Calendar, path: "/admin/dashboard/calendar" },
    { label: "Billing", icon: CreditCard, path: "/admin/dashboard/billing" },
    { label: "Alerts", icon: Bell, path: "/admin/dashboard/alerts" },
    { label: "Support", icon: LifeBuoy, path: "/admin/dashboard/support" },
    { label: "Settings", icon: Settings, path: "/admin/dashboard/settings" },
  ];

  const identity = useMemo(() => {
    const email = session?.email || "admin@company.com";
    const [namePart] = email.split("@");
    const fallbackName = namePart
      .split(/[.\-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    const displayName = session?.full_name || session?.name || fallbackName || "Admin";
    const fetchedCompanyLogo = companyQuery.data
      ? getCompanyLogoSource(companyQuery.data)
      : "";
    const sessionCompanyLogo =
      getCompanyLogoSource(session?.company) ||
      session?.company_logo_url ||
      session?.company_logo ||
      session?.logo_url ||
      session?.logo ||
      "";

    return {
      email,
      displayName,
      role: session?.role || "ADMIN",
      image: companyQuery.data ? fetchedCompanyLogo : sessionCompanyLogo || profileImage,
      imageVersion:
        companyQuery.data?.updated_at ||
        companyQuery.data?.created_at ||
        session?.company?.updated_at ||
        session?.profileImageVersion ||
        session?.updated_at ||
        session?.profile_updated_at ||
        "",
    };
  }, [companyQuery.data, profileImage, session]);

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

  const quickActions = [
    {
      icon: Calendar,
      label: "Meetings",
      color: "bg-blue-500/15 text-blue-600",
      path: "/admin/dashboard/meetings",
    },
    {
      icon: Users2,
      label: "Teams",
      color: "bg-emerald-500/15 text-emerald-600",
      path: "/admin/dashboard/channels",
    },
    {
      icon: ClipboardCheck,
      label: "Approvals",
      color: "bg-violet-500/15 text-violet-600",
      path: "/admin/dashboard/approvals",
    },
  ];

  function isActivePath(path) {
    if (path === "/admin/dashboard") {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

  const activeItem =
    sidebarItems.find((item) => isActivePath(item.path)) ||
    sidebarItems[0];

  function handleSignOut() {
    clearSession();
    navigate("/admin/auth", { replace: true });
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_38%,_#f6f6ff_100%)] text-brand-ink">
      {/* Mobile Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-brand-line bg-brand-primary p-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
            <LayoutDashboard className="size-full text-white" />
          </div>
          <span className="font-semibold text-white">Admin Panel</span>
        </div>
        <button
          onClick={toggleMobileMenu}
          className="rounded-lg border border-white/20 bg-white/10 p-2 text-white outline-none active:scale-95"
        >
          {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 w-full overflow-hidden lg:flex-row">
        <aside
          className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            } fixed inset-y-0 left-0 z-50 flex w-[min(82vw,280px)] max-w-[280px] flex-col overflow-x-hidden border-r bg-[#f0f4f5] text-brand-ink shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-auto lg:h-full lg:w-[76px] lg:max-w-[76px] lg:translate-x-0 lg:shadow-none`}
        >
          <div className="flex min-h-0 h-full flex-col items-center py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className="mb-4 flex size-16 cursor-pointer items-center justify-center rounded-xl transition-all duration-200 hover:bg-black/5"
              onClick={() => {
                navigate("/admin/dashboard");
                setIsMobileMenuOpen(false);
              }}
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
                const isActive = isActivePath(item.path);

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`group relative flex min-h-12 w-full items-center gap-3 px-4 py-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] lg:min-h-[58px] lg:flex-col lg:justify-center lg:gap-1.5 lg:px-1 lg:py-2 ${isActive
                      ? "bg-brand-primary/10 text-brand-primary lg:bg-transparent"
                      : "text-brand-ink/60 hover:text-brand-primary lg:hover:bg-transparent"
                      }`}
                  >
                    {isActive ? (
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand-primary" />
                    ) : (
                      <div className="absolute inset-0 rounded-xl bg-brand-primary/0 transition-all duration-300 group-hover:bg-brand-primary/5 lg:mx-2" />
                    )}
                    <div className="relative">
                      <Icon className={`size-6 transition-all duration-300 ${isActive ? "scale-110 drop-shadow-sm" : "group-hover:scale-110 group-hover:drop-shadow-sm"}`} />
                      {item.icon === MessageCircle && unreadChatCount > 0 ? (
                        <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#1094EB] to-[#3B5BFC] px-1 text-[10px] font-bold leading-none text-white shadow-md shadow-brand-primary/20 ring-2 ring-[#f0f4f5]">
                          {unreadChatCount > 99 ? "99+" : unreadChatCount}
                        </span>
                      ) : null}
                    </div>
                    <span className="glass-tooltip pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2 translate-x-2 rounded-xl px-3 py-2 text-xs font-bold text-brand-ink opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 lg:block">
                      {item.label}
                    </span>
                    <span className={`relative min-w-0 max-w-full truncate text-sm font-medium leading-none transition-all duration-200 lg:px-0.5 lg:text-center lg:text-[10px] ${isActive ? "opacity-100" : "opacity-80"}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Backdrop for mobile menu */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-brand-ink/60 backdrop-blur-sm lg:hidden"
            onClick={toggleMobileMenu}
          />
        )}

        {/* Content Area */}
        <section className="relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-brand-line/10 bg-white/40 px-4 backdrop-blur-md sm:h-20 sm:px-6 lg:px-10">
            <div className="hidden md:flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <span className="text-xs font-bold text-brand-ink/40 leading-none">Admin</span>
              <ChevronRight className="size-3 text-brand-ink/20" />
              <span className="text-xs font-bold text-brand-primary leading-none">
                {activeItem.label}
              </span>
            </div>

            <AdminGlobalSearch />

            <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
              <button className="relative p-2 rounded-xl bg-white shadow-sm border border-brand-line/20 hover:bg-brand-soft transition-colors">
                <Bell className="size-5 text-brand-ink/70" />
                <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white rounded-full" />
              </button>

              <div className="h-8 w-px bg-brand-line/30 hidden sm:block" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-xl hover:bg-brand-neutral/20 transition-colors p-2">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-brand-ink leading-none">{identity.displayName}</p>
                      <p className="text-[10px] text-brand-ink/40 font-bold mt-1 uppercase tracking-tight">Admin</p>
                    </div>
                    <div className="size-10 rounded-full border-2 border-brand-line shadow-md overflow-hidden bg-brand-soft cursor-pointer hover:ring-2 hover:ring-brand-primary/30 transition-all flex items-center justify-center">
                      {profileImageUrl ? (
                        <img
                          src={profileImageUrl}
                          alt="Profile"
                          className="size-full object-cover"
                          onError={handleProfileImageError}
                        />
                      ) : (
                        <span className="text-xs font-bold text-brand-primary">{identity.displayName.charAt(0)}</span>
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto min-w-56 max-w-[320px] bg-white border border-brand-line rounded-2xl shadow-lg">
                  <div className="px-4 py-3">
                    <p className="text-sm font-bold text-brand-ink">{identity.displayName}</p>
                    <p className="text-xs text-brand-secondary mt-1 break-all">{identity.email}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary mt-2">{identity.role.replaceAll("_", " ")}</p>
                  </div>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem
                    onClick={() => navigate("/admin/dashboard/settings")}
                    className="cursor-pointer px-4 py-2.5 hover:bg-brand-primary rounded-lg transition-colors group"
                  >
                    <Settings className="size-4 mr-3 text-brand-primary group-hover:text-white transition-colors" />
                    <span className="font-medium text-brand-ink group-hover:text-white transition-colors">Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer px-4 py-2.5 hover:bg-red-500 rounded-lg transition-colors group"
                  >
                    <LogOut className="size-4 mr-3 text-red-500 group-hover:text-white transition-colors" />
                    <span className="font-medium text-red-600 group-hover:text-white transition-colors">Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 lg:px-12 lg:py-10 ${contentClassName}`}>
            <AnimatePresence mode="wait">
              <DashboardMotion
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
