import { jsPDF } from "jspdf";
import { invoke, openPath, isTauri } from "../../lib/api";
import type { DeliveryChallan } from "../deliveryChallan/api";
import { useAuthStore } from "../../store/authStore";
import challanTemplate from "./html/index.html?raw";
import quotationTemplate from "./html/quotation.html?raw";
import invoiceTemplate from "./html/invoice.html?raw";
import type { Quotation } from "../quotations/api";
import type { Invoice } from "../invoices/api";
import { getCompanyProfile } from "../companyProfile/api";

export type ChallanCustomField = {
  id: string;
  label: string;
  value: string;
};

const APP_VERSION = "0.0.5";
const MIN_ROWS = 8;

function toBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Builds the shared print-ready HTML document string */
function buildChallanHtml(
  challan: DeliveryChallan,
  companyLogo: string | null,
  customFields: ChallanCustomField[] = []
): string {
  const displayDate = new Date(challan.created_at).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const totalQty = challan.items.reduce((s, i) => s + i.quantity, 0);
  const emptyRowCount = Math.max(0, MIN_ROWS - challan.items.length);

  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" style="height:52px;width:52px;object-fit:contain;border-radius:6px;background:#fff;padding:3px;margin-right:12px;" />`
    : "";

  const itemRows = challan.items
    .map(
      (item, idx) => `
      <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"};">
        <td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:11px;color:#6b7280;">${idx + 1}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:11px;font-weight:600;color:#111827;">${item.product_name}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:11px;font-family:monospace;color:#6b7280;">${item.product_sku}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:12px;font-weight:700;color:#111827;text-align:center;">${item.quantity}</td>
      </tr>`
    )
    .join("");

  const emptyRows = Array.from({ length: emptyRowCount })
    .map(
      (_, i) => `
      <tr style="background:${(challan.items.length + i) % 2 === 0 ? "#fff" : "#f9fafb"};">
        <td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:11px;color:#d1d5db;">${challan.items.length + i + 1}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:11px;color:#e5e7eb;">—</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:11px;color:#e5e7eb;">—</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;"></td>
      </tr>`
    )
    .join("");

  const customFieldsHtml =
    customFields.length > 0
      ? customFields
        .map(
          (f) => `
        <div style="margin-bottom:12px;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:4px;">${f.label}</div>
          <div style="font-size:14px;font-weight:600;color:#111827;">${f.value || "—"}</div>
        </div>`
        )
        .join("")
      : ``;

  return challanTemplate
    .replace("{{LOGO_HTML}}", logoHtml)
    .replace(/{{DC_NUMBER}}/g, challan.dc_number)
    .replace("{{CUSTOMER_NAME}}", challan.customer_name)
    .replace("{{DATE}}", displayDate)
    .replace("{{CUSTOM_FIELDS}}", customFieldsHtml)
    .replace("{{ITEM_ROWS}}", itemRows)
    .replace("{{EMPTY_ROWS}}", emptyRows)
    .replace("{{TOTAL_QTY}}", String(totalQty))
    .replace("{{APP_VERSION}}", APP_VERSION);
}

function buildQuotationHtml(
  quotation: Quotation,
  companyLogo: string | null,
  company: any // CompanyProfile
): string {
  const displayDate = new Date(quotation.created_at).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const validUntil = quotation.valid_until
    ? new Date(quotation.valid_until).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : new Date(new Date(quotation.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" style="height:52px;width:52px;object-fit:contain;border-radius:6px;background:#fff;padding:3px;margin-right:12px;" />`
    : "";

  const itemRows = quotation.items
    .map(
      (item, idx) => `
      <tr style="background:${idx % 2 === 0 ? "#fff" : "#f8fafc"};">
        <td class="col-description" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;">
          <div style="font-weight:700;color:#0f172a;">${item.product_name}</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">${item.description}</div>
        </td>
        <td class="col-qty" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center;font-weight:700;">${item.quantity}</td>
        <td class="col-rate" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;color:#64748b;">${company.currency} ${item.rate.toLocaleString()}</td>
        <td class="col-amount" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;font-weight:700;color:#0f172a;">${company.currency} ${item.amount.toLocaleString()}</td>
      </tr>`
    )
    .join("");

  const emptyRowCount = Math.max(0, 5 - quotation.items.length);
  const emptyRows = Array.from({ length: emptyRowCount })
    .map(
      () => `
      <tr>
        <td class="col-description" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;">&nbsp;</td>
        <td class="col-qty" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;"></td>
        <td class="col-rate" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;"></td>
        <td class="col-amount" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;"></td>
      </tr>`
    )
    .join("");

  const notesHtml = quotation.notes 
    ? `<div class="notes"><h4>Notes & Terms</h4>${quotation.notes}</div>` 
    : "";

  const subtotal = quotation.total_amount;
  const total = quotation.total_amount;

  return quotationTemplate
    .replace("{{LOGO_HTML}}", logoHtml)
    .replace(/{{QUOTE_NUMBER}}/g, quotation.quote_number)
    .replace(/{{COMPANY_NAME}}/g, company.company_name || "Company Name")
    .replace("{{COMPANY_ADDRESS}}", company.address || "")
    .replace("{{COMPANY_CITY}}", company.city || "")
    .replace("{{COMPANY_STATE}}", company.state || "")
    .replace("{{COMPANY_POSTAL}}", company.postal_code || "")
    .replace("{{COMPANY_PHONE}}", company.phone || "")
    .replace("{{COMPANY_EMAIL}}", company.email || "")
    .replace("{{COMPANY_WEBSITE}}", company.website || "")
    .replace("{{CUSTOMER_NAME}}", quotation.customer_name)
    .replace("{{CUSTOMER_ADDRESS}}", quotation.customer_address || "No address provided")
    .replace("{{CUSTOMER_PHONE}}", quotation.customer_phone || "No phone provided")
    .replace("{{DATE}}", displayDate)
    .replace("{{VALID_UNTIL}}", validUntil)
    .replace("{{ITEM_ROWS}}", itemRows)

    .replace("{{EMPTY_ROWS}}", emptyRows)
    .replace(/{{CURRENCY}}/g, company.currency || "PKR")
    .replace("{{SUBTOTAL}}", subtotal.toLocaleString())
    .replace("{{TOTAL}}", total.toLocaleString())
    .replace("{{NOTES_HTML}}", notesHtml)
    .replace("{{APP_VERSION}}", APP_VERSION);
}

function buildInvoiceHtml(
  invoice: Invoice,
  companyLogo: string | null,
  company: any
): string {
  const displayDate = invoice.invoice_date || new Date(invoice.created_at).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" style="height:48px;width:auto;object-fit:contain;" />`
    : "";

  const itemRows = invoice.items
    .map(
      (item) => `
      <tr>
        <td>
          <div style="font-weight:700;color:#0f172a;">${item.description}</div>
          ${item.hs_code ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">HS: ${item.hs_code}</div>` : ""}
        </td>
        <td style="text-align:center;font-weight:600;">${item.quantity} ${item.uom || ""}</td>
        <td style="text-align:right;color:#64748b;">${company.currency} ${item.unit_price.toLocaleString()}</td>
        <td style="text-align:right;font-weight:700;color:#0f172a;">${company.currency} ${item.amount.toLocaleString()}</td>
      </tr>`
    )
    .join("");

  const notesSection = invoice.notes
    ? `<div class="notes"><h5>Notes</h5>${invoice.notes}</div>`
    : "";

  return invoiceTemplate
    .replace("{{LOGO_HTML}}", logoHtml)
    .replace(/{{INVOICE_NUMBER}}/g, invoice.invoice_number)
    .replace("{{INVOICE_TYPE}}", invoice.invoice_type || "Tax Invoice")
    .replace("{{COMPANY_NAME}}", company.company_name || "Company Name")
    .replace("{{COMPANY_ADDRESS}}", company.address || "")
    .replace("{{COMPANY_CITY}}", company.city || "")
    .replace("{{COMPANY_STATE}}", company.state || "")
    .replace("{{COMPANY_POSTAL}}", company.postal_code || "")
    .replace("{{COMPANY_PHONE}}", company.phone || "")
    .replace("{{COMPANY_NTN}}", company.tax_registration_number || "")
    .replace("{{CUSTOMER_NAME}}", invoice.customer_name)
    .replace("{{CUSTOMER_ADDRESS}}", "") // Optional: customer address fetch if needed
    .replace("{{CUSTOMER_PHONE}}", "")
    .replace("{{BUYER_NTN}}", invoice.buyer_ntn_cnic || "—")
    .replace("{{DATE}}", displayDate)
    .replace("{{REF_NUMBER}}", invoice.invoice_ref_no || "—")
    .replace("{{DC_NUMBER}}", invoice.dc_number || "—")
    .replace("{{ITEM_ROWS}}", itemRows)
    .replace("{{NOTES_SECTION}}", notesSection)
    .replace(/{{CURRENCY}}/g, company.currency || "PKR")
    .replace("{{SUBTOTAL}}", invoice.total_amount.toLocaleString())
    .replace("{{TOTAL}}", invoice.total_amount.toLocaleString())
    .replace("{{APP_VERSION}}", APP_VERSION);
}


export async function downloadDeliveryChallanPdf(
  challan: DeliveryChallan,
  customFields: ChallanCustomField[] = []
) {
  const companyLogo = useAuthStore.getState().companyLogo;

  // Use jsPDF html rendering via a hidden iframe approach
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // ── Header band ──────────────────────────────────────────────
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 90, "F");

  // Logo
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", margin, 15, 60, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.text("DELIVERY CHALLAN", margin + 75, 45);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(148, 163, 184);
      doc.text("GOODS DISPATCH DOCUMENT", margin + 75, 65);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.text("DELIVERY CHALLAN", margin, 45);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text("DELIVERY CHALLAN", margin, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(148, 163, 184);
    doc.text("GOODS DISPATCH DOCUMENT", margin, 65);
  }

  // DC Number box (top-right)
  doc.setFillColor(255, 255, 255, 0.1);
  doc.roundedRect(pageWidth - margin - 150, 15, 150, 60, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text("DC NUMBER", pageWidth - margin - 75, 35, { align: "center" });
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(challan.dc_number, pageWidth - margin - 75, 60, { align: "center" });

  // ── Meta section ─────────────────────────────────────────────
  let y = 110;
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 90, pageWidth, 100, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text("BILL TO / DELIVER TO", margin, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(challan.customer_name, margin, y);
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text("DATE", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(55, 65, 81);

  const displayDate = new Date(challan.created_at).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(displayDate, margin, y);

  // Custom fields on the right column
  const rightCol = pageWidth / 2 + 10;
  let cfY = 110;
  for (const f of customFields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text(f.label.toUpperCase(), rightCol, cfY);
    cfY += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(f.value || "—", rightCol, cfY);
    cfY += 24;
  }

  // ── Table ────────────────────────────────────────────────────
  y = 210;
  const colWidths = [40, 245, 130, 100]; // Total 515
  const tableRight = pageWidth - margin;
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];
  const rowH = 26;

  // Header row
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, tableRight - margin, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const headers = ["#", "PRODUCT / DESCRIPTION", "SKU / CODE", "QTY"];
  headers.forEach((h, i) => {
    if (i === 3) {
      doc.text(h, colX[i] + colWidths[i] / 2, y + 17, { align: "center" });
    } else {
      doc.text(h, colX[i] + 10, y + 17);
    }
  });
  y += rowH;

  // Item rows + empty rows
  const allItems: Array<{ num: number; name: string; sku: string; qty: string | number; isEmpty: boolean }> = [
    ...challan.items.map((item, idx) => ({
      num: idx + 1,
      name: item.product_name,
      sku: item.product_sku,
      qty: item.quantity,
      isEmpty: false,
    })),
    ...Array.from({ length: Math.max(0, MIN_ROWS - challan.items.length) }).map((_, i) => ({
      num: challan.items.length + i + 1,
      name: "—",
      sku: "—",
      qty: "",
      isEmpty: true,
    })),
  ];

  for (let idx = 0; idx < allItems.length; idx++) {
    const row = allItems[idx];
    if (y > pageHeight - 140) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251);
    doc.rect(margin, y, tableRight - margin, rowH, "F");

    // Cell borders
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, tableRight - margin, rowH, "S");
    let cx = margin;
    for (const w of colWidths) {
      doc.rect(cx, y, w, rowH, "S");
      cx += w;
    }

    if (row.isEmpty) {
      doc.setTextColor(209, 213, 219);
    } else {
      doc.setTextColor(17, 24, 39);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(String(row.num), colX[0] + 10, y + 18);
    doc.text(row.name, colX[1] + 10, y + 18);
    doc.text(row.sku, colX[2] + 10, y + 18);
    if (row.qty !== "") {
      doc.setFont("helvetica", "bold");
      doc.text(String(row.qty), colX[3] + colWidths[3] / 2, y + 18, { align: "center" });
    }
    y += rowH;
  }

  // ── Summary bar ──────────────────────────────────────────────
  y += 16;
  const totalQty = challan.items.reduce((s, i) => s + i.quantity, 0);
  const summaryW = tableRight - margin;
  const labelW = summaryW - 120;

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, y, labelW, 40, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text("TOTAL QUANTITY DISPATCHED", margin + labelW - 16, y + 24, { align: "right" });

  doc.setFillColor(51, 65, 85);
  doc.roundedRect(margin + labelW + 6, y, 114, 40, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(String(totalQty), margin + labelW + 63, y + 28, { align: "center" });

  // ── Signature section ────────────────────────────────────────
  y += 64;
  const halfW = (tableRight - margin) / 2 - 20;

  // Dispatched By
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text("DISPATCHED BY", margin, y);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(1);
  doc.setLineDashPattern([4, 4], 0);
  doc.line(margin, y + 60, margin + halfW, y + 60);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(209, 213, 219);
  doc.text("Name & Stamp", margin, y + 74);

  // Received By
  const rx = margin + halfW + 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text("RECEIVED BY", rx, y);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(1);
  doc.setLineDashPattern([4, 4], 0);
  doc.line(rx, y + 60, rx + halfW, y + 60);
  doc.setLineDashPattern([], 0);

  const nameLineW = halfW / 2 - 10;
  doc.line(rx, y + 90, rx + nameLineW, y + 90);
  doc.line(rx + nameLineW + 20, y + 90, rx + halfW, y + 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text("Name", rx, y + 104);
  doc.text("Date", rx + nameLineW + 20, y + 104);

  // ── Footer ───────────────────────────────────────────────────
  doc.setFillColor(249, 250, 251);
  doc.rect(0, pageHeight - 40, pageWidth, 40, "F");
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(1);
  doc.line(0, pageHeight - 40, pageWidth, pageHeight - 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(209, 213, 219);
  doc.text("This is a computer-generated document", margin, pageHeight - 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(156, 163, 175);
  doc.text(`Teebot Flow · v${APP_VERSION}`, pageWidth - margin, pageHeight - 16, { align: "right" });

  // ── Save ─────────────────────────────────────────────────────
  const fileName = `${challan.dc_number}.pdf`;
  const arrayBuffer = doc.output("arraybuffer");
  const base64Data = toBase64(arrayBuffer);

  const savedPath = await invoke<string>("save_delivery_challan_pdf", {
    filename: fileName,
    base64Data,
  });

  try { await openPath(savedPath); } catch { /* ignore */ }
  return savedPath;
}

export function printDeliveryChallan(
  challan: DeliveryChallan,
  customFields: ChallanCustomField[] = []
) {
  const companyLogo = useAuthStore.getState().companyLogo;
  const html = buildChallanHtml(challan, companyLogo, customFields);

  // Use a hidden iframe for printing to prevent style leakage
  let iframe = document.getElementById("print-iframe") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "print-iframe";
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for resources (like logo) to load
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("[Print] Error:", e);
    }
  }, 300);
}

// ── Live Preview System ──────────────────────────────────────────
// Keeps a reference to the open preview window so we can update it reactively.
let _previewPopup: Window | null = null;
let _previewLabel: string | null = null;
const PREVIEW_FILE = "challan-live-preview.html";

/** Build HTML and export for reuse */
export function buildPreviewHtml(
  challan: DeliveryChallan,
  customFields: ChallanCustomField[] = []
): string {
  const companyLogo = useAuthStore.getState().companyLogo;
  return buildChallanHtml(challan, companyLogo, customFields);
}

/** Opens (or re-focuses) the live preview window */
export async function previewDeliveryChallan(
  challan: DeliveryChallan,
  customFields: ChallanCustomField[] = []
) {
  const html = buildPreviewHtml(challan, customFields);

  if (isTauri()) {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { writeTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      const { convertFileSrc } = await import("@tauri-apps/api/core");
      const { tempDir } = await import("@tauri-apps/api/path");

      // Write HTML to a stable temp file (reused for updates)
      await writeTextFile(PREVIEW_FILE, html, { baseDir: BaseDirectory.Temp });

      // Check if previous preview window is still alive
      if (_previewLabel) {
        const existing = await WebviewWindow.getByLabel(_previewLabel);
        if (existing) {
          // Reload the content in the existing window
          const tmpDir = await tempDir();
          const assetUrl = convertFileSrc(`${tmpDir}${PREVIEW_FILE}`);
          await (existing as any).eval(`window.location.replace("${assetUrl}")`);
          await (existing as any).setFocus?.();
          return;
        }
      }

      // Get the asset URL and open a new window
      const tmpDir = await tempDir();
      const filePath = `${tmpDir}${PREVIEW_FILE}`;
      const assetUrl = convertFileSrc(filePath);

      const label = `challan-preview`;
      _previewLabel = label;

      const webview = new WebviewWindow(label, {
        url: assetUrl,
        title: `Challan Preview — ${challan.dc_number}`,
        width: 900,
        height: 1000,
        resizable: true,
        center: true,
      });

      webview.once("tauri://error", (e) => {
        console.error("[Tauri Preview] Window error:", e);
        _previewLabel = null;
      });

      webview.once("tauri://destroyed", () => {
        _previewLabel = null;
      });
    } catch (err) {
      console.error("[Tauri Preview] Failed:", err);
      _previewLabel = null;
    }
  } else {
    // Web mode: reuse the same popup window
    if (_previewPopup && !_previewPopup.closed) {
      _previewPopup.document.open();
      _previewPopup.document.write(html);
      _previewPopup.document.close();
      _previewPopup.focus();
    } else {
      _previewPopup = window.open("", "challan-live-preview", "width=900,height=1100,resizable=yes,scrollbars=yes");
      if (!_previewPopup) {
        console.error("[Preview] Popup was blocked.");
        return;
      }
      _previewPopup.document.open();
      _previewPopup.document.write(html);
      _previewPopup.document.close();
      _previewPopup.focus();
    }
  }
}

/** Updates the already-open preview window without re-focusing it. Silently no-ops if no preview is open. */
export async function updateLivePreview(
  challan: DeliveryChallan,
  customFields: ChallanCustomField[] = []
) {
  const html = buildPreviewHtml(challan, customFields);

  if (isTauri()) {
    if (!_previewLabel) return;
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");

      const existing = await WebviewWindow.getByLabel(_previewLabel);
      if (!existing) { _previewLabel = null; return; }

      // Inject HTML directly via document.write to bypass caching
      const escaped = html
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');
      await (existing as any).eval(`
        document.open();
        document.write(\`${escaped}\`);
        document.close();
      `);
    } catch {
      // Preview window was probably closed
      _previewLabel = null;
    }
  } else {
    if (!_previewPopup || _previewPopup.closed) { _previewPopup = null; return; }
    _previewPopup.document.open();
    _previewPopup.document.write(html);
    _previewPopup.document.close();
  }
}

export async function printQuotation(quotation: Quotation) {
  const companyLogo = useAuthStore.getState().companyLogo;
  const companyId = useAuthStore.getState().companyId;
  if (!companyId) throw new Error("Company ID not found");
  
  const company = await getCompanyProfile(companyId);
  const html = buildQuotationHtml(quotation, companyLogo, company);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  }
}

export async function downloadQuotationPdf(quotation: Quotation): Promise<string> {
  const companyLogo = useAuthStore.getState().companyLogo;
  const companyId = useAuthStore.getState().companyId;
  const currency = useAuthStore.getState().currency || "PKR";
  if (!companyId) throw new Error("Company ID not found");

  const company = await getCompanyProfile(companyId);

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // ── Header Band ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 100, "F");

  // Logo
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", margin, 20, 60, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("QUOTATION", margin + 75, 55);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("QUOTATION", margin, 55);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("QUOTATION", margin, 55);
  }

  // Quote info box (top-right)
  doc.setFillColor(255, 255, 255, 0.1);
  doc.roundedRect(pageWidth - margin - 160, 20, 160, 60, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("QUOTE NUMBER", pageWidth - margin - 80, 40, { align: "center" });
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(quotation.quote_number, pageWidth - margin - 80, 65, { align: "center" });

  // ── Info Grid ─────────────────────────────────────────────
  let y = 130;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.setFont("helvetica", "bold");
  doc.text("FROM", margin, y);
  doc.text("BILL TO", pageWidth / 2 + 20, y);

  y += 20;
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(company.company_name || "Company Name", margin, y);
  doc.text(quotation.customer_name, pageWidth / 2 + 20, y);

  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105); // Slate 600
  
  // Company address lines
  const companyAddr = [
    company.address,
    `${company.city}, ${company.state} ${company.postal_code}`,
    `Phone: ${company.phone}`,
    `Email: ${company.email}`
  ].filter(Boolean);
  
  let addrY = y;
  companyAddr.forEach(line => {
    doc.text(line || "", margin, addrY);
    addrY += 14;
  });

  // Customer address lines
  const customerAddr = [
    quotation.customer_address,
    `Phone: ${quotation.customer_phone}`
  ].filter(Boolean);
  
  addrY = y;
  customerAddr.forEach(line => {
    doc.text(line || "", pageWidth / 2 + 20, addrY);
    addrY += 14;
  });

  y = Math.max(addrY, y + 60);

  // Quote metadata
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 40, 4, 4, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("DATE:", margin + 15, y + 25);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(new Date(quotation.created_at).toLocaleDateString(), margin + 55, y + 25);
  
  const validUntilStr = quotation.valid_until 
    ? new Date(quotation.valid_until).toLocaleDateString()
    : new Date(new Date(quotation.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();


  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("VALID UNTIL:", margin + 180, y + 25);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(validUntilStr, margin + 255, y + 25);


  // ── Table ────────────────────────────────────────────────────
  y += 65;
  const colWidths = [260, 60, 95, 100]; // Total 515
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];
  const rowH = 30;

  // Header row
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageWidth - 2 * margin, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", colX[0] + 10, y + 19);
  doc.text("QTY", colX[1] + colWidths[1] / 2, y + 19, { align: "center" });
  doc.text("RATE", colX[2] + colWidths[2] - 10, y + 19, { align: "right" });
  doc.text("AMOUNT", colX[3] + colWidths[3] - 10, y + 19, { align: "right" });
  
  y += rowH;

  // Items
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  quotation.items.forEach((item, idx) => {
    if (y > pageHeight - 150) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251);
    doc.rect(margin, y, pageWidth - 2 * margin, rowH, "F");
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowH, pageWidth - margin, y + rowH);

    doc.setFont("helvetica", "bold");
    doc.text(item.product_name, colX[0] + 10, y + 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(String(item.quantity), colX[1] + colWidths[1] / 2, y + 18, { align: "center" });
    doc.text(`${currency} ${item.rate.toLocaleString()}`, colX[2] + colWidths[2] - 10, y + 18, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.text(`${currency} ${item.amount.toLocaleString()}`, colX[3] + colWidths[3] - 10, y + 18, { align: "right" });
    
    y += rowH;
  });

  // ── Totals ───────────────────────────────────────────────────
  y += 20;
  const totalW = 200;
  const totalX = pageWidth - margin - totalW;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", totalX, y);
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency} ${quotation.total_amount.toLocaleString()}`, pageWidth - margin, y, { align: "right" });

  y += 25;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(totalX, y, pageWidth - margin, y);
  
  y += 20;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Total", totalX, y);
  doc.text(`${currency} ${quotation.total_amount.toLocaleString()}`, pageWidth - margin, y, { align: "right" });

  // Notes
  if (quotation.notes) {
    y += 50;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES & TERMS", margin, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(quotation.notes, pageWidth - 2 * margin);
    doc.text(splitNotes, margin, y);
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated by Teebot Flow v${APP_VERSION}`, margin, pageHeight - 30);
  doc.text("Page 1 of 1", pageWidth - margin, pageHeight - 30, { align: "right" });

  // ── Save ─────────────────────────────────────────────────────
  const fileName = `Quotation-${quotation.quote_number}.pdf`;
  const arrayBuffer = doc.output("arraybuffer");
  const base64Data = toBase64(arrayBuffer);

  const savedPath = await invoke<string>("save_delivery_challan_pdf", {
    filename: fileName,
    base64Data,
  });

  try { await openPath(savedPath); } catch { /* ignore */ }
  return savedPath;
}

export function buildQuotationPreviewHtml(quotation: Quotation, company: any): string {
  const companyLogo = useAuthStore.getState().companyLogo;
  return buildQuotationHtml(quotation, companyLogo, company);
}

export async function downloadInvoicePdf(invoice: Invoice) {
  const companyLogo = useAuthStore.getState().companyLogo;
  const companyId = useAuthStore.getState().companyId;
  const currency = useAuthStore.getState().currency || "PKR";
  if (!companyId) throw new Error("Company ID not found");
  await getCompanyProfile(companyId);


  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // ── Premium Header ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 100, "F");

  if (companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", margin, 20, 60, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("INVOICE", margin + 75, 55);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("INVOICE", margin, 55);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", margin, 55);
  }

  doc.setFillColor(255, 255, 255, 0.1);
  doc.roundedRect(pageWidth - margin - 160, 20, 160, 60, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text("INVOICE NUMBER", pageWidth - margin - 80, 40, { align: "center" });
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(invoice.invoice_number, pageWidth - margin - 80, 65, { align: "center" });

  // ── Table ────────────────────────────────────────────────────
  let y = 140;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", margin, y);
  doc.text("DETAILS:", pageWidth - margin - 150, y);
  
  y += 20;
  doc.setFontSize(14);
  doc.text(invoice.customer_name, margin, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${invoice.invoice_date || new Date(invoice.created_at).toLocaleDateString()}`, pageWidth - margin - 150, y);
  
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`NTN/CNIC: ${invoice.buyer_ntn_cnic || "—"}`, margin, y);
  doc.text(`Ref No: ${invoice.invoice_ref_no || "—"}`, pageWidth - margin - 150, y);

  y += 60;
  const colWidths = [260, 60, 95, 100];
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];
  const rowH = 30;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageWidth - 2 * margin, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", colX[0] + 10, y + 19);
  doc.text("QTY", colX[1] + colWidths[1] / 2, y + 19, { align: "center" });
  doc.text("RATE", colX[2] + colWidths[2] - 10, y + 19, { align: "right" });
  doc.text("AMOUNT", colX[3] + colWidths[3] - 10, y + 19, { align: "right" });
  
  y += rowH;
  doc.setTextColor(15, 23, 42);
  invoice.items.forEach((item, idx) => {
    if (y > pageHeight - 150) { doc.addPage(); y = margin; }
    doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251);
    doc.rect(margin, y, pageWidth - 2 * margin, rowH, "F");
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowH, pageWidth - margin, y + rowH);
    doc.setFont("helvetica", "bold");
    doc.text(item.description, colX[0] + 10, y + 18);
    doc.setFont("helvetica", "normal");
    doc.text(String(item.quantity), colX[1] + colWidths[1] / 2, y + 18, { align: "center" });
    doc.text(`${currency} ${item.unit_price.toLocaleString()}`, colX[2] + colWidths[2] - 10, y + 18, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`${currency} ${item.amount.toLocaleString()}`, colX[3] + colWidths[3] - 10, y + 18, { align: "right" });
    y += rowH;
  });

  y += 30;
  doc.setFontSize(14);
  doc.text("Grand Total", pageWidth - margin - 200, y);
  doc.text(`${currency} ${invoice.total_amount.toLocaleString()}`, pageWidth - margin, y, { align: "right" });

  const fileName = `Invoice-${invoice.invoice_number}.pdf`;
  const arrayBuffer = doc.output("arraybuffer");
  const base64Data = toBase64(arrayBuffer);
  const savedPath = await invoke<string>("save_delivery_challan_pdf", { filename: fileName, base64Data });
  try { await openPath(savedPath); } catch { }
  return savedPath;
}

export async function printInvoice(invoice: Invoice) {
  const companyLogo = useAuthStore.getState().companyLogo;
  const companyId = useAuthStore.getState().companyId;
  if (!companyId) throw new Error("Company ID not found");
  const company = await getCompanyProfile(companyId);
  const html = buildInvoiceHtml(invoice, companyLogo, company);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  }
}

