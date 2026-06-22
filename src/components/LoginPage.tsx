import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, ArrowRight, Sun, Moon, MoonStar } from 'lucide-react';
import { useAuthStore, Theme } from '../store/authStore';

const THEME_OPTIONS: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: 'light',    label: 'Light',    icon: Sun },
  { id: 'dark',     label: 'Dark',     icon: Moon },
  { id: 'midnight', label: 'Midnight', icon: MoonStar },
];

function ThemeSwitcher() {
  const { theme, setTheme } = useAuthStore();
  return (
    <div className="flex items-center gap-1 p-1 rounded-full border border-gray-200 dark:border-[#1f1f1f] bg-white/70 dark:bg-[#111111]/70 backdrop-blur">
      {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          title={label}
          aria-label={`${label} theme`}
          className={
            'w-8 h-8 rounded-full flex items-center justify-center transition ' +
            (theme === id
              ? 'bg-[#b61615] text-white shadow-sm'
              : 'text-gray-400 dark:text-[#6b7280] hover:text-gray-600 dark:hover:text-[#9ca3af] hover:bg-gray-100 dark:hover:bg-white/5')
          }
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    const result = await login(email, password);
    setIsLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0a0a0a]">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-[#0a0a0a] dark:bg-[#050505] p-12 relative overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#b61615]" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#b61615] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="white" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Nafas AI</span>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-5xl xl:text-6xl font-bold text-white leading-[1.05] tracking-tight">
              Internal
              <br />
              <span className="text-[#b61615]">AI</span> Platform
            </h1>
            <p className="mt-6 text-[#6b7280] text-base leading-relaxed max-w-xs">
              Nafas Zist Pharmed's unified AI workspace. Manage access, monitor usage, and deploy intelligent tools across the organization.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              'Role-based access control',
              'Usage limits & monitoring',
              'Customizable AI behavior',
              'Full conversation history',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#b61615] flex-shrink-0" />
                <span className="text-sm text-[#9ca3af]">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 flex flex-col gap-1 text-xs text-[#374151]">
          <p>© 2026 Nafas Zist Pharmed · Internal AI Platform</p>
          <p>Developed by Saeed Zarrini</p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col p-6 sm:p-12 relative">
        {/* Theme switcher */}
        <div className="absolute top-5 right-5 z-20">
          <ThemeSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-[#b61615] rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-base">Nafas AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Sign in</h2>
            <p className="text-sm text-gray-500 dark:text-[#6b7280] mt-1">Enter your credentials to access your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@nafaszist.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#1f1f1f] bg-gray-50 dark:bg-[#111111] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-[#b61615]/40 focus:border-[#b61615] text-sm transition"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-200 dark:border-[#1f1f1f] bg-gray-50 dark:bg-[#111111] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-[#b61615]/40 focus:border-[#b61615] text-sm transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6b7280] hover:text-gray-600 dark:hover:text-[#9ca3af] transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#b61615]/10 border border-[#b61615]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#b61615] flex-shrink-0" />
                <p className="text-sm text-[#b61615] dark:text-[#e05c5c]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#b61615] hover:bg-[#9c1110] disabled:bg-[#b61615]/50 text-white rounded-lg font-medium text-sm transition-all mt-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400 dark:text-[#4b5563]">
                Forgot your password or locked out? Contact your system administrator to reset your credentials.
              </p>
            </div>
          </form>
        </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 pb-2 w-full flex flex-col sm:flex-row items-center justify-end text-[11px] text-gray-400 dark:text-[#4b5563] opacity-60 hover:opacity-100 transition-opacity gap-2">
          <div>
            Version 0.4.7 Beta
          </div>
        </div>
      </div>
    </div>
  );
}
