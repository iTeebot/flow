import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, PlusCircle, Search, Eye, Download, Printer, Edit, Trash2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { listDeliveryChallans, type DeliveryChallan } from "../deliveryChallan/api";
import { TablePagination } from "../shared/TablePagination";
import { listInvoices, deleteInvoice, type Invoice } from "./api";

import { formatCurrency } from "../../lib/utils";
import { useToastStore } from "../../store/toastStore";
import { ModulePage } from "../../components/ModulePage";
import { DataTable } from "../../components/DataTable";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Dialog } from "../../components/ui/Dialog";


import { downloadInvoicePdf, printInvoice } from "../reports/pdf";

export function InvoicesModule() {
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

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
      addToast(typeof err === 'string' ? err : (err instanceof Error ? err.message : "Failed to load invoices"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompanyId) {
      loadData();
    }
  }, [currentCompanyId]);

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    try {
      setIsDeleting(true);
      await deleteInvoice(invoiceToDelete.id);
      addToast("Invoice deleted successfully", "success");
      setInvoices(invoices.filter(i => i.id !== invoiceToDelete.id));
      setInvoiceToDelete(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete invoice", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = () => {
    if (!selectedDcId) return;
    navigate(`/app/invoices/create?dcId=${selectedDcId}`);
  };

  const handleSort = (key: any) => {
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
    <ModulePage
      title="Financial Invoicing"
      subtitle="Convert delivery challans into professional invoices"
      loading={loading}
      listIcon={<FileText className="h-5 w-5" />}
      listTitle="Invoice Registry"
      count={filtered.length}
      action={{
        label: "New Detailed Invoice",
        onClick: () => navigate("/app/invoices/create")
      }}

      filterBar={
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 w-full">
          <div className="md:col-span-2">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search records..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-[46px]"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "issued" | "draft");
              setPage(1);
            }}
            options={[
              { label: "Status: All", value: "all" },
              { label: "Status: Issued", value: "issued" },
              { label: "Status: Draft", value: "draft" },
            ]}
          />
        </div>
      }
      pagination={
        filtered.length > 0 && (
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
        )
      }
    >
      {/* Invoice Creation Tool - Nested inside ModulePage children */}
      <div className="mx-6 mt-6 mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="border-b border-border bg-surface/50 px-6 py-4 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <PlusCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary leading-tight">Quick Invoice (from DC)</h2>
            <p className="text-[10px] text-text-muted uppercase font-black tracking-tighter">Fast Drafting Engine</p>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-gradient-to-br from-card to-surface/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase text-text-muted ml-1 tracking-wider">Target Delivery Challan</label>
              <select
                value={selectedDcId ?? ""}
                onChange={(e) => setSelectedDcId(Number(e.target.value))}
                className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm"
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
                className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!selectedDcId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              Review & Create Invoice
            </button>
          </div>
        </div>
      </div>
      <Dialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Invoice?"
        description={`Are you sure you want to delete ${invoiceToDelete?.invoice_number}? This action will permanently remove the record.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
      <DataTable
        data={paginated}
        keyExtractor={(item) => item.id}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyIcon={<FileText className="h-10 w-10 text-text-muted/30" />}
        emptyMessage="No invoice records identified"
        columns={[
          {
            header: "Invoice Details",
            sortKey: "invoice",
            accessor: (invoice) => (
              <div className="space-y-1">
                <span className="font-mono text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10 tracking-tight">
                  {invoice.invoice_number}
                </span>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  {invoice.invoice_type || "Sale Invoice"}
                </div>
              </div>
            )
          },
          {
            header: "Referenced DC",
            accessor: (invoice) => (
              <span className="font-mono text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                {invoice.dc_number || "N/A"}
              </span>
            )
          },
          {
            header: "Client Name",
            sortKey: "customer",
            accessor: (invoice) => (
              <div className="space-y-0.5">
                <div className="font-semibold text-text-primary text-sm">{invoice.customer_name}</div>
                {invoice.buyer_ntn_cnic && (
                  <div className="text-[10px] text-text-muted font-mono">{invoice.buyer_ntn_cnic}</div>
                )}
              </div>
            )
          },
          {
            header: "Total Value",
            sortKey: "amount",
            accessor: (invoice) => (
              <div className="font-bold text-text-primary text-sm">{formatCurrency(invoice.total_amount, currency)}</div>
            )
          },
          {
            header: "Billing Status",
            accessor: (invoice) => (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${invoice.status === 'issued'
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-warning/10 text-warning border-warning/20'
                }`}>
                {invoice.status}
              </span>
            )
          },
          {
            header: "Invoice Date",
            sortKey: "date",
            accessor: (invoice) => (
              <div className="text-sm text-text-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success/60"></span>
                {invoice.invoice_date 
                  ? invoice.invoice_date 
                  : new Date(invoice.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )
          }
        ]}
        actions={(invoice) => [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => navigate(`/app/invoices/view/${invoice.id}`)
          },
          {
            label: "Edit Invoice",
            icon: Edit,
            onClick: () => navigate(`/app/invoices/edit/${invoice.id}`)
          },
          {
            label: "Download PDF",
            icon: Download,
            onClick: async () => {
              try {
                const savedPath = await downloadInvoicePdf(invoice);
                addToast("Invoice PDF saved successfully", "success", savedPath);
              } catch (err) {
                addToast(err instanceof Error ? err.message : "Failed to generate PDF", "error");
              }
            }
          },
          {
            label: "Print",
            icon: Printer,
            onClick: async () => {
              try {
                await printInvoice(invoice);
              } catch (err) {
                addToast(err instanceof Error ? err.message : "Failed to open print view", "error");
              }
            }
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "danger",
            onClick: () => setInvoiceToDelete(invoice)
          }
        ]}
      />
    </ModulePage>
  );
}
