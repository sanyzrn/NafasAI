import { useState } from 'react';
import {
  Settings, Save, Globe, Database, Cpu, MessageSquare, Sliders, RotateCcw
} from 'lucide-react';
import { useAppStore, AITone, AIVerbosity } from '../../store/appStore';
import { apiFetch } from '../../utils/api';
import { cn } from '../../utils/cn';

const SECTIONS = [
  { id: 'ai', title: 'AI Behavior', icon: Cpu, description: 'System prompt, personality and model settings' },
  { id: 'general', title: 'General', icon: Globe, description: 'Platform name and branding' },
  { id: 'data', title: 'Data & Privacy', icon: Database, description: 'Retention and data policies' },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={cn(
        'w-10 h-5.5 rounded-full transition-all cursor-pointer flex-shrink-0 relative',
        value ? 'bg-[#b61615]' : 'bg-gray-200 dark:bg-[#2a2a2a]'
      )}
      style={{ width: 40, height: 22 }}
    >
      <div
        className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all"
        style={{ width: 18, height: 18, left: value ? 18 : 2, top: 2 }}
      />
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 dark:border-[#1a1a1a] last:border-0 gap-8">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition';
const selectCls = inputCls + ' appearance-none cursor-pointer';
const smInputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition';

const TONE_OPTIONS: { value: AITone; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Formal, structured responses' },
  { value: 'casual', label: 'Casual', desc: 'Friendly, conversational tone' },
  { value: 'technical', label: 'Technical', desc: 'Precise, detail-oriented' },
  { value: 'creative', label: 'Creative', desc: 'Imaginative and expressive' },
];

const VERBOSITY_OPTIONS: { value: AIVerbosity; label: string; desc: string }[] = [
  { value: 'concise', label: 'Concise', desc: 'Brief, to the point' },
  { value: 'balanced', label: 'Balanced', desc: 'Standard response length' },
  { value: 'detailed', label: 'Detailed', desc: 'Thorough, comprehensive' },
];

export default function SystemSettings() {
  const { aiConfig, updateAIConfig } = useAppStore();
  const [activeSection, setActiveSection] = useState('ai');
  const [saved, setSaved] = useState(false);

  const [localPlatformName, setLocalPlatformName] = useState(aiConfig.platformName);
  const [localCompanyName, setLocalCompanyName] = useState(aiConfig.companyName);

  const handleSave = async () => {
    const merged = { ...aiConfig, platformName: localPlatformName, companyName: localCompanyName };
    updateAIConfig({ platformName: localPlatformName, companyName: localCompanyName });
    try {
      await apiFetch({ action: 'config.save', config: merged });
    } catch {
      // Silent — config persisted to localStorage as fallback
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeS = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] dark:bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 text-[#9ca3af]" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-[#4b5563] ml-10">Configure platform and AI behavior</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateAIConfig({
                systemPrompt: `You are Nafas AI, an intelligent assistant deployed for internal use at Nafas Zist Pharmed. Your role is to help employees work more efficiently and effectively.\n\nGuidelines:\n- Always maintain a professional, respectful tone\n- Provide accurate, well-structured responses\n- Clearly state your limitations rather than guessing\n- Prioritize clarity and actionability in your responses`,
                temperature: 0.7, tone: 'professional', verbosity: 'balanced'
              })}
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-[#6b7280] border border-gray-200 dark:border-[#2a2a2a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset AI
            </button>
            <button
              onClick={handleSave}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#b61615] hover:bg-[#9c1110] text-white'
              )}
            >
              <Save className="w-4 h-4" />
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <nav className="w-52 flex-shrink-0 border-r border-gray-100 dark:border-[#1a1a1a] py-4 px-3 space-y-0.5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  activeSection === section.id
                    ? 'bg-[#b61615]/10 text-[#b61615]'
                    : 'text-gray-600 dark:text-[#6b7280] hover:bg-gray-50 dark:hover:bg-[#111111] hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {section.title}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{activeS?.title}</h2>
              <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">{activeS?.description}</p>
            </div>

            {/* ——— AI BEHAVIOR ——— */}
            {activeSection === 'ai' && (
              <div className="space-y-5">
                {/* System Prompt */}
                <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-[#b61615]" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">System Prompt</h3>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-[#4b5563] mb-3 leading-relaxed">
                    Define how Nafas AI should behave, its persona, and rules for all employees. This prompt is prepended to every conversation.
                  </p>
                  <textarea
                    value={aiConfig.systemPrompt}
                    onChange={(e) => updateAIConfig({ systemPrompt: e.target.value })}
                    rows={8}
                    placeholder="You are Nafas AI, an internal assistant for Nafas Zist Pharmed..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#0d0d0d] text-sm text-gray-900 dark:text-[#e5e7eb] placeholder-gray-400 dark:placeholder-[#374151] focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition font-mono leading-relaxed resize-none"
                    style={{ resize: 'vertical' }}
                  />
                  <p className="text-xs text-gray-400 dark:text-[#374151] mt-2">
                    {aiConfig.systemPrompt.length} characters · {Math.ceil(aiConfig.systemPrompt.length / 4)} approx tokens
                  </p>
                </div>

                {/* Error / fallback message */}
                <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-[#b61615]" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Error / Apology Message</h3>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-[#4b5563] mb-3 leading-relaxed">
                    Shown to users whenever a response fails for any reason. The real technical
                    cause is never shown to them — it is recorded in <span className="font-medium text-gray-600 dark:text-[#9ca3af]">Admin → System Logs</span>.
                  </p>
                  <textarea
                    value={aiConfig.errorMessage ?? ''}
                    onChange={(e) => updateAIConfig({ errorMessage: e.target.value })}
                    rows={3}
                    placeholder="Sorry, something went wrong. Please try again…"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#0d0d0d] text-sm text-gray-900 dark:text-[#e5e7eb] placeholder-gray-400 dark:placeholder-[#374151] focus:outline-none focus:ring-2 focus:ring-[#b61615]/30 focus:border-[#b61615] transition leading-relaxed"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Generation Settings */}
                <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] px-5 py-2">
                  <SettingRow label="Max Output Tokens" description="Maximum response length">
                    <select
                      value={aiConfig.maxTokens}
                      onChange={(e) => updateAIConfig({ maxTokens: parseInt(e.target.value) })}
                      className={cn(selectCls, 'w-32')}
                    >
                      <option value={2048}>2,048</option>
                      <option value={4096}>4,096</option>
                      <option value={8192}>8,192</option>
                      <option value={16384}>16,384</option>
                    </select>
                  </SettingRow>
                </div>

                {/* Personality */}
                <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sliders className="w-4 h-4 text-[#b61615]" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Personality & Style</h3>
                  </div>

                  {/* Creativity / Temperature */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-700 dark:text-[#9ca3af] uppercase tracking-wider">
                        Creativity
                      </label>
                      <span className="text-sm font-semibold text-[#b61615]">{aiConfig.temperature.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={aiConfig.temperature}
                      onChange={(e) => updateAIConfig({ temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400 dark:text-[#374151]">Precise</span>
                      <span className="text-xs text-gray-400 dark:text-[#374151]">Balanced</span>
                      <span className="text-xs text-gray-400 dark:text-[#374151]">Creative</span>
                    </div>
                  </div>

                  {/* Tone */}
                  <div className="mb-6">
                    <label className="text-xs font-medium text-gray-700 dark:text-[#9ca3af] uppercase tracking-wider block mb-3">
                      Response Tone
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TONE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateAIConfig({ tone: opt.value })}
                          className={cn(
                            'flex flex-col items-start px-4 py-3 rounded-lg border text-left transition',
                            aiConfig.tone === opt.value
                              ? 'border-[#b61615] bg-[#b61615]/5 dark:bg-[#b61615]/10'
                              : 'border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a]'
                          )}
                        >
                          <span className={cn('text-sm font-medium', aiConfig.tone === opt.value ? 'text-[#b61615]' : 'text-gray-800 dark:text-white')}>
                            {opt.label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Verbosity */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-[#9ca3af] uppercase tracking-wider block mb-3">
                      Response Length
                    </label>
                    <div className="flex gap-2">
                      {VERBOSITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateAIConfig({ verbosity: opt.value })}
                          className={cn(
                            'flex-1 flex flex-col items-center px-3 py-3 rounded-lg border text-center transition',
                            aiConfig.verbosity === opt.value
                              ? 'border-[#b61615] bg-[#b61615]/5 dark:bg-[#b61615]/10'
                              : 'border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a]'
                          )}
                        >
                          <span className={cn('text-sm font-medium', aiConfig.verbosity === opt.value ? 'text-[#b61615]' : 'text-gray-800 dark:text-white')}>
                            {opt.label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ——— GENERAL ——— */}
            {activeSection === 'general' && (
              <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] px-5 py-2">
                <SettingRow label="Platform Name" description="Displayed throughout the interface">
                  <input
                    value={localPlatformName}
                    onChange={(e) => setLocalPlatformName(e.target.value)}
                    className={cn(smInputCls, 'w-48')}
                  />
                </SettingRow>
                <SettingRow label="Company Name" description="Used in onboarding and emails">
                  <input
                    value={localCompanyName}
                    onChange={(e) => setLocalCompanyName(e.target.value)}
                    className={cn(smInputCls, 'w-48')}
                  />
                </SettingRow>
              </div>
            )}

            {/* ——— DATA ——— */}
            {activeSection === 'data' && (
              <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] px-5 py-2">
                <SettingRow label="Log Conversations" description="Store conversation history for auditing and analytics">
                  <Toggle value={aiConfig.logConversations} onChange={(v) => updateAIConfig({ logConversations: v })} />
                </SettingRow>
                <SettingRow label="Retention Period" description="How long conversation logs are kept">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={aiConfig.retentionDays}
                      onChange={(e) => updateAIConfig({ retentionDays: parseInt(e.target.value) || 90 })}
                      className={cn(smInputCls, 'w-20')}
                    />
                    <span className="text-sm text-gray-400 dark:text-[#4b5563]">days</span>
                  </div>
                </SettingRow>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
