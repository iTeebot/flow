import { invoke } from "@tauri-apps/api/core";

export type Product = {
  id: number;
  company_id: number;
  name: string;
  sku: string;
  stock_qty: number;
  price: number;
  created_at: string;
};

export type CreateProductInput = {
  company_id: number;
  name: string;
  sku: string;
  stock_qty: number;
  price: number;
};

export type UpdateProductInput = {
  id: number;
  name: string;
  sku: string;
  stock_qty: number;
  price: number;
};

export type AdjustStockInput = {
  product_id: number;
  quantity_change: number;
};

export async function createProduct(input: CreateProductInput) {
  return invoke<Product>("create_product", { input });
}

export async function listProducts(company_id: number) {
  return invoke<Product[]>("list_products", { companyId: company_id });
}

export async function updateProduct(input: UpdateProductInput) {
  return invoke<Product>("update_product", { input });
}

export async function deleteProduct(product_id: number) {
  return invoke<string>("delete_product", { productId: product_id });
}

export async function adjustStock(input: AdjustStockInput) {
  return invoke<Product>("adjust_stock", { input });
}
