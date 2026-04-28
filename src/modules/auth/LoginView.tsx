import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import {
  Eye,
  EyeOff,
  User as UserIcon,
  Lock,
  Info,
  ShieldCheck,
  AlertOctagon,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Sidebar } from "./Sidebar";
import languagesData from "../../assets/languages.json";
import { getLanguageDirection, getForwardIcon } from "../../utils/layout";
import { Dialog } from "../../components/ui/Dialog";


export function LoginView() {
  const { t } = useTranslation("auth");
  const { login, resetSystem } = useAuthStore();
  const { themeMode, setThemeMode, language, setLanguage } = useUiStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const direction = getLanguageDirection(language);
  const ForwardIcon = getForwardIcon(direction);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    const newErrors: Record<string, string> = {};
    if (!username) {
      newErrors.username = " ";
    }

    if (!password) newErrors.password = " ";

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      return;
    }

    try {
      await login(username, password);
    } catch {
      setError(t("login.error_failed"));
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetSystem();
      setIsResetDialogOpen(false);
    } catch (err: any) {
      setError(err?.toString() || "Reset failed");
    } finally {
      setIsResetting(false);
    }
  };

  const languageOptions = languagesData.languages.map((l: any) => ({
    label: l.nativeName || l.name,
    value: l.code,
  }));


  return (
    <div className="h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-auto md:h-[85vh] min-h-[580px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-500">

        <Sidebar type="login" />

        {/* ── Form Area ── */}
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-12 bg-surface relative overflow-hidden">

          <div className="w-full max-w-sm mx-auto space-y-6 relative">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight">{t("login.title")}</h1>
              <p className="text-xs text-text-muted mt-1">{t("login.subtitle")}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-200">
                <Info className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Input
                label={t("login.identity_label")}
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (validationErrors.username) {
                    setValidationErrors(prev => {
                      const next = { ...prev };
                      delete next.username;
                      return next;
                    });
                  }
                }}
                placeholder={t("login.identity_placeholder")}
                leftIcon={<UserIcon className="h-4 w-4" />}
                error={validationErrors.username}
              />

              <Input
                label={t("login.credential_label")}
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors(prev => {
                      const next = { ...prev };
                      delete next.password;
                      return next;
                    });
                  }
                }}
                placeholder={t("login.credential_placeholder")}
                leftIcon={<Lock className="h-4 w-4" />}
                error={validationErrors.password}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full text-xs uppercase tracking-widest py-3.5"
                  rightIcon={<ForwardIcon className="h-4 w-4" />}
                >
                  {t("login.submit_button")}
                </Button>
              </div>
            </form>

            <div className="flex flex-col items-center gap-4 pt-4 border-t border-border/40">
              <div className="flex items-center justify-center gap-2 text-[10px] text-text-muted/40 uppercase tracking-[0.15em] font-black">
                <ShieldCheck className="h-3 w-3" />
                <span>{t("login.encryption_active")}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsResetDialogOpen(true)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-error/20 hover:border-error/40 hover:bg-error/5 transition-all duration-300"
              >
                <AlertOctagon className="h-3 w-3 text-error/40 group-hover:text-error transition-colors" />
                <span className="text-[9px] font-black text-text-muted/50 group-hover:text-error uppercase tracking-widest transition-colors">
                  {t("login.reset_system") || "Emergency Reset"}
                </span>
              </button>
            </div>

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
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              options={languageOptions}
              openDirection="up"
              className="py-2 text-[10px] font-black uppercase tracking-wide"
            />
          </div>
        </div>
      </div>

      <Dialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleReset}
        variant="danger"
        title={t("login.reset_system") || "Emergency System Reset"}
        description={t("login.reset_confirm") || "DANGER: This will permanently delete ALL local data (inventory, invoices, customers) and reset your registration. This action cannot be undone. Are you sure?"}
        confirmText={t("login.confirm_reset_action") || "Wipe Everything"}
        cancelText={t("login.cancel_reset_action") || "Keep Data"}
        isLoading={isResetting}
      />
    </div>
  );
}
