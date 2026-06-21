import { useState } from 'react';
import {
  MessageSquare,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  LogOut,
  Sun,
  Moon,
  Shield,
  Lock,
  MoreHorizontal,
  Users,
  BarChart3,
  Wrench,
  Activity,
  Sliders,
  Edit3,
  Zap,
  Plug,
  ScrollText,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore, Conversation, NavView } from '../store/appStore';
import { cn } from '../utils/cn';

const navItems = [
  { id: 'chat' as NavView, label: 'Chat', icon: MessageSquare },
  { id: 'tools' as NavView, label: 'Tools', icon: Wrench },
  { id: 'usage' as NavView, label: 'My Usage', icon: Zap },
];

const adminNavItems = [
  { id: 'admin' as NavView, label: 'Overview', icon: BarChart3 },
  { id: 'admin-users' as NavView, label: 'Users', icon: Users },
  { id: 'admin-roles' as NavView, label: 'Roles & Permissions', icon: Shield },
  { id: 'admin-tools' as NavView, label: 'Tool Access', icon: Sliders },
  { id: 'admin-usage' as NavView, label: 'Usage & Limits', icon: Activity },
  { id: 'admin-providers' as NavView, label: 'API Providers', icon: Plug },
  { id: 'admin-logs' as NavView, label: 'System Logs', icon: ScrollText },
  { id: 'admin-settings' as NavView, label: 'Settings', icon: Settings },
];

function ConversationItem({ conv, isActive, onClick, onDelete, onRename }: {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(conv.title);

  const handleRename = () => {
    if (renameVal.trim()) onRename(renameVal.trim());
    setRenaming(false);
    setShowMenu(false);
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
        isActive
          ? 'bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-white'
          : 'text-gray-500 dark:text-[#9ca3af] hover:bg-gray-100/70 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-white'
      )}
      onClick={!renaming ? onClick : undefined}
    >
      {renaming ? (
        <input
          autoFocus
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setRenaming(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none border-b border-[#b61615]"
        />
      ) : (
        <span className="flex-1 truncate">{conv.title}</span>
      )}
      {!renaming && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition flex-shrink-0"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      )}
      {showMenu && (
        <div className="absolute right-0 top-8 z-50 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg shadow-xl py-1 min-w-[150px]">
          <button
            onClick={(e) => { e.stopPropagation(); setRenaming(true); setShowMenu(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-[#d1d5db] hover:bg-gray-50 dark:hover:bg-white/5 transition"
          >
            <Edit3 className="w-3.5 h-3.5" /> Rename
          </button>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              setShowMenu(false);
              if (window.confirm('Are you sure you want to delete this conversation?')) {
                onDelete(); 
              }
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#b61615] hover:bg-[#b61615]/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function NavButton({ label, icon: Icon, isActive, onClick, collapsed }: {
  label: string; icon: React.ElementType;
  isActive: boolean; onClick: () => void; collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-2.5 w-full rounded-md text-sm font-medium transition-colors',
        collapsed ? 'p-2 justify-center' : 'px-2.5 py-2',
        isActive
          ? 'bg-[#b61615]/10 text-[#b61615] dark:bg-[#b61615]/15'
          : 'text-gray-500 dark:text-[#6b7280] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-[#d1d5db]'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && label}
    </button>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { currentUser, logout, theme, toggleTheme } = useAuthStore();
  const {
    activeView,
    setActiveView,
    conversations,
    activeConversationId,
    setActiveConversation,
    deleteConversation,
    renameConversation,
    isSidebarCollapsed,
    toggleSidebar,
    setIsPasswordModalOpen,
  } = useAppStore();

  const isDrawer = !!onClose;
  const isAdmin = currentUser?.permissions.includes('admin_panel');
  const isAdminView = activeView.startsWith('admin');

  const navigate = (view: NavView) => {
    setActiveView(view);
    onClose?.();
  };

  const handleNewChat = () => {
    setActiveConversation(null);
    setActiveView('chat');
    onClose?.();
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Collapsed state (desktop icon-only rail) ──────────
  if (!isDrawer && isSidebarCollapsed) {
    return (
      <aside className="w-14 flex-shrink-0 h-full flex flex-col
        bg-white dark:bg-[#0f0f0f]
        border-r border-gray-100 dark:border-[#1f1f1f]
        py-3 items-center gap-1">
        <div className="w-8 h-8 bg-[#b61615] rounded-lg flex items-center justify-center mb-1 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="white" />
          </svg>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-gray-400 dark:text-[#4b5563]
            hover:text-gray-600 dark:hover:text-[#d1d5db]
            hover:bg-gray-100 dark:hover:bg-white/5 transition mb-1"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {navItems.map(({ id, icon: Icon, label }) => (
          <NavButton
            key={id} label={label} icon={Icon}
            isActive={activeView === id}
            onClick={() => navigate(id)}
            collapsed
          />
        ))}
        {isAdmin && (
          <button
            onClick={() => navigate('admin')}
            title="Admin"
            className={cn(
              'p-2 rounded-md transition mt-auto',
              isAdminView
                ? 'bg-[#b61615]/15 text-[#b61615]'
                : 'text-gray-400 dark:text-[#6b7280] hover:text-gray-700 dark:hover:text-[#d1d5db] hover:bg-gray-100 dark:hover:bg-white/5'
            )}
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
      </aside>
    );
  }

  // ── Full sidebar ──────────────────────────────────────
  return (
    <aside className={cn(
      'flex-shrink-0 h-full flex flex-col',
      isDrawer
        ? 'w-full bg-transparent'
        : 'w-60 bg-white dark:bg-[#0f0f0f] border-r border-gray-100 dark:border-[#1f1f1f]'
    )}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#b61615] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">Nafas AI</span>
        </div>
        {!isDrawer && (
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-gray-400 dark:text-[#4b5563]
              hover:text-gray-600 dark:hover:text-[#9ca3af]
              hover:bg-gray-100 dark:hover:bg-white/5 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <div className="px-2 pt-3 pb-1 space-y-0.5">
        {navItems.map(({ id, icon, label }) => (
          <NavButton
            key={id} label={label} icon={icon}
            isActive={activeView === id}
            onClick={() => navigate(id)}
          />
        ))}
      </div>

      {/* Conversation history */}
      {activeView === 'chat' && (
        <div className="flex-1 overflow-hidden flex flex-col px-2 mt-2">
          <div className="flex items-center justify-between py-2 px-1">
            <span className="text-xs font-semibold text-gray-300 dark:text-[#374151] uppercase tracking-wider">
              History
            </span>
            <button
              onClick={handleNewChat}
              className="p-1 rounded-md text-gray-400 dark:text-[#4b5563]
                hover:text-gray-600 dark:hover:text-[#d1d5db]
                hover:bg-gray-100 dark:hover:bg-white/5 transition"
              title="New chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 pb-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-300 dark:text-[#374151] px-2 py-4 text-center">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeConversationId === conv.id}
                  onClick={() => {
                    setActiveConversation(conv.id);
                    setActiveView('chat');
                    onClose?.();
                  }}
                  onDelete={() => deleteConversation(conv.id)}
                  onRename={(title) => renameConversation(conv.id, title)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {activeView !== 'chat' && <div className="flex-1" />}

      {/* Admin nav */}
      {isAdmin && (
        <div className="px-2 py-2 border-t border-gray-100 dark:border-[#1a1a1a]">
          <div className="px-1 py-1.5">
            <span className="text-xs font-semibold text-gray-300 dark:text-[#374151] uppercase tracking-wider">
              Admin
            </span>
          </div>
          <div className="space-y-0.5">
            {adminNavItems.map(({ id, icon, label }) => (
              <NavButton
                key={id} label={label} icon={icon}
                isActive={activeView === id}
                onClick={() => navigate(id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* User profile */}
      <div className="border-t border-gray-100 dark:border-[#1a1a1a] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center text-gray-500 dark:text-[#9ca3af] text-xs font-semibold flex-shrink-0">
            {currentUser ? getInitials(currentUser.name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{currentUser?.name}</p>
            <p className="text-xs text-gray-400 dark:text-[#4b5563] capitalize">{currentUser?.role}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="p-1.5 rounded-md text-gray-400 dark:text-[#4b5563]
                hover:text-gray-600 dark:hover:text-[#9ca3af]
                hover:bg-gray-100 dark:hover:bg-white/5 transition"
              title="Change Password"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-gray-400 dark:text-[#4b5563]
                hover:text-gray-600 dark:hover:text-[#9ca3af]
                hover:bg-gray-100 dark:hover:bg-white/5 transition"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-gray-400 dark:text-[#4b5563]
                hover:text-[#b61615] hover:bg-[#b61615]/10 transition"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
