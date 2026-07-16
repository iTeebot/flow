import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft, Package, Trash2,
  Users, 
  FileText, Calendar, Info, AlertCircle, Save
} from "lucide-react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { listCustomers, type Customer } from "../customers/api";
import { listProducts, type Product } from "../inventory/api";
import { createDetailedInvoice, getInvoice, updateInvoice, type CreateDetailedInvoiceInput, type DetailedInvoiceItemInput, type UpdateInvoiceInput } from "./api";
import { getCompanyProfile, type CompanyProfile } from "../companyProfile/api";
import { getDeliveryChallan } from "../deliveryChallan/api";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { Select } from "../../components/ui/Select";
import { formatCurrency } from "../../lib/utils";

const PROVINCES = ["Sindh", "Punjab", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Kashmir"];
const REGISTRATION_TYPES = ["Registered", "Unregistered"];
const INVOICE_TYPES = ["Sale Invoice", "Debit Note"];

export function CreateInvoiceModule() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const dcIdParam = searchParams.get("dcId");
  const isEditing = !!id;
  
  const { companyId, currency } = useAuthStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form State
  const [invoiceType, setInvoiceType] = useState("Sale Invoice");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceRefNo, setInvoiceRefNo] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [buyerInfo, setBuyerInfo] = useState({
    ntn: "",
    name: "",
    province: "Sindh",
    address: "",
    registrationType: "Unregistered"
  });

  const [invoiceItems, setInvoiceItems] = useState<DetailedInvoiceItemInput[]>([]);

  const loadData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [profileData, customersData, productsData] = await Promise.all([
        getCompanyProfile(companyId),
        listCustomers(companyId),
        listProducts(companyId)
      ]);
      setCompanyProfile(profileData);
      setCustomers(customersData);
      setProducts(productsData);

      // If dcId is provided, pre-fill from delivery challan
      if (dcIdParam) {
        const challan = await getDeliveryChallan(Number(dcIdParam));
        if (challan) {
          const customer = customersData.find(c => c.id === challan.customer_id);
          if (customer) {
            setSelectedCustomerId(customer.id);
            setBuyerInfo({
              ntn: customer.tax_registration_number || "",
              name: customer.name,
              province: customer.province || "Sindh",
              address: customer.address || "",
              registrationType: customer.registration_type || "Unregistered"
            });
          }

          const items: DetailedInvoiceItemInput[] = challan.items.map(item => {
            const product = productsData.find(p => p.id === item.product_id);
            return {
              product_id: item.product_id,
              description: item.product_name,
              quantity: item.quantity,
              unit_price: item.rate, // rate from DC is actually unit price
              tax_rate: "18%",
              hs_code: product?.hs_code || "",
              uom: product?.uom || "Numbers, pieces, units",
              value_sales_excluding_st: item.amount,
              fixed_notified_value_or_retail_price: 0,
              sales_tax_applicable: item.amount * 0.18,
              sales_tax_withheld_at_source: 0,
              extra_tax: 0,
              further_tax: 0,
              sro_schedule_no: "",
              fed_payable: 0,
              discount: 0,
              sale_type: "Goods at standard rate (default)",
              sro_item_serial_no: ""
            };
          });
          setInvoiceItems(items);
          setInvoiceRefNo(`DC-${challan.dc_number}`);
        }
      } else if (isEditing) {

        const invoice = await getInvoice(Number(id));
        if (invoice) {
          setInvoiceType(invoice.invoice_type || "Sale Invoice");
          setInvoiceDate(invoice.invoice_date || invoice.created_at.split('T')[0]);
          setInvoiceRefNo(invoice.invoice_ref_no || "");
          setNotes(invoice.notes || "");
          setSelectedCustomerId(invoice.customer_id);
          setBuyerInfo({
            ntn: invoice.buyer_ntn_cnic || "",
            name: invoice.customer_name,
            province: invoice.buyer_province || "Sindh",
            address: "", // We might need to fetch this from customer if needed
            registrationType: invoice.buyer_registration_type || "Unregistered"
          });
          
          const items: DetailedInvoiceItemInput[] = invoice.items.map(item => ({
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate || "18%",
            hs_code: item.hs_code || "",
            uom: item.uom || "Numbers, pieces, units",
            value_sales_excluding_st: item.value_sales_excluding_st,
            fixed_notified_value_or_retail_price: item.fixed_notified_value_or_retail_price,
            sales_tax_applicable: item.sales_tax_applicable,
            sales_tax_withheld_at_source: item.sales_tax_withheld_at_source,
            extra_tax: item.extra_tax,
            further_tax: item.further_tax,
            sro_schedule_no: item.sro_schedule_no,
            fed_payable: item.fed_payable,
            discount: item.discount,
            sale_type: item.sale_type || "Goods at standard rate (default)",
            sro_item_serial_no: item.sro_item_serial_no,
            metadata: item.metadata
          }));
          setInvoiceItems(items);
        }
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load required data", "error");

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleCustomerChange = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomerId(customerId);
      setBuyerInfo({
        ntn: customer.tax_registration_number || "",
        name: customer.name,
        province: customer.province || "Sindh",
        address: customer.address || "",
        registrationType: customer.registration_type || "Unregistered"
      });
    }
  };

  const addItem = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItem: DetailedInvoiceItemInput = {
        product_id: product.id,
        description: product.name,
        quantity: 1,
        unit_price: product.price,
        tax_rate: "18%", // Default 18%
        hs_code: product.hs_code || "",
        uom: product.uom || "Numbers, pieces, units",
        value_sales_excluding_st: product.price,
        fixed_notified_value_or_retail_price: 0,
        sales_tax_applicable: product.price * 0.18,
        sales_tax_withheld_at_source: 0,
        extra_tax: 0,
        further_tax: 0,
        sro_schedule_no: "",
        fed_payable: 0,
        discount: 0,
        sale_type: "Goods at standard rate (default)",
        sro_item_serial_no: ""
      };
      setInvoiceItems([...invoiceItems, newItem]);
    }
  };

  const updateItem = (index: number, field: keyof DetailedInvoiceItemInput, value: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-recalculate if unit_price or quantity or tax_rate changes
    if (field === 'unit_price' || field === 'quantity' || field === 'discount' || field === 'tax_rate') {
      const qty = field === 'quantity' ? value : updated[index].quantity;
      const unitPrice = field === 'unit_price' ? value : updated[index].unit_price;
      const discount = field === 'discount' ? value : updated[index].discount;
      const taxRateStr = field === 'tax_rate' ? value : (updated[index].tax_rate || "0%");
      
      const taxPercent = parseFloat(taxRateStr.replace('%', '')) / 100;
      
      const totalExcl = (qty * unitPrice) - discount;
      updated[index].value_sales_excluding_st = totalExcl;
      updated[index].sales_tax_applicable = totalExcl * taxPercent;
    }

    setInvoiceItems(updated);
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    return invoiceItems.reduce((acc, item) => {
      const salesTax = item.sales_tax_applicable || 0;
      const furtherTax = item.further_tax || 0;
      const extraTax = item.extra_tax || 0;
      const fed = item.fed_payable || 0;
      const valueExcl = item.value_sales_excluding_st || 0;
      
      return {
        exclusive: acc.exclusive + valueExcl,
        salesTax: acc.salesTax + salesTax,
        furtherTax: acc.furtherTax + furtherTax,
        extraTax: acc.extraTax + extraTax,
        fed: acc.fed + fed,
        total: acc.total + valueExcl + salesTax + furtherTax + extraTax + fed
      };
    }, { exclusive: 0, salesTax: 0, furtherTax: 0, extraTax: 0, fed: 0, total: 0 });
  }, [invoiceItems]);

  const handleSubmit = async () => {
    if (!companyId) return;
    if (!selectedCustomerId) {
      addToast("Please select a buyer", "error");
      return;
    }
    if (invoiceItems.length === 0) {
      addToast("Please add at least one item", "error");
      return;
    }

    // Basic Validation
    if (!buyerInfo.ntn || !buyerInfo.name || !buyerInfo.province || !buyerInfo.address) {
      addToast("Please ensure all buyer details are complete", "error");

      // Don't return, let user edit in place if we had a dedicated "Missing Info" prompt,
      // but here we allow editing the buyerInfo fields directly.
    }

    try {
      setSaving(true);
      const input: CreateDetailedInvoiceInput = {
        company_id: companyId,
        customer_id: selectedCustomerId,
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        seller_ntn_cnic: companyProfile?.tax_registration_number,
        seller_province: companyProfile?.state || "Sindh",
        buyer_ntn_cnic: buyerInfo.ntn,
        buyer_province: buyerInfo.province,
        buyer_registration_type: buyerInfo.registrationType,
        invoice_ref_no: invoiceRefNo,
        notes: notes,
        items: invoiceItems
      };

      if (isEditing) {
        const updateInput: UpdateInvoiceInput = {
          ...input,
          id: Number(id)
        };
        await updateInvoice(updateInput);
        addToast("Invoice updated successfully", "success");
      } else {
        await createDetailedInvoice(input);
        addToast("Invoice created successfully", "success");
      }
      navigate("/app/invoices");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create invoice", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/app/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-text-primary tracking-tight">
              {isEditing ? "Edit Sales Invoice" : "Create Sales Invoice"}
            </h1>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Regulatory Compliance Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/app/invoices")}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={saving}>
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? "Update Invoice" : "Finalize Invoice"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Meta */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-wider">Invoice Header</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select 
                label="Invoice Type"
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as string)}

                options={INVOICE_TYPES.map(t => ({ label: t, value: t }))}
              />
              <Input 
                type="date"
                label="Invoice Date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                leftIcon={<Calendar className="h-4 w-4" />}
              />
              <Input 
                label="Reference Number"
                placeholder="Optional Ref #"
                value={invoiceRefNo}
                onChange={(e) => setInvoiceRefNo(e.target.value)}
              />
            </div>
          </div>

          {/* Seller & Buyer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seller */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm opacity-80">
              <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <h2 className="text-sm font-black uppercase tracking-wider">Seller Details (You)</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">Business Name</p>
                  <p className="text-sm font-bold">{companyProfile?.company_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">NTN / CNIC</p>
                    <p className="text-sm font-bold">{companyProfile?.tax_registration_number || "NOT SET"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">Province</p>
                    <p className="text-sm font-bold">{companyProfile?.state || "NOT SET"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">Address</p>
                  <p className="text-sm font-bold truncate">{companyProfile?.address}</p>
                </div>
              </div>
            </div>

            {/* Buyer */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-black uppercase tracking-wider">Buyer Details</h2>
                </div>
                {(!buyerInfo.ntn || !buyerInfo.name) && selectedCustomerId && (
                  <AlertCircle className="h-4 w-4 text-warning animate-pulse" />
                )}
              </div>
              <div className="p-6 space-y-4">
                <SearchableSelect 
                  label="Select Buyer"
                  placeholder="Search for a customer..."
                  options={customers.map(c => ({ label: c.name, value: c.id }))}
                  value={selectedCustomerId}
                  onChange={(val) => handleCustomerChange(Number(val))}
                  leftIcon={<Users className="h-4 w-4" />}
                />
                
                {selectedCustomerId && (
                  <div className="space-y-3 pt-2 border-t border-border animate-in fade-in slide-in-from-top-2 duration-300">
                    <Input 
                      label="NTN / CNIC (7 or 13 digits)"
                      value={buyerInfo.ntn}
                      onChange={(e) => setBuyerInfo({ ...buyerInfo, ntn: e.target.value })}
                      className="h-9 text-xs"
                      error={buyerInfo.ntn.length > 0 && ![7, 13].includes(buyerInfo.ntn.length) ? "Invalid length" : undefined}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select 
                        label="Province"
                        value={buyerInfo.province}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, province: e.target.value as string })}

                        options={PROVINCES.map(p => ({ label: p, value: p }))}
                        className="h-9 text-xs"
                      />
                      <Select 
                        label="Registration"
                        value={buyerInfo.registrationType}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, registrationType: e.target.value as string })}

                        options={REGISTRATION_TYPES.map(t => ({ label: t, value: t }))}
                        className="h-9 text-xs"
                      />
                    </div>
                    <Input 
                      label="Buyer Address"
                      value={buyerInfo.address}
                      onChange={(e) => setBuyerInfo({ ...buyerInfo, address: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-wider">Line Items</h2>
              </div>
              <div className="w-64">
                <SearchableSelect 
                  placeholder="Add Product..."
                  options={products.map(p => ({ label: p.name, value: p.id }))}
                  value={null}
                  onChange={(val) => addItem(Number(val))}
                />

              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface/30 border-b border-border">
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-text-muted tracking-widest">Product / HS Code</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-text-muted tracking-widest w-24">Qty / UOM</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-text-muted tracking-widest w-32">Unit Price ({currency})</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-text-muted tracking-widest w-32">Tax Rate %</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-text-muted tracking-widest w-32">Sales Tax</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-text-muted tracking-widest w-32">Amount</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invoiceItems.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-surface/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-bold text-sm">{item.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] text-text-muted font-mono uppercase">HS:</span>
                           <input 
                             value={item.hs_code || ""}
                             onChange={(e) => updateItem(idx, 'hs_code', e.target.value)}
                             className="text-[10px] bg-transparent border-none p-0 focus:ring-0 text-primary font-bold w-20"
                             placeholder="Set HS Code"
                           />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          onBlur={() => { if (item.quantity < 1) updateItem(idx, 'quantity', 1); }}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm font-bold"
                        />
                        <div className="text-[9px] text-text-muted mt-1 truncate">{item.uom}</div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={item.unit_price === 0 ? '' : item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm font-bold"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          type="text"
                          value={item.tax_rate || "18%"}
                          onChange={(e) => updateItem(idx, 'tax_rate', e.target.value)}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm font-bold text-primary"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-primary">
                          {formatCurrency(item.sales_tax_applicable || 0, currency)}
                        </div>
                        <div className="text-[9px] text-text-muted">Further Tax: {formatCurrency(item.further_tax || 0, currency)}</div>
                      </td>
                      <td className="px-4 py-4 font-black text-sm">
                        {formatCurrency((item.value_sales_excluding_st || 0) + (item.sales_tax_applicable || 0), currency)}
                      </td>
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => removeItem(idx)}
                          className="text-text-muted hover:text-error transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invoiceItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No items added yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg sticky top-24">
            <div className="px-6 py-4 border-b border-border bg-primary/5">
              <h2 className="text-sm font-black uppercase tracking-wider text-primary">Financial Summary</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted font-bold uppercase tracking-widest text-[10px] self-center">Value Excl. ST</span>
                <span className="font-bold">{formatCurrency(totals.exclusive, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted font-bold uppercase tracking-widest text-[10px] self-center">Sales Tax (18%)</span>
                <span className="font-bold text-primary">{formatCurrency(totals.salesTax, currency)}</span>
              </div>
              {totals.furtherTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted font-bold uppercase tracking-widest text-[10px] self-center">Further Tax</span>
                  <span className="font-bold">{formatCurrency(totals.furtherTax, currency)}</span>
                </div>
              )}
              {totals.fed > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted font-bold uppercase tracking-widest text-[10px] self-center">FED Payable</span>
                  <span className="font-bold">{formatCurrency(totals.fed, currency)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-border flex justify-between items-baseline">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Grand Total</span>
                <span className="text-2xl font-black text-primary tracking-tighter">
                  {formatCurrency(totals.total, currency)}
                </span>
              </div>

              <div className="pt-6 space-y-3">
                 <div className="p-3 rounded-xl bg-surface border border-border flex gap-3">
                   <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                   <p className="text-[10px] font-medium text-text-muted leading-relaxed">
                     All calculations are based on regulatory standards. Ensure the <strong>HS Code</strong> and <strong>Buyer NTN</strong> are accurate for valid tax reporting.
                   </p>
                 </div>
                 
                 <Button className="w-full h-12 text-md font-black" onClick={handleSubmit} isLoading={saving}>
                    {isEditing ? "Save Changes" : "Generate Document"}
                  </Button>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <label className="block text-[10px] font-black uppercase text-text-muted tracking-widest mb-2">Internal Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal remarks or terms here..."
              className="w-full bg-surface border border-border rounded-xl p-3 text-sm min-h-[100px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
