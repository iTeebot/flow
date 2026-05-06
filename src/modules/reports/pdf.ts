import { jsPDF } from "jspdf";
import { invoke, openPath, isTauri } from "../../lib/api";
import type { DeliveryChallan } from "../deliveryChallan/api";
import { useAuthStore } from "../../store/authStore";
import challanTemplate from "./html/index.html?raw";
import quotationTemplate from "./html/quotation.html?raw";
import type { Quotation } from "../quotations/api";
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

  const validUntil = new Date(new Date(quotation.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
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

export async function downloadQuotationPdf(quotation: Quotation) {
  const companyLogo = useAuthStore.getState().companyLogo;
  const companyId = useAuthStore.getState().companyId;
  if (!companyId) throw new Error("Company ID not found");

  const company = await getCompanyProfile(companyId);
  const html = buildQuotationHtml(quotation, companyLogo, company);

  const doc = new jsPDF("p", "pt", "a4");
  await doc.html(html, {
    callback: async (doc) => {
      const pdfBase64 = toBase64(doc.output("arraybuffer"));
      const filename = `Quotation-${quotation.quote_number}.pdf`;
      await invoke("save_delivery_challan_pdf", { filename, base64Data: pdfBase64 });
    },
    width: 595,
    windowWidth: 595,
  });
}

export function buildQuotationPreviewHtml(quotation: Quotation, company: any): string {
  const companyLogo = useAuthStore.getState().companyLogo;
  return buildQuotationHtml(quotation, companyLogo, company);
}

function buildInvoiceHtml(
  invoice: any,
  companyLogo: string | null,
  company: any
): string {
  const displayDate = new Date(invoice.created_at).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const validUntil = new Date(new Date(invoice.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" style="height:52px;width:52px;object-fit:contain;border-radius:6px;background:#fff;padding:3px;margin-right:12px;" />`
    : "";

  const itemRows = invoice.items
    .map(
      (item: any, idx: number) => `
      <tr style="background:${idx % 2 === 0 ? "#fff" : "#f8fafc"};">
        <td class="col-description" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;">
          <div style="font-weight:700;color:#0f172a;">${item.description}</div>
        </td>
        <td class="col-qty" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center;font-weight:700;">${item.quantity}</td>
        <td class="col-rate" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;color:#64748b;">${company.currency} ${item.rate.toLocaleString()}</td>
        <td class="col-amount" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;font-weight:700;color:#0f172a;">${company.currency} ${item.amount.toLocaleString()}</td>
      </tr>`
    )
    .join("");

  const emptyRowCount = Math.max(0, 5 - invoice.items.length);
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

  const notesHtml = invoice.notes 
    ? `<div class="notes"><h4>Notes & Terms</h4>${invoice.notes}</div>` 
    : "";

  const subtotal = invoice.total_amount;
  const total = invoice.total_amount;

  return quotationTemplate
    .replace("{{LOGO_HTML}}", logoHtml)
    .replace("QUOTATION", "TAX INVOICE")
    .replace("QUOTATION", "TAX INVOICE")
    .replace("Quotation Preview", "Invoice Preview")
    .replace(/{{QUOTE_NUMBER}}/g, invoice.invoice_number)
    .replace(/{{COMPANY_NAME}}/g, company.company_name || "Company Name")
    .replace("{{COMPANY_ADDRESS}}", company.address || "")
    .replace("{{COMPANY_CITY}}", company.city || "")
    .replace("{{COMPANY_STATE}}", company.state || "")
    .replace("{{COMPANY_POSTAL}}", company.postal_code || "")
    .replace("{{COMPANY_PHONE}}", company.phone || "")
    .replace("{{COMPANY_EMAIL}}", company.email || "")
    .replace("{{COMPANY_WEBSITE}}", company.website || "")
    .replace("{{CUSTOMER_NAME}}", invoice.customer_name)
    .replace("{{CUSTOMER_ADDRESS}}", "No address provided")
    .replace("{{CUSTOMER_PHONE}}", "No phone provided")
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

export async function printInvoice(invoice: any) {
  const companyLogo = useAuthStore.getState().companyLogo;
  const companyId = useAuthStore.getState().companyId;
  if (!companyId) throw new Error("Company ID not found");
  
  const company = await getCompanyProfile(companyId);
  const html = buildInvoiceHtml(invoice, companyLogo, company);

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

export async function downloadInvoicePdf(invoice: any): Promise<string> {
  const companyLogo = useAuthStore.getState().companyLogo;
  const companyId = useAuthStore.getState().companyId;
  if (!companyId) throw new Error("Company ID not found");

  const company = await getCompanyProfile(companyId);
  const html = buildInvoiceHtml(invoice, companyLogo, company);

  return new Promise((resolve, reject) => {
    const doc = new jsPDF("p", "pt", "a4");
    doc.html(html, {
      callback: async (doc) => {
        try {
          const pdfBase64 = toBase64(doc.output("arraybuffer"));
          const filename = `Invoice-${invoice.invoice_number}.pdf`;
          const savedPath = await invoke<string>("save_delivery_challan_pdf", { filename, base64Data: pdfBase64 });
          resolve(savedPath);
        } catch (err) {
          reject(err);
        }
      },
      width: 595,
      windowWidth: 595,
    }).catch(reject);
  });
}

export async function previewInvoice(invoice: any) {
  const companyLogo = useAuthStore.getState().companyLogo;
  const companyId = useAuthStore.getState().companyId;
  if (!companyId) throw new Error("Company ID not found");

  const company = await getCompanyProfile(companyId);
  const html = buildInvoiceHtml(invoice, companyLogo, company);

  if (isTauri()) {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { writeTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      const { convertFileSrc } = await import("@tauri-apps/api/core");
      const { tempDir } = await import("@tauri-apps/api/path");

      const previewFile = "invoice-live-preview.html";
      await writeTextFile(previewFile, html, { baseDir: BaseDirectory.Temp });

      if (_previewLabel) {
        const existing = await WebviewWindow.getByLabel(_previewLabel);
        if (existing) {
          const tmpDir = await tempDir();
          const assetUrl = convertFileSrc(`${tmpDir}${previewFile}`);
          await (existing as any).eval(`window.location.replace("${assetUrl}")`);
          await (existing as any).setFocus?.();
          return;
        }
      }

      const tmpDir = await tempDir();
      const filePath = `${tmpDir}${previewFile}`;
      const assetUrl = convertFileSrc(filePath);

      const label = `invoice-preview-${Date.now()}`;
      _previewLabel = label;

      const webview = new WebviewWindow(label, {
        url: assetUrl,
        title: `Invoice Preview — ${invoice.invoice_number}`,
        width: 900,
        height: 1000,
        resizable: true,
        center: true,
      });

      webview.once("tauri://error", () => { _previewLabel = null; });
      webview.once("tauri://destroyed", () => { _previewLabel = null; });
    } catch { _previewLabel = null; }
  } else {
    if (_previewPopup && !_previewPopup.closed) {
      _previewPopup.document.open();
      _previewPopup.document.write(html);
      _previewPopup.document.close();
      _previewPopup.focus();
    } else {
      _previewPopup = window.open("", "invoice-live-preview", "width=900,height=1100,resizable=yes,scrollbars=yes");
      if (_previewPopup) {
        _previewPopup.document.open();
        _previewPopup.document.write(html);
        _previewPopup.document.close();
        _previewPopup.focus();
      }
    }
  }
}


