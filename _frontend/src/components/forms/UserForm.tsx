/**
 * UserForm — Create / Edit user modal
 */

import { type FormEvent, useEffect, useState } from 'react';
import { X, Loader2, UserPlus, Save } from 'lucide-react';
import type { CreateUserRequest, UpdateUserRequest, User } from '@/api/types';
import { parseError } from '@/utils/errors';
import { Portal } from '@/components/common/Portal';

interface UserFormProps {
    /** If provided, we are in edit mode */
    editUser?: User;
    onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
    onClose: () => void;
}

export function UserForm({ editUser, onSubmit, onClose }: UserFormProps) {
    const isEdit = !!editUser;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [username, setUsername] = useState(editUser?.username ?? '');
    const [email, setEmail] = useState(editUser?.email ?? '');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(editUser?.is_admin ?? false);
    const [isActive, setIsActive] = useState(editUser?.is_active ?? true);

    useEffect(() => {
        if (editUser) {
            setUsername(editUser.username);
            setEmail(editUser.email);
            setIsAdmin(editUser.is_admin);
            setIsActive(editUser.is_active);
        }
    }, [editUser]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        if (!isEdit && !username.trim()) {
            setError('Username is required');
            return;
        }
        if (!isEdit && password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        try {
            if (isEdit) {
                await onSubmit({
                    email,
                    is_admin: isAdmin,
                    is_active: isActive,
                } satisfies UpdateUserRequest);
            } else {
                await onSubmit({
                    username: username.trim(),
                    email,
                    password,
                    is_admin: isAdmin,
                    is_active: isActive,
                } satisfies CreateUserRequest);
            }
            onClose();
        } catch (err) {
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    }

    const inputStyle: React.CSSProperties = {
        padding: '0.5rem 0.75rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--btn-border)',
        borderRadius: '0.5rem',
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
        outline: 'none',
        width: '100%',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        marginBottom: '0.375rem',
        display: 'block',
    };

    return (
        <Portal>
            {/* Modal backdrop */}
            <div
                onClick={onClose}
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
                {/* Modal panel — stop propagation so clicking inside doesn't close */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="animate-modal-enter"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.75rem',
                        width: '100%',
                        maxWidth: '440px',
                        padding: '1.5rem',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                        margin: 'auto', // Helps with flex centering in scrollable containers
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.25rem',
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                            }}
                        >
                            {isEdit ? 'Edit User' : 'Create User'}
                        </h2>
                        <button
                            id="user-form-close"
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {error && (
                        <div
                            style={{
                                padding: '0.75rem',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '0.5rem',
                                color: 'var(--color-danger)',
                                fontSize: '0.875rem',
                                marginBottom: '1rem',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                        }}
                    >
                        {/* Username — read-only on edit */}
                        <div>
                            <label
                                htmlFor="user-form-username"
                                style={labelStyle}
                            >
                                Username
                            </label>
                            <input
                                id="user-form-username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isEdit || isLoading}
                                style={{
                                    ...inputStyle,
                                    opacity: isEdit ? 0.6 : 1,
                                }}
                                placeholder="e.g. john_doe"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="user-form-email" style={labelStyle}>
                                Email
                            </label>
                            <input
                                id="user-form-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                style={inputStyle}
                                placeholder="user@example.com"
                            />
                        </div>

                        {/* Password — create only */}
                        {!isEdit && (
                            <div>
                                <label
                                    htmlFor="user-form-password"
                                    style={labelStyle}
                                >
                                    Password
                                </label>
                                <input
                                    id="user-form-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    disabled={isLoading}
                                    style={inputStyle}
                                    placeholder="Min 8 characters"
                                />
                            </div>
                        )}

                        {/* Checkboxes */}
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                <input
                                    id="user-form-is-admin"
                                    type="checkbox"
                                    checked={isAdmin}
                                    onChange={(e) =>
                                        setIsAdmin(e.target.checked)
                                    }
                                    disabled={isLoading}
                                    style={{
                                        accentColor: '#06b6d4',
                                        width: '16px',
                                        height: '16px',
                                    }}
                                />
                                Admin
                            </label>
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                <input
                                    id="user-form-is-active"
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) =>
                                        setIsActive(e.target.checked)
                                    }
                                    disabled={isLoading}
                                    style={{
                                        accentColor: '#06b6d4',
                                        width: '16px',
                                        height: '16px',
                                    }}
                                />
                                Active
                            </label>
                        </div>

                        {/* Actions */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.75rem',
                                marginTop: '0.5rem',
                            }}
                        >
                            <button
                                type="button"
                                id="user-form-cancel"
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: '0.625rem',
                                    background: 'transparent',
                                    border: '1px solid var(--btn-border)',
                                    color: 'var(--text-secondary)',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                id="user-form-submit"
                                type="submit"
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    padding: '0.625rem',
                                    background: '#06b6d4',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: isLoading
                                        ? 'not-allowed'
                                        : 'pointer',
                                    fontSize: '0.875rem',
                                    opacity: isLoading ? 0.7 : 1,
                                    transition: 'all 0.2s',
                                }}
                                className="hover:bg-cyan-600 active:scale-95"
                            >
                                {isLoading ? (
                                    <Loader2
                                        size={14}
                                        className="animate-spin"
                                    />
                                ) : isEdit ? (
                                    <Save size={14} />
                                ) : (
                                    <UserPlus size={14} />
                                )}
                                {isEdit ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
}
