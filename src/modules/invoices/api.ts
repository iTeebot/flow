import { invoke } from "../../lib/api";

export type InvoiceItem = {
  id: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  dc_id?: number | null;
  dc_number?: string | null;
  customer_id: number;
  customer_name: string;
  company_id: number;
  status: string;
  notes?: string | null;
  total_amount: number;
  created_at: string;
  items: InvoiceItem[];
};

export type CreateInvoiceFromChallanInput = {
  company_id: number;
  dc_id: number;
  notes?: string | null;
};

export async function listInvoices(company_id: number) {
  return invoke<Invoice[]>("list_invoices", { companyId: company_id });
}

export async function createInvoiceFromChallan(input: CreateInvoiceFromChallanInput) {
  return invoke<{ id: number; invoice_number: string }>("create_invoice_from_challan", { input });
}
