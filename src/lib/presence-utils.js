export const statusToneMap = {
  online: "bg-emerald-500",
  offline: "bg-slate-400",
  away: "bg-amber-500",
  busy: "bg-rose-500",
  do_not_disturb: "bg-fuchsia-600",
  in_meeting: "bg-sky-600",
  on_call: "bg-indigo-600",
  out_of_office: "bg-orange-600",
};

export function formatStatusLabel(status) {
  if (!status) {
    return "Online";
  }

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizePresenceOptions(data) {
  return {
    statuses: Array.isArray(data?.statuses) ? data.statuses : [],
    defaultCustomStatuses: Array.isArray(data?.default_custom_status)
      ? data.default_custom_status
      : [],
  };
}

function toPlainText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return value.text || value.label || value.value || value.name || "";
  }

  return String(value);
}

export function normalizePresence(data) {
  const rawCustomStatus =
    data?.custom_status ||
    data?.customStatus ||
    (data?.emoji || data?.text
      ? {
          emoji: data?.emoji || "",
          text: data?.text || "",
        }
      : null);

  const customStatus = rawCustomStatus
    ? {
        emoji: toPlainText(rawCustomStatus?.emoji),
        text: toPlainText(rawCustomStatus?.text || rawCustomStatus),
      }
    : null;

  return {
    status: toPlainText(data?.status || data?.presence_status || "online") || "online",
    customStatus: customStatus?.text || customStatus?.emoji ? customStatus : null,
  };
}

export function customStatusLabel(customStatus) {
  if (!customStatus) {
    return "No custom status set";
  }

  return `${customStatus.emoji || ""} ${customStatus.text || ""}`.trim() || "No custom status set";
}
