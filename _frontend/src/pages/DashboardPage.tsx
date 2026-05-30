/**
 * DashboardPage — / (home)
 *
 * Shows summary stats and recent sessions.
 */

import { useEffect, useState, useCallback } from 'react';
import { Activity, Users, ArrowUpDown, Wifi, RefreshCw, Server, AlertTriangle, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSessions } from '@/hooks/useSessions';
import { useUsers } from '@/hooks/useUsers';
import { useServices } from '@/hooks/useServices';
import { formatBytes, formatRelativeTime, sessionDuration, truncateSessionId } from '@/utils/formatting';
import { StatsChart } from '@/components/charts/StatsChart';
import { apiClient } from '@/api/client';
import type { VpnStats } from '@/api/types';
import { parseError } from '@/utils/errors';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border-color)`,
        borderRadius: '0.75rem',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flex: '1 1 160px',
        minWidth: '160px',
      }}
    >
      <div
        style={{
          width: '44px', height: '44px', borderRadius: '10px',
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</p>
        {sub && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { sessions, isLoading: sessLoading, refresh: refreshSessions } = useSessions({ 
    limit: 50, 
    autoRefreshMs: 10000, 
    enabled: true,
    userId: user?.is_admin ? undefined : user?.id 
  });
  const { users, isLoading: usersLoading } = useUsers(0, 20, undefined, !!user?.is_admin);
  const { myServices, isLoading: servicesLoading, downloadConfig, fetchServices } = useServices();
  const [refreshing, setRefreshing] = useState(false);
  const [vpnStats, setVpnStats] = useState<VpnStats | null>(null);

  const totalUp = sessions.reduce((s, x) => s + x.bytes_up, 0);
  const totalDown = sessions.reduce((s, x) => s + x.bytes_down, 0);
  const activeSessions = sessions.filter(s => s.status === 'active');

  // Fetch VPN stats
  const fetchVpnStats = useCallback(async () => {
    try {
      const data = await apiClient.get<VpnStats>('/vpn/stats');
      setVpnStats(data);
    } catch {
      setVpnStats(null);
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      void fetchVpnStats();
      const interval = setInterval(() => void fetchVpnStats(), 10000);
      return () => clearInterval(interval);
    }
  }, [user, fetchVpnStats]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refreshSessions(), fetchVpnStats(), fetchServices()]);
    setRefreshing(false);
  }

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Recent 5
  const recent = [...sessions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Server size={24} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-(--text-primary)">
              Welcome back, {user?.username}
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              VPN infrastructure overview
            </p>
          </div>
        </div>
        <button
          id="dashboard-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing || sessLoading}
          className="flex items-center gap-2 rounded-lg border border-(--btn-border) bg-transparent px-4 py-2 text-sm font-medium text-(--text-secondary) transition-all hover:bg-(--bg-card) hover:text-(--text-primary) active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* VPN Status Card */}
        {user?.is_admin && (
          <div className={`flex items-center gap-4 rounded-xl border p-5 bg-(--bg-card) transition-all ${vpnStats?.vpn_online ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
            <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${vpnStats?.vpn_online ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-red-500/15 border-red-500/30'}`}>
              <Server size={20} className={vpnStats?.vpn_online ? 'text-emerald-500' : 'text-red-500'} />
              <div className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-(--bg-card) ${vpnStats?.vpn_online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-(--text-secondary)">VPN Core</p>
              <p className={`mt-0.5 text-lg font-bold leading-none ${vpnStats?.vpn_online ? 'text-emerald-500' : 'text-red-500'}`}>
                {vpnStats?.vpn_online ? 'Online' : 'Offline'}
              </p>
              {vpnStats?.vpn_online && (
                <p className="mt-1 text-[10px] text-(--text-secondary) leading-tight uppercase font-semibold">
                  {formatUptime(vpnStats.uptime_seconds)} • {vpnStats.active_sessions}/{vpnStats.max_capacity} clients
                </p>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15">
            <Activity size={20} className="text-cyan-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-secondary)">Active Sessions</p>
            <p className="mt-0.5 text-2xl font-extrabold leading-none text-(--text-primary)">
              {sessLoading ? '…' : activeSessions.length}
            </p>
            <p className="mt-1 text-[10px] text-(--text-secondary) leading-tight uppercase font-semibold">
              {user?.is_admin ? `${sessions.length} total` : 'active connections'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15">
            <ArrowUpDown size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-secondary)">Uploaded Data</p>
            <p className="mt-0.5 text-2xl font-extrabold leading-none text-(--text-primary)">
              {sessLoading ? '…' : formatBytes(totalUp)}
            </p>
            <p className="mt-1 text-[10px] text-(--text-secondary) leading-tight uppercase font-semibold">
              Inbound traffic
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15">
            <Wifi size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-(--text-secondary)">Downloaded Data</p>
            <p className="mt-0.5 text-2xl font-extrabold leading-none text-(--text-primary)">
              {sessLoading ? '…' : formatBytes(totalDown)}
            </p>
            <p className="mt-1 text-[10px] text-(--text-secondary) leading-tight uppercase font-semibold">
              Outbound traffic
            </p>
          </div>
        </div>
      </div>

      {/* Anomaly warnings */}
      {vpnStats?.anomalies && vpnStats.anomalies.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-500">Security Anomalies Detected</p>
            {vpnStats.anomalies.map((a, i) => (
              <p key={i} className="mt-1 text-sm text-(--text-secondary)">• {a}</p>
            ))}
          </div>
        </div>
      )}

      {/* My Services (Client-oriented) */}
      {!user?.is_admin && (
        <div className="mb-6 rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
        <h2 className="mb-4 text-base font-bold text-(--text-primary)">
          My Authorized Services
        </h2>
        {servicesLoading ? (
            <div className="text-sm text-(--text-secondary)">Loading services...</div>
        ) : myServices.length === 0 ? (
            <div className="text-sm text-(--text-secondary)">You have not been granted access to any services yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myServices.map(svc => (
              <div key={svc.id} className="group flex flex-col gap-3 rounded-lg border border-(--border-color) bg-(--bg-main) p-4 transition-all hover:bg-(--bg-card) hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-(--text-primary)">{svc.name}</h3>
                  <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-500 border border-cyan-500/20">{svc.protocol}</span>
                </div>
                <div className="text-xs text-(--text-secondary) leading-relaxed">
                  {svc.description || 'No description provided'}
                </div>
                <button
                  onClick={() => downloadConfig(svc.id, svc.name)}
                  className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-cyan-500 px-3 py-2 text-xs font-bold text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white active:scale-95"
                >
                  <Download size={14} /> Download Config
                </button>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Chart + Recent sessions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bandwidth chart */}
        {user?.is_admin && (
          <div className="rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
            <h2 className="mb-4 text-sm font-bold text-(--text-primary)">
              Bandwidth by Session
            </h2>
            {sessLoading ? (
              <div className="flex h-35 items-center justify-center text-sm text-(--text-secondary)">
                Loading…
              </div>
            ) : (
              <StatsChart sessions={sessions} />
            )}
          </div>
        )}

        {/* Recent sessions (admin only) */}
        {user?.is_admin && (
          <div className="rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-(--text-primary)">Recent Sessions</h2>
              <Link to="/sessions" className="text-xs font-semibold text-cyan-500 hover:underline">
                View all →
              </Link>
            </div>
            {sessLoading ? (
              <div className="py-4 text-sm text-(--text-secondary)">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="py-4 text-sm text-(--text-secondary)">No sessions yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {recent.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border border-(--border-color) bg-(--bg-main) p-3 text-xs"
                  >
                    <div>
                      <code className="font-mono text-cyan-500">{truncateSessionId(session.session_id)}</code>
                      <span className="ml-2 text-(--text-secondary)">{session.client_ip}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-(--text-primary)">{sessionDuration(session.created_at, session.last_active)}</div>
                      <div className="text-[10px] text-(--text-secondary)">{formatRelativeTime(session.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick actions (admin) */}
      {user?.is_admin && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/users"
            id="dashboard-quick-users"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white active:scale-95"
          >
            <Users size={16} /> Manage Users
          </Link>
          <Link
            to="/sessions"
            id="dashboard-quick-sessions"
            className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white active:scale-95"
          >
            <Activity size={16} /> Monitor Sessions
          </Link>
        </div>
      )}
    </div>
  );
}
