import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  MessageCircle,
  Video,
  Users,
  LoaderCircle,
  Sparkles,
  UserRound,
} from "lucide-react";

import { useAuthStore } from "@/store/auth-store";
import { useUserTeams } from "@/features/teams/hooks/use-user-teams";
import { useUpcomingCalendarEvents } from "@/features/calendar/hooks/use-calendar-events";
import { apiClient } from "@/lib/client";
import { TEAMS_MY_TEAMS } from "@/config/api";
import { UserLayout } from "@/layouts/user-layout";

const actions = [
  {
    title: "Chat",
    badge: "Direct Messages",
    icon: MessageCircle,
    route: "/user/dashboard/chat",
    iconBg: "bg-blue-50 text-blue-600 border border-blue-100/50",
    hoverBorder:
      "hover:border-blue-200 hover:shadow-[0_8px_20px_rgba(59,130,246,0.04)]",
  },
  {
    title: "Meet",
    badge: "Instant Call",
    icon: Video,
    route: "/user/dashboard/meet",
    iconBg: "bg-violet-50 text-violet-600 border border-violet-100/50",
    hoverBorder:
      "hover:border-violet-200 hover:shadow-[0_8px_20px_rgba(139,92,246,0.04)]",
  },
  {
    title: "Files",
    badge: "Cloud Drive",
    icon: FileText,
    route: "/user/dashboard/files",
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
    hoverBorder:
      "hover:border-emerald-200 hover:shadow-[0_8px_20px_rgba(16,185,129,0.04)]",
  },
  {
    title: "Calendar",
    badge: "Daily Events",
    icon: Calendar,
    route: "/user/dashboard/calendar",
    iconBg: "bg-rose-50 text-rose-600 border border-rose-100/50",
    hoverBorder:
      "hover:border-rose-200 hover:shadow-[0_8px_20px_rgba(244,63,94,0.04)]",
  },
  {
    title: "Departments",
    badge: "Divisions",
    icon: Building2,
    route: "/user/dashboard/teams",
    iconBg: "bg-amber-50 text-amber-600 border border-amber-100/50",
    hoverBorder:
      "hover:border-amber-200 hover:shadow-[0_8px_20px_rgba(245,158,11,0.04)]",
  },
];

export function UserDashboardPage() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const displayName = session?.full_name || session?.name || "Workspace Member";

  const { events, isLoading: isCalendarLoading } = useUpcomingCalendarEvents();
  const { channelState } = useUserTeams({ accessToken: session?.accessToken });
  const teams = channelState.filteredChannels || [];
  const isTeamsLoading = channelState.isLoading;

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.accessToken}`,
    }),
    [session?.accessToken],
  );

  const departmentsQuery = useQuery({
    queryKey: ["my-departments", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(TEAMS_MY_TEAMS, {
        headers: authHeaders,
      });
      const data = response.data;
      let rawList = [];
      if (Array.isArray(data)) rawList = data;
      else if (Array.isArray(data?.teams)) rawList = data.teams;
      else if (Array.isArray(data?.departments)) rawList = data.departments;
      else if (Array.isArray(data?.data)) rawList = data.data;
      else if (Array.isArray(data?.items)) rawList = data.items;

      return rawList.map((dept, index) => {
        const name =
          dept?.name ||
          dept?.team_name ||
          dept?.department_name ||
          `Department ${index + 1}`;
        const description =
          dept?.description ||
          dept?.purpose ||
          dept?.about ||
          "No department description available yet.";
        const memberCount =
          dept?.members_count ||
          dept?.member_count ||
          dept?.members?.length ||
          dept?.users_count ||
          0;
        const role =
          dept?.role || dept?.user_role || dept?.membership_role || "Member";
        return {
          id:
            dept?.id ||
            dept?.team_id ||
            dept?.department_id ||
            `${name}-${index}`,
          name,
          description,
          memberCount,
          role,
        };
      });
    },
    enabled: Boolean(session?.accessToken),
    staleTime: 5 * 60 * 1000,
  });

  const departments = departmentsQuery.data || [];
  const isDepartmentsLoading = departmentsQuery.isLoading;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const upcomingEvents = useMemo(() => {
    return [...(events || [])].sort(
      (a, b) => new Date(a.start_time) - new Date(b.start_time),
    );
  }, [events]);

  return (
    <UserLayout
      contentClassName="lg:!overflow-hidden lg:h-full overflow-y-auto pb-5 sm:pb-8 lg:pb-10"
      contentInnerClassName="lg:h-full flex flex-col min-h-0"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch lg:h-full min-h-0">
        {/* Main Column */}
        <div className="lg:col-span-2 flex flex-col lg:h-full min-h-0 gap-6">
          {/* Welcome Card */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8 shrink-0">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-bold tracking-[0.05em] text-indigo-200 backdrop-blur-sm">
                  <Sparkles className="size-3 text-indigo-300" />
                  User Workspace
                </div>
                <div className="text-xs font-semibold text-indigo-200/80">
                  {formattedDate}
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {getGreeting()},{" "}
                  <span className="bg-gradient-to-r from-blue-300 to-indigo-200 bg-clip-text text-transparent">
                    {displayName}
                  </span>{" "}
                  ✨
                </h1>
                {/* <p className="text-sm leading-relaxed text-slate-300">
                  Welcome to Levitica Connect. Here is a snapshot of your
                  digital workspace. Jump straight into active chats, manage
                  scheduled meets, or access shared organizational files.
                </p> */}
              </div>
            </div>
          </section>

          {/* Workspace Modules */}
          <section className="space-y-3 shrink-0">
            <h2 className="text-sm font-bold  tracking-wider text-brand-secondary/80 flex items-center gap-2">
              Workspace Modules
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {actions.map((item, index) => {
                const Icon = item.icon;

                const isLastOddMobile =
                  actions.length % 2 !== 0 && index === actions.length - 1;

                return (
                  <article
                    key={item.title}
                    onClick={() => navigate(item.route)}
                    className={`
          group flex flex-col items-center justify-center text-center
          cursor-pointer rounded-2xl border border-brand-line/45
          bg-white p-4 transition-all duration-300
          hover:-translate-y-0.5 hover:shadow-md
          ${item.hoverBorder}

          ${
            isLastOddMobile
              ? "col-span-2 justify-self-center w-1/2 sm:col-span-1 sm:w-full sm:justify-self-auto"
              : ""
          }
        `}
                  >
                    <div
                      className={`rounded-xl p-2.5 ${item.iconBg} mb-3 transition-transform group-hover:scale-105`}
                    >
                      <Icon className="size-5" />
                    </div>

                    <h3 className="text-md sm:text-md font-bold text-brand-ink transition-colors group-hover:text-brand-primary">
                      {item.title}
                    </h3>

                    <span className="mt-1 text-[10px] sm:text-[12px] font-semibold text-brand-secondary/70">
                      {item.badge}
                    </span>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Teams & Departments Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:flex-1 min-h-0">
            {/* Joined Teams */}
            <section className="rounded-2xl border border-brand-line/45 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col h-[320px] lg:h-full min-h-0">
              <div className="flex items-center justify-between border-b border-brand-line/30 pb-3 shrink-0">
                <h2 className="text-sm font-bold text-brand-ink flex items-center gap-2">
                  <Users className="size-4 text-indigo-500" />
                  Joined Teams
                </h2>
                <span className="text-[12px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {teams.length} Channel{teams.length !== 1 && "s"}
                </span>
              </div>

              <div className="mt-3 flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2 min-h-0">
                {isTeamsLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-xs text-brand-secondary gap-2">
                    <LoaderCircle className="size-5 animate-spin text-indigo-500" />
                    <span>Loading your teams...</span>
                  </div>
                ) : teams.length > 0 ? (
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        onClick={() =>
                          navigate(
                            `/user/dashboard/channels?channelId=${encodeURIComponent(team.id)}`,
                            {
                              state: { selectedChannelId: team.id },
                            },
                          )
                        }
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-brand-line/30 bg-white hover:border-brand-primary/30 hover:bg-slate-50 transition cursor-pointer group"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-primary group-hover:bg-brand-primary/10">
                          <UserRound className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-md font-bold text-brand-ink group-hover:text-brand-primary transition-colors">
                            {team.name}
                          </p>
                          <p className="truncate text-[11px] text-brand-secondary/100">
                            {team.teamName || "Workspace channel"} •{" "}
                            {team.memberCount} members
                          </p>
                        </div>
                        <ArrowRight className="size-3 text-brand-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full py-4">
                    <Users className="size-8 text-brand-secondary/40 mb-2" />
                    <p className="text-xs font-bold text-brand-ink">
                      No teams joined
                    </p>
                    <p className="text-[10px] text-brand-secondary mt-1">
                      You aren't a member of any teams yet.
                    </p>
                  </div>
                )}
              </div>

              {teams.length > 4 && (
                <div className="mt-2 pt-2 border-t border-brand-line/20 shrink-0">
                  <button
                    onClick={() => navigate("/user/dashboard/channels")}
                    className="w-full text-center text-[10px] font-bold text-brand-primary hover:underline flex items-center justify-center gap-1"
                  >
                    <span>View all teams</span>
                    <ArrowRight className="size-2.5" />
                  </button>
                </div>
              )}
            </section>

            {/* Departments */}
            <section className="rounded-2xl border border-brand-line/45 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col h-[320px] lg:h-full min-h-0">
              <div className="flex items-center justify-between border-b border-brand-line/30 pb-3 shrink-0">
                <h2 className="text-sm font-bold text-brand-ink flex items-center gap-2">
                  <Building2 className="size-4 text-amber-500" />
                  Departments
                </h2>
                <span className="text-[12px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                  {departments.length} Member {departments.length !== 1 && "s"}
                </span>
              </div>

              <div className="mt-3 flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2 min-h-0">
                {isDepartmentsLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-xs text-brand-secondary gap-2">
                    <LoaderCircle className="size-5 animate-spin text-amber-500" />
                    <span>Loading departments...</span>
                  </div>
                ) : departments.length > 0 ? (
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        onClick={() => navigate("/user/dashboard/teams")}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-brand-line/30 bg-white hover:border-brand-primary/30 hover:bg-slate-50 transition cursor-pointer group"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-primary group-hover:bg-brand-primary/10">
                          <Building2 className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-md font-bold text-brand-ink group-hover:text-brand-primary transition-colors">
                            {dept.name}
                          </p>
                          <p className="truncate text-[11px] text-brand-secondary/100">
                            {String(dept.role)
                              .toLowerCase()
                              .replaceAll("_", " ")
                              .replace(/\b\w/g, (char) => char.toUpperCase())}
                            {" • "}
                            {dept.memberCount} member{" "}
                            {dept.memberCount !== 1 && "s"}
                          </p>
                        </div>
                        <ArrowRight className="size-3 text-brand-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full py-4">
                    <Building2 className="size-8 text-brand-secondary/40 mb-2" />
                    <p className="text-xs font-bold text-brand-ink">
                      No departments
                    </p>
                    <p className="text-[10px] text-brand-secondary mt-1">
                      You aren't a member of any departments yet.
                    </p>
                  </div>
                )}
              </div>

              {departments.length > 4 && (
                <div className="mt-2 pt-2 border-t border-brand-line/20 shrink-0">
                  <button
                    onClick={() => navigate("/user/dashboard/teams")}
                    className="w-full text-center text-[10px] font-bold text-brand-primary hover:underline flex items-center justify-center gap-1"
                  >
                    <span>View all departments</span>
                    <ArrowRight className="size-2.5" />
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="lg:col-span-1 flex flex-col lg:h-full min-h-0">
          {/* Meetings Card */}
          <section className="rounded-2xl border border-brand-line/45 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col h-[320px] lg:h-full min-h-0">
            <div className="flex items-center justify-between border-b border-brand-line/30 pb-4 shrink-0">
              <h2 className="text-sm font-bold text-brand-ink flex items-center gap-2">
                <Clock className="size-4 text-brand-primary" />
                Meetings
                <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-brand-primary">
                  {upcomingEvents.length}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => navigate("/user/dashboard/meet")}
                className="text-[12px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md transition hover:bg-brand-primary/15"
              >
                Schedule
              </button>
            </div>

            {isCalendarLoading ? (
              <div className="flex flex-col items-center justify-center flex-1 text-xs text-brand-secondary gap-2 min-h-0">
                <LoaderCircle className="size-5 animate-spin text-brand-primary" />
                <span>Loading meetings...</span>
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="mt-4 flex-1 overflow-y-auto pr-1 scrollbar-thin sm:pl-8 pl-6 border-l border-brand-line/0 space-y-5 min-h-0">
                {upcomingEvents.map((event, index) => (
                  <div key={event.id || index} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-brand-primary bg-white transition-colors duration-300 group-hover:bg-brand-primary" />

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-brand-secondary/80">
                          {event.time}
                        </span>
                        <span className="text-[9px] font-semibold text-brand-primary bg-brand-primary/5 px-1.5 py-0.25 rounded">
                          {event.duration}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-brand-ink mt-0.5">
                        {event.title}
                      </span>
                      {event.description && (
                        <span className="text-[10px] text-brand-secondary line-clamp-2 mt-0.5">
                          {event.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 min-h-0">
                <CalendarDays className="size-8 text-brand-secondary/40 mb-2" />
                <p className="text-md font-bold text-brand-ink">No meetings</p>
                <p className="text-[12px] text-brand-secondary mt-1">
                  Your schedule is currently clear.
                </p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-brand-line/30 shrink-0">
              <button
                onClick={() => navigate("/user/dashboard/meet")}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800 flex items-center justify-center gap-1.5 active:scale-[0.99]"
              >
                <Video className="size-3.5" />
                Start Instant Meeting
              </button>
            </div>
          </section>
        </div>
      </div>
    </UserLayout>
  );
}
