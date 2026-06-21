import { useState } from 'react';
import { Menu, Plus, Sun, Moon, AlertTriangle, X } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import ChatInterface from './chat/ChatInterface';
import ToolsView from './tools/ToolsView';
import DeepSearchView from './tools/DeepSearchView';
// Image Generation is hidden in this release (no provider implemented yet).
import UsageView from './user/UsageView';
import AdminOverview from './admin/AdminOverview';
import UserManagement from './admin/UserManagement';
import RolesPermissions from './admin/RolesPermissions';
import ToolAccess from './admin/ToolAccess';
import SystemSettings from './admin/SystemSettings';
import UsageLimits from './admin/UsageLimits';
import ApiProviders from './admin/ApiProviders';
import SystemLogs from './admin/SystemLogs';
import { useAppStore, NavView } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';

import ChangePasswordModal from './user/ChangePasswordModal';

const ADMIN_TABS: { id: NavView; label: string }[] = [
  { id: 'admin', label: 'Overview' },
  { id: 'admin-users', label: 'Users' },
  { id: 'admin-roles', label: 'Roles' },
  { id: 'admin-tools', label: 'Tools' },
  { id: 'admin-usage', label: 'Usage' },
  { id: 'admin-providers', label: 'Providers' },
  { id: 'admin-logs', label: 'Logs' },
  { id: 'admin-settings', label: 'Settings' },
];

function AdminTabBar() {
  const { activeView, setActiveView } = useAppStore();
  return (
    <div className="flex-shrink-0 overflow-x-auto scrollbar-none
      bg-white dark:bg-transparent
      border-b border-gray-100 dark:border-white/[0.06]">
      <div className="flex min-w-max">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeView === tab.id
                ? 'border-[#b61615] text-[#b61615]'
                : 'border-transparent text-gray-400 dark:text-white/35 hover:text-gray-700 dark:hover:text-white/60'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileHeader({ onOpen }: { onOpen: () => void }) {
  const { activeView, setActiveConversation, setActiveView } = useAppStore();
  const { theme, toggleTheme } = useAuthStore();

  const handleNewChat = () => {
    setActiveConversation(null);
    setActiveView('chat');
  };

  return (
    <header
      className="flex-shrink-0 flex items-center h-14 px-3 gap-1
        bg-white/88 dark:bg-black/55
        backdrop-blur-2xl
        border-b border-gray-100/80 dark:border-white/[0.07]"
    >
      <button
        onClick={onOpen}
        className="p-2 -ml-1 rounded-xl text-gray-500 dark:text-white/45
          hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2 flex-1 justify-center">
        <div className="w-6 h-6 bg-[#b61615] rounded-md flex items-center justify-center flex-shrink-0">
          <svg width="11" height="11" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="white" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">
          Nafas AI
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-gray-400 dark:text-white/40
            hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {activeView === 'chat' && (
          <button
            onClick={handleNewChat}
            className="p-2 -mr-1 rounded-xl text-gray-400 dark:text-white/40
              hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition"
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}

function ViewContent({ view }: { view: NavView }) {
  switch (view) {
    case 'chat':             return <ChatInterface />;
    case 'tools':            return <ToolsView />;
    case 'search':           return <DeepSearchView />;
    case 'usage':            return <UsageView />;
    case 'admin':            return <AdminOverview />;
    case 'admin-users':      return <UserManagement />;
    case 'admin-roles':      return <RolesPermissions />;
    case 'admin-tools':      return <ToolAccess />;
    case 'admin-usage':      return <UsageLimits />;
    case 'admin-providers':  return <ApiProviders />;
    case 'admin-logs':       return <SystemLogs />;
    case 'admin-settings':   return <SystemSettings />;
    default:                 return <ChatInterface />;
  }
}

export default function Layout() {
  const { activeView, serverError, setServerError, isPasswordModalOpen, setIsPasswordModalOpen } = useAppStore();
  const { currentUser } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdminView = activeView.startsWith('admin');
  const hasAdminAccess = currentUser?.permissions.includes('admin_panel');
  const safeView: NavView = isAdminView && !hasAdminAccess ? 'chat' : activeView;
  const showAdminTabs = safeView.startsWith('admin');

  return (
    <div className="h-[100dvh] bg-white dark:bg-[#080808] overflow-hidden">
      {currentUser?.mustChangePassword && <ChangePasswordModal forced />}
      {!currentUser?.mustChangePassword && isPasswordModalOpen && (
         <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
      )}

      {/* ─── Desktop (md+) ──────────────────────────── */}
      <div className="hidden md:flex h-full">
        <Sidebar />
        <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          {serverError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 text-sm flex items-center justify-between border-b border-red-100 dark:border-red-900/30 flex-shrink-0">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4" />
                {serverError}
              </div>
              <button onClick={() => setServerError(null)} className="text-red-500 hover:text-red-700 dark:hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <ViewContent view={safeView} />
        </main>
      </div>

      {/* ─── Mobile (<md) ───────────────────────────── */}
      <div className="flex md:hidden flex-col h-full">
        <MobileHeader onOpen={() => setDrawerOpen(true)} />
        {showAdminTabs && <AdminTabBar />}
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {serverError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 text-sm flex items-center justify-between border-b border-red-100 dark:border-red-900/30 flex-shrink-0">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4" />
                {serverError}
              </div>
              <button onClick={() => setServerError(null)} className="text-red-500 hover:text-red-700 dark:hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <ViewContent view={safeView} />
        </main>
        <BottomNav />
      </div>

      {/* ─── Mobile Drawer ──────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex fade-in-overlay">
          {/* Dim backdrop */}
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div
            className="relative w-[17.5rem] h-full flex-shrink-0 slide-in-left
              bg-white dark:bg-[#0e0e0e]
              border-r border-gray-100 dark:border-white/[0.07]
              shadow-[4px_0_48px_rgba(0,0,0,0.35)] dark:shadow-[4px_0_60px_rgba(0,0,0,0.7)]"
          >
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
