import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";

const Motion = motion;
import {
  Users,
  Plus,
  Search,
  Shield,
  UserPlus,
  ShieldCheck,
  ChevronRight,
  MoreHorizontal,
  Mail,
  Building2,
  LayoutDashboard,
  Loader2,
  AlertCircle,
  Trash2
} from "lucide-react";
import { AdminLayout } from "@/layouts/admin-layout";
import {
  addAdminDepartmentMember,
  adminDepartmentQueryKeys,
  assignAdminDepartmentLead,
  createAdminDepartment,
  deleteAdminDepartment,
  getApiErrorMessage,
  removeAdminDepartmentMember,
  useAdminDepartmentDetails,
  useAdminDepartments,
  useAdminDepartmentUserSearch,
} from "../hooks/use-admin-departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

const getAvatarColor = (name) => {
  const colors = [
    "bg-[#1094EB]",
    "bg-[#3B5BFC]",
    "bg-[#9A2DF2]",
    "bg-[#F59E0B]",
    "bg-[#10B981]",
    "bg-[#EF4444]"
  ];
  if (!name) return colors[0];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const teamSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional(),
});

const memberSchema = z.object({
  teamId: z.string().min(1, "Department ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

const leadSchema = z.object({
  teamId: z.string().min(1, "Department ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isUserSelected, setIsUserSelected] = useState(false);
  const [addMemberError, setAddMemberError] = useState(null);
  const [assignLeadError, setAssignLeadError] = useState(null);
  const [isDeletingMember, setIsDeletingMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deleteDepartmentStep, setDeleteDepartmentStep] = useState(1);
  const [deleteDepartmentConfirmation, setDeleteDepartmentConfirmation] = useState("");
  const [deleteDepartmentError, setDeleteDepartmentError] = useState(null);
  const session = useAuthStore((state) => state.session);
  const accessToken = session?.accessToken;

  const departmentsQuery = useAdminDepartments(accessToken);
  const teams = useMemo(() => departmentsQuery.data || [], [departmentsQuery.data]);
  const rawSelectedTeam = useMemo(
    () =>
      teams.find((team) => team.id === selectedTeamId) ||
      teams[0] ||
      null,
    [selectedTeamId, teams]
  );
  const departmentDetailsQuery = useAdminDepartmentDetails({
    teamId: rawSelectedTeam?.id,
    accessToken,
  });
  const teamMembers = departmentDetailsQuery.data?.members || [];
  const teamAdmins = departmentDetailsQuery.data?.admins || [];
  const selectedTeam = useMemo(() => {
    if (!rawSelectedTeam) return null;

    return {
      ...rawSelectedTeam,
      lead: departmentDetailsQuery.data?.remoteLead || rawSelectedTeam.lead,
      memberCount: departmentDetailsQuery.data?.members?.length ?? rawSelectedTeam.memberCount,
    };
  }, [departmentDetailsQuery.data, rawSelectedTeam]);

  const hasLead = teamAdmins.length > 0 || Boolean(selectedTeam?.lead && selectedTeam.lead.toLowerCase() !== "unassigned");
  const userSearchQueryResult = useAdminDepartmentUserSearch({
    query: userSearchQuery,
    accessToken,
    enabled: activeModal === "add-member" || activeModal === "assign-lead",
  });
  const userSearchResults = userSearchQuery.trim().length >= 2 ? userSearchQueryResult.data || [] : [];

  const isLoading = departmentsQuery.isLoading;
  const error = departmentsQuery.error
    ? getApiErrorMessage(departmentsQuery.error, "Failed to load departments")
    : null;
  const isMembersLoading = departmentDetailsQuery.isLoading;
  const membersError = departmentDetailsQuery.error
    ? getApiErrorMessage(departmentDetailsQuery.error, "Failed to load members")
    : null;
  const isSearchingUsers = userSearchQueryResult.isFetching;

  const teamForm = useForm({ resolver: zodResolver(teamSchema), defaultValues: { name: "", description: "" } });
  const memberForm = useForm({ resolver: zodResolver(memberSchema), defaultValues: { teamId: selectedTeam?.id || "", userId: "" } });
  const leadForm = useForm({ resolver: zodResolver(leadSchema), defaultValues: { teamId: selectedTeam?.id || "", userId: "" } });

  useEffect(() => {
    if (!teams.length) {
      setSelectedTeamId(null);
      return;
    }

    if (!selectedTeamId || !teams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [selectedTeamId, teams]);

  useEffect(() => {
    if (selectedTeam) {
      memberForm.setValue("teamId", selectedTeam.id);
      leadForm.setValue("teamId", selectedTeam.id);
    }
  }, [selectedTeam, memberForm, leadForm]);

  const handleUserSearch = async (query) => {
    setUserSearchQuery(query);
    if (!query || query.length < 2) {
      return;
    }
  };

  const createDepartmentMutation = useMutation({
    mutationFn: ({ name }) => createAdminDepartment({ name, accessToken }),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }) => addAdminDepartmentMember({ teamId, userId, accessToken }),
  });

  const assignLeadMutation = useMutation({
    mutationFn: ({ teamId, userId }) => assignAdminDepartmentLead({ teamId, userId, accessToken }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }) => removeAdminDepartmentMember({ teamId, userId, accessToken }),
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: ({ teamId }) => deleteAdminDepartment({ teamId, accessToken }),
  });
  const isCreating = createDepartmentMutation.isPending;
  const isAddingMember = addMemberMutation.isPending;
  const isAssigningLead = assignLeadMutation.isPending;
  const isDeletingDepartment = deleteDepartmentMutation.isPending;

  const invalidateDepartments = async (teamId) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminDepartmentQueryKeys.list(accessToken) }),
      teamId
        ? queryClient.invalidateQueries({ queryKey: adminDepartmentQueryKeys.details(teamId, accessToken) })
        : Promise.resolve(),
    ]);
  };

  const onHandleCreateTeam = async (data) => {
    setCreateError(null);

    const normalizedName = data.name?.replace(/\s+/g, ' ').trim() || "";
    const isDuplicate = teams.some(
      (team) => team.name?.replace(/\s+/g, ' ').toLowerCase().trim() === normalizedName.toLowerCase()
    );

    if (isDuplicate) {
      setCreateError(`A department named "${normalizedName}" already exists.`);
      return;
    }

    try {
      const created = await createDepartmentMutation.mutateAsync({ name: normalizedName });
      await invalidateDepartments();
      setSelectedTeamId(created.id);
      setActiveModal(null);
      teamForm.reset();
    } catch (err) {
      setCreateError(getApiErrorMessage(err, "Failed to create department. Please try again."));
    }
  };

  const onHandleAddMember = async (data) => {
    setAddMemberError(null);
    try {
      await addMemberMutation.mutateAsync({ teamId: data.teamId, userId: data.userId });
      await invalidateDepartments(data.teamId);
      setActiveModal(null);
      memberForm.reset();
    } catch (err) {
      console.error("Add member error:", err);
      setAddMemberError(getApiErrorMessage(err, "Failed to add member"));
    }
  };

  const onHandleAssignLead = async (data) => {
    setAssignLeadError(null);
    try {
      await assignLeadMutation.mutateAsync({ teamId: data.teamId, userId: data.userId });
      await invalidateDepartments(data.teamId);
      setActiveModal(null);
      leadForm.reset();
    } catch (err) {
      console.error("Assign lead error:", err);
      setAssignLeadError(getApiErrorMessage(err, "Failed to assign lead"));
    }
  };

  const onHandleRemoveMember = async (userId) => {
    if (!selectedTeam) return;

    setIsDeletingMember(userId);
    try {
      await removeMemberMutation.mutateAsync({ teamId: selectedTeam.id, userId });
      await invalidateDepartments(selectedTeam.id);
    } catch (err) {
      console.error("Remove member error:", err);
    } finally {
      setIsDeletingMember(null);
    }
  };

  const closeDeleteDepartmentDialog = () => {
    if (deleteDepartmentMutation.isPending) return;
    setDepartmentToDelete(null);
    setDeleteDepartmentStep(1);
    setDeleteDepartmentConfirmation("");
    setDeleteDepartmentError(null);
  };

  const onHandleDeleteDepartment = async () => {
    if (!departmentToDelete || deleteDepartmentConfirmation?.trim().toLowerCase() !== departmentToDelete.name?.toLowerCase()) return;

    setDeleteDepartmentError(null);
    try {
      await deleteDepartmentMutation.mutateAsync({ teamId: departmentToDelete.id });
      const remainingTeams = teams.filter((team) => team.id !== departmentToDelete.id);
      queryClient.setQueryData(adminDepartmentQueryKeys.list(accessToken), remainingTeams);
      setSelectedTeamId((currentTeamId) =>
        currentTeamId === departmentToDelete.id ? remainingTeams[0]?.id || null : currentTeamId
      );
      await invalidateDepartments(departmentToDelete.id);
      setDepartmentToDelete(null);
      setDeleteDepartmentStep(1);
      setDeleteDepartmentConfirmation("");
    } catch (err) {
      console.error("Delete department error:", err);
      setDeleteDepartmentError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to delete department. Please try again."
      );
    }
  };

  const layoutProps = {
    contentClassName: "!p-0 h-full !overflow-hidden",
    contentInnerClassName: "!max-w-none !w-full !m-0 h-full min-h-0",
  };

  return (
    <AdminLayout {...layoutProps}>
      <Motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex h-full min-h-0 w-full overflow-hidden border-t md:border-t-0 border-brand-line bg-[#f8fafc]"
      >
        {isSidebarOpen && (
          <div
            className="absolute inset-0 z-10 bg-brand-ink/20 backdrop-blur-[2px] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            "absolute inset-y-0 left-0 z-20 w-72 flex-col border-r border-brand-line bg-white transform transition-transform duration-300 md:relative md:translate-x-0 md:flex",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-brand-ink">
                {toUserCamelCase("departments")}
              </h2>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-xl hover:bg-brand-primary/10 hover:text-brand-primary"
                onClick={() => setActiveModal("create")}
              >
                <Plus className="size-5" />
              </Button>
            </div>

            <div className="mt-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-secondary/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search departments..."
                className="w-full bg-white/50 border border-brand-line/60 rounded-xl py-2.5 pl-9 pr-4 text-xs focus:ring-2 focus:ring-brand-primary/10 transition-all font-medium placeholder:text-brand-secondary/40 lowercase"
              />
            </div>
          </div>

          <div className="flex-1 px-4 overflow-y-auto pb-6 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-ink/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-brand-ink/20">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-brand-secondary/40">
                <Loader2 className="size-8 animate-spin mb-4 text-brand-primary" />
                <p className="text-xs font-bold uppercase tracking-widest">
                  {toUserCamelCase("loading departments")}...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-red-500/60">
                <AlertCircle className="size-8 mb-4 opacity-40" />
                <p className="text-xs font-bold uppercase tracking-widest mb-1">
                  {toUserCamelCase("error loading")}
                </p>
                <p className="text-[10px] font-medium leading-relaxed">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-brand-primary h-8"
                  onClick={() => departmentsQuery.refetch()}
                >
                  {toUserCamelCase("try again")}
                </Button>
              </div>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-brand-secondary/40">
                <Users className="size-8 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">
                  {toUserCamelCase("no departments found")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-brand-primary h-8"
                  onClick={() => setActiveModal("create")}
                >
                  {toUserCamelCase("create first department")}
                </Button>
              </div>
            ) : (
              <Motion.div variants={containerVariants} className="space-y-2">
                {teams
                  .filter((t) => t.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((team) => (
                    <Motion.button
                      variants={itemVariants}
                      key={team.id}
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition-all duration-300",
                        selectedTeam?.id === team.id
                          ? "bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white shadow-lg shadow-brand-primary/20 scale-[1.02]"
                          : "text-brand-secondary hover:bg-brand-primary/5 hover:text-brand-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-9 items-center justify-center rounded-xl transition-colors",
                            selectedTeam?.id === team.id ? "bg-white/20" : "bg-brand-soft"
                          )}
                        >
                          <Users className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[140px]">
                            {toUserCamelCase(team.name)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform duration-300",
                          selectedTeam?.id === team.id
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                        )}
                      />
                    </Motion.button>
                  ))}
              </Motion.div>
            )}
          </div>
        </aside>

        <Motion.main
          variants={itemVariants}
          className="flex flex-1 flex-col bg-[#f8fafc] overflow-hidden"
        >
          <header className="flex h-16 md:h-20 shrink-0 items-center justify-between border-b border-brand-line bg-white/80 px-4 backdrop-blur md:px-10">
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <LayoutDashboard className="size-5 text-brand-ink" />
              </Button>
              <div className="flex size-9 md:size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary hidden sm:flex">
                <Users className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-brand-ink truncate">
                  {selectedTeam ? toUserCamelCase(selectedTeam.name) : toUserCamelCase("select a department")}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedTeam}
                className="rounded-xl font-bold border-brand-line text-brand-ink hover:bg-brand-soft hidden sm:flex disabled:opacity-50"
                onClick={() => {
                  leadForm.setValue("teamId", selectedTeam.id);
                  setActiveModal("assign-lead");
                }}
              >
                <ShieldCheck className="md:mr-2 size-4 text-brand-primary" />
                <span className="hidden md:inline">{toUserCamelCase("assign lead")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedTeam}
                className="rounded-xl font-bold border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 hidden sm:flex disabled:opacity-50"
                onClick={() => {
                  setDepartmentToDelete(selectedTeam);
                  setDeleteDepartmentStep(1);
                  setDeleteDepartmentConfirmation("");
                  setDeleteDepartmentError(null);
                }}
              >
                <Trash2 className="md:mr-2 size-4" />
                <span className="hidden md:inline">{toUserCamelCase("delete")}</span>
              </Button>
              <Button
                size="sm"
                disabled={!selectedTeam}
                className="rounded-xl font-bold bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white shadow-lg shadow-brand-primary/20 px-3 md:px-4 disabled:opacity-50 border-0 hover:opacity-90 transition-opacity"
                onClick={() => {
                  memberForm.setValue("teamId", selectedTeam.id);
                  setActiveModal("add-member");
                }}
              >
                <UserPlus className="sm:mr-2 size-4 shrink-0" />
                <span className="hidden sm:inline">{toUserCamelCase("add member")}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!selectedTeam}
                className="sm:hidden rounded-xl shrink-0 disabled:opacity-50"
                onClick={() => {
                  leadForm.setValue("teamId", selectedTeam.id);
                  setActiveModal("assign-lead");
                }}
              >
                <MoreHorizontal className="size-5 text-brand-secondary" />
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-ink/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {!selectedTeam ? (
              <div className="h-full flex flex-col items-center justify-center text-brand-secondary/40 p-10">
                <div className="size-20 bg-brand-soft rounded-[40px] flex items-center justify-center mb-6">
                  <Users className="size-10 opacity-20" />
                </div>
                <h4 className="text-xl font-bold text-brand-ink mb-2">
                  {toUserCamelCase("select a department")}
                </h4>
                <p className="text-sm font-medium mb-8 max-w-xs text-center lowercase">
                  choose a department from the sidebar to view its members, leads, and configuration.
                </p>
                {teams.length === 0 && !isLoading && (
                  <Button
                    className="rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white px-8 border-0 hover:opacity-90"
                    onClick={() => setActiveModal("create")}
                  >
                    <Plus className="mr-2 size-4" />
                    {toUserCamelCase("create first department")}
                  </Button>
                )}
              </div>
            ) : (
              <Motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="p-6 md:p-10 space-y-10"
              >
                <Motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="p-5 md:p-8 rounded-3xl border border-brand-line bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/40">
                      {toUserCamelCase("department members")}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <h4 className="text-3xl md:text-4xl font-extrabold text-brand-ink">
                        {selectedTeam.memberCount}
                      </h4>
                      <Users className="size-6 md:size-8 text-brand-secondary/10" />
                    </div>
                  </div>
                  <div className="p-5 md:p-8 rounded-3xl border border-brand-line bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/40">
                      {toUserCamelCase("department admins")}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <h4 className="text-lg md:text-xl font-bold text-brand-ink truncate pr-2">
                        {teamAdmins.length > 0
                          ? teamAdmins.map((a) => toUserCamelCase(a.name || a.username || a.email)).join(", ")
                          : toUserCamelCase(selectedTeam.lead) || toUserCamelCase("unassigned")}
                      </h4>
                      <Shield className="size-6 md:size-8 text-brand-secondary/10" />
                    </div>
                  </div>
                  <div className="p-5 md:p-8 rounded-3xl border border-brand-line bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/40">
                      {toUserCamelCase("status")}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                      <h4 className="text-lg md:text-xl font-bold text-brand-ink uppercase tracking-wider">
                        {toUserCamelCase("active")}
                      </h4>
                    </div>
                  </div>
                </Motion.div>

                <Motion.div variants={itemVariants} className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <h4 className="text-sm font-bold tracking-tight text-brand-ink">
                      {toUserCamelCase("company users")}
                    </h4>
                    <span className="text-[10px] font-bold text-brand-primary underline cursor-pointer">
                      {toUserCamelCase("view all")}
                    </span>
                  </div>

                  {isMembersLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-brand-secondary/40">
                      <Loader2 className="size-6 animate-spin mb-4 text-brand-primary" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">
                        {toUserCamelCase("loading members")}...
                      </p>
                    </div>
                  ) : membersError ? (
                    <div className="p-8 rounded-2xl border border-dashed border-red-100 bg-red-50/30 text-center">
                      <p className="text-xs font-bold text-red-500/60 uppercase tracking-widest">{membersError}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-brand-primary h-8"
                        onClick={() => departmentDetailsQuery.refetch()}
                      >
                        {toUserCamelCase("retry")}
                      </Button>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="p-12 rounded-2xl border border-dashed border-brand-line bg-brand-soft/20 text-center">
                      <Users className="size-8 mx-auto mb-4 opacity-10 text-brand-ink" />
                      <p className="text-xs font-bold text-brand-secondary/40 uppercase tracking-widest">
                        {toUserCamelCase("no members in this department")}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[32px] border border-brand-line p-6 shadow-sm">
                      <div className="max-h-[350px] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-ink/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                        <div className="space-y-3">
                          {teamMembers.map((member, i) => {
                            const isLead =
                              member.is_admin ||
                              member.is_lead ||
                              teamAdmins.some(
                                (admin) =>
                                  (admin.id && admin.id === member.id) ||
                                  (admin.user_id && admin.user_id === member.user_id) ||
                                  (admin.email && admin.email === member.email) ||
                                  (admin.username && admin.username === member.username)
                              ) ||
                              (selectedTeam.lead &&
                                (member.id === selectedTeam.lead ||
                                  member.user_id === selectedTeam.lead ||
                                  member.email === selectedTeam.lead ||
                                  member.username === selectedTeam.lead ||
                                  member.name === selectedTeam.lead)) ||
                              member.role === "LEAD" ||
                              member.role === "TEAM_LEAD" ||
                              member.role === "ADMIN";

                            const displayName =
                              member.name ||
                              member.full_name ||
                              (member.first_name ? `${member.first_name} ${member.last_name || ""}` : null) ||
                              member.username ||
                              member.user?.name ||
                              member.user?.full_name ||
                              (member.email ? member.email.split("@")[0] : "Department Member");

                            const mobileNumber =
                              member.mobile_number ||
                              member.mobile ||
                              member.phone ||
                              member.phone_number ||
                              member.user?.mobile_number ||
                              member.user?.mobile ||
                              "Not Available";

                            return (
                              <div
                                key={member.id || i}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl border border-brand-line bg-white hover:border-brand-primary/30 transition-all group"
                              >
                                <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto overflow-hidden">
                                  <div
                                    className={`shrink-0 size-10 rounded-xl flex items-center justify-center font-bold text-white uppercase ${getAvatarColor(
                                      displayName
                                    )}`}
                                  >
                                    {displayName[0]}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1 sm:mb-0">
                                      <p className="text-sm font-bold text-brand-ink leading-tight sm:leading-none truncate">
                                        {toUserCamelCase(displayName)}
                                      </p>
                                      {isLead && (
                                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 animate-in fade-in zoom-in duration-300">
                                          {toUserCamelCase("department lead")}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-brand-secondary truncate leading-none">{member.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto mt-1 sm:mt-0 pl-[52px] sm:pl-0">
                                  <span className="text-xs font-bold text-brand-secondary/80 truncate">
                                    {mobileNumber}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0 -mr-2 sm:mr-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-brand-secondary sm:opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50 size-8 sm:size-10"
                                      onClick={() => setMemberToDelete(member)}
                                      disabled={isDeletingMember === (member.id || member.user_id || member.email)}
                                    >
                                      {isDeletingMember === (member.id || member.user_id || member.email) ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="size-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-brand-secondary sm:opacity-0 group-hover:opacity-100 transition-opacity size-8 sm:size-10"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </Motion.div>
              </Motion.div>
            )}
          </div>
        </Motion.main>
      </Motion.div>

      <Dialog
        open={activeModal === "create"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setCreateError(null);
            setUserSearchQuery("");
            teamForm.reset();
          }
        }}
      >
        <DialogContent className="rounded-3xl md:rounded-[32px] border-none bg-white p-0 shadow-2xl w-[95vw] max-w-lg overflow-hidden">
          <DialogHeader className="px-8 pt-8 pb-4">
            <DialogTitle className="text-2xl font-bold text-brand-ink">
              {toUserCamelCase("create a department")}
            </DialogTitle>
            <DialogDescription className="text-brand-secondary font-medium lowercase">
              organize your workforce into cohesive units to manage access and collaboration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={teamForm.handleSubmit(onHandleCreateTeam)} className="px-8 pb-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-brand-ink font-bold ml-1">{toUserCamelCase("department name")}</Label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-brand-secondary/40" />
                <Input
                  placeholder="e.g. design systems"
                  className="pl-11 h-12 bg-brand-neutral/50 border-0 rounded-2xl focus:ring-brand-primary/20 placeholder:text-brand-secondary/40 lowercase"
                  disabled={isCreating}
                  {...teamForm.register("name")}
                />
              </div>
              {teamForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1 ml-1 font-bold">{teamForm.formState.errors.name.message}</p>
              )}
            </div>
            {createError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-medium lowercase">
                {createError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={isCreating}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white font-bold text-sm shadow-lg shadow-brand-primary/20 disabled:opacity-60 disabled:cursor-not-allowed border-0 hover:opacity-95"
              >
                {isCreating ? "creating..." : toUserCamelCase("create department")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal === "add-member"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setUserSearchQuery("");
            setAddMemberError(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl md:rounded-[32px] border-none bg-white p-0 shadow-2xl w-[95vw] max-w-md overflow-visible">
          <DialogHeader className="px-8 pt-8 pb-4">
            <DialogTitle className="text-2xl font-bold text-brand-ink text-center">
              {toUserCamelCase("add department member")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={memberForm.handleSubmit(onHandleAddMember)} className="px-8 pb-8 space-y-6 text-center">
            <div className="space-y-4">
              <div className="space-y-2 text-left relative">
                <Label className="text-brand-ink font-bold ml-1">{toUserCamelCase("user id email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-brand-secondary/40" />
                  <Input
                    placeholder="enter user unique identifier"
                    className="pl-11 h-12 bg-brand-neutral/50 border-0 rounded-2xl focus:ring-brand-primary/20 placeholder:text-brand-secondary/40 lowercase"
                    onChange={(e) => {
                      memberForm.setValue("userId", e.target.value);
                      setIsUserSelected(false);
                      handleUserSearch(e.target.value);
                    }}
                    value={userSearchQuery}
                    disabled={isAddingMember}
                  />
                  {isSearchingUsers && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 size-4 animate-spin text-brand-primary/40" />
                  )}
                </div>
                {memberForm.formState.errors.userId && (
                  <p className="text-xs text-red-500 mt-1 ml-1 font-bold">{memberForm.formState.errors.userId.message}</p>
                )}
                {addMemberError && <p className="text-xs text-red-500 mt-1 ml-1 font-bold lowercase">{addMemberError}</p>}

                {!isUserSelected && userSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white rounded-2xl border border-brand-line shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <ScrollArea className="max-h-[220px]">
                      <div className="p-2 space-y-1">
                        {userSearchResults.map((user) => (
                          <button
                            key={user.id || user._id}
                            type="button"
                            onClick={() => {
                              memberForm.setValue("userId", user.id || user.email || user.username);
                              setUserSearchQuery(user.name || user.username || user.email);
                              setIsUserSelected(true);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-soft transition-colors text-left group"
                          >
                            <div className="size-8 rounded-lg bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary text-xs">
                              {(user.name || user.username || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-brand-ink group-hover:text-brand-primary transition-colors">
                                  {toUserCamelCase(user.name || user.username)}
                                </p>
                                {teamAdmins.some(
                                  (admin) =>
                                    (admin.id && admin.id === user.id) ||
                                    (admin.user_id && admin.user_id === user.id) ||
                                    (admin.email && admin.email === user.email)
                                ) && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/10">
                                    {toUserCamelCase("admin")}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-brand-secondary lowercase">{user.email || user.id}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
            <Button
              type="submit"
              disabled={isAddingMember}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white font-bold text-sm shadow-lg shadow-brand-primary/20 disabled:opacity-50 border-0 hover:opacity-95"
            >
              {isAddingMember ? "adding..." : toUserCamelCase("add to department")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal === "assign-lead"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setUserSearchQuery("");
            setAssignLeadError(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl md:rounded-[32px] border-none bg-white p-0 shadow-2xl w-[95vw] max-w-md overflow-visible">
          <DialogHeader className="px-8 pt-8 pb-4">
            <DialogTitle className="text-2xl font-bold text-brand-ink text-center">
              {toUserCamelCase("assign department lead")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={leadForm.handleSubmit(onHandleAssignLead)} className="px-8 pb-8 space-y-6 text-center">
            <div className="p-4 bg-brand-soft rounded-2xl flex items-center gap-4 text-left">
              <div className="size-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                L
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-brand-ink">{toUserCamelCase("leadership access")}</h4>
                <p className="text-[10px] text-brand-secondary lowercase font-medium">
                  department leads can manage members and settings.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2 text-left relative">
                <Label className="text-brand-ink font-bold ml-1">{toUserCamelCase("user id name")}</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-brand-secondary/40" />
                  <Input
                    placeholder="enter user unique identifier"
                    className="pl-11 h-12 bg-brand-neutral/50 border-0 rounded-2xl focus:ring-brand-primary/20 placeholder:text-brand-secondary/40 lowercase"
                    onChange={(e) => {
                      leadForm.setValue("userId", e.target.value);
                      setIsUserSelected(false);
                      handleUserSearch(e.target.value);
                    }}
                    value={userSearchQuery}
                    disabled={isAssigningLead}
                  />
                  {isSearchingUsers && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 size-4 animate-spin text-brand-primary/40" />
                  )}
                </div>
                {leadForm.formState.errors.userId && (
                  <p className="text-xs text-red-500 mt-1 ml-1 font-bold">{leadForm.formState.errors.userId.message}</p>
                )}
                {assignLeadError && <p className="text-xs text-red-500 mt-1 ml-1 font-bold lowercase">{assignLeadError}</p>}

                {!isUserSelected && userSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white rounded-2xl border border-brand-line shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <ScrollArea className="max-h-[220px]">
                      <div className="p-2 space-y-1">
                        {userSearchResults.map((user) => (
                          <button
                            key={user.id || user._id}
                            type="button"
                            onClick={() => {
                              leadForm.setValue("userId", user.id || user.email || user.username);
                              setUserSearchQuery(user.name || user.username || user.email);
                              setIsUserSelected(true);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-soft transition-colors text-left group"
                          >
                            <div className="size-8 rounded-lg bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary text-xs">
                              {(user.name || user.username || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-brand-ink group-hover:text-brand-primary transition-colors">
                                {toUserCamelCase(user.name || user.username)}
                              </p>
                              <p className="text-[10px] text-brand-secondary lowercase">{user.email || user.id}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
            {hasLead && (
              <p className="text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 font-medium lowercase">
                this department already has a lead assigned. please remove the existing lead first.
              </p>
            )}
            <Button
              type="submit"
              disabled={isAssigningLead || hasLead}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white font-bold text-sm shadow-lg shadow-brand-primary/20 disabled:opacity-50 border-0 hover:opacity-95"
            >
              {isAssigningLead ? "assigning..." : toUserCamelCase("set as department lead")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!departmentToDelete}
        onOpenChange={(open) => {
          if (!open) closeDeleteDepartmentDialog();
        }}
      >
        <DialogContent className="rounded-3xl md:rounded-[32px] border-none bg-white p-0 shadow-2xl w-[95vw] max-w-md overflow-hidden">
          <div className="h-2 bg-red-500 w-full" />
          <DialogHeader className="px-8 pt-8 pb-4">
            <div className="size-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="size-7 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-bold text-brand-ink text-center">
              {deleteDepartmentStep === 1 ? toUserCamelCase("delete department") : toUserCamelCase("final confirmation")}
            </DialogTitle>
            <DialogDescription className="text-brand-secondary font-medium text-center lowercase">
              {deleteDepartmentStep === 1 ? (
                <>
                  you are about to delete{" "}
                  <span className="text-brand-ink font-bold">{departmentToDelete?.name}</span>. its
                  department memberships will be permanently removed.
                </>
              ) : (
                <>
                  this action cannot be undone. type{" "}
                  <span className="text-brand-ink font-bold">{departmentToDelete?.name}</span> to
                  confirm.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 pb-8 space-y-4">
            {deleteDepartmentStep === 2 && (
              <div className="space-y-2">
                <Label htmlFor="delete-department-confirmation" className="text-brand-ink font-bold ml-1">
                  {toUserCamelCase("department name")}
                </Label>
                <Input
                  id="delete-department-confirmation"
                  autoFocus
                  value={deleteDepartmentConfirmation}
                  onChange={(event) => setDeleteDepartmentConfirmation(event.target.value)}
                  placeholder={departmentToDelete?.name}
                  disabled={isDeletingDepartment}
                  className="h-12 bg-red-50/50 border-red-100 rounded-2xl focus-visible:ring-red-200"
                />
              </div>
            )}

            {deleteDepartmentError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-medium lowercase">
                {deleteDepartmentError}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-2xl border-brand-line font-bold text-brand-ink hover:bg-brand-soft"
                onClick={
                  deleteDepartmentStep === 1
                    ? closeDeleteDepartmentDialog
                    : () => {
                        setDeleteDepartmentStep(1);
                        setDeleteDepartmentConfirmation("");
                        setDeleteDepartmentError(null);
                      }
                }
                disabled={isDeletingDepartment}
              >
                {deleteDepartmentStep === 1 ? toUserCamelCase("cancel") : toUserCamelCase("back")}
              </Button>
              {deleteDepartmentStep === 1 ? (
                <Button
                  className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 border-none"
                  onClick={() => setDeleteDepartmentStep(2)}
                >
                  {toUserCamelCase("continue")}
                </Button>
              ) : (
                <Button
                  className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 border-none disabled:opacity-50"
                  onClick={onHandleDeleteDepartment}
                  disabled={isDeletingDepartment || deleteDepartmentConfirmation?.trim().toLowerCase() !== departmentToDelete?.name?.toLowerCase()}
                >
                  {isDeletingDepartment ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> {toUserCamelCase("deleting")}...
                    </>
                  ) : (
                    toUserCamelCase("delete department")
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!memberToDelete}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
      >
        <DialogContent className="rounded-3xl md:rounded-[32px] border-none bg-white p-0 shadow-2xl w-[95vw] max-w-md overflow-hidden">
          <div className="h-2 bg-red-500 w-full" />
          <DialogHeader className="px-8 pt-8 pb-4">
            <div className="size-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="size-7 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-bold text-brand-ink text-center">
              {toUserCamelCase("remove member")}
            </DialogTitle>
            <DialogDescription className="text-brand-secondary font-medium text-center lowercase">
              are you sure you want to remove{" "}
              <span className="text-brand-ink font-bold">
                {toUserCamelCase(memberToDelete?.name || memberToDelete?.username || memberToDelete?.email)}
              </span>{" "}
              from this department? this action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="px-8 pb-8 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl border-brand-line font-bold text-brand-ink hover:bg-brand-soft"
              onClick={() => setMemberToDelete(null)}
            >
              {toUserCamelCase("cancel")}
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 border-none"
              onClick={() => {
                onHandleRemoveMember(memberToDelete.id || memberToDelete.user_id || memberToDelete.email);
                setMemberToDelete(null);
              }}
            >
              {toUserCamelCase("remove")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
