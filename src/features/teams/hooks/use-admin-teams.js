import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { apiClient } from "@/lib/client";
import {
  CHANNEL_UNREAD_COUNT,
} from "@/config/api";
import {
  addAdminChannelMembers,
  adminTeamQueryKeys,
  createAdminChannel,
  deleteAdminChannel,
  fetchAdminChannel,
  fetchAdminChannelMembersPanel,
  fetchAdminChannels,
  fetchAdminTeamMembers,
  fetchAdminTeamDepartments,
  getApiErrorMessage,
  getAuthHeaders,
  removeAdminChannelMember,
  updateAdminChannel,
  updateAdminChannelArchiveState,
} from "@/features/teams/hooks/use-admin-team-queries";
import {
  DEFAULT_VALUES,
  channelSchema,
  getChannelCrossTeamIds,
  getChannelId,
  getTeamCompanyId,
  getUserId,
} from "@/features/teams/utils/team-utils";

export function useAdminTeams({ session }) {
  const queryClient = useQueryClient();
  const token = session?.accessToken;
  const headers = useMemo(() => getAuthHeaders(token), [token]);

  const teamsQuery = useQuery({
    queryKey: adminTeamQueryKeys.departments(token),
    queryFn: () => fetchAdminTeamDepartments({ accessToken: token }),
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });
  const channelsQuery = useQuery({
    queryKey: adminTeamQueryKeys.channels(token),
    queryFn: () => fetchAdminChannels({ accessToken: token }),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });
  const teams = useMemo(() => teamsQuery.data || [], [teamsQuery.data]);
  const channels = useMemo(() => channelsQuery.data || [], [channelsQuery.data]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCreateMemberIds, setSelectedCreateMemberIds] = useState(new Set());

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [memberRole, setMemberRole] = useState("member");
  const [addMemberSource, setAddMemberSource] = useState("team");
  const [addMemberTeamId, setAddMemberTeamId] = useState("");
  const [addMemberError, setAddMemberError] = useState("");

  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [removingMemberIds, setRemovingMemberIds] = useState(new Set());

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});

  const form = useForm({
    resolver: zodResolver(channelSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { reset, setValue, watch } = form;
  const selectedTeamId = watch("team_id");
  const createIsCrossTeam = watch("is_cross_team");
  const watchedCreateCrossTeamIds = watch("settings.cross_functional_team_ids");
  const createCrossTeamIds = useMemo(
    () => (Array.isArray(watchedCreateCrossTeamIds) ? watchedCreateCrossTeamIds : []),
    [watchedCreateCrossTeamIds]
  );
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const selectedChannel = useMemo(
    () =>
      channels.find((channel) => String(getChannelId(channel)) === String(selectedChannelId)) ||
      channels[0] ||
      null,
    [channels, selectedChannelId]
  );
  const unreadCountQueries = useQueries({
    queries: channels.map((channel) => ({
      queryKey: ["channel-unread-count", channel.id],
      queryFn: async () => {
        try {
          const response = await apiClient.get(CHANNEL_UNREAD_COUNT(channel.id), {
            headers,
            suppressGlobalErrorReport: true,
          });
          return response.data?.unread_messages ?? 0;
        } catch {
          return 0;
        }
      },
      enabled: Boolean(token && channel.id),
      retry: false,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const visibleChannels = useMemo(() => {
    return channels
      .map((channel, index) => ({
        ...channel,
        unreadCount: unreadCountQueries[index]?.data ?? channel.unreadCount ?? 0,
      }))
      .sort((first, second) => {
        const unreadDelta = Number(second.unreadCount || 0) - Number(first.unreadCount || 0);
        if (unreadDelta !== 0) return unreadDelta;

        const firstTime = new Date(first.last_message_at || first.updated_at || first.created_at || 0).getTime();
        const secondTime = new Date(second.last_message_at || second.updated_at || second.created_at || 0).getTime();

        return (Number.isNaN(secondTime) ? 0 : secondTime) - (Number.isNaN(firstTime) ? 0 : firstTime);
      });
  }, [channels, unreadCountQueries]);

  useEffect(() => {
    if (!channels.length) {
      setSelectedChannelId(null);
      return;
    }

    if (!selectedChannelId || !channels.some((channel) => String(getChannelId(channel)) === String(selectedChannelId))) {
      setSelectedChannelId(getChannelId(channels[0]) || null);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (teamsQuery.error) {
      console.error("Error fetching teams:", teamsQuery.error);
      toast.error("Failed to load teams.");
    }
  }, [teamsQuery.error]);

  useEffect(() => {
    if (channelsQuery.error) {
      console.error("Error fetching channels:", channelsQuery.error);
      toast.error("Failed to load channels.");
    }
  }, [channelsQuery.error]);

  const createChannelMutation = useMutation({
    mutationFn: ({ payload, selectedUserIds }) =>
      createAdminChannel({ payload, selectedUserIds, accessToken: token }),
  });
  const addMembersMutation = useMutation({
    mutationFn: ({ channelId, userIds, role }) =>
      addAdminChannelMembers({ channelId, userIds, role, accessToken: token }),
  });
  const deleteChannelMutation = useMutation({
    mutationFn: ({ channelId }) => deleteAdminChannel({ channelId, accessToken: token }),
  });
  const updateChannelMutation = useMutation({
    mutationFn: ({ channelId, payload }) => updateAdminChannel({ channelId, payload, accessToken: token }),
  });
  const archiveChannelMutation = useMutation({
    mutationFn: ({ channel, shouldArchive }) =>
      updateAdminChannelArchiveState({ channel, shouldArchive, accessToken: token }),
  });
  const removeMemberMutation = useMutation({
    mutationFn: ({ channelId, userId }) => removeAdminChannelMember({ channelId, userId, accessToken: token }),
  });

  const invalidateChannels = async () => {
    await queryClient.invalidateQueries({ queryKey: adminTeamQueryKeys.channels(token) });
  };

  const getAllowedCrossTeamIds = (channel = selectedChannel) => {
    const storedTeamIds = getChannelCrossTeamIds(channel);

    if (storedTeamIds.length) return storedTeamIds;
    if (!channel?.is_cross_team) return [];

    return teams
      .filter((team) => String(team.id) !== String(channel?.team_id || ""))
      .map((team) => String(team.id));
  };
  const createMemberTeamIds = useMemo(() => {
    if (!isCreateOpen || !selectedTeamId) return [];

    return Array.from(
      new Set([selectedTeamId, ...(createIsCrossTeam ? createCrossTeamIds : [])].filter(Boolean).map(String))
    );
  }, [createCrossTeamIds, createIsCrossTeam, isCreateOpen, selectedTeamId]);
  const createTeamMembersQuery = useQuery({
    queryKey: adminTeamQueryKeys.teamMembers(createMemberTeamIds, token),
    queryFn: () => fetchAdminTeamMembers({ teamIds: createMemberTeamIds, teams, accessToken: token }),
    enabled: Boolean(token && createMemberTeamIds.length),
    staleTime: 60 * 1000,
  });
  const addMemberTeamIds = useMemo(() => {
    if (!isAddMemberOpen || !addMemberTeamId) return [];
    return [addMemberTeamId];
  }, [addMemberTeamId, isAddMemberOpen]);
  const teamMembersQuery = useQuery({
    queryKey: adminTeamQueryKeys.teamMembers(addMemberTeamIds, token),
    queryFn: () => fetchAdminTeamMembers({ teamIds: addMemberTeamIds, teams, accessToken: token }),
    enabled: Boolean(token && isAddMemberOpen && addMemberTeamIds.length),
    staleTime: 60 * 1000,
  });
  const channelMembersQuery = useQuery({
    queryKey: adminTeamQueryKeys.channelMembers(getChannelId(selectedChannel), token),
    queryFn: () => fetchAdminChannelMembersPanel({ channel: selectedChannel, accessToken: token }),
    enabled: Boolean(token && isMembersOpen && getChannelId(selectedChannel)),
    staleTime: 30 * 1000,
  });
  const createTeamMembers = useMemo(() => createTeamMembersQuery.data || [], [createTeamMembersQuery.data]);
  const teamMembers = useMemo(() => teamMembersQuery.data || [], [teamMembersQuery.data]);
  const channelMembers = useMemo(() => channelMembersQuery.data || [], [channelMembersQuery.data]);

  useEffect(() => {
    const companyId = session?.company_id || getTeamCompanyId(selectedTeam);
    if (companyId) {
      setValue("company_id", companyId, { shouldValidate: true });
    }
  }, [selectedTeam, session?.company_id, setValue]);

  useEffect(() => {
    if (!isCreateOpen) return;

    reset({
      ...DEFAULT_VALUES,
      company_id: session?.company_id || "",
      team_id: "",
    });
    setSelectedCreateMemberIds(new Set());
  }, [isCreateOpen, reset, session?.company_id, teams]);

  useEffect(() => {
    if (!isCreateOpen || createIsCrossTeam) return;

    setValue("settings.cross_functional_team_ids", [], { shouldValidate: true });
  }, [createIsCrossTeam, isCreateOpen, setValue]);

  useEffect(() => {
    if (!isCreateOpen) return;

    setSelectedCreateMemberIds((current) => {
      const availableIds = new Set(createTeamMembers.map((member) => String(getUserId(member))).filter(Boolean));
      const next = new Set(Array.from(current).filter((id) => availableIds.has(String(id))));
      return next.size === current.size ? current : next;
    });
  }, [createTeamMembers, isCreateOpen]);

  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (fieldName !== "name") return;

      const slug = String(value.name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      setValue("slug", slug);
    });

    return () => subscription.unsubscribe();
  }, [form, setValue]);

  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (fieldName === "visibility") {
        setValue("is_private", value.visibility === "private");
      }
    });

    return () => subscription.unsubscribe();
  }, [form, setValue]);

  useEffect(() => {
    if (!isAddMemberOpen) return;

    setSelectedMemberIds((current) => {
      const availableIds = new Set(teamMembers.map((member) => String(getUserId(member))).filter(Boolean));
      const next = new Set(Array.from(current).filter((id) => availableIds.has(String(id))));
      return next.size === current.size ? current : next;
    });
  }, [isAddMemberOpen, teamMembers]);

  useEffect(() => {
    if (channelMembersQuery.error) {
      toast.error(getApiErrorMessage(channelMembersQuery.error, "Failed to load channel members."));
    }
  }, [channelMembersQuery.error]);

  const handleCreateChannel = async (data) => {
    try {
      const trimmedName = data.name?.trim() || "";
      const isDuplicate = channels.some(
        (channel) => channel.name?.toLowerCase().trim() === trimmedName.toLowerCase()
      );

      if (isDuplicate) {
        toast.error(`A team named "${trimmedName}" already exists.`);
        return;
      }

      const selectedUserIds = Array.from(selectedCreateMemberIds).filter(
        (userId) => String(userId) !== String(session?.userId || session?.user_id || "")
      );
      const payload = {
        ...data,
        is_private: data.visibility === "private",
        settings: {
          ...data.settings,
          cross_functional_team_ids: data.is_cross_team
            ? data.settings?.cross_functional_team_ids || []
            : [],
        },
        parent_channel_id: data.parent_channel_id || null,
      };

      const newChannel = await createChannelMutation.mutateAsync({
        payload,
        selectedUserIds,
      });
      const newChannelId = getChannelId(newChannel);

      queryClient.setQueryData(adminTeamQueryKeys.channels(token), (current = []) => [...current, newChannel]);
      setSelectedChannelId(newChannelId || null);
      await invalidateChannels();
      setSelectedCreateMemberIds(new Set());
      setIsCreateOpen(false);
      toast.success("Channel created successfully.");
    } catch (error) {
      console.error("Error creating channel:", error);
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Failed to create channel.");
    }
  };

  const handleInvalidCreate = (errors) => {
    toast.error(
      errors.team_id?.message ||
        errors.company_id?.message ||
        errors.name?.message ||
        errors.slug?.message ||
        "Please fill all required channel details."
    );
  };

  const toggleCreateMemberSelection = (userId) => {
    setSelectedCreateMemberIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const openAddMemberDialog = async (source = "team") => {
    if (!selectedChannel) return;

    const crossTeamIds = getAllowedCrossTeamIds(selectedChannel);
    if (source === "other" && !selectedChannel.is_cross_team) {
      toast.error("Enable cross-functional access before adding users from other teams.");
      return;
    }

    if (source === "other" && crossTeamIds.length === 0) {
      toast.error("Add at least one cross-functional team in channel settings first.");
      return;
    }

    setAddMemberError("");
    setMemberSearchQuery("");
    setSelectedMemberIds(new Set());
    setMemberRole("member");
    setAddMemberSource(source);
    setAddMemberTeamId(source === "other" ? crossTeamIds[0] || "" : selectedChannel.team_id || "");
    setIsAddMemberOpen(true);

    if (source === "team" && !selectedChannel.team_id) {
      setAddMemberError("This channel is not linked to a team.");
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAddMembers = async () => {
    const channelId = getChannelId(selectedChannel);
    const userIds = Array.from(selectedMemberIds);
    if (!channelId || userIds.length === 0) return;

    setAddMemberError("");

    try {
      await addMembersMutation.mutateAsync({ channelId, userIds, role: memberRole });
      await invalidateChannels();
      setIsAddMemberOpen(false);
      setSelectedMemberIds(new Set());
      toast.success(userIds.length === 1 ? "Member added." : `${userIds.length} members added.`);
    } catch (error) {
      console.error("Error adding members:", error);
      const detail = error.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item?.msg || JSON.stringify(item)).join("; ")
        : detail || error.response?.data?.message || "Failed to add members.";
      setAddMemberError(message);
    }
  };

  const removeMemberFromChannel = async (member) => {
    const channelId = getChannelId(selectedChannel);
    const userId = getUserId(member);

    if (!channelId || !userId) {
      toast.error("Unable to remove this member because the member id is missing.");
      return false;
    }

    if (!window.confirm("Remove this member from the team?")) {
      return false;
    }

    setRemovingMemberIds((current) => new Set(current).add(String(userId)));

    try {
      await removeMemberMutation.mutateAsync({ channelId, userId });
      queryClient.setQueryData(adminTeamQueryKeys.channelMembers(channelId, token), (current = []) =>
        current.filter((channelMember) => String(getUserId(channelMember)) !== String(userId))
      );
      queryClient.setQueryData(adminTeamQueryKeys.channels(token), (current = []) =>
        current.map((channel) => {
          if (String(getChannelId(channel)) !== String(channelId)) {
            return channel;
          }

          const nextCount = Math.max(Number(channel.memberCount || channel.member_count || channel.members_count || 1) - 1, 0);

          return {
            ...channel,
            memberCount: nextCount,
            member_count: nextCount,
            members_count: nextCount,
          };
        })
      );
      await Promise.all([
        invalidateChannels(),
        queryClient.invalidateQueries({ queryKey: adminTeamQueryKeys.channelMembers(channelId, token) }),
      ]);

      toast.success("Member removed from team.");
      return true;
    } catch (error) {
      console.error("Error removing channel member:", error);
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Failed to remove member.");
      return false;
    } finally {
      setRemovingMemberIds((current) => {
        const next = new Set(current);
        next.delete(String(userId));
        return next;
      });
    }
  };

  const openMembersPanel = async () => {
    const channelId = getChannelId(selectedChannel);
    if (!channelId) return;

    setIsMembersOpen(true);
    queryClient.invalidateQueries({ queryKey: adminTeamQueryKeys.channelMembers(channelId, token) });
  };

  const handleDeleteChannel = async () => {
    const channelId = getChannelId(selectedChannel);
    if (!channelId) {
      toast.error("Unable to delete this channel because its id is missing.");
      return;
    }

    try {
      await deleteChannelMutation.mutateAsync({ channelId });
      const nextChannels = channels.filter((channel) => getChannelId(channel) !== channelId);
      queryClient.setQueryData(adminTeamQueryKeys.channels(token), nextChannels);
      setSelectedChannelId(nextChannels[0] ? getChannelId(nextChannels[0]) : null);
      await invalidateChannels();
      setIsDeleteOpen(false);
      toast.success("Channel deleted.");
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Failed to delete channel.");
    }
  };

  const openSettings = async () => {
    if (!selectedChannel) return;

    let channelForSettings = selectedChannel;
    const channelId = getChannelId(selectedChannel);

    if (channelId) {
      try {
        channelForSettings = {
          ...selectedChannel,
          ...(await fetchAdminChannel({ channelId, accessToken: token })),
        };
        queryClient.setQueryData(adminTeamQueryKeys.channels(token), (current = []) =>
          current.map((channel) => (getChannelId(channel) === channelId ? { ...channel, ...channelForSettings } : channel))
        );
      } catch (error) {
        console.error("Error loading channel details:", error);
        toast.error("Using current channel details because the latest settings could not be loaded.");
      }
    }

    setSettingsForm({
      name: channelForSettings.name || "",
      description: channelForSettings.description || "",
      topic: channelForSettings.topic || "",
      purpose: channelForSettings.purpose || "",
      visibility: channelForSettings.is_private ? "private" : "public",
      is_cross_team: Boolean(channelForSettings.is_cross_team),
      is_discoverable: channelForSettings.is_discoverable ?? true,
      max_members: channelForSettings.max_members || 100,
      message_retention_days: channelForSettings.message_retention_days || 365,
      settings: {
        ...(channelForSettings.settings || {}),
        cross_functional_team_ids: getChannelCrossTeamIds(channelForSettings),
      },
    });
    setIsSettingsOpen(true);
  };

  const handleUpdateChannel = async () => {
    const channelId = getChannelId(selectedChannel);
    if (!channelId) return;

    try {
      const payload = {
        ...settingsForm,
        is_private: settingsForm.visibility === "private",
        settings: {
          ...(settingsForm.settings || {}),
          cross_functional_team_ids: settingsForm.is_cross_team
            ? settingsForm.settings?.cross_functional_team_ids || []
            : [],
        },
      };
      const updatedChannel = await updateChannelMutation.mutateAsync({ channelId, payload });
      queryClient.setQueryData(adminTeamQueryKeys.channels(token), (current = []) =>
        current.map((channel) =>
          getChannelId(channel) === channelId ? { ...channel, ...updatedChannel } : channel
        )
      );
      await invalidateChannels();
      setIsSettingsOpen(false);
      toast.success("Channel settings saved.");
    } catch (error) {
      console.error("Error updating channel:", error);
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Failed to save settings.");
    }
  };

  const updateChannelArchiveState = async (shouldArchive) => {
    const channelId = getChannelId(selectedChannel);
    if (!channelId) return;

    try {
      const updatedChannel = await archiveChannelMutation.mutateAsync({
        channel: selectedChannel,
        shouldArchive,
      });
      queryClient.setQueryData(adminTeamQueryKeys.channels(token), (current = []) =>
        current.map((channel) =>
          getChannelId(channel) === channelId ? { ...channel, ...updatedChannel } : channel
        )
      );
      await invalidateChannels();
      setIsSettingsOpen(false);
      toast.success(shouldArchive ? "Channel archived." : "Channel unarchived.");
    } catch (error) {
      console.error("Error updating archive status:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          (shouldArchive ? "Failed to archive channel." : "Failed to unarchive channel.")
      );
    }
  };

  return {
    channelState: {
      channels: visibleChannels,
      selectedChannel,
      isLoading: channelsQuery.isLoading,
      error: channelsQuery.error ? "Unable to load workspace channels." : "",
    },
    sidebarState: {
      isSidebarOpen,
      setIsSidebarOpen,
      createDialog: {
        open: isCreateOpen,
        onOpenChange: setIsCreateOpen,
        teams,
        form,
        createTeamMembers,
        isFetchingCreateMembers: createTeamMembersQuery.isLoading || createTeamMembersQuery.isFetching,
        selectedCreateMemberIds,
        toggleCreateMemberSelection,
        onSubmit: handleCreateChannel,
        onInvalidSubmit: handleInvalidCreate,
      },
    },
    memberDialog: {
      open: isAddMemberOpen,
      onOpenChange: setIsAddMemberOpen,
      teamMembers,
      isFetchingTeamMembers: teamMembersQuery.isLoading || teamMembersQuery.isFetching,
      memberSearchQuery,
      setMemberSearchQuery,
      selectedMemberIds,
      memberRole,
      setMemberRole,
      addMemberSource,
      addMemberTeamId,
      setAddMemberTeamId,
      allowedCrossTeamIds: getAllowedCrossTeamIds(selectedChannel),
      teams,
      isAddingMember: addMembersMutation.isPending,
      addMemberError: addMemberError || (teamMembersQuery.error ? getApiErrorMessage(teamMembersQuery.error, "Failed to load team members.") : ""),
      toggleMemberSelection,
      handleAddMembers,
    },
    membersDialog: {
      open: isMembersOpen,
      onOpenChange: setIsMembersOpen,
      channelMembers,
      isFetchingChannelMembers: channelMembersQuery.isLoading || channelMembersQuery.isFetching,
      removingMemberIds,
      onRemoveMember: removeMemberFromChannel,
    },
    deleteDialog: {
      open: isDeleteOpen,
      onOpenChange: setIsDeleteOpen,
      isDeletingChannel: deleteChannelMutation.isPending,
      onDelete: handleDeleteChannel,
    },
    settingsDialog: {
      open: isSettingsOpen,
      onOpenChange: setIsSettingsOpen,
      settingsForm,
      setSettingsForm,
      teams,
      isSavingSettings: updateChannelMutation.isPending,
      isArchivingChannel: archiveChannelMutation.isPending,
      onSave: handleUpdateChannel,
      onArchive: () => updateChannelArchiveState(true),
      onUnarchive: () => updateChannelArchiveState(false),
    },
    actions: {
      setSelectedChannel: (channel) => setSelectedChannelId(getChannelId(channel) || null),
      openAddMemberDialog,
      openMembersPanel,
      removeMemberFromChannel,
      openSettings,
    },
  };
}
