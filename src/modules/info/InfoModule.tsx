import { Info, ExternalLink, Globe, Package, Server, HardDrive, Cpu, Shield, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAppInfo, type AppInfo } from "./api";
import { APP_VERSION, PRODUCT_NAME } from "../../lib/version";
import { useEffect, useState } from "react";

export function InfoModule() {
  const { t } = useTranslation("info");
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const appInfo = await getAppInfo();
        setInfo(appInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("load_error"));
      }
    };
    load();
  }, []);

  const buildFields = info
    ? [
      { label: t("product"), value: info.product_name, icon: Package },
      { label: t("version"), value: APP_VERSION, icon: Shield },
      { label: t("build_profile"), value: info.build_profile, icon: Server },
      { label: t("platform"), value: info.target_os, icon: Cpu },
      { label: t("database"), value: info.db_file_name, icon: HardDrive },
    ]
    : [];

  const links = [
    {
      label: t("teebot_labs"),
      desc: t("teebot_labs_desc"),
      url: "https://www.iteebot.com",
    },
    {
      label: t("product_page"),
      desc: t("product_page_desc"),
      url: "https://teebot-flow.iteebot.com",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <p className="text-sm text-text-muted">
          {t("subtitle")}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      ) : null}

      {/* Build Information */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Info className="h-4 w-4 text-primary" />
          {t("build_info")}
        </h2>
        {info ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {buildFields.map((field) => (
              <div
                key={field.label}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-surface/50 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="rounded-md bg-primary/10 p-2">
                  <field.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    {field.label}
                  </p>
                  <p className="text-sm font-semibold text-text-primary truncate" title={field.value}>
                    {field.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">{t("loading_build_info")}</p>
        )}
      </div>

      {/* About */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Heart className="h-4 w-4 text-pink-500" />
          {t("about_product", { product: PRODUCT_NAME })}
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          {t("about_product_desc", { product: PRODUCT_NAME })}
        </p>
      </div>

      {/* Links */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Globe className="h-4 w-4 text-primary" />
          {t("links")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-lg border border-border/50 bg-surface/50 px-4 py-3 transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
            >
              <div className="rounded-md bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                <ExternalLink className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                  {link.label}
                </p>
                <p className="text-xs text-text-muted truncate">{link.desc}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
