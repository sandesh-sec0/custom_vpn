/**
 * LoginForm — Username + Password form
 */

import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!username.trim()) {
      setValidationError('Username is required');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    try {
      await login({ username: username.trim(), password });
      onSuccess?.();
    } catch {
      // Error state handled by AuthContext
    }
  }

  const displayError = validationError ?? error;

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {displayError && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
          }}
        >
          {displayError}
        </div>
      )}

      {/* Username */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label
          htmlFor="login-username"
          style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}
        >
          Username
        </label>
        <input
          id="login-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={isLoading}
          placeholder="Enter your username"
          style={{
            padding: '0.625rem 0.875rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--btn-border)',
            borderRadius: '0.5rem',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            outline: 'none',
            width: '100%',
          }}
          onFocus={e => (e.target.style.borderColor = '#06b6d4')}
          onBlur={e => (e.target.style.borderColor = 'var(--btn-border)')}
        />
      </div>

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label
          htmlFor="login-password"
          style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}
        >
          Password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Enter your password"
            style={{
              padding: '0.625rem 2.5rem 0.625rem 0.875rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--btn-border)',
              borderRadius: '0.5rem',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
              width: '100%',
            }}
            onFocus={e => (e.target.style.borderColor = '#06b6d4')}
            onBlur={e => (e.target.style.borderColor = 'var(--btn-border)')}
          />
          <button
            type="button"
            id="login-toggle-password"
            onClick={() => setShowPassword(v => !v)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        id="login-submit-btn"
        type="submit"
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: isLoading ? '#0e7490' : '#06b6d4',
          border: 'none',
          borderRadius: '0.5rem',
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.95rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginTop: '0.5rem',
          boxShadow: 'none',
        }}
        className="transition-all active:scale-95 hover:bg-cyan-600"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <LogIn size={16} />
            Sign In
          </>
        )}
      </button>
    </form>
  );
}
