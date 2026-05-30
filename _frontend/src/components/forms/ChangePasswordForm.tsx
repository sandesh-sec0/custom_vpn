/**
 * ChangePasswordForm — Change current user's password
 */

import { type FormEvent, useState } from 'react';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/api/client';
import type { ChangePasswordRequest } from '@/api/types';
import { parseError } from '@/utils/errors';

const inputStyle: React.CSSProperties = {
    padding: '0.5rem 2.25rem 0.5rem 0.75rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--btn-border)',
    borderRadius: '0.5rem',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
};

function PasswordField({
    id,
    label,
    value,
    onChange,
    show,
    onToggle,
    disabled,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    disabled?: boolean;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                style={{
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: '0.375rem',
                }}
            >
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    style={inputStyle}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                    }}
                >
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>
        </div>
    );
}

export function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!currentPassword) {
            setError('Current password is required');
            return;
        }
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        if (newPassword === currentPassword) {
            setError('New password must be different from current password');
            return;
        }

        setIsLoading(true);
        try {
            await apiClient.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            } satisfies ChangePasswordRequest);
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                maxWidth: '420px',
            }}
        >
            <h3
                style={{
                    margin: '0 0 1.25rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}
            >
                <KeyRound size={16} color="#06b6d4" />
                Change Password
            </h3>

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
            {success && (
                <div
                    style={{
                        padding: '0.75rem',
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '0.5rem',
                        color: 'var(--color-success)',
                        fontSize: '0.875rem',
                        marginBottom: '1rem',
                    }}
                >
                    ✓ Password changed successfully!
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
                <PasswordField
                    id="change-password-current"
                    label="Current Password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    show={showCurrent}
                    onToggle={() => setShowCurrent((v) => !v)}
                    disabled={isLoading}
                />
                <PasswordField
                    id="change-password-new"
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showNew}
                    onToggle={() => setShowNew((v) => !v)}
                    disabled={isLoading}
                />
                <div>
                    <label
                        htmlFor="change-password-confirm"
                        style={{
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            display: 'block',
                            marginBottom: '0.375rem',
                        }}
                    >
                        Confirm New Password
                    </label>
                    <input
                        id="change-password-confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        style={{ ...inputStyle, paddingRight: '0.75rem' }}
                    />
                </div>

                <button
                    id="change-password-submit"
                    type="submit"
                    disabled={isLoading}
                    style={{
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
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        opacity: isLoading ? 0.7 : 1,
                        marginTop: '0.25rem',
                        transition: 'all 0.2s',
                    }}
                    className="hover:bg-cyan-600 active:scale-95"
                >
                    {isLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <KeyRound size={14} />
                    )}
                    Update Password
                </button>
            </form>
        </div>
    );
}
