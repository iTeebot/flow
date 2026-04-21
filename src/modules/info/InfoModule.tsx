import { useEffect, useState } from "react";
import { Info, Link as LinkIcon } from "lucide-react";
import { getAppInfo, type AppInfo } from "./api";

export function InfoModule() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const appInfo = await getAppInfo();
        setInfo(appInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load app info");
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Info</h1>
        <p className="text-text-muted">Version, build details, developer information, and product links.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      ) : null}

      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Info className="h-5 w-5" />
          Build Information
        </h2>
        {info ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <p className="text-sm text-text-muted">Product: <span className="font-medium text-text-primary">{info.product_name}</span></p>
            <p className="text-sm text-text-muted">Version: <span className="font-medium text-text-primary">{info.version}</span></p>
            <p className="text-sm text-text-muted">Build profile: <span className="font-medium text-text-primary">{info.build_profile}</span></p>
            <p className="text-sm text-text-muted">Platform: <span className="font-medium text-text-primary">{info.target_os}</span></p>
            <p className="text-sm text-text-muted">Database file: <span className="font-medium text-text-primary">{info.db_file_name}</span></p>
          </div>
        ) : (
          <p className="text-text-muted">Loading build information...</p>
        )}
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">About Teebot Flow</h2>
        <p className="text-sm text-text-muted">
          Teebot Flow is a local-first ERP desktop app designed for operational workflows such as delivery challans,
          invoices, inventory, customer records, reporting, and business controls.
        </p>
        <div className="mt-4 space-y-2">
          <a
            href="https://www.iteebot.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <LinkIcon className="h-4 w-4" />
            Teebot Labs
          </a>
          <a
            href="https://teebot-flow.iteebot.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <LinkIcon className="h-4 w-4" />
            Product Page
          </a>
        </div>
      </div>
    </div>
  );
}
