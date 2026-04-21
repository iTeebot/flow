import { useEffect, useState } from "react";
import { Plus, Trash2, FileText, Download, Printer } from "lucide-react";
import { createDeliveryChallan, listDeliveryChallans, type DeliveryChallan } from "./api";
import { listCustomers, type Customer } from "../customers/api";
import { listProducts, type Product } from "../inventory/api";
import { useAuthStore } from "../../store/authStore";
import { downloadDeliveryChallanPdf, printDeliveryChallan } from "../reports/pdf";
import { TablePagination } from "../shared/TablePagination";

type ChallanItem = {
  product_id: number;
  product: Product;
  quantity: number;
};

export function DeliveryChallanModule() {
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "last7" | "last30">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "customer" | "dc_number">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

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
      const [challans, custs, prods] = await Promise.all([
        listDeliveryChallans(currentCompanyId),
        listCustomers(currentCompanyId),
        listProducts(currentCompanyId),
      ]);
      setDeliveryChallans(challans);
      setCustomers(custs);
      setProducts(prods);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const existingItem = challanItems.find(item => item.product_id === selectedProduct.id);
    if (existingItem) {
      setChallanItems(items =>
        items.map(item =>
          item.product_id === selectedProduct.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setChallanItems(items => [...items, {
        product_id: selectedProduct.id,
        product: selectedProduct,
        quantity,
      }]);
    }

    setSelectedProduct(null);
    setQuantity(1);
  };

  const handleRemoveItem = (productId: number) => {
    setChallanItems(items => items.filter(item => item.product_id !== productId));
  };

  const handleCreateChallan = async () => {
    if (!selectedCustomer || challanItems.length === 0) return;

    try {
      await createDeliveryChallan({
        company_id: currentCompanyId,
        customer_id: selectedCustomer.id,
        items: challanItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      });

      await loadData();
      setShowCreateForm(false);
      setSelectedCustomer(null);
      setChallanItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create delivery challan");
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setSelectedCustomer(null);
    setChallanItems([]);
    setSelectedProduct(null);
    setQuantity(1);
  };

  const getAvailableProducts = () => {
    const usedProductIds = challanItems.map(item => item.product_id);
    return products.filter(product => !usedProductIds.includes(product.id) && product.stock_qty > 0);
  };

  const calculateTotal = () => {
    return challanItems.reduce((total, item) => total + (item.quantity * item.product.price), 0);
  };

  const handleDownloadPdf = async (challan: DeliveryChallan) => {
    setError(null);
    setNotice(null);
    setDownloadingId(challan.id);
    try {
      const savedPath = await downloadDeliveryChallanPdf(challan);
      setNotice(`PDF saved to: ${savedPath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

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

  const handlePrint = (challan: DeliveryChallan) => {
    try {
      printDeliveryChallan(challan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open print view");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Delivery Challan Management</h1>
          <p className="text-text-muted">Create and manage delivery challans for your customers</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Challan
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

      {showCreateForm && (
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="mb-6 text-lg font-semibold">Create New Delivery Challan</h2>

          {/* Customer Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Select Customer *
            </label>
            <select
              value={selectedCustomer?.id || ""}
              onChange={(e) => {
                const customer = customers.find(c => c.id === parseInt(e.target.value));
                setSelectedCustomer(customer || null);
              }}
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Selection */}
          {selectedCustomer && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Add Products
              </label>
              <div className="flex gap-2 mb-4">
                <select
                  value={selectedProduct?.id || ""}
                  onChange={(e) => {
                    const product = products.find(p => p.id === parseInt(e.target.value));
                    setSelectedProduct(product || null);
                  }}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Choose a product...</option>
                  {getAvailableProducts().map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Stock: {product.stock_qty}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-20 rounded-md border border-border bg-background px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleAddItem}
                  disabled={!selectedProduct}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {/* Items List */}
              {challanItems.length > 0 && (
                <div className="rounded-md border border-border">
                  <div className="border-b border-border px-4 py-2">
                    <h3 className="font-medium text-text-primary">Items to Deliver</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {challanItems.map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between p-4">
                        <div>
                          <div className="font-medium text-text-primary">{item.product.name}</div>
                          <div className="text-sm text-text-muted">{item.product.sku}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-text-muted">Qty: {item.quantity}</div>
                            <div className="text-sm font-medium text-text-primary">
                              ${item.product.price.toFixed(2)} each
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border px-4 py-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-text-primary">Total Amount:</span>
                      <span className="font-semibold text-text-primary">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreateChallan}
              disabled={!selectedCustomer || challanItems.length === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Delivery Challan
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary hover:bg-card"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delivery Challans List */}
      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Delivery Challans ({filteredChallans.length})</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-4">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search DC number or customer..."
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            />
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as "all" | "today" | "last7" | "last30");
                setPage(1);
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "amount" | "customer" | "dc_number")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="date">Sort By Date</option>
              <option value="amount">Sort By Amount</option>
              <option value="customer">Sort By Customer</option>
              <option value="dc_number">Sort By DC Number</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        {filteredChallans.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <FileText className="mx-auto h-12 w-12 text-text-muted/50" />
            <p className="mt-2">No delivery challans found. Create your first challan to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-surface/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    DC Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedChallans.map((challan) => (
                  <tr key={challan.id} className="hover:bg-surface/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-primary">{challan.dc_number}</div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {challan.customer_name}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {challan.items.length} item{challan.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      ${challan.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {new Date(challan.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-text-muted hover:text-primary"
                          title="Print challan"
                          onClick={() => handlePrint(challan)}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          className="text-text-muted hover:text-primary"
                          title="Download PDF"
                          onClick={() => handleDownloadPdf(challan)}
                          disabled={downloadingId === challan.id}
                        >
                          <Download className={`h-4 w-4 ${downloadingId === challan.id ? "opacity-50" : ""}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredChallans.length > 0 ? (
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
        ) : null}
      </div>
      {notice ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-md rounded-md border border-green-300 bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
