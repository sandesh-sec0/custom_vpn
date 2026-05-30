/**
 * SessionsTable — Admin view of VPN sessions with filters
 */

import { useState } from 'react';
import { WifiOff, RefreshCw, ChevronUp, ChevronDown, Info } from 'lucide-react';
import type { Session } from '@/api/types';
import {
    formatBytes,
    formatDate,
    formatDateTime,
    sessionDuration,
    truncateSessionId,
} from '@/utils/formatting';
import { parseError } from '@/utils/errors';
import { Portal } from '@/components/common/Portal';
import { Pagination } from '@/components/common/Pagination';

interface SessionsTableProps {
    sessions: Session[];
    total: number;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    isLoading: boolean;
    onTerminate: (id: number) => Promise<void>;
    onRefresh: () => Promise<void>;
}

type SortField = 'created_at' | 'bytes_up' | 'bytes_down' | 'last_active';
type SortDir = 'asc' | 'desc';

export function SessionsTable({
    sessions,
    total,
    currentPage,
    totalPages,
    onPageChange,
    isLoading,
    onTerminate,
    onRefresh,
}: SessionsTableProps) {
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [terminatingId, setTerminatingId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [detailSession, setDetailSession] = useState<Session | null>(null);
    const [terminateError, setTerminateError] = useState<string | null>(null);

    function toggleSort(field: SortField) {
        if (sortField === field)
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortField(field);
            setSortDir('desc');
        }
    }

    const sorted = sessions;

    async function handleTerminate(id: number) {
        setTerminatingId(id);
        setTerminateError(null);
        try {
            await onTerminate(id);
            setConfirmId(null);
        } catch (err) {
            setTerminateError(parseError(err));
        } finally {
            setTerminatingId(null);
        }
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field)
            return <ChevronUp size={12} style={{ opacity: 0.3 }} />;
        return sortDir === 'asc' ? (
            <ChevronUp size={12} color="#06b6d4" />
        ) : (
            <ChevronDown size={12} color="#06b6d4" />
        );
    }

    const thStyle: React.CSSProperties = {
        padding: '0.75rem 1rem',
        background: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        fontSize: '0.7rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textAlign: 'left',
        borderBottom: '1px solid var(--border-color)',
        whiteSpace: 'nowrap',
    };

    const tdStyle: React.CSSProperties = {
        padding: '0.875rem 1rem',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    };

    return (
        <>
            {/* Table */}
            <div
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                }}
            >
                <div style={{ overflowX: 'auto' }}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={thStyle}>Session ID</th>
                                <th style={thStyle}>User</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Client IP</th>
                                <th style={thStyle}>Duration</th>
                                <th
                                    style={{ ...thStyle, cursor: 'pointer' }}
                                    onClick={() => toggleSort('bytes_up')}
                                >
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        ↑ Upload <SortIcon field="bytes_up" />
                                    </span>
                                </th>
                                <th
                                    style={{ ...thStyle, cursor: 'pointer' }}
                                    onClick={() => toggleSort('bytes_down')}
                                >
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        ↓ Download{' '}
                                        <SortIcon field="bytes_down" />
                                    </span>
                                </th>
                                <th
                                    style={{ ...thStyle, cursor: 'pointer' }}
                                    onClick={() => toggleSort('created_at')}
                                >
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        Started <SortIcon field="created_at" />
                                    </span>
                                </th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        style={{
                                            ...tdStyle,
                                            textAlign: 'center',
                                            color: 'var(--text-secondary)',
                                            padding: '3rem',
                                        }}
                                    >
                                        Loading sessions…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && sorted.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        style={{
                                            ...tdStyle,
                                            textAlign: 'center',
                                            color: 'var(--text-secondary)',
                                            padding: '3rem',
                                        }}
                                    >
                                        No sessions found
                                    </td>
                                </tr>
                            )}
                            {sorted.map((session) => (
                                <tr
                                    key={session.id}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            'var(--table-hover)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                            'transparent')
                                    }
                                >
                                    <td style={tdStyle}>
                                        <code
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#06b6d4',
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            {truncateSessionId(
                                                session.session_id,
                                            )}
                                        </code>
                                    </td>
                                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                                        {session.username ??
                                            `user:${session.user_id}`}
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            color: session.status === 'active' ? '#10b981' : '#9ca3af',
                                            background: session.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.1)',
                                            border: `1px solid ${session.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(156,163,175,0.2)'}`,
                                        }}>
                                            {session.status === 'active' ? '● Active' : '○ Closed'}
                                        </span>
                                    </td>
                                    <td
                                        style={{
                                            ...tdStyle,
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {session.client_ip}
                                    </td>
                                    <td
                                        style={{
                                            ...tdStyle,
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {sessionDuration(
                                            session.created_at,
                                            session.last_active,
                                        )}
                                    </td>
                                    <td
                                        style={{ ...tdStyle, color: '#10b981' }}
                                    >
                                        {formatBytes(session.bytes_up)}
                                    </td>
                                    <td
                                        style={{ ...tdStyle, color: '#06b6d4' }}
                                    >
                                        {formatBytes(session.bytes_down)}
                                    </td>
                                    <td
                                        style={{
                                            ...tdStyle,
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                        }}
                                        title={formatDateTime(
                                            session.created_at,
                                        )}
                                    >
                                        {formatDate(session.created_at)}
                                    </td>
                                    <td style={tdStyle}>
                                        {confirmId === session.id ? (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.4rem',
                                                }}
                                            >
                                                <button
                                                    id={`sessions-confirm-terminate-${session.id}`}
                                                    onClick={() =>
                                                        handleTerminate(
                                                            session.id,
                                                        )
                                                    }
                                                    disabled={
                                                        terminatingId ===
                                                        session.id
                                                    }
                                                    style={{
                                                        padding:
                                                            '0.3rem 0.5rem',
                                                        background: '#ef4444',
                                                        border: 'none',
                                                        borderRadius:
                                                            '0.375rem',
                                                        color: '#fff',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {terminatingId ===
                                                    session.id
                                                        ? '…'
                                                        : 'Kill'}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setConfirmId(null)
                                                    }
                                                    style={{
                                                        padding:
                                                            '0.3rem 0.5rem',
                                                        background:
                                                            'transparent',
                                                        border: '1px solid var(--btn-border)',
                                                        borderRadius:
                                                            '0.375rem',
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.4rem',
                                                }}
                                            >
                                                <button
                                                    id={`sessions-detail-${session.id}`}
                                                    onClick={() =>
                                                        setDetailSession(
                                                            session,
                                                        )
                                                    }
                                                    style={{
                                                        padding: '0.35rem',
                                                        background:
                                                            'transparent',
                                                        border: '1px solid var(--btn-border)',
                                                        borderRadius:
                                                            '0.375rem',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                    }}
                                                    title="View details"
                                                >
                                                    <Info size={13} />
                                                </button>
                                                {session.status === 'active' && (
                                                    <button
                                                        id={`sessions-terminate-${session.id}`}
                                                        onClick={() =>
                                                            setConfirmId(session.id)
                                                        }
                                                        style={{
                                                            padding: '0.35rem',
                                                            background:
                                                                'transparent',
                                                            border: '1px solid rgba(239,68,68,0.3)',
                                                            borderRadius:
                                                                '0.375rem',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                        }}
                                                        title="Terminate session"
                                                    >
                                                        <WifiOff size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPage={totalPages}
                    onPageChange={onPageChange}
                    isLoading={isLoading}
                />
            </div>

            {/* Detail Modal */}
            {detailSession && (
                <Portal>
                    <div
                        onClick={() => setDetailSession(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2rem',
                            overflowY: 'auto',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="animate-modal-enter"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.75rem',
                                padding: '1.5rem',
                                width: '100%',
                                maxWidth: '480px',
                                boxShadow:
                                    '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)',
                                margin: 'auto',
                            }}
                        >
                            <h3
                                style={{
                                    margin: '0 0 1rem',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                }}
                            >
                                Session Details
                            </h3>
                            {[
                                ['Session ID', detailSession.session_id, true],
                                [
                                    'User',
                                    detailSession.username ??
                                        `ID: ${detailSession.user_id}`,
                                    false,
                                ],
                                ['Status', detailSession.status === 'active' ? '🟢 Active' : '⚫ Disconnected', false],
                                ['Client IP', detailSession.client_ip, true],
                                [
                                    'Started',
                                    formatDateTime(detailSession.created_at),
                                    false,
                                ],
                                [
                                    'Last Active',
                                    formatDateTime(detailSession.last_active),
                                    false,
                                ],
                                [
                                    'Duration',
                                    sessionDuration(
                                        detailSession.created_at,
                                        detailSession.last_active,
                                    ),
                                    false,
                                ],
                                [
                                    'Upload',
                                    formatBytes(detailSession.bytes_up),
                                    false,
                                ],
                                [
                                    'Download',
                                    formatBytes(detailSession.bytes_down),
                                    false,
                                ],
                            ].map(([label, value, mono]) => (
                                <div
                                    key={String(label)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '0.5rem 0',
                                        borderBottom:
                                            '1px solid var(--border-color)',
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    <span
                                        style={{
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {label}
                                    </span>
                                    <span
                                        style={{
                                            color: 'var(--text-primary)',
                                            fontFamily: mono
                                                ? 'monospace'
                                                : undefined,
                                            fontSize: mono
                                                ? '0.8rem'
                                                : undefined,
                                        }}
                                    >
                                        {String(value)}
                                    </span>
                                </div>
                            ))}
                            <button
                                id="session-detail-close"
                                onClick={() => setDetailSession(null)}
                                style={{
                                    marginTop: '1rem',
                                    width: '100%',
                                    padding: '0.625rem',
                                    background: 'transparent',
                                    border: '1px solid var(--btn-border)',
                                    borderRadius: '0.5rem',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}
