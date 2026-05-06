import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, PlusCircle, Search, Eye, Download, Printer, Edit2, Trash2, ArrowLeft, Users, Package, Info } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { listDeliveryChallans, getDeliveryChallan, type DeliveryChallan } from "../deliveryChallan/api";
import { TablePagination } from "../shared/TablePagination";
import { createInvoiceFromChallan, listInvoices, deleteInvoice, updateInvoice, type Invoice } from "./api";
import { formatCurrency } from "../../lib/utils";
import { useToastStore } from "../../store/toastStore";
import { ModulePage } from "../../components/ModulePage";
import { DataTable } from "../../components/DataTable";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Dialog } from "../../components/ui/Dialog";
import { printInvoice, downloadInvoicePdf, previewInvoice } from "../reports/pdf";
import { useUiStore } from "../../store/uiStore";
import { getCompanyProfile, type CompanyProfile } from "../companyProfile/api";
import { listCustomers, type Customer } from "../customers/api";

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
  const [busy, setBusy] = useState(false);
  const { setLoading } = useUiStore();
  const [isReviewing, setIsReviewing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [reviewDc, setReviewDc] = useState<DeliveryChallan | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const reviewTotals = useMemo(() => {
    if (!reviewDc) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = reviewDc.items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [reviewDc]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  const loadData = async () => {
    try {
      setLoading(true, "Synchronizing financial records...");
      const [invoiceRows, challanRows, profile] = await Promise.all([
        listInvoices(currentCompanyId),
        listDeliveryChallans(currentCompanyId),
        getCompanyProfile(currentCompanyId),
      ]);
      setInvoices(invoiceRows);
      setChallans(challanRows);
      setCompanyProfile(profile);
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

  const handleReview = async () => {
    if (!selectedDcId) return;
    try {
      setBusy(true);
      setLoading(true, "Accessing Delivery Records...");
      const dc = await getDeliveryChallan(selectedDcId);
      
      if (currentCompanyId) {
        const customers = await listCustomers(currentCompanyId);
        const customer = customers.find(c => c.id === dc.customer_id);
        setCustomerProfile(customer || null);
      }

      setReviewDc(dc);
      setIsReviewing(true);
      setIsFinalized(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load challan details", "error");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (invoiceToEdit) {
      try {
        setBusy(true);
        setLoading(true, "Updating Invoice...");
        await updateInvoice({
          id: invoiceToEdit.id,
          customer_id: invoiceToEdit.customer_id,
          invoice_type: invoiceToEdit.invoice_type || "Sale Invoice",
          invoice_date: invoiceToEdit.invoice_date || new Date().toISOString().split('T')[0],
          notes: notes || null,
          items: invoiceToEdit.items.map(item => ({
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }))
        } as any);
        addToast(`Invoice ${invoiceToEdit.invoice_number} updated successfully!`, "success");
        setNotes("");
        setIsFinalized(false);
        handleCancelReview();
        await loadData();
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to update invoice", "error");
      } finally {
        setBusy(false);
        setLoading(false);
      }
      return;
    }

    if (!selectedDcId) return;

    try {
      setBusy(true);
      setLoading(true, "Generating Document...");
      const result = await createInvoiceFromChallan({
        company_id: currentCompanyId,
        dc_id: selectedDcId,
        notes: notes || null,
      });
      addToast(`Invoice ${result.invoice_number} created successfully!`, "success");
      setNotes("");
      setIsFinalized(false);
      handleCancelReview();
      await loadData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create invoice", "error");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  };

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



  const handleCancelReview = () => {
    setIsReviewing(false);
    setInvoiceToEdit(null);
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      setDownloadingId(invoice.id);
      const savedPath = await downloadInvoicePdf(invoice);
      addToast("Invoice PDF saved", "success", savedPath);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to download", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  if (isReviewing && reviewDc) {
    return (
      <div className="flex flex-col h-full bg-background relative animate-in fade-in duration-300">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCancelReview}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-text-muted" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-text-primary leading-tight">
                {invoiceToEdit ? "Edit Sales Invoice" : "Create Sales Invoice"}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-1">Regulatory Compliance Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelReview}
              className="px-6 py-2.5 rounded-lg border border-border bg-surface text-sm font-bold text-text-primary hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsFinalized(true)}
              disabled={isFinalized}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                isFinalized 
                  ? "bg-primary/50 text-primary-foreground/50 cursor-not-allowed" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              }`}
            >
              <FileText className="h-4 w-4" />
              {isFinalized ? "Finalized" : invoiceToEdit ? "Update" : "Finalize Invoice"}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
             {/* LEFT COLUMN */}
             <div className="lg:col-span-2 space-y-5">
                {/* INVOICE HEADER */}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-md">
                  <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-primary mb-5">
                    <FileText className="h-4 w-4 text-primary" /> Invoice Header
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Invoice Type</label>
                      <select disabled={isFinalized} className="w-full h-11 bg-background border-border text-sm font-medium rounded-lg">
                        <option>Sale Invoice</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Invoice Date</label>
                      <input type="date" disabled={isFinalized} className="w-full h-11 bg-background border-border text-sm font-medium rounded-lg px-3" value={new Date().toISOString().split('T')[0]} readOnly />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Reference Number</label>
                      <input type="text" disabled={isFinalized} className="w-full h-11 bg-background border-border text-sm font-bold rounded-lg px-3" defaultValue="" placeholder="Optional reference..." />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* SELLER DETAILS */}
                  <div className="bg-surface border border-border rounded-xl p-5 shadow-md">
                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-success mb-5">
                      <div className="w-2 h-2 rounded-full bg-success"></div> Seller Details (You)
                    </h3>
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Business Name</label>
                        <div className="text-sm font-bold">{companyProfile?.company_name || "Teebot"}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">NTN / CNIC</label>
                          <div className="text-sm font-bold">{companyProfile?.tax_registration_number || "—"}</div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Province</label>
                          <div className="text-sm font-bold">{companyProfile?.state || "—"}</div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Address</label>
                        <div className="text-sm font-bold text-text-secondary truncate">{companyProfile?.address || "-"}</div>
                      </div>
                    </div>
                  </div>

                  {/* BUYER DETAILS */}
                  <div className="bg-surface border border-border rounded-xl p-5 shadow-md">
                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary mb-5">
                      <Users className="h-4 w-4" /> Buyer Details
                    </h3>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Select Buyer</label>
                        <select disabled={isFinalized} className="w-full h-11 bg-background border-border text-sm font-medium rounded-lg">
                          <option>{reviewDc.customer_name}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">NTN / CNIC (7 or 13 digits)</label>
                        <input type="text" disabled={isFinalized} className="w-full h-11 bg-background border-border text-sm font-bold rounded-lg px-3" value={customerProfile?.tax_registration_number || ""} readOnly />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Province</label>
                          <select disabled={isFinalized} className="w-full h-11 bg-background border-border text-sm font-medium rounded-lg">
                            <option>{customerProfile?.province || "Not Set"}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Registration</label>
                          <select disabled={isFinalized} className="w-full h-11 bg-background border-border text-sm font-medium rounded-lg">
                            <option>{customerProfile?.registration_type || "Unregistered"}</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Buyer Address</label>
                        <input type="text" disabled={isFinalized} className="w-full h-11 bg-background border-border text-sm font-medium rounded-lg px-3" value={customerProfile?.address || ""} readOnly />
                      </div>
                    </div>
                  </div>
                </div>


             </div>

             {/* RIGHT COLUMN */}
             <div className="space-y-5">
                {/* FINANCIAL SUMMARY */}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-md">
                   <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6">Financial Summary</h3>
                   
                   <div className="space-y-4 mb-6">
                     <div className="flex justify-between items-center text-xs font-black tracking-widest uppercase text-text-muted">
                       <span>Value Excl. ST</span>
                       <span className="text-text-primary">PKR {reviewTotals.subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs font-black tracking-widest uppercase text-text-muted">
                       <span>Sales Tax (18%)</span>
                       <span className="text-primary">PKR {reviewTotals.tax.toFixed(2)}</span>
                     </div>
                     <div className="pt-5 border-t border-border flex justify-between items-center">
                       <span className="text-xs font-black uppercase tracking-widest text-text-muted">Grand Total</span>
                       <span className="text-2xl font-black text-primary tracking-tight">PKR {reviewTotals.total.toFixed(2)}</span>
                     </div>
                   </div>

                   <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3 mb-6">
                     <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                     <p className="text-[10px] leading-relaxed font-medium text-text-muted">
                       All calculations are based on regulatory standards. Ensure the <strong className="text-primary font-bold">HS Code</strong> and <strong className="text-primary font-bold">Buyer NTN</strong> are accurate for valid tax reporting.
                     </p>
                   </div>

                   <button
                     onClick={handleCreate}
                     disabled={!isFinalized || busy}
                     className={`w-full py-3.5 rounded-lg text-sm font-black uppercase tracking-widest shadow-lg transition-all ${
                       !isFinalized 
                         ? "bg-background border border-border text-text-muted cursor-not-allowed" 
                         : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                     }`}
                   >
                     {busy ? "Processing..." : invoiceToEdit ? "Update" : "Generate Document"}
                   </button>
                </div>

                {/* INTERNAL NOTES */}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-md">
                   <h3 className="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Internal Notes</h3>
                   <textarea
                     disabled={isFinalized}
                     value={notes}
                     onChange={e => setNotes(e.target.value)}
                     placeholder="Add any internal remarks or terms here..."
                     className="w-full bg-background border border-border rounded-lg p-3 text-sm min-h-[120px] resize-none focus:border-primary transition-colors disabled:opacity-50"
                   />
                </div>
              </div>

              {/* FULL WIDTH LINE ITEMS */}
              <div className="lg:col-span-3">
                <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-lg">
                   <div className="p-5 border-b border-border flex items-center justify-between bg-surface/50">
                     <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                       <Package className="h-4 w-4" /> Line Items
                     </h3>
                     <button disabled={isFinalized} className="px-4 py-2 rounded-lg bg-background border border-border text-xs font-bold text-text-muted hover:text-text-primary transition-colors disabled:opacity-50">Add Product...</button>
                   </div>
                   <div className="w-full overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-background/80 border-b border-border">
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Product / HS Code</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Qty / UOM</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Unit Price (PKR)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted text-center">Tax Rate %</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Sales Tax</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Amount</th>
                            <th className="p-4"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {reviewDc.items.map((item, i) => {
                            const salesTax = item.amount * 0.18;
                            const totalWithTax = item.amount + salesTax;
                            return (
                              <tr key={i} className="border-b border-border/50 hover:bg-surface-hover/30 transition-colors">
                                <td className="p-4">
                                  <div className="font-bold text-sm text-text-primary mb-1.5">{item.product_name}</div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">HS:</span>
                                    <button disabled={isFinalized} className="text-[10px] font-bold px-2 py-0.5 rounded border border-border bg-background text-text-muted hover:text-text-primary disabled:opacity-50">Set HS Code</button>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <input type="number" disabled={isFinalized} className="w-20 h-9 bg-background border border-border text-center font-bold rounded text-sm text-text-primary disabled:opacity-50" defaultValue={item.quantity} />
                                  <div className="text-[9px] font-bold text-text-muted mt-1.5">Numbers, pieces, units</div>
                                </td>
                                <td className="p-4">
                                  <input type="number" disabled={isFinalized} className="w-20 h-9 bg-background border border-border text-center font-bold rounded text-sm text-text-primary disabled:opacity-50" defaultValue={item.rate} />
                                </td>
                                <td className="p-4 text-center">
                                  <div className="px-3 py-1.5 rounded bg-background border border-border font-bold text-sm inline-block text-text-primary">18%</div>
                                </td>
                                <td className="p-4">
                                  <div className="text-xs font-bold text-primary mb-1">PKR {salesTax.toFixed(2)}</div>
                                  <div className="text-[9px] font-bold text-text-muted">Further Tax:<br/>PKR 0.00</div>
                                </td>
                                <td className="p-4 font-black text-sm text-text-primary">PKR {totalWithTax.toFixed(2)}</td>
                                <td className="p-4 text-right">
                                  <button disabled={isFinalized} className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                     </table>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // Loading is now handled globally via useUiStore.setLoading
  return (
    <ModulePage
      title="Financial Invoicing"
      subtitle="Convert delivery challans into professional invoices"
      loading={false}
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

        <div className="p-6 space-y-5 bg-gradient-to-br from-card to-surface/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    {challan.dc_number} - {challan.customer_name}
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
              onClick={handleReview}
              disabled={busy || !selectedDcId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              ) : <PlusCircle className="h-4 w-4" />}
              Review and Finalize
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
            onClick: () => previewInvoice(invoice)
          },
          {
            label: "Edit Invoice",
            icon: Edit2,
            onClick: () => {
              setInvoiceToEdit(invoice);
              setReviewDc({
                id: invoice.dc_id || 0,
                dc_number: invoice.dc_number || "",
                customer_id: invoice.customer_id,
                customer_name: invoice.customer_name,
                company_id: invoice.company_id,
                items: invoice.items.map(i => ({
                  id: i.id,
                  product_id: i.product_id || 0,
                  product_name: i.description,
                  product_sku: '',
                  quantity: i.quantity,
                  rate: i.unit_price,
                  amount: i.amount
                })),
                total_amount: invoice.total_amount,
                created_at: invoice.created_at,
              });
              setNotes(invoice.notes || "");
              setIsReviewing(true);
              setIsFinalized(false);
            }
          },
          {
            label: downloadingId === invoice.id ? "Downloading..." : "Download PDF",
            icon: Download,
            onClick: () => handleDownloadPdf(invoice)
          },
          {
            label: "Print",
            icon: Printer,
            onClick: () => printInvoice(invoice)
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
