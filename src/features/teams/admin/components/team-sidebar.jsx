import { useState } from "react";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SharedTeamSidebar } from "@/features/teams/components/team-sidebar";
import { CreateTeamDialog } from "./create-team-dialog";
import { isChannelArchived } from "@/features/teams/utils/team-utils";

export function TeamSidebar({
  channels,
  selectedChannel,
  onSelectChannel,
  isOpen,
  onClose,
  isLoading = false,
  error = "",
  createDialog,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChannels = channels.filter((channel) =>
    channel.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SharedTeamSidebar
      title="Teams"
      subtitle="Manage workspace teams"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      channels={filteredChannels}
      selectedChannelId={selectedChannel?.id}
      onSelectChannel={onSelectChannel}
      isOpen={isOpen}
      onClose={onClose}
      loading={isLoading}
      error={error}
      getChannelMeta={(channel) =>
        channel.unreadCount ? String(channel.unreadCount) : isChannelArchived(channel) ? "Archived" : ""
      }
      renderHeaderAction={() => <CreateTeamDialog {...createDialog} />}
      renderBottomAction={() => (
        <Button className="h-11 w-full rounded-[20px] bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600">
          <PlusCircle className="mr-2 size-4" />
          New Message
        </Button>
      )}
    />
  );
}
