import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import currencies from "../../assets/currencies.json";
import {
  Eye,
  EyeOff,
  Building2,
  User as UserIcon,
  Lock,
  Globe,
  BadgeDollarSign,
  Fingerprint,
  Info,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
  Layers,
  Heart,
  ExternalLink
} from "lucide-react";

interface Currency {
  symbol: string;
  name: string;
  symbol_native: string;
  decimal_digits: number;
  rounding: number;
  code: string;
  name_plural: string;
}

export function RegisterView() {
  const { register } = useAuthStore();
  const { themeMode, setThemeMode, language, setLanguage } = useUiStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState<"form" | "info">("form");
  const [currenciesList, setCurrenciesList] = useState<Currency[]>([]);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [error, setError] = useState("");

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "hi", label: "हिन्दी" },
    { value: "gu", label: "ગુજરાતી" },
    { value: "ur", label: "اردو" },
  ];

  useEffect(() => {
    const currencyArray = Object.values(currencies) as Currency[];
    setCurrenciesList(currencyArray);

    const nav = navigator.language;
    if (nav.includes("en-US")) setCurrency("USD");
    else if (nav.includes("en-IN")) setCurrency("INR");
    else if (nav.includes("en-GB")) setCurrency("GBP");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (currentPage === 1) {
      if (!fullName || !companyName) {
        setError("Please fill in all required fields.");
        return;
      }
      setCurrentPage(2);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      await register({
        username,
        password,
        full_name: fullName,
        company_name: companyName,
        tax_registration_number: taxId,
        sales_tax_number: "",
        business_type: businessType,
        currency,
        website: "",
      });
    } catch (err: any) {
      setError(err?.toString() ?? "Registration failed.");
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setError("");
    }
  };

  const inputStyles = `w-full bg-navy/50 border border-border rounded-xl py-3.5 !pl-11 pr-4 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder-text-muted/40 text-sm font-medium hover:border-primary/40`;
  const labelStyles = `block text-[11px] font-black text-text-muted mb-2 uppercase tracking-widest`;

  return (
    <div className="h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[88vh] min-h-[520px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-500">

        {/* ── Sidebar ── */}
        <div className="hidden md:flex md:w-[300px] bg-navy/60 border-r border-border/60 flex-col backdrop-blur-xl shrink-0 overflow-y-auto">
          <div className="flex flex-col p-8 gap-6 min-h-full">
            {view === "form" && <img src={`${themeMode === "light" ? "/auth_logo.png" : "/auth_logo_dark.png"}`} alt="Teebot Flow" className="h-auto w-auto opacity-100" />}

            {view === "form" ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-2xl font-black text-text-primary leading-tight tracking-tight">
                    Welcome to<br />
                    <span className="text-primary italic">Teebot Flow</span>
                  </h2>
                  <p className="text-sm text-text-muted leading-relaxed mt-3">
                    Your enterprise-grade local ERP. Simple setup, secure, entirely offline.
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/40">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text-primary">Privacy First</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Your data never leaves this machine.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text-primary">Zero Latency</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Instant performance, no internet needed.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setView("info")}
                  className="flex items-center gap-2 text-[10px] font-black text-primary hover:text-primary/70 transition-colors uppercase tracking-[0.15em] pt-2"
                >
                  <Info className="h-3.5 w-3.5" />
                  Technical Details
                </button>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-300">
                <button
                  type="button"
                  onClick={() => setView("form")}
                  className="flex items-center gap-2 text-[10px] font-black text-text-muted hover:text-text-primary transition-colors uppercase tracking-widest"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Setup
                </button>
                <h3 className="text-base font-black text-text-primary">System Blueprint</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-surface/60 border border-border">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5">Core Engine</p>
                    <p className="text-[11px] text-text-muted leading-relaxed">Tauri (Rust) + React 19. Maximum performance with a minimal resource footprint.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500 fill-pink-500/20" />
                      <p className="text-[11px] font-black text-text-primary uppercase tracking-wider">TEEBOT LABS</p>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed italic">
                      Designed and developed with precision by the engineering team at Teebot Labs.
                    </p>
                    <div className="space-y-2 pt-1">
                      <a href="https://www.iteebot.com" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[11px] font-bold text-primary hover:underline">
                        <Globe className="h-3.5 w-3.5" />
                        www.iteebot.com
                      </a>
                      <a href="https://teebot-flow.iteebot.com" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[11px] font-bold text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Product Page
                      </a>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-border/20">
                  <p className="text-[10px] font-bold text-text-muted/40 uppercase tracking-widest text-center">
                    © 2026 TEEBOT LABS. ALL RIGHTS RESERVED.
                  </p>
                </div>
              </div>
            )}
            <div className="mt-auto pt-5 border-t border-border/40 flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-surface/50 border border-border/60 rounded-xl shrink-0">
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
                    className={`p-2 rounded-lg transition-all ${themeMode === mode
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-text-muted hover:text-text-primary hover:bg-surface"
                      }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <div className="relative group flex-1 min-w-0">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full bg-surface/50 border border-border/60 rounded-xl !pl-9 pr-2 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-primary outline-none focus:border-primary transition-all appearance-none cursor-pointer"
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
        <div className="flex-1 p-8 lg:p-12 flex flex-col overflow-hidden bg-gradient-to-br from-surface to-background/40">

          {/* Step pill + header */}
          <header className="mb-8 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Step {currentPage} of 2</span>
            </div>
            <h2 className="text-3xl font-black text-text-primary tracking-tight">
              {currentPage === 1 ? "Business Structure" : "Identity Control"}
            </h2>
            <p className="text-sm text-text-muted mt-1.5">
              {currentPage === 1
                ? "Configure your company profile and regional settings."
                : "Establish your administrative root credentials."}
            </p>
          </header>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-bold flex items-center gap-3 shrink-0 animate-in slide-in-from-top-2 duration-200">
              <Info className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">

              {/* ── Page 1 ── */}
              {currentPage === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="group space-y-2">
                      <label className={labelStyles}>Full Name *</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputStyles} placeholder="e.g. John Doe" />
                      </div>
                    </div>
                    <div className="group space-y-2">
                      <label className={labelStyles}>Organization *</label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputStyles} placeholder="e.g. Teebot Solutions" />
                      </div>
                    </div>
                  </div>

                  <div className="group space-y-2">
                    <label className={labelStyles}>Industry Type</label>
                    <div className="relative">
                      <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                      <input type="text" list="business-types" value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={inputStyles} placeholder="e.g. Retail / Shop" />
                    </div>
                    <datalist id="business-types">
                      <option value="Retail / Shop" />
                      <option value="Wholesale / Distribution" />
                      <option value="Manufacturing" />
                      <option value="Professional Services" />
                    </datalist>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="group space-y-2">
                      <label className={labelStyles}>Tax ID / NTN</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className={inputStyles} placeholder="FBR / Local Tax ID" />
                      </div>
                    </div>
                    <div className="group space-y-2">
                      <label className={labelStyles}>Operating Currency</label>
                      <div className="relative">
                        <BadgeDollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inputStyles} appearance-none cursor-pointer`}>
                          <option value="">Choose Currency</option>
                          {currenciesList.map((curr) => (
                            <option key={curr.code} value={curr.code}>{curr.symbol} {curr.name} ({curr.code})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Page 2 ── */}
              {currentPage === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="group space-y-2">
                    <label className={labelStyles}>Master Username *</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                      <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className={inputStyles} placeholder="admin" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="group space-y-2">
                      <label className={labelStyles}>Secret Key *</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputStyles} !pr-11`}
                          placeholder="Minimum 8 characters"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="group space-y-2">
                      <label className={labelStyles}>Confirm Secret *</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`${inputStyles} !pr-11`}
                          placeholder="Re-enter password"
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 shrink-0 border-t border-border/50 mt-6">
              {currentPage > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-text-muted bg-surface/50 border border-border rounded-xl hover:bg-surface hover:text-text-primary transition-all active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : <div />}

              <button
                type="submit"
                className="px-8 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground bg-primary rounded-xl flex items-center gap-2.5 shadow-lg shadow-primary/20 hover:scale-[1.03] active:scale-[0.97] transition-all"
              >
                {currentPage === 1 ? "Proceed" : "Finalize Setup"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
