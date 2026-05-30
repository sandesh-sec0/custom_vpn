import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    try {
      await login({ username, password })
      navigate('/')
    } catch { /* error shown via context */ }
  }

  return (
    <div className={styles.root}>
      <div className={styles.scanline} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <span className={styles.shield}>⬡</span>
          </div>
          <div>
            <div className={styles.logoTitle}>VPN CLIENT</div>
            <div className={styles.logoSub}>SECURE TUNNEL ACCESS</div>
          </div>
        </div>

        <div className={styles.divider} />

        {error && (
          <div className={styles.error}>
            <span className={styles.errorDot} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your.username"
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.btn} disabled={isLoading}>
            {isLoading ? (
              <span className={styles.loading}>
                <span />
                <span />
                <span />
                AUTHENTICATING
              </span>
            ) : (
              '→ CONNECT'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <span className={styles.footerDot} />
          <span>TLS 1.2 · PBKDF2-SHA256 · END-TO-END ENCRYPTED</span>
        </div>
      </div>
    </div>
  )
}
