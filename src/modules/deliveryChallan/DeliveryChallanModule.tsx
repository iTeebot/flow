import { useEffect, useState } from "react";
import { Plus, Trash2, FileText, Download, Printer, Search, Users, Package } from "lucide-react";
import { createDeliveryChallan, listDeliveryChallans, type DeliveryChallan } from "./api";
import { listCustomers, type Customer } from "../customers/api";
import { listProducts, type Product } from "../inventory/api";
import { useAuthStore } from "../../store/authStore";
import { downloadDeliveryChallanPdf, printDeliveryChallan } from "../reports/pdf";
import { TablePagination } from "../shared/TablePagination";
import { formatCurrency } from "../../lib/utils";
import { useToastStore } from "../../store/toastStore";
import { SortableHeader } from "../../components/SortableHeader";
import { TableActions } from "../../components/TableActions";

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
  const { addToast } = useToastStore();
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

  const { companyId, currency } = useAuthStore();
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
      addToast(err instanceof Error ? err.message : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;

    const qtyToAdd = Number(quantity);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      addToast("Please enter a valid quantity.", "error");
      return;
    }

    const existingItem = challanItems.find(item => item.product_id === selectedProduct.id);
    const currentListQty = existingItem ? existingItem.quantity : 0;
    const totalNewQty = currentListQty + qtyToAdd;

    // VALIDATION: Check against stock
    if (totalNewQty > selectedProduct.stock_qty) {
      addToast(
        `Insufficient stock for "${selectedProduct.name}". Available: ${selectedProduct.stock_qty}, Current list: ${currentListQty}, Requested: ${qtyToAdd}`, "error"
      );
      return;
    }

    if (existingItem) {
      setChallanItems(items =>
        items.map(item =>
          item.product_id === selectedProduct.id
            ? { ...item, quantity: totalNewQty }
            : item
        )
      );
    } else {
      setChallanItems(items => [...items, {
        product_id: selectedProduct.id,
        product: selectedProduct,
        quantity: qtyToAdd,
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
      addToast(err instanceof Error ? err.message : "Failed to create delivery challan", "error");
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
    setDownloadingId(challan.id);
    try {
      const savedPath = await downloadDeliveryChallanPdf(challan);
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

  const handlePrint = (challan: DeliveryChallan) => {
    try {
      printDeliveryChallan(challan);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Delivery Challans</h1>
          <p className="text-sm text-text-muted mt-1">Manage and track your customer delivery documents</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </div>

      {showCreateForm && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-border bg-surface/50 px-6 py-4">
            <h2 className="text-lg font-bold text-text-primary">New Delivery Challan</h2>
          </div>

          <div className="p-6 space-y-8">
            {/* Customer Selection */}
            <div className="max-w-md">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Select Customer <span className="text-error">*</span>
              </label>
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                <select
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === parseInt(e.target.value));
                    setSelectedCustomer(customer || null);
                  }}
                  className="block w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none"
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
            </div>

            {/* Product Selection */}
            {selectedCustomer && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                  Line Items
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1 group">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                    <select
                      value={selectedProduct?.id || ""}
                      onChange={(e) => {
                        const product = products.find(p => p.id === parseInt(e.target.value));
                        setSelectedProduct(product || null);
                      }}
                      className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none"
                    >
                      <option value="">Choose a product...</option>
                      {getAvailableProducts().map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku}) - Stock: {product.stock_qty}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:w-24">
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      placeholder="Qty"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    onClick={handleAddItem}
                    disabled={!selectedProduct}
                    className="inline-flex items-center justify-center rounded-lg bg-surface border border-border px-6 py-2.5 text-sm font-semibold text-text-primary transition-all hover:bg-card hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add Item
                  </button>
                </div>

                {/* Items List */}
                {challanItems.length > 0 && (
                  <div className="rounded-lg border border-border overflow-hidden bg-background/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface/30 border-b border-border">
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Product</th>
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted text-center">Qty</th>
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted text-right">Rate</th>
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted text-right">Amount</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {challanItems.map((item) => (
                          <tr key={item.product_id} className="group hover:bg-surface/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-text-primary">{item.product.name}</div>
                              <div className="text-xs text-text-muted">{item.product.sku}</div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(item.product.price, currency)}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold">{formatCurrency(item.quantity * item.product.price, currency)}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleRemoveItem(item.product_id)}
                                className="p-1.5 text-text-muted hover:text-error transition-colors rounded-md hover:bg-error/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-surface/10">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm font-bold text-text-primary text-right uppercase tracking-wider">Total Amount</td>
                          <td className="px-4 py-3 text-right text-lg font-black text-primary">
                            {formatCurrency(calculateTotal(), currency)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleCreateChallan}
                disabled={!selectedCustomer || challanItems.length === 0}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Confirm & Create Challan
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-semibold text-text-primary transition-all hover:bg-surface hover:border-text-muted/30"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-surface/30 px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              History Records
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                {filteredChallans.length}
              </span>
            </h2>

            {/* Responsive Filter Bar */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:w-3/4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search..."
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value as "all" | "today" | "last7" | "last30");
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "amount" | "customer" | "dc_number")}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="customer">Sort by Customer</option>
                <option value="dc_number">Sort by DC #</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {filteredChallans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface p-4 mb-4 border border-border">
              <FileText className="h-10 w-10 text-text-muted/30" />
            </div>
            <p className="text-text-muted font-medium">No delivery challans found</p>
            <p className="text-xs text-text-muted/60 mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <SortableHeader
                    label="DC Number"
                    sortKey="dc_number"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Customer"
                    sortKey="customer"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">Items</th>
                  <SortableHeader
                    label="Total Amount"
                    sortKey="amount"
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Created At"
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
                      <div className="font-bold text-text-primary">{formatCurrency(challan.total_amount, currency)}</div>
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
                              label: "Print Document",
                              icon: Printer,
                              onClick: () => handlePrint(challan)
                            },
                            {
                              label: downloadingId === challan.id ? "Downloading..." : "Save as PDF",
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
