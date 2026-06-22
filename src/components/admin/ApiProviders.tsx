import { useState } from 'react';
import { Key, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, Save, Zap, Globe, Plus, Trash2 } from 'lucide-react';
import { useAppStore, ApiProvider, ProviderId } from '../../store/appStore';
import { cn } from '../../utils/cn';
import { apiFetch } from '../../utils/api';

const PROVIDER_META: Record<ProviderId, { logo: string; docsUrl: string; description: string }> = {
  anthropic: {
    logo: '𝐀',
    docsUrl: 'https://console.anthropic.com',
    description: 'Claude family — best for reasoning, analysis, and long-context tasks.',
  },
  openai: {
    logo: '⬡',
    docsUrl: 'https://platform.openai.com',
    description: 'GPT-4o family — widely supported with a large plugin ecosystem.',
  },
  google: {
    logo: 'G',
    docsUrl: 'https://ai.google.dev',
    description: 'Gemini family — ultra-long context window up to 2M tokens.',
  },
  openrouter: {
    logo: '⇆',
    docsUrl: 'https://openrouter.ai',
    description: 'Unified gateway for 100+ models. One API key, all providers.',
  },
  custom: {
    logo: '⚙',
    docsUrl: '',
    description: 'Any OpenAI-compatible API endpoint (local models, private deployments).',
  },
};

function ProviderCard({ provider }: { provider: ApiProvider }) {
  const { updateProvider } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const meta = PROVIDER_META[provider.id];

  const addModel = () => {
    const id = newModelId.trim();
    if (!id) return;
    if (provider.models.some((m) => m.id === id)) {
      setNewModelId('');
      setNewModelName('');
      return;
    }
    const model = {
      id,
      name: newModelName.trim() || id,
      contextWindow: 0,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    };
    updateProvider(provider.id, { models: [...provider.models, model] });
    // Make the freshly added model the default if none is set yet.
    if (!provider.defaultModel) updateProvider(provider.id, { defaultModel: id });
    setNewModelId('');
    setNewModelName('');
  };

  const removeModel = (id: string) => {
    updateProvider(provider.id, { models: provider.models.filter((m) => m.id !== id) });
  };

  const handleTest = async () => {
    if (!provider.apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      await apiFetch({
        action: 'providers.test',
        provider: provider.id,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
      });
      setTestResult('ok');
    } catch (e) {
      setTestResult('fail');
      setTestError(e instanceof Error ? e.message : null);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      provider.isActive
        ? 'border-gray-100 dark:border-[#1f1f1f] bg-white dark:bg-[#111111]'
        : 'border-gray-100 dark:border-[#1a1a1a] bg-gray-50/50 dark:bg-[#0d0d0d]'
    )}>
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Logo circle */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: provider.color }}
        >
          {meta.logo}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{provider.name}</span>
            {provider.isActive && provider.apiKey && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5" /> Active
              </span>
            )}
            {provider.isActive && !provider.apiKey && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                No key set
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5 truncate">{meta.description}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Enable toggle */}
          <div
            onClick={(e) => { e.stopPropagation(); updateProvider(provider.id, { isActive: !provider.isActive }); }}
            className={cn(
              'relative cursor-pointer rounded-full transition-all flex-shrink-0',
              provider.isActive ? 'bg-[#b61615]' : 'bg-gray-200 dark:bg-[#2a2a2a]'
            )}
            style={{ width: 36, height: 20 }}
          >
            <div
              className="absolute top-0.5 rounded-full bg-white shadow-sm transition-all"
              style={{ width: 16, height: 16, left: provider.isActive ? 16 : 2 }}
            />
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400 dark:text-[#4b5563]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-[#4b5563]" />
          )}
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-[#1a1a1a] pt-4 space-y-4">
          {/* API Key */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-1.5 block">
              API Key
              {meta.docsUrl && (
                <a
                  href={meta.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="ml-2 text-[#b61615] hover:underline inline-flex items-center gap-0.5"
                >
                  Get key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#4b5563]" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={provider.apiKey}
                  onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                  placeholder={`Enter ${provider.name} API key…`}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#374151] focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition font-mono"
                />
              </div>
              <button
                onClick={() => setShowKey((v) => !v)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-xs text-gray-500 dark:text-[#6b7280] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={handleTest}
                disabled={!provider.apiKey.trim() || testing}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
                  provider.apiKey.trim() && !testing
                    ? 'bg-[#b61615]/10 text-[#b61615] hover:bg-[#b61615]/15 border border-[#b61615]/20'
                    : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 dark:text-[#374151] border border-gray-200 dark:border-[#2a2a2a] cursor-not-allowed'
                )}
              >
                {testing ? (
                  <><Zap className="w-3.5 h-3.5 animate-pulse" /> Testing…</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" /> Test</>
                )}
              </button>
            </div>
            {testResult && (
              <p className={cn('text-xs mt-1.5 flex items-center gap-1', testResult === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#b61615]')}>
                {testResult === 'ok'
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> Connection successful — API key is valid.</>
                  : <><XCircle className="w-3.5 h-3.5" /> {testError ?? 'Connection failed — check your API key and try again.'}</>
                }
              </p>
            )}
          </div>

          {/* Custom base URL (openrouter + custom) */}
          {(provider.id === 'openrouter' || provider.id === 'custom') && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-1.5 block">
                Base URL {provider.id === 'openrouter' && <span className="text-gray-300 dark:text-[#374151] font-normal">(pre-filled)</span>}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#4b5563]" />
                <input
                  type="url"
                  value={provider.baseUrl ?? ''}
                  onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#374151] focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition font-mono"
                />
              </div>
            </div>
          )}

          {/* Default model */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-1.5 block">Default Model</label>
            <input
              type="text"
              list={`models-${provider.id}`}
              value={provider.defaultModel}
              onChange={(e) => updateProvider(provider.id, { defaultModel: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition"
              placeholder="Select or enter model ID..."
            />
            <datalist id={`models-${provider.id}`}>
              {provider.models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </datalist>
          </div>

          {/* Models */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-2">
              Models <span className="text-gray-300 dark:text-[#374151] font-normal">· one API key, many models</span>
            </p>

            {provider.models.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-[#4b5563] py-2">No models yet — add one below.</p>
            ) : (
              <div className="space-y-1.5">
                {provider.models.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-[#1a1a1a] bg-gray-50/60 dark:bg-[#0d0d0d]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-[#d1d5db] truncate">{m.name}</p>
                      {m.name !== m.id && (
                        <p className="text-[10px] text-gray-400 dark:text-[#4b5563] font-mono truncate">{m.id}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeModel(m.id)}
                      title="Remove model"
                      className="p-1 rounded text-gray-300 dark:text-[#374151] hover:text-[#b61615] hover:bg-[#b61615]/10 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add model row */}
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModel(); } }}
                placeholder="Model ID (e.g. google/gemma-3-27b-it:free)"
                className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#374151] focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition font-mono"
              />
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModel(); } }}
                placeholder="Display name (optional)"
                className="w-40 flex-shrink-0 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#374151] focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition"
              />
              <button
                onClick={addModel}
                disabled={!newModelId.trim()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition flex-shrink-0',
                  newModelId.trim()
                    ? 'bg-[#b61615]/10 text-[#b61615] hover:bg-[#b61615]/15 border border-[#b61615]/20'
                    : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 dark:text-[#374151] border border-gray-200 dark:border-[#2a2a2a] cursor-not-allowed'
                )}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-[#4b5563] mt-2">
              Added models appear in the Default Model list and the chat model picker. Remember to click <span className="font-medium">Save</span> at the top to persist changes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiProviders() {
  const { providers, selectedProviderId, setSelectedProvider, selectedModelId, setSelectedModel, aiConfig, updateAIConfig } = useAppStore();
  const [saved, setSaved] = useState(false);

  const activeProviders = providers.filter((p) => p.isActive);
  
  // Use aiConfig.defaultProviderId if available, otherwise fallback to selectedProviderId
  const chatDefaultProviderId = aiConfig?.defaultProviderId || selectedProviderId;
  const activeProvider = providers.find((p) => p.id === chatDefaultProviderId);

  const handleSave = async () => {
    try {
      await apiFetch({
        action: 'config.save',
        config: { providers, defaultProviderId: chatDefaultProviderId }
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      alert('Failed to save config');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-4 md:px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">API Providers</h1>
            <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">
              {activeProviders.length} active · Configure keys and models for each AI provider
            </p>
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

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {/* Active provider selector */}
        {activeProviders.length > 0 && (
          <div className="bg-gray-50 dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider mb-3">
              Default Provider for Chat
            </p>
            <div className="flex flex-wrap gap-2">
              {activeProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProvider(p.id);
                    updateAIConfig({ defaultProviderId: p.id });
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition border',
                    chatDefaultProviderId === p.id
                      ? 'border-[#b61615]/30 bg-[#b61615]/8 text-[#b61615]'
                      : 'border-gray-200 dark:border-[#2a2a2a] text-gray-500 dark:text-[#6b7280] hover:border-gray-300 dark:hover:border-[#3a3a3a]'
                  )}
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {PROVIDER_META[p.id].logo}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>

            {/* Model selector for active provider */}
            {activeProvider && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#1a1a1a] flex items-center gap-3">
                <span className="text-xs text-gray-400 dark:text-[#4b5563]">Default model:</span>
                <input
                  type="text"
                  list={`active-models-${activeProvider.id}`}
                  value={selectedModelId}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    useAppStore.getState().updateProvider(activeProvider.id, { defaultModel: e.target.value });
                  }}
                  className="text-sm px-3 py-1 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#b61615]/30 focus:border-[#b61615] transition w-64"
                  placeholder="Select or enter model ID..."
                />
                <datalist id={`active-models-${activeProvider.id}`}>
                  {activeProvider.models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </datalist>
              </div>
            )}
          </div>
        )}

        {/* Provider cards */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider mb-3">
            All Providers
          </p>
          <div className="space-y-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="flex gap-3 p-4 rounded-xl bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-[#1f1f1f]">
          <div className="w-1 h-1 rounded-full bg-[#b61615] mt-2 flex-shrink-0" />
          <p className="text-xs text-gray-500 dark:text-[#6b7280] leading-relaxed">
            API keys are securely transmitted and stored encrypted in the server database. Raw keys are never returned to the browser after saving.
          </p>
        </div>
      </div>
    </div>
  );
}
