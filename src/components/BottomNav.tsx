import { MessageSquare, Wrench, FolderOpen, Shield, Zap } from 'lucide-react';
import { useAppStore, NavView } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';

const BASE_TABS = [
  { id: 'chat' as NavView, label: 'Chat', icon: MessageSquare },
  { id: 'tools' as NavView, label: 'Tools', icon: Wrench },
  { id: 'usage' as NavView, label: 'Usage', icon: Zap },
];

export default function BottomNav() {
  const { activeView, setActiveView } = useAppStore();
  const { currentUser } = useAuthStore();
  const hasAdmin = currentUser?.permissions.includes('admin_panel');

  const tabs = hasAdmin
    ? [...BASE_TABS, { id: 'admin' as NavView, label: 'Admin', icon: Shield }]
    : BASE_TABS;

  return (
    <nav
      className="flex-shrink-0 flex items-stretch select-none
        bg-white/88 backdrop-blur-2xl border-t border-gray-100/90
        dark:bg-black/65 dark:backdrop-blur-3xl dark:border-white/[0.07]
        pb-safe"
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = id === 'admin' ? activeView.startsWith('admin') : activeView === id;
        return (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-[3px] py-2.5 transition-colors',
              active
                ? 'text-[#b61615]'
                : 'text-gray-300 dark:text-white/25'
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 transition-transform duration-150',
                active ? 'scale-[1.08]' : 'scale-95 opacity-70'
              )}
            />
            <span className={cn('text-[10px] font-medium tracking-wide', active ? '' : 'opacity-60')}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
