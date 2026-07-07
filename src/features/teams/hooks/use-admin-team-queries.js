import {
  CHANNEL_MEMBER,
  CHANNEL_MEMBERS,
  CHANNEL_MEMBERS_BULK,
  CHANNELS_ARCHIVE,
  CHANNELS_CREATE,
  CHANNELS_DELETE,
  CHANNELS_GET,
  CHANNELS_LIST,
  CHANNELS_UNARCHIVE,
  CHANNEL_UPDATE,
  COMPANY_USERS,
  TEAMS_LIST,
  TEAMS_MEMBERS,
  CHANNELS_MY_CHANNELS,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import {
  getChannelId,
  getUserId,
  getUserRecord,
  isDirectChannel,
  normalizeChannel,
} from "@/features/teams/utils/team-utils";

export const adminTeamQueryKeys = {
  departments: (accessToken) => ["admin-team-departments", accessToken],
  channels: (accessToken) => ["admin-team-channels", accessToken],
  channel: (channelId, accessToken) => ["admin-team-channel", channelId, accessToken],
  teamMembers: (teamIds, accessToken) => ["admin-team-members", teamIds, accessToken],
  channelMembers: (channelId, accessToken) => ["admin-channel-members", channelId, accessToken],
};

export function getArrayPayload(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallback;
}

export function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function normalizeTeam(team) {
  return {
    ...team,
    id: team.id || team.team_id || team.uuid || team.department_id,
    name: team.name || team.department_name || "Unnamed Team",
  };
}

export async function fetchAdminTeamDepartments({ accessToken }) {
  const response = await apiClient.get(TEAMS_LIST, { headers: getAuthHeaders(accessToken) });
  return getArrayPayload(response.data, ["departments", "items", "teams"]).map(normalizeTeam);
}

export async function fetchAdminChannels({ accessToken }) {
  const response = await apiClient.get(CHANNELS_MY_CHANNELS, { headers: getAuthHeaders(accessToken) });
  return getArrayPayload(response.data, ["items", "channels"])
    .map(normalizeChannel)
    .filter((channel) => channel.id && !isDirectChannel(channel));
}

export async function createAdminChannel({ payload, selectedUserIds = [], accessToken }) {
  const headers = getAuthHeaders(accessToken);
  const response = await apiClient.post(CHANNELS_CREATE, payload, { headers });
  const newChannel = normalizeChannel({
    ...response.data,
    is_cross_team: payload.is_cross_team,
    settings: {
      ...(response.data?.settings || {}),
      ...(payload.settings || {}),
    },
  });
  const newChannelId = getChannelId(newChannel);

  if (newChannelId && selectedUserIds.length) {
    await apiClient.post(CHANNEL_MEMBERS_BULK(newChannelId), selectedUserIds, { headers });
  }

  return newChannel;
}

export async function addAdminChannelMembers({ channelId, userIds, role, accessToken }) {
  const headers = getAuthHeaders(accessToken);

  if (userIds.length === 1) {
    await apiClient.post(CHANNEL_MEMBERS(channelId), { user_id: userIds[0], role }, { headers });
    return;
  }

  await apiClient.post(CHANNEL_MEMBERS_BULK(channelId), userIds, { headers });
}

export async function removeAdminChannelMember({ channelId, userId, accessToken }) {
  await apiClient.delete(CHANNEL_MEMBER(channelId, userId), { headers: getAuthHeaders(accessToken) });
}

export async function deleteAdminChannel({ channelId, accessToken }) {
  await apiClient.delete(CHANNELS_DELETE(channelId), { headers: getAuthHeaders(accessToken) });
}

export async function fetchAdminChannel({ channelId, accessToken }) {
  const response = await apiClient.get(CHANNELS_GET(channelId), { headers: getAuthHeaders(accessToken) });
  return normalizeChannel(response.data?.channel || response.data || {});
}

export async function updateAdminChannel({ channelId, payload, accessToken }) {
  const response = await apiClient.put(CHANNEL_UPDATE(channelId), payload, {
    headers: getAuthHeaders(accessToken),
  });

  return normalizeChannel({
    ...response.data,
    is_cross_team: payload.is_cross_team,
    settings: {
      ...(response.data?.settings || {}),
      ...(payload.settings || {}),
    },
  });
}

export async function updateAdminChannelArchiveState({ channel, shouldArchive, accessToken }) {
  const channelId = getChannelId(channel);
  const endpoint = shouldArchive ? CHANNELS_ARCHIVE(channelId) : CHANNELS_UNARCHIVE(channelId);
  const response = await apiClient.post(endpoint, null, { headers: getAuthHeaders(accessToken) });
  const responseChannel = response.data?.channel || response.data?.data || response.data || {};

  return normalizeChannel({
    ...channel,
    ...responseChannel,
    is_archived: shouldArchive,
    isArchived: shouldArchive,
    status: shouldArchive ? "archived" : "active",
  });
}

export async function fetchAdminTeamMembers({ teamIds, teams = [], accessToken }) {
  const normalizedTeamIds = Array.from(new Set((teamIds || []).filter(Boolean).map(String)));
  const results = await Promise.allSettled(
    normalizedTeamIds.map(async (teamId) => {
      const response = await apiClient.get(TEAMS_MEMBERS(teamId), {
        headers: getAuthHeaders(accessToken),
      });
      const team = teams.find((item) => String(item.id) === String(teamId));

      return getArrayPayload(response.data, ["members", "items", "users"]).map((member) => ({
        ...member,
        _teamId: teamId,
        _teamName: team?.name || "Team",
      }));
    })
  );
  const seen = new Set();

  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .filter((member) => {
      const userId = getUserId(member);
      if (!userId || seen.has(String(userId))) return false;
      seen.add(String(userId));
      return true;
    });
}

export async function fetchAdminChannelMembersPanel({ channel, accessToken }) {
  const channelId = getChannelId(channel);
  if (!channelId) return [];

  const headers = getAuthHeaders(accessToken);
  const [membersResponse, teamResponse, usersResponse] = await Promise.allSettled([
    apiClient.get(CHANNEL_MEMBERS(channelId), { headers }),
    channel.team_id ? apiClient.get(TEAMS_MEMBERS(channel.team_id), { headers }) : Promise.resolve({ data: [] }),
    apiClient.get(COMPANY_USERS, { headers }),
  ]);

  const memberships = getArrayPayload(membersResponse.value?.data, ["members", "items"]);
  const sameTeamUsers = getArrayPayload(teamResponse.value?.data, ["members", "items", "users"]);
  const companyUsers = getArrayPayload(usersResponse.value?.data, ["users", "items", "results"]);
  const userMap = {};

  [...sameTeamUsers, ...companyUsers].forEach((user) => {
    const userId = getUserId(user);
    if (userId) userMap[userId] = getUserRecord(user);
  });

  return memberships.map((member) => ({
    ...member,
    _user: userMap[getUserId(member)] || null,
  }));
}
