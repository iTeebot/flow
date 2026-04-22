import { useEffect, useMemo, useState } from "react";
import { FileText, PlusCircle, Search, Eye } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { listDeliveryChallans, type DeliveryChallan } from "../deliveryChallan/api";
import { TablePagination } from "../shared/TablePagination";
import { createInvoiceFromChallan, listInvoices, type Invoice } from "./api";
import { formatCurrency } from "../../lib/utils";
import { useToastStore } from "../../store/toastStore";
import { SortableHeader } from "../../components/SortableHeader";
import { TableActions } from "../../components/TableActions";

export function InvoicesModule() {
  const { companyId, currency } = useAuthStore();
  const currentCompanyId = companyId || 1;
  const { addToast } = useToastStore();

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
      addToast(err instanceof Error ? err.message : "Failed to load invoices", "error");
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
      const result = await createInvoiceFromChallan({
        company_id: currentCompanyId,
        dc_id: selectedDcId,
        notes: notes || null,
      });
      addToast(`Invoice ${result.invoice_number} created successfully!`, "success");
      setNotes("");
      await loadData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create invoice", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSort = (key: "date" | "invoice" | "customer" | "amount") => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
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
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm text-text-muted animate-pulse">Synchronizing financial records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Financial Invoicing</h1>
          <p className="text-sm text-text-muted mt-1">Convert delivery challans into professional invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
            Live Billing Active
          </div>
        </div>
      </div>

      {/* Invoice Creation Tool */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="border-b border-border bg-surface/50 px-6 py-4 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <PlusCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary leading-tight">Generate New Invoice</h2>
            <p className="text-[10px] text-text-muted uppercase font-black tracking-tighter">Drafting Engine</p>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-gradient-to-br from-card to-surface/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase text-text-muted ml-1 tracking-wider">Target Delivery Challan</label>
              <select
                value={selectedDcId ?? ""}
                onChange={(e) => setSelectedDcId(Number(e.target.value))}
                className="w-full"
              >
                {challans.length === 0 && <option>No available challans</option>}
                {challans.map((challan) => (
                  <option key={challan.id} value={challan.id}>
                    {challan.dc_number} — {challan.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-1 lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-text-muted ml-1 tracking-wider">Internal Context / Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference numbers, special terms, or internal memos..."
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy || !selectedDcId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              ) : <PlusCircle className="h-4 w-4" />}
              {busy ? "Drafting Document..." : "Finalize & Create Invoice"}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Registry */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-surface/30 px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Invoice Registry
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                {filtered.length}
              </span>
            </h2>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:w-2/3">
              <div className="relative group lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search records..."
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | "issued" | "draft");
                  setPage(1);
                }}
                className="text-xs"
              >
                <option value="all">Status: All</option>
                <option value="issued">Status: Issued</option>
                <option value="draft">Status: Draft</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "invoice" | "customer" | "amount")}
                className="text-xs"
              >
                <option value="date">Sort by Date</option>
                <option value="invoice">Sort by #</option>
                <option value="customer">Sort by Client</option>
                <option value="amount">Sort by Amount</option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface p-4 mb-4 border border-border">
              <FileText className="h-10 w-10 text-text-muted/30" />
            </div>
            <p className="text-text-muted font-medium">No invoice records identified</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <SortableHeader
                    label="Invoice #"
                    sortKey="invoice"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">Referenced DC</th>
                  <SortableHeader
                    label="Client Name"
                    sortKey="customer"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Total Value"
                    sortKey="amount"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">Billing Status</th>
                  <SortableHeader
                    label="Created At"
                    sortKey="date"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="sticky right-0 z-10 bg-surface/90 w-14 px-2 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted shadow-[-4px_0_10px_rgba(0,0,0,0.1)] backdrop-blur-sm"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((invoice) => (
                  <tr key={invoice.id} className="group hover:bg-surface/30 transition-all duration-200">
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary text-sm tracking-tight">{invoice.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-text-muted bg-surface/50 px-1.5 py-0.5 rounded border border-border/50">
                        {invoice.dc_number || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-text-primary text-sm">{invoice.customer_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary text-sm">{formatCurrency(invoice.total_amount, currency)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${invoice.status === 'issued' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
                        }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-text-muted">{new Date(invoice.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </td>
                    <td className="sticky right-0 z-10 bg-card/95 group-hover:bg-surface/95 w-14 px-2 py-4 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                      <div className="flex items-center justify-end">
                        <TableActions
                          actions={[
                            {
                              label: "View Document",
                              icon: Eye,
                              onClick: () => { /* View logic if applicable, otherwise keep as is */ }
                            }
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="border-t border-border bg-surface/20">
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
          </div>
        )}
      </div>
    </div>
  );
}
