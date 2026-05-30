/**
 * SessionsPage — /sessions (admin only)
 */

import { useState } from 'react';
import { useSessions } from '@/hooks/useSessions';
import { SessionsTable } from '@/components/tables/SessionsTable';
import { Activity, RefreshCw } from 'lucide-react';

export function SessionsPage() {
  const [activeOnly, setActiveOnly] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 10;

  const { 
    sessions, 
    total,
    isLoading, 
    error, 
    refresh, 
    terminateSession 
  } = useSessions({ 
    activeOnly, 
    skip,
    limit,
    autoRefreshMs: 5000 
  });

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Activity size={24} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-(--text-primary)">
              Session Monitor
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              View and manage active VPN sessions ({total} total)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="sessions-refresh-top-btn"
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-(--btn-border) bg-(--bg-card) px-4 py-2 text-sm font-semibold text-(--text-secondary) transition hover:text-(--text-primary) active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={`transition-transform duration-500 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>

          <div className="flex items-center gap-3 rounded-lg border border-(--btn-border) bg-(--bg-card) px-4 py-2">
            <label
              htmlFor="sessions-active-filter"
              className="flex cursor-pointer items-center gap-3 text-xs font-bold text-(--text-secondary) uppercase tracking-wide hover:text-(--text-primary) transition-colors"
            >
              <input
                id="sessions-active-filter"
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => { setActiveOnly(e.target.checked); setSkip(0); }}
                className="h-4 w-4 cursor-pointer rounded border-(--btn-border) bg-(--bg-main) text-cyan-600 focus:ring-cyan-500"
              />
              Active only
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-sm font-medium text-red-600 dark:text-red-500">
            {error}
          </div>
        </div>
      )}

      <SessionsTable
        sessions={sessions}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setSkip((page - 1) * limit)}
        isLoading={isLoading}
        onTerminate={terminateSession}
        onRefresh={refresh}
      />
    </div>
  );
}
