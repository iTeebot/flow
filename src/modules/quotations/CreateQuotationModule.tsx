import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft, Plus, Package, Trash2,
  CheckCircle2, Users, Minus,
  Eye, Maximize2, Minimize2,
  FileText
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { listCustomers, type Customer } from "../customers/api";
import { listProducts, type Product } from "../inventory/api";
import { createQuotation, type Quotation } from "./api";
import { buildQuotationPreviewHtml } from "../reports/pdf";
import { getCompanyProfile, type CompanyProfile } from "../companyProfile/api";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { CreateCustomerModal } from "../../components/modals/CreateCustomerModal";
import { CreateProductModal } from "../../components/modals/CreateProductModal";

interface QuotationItemInput {
  product_id?: number;
  product: { name: string; sku: string; price: number };
  description: string;
  quantity: number;
  rate: number;
}

export function CreateQuotationModule() {
  const { t } = useTranslation("quotations");
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId, currency } = useAuthStore();
  const { addToast } = useToastStore();

  const isEditMode = !!location.state?.quotation;
  const initialQuotation = location.state?.quotation as Quotation | undefined;

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItemInput[]>([]);
  const [notes, setNotes] = useState("");

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    const loadResources = async () => {
      if (!companyId) return;
      try {
        setLoading(true);
        const [cList, pList, profile] = await Promise.all([
          listCustomers(companyId),
          listProducts(companyId),
          getCompanyProfile(companyId)
        ]);
        setCustomers(cList);
        setProducts(pList);
        setCompanyProfile(profile);

        if (isEditMode && initialQuotation) {
          setSelectedCustomer(cList.find(c => c.id === initialQuotation.customer_id) || null);
          setNotes(initialQuotation.notes || "");
          setQuotationItems(initialQuotation.items.map(item => ({
            product_id: item.product_id,
            product: { name: item.product_name.toString(), sku: item.product_sku?.toString() || "", price: item.rate },
            description: item.description,
            quantity: item.quantity,
            rate: item.rate
          })));
        }
      } catch (err) {
        addToast("Failed to load resources", "error");
      } finally {
        setLoading(false);
      }
    };
    loadResources();
  }, [companyId, isEditMode, initialQuotation]);

  const handleAddItem = (product: Product) => {
    const exists = quotationItems.find(i => i.product_id === product.id);
    if (exists) {
      handleUpdateItemQty(product.id!, 1);
    } else {
      setQuotationItems([...quotationItems, {
        product_id: product.id,
        product: { name: product.name, sku: product.sku, price: product.price },
        description: product.description || "",
        quantity: 1,
        rate: product.price
      }]);
    }
  };

  const handleUpdateItemQty = (productId: number, delta: number) => {
    setQuotationItems(quotationItems.map(item =>
      item.product_id === productId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  const handleRemoveItem = (idx: number) => {
    setQuotationItems(quotationItems.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!companyId || !selectedCustomer || quotationItems.length === 0) return;
    try {
      setLoading(true);
      const input = {
        company_id: companyId,
        customer_id: selectedCustomer.id,
        items: quotationItems.map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate
        })),
        notes
      };
      await createQuotation(input);
      addToast(isEditMode ? "Quotation updated" : "Quotation created", "success");
      navigate("/app/quotations");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to save quotation", "error");
    } finally {
      setLoading(false);
    }
  };

  const previewHtml = useMemo(() => {
    if (!selectedCustomer || !companyProfile) return null;
    const tempQuote = {
      id: 0,
      quote_number: "DRAFT",
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_address: selectedCustomer.address,
      customer_phone: selectedCustomer.phone,
      company_id: companyId!,
      created_at: new Date().toISOString(),
      status: "draft",
      notes,
      items: quotationItems.map((item, idx) => ({
        id: idx,
        product_id: item.product_id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate
      })),
      total_amount: quotationItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
    };
    return buildQuotationPreviewHtml(tempQuote as any, companyProfile);
  }, [selectedCustomer, quotationItems, notes, companyProfile]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/app/quotations")} className="h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center hover:bg-surface/80 transition-all">
            <ArrowLeft className="h-4 w-4 text-text-muted" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary">{isEditMode ? "Edit Quotation" : "New Quotation"}</h1>
            <p className="text-xs text-text-muted mt-0.5">Generate a formal price quote for your client</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm flex min-h-0">
        <div className="flex-1 min-w-[380px] border-r border-border flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Step 1: Customer */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black ${selectedCustomer ? 'bg-success text-white' : 'bg-surface border border-border'}`}>
                  {selectedCustomer ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                </div>
                <h3 className="text-sm font-bold text-text-primary">Select Customer</h3>
              </div>
              <SearchableSelect
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
            </div>

            {/* Step 2: Items */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black ${quotationItems.length > 0 ? 'bg-success text-white' : 'bg-surface border border-border'}`}>
                  {quotationItems.length > 0 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
                </div>
                <h3 className="text-sm font-bold text-text-primary">Line Items</h3>
              </div>
              <SearchableSelect
                placeholder="Search products to add..."
                options={[
                  { label: "＋ Register New Product", value: "ADD_NEW" },
                  ...products.map(p => ({ label: p.name, value: p.id, description: `Stock: ${p.stock_qty} | SKU: ${p.sku}`, icon: <Package className="h-4 w-4" /> }))
                ]}
                value={null}
                onChange={(val) => {
                  if (val === "ADD_NEW") { setShowProductModal(true); return; }
                  const p = products.find(prod => prod.id === parseInt(val));
                  if (p) handleAddItem(p);
                }}
              />

              <div className="space-y-2 mt-4">
                {quotationItems.map((item, idx) => (
                  <div key={idx} className="group p-3 rounded-xl bg-background border border-border hover:border-primary/20 transition-all space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-text-primary truncate">{item.product.name}</div>
                        <Input
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...quotationItems];
                            newItems[idx].description = e.target.value;
                            setQuotationItems(newItems);
                          }}
                          placeholder="Line item description..."
                          className="mt-1.5 h-8 text-[11px]"
                        />
                      </div>
                      <button onClick={() => handleRemoveItem(idx)} className="p-1.5 text-text-muted/40 hover:text-error transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface/30">
                        <button onClick={() => handleUpdateItemQty(item.product_id!, -1)} className="h-7 w-7 flex items-center justify-center text-text-muted hover:bg-surface"><Minus className="h-2.5 w-2.5" /></button>
                        <input type="number" value={item.quantity} onChange={(e) => {
                          const newItems = [...quotationItems];
                          newItems[idx].quantity = parseInt(e.target.value) || 1;
                          setQuotationItems(newItems);
                        }} className="w-12 text-center text-[11px] font-black tabular-nums bg-transparent outline-none" />
                        <button onClick={() => handleUpdateItemQty(item.product_id!, 1)} className="h-7 w-7 flex items-center justify-center text-text-muted hover:bg-surface"><Plus className="h-2.5 w-2.5" /></button>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Rate:</span>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => {
                            const newItems = [...quotationItems];
                            newItems[idx].rate = parseFloat(e.target.value) || 0;
                            setQuotationItems(newItems);
                          }}
                          className="h-7 w-24 text-[11px] font-black tabular-nums"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-tighter mb-0.5">Amount</div>
                        <div className="text-xs font-black text-primary">{(item.quantity * item.rate).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Notes */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-sm font-bold text-text-primary">Notes & Terms</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Validity period, payment terms, etc..."
                className="w-full min-h-[100px] p-3 rounded-xl bg-background border border-border text-sm focus:border-primary/50 outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-border bg-surface/50 flex gap-3">
            <Button variant="outline" onClick={() => navigate("/app/quotations")} className="flex-1 h-11 uppercase font-black tracking-widest text-[10px]">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!selectedCustomer || quotationItems.length === 0 || loading}
              className="flex-[2] h-11 uppercase font-black tracking-widest text-[10px]"
            >
              {isEditMode ? "Update Quotation" : "Confirm & Create"}
            </Button>
          </div>
        </div>

        <div className={`${previewExpanded ? 'flex-1' : 'w-[450px]'} shrink-0 bg-background overflow-hidden flex flex-col transition-all duration-300`}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface/30">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Live Preview</span>
            </div>
            <button onClick={() => setPreviewExpanded(!previewExpanded)} className="p-1.5 rounded-lg hover:bg-surface/50 transition-all">
              {previewExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
          {previewHtml ? (
            <iframe srcDoc={previewHtml} className="flex-1 w-full border-0" title="Quotation Preview" />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-surface border-2 border-dashed border-border flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-text-muted/20" />
              </div>
              <p className="text-sm font-bold text-text-muted/40">Select a customer and items to see preview</p>
            </div>
          )}
        </div>
      </div>

      <CreateCustomerModal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSuccess={(c) => { setCustomers([...customers, c]); setSelectedCustomer(c); }} companyId={companyId!} />
      <CreateProductModal isOpen={showProductModal} onClose={() => setShowProductModal(false)} onSuccess={(p) => { setProducts([...products, p]); handleAddItem(p); }} companyId={companyId!} existingProducts={products} />
    </div>
  );
}
