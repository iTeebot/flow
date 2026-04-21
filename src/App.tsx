import { type CSSProperties, type ComponentType, useEffect } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  BarChart3,
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
import { CustomersModule } from "./modules/customers/CustomersModule";
import { DashboardModule } from "./modules/dashboard/DashboardModule";
import { DeliveryChallanModule } from "./modules/deliveryChallan/DeliveryChallanModule";
import { InventoryModule } from "./modules/inventory/InventoryModule";
import { ReportsModule } from "./modules/reports/ReportsModule";
import { SettingsModule } from "./modules/settings/SettingsModule";
import { ProfileModule } from "./modules/profile/ProfileModule";
import { InvoicesModule } from "./modules/invoices/InvoicesModule";
import { InfoModule } from "./modules/info/InfoModule";

const navItems: {
  id: ModuleKey;
  label: string;
  path: string;
  note?: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
    { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    {
      id: "delivery-challan",
      label: "Delivery Challan",
      path: "/delivery-challan",
      icon: ClipboardList,
    },
    { id: "inventory", label: "Inventory", path: "/inventory", icon: Package },
    { id: "customers", label: "Customers", path: "/customers", icon: Users },
    { id: "reports", label: "Reports", path: "/reports", icon: BarChart3 },
    { id: "invoices", label: "Invoices", path: "/invoices", icon: FileBadge2 },
    { id: "profile", label: "Profile", path: "/profile", icon: UserCircle2 },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
    { id: "info", label: "Info", path: "/info", icon: Info },
  ];

import { useAuthStore } from "./store/authStore";
import { LoginView } from "./modules/auth/LoginView";
import { RegisterView } from "./modules/auth/RegisterView";

function App() {
  const location = useLocation();
  const {
    isAuthenticated,
    isRegistered,
    isLoading,
    checkRegistration
  } = useAuthStore();

  const {
    activeModule,
    setActiveModule,
    sidebarCollapsed,
    toggleSidebar,
    initializeTheme,
    syncSystemTheme,
  } = useUiStore();
  const currentLabel = navItems.find((item) => item.id === activeModule)?.label ?? "Teebot Flow";

  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

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
      <div className={`grid h-screen ${sidebarCollapsed ? "grid-cols-[92px_1fr]" : "grid-cols-[270px_1fr]"}`}>
        <aside className="h-screen overflow-y-auto border-r border-border bg-surface p-6">
          <div className="mb-8 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Teebot Flow logo"
                className="h-10 w-auto max-w-[140px] object-contain"
              />
              {!sidebarCollapsed ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan">Teebot</p>
                  <h1 className="text-lg font-semibold leading-tight">Teebot Flow</h1>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`inline-flex items-center justify-center rounded-md border border-border bg-card text-xs font-medium text-text-primary transition hover:border-primary hover:bg-primary/10 ${sidebarCollapsed ? "h-9 w-9" : "w-fit gap-1 px-3 py-1.5"
                }`}
            >
              {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              {!sidebarCollapsed ? "Collapse" : null}
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setActiveModule(item.id)}
                className={({ isActive }) =>
                  `group relative rounded-lg border transition ${isActive || activeModule === item.id
                    ? "border-primary/80 bg-primary/15 text-text-primary"
                    : "border-transparent text-text-muted hover:border-border hover:bg-card hover:text-text-primary"
                  } ${sidebarCollapsed ? "flex h-11 items-center justify-center px-0" : "px-3 py-3"}`
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
          <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-8 py-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <strong className="text-base font-semibold text-text-primary">{currentLabel}</strong>
              </div>
              <img
                src="/logo.png"
                alt="Teebot icon"
                className="h-8 w-auto max-w-[120px] object-contain"
              />
            </div>
          </header>
          <main className="overflow-y-auto p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/delivery-challan" replace />} />
              <Route path="/dashboard" element={<DashboardModule />} />
              <Route path="/delivery-challan" element={<DeliveryChallanModule />} />
              <Route path="/inventory" element={<InventoryModule />} />
              <Route path="/customers" element={<CustomersModule />} />
              <Route path="/reports" element={<ReportsModule />} />
              <Route path="/invoices" element={<InvoicesModule />} />
              <Route path="/profile" element={<ProfileModule />} />
              <Route path="/settings" element={<SettingsModule />} />
              <Route path="/info" element={<InfoModule />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
