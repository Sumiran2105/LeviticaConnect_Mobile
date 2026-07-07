import { useMemo, useState } from "react";
import { CalendarDays, PhoneCall, Search, Settings, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TeamCalendar } from "@/features/teams/admin/components/team-calendar";
import { TeamComposer } from "@/features/teams/components/team-composer";
import { TeamMessagePanel } from "@/features/teams/components/team-message-panel";
import { useTeamMembers } from "@/features/teams/hooks/use-team-members";

export function TeamChat({
  selectedChannel,
  isLoading,
  onOpenSidebar,
  onOpenMembers,
  onOpenScheduleMeeting,
  onStartChannelCall,
  onChatMember,
  onCallMember,
  onRemoveMember,
  removingMemberIds,
  onDeleteChannel,
  onOpenSettings,
  activeTab,
  onTabChange,
  messages,
  bottomRef,
  messageInput,
  editingMessageId,
  onMessageInputChange,
  onMessageInputKeyDown,
  onSendMessage,
  onUploadAttachment,
  pendingAttachment,
  onRemovePendingAttachment,
  onCancelEdit,
  replyTarget,
  onCancelReply,
  isSending,
  onAddReaction,
  onRemoveReaction,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onShowDeliveryStatus,
  onLoadThreadMessages,
  onReplyMessage,
  onForwardMessage,
  onTranslateMessage,
  onSummarizeMessage,
  isMessageSearchOpen,
  setIsMessageSearchOpen,
  messageSearchQuery,
  setMessageSearchQuery,
  searchMessagesQuery,
  hasMoreMessages,
  isLoadingOlderMessages,
  onLoadOlderMessages,
  calendarEvents,
  isCalendarLoading,
  session,
}) {
  const [removedMembersState, setRemovedMembersState] = useState({
    channelId: null,
    ids: new Set(),
  });

  // Fetch channel members for mentions
  const { members: channelMembers, isLoading: isFetchingMembers } = useTeamMembers(
    selectedChannel?.id,
    {
      accessToken: session?.accessToken,
    }
  );
  const activeChannelId = selectedChannel?.id;
  const removedMemberIds = useMemo(
    () => (removedMembersState.channelId === activeChannelId ? removedMembersState.ids : new Set()),
    [activeChannelId, removedMembersState]
  );
  const visibleChannelMembers = useMemo(
    () => channelMembers.filter((member) => !removedMemberIds.has(String(member.id))),
    [channelMembers, removedMemberIds]
  );

  const handleRemoveMember = async (member) => {
    if (!onRemoveMember) return;

    const didRemove = await onRemoveMember(member);

    if (didRemove) {
      setRemovedMembersState((current) => {
        const ids = current.channelId === activeChannelId ? new Set(current.ids) : new Set();
        ids.add(String(member.id));

        return {
          channelId: activeChannelId,
          ids,
        };
      });
    }
  };

  const channelCalendarEvents = useMemo(() => {
    const channelId = selectedChannel?.id;
    const memberIds = new Set(visibleChannelMembers.map((member) => String(member.id)).filter(Boolean));

    if (!channelId) return [];

    return (calendarEvents || []).filter((event) => {
      if (event.channel_id && String(event.channel_id) === String(channelId)) {
        return true;
      }

      const participantIds = (event.participant_ids?.length
        ? event.participant_ids
        : (event.participants || []).map((participant) => participant.id)
      )
        .filter(Boolean)
        .map(String);

      if (!participantIds.length || !memberIds.size) return false;

      const allParticipantsAreMembers = participantIds.every((id) => memberIds.has(id));
      const expectedChannelInviteSize = Math.max(1, memberIds.size - 1);

      return allParticipantsAreMembers && participantIds.length >= expectedChannelInviteSize;
    });
  }, [calendarEvents, visibleChannelMembers, selectedChannel?.id]);

  return (
    <TeamMessagePanel
      meetingVariant="admin"
      selectedChannel={selectedChannel}
      isLoading={isLoading}
      onOpenSidebar={onOpenSidebar}
      headerMeta={(channel) => channel?.description || "Team conversation"}
      headerActions={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-brand-secondary hover:bg-brand-primary/5 hover:text-brand-primary"
            onClick={onOpenScheduleMeeting}
            disabled={!selectedChannel}
            title="Schedule team meeting"
          >
            <CalendarDays className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-brand-secondary hover:bg-brand-primary/5 hover:text-brand-primary"
            onClick={onOpenMembers}
            disabled={!selectedChannel}
            title="Team members"
          >
            <Users className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-brand-secondary hover:bg-brand-primary/5 hover:text-brand-primary"
            onClick={onStartChannelCall}
            disabled={!selectedChannel}
            title="Start team call"
          >
            <PhoneCall className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-brand-secondary hover:bg-red-50 hover:text-red-500"
            onClick={onDeleteChannel}
            disabled={!selectedChannel}
            title="Delete team"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-brand-secondary hover:bg-brand-primary/5 hover:text-brand-primary"
            onClick={onOpenSettings}
            disabled={!selectedChannel}
            title="Team settings"
          >
            <Settings className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${isMessageSearchOpen
              ? "bg-brand-primary text-white hover:bg-brand-primary/90"
              : "text-brand-secondary hover:bg-brand-primary/5 hover:text-brand-primary"
              }`}
            onClick={() => setIsMessageSearchOpen(!isMessageSearchOpen)}
            disabled={!selectedChannel}
            title="Search messages"
          >
            <Search className="size-4" />
          </Button>
        </>
      }
      tabs={[
        { value: "chat", label: "Chat" },
        { value: "files", label: "Files" },
        { value: "calendar", label: "Calendar" },
        { value: "members", label: "Members" },
      ]}
      activeTab={activeTab}
      onTabChange={onTabChange}
      messages={messages}
      members={visibleChannelMembers}
      onChatMember={onChatMember}
      onCallMember={onCallMember}
      onRemoveMember={handleRemoveMember}
      removingMemberIds={removingMemberIds}
      isFetchingMembers={isFetchingMembers}
      calendarContent={
        <TeamCalendar
          events={channelCalendarEvents}
          isLoading={isCalendarLoading || isFetchingMembers}
          selectedChannel={selectedChannel}
          onScheduleMeeting={onOpenScheduleMeeting}
        />
      }
      currentUser={{
        name: session?.full_name || session?.name,
        avatar_url: session?.profile_image || session?.image,
      }}
      isMessageSearchOpen={isMessageSearchOpen}
      messageSearchQuery={messageSearchQuery}
      searchMessagesQuery={searchMessagesQuery}
      setIsMessageSearchOpen={setIsMessageSearchOpen}
      setMessageSearchQuery={setMessageSearchQuery}
      hasMoreMessages={hasMoreMessages}
      isLoadingOlderMessages={isLoadingOlderMessages}
      onLoadOlderMessages={onLoadOlderMessages}
      bottomRef={bottomRef}
      onAddReaction={onAddReaction}
      onRemoveReaction={onRemoveReaction}
      onEditMessage={onEditMessage}
      onDeleteMessage={onDeleteMessage}
      onPinMessage={onPinMessage}
      onUnpinMessage={onUnpinMessage}
      onShowDeliveryStatus={onShowDeliveryStatus}
      onLoadThreadMessages={onLoadThreadMessages}
      onReplyMessage={onReplyMessage}
      onForwardMessage={onForwardMessage}
      onTranslateMessage={onTranslateMessage}
      onSummarizeMessage={onSummarizeMessage}
      composer={
        <TeamComposer
          isSending={isSending}
          messageInput={messageInput}
          editingMessageId={editingMessageId}
          onChange={onMessageInputChange}
          onKeyDown={onMessageInputKeyDown}
          onSend={onSendMessage}
          pendingAttachment={pendingAttachment}
          onRemovePendingAttachment={onRemovePendingAttachment}
          onUploadAttachment={onUploadAttachment}
          onCancelEdit={onCancelEdit}
          replyTarget={replyTarget}
          onCancelReply={onCancelReply}
          disabled={!selectedChannel}
          placeholder={selectedChannel ? `Message #${selectedChannel.name}` : "Select a team"}
          channelMembers={channelMembers}
          isFetchingMembers={isFetchingMembers}
          onMentionInsert={(member, newMessage) => {
            // Handle mention insertion (can be extended for logging, analytics, etc.)
            console.log(`Mentioned ${member.name} in message:`, newMessage);
          }}
        />
      }
      emptySelectionTitle="No teams found"
      emptySelectionDescription={
        isLoading
          ? "Loading your workspace teams."
          : "Create the first team for this workspace."
      }
      emptyMessagesTitle="No team messages yet"
      emptyMessagesDescription="Send the first update to start this team conversation."
    />
  );
}
