import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, FileText, Printer } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getDashboardSummary, type DashboardSummary } from "../dashboard/api";
import { listDeliveryChallans, type DeliveryChallan } from "../deliveryChallan/api";
import { downloadDeliveryChallanPdf, printDeliveryChallan } from "./pdf";

export function ReportsModule() {
  const { companyId } = useAuthStore();
  const currentCompanyId = companyId || 1;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [selectedChallanId, setSelectedChallanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
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
        setError(err instanceof Error ? err.message : "Failed to load reports");
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
    setError(null);
    setNotice(null);
    setIsDownloading(true);
    try {
      const savedPath = await downloadDeliveryChallanPdf(selectedChallan);
      setNotice(`PDF saved to: ${savedPath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handlePrint = () => {
    if (!selectedChallan) return;
    printDeliveryChallan(selectedChallan);
  };

  if (loading) {
    return <div className="text-text-muted">Loading reports...</div>;
  }

  if (error || !summary) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
        {error || "Failed to load reports"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <p className="text-text-muted">
          Reporting dashboard and document outputs for delivery challans.
        </p>
      </div>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-sm text-text-muted">Total Sales</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            ${summary.kpi.total_sales.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-sm text-text-muted">Pending Deliveries</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {summary.kpi.pending_deliveries}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-sm text-text-muted">Total Challans</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">{challans.length}</p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
          <FileText className="h-5 w-5" />
          Delivery Challan Document Export
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto]">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-text-primary"
            value={selectedChallanId ?? ""}
            onChange={(event) => setSelectedChallanId(Number(event.target.value))}
          >
            {challans.map((challan) => (
              <option key={challan.id} value={challan.id}>
                {challan.dc_number} - {challan.customer_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!selectedChallan}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            Print View
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selectedChallan || isDownloading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
          <BarChart3 className="h-5 w-5" />
          Recent Sales Trend
        </h2>
        {summary.sales_trend.length === 0 ? (
          <p className="text-text-muted">No sales trend data yet.</p>
        ) : (
          <div className="space-y-2">
            {summary.sales_trend.map((point) => (
              <div
                key={point.date}
                className="flex items-center justify-between rounded border border-border/60 bg-surface/40 px-3 py-2 text-sm"
              >
                <span className="text-text-muted">{point.date}</span>
                <span className="font-medium text-text-primary">${point.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {notice ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-md rounded-md border border-green-300 bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
