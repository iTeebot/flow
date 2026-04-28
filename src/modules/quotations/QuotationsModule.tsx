import { useEffect, useMemo, useState } from "react";
import { Search, Edit2, Printer, Download, Trash2, FileBadge2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { listQuotations, deleteQuotation, type Quotation } from "./api";
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

export function QuotationsModule() {
  const { t } = useTranslation("quotations");
  const navigate = useNavigate();
  const { companyId, currency } = useAuthStore();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
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

  const handlePrint = (quote: Quotation) => {
    // Will implement print logic later
    addToast("Print feature coming soon", "info");
  };

  const handleDownloadPdf = (quote: Quotation) => {
    // Will implement PDF logic later
    addToast("PDF download coming soon", "info");
  };

  return (
    <ModulePage
      title={t('title', 'Quotations')}
      subtitle={t('subtitle', 'Create and manage price quotes for your customers')}
      loading={loading}
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
        onSort={() => { }} // Sorting handled by DataTable internal state if needed, or by parent
        columns={[
          {
            key: "quote_number",
            header: t('col_number', "Quote #"),
            sortable: true,
            className: "font-mono font-bold text-primary"
          },
          {
            key: "customer_name",
            header: t('col_customer', "Customer"),
            sortable: true,
            className: "font-bold"
          },
          {
            key: "created_at",
            header: t('col_date', "Date"),
            sortable: true,
            accessor: (item) => new Date(item.created_at).toLocaleDateString()
          },
          {
            key: "total_amount",
            header: t('col_amount', "Amount"),
            sortable: true,
            accessor: (item) => (
              <span className="font-black text-text-primary tabular-nums">
                {formatCurrency(item.total_amount, currency)}
              </span>
            )
          },
          {
            key: "status",
            header: t('col_status', "Status"),
            accessor: (item) => (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${item.status === 'sent'
                  ? 'bg-success/10 text-success border-success/20'
                  : 'bg-warning/10 text-warning border-warning/20'
                }`}>
                {item.status}
              </span>
            )
          }
        ]}
        actions={(item) => [
          {
            label: t('edit', 'Edit'),
            icon: Edit2,
            onClick: () => navigate("/app/quotations/edit", { state: { quotation: item } })
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
