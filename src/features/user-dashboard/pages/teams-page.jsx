import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, PhoneCall, SquarePen, Users, Search, Trash2, LoaderCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CHANNELS_DELETE, CHANNEL_MEMBER } from "@/config/api";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamCalendar } from "@/features/teams/admin/components/team-calendar";
import { TeamComposer } from "@/features/teams/components/team-composer";
import { TeamMessagePanel } from "@/features/teams/components/team-message-panel";
import { TypingIndicator } from "@/features/teams/components/typing-indicator";
import { SharedTeamSidebar } from "@/features/teams/components/team-sidebar";
import { useTeamMessages } from "@/features/teams/hooks/use-team-messages";
import { useTeamMembers } from "@/features/teams/hooks/use-team-members";
import { useTeamTyping } from "@/features/teams/hooks/use-team-typing";
import { useAuthStore } from "@/store/auth-store";
import { UserLayout } from "@/layouts/user-layout";
import { useUserTeams } from "@/features/teams/hooks/use-user-teams";
import { useCalendarEvents } from "@/features/calendar/hooks/use-calendar-events";
import { getSessionUserIdentifiers } from "@/features/chat/utils/chat-utils";
import { useMeetingLauncher } from "@/features/meetings/hooks/use-meeting-launcher";
import { getMemberContactTarget } from "@/features/teams/utils/team-utils";

export function TeamsPage() {
  const session = useAuthStore((state) => state.session);
  const navigate = useNavigate();
  const location = useLocation();
  const meetings = useMeetingLauncher("user");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("chat");
  const [messageInput, setMessageInput] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const currentUserIdentifiers = useMemo(() => getSessionUserIdentifiers(session), [session]);
  const initialChannelId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return location.state?.selectedChannelId || params.get("channelId") || null;
  }, [location.search, location.state]);
  const { channelState, sidebarState } = useUserTeams({
    accessToken: session?.accessToken,
    initialChannelId,
  });
  const { filteredChannels, activeChannel, isLoading, isError } = channelState;
  const { search, setSearch, isMobilePanelOpen, setIsMobilePanelOpen, openChannel } = sidebarState;
  const {
    events: calendarEvents,
    isLoading: isCalendarLoading,
  } = useCalendarEvents();

  const { members: channelMembers, isLoading: isFetchingMembers } = useTeamMembers(
    activeChannel?.id,
    {
      accessToken: session?.accessToken,
    }
  );

  const {
    messages: currentMessages,
    bottomRef,
    isLoading: isMessagesLoading,
    isSending,
    sendMessage: sendChannelMessage,
    uploadAttachment,
    pendingAttachment,
    removePendingAttachment,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    showDeliveryStatus,
    loadThreadMessages,
    forwardMessage,
    translateMessage,
    summarizeMessage,
    isMessageSearchOpen,
    setIsMessageSearchOpen,
    messageSearchQuery,
    setMessageSearchQuery,
    searchMessagesQuery,
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
  } = useTeamMessages({
    channelId: activeChannel?.id,
    accessToken: session?.accessToken,
    currentUserId: currentUserIdentifiers,
  });

  const { notifyTyping, stopTyping, typingUsers } = useTeamTyping({
    channelId: activeChannel?.id,
    accessToken: session?.accessToken,
    currentUserIds: currentUserIdentifiers,
  });

  useEffect(() => {
    setReplyTarget(null);
  }, [activeChannel?.id]);

  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId) => {

      const userId = currentUserIdentifiers[0];
      await apiClient.delete(CHANNEL_MEMBER(channelId, userId), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-user-channels"] });
      toast.success("Left the team successfully.");
      setIsDeleteDialogOpen(false);
      navigate("/user/dashboard/channels");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.response?.data?.detail || "Failed to leave team.");
      setIsDeleteDialogOpen(false);
    }
  });

  const handleDeleteChannel = () => {
    if (!activeChannel) return;
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteChannel = () => {
    if (!activeChannel) return;
    deleteChannelMutation.mutate(activeChannel.id);
  };


  const enrichedTypingUsers = useMemo(() => {
    return typingUsers.map((user) => {
      const member = channelMembers.find(
        (m) =>
          String(m.user_id || m.id) === user.userId ||
          String(m.id) === user.userId
      );
      return {
        ...user,
        userName: member?.full_name || member?.name || user.userName,
      };
    });
  }, [typingUsers, channelMembers]);

  const activeTeamCalendarEvents = useMemo(() => {
    const channelId = activeChannel?.id;
    const memberIds = new Set(channelMembers.map((member) => String(member.id)).filter(Boolean));
    const currentUserIds = new Set(currentUserIdentifiers);

    if (!channelId) return [];

    return (calendarEvents || []).filter((event) => {
      if (event.channel_id && String(event.channel_id) !== String(channelId)) {
        return false;
      }

      const participantIds = (event.participant_ids?.length
        ? event.participant_ids
        : (event.participants || []).map((participant) => participant.id)
      )
        .filter(Boolean)
        .map(String);

      const includesCurrentUser = participantIds.some((id) => currentUserIds.has(id));
      if (!includesCurrentUser) return false;

      if (event.channel_id && String(event.channel_id) === String(channelId)) {
        return true;
      }

      if (!participantIds.length || !memberIds.size) return false;

      const allParticipantsAreMembers = participantIds.every((id) => memberIds.has(id));
      const expectedChannelInviteSize = Math.max(1, memberIds.size - 1);

      return allParticipantsAreMembers && participantIds.length >= expectedChannelInviteSize;
    });
  }, [activeChannel?.id, calendarEvents, channelMembers, currentUserIdentifiers]);

  function handleSendMessage() {
    const text = messageInput.trim();
    if ((!text && !pendingAttachment) || !activeChannel) return;
    stopTyping();
    sendChannelMessage(text, { replyTo: replyTarget });
    setMessageInput("");
    setReplyTarget(null);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  return (
    <UserLayout
      showFloatingActions={false}
      contentClassName="!p-0 h-full overflow-hidden"
      contentInnerClassName="!max-w-none !w-full !m-0 h-full"
    >
      <div className="flex h-full w-full overflow-hidden bg-white">
        <div
          className={`relative w-full lg:shrink-0 lg:w-[22rem] ${isMobilePanelOpen ? "max-lg:hidden lg:flex" : "flex"}`}
        >
          <SharedTeamSidebar
            title="Teams"
            subtitle="Your joined teams"
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search teams"
            channels={filteredChannels}
            selectedChannelId={activeChannel?.id}
            onSelectChannel={openChannel}
            loading={isLoading}
            error={isError ? "Unable to load your teams right now." : ""}
            emptyMessage="No teams matched this search."
            getChannelMeta={(channel) =>
              channel.unreadCount ? String(channel.unreadCount) : channel.visibilityLabel
            }
            isPrivateChannel={(channel) => channel.isPrivate}
            className="relative translate-x-0 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white lg:flex lg:w-[22rem]"
            renderHeaderAction={() => (
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-primary/20 hover:text-brand-primary hover:shadow-md hover:shadow-slate-100/50 active:scale-95"
                aria-label="Teams workspace"
                title="Teams workspace"
              >
                <SquarePen className="size-5" />
              </button>
            )}
          />
        </div>

        <TeamMessagePanel
          meetingVariant="user"
          shellClassName={isMobilePanelOpen ? "flex bg-white" : "max-lg:hidden lg:flex bg-white"}
          selectedChannel={activeChannel}
          currentUser={{
            name: session?.full_name || session?.name,
            avatar_url: session?.profile_image || session?.image,
          }}
          headerAvatar={activeChannel?.avatar_url || activeChannel?.image}
          headerMeta={(channel) => channel?.visibilityLabel || "Team"}
          headerActions={
            <>
              <button
                type="button"
                className="rounded-xl border border-slate-100 bg-white p-2 text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-primary/20 hover:text-brand-primary hover:shadow-md hover:shadow-slate-100/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setActiveTab("calendar")}
                disabled={!activeChannel}
                title="Team calendar"
              >
                <CalendarDays className="size-4" />
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-100 bg-white p-2 text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-primary/20 hover:text-brand-primary hover:shadow-md hover:shadow-slate-100/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setActiveTab("members")}
                disabled={!activeChannel}
                title="Team members"
              >
                <Users className="size-4" />
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-100 bg-white p-2 text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-primary/20 hover:text-brand-primary hover:shadow-md hover:shadow-slate-100/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => meetings.startChannelCall(activeChannel, { mode: "video" })}
                disabled={!activeChannel}
                title="Start team call"
              >
                <PhoneCall className="size-4" />
              </button>
              <button
                type="button"
                className={`rounded-xl p-2 transition disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${isMessageSearchOpen
                  ? "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-md shadow-brand-primary/20"
                  : "border border-slate-100 bg-white text-slate-500 shadow-sm hover:border-brand-primary/20 hover:text-brand-primary hover:shadow-md hover:shadow-slate-100/50"
                  }`}
                onClick={() => setIsMessageSearchOpen(!isMessageSearchOpen)}
                disabled={!activeChannel}
                title="Search messages"
              >
                <Search className="size-4" />
              </button>

              <button
                type="button"
                onClick={handleDeleteChannel}
                disabled={!activeChannel || deleteChannelMutation.isPending}
                className="rounded-xl border border-slate-100 bg-white p-2 text-red-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-red-500 hover:text-white hover:bg-red-500 hover:shadow-md hover:shadow-red-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                title="Leave team"
              >
                {deleteChannelMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </>
          }
          tabs={[
            { value: "chat", label: "Chat" },
            { value: "files", label: "Files" },
            { value: "calendar", label: "Calendar" },
            { value: "members", label: "Members" },
            { value: "team", label: "Department" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          messages={currentMessages}
          members={channelMembers}
          onChatMember={handleChatMember}
          onCallMember={handleCallMember}
          isFetchingMembers={isFetchingMembers}
          calendarContent={
            <TeamCalendar
              events={activeTeamCalendarEvents}
              isLoading={isCalendarLoading || isFetchingMembers}
              selectedChannel={activeChannel}
              canSchedule={false}
            />
          }
          isLoading={isMessagesLoading}
          bottomRef={bottomRef}
          onAddReaction={addReaction}
          onRemoveReaction={removeReaction}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          onPinMessage={pinMessage}
          onUnpinMessage={unpinMessage}
          onShowDeliveryStatus={showDeliveryStatus}
          onLoadThreadMessages={loadThreadMessages}
          onReplyMessage={(message) => {
            setActiveTab("chat");
            setReplyTarget(message);
          }}
          onForwardMessage={forwardMessage}
          onTranslateMessage={translateMessage}
          onSummarizeMessage={summarizeMessage}
          onBackMobile={() => setIsMobilePanelOpen(false)}
          isMessageSearchOpen={isMessageSearchOpen}
          messageSearchQuery={messageSearchQuery}
          searchMessagesQuery={searchMessagesQuery}
          setIsMessageSearchOpen={setIsMessageSearchOpen}
          setMessageSearchQuery={setMessageSearchQuery}
          hasMoreMessages={hasMoreMessages}
          isLoadingOlderMessages={isLoadingOlderMessages}
          onLoadOlderMessages={loadOlderMessages}
          composer={
            <>
              <TypingIndicator users={enrichedTypingUsers} />
              <TeamComposer
                isSending={isSending}
                messageInput={messageInput}
                onChange={(event) => {
                  setMessageInput(event.target.value);
                  if (event.target.value.trim()) {
                    notifyTyping();
                  }
                }}
                onKeyDown={handleKeyDown}
                onSend={handleSendMessage}
                replyTarget={replyTarget}
                onCancelReply={() => setReplyTarget(null)}
                pendingAttachment={pendingAttachment}
                onRemovePendingAttachment={removePendingAttachment}
                onUploadAttachment={uploadAttachment}
                disabled={!activeChannel}
                placeholder={activeChannel ? `Message #${activeChannel.name}` : "Select a team"}
                channelMembers={channelMembers}
                isFetchingMembers={isFetchingMembers}
                onMentionInsert={(member, newMessage) => {
                  console.log(`Mentioned ${member.name} in message:`, newMessage);
                }}
              />
            </>
          }
        />
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-white shadow-2xl sm:max-w-md border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Leave Team</DialogTitle>
            <DialogDescription className="text-slate-500 mt-2">
              Are you sure you want to leave the team <span className="font-semibold text-slate-700">"{activeChannel?.name}"</span>? You will no longer be able to access its channels or messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteChannelMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteChannel}
              disabled={deleteChannelMutation.isPending}
            >
              {deleteChannelMutation.isPending ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : null}
              Leave Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
