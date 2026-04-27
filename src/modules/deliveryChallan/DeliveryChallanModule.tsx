import { useEffect, useState } from "react";
import { Plus, FileText, Download, Printer, Search, Users, Package, X, Settings2, GripHorizontal, Edit2 } from "lucide-react";
import { createDeliveryChallan, listDeliveryChallans, type DeliveryChallan } from "./api";
import { listCustomers, type Customer } from "../customers/api";
import { listProducts, type Product } from "../inventory/api";
import { useAuthStore } from "../../store/authStore";
import { downloadDeliveryChallanPdf, printDeliveryChallan, type ChallanCustomField } from "../reports/pdf";
import { TablePagination } from "../shared/TablePagination";
import { useToastStore } from "../../store/toastStore";
import { SortableHeader } from "../../components/SortableHeader";
import { TableActions } from "../../components/TableActions";
import { ChallanPreviewPane } from "./ChallanPreviewPane";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { LanguageSwitcher } from "../../components/ui/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { CreateCustomerModal } from "../../components/modals/CreateCustomerModal";
import { CreateProductModal } from "../../components/modals/CreateProductModal";

type ChallanItem = {
  product_id: number;
  product: Product;
  quantity: number;
};

export function DeliveryChallanModule() {
  const { t } = useTranslation();
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
  const [customFields, setCustomFields] = useState<ChallanCustomField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState("");

  const { companyId, companyLogo } = useAuthStore();
  const currentCompanyId = companyId || 1;
  const APP_VERSION = "0.0.5";

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Dynamic Editor State
  const [editingChallan, setEditingChallan] = useState<DeliveryChallan | null>(null);
  const [editorCustomFields, setEditorCustomFields] = useState<ChallanCustomField[]>([]);
  const [editorNewFieldLabel, setEditorNewFieldLabel] = useState("");

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

  const handleQuickAddCustomerSuccess = (newCustomer: Customer) => {
    setCustomers(prev => [...prev, newCustomer]);
    setSelectedCustomer(newCustomer);
  };

  const handleQuickAddProductSuccess = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
    setSelectedProduct(newProduct);
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
    setCustomFields([]);
    setNewFieldLabel("");
  };

  const handleAddCustomField = () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    setCustomFields(prev => [...prev, { id: `cf-${Date.now()}`, label, value: "" }]);
    setNewFieldLabel("");
  };

  const handleUpdateCustomField = (id: string, value: string) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const getAvailableProducts = () => {
    const usedProductIds = challanItems.map(item => item.product_id);
    return products.filter(product => !usedProductIds.includes(product.id) && product.stock_qty > 0);
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
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t('challan.title')}</h1>
            <p className="text-sm text-text-muted mt-1">Manage and track your customer delivery documents</p>
          </div>
          <LanguageSwitcher />
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {t('common.add')}
        </Button>
      </div>

      {showCreateForm && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-border bg-surface/50 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              New Delivery Challan
            </h2>
            <button onClick={resetForm} className="text-text-muted hover:text-text-primary transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] min-h-0">
            {/* ── LEFT PANEL: Controls ── */}
            <div className="border-b xl:border-b-0 xl:border-r border-border bg-surface/20 p-6 space-y-6 overflow-y-auto">

              {/* Customer */}
              <SearchableSelect
                label={t('challan.customer')}
                placeholder="Choose a customer..."
                options={[
                  { label: "＋ Register New Customer", value: "ADD_NEW" },
                  ...customers.map(c => ({ label: c.name, value: c.id, description: c.phone, icon: <Users className="h-4 w-4" /> }))
                ]}
                value={selectedCustomer?.id || null}
                onChange={(val) => {
                  if (val === "ADD_NEW") { setShowCustomerModal(true); return; }
                  setSelectedCustomer(customers.find(c => c.id === parseInt(val)) || null);
                }}
              />

              {/* Custom Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                    <Settings2 className="h-3 w-3" /> Custom Fields
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomField())}
                    placeholder="e.g. PO Number, UT Number..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    disabled={!newFieldLabel.trim()}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 hover:scale-[1.02] transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {customFields.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {customFields.map(f => (
                      <div key={f.id} className="flex items-center gap-2 bg-background rounded-lg border border-border px-3 py-1.5">
                        <GripHorizontal className="h-3.5 w-3.5 text-text-muted/40 shrink-0" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 w-20 truncate">{f.label}</span>
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) => handleUpdateCustomField(f.id, e.target.value)}
                          placeholder="Enter value..."
                          className="flex-1 bg-transparent text-xs outline-none text-text-primary placeholder:text-text-muted/40"
                        />
                        <button onClick={() => handleRemoveCustomField(f.id)} className="text-text-muted hover:text-error transition-colors shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Products */}
              <div className="space-y-3">
                <SearchableSelect
                  label="Add Line Item"
                  placeholder="Choose a product..."
                  options={[
                    { label: "＋ Register New Product", value: "ADD_NEW" },
                    ...getAvailableProducts().map(p => ({
                      label: p.name,
                      value: p.id,
                      description: `SKU: ${p.sku} | Stock: ${p.stock_qty}`,
                      icon: <Package className="h-4 w-4" />
                    }))
                  ]}
                  value={selectedProduct?.id || null}
                  onChange={(val) => {
                    if (val === "ADD_NEW") { setShowProductModal(true); return; }
                    setSelectedProduct(products.find(p => p.id === parseInt(val)) || null);
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-24"
                  />
                  <Button
                    onClick={handleAddItem}
                    disabled={!selectedProduct}
                    variant="outline"
                    className="flex-1"
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Add to Challan
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button
                  onClick={handleCreateChallan}
                  disabled={!selectedCustomer || challanItems.length === 0}
                  className="w-full"
                >
                  ✓ Confirm & Create Challan
                </Button>
                <Button
                  onClick={resetForm}
                  variant="ghost"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* ── RIGHT PANEL: Live Preview ── */}
            <div className="p-6 bg-gray-100/50 dark:bg-surface/30 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Live Preview
              </p>
              <ChallanPreviewPane
                customer={selectedCustomer}
                items={challanItems}
                customFields={customFields}
                companyLogo={companyLogo}
                onRemoveItem={handleRemoveItem}
                onUpdateCustomField={handleUpdateCustomField}
                onRemoveCustomField={handleRemoveCustomField}
                version={APP_VERSION}
              />
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
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder={t('common.search')}
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
                  { label: "All Time", value: "all" },
                  { label: "Today", value: "today" },
                  { label: "Last 7 Days", value: "last7" },
                  { label: "Last 30 Days", value: "last30" }
                ]}
                className="py-2"
              />

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "amount" | "customer" | "dc_number")}
                options={[
                  { label: "Sort by Date", value: "date" },
                  { label: "Sort by Amount", value: "amount" },
                  { label: "Sort by Customer", value: "customer" },
                  { label: "Sort by DC #", value: "dc_number" }
                ]}
                className="py-2"
              />

              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                options={[
                  { label: "Descending", value: "desc" },
                  { label: "Ascending", value: "asc" }
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
                  <SortableHeader
                    label="Items"
                    sortKey="items_count"
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
                              label: "Add Custom Fields",
                              icon: Plus,
                              onClick: () => {
                                setEditingChallan({ ...challan, items: [...challan.items] });
                                setEditorCustomFields([]);
                              }
                            },
                            {
                              label: "Edit Layout / Content",
                              icon: Edit2,
                              onClick: () => {
                                setEditingChallan({ ...challan, items: [...challan.items] });
                                setEditorCustomFields([]);
                              }
                            },
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
      <CreateCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSuccess={handleQuickAddCustomerSuccess}
        companyId={currentCompanyId}
      />

      <CreateProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={handleQuickAddProductSuccess}
        companyId={currentCompanyId}
        existingProducts={products}
      />
      {/* Dynamic Document Editor Modal */}
      {editingChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-primary" />
                  Dynamic Document Editor
                </h3>
                <p className="text-xs text-text-muted mt-1">Changes made here only apply to the printed or downloaded document.</p>
              </div>
              <button
                onClick={() => { setEditingChallan(null); setEditorCustomFields([]); }}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[380px_1fr]">
              {/* Controls */}
              <div className="border-r border-border bg-surface/20 p-6 space-y-6 overflow-y-auto">
                <Input
                  label="Document Number"
                  value={editingChallan.dc_number}
                  onChange={(e) => setEditingChallan({ ...editingChallan, dc_number: e.target.value })}
                />
                <Input
                  label="Customer Name"
                  value={editingChallan.customer_name}
                  onChange={(e) => setEditingChallan({ ...editingChallan, customer_name: e.target.value })}
                />

                {/* Custom Fields section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                      <Settings2 className="h-3 w-3" /> Custom Fields
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={editorNewFieldLabel}
                      onChange={(e) => setEditorNewFieldLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editorNewFieldLabel.trim()) {
                          e.preventDefault();
                          setEditorCustomFields(prev => [...prev, { id: `cf-${Date.now()}`, label: editorNewFieldLabel.trim(), value: "" }]);
                          setEditorNewFieldLabel("");
                        }
                      }}
                      placeholder="e.g. PO Number..."
                      className="py-2"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (editorNewFieldLabel.trim()) {
                          setEditorCustomFields(prev => [...prev, { id: `cf-${Date.now()}`, label: editorNewFieldLabel.trim(), value: "" }]);
                          setEditorNewFieldLabel("");
                        }
                      }}
                      disabled={!editorNewFieldLabel.trim()}
                      className="px-3"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {editorCustomFields.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {editorCustomFields.map(f => (
                        <div key={f.id} className="flex items-center gap-2 bg-background rounded-lg border border-border px-3 py-1.5">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 w-20 truncate">{f.label}</span>
                          <input
                            type="text"
                            value={f.value}
                            onChange={(e) => setEditorCustomFields(prev => prev.map(cf => cf.id === f.id ? { ...cf, value: e.target.value } : cf))}
                            placeholder="Value..."
                            className="flex-1 bg-transparent text-xs outline-none text-text-primary placeholder:text-text-muted/40"
                          />
                          <button onClick={() => setEditorCustomFields(prev => prev.filter(cf => cf.id !== f.id))} className="text-text-muted hover:text-error transition-colors shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Line Items section */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block">
                    Line Items
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {editingChallan.items.map((item, idx) => (
                      <div key={item.id} className="bg-background border border-border rounded-lg p-3 space-y-2">
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => {
                            const newItems = [...editingChallan.items];
                            newItems[idx].product_name = e.target.value;
                            setEditingChallan({ ...editingChallan, items: newItems });
                          }}
                          className="w-full bg-transparent text-sm font-semibold text-text-primary outline-none border-b border-border focus:border-primary"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.product_sku}
                            onChange={(e) => {
                              const newItems = [...editingChallan.items];
                              newItems[idx].product_sku = e.target.value;
                              setEditingChallan({ ...editingChallan, items: newItems });
                            }}
                            className="flex-1 bg-transparent text-xs text-text-muted outline-none"
                          />
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...editingChallan.items];
                              newItems[idx].quantity = parseInt(e.target.value) || 0;
                              setEditingChallan({ ...editingChallan, items: newItems });
                            }}
                            className="w-16 bg-transparent text-sm font-bold text-center border border-border rounded outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Live Preview Pane */}
              <div className="p-6 bg-gray-100/50 dark:bg-surface/30 overflow-y-auto">
                <ChallanPreviewPane
                  customer={{ name: editingChallan.customer_name } as Customer}
                  items={editingChallan.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, product: { name: i.product_name, sku: i.product_sku } as Product }))}
                  customFields={editorCustomFields}
                  companyLogo={companyLogo}
                  onRemoveItem={() => { }}
                  onUpdateCustomField={() => { }}
                  onRemoveCustomField={() => { }}
                  version={APP_VERSION}
                  dcNumber={editingChallan.dc_number}
                  date={editingChallan.created_at}
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface/50 flex justify-end gap-3 shrink-0">
              <Button
                variant="secondary"
                onClick={() => {
                  handlePrint(editingChallan, editorCustomFields);
                }}
                leftIcon={<Printer className="h-4 w-4" />}
              >
                Print Document
              </Button>
              <Button
                onClick={() => {
                  handleDownloadPdf(editingChallan, editorCustomFields);
                }}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Save as PDF
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
