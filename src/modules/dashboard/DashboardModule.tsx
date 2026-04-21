import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  DollarSign,
  FileText,
  TrendingUp,
  Activity,
} from "lucide-react";
import { getDashboardSummary, type DashboardSummary } from "./api";
import { useAuthStore } from "../../store/authStore";

export function DashboardModule() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { companyId } = useAuthStore();
  const currentCompanyId = companyId || 1;

  useEffect(() => {
    if (currentCompanyId) {
      loadDashboard();
    }
  }, [currentCompanyId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const summary = await getDashboardSummary(currentCompanyId);
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
        {error || "Failed to load dashboard data"}
      </div>
    );
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted">Business overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Total Products</p>
              <p className="text-3xl font-bold text-text-primary mt-1">
                {data.kpi.total_products}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Total Customers</p>
              <p className="text-3xl font-bold text-text-primary mt-1">
                {data.kpi.total_customers}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Total Sales</p>
              <p className="text-3xl font-bold text-text-primary mt-1">
                ${data.kpi.total_sales.toFixed(2)}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Pending Deliveries */}
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Pending Deliveries</p>
              <p className="text-3xl font-bold text-text-primary mt-1">
                {data.kpi.pending_deliveries}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sales Trend (Last 7 Days)
          </h2>
          {data.sales_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.sales_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#999", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#999", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "0.375rem",
                  }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: any) => `$${(value as number).toFixed(2)}`}
                />
                <Legend wrapperStyle={{ color: "#999" }} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Sales Amount"
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-80 items-center justify-center text-text-muted">
              No sales data available
            </div>
          )}
        </div>

        {/* Top Products by Inventory Value */}
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Top Products by Value
          </h2>
          {data.inventory_status.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.inventory_status.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="product_name"
                  tick={{ fill: "#999", fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: "#999", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "0.375rem",
                  }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: any) => `$${(value as number).toFixed(2)}`}
                />
                <Legend wrapperStyle={{ color: "#999" }} />
                <Bar
                  dataKey="stock_value"
                  fill="#10b981"
                  name="Stock Value"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-80 items-center justify-center text-text-muted">
              No inventory data available
            </div>
          )}
        </div>
      </div>

      {/* Inventory Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Pie Chart */}
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Distribution
          </h2>
          {data.inventory_status.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.inventory_status.slice(0, 5)}
                  dataKey="stock_value"
                  nameKey="product_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: any) =>
                    `${entry.payload.product_name}: $${entry.payload.stock_value.toFixed(0)}`
                  }
                >
                  {data.inventory_status.slice(0, 5).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => `$${(value as number).toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "0.375rem",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-80 items-center justify-center text-text-muted">
              No inventory data available
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </h2>
          {data.recent_activity.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data.recent_activity.map((activity) => (
                <div key={activity.id} className="p-3 rounded-md bg-surface/50 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-2 flex-shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-text-primary text-sm">
                        {activity.activity_type}
                      </p>
                      <p className="text-text-muted text-sm">{activity.description}</p>
                      <p className="text-text-muted text-xs mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center text-text-muted">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Inventory Summary Table */}
      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Summary
        </h2>
        {data.inventory_status.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-surface/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Product Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Stock Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.inventory_status.map((item, index) => {
                  const totalValue = data.inventory_status.reduce((sum, i) => sum + i.stock_value, 0);
                  const percentage = totalValue > 0 ? (item.stock_value / totalValue) * 100 : 0;
                  return (
                    <tr key={index} className="hover:bg-surface/30">
                      <td className="px-4 py-3 text-text-primary">{item.product_name}</td>
                      <td className="px-4 py-3 text-text-muted">{item.stock_qty} units</td>
                      <td className="px-4 py-3 text-text-muted">
                        ${item.stock_value.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-surface/50">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-text-muted">{percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted">No inventory data available</div>
        )}
      </div>
    </div>
  );
}
