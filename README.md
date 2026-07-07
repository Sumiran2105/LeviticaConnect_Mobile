# Levitica Connect

Levitica Connect is a React + Vite collaboration platform with company administration, user workspaces, channels, chat, meetings, calls, files, settings, and super-admin controls.

## Quick Start

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run build
npm run lint
```

## Firebase Notifications

The backend reads Firebase Admin credentials from environment variables:

```bash
FIREBASE_CREDENTIALS='{"type":"service_account",...}'
FIREBASE_DB_URL="https://your-project-default-rtdb.firebaseio.com"
```

The frontend needs the Firebase web app config and FCM web push key:

```bash
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_DB_URL="https://your-project-default-rtdb.firebaseio.com"
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_VAPID_KEY="..."
```

After sign-in, supported browsers register an FCM token with the backend. Direct messages,
channel messages, direct calls, and channel calls then trigger browser notifications and
foreground Teams-style toasts.

## Folder Structure

```text
src/
  app/                    App shell, providers, and route composition
  components/             Shared reusable UI components
    ui/                   Primitive UI building blocks
  config/                 API endpoint constants and runtime config
  layouts/                Shared page layout shells
  lib/                    Shared app-wide helpers and utilities
  store/                  Global client state

  features/               Route-level product areas
    auth/                 User auth pages and forms
    admin-auth/           Admin auth and MFA
    super-admin-auth/     Super-admin auth
    admin-dashboard/      Company admin dashboard routes and components
    super-admin-dashboard/Super-admin dashboard routes and components
    user-dashboard/       User workspace routes and components
    calendar/             Shared calendar scheduling domain
    chat/                 Shared direct-message chat domain
      components/         Chat UI components
      hooks/              Chat data and interaction hooks
      pages/              Shared chat page wrappers
      utils/              Chat normalization and storage helpers
    meetings/             Shared meeting, call, and LiveKit flows
    teams/                Shared team messaging domain
      components/         Team UI components
      hooks/              Team data hooks
      utils/              Team normalization and schema helpers
      admin/              Admin-specific team composition
    landing/              Public landing experience
```

## Architecture Rules

- Put route pages and feature-owned components inside `src/features/<area>/`.
- Put shared page shells in `src/layouts`.
- Put shared product domains that are used by more than one route area under `src/features/<domain>/`, such as `src/features/chat` and `src/features/teams`.
- Put generic UI primitives in `src/components/ui`.
- Put app-wide helpers in `src/lib`; keep feature-specific UI out of this folder.
- Put API paths in `src/config/api.js`; do not hard-code endpoints in components.
- Keep backend code in `Collabration_Teams_backend/`; do not mix backend modules into `src`.

For more detail, see [docs/architecture.md](docs/architecture.md).
