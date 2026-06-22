import { Activity, Zap, DollarSign, MessageSquare, TrendingUp, Clock, Key } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const isUnlimited = limit < 0;
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isHigh = pct > 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-medium text-gray-700 dark:text-[#d1d5db]">{label}</span>
        <span className="text-gray-400 dark:text-[#4b5563]">
          {used.toLocaleString()} {unit}
          {!isUnlimited && ` / ${limit.toLocaleString()}`}
          {isUnlimited && ' (unlimited)'}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
        {!isUnlimited && (
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: isHigh ? '#b61615' : '#4b5563' }}
          />
        )}
        {isUnlimited && (
          <div className="h-full w-full bg-gradient-to-r from-[#b61615]/20 to-[#b61615]/5 rounded-full" />
        )}
      </div>
      {isHigh && (
        <p className="text-[10px] text-[#b61615] mt-1">{pct.toFixed(0)}% of daily limit used</p>
      )}
    </div>
  );
}

export default function UsageView() {
  const { currentUser } = useAuthStore();
  const { conversations } = useAppStore();

  if (!currentUser) return null;

  const { dailyTokenLimit, tokensUsed, dailyRequestLimit, requestsUsed, dailyCostLimit, costUsed } = currentUser;
  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);

  const recentConvs = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const formatTime = (date: Date | string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-4 md:px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">My Usage</h1>
        <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">Today's consumption · resets at midnight</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tokens Today', value: tokensUsed.toLocaleString(), icon: Zap,         sub: dailyTokenLimit   > 0 ? `of ${(dailyTokenLimit / 1000).toFixed(0)}K` : 'unlimited' },
            { label: 'Requests',     value: requestsUsed.toString(),      icon: MessageSquare, sub: dailyRequestLimit > 0 ? `of ${dailyRequestLimit}` : 'unlimited' },
            { label: 'Est. Cost',    value: `$${costUsed.toFixed(3)}`,    icon: DollarSign,  sub: dailyCostLimit    > 0 ? `of $${dailyCostLimit.toFixed(2)}` : 'no limit' },
            { label: 'Total Chats',  value: conversations.length.toString(), icon: TrendingUp, sub: `${totalMessages} messages` },
          ].map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-gray-600 dark:text-[#9ca3af]" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
              <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">{label}</p>
              <p className="text-[10px] text-gray-300 dark:text-[#374151] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Usage limits */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider mb-4">Daily Limits</h3>
          <div className="space-y-4">
            <UsageBar label="Tokens"   used={tokensUsed}      limit={dailyTokenLimit}      unit="tokens" />
            <UsageBar label="Requests" used={requestsUsed}    limit={dailyRequestLimit}    unit="req"    />
            <UsageBar label="Cost"     used={costUsed * 100}  limit={dailyCostLimit * 100} unit="¢"      />
          </div>
        </div>

        {/* Time restriction */}
        {currentUser.timeRestriction?.enabled && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
            <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Access Hours Restricted</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                Available {currentUser.timeRestriction.startHour}:00 – {currentUser.timeRestriction.endHour}:00 on working days.
              </p>
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-[#1a1a1a]">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">Recent Activity</h3>
          </div>
          {recentConvs.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-[#374151] text-center py-8">No conversations yet.</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
              {recentConvs.map((c) => {
                const tokens = c.messages.reduce((acc, m) => acc + (m.tokens ?? 0), 0);
                return (
                  <div key={c.id} className="flex items-center px-5 py-3 hover:bg-gray-50 dark:hover:bg-[#161616] transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                      <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">{c.tool} · {formatTime(c.updatedAt)}</p>
                    </div>
                    {tokens > 0 && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Activity className="w-3 h-3 text-gray-300 dark:text-[#374151]" />
                        <span className="text-xs text-gray-400 dark:text-[#4b5563]">{tokens.toLocaleString()} tkn</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security / Password Change */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-[#1a1a1a] flex items-center gap-2">
            <Key className="w-4 h-4 text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">Security</h3>
          </div>
          <div className="p-5">
            <button
              onClick={() => {
                const { setIsPasswordModalOpen } = useAppStore.getState();
                setIsPasswordModalOpen(true);
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-900 dark:text-white text-sm font-medium rounded-lg transition"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
