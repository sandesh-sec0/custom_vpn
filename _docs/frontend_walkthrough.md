# Frontend Layer Walkthrough

This document describes the design and implementation of the VPN Management Dashboard.

## 🎨 Overview
The frontend is a modern, responsive Single Page Application (SPA) built with **React**, **TypeScript**, and **Vite**. It uses a dark-themed, premium aesthetic with **Tailwind CSS** and **Shadcn/UI** components.

## 🚀 Key Features

### 1. Authentication & Security
- **JWT-based Auth**: Secure login with automatic token handling.
- **Protected Routes**: Ensuring unauthorized users cannot access management pages.
- **Native Fetch**: Uses the browser's built-in `fetch()` API for maximum security (Axis-free).

### 2. Admin Dashboard
- **Summary Stats**: Total sessions, user counts, and real-time bandwidth metrics.
- **Visual Analytics**: Interactive charts showing data usage trends.
- **Quick Actions**: One-click access to common admin tasks.

### 3. User Management
- **CRUD Operations**: Admins can create, update, and (soft) delete VPN users.
- **Search & Filter**: Find users quickly by username or email.

### 4. Session Monitoring
- **Live Feed**: View all active tunnels, client IPs, and duration.
- **Remote Termination**: Admins can forcibly close any session via the API.
- **Role-Based Privacy**: Regular users see only their own stats; Admins see global overview.
- **Improved UX**: Centered layouts for wider screens and optimized fetch guards to save resources.

## 📂 Project Structure
- `src/pages/`: Main views (Dashboard, Users, Sessions, Profile).
- `src/hooks/`: Reusable logic for Auth, Sessions, and Users.
- `src/components/`: Modular UI elements (Tables, Charts, Forms).
- `src/api/`: Typed API client using native `fetch`.

## 🛠️ Design System
The UI uses **Semantic CSS Variables** (`globals.css`) for consistent colors across all components:
- `--bg-main`: Deep dark background.
- `--bg-card`: Sleek card backgrounds.
- `--text-primary`: Pure white typography.
- `--accent`: Cyan/Indigo highlights.
