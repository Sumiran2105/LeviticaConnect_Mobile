import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { UserLayout } from "@/layouts/user-layout";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPANY_CHANGE_PASSWORD, USER_PROFILE, USER_UPDATE_PROFILE, AUTH_SESSIONS, AUTH_DELETE_SESSION } from "@/config/api";
import { apiClient } from "@/lib/client";
import { formatISTDateTime } from "@/lib/date-time";
import { getImageUrlCandidates, getPersistableProfileImageSource } from "@/lib/image-utils";
import { useAuthStore } from "@/store/auth-store";
import {
  NOTIFICATION_SOUND_OPTIONS,
  PERMISSION_OPTIONS,
  RINGTONE_OPTIONS,
  getStoredNotificationSettings,
  previewSound,
  saveNotificationSettings,
} from "@/lib/notification-settings";
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  LoaderCircle,
  Upload,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Circle,
  MonitorSmartphone,
  LogOut,
  Laptop,
  Smartphone,
  Globe,
  Clock,
  ShieldAlert,
  Trash2,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  PhoneCall,
  ChevronDown,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

function isValidPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
}

function PasswordRequirements({ password }) {
  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)", met: /[a-z]/.test(password) },
    { label: "One number (0–9)", met: /\d/.test(password) },
    { label: "One special character (@$!%*?&)", met: /[@$!%*?&]/.test(password) },
  ];

  return (
    <div className="mt-2 grid grid-cols-1 gap-1">
      {rules.map((rule) => (
        <div key={rule.label} className="flex items-center gap-1.5">
          {rule.met ? (
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
          ) : (
            <Circle className="size-3.5 shrink-0 text-brand-secondary/40" />
          )}
          <span
            className={`text-[11px] leading-tight ${rule.met
              ? "text-emerald-600 font-medium"
              : "text-brand-secondary/70"
              }`}
          >
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function getDeviceIcon(deviceName) {
  const name = (deviceName || "").toLowerCase();
  if (name.includes("mac") || name.includes("windows") || name.includes("linux") || name.includes("pc")) {
    return Laptop;
  }
  if (name.includes("iphone") || name.includes("android") || name.includes("mobile") || name.includes("phone")) {
    return Smartphone;
  }
  return MonitorSmartphone;
}

function formatSessionDate(value) {
  if (!value) return "N/A";
  return formatISTDateTime(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }, value);
}

function truncateUA(ua, maxLen = 60) {
  if (!ua || ua.length <= maxLen) return ua || "Unknown";
  return ua.slice(0, maxLen) + "…";
}

function SessionSettingsTab({ session }) {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const response = await apiClient.get(AUTH_SESSIONS, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      return Array.isArray(response.data) ? response.data : response.data?.sessions || response.data?.data || [];
    },
    enabled: !!session?.accessToken,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId) => {
      return apiClient.delete(AUTH_DELETE_SESSION(sessionId), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
    },
    onSuccess: (_, sessionId) => {
      toast.success("Session revoked successfully.");
      queryClient.setQueryData(["auth-sessions"], (old) =>
        (old || []).filter((s) => s.id !== sessionId)
      );
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to revoke session."
      );
    },
  });

  const sessions = sessionsQuery.data || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pt-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-brand-ink">Active Sessions</h3>
            <p className="text-sm text-brand-secondary mt-0.5">
              Devices where your account is currently signed in.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-brand-secondary bg-brand-neutral/50 px-3 py-1.5 rounded-full">
            <Globe className="size-3.5" />
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </div>
        </div>

        {sessionsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-brand-secondary">
            <LoaderCircle className="size-5 animate-spin" />
            <span className="font-medium">Loading sessions…</span>
          </div>
        ) : sessionsQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 flex items-center gap-3">
            <ShieldAlert className="size-5 shrink-0" />
            Unable to load sessions right now. Please try again later.
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-brand-line/50 bg-brand-neutral/20 p-10 text-center text-sm text-brand-secondary">
            No active sessions found.
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => {
              const DeviceIcon = getDeviceIcon(s.device_name);
              const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
              const isActive = s.is_active && !isExpired;
              const isDeleting = deleteSessionMutation.isPending && deleteSessionMutation.variables === s.id;

              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-2xl border p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 transition-all duration-200",
                    isActive
                      ? "border-brand-line/50 bg-white hover:shadow-sm"
                      : "border-brand-line/30 bg-brand-neutral/20 opacity-75"
                  )}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "size-11 rounded-xl flex items-center justify-center shrink-0 border",
                      isActive
                        ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
                        : "bg-brand-neutral border-brand-line/50 text-brand-secondary"
                    )}>
                      <DeviceIcon className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-semibold text-brand-ink text-sm">
                          {s.device_name || "Unknown Device"}
                        </h4>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-neutral text-brand-secondary border border-brand-line/50">
                            Expired
                          </span>
                        )}
                        {s.is_trusted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-600 border border-sky-200">
                            Trusted
                          </span>
                        )}
                        {s.mfa_enabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-600 border border-violet-200">
                            MFA
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-brand-secondary">
                        <div className="flex items-center gap-1.5" title={s.device_id}>
                          <MonitorSmartphone className="size-3 shrink-0 text-brand-secondary/60" />
                          <span className="truncate">{truncateUA(s.device_id)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Globe className="size-3 shrink-0 text-brand-secondary/60" />
                          <span>{s.ip_address || "Unknown IP"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 shrink-0 text-brand-secondary/60" />
                          <span>Created: {formatSessionDate(s.created_at)}</span>
                        </div>
                        {s.expires_at && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3 shrink-0 text-brand-secondary/60" />
                            <span>Expires: {formatSessionDate(s.expires_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDeleting}
                    className="rounded-xl border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 h-10 px-5 whitespace-nowrap shadow-sm text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    onClick={() => deleteSessionMutation.mutate(s.id)}
                  >
                    {isDeleting ? (
                      <>
                        <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
                        Revoking…
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-3.5 mr-1.5" />
                        Remove from device
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function NotificationSettingsTab() {
  const [settings, setSettings] = useState(getStoredNotificationSettings);
  const previewAudioRef = useRef(null);

  const update = (key, value) => {
    setSettings((prev) => {
      return saveNotificationSettings({ ...prev, [key]: value });
    });
  };

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
  };

  const playPreview = async (src) => {
    stopPreview();

    if (!src) {
      toast.info("This option is silent.");
      return;
    }

    try {
      previewAudioRef.current = await previewSound(src);
    } catch {
      toast.error("Unable to preview this sound.");
    }
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1 — Mute All Notifications */}
      <div className="rounded-2xl border border-brand-line/50 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "size-11 rounded-xl flex items-center justify-center border transition-colors",
              settings.muteAll
                ? "bg-rose-50 border-rose-200 text-rose-500"
                : "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
            )}>
              {settings.muteAll ? <BellOff className="size-5" /> : <Bell className="size-5" />}
            </div>
            <div>
              <h4 className="font-semibold text-brand-ink text-sm">Mute All Notifications</h4>
              <p className="text-xs text-brand-secondary mt-0.5">
                {settings.muteAll
                  ? "All notifications are silenced. You won\u2019t receive any alerts."
                  : "You are receiving notifications normally."}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.muteAll}
            onClick={() => {
              const next = !settings.muteAll;
              update("muteAll", next);
              toast.success(next ? "All notifications muted." : "Notifications unmuted.");
            }}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2",
              settings.muteAll ? "bg-rose-500" : "bg-brand-line"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 mt-[1px]",
                settings.muteAll ? "translate-x-[22px]" : "translate-x-[2px]"
              )}
            />
          </button>
        </div>
      </div>

      {/* 2 — Message Notification Sound */}
      <div className="rounded-2xl border border-brand-line/50 bg-white p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className={cn(
            "size-11 rounded-xl flex items-center justify-center border shrink-0",
            settings.notificationSound === "none"
              ? "bg-brand-neutral border-brand-line/50 text-brand-secondary"
              : "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
          )}>
            {settings.notificationSound === "none" ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-brand-ink text-sm">Message Notification Sound</h4>
            <p className="text-xs text-brand-secondary mt-0.5 mb-4">
              Choose the short alert sound for incoming messages and notifications.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
              {NOTIFICATION_SOUND_OPTIONS.map((opt) => (
                <div key={opt.id} className="flex w-full overflow-hidden rounded-xl border border-brand-line/50 bg-brand-neutral/50">
                  <button
                    type="button"
                    onClick={() => {
                      update("notificationSound", opt.id);
                      toast.success(`Message sound set to "${opt.label}".`);
                    }}
                    className={cn(
                      "min-w-0 flex-1 px-2 py-2.5 text-center text-xs font-semibold transition-all duration-200",
                      settings.notificationSound === opt.id
                        ? "bg-brand-primary text-white"
                        : "text-brand-ink hover:bg-brand-neutral"
                    )}
                  >
                    {opt.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => playPreview(opt.src)}
                    className={cn(
                      "flex w-9 shrink-0 items-center justify-center border-l border-brand-line/50 text-xs transition",
                      settings.notificationSound === opt.id
                        ? "bg-brand-primary text-white"
                        : "text-brand-secondary hover:bg-white hover:text-brand-primary"
                    )}
                    title={`Preview ${opt.label}`}
                  >
                    <Volume2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3 — Call Ringtone */}
      <div className="rounded-2xl border border-brand-line/50 bg-white p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className={cn(
            "size-11 rounded-xl flex items-center justify-center border shrink-0",
            settings.ringtone === "none"
              ? "bg-brand-neutral border-brand-line/50 text-brand-secondary"
              : "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
          )}>
            {settings.ringtone === "none" ? <VolumeX className="size-5" /> : <PhoneCall className="size-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-brand-ink text-sm">Call Ringtone</h4>
            <p className="text-xs text-brand-secondary mt-0.5 mb-4">
              Choose the looping ringtone for incoming audio and video calls.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
              {RINGTONE_OPTIONS.map((opt) => (
                <div key={opt.id} className="flex w-full overflow-hidden rounded-xl border border-brand-line/50 bg-brand-neutral/50">
                  <button
                    type="button"
                    onClick={() => {
                      update("ringtone", opt.id);
                      toast.success(`Call ringtone set to "${opt.label}".`);
                    }}
                    className={cn(
                      "min-w-0 flex-1 px-3 py-2.5 text-left text-xs font-semibold transition-all duration-200",
                      settings.ringtone === opt.id
                        ? "bg-brand-primary text-white"
                        : "text-brand-ink hover:bg-brand-neutral"
                    )}
                  >
                    {opt.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => playPreview(opt.src)}
                    className={cn(
                      "flex w-9 shrink-0 items-center justify-center border-l border-brand-line/50 text-xs transition",
                      settings.ringtone === opt.id
                        ? "bg-brand-primary text-white"
                        : "text-brand-secondary hover:bg-white hover:text-brand-primary"
                    )}
                    title={`Preview ${opt.label}`}
                  >
                    <Volume2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4 — Who Can Call You */}
      <div className="rounded-2xl border border-brand-line/50 bg-white p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="size-11 rounded-xl flex items-center justify-center border bg-brand-primary/10 border-brand-primary/20 text-brand-primary shrink-0">
            <PhoneCall className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-brand-ink text-sm">Who Can Call You</h4>
            <p className="text-xs text-brand-secondary mt-0.5 mb-4">
              Control who is allowed to start audio or video calls with you.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PERMISSION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    update("whoCanCall", opt.id);
                    toast.success(`"Who can call you" set to "${opt.label}".`);
                  }}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200",
                    settings.whoCanCall === opt.id
                      ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                      : "bg-brand-neutral/50 text-brand-ink border-brand-line/50 hover:bg-brand-neutral hover:border-brand-line"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");

  const syncSessionProfile = useCallback((profile) => {
    if (!profile || typeof profile !== "object") return;

    const nextSession = {
      ...session,
      ...profile,
      full_name: profile.full_name || profile.name || session?.full_name || session?.name,
      name: profile.name || profile.full_name || session?.name,
      mobile_number:
        profile.mobile_number ||
        profile.phone_number ||
        profile.phone ||
        session?.mobile_number ||
        session?.phone_number,
      phone_number:
        profile.phone_number ||
        profile.mobile_number ||
        profile.phone ||
        session?.phone_number ||
        session?.mobile_number,
      profile_image: getPersistableProfileImageSource(profile) || "",
      image: getPersistableProfileImageSource(profile) || "",
    };

    const hasChanges = [
      "full_name",
      "name",
      "mobile_number",
      "phone_number",
      "address",
      "profile_image",
      "image",
    ].some((key) => nextSession[key] !== session?.[key]);

    if (!hasChanges) return;

    setSession(nextSession);
  }, [session, setSession]);

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await apiClient.get(USER_PROFILE, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      if (response.data?.data) return response.data.data;
      if (response.data?.user) return response.data.user;
      return response.data;
    },
    enabled: !!session?.accessToken,
  });

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    mobile_number: "",
    address: "",
  });

  useEffect(() => {
    return () => {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  useEffect(() => {
    const data = userProfile || session;
    if (data) {
      queueMicrotask(() => {
        setProfileForm({
          full_name: data.full_name || data.name || "",
          mobile_number: data.mobile_number || data.phone || data.phone_number || "",
          address: data.address || "",
        });
      });
    }
  }, [userProfile, session]);

  useEffect(() => {
    if (!userProfile) return;

    syncSessionProfile(userProfile);
  }, [session, syncSessionProfile, userProfile]);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      const formData = new FormData();
      formData.append("full_name", payload.full_name.trim());
      formData.append("mobile_number", payload.mobile_number.trim());
      if (payload.profile_image) {
        formData.append("profile_image", payload.profile_image);
      }

      const userId = userProfile?.id || session?.id || session?.user_id;
      const response = await apiClient.put(
        USER_UPDATE_PROFILE(userId),
        formData,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onSuccess: async (data) => {
      toast.success(data.message || "Profile updated successfully.");
      setIsEditingProfile(false);
      setProfileImageFile(null);
      setProfileImagePreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });

      const updatedUser = data.user || data.data || data.profile || data;
      if (updatedUser && typeof updatedUser === 'object') {
        syncSessionProfile(updatedUser);
      }

      const freshProfile = await queryClient.fetchQuery({
        queryKey: ["userProfile"],
        queryFn: async () => {
          const response = await apiClient.get(USER_PROFILE, {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          });
          if (response.data?.data) return response.data.data;
          if (response.data?.user) return response.data.user;
          return response.data;
        },
      });

      if (freshProfile && typeof freshProfile === "object") {
        syncSessionProfile(freshProfile);
      }

      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to update profile right now.";
      toast.error(message);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(COMPANY_CHANGE_PASSWORD, null, {
        params: {
          old_password: payload.current_password,
          new_password: payload.new_password,
          confirm_password: payload.confirm_password,
        },
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Password changed successfully.");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to change password right now.";
      toast.error(message);
    },
  });

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    if (!profileForm.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    const nameRegex = /^[A-Za-z\s.]+$/;
    if (!nameRegex.test(profileForm.full_name.trim())) {
      toast.error("Full name can only contain letters, spaces, and periods.");
      return;
    }
    if (profileForm.mobile_number.trim()) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(profileForm.mobile_number.trim())) {
        toast.error("Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.");
        return;
      }
    }
    updateProfileMutation.mutate({
      ...profileForm,
      profile_image: profileImageFile,
    });
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile image must be 2MB or smaller.");
      return;
    }

    setProfileImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setProfileImageFile(file);
    setIsEditingProfile(true);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!passwordForm.current_password) {
      toast.error("Current password is required.");
      return;
    }
    if (!isValidPassword(passwordForm.new_password)) {
      toast.error("Password must contain at least 8 characters, including upper, lower, number, and special character.");
      return;
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      toast.error("New password must be different from the current password.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }
    changePasswordMutation.mutate(passwordForm);
  };

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "security", label: "Password Settings", icon: ShieldCheck },
    { id: "session", label: "Session Settings", icon: MonitorSmartphone },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];
  const profileImageUrl = useMemo(() => {
    const source = getPersistableProfileImageSource(userProfile) || getPersistableProfileImageSource(session);
    return source ? getImageUrlCandidates(source)[0] || "" : "";
  }, [session, userProfile]);
  const profileImageDisplay = profileImagePreview || profileImageUrl;

  return (
    <UserLayout contentInnerClassName="max-w-none">
      <div className="w-full space-y-8">
        <div className="text-left space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink">Account Settings</h1>
          <p className="text-brand-secondary">Manage your profile and security preferences.</p>
        </div>

        <div className="flex flex-col space-y-6">
          <nav className="grid grid-cols-2 sm:grid-cols-4 sm:flex sm:items-center gap-1.5 w-full sm:w-fit p-1.5 bg-brand-neutral/50 border border-brand-line/50 rounded-[28px]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all duration-300 rounded-[22px] min-w-0",
                    isActive
                      ? "bg-white text-brand-primary shadow-sm ring-1 ring-brand-line/50"
                      : "text-brand-ink/50 hover:text-brand-ink hover:bg-white/50"
                  )}
                >
                  <Icon className={cn(
                    "size-4.5 transition-colors",
                    isActive ? "text-brand-primary" : "text-brand-ink/40"
                  )} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-primary rounded-full hidden" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="rounded-[40px] border border-brand-line bg-white shadow-xl shadow-brand-primary/5 overflow-hidden text-left">
            <div className="border-b border-brand-line px-10 py-8 bg-brand-soft/10">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                  {(() => {
                    const ActiveIcon = tabs.find(t => t.id === activeTab)?.icon;
                    return ActiveIcon ? <ActiveIcon className="size-6 text-brand-primary" /> : null;
                  })()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-brand-ink">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h2>
                  <p className="text-sm text-brand-secondary mt-1">
                    Configure your {activeTab.toLowerCase()} settings and preferences.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {activeTab === "profile" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-brand-line/50">
                    <div className="flex size-32 items-center justify-center overflow-hidden rounded-full bg-brand-soft ring-4 ring-white shadow-inner">
                      {profileImageDisplay ? (
                        <img
                          src={profileImageDisplay}
                          alt={profileForm.full_name || "Profile"}
                          className="size-full object-cover"
                        />
                      ) : (
                        <User className="size-12 text-brand-primary/40" />
                      )}
                    </div>
                    <div className="text-center sm:text-left space-y-1">
                      <div>
                        <h4 className="font-bold text-brand-ink">Profile</h4>
                        <p className="text-xs text-brand-secondary">Manage your photo, name, and phone number.</p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-2 sm:justify-start">
                        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-brand-line bg-white px-4 text-sm font-semibold text-brand-ink shadow-sm transition hover:bg-brand-soft">
                          <Upload className="size-4 text-brand-primary" />
                          Choose photo
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleProfileImageChange}
                          />
                        </label>
                        {profileImageFile ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setProfileImageFile(null);
                              setProfileImagePreview((current) => {
                                if (current) URL.revokeObjectURL(current);
                                return "";
                              });
                            }}
                            className="h-10 rounded-xl px-4 text-brand-secondary hover:text-brand-ink"
                          >
                            Remove selection
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2.5 md:col-span-1 max-w-sm">
                      <Label className="text-brand-ink font-semibold">Full Name</Label>
                      <Input
                        disabled={!isEditingProfile}
                        value={profileForm.full_name}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^[A-Za-z\s.]+$/.test(value)) {
                            setProfileForm(prev => ({ ...prev, full_name: value }));
                          }
                        }}
                        placeholder="Enter your full name"
                        className="h-12 rounded-xl bg-brand-neutral/50 border-brand-line/50 focus:bg-white disabled:opacity-70"
                      />
                    </div>

                    <div className="space-y-2.5 md:col-span-1 max-w-sm">
                      <Label className="text-brand-ink font-semibold">Email Address</Label>
                      <Input defaultValue={session?.email} disabled className="h-12 rounded-xl bg-brand-neutral/50 opacity-70 border-brand-line/50" />
                    </div>

                    <div className="space-y-2.5 md:col-span-1 max-w-sm">
                      <Label className="text-brand-ink font-semibold">Phone Number</Label>
                      <Input
                        disabled={!isEditingProfile}
                        value={profileForm.mobile_number}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^[6-9]\d{0,9}$/.test(value)) {
                            setProfileForm(prev => ({ ...prev, mobile_number: value }));
                          }
                        }}
                        placeholder="Enter your phone number"
                        className="h-12 rounded-xl bg-brand-neutral/50 border-brand-line/50 focus:bg-white disabled:opacity-70"
                      />
                    </div>



                    <div className="flex justify-end gap-3 pt-4 md:col-span-2">
                      {!isEditingProfile ? (
                        <Button
                          type="button"
                          onClick={() => setIsEditingProfile(true)}
                          className="rounded-2xl h-11 px-8 bg-brand-neutral/80 text-brand-ink hover:bg-brand-neutral shadow-sm"
                        >
                          Edit Profile
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setIsEditingProfile(false);
                              const data = userProfile || session;
                              setProfileForm({
                                full_name: data?.full_name || data?.name || "",
                                mobile_number: data?.mobile_number || data?.phone || data?.phone_number || "",
                                address: data?.address || "",
                              });
                              setProfileImageFile(null);
                              setProfileImagePreview((current) => {
                                if (current) URL.revokeObjectURL(current);
                                return "";
                              });
                            }}
                            className="rounded-2xl h-11 px-6 text-brand-secondary hover:text-brand-ink"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="rounded-2xl h-11 px-8 bg-brand-primary text-white hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20"
                          >
                            {updateProfileMutation.isPending ? (
                              <span className="flex items-center gap-2">
                                <LoaderCircle className="size-4 animate-spin" />
                                Saving...
                              </span>
                            ) : "Save Changes"}
                          </Button>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <form onSubmit={handleChangePassword} className="space-y-6 pt-2">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2.5 max-w-sm">
                        <Label className="text-brand-ink font-semibold">Current Password</Label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordForm.current_password}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                            placeholder="••••••••"
                            className="h-12 rounded-xl bg-brand-neutral/50 border-brand-line/50 focus:bg-white pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-secondary/50 hover:text-brand-primary transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2.5 max-w-sm">
                        <Label className="text-brand-ink font-semibold">New Password</Label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                            placeholder="••••••••"
                            className="h-12 rounded-xl bg-brand-neutral/50 border-brand-line/50 focus:bg-white pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-secondary/50 hover:text-brand-primary transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                          </button>
                        </div>
                        <PasswordRequirements password={passwordForm.new_password} />
                      </div>
                      <div className="space-y-2.5 max-w-sm">
                        <Label className="text-brand-ink font-semibold">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordForm.confirm_password}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                            placeholder="••••••••"
                            className="h-12 rounded-xl bg-brand-neutral/50 border-brand-line/50 focus:bg-white pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-secondary/50 hover:text-brand-primary transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="rounded-2xl h-11 px-8 bg-brand-primary text-white hover:bg-brand-primary/90"
                      >
                        {changePasswordMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <LoaderCircle className="size-4 animate-spin" />
                            Updating...
                          </span>
                        ) : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === "session" && (
                <SessionSettingsTab session={session} />
              )}

              {activeTab === "notifications" && (
                <NotificationSettingsTab />
              )}
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
