import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const Motion = motion;
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  MessageSquare,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SUPERADMIN_SUPPORT_DASHBOARD,
  SUPERADMIN_SUPPORT_TICKET,
  SUPERADMIN_SUPPORT_TICKET_REPLY,
  SUPERADMIN_SUPPORT_TICKET_STATUS,
  SUPERADMIN_SUPPORT_TICKETS,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";

const filters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

const EMPTY_TICKETS = [];
const EMPTY_MESSAGES = [];

function formatDate(value) {
  if (!value) return "Not available";

  return formatISTDateTime(value, {
    dateStyle: "medium",
    timeStyle: "short",
  }, "Not available");
}

function normalizeStatus(status) {
  return String(status || "OPEN").toLowerCase();
}

function toApiStatus(status) {
  return String(status || "open").toUpperCase();
}

function getStatusMeta(status) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "resolved" || normalizedStatus === "closed") {
    return {
      label: normalizedStatus === "closed" ? "Closed" : "Resolved",
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (normalizedStatus === "in_progress") {
    return {
      label: "In progress",
      icon: Clock3,
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: "Open",
    icon: AlertCircle,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function normalizeTicket(ticket) {
  return {
    ...ticket,
    id: String(ticket.id || ticket.ticket_id || ""),
    subject: ticket.title || ticket.subject || "Untitled ticket",
    issue: ticket.description || ticket.issue || "",
    status: normalizeStatus(ticket.status),
    priority: String(ticket.priority || "medium").toLowerCase(),
  };
}

function getErrorMessage(error, fallback) {
  return error?.userMessage || error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallback;
}

const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
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

export function SupportTicketsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["superadmin-support-tickets"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_SUPPORT_TICKETS);
      return Array.isArray(response.data) ? response.data.map(normalizeTicket) : [];
    },
  });

  const dashboardQuery = useQuery({
    queryKey: ["superadmin-support-dashboard"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_SUPPORT_DASHBOARD);
      return response.data || {};
    },
  });

  const tickets = ticketsQuery.data ?? EMPTY_TICKETS;

  const selectedTicketQuery = useQuery({
    queryKey: ["superadmin-support-ticket", selectedTicketId],
    enabled: Boolean(selectedTicketId),
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_SUPPORT_TICKET(selectedTicketId));
      return {
        ticket: normalizeTicket(response.data?.ticket || {}),
        messages: Array.isArray(response.data?.messages) ? response.data.messages : [],
      };
    },
  });

  const selectedListTicket = tickets.find((ticket) => ticket.id === selectedTicketId);
  const selectedTicket = selectedTicketQuery.data?.ticket
    ? { ...selectedListTicket, ...selectedTicketQuery.data.ticket }
    : selectedListTicket;
  const selectedMessages = selectedTicketQuery.data?.messages ?? EMPTY_MESSAGES;

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesSearch =
        !query ||
        [ticket.subject, ticket.issue, ticket.category, ticket.priority, ticket.company_name, ticket.ticket_number]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, statusFilter, tickets]);

  const fallbackCounts = useMemo(
    () => ({
      total_tickets: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      in_progress: tickets.filter((ticket) => ticket.status === "in_progress").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    }),
    [tickets]
  );

  const counts = dashboardQuery.data || fallbackCounts;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }) => {
      const response = await apiClient.put(SUPERADMIN_SUPPORT_TICKET_STATUS(ticketId), {
        status: toApiStatus(status),
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success("Ticket status updated.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["superadmin-support-tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["superadmin-support-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["superadmin-support-ticket", selectedTicketId] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to update ticket status."));
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await apiClient.post(SUPERADMIN_SUPPORT_TICKET_REPLY(ticketId), {
        message: message.trim(),
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success("Reply sent.");
      setReplyMessage("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["superadmin-support-ticket", selectedTicketId] }),
        queryClient.invalidateQueries({ queryKey: ["superadmin-support-tickets"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to send reply."));
    },
  });

  const onTicketModalOpenChange = (isOpen) => {
    if (!isOpen) {
      setSelectedTicketId(null);
      setReplyMessage("");
    }
  };

  const updateStatus = (status) => {
    if (!selectedTicketId) return;
    updateStatusMutation.mutate({ ticketId: selectedTicketId, status });
  };

  const onReplySubmit = (event) => {
    event.preventDefault();

    if (!selectedTicketId || !replyMessage.trim()) {
      toast.error("Reply message is required.");
      return;
    }

    replyMutation.mutate({
      ticketId: selectedTicketId,
      message: replyMessage,
    });
  };

  return (
    <SuperAdminLayout>
      <Motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mx-auto max-w-7xl space-y-6 pb-12"
      >
        <Motion.div
          variants={itemVariants}
          className="relative overflow-hidden flex flex-col gap-6 rounded-[32px] border border-brand-line bg-gradient-to-br from-white via-white to-brand-soft/10 p-8 shadow-[0_16px_40px_rgba(68,83,74,0.04)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2]" />
          <div className="space-y-4 pl-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/20 bg-brand-primary/5 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">
              <LifeBuoy className="size-3 text-brand-primary animate-pulse" />
              {toUserCamelCase("support desk")}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink leading-tight bg-gradient-to-r from-brand-ink to-brand-ink/80 bg-clip-text text-transparent">
              {toUserCamelCase("admin support tickets")}
            </h1>
            <p className="max-w-2xl text-xs md:text-sm leading-relaxed text-brand-secondary/90 lowercase">
              review support requests raised by company admins, update progress, and reply to the ticket thread.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 shrink-0">
            <StatCard label={toUserCamelCase("total")} value={counts.total_tickets ?? fallbackCounts.total_tickets} className="border-brand-line/50 bg-[#f8fafc] text-brand-ink" />
            <StatCard label={toUserCamelCase("open")} value={counts.open ?? fallbackCounts.open} className="border-amber-100 bg-[#fffbeb] text-amber-700" />
            <StatCard label={toUserCamelCase("progress")} value={counts.in_progress ?? fallbackCounts.in_progress} className="border-blue-100 bg-[#f0f5ff] text-blue-700" />
            <StatCard label={toUserCamelCase("resolved")} value={counts.resolved ?? fallbackCounts.resolved} className="border-emerald-100 bg-[#ecfdf5] text-emerald-700" />
          </div>
        </Motion.div>

        <Motion.section
          variants={itemVariants}
          className="space-y-4 rounded-[32px] border border-brand-line bg-white p-6 shadow-sm"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-secondary/50 focus-within:text-brand-primary" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="search tickets..."
                className="h-12 rounded-2xl border-brand-line bg-brand-neutral/50 focus:bg-white pl-11 placeholder:text-brand-secondary/40 lowercase"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-full border px-5 py-2 text-xs font-bold transition-all duration-200 ${statusFilter === filter.value
                      ? "border-brand-primary bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "border-brand-line bg-white text-brand-secondary hover:border-brand-primary/40 hover:text-brand-primary"
                    }`}
                >
                  {toUserCamelCase(filter.label)}
                </button>
              ))}
            </div>
          </div>

          {ticketsQuery.isLoading ? (
            <div className="rounded-2xl border border-brand-line bg-[#f8fafc] p-8 text-center">
              <Loader2 className="mx-auto size-6 animate-spin text-brand-primary mb-2" />
              <p className="text-sm font-semibold text-brand-ink">{toUserCamelCase("loading tickets")}...</p>
              <p className="mt-1 text-xs text-brand-secondary lowercase">fetching raised admin tickets.</p>
            </div>
          ) : ticketsQuery.isError ? (
            <div className="rounded-2xl border border-brand-tertiary/30 bg-brand-tertiary/10 p-8 text-center">
              <p className="text-sm font-semibold text-brand-ink">{toUserCamelCase("unable to load tickets")}</p>
              <p className="mt-1 text-xs text-brand-secondary">{getErrorMessage(ticketsQuery.error, "Please try again.")}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => ticketsQuery.refetch()}
                className="mt-4 h-10 rounded-xl border-brand-line px-5 font-semibold"
              >
                {toUserCamelCase("retry")}
              </Button>
            </div>
          ) : filteredTickets.length ? (
            <Motion.div
              variants={containerVariants}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {filteredTickets.map((ticket) => {
                const status = getStatusMeta(ticket.status);
                const StatusIcon = status.icon;

                return (
                  <Motion.button
                    variants={itemVariants}
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="group rounded-2xl border border-brand-line bg-[#f8fafc]/50 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-primary/30 hover:bg-white flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="w-full flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-brand-ink group-hover:text-brand-primary transition-colors leading-tight">
                          {toUserCamelCase(ticket.subject)}
                        </h3>
                        <p className="mt-1.5 text-xs text-brand-secondary/80 font-medium">
                          {ticket.ticket_number ? `${ticket.ticket_number} · ` : ""}
                          {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${status.className}`}>
                        <StatusIcon className="size-3" />
                        {toUserCamelCase(status.label)}
                      </span>
                    </div>
                    <div className="w-full mt-4 flex flex-wrap gap-2">
                      {ticket.company_name ? (
                        <span className="rounded-full bg-white border border-brand-line px-2.5 py-0.5 text-[10px] font-bold text-brand-secondary/80">
                          {toUserCamelCase(ticket.company_name)}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white border border-brand-line px-2.5 py-0.5 text-[10px] font-bold capitalize text-brand-secondary/80">
                        {toUserCamelCase(ticket.priority)}
                      </span>
                    </div>
                  </Motion.button>
                );
              })}
            </Motion.div>
          ) : (
            <div className="rounded-2xl border border-dashed border-brand-line bg-brand-soft p-8 text-center">
              <LifeBuoy className="mx-auto size-8 text-brand-primary opacity-30 mb-2" />
              <p className="mt-3 text-sm font-semibold text-brand-ink">{toUserCamelCase("no tickets found")}</p>
              <p className="mt-1 text-xs text-brand-secondary lowercase">try another filter or search.</p>
            </div>
          )}
        </Motion.section>

        <Dialog open={Boolean(selectedTicketId)} onOpenChange={onTicketModalOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6 sm:max-w-5xl border-none shadow-2xl">
            {selectedTicketQuery.isLoading ? (
              <div className="rounded-2xl border border-brand-line bg-brand-soft/50 p-8 text-center">
                <Loader2 className="mx-auto size-6 animate-spin text-brand-primary mb-2" />
                <p className="text-sm font-semibold text-brand-ink">{toUserCamelCase("loading ticket")}...</p>
              </div>
            ) : selectedTicketQuery.isError ? (
              <div className="rounded-2xl border border-brand-tertiary/30 bg-brand-tertiary/10 p-8 text-center">
                <p className="text-sm font-semibold text-brand-ink">{toUserCamelCase("unable to load ticket details")}</p>
                <p className="mt-1 text-xs text-brand-secondary">
                  {getErrorMessage(selectedTicketQuery.error, "Please try again.")}
                </p>
              </div>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary">
                        {selectedTicket?.ticket_number || "support ticket"}
                      </p>
                      <DialogTitle className="mt-2 text-xl font-semibold text-brand-ink">{toUserCamelCase(selectedTicket?.subject)}</DialogTitle>
                      <DialogDescription className="mt-1">
                        {selectedTicket?.company_name ? `${toUserCamelCase(selectedTicket.company_name)} · ` : ""}
                        {formatDate(selectedTicket?.created_at)}
                      </DialogDescription>
                    </div>
                    {selectedTicket ? (
                      <StatusBadge status={selectedTicket.status} size="lg" />
                    ) : null}
                  </div>
                </DialogHeader>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.6fr)] mt-4">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Detail label={toUserCamelCase("priority")} value={toUserCamelCase(selectedTicket?.priority)} />
                      <Detail label={toUserCamelCase("category")} value={toUserCamelCase(selectedTicket?.category?.replaceAll("_", " "))} />
                    </div>

                    <div className="rounded-2xl border border-brand-line bg-brand-neutral/40 p-5">
                      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-ink">
                        <MessageSquare className="size-4 text-brand-primary" />
                        {toUserCamelCase("issue description")}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-secondary font-medium">{selectedTicket?.issue}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatus("open")}
                        className="h-11 rounded-2xl border-brand-line px-5 font-semibold"
                      >
                        <RefreshCcw className="mr-2 size-4" />
                        {toUserCamelCase("reopen")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatus("in_progress")}
                        className="h-11 rounded-2xl border-blue-200 px-5 font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        <Clock3 className="mr-2 size-4" />
                        {toUserCamelCase("mark progress")}
                      </Button>
                      <Button
                        type="button"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatus("resolved")}
                        className="h-11 rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white border-0 hover:opacity-90 font-bold px-6 shadow-md shadow-brand-primary/10"
                      >
                        <ShieldCheck className="mr-2 size-4" />
                        {toUserCamelCase("resolve ticket")}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-brand-line bg-brand-neutral/40 p-3 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-ink/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {selectedMessages.length ? (
                        selectedMessages.map((message) => (
                          <div key={message.id} className="rounded-2xl bg-white border border-brand-line/50 p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-brand-secondary uppercase tracking-wider">
                              <span>{toUserCamelCase(String(message.sender_role || "User").replaceAll("_", " "))}</span>
                              <span className="normal-case">{formatDate(message.created_at)}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-brand-ink">{message.message}</p>
                          </div>
                        ))
                      ) : (
                        <p className="p-5 text-center text-xs font-semibold text-brand-secondary/60 lowercase">{toUserCamelCase("no messages yet")}.</p>
                      )}
                    </div>

                    <form onSubmit={onReplySubmit} className="space-y-3">
                      <Textarea
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                        placeholder="write a reply to the admin..."
                        className="min-h-28 rounded-2xl border-brand-line bg-brand-neutral/50 focus:bg-white placeholder:text-brand-secondary/40 lowercase"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={replyMutation.isPending || !replyMessage.trim()}
                          className="h-11 rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white border-0 hover:opacity-90 font-bold px-6 shadow-md shadow-brand-primary/10"
                        >
                          <Send className="mr-2 size-4" />
                          {replyMutation.isPending ? "sending..." : toUserCamelCase("send reply")}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </Motion.div>
    </SuperAdminLayout>
  );
}

function StatCard({ label, value, className }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 min-w-[105px] text-center ${className}`}>
      <p className="text-3xl font-extrabold">{value ?? 0}</p>
      <p className="text-[10px] font-bold mt-1.5 uppercase tracking-widest opacity-80">{label}</p>
    </div>
  );
}

function StatusBadge({ status, size = "sm" }) {
  const statusMeta = getStatusMeta(status);
  const StatusIcon = statusMeta.icon;

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border font-semibold ${statusMeta.className} ${size === "lg" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-[11px]"
        }`}
    >
      <StatusIcon className={size === "lg" ? "size-4" : "size-3"} />
      {toUserCamelCase(statusMeta.label)}
    </span>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-brand-line bg-brand-neutral/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary/70">{label}</p>
      <p className="mt-2 text-sm font-bold capitalize text-brand-ink">{value || "Not specified"}</p>
    </div>
  );
}
