import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BellRing, Check, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SYSTEM_NOTIFICATION_MARK_READ, SYSTEM_NOTIFICATIONS_MY } from "@/config/api";
import { AdminLayout } from "@/layouts/admin-layout";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { useAuthStore } from "@/store/auth-store";

function normalizeNotifications(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatAlertDate(value) {
  if (!value) return "Just now";

  return formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }, "Just now");
}

export function AdminAlertsPage() {
  const session = useAuthStore((state) => state.session);
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  const requestConfig = useMemo(
    () => ({
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    }),
    [accessToken]
  );

  const alertsQuery = useQuery({
    queryKey: ["admin-system-notifications", accessToken],
    queryFn: async () => {
      const response = await apiClient.get(SYSTEM_NOTIFICATIONS_MY, requestConfig);
      return normalizeNotifications(response.data);
    },
    enabled: Boolean(accessToken),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });

  const alerts = useMemo(() => alertsQuery.data || [], [alertsQuery.data]);
  const unreadCount = alerts.filter((alert) => !alert.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await apiClient.put(SYSTEM_NOTIFICATION_MARK_READ(notificationId), null, requestConfig);
      return notificationId;
    },
    onSuccess: (notificationId) => {
      queryClient.setQueryData(["admin-system-notifications", accessToken], (current) =>
        normalizeNotifications(current).map((alert) =>
          String(alert.id) === String(notificationId)
            ? { ...alert, is_read: true }
            : alert
        )
      );
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          "Unable to mark this alert as read."
      );
    },
  });

  const markAllRead = () => {
    const unreadAlerts = alerts.filter((alert) => !alert.is_read);

    if (!unreadAlerts.length) {
      toast.info("No unread alerts.");
      return;
    }

    unreadAlerts.forEach((alert) => markReadMutation.mutate(alert.id));
  };

  return (
    <AdminLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-brand-line bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
              <BellRing className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-ink">Super Admin Alerts</h1>
              <p className="mt-1 text-sm text-brand-secondary">
                Announcements and system messages sent to your company.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-primary">
              {unreadCount} unread
            </span>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-brand-line"
              onClick={() => alertsQuery.refetch()}
              disabled={alertsQuery.isFetching}
            >
              {alertsQuery.isFetching ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Refresh
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90"
              onClick={markAllRead}
              disabled={!unreadCount || markReadMutation.isPending}
            >
              <Check className="mr-2 size-4" />
              Mark all read
            </Button>
          </div>
        </div>

        {alertsQuery.isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-brand-line bg-white text-sm font-semibold text-brand-secondary">
            <LoaderCircle className="mr-2 size-5 animate-spin text-brand-primary" />
            Loading alerts...
          </div>
        ) : alertsQuery.isError ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-red-100 bg-white px-6 text-center">
            <AlertCircle className="size-10 text-red-500" />
            <h2 className="mt-4 text-lg font-bold text-brand-ink">Unable to load alerts</h2>
            <p className="mt-2 max-w-sm text-sm text-brand-secondary">
              Please refresh the page or try again in a moment.
            </p>
          </div>
        ) : alerts.length ? (
          <div className="overflow-hidden rounded-3xl border border-brand-line bg-white shadow-sm">
            <div className="divide-y divide-brand-line/70">
              {alerts.map((alert) => {
                const isUnread = !alert.is_read;

                return (
                  <article
                    key={alert.id}
                    className={`flex flex-col gap-4 p-5 transition sm:flex-row sm:items-start sm:justify-between ${
                      isUnread ? "bg-brand-soft/40" : "bg-white"
                    }`}
                  >
                    <div className="flex min-w-0 gap-4">
                      <div
                        className={`mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                          isUnread
                            ? "bg-brand-primary text-white"
                            : "bg-brand-neutral text-brand-secondary"
                        }`}
                      >
                        <BellRing className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-brand-ink">{alert.title}</h2>
                          {isUnread ? (
                            <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-secondary">
                          {alert.message}
                        </p>
                        <p className="mt-3 text-xs font-semibold text-brand-tertiary">
                          {formatAlertDate(alert.created_at)}
                        </p>
                      </div>
                    </div>
                    {isUnread ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 rounded-xl border-brand-line"
                        onClick={() => markReadMutation.mutate(alert.id)}
                        disabled={markReadMutation.isPending}
                      >
                        <Check className="mr-2 size-4" />
                        Mark read
                      </Button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-brand-line bg-white px-6 text-center">
            <Inbox className="size-12 text-brand-secondary/50" />
            <h2 className="mt-4 text-lg font-bold text-brand-ink">No alerts yet</h2>
            <p className="mt-2 max-w-sm text-sm text-brand-secondary">
              Alerts sent by the super admin will appear here.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
