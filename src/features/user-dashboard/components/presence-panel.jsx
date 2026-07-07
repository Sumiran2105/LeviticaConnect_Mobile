import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, LoaderCircle, MoonStar, SmilePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PRESENCE_CUSTOM_STATUS,
  PRESENCE_ME,
  PRESENCE_OPTIONS,
  PRESENCE_STATUS,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import {
  customStatusLabel,
  formatStatusLabel,
  normalizePresence,
  normalizePresenceOptions,
  statusToneMap,
} from "@/lib/presence-utils";

function extractErrorMessage(error, fallbackMessage) {
  const raw =
    error?.response?.data?.message ??
    error?.response?.data?.detail ??
    error?.message;

  if (!raw) {
    return fallbackMessage;
  }

  if (typeof raw === "string") {
    return raw;
  }

  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.msg || item?.message || item?.detail || JSON.stringify(item)
      )
      .filter(Boolean)
      .join(", ");
  }

  if (typeof raw === "object") {
    return raw.msg || raw.message || raw.detail || JSON.stringify(raw);
  }

  return String(raw);
}

export function PresencePanel({ session }) {
  const queryClient = useQueryClient();
  const [isStatusListOpen, setIsStatusListOpen] = useState(false);
  const [isCustomStatusListOpen, setIsCustomStatusListOpen] = useState(false);
  const [customStatusText, setCustomStatusText] = useState("");
  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
  };

  const optionsQuery = useQuery({
    queryKey: ["presence-options"],
    queryFn: async () => {
      const response = await apiClient.get(PRESENCE_OPTIONS, {
        headers: authHeaders,
      });

      return normalizePresenceOptions(response.data);
    },
    enabled: Boolean(session?.accessToken),
    staleTime: 5 * 60 * 1000,
  });

  const presenceQuery = useQuery({
    queryKey: ["presence-me"],
    queryFn: async () => {
      const response = await apiClient.get(PRESENCE_ME, {
        headers: authHeaders,
      });

      return normalizePresence(response.data);
    },
    enabled: Boolean(session?.accessToken),
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      const response = await apiClient.post(PRESENCE_STATUS, null, {
        headers: authHeaders,
        params: {
          status,
        },
      });

      return response.data;
    },
    onSuccess: (_, status) => {
      queryClient.setQueryData(["presence-me"], (current) => ({
        ...(current || {}),
        status,
      }));
      setIsStatusListOpen(false);
      toast.success(`Presence updated to ${formatStatusLabel(status)}.`);
    },
    onError: (error) => {
      const message = extractErrorMessage(
        error,
        "Unable to update your presence right now."
      );
      toast.error(message);
    },
  });

  const updateCustomStatusMutation = useMutation({
    mutationFn: async (customStatus) => {
      const payload = customStatus
        ? {
            emoji: customStatus.emoji,
            text: customStatus.text,
          }
        : {
            emoji: "",
            text: "",
          };

      const response = await apiClient.post(PRESENCE_CUSTOM_STATUS, null, {
        headers: authHeaders,
        params: payload,
      });

      return response.data;
    },
    onSuccess: (_, customStatus) => {
      queryClient.setQueryData(["presence-me"], (current) => ({
        ...(current || {}),
        customStatus: customStatus || null,
      }));
      setIsCustomStatusListOpen(false);
      setCustomStatusText("");
      toast.success(
        customStatus?.text ? "Custom status updated." : "Custom status cleared."
      );
    },
    onError: (error) => {
      const message = extractErrorMessage(
        error,
        "Unable to update your custom status right now."
      );
      toast.error(message);
    },
  });

  const presence = presenceQuery.data || { status: "online", customStatus: null };
  const currentStatus = presence.status || "online";
  const currentCustomStatus = presence.customStatus;
  const statuses = optionsQuery.data?.statuses || [];
  const defaultCustomStatuses = optionsQuery.data?.defaultCustomStatuses || [];
  const isSaving =
    updateStatusMutation.isPending || updateCustomStatusMutation.isPending;

  function handleCustomStatusSubmit() {
    const trimmed = customStatusText.trim();

    if (!trimmed) {
      toast.error("Enter a custom status message.");
      return;
    }

    updateCustomStatusMutation.mutate({
      emoji: currentCustomStatus?.emoji || "💬",
      text: trimmed,
    });
  }

  return (
    <>
      <div className="border-b border-gray-100 px-6 py-3">
        <button
          type="button"
          onClick={() => {
            setIsStatusListOpen((current) => !current);
            setIsCustomStatusListOpen(false);
          }}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full ${statusToneMap[currentStatus] || statusToneMap.online}`} />
            <span className="text-sm font-medium text-gray-900">
              {formatStatusLabel(currentStatus)}
            </span>
          </div>
          <ChevronRight
            className={`size-4 text-gray-400 transition-transform ${isStatusListOpen ? "rotate-90" : ""}`}
          />
        </button>

        {isStatusListOpen ? (
          <div className="mt-2 grid gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2">
            {statuses.map((status) => {
              const isActive = currentStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateStatusMutation.mutate(status)}
                  disabled={isSaving}
                  className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  <span
                    className={`size-2.5 rounded-full ${
                      statusToneMap[status] || statusToneMap.online
                    }`}
                  />
                  <span>{formatStatusLabel(status)}</span>
                  {isActive ? <Check className="ml-auto size-4 text-emerald-600" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="px-6 py-3">
        <button
          type="button"
          onClick={() => {
            setIsCustomStatusListOpen((current) => !current);
            setIsStatusListOpen(false);
          }}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <SmilePlus className="size-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              {currentCustomStatus ? customStatusLabel(currentCustomStatus) : "Set status message"}
            </span>
          </div>
          <ChevronRight
            className={`size-4 text-gray-400 transition-transform ${isCustomStatusListOpen ? "rotate-90" : ""}`}
          />
        </button>

        {isCustomStatusListOpen ? (
          <div className="mt-2 grid gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2">
            <div className="rounded-xl bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Custom message
              </p>
              <div className="flex flex-col gap-2">
                <Input
                  value={customStatusText}
                  onChange={(event) => setCustomStatusText(event.target.value)}
                  placeholder="Enter your custom status"
                  className="h-10 rounded-xl border-gray-200 bg-white text-sm text-gray-900"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCustomStatusSubmit}
                    disabled={isSaving}
                    className="h-9 rounded-xl bg-brand-primary px-4 text-white hover:bg-brand-primary/90"
                  >
                    {updateCustomStatusMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      "Save message"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCustomStatusText("")}
                    disabled={isSaving}
                    className="h-9 rounded-xl border-gray-200 px-4"
                  >
                    Clear input
                  </Button>
                </div>
              </div>
            </div>

            {defaultCustomStatuses.map((item, index) => {
              const key = `${item.text}-${index}`;
              const isSelected =
                currentCustomStatus?.text === item.text &&
                currentCustomStatus?.emoji === item.emoji;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateCustomStatusMutation.mutate(item)}
                  disabled={isSaving}
                  className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  <SmilePlus className="size-4 text-gray-500" />
                  <span className="truncate">
                    {item.emoji} {item.text}
                  </span>
                  {isSelected ? <Check className="ml-auto size-4 text-emerald-600" /> : null}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => updateCustomStatusMutation.mutate(null)}
              disabled={isSaving}
              className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              <MoonStar className="size-4 text-gray-500" />
              <span>Clear custom status</span>
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
