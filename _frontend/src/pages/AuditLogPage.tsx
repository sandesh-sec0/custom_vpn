import { useState } from 'react';
import { FileText, RefreshCw, Filter, Loader2 } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Pagination } from '@/components/common/Pagination';

// Map action names to readable labels and colors
const ACTION_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  create_user: { label: 'Create User', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  update_user: { label: 'Update User', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  delete_user: { label: 'Delete User', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  terminate_session: { label: 'Kill Session', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  login: { label: 'Login', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  logout: { label: 'Logout', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  change_password: { label: 'Password Change', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
};

function getActionStyle(action: string) {
  return ACTION_STYLES[action] ?? {
    label: action.replace(/_/g, ' '),
    color: 'var(--text-secondary)',
    bg: 'rgba(100,100,100,0.1)',
  };
}

export function AuditLogPage() {
  const [skip, setSkip] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 10;

  const { logs, total, isLoading, error, refresh } = useAuditLogs({ skip, limit, action: actionFilter });

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 border border-slate-500/20 shadow-sm">
            <FileText size={24} className="text-slate-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-(--text-primary)">
              Audit Log
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              System-wide administrative action trail ({total} entries)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary) pointer-events-none" />
            <select
              id="audit-action-filter"
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setSkip(0); }}
              className="appearance-none rounded-lg border border-(--btn-border) bg-(--bg-card) py-2 pl-9 pr-8 text-xs font-semibold text-(--text-primary) transition-all focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">All Actions</option>
              <option value="create_user">Create User</option>
              <option value="update_user">Update User</option>
              <option value="delete_user">Delete User</option>
              <option value="terminate_session">Kill Session</option>
              <option value="login">Login</option>
              <option value="change_password">Password Change</option>
            </select>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-(--btn-border) bg-(--bg-card) px-4 py-2 text-xs font-bold text-(--text-secondary) transition-all hover:text-(--text-primary) active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-sm font-medium text-red-500">
            {error}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-(--border-color) bg-(--bg-card) shadow-sm overflow-hidden transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-(--border-color) bg-(--bg-card)">
                {['Timestamp', 'Action', 'Resource', 'User ID', 'IP Address', 'Details', 'Status'].map(h => (
                  <th key={h} className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-(--text-secondary)">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-24 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-slate-500/20" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={48} className="opacity-10 text-(--text-secondary)" />
                      <p className="text-sm font-medium text-(--text-secondary)">No audit entries found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const style = getActionStyle(log.action);
                  return (
                    <tr key={log.id} className="border-b border-(--border-color) bg-transparent transition-all last:border-0 hover:bg-(--table-hover)">
                      <td className="px-5 py-4 text-xs tabular-nums text-(--text-secondary) whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-5 py-4">
                        <span 
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{ color: style.color, background: style.bg }}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-(--text-primary)">
                        {log.resource}
                      </td>
                      <td className="px-5 py-4 text-xs text-(--text-secondary)">
                        {log.user_id}
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-[11px] font-mono text-slate-500 rounded bg-slate-500/5 px-1.5 py-0.5 border border-slate-500/10">
                          {log.ip_address}
                        </code>
                      </td>
                      <td className="px-5 py-4 text-xs text-(--text-secondary) max-w-50 truncate" title={log.details || undefined}>
                        {log.details || '—'}
                      </td>
                      <td className="px-5 py-4">
                        {log.status_code && (
                          <span className={`text-xs font-bold ${log.status_code < 400 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {log.status_code}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-(--border-color) px-5 py-4">
          <Pagination
            currentPage={currentPage}
            totalPage={totalPages}
            onPageChange={(p) => setSkip((p - 1) * limit)}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
