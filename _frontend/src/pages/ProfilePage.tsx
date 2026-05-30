import { useAuth } from '@/hooks/useAuth';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';
import { UserCircle, Shield, Mail, Calendar, Hash, CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/utils/formatting';

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-(--text-primary)">Account Settings</h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          Manage your personal information and security preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Quick Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-brand-500/10 ring-4 ring-brand-500/5">
                <UserCircle size={56} className="text-brand-500" />
                <div className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-(--bg-card) ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </div>
              
              <h2 className="text-xl font-bold text-(--text-primary)">{user.username}</h2>
              <p className="text-sm font-medium text-(--text-secondary)">{user.email}</p>
              
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {user.is_admin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-500 border border-brand-500/20">
                    <Shield size={10} />
                    Administrator
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                  user.is_active 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                }`}>
                  {user.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {user.is_active ? 'Verified' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-(--border-color) pt-6">
              <div className="flex items-center gap-3 text-sm text-(--text-secondary)">
                <Calendar size={16} className="shrink-0" />
                <span>Joined {formatDateTime(user.created_at)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-(--text-secondary)">
                <Hash size={16} className="shrink-0" />
                <span className="font-mono">ID: #{user.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detailed Tabs/Forms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-sm overflow-hidden">
            <div className="border-b border-(--border-color) bg-(--bg-main)/50 px-6 py-4">
              <h3 className="text-sm font-bold text-(--text-primary)">Authentication & Security</h3>
            </div>
            <div className="p-6">
              <ChangePasswordForm />
            </div>
          </div>
          
          <div className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-(--text-primary)">Associated Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-(--border-color) bg-(--bg-main)/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-(--text-secondary)">Email Address</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-(--text-primary)">
                  <Mail size={14} className="text-brand-500" />
                  {user.email}
                </div>
              </div>
              <div className="rounded-xl border border-(--border-color) bg-(--bg-main)/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-(--text-secondary)">System Access</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-(--text-primary)">
                  <Shield size={14} className="text-brand-500" />
                  {user.is_admin ? 'Full Administrative' : 'Standard User'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

