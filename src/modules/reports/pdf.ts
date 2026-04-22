import { jsPDF } from "jspdf";
console.log("PDF Module Loaded");
import { invoke, openPath } from "../../lib/api";
import type { DeliveryChallan } from "../deliveryChallan/api";
import { useAuthStore } from "../../store/authStore";

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

  // Company logo
  const companyLogo = useAuthStore.getState().companyLogo;
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", margin, y, 50, 50);
      // Title beside logo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Delivery Challan", margin + 60, y + 20);
      y += 56;
    } catch {
      // If image fails, fall back to text-only header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Delivery Challan", margin, y);
      y += 24;
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Delivery Challan", margin, y);
    y += 24;
  }

  y += 4;
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
  const companyLogo = useAuthStore.getState().companyLogo;
  challan.items
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

  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" style="height:50px;width:50px;object-fit:contain;margin-right:12px;" />`
    : "";

  console.log("[Print] Starting print process via main window overlay...");

  let printRoot = document.getElementById("print-root");
  if (!printRoot) {
    console.log("[Print] Creating #print-root element");
    printRoot = document.createElement("div");
    printRoot.id = "print-root";
    document.body.appendChild(printRoot);
  }

  const itemsHtml = challan.items
    .map(
      (item) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.product_name}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.rate.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.amount.toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");

  printRoot.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #111; background: white;">
      <div style="margin-bottom: 20px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          ${logoHtml}
          <h1 style="margin: 0 0 8px 0; font-size: 24px;">Delivery Challan</h1>
        </div>
        <div><strong>DC Number:</strong> ${challan.dc_number}</div>
        <div><strong>Customer:</strong> ${challan.customer_name}</div>
        <div><strong>Date:</strong> ${new Date(challan.created_at).toLocaleString()}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">Product</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">Qty</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">Rate</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="margin-top: 16px; font-weight: bold; text-align: right; font-size: 18px;">
        Total: ${challan.total_amount.toFixed(2)}
      </div>
    </div>
  `;

  console.log("[Print] Content injected. Triggering window.print()...");

  // Use a small timeout to ensure the DOM has rendered the content
  setTimeout(() => {
    try {
      window.print();
      console.log("[Print] window.print() called successfully");
    } catch (e) {
      console.error("[Print] Error calling window.print():", e);
    }
  }, 100);
}
