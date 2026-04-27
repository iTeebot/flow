import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../../store/uiStore";
import {
  Info,
  Globe,
  Sun,
  Moon,
  Monitor,
  ExternalLink,
  Heart,
} from "lucide-react";
import { Select } from "../../components/ui/Select";
import languagesData from "../../assets/languages.json";
import { getLanguageDirection, getBackIcon } from "../../utils/layout";

interface SidebarProps {
  type: "login" | "register";
}

export function Sidebar({ type }: SidebarProps) {
  const { t } = useTranslation("auth");
  const { themeMode, setThemeMode, language, setLanguage } = useUiStore();
  const [view, setView] = useState<"form" | "info">("form");

  const direction = getLanguageDirection(language);
  const BackIcon = getBackIcon(direction);

  const languageOptions = languagesData.map((l) => ({
    label: l.nativeName || l.name,
    value: l.code,
  }));

  return (
    <div className="hidden md:flex w-[260px] lg:w-[300px] shrink-0 bg-navy/60 border-e border-border/60 flex-col backdrop-blur-xl overflow-y-auto">
      <div className="flex flex-col p-6 lg:p-8 gap-6 min-h-full">
        {view === "form" && (
          <img
            src={`${themeMode === "light" ? "/auth_logo.png" : "/auth_logo_dark.png"}`}
            alt="Teebot Flow"
            className="h-auto w-auto opacity-100"
          />
        )}

        {view === "form" ? (
          <div className="space-y-5 lg:space-y-6 animate-in fade-in duration-300">
            {type === "login" ? (
              <>
                <div>
                  <h2 className="text-xl lg:text-2xl font-black text-text-primary leading-tight tracking-tight">
                    {t("sidebar.login_title")}<br />
                    <span className="text-primary italic">{t("sidebar.login_subtitle")}</span>
                  </h2>
                  <p className="text-xs lg:text-sm text-text-muted leading-relaxed mt-2.5 lg:mt-3">
                    {t("sidebar.login_desc")}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-xl lg:text-2xl font-black text-text-primary leading-tight tracking-tight">
                    {t("sidebar.register_title")}<br />
                    <span className="text-primary italic">{t("sidebar.register_subtitle")}</span>
                  </h2>
                  <p className="text-xs lg:text-sm text-text-muted leading-relaxed mt-2.5 lg:mt-3">
                    {t("sidebar.register_desc")}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/40">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text-primary">{t("sidebar.privacy_first")}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{t("sidebar.privacy_desc")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text-primary">{t("sidebar.zero_latency")}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{t("sidebar.latency_desc")}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setView("info")}
              className="flex items-center gap-2 text-[10px] font-black text-primary hover:text-primary/70 transition-colors uppercase tracking-[0.15em] pt-1"
            >
              <Info className="h-3.5 w-3.5" />
              {type === "login" ? t("sidebar.system_blueprint") : t("sidebar.technical_details")}
            </button>
          </div>
        ) : (
          <div className="space-y-4 lg:space-y-5 animate-in fade-in duration-300">
            <button
              type="button"
              onClick={() => setView("form")}
              className="flex items-center gap-1.5 text-[10px] font-black text-text-muted hover:text-text-primary transition-colors uppercase tracking-widest mb-2"
            >
              <BackIcon className="h-3.5 w-3.5" />
              {t("sidebar.return")}
            </button>
            <h3 className="text-sm font-black text-text-primary">{t("sidebar.system_blueprint")}</h3>
            <div className="space-y-3 lg:space-y-4">
              <div className="p-3 lg:p-4 rounded-xl bg-surface/60 border border-border">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{t("sidebar.privacy_security")}</p>
                <p className="text-[11px] text-text-muted leading-relaxed">{t("sidebar.privacy_security_desc")}</p>
              </div>
              <div className="p-4 lg:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500/20" />
                  <p className="text-[10px] font-black text-text-primary uppercase tracking-wider">{t("sidebar.teebot_labs")}</p>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed italic">
                  {t("sidebar.developed_by")}
                </p>
                <div className="space-y-1.5 pt-1">
                  <a href="https://www.iteebot.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-primary hover:underline">
                    <Globe className="h-3 w-3" />
                    www.iteebot.com
                  </a>
                  <a href="https://teebot-flow.iteebot.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    {t("sidebar.product_page")}
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/20">
              <p className="text-[9px] font-bold text-text-muted/40 uppercase tracking-widest text-center">
                {t("sidebar.copyright")}
              </p>
            </div>
          </div>
        )}

        {/* Theme + Language — in-flow */}
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
            <Globe className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors z-10" />
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              options={languageOptions}
              openDirection="up"
              className="!ps-9 py-2 text-[10px] font-black uppercase tracking-wide"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
