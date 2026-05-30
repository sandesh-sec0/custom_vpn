import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { UsersTable } from '@/components/tables/UsersTable';
import { Users } from 'lucide-react';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const limit = 10;

  const { 
    users, 
    total,
    isLoading, 
    error, 
    refresh, 
    createUser, 
    updateUser, 
    deleteUser 
  } = useUsers(skip, limit, search);

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-7xl transition-all">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Users size={24} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-(--text-primary)">
              User Management
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Create, edit, and manage VPN user accounts ({total} total)
            </p>
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

      <UsersTable
        users={users}
        isLoading={isLoading}
        totalUsers={total}
        currentPage={currentPage}
        totalPages={totalPages}
        search={search}
        onSearchChange={(v) => { setSearch(v); setSkip(0); }}
        onPageChange={(page) => setSkip((page - 1) * limit)}
        onCreateUser={createUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
        onRefresh={refresh}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
