import { invoke } from "../../lib/api";

export type Customer = {
  id: number;
  company_id: number;
  name: string;
  tax_registration_number?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  province?: string | null;
  registration_type?: string | null;
  metadata?: any;
};

export type CreateCustomerInput = {
  company_id: number;
  name: string;
  tax_registration_number?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  province?: string | null;
  registration_type?: string | null;
  metadata?: any;
};

export type UpdateCustomerInput = {
  id: number;
  name: string;
  tax_registration_number?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  province?: string | null;
  registration_type?: string | null;
  metadata?: any;
};


export async function createCustomer(input: CreateCustomerInput) {
  return invoke<Customer>("create_customer", { input });
}

export async function listCustomers(company_id: number) {
  return invoke<Customer[]>("list_customers", { companyId: company_id });
}



export async function updateCustomer(input: UpdateCustomerInput) {
  return invoke<Customer>("update_customer", { input });
}

export async function deleteCustomer(customer_id: number) {
  return invoke<string>("delete_customer", { customerId: customer_id });
}


