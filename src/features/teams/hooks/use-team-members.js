import { useEffect, useState } from "react";
import { CHANNEL_MEMBERS, COMPANY_USERS, TEAMS_LIST, TEAMS_MEMBERS } from "@/config/api";
import { apiClient } from "@/lib/client";
import { getUserName, getUserEmail, getUserId, getUserAvatar, getUserRecord } from "@/features/teams/utils/team-utils";

function getArrayPayload(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
}

function getTeamName(record) {
  const user = getUserRecord(record);

  return (
    record?.team_name ||
    record?.teamName ||
    record?.department_name ||
    record?.departmentName ||
    user?.team_name ||
    user?.teamName ||
    user?.department_name ||
    user?.departmentName ||
    ""
  );
}

/**
 * Normalize member data to ensure consistent structure
 * Extracts name, email, id, and avatar from various API response formats
 */
function normalizeMember(member, userMap = {}, teamMap = {}, index) {
  const id = getUserId(member);
  
  // First try to get enriched user data from the map
  const enrichedUserData = userMap[id];
  const profile = enrichedUserData || member;
  
  const name = getUserName(profile, id);
  const email = getUserEmail(profile);
  const avatar = getUserAvatar(profile);

  return {
    id: id || `member-${index}`,
    name: name || "Unknown User",
    full_name: profile.full_name || profile.fullName || name || "Unknown User",
    email,
    avatar,
    role: member.role || profile.role || "Member",
    teamName: teamMap[id] || getTeamName(profile) || getTeamName(member) || "",
    raw: member, // Keep original data for reference
  };
}

/**
 * Hook to fetch and normalize channel members for mention suggestions
 */
export function useTeamMembers(channelId, options = {}) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const accessToken = options.accessToken;
  const includeCompanyUsers = Boolean(options.includeCompanyUsers);

  useEffect(() => {
    if (!channelId || !accessToken) {
      setMembers([]);
      setError(null);
      return;
    }

    const fetchMembers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
        };

        // Fetch channel members and team membership metadata. Company-wide user
        // enrichment is admin-only, so keep it opt-in to avoid 403 noise for users.
        const [membersResponse, usersResponse, teamsResponse] = await Promise.allSettled([
          apiClient.get(CHANNEL_MEMBERS(channelId), { headers }),
          includeCompanyUsers
            ? apiClient.get(COMPANY_USERS, { headers, suppressGlobalErrorReport: true })
            : Promise.resolve({ data: [] }),
          apiClient.get(TEAMS_LIST, { headers }),
        ]);

        // Extract members list from response
        let membersList = [];
        if (membersResponse.status === "fulfilled") {
          const data = membersResponse.value.data;
          if (Array.isArray(data)) {
            membersList = data;
          } else if (Array.isArray(data?.members)) {
            membersList = data.members;
          } else if (Array.isArray(data?.data)) {
            membersList = data.data;
          } else if (data?.data?.members && Array.isArray(data.data.members)) {
            membersList = data.data.members;
          }
        }

        // Build user map from company users for enrichment
        const userMap = {};
        const teamMap = {};
        if (usersResponse.status === "fulfilled") {
          const companyUsers = getArrayPayload(usersResponse.value.data, ["users", "items", "results"]);
          
          companyUsers.forEach((user) => {
            const userId = getUserId(user);
            if (userId) {
              userMap[userId] = getUserRecord(user);
              const teamName = getTeamName(user);
              if (teamName) teamMap[userId] = teamName;
            }
          });
        }

        if (teamsResponse.status === "fulfilled") {
          const teams = getArrayPayload(teamsResponse.value.data, ["departments", "items", "teams"]);
          const teamMemberResults = await Promise.allSettled(
            teams.map(async (team) => {
              const teamId = team.id || team.team_id || team.uuid || team.department_id;
              if (!teamId) return [];

              const response = await apiClient.get(TEAMS_MEMBERS(teamId), { headers });
              const teamName = team.name || team.department_name || "Team";

              return getArrayPayload(response.data, ["members", "items", "users"]).map((member) => ({
                member,
                teamName,
              }));
            })
          );

          teamMemberResults
            .filter((result) => result.status === "fulfilled")
            .flatMap((result) => result.value)
            .forEach(({ member, teamName }) => {
              const userId = getUserId(member);
              if (userId && teamName) teamMap[userId] = teamName;
            });
        }

        // Normalize each member with enriched user data
        const normalizedMembers = membersList.map((member, index) =>
          normalizeMember(member, userMap, teamMap, index)
        );
        
        setMembers(normalizedMembers);
      } catch (err) {
        console.error("Failed to fetch channel members:", err);
        setError(err.message || "Failed to fetch channel members");
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [channelId, accessToken, includeCompanyUsers]);

  return {
    members,
    isLoading,
    error,
  };
}
