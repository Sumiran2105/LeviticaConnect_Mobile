import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Filter,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Motion = motion;

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { useMeetingLauncher } from "@/features/meetings/hooks/use-meeting-launcher";
import { useAuthStore } from "@/store/auth-store";
import { COMPANY_ACTIVE_USERS, COMPANY_LICENSE, COMPANY_USERS, DM_USERS_SEARCH } from "@/config/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminLayout } from "@/layouts/admin-layout";
import { formatLicenseDate, normalizeLicense } from "../utils/license-utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 16,
    },
  },
};

const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

function normalizeUsers(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function formatLastActive(value) {
  if (!value) {
    return "Not available";
  }

  return formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }, value);
}

export function CompanyUsers() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const meetings = useMeetingLauncher("admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["company-active-users"],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_ACTIVE_USERS, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      return normalizeUsers(response.data);
    },
    enabled: Boolean(session?.accessToken),
  });

  const licenseQuery = useQuery({
    queryKey: ["company-license"],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_LICENSE, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      return normalizeLicense(response.data);
    },
    enabled: Boolean(session?.accessToken),
  });

  const license = licenseQuery.data;
  const isLicenseBlocked = Boolean(license && !license.canAddUser);

  const handleMessage = async (user) => {
    let chatUser = user;

    if (user.email && session?.accessToken) {
      try {
        const response = await apiClient.get(DM_USERS_SEARCH, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          params: {
            query: user.email,
          },
        });
        const results = normalizeUsers(response.data);
        const exactMatch = results.find((result) => result.email === user.email);

        if (exactMatch) {
          chatUser = {
            ...user,
            id: exactMatch.id || exactMatch.user_id || user.id,
            userId: exactMatch.user_id || exactMatch.id || user.userId,
            name: exactMatch.full_name || exactMatch.name || user.name,
            email: exactMatch.email || user.email,
          };
        }
      } catch {
        // Fall back to the company user row data.
      }
    }

    const params = new URLSearchParams({
      userId: String(chatUser.userId || chatUser.id || ""),
      name: chatUser.name || "",
      email: chatUser.email || "",
    });

    navigate(`/admin/dashboard/chat?${params.toString()}`, {
      state: {
        selectedUserId: chatUser.id,
        selectedUserUserId: chatUser.userId,
        selectedUserName: chatUser.name,
        selectedUserEmail: chatUser.email,
      },
    });
    toast.info(`Opening chat with ${user.name || user.email}...`, {
      description: "Chat module is initializing.",
      icon: <MessageSquare className="size-4 text-brand-primary" />,
    });
  };

  const handleCall = (user) => {
    void meetings.startDirectCall(user, { mode: "audio" });
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await apiClient.delete(`${COMPANY_USERS}/${userId}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      usersQuery.refetch();
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    },
  });

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const displayUsers = useMemo(() => {
    return (usersQuery.data || []).map((user, index) => ({
      id: user.id || user.user_id || `company-user-${index}`,
      userId: user.user_id || user.auth_user_id || user.user?.id || user.user?.user_id || user.id || null,
      name: user.full_name || user.name || "Unnamed user",
      email: user.email || "Not available",
      role: (user.role || user.user_role || "USER").toUpperCase(),
      status: String(user.status || user.account_status || "active").toLowerCase(),
      lastActive: formatLastActive(user.last_active || user.updated_at || user.created_at),
      mobileNumber: user.mobile_number || user.mobile || user.phone || "Not Available",
      profileImage: user.profile_image || null,
      teamNames: Array.isArray(user.team_names) ? user.team_names : [],
    }));
  }, [usersQuery.data]);

  const filteredUsers = displayUsers.filter((user) =>
    [user.email, user.name].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvatarColor = (name) => {
    const char = (name || "U").trim().toUpperCase().charAt(0);
    const code = char.charCodeAt(0) || 0;
    const colors = [
      "bg-[#0D9488]", // teal-600
      "bg-[#2563EB]", // blue-600
      "bg-[#7C3AED]", // violet-600
      "bg-[#D97706]", // amber-600
      "bg-[#2563EB]", // blue-600 (second variation)
      "bg-[#DC2626]", // red-600
      "bg-[#EA580C]", // orange-600
      "bg-[#4F46E5]", // indigo-600
      "bg-[#0891B2]", // cyan-600
      "bg-[#16A34A]", // green-600
    ];
    return colors[code % colors.length];
  };

  return (
    <AdminLayout>
      <Motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full space-y-6 pb-12"
      >

        <Motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink">
              {toUserCamelCase("company users")}
            </h1>
            <div className="inline-flex items-center justify-center rounded-full bg-brand-soft border border-brand-line/60 px-2.5 py-0.5 text-xs font-bold text-brand-secondary">
              {filteredUsers.length}
            </div>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand-secondary/50" />
            <input
              type="text"
              placeholder="search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-brand-line/60 bg-white pl-10 pr-4 text-xs font-medium placeholder:text-brand-secondary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary/30 lowercase"
            />
          </div>
        </Motion.div>


        <Motion.div
          variants={itemVariants}
          className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold uppercase tracking-wider text-brand-secondary/50"
        >
          <div className="col-span-1">#</div>
          <div className="col-span-3">{toUserCamelCase("member")}</div>
          <div className="col-span-2">{toUserCamelCase("role")}</div>
          <div className="col-span-2">{toUserCamelCase("department")}</div>
          <div className="col-span-2">{toUserCamelCase("phone number")}</div>
          <div className="col-span-2 text-right">{toUserCamelCase("actions")}</div>
        </Motion.div>


        <Motion.div
          variants={itemVariants}
          className="space-y-3"
        >
          {usersQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-brand-secondary text-sm font-bold bg-white border border-brand-line/45 rounded-2xl shadow-sm">
              <div className="size-5 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
              <span>{toUserCamelCase("loading users")}...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user, idx) => (
              <div
                key={user.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white border border-brand-line/45 rounded-2xl p-4 shadow-[0_4px_12px_rgba(68,83,74,0.01)] hover:shadow-[0_8px_24px_rgba(68,83,74,0.05)] hover:-translate-y-0.5 transition-all duration-200 group"
              >

                <div className="col-span-1 text-xs font-bold text-brand-secondary/50 flex items-center">
                  {idx + 1}
                </div>


                <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="size-10 shrink-0 rounded-full border-2 border-white object-cover shadow-sm transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full font-black text-white text-sm border-2 border-white shadow-sm transition-transform duration-300 group-hover:scale-105 ${getAvatarColor(user.name || user.email)}`}>
                      {(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-ink truncate">{user.name}</p>
                    <p className="text-xs text-brand-secondary/80 font-medium truncate">{user.email}</p>
                  </div>
                </div>


                <div className="col-span-1 md:col-span-2 flex items-center">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${user.role === "ADMIN"
                        ? "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
                        : "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                      }`}
                  >
                    {user.role === "ADMIN" && <ShieldCheck className="size-3.5" />}
                    {toUserCamelCase(user.role)}
                  </span>
                </div>


                <div className="col-span-1 md:col-span-2 flex flex-wrap gap-1 items-center">
                  {user.teamNames && user.teamNames.length > 0 ? (
                    user.teamNames.map((team, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200"
                      >
                        {team}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-brand-secondary/50 font-medium">None</span>
                  )}
                </div>


                <div className="col-span-1 md:col-span-2 flex items-center">
                  <span className="text-xs font-bold text-brand-secondary">
                    {user.mobileNumber}
                  </span>
                </div>

                <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-1">
                  <button
                    title="Send Message"
                    onClick={() => handleMessage(user)}
                    className="rounded-full p-2 text-brand-secondary/50 border border-transparent hover:border-blue-100 hover:bg-blue-50 hover:text-[#3B5BFC] active:scale-90 transition-all duration-200"
                  >
                    <MessageSquare className="size-4.5" />
                  </button>
                  <button
                    title="Start Call"
                    onClick={() => handleCall(user)}
                    className="rounded-full p-2 text-brand-secondary/50 border border-transparent hover:border-emerald-100 hover:bg-emerald-50 hover:text-emerald-600 active:scale-90 transition-all duration-200"
                  >
                    <Phone className="size-4.5" />
                  </button>
                  <button
                    title="Delete User"
                    onClick={() => {
                      setUserToDelete(user);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="rounded-full p-2 text-brand-secondary/50 border border-transparent hover:border-rose-100 hover:bg-rose-50 hover:text-red-500 active:scale-90 transition-all duration-200"
                  >
                    <Trash2 className="size-4.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-20 text-center bg-white border border-brand-line/45 rounded-2xl shadow-sm">
              <Users className="mx-auto mb-4 size-12 text-brand-secondary/20" />
              <h3 className="text-lg font-bold text-brand-ink">{toUserCamelCase("no users found")}</h3>
              <p className="mt-1 text-xs text-brand-secondary font-medium lowercase">
                no approved users are available yet for this company workspace.
              </p>
            </div>
          )}
        </Motion.div>


        <Motion.div
          variants={itemVariants}
          className={`rounded-[28px] border p-6 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300 mt-4 ${isLicenseBlocked ? "border-rose-200" : "border-brand-line/50"
            }`}
        >
          {(() => {
            const usedUsers = license?.usedUsers ?? 0;
            const maxUsers = license?.maxUsers ?? 1;
            const usedPercent = Math.min(Math.round((usedUsers / maxUsers) * 100), 100);

            return (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-2xl ${isLicenseBlocked ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}
                    >
                      {isLicenseBlocked ? <AlertTriangle className="size-5" /> : <ShieldCheck className="size-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-brand-ink">
                        {licenseQuery.isLoading ? toUserCamelCase("checking license") : toUserCamelCase(license?.plan || "license status")}
                      </p>
                      <p className="mt-1 text-xs text-brand-secondary font-medium lowercase">
                        {isLicenseBlocked
                          ? license.blockedReason
                          : `${usedUsers} of ${maxUsers} seats used. ${license?.remainingUsers ?? "-"} remaining until ${formatLicenseDate(license?.expiresAt)}.`}
                      </p>
                    </div>
                  </div>
                  {!isLicenseBlocked && (
                    <span className="text-xs font-bold text-brand-secondary/80 bg-brand-soft px-3 py-1.5 rounded-xl border border-brand-line/30">
                      {usedPercent}% {toUserCamelCase("utilized")}
                    </span>
                  )}
                </div>

                {!isLicenseBlocked && !licenseQuery.isLoading && (
                  <div className="w-full bg-[#EBF1F2] h-2.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] transition-all duration-500"
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </Motion.div>


        <Motion.div
          variants={itemVariants}
          className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[32px] border border-brand-line/60 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {filteredUsers.slice(0, 4).map((user) => (
                <div
                  key={user.id}
                  className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-brand-neutral text-xs font-bold text-brand-secondary shadow-sm"
                >
                  {(user.name || user.email).charAt(0)}
                </div>
              ))}
              {filteredUsers.length > 4 ? (
                <div className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-brand-soft text-[10px] font-bold text-brand-secondary shadow-sm">
                  +{filteredUsers.length - 4}
                </div>
              ) : null}
            </div>
            <p className="text-sm text-brand-secondary font-medium">
              <span className="font-extrabold text-brand-ink">{filteredUsers.length}</span> {filteredUsers.length === 1 ? toUserCamelCase("user") : toUserCamelCase("users")} {toUserCamelCase("in your workspace")}
            </p>
          </div>
          <Button variant="ghost" className="text-xs font-extrabold text-brand-primary hover:bg-brand-primary/5 rounded-2xl h-11 px-5">
            {toUserCamelCase("download user report")}
          </Button>
        </Motion.div>
      </Motion.div>


      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[400px] gap-0 overflow-hidden rounded-[40px] border-none bg-white p-0 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]"
        >
          <div className="p-8 pb-4">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-100/50">
                <AlertTriangle className="size-7" />
              </div>
            </div>
            <DialogHeader className="gap-2 text-center">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-brand-ink">
                {toUserCamelCase("delete user")}
              </DialogTitle>
              <DialogDescription className="px-2 text-xs leading-relaxed text-brand-secondary font-medium lowercase">
                are you sure you want to delete{" "}
                <span className="font-bold text-brand-ink">
                  {userToDelete?.name || userToDelete?.email}
                </span>
                ? this action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex flex-col gap-3 p-8 pt-4">
            <Button
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
              className="h-12 w-full rounded-2xl bg-red-500 text-sm font-bold text-white shadow-[0_8px_20px_-4px_rgba(239,68,68,0.3)] transition-all hover:bg-red-600 active:scale-[0.98] disabled:opacity-70 border-none"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  {toUserCamelCase("deleting user")}...
                </>
              ) : (
                toUserCamelCase("delete user")
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="h-12 w-full rounded-2xl text-sm font-bold text-brand-secondary hover:bg-brand-soft hover:text-brand-ink"
            >
              {toUserCamelCase("cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
