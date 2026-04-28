import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Package, TrendingUp, Search, ArrowUpDown } from "lucide-react";
import { listProducts, deleteProduct, adjustStock, type Product } from "./api";
import { useAuthStore } from "../../store/authStore";
import { formatCurrency } from "../../lib/utils";
import { TableActions } from "../../components/TableActions";
import { TablePagination } from "../shared/TablePagination";
import { useToastStore } from "../../store/toastStore";
import { Table } from "../../components/ui/Table";
import { CreateProductModal } from "../../components/modals/CreateProductModal";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function InventoryModule() {
  const { t } = useTranslation("inventory");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingStock, setAdjustingStock] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const [sortBy, setSortBy] = useState<"name" | "sku" | "stock_qty" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { addToast } = useToastStore();

  const { companyId, currency } = useAuthStore();

  const currentCompanyId = companyId || 1;

  const [stockAdjustment, setStockAdjustment] = useState({
    quantity_change: 0,
    reason: "",
  });

  useEffect(() => {
    if (currentCompanyId) {
      loadProducts();
    }
  }, [currentCompanyId]);

  const loadProducts = async (retryCount = 0) => {
    if (!currentCompanyId) return;

    try {
      setLoading(true);
      const data = await listProducts(currentCompanyId);
      setProducts(data);
    } catch (err) {
      if (retryCount < 3) {
        // Wait 500ms and try again
        await new Promise(r => setTimeout(r, 500));
        return loadProducts(retryCount + 1);
      }
      addToast(err instanceof Error ? err.message : t("toast_load_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDelete = async (productId: number) => {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await deleteProduct(productId);
      await loadProducts();
      addToast(t("toast_removed"), "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("toast_save_failed"), "error");
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingStock) return;

    try {
      await adjustStock({
        product_id: adjustingStock.id,
        quantity_change: stockAdjustment.quantity_change,
      });
      await loadProducts();
      setAdjustingStock(null);
      setStockAdjustment({ quantity_change: 0, reason: "" });
      addToast(t("toast_adjust_success"), "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("toast_adjust_failed"), "error");
    }
  };


  const resetForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const filteredProducts = products
    .filter((product) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in-stock" && product.stock_qty > 0) ||
        (stockFilter === "low-stock" && product.stock_qty > 0 && product.stock_qty < 10) ||
        (stockFilter === "out-of-stock" && product.stock_qty === 0);
      return matchesSearch && matchesStock;
    })
    .sort((a, b) => {
      const field = sortBy;
      const valA = a[field];
      const valB = b[field];

      if (typeof valA === "string" && typeof valB === "string") {
        const base = valA.localeCompare(valB);
        return sortOrder === "asc" ? base : -base;
      }
      
      if (typeof valA === "number" && typeof valB === "number") {
        const base = valA - valB;
        return sortOrder === "asc" ? base : -base;
      }

      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">{t("loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t("title")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {t("create_btn")}
        </Button>
      </div>

      <CreateProductModal
        isOpen={showAddForm}
        onClose={resetForm}
        onSuccess={() => {
          loadProducts();
          resetForm();
        }}
        companyId={currentCompanyId}
        existingProducts={products}
        editingProduct={editingProduct}
      />

      {adjustingStock && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-border bg-surface/50 px-6 py-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">{t("adjust_title")}</h2>
          </div>
          <div className="p-6">
            <p className="mb-6 text-sm text-text-muted">
              {t("adjust_desc", { name: adjustingStock.name, qty: adjustingStock.stock_qty })}
            </p>
            <form onSubmit={handleStockAdjustment} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase text-text-muted mb-1 ml-1">{t("adjust_qty_change")}</label>
                <input
                  type="number"
                  required
                  value={stockAdjustment.quantity_change}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity_change: parseInt(e.target.value) || 0 })}
                  placeholder={t("adjust_placeholder")}
                  className="w-full"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t("adjust_apply")}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingStock(null)}
                  className="rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface"
                >
                  {t("adjust_close")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-surface/30 px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {t("stock_overview")}
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                {filteredProducts.length}
              </span>
            </h2>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-5 lg:w-[85%]">
              <div className="md:col-span-2">
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t("search_placeholder")}
                  leftIcon={<Search className="h-4 w-4" />}
                  className="h-[46px]"
                />
              </div>

              <Select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value as any);
                  setPage(1);
                }}
                options={[
                  { label: t("filter_all"), value: "all" },
                  { label: t("filter_in_stock"), value: "in-stock" },
                  { label: t("filter_low_stock"), value: "low-stock" },
                  { label: t("filter_out_of_stock"), value: "out-of-stock" },
                ]}
              />

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                options={[
                  { label: t("sort_name"), value: "name" },
                  { label: t("sort_sku"), value: "sku" },
                  { label: t("sort_stock"), value: "stock_qty" },
                  { label: t("sort_price"), value: "price" },
                ]}
              />

              <Button
                variant="secondary"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-[46px] w-full"
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
                leftIcon={<ArrowUpDown className={`h-4 w-4 transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
              >
                <span className="uppercase tracking-widest text-[10px]">{sortOrder}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-surface p-4 mb-4 border border-border">
            <Package className="h-10 w-10 text-text-muted/30" />
          </div>
          <p className="text-text-muted font-medium">{t("no_products")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table
            data={paginatedProducts}
            keyExtractor={(product) => product.id.toString()}
            columns={[
              {
                header: t("col_product"),
                accessor: (product) => (
                  <div>
                    <div className="font-bold text-text-primary text-sm">{product.name}</div>
                    {product.description && (
                      <div className="text-[11px] text-text-muted mt-0.5 line-clamp-1 max-w-[200px]">
                        {product.description}
                      </div>
                    )}
                  </div>
                )
              },
              {
                header: t("col_sku"),
                accessor: (product) => (
                  <span className="font-mono text-xs px-2 py-1 rounded bg-surface border border-border text-text-muted">
                    {product.sku}
                  </span>
                )
              },
              {
                header: t("col_stock"),
                accessor: (product) => (
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${product.stock_qty === 0 ? 'bg-error animate-pulse' : product.stock_qty < 10 ? 'bg-warning' : 'bg-success'}`} />
                    <span className={`text-sm font-bold ${product.stock_qty === 0 ? 'text-error' : product.stock_qty < 10 ? 'text-warning' : 'text-text-primary'}`}>
                      {product.stock_qty} <span className="text-[10px] opacity-60 font-medium">{product.stock_qty === 1 ? t("unit") : t("units")}</span>
                    </span>
                  </div>
                )
              },
              {
                header: t("col_valuation"),
                accessor: (product) => <div className="font-bold text-text-primary text-sm">{formatCurrency(product.price, currency)}</div>
              },
              {
                header: "",
                className: "sticky right-0 z-10 bg-card/95 group-hover:bg-surface/95 w-14 px-2 py-4 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] backdrop-blur-sm",
                accessor: (product) => (
                  <div className="flex items-center justify-end">
                    <TableActions
                      actions={[
                        {
                          label: t("edit_details"),
                          icon: Edit,
                          onClick: () => handleEdit(product)
                        },
                        {
                          label: t("adjust_inventory"),
                          icon: TrendingUp,
                          onClick: () => setAdjustingStock(product)
                        },
                        {
                          label: t("purge_record"),
                          icon: Trash2,
                          onClick: () => handleDelete(product.id),
                          variant: "danger"
                        }
                      ]}
                    />
                  </div>
                )
              }
            ]}
          />
        </div>
      )}

      {filteredProducts.length > 0 && (
        <div className="border-t border-border bg-surface/20">
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
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
  );
}
