import { useEffect, useMemo, useState } from "react";
import { Plus, Settings2, Package, Users, ArrowLeft, Minus, Trash2, Hash, CheckCircle2, Maximize2, Minimize2, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createDeliveryChallan } from "./api";
import { listCustomers, type Customer } from "../customers/api";
import { listProducts, type Product } from "../inventory/api";
import { useAuthStore } from "../../store/authStore";
import { type ChallanCustomField, buildPreviewHtml } from "../reports/pdf";
import { useToastStore } from "../../store/toastStore";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { useTranslation } from "react-i18next";
import { CreateCustomerModal } from "../../components/modals/CreateCustomerModal";
import { CreateProductModal } from "../../components/modals/CreateProductModal";
import { X } from "lucide-react";

type ChallanItem = {
  product_id: number;
  product: Product;
  quantity: number;
};

export function CreateDeliveryChallanModule() {
  const { t } = useTranslation("delivery_chalan");
  const navigate = useNavigate();
  const location = useLocation();
  const editingChallan = (location.state as any)?.challan as import('./api').DeliveryChallan | undefined;
  const isEditMode = !!editingChallan;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  // Persist custom field labels in localStorage
  const CUSTOM_FIELDS_KEY = 'teebot_challan_custom_fields';
  const [customFields, setCustomFields] = useState<ChallanCustomField[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_FIELDS_KEY);
      if (saved) {
        const labels: string[] = JSON.parse(saved);
        return labels.map((label, i) => ({ id: `cf-${i}`, label, value: '' }));
      }
    } catch { /* ignore */ }
    return [];
  });
  const [newFieldLabel, setNewFieldLabel] = useState("");

  // Save custom field labels whenever they change
  useEffect(() => {
    const labels = customFields.map(f => f.label);
    localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(labels));
  }, [customFields]);

  // Prefill from edit state
  useEffect(() => {
    if (editingChallan) {
      setChallanItems(
        editingChallan.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          product: {
            id: i.product_id,
            name: i.product_name,
            sku: i.product_sku,
          } as Product,
        }))
      );
      setSelectedCustomer({ id: editingChallan.customer_id, name: editingChallan.customer_name } as Customer);
    }
  }, []);

  const { companyId } = useAuthStore();
  const currentCompanyId = companyId || 1;

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    if (currentCompanyId) {
      loadData();
    }
  }, [currentCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custs, prods] = await Promise.all([
        listCustomers(currentCompanyId),
        listProducts(currentCompanyId),
      ]);
      setCustomers(custs);
      setProducts(prods);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddCustomerSuccess = (customer?: Customer) => {
    loadData();
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  const handleQuickAddProductSuccess = (product?: Product) => {
    loadData();
    if (product) {
      setSelectedProduct(product);
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

  const handleUpdateItemQty = (productId: number, delta: number) => {
    setChallanItems(items =>
      items.map(item => {
        if (item.product_id !== productId) return item;
        let newQty = item.quantity + delta;
        if (newQty < 1) newQty = 1;
        if (item.product.stock_qty && newQty > item.product.stock_qty) {
          newQty = item.product.stock_qty;
        }
        return { ...item, quantity: newQty };
      })
    );
  };

  const handleSetItemQty = (productId: number, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) return;
    setChallanItems(items =>
      items.map(item => {
        if (item.product_id !== productId) return item;
        if (item.product.stock_qty && newQty > item.product.stock_qty) {
          newQty = item.product.stock_qty;
        }
        return { ...item, quantity: newQty };
      })
    );
  };

  const handleRemoveItem = (productId: number) => {
    setChallanItems(items => items.filter(item => item.product_id !== productId));
  };

  const handleCreateChallan = async () => {
    if (!selectedCustomer || challanItems.length === 0) return;
    if (isEditMode) {
      // No update API exists — edit mode is for preview/print/download only
      addToast("Edit mode is for preview and print only. Use Download/Print from the preview.", "info");
      return;
    }

    try {
      setSubmitting(true);
      await createDeliveryChallan({
        company_id: currentCompanyId,
        customer_id: selectedCustomer.id,
        items: challanItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      });

      addToast("Delivery Challan created successfully", "success");
      navigate("/app/delivery-challan");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create delivery challan", "error");
    } finally {
      setSubmitting(false);
    }
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

  const totalQuantity = challanItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalUniqueItems = challanItems.length;
  const isFormReady = !!selectedCustomer && challanItems.length > 0;

  // Step completion state
  const step1Done = !!selectedCustomer;
  const step2Done = challanItems.length > 0;

  // ── Live Preview HTML (reactive, recalculates on every form change) ──
  const previewHtml = useMemo(() => {
    if (!selectedCustomer) return null;
    const tempChallan = {
      id: 0,
      dc_number: "DRAFT",
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      created_at: new Date().toISOString(),
      items: challanItems.map((item, idx) => ({
        id: idx,
        dc_id: 0,
        product_id: item.product_id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        quantity: item.quantity
      })),
      total_amount: 0
    };
    return buildPreviewHtml(tempChallan as any, customFields);
  }, [selectedCustomer, challanItems, customFields]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-text-muted font-medium">Loading resources...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/app/delivery-challan")}
            className="h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center hover:bg-surface/80 hover:border-primary/20 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-text-muted" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary">
              {isEditMode ? t('edit_title', 'Edit Challan') : t('new_title')}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {isEditMode
                ? t('edit_subtitle', 'Adjust custom fields, line items, then print or download')
                : t('new_subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT: Form Left | Preview Right ── */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm flex min-h-0">

        {/* ═══ LEFT: Form Panel ═══ */}
        <div className="flex-1 min-w-[380px] border-r border-border flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">

            {/* ── Step 1: Customer ── */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${step1Done ? 'bg-success text-white' : 'bg-surface border border-border text-text-muted'}`}>
                  {step1Done ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{t('customer')}</h3>
                  <p className="text-[10px] text-text-muted">Select who you're delivering to</p>
                </div>
              </div>
              <SearchableSelect
                placeholder={t('choose_customer')}
                options={[
                  { label: t('register_customer'), value: "ADD_NEW" },
                  ...customers.map(c => ({ label: c.name, value: c.id, description: c.phone, icon: <Users className="h-4 w-4" /> }))
                ]}
                value={selectedCustomer?.id || null}
                onChange={(val) => {
                  if (val === "ADD_NEW") { setShowCustomerModal(true); return; }
                  setSelectedCustomer(customers.find(c => c.id === parseInt(val)) || null);
                }}
              />
              {selectedCustomer && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20">
                  <Users className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs font-bold text-success">{selectedCustomer.name}</span>
                  <button onClick={() => setSelectedCustomer(null)} className="ml-auto text-success/50 hover:text-success transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Step 2: Add Products ── */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${step2Done ? 'bg-success text-white' : 'bg-surface border border-border text-text-muted'}`}>
                  {step2Done ? <CheckCircle2 className="h-4 w-4" /> : '2'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{t('add_line_item')}</h3>
                  <p className="text-[10px] text-text-muted">Choose products and set quantities</p>
                </div>
              </div>
              <SearchableSelect
                placeholder={t('choose_product')}
                options={[
                  { label: t('register_product'), value: "ADD_NEW" },
                  ...getAvailableProducts().map(p => ({
                    label: p.name,
                    value: p.id,
                    description: `SKU: ${p.sku} · Stock: ${p.stock_qty}`,
                    icon: <Package className="h-4 w-4" />
                  }))
                ]}
                value={selectedProduct?.id || null}
                onChange={(val) => {
                  if (val === "ADD_NEW") { setShowProductModal(true); return; }
                  setSelectedProduct(products.find(p => p.id === parseInt(val)) || null);
                }}
              />

              {/* Quantity + Add inline */}
              {selectedProduct && (
                <div className="mt-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-0 border border-border rounded-xl overflow-hidden bg-background">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-10 w-10 flex items-center justify-center text-text-muted hover:bg-surface transition-colors border-r border-border"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-14 h-10 text-center text-sm font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-10 w-10 flex items-center justify-center text-text-muted hover:bg-surface transition-colors border-l border-border"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Button
                    onClick={handleAddItem}
                    className="flex-1 h-10"
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    {t('add_to_challan')}
                  </Button>
                </div>
              )}

              {selectedProduct && (
                <div className="mt-2 text-[10px] text-text-muted font-semibold px-1">
                  Available stock: <span className="text-primary font-black">{selectedProduct.stock_qty}</span> units · SKU: <span className="font-mono">{selectedProduct.sku}</span>
                </div>
              )}

              {/* Inline items list */}
              {challanItems.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {challanItems.map((item, index) => (
                    <div key={item.product_id} className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-background border border-border hover:border-primary/20 transition-all">
                      <span className="text-[9px] font-black text-text-muted/30 w-4 text-center tabular-nums">{index + 1}</span>
                      <Package className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-text-primary truncate">{item.product.name}</div>
                      </div>
                      <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden bg-surface/30 shrink-0">
                        <button
                          onClick={() => handleUpdateItemQty(item.product_id, -1)}
                          className="h-7 w-7 flex items-center justify-center text-text-muted hover:bg-surface hover:text-text-primary transition-colors"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val)) return;
                            handleSetItemQty(item.product_id, val);
                          }}
                          className="h-7 w-24 text-center text-[11px] font-black text-text-primary border-x border-border tabular-nums bg-transparent outline-none"
                        />
                        <button
                          onClick={() => handleUpdateItemQty(item.product_id, 1)}
                          className="h-7 w-7 flex items-center justify-center text-text-muted hover:bg-surface hover:text-text-primary transition-colors"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-text-muted/20 hover:text-error hover:bg-error/5 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Step 3: Custom Fields (Optional) ── */}
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-black bg-surface border border-border text-text-muted">
                  <Settings2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{t('custom_fields')}</h3>
                  <p className="text-[10px] text-text-muted">PO numbers, references, notes (optional)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomField())}
                  placeholder={t('cf_placeholder')}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  disabled={!newFieldLabel.trim()}
                  className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 active:scale-95 transition-all"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {customFields.length > 0 && (
                <div className="mt-3 space-y-2">
                  {customFields.map(f => (
                    <div key={f.id} className="flex items-center gap-2 bg-background rounded-xl border border-border px-3 py-2 group hover:border-primary/20 transition-all">
                      <Hash className="h-3 w-3 text-text-muted/30 shrink-0" />
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 w-20 truncate">{f.label}</span>
                      <input
                        type="text"
                        value={f.value}
                        onChange={(e) => handleUpdateCustomField(f.id, e.target.value)}
                        placeholder={t('value_placeholder')}
                        className="flex-1 bg-transparent text-xs outline-none text-text-primary placeholder:text-text-muted/30 font-medium"
                      />
                      <button onClick={() => handleRemoveCustomField(f.id)} className="text-text-muted/30 hover:text-error transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom Action Bar ── */}
          <div className="border-t border-border bg-surface/30 px-5 py-4 shrink-0">
            {challanItems.length > 0 && (
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background border border-border">
                  <Package className="h-3 w-3 text-text-muted" />
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Products</span>
                  <span className="text-xs font-black text-text-primary tabular-nums">{totalUniqueItems}</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/20">
                  <Hash className="h-3 w-3 text-primary" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Total Qty</span>
                  <span className="text-xs font-black text-primary tabular-nums">{totalQuantity}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCreateChallan}
                disabled={!isFormReady || submitting}
                isLoading={submitting}
                className="flex-1"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                {t('confirm_btn')}
              </Button>
              <Button
                onClick={() => navigate("/app/delivery-challan")}
                variant="ghost"
                size="sm"
              >
                {t('common:cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Live Preview (iframe) ═══ */}
        <div className={`${previewExpanded ? 'flex-1' : 'w-[400px]'} shrink-0 bg-[#f1f5f9] dark:bg-[#0d1117] overflow-hidden flex flex-col min-h-0 transition-all duration-300`}>
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-text-muted/50" />
              <span className="text-[10px] font-bold text-text-muted/50 uppercase tracking-wider">Live Preview</span>
            </div>
            <button
              onClick={() => setPreviewExpanded(!previewExpanded)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-text-muted/40 hover:text-text-primary hover:bg-surface/50 transition-all"
              title={previewExpanded ? 'Minimize preview' : 'Maximize preview'}
            >
              {previewExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              title="Live Preview"
              className="flex-1 w-full border-0"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="h-16 w-16 rounded-2xl bg-surface/50 dark:bg-surface/20 border-2 border-dashed border-border flex items-center justify-center mb-4">
                <Package className="h-7 w-7 text-text-muted/15" />
              </div>
              <p className="text-sm font-bold text-text-muted/40 mb-1">Live Preview</p>
              <p className="text-[11px] text-text-muted/25 font-medium max-w-[200px]">Select a customer and add items to see the challan preview here</p>
            </div>
          )}
        </div>
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
    </div>
  );
}
