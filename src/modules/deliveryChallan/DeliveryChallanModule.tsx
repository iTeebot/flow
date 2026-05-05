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

export function DeliveryChallanModule() {
  const { t } = useTranslation("delivery_chalan");
  const navigate = useNavigate();
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
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
      const savedPath = await downloadDeliveryChallanPdf(challan, fields);
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
      printDeliveryChallan(challan, fields);
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">Loading delivery challans...</div>
      </div>
    );
  }

  return (
    <ModulePage
      title={t('title')}
      subtitle={t('subtitle')}
      loading={loading}
      action={{
        label: t('common:add', 'Add'),
        onClick: () => navigate("/app/delivery-challan/create")
      }}
      listIcon={<FileText className="h-5 w-5" />}
      listTitle={t('history_records')}
      count={filteredChallans.length}
      filterBar={
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 w-full">
          <div className="md:col-span-2">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder={t('search_placeholder')}
              leftIcon={<Search className="h-4 w-4" />}
              className="py-2"
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
            className="py-2"
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
        emptyIcon={<FileText className="h-10 w-10 text-text-muted/30" />}
        emptyMessage={t('no_challans')}
        columns={[
          {
            header: t('dc_number'),
            sortKey: "dc_number",
            accessor: (challan) => (
              <span className="font-mono text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10 tracking-tight">
                {challan.dc_number}
              </span>
            )
          },
          {
            header: t('customer'),
            sortKey: "customer",
            accessor: (challan) => (
              <div className="font-semibold text-text-primary">{challan.customer_name}</div>
            )
          },
          {
            header: t('items'),
            sortKey: "items_count",
            accessor: (challan) => (
              <span className="text-sm text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                {challan.items.length} unit{challan.items.length !== 1 ? 's' : ''}
              </span>
            )
          },
          {
            header: t('created_at'),
            sortKey: "date",
            accessor: (challan) => (
              <div className="text-sm text-text-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success/60"></span>
                {new Date(challan.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
