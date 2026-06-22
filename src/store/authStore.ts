import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'manager' | 'employee';

export type Theme = 'light' | 'dark' | 'midnight';

/** Apply the chosen theme to <html>. `midnight` builds on top of `dark`. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark' || theme === 'midnight');
  root.classList.toggle('midnight', theme === 'midnight');
}

export type Permission =
  | 'chat'
  | 'image_generation'
  | 'research'
  | 'code_assistant'
  | 'summarization'
  | 'admin_panel'
  | 'user_management'
  | 'system_settings';

export interface TimeRestriction {
  enabled: boolean;
  startHour: number;
  endHour: number;
  days: number[]; // 0=Sun … 6=Sat
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  permissions: Permission[];
  avatar?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  usageLimit: number;
  usageCount: number;
  dailyTokenLimit: number;
  tokensUsed: number;
  dailyRequestLimit: number;
  requestsUsed: number;
  dailyCostLimit: number;
  costUsed: number;
  timeRestriction: TimeRestriction;
  createdAt: string;
  lastLogin?: string;
}

interface AuthState {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  theme: Theme;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      token: null,
      isAuthenticated: false,
      theme: 'light',

      login: async (email: string, password: string) => {
        try {
          const res = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password }),
          });
          const data = await res.json();
          if (!data.success) {
            return { success: false, error: data.error ?? 'Login failed.' };
          }
          set({ currentUser: data.user, token: data.token, isAuthenticated: true });
          return { success: true };
        } catch {
          return { success: false, error: 'Cannot connect to server. Check your configuration.' };
        }
      },

      logout: () => set({ currentUser: null, token: null, isAuthenticated: false }),
      updateUser: (data) => set((state) => ({ currentUser: state.currentUser ? { ...state.currentUser, ...data } : null })),

      toggleTheme: () => {
        set((state) => {
          const order: Theme[] = ['light', 'dark', 'midnight'];
          const newTheme = order[(order.indexOf(state.theme) + 1) % order.length];
          applyTheme(newTheme);
          return { theme: newTheme };
        });
      },

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'nucleus-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? 'light');
      },
    }
  )
);
