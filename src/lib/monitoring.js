const MONITORING_CONTEXT_KEY = "Levitica Connect";

function toError(value) {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === "string") {
    return new Error(value);
  }

  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error("Unknown error");
  }
}

export function reportUnexpectedError(error, context = {}) {
  const normalizedError = toError(error);
  const isApiError = Boolean(error?.isApiError);
  const payload = {
    app: MONITORING_CONTEXT_KEY,
    ...context,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("app:unexpected-error", {
        detail: {
          error: normalizedError,
          context: payload,
        },
      })
    );

    if (!isApiError && typeof window.reportError === "function") {
      window.reportError(normalizedError);
    }
  }

  if (import.meta.env.DEV) {
    console.error("[monitoring] Unexpected error", normalizedError, payload);
  }
}

export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleError(event) {
    reportUnexpectedError(event.error || event.message, {
      source: "window.error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }

  function handleUnhandledRejection(event) {
    reportUnexpectedError(event.reason, {
      source: "window.unhandledrejection",
    });
  }

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}
