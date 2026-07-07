import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeamMessages } from "@/features/teams/hooks/use-team-messages";
import { useAuthStore } from "@/store/auth-store";
import { useMeetingLauncher } from "@/features/meetings/hooks/use-meeting-launcher";
import { AdminLayout } from "@/layouts/admin-layout";
import { TeamChat } from "@/features/teams/admin/components/team-chat";
import { ScheduleTeamMeetingDialog } from "@/features/teams/admin/components/team-calendar";
import { TeamSidebar } from "@/features/teams/admin/components/team-sidebar";
import {
  AddMemberDialog,
  TeamSettingsDialog,
  DeleteTeamDialog,
  MembersDialog,
} from "@/features/teams/admin/components/team-dialogs";
import { useAdminTeams } from "@/features/teams/hooks/use-admin-teams";
import { useCalendarEvents } from "@/features/calendar/hooks/use-calendar-events";
import { getChannelId, getMemberContactTarget } from "@/features/teams/utils/team-utils";
import { getSessionUserIdentifiers } from "@/features/chat/utils/chat-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TeamsPage() {
  const session = useAuthStore((state) => state.session);
  const navigate = useNavigate();
  const meetings = useMeetingLauncher("admin");
  const [activeTab, setActiveTab] = useState("chat");
  const [messageInput, setMessageInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyState, setReplyState] = useState({ channelId: null, target: null });
  const [replacePinDialogOpen, setReplacePinDialogOpen] = useState(false);
  const [pendingPinMessageId, setPendingPinMessageId] = useState(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const token = session?.accessToken;
  const currentUserIdentifiers = useMemo(() => getSessionUserIdentifiers(session), [session]);
  const {
    channelState,
    sidebarState,
    memberDialog,
    membersDialog,
    deleteDialog,
    settingsDialog,
    actions,
  } = useAdminTeams({ session });
  const { channels, selectedChannel, isLoading, error } = channelState;
  const selectedChannelId = getChannelId(selectedChannel);
  const replyTarget = String(replyState.channelId || "") === String(selectedChannelId || "")
    ? replyState.target
    : null;
  const { isSidebarOpen, setIsSidebarOpen, createDialog } = sidebarState;
  const selectedChannelMemberCount =
    selectedChannel?.memberCount ||
    selectedChannel?.member_count ||
    selectedChannel?.members_count ||
    selectedChannel?.members?.length ||
    selectedChannel?.users?.length ||
    0;
  const {
    events: calendarEvents,
    isLoading: isCalendarLoading,
    createEvent,
    isCreating: isSchedulingMeeting,
  } = useCalendarEvents();
  const {
    messages,
    bottomRef,
    isLoading: isMessagesLoading,
    isSending,
    sendMessage,
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
    channelId: selectedChannelId,
    accessToken: token,
    currentUserId: currentUserIdentifiers,
    enabled: Boolean(selectedChannelId),
  });

  const handleEditChannelMessage = (messageId) => {
    const message = messages.find((msg) => String(msg.id) === String(messageId));
    if (message) {
      removePendingAttachment();
      setReplyState({ channelId: null, target: null });
      setMessageInput(message.text);
      setEditingMessageId(messageId);
    }
  };

  const handleCancelEditMessage = () => {
    setMessageInput("");
    setEditingMessageId(null);
  };

  const handleSendChannelMessage = () => {
    const text = messageInput.trim();
    if ((!text && !pendingAttachment) || !selectedChannel) return;
    
    if (editingMessageId) {
      editMessage(editingMessageId, text);
      setEditingMessageId(null);
    } else {
      sendMessage(text, { replyTo: replyTarget });
      setReplyState({ channelId: null, target: null });
    }
    setMessageInput("");
  };

  const handleChannelMessageKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendChannelMessage();
    }
  };

  const handlePinMessage = (messageId) => {
    // Check if there's already a pinned message
    const pinnedMessage = messages.find((msg) => msg.pinned);
    
    if (pinnedMessage && String(pinnedMessage.id) !== String(messageId)) {
      // Show confirmation dialog
      setPendingPinMessageId(messageId);
      setReplacePinDialogOpen(true);
    } else {
      // No pinned message or clicking on the same message, just pin it
      pinMessage(messageId);
    }
  };

  const handleConfirmReplacePinned = async () => {
    if (!pendingPinMessageId) return;
    
    // First unpin the currently pinned message
    const pinnedMessage = messages.find((msg) => msg.pinned);
    if (pinnedMessage) {
      await unpinMessage(pinnedMessage.id);
    }
    
    // Then pin the new message
    pinMessage(pendingPinMessageId);
    
    setReplacePinDialogOpen(false);
    setPendingPinMessageId(null);
  };

  const handleScheduleChannelMeeting = async (payload) => {
    const channelId = getChannelId(selectedChannel);
    if (!channelId) return;

    await createEvent({
      ...payload,
      participant_ids: [],
      participant_names: [],
      channel_id: channelId,
    });
    setScheduleDialogOpen(false);
    setActiveTab("calendar");
  };

  const handleChatMember = (member) => {
    const targetUser = getMemberContactTarget(member);
    if (!targetUser) return;

    const params = new URLSearchParams({
      userId: String(targetUser.userId || targetUser.user_id || targetUser.id || ""),
      name: targetUser.name || "",
      email: targetUser.email || "",
    });

    navigate(`/admin/dashboard/chat?${params.toString()}`, {
      state: {
        selectedUserId: targetUser.id,
        selectedUserUserId: targetUser.userId || targetUser.user_id,
        selectedUserName: targetUser.name,
        selectedUserEmail: targetUser.email,
      },
    });
  };

  const handleCallMember = (member) => {
    const targetUser = getMemberContactTarget(member);
    if (!targetUser) return;

    void meetings.startDirectCall(targetUser, { mode: "audio" });
  };

  const layoutProps = {
    showFloatingActions: false,
    contentClassName: "!p-0 h-full !overflow-hidden",
    contentInnerClassName: "!max-w-none !w-full !m-0 h-full min-h-0",
  };

  return (
    <AdminLayout {...layoutProps}>
      <div className="relative flex h-full min-h-0 w-full overflow-hidden border-t border-brand-line md:border-t-0 bg-white">
        {isSidebarOpen ? (
          <div
            className="absolute inset-0 z-10 bg-brand-ink/10 backdrop-blur-[2px] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <TeamSidebar
          channels={channels}
          selectedChannel={selectedChannel}
          onSelectChannel={(channel) => {
            actions.setSelectedChannel(channel);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isLoading={isLoading}
          error={error}
          createDialog={createDialog}
        />

        <TeamChat
          selectedChannel={selectedChannel}
          isLoading={selectedChannel ? isMessagesLoading : isLoading}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenMembers={actions.openMembersPanel}
          onOpenScheduleMeeting={() => setScheduleDialogOpen(true)}
          onStartChannelCall={() => meetings.startChannelCall(selectedChannel, { mode: "video" })}
          onChatMember={handleChatMember}
          onCallMember={handleCallMember}
          onRemoveMember={actions.removeMemberFromChannel}
          removingMemberIds={membersDialog.removingMemberIds}
          onDeleteChannel={() => deleteDialog.onOpenChange(true)}
          onOpenSettings={actions.openSettings}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          messages={messages}
          bottomRef={bottomRef}
          messageInput={messageInput}
          editingMessageId={editingMessageId}
          onMessageInputChange={(event) => setMessageInput(event.target.value)}
          onMessageInputKeyDown={handleChannelMessageKeyDown}
          onSendMessage={handleSendChannelMessage}
          onUploadAttachment={uploadAttachment}
          pendingAttachment={pendingAttachment}
          onRemovePendingAttachment={removePendingAttachment}
          onCancelEdit={handleCancelEditMessage}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyState({ channelId: null, target: null })}
          isSending={isSending}
          onAddReaction={addReaction}
          onRemoveReaction={removeReaction}
          onEditMessage={handleEditChannelMessage}
          onDeleteMessage={deleteMessage}
          onPinMessage={handlePinMessage}
          onUnpinMessage={unpinMessage}
          onShowDeliveryStatus={showDeliveryStatus}
          onLoadThreadMessages={loadThreadMessages}
          onReplyMessage={(message) => {
            setActiveTab("chat");
            setEditingMessageId(null);
            setReplyState({ channelId: selectedChannelId, target: message });
          }}
          onForwardMessage={forwardMessage}
          onTranslateMessage={translateMessage}
          onSummarizeMessage={summarizeMessage}
          isMessageSearchOpen={isMessageSearchOpen}
          setIsMessageSearchOpen={setIsMessageSearchOpen}
          messageSearchQuery={messageSearchQuery}
          setMessageSearchQuery={setMessageSearchQuery}
          searchMessagesQuery={searchMessagesQuery}
          hasMoreMessages={hasMoreMessages}
          isLoadingOlderMessages={isLoadingOlderMessages}
          onLoadOlderMessages={loadOlderMessages}
          calendarEvents={calendarEvents}
          isCalendarLoading={isCalendarLoading}
          session={session}
        />

        <ScheduleTeamMeetingDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          selectedChannel={selectedChannel}
          memberCount={selectedChannelMemberCount}
          isScheduling={isSchedulingMeeting}
          onSchedule={handleScheduleChannelMeeting}
        />

        <AddMemberDialog
          open={memberDialog.open}
          onOpenChange={memberDialog.onOpenChange}
          selectedChannel={selectedChannel}
          addMemberSource={memberDialog.addMemberSource}
          addMemberTeamId={memberDialog.addMemberTeamId}
          setAddMemberTeamId={memberDialog.setAddMemberTeamId}
          allowedCrossTeamIds={memberDialog.allowedCrossTeamIds}
          teams={memberDialog.teams}
          memberSearchQuery={memberDialog.memberSearchQuery}
          setMemberSearchQuery={memberDialog.setMemberSearchQuery}
          memberRole={memberDialog.memberRole}
          setMemberRole={memberDialog.setMemberRole}
          addMemberError={memberDialog.addMemberError}
          teamMembers={memberDialog.teamMembers}
          isFetchingTeamMembers={memberDialog.isFetchingTeamMembers}
          selectedMemberIds={memberDialog.selectedMemberIds}
          toggleMemberSelection={memberDialog.toggleMemberSelection}
          isAddingMember={memberDialog.isAddingMember}
          handleAddMembers={memberDialog.handleAddMembers}
          onBack={() => {
            memberDialog.onOpenChange(false);
            membersDialog.onOpenChange(true);
          }}
        />

        <MembersDialog
          open={membersDialog.open}
          onOpenChange={membersDialog.onOpenChange}
          selectedChannel={selectedChannel}
          isFetchingChannelMembers={membersDialog.isFetchingChannelMembers}
          channelMembers={membersDialog.channelMembers}
          onAddMember={() => {
            membersDialog.onOpenChange(false);
            actions.openAddMemberDialog("team");
          }}
          onAddOtherTeamMember={() => {
            membersDialog.onOpenChange(false);
            actions.openAddMemberDialog("other");
          }}
        />

        <DeleteTeamDialog
          open={deleteDialog.open}
          onOpenChange={deleteDialog.onOpenChange}
          selectedChannel={selectedChannel}
          isDeletingChannel={deleteDialog.isDeletingChannel}
          onDelete={deleteDialog.onDelete}
        />

        <TeamSettingsDialog
          open={settingsDialog.open}
          onOpenChange={settingsDialog.onOpenChange}
          selectedChannel={selectedChannel}
          teams={settingsDialog.teams}
          settingsForm={settingsDialog.settingsForm}
          setSettingsForm={settingsDialog.setSettingsForm}
          isSavingSettings={settingsDialog.isSavingSettings}
          isArchivingChannel={settingsDialog.isArchivingChannel}
          onSave={settingsDialog.onSave}
          onArchive={settingsDialog.onArchive}
          onUnarchive={settingsDialog.onUnarchive}
        />

        <Dialog open={replacePinDialogOpen} onOpenChange={setReplacePinDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-brand-neutral">
            <DialogHeader>
              <DialogTitle>Replace the current pinned message?</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplacePinDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmReplacePinned}>Replace</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
