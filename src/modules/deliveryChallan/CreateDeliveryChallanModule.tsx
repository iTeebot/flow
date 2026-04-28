import { useEffect, useState } from "react";
import { Plus, FileText, Settings2, Package, Users, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createDeliveryChallan } from "./api";
import { listCustomers, type Customer } from "../customers/api";
import { listProducts, type Product } from "../inventory/api";
import { useAuthStore } from "../../store/authStore";
import { type ChallanCustomField } from "../reports/pdf";
import { useToastStore } from "../../store/toastStore";
import { ChallanPreviewPane } from "./ChallanPreviewPane";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { useTranslation } from "react-i18next";
import { CreateCustomerModal } from "../../components/modals/CreateCustomerModal";
import { CreateProductModal } from "../../components/modals/CreateProductModal";
import { GripHorizontal, X } from "lucide-react";

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

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customFields, setCustomFields] = useState<ChallanCustomField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState("");

  // Prefill from edit state
  useEffect(() => {
    if (editingChallan) {
      // Prefill challan items from the existing challan
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
      // Set a placeholder customer so the preview renders correctly
      setSelectedCustomer({ id: editingChallan.customer_id, name: editingChallan.customer_name } as Customer);
    }
  }, []);

  const { companyId, companyLogo } = useAuthStore();
  const currentCompanyId = companyId || 1;
  const APP_VERSION = "0.0.5";

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

  const handleQuickAddCustomerSuccess = () => {
    loadData();
  };

  const handleQuickAddProductSuccess = () => {
    loadData();
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

      addToast("Delivery Challan created successfully", "success");
      navigate("/app/delivery-challan");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create delivery challan", "error");
    }
  };

  const resetForm = () => {
    navigate("/app/delivery-challan");
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/app/delivery-challan")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          {t('back')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            {isEditMode ? t('edit_title', 'Edit Challan') : t('new_title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isEditMode
              ? t('edit_subtitle', 'Adjust custom fields, line items, then print or download')
              : t('new_subtitle')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm flex flex-col min-h-[600px]">
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] flex-1 min-h-0">
          {/* ── LEFT PANEL: Controls ── */}
          <div className="border-b xl:border-b-0 xl:border-r border-border bg-surface/20 p-6 space-y-6 overflow-y-auto">
            
            {/* Customer */}
            <SearchableSelect
              label={t('customer')}
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

            {/* Custom Fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                  <Settings2 className="h-3 w-3" /> {t('custom_fields')}
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomField())}
                  placeholder={t('cf_placeholder')}
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
                        placeholder={t('value_placeholder')}
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
                label={t('add_line_item')}
                placeholder={t('choose_product')}
                options={[
                  { label: t('register_product'), value: "ADD_NEW" },
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
                  {t('add_to_challan')}
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
                {t('confirm_btn')}
              </Button>
              <Button
                onClick={resetForm}
                variant="ghost"
                className="w-full"
              >
                {t('common:cancel', 'Cancel')}
              </Button>
            </div>
          </div>

          {/* ── RIGHT PANEL: Live Preview ── */}
          <div className="p-6 bg-gray-100/50 dark:bg-surface/30 overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> {t('live_preview')}
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
