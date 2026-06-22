import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole, Permission } from './authStore';
import { useAuthStore } from './authStore';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';

export type NavView =
  | 'chat'
  | 'tools'
  | 'search'
  | 'image'
  | 'usage'
  | 'admin'
  | 'admin-users'
  | 'admin-roles'
  | 'admin-tools'
  | 'admin-usage'
  | 'admin-settings'
  | 'admin-providers'
  | 'admin-logs';

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'custom';

export interface AIModel {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export interface ApiProvider {
  id: ProviderId;
  name: string;
  color: string;
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
  models: AIModel[];
  defaultModel: string;
}

/**
 * Canonical Data Model
 * 
 * Note: While the backend uses a mix of flat JSON and MySQL, this is the 
 * single source of truth for the strict TypeScript shapes the client expects.
 * 
 * Key Normalizations at the boundary:
 * - Timestamps: Come from API as ISO strings (DATETIME in DB), parsed to native `Date` objects in the store.
 * - Enums: Fallback gracefully to default values if the DB/JSON values mutate.
 * - Defaults: Limits like `dailyRequestLimit` default to -1 (unlimited) if missing.
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tool?: string;
  tokens?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  tool: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  status: 'processing' | 'ready' | 'error';
}

export interface ToolAccessConfig {
  enabled: boolean;
  roles: UserRole[];
  rateLimit: number;
}

export type AITone = 'professional' | 'casual' | 'technical' | 'creative';
export type AIVerbosity = 'concise' | 'balanced' | 'detailed';

export interface AIConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tone: AITone;
  verbosity: AIVerbosity;
  streamResponses: boolean;
  logConversations: boolean;
  retentionDays: number;
  allowDataExport: boolean;
  apiKey: string;
  platformName: string;
  companyName: string;
  defaultProviderId?: string;
  errorMessage: string;
}

interface AppState {
  activeView: NavView;
  activeTool: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  uploadedFiles: UploadedFile[];
  isSidebarCollapsed: boolean;
  users: User[];
  isTyping: boolean;
  serverError: string | null;
  isPasswordModalOpen: boolean;
  aiConfig: AIConfig;
  providers: ApiProvider[];
  selectedProviderId: ProviderId;
  selectedModelId: string;
  toolAccess: Record<string, ToolAccessConfig>;
  roles: Record<string, Permission[]>;

  setServerError: (err: string | null) => void;
  setIsPasswordModalOpen: (val: boolean) => void;
  setActiveView: (view: NavView) => void;
  setActiveTool: (tool: string) => void;
  setSelectedProvider: (id: ProviderId) => void;
  setSelectedModel: (id: string) => void;
  updateProvider: (id: ProviderId, patch: Partial<ApiProvider>) => void;
  createConversation: (tool: string) => string;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  truncateToLastUser: (conversationId: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  addFile: (file: Omit<UploadedFile, 'id' | 'uploadedAt' | 'status'>) => void;
  deleteFile: (id: string) => void;
  toggleSidebar: () => void;
  setIsTyping: (val: boolean) => void;
  updateUser: (user: User) => void;
  addUser: (user: User) => void;
  disableUser: (id: string) => void;
  deleteUser: (id: string) => void;
  loadUsers: () => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadConfig: () => Promise<void>;
  updateAIConfig: (config: Partial<AIConfig>) => void;
  updateToolAccess: (toolAccess: Record<string, ToolAccessConfig>) => void;
  updateRoles: (roles: Record<string, Permission[]>) => void;
  resetUserState: () => void;
}

const generateId = () => crypto.randomUUID();

const DEFAULT_AI_CONFIG: AIConfig = {
  systemPrompt: 'You are Nafas AI, an intelligent assistant deployed for internal use at Nafas Zist Pharmed. Your role is to help employees work more efficiently and effectively. Provide accurate, professional, and well-structured responses. Always maintain data confidentiality.',
  model: 'claude-3-7-sonnet-20250219',
  temperature: 0.7,
  maxTokens: 4096,
  tone: 'professional',
  verbosity: 'balanced',
  streamResponses: false,
  logConversations: true,
  retentionDays: 90,
  allowDataExport: true,
  apiKey: '',
  platformName: 'Nafas AI',
  companyName: 'Nafas Zist Pharmed',
  defaultProviderId: 'anthropic',
  errorMessage: 'Sorry, I ran into a problem generating a response. Please try again in a moment. If this keeps happening, contact your administrator.',
};

const DEFAULT_PROVIDERS: ApiProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    color: '#d4724a',
    apiKey: '',
    isActive: true,
    defaultModel: 'claude-3-7-sonnet-20250219',
    models: [
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.075 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, costPer1kInput: 0.0008, costPer1kOutput: 0.004 },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    color: '#10a37f',
    apiKey: '',
    isActive: false,
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0.005, costPer1kOutput: 0.015 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
      { id: 'o1-preview', name: 'o1 Preview', contextWindow: 128000, costPer1kInput: 0.015, costPer1kOutput: 0.060 },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    color: '#4285f4',
    apiKey: '',
    isActive: false,
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1000000, costPer1kInput: 0.000075, costPer1kOutput: 0.0003 },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 2000000, costPer1kInput: 0.00125, costPer1kOutput: 0.005 },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#3b82f6',
    apiKey: '',
    isActive: false,
    defaultModel: 'meta-llama/llama-3.1-70b-instruct',
    models: [
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', contextWindow: 128000, costPer1kInput: 0.00052, costPer1kOutput: 0.00052 },
      { id: 'mistralai/mistral-large-2407', name: 'Mistral Large', contextWindow: 128000, costPer1kInput: 0.002, costPer1kOutput: 0.006 },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    color: '#8b5cf6',
    apiKey: '',
    isActive: false,
    defaultModel: 'llama-3-8b',
    baseUrl: 'https://api.your-custom-endpoint.com/v1/chat/completions',
    models: [
      { id: 'llama-3-8b', name: 'Llama 3 8B Local', contextWindow: 8192, costPer1kInput: 0, costPer1kOutput: 0 },
    ],
  }
];

const DEFAULT_TOOL_ACCESS: Record<string, ToolAccessConfig> = {
  chat:           { enabled: true, roles: ['admin', 'manager', 'employee'], rateLimit: 100 },
  research:       { enabled: true, roles: ['admin', 'manager'],             rateLimit: 30 },
  code_assistant: { enabled: true, roles: ['admin', 'employee'],            rateLimit: 80 },
  summarization:  { enabled: true, roles: ['admin', 'manager', 'employee'], rateLimit: 150 },
};

const DEFAULT_ROLES: Record<string, Permission[]> = {
  admin:    ['chat', 'research', 'code_assistant', 'summarization', 'admin_panel', 'user_management', 'system_settings'],
  manager:  ['chat', 'research', 'summarization'],
  employee: ['chat', 'summarization'],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeView: 'chat',
      activeTool: 'chat',
      conversations: [],
      activeConversationId: null,
      uploadedFiles: [],
      isSidebarCollapsed: false,
      users: [],
      isTyping: false,
      serverError: null,
      isPasswordModalOpen: false,
      aiConfig: DEFAULT_AI_CONFIG,
      providers: DEFAULT_PROVIDERS,
      selectedProviderId: 'anthropic',
      selectedModelId: 'claude-3-7-sonnet-20250219',
      toolAccess: DEFAULT_TOOL_ACCESS,
      roles: DEFAULT_ROLES,

      setServerError: (err) => set({ serverError: err }),
      setIsPasswordModalOpen: (val) => set({ isPasswordModalOpen: val }),
      setActiveView: (view) => set({ activeView: view }),
      setActiveTool: (tool) => set({ activeTool: tool }),

      setSelectedProvider: (id) => {
        set((state) => {
          const provider = state.providers.find((p) => p.id === id);
          return { selectedProviderId: id, selectedModelId: provider?.defaultModel ?? '' };
        });
      },
      setSelectedModel: (id) => set({ selectedModelId: id }),

      updateProvider: (id, patch) => {
        set((state) => {
          const newProviders = state.providers.map((p) => (p.id === id ? { ...p, ...patch } : p));
          const updates: Partial<AppState> = { providers: newProviders };
          if (state.selectedProviderId === id && patch.defaultModel !== undefined) {
             updates.selectedModelId = patch.defaultModel;
          }
          return updates;
        });
      },

      createConversation: (tool) => {
        const id = generateId();
        const conversation: Conversation = {
          id,
          title: 'New conversation',
          tool,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: (conversationId, message) => {
        const id = generateId();
        const newMessage: Message = { ...message, id, timestamp: new Date() };
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const updated = { ...c, messages: [...c.messages, newMessage], updatedAt: new Date() };
            if (c.messages.length === 0 && message.role === 'user') {
              updated.title = message.content.slice(0, 45) + (message.content.length > 45 ? '…' : '');
            }
            return updated;
          }),
        }));
      },

      truncateToLastUser: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const msgs = [...c.messages];
            while (msgs.length && msgs[msgs.length - 1].role === 'assistant') msgs.pop();
            return { ...c, messages: msgs };
          }),
        }));
      },

      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          const newActive = state.activeConversationId === id
            ? (filtered[0]?.id ?? null)
            : state.activeConversationId;
          return { conversations: filtered, activeConversationId: newActive };
        });
        // Fire-and-forget server sync with reload on fail
        const token = useAuthStore.getState().token;
        if (token) {
          fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'conversation.delete', id }),
          })
          .then(res => { if (!res.ok) throw new Error('Bad response'); })
          .catch(() => {
            toast.error("Couldn't sync, retrying");
            get().loadConversations();
          });
        }
      },

      renameConversation: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        }));
        // Fire-and-forget server sync with reload on fail
        const token = useAuthStore.getState().token;
        if (token) {
          fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'conversation.rename', id, title }),
          })
          .then(res => { if (!res.ok) throw new Error('Bad response'); })
          .catch(() => {
            toast.error("Couldn't sync, retrying");
            get().loadConversations();
          });
        }
      },

      addFile: (file) => {
        const id = generateId();
        const newFile: UploadedFile = { ...file, id, uploadedAt: new Date(), status: 'error' };
        set((state) => ({ uploadedFiles: [newFile, ...state.uploadedFiles] }));
        alert('File parsing is currently disabled (coming soon).');
      },

      deleteFile: (id) => {
        set((state) => ({ uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id) }));
      },

      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      setIsTyping: (val) => set({ isTyping: val }),

      updateUser: (user) => {
        set((state) => ({ users: state.users.map((u) => (u.id === user.id ? user : u)) }));
      },

      addUser: (user) => {
        set((state) => ({ users: [...state.users, user] }));
      },

      disableUser: (id) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, isActive: false } : u)),
        }));
      },

      deleteUser: (id) => {
        set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
      },

      loadUsers: async () => {
        if (!useAuthStore.getState().token) return;
        set({ serverError: null });
        try {
          const res = await apiFetch({ action: 'users.list' });
          if (!res.ok) throw new Error('Bad response');
          const data = await res.json();
          if (data.users) set({ users: data.users });
        } catch {
          set({ serverError: "Couldn't reach server." });
        }
      },

      loadConversations: async () => {
        if (!useAuthStore.getState().token) return;
        set({ serverError: null });
        try {
          const res = await apiFetch({ action: 'conversations.list' });
          if (!res.ok) throw new Error('Bad response');
          const data = await res.json();
          if (data.conversations) {
            const convos = data.conversations.map((c: any) => ({
              ...c,
              createdAt: new Date(c.createdAt),
              updatedAt: new Date(c.updatedAt),
              messages: (c.messages ?? []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
            }));
            set((state) => ({
              conversations: convos,
              // Auto-select the most recent conversation if nothing is currently selected
              activeConversationId:
                state.activeConversationId ?? (convos[0]?.id ?? null),
            }));
          }
        } catch {
          set({ serverError: "Couldn't reach server." });
        }
      },

      loadMessages: async (conversationId: string) => {
        if (!useAuthStore.getState().token) return;
        set({ serverError: null });
        try {
          const res = await apiFetch({ action: 'messages.list', conversation_id: conversationId });
          if (!res.ok) throw new Error('Bad response');
          const data = await res.json();
          if (data.messages) {
            set((state) => {
              const messages = data.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
              return {
                conversations: state.conversations.map((c) =>
                  c.id === conversationId ? { ...c, messages } : c
                )
              };
            });
          }
        } catch {
          set({ serverError: "Couldn't reach server." });
        }
      },

      loadConfig: async () => {
        if (!useAuthStore.getState().token) return;
        set({ serverError: null });
        try {
          const res = await apiFetch({ action: 'config.get' });
          if (!res.ok) throw new Error('Bad response');
          const data = await res.json();
          if (data.config && Object.keys(data.config).length > 0) {
            set((state) => {
              const newProviders: ApiProvider[] = data.config.providers ?? state.providers;
              const isActive = (id?: string) =>
                !!id && newProviders.some((p) => p.id === id && p.isActive);

              // Keep the user's own selection when that provider is still active.
              // Only fall back to the admin's global default — and then to the first
              // active provider — when the current selection is no longer valid.
              // This prevents loadConfig() from resetting the chat back to the
              // default provider every time it runs (e.g. on each login).
              let nextProviderId = state.selectedProviderId;
              if (!isActive(nextProviderId)) {
                if (isActive(data.config.defaultProviderId)) {
                  nextProviderId = data.config.defaultProviderId;
                } else {
                  const firstActive = newProviders.find((p) => p.isActive);
                  if (firstActive) nextProviderId = firstActive.id;
                }
              }

              const providerMatch = newProviders.find((p) => p.id === nextProviderId);

              // Preserve the user's chosen model when the provider hasn't changed
              // (covers custom model ids that aren't in the listed models). Otherwise
              // adopt the selected provider's default model.
              let nextModelId = state.selectedModelId;
              const keepModel =
                (nextProviderId === state.selectedProviderId && !!nextModelId) ||
                !!providerMatch?.models.some((m) => m.id === nextModelId);
              if (!keepModel) {
                nextModelId = providerMatch ? providerMatch.defaultModel : state.selectedModelId;
              }

              return {
                aiConfig: { ...state.aiConfig, ...data.config },
                providers: newProviders,
                selectedProviderId: nextProviderId,
                selectedModelId: nextModelId,
                toolAccess: data.config.toolAccess ?? state.toolAccess,
                roles: data.config.roles ?? state.roles,
              };
            });
          }
        } catch {
          set({ serverError: "Couldn't reach server." });
        }
      },

      updateAIConfig: (config) => {
        set((state) => ({ aiConfig: { ...state.aiConfig, ...config } }));
      },

      updateToolAccess: (toolAccess) => set({ toolAccess }),
      updateRoles: (roles) => set({ roles }),

      resetUserState: () => {
        set({ conversations: [], activeConversationId: null, users: [] });
      },
    }),
    {
      name: 'nucleus-app',
      partialize: (state) => ({
        // conversations and activeConversationId are NOT persisted — loaded from MySQL on login
        aiConfig: state.aiConfig,
        isSidebarCollapsed: state.isSidebarCollapsed,
        providers: state.providers,
        selectedProviderId: state.selectedProviderId,
        selectedModelId: state.selectedModelId,
        toolAccess: state.toolAccess,
        roles: state.roles,
      }),
    }
  )
);
