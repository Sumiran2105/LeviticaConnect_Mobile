export const AUTH_LOGIN = "/auth/login";
export const AUTH_LOGIN_MFA = "/auth/login/mfa";
export const AUTH_MFA_SETUP = "/auth/mfa/setup";
export const AUTH_MFA_VERIFY = "/auth/mfa/verify";
export const AUTH_MFA_REQUEST_RESET_OTP = "/auth/mfa/request-reset-otp";
export const AUTH_MFA_SELF_RESET = "/auth/mfa/self-reset";
export const AUTH_FORGOT_PASSWORD = "/auth/forgot-password";
export const AUTH_RESET_PASSWORD = "/auth/reset-password";
export const AUTH_ADMIN_REGISTER = "/auth/admin-register";
export const AUTH_REGISTER = "/auth/register";
export const AUTH_ACCEPT_INVITE = "/auth/invite/accept";
export const AUTH_VERIFY_OTP = (companyId) => `/auth/verify-otp/${companyId}`;
export const AUTH_RESEND_OTP = (companyId) => `/auth/resend-otp/${companyId}`;
export const USER_PROFILE = "/auth/users/me/profile";
export const USER_UPDATE_PROFILE = (userId) => `/auth/users/${userId}/profile`;
export const AUTH_SESSIONS = "/auth/sessions";
export const AUTH_DELETE_SESSION = (sessionId) => `/auth/sessions/${sessionId}`;

export const SUPERADMIN_CREATE_COMPANY = "/superadmin/create-company";
export const SUPERADMIN_VERIFY_COMPANY_OTP = (companyId) => `/superadmin/verify-otp/${companyId}`;
export const SUPERADMIN_RESEND_COMPANY_OTP = (companyId) => `/superadmin/resend-otp/${companyId}`;
export const SUPERADMIN_APPROVE_COMPANY = (companyId) =>
  `/superadmin/companies/${companyId}/approve`;
export const SUPERADMIN_ACTIVATE_COMPANY_ADMIN = "/superadmin/activate";
export const SUPERADMIN_COMPANIES = "/superadmin/companies";
export const SUPERADMIN_DELETE_COMPANY = (companyId) => `/superadmin/companies/${companyId}`;
export const SUPERADMIN_PENDING_COMPANIES = "/superadmin/companies/pending";
export const SUPERADMIN_REJECT_COMPANY = (companyId) => `/superadmin/companies/${companyId}/reject`;
export const SUPERADMIN_DASHBOARD_OVERVIEW = "/superadmin/dashboard";
export const SUPERADMIN_ANALYTICS_REVENUE = "/superadmin/analytics/revenue";
export const SUPERADMIN_ANALYTICS_REVENUE_MONTHLY = "/superadmin/analytics/revenue/monthly";
export const SUPERADMIN_ANALYTICS_COMPANIES = "/superadmin/analytics/companies";
export const SUPERADMIN_ANALYTICS_USERS = "/superadmin/analytics/users";
export const SUPERADMIN_ANALYTICS_USERS_ACTIVE = "/superadmin/analytics/users/active";
export const SUPERADMIN_ANALYTICS_LICENSES_EXPIRING = "/superadmin/analytics/licenses/expiring";
export const SUPERADMIN_ANALYTICS_PAYMENT_HISTORY = "/superadmin/analytics/";
export const SUPERADMIN_REGISTRATION_PENDING_COMPANIES = "/superadmin/companies/pending-verification";

export const PLANS = "/plans/";
export const PLAN = (planId) => `/plans/${planId}`;
export const BILLING_DETAILS = "/billing/details";
export const BILLING_HISTORY = "/billing/history";
export const BILLING_RAZORPAY = "/billing/razorpay";
export const BILLING_VERIFY = "/billing/verify";
export const BILLING_INVOICE = (paymentId) => `/billing/invoice/${paymentId}`;

export const COMPANY_DASHBOARD = "/company/dashboard";
export const COMPANY_KPI_TRENDS = (rangeType = "weekly") => `/company/kpi/trends?range_type=${rangeType}`;
export const COMPANY_PENDING_USERS = "/company/users/pending";
export const COMPANY_USERS = "/company/users";
export const COMPANY_ACTIVE_USERS = "/company/users/active";
export const COMPANY_INVITE_USER = "/company/users/invite";
export const COMPANY_APPROVE_USER = (userId) => `/company/users/${userId}/approve`;
export const COMPANY_REJECT_USER = (userId) => `/company/users/${userId}/reject`;
export const COMPANY_LICENSE = "/company/license";
export const COMPANY_ME = "/company/me";
export const COMPANY_UPDATE_PROFILE = "/company/auth/update-profile";
export const COMPANY_CHANGE_PASSWORD = "/company/auth/change-password";

export const TEAMS_CREATE = "/teams/";
export const TEAMS_LIST = "/teams/";
export const TEAMS_MY_TEAMS = "/teams/my-teams";
export const TEAMS_DELETE = (teamId) => `/teams/${teamId}`;
export const USERS_SEARCH = "/api/v1/dm/users/search";
export const TEAMS_MEMBERS = (teamId) => `/teams/${teamId}/members`;
export const TEAMS_ADD_MEMBER = (teamId) => `/teams/${teamId}/members`;
export const TEAMS_ASSIGN_LEAD = (teamId) => `/teams/${teamId}/assign-admin`;
export const TEAMS_ADMINS = (teamId) => `/teams/${teamId}/admins`;
export const TEAMS_REMOVE_MEMBER = (teamId, userId) => `/teams/${teamId}/members/${userId}`;

export const PRESENCE_OPTIONS = "/api/v1/presence/options";
export const PRESENCE_ME = "/api/v1/presence/me";
export const PRESENCE_USER = (userId) => `/api/v1/presence/${userId}`;
export const PRESENCE_STATUS = "/api/v1/presence/status";
export const PRESENCE_CUSTOM_STATUS = "/api/v1/presence/custom-status";
export const PRESENCE_HEARTBEAT = "/api/v1/presence/heartbeat";

export const DM_USERS_SEARCH = "/api/v1/dm/users/search";
export const DM_CHANNELS = "/api/v1/dm";
export const DM_SEND_MESSAGE = (targetUserId) => `/api/v1/dm/${targetUserId}`;

export const CHANNEL_MESSAGES = (channelId) => `/api/v1/channels/${channelId}/messages`;
export const CHANNELS_CREATE = "/api/v1/channels";
export const CHANNELS_LIST = "/api/v1/channels";
export const CHANNELS_MY_CHANNELS = "/api/v1/channels/my-channels";
export const CHANNELS_GET = (channelId) => `/api/v1/channels/${channelId}`;
export const CHANNELS_BY_SLUG = (slug) => `/api/v1/channels/slug/${slug}`;
export const CHANNELS_DELETE = (channelId) => `/api/v1/channels/${channelId}`;
export const CHANNELS_ARCHIVE = (channelId) => `/api/v1/channels/${channelId}/archive`;
export const CHANNELS_UNARCHIVE = (channelId) => `/api/v1/channels/${channelId}/unarchive`;
export const CHANNEL_MEMBERS = (channelId) => `/api/v1/channels/${channelId}/members`;
export const CHANNEL_MEMBER = (channelId, userId) => `/api/v1/channels/${channelId}/members/${userId}`;
export const CHANNEL_MEMBERS_BULK = (channelId) => `/api/v1/channels/${channelId}/members/bulk`;
export const CHANNEL_UPDATE = (channelId) => `/api/v1/channels/${channelId}`;
export const CHANNEL_MESSAGE = (channelId, messageId) =>
  `/api/v1/channels/${channelId}/messages/${messageId}`;
export const CHANNEL_MESSAGE_THREAD = (channelId, messageId) =>
  `/api/v1/channels/${channelId}/messages/${messageId}/thread`;
export const CHANNEL_MESSAGE_PIN = (channelId, messageId) =>
  `/api/v1/channels/${channelId}/messages/${messageId}/pin`;
export const CHANNEL_MESSAGE_UNPIN = (channelId, messageId) =>
  `/api/v1/channels/${channelId}/messages/${messageId}/unpin`;
export const CHANNEL_MESSAGE_FORWARD = (channelId, messageId) =>
  `/api/v1/channels/${channelId}/messages/${messageId}/forward`;
export const CHANNEL_FORWARD_BY_NAME = "/api/v1/channels/forward/by-name";
export const CHANNEL_AI_TRANSLATE = (channelId) =>
  `/api/v1/channels/${channelId}/ai/translate`;
export const CHANNEL_AI_SUMMARY = (channelId) =>
  `/api/v1/channels/${channelId}/ai/summary`;
export const CHANNEL_AI_SMART_REPLY = (channelId) =>
  `/api/v1/channels/${channelId}/ai/smart-reply`;
export const CHANNEL_MESSAGE_READ = (channelId, messageId) =>
  `/api/v1/channels/${channelId}/messages/${messageId}/read`;
export const CHANNEL_MESSAGE_DELIVERY_STATUS = (channelId, messageId) =>
  `/api/v1/channels/${channelId}/messages/${messageId}/delivery-status`;
export const MESSAGE_REACTIONS = (messageId) => `/api/v1/messages/${messageId}/reactions`;
export const MESSAGE_REACTION = (messageId, emoji) =>
  `/api/v1/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`;
export const MESSAGE_MARK_READ = (messageId) => `/api/v1/messages/${messageId}/read`;
export const MESSAGE_BULK_READ = "/api/v1/messages/read/bulk";
export const MESSAGE_BULK_READ_STATUS = "/api/v1/messages/read-status/bulk";
export const MESSAGES_SEARCH = "/api/v1/search/messages";
export const CHANNEL_MESSAGES_SEARCH = "/api/v1/search/channels";
export const MESSAGE_READ_STATUS = (messageId) => `/api/v1/messages/${messageId}/read-status`;
export const CHANNEL_MARK_READ = (channelId) => `/api/v1/messages/channels/${channelId}/read`;
export const CHANNEL_UNREAD_COUNT = (channelId) =>
  `/api/v1/messages/channels/${channelId}/unread-count`;
export const CHANNEL_TYPING_START = (channelId) => `/api/v1/channels/${channelId}/typing/start`;
export const CHANNEL_TYPING_STOP = (channelId) => `/api/v1/channels/${channelId}/typing/stop`;


export const MEETINGS_CREATE = "/api/v1/meetings";
export const MEETING_CHANNEL_CALL = "/api/v1/meetings/channel-call";
export const MEETING_CHANNEL_ACTIVE_CALL = (channelId) =>
  `/api/v1/meetings/channel/${channelId}/active-call`;
export const MEETING_DETAILS = (meetingId) => `/api/v1/meetings/${meetingId}`;
export const MEETING_CALL = (targetUserId) => `/api/v1/meetings/call/${targetUserId}`;
export const MEETING_INCOMING_RINGING = "/api/v1/meetings/incoming/ringing";
export const MEETING_JOIN = (meetingId) => `/api/v1/meetings/${meetingId}/join`;
export const MEETING_JOIN_BY_LINK = (meetingLink) =>
  `/api/v1/meetings/join/${encodeURIComponent(meetingLink)}`;
export const MEETING_LIVEKIT_TOKEN = (meetingId) => `/api/v1/meetings/${meetingId}/livekit-token`;
export const MEETING_HEARTBEAT = (meetingId) => `/api/v1/meetings/${meetingId}/heartbeat`;
export const MEETING_LEAVE = (meetingId) => `/api/v1/meetings/${meetingId}/leave`;
export const MEETING_CHAT = (meetingId) => `/api/v1/meetings/${meetingId}/chat`;
export const MEETING_ACCEPT = (meetingId) => `/api/v1/meetings/${meetingId}/accept`;
export const MEETING_DECLINE = (meetingId) => `/api/v1/meetings/${meetingId}/decline`;
export const MEETING_RAISE_HAND = (meetingId) => `/api/v1/meetings/${meetingId}/raise-hand`;
export const MEETING_LOWER_HAND = (meetingId) => `/api/v1/meetings/${meetingId}/lower-hand`;
export const MEETING_RAISED_HANDS = (meetingId) => `/api/v1/meetings/${meetingId}/raised-hands`;
export const MEETING_PARTICIPANTS = (meetingId) => `/api/v1/meetings/${meetingId}/participants`;
export const MEETING_ACTIVE_PARTICIPANTS = (meetingId) => `/api/v1/meetings/${meetingId}/active-participants`;
export const MEETING_ADD_PARTICIPANT = (meetingId, userId) =>
  `/api/v1/meetings/${meetingId}/add-participant/${userId}`;
export const MEETING_REMOVE_PARTICIPANT = (meetingId, userId) =>
  `/api/v1/meetings/${meetingId}/participants/${userId}`;
export const MEETING_MUTE_PARTICIPANT = (meetingId, userId) =>
  `/api/v1/meetings/${meetingId}/participants/${userId}/mute`;
export const MEETING_REACTION = (meetingId, emoji) =>
  `/api/v1/meetings/${meetingId}/reaction?emoji=${encodeURIComponent(emoji)}`;

export const CALLS_HISTORY = "/api/v1/meetings/calls/history";
export const ACTIVITY_LIST = "/api/v1/activity";
export const ACTIVITY_MARK_ALL_READ = "/api/v1/activity/mark-all-read";
export const NOTIFICATIONS_FCM_TOKEN = "/api/v1/notifications/fcm-token";
export const NOTIFICATIONS_FCM_TOKEN_FALLBACK = "/api/v1/notifications/register-token";

export const SUPPORT_TICKETS = "/api/v1/support/tickets";
export const SUPPORT_TICKET = (ticketId) => `/api/v1/support/tickets/${ticketId}`;
export const SUPPORT_TICKET_REPLY = (ticketId) => `/api/v1/support/tickets/${ticketId}/reply`;
export const SUPERADMIN_SUPPORT_DASHBOARD = "/api/v1/superadmin/support/dashboard";
export const SUPERADMIN_SUPPORT_TICKETS = "/api/v1/superadmin/support/tickets";
export const SUPERADMIN_SUPPORT_TICKET = (ticketId) => `/api/v1/superadmin/support/tickets/${ticketId}`;
export const SUPERADMIN_SUPPORT_TICKET_REPLY = (ticketId) => `/api/v1/superadmin/support/tickets/${ticketId}/reply`;
export const SUPERADMIN_SUPPORT_TICKET_STATUS = (ticketId) => `/api/v1/superadmin/support/tickets/${ticketId}/status`;
export const SYSTEM_NOTIFICATIONS_BROADCAST = "/api/v1/system-notifications/broadcast";
export const SYSTEM_NOTIFICATIONS_MY = "/api/v1/system-notifications/my";
export const SYSTEM_NOTIFICATIONS_HISTORY = "/api/v1/system-notifications/history";
export const SYSTEM_NOTIFICATION_MARK_READ = (notificationId) =>
  `/api/v1/system-notifications/${notificationId}/read`;

export const FOLDER_CREATE = "/api/v1/folders";
export const FOLDER_GET = (folderId) => `/api/v1/folders/${folderId}`;
export const FILES_LIST = "/api/v1/files";
export const FILES_RECENT = "/api/v1/files/recent";
export const FILES_MY_FILES = "/api/v1/files/my-files";
export const FILES_SHARED = "/api/v1/files/shared-files";
export const FILES_RECEIVED = "/api/v1/files/received-files";
export const FILE_BULK_UPLOAD = "/api/v1/files/bulk/upload";
export const FILE_GET = (fileId) => `/api/v1/files/${fileId}`;
export const FILE_DOWNLOAD = (fileId) => `/api/v1/files/${fileId}/download`;
export const FILE_PREVIEW = (fileId) => `/api/v1/files/${fileId}/preview`;
export const FILE_DELETE = (fileId) => `/api/v1/files/${fileId}`;
export const FILES_CHANNEL = (channelId) => `/api/v1/files/channel/${channelId}`;

export const CALENDAR_EVENTS = "/calendar/";
export const CALENDAR_UPCOMING_EVENTS = "/calendar/upcoming";
export const CALENDAR_CREATE_EVENT = "/calendar/";
export const CALENDAR_EVENT = (eventId) => `/calendar/${eventId}`;
export const CALENDAR_LIVEKIT_TOKEN = (eventId) => `/calendar/${eventId}/livekit-token`;

export const COMMUNITIES_LIST = "/communities/";
export const COMMUNITIES_CREATE = "/communities/";
export const COMMUNITY_DELETE = (communityId) => `/communities/${communityId}`;
export const COMMUNITY_JOIN = (communityId) => `/communities/${communityId}/join`;
export const COMMUNITY_POSTS = (communityId) => `/communities/${communityId}/posts`;
export const COMMUNITY_POST_APPROVALS = "/communities/posts/approvals/pending";
export const COMMUNITY_PENDING_POSTS = (communityId) => `/communities/${communityId}/pending-posts`;
export const COMMUNITY_APPROVE_POST = (approvalId) => `/communities/posts/approve/${approvalId}`;
export const COMMUNITY_REJECT_POST = (approvalId) => `/communities/posts/reject/${approvalId}`;
export const COMMUNITY_MEMBERS = (communityId) => `/communities/${communityId}/members`;
export const COMMUNITY_ADD_MEMBER = (communityId, targetUserId) => `/communities/${communityId}/members/${targetUserId}`;
export const COMMUNITY_REMOVE_MEMBER = (communityId, targetUserId) => `/communities/${communityId}/members/${targetUserId}`;
export const COMMUNITY_REMOVE_POST = (postId) => `/communities/posts/${postId}`;
export const COMMUNITY_EDIT_POST = (postId) => `/communities/posts/${postId}`;
export const COMMUNITY_PIN_POST = (postId) => `/communities/posts/${postId}/pin`;
export const COMMUNITY_UNPIN_POST = (postId) => `/communities/posts/${postId}/unpin`;
export const COMMUNITY_ADD_REACTION = (postId) => `/communities/posts/${postId}/reaction`;
export const COMMUNITY_DELETE_REACTION = (reactionId) => `/communities/reactions/${reactionId}`;
export const COMMUNITY_ADD_REPLY = (postId) => `/communities/posts/${postId}/reply`;
export const COMMUNITY_LIST_REPLIES = (postId) => `/communities/posts/${postId}/replies`;
export const COMMUNITY_DELETE_REPLY = (replyId) => `/communities/replies/${replyId}`;
export const COMMUNITY_PENDING_USERS = (communityId) => `/communities/${communityId}/pending-users`;
export const COMMUNITY_APPROVE_JOIN = (requestId) => `/communities/join-request/${requestId}/approve`;
export const COMMUNITY_REJECT_JOIN = (requestId) => `/communities/join-request/${requestId}/reject`;


function buildWebSocketBasePath() {
  const explicitWsBase = import.meta.env.VITE_WS_BASE_URL?.replace(/\/$/, "");

  if (explicitWsBase) {
    return /\/ws$/i.test(explicitWsBase) ? explicitWsBase : `${explicitWsBase}/ws`;
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL || "https://collabration-teams-zrhv.onrender.com").replace(/\/$/, "");

  if (/^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/^http/, "ws")}/ws`;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${apiBase}/ws`;
  }

  return `wss://collabration-teams-zrhv.onrender.com/ws`;
}


export function CHAT_WEBSOCKET(channelId, accessToken = "") {
  if (!channelId) {
    return null;
  }

  const baseUrl = `${buildWebSocketBasePath()}/chat/${channelId}`;

  if (!accessToken) {
    return baseUrl;
  }

  return `${baseUrl}?token=${encodeURIComponent(accessToken)}`;
}

export function COMMUNITY_WEBSOCKET(communityId) {
  if (!communityId) {
    return null;
  }

  return `${buildWebSocketBasePath()}/community/${communityId}`;
}

export function USER_EVENTS_WEBSOCKET(userId, accessToken = "") {
  if (!userId) {
    return null;
  }

  const baseUrl = `${buildWebSocketBasePath()}/presence/${userId}`;

  if (!accessToken) {
    return baseUrl;
  }

  return `${baseUrl}?token=${encodeURIComponent(accessToken)}`;
}
