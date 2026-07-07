import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ShieldCheck, Users, LoaderCircle, UserCheck, CalendarClock, TrendingUp, Sparkles, Video, Calendar, Clock, ChevronRight } from "lucide-react";
import { AdminLayout } from "@/layouts/admin-layout";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/lib/client";
import { createISTDateTimeFormatter, formatISTDateTime } from "@/lib/date-time";
import { COMPANY_DASHBOARD, COMPANY_KPI_TRENDS, COMPANY_ME, COMPANY_PENDING_USERS, USER_PROFILE } from "@/config/api";
import { useAdminDepartments } from "../hooks/use-admin-departments";
import { useUpcomingCalendarEvents } from "@/features/calendar/hooks/use-calendar-events";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Motion = motion;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 16,
    },
  },
};

// helper to ensure all keys/labels are clean camelCase (starting with Capital, e.g. PascalCase)
const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

function normalizePendingUsers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.pending_users)) return data.pending_users;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getMemberCount(record) {
  return (
    record?.memberCount ??
    record?.member_count ??
    record?.members_count ??
    record?.total_members ??
    record?.members?.length ??
    record?.users?.length ??
    0
  );
}

function getCompanyDisplayName(...sources) {
  for (const source of sources) {
    const name =
      source?.company_name ||
      source?.name ||
      source?.display_name ||
      source?.company?.company_name ||
      source?.company?.name ||
      source?.company?.display_name;

    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }

  return "Levitica Connect";
}

function formatMeetingDateTime(value) {
  const dateLabel = formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
  }, "");
  const timeLabel = formatISTDateTime(value, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }, "");

  return dateLabel ? { dateLabel, timeLabel } : { dateLabel: "Scheduled", timeLabel: "" };
}

function MiniCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const numberOfDays = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= numberOfDays; i++) {
    days.push(i);
  }

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="bg-white border border-brand-line/50 rounded-[24px] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold text-brand-ink uppercase tracking-wider">
          {toUserCamelCase(monthNames[month])} {year}
        </h4>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-6 rounded-md text-brand-secondary" onClick={handlePrevMonth}>
            &lt;
          </Button>
          <Button variant="ghost" size="icon" className="size-6 rounded-md text-brand-secondary" onClick={handleNextMonth}>
            &gt;
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-brand-secondary">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((day, idx) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div
              key={idx}
              className={`py-1 rounded-lg flex items-center justify-center font-semibold ${
                day === null ? 'opacity-0' :
                isToday ? 'bg-brand-primary text-white shadow-sm font-bold scale-105' :
                'text-brand-ink hover:bg-brand-soft/50 cursor-pointer'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const [kpiRangeType, setKpiRangeType] = useState("weekly");
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const { data: dashboardData = {}, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_DASHBOARD, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      return response.data;
    },
    enabled: !!session?.accessToken,
    retry: 1,
  });

  const { data: kpiData = { trend: [] }, isLoading: isKpiLoading } = useQuery({
    queryKey: ["kpi-trends", kpiRangeType],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_KPI_TRENDS(kpiRangeType), {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      return response.data;
    },
    enabled: !!session?.accessToken,
    retry: 1,
  });

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
    enabled: !!session?.accessToken,
  });
  const userProfile = profileQuery.data || {};

  const companyProfileQuery = useQuery({
    queryKey: ["company-me", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_ME, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      return response.data?.data || response.data?.company || response.data || {};
    },
    enabled: !!session?.accessToken,
  });
  const companyProfile = companyProfileQuery.data || {};

  const pendingUsersQuery = useQuery({
    queryKey: ["company-pending-users-list", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_PENDING_USERS, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      return normalizePendingUsers(response.data);
    },
    enabled: Boolean(session?.accessToken),
  });
  const pendingUsers = pendingUsersQuery.data || [];

  const departmentsQuery = useAdminDepartments(session?.accessToken);
  const departments = departmentsQuery.data || [];
  const {
    events: calendarMeetings,
    isLoading: isCalendarMeetingsLoading,
  } = useUpcomingCalendarEvents();

  const teamsQuery = useQuery({
    queryKey: ["admin-teams-list", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/channels", {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray(response.data?.channels)) return response.data.channels;
      if (Array.isArray(response.data?.data)) return response.data.data;
      if (Array.isArray(response.data?.items)) return response.data.items;
      return [];
    },
    enabled: !!session?.accessToken,
  });
  const teams = teamsQuery.data || [];

  const companyName = getCompanyDisplayName(
    companyProfile,
    dashboardData,
    userProfile,
    session
  );

  const currentDate = createISTDateTimeFormatter(
    {
      weekday: "long",
      month: "short",
      day: "numeric",
    },
    "en-US"
  ).format(new Date());

  const currentHour = Number(
    createISTDateTimeFormatter({
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date())
  );
  const greetingWord = currentHour < 12 ? "good morning" : currentHour < 17 ? "good afternoon" : "good evening";
  const allMeetings = [...(calendarMeetings || [])].sort((a, b) => {
    const firstDate = new Date(a.start_time || a.scheduled_at || 0).getTime();
    const secondDate = new Date(b.start_time || b.scheduled_at || 0).getTime();

    return firstDate - secondDate;
  });

  const overviewCards = [
    {
      label: "TotalUsers",
      value: dashboardData?.total_users || 0,
      icon: Users,
      accent: "bg-blue-50 text-blue-600 border-blue-100",
      glow: "hover:shadow-[0_20px_50px_rgba(59,130,246,0.12)] hover:border-blue-300",
    },
    {
      label: "ActiveUsers",
      value: dashboardData?.active_users || 0,
      icon: UserCheck,
      accent: "bg-emerald-50 text-emerald-600 border-emerald-100",
      glow: "hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)] hover:border-emerald-300",
    },
    {
      label: "PendingUsers",
      value: dashboardData?.pending_users || 0,
      icon: Users,
      accent: "bg-amber-50 text-amber-600 border-amber-100",
      glow: "hover:shadow-[0_20px_50px_rgba(245,158,11,0.12)] hover:border-amber-300",
    },
    {
      label: "TotalMeetings",
      value: dashboardData?.total_meetings || 0,
      icon: CalendarClock,
      accent: "bg-sky-50 text-sky-600 border-sky-100",
      glow: "hover:shadow-[0_20px_50px_rgba(14,165,233,0.12)] hover:border-sky-300",
    },
  ];

  return (
    <AdminLayout>
      <Motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8 pb-12 w-full animate-fade-in-up"
      >
        {/* Main Grid Layout matching User Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start w-full">
          {/* Left Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero card - Premium Gradient from Logo */}
            <Motion.div
              variants={itemVariants}
              className="relative overflow-hidden rounded-[32px] border border-indigo-500/20 bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] p-8 shadow-[0_24px_80px_rgba(59,130,246,0.18)] text-white"
            >
              {/* Abstract overlay */}
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1.5px, transparent 0)`,
                  backgroundSize: '28px 28px'
                }}
              />
              <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white/15 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-indigo-300/20 blur-3xl pointer-events-none" />

              <div className="relative space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 shadow-sm backdrop-blur-md text-white w-fit">
                    <Sparkles className="size-3.5 text-sky-300 animate-pulse" />
                    <span>{toUserCamelCase("admin workspace")}</span>
                  </div>
                  <span className="font-bold text-white/80">{currentDate}</span>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
                    {toUserCamelCase(greetingWord)},{" "}
                    <span className="text-sky-200">{toUserCamelCase(companyName)}</span> ✨
                  </h1>
                  {/* <p className="max-w-xl text-xs leading-6 text-sky-100/90 font-medium lowercase">
                    welcome to leviticaConnect admin command center. here is a snapshot of your company workspace, departments controls, pending approvals, and calendar meets.
                  </p> */}
                </div>
              </div>
            </Motion.div>

            {/* Workspace Modules / KPI Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold tracking-widest text-brand-secondary/60 ml-1">{toUserCamelCase("workspace modules")}</h3>
              <div className="grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-4 relative z-10">
                {overviewCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <Motion.article
                      key={card.label}
                      whileHover={{ y: -5 }}
                      className={`group relative overflow-hidden rounded-[24px] border border-brand-line/50 bg-white/90 backdrop-blur-md p-5 shadow-[0_12px_45px_rgba(68,83,74,0.03)] transition-all duration-300 ${card.glow} flex flex-col justify-between min-h-[110px]`}
                    >
                      <div className="absolute -right-10 -bottom-10 size-32 rounded-full bg-gradient-to-br from-brand-primary/0 to-brand-primary/5 blur-xl group-hover:scale-125 transition-all duration-500 pointer-events-none" />

                      <div className="relative space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-extrabold tracking-wider text-brand-secondary/80 truncate">
                            {toUserCamelCase(card.label)}
                          </p>
                          <div className={`flex items-center justify-center rounded-xl border p-2 ${card.accent} transition-all duration-300 group-hover:scale-110 shrink-0`}>
                            <Icon className="size-4" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-3xl font-extrabold tracking-tight text-brand-ink">
                            {card.value}
                          </p>
                        </div>
                      </div>
                    </Motion.article>
                  );
                })}
              </div>
            </div>            {/* Bottom lists row - Three Columns side-by-side with inner scrollbars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
              {/* pendingApprovals list card */}
              <div
                onClick={() => navigate("/admin/dashboard/approvals")}
                className="bg-white border border-brand-line/50 rounded-[24px] p-4 sm:p-5 xl:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-4 flex flex-col h-[280px]"
              >
                <div className="flex items-center justify-between shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="size-4 text-brand-primary shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-brand-ink truncate">{toUserCamelCase("pending approvals")}</h3>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary whitespace-nowrap shrink-0">
                    {pendingUsers.length} requests
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                  {pendingUsers.length > 0 ? (
                    pendingUsers.map((user, idx) => (
                      <div key={user.id || idx} className="flex items-center gap-3 p-2 rounded-xl border border-brand-line/20 bg-brand-neutral/30 min-w-0">
                        <div className="size-7 rounded-lg bg-brand-soft text-brand-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {(user.name || user.email || "U")[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-brand-ink truncate">{toUserCamelCase(user.name || "pendingUser")}</p>
                          <p className="text-[10px] text-brand-secondary truncate">{user.email}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-xs text-brand-secondary/60 font-medium lowercase">
                      no pending requests. your workspace is clean.
                    </div>
                  )}
                </div>
              </div>

              {/* departments list card */}
              <div
                onClick={() => navigate("/admin/dashboard/teams")}
                className="bg-white border border-brand-line/50 rounded-[24px] p-4 sm:p-5 xl:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-4 flex flex-col h-[280px]"
              >
                <div className="flex items-center justify-between shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="size-4 text-brand-primary shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-brand-ink truncate">{toUserCamelCase("departments")}</h3>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary whitespace-nowrap shrink-0">
                    {departments.length} units
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                  {departments.length > 0 ? (
                    departments.map((dept, idx) => (
                      <div key={dept.id || idx} className="flex items-center gap-3 p-2 rounded-xl border border-brand-line/20 bg-brand-neutral/30 min-w-0">
                        <div className="size-7 rounded-lg bg-brand-soft text-brand-primary flex items-center justify-center text-xs shrink-0">
                          <Building2 className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-brand-ink truncate">{toUserCamelCase(dept.name)}</p>
                            <p className="text-[10px] text-brand-secondary truncate">{getMemberCount(dept)} members</p>
                          </div>
                          <ChevronRight className="size-3 text-brand-secondary/60 shrink-0" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-xs text-brand-secondary/60 font-medium lowercase">
                      no departments created yet.
                    </div>
                  )}
                </div>
              </div>

              {/* teams list card */}
              <div
                onClick={() => navigate("/admin/dashboard/channels")}
                className="bg-white border border-brand-line/50 rounded-[24px] p-4 sm:p-5 xl:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-4 flex flex-col h-[280px]"
              >
                <div className="flex items-center justify-between shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="size-4 text-brand-primary shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-brand-ink truncate">{toUserCamelCase("teams")}</h3>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary whitespace-nowrap shrink-0">
                    {teams.length} channels
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                  {teams.length > 0 ? (
                    teams.map((team, idx) => (
                      <div key={team.id || idx} className="flex items-center gap-3 p-2 rounded-xl border border-brand-line/20 bg-brand-neutral/30 min-w-0">
                        <div className="size-7 rounded-lg bg-[#EDF1EE] text-[#4A90E2] flex items-center justify-center text-xs font-bold shrink-0">
                          #
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-brand-ink truncate">{toUserCamelCase(team.name || "team")}</p>
                            <p className="text-[10px] text-brand-secondary truncate">{getMemberCount(team)} members</p>
                          </div>
                          <ChevronRight className="size-3 text-brand-secondary/60 shrink-0" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-xs text-brand-secondary/60 font-medium lowercase">
                      no teams created yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Agenda Column - Shortened Agenda and Mini Calendar Widget underneath */}
          <div className="lg:col-span-1 space-y-6">
            {/* Meetings Card */}
            <div className="bg-white border border-brand-line/50 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[320px]">
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="size-4 text-brand-primary shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-brand-ink truncate">Meetings</h3>
                    <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-brand-primary">
                      {allMeetings.length}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate("/admin/dashboard/meetings")}>
                    {toUserCamelCase("schedule")}
                  </Button>
                </div>

                {isCalendarMeetingsLoading ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-xs text-brand-secondary">
                    <LoaderCircle className="size-5 animate-spin text-brand-primary" />
                    <span>Loading meetings...</span>
                  </div>
                ) : allMeetings.length > 0 ? (
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 [scrollbar-width:thin]">
                    {allMeetings.map((meeting, index) => {
                      const { dateLabel, timeLabel } = formatMeetingDateTime(
                        meeting.start_time || meeting.scheduled_at
                      );

                      return (
                        <button
                          key={meeting.id || index}
                          type="button"
                          onClick={() => navigate("/admin/dashboard/calendar")}
                          className="flex w-full items-start gap-3 rounded-2xl border border-brand-line/25 bg-brand-neutral/30 p-3 text-left transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/5"
                        >
                          <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-soft text-brand-primary">
                            <span className="text-[9px] font-extrabold uppercase leading-none">
                              {dateLabel.split(" ")[1] || "Meet"}
                            </span>
                            <span className="mt-0.5 text-xs font-extrabold leading-none">
                              {dateLabel.split(" ")[0] || ""}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-brand-ink">
                              {meeting.title || "Untitled meeting"}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-brand-secondary">
                              {[timeLabel, meeting.duration].filter(Boolean).join(" • ")}
                            </p>
                            {meeting.attendees ? (
                              <p className="mt-0.5 text-[10px] text-brand-secondary/80">
                                {meeting.attendees} attendees
                              </p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col items-center justify-center py-4 text-center">
                    <Calendar className="size-8 text-brand-secondary/20 mb-2" />
                    <h4 className="text-xs font-bold text-brand-ink">No meetings</h4>
                    <p className="text-[10px] text-brand-secondary mt-0.5 lowercase">your schedule is currently clear</p>
                  </div>
                )}
              </div>

              <Button
                onClick={() => navigate("/admin/dashboard/meetings")}
                variant="default"
                className="w-full mt-3 shrink-0"
              >
                <Video className="size-4" />
                <span>{toUserCamelCase("start instant meeting")}</span>
              </Button>
            </div>

            {/* Interactive Mini Calendar Widget */}
            <MiniCalendar />
          </div>
        </div>

        {/* Loading and Error indicators */}
        {isLoading && (
          <section className="flex items-center justify-center py-20 gap-3 text-brand-secondary">
            <LoaderCircle className="size-6 animate-spin text-brand-primary" />
            <span className="text-lg font-bold">{toUserCamelCase("loading dashboard stats")}...</span>
          </section>
        )}

        {error && (
          <section className="rounded-3xl border border-rose-200 bg-rose-50/50 backdrop-blur-sm p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <p className="text-sm font-semibold text-rose-600 lowercase">
              unable to load dashboard data. showing default values.
            </p>
          </section>
        )}

        {/* KPI Trends */}
        <Motion.section
          variants={itemVariants}
          className="rounded-[32px] border border-brand-line/60 bg-white/95 backdrop-blur-md p-7 shadow-[0_24px_80px_rgba(68,83,74,0.06)] sm:p-8 relative"
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft">
                  <TrendingUp className="size-5 text-brand-primary animate-pulse" />
                </div>
                <h2 className="text-xl font-extrabold text-brand-ink">{toUserCamelCase("metrics overview")}</h2>
              </div>
              <div className="flex gap-1.5 bg-[#EBF1F2]/60 p-1 rounded-xl border border-brand-line/30">
                {[
                  { label: "daily", value: "daily" },
                  { label: "weekly", value: "weekly" },
                  { label: "monthly", value: "monthly" },
                ].map((range) => (
                  <Button
                    key={range.value}
                    onClick={() => {
                      setKpiRangeType(range.value);
                      setHoveredIndex(null);
                    }}
                    variant={kpiRangeType === range.value ? "default" : "ghost"}
                    size="sm"
                  >
                    {toUserCamelCase(range.label)}
                  </Button>
                ))}
              </div>
            </div>

            {isKpiLoading ? (
              <div className="flex items-center justify-center py-24 gap-3 text-brand-secondary">
                <LoaderCircle className="size-6 animate-spin text-brand-primary" />
                <span className="text-sm font-bold">{toUserCamelCase("loading metrics trends")}...</span>
              </div>
            ) : kpiData?.trend && kpiData.trend.length > 0 ? (
              <div className="space-y-6 relative">
                {/* SVG Chart Container */}
                <div className="overflow-visible rounded-2xl border border-brand-line/50 bg-[#FBFDFB]/60 p-4 relative">
                  <svg
                    viewBox="0 0 1000 300"
                    className="w-full h-64 overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="chartFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.22" />
                        <stop offset="60%" stopColor="#4A90E2" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#4A90E2" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="chartStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4A90E2" />
                        <stop offset="50%" stopColor="#357ABD" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                      <linearGradient id="trackerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4A90E2" stopOpacity="0" />
                        <stop offset="50%" stopColor="#4A90E2" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#4A90E2" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={`grid-${i}`}
                        x1="40"
                        y1={60 + (i * 50)}
                        x2="960"
                        y2={60 + (i * 50)}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                    ))}

                    {/* Axes */}
                    <line x1="40" y1="60" x2="40" y2="260" stroke="#d1d5db" strokeWidth="1.5" />
                    <line x1="40" y1="260" x2="960" y2="260" stroke="#d1d5db" strokeWidth="1.5" />

                    {/* Line chart paths */}
                    {(() => {
                      const maxValue = Math.max(...kpiData.trend.map((t) => t.value || 0)) || 1;
                      const padding = 60;
                      const graphWidth = 880;
                      const graphHeight = 180;
                      const points = kpiData.trend.map((item, index) => {
                        const x = padding + (index * (graphWidth / (kpiData.trend.length - 1 || 1)));
                        const y = 250 - ((item.value / maxValue) * graphHeight);
                        return { x, y, value: item.value, label: item.label };
                      });

                      const generateSmoothPath = (pts) => {
                        let path = `M ${pts[0].x} ${pts[0].y}`;

                        for (let i = 0; i < pts.length - 1; i++) {
                          const p0 = i > 0 ? pts[i - 1] : pts[i];
                          const p1 = pts[i];
                          const p2 = pts[i + 1];
                          const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

                          const cp1x = p1.x + (p2.x - p0.x) / 6;
                          const cp1y = p1.y + (p2.y - p0.y) / 6;
                          const cp2x = p2.x - (p3.x - p1.x) / 6;
                          const cp2y = p2.y - (p3.y - p1.y) / 6;

                          path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
                        }
                        return path;
                      };

                      const pathData = generateSmoothPath(points);
                      const stepWidth = graphWidth / (points.length - 1 || 1);

                      return (
                        <>
                          <path
                            d={`${pathData} L ${points[points.length - 1].x} 260 L ${points[0].x} 260 Z`}
                            fill="url(#chartFillGradient)"
                          />

                          <path
                            d={pathData}
                            stroke="url(#chartStrokeGradient)"
                            strokeWidth="3.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {hoveredIndex !== null && points[hoveredIndex] && (
                            <line
                              x1={points[hoveredIndex].x}
                              y1="60"
                              x2={points[hoveredIndex].x}
                              y2="260"
                              stroke="url(#trackerGradient)"
                              strokeWidth="2"
                              strokeDasharray="4,4"
                            />
                          )}

                          {points.map((p, i) => {
                            const isHovered = hoveredIndex === i;
                            return (
                              <g key={`point-${i}`}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={isHovered ? "7" : "4.5"}
                                  fill={isHovered ? "#ffffff" : "#4A90E2"}
                                  stroke={isHovered ? "#357ABD" : "#ffffff"}
                                  strokeWidth={isHovered ? "3.5" : "1.5"}
                                  className="transition-all duration-150"
                                />
                                {isHovered && (
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="13"
                                    fill="none"
                                    stroke="#4A90E2"
                                    strokeWidth="1.5"
                                    opacity="0.3"
                                    className="animate-ping"
                                  />
                                )}
                              </g>
                            );
                          })}

                          {points.map((p, i) => (
                            <text
                              key={`label-${i}`}
                              x={p.x}
                              y="282"
                              textAnchor="middle"
                              fontSize="11"
                              fill="#64748B"
                              fontWeight="700"
                            >
                              {toUserCamelCase(p.label)}
                            </text>
                          ))}

                          {points.map((p, i) => (
                            <rect
                              key={`hitbox-${i}`}
                              x={p.x - stepWidth / 2}
                              y="30"
                              width={stepWidth}
                              height="240"
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredIndex(i)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            />
                          ))}
                        </>
                      );
                    })()}
                  </svg>

                  {hoveredIndex !== null && (() => {
                    const maxValue = Math.max(...kpiData.trend.map((t) => t.value || 0)) || 1;
                    const padding = 60;
                    const graphWidth = 880;
                    const graphHeight = 180;
                    const points = kpiData.trend.map((item, index) => {
                      const x = padding + (index * (graphWidth / (kpiData.trend.length - 1 || 1)));
                      const y = 250 - ((item.value / maxValue) * graphHeight);
                      return { x, y, value: item.value, label: item.label };
                    });
                    const activePoint = points[hoveredIndex];
                    if (!activePoint) return null;

                    return (
                      <div
                        className="absolute z-20 pointer-events-none bg-brand-ink text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-white/10 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all duration-200 ease-out"
                        style={{
                          left: `${(activePoint.x / 1000) * 100}%`,
                          top: `${(activePoint.y / 300) * 100}%`,
                          transform: 'translate(-50%, -125%)'
                        }}
                      >
                        <span className="text-[10px] text-white/50 uppercase tracking-widest font-extrabold">{toUserCamelCase(activePoint.label)}</span>
                        <span className="text-sm font-extrabold text-brand-tertiary">{activePoint.value}</span>
                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-ink rotate-45 border-r border-b border-white/10" />
                      </div>
                    );
                  })()}
                </div>

                {/* Secondary widgets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      label: "averageValue",
                      value: (kpiData.trend.reduce((sum, t) => sum + (t.value || 0), 0) / kpiData.trend.length).toFixed(0),
                      desc: "steadyPerformanceBaseline",
                      color: "text-blue-600",
                    },
                    {
                      label: "peakValue",
                      value: Math.max(...kpiData.trend.map((t) => t.value || 0)),
                      desc: "maximumRecordedMetricPoint",
                      color: "text-indigo-600",
                    },
                    {
                      label: "totalPeriods",
                      value: kpiData.trend.length,
                      desc: `monitoredIntervals (${toUserCamelCase(kpiRangeType)})`,
                      color: "text-emerald-600",
                    }
                  ].map((card, i) => (
                    <div key={i} className="border border-brand-line/50 rounded-2xl bg-[#EBF1F2]/25 p-4 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-secondary">{toUserCamelCase(card.label)}</p>
                        <p className={`text-2xl font-black ${card.color} mt-1.5`}>{card.value}</p>
                      </div>
                      <p className="text-[11px] text-brand-secondary/80 mt-2 font-medium">{toUserCamelCase(card.desc)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-brand-soft/40 p-8 text-center border border-dashed border-brand-line">
                <p className="text-sm text-brand-secondary font-medium lowercase">no trend data available for {toUserCamelCase(kpiRangeType)} view</p>
              </div>
            )}
          </div>
        </Motion.section>
      </Motion.div>
    </AdminLayout>
  );
}
