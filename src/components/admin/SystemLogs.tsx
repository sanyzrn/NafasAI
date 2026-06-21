import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2, AlertTriangle, Info, AlertOctagon, ScrollText, ChevronDown } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { cn } from '../../utils/cn';

interface LogEntry {
  time: string;
  level: 'info' | 'warn' | 'error';
  context: string;
  message: string;
  actor?: string | null;
  extra?: Record<string, unknown>;
}

const LEVEL_META: Record<LogEntry['level'], { icon: React.ElementType; cls: string; chip: string }> = {
  error: { icon: AlertOctagon,   cls: 'text-red-600 dark:text-red-400',     chip: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
  warn:  { icon: AlertTriangle,  cls: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  info:  { icon: Info,           cls: 'text-blue-600 dark:text-blue-400',   chip: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
};

function LogRow({ log }: { log: LogEntry }) {
  const [open, setOpen] = useState(false);
  const meta = LEVEL_META[log.level] ?? LEVEL_META.info;
  const Icon = meta.icon;
  const hasExtra = log.extra && Object.keys(log.extra).length > 0;
  const when = (() => {
    const d = new Date(log.time);
    return isNaN(d.getTime()) ? log.time : d.toLocaleString();
  })();

  return (
    <div className="border-b border-gray-100 dark:border-[#161616] last:border-0">
      <button
        onClick={() => hasExtra && setOpen((v) => !v)}
        className={cn('flex items-start gap-3 w-full text-left px-4 py-3', hasExtra && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#141414]')}
      >
        <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', meta.cls)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', meta.chip)}>{log.level}</span>
            <span className="text-xs font-medium text-gray-500 dark:text-[#6b7280]">{log.context}</span>
            <span className="text-[11px] text-gray-400 dark:text-[#4b5563]">{when}</span>
          </div>
          <p className="text-sm text-gray-800 dark:text-[#d1d5db] mt-1 break-words">{log.message}</p>
          {open && hasExtra && (
            <pre className="mt-2 text-[11px] leading-relaxed bg-gray-50 dark:bg-[#0d0d0d] border border-gray-100 dark:border-[#1f1f1f] rounded-lg p-3 overflow-x-auto text-gray-600 dark:text-[#9ca3af]">
              {JSON.stringify(log.extra, null, 2)}
            </pre>
          )}
        </div>
        {hasExtra && <ChevronDown className={cn('w-4 h-4 text-gray-400 dark:text-[#4b5563] transition-transform flex-shrink-0', open && 'rotate-180')} />}
      </button>
    </div>
  );
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch({ action: 'logs.list', limit: 300 });
      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClear = async () => {
    if (!confirm('Clear all server logs? This cannot be undone.')) return;
    try {
      await apiFetch({ action: 'logs.clear' });
      setLogs([]);
    } catch {
      /* apiFetch surfaces a toast on failure */
    }
  };

  const counts = {
    error: logs.filter((l) => l.level === 'error').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    info: logs.filter((l) => l.level === 'info').length,
  };
  const shown = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-4 md:px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-[#b61615] flex items-center justify-center">
                <ScrollText className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">System Logs</h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-[#4b5563] ml-10">
              {counts.error} errors · {counts.warn} warnings · {counts.info} info
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-[#9ca3af] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900/40 text-[#b61615] hover:bg-red-50 dark:hover:bg-red-900/15 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-4">
          {(['all', 'error', 'warn', 'info'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium capitalize transition border',
                filter === f
                  ? 'border-[#b61615]/30 bg-[#b61615]/8 text-[#b61615]'
                  : 'border-gray-200 dark:border-[#2a2a2a] text-gray-500 dark:text-[#6b7280] hover:border-gray-300 dark:hover:border-[#3a3a3a]'
              )}
            >
              {f}{f !== 'all' ? ` (${counts[f]})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <AlertTriangle className="w-6 h-6 text-[#b61615] mb-2" />
            <p className="text-sm text-gray-500 dark:text-[#6b7280]">{error}</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <ScrollText className="w-7 h-7 text-gray-300 dark:text-[#374151] mb-2" />
            <p className="text-sm text-gray-400 dark:text-[#4b5563]">
              {loading ? 'Loading logs…' : 'No log entries yet.'}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full">
            {shown.map((log, i) => <LogRow key={i} log={log} />)}
          </div>
        )}
      </div>
    </div>
  );
}
