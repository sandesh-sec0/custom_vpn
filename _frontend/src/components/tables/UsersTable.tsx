import { useState } from 'react';
import {
    Pencil,
    Trash2,
    ChevronUp,
    ChevronDown,
    RefreshCw,
    UserPlus,
} from 'lucide-react';
import type { CreateUserRequest, UpdateUserRequest, User } from '@/api/types';
import { formatDate, formatRelativeTime } from '@/utils/formatting';
import { UserForm } from '@/components/forms/UserForm';
import { Pagination } from '@/components/common/Pagination';

interface UsersTableProps {
    users: User[];
    isLoading: boolean;
    totalUsers: number;
    currentPage: number;
    totalPages: number;
    search: string;
    onSearchChange: (search: string) => void;
    onPageChange: (page: number) => void;
    onCreateUser: (data: CreateUserRequest) => Promise<User>;
    onUpdateUser: (id: number, data: UpdateUserRequest) => Promise<User>;
    onDeleteUser: (id: number) => Promise<void>;
    onRefresh: () => Promise<void>;
    currentUserId?: number;
}

type SortField = 'username' | 'email' | 'created_at';
type SortDir = 'asc' | 'desc';

export function UsersTable({
    users,
    isLoading,
    totalUsers,
    currentPage,
    totalPages,
    search,
    onSearchChange,
    onPageChange,
    onCreateUser,
    onUpdateUser,
    onDeleteUser,
    onRefresh,
    currentUserId,
}: UsersTableProps) {
    const [sortField, setSortField] = useState<SortField>('username');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [editUser, setEditUser] = useState<User | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    function toggleSort(field: SortField) {
        if (sortField === field)
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortField(field);
            setSortDir('asc');
        }
    }

    const sorted = users;

    async function handleDelete(id: number) {
        setDeletingId(id);
        try {
            await onDeleteUser(id);
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
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
            {/* Toolbar */}
            <div
                style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <input
                    id="users-search"
                    type="search"
                    placeholder="Search by username or email…"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--btn-border)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        outline: 'none',
                    }}
                />
                <button
                    id="users-refresh-btn"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-lg border border-(--btn-border) bg-transparent px-4 py-2 text-sm font-medium text-(--text-secondary) transition-all hover:bg-(--bg-card) hover:text-(--text-primary) active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw
                        size={14}
                        className={isLoading ? 'animate-spin' : ''}
                    />
                    Refresh
                </button>
                <button
                    id="users-create-btn"
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-cyan-700 active:scale-95"
                    style={{
                        border: 'none',
                    }}
                >
                    <UserPlus size={14} />
                    New User
                </button>
            </div>

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
                                <th style={thStyle}>ID</th>
                                <th
                                    style={{ ...thStyle, cursor: 'pointer' }}
                                    onClick={() => toggleSort('username')}
                                >
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        Username <SortIcon field="username" />
                                    </span>
                                </th>
                                <th
                                    style={{ ...thStyle, cursor: 'pointer' }}
                                    onClick={() => toggleSort('email')}
                                >
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        Email <SortIcon field="email" />
                                    </span>
                                </th>
                                <th style={thStyle}>Role</th>
                                <th style={thStyle}>Status</th>
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
                                        Created <SortIcon field="created_at" />
                                    </span>
                                </th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && users.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        style={{
                                            ...tdStyle,
                                            textAlign: 'center',
                                            color: 'var(--text-secondary)',
                                            padding: '3rem',
                                        }}
                                    >
                                        Loading users…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && users.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        style={{
                                            ...tdStyle,
                                            textAlign: 'center',
                                            color: 'var(--text-secondary)',
                                            padding: '3rem',
                                        }}
                                    >
                                        No users found
                                    </td>
                                </tr>
                            )}
                            {sorted.map((user) => (
                                <tr
                                    key={user.id}
                                    style={{ transition: 'background 150ms' }}
                                    className="hover:bg-(--table-hover)"
                                >
                                    <td
                                        style={{
                                            ...tdStyle,
                                            color: 'var(--text-secondary)',
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem',
                                        }}
                                    >
                                        {user.id}
                                    </td>
                                    <td style={tdStyle}>
                                        <span
                                            style={{
                                                fontWeight: 500,
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            {user.username}
                                        </span>
                                        {user.id === currentUserId && (
                                            <span
                                                style={{
                                                    marginLeft: '0.4rem',
                                                    fontSize: '0.65rem',
                                                    padding: '0.1rem 0.35rem',
                                                    background:
                                                        'rgba(6,182,212,0.1)',
                                                    color: '#06b6d4',
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid rgba(6,182,212,0.3)',
                                                }}
                                            >
                                                you
                                            </span>
                                        )}
                                    </td>
                                    <td
                                        style={{ ...tdStyle, color: 'var(--text-secondary)' }}
                                    >
                                        {user.email}
                                    </td>
                                    <td style={tdStyle}>
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                background: user.is_admin
                                                    ? 'rgba(6,182,212,0.1)'
                                                    : 'rgba(100,116,139,0.1)',
                                                color: user.is_admin
                                                    ? '#06b6d4'
                                                    : 'var(--text-secondary)',
                                                border: `1px solid ${user.is_admin ? 'rgba(6,182,212,0.3)' : 'rgba(100,116,139,0.3)'}`,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em',
                                            }}
                                        >
                                            {user.is_admin ? 'Admin' : 'User'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                background: user.is_active
                                                    ? 'rgba(16,185,129,0.1)'
                                                    : 'rgba(239,68,68,0.1)',
                                                color: user.is_active
                                                    ? '#10b981'
                                                    : '#ef4444',
                                                border: `1px solid ${user.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                            }}
                                        >
                                            {user.is_active
                                                ? '● Active'
                                                : '○ Inactive'}
                                        </span>
                                    </td>
                                    <td
                                        style={{
                                            ...tdStyle,
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.8rem',
                                        }}
                                        title={user.created_at}
                                    >
                                        {formatDate(user.created_at)}
                                        <br />
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            {formatRelativeTime(
                                                user.created_at,
                                            )}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        {confirmDeleteId === user.id ? (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.4rem',
                                                }}
                                            >
                                                <button
                                                    onClick={() =>
                                                        handleDelete(user.id)
                                                    }
                                                    disabled={
                                                        deletingId === user.id
                                                    }
                                                    style={{
                                                        padding:
                                                            '0.3rem 0.6rem',
                                                        background: '#ef4444',
                                                        border: 'none',
                                                        borderRadius:
                                                            '0.375rem',
                                                        color: '#fff',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {deletingId === user.id
                                                        ? '…'
                                                        : 'Confirm'}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setConfirmDeleteId(null)
                                                    }
                                                    style={{
                                                        padding:
                                                            '0.3rem 0.6rem',
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
                                                    Cancel
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
                                                    onClick={() =>
                                                        setEditUser(user)
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
                                                    title="Edit user"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setConfirmDeleteId(
                                                            user.id,
                                                        )
                                                    }
                                                    disabled={
                                                        user.id ===
                                                        currentUserId
                                                    }
                                                    style={{
                                                        padding: '0.35rem',
                                                        background:
                                                            'transparent',
                                                        border: '1px solid rgba(239,68,68,0.3)',
                                                        borderRadius:
                                                            '0.375rem',
                                                        color: '#ef4444',
                                                        cursor:
                                                            user.id ===
                                                            currentUserId
                                                                ? 'not-allowed'
                                                                : 'pointer',
                                                        display: 'flex',
                                                        opacity:
                                                            user.id ===
                                                            currentUserId
                                                                ? 0.4
                                                                : 1,
                                                    }}
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
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

            {/* Modals */}
            {showCreate && (
                <UserForm
                    onSubmit={async (data) => {
                        await onCreateUser(data as CreateUserRequest);
                    }}
                    onClose={() => setShowCreate(false)}
                />
            )}
            {editUser && (
                <UserForm
                    editUser={editUser}
                    onSubmit={async (data) => {
                        await onUpdateUser(
                            editUser.id,
                            data as UpdateUserRequest,
                        );
                    }}
                    onClose={() => setEditUser(null)}
                />
            )}
        </>
    );
}
