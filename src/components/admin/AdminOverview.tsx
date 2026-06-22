import { useEffect, useState } from 'react';
import { Users, MessageSquare, Activity, TrendingUp, Shield } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { apiFetch } from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  daily: { date: string; requests: number }[];
  monthly: { month: string; requests: number }[];
  tools: { name: string; value: number }[];
  totalConversations: number;
  totalMessages: number;
}

const darkTooltipStyle = {
  backgroundColor: '#161616',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e5e7eb',
  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
};

function StatCard({ label, value, icon: Icon }: {
  label: string; value: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center mb-4">
        <Icon className="w-4 h-4 text-gray-600 dark:text-[#9ca3af]" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-sm text-gray-400 dark:text-[#4b5563] mt-0.5">{label}</p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
        <Activity className="w-4 h-4 text-gray-300 dark:text-[#374151]" />
      </div>
      <p className="text-xs text-gray-400 dark:text-[#374151] text-center">{label}</p>
    </div>
  );
}

export default function AdminOverview() {
  const { users, conversations, selectedModelId, loadUsers } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    loadUsers();
    (async () => {
      try {
        const res = await apiFetch({ action: 'stats.get' });
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      } catch { /* apiFetch surfaces a toast on failure */ }
    })();
  }, []);

  const activeUsers   = users.filter((u) => u.isActive).length;
  const totalRequests = users.reduce((acc, u) => acc + (u.usageCount ?? 0), 0);
  const totalConvs    = stats?.totalConversations ?? conversations.length;
  const totalMessages = stats?.totalMessages ?? 0;

  const dailyData = (stats?.daily ?? []).map((d) => ({
    label: d.date.slice(5), // MM-DD
    requests: d.requests,
  }));

  const toolUsage = (stats?.tools ?? []).map((t) => ({ name: t.name, value: t.value })).slice(0, 6);

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-[#b61615] flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-[#4b5563] ml-10">Platform usage summary</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#111111] border border-gray-200 dark:border-[#1f1f1f]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-600 dark:text-[#9ca3af]">{selectedModelId || 'No model selected'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Active Users"    value={String(activeUsers)}            icon={Users}        />
          <StatCard label="Total Requests"  value={totalRequests.toLocaleString()} icon={MessageSquare} />
          <StatCard label="Conversations"   value={String(totalConvs)}             icon={Activity}     />
          <StatCard label="Messages"        value={totalMessages.toLocaleString()} icon={TrendingUp}   />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-[#6b7280] uppercase tracking-wider mb-4">Daily Requests (last 14 days)</h3>
            {dailyData.some((d) => d.requests > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={darkTooltipStyle} formatter={(v) => [v, 'Requests']} />
                  <Bar dataKey="requests" fill="#b61615" radius={[3, 3, 0, 0]} barSize={14} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="Usage data will populate as the platform is used." />
            )}
          </div>

          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-[#6b7280] uppercase tracking-wider mb-4">Tool Usage</h3>
            {toolUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={toolUsage} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={darkTooltipStyle} formatter={(v) => [v, 'Sessions']} />
                  <Bar dataKey="value" fill="#b61615" radius={[0, 4, 4, 0]} barSize={10} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="Tool usage will appear after first conversations." />
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent conversations */}
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-[#6b7280] uppercase tracking-wider mb-4">Recent Conversations</h3>
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-[#374151] text-center py-8">No conversations yet.</p>
            ) : (
              <div className="space-y-3">
                {conversations.slice(0, 5).map((conv) => (
                  <div key={conv.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center text-gray-400 dark:text-[#6b7280] text-xs flex-shrink-0">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate font-medium">{conv.title}</p>
                      <p className="text-xs text-gray-400 dark:text-[#374151] mt-0.5">{conv.tool} · {conv.messages.length} messages</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage per user */}
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-[#6b7280] uppercase tracking-wider mb-4">Usage per User</h3>
            {users.filter(u => u.isActive).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-[#374151] text-center py-8">No active users found.</p>
            ) : (
              <div className="space-y-3">
                {users.filter((u) => u.isActive).map((user) => {
                  const pct = user.dailyRequestLimit > 0
                    ? Math.min((user.usageCount / user.dailyRequestLimit) * 100, 100)
                    : 0;
                  const isHigh = pct > 80 && user.dailyRequestLimit > 0;
                  return (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center text-gray-500 dark:text-[#9ca3af] text-xs font-bold flex-shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-[#9ca3af] w-24 truncate flex-shrink-0">{user.name}</span>
                      <div className="flex-1 h-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: isHigh ? '#b61615' : '#374151' }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 dark:text-[#374151] w-12 text-right flex-shrink-0">
                        {user.usageCount}{user.dailyRequestLimit > 0 ? `/${user.dailyRequestLimit}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
