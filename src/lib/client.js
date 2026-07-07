import axios from "axios";
import { useAuthStore } from "@/store/auth-store";
import { reportUnexpectedError } from "@/lib/monitoring";

const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000);
const DEFAULT_API_BASE_URL = "https://collabration-teams-zrhv.onrender.com";

function normalizeApiBaseUrl(value) {
  if (!value) {
    return DEFAULT_API_BASE_URL;
  }

  const trimmedValue = String(value).replace(/\/$/, "");

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`;
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
let sessionExpiryRedirectInProgress = false;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

function extractApiMessage(error) {
  const data = error.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean)
      .join(" ");
  }

  return (
    data?.message ||
    data?.detail ||
    (error.code === "ECONNABORTED" ? "The request timed out. Please try again." : null) ||
    (error.response ? "The server returned an unexpected response." : null) ||
    "Unable to reach the server. Please check your Levitica Connectn and try again."
  );
}

export function normalizeApiError(error) {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  const status = error.response?.status ?? null;
  const message = extractApiMessage(error);

  error.isApiError = true;
  error.status = status;
  error.userMessage = message;
  error.details = error.response?.data ?? null;
  error.message = message;

  return error;
}

function isAuthEndpoint(url = "") {
  return /^\/?auth\/(login|login\/mfa|mfa|forgot-password|reset-password|invite\/accept)/.test(
    String(url).replace(apiBaseUrl, "").replace(/^\//, "")
  );
}

function shouldClearSessionForUnauthorized(error) {
  if (error.response?.status !== 401) {
    return false;
  }

  const { session } = useAuthStore.getState();

  if (!session?.accessToken) {
    return false;
  }

  if (isAuthEndpoint(error.config?.url)) {
    return false;
  }

  return true;
}

function redirectToLoginForExpiredSession(session) {
  if (typeof window === "undefined" || sessionExpiryRedirectInProgress) {
    return;
  }

  sessionExpiryRedirectInProgress = true;

  const loginPath = session?.role === "SUPER_ADMIN"
    ? "/login/super-admin"
    : "/login?mode=workspace";

  window.setTimeout(() => {
    window.location.replace(loginPath);
  }, 0);
}

// Add request interceptor to include authorization token
apiClient.interceptors.request.use(
  (config) => {
    const { session } = useAuthStore.getState();
    const token = session?.accessToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError = normalizeApiError(error);

    if (shouldClearSessionForUnauthorized(normalizedError)) {
      const { session, clearSession } = useAuthStore.getState();
      clearSession({ reason: "session-expired" });
      redirectToLoginForExpiredSession(session);
    }

    if (
      !normalizedError.config?.suppressGlobalErrorReport &&
      (!normalizedError.response || normalizedError.response.status >= 500)
    ) {
      reportUnexpectedError(normalizedError, {
        source: "api-client",
        method: normalizedError.config?.method,
        url: normalizedError.config?.url,
        status: normalizedError.status,
      });
    }

    return Promise.reject(normalizedError);
  }
);
