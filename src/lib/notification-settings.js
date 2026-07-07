export const NOTIFICATION_SETTINGS_STORAGE_KEY = "connectio_notif_settings";

export const DEFAULT_NOTIFICATION_SETTINGS = {
  muteAll: false,
  notificationSound: "beep",
  ringtone: "default",
  whoCanAdd: "everyone",
  whoCanCall: "everyone",
};

export const NOTIFICATION_SOUND_OPTIONS = [
  { id: "beep", label: "Beep", src: "/audio/Notification_sound/beep.mp3" },
  { id: "bell", label: "Bell", src: "/audio/Notification_sound/bell.mp3" },
  { id: "drop", label: "Drop", src: "/audio/Notification_sound/drop.mp3" },
  { id: "none", label: "None (Silent)", src: "" },
];

export const RINGTONE_OPTIONS = [
  { id: "default", label: "Classic", src: "/audio/ringtone3.mp3" },
  { id: "chime", label: "Chime", src: "/audio/ringtone2.mp3" },
  { id: "cute", label: "Soft Bell", src: "/audio/cute_ringtone.mp3" },
  { id: "none", label: "None (Silent)", src: "" },
];

export const PERMISSION_OPTIONS = [
  { id: "everyone", label: "Everyone" },
  { id: "contacts", label: "My Contacts Only" },
  { id: "team", label: "My Team Only" },
  { id: "nobody", label: "Nobody" },
];

export function getStoredNotificationSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    if (raw) {
      const storedSettings = JSON.parse(raw);

      return {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...storedSettings,
        notificationSound: storedSettings.notificationSound || DEFAULT_NOTIFICATION_SETTINGS.notificationSound,
        ringtone: storedSettings.ringtone || DEFAULT_NOTIFICATION_SETTINGS.ringtone,
      };
    }
  } catch {
    // Keep defaults when local storage is unavailable or malformed.
  }

  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings) {
  if (typeof window === "undefined") {
    return settings;
  }

  const next = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...settings,
  };

  window.localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("Levitica Connect:notification-settings-changed", { detail: next }));

  return next;
}

export function getSoundSource(options, selectedId, fallbackId) {
  const preferred = options.find((option) => option.id === selectedId);
  const fallback = options.find((option) => option.id === fallbackId) || options[0];

  return preferred?.src ?? fallback?.src ?? "";
}

export function getNotificationSoundSource(notificationSoundId) {
  return getSoundSource(NOTIFICATION_SOUND_OPTIONS, notificationSoundId, DEFAULT_NOTIFICATION_SETTINGS.notificationSound);
}

export function getRingtoneSoundSource(ringtoneId) {
  return getSoundSource(RINGTONE_OPTIONS, ringtoneId, DEFAULT_NOTIFICATION_SETTINGS.ringtone);
}

export async function previewSound(src, { loop = false } = {}) {
  if (!src) {
    return null;
  }

  const audio = new Audio(src);
  audio.loop = loop;
  audio.preload = "auto";
  audio.volume = 1;

  await audio.play();
  return audio;
}

export async function playNotificationSound({ loop = false } = {}) {
  const settings = getStoredNotificationSettings();

  if (settings.muteAll || settings.notificationSound === "none") {
    return null;
  }

  return previewSound(getNotificationSoundSource(settings.notificationSound), { loop });
}
