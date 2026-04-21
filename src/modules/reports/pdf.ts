import { jsPDF } from "jspdf";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import type { DeliveryChallan } from "../deliveryChallan/api";

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

export async function downloadDeliveryChallanPdf(challan: DeliveryChallan) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Delivery Challan", margin, y);

  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`DC Number: ${challan.dc_number}`, margin, y);
  y += 16;
  doc.text(`Customer: ${challan.customer_name}`, margin, y);
  y += 16;
  doc.text(`Date: ${new Date(challan.created_at).toLocaleString()}`, margin, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.text("Items", margin, y);
  y += 16;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.text("Product", margin, y);
  doc.text("Qty", margin + 260, y);
  doc.text("Rate", margin + 330, y);
  doc.text("Amount", margin + 420, y);
  y += 12;
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  for (const item of challan.items) {
    if (y > 760) {
      doc.addPage();
      y = margin;
    }
    doc.text(item.product_name, margin, y);
    doc.text(String(item.quantity), margin + 260, y);
    doc.text(item.rate.toFixed(2), margin + 330, y);
    doc.text(item.amount.toFixed(2), margin + 420, y);
    y += 16;
  }

  y += 8;
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${challan.total_amount.toFixed(2)}`, margin + 330, y);

  const fileName = `${challan.dc_number}.pdf`;
  const arrayBuffer = doc.output("arraybuffer");
  const base64Data = toBase64(arrayBuffer);

  const savedPath = await invoke<string>("save_delivery_challan_pdf", {
    filename: fileName,
    base64Data,
  });

  // Best-effort preview: do not fail download if OS open action fails.
  try {
    await openPath(savedPath);
  } catch {
    // Ignore opener failures; file is still saved to disk.
  }

  return savedPath;
}

export function printDeliveryChallan(challan: DeliveryChallan) {
  const itemsRows = challan.items
    .map(
      (item) => `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.quantity}</td>
          <td>${item.rate.toFixed(2)}</td>
          <td>${item.amount.toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    throw new Error("Unable to open print view.");
  }

  iframeDoc.open();
  iframeDoc.write(`
      <html>
        <head>
          <title>${challan.dc_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            .header { margin-bottom: 20px; }
            h1 { margin: 0 0 8px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .total { margin-top: 16px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Delivery Challan</h1>
            <div><strong>DC Number:</strong> ${challan.dc_number}</div>
            <div><strong>Customer:</strong> ${challan.customer_name}</div>
            <div><strong>Date:</strong> ${new Date(challan.created_at).toLocaleString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div class="total">Total: ${challan.total_amount.toFixed(2)}</div>
        </body>
      </html>
    `);
  iframeDoc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 150);
}
