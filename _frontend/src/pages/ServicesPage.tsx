import { useState } from 'react';
import { useServices } from '@/hooks/useServices';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/context/ToastContext';
import {
  Plus,
  ChevronDown,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldX,
  Loader2,
  LayoutGrid,
  Search,
  Globe,
  Download,
  AlertTriangle,
} from 'lucide-react';
import type { PermissionDetail, Service } from '@/api/types';
import { Portal } from '@/components/common/Portal';
import { Pagination } from '@/components/common/Pagination';

/* ─── Delete Confirmation Modal ──────────────────────────────────────────── */

function DeleteModal({
  serviceName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  serviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <Portal>
      <div
        onClick={onCancel}
        className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-modal-enter w-full max-w-md rounded-xl border border-(--border-color) bg-(--bg-card) p-6 shadow-2xl"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-(--text-primary)">
              Delete Service
            </h3>
          </div>
          <p className="mb-6 text-sm text-(--text-secondary) leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-(--text-primary)">
              {serviceName}
            </span>
            ? This will also revoke all user permissions associated with it. This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="rounded-lg border border-(--border-color) bg-(--bg-main) px-4 py-2 text-sm font-medium text-(--text-primary) transition hover:bg-(--border-color)"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 active:scale-95 disabled:opacity-60"
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ─── User Access Panel (Expandable Row Content) ─────────────────────────── */

function UserAccessPanel({
  serviceId,
  servicePermissions,
  allUsers,
  onAssign,
  onRevoke,
}: {
  serviceId: number;
  servicePermissions: PermissionDetail[];
  allUsers: { id: number; username: string; email: string; is_admin: boolean }[];
  onAssign: (userId: number) => Promise<void>;
  onRevoke: (permId: number) => Promise<void>;
}) {
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null);

  const permByUserId = new Map<number, PermissionDetail>();
  for (const p of servicePermissions) {
    permByUserId.set(p.user_id, p);
  }

  const handleToggle = async (userId: number) => {
    setLoadingUserId(userId);
    try {
      const existing = permByUserId.get(userId);
      if (existing) {
        await onRevoke(existing.id);
      } else {
        await onAssign(userId);
      }
    } finally {
      setLoadingUserId(null);
    }
  };

  if (allUsers.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-(--text-secondary)">
        No users available.
      </div>
    );
  }

  return (
    <div className="border-t border-(--border-color) bg-(--bg-main)/50 px-6 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Shield size={14} className="text-cyan-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)">
          User Access Control
        </span>
        <span className="ml-auto text-xs text-(--text-secondary)">
          {servicePermissions.length} of {allUsers.filter(u => !u.is_admin).length} users have access
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {allUsers
          .filter((u) => !u.is_admin)
          .map((u) => {
            const hasAccess = permByUserId.has(u.id);
            const isLoading = loadingUserId === u.id;

            return (
              <button
                key={u.id}
                onClick={() => handleToggle(u.id)}
                disabled={isLoading}
                className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                  hasAccess
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                    : 'border-(--border-color) bg-(--bg-card) hover:border-(--border-color) hover:bg-(--bg-main)'
                } ${isLoading ? 'opacity-60' : ''}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                    hasAccess
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-(--bg-main) text-(--text-secondary) group-hover:text-(--text-primary)'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : hasAccess ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <ShieldX size={14} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${
                      hasAccess
                        ? 'text-emerald-400'
                        : 'text-(--text-primary)'
                    }`}
                  >
                    @{u.username}
                  </p>
                  <p className="truncate text-xs text-(--text-secondary)">
                    {u.email}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}

/* ─── Add Service Form (Modal-style in page) ────────────────────────────── */

function AddServiceForm({
  onSubmit,
  onClose,
  isSubmitting,
}: {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [sName, setSName] = useState('');
  const [sHost, setSHost] = useState('');
  const [sPort, setSPort] = useState('');
  const [sProto, setSProto] = useState('tcp');
  const [sPersistent, setSPersistent] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit({
      name: sName,
      host: sHost,
      port: parseInt(sPort, 10),
      protocol: sProto,
      is_persistent: sPersistent,
    });
  };

  return (
    <div className="animate-fade-in mb-6 rounded-xl border border-(--border-color) bg-(--bg-card) p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-(--text-primary)">
          <Plus size={18} className="text-cyan-500" />
          New Service Definition
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <input
          placeholder="Service Name (e.g. database_prod)"
          value={sName}
          onChange={(e) => setSName(e.target.value)}
          required
          className="rounded-lg border border-(--border-color) bg-(--bg-main) px-3 py-2.5 text-sm text-(--text-primary) outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
        />
        <input
          placeholder="Internal Host IP (e.g. 192.168.1.50)"
          value={sHost}
          onChange={(e) => setSHost(e.target.value)}
          required
          className="rounded-lg border border-(--border-color) bg-(--bg-main) px-3 py-2.5 text-sm text-(--text-primary) outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
        />
        <input
          placeholder="Service Port (e.g. 8000)"
          type="number"
          value={sPort}
          onChange={(e) => setSPort(e.target.value)}
          required
          className="rounded-lg border border-(--border-color) bg-(--bg-main) px-3 py-2.5 text-sm text-(--text-primary) outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
        />
        <select
          value={sProto}
          onChange={(e) => setSProto(e.target.value)}
          className="rounded-lg border border-(--border-color) bg-(--bg-main) px-3 py-2.5 text-sm text-(--text-primary) outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
        >
          <option value="tcp">TCP (Generic)</option>
          <option value="http">HTTP / Web</option>
          <option value="ssh">SSH Shell</option>
          <option value="rdp">Windows RDP</option>
          <option value="mysql">MySQL Database</option>
          <option value="postgres">PostgreSQL</option>
        </select>

        <label className="col-span-full flex items-center gap-2.5 text-sm text-(--text-primary) cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sPersistent}
            onChange={(e) => setSPersistent(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded accent-cyan-500"
          />
          Persistent Tunnel (handle consecutive app connections over one VPN handshake)
        </label>

        <div className="col-span-full flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-(--border-color) bg-(--bg-main) px-4 py-2 text-sm font-medium text-(--text-primary) transition hover:bg-(--bg-card)"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-cyan-600 active:scale-95 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isSubmitting ? 'Creating...' : 'Create Service'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export function ServicesPage() {
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const limit = 20;

  const {
    services,
    total,
    isLoading,
    permissions,
    createService,
    deleteService,
    assignPermission,
    revokePermission,
    downloadConfig,
    fetchServicePermissions,
  } = useServices({ skip, limit, name: search });
  const { users } = useUsers();
  const { showToast } = useToast();

  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handleCreate = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createService(data);
      showToast('Service created successfully');
      setShowAddForm(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to create service', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteService(deleteTarget.id);
      showToast(`Service "${deleteTarget.name}" deleted successfully`);
      setDeleteTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete service', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssign = async (svcId: number, userId: number) => {
    try {
      await assignPermission({ service_id: svcId, user_id: userId });
      showToast('User authorized for this service');
    } catch (err: any) {
      showToast(err.message || 'Failed to assign permission', 'error');
    }
  };

  const handleRevoke = async (permId: number, svcId: number) => {
    try {
      await revokePermission(permId, svcId);
      showToast('Access revoked successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke permission', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 shadow-sm">
            <LayoutGrid size={24} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-(--text-primary)">
              Services & Access
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Define network services and manage granular user permissions ({total} total)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary)" />
            <input
              type="search"
              placeholder="Filter services..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
              className="w-48 sm:w-64 rounded-lg border border-(--btn-border) bg-(--bg-card) py-2 pl-9 pr-4 text-xs font-semibold text-(--text-primary) transition-all focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-600 active:scale-95"
          >
            <Plus size={16} className={showAddForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
            {showAddForm ? 'Close' : 'Add Service'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddServiceForm
          onClose={() => setShowAddForm(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Services List/Grid */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading && services.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-(--border-color) bg-(--bg-card)">
            <Loader2 size={32} className="animate-spin text-cyan-500/20" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-(--border-color) bg-(--table-hover) py-20 text-center">
            <LayoutGrid size={48} className="mb-4 text-(--text-secondary) opacity-10" />
            <p className="text-lg font-bold text-(--text-primary)">No services found</p>
            <p className="mt-1 text-sm text-(--text-secondary)">Try adjusting your filters or add a new definition.</p>
          </div>
        ) : (
          <>
            {services.map((s) => {
              const isExpanded = expandedServiceId === s.id;
              const svcPerms = permissions[s.id] || [];

              return (
                <div
                  key={s.id}
                  className="overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-card) shadow-sm transition-all hover:border-(--btn-border)"
                >
                  <div
                    onClick={() => {
                      const next = isExpanded ? null : s.id;
                      setExpandedServiceId(next);
                      if (next && !permissions[s.id]) fetchServicePermissions(s.id);
                    }}
                    className={`flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-(--table-hover) ${isExpanded ? 'bg-(--table-hover)' : ''}`}
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isExpanded ? 'bg-cyan-500 text-white' : 'bg-(--bg-main) text-(--text-secondary)'}`}>
                        <Globe size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-(--text-primary)">{s.name}</h3>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                            {s.protocol}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-(--text-secondary)">{s.host}:{s.port}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); void downloadConfig(s.id, s.name); }}
                        className="flex h-8 w-8 items-center justify-center rounded border border-(--btn-border) bg-(--bg-main) text-(--text-secondary) hover:text-cyan-500 hover:border-cyan-500 transition-all"
                        title="Config"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                        className="flex h-8 w-8 items-center justify-center rounded border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronDown size={18} className={`text-(--text-secondary) transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <UserAccessPanel
                      serviceId={s.id}
                      servicePermissions={svcPerms}
                      allUsers={users}
                      onAssign={(uid) => handleAssign(s.id, uid)}
                      onRevoke={(pid) => handleRevoke(pid, s.id)}
                    />
                  )}
                </div>
              );
            })}

            <div className="mt-2">
              <Pagination
                currentPage={currentPage}
                totalPage={totalPages}
                onPageChange={(p) => setSkip((p - 1) * limit)}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          serviceName={deleteTarget.name}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
