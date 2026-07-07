import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Hash,
  LoaderCircle,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  SquarePen,
  Users,
} from "lucide-react";

import { CHANNEL_MEMBERS, CHANNELS_MY_CHANNELS, TEAMS_MEMBERS, TEAMS_MY_TEAMS } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import { ChatAvatar } from "@/features/chat/components/chat-avatar";
import { getJwtPayload } from "@/features/chat/utils/chat-utils";
import {
  getMemberContactTarget,
  getUserAvatar,
  getUserEmail,
  getUserId,
  getUserName,
  isDirectChannel,
} from "@/features/teams/utils/team-utils";
import { useMeetingLauncher } from "@/features/meetings/hooks/use-meeting-launcher";
import { UserLayout } from "@/layouts/user-layout";

const TEAMS_CACHE_PREFIX = "Levitica Connect-user-teams-v1";

function getArrayPayload(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function normalizeTeams(data) {
  return getArrayPayload(data, ["teams", "departments", "data", "items"]);
}

function buildTeamView(team, index) {
  const name = team?.name || team?.team_name || team?.department_name || `Department ${index + 1}`;
  const description =
    team?.description ||
    team?.purpose ||
    team?.about ||
    "No department description available yet.";
  const members =
    team?.members_count ||
    team?.member_count ||
    team?.members?.length ||
    team?.users_count ||
    0;
  const channels =
    team?.channels_count ||
    team?.channel_count ||
    team?.channels?.length ||
    0;
  const role = team?.role || team?.user_role || team?.membership_role || "USER";

  return {
    id: team?.id || team?.team_id || team?.department_id || `${name}-${index}`,
    name,
    description,
    members,
    channels,
    role,
  };
}

function buildChannelView(channel, index) {
  const name = channel?.name || channel?.channel_name || `Team ${index + 1}`;
  const description =
    channel?.description ||
    channel?.purpose ||
    channel?.topic ||
    "No team description available yet.";

  return {
    ...channel,
    id: channel?.id || channel?.channel_id || `${name}-${index}`,
    name,
    description,
    teamId: channel?.team_id || channel?.department_id || channel?.team?.id || "",
    teamName: channel?.team_name || channel?.department_name || channel?.team?.name || "",
    memberCount: channel?.members_count || channel?.member_count || channel?.members?.length || 0,
    visibilityLabel: channel?.is_private || channel?.private ? "Private" : "Public",
  };
}

function buildMemberView(member, index) {
  const id = getUserId(member) || `member-${index}`;
  const name = getUserName(member, id, member?.role);

  return {
    ...member,
    id,
    name,
    email: getUserEmail(member),
    avatar: getUserAvatar(member),
    role: member?.role || member?.membership_role || member?.user_role || "Member",
  };
}

function TeamSidebarItem({ team, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isActive
        ? "border-brand-primary/20 bg-white shadow-sm"
        : "border-transparent bg-transparent hover:border-gray-200 hover:bg-white"
        }`}
    >
      <div className="flex items-start gap-3">
        <ChatAvatar name={team.name} size="size-11" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-semibold text-gray-900">{team.name}</p>
            <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-primary">
              {team.role}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">{team.description}</p>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ icon, title, message }) {
  const EmptyIcon = icon;

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-brand-soft text-brand-primary">
        <EmptyIcon className="size-6" />
      </div>
      <h3 className="text-xl font-semibold text-gray-950">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function DepartmentsPage() {
  const session = useAuthStore((state) => state.session);
  const navigate = useNavigate();
  const meetings = useMeetingLauncher("user");
  const [search, setSearch] = useState("");
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [activeTab, setActiveTab] = useState("members");
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const teamsCacheKey = useMemo(() => {
    const payload = getJwtPayload(session?.accessToken);
    const userKey = payload?.sub || payload?.user_id || payload?.id || payload?.email || session?.email || "anonymous";
    return `${TEAMS_CACHE_PREFIX}:${userKey}`;
  }, [session?.accessToken, session?.email]);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.accessToken}`,
    }),
    [session?.accessToken]
  );

  const teamsQuery = useQuery({
    queryKey: ["my-teams", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(TEAMS_MY_TEAMS, { headers: authHeaders });
      return normalizeTeams(response.data).map(buildTeamView);
    },
    enabled: Boolean(session?.accessToken),
    initialData: () => {
      if (typeof window === "undefined" || !session?.accessToken) return undefined;

      try {
        return JSON.parse(window.localStorage.getItem(teamsCacheKey) || "null") || undefined;
      } catch {
        return undefined;
      }
    },
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnReconnect: true,
  });

  const userTeamsQuery = useQuery({
    queryKey: ["department-user-channels", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(CHANNELS_MY_CHANNELS, { headers: authHeaders });
      return getArrayPayload(response.data, ["channels", "data", "items"])
        .filter((channel) => !isDirectChannel(channel))
        .map(buildChannelView);
    },
    enabled: Boolean(session?.accessToken),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !teamsQuery.data?.length) return;

    window.localStorage.setItem(teamsCacheKey, JSON.stringify(teamsQuery.data));
  }, [teamsCacheKey, teamsQuery.data]);

  const teams = useMemo(() => teamsQuery.data || [], [teamsQuery.data]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return teams;

    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.description.toLowerCase().includes(query) ||
        team.role.toLowerCase().includes(query)
    );
  }, [search, teams]);

  const activeTeam =
    filteredTeams.find((team) => team.id === activeTeamId) ||
    teams.find((team) => team.id === activeTeamId) ||
    filteredTeams[0] ||
    teams[0] ||
    null;

  const membersQuery = useQuery({
    queryKey: ["department-members", activeTeam?.id, session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(TEAMS_MEMBERS(activeTeam.id), { headers: authHeaders });
      return getArrayPayload(response.data, ["members", "users", "data", "items"]).map(buildMemberView);
    },
    enabled: Boolean(activeTeam?.id && session?.accessToken),
    staleTime: 2 * 60 * 1000,
  });

  const rawUserTeams = useMemo(() => userTeamsQuery.data || [], [userTeamsQuery.data]);
  const teamMemberCountQueries = useQueries({
    queries: rawUserTeams.map((team) => ({
      queryKey: ["department-team-member-count", team.id],
      queryFn: async () => {
        const response = await apiClient.get(CHANNEL_MEMBERS(team.id), { headers: authHeaders });
        return getArrayPayload(response.data, ["members", "users", "data", "items"]).length;
      },
      enabled: Boolean(session?.accessToken && team.id),
      staleTime: 2 * 60 * 1000,
      retry: false,
    })),
  });
  const userTeams = useMemo(
    () =>
      rawUserTeams.map((team, index) => ({
        ...team,
        memberCount: teamMemberCountQueries[index]?.data ?? team.memberCount ?? 0,
      })),
    [rawUserTeams, teamMemberCountQueries]
  );

  function openTeam(team) {
    setActiveTeamId(team.id);
    setActiveTab("members");
    setIsMobilePanelOpen(true);
  }

  function handleChatMember(member) {
    const targetUser = getMemberContactTarget(member);
    if (!targetUser) return;

    const params = new URLSearchParams({
      userId: String(targetUser.userId || targetUser.user_id || targetUser.id || ""),
      name: targetUser.name || "",
      email: targetUser.email || "",
    });

    navigate(`/user/dashboard/chat?${params.toString()}`, {
      state: {
        selectedUserId: targetUser.id,
        selectedUserUserId: targetUser.userId || targetUser.user_id,
        selectedUserName: targetUser.name,
        selectedUserEmail: targetUser.email,
      },
    });
  }

  function handleCallMember(member) {
    const targetUser = getMemberContactTarget(member);
    if (!targetUser) return;

    void meetings.startDirectCall(targetUser, { mode: "audio" });
  }

  function handleOpenTeamChat(team) {
    navigate(`/user/dashboard/channels?channelId=${encodeURIComponent(team.id)}`, {
      state: {
        selectedChannelId: team.id,
      },
    });
  }

  return (
    <UserLayout
      showFloatingActions={false}
      contentClassName="!p-0 h-full overflow-hidden"
      contentInnerClassName="!max-w-none !w-full !m-0 h-full"
    >
      <div className="flex h-full w-full overflow-hidden bg-white">
        <aside
          className={`shrink-0 flex-col border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white lg:flex lg:w-[22rem] ${isMobilePanelOpen ? "max-lg:hidden lg:flex" : "flex w-full"}`}
        >
          <div className="border-b border-gray-200 px-6 py-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-gray-950">Departments</h2>
                <p className="mt-1 text-sm text-gray-500">Your department memberships</p>
              </div>
              <button
                type="button"
                className="rounded-2xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition hover:border-brand-primary/30 hover:text-brand-primary"
                aria-label="Departments workspace"
                title="Departments workspace"
              >
                <SquarePen className="size-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search departments"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold tracking-[0.1em] text-gray-500">
                  Your departments
                </h3>
                <span className="text-xs font-medium text-gray-400">{teams.length}</span>
              </div>

              <div className="space-y-2">
                {teamsQuery.isLoading ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">
                    Loading your departments...
                  </div>
                ) : null}

                {teamsQuery.isError ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-0 py-4 text-sm text-rose-600">
                    Unable to load your departments right now.
                  </div>
                ) : null}

                {!teamsQuery.isLoading && !teamsQuery.isError && !filteredTeams.length ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">
                    No departments matched this search.
                  </div>
                ) : null}

                {filteredTeams.map((team) => (
                  <TeamSidebarItem
                    key={team.id}
                    team={team}
                    isActive={activeTeam?.id === team.id}
                    onClick={() => openTeam(team)}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section
          className={`min-w-0 flex-1 flex-col bg-white ${isMobilePanelOpen ? "flex" : "max-lg:hidden lg:flex"}`}
        >
          {activeTeam ? (
            <>
              <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setIsMobilePanelOpen(false)}
                      className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <ChatAvatar name={activeTeam.name} size="size-11" />
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-gray-950">{activeTeam.name}</h3>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                        {activeTeam.role}
                      </p>
                    </div>
                  </div>
                </div>
              </header>

              <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-3">
                <div className="flex items-center gap-6">
                  {[
                    { id: "members", label: "Members" },
                    { id: "teams", label: "Teams" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`border-b-2 pb-2 text-sm font-medium transition ${activeTab === tab.id
                        ? "border-brand-primary text-brand-primary"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <div className="flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-white to-gray-50/60 px-4 py-6 sm:px-6 [scrollbar-width:thin]">
            {!activeTeam ? (
              <EmptyState
                icon={Users}
                title="Select a department"
                message="Pick a department from the left to see its members and teams."
              />
            ) : activeTab === "members" ? (
              membersQuery.isLoading ? (
                <div className="flex items-center justify-center py-24 text-sm text-gray-500">
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Loading department members...
                </div>
              ) : membersQuery.isError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-600">
                  Unable to load department members right now.
                </div>
              ) : membersQuery.data?.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {membersQuery.data.map((member) => (
                    <div
                      key={member.id}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <ChatAvatar name={member.name} image={member.avatar} size="size-11" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-950">{member.name}</p>
                        <p className="truncate text-xs text-gray-500">{member.email || member.role}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleChatMember(member)}
                          className="rounded-xl p-2 text-gray-600 transition hover:bg-brand-soft hover:text-brand-primary"
                          title="Chat"
                          aria-label={`Chat with ${member.name}`}
                        >
                          <MessageCircle className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCallMember(member)}
                          className="rounded-xl p-2 text-gray-600 transition hover:bg-brand-soft hover:text-brand-primary"
                          title="Call"
                          aria-label={`Call ${member.name}`}
                        >
                          <Phone className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No members found"
                  message="We could not find any members for this department."
                />
              )
            ) : userTeamsQuery.isLoading ? (
              <div className="flex items-center justify-center py-24 text-sm text-gray-500">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Loading teams...
              </div>
            ) : userTeamsQuery.isError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-600">
                Unable to load your teams right now.
              </div>
            ) : userTeams.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {userTeams.map((team) => (
                  <button
                    type="button"
                    key={team.id}
                    onClick={() => handleOpenTeamChat(team)}
                    className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-primary/30 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
                          <Hash className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-950">{team.name}</p>
                          <p className="text-xs text-gray-500">{team.visibilityLabel}</p>
                        </div>
                      </div>
                      <ShieldCheck className="size-4 shrink-0 text-brand-primary" />
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-gray-500">{team.description}</p>
                    <div className="mt-4 text-xs font-semibold text-gray-500">
                      {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Hash}
                title="No teams found"
                message="You do not belong to any teams yet."
              />
            )}
          </div>
        </section>
      </div>
    </UserLayout>
  );
}
