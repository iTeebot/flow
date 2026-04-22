import { useEffect, useState } from "react";
import { Download, Zap, BarChart3, Package, Info, ExternalLink, Globe, Shield, Heart, Cpu, Server, HardDrive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { getAppInfo, type AppInfo } from "../modules/info/api";
import { APP_VERSION, PRODUCT_NAME } from "../lib/version";

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [info, setInfo] = useState<AppInfo | null>(null);

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
      icon: "🪟",
      downloads: [
        {
          name: "Installer (EXE)",
          url: "/releases/win/teebot-flow_0.0.5_x64-setup.exe",
          size: "~4.1 MB"
        },
        {
          name: "MSI Package",
          url: "/releases/win/teebot-flow_0.0.5_x64_en-US.msi",
          size: "~5.3 MB"
        }
      ]
    },
    {
      os: "Linux",
      icon: "🐧",
      downloads: [
        {
          name: "AppImage",
          url: "/releases/linux/teebot-flow_0.0.5_amd64.AppImage",
          size: "~76.6 MB"
        },
        {
          name: "Debian Package",
          url: "/releases/linux/teebot-flow_0.0.5_amd64.deb",
          size: "~6.5 MB"
        },
        {
          name: "RPM Package",
          url: "/releases/linux/teebot-flow_0.0.5_x86_64.rpm",
          size: "~6.5 MB"
        }
      ]
    },
    {
      os: "macOS",
      icon: "🍎",
      downloads: [
        {
          name: "DMG (ARM64)",
          url: "/releases/mac/teebot-flow_0.0.5_arm64.dmg",
          size: "~5.8 MB"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface to-background text-text-primary">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Teebot Flow"
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-bold">Teebot Flow</h1>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => navigate("/app")}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-semibold"
            >
              Open App
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-5xl font-bold leading-tight">
            Business Management Made Simple
          </h2>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Streamline your inventory, invoices, customers, and delivery operations with Teebot Flow.
            Available on Windows, macOS, and Linux.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate("/app")}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-semibold text-lg"
            >
              {isAuthenticated ? "Launch App" : "Try Web Version"}
            </button>
            <p className="text-sm text-text-muted">or download the desktop app below</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">
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
                <div className="text-5xl mb-3">{platform.icon}</div>
                <h4 className="text-2xl font-bold mb-4">{platform.os}</h4>
                <div className="space-y-2">
                  {platform.downloads.map((dl) => (
                    <a
                      key={dl.name}
                      href={dl.url}
                      download
                      className="block p-3 rounded-lg bg-surface border border-border hover:border-primary/50 hover:bg-primary/5 transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-text-primary">{dl.name}</span>
                        <Download className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs text-text-muted">{dl.size}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="rounded-lg border border-border bg-card p-8">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-text-primary">
            <Heart className="h-5 w-5 text-pink-500" />
            About {PRODUCT_NAME}
          </h2>
          <p className="text-base leading-relaxed text-text-muted max-w-3xl">
            {PRODUCT_NAME} is a local-first ERP desktop app designed for operational workflows such as delivery challans, invoices, inventory, customer records, reporting, and business controls. Built for businesses that need fast, reliable, and offline-capable management tools.
          </p>
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

      {/* Links Section */}
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
