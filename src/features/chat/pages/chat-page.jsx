import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";

import { AdminLayout } from "@/layouts/admin-layout";
import { useMeetingLauncher } from "@/features/meetings/hooks/use-meeting-launcher";
import { UserLayout } from "@/layouts/user-layout";
import { ChatConversationPane } from "../components/chat-conversation-pane";
import { ChatSidebar } from "../components/chat-sidebar";
import { useChatWorkspace } from "../hooks/use-chat-workspace";
import { useTeamTyping } from "@/features/teams/hooks/use-team-typing";
import { useAuthStore } from "@/store/auth-store";
import { getSessionUserIdentifiers } from "@/features/chat/utils/chat-utils";

export function ChatPage({ layout = "user" }) {
  const location = useLocation();
  const routeTargetUser = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const selectedUserId = location.state?.selectedUserId || params.get("userId");
    const selectedUserUserId = location.state?.selectedUserUserId || params.get("userId");
    const selectedUserEmail = location.state?.selectedUserEmail || params.get("email");
    const selectedUserName = location.state?.selectedUserName || params.get("name");
    const selectedUserImage = location.state?.selectedUserImage || params.get("image");

    if (!selectedUserId && !selectedUserUserId && !selectedUserEmail) return null;

    return {
      id: selectedUserUserId || selectedUserId || selectedUserEmail,
      user_id: selectedUserUserId || selectedUserId,
      name: selectedUserName || "Unknown user",
      full_name: selectedUserName || "Unknown user",
      email: selectedUserEmail || "",
      profile_image: selectedUserImage || "",
      image: selectedUserImage || "",
    };
  }, [location.search, location.state]);
  const chat = useChatWorkspace(routeTargetUser);
  const handledSelectionKeyRef = useRef(null);
  const Layout = layout === "admin" ? AdminLayout : UserLayout;
  const meetings = useMeetingLauncher(layout);
  
  const session = useAuthStore((state) => state.session);
  const currentUserIdentifiers = useMemo(() => getSessionUserIdentifiers(session), [session]);

  const { notifyTyping, stopTyping, typingUsers } = useTeamTyping({
    channelId: chat.activeContact?.channelId,
    accessToken: session?.accessToken,
    currentUserIds: currentUserIdentifiers,
  });

  const enrichedTypingUsers = useMemo(() => {
    return typingUsers.map((user) => ({
      ...user,
      userName: chat.activeContact?.name || user.userName,
    }));
  }, [typingUsers, chat.activeContact]);

  const layoutProps = {
    showFloatingActions: false,
    contentClassName: "!p-0 h-full !overflow-hidden",
    contentInnerClassName: "!max-w-none !w-full !m-0 h-full min-h-0",
  };

  useEffect(() => {
    if (!routeTargetUser) return;
    const selectionKey = [routeTargetUser.id, routeTargetUser.user_id, routeTargetUser.email]
      .filter(Boolean)
      .join(":");
    if (handledSelectionKeyRef.current === selectionKey) return;
    handledSelectionKeyRef.current = selectionKey;

    chat.openTargetUser(routeTargetUser);

    window.history.replaceState({}, document.title, window.location.pathname);
  }, [chat, location.key, routeTargetUser]);

  function handleSendMessage() {
    if ((!chat.messageInput.trim() && !chat.pendingAttachment) || !chat.activeContact) return;
    stopTyping();
    chat.sendMessage();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function handleInputChange(e) {
    if (chat.activeContact?.channelId && e.target.value.trim()) {
      notifyTyping();
    }
    chat.handleInputChange(e);
  }

  return (
    <Layout {...layoutProps}>
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="flex h-full min-h-0 w-full overflow-hidden bg-white">
          <ChatSidebar
            activeContact={chat.activeContact}
            conversations={chat.conversations}
            deferredNewChatQuery={chat.deferredNewChatQuery}
            isLoadingConversations={chat.isLoadingConversations}
            isMobileChatOpen={chat.isMobileChatOpen}
            isNewChatMode={chat.isNewChatMode}
            onCancelSearch={chat.cancelSearch}
            onNewChatClick={chat.handleNewChatClick}
            onOpenConversation={chat.openConversation}
            onSearchChange={chat.setSearchQuery}
            onSelectSearchUser={chat.handleSelectSearchUser}
            searchInputRef={chat.searchInputRef}
            searchQuery={chat.searchQuery}
            searchUsersQuery={chat.searchUsersQuery}
            sidebarResults={chat.sidebarResults}
            unreadCountsByContactId={chat.pendingCountsByContactId}
          />

          <ChatConversationPane
            activeContact={chat.activeContact}
            activePresenceLabel={chat.activePresenceLabel}
            activeUnreadCount={chat.activeUnreadCount}
            activeTab={chat.activeTab}
            bottomRef={chat.bottomRef}
            currentMessages={chat.currentMessages}
            editingMessageId={chat.editingMessageId}
            hasMoreMessages={chat.hasMoreMessages}
            isLoading={chat.isLoadingMessages}
            isLoadingOlderMessages={chat.isLoadingOlderMessages}
            isMobileChatOpen={chat.isMobileChatOpen}
            messageInput={chat.messageInput}
            onAddReaction={chat.addReaction}
            onBack={() => chat.setIsMobileChatOpen(false)}
            onCancelEdit={chat.cancelEditMessage}
            onDeleteMessage={chat.deleteMessage}
            onEditMessage={chat.beginEditMessage}
            onLoadOlderMessages={chat.loadOlderMessages}
            onLoadThreadMessages={chat.loadThreadMessages}
            onReplyMessage={chat.setReplyTarget}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onConversationAtBottomChange={chat.setIsActiveConversationAtBottom}
            onPinMessage={chat.pinMessage}
            onRemoveReaction={chat.removeReaction}
            onRemovePendingAttachment={chat.removePendingAttachment}
            onCancelReply={chat.cancelReply}
            onSendMessage={handleSendMessage}
            onShowDeliveryStatus={chat.showDeliveryStatus}
            onSummarizeMessage={chat.summarizeMessage}
            onTranslateMessage={chat.translateMessage}
            onUploadAttachment={chat.uploadAttachment}
            pendingAttachment={chat.pendingAttachment}
            replyTarget={chat.replyTarget}
            typingUsers={enrichedTypingUsers}
            onStartAudioCall={() =>
              chat.activeContact
                ? meetings.startDirectCall(chat.activeContact, { mode: "audio" })
                : null
            }
            onStartVideoCall={() =>
              chat.activeContact
                ? meetings.startDirectCall(chat.activeContact, { mode: "video" })
                : null
            }
            onTabChange={chat.setActiveTab}
            onUnpinMessage={chat.unpinMessage}
            reactionsByMessageId={chat.reactionsByMessageId}
            sendMessageMutation={chat.sendMessageMutation}
            editMessageMutation={chat.editMessageMutation}
            isMessageSearchOpen={chat.isMessageSearchOpen}
            messageSearchQuery={chat.messageSearchQuery}
            searchMessagesQuery={chat.searchMessagesQuery}
            setIsMessageSearchOpen={chat.setIsMessageSearchOpen}
            setMessageSearchQuery={chat.setMessageSearchQuery}
          />
        </div>
      </div>

    </Layout>
  );
}
