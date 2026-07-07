import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const Motion = motion;
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  HelpCircle,
  LifeBuoy,
  Send,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_TICKET, SUPPORT_TICKET_REPLY, SUPPORT_TICKETS } from "@/config/api";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { AdminLayout } from "@/layouts/admin-layout";

const categoryOptions = [
  { value: "login_access", label: "Login or access" },
  { value: "billing_plan", label: "Billing or plan" },
  { value: "users_roles", label: "Users and roles" },
  { value: "meetings_calls", label: "Meetings and calls" },
  { value: "chat_files", label: "Chat or files" },
  { value: "performance", label: "Performance" },
  { value: "general", label: "General support" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const EMPTY_TICKETS = [];

function formatDate(value) {
  if (!value) return "Not available";

  return formatISTDateTime(value, {
    dateStyle: "medium",
    timeStyle: "short",
  }, "Not available");
}

function getStatusMeta(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "resolved" || normalizedStatus === "closed") {
    return {
      label: "Resolved",
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (normalizedStatus === "in_progress" || normalizedStatus === "in progress") {
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
    status: String(ticket.status || "OPEN").toLowerCase(),
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

export function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [reviewTicket, setReviewTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      subject: "",
      issue: "",
      category: "general",
      priority: "medium",
    },
  });

  const ticketsQuery = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const response = await apiClient.get(SUPPORT_TICKETS);
      return Array.isArray(response.data) ? response.data.map(normalizeTicket) : [];
    },
  });

  const tickets = ticketsQuery.data ?? EMPTY_TICKETS;

  const selectedTicketQuery = useQuery({
    queryKey: ["admin-support-ticket", selectedTicketId],
    enabled: Boolean(selectedTicketId),
    queryFn: async () => {
      const response = await apiClient.get(SUPPORT_TICKET(selectedTicketId));
      return {
        ticket: normalizeTicket(response.data?.ticket || {}),
        messages: Array.isArray(response.data?.messages) ? response.data.messages : [],
      };
    },
  });

  const selectedTicket = selectedTicketQuery.data?.ticket || tickets.find((ticket) => ticket.id === selectedTicketId);
  const selectedMessages = selectedTicketQuery.data?.messages || [];

  const openCount = useMemo(
    () => tickets.filter((ticket) => !["resolved", "closed"].includes(String(ticket.status).toLowerCase())).length,
    [tickets]
  );

  const createTicketMutation = useMutation({
    mutationFn: async (values) => {
      const response = await apiClient.post(SUPPORT_TICKETS, {
        title: values.subject.trim(),
        category: values.category,
        priority: values.priority,
        description: values.issue.trim(),
      });

      return response.data;
    },
    onSuccess: async (data) => {
      toast.success(data?.ticket_number ? `Ticket ${data.ticket_number} created.` : "Ticket created.");
      reset();
      setReviewTicket(null);
      setSelectedTicketId(data?.ticket_id ? String(data.ticket_id) : null);
      await queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to create support ticket."));
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await apiClient.post(SUPPORT_TICKET_REPLY(ticketId), {
        message: message.trim(),
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success("Reply sent.");
      setReplyMessage("");
      await queryClient.invalidateQueries({ queryKey: ["admin-support-ticket", selectedTicketId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to send reply."));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setReviewTicket({
      subject: values.subject.trim(),
      category: values.category,
      priority: values.priority,
      issue: values.issue.trim(),
    });
  });

  const onConfirmCreate = () => {
    if (!reviewTicket) return;
    createTicketMutation.mutate(reviewTicket);
  };

  const onTicketModalOpenChange = (isOpen) => {
    if (!isOpen) {
      setSelectedTicketId(null);
      setReplyMessage("");
    }
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
    <AdminLayout>
      <Motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mx-auto max-w-7xl space-y-6 pb-12"
      >
        <Motion.div
          variants={itemVariants}
          className="relative overflow-hidden flex flex-col gap-6 rounded-[32px] border border-brand-line bg-gradient-to-br from-white via-white to-brand-soft/10 p-8 shadow-[0_16px_40px_rgba(68,83,74,0.04)] sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2]" />
          <div className="space-y-4 pl-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/20 bg-brand-primary/5 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">
              <LifeBuoy className="size-3 text-brand-primary animate-pulse" />
              {toUserCamelCase("admin support")}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink leading-tight bg-gradient-to-r from-brand-ink to-brand-ink/80 bg-clip-text text-transparent">
              {toUserCamelCase("raise a support ticket")}
            </h1>
            <p className="max-w-2xl text-xs md:text-sm leading-relaxed text-brand-secondary/90 lowercase">
              report product issues, access problems, billing questions, or operational requests to the super admin team.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-line/50 bg-[#f8fafc] p-5 shadow-sm hover:shadow-md hover:border-brand-primary/20 transition-all duration-300 min-w-[110px]">
              <p className="text-3xl font-extrabold text-brand-primary">{tickets.length}</p>
              <p className="text-[10px] font-bold text-brand-secondary/70 mt-1.5 uppercase tracking-widest">
                {toUserCamelCase("total tickets")}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-100 bg-[#fffbeb] p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-300 min-w-[110px]">
              <p className="text-3xl font-extrabold text-amber-600">{openCount}</p>
              <p className="text-[10px] font-bold text-amber-700/80 mt-1.5 uppercase tracking-widest">
                {toUserCamelCase("open")}
              </p>
            </div>
          </div>
        </Motion.div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <Motion.div
            variants={itemVariants}
            className="space-y-5 rounded-[28px] border border-brand-line bg-white p-6 shadow-sm"
          >
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white shadow-md shadow-brand-primary/15">
                  <Send className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-brand-ink">{toUserCamelCase("ticket details")}</h2>
                  <p className="text-xs text-brand-secondary lowercase">include enough context for a quick resolution.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-brand-ink">{toUserCamelCase("subject")} *</label>
                  <Input
                    {...register("subject", {
                      required: "Subject is required.",
                      minLength: { value: 3, message: "Use at least 3 characters." },
                    })}
                    placeholder="short summary of the issue"
                    className="h-12 rounded-2xl border-brand-line bg-brand-neutral/50 focus:bg-white placeholder:text-brand-secondary/40"
                  />
                  {errors.subject ? <p className="text-xs font-medium text-brand-tertiary">{errors.subject.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-ink">{toUserCamelCase("category")} *</label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 rounded-2xl border-brand-line bg-brand-neutral/50 focus:bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-brand-line/50 rounded-2xl p-1 z-[100]">
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="rounded-xl">
                              {toUserCamelCase(option.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-ink">{toUserCamelCase("priority")} *</label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 rounded-2xl border-brand-line bg-brand-neutral/50 focus:bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-brand-line/50 rounded-2xl p-1 z-[100]">
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="rounded-xl">
                              {toUserCamelCase(option.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-brand-ink">{toUserCamelCase("detailed description")} *</label>
                  <Textarea
                    {...register("issue", {
                      required: "Description is required.",
                      minLength: { value: 10, message: "Use at least 10 characters." },
                    })}
                    placeholder="what happened, who is affected, steps to reproduce, screenshots or links if useful..."
                    className="min-h-36 rounded-2xl border-brand-line bg-brand-neutral/50 focus:bg-white placeholder:text-brand-secondary/40"
                  />
                  {errors.issue ? <p className="text-xs font-medium text-brand-tertiary">{errors.issue.message}</p> : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-brand-line/60 pt-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reset()}
                  className="h-12 rounded-2xl border-brand-line px-6 font-semibold"
                >
                  {toUserCamelCase("clear")}
                </Button>
                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="h-12 rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white border-0 hover:opacity-90 font-bold px-8 shadow-md shadow-brand-primary/10"
                >
                  {toUserCamelCase("review ticket")}
                </Button>
              </div>
            </form>
          </Motion.div>

          <Motion.div
            variants={itemVariants}
            className="space-y-4 rounded-[28px] border border-brand-line bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
                <HelpCircle className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-brand-ink">{toUserCamelCase("your tickets")}</h2>
                <p className="text-xs text-brand-secondary lowercase">resolved tickets include the super-admin note.</p>
              </div>
            </div>

            {ticketsQuery.isLoading ? (
              <div className="rounded-2xl border border-brand-line bg-brand-soft/50 p-8 text-center">
                <Loader2 className="mx-auto size-6 animate-spin text-brand-primary mb-2" />
                <p className="text-sm font-semibold text-brand-ink">{toUserCamelCase("loading tickets")}...</p>
                <p className="mt-1 text-xs text-brand-secondary lowercase">fetching your latest support requests.</p>
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
            ) : tickets.length ? (
              <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-ink/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {tickets.map((ticket) => {
                  const status = getStatusMeta(ticket.status);
                  const StatusIcon = status.icon;
                  const isSelected = selectedTicketId === ticket.id;

                  return (
                    <article
                      key={ticket.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedTicketId(ticket.id);
                        }
                      }}
                      className={`rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                        isSelected
                          ? "border-brand-primary bg-brand-primary/5 shadow-md shadow-brand-primary/5"
                          : "border-brand-line bg-brand-neutral/20 hover:border-brand-primary/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-brand-ink leading-tight">{toUserCamelCase(ticket.subject)}</h3>
                          <p className="mt-1.5 text-xs text-brand-secondary font-medium">
                            {ticket.ticket_number ? `${ticket.ticket_number} · ` : ""}
                            {formatDate(ticket.created_at)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>
                          <StatusIcon className="size-3.5" />
                          {toUserCamelCase(status.label)}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-brand-secondary/95 font-medium">{ticket.issue}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white border border-brand-line px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-secondary/80">
                          {toUserCamelCase(ticket.category?.replaceAll("_", " "))}
                        </span>
                        <span className="rounded-full bg-white border border-brand-line px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-secondary/80">
                          {toUserCamelCase(ticket.priority)}
                        </span>
                      </div>
                      {ticket.resolution_note ? (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs leading-5 text-emerald-800">
                          <div className="mb-1 flex items-center gap-2 font-bold uppercase tracking-wider">
                            <ShieldAlert className="size-4" />
                            {toUserCamelCase("resolution")}
                          </div>
                          {ticket.resolution_note}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-brand-line bg-brand-soft/50 p-8 text-center">
                <LifeBuoy className="mx-auto size-8 text-brand-primary opacity-30 mb-2" />
                <p className="text-sm font-semibold text-brand-ink">{toUserCamelCase("no support tickets yet")}</p>
                <p className="mt-1 text-xs text-brand-secondary lowercase">submitted tickets will appear here.</p>
              </div>
            )}
          </Motion.div>
        </div>

        <Dialog open={Boolean(reviewTicket)} onOpenChange={(isOpen) => !isOpen && setReviewTicket(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6 sm:max-w-2xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-brand-ink">{toUserCamelCase("review ticket")}</DialogTitle>
              <DialogDescription className="lowercase">check the ticket details before sending it to the super admin team.</DialogDescription>
            </DialogHeader>

            {reviewTicket ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-brand-line bg-brand-neutral/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary/50">{toUserCamelCase("subject")}</p>
                  <p className="mt-2 text-base font-semibold text-brand-ink">{toUserCamelCase(reviewTicket.subject)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-brand-line bg-brand-neutral/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary/50">{toUserCamelCase("category")}</p>
                    <p className="mt-2 text-sm font-semibold capitalize text-brand-ink">
                      {toUserCamelCase(reviewTicket.category.replaceAll("_", " "))}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-brand-line bg-brand-neutral/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary/50">{toUserCamelCase("priority")}</p>
                    <p className="mt-2 text-sm font-semibold capitalize text-brand-ink">{toUserCamelCase(reviewTicket.priority)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-brand-line bg-brand-neutral/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary/50">{toUserCamelCase("description")}</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-brand-secondary">{reviewTicket.issue}</p>
                </div>
              </div>
            ) : null}

            <DialogFooter className="-mx-6 -mb-6 px-6 py-4 border-t border-brand-line/60 bg-brand-soft/20 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewTicket(null)}
                className="h-11 rounded-2xl border-brand-line px-5 font-semibold"
              >
                {toUserCamelCase("edit")}
              </Button>
              <Button
                type="button"
                onClick={onConfirmCreate}
                disabled={createTicketMutation.isPending}
                className="h-11 rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white border-0 hover:opacity-90 font-bold px-6 shadow-md shadow-brand-primary/10"
              >
                {createTicketMutation.isPending ? "creating..." : toUserCamelCase("create ticket")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(selectedTicketId)} onOpenChange={onTicketModalOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6 sm:max-w-5xl border-none shadow-2xl">
            {selectedTicketQuery.isLoading ? (
              <div className="rounded-2xl border border-brand-line bg-brand-soft/50 p-8 text-center">
                <Loader2 className="mx-auto size-6 animate-spin text-brand-primary mb-2" />
                <p className="text-sm font-semibold text-brand-ink">{toUserCamelCase("loading conversation")}...</p>
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
                      <DialogTitle className="mt-2 text-xl font-semibold text-brand-ink">
                        {toUserCamelCase(selectedTicket?.subject)}
                      </DialogTitle>
                      <DialogDescription className="mt-1">{formatDate(selectedTicket?.created_at)}</DialogDescription>
                    </div>
                    {selectedTicket ? (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusMeta(selectedTicket.status).className}`}>
                        {toUserCamelCase(getStatusMeta(selectedTicket.status).label)}
                      </span>
                    ) : null}
                  </div>
                </DialogHeader>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.6fr)] mt-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTicket?.category ? (
                        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-secondary uppercase tracking-wider">
                          {toUserCamelCase(selectedTicket.category.replaceAll("_", " "))}
                        </span>
                      ) : null}
                      {selectedTicket?.priority ? (
                        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold capitalize text-brand-secondary uppercase tracking-wider">
                          {toUserCamelCase(selectedTicket.priority)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 whitespace-pre-line rounded-2xl border border-brand-line bg-brand-neutral/40 p-4 text-sm leading-6 text-brand-secondary font-medium">
                      {selectedTicket?.issue}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="max-h-[300px] space-y-3 overflow-y-auto rounded-2xl border border-brand-line bg-brand-neutral/40 p-3 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-ink/10 [&::-webkit-scrollbar-thumb]:rounded-full">
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
                        <p className="p-5 text-center text-xs font-semibold text-brand-secondary/60 lowercase">{toUserCamelCase("no replies yet")}.</p>
                      )}
                    </div>

                    <form onSubmit={onReplySubmit} className="space-y-3">
                      <Textarea
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                        placeholder="write a reply..."
                        className="min-h-28 rounded-2xl border-brand-line bg-brand-neutral/50 focus:bg-white placeholder:text-brand-secondary/40"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={replyMutation.isPending || !replyMessage.trim()}
                          className="h-11 rounded-2xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] text-white border-0 hover:opacity-90 font-bold px-6 shadow-md shadow-brand-primary/10"
                        >
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
    </AdminLayout>
  );
}
