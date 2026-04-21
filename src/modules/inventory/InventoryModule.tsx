import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Package, TrendingUp, TrendingDown } from "lucide-react";
import { createProduct, listProducts, updateProduct, deleteProduct, adjustStock, type Product } from "./api";
import { useAuthStore } from "../../store/authStore";
import { TablePagination } from "../shared/TablePagination";

export function InventoryModule() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingStock, setAdjustingStock] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const [sortBy, setSortBy] = useState<"name" | "sku" | "stock_qty" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { companyId } = useAuthStore();

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
      setError(err instanceof Error ? err.message : "Failed to load products");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust stock");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inventory Management</h1>
          <p className="text-text-muted">Manage your products and stock levels</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right ml-4 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={formData.stock_qty}
                  onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  min="0"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {editingProduct ? "Update Product" : "Add Product"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary hover:bg-card"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustingStock && (
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Adjust Stock</h2>
          <p className="mb-4 text-text-muted">
            Adjusting stock for: <strong>{adjustingStock.name}</strong> (Current: {adjustingStock.stock_qty})
          </p>
          <form onSubmit={handleStockAdjustment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary">
                Quantity Change
              </label>
              <input
                type="number"
                value={stockAdjustment.quantity_change}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity_change: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter positive number to add stock, negative to reduce"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Adjust Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustingStock(null)}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary hover:bg-card"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Products ({filteredProducts.length})</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-4">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search by product name or SKU..."
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            />
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as "all" | "in-stock" | "low-stock" | "out-of-stock");
                setPage(1);
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="all">All Stock States</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "sku" | "stock_qty" | "price")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="name">Sort By Name</option>
              <option value="sku">Sort By SKU</option>
              <option value="stock_qty">Sort By Stock</option>
              <option value="price">Sort By Price</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Package className="mx-auto h-12 w-12 text-text-muted/50" />
            <p className="mt-2">No products found. Add your first product to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-surface/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-surface/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-primary">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{product.sku}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${product.stock_qty === 0 ? 'text-red-600' : product.stock_qty < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {product.stock_qty}
                        </span>
                        {product.stock_qty === 0 && <span className="text-xs text-red-600">Out of stock</span>}
                        {product.stock_qty > 0 && product.stock_qty < 10 && <span className="text-xs text-yellow-600">Low stock</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-text-muted hover:text-primary"
                          title="Edit product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setAdjustingStock(product)}
                          className="text-text-muted hover:text-primary"
                          title="Adjust stock"
                        >
                          {stockAdjustment.quantity_change >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredProducts.length > 0 ? (
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
        ) : null}
      </div>
    </div>
  );
}
