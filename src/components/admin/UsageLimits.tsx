import { Activity, AlertTriangle, TrendingUp, Edit2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { apiFetch } from '../../utils/api';
import { User } from '../../store/authStore';
import { cn } from '../../utils/cn';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const darkTooltipStyle = {
  backgroundColor: '#161616',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e5e7eb',
  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
};

function EditLimitModal({ user, onClose, onSave }: {
  user: User; onClose: () => void; onSave: (id: string, limit: number) => void;
}) {
  const [value, setValue] = useState(String(user.usageLimit));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Edit Usage Limit</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-[#6b7280] mb-4">
          Monthly request limit for <strong className="text-gray-800 dark:text-white">{user.name}</strong>.
          Use <code className="bg-gray-100 dark:bg-[#1a1a1a] px-1 rounded text-xs">-1</code> for unlimited.
        </p>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-[#6b7280] border border-gray-200 dark:border-[#2a2a2a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition">
            Cancel
          </button>
          <button
            onClick={() => { onSave(user.id, parseInt(value) || -1); onClose(); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#b61615] hover:bg-[#9c1110] text-white text-sm font-medium rounded-lg transition"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', accent ? 'bg-[#b61615]/10' : 'bg-gray-100 dark:bg-[#1a1a1a]')}>
        <Icon className={cn('w-4 h-4', accent ? 'text-[#b61615]' : 'text-gray-500 dark:text-[#6b7280]')} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-sm text-gray-400 dark:text-[#4b5563] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-300 dark:text-[#374151] mt-1">{sub}</p>}
    </div>
  );
}

export default function UsageLimits() {
  const { users, updateUser } = useAppStore();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [monthly, setMonthly] = useState<{ month: string; requests: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch({ action: 'stats.get' });
        const data = await res.json();
        if (data.stats?.monthly) setMonthly(data.stats.monthly);
      } catch { /* apiFetch surfaces a toast on failure */ }
    })();
  }, []);

  const totalRequests = users.reduce((a, u) => a + u.usageCount, 0);
  const overLimitUsers = users.filter((u) => u.usageLimit > 0 && u.usageCount / u.usageLimit > 0.9);
  const avgPerUser = Math.round(totalRequests / Math.max(users.filter((u) => u.isActive).length, 1));

  const handleSaveLimit = async (id: string, limit: number) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    // Keep usageLimit and dailyRequestLimit in sync so the edited value is the one
    // the backend actually enforces.
    const updated = { ...user, usageLimit: limit, dailyRequestLimit: limit };
    updateUser(updated); // Optimistic UI update

    try {
      await apiFetch({ action: 'users.save', user: updated });
    } catch (e) {
      console.error('Failed to save usage limit', e);
      updateUser(user); // Revert
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center gap-3 mb-0.5">
          <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-[#9ca3af]" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Usage & Limits</h1>
        </div>
        <p className="text-xs text-gray-400 dark:text-[#4b5563] ml-10">Monitor usage and manage request quotas</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total requests" value={totalRequests.toLocaleString()} icon={TrendingUp} />
          <StatCard label="Near limit (>90%)" value={String(overLimitUsers.length)} icon={AlertTriangle} accent={overLimitUsers.length > 0} />
          <StatCard label="Avg per user" value={String(avgPerUser)} sub="requests" icon={Activity} />
        </div>

        {/* Alerts */}
        {overLimitUsers.length > 0 && (
          <div className="p-4 rounded-xl bg-[#b61615]/5 border border-[#b61615]/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#b61615]" />
              <p className="text-sm font-semibold text-[#b61615]">Usage Alerts</p>
            </div>
            {overLimitUsers.map((u) => (
              <p key={u.id} className="text-xs text-[#b61615]/80 ml-6 mt-1">
                {u.name} is at {Math.round((u.usageCount / u.usageLimit) * 100)}% of their monthly limit
              </p>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-[#6b7280] uppercase tracking-wider mb-4">Monthly Requests (last 6 months)</h3>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={darkTooltipStyle} />
                <Bar dataKey="requests" fill="#b61615" radius={[4, 4, 0, 0]} barSize={28} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center">
              <p className="text-xs text-gray-400 dark:text-[#374151]">No request history yet.</p>
            </div>
          )}
        </div>

        {/* Per-user table */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-[#1a1a1a]">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-[#6b7280] uppercase tracking-wider">Per-User Quota</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#111111]/60 border-b border-gray-100 dark:border-[#1a1a1a]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider hidden sm:table-cell">Dept</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">Usage</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider hidden md:table-cell">Limit</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
              {users.map((user) => {
                const pct = user.usageLimit > 0 ? Math.min((user.usageCount / user.usageLimit) * 100, 100) : -1;
                const isHigh = pct > 80 && pct !== -1;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#161616] transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          user.isActive
                            ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af]'
                            : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 dark:text-[#374151]'
                        )}>
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{user.name}</p>
                          {!user.isActive && <span className="text-xs text-gray-400 dark:text-[#374151]">Disabled</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-[#6b7280] hidden sm:table-cell">{user.department}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: pct === -1 ? '25%' : `${pct}%`,
                              backgroundColor: isHigh ? '#b61615' : '#374151',
                            }}
                          />
                        </div>
                        <span className={cn('text-sm font-medium', isHigh ? 'text-[#b61615]' : 'text-gray-600 dark:text-[#9ca3af]')}>
                          {user.usageCount}{pct !== -1 ? ` (${Math.round(pct)}%)` : ''}
                        </span>
                        {isHigh && <AlertTriangle className="w-3.5 h-3.5 text-[#b61615] flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-[#4b5563] hidden md:table-cell">
                      {user.usageLimit === -1 ? '∞ unlimited' : `${user.usageLimit} / mo`}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 dark:text-[#6b7280] border border-gray-200 dark:border-[#2a2a2a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] hover:text-gray-800 dark:hover:text-white transition"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <EditLimitModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveLimit} />
      )}
    </div>
  );
}
