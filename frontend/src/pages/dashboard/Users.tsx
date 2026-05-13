import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Edit3, UserX, Shield,
  X, AlertTriangle, LayoutGrid, List, Filter,
} from 'lucide-react';
import { usersApi } from '../../api/client';
import { useToast } from '../../components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppUser {
  id: number;
  full_name: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  is_verified?: boolean;
  avatar?: string;
  phone?: string;
  created_at?: string;
}

type ViewMode = 'grid' | 'list';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  admin:         'bg-copper/20 text-copper border-copper/30',
  event_manager: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  client:        'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const ROLE_LABELS: Record<string, string> = {
  admin:         'Admin',
  event_manager: 'Manager',
  client:        'Client',
};

const INPUT_CLS = `px-3 py-2.5 border border-copper/20 rounded-xl
  focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/30
  text-sm bg-dark-input text-ivory-light placeholder-muted-text transition-colors`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${ROLE_STYLES[role] ?? ROLE_STYLES.client}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${active ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function Avatar({ user, size = 'md' }: { user: AppUser; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-14 h-14 text-2xl' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs';
  return user.avatar ? (
    <img src={user.avatar} alt={user.full_name} className={`${sz} rounded-full object-cover ring-2 ring-copper/30 shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-copper/20 flex items-center justify-center font-bold text-copper shrink-0`}>
      {user.full_name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatJoined(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { month: 'short', year: 'numeric' });
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { month: 'short', day: '2-digit', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { toast } = useToast();

  const [users,          setUsers]          = useState<AppUser[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [roleFilter,     setRoleFilter]     = useState('');
  const [activeFilter,   setActiveFilter]   = useState('');
  const [view,           setView]           = useState<ViewMode>('list');
  const [editUser,       setEditUser]       = useState<AppUser | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<AppUser | null>(null);
  const [editForm,       setEditForm]       = useState({ role: '', is_active: true });
  const [saving,         setSaving]         = useState(false);
  const [deactivating,   setDeactivating]   = useState(false);

  // ── Fetch users ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        per_page: 100,
        ...(roleFilter   && { role:      roleFilter }),
        ...(activeFilter && { is_active: activeFilter === 'active' }),
        ...(search       && { search }),
      };
      const res  = await usersApi.list(params);
      const data = res.data;
      const list: AppUser[] = Array.isArray(data)
        ? data
        : data?.users ?? data?.items ?? [];
      setUsers(list);
    } catch {
      setUsers([]);
      toast({ title: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [roleFilter, activeFilter, search]);

  useEffect(() => { fetchUsers(); }, [roleFilter, activeFilter]);

  // ── Save role/status edit ─────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await usersApi.adminUpdate(editUser.id, {
        role:      editForm.role,
        is_active: editForm.is_active,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? { ...u, role: editForm.role, is_active: editForm.is_active }
            : u
        )
      );
      setEditUser(null);
      toast({ title: '✅ User updated successfully' });
    } catch (err: any) {
      toast({
        title: 'Failed to update user',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate user ───────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    setDeactivating(true);
    try {
      await usersApi.deactivate(deactivateUser.id);
      setUsers((prev) =>
        prev.map((u) => u.id === deactivateUser.id ? { ...u, is_active: false } : u)
      );
      setDeactivateUser(null);
      toast({ title: `✅ ${deactivateUser.full_name} has been deactivated` });
    } catch (err: any) {
      toast({
        title: 'Failed to deactivate user',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setDeactivating(false);
    }
  };

  // ── Action buttons per user ───────────────────────────────────────────────
  const UserActions = ({ u }: { u: AppUser }) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => { setEditUser(u); setEditForm({ role: u.role, is_active: u.is_active }); }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-copper hover:bg-copper/10 transition-colors"
        title="Edit role / status"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
      {u.is_active && (
        <button
          onClick={() => setDeactivateUser(u)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Deactivate user"
        >
          <UserX className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  // ── Client-side search filter ─────────────────────────────────────────────
  const filtered = users.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term)
    );
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ivory-light flex items-center gap-2">
            <Users className="w-6 h-6 text-copper" /> Users
          </h1>
          <p className="text-sm text-muted-text mt-1">
            {loading ? 'Loading…' : `${filtered.length} user${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-2">
          {(['grid', 'list'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`p-2 rounded-lg border transition-colors ${
                view === v
                  ? 'border-copper text-copper bg-copper/10'
                  : 'border-copper/20 text-muted-text hover:border-copper/40'
              }`}
            >
              {v === 'grid'
                ? <LayoutGrid className="w-4 h-4" />
                : <List className="w-4 h-4" />
              }
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            placeholder="Name, email or username…"
            className={`${INPUT_CLS} w-full pl-9`}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={INPUT_CLS}>
          <option value="">All Roles</option>
          {['admin','event_manager','client'].map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
          ))}
        </select>
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={INPUT_CLS}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={fetchUsers}
          className="px-4 py-2.5 text-white text-sm rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light"
        >
          <Filter className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Grid view ─────────────────────────────────────────────────────── */}
      {view === 'grid' && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-dark-card rounded-2xl border border-copper/20 p-5 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-400/10 animate-pulse" />
                <div className="h-4 bg-gray-400/10 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-gray-400/10 rounded animate-pulse w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Users className="w-12 h-12 text-copper/30" />
            <p className="text-base font-medium text-ivory-light">No users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="bg-dark-card rounded-2xl border border-copper/20 p-5 hover:border-copper/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <Avatar user={u} size="lg" />
                  <UserActions u={u} />
                </div>
                <p className="font-semibold text-ivory-light text-sm">{u.full_name}</p>
                <p className="text-xs text-muted-text mt-0.5 mb-3 truncate">@{u.username}</p>
                <p className="text-xs text-muted-text mb-3 truncate">{u.email}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <RoleBadge role={u.role} />
                  <StatusBadge active={u.is_active} />
                </div>
                <p className="text-xs text-muted-text mt-3">
                  Joined {formatJoined(u.created_at)}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── List view ─────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="bg-dark-card rounded-2xl border border-copper/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-copper/15 bg-black/20">
                  {['User', 'Email', 'Username', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-muted-text whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-copper/8">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 bg-gray-400/10 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-muted-text">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-copper/8 hover:bg-copper/4 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar user={u} size="sm" />
                          <span className="text-ivory-light font-medium text-xs">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-text text-xs">{u.email}</td>
                      <td className="py-3 px-4 text-muted-text text-xs font-mono">@{u.username}</td>
                      <td className="py-3 px-4"><RoleBadge role={u.role} /></td>
                      <td className="py-3 px-4"><StatusBadge active={u.is_active} /></td>
                      <td className="py-3 px-4 text-muted-text text-xs whitespace-nowrap">{formatDate(u.created_at)}</td>
                      <td className="py-3 px-4"><UserActions u={u} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-dark-card rounded-2xl border border-copper/20 w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-ivory-light flex items-center gap-2">
                <Shield className="w-4 h-4 text-copper" /> Edit User
              </h3>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-ivory-light transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-dark-elevation border border-copper/15">
              <Avatar user={editUser} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ivory-light truncate">{editUser.full_name}</p>
                <p className="text-xs text-muted-text truncate">{editUser.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-text mb-1.5 block">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className={`w-full px-3 py-2.5 border border-copper/20 rounded-xl
                    focus:border-copper focus:outline-none text-sm bg-dark-elevation text-ivory-light`}
                >
                  <option value="admin">Admin</option>
                  <option value="event_manager">Event Manager</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-text mb-1.5 block">Account Status</label>
                <select
                  value={editForm.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.value === 'active' }))}
                  className={`w-full px-3 py-2.5 border border-copper/20 rounded-xl
                    focus:border-copper focus:outline-none text-sm bg-dark-elevation text-ivory-light`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 text-sm border border-copper/20 text-ivory-light rounded-xl hover:bg-copper/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 text-sm text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-60 transition-opacity bg-gradient-to-br from-copper to-copper-light"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate confirm ────────────────────────────────────────────── */}
      {deactivateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-dark-card rounded-2xl border border-copper/20 w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="font-bold text-ivory-light mb-2 text-lg">Deactivate User?</h3>
            <p className="text-sm text-muted-text mb-1">
              <span className="font-semibold text-ivory-light">{deactivateUser.full_name}</span>
            </p>
            <p className="text-sm text-muted-text mb-5">
              They will immediately lose access to the platform. You can re-activate them later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeactivateUser(null)}
                disabled={deactivating}
                className="flex-1 py-2.5 text-sm border border-copper/20 text-ivory-light rounded-xl hover:bg-copper/5 disabled:opacity-50 transition-colors"
              >
                Keep Active
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium disabled:opacity-60 transition-colors"
              >
                {deactivating ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}