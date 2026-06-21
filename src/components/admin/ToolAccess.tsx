import { useState } from 'react';
import { Sliders, MessageSquare, Image, FileSearch, Globe, Code2, FileText, Save } from 'lucide-react';
import { Permission, UserRole } from '../../store/authStore';
import { cn } from '../../utils/cn';

interface ToolConfig {
  id: Permission;
  name: string;
  description: string;
  icon: React.ElementType;
  model: string;
  defaultRoles: UserRole[];
  rateLimit: number;
}

const TOOLS: ToolConfig[] = [
  {
    id: 'chat',
    name: 'AI Chat',
    description: 'General-purpose conversational AI for Q&A, writing, and analysis.',
    icon: MessageSquare,
    model: 'claude-sonnet-4-6',
    defaultRoles: ['admin', 'manager', 'employee'],
    rateLimit: 100,
  },
  {
    id: 'research',
    name: 'Research Assistant',
    description: 'In-depth research with web access, citations and synthesis.',
    icon: Globe,
    model: 'claude-opus-4-8',
    defaultRoles: ['admin', 'manager'],
    rateLimit: 30,
  },
  {
    id: 'code_assistant',
    name: 'Code Assistant',
    description: 'Write, debug, explain and optimize code in all languages.',
    icon: Code2,
    model: 'claude-sonnet-4-6',
    defaultRoles: ['admin', 'employee'],
    rateLimit: 80,
  },
  {
    id: 'summarization',
    name: 'Summarization',
    description: 'Condense long documents, emails, and reports into clear summaries.',
    icon: FileText,
    model: 'claude-haiku-4-5',
    defaultRoles: ['admin', 'manager', 'employee'],
    rateLimit: 150,
  },
];

const ROLES: UserRole[] = ['admin', 'manager', 'employee'];
const ROLE_LABELS: Record<UserRole, string> = { admin: 'Admin', manager: 'Manager', employee: 'Employee' };

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={cn(
        'relative cursor-pointer flex-shrink-0 rounded-full transition-all',
        value ? 'bg-[#b61615]' : 'bg-gray-200 dark:bg-[#2a2a2a]'
      )}
      style={{ width: 40, height: 22 }}
    >
      <div
        className="absolute top-0.5 rounded-full bg-white shadow-sm transition-all"
        style={{ width: 18, height: 18, left: value ? 18 : 2, top: 2 }}
      />
    </div>
  );
}

export default function ToolAccess() {
  const [configs, setConfigs] = useState<Record<string, { roles: UserRole[]; enabled: boolean; rateLimit: number }>>(
    Object.fromEntries(TOOLS.map((t) => [t.id, { roles: t.defaultRoles, enabled: true, rateLimit: t.rateLimit }]))
  );
  const [saved, setSaved] = useState(false);

  const toggleRole = (toolId: string, role: UserRole) => {
    setConfigs((prev) => {
      const current = prev[toolId].roles;
      return {
        ...prev,
        [toolId]: {
          ...prev[toolId],
          roles: current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
        },
      };
    });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                <Sliders className="w-3.5 h-3.5 text-[#9ca3af]" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Tool Access</h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-[#4b5563] ml-10">Configure which roles can access each AI tool</p>
          </div>
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              saved ? 'bg-emerald-600 text-white' : 'bg-[#b61615] hover:bg-[#9c1110] text-white'
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
        {TOOLS.map((tool) => {
          const config = configs[tool.id];
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className={cn(
                'border rounded-xl p-5 transition-all',
                config.enabled
                  ? 'border-gray-100 dark:border-[#1f1f1f] bg-white dark:bg-[#111111]'
                  : 'border-gray-100 dark:border-[#1a1a1a] bg-gray-50 dark:bg-[#0d0d0d] opacity-50'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-gray-600 dark:text-[#6b7280]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{tool.name}</h3>
                    <span className="text-xs text-gray-400 dark:text-[#4b5563] bg-gray-100 dark:bg-[#1a1a1a] px-2 py-0.5 rounded-md">
                      {tool.model}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-[#4b5563] mb-3 leading-relaxed">{tool.description}</p>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-[#4b5563]">Roles:</span>
                      <div className="flex items-center gap-1">
                        {ROLES.map((role) => {
                          const active = config.roles.includes(role);
                          return (
                            <button
                              key={role}
                              onClick={() => config.enabled && toggleRole(tool.id, role)}
                              className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium transition border',
                                active
                                  ? role === 'admin'
                                    ? 'bg-[#b61615]/10 text-[#b61615] border-[#b61615]/20'
                                    : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#d1d5db] border-gray-200 dark:border-[#2a2a2a]'
                                  : 'bg-transparent text-gray-300 dark:text-[#2a2a2a] border-gray-100 dark:border-[#1a1a1a] cursor-default'
                              )}
                            >
                              {ROLE_LABELS[role]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-[#4b5563]">Rate limit:</span>
                      <input
                        type="number"
                        value={config.rateLimit}
                        onChange={(e) => setConfigs((prev) => ({
                          ...prev,
                          [tool.id]: { ...prev[tool.id], rateLimit: parseInt(e.target.value) || 0 },
                        }))}
                        className="w-16 px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#b61615]/30 focus:border-[#b61615] transition"
                      />
                      <span className="text-xs text-gray-400 dark:text-[#374151]">req/day</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 dark:text-[#4b5563]">{config.enabled ? 'On' : 'Off'}</span>
                  <Toggle value={config.enabled} onChange={() => setConfigs((prev) => ({
                    ...prev,
                    [tool.id]: { ...prev[tool.id], enabled: !prev[tool.id].enabled },
                  }))} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
