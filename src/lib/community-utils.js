import { formatISTDateTime } from "@/lib/date-time";

export const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 18,
    },
  },
};


export function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.communities)) return data.communities;
  if (Array.isArray(data?.posts)) return data.posts;
  if (Array.isArray(data?.approvals)) return data.approvals;
  if (Array.isArray(data?.pending_users)) return data.pending_users;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export function normalizePendingJoinRequests(data) {
  const requestsById = new Map();

  normalizeList(data).forEach((request) => {
    const requestId = request.request_id || request.id;
    if (!requestId) return;

    const existing = requestsById.get(requestId);
    const departments = new Set(existing?.departments || []);
    const departmentName = request.department || request.department_name || request.team_name || request.team?.name;

    if (departmentName) departments.add(departmentName);

    requestsById.set(requestId, {
      ...existing,
      ...request,
      id: requestId,
      requestId,
      name: request.user_name || request.name || request.user?.name || request.user?.full_name || "Community member",
      email: request.email || request.user?.email,
      department: Array.from(departments).join(", ") || "No department",
      requestedAt: request.created_at || request.requestedAt || request.createdAt,
      departments,
    });
  });

  return Array.from(requestsById.values()).map((request) => {
    const normalizedRequest = { ...request };
    delete normalizedRequest.departments;
    return normalizedRequest;
  });
}

export function normalizePendingPostApprovals(data) {
  return normalizeList(data).map((approval) => {
    const approvalId = approval.id || approval.approval_id || approval.request_id;
    const userName = approval.user?.name || approval.user?.full_name || approval.user_name || approval.name || "Community member";
    const userEmail = approval.user?.email || approval.email;

    return {
      ...approval,
      id: approvalId,
      content: approval.content || approval.post_content || "",
      media_url: approval.media_url || approval.mediaUrl,
      created_at: approval.created_at || approval.requested_at || approval.createdAt,
      user: {
        ...approval.user,
        id: approval.user?.id || approval.user_id,
        name: userName,
        email: userEmail,
      },
    };
  }).filter((approval) => approval.id);
}

export function formatDate(value) {
  if (!value) return "Just now";

  return formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }, "Recently");
}

export function getInitials(name = "Community") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function getUserId(user) {
  return user?.id || user?.user_id || user?._id || user?.uuid;
}

export function getUserName(user) {
  return user?.name || user?.full_name || user?.username || user?.email?.split("@")[0] || "User";
}

export function getUserEmail(user) {
  return user?.email || user?.user?.email || "";
}

export function getCommunityMemberUserId(member) {
  return member?.user?.id || member?.user_id || member?.target_user_id;
}

export function getCommunityMemberName(member) {
  return member?.user?.name || member?.user?.full_name || member?.name || member?.full_name || "Community Member";
}

export function getCommunityMemberEmail(member) {
  return member?.user?.email || member?.email || "";
}

export function getPinnedAnnouncementCopy(content = "") {
  const text = String(content || "").trim();
  if (!text) {
    return {
      title: "Pinned community announcement",
      body: "",
    };
  }

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    return {
      title: lines[0],
      body: lines.slice(1).join("\n"),
    };
  }

  const sentenceMatch = text.match(/^(.+?[.!?])\s+(.+)$/);
  if (sentenceMatch) {
    return {
      title: sentenceMatch[1],
      body: sentenceMatch[2],
    };
  }

  return {
    title: text,
    body: "",
  };
}
