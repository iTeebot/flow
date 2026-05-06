import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, FileText, Printer } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { formatCurrency } from "../../lib/utils";
import { getDashboardSummary, type DashboardSummary } from "../dashboard/api";
import { listDeliveryChallans, type DeliveryChallan } from "../deliveryChallan/api";
import { downloadDeliveryChallanPdf, printDeliveryChallan } from "./pdf";
import { useToastStore } from "../../store/toastStore";
import { useUiStore } from "../../store/uiStore";

export function ReportsModule() {
  const { companyId, currency } = useAuthStore();
  const currentCompanyId = companyId || 1;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [selectedChallanId, setSelectedChallanId] = useState<number | null>(null);
  const { setLoading } = useUiStore();
  const { addToast } = useToastStore();
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true, "Processing Business Intelligence...");
        const [dashboardData, deliveryChallans] = await Promise.all([
          getDashboardSummary(currentCompanyId),
          listDeliveryChallans(currentCompanyId),
        ]);
        setSummary(dashboardData);
        setChallans(deliveryChallans);
        if (deliveryChallans.length > 0) {
          setSelectedChallanId(deliveryChallans[0].id);
        }
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to load reports", "error");
      } finally {
        setLoading(false);
      }
    };

    if (currentCompanyId) {
      loadReports();
    }
  }, [currentCompanyId]);

  const selectedChallan = useMemo(
    () => challans.find((challan) => challan.id === selectedChallanId) ?? null,
    [challans, selectedChallanId],
  );

  const handleDownload = async () => {
    if (!selectedChallan) return;
    setIsDownloading(true);
    setLoading(true, "Generating PDF Document...");
    try {
      const savedPath = await downloadDeliveryChallanPdf(selectedChallan);
      if (savedPath === "browser-download") {
        addToast("Document has been downloaded to your browser.", "info");
      } else {
        addToast("Document PDF saved successfully!", "success", savedPath);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to download PDF", "error");
    } finally {
      setIsDownloading(false);
      setLoading(false);
    }
  };


  const handlePrint = () => {
    if (!selectedChallan) {
      addToast("No challan selected to print", "error");
      return;
    }
    
    addToast("Opening print view...", "info");
    try {
      printDeliveryChallan(selectedChallan);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to open print view", "error");
    }
  };

  // Loading is now handled globally via useUiStore.setLoading
  if (!summary) {
    return (
      <div className="p-4 text-text-muted">
        No report data available.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Business Intelligence</h1>
          <p className="text-sm text-text-muted mt-1">Analytics, trends, and document exports</p>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={handlePrint}
                disabled={!selectedChallan}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                <Printer className="h-4 w-4" />
                Quick Print
            </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-success/10 p-2.5 text-success">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-success bg-success/5 px-2 py-0.5 rounded-full border border-success/10">Growth</span>
          </div>
          <p className="text-sm font-medium text-text-muted">Total Cumulative Sales</p>
          <p className="mt-1 text-3xl font-black text-text-primary tracking-tight">
            {formatCurrency(summary.kpi.total_sales, currency)}
          </p>
        </div>

        <div className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-warning/10 p-2.5 text-warning">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-warning bg-warning/5 px-2 py-0.5 rounded-full border border-warning/10">Pending</span>
          </div>
          <p className="text-sm font-medium text-text-muted">Open Deliveries</p>
          <p className="mt-1 text-3xl font-black text-text-primary tracking-tight">
            {summary.kpi.pending_deliveries}
          </p>
        </div>

        <div className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">Record</span>
          </div>
          <p className="text-sm font-medium text-text-muted">Challan Inventory</p>
          <p className="mt-1 text-3xl font-black text-text-primary tracking-tight">{challans.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Export Section */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
            <div className="border-b border-border bg-surface/30 px-6 py-5">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Document Export Engine
              </h2>
              <p className="text-xs text-text-muted mt-1">Generate PDF and Print outputs for your records</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Select Target Document</label>
                <select
                    className="w-full"
                    value={selectedChallanId ?? ""}
                    onChange={(event) => setSelectedChallanId(Number(event.target.value))}
                >
                    {challans.map((challan) => (
                    <option key={challan.id} value={challan.id}>
                        {challan.dc_number} — {challan.customer_name}
                    </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!selectedChallan || isDownloading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                    <Download className="h-4 w-4" />
                    {isDownloading ? "Generating PDF..." : "Export as PDF"}
                </button>
                <button
                    type="button"
                    onClick={handlePrint}
                    disabled={!selectedChallan}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-text-primary hover:bg-surface disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Printer className="h-4 w-4" />
                    Print Layout
                </button>
              </div>
            </div>
          </div>

          {/* Trends Section */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
            <div className="border-b border-border bg-surface/30 px-6 py-5">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analytical Sales Trend
              </h2>
              <p className="text-xs text-text-muted mt-1">Reviewing historical transaction density</p>
            </div>
            
            <div className="p-2">
                {summary.sales_trend.length === 0 ? (
                  <div className="py-12 text-center text-text-muted text-sm">No sales trend data yet.</div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {summary.sales_trend.map((point) => (
                      <div
                        key={point.date}
                        className="group flex items-center justify-between px-4 py-3.5 hover:bg-surface/40 transition-colors rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                            <span className="text-sm font-medium text-text-muted">{point.date}</span>
                        </div>
                        <span className="text-sm font-bold text-text-primary tracking-tight">{formatCurrency(point.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
      </div>
    </div>
  );
}
