import { ChevronRight, Globe, Info, Layout, Send, Trash2, Type, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SUPERADMIN_COMPANIES, SYSTEM_NOTIFICATIONS_BROADCAST, SYSTEM_NOTIFICATIONS_HISTORY } from "@/config/api";
import { apiClient } from "@/lib/client";
import dayjs from "dayjs";
import { useAuthStore } from "@/store/auth-store";

function normalizeCompanies(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.companies)) return data.companies;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getCompanyId(company) {
  return company?.id || company?.company_id || "";
}

function getCompanyName(company) {
  return company?.name || company?.company_name || "Company";
}

export function SendNotificationsPage() {
  const [recipientType, setRecipientType] = useState("all"); // 'all' or 'specific'
  const [selectedCompany, setSelectedCompany] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const session = useAuthStore((state) => state.session);
  const accessToken = session?.accessToken;

  const requestConfig = useMemo(
    () => ({
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    }),
    [accessToken]
  );

  const companiesQuery = useQuery({
    queryKey: ["super-admin-notification-companies"],
    queryFn: async () => {
      const response = await apiClient.get(SUPERADMIN_COMPANIES, requestConfig);
      return normalizeCompanies(response.data);
    },
    enabled: Boolean(accessToken),
  });

  const companies = useMemo(() => companiesQuery.data || [], [companiesQuery.data]);
  const selectedCompanyName = useMemo(() => {
    const company = companies.find((item) => String(getCompanyId(item)) === String(selectedCompany));
    return company ? getCompanyName(company) : "";
  }, [companies, selectedCompany]);

  const historyQuery = useQuery({
    queryKey: ["system-notifications-history"],
    queryFn: async () => {
      const response = await apiClient.get(SYSTEM_NOTIFICATIONS_HISTORY, requestConfig);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: Boolean(accessToken),
  });
  const historyList = useMemo(() => historyQuery.data || [], [historyQuery.data]);

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();

      if (!trimmedSubject) {
        throw new Error("Enter notification subject.");
      }

      if (!trimmedMessage) {
        throw new Error("Enter notification message.");
      }

      if (recipientType === "specific" && !selectedCompany) {
        throw new Error("Select a company before sending.");
      }

      const payload = {
        title: trimmedSubject,
        message: trimmedMessage,
        notification_type: "super_admin_alert",
        send_to_all: recipientType === "all",
        company_ids: recipientType === "specific" ? [selectedCompany] : [],
      };

      return apiClient.post(SYSTEM_NOTIFICATIONS_BROADCAST, payload, requestConfig);
    },
    onSuccess: (response) => {
      const recipients = response.data?.recipients;
      toast.success(
        typeof recipients === "number"
          ? `Notification sent to ${recipients} company admin${recipients === 1 ? "" : "s"}.`
          : "Notification sent successfully."
      );
      handleClear();
      setIsModalOpen(false);
      historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "Unable to send notification."
      );
    },
  });

  const handleSend = () => {
    sendNotificationMutation.mutate();
  };

  const handleClear = () => {
    setRecipientType("all");
    setSelectedCompany("");
    setSubject("");
    setMessage("");
  };

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-5xl space-y-8 pb-12">

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
              System Notifications
            </h1>
            <p className="text-sm text-brand-secondary">
              View notification history and reach out to Company administrators.
            </p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 rounded-2xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 hover:shadow-xl hover:shadow-brand-primary/30 transition-all font-bold">
                <Send className="mr-2 size-4" />
                New Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto !rounded-[32px] sm:!rounded-[40px] p-6 sm:p-10 bg-[#FAFAFA] border-none shadow-2xl ">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold tracking-tight text-brand-ink ">Send Notification</DialogTitle>
              </DialogHeader>

              <div className="space-y-8">

                <div className="flex items-start gap-4 rounded-[24px] border border-brand-primary/10 bg-brand-primary/5 p-5 shadow-sm">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                    <Info className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-brand-ink">Notification target</p>
                    <p className="text-sm leading-relaxed text-brand-secondary/80">
                      Select Company names to send the mail notification. You can target all Companies or specific ones.
                    </p>
                  </div>
                </div>


                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">
                      Select Recipients
                    </span>
                    <div className="h-px flex-1 bg-brand-line/40" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-4xl">

                    <div
                      onClick={() => {
                        setRecipientType("all");
                        setSelectedCompany("");
                      }}
                      className={`group cursor-pointer relative overflow-hidden rounded-[24px] border p-5 transition-all duration-300 ${recipientType === "all"
                        ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20 shadow-md shadow-brand-primary/5"
                        : "border-brand-line bg-white hover:border-brand-primary/30 hover:bg-brand-neutral/40"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${recipientType === "all"
                            ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                            : "bg-brand-neutral text-brand-secondary group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
                            }`}
                        >
                          <Globe className="size-6" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-bold text-brand-ink">All Companies</h3>
                          <p className="text-xs text-brand-secondary/70">
                            Send to all administrators
                          </p>
                        </div>
                        {recipientType === "all" && (
                          <div className="ml-auto flex size-5 items-center justify-center rounded-full bg-brand-primary text-white animate-in zoom-in duration-300">
                            <div className="size-1.5 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </div>


                    <div
                      onClick={() => setRecipientType("specific")}
                      className={`group cursor-pointer relative overflow-hidden rounded-[24px] border p-5 transition-all duration-300 ${recipientType === "specific"
                        ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20 shadow-md shadow-brand-primary/5"
                        : "border-brand-line bg-white hover:border-brand-primary/30 hover:bg-brand-neutral/40"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${recipientType === "specific"
                            ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                            : "bg-brand-neutral text-brand-secondary group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
                            }`}
                        >
                          <Layout className="size-6" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-bold text-brand-ink">Specific Company</h3>
                          <p className="text-xs text-brand-secondary/70">
                            Select specific names
                          </p>
                        </div>
                        {recipientType === "specific" && (
                          <div className="ml-auto flex size-5 items-center justify-center rounded-full bg-brand-primary text-white animate-in zoom-in duration-300">
                            <div className="size-1.5 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>


                  {recipientType === "specific" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-primary">
                          Company Name
                        </span>
                      </div>
                      <div className="relative group">
                        <select
                          value={selectedCompany}
                          onChange={(e) => setSelectedCompany(e.target.value)}
                          disabled={companiesQuery.isLoading || companiesQuery.isError}
                          className="h-12 w-full appearance-none rounded-2xl border border-brand-line bg-white px-5 text-sm font-medium text-brand-ink outline-none transition-all focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 cursor-pointer"
                        >
                          <option value="" disabled>
                            {companiesQuery.isLoading
                              ? "Loading companies..."
                              : companiesQuery.isError
                                ? "Unable to load companies"
                                : "Select company name"}
                          </option>
                          {companies.map((company) => {
                            const companyId = getCompanyId(company);
                            const companyName = getCompanyName(company);

                            if (!companyId) return null;

                            return (
                              <option key={companyId} value={companyId}>
                                {companyName}
                              </option>
                            );
                          })}
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-secondary group-hover:text-brand-primary transition-colors">
                          <ChevronRight className="size-4 rotate-90" />
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="flex items-center gap-2.5 text-[11px] font-semibold text-brand-primary/80 px-1">
                    <span className="flex size-3.5 items-center justify-center rounded-full border border-brand-primary/30 bg-brand-primary/10">
                      <span className="size-1 rounded-full bg-brand-primary" />
                    </span>
                    {recipientType === "all"
                      ? "Notification will be sent to ALL company administrators"
                      : selectedCompanyName
                        ? `Notification will be sent to ${selectedCompanyName} administrators`
                        : "Notification will be sent to the selected company administrators"}
                  </p>
                </div>


                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">
                      Subject
                    </span>
                    <div className="h-px flex-1 bg-brand-line/40" />
                  </div>
                  <div className="rounded-[24px] border border-brand-line bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-brand-primary/10 focus-within:border-brand-primary transition-all">
                    <div className="flex items-center gap-4 px-4 py-2">
                      <Type className="size-5 text-brand-primary/40" />
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter notification subject"
                        className="h-10 w-full bg-transparent text-sm font-medium text-brand-ink outline-none placeholder:text-brand-secondary/40"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-brand-tertiary px-2">
                    Clear and concise subject line
                  </p>
                </div>


                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">
                      Message
                    </span>
                    <div className="h-px flex-1 bg-brand-line/40" />
                  </div>
                  <div className="rounded-[32px] border border-brand-line bg-white p-6 shadow-sm focus-within:ring-2 focus-within:ring-brand-primary/10 focus-within:border-brand-primary transition-all">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your message here..."
                      className="min-h-[160px] w-full resize-none bg-transparent text-sm leading-relaxed text-brand-ink outline-none placeholder:text-brand-secondary/40"
                    />
                    <div className="mt-4 flex items-center justify-end border-t border-brand-neutral pt-4 text-[11px] font-medium text-brand-secondary/40">
                      {message.length} characters
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-brand-primary/70 px-2">
                    Provide detailed information
                  </p>
                </div>


                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    className="h-12 w-full sm:w-auto flex-1 px-6 rounded-2xl border-brand-line text-brand-secondary hover:bg-brand-soft font-bold transition-all"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Clear
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={
                      sendNotificationMutation.isPending ||
                      !subject.trim() ||
                      !message.trim() ||
                      (recipientType === "specific" && !selectedCompany)
                    }
                    className="h-12 w-full sm:w-auto flex-1 px-6 rounded-2xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 hover:shadow-xl hover:shadow-brand-primary/30 transition-all font-bold disabled:opacity-50 disabled:shadow-none whitespace-nowrap"
                  >
                    <Send className="mr-2 size-4" />
                    {sendNotificationMutation.isPending ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>


        <div className="space-y-5 rounded-[32px] sm:rounded-[40px] border border-brand-line bg-white p-5 sm:p-8 md:p-10 shadow-[0_16px_50px_rgba(68,83,74,0.06)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">
              Notification History
            </span>
            <div className="h-px flex-1 bg-brand-line/40" />
          </div>

          {historyQuery.isLoading ? (
            <div className="text-center text-sm text-brand-secondary py-8">Loading history...</div>
          ) : historyQuery.isError ? (
            <div className="text-center text-sm text-red-500 py-8">Unable to load notification history.</div>
          ) : historyList.length === 0 ? (
            <div className="text-center text-sm text-brand-secondary py-8">No notifications sent yet.</div>
          ) : (
            <div className="space-y-4">
              {historyList.map((item) => (
                <div key={item.id} className="rounded-2xl border border-brand-line p-5 hover:bg-brand-neutral/40 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="font-bold text-brand-ink text-sm">{item.title}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-brand-secondary/70 shrink-0">
                      <Clock className="size-3" />
                      <span>{dayjs(item.created_at).format("MMM D, YYYY h:mm A")}</span>
                    </div>
                  </div>
                  <p className="text-sm text-brand-secondary whitespace-pre-wrap leading-relaxed">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
