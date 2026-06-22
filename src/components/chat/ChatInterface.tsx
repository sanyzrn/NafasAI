import { useEffect, useRef, useState } from 'react';
import { Send, Plus, StopCircle, Copy, ThumbsUp, ThumbsDown, RotateCcw, Check, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore, ProviderId } from '../../store/appStore';
import { apiFetch } from '../../utils/api';
import { cn } from '../../utils/cn';

function NafasIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="white" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 px-6 py-3">
      <div className="w-7 h-7 rounded-full bg-[#b61615] flex items-center justify-center flex-shrink-0 mt-0.5">
        <NafasIcon />
      </div>
      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#1a1a1a] px-4 py-3 rounded-2xl rounded-tl-sm border border-transparent dark:border-[#2a2a2a]">
        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#4b5563] rounded-full pulse-dot" />
        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#4b5563] rounded-full pulse-dot" />
        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#4b5563] rounded-full pulse-dot" />
      </div>
    </div>
  );
}

import ReactMarkdown from 'react-markdown';

function MessageBubble({ message, isLast, onRegenerate }: {
  message: { id: string; role: string; content: string; timestamp: Date };
  isLast: boolean;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('group px-6 py-2 fade-in', isUser ? 'flex justify-end' : 'flex gap-3')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#b61615] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <NafasIcon />
        </div>
      )}
      <div className={cn('max-w-[80%]', isUser ? 'max-w-[72%]' : 'flex-1')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-[#111111] dark:bg-[#1a1a1a] text-white rounded-tr-sm border border-[#222] dark:border-[#2a2a2a]'
              : 'bg-gray-100 dark:bg-[#161616] text-gray-900 dark:text-[#e5e7eb] rounded-tl-sm border border-gray-200 dark:border-[#1f1f1f] markdown-body'
          )}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {!isUser && (
          <div className="flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 dark:text-[#4b5563] hover:text-gray-700 dark:hover:text-[#9ca3af] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => setLiked(true)}
              className={cn('p-1 rounded-md transition', liked === true ? 'text-[#b61615]' : 'text-gray-400 dark:text-[#4b5563] hover:text-gray-700 dark:hover:text-[#9ca3af] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]')}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => setLiked(false)}
              className={cn('p-1 rounded-md transition', liked === false ? 'text-[#b61615]' : 'text-gray-400 dark:text-[#4b5563] hover:text-gray-700 dark:hover:text-[#9ca3af] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]')}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                title="Regenerate response"
                className="p-1 rounded-md text-gray-400 dark:text-[#4b5563] hover:text-gray-700 dark:hover:text-[#9ca3af] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 dark:text-[#374151] mt-1 px-1">
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

const STARTER_PROMPTS = [
  { text: 'Summarize our latest quarterly report', category: 'Analysis' },
  { text: 'Help me write a professional email to the team', category: 'Writing' },
  { text: 'Analyze trends in customer feedback data', category: 'Research' },
  { text: 'Create a project proposal outline', category: 'Planning' },
];

export default function ChatInterface() {
  const { currentUser } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    createConversation,
    setActiveConversation,
    addMessage,
    isTyping,
    setIsTyping,
    aiConfig,
    providers,
    selectedProviderId,
    selectedModelId,
    setSelectedProvider,
    setSelectedModel,
    loadMessages,
    truncateToLastUser,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  const activeProviders = providers.filter((p) => p.isActive);
  const currentProvider = providers.find((p) => p.id === selectedProviderId);
  const currentModel = currentProvider?.models.find((m) => m.id === selectedModelId);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    if (activeConversationId && activeConversation?.messages.length === 0) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, activeConversation?.messages.length, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!showModelPicker) return;
    const onDown = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showModelPicker]);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  // Shared generation routine used by both initial sends and regeneration.
  const runGeneration = async (
    convId: string,
    apiMessages: { role: string; content: string }[],
    conversationTitle: string,
  ) => {
    setIsGenerating(true);
    setIsTyping(true);
    abortControllerRef.current = new AbortController();

    try {
      const res = await apiFetch({
        action: 'chat',
        conversationId: convId,
        tool: 'chat',
        conversationTitle,
        messages: apiMessages,
        provider: selectedProviderId || 'anthropic',
        model: selectedModelId || 'claude-3-7-sonnet-20250219',
        system: aiConfig.systemPrompt,
        maxTokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        tone: aiConfig.tone,
        verbosity: aiConfig.verbosity,
      }, { signal: abortControllerRef.current.signal });

      const data = await res.json();
      setIsTyping(false);

      if (!res.ok) {
        addMessage(convId, {
          role: 'assistant',
          content: `⚠️ ${data.error ?? 'An error occurred. Please try again.'}`,
        });
      } else {
        addMessage(convId, {
          role: 'assistant',
          content: data.content,
          tokens: data.usage?.output_tokens,
        });
      }
    } catch (err) {
      setIsTyping(false);
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User stopped generation — no error message needed
      } else {
        addMessage(convId, {
          role: 'assistant',
          content: '⚠️ Connection error. Ensure api.php is deployed and config.php is configured.',
        });
      }
    } finally {
      setIsGenerating(false);
      setIsTyping(false);
    }
  };

  const handleSend = async (content?: string) => {
    const text = (content ?? input).trim();
    if (!text || isGenerating) return;

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation('chat');
      setActiveConversation(convId);
    }

    // Snapshot existing messages before adding the new one
    const existingMessages = conversations.find((c) => c.id === convId)?.messages ?? [];
    const apiMessages = [
      ...existingMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];

    // Derive title for new conversations (first message becomes the title)
    const isFirstMessage  = existingMessages.length === 0;
    const conversationTitle = isFirstMessage
      ? text.slice(0, 45) + (text.length > 45 ? '…' : '')
      : (conversations.find((c) => c.id === convId)?.title ?? 'New conversation');

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    addMessage(convId, { role: 'user', content: text });

    await runGeneration(convId, apiMessages, conversationTitle);
  };

  // Re-run the model on the last user message, replacing the previous answer.
  const handleRegenerate = async () => {
    if (isGenerating || !activeConversationId) return;
    const conv = conversations.find((c) => c.id === activeConversationId);
    if (!conv) return;

    const trimmed = [...conv.messages];
    while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant') trimmed.pop();
    if (trimmed.length === 0) return;

    truncateToLastUser(activeConversationId);
    const apiMessages = trimmed.map((m) => ({ role: m.role, content: m.content }));
    await runGeneration(activeConversationId, apiMessages, conv.title);
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const usagePercent = currentUser && currentUser.dailyRequestLimit > 0
    ? Math.round((currentUser.requestsUsed / currentUser.dailyRequestLimit) * 100)
    : null;

  const totalTokens = messages.reduce((acc, m) => acc + (m.tokens ?? 0), 0);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 dark:border-[#1a1a1a] gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {activeConversation?.title ?? 'New conversation'}
          </h2>
          {messages.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-[#374151] hidden md:block flex-shrink-0">
              {messages.length} msg{totalTokens > 0 ? ` · ${totalTokens} tkn` : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Model picker */}
          <div className="relative" ref={modelPickerRef}>
            <button
              onClick={() => setShowModelPicker((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#1f1f1f] text-xs font-medium text-gray-600 dark:text-[#9ca3af] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentProvider?.color ?? '#6b7280' }}
              />
              <span className="hidden sm:block max-w-[100px] truncate">{currentModel?.name ?? selectedModelId ?? 'Select model'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showModelPicker && (
              <div className="absolute right-0 top-9 z-50 w-60 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-xl py-1.5 overflow-hidden">
                {activeProviders.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400 dark:text-[#4b5563]">
                    No providers active — go to Admin → API Providers.
                  </p>
                ) : (
                  activeProviders.map((p) => {
                    // Inject selectedModelId and defaultModel if they are not in the provider's models array
                    const renderedModels = [...p.models];
                    if (p.defaultModel && !renderedModels.some(m => m.id === p.defaultModel)) {
                      renderedModels.push({ id: p.defaultModel, name: p.defaultModel, contextWindow: 0, costPer1kInput: 0, costPer1kOutput: 0 });
                    }
                    if (selectedProviderId === p.id && selectedModelId && !renderedModels.some(m => m.id === selectedModelId)) {
                      renderedModels.push({ id: selectedModelId, name: selectedModelId, contextWindow: 0, costPer1kInput: 0, costPer1kOutput: 0 });
                    }

                    return (
                      <div key={p.id}>
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">{p.name}</span>
                        </div>
                        {renderedModels.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedProvider(p.id as ProviderId); setSelectedModel(m.id); setShowModelPicker(false); }}
                            className={cn(
                              'flex items-center justify-between w-full px-4 py-1.5 text-xs transition',
                              selectedModelId === m.id
                                ? 'text-[#b61615] bg-[#b61615]/8'
                                : 'text-gray-700 dark:text-[#d1d5db] hover:bg-gray-50 dark:hover:bg-white/5'
                            )}
                          >
                            <span>{m.name}</span>
                            {m.contextWindow > 0 && <span className="text-gray-400 dark:text-[#374151]">{(m.contextWindow / 1000).toFixed(0)}K</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Usage bar */}
          {usagePercent !== null && (
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-xs text-gray-400 dark:text-[#4b5563]">
                {currentUser?.requestsUsed}/{currentUser?.dailyRequestLimit}
              </span>
              <div className="w-16 h-1 bg-gray-200 dark:bg-[#1f1f1f] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(usagePercent, 100)}%`,
                    backgroundColor: usagePercent > 80 ? '#b61615' : '#4b5563',
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => setActiveConversation(null)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#6b7280] border border-gray-200 dark:border-[#1f1f1f] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 pb-16">
            <div className="w-12 h-12 rounded-2xl bg-[#b61615] flex items-center justify-center mb-5 shadow-lg shadow-[#b61615]/20">
              <NafasIcon size={20} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">How can I help you?</h3>
            <p className="text-sm text-gray-400 dark:text-[#4b5563] mb-8 text-center max-w-xs">
              I'm your AI assistant for {currentUser?.department ?? 'your team'}. Ask me anything.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => handleSend(prompt.text)}
                  className="text-left px-4 py-3.5 rounded-xl border border-gray-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] hover:border-[#b61615]/40 hover:bg-[#b61615]/5 dark:hover:border-[#b61615]/30 dark:hover:bg-[#b61615]/5 text-sm text-gray-700 dark:text-[#d1d5db] transition group"
                >
                  <div className="text-xs text-gray-400 dark:text-[#4b5563] mb-1 group-hover:text-[#b61615] transition">{prompt.category}</div>
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 max-w-3xl mx-auto w-full">
            {messages.map((message, idx) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={idx === messages.length - 1 && message.role === 'assistant'}
                onRegenerate={handleRegenerate}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 dark:border-[#1a1a1a] px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl px-4 py-3 focus-within:border-[#b61615]/50 dark:focus-within:border-[#b61615]/40 focus-within:ring-2 focus-within:ring-[#b61615]/10 transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Message Nafas AI…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#374151] focus:outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto leading-6"
              style={{ overflow: 'hidden' }}
            />
            {isGenerating ? (
              <button
                onClick={handleStop}
                className="flex-shrink-0 p-1.5 rounded-lg bg-gray-200 dark:bg-[#1f1f1f] text-gray-600 dark:text-[#6b7280] hover:bg-gray-300 dark:hover:bg-[#2a2a2a] transition mb-0.5"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className={cn(
                  'flex-shrink-0 p-1.5 rounded-lg transition mb-0.5',
                  input.trim()
                    ? 'bg-[#b61615] hover:bg-[#9c1110] text-white shadow-sm'
                    : 'bg-gray-200 dark:bg-[#1f1f1f] text-gray-400 dark:text-[#374151] cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-[#2a2a2a] text-center mt-2">
            {currentModel?.name ?? selectedModelId}{currentProvider ? ` · ${currentProvider.name}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
