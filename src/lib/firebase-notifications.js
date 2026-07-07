import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let firebaseApp = null;
let messaging = null;

export function getFirebaseNotificationStatus() {
  const missing = [];

  if (!firebaseConfig.apiKey) {
    missing.push("VITE_FIREBASE_API_KEY");
  }

  if (!firebaseConfig.projectId) {
    missing.push("VITE_FIREBASE_PROJECT_ID");
  }

  if (!firebaseConfig.messagingSenderId) {
    missing.push("VITE_FIREBASE_MESSAGING_SENDER_ID");
  }

  if (!firebaseConfig.appId) {
    missing.push("VITE_FIREBASE_APP_ID");
  }

  if (!vapidKey) {
    missing.push("VITE_FIREBASE_VAPID_KEY");
  }

  return {
    configured: missing.length === 0,
    missing,
  };
}

function buildServiceWorkerUrl() {
  const params = new URLSearchParams();

  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/firebase-messaging-sw.js?${params.toString()}`;
}

async function getNotificationMessaging() {
  if (!getFirebaseNotificationStatus().configured) {
    return null;
  }

  if (!(await isSupported())) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }

  return messaging;
}

export async function registerFirebaseNotifications() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
    return null;
  }

  const notificationMessaging = await getNotificationMessaging();
  if (!notificationMessaging) {
    return null;
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    return null;
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.register(buildServiceWorkerUrl());

  return getToken(notificationMessaging, {
    vapidKey,
    serviceWorkerRegistration,
  });
}

export async function subscribeToFirebaseMessages(callback) {
  const notificationMessaging = await getNotificationMessaging();
  if (!notificationMessaging) {
    return () => {};
  }

  return onMessage(notificationMessaging, callback);
}
