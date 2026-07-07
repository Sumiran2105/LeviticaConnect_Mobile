import {
  Globe,
  Loader2,
  Lock,
  Archive,
  ArchiveRestore,
  Search,
  Settings,
  Trash2,
  UserPlus,
  Users,
  Users2,
  X,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getRoleLabel,
  isChannelArchived,
  getUserAvatar,
  getUserEmail,
  getUserId,
  getUserName,
} from "@/features/teams/utils/team-utils";

function UserAvatar({ avatar, name, className = "size-9" }) {
  if (avatar) {
    return <img src={avatar} alt={name} className={cn(className, "rounded-full object-cover flex-shrink-0")} />;
  }

  return (
    <div className={cn(className, "rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0")}>
      <span className="text-sm font-bold text-brand-primary">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export function AddMemberDialog({
  open,
  onOpenChange,
  selectedChannel,
  addMemberSource,
  addMemberTeamId,
  setAddMemberTeamId,
  allowedCrossTeamIds = [],
  teams = [],
  memberSearchQuery,
  setMemberSearchQuery,
  memberRole,
  setMemberRole,
  addMemberError,
  teamMembers,
  isFetchingTeamMembers,
  selectedMemberIds,
  toggleMemberSelection,
  isAddingMember,
  handleAddMembers,
  onBack,
}) {
  const crossTeams = teams.filter((team) => allowedCrossTeamIds.includes(String(team.id)));
  const filteredMembers = teamMembers.filter((member) => {
    const query = memberSearchQuery.trim().toLowerCase();
    const name = getUserName(member, getUserId(member), member?.role).toLowerCase();
    const email = getUserEmail(member).toLowerCase();
    return !query || name.includes(query) || email.includes(query);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-3xl border-none bg-white p-0 shadow-2xl">
        <DialogHeader className="px-6 md:px-8 pt-8 pb-4">
          <div className="flex items-start gap-3">
            {onBack ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 -ml-2 rounded-full text-brand-secondary hover:text-brand-ink shrink-0"
                onClick={onBack}
              >
                <ArrowLeft className="size-5" />
              </Button>
            ) : null}
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-brand-ink">
                {addMemberSource === "other" ? "Add other department member" : "Add member"} to{" "}
                {selectedChannel?.name ? `#${selectedChannel.name}` : "team"}
              </DialogTitle>
              <DialogDescription className="text-sm text-brand-secondary mt-1">
                {addMemberSource === "other"
                  ? "Search across workspace users and add the right person to this team."
                  : "Select users from this team's department and add them to this team."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 md:px-8 pb-8 space-y-5 min-w-0 w-full">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
            {addMemberSource === "other" ? (
              <div className="space-y-2 md:col-span-2">
                <Label className="text-brand-ink font-semibold">Cross-functional department</Label>
                <Select value={addMemberTeamId || ""} onValueChange={setAddMemberTeamId}>
                  <SelectTrigger className="rounded-xl border-brand-line h-12">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)] rounded-2xl border-brand-line p-1">
                    {crossTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id} className="rounded-xl">
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-brand-ink font-semibold">
                Search members
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-secondary/40" />
                <Input
                  value={memberSearchQuery}
                  onChange={(event) => setMemberSearchQuery(event.target.value)}
                  placeholder="Filter by name or email..."
                  className="pl-9 rounded-xl border-brand-line h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-brand-ink font-semibold">Role</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger className="rounded-xl border-brand-line h-12">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {addMemberError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {addMemberError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-3xl border border-brand-line bg-white">
            <div className="max-h-[320px] overflow-y-auto overflow-x-auto [scrollbar-width:thin]">
              {isFetchingTeamMembers ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-brand-secondary">
                  <Loader2 className="size-4 animate-spin" />
                  Loading team members...
                </div>
              ) : teamMembers.length === 0 && !addMemberError ? (
                <div className="py-12 text-center text-sm text-brand-secondary">
                  {addMemberSource === "other"
                    ? "Select a cross-functional department to load its members."
                    : "No department members found."}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-12 text-center text-sm text-brand-secondary">
                  No members match your search.
                </div>
              ) : (
                <table className="min-w-[720px] w-full text-left">
                  <thead className="sticky top-0 z-10 bg-brand-neutral/95 backdrop-blur">
                    <tr className="border-b border-brand-line text-[10px] font-black uppercase tracking-[0.18em] text-brand-secondary">
                      <th className="w-14 px-4 py-3">Add</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3 text-right">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line">
                    {filteredMembers.map((member) => {
                      const userId = getUserId(member);
                      if (!userId) return null;

                      const userName = getUserName(member, userId, member?.role);
                      const userEmail = getUserEmail(member);
                      const avatar = getUserAvatar(member);
                      const isSelected = selectedMemberIds.has(userId);

                      return (
                        <tr
                          key={userId}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-brand-soft/40",
                            isSelected ? "bg-brand-primary/5" : "bg-white"
                          )}
                          onClick={() => toggleMemberSelection(userId)}
                        >
                          <td className="px-4 py-3">
                            <div
                              className={cn(
                                "size-5 rounded-md border-2 flex items-center justify-center transition-all",
                                isSelected ? "border-brand-primary bg-brand-primary" : "border-brand-line"
                              )}
                            >
                              {isSelected ? (
                                <svg className="size-3 text-white" fill="none" viewBox="0 0 12 12">
                                  <path
                                    d="M2 6l3 3 5-5"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar avatar={avatar} name={userName} className="size-10" />
                              <p className="truncate text-sm font-bold text-brand-ink">{userName}</p>
                            </div>
                          </td>
                          <td className="max-w-[240px] px-4 py-3">
                            <p className="truncate text-sm text-brand-secondary">{userEmail || "Not available"}</p>
                          </td>
                          <td className="max-w-[200px] px-4 py-3">
                            <p className="truncate text-sm text-brand-secondary">
                              {member._teamName || selectedChannel?.team_name || selectedChannel?.name || "Current team"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex rounded-xl bg-brand-soft px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-secondary">
                              {memberRole}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-brand-secondary">
              {selectedMemberIds.size > 0 ? (
                <span className="font-semibold text-brand-ink">{selectedMemberIds.size} selected</span>
              ) : (
                "Select people to add"
              )}
            </span>
            <Button
              type="button"
              disabled={selectedMemberIds.size === 0 || isAddingMember}
              onClick={handleAddMembers}
              className="rounded-2xl bg-brand-primary hover:bg-brand-primary/90 px-6 h-11 font-bold shadow-lg shadow-brand-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isAddingMember ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 size-4" />
                  {selectedMemberIds.size > 1
                    ? `Add ${selectedMemberIds.size} People`
                    : selectedMemberIds.size === 1
                      ? "Add 1 Person"
                      : addMemberSource === "other"
                        ? "Add Other Department Member"
                        : "Add Member"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MembersDialog({
  open,
  onOpenChange,
  selectedChannel,
  isFetchingChannelMembers,
  channelMembers,
  onAddMember,
  onAddOtherTeamMember,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-3xl border-none bg-white p-0 shadow-2xl">
        <DialogHeader className="px-6 pt-7 pb-4">
          <DialogTitle className="text-xl font-black text-brand-ink">
            Members of #{selectedChannel?.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-brand-secondary">
            People currently in this team.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-4 min-w-0 w-full">
          <div className="overflow-hidden rounded-2xl border border-brand-line bg-white">
            <div className="max-h-[380px] overflow-y-auto overflow-x-auto [scrollbar-width:thin]">
            {isFetchingChannelMembers ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-brand-secondary">
                <Loader2 className="size-4 animate-spin" /> Loading members...
              </div>
            ) : channelMembers.length === 0 ? (
              <div className="py-10 text-center text-sm text-brand-secondary">No members yet.</div>
            ) : (
              <table className="min-w-[640px] w-full text-left">
                <thead className="sticky top-0 z-10 bg-brand-neutral/95 backdrop-blur">
                  <tr className="border-b border-brand-line text-[10px] font-black uppercase tracking-[0.18em] text-brand-secondary">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-right">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line">
                  {channelMembers.map((member, index) => {
                    const userId = getUserId(member);
                    const profile = member?._user || member;
                    const role = member?.role || "user";
                    const name = getUserName(profile, userId, role);
                    const email = getUserEmail(profile);
                    const avatar = getUserAvatar(profile);
                    const roleLabel = getRoleLabel(role);

                    return (
                      <tr key={member?.id || userId || index} className="transition-colors hover:bg-brand-soft/40">
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar avatar={avatar} name={name} className="size-10" />
                            <p className="truncate text-sm font-bold text-brand-ink">{name}</p>
                          </div>
                        </td>
                        <td className="max-w-[280px] px-4 py-3">
                          <p className="truncate text-sm text-brand-secondary">{email || "Not available"}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex rounded-xl bg-brand-soft px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-secondary">
                            {roleLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              className="rounded-2xl bg-brand-primary hover:bg-brand-primary/90 h-11 font-bold shadow-lg shadow-brand-primary/20"
              onClick={onAddMember}
            >
              <UserPlus className="mr-2 size-4" /> Add Member
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-brand-line bg-white h-11 font-bold text-brand-ink hover:bg-brand-soft"
              onClick={onAddOtherTeamMember}
            >
              <Users className="mr-2 size-4" /> Add Other Department Member
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteTeamDialog({
  open,
  onOpenChange,
  selectedChannel,
  isDeletingChannel,
  onDelete,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none bg-white p-0 shadow-2xl">
        <DialogHeader className="px-6 pt-8 pb-4">
          <DialogTitle className="text-xl font-black text-brand-ink">Delete Team?</DialogTitle>
          <DialogDescription className="text-sm text-brand-secondary">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-brand-ink">#{selectedChannel?.name}</span>? This action{" "}
            <span className="font-semibold text-red-500">cannot be undone</span> and all messages will be
            permanently lost.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-7 flex gap-3 justify-end">
          <Button
            variant="ghost"
            className="rounded-2xl h-11 px-6"
            onClick={() => onOpenChange(false)}
            disabled={isDeletingChannel}
          >
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 px-6 bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20"
            onClick={onDelete}
            disabled={isDeletingChannel}
          >
            {isDeletingChannel ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 size-4" /> Delete Team
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeamSettingsDialog({
  open,
  onOpenChange,
  selectedChannel,
  teams = [],
  settingsForm,
  setSettingsForm,
  isSavingSettings,
  isArchivingChannel,
  onSave,
  onArchive,
  onUnarchive,
}) {
  const updateSettings = (patch) => setSettingsForm((current) => ({ ...current, ...patch }));
  const crossTeamIds = settingsForm.settings?.cross_functional_team_ids || [];
  const baseTeamId = selectedChannel?.team_id;
  const selectedCrossTeams = teams.filter((team) => crossTeamIds.includes(String(team.id)));
  const availableCrossTeams = teams.filter(
    (team) => String(team.id) !== String(baseTeamId) && !crossTeamIds.includes(String(team.id))
  );
  const updateCrossTeams = (nextIds) =>
    updateSettings({
      settings: {
        ...(settingsForm.settings || {}),
        cross_functional_team_ids: nextIds,
      },
    });
  const isArchived = isChannelArchived(selectedChannel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(88vh,900px)] flex-col gap-0 overflow-hidden rounded-3xl border-none bg-white p-0 shadow-2xl sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-brand-line/70 px-6 pb-4 pt-7">
          <DialogTitle className="text-xl font-black text-brand-ink">Team Settings</DialogTitle>
          <DialogDescription className="text-sm text-brand-secondary">
            Update the settings for <span className="font-semibold text-brand-ink">#{selectedChannel?.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label className="text-brand-ink font-semibold">Team Name</Label>
              <div className="relative">
                <Users2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-secondary/40" />
                <Input
                  value={settingsForm.name || ""}
                  onChange={(event) => updateSettings({ name: event.target.value })}
                  className="pl-9 rounded-xl border-brand-line h-11"
                  placeholder="team-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-brand-ink font-semibold">Description</Label>
              <Textarea
                value={settingsForm.description || ""}
                onChange={(event) => updateSettings({ description: event.target.value })}
                className="rounded-xl border-brand-line min-h-[72px]"
                placeholder="What is this team for?"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-brand-ink font-semibold">Topic</Label>
                <Input
                  value={settingsForm.topic || ""}
                  onChange={(event) => updateSettings({ topic: event.target.value })}
                  className="rounded-xl border-brand-line h-11"
                  placeholder="e.g. Deployments"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-brand-ink font-semibold">Purpose</Label>
                <Input
                  value={settingsForm.purpose || ""}
                  onChange={(event) => updateSettings({ purpose: event.target.value })}
                  className="rounded-xl border-brand-line h-11"
                  placeholder="Long-term goal"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-brand-ink font-semibold">Visibility</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "public", label: "Public", icon: <Globe className="size-4" /> },
                  { value: "private", label: "Private", icon: <Lock className="size-4" /> },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSettings({ visibility: option.value })}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all",
                      settingsForm.visibility === option.value
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-brand-line hover:border-brand-primary/30"
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 rounded-lg",
                        settingsForm.visibility === option.value
                          ? "bg-brand-primary text-white"
                          : "bg-brand-soft text-brand-secondary"
                      )}
                    >
                      {option.icon}
                    </div>
                    <span className="text-sm font-bold text-brand-ink">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-brand-ink font-semibold">Max Members</Label>
                <Input
                  type="number"
                  value={settingsForm.max_members || ""}
                  onChange={(event) => updateSettings({ max_members: Number(event.target.value) })}
                  className="rounded-xl border-brand-line h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-brand-ink font-semibold">Retention (Days)</Label>
                <Input
                  type="number"
                  value={settingsForm.message_retention_days || ""}
                  onChange={(event) => updateSettings({ message_retention_days: Number(event.target.value) })}
                  className="rounded-xl border-brand-line h-11"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl border border-brand-line">
              <div>
                <p className="text-sm font-bold text-brand-ink">Discoverable</p>
                <p className="text-xs text-brand-secondary">Show in team browser</p>
              </div>
              <button
                type="button"
                onClick={() => updateSettings({ is_discoverable: !settingsForm.is_discoverable })}
                className={cn(
                  "w-10 h-6 rounded-full relative transition-colors duration-200",
                  settingsForm.is_discoverable ? "bg-brand-primary" : "bg-brand-line"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 size-4 rounded-full bg-white transition-all duration-200",
                    settingsForm.is_discoverable ? "left-5" : "left-1"
                  )}
                />
              </button>
            </div>
            <div className="space-y-4 rounded-2xl border border-brand-line bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-brand-ink">Cross-functional access</p>
                  <p className="text-xs text-brand-secondary">
                    Allow this team to add members from selected departments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextValue = !settingsForm.is_cross_team;
                    updateSettings({
                      is_cross_team: nextValue,
                      settings: {
                        ...(settingsForm.settings || {}),
                        cross_functional_team_ids: nextValue ? crossTeamIds : [],
                      },
                    });
                  }}
                  className={cn(
                    "w-10 h-6 rounded-full relative transition-colors duration-200",
                    settingsForm.is_cross_team ? "bg-brand-primary" : "bg-brand-line"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 size-4 rounded-full bg-white transition-all duration-200",
                      settingsForm.is_cross_team ? "left-5" : "left-1"
                    )}
                  />
                </button>
              </div>

              {settingsForm.is_cross_team ? (
                <div className="space-y-3">
                  <Select
                    value=""
                    onValueChange={(teamId) => updateCrossTeams([...crossTeamIds, teamId])}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border-brand-line bg-white">
                      <SelectValue placeholder="Add cross-functional department" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)] rounded-2xl border-brand-line p-1">
                      {availableCrossTeams.length ? (
                        availableCrossTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id} className="rounded-xl">
                            {team.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled className="rounded-xl">
                          No more departments
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {selectedCrossTeams.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCrossTeams.map((team) => (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => updateCrossTeams(crossTeamIds.filter((teamId) => teamId !== team.id))}
                          className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-soft/60 px-3 py-1.5 text-xs font-bold text-brand-ink"
                        >
                          {team.name}
                          <X className="size-3.5 text-brand-secondary" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-brand-secondary">
                      Add at least one department to make its members available from the member picker.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-3 border-t border-brand-line bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl h-11 border-brand-line bg-white px-5 font-bold text-brand-ink hover:bg-brand-soft"
            onClick={isArchived ? onUnarchive : onArchive}
            disabled={isSavingSettings || isArchivingChannel}
          >
            {isArchivingChannel ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Updating...
              </>
            ) : isArchived ? (
              <>
                <ArchiveRestore className="mr-2 size-4" /> Unarchive
              </>
            ) : (
              <>
                <Archive className="mr-2 size-4" /> Archive
              </>
            )}
          </Button>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              className="h-11 rounded-2xl px-6"
              onClick={() => onOpenChange(false)}
              disabled={isSavingSettings}
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-2xl bg-brand-primary px-8 font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90"
              onClick={onSave}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Settings className="mr-2 size-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
