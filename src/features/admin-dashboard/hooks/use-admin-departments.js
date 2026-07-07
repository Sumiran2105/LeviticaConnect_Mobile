import { useQuery } from "@tanstack/react-query";

import {
  TEAMS_ADD_MEMBER,
  TEAMS_ADMINS,
  TEAMS_ASSIGN_LEAD,
  TEAMS_CREATE,
  TEAMS_DELETE,
  TEAMS_LIST,
  TEAMS_MEMBERS,
  TEAMS_REMOVE_MEMBER,
  USERS_SEARCH,
} from "@/config/api";
import { apiClient } from "@/lib/client";

export const adminDepartmentQueryKeys = {
  list: (accessToken) => ["admin-departments", accessToken],
  details: (teamId, accessToken) => ["admin-department-details", teamId, accessToken],
  userSearch: (query, accessToken) => ["admin-department-user-search", query, accessToken],
};

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function getArrayPayload(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallback;
}

export function normalizeDepartment(team, index = 0) {
  const name = team?.name || team?.department_name || "Unnamed Department";

  return {
    ...team,
    id: team?.id || team?.team_id || team?.uuid || team?.department_id || `${name}-${index}`,
    name,
    description: team?.description || team?.dept_description || "",
    lead: team?.lead || team?.manager || team?.manager_name || team?.admin || team?.dept_manager || "Unassigned",
    memberCount: team?.member_count || team?.total_users || 0,
  };
}

export async function fetchAdminDepartments(accessToken) {
  const response = await apiClient.get(TEAMS_LIST, {
    headers: authHeaders(accessToken),
  });
  const teamsData = getArrayPayload(response.data, ["departments", "items", "teams"]);

  return teamsData.map(normalizeDepartment);
}

export async function fetchAdminDepartmentDetails({ teamId, accessToken }) {
  const [membersResponse, adminsResponse] = await Promise.all([
    apiClient.get(TEAMS_MEMBERS(teamId), {
      headers: authHeaders(accessToken),
    }),
    apiClient
      .get(TEAMS_ADMINS(teamId), {
        headers: authHeaders(accessToken),
      })
      .catch((error) => {
        console.warn("Error fetching admins:", error);
        return { data: [] };
      }),
  ]);

  const membersData = getArrayPayload(membersResponse.data, ["members", "users", "data", "items"]);
  const adminsData = getArrayPayload(adminsResponse.data, ["admins", "users", "data", "items"]);
  const remoteLead =
    membersResponse.data?.lead ||
    membersResponse.data?.admin ||
    membersResponse.data?.manager ||
    membersResponse.data?.department_admin ||
    null;

  return {
    members: membersData,
    admins: adminsData,
    remoteLead,
  };
}

export async function searchAdminDepartmentUsers({ query, accessToken }) {
  const response = await apiClient.get(USERS_SEARCH, {
    params: { query },
    headers: authHeaders(accessToken),
  });

  return getArrayPayload(response.data, ["users", "data", "items"]);
}

export async function createAdminDepartment({ name, accessToken }) {
  const response = await apiClient.post(TEAMS_CREATE, null, {
    params: { name },
    headers: authHeaders(accessToken),
  });

  return normalizeDepartment(response.data);
}

export async function addAdminDepartmentMember({ teamId, userId, accessToken }) {
  await apiClient.post(TEAMS_ADD_MEMBER(teamId), null, {
    params: { user_id: userId },
    headers: authHeaders(accessToken),
  });
}

export async function assignAdminDepartmentLead({ teamId, userId, accessToken }) {
  await apiClient.post(TEAMS_ASSIGN_LEAD(teamId), null, {
    params: { user_id: userId },
    headers: authHeaders(accessToken),
  });
}

export async function removeAdminDepartmentMember({ teamId, userId, accessToken }) {
  await apiClient.delete(TEAMS_REMOVE_MEMBER(teamId, userId), {
    headers: authHeaders(accessToken),
  });
}

export async function deleteAdminDepartment({ teamId, accessToken }) {
  await apiClient.delete(TEAMS_DELETE(teamId), {
    headers: authHeaders(accessToken),
  });
}

export function useAdminDepartments(accessToken) {
  return useQuery({
    queryKey: adminDepartmentQueryKeys.list(accessToken),
    queryFn: () => fetchAdminDepartments(accessToken),
    enabled: Boolean(accessToken),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminDepartmentDetails({ teamId, accessToken }) {
  return useQuery({
    queryKey: adminDepartmentQueryKeys.details(teamId, accessToken),
    queryFn: () => fetchAdminDepartmentDetails({ teamId, accessToken }),
    enabled: Boolean(teamId && accessToken),
    staleTime: 60 * 1000,
  });
}

export function useAdminDepartmentUserSearch({ query, accessToken, enabled }) {
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: adminDepartmentQueryKeys.userSearch(trimmedQuery, accessToken),
    queryFn: () => searchAdminDepartmentUsers({ query: trimmedQuery, accessToken }),
    enabled: Boolean(enabled && accessToken && trimmedQuery.length >= 2),
    staleTime: 30 * 1000,
  });
}
