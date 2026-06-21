import { useState } from 'react';
import { Sparkles, ImageOff } from 'lucide-react';
import { cn } from '../../utils/cn';

type Style = 'photorealistic' | 'illustration' | '3d' | 'abstract' | 'anime';
type Ratio = '1:1' | '16:9' | '9:16' | '4:3';
type Quality = 'standard' | 'hd';

const STYLES: { id: Style; label: string; emoji: string }[] = [
  { id: 'photorealistic', label: 'Photo',        emoji: '📷' },
  { id: 'illustration',   label: 'Illustration', emoji: '🎨' },
  { id: '3d',             label: '3D Render',    emoji: '🧊' },
  { id: 'abstract',       label: 'Abstract',     emoji: '🌀' },
  { id: 'anime',          label: 'Anime',        emoji: '✨' },
];

const RATIOS: Ratio[] = ['1:1', '16:9', '9:16', '4:3'];

const SAMPLE_PROMPTS = [
  'Professional headshot of a diverse team in a modern office',
  'Abstract visualization of AI neural networks with glowing blue nodes',
  'Clean isometric illustration of a corporate dashboard',
  'Minimalist logo concept for a tech company — dark background, red accent',
];

export default function ImageGenView() {
  const [prompt, setPrompt]   = useState('');
  const [style, setStyle]     = useState<Style>('photorealistic');
  const [ratio, setRatio]     = useState<Ratio>('1:1');
  const [quality, setQuality] = useState<Quality>('standard');
  const [showNotice, setShowNotice] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setShowNotice(true);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-4 md:px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Image Generation</h1>
        <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">
          Generate images from text prompts using AI diffusion models
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Configuration notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
            <ImageOff className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Image Generation Not Configured</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                This feature requires an image generation provider (e.g., OpenAI DALL-E or Stability AI).
                An admin can configure one under <strong>Admin → Providers</strong>.
              </p>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-2 block">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create…"
              rows={3}
              style={{ resize: 'vertical', overflow: 'auto' }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-[#374151] focus:outline-none focus:ring-2 focus:ring-[#b61615]/25 focus:border-[#b61615] transition"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-100 dark:border-[#1f1f1f] text-gray-400 dark:text-[#4b5563] hover:border-[#b61615]/25 hover:text-[#b61615] transition truncate max-w-[200px]"
                >
                  {p.slice(0, 40)}…
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-2 block">Style</label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => setStyle(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition',
                    style === id
                      ? 'border-[#b61615]/30 bg-[#b61615]/8 text-[#b61615]'
                      : 'border-gray-100 dark:border-[#1f1f1f] text-gray-500 dark:text-[#6b7280] hover:border-gray-200 dark:hover:border-[#2a2a2a]'
                  )}
                >
                  <span>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio + Quality */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-2 block">Aspect Ratio</label>
              <div className="flex gap-1.5">
                {RATIOS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                      ratio === r
                        ? 'border-[#b61615]/30 bg-[#b61615]/8 text-[#b61615]'
                        : 'border-gray-100 dark:border-[#1f1f1f] text-gray-500 dark:text-[#6b7280] hover:border-gray-200 dark:hover:border-[#2a2a2a]'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#6b7280] mb-2 block">Quality</label>
              <div className="flex gap-1.5">
                {(['standard', 'hd'] as Quality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition capitalize',
                      quality === q
                        ? 'border-[#b61615]/30 bg-[#b61615]/8 text-[#b61615]'
                        : 'border-gray-100 dark:border-[#1f1f1f] text-gray-500 dark:text-[#6b7280] hover:border-gray-200 dark:hover:border-[#2a2a2a]'
                    )}
                  >
                    {q === 'hd' ? 'HD' : 'Standard'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={true}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 dark:text-[#374151] cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Currently Disabled (Coming Soon)
          </button>

          {/* Provider required notice (shown after clicking generate) */}
          {showNotice && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 fade-in">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">Provider Required</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                To generate images, configure an image generation API in <strong>Admin → Providers</strong>.
                Supported providers include OpenAI (DALL-E 3) and Stability AI.
                Once an API key is added, this feature will be fully operational.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!showNotice && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-[#111111] border border-gray-100 dark:border-[#1f1f1f] flex items-center justify-center mx-auto mb-4 text-3xl">
                🖼
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-[#4b5563]">Your images will appear here</p>
              <p className="text-xs text-gray-300 dark:text-[#2a2a2a] mt-1">Configure a provider and enter a prompt to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
