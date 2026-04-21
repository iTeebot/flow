import { invoke } from "../../lib/api";

export type KPI = {
  total_products: number;
  total_customers: number;
  total_sales: number;
  pending_deliveries: number;
};

export type SalesTrendPoint = {
  date: string;
  amount: number;
};

export type InventoryItem = {
  product_name: string;
  stock_qty: number;
  stock_value: number;
};

export type ActivityItem = {
  id: number;
  activity_type: string;
  description: string;
  created_at: string;
};

export type DashboardSummary = {
  kpi: KPI;
  sales_trend: SalesTrendPoint[];
  inventory_status: InventoryItem[];
  recent_activity: ActivityItem[];
};

export async function getDashboardSummary(company_id: number) {
  return invoke<DashboardSummary>("get_dashboard_summary", { companyId: company_id });
}
