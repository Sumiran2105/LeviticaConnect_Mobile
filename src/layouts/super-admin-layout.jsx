import {
  BellRing,
  Building2,
  CircleAlert,
  ChevronRight,
  CreditCard,
  FileBarChart2,
  LifeBuoy,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Settings2,
  UserRoundCog,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth-store";
import { GlobalSearch } from "@/features/super-admin-dashboard/components/global-search";

export function SuperAdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sidebarGroups = useMemo(
    () => [
      {
        title: "Platform",
        items: [
          { label: "Overview", icon: LayoutGrid, path: "/super-admin/dashboard" },
          { label: "Pending Companies", icon: CircleAlert, path: "/super-admin/dashboard/pending-companies" },
          { label: "Registration Pending", icon: CircleAlert, path: "/super-admin/dashboard/registration-pending" },
          { label: "Add Company", icon: Plus, path: "/super-admin/dashboard/companies/create" },
          { label: "All Companies", icon: Building2, path: "/super-admin/dashboard/companies" },
          { label: "Company Admins", icon: UserRoundCog, path: "/super-admin/dashboard/admins" },
          // { label: "Approvals", icon: Users, path: "/super-admin/dashboard/approvals" },
        ],
      },
      {
        title: "Operations",
        items: [
          { label: "Analytics", icon: FileBarChart2, path: "/super-admin/dashboard/analytics" },
          { label: "Billing", icon: CreditCard, path: "/super-admin/dashboard/billing" },
          // { label: "Monitoring", icon: MonitorCog, path: "/super-admin/dashboard/monitoring" },
          // { label: "Security", icon: Shield, path: "/super-admin/dashboard/security" },
        ],
      },
      {
        title: "System",
        items: [
          { label: "Notifications", icon: BellRing, path: "/super-admin/dashboard/notifications" },
          { label: "Support Desk", icon: LifeBuoy, path: "/super-admin/dashboard/support" },
          { label: "Settings", icon: Settings2, path: "/super-admin/dashboard/settings" },
        ],
      },
    ],
    []
  );

  const identity = useMemo(() => {
    const email = session?.email || "superadmin@levitica.com";
    const [namePart] = email.split("@");
    const displayName = namePart
      .split(/[.\-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return {
      email,
      displayName: displayName || "Super Admin",
      role: session?.role || "SUPER_ADMIN",
    };
  }, [session]);

  const currentNavigation = useMemo(() => {
    const flattenedItems = sidebarGroups.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        groupTitle: group.title,
      }))
    );

    const matchedItem =
      flattenedItems.find((item) => item.path === location.pathname) ||
      flattenedItems.find((item) => location.pathname.startsWith(`${item.path}/`));

    return {
      section: matchedItem?.groupTitle || "Management",
      label: matchedItem?.label || "Overview",
    };
  }, [location.pathname, sidebarGroups]);

  function handleSignOut() {
    clearSession();
    navigate("/super-admin/auth", { replace: true });
  }

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_38%,_#f6f6ff_100%)] text-brand-ink">
      <div className="flex items-center justify-between border-b border-brand-line/10 bg-white px-4 py-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
            <LayoutGrid className="size-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-ink">Super Admin</p>
            <p className="text-[11px] text-brand-secondary">Control center</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="rounded-lg border border-brand-line/20 bg-brand-soft p-2 text-brand-ink transition-transform active:scale-95"
        >
          {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col lg:flex-row">
        <aside
          className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-[240px] border-r border-white/10 bg-brand-primary text-white transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0`}
        >
          <div className="flex h-full flex-col overflow-hidden px-5 py-6">
            {/* <div
              className="cursor-pointer rounded-[24px] border border-white/10 bg-[#124f3d] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-[#155641]"
              onClick={() => navigate("/super-admin/dashboard")}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">
                Levitica Connect Control
              </p>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Super admin workspace
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/[0.72]">
                Platform-level view for company creation, admin invitations, and
                governance.
              </p>
            </div> */}

            <div className="mt-6 flex items-center justify-center rounded-[24px] border border-white/10 bg-white/10 p-4 overflow-hidden h-[90px]">
              <img src="/assets/logo.png" alt="Levitica Connect" className="-my-8 w-[180px] h-auto object-contain scale-110" />
            </div>

            <nav className="mt-8 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="space-y-8 pb-4">
                {sidebarGroups.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <p className="px-3 text-md font-semibold tracking-[0.1em]  text-white">
                      {group.title}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              navigate(item.path);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition ${isActive
                              ? "bg-white text-brand-ink shadow-sm"
                              : "text-white/[0.78] hover:bg-white/8 hover:text-white"
                              }`}
                          >
                            <span className="flex items-center gap-3">
                              <Icon className="size-4" />
                              {item.label}
                            </span>
                            <ChevronRight className="size-4 opacity-60" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            <Button
              type="button"
              variant="outline"
              className="mt-6 h-11 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {isMobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-brand-ink/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

        <section className="flex-1 overflow-y-auto lg:h-screen">
          <div className="sticky top-0 z-30 border-b border-brand-line bg-white px-5 py-4 shadow-[0_6px_24px_rgba(68,83,74,0.05)] sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-secondary">
                  {currentNavigation.section} /{" "}
                  <span className="text-brand-primary">{currentNavigation.label}</span>
                </p>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <GlobalSearch />

                <button
                  type="button"
                  onClick={() => navigate("/super-admin/dashboard/support")}
                  className="relative flex h-11 w-16 items-center justify-center rounded-2xl border border-brand-line bg-brand-neutral text-brand-secondary transition hover:bg-brand-soft hover:text-brand-ink"
                  aria-label="Open support desk"
                >
                  <BellRing className="size-4.5" />
                  <span className="absolute right-5 top-3 size-2 rounded-full bg-red-500" />
                </button>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-line bg-brand-neutral px-3 py-2 sm:justify-start">
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-semibold uppercase text-brand-secondary">
                      Super Admin
                    </p>
                    <p className="text-sm font-semibold text-brand-ink">
                      {identity.displayName}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-full border border-brand-line hover:bg-brand-soft transition">
                        <Avatar size="lg" className="bg-brand-primary/10">
                          <AvatarFallback className="bg-brand-primary text-white cursor-pointer">
                            {identity.displayName
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white border border-brand-line rounded-2xl shadow-lg">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-semibold text-brand-ink">
                          {identity.displayName}
                        </p>
                        <p className="text-xs text-brand-secondary">
                          {identity.email}
                        </p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate("/super-admin/dashboard/settings")}
                        className="cursor-pointer"
                      >
                        <Settings2 className="size-4 mr-2" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="size-4 mr-2" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
