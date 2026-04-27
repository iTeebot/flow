import { type CSSProperties, type ComponentType, useEffect, lazy, Suspense } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBadge2,
  Info,
  LayoutDashboard,
  Package,
  UserCircle2,
  Settings,
  Users,
} from "lucide-react";
import "./App.css";
import { theme } from "./theme";
import { type ModuleKey, useUiStore } from "./store/uiStore";
import { getLanguageDirection } from "./utils/layout";
import { ToastContainer } from "./components/ToastContainer";
import { LandingPage } from "./pages/LandingPage";
import { isTauri } from "./lib/platform";

// Lazy-loaded Business Modules
const DashboardModule = lazy(() => import("./modules/dashboard/DashboardModule").then(m => ({ default: m.DashboardModule })));
const DeliveryChallanModule = lazy(() => import("./modules/deliveryChallan/DeliveryChallanModule").then(m => ({ default: m.DeliveryChallanModule })));
const InventoryModule = lazy(() => import("./modules/inventory/InventoryModule").then(m => ({ default: m.InventoryModule })));
const CustomersModule = lazy(() => import("./modules/customers/CustomersModule").then(m => ({ default: m.CustomersModule })));
const InvoicesModule = lazy(() => import("./modules/invoices/InvoicesModule").then(m => ({ default: m.InvoicesModule })));
const ProfileModule = lazy(() => import("./modules/profile/ProfileModule").then(m => ({ default: m.ProfileModule })));
const SettingsModule = lazy(() => import("./modules/settings/SettingsModule").then(m => ({ default: m.SettingsModule })));
const InfoModule = lazy(() => import("./modules/info/InfoModule").then(m => ({ default: m.InfoModule })));

const LoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center animate-in fade-in duration-500">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Loading Module...</span>
    </div>
  </div>
);

const navItems: {
  id: ModuleKey;
  label: string;
  path: string;
  note?: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
    { id: "dashboard", label: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
    {
      id: "delivery-challan",
      label: "Delivery Challan",
      path: "/app/delivery-challan",
      icon: ClipboardList,
    },
    { id: "inventory", label: "Inventory", path: "/app/inventory", icon: Package },
    { id: "customers", label: "Customers", path: "/app/customers", icon: Users },
    // { id: "reports", label: "Reports", path: "/app/reports", icon: BarChart3 },
    { id: "invoices", label: "Invoices", path: "/app/invoices", icon: FileBadge2 },
    { id: "profile", label: "Profile", path: "/app/profile", icon: UserCircle2 },
    { id: "settings", label: "Settings", path: "/app/settings", icon: Settings },
    { id: "info", label: "Info", path: "/app/info", icon: Info },
  ];

import { useAuthStore } from "./store/authStore";
import { LoginView } from "./modules/auth/LoginView";
import { RegisterView } from "./modules/auth/RegisterView";
import { getCompanyProfile } from "./modules/companyProfile/api";

function AppContent() {
  const location = useLocation();
  const {
    isAuthenticated,
    isRegistered,
    isLoading,
    checkRegistration,
    companyId,
    setCurrency
  } = useAuthStore();

  const {
    activeModule,
    setActiveModule,
    sidebarCollapsed,
    toggleSidebar,
    initializeStore,
    syncSystemTheme,
    themeMode,
    language
  } = useUiStore();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = getLanguageDirection(language);
  }, [language]);
  const currentLabel = navItems.find((item) => item.id === activeModule)?.label ?? "Teebot Flow";

  useEffect(() => {
    checkRegistration();
    initializeStore();
  }, [checkRegistration, initializeStore]);

  useEffect(() => {
    const syncProfile = async () => {
      if (isAuthenticated && companyId) {
        try {
          const profile = await getCompanyProfile(companyId);
          if (profile.currency) {
            setCurrency(profile.currency);
          }
        } catch (err) {
          console.error("Failed to sync company profile currency:", err);
        }
      }
    };
    syncProfile();
  }, [isAuthenticated, companyId, setCurrency]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => syncSystemTheme();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [syncSystemTheme]);

  useEffect(() => {
    const active = navItems.find((item) => item.path === location.pathname);
    if (active && active.id !== activeModule) {
      setActiveModule(active.id);
    }
  }, [activeModule, location.pathname, setActiveModule]);

  // Show landing page for / route (web only, never in Tauri desktop)
  if (location.pathname === "/" && !isTauri()) {
    return <LandingPage />;
  }
  // In Tauri, redirect / to the main app
  if (location.pathname === "/" && isTauri()) {
    return <Navigate to="/app/delivery-challan" replace />;
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background text-text-primary">Loading...</div>;
  }

  if (!isAuthenticated) {
    return isRegistered ? <LoginView /> : <RegisterView />;
  }

  return (
    <div
      className="h-screen overflow-hidden bg-background text-text-primary"
      style={
        {
          "--space-xs": theme.spacing.xs,
          "--space-sm": theme.spacing.sm,
          "--space-md": theme.spacing.md,
          "--space-lg": theme.spacing.lg,
          "--space-xl": theme.spacing.xl,
          "--space-2xl": theme.spacing["2xl"],
          "--radius-sm": theme.radius.sm,
          "--radius-md": theme.radius.md,
        } as CSSProperties
      }
    >
      <div className={`grid h-screen ${sidebarCollapsed ? "grid-cols-[72px_1fr]" : "grid-cols-[220px_1fr]"}`}>
        <aside 
          onContextMenu={(e) => e.preventDefault()}
          className="h-screen flex flex-col border-r border-border bg-surface"
        >
          {/* Header Area: Branding + Toggle (Persistent) */}
          <div className="px-4 py-4 space-y-4 shrink-0 border-b border-transparent">
            <div className="flex items-center justify-center w-full">
              {sidebarCollapsed ? (
                <img
                  src={themeMode === "light" ? "/logo.png" : "/logo_dark.png"}
                  alt="Teebot Flow logo"
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <img
                  src={themeMode === "light" ? "/auth_logo.png" : "/auth_logo_dark.png"}
                  alt="Teebot Flow logo"
                  className="h-40 w-auto object-contain"
                />
              )}
            </div>

            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`inline-flex items-center justify-center rounded-lg border border-border bg-card text-xs font-medium text-text-primary transition hover:border-primary hover:bg-primary/10 ${sidebarCollapsed ? "h-9 w-full" : "w-fit gap-1 px-3 py-1.5"
                }`}
            >
              {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              {!sidebarCollapsed ? "Collapse" : null}
            </button>
          </div>

          {/* Navigation Area: (Scrollable) */}
          <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1 custom-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setActiveModule(item.id)}
                className={({ isActive }) =>
                  `group relative rounded-lg border transition ${isActive || activeModule === item.id
                    ? "border-primary/80 bg-primary/15 text-text-primary"
                    : "border-transparent text-text-muted hover:border-border hover:bg-card hover:text-text-primary"
                  } ${sidebarCollapsed ? "flex h-9 items-center justify-center px-0 shrink-0" : "px-3 py-2 shrink-0"}`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed ? <span className="text-sm font-medium">{item.label}</span> : null}
                </div>
                {!sidebarCollapsed && item.note ? (
                  <small className="mt-1 block text-[11px] uppercase tracking-wide text-cyan/90">{item.note}</small>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="grid h-screen grid-rows-[auto_1fr] overflow-hidden">
          <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <strong className="text-base font-semibold text-text-primary">{currentLabel}</strong>
              </div>
              <img
                src={themeMode === "light" ? "/auth_logo.png" : "/auth_logo_dark.png"}
                alt="Teebot icon"
                className="h-8 w-auto max-w-[120px] object-contain"
              />
            </div>
          </header>
          <main className="overflow-y-auto p-5 relative">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/app" element={<Navigate to="/app/delivery-challan" replace />} />
                <Route path="/app/dashboard" element={<DashboardModule />} />
                <Route path="/app/delivery-challan" element={<DeliveryChallanModule />} />
                <Route path="/app/inventory" element={<InventoryModule />} />
                <Route path="/app/customers" element={<CustomersModule />} />
                {/* <Route path="/app/reports" element={<ReportsModule />} /> */}
                <Route path="/app/invoices" element={<InvoicesModule />} />
                <Route path="/app/profile" element={<ProfileModule />} />
                <Route path="/app/settings" element={<SettingsModule />} />
                <Route path="/app/info" element={<InfoModule />} />
                <Route path="*" element={<div className="p-10 text-text-muted">No route matched: {location.pathname}</div>} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

function App() {
  // AppContent handles platform detection internally:
  // - Tauri desktop: / redirects to /app/delivery-challan
  // - Web: / shows LandingPage
  return <AppContent />;
}

export default App;
