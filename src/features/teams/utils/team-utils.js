import * as z from "zod";

export const channelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and dashes"),
  visibility: z.enum(["public", "private"]).default("public"),
  is_cross_team: z.boolean().default(false),
  description: z.string().optional(),
  company_id: z.string().uuid("Invalid Company ID"),
  team_id: z.string().uuid("Please select a team"),
  is_private: z.boolean().default(false),
  avatar_url: z.string().optional(),
  banner_url: z.string().optional(),
  topic: z.string().optional(),
  purpose: z.string().optional(),
  parent_channel_id: z.string().uuid().optional().nullable(),
  is_discoverable: z.boolean().default(true),
  message_retention_days: z.number().min(1).default(365),
  max_members: z.number().min(1).default(100),
  default_access: z.enum(["member", "guest", "admin"]).default("member"),
  settings: z.object({
    notifications_default: z.enum(["all", "mentions", "nothing"]).default("all"),
    allow_mentions: z.boolean().default(true),
    allow_file_uploads: z.boolean().default(true),
    allow_link_previews: z.boolean().default(true),
    allow_bots: z.boolean().default(true),
    allow_guest_access: z.boolean().default(false),
    cross_functional_team_ids: z.array(z.string().uuid()).default([]),
    moderation_settings: z.object({}).optional(),
  }),
  moderation_settings: z.object({}).optional(),
});

export const DEFAULT_VALUES = {
  name: "",
  slug: "",
  visibility: "public",
  is_cross_team: false,
  description: "",
  company_id: "",
  team_id: "",
  is_private: false,
  avatar_url: "",
  banner_url: "",
  topic: "",
  purpose: "",
  parent_channel_id: null,
  is_discoverable: true,
  message_retention_days: 365,
  max_members: 100,
  default_access: "member",
  settings: {
    notifications_default: "all",
    allow_mentions: true,
    allow_file_uploads: true,
    allow_link_previews: true,
    allow_bots: true,
    allow_guest_access: false,
    cross_functional_team_ids: [],
    moderation_settings: {},
  },
  moderation_settings: {},
};

export const getTeamCompanyId = (team) =>
  team?.company_id ||
  team?.companyId ||
  team?.organization_id ||
  team?.organisation_id ||
  team?.tenant_id ||
  "";

export const getChannelCrossTeamIds = (channel) =>
  (
    channel?.settings?.cross_functional_team_ids ||
    channel?.cross_functional_team_ids ||
    []
  )
    .filter(Boolean)
    .map(String);

export const getChannelId = (channel) =>
  channel?.id ||
  channel?.channel_id ||
  channel?.uuid ||
  null;

export const isChannelArchived = (channel) =>
  Boolean(
    channel?.is_archived ||
      channel?.isArchived ||
      channel?.archived ||
      channel?.archived_at ||
      String(channel?.status || "").toLowerCase() === "archived"
  );

export const isDirectChannel = (channel) => {
  const channelKind = String(
    channel?.channel_type ||
      channel?.channelType ||
      channel?.type ||
      channel?.kind ||
      channel?.category ||
      ""
  ).toLowerCase();
  const channelName = String(channel?.name || channel?.channel_name || "").trim().toLowerCase();

  return Boolean(
    channel?.is_direct ||
      channel?.isDirect ||
      channel?.is_dm ||
      channel?.isDm ||
      channel?.dm_channel_id ||
      channel?.direct_channel_id ||
      ["direct", "dm", "direct_message", "direct-message", "private_message"].includes(channelKind) ||
      channelName === "direct"
  );
};

export const normalizeChannel = (channel) => {
  const id = getChannelId(channel);
  const isArchived = isChannelArchived(channel);

  return {
    ...channel,
    id,
    channel_id: channel?.channel_id || id,
    name: channel?.name || channel?.channel_name || "Untitled channel",
    is_archived: isArchived,
    isArchived,
    is_direct: isDirectChannel(channel),
  };
};

export const getUserRecord = (record) =>
  record?.user ||
  record?.users ||
  record?.profile ||
  record?.profiles ||
  record?.member ||
  record?.account ||
  record?.sender ||
  record?.author ||
  record?.creator ||
  record;

export const getUserId = (record) => {
  const user = getUserRecord(record);
  return (
    record?.sender_id ||
    record?.senderId ||
    record?.author_id ||
    record?.authorId ||
    record?.created_by_id ||
    record?.created_by ||
    record?.user_id ||
    record?.userId ||
    record?.member_id ||
    record?.memberId ||
    user?.id ||
    user?.user_id ||
    user?.uuid ||
    record?.id ||
    record?.uuid ||
    null
  );
};

export const getUserName = (record, fallbackId, role) => {
  const user = getUserRecord(record);
  
  const firstName = record?.first_name || user?.first_name || record?.firstName || user?.firstName;
  const lastName = record?.last_name || user?.last_name || record?.lastName || user?.lastName;
  const combinedName = (firstName || lastName) ? `${firstName || ''} ${lastName || ''}`.trim() : null;

  return (
    combinedName ||
    record?.sender_name ||
    record?.senderName ||
    record?.author_name ||
    record?.authorName ||
    record?.user_name ||
    record?.userName ||
    record?.created_by_name ||
    record?.username ||
    user?.username ||
    record?.pinned_by_name ||
    user?.full_name ||
    user?.name ||
    user?.display_name ||
    user?.email ||
    record?.full_name ||
    record?.name ||
    record?.display_name ||
    record?.email ||
    (role?.toLowerCase?.() === "owner" ? "Channel admin" : null) ||
    (fallbackId ? `User ...${fallbackId.slice(-6)}` : "Unknown user")
  );
};

export const getUserEmail = (record) => {
  const user = getUserRecord(record);
  return user?.email || user?.mail || record?.email || record?.mail || "";
};

export const getUserAvatar = (record) => {
  const user = getUserRecord(record);
  return user?.avatar_url || user?.profile_picture || user?.image || record?.avatar_url || null;
};

export const getMemberContactTarget = (member) => {
  const userId = getUserId(member);
  const name = getUserName(member, userId, member?.role);
  const email = getUserEmail(member);
  const avatarUrl = getUserAvatar(member);

  if (!userId && !email) return null;

  return {
    ...member,
    id: userId || email,
    userId: userId || member?.userId || member?.user_id || null,
    user_id: userId || member?.user_id || member?.userId || null,
    name,
    full_name: name,
    display_name: name,
    email,
    avatar_url: avatarUrl,
    image: avatarUrl,
  };
};

export const getRoleLabel = (role) => {
  const normalized = String(role || "user").toLowerCase();
  if (normalized === "owner" || normalized === "admin") return "Admin";
  if (normalized === "member" || normalized === "user") return "User";
  return normalized.replace(/_/g, " ");
};

/**
 * Parse mentions in message text
 * Returns array of objects with type ('text' or 'mention') and content
 */
export const parseMentions = (text) => {
  if (!text || typeof text !== "string") return [{ type: "text", content: text }];

  const mentionRegex = /@([A-Za-z0-9_.-]+(?:\s+[A-Z][A-Za-z0-9_.-]+)*|everyone)(?=$|[\s.,!?;:])/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add mention
    parts.push({
      type: "mention",
      content: match[1].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
};
