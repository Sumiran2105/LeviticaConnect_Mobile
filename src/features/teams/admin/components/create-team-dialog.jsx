import { Controller } from "react-hook-form";
import { Check, Globe, Loader2, Lock, Plus, Users, Users2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { getUserEmail, getUserId, getUserName } from "@/features/teams/utils/team-utils";
import { cn } from "@/lib/utils";

export function CreateTeamDialog({
  open,
  onOpenChange,
  teams,
  form,
  createTeamMembers = [],
  isFetchingCreateMembers = false,
  selectedCreateMemberIds = new Set(),
  toggleCreateMemberSelection,
  onSubmit,
  onInvalidSubmit,
}) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const baseTeamId = watch("team_id");
  const isCrossTeam = watch("is_cross_team");
  const crossTeamIds = watch("settings.cross_functional_team_ids") || [];
  const selectedCrossTeams = teams.filter((team) => crossTeamIds.includes(String(team.id)));
  const availableCrossTeams = teams.filter(
    (team) => String(team.id) !== String(baseTeamId) && !crossTeamIds.includes(String(team.id))
  );
  const updateCrossTeams = (nextIds) => {
    setValue("settings.cross_functional_team_ids", nextIds, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="rounded-xl hover:bg-brand-primary/10 hover:text-brand-primary">
          <Plus className="size-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="!flex h-[min(88vh,900px)] flex-col gap-0 overflow-hidden rounded-3xl border-none bg-white p-0 shadow-2xl sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-brand-line/70 px-6 pb-4 pt-7">
          <DialogTitle className="text-2xl font-black tracking-tight text-brand-ink">
            Create team
          </DialogTitle>
          <DialogDescription className="text-sm text-brand-secondary">
            Choose a department, set the team basics, and enable cross-functional access only when needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-2">
              <Label className="text-brand-ink font-semibold">Department</Label>
              <Controller
                name="team_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-12 w-full rounded-xl border-brand-line bg-white">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)] rounded-2xl border-brand-line p-1">
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} className="rounded-xl">
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.team_id ? <p className="text-xs font-medium text-red-500">{errors.team_id.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-brand-ink font-semibold">Team name</Label>
              <div className="relative">
                <Users2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-secondary/40" />
                <Input
                  id="name"
                  placeholder="Enter team name"
                  className="h-12 rounded-xl border-brand-line pl-9"
                  {...register("name")}
                />
              </div>
              {errors.name ? <p className="text-xs font-medium text-red-500">{errors.name.message}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-brand-ink font-semibold">Slug</Label>
            <Input
              id="slug"
              placeholder="Custom Slug"
              className="h-12 rounded-xl border-brand-line"
              {...register("slug")}
            />
            {errors.slug ? <p className="text-xs font-medium text-red-500">{errors.slug.message}</p> : null}
          </div>

          {errors.company_id ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errors.company_id.message}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="description" className="text-brand-ink font-semibold">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this team for?"
              className="min-h-24 rounded-xl border-brand-line"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <>
                  {[
                    { value: "public", label: "Public", description: "Department members can join", icon: Globe },
                    { value: "private", label: "Private", description: "Invite only", icon: Lock },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isActive = field.value === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex min-h-24 items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                          isActive ? "border-brand-primary bg-brand-primary/5" : "border-brand-line hover:border-brand-primary/30"
                        )}
                      >
                        <div className={cn("rounded-xl p-2", isActive ? "bg-brand-primary text-white" : "bg-brand-soft text-brand-secondary")}>
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <p className="font-black text-brand-ink">{option.label}</p>
                          <p className="text-xs text-brand-secondary">{option.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            />
          </div>

          <Controller
            name="is_cross_team"
            control={control}
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-2xl border-2 p-4 text-left transition-all",
                  field.value ? "border-brand-primary bg-brand-primary/5" : "border-brand-line"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-soft p-2 text-brand-primary">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <p className="font-black text-brand-ink">Cross-functional team</p>
                    <p className="text-xs text-brand-secondary">
                      Allows adding users from other departments.
                    </p>
                  </div>
                </div>
                <div className={cn("relative h-6 w-10 rounded-full transition-colors", field.value ? "bg-brand-primary" : "bg-brand-line")}>
                  <span className={cn("absolute top-1 size-4 rounded-full bg-white transition-all", field.value ? "left-5" : "left-1")} />
                </div>
              </button>
            )}
          />

          {isCrossTeam ? (
            <div className="space-y-3 rounded-2xl border border-brand-line bg-brand-soft/20 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
                <div>
                  <p className="text-sm font-black text-brand-ink">Cross-functional departments</p>
                  <p className="text-xs text-brand-secondary">
                    Members from selected departments become available for this team.
                  </p>
                </div>
                <Select
                  value=""
                  onValueChange={(teamId) => updateCrossTeams([...crossTeamIds, teamId])}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-brand-line bg-white">
                    <SelectValue placeholder="Add department" />
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
              </div>

              {selectedCrossTeams.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedCrossTeams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => updateCrossTeams(crossTeamIds.filter((teamId) => teamId !== team.id))}
                      className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-white px-3 py-1.5 text-xs font-bold text-brand-ink"
                    >
                      {team.name}
                      <X className="size-3.5 text-brand-secondary" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-brand-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-brand-ink">Add members</p>
                <p className="text-xs text-brand-secondary">
                  {isCrossTeam
                    ? "Select members from the base department and selected cross-functional departments."
                    : "Select members from the chosen department."}
                </p>
              </div>
              <span className="text-xs font-bold text-brand-secondary">
                {selectedCreateMemberIds.size} selected
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] rounded-2xl border border-brand-line bg-brand-soft/10">
              <div className="space-y-2 p-3">
                {isFetchingCreateMembers ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-brand-secondary">
                    <Loader2 className="size-4 animate-spin" />
                    Loading members...
                  </div>
                ) : createTeamMembers.length ? (
                  createTeamMembers.map((member) => {
                    const userId = getUserId(member);
                    if (!userId) return null;

                    const isSelected = selectedCreateMemberIds.has(userId);
                    const userName = getUserName(member, userId, member?.role);
                    const userEmail = getUserEmail(member);

                    return (
                      <button
                        key={`${member._teamId || "team"}-${userId}`}
                        type="button"
                        onClick={() => toggleCreateMemberSelection?.(userId)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left transition-all",
                          isSelected ? "border-brand-primary bg-brand-primary/5" : "border-transparent hover:border-brand-line"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-5 items-center justify-center rounded-md border-2",
                            isSelected ? "border-brand-primary bg-brand-primary" : "border-brand-line"
                          )}
                        >
                          {isSelected ? <Check className="size-3 text-white" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-brand-ink">{userName}</p>
                          {userEmail ? <p className="truncate text-xs text-brand-secondary">{userEmail}</p> : null}
                        </div>
                        <span className="rounded-full bg-brand-soft px-2 py-1 text-[10px] font-bold text-brand-secondary">
                          {member._teamName || "Department"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-sm text-brand-secondary">
                    Select a team to load members.
                  </div>
                )}
              </div>
            </div>
          </div>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-3 rounded-none border-t border-brand-line bg-white px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-2xl px-6 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-2xl bg-brand-primary px-7 font-black hover:bg-brand-primary/90"
            >
              {isSubmitting ? "Creating..." : "Create team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
