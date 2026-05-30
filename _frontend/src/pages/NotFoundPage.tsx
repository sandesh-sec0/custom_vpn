/**
 * NotFoundPage — 404
 */

import { Link } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', textAlign: 'center', gap: '1rem',
      }}
    >
      <SearchX size={64} color="var(--btn-border)" />
      <h1 style={{ margin: 0, fontSize: '4rem', fontWeight: 900, color: 'var(--border-color)', lineHeight: 1 }}>404</h1>
      <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Page not found</p>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
      </p>
      <Link
        to="/"
        id="not-found-home-link"
        style={{
          marginTop: '0.5rem',
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: '0.5rem', color: '#06b6d4', textDecoration: 'none',
          fontSize: '0.875rem', fontWeight: 500,
        }}
      >
        <Home size={15} />
        Back to Dashboard
      </Link>
    </div>
  );
}
