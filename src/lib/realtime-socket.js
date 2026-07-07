const DEFAULT_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 15000;
const DEFAULT_HEARTBEAT_MS = 25000;

function getReconnectDelay(attempt, minDelayMs, maxDelayMs) {
  const baseDelay = Math.min(maxDelayMs, minDelayMs * 2 ** Math.min(attempt, 5));
  const jitter = Math.floor(Math.random() * Math.min(500, baseDelay));
  return baseDelay + jitter;
}

function closeSocket(socket) {
  if (!socket) return;

  if (socket.readyState === WebSocket.CONNECTING) {
    socket.onopen = () => {
      socket.close();
    };
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    return;
  }

  if (socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
}

export function createRealtimeSocket(urlOrFactory, options = {}) {
  const {
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_MS,
    heartbeatMessage = JSON.stringify({ event: "heartbeat" }),
    maxReconnectDelayMs = MAX_RECONNECT_MS,
    minReconnectDelayMs = DEFAULT_RECONNECT_MS,
    onClose,
    onError,
    onMessage,
    onOpen,
    reconnect = true,
  } = options;

  let disposed = false;
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let socket = null;

  const getUrl = () =>
    typeof urlOrFactory === "function" ? urlOrFactory() : urlOrFactory;

  const clearHeartbeat = () => {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const startHeartbeat = () => {
    clearHeartbeat();

    if (!heartbeatIntervalMs || !heartbeatMessage) {
      return;
    }

    heartbeatTimer = window.setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(heartbeatMessage);
      }
    }, heartbeatIntervalMs);
  };

  const clearReconnect = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const connect = () => {
    if (disposed) return;

    const url = getUrl();
    if (!url) return;

    clearReconnect();
    closeSocket(socket);

    const nextSocket = new WebSocket(url);
    socket = nextSocket;

    nextSocket.onopen = (event) => {
      if (disposed) {
        closeSocket(nextSocket);
        return;
      }

      reconnectAttempt = 0;
      startHeartbeat();
      onOpen?.(event, nextSocket);
    };

    nextSocket.onmessage = (event) => {
      if (!disposed) {
        onMessage?.(event, nextSocket);
      }
    };

    nextSocket.onerror = (event) => {
      onError?.(event, nextSocket);
    };

    nextSocket.onclose = (event) => {
      clearHeartbeat();
      onClose?.(event, nextSocket);

      if (disposed || !reconnect) {
        return;
      }

      const delay = getReconnectDelay(
        reconnectAttempt,
        minReconnectDelayMs,
        maxReconnectDelayMs
      );
      reconnectAttempt += 1;

      reconnectTimer = window.setTimeout(connect, delay);
    };
  };

  connect();

  return {
    close() {
      disposed = true;
      clearHeartbeat();
      clearReconnect();
      closeSocket(socket);
      socket = null;
    },
    getSocket() {
      return socket;
    },
    isOpen() {
      return socket?.readyState === WebSocket.OPEN;
    },
    send(payload) {
      if (socket?.readyState !== WebSocket.OPEN) {
        return false;
      }

      socket.send(payload);
      return true;
    },
  };
}
