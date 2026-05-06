import { useEffect, useMemo, useState } from "react";
import { 
  Search, Edit2, Printer, Download, Trash2, FileBadge2, 
  Calendar, Check, X, Send, Clock
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { listQuotations, deleteQuotation, updateQuotationStatus, type Quotation } from "./api";
import { TablePagination } from "../shared/TablePagination";
import { useToastStore } from "../../store/toastStore";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ModulePage } from "../../components/ModulePage";
import { DataTable } from "../../components/DataTable";
import { Dialog } from "../../components/ui/Dialog";
import { formatCurrency } from "../../lib/utils";
import { downloadQuotationPdf, printQuotation } from "../reports/pdf";
import { useUiStore } from "../../store/uiStore";

export function QuotationsModule() {
  const { t } = useTranslation("quotations");
  const navigate = useNavigate();
  const { companyId, currency } = useAuthStore();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const { setLoading } = useUiStore();
  const { addToast } = useToastStore();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async () => {
    if (!companyId) return;
    try {
      setLoading(true, t("loading_quotes", "Processing Quotations..."));
      const data = await listQuotations(companyId);
      setQuotations(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load quotations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        q.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleDelete = (quote: Quotation) => {
    setQuoteToDelete(quote);
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    try {
      setIsDeleting(true);
      await deleteQuotation(quoteToDelete.id);
      addToast(`Quotation ${quoteToDelete.quote_number} deleted`, "success");
      await loadData();
      setQuoteToDelete(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete quotation", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (quote: Quotation, newStatus: string) => {
    try {
      await updateQuotationStatus(quote.id, newStatus);
      addToast(`Quotation marked as ${newStatus}`, "success");
      await loadData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update status", "error");
    }
  };

  const handlePrint = async (quote: Quotation) => {
    try {
      await printQuotation(quote);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to print quotation", "error");
    }
  };

  const handleDownloadPdf = async (quote: Quotation) => {
    setDownloadingId(quote.id);
    try {
      const savedPath = await downloadQuotationPdf(quote);
      addToast("Quotation PDF saved successfully!", "success", savedPath);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to download PDF", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'bg-success/10 text-success border-success/20';
      case 'sent':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'rejected':
        return 'bg-error/10 text-error border-error/20';
      case 'draft':
      default:
        return 'bg-warning/10 text-warning border-warning/20';
    }
  };

  return (
    <ModulePage
      title={t('title', 'Quotations')}
      subtitle={t('subtitle', 'Create and manage price quotes for your customers')}
      loading={false}
      action={{
        label: t('create_btn', 'Create Quotation'),
        onClick: () => navigate("/app/quotations/create")
      }}
      listIcon={<FileBadge2 className="h-5 w-5" />}
      listTitle={t('list_title', 'Quotation History')}
      count={filtered.length}
      filterBar={
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 w-full">
          <div className="md:col-span-2">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder={t('search_placeholder', 'Search quotes...')}
              leftIcon={<Search className="h-4 w-4" />}
              className="h-[46px]"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            options={[
              { label: t('status_all', 'Status: All'), value: "all" },
              { label: t('status_draft', 'Status: Draft'), value: "draft" },
              { label: t('status_sent', 'Status: Sent'), value: "sent" },
              { label: t('status_accepted', 'Status: Accepted'), value: "accepted" },
              { label: t('status_rejected', 'Status: Rejected'), value: "rejected" },
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
      <Dialog
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={confirmDelete}
        title={t('delete_title', 'Delete Quotation?')}
        description={t('delete_desc', `Are you sure you want to delete ${quoteToDelete?.quote_number}?`)}
        confirmText={t('common:delete', 'Delete')}
        cancelText={t('common:cancel', 'Cancel')}
        variant="danger"
        isLoading={isDeleting}
      />

      <DataTable
        data={paginated}
        keyExtractor={(item) => item.id}
        onSort={() => { }} 
        columns={[
          {
            accessor: "quote_number",
            header: t('col_number', "Quote #"),
            sortKey: "quote_number",
            className: "font-mono font-bold text-primary"
          },
          {
            accessor: "customer_name",
            header: t('col_customer', "Customer"),
            sortKey: "customer_name",
            className: "font-bold"
          },
          {
            accessor: (item) => (
              <div className="flex flex-col items-start gap-1 py-1">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface border border-border/50 text-[11px] font-bold text-text-primary">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span>{new Date(item.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                  <Clock className="h-2.5 w-2.5 opacity-50" />
                  <span>{new Date(item.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ),
            header: t('col_date', "Generated On"),
            sortKey: "created_at",
          },
          {
            accessor: (item) => (
              <span className="font-black text-text-primary tabular-nums">
                {formatCurrency(item.total_amount, currency)}
              </span>
            ),
            header: t('col_amount', "Amount"),
            sortKey: "total_amount",
          },
          {
            accessor: (item) => (
              <div className="flex items-center">
                <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${getStatusStyle(item.status)}`}>
                  <span className="h-1 w-1 rounded-full bg-current mr-1.5" />
                  {item.status}
                </span>
              </div>
            ),
            header: t('col_status', "Status"),
          }
        ]}
        actions={(item) => [
          {
            label: t('edit', 'Edit'),
            icon: Edit2,
            onClick: () => navigate("/app/quotations/edit", { state: { quotation: item } })
          },
          {
            label: t('mark_as_sent', 'Mark as Sent'),
            icon: Send,
            onClick: () => handleUpdateStatus(item, 'sent')
          },
          {
            label: t('mark_as_accepted', 'Mark as Accepted'),
            icon: Check,
            onClick: () => handleUpdateStatus(item, 'accepted')
          },
          {
            label: t('mark_as_rejected', 'Mark as Rejected'),
            icon: X,
            onClick: () => handleUpdateStatus(item, 'rejected')
          },
          {
            label: t('print', 'Print'),
            icon: Printer,
            onClick: () => handlePrint(item)
          },
          {
            label: downloadingId === item.id ? t('downloading') : t('download_pdf', 'Download PDF'),
            icon: Download,
            onClick: () => handleDownloadPdf(item)
          },
          {
            label: t('common:delete', 'Delete'),
            icon: Trash2,
            onClick: () => handleDelete(item)
          }
        ]}
      />
    </ModulePage>
  );
}
