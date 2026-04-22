import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Package, TrendingUp, Search } from "lucide-react";
import { createProduct, listProducts, updateProduct, deleteProduct, adjustStock, type Product } from "./api";
import { useAuthStore } from "../../store/authStore";
import { formatCurrency } from "../../lib/utils";
import { SortableHeader } from "../../components/SortableHeader";
import { TableActions } from "../../components/TableActions";
import { TablePagination } from "../shared/TablePagination";
import { useToastStore } from "../../store/toastStore";

export function InventoryModule() {
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

  // For demo purposes, using a hardcoded company_id if not available
  // In a real app, this would come from user/company context
  const currentCompanyId = companyId || 1;

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    stock_qty: 0,
    price: 0,
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    quantity_change: 0,
    reason: "",
  });

  useEffect(() => {
    if (currentCompanyId) {
      loadProducts();
    }
  }, [currentCompanyId]);

  const loadProducts = async () => {
    if (!currentCompanyId) return;

    try {
      setLoading(true);
      const data = await listProducts(currentCompanyId);
      setProducts(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct({
          id: editingProduct.id,
          ...formData,
        });
      } else {
        await createProduct({
          company_id: currentCompanyId,
          ...formData,
        });
      }
      await loadProducts();
      setShowAddForm(false);
      setEditingProduct(null);
      setFormData({ name: "", sku: "", stock_qty: 0, price: 0 });
      addToast(editingProduct ? "Product updated successfully." : "New product registered.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to save product", "error");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      stock_qty: product.stock_qty,
      price: product.price,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(productId);
      await loadProducts();
      addToast("Product removed from inventory.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete product", "error");
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
      addToast("Stock levels adjusted.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to adjust stock", "error");
    }
  };

  const handleSort = (key: "name" | "sku" | "stock_qty" | "price") => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    setFormData({ name: "", sku: "", stock_qty: 0, price: 0 });
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
      if (sortBy === "name" || sortBy === "sku") {
        const base = a[sortBy].localeCompare(b[sortBy]);
        return sortOrder === "asc" ? base : -base;
      }
      const base = a[sortBy] - b[sortBy];
      return sortOrder === "asc" ? base : -base;
    });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Inventory Assets</h1>
          <p className="text-sm text-text-muted mt-1">Manage your product catalog and real-time stock levels</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </div>

      {showAddForm && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-border bg-surface/50 px-6 py-4">
            <h2 className="text-lg font-bold text-text-primary">
              {editingProduct ? "Edit Product Details" : "Register New Product"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Product Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Premium Cotton Tee"
                  className="w-full"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  SKU / Identifier <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. T-SHIRT-001"
                  className="w-full"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Initial Stock Qty
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Unit Price ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <button
                type="submit"
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                {editingProduct ? "Update Portfolio" : "Confirm & Save Product"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustingStock && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-border bg-surface/50 px-6 py-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Stock Adjustment</h2>
          </div>
          <div className="p-6">
            <p className="mb-6 text-sm text-text-muted">
              Modifying inventory for <span className="font-bold text-text-primary">{adjustingStock.name}</span>.
              Current level: <span className="font-bold text-primary">{adjustingStock.stock_qty}</span>
            </p>
            <form onSubmit={handleStockAdjustment} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase text-text-muted mb-1 ml-1">Quantity Change</label>
                <input
                  type="number"
                  required
                  value={stockAdjustment.quantity_change}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity_change: parseInt(e.target.value) || 0 })}
                  placeholder="Use - to reduce, + to add"
                  className="w-full"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Apply Change
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingStock(null)}
                  className="rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface"
                >
                  Close
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
              Stock Overview
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                {filteredProducts.length}
              </span>
            </h2>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:w-3/4">
              <div className="relative group lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search articles and assets..."
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>

              <select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value as "all" | "in-stock" | "low-stock" | "out-of-stock");
                  setPage(1);
                }}
                className="text-xs"
              >
                <option value="all">All Inventory</option>
                <option value="in-stock">In Stock Only</option>
                <option value="low-stock">Warning (Low)</option>
                <option value="out-of-stock">Depleted (Out)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "sku" | "stock_qty" | "price")}
                className="text-xs"
              >
                <option value="name">Sort by Name</option>
                <option value="sku">Sort by SKU</option>
                <option value="stock_qty">Sort by Stock</option>
                <option value="price">Sort by Price</option>
              </select>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface p-4 mb-4 border border-border">
              <Package className="h-10 w-10 text-text-muted/30" />
            </div>
            <p className="text-text-muted font-medium">No inventory products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <SortableHeader
                    label="Product Identity"
                    sortKey="name"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="SKU Code"
                    sortKey="sku"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Stock Level"
                    sortKey="stock_qty"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Unit Valuation"
                    sortKey="price"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="sticky right-0 z-10 bg-surface/90 w-14 px-2 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted shadow-[-4px_0_10px_rgba(0,0,0,0.1)] backdrop-blur-sm"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="group hover:bg-surface/30 transition-all duration-200">
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary text-sm">{product.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs px-2 py-1 rounded bg-surface border border-border text-text-muted">
                        {product.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${product.stock_qty === 0 ? 'bg-error animate-pulse' : product.stock_qty < 10 ? 'bg-warning' : 'bg-success'}`} />
                        <span className={`text-sm font-bold ${product.stock_qty === 0 ? 'text-error' : product.stock_qty < 10 ? 'text-warning' : 'text-text-primary'}`}>
                          {product.stock_qty} <span className="text-[10px] opacity-60 font-medium">UNIT{product.stock_qty !== 1 ? 'S' : ''}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary text-sm">{formatCurrency(product.price, currency)}</div>
                    </td>
                    <td className="sticky right-0 z-10 bg-card/95 group-hover:bg-surface/95 w-14 px-2 py-4 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                      <div className="flex items-center justify-end">
                        <TableActions
                          actions={[
                            {
                              label: "Edit Details",
                              icon: Edit,
                              onClick: () => handleEdit(product)
                            },
                            {
                              label: "Adjust Inventory",
                              icon: TrendingUp,
                              onClick: () => setAdjustingStock(product)
                            },
                            {
                              label: "Purge Record",
                              icon: Trash2,
                              onClick: () => handleDelete(product.id),
                              variant: "danger"
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
    </div>
  );
}
