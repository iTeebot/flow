import { useEffect, useState } from "react";
import { Download, Zap, BarChart3, Package, Info, ExternalLink, Globe, Shield, Heart, Cpu, Server, HardDrive, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { getAppInfo, type AppInfo } from "../modules/info/api";
import { APP_VERSION } from "../lib/version";
import { detectOS, getBestDownloadForOS, getReleaseDownloads, GITHUB_RELEASES_URL, SNAP_STORE_URL } from "../lib/platform";

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [info, setInfo] = useState<AppInfo | null>(null);

  const userOS = detectOS();
  const smartDownload = getBestDownloadForOS(userOS, APP_VERSION);
  const platformDownloads = getReleaseDownloads(APP_VERSION);

  useEffect(() => {
    // Try to fetch app info (may fail on web, which is fine)
    const loadInfo = async () => {
      try {
        const appInfo = await getAppInfo();
        setInfo(appInfo);
      } catch (err) {
        // Expected to fail on web version without Tauri
      }
    };
    loadInfo();
  }, []);

  const releases = [
    {
      os: "Windows",
      icon: <img src="/windows_logo.png" alt="Windows" className="w-12 h-12 object-contain" />,
      downloads: platformDownloads.Windows,
    },
    {
      os: "Linux",
      icon: <img src="/linux_logo.png" alt="Linux" className="w-12 h-12 object-contain" />,
      downloads: platformDownloads.Linux,
    },
    {
      os: "macOS",
      icon: <img src="/apple_logo.png" alt="macOS" className="w-12 h-12 object-contain" />,
      downloads: platformDownloads.macOS,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface to-background text-text-primary">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Teebot Flow"
              className="h-10 w-auto"
            />
            <h1 className="text-xl font-bold hidden sm:block">Teebot Flow</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={smartDownload.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:border-primary/50 transition font-medium text-sm"
            >
              <Download className="w-4 h-4 text-primary" />
              <span className="hidden md:inline">{smartDownload.label}</span>
              <span className="md:hidden">Download</span>
            </a>
            {isAuthenticated && (
              <button
                onClick={() => navigate("/app")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-semibold text-sm"
              >
                Open App
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center border-b border-border/50">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
          <Zap className="w-4 h-4" />
          Local-first ERP
        </div>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 text-text-primary tracking-tight">
          Business management, built for speed
        </h2>
        <p className="text-lg sm:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Inventory, invoices, delivery challans, and customer records — all offline-ready, all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-2">
          <a
            href={smartDownload.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-base flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
          >
            <Download className="w-5 h-5" />
            Download for {userOS}
          </a>
          <button
            onClick={() => navigate("/app")}
            className="w-full sm:w-auto px-8 py-3.5 bg-transparent border border-border text-text-primary rounded-xl hover:bg-surface hover:border-primary/30 transition-all font-medium text-base flex items-center justify-center gap-2"
          >
            {isAuthenticated ? "Launch App" : "Try Web Version"}
            <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase tracking-widest rounded border border-orange-500/20">Beta</span>
          </button>
        </div>
        <p className="text-sm text-text-muted mt-6">Free to use · Available on Windows, macOS & Linux</p>
      </section>

      {/* Stats Row */}
      <div className="max-w-6xl mx-auto px-4 border-b border-border/50">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/50">
          {[
            { num: "3", label: "Platforms" },
            { num: "100%", label: "Offline capable" },
            { num: APP_VERSION, label: "Latest release" },
            { num: "0", label: "Cloud dependency" },
          ].map((stat, i) => (
            <div key={i} className="py-8 text-center">
              <div className="text-3xl font-bold text-text-primary mb-1">{stat.num}</div>
              <div className="text-sm text-text-muted font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: BarChart3, label: "Dashboard", desc: "Real-time insights" },
            { icon: Package, label: "Inventory", desc: "Stock management" },
            { icon: Zap, label: "Fast", desc: "Lightning quick" },
            { icon: Download, label: "Free", desc: "Open & available" }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-lg bg-surface border border-border hover:border-primary/50 transition">
              <feature.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{feature.label}</h3>
              <p className="text-sm text-text-muted">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Downloads Section */}
      <section className="bg-surface border-y border-border py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-2">Download for Your Platform</h3>
            <p className="text-text-muted">Available on Windows, Linux, and macOS</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {releases.map((platform) => (
              <div
                key={platform.os}
                className="rounded-lg border bg-background border-border hover:border-primary/30 p-8 transition-all"
              >
                <div className="mb-4">{platform.icon}</div>
                <h4 className="text-2xl font-bold mb-4">{platform.os}</h4>
                <div className="space-y-2">
                  {platform.downloads.map((dl) => {
                    if (dl.name === "Snap Store") {
                      return (
                        <a
                          key={dl.name}
                          href={dl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full mt-2 hover:opacity-90 transition-opacity"
                        >
                          <img
                            alt="Get it from the Snap Store"
                            src="https://snapcraft.io/en/dark/install.svg"
                            className="w-full h-auto"
                          />
                        </a>
                      );
                    }
                    return (
                      <a
                        key={dl.name}
                        href={dl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg bg-surface border border-border hover:border-primary/50 hover:bg-primary/5 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-text-primary">{dl.name}</span>
                          <Download className="w-4 h-4 text-primary" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 border-b border-border/50">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">About</div>
            <h2 className="text-3xl font-bold text-text-primary mb-4 tracking-tight">Local-first, built to last</h2>
            <p className="text-base text-text-muted leading-relaxed">
              Teebot Flow is a local-first ERP desktop app designed for operational workflows. Your data lives on your machine — no subscriptions, no cloud lock-in, no internet required to run your business. Optional cloud sync ensures you stay connected only when you choose to.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, title: "Offline first", desc: "Works without internet" },
              { icon: Monitor, title: "Desktop native", desc: "Built with Tauri" },
              { icon: Heart, title: "Free to use", desc: "No paid tiers" },
              { icon: Shield, title: "Zero Knowledge", desc: "E2E Encryption for Sync" }
            ].map((chip, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                <chip.icon className="w-7 h-7 text-primary mb-3" />
                <h3 className="font-semibold text-text-primary text-sm mb-1">{chip.title}</h3>
                <p className="text-xs text-text-muted">{chip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Information Section */}
      {info && (
        <section className="bg-surface border-t border-border py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-2 text-text-primary">
              <Info className="h-5 w-5 text-primary" />
              Build Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Product", value: info.product_name, icon: Package },
                { label: "Version", value: APP_VERSION, icon: Shield },
                { label: "Build Profile", value: info.build_profile, icon: Server },
                { label: "Platform", value: info.target_os, icon: Cpu },
                { label: "Database", value: info.db_file_name, icon: HardDrive },
              ].map((field) => (
                <div
                  key={field.label}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
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
          </div>
        </section>
      )}

      {/* Learn More Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold mb-8 flex items-center gap-2 text-text-primary">
          <Globe className="h-5 w-5 text-primary" />
          Learn More
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: "Teebot Labs",
              desc: "Company website and developer portal",
              url: "https://www.iteebot.com",
            },
            {
              label: "Product Page",
              desc: "Official Teebot Flow landing page",
              url: "https://teebot-flow.iteebot.com",
            },
            {
              label: "GitHub Releases",
              desc: `All desktop downloads for v${APP_VERSION}`,
              url: `${GITHUB_RELEASES_URL}/tag/v${APP_VERSION}`,
            },
            {
              label: "Snap Store (Linux)",
              desc: "Install via Ubuntu Software Center",
              url: SNAP_STORE_URL,
            }
          ].map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-lg border border-border/50 bg-surface px-6 py-4 transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
            >
              <div className="rounded-md bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                <ExternalLink className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
                  {link.label}
                </p>
                <p className="text-sm text-text-muted truncate">{link.desc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-12 text-center text-text-muted border-t border-border">
        <p>© 2024 Teebot Flow. Version {APP_VERSION}</p>
      </footer>
    </div>
  );
}
