import { MessageSquare, Image, FileSearch, Globe, Code2, FileText, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore, Permission } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../utils/cn';

interface Tool {
  id: Permission;
  name: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

const ALL_TOOLS: Tool[] = [
  {
    id: 'chat',
    name: 'AI Chat',
    description: 'Conversational AI for writing, analysis, brainstorming, and answering questions.',
    icon: MessageSquare,
    badge: 'Most used',
  },
  {
    id: 'research',
    name: 'Research Assistant',
    description: 'In-depth research, competitive analysis, and fact-checking from trusted sources.',
    icon: Globe,
  },
  {
    id: 'code_assistant',
    name: 'Code Assistant',
    description: 'Write, debug, explain, and optimize code across all major languages and frameworks.',
    icon: Code2,
  },
  {
    id: 'summarization',
    name: 'Summarization',
    description: 'Condense long documents, emails, meeting notes, and reports into clear summaries.',
    icon: FileText,
  },
];

function ToolCard({ tool, hasAccess, onClick }: { tool: Tool; hasAccess: boolean; onClick: () => void }) {
  const Icon = tool.icon;

  return (
    <div
      onClick={hasAccess ? onClick : undefined}
      className={cn(
        'relative rounded-xl border p-5 transition-all group',
        hasAccess
          ? 'border-gray-100 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] hover:border-[#b61615]/30 hover:shadow-sm hover:shadow-[#b61615]/5 cursor-pointer'
          : 'border-gray-100 dark:border-[#1a1a1a] bg-gray-50 dark:bg-[#0d0d0d] cursor-not-allowed opacity-50'
      )}
    >
      {tool.badge && hasAccess && (
        <span className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 bg-[#b61615]/10 text-[#b61615] rounded-full">
          {tool.badge}
        </span>
      )}
      {!hasAccess && (
        <div className="absolute top-3 right-3">
          <Lock className="w-3.5 h-3.5 text-gray-300 dark:text-[#374151]" />
        </div>
      )}
      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center mb-3">
        <Icon className={cn('w-5 h-5', hasAccess ? 'text-gray-700 dark:text-[#9ca3af]' : 'text-gray-300 dark:text-[#374151]')} />
      </div>
      <h3 className={cn('font-semibold text-sm mb-1', hasAccess ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-[#4b5563]')}>
        {tool.name}
      </h3>
      <p className="text-xs text-gray-400 dark:text-[#4b5563] leading-relaxed">{tool.description}</p>
      {hasAccess && (
        <div className="flex items-center gap-1 mt-3 text-xs font-medium text-[#b61615] opacity-0 group-hover:opacity-100 transition">
          Open <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

export default function ToolsView() {
  const { currentUser } = useAuthStore();
  const { setActiveView, createConversation, setActiveConversation } = useAppStore();

  const handleToolClick = (toolId: Permission) => {
    if (toolId === 'research') {
      setActiveView('search');
    } else if (toolId === 'image_generation') {
      setActiveView('image');
    } else {
      const id = createConversation(toolId);
      setActiveConversation(id);
      setActiveView('chat');
    }
  };

  const accessibleTools = ALL_TOOLS.filter((t) => currentUser?.permissions.includes(t.id));
  const lockedTools = ALL_TOOLS.filter((t) => !currentUser?.permissions.includes(t.id));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AI Tools</h1>
        <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">
          {accessibleTools.length} available · {lockedTools.length} restricted
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {accessibleTools.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider mb-4">Available to you</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accessibleTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} hasAccess onClick={() => handleToolClick(tool.id)} />
              ))}
            </div>
          </div>
        )}

        {lockedTools.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-[#374151] uppercase tracking-wider mb-4">
              Restricted — contact admin for access
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lockedTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} hasAccess={false} onClick={() => {}} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
