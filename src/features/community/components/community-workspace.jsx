import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Image,
  Link,
  LoaderCircle,
  Megaphone,
  MessageSquareText,
  Plus,
  Search,
  Trash2,
  Users,
  MoreVertical,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion as Motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COMMUNITIES_CREATE,
  COMMUNITIES_LIST,
  COMMUNITY_APPROVE_POST,
  COMMUNITY_JOIN,
  COMMUNITY_PENDING_POSTS,
  COMMUNITY_POSTS,
  COMMUNITY_REJECT_POST,
  USER_PROFILE,
  COMMUNITY_MEMBERS,
  COMMUNITY_ADD_MEMBER,
  COMMUNITY_REMOVE_MEMBER,
  DM_USERS_SEARCH,
  COMMUNITY_REMOVE_POST,
  COMMUNITY_EDIT_POST,
  COMMUNITY_PIN_POST,
  COMMUNITY_UNPIN_POST,
  COMMUNITY_ADD_REACTION,
  COMMUNITY_DELETE_REACTION,
  COMMUNITY_PENDING_USERS,
  COMMUNITY_APPROVE_JOIN,
  COMMUNITY_REJECT_JOIN,
  COMMUNITY_DELETE,
  COMMUNITY_WEBSOCKET,
  COMPANY_PENDING_USERS,
} from "@/config/api";

import { AdminLayout } from "@/layouts/admin-layout";
import { UserLayout } from "@/layouts/user-layout";
import { LinkifiedText } from "@/components/linkified-text";
import { apiClient } from "@/lib/client";
import { createRealtimeSocket } from "@/lib/realtime-socket";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  containerVariants,
  formatDate,
  getCommunityMemberEmail,
  getCommunityMemberName,
  getCommunityMemberUserId,
  getInitials,
  getPinnedAnnouncementCopy,
  getUserId,
  itemVariants,
  normalizeList,
  normalizePendingJoinRequests,
  normalizePendingPostApprovals,
} from "@/lib/community-utils";
import { CommunityDialogs } from "./community-dialogs";
import { PostReplies } from "./post-replies";

function CommunityShell({ layout, children }) {
  const Layout = layout === "admin" ? AdminLayout : UserLayout;

  return (
    <Layout
      contentClassName="lg:!p-0 lg:!overflow-hidden overflow-y-auto lg:h-[calc(100dvh-5rem)] pb-5 sm:pb-8 lg:pb-0"
      contentInnerClassName="lg:!m-0 lg:h-full flex flex-col min-h-0 !w-full !max-w-none"
      showFloatingActions={false}
    >
      {children}
    </Layout>
  );
}

export function CommunityWorkspace({ layout = "user" }) {
  const queryClient = useQueryClient();
  const isAdmin = layout === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [postContent, setPostContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const searchInputRef = useRef(null);
  const communityNameInputRef = useRef(null);

  const session = useAuthStore((state) => state.session);
  const [activeTab, setActiveTab] = useState("posts");
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMemberUser, setSelectedMemberUser] = useState(null);
  const [addMemberError, setAddMemberError] = useState("");
  const [editingPostId, setEditingPostId] = useState("");
  const [editingPostContent, setEditingPostContent] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteCommunityModalOpen, setIsDeleteCommunityModalOpen] = useState(false);
  const [deleteCommunityConfirmChecked, setDeleteCommunityConfirmChecked] = useState(false);
  const [deleteCommunityNameInput, setDeleteCommunityNameInput] = useState("");
  const [expandedReplyPostId, setExpandedReplyPostId] = useState(null);

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await apiClient.get(USER_PROFILE);
      return response.data;
    },
    enabled: !!session?.accessToken,
  });

  const communitiesQuery = useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const response = await apiClient.get(COMMUNITIES_LIST);
      return normalizeList(response.data);
    },
    staleTime: 30 * 1000,
  });

  const communities = useMemo(() => normalizeList(communitiesQuery.data), [communitiesQuery.data]);
  const selectedCommunity = useMemo(() => {
    if (!communities.length) return null;
    return communities.find((community) => String(community.id) === String(selectedCommunityId)) || communities[0];
  }, [communities, selectedCommunityId]);

  const activeCommunityId = selectedCommunity?.id;

  const postsQuery = useQuery({
    queryKey: ["community-posts", activeCommunityId],
    queryFn: async () => {
      const response = await apiClient.get(COMMUNITY_POSTS(activeCommunityId));
      return normalizeList(response.data);
    },
    enabled: Boolean(activeCommunityId),
    retry: false,
    staleTime: 15 * 1000,
  });

  const accessDenied = postsQuery.error?.response?.status === 403;

  const membersQuery = useQuery({
    queryKey: ["community-members", activeCommunityId],
    queryFn: async () => {
      const response = await apiClient.get(COMMUNITY_MEMBERS(activeCommunityId));
      return normalizeList(response.data);
    },
    enabled: Boolean(activeCommunityId) && !accessDenied,
    staleTime: 30 * 1000,
  });

  const communityMembers = useMemo(() => normalizeList(membersQuery.data), [membersQuery.data]);

  const memberSearchQueryResult = useQuery({
    queryKey: ["community-member-user-search", memberSearchQuery],
    queryFn: async () => {
      const response = await apiClient.get(DM_USERS_SEARCH, {
        params: { query: memberSearchQuery.trim() },
      });
      return normalizeList(response.data);
    },
    enabled: isAddMemberModalOpen && memberSearchQuery.trim().length >= 2,
    staleTime: 30 * 1000,
  });

  const companyPendingUsersQuery = useQuery({
    queryKey: ["company-pending-users-for-filter"],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_PENDING_USERS, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const raw = response.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.users)
          ? raw.users
          : Array.isArray(raw?.pending_users)
            ? raw.pending_users
            : Array.isArray(raw?.data)
              ? raw.data
              : [];
      return new Set(list.map((u) => (u.email || "").toLowerCase()).filter(Boolean));
    },
    enabled: isAddMemberModalOpen && Boolean(session?.accessToken),
    staleTime: 30 * 1000,
  });

  const memberSearchResults = useMemo(() => {
    if (memberSearchQuery.trim().length < 2) return [];
    const pendingCompanyEmails = companyPendingUsersQuery.data || new Set();

    const currentMemberIds = new Set(
      communityMembers
        .map((member) => String(getCommunityMemberUserId(member) || ""))
        .filter(Boolean)
    );

    return normalizeList(memberSearchQueryResult.data).filter((user) => {
      const userId = getUserId(user);
      if (!userId || currentMemberIds.has(String(userId))) return false;
      // Exclude company-pending users
      const email = (user.email || "").toLowerCase();
      if (email && pendingCompanyEmails.has(email)) return false;
      return true;
    });
  }, [communityMembers, companyPendingUsersQuery.data, memberSearchQuery, memberSearchQueryResult.data]);

  useEffect(() => {
    if (!activeCommunityId) return undefined;

    const realtime = createRealtimeSocket(COMMUNITY_WEBSOCKET(activeCommunityId), {
      heartbeatMessage: JSON.stringify({ event: "heartbeat", community_id: activeCommunityId }),
      onMessage: (event) => {
        let payload;

        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }

        const eventsThatRefreshPosts = new Set([
          "community_post_created",
          "community_post_approved",
          "community_post_pinned",
          "community_post_unpinned",
          "community_post_deleted",
          "community_post_updated",
        ]);

        if (eventsThatRefreshPosts.has(payload?.event)) {
          queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
        }

        if (payload?.event === "community_post_pending") {
          queryClient.invalidateQueries({ queryKey: ["community-post-approvals", activeCommunityId] });
        }

        if (payload?.event === "community_join_requested") {
          queryClient.invalidateQueries({ queryKey: ["community-pending-users", activeCommunityId] });
        }

        if (payload?.event === "community_member_added" || payload?.event === "community_member_removed") {
          queryClient.invalidateQueries({ queryKey: ["community-members", activeCommunityId] });
          queryClient.invalidateQueries({ queryKey: ["communities"] });
        }
      },
    });

    return () => realtime.close();
  }, [activeCommunityId, queryClient]);

  const approvalsQuery = useQuery({
    queryKey: ["community-post-approvals", activeCommunityId],
    queryFn: async () => {
      const response = await apiClient.get(COMMUNITY_PENDING_POSTS(activeCommunityId));
      return normalizePendingPostApprovals(response.data);
    },
    enabled: isAdmin && Boolean(activeCommunityId),
    refetchInterval: 45 * 1000,
    staleTime: 0,
  });

  const pendingUsersQuery = useQuery({
    queryKey: ["community-pending-users", activeCommunityId],
    queryFn: async () => {
      const response = await apiClient.get(COMMUNITY_PENDING_USERS(activeCommunityId));
      return normalizePendingJoinRequests(response.data);
    },
    enabled: isAdmin && Boolean(activeCommunityId),
    refetchInterval: 45 * 1000,
    staleTime: 0,
  });

  const pendingUsers = useMemo(
    () => normalizePendingJoinRequests(pendingUsersQuery.data),
    [pendingUsersQuery.data]
  );

  const createCommunityMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(COMMUNITIES_CREATE, {
        name: communityName.trim(),
        description: communityDescription.trim(),
      });
      return response.data;
    },
    onSuccess: (community) => {
      toast.success("Community created.");
      setCommunityName("");
      setCommunityDescription("");
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      if (community?.id) setSelectedCommunityId(String(community.id));
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not create community.");
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (communityId) => {
      const response = await apiClient.post(COMMUNITY_JOIN(communityId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Join request sent to the community admin.");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not request access.");
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(COMMUNITY_POSTS(activeCommunityId), {
        content: postContent.trim(),
        media_url: mediaUrl.trim() || null,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const status = data?.status;
      toast.success(
        status === "pending_approval"
          ? "Post sent for admin approval."
          : "Post published to the community."
      );
      setPostContent("");
      setMediaUrl("");
      setIsCreatePostModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
      queryClient.invalidateQueries({ queryKey: ["community-post-approvals", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not submit the post.");
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (targetUserId) => {
      if (!targetUserId) {
        throw new Error("Select a user to add.");
      }

      const response = await apiClient.post(COMMUNITY_ADD_MEMBER(activeCommunityId, targetUserId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Member added successfully.");
      setMemberSearchQuery("");
      setSelectedMemberUser(null);
      setAddMemberError("");
      setIsAddMemberModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community-members", activeCommunityId] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (error) => {
      const message = error?.response?.data?.detail || error?.message || "Could not add member.";
      setAddMemberError(message);
      toast.error(message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (targetUserId) => {
      const response = await apiClient.delete(COMMUNITY_REMOVE_MEMBER(activeCommunityId, targetUserId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Member removed from community.");
      queryClient.invalidateQueries({ queryKey: ["community-members", activeCommunityId] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not remove member.");
    },
  });

  const removePostMutation = useMutation({
    mutationFn: async (postId) => {
      const response = await apiClient.delete(COMMUNITY_REMOVE_POST(postId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Post removed successfully.");
      setIsDeleteModalOpen(false);
      setDeletingPostId("");
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not remove post.");
    },
  });

  const editPostMutation = useMutation({
    mutationFn: async ({ postId, content }) => {
      const response = await apiClient.put(COMMUNITY_EDIT_POST(postId), { content });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Post updated successfully.");
      setIsEditModalOpen(false);
      setEditingPostId("");
      setEditingPostContent("");
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not update post.");
    },
  });

  const pinPostMutation = useMutation({
    mutationFn: async (postId) => {
      const response = await apiClient.post(COMMUNITY_PIN_POST(postId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Post pinned successfully.");
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not pin post.");
    },
  });

  const unpinPostMutation = useMutation({
    mutationFn: async (postId) => {
      const response = await apiClient.post(COMMUNITY_UNPIN_POST(postId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Post unpinned successfully.");
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not unpin post.");
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ postId, emoji }) => {
      const response = await apiClient.post(COMMUNITY_ADD_REACTION(postId), { emoji });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not add reaction.");
    },
  });

  const deleteReactionMutation = useMutation({
    mutationFn: async ({ reactionId }) => {
      const response = await apiClient.delete(COMMUNITY_DELETE_REACTION(reactionId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not remove reaction.");
    },
  });

  const handleReactionToggle = (post, emoji) => {
    const reaction = post.reactions?.find((r) => r.emoji === emoji);
    if (reaction?.reacted) {
      deleteReactionMutation.mutate({ reactionId: reaction.reaction_id });
    } else {
      addReactionMutation.mutate({ postId: post.id, emoji });
    }
  };

  const approveMutation = useMutation({
    mutationFn: async (approvalId) => {
      const response = await apiClient.post(COMMUNITY_APPROVE_POST(approvalId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Community post approved.");
      queryClient.invalidateQueries({ queryKey: ["community-post-approvals", activeCommunityId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not approve post.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (approvalId) => {
      const response = await apiClient.post(COMMUNITY_REJECT_POST(approvalId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Community post rejected.");
      queryClient.invalidateQueries({ queryKey: ["community-post-approvals", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not reject post.");
    },
  });

  const approveJoinMutation = useMutation({
    mutationFn: async (requestId) => {
      const response = await apiClient.post(COMMUNITY_APPROVE_JOIN(requestId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Join request approved.");
      queryClient.invalidateQueries({ queryKey: ["community-pending-users", activeCommunityId] });
      queryClient.invalidateQueries({ queryKey: ["community-members", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not approve join request.");
    },
  });

  const rejectJoinMutation = useMutation({
    mutationFn: async (requestId) => {
      const response = await apiClient.post(COMMUNITY_REJECT_JOIN(requestId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Join request rejected.");
      queryClient.invalidateQueries({ queryKey: ["community-pending-users", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not reject join request.");
    },
  });

  const deleteCommunityMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(COMMUNITY_DELETE(activeCommunityId));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Community deleted successfully.");
      setIsDeleteCommunityModalOpen(false);
      setDeleteCommunityConfirmChecked(false);
      setDeleteCommunityNameInput("");
      setSelectedCommunityId("");
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.removeQueries({ queryKey: ["community-posts", activeCommunityId] });
      queryClient.removeQueries({ queryKey: ["community-members", activeCommunityId] });
      queryClient.removeQueries({ queryKey: ["community-pending-users", activeCommunityId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not delete community.");
    },
  });

  const filteredCommunities = communities.filter((community) =>
    [community.name, community.description].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const posts = normalizeList(postsQuery.data);
  const approvals = normalizeList(approvalsQuery.data);
  const displayedMemberCount =
    communityMembers.length ||
    Number(selectedCommunity?.members_count || selectedCommunity?.member_count || selectedCommunity?.total_members || 0);
  const canCreateCommunity = communityName.trim() && communityDescription.trim();
  const canDeleteCommunity =
    Boolean(activeCommunityId) &&
    deleteCommunityConfirmChecked &&
    deleteCommunityNameInput.trim().toLocaleLowerCase() ===
      (selectedCommunity?.name || "").trim().toLocaleLowerCase();

  function handleCreateCommunity(event) {
    event.preventDefault();
    if (!canCreateCommunity) return;
    createCommunityMutation.mutate();
  }

  function handlePostSubmit(event) {
    event.preventDefault();
    if (!postContent.trim()) return;
    createPostMutation.mutate();
  }

  return (
    <CommunityShell layout={layout}>
      <div className="flex lg:h-full min-h-0 w-full flex-col lg:overflow-hidden bg-gradient-to-br from-slate-50 via-[#f8fafc]/50 to-slate-100 text-[#0d1b2a] rounded-3xl lg:rounded-none shadow-sm lg:shadow-none">

        <div className="flex min-h-0 flex-1 lg:overflow-hidden">
          <aside className="hidden w-[280px] shrink-0 flex-col border-r border-slate-200/60 bg-slate-50/80 backdrop-blur-sm lg:flex">
            <div className="border-b border-slate-200/60 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Communities</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Filter communities..."
                  className="h-10 rounded-xl border border-slate-200/80 bg-white pl-9 text-xs shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500/40 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>
            </div>



            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 [scrollbar-width:thin]">
              {communitiesQuery.isLoading ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <LoaderCircle className="size-5 animate-spin" />
                </div>
              ) : filteredCommunities.length ? (
                <div className="space-y-1.5">
                  {filteredCommunities.map((community, index) => {
                    const isActive = String(activeCommunityId) === String(community.id);
                    const gradients = [
                      "from-[#1094EB] to-[#3B5BFC]",
                      "from-[#3B5BFC] to-[#9A2DF2]",
                      "from-[#9A2DF2] to-[#F43F5E]",
                      "from-[#06B6D4] to-[#3B5BFC]"
                    ];
                    const tone = gradients[index % gradients.length];

                    return (
                      <button
                        key={community.id}
                        type="button"
                        onClick={() => setSelectedCommunityId(String(community.id))}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 overflow-hidden",
                          isActive
                            ? "border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100/50 font-bold"
                            : "border-transparent hover:bg-slate-200/30 text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-gradient-to-b from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2]" />
                        )}
                        <span className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-sm ring-1 ring-white/10 bg-gradient-to-br",
                          tone
                        )}>
                          {getInitials(community.name || "GA")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{community.name}</span>
                          {isActive ? (
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-[#3B5BFC]">{community.description}</span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-5 text-center text-xs text-slate-400">
                  No communities found
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="border-t border-slate-200/60 p-4">
                <Button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] font-bold text-white hover:opacity-95 shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 border-0 transition-all active:scale-[0.98]"
                >
                  <Plus className="size-4" />
                  Create Community
                </Button>
              </div>
            )}
          </aside>

          <main className="min-h-0 flex-1 lg:overflow-hidden">
            <div className="flex flex-col w-full xl:grid lg:h-full gap-6 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="flex min-h-0 min-w-0 flex-col gap-6 lg:h-full">
                <section className="shrink-0 overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
                  <div className="relative px-6 pt-6 sm:px-8 sm:pt-8 pb-0">
                    {isAdmin && activeCommunityId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDeleteCommunityModalOpen(true)}
                        className="absolute right-6 top-6 h-9 rounded-xl border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-700 sm:right-8 sm:top-8"
                        title="Delete community"
                      >
                        <Trash2 className="size-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    ) : null}
                    <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-6">
                      <div className="flex size-20 sm:size-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white text-3xl sm:text-4xl font-black shadow-md ring-4 ring-white shadow-indigo-500/10">
                        {getInitials(selectedCommunity?.name || "GA")}
                      </div>
                      <div className="min-h-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">{selectedCommunity?.name || "Global Announcements"}</h1>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-3.5 py-1">
                            <Users className="size-3.5 text-slate-400" />
                            {displayedMemberCount.toLocaleString("en-IN")} {displayedMemberCount === 1 ? "member" : "members"}
                          </span>
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                            Public Community
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-slate-100">
                      {["posts", "files", "photos", "members"].map((tab) => {
                        const isActive = activeTab === tab;
                        const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                              "relative py-4 text-xs sm:text-sm font-bold tracking-wider transition-colors outline-none",
                              isActive ? "text-[#3B5BFC]" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {label}
                            {isActive && (
                              <Motion.div
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1094EB] to-[#3B5BFC]"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              />
                            )}
                          </button>
                        );
                      })}
                      {activeCommunityId && !accessDenied ? (
                        <div className="ml-auto flex items-center gap-2 py-2">
                          <Button
                            type="button"
                            onClick={() => setIsCreatePostModalOpen(true)}
                            className="h-9 sm:h-10 rounded-xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] px-5 text-xs font-bold text-white hover:opacity-95 shadow-md shadow-indigo-500/10 border-0 transition-all active:scale-[0.98]"
                          >
                            Create Post
                          </Button>
                          {isAdmin && (
                            <Button
                              type="button"
                              onClick={() => setIsAddMemberModalOpen(true)}
                              className="h-9 sm:h-10 rounded-xl bg-white border border-slate-200/80 px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                              Add Member
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {accessDenied ? (
                    <section className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-10 text-center">
                      <Users className="mx-auto size-10 text-[#64748b]" />
                      <h3 className="mt-4 text-lg font-bold text-[#111827]">Membership required</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#64748b]">
                        Ask to join this community before reading or submitting posts.
                      </p>
                      <Button
                        onClick={() => joinMutation.mutate(activeCommunityId)}
                        disabled={joinMutation.isPending}
                        className="mt-5 rounded-2xl bg-[#006d92] text-white hover:bg-[#005f83]"
                      >
                        {joinMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Users className="size-4" />}
                        Request access
                      </Button>
                    </section>
                  ) : activeTab === "posts" ? (
                    postsQuery.isLoading ? (
                      <section className="flex items-center justify-center rounded-3xl border border-slate-200/60 bg-white py-20 text-slate-400 shadow-sm">
                        <LoaderCircle className="size-6 animate-spin text-[#3B5BFC]" />
                      </section>
                    ) : posts.length ? (
                      <Motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-4"
                      >
                        {posts.map((post) => {
                          const likeReaction = post.reactions?.find((r) => r.emoji === "like");
                          const hasLiked = !!likeReaction?.reacted;
                          const likeCount = likeReaction?.count || 0;

                          const celebrateReaction = post.reactions?.find((r) => r.emoji === "celebrate");
                          const hasCelebrated = !!celebrateReaction?.reacted;
                          const celebrateCount = celebrateReaction?.count || 0;

                          const insightfulReaction = post.reactions?.find((r) => r.emoji === "insitefull");
                          const hasInsightful = !!insightfulReaction?.reacted;
                          const insightfulCount = insightfulReaction?.count || 0;

                          const totalReactions = post.reactions?.reduce((acc, r) => acc + r.count, 0) || 0;
                          const repliesCount = post.replies_count || 0;
                          const isReplyExpanded = expandedReplyPostId === post.id;
                          const isPinnedPost = post.is_pinned || post.pinned;
                          const pinnedCopy = getPinnedAnnouncementCopy(post.content);

                          if (isPinnedPost) {
                            return (
                              <Motion.article
                                key={post.id}
                                variants={itemVariants}
                                className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 p-5 shadow-[0_14px_40px_rgba(59,91,252,0.08)] ring-1 ring-indigo-100/50 sm:p-7"
                              >
                                <div className="flex items-start gap-4 sm:gap-5">
                                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-[#3B5BFC] shadow-sm sm:size-14">
                                    <Megaphone className="size-5 sm:size-6" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-4">
                                      <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#3B5BFC] sm:text-sm">
                                        Pinned Announcement
                                      </p>
                                      <div className="flex shrink-0 items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 sm:text-sm">
                                          {formatDate(post.pinned_at || post.created_at)}
                                        </span>
                                        {isAdmin || String(post.user?.id) === String(userProfile?.id) ? (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" className="size-8 rounded-full p-0 text-slate-400 hover:bg-white/70 hover:text-slate-600">
                                                <MoreVertical className="size-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="min-w-32 rounded-xl border border-slate-100 bg-white p-1 text-slate-700 shadow-lg">
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setEditingPostId(post.id);
                                                  setEditingPostContent(post.content);
                                                  setIsEditModalOpen(true);
                                                }}
                                                className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                              >
                                                Edit Post
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() => unpinPostMutation.mutate(post.id)}
                                                className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                              >
                                                Unpin Post
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setDeletingPostId(post.id);
                                                  setIsDeleteModalOpen(true);
                                                }}
                                                className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                                              >
                                                Remove Post
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        ) : null}
                                      </div>
                                    </div>
                                    <h3 className="mt-3 text-base font-extrabold leading-tight text-slate-800 sm:text-lg">
                                      {pinnedCopy.title}
                                    </h3>
                                    {pinnedCopy.body ? (
                                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-500 sm:text-base">
                                        {pinnedCopy.body}
                                      </p>
                                    ) : null}
                                    {post.media_url ? (
                                      <a
                                        href={post.media_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#3B5BFC] hover:text-[#2563EB]"
                                      >
                                        Read the full update
                                        <span aria-hidden="true">-&gt;</span>
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                              </Motion.article>
                            );
                          }

                          return (
                            <Motion.article
                              key={post.id}
                              variants={itemVariants}
                              className="rounded-3xl border border-slate-200/60 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-300/60"
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1094EB]/10 to-[#3B5BFC]/10 text-xs font-bold text-[#3B5BFC] shadow-sm">
                                  {getInitials(post.user?.name || "Member")}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-bold text-slate-800 text-sm sm:text-base">{post.user?.name || "Community member"}</p>
                                      {post.user?.role ? (
                                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                          {post.user.role}
                                        </span>
                                      ) : null}
                                      <span className="text-xs text-slate-400">{formatDate(post.created_at)}</span>
                                      {(post.is_pinned || post.pinned) ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-600 border border-amber-100">
                                          Pinned
                                        </span>
                                      ) : null}
                                    </div>
                                    {isAdmin || String(post.user?.id) === String(userProfile?.id) ? (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" className="size-8 p-0 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                                            <MoreVertical className="size-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-white border border-slate-100 shadow-lg rounded-xl p-1 min-w-32 text-slate-700">
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setEditingPostId(post.id);
                                              setEditingPostContent(post.content);
                                              setIsEditModalOpen(true);
                                            }}
                                            className="px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
                                          >
                                            Edit Post
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              if (post.is_pinned || post.pinned) {
                                                unpinPostMutation.mutate(post.id);
                                              } else {
                                                pinPostMutation.mutate(post.id);
                                              }
                                            }}
                                            className="px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
                                          >
                                            {(post.is_pinned || post.pinned) ? "Unpin Post" : "Pin Post"}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setDeletingPostId(post.id);
                                              setIsDeleteModalOpen(true);
                                            }}
                                            className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 cursor-pointer transition-all"
                                          >
                                            Remove Post
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    ) : null}
                                  </div>
                                  <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                                    <LinkifiedText
                                      text={post.content}
                                      className="whitespace-pre-wrap break-words"
                                      linkClassName="font-semibold text-[#3B5BFC] underline underline-offset-2"
                                    />
                                  </p>
                                  {post.media_url ? (
                                    <a
                                      href={post.media_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-[#3B5BFC] hover:bg-slate-50 hover:text-[#2563EB] transition-all"
                                    >
                                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                      View Attached Media
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                              <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-3.5 text-xs text-slate-400 font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleReactionToggle(post, "like")}
                                  className={cn("hover:text-[#3B5BFC] transition-colors", hasLiked && "text-[#3B5BFC] font-extrabold")}
                                >
                                  Like{likeCount > 0 ? ` • ${likeCount}` : ""}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReactionToggle(post, "celebrate")}
                                  className={cn("hover:text-amber-500 transition-colors", hasCelebrated && "text-amber-500 font-extrabold")}
                                >
                                  Celebrate{celebrateCount > 0 ? ` • ${celebrateCount}` : ""}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReactionToggle(post, "insitefull")}
                                  className={cn("hover:text-emerald-500 transition-colors", hasInsightful && "text-emerald-500 font-extrabold")}
                                >
                                  Insightful{insightfulCount > 0 ? ` • ${insightfulCount}` : ""}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedReplyPostId(isReplyExpanded ? null : post.id)}
                                  className={cn("hover:text-indigo-500 transition-colors flex items-center gap-1.5", isReplyExpanded && "text-indigo-500 font-extrabold")}
                                >
                                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  Reply
                                </button>
                                <span className="ml-auto text-xs font-semibold text-slate-400">
                                  {totalReactions} reactions • {repliesCount} comments
                                </span>
                              </div>

                              {isReplyExpanded && (
                                <PostReplies
                                  postId={post.id}
                                  activeCommunityId={activeCommunityId}
                                  userProfile={userProfile}
                                  isAdmin={isAdmin}
                                />
                              )}
                            </Motion.article>
                          );
                        })}
                      </Motion.div>
                    ) : (
                      <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center shadow-sm">
                        <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-400">
                          <MessageSquareText className="size-6" />
                        </div>
                        <h3 className="mt-4 text-base font-bold text-slate-800">No posts yet</h3>
                        <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm text-slate-400 leading-relaxed">
                          Start the first thread for this community to engage with other members.
                        </p>
                      </section>
                    )
                  ) : activeTab === "files" ? (
                    (() => {
                      const files = posts.filter((post) => post.media_url);
                      return files.length ? (
                        <Motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="show"
                          className="space-y-3"
                        >
                          {files.map((post) => (
                            <Motion.div
                              key={post.id}
                              variants={itemVariants}
                              className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm hover:border-slate-300/60 transition-all duration-200"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1094EB]/10 to-[#3B5BFC]/10 text-[#3B5BFC] shadow-sm">
                                  <Link className="size-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <a href={post.media_url} target="_blank" rel="noreferrer" className="truncate font-bold text-sm text-slate-800 hover:text-[#3B5BFC] hover:underline block max-w-xs sm:max-w-md">
                                    {post.media_url.split("/").pop() || "Attached File"}
                                  </a>
                                  <p className="truncate text-[11px] font-medium text-slate-400 mt-0.5">Shared by {post.user?.name || "Member"}</p>
                                </div>
                              </div>
                              <a
                                href={post.media_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-[0.98]"
                              >
                                Download
                              </a>
                            </Motion.div>
                          ))}
                        </Motion.div>
                      ) : (
                        <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center shadow-sm">
                          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-400">
                            <Link className="size-6" />
                          </div>
                          <h3 className="mt-4 text-base font-bold text-slate-800">No files shared</h3>
                          <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm text-slate-400 leading-relaxed">
                            Files attached to community posts will appear here.
                          </p>
                        </section>
                      );
                    })()
                  ) : activeTab === "photos" ? (
                    (() => {
                      const photos = posts.filter((post) => post.media_url && /\.(jpeg|jpg|gif|png|webp|svg)/i.test(post.media_url));
                      return photos.length ? (
                        <Motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="show"
                          className="grid gap-4 grid-cols-2 sm:grid-cols-3"
                        >
                          {photos.map((post) => (
                            <Motion.a
                              key={post.id}
                              variants={itemVariants}
                              href={post.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative aspect-square overflow-hidden rounded-3xl border border-slate-200/60 bg-slate-100 shadow-sm block transition-all"
                            >
                              <img src={post.media_url} alt="Shared" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 flex items-end">
                                <p className="text-white text-xs font-semibold truncate w-full">Shared by {post.user?.name || "Member"}</p>
                              </div>
                            </Motion.a>
                          ))}
                        </Motion.div>
                      ) : (
                        <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center shadow-sm">
                          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-400">
                            <Image className="size-6" />
                          </div>
                          <h3 className="mt-4 text-base font-bold text-slate-800">No photos shared</h3>
                          <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm text-slate-400 leading-relaxed">
                            Images posted in this community will appear here.
                          </p>
                        </section>
                      );
                    })()
                  ) : activeTab === "members" ? (
                    membersQuery.isLoading ? (
                      <section className="flex items-center justify-center rounded-3xl border border-slate-200/60 bg-white py-20 text-slate-400 shadow-sm">
                        <LoaderCircle className="size-6 animate-spin text-[#3B5BFC]" />
                      </section>
                    ) : communityMembers.length ? (
                      <Motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid gap-4 sm:grid-cols-2"
                      >
                        {communityMembers.map((member) => {
                          const memberUserId = getCommunityMemberUserId(member);
                          const memberName = getCommunityMemberName(member);
                          const memberEmail = getCommunityMemberEmail(member);

                          return (
                            <Motion.div
                              key={member.id || memberUserId}
                              variants={itemVariants}
                              className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:border-slate-300/60 transition-all duration-200"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1094EB]/10 to-[#3B5BFC]/10 text-xs font-bold text-[#3B5BFC] shadow-sm">
                                  {getInitials(memberName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-bold text-sm text-slate-800">{memberName}</p>
                                  <p className="truncate text-xs font-medium text-slate-400 mt-0.5">{memberEmail || member.role}</p>
                                </div>
                              </div>
                              {isAdmin ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  disabled={removeMemberMutation.isPending || !memberUserId}
                                  onClick={() => removeMemberMutation.mutate(memberUserId)}
                                  className="h-8 px-3.5 rounded-xl bg-rose-50 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all border border-rose-100/50"
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </Motion.div>
                          );
                        })}
                      </Motion.div>
                    ) : (
                      <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center shadow-sm">
                        <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-400">
                          <Users className="size-6" />
                        </div>
                        <h3 className="mt-4 text-base font-bold text-slate-800">No members</h3>
                        <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm text-slate-400 leading-relaxed">
                          This community does not have any members yet.
                        </p>
                      </section>
                    )) : null}
                </div>
              </section>

              <aside className="hidden min-h-0 flex-col gap-6 xl:flex">
                {/* <section className="rounded-2xl border border-[#cbd5e1] bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-semibold text-[#111827]">Upcoming Events</h2>
                    <button type="button" className="text-sm font-medium text-[#005f83]">View All</button>
                  </div>
                  {[
                    ["JUL", "12", "Q3 Strategy Town Hall", "14:00 • Virtual Meeting"],
                    ["JUL", "15", "Diversity & Inclusion Seminar", "10:00 • Room 402 / Zoom"],
                  ].map((event, index) => (
                    <div key={event[2]} className="mb-4 flex gap-4 last:mb-0">
                      <div className={`flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg ${index === 0 ? "bg-[#a9e6f4]" : "bg-[#e8f0fb]"}`}>
                        <span className="text-[10px] font-bold text-[#005f83]">{event[0]}</span>
                        <span className="text-xl font-bold text-[#005f83]">{event[1]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#111827]">{event[2]}</p>
                        <p className="mt-1 text-xs text-[#64748b]">{event[3]}</p>
                        <button type="button" className={`mt-2 h-9 w-full rounded-lg border text-sm font-bold ${index === 0 ? "border-[#005f83] text-[#005f83]" : "border-transparent bg-[#eef4fb] text-[#64748b]"}`}>
                          {index === 0 ? "Join Live" : "Interested"}
                        </button>
                      </div>
                    </div>
                  ))}
                </section> */}

                {isAdmin ? (
                  <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-bold text-slate-800 text-sm tracking-tight">Member approvals</h2>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-[#3B5BFC] border border-indigo-100">
                        {pendingUsers.length} pending
                      </span>
                    </div>
                    {pendingUsersQuery.isLoading ? (
                      <div className="flex flex-1 items-center justify-center py-6 text-slate-400">
                        <LoaderCircle className="size-5 animate-spin text-[#3B5BFC]" />
                      </div>
                    ) : pendingUsers.length ? (
                      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 [scrollbar-width:thin]">
                        {pendingUsers.map((member) => (
                          <div key={member.requestId} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                            <div className="flex items-start gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1094EB]/10 to-[#3B5BFC]/10 text-xs font-bold text-[#3B5BFC] shadow-sm">
                                {getInitials(member.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-slate-800 text-sm">{member.name}</p>
                                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                                  {member.department}
                                </p>
                              </div>
                            </div>
                            {member.email ? (
                              <p className="mt-2 truncate rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-500">
                                {member.email}
                              </p>
                            ) : null}
                            <p className="mt-2 text-[10px] font-semibold text-slate-400">{formatDate(member.requestedAt)}</p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => approveJoinMutation.mutate(member.requestId)}
                                disabled={approveJoinMutation.isPending || rejectJoinMutation.isPending}
                                className="h-8 flex-1 rounded-xl bg-emerald-50 text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:bg-emerald-100 border border-emerald-100/50 transition-all disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => rejectJoinMutation.mutate(member.requestId)}
                                disabled={approveJoinMutation.isPending || rejectJoinMutation.isPending}
                                className="h-8 flex-1 rounded-xl bg-rose-50 text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-100 border border-rose-100/50 transition-all disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center text-xs text-slate-400 font-medium">No pending member approvals</p>
                    )}
                  </section>
                ) : null}

                {isAdmin ? (
                  <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-bold text-slate-800 text-sm tracking-tight">Post approvals</h2>
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 border border-rose-100">
                        {approvals.length} pending
                      </span>
                    </div>
                    {approvalsQuery.isLoading ? (
                      <div className="flex flex-1 items-center justify-center py-6 text-slate-400">
                        <LoaderCircle className="size-5 animate-spin text-[#3B5BFC]" />
                      </div>
                    ) : approvals.length ? (
                      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 [scrollbar-width:thin]">
                        {approvals.map((approval) => (
                          <div key={approval.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1094EB]/10 to-[#3B5BFC]/10 text-[10px] font-bold text-[#3B5BFC]">
                                {getInitials(approval.user?.name || "Member")}
                              </div>
                              <p className="font-bold text-slate-800 text-xs truncate">{approval.user?.name || "Community member"}</p>
                            </div>
                            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-100">{approval.content}</p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => approveMutation.mutate(approval.id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                className="h-8 flex-1 rounded-xl bg-emerald-50 text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:bg-emerald-100 border border-emerald-100/50 transition-all disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => rejectMutation.mutate(approval.id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                className="h-8 flex-1 rounded-xl bg-rose-50 text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-100 border border-rose-100/50 transition-all disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center text-xs text-slate-400 font-medium">No pending post approvals</p>
                    )}
                  </section>
                ) : null}

                {/* <section className="rounded-2xl border border-[#cbd5e1] bg-white p-4">
                  <h2 className="font-semibold text-[#111827]">Community Insights</h2>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span>Active Members</span>
                    <span className="font-bold text-[#005f83]">84%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#e8f0fb]">
                    <div className="h-full w-[84%] rounded-full bg-[#006d92]" />
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#e5f8fc] p-4">
                      <p className="text-[11px] font-bold uppercase text-[#64748b]">Engagements</p>
                      <p className="mt-2 text-lg text-[#005f83]">2.4k</p>
                    </div>
                    <div className="rounded-2xl bg-[#f1f5f9] p-4">
                      <p className="text-[11px] font-bold uppercase text-[#64748b]">New Files</p>
                      <p className="mt-2 text-lg text-[#334155]">156</p>
                    </div>
                  </div>
                </section> */}

              </aside>
            </div>
          </main>
        </div>
      </div>
      <CommunityDialogs
        isAdmin={isAdmin}
        isDeleteCommunityModalOpen={isDeleteCommunityModalOpen}
        setIsDeleteCommunityModalOpen={setIsDeleteCommunityModalOpen}
        setDeleteCommunityConfirmChecked={setDeleteCommunityConfirmChecked}
        setDeleteCommunityNameInput={setDeleteCommunityNameInput}
        selectedCommunity={selectedCommunity}
        deleteCommunityConfirmChecked={deleteCommunityConfirmChecked}
        deleteCommunityNameInput={deleteCommunityNameInput}
        canDeleteCommunity={canDeleteCommunity}
        deleteCommunityMutation={deleteCommunityMutation}
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        handleCreateCommunity={handleCreateCommunity}
        communityNameInputRef={communityNameInputRef}
        communityName={communityName}
        setCommunityName={setCommunityName}
        communityDescription={communityDescription}
        setCommunityDescription={setCommunityDescription}
        canCreateCommunity={canCreateCommunity}
        createCommunityMutation={createCommunityMutation}
        isCreatePostModalOpen={isCreatePostModalOpen}
        setIsCreatePostModalOpen={setIsCreatePostModalOpen}
        handlePostSubmit={handlePostSubmit}
        userProfile={userProfile}
        session={session}
        postContent={postContent}
        setPostContent={setPostContent}
        setMediaUrl={setMediaUrl}
        createPostMutation={createPostMutation}
        isAddMemberModalOpen={isAddMemberModalOpen}
        setIsAddMemberModalOpen={setIsAddMemberModalOpen}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        selectedMemberUser={selectedMemberUser}
        setSelectedMemberUser={setSelectedMemberUser}
        addMemberError={addMemberError}
        setAddMemberError={setAddMemberError}
        memberSearchQueryResult={memberSearchQueryResult}
        memberSearchResults={memberSearchResults}
        addMemberMutation={addMemberMutation}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingPostId={editingPostId}
        setEditingPostId={setEditingPostId}
        editingPostContent={editingPostContent}
        setEditingPostContent={setEditingPostContent}
        editPostMutation={editPostMutation}
        isDeleteModalOpen={isDeleteModalOpen}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        deletingPostId={deletingPostId}
        setDeletingPostId={setDeletingPostId}
        removePostMutation={removePostMutation}
      />
    </CommunityShell>
  );
}
