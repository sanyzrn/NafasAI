import { useState, useRef } from 'react';
import { Search, Globe, BookOpen, Newspaper, Building2, Layers, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { apiFetch } from '../../utils/api';
import { cn } from '../../utils/cn';

type Source = 'web' | 'academic' | 'news' | 'internal';
type Depth = 'quick' | 'standard' | 'deep';

const SOURCE_CONFIG: Record<Source, { label: string; icon: React.ElementType; color: string }> = {
  web:      { label: 'Web',      icon: Globe,      color: 'text-blue-500'    },
  academic: { label: 'Academic', icon: BookOpen,   color: 'text-purple-500'  },
  news:     { label: 'News',     icon: Newspaper,  color: 'text-amber-500'   },
  internal: { label: 'Internal', icon: Building2,  color: 'text-emerald-500' },
};

const DEPTH_CONFIG: Record<Depth, { label: string; time: string; maxTokens: number }> = {
  quick:    { label: 'Quick',    time: '~10s', maxTokens: 1024 },
  standard: { label: 'Standard', time: '~20s', maxTokens: 2048 },
  deep:     { label: 'Deep',     time: '~45s', maxTokens: 4096 },
};

export default function DeepSearchView() {
  const { selectedProviderId, selectedModelId, createConversation, addMessage } = useAppStore();
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<Source[]>(['web', 'academic']);
  const [depth, setDepth] = useState<Depth>('standard');
  const [loading, setLoading] = useState(false);
  const [synthesis, setSynthesis] = useState('');
  const [searchTime, setSearchTime] = useState(0);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSource = (s: Source) => {
    setSources((prev) =>
      prev.includes(s) ? (prev.length > 1 ? prev.filter((x) => x !== s) : prev) : [...prev, s]
    );
  };

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setSynthesis('');
    setError('');
    const start = Date.now();

    const sourceList = sources.map((s) => SOURCE_CONFIG[s].label).join(', ');
    const depthInstruction =
      depth === 'quick'
        ? 'Be concise — cover the key points in 2–3 paragraphs.'
        : depth === 'deep'
        ? 'Be comprehensive — cover multiple angles, nuances, implications, and provide structured sections with headers.'
        : 'Provide a balanced analysis covering the main aspects in 3–5 paragraphs.';

    // Context lives in the system prompt so the stored user message stays clean
    const systemPrompt =
      `You are an expert research assistant. Synthesize your knowledge to provide thorough, accurate, well-structured analysis. Use clear formatting (headers, bullet points) where appropriate.\n\nResearch configuration — Sources: ${sourceList} · Depth: ${depth}\n${depthInstruction}`;

    // Create a conversation now so it appears in history immediately
    const convId = createConversation('research');
    const convTitle = query.slice(0, 45) + (query.length > 45 ? '…' : '');
    addMessage(convId, { role: 'user', content: query });

    try {
      abortRef.current = new AbortController();
      const res = await apiFetch({
        action: 'chat',
        conversationId: convId,
        tool: 'research',
        conversationTitle: convTitle,
        messages: [{ role: 'user', content: query }],
        provider: selectedProviderId || 'anthropic',
        model: selectedModelId,
        system: systemPrompt,
        maxTokens: DEPTH_CONFIG[depth].maxTokens,
      }, { signal: abortRef.current.signal });

      setSearchTime(parseFloat(((Date.now() - start) / 1000).toFixed(1)));
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Research failed. Please try again.');
      } else {
        const result = data.content ?? '';
        setSynthesis(result);
        addMessage(convId, { role: 'assistant', content: result, tokens: data.usage?.output_tokens });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Connection failed. Check your API configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-4 md:px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Deep Research</h1>
        <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">
          AI-powered research synthesis
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Notice about simulation */}
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-[#111111] border border-gray-100 dark:border-[#1f1f1f]">
            <Sparkles className="w-5 h-5 text-gray-400 dark:text-[#6b7280] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-[#d1d5db]">Simulated Research Mode</p>
              <p className="text-xs text-gray-500 dark:text-[#6b7280] mt-1 leading-relaxed">
                This tool synthesizes information strictly from the model's fixed training data. Real-time web, news, and academic sources are simulated concepts and do not fetch live internet results.
              </p>
            </div>
          </div>

          {/* Search box */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 dark:text-[#374151]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="What do you want to research?"
              className="w-full pl-12 pr-28 py-4 text-base rounded-2xl border-2 border-gray-100 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-[#374151] focus:outline-none focus:border-[#b61615]/60 focus:ring-4 focus:ring-[#b61615]/8 transition"
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim() || loading}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition',
                query.trim() && !loading
                  ? 'bg-[#b61615] hover:bg-[#9c1110] text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 dark:text-[#374151] cursor-not-allowed'
              )}
            >
              {loading ? <span className="animate-pulse">…</span> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Source + depth controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 dark:text-[#4b5563]">Sources:</span>
              {(Object.keys(SOURCE_CONFIG) as Source[]).map((s) => {
                const { label, icon: Icon } = SOURCE_CONFIG[s];
                const active = sources.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSource(s)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition',
                      active
                        ? 'border-[#b61615]/25 bg-[#b61615]/8 text-[#b61615]'
                        : 'border-gray-100 dark:border-[#1f1f1f] text-gray-400 dark:text-[#4b5563] hover:border-gray-200 dark:hover:border-[#2a2a2a]'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Layers className="w-3.5 h-3.5 text-gray-400 dark:text-[#4b5563]" />
              {(Object.keys(DEPTH_CONFIG) as Depth[]).map((d) => {
                const { label, time } = DEPTH_CONFIG[d];
                return (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition',
                      depth === d
                        ? 'border-[#b61615]/25 bg-[#b61615]/8 text-[#b61615]'
                        : 'border-gray-100 dark:border-[#1f1f1f] text-gray-400 dark:text-[#4b5563] hover:border-gray-200 dark:hover:border-[#2a2a2a]'
                    )}
                  >
                    {label} <span className="opacity-50">{time}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="mt-8 space-y-3">
              {['Analyzing topic…', 'Synthesizing knowledge…', 'Generating research report…'].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      i === 0 ? 'border-[#b61615] animate-spin border-t-transparent' : 'border-gray-200 dark:border-[#2a2a2a]'
                    )}
                  />
                  <span className={cn('text-sm', i === 0 ? 'text-gray-700 dark:text-[#d1d5db]' : 'text-gray-300 dark:text-[#374151]')}>
                    {step}
                  </span>
                </div>
              ))}
              <div className="h-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-[#b61615]/30 rounded-full shimmer" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="mt-6 p-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Synthesis result */}
          {synthesis && !loading && (
            <div className="mt-6 space-y-4 fade-in">
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-[#4b5563]">
                <Clock className="w-3.5 h-3.5" />
                <span>{searchTime}s</span>
                <span>·</span>
                <span>{sources.map((s) => SOURCE_CONFIG[s].label).join(', ')}</span>
                <span>·</span>
                <span>{depth}</span>
              </div>

              <div className="rounded-xl border border-[#b61615]/20 bg-[#b61615]/4 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#b61615]" />
                  <span className="text-xs font-semibold text-[#b61615] uppercase tracking-wider">AI Research Synthesis</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-[#d1d5db] leading-relaxed whitespace-pre-wrap">{synthesis}</div>
              </div>

              <p className="text-xs text-gray-300 dark:text-[#374151] text-center">
                Based on AI training knowledge · Real-time web search requires additional API configuration
              </p>
            </div>
          )}

          {/* Empty state */}
          {!synthesis && !loading && !error && (
            <div className="mt-16 text-center">
              <Search className="w-10 h-10 text-gray-200 dark:text-[#1f1f1f] mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400 dark:text-[#4b5563]">Enter a query to start researching</p>
              <p className="text-xs text-gray-300 dark:text-[#2a2a2a] mt-1">
                Claude synthesizes knowledge across topics and domains
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
