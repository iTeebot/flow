import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Package,
  Users,
  Coins,
  FileText,
  TrendingUp,
  Activity,
  ArrowUpRight,
  History
} from "lucide-react";
import { getDashboardSummary, type DashboardSummary } from "./api";
import { useAuthStore } from "../../store/authStore";
import { formatCurrency } from "../../lib/utils";
import { Table } from "../../components/ui/Table";

export function DashboardModule() {
  const { t } = useTranslation("dashboard");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { companyId, currency } = useAuthStore();
  const currentCompanyId = companyId || 1;

  useEffect(() => {
    if (currentCompanyId) {
      loadDashboard();
    }
  }, [currentCompanyId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await getDashboardSummary(currentCompanyId);
      setData(summary);
    } catch (err: any) {
      setError(err.toString());
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm text-text-muted animate-pulse">{t("loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center text-error border-dashed flex flex-col items-center gap-2">
        <p className="font-bold">{t("error")}</p>
        {error && <p className="text-xs opacity-70 font-mono bg-error/10 p-2 rounded">{error}</p>}
        <button 
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 bg-error text-white rounded-lg text-sm font-bold hover:bg-error/80 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const CHART_COLORS = ["#0284C7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t("title")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-text-muted bg-surface/50 border border-border px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1"></div>
          {t("live_feed")}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t("asset_catalog"), value: data.kpi.total_products, icon: Package, color: 'bg-primary/10 text-primary', sub: t("sku_count") },
          { label: t("active_clients"), value: data.kpi.total_customers, icon: Users, color: 'bg-success/10 text-success', sub: t("registered_database") },
          { label: t("revenue_pool"), value: formatCurrency(data.kpi.total_sales, currency), icon: Coins, color: 'bg-warning/10 text-warning', sub: t("cumulative_revenue") },
          { label: t("open_logistics"), value: data.kpi.pending_deliveries, icon: FileText, color: 'bg-error/10 text-error', sub: t("pending_deliveries") }
        ].map((kpi, idx) => (
          <div key={idx} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">{kpi.label}</p>
                <p className="text-2xl font-black text-text-primary tracking-tight mt-1">{kpi.value}</p>
              </div>
              <div className={`rounded-xl ${kpi.color} p-3 shadow-inner`}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px]">
              <span className="text-text-muted/60">{kpi.sub}</span>
              <ArrowUpRight className="h-3 w-3 text-text-muted/30 group-hover:text-primary transition-colors" />
            </div>
            {/* Glow effect on hover */}
            <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        ))}
      </div>

      {/* Primary Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Performance Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-border bg-surface/30 px-6 py-5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t("revenue_performance")}
            </h3>
            <span className="text-[10px] font-bold text-text-muted bg-surface border border-border/50 px-2 py-0.5 rounded uppercase">{t("7_day_window")}</span>
          </div>
          <div className="p-6 flex-1">
            {data.sales_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.sales_trend}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415520" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    cursor={{ stroke: '#0284C7', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: "#0284C7", fontWeight: 700 }}
                    labelStyle={{ color: "#94a3b8", fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                    formatter={(value: any) => formatCurrency(value as number, currency)}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#0284C7"
                    strokeWidth={4}
                    dot={{ fill: "#0284C7", r: 4, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    name={t("daily_revenue")}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-muted space-y-2 opacity-40">
                <History className="h-10 w-10" />
                <p className="text-sm italic">{t("no_history")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Stream */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-border bg-surface/30 px-6 py-5">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
              <Activity className="h-4 w-4 text-primary" />
              {t("event_stream")}
            </h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[380px] space-y-4">
            {data.recent_activity.length > 0 ? (
              data.recent_activity.map((activity) => (
                <div key={activity.id} className="relative pl-6 pb-2 border-l border-primary/20 last:border-0 last:pb-0">
                  <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/10"></div>
                  <div className="p-3 rounded-xl bg-surface/30 border border-border/40 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{activity.activity_type}</span>
                      <span className="text-[9px] text-text-muted font-bold">{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-text-primary/90 font-medium leading-relaxed">{activity.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-muted/40 text-center p-8">
                <Activity className="h-12 w-12 mb-2" />
                <p className="text-xs font-bold uppercase">{t("no_events")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border bg-surface/30 px-6 py-5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
              <Package className="h-4 w-4 text-primary" />
              {t("inventory_valuation")}
            </h3>
          </div>
          <div className="p-2 overflow-x-auto">
            <Table
              data={data.inventory_status.slice(0, 6)}
              keyExtractor={(_, index) => index}
              columns={[
                {
                  header: t("article"),
                  accessor: (item) => <div className="text-xs font-bold text-text-primary">{item.product_name}</div>
                },
                {
                  header: t("level"),
                  accessor: (item) => (
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${item.stock_qty < 10 ? 'bg-error' : 'bg-success'}`}></div>
                      <span className="text-xs font-medium text-text-muted">
                        {item.stock_qty} <span className="text-[9px] opacity-40">{t("units")}</span>
                      </span>
                    </div>
                  )
                },
                {
                  header: t("valuation"),
                  headerClassName: "text-right",
                  className: "text-right",
                  accessor: (item) => <div className="text-xs font-black text-text-primary">{formatCurrency(item.stock_value, currency)}</div>
                },
                {
                  header: t("weight"),
                  headerClassName: "text-right",
                  className: "text-right",
                  accessor: (item) => {
                    const totalValue = data.inventory_status.reduce((sum, i) => sum + i.stock_value, 0);
                    const percentage = totalValue > 0 ? (item.stock_value / totalValue) * 100 : 0;
                    return (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black text-primary">{percentage.toFixed(1)}%</span>
                        <div className="h-1 w-16 rounded-full bg-surface">
                          <div className="h-1 rounded-full bg-primary" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  }
                }
              ]}
            />
          </div>
        </div>

        {/* Global Stock Split */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-fit">
          <div className="border-b border-border bg-surface/30 px-6 py-5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
              <History className="h-4 w-4 text-primary" />
              {t("equity_distribution")}
            </h3>
          </div>
          <div className="p-6">
            {data.inventory_status.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data.inventory_status.slice(0, 5)}
                    dataKey="stock_value"
                    nameKey="product_name"
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    stroke="none"
                  >
                    {data.inventory_status.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }}
                    itemStyle={{ color: "#fff", fontWeight: 700, fontSize: '12px' }}
                    formatter={(value: any) => formatCurrency(value as number, currency)}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value: string) => <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-text-muted/30">
                {t("no_equity")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
