/**
 * LoginPage — /login
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import { LoginForm } from '@/components/forms/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  function handleSuccess() {
    navigate(from, { replace: true });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        padding: '1rem',
      }}
    >
      {/* Animated background dots */}
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
          backgroundImage: 'radial-gradient(rgba(6,182,212,0.07) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="animate-fade-in" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '64px', height: '64px',
              background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <Shield size={32} color="#06b6d4" />
          </div>
          <h1
            style={{
              margin: 0, fontSize: '1.75rem', fontWeight: 800,
              color: '#06b6d4',
            }}
          >
            VPN Manager
          </h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Secure access management
          </p>
        </div>

        {/* Card */}
        <div
          className="glass"
          style={{
            padding: '2rem',
            borderRadius: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Lock size={16} color="#06b6d4" />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Sign In</h2>
          </div>
          <LoginForm onSuccess={handleSuccess} />
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--btn-border)' }}>
          Custom SSL/TLS VPN — Management Interface
        </p>
      </div>
    </div>
  );
}
