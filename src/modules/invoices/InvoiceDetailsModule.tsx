import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  Printer, 
  Calendar, 
  User, 
  Briefcase,
  ExternalLink,
  Package,
  Hash
} from "lucide-react";
import { getInvoice, type Invoice } from "./api";
import { formatCurrency } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { Button } from "../../components/ui/Button";
import { downloadInvoicePdf, printInvoice } from "../reports/pdf";

export function InvoiceDetailsModule() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currency } = useAuthStore();
  const { addToast } = useToastStore();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getInvoice(Number(id));
        setInvoice(data);
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to load invoice details", "error");
        navigate("/app/invoices");
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [id, navigate, addToast]);

  const handleDownload = async () => {
    if (!invoice) return;
    try {
      setActionLoading(true);
      const savedPath = await downloadInvoicePdf(invoice);
      addToast("Invoice PDF saved successfully", "success", savedPath);

    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to generate PDF", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      await printInvoice(invoice);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to open print view", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-text-muted animate-pulse font-medium">Retrieving financial document...</p>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/app/invoices")}
            className="rounded-full h-10 w-10 border-border/60 hover:bg-surface transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
              {invoice.invoice_number}
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                invoice.status === 'issued' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
              }`}>
                {invoice.status}
              </span>
            </h1>
            <p className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em]">Financial Record Details</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="h-10 border-border/60">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload} disabled={actionLoading} className="h-10 shadow-lg shadow-primary/20">
            <Download className="h-4 w-4 mr-2" />
            {actionLoading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Summary Card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-surface/30">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Line Items
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface/50 text-[10px] font-black uppercase tracking-widest text-text-muted border-b border-border">
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Unit Price</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-surface/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary text-sm group-hover:text-primary transition-colors">{item.description}</div>
                        {item.hs_code && (
                          <div className="text-[10px] text-text-muted font-mono mt-1 uppercase tracking-tighter">HS Code: {item.hs_code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-text-primary bg-surface px-2 py-1 rounded-md border border-border">
                          {item.quantity} <small className="text-[10px] text-text-muted uppercase ml-0.5">{item.uom || 'units'}</small>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-text-muted text-sm">
                        {formatCurrency(item.unit_price, currency)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-text-primary text-sm">
                        {formatCurrency(item.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/5">
                    <td colSpan={3} className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-text-muted">
                      Total Payable Amount
                    </td>
                    <td className="px-6 py-4 text-right font-black text-primary text-lg">
                      {formatCurrency(invoice.total_amount, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-text-muted" />
                Document Notes
              </h3>
              <p className="text-sm text-text-muted leading-relaxed italic bg-surface/50 p-4 rounded-xl border border-border/50">
                "{invoice.notes}"
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Client Details */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-surface/30">
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <User className="h-3 w-3 text-primary" />
                Customer Identity
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-lg font-black text-text-primary leading-tight">{invoice.customer_name}</p>
                <p className="text-[10px] text-text-muted uppercase font-bold mt-1">Verified Client Account</p>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface border border-border flex items-center justify-center">
                    <Hash className="h-4 w-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-text-muted tracking-tighter">Tax ID / CNIC</p>
                    <p className="text-xs font-bold text-text-primary">{invoice.buyer_ntn_cnic || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-surface/30">
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="h-3 w-3 text-primary" />
                Document Context
              </h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-text-muted" />
                  <span className="text-xs font-bold text-text-muted uppercase">Issue Date</span>
                </div>
                <span className="text-xs font-black text-text-primary">
                  {invoice.invoice_date || new Date(invoice.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-text-muted" />
                  <span className="text-xs font-bold text-text-muted uppercase">Ref Challan</span>
                </div>
                <span className="text-xs font-black text-primary hover:underline cursor-pointer flex items-center gap-1">
                  {invoice.dc_number || "Direct Invoice"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-text-muted" />
                  <span className="text-xs font-bold text-text-muted uppercase">Ref Number</span>
                </div>
                <span className="text-xs font-black text-text-primary">
                  {invoice.invoice_ref_no || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">System Actions</h4>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group">
                <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">Duplicate Invoice</span>
                <ExternalLink className="h-3 w-3 text-text-muted" />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group opacity-50 cursor-not-allowed">
                <span className="text-xs font-bold text-text-primary">Mark as Paid</span>
                <div className="h-2 w-2 rounded-full bg-success/60"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
