import { useEffect, useMemo, useState } from "react";
import { FileText, PlusCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { listDeliveryChallans, type DeliveryChallan } from "../deliveryChallan/api";
import { TablePagination } from "../shared/TablePagination";
import { createInvoiceFromChallan, listInvoices, type Invoice } from "./api";

export function InvoicesModule() {
  const { companyId } = useAuthStore();
  const currentCompanyId = companyId || 1;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [selectedDcId, setSelectedDcId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "draft">("all");
  const [sortBy, setSortBy] = useState<"date" | "invoice" | "customer" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoiceRows, challanRows] = await Promise.all([
        listInvoices(currentCompanyId),
        listDeliveryChallans(currentCompanyId),
      ]);
      setInvoices(invoiceRows);
      setChallans(challanRows);
      if (challanRows.length > 0 && selectedDcId == null) {
        setSelectedDcId(challanRows[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompanyId) {
      loadData();
    }
  }, [currentCompanyId]);

  const handleCreate = async () => {
    if (!selectedDcId) return;
    try {
      setBusy(true);
      setError(null);
      const result = await createInvoiceFromChallan({
        company_id: currentCompanyId,
        dc_id: selectedDcId,
        notes: notes || null,
      });
      setNotice(`Invoice ${result.invoice_number} created.`);
      setNotes("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices
      .filter((invoice) => {
        const search = searchTerm.trim().toLowerCase();
        const matchSearch =
          !search ||
          invoice.invoice_number.toLowerCase().includes(search) ||
          (invoice.dc_number || "").toLowerCase().includes(search) ||
          invoice.customer_name.toLowerCase().includes(search);
        const matchStatus = statusFilter === "all" || invoice.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        let base = 0;
        if (sortBy === "date") {
          base = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortBy === "amount") {
          base = a.total_amount - b.total_amount;
        } else if (sortBy === "customer") {
          base = a.customer_name.localeCompare(b.customer_name);
        } else {
          base = a.invoice_number.localeCompare(b.invoice_number);
        }
        return sortOrder === "asc" ? base : -base;
      });
  }, [invoices, searchTerm, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading) {
    return <div className="text-text-muted">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Invoices</h1>
        <p className="text-text-muted">Generate invoices from delivery challans and track issued records.</p>
      </div>

      <div className="rounded-md border border-border bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">Create Invoice</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <select
            value={selectedDcId ?? ""}
            onChange={(e) => setSelectedDcId(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-text-primary"
          >
            {challans.map((challan) => (
              <option key={challan.id} value={challan.id}>
                {challan.dc_number} - {challan.customer_name}
              </option>
            ))}
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="rounded-md border border-border bg-background px-3 py-2 text-text-primary"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy || !selectedDcId}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <PlusCircle className="h-4 w-4" />
            {busy ? "Creating..." : "Create Invoice"}
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm text-green-600">{notice}</p> : null}
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Invoices ({filtered.length})</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-4">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search invoice, challan, customer..."
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "issued" | "draft");
                setPage(1);
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="all">All Statuses</option>
              <option value="issued">Issued</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "invoice" | "customer" | "amount")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="date">Sort By Date</option>
              <option value="invoice">Sort By Invoice Number</option>
              <option value="customer">Sort By Customer</option>
              <option value="amount">Sort By Amount</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <FileText className="mx-auto h-12 w-12 text-text-muted/50" />
            <p className="mt-2">No invoices found. Generate your first invoice from a challan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-surface/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">From Challan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-surface/30">
                    <td className="px-6 py-4 font-medium text-text-primary">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-text-muted">{invoice.dc_number || "-"}</td>
                    <td className="px-6 py-4 text-text-muted">{invoice.customer_name}</td>
                    <td className="px-6 py-4 text-text-muted">${invoice.total_amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full border border-border px-2 py-1 text-xs text-text-primary">{invoice.status}</span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{new Date(invoice.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 ? (
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
