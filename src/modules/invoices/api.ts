import { invoke } from "../../lib/api";

export type InvoiceItem = {
  id: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate?: string | null;
  hs_code?: string | null;
  uom?: string | null;
  value_sales_excluding_st?: number | null;
  fixed_notified_value_or_retail_price?: number | null;
  sales_tax_applicable?: number | null;
  sales_tax_withheld_at_source?: number | null;
  extra_tax?: number | null;
  further_tax?: number | null;
  sro_schedule_no?: string | null;
  fed_payable?: number | null;
  discount?: number | null;
  sale_type?: string | null;
  sro_item_serial_no?: string | null;
  metadata?: any;
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
  invoice_type?: string | null;
  invoice_date?: string | null;
  seller_ntn_cnic?: string | null;
  seller_province?: string | null;
  buyer_ntn_cnic?: string | null;
  buyer_province?: string | null;
  buyer_registration_type?: string | null;
  invoice_ref_no?: string | null;
  items: InvoiceItem[];
  metadata?: any;
};

export type CreateInvoiceFromChallanInput = {
  company_id: number;
  dc_id: number;
  notes?: string | null;
};

export type DetailedInvoiceItemInput = {
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: string | null;
  hs_code?: string | null;
  uom?: string | null;
  value_sales_excluding_st?: number | null;
  fixed_notified_value_or_retail_price?: number | null;
  sales_tax_applicable?: number | null;
  sales_tax_withheld_at_source?: number | null;
  extra_tax?: number | null;
  further_tax?: number | null;
  sro_schedule_no?: string | null;
  fed_payable?: number | null;
  discount?: number | null;
  sale_type?: string | null;
  sro_item_serial_no?: string | null;
  metadata?: any;
};

export type CreateDetailedInvoiceInput = {
  company_id: number;
  customer_id: number;
  invoice_type: string;
  invoice_date: string;
  seller_ntn_cnic?: string | null;
  seller_province?: string | null;
  buyer_ntn_cnic?: string | null;
  buyer_province?: string | null;
  buyer_registration_type?: string | null;
  invoice_ref_no?: string | null;
  notes?: string | null;
  items: DetailedInvoiceItemInput[];
  metadata?: any;
};

export async function listInvoices(company_id: number) {
  return invoke<Invoice[]>("list_invoices", { companyId: company_id });
}



export async function createInvoiceFromChallan(input: CreateInvoiceFromChallanInput) {
  return invoke<{ id: number; invoice_number: string }>("create_invoice_from_challan", { input });
}

export async function createDetailedInvoice(input: CreateDetailedInvoiceInput) {
  return invoke<{ id: number; invoice_number: string }>("create_detailed_invoice", { input });
}

export async function getInvoice(invoice_id: number) {
  return invoke<Invoice>("get_invoice", { invoiceId: invoice_id });
}



export type UpdateInvoiceInput = {
  id: number;
  customer_id: number;
  invoice_type: string;
  invoice_date: string;
  seller_ntn_cnic?: string | null;
  seller_province?: string | null;
  buyer_ntn_cnic?: string | null;
  buyer_province?: string | null;
  buyer_registration_type?: string | null;
  invoice_ref_no?: string | null;
  notes?: string | null;
  items: DetailedInvoiceItemInput[];
  metadata?: any;
};

export async function updateInvoice(input: UpdateInvoiceInput) {
  return invoke<void>("update_invoice", { input });
}

export async function deleteInvoice(invoice_id: number) {
  return invoke<void>("delete_invoice", { invoiceId: invoice_id });
}





