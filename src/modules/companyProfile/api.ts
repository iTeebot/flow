import { invoke } from "../../lib/api";

export type CompanyProfile = {
  id: number;
  company_name: string;
  tax_registration_number?: string | null;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  sales_tax_number?: string | null;
  business_type?: string | null;
  currency?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  logo_base64?: string | null;
};

export type CreateCompanyProfileInput = {
  company_name: string;
  tax_registration_number?: string | null;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  sales_tax_number?: string | null;
  business_type?: string | null;
  currency?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  logo_base64?: string | null;
};

export type UpdateCompanyProfileInput = CreateCompanyProfileInput & {
  id: number;
};

export async function createCompanyProfile(input: CreateCompanyProfileInput) {
  return invoke<CompanyProfile>("create_company_profile", { input });
}

export async function listCompanyProfiles() {
  return invoke<CompanyProfile[]>("list_company_profiles");
}

export async function getCompanyProfile(company_id: number) {
  return invoke<CompanyProfile>("get_company_profile", { companyId: company_id });
}

export async function updateCompanyProfile(input: UpdateCompanyProfileInput) {
  return invoke<CompanyProfile>("update_company_profile", { input });
}
