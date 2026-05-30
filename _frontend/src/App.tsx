/**
 * App.tsx — Root component with React Router v7 routing
 *
 * Route structure:
 *   /login              → LoginPage (public)
 *   /                   → DashboardPage (protected)
 *   /users              → UsersPage (protected, admin only)
 *   /sessions           → SessionsPage (protected, admin only)
 *   /profile            → ProfilePage (protected)
 *   *                   → NotFoundPage
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/common/AppLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Pages
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { SessionsPage } from '@/pages/SessionsPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected — all authenticated users */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Protected — admin only */}
                  <Route element={<ProtectedRoute requireAdmin />}>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/sessions" element={<SessionsPage />} />
                    <Route path="/audit-logs" element={<AuditLogPage />} />
                  </Route>
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
