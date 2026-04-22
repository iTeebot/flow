import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import {
  Eye,
  EyeOff,
  User as UserIcon,
  Lock,
  Info,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Globe,
  ExternalLink,
  Heart,
} from "lucide-react";

export function LoginView() {
  const { login } = useAuthStore();
  const { themeMode, setThemeMode, language, setLanguage } = useUiStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"form" | "info">("form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
    } catch {
      setError("Identification failed. Please check your credentials.");
    }
  };

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "hi", label: "हिन्दी" },
    { value: "gu", label: "ગુજરાતી" },
    { value: "ur", label: "اردو" },
  ];

  const inputStyles =
    "w-full bg-navy/60 border border-border rounded-xl py-3 !pl-11 !pr-12 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder-text-muted/40 text-sm font-medium hover:border-primary/40";
  const labelStyles =
    "block text-[10px] font-black text-text-muted mb-1.5 uppercase tracking-widest";

  return (
    <div className="h-screen bg-background flex items-center justify-center p-3 overflow-hidden">
      <div className="w-full max-w-4xl h-[88vh] min-h-[520px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex animate-in fade-in zoom-in-95 duration-500">

        {/* ── Sidebar ── */}
        <div className="hidden md:flex w-[260px] shrink-0 bg-navy/60 border-r border-border/60 flex-col backdrop-blur-xl overflow-y-auto">
          <div className="flex flex-col p-6 gap-6 min-h-full">

            {view === "form" && <img src={`${themeMode === "light" ? "auth_logo.png" : "auth_logo_dark.png"}`} alt="Teebot Flow" className="h-auto w-auto opacity-100" />}

            {view === "form" ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-black text-text-primary leading-tight tracking-tight">
                    Secure<br />
                    <span className="text-primary italic">Authentication</span>
                  </h2>
                  <p className="text-xs text-text-muted leading-relaxed mt-2.5">
                    Enter your credentials to unlock your local business engine.
                  </p>
                </div>



                <button
                  type="button"
                  onClick={() => setView("info")}
                  className="flex items-center gap-2 text-[10px] font-black text-primary hover:text-primary/70 transition-colors uppercase tracking-[0.15em] pt-1"
                >
                  <Info className="h-3.5 w-3.5" />
                  System Blueprint
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <button
                  type="button"
                  onClick={() => setView("form")}
                  className="flex items-center gap-1.5 text-[10px] font-black text-text-muted hover:text-text-primary transition-colors uppercase tracking-widest mb-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Return
                </button>
                <h3 className="text-sm font-black text-text-primary">System Blueprint</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-surface/60 border border-border">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Privacy & Security</p>
                    <p className="text-[11px] text-text-muted leading-relaxed">Tokens stored locally only. No data transmitted externally.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500/20" />
                      <p className="text-[10px] font-black text-text-primary uppercase tracking-wider">TEEBOT LABS</p>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed italic">
                      Designed and developed with precision by the engineering team at Teebot Labs.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <a href="https://www.iteebot.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-primary hover:underline">
                        <Globe className="h-3 w-3" />
                        www.iteebot.com
                      </a>
                      <a href="https://teebot-flow.iteebot.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        Product Page
                      </a>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/20">
                  <p className="text-[9px] font-bold text-text-muted/40 uppercase tracking-widest text-center">
                    © 2026 TEEBOT LABS. ALL RIGHTS RESERVED.
                  </p>
                </div>
              </div>
            )}
            {/* Theme + Language — in-flow, never cut off */}
            <div className="mt-auto pt-5 border-t border-border/40 flex items-center gap-2">
              <div className="flex items-center gap-0.5 p-0.5 bg-surface/60 border border-border/60 rounded-lg shrink-0">
                {([
                  { mode: "light", icon: Sun },
                  { mode: "dark", icon: Moon },
                  { mode: "system", icon: Monitor },
                ] as const).map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setThemeMode(mode)}
                    title={`${mode} theme`}
                    className={`p-1.5 rounded-md transition-all ${themeMode === mode
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-text-muted hover:text-text-primary"
                      }`}
                  >
                    <Icon className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <div className="relative group flex-1 min-w-0">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full bg-surface/60 border border-border/60 rounded-lg !pl-9 pr-1 py-2 text-[10px] font-black uppercase tracking-wide text-text-primary outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Area ── */}
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-12 bg-gradient-to-br from-surface to-background/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="w-full max-w-sm mx-auto space-y-6 relative">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight">Identity Access</h1>
              <p className="text-xs text-text-muted mt-1">Unlock your localized workspace portal</p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-200">
                <Info className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="group space-y-1.5">
                <label className={labelStyles}>Identity</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputStyles}
                    placeholder="Username"
                  />
                </div>
              </div>

              <div className="group space-y-1.5">
                <label className={labelStyles}>Credential</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputStyles}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Authenticate Session</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-text-muted/40 uppercase tracking-[0.15em] font-black pt-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Core Encryption Active</span>

              {/* <div className="pt-3 border-t border-border/40 space-y-2">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface/30 border border-border/30">
                  <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">End-to-End Encrypted</span>
                </div>
              </div> */}

            </div>


            {/* Mobile theme/lang row (shown on mobile where sidebar is hidden) */}
            <div className="flex items-center justify-center gap-3 pt-1 md:hidden">
              <div className="flex items-center gap-0.5 p-0.5 bg-surface/60 border border-border/60 rounded-lg">
                {([
                  { mode: "light", icon: Sun },
                  { mode: "dark", icon: Moon },
                  { mode: "system", icon: Monitor },
                ] as const).map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setThemeMode(mode)}
                    className={`p-1.5 rounded-md transition-all ${themeMode === mode
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-text-muted hover:text-text-primary"
                      }`}
                  >
                    <Icon className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-surface/60 border border-border/60 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide text-text-primary outline-none focus:border-primary transition-all appearance-none cursor-pointer"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
