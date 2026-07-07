import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Clock,
  LoaderCircle,
  Mail,
  Search,
  Shield,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Motion = motion;

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { useAuthStore } from "@/store/auth-store";
import { COMPANY_APPROVE_USER, COMPANY_PENDING_USERS, COMPANY_REJECT_USER } from "@/config/api";
import { AdminLayout } from "@/layouts/admin-layout";

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

function normalizePendingUsers(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  if (Array.isArray(data?.pending_users)) {
    return data.pending_users;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function formatDate(value) {
  if (!value) {
    return "Recently requested";
  }

  return formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }, value);
}

export function CompanyApprovals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserForRejection, setSelectedUserForRejection] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingUserId, setProcessingUserId] = useState(null);

  const pendingUsersQuery = useQuery({
    queryKey: ["company-pending-users", session?.accessToken],
    queryFn: async () => {
      const response = await apiClient.get(COMPANY_PENDING_USERS, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      return normalizePendingUsers(response.data);
    },
    enabled: Boolean(session?.accessToken),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const approveMutation = useMutation({
    mutationFn: async (userId) => {
      setProcessingUserId(userId);
      const response = await apiClient.post(COMPANY_APPROVE_USER(userId), null, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("User successfully approved.");
      queryClient.invalidateQueries({ queryKey: ["company-pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.response?.data?.detail || error.message || "Approval failed.");
    },
    onSettled: () => {
      setProcessingUserId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      setProcessingUserId(userId);
      const response = await apiClient.post(COMPANY_REJECT_USER(userId), null, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
        params: {
          reason,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Registration request rejected.");
      setSelectedUserForRejection(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["company-pending-users"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to process rejection.");
    },
    onSettled: () => {
      setProcessingUserId(null);
    },
  });

  const pendingUsers = useMemo(() => {
    return (pendingUsersQuery.data || []).map((user, index) => ({
      id: user.id || user.user_id || `pending-user-${index}`,
      name: user.name || user.full_name || "Pending user",
      email: user.email || "Not available",
      requestedAt: formatDate(user.created_at || user.requested_at || user.registered_at),
    }));
  }, [pendingUsersQuery.data]);

  const filteredUsers = pendingUsers.filter((user) =>
    [user.email, user.name].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleRejectIntent(user) {
    setSelectedUserForRejection(user);
    setRejectionReason("");
  }

  function handleConfirmReject() {
    if (!selectedUserForRejection) {
      return;
    }

    rejectMutation.mutate({
      userId: selectedUserForRejection.id,
      reason: rejectionReason.trim(),
    });
  }

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
        className="w-full space-y-6 pb-20"
      >

        <Motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink">
              {toUserCamelCase("pending approvals")}
            </h1>
            {filteredUsers.length > 0 && (
              <div className="inline-flex items-center justify-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                {filteredUsers.length}
              </div>
            )}
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand-secondary/50" />
            <input
              type="text"
              placeholder="search requests..."
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
          <div className="col-span-4">{toUserCamelCase("requester")}</div>
          <div className="col-span-3">{toUserCamelCase("email")}</div>
          <div className="col-span-2">{toUserCamelCase("applied")}</div>
          <div className="col-span-2 text-right">{toUserCamelCase("actions")}</div>
        </Motion.div>


        {pendingUsersQuery.isLoading ? (
          <Motion.div variants={itemVariants} className="flex min-h-64 items-center justify-center gap-3 text-brand-secondary text-sm font-bold bg-white border border-brand-line/45 rounded-2xl shadow-sm">
            <LoaderCircle className="size-5 animate-spin text-brand-primary" />
            <span>{toUserCamelCase("loading pending users")}...</span>
          </Motion.div>
        ) : filteredUsers.length > 0 ? (
          <Motion.div variants={itemVariants} className="space-y-3">
            {filteredUsers.map((user, idx) => {
              const isProcessingThisUser = processingUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white border border-brand-line/45 rounded-2xl p-4 shadow-[0_4px_12px_rgba(68,83,74,0.01)] hover:shadow-[0_8px_24px_rgba(68,83,74,0.05)] hover:-translate-y-0.5 transition-all duration-200 group"
                >

                  <div className="col-span-1 text-xs font-bold text-brand-secondary/50 flex items-center">
                    {idx + 1}
                  </div>


                  <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                    <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl font-black text-white text-sm border border-brand-line/30 transition-transform duration-300 group-hover:scale-105 ${getAvatarColor(user.name || user.email)}`}>
                      {(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-ink truncate">{user.name}</p>
                      <p className="text-[10px] font-semibold text-brand-secondary/70 lowercase">pending approval</p>
                    </div>
                  </div>


                  <div className="col-span-1 md:col-span-3 flex items-center">
                    <span className="inline-flex max-w-[280px] items-center gap-2 truncate text-xs font-semibold text-brand-secondary">
                      <Mail className="size-4 shrink-0 text-brand-secondary/40" />
                      <span className="truncate">{user.email}</span>
                    </span>
                  </div>


                  <div className="col-span-1 md:col-span-2 flex items-center">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-brand-secondary">
                      <Clock className="size-4 text-brand-secondary/40" />
                      <span>{user.requestedAt}</span>
                    </span>
                  </div>


                  <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-2.5">
                    <Button
                      onClick={() => handleRejectIntent(user)}
                      disabled={isProcessingThisUser}
                      variant="outline"
                      className="h-9 rounded-xl border-brand-line px-3 text-xs font-extrabold text-brand-secondary hover:bg-rose-50 hover:text-red-500 hover:border-rose-100 transition-all duration-200"
                    >
                      <X className="mr-1 size-3.5" />
                      <span>{toUserCamelCase("reject")}</span>
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate(user.id)}
                      disabled={isProcessingThisUser}
                      className="h-9 rounded-xl bg-gradient-to-r from-[#1094EB] to-[#3B5BFC] hover:from-[#0082f4] hover:to-[#2563EB] text-white shadow-md border-none px-4 text-xs font-extrabold transition-all duration-200 active:scale-[0.98]"
                    >
                      {approveMutation.isPending && isProcessingThisUser ? (
                        toUserCamelCase("approving")
                      ) : (
                        <span className="flex items-center">
                          <Check className="mr-1 size-3.5" />
                          <span>{toUserCamelCase("approve")}</span>
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </Motion.div>
        ) : (
          <Motion.div
            variants={itemVariants}
            className="flex flex-col items-center justify-center rounded-[48px] border-2 border-dashed border-brand-line/60 bg-white/50 p-20 text-center backdrop-blur-sm shadow-sm"
          >
            <div className="mb-6 flex size-20 items-center justify-center rounded-[28px] bg-emerald-50 text-emerald-500 shadow-sm border border-emerald-100">
              <UserCheck className="size-10 animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-brand-ink">{toUserCamelCase("clear workspace")}</h3>
            <p className="mt-2 max-w-sm text-xs font-medium leading-relaxed text-brand-secondary lowercase">
              you've settled all pending registration requests. your workspace is fully up to date.
            </p>
          </Motion.div>
        )}


        <Motion.div
          variants={itemVariants}
          className="mt-12 overflow-hidden rounded-[32px] border border-brand-primary/10 bg-gradient-to-r from-brand-primary/5 via-transparent to-transparent p-8 shadow-[0_12px_45px_rgba(68,83,74,0.02)] bg-white/40"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-md border border-brand-primary/10">
              <Shield className="size-6 text-brand-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-base font-bold text-brand-ink">{toUserCamelCase("security protocol")}</h3>
              <p className="max-w-2xl text-xs leading-relaxed text-brand-secondary font-medium lowercase">
                every member in your workspace goes through a manual approval process so only verified users get access.
              </p>
            </div>
            <Button variant="outline" className="h-10 rounded-xl border-brand-line/65 bg-white text-xs font-bold text-brand-ink hover:bg-brand-soft">
              {toUserCamelCase("security log")}
            </Button>
          </div>
        </Motion.div>


        <Dialog
          open={Boolean(selectedUserForRejection)}
          onOpenChange={(open) => {
            if (!open && !rejectMutation.isPending) {
              setSelectedUserForRejection(null);
              setRejectionReason("");
            }
          }}
        >
          <DialogContent className="rounded-[32px] border border-brand-line bg-white sm:max-w-xl gap-4 p-6 shadow-2xl">
            <DialogHeader className="gap-1.5">
              <DialogTitle className="text-xl font-extrabold text-brand-ink">
                {toUserCamelCase("reject user request")}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium leading-relaxed text-brand-secondary lowercase">
                enter a reason for rejecting{" "}
                <span className="font-bold text-brand-ink">
                  {selectedUserForRejection?.name || "this user"}
                </span>.
              </DialogDescription>
            </DialogHeader>

            <Input
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Enter rejection reason..."
              className="h-12 rounded-xl border-brand-line bg-[#ebf1f2]/20 font-medium text-brand-ink placeholder:text-brand-secondary/40 focus:ring-2 focus:ring-brand-primary/10"
            />

            <DialogFooter className="gap-2 sm:justify-end mt-4">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-brand-line/80 px-5 text-xs font-bold text-brand-secondary"
                disabled={rejectMutation.isPending}
                onClick={() => {
                  setSelectedUserForRejection(null);
                  setRejectionReason("");
                }}
              >
                {toUserCamelCase("cancel")}
              </Button>
              <Button
                type="button"
                className="h-10 rounded-xl bg-rose-600 px-5 text-xs font-bold text-white hover:bg-rose-700 shadow-md border-none transition-all duration-200 active:scale-[0.98]"
                disabled={rejectMutation.isPending}
                onClick={handleConfirmReject}
              >
                {rejectMutation.isPending ? toUserCamelCase("rejecting") : toUserCamelCase("confirm reject")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Motion.div>
    </AdminLayout>
  );
}
