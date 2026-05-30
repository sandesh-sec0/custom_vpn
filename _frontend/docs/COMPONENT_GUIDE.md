# VPN Frontend — Component Guide

## Architecture Overview

```
App.tsx
├── ThemeProvider
├── AuthProvider
└── BrowserRouter
    ├── /login → LoginPage (public)
    └── ProtectedRoute
        └── AppLayout (Header + Sidebar)
            ├── / → DashboardPage
            ├── /profile → ProfilePage
            └── ProtectedRoute (admin)
                ├── /users → UsersPage
                └── /sessions → SessionsPage
```

---

## Auth Components

### `ProtectedRoute`
**Path:** `src/components/auth/ProtectedRoute.tsx`

Route guard. Wraps routes that require authentication.

```tsx
// Usage in App.tsx
<Route element={<ProtectedRoute />}>          // Any logged-in user
<Route element={<ProtectedRoute requireAdmin />}> // Admin only
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `requireAdmin` | `boolean` | `false` | Redirect non-admins to `/` |

---

## Layout Components

### `AppLayout`
**Path:** `src/components/common/AppLayout.tsx`

Shell layout rendering Header + Sidebar + `<Outlet />`.
Manages sidebar open/close state.

### `Header`
**Path:** `src/components/common/Header.tsx`

Sticky top bar. Shows:
- VPN Manager logo with shield icon
- Hamburger (toggles sidebar)
- Theme toggle button
- Current user badge + admin indicator
- Logout button

| Prop | Type | Description |
|------|------|-------------|
| `onMenuClick` | `() => void` | Called when hamburger is clicked |

### `Sidebar`
**Path:** `src/components/common/Sidebar.tsx`

Collapsible left navigation. Admin-only items (Users, Sessions) hidden for non-admin users. Shows user mini-card at bottom.

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls width (240px open, 0 closed) |
| `onClose` | `() => void` | Called by close button |

---

## Form Components

### `LoginForm`
**Path:** `src/components/forms/LoginForm.tsx`

Username + password with show/hide toggle. Calls `useAuth().login()`.

| Prop | Type | Description |
|------|------|-------------|
| `onSuccess` | `() => void` | Called after successful login |

### `UserForm`
**Path:** `src/components/forms/UserForm.tsx`

Modal dialog for create/edit user.
- **Create mode**: Shows all fields including username + password
- **Edit mode**: Username is read-only; no password field

| Prop | Type | Description |
|------|------|-------------|
| `editUser` | `User \| undefined` | Omit for create mode |
| `onSubmit` | `(data) => Promise<void>` | Called with `CreateUserRequest` or `UpdateUserRequest` |
| `onClose` | `() => void` | Called to dismiss modal |

### `ChangePasswordForm`
**Path:** `src/components/forms/ChangePasswordForm.tsx`

Self-contained form. Calls `POST /api/auth/change-password`. Shows own loading/success/error state.

---

## Table Components

### `UsersTable`
**Path:** `src/components/tables/UsersTable.tsx`

Full user management table.

Features: client-side sort (username/email/created_at), search filter, inline delete confirmation, create/edit modals.

| Prop | Type | Description |
|------|------|-------------|
| `users` | `User[]` | Array from API |
| `isLoading` | `boolean` | Shows loading row |
| `onCreateUser` | `(d) => Promise<User>` | Create handler |
| `onUpdateUser` | `(id, d) => Promise<User>` | Update handler |
| `onDeleteUser` | `(id) => Promise<void>` | Delete handler |
| `onRefresh` | `() => Promise<void>` | Refresh button |
| `currentUserId` | `number \| undefined` | Prevents self-delete |

### `SessionsTable`
**Path:** `src/components/tables/SessionsTable.tsx`

Session monitoring table.

Features: sort by created_at/bytes_up/bytes_down, inline terminate confirm, detail modal popup.

| Prop | Type | Description |
|------|------|-------------|
| `sessions` | `Session[]` | Array from API |
| `isLoading` | `boolean` | Shows loading row |
| `onTerminate` | `(id) => Promise<void>` | Terminate handler |
| `onRefresh` | `() => Promise<void>` | Refresh button |

---

## Chart Components

### `StatsChart`
**Path:** `src/components/charts/StatsChart.tsx`

Pure SVG bar chart. No external deps. Shows top 8 sessions by bandwidth.
Green bars = upload, Cyan bars = download.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sessions` | `Session[]` | — | Session data |
| `height` | `number` | `140` | SVG height px |

---

## Context & Hooks

### `AuthContext` / `useAuth()`
Global auth state. Provides:

```tsx
const { isAuthenticated, isLoading, user, error, login, logout, clearError, updateUser } = useAuth();
```

### `ThemeContext` / `useTheme()`
Dark/light mode:

```tsx
const { theme, toggleTheme } = useTheme(); // theme: 'dark' | 'light'
```

### `useUsers(skip, limit, search)`
User CRUD with auto-refresh:

```tsx
const { users, isLoading, error, createUser, updateUser, deleteUser, refresh } = useUsers();
```

### `useSessions(filters)`
Session management:

```tsx
const { sessions, isLoading, error, terminateSession, refresh } = useSessions({ activeOnly: true });
```

---

## API Client

**Path:** `src/api/client.ts`

> ⚠️ **IMPORTANT:** Axios is forbidden. This wrapper uses native `fetch()` only.

```tsx
import { apiClient } from '@/api/client';

// Examples
const users = await apiClient.get<User[]>('/users');
const newUser = await apiClient.post<User>('/users', { username, email, password });
await apiClient.delete(`/users/${id}`);
```

Automatically:
- Injects `Authorization: Bearer <token>` from sessionStorage
- Fires `vpn:auth:expired` event on 401 → AuthContext logs out
- Times out after `VITE_API_TIMEOUT` ms (default 30s)
- Throws `ApiException` on non-2xx responses

---

## Utility Functions

### `src/utils/auth.ts`
```ts
getToken()        // → string | null
setToken(token)   // store JWT
clearAllAuth()    // wipe sessionStorage
```

### `src/utils/formatting.ts`
```ts
formatBytes(1536)                          // → "1.5 KB"
formatDuration(3661)                       // → "1h 1m"
formatDate("2026-04-12T10:30:00Z")        // → "Apr 12, 2026"
formatDateTime("2026-04-12T10:30:00Z")    // → "Apr 12, 2026, 10:30 AM"
formatRelativeTime("2026-04-12T10:30:00Z") // → "3h ago"
truncateSessionId("abc-def-ghi-jkl")      // → "abc-def-ghi-…"
sessionDuration(createdAt, lastActive)    // → "1h 5m"
```

### `src/utils/errors.ts`
```ts
parseError(err)      // → user-friendly string from any error
isNotFound(err)      // → boolean
isUnauthorized(err)  // → boolean
```
