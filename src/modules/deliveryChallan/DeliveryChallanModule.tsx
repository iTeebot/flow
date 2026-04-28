import { useEffect, useState } from "react";
import { Plus, FileText, Download, Printer, Search, Edit2 } from "lucide-react";
import { listDeliveryChallans, type DeliveryChallan } from "./api";
import { useAuthStore } from "../../store/authStore";
import { ChallanCustomField, downloadDeliveryChallanPdf, printDeliveryChallan } from "../reports/pdf";
import { TablePagination } from "../shared/TablePagination";
import { useToastStore } from "../../store/toastStore";
import { SortableHeader } from "../../components/SortableHeader";
import { TableActions } from "../../components/TableActions";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function DeliveryChallanModule() {
  const { t } = useTranslation("delivery_chalan");
  const navigate = useNavigate();
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
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



  const handleSort = (key: "date" | "amount" | "customer" | "dc_number") => {
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
        addToast("PDF saved successfully!", "success", savedPath);
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">Loading delivery challans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t('title')}</h1>
            <p className="text-sm text-text-muted mt-1">{t('subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/app/delivery-challan/create")}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {t('common:add', 'Add')}
        </Button>
      </div>


      {/* List Container */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-surface/30 px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('history_records')}
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                {filteredChallans.length}
              </span>
            </h2>

            {/* Responsive Filter Bar */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:w-3/4">
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder={t('common:search', 'Search...')}
                leftIcon={<Search className="h-4 w-4" />}
                className="py-2"
              />

              <Select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value as "all" | "today" | "last7" | "last30");
                  setPage(1);
                }}
                options={[
                  { label: t('common:all_time', 'All Time'), value: "all" },
                  { label: t('common:today', 'Today'), value: "today" },
                  { label: t('common:last_7_days', 'Last 7 Days'), value: "last7" },
                  { label: t('common:last_30_days', 'Last 30 Days'), value: "last30" }
                ]}
                className="py-2"
              />

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "amount" | "customer" | "dc_number")}
                options={[
                  { label: t('sort_date'), value: "date" },
                  { label: t('sort_amount'), value: "amount" },
                  { label: t('sort_customer'), value: "customer" },
                  { label: t('sort_dc'), value: "dc_number" }
                ]}
                className="py-2"
              />

              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                options={[
                  { label: t('descending'), value: "desc" },
                  { label: t('ascending'), value: "asc" }
                ]}
                className="py-2"
              />
            </div>
          </div>
        </div>

        {filteredChallans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface p-4 mb-4 border border-border">
              <FileText className="h-10 w-10 text-text-muted/30" />
            </div>
            <p className="text-text-muted font-medium">{t('no_challans')}</p>
            <p className="text-xs text-text-muted/60 mt-1">{t('try_adjusting')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <SortableHeader
                    label={t('dc_number')}
                    sortKey="dc_number"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label={t('customer')}
                    sortKey="customer"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label={t('items')}
                    sortKey="items_count"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label={t('created_at')}
                    sortKey="date"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="sticky right-0 z-10 bg-surface/90 w-14 px-2 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted shadow-[-4px_0_10px_rgba(0,0,0,0.1)] backdrop-blur-sm"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedChallans.map((challan) => (
                  <tr key={challan.id} className="group hover:bg-surface/30 transition-all duration-200">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10 tracking-tight">
                        {challan.dc_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-text-primary">{challan.customer_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                        {challan.items.length} unit{challan.items.length !== 1 ? 's' : ''}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-text-muted flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success/60"></span>
                        {new Date(challan.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="sticky right-0 z-10 bg-card/95 group-hover:bg-surface/95 w-14 px-2 py-4 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                      <div className="flex items-center justify-end">
                        <TableActions
                          actions={[
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

        {filteredChallans.length > 0 && (
          <div className="border-t border-border bg-surface/20">
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
          </div>
        )}
      </div>
    </div>
  );
}
