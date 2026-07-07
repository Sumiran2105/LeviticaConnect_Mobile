import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CircleAlert,
  CreditCard,
  FileBarChart2,
  BellRing,
  LayoutGrid,
  LifeBuoy,
  Plus,
  Search,
  Settings2,
  UserRoundCog,
  ArrowRight,
  CornerDownLeft,
  Command,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { SUPERADMIN_COMPANIES } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";

const SIDEBAR_MODULES = [
  {
    label: "Overview",
    description: "Platform dashboard overview",
    icon: LayoutGrid,
    path: "/super-admin/dashboard",
    keywords: ["home", "dashboard", "overview", "main"],
  },
  {
    label: "Pending Companies",
    description: "Companies awaiting approval",
    icon: CircleAlert,
    path: "/super-admin/dashboard/pending-companies",
    keywords: ["pending", "approval", "waiting", "queue"],
  },
  {
    label: "Add Company",
    description: "Register a new company",
    icon: Plus,
    path: "/super-admin/dashboard/companies/create",
    keywords: ["add", "create", "new", "register", "onboard"],
  },
  {
    label: "All Companies",
    description: "Browse all onboarded companies",
    icon: Building2,
    path: "/super-admin/dashboard/companies",
    keywords: ["companies", "list", "browse", "directory", "all"],
  },
  {
    label: "Company Admins",
    description: "Manage company admin accounts",
    icon: UserRoundCog,
    path: "/super-admin/dashboard/admins",
    keywords: ["admins", "administrators", "users", "accounts"],
  },
  {
    label: "Analytics",
    description: "Platform analytics and insights",
    icon: FileBarChart2,
    path: "/super-admin/dashboard/analytics",
    keywords: ["analytics", "reports", "insights", "data", "metrics", "charts"],
  },
  {
    label: "Billing",
    description: "Subscription and payment management",
    icon: CreditCard,
    path: "/super-admin/dashboard/billing",
    keywords: ["billing", "payments", "subscription", "invoices", "plans"],
  },
  {
    label: "Notifications",
    description: "Send and manage notifications",
    icon: BellRing,
    path: "/super-admin/dashboard/notifications",
    keywords: ["notifications", "alerts", "messages", "send"],
  },
  {
    label: "Support Desk",
    description: "View and manage support tickets",
    icon: LifeBuoy,
    path: "/super-admin/dashboard/support",
    keywords: ["support", "tickets", "help", "issues", "desk"],
  },
  {
    label: "Settings",
    description: "Platform settings and configuration",
    icon: Settings2,
    path: "/super-admin/dashboard/settings",
    keywords: ["settings", "configuration", "preferences", "profile"],
  },
];

const PLACEHOLDER_TEXTS = [
  "Search modules...",
  "Search companies...",
  "Search admins...",
  "Go to settings...",
  "Find pending approvals...",
  "Browse analytics...",
];

function normalizeCompanies(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.companies)) {
    return data.companies;
  }

  return [];
}

function highlightMatch(text, query) {
  if (!query.trim()) {
    return text;
  }

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

export function GlobalSearch() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Fetch companies data for search
  const companiesQuery = useQuery({
    queryKey: ["global-search-companies"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_COMPANIES, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      return normalizeCompanies(response.data);
    },
    staleTime: 60_000,
    enabled: Boolean(session?.accessToken),
  });

  const allCompanies = useMemo(() => companiesQuery.data || [], [companiesQuery.data]);

  // Build search results
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return {
        modules: SIDEBAR_MODULES.slice(0, 5),
        companies: [],
        admins: [],
        total: 5,
      };
    }

    // Filter modules
    const matchedModules = SIDEBAR_MODULES.filter((mod) => {
      const searchable = [mod.label, mod.description, ...mod.keywords]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });

    // Filter companies
    const matchedCompanies = allCompanies
      .filter((company) => {
        const name = (company.name || company.company_name || "").toLowerCase();
        const domain = (company.domain || "").toLowerCase();
        const status = (company.status || "").toLowerCase();

        return name.includes(term) || domain.includes(term) || status.includes(term);
      })
      .slice(0, 5)
      .map((company, index) => ({
        id: company.id || company.company_id || `company-${index}`,
        name: company.name || company.company_name || `Company ${index + 1}`,
        domain: company.domain || "No domain",
        status: company.status || "Active",
      }));

    // Filter admins from company data
    const matchedAdmins = allCompanies
      .filter((company) => {
        const adminName = (
          company.admin_full_name ||
          company.full_name ||
          company.name_of_admin ||
          ""
        ).toLowerCase();
        const adminEmail = (company.admin_email || company.email || "").toLowerCase();

        return adminName.includes(term) || adminEmail.includes(term);
      })
      .slice(0, 5)
      .map((company, index) => ({
        id: company.id || company.company_id || `admin-${index}`,
        name:
          company.admin_full_name ||
          company.full_name ||
          company.name_of_admin ||
          "Unnamed Admin",
        email: company.admin_email || company.email || "No email",
        company: company.name || company.company_name || "No company",
      }));

    return {
      modules: matchedModules,
      companies: matchedCompanies,
      admins: matchedAdmins,
      total: matchedModules.length + matchedCompanies.length + matchedAdmins.length,
    };
  }, [query, allCompanies]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const items = [];

    results.modules.forEach((mod) => {
      items.push({ type: "module", data: mod, path: mod.path });
    });

    results.companies.forEach((company) => {
      items.push({
        type: "company",
        data: company,
        path: "/super-admin/dashboard/companies",
      });
    });

    results.admins.forEach((admin) => {
      items.push({
        type: "admin",
        data: admin,
        path: "/super-admin/dashboard/admins",
      });
    });

    return items;
  }, [results]);

  // Navigate to result
  const handleSelect = useCallback(
    (item) => {
      navigate(item.path);
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [navigate]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event) => {
      if (!isOpen) {
        return;
      }

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

        default:
          break;
      }
    },
    [isOpen, flatResults, activeIndex, handleSelect]
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) {
      return;
    }

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
    <div ref={containerRef} className="relative w-full sm:min-w-[240px] sm:max-w-[320px]">
      {/* Search Input */}
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-secondary z-10" />
      <Input
        ref={inputRef}
        id="global-search-input"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!isOpen) {
            setIsOpen(true);
          }
        }}
        onFocus={() => {
          setIsOpen(true);
          setIsFocused(true);
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        onKeyDown={handleKeyDown}
        placeholder={isFocused && !query ? "Type to search..." : undefined}
        className="h-11 rounded-2xl border-brand-line bg-brand-neutral pl-11 pr-4 text-sm text-brand-ink"
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
            className="flex items-center h-5 whitespace-nowrap text-sm text-brand-secondary/50"
            style={{
              animation: "marquee-scroll 10s linear infinite",
            }}
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
                <p className="mt-3 text-sm font-medium text-brand-secondary">
                  No results found
                </p>
                <p className="mt-1 text-xs text-brand-secondary/70">
                  Try a different search term
                </p>
              </div>
            ) : (
              <>
                {/* Modules Section */}
                {results.modules.length > 0 && (
                  <div>
                    <div className="px-4 pb-1.5 pt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">
                        Modules
                      </p>
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
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${activeIndex === currentIndex
                              ? "bg-brand-primary/[0.06]"
                              : "hover:bg-brand-neutral/60"
                            }`}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          onClick={() =>
                            handleSelect({ type: "module", data: mod, path: mod.path })
                          }
                        >
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${activeIndex === currentIndex
                                ? "bg-brand-primary text-white"
                                : "bg-brand-neutral text-brand-secondary"
                              }`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-brand-ink truncate">
                              {highlightMatch(mod.label, query)}
                            </p>
                            <p className="text-xs text-brand-secondary/70 truncate">
                              {mod.description}
                            </p>
                          </div>
                          {activeIndex === currentIndex && (
                            <ArrowRight className="size-3.5 shrink-0 text-brand-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Companies Section */}
                {results.companies.length > 0 && (
                  <div>
                    <div className="mx-4 my-1.5 border-t border-brand-line/50" />
                    <div className="px-4 pb-1.5 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">
                        Companies
                      </p>
                    </div>
                    {results.companies.map((company) => {
                      flatIndex++;
                      const currentIndex = flatIndex;

                      return (
                        <button
                          key={`company-${company.id}`}
                          type="button"
                          data-index={currentIndex}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${activeIndex === currentIndex
                              ? "bg-brand-primary/[0.06]"
                              : "hover:bg-brand-neutral/60"
                            }`}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          onClick={() =>
                            handleSelect({
                              type: "company",
                              data: company,
                              path: "/super-admin/dashboard/companies",
                            })
                          }
                        >
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${activeIndex === currentIndex
                                ? "bg-emerald-500 text-white"
                                : "bg-emerald-50 text-emerald-600"
                              }`}
                          >
                            <Building2 className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-brand-ink truncate">
                              {highlightMatch(company.name, query)}
                            </p>
                            <p className="text-xs text-brand-secondary/70 truncate">
                              {company.domain} · {company.status}
                            </p>
                          </div>
                          {activeIndex === currentIndex && (
                            <ArrowRight className="size-3.5 shrink-0 text-brand-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Admins Section */}
                {results.admins.length > 0 && (
                  <div>
                    <div className="mx-4 my-1.5 border-t border-brand-line/50" />
                    <div className="px-4 pb-1.5 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">
                        Admins
                      </p>
                    </div>
                    {results.admins.map((admin) => {
                      flatIndex++;
                      const currentIndex = flatIndex;

                      return (
                        <button
                          key={`admin-${admin.id}`}
                          type="button"
                          data-index={currentIndex}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${activeIndex === currentIndex
                              ? "bg-brand-primary/[0.06]"
                              : "hover:bg-brand-neutral/60"
                            }`}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          onClick={() =>
                            handleSelect({
                              type: "admin",
                              data: admin,
                              path: "/super-admin/dashboard/admins",
                            })
                          }
                        >
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${activeIndex === currentIndex
                                ? "bg-violet-500 text-white"
                                : "bg-violet-50 text-violet-600"
                              }`}
                          >
                            <UserRoundCog className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-brand-ink truncate">
                              {highlightMatch(admin.name, query)}
                            </p>
                            <p className="text-xs text-brand-secondary/70 truncate">
                              {highlightMatch(admin.email, query)} · {admin.company}
                            </p>
                          </div>
                          {activeIndex === currentIndex && (
                            <ArrowRight className="size-3.5 shrink-0 text-brand-primary" />
                          )}
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
              <kbd className="inline-flex items-center justify-center rounded-md border border-brand-line bg-white px-1 py-0.5 font-mono text-[10px] shadow-sm">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-brand-secondary/60">
              <kbd className="inline-flex items-center justify-center rounded-md border border-brand-line bg-white px-1 py-0.5 shadow-sm">
                <CornerDownLeft className="size-2.5" />
              </kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-brand-secondary/60">
              <kbd className="inline-flex items-center justify-center rounded-md border border-brand-line bg-white px-1 py-0.5 font-mono text-[10px] shadow-sm">
                Esc
              </kbd>
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
