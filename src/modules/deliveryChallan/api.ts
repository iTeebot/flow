import { invoke } from "../../lib/api";

export type CreateDeliveryChallanItemInput = {
  product_id: number;
  quantity: number;
};

export type CreateDeliveryChallanInput = {
  company_id: number;
  customer_id: number;
  items: CreateDeliveryChallanItemInput[];
};

export type DeliveryChallanResult = {
  id: number;
  dc_number: string;
};

export type DeliveryChallanItem = {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type DeliveryChallan = {
  id: number;
  dc_number: string;
  customer_id: number;
  customer_name: string;
  company_id: number;
  items: DeliveryChallanItem[];
  total_amount: number;
  created_at: string;
};

export async function createDeliveryChallan(input: CreateDeliveryChallanInput) {
  return invoke<DeliveryChallanResult>("create_delivery_challan", { input });
}

export async function listDeliveryChallans(company_id: number) {
  return invoke<DeliveryChallan[]>("list_delivery_challans", { companyId: company_id });
}

export async function getDeliveryChallan(dc_id: number) {
  return invoke<DeliveryChallan>("get_delivery_challan", { dcId: dc_id });
}

export async function deleteDeliveryChallan(dc_id: number) {
  return invoke<void>("delete_delivery_challan", { dcId: dc_id });
}
