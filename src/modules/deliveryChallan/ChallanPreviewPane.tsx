import { Trash2 } from "lucide-react";
import type { Product } from "../inventory/api";
import type { Customer } from "../customers/api";

export type ChallanCustomField = {
  id: string;
  label: string;
  value: string;
};

export type ChallanPreviewItem = {
  product_id: number;
  product: Product;
  quantity: number;
};

interface ChallanPreviewPaneProps {
  customer: Customer | null;
  items: ChallanPreviewItem[];
  customFields: ChallanCustomField[];
  companyLogo?: string | null;
  dcNumber?: string; // shown once created
  date?: string;
  onRemoveItem?: (productId: number) => void;
  onUpdateCustomField?: (id: string, value: string) => void;
  onRemoveCustomField?: (id: string) => void;
  readonly?: boolean; // true for saved challan view
  version?: string;
}

/** Minimum number of empty rows to always render in the grid */
const MIN_ROWS = 8;

export function ChallanPreviewPane({
  customer,
  items,
  customFields,
  companyLogo,
  dcNumber,
  date,
  onRemoveItem,
  onUpdateCustomField,
  onRemoveCustomField,
  readonly = false,
  version = "0.0.5",
}: ChallanPreviewPaneProps) {
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const displayDate = date
    ? new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });

  // Pad with empty rows to maintain grid structure
  const emptyRowCount = Math.max(0, MIN_ROWS - items.length);

  return (
    <div
      id="challan-preview-pane"
      className="bg-white text-gray-900 font-sans shadow-2xl rounded-xl overflow-hidden border border-gray-200"
      style={{ fontFamily: "'Arial', 'Helvetica Neue', sans-serif" }}
    >
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {companyLogo && (
            <img
              src={companyLogo}
              alt="Company Logo"
              className="h-14 w-14 object-contain rounded-lg bg-white p-1"
            />
          )}
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">
              Delivery Challan
            </h1>
            <p className="text-slate-300 text-xs mt-0.5 font-medium tracking-wider">
              GOODS DISPATCH DOCUMENT
            </p>
          </div>
        </div>
        <div className="text-right">
          {dcNumber && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
              <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">DC Number</p>
              <p className="text-lg font-black text-white tracking-tight">{dcNumber}</p>
            </div>
          )}
          {!dcNumber && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 border-dashed">
              <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">DC Number</p>
              <p className="text-sm text-slate-400 italic">Auto-assigned</p>
            </div>
          )}
        </div>
      </div>

      {/* ── META GRID ──────────────────────────────────────────── */}
      <div className="px-8 py-5 grid grid-cols-2 gap-x-8 gap-y-3 border-b border-gray-200 bg-gray-50">
        {/* Left col — customer + date */}
        <div className="space-y-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Bill To / Deliver To</p>
            {customer ? (
              <div>
                <p className="font-bold text-gray-900 text-sm">{customer.name}</p>
                {customer.address && (
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">{customer.address}</p>
                )}
                {customer.phone && (
                  <p className="text-xs text-gray-500 mt-0.5">Tel: {customer.phone}</p>
                )}
                {customer.tax_registration_number && (
                  <p className="text-xs text-gray-500 mt-0.5">NTN: {customer.tax_registration_number}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">— Customer not selected —</p>
            )}
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Date</p>
            <p className="text-sm font-semibold text-gray-800">{displayDate}</p>
          </div>
        </div>

        {/* Right col — custom fields */}
        <div className="space-y-2">
          {customFields.length > 0 ? (
            customFields.map((field) => (
              <div key={field.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                    {field.label}
                  </p>
                  {readonly ? (
                    <p className="text-sm font-semibold text-gray-800">{field.value || "—"}</p>
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => onUpdateCustomField?.(field.id, e.target.value)}
                      placeholder={`Enter ${field.label}...`}
                      className="w-full border-b border-dashed border-gray-300 bg-transparent text-sm font-semibold text-gray-800 outline-none focus:border-slate-600 pb-0.5 placeholder:text-gray-300 placeholder:font-normal"
                    />
                  )}
                </div>
                {!readonly && (
                  <button
                    onClick={() => onRemoveCustomField?.(field.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors mt-3"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-gray-300 italic text-center">
                {readonly ? "No custom fields" : "Add custom fields (PO #, Order #, etc.) using the button above"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── LINE ITEMS GRID ────────────────────────────────────── */}
      <div className="px-8 py-4">
        <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "55%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-left border border-slate-700">
                #
              </th>
              <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-left border border-slate-700">
                Product / Description
              </th>
              <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-left border border-slate-700">
                SKU / Code
              </th>
              <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-center border border-slate-700">
                Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Actual items */}
            {items.map((item, idx) => (
              <tr
                key={item.product_id}
                className={`group ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50/40 transition-colors`}
              >
                <td className="py-2.5 px-3 text-gray-500 text-xs font-medium border border-gray-200 align-middle">
                  {idx + 1}
                </td>
                <td className="py-2.5 px-3 border border-gray-200 align-middle">
                  <span className="font-semibold text-gray-900 text-xs">{item.product.name}</span>
                </td>
                <td className="py-2.5 px-3 border border-gray-200 align-middle">
                  <span className="font-mono text-xs text-gray-500">{item.product.sku}</span>
                </td>
                <td className="py-2.5 px-3 border border-gray-200 text-center align-middle">
                  <span className="font-bold text-gray-900 text-sm">{item.quantity}</span>
                </td>
              </tr>
            ))}

            {/* Empty filler rows */}
            {Array.from({ length: emptyRowCount }).map((_, i) => (
              <tr key={`empty-${i}`} className={`${(items.length + i) % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <td className="py-2.5 px-3 border border-gray-200 text-gray-300 text-xs">{items.length + i + 1}</td>
                <td className="py-2.5 px-3 border border-gray-200 text-gray-200 text-xs">—</td>
                <td className="py-2.5 px-3 border border-gray-200 text-gray-200 text-xs">—</td>
                <td className="py-2.5 px-3 border border-gray-200"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Remove buttons overlay — only in edit mode */}
        {!readonly && items.length > 0 && (
          <div className="mt-1 space-y-px">
            {/* We overlay remove buttons aligned to the right of the table */}
            <p className="text-[10px] text-gray-400 text-right mt-1">
              Click <span className="text-red-400">✕</span> to remove a line item
            </p>
            {items.map((item, idx) => (
              <div key={item.product_id} className="flex justify-end">
                <button
                  onClick={() => onRemoveItem?.(item.product_id)}
                  title="Remove item"
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                  style={{ marginTop: idx === 0 ? "-2.3rem" : "-1.9rem", marginRight: "0" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SUMMARY BAR ────────────────────────────────────────── */}
      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-3 col-span-2 flex items-center justify-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            Total Quantity Dispatched
          </span>
        </div>
        <div className="bg-slate-700 text-white px-5 py-3 flex items-center justify-center">
          <span className="text-xl font-black">{totalQty}</span>
          <span className="text-xs text-slate-300 ml-1.5 mt-0.5">units</span>
        </div>
      </div>

      {/* ── SIGNATURE SECTION ──────────────────────────────────── */}
      <div className="mx-8 mb-6 grid grid-cols-2 gap-8">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Dispatched By</p>
          <div className="h-16 border-b-2 border-gray-300 border-dashed flex items-end pb-1">
            <span className="text-xs text-gray-300 italic">Authorized Signature</span>
          </div>
          <p className="text-[9px] text-gray-400 mt-1.5">Name &amp; Stamp</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Received By</p>
          <div className="h-16 border-b-2 border-gray-300 border-dashed flex items-end pb-1">
            <span className="text-xs text-gray-300 italic">Receiver Signature</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-1.5">
            <div>
              <div className="h-5 border-b border-gray-200 border-dashed"></div>
              <p className="text-[9px] text-gray-400 mt-1">Name</p>
            </div>
            <div>
              <div className="h-5 border-b border-gray-200 border-dashed"></div>
              <p className="text-[9px] text-gray-400 mt-1">Date</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <div className="bg-gray-50 border-t border-gray-200 px-8 py-3 flex items-center justify-between">
        <p className="text-[9px] text-gray-300 uppercase tracking-widest">
          This is a computer-generated document
        </p>
        <p className="text-[9px] text-gray-400 font-bold tracking-wider">
          Teebot Flow · v{version}
        </p>
      </div>
    </div>
  );
}
