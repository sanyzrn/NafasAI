import { useEffect, useState } from 'react';
import { Plus, Search, MoreHorizontal, Edit2, UserX, CheckCircle2, XCircle, Users, ChevronDown, UserCheck, Trash2, Clock, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { User, UserRole, Permission, TimeRestriction } from '../../store/authStore';
import { cn } from '../../utils/cn';

const ALL_PERMISSIONS: { id: Permission; label: string; category: string }[] = [
  { id: 'chat',               label: 'AI Chat',         category: 'Tools' },
  { id: 'research',           label: 'Research',        category: 'Tools' },
  { id: 'code_assistant',     label: 'Code Assistant',  category: 'Tools' },
  { id: 'summarization',      label: 'Summarization',   category: 'Tools' },
  { id: 'admin_panel',        label: 'Admin Panel',     category: 'Admin' },
  { id: 'user_management',    label: 'User Mgmt',       category: 'Admin' },
  { id: 'system_settings',    label: 'System Settings', category: 'Admin' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={cn(
        'w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer flex-shrink-0',
        checked ? 'bg-[#b61615] border-[#b61615]' : 'border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d]'
      )}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

const DEFAULT_TIME_RESTRICTION: TimeRestriction = {
  enabled: false,
  startHour: 8,
  endHour: 20,
  days: [1, 2, 3, 4, 5],
};

type ModalForm = Partial<User> & { password?: string };

function UserModal({ user, onClose, onSave }: {
  user: Partial<User> | null;
  onClose: () => void;
  onSave: (u: User, password?: string) => void;
}) {
  const isNew = !user?.id;
  const roleDefaults = useAppStore((s) => s.roles);
  const [form, setForm] = useState<ModalForm>(user ?? {
    name: '', email: '', role: 'employee', department: '', permissions: ['chat'],
    isActive: true,
    usageLimit: 200, usageCount: 0,
    dailyTokenLimit: 80000, tokensUsed: 0,
    dailyRequestLimit: 200, requestsUsed: 0,
    dailyCostLimit: 2.00, costUsed: 0,
    timeRestriction: { ...DEFAULT_TIME_RESTRICTION },
    createdAt: new Date().toISOString().split('T')[0],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const tr = form.timeRestriction ?? DEFAULT_TIME_RESTRICTION;

  const togglePerm = (perm: Permission) => {
    const perms = form.permissions ?? [];
    setForm((f) => ({
      ...f,
      permissions: perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm],
    }));
  };

  const toggleDay = (day: number) => {
    const days = tr.days ?? [];
    setForm((f) => ({
      ...f,
      timeRestriction: {
        ...(f.timeRestriction ?? DEFAULT_TIME_RESTRICTION),
        days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
      },
    }));
  };

  const setTR = (patch: Partial<TimeRestriction>) =>
    setForm((f) => ({ ...f, timeRestriction: { ...(f.timeRestriction ?? DEFAULT_TIME_RESTRICTION), ...patch } }));

  const handleSave = () => {
    setValidationError('');
    if (!form.name?.trim() || !form.email?.trim()) {
      setValidationError('Name and email are required.');
      return;
    }
    if (isNew && !form.password?.trim()) {
      setValidationError('Password is required for new users.');
      return;
    }
    const { password, ...rest } = form;
    onSave({
      id: rest.id ?? '',
      name: rest.name!,
      email: rest.email!,
      role: rest.role ?? 'employee',
      department: rest.department ?? '',
      permissions: rest.permissions ?? ['chat'],
      isActive: rest.isActive ?? true,
      usageLimit: rest.usageLimit ?? 200,
      usageCount: rest.usageCount ?? 0,
      dailyTokenLimit: rest.dailyTokenLimit ?? 80000,
      tokensUsed: rest.tokensUsed ?? 0,
      dailyRequestLimit: rest.dailyRequestLimit ?? 200,
      requestsUsed: rest.requestsUsed ?? 0,
      dailyCostLimit: rest.dailyCostLimit ?? 2.00,
      costUsed: rest.costUsed ?? 0,
      timeRestriction: rest.timeRestriction ?? DEFAULT_TIME_RESTRICTION,
      createdAt: rest.createdAt ?? new Date().toISOString().split('T')[0],
      lastLogin: rest.lastLogin,
    }, password || undefined);
  };

  const toolPerms  = ALL_PERMISSIONS.filter((p) => p.category === 'Tools');
  const adminPerms = ALL_PERMISSIONS.filter((p) => p.category === 'Admin');

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-[#2a2a2a] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1a1a1a]">
          <h3 className="font-semibold text-gray-900 dark:text-white">{isNew ? 'Add User' : 'Edit User'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-1.5 uppercase tracking-wider">Name</label>
              <input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="jane@company.com" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-1.5 uppercase tracking-wider">
              Password {isNew ? <span className="text-[#b61615]">*</span> : <span className="text-gray-300 dark:text-[#374151] normal-case font-normal">(leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className={cn(inputCls, 'pr-10')}
                placeholder={isNew ? 'Set a secure password' : 'Enter new password to change'}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-1.5 uppercase tracking-wider">Role</label>
              <div className="relative">
                <select value={form.role} onChange={(e) => {
                  const role = e.target.value as UserRole;
                  setForm((f) => {
                    // For new users, prefill permissions from the role's defaults.
                    if (isNew && roleDefaults[role]) {
                      return { ...f, role, permissions: [...roleDefaults[role]] };
                    }
                    return { ...f, role };
                  });
                }} className={cn(inputCls, 'appearance-none')}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-1.5 uppercase tracking-wider">Department</label>
              <input value={form.department ?? ''} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={inputCls} placeholder="Engineering" />
            </div>
          </div>

          {/* Daily limits */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-2.5 uppercase tracking-wider">Daily Limits (−1 = unlimited)</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-[#4b5563] mb-1">Tokens</label>
                <input
                  type="number"
                  value={form.dailyTokenLimit ?? 80000}
                  onChange={(e) => setForm((f) => ({ ...f, dailyTokenLimit: parseInt(e.target.value) || -1 }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-[#4b5563] mb-1">Requests</label>
                <input
                  type="number"
                  value={form.dailyRequestLimit ?? 200}
                  onChange={(e) => setForm((f) => ({ ...f, dailyRequestLimit: parseInt(e.target.value) || -1, usageLimit: parseInt(e.target.value) || -1 }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-[#4b5563] mb-1">Cost ($)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.dailyCostLimit ?? 2.00}
                  onChange={(e) => setForm((f) => ({ ...f, dailyCostLimit: parseFloat(e.target.value) || -1 }))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-2 uppercase tracking-wider">Tool Permissions</label>
            <div className="grid grid-cols-2 gap-1.5">
              {toolPerms.map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer py-1">
                  <Checkbox checked={!!form.permissions?.includes(id)} onChange={() => togglePerm(id)} />
                  <span className="text-xs text-gray-700 dark:text-[#9ca3af]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-2 uppercase tracking-wider">Admin Permissions</label>
            <div className="grid grid-cols-2 gap-1.5">
              {adminPerms.map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer py-1">
                  <Checkbox checked={!!form.permissions?.includes(id)} onChange={() => togglePerm(id)} />
                  <span className="text-xs text-gray-700 dark:text-[#9ca3af]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time restriction */}
          <div className="rounded-xl border border-gray-100 dark:border-[#2a2a2a] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-[#6b7280]" />
                <span className="text-xs font-semibold text-gray-600 dark:text-[#9ca3af] uppercase tracking-wider">Access Hours</span>
              </div>
              <div
                onClick={() => setTR({ enabled: !tr.enabled })}
                className={cn(
                  'relative cursor-pointer flex-shrink-0 rounded-full transition-all',
                  tr.enabled ? 'bg-[#b61615]' : 'bg-gray-200 dark:bg-[#2a2a2a]'
                )}
                style={{ width: 36, height: 20 }}
              >
                <div
                  className="absolute top-0.5 rounded-full bg-white shadow-sm transition-all"
                  style={{ width: 16, height: 16, left: tr.enabled ? 16 : 2, top: 2 }}
                />
              </div>
            </div>
            {tr.enabled && (
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-400 dark:text-[#4b5563] mb-1">Start Hour</label>
                    <input
                      type="number"
                      min={0} max={23}
                      value={tr.startHour}
                      onChange={(e) => setTR({ startHour: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                  <span className="text-gray-400 dark:text-[#4b5563] mt-4">–</span>
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-400 dark:text-[#4b5563] mb-1">End Hour</label>
                    <input
                      type="number"
                      min={0} max={23}
                      value={tr.endHour}
                      onChange={(e) => setTR({ endHour: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 dark:text-[#4b5563] mb-2">Allowed Days</label>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={cn(
                          'flex-1 py-1 rounded-md text-[10px] font-medium transition',
                          tr.days.includes(idx)
                            ? 'bg-[#b61615] text-white'
                            : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 dark:text-[#4b5563] hover:bg-gray-200 dark:hover:bg-[#222]'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={cn(
                'relative cursor-pointer flex-shrink-0 rounded-full transition-all',
                form.isActive ? 'bg-[#b61615]' : 'bg-gray-200 dark:bg-[#2a2a2a]'
              )}
              style={{ width: 40, height: 22 }}
            >
              <div
                className="absolute top-0.5 rounded-full bg-white shadow-sm transition-all"
                style={{ width: 18, height: 18, left: form.isActive ? 18 : 2, top: 2 }}
              />
            </div>
            <span className="text-sm text-gray-700 dark:text-[#9ca3af]">Account active</span>
          </div>

          {validationError && (
            <p className="text-xs text-[#b61615]">{validationError}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-[#1a1a1a]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-[#6b7280] border border-gray-200 dark:border-[#2a2a2a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-[#b61615] hover:bg-[#9c1110] rounded-lg transition">
            {isNew ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-[#2a2a2a] shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Delete User</h3>
        <p className="text-sm text-gray-500 dark:text-[#6b7280] mb-5">
          Remove <span className="font-medium text-gray-800 dark:text-gray-200">{name}</span>? This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-[#6b7280] border border-gray-200 dark:border-[#2a2a2a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-[#b61615] hover:bg-[#9c1110] rounded-lg transition">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { users, updateUser, addUser, deleteUser, loadUsers } = useAppStore();
  const { token } = useAuthStore();
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [editingUser, setEditingUser] = useState<Partial<User> | null | undefined>(undefined);
  const [menuOpen, setMenuOpen]       = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [saveError, setSaveError]     = useState('');

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleSave = async (user: User, password?: string) => {
    setSaveError('');
    try {
      const res = await fetch('api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'users.save', user: { ...user, password } }),
      });
      const data = await res.json();
      if (data.success) {
        const saved: User = data.user ?? user;
        if (users.find((u) => u.id === user.id)) updateUser(saved);
        else addUser(saved);
        setEditingUser(undefined);
      } else {
        setSaveError(data.error ?? 'Failed to save user.');
      }
    } catch {
      setSaveError('Connection failed. Please try again.');
    }
  };

  const handleDelete = (user: User) => {
    setMenuOpen(null);
    setDeletingUser(user);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch('api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'users.delete', id: deletingUser.id }),
      });
      const data = await res.json();
      if (data.success) deleteUser(deletingUser.id);
    } catch {
      // Silently ignore — user record stays in local state if server unreachable
    }
    setDeletingUser(null);
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase();

  const ROLE_LABELS: Record<string, string> = { admin: 'Admin', manager: 'Manager', employee: 'Employee' };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-[#9ca3af]" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-[#4b5563] ml-10">
              {users.filter((u) => u.isActive).length} active · {users.filter((u) => !u.isActive).length} disabled
            </p>
          </div>
          <button
            onClick={() => { setSaveError(''); setEditingUser(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#b61615] hover:bg-[#9c1110] text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-5">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#4b5563]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#374151] focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#111111] border border-gray-200 dark:border-[#1f1f1f] rounded-lg p-1">
            {['all', 'admin', 'manager', 'employee'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition',
                  roleFilter === r
                    ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-[#6b7280] hover:text-gray-800 dark:hover:text-white'
                )}
              >
                {r === 'all' ? 'All' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {saveError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
            <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
          </div>
        )}

        {/* Table */}
        <div className="border border-gray-100 dark:border-[#1f1f1f] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#111111] border-b border-gray-100 dark:border-[#1f1f1f]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider hidden sm:table-cell">Dept</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider hidden md:table-cell">Daily Usage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider hidden lg:table-cell">Access</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-gray-400 dark:text-[#374151]">
                    {users.length === 0 ? 'No users loaded yet.' : 'No users match your search.'}
                  </td>
                </tr>
              )}
              {filtered.map((user) => {
                const tokenPct = user.dailyTokenLimit > 0 ? Math.round((user.tokensUsed / user.dailyTokenLimit) * 100) : null;
                const isHigh   = (tokenPct ?? 0) > 80;
                const hasTimeRestriction = user.timeRestriction?.enabled;
                return (
                  <tr key={user.id} className="bg-white dark:bg-[#0d0d0d] hover:bg-gray-50 dark:hover:bg-[#111111] transition group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center text-gray-500 dark:text-[#9ca3af] text-xs font-semibold flex-shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{user.name}</p>
                          <p className="text-xs text-gray-400 dark:text-[#4b5563]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-[#6b7280] hidden sm:table-cell">{user.department}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-md font-medium border',
                        user.role === 'admin'
                          ? 'text-[#b61615] bg-[#b61615]/10 border-[#b61615]/20'
                          : user.role === 'manager'
                          ? 'text-gray-700 dark:text-[#d1d5db] bg-gray-100 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a]'
                          : 'text-gray-500 dark:text-[#6b7280] bg-gray-50 dark:bg-[#111111] border-gray-100 dark:border-[#1f1f1f]'
                      )}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {tokenPct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${tokenPct}%`, backgroundColor: isHigh ? '#b61615' : '#374151' }}
                            />
                          </div>
                          <span className={cn('text-xs', isHigh ? 'text-[#b61615]' : 'text-gray-400 dark:text-[#4b5563]')}>{tokenPct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-[#374151]">∞ unlimited</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {hasTimeRestriction ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                          <Clock className="w-3 h-3" />
                          {user.timeRestriction.startHour}:00–{user.timeRestriction.endHour}:00
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-[#374151]">Always</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {user.isActive ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-[#374151]">
                          <XCircle className="w-3.5 h-3.5" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="relative flex justify-end">
                        <button
                          onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg text-gray-300 dark:text-[#374151] hover:text-gray-600 dark:hover:text-[#9ca3af] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {menuOpen === user.id && (
                          <div className="absolute right-0 top-9 z-50 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] rounded-xl shadow-xl py-1 min-w-[150px]">
                            <button
                              onClick={() => { setSaveError(''); setEditingUser(user); setMenuOpen(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-[#d1d5db] hover:bg-gray-50 dark:hover:bg-[#222] transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            {user.isActive ? (
                              <button
                                onClick={() => { handleSave({ ...user, isActive: false }); setMenuOpen(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                              >
                                <UserX className="w-3.5 h-3.5" /> Disable
                              </button>
                            ) : (
                              <button
                                onClick={() => { handleSave({ ...user, isActive: true }); setMenuOpen(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Enable
                              </button>
                            )}
                            <div className="my-1 border-t border-gray-100 dark:border-[#2a2a2a]" />
                            <button
                              onClick={() => handleDelete(user)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#b61615] hover:bg-[#b61615]/10 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser !== undefined && (
        <UserModal user={editingUser} onClose={() => setEditingUser(undefined)} onSave={handleSave} />
      )}
      {deletingUser && (
        <DeleteConfirm name={deletingUser.name} onClose={() => setDeletingUser(null)} onConfirm={confirmDelete} />
      )}
    </div>
  );
}
