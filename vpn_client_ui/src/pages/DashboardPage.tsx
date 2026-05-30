import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/api/client'
import type { Service, ConfigResponse, Session, VpnStats } from '@/api/types'
import { useAuth } from '@/context/AuthContext'
import { formatBytes, formatUptime } from '@/utils/format'
import styles from './DashboardPage.module.css'

type ConnectionStatus = 'disconnected' | 'connected'

export function DashboardPage() {
  const { user, logout } = useAuth()

  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesError, setServicesError] = useState<string | null>(null)

  const [stats, setStats] = useState<VpnStats | null>(null)
  const [statsError, setStatsError] = useState(false)

  const [mySession, setMySession] = useState<Session | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [downloadedService, setDownloadedService] = useState<string | null>(null)
  const [configContent, setConfigContent] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  const [tick, setTick] = useState(0)

  useEffect(() => {
    async function fetchServices() {
      try {
        const data = await apiClient.get<Service[]>('/services/my-services')
        setServices(data)
      } catch (err) {
        setServicesError(err instanceof Error ? err.message : 'Failed to load services')
      } finally {
        setServicesLoading(false)
      }
    }
    fetchServices()
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient.get<VpnStats>('/vpn-stats')
      setStats(data)
      setStatsError(false)
    } catch {
      setStatsError(true)
    }
  }, [])

  const fetchMySession = useCallback(async () => {
    try {
      const data = await apiClient.get<{ items: Session[]; total: number }>(
        '/sessions?active_only=true&limit=1'
      )
      const mine = data.items.find(s => s.username === user?.username && s.status === 'active')
      setMySession(mine ?? null)
      setStatus(mine ? 'connected' : 'disconnected')
    } catch {
      setMySession(null)
    }
  }, [user])

  useEffect(() => {
    fetchStats()
    fetchMySession()
    const id = setInterval(() => {
      fetchStats()
      fetchMySession()
      setTick(t => t + 1)
    }, 5000)
    return () => clearInterval(id)
  }, [fetchStats, fetchMySession])

  async function handleDownloadConfig(service: Service) {
    setDownloadingId(service.id)
    setShowConfig(false)
    setConfigContent(null)
    try {
      const config = await apiClient.get<ConfigResponse>(`/services/${service.id}/config`)
      const json = JSON.stringify(config, null, 2)
      setConfigContent(json)
      setDownloadedService(service.name)
      setShowConfig(true)

      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${service.name.toLowerCase().replace(/\s+/g, '_')}_config.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloadingId(null)
    }
  }

  const isConnected = status === 'connected'
  const now = new Date()
  void tick

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoMark}>⬡</div>
          <div>
            <div className={styles.appName}>VPN CLIENT</div>
            <div className={styles.appSub}>SECURE TUNNEL PORTAL</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <span className={styles.userLabel}>SESSION</span>
            <span className={styles.userName}>{user?.username}</span>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            DISCONNECT &amp; LOGOUT
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.statusBar}>
          <div className={`${styles.statusBadge} ${isConnected ? styles.statusConnected : styles.statusDisconnected}`}>
            <span className={styles.statusDot} />
            {isConnected ? 'TUNNEL ACTIVE' : 'NO TUNNEL'}
          </div>
          <div className={styles.statusMeta}>
            <span className={styles.metaItem}>
              {now.toLocaleTimeString([], { hour12: false })}
            </span>
            {stats && !statsError && (
              <>
                <span className={styles.metaDivider}>·</span>
                <span className={styles.metaItem}>
                  VPN {stats.vpn_online ? '● ONLINE' : '○ OFFLINE'}
                </span>
                <span className={styles.metaDivider}>·</span>
                <span className={styles.metaItem}>
                  {stats.active_sessions}/{stats.max_capacity} sessions
                </span>
              </>
            )}
          </div>
        </div>

        {isConnected && mySession && (
          <div className={styles.activeSession}>
            <div className={styles.activeTunnelHeader}>
              <span className={styles.activePulse} />
              ACTIVE TUNNEL
            </div>
            <div className={styles.tunnelGrid}>
              <div className={styles.tunnelStat}>
                <div className={styles.tunnelStatLabel}>CLIENT IP</div>
                <div className={styles.tunnelStatValue}>{mySession.client_ip}</div>
              </div>
              <div className={styles.tunnelStat}>
                <div className={styles.tunnelStatLabel}>BYTES UP</div>
                <div className={`${styles.tunnelStatValue} ${styles.up}`}>
                  ↑ {formatBytes(mySession.bytes_up)}
                </div>
              </div>
              <div className={styles.tunnelStat}>
                <div className={styles.tunnelStatLabel}>BYTES DOWN</div>
                <div className={`${styles.tunnelStatValue} ${styles.down}`}>
                  ↓ {formatBytes(mySession.bytes_down)}
                </div>
              </div>
              <div className={styles.tunnelStat}>
                <div className={styles.tunnelStatLabel}>CONNECTED</div>
                <div className={styles.tunnelStatValue}>
                  {new Date(mySession.created_at).toLocaleTimeString([], { hour12: false })}
                </div>
              </div>
            </div>
          </div>
        )}

        {stats && !statsError && (
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>VPN UPTIME</div>
              <div className={styles.statValue}>{formatUptime(stats.uptime_seconds)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>TOTAL CONNECTIONS</div>
              <div className={styles.statValue}>{stats.total_connections}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>TOTAL UP</div>
              <div className={`${styles.statValue} ${styles.up}`}>
                ↑ {formatBytes(stats.total_bytes_up)}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>TOTAL DOWN</div>
              <div className={`${styles.statValue} ${styles.down}`}>
                ↓ {formatBytes(stats.total_bytes_down)}
              </div>
            </div>
          </div>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>MY SERVICES</div>
            <div className={styles.sectionSub}>
              {services.length} service{services.length !== 1 ? 's' : ''} available
            </div>
          </div>

          {servicesLoading && (
            <div className={styles.loadingState}>
              <span className={styles.loadingDots}>
                <span /><span /><span />
              </span>
              LOADING SERVICES...
            </div>
          )}

          {servicesError && (
            <div className={styles.errorState}>{servicesError}</div>
          )}

          {!servicesLoading && !servicesError && services.length === 0 && (
            <div className={styles.emptyState}>
              No services assigned to your account.
              Contact your administrator to request access.
            </div>
          )}

          {!servicesLoading && services.length > 0 && (
            <div className={styles.serviceGrid}>
              {services.map(service => (
                <div key={service.id} className={styles.serviceCard}>
                  <div className={styles.serviceTop}>
                    <div className={styles.serviceNameRow}>
                      <div className={styles.serviceProtocol}>{service.protocol}</div>
                      <div className={styles.serviceName}>{service.name}</div>
                    </div>
                    {service.is_persistent && (
                      <div className={styles.persistentBadge}>PERSISTENT</div>
                    )}
                  </div>

                  {service.description && (
                    <div className={styles.serviceDesc}>{service.description}</div>
                  )}

                  <div className={styles.serviceEndpoint}>
                    <span className={styles.endpointLabel}>ENDPOINT</span>
                    <span className={styles.endpointValue}>
                      {service.host}:{service.port}
                    </span>
                  </div>

                  <button
                    className={styles.downloadBtn}
                    onClick={() => handleDownloadConfig(service)}
                    disabled={downloadingId === service.id}
                  >
                    {downloadingId === service.id ? (
                      <>
                        <span className={styles.smallDots}>
                          <span /><span /><span />
                        </span>
                        GENERATING CONFIG...
                      </>
                    ) : (
                      <>↓ DOWNLOAD CONFIG</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {showConfig && configContent && downloadedService && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>CONFIG DOWNLOADED</div>
              <button className={styles.closeConfig} onClick={() => setShowConfig(false)}>
                ✕ CLOSE
              </button>
            </div>
            <div className={styles.configBox}>
              <div className={styles.configHeader}>
                <span className={styles.configFileName}>
                  {downloadedService.toLowerCase().replace(/\s+/g, '_')}_config.json
                </span>
                <button
                  className={styles.copyBtn}
                  onClick={() => navigator.clipboard.writeText(configContent)}
                >
                  COPY
                </button>
              </div>
              <pre className={styles.configPre}>{configContent}</pre>
            </div>
            <div className={styles.howToConnect}>
              <div className={styles.howToTitle}>HOW TO CONNECT</div>
              <div className={styles.stepsList}>
                <div className={styles.step}>
                  <span className={styles.stepNum}>01</span>
                  <span className={styles.stepText}>
                    Save the downloaded config file to your project root
                  </span>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNum}>02</span>
                  <span className={styles.stepText}>
                    Open a terminal in your project root folder
                  </span>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNum}>03</span>
                  <div>
                    <div className={styles.stepText}>Run this command:</div>
                    <code className={styles.stepCode}>
                      {`python -m _custom_ssl_vpn.client.vpn_client --service-config ${downloadedService.toLowerCase().replace(/\s+/g, '_')}_config.json -u "${user?.username}"`}
                    </code>
                  </div>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNum}>04</span>
                  <span className={styles.stepText}>
                    Enter your password when prompted. Once you see{' '}
                    <span className={styles.highlight}>"Authentication granted"</span>,
                    traffic is tunneling through the VPN.
                  </span>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNum}>05</span>
                  <span className={styles.stepText}>
                    Point your app to <span className={styles.highlight}>localhost:9000</span> — 
                    this page will auto-update to show your session stats.
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
