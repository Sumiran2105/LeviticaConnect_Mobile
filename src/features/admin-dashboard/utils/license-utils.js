import { formatISTDateTime } from "@/lib/date-time";

export function normalizeLicense(data) {
  const license = data?.license || data?.data || data;

  if (!license || typeof license !== "object") {
    return {
      exists: false,
      plan: "No license",
      maxUsers: 0,
      usedUsers: 0,
      remainingUsers: 0,
      expiresAt: null,
      isActive: false,
      canAddUser: false,
      blockedReason: "License not found.",
    };
  }

  const maxUsers = Number(license.max_users ?? license.maxUsers ?? 0);
  const usedUsers = Number(license.used_users ?? license.usedUsers ?? 0);
  const remainingUsers = Number(
    license.remaining_users ?? license.remainingUsers ?? Math.max(maxUsers - usedUsers, 0)
  );
  const expiresAt = license.expires_at || license.expiresAt || null;
  const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
  const hasExpired = expiresAtDate ? expiresAtDate.getTime() < Date.now() : false;
  const isActive = Boolean(license.is_active ?? license.isActive);

  let blockedReason = "";

  if (!isActive) {
    blockedReason = "License inactive.";
  } else if (hasExpired) {
    blockedReason = "License expired.";
  } else if (remainingUsers <= 0) {
    blockedReason = `${license.plan || license.plan_name || "Current"} plan allows only ${maxUsers} active users.`;
  }

  return {
    exists: true,
    plan: license.plan || license.plan_name || "Current plan",
    maxUsers,
    usedUsers,
    remainingUsers,
    expiresAt,
    isActive,
    hasExpired,
    canAddUser: !blockedReason,
    blockedReason,
  };
}

export function formatLicenseDate(value) {
  if (!value) return "Not set";

  return formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }, value);
}
