import { invoke } from "@tauri-apps/api/core";

export interface QuotationItem {
  id: number;
  product_id?: number;
  product_name: String;
  product_sku?: String;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Quotation {
  id: number;
  quote_number: string;
  customer_id: number;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  company_id: number;
  items: QuotationItem[];
  total_amount: number;
  notes?: string;
  status: string;
  created_at: string;
}

export async function createQuotation(input: {
  company_id: number;
  customer_id: number;
  items: Array<{ product_id?: number; description: string; quantity: number; rate: number }>;
  notes?: string;
}) {
  return await invoke<{ id: number; quote_number: string }>("create_quotation", { input });
}

export async function listQuotations(company_id: number) {
  return await invoke<Quotation[]>("list_quotations", { companyId: company_id });
}

export async function deleteQuotation(quote_id: number) {
  return await invoke<void>("delete_quotation", { quoteId: quote_id });
}

export async function updateQuotation(input: {
  quote_id: number;
  company_id: number;
  customer_id: number;
  items: Array<{ product_id?: number; description: string; quantity: number; rate: number }>;
  notes?: string;
}) {
  return await invoke<{ id: number; quote_number: string }>("update_quotation", { input });
}
