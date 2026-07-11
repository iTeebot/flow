use crate::db;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct Product {
    pub id: i64,
    pub company_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub sku: String,
    pub stock_qty: f64,
    pub price: f64,
    pub created_at: String,
    pub hs_code: Option<String>,
    pub uom: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductInput {
    pub company_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub sku: String,
    pub stock_qty: f64,
    pub price: f64,
    pub hs_code: Option<String>,
    pub uom: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductInput {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub sku: String,
    pub stock_qty: f64,
    pub price: f64,
    pub hs_code: Option<String>,
    pub uom: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AdjustStockInput {
    pub product_id: i64,
    pub quantity_change: f64,
}

#[tauri::command]
pub fn create_product(app: tauri::AppHandle, input: CreateProductInput) -> Result<Product, String> {
    if input.company_id <= 0 {
        return Err("Company profile is required".to_string());
    }
    if input.name.trim().is_empty() {
        return Err("Product name is required".to_string());
    }
    if input.sku.trim().is_empty() {
        return Err("Product SKU is required".to_string());
    }
    if input.stock_qty < 0.0 {
        return Err("Stock quantity cannot be negative".to_string());
    }
    if input.price < 0.0 {
        return Err("Price cannot be negative".to_string());
    }

    let conn = db::open_connection(&app)?;
    let company_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM company_profiles WHERE id = ?1)",
            [input.company_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate company profile: {e}"))?;
    if !company_exists {
        return Err("Company profile not found".to_string());
    }

    let metadata_str = input
        .metadata
        .as_ref()
        .map(|m| serde_json::to_string(m).unwrap());

    conn.execute(
        "INSERT INTO products (company_id, name, description, sku, stock_qty, price, hs_code, uom, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        (
            input.company_id,
            &input.name,
            &input.description,
            &input.sku,
            input.stock_qty,
            input.price,
            &input.hs_code,
            &input.uom,
            &metadata_str,
        ),
    )
    .map_err(|e| format!("Failed to insert product: {e}"))?;

    let id = conn.last_insert_rowid();
    let created_at: String = conn
        .query_row(
            "SELECT created_at FROM products WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .unwrap_or_default();

    Ok(Product {
        id,
        company_id: input.company_id,
        name: input.name,
        description: input.description,
        sku: input.sku,
        stock_qty: input.stock_qty,
        price: input.price,
        created_at,
        hs_code: input.hs_code,
        uom: input.uom,
        metadata: input.metadata,
    })
}

#[tauri::command]
pub fn list_products(app: tauri::AppHandle, company_id: i64) -> Result<Vec<Product>, String> {
    if company_id <= 0 {
        return Err("Company profile is required".to_string());
    }

    let conn = db::open_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, name, description, sku, stock_qty, price, created_at, hs_code, uom, metadata
             FROM products
             WHERE company_id = ?1 AND deleted_at IS NULL
             ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare product query: {e}"))?;

    let rows = stmt
        .query_map([company_id], |row| {
            let metadata_str: Option<String> = row.get(10)?;
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
            Ok(Product {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                sku: row.get(4)?,
                stock_qty: row.get(5)?,
                price: row.get(6)?,
                created_at: row.get(7)?,
                hs_code: row.get(8)?,
                uom: row.get(9)?,
                metadata,
            })
        })
        .map_err(|e| format!("Failed to fetch products: {e}"))?;

    let mut products = Vec::new();
    for row in rows {
        products.push(row.map_err(|e| format!("Failed to map product row: {e}"))?);
    }
    Ok(products)
}

#[tauri::command]
pub fn update_product(app: tauri::AppHandle, input: UpdateProductInput) -> Result<Product, String> {
    if input.id <= 0 {
        return Err("Invalid product ID".to_string());
    }
    if input.name.trim().is_empty() {
        return Err("Product name is required".to_string());
    }
    if input.sku.trim().is_empty() {
        return Err("Product SKU is required".to_string());
    }
    if input.stock_qty < 0.0 {
        return Err("Stock quantity cannot be negative".to_string());
    }
    if input.price < 0.0 {
        return Err("Price cannot be negative".to_string());
    }

    let conn = db::open_connection(&app)?;

    let metadata_str = input
        .metadata
        .as_ref()
        .map(|m| serde_json::to_string(m).unwrap());

    conn.execute(
        "UPDATE products SET name = ?1, description = ?2, sku = ?3, stock_qty = ?4, price = ?5, hs_code = ?6, uom = ?7, metadata = ?8 WHERE id = ?9",
        (&input.name, &input.description, &input.sku, input.stock_qty, input.price, &input.hs_code, &input.uom, &metadata_str, input.id),
    )
    .map_err(|e| format!("Failed to update product: {e}"))?;

    let (company_id, created_at): (i64, String) = conn
        .query_row(
            "SELECT company_id, created_at FROM products WHERE id = ?1",
            [input.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Product not found".to_string())?;

    Ok(Product {
        id: input.id,
        company_id,
        name: input.name,
        description: input.description,
        sku: input.sku,
        stock_qty: input.stock_qty,
        price: input.price,
        created_at,
        hs_code: input.hs_code,
        uom: input.uom,
        metadata: input.metadata,
    })
}

#[tauri::command]
pub fn delete_product(app: tauri::AppHandle, product_id: i64) -> Result<String, String> {
    if product_id <= 0 {
        return Err("Invalid product ID".to_string());
    }

    let conn = db::open_connection(&app)?;

    conn.execute(
        "UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1",
        [product_id],
    )
    .map_err(|e| format!("Failed to delete product: {e}"))?;

    Ok("Product deleted successfully".to_string())
}

#[tauri::command]
#[allow(clippy::type_complexity)]
pub fn adjust_stock(app: tauri::AppHandle, input: AdjustStockInput) -> Result<Product, String> {
    if input.product_id <= 0 {
        return Err("Invalid product ID".to_string());
    }

    let conn = db::open_connection(&app)?;

    let current_stock: f64 = conn
        .query_row(
            "SELECT stock_qty FROM products WHERE id = ?1",
            [input.product_id],
            |row| row.get(0),
        )
        .map_err(|_| "Product not found".to_string())?;

    let new_stock = current_stock + input.quantity_change;
    if new_stock < 0.0 {
        return Err("Insufficient stock".to_string());
    }

    conn.execute(
        "UPDATE products SET stock_qty = ?1 WHERE id = ?2",
        (new_stock, input.product_id),
    )
    .map_err(|e| format!("Failed to adjust stock: {e}"))?;

    let (company_id, name, description, sku, price, created_at, hs_code, uom): (i64, String, Option<String>, String, f64, String, Option<String>, Option<String>) = conn
        .query_row(
            "SELECT company_id, name, description, sku, price, created_at, hs_code, uom FROM products WHERE id = ?1",
            [input.product_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?)),
        )
        .map_err(|_| "Product not found".to_string())?;

    let metadata_str: Option<String> = conn
        .query_row(
            "SELECT metadata FROM products WHERE id = ?1",
            [input.product_id],
            |row| row.get(0),
        )
        .ok();
    let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

    Ok(Product {
        id: input.product_id,
        company_id,
        name,
        description,
        sku,
        stock_qty: new_stock,
        price,
        created_at,
        hs_code,
        uom,
        metadata,
    })
}
