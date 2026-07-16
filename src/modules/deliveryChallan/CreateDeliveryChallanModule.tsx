import { useEffect, useMemo, useState } from "react";
import { 
  Plus, Settings2, Package, Users, ArrowLeft, Minus, Trash2, 
  CheckCircle2, Maximize2, Eye, Printer, X 
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createDeliveryChallan, updateDeliveryChallan } from "./api";
import { listCustomers, type Customer } from "../customers/api";
import { listProducts, type Product } from "../inventory/api";
import { useAuthStore } from "../../store/authStore";
import { type ChallanCustomField, buildPreviewHtml, printDeliveryChallan } from "../reports/pdf";
import { useToastStore } from "../../store/toastStore";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { useTranslation } from "react-i18next";
import { CreateProductModal } from "../../components/modals/CreateProductModal";
import { CreateCustomerModal } from "../../components/modals/CreateCustomerModal";
import { useUiStore } from "../../store/uiStore";
import { Input } from "../../components/ui/Input";

type ChallanItem = {
  product_id: number;
  product: Product;
  quantity: number;
  rate: number;
  amount: number;
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
  const { setLoading } = useUiStore();
  const [submitting, setSubmitting] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  
  const CUSTOM_FIELDS_KEY = 'teebot_challan_custom_fields';
  const [customFields, setCustomFields] = useState<ChallanCustomField[]>(() => {
    if (editingChallan?.metadata?.customFields) {
      return editingChallan.metadata.customFields;
    }
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

  useEffect(() => {
    const labels = customFields.map(f => f.label);
    localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(labels));
  }, [customFields]);

  useEffect(() => {
    if (editingChallan && editingChallan.metadata?.customFields) {
      setCustomFields(editingChallan.metadata.customFields);
    }
  }, [editingChallan]);

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
      setLoading(true, "Synchronizing Inventory & Contacts...");
      const [custs, prods] = await Promise.all([
        listCustomers(currentCompanyId),
        listProducts(currentCompanyId),
      ]);
      setCustomers(custs);
      setProducts(prods);

      if (editingChallan) {
        setChallanItems(
          editingChallan.items.map(i => {
            const actualProduct = prods.find(p => p.id === i.product_id);
            const rate = i.rate || actualProduct?.price || 0;
            return {
              product_id: i.product_id,
              quantity: i.quantity,
              rate: rate,
              amount: i.amount || (i.quantity * rate),
              product: actualProduct || ({
                id: i.product_id,
                name: i.product_name,
                sku: i.product_sku,
                stock_qty: i.quantity,
                price: rate
              } as Product),
            };
          })
        );
        const actualCustomer = custs.find(c => c.id === editingChallan.customer_id);
        setSelectedCustomer(actualCustomer || ({ id: editingChallan.customer_id, name: editingChallan.customer_name } as Customer));
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddCustomerSuccess = (customer?: Customer) => {
    loadData();
    if (customer) setSelectedCustomer(customer);
  };

  const handleQuickAddProductSuccess = (product?: Product) => {
    loadData();
    if (product) setSelectedProduct(product);
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;
    const qtyToAdd = Number(quantity);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      addToast("Please enter a valid quantity.", "error");
      return;
    }

    const existingItem = challanItems.find(item => item.product_id === selectedProduct.id);
    if (existingItem) {
      setChallanItems(items =>
        items.map(item => {
          if (item.product_id === selectedProduct.id) {
            const newQty = item.quantity + qtyToAdd;
            return { 
              ...item, 
              quantity: newQty,
              amount: Number((newQty * item.rate).toFixed(2))
            };
          }
          return item;
        })
      );
    } else {
      const rate = selectedProduct.price || 0;
      setChallanItems(items => [...items, {
        product_id: selectedProduct.id,
        product: selectedProduct,
        quantity: qtyToAdd,
        rate: rate,
        amount: Number((qtyToAdd * rate).toFixed(2))
      }]);
    }
    setSelectedProduct(null);
    setQuantity(0);
  };

  const handleUpdateItemQty = (productId: number, delta: number) => {
    setChallanItems(items =>
      items.map(item => {
        if (item.product_id !== productId) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { 
          ...item, 
          quantity: newQty,
          amount: Number((newQty * item.rate).toFixed(2))
        };
      })
    );
  };

  const handleSetItemQty = (productId: number, newQty: number) => {
    if (isNaN(newQty) || newQty < 0) return;
    setChallanItems(items =>
      items.map(item => {
        if (item.product_id !== productId) return item;
        return { 
          ...item, 
          quantity: newQty,
          amount: Number((newQty * item.rate).toFixed(2))
        };
      })
    );
  };

  const handleRemoveItem = (productId: number) => {
    setChallanItems(items => items.filter(item => item.product_id !== productId));
  };

  const handleSaveChallan = async () => {
    if (!selectedCustomer || challanItems.length === 0) return;

    try {
      setSubmitting(true);
      setLoading(true, "Finalizing Delivery Records...");
      const payload = {
        company_id: currentCompanyId,
        customer_id: selectedCustomer.id,
        items: challanItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        })),
        metadata: { customFields }
      };

      if (isEditMode && editingChallan) {
        await updateDeliveryChallan({ ...payload, id: editingChallan.id });
        addToast("Delivery Challan updated successfully", "success");
      } else {
        await createDeliveryChallan(payload);
        addToast("Delivery Challan created successfully", "success");
      }
      navigate("/app/delivery-challan");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSubmitting(false);
      setLoading(false);
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

  const totalQuantity = challanItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = challanItems.reduce((sum, item) => sum + item.amount, 0);
  const totalUniqueItems = challanItems.length;
  const isFormReady = !!selectedCustomer && challanItems.length > 0;

  const customerSelected = !!selectedCustomer;
  const itemsAdded = challanItems.length > 0;

  const previewHtml = useMemo(() => {
    if (!selectedCustomer) return null;
    return buildPreviewHtml({
      id: 0,
      dc_number: isEditMode ? (editingChallan?.dc_number || "DRAFT") : "DRAFT",
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      created_at: new Date().toISOString(),
      items: challanItems.map((item, idx) => ({
        id: idx,
        dc_id: 0,
        product_id: item.product_id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      })),
      total_amount: totalAmount
    } as any, customFields);
  }, [selectedCustomer, challanItems, customFields, totalAmount, isEditMode, editingChallan]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/app/delivery-challan")}
            className="h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center hover:bg-surface/80 hover:border-primary/20 transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-text-muted" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary">
              {isEditMode ? t('edit_title', 'Edit Challan') : t('new_title')}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {isEditMode ? 'Adjust items and fields, then save or print' : 'Create a new delivery challan for your customer'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (!selectedCustomer) return;
              const docData = {
                id: 0,
                dc_number: isEditMode ? (editingChallan?.dc_number || "DRAFT") : "DRAFT",
                customer_id: selectedCustomer.id,
                customer_name: selectedCustomer.name,
                created_at: new Date().toISOString(),
                items: challanItems.map((item, idx) => ({
                  id: idx,
                  dc_id: 0,
                  product_id: item.product_id,
                  product_name: item.product.name,
                  product_sku: item.product.sku,
                  quantity: item.quantity,
                  rate: item.rate,
                  amount: item.amount
                })),
                total_amount: totalAmount
              };
              printDeliveryChallan(docData as any, customFields);
            }}
            disabled={!isFormReady}
            className="h-10 px-4 text-xs font-bold"
            leftIcon={<Printer className="h-3.5 w-3.5" />}
          >
            Print Document
          </Button>
          <Button
            onClick={handleSaveChallan}
            disabled={!isFormReady || submitting}
            isLoading={submitting}
            className="h-10 px-6 text-xs font-bold shadow-lg shadow-primary/20"
            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            {isEditMode ? 'Save Changes' : 'Confirm & Create'}
          </Button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm flex min-h-0">
        
        {/* LEFT: FORM */}
        <div className="flex-1 min-w-[380px] border-r border-border flex flex-col min-h-0 form-panel">
          <div className="flex-1 overflow-y-auto">
            {/* Step 1: Fields */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-text-primary">Custom Fields</h3>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="PO #, Reference..."
                  className="flex-1 text-xs"
                />
                <Button onClick={handleAddCustomField} size="sm"><Plus className="h-4 w-4" /></Button>
              </div>
              {customFields.map(f => (
                <div key={f.id} className="flex items-center gap-2 mb-2 bg-surface/30 p-2 rounded-lg">
                  <span className="text-[10px] font-bold w-16 truncate opacity-60">{f.label}</span>
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => handleUpdateCustomField(f.id, e.target.value)}
                    className="flex-1 text-xs bg-transparent border-0 p-0 focus:ring-0"
                  />
                  <button onClick={() => handleRemoveCustomField(f.id)} className="text-error/40 hover:text-error"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>

            {/* Step 2: Customer */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <Users className={`h-4 w-4 ${customerSelected ? 'text-success' : 'text-primary'}`} />
                <h3 className="text-sm font-bold text-text-primary">Customer</h3>
              </div>
              <SearchableSelect
                options={[
                  { label: "+ Add New Customer", value: "ADD_NEW" },
                  ...customers.map(c => ({ label: c.name, value: c.id }))
                ]}
                value={selectedCustomer?.id || null}
                onChange={(val) => {
                  if (val === "ADD_NEW") { setShowCustomerModal(true); return; }
                  setSelectedCustomer(customers.find(c => c.id === Number(val)) || null);
                }}
              />
            </div>

            {/* Step 3: Items */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <Package className={`h-4 w-4 ${itemsAdded ? 'text-success' : 'text-primary'}`} />
                <h3 className="text-sm font-bold text-text-primary">Line Items</h3>
              </div>
              <SearchableSelect
                options={[
                  { label: "+ Add New Product", value: "ADD_NEW" },
                  ...products.map(p => ({ label: p.name, value: p.id, description: `Stock: ${p.stock_qty}` }))
                ]}
                value={selectedProduct?.id || null}
                onChange={(val) => {
                  if (val === "ADD_NEW") { setShowProductModal(true); return; }
                  setSelectedProduct(products.find(p => p.id === Number(val)) || null);
                }}
              />
              {selectedProduct && (
                <div className="mt-3 flex gap-2">
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-20 text-xs text-center"
                  />
                  <Button onClick={handleAddItem} className="flex-1" size="sm">Add Item</Button>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {challanItems.map(item => (
                  <div key={item.product_id} className="group flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">{item.product.name}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        Rate: <span className="text-primary font-bold">{item.rate}</span> | 
                        Total: <span className="text-text-primary font-bold">{item.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden bg-background">
                      <button onClick={() => handleUpdateItemQty(item.product_id, -1)} className="h-6 w-6 flex items-center justify-center border-r border-border hover:bg-surface"><Minus className="h-2.5 w-2.5" /></button>
                      <input
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={e => handleSetItemQty(item.product_id, Number(e.target.value))}
                        onBlur={() => { if (item.quantity < 1) handleSetItemQty(item.product_id, 1); }}
                        className="w-10 h-6 text-center text-[10px] font-black border-0 bg-transparent focus:ring-0"
                      />
                      <button onClick={() => handleUpdateItemQty(item.product_id, 1)} className="h-6 w-6 flex items-center justify-center border-l border-border hover:bg-surface"><Plus className="h-2.5 w-2.5" /></button>
                    </div>
                    <button onClick={() => handleRemoveItem(item.product_id)} className="text-error/30 hover:text-error opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM SUMMARY */}
          <div className="p-4 border-t border-border bg-surface/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col"><span className="text-[9px] font-bold opacity-40 uppercase">Unique</span><span className="text-xs font-black">{totalUniqueItems}</span></div>
                <div className="flex flex-col"><span className="text-[9px] font-bold opacity-40 uppercase">Quantity</span><span className="text-xs font-black">{totalQuantity}</span></div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black uppercase opacity-40 block mb-0.5 tracking-wider">Grand Total</span>
                <span className="text-lg font-black text-primary tabular-nums tracking-tighter">{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className={`shrink-0 bg-[#f1f5f9] dark:bg-[#0d1117] flex flex-col min-h-0 transition-all duration-300 challan-preview-container ${previewExpanded ? 'flex-1' : 'w-[500px]'}`}>
          <div className="px-4 py-2 border-b border-border/50 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3 opacity-40" />
              <span className="text-[10px] font-black uppercase opacity-40">Live Preview</span>
            </div>
            <button onClick={() => setPreviewExpanded(!previewExpanded)} className="p-1 hover:bg-surface rounded-md"><Maximize2 className="h-3.5 w-3.5 opacity-40" /></button>
          </div>
          <div className="flex-1 bg-white relative">
            {previewHtml ? (
              <iframe srcDoc={previewHtml} title="Preview" className="absolute inset-0 w-full h-full border-0" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <Package className="h-12 w-12 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting Data</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateCustomerModal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSuccess={handleQuickAddCustomerSuccess} companyId={currentCompanyId} />
      <CreateProductModal isOpen={showProductModal} onClose={() => setShowProductModal(false)} onSuccess={handleQuickAddProductSuccess} companyId={currentCompanyId} existingProducts={products} />
    </div>
  );
}
