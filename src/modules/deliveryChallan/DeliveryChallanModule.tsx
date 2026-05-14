import { useEffect, useState } from "react";
import { FileText, Download, Printer, Search, Edit2, Trash2 } from "lucide-react";
import { listDeliveryChallans, deleteDeliveryChallan, type DeliveryChallan } from "./api";
import { useAuthStore } from "../../store/authStore";
import { ChallanCustomField, downloadDeliveryChallanPdf, printDeliveryChallan } from "../reports/pdf";
import { TablePagination } from "../shared/TablePagination";
import { useToastStore } from "../../store/toastStore";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ModulePage } from "../../components/ModulePage";
import { DataTable } from "../../components/DataTable";
import { Dialog } from "../../components/ui/Dialog";
import { useUiStore } from "../../store/uiStore";

export function DeliveryChallanModule() {
  const { t } = useTranslation("delivery_chalan");
  const navigate = useNavigate();
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
  const { setLoading } = useUiStore();
  const { addToast } = useToastStore();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [challanToDelete, setChallanToDelete] = useState<DeliveryChallan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "last7" | "last30">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "customer" | "dc_number">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { companyId } = useAuthStore();
  const currentCompanyId = companyId || 1;

  useEffect(() => {
    if (currentCompanyId) {
      loadData();
    }
  }, [currentCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true, t("loading_challans", "Accessing Delivery Records..."));
      const challans = await listDeliveryChallans(currentCompanyId);
      setDeliveryChallans(challans);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load data", "error");
    } finally {
      setLoading(false);
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



  const handleDownloadPdf = async (challan: DeliveryChallan, fields: ChallanCustomField[] = []) => {
    setDownloadingId(challan.id);
    try {
      const customFields = fields.length > 0 ? fields : (challan.metadata?.customFields || []);
      const savedPath = await downloadDeliveryChallanPdf(challan, customFields);
      if (savedPath === "browser-download") {
        addToast("Document has been downloaded to your browser.", "info");
      } else {
        addToast("Challan PDF saved successfully!", "success", savedPath);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to download PDF", "error");
    } finally {
      setDownloadingId(null);
    }
  };


  const filteredChallans = deliveryChallans
    .filter((challan) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        challan.dc_number.toLowerCase().includes(search) ||
        challan.customer_name.toLowerCase().includes(search);

      if (dateFilter === "all") return matchesSearch;

      const challanDate = new Date(challan.created_at);
      const now = new Date();
      const daysDiff = (now.getTime() - challanDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dateFilter === "today") {
        return (
          matchesSearch &&
          challanDate.toDateString() === now.toDateString()
        );
      }
      if (dateFilter === "last7") return matchesSearch && daysDiff <= 7;
      return matchesSearch && daysDiff <= 30;
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
        base = a.dc_number.localeCompare(b.dc_number);
      }
      return sortOrder === "asc" ? base : -base;
    });

  const totalPages = Math.max(1, Math.ceil(filteredChallans.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedChallans = filteredChallans.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePrint = (challan: DeliveryChallan, fields: ChallanCustomField[] = []) => {
    try {
      const customFields = fields.length > 0 ? fields : (challan.metadata?.customFields || []);
      printDeliveryChallan(challan, customFields);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to open print view", "error");
    }
  };

  const handleDelete = (challan: DeliveryChallan) => {
    setChallanToDelete(challan);
  };

  const confirmDelete = async () => {
    if (!challanToDelete) return;
    try {
      setIsDeleting(true);
      await deleteDeliveryChallan(challanToDelete.id);
      addToast(`${challanToDelete.dc_number} deleted successfully`, "success");
      await loadData();
      setChallanToDelete(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete challan", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading is now handled globally via useUiStore.setLoading
  return (
    <ModulePage
      title={t('title')}
      subtitle={t('subtitle')}
      loading={false}
      action={{
        label: t('common:add', 'Add'),
        onClick: () => navigate("/app/delivery-challan/create"),
      }}
      listIcon={<FileText className="h-6 w-6 text-primary" />}
      listTitle={t('history_records')}
      count={filteredChallans.length}
      filterBar={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 w-full">
          <div className="md:col-span-2">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder={t('search_placeholder')}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <Select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any);
              setPage(1);
            }}
            options={[
              { label: t('all_time'), value: "all" },
              { label: t('today'), value: "today" },
              { label: t('last7'), value: "last7" },
              { label: t('last30'), value: "last30" }
            ]}
          />
        </div>
      }
      pagination={
        filteredChallans.length > 0 && (
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filteredChallans.length}
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
        isOpen={!!challanToDelete}
        onClose={() => setChallanToDelete(null)}
        onConfirm={confirmDelete}
        title={t('confirm_delete_title', 'Delete Delivery Challan?')}
        description={t('confirm_delete_desc', { 
          dc_number: challanToDelete?.dc_number,
          defaultValue: `Are you sure you want to delete ${challanToDelete?.dc_number}? This will permanently remove the record and restore stock levels for all items.`
        })}
        confirmText={t('common:delete', 'Delete')}
        cancelText={t('common:cancel', 'Cancel')}
        variant="danger"
        isLoading={isDeleting}
      />

      <DataTable
        data={paginatedChallans}
        keyExtractor={(item) => item.id}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyIcon={<FileText className="h-12 w-12 text-primary/20" />}
        emptyMessage={t('no_challans')}
        columns={[
          {
            header: t('dc_number'),
            sortKey: "dc_number",
            accessor: (challan) => (
              <span className="font-mono text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 tracking-widest shadow-sm">
                {challan.dc_number}
              </span>
            )
          },
          {
            header: t('customer'),
            sortKey: "customer",
            accessor: (challan) => (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-surface border border-border/40 flex items-center justify-center text-[10px] font-black text-text-muted uppercase">
                  {challan.customer_name.substring(0, 2)}
                </div>
                <div className="font-bold text-text-primary group-hover:text-primary transition-colors">{challan.customer_name}</div>
              </div>
            )
          },
          {
            header: t('items'),
            sortKey: "items_count",
            accessor: (challan) => (
              <span className="text-[10px] font-black text-text-muted bg-surface/60 px-3 py-1 rounded-full border border-border/50 uppercase tracking-wider">
                {challan.items.length} unit{challan.items.length !== 1 ? 's' : ''}
              </span>
            )
          },
          {
            header: t('created_at'),
            sortKey: "date",
            accessor: (challan) => (
              <div className="text-[11px] text-text-muted/80 font-bold flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-success/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                {new Date(challan.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )
          },
          {
            header: "Total Amount",
            sortKey: "amount",
            accessor: (challan) => (
              <div className="text-right">
                <span className="font-black text-primary text-sm tracking-tighter">
                  {(challan.total_amount || 0).toLocaleString()}
                </span>
              </div>
            )
          }
        ]}
        actions={(challan) => [
          {
            label: t('edit_layout'),
            icon: Edit2,
            onClick: () => navigate("/app/delivery-challan/edit", { state: { challan } })
          },
          {
            label: t('print_doc'),
            icon: Printer,
            onClick: () => handlePrint(challan)
          },
          {
            label: downloadingId === challan.id ? t('downloading') : t('save_pdf'),
            icon: Download,
            onClick: () => handleDownloadPdf(challan)
          },
          {
            label: t('common:delete', 'Delete'),
            icon: Trash2,
            onClick: () => handleDelete(challan)
          }
        ]}
      />
    </ModulePage>
  );
}
